#!/usr/bin/env python3
"""Localhost-only Phase 2.2 pricing PREVIEW harness (slice 2.2c) — NON-SHIPPING.

Roadmap item 2.2, Proceeds: "isolated previews and harnesses clearly identified
as non-shipping". This is the staging / live-like verification path for the
disabled pricing implementation: it serves the ordinary repository over HTTP
and intercepts ONLY two GET/HEAD paths, returning IN-MEMORY documents derived
from the governed non-shipping fixture
(tests/fixtures/pricing_populated_fixture.json):

  /data/store-config.json   production configuration with `pricing` and
                            `financing` replaced by a DRILL STATE: the fixture
                            expanded to every mattress the catalog ships (one
                            queen price each, every value a FIXTURE
                            placeholder), its stamps shifted relative to the
                            server's start so the runtime gate — which reads
                            the real clock — judges them exactly as it would
                            judge governed data;
  /data/mattresses.json     the shipped catalog with a `skus` map injected per
                            mattress (queen -> FIXTURE-<ID>), because the gate
                            resolves a price only for the exact catalog SKU.

Drill states (`--state`):
  dark         the fixture as committed — displayEnabled false: every surface
               OFF, nothing renders (this is also the shipped behaviour);
  available    opened in memory — displayEnabled true, every surface true:
               the amount renders with the FIXTURE assumptions and
               disclosures adjacent;
  stale        opened, evidence 30 days old: the gate REFUSES the number the
               resolver still carries (governed "price unavailable" copy only);
  unapproved   opened, activation approvals stripped: eligibility withheld;
  disabled     opened, then `enabled` false — the emergency-off drill: OFF.

Guarantees:
  * binds only to loopback — a non-loopback bind address is refused;
  * the committed store-config, catalog, workbook and every incoming/ source
    are never written; every injected document exists in memory only;
  * the DARK form of every state validates clean under the production
    validators with the shifted clock (validate_financing, validate_pricing);
    the OPENED forms are exactly what the validator and CI's operating-state
    lock refuse in shipped data (displayEnabled true) — the harness proves
    the runtime gate alone, and a served document can never ship;
  * every non-pricing, non-financing production key is served unchanged;
  * exactPromotionsEnabled stays false in every state (Invariant 11: no exact
    financing term renders for a demonstration); financing stamps shift only
    so the plan facts the calculation axis reads are judged current;
  * responses carry Cache-Control: no-store;
  * every rendered price is a FIXTURE placeholder and says so in the
    assumptions and disclosures beside it. NOTHING here is a Lacks price,
    approval, clearance or verification.

Run:  python tools/serve_pricing_preview.py --state available --port 8000
Stop: Ctrl+C.
"""

from __future__ import annotations

import argparse
import copy
import ipaddress
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402

FIXTURE = os.path.join(REPO, "tests", "fixtures", "pricing_populated_fixture.json")
INTERCEPT_CONFIG = "/data/store-config.json"
INTERCEPT_CATALOG = "/data/mattresses.json"
STATES = ("dark", "available", "stale", "unapproved", "disabled")
TIER_ORDER = ("gold", "silver", "bronze")
# Every drill price is queen-only: the harness answers `mattress_size: queen`
# and the gate resolves nothing for any other size — itself a drill.
DRILL_SIZE = "queen"
STALE_DAYS = 30


def _loopback(bind: str) -> bool:
    if bind == "localhost":
        return True
    try:
        return ipaddress.ip_address(bind).is_loopback
    except ValueError:
        return False


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _parse(stamp: str) -> datetime:
    return datetime.fromisoformat(stamp)


def _shift(stamp, delta: timedelta):
    """Shift an offset-bearing ISO stamp by delta, keeping its offset."""
    if stamp is None:
        return None
    return (_parse(stamp) + delta).isoformat(timespec="seconds")


def catalog_ids():
    cat = _load(os.path.join(REPO, "data", "mattresses.json"))
    ids = []
    for tier in TIER_ORDER:
        for m in cat.get(tier, []):
            ids.append(m["id"])
    return ids


def fixture_sku(mattress_id: str) -> str:
    return "FIXTURE-" + mattress_id.upper()


def build_injected(state: str, start: datetime):
    """Return (config, catalog, verdicts) for a drill state at server start.

    `config` is the production store-config with `pricing` and `financing`
    replaced in memory; `catalog` is the production catalog with `skus`
    injected; `verdicts` records what the production validators said about
    the DARK form (must be clean) and the served form (opened states must be
    REFUSED — that is the point).
    """
    if state not in STATES:
        raise ValueError(f"unknown state {state!r}; one of {STATES}")
    if start.tzinfo is None:
        raise ValueError("start instant must be timezone-aware")
    fx = _load(FIXTURE)
    delta = start - _parse(fx["_meta"]["clock"])
    # Keep every stamp one hour behind the server start so clock skew on the
    # serving machine can never push a stamp into the future.
    delta -= timedelta(hours=1)

    prod = _load(os.path.join(REPO, "data", "store-config.json"))
    cat = _load(os.path.join(REPO, "data", "mattresses.json"))

    # ---- financing: fixture block, stamps shifted, exact-term output OFF ----
    fin = copy.deepcopy(fx["financing"])
    fin["verifiedAt"] = _shift(fin["verifiedAt"], delta)
    for plan in fin.get("plans", []):
        if plan.get("verifiedAt"):
            plan["verifiedAt"] = _shift(plan["verifiedAt"], delta)
    fin["exactPromotionsEnabled"] = False

    # ---- pricing: the fixture expanded to every catalog mattress -------------
    pr = copy.deepcopy(fx["pricing"])
    for rec in (pr["freshness"], pr["sourcePolicy"]):
        rec["approvedAt"] = _shift(rec["approvedAt"], delta)
    for appr in pr["presentation"]["approvals"].values():
        appr["at"] = _shift(appr["at"], delta)
    for f in pr.get("formulas", []):
        f["approvedAt"] = _shift(f["approvedAt"], delta)
        f["verifiedAt"] = _shift(f["verifiedAt"], delta)
    template = pr["products"][0]
    evidence_delta = delta - (timedelta(days=STALE_DAYS) if state == "stale" else timedelta(0))
    products = []
    for i, mid in enumerate(catalog_ids()):
        e = copy.deepcopy(template)
        e["productId"] = mid
        e["productKind"] = "mattress"
        e["sku"] = fixture_sku(mid)
        e["size"] = DRILL_SIZE
        e["price"]["amountMinor"] = 99900 + 10000 * i
        e["evidence"]["verifiedAt"] = _shift(template["evidence"]["verifiedAt"], evidence_delta)
        e["clearance"]["attestedAt"] = _shift(template["clearance"]["attestedAt"], delta)
        scope = e["clearance"]["scope"]
        scope["productId"] = mid
        scope["sku"] = e["sku"]
        scope["size"] = DRILL_SIZE
        scope["amountMinor"] = e["price"]["amountMinor"]
        scope["evidenceVerifiedAt"] = e["evidence"]["verifiedAt"]
        products.append(e)
    pr["products"] = products

    # The DARK form is what the validators see: displayEnabled false, every
    # surface false — exactly the committed fixture's posture.
    dark = copy.deepcopy(pr)
    dark["displayEnabled"] = False
    dark["surfaces"] = {k: False for k in dark["surfaces"]}
    if state == "disabled":
        dark["enabled"] = False
        dark["formulas"] = []

    served = copy.deepcopy(dark)
    if state != "dark":
        served["displayEnabled"] = True
        served["surfaces"] = {k: True for k in served["surfaces"]}
    if state == "unapproved":
        served["presentation"]["approvals"]["legal"] = {"status": "unapproved", "by": "", "at": None}
        served["presentation"]["status"] = "unapproved"

    config = copy.deepcopy(prod)
    config["financing"] = fin
    config["pricing"] = served

    # ---- catalog: skus injected in memory ----------------------------------
    catalog = copy.deepcopy(cat)
    for tier in TIER_ORDER:
        for m in catalog.get(tier, []):
            m["skus"] = {DRILL_SIZE: fixture_sku(m["id"])}

    # ---- verdicts -----------------------------------------------------------
    hosts = _load(os.path.join(REPO, "tools", "source_hosts.json"))
    kw = dict(allowed_source_hosts=hosts["priceSourceHosts"],
              financing_source_hosts=hosts["financingSourceHosts"],
              mattress_ids=set(catalog_ids()), accessory_ids=set())
    dark_cfg = copy.deepcopy(config)
    dark_cfg["pricing"] = dark
    fin_rep = validation.validate_financing(dark_cfg, allowed_source_hosts=hosts["financingSourceHosts"])
    dark_rep = validation.validate_pricing(dark_cfg, now=start, **kw)
    served_rep = validation.validate_pricing(config, now=start, **kw)
    verdicts = {
        "financing_ok": fin_rep.ok,
        "financing_errors": list(fin_rep.errors),
        "dark_ok": dark_rep.ok,
        "dark_errors": list(dark_rep.errors),
        "dark_warnings": list(dark_rep.warnings),
        # The stale drill is refused at BUILD time too — the validator names
        # the aged evidence — which is the other half of the same fail-closed
        # rule the runtime gate executes. Every other state's dark form is
        # clean; the stale state's dark form must be refused for exactly this.
        "dark_stale_named": (not dark_rep.ok) and all("older than maxAgeDays" in e for e in dark_rep.errors),
        "served_refused": not served_rep.ok,
        "served_errors": list(served_rep.errors),
    }
    return config, catalog, verdicts


def dark_form_acceptable(state: str, verdicts: dict) -> bool:
    """What the harness requires of a state's dark form before serving it."""
    if state == "stale":
        return verdicts["financing_ok"] and verdicts["dark_stale_named"]
    return verdicts["financing_ok"] and verdicts["dark_ok"]


def make_handler(config_bytes: bytes, catalog_bytes: bytes):
    class PreviewHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=REPO, **kwargs)

        def _target(self):
            path = self.path.split("?", 1)[0].split("#", 1)[0]
            if path == INTERCEPT_CONFIG:
                return config_bytes
            if path == INTERCEPT_CATALOG:
                return catalog_bytes
            return None

        def _send_json_headers(self, body):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        def do_GET(self):
            body = self._target()
            if body is not None:
                self._send_json_headers(body)
                self.wfile.write(body)
                return
            super().do_GET()

        def do_HEAD(self):
            body = self._target()
            if body is not None:
                self._send_json_headers(body)
                return
            super().do_HEAD()

        def log_message(self, *_args):
            pass

    return PreviewHandler


def encode(doc) -> bytes:
    return json.dumps(doc, indent=2, ensure_ascii=False).encode("utf-8")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--state", choices=STATES, default="available")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default="127.0.0.1",
                        help="loopback address only (default 127.0.0.1)")
    args = parser.parse_args(argv)

    if not _loopback(args.bind):
        print(f"REFUSED: {args.bind!r} is not a loopback address. This harness "
              f"exists only for local, non-shipping verification and never binds publicly.")
        return 2

    start = datetime.now(timezone.utc).astimezone()
    config, catalog, verdicts = build_injected(args.state, start)
    if not dark_form_acceptable(args.state, verdicts):
        print("REFUSED: the drill state's dark form does not validate as its state requires:")
        for e in verdicts["financing_errors"] + verdicts["dark_errors"]:
            print("  -", e)
        return 3
    if args.state != "dark" and not verdicts["served_refused"]:
        print("REFUSED: the opened form validated clean — the harness would be serving "
              "something the operating-state lock should refuse; stopping.")
        return 3

    server = ThreadingHTTPServer((args.bind, args.port),
                                 make_handler(encode(config), encode(catalog)))
    url = f"http://{args.bind}:{args.port}/"
    print("=" * 72)
    print(f"PHASE 2.2 PRICING PREVIEW HARNESS — NON-SHIPPING — state: {args.state}")
    print("Every price shown is a FIXTURE placeholder. NOT a Lacks price, approval,")
    print("clearance or verification. Committed files are never modified.")
    print("=" * 72)
    print(f"  URL:            {url}")
    print(f"  Answer the quiz with mattress size = {DRILL_SIZE}; other sizes resolve nothing.")
    print("  exactPromotionsEnabled stays false; gasUrl stays blank (preview email only).")
    print("  Stop with Ctrl+C.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
