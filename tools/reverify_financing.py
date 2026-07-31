#!/usr/bin/env python3
"""Financing re-verification helper (DEC-13 cadence support).

Makes the weekly exact-terms re-verification repeatable. Two modes:

  1. Checklist (default):
         python tools/reverify_financing.py
     Prints, per configured plan, the official source URL and every fact that
     must be confirmed in a REAL browser session (lacks.com blocks
     non-interactive fetches, so curl/scripted checks do not count).

  2. Stamp after a real check:
         python tools/reverify_financing.py --mark-verified --at <ISO-8601> \
             --attest "real Chrome session, all checks matched" \
             [--skip-plan mexico-in-house] [--dry-run]
     Updates financing.verifiedAt and each confirmed plan's verifiedAt in
     incoming/lacks_financing.json, appends an audit entry to
     _meta.verificationLog, and reminds you to rebuild the pipeline.
     Skipped plans keep their old stamp and fail closed independently once
     they age out (the app gates per plan under the top-level gate).

This tool NEVER invents a verification: --mark-verified refuses to run
without an explicit --at timestamp and a non-empty --attest note, refuses
future timestamps (beyond the app's 5-minute skew tolerance), and refuses
timestamps older than the stamp already in the file. The human attestation
is the verification; this script only records it consistently.
"""
import argparse
import io
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "incoming", "lacks_financing.json")
CLOCK_SKEW = timedelta(minutes=5)  # matches FINANCING_CLOCK_SKEW_MS in the app


def load():
    with io.open(SRC, encoding="utf-8") as f:
        return json.load(f)


def parse_iso(value: str) -> datetime:
    ts = datetime.fromisoformat(value)
    if ts.tzinfo is None:
        raise SystemExit(f"error: {value!r} has no timezone offset — verifiedAt "
                         f"must be ISO-8601 with an explicit offset")
    return ts


def plan_facts(plan: dict) -> list:
    """The facts a human must confirm on the official page for one plan."""
    facts = []
    if plan.get("apr") is not None:
        facts.append(f"APR {plan['apr']}%")
    if plan.get("termMonths") is not None:
        facts.append(f"term {plan['termMonths']} months")
    if plan.get("minimumPurchase") is not None:
        facts.append(f"minimum purchase ${plan['minimumPurchase']:,}")
    if plan.get("channel") == "in-store":
        facts.append("in-store-only channel")
    for key, label in (("detail", "conditions text"),
                       ("disclosure", "disclosure text"),
                       ("representativeExample", "published example")):
        block = plan.get(key)
        if isinstance(block, dict) and block.get("en"):
            facts.append(f"{label}: “{block['en'][:90]}…”"
                         if len(block["en"]) > 90 else f"{label}: “{block['en']}”")
    return facts


def cmd_checklist(data: dict) -> int:
    fin = data["financing"]
    print("FINANCING RE-VERIFICATION CHECKLIST")
    print(f"  current verifiedAt: {fin.get('verifiedAt')}")
    exp = parse_iso(fin["verifiedAt"]) + timedelta(days=fin.get("maxAgeDays", 7))
    print(f"  exact terms auto-hide after: {exp.isoformat()}")
    print(f"  rule: every fact below must be confirmed in a REAL browser session")
    print(f"        on the listed official page, on the date you stamp.\n")
    for plan in fin.get("plans", []):
        print(f"[{plan['id']}]  source: {plan.get('sourceUrl')}")
        print(f"  plan verifiedAt: {plan.get('verifiedAt')}")
        for fact in plan_facts(plan):
            print(f"  ☐ {fact}")
        print()
    print("After confirming, stamp with:")
    print("  python tools/reverify_financing.py --mark-verified --at <ISO> "
          "--attest \"<how you verified>\" [--skip-plan <id>]")
    print("Then rebuild: python incoming/build_lacks_workbook.py && "
          "python tools/convert_store_data.py incoming/Lacks_Store_Data.xlsx "
          "--output-dir . --skip-image-normalization")
    return 0


def cmd_mark(data: dict, args) -> int:
    fin = data["financing"]
    when = parse_iso(args.at)
    now = datetime.now(timezone.utc)
    if when - now > CLOCK_SKEW:
        raise SystemExit(f"error: --at {args.at} is in the future — verification "
                         f"is an observation and cannot postdate now")
    current = parse_iso(fin["verifiedAt"])
    if when <= current:
        raise SystemExit(f"error: --at {args.at} is not newer than the existing "
                         f"verifiedAt {fin['verifiedAt']} — nothing to record")
    if not args.attest or not args.attest.strip():
        raise SystemExit("error: --attest must describe the real verification "
                         "session (who/how); it may not be empty")

    plan_ids = [p["id"] for p in fin.get("plans", [])]
    for skip in args.skip_plan:
        if skip not in plan_ids:
            raise SystemExit(f"error: --skip-plan {skip!r} is not a configured "
                             f"plan id (known: {', '.join(plan_ids)})")

    stamped, skipped = [], []
    fin["verifiedAt"] = args.at
    for plan in fin.get("plans", []):
        if plan["id"] in args.skip_plan:
            skipped.append(plan["id"])
            continue
        if plan.get("verifiedAt"):
            plan["verifiedAt"] = args.at
        stamped.append(plan["id"])

    log = data["_meta"].setdefault("verificationLog", [])
    log.append({
        "verifiedAt": args.at,
        "attestation": args.attest.strip(),
        "plansConfirmed": stamped,
        "plansSkipped": skipped,
    })

    if args.dry_run:
        print("DRY RUN — no file written. Would record:")
    else:
        with io.open(SRC, "w", encoding="utf-8", newline="\n") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")
        print(f"wrote {os.path.relpath(SRC, REPO)}")
    print(f"  verifiedAt -> {args.at}")
    print(f"  plans stamped: {', '.join(stamped)}")
    if skipped:
        print(f"  plans SKIPPED (will fail closed on their own): {', '.join(skipped)}")
    print(f"  attestation: {args.attest.strip()}")
    print("NEXT: rebuild the workbook + store-config, run the test suite, "
          "browser-verify, then commit — the stamp is not deployed until then.")
    return 0


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--mark-verified", action="store_true",
                   help="Record a completed real-browser verification")
    p.add_argument("--at", help="ISO-8601 instant (with offset) of the real check")
    p.add_argument("--attest", help="How the verification was performed (required)")
    p.add_argument("--skip-plan", action="append", default=[], metavar="PLAN_ID",
                   help="Plan id that could NOT be re-verified this session "
                        "(keeps its old stamp; may repeat)")
    p.add_argument("--dry-run", action="store_true",
                   help="Show what would be recorded without writing")
    args = p.parse_args(argv)
    data = load()
    if args.mark_verified:
        if not args.at:
            raise SystemExit("error: --mark-verified requires --at <ISO-8601>")
        return cmd_mark(data, args)
    return cmd_checklist(data)


if __name__ == "__main__":
    sys.exit(main())
