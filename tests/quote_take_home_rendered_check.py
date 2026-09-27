#!/usr/bin/env python3
"""Accessory sizes on the quote and quantities in the take-home plan, RENDERED
(PR #132 review repairs, 2026-09-27). The real page in headless Chromium over
loopback servers, in English and Spanish, at both tablet orientations.

WHY THIS EXISTS. Three review findings on PR #132, each invisible to a static
suite because each is about what a customer is shown:

  1. An accessory family with two admissible size variants made the documented
     `--state website` preview refuse to start (duplicate accessory identity).
  2. The itemised quote discarded an accessory's size, so a Queen and a King
     protector - different products at different prices - read identically.
  3. The customer's quantities stayed on the cart: four pillows were described
     as "1 piece" in the take-home preview and left the kiosk as one
     unquantified item.

WHAT IT PROVES (priced walk, a synthetic website capture served by the REAL
tools/serve_pricing_preview.py; every amount here is synthetic test data):
  * the preview builds and is accepted with a Queen AND a King variant of one
    protector family beside a size-independent pillow;
  * a Queen customer's itemised line for that protector reads Queen at the
    Queen amount, a King customer's reads King at the King amount;
  * the size-independent pillow line names no size, and carries its count;
  * the lines reconcile to the merchandise subtotal on screen;
  * a language switch on the Summary repaints the lines in the other language
    with the same sizes, counts and amounts, and the selection survives;
  * the new-customer wipe empties and hides the subtotal and returns to
    English.

WHAT IT PROVES (take-home walk, the REAL tools/serve_delivery_preview.py
loopback stub, and the shipped preview mode):
  * three of one pillow, one of another and a protector read "5 pieces" with
    each product's own count beside its name, in both languages;
  * the row fits its card at 1194x748 and 834x1108 (no horizontal overflow);
  * a language switch on the take-home screen keeps the cart and repaints;
  * the ONE payload that reaches the stub carries quantity 3, 1, 1 on entries
    of exactly name/category/quantity/imageUrl, in the customer's language;
  * in the shipped preview mode nothing is posted at all;
  * the wipe clears the preview and the cart and returns to English;
  * no page error, no console error, and no request off loopback, anywhere.

Run: python tests/quote_take_home_rendered_check.py
"""
import io
import json
import os
import shutil
import sys
import tempfile
import threading
from datetime import datetime, timedelta, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as pricing  # noqa: E402
import serve_delivery_preview as delivery  # noqa: E402
from map_app_to_website import SIZE_INDEPENDENT_KEY  # noqa: E402

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


def load(*parts):
    with io.open(os.path.join(REPO, *parts), encoding="utf-8") as f:
        return json.load(f)


VIEWPORTS = [("landscape 1194x748", 1194, 748), ("portrait 834x1108", 834, 1108)]
LANGS = ("en", "es")
OTHER = {"en": "es", "es": "en"}
CATALOG = load("data", "mattresses.json")
ACCESSORIES = load("data", "accessories.json")
QUIZ = load("data", "quiz.json")
HOST = load("tools", "source_hosts.json")["priceSourceHosts"][0]
MATTRESS_IDS = [m["id"] for tier in ("gold", "silver", "bronze") for m in CATALOG.get(tier, [])]
PILLOWS = [a for a in ACCESSORIES if a["id"].startswith("pillow-")]
PROTECTORS = [a for a in ACCESSORIES if a["id"].startswith("protector-")]
PILLOW_A, PILLOW_B, PROTECTOR = PILLOWS[0], PILLOWS[1], PROTECTORS[0]


def quiz_questions():
    return QUIZ["questions"] if isinstance(QUIZ, dict) else QUIZ


SIZE_LABEL = {o["id"]: o["label"] for q in quiz_questions() if q["id"] == "mattress_size" for o in q["options"]}

ANSWERS = {
    "sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
    "temperature": "hot", "firmness": 5, "partner_sleep": "partner", "partner_disturbance": "sometimes",
    "body_type": "average",
}

# ---- synthetic website capture (test data; nothing here is a retailer price) ----
START = datetime(2026, 9, 25, 15, 0, 0, tzinfo=timezone.utc)
OBSERVED = (START - timedelta(hours=1)).isoformat()
MATTRESS_MINOR = {"queen": 199900, "king": 249900}
PROTECTOR_MINOR = {"queen": 8900, "king": 10900}
PILLOW_MINOR = 9900
PILLOW_QTY = 2


def variant(sku, amount):
    return {"sku": sku, "sellingAmountMinor": amount, "currency": "USD", "observedAt": OBSERVED,
            "evidence": {"type": "product-page", "url": f"https://{HOST}/product/{sku}"}}


def build_priced_state():
    variants, mattresses = [], []
    for mid in MATTRESS_IDS:
        sizes = {}
        for size, amount in MATTRESS_MINOR.items():
            sku = f"T-{mid}-{size}"
            variants.append(variant(sku, amount))
            sizes[size] = {"status": "preview-eligible", "sku": sku}
        mattresses.append({"appId": mid, "appName": mid, "sizes": sizes})
    for size, amount in PROTECTOR_MINOR.items():
        variants.append(variant(f"T-prot-{size}", amount))
    variants.append(variant("T-pillow", PILLOW_MINOR))
    accessories = [
        {"appId": PROTECTOR["id"], "status": "preview-eligible", "familyKey": "synthetic",
         "variants": {size: {"sku": f"T-prot-{size}"} for size in PROTECTOR_MINOR}},
        {"appId": PILLOW_A["id"], "status": "preview-eligible", "familyKey": "synthetic",
         "variants": {SIZE_INDEPENDENT_KEY: {"sku": "T-pillow"}}},
    ]
    tmp = tempfile.mkdtemp(prefix="quote_rendered_")
    old = (pricing.SNAPSHOT, pricing.MAPPING)
    try:
        snap, mapping = os.path.join(tmp, "snapshot.json"), os.path.join(tmp, "mapping.json")
        with io.open(snap, "w", encoding="utf-8") as f:
            json.dump({"_meta": {}, "variants": variants}, f)
        with io.open(mapping, "w", encoding="utf-8") as f:
            json.dump({"mattresses": mattresses, "accessories": accessories}, f)
        pricing.SNAPSHOT, pricing.MAPPING = snap, mapping
        return pricing.build_injected("website", START)
    finally:
        pricing.SNAPSHOT, pricing.MAPPING = old
        shutil.rmtree(tmp, ignore_errors=True)


def serve(handler):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


def plain_handler():
    class Quiet(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=REPO, **k)

        def log_message(self, *_):
            pass

        def end_headers(self):
            self.send_header("Cache-Control", "no-store")
            super().end_headers()
    return Quiet




# Reaches the Consultation Summary through the app's own public functions
# with a chosen finalist and the Sleep System built, in ARGS.lang.
BUILD_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const t0 = Date.now ? performance.now() : 0;
  while (performance.now() - t0 < 8000) {
    if (typeof ACCESSORIES !== 'undefined' && Array.isArray(ACCESSORIES) && ACCESSORIES.length
        && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true) break;
    await wait(50);
  }
  startQuiz(); await wait(150);
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  if (ARGS.lang === 'es') { await switchLanguage('es'); await wait(200); }
  showProfileScreen();
  window.showResults(); await wait(300);
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories('pillow'); await wait(300);
  for (const sel of ARGS.select) {
    setSleepSystemItem(sel.id, true);
    if (sel.quantity > 1) setSleepSystemItemQuantity(sel.id, sel.quantity);
  }
  window.showSavedPicks(); await wait(300);
  return { screen: (document.querySelector('.screen.active') || {}).id, lang: currentLang,
           finalist: _resultsState.tierData.gold[0].id };
}
"""

STATE_JS = r"""
() => {
  const box = document.getElementById('hf2SystemTotal');
  const items = Array.from(document.querySelectorAll('#hf2SystemTotal .hf2-system-total__item')).map((li) => {
    const size = li.querySelector('.hf2-system-total__item-size');
    const name = li.querySelector('.hf2-system-total__item-name');
    const amount = li.querySelector('.hf2-system-total__item-amount');
    return { name: name ? name.textContent : null, size: size ? size.textContent : null,
             amount: amount ? amount.textContent : null };
  });
  const total = document.querySelector('#hf2SystemTotal .hf2-system-total__amount');
  const preview = document.getElementById('emailPreview');
  const rows = Array.from(document.querySelectorAll('#emailPreview .email-save-row')).map((row) => ({
    title: (row.querySelector('.email-save-title') || {}).textContent || '',
    details: Array.from(row.querySelectorAll('.email-save-detail')).map((d) => d.textContent),
    items: (row.querySelector('.email-save-items') || {}).textContent || null,
    overflow: row.scrollWidth > row.clientWidth + 1,
    itemsHeight: row.querySelector('.email-save-items') ? row.querySelector('.email-save-items').getBoundingClientRect().height : 0,
  }));
  const doc = document.documentElement;
  return {
    screen: (document.querySelector('.screen.active') || {}).id, lang: currentLang,
    cart: Object.fromEntries(Object.entries(window._accCart || {}).map(([id, e]) => [id, e.quantity])),
    totalHidden: box ? box.hidden : null, totalState: box ? box.getAttribute('data-total-state') : null,
    totalHtml: box ? box.innerHTML : null, items, total: total ? total.textContent : null,
    previewHtml: preview ? preview.innerHTML : null, rows,
    bodyText: document.body ? document.body.innerText : '',
    pageOverflow: doc.scrollWidth > doc.clientWidth + 1,
    previewOverflow: preview ? preview.scrollWidth > preview.clientWidth + 1 : null,
  };
}
"""

SEND_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById('emailNameInput').value = ARGS.name;
  document.getElementById('emailInput').value = ARGS.email;
  document.getElementById('emailPhoneInput').value = ARGS.phone;
  window.sendResults();
  const btn = document.getElementById('emailSendBtn');
  const err = document.getElementById('emailError');
  const t0 = performance.now();
  while (performance.now() - t0 < 6000) {
    if (btn.classList.contains('sent') || (err.textContent && err.textContent.trim())) break;
    await wait(50);
  }
  await wait(100);
  return { sent: btn.classList.contains('sent'), error: err.textContent };
}
"""

TYPED = {"name": "Test Customer", "email": "customer@example.test", "phone": "9565550100"}


def money(minor):
    whole = minor % 100 == 0
    return "${:,.0f}".format(minor / 100) if whole else "${:,.2f}".format(minor / 100)


def cents(text):
    return int(round(float(text.replace("$", "").replace(",", "")) * 100))


def open_page(browser, url, width, height, clock=None):
    page = browser.new_page(viewport={"width": width, "height": height})
    log = {"errors": [], "console": [], "requests": []}
    page.on("pageerror", lambda e: log["errors"].append(str(e)))
    page.on("console", lambda m: log["console"].append(m.text) if m.type == "error" else None)
    page.on("request", lambda r: log["requests"].append((r.method, r.url)))
    if clock is not None:
        page.clock.set_fixed_time(clock)
    page.goto(url, wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    return page, log


def clean(tag, log):
    off = [u for _, u in log["requests"] if urlparse(u).hostname not in ("127.0.0.1", "localhost")]
    check(f"{tag}: no page error and no console error", not log["errors"] and not log["console"],
          str((log["errors"] + log["console"])[:2])[:200])
    check(f"{tag}: every request stayed on loopback", not off, str(off[:2]))


def localized(record, field, lang):
    value = record[field]
    return value[lang] if isinstance(value, dict) else value


def expect_lines(tag, state, lang, size):
    items = state["items"]
    names = [i["name"] or "" for i in items]
    prot = next((i for i in items if localized(PROTECTOR, "name", lang) in (i["name"] or "")), None)
    pil = next((i for i in items if localized(PILLOW_A, "name", lang) in (i["name"] or "")), None)
    check(f"{tag}: the subtotal is shown, complete, with three itemised lines",
          state["totalHidden"] is False and state["totalState"] == "complete" and len(items) == 3, f"{state['totalState']} {names}")
    check(f"{tag}: the protector line names its size ({SIZE_LABEL[size][lang]}) at that size's own amount ({money(PROTECTOR_MINOR[size])})",
          bool(prot) and prot["size"] == SIZE_LABEL[size][lang] and prot["amount"] == money(PROTECTOR_MINOR[size]), str(prot))
    other = "king" if size == "queen" else "queen"
    check(f"{tag}: the other size's amount ({money(PROTECTOR_MINOR[other])}) appears nowhere",
          money(PROTECTOR_MINOR[other]) not in (state["totalHtml"] or ""))
    check(f"{tag}: the size-independent pillow line names NO size, and carries its count and extended amount",
          bool(pil) and pil["size"] is None and pil["name"].rstrip().endswith(f"{PILLOW_QTY}")
          and pil["amount"] == money(PILLOW_MINOR * PILLOW_QTY), str(pil))
    check(f"{tag}: the mattress line names the customer's size",
          bool(items) and items[0]["size"] == SIZE_LABEL[size][lang], str(items[:1]))
    expected = MATTRESS_MINOR[size] + PROTECTOR_MINOR[size] + PILLOW_MINOR * PILLOW_QTY
    try:
        reconciles = sum(cents(i["amount"]) for i in items) == cents(state["total"]) == expected
    except (TypeError, ValueError, AttributeError):
        reconciles = False
    check(f"{tag}: the lines reconcile to the subtotal on screen ({money(expected)})", reconciles,
          f"{[i['amount'] for i in items]} -> {state['total']}")
    check(f"{tag}: the page does not scroll sideways", state["pageOverflow"] is False)


def run_priced(browser):
    print("\n-- PRICED: two admissible sizes of one accessory family, beside a size-independent pillow --")
    config, catalog, verdicts, accessories = build_priced_state()
    check("the website preview builds and is ACCEPTED with a Queen and a King variant of one family",
          pricing.dark_form_acceptable("website", verdicts) and verdicts["served_refused"]
          and verdicts["sizeProjections"] == ["queen", "king"], str(verdicts["dark_errors"])[:240])
    served = [e for e in config["pricing"]["products"] if e["productId"] == PROTECTOR["id"]]
    check("...and it serves both variants as sizeless accessory entries",
          sorted(e["sku"] for e in served) == ["T-prot-king", "T-prot-queen"] and all(e["size"] is None for e in served))
    check("...and pricing in the COMMITTED store-config is still disabled",
          load("data", "store-config.json").get("pricing", {}).get("displayEnabled") is not True)
    if not pricing.dark_form_acceptable("website", verdicts):
        return
    handler = pricing.make_handler(pricing.encode(config), pricing.encode(catalog), pricing.encode(accessories))
    server, port = serve(handler)
    select = [{"id": PROTECTOR["id"], "quantity": 1}, {"id": PILLOW_A["id"], "quantity": PILLOW_QTY}]
    try:
        for label, width, height in VIEWPORTS:
            for lang in LANGS:
                for size in ("queen", "king"):
                    tag = f"{label} {lang} {size}"
                    page, log = open_page(browser, f"http://127.0.0.1:{port}/", width, height, clock=START)
                    built = page.evaluate(BUILD_JS, {"answers": dict(ANSWERS, mattress_size=size), "lang": lang, "select": select})
                    check(f"{tag}: reached the Consultation Summary in {lang}",
                          built["screen"] == "hf2Screen" and built["lang"] == lang, str(built))
                    state = page.evaluate(STATE_JS)
                    expect_lines(tag, state, lang, size)
                    cart_before = state["cart"]
                    # language switch ON the Summary: a copy swap, not a reset
                    page.evaluate("async (l) => { await switchLanguage(l); await new Promise((r) => setTimeout(r, 300)); }", OTHER[lang])
                    after = page.evaluate(STATE_JS)
                    check(f"{tag}: a language switch keeps the screen and the selection",
                          after["screen"] == "hf2Screen" and after["lang"] == OTHER[lang] and after["cart"] == cart_before,
                          f"{after['screen']} {after['lang']} {after['cart']}")
                    expect_lines(f"{tag} -> {OTHER[lang]}", after, OTHER[lang], size)
                    # the new-customer wipe
                    page.evaluate("async () => { window.startOver(); await new Promise((r) => setTimeout(r, 400)); }")
                    wiped = page.evaluate(STATE_JS)
                    check(f"{tag}: the wipe leaves no subtotal and no amount on the page, clears the selection and returns to English",
                          (wiped["totalHtml"] is None or (wiped["totalHidden"] is True and wiped["totalHtml"] == ""))
                          and "$" not in (wiped["bodyText"] or "") and wiped["cart"] == {} and wiped["lang"] == "en"
                          and wiped["screen"] == "welcomeScreen",
                          f"hidden={wiped['totalHidden']} html={len(wiped['totalHtml'] or '')} cart={wiped['cart']} lang={wiped['lang']}")
                    clean(tag, log)
                    page.close()
    finally:
        server.shutdown()


PIECES = {"en": "5 pieces · the bases, pillows or protectors you added",
          "es": "5 piezas · las bases, almohadas o protectores que agregaste"}
TAKE_HOME = [{"id": PILLOW_A["id"], "quantity": 3}, {"id": PILLOW_B["id"], "quantity": 1},
             {"id": PROTECTOR["id"], "quantity": 1}]


def expected_items(lang):
    return " · ".join([localized(PILLOW_A, "name", lang) + " × 3", localized(PILLOW_B, "name", lang),
                       localized(PROTECTOR, "name", lang)])


def expect_preview(tag, state, lang):
    row = next((r for r in state["rows"] if r["items"] is not None), None)
    check(f"{tag}: the take-home preview counts UNITS - five pieces for three products",
          bool(row) and PIECES[lang] in row["details"], str(row)[:200])
    check(f"{tag}: ...and names each product with its own count beside it",
          bool(row) and row["items"] == expected_items(lang), str(row and row["items"]))
    check(f"{tag}: ...and only the Sleep System row carries a product line",
          sum(1 for r in state["rows"] if r["items"] is not None) == 1)
    check(f"{tag}: the row fits its card and the page does not scroll sideways",
          bool(row) and row["overflow"] is False and row["itemsHeight"] > 0
          and state["previewOverflow"] is False and state["pageOverflow"] is False, str(row)[:200])


def run_take_home(browser):
    print("\n-- TAKE-HOME: quantities in the preview and in the one payload that leaves the page --")
    check("the committed store-config carries a blank gasUrl (nothing here enables a live send)",
          not load("data", "store-config.json").get("gasUrl"))
    for label, width, height in VIEWPORTS:
        for lang in LANGS:
            tag = f"{label} {lang}"
            harness = delivery.DeliveryHarness(respond="success").start()
            try:
                page, log = open_page(browser, harness.url, width, height)
                built = page.evaluate(BUILD_JS, {"answers": dict(ANSWERS, mattress_size="queen"), "lang": lang, "select": TAKE_HOME})
                check(f"{tag}: reached the Consultation Summary in {lang}",
                      built["screen"] == "hf2Screen" and built["lang"] == lang, str(built))
                page.evaluate("async () => { window.showEmailCapture(); await new Promise((r) => setTimeout(r, 300)); }")
                state = page.evaluate(STATE_JS)
                check(f"{tag}: the cart holds three of one pillow, one of another and a protector",
                      state["cart"] == {PILLOW_A["id"]: 3, PILLOW_B["id"]: 1, PROTECTOR["id"]: 1}, str(state["cart"]))
                expect_preview(tag, state, lang)
                screen_before, cart_before = state["screen"], state["cart"]
                page.evaluate("async (l) => { await switchLanguage(l); await new Promise((r) => setTimeout(r, 300)); }", OTHER[lang])
                after = page.evaluate(STATE_JS)
                check(f"{tag}: a language switch keeps the screen and the selection",
                      after["screen"] == screen_before and after["lang"] == OTHER[lang] and after["cart"] == cart_before,
                      f"{after['screen']} {after['lang']} {after['cart']}")
                expect_preview(f"{tag} -> {OTHER[lang]}", after, OTHER[lang])
                sent = page.evaluate(SEND_JS, TYPED)
                recorded = [r for r in harness.recorder.snapshot() if r.get("method") == "POST"]
                check(f"{tag}: exactly one payload reached the loopback stub", sent["sent"] and len(recorded) == 1,
                      f"{sent} posts={len(recorded)}")
                acc = (recorded[0].get("json") or {}).get("accessories") if recorded else None
                check(f"{tag}: the payload carries quantity 3, 1, 1 - five units, not three",
                      isinstance(acc, list) and [a.get("quantity") for a in acc] == [3, 1, 1], str(acc)[:200])
                check(f"{tag}: every payload accessory is exactly name/category/quantity/imageUrl",
                      isinstance(acc, list) and all(sorted(a) == ["category", "imageUrl", "name", "quantity"] for a in acc), str(acc)[:200])
                check(f"{tag}: the payload names the products in the language on screen ({OTHER[lang]})",
                      isinstance(acc, list) and [a.get("name") for a in acc]
                      == [localized(r, "name", OTHER[lang]) for r in (PILLOW_A, PILLOW_B, PROTECTOR)], str(acc)[:200])
                page.evaluate("async () => { window.startOver(); await new Promise((r) => setTimeout(r, 400)); }")
                wiped = page.evaluate(STATE_JS)
                check(f"{tag}: the wipe clears the take-home preview and the selection and returns to English",
                      wiped["previewHtml"] == "" and wiped["cart"] == {} and wiped["lang"] == "en"
                      and wiped["screen"] == "welcomeScreen",
                      f"preview={len(wiped['previewHtml'] or '')} cart={wiped['cart']} lang={wiped['lang']}")
                clean(tag, log)
                page.close()
            finally:
                harness.stop()

    print("\n-- TAKE-HOME, shipped preview mode: the same preview, and nothing is posted --")
    server, port = serve(plain_handler())
    try:
        for label, width, height in VIEWPORTS:
            for lang in LANGS:
                tag = f"preview mode {label} {lang}"
                page, log = open_page(browser, f"http://127.0.0.1:{port}/", width, height)
                page.evaluate(BUILD_JS, {"answers": dict(ANSWERS, mattress_size="queen"), "lang": lang, "select": TAKE_HOME})
                page.evaluate("async () => { window.showEmailCapture(); await new Promise((r) => setTimeout(r, 300)); }")
                expect_preview(tag, page.evaluate(STATE_JS), lang)
                sent = page.evaluate(SEND_JS, TYPED)
                posts = [u for m, u in log["requests"] if m == "POST"]
                check(f"{tag}: the plan is saved on screen and NO request of any kind was posted",
                      sent["sent"] and not posts, f"{sent} posts={posts[:2]}")
                clean(tag, log)
                page.close()
    finally:
        server.shutdown()


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is not installed: python -m pip install -r tools/requirements-suite.txt && python -m playwright install chromium")
        return 2
    with sync_playwright() as p:
        browser = p.chromium.launch()
        run_priced(browser)
        run_take_home(browser)
        browser.close()
    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
