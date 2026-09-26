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
    validators with the shifted clock (validate_financing, validate_pricing)
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
    approval, clearance or verification.

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
    page, appended before </body> in memory);
  * fixture data only: every price is the FIXTURE placeholder and says so in
    the assumptions and disclosures beside it; the banner repeats it;
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
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402

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
          "disabled", "website")
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


def device_bundle(addr: str, state: str) -> dict:
    """The in-memory documents a device rehearsal serves, or ValueError: the
    constructor-level gate (a test cannot build a device server for an
    address the verdict refuses), mirroring the delivery harness."""
    why = device_address_verdict(addr)
    if why:
        raise ValueError(why)
    if state not in STATES:
        raise ValueError(f"unknown state {state!r}")
    a = addr.strip()
    return {"address": a, "allowed_hosts": allowed_hosts_js(a), "page": rehearsal_page(state, a)}


def rehearsal_page(state: str, addr: str) -> bytes:
    """index.html from disk with the NON-SHIPPING banner appended before the
    page's own </body> (the last one — the domain lock's inline error page
    carries another). Device mode only; loopback mode serves the file."""
    with open(os.path.join(REPO, "index.html"), "rb") as f:
        raw = f.read()
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


def build_website(start):
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
    if not (os.path.exists(SNAPSHOT) and os.path.exists(MAPPING)):
        raise SystemExit(
            "the website drill needs demo/price-snapshot/{snapshot,mapping}.json\n"
            "  run: python tools/fetch_lacks_prices.py && python tools/map_app_to_website.py")
    snap = _load(SNAPSHOT)
    mapping = _load(MAPPING)
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
        if ev.get("type") != "product-page":
            return False, "evidence-is-not-a-product-page"
        url = ev.get("url") or ""
        host = urllib.parse.urlparse(url).hostname or ""
        if host.lower() not in ALLOWED_HOSTS:
            return False, f"source-host-not-allowlisted:{host}"
        if v.get("exceptions"):
            return False, "carries-exceptions:" + ",".join(v["exceptions"][:2])
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
        got = {}
        for size, d in (row.get("variants") or {}).items():
            v = by_sku.get(d.get("sku"))
            ok, why = admissible(v)
            if not ok:
                coverage["accessoriesRejected"].append(
                    {"appId": appid, "size": size, "sku": d.get("sku"), "reason": why})
                continue
            got[size] = v
        if not got:
            continue
        for size, v in got.items():
            products.append({"kind": "accessory", "appId": appid, "size": None, "variant": v})
            # a size-independent accessory files under the customer's size key
            # only when it actually has one; otherwise every size maps to it
            accessory_skus.setdefault(appid, {})[size] = v["sku"]
        coverage["accessories"].append(
            {"appId": appid, "sizes": sorted(got), "familyKey": row.get("familyKey")})
    return products, mattress_skus, accessory_skus, coverage


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

    # ---- catalog: skus injected in memory ----------------------------------
    catalog = copy.deepcopy(cat)
    accessories = _load(os.path.join(REPO, "data", "accessories.json"))
    coverage = None

    if state == "website":
        # ACTUAL extracted prices, for the subset with sufficient evidence.
        # Everything else is left with NO price - never a fixture stand-in.
        wp, m_skus, a_skus, coverage = build_website(start)
        # Each entry keeps ITS OWN observation instant: the capture can span
        # several minutes and, once a cache is replayed weeks later, several
        # weeks. One shared "now" would quietly refresh every price.
        def _observed(v):
            raw = v.get("observedAt")
            try:
                inst = _parse(raw)
            except Exception:
                inst = start - timedelta(hours=1)
            # never let a host clock difference read as a future observation
            if inst > start - timedelta(minutes=5):
                inst = start - timedelta(minutes=5)
            return inst.isoformat()

        template = dark["products"][0]
        entries = []
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
            if got:
                # one sku per size; a size with no website variant resolves
                # nothing, which is the point
                a["accessorySkus"] = dict(got)
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
        # The unavailable drill's dark form is refused for exactly its currency.
        "dark_currency_named": (not dark_rep.ok) and all("currency" in e for e in dark_rep.errors),
        "served_refused": not served_rep.ok,
        "served_errors": list(served_rep.errors),
    }
    verdicts["websiteCoverage"] = coverage
    return config, catalog, verdicts, accessories


def dark_form_acceptable(state: str, verdicts: dict) -> bool:
    """What the harness requires of a state's dark form before serving it."""
    if state == "stale":
        return verdicts["financing_ok"] and verdicts["dark_stale_named"]
    if state == "unavailable":
        return verdicts["financing_ok"] and verdicts["dark_currency_named"]
    return verdicts["financing_ok"] and verdicts["dark_ok"]


def make_handler(config_bytes: bytes, catalog_bytes: bytes, accessories_bytes: bytes = None,
                 device: dict = None):
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

    start = datetime.now(timezone.utc).astimezone()
    config, catalog, verdicts, accessories = build_injected(args.state, start)
    if not dark_form_acceptable(args.state, verdicts):
        print("REFUSED: the drill state's dark form does not validate as its state requires:")
        for e in verdicts["financing_errors"] + verdicts["dark_errors"]:
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
        device = device_bundle(bind, args.state)
    try:
        server = ThreadingHTTPServer((bind, args.port),
                                     make_handler(encode(config), encode(catalog), encode(accessories), device))
    except OSError as exc:
        print(f"REFUSED: cannot bind {bind}:{args.port} ({exc}). A device rehearsal address must be "
              f"one this machine owns.")
        return 2
    url = f"http://{bind}:{args.port}/"
    print("=" * 72)
    print(f"PHASE 2.2 PRICING PREVIEW HARNESS — NON-SHIPPING — state: {args.state}")
    print("Every price shown is a FIXTURE placeholder. NOT a Lacks price, approval,")
    print("clearance or verification. Committed files are never modified.")
    print("=" * 72)
    print(f"  URL:            {url}")
    if args.device is not None:
        print("  DEVICE REHEARSAL: open that URL in a Safari TAB on an iPad on the same private")
        print("  network. The page carries a NON-SHIPPING banner; the domain-lock allowlist")
        print("  is served in memory for this address only; gasUrl is blank (nothing sends);")
        print("  only the app's own paths are served (no docs/, incoming/, tools/, .git, listings).")
        print("  Anyone on this network can open it while the server runs: use a phone hotspot")
        print("  or an isolated access point, and stop it when done. The idle window cannot be")
        print("  shortened off loopback, so the wipe rehearsal takes the full policy window.")
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
