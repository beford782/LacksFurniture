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
    EN and ES; in `stale` and `unapproved` every surface shows only the
    governed unavailable copy and no number; in `disabled` (emergency off)
    every surface is gone again. No page errors on any walk.

Requires the `playwright` package with Chromium installed for the rendered
pass (`python -m pip install playwright && python -m playwright install
chromium`); without it the rendered section is reported as NOT RUN and the
check fails, exactly like tests/sleep_plan_layout_check.py.

Run: python tests/pricing_harness_check.py
"""

import hashlib
import json
import os
import re
import sys
import threading
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
           "tests/fixtures/pricing_populated_fixture.json", "index.html"]
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

# ---- drill states -------------------------------------------------------------
print("Drill states:")
built = {}
for state in srv.STATES:
    cfg, cat, v, acc = srv.build_injected(state, START)
    built[state] = (cfg, cat, v, acc)
    mattress_entries = [e for e in cfg["pricing"]["products"] if e["productKind"] == "mattress"]
    accessory_entries = [e for e in cfg["pricing"]["products"] if e["productKind"] == "accessory"]
    check(f"{state}: one FIXTURE price per shipped accessory (productKind accessory, no size), SKUs matching the injected accessory catalog",
          [e["productId"] for e in accessory_entries] == ACC_IDS
          and all(e["size"] is None and e["sku"] == srv.fixture_sku(e["productId"])
                  and e["clearance"]["scope"]["productKind"] == "accessory" and e["clearance"]["scope"]["size"] is None
                  and e["clearance"]["scope"]["sku"] == e["sku"] for e in accessory_entries)
          and [a["id"] for a in acc] == ACC_IDS and all(a["sku"] == srv.fixture_sku(a["id"]) for a in acc))
    check(f"{state}: the injected accessory catalog differs from production ONLY by the sku",
          all({k: v_ for k, v_ in a.items() if k != "sku"} == p for a, p in zip(acc, ACCESSORIES))
          and all("sku" not in p for p in ACCESSORIES))
    check(f"{state}: financing validates clean (stamps shifted, exact-term output OFF)",
          v["financing_ok"] and cfg["financing"]["exactPromotionsEnabled"] is False,
          "; ".join(v["financing_errors"][:2]))
    if state == "stale":
        check("stale: the DARK form is REFUSED at build time naming the aged evidence (the build-gate half of the rule)",
              v["dark_stale_named"] and srv.dark_form_acceptable(state, v), "; ".join(v["dark_errors"][:2]))
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
          [e["productId"] for e in mattress_entries] == ALL_IDS
          and all(e["size"] == "queen" and e["sku"] == srv.fixture_sku(e["productId"])
                  and e["clearance"]["scope"]["sku"] == e["sku"]
                  and e["clearance"]["scope"]["amountMinor"] == e["price"]["amountMinor"]
                  for e in mattress_entries)
          and all(m["skus"] == {"queen": srv.fixture_sku(m["id"])}
                  for tier in srv.TIER_ORDER for m in cat.get(tier, [])))
    check(f"{state}: every attestation, approval and verification string is a FIXTURE placeholder",
          all("FIXTURE" in e["evidence"]["verifiedBy"] and "FIXTURE" in e["clearance"]["attestedBy"]
              for e in cfg["pricing"]["products"])
          and all("FIXTURE" in a["by"] for a in cfg["pricing"]["presentation"]["approvals"].values()
                  if a["status"] == "approved"))
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


# ---- live loopback server -----------------------------------------------------
def serve(state):
    cfg, cat, _, acc = built[state]
    server = ThreadingHTTPServer(("127.0.0.1", 0), srv.make_handler(srv.encode(cfg), srv.encode(cat), srv.encode(acc)))
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


def serve_plain():
    import http.server
    handler = lambda *a, **k: http.server.SimpleHTTPRequestHandler(*a, directory=REPO, **k)  # noqa: E731

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=REPO, **k)

        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
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
  const out = { errors: [] };
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
  return out;
}
"""
VIEWPORTS = [("tablet-landscape", 1194, 748), ("tablet-portrait", 834, 1108)]


def noNumeric_py(s):
    return re.search(r"\$\s?\d", s) is None and re.search(r"\d[.,]\d{3}", s) is None
UNAVAIL = {"en": FX["pricing"]["presentation"]["states"]["price-unavailable"]["en"],
           "es": FX["pricing"]["presentation"]["states"]["price-unavailable"]["es"]}
ASSUMPTION = {"en": FX["pricing"]["presentation"]["assumptions"][0]["en"],
              "es": FX["pricing"]["presentation"]["assumptions"][0]["es"]}


def walk(browser, port, lang, size, width, height):
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(WALK_JS, {"lang": lang, "size": size})
    r["errors"] = errors
    page.close()
    return r


QUOTE = {"en": FX["pricing"]["presentation"]["states"]["quote-only"]["en"],
         "es": FX["pricing"]["presentation"]["states"]["quote-only"]["es"]}
THRESH = {"en": FX["pricing"]["presentation"]["states"]["threshold-unknown"]["en"],
          "es": FX["pricing"]["presentation"]["states"]["threshold-unknown"]["es"]}


def expect_sheet_silent(tag, r):
    check(f"{tag}: Payment Choice sheet carries no plan status copy and no currency amount",
          r["sheet"]["cardCount"] >= 1 and r["sheet"]["statusLines"] == 0 and r["sheet"]["dollars"] == 0,
          f"cards={r['sheet']['cardCount']} status={r['sheet']['statusLines']} dollars={r['sheet']['dollars']}")


def expect_off(tag, r):
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


def expect_unavailable(tag, r, lang):
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


def expect_available(tag, r, lang):
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
                        if state in ("dark", "disabled"):
                            expect_off(tag, r)
                        elif state in ("stale", "unapproved"):
                            expect_unavailable(tag, r, lang)
                        else:
                            expect_available(tag, r, lang)
                if state == "available":
                    r = walk(browser, port, "en", "king", 1194, 748)
                    # Accessory prices carry no size, so the featured accessory's governed
                    # amount is the ONE dollar figure that legitimately remains on this walk.
                    check("available, king answered (queen priced): every mattress surface shows the unavailable copy; the only figure is the sizeless governed accessory amount",
                          r["drawer"]["state"] == "price-unavailable" and len(r["dollarDigits"]) == 1
                          and r["featured"]["governed"] == 1 and r["featured"]["legacy"] == 0
                          and all(x == "price-unavailable" for x in r["resultsStates"]),
                          f"drawer={r['drawer']['state']} dollars={r['dollarDigits']} featured={r['featured']}")
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
