#!/usr/bin/env python3
"""Controlled real-delivery probe for a deployed Code.gs web app - OWNER-RUN ONLY.

Sends ONE real email, to the owner's own address, through a deployed Apps
Script `/exec`, then proves the duplicate and refusal paths against the same
deployment:

  1. POST a synthetic payload shaped exactly like the kiosk's sendResults()
     payload (the same closed key set; every visible value marked as a
     controlled delivery test; a complete v:2 test quote)    -> {"success": true}
  2. POST the SAME body again (same sendId)                  -> {"success": true, "duplicate": true}
  3. POST it with a malformed sendId                         -> {"success": false, "error": "invalid_request"}

and prints a report. Steps 2 and 3 never send: Code.gs answers a repeated
sendId from its ledger and refuses a malformed one before anything else. So a
full run sends exactly one email (two recipients if RESULT_EMAIL_BCC is set),
appends one Leads row and one 'complete' row in the hidden "DreamFinder
Sends" ledger.

Guards (each refuses with exit 2 before any network use):
  * --gas-url must be https://script.google.com/macros/s/<id>/exec;
  * --to must be repeated verbatim as --confirm-recipient (the owner types
    their own address twice; never a customer's);
  * refused under CI (the CI environment variable) unless --dry-run: this
    probe never runs in automation.
--dry-run prints the three request bodies and touches no network.

Sending needs Blake's explicit authorization in the task at hand
(docs/gas-activation-runbook.md, "Controlled delivery test").

Run:  python tools/gas_delivery_probe.py --gas-url https://script.google.com/macros/s/<id>/exec \\
          --to you@example.com --confirm-recipient you@example.com [--lang es] [--dry-run]
Exit: 0 every step answered as expected; 1 a step did not; 2 refused.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import re
import secrets
import sys
import urllib.error
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAS_URL_RE = re.compile(r"^https://script\.google\.com/macros/s/[A-Za-z0-9_-]{10,}/exec$")
EMAIL_RE = re.compile(r"^[^\s@<>\"']+@[^\s@<>\"']+\.[^\s@<>\"']+$")
# Code.gs SEND_ID_PATTERN.
SEND_ID_RE = re.compile(r"^[A-Za-z0-9_-]{22,40}$")
MALFORMED_SEND_ID = "not a valid send id!"
TEST_MARK = "CONTROLLED DELIVERY TEST"

EXPECT_SENT = {"success": True}
EXPECT_DUPLICATE = {"success": True, "duplicate": True}
EXPECT_INVALID = {"success": False, "error": "invalid_request"}


def new_send_id() -> str:
    """24 chars of [A-Za-z0-9_-] from 18 random bytes, like emailNewSendId()."""
    return base64.urlsafe_b64encode(secrets.token_bytes(18)).decode("ascii")


def validate(args) -> list:
    """The refusals for parsed arguments ([] when the probe may proceed)."""
    errors = []
    if not GAS_URL_RE.match(args.gas_url or ""):
        errors.append("--gas-url must be https://script.google.com/macros/s/<deployment id>/exec")
    to = (args.to or "").strip()
    confirm = (args.confirm_recipient or "").strip()
    if not EMAIL_RE.match(to):
        errors.append("--to must be an email address (the owner's own)")
    if to != confirm:
        errors.append("--confirm-recipient must repeat --to exactly (type your own address twice)")
    if os.environ.get("CI") and not args.dry_run:
        errors.append("refused under CI: this probe sends a real email and never runs in automation")
    return errors


def _store_config() -> dict:
    with open(os.path.join(REPO, "data", "store-config.json"), encoding="utf-8") as f:
        return json.load(f)


def test_quote(lang: str) -> dict:
    """A complete v:2 purchase summary (the only version Code.gs accepts), every label marked as a test. The
    figures are fixture text, not an offer; Code.gs renders them verbatim."""
    es = lang == "es"
    return {
        "v": 2, "complete": True, "currency": "USD", "size": "queen", "sizeLabel": "Queen",
        "lines": [
            {"name": ("PRUEBA - colchón de prueba (no es una oferta)" if es
                      else "TEST - fixture mattress (not an offer)"),
             "detail": "Queen", "quantity": 1, "priced": True, "listText": "$1.00", "discounts": [], "netText": "$1.00"},
        ],
        "listSubtotalText": "$1.00", "discountText": "$0.00", "merchandiseText": "$1.00",
        "exclusionsText": ("Prueba controlada de entrega: sin precio real" if es
                           else "Controlled delivery test: no real price"),
        "offerTerms": [],
        "payment": {"kind": "full", "totalText": "$1.00"},
        "provenance": TEST_MARK,
        "computedAt": "1970-01-01T00:00:00.000Z", "fingerprint": "delivery-probe",
    }


def build_payload(to: str, lang: str, send_id: str, config: dict | None = None) -> dict:
    """The kiosk payload's exact key set (index.html sendResults()), synthetic
    and marked as a test throughout. Store identity comes from the committed
    store-config, as the kiosk's does."""
    cfg = config if config is not None else _store_config()
    es = lang == "es"
    logo = cfg.get("logo") or {}
    colors = cfg.get("colors") or {}
    return {
        "storeName": cfg.get("storeName") or "",
        "sendId": send_id,
        "quote": test_quote(lang),
        "name": "DreamFinder Delivery Test",
        "email": to,
        "phone": "",
        "sleepProfile": TEST_MARK + (" - no es un cliente" if es else " - not a customer"),
        "mattressSize": "Queen",
        "discount": 0, "dreamCode": "", "passExpiration": "", "passScope": "", "passTerms": "",
        "rsa": "delivery-probe",
        "lang": lang,
        "allMatches": [{"name": "TEST - fixture mattress", "brand": "TEST", "matchPct": "0",
                        "meetsMatchThreshold": False, "line": TEST_MARK, "imageUrl": ""}],
        "accessories": [],
        "lead": {"kind": "none", "name": "", "brand": "", "line": "", "imageUrl": ""},
        "matchesSource": "recommended",
        "priorities": [],
        "consultation": {"context": TEST_MARK, "who": "", "profile": ""},
        "emailPromotions": [], "promoSpanishDraft": "", "promoScenario": "", "promoDisclosure": "",
        "branding": {"logoMain": logo.get("main") or "", "logoSub": logo.get("sub") or "",
                     "primary": colors.get("storePrimary") or "", "accent": colors.get("accent") or ""},
        "financing": None,
    }


def plan(to: str, lang: str, send_id: str | None = None, config: dict | None = None) -> list:
    """The three requests: (label, body, expected answer)."""
    sid = send_id or new_send_id()
    body = build_payload(to, lang, sid, config)
    bad = dict(body, sendId=MALFORMED_SEND_ID)
    return [
        ("send once", body, EXPECT_SENT),
        ("same sendId again -> duplicate, no second email", body, EXPECT_DUPLICATE),
        ("malformed sendId -> invalid_request, nothing sent", bad, EXPECT_INVALID),
    ]


def http_post(url: str, body: dict, timeout: float):
    """(status, parsed JSON or None, short note). The kiosk's request: a text
    body, no custom headers (no preflight). Apps Script answers a POST with a
    redirect that urllib follows as a GET, like fetch."""
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST",
                                 headers={"Content-Type": "text/plain;charset=UTF-8"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            raw = res.read().decode("utf-8", "replace")
            status = res.status
    except urllib.error.HTTPError as e:
        return e.code, None, f"HTTP {e.code}"
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        return None, None, f"transport: {type(e).__name__}"
    try:
        return status, json.loads(raw), "ok"
    except ValueError:
        return status, None, "body is not JSON (deployment access not 'Anyone'?)"


def run(args, post=http_post, out=print) -> int:
    steps = plan(args.to.strip(), args.lang)
    if args.dry_run:
        out("DRY RUN - nothing is sent. The three request bodies:")
        for label, body, want in steps:
            out(f"\n# {label}  (expect {json.dumps(want)})")
            out(json.dumps(body, indent=2, ensure_ascii=False))
        return 0
    out(f"Controlled delivery test -> {args.gas_url}")
    out(f"Recipient: {args.to.strip()}   lang: {args.lang}   sendId: {steps[0][1]['sendId']}")
    ok_all = True
    for i, (label, body, want) in enumerate(steps, 1):
        status, doc, note = post(args.gas_url, body, args.timeout)
        ok = doc == want
        ok_all = ok_all and ok
        out(f"  [{'PASS' if ok else 'FAIL'}] {i}. {label}: HTTP {status} {json.dumps(doc) if doc is not None else note}")
    out("\nNow check by hand (docs/gas-activation-runbook.md, Controlled delivery test):")
    out("  - exactly ONE email arrived (plus the BCC copy if RESULT_EMAIL_BCC is set);")
    out("  - one Leads row whose Send ID is the sendId above; the hidden 'DreamFinder Sends'")
    out("    tab has that id ('id:' prefix) in state 'complete';")
    out("  - the Apps Script execution log is shape-only (no address, no figure).")
    out("RESULT: " + ("every step answered as expected" if ok_all else "a step did NOT answer as expected"))
    return 0 if ok_all else 1


def main(argv=None, post=http_post, out=print) -> int:
    p = argparse.ArgumentParser(description="Controlled real-delivery probe for a deployed Code.gs (owner-run only).")
    p.add_argument("--gas-url", required=True)
    p.add_argument("--to", required=True, help="the owner's own address (never a customer's)")
    p.add_argument("--confirm-recipient", required=True, help="the same address again, verbatim")
    p.add_argument("--lang", choices=("en", "es"), default="en")
    p.add_argument("--timeout", type=float, default=60.0)
    p.add_argument("--dry-run", action="store_true", help="print the request bodies; no network")
    args = p.parse_args(argv)
    errors = validate(args)
    if errors:
        for e in errors:
            out("REFUSED: " + e)
        return 2
    return run(args, post=post, out=out)


if __name__ == "__main__":
    sys.exit(main())
