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
  stale        opened, evidence 30 days old: the number the resolver still
               carries is INERT — every surface OFF, no copy, no number (the
               roadmap's state table: nothing a customer can see);
  unapproved   opened, activation approvals stripped: eligibility withheld —
               every surface OFF, no copy, no number;
  unavailable  opened, fresh and eligible, but every price carries currency
               XXX — a code Intl.NumberFormat formats and the governed
               validator refuses: the gate's runtime money admission refuses
               it, so every surface shows the governed "price unavailable"
               copy and no number (the one state that shows that copy);
  disabled     opened, then `enabled` false — the emergency-off drill: OFF.

Guarantees:
  * binds only to loopback — a non-loopback bind address is refused;
  * the committed store-config, catalog, workbook and every incoming/ source
    are never written; every injected document exists in memory only;
  * the DARK form of every state validates clean under the production
    validators with the shifted clock (validate_financing, validate_pricing;
    a website drill carrying per-size accessory variants is judged once per
    customer size - see size_projections - with duplicate detection intact)
    — except the stale drill, refused for exactly its staleness, and the
    unavailable drill, refused for exactly its currency (the build-time
    halves of the two rules the runtime gate executes);
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
    approval, clearance or verification. (Exception: `--state demo` serves
    no per-price disclosure and no notice - Blake, 2026-10-12; its
    illustrative prices carry the illustrative mark and a price-source line.)

Run:  python tools/serve_pricing_preview.py --state available --port 8000
Stop: Ctrl+C.

Device rehearsal (`--device <private IPv4 of this machine>`, Codex correction
2026-09-09): the public preview keeps pricing disabled and the default bind
is loopback, so a mounted iPad could never exercise active pricing or its
failure states. `--device` serves the SAME in-memory drill state on one
RFC 1918 address of this machine (10/8, 172.16/12, 192.168/16 — an IPv4
literal that this host actually owns), so mounted Safari on the same private
network can walk every state: available, stale, unapproved, unavailable,
disabled (and dark). It is a separate mode, opt-in per run:
  * the default loopback mode is byte-for-byte unchanged (no interception of
    the page or the allowlist; `--bind` still refuses every non-loopback
    address); `--device` cannot be combined with `--bind`;
  * refused: 0.0.0.0 and every unspecified/public/link-local/multicast/
    reserved/loopback address, every IPv6 address, every hostname, and a
    private address this machine does not own (the bind itself fails) —
    nothing here can ever listen on the open internet;
  * the domain lock is satisfied IN MEMORY only: /data/allowed-hosts.js is
    served as `window.__DF_ALLOWED_HOSTS = ["<that address>"]` — the committed
    allowlist is never written, and the served page itself is served with a
    fixed NON-SHIPPING banner naming the drill state (the only edit to the
    page, appended before </body> in memory; `--state demo` carries the
    Operator tab instead);
  * fixture data only: every price is the FIXTURE placeholder and says so in
    the assumptions and disclosures beside it; the banner repeats it
    (`--state demo`: the illustrative mark and price-source line instead);
  * nothing can send: the served store-config keeps the committed blank
    gasUrl (the mode refuses to start otherwise), so the email screen stays
    in preview and no lead or email leaves the device; exactPromotionsEnabled
    stays false; no committed file is written;
  * the server exposes ONLY the app: /, /index.html, /manifest.json,
    /robots.txt (in memory: disallow all), /data/ and /images/. Everything
    else is 404 and no directory is ever listed — the default loopback
    handler serves the whole repository (docs/, incoming/, tools/, tests/,
    the .git pointer, directory listings), which is fine on loopback and a
    disclosure on a shared network;
  * responses carry Cache-Control: no-store and X-Robots-Tag: noindex.
What a rehearsal on a device cannot do, measured (device audit 2026-09-09):
  * the session-policy override (__dfSetSessionPolicy) accepts loopback hosts
    only, so the idle warning and wipe cannot be shortened on the device —
    that rehearsal costs the full policy window; this is deliberate;
  * isDevelopmentMode() treats 192.168.* as development (the empty sub-brand
    placeholder renders) and 10.x / 172.16-31.x as production; owner-gated
    app behaviour, not changed here — expect the difference;
  * rehearse in a Safari TAB: manifest.json's start_url names the Pages path,
    so an Add-to-Home-Screen launch 404s on this server;
  * localStorage is per origin: the RSA roster starts empty on the device.
While it runs, the page is readable by every device on that network with no
authentication (the product has none): run it on a phone hotspot or an
isolated access point, never a guest network, and stop it when done.
Operator steps: same private network as the iPad; `python
tools/serve_pricing_preview.py --device 192.168.1.20 --state stale`; open the
printed URL in a Safari tab; answer the quiz with mattress size queen; walk
Results, the drawer, the Sleep System, the Consultation Summary and the Sleep
Plan; repeat per state (available, stale, unapproved, unavailable, disabled,
dark); Ctrl+C.
"""

from __future__ import annotations

import argparse
import copy
import ipaddress
import json
import os
import re
import secrets
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone

from map_app_to_website import SIZES as MATTRESS_SIZES, SIZE_INDEPENDENT_KEY
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402
import financing_headline  # noqa: E402

FIXTURE = os.path.join(REPO, "tests", "fixtures", "pricing_populated_fixture.json")
INTERCEPT_CONFIG = "/data/store-config.json"
INTERCEPT_CATALOG = "/data/mattresses.json"
# Device mode only: the domain-lock allowlist and the page itself, in memory.
INTERCEPT_ALLOWED_HOSTS = "/data/allowed-hosts.js"
INTERCEPT_PAGE = ("/", "/index.html")
# Device mode serves ONLY the app. Anything outside these paths is 404 and no
# directory is listed (the default handler's autoindex is disabled).
DEVICE_PATHS = ("/", "/index.html", "/manifest.json", "/robots.txt")
DEVICE_PREFIXES = ("/data/", "/images/")
ROBOTS_TXT = b"User-agent: *\nDisallow: /\n"


# The ONE canonical grammar a device-mode request path must satisfy after
# percent-decoding: absolute, non-empty segments, every segment starting with
# a letter or digit and made of letters, digits, spaces, dots, hyphens and
# underscores — the character set the app's own data and image files use.
# By construction this excludes dot segments ("." / ".."), dotfiles, empty
# segments ("//", a trailing slash), backslashes, NUL and control characters,
# any percent sign left after ONE decoding (double encoding, malformed
# escapes), and every character outside that set. Codex re-review of the
# integrated candidate (2026-09-10): the allowlist used to judge the RAW
# request path while the stdlib handler decoded and normalised it before
# serving, so /data/%2e%2e/CLAUDE.md was served. Authorisation and serving
# now share this single decoded path.
DEVICE_SEGMENT = r"[A-Za-z0-9][A-Za-z0-9 ._-]*"
DEVICE_CANONICAL_RE = re.compile(r"^/(?:" + DEVICE_SEGMENT + r"/)*" + DEVICE_SEGMENT + r"$")


def device_canonical_path(raw_path):
    """The decoded, canonical request path a device rehearsal may serve, or
    None (fail closed). Query string and fragment are dropped first; the path
    is percent-decoded exactly once; the result must match the canonical
    grammar above; then it must be on the app-only allowlist."""
    if not isinstance(raw_path, str):
        return None
    path = raw_path.split("?", 1)[0].split("#", 1)[0]
    if path == "/":
        return "/"
    decoded = urllib.parse.unquote(path, errors="replace")
    if not DEVICE_CANONICAL_RE.fullmatch(decoded):
        return None
    return decoded if device_path_allowed(decoded) else None


def device_path_allowed(path: str) -> bool:
    """The app-only allowlist, judged on a CANONICAL path (see
    device_canonical_path, which is the only caller that matters): the four
    named paths, or a file path below /data/ or /images/."""
    if path in DEVICE_PATHS:
        return True
    return any(path.startswith(p) and len(path) > len(p) for p in DEVICE_PREFIXES)
INTERCEPT_ACCESSORIES = "/data/accessories.json"
STATES = ("dark", "available", "stale", "unapproved", "unavailable",
          "disabled", "website", "payments", "review", "demo")
# Payment Choice slice 2 (owner authorization 2026-10-03). Both states switch
# the governed payment calculation ON in memory - exactPromotionsEnabled true
# and paymentCalculationEnabled true on the one plan whose method is
# published - and are the ONLY states in which a payment figure can render:
#   payments  the fixture drill (shifted stamps, FIXTURE prices) - the
#             automated walk of the calculation path;
#   review    the launch-review build: ACTUAL website prices (as `website`)
#             and the ACTUAL canonical financing source
#             (incoming/lacks_financing.json, factor included), each on its
#             OWN verification stamps. Nothing is shifted, so stale evidence
#             shows nothing / "To confirm", exactly as production would.
PAYMENT_STATES = ("payments", "review")
# The payment demo (owner demo-first direction 2026-10-05): its own state,
# pinned by tests/payment_demo_check.py rather than the drill walk.
DEMO_STATES = ("demo",)
REVIEW_FORMULA_APPROVAL = ("REVIEW BUILD - owner-authorized implementation 2026-10-03; "
                           "business, legal and native review pending")
TIER_ORDER = ("gold", "silver", "bronze")
# Every drill price is queen-only: the harness answers `mattress_size: queen`
# and the gate resolves nothing for any other size — itself a drill.
DRILL_SIZE = "queen"
STALE_DAYS = 30
# The `unavailable` drill's currency: an ISO 4217 code with no currency behind
# it, which Intl.NumberFormat formats ("XXX 999.00") and the governed validator
# refuses — proof that the runtime money admission, not the formatter, is the
# currency check.
UNAVAILABLE_CURRENCY = "XXX"


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


RFC1918 = (ipaddress.ip_network("10.0.0.0/8"), ipaddress.ip_network("172.16.0.0/12"), ipaddress.ip_network("192.168.0.0/16"))


def device_address_verdict(addr) -> str:
    """'' when `addr` may carry a device rehearsal, else the refusal reason.

    Accepted: an IPv4 literal in the RFC 1918 private ranges only. Everything
    else is refused by name so the operator sees why: hostnames, IPv6,
    0.0.0.0, loopback, link-local, multicast, reserved, and every public
    address. Ownership (this machine actually has the address) is proved by
    the bind itself."""
    if not isinstance(addr, str) or not addr.strip():
        return "no address given"
    try:
        ip = ipaddress.ip_address(addr.strip())
    except ValueError:
        return f"{addr!r} is not an IP address literal (hostnames are refused: the domain lock and the bind must name one exact address)"
    if ip.version != 4:
        return f"{addr!r} is IPv6; the device rehearsal accepts an RFC 1918 IPv4 address only"
    if ip.is_unspecified:
        return f"{addr!r} would listen on every interface; refused"
    if ip.is_loopback:
        return f"{addr!r} is loopback; use the default mode (no --device) for that"
    if ip.is_link_local:
        return f"{addr!r} is link-local; refused"
    if ip.is_multicast or ip.is_reserved:
        return f"{addr!r} is not a unicast host address; refused"
    # RFC 1918 by explicit membership - not ipaddress.is_private, which also
    # admits the documentation ranges (192.0.2/24, 198.51.100/24, 203.0.113/24).
    if not any(ip in net for net in RFC1918):
        return f"{addr!r} is not an RFC 1918 private address; the device rehearsal never binds publicly"
    return ""


def allowed_hosts_js(addr: str) -> bytes:
    """The in-memory domain-lock allowlist for a device rehearsal: exactly the
    bind address (the lock adds localhost / 127.0.0.1 itself)."""
    return ("window.__DF_ALLOWED_HOSTS = " + json.dumps([addr]) + ";\n").encode("utf-8")


BANNER_ID = "dfRehearsalBanner"


def device_bundle(addr: str, state: str, operator: dict = None) -> dict:
    """The in-memory documents a device rehearsal serves, or ValueError: the
    constructor-level gate (a test cannot build a device server for an
    address the verdict refuses), mirroring the delivery harness."""
    why = device_address_verdict(addr)
    if why:
        raise ValueError(why)
    if state not in STATES:
        raise ValueError(f"unknown state {state!r}")
    a = addr.strip()
    return {"address": a, "allowed_hosts": allowed_hosts_js(a), "page": rehearsal_page(state, a, operator)}


OPERATOR_ID = "dfDemoOperator"
# The demo scenarios the operator panel can load. Each is a set of quiz
# answers plus the purchase the salesperson would build: the best match as
# finalist, the second match saved, and a Sleep System. They call only the
# app's own public functions; nothing here is part of index.html.
DEMO_SCENARIOS = [
    {"id": "couple-queen", "label": "Couple \u00b7 Queen \u00b7 back pain, sleeps hot",
     "answers": {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
                 "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
                 "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"},
     "items": [["base-bt3000", 1], ["pillow-gel-memory", 2], ["protector-vertex", 1]]},
    {"id": "solo-king", "label": "Solo \u00b7 King \u00b7 firm support",
     "answers": {"sleep_position": "back", "sleep_issues": ["back_pain"], "health_conditions": [],
                 "temperature": "neutral", "firmness": 8, "partner_sleep": "solo",
                 "body_type": "average", "mattress_size": "king"},
     "items": [["foundation-princess", 1], ["pillow-gel-memory", 1], ["protector-iprotect", 1]]},
]


def _esc(x):
    return str(x).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def operator_panel(state: str, addr: str, operator: dict) -> bytes:
    """The demo state's OPERATOR area: a small 'Operator' tab (top-left)
    that opens the technical detail and the scenario loader. No drill banner
    and no demo notice: everyone in the room knows it is a demo (Blake,
    2026-10-12); the illustrative mark and provenance line remain."""
    op = operator or {}
    rows = [
        "Non-shipping payment demo &middot; state <b>" + _esc(state) + "</b> &middot; " + _esc(addr),
        _esc(op.get("historical", 0)) + " historical lacks.com prices (observed 2026-10-03) &middot; "
        + _esc(op.get("illustrative", 0)) + " illustrative prices (&#9671;)",
        _esc(op.get("plans", 0)) + " example plans (provider &ldquo;Demo&rdquo;, governed methods); "
        "lease-to-own and in-house read &ldquo;To confirm&rdquo;",
        "Nothing is sent or saved: gasUrl blank, no lead, no email. Production files untouched.",
    ]
    scen = json.dumps(DEMO_SCENARIOS)
    buttons = "".join(
        '<button type="button" data-scn="' + _esc(x["id"]) + '" style="display:block;width:100%;min-height:44px;'
        'margin:6px 0;padding:8px 12px;border:1px solid #c9bfae;border-radius:10px;background:#fff;color:#2b2520;'
        'font:600 14px/1.3 system-ui,sans-serif;text-align:left;cursor:pointer;touch-action:manipulation;">'
        + _esc(x["label"]) + '</button>' for x in DEMO_SCENARIOS)
    script = (
        '<script>(function(){var S=' + scen + ';'
        'function w(ms){return new Promise(function(r){setTimeout(r,ms);});}'
        'async function load(id){var x=S.filter(function(s){return s.id===id;})[0];if(!x)return;'
        'var d=document.getElementById("' + OPERATOR_ID + '");if(d)d.open=false;'
        'if(typeof resetSessionState==="function")resetSessionState();await w(150);'
        'for(var k in x.answers)answers[k]=x.answers[k];'
        'showProfileScreen();window.showResults();await w(350);'
        'var ids=Object.keys(window._drawerData||{});if(!ids.length)return;'
        'window.chooseFinalist(ids[0]);if(ids[1])window._toggleSavePick(ids[1]);'
        'for(var i=0;i<x.items.length;i++){setSleepSystemItem(x.items[i][0],true);'
        'if(x.items[i][1]>1)setSleepSystemItemQuantity(x.items[i][0],x.items[i][1]);}'
        'window.showSavedPicks();}'
        'var busy=false;function go(e){var b=e.target.closest&&e.target.closest("[data-scn]");'
        'if(!b)return;if(e.type==="touchend")e.preventDefault();if(busy)return;busy=true;'
        'load(b.getAttribute("data-scn")).then(function(){busy=false;},function(){busy=false;});}'
        'document.addEventListener("click",go);document.addEventListener("touchend",go,{passive:false});'
        '})();</script>\n'
    )
    # Placement: the TOP-LEFT corner of the band every screen already reserves
    # for the app's own fixed language/Restart bar (--session-utility-clearance),
    # centred on the bar's row. Measured clear of app controls at rest on every
    # screen, both orientations and both languages; a bottom-left tab covered
    # the last controls of the page. It stacks just above the bar (150) and
    # below every app dialog (change sheet 2000, safety dialog 10002), so a
    # dialog covers it as it covers the bar. The open panel scrolls inside
    # itself rather than running off a portrait screen.
    html = (
        '<details id="' + OPERATOR_ID + '" data-demo-operator style="position:fixed;left:8px;'
        'top:calc(14px + env(safe-area-inset-top, 0px));'
        'z-index:151;max-width:min(92vw,380px);font:13px/1.4 system-ui,sans-serif;color:#2b2520;">'
        '<summary style="list-style:none;cursor:pointer;display:inline-flex;align-items:center;min-height:44px;'
        'min-width:44px;padding:0 14px;border-radius:22px;background:rgba(43,37,32,.82);color:#fff;'
        'font-weight:600;letter-spacing:.02em;touch-action:manipulation;">Operator</summary>'
        '<div style="margin-top:8px;padding:12px 14px;border-radius:14px;background:#fbf8f2;'
        'border:1px solid #d8cfbf;box-shadow:0 10px 30px rgba(0,0,0,.18);'
        'max-height:calc(100dvh - 90px);overflow:auto;-webkit-overflow-scrolling:touch;">'
        + "".join('<p style="margin:0 0 6px">' + r + '</p>' for r in rows)
        + '<p style="margin:10px 0 2px;font-weight:700">Load a demo scenario</p>' + buttons
        + '<p style="margin:8px 0 0;color:#6b6157">Loading a scenario starts a new customer first.</p>'
        '</div></details>\n' + script
    )
    return html.encode("utf-8")


def rehearsal_page(state: str, addr: str, operator: dict = None) -> bytes:
    """index.html from disk with the NON-SHIPPING banner appended before the
    page's own </body> (the last one — the domain lock's inline error page
    carries another). Device mode only; loopback mode serves the file.
    The demo state carries the operator area instead of the banner (the app
    marks illustrative prices and names its price and payment sources)."""
    with open(os.path.join(REPO, "index.html"), "rb") as f:
        raw = f.read()
    if state == "demo":
        # The harness demo context: one of the TWO conditions demo admission
        # needs (the other is the validated illustrativeDemo config carrying
        # the same per-run nonce). Only this harness writes it; the ordinary
        # served build never contains it.
        nonce = (operator or {}).get("contextNonce")
        if not (isinstance(nonce, str) and re.fullmatch(r"[0-9a-f]{32}", nonce)):
            raise ValueError("the demo page needs the run's context nonce")
        ctx = ('<script>Object.defineProperty(window,"__DF_DEMO_CONTEXT",{value:Object.freeze('
               '{harness:"serve_pricing_preview",state:"demo",nonce:"' + nonce + '"}),'
               'writable:false,configurable:false,enumerable:false});</script>\n').encode("utf-8")
        h0, hsep, h1 = raw.partition(b"</head>")
        raw = (h0 + ctx + hsep + h1) if hsep else ctx + raw
        head, sep, tail = raw.rpartition(b"</body>")
        panel = operator_panel(state, addr, operator)
        return (head + panel + sep + tail) if sep else raw + panel
    banner = (
        '<div id="' + BANNER_ID + '" role="note" style="position:fixed;left:0;right:0;bottom:0;'
        'z-index:2147483647;background:#7a1f1f;color:#fff;font:700 13px/1.35 sans-serif;'
        'text-align:center;padding:6px 10px;pointer-events:none;">'
        'NON-SHIPPING REHEARSAL &middot; FIXTURE PRICES ONLY &middot; state: ' + state
        + ' &middot; served on ' + addr + ' &middot; nothing is sent or saved</div>\n'
    ).encode("utf-8")
    head, sep, tail = raw.rpartition(b"</body>")
    if not sep:
        return raw + banner
    return head + banner + sep + tail


def _parse(stamp: str) -> datetime:
    return datetime.fromisoformat(stamp)


def observation_verdict(raw, start: datetime):
    """Why a variant's observation stamp cannot be trusted, or None when it can.

    The observation instant is EVIDENCE: it is what the runtime freshness axis
    judges. A stamp that is missing, unreadable, offset-less (which clock?) or
    later than this run's own clock cannot be repaired by substituting a
    recent instant - that would serve a price nobody observed at that time as
    freshly observed. Such a variant is refused by name (PR #132 review
    repair, 2026-09-25); a trustworthy stamp is passed through unchanged.
    """
    if raw is None or (isinstance(raw, str) and not raw.strip()):
        return "observation-missing"
    if not isinstance(raw, str):
        return "observation-unparseable"
    try:
        inst = _parse(raw)
    except (TypeError, ValueError):
        return "observation-unparseable"
    if inst.tzinfo is None or inst.utcoffset() is None:
        return "observation-offset-missing"
    if inst > start:
        return "observation-in-future"
    return None


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


def accessory_ids():
    return [a["id"] for a in _load(os.path.join(REPO, "data", "accessories.json"))]


SNAPSHOT = os.path.join(REPO, "demo", "price-snapshot", "snapshot.json")
MAPPING = os.path.join(REPO, "demo", "price-snapshot", "mapping.json")


def build_website(start, snapshot=None, mapping=None):
    """The `website` drill: ACTUAL extracted prices for the subset of the app's
    assortment that has sufficient current identity AND price evidence.

    Three rules make this honest rather than impressive:

    1. EVERY record is re-validated here against the CURRENT admission rules.
       A snapshot's own "clean" classification is not trusted - it was written
       by whatever version of the extractor produced it.
    2. Only `preview-eligible` (or `owner-verified`) mappings are used. An
       ambiguous identity contributes NOTHING; its product simply has no price
       and the quote says so.
    3. NO FIXTURE PRICE IS EVER MIXED IN. An accessory without a website price
       gets no pricing entry at all, so its quote line is unresolved and the
       merchandise subtotal is withheld. A partial preview is fine; an
       apparently-complete total assembled from two sources is not.

    Returns (products, mattress_skus, accessory_skus, coverage).
    """
    snapshot = snapshot or SNAPSHOT
    mapping_path = mapping or MAPPING
    if not (os.path.exists(snapshot) and os.path.exists(mapping_path)):
        raise SystemExit(
            "the website drill needs demo/price-snapshot/{snapshot,mapping}.json\n"
            "  run: python tools/fetch_lacks_prices.py && python tools/map_app_to_website.py")
    snap = _load(snapshot)
    mapping = _load(mapping_path)
    by_sku = {}
    for v in snap.get("variants") or []:
        if isinstance(v.get("sku"), str):
            by_sku.setdefault(v["sku"], v)

    USABLE = ("preview-eligible", "owner-verified")
    ALLOWED_HOSTS = _load(os.path.join(REPO, "tools", "source_hosts.json"))["priceSourceHosts"]

    def admissible(v):
        """The CURRENT admission rules, applied to a record regardless of what
        the snapshot said about it."""
        if not isinstance(v, dict):
            return False, "not-a-record"
        amt = v.get("sellingAmountMinor")
        if not isinstance(amt, int) or isinstance(amt, bool) or amt <= 0 or amt > 1000000000:
            return False, "amount-not-admissible"
        if v.get("currency") != "USD":
            return False, "currency-not-usd"
        sku = v.get("sku")
        if not isinstance(sku, str) or not sku.strip() or sku != sku.strip():
            return False, "sku-not-a-trimmed-identifier"
        ev = v.get("evidence") or {}
        # A record's own product page, or an exact child read on its
        # configurable parent's product page (the collector's own drill
        # output: the real retailer page that shows that child's price). A
        # category listing is still refused.
        if ev.get("type") not in ("product-page", "configurable-parent-page"):
            return False, "evidence-is-not-a-product-page"
        url = ev.get("url") or ""
        host = urllib.parse.urlparse(url).hostname or ""
        if host.lower() not in ALLOWED_HOSTS:
            return False, f"source-host-not-allowlisted:{host}"
        if v.get("exceptions"):
            return False, "carries-exceptions:" + ",".join(v["exceptions"][:2])
        why = observation_verdict(v.get("observedAt"), start)
        if why:
            return False, why
        return True, None

    products, mattress_skus, accessory_skus = [], {}, {}
    coverage = {"mattressSizes": [], "mattressRejected": [], "accessories": [],
                "accessoriesRejected": []}

    for row in mapping.get("mattresses") or []:
        appid = row.get("appId")
        for size, d in (row.get("sizes") or {}).items():
            if d.get("status") not in USABLE:
                continue
            v = by_sku.get(d.get("sku"))
            ok, why = admissible(v)
            if not ok:
                coverage["mattressRejected"].append(
                    {"appId": appid, "size": size, "sku": d.get("sku"), "reason": why})
                continue
            products.append({"kind": "mattress", "appId": appid, "size": size, "variant": v})
            mattress_skus.setdefault(appid, {})[size] = v["sku"]
            coverage["mattressSizes"].append(
                {"appId": appid, "appName": row.get("appName"), "size": size,
                 "sku": v["sku"], "amountMinor": v["sellingAmountMinor"],
                 "sourceUrl": v["evidence"]["url"]})

    for row in mapping.get("accessories") or []:
        appid = row.get("appId")
        if row.get("status") not in USABLE:
            coverage["accessoriesRejected"].append(
                {"appId": appid, "reason": row.get("status")})
            continue
        # A variant key is either a mattress size (the family is sold per
        # size: one sku per size, resolved for the customer's own size) or the
        # mapper's explicit size-independent key (one product, no size axis).
        # Anything else - including the legacy str(None) == "None" - is
        # refused by name; it is never a size (PR #132 review repair).
        sized, free = {}, {}
        for size, d in (row.get("variants") or {}).items():
            v = by_sku.get(d.get("sku"))
            ok, why = admissible(v)
            if ok and size == SIZE_INDEPENDENT_KEY:
                free[size] = v
            elif ok and size in MATTRESS_SIZES:
                sized[size] = v
            else:
                coverage["accessoriesRejected"].append(
                    {"appId": appid, "size": size, "sku": d.get("sku"),
                     "reason": why if not ok else f"size-key-not-a-size:{size}"})
        if free and sized:
            # One family cannot be both sizeless and sold per size; nothing
            # here can say which sku a customer would buy, so nothing prices.
            coverage["accessoriesRejected"].append(
                {"appId": appid, "sizes": sorted(free) + sorted(sized),
                 "reason": "mixed-size-independence"})
            continue
        if not (free or sized):
            continue
        if free:
            v = free[SIZE_INDEPENDENT_KEY]
            products.append({"kind": "accessory", "appId": appid, "size": None, "variant": v})
            accessory_skus[appid] = {"sku": v["sku"]}
        else:
            # One sku per size, and one size per sku. Two sizes naming the
            # SAME sku cannot both be that product: nothing here can say
            # which size the sku really is, so the family prices nothing.
            shared = sorted(z for z, v in sized.items()
                            if sum(1 for o in sized.values() if o["sku"] == v["sku"]) > 1)
            if shared:
                coverage["accessoriesRejected"].append(
                    {"appId": appid, "sizes": shared, "reason": "sku-shared-across-sizes"})
                continue
            for size, v in sized.items():
                # The pricing ENTRY stays sizeless (the accessory contract);
                # `variantSize` is the drill's own note of which customer size
                # this variant answers, and never enters the served document.
                products.append({"kind": "accessory", "appId": appid, "size": None,
                                 "variantSize": size, "variant": v})
                accessory_skus.setdefault(appid, {"bySize": {}})["bySize"][size] = v["sku"]
        coverage["accessories"].append(
            {"appId": appid, "sizes": sorted(free or sized), "familyKey": row.get("familyKey")})
    return products, mattress_skus, accessory_skus, coverage


def size_projections(products, variant_sizes):
    """The pricing documents ONE customer can resolve, one per customer size.

    An accessory family sold per mattress size is several purchasable
    products - one sku and one price per size - behind ONE catalog id, and
    every accessory pricing entry is sizeless by contract. validate_pricing
    therefore treats (productId, null) as the accessory identity and refuses a
    second entry as a duplicate. That rule is right and is NOT relaxed here:
    no customer has two sizes, so no customer can resolve two variants of one
    family. The served document is judged the way it is consumed - once per
    customer size, each projection holding every mattress entry, every
    size-independent accessory and ONLY that size's variant of each sized
    family - and each projection must satisfy the unchanged validator,
    duplicate detection included (PR #132 review repair, 2026-09-27).

    `variant_sizes[i]` is the customer size products[i] answers, or None for
    an entry every customer can resolve. Returns [(label, [entry, ...])]:
    a single (None, products) when no entry is size-scoped. Every entry is in
    at least one projection, so nothing is served unvalidated.
    """
    if len(variant_sizes) != len(products):
        raise ValueError("variant_sizes must name one size (or None) per product entry")
    stray = sorted({z for z in variant_sizes if z is not None and z not in MATTRESS_SIZES})
    if stray:
        raise ValueError(f"variant size {stray[0]!r} is not a mattress size")
    present = set(variant_sizes)
    sizes = [z for z in MATTRESS_SIZES if z in present]
    if not sizes:
        return [(None, list(products))]
    return [(z, [e for e, vz in zip(products, variant_sizes) if vz is None or vz == z])
            for z in sizes]


def review_sales_policies():
    """Retailer sales policies as PUBLISHED on lacks.com and captured in a
    browser on 2026-10-03 (Codex capture, re-read in session; see
    docs/payment-choice-missing-inputs-2026-10-03.md). Review builds only:
    shipped data carries no `salesPolicies` and the app renders nothing
    without it. Wording is a faithful summary pending Lacks approval of
    EN/ES copy; nothing here is a guarantee the kiosk makes."""
    return {
        "status": "review-only-pending-retailer-approval",
        "comfortPromise": {
            "sourceUrl": "https://www.lacks.com/return-and-store-policies",
            "observedAt": "2026-10-03T20:46:31.131Z",
            "requiresProtector": True, "requiresPillow": True,
            # Labelled with the recorded capture date (observedAt) only: the
            # page's own publication date is not recorded and nothing here is
            # verified (status above).
            "title": {"en": "90-Day Comfort Promise (from lacks.com, as captured Oct 3, 2026)",
                      "es": "Promesa de Comodidad de 90 D\u00edas (de lacks.com, seg\u00fan la captura del 3 de oct. de 2026)"},
            "summary": {"en": "Lacks publishes a one-time comfort exchange for a new mattress, with conditions.",
                        "es": "Lacks publica un cambio \u00fanico por comodidad para un colch\u00f3n nuevo, con condiciones."},
            "conditions": [
                {"en": "Sleep on the mattress for at least 30 nights; request the exchange within 90 days of delivery.",
                 "es": "Duerme en el colch\u00f3n al menos 30 noches; solicita el cambio dentro de los 90 d\u00edas posteriores a la entrega."},
                {"en": "One exchange, for a mattress of equal or greater value; you pay any difference.",
                 "es": "Un solo cambio, por un colch\u00f3n de igual o mayor valor; pagas la diferencia."},
                {"en": "The purchase must include a mattress protector and at least one pillow, and the mattress must have been used with that protector.",
                 "es": "La compra debe incluir un protector de colch\u00f3n y al menos una almohada, y el colch\u00f3n debe haberse usado con ese protector."},
                {"en": "The mattress must be in good condition, free of stains, odors or damage. A local delivery fee applies to the exchange.",
                 "es": "El colch\u00f3n debe estar en buen estado, sin manchas, olores ni da\u00f1os. Se cobra un cargo de entrega local por el cambio."},
                {"en": "No refunds under this program. Pillows and protectors cannot be returned or exchanged.",
                 "es": "Este programa no ofrece reembolsos. Las almohadas y los protectores no se pueden devolver ni cambiar."},
            ],
        },
        "fulfillment": {
            "sourceUrl": "https://www.lacks.com/services",
            "observedAt": "2026-10-03T20:46:29.800Z",
            "pickupNoCharge": True,
            "pickupLabel": {"en": "Warehouse pickup", "es": "Recogida en almac\u00e9n"},
            "deliveryLabel": {"en": "Delivery and setup", "es": "Entrega e instalaci\u00f3n"},
            # Same rule: the capture date (observedAt) leads, the captured
            # wording follows unchanged.
            "pickupNote": {"en": "As captured from lacks.com on Oct 3, 2026: published as free from the central warehouse. Bring the sales contract and a matching photo ID.",
                           "es": "Seg\u00fan la captura de lacks.com del 3 de oct. de 2026: publicada como gratuita en el almac\u00e9n central. Lleva el contrato de venta y una identificaci\u00f3n con foto que coincida."},
            "deliveryNote": {"en": "As captured from lacks.com on Oct 3, 2026: full-service delivery with in-home setup is published; its charge is confirmed in store.",
                             "es": "Seg\u00fan la captura de lacks.com del 3 de oct. de 2026: se publica la entrega completa con instalaci\u00f3n en casa; su cargo se confirma en la tienda."},
        },
    }


FORMULA_INPUTS = {"published-fixed-factor": ["principalMinor", "publishedPaymentFactor"],
                  "published-equal-division": ["principalMinor", "termMonths"]}


def review_formulas(fin, start):
    """One formula artifact per plan whose governed calculation is on, each on
    that plan's own source and verification stamp."""
    out = []
    for pl in fin.get("plans", []):
        mode = pl.get("calculationMode")
        if pl.get("paymentCalculationEnabled") is True and mode in FORMULA_INPUTS:
            out.append({
                "id": "review-" + pl["id"], "planId": pl["id"], "mode": mode,
                "cadence": "monthly", "cadenceVerified": True,
                "inputs": list(FORMULA_INPUTS[mode]),
                "approvedBy": REVIEW_FORMULA_APPROVAL,
                "approvedAt": (start - timedelta(hours=1)).isoformat(timespec="seconds"),
                "sourceUrl": pl["sourceUrl"], "verifiedAt": pl["verifiedAt"],
            })
    return out


def review_financing():
    """The canonical financing source as the review build serves it: the
    builder's own headline transform, the published factor KEPT (it is the
    calculation input), exact terms and the governed calculation switched on
    in memory for the plan whose method is published. Stamps are the source's
    own. Never written anywhere."""
    src = _load(os.path.join(REPO, "incoming", "lacks_financing.json"))
    fin = copy.deepcopy(src["financing"])
    financing_headline.apply_to_financing(fin)
    fin["exactPromotionsEnabled"] = True
    for plan in fin.get("plans", []):
        mode = plan.get("calculationMode")
        if mode == "published-fixed-factor" and plan.get("publishedPaymentFactor") is not None \
                and plan.get("paymentRounding"):
            plan["paymentCalculationEnabled"] = True
        elif mode == "published-equal-division" and plan.get("apr") == 0 and plan.get("paymentRounding"):
            # published equal payments; the runtime still refuses a figure
            # without a supplied down payment (downPaymentRequired)
            plan["paymentCalculationEnabled"] = True
            plan.pop("publishedPaymentFactor", None)
        else:
            plan.pop("publishedPaymentFactor", None)
    return fin


def review_financing_fresh(fin, start: datetime) -> bool:
    """True while the financing block's own stamp is within maxAgeDays of
    `start` (and not in the future): the build-time half of the rule the
    runtime gate (financingTermsFresh) executes on the live clock."""
    try:
        at = _parse(fin["verifiedAt"])
        mad = int(fin["maxAgeDays"])
    except (KeyError, TypeError, ValueError):
        return False
    return timedelta(0) <= start - at <= timedelta(days=mad)


# ---- the payment DEMO: inputs (design notes below) --------------------------
DEMO_DIR = os.path.join(REPO, "demo", "payment-demo")
DEMO_CONFIG = os.path.join(DEMO_DIR, "demo.json")
DEMO_PRICES = os.path.join(DEMO_DIR, "illustrative-prices.json")
DEMO_CAPTURE = os.path.join(REPO, "demo", "price-review", "2026-10-03")
DEMO_CONTRACT = "payment-demo/1"
# Demo price provenance. Deliberately NOT production evidence statuses: the
# production validator and the production gate refuse both.
DEMO_PRICE_STATUSES = ("historical-snapshot", "illustrative")
DEMO_CALC_MODES = ("published-fixed-factor", "published-equal-division")
DEMO_ROUNDING = "up-to-whole-dollar"


# ---- the payment DEMO (owner demo-first direction 2026-10-05) ----------------
# A complete purchase-and-payment demonstration assembled IN MEMORY and kept
# HONEST (owner closeout 2026-10-06):
#   * historical prices keep their ORIGINAL observation instants and say so
#     (evidence.status "historical-snapshot", verified false);
#   * illustrative fills say so (evidence.status "illustrative", with method);
#   * the real approval records are the SHIPPED ones (unapproved / pending);
#     nothing here writes an approval, a clearance or a verification;
#   * example financing plans are unverified and carry calculation OFF; their
#     example method lives in a separate demoCalculation block;
#   * the demo's assembly instant is its own field and never stands in for
#     evidence time.
# The app admits this data only through its demo admission adapter, which
# needs BOTH this config (validated by validate_payment_demo) AND the
# harness-written page context carrying the same per-run nonce.
def _amortization_factor(apr, term):
    r = apr / 100 / 12
    return round(r / (1 - (1 + r) ** -term), 6)


def demo_financing():
    """The canonical financing block with its promotional offers REPLACED by
    the demo's example plans. Exact-term authorization stays as shipped
    (false); the real non-promotional programs are untouched."""
    demo = _load(DEMO_CONFIG)
    src = _load(os.path.join(REPO, "incoming", "lacks_financing.json"))
    fin = copy.deepcopy(src["financing"])
    plans = []
    for p in demo["plans"]:
        calc = {"mode": p["calculationMode"], "rounding": DEMO_ROUNDING}
        if p.get("exampleFactor") is not None:
            calc["factor"] = p["exampleFactor"]
        apr_txt = ("%g" % p["apr"])
        plans.append({
            "id": p["id"], "kind": "open-end-promotional-credit", "provider": "Demo",
            "demo": True, "verified": False, "verificationStatus": "illustrative",
            "apr": p["apr"], "termMonths": p["termMonths"], "minimumPurchase": None,
            "paymentCalculationEnabled": False, "demoCalculation": calc,
            "headline": {"en": f"{apr_txt}% APR for {p['termMonths']} months",
                         "es": f"{apr_txt}% APR por {p['termMonths']} meses"},
            "detail": copy.deepcopy(p["detail"]), "disclosure": copy.deepcopy(demo["disclosure"]),
        })
    rest = [pl for pl in fin.get("plans", []) if pl.get("kind") != "open-end-promotional-credit"]
    fin["plans"] = plans + rest
    return fin


def build_demo_products(start: datetime):
    """Pricing entries for the demo: the 2026-10-03 capture (historical, on
    its own observation instants) plus the illustrative fills. Returns
    (entries, m_skus, a_skus, provenance). A product-size neither source
    prices stays unpriced - never a guessed number."""
    fills = _load(DEMO_PRICES)
    wp, m_skus, a_skus, _cov = build_website(
        start, os.path.join(DEMO_CAPTURE, "snapshot.json"), os.path.join(DEMO_CAPTURE, "mapping.json"))
    m_skus = {k: dict(v) for k, v in m_skus.items()}
    a_skus = copy.deepcopy(a_skus)
    entries = []
    prov = {"historical": [], "illustrative": []}

    def entry(app_id, kind, size, sku, amount, evidence):
        return {"productId": app_id, "productKind": kind, "sku": sku, "size": size,
                "price": {"amountMinor": amount, "currency": "USD", "kind": "regular"},
                "evidence": evidence, "clearance": {"status": "not-cleared"}}

    for rec in wp:
        v = rec["variant"]
        entries.append(entry(rec["appId"], rec["kind"], rec["size"], v["sku"], v["sellingAmountMinor"],
                             {"status": "historical-snapshot", "verified": False,
                              "observedAt": v["observedAt"], "sourceUrl": v["evidence"]["url"]}))
        prov["historical"].append({"appId": rec["appId"], "size": rec.get("variantSize") or rec["size"],
                                   "sku": v["sku"], "amountMinor": v["sellingAmountMinor"],
                                   "observedAt": v["observedAt"], "sourceUrl": v["evidence"]["url"]})
    for app_id, sizes in (fills.get("mattresses") or {}).items():
        for size, f in sizes.items():
            if size not in MATTRESS_SIZES or size in m_skus.get(app_id, {}):
                continue
            sku = "DEMO-" + app_id.upper() + "-" + size.upper()
            entries.append(entry(app_id, "mattress", size, sku, f["amountMinor"],
                                 {"status": "illustrative", "verified": False, "method": f["method"]}))
            m_skus.setdefault(app_id, {})[size] = sku
            prov["illustrative"].append({"appId": app_id, "size": size, "sku": sku,
                                         "amountMinor": f["amountMinor"], "method": f["method"]})
    for app_id, sizes in (fills.get("accessories") or {}).items():
        have = a_skus.get(app_id) or {}
        for size, f in sizes.items():
            sku = "DEMO-" + app_id.upper() + ("" if size == "*" else "-" + size.upper())
            if size == "*":
                if have:
                    continue
                a_skus[app_id] = {"sku": sku}
            else:
                if "sku" in have or size in (have.get("bySize") or {}):
                    continue
                a_skus.setdefault(app_id, {"bySize": {}}).setdefault("bySize", {})[size] = sku
            entries.append(entry(app_id, "accessory", None, sku, f["amountMinor"],
                                 {"status": "illustrative", "verified": False, "method": f["method"]}))
            prov["illustrative"].append({"appId": app_id, "size": size, "sku": sku,
                                         "amountMinor": f["amountMinor"], "method": f["method"]})
    return entries, m_skus, a_skus, prov


def demo_presentation(demo):
    """Customer-facing pricing copy for the demo: the provenance says what the
    figures are (historical snapshot + illustrative), never 'verified'."""
    return {
        "totals": {
            "merchandise-label": {"en": "Merchandise subtotal", "es": "Subtotal de mercancía"},
            "excludes": {"en": "Merchandise only. Tax, delivery and setup are not included.",
                         "es": "Solo mercancía. No incluye impuestos, entrega ni instalación."},
            "incomplete": {"en": "A subtotal is not available until every selected item has a price.",
                           "es": "El subtotal no está disponible hasta que cada artículo "
                                 "seleccionado tenga un precio."},
            "provenance": copy.deepcopy(demo["priceSource"]),
            "line-label": {"en": "Selected items", "es": "Artículos seleccionados"},
            "compare-price-label": {"en": "Price", "es": "Precio"},
            "compare-difference-label": {"en": "Price difference", "es": "Diferencia de precio"},
        },
        "assumptions": [
            {"id": "size", "en": "Priced for the size selected in this consultation.",
             "es": "Precio para el tamaño seleccionado en esta consulta."},
        ],
        # No per-price demo note: everyone in the room knows this is a demo
        # (Blake, 2026-10-12). The illustrative mark and the provenance line
        # still identify the illustrative prices.
        "disclosures": [],
        "states": {
            "price-unavailable": {"en": "Price unavailable", "es": "Precio no disponible"},
            "quote-only": {"en": "Quote in store", "es": "Cotización en tienda"},
            "threshold-unknown": {"en": "A minimum purchase may apply",
                                  "es": "Puede aplicar una compra mínima"},
            "threshold-not-met": {"en": "This selection is below the minimum for this option.",
                                  "es": "Esta selección está por debajo del mínimo "
                                        "para esta opción."},
        },
    }


def _bilingual(v):
    return isinstance(v, dict) and all(isinstance(v.get(k), str) and v.get(k).strip() for k in ("en", "es"))


def validate_payment_demo(config, catalog, accessories):
    """The DEMO contract (structure and arithmetic, not approval): returns a
    list of errors, empty when the demo may be served. Demo mode waives the
    real-offer approval requirements only; amounts, identity, sizes, methods
    and calculation inputs must still be exactly right."""
    errs = []
    shipped = _load(os.path.join(REPO, "data", "store-config.json"))
    d = config.get("illustrativeDemo")
    if not isinstance(d, dict):
        return ["illustrativeDemo missing"]
    if d.get("contract") != DEMO_CONTRACT or d.get("enabled") is not True:
        errs.append("illustrativeDemo contract/enabled wrong")
    if not (isinstance(d.get("contextNonce"), str) and re.fullmatch(r"[0-9a-f]{32}", d["contextNonce"])):
        errs.append("illustrativeDemo.contextNonce must be 32 hex characters")
    try:
        assembled = _parse(d.get("assembledAt"))
        if assembled.tzinfo is None:
            errs.append("assembledAt has no offset")
    except (TypeError, ValueError):
        assembled = None
        errs.append("assembledAt unparseable")
    for k in ("notice", "priceSource", "paymentSource"):
        if not _bilingual(d.get(k)):
            errs.append(f"illustrativeDemo.{k} must carry en and es")
    if config.get("gasUrl"):
        errs.append("gasUrl must stay blank")
    if "reviewTools" in config:
        errs.append("reviewTools must not appear in the demo")
    pr = config.get("pricing") or {}
    sp_ = shipped["pricing"]
    for key in ("authority", "freshness", "sourcePolicy", "purchaseAssessment"):
        if pr.get(key) != sp_.get(key):
            errs.append(f"pricing.{key} must be the shipped record (no approval is written)")
    pres = pr.get("presentation") or {}
    if pres.get("status") != sp_["presentation"]["status"] or pres.get("approvals") != sp_["presentation"]["approvals"]:
        errs.append("pricing.presentation status/approvals must be the shipped records")
    if pr.get("formulas") != []:
        errs.append("pricing.formulas must be empty (no formula approval is written)")
    hosts = set(_load(os.path.join(REPO, "tools", "source_hosts.json"))["priceSourceHosts"])
    mats = {m["id"]: m for t in TIER_ORDER for m in catalog.get(t, [])}
    accs = {a["id"]: a for a in accessories}
    seen = set()
    products = pr.get("products") or []
    if not products:
        errs.append("pricing.products is empty")
    for i, e in enumerate(products):
        tag = f"pricing.products[{i}]"
        pid, kind, sku, size = e.get("productId"), e.get("productKind"), e.get("sku"), e.get("size")
        if not (isinstance(sku, str) and sku.strip() == sku and sku):
            errs.append(f"{tag}: sku invalid"); continue
        if sku in seen:
            errs.append(f"{tag}: duplicate sku {sku}")
        seen.add(sku)
        if kind == "mattress":
            if pid not in mats or size not in MATTRESS_SIZES or (mats[pid].get("skus") or {}).get(size) != sku:
                errs.append(f"{tag}: mattress identity/size does not match the catalog")
        elif kind == "accessory":
            a = accs.get(pid)
            ok = a is not None and size is None and (a.get("sku") == sku or sku in (a.get("accessorySkus") or {}).values())
            if not ok:
                errs.append(f"{tag}: accessory identity does not match the catalog")
        else:
            errs.append(f"{tag}: productKind invalid")
        price = e.get("price") or {}
        amt = price.get("amountMinor")
        if not (isinstance(amt, int) and not isinstance(amt, bool) and 0 < amt <= 1_000_000_000):
            errs.append(f"{tag}: amountMinor not admissible")
        if price.get("currency") != "USD" or price.get("kind") != "regular":
            errs.append(f"{tag}: currency/kind invalid")
        ev = e.get("evidence") or {}
        if ev.get("status") not in DEMO_PRICE_STATUSES or ev.get("verified") is not False:
            errs.append(f"{tag}: evidence must be an unverified demo status")
        if ev.get("status") == "historical-snapshot":
            try:
                ob = _parse(ev.get("observedAt"))
                if ob.tzinfo is None or (assembled and ob > assembled):
                    errs.append(f"{tag}: observedAt invalid or after assembly")
            except (TypeError, ValueError):
                errs.append(f"{tag}: observedAt unparseable")
            host = (urllib.parse.urlparse(ev.get("sourceUrl") or "").hostname or "").lower()
            if not (str(ev.get("sourceUrl", "")).startswith("https://") and host in hosts):
                errs.append(f"{tag}: historical source not an allowlisted https page")
            if "verifiedAt" in ev:
                errs.append(f"{tag}: a historical entry carries no verification time")
        if ev.get("status") == "illustrative":
            if not (isinstance(ev.get("method"), str) and ev["method"].strip()):
                errs.append(f"{tag}: illustrative entry must name its method")
            if "observedAt" in ev or "sourceUrl" in ev or "verifiedAt" in ev:
                errs.append(f"{tag}: illustrative entry claims an observation/source")
        if (e.get("clearance") or {}).get("status") != "not-cleared":
            errs.append(f"{tag}: clearance must be not-cleared")
    fin = config.get("financing") or {}
    src = _load(os.path.join(REPO, "incoming", "lacks_financing.json"))["financing"]
    if fin.get("exactPromotionsEnabled") is not False:
        errs.append("financing.exactPromotionsEnabled must stay false")
    if fin.get("verifiedAt") != src.get("verifiedAt"):
        errs.append("financing.verifiedAt must be the source's own stamp")
    real = [p for p in fin.get("plans", []) if p.get("demo") is not True]
    if real != [p for p in src["plans"] if p.get("kind") != "open-end-promotional-credit"]:
        errs.append("real (non-demo) plans must be the canonical records unchanged")
    demos = [p for p in fin.get("plans", []) if p.get("demo") is True]
    if not demos:
        errs.append("no example plans")
    for p in demos:
        tag = f"financing.plans[{p.get('id')}]"
        c = p.get("demoCalculation") or {}
        apr, term = p.get("apr"), p.get("termMonths")
        if p.get("verified") is not False or p.get("verificationStatus") != "illustrative" \
                or p.get("paymentCalculationEnabled") is not False or p.get("provider") != "Demo":
            errs.append(f"{tag}: example plans are unverified, calculation off, provider Demo")
        if "publishedPaymentFactor" in p or "verifiedAt" in p or "sourceUrl" in p:
            errs.append(f"{tag}: an example plan claims publication/verification")
        if not (isinstance(apr, (int, float)) and not isinstance(apr, bool) and 0 <= apr <= 100):
            errs.append(f"{tag}: apr invalid")
        if not (isinstance(term, int) and not isinstance(term, bool) and 1 <= term <= 120):
            errs.append(f"{tag}: termMonths invalid")
        if c.get("mode") not in DEMO_CALC_MODES or c.get("rounding") != DEMO_ROUNDING:
            errs.append(f"{tag}: calculation method/rounding unsupported")
        elif c["mode"] == "published-equal-division":
            if apr != 0 or "factor" in c:
                errs.append(f"{tag}: equal division is 0% APR with no factor")
        else:
            f = c.get("factor")
            if not (isinstance(f, float) and 0 < f < 1 and round(f, 6) == f):
                errs.append(f"{tag}: factor invalid")
            elif isinstance(apr, (int, float)) and isinstance(term, int) and f != _amortization_factor(apr, term):
                errs.append(f"{tag}: factor is not the amortization factor for its APR and term")
        for k in ("headline", "detail", "disclosure"):
            if not _bilingual(p.get(k)):
                errs.append(f"{tag}.{k} must carry en and es")
        if _bilingual(p.get("detail")) and not ("Illustrative" in p["detail"]["en"]
                                                and "ilustrativo" in p["detail"]["es"].lower()):
            errs.append(f"{tag}: detail must say it is illustrative")
    return errs


def build_demo(start: datetime):
    """(config, catalog, verdicts, accessories) for --state demo."""
    demo = _load(DEMO_CONFIG)
    shipped = _load(os.path.join(REPO, "data", "store-config.json"))
    catalog = copy.deepcopy(_load(os.path.join(REPO, "data", "mattresses.json")))
    accessories = _load(os.path.join(REPO, "data", "accessories.json"))
    entries, m_skus, a_skus, prov = build_demo_products(start)
    for tier in TIER_ORDER:
        for m in catalog.get(tier, []):
            if m_skus.get(m["id"]):
                m["skus"] = dict(m_skus[m["id"]])
    for a in accessories:
        got = a_skus.get(a["id"])
        if got and "sku" in got:
            a["sku"] = got["sku"]
        elif got:
            a["accessorySkus"] = dict(got["bySize"])
    pr = copy.deepcopy(shipped["pricing"])
    # DISPLAY switches only, in memory, as every harness state does. Approval,
    # freshness, source policy and clearance stay the shipped records.
    pr["enabled"] = True
    pr["displayEnabled"] = True
    pr["surfaces"] = {k: True for k in pr["surfaces"]}
    pr["products"] = entries
    pr["presentation"].update(demo_presentation(demo))
    config = copy.deepcopy(shipped)
    config["pricing"] = pr
    config["financing"] = demo_financing()
    # Published retailer policies (pickup, comfort promise), as captured.
    config["salesPolicies"] = review_sales_policies()
    config["illustrativeDemo"] = {
        "contract": DEMO_CONTRACT, "enabled": True,
        "contextNonce": secrets.token_hex(16),
        "assembledAt": start.isoformat(timespec="seconds"),
        "notice": copy.deepcopy(demo["notice"]),
        "priceSource": copy.deepcopy(demo["priceSource"]),
        "paymentSource": copy.deepcopy(demo["paymentSource"]),
    }
    demo_errors = validate_payment_demo(config, catalog, accessories)
    hosts = _load(os.path.join(REPO, "tools", "source_hosts.json"))
    p_rep = validation.validate_pricing(config, now=start, allowed_source_hosts=hosts["priceSourceHosts"],
                                        financing_source_hosts=hosts["financingSourceHosts"],
                                        mattress_ids={m["id"] for t in TIER_ORDER for m in catalog[t]},
                                        accessory_ids={a["id"] for a in accessories})
    f_rep = validation.validate_financing(config, allowed_source_hosts=hosts["financingSourceHosts"])
    s_rep = validation.validate_store_config(config)
    verdicts = {
        "demo_ok": not demo_errors, "demo_errors": demo_errors,
        # The production validators must REFUSE the demo data, each on its own
        # ground: no approval, no current verification, demo-only fields.
        "production_refuses": (not p_rep.ok) and (not f_rep.ok) and (not s_rep.ok),
        "production_errors": {"pricing": list(p_rep.errors)[:20], "financing": list(f_rep.errors)[:20],
                              "storeConfig": list(s_rep.errors)[:20]},
        "financing_ok": f_rep.ok, "financing_errors": [], "dark_ok": False, "dark_errors": [],
        "served_refused": (not p_rep.ok) and (not f_rep.ok),
        "websiteCoverage": prov,
    }
    return config, catalog, verdicts, accessories


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
    if state == "demo":
        # The payment demo is NOT a drill: its own builder, its own contract.
        return build_demo(start)
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
    if state == "payments":
        fin["exactPromotionsEnabled"] = True
        for plan in fin.get("plans", []):
            if plan.get("id") == "synchrony-9-99-72":
                plan.update({"paymentCalculationEnabled": True,
                             "publishedPaymentFactor": 0.018521,
                             "paymentRounding": "up-to-whole-dollar"})
            if plan.get("id") == "synchrony-0-48":
                plan.update({"downPaymentRequired": True, "chargesRequiredAtPurchase": True,
                             "calculationMode": "published-equal-division",
                             "paymentRounding": "up-to-whole-dollar", "paymentCalculationEnabled": True})
    elif state == "review":
        fin = review_financing()

    # ---- pricing: the fixture expanded to every catalog mattress -------------
    pr = copy.deepcopy(fx["pricing"])
    for rec in (pr["freshness"], pr["sourcePolicy"]):
        rec["approvedAt"] = _shift(rec["approvedAt"], delta)
    for appr in pr["presentation"]["approvals"].values():
        appr["at"] = _shift(appr["at"], delta)
    for f in pr.get("formulas", []):
        f["approvedAt"] = _shift(f["approvedAt"], delta)
        f["verifiedAt"] = _shift(f["verifiedAt"], delta)
    if state == "payments":
        # the drill's 0%/48 plan runs its published equal-division method too
        zero = next((pl for pl in fin.get("plans", []) if pl.get("id") == "synchrony-0-48"), None)
        if zero and pr.get("formulas"):
            f0 = copy.deepcopy(pr["formulas"][0])
            f0.update({"id": "fixture-equal-division", "planId": zero["id"],
                       "mode": "published-equal-division", "inputs": ["principalMinor", "termMonths"]})
            pr["formulas"].append(f0)
    if state == "review":
        # The formula artifact of the ONE plan whose method is published,
        # carrying that plan's own source and verification stamp (never
        # shifted). Admitted only while the real financing evidence is fresh:
        # a stale source admits no formula, and every payment reads "To
        # confirm" - the same fail-closed outcome production would show.
        pr["formulas"] = []
        if review_financing_fresh(fin, start):
            pr["formulas"] = review_formulas(fin, start)
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
    # Accessory-price provenance: one FIXTURE price per shipped accessory —
    # productKind accessory, no size — so the Sleep System's governed slot can
    # replace the legacy catalog "From $" line in the opened states.
    base_index = len(products)
    for j, aid in enumerate(accessory_ids()):
        e = copy.deepcopy(template)
        e["productId"] = aid
        e["productKind"] = "accessory"
        e["sku"] = fixture_sku(aid)
        e["size"] = None
        e["price"]["amountMinor"] = 4900 + 5000 * j
        e["evidence"]["verifiedAt"] = _shift(template["evidence"]["verifiedAt"], evidence_delta)
        e["clearance"]["attestedAt"] = _shift(template["clearance"]["attestedAt"], delta)
        scope = e["clearance"]["scope"]
        scope["productId"] = aid
        scope["productKind"] = "accessory"
        scope["sku"] = e["sku"]
        scope["size"] = None
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
    if state == "unavailable":
        # Fresh and eligible, resolvable by the resolver (entry currency equals
        # pricing currency), refused by the gate's runtime money admission:
        # the independently demonstrated price-unavailable state. The dark
        # form is refused at build time too (pricing.currency must be USD).
        for doc in (dark, served):
            doc["currency"] = UNAVAILABLE_CURRENCY
            for e in doc["products"]:
                e["price"]["currency"] = UNAVAILABLE_CURRENCY

    config = copy.deepcopy(prod)
    config["financing"] = fin
    config["pricing"] = served
    if state in PAYMENT_STATES:
        config["salesPolicies"] = review_sales_policies()
        # Review-only tools: the assumption scenario panel. Never shipped
        # (tests/smoke_check.py locks shipped data against it).
        config["reviewTools"] = {"scenarioPanel": True}

    # ---- catalog: skus injected in memory ----------------------------------
    catalog = copy.deepcopy(cat)
    accessories = _load(os.path.join(REPO, "data", "accessories.json"))
    coverage = None
    variant_sizes = None

    if state in ("website", "review"):
        # ACTUAL extracted prices, for the subset with sufficient evidence.
        # Everything else is left with NO price - never a fixture stand-in.
        wp, m_skus, a_skus, coverage = build_website(start)
        # Each entry keeps ITS OWN observation instant: the capture can span
        # several minutes and, once a cache is replayed weeks later, several
        # weeks. One shared "now" would quietly refresh every price.
        def _observed(v):
            # Admitted by build_website (observation_verdict): present,
            # parseable, offset-bearing, not after this run. Passed through
            # UNCHANGED - a substituted or clamped instant would serve a
            # price nobody observed at that time as freshly observed.
            return v["observedAt"]

        template = dark["products"][0]
        entries = []
        variant_sizes = [rec.get("variantSize") for rec in wp]
        for rec in wp:
            v = rec["variant"]
            e = copy.deepcopy(template)
            e["productId"] = rec["appId"]
            e["productKind"] = rec["kind"]
            e["sku"] = v["sku"]
            e["size"] = rec["size"]
            e["price"]["amountMinor"] = v["sellingAmountMinor"]
            e["price"]["currency"] = "USD"
            e["price"]["kind"] = "regular"
            # The evidence is the REAL product page the price was read from,
            # stamped at this run so the runtime freshness axis judges it on
            # the live clock. verifiedBy names the mechanism honestly: this is
            # an automated extraction awaiting the owner's check, not a human
            # attestation.
            e["evidence"]["status"] = "retailer-product-page-current"
            # The stamp is the REAL observation instant from the snapshot -
            # when the price was actually read off the page - not a synthetic
            # one. That is what makes the runtime freshness axis meaningful
            # here: if the capture ages out, the preview stops showing prices
            # exactly as production would.
            e["evidence"]["verifiedAt"] = _observed(v)
            e["evidence"]["sourceUrl"] = v["evidence"]["url"]
            e["evidence"]["verifiedBy"] = "automated-extraction (PENDING OWNER VERIFICATION)"
            e["clearance"]["attestedAt"] = _observed(v)
            e["clearance"]["attestedBy"] = "automated-extraction (PENDING OWNER VERIFICATION)"
            scope = e["clearance"]["scope"]
            scope["productId"] = rec["appId"]
            scope["productKind"] = rec["kind"]
            scope["sku"] = v["sku"]
            scope["size"] = rec["size"]
            scope["amountMinor"] = v["sellingAmountMinor"]
            scope["evidenceVerifiedAt"] = e["evidence"]["verifiedAt"]
            scope["evidenceSourceUrl"] = e["evidence"]["sourceUrl"]
            entries.append(e)
        for doc in (dark, served):
            doc["products"] = copy.deepcopy(entries)
            # Say where the money came from. This is the ONE sentence that
            # separates a website-sourced figure from an illustrative one.
            # The whole copy set, not just the provenance line. The fixture's
            # strings all carry a "FIXTURE --" prefix, and leaving them in place
            # would label website-sourced money as fixture data - the exact
            # mislabelling this state exists to prevent.
            doc["presentation"]["totals"] = {
                "merchandise-label": {"en": "Merchandise subtotal",
                                      "es": "Subtotal de mercanc\u00eda"},
                "excludes": {"en": "Merchandise only. Tax, delivery and setup are not "
                                   "included and are quoted in store.",
                             "es": "Solo mercanc\u00eda. No incluye impuestos, entrega ni "
                                   "instalaci\u00f3n; se cotizan en la tienda."},
                "incomplete": {"en": "A subtotal is not available until every selected "
                                     "item has a verified price.",
                               "es": "El subtotal no est\u00e1 disponible hasta que cada "
                                     "art\u00edculo seleccionado tenga un precio verificado."},
                "provenance": {"en": "Website prices \u2014 pending verification. Not a quote.",
                               "es": "Precios del sitio web \u2014 pendientes de "
                                     "verificaci\u00f3n. No es una cotizaci\u00f3n."},
                "line-label": {"en": "Selected items", "es": "Art\u00edculos seleccionados"},
                "compare-price-label": {"en": "Purchase price", "es": "Precio de compra"},
                "compare-difference-label": {"en": "Price difference",
                                             "es": "Diferencia de precio"},
            }
            # The assumptions and disclosures are FIXTURE copy too; leaving
            # them would put "FIXTURE --" beside a real extracted price.
            doc["presentation"]["assumptions"] = [
                {"id": "size", "en": "Priced for the size selected in this consultation.",
                 "es": "Precio para el tama\u00f1o seleccionado en esta consulta."},
                {"id": "source", "en": "Read from the retailer's public product page, "
                                       "not from an in-store quote.",
                 "es": "Obtenido de la p\u00e1gina p\u00fablica del producto, no de una "
                       "cotizaci\u00f3n en tienda."},
            ]
            doc["presentation"]["disclosures"] = [
                {"id": "pending", "en": "Prices are website-sourced and awaiting "
                                        "verification. Confirm in store before purchase.",
                 "es": "Los precios provienen del sitio web y est\u00e1n pendientes de "
                       "verificaci\u00f3n. Confirme en la tienda antes de comprar."},
            ]
            doc["presentation"]["states"] = {
                "price-unavailable": {"en": "Price unavailable", "es": "Precio no disponible"},
                "quote-only": {"en": "Quote in store", "es": "Cotizaci\u00f3n en tienda"},
                "threshold-unknown": {"en": "A minimum purchase applies",
                                      "es": "Aplica una compra m\u00ednima"},
                "threshold-not-met": {"en": "This selection is below the published "
                                            "minimum for this option.",
                                      "es": "Esta selecci\u00f3n est\u00e1 por debajo del "
                                            "m\u00ednimo publicado para esta opci\u00f3n."},
            }
        for tier in TIER_ORDER:
            for m in catalog.get(tier, []):
                got = m_skus.get(m["id"])
                if got:
                    m["skus"] = dict(got)
        for a in accessories:
            got = a_skus.get(a["id"])
            if not got:
                continue
            if "sku" in got:
                # size-independent: ONE product, no size axis. pricingSkuFor
                # reads the string `sku` for every customer size.
                a["sku"] = got["sku"]
            else:
                # one sku per size; a size with no website variant resolves
                # nothing, which is the point
                a["accessorySkus"] = dict(got["bySize"])
    else:
        for tier in TIER_ORDER:
            for m in catalog.get(tier, []):
                m["skus"] = {DRILL_SIZE: fixture_sku(m["id"])}
        for a in accessories:
            a["sku"] = fixture_sku(a["id"])

    # ---- verdicts -----------------------------------------------------------
    hosts = _load(os.path.join(REPO, "tools", "source_hosts.json"))
    kw = dict(allowed_source_hosts=hosts["priceSourceHosts"],
              financing_source_hosts=hosts["financingSourceHosts"],
              mattress_ids=set(catalog_ids()), accessory_ids=set(accessory_ids()))
    dark_cfg = copy.deepcopy(config)
    dark_cfg["pricing"] = dark
    fin_rep = validation.validate_financing(dark_cfg, allowed_source_hosts=hosts["financingSourceHosts"])
    # Judged once per customer size (see size_projections). Every state but a
    # website drill carrying per-size accessory variants has ONE projection:
    # the whole document, exactly as before.
    if variant_sizes is None:
        variant_sizes = [None] * len(dark["products"])
    dark_errors, dark_warnings, served_errors, projected = [], [], [], []
    served_refused = True
    # One sku identifies one product-size across the WHOLE served document,
    # not merely inside each projection.
    seen = {}
    for i, e in enumerate(dark["products"]):
        if e["sku"] in seen:
            dark_errors.append(f"pricing.products[{i}].sku {e['sku']!r} duplicates "
                               f"products[{seen[e['sku']]}] across the served document "
                               f"- one SKU identifies one product-size")
        else:
            seen[e["sku"]] = i
    dark_views = size_projections(dark["products"], variant_sizes)
    served_views = size_projections(config["pricing"]["products"], variant_sizes)
    for (label, dark_products), (_, served_products) in zip(dark_views, served_views):
        projected.append(label)
        tag = "" if label is None else f"[customer size {label}] "
        d_cfg = copy.deepcopy(dark_cfg)
        d_cfg["pricing"]["products"] = copy.deepcopy(dark_products)
        s_cfg = copy.deepcopy(config)
        s_cfg["pricing"]["products"] = copy.deepcopy(served_products)
        d_rep = validation.validate_pricing(d_cfg, now=start, **kw)
        s_rep = validation.validate_pricing(s_cfg, now=start, **kw)
        dark_errors.extend(tag + e for e in d_rep.errors)
        dark_warnings.extend(tag + w for w in d_rep.warnings)
        served_errors.extend(tag + e for e in s_rep.errors)
        # EVERY projection's opened form must be refused, not merely one.
        served_refused = served_refused and not s_rep.ok
    dark_ok = not dark_errors
    verdicts = {
        "financing_ok": fin_rep.ok,
        "financing_errors": list(fin_rep.errors),
        "dark_ok": dark_ok,
        "dark_errors": dark_errors,
        "dark_warnings": dark_warnings,
        "sizeProjections": projected,
        # The stale drill is refused at BUILD time too — the validator names
        # the aged evidence — which is the other half of the same fail-closed
        # rule the runtime gate executes. Every other state's dark form is
        # clean; the stale state's dark form must be refused for exactly this.
        "dark_stale_named": (not dark_ok) and all("older than maxAgeDays" in e for e in dark_errors),
        # The unavailable drill's dark form is refused for exactly its currency.
        "dark_currency_named": (not dark_ok) and all("currency" in e for e in dark_errors),
        "served_refused": served_refused,
        "served_errors": served_errors,
    }
    verdicts["websiteCoverage"] = coverage
    return config, catalog, verdicts, accessories


def dark_form_acceptable(state: str, verdicts: dict) -> bool:
    """What the harness requires of a state's dark form before serving it."""
    if state == "demo":
        # The demo contract is valid AND the production validators refuse
        # the demo data (it carries no approval and no current verification).
        return bool(verdicts.get("demo_ok")) and bool(verdicts.get("production_refuses"))
    if state == "review":
        # Real evidence on its own stamps: an aged price is refused by name
        # and simply does not render. Any OTHER refusal stops the build.
        return verdicts["financing_ok"] and (verdicts["dark_ok"] or verdicts["dark_stale_named"])
    if state == "stale":
        return verdicts["financing_ok"] and verdicts["dark_stale_named"]
    if state == "unavailable":
        return verdicts["financing_ok"] and verdicts["dark_currency_named"]
    return verdicts["financing_ok"] and verdicts["dark_ok"]


def make_handler(config_bytes: bytes, catalog_bytes: bytes, accessories_bytes: bytes = None,
                 device: dict = None, page: bytes = None):
    """`device` (device mode only) = {"allowed_hosts": bytes, "page": bytes}:
    the in-memory allowlist and the banner-bearing page. None (the default,
    loopback mode) intercepts nothing but the three data documents."""
    class PreviewHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=REPO, **kwargs)

        def _target(self):
            path = self.path.split("?", 1)[0].split("#", 1)[0]
            if path == INTERCEPT_CONFIG:
                return config_bytes, "application/json; charset=utf-8"
            if path == INTERCEPT_CATALOG:
                return catalog_bytes, "application/json; charset=utf-8"
            if path == INTERCEPT_ACCESSORIES and accessories_bytes is not None:
                return accessories_bytes, "application/json; charset=utf-8"
            if device is None and page is not None and path in INTERCEPT_PAGE:
                # loopback demo only: the page with its operator area
                return page, "text/html; charset=utf-8"
            if device is not None:
                if path == INTERCEPT_ALLOWED_HOSTS:
                    return device["allowed_hosts"], "text/javascript; charset=utf-8"
                if path in INTERCEPT_PAGE:
                    return device["page"], "text/html; charset=utf-8"
                if path == "/robots.txt":
                    return ROBOTS_TXT, "text/plain; charset=utf-8"
            return None

        def _path(self):
            return self.path.split("?", 1)[0].split("#", 1)[0]

        def _device_refuses(self):
            # Device mode: the request path is decoded and canonicalised ONCE;
            # the result is what is authorised and (below) what is served.
            # Everything outside the app's own paths is 404.
            if device is None:
                return False
            canon = device_canonical_path(self.path)
            if canon is None:
                self.send_error(404, "Not served in device rehearsal mode")
                return True
            self._df_canonical = canon
            return False

        def translate_path(self, path):
            # Device mode serves EXACTLY the path that was authorised: the
            # canonical decoded segments joined under the repository root,
            # never the stdlib's own second decoding of self.path. (The
            # canonical grammar already excludes traversal; this keeps the
            # two semantics one and the same.) Loopback mode is unchanged.
            if device is None:
                return super().translate_path(path)
            canon = getattr(self, "_df_canonical", None)
            if not canon or canon == "/":
                return os.path.join(REPO, "index.html")
            return os.path.join(REPO, *canon.split("/")[1:])

        def list_directory(self, path):
            # Never an autoindex in device mode; the loopback default keeps
            # the stdlib behaviour.
            if device is not None:
                self.send_error(404, "Not served in device rehearsal mode")
                return None
            return super().list_directory(path)

        def _send_headers(self, body, content_type):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            if device is not None:
                self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")
            self.end_headers()

        def end_headers(self):
            # Device mode: every response, disk-served ones included, is
            # marked no-store / noindex so nothing lingers on the device or in
            # an index. Loopback mode adds nothing.
            if device is not None and not getattr(self, "_df_marked", False):
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Robots-Tag", "noindex, nofollow, noarchive")
            super().end_headers()

        def do_GET(self):
            hit = self._target()
            if hit is not None:
                body, ctype = hit
                self._df_marked = True
                self._send_headers(body, ctype)
                self.wfile.write(body)
                return
            if self._device_refuses():
                return
            super().do_GET()

        def do_HEAD(self):
            hit = self._target()
            if hit is not None:
                body, ctype = hit
                self._df_marked = True
                self._send_headers(body, ctype)
                return
            if self._device_refuses():
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
    parser.add_argument("--capture-dir", default=None, metavar="DIR",
                        help="website/review states only: read snapshot.json + mapping.json from DIR "
                             "(e.g. a dated partial capture) instead of demo/price-snapshot/. Every "
                             "record keeps its own observation stamp; nothing is merged or re-dated.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--bind", default=None,
                        help="loopback address only (default 127.0.0.1)")
    parser.add_argument("--device", default=None, metavar="PRIVATE_IPV4",
                        help="device rehearsal: bind ONE RFC 1918 IPv4 address of this machine so a "
                             "mounted iPad on the same private network can walk the drill state "
                             "(non-shipping banner, in-memory allowlist, nothing can send)")
    args = parser.parse_args(argv)

    if args.device is not None and args.bind is not None:
        print("REFUSED: --device and --bind are separate modes; give one of them.")
        return 2
    device = None
    if args.device is not None:
        why = device_address_verdict(args.device)
        if why:
            print(f"REFUSED: {why}. The device rehearsal binds only an RFC 1918 IPv4 address "
                  f"this machine owns (10/8, 172.16/12, 192.168/16).")
            return 2
        bind = args.device.strip()
    else:
        bind = args.bind if args.bind is not None else "127.0.0.1"
        if not _loopback(bind):
            print(f"REFUSED: {bind!r} is not a loopback address. This harness "
                  f"exists only for local, non-shipping verification and never binds publicly "
                  f"(a mounted-device rehearsal uses --device with a private address).")
            return 2

    if args.capture_dir is not None:
        if args.state not in ("website", "review"):
            print("REFUSED: --capture-dir applies only to the website and review states.")
            return 2
        global SNAPSHOT, MAPPING
        SNAPSHOT = os.path.join(args.capture_dir, "snapshot.json")
        MAPPING = os.path.join(args.capture_dir, "mapping.json")
        if not (os.path.exists(SNAPSHOT) and os.path.exists(MAPPING)):
            print(f"REFUSED: {args.capture_dir} must hold snapshot.json and mapping.json.")
            return 2
    start = datetime.now(timezone.utc).astimezone()
    config, catalog, verdicts, accessories = build_injected(args.state, start)
    operator = None
    if args.state == "demo":
        cov = verdicts.get("websiteCoverage") or {}
        operator = {"historical": len(cov.get("historical", [])), "illustrative": len(cov.get("illustrative", [])),
                    "plans": sum(1 for p in config["financing"]["plans"] if p.get("demo") is True),
                    "contextNonce": config["illustrativeDemo"]["contextNonce"],
                    "assembledAt": config["illustrativeDemo"]["assembledAt"]}
    if not dark_form_acceptable(args.state, verdicts):
        print("REFUSED: the drill state's dark form does not validate as its state requires:")
        for e in verdicts.get("demo_errors", []) + verdicts["financing_errors"] + verdicts["dark_errors"]:
            print("  -", e)
        return 3
    if args.state != "dark" and not verdicts["served_refused"]:
        print("REFUSED: the opened form validated clean — the harness would be serving "
              "something the operating-state lock should refuse; stopping.")
        return 3

    if args.device is not None:
        if config.get("gasUrl"):
            print("REFUSED: the served store-config carries a non-blank gasUrl; the device "
                  "rehearsal serves only a configuration that cannot send.")
            return 3
        device = device_bundle(bind, args.state, operator)
    try:
        server = ThreadingHTTPServer((bind, args.port),
                                     make_handler(encode(config), encode(catalog), encode(accessories), device,
                                                  rehearsal_page("demo", bind, operator)
                                                  if (args.state == "demo" and device is None) else None))
    except OSError as exc:
        print(f"REFUSED: cannot bind {bind}:{args.port} ({exc}). A device rehearsal address must be "
              f"one this machine owns.")
        return 2
    url = f"http://{bind}:{args.port}/"
    print("=" * 72)
    print(f"PHASE 2.2 PRICING PREVIEW HARNESS — NON-SHIPPING — state: {args.state}")
    if args.state == "review":
        print("LAUNCH-REVIEW BUILD. Prices: actual lacks.com extraction, PENDING owner")
        print("verification. Financing: the canonical source on its own stamps, exact terms")
        print("and the governed payment calculation switched on IN MEMORY ONLY. Not")
        print("authorized for showroom use; business, legal and native review pending.")
        rf = review_financing()
        print(f"  financing verifiedAt {rf.get('verifiedAt')} (maxAgeDays {rf.get('maxAgeDays')}): "
              + ("FRESH - payment figures can render" if review_financing_fresh(rf, start)
                 else "STALE - every term and payment reads 'To confirm'"))
        cov = verdicts.get("websiteCoverage") or {}
        print(f"  price capture: {os.path.dirname(SNAPSHOT)}")
        if verdicts.get("dark_stale_named"):
            print("  website prices: STALE (older than maxAgeDays) - no price, subtotal or payment renders")
    elif args.state == "demo":
        print("PAYMENT DEMO (owner demo-first direction 2026-10-05). Prices: historical lacks.com")
        print("product pages observed 2026-10-03 plus ILLUSTRATIVE fills (marked with a diamond). Payments:")
        print("EXAMPLE plans (unverified) on the governed payment arithmetic - not a Lacks or lender offer. Not for")
        print("showroom use; nothing is sent or saved. Open 'Operator' (top-left) to load a scenario.")
    elif args.state == "payments":
        print("Every price shown is a FIXTURE placeholder; the payment figures are computed")
        print("from FIXTURE prices with the published factor. NOT a Lacks price or approval.")
    else:
        print("Every price shown is a FIXTURE placeholder. NOT a Lacks price, approval,")
        print("clearance or verification. Committed files are never modified.")
    print("=" * 72)
    print(f"  URL:            {url}")
    if args.device is not None:
        print("  DEVICE REHEARSAL: open that URL in a Safari TAB on an iPad on the same private")
        print("  network. " + ("The page carries an 'Operator' tab (no demo notice); "
                            if args.state == "demo" else "The page carries a NON-SHIPPING banner; ")
              + "the domain-lock allowlist")
        print("  is served in memory for this address only; gasUrl is blank (nothing sends);")
        print("  only the app's own paths are served (no docs/, incoming/, tools/, .git, listings).")
        print("  Anyone on this network can open it while the server runs: use a phone hotspot")
        print("  or an isolated access point, and stop it when done. The idle window cannot be")
        print("  shortened off loopback, so the wipe rehearsal takes the full policy window.")
    if args.state != "demo":
        print(f"  Answer the quiz with mattress size = {DRILL_SIZE}; other sizes resolve nothing.")
    print("  exactPromotionsEnabled " + ("is TRUE in memory (payment states)" if args.state in PAYMENT_STATES
          else "stays false") + "; gasUrl stays blank (preview email only).")
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
