#!/usr/bin/env python3
"""Phase 2.2c pricing harness check — the staging / live-like verification path.

Executes the REAL tools/serve_pricing_preview.py machinery — the drill-state
builder and the request handler — against a live loopback server on an
ephemeral port, then drives the real application through headless Chromium
over that server for every drill state, in both languages and both tablet
orientations. It proves:

  * every drill state's DARK form validates clean under the production
    validators with the shifted clock, and every OPENED form is REFUSED by
    validate_pricing (displayEnabled true) — a served document can never
    ship; exactPromotionsEnabled stays false in every state;
  * the injected catalog carries a queen SKU for every shipped mattress, and
    every pricing entry names a catalog id with a matching SKU;
  * the loopback-only bind policy, the two narrow interceptions (query
    strings included), the no-store cache policy, every other path served
    from disk unchanged, and a full build/serve/exercise/stop cycle leaving
    every committed file byte-identical;
  * RENDERED, on the real page: with the SHIPPED configuration (no harness),
    no price surface exists anywhere on the walk (drawer, Results cards,
    Sleep System anchor, Consultation Summary hero, Sleep Plan finalist);
    in state `dark` likewise; in `available` every surface shows the
    FIXTURE amount with the FIXTURE assumption and disclosure beside it, in
    EN and ES; in `stale` and `unapproved` every surface is OFF — inert, no
    copy, no number (the Codex-restored contract of 2026-09-09); in
    `unavailable` (fresh and eligible, every price in currency XXX, which
    the runtime money admission refuses) every surface shows only the
    governed unavailable copy and no number; in `disabled` (emergency off)
    every surface is gone again. No page errors on any walk;
  * every rendered page's wall clock is FROZEN to START (Playwright's clock,
    Date only - timers and animation frames keep running), so the runtime's
    freshness judgement meets the shifted fixture stamps at the instant they
    were shifted to, whatever today's date is; a negative control proves that
    an unfrozen, post-expiry clock loses every governed surface (the
    post-merge CI failure of 2026-09-15, run 35027281265);
  * every rendered page waits, bounded, for the APP'S OWN readiness
    (appStartReady() plus the accessory hydration the Sleep System render
    depends on) before its walk begins - #startBtn is static markup and
    "network idle" can fire before the boot fetches are applied - and every
    walk asserts it inspected the Sleep System price surface only with the
    featured card rendered; readiness controls reproduce the old gap
    (the repaired-tree 362/1 "shipped tablet-portrait en" failure) and prove
    the assertions detect it, and that a failed accessory load is reported
    by name.

Requires the `playwright` package with Chromium installed for the rendered
pass (`python -m pip install playwright && python -m playwright install
chromium`); without it the rendered section is reported as NOT RUN and the
check fails, exactly like tests/sleep_plan_layout_check.py.

Run: python tests/pricing_harness_check.py
"""

import copy
import hashlib
import ipaddress
import json
import os
import re
import socket
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as srv  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))


def sha(path):
    with open(os.path.join(REPO, path), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


WATCHED = ["data/store-config.json", "data/mattresses.json", "data/mattresses.csv",
           "incoming/Lacks_Store_Data.xlsx", "incoming/lacks_pricing.json",
           "tests/fixtures/pricing_populated_fixture.json", "index.html",
           "data/allowed-hosts.js", "manifest.json"]
before = {p: sha(p) for p in WATCHED}

with open(os.path.join(REPO, "data", "store-config.json"), encoding="utf-8") as f:
    PROD = json.load(f)
with open(os.path.join(REPO, "data", "mattresses.json"), encoding="utf-8") as f:
    CATALOG = json.load(f)
with open(srv.FIXTURE, encoding="utf-8") as f:
    FX = json.load(f)
ALL_IDS = [m["id"] for tier in srv.TIER_ORDER for m in CATALOG.get(tier, [])]
with open(os.path.join(REPO, "data", "accessories.json"), encoding="utf-8") as f:
    ACCESSORIES = json.load(f)
ACC_IDS = [a["id"] for a in ACCESSORIES]
START = datetime(2026, 9, 9, 12, 0, 0, tzinfo=timezone(timedelta(hours=-5)))
# The rendered pass freezes every page's wall clock to START (see open_page).
# build_injected shifts every fixture stamp to sit an hour behind START, and the
# runtime judges freshness (evidence verifiedAt + maxAgeDays) through the page's
# own Date.now(); left to Chromium's REAL clock, the available state's evidence
# aged past maxAgeDays at 2026-09-15T19:00Z and post-merge CI run 35027281265
# lost every governed surface on an unchanged tree (291 passed / 33 failed).
# Frozen, every walk is judged at the instant the stamps were shifted to,
# whatever today's date is. Playwright's clock.set_fixed_time freezes Date only:
# timers, intervals, animation frames and the walk's awaited delays keep running.
FROZEN_MS = int(START.timestamp() * 1000)

# ---- app readiness -------------------------------------------------------------
# The rendered walks used to begin on "network idle + #startBtn present", but
# #startBtn is static markup and the app boots asynchronously behind it: four
# data fetches, each APPLIED as it lands (accessories last in source order and
# non-core), then the dictionary, then the appliers (appStartReady()). Under
# load that signal fires early - measured on 2026-09-15: at 20x CPU throttling
# 7 of 8 walks began with appStartReady() false - and a walk that reaches
# showAccessories() before data/accessories.json has been applied renders the
# Sleep System's EMPTY state: no featured card, legacy=0 governed=0, which is
# the repaired-tree 362/1 "shipped tablet-portrait en" failure. Every page now
# waits, bounded, for the app's own readiness AND the accessory hydration the
# Sleep System render depends on, and reports the app's state if it never
# arrives. The bound sits above the app's own 12 s data deadline so a failed
# load reports itself (console warning) before the wait gives up.
APP_READY_JS = ("() => typeof appStartReady === 'function' && appStartReady() === true"
                " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
CORE_READY_JS = "() => typeof coreDataReady === 'function' && coreDataReady() === true"
APP_READY_DIAG_JS = ("() => ({ ready: (typeof appStartReady === 'function') ? appStartReady() : 'absent',"
                     " loaded: (typeof _dataLoaded === 'object') ? Object.assign({}, _dataLoaded) : 'absent',"
                     " accessories: (typeof ACCESSORIES !== 'undefined' && Array.isArray(ACCESSORIES)) ? ACCESSORIES.length : 'absent',"
                     " readyState: document.readyState, startBtn: !!document.getElementById('startBtn') })")
APP_READY_TIMEOUT_MS = 15000

# ---- drill states -------------------------------------------------------------
print("Drill states:")
built = {}
for state in srv.STATES:
    cfg, cat, v, acc = srv.build_injected(state, START)
    built[state] = (cfg, cat, v, acc)
    mattress_entries = [e for e in cfg["pricing"]["products"] if e["productKind"] == "mattress"]
    accessory_entries = [e for e in cfg["pricing"]["products"] if e["productKind"] == "accessory"]
    FIXTURE_DRILL = state != "website"
    check(f"{state}: one FIXTURE price per shipped accessory (productKind accessory, no size), SKUs matching the injected accessory catalog",
          True if not FIXTURE_DRILL else
          [e["productId"] for e in accessory_entries] == ACC_IDS
          and all(e["size"] is None and e["sku"] == srv.fixture_sku(e["productId"])
                  and e["clearance"]["scope"]["productKind"] == "accessory" and e["clearance"]["scope"]["size"] is None
                  and e["clearance"]["scope"]["sku"] == e["sku"] for e in accessory_entries)
          and [a["id"] for a in acc] == ACC_IDS and all(a["sku"] == srv.fixture_sku(a["id"]) for a in acc))
    check(f"{state}: the injected accessory catalog differs from production ONLY by the sku",
          True if not FIXTURE_DRILL else
          (all({k: v_ for k, v_ in a.items() if k != "sku"} == p for a, p in zip(acc, ACCESSORIES))
           and all("sku" not in p for p in ACCESSORIES)))
    check(f"{state}: financing validates clean (stamps shifted, exact-term output OFF)",
          v["financing_ok"] and cfg["financing"]["exactPromotionsEnabled"] is False,
          "; ".join(v["financing_errors"][:2]))
    if state == "stale":
        check("stale: the DARK form is REFUSED at build time naming the aged evidence (the build-gate half of the rule)",
              v["dark_stale_named"] and srv.dark_form_acceptable(state, v), "; ".join(v["dark_errors"][:2]))
    elif state == "unavailable":
        check("unavailable: the DARK form is REFUSED at build time naming the currency (XXX can never ship; the runtime admission is its mirror)",
              v["dark_currency_named"] and srv.dark_form_acceptable(state, v), "; ".join(v["dark_errors"][:2]))
        check("unavailable: pricing.currency and every product price carry XXX",
              cfg["pricing"]["currency"] == srv.UNAVAILABLE_CURRENCY
              and all(e["price"]["currency"] == srv.UNAVAILABLE_CURRENCY for e in cfg["pricing"]["products"]))
    else:
        check(f"{state}: the DARK form validates clean under the shifted clock (no errors, no warnings)",
              v["dark_ok"] and not v["dark_warnings"] and srv.dark_form_acceptable(state, v),
              "; ".join(v["dark_errors"][:2] + v["dark_warnings"][:2]))
    if state == "dark":
        check("dark: served form IS the dark form — displayEnabled false, every surface false",
              cfg["pricing"]["displayEnabled"] is False
              and all(x is False for x in cfg["pricing"]["surfaces"].values()))
    else:
        check(f"{state}: served form is REFUSED by validate_pricing (displayEnabled true can never ship)",
              v["served_refused"] and any("displayEnabled" in e for e in v["served_errors"]),
              "; ".join(v["served_errors"][:2]))
        check(f"{state}: served form has displayEnabled true and every surface true",
              cfg["pricing"]["displayEnabled"] is True
              and all(x is True for x in cfg["pricing"]["surfaces"].values()))
    check(f"{state}: one queen price per shipped mattress, ids and SKUs matching the injected catalog",
          True if not FIXTURE_DRILL else
          [e["productId"] for e in mattress_entries] == ALL_IDS
          and all(e["size"] == "queen" and e["sku"] == srv.fixture_sku(e["productId"])
                  and e["clearance"]["scope"]["sku"] == e["sku"]
                  and e["clearance"]["scope"]["amountMinor"] == e["price"]["amountMinor"]
                  for e in mattress_entries)
          and all(m["skus"] == {"queen": srv.fixture_sku(m["id"])}
                  for tier in srv.TIER_ORDER for m in cat.get(tier, [])))
    check(f"{state}: every attestation, approval and verification string is a FIXTURE placeholder",
          True if not FIXTURE_DRILL else
          all("FIXTURE" in e["evidence"]["verifiedBy"] and "FIXTURE" in e["clearance"]["attestedBy"]
              for e in cfg["pricing"]["products"])
          and all("FIXTURE" in a["by"] for a in cfg["pricing"]["presentation"]["approvals"].values()
                  if a["status"] == "approved"))
    if state == "website":
        import urllib.parse as _up
        hosts = srv._load(os.path.join(srv.REPO, "tools", "source_hosts.json"))["priceSourceHosts"]
        prods = cfg["pricing"]["products"]
        check("website: at least one real extracted price is served",
              len(prods) > 0, f"{len(prods)} products")
        # The PRICES and the CUSTOMER-FACING COPY must carry no fixture
        # placeholder - they are real extracted money and real sentences. The
        # GOVERNANCE approvals must still say they are placeholders, because
        # they are: nobody has approved anything. Conflating the two would
        # either label real prices as fixture data or dress a placeholder
        # approval up as a real one.
        pres = cfg["pricing"]["presentation"]
        customer_facing = json.dumps([cfg["pricing"]["products"], pres["totals"],
                                      pres["states"], pres["assumptions"],
                                      pres["disclosures"]])
        check("website: no FIXTURE placeholder in the prices or the customer-facing copy",
              "FIXTURE" not in customer_facing,
              "a FIXTURE string leaked into website-sourced material")
        approvals = [a["by"] for a in pres["approvals"].values()] + [
            cfg["pricing"]["authority"]["owner"],
            cfg["pricing"]["freshness"]["approvedBy"],
            cfg["pricing"]["sourcePolicy"]["approvedBy"]]
        check("website: every GOVERNANCE approval still declares itself a placeholder",
              all("FIXTURE" in a or "placeholder" in a.lower() for a in approvals if a),
              "; ".join(a for a in approvals if a)[:140])
        check("website: every price cites a real product page on an allowlisted host",
              all(e["evidence"]["sourceUrl"].startswith("https://")
                  and (_up.urlparse(e["evidence"]["sourceUrl"]).hostname or "").lower() in hosts
                  and "/product/" in e["evidence"]["sourceUrl"] for e in prods))
        check("website: every attestation says the verification is PENDING, never claims one",
              all("PENDING OWNER VERIFICATION" in e["evidence"]["verifiedBy"]
                  and "PENDING OWNER VERIFICATION" in e["clearance"]["attestedBy"] for e in prods))
        check("website: the provenance copy names the website and the pending status",
              "Website prices" in cfg["pricing"]["presentation"]["totals"]["provenance"]["en"]
              and "pending verification" in cfg["pricing"]["presentation"]["totals"]["provenance"]["en"])
        check("website: every served sku traces to a catalog record that names it",
              all(any(m.get("skus", {}).get(e["size"]) == e["sku"]
                      for t in srv.TIER_ORDER for m in cat.get(t, []))
                  for e in prods if e["productKind"] == "mattress"))
        check("website: NO accessory carries a fixture sku (a total may never mix sources)",
              all("sku" not in a or not str(a.get("sku", "")).startswith("FIXTURE") for a in acc))
        check("website: every amount is a positive integer in USD minor units",
              all(isinstance(e["price"]["amountMinor"], int)
                  and e["price"]["amountMinor"] > 0
                  and e["price"]["currency"] == "USD" for e in prods))
        cov = v.get("websiteCoverage") or {}
        check("website: the drill reports its own coverage, including what it rejected",
              isinstance(cov.get("mattressSizes"), list)
              and isinstance(cov.get("mattressRejected"), list))

    strip = lambda c: {k: v_ for k, v_ in c.items() if k not in ("pricing", "financing")}
    check(f"{state}: every non-pricing, non-financing key deep-equals production", strip(cfg) == strip(PROD))
    check(f"{state}: catalog differs from production ONLY by the injected skus maps",
          all({k: v_ for k, v_ in m.items() if k != "skus"} == p
              for tier in srv.TIER_ORDER for m, p in zip(cat[tier], CATALOG[tier])))

cfg_stale = built["stale"][0]
cfg_avail = built["available"][0]
check("stale: evidence stamps sit 30 days behind the available state's",
      all(datetime.fromisoformat(a["evidence"]["verifiedAt"]) - datetime.fromisoformat(s["evidence"]["verifiedAt"])
          == timedelta(days=srv.STALE_DAYS)
          for a, s in zip(cfg_avail["pricing"]["products"], cfg_stale["pricing"]["products"])))


def freshness_limit(cfg):
    """The instant the runtime stops treating a served state's evidence as
    fresh: the OLDEST evidence stamp plus that state's maxAgeDays."""
    days = cfg["pricing"]["freshness"]["maxAgeDays"]
    return min(datetime.fromisoformat(e["evidence"]["verifiedAt"]) for e in cfg["pricing"]["products"]) + timedelta(days=days)


AVAILABLE_LIMIT = freshness_limit(cfg_avail)
AVAILABLE_LIMIT_MS = int(AVAILABLE_LIMIT.timestamp() * 1000)
STALE_LIMIT = freshness_limit(cfg_stale)
check("available: judged at the frozen clock START, every evidence stamp is in the past and inside maxAgeDays (fresh by construction, whatever today's date)",
      all(datetime.fromisoformat(e["evidence"]["verifiedAt"]) < START for e in cfg_avail["pricing"]["products"]) and START < AVAILABLE_LIMIT,
      f"START={START.isoformat()} limit={AVAILABLE_LIMIT.isoformat()}")
check("stale: judged at the frozen clock START, every evidence stamp is past maxAgeDays (stale by construction, whatever today's date)",
      STALE_LIMIT < START, f"START={START.isoformat()} limit={STALE_LIMIT.isoformat()}")
check("disabled: enabled false and formulas empty (emergency off)",
      built["disabled"][0]["pricing"]["enabled"] is False and built["disabled"][0]["pricing"]["formulas"] == [])
check("unapproved: legal approval stripped and presentation unapproved",
      built["unapproved"][0]["pricing"]["presentation"]["approvals"]["legal"]["status"] == "unapproved"
      and built["unapproved"][0]["pricing"]["presentation"]["status"] == "unapproved")
try:
    srv.build_injected("dark", datetime(2026, 9, 9))
    check("a naive start instant is refused (raises)", False)
except ValueError:
    check("a naive start instant is refused (raises)", True)
try:
    srv.build_injected("bogus", START)
    check("an unknown state is refused (raises)", False)
except ValueError:
    check("an unknown state is refused (raises)", True)

# ---- bind policy --------------------------------------------------------------
print("Bind policy:")
check("public bind attempt is refused (0.0.0.0)", srv.main(["--bind", "0.0.0.0", "--port", "0"]) == 2)
check("public bind attempt is refused (192.168.1.10)", srv.main(["--bind", "192.168.1.10", "--port", "0"]) == 2)
check("loopback helper accepts 127.0.0.1, localhost and ::1",
      srv._loopback("127.0.0.1") and srv._loopback("localhost") and srv._loopback("::1"))

# ---- device rehearsal mode (Codex correction 2026-09-09) ----------------------
print("Device rehearsal mode:")
REFUSED = ["0.0.0.0", "127.0.0.1", "::1", "8.8.8.8", "203.0.113.7", "169.254.1.1", "224.0.0.1", "240.0.0.1",
           "2001:db8::1", "fe80::1", "fd00::1", "example.com", "localhost", "192.168.1", "", "10.0.0.1/8"]
check("device address verdict refuses every unspecified, loopback, public, link-local, multicast, reserved, IPv6, hostname and malformed value",
      all(srv.device_address_verdict(a) for a in REFUSED), str([a for a in REFUSED if not srv.device_address_verdict(a)]))
check("device address verdict accepts RFC 1918 IPv4 literals only (10/8, 172.16/12, 192.168/16)",
      all(srv.device_address_verdict(a) == "" for a in ("10.0.0.1", "10.255.255.254", "172.16.0.1", "172.31.255.254", "192.168.0.1", "192.168.255.254"))
      and srv.device_address_verdict("172.32.0.1") and srv.device_address_verdict("100.64.0.1"))
check("--device with a public address is refused by the command line (exit 2)", srv.main(["--device", "8.8.8.8", "--port", "0"]) == 2)
check("--device 0.0.0.0 is refused (exit 2)", srv.main(["--device", "0.0.0.0", "--port", "0"]) == 2)
check("--device with an IPv6 address is refused (exit 2)", srv.main(["--device", "fd00::1", "--port", "0"]) == 2)
check("--device with a hostname is refused (exit 2)", srv.main(["--device", "localhost", "--port", "0"]) == 2)
check("--device and --bind together are refused (exit 2)", srv.main(["--device", "10.0.0.1", "--bind", "127.0.0.1", "--port", "0"]) == 2)
check("--device with a private address this machine does not own is refused at the bind (exit 2)",
      srv.main(["--device", "192.168.250.250", "--port", "0"]) == 2)
_real_load = srv._load


def _live_committed(path):
    doc = _real_load(path)
    if path.endswith("store-config.json"):
        doc = dict(doc, gasUrl="https://script.google.com/macros/s/EXAMPLE/exec")
    return doc


srv._load = _live_committed
try:
    check("--device refuses to serve a store-config whose gasUrl is live (exit 3, before any bind)",
          srv.main(["--device", "10.0.0.1", "--port", "0"]) == 3)
finally:
    srv._load = _real_load
check("the in-memory allowlist names exactly the device address",
      srv.allowed_hosts_js("192.168.1.20") == b'window.__DF_ALLOWED_HOSTS = ["192.168.1.20"];\n')
check("0.0.0.0 is refused by its own rule (every interface), not merely by RFC 1918 membership",
      "every interface" in srv.device_address_verdict("0.0.0.0"))
try:
    srv.device_bundle("8.8.8.8", "available")
    check("device_bundle refuses a public address at construction (a test cannot build an unsafe device server)", False)
except ValueError:
    check("device_bundle refuses a public address at construction (a test cannot build an unsafe device server)", True)
try:
    srv.device_bundle("10.0.0.1", "bogus")
    check("device_bundle refuses an unknown state", False)
except ValueError:
    check("device_bundle refuses an unknown state", True)
HOSTILE_PATHS = ['/data/%2e%2e/CLAUDE.md', '/data/%2E%2E/tools/serve_pricing_preview.py', '/data/%2e%2e/%2egit/HEAD', '/data/../CLAUDE.md', '/data/..%2fCLAUDE.md', '/data/%2fCLAUDE.md', '/data/%5c..%5cCLAUDE.md', '/data/..\\\\CLAUDE.md', '/data/%252e%252e/CLAUDE.md', '/data/%c0%ae%c0%ae/CLAUDE.md', '/data/quiz.json%00', '/data//quiz.json', '/data/./quiz.json', '/images/../CLAUDE.md', '/%2e%2e/CLAUDE.md', '/data/%zz/quiz.json', '/data/%2e/quiz.json', '/data/.quiz.json', '/data/quiz.json/', '/data', '/images', '/DATA/../CLAUDE.md', '/incoming/lacks_financing.json', '/tools/serve_pricing_preview.py', '/.git/HEAD', '/manifest.json/../CLAUDE.md']
check("device_canonical_path refuses every traversal, encoded-separator, double-encoded, overlong, NUL, dot-segment, dotfile, directory and out-of-app path",
      all(srv.device_canonical_path(p) is None for p in HOSTILE_PATHS), str([p for p in HOSTILE_PATHS if srv.device_canonical_path(p) is not None]))
check("device_canonical_path admits the app's own paths once decoded (spaces in legacy image names included) and drops query and fragment",
      srv.device_canonical_path("/") == "/" and srv.device_canonical_path("/index.html") == "/index.html"
      and srv.device_canonical_path("/manifest.json") == "/manifest.json" and srv.device_canonical_path("/robots.txt") == "/robots.txt"
      and srv.device_canonical_path("/data/quiz.json?nocache=1") == "/data/quiz.json"
      and srv.device_canonical_path("/images/mattresses/copper%20cushion%20firm.jpg#x") == "/images/mattresses/copper cushion firm.jpg"
      and srv.device_canonical_path("/data/store-config.json") == "/data/store-config.json")
check("the device path allowlist admits only the app: /, /index.html, /manifest.json, /robots.txt, files under /data/ and /images/",
      all(srv.device_path_allowed(p) for p in ("/", "/index.html", "/manifest.json", "/robots.txt", "/data/quiz.json", "/data/store-config.json", "/images/mattresses/x.jpg"))
      and not any(srv.device_path_allowed(p) for p in ("/docs/", "/docs/rebuild-roadmap.md", "/tools/serve_pricing_preview.py", "/incoming/lacks_financing.json",
                                                        "/tests/fixtures/pricing_populated_fixture.json", "/.git", "/.git/config", "/data/", "/images/",
                                                        "/README.md", "/CLAUDE.md", "/Code.gs", "/demo/black-friday/index.html")))
check("a query string or fragment on a permitted path is dropped, never smuggled (the path served is the canonical one)",
      srv.device_canonical_path("/data/quiz.json?x=../CLAUDE.md#../") == "/data/quiz.json")
_page = srv.rehearsal_page("stale", "192.168.1.20")
with open(os.path.join(REPO, "index.html"), "rb") as _f:
    _disk = _f.read()
check("the rehearsal page is index.html plus ONE banner before the page's own </body> (the domain lock's inline </body> untouched)",
      _page.count(b'id="' + srv.BANNER_ID.encode() + b'"') == 1 and _page.count(b"</body>") == _disk.count(b"</body>")
      and _page.rpartition(b"</body>")[0].endswith(b"</div>\n") and _page.index(b'id="' + srv.BANNER_ID.encode() + b'"') > _page.index(b"Unauthorized domain")
      and _page.replace(_page[_page.index(b'<div id="' + srv.BANNER_ID.encode()):_page.rpartition(b"</body>")[0].__len__()], b"") == _disk)
check("the banner names the state, the address, FIXTURE and non-shipping, and that nothing is sent",
      all(s in _page for s in (b"state: stale", b"192.168.1.20", b"FIXTURE PRICES ONLY", b"NON-SHIPPING REHEARSAL", b"nothing is sent")))


def private_ipv4_of_this_host():
    seen = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            a = info[4][0]
            ip = ipaddress.ip_address(a)
            if ip.is_private and not ip.is_loopback and not ip.is_link_local and a not in seen:
                seen.append(a)
    except OSError:
        pass
    return seen[0] if seen else None


DEVICE_IP = private_ipv4_of_this_host()
# A real private-address bind is exercised when this host has one; the
# rendered proof below never depends on it (host-resolver-rules maps a name
# onto loopback), so CI is not gated on network topology.
print(f"  [note] private IPv4 of this host for the real-bind walk: {DEVICE_IP or 'none (real-bind checks skipped, name-mapped checks still run)'}")


def serve_device(state, addr, bind=None):
    """A device-mode server. `bind` defaults to `addr`; the name-mapped rendered
    proof binds loopback while the served allowlist names `addr`."""
    cfg, cat, _, acc = built[state]
    device = srv.device_bundle(addr, state) if bind is None else \
        {"address": addr, "allowed_hosts": srv.allowed_hosts_js(addr), "page": srv.rehearsal_page(state, addr)}
    server = ThreadingHTTPServer((bind or addr, 0), srv.make_handler(srv.encode(cfg), srv.encode(cat), srv.encode(acc), device))
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


# Device-mode documents and the path allowlist, over a loopback-bound device
# server (topology-independent); the served allowlist names the test address.
TEST_ADDR = "192.168.77.20"
dsrv, dport = serve_device("available", TEST_ADDR, bind="127.0.0.1")
dbase = f"http://127.0.0.1:{dport}"
try:
    def dget(path, method="GET"):
        req = urllib.request.Request(dbase + path, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()
    st, hd, body = dget("/data/allowed-hosts.js")
    check("device: /data/allowed-hosts.js is served in memory naming the device address only, JavaScript, no-store, noindex",
          st == 200 and body == srv.allowed_hosts_js(TEST_ADDR) and hd.get("Cache-Control") == "no-store"
          and "noindex" in hd.get("X-Robots-Tag", "") and hd.get("Content-Type", "").startswith("text/javascript"))
    st, hd, body = dget("/")
    check("device: / is the banner-bearing page (HTML, no-store, noindex)",
          st == 200 and body == srv.rehearsal_page("available", TEST_ADDR) and hd.get("Content-Type", "").startswith("text/html")
          and hd.get("Cache-Control") == "no-store" and "noindex" in hd.get("X-Robots-Tag", ""))
    st, _, body = dget("/index.html")
    check("device: /index.html is the same banner-bearing page", st == 200 and body == srv.rehearsal_page("available", TEST_ADDR))
    st, hd, body = dget("/robots.txt")
    check("device: /robots.txt is served from memory and disallows everything (asserted against the literal, not the harness's own constant)",
          st == 200 and body == b"User-agent: *" + bytes([10]) + b"Disallow: /" + bytes([10]) and hd.get("Cache-Control") == "no-store")
    st, hd, body = dget("/data/quiz.json")
    with open(os.path.join(REPO, "data", "quiz.json"), "rb") as f:
        check("device: a disk-served data document is byte-equal to disk and still marked no-store / noindex",
              st == 200 and body == f.read() and hd.get("Cache-Control") == "no-store" and "noindex" in hd.get("X-Robots-Tag", ""))
    st, _, body = dget("/data/store-config.json")
    check("device: the served store-config keeps the committed blank gasUrl and the production allowedHosts (nothing can send; the config is not widened)",
          st == 200 and json.loads(body.decode("utf-8")).get("gasUrl") == "" and json.loads(body.decode("utf-8")).get("allowedHosts") == PROD.get("allowedHosts"))
    st, hd, _ = dget("/", method="HEAD")
    check("device: HEAD on the page carries the same headers", st == 200 and hd.get("Cache-Control") == "no-store")
    exposed = {}
    for p in ("/tools/serve_pricing_preview.py", "/incoming/lacks_financing.json", "/docs/rebuild-roadmap.md",
              "/tests/fixtures/pricing_populated_fixture.json", "/.git", "/.git/HEAD", "/docs/", "/tools/", "/data/", "/images/",
              "/README.md", "/Code.gs", "/demo/black-friday/index.html", "/data/../tools/serve_pricing_preview.py"):
        st, hd, body = dget(p)
        exposed[p] = (st, b"Directory listing" in body or b"<title>Directory listing" in body)
    check("device: the repository is NOT exposed — every path outside the app is 404 and no directory is listed",
          all(st == 404 and not listing for st, listing in exposed.values()), str({p: v for p, v in exposed.items() if v[0] != 404 or v[1]}))
    st, hd, body = dget("/tools/", method="HEAD")
    check("device: HEAD outside the app is 404 too", st == 404)
    # Codex re-review blocker (2026-09-10): percent-encoded traversal. Every
    # hostile spelling is 404 for GET AND HEAD, and no body is repository
    # content; the permitted files still serve byte-equal, decoded once.
    with open(os.path.join(REPO, "CLAUDE.md"), "rb") as f:
        _claude = f.read()
    leaks = {}
    for p in HOSTILE_PATHS:
        for method in ("GET", "HEAD"):
            st, hd, body = dget(p, method=method)
            if st != 404 or (method == "GET" and (body == _claude or b"DreamFinder" in body[:400] and b"Not served" not in body)):
                leaks[method + " " + p] = st
    check("device: every percent-encoded / traversal / separator / double-encoded / overlong / NUL / dot-segment spelling is 404 on GET and HEAD and leaks nothing",
          not leaks, str(leaks))
    permitted = [("data/quiz.json", "/data/quiz.json"), ("manifest.json", "/manifest.json"), ("images/qr-financing.svg", "/images/qr-financing.svg")]
    # A legacy image whose name carries spaces proves the once-decoded path
    # serves; the mutation sweep's sandbox copies only the QR asset from
    # images/, so this leg runs where such a file exists and says so otherwise.
    _spaced = sorted(f for f in (os.listdir(os.path.join(REPO, "images", "mattresses")) if os.path.isdir(os.path.join(REPO, "images", "mattresses")) else []) if " " in f)
    if _spaced:
        permitted.append(("images/mattresses/" + _spaced[0], "/images/mattresses/" + urllib.parse.quote(_spaced[0])))
    else:
        print("  [note] no legacy image with spaces in its name in this tree; the live spaced-name leg is skipped (the unit case still pins the decoding)")
    for rel, url in permitted:
        with open(os.path.join(REPO, rel), "rb") as f:
            disk = f.read()
        st, hd, body = dget(url)
        st2, hd2, _ = dget(url, method="HEAD")
        check(f"device: permitted file {url} still serves byte-equal on GET (and 200 on HEAD) through the canonical path",
              st == 200 and body == disk and st2 == 200 and hd.get("Cache-Control") == "no-store", f"GET {st} HEAD {st2} bytes {len(body)}/{len(disk)}")
    check("the committed allowlist on disk is untouched by the device server",
          open(os.path.join(REPO, "data", "allowed-hosts.js"), "rb").read().count(b"beford782.github.io") == 1
          and TEST_ADDR.encode() not in open(os.path.join(REPO, "data", "allowed-hosts.js"), "rb").read())
finally:
    dsrv.shutdown()
    dsrv.server_close()


if DEVICE_IP:
    dsrv, dport = serve_device("available", DEVICE_IP)
    try:
        with urllib.request.urlopen(f"http://{DEVICE_IP}:{dport}/data/allowed-hosts.js", timeout=10) as resp:
            check(f"real bind: a device server on this host's private address {DEVICE_IP} answers with its own address in the allowlist",
                  resp.status == 200 and resp.read() == srv.allowed_hosts_js(DEVICE_IP))
    finally:
        dsrv.shutdown()
        dsrv.server_close()


# ---- live loopback server -----------------------------------------------------
def serve(state):
    cfg, cat, _, acc = built[state]
    server = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(srv.encode(cfg), srv.encode(cat), srv.encode(acc)))
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


def serve_plain(hold_accessories_ms=0, fail_accessories=False):
    """The SHIPPED page over the stdlib file server. The two keyword arguments
    exist for the readiness controls only: hold the data/accessories.json
    response for a while (the boot gap, made deterministic) or answer it with
    503 (a failed non-core load the app tolerates with an empty list)."""
    import http.server
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=REPO, **k)  # noqa: E731

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=REPO, **k)

        def log_message(self, *_):
            pass

        def do_GET(self):
            if self.path.split("?", 1)[0] == "/data/accessories.json":
                if fail_accessories:
                    self.send_error(503, "accessories withheld by the readiness control")
                    return
                if hold_accessories_ms:
                    time.sleep(hold_accessories_ms / 1000.0)
            super().do_GET()

    class QuietServer(ThreadingHTTPServer):
        # A page closed while a held response is still being written (the
        # ungated readiness control does exactly that) aborts the socket; the
        # stdlib would print a traceback for it. Only connection aborts are
        # swallowed - any other handler error still reports itself.
        def handle_error(self, request, client_address):
            if isinstance(sys.exc_info()[1], (ConnectionAbortedError, ConnectionResetError, BrokenPipeError)):
                return
            super().handle_error(request, client_address)
    server = QuietServer(("127.0.0.1", 0), Quiet)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


print("Live loopback server:")
server, port = serve("available")
base = f"http://127.0.0.1:{port}"


def get(path):
    with urllib.request.urlopen(base + path, timeout=10) as resp:
        return resp.status, dict(resp.headers), resp.read()


try:
    st, hd, body = get("/data/store-config.json?nocache=1")
    served = json.loads(body.decode("utf-8"))
    check("intercepted store-config (query string included): 200, JSON, no-store",
          st == 200 and hd.get("Content-Type", "").startswith("application/json") and hd.get("Cache-Control") == "no-store")
    check("served config is the opened drill state", served["pricing"]["displayEnabled"] is True)
    st2, hd2, body2 = get("/data/mattresses.json")
    cat_served = json.loads(body2.decode("utf-8"))
    check("intercepted catalog: 200, JSON, no-store, skus injected",
          st2 == 200 and hd2.get("Cache-Control") == "no-store"
          and all("skus" in m for tier in srv.TIER_ORDER for m in cat_served.get(tier, [])))
    st5, hd5, body5 = get("/data/accessories.json")
    acc_served = json.loads(body5.decode("utf-8"))
    check("intercepted accessories: 200, JSON, no-store, sku injected on every accessory",
          st5 == 200 and hd5.get("Cache-Control") == "no-store" and all("sku" in a for a in acc_served))
    st3, _, body3 = get("/index.html")
    with open(os.path.join(REPO, "index.html"), "rb") as f:
        check("every other path is served from disk unchanged (index.html byte-equal)", st3 == 200 and body3 == f.read())
    st4, _, body4 = get("/data/quiz.json")
    with open(os.path.join(REPO, "data", "quiz.json"), "rb") as f:
        check("data/quiz.json is not intercepted (byte-equal to disk)", st4 == 200 and body4 == f.read())
    st6, hd6, body6 = get("/data/allowed-hosts.js")
    with open(os.path.join(REPO, "data", "allowed-hosts.js"), "rb") as f:
        check("default (loopback) mode: /data/allowed-hosts.js is served from disk unchanged, no banner, no noindex (the device mode changes nothing here)",
              st6 == 200 and body6 == f.read() and "X-Robots-Tag" not in hd6)
    st7, _, body7 = get("/tools/serve_pricing_preview.py")
    check("default (loopback) mode: the repository is served as before (a tools/ file is reachable on loopback)", st7 == 200 and len(body7) > 0)
    req = urllib.request.Request(base + "/data/store-config.json", method="HEAD")
    with urllib.request.urlopen(req, timeout=10) as resp:
        check("HEAD on the intercepted path carries the same headers", resp.status == 200 and resp.headers.get("Cache-Control") == "no-store")
finally:
    server.shutdown()
    server.server_close()


# ---- rendered pass ------------------------------------------------------------
print("Rendered pass (headless Chromium over the harness):")
WALK_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ANS = { "sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
                "temperature": "hot", "firmness": 5, "partner_sleep": "partner", "partner_disturbance": "sometimes",
                "body_type": "average", "mattress_size": ARGS.size };
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  if (ARGS.lang === 'es') { await switchLanguage('es'); await wait(200); }
  const out = { errors: [], clockAtStart: Date.now() };
  // Readiness as the walk saw it: the app's own boot flag and the accessory
  // hydration the Sleep System render depends on (expect_ready pins both).
  const readiness = () => ({ ready: (typeof appStartReady === 'function') ? appStartReady() : 'absent',
                             accessoriesLoaded: (typeof _dataLoaded === 'object') ? _dataLoaded.accessories === true : 'absent' });
  out.readyAtStart = readiness();
  showProfileScreen();
  window.showResults();
  await wait(150);
  const ids = Object.keys(window._drawerData || {});
  out.ids = ids;
  const first = ids[0];
  // Results cards (the ACTIVE tier only renders: one top pick + its supporting cards)
  out.activeCards = document.querySelectorAll('#resultsScreen .noct-toppick, #resultsScreen .noct-support-card').length;
  out.resultsSlots = document.querySelectorAll('#resultsScreen .noct-card-price').length;
  out.resultsStates = Array.from(document.querySelectorAll('#resultsScreen .noct-card-price')).map((e) => e.getAttribute('data-price-state'));
  out.resultsText = Array.from(document.querySelectorAll('#resultsScreen .noct-card-price')).map((e) => e.textContent).join(' | ');
  out.lang = ARGS.lang;
  // Compare modal (slice 2.2h): the first two Results models side by side.
  // The price row, the same-size difference, the size line and the tier
  // glyphs are read from the DOM the customer would see; then the modal is
  // closed and the selection cleared so the rest of the walk is unchanged.
  out.compare = null;
  if (ids.length >= 2 && typeof window.openCompareModal === 'function') {
    window._compareSelected = [ids[0], ids[1]];
    if (typeof window.updateCompareTray === 'function') window.updateCompareTray();
    window.openCompareModal();
    await wait(150);
    const modal = document.getElementById('compareModal');
    const sz = document.getElementById('compareSizeContext');
    const rowText = (k) => { const r = modal.querySelector('.cmp-row[data-cmp="' + k + '"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; };
    const cells = (k) => Array.from(modal.querySelectorAll('.cmp-row[data-cmp="' + k + '"] .cmp-val')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    out.compare = { shown: !!modal && modal.style.display !== 'none' && modal.classList.contains('visible'),
                    heads: modal.querySelectorAll('.cmp-head').length,
                    tierGlyphs: modal.querySelectorAll('.cmp-head-name .price-tier').length,
                    priceRow: rowText('price'), priceCells: cells('price'),
                    diffRow: rowText('pricediff'), diffCells: cells('pricediff'),
                    sizeHidden: sz ? sz.hidden : 'absent', sizeText: sz ? sz.textContent.trim() : '',
                    dollars: (modal.textContent.match(/\$\s?\d[\d,]*/g) || []).length,
                    perPeriod: (modal.textContent.match(/\/\s*(mo|month|mes)\b/gi) || []).length };
    if (typeof window.closeCompareModal === 'function') window.closeCompareModal();
    if (typeof window.clearCompare === 'function') window.clearCompare();
    await wait(100);
  }
  // Drawer
  window.openMattressDrawer(first, ids);
  await wait(150);
  const box = document.getElementById('drawerPrice');
  out.drawer = { hidden: box.hidden, text: box.textContent, state: box.getAttribute('data-price-state') };
  if (typeof window.closeMattressDrawer === 'function') window.closeMattressDrawer({ immediate: true, restoreFocus: false });
  // Finalist -> Sleep System anchor
  window.chooseFinalist(first);
  window.showAccessories();
  await wait(150);
  const anchor = document.getElementById('sleepSystemAnchor');
  out.anchor = { slots: anchor ? anchor.querySelectorAll('.sleep-system__anchor-price').length : -1,
                 text: anchor ? anchor.textContent : '' };
  // Accessory-price provenance: the featured accessory card on this step —
  // the legacy catalog "From $" line and the governed slot never coexist.
  const ss = document.getElementById('accessoriesScreen');
  // The Sleep System price surface is inspected only here; record what the
  // render had to work with at this exact moment.
  const ws = document.getElementById('sleepSystemWorkspace');
  out.sleepSystemReady = Object.assign(readiness(), {
    workspaceShown: !!ws && !ws.hidden,
    featuredCards: ss ? ss.querySelectorAll('.sleep-system__featured').length : -1 });
  out.featured = { legacy: ss ? ss.querySelectorAll('.sleep-system__price').length : -1,
                   governed: ss ? ss.querySelectorAll('.sleep-system__governed-price').length : -1,
                   governedText: ss ? Array.from(ss.querySelectorAll('.sleep-system__governed-price')).map((e) => e.textContent).join(' | ') : '',
                   legacyText: ss ? Array.from(ss.querySelectorAll('.sleep-system__price')).map((e) => e.textContent).join(' | ') : '' };
  // Consultation Summary hero
  window.showSavedPicks();
  await wait(150);
  const hero = document.getElementById('hf2FinalistHero');
  out.hero = { slots: hero ? hero.querySelectorAll('.hf2-finalist-hero__price').length : -1, text: hero ? hero.textContent : '' };
  // Sleep Plan finalist
  window.showSleepPlan('results');
  await wait(150);
  const plan = document.getElementById('sleepPlanFinalist');
  out.plan = { slots: plan ? plan.querySelectorAll('.hf2-pick__price').length : -1, text: plan ? plan.textContent : '' };
  // Payment Choice sheet opened from the Sleep Plan (slice 2.2d): plan status
  // copy beside the cards — status only, never a currency amount.
  window.openFinancingSheet('sleep-plan');
  await wait(200);
  const cards = document.getElementById('financingSheetCards');
  out.sheet = { statusLines: cards ? cards.querySelectorAll('.fin-offer__price-status').length : -1,
                text: cards ? cards.textContent : '',
                dollars: cards ? (cards.textContent.match(/\$\s?\d/g) || []).length : -1,
                cardCount: cards ? cards.querySelectorAll('.fin-card').length : -1 };
  if (typeof window.closeFinancingSheet === 'function') window.closeFinancingSheet();
  // Whole-document silence probe
  out.anySlot = document.querySelectorAll('[data-price-state]').length;
  // Every screen's text (hidden screens included — textContent, not innerText,
  // and never <script> text, which lives outside the .screen elements). The
  // catalog's own accessory "From $ / Desde $" lines are the one shipped
  // numeric surface and are excluded by the lookbehind.
  const screenText = Array.from(document.querySelectorAll('.screen')).map((s) => s.textContent).join(' \n ');
  out.dollarDigits = screenText.match(/(?<!From |Desde )\$\s?\d[\d,]*/g) || [];
  out.accessoryFrom = (screenText.match(/(From|Desde) \$\s?\d/g) || []).length;
  out.perPeriod = (screenText.match(/\/\s*(mo|month|mes)\b/gi) || []).length;
  out.clockAtEnd = Date.now();
  out.clockIso = new Date().toISOString();
  return out;
}
"""
VIEWPORTS = [("tablet-landscape", 1194, 748), ("tablet-portrait", 834, 1108)]
COMPARE_BEHAVIOUR_JS = r"""
async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ANS = { "sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
                "temperature": "hot", "firmness": 5, "partner_sleep": "partner", "partner_disturbance": "sometimes",
                "body_type": "average", "mattress_size": "queen" };
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();
  window.showResults();
  await wait(150);
  const ids = Object.keys(window._drawerData || {});
  const snap = () => {
    const modal = document.getElementById('compareModal');
    const sz = document.getElementById('compareSizeContext');
    const rowText = (k) => { const r = modal.querySelector('.cmp-row[data-cmp="' + k + '"]'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; };
    const cells = (k) => Array.from(modal.querySelectorAll('.cmp-row[data-cmp="' + k + '"] .cmp-val')).map((e) => e.textContent.replace(/\s+/g, ' ').trim());
    const closeBtn = document.getElementById('compareModalClose');
    return { shown: !!modal && modal.style.display !== 'none' && modal.classList.contains('visible'),
             title: ((document.getElementById('compareModalTitle') || {}).textContent || '').trim(),
             closeLabel: closeBtn ? closeBtn.getAttribute('aria-label') : null,
             priceRow: rowText('price'), priceCells: cells('price'), diffRow: rowText('pricediff'), diffCells: cells('pricediff'),
             feelRow: rowText('feel'), tierRow: rowText('tier'),
             sizeHidden: sz ? sz.hidden : 'absent', sizeText: sz ? sz.textContent.trim() : '',
             tierGlyphs: modal.querySelectorAll('.cmp-head-name .price-tier').length,
             colsHtmlLength: (document.getElementById('compareCols') || { innerHTML: 'absent' }).innerHTML.length,
             selected: (window._compareSelected || []).slice(), lang: currentLang,
             screen: ((document.querySelector('.screen.active') || {}).id) || null,
             // the return-focus owner is compared by identity inside the page
             returnFocusSame: window._compareReturnFocus === REF };
  };
  const out = { ids };
  window._compareSelected = [ids[0], ids[1]];
  if (typeof window.updateCompareTray === 'function') window.updateCompareTray();
  // A real opener holds focus before the tap, so the return-focus owner is a
  // concrete element the switch must not replace.
  const opener = document.querySelector('#resultsScreen .compare-btn') || document.body;
  if (opener && typeof opener.focus === 'function') opener.focus();
  window.openCompareModal();
  await wait(150);
  var REF = window._compareReturnFocus;
  out.en = snap();
  // Switch WITH THE MODAL OPEN: the customer must not have to close and
  // reopen it - every visible string follows the language at once.
  await switchLanguage('es');
  await wait(200);
  out.esWhileOpen = snap();
  window.closeCompareModal();
  await wait(50);
  window.openCompareModal();
  await wait(150);
  out.es = snap();
  await switchLanguage('en');
  await wait(200);
  window.closeCompareModal();
  await wait(50);
  window.openCompareModal();
  await wait(150);
  out.enAgain = snap();
  // The unconfirmed new-customer wipe (window.startOver -> resetSessionState).
  window.startOver();
  await wait(400);
  out.afterReset = snap();
  return out;
}
"""


def noNumeric_py(s):
    return re.search(r"\$\s?\d", s) is None and re.search(r"\d[.,]\d{3}", s) is None
UNAVAIL = {"en": FX["pricing"]["presentation"]["states"]["price-unavailable"]["en"],
           "es": FX["pricing"]["presentation"]["states"]["price-unavailable"]["es"]}
ASSUMPTION = {"en": FX["pricing"]["presentation"]["assumptions"][0]["en"],
              "es": FX["pricing"]["presentation"]["assumptions"][0]["es"]}
# Compare modal (slice 2.2h) copy: the governed row labels come from the served
# fixture, the size line and the title from the dictionaries.
CMP_PRICE_LABEL = {l: FX["pricing"]["presentation"]["totals"]["compare-price-label"][l] for l in ("en", "es")}
CMP_DIFF_LABEL = {l: FX["pricing"]["presentation"]["totals"]["compare-difference-label"][l] for l in ("en", "es")}
_DICT = {l: json.load(open(os.path.join(REPO, "data", f"dict-{l}.json"), encoding="utf-8")) for l in ("en", "es")}
CMP_SIZE_PREFIX = {l: _DICT[l]["compare.size_context"].split("{size}")[0].strip() for l in ("en", "es")}
CMP_TITLE = {l: _DICT[l]["compare.modal_title"] for l in ("en", "es")}
DASH = "—"


def minor_of(text):
    """'$1,099.00' / '+$100' -> minor units, or None when no amount is present."""
    m = re.search(r"\$\s?(\d[\d,]*)(?:\.(\d{2}))?", text or "")
    if not m:
        return None
    return int(m.group(1).replace(",", "")) * 100 + (int(m.group(2)) if m.group(2) else 0)


def expect_compare_size_line(tag, c, lang):
    check(f"{tag}: compare size line names the answered size in the active language and carries no figure",
          c.get("sizeHidden") is False and str(c.get("sizeText", "")).startswith(CMP_SIZE_PREFIX[lang])
          and noNumeric_py(c.get("sizeText", "")), str(c.get("sizeText")))


def expect_compare_off(tag, c, lang):
    """Every OFF state and the shipped page: the modal opens as it always did -
    two heads, both tier glyphs, no price row, no difference row, no figure."""
    check(f"{tag}: compare modal opens with two heads and NO price row, NO difference row, no currency, no per-period text",
          c.get("shown") is True and c.get("heads") == 2 and c.get("priceRow") is None and c.get("diffRow") is None
          and c.get("dollars") == 0 and c.get("perPeriod") == 0, str(c)[:240])
    check(f"{tag}: both tier glyphs stay in the compare heads (no exact price renders)", c.get("tierGlyphs") == 2, str(c.get("tierGlyphs")))
    expect_compare_size_line(tag, c, lang)


def expect_compare_unavailable(tag, c, lang):
    """Fail-closed: the governed unavailable copy in the price row, no
    difference, no figure - and the tier glyphs stay, because nothing exact
    rendered for them to contradict."""
    check(f"{tag}: compare price row shows the governed unavailable copy, no difference row, no figure",
          c.get("shown") is True and c.get("priceRow") and UNAVAIL[lang] in c["priceRow"] and CMP_PRICE_LABEL[lang] in c["priceRow"]
          and c.get("diffRow") is None and c.get("dollars") == 0, str(c)[:240])
    check(f"{tag}: both tier glyphs stay in the compare heads - suppression is for an EXACT price, not for the unavailable copy",
          c.get("tierGlyphs") == 2, str(c.get("tierGlyphs")))
    expect_compare_size_line(tag, c, lang)


def expect_compare_available(tag, c, lang):
    cells, diff = c.get("priceCells") or [], c.get("diffCells") or []
    amounts = [minor_of(x) for x in cells]
    check(f"{tag}: compare price row shows the governed label and one FIXTURE amount per side",
          c.get("shown") is True and CMP_PRICE_LABEL[lang] in (c.get("priceRow") or "") and len(cells) == 2
          and all(a is not None for a in amounts), str(c.get("priceRow"))[:200])
    check(f"{tag}: the same-size difference row carries the signed gap on the dearer side and the dash on the other, equal to the two prices' gap",
          CMP_DIFF_LABEL[lang] in (c.get("diffRow") or "") and len(diff) == 2 and sorted(x.startswith("+$") for x in diff) == [False, True]
          and DASH in diff and len(amounts) == 2 and None not in amounts
          and minor_of(next(x for x in diff if x.startswith("+$"))) == abs(amounts[0] - amounts[1]),
          f"diff={diff} amounts={amounts}")
    check(f"{tag}: the tier glyphs yield to the exact figures (none in the compare heads)", c.get("tierGlyphs") == 0, str(c.get("tierGlyphs")))
    check(f"{tag}: compare shows no per-period payment text (V1 invariant)", c.get("perPeriod") == 0)
    expect_compare_size_line(tag, c, lang)


def open_page(browser, url, width=1194, height=748, wait_until="networkidle", expect_app=True, clock=START,
              ready=APP_READY_JS, ready_timeout_ms=APP_READY_TIMEOUT_MS):
    """The ONE way the rendered pass opens a Chromium page: its wall clock is
    frozen to `clock` BEFORE navigation (START for every walk; the negative
    control passes an explicit instant, or None for Chromium's real clock),
    page errors and console warnings/errors are collected, the app's start
    control is awaited unless the caller expects a blanked page, and then the
    page waits - bounded - for the app's OWN readiness predicate `ready`
    (APP_READY_JS for every walk; a readiness control passes CORE_READY_JS or
    None). browser.new_page gives every page its own context, so a clock
    never leaks from one page to the next. Returns (page, errors, boot):
    boot["waitMs"] is how long the readiness wait took, boot["error"] is None
    or the diagnostic of a wait that gave up (the app's state and its last
    console lines), boot["console"] the captured console."""
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    console = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: console.append(m.type + ": " + m.text) if m.type in ("warning", "error") else None)
    if clock is not None:
        page.clock.set_fixed_time(clock)
    page.goto(url, wait_until=wait_until)
    boot = {"waitMs": 0, "error": None, "console": console}
    if expect_app:
        page.wait_for_selector("#startBtn")
        if ready is not None:
            t0 = time.perf_counter()
            try:
                page.wait_for_function(ready, timeout=ready_timeout_ms)
            except Exception as exc:  # playwright's TimeoutError; anything else is a harness bug and propagates
                if type(exc).__name__ != "TimeoutError":
                    raise
                boot["error"] = (f"app not ready within {ready_timeout_ms} ms: {page.evaluate(APP_READY_DIAG_JS)};"
                                 f" console: {console[-3:]}")
            boot["waitMs"] = int((time.perf_counter() - t0) * 1000)
    return page, errors, boot


def walk(browser, port, lang, size, width, height, clock=START, wait_until="networkidle",
         ready=APP_READY_JS, ready_timeout_ms=APP_READY_TIMEOUT_MS):
    page, errors, boot = open_page(browser, f"http://127.0.0.1:{port}/", width, height, wait_until=wait_until,
                                   clock=clock, ready=ready, ready_timeout_ms=ready_timeout_ms)
    r = page.evaluate(WALK_JS, {"lang": lang, "size": size})
    r["errors"] = errors
    r["boot"] = boot
    page.close()
    return r


def expect_ready(tag, r):
    boot = r.get("boot") or {}
    start = r.get("readyAtStart") or {}
    check(f"{tag}: the walk began only after the app's own readiness (appStartReady + accessories hydrated), inside the bounded wait",
          boot.get("error") is None and start.get("ready") is True and start.get("accessoriesLoaded") is True,
          f"boot={boot.get('error')} readyAtStart={start} waitMs={boot.get('waitMs')}")
    ss = r.get("sleepSystemReady") or {}
    check(f"{tag}: the Sleep System price surface was inspected only with accessories hydrated, the workspace shown and ONE featured card rendered",
          ss.get("accessoriesLoaded") is True and ss.get("workspaceShown") is True and ss.get("featuredCards") == 1, str(ss))


def expect_frozen(tag, r, at_ms=FROZEN_MS):
    check(f"{tag}: the page's wall clock read the frozen instant at the start and the end of the walk (its awaited delays still ran)",
          r.get("clockAtStart") == at_ms and r.get("clockAtEnd") == at_ms,
          f"start={r.get('clockAtStart')} end={r.get('clockAtEnd')} expected={at_ms} ({r.get('clockIso')})")


QUOTE = {"en": FX["pricing"]["presentation"]["states"]["quote-only"]["en"],
         "es": FX["pricing"]["presentation"]["states"]["quote-only"]["es"]}
THRESH = {"en": FX["pricing"]["presentation"]["states"]["threshold-unknown"]["en"],
          "es": FX["pricing"]["presentation"]["states"]["threshold-unknown"]["es"]}


def expect_sheet_silent(tag, r):
    check(f"{tag}: Payment Choice sheet carries no plan status copy and no currency amount",
          r["sheet"]["cardCount"] >= 1 and r["sheet"]["statusLines"] == 0 and r["sheet"]["dollars"] == 0,
          f"cards={r['sheet']['cardCount']} status={r['sheet']['statusLines']} dollars={r['sheet']['dollars']}")


def expect_off(tag, r):
    expect_frozen(tag, r)
    expect_ready(tag, r)
    expect_sheet_silent(tag, r)
    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
    check(f"{tag}: the Sleep System featured card shows the catalog 'From $' line exactly as shipped and no governed slot",
          r["featured"]["legacy"] == 1 and r["featured"]["governed"] == 0 and re.search(r"(From|Desde) \$\s?\d", r["featured"]["legacyText"]) is not None,
          f"legacy={r['featured']['legacy']} governed={r['featured']['governed']}")
    check(f"{tag}: Results cards carry no price slot", r["resultsSlots"] == 0)
    check(f"{tag}: drawer price slot hidden and empty", r["drawer"]["hidden"] is True and r["drawer"]["text"] == "" and r["drawer"]["state"] is None)
    check(f"{tag}: Sleep System anchor, Summary hero and Sleep Plan finalist carry no slot",
          r["anchor"]["slots"] == 0 and r["hero"]["slots"] == 0 and r["plan"]["slots"] == 0)
    check(f"{tag}: no [data-price-state] element anywhere and no non-accessory dollar figure",
          r["anySlot"] == 0 and r["dollarDigits"] == [], str(r["dollarDigits"][:3]))
    expect_compare_off(tag, r.get("compare") or {}, r.get("lang", "en"))


def expect_unavailable(tag, r, lang):
    expect_frozen(tag, r)
    expect_ready(tag, r)
    expect_sheet_silent(tag, r)
    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
    check(f"{tag}: the Sleep System featured card shows the governed unavailable copy and NOT the legacy catalog line",
          r["featured"]["legacy"] == 0 and r["featured"]["governed"] == 1
          and UNAVAIL[lang] in r["featured"]["governedText"] and noNumeric_py(r["featured"]["governedText"]),
          f"legacy={r['featured']['legacy']} governed={r['featured']['governed']}")
    check(f"{tag}: every surface shows the governed unavailable copy and no number",
          r["resultsSlots"] >= 1 and all(s == "price-unavailable" for s in r["resultsStates"])
          and UNAVAIL[lang] in r["resultsText"] and r["drawer"]["state"] == "price-unavailable"
          and UNAVAIL[lang] in r["drawer"]["text"] and UNAVAIL[lang] in r["anchor"]["text"]
          and UNAVAIL[lang] in r["hero"]["text"] and UNAVAIL[lang] in r["plan"]["text"]
          and r["dollarDigits"] == [], f"states={r['resultsStates']} dollars={r['dollarDigits'][:3]}")
    expect_compare_unavailable(tag, r.get("compare") or {}, lang)


def expect_available(tag, r, lang):
    expect_frozen(tag, r)
    expect_ready(tag, r)
    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
    check(f"{tag}: every rendered Results card, the drawer, the anchor, the hero and the Plan show a FIXTURE amount with the assumption beside it",
          r["activeCards"] >= 1 and r["resultsSlots"] == r["activeCards"] and all(s == "available" for s in r["resultsStates"])
          and r["drawer"]["state"] == "available" and ASSUMPTION[lang] in r["drawer"]["text"]
          and r["anchor"]["slots"] == 1 and ASSUMPTION[lang] in r["anchor"]["text"]
          and r["hero"]["slots"] == 1 and ASSUMPTION[lang] in r["hero"]["text"]
          and r["plan"]["slots"] == 1 and ASSUMPTION[lang] in r["plan"]["text"]
          and len(r["dollarDigits"]) >= 4,
          f"slots={r['resultsSlots']}/{r['activeCards']} states={r['resultsStates']} drawer={r['drawer']['state']} dollars={len(r['dollarDigits'])}")
    check(f"{tag}: the Sleep System featured card shows the governed FIXTURE amount with the assumption beside it and NOT the legacy catalog line",
          r["featured"]["legacy"] == 0 and r["featured"]["governed"] == 1
          and re.search(r"\$\s?\d", r["featured"]["governedText"]) is not None and ASSUMPTION[lang] in r["featured"]["governedText"],
          f"legacy={r['featured']['legacy']} governed={r['featured']['governed']} text={r['featured']['governedText'][:80]}")
    check(f"{tag}: with the governed slot in place no catalog 'From $' line remains anywhere on the walk",
          r["accessoryFrom"] == 0)
    check(f"{tag}: no per-period payment text anywhere (V1 invariant)", r["perPeriod"] == 0)
    # 2.2d: the sheet opened from the Sleep Plan (its surface is open in
    # this state) shows the governed quote-only copy beside every plan card
    # that carries no formula (the four non-promotional plans) and never an
    # amount. The threshold line lives inside the promotional exact-offer
    # block, which the harness can never open: exactPromotionsEnabled stays
    # false in every state (Invariant 11), so those cards show the generic
    # stale notice and no per-plan block — the unit suite owns that line.
    check(f"{tag}: Payment Choice sheet shows the quote-only status copy on the four formula-less plans and no currency amount",
          r["sheet"]["cardCount"] >= 1 and r["sheet"]["statusLines"] == 4
          and QUOTE[lang] in r["sheet"]["text"] and THRESH[lang] not in r["sheet"]["text"] and r["sheet"]["dollars"] == 0,
          f"cards={r['sheet']['cardCount']} status={r['sheet']['statusLines']} dollars={r['sheet']['dollars']}")
    expect_compare_available(tag, r.get("compare") or {}, lang)


def rendered():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        check("rendered pass: playwright is installed (python -m pip install playwright && python -m playwright install chromium)", False)
        return
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # The SHIPPED page: plain server, no harness.
        s, port = serve_plain()
        try:
            for name, w, h in VIEWPORTS:
                expect_off(f"shipped {name} en", walk(browser, port, "en", "queen", w, h))
            expect_off("shipped tablet-landscape es", walk(browser, port, "es", "queen", 1194, 748))
        finally:
            s.shutdown(); s.server_close()
        # Drill states.
        for state in srv.STATES:
            s, port = serve(state)
            try:
                for name, w, h in VIEWPORTS:
                    for lang in ("en", "es"):
                        tag = f"{state} {name} {lang}"
                        r = walk(browser, port, lang, "queen", w, h)
                        if state == "website":
                            # The website drill prices only the subset with
                            # sufficient evidence, so the fixture walk's
                            # "every card shows an amount" contract does not
                            # apply. Its own contract: real money renders, no
                            # FIXTURE text anywhere, and the page is clean.
                            blob = json.dumps(r)
                            check(f"{tag}: at least one REAL extracted price renders",
                                  (r.get("resultsSlots") or 0) > 0 or "$" in blob, blob[:160])
                            check(f"{tag}: no FIXTURE placeholder renders anywhere on the walk",
                                  "FIXTURE" not in blob)
                            check(f"{tag}: no page errors", not r.get("errors"),
                                  "; ".join(r.get("errors", [])[:2]))
                            continue
                        # The restored contract (Codex correction 2026-09-09):
                        # stale and activation-unapproved are INERT — every
                        # surface OFF, exactly like dark and disabled; only the
                        # fresh + eligible + unadmitted drill shows the copy.
                        if state in ("dark", "disabled", "stale", "unapproved"):
                            expect_off(tag, r)
                        elif state == "unavailable":
                            expect_unavailable(tag, r, lang)
                        else:
                            expect_available(tag, r, lang)
                if state == "available":
                    r = walk(browser, port, "en", "king", 1194, 748)
                    expect_frozen("available, king answered (queen priced)", r)
                    expect_ready("available, king answered (queen priced)", r)
                    # Accessory prices carry no size, so the featured accessory's governed
                    # amount is the ONE dollar figure that legitimately remains on this walk.
                    check("available, king answered (queen priced): every mattress surface is OFF (no applicable SKU: no slot, no copy); the only figure is the sizeless governed accessory amount",
                          r["drawer"]["state"] is None and r["drawer"]["hidden"] is True and r["resultsSlots"] == 0
                          and r["anchor"]["slots"] == 0 and r["hero"]["slots"] == 0 and r["plan"]["slots"] == 0
                          and len(r["dollarDigits"]) == 1 and r["featured"]["governed"] == 1 and r["featured"]["legacy"] == 0,
                          f"drawer={r['drawer']['state']} results={r['resultsSlots']} dollars={r['dollarDigits']} featured={r['featured']}")
                    # No applicable SKU for the answered size: the compare modal
                    # is exactly the OFF modal, and its size line says "King".
                    expect_compare_off("available, king answered (queen priced)", r.get("compare") or {}, "en")
            finally:
                s.shutdown(); s.server_close()
        # ---- compare modal behaviours (slice 2.2h): language switch and reset -
        # In the `available` state, at both tablet orientations: the modal's
        # governed copy follows a language switch (while open nothing throws;
        # reopened it reads in the other language and keeps the same two
        # models), and the new-customer wipe leaves no compare content behind.
        for bstate in ("available", "unavailable"):
            s, port = serve(bstate)
            try:
                for name, w, h in VIEWPORTS:
                    tag = f"compare behaviours {bstate} {name}"
                    page, errors, boot = open_page(browser, f"http://127.0.0.1:{port}/", w, h)
                    b = page.evaluate(COMPARE_BEHAVIOUR_JS)
                    page.close()
                    en, esw, es, en2, rst = b["en"], b["esWhileOpen"], b["es"], b["enAgain"], b["afterReset"]
                    avail = bstate == "available"
                    def copy_ok(snapshot, lang):
                        """The governed copy the modal shows in `lang`: price label
                        plus (available) the difference label, or (unavailable) the
                        unavailable copy with no difference row."""
                        if avail:
                            return CMP_PRICE_LABEL[lang] in (snapshot["priceRow"] or "") and CMP_DIFF_LABEL[lang] in (snapshot["diffRow"] or "")
                        return (CMP_PRICE_LABEL[lang] in (snapshot["priceRow"] or "") and UNAVAIL[lang] in (snapshot["priceRow"] or "")
                                and snapshot["diffRow"] is None)
                    check(f"{tag}: boot ready, no page error across open / switch / reopen / reset",
                          boot.get("error") is None and not errors, f"boot={boot.get('error')} errors={errors[:2]}")
                    check(f"{tag}: EN open - title, close label, governed row copy and size line all English",
                          en["shown"] and en["title"] == CMP_TITLE["en"] and en["closeLabel"] == "Close comparison"
                          and copy_ok(en, "en") and en["sizeText"].startswith(CMP_SIZE_PREFIX["en"]), str(en)[:240])
                    # The required behaviour: the OPEN modal follows the switch at once.
                    check(f"{tag}: switching to ES with the modal OPEN keeps it open, on the same screen, with the same two models, amounts and return-focus owner",
                          esw["shown"] and esw["selected"] == b["ids"][:2] and esw["screen"] == en["screen"]
                          and esw["returnFocusSame"] is True and en["returnFocusSame"] is True
                          and [minor_of(x) for x in esw["priceCells"]] == [minor_of(x) for x in en["priceCells"]], str(esw)[:240])
                    check(f"{tag}: with the modal still OPEN the title, close label, row labels/copy and size line read Spanish at once (no close-and-reopen)",
                          esw["title"] == CMP_TITLE["es"] and esw["closeLabel"] == "Cerrar comparación"
                          and copy_ok(esw, "es") and esw["sizeText"].startswith(CMP_SIZE_PREFIX["es"]),
                          f"title={esw['title']!r} close={esw['closeLabel']!r} price={str(esw['priceRow'])[:60]!r} diff={str(esw['diffRow'])[:40]!r} size={esw['sizeText']!r}")
                    # The fit rows too: the Feel value is resolved in the active language
                    # when Results render, so the open-modal repaint must read the
                    # CURRENT drawer data, not the entries captured at open. Pinned
                    # against the reopen path, which is the reference rendering.
                    check(f"{tag}: with the modal still OPEN the Feel and Tier rows read exactly as a fresh ES open renders them (and differ from EN)",
                          esw["feelRow"] == es["feelRow"] and esw["tierRow"] == es["tierRow"]
                          and es["feelRow"] != en["feelRow"] and es["tierRow"] != en["tierRow"],
                          f"open-switch feel={esw['feelRow']!r} reopen feel={es['feelRow']!r} en feel={en['feelRow']!r}")
                    check(f"{tag}: reopened in ES - title, labels, size line and close label all Spanish, same two models, same amounts",
                          es["shown"] and es["title"] == CMP_TITLE["es"] and copy_ok(es, "es") and es["sizeText"].startswith(CMP_SIZE_PREFIX["es"])
                          and es["closeLabel"] == "Cerrar comparación" and es["selected"] == b["ids"][:2]
                          and [minor_of(x) for x in es["priceCells"]] == [minor_of(x) for x in en["priceCells"]], str(es)[:240])
                    check(f"{tag}: back to EN the modal reads English again", en2["title"] == CMP_TITLE["en"] and en2["sizeText"].startswith(CMP_SIZE_PREFIX["en"]))
                    check(f"{tag}: the new-customer wipe closes the modal, empties the selection and the columns, hides and empties the size line, returns to English",
                          rst["shown"] is False and rst["selected"] == [] and rst["colsHtmlLength"] == 0
                          and rst["sizeHidden"] is True and rst["sizeText"] == "" and rst["lang"] == "en", str(rst)[:240])
            finally:
                s.shutdown(); s.server_close()
        # ---- equal-price rendered path (slice 2.2h) ---------------------------
        # A copy of the `available` drill with EVERY mattress at one amount, so
        # any two compared models are equal: the governed equal presentation
        # ("Same" / "Igual"), never a signed difference and never "$0.00".
        eq_cfg = copy.deepcopy(built["available"][0])
        EQUAL_MINOR = 99900
        for e in eq_cfg["pricing"]["products"]:
            if e["productKind"] == "mattress":
                e["price"]["amountMinor"] = EQUAL_MINOR
                e["clearance"]["scope"]["amountMinor"] = EQUAL_MINOR
        _, eq_cat, _, eq_acc = built["available"]
        s = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(srv.encode(eq_cfg), srv.encode(eq_cat), srv.encode(eq_acc)))
        threading.Thread(target=s.serve_forever, daemon=True).start()
        eq_port = s.server_address[1]
        SAME_WORD = {"en": "Same", "es": "Igual"}
        try:
            for name, w, h in VIEWPORTS:
                for lang in ("en", "es"):
                    tag = f"equal-price {name} {lang}"
                    r = walk(browser, eq_port, lang, "queen", w, h)
                    expect_frozen(tag, r)
                    expect_ready(tag, r)
                    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
                    c = r.get("compare") or {}
                    cells = c.get("priceCells") or []
                    check(f"{tag}: the price row merges into ONE governed cell carrying the shared amount once (equal on both sides)",
                          c.get("shown") is True and CMP_PRICE_LABEL[lang] in (c.get("priceRow") or "") and len(cells) == 1
                          and minor_of(cells[0]) == EQUAL_MINOR and c.get("dollars") == 1, f"row={c.get('priceRow')!r} cells={cells}")
                    check(f"{tag}: the difference row says {SAME_WORD[lang]!r} in words - no signed figure, no '$0.00'",
                          CMP_DIFF_LABEL[lang] in (c.get("diffRow") or "") and SAME_WORD[lang] in (c.get("diffRow") or "")
                          and "+$" not in (c.get("diffRow") or "") and all(minor_of(x) is None for x in (c.get("diffCells") or [])),
                          f"diff={c.get('diffRow')!r}")
                    check(f"{tag}: the tier glyphs yield to the exact (equal) figures", c.get("tierGlyphs") == 0, str(c.get("tierGlyphs")))
                    check(f"{tag}: no per-period payment text in the compare modal", c.get("perPeriod") == 0)
                    expect_compare_size_line(tag, c, lang)
        finally:
            s.shutdown(); s.server_close()
        # ---- negative control: the defect the frozen clock repairs -----------
        # Chromium's REAL clock is past the available state's freshness limit
        # (2026-09-15T19:00Z; post-merge CI run 35027281265). An unfrozen page
        # must reproduce that run's loss - every governed surface OFF and the
        # legacy catalog line back - and a page frozen ONE MINUTE past the
        # limit must lose them the same way: the limit decides, not the
        # machine's date. The frozen-START walks above keep every surface.
        def governed_off(r, errors):
            return (r["resultsSlots"] == 0 and r["anySlot"] == 0 and r["drawer"]["state"] is None
                    and r["featured"]["governed"] == 0 and r["featured"]["legacy"] == 1 and not errors)
        s, port = serve("available")
        try:
            page, errors, _ = open_page(browser, f"http://127.0.0.1:{port}/", clock=None)
            r = page.evaluate(WALK_JS, {"lang": "en", "size": "queen"})
            page.close()
            check("negative control: an UNFROZEN page reads Chromium's real clock, past the available state's freshness limit",
                  r["clockAtStart"] != FROZEN_MS and r["clockAtStart"] > AVAILABLE_LIMIT_MS,
                  f"now={r['clockAtStart']} limit={AVAILABLE_LIMIT_MS}")
            check("negative control: under the unfrozen post-expiry clock every governed surface is OFF and the legacy line is back (CI run 35027281265 reproduced)",
                  governed_off(r, errors),
                  f"slots={r['resultsSlots']} any={r['anySlot']} featured legacy/governed={r['featured']['legacy']}/{r['featured']['governed']} errors={errors[:1]}")
            past = AVAILABLE_LIMIT + timedelta(minutes=1)
            r = walk(browser, port, "en", "queen", 1194, 748, clock=past)
            expect_frozen("negative control, frozen one minute past the limit", r, int(past.timestamp() * 1000))
            check("negative control: frozen one minute past the limit every governed surface is OFF too (the limit decides, not the machine's date)",
                  governed_off(r, r["errors"]),
                  f"slots={r['resultsSlots']} any={r['anySlot']} featured legacy/governed={r['featured']['legacy']}/{r['featured']['governed']}")
        finally:
            s.shutdown(); s.server_close()
        # ---- readiness controls: the boot gap the bounded wait closes ---------
        # The repaired-tree run of 2026-09-15 (362/1) found no featured card on
        # "shipped tablet-portrait en": the walk had begun before
        # data/accessories.json was applied. The gap is made deterministic
        # here by holding that ONE response back on the SHIPPED page and
        # starting from the page's "load" event (before the boot fetches
        # settle), which is where the old sequence could begin under load.
        #  - gated: open_page waits through the hold; the walk then finds the
        #    featured card and its legacy line - the repair;
        #  - ungated (core data in, boot not finished - the old start): the walk
        #    runs inside the gap, expect_ready's two conditions are both FALSE
        #    (they would have failed the walk), and the original symptom is
        #    reproduced: no featured card, legacy=0 governed=0;
        #  - failed load: the app continues with an empty list, and the bounded
        #    wait gives up naming accessories with the app's own warning.
        HOLD_MS = 2500
        s, port = serve_plain(hold_accessories_ms=HOLD_MS)
        try:
            r = walk(browser, port, "en", "queen", 834, 1108, wait_until="load")
            check("readiness control (gated): with accessories.json held back the boot wait actually waited, then the walk found the featured card and its legacy line",
                  r["boot"]["error"] is None and r["boot"]["waitMs"] >= HOLD_MS // 2 and r["readyAtStart"]["ready"] is True
                  and r["sleepSystemReady"]["featuredCards"] == 1 and r["featured"]["legacy"] == 1 and r["featured"]["governed"] == 0 and not r["errors"],
                  f"boot={r['boot']['error']} waitMs={r['boot']['waitMs']} ready={r['readyAtStart']} ss={r['sleepSystemReady']} featured={r['featured']}")
            r = walk(browser, port, "en", "queen", 834, 1108, wait_until="load", ready=CORE_READY_JS)
            check("readiness control (ungated - the old start, core data in but boot unfinished): the walk ran inside the gap and expect_ready's conditions are both false (it would have failed the walk)",
                  r["readyAtStart"]["ready"] is False and r["readyAtStart"]["accessoriesLoaded"] is False
                  and r["sleepSystemReady"]["accessoriesLoaded"] is False and r["sleepSystemReady"]["featuredCards"] != 1,
                  f"ready={r['readyAtStart']} ss={r['sleepSystemReady']}")
            check("readiness control (ungated): the original symptom reappears - no featured card, legacy=0, governed=0 (the 362/1 failure reproduced), with no page error",
                  r["sleepSystemReady"]["featuredCards"] == 0 and r["featured"]["legacy"] == 0 and r["featured"]["governed"] == 0 and not r["errors"],
                  f"ss={r['sleepSystemReady']} featured={r['featured']} errors={r['errors'][:1]}")
        finally:
            s.shutdown(); s.server_close()
        s, port = serve_plain(fail_accessories=True)
        try:
            r = walk(browser, port, "en", "queen", 1194, 748, ready_timeout_ms=3000)
            check("readiness control (failed load): the bounded wait gives up naming accessories - the app's flag false, its list empty, its own warning in the diagnostic",
                  r["boot"]["error"] is not None and "'accessories': False" in r["boot"]["error"] and "'accessories': 0" in r["boot"]["error"]
                  and any("accessories.json" in line for line in r["boot"]["console"]),
                  f"boot={r['boot']['error']} console={r['boot']['console'][-2:]}")
        finally:
            s.shutdown(); s.server_close()
        # Device rehearsal: the SAME page over a private address of this
        # machine passes the domain lock through the in-memory allowlist,
        # shows the NON-SHIPPING banner, and walks the states exactly as the
        # loopback harness does. Two states here (the unit walks above cover
        # all six on loopback): available renders FIXTURE amounts; stale is OFF.
        # Topology-independent: Chromium maps a NAME onto loopback, so the page's
        # own hostname is genuinely non-loopback while every socket stays local
        # (device audit 2026-09-09). Control first: the SHIPPED allowlist blanks
        # that host; then device mode admits it and walks two states.
        NAME = "df-device.test"
        mapped = p.chromium.launch(args=[f"--host-resolver-rules=MAP {NAME} 127.0.0.1"])
        s, port = serve_plain()
        try:
            page, errs, _ = open_page(mapped, f"http://{NAME}:{port}/", wait_until="load", expect_app=False)
            blank = page.evaluate("() => ({ start: !!document.getElementById('startBtn'), text: document.body ? document.body.textContent : '', now: Date.now() })")
            check("control: the SHIPPED allowlist blanks a non-loopback host (no #startBtn, the lock's error text, 'Domain not authorized')",
                  not blank["start"] and "Unauthorized domain" in blank["text"] and any("Domain not authorized" in e for e in errs))
            check("control: the blanked page's wall clock is frozen at START too (every page the harness opens is)",
                  blank["now"] == FROZEN_MS, f"now={blank['now']} expected={FROZEN_MS}")
            page.close()
        finally:
            s.shutdown(); s.server_close()
        for state, expect in (("available", expect_available), ("stale", expect_off)):
            # The served allowlist must name the page's host: build the device
            # documents for the mapped NAME directly (the verdict is for the
            # command line; the documents are what the lock reads).
            cfg_, cat_, _, acc_ = built[state]
            device_docs = {"address": NAME, "allowed_hosts": srv.allowed_hosts_js(NAME), "page": srv.rehearsal_page(state, NAME)}
            s = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(srv.encode(cfg_), srv.encode(cat_), srv.encode(acc_), device_docs))
            threading.Thread(target=s.serve_forever, daemon=True).start()
            dport = s.server_address[1]
            try:
                page, errors, boot = open_page(mapped, f"http://{NAME}:{dport}/")
                probe = page.evaluate("() => ({ banner: !!document.getElementById('" + srv.BANNER_ID + "'), "
                                      "bannerText: (document.getElementById('" + srv.BANNER_ID + "') || {}).textContent || '', "
                                      "blanked: !document.getElementById('startBtn') || document.querySelectorAll('.screen').length === 0, "
                                      "hosts: window.__DF_ALLOWED_HOSTS, host: location.hostname, "
                                      "policy: (typeof window.__dfSetSessionPolicy === 'function') ? window.__dfSetSessionPolicy({ tickMs: 500 }) : 'absent' })")
                check(f"name-mapped device {state}: the domain lock admits the non-loopback host through the in-memory allowlist (page not blanked)",
                      probe["blanked"] is False and probe["hosts"] == [NAME] and probe["host"] == NAME and not errors, str(probe) + "; ".join(errors[:1]))
                check(f"name-mapped device {state}: the NON-SHIPPING banner is on the page and names the state",
                      probe["banner"] and ("state: " + state) in probe["bannerText"] and "FIXTURE" in probe["bannerText"])
                check(f"name-mapped device {state}: the session-policy override refuses a non-loopback host (the idle window cannot be shortened on a device)",
                      probe["policy"] is False)
                r = page.evaluate(WALK_JS, {"lang": "en", "size": "queen"})
                r["errors"] = errors
                r["boot"] = boot
                page.close()
                expect(f"name-mapped device {state} tablet-landscape en", r) if expect is expect_off else expect(f"name-mapped device {state} tablet-landscape en", r, "en")
            finally:
                s.shutdown(); s.server_close()
        mapped.close()
        if DEVICE_IP:
            for state, expect in (("available", expect_available), ("stale", expect_off)):
                s, dport = serve_device(state, DEVICE_IP)
                try:
                    page, errors, boot = open_page(browser, f"http://{DEVICE_IP}:{dport}/")
                    # "Blanked" = the domain lock replaced the document with its error
                    # page (no #startBtn, no app). The lock's own source text lives in
                    # the page, so its wording is not the probe.
                    probe = page.evaluate("() => ({ banner: !!document.getElementById('" + srv.BANNER_ID + "'), "
                                          "bannerText: (document.getElementById('" + srv.BANNER_ID + "') || {}).textContent || '', "
                                          "blanked: !document.getElementById('startBtn') || document.querySelectorAll('.screen').length === 0, "
                                          "hosts: window.__DF_ALLOWED_HOSTS, host: location.hostname })")
                    check(f"device {state}: the domain lock admits the private address through the in-memory allowlist (page not blanked)",
                          probe["blanked"] is False and probe["hosts"] == [DEVICE_IP] and probe["host"] == DEVICE_IP and not errors, str(probe) + "; ".join(errors[:1]))
                    check(f"device {state}: the NON-SHIPPING banner is on the page and names the state",
                          probe["banner"] and ("state: " + state) in probe["bannerText"] and "FIXTURE" in probe["bannerText"])
                    r = page.evaluate(WALK_JS, {"lang": "en", "size": "queen"})
                    r["errors"] = errors
                    r["boot"] = boot
                    page.close()
                    expect(f"device {state} tablet-landscape en", r) if expect is expect_off else expect(f"device {state} tablet-landscape en", r, "en")
                finally:
                    s.shutdown(); s.server_close()
        browser.close()


rendered()

# ---- committed files untouched ------------------------------------------------
print("Committed files:")
after = {p: sha(p) for p in WATCHED}
check("every watched committed file is byte-identical after the full cycle", before == after,
      ", ".join(p for p in WATCHED if before[p] != after[p]))

print(f"\nPricing harness check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
