#!/usr/bin/env python3
"""Payment demo (owner demo-first direction 2026-10-05) - isolation, data and
the rendered purchase studio.

The demo is the preview harness's `demo` state (tools/serve_pricing_preview.py
--state demo): historical lacks.com prices from the committed 2026-10-03
capture, explicitly illustrative fills (demo/payment-demo/illustrative-prices.json)
and example financing plans (demo/payment-demo/demo.json), all assembled IN
MEMORY. This check pins:

  1. isolation: no demo token reaches incoming/, data/, the workbook
     builder, the converter or the allowed-host projection; shipped config
     carries no illustrativeDemo and keeps every activation flag false;
  2. the demo build: financing and dark pricing validate, the opened form is
     still REFUSED by the production validator, gasUrl is blank, no review
     tools; every catalog mattress is priced in every size; every capture
     price is served unchanged; every illustrative SKU is declared so the UI
     can mark it; every example factor is the amortization factor;
  3. device mode: the demo page carries the operator area and NO drill
     banner, the drill states keep their banner, and demo/ is never served;
  4. the rendered studio, English and Spanish, iPad landscape and portrait:
     itemised arithmetic, size re-pricing, the governed payment for each
     method (fixed factor and equal division, rounded up to the dollar), a
     voluntary down payment and its validation, the monthly effect of an
     item as the difference of two complete quotes, an unpriced item making
     the purchase incomplete (no subtotal, no payment), quote-only plans,
     finalist switching preserving the Sleep System, language switching
     preserving everything, the new-customer wipe, no horizontal overflow,
     no console errors;
  5. under SHIPPED data the studio renders nothing;
  6. sleep fit is untouched: the same answers give the same recommendations
     with the demo prices on and off.

Run:  python tests/payment_demo_check.py
"""
import functools
import http.server
import json
import math
import os
import re
import sys
import threading
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as sp  # noqa: E402

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


def _read(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return f.read()


def money_minor(text):
    m = re.search(r"\$([\d,]+(?:\.\d{2})?)", text or "")
    if not m:
        return None
    v = m.group(1).replace(",", "")
    return int(round(float(v) * 100))


# ---- 1. isolation -------------------------------------------------------------
print("Isolation (demo data never enters production inputs or outputs):")
TOKENS = ("illustrativeDemo", "payment-demo", "historical-snapshot", "demoCalculation", "DEMO-", "__DF_DEMO_CONTEXT")
SHIPPED = ["data/store-config.json", "data/mattresses.json", "data/accessories.json",
           "data/allowed-hosts.js", "incoming/lacks_financing.json", "incoming/lacks_pricing.json",
           "incoming/build_lacks_workbook.py", "tools/convert_store_data.py",
           "demo/black-friday/data/store-config.json"]
for rel in SHIPPED:
    if not os.path.exists(os.path.join(REPO, rel)):
        continue
    raw = _read(rel)
    hit = [t for t in TOKENS if t in raw]
    check(f"{rel}: no demo token", not hit, str(hit))
for lang in ("en", "es"):
    d = json.loads(_read(f"data/dict-{lang}.json"))
    vals = " ".join(str(v) for v in d.values())
    check(f"dict-{lang}: carries no demo data (no illustrative prices, hosts or plan ids)",
          not any(t in vals for t in ("payment-demo", "DEMO-", "demo-0-", "demo-9-")))
cfg = json.loads(_read("data/store-config.json"))
check("shipped store-config has no illustrativeDemo block", "illustrativeDemo" not in cfg)
check("shipped financing keeps exactPromotionsEnabled false and every calculation off",
      cfg["financing"].get("exactPromotionsEnabled") is False
      and all(p.get("paymentCalculationEnabled") is not True for p in cfg["financing"]["plans"]))
check("shipped pricing stays dark", cfg["pricing"].get("enabled") is False
      and cfg["pricing"].get("displayEnabled") is False)
check("index.html never names a demo plan, data file or capture (it knows only the contract id)",
      not any(t in _read("index.html") for t in ("demo/payment-demo", "demo-0-12", "demo-9-99", "illustrative-prices", "price-review/2026")))

# ---- 2. the demo build ----------------------------------------------------------
print("Demo build (honest provenance, production refusal):")
start = datetime.now(timezone.utc).astimezone()
config, catalog, verdicts, accessories = sp.build_injected("demo", start)
check("the demo contract validates", verdicts["demo_ok"], str(verdicts["demo_errors"][:3]))
check("the production validators REFUSE the demo data (pricing, financing and store config)",
      verdicts["production_refuses"], json.dumps(verdicts["production_errors"])[:300])
check("pricing refusal names the demo provenance",
      any("payment-demo provenance" in e for e in verdicts["production_errors"]["pricing"]))
check("financing refusal names the demo-only plan fields",
      any("payment-demo only" in e for e in verdicts["production_errors"]["financing"]))
check("store-config refusal names illustrativeDemo",
      any("illustrativeDemo" in e for e in verdicts["production_errors"]["storeConfig"]))
check("harness accepts the demo state", sp.dark_form_acceptable("demo", verdicts))
check("gasUrl stays blank", not config.get("gasUrl"))
check("no review tools in the demo", "reviewTools" not in config)
demo_cfg = config.get("illustrativeDemo") or {}
shipped = json.loads(_read("data/store-config.json"))
check("approval, freshness and source-policy records are the SHIPPED ones (nothing approved or cleared)",
      all(config["pricing"][k] == shipped["pricing"][k] for k in ("authority", "freshness", "sourcePolicy"))
      and config["pricing"]["presentation"]["approvals"] == shipped["pricing"]["presentation"]["approvals"]
      and config["pricing"]["presentation"]["status"] == shipped["pricing"]["presentation"]["status"]
      and config["pricing"]["formulas"] == [])
check("financing exact-term authorization stays false and its own stamp is untouched",
      config["financing"]["exactPromotionsEnabled"] is False
      and config["financing"]["verifiedAt"] == json.loads(_read("incoming/lacks_financing.json"))["financing"]["verifiedAt"])
sizes = ("twin", "twin_xl", "full", "queen", "king", "cal_king")
unpriced = [(m["id"], z) for t in sp.TIER_ORDER for m in catalog[t] for z in sizes if z not in (m.get("skus") or {})]
check("every catalog mattress is priced in every size", not unpriced, str(unpriced[:5]))
by_sku = {e["sku"]: e for e in config["pricing"]["products"]}
cov = verdicts["websiteCoverage"]
check("every capture price is served unchanged",
      all(by_sku[h["sku"]]["price"]["amountMinor"] == h["amountMinor"] for h in cov["historical"]) and len(cov["historical"]) > 40)
check("historical entries keep their ORIGINAL observation instants (never the assembly time)",
      all(by_sku[h["sku"]]["evidence"]["observedAt"] == h["observedAt"] for h in cov["historical"])
      and all(by_sku[h["sku"]]["evidence"]["observedAt"] != demo_cfg["assembledAt"] for h in cov["historical"]))
check("no entry claims verification, a verification time or a clearance",
      all(e["evidence"].get("verified") is False and "verifiedAt" not in e["evidence"]
          and "verifiedBy" not in e["evidence"] and e["clearance"] == {"status": "not-cleared"}
          for e in config["pricing"]["products"]))
check("every entry is honestly historical-snapshot or illustrative",
      {e["evidence"]["status"] for e in config["pricing"]["products"]} == {"historical-snapshot", "illustrative"})
check("illustrative entries name their method and claim no observation or source",
      all(by_sku[r["sku"]]["evidence"]["status"] == "illustrative" and by_sku[r["sku"]]["evidence"]["method"]
          and "observedAt" not in by_sku[r["sku"]]["evidence"] for r in cov["illustrative"]))
check("assembly time is its own field", isinstance(demo_cfg.get("assembledAt"), str) and demo_cfg.get("contract") == "payment-demo/1")
fills = json.loads(_read("demo/payment-demo/illustrative-prices.json"))
check("the illustrative price file is labelled non-production", "NOT Lacks prices" in fills["_meta"]["purpose"])
plans = [p for p in config["financing"]["plans"] if p.get("demo") is True]
check("four example plans: unverified, calculation off, provider 'Demo', no published factor or source",
      len(plans) == 4 and all(p["provider"] == "Demo" and p["verified"] is False
                              and p["verificationStatus"] == "illustrative" and p["paymentCalculationEnabled"] is False
                              and "publishedPaymentFactor" not in p and "sourceUrl" not in p and "verifiedAt" not in p
                              for p in plans))
for p in plans:
    c = p["demoCalculation"]
    if c["mode"] == "published-fixed-factor":
        r = p["apr"] / 100 / 12
        f = round(r / (1 - (1 + r) ** -p["termMonths"]), 6)
        check(f"{p['id']}: the example factor is the amortization factor ({f})", c["factor"] == f)
    else:
        check(f"{p['id']}: equal division is 0% APR only", p["apr"] == 0 and "factor" not in c)
check("every example plan says it is illustrative, in both languages",
      all("Illustrative" in p["detail"]["en"] and "ilustrativo" in p["detail"]["es"].lower() for p in plans))
src_plans = json.loads(_read("incoming/lacks_financing.json"))["financing"]["plans"]
check("the real programs are the canonical records, unchanged",
      [p for p in config["financing"]["plans"] if p.get("demo") is not True]
      == [p for p in src_plans if p.get("kind") != "open-end-promotional-credit"])
# The demo contract fails closed on malformed data.
import copy as _copy


def _bad(mut):
    c2 = _copy.deepcopy(config)
    mut(c2)
    return bool(sp.validate_payment_demo(c2, catalog, accessories))


check("contract refuses a negative price", _bad(lambda c: c["pricing"]["products"][0]["price"].__setitem__("amountMinor", -1)))
check("contract refuses a fractional price", _bad(lambda c: c["pricing"]["products"][0]["price"].__setitem__("amountMinor", 1.5)))
check("contract refuses a wrong size", _bad(lambda c: c["pricing"]["products"][0].__setitem__("size", "king" if c["pricing"]["products"][0]["size"] != "king" else "twin")))
check("contract refuses a forged identity", _bad(lambda c: c["pricing"]["products"][0].__setitem__("productId", "g1" if c["pricing"]["products"][0]["productId"] != "g1" else "g2")))
check("contract refuses a re-dated historical entry claiming verification",
      _bad(lambda c: c["pricing"]["products"][0]["evidence"].__setitem__("verifiedAt", demo_cfg["assembledAt"])))
check("contract refuses a fabricated approval", _bad(lambda c: c["pricing"]["presentation"]["approvals"]["legal"].__setitem__("status", "approved")))
check("contract refuses a factor that is not the amortization factor",
      _bad(lambda c: next(p for p in c["financing"]["plans"] if p.get("demoCalculation", {}).get("factor"))["demoCalculation"].__setitem__("factor", 0.01)))
check("contract refuses equal division at a non-zero APR",
      _bad(lambda c: next(p for p in c["financing"]["plans"] if p.get("demoCalculation", {}).get("mode") == "published-equal-division").__setitem__("apr", 5)))
check("contract refuses an unsupported method",
      _bad(lambda c: next(p for p in c["financing"]["plans"] if p.get("demo"))["demoCalculation"].__setitem__("mode", "amortization")))
check("contract refuses a verified example plan", _bad(lambda c: next(p for p in c["financing"]["plans"] if p.get("demo")).__setitem__("verified", True)))
check("contract refuses a live gasUrl", _bad(lambda c: c.__setitem__("gasUrl", "https://script.google.com/x")))
check("contract refuses a malformed context nonce", _bad(lambda c: c["illustrativeDemo"].__setitem__("contextNonce", "abc")))
check("two builds use two different context nonces",
      sp.build_injected("demo", start)[0]["illustrativeDemo"]["contextNonce"] != demo_cfg["contextNonce"])

# ---- 3. device mode -------------------------------------------------------------
print("Device mode:")
OP = {"historical": 1, "illustrative": 2, "plans": 4, "contextNonce": demo_cfg["contextNonce"]}
bundle = sp.device_bundle("192.168.1.20", "demo", OP)
page = bundle["page"].decode("utf-8")
check("demo page carries the operator area", 'id="dfDemoOperator"' in page and "Load a demo scenario" in page)
check("demo page carries the harness context with this run's nonce, frozen and non-writable",
      "__DF_DEMO_CONTEXT" in page and demo_cfg["contextNonce"] in page and "writable:false" in page)
check("demo page carries no drill banner", "FIXTURE PRICES ONLY" not in page and sp.BANNER_ID not in page)
other = sp.device_bundle("192.168.1.20", "payments")["page"].decode("utf-8")
check("other states keep the diagnostic banner and never carry a demo context",
      "FIXTURE PRICES ONLY" in other and "dfDemoOperator" not in other
      and 'defineProperty(window,"__DF_DEMO_CONTEXT"' not in other)
try:
    sp.rehearsal_page("demo", "127.0.0.1", {"historical": 0})
    check("a demo page cannot be built without the run's nonce", False)
except ValueError:
    check("a demo page cannot be built without the run's nonce", True)
check("index.html itself never writes a demo context",
      "__DF_DEMO_CONTEXT =" not in _read("index.html") and "defineProperty(window,\"__DF_DEMO_CONTEXT\"" not in _read("index.html"))
check("the allowlist is exactly the device address", bundle["allowed_hosts"] == b'window.__DF_ALLOWED_HOSTS = ["192.168.1.20"];\n')
check("demo/ is never served on a device",
      sp.device_canonical_path("/demo/payment-demo/demo.json") is None
      and sp.device_canonical_path("/demo/price-review/2026-10-03/snapshot.json") is None)
check("hostnames and public addresses are still refused",
      bool(sp.device_address_verdict("laptop.local")) and bool(sp.device_address_verdict("8.8.8.8")))

# ---- 4/5/6. rendered ------------------------------------------------------------
print("Rendered studio:")
try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("  [FAIL] playwright is required")
    sys.exit(1)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def serve(handler):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


demo_page = sp.rehearsal_page("demo", "127.0.0.1", OP)
demo_srv = serve(sp.make_handler(sp.encode(config), sp.encode(catalog), sp.encode(accessories), None, demo_page))
# The SAME demo config and catalog behind the ORDINARY page (no harness
# context): the config alone must admit nothing.
flag_only_srv = serve(sp.make_handler(sp.encode(config), sp.encode(catalog), sp.encode(accessories)))
FLAG_ONLY_URL = f"http://127.0.0.1:{flag_only_srv.server_address[1]}/"
plain_srv = serve(functools.partial(Quiet, directory=REPO))
DEMO_URL = f"http://127.0.0.1:{demo_srv.server_address[1]}/"
PLAIN_URL = f"http://127.0.0.1:{plain_srv.server_address[1]}/"
READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
ANSWERS = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
           "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
           "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
TXT = "(sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\\s+/g, ' ').trim() : null; }"
ROWS = """() => Array.from(document.querySelectorAll('#purchaseStudio .ps-row[data-ps-line]')).map(l => ({
  id: l.dataset.psLine, amount: l.querySelector('.ps-row__amount').textContent.trim() }))"""
CARD = """(id) => { const c = document.querySelector('#purchaseStudio [data-ps-plan="' + id + '"]');
  return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; }"""
FIG = """(k) => { const f = document.querySelector('#psCenterBox [data-ps-fig="' + k + '"] .ps-fig__value');
  return f ? f.textContent.trim() : null; }"""
DL = """(k) => { const f = document.querySelector('#psDetails [data-ps-dl="' + k + '"] dd');
  return f ? f.textContent.trim() : null; }"""
# The purchase as state: finalist, saved list, cart, size, plan, down payment.
STATE = """() => JSON.stringify({ fav: window._favoriteMattressId, saved: (window._savedPicks || []).map(p => p.id),
  cart: Object.keys(window._accCart || {}).sort().map(k => [k, window._accCart[k].quantity, !!window._accCart[k].split]),
  size: answers.mattress_size, plan: _psPlan, down: _psDownRaw })"""


def ceil_div(a, b):
    return -(-a // b)


def fixed_pay(principal, factor):
    micro = round(factor * 1_000_000)
    return ceil_div(principal * micro, 100_000_000) * 100


def eq_pay(principal, term):
    return ceil_div(principal, term * 100) * 100


FACTOR72 = next(p["demoCalculation"]["factor"] for p in plans if p["id"] == "demo-9-99-72")


def recommended(pg):
    return pg.evaluate("""async (a) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
      for (const k in a) answers[k] = a[k]; showProfileScreen(); window.showResults(); await w(350);
      return Object.keys(window._drawerData || {}); }""", ANSWERS)


with sync_playwright() as p:
    browser = p.chromium.launch()
    for lang, (w, h) in (("en", (1180, 820)), ("es", (820, 1180))):
        tag = f"[{lang} {w}x{h}]"
        pg = browser.new_page(viewport={"width": w, "height": h})
        errs = []
        pg.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
        pg.goto(DEMO_URL)
        pg.wait_for_function(READY, timeout=20000)
        pg.click("#dfDemoOperator summary")
        pg.click("[data-scn='couple-queen']")
        pg.wait_for_function("() => { const b = document.getElementById('purchaseStudio'); return b && !b.hidden && b.querySelector('.ps-row'); }", timeout=10000)
        # Loading a scenario is a new customer (English); the customer then
        # chooses their language.
        if lang == "es":
            pg.evaluate("async () => { await switchLanguage('es'); }")
            pg.wait_for_timeout(300)
        notice = pg.evaluate(TXT, "#purchaseStudio .ps-notice")
        check(f"{tag} the bilingual demo notice shows", notice == demo_cfg["notice"][lang], notice)
        # ---- one authoritative purchase presentation ----
        check(f"{tag} the Summary's separate finalist hero and Sleep System list yield to the one purchase view",
              pg.evaluate("getComputedStyle(document.getElementById('hf2FinalistHero')).display") == "none"
              and pg.evaluate("getComputedStyle(document.getElementById('hf2SleepSystemSection')).display") == "none")
        check(f"{tag} no permanently expanded wall of alternatives (no alternative cards until Add/Change)",
              pg.evaluate("document.querySelectorAll('#purchaseStudio [data-ps-sheet-opt], #purchaseStudio .ps-opt').length") == 0)
        eyebrow = pg.evaluate(TXT, "#purchaseStudio .ps-hero .ps-kicker")
        check(f"{tag} the hero says 'selected mattress', not an unconditional best fit",
              eyebrow and ("SELECTED" in eyebrow.upper() or "SELECCIONADO" in eyebrow.upper()), eyebrow)
        badge = pg.evaluate(TXT, "#purchaseStudio .ps-hero__badge") or ""
        lead = pg.evaluate("t('results.match_lead')")
        check(f"{tag} the best-match badge comes from the recommendation's own position",
              (lead in badge) == (pg.evaluate("_resultsState.tierData[window._drawerData[window._favoriteMattressId].tier][0].id === window._favoriteMattressId")),
              badge)
        rows = pg.evaluate(ROWS)
        mprice = money_minor(pg.evaluate(TXT, "[data-ps='mattress-price']"))
        sub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        check(f"{tag} mattress plus compact rows sum to the merchandise subtotal",
              sub == mprice + sum(money_minor(r["amount"]) or 0 for r in rows) and len(rows) == 3, f"{sub} {rows}")
        check(f"{tag} the subtotal is the quote model's own amount",
              sub == pg.evaluate("buildConsultationQuote('handoff', 'queen').merchandiseMinor"))
        check(f"{tag} every row has Change and Remove, and a missing pillow slot offers Add",
              all(pg.evaluate(f"!!document.querySelector('[data-ps-change=\"{r['id']}\"]') && !!document.querySelector('[data-ps-remove=\"{r['id']}\"]')") for r in rows)
              and pg.evaluate("!!document.querySelector('[data-ps-add=\"pillow\"]')"))
        # ---- payment comparison and centerpiece ----
        full = money_minor(pg.evaluate(CARD, "full"))
        check(f"{tag} pay in full is one payment of the subtotal", full == sub
              and ("One payment" in pg.evaluate(CARD, "full") or "Un solo pago" in pg.evaluate(CARD, "full")))
        c72 = pg.evaluate(CARD, "demo-9-99-72")
        check(f"{tag} 9.99%/72 row: payment = subtotal x factor, rounded up to the dollar",
              money_minor(c72) == fixed_pay(sub, FACTOR72), c72)
        c12 = pg.evaluate(CARD, "demo-0-12")
        check(f"{tag} 0%/12 row: equal division rounded up to the dollar", money_minor(c12) == eq_pay(sub, 12), c12)
        lto = pg.evaluate(CARD, "lease-to-own")
        check(f"{tag} lease-to-own reads To confirm with no figure",
              lto is not None and ("To confirm" in lto or "Por confirmar" in lto) and "$" not in lto, lto)
        check(f"{tag} no plan is preselected: pay in full is the starting choice",
              pg.evaluate("document.querySelector('[data-ps-plan=\"full\"]').getAttribute('aria-pressed')") == "true")
        pg.click("[data-ps-plan='demo-9-99-72']")
        pg.wait_for_timeout(150)
        check(f"{tag} the selected row is marked by text and aria-pressed, not colour alone",
              pg.evaluate("document.querySelector('[data-ps-plan=\"demo-9-99-72\"]').getAttribute('aria-pressed')") == "true"
              and pg.evaluate("document.querySelector('[data-ps-plan=\"demo-9-99-72\"] .ps-cmp__sel') !== null"))
        big = money_minor(pg.evaluate(TXT, "[data-ps-big]"))
        check(f"{tag} the centerpiece shows the selected plan's monthly figure", big == fixed_pay(sub, FACTOR72))
        cost = money_minor(pg.evaluate(FIG, "cost"))
        check(f"{tag} total paid and merchandise subtotal are both visible without expanding details",
              cost == big * 72 and money_minor(pg.evaluate(FIG, "subtotal")) == sub
              and pg.evaluate(FIG, "interest") is not None)
        check(f"{tag} supporting details sit in one closed disclosure", pg.evaluate("document.getElementById('psDetails').open") is False)
        pg.click("#psDetails summary")
        check(f"{tag} the disclosure carries the amount financed and the scheduled total",
              money_minor(pg.evaluate(DL, "financed")) == sub and money_minor(pg.evaluate(DL, "scheduled")) == big * 72)
        check(f"{tag} the selected payment is not repeated as a second dashboard",
              pg.evaluate("document.querySelectorAll('#purchaseStudio [data-ps-big]').length") == 1)
        # ---- voluntary down payment ----
        pg.fill("#psDownInput", "500")
        check(f"{tag} typing keeps focus in the down-payment field", pg.evaluate("document.activeElement.id") == "psDownInput")
        check(f"{tag} a down payment lowers the amount financed and the payment",
              money_minor(pg.evaluate(DL, "financed")) == sub - 50000
              and money_minor(pg.evaluate(TXT, "[data-ps-big]")) == fixed_pay(sub - 50000, FACTOR72))
        for bad in ("-5", "abc", str(sub // 100 + 10)):
            pg.fill("#psDownInput", bad)
            check(f"{tag} down payment {bad!r} is refused and no payment shows",
                  "is-error" in (pg.get_attribute("#psDownMsg", "class") or "")
                  and pg.evaluate("document.querySelector('[data-ps-big]')") is None)
        pg.fill("#psDownInput", "500")
        pg.wait_for_timeout(100)
        # ---- monthly effect of a change: a preview, two complete quotes ----
        base_amt = money_minor(next(r for r in pg.evaluate(ROWS) if r["id"] == "base-bt3000")["amount"])
        pg.click("[data-ps-change='base-bt3000']")
        pg.wait_for_timeout(200)
        check(f"{tag} Change opens a focused dialog with the current base identified",
              pg.evaluate("document.getElementById('psSheet').hidden") is False
              and pg.evaluate("document.activeElement.id") == "psSheetTitle"
              and pg.evaluate("document.querySelector('[data-ps-sheet-opt=\"base-bt3000\"]').classList.contains('is-current')"))
        state0 = pg.evaluate(STATE)
        pg.click("[data-ps-sheet-opt='__none']")
        pg.wait_for_timeout(150)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        cur_m = fixed_pay(sub - 50000, FACTOR72)
        new_m = fixed_pay(sub - base_amt - 50000, FACTOR72)
        check(f"{tag} removing the base previews current -> proposed subtotal and monthly under the same terms",
              f"{(sub - base_amt) / 100:,.2f}" in pv and f"${new_m // 100:,}/m" in pv and f"${cur_m // 100:,}/m" in pv
              and f"{(cur_m - new_m) // 100:,}" in pv, pv)
        check(f"{tag} previewing changes nothing", pg.evaluate(STATE) == state0)
        pg.keyboard.press("Escape")
        pg.wait_for_timeout(150)
        check(f"{tag} Escape cancels: purchase unchanged and focus back on Change",
              pg.evaluate("document.getElementById('psSheet').hidden") is True and pg.evaluate(STATE) == state0
              and pg.evaluate("document.activeElement.getAttribute('data-ps-change')") == "base-bt3000")
        # ---- an accessory upgrade, applied ----
        pg.click("[data-ps-change='base-bt3000']")
        pg.click("[data-ps-sheet-opt='base-tempur-ergo']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        check(f"{tag} Apply swaps the base through the Sleep System and keeps plan and down payment",
              pg.evaluate("'base-tempur-ergo' in window._accCart && !('base-bt3000' in window._accCart)")
              and pg.evaluate("_psPlan") == "demo-9-99-72" and pg.input_value("#psDownInput") == "500")
        live = pg.evaluate("document.getElementById('psLive').textContent")
        check(f"{tag} the applied change is announced", "TEMPUR-Ergo" in live, live)
        pg.click("[data-ps-change='base-tempur-ergo']")
        pg.click("[data-ps-sheet-opt='base-bt3000']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        # ---- size change re-prices every line ----
        pg.click("[data-ps-size='king']")
        pg.wait_for_timeout(150)
        ksub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        check(f"{tag} King re-prices the purchase (no Queen carry-over)",
              ksub == money_minor(pg.evaluate(TXT, "[data-ps='mattress-price']")) + sum(money_minor(r["amount"]) for r in pg.evaluate(ROWS))
              and ksub != sub and ksub == pg.evaluate("buildConsultationQuote('handoff', 'king').merchandiseMinor"))
        check(f"{tag} the payment follows the new purchase immediately",
              money_minor(pg.evaluate(TXT, "[data-ps-big]")) == fixed_pay(ksub - 50000, FACTOR72))
        km = fixed_pay(ksub - 50000, FACTOR72)
        check(f"{tag} comparison rows show total paid including the down payment",
              f"{(50000 + km * 72) // 100:,}" in pg.evaluate(CARD, "demo-9-99-72"))
        # split King
        pg.click("[data-ps-split='on']")
        pg.wait_for_timeout(150)
        sl = next(r for r in pg.evaluate(ROWS) if r["id"] == "base-bt3000")
        txl = next(e["price"]["amountMinor"] for e in config["pricing"]["products"]
                   if e["productId"] == "base-bt3000" and e["sku"] == next(
                       a for a in accessories if a["id"] == "base-bt3000")["accessorySkus"]["twin_xl"])
        check(f"{tag} split King prices two Twin XL bases", money_minor(sl["amount"]) == 2 * txl, sl["amount"])
        check(f"{tag} the split is explicit in the cart (split flag, quantity 2)",
              pg.evaluate("window._accCart['base-bt3000'].split === true && window._accCart['base-bt3000'].quantity === 2"))
        bad = pg.evaluate("""() => { const sz = answers.mattress_size; answers.mattress_size = 'queen';
          const q = buildConsultationQuote('handoff', 'queen'); answers.mattress_size = sz;
          const l = q.lines.find(x => x.productId === 'base-bt3000'); return [q.status, l.reason]; }""")
        check(f"{tag} a split entry at Queen is unresolved, not a single base", bad == ["unresolved", "invalid-split"], str(bad))
        pg.click("[data-ps-size='queen']")
        pg.wait_for_timeout(150)
        check(f"{tag} leaving King returns the base to one unit",
              pg.evaluate("!window._accCart['base-bt3000'].split && window._accCart['base-bt3000'].quantity === 1"))
        # an unpriced choice: previewed honestly, applied honestly
        pg.click("[data-ps-size='twin']")
        pg.click("[data-ps-change='base-bt3000']")
        pg.click("[data-ps-sheet-opt='base-tempur-ergo']")
        pg.wait_for_timeout(150)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        check(f"{tag} an unpriced option is named in the preview, with no figure", "TEMPUR-Ergo" in pv and "$" not in pv, pv)
        pg.click("#psSheetApply")
        pg.wait_for_timeout(200)
        st = pg.evaluate(TXT, "[data-ps='subtotal']")
        check(f"{tag} an unpriced item makes the subtotal incomplete (never zero)",
              "$" not in st and pg.get_attribute("[data-ps='subtotal']", "class").find("is-incomplete") != -1, st)
        check(f"{tag} no payment is calculated from a partial subtotal",
              pg.evaluate("document.querySelector('[data-ps-big]')") is None and "$" not in (pg.evaluate(CARD, "demo-0-12") or ""))
        pg.click("[data-ps-size='queen']")
        pg.click("[data-ps-change='base-tempur-ergo']")
        pg.click("[data-ps-sheet-opt='base-bt3000']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(200)
        # ---- Change mattress: always there, preview, cancel, apply ----
        other = pg.evaluate("(window._savedPicks || []).map(p => p.id).filter(id => id !== window._favoriteMattressId)[0]")
        pg.evaluate("(id) => window._toggleSavePick(id)", other)   # leave ONE saved mattress
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(250)
        check(f"{tag} Change mattress is present with one saved mattress", pg.evaluate("!!document.getElementById('psChangeMattress')")
              and pg.evaluate("window._savedPicks.length") == 1)
        pg.click("#psChangeMattress")
        pg.wait_for_timeout(250)
        ids = pg.evaluate("Array.from(document.querySelectorAll('[data-ps-sheet-opt]')).map(b => b.dataset.psSheetOpt)")
        fav = pg.evaluate("window._favoriteMattressId")
        check(f"{tag} the mattress sheet lists the current mattress first, then alternatives, each once",
              ids and ids[0] == fav and len(ids) == len(set(ids)) and len(ids) > 3, str(ids))
        ranked = pg.evaluate("""() => ['gold','silver','bronze'].flatMap(t => (_resultsState.tierData[t] || []).slice(0, 3).map(m => m.id))""")
        check(f"{tag} recommended alternatives keep sleep-fit order", [i for i in ids if i in ranked] == [i for i in ranked if i in ids])
        state0 = pg.evaluate(STATE)
        alt = next(i for i in ids if i != fav and pg.evaluate(f"!(window._savedPicks || []).some(p => p.id === '{i}')"))
        pg.click(f"[data-ps-sheet-opt='{alt}']")
        pg.wait_for_timeout(200)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        alt_q = pg.evaluate("""(id) => { const pk = psPickProjection(id);
          return psQuote(answers.mattress_size, { finalistId: id, savedPicks: window._savedPicks.concat([pk]) }).merchandiseMinor; }""", alt)
        check(f"{tag} previewing an unsaved mattress shows its complete-system subtotal", alt_q and f"{alt_q / 100:,.2f}" in pv, pv)
        check(f"{tag} previewing a mattress changes nothing (finalist, saved list, cart, plan, down)", pg.evaluate(STATE) == state0)
        pg.click("#psSheetCancel")
        pg.wait_for_timeout(150)
        check(f"{tag} Cancel leaves the purchase unchanged and focus on Change mattress",
              pg.evaluate(STATE) == state0 and pg.evaluate("document.activeElement.id") == "psChangeMattress")
        pg.click("#psChangeMattress")
        pg.click(f"[data-ps-sheet-opt='{alt}']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(300)
        s1, st0 = json.loads(pg.evaluate(STATE)), json.loads(state0)
        check(f"{tag} Apply makes the alternative the finalist through the app's own selection",
              pg.evaluate("window._favoriteMattressId") == alt and alt in pg.evaluate("(window._savedPicks || []).map(p => p.id)"))
        check(f"{tag} size, Sleep System, quantities, plan and down payment survive the swap",
              s1["size"] == st0["size"] and s1["cart"] == st0["cart"] and s1["plan"] == st0["plan"] and s1["down"] == st0["down"])
        check(f"{tag} focus returns to Change mattress and the swap is announced",
              pg.evaluate("document.activeElement.id") == "psChangeMattress"
              and pg.evaluate("document.getElementById('psLive').textContent").strip() != "")
        pg.click("#psChangeMattress")
        pg.click(f"[data-ps-sheet-opt='{fav}']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(300)
        # ---- language switch preserves everything ----
        to = "en" if lang == "es" else "es"
        before = (pg.evaluate("_psPlan"), pg.input_value("#psDownInput"),
                  money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(TXT, "[data-ps-big]")))
        pg.evaluate(f"async () => {{ await switchLanguage('{to}'); }}")
        pg.wait_for_timeout(300)
        after = (pg.evaluate("_psPlan"), pg.input_value("#psDownInput"),
                 money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(TXT, "[data-ps-big]")))
        check(f"{tag} switching language keeps plan, down payment and every figure", before == after, f"{before} {after}")
        pg.evaluate("async () => { await switchLanguage('" + lang + "'); }")
        pg.wait_for_timeout(300)
        # ---- the same purchase on the other surfaces ----
        ref = pg.evaluate("psRefPlan().id")
        fin = pg.evaluate("window._favoriteMattressId")
        pg.evaluate("(id) => window.openMattressDrawer(id)", fin)
        pg.wait_for_timeout(400)
        dm = pg.evaluate("(document.querySelector('.drawer-price__monthly') || {}).textContent || ''")
        mp = pg.evaluate("(id) => pricePresentationFor('drawer', window._drawerData[id].m, answers.mattress_size, null).amountMinor", fin)
        plan_ref = next(p for p in plans if p["id"] == ref)
        exp_m = fixed_pay(mp, plan_ref["demoCalculation"]["factor"]) if plan_ref["demoCalculation"]["mode"] == "published-fixed-factor" \
            else eq_pay(mp, plan_ref["termMonths"])
        check(f"{tag} the drawer shows the mattress's monthly example under the plan in view",
              money_minor(dm) == exp_m and ("example" in dm or "ejemplo" in dm), dm)
        pg.evaluate("window.closeMattressDrawer()")
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        # Bring It Home: example figures and the route back
        pg.evaluate("() => document.getElementById('hf2FinancingExplore').click()")
        pg.wait_for_timeout(500)
        pg.evaluate("""() => { const r = Array.from(document.querySelectorAll('#financingSheetCards .fin-ws-row'))
          .find(b => /Demo/.test(b.textContent)); if (r) r.click(); }""")
        pg.wait_for_timeout(500)
        fx = pg.evaluate("""document.querySelectorAll('.fin-fx[data-fx-plan^="demo-"][data-fx-state="calculated"]').length""")
        sheet = pg.evaluate("(document.getElementById('financingSheetCards') || {}).textContent || ''")
        check(f"{tag} payment details: no governed figure and no 'published' claim for an example plan",
              fx == 0 and "as published" not in sheet and "según lo publicado" not in sheet, f"fx={fx}")
        sheet_plans = pg.evaluate("""() => Array.from(document.querySelectorAll('[data-ps-sheet-plan]')).map(li =>
          [li.dataset.psSheetPlan, (li.querySelector('.ps-sheet__amount') || {}).textContent || ''])""")
        studio_cards = pg.evaluate("""() => purchaseStudioFor().cards.filter(c => c.kind === 'calc').map(c => [c.id, c.monthly])""")
        check(f"{tag} Bring It Home lists every example plan with the Summary's own monthly figure",
              len(sheet_plans) == 4 and all(money_minor(a) == money_minor(dict(studio_cards)[i]) for i, a in sheet_plans), str(sheet_plans))
        pg.evaluate("() => document.getElementById('psSheetGo').click()")
        pg.wait_for_timeout(500)
        check(f"{tag} Bring It Home routes back to the Summary's comparison",
              pg.evaluate("document.getElementById('financingSheet').hidden === true")
              and pg.evaluate("document.activeElement && document.activeElement.id") == "psTitle")
        cur_sub = pg.evaluate("buildConsultationQuote('handoff', answers.mattress_size).merchandiseMinor")
        cur_pay = money_minor(pg.evaluate(TXT, "[data-ps-big]"))
        pg.evaluate("window.showEmailCapture()")
        pg.wait_for_timeout(400)
        th = pg.evaluate("document.getElementById('emailPreview').textContent")
        check(f"{tag} the take-home preview carries the same subtotal and payment as the Summary",
              f"{cur_sub // 100:,}" in th and cur_pay is not None and f"${cur_pay // 100:,}/m" in th, th[-240:])
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{tag} no horizontal overflow", overflow <= 1, str(overflow))
        small = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio button')).filter(b => {
          const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length""")
        check(f"{tag} every studio control meets the 44px touch floor", small == 0, str(small))
        pg.click("#psChangeMattress")
        pg.wait_for_timeout(200)
        small = pg.evaluate("""() => Array.from(document.querySelectorAll('#psSheet button')).filter(b => {
          const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length""")
        check(f"{tag} every sheet control meets the 44px touch floor", small == 0, str(small))
        # ---- new-customer wipe (with the sheet open) ----
        pg.evaluate("resetSessionState()")
        pg.wait_for_timeout(200)
        check(f"{tag} the wipe clears plan, down payment, the studio and the open sheet",
              pg.evaluate("_psPlan") == "full" and pg.evaluate("_psDownRaw") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').innerHTML") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').hidden") is True
              and pg.evaluate("document.getElementById('psSheet').hidden") is True
              and pg.evaluate("document.getElementById('psLive').textContent") == "")
        check(f"{tag} no console errors", not errs, str(errs[:3]))
        pg.close()

    # shipped data: nothing renders; recommendations identical
    pg = browser.new_page(viewport={"width": 1180, "height": 820})
    pg.goto(PLAIN_URL)
    pg.wait_for_function(READY, timeout=20000)
    rec_plain = recommended(pg)
    pg.evaluate("""async () => { const ids = Object.keys(window._drawerData || {});
      window.chooseFinalist(ids[0]); window.showSavedPicks(); }""")
    pg.wait_for_timeout(300)
    check("shipped data: the studio renders nothing",
          pg.evaluate("document.getElementById('purchaseStudio').hidden") is True
          and pg.evaluate("document.getElementById('purchaseStudio').innerHTML") == "")
    check("shipped data: the model declines", pg.evaluate("purchaseStudioFor().show") is False)
    pg.close()
    pg = browser.new_page(viewport={"width": 1180, "height": 820})
    pg.goto(DEMO_URL)
    pg.wait_for_function(READY, timeout=20000)
    check("sleep fit unchanged: the same answers give the same recommendations with demo prices on",
          recommended(pg) == rec_plain, str(rec_plain[:5]))
    pg.close()

    # ---- the demo admission boundary ------------------------------------
    print("Demo admission boundary:")
    PROBE = r"""() => { const ids = Object.keys(window._drawerData || {});
      const out = { prices: 0, studio: (typeof purchaseStudioFor === 'function') ? purchaseStudioFor().show : null,
                    admitted: !!demoAdmission(), plans: 0 };
      for (const id of ids) { const m = window._drawerData[id].m;
        for (const z of ['twin','twin_xl','full','queen','king','cal_king']) {
          if (pricePresentationFor('drawer', m, z, null).state === 'available') out.prices++; } }
      const f = getFinancingConfig();
      (f && f.plans || []).forEach(p => { if (financingPlanFresh(p)) out.plans++; });
      return out; }"""
    pg = browser.new_page(viewport={"width": 1180, "height": 820})
    errs = []
    pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
    pg.goto(FLAG_ONLY_URL + "?demo=1&state=demo&illustrativeDemo=1")
    pg.wait_for_function(READY, timeout=20000)
    recommended(pg)
    r0 = pg.evaluate(PROBE)
    check("demo config WITHOUT the harness context admits nothing (no price, no plan, no studio)",
          r0["admitted"] is False and r0["prices"] == 0 and r0["plans"] == 0 and not r0["studio"], str(r0))
    check("the production gate refuses every demo entry: assembly time cannot make real evidence current",
          r0["prices"] == 0)
    pg.evaluate("""() => { try { localStorage.setItem('__DF_DEMO_CONTEXT', '1'); localStorage.setItem('illustrativeDemo', 'true');
      sessionStorage.setItem('demo', '1'); } catch (e) {} }""")
    check("URL parameters and storage values cannot activate it", pg.evaluate(PROBE)["admitted"] is False)
    nonce = demo_cfg["contextNonce"]
    pg.evaluate("(n) => { window.__DF_DEMO_CONTEXT = { harness: 'serve_pricing_preview', state: 'demo', nonce: n }; }", nonce)
    check("an unfrozen hand-made context is refused", pg.evaluate(PROBE)["admitted"] is False)
    pg.close()
    pg = browser.new_page(viewport={"width": 1180, "height": 820})
    pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
    pg.goto(FLAG_ONLY_URL)
    pg.wait_for_function(READY, timeout=20000)
    pg.evaluate("() => { window.__DF_DEMO_CONTEXT = Object.freeze({ harness: 'serve_pricing_preview', state: 'demo', nonce: '0'.repeat(32) }); }")
    check("a context with another run's nonce is refused (inconsistent context fails closed)",
          pg.evaluate(PROBE)["admitted"] is False)
    pg.close()
    pg = browser.new_page(viewport={"width": 1180, "height": 820})
    pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
    pg.goto(DEMO_URL)
    pg.wait_for_function(READY, timeout=20000)
    recommended(pg)
    r1 = pg.evaluate(PROBE)
    check("context AND matching validated config: prices and example plans admitted",
          r1["admitted"] is True and r1["prices"] == 6 * pg.evaluate("Object.keys(window._drawerData).length")
          and r1["plans"] == 4, str(r1))
    check("the real programs are still judged by the production gate (none fresh: exact terms stay off)",
          pg.evaluate("getFinancingConfig().plans.filter(p => p.demo !== true).every(p => !financingPlanFresh(p))"))
    check("the harness context cannot be overwritten", pg.evaluate("""() => { try { window.__DF_DEMO_CONTEXT = null; } catch (e) {}
      return !!window.__DF_DEMO_CONTEXT && Object.isFrozen(window.__DF_DEMO_CONTEXT); }"""))
    for label, js in (
        ("config nonce changed", "STORE_CONFIG.illustrativeDemo.contextNonce = 'f'.repeat(32)"),
        ("assembly time removed", "delete STORE_CONFIG.illustrativeDemo.assembledAt"),
        ("contract changed", "STORE_CONFIG.illustrativeDemo.contract = 'payment-demo/2'"),
        ("a live gasUrl", "STORE_CONFIG.gasUrl = 'https://script.google.com/x'"),
    ):
        got = pg.evaluate("(js) => { const save = JSON.stringify(STORE_CONFIG); (new Function(js))(); const a = !!demoAdmission();"
                          " const s = JSON.parse(save); Object.keys(STORE_CONFIG).forEach(k => delete STORE_CONFIG[k]);"
                          " Object.assign(STORE_CONFIG, s); return a; }", js)
        check(f"inconsistent demo context fails closed: {label}", got is False)
    # malformed data is refused in demo mode, item by item
    MAL = r"""(o) => { const p = getPricingConfig(); const m = window._drawerData[o.id].m; const z = 'queen';
      const sku = pricingSkuFor(m, z); const e = p.products.find(x => x.sku === sku); const save = JSON.stringify(e);
      (new Function('e', o.js))(e); const st = pricePresentationFor('drawer', m, z, null).state;
      Object.assign(e, JSON.parse(save)); Object.keys(e).forEach(k => { if (!(k in JSON.parse(save))) delete e[k]; });
      return st; }"""
    first = pg.evaluate("Object.keys(window._drawerData)[0]")
    for label, js in (
        ("a negative price", "e.price.amountMinor = -500"),
        ("a fractional price", "e.price.amountMinor = 1000.5"),
        ("a foreign currency", "e.price.currency = 'XXX'"),
        ("a production evidence status", "e.evidence.status = 'retailer-product-page-current'"),
        ("a claimed verification", "e.evidence.verified = true"),
        ("a verification time", "e.evidence.verifiedAt = new Date().toISOString()"),
        ("a historical observation after assembly", "e.evidence.status = 'historical-snapshot'; e.evidence.observedAt = '2099-01-01T00:00:00Z'; e.evidence.sourceUrl = 'https://www.lacks.com/x'; delete e.evidence.method"),
        ("a wrong size", "e.size = 'king'"),
        ("another product's id", "e.productId = 'zz-not-a-product'"),
    ):
        st = pg.evaluate(MAL, {"id": first, "js": js})
        check(f"demo mode refuses {label} (no price shown)", st == "off", st)
    PLAN = r"""(js) => { const pl = getFinancingConfig().plans.find(p => p.id === 'demo-9-99-72'); const save = JSON.stringify(pl);
      (new Function('p', js))(pl); const ok = financingPlanFresh(pl);
      const s = JSON.parse(save); Object.keys(pl).forEach(k => delete pl[k]); Object.assign(pl, s); return ok; }"""
    for label, js in (
        ("a factor of 2", "p.demoCalculation.factor = 2"),
        ("a factor needing a seventh decimal", "p.demoCalculation.factor = 0.0185211"),
        ("an unsupported method", "p.demoCalculation.mode = 'amortization'"),
        ("no rounding rule", "delete p.demoCalculation.rounding"),
        ("a term of 0", "p.termMonths = 0"),
        ("a plan marked verified", "p.verified = true"),
        ("a plan with calculation switched on", "p.paymentCalculationEnabled = true"),
    ):
        check(f"demo mode refuses an example plan with {label}", pg.evaluate(PLAN, js) is False)
    check("no page errors across the boundary probes", not errs, str(errs[:3]))
    pg.close()
    browser.close()
demo_srv.shutdown()
plain_srv.shutdown()
flag_only_srv.shutdown()

print(f"\nPayment demo check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
