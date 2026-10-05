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
TOKENS = ("illustrativeDemo", "payment-demo", "payment-demo.invalid", "DEMO-", "ILLUSTRATIVE DEMO")
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
check("index.html never names a demo plan, host or price file",
      not any(t in _read("index.html") for t in ("payment-demo", "demo-0-12", "demo-9-99", "illustrative-prices")))

# ---- 2. the demo build ----------------------------------------------------------
print("Demo build:")
start = datetime.now(timezone.utc).astimezone()
config, catalog, verdicts, accessories = sp.build_injected("demo", start)
check("demo financing validates", verdicts["financing_ok"], str(verdicts["financing_errors"][:3]))
check("demo dark pricing validates", verdicts["dark_ok"], str(verdicts["dark_errors"][:3]))
check("the opened form is still refused by the production validator", verdicts["served_refused"])
check("harness accepts the demo state", sp.dark_form_acceptable("demo", verdicts))
check("gasUrl stays blank", not config.get("gasUrl"))
check("no review tools in the demo", "reviewTools" not in config)
demo_cfg = config.get("illustrativeDemo") or {}
check("illustrativeDemo is enabled with a bilingual notice",
      demo_cfg.get("enabled") is True and demo_cfg.get("notice", {}).get("en") and demo_cfg.get("notice", {}).get("es"))
sizes = ("twin", "twin_xl", "full", "queen", "king", "cal_king")
unpriced = [(m["id"], z) for t in sp.TIER_ORDER for m in catalog[t] for z in sizes if z not in (m.get("skus") or {})]
check("every catalog mattress is priced in every size", not unpriced, str(unpriced[:5]))
prices = {e["sku"]: e["price"]["amountMinor"] for e in config["pricing"]["products"]}
cov = verdicts["websiteCoverage"]
check("every capture price is served unchanged",
      all(prices.get(h["sku"]) == h["amountMinor"] for h in cov["historical"]) and len(cov["historical"]) > 40)
ill = set(demo_cfg.get("illustrativeSkus") or [])
check("every illustrative fill is declared for marking, and nothing else",
      ill == {r["sku"] for r in cov["illustrative"]} and not (ill & {h["sku"] for h in cov["historical"]}))
check("every illustrative fill names its method", all(r.get("method") for r in cov["illustrative"]))
fills = json.loads(_read("demo/payment-demo/illustrative-prices.json"))
check("the illustrative price file is labelled non-production", "NOT Lacks prices" in fills["_meta"]["purpose"])
plans = [p for p in config["financing"]["plans"] if p.get("paymentCalculationEnabled")]
check("four example plans calculate, each with provider 'Demo' and an illustrative source",
      len(plans) == 4 and all(p["provider"] == "Demo" and "payment-demo.invalid" in p["sourceUrl"] for p in plans))
for p in plans:
    if p["calculationMode"] == "published-fixed-factor":
        r = p["apr"] / 100 / 12
        f = round(r / (1 - (1 + r) ** -p["termMonths"]), 6)
        check(f"{p['id']}: the example factor is the amortization factor ({f})", p["publishedPaymentFactor"] == f)
    else:
        check(f"{p['id']}: equal division is 0% APR only", p["apr"] == 0)
check("every example plan says it is illustrative, in both languages",
      all("Illustrative" in p["detail"]["en"] and "ilustrativo" in p["detail"]["es"].lower() for p in plans))
ltO = [p for p in config["financing"]["plans"] if p.get("kind") == "lease-to-own"]
check("lease-to-own is present and never calculates", len(ltO) == 1 and ltO[0].get("paymentCalculationEnabled") is False)

# ---- 3. device mode -------------------------------------------------------------
print("Device mode:")
bundle = sp.device_bundle("192.168.1.20", "demo", {"historical": 1, "illustrative": 2, "plans": 4})
page = bundle["page"].decode("utf-8")
check("demo page carries the operator area", 'id="dfDemoOperator"' in page and "Load a demo scenario" in page)
check("demo page carries no drill banner", "FIXTURE PRICES ONLY" not in page and sp.BANNER_ID not in page)
other = sp.device_bundle("192.168.1.20", "payments")["page"].decode("utf-8")
check("other states keep the diagnostic banner", "FIXTURE PRICES ONLY" in other and "dfDemoOperator" not in other)
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


demo_page = sp.rehearsal_page("demo", "127.0.0.1", {"historical": 0, "illustrative": 0, "plans": 4})
demo_srv = serve(sp.make_handler(sp.encode(config), sp.encode(catalog), sp.encode(accessories), None, demo_page))
plain_srv = serve(functools.partial(Quiet, directory=REPO))
DEMO_URL = f"http://127.0.0.1:{demo_srv.server_address[1]}/"
PLAIN_URL = f"http://127.0.0.1:{plain_srv.server_address[1]}/"
READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
ANSWERS = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
           "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
           "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
TXT = "(sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\\s+/g, ' ').trim() : null; }"
LINES = """() => Array.from(document.querySelectorAll('#purchaseStudio .ps-line')).map(l => ({
  id: l.dataset.psLine, amount: l.querySelector('.ps-line__amount').textContent.trim(),
  effect: (l.querySelector('.ps-line__effect') || {}).textContent || '' }))"""
CARD = """(id) => { const c = document.querySelector('#purchaseStudio [data-ps-plan="' + id + '"]');
  return c ? c.textContent.replace(/\\s+/g, ' ').trim() : null; }"""
FIG = """(k) => { const f = document.querySelector('#psResultBox [data-ps-fig="' + k + '"] .ps-fig__value');
  return f ? f.textContent.trim() : null; }"""


def ceil_div(a, b):
    return -(-a // b)


def fixed_pay(principal, factor):
    micro = round(factor * 1_000_000)
    return ceil_div(principal * micro, 100_000_000) * 100


def eq_pay(principal, term):
    return ceil_div(principal, term * 100) * 100


FACTOR72 = next(p["publishedPaymentFactor"] for p in plans if p["id"] == "demo-9-99-72")


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
        pg.wait_for_function("() => { const b = document.getElementById('purchaseStudio'); return b && !b.hidden && b.querySelector('.ps-line'); }", timeout=10000)
        # Loading a scenario is a new customer (English); the customer then
        # chooses their language.
        if lang == "es":
            pg.evaluate("async () => { await switchLanguage('es'); }")
            pg.wait_for_timeout(300)
        notice = pg.evaluate(TXT, "#purchaseStudio .ps-notice")
        check(f"{tag} the bilingual demo notice shows", notice == demo_cfg["notice"][lang], notice)
        lines = pg.evaluate(LINES)
        sub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        total = sum(money_minor(l["amount"]) or 0 for l in lines)
        check(f"{tag} itemised lines sum to the merchandise subtotal", sub == total and len(lines) == 4, f"{sub} vs {total}")
        quote_minor = pg.evaluate("buildConsultationQuote('handoff', 'queen').merchandiseMinor")
        check(f"{tag} the subtotal is the quote model's own amount", sub == quote_minor)
        full = money_minor(pg.evaluate(CARD, "full"))
        check(f"{tag} pay in full shows the subtotal", full == sub)
        c72 = pg.evaluate(CARD, "demo-9-99-72")
        check(f"{tag} 9.99%/72 card: payment = subtotal x factor, rounded up to the dollar",
              money_minor(c72) == fixed_pay(sub, FACTOR72), c72)
        c12 = pg.evaluate(CARD, "demo-0-12")
        check(f"{tag} 0%/12 card: equal division rounded up to the dollar", money_minor(c12) == eq_pay(sub, 12), c12)
        lto = pg.evaluate(CARD, "lease-to-own")
        check(f"{tag} lease-to-own reads To confirm with no figure",
              lto is not None and ("To confirm" in lto or "Por confirmar" in lto) and "$" not in lto, lto)
        # select the 72-month plan: the result and the per-item effects
        pg.click("[data-ps-plan='demo-9-99-72']")
        monthly = money_minor(pg.evaluate(FIG, "monthly"))
        sched = money_minor(pg.evaluate(FIG, "scheduled"))
        check(f"{tag} selected plan: monthly and total of payments agree", monthly == fixed_pay(sub, FACTOR72) and sched == monthly * 72)
        base_line = next(l for l in pg.evaluate(LINES) if l["id"] == "base-bt3000")
        base_amt = money_minor(base_line["amount"])
        expect = fixed_pay(sub, FACTOR72) - fixed_pay(sub - base_amt, FACTOR72)
        check(f"{tag} the base's monthly effect is the difference of two complete quotes",
              money_minor(base_line["effect"]) == expect, base_line["effect"])
        # voluntary down payment
        pg.fill("#psDownInput", "500")
        check(f"{tag} typing keeps focus in the down-payment field", pg.evaluate("document.activeElement.id") == "psDownInput")
        check(f"{tag} a down payment lowers the amount financed and the payment",
              money_minor(pg.evaluate(FIG, "financed")) == sub - 50000
              and money_minor(pg.evaluate(FIG, "monthly")) == fixed_pay(sub - 50000, FACTOR72))
        for bad in ("-5", "abc", str(sub // 100 + 10)):
            pg.fill("#psDownInput", bad)
            check(f"{tag} down payment {bad!r} is refused and no payment shows",
                  "is-error" in (pg.get_attribute("#psDownMsg", "class") or "") and pg.evaluate(FIG, "monthly") is None)
        pg.fill("#psDownInput", "500")
        # size change re-prices every line
        pg.click("[data-ps-size='king']")
        pg.wait_for_timeout(150)
        king = pg.evaluate(LINES)
        ksub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        check(f"{tag} King re-prices the purchase (no Queen carry-over)",
              ksub == sum(money_minor(l["amount"]) for l in king) and ksub != sub
              and ksub == pg.evaluate("buildConsultationQuote('handoff', 'king').merchandiseMinor"))
        check(f"{tag} the size answer itself changed", pg.evaluate("answers.mattress_size") == "king")
        check(f"{tag} the payment follows the new purchase immediately",
              money_minor(pg.evaluate(FIG, "monthly")) == fixed_pay(ksub - 50000, FACTOR72))
        # unpriced item -> incomplete, no figures
        pg.click("[data-ps-size='twin']")
        pg.click("[data-ps-opt='base-tempur-ergo']")
        pg.wait_for_timeout(150)
        st = pg.evaluate(TXT, "[data-ps='subtotal']")
        check(f"{tag} an unpriced item makes the subtotal incomplete (never zero)",
              "$" not in st and pg.get_attribute("[data-ps='subtotal']", "class").find("is-incomplete") != -1, st)
        check(f"{tag} no payment is calculated from a partial subtotal",
              pg.evaluate(FIG, "monthly") is None and "$" not in (pg.evaluate(CARD, "demo-0-12") or ""))
        check(f"{tag} the unpriced item is named", "TEMPUR-Ergo" in (pg.evaluate(TXT, ".ps-warn") or ""))
        pg.click("[data-ps-size='queen']")
        pg.click("[data-ps-opt='base-bt3000']")
        pg.wait_for_timeout(150)
        # finalist switch keeps the Sleep System
        cart_before = pg.evaluate("Object.keys(window._accCart).sort()")
        other = pg.evaluate("(window._savedPicks || []).map(p => p.id).filter(id => id !== window._favoriteMattressId)[0]")
        pg.click(f"[data-ps-pick='{other}']")
        pg.wait_for_timeout(150)
        check(f"{tag} switching the priced mattress keeps the Sleep System",
              pg.evaluate("window._favoriteMattressId") == other
              and pg.evaluate("Object.keys(window._accCart).sort()") == cart_before)
        # language switch preserves everything
        to = "en" if lang == "es" else "es"
        before = (pg.evaluate("_psPlan"), pg.input_value("#psDownInput"),
                  money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(FIG, "monthly")))
        pg.evaluate(f"async () => {{ await switchLanguage('{to}'); }}")
        pg.wait_for_timeout(300)
        after = (pg.evaluate("_psPlan"), pg.input_value("#psDownInput"),
                 money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(FIG, "monthly")))
        check(f"{tag} switching language keeps plan, down payment and every figure", before == after, f"{before} {after}")
        overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{tag} no horizontal overflow", overflow <= 1, str(overflow))
        small = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio button')).filter(b => {
          const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length""")
        check(f"{tag} every studio control meets the 44px touch floor", small == 0, str(small))
        # new-customer wipe
        pg.evaluate("resetSessionState()")
        pg.wait_for_timeout(200)
        check(f"{tag} the wipe clears plan, down payment and the studio",
              pg.evaluate("_psPlan") == "full" and pg.evaluate("_psDownRaw") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').innerHTML") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').hidden") is True)
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
    browser.close()
demo_srv.shutdown()
plain_srv.shutdown()

print(f"\nPayment demo check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
