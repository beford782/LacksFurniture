#!/usr/bin/env python3
"""Purchase flow - the ONE operable application (owner direction 2026-10-15).

The separate payment demo is retired. Pricing, governed payment calculation,
exact offers and the take-home email live in the normal app and are driven
only by governed configuration. This check runs the preview harness's
`purchase` state (tools/serve_pricing_preview.py: every mattress in every
size, FIXTURE SKUs and prices, both Synchrony plans calculable with a
declared qualifying basis, the fixture offer set, every surface on, email
included) behind the NORMAL page, with the --gas-stub loopback recorder
standing in for Code.gs. Everything is held in memory; no committed file is
read for prices and none is written.

  1. the build: the payment-demo path is gone; the drill's dark form
     validates and its opened form is refused by the production validator
     for its FIXTURE markers; gasUrl stays blank in the built document;
  2. the rendered purchase studio, English 1180x820 and Spanish 820x1180:
     one purchase presentation; list / savings / your-price rows computed
     INDEPENDENTLY here (offers applied per the contract); the payment
     comparison and centerpiece; voluntary and REQUIRED down payments (the
     0% plan shows no figure until one is entered; invalid, negative and
     too-large entries refused); the monthly effect of a change as the
     difference of two complete quotes; an accessory upgrade; size changes
     re-pricing every line; two pillows staying two; the stepper keeping
     focus; a split King base; the change sheet's inert background, cleanup,
     Escape and in-sheet language switch; Change mattress preview / cancel /
     apply; a language switch preserving everything; Browse all matches and
     back; one figure on the Summary, Sleep Plan, Bring It Home, the
     take-home preview AND the recorded email payload `quote`; the wipe with
     the sheet open;
  3. offers: the exclusive offer alone on its one mattress, combinable
     stacking in priority order, the pay-in-full-only offer present under
     Pay in full and dropped (and named) under a plan, expired / future /
     unreachable-minimum offers never applied, the excluded brand excluded,
     the minimum judged on the PRE-discount subtotal, no double application;
     a plan publishing a minimum without a computable basis is
     threshold-unknown;
  4. the send: sendId reused across the automatic and the customer retry,
     new for new content; one send in flight; stale figures never sent;
     quote null unless pricing.surfaces.email; an unpriced line sends no
     quote;
  5. fail closed: stale price evidence prices nothing and sends no quote;
     under SHIPPED data the studio renders nothing and the payload quote is
     null; sleep fit is identical with prices on and off.

Run:  python tests/purchase_flow_check.py
"""
import copy
import json
import os
import re
import sys
import threading
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as sp  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

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
    return int(round(float(m.group(1).replace(",", "")) * 100))


def total_paid_in(text):
    """The amount a 'total paid' phrase states (EN or ES), or None."""
    m = re.search(r"[Tt]otal (?:paid|pagado):?\s*(?:up to |hasta )?\$([\d,]+(?:\.\d{2})?)", text or "")
    return int(round(float(m.group(1).replace(",", "")) * 100)) if m else None


def ceil_div(a, b):
    return -(-a // b)


FACTOR72 = 0.018521


def fixed_pay(principal, factor=FACTOR72):
    micro = round(factor * 1_000_000)
    return ceil_div(principal * micro, 100_000_000) * 100


def eq_pay(principal, term):
    return ceil_div(principal, term * 100) * 100


# ---- 1. the build ------------------------------------------------------------
print("One application (the payment-demo path is retired):")
check("demo/payment-demo/ is gone and the harness has no demo state",
      not os.path.exists(os.path.join(REPO, "demo", "payment-demo")) and "demo" not in sp.STATES
      and not hasattr(sp, "build_demo") and not hasattr(sp, "validate_payment_demo"))
check("tests/payment_demo_check.py is retired", not os.path.exists(os.path.join(REPO, "tests", "payment_demo_check.py")))
_html = _read("index.html")
check("index.html carries no demo adapter, harness context or illustrative mark",
      not any(t_ in _html for t_ in ("__DF_DEMO_CONTEXT", "illustrativeDemo", "demoAdmission", "PS_ILLUS_MARK",
                                     "psIllustrative", "psDemoConfig", "psSheetDemoPanel", "demo/payment-demo")))

print("The purchase drill build:")
START = datetime.now(timezone.utc).astimezone()
CFG, CAT, VERD, ACC = sp.build_injected("purchase", START)
check("the dark form validates (purchase state acceptable)", sp.dark_form_acceptable("purchase", VERD),
      str(VERD["dark_errors"][:2]))
check("the opened form is REFUSED by the production validator for its FIXTURE markers",
      VERD["served_refused"] and VERD["served_marker_refused"])
check("gasUrl is blank in the built document (only the stub sets one, in memory)", not CFG.get("gasUrl"))
check("display on, every surface on, the email surface included",
      CFG["pricing"]["displayEnabled"] is True and CFG["pricing"]["surfaces"].get("email") is True
      and all(CFG["pricing"]["surfaces"].values()))
P72, P0, LTO = "synchrony-9-99-72", "synchrony-0-48", "lease-to-own"
_plans = {p["id"]: p for p in CFG["financing"]["plans"]}
check("both Synchrony plans calculate with a declared merchandise-subtotal basis; the 0% plan requires a down payment",
      all(_plans[i]["paymentCalculationEnabled"] is True and _plans[i]["qualifyingBasis"] == "merchandise-subtotal" for i in (P72, P0))
      and _plans[P0]["downPaymentRequired"] is True and _plans[P72]["publishedPaymentFactor"] == FACTOR72)
P0_MIN = int(round(_plans[P0]["minimumPurchase"] * 100))
P72_MIN = int(round(_plans[P72]["minimumPurchase"] * 100))
OFFERS = CFG["pricing"]["offers"]
check("the fixture offer set is the contract's eight offers",
      sorted(o["id"] for o in OFFERS) == sorted(["fx-mattress-10", "fx-pillow-20", "fx-exclusive-15", "fx-cash-5",
                                                  "fx-expired", "fx-future", "fx-excluded-brand", "fx-min-big"]))

# ---- independent arithmetic ----------------------------------------------------
ALL_IDS = sp.catalog_ids()
ACC_IDS = [a["id"] for a in ACC]
SIZED = {a["id"] for a in ACC if sp.accessory_is_sized(a)}
BRAND = {m["id"]: m.get("brand") for t_ in sp.TIER_ORDER for m in CAT[t_]}


def _inst(s):
    return datetime.fromisoformat(s)


def unit_minor(pid, kind, size):
    if kind == "mattress":
        return sp.purchase_mattress_amount(ALL_IDS.index(pid), size)
    return sp.purchase_accessory_amount(ACC_IDS.index(pid), size if pid in SIZED else None)


def expected(state, payment="full", now=None):
    """Contract section 2, computed here: state = {fav, cart [[id, qty, split]],
    size}. Returns (list, discount, net, {productId: [offer ids]})."""
    now = now or datetime.now(timezone.utc)
    size = state["size"]
    lines = [(state["fav"], "mattress", size, 1, unit_minor(state["fav"], "mattress", size))]
    for pid, qty, split in state["cart"]:
        if split:
            lines.append((pid, "accessory", "twin_xl", 2, unit_minor(pid, "accessory", "twin_xl")))
        else:
            lines.append((pid, "accessory", size if pid in SIZED else None, qty, unit_minor(pid, "accessory", size)))
    exts = [u * q for (_, _, _, q, u) in lines]
    lst = sum(exts)
    admitted = [o for o in OFFERS if _inst(o["startsAt"]) <= now < _inst(o["endsAt"])]
    disc, applied = 0, {}
    for i, (pid, kind, lsize, qty, unit) in enumerate(lines):
        cands = []
        for o in admitted:
            el, ex = o["eligibility"], o.get("exclusions") or {}
            brand = BRAND.get(pid) if kind == "mattress" else None
            if kind not in el["productKinds"]:
                continue
            if "productIds" in el and pid not in el["productIds"]:
                continue
            if "brands" in el and brand not in el["brands"]:
                continue
            if "sizes" in el and lsize not in el["sizes"]:
                continue
            if pid in ex.get("productIds", []) or ("brands" in ex and (brand is None or brand in ex["brands"])):
                continue
            if o["minimumMerchandiseMinor"] is not None and lst < o["minimumMerchandiseMinor"]:
                continue
            if o["payment"] == "pay-in-full-only" and payment != "full":
                continue
            cands.append(o)
        cands.sort(key=lambda o: (o["priority"], o["id"]))
        use = cands[:1] if cands and cands[0]["stacking"] == "exclusive" else [o for o in cands if o["stacking"] == "combinable"]
        rem = exts[i]
        for o in use:
            e = o["effect"]
            d = rem * e["basisPoints"] // 10000 if e["type"] == "percent-off" else min(e["amountMinor"] * qty, rem)
            if d <= 0:
                continue
            rem -= d
            disc += d
            applied.setdefault(pid, []).append(o["id"])
    return lst, disc, lst - disc, applied


# ---- servers --------------------------------------------------------------------
class Stubbed:
    """A drill page server whose in-memory gasUrl points at a loopback stub."""

    def __init__(self, config, catalog, accessories, mode="success"):
        self.stub = sp.GasStub(mode).start()
        cfg = sp.with_gas_url(config, self.stub.gas_url)
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0),
                                       sp.make_handler(sp.encode(cfg), sp.encode(catalog), sp.encode(accessories)))
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}/"

    def posts(self):
        with urllib.request.urlopen(self.stub.recorded_url, timeout=10) as r:
            return [x for x in json.loads(r.read().decode("utf-8")) if x.get("method") == "POST"]

    def by_send(self, send_id):
        return [x for x in self.posts() if isinstance(x.get("json"), dict) and x["json"].get("sendId") == send_id]

    def close(self):
        self.srv.shutdown()
        self.srv.server_close()
        self.stub.stop()


def stale_config(cfg):
    out = copy.deepcopy(cfg)
    age = out["pricing"]["freshness"]["maxAgeDays"] + 3
    for e in out["pricing"]["products"]:
        old = datetime.fromisoformat(e["evidence"]["verifiedAt"]) - timedelta(days=age)
        e["evidence"]["verifiedAt"] = old.isoformat(timespec="seconds")
        e["clearance"]["scope"]["evidenceVerifiedAt"] = e["evidence"]["verifiedAt"]
        e["clearance"]["attestedAt"] = e["evidence"]["verifiedAt"]
    return out


SHIPPED_CFG = json.loads(_read("data/store-config.json"))
SHIPPED_CAT = json.loads(_read("data/mattresses.json"))
SHIPPED_ACC = json.loads(_read("data/accessories.json"))

MAIN = Stubbed(CFG, CAT, ACC, "success")
FAIL500 = Stubbed(CFG, CAT, ACC, "http_500")
STALE = Stubbed(stale_config(CFG), CAT, ACC, "success")
SHIPPED = Stubbed(SHIPPED_CFG, SHIPPED_CAT, SHIPPED_ACC, "success")

READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
ANSWERS = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
           "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
           "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
PLUSH = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
         "temperature": "hot", "firmness": 2, "partner_sleep": "partner",
         "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
ITEMS = [["base-bt3000", 1], ["pillow-gel-memory", 2], ["protector-vertex", 1]]
# The finalist: the most expensive recommended mattress when it is among the
# matches (a system above the 0% plan's minimum), else the best match.
LOAD = """async (o) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  if (typeof resetSessionState === 'function') resetSessionState(); await w(100);
  for (const k in o.answers) answers[k] = o.answers[k];
  showProfileScreen(); window.showResults(); await w(350);
  const ids = Object.keys(window._drawerData || {});
  const fin = ids.indexOf(o.fin) !== -1 ? o.fin : ids[0];
  window.chooseFinalist(fin);
  const keep = ids.find(i => i !== fin && i !== o.avoid); if (keep) window._toggleSavePick(keep);
  for (const [id, n] of o.items) { setSleepSystemItem(id, true); if (n > 1) setSleepSystemItemQuantity(id, n); }
  window.showSavedPicks(); await w(300); return { ids: ids, fin: fin }; }"""
TXT = "(sel) => { const e = document.querySelector(sel); return e ? e.textContent.replace(/\\s+/g, ' ').trim() : null; }"
FMT = "(m) => formatPriceAmount(m, 'USD')"
ROWS = """() => Array.from(document.querySelectorAll('#purchaseStudio .ps-row[data-ps-line]')).map(l => ({
  id: l.dataset.psLine, amount: l.querySelector('.ps-row__amount').textContent.trim(),
  offers: Array.from(l.querySelectorAll('[data-ps-offer]')).map(o => o.dataset.psOffer) }))"""
CARD = r"""(id) => { const c = document.querySelector('#purchaseStudio [data-ps-plan="' + id + '"]');
  return c ? c.textContent.replace(/\s+/g, ' ').trim() : null; }"""
FIG = """(k) => { const f = document.querySelector('#psCenterBox [data-ps-fig="' + k + '"] .ps-fig__value');
  return f ? f.textContent.trim() : null; }"""
DL = """(k) => { const f = document.querySelector('#psDetails [data-ps-dl="' + k + '"] dd');
  return f ? f.textContent.trim() : null; }"""
STATE = """() => JSON.stringify({ fav: window._favoriteMattressId, saved: (window._savedPicks || []).map(p => p.id),
  cart: Object.keys(window._accCart || {}).sort().map(k => [k, window._accCart[k].quantity, !!window._accCart[k].split]),
  size: answers.mattress_size, plan: _psPlan, down: _psDownRaw })"""


def st(pg):
    return json.loads(pg.evaluate(STATE))


def recommended(pg, ans):
    return pg.evaluate("""async (a) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
      for (const k in a) answers[k] = a[k]; showProfileScreen(); window.showResults(); await w(350);
      return Object.keys(window._drawerData || {}); }""", ans)


def open_page(browser, url, w=1180, h=820):
    pg = browser.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
    pg.goto(url)
    pg.wait_for_function(READY, timeout=20000)
    return pg, errs


def send_email(pg, email="fixture@example.com", wait=1500):
    """Open the take-home preview, fill it and tap send. Returns the sendId."""
    pg.evaluate("window.showEmailCapture()")
    pg.wait_for_timeout(300)
    pg.fill("#emailNameInput", "Fixture")
    pg.fill("#emailInput", email)
    sid = pg.evaluate("emailSendState.sendId")
    pg.click("#emailSendBtn")
    pg.wait_for_timeout(wait)
    return sid


def fresh_studio(pg, lang, ans=ANSWERS, fin="b7", avoid="g5", items=ITEMS):
    r = pg.evaluate(LOAD, {"answers": ans, "fin": fin, "avoid": avoid, "items": items})
    pg.wait_for_function("() => { const b = document.getElementById('purchaseStudio'); return b && !b.hidden && b.querySelector('.ps-row'); }", timeout=10000)
    if lang == "es":
        pg.evaluate("async () => { await switchLanguage('es'); }")
        pg.wait_for_timeout(300)
    return r


try:
    from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
except ImportError:
    print("  [FAIL] playwright is required")
    sys.exit(1)

T0 = time.time()
# `--only send-identity` runs only sections 4b and 4c (the send identity and
# the session send-attempt registry): the mutation sweep's focused observer
# for those properties, inside its per-observer timeout. CI runs the file whole.
ONLY_SEND_IDENTITY = sys.argv[1:] == ["--only", "send-identity"]
if sys.argv[1:] and not ONLY_SEND_IDENTITY:
    print(f"  [FAIL] unknown arguments {sys.argv[1:]} (the only option is --only send-identity)")
    sys.exit(2)
with sync_playwright() as p:
    browser = p.chromium.launch()
    # ======================================================================
    # 4b. send identity (owner direction 2026-10-17): one recipient + one
    # purchase = one sendId, whatever the presentation language. The
    # localized summary fingerprint stays the preview-integrity guard; the
    # duplicate-prevention identity is purchaseIdentityKey(). Every check
    # reads the POSTed request bodies themselves (Playwright interception of
    # the stub's /exec URL), not the screen. This is the CLIENT contract; the
    # server's per-sendId ledger, cache-loss and interruption cases live in
    # tests/email_priorities_check.mjs, and real concurrent Apps Script
    # executions are not exercised anywhere offline.
    # ======================================================================
    print("Send identity across languages (one purchase, one sendId):")
    GURL = MAIN.stub.gas_url.split("?")[0]
    CORS = {"Access-Control-Allow-Origin": "*"}

    class Gate:
        """Answers the page's POSTs to the GAS URL: '500' (transport failure,
        uncertain), 'unconfirmed' (server delivery_unconfirmed), 'ok', or
        'hold' (kept in flight until released)."""

        def __init__(self, page, mode="500", url=None):
            self.pg, self.mode, self.bodies, self.held = page, mode, [], []
            target = (url or GURL).split("?")[0]
            page.route(lambda u: u.split("?")[0] == target, self.handle)

        def handle(self, route):
            if route.request.method != "POST":
                route.continue_()
                return
            try:
                self.bodies.append(json.loads(route.request.post_data or "{}"))
            except ValueError:
                self.bodies.append({})
            if self.mode == "hold":
                self.held.append(route)
            else:
                self.answer(route, self.mode)

        @staticmethod
        def answer(route, mode):
            if mode == "500":
                route.fulfill(status=500, headers=CORS, body="error")
            else:
                body = ({"success": True} if mode == "ok"
                        else {"success": False, "error": "send_failed" if mode == "send_failed" else "delivery_unconfirmed"})
                route.fulfill(status=200, headers=CORS, content_type="application/json", body=json.dumps(body))

        def release(self, mode):
            while self.held:
                self.answer(self.held.pop(0), mode)

        def wait(self, n, ms=8000):
            t_end = time.time() + ms / 1000
            while len(self.bodies) < n and time.time() < t_end:
                self.pg.wait_for_timeout(100)
            self.pg.wait_for_timeout(500)
            return len(self.bodies)

        def ids(self):
            return [b.get("sendId") for b in self.bodies]

        def langs(self):
            return [b.get("lang") for b in self.bodies]

    def lang_to(page, lang):
        page.evaluate(f"async () => {{ await switchLanguage('{lang}'); }}")
        page.wait_for_timeout(300)

    def open_take_home(page, email="identity@example.com"):
        page.evaluate("window.showEmailCapture()")
        page.wait_for_timeout(300)
        page.fill("#emailNameInput", "Fixture")
        page.fill("#emailInput", email)

    def tap(page):
        page.click("#emailSendBtn")

    def drop_protector(page):
        page.evaluate("""() => { const p = getPricingConfig();
          window.__sidKept = p.products.filter(e => e.productId === 'protector-vertex');
          p.products = p.products.filter(e => e.productId !== 'protector-vertex'); psRepaint(); }""")
        page.wait_for_timeout(150)

    def restore_protector(page):
        page.evaluate("() => { const p = getPricingConfig(); p.products = p.products.concat(window.__sidKept || []); psRepaint(); }")

    def valid(sid):
        return isinstance(sid, str) and sp.delivery.valid_send_id(sid)

    # ---- the two keys: identity is language-neutral, the fingerprint is not ----
    for complete in (True, False):
        pg, errs = open_page(browser, MAIN.url)
        fresh_studio(pg, "en")
        if not complete:
            drop_protector(pg)
        kind = "complete" if complete else "incomplete"
        k_en, f_en = pg.evaluate("purchaseIdentityKey()"), pg.evaluate("purchaseSummaryFor(currentLang).fingerprint")
        c_en = pg.evaluate("purchaseSummaryFor(currentLang).complete")
        lang_to(pg, "es")
        k_es, f_es = pg.evaluate("purchaseIdentityKey()"), pg.evaluate("purchaseSummaryFor(currentLang).fingerprint")
        check(f"{kind} quote: the purchase identity is the same in EN and ES; the preview fingerprint is not",
              c_en is complete and isinstance(k_en, str) and len(k_en) == 16 and k_en == k_es and f_en != f_es,
              f"{c_en} {k_en} {k_es} {f_en} {f_es}")
        lang_to(pg, "en")
        pg.close()

    # ---- complete quote, uncertain send (HTTP 500), EN -> ES, repeated retries ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "500")
    open_take_home(pg)
    tap(pg)
    gate.wait(2)
    sid = gate.ids()[0] if gate.ids() else None
    check("complete, EN, HTTP 500: two POSTs (one automatic retry), one valid sendId, outcome left unresolved",
          len(gate.bodies) == 2 and valid(sid) and set(gate.ids()) == {sid}
          and pg.evaluate("emailSendState.unresolved") is True, str(gate.ids()))
    lang_to(pg, "es")
    tap(pg)
    gate.wait(4)
    tap(pg)
    gate.wait(6)
    check("complete, EN -> ES, then two more retries: every POST carries the SAME sendId",
          len(gate.bodies) == 6 and set(gate.ids()) == {sid}, str(gate.ids()))
    check("complete, EN -> ES: the later POSTs are Spanish and carry the Spanish preview fingerprint",
          gate.langs() == ["en", "en", "es", "es", "es", "es"]
          and gate.bodies[0]["quote"]["fingerprint"] != gate.bodies[2]["quote"]["fingerprint"]
          and gate.bodies[2]["quote"]["fingerprint"] == pg.evaluate("purchaseSummaryFor(currentLang).fingerprint"),
          str(gate.langs()))
    # the screen is closed and re-opened, in the other language again
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    lang_to(pg, "en")
    open_take_home(pg)
    tap(pg)
    gate.wait(8)
    check("complete, screen closed and re-opened (and back to EN): still the SAME sendId",
          len(gate.bodies) == 8 and set(gate.ids()) == {sid}, str(gate.ids()))
    # name and phone are not part of the identity
    pg.fill("#emailNameInput", "Another Name")
    tap(pg)
    gate.wait(10)
    check("an edited name keeps the sendId (the recipient and purchase are unchanged)",
          len(gate.bodies) == 10 and set(gate.ids()) == {sid}, str(gate.ids()))
    # genuine change: the recipient
    pg.fill("#emailInput", "someone-else@example.com")
    tap(pg)
    gate.wait(12)
    new_r = gate.ids()[10] if len(gate.ids()) > 10 else None
    check("a different recipient is a different email: a NEW valid sendId (shared by its own retry)",
          len(gate.bodies) == 12 and valid(new_r) and new_r != sid and gate.ids()[11] == new_r, str(gate.ids()))
    # genuine change: the purchase (a quantity)
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    k0 = pg.evaluate("purchaseIdentityKey()")
    pg.evaluate("() => { setSleepSystemItemQuantity('pillow-gel-memory', 1); psRepaint(); }")
    pg.wait_for_timeout(200)
    k1 = pg.evaluate("purchaseIdentityKey()")
    open_take_home(pg, "someone-else@example.com")
    tap(pg)
    gate.wait(14)
    new_q = gate.ids()[12] if len(gate.ids()) > 12 else None
    check("a changed purchase (pillow quantity 2 -> 1) is a different email: a new identity and a NEW sendId",
          k0 != k1 and len(gate.bodies) == 14 and valid(new_q) and new_q not in (sid, new_r), str(gate.ids()))
    # genuine change: the payment (pay in full -> a calculated plan)
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    k2 = pg.evaluate("purchaseIdentityKey()")
    pg.click(f"#purchaseStudio [data-ps-plan='{P72}']")
    pg.wait_for_timeout(250)
    k3 = pg.evaluate("purchaseIdentityKey()")
    open_take_home(pg, "someone-else@example.com")
    tap(pg)
    gate.wait(16)
    new_p = gate.ids()[14] if len(gate.ids()) > 14 else None
    check("a changed payment (pay in full -> the 72-month plan) is a different email: a NEW sendId",
          pg.evaluate("_psPlan") == P72 and k2 != k3 and len(gate.bodies) == 16 and valid(new_p)
          and new_p not in (sid, new_r, new_q), f"{k2} {k3} {gate.ids()}")
    lang_to(pg, "es")
    tap(pg)
    gate.wait(18)
    check("... and that plan purchase keeps its own sendId across a language switch",
          len(gate.bodies) == 18 and gate.ids()[16:] == [new_p, new_p], str(gate.ids()))
    lang_to(pg, "en")
    # Payment facts alone (same plan, same lines and offers): a down payment
    # changes only the financed amount and the monthly payment.
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    lines_a = pg.evaluate("JSON.stringify(psContext().q.lines.map(l => [l.productId, l.netAmountMinor]))")
    k4 = pg.evaluate("purchaseIdentityKey()")
    pg.fill("#psDownInput", "500")
    pg.wait_for_timeout(300)
    lines_b = pg.evaluate("JSON.stringify(psContext().q.lines.map(l => [l.productId, l.netAmountMinor]))")
    k5 = pg.evaluate("purchaseIdentityKey()")
    check("a changed down payment (same plan, same lines and offers) is a new purchase identity",
          pg.evaluate("_psPlan") == P72 and pg.evaluate("purchaseStudioFor().result.state") == "calculated"
          and lines_a == lines_b and isinstance(k4, str) and k4 != k5, f"{lines_a == lines_b} {k4} {k5}")
    pg.fill("#psDownInput", "")
    pg.wait_for_timeout(200)
    # session reset: nothing carries over to the next customer
    pg.evaluate("resetSessionState()")
    pg.wait_for_timeout(300)
    check("the new-customer wipe clears the send state (no sendId, content key, fingerprint or unresolved flag)",
          pg.evaluate("emailSendState.sendId === null && emailSendState.contentKey === null"
                      " && emailSendState.previewFingerprint === null && emailSendState.unresolved === false"
                      " && emailSendState.inFlight === false"))
    check("the new-customer wipe leaves no contact value in the take-home fields",
          pg.evaluate("['emailInput','emailNameInput','emailPhoneInput'].every(id => !document.getElementById(id) || document.getElementById(id).value === '')"))
    fresh_studio(pg, "en")
    open_take_home(pg)
    tap(pg)
    gate.wait(20)
    after_wipe = gate.ids()[18] if len(gate.ids()) > 18 else None
    check("after the wipe the same address and the same purchase start a NEW sendId (no cross-session carry-over)",
          len(gate.bodies) == 20 and valid(after_wipe) and after_wipe not in (sid, new_r, new_q, new_p), str(gate.ids()))
    check("send identity (complete): no console errors", not [e for e in errs if "500" not in e], str(errs[:3]))
    pg.close()

    # ---- the reverse change, ES -> EN, after the server's delivery_unconfirmed ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "es")
    gate = Gate(pg, "unconfirmed")
    open_take_home(pg)
    tap(pg)
    gate.wait(1)
    sid = gate.ids()[0] if gate.ids() else None
    check("complete, ES, delivery_unconfirmed: ONE POST (never retried automatically), outcome unresolved",
          len(gate.bodies) == 1 and valid(sid) and pg.evaluate("emailSendState.unresolved") is True, str(gate.ids()))
    lang_to(pg, "en")
    tap(pg)
    gate.wait(2)
    check("complete, ES -> EN: a further tap carries the SAME sendId (the server will not send it again)",
          len(gate.bodies) == 2 and gate.ids() == [sid, sid] and gate.langs() == ["es", "en"], str(gate.ids()))
    pg.close()

    # ---- an incomplete priced quote (one line unavailable), EN -> ES -> EN ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    drop_protector(pg)
    gate = Gate(pg, "500")
    open_take_home(pg)
    tap(pg)
    gate.wait(2)
    sid = gate.ids()[0] if gate.ids() else None
    lang_to(pg, "es")
    tap(pg)
    gate.wait(4)
    lang_to(pg, "en")
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    open_take_home(pg)
    tap(pg)
    gate.wait(6)
    quotes = [b.get("quote") or {} for b in gate.bodies]
    check("incomplete, EN -> ES -> EN (screen re-opened): six POSTs, every one the SAME sendId",
          len(gate.bodies) == 6 and valid(sid) and set(gate.ids()) == {sid}, str(gate.ids()))
    check("incomplete: every POST carries the incomplete summary (priced lines + an unavailable line, no total key)",
          all(q.get("complete") is False and any(not l.get("priced") for l in q.get("lines", []))
              and not any(k in q for k in ("merchandiseText", "listSubtotalText", "payment")) for q in quotes),
          str([q.get("complete") for q in quotes]))
    restore_protector(pg)
    pg.close()

    # ---- the quantity of an UNPRICED line (no amount carries the change) ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    pg.evaluate("""() => { const p = getPricingConfig();
      window.__pillowKept = p.products.filter(e => e.productId === 'pillow-gel-memory');
      p.products = p.products.filter(e => e.productId !== 'pillow-gel-memory'); psRepaint(); }""")
    pg.wait_for_timeout(200)
    gate = Gate(pg, "500")
    open_take_home(pg)
    tap(pg)
    gate.wait(2)
    sid = gate.ids()[0] if gate.ids() else None
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    k6 = pg.evaluate("purchaseIdentityKey()")
    pg.evaluate("() => { setSleepSystemItemQuantity('pillow-gel-memory', 1); psRepaint(); }")
    pg.wait_for_timeout(200)
    k7 = pg.evaluate("purchaseIdentityKey()")
    open_take_home(pg)
    tap(pg)
    gate.wait(4)
    q_after = (gate.bodies[2].get("quote") or {}) if len(gate.bodies) > 2 else {}
    unpriced_after = [l for l in q_after.get("lines", []) if not l.get("priced")]
    check("incomplete: the unpriced pillow's quantity (2 -> 1) is a new identity and a NEW sendId",
          k6 != k7 and len(gate.bodies) == 4 and valid(sid) and gate.ids()[2] not in (None, sid)
          and gate.ids()[2] == gate.ids()[3] and [l.get("quantity") for l in unpriced_after] == [1],
          f"{k6} {k7} {gate.ids()}")
    pg.close()

    # ---- a language switch while the request is in flight ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "hold")
    open_take_home(pg)
    tap(pg)
    gate.wait(1)
    sid = gate.ids()[0] if gate.ids() else None
    check("in flight: the request has left, the button is busy, the send is unresolved",
          len(gate.bodies) == 1 and valid(sid) and pg.evaluate("emailSendState.inFlight") is True
          and pg.evaluate("emailSendState.unresolved") is True)
    lang_to(pg, "es")
    check("in flight: the language switch re-renders the preview but keeps the sendId",
          pg.evaluate("emailSendState.sendId") == sid and pg.evaluate("emailSendState.inFlight") is True)
    tap(pg)
    pg.wait_for_timeout(300)
    check("in flight: a tap while the request is out sends nothing", len(gate.bodies) == 1, str(gate.ids()))
    gate.mode = "500"
    gate.release("500")
    gate.wait(2)
    tap(pg)
    gate.wait(4)
    check("in flight -> HTTP 500 -> retry in Spanish: every POST the SAME sendId",
          len(gate.bodies) == 4 and set(gate.ids()) == {sid} and gate.langs() == ["en", "en", "es", "es"],
          f"{gate.ids()} {gate.langs()}")
    pg.close()

    # ======================================================================
    # 4c. the session's send-attempt registry (owner direction 2026-10-17):
    # content sent earlier in the session goes out again under ITS OWN
    # original sendId, whatever was sent in between; each record keeps its
    # own outcome; the wipe drops every record.
    # ======================================================================
    print("Send-attempt registry (return to earlier content):")
    STATES = "() => Object.values(emailSendState.attempts || {}).map(a => [a.sendId, a.state])"

    def states(page):
        return {k: v for k, v in page.evaluate(STATES)}

    def set_pillows(page, n):
        page.evaluate("window.showSavedPicks()")
        page.wait_for_timeout(250)
        page.evaluate(f"() => {{ setSleepSystemItemQuantity('pillow-gel-memory', {n}); psRepaint(); }}")
        page.wait_for_timeout(200)

    # ---- recipient A -> B -> A, complete quote, with a language switch and a re-open ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "500")
    open_take_home(pg, "a@example.com")
    tap(pg)
    gate.wait(2)
    gate.mode = "ok"
    pg.fill("#emailInput", "b@example.com")
    tap(pg)
    gate.wait(3)
    id_a, id_b = (gate.ids() + [None, None, None])[0], (gate.ids() + [None, None, None])[2]
    check("A (HTTP 500, uncertain) then B (confirmed): two distinct valid sendIds, each record keeps its own outcome",
          valid(id_a) and valid(id_b) and id_a != id_b and gate.ids() == [id_a, id_a, id_b]
          and states(pg) == {id_a: "uncertain", id_b: "confirmed"}, f"{gate.ids()} {states(pg)}")
    # B succeeded, so the confirmation shows; come back to the take-home and return to A in Spanish
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(300)
    lang_to(pg, "es")
    gate.mode = "500"
    open_take_home(pg, "a@example.com")
    tap(pg)
    gate.wait(5)
    check("back to A (in Spanish, screen re-opened): A's ORIGINAL sendId, not a new one",
          gate.ids()[3:] == [id_a, id_a] and gate.langs()[3:] == ["es", "es"], f"{gate.ids()} {gate.langs()}")
    tap(pg)
    gate.wait(7)
    check("... and a further retry of A keeps it", gate.ids()[5:] == [id_a, id_a], str(gate.ids()))
    gate.mode = "ok"
    pg.fill("#emailInput", "b@example.com")
    tap(pg)
    gate.wait(8)
    check("back to B (already confirmed): B's original sendId again (the server answers it as a duplicate)",
          gate.ids()[7:] == [id_b] and states(pg) == {id_a: "uncertain", id_b: "confirmed"}, f"{gate.ids()} {states(pg)}")
    check("A -> B -> A: exactly two sendIds were ever used", set(gate.ids()) == {id_a, id_b}, str(gate.ids()))
    pg.close()

    # ---- purchase X -> Y -> X on an INCOMPLETE quote (uncertain), with a language switch ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    drop_protector(pg)
    gate = Gate(pg, "500")
    kx = pg.evaluate("purchaseIdentityKey()")
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(2)
    set_pillows(pg, 1)
    ky = pg.evaluate("purchaseIdentityKey()")
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(4)
    set_pillows(pg, 2)
    kx2 = pg.evaluate("purchaseIdentityKey()")
    lang_to(pg, "es")
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(6)
    ids = gate.ids()
    check("incomplete X -> Y -> X (back in Spanish): X is the same identity again and reuses X's ORIGINAL sendId",
          kx == kx2 and kx != ky and len(ids) == 6 and valid(ids[0]) and valid(ids[2]) and ids[0] != ids[2]
          and ids[:2] == [ids[0]] * 2 and ids[2:4] == [ids[2]] * 2 and ids[4:] == [ids[0]] * 2,
          f"{kx == kx2} {ids}")
    check("incomplete X -> Y -> X: every POST carried the incomplete summary",
          all((b.get("quote") or {}).get("complete") is False for b in gate.bodies))
    check("incomplete X -> Y -> X: both records are uncertain, each under its own id",
          states(pg) == {ids[0]: "uncertain", ids[2]: "uncertain"}, str(states(pg)))
    restore_protector(pg)
    pg.close()

    # ---- purchase X -> Y -> X on a COMPLETE quote (server delivery_unconfirmed) ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "unconfirmed")
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(1)
    set_pillows(pg, 1)
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(2)
    set_pillows(pg, 2)
    lang_to(pg, "es")
    open_take_home(pg, "x@example.com")
    tap(pg)
    gate.wait(3)
    ids = gate.ids()
    check("complete X -> Y -> X (delivery_unconfirmed, back in Spanish): X's ORIGINAL sendId, Y its own",
          len(ids) == 3 and valid(ids[0]) and valid(ids[1]) and ids[0] != ids[1] and ids[2] == ids[0], str(ids))
    pg.close()

    # ---- no priced purchase (the shipped, dark pricing state): the rest of
    # the email - answers, shortlist - is the content, so a changed shortlist
    # is a NEW send, returning to the earlier one reuses its id, and the
    # language never matters ----
    pg, errs = open_page(browser, SHIPPED.url)
    pg.evaluate(LOAD, {"answers": ANSWERS, "fin": "b7", "avoid": "g5", "items": ITEMS})
    pg.wait_for_timeout(300)
    gate = Gate(pg, "ok", SHIPPED.stub.gas_url)
    check("dark pricing: no purchase identity, the content identity still exists",
          pg.evaluate("purchaseIdentityKey()") is None and isinstance(pg.evaluate("consultationIdentityKey()"), str))
    open_take_home(pg, "d@example.com")
    tap(pg)
    gate.wait(1)
    toggle = pg.evaluate("""() => Object.keys(window._drawerData || {}).find(i =>
      !(window._savedPicks || []).some(p => p.id === i) && i !== window._favoriteMattressId)""")
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(250)
    pg.evaluate("(id) => window._toggleSavePick(id)", toggle)
    pg.wait_for_timeout(200)
    open_take_home(pg, "d@example.com")
    tap(pg)
    gate.wait(2)
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(250)
    pg.evaluate("(id) => window._toggleSavePick(id)", toggle)
    pg.wait_for_timeout(200)
    lang_to(pg, "es")
    open_take_home(pg, "d@example.com")
    tap(pg)
    gate.wait(3)
    lang_to(pg, "en")
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(250)
    pg.evaluate("() => { answers.firmness = (Number(answers.firmness) === 7 ? 3 : 7); }")
    open_take_home(pg, "d@example.com")
    tap(pg)
    gate.wait(4)
    ids = gate.ids()
    check("dark pricing: a changed shortlist after a confirmed send is a NEW sendId (the updated email is not swallowed)",
          len(ids) >= 2 and valid(ids[0]) and valid(ids[1]) and ids[1] != ids[0], f"{toggle} {ids}")
    check("dark pricing: returning to the first shortlist (in Spanish) reuses its ORIGINAL sendId",
          len(ids) >= 3 and ids[2] == ids[0] and gate.langs()[2] == "es", f"{ids} {gate.langs()}")
    check("dark pricing: a changed quiz answer is a NEW sendId",
          len(ids) == 4 and valid(ids[3]) and ids[3] not in (ids[0], ids[1]), str(ids))
    # the credited salesperson is part of the email: a change is a new send
    pg.evaluate("""() => { const sk = (STORE_CONFIG && STORE_CONFIG.storeKey) || 'unknown';
      localStorage.setItem('dreamfinder.' + sk + '.deviceRsa', 'Fixture Specialist ' + Date.now()); }""")
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(250)
    open_take_home(pg, "d@example.com")
    tap(pg)
    gate.wait(5)
    # the same recipient typed in another case is the same recipient
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(250)
    open_take_home(pg, "D@Example.COM")
    tap(pg)
    gate.wait(6)
    ids = gate.ids()
    check("dark pricing: a changed credited salesperson is a NEW sendId",
          len(ids) >= 5 and valid(ids[4]) and ids[4] not in ids[:4], str(ids))
    check("dark pricing: the same address in another letter case reuses that content's sendId (sent as typed)",
          len(ids) == 6 and ids[5] == ids[4] and gate.bodies[5].get("email") == "D@Example.COM", str(ids))
    pg.evaluate("""() => { const sk = (STORE_CONFIG && STORE_CONFIG.storeKey) || 'unknown';
      localStorage.removeItem('dreamfinder.' + sk + '.deviceRsa'); }""")
    check("dark pricing: every POST carries quote null (pricing stays dark)",
          all(b.get("quote") is None for b in gate.bodies))
    pg.close()

    # ---- a definitive refusal keeps its record and its id ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "send_failed")
    open_take_home(pg, "f@example.com")
    tap(pg)
    gate.wait(1)
    fid = gate.ids()[0] if gate.ids() else None
    check("send_failed (nothing was sent): ONE POST, the record says 'failed', the send is not unresolved",
          len(gate.bodies) == 1 and valid(fid) and states(pg) == {fid: "failed"}
          and pg.evaluate("emailSendState.unresolved") is False, f"{gate.ids()} {states(pg)}")
    gate.mode = "ok"
    tap(pg)
    gate.wait(2)
    check("... retrying the same content reuses its id (the server kept it retryable) and the record becomes confirmed",
          gate.ids() == [fid, fid] and states(pg) == {fid: "confirmed"}, f"{gate.ids()} {states(pg)}")
    pg.close()

    # ---- a late response from a wiped session touches nothing in the new one ----
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    gate = Gate(pg, "hold")
    open_take_home(pg, "late@example.com")
    tap(pg)
    gate.wait(1)
    old_id = gate.ids()[0] if gate.ids() else None
    check("late: the first session's request is held in flight", len(gate.held) == 1 and valid(old_id))
    pg.evaluate("resetSessionState()")
    pg.wait_for_timeout(300)
    check("the wipe drops the attempt registry, the used-id set and the current attempt",
          pg.evaluate("emailSendState.attempts === null && emailSendState.usedIds === null && emailSendState.current === null"))
    fresh_studio(pg, "en")
    gate.mode = "500"
    open_take_home(pg, "late@example.com")
    tap(pg)
    gate.wait(3)
    new_id = gate.ids()[1] if len(gate.ids()) > 1 else None
    check("late: the next customer, same address and purchase, gets a NEW sendId (no cross-session carry-over)",
          valid(new_id) and new_id != old_id and gate.ids()[1:] == [new_id, new_id], str(gate.ids()))
    gate.release("ok")
    pg.wait_for_timeout(800)
    check("late: the old session's success arriving now changes nothing (new record still uncertain, no confirmation)",
          states(pg) == {new_id: "uncertain"} and pg.evaluate("emailSendState.unresolved") is True
          and not pg.evaluate("document.getElementById('emailSendBtn').classList.contains('sent')"),
          str(states(pg)))
    pg.close()

    if ONLY_SEND_IDENTITY:
        browser.close()
        for s_ in (MAIN, FAIL500, STALE, SHIPPED):
            s_.close()
        print(f"\nPurchase flow check (--only send-identity): {passed} passed, {failed} failed "
              f"({time.time() - T0:.0f}s rendered)")
        sys.exit(1 if failed else 0)

    # ======================================================================
    # 2. the rendered purchase studio
    # ======================================================================
    for lang, (w, h) in (("en", (1180, 820)), ("es", (820, 1180))):
        tag = f"[{lang} {w}x{h}]"
        print(f"Rendered purchase studio {tag}:")
        pg, errs = open_page(browser, MAIN.url, w, h)
        loaded = fresh_studio(pg, lang)
        fmt = lambda m: pg.evaluate(FMT, m)  # noqa: E731
        check(f"{tag} the most expensive recommended mattress is the finalist (a system above the 0% plan's minimum)",
              loaded["fin"] == "b7", str(loaded))
        # ---- one authoritative purchase presentation ----
        check(f"{tag} the Summary's separate finalist hero and Sleep System list yield to the one purchase view",
              pg.evaluate("getComputedStyle(document.getElementById('hf2FinalistHero')).display") == "none"
              and pg.evaluate("getComputedStyle(document.getElementById('hf2SleepSystemSection')).display") == "none")
        check(f"{tag} no permanently expanded wall of alternatives (no alternative cards until Add/Change)",
              pg.evaluate("document.querySelectorAll('#purchaseStudio [data-ps-sheet-opt], #purchaseStudio .ps-opt').length") == 0)
        check(f"{tag} the hero says 'selected mattress', not an unconditional best fit",
              pg.evaluate(TXT, "#purchaseStudio .ps-hero .ps-kicker") == pg.evaluate("t('ps.selected_mattress')"))
        badge = pg.evaluate(TXT, "#purchaseStudio .ps-hero__badge") or ""
        check(f"{tag} the best-match badge comes from the recommendation's own position",
              (pg.evaluate("t('results.match_lead')") in badge) == pg.evaluate(
                  "_resultsState.tierData[window._drawerData[window._favoriteMattressId].tier][0].id === window._favoriteMattressId"), badge)
        check(f"{tag} no demo notice, illustrative mark or operator area anywhere",
              pg.evaluate("document.querySelectorAll('.ps-notice, .ps-illus, #dfDemoOperator').length") == 0
              and "◇" not in pg.evaluate("document.body.innerText"))
        # ---- itemised arithmetic and offers (pay in full) ----
        s0 = st(pg)
        full = expected(s0, "full")
        fin_ = expected(s0, "financed")
        rows = pg.evaluate(ROWS)
        mtxt = pg.evaluate(TXT, "[data-ps='mattress-price']")
        mprice = money_minor(mtxt)
        sub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        check(f"{tag} mattress plus compact rows sum to the merchandise subtotal",
              sub == mprice + sum(money_minor(r["amount"]) or 0 for r in rows) and len(rows) == 3, f"{sub} {rows}")
        check(f"{tag} the subtotal is the independently computed NET (list - offers) and the quote model's own amount",
              sub == full[2] and sub == pg.evaluate("buildConsultationQuote('handoff', 'queen').merchandiseMinor"),
              f"{sub} vs {full}")
        sums = pg.evaluate(TXT, "[data-ps='savings']") or ""
        check(f"{tag} list subtotal, savings and your price rows: list - savings = your price, each as computed here",
              fmt(full[0]) in sums and fmt(full[1]) in sums and full[0] - full[1] == sub
              and pg.evaluate(TXT, "[data-ps='subtotal']").startswith(pg.evaluate("t('ps.your_price')")), sums)
        _ml = unit_minor(s0["fav"], "mattress", "queen")
        _md = _ml * 1000 // 10000
        _md += (_ml - _md) * 500 // 10000
        _md += (_ml - _md) * 300 // 10000
        check(f"{tag} the mattress shows the customer's price (10%, then 5%, then 3% of the remainder) with the list price struck beside it",
              mprice == _ml - _md
              and fmt(_ml) in (pg.evaluate(TXT, "[data-ps='mattress-price'] .ps-was") or ""), mtxt)
        m_offers = pg.evaluate("Array.from(document.querySelectorAll('.ps-hero [data-ps-offer]')).map(e => e.dataset.psOffer)")
        check(f"{tag} combinable mattress offers stack in priority order (10%, pay-in-full 5%, brand 3%)",
              m_offers == full[3].get(s0["fav"]) == ["fx-mattress-10", "fx-cash-5", "fx-excluded-brand"], str(m_offers))
        check(f"{tag} the pillow line carries $20 per unit (two pillows: one offer, $40), base and protector none",
              {r["id"]: r["offers"] for r in rows} == {"base-bt3000": [], "pillow-gel-memory": ["fx-pillow-20"], "protector-vertex": []}
              and money_minor(next(r["amount"] for r in rows if r["id"] == "pillow-gel-memory")) == 2 * unit_minor("pillow-gel-memory", "accessory", None) - 4000)
        allofs = pg.evaluate("Array.from(document.querySelectorAll('[data-ps-offer]')).map(e => e.dataset.psOffer)")
        check(f"{tag} expired, future and unreachable-minimum offers are never applied",
              not ({"fx-expired", "fx-future", "fx-min-big"} & set(allofs))
              and not ({"fx-expired", "fx-future", "fx-min-big"} & set(pg.evaluate("buildConsultationQuote('handoff', 'queen').appliedOffers"))))
        terms = pg.evaluate("Array.from(document.querySelectorAll('[data-ps=\"offer-terms\"] p')).map(p => p.textContent)")
        check(f"{tag} every applied offer's terms are disclosed beside the figures (details)",
              len(terms) == 4 and all(any("FIXTURE" in x for x in terms) for _ in (0,)), str(terms)[:200])
        check(f"{tag} every row has Change and Remove, and a missing pillow slot offers Add",
              all(pg.evaluate(f"!!document.querySelector('[data-ps-change=\"{r['id']}\"]') && !!document.querySelector('[data-ps-remove=\"{r['id']}\"]')") for r in rows)
              and pg.evaluate("!!document.querySelector('[data-ps-add=\"pillow\"]')"))
        # ---- payment comparison ----
        check(f"{tag} pay in full is one payment of the subtotal", money_minor(pg.evaluate(CARD, "full")) == sub)
        c72 = pg.evaluate(CARD, P72)
        check(f"{tag} 9.99%/72 row: payment = FINANCED net (pay-in-full offer dropped) x factor, rounded up",
              money_minor(c72) == fixed_pay(fin_[2]), f"{c72} want {fixed_pay(fin_[2])}")
        c0 = pg.evaluate(CARD, P0) or ""
        check(f"{tag} 0%/48 row (down payment required): no figure before one is entered, and it says so",
              "$" not in c0 and pg.evaluate("t('ps.down_required')") in c0, c0)
        lto = pg.evaluate(CARD, LTO) or ""
        check(f"{tag} lease-to-own reads To confirm with no figure", ("To confirm" in lto or "Por confirmar" in lto) and "$" not in lto, lto)
        check(f"{tag} no plan is preselected: pay in full is the starting choice",
              pg.evaluate("document.querySelector('[data-ps-plan=\"full\"]').getAttribute('aria-pressed')") == "true")
        check(f"{tag} the 'pay in full' offer is not named as dropped while paying in full",
              pg.evaluate("document.querySelector('[data-ps=\"cash-gap\"]')") is None)
        pg.click(f"[data-ps-plan='{P72}']")
        pg.wait_for_timeout(150)
        check(f"{tag} the selected row is marked by text and aria-pressed, not colour alone",
              pg.evaluate(f"document.querySelector('[data-ps-plan=\"{P72}\"]').getAttribute('aria-pressed')") == "true"
              and pg.evaluate(f"document.querySelector('[data-ps-plan=\"{P72}\"] .ps-cmp__sel') !== null"))
        gap = pg.evaluate(TXT, "[data-ps='cash-gap']") or ""
        check(f"{tag} under a plan the pay-in-full offer is dropped and the difference is named",
              money_minor(gap) == fin_[2] - full[2] and fin_[2] > full[2]
              and money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == fin_[2]
              and "fx-cash-5" not in pg.evaluate("Array.from(document.querySelectorAll('.ps-hero [data-ps-offer]')).map(e => e.dataset.psOffer)"), gap)
        fsub = fin_[2]
        big = money_minor(pg.evaluate(TXT, "[data-ps-big]"))
        check(f"{tag} the centerpiece shows the selected plan's monthly figure", big == fixed_pay(fsub))
        check(f"{tag} total paid and merchandise subtotal are both visible without expanding details",
              money_minor(pg.evaluate(FIG, "cost")) == big * 72 and money_minor(pg.evaluate(FIG, "subtotal")) == fsub
              and pg.evaluate(FIG, "interest") is not None)
        check(f"{tag} no double application: payments are computed from the net, never the list or a twice-discounted amount",
              big != fixed_pay(fin_[0]) and big != fixed_pay(fin_[2] - fin_[1]) and fin_[1] > 0)
        check(f"{tag} supporting details sit in one closed disclosure", pg.evaluate("document.getElementById('psDetails').open") is False)
        pg.click("#psDetails summary")
        check(f"{tag} the disclosure carries the amount financed and the scheduled total",
              money_minor(pg.evaluate(DL, "financed")) == fsub and money_minor(pg.evaluate(DL, "scheduled")) == big * 72)
        check(f"{tag} the selected payment is not repeated as a second dashboard",
              pg.evaluate("document.querySelectorAll('#purchaseStudio [data-ps-big]').length") == 1)
        check(f"{tag} the down payment is optional for this plan",
              pg.evaluate(TXT, "label[for='psDownInput']") == pg.evaluate("t('ps.down_label')"))
        # ---- voluntary down payment ----
        pg.fill("#psDownInput", "500")
        check(f"{tag} typing keeps focus in the down-payment field", pg.evaluate("document.activeElement.id") == "psDownInput")
        check(f"{tag} a down payment lowers the amount financed and the payment",
              money_minor(pg.evaluate(DL, "financed")) == fsub - 50000
              and money_minor(pg.evaluate(TXT, "[data-ps-big]")) == fixed_pay(fsub - 50000))
        for bad in ("-5", "abc", str(fsub // 100 + 10)):
            pg.fill("#psDownInput", bad)
            check(f"{tag} down payment {bad!r} is refused and no payment shows",
                  "is-error" in (pg.get_attribute("#psDownMsg", "class") or "")
                  and pg.evaluate("document.querySelector('[data-ps-big]')") is None)
        # ---- required down payment (the 0% plan) ----
        pg.fill("#psDownInput", "")
        pg.click(f"[data-ps-plan='{P0}']")
        pg.wait_for_timeout(150)
        check(f"{tag} 0% plan, no down payment: no figure anywhere, the label says required and the centre says why",
              pg.evaluate("document.querySelector('[data-ps-big]')") is None
              and pg.evaluate(TXT, "label[for='psDownInput']") == pg.evaluate("t('ps.down_label_required')")
              and pg.evaluate("t('ps.down_required')") in (pg.evaluate(TXT, "#psCenterBox") or "")
              and "$" not in (pg.evaluate(TXT, "#psCenterBox .ps-center") or "")
              and pg.evaluate("purchaseSummaryFor(currentLang).payment.kind") == "quote-only", pg.evaluate(TXT, "#psCenterBox"))
        pg.fill("#psDownInput", "500")
        pg.wait_for_timeout(120)
        check(f"{tag} 0% plan with $500 down: equal division of the financed amount, rounded up (net {fsub} >= minimum {P0_MIN})",
              fsub >= P0_MIN and money_minor(pg.evaluate(TXT, "[data-ps-big]")) == eq_pay(fsub - 50000, 48))
        check(f"{tag} 0% rounding is never called interest",
              pg.evaluate(FIG, "interest") == pg.evaluate("t('ps.no_interest')"))
        pg.click(f"[data-ps-plan='{P72}']")
        pg.wait_for_timeout(120)
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
        cur_m = fixed_pay(fsub - 50000)
        new_m = fixed_pay(fsub - base_amt - 50000)
        check(f"{tag} removing the base previews current -> proposed subtotal and monthly under the same terms (difference of two complete quotes)",
              fmt(fsub - base_amt) in pv and fmt(new_m) + "/m" in pv and fmt(cur_m) + "/m" in pv
              and fmt(cur_m - new_m) in pv, pv)
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
        up = st(pg)
        check(f"{tag} Apply swaps the base through the Sleep System and keeps plan and down payment",
              pg.evaluate("'base-tempur-ergo' in window._accCart && !('base-bt3000' in window._accCart)")
              and up["plan"] == P72 and pg.input_value("#psDownInput") == "500")
        check(f"{tag} the upgraded purchase is priced as computed here",
              money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == expected(up, "financed")[2])
        check(f"{tag} the applied change is announced", "TEMPUR-Ergo" in (pg.evaluate("document.getElementById('psLive').textContent") or ""))
        pg.click("[data-ps-change='base-tempur-ergo']")
        pg.click("[data-ps-sheet-opt='base-bt3000']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        # ---- size change re-prices every line ----
        pg.click("[data-ps-size='king']")
        pg.wait_for_timeout(150)
        sk = st(pg)
        ksub = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        krows = pg.evaluate(ROWS)
        check(f"{tag} King re-prices every line at King (no Queen carry-over), as computed here",
              ksub == expected(sk, "financed")[2] and ksub != fsub
              and money_minor(next(r["amount"] for r in krows if r["id"] == "base-bt3000")) == unit_minor("base-bt3000", "accessory", "king")
              and money_minor(next(r["amount"] for r in krows if r["id"] == "protector-vertex")) == unit_minor("protector-vertex", "accessory", "king"))
        check(f"{tag} the payment follows the new purchase immediately",
              money_minor(pg.evaluate(TXT, "[data-ps-big]")) == fixed_pay(ksub - 50000))
        km = fixed_pay(ksub - 50000)
        check(f"{tag} comparison rows show total paid including the down payment",
              fmt(50000 + km * 72) in pg.evaluate(CARD, P72))
        # split King
        pg.click("[data-ps-split='on']")
        pg.wait_for_timeout(150)
        sl = next(r for r in pg.evaluate(ROWS) if r["id"] == "base-bt3000")
        check(f"{tag} split King prices two Twin XL bases", money_minor(sl["amount"]) == 2 * unit_minor("base-bt3000", "accessory", "twin_xl"), sl["amount"])
        check(f"{tag} the split is explicit in the cart (split flag, quantity 2) and the total is as computed here",
              pg.evaluate("window._accCart['base-bt3000'].split === true && window._accCart['base-bt3000'].quantity === 2")
              and money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == expected(st(pg), "financed")[2])
        badq = pg.evaluate("""() => { const sz = answers.mattress_size; answers.mattress_size = 'queen';
          const q = buildConsultationQuote('handoff', 'queen'); answers.mattress_size = sz;
          const l = q.lines.find(x => x.productId === 'base-bt3000'); return [q.status, l.reason, q.merchandiseMinor]; }""")
        check(f"{tag} a split entry at Queen is unresolved (no subtotal), not a single base", badq == ["unresolved", "invalid-split", None], str(badq))
        pg.click("[data-ps-size='queen']")
        pg.wait_for_timeout(150)
        check(f"{tag} leaving King returns the base to one unit",
              pg.evaluate("!window._accCart['base-bt3000'].split && window._accCart['base-bt3000'].quantity === 1"))
        # ---- an unpriced choice: previewed honestly, applied honestly ----
        pg.evaluate("""() => { const p = getPricingConfig(); window.__pfKept = p.products.filter(e => e.productId === 'base-tempur-ergo');
          p.products = p.products.filter(e => e.productId !== 'base-tempur-ergo'); }""")
        pg.click("[data-ps-change='base-bt3000']")
        pg.click("[data-ps-sheet-opt='base-tempur-ergo']")
        pg.wait_for_timeout(150)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        check(f"{tag} an unpriced option is named in the preview, with no figure", "TEMPUR-Ergo" in pv and "$" not in pv, pv)
        pg.click("#psSheetApply")
        pg.wait_for_timeout(200)
        stx = pg.evaluate(TXT, "[data-ps='subtotal']")
        check(f"{tag} an unpriced item makes the subtotal incomplete (never zero, never partial)",
              "$" not in stx and "is-incomplete" in (pg.get_attribute("[data-ps='subtotal']", "class") or "")
              and pg.evaluate("document.querySelector('[data-ps=\"savings\"]')") is None, stx)
        check(f"{tag} no payment is calculated from a partial subtotal",
              pg.evaluate("document.querySelector('[data-ps-big]')") is None and "$" not in (pg.evaluate(CARD, P72) or "")
              and "$" not in (pg.evaluate(CARD, P0) or ""))
        thd = pg.evaluate("psTakeHomeRow().detail")
        psum = pg.evaluate("purchaseSummaryFor(currentLang)") or {}
        TOTAL_KEYS = ("listSubtotalText", "discountText", "merchandiseText", "merchandiseMinor", "discountMinor", "payment")
        check(f"{tag} a missing price: the shared summary is INCOMPLETE (v2, complete:false) and carries no total key at all",
              psum.get("v") == 2 and psum.get("complete") is False and not any(k in psum for k in TOTAL_KEYS)
              and psum.get("incompleteText") == pg.evaluate("t('ps.quote_incomplete')"), str(sorted(psum))[:200])
        ul = [l for l in psum.get("lines", []) if not l.get("priced")]
        pl = [l for l in psum.get("lines", []) if l.get("priced")]
        check(f"{tag} a missing price: the unpriced line says 'price unavailable' with no figure; the priced lines keep theirs",
              len(ul) == 1 and "TEMPUR-Ergo" in ul[0]["name"] and ul[0].get("statusText") == pg.evaluate("t('ps.price_unavailable')")
              and not any(k in ul[0] for k in ("listText", "netText", "discounts"))
              and len(pl) >= 2 and all(money_minor(l["netText"]) is not None for l in pl), str(ul)[:200])
        check(f"{tag} a missing price: no payment or total paid on the take-home, the payment centerpiece shows no figure",
              "/m" not in thd and total_paid_in(thd) is None and "$" not in (pg.evaluate(TXT, "#psCenterBox .ps-center") or "")
              and pg.evaluate("escapeHtml(t('ps.quote_incomplete'))") in thd, thd)
        # Line-level offers on the incomplete purchase (owner direction
        # 2026-10-16): the pillow keeps its minimum-free $20 offer; every
        # mattress offer is withheld because fx-min-big (a minimum) fits the
        # mattress line, so it shows its list price, unstruck.
        irows = {r["id"]: r["offers"] for r in pg.evaluate(ROWS)}
        ihero = pg.evaluate("Array.from(document.querySelectorAll('.ps-hero [data-ps-offer]')).map(e => e.dataset.psOffer)")
        check(f"{tag} incomplete purchase: the priced pillow keeps its line offer; the mattress (a minimum offer fits it) stays at list",
              irows.get("pillow-gel-memory") == ["fx-pillow-20"] and ihero == []
              and pg.evaluate("document.querySelector('.ps-hero .ps-was')") is None, f"{irows} {ihero}")
        check(f"{tag} incomplete purchase: the applied line offer's terms are shown beside it, and no savings total",
              "fx-pillow-20" in [o["offerId"] for o in pg.evaluate("purchaseStudioFor().offerTerms")]
              and pg.evaluate("document.querySelector('[data-ps=\"savings\"]')") is None)
        check(f"{tag} a missing price (pricing ACTIVE): the gate says 'price-unavailable' for that product, not silence",
              pg.evaluate("pricePresentationFor('handoff', ACCESSORIES.find(a => a.id === 'base-tempur-ergo'), answers.mattress_size, null).state")
              == "price-unavailable")
        pg.click("[data-ps-change='base-tempur-ergo']")
        pg.click("[data-ps-sheet-opt='base-bt3000']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(200)
        pg.evaluate("() => { const p = getPricingConfig(); p.products = p.products.concat(window.__pfKept); }")
        pg.evaluate("psRepaint()")
        # ---- a quote-only plan on a complete purchase ----
        pg.click(f"[data-ps-plan='{LTO}']")
        pg.wait_for_timeout(120)
        thd = pg.evaluate("(() => { const d = document.createElement('div'); d.innerHTML = psTakeHomeRow().detail; return d.textContent; })()")
        check(f"{tag} a quote-only plan: To confirm with no figure on the centerpiece and take-home",
              "$" not in (pg.evaluate(TXT, "#psCenterBox .ps-center") or "")
              and ("To confirm" in thd or "Por confirmar" in thd) and "/m" not in thd and total_paid_in(thd) is None, thd)
        pg.click(f"[data-ps-plan='{P72}']")
        pg.wait_for_timeout(120)
        # ---- one meaning of every figure, on every surface ----
        SURF = r"""() => { const m = purchaseStudioFor(); const r = m.result;
          const plans = getFinancingConfig().plans.filter(p => p.kind === 'open-end-promotional-credit');
          const bih = document.createElement('div'); bih.innerHTML = psSheetPanel(plans);
          const row = bih.querySelector('[data-ps-sheet-plan="' + _psPlan + '"]');
          const th = psTakeHomeRow(); const sum = purchaseSummaryFor(currentLang);
          const q = (s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; };
          return { model: r.totalPaidMinor === undefined ? null : r.totalPaidMinor, kind: r.kind,
                   center: q('#psCenterBox [data-ps-fig="cost"] .ps-fig__value'),
                   cmp: q('#purchaseStudio [data-ps-plan="' + _psPlan + '"] .ps-cmp__total'),
                   bih: row ? row.textContent : null, th: th ? th.detail : null,
                   sumTotal: sum && sum.payment.totalPaidText, sumPay: sum && sum.payment.paymentMinor,
                   sub: buildConsultationQuote('handoff', answers.mattress_size, { payment: 'financed' }).merchandiseMinor,
                   financed: q('#psDetails [data-ps-dl="financed"] dd'), scheduled: q('#psDetails [data-ps-dl="scheduled"] dd'),
                   interest: q('#psCenterBox [data-ps-fig="interest"] .ps-fig__value') }; }"""
        last = None
        for plan_id, down_raw in ((P72, ""), (P72, "500"), (P72, "123.45"), (P0, "500"), (P0, "123.45")):
            pg.click(f"[data-ps-plan='{plan_id}']")
            pg.fill("#psDownInput", down_raw)
            pg.wait_for_timeout(120)
            sv = pg.evaluate(SURF)
            down = money_minor("$" + down_raw) if down_raw else 0
            term = 72 if plan_id == P72 else 48
            pay = fixed_pay(fsub - down) if plan_id == P72 else eq_pay(fsub - down, 48)
            want = down + pay * term
            lab = f"{tag} {plan_id} with {down_raw or '$0'} down:"
            check(f"{lab} total paid = down payment + scheduled payments, identical on the centerpiece, comparison, Bring It Home, take-home and the shared summary",
                  sv["sub"] == fsub and sv["model"] == want and money_minor(sv["center"]) == want and total_paid_in(sv["cmp"]) == want
                  and total_paid_in(sv["bih"]) == want and total_paid_in(sv["th"]) == want
                  and money_minor(sv["sumTotal"]) == want and sv["sumPay"] == pay, json.dumps(sv)[:400])
            check(f"{lab} merchandise subtotal, amount financed and scheduled payments stay distinct",
                  money_minor(sv["financed"]) == fsub - down and money_minor(sv["scheduled"]) == pay * term
                  and (down == 0 or want != pay * term), f"{sv['financed']} {sv['scheduled']}")
            if plan_id == P0:
                check(f"{lab} 0% rounding is never called interest", sv["interest"] in ("No interest", "Sin interés"), sv["interest"])
                last = sv
            dnote = pg.evaluate(TXT, "[data-ps='cmp-down']")
            check(f"{lab} the comparison says once, above the rows, whether totals include a down payment",
                  (money_minor(dnote) == down) if down else dnote is None, str(dnote))
        exact_down = fsub % 4800 or 4800
        pg.click(f"[data-ps-plan='{P0}']")
        pg.fill("#psDownInput", f"{exact_down / 100:.2f}")
        pg.wait_for_timeout(120)
        ex = pg.evaluate(SURF)
        check(f"{tag} an exactly divisible 0% schedule states an exact total, an upper bound otherwise",
              ex["center"] and "p to" not in ex["center"] and "asta" not in ex["center"]
              and last and ("p to" in (last["center"] or "") or "asta" in (last["center"] or "")), f"{ex['center']} / {last and last['center']}")
        # a down payment left behind when Pay in full is chosen shapes no figure
        pg.click(f"[data-ps-plan='{P72}']")
        pg.fill("#psDownInput", "")
        pg.wait_for_timeout(120)
        no_down = pg.evaluate("purchaseStudioFor().cards.filter(c => c.kind === 'calc').map(c => c.totalPaidMinor)")
        pg.fill("#psDownInput", "500")
        pg.wait_for_timeout(120)
        pg.click("[data-ps-plan='full']")
        pg.wait_for_timeout(120)
        check(f"{tag} with Pay in full chosen, a leftover down payment changes no plan's total and no note claims it",
              pg.evaluate("purchaseStudioFor().cards.filter(c => c.kind === 'calc').map(c => c.totalPaidMinor)") == no_down
              and pg.evaluate(TXT, "[data-ps='cmp-down']") is None and pg.evaluate("document.getElementById('psDownInput').disabled"))
        pg.click(f"[data-ps-plan='{P72}']")
        pg.wait_for_timeout(120)
        check(f"{tag} choosing a plan again applies the kept down payment", money_minor(pg.evaluate(TXT, "[data-ps='cmp-down']")) == 50000)
        pg.click("[data-ps-plan='full']")
        pg.wait_for_timeout(120)
        fc = pg.evaluate(TXT, "#psCenterBox .ps-center")
        check(f"{tag} pay in full: the centerpiece states the amount once and invents no monthly figure",
              fc.count(fmt(full[2])) == 1 and "/mo" not in fc and "/mes" not in fc, fc)
        thd = pg.evaluate("psTakeHomeRow().detail")
        check(f"{tag} pay in full: the take-home names one payment of the pay-in-full net (pay-in-full offer included)",
              fmt(full[2]) in thd and "/m" not in thd, thd)
        # comparison structure
        pg.click(f"[data-ps-plan='{P72}']")
        pg.fill("#psDownInput", "500")
        pg.wait_for_timeout(150)
        cells = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio .ps-cmp__row--calc')).filter(b => b.querySelector('.ps-cmp__total-amt')).map(b => ({
          areas: ['.ps-cmp__name', '.ps-cmp__main', '.ps-cmp__total'].map(s => { const e = b.querySelector(s); return e ? getComputedStyle(e).gridArea.split(' ')[0] : null; }),
          text: b.textContent.replace(/\\s+/g, ' '), term: b.querySelector('.ps-cmp__choice').textContent }))""")
        check(f"{tag} comparison cells sit in their named columns (choice, monthly, total paid)",
              cells and all(c["areas"] == ["name", "main", "total"] for c in cells), str([c["areas"] for c in cells]))
        check(f"{tag} each plan's term and APR are stated once per row",
              all(c["text"].count(c["term"].split(" ")[0] + " ") == 1 and c["text"].count("APR") == 1 for c in cells), str([c["text"] for c in cells][:2]))
        boxes = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio .ps-cmp__row--calc .ps-cmp__total')).map(e => Math.round(e.getBoundingClientRect().left))""")
        check(f"{tag} total-paid cells align in one column", len(set(boxes)) == 1, str(boxes))
        pg.click("[data-ps-down='500']")
        pg.wait_for_timeout(120)
        pressed = pg.evaluate("Array.from(document.querySelectorAll('[data-ps-down]')).filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.psDown)")
        check(f"{tag} the active down-payment preset is marked (aria-pressed)", pressed == ["500"], str(pressed))
        pg.fill("#psDownInput", "510")
        pg.wait_for_timeout(120)
        check(f"{tag} a custom down payment marks no preset",
              pg.evaluate("Array.from(document.querySelectorAll('[data-ps-down]')).filter(b => b.getAttribute('aria-pressed') === 'true').length") == 0)
        pg.fill("#psDownInput", "500")
        pg.wait_for_timeout(120)
        check(f"{tag} the payment panel is not a live region re-read on every keystroke",
              pg.evaluate("document.getElementById('psCenterBox').getAttribute('aria-live')") is None)
        # ---- replacing two pillows keeps two ----
        UNIT = """(id) => psQuote('queen', { cart: { [id]: { id: id, quantity: 1 } } }).lines.find(l => l.productId === id).unitAmountMinor"""
        old_unit, new_unit = pg.evaluate(UNIT, "pillow-gel-memory"), pg.evaluate(UNIT, "pillow-flow")
        check(f"{tag} pillow units are the fixture prices", (old_unit, new_unit) == (unit_minor("pillow-gel-memory", "accessory", None), unit_minor("pillow-flow", "accessory", None)))
        sub_q = pg.evaluate("buildConsultationQuote('handoff', 'queen', { payment: 'financed' }).merchandiseMinor")
        pg.click("[data-ps-change='pillow-gel-memory']")
        pg.click("[data-ps-sheet-opt='pillow-flow']")
        pg.wait_for_timeout(150)
        state0 = pg.evaluate(STATE)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        want_sub = sub_q + 2 * (new_unit - old_unit)
        check(f"{tag} replacing two pillows previews two of the replacement, and says so",
              fmt(want_sub) in pv and pg.evaluate("!!document.querySelector('[data-ps-config]')"), pv)
        lbl = pg.evaluate(TXT, "#psSheetApply")
        check(f"{tag} Apply names the action and the quantity", lbl and "2" in lbl and lbl not in ("Apply", "Aplicar"), lbl)
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        check(f"{tag} Apply keeps the quantity: two of the new pillow, priced as two (each with its $20 offer)",
              pg.evaluate("window._accCart['pillow-flow'] && window._accCart['pillow-flow'].quantity") == 2
              and "pillow-gel-memory" not in pg.evaluate("Object.keys(window._accCart)")
              and pg.evaluate("buildConsultationQuote('handoff', 'queen', { payment: 'financed' }).merchandiseMinor") == want_sub == expected(st(pg), "financed")[2])
        note = pg.evaluate(TXT, "#psChangeNote") or ""
        check(f"{tag} one visible confirmation states the payment change under the same plan",
              (note.count("$") == 2 or ("stays" in note or "sigue" in note)) and pg.evaluate("document.querySelectorAll('#purchaseStudio .ps-confirm').length") == 1, note)
        pg.click("[data-ps-plan='full']")
        pg.wait_for_timeout(100)
        check(f"{tag} the confirmation clears on the next action", pg.evaluate("document.getElementById('psChangeNote')") is None)
        pg.click(f"[data-ps-plan='{P72}']")
        pg.click("[data-ps-change='pillow-flow']")
        pg.click("[data-ps-sheet-opt='pillow-gel-memory']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        check(f"{tag} and back again: still two", pg.evaluate("window._accCart['pillow-gel-memory'].quantity") == 2)
        # ---- the quantity stepper keeps the keyboard user in place ----
        QB = "#purchaseStudio [data-ps-qty='pillow-gel-memory'][data-ps-delta='{}']"
        FOC = "document.activeElement && document.activeElement.getAttribute('data-ps-delta')"
        pg.focus(QB.format(1))
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(100)
        check(f"{tag} quantity +: focus stays on + after the repaint, and three pillows carry $60 off",
              pg.evaluate("window._accCart['pillow-gel-memory'].quantity") == 3 and pg.evaluate(FOC) == "1"
              and money_minor(next(r["amount"] for r in pg.evaluate(ROWS) if r["id"] == "pillow-gel-memory")) == 3 * old_unit - 6000)
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(100)
        check(f"{tag} quantity at its limit: + is disabled and focus moves to -, not <body>",
              pg.evaluate("window._accCart['pillow-gel-memory'].quantity") == 4
              and pg.is_disabled(QB.format(1)) and pg.evaluate(FOC) == "-1", str(pg.evaluate(FOC)))
        pg.keyboard.press("Enter")
        pg.keyboard.press("Enter")
        pg.wait_for_timeout(100)
        check(f"{tag} quantity -: focus stays on - and the count is back to two",
              pg.evaluate("window._accCart['pillow-gel-memory'].quantity") == 2 and pg.evaluate(FOC) == "-1")
        live = pg.evaluate("document.getElementById('psLive').textContent") or ""
        check(f"{tag} a quantity change is announced with the new count",
              re.search(r"\b2\.$", live.strip()) is not None and ("quantity" in live or "cantidad" in live), live)
        check(f"{tag} the rebuilt count is not itself a live region",
              pg.evaluate("document.querySelector('#purchaseStudio .ps-qty__n[aria-live]')") is None)
        esc = pg.evaluate(r"""() => { const rp = psRefPlan(); const old = rp.headline;
          rp.headline = { en: '<b>x</b> & y', es: '<b>x</b> & y' };
          try { const ids = Object.keys(window._drawerData || {});
                const row = compareRowsFor(window._drawerData[ids[0]].m, window._drawerData[ids[1]].m)
                  .find(r => r.key === 'monthly');
                return row ? row.label : null; }
          finally { rp.headline = old; } }""")
        check(f"{tag} the compare monthly label escapes the plan name",
              esc is not None and "&lt;b&gt;x&lt;/b&gt; &amp; y" in esc and "<b>" not in esc, str(esc))
        # ---- a split King base: kept when the replacement offers it, named when it cannot ----
        pg.click("[data-ps-size='king']")
        pg.click("[data-ps-split='on']")
        pg.wait_for_timeout(150)
        pg.click("[data-ps-change='base-bt3000']")
        pg.click("[data-ps-sheet-opt='base-bt2000']")
        pg.wait_for_timeout(150)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        prev_sub = money_minor(pv.split("→")[1]) if "→" in pv else None
        check(f"{tag} a split-capable replacement previews as a split King", "Twin XL" in pv, pv)
        pg.click("#psSheetApply")
        pg.wait_for_timeout(250)
        check(f"{tag} Apply keeps the split (2 × Twin XL) and matches the preview",
              pg.evaluate("window._accCart['base-bt2000'] && window._accCart['base-bt2000'].split === true && window._accCart['base-bt2000'].quantity === 2")
              and prev_sub == pg.evaluate("buildConsultationQuote('handoff', 'king', { payment: 'financed' }).merchandiseMinor") == expected(st(pg), "financed")[2], f"{prev_sub}")
        pg.click("[data-ps-change='base-bt2000']")
        pg.click("[data-ps-sheet-opt='foundation-princess']")
        pg.wait_for_timeout(150)
        cfgn = pg.evaluate(TXT, "[data-ps-config]") or ""
        check(f"{tag} a replacement with no split option says it becomes one King base BEFORE Apply",
              "King" in cfgn and pg.evaluate("window._accCart['base-bt2000'].split") is True, cfgn)
        pg.click("#psSheetCancel")
        pg.wait_for_timeout(100)
        pg.click("[data-ps-change='base-bt2000']")
        pg.click("[data-ps-sheet-opt='base-bt3000']")
        pg.click("#psSheetApply")
        pg.wait_for_timeout(200)
        pg.click("[data-ps-size='queen']")
        pg.wait_for_timeout(150)
        # ---- the sheet isolates the background and cleans up after itself ----
        INERT = "() => Array.from(document.querySelectorAll('[inert]')).map(e => e.id || e.className).sort().join('|')"
        inert0 = pg.evaluate(INERT)
        pg.click("[data-ps-change='base-bt3000']")
        pg.wait_for_timeout(150)
        check(f"{tag} the open sheet makes the background inert, never itself",
              pg.evaluate("document.getElementById('hf2Screen').hasAttribute('inert') && document.getElementById('sessionUtility').closest('[inert]') !== null")
              and pg.evaluate("document.getElementById('psSheet').closest('[inert]')") is None)
        pg.evaluate("openSafetyDialog('timeout')")
        pg.wait_for_timeout(150)
        pg.keyboard.press("Escape")
        pg.keyboard.press("Tab")
        check(f"{tag} the session-safety dialog above the sheet owns Escape and Tab",
              pg.evaluate("_psSheet !== null") and pg.evaluate("document.getElementById('sessionSafetyDialog').contains(document.activeElement)"))
        pg.evaluate("closeSafetyDialog()")
        pg.wait_for_timeout(150)
        blocked = False
        try:
            pg.click("#sessionLang" + ("Es" if lang == "en" else "En"), timeout=800)
        except PWTimeout:
            blocked = True
        check(f"{tag} the persistent language bar stays unreachable beneath the open sheet", blocked
              and pg.evaluate("document.documentElement.lang") == lang)
        pg.click("[data-ps-sheet-opt='base-tempur-ergo']")
        pg.wait_for_timeout(150)
        ISOLATED = ("() => !document.getElementById('psSheet').hidden && document.getElementById('hf2Screen').hasAttribute('inert')"
                    " && document.getElementById('sessionUtility').closest('[inert]') !== null"
                    " && document.getElementById('psSheet').closest('[inert]') === null")
        for to in (("es", "en") if lang == "en" else ("en", "es")):
            bid = "psSheetLang" + ("En" if to == "en" else "Es")
            pg.click("#" + bid)
            pg.wait_for_function("(l) => document.documentElement.lang === l && _dictInstalledFor === l", arg=to, timeout=5000)
            pg.wait_for_timeout(200)
            check(f"{tag} tapping the sheet's {to.upper()} button switches language with the sheet open and isolated",
                  pg.evaluate(ISOLATED) and pg.evaluate(TXT, "#psSheetCancel") == pg.evaluate("t('ps.cancel')")
                  and pg.evaluate(TXT, ".ps-sheet__lang") is not None)
            check(f"{tag} the {to.upper()} switch keeps the pick, marks the language and keeps focus on the tapped button",
                  pg.evaluate("_psSheet && _psSheet.pick") == "base-tempur-ergo"
                  and pg.evaluate("document.querySelector(\"#psSheet [data-ps-sheet-opt='base-tempur-ergo']\").getAttribute('aria-pressed')") == "true"
                  and pg.evaluate("(id) => document.getElementById(id).getAttribute('aria-pressed')", bid) == "true"
                  and pg.evaluate("document.activeElement && document.activeElement.id") == bid,
                  str(pg.evaluate("document.activeElement && document.activeElement.id")))
        check(f"{tag} a single-language retailer gets no language switch in the sheet",
              pg.evaluate("""() => { const keep = STORE_CONFIG.languages; STORE_CONFIG.languages = ['en']; renderPsSheet();
                const none = !document.querySelector('#psSheet .ps-sheet__lang'); STORE_CONFIG.languages = keep; renderPsSheet();
                return none && !!document.querySelector('#psSheet .ps-sheet__lang'); }"""))
        pg.click("#psSheetCancel")
        pg.wait_for_timeout(150)
        check(f"{tag} closing restores exactly the prior inert state", pg.evaluate(INERT) == inert0, f"{inert0} vs {pg.evaluate(INERT)}")
        # ---- fit and value: one supported line each, never invented ----
        fav0 = pg.evaluate("window._favoriteMattressId")
        why = pg.evaluate(TXT, "[data-ps='fit-why']")
        check(f"{tag} the selected mattress shows only its own catalog highlight",
              why == (pg.evaluate("(id) => mField(window._drawerData[id].m, 'highlight')", fav0) or None)
              and pg.evaluate("typeof psFitReason") == "undefined", why)
        rows_why = pg.evaluate("Array.from(document.querySelectorAll('#purchaseStudio [data-ps-why]')).map(e => e.textContent)")
        allowed = pg.evaluate("Object.keys(ACCESSORY_REASON_COPY).map(k => accessoryReasonText(k))")
        check(f"{tag} accessory reasons come only from the stored answer-matched keys", rows_why and all(x in allowed for x in rows_why), str(rows_why))
        reasons = pg.evaluate(r"""() => { const scored = {}; scoreAccessoriesFromAnswers().forEach(s => { scored[s.id] = s; });
          const tgt = Object.keys(window._accCart || {}).find(id => psStepOf(psAccessory(id)) === 'base') || '';
          const sm = psAccessorySheet('base', tgt);
          return (sm.options || []).map(o => ({ id: o.id, reason: o.reason || '', matched: !!(scored[o.id] && scored[o.id].matched),
                                               first: scored[o.id] ? scored[o.id].reasons[0] : '' })); }""")
        check(f"{tag} the change sheet keeps a matched accessory's reason and shows no generic line for an unmatched one",
              any(r["matched"] for r in reasons) and any(not r["matched"] for r in reasons)
              and all((r["reason"] == r["first"]) if r["matched"] else r["reason"] == "" for r in reasons),
              json.dumps(reasons, ensure_ascii=False)[:300])
        dict_lang = json.loads(_read(f"data/dict-{lang}.json"))
        pg.click(f"[data-ps-plan='{P0}']")
        pg.click("[data-ps-down='500']")
        pg.wait_for_timeout(150)
        bih_round = pg.evaluate(r"""() => { const plans = getFinancingConfig().plans.filter(p => p.kind === 'open-end-promotional-credit');
          const d = document.createElement('div'); d.innerHTML = psSheetPanel(plans);
          const e = d.querySelector('[data-ps="bih-rounding"]'); const row = d.querySelector('[data-ps-sheet-plan="synchrony-0-48"]');
          return { note: e ? e.textContent : null, row: row ? row.textContent : null,
                   sub: buildConsultationQuote('handoff', answers.mattress_size, { payment: 'financed' }).merchandiseMinor }; }""")
        check(f"{tag} Bring It Home explains whole-dollar rounding and upper bounds beneath its totals",
              bih_round["note"] == dict_lang["ps.sheet_rounding"], str(bih_round["note"])[:120])
        check(f"{tag} the explained case is real: a 0% plan's up-to total with $500 down sits above the purchase price",
              (total_paid_in(bih_round["row"]) or 0) > bih_round["sub"], str(bih_round)[:200])
        pg.click(f"[data-ps-plan='{P72}']")
        pg.wait_for_timeout(120)
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
        leads = pg.evaluate("""() => ['gold','silver','bronze'].flatMap(t => (_resultsState.tierData[t] || []).slice(0, 1).map(m => m.id))""")
        check(f"{tag} the mattress sheet starts focused: current, saved, then each tier's leading match, each once",
              ids and ids[0] == fav and len(ids) == len(set(ids)) and all(i in ids for i in leads)
              and len(ids) <= 1 + pg.evaluate("window._savedPicks.length") + 3, str(ids))
        more_n = pg.evaluate("psMattressSheet().more")
        check(f"{tag} More matches names how many remain", more_n > 0 and str(more_n) in (pg.evaluate(TXT, "#psSheetMore") or ""), str(more_n))
        pg.click("#psSheetMore")
        pg.wait_for_timeout(200)
        ids = pg.evaluate("Array.from(document.querySelectorAll('[data-ps-sheet-opt]')).map(b => b.dataset.psSheetOpt)")
        check(f"{tag} More matches adds every remaining recommendation, each once, focus on the first added",
              len(ids) == len(set(ids)) and pg.evaluate("document.getElementById('psSheetMore')") is None
              and pg.evaluate("document.activeElement && document.activeElement.dataset.psSheetOpt") in ids, str(ids))
        ranked = pg.evaluate("""() => ['gold','silver','bronze'].flatMap(t => (_resultsState.tierData[t] || []).map(m => m.id))""")
        pinned = set(leads) | {fav} | set(pg.evaluate("(window._savedPicks || []).map(p => p.id)"))
        check(f"{tag} recommended alternatives (after current, saved and tier leads) keep sleep-fit order",
              [i for i in ids if i in ranked and i not in pinned] == [i for i in ranked if i in ids and i not in pinned]
              and len([i for i in ids if i not in pinned]) >= 2, str(ids))
        state0 = pg.evaluate(STATE)
        unsaved = [i for i in ids if i != fav and not pg.evaluate(f"(window._savedPicks || []).some(p => p.id === '{i}')")]
        alt = "g5" if "g5" in unsaved else unsaved[0]
        check(f"{tag} the alternative previewed is the excluded-brand (Tempur-Pedic) mattress", alt == "g5" and BRAND["g5"] == sp.PURCHASE_EXCLUDED_BRAND, alt)
        check(f"{tag} the mattress Apply says what it does", (pg.evaluate(TXT, "#psSheetApply") or "") in ("Apply", "Aplicar"))
        pg.click(f"[data-ps-sheet-opt='{alt}']")
        pg.wait_for_timeout(200)
        pv = pg.evaluate(TXT, "[data-ps-preview]") or ""
        alt_state = dict(json.loads(state0), fav=alt)
        alt_fin = expected(alt_state, "financed")
        check(f"{tag} previewing an unsaved mattress shows its complete-system subtotal, the excluded brand's offer left out",
              fmt(alt_fin[2]) in pv and alt_fin[3].get(alt) == ["fx-mattress-10"], f"{pv} want {alt_fin}")
        check(f"{tag} previewing a mattress changes nothing (finalist, saved list, cart, plan, down)", pg.evaluate(STATE) == state0)
        pg.click("#psSheetCancel")
        pg.wait_for_timeout(150)
        check(f"{tag} Cancel leaves the purchase unchanged and focus on Change mattress",
              pg.evaluate(STATE) == state0 and pg.evaluate("document.activeElement.id") == "psChangeMattress")
        pg.click("#psChangeMattress")
        if not pg.evaluate(f"!!document.querySelector(\"[data-ps-sheet-opt='{alt}']\")"):
            pg.click("#psSheetMore")
        pg.click(f"[data-ps-sheet-opt='{alt}']")
        check(f"{tag} the mattress Apply names the action", (pg.evaluate(TXT, "#psSheetApply") or "") in ("Choose this mattress", "Elegir este colchón"))
        pg.click("#psSheetApply")
        pg.wait_for_timeout(300)
        s1, st0 = st(pg), json.loads(state0)
        check(f"{tag} Apply makes the alternative the finalist through the app's own selection",
              s1["fav"] == alt and alt in s1["saved"])
        check(f"{tag} size, Sleep System, quantities, plan and down payment survive the swap",
              s1["size"] == st0["size"] and s1["cart"] == st0["cart"] and s1["plan"] == st0["plan"] and s1["down"] == st0["down"])
        check(f"{tag} the Tempur-Pedic finalist carries no brand-excluded offer, as computed here",
              pg.evaluate("Array.from(document.querySelectorAll('.ps-hero [data-ps-offer]')).map(e => e.dataset.psOffer)") == ["fx-mattress-10"]
              and money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == alt_fin[2])
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
                  money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(TXT, "[data-ps-big]")),
                  pg.evaluate("Array.from(document.querySelectorAll('[data-ps-offer]')).map(e => e.dataset.psOffer).join()"))
        pg.evaluate(f"async () => {{ await switchLanguage('{to}'); }}")
        pg.wait_for_timeout(300)
        after = (pg.evaluate("_psPlan"), pg.input_value("#psDownInput"),
                 money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")), money_minor(pg.evaluate(TXT, "[data-ps-big]")),
                 pg.evaluate("Array.from(document.querySelectorAll('[data-ps-offer]')).map(e => e.dataset.psOffer).join()"))
        check(f"{tag} switching language keeps plan, down payment, offers and every figure", before == after, f"{before} {after}")
        pg.evaluate("async () => { await switchLanguage('" + lang + "'); }")
        pg.wait_for_timeout(300)
        # ---- Browse all matches, and the way back to the same purchase ----
        state0 = pg.evaluate(STATE)
        pg.click("#psChangeMattress")
        pg.click("#psSheetBrowse")
        pg.wait_for_timeout(400)
        check(f"{tag} Browse all opens Results with a clear way back, the purchase untouched and nothing left inert",
              pg.evaluate("document.getElementById('resultsScreen').classList.contains('active')")
              and pg.evaluate("!document.getElementById('psReturnBar').hidden && !!document.getElementById('psReturnBtn')")
              and pg.evaluate(STATE) == state0
              and pg.evaluate("!document.getElementById('resultsScreen').closest('[inert]') && !document.getElementById('sessionUtility').hasAttribute('inert')"))
        pg.click("#psReturnBtn")
        pg.wait_for_timeout(500)
        check(f"{tag} the way back lands on the priced sleep system with the same purchase",
              pg.evaluate("document.getElementById('hf2Screen').classList.contains('active')")
              and pg.evaluate("document.activeElement && document.activeElement.id") == "psTitle"
              and pg.evaluate(STATE) == state0 and pg.evaluate("document.getElementById('psReturnBar').hidden") is True)
        pg.click("#psChangeMattress")
        pg.click("#psSheetBrowse")
        pg.wait_for_timeout(300)
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        pg.evaluate("window.showResults()")
        pg.wait_for_timeout(300)
        check(f"{tag} the way back is offered once: reaching the Summary by any route clears it",
              pg.evaluate("document.getElementById('psReturnBar').hidden") is True)
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        # ---- the same purchase on the other surfaces ----
        fin = pg.evaluate("window._favoriteMattressId")
        mlist = unit_minor(fin, "mattress", "queen")
        pg.evaluate("(id) => window.openMattressDrawer(id)", fin)
        pg.wait_for_timeout(400)
        dm = pg.evaluate("(document.querySelector('.drawer-price__monthly') || {}).textContent || ''")
        check(f"{tag} the drawer shows the mattress's own monthly line under the plan in view (one item, list price)",
              money_minor(dm) == fixed_pay(mlist) and pg.evaluate("psRefPlan().id") == P72, dm)
        pg.evaluate("window.closeMattressDrawer()")
        pg.evaluate("window.showSleepPlan('summary')")
        pg.wait_for_timeout(400)
        sp_price = pg.evaluate("(document.querySelector('.hf2-pick__price .hf2-pick__price__amount') || document.querySelector('.hf2-pick__price') || {}).textContent || ''")
        check(f"{tag} the Sleep Plan shows the finalist's price as the Summary's list price (the struck figure), never a different amount",
              money_minor(sp_price) == mlist, sp_price)
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        sub_now = money_minor(pg.evaluate(TXT, "[data-ps='subtotal']"))
        big_now = pg.evaluate(TXT, "[data-ps-big]")
        card_total = pg.evaluate(TXT, f"#purchaseStudio [data-ps-plan='{P72}'] .ps-cmp__total-amt")
        studio_cards = dict(pg.evaluate("""() => purchaseStudioFor().cards.filter(c => c.kind === 'calc').map(c => [c.id, c.monthly])"""))
        pg.evaluate("() => document.getElementById('hf2FinancingExplore').click()")
        pg.wait_for_timeout(500)
        pg.evaluate("() => { const r = document.getElementById('finPathReview-promo-Synchrony'); if (r) r.click(); }")
        pg.wait_for_timeout(500)
        sheet_plans = pg.evaluate("""() => Array.from(document.querySelectorAll('#financingSheet [data-ps-sheet-plan]')).map(li =>
          [li.dataset.psSheetPlan, (li.querySelector('.ps-sheet__amount') || {}).textContent || ''])""")
        check(f"{tag} Bring It Home lists both Synchrony plans with the Summary's own monthly figure",
              len(sheet_plans) == 2 and all(money_minor(a) == money_minor(studio_cards[i]) for i, a in sheet_plans), str(sheet_plans))
        bgap = pg.evaluate("(document.querySelector('#financingSheet [data-ps=\"bih-cash-gap\"]') || {}).textContent || ''")
        check(f"{tag} Bring It Home names the pay-in-full offer plans do not carry", money_minor(bgap) == fin_[2] - full[2], bgap)
        pg.evaluate("() => document.getElementById('psSheetGo').click()")
        pg.wait_for_timeout(500)
        check(f"{tag} Bring It Home routes back to the Summary's comparison",
              pg.evaluate("document.getElementById('financingSheet').hidden === true")
              and pg.evaluate("document.activeElement && document.activeElement.id") == "psTitle")
        # take-home preview and the recorded email payload
        pg.evaluate("window.showEmailCapture()")
        pg.wait_for_timeout(400)
        th = pg.evaluate("document.getElementById('emailPreview').textContent")
        check(f"{tag} the take-home preview carries the same price and payment as the Summary, as 'Your quote'",
              fmt(sub_now) in th and big_now and big_now in th and pg.evaluate("t('ps.th_title_quote')") in th, th[-300:])
        fp = pg.evaluate("emailSendState.previewFingerprint")
        summ = pg.evaluate("purchaseSummaryFor(currentLang)")
        sid = send_email(pg)
        rec = MAIN.by_send(sid)
        q = (rec[0]["json"].get("quote") if rec else None) or {}
        check(f"{tag} the send reached the stub once, with a well-formed sendId", len(rec) == 1 and sp.delivery.valid_send_id(sid), str(len(rec)))
        check(f"{tag} the emailed quote IS the previewed summary (same fingerprint)", q.get("fingerprint") == fp == summ["fingerprint"])
        sums_now = pg.evaluate(TXT, "[data-ps='savings']") or ""
        check(f"{tag} the emailed quote's every *Text equals what the screen shows",
              q.get("merchandiseText") == fmt(sub_now) == pg.evaluate(TXT, "[data-ps='subtotal'] strong")
              and q.get("payment", {}).get("paymentText") == big_now
              and q.get("payment", {}).get("totalPaidText") == card_total
              and q.get("listSubtotalText") in sums_now and q.get("discountText") in sums_now
              and q.get("payment", {}).get("aprText") == pg.evaluate("t('ps.apr', { apr: '9.99' })")
              and q.get("payment", {}).get("downText") == fmt(50000)
              and q.get("exclusionsText") and q.get("exclusionsText") in pg.evaluate("document.getElementById('purchaseStudio').textContent")
              and len(q.get("offerTerms") or []) == len(pg.evaluate("Array.from(document.querySelectorAll('[data-ps=\"offer-terms\"] p'))")),
              json.dumps({k: q.get(k) for k in ("merchandiseText", "listSubtotalText", "discountText", "payment")}, ensure_ascii=False)[:500])
        check(f"{tag} the emailed quote's figures are the independent arithmetic (financed: pay-in-full offer dropped)",
              q.get("merchandiseMinor") == expected(st(pg), "financed")[2] and q.get("discountMinor") == expected(st(pg), "financed")[1]
              and q.get("payment", {}).get("paymentMinor") == fixed_pay(q.get("merchandiseMinor", 0) - 50000))
        check(f"{tag} the send button is done after success", pg.evaluate("document.getElementById('emailSendBtn').classList.contains('sent')"))
        pg.evaluate("window.showSavedPicks()")
        pg.wait_for_timeout(300)
        q_lines = q.get("lines") or []
        rows_now = pg.evaluate(ROWS)
        check(f"{tag} the emailed lines carry the screen's own net amounts, list amounts and offers",
              len(q_lines) == 1 + len(rows_now)
              and q_lines[0]["netText"] == pg.evaluate(TXT, "[data-ps='mattress-price'] .ps-net")
              and [ln["netText"] for ln in q_lines[1:]] == [pg.evaluate(TXT, f"[data-ps-line='{r['id']}'] .ps-net") for r in rows_now]
              and sum(len(ln["discounts"]) for ln in q_lines) == len(pg.evaluate("Array.from(document.querySelectorAll('#purchaseStudio [data-ps-offer]'))")),
              json.dumps(q_lines, ensure_ascii=False)[:300])
        # ---- layout ----
        overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        check(f"{tag} no horizontal overflow", overflow <= 1, str(overflow))
        small = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio button')).filter(b => {
          const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length""")
        check(f"{tag} every studio control meets the 44px touch floor", small == 0, str(small))
        under = pg.evaluate("""() => { const bar = document.getElementById('sessionUtility').getBoundingClientRect();
          const out = [];
          for (const sel of ['#psChangeMattress', '[data-ps-plan="full"]', '[data-ps-plan="synchrony-9-99-72"]', '#psDownInput', '#psDetails summary']) {
            const el = document.querySelector('#purchaseStudio ' + sel); if (!el) { out.push(sel + ':missing'); continue; }
            window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 400);
            el.scrollIntoView({ block: 'nearest' });
            const r = el.getBoundingClientRect();
            if (r.top < bar.bottom) out.push(sel + ':' + Math.round(r.top) + '<' + Math.round(bar.bottom));
          }
          return out; }""")
        check(f"{tag} a studio control revealed from above the viewport lands below the language/Restart bar", under == [], str(under))
        tiny = pg.evaluate("""() => Array.from(document.querySelectorAll('#purchaseStudio *')).filter(e => e.children.length === 0
          && e.offsetParent !== null && /\\$/.test(e.textContent) && parseFloat(getComputedStyle(e).fontSize) < 14)
          .map(e => e.className + ' ' + getComputedStyle(e).fontSize)""")
        check(f"{tag} no money figure or explanation in the studio is smaller than 14px", tiny == [], str(tiny))
        pg.evaluate("window.scrollTo(0, 0)")
        pg.click("#psChangeMattress")
        pg.wait_for_timeout(200)
        small = pg.evaluate("""() => Array.from(document.querySelectorAll('#psSheet button')).filter(b => {
          const r = b.getBoundingClientRect(); return r.width > 0 && (r.width < 44 || r.height < 44); }).length""")
        check(f"{tag} every sheet control meets the 44px touch floor", small == 0, str(small))
        title0 = pg.evaluate(TXT, "#psSheetTitle")
        pg.evaluate("async () => { await switchLanguage('" + ("es" if lang == "en" else "en") + "'); }")
        pg.wait_for_timeout(300)
        title1 = pg.evaluate(TXT, "#psSheetTitle")
        check(f"{tag} an open sheet follows a language switch", title1 and title1 != title0
              and pg.evaluate("document.getElementById('psSheet').hidden") is False, f"{title0} -> {title1}")
        pg.evaluate("async () => { await switchLanguage('" + lang + "'); }")
        pg.wait_for_timeout(300)
        # ---- new-customer wipe (with the sheet open) ----
        pg.evaluate("resetSessionState()")
        pg.wait_for_timeout(200)
        check(f"{tag} the wipe clears plan, down payment, the studio, the open sheet and the send state",
              pg.evaluate("_psPlan") == "full" and pg.evaluate("_psDownRaw") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').innerHTML") == ""
              and pg.evaluate("document.getElementById('purchaseStudio').hidden") is True
              and pg.evaluate("document.getElementById('psSheet').hidden") is True
              and pg.evaluate("document.getElementById('psLive').textContent") == ""
              and pg.evaluate("emailSendState.sendId") is None and pg.evaluate("emailSendState.previewFingerprint") is None
              and pg.evaluate("document.documentElement.lang") == "en")
        check(f"{tag} no console errors", not errs, str(errs[:3]))
        pg.close()

    # ======================================================================
    # 3. offers on the plush consultation (the exclusive offer's mattress)
    # ======================================================================
    print("Offers (exclusive, combinable, pay-in-full-only, minimum, threshold basis):")
    pg, errs = open_page(browser, MAIN.url)
    loaded = fresh_studio(pg, "en", ans=PLUSH, fin=sp.PURCHASE_EXCLUSIVE_ID, avoid="",
                          items=[["pillow-gel-memory", 2]])
    fmt = lambda m: pg.evaluate(FMT, m)  # noqa: E731
    HERO = "Array.from(document.querySelectorAll('.ps-hero [data-ps-offer]')).map(e => e.dataset.psOffer)"
    s = st(pg)
    check("the exclusive offer's mattress is the finalist", s["fav"] == sp.PURCHASE_EXCLUSIVE_ID, str(loaded))
    ex_full = expected(s, "full")
    check("exclusive: fx-exclusive-15 applies ALONE to its one mattress (the combinables never stack on it)",
          pg.evaluate(HERO) == ["fx-exclusive-15"] == ex_full[3].get(s["fav"])
          and money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == ex_full[2])
    check("exclusive: the discount is 15% of the list price, floored",
          pg.evaluate("buildConsultationQuote('handoff', 'queen').lines[0].discountMinor")
          == unit_minor(s["fav"], "mattress", "queen") * 1500 // 10000)
    pg.click(f"[data-ps-plan='{P72}']")
    pg.wait_for_timeout(150)
    check("exclusive: unchanged under a plan (it is not pay-in-full-only), and no pay-in-full gap is claimed",
          pg.evaluate(HERO) == ["fx-exclusive-15"] and pg.evaluate("document.querySelector('[data-ps=\"cash-gap\"]')") is None
          and expected(s, "financed")[2] == ex_full[2])
    pg.click("[data-ps-plan='full']")
    other_ids = pg.evaluate("Object.keys(window._drawerData)")
    probe = pg.evaluate("""(ids) => ids.map(id => { const pk = psPickProjection(id);
      const qf = psQuote(answers.mattress_size, { finalistId: id, savedPicks: window._savedPicks.concat([pk]), payment: 'full' });
      const qn = psQuote(answers.mattress_size, { finalistId: id, savedPicks: window._savedPicks.concat([pk]), payment: 'financed' });
      return { id: id, full: qf.lines[0].discounts.map(d => d.offerId), fin: qn.lines[0].discounts.map(d => d.offerId),
               net: qf.merchandiseMinor, netFin: qn.merchandiseMinor, applied: qf.appliedOffers.concat(qn.appliedOffers) }; })""", other_ids)
    bad = []
    for r in probe:
        sx = dict(s, fav=r["id"])
        ef, en_ = expected(sx, "full"), expected(sx, "financed")
        if r["full"] != ef[3].get(r["id"], []) or r["fin"] != en_[3].get(r["id"], []) or r["net"] != ef[2] or r["netFin"] != en_[2]:
            bad.append((r, ef, en_))
    check(f"every recommended mattress ({len(probe)}) is discounted exactly as computed here, paid in full and financed",
          not bad and len(probe) >= 5, str(bad[:1])[:400])
    tp = [r for r in probe if BRAND[r["id"]] == sp.PURCHASE_EXCLUDED_BRAND]
    check("Tempur-Pedic is excluded from the brand-excluded offer (and still gets the combinables)",
          tp and all("fx-excluded-brand" not in r["full"] and r["full"] == ["fx-mattress-10", "fx-cash-5"] for r in tp), str(tp)[:200])
    others = [r for r in probe if r["id"] not in (sp.PURCHASE_EXCLUSIVE_ID,) and BRAND[r["id"]] != sp.PURCHASE_EXCLUDED_BRAND]
    check("combinable stacking: every other mattress takes 10%, pay-in-full 5% and brand 3%, in priority order; financed drops only the 5%",
          others and all(r["full"] == ["fx-mattress-10", "fx-cash-5", "fx-excluded-brand"]
                         and r["fin"] == ["fx-mattress-10", "fx-excluded-brand"] for r in others), str(others)[:200])
    check("expired, future and unreachable-minimum offers apply to no mattress, paid in full or financed",
          not any({"fx-expired", "fx-future", "fx-min-big"} & set(r["applied"]) for r in probe))
    # pay-in-full-only on a non-exclusive finalist, rendered
    alt = others[0]["id"]
    pg.evaluate("(id) => { window._toggleSavePick(id); window.chooseFinalist(id); window.showSavedPicks(); }", alt)
    pg.wait_for_timeout(300)
    check("pay in full: the pay-in-full-only offer is applied and named on the mattress",
          "fx-cash-5" in pg.evaluate(HERO) and pg.evaluate("document.querySelector('[data-ps=\"cash-gap\"]')") is None)
    # the minimum is judged on the PRE-discount subtotal
    mn = pg.evaluate("""() => { const o = getPricingConfig().offers.find(x => x.id === 'fx-min-big'); const keep = o.minimumMerchandiseMinor;
      const q0 = buildConsultationQuote('handoff', 'queen');
      o.minimumMerchandiseMinor = q0.listMerchandiseMinor; const atList = buildConsultationQuote('handoff', 'queen');
      o.minimumMerchandiseMinor = q0.listMerchandiseMinor + 1; const above = buildConsultationQuote('handoff', 'queen');
      o.minimumMerchandiseMinor = keep;
      return { list: q0.listMerchandiseMinor, net: q0.merchandiseMinor, atList: atList.appliedOffers, above: above.appliedOffers }; }""")
    check("minimum: (on a non-exclusive finalist) a minimum equal to the PRE-discount subtotal is met although the net is below it; one cent more is not",
          mn["net"] < mn["list"] and "fx-min-big" in mn["atList"] and "fx-min-big" not in mn["above"], str(mn))
    pg.click(f"[data-ps-plan='{P72}']")
    pg.wait_for_timeout(150)
    sa = st(pg)
    gap = pg.evaluate(TXT, "[data-ps='cash-gap']") or ""
    check("under a plan: the pay-in-full-only offer is dropped and the note names the difference",
          "fx-cash-5" not in pg.evaluate(HERO) and gap.startswith(pg.evaluate("t('ps.cash_offer_dropped', { amount: '' })").split("(")[0].strip())
          and money_minor(gap) == expected(sa, "financed")[2] - expected(sa, "full")[2], gap)
    check("no double application: list - savings = net, and the plan's payment is computed from that net",
          money_minor(pg.evaluate(TXT, "[data-ps='subtotal']")) == expected(sa, "financed")[0] - expected(sa, "financed")[1]
          == expected(sa, "financed")[2]
          and money_minor(pg.evaluate(TXT, "[data-ps-big]")) == fixed_pay(expected(sa, "financed")[2]))
    # a small purchase is below the 0% plan's minimum: said on the take-home and in the summary
    pg.click(f"[data-ps-plan='{P0}']")
    pg.click("[data-ps-down='500']")
    pg.wait_for_timeout(150)
    small_net = expected(st(pg), "financed")[2]
    summ = pg.evaluate("purchaseSummaryFor(currentLang)")
    thd = pg.evaluate("(() => { const d = document.createElement('div'); d.innerHTML = psTakeHomeRow().detail; return d.textContent; })()")
    below = pg.evaluate("t('ps.below_min')")
    check("below the 0% plan's minimum: no figure, and the summary and take-home both say why",
          small_net < P0_MIN and pg.evaluate("document.querySelector('[data-ps-big]')") is None
          and summ["payment"] == {"kind": "quote-only", "planLabel": summ["payment"]["planLabel"], "note": below}
          and below in thd and "/m" not in thd, f"{small_net} {summ['payment']} {thd}")
    # threshold-unknown: a plan publishing a minimum without a computable basis
    pg.click(f"[data-ps-plan='{P72}']")
    pg.wait_for_timeout(100)
    pg.evaluate("() => { const p = getFinancingConfig().plans.find(x => x.id === 'synchrony-9-99-72'); window.__pfBasis = p.qualifyingBasis; delete p.qualifyingBasis; psRepaint(); }")
    pg.wait_for_timeout(150)
    tu = pg.evaluate("t('ps.threshold_unknown')")
    c72 = pg.evaluate(CARD, P72) or ""
    check("threshold-unknown: no qualifying basis -> no payment anywhere, 'Minimum purchase basis to confirm'",
          pg.evaluate("document.querySelector('[data-ps-big]')") is None and tu in (pg.evaluate(TXT, "#psCenterBox") or "")
          and tu in c72 and "$" not in c72.split(pg.evaluate("t('ps.apr', { apr: '9.99' })"))[-1]
          and pg.evaluate("purchaseSummaryFor(currentLang).payment") .get("note") == tu
          and pg.evaluate("psMattressMonthlyText('drawer', window._drawerData[window._favoriteMattressId].m)") == "", c72)
    pg.evaluate("() => { const p = getFinancingConfig().plans.find(x => x.id === 'synchrony-9-99-72'); p.qualifyingBasis = window.__pfBasis; psRepaint(); }")
    pg.wait_for_timeout(100)
    check("restoring the declared basis restores the payment", money_minor(pg.evaluate(TXT, "[data-ps-big]")) is not None)
    check("offers page: no console errors", not errs, str(errs[:3]))
    pg.close()

    # ======================================================================
    # 4. the send
    # ======================================================================
    print("The take-home send (in-flight guard, stale figures, sendId, email gate):")
    pg, errs = open_page(browser, MAIN.url)
    fresh_studio(pg, "en")
    pg.click(f"[data-ps-plan='{P72}']")
    pg.wait_for_timeout(100)
    pg.evaluate("window.showEmailCapture()")
    pg.wait_for_timeout(300)
    pg.fill("#emailNameInput", "Fixture")
    pg.fill("#emailInput", "inflight@example.com")
    sid, busy = pg.evaluate("""() => { const id = emailSendState.sendId; window.sendResults(); window.sendResults(); window.sendResults();
      const b = document.getElementById('emailSendBtn'); return [id, [b.disabled, b.getAttribute('aria-busy')]]; }""")
    pg.wait_for_timeout(1500)
    pg.evaluate("window.sendResults()")
    pg.wait_for_timeout(500)
    check("in flight: the button is disabled and aria-busy while the request is out", busy == [True, "true"], str(busy))
    check("in flight: three taps while out and one after success send exactly ONE request",
          len(MAIN.by_send(sid)) == 1 and pg.evaluate("document.getElementById('emailSendBtn').classList.contains('sent')"))
    # stale figures are never sent
    n_before = len(MAIN.posts())
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(200)
    pg.evaluate("window.showEmailCapture()")
    pg.wait_for_timeout(300)
    pg.fill("#emailNameInput", "Fixture")
    pg.fill("#emailInput", "stale@example.com")
    fp0 = pg.evaluate("emailSendState.previewFingerprint")
    pg.evaluate("() => { setSleepSystemItemQuantity('pillow-gel-memory', 3); }")
    pg.evaluate("window.sendResults()")
    pg.wait_for_timeout(800)
    fp1 = pg.evaluate("emailSendState.previewFingerprint")
    check("stale figures: nothing is sent, the customer is told, the preview re-renders the new figures and keeps the typed address",
          len(MAIN.posts()) == n_before and pg.evaluate(TXT, "#emailError") == pg.evaluate("t('email.figures_changed')")
          and fp1 != fp0 and fp1 == pg.evaluate("purchaseSummaryFor(currentLang).fingerprint")
          and pg.input_value("#emailInput") == "stale@example.com"
          and pg.evaluate("formatPriceAmount(purchaseSummaryFor(currentLang).merchandiseMinor, 'USD')") in pg.evaluate("document.getElementById('emailPreview').textContent"))
    sid2 = pg.evaluate("emailSendState.sendId")
    pg.click("#emailSendBtn")
    pg.wait_for_timeout(1200)
    r2 = MAIN.by_send(sid2)
    check("the re-previewed figures then send once, carrying the new fingerprint",
          len(r2) == 1 and (r2[0]["json"].get("quote") or {}).get("fingerprint") == fp1)
    # quote null unless pricing.surfaces.email
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(200)
    pg.evaluate("() => { getPricingConfig().surfaces.email = false; }")
    pg.evaluate("window.showEmailCapture()")
    pg.wait_for_timeout(300)
    th_title = pg.evaluate("psTakeHomeRow().title")
    sid3 = send_email(pg, "noemail@example.com", 1200)
    r3 = MAIN.by_send(sid3)
    check("email surface off: the take-home shows the priced system in store only and the payload quote is null",
          th_title == pg.evaluate("escapeHtml(t('ps.th_title'))") and len(r3) == 1 and r3[0]["json"].get("quote") is None
          and "quote" in r3[0]["json"])
    pg.evaluate("() => { getPricingConfig().surfaces.email = true; }")
    # an unpriced line sends no quote
    pg.evaluate("window.showSavedPicks()")
    pg.wait_for_timeout(200)
    pg.evaluate("""() => { const p = getPricingConfig(); window.__pfKept = p.products.filter(e => e.productId === 'protector-vertex');
      p.products = p.products.filter(e => e.productId !== 'protector-vertex'); psRepaint(); }""")
    pg.wait_for_timeout(150)
    sid4 = send_email(pg, "unpriced@example.com", 1200)
    r4 = MAIN.by_send(sid4)
    q4 = (r4[0]["json"].get("quote") or {}) if len(r4) == 1 else {}
    th4 = pg.evaluate("psTakeHomeRow()")
    check("a line with no price: the payload quote is the INCOMPLETE summary - priced lines, a 'price unavailable' line, no total key",
          len(r4) == 1 and q4.get("v") == 2 and q4.get("complete") is False
          and not any(k in q4 for k in ("listSubtotalText", "discountText", "merchandiseText", "merchandiseMinor", "discountMinor", "payment"))
          and any(not l.get("priced") and l.get("statusText") for l in q4.get("lines", []))
          and any(l.get("priced") and l.get("netText") for l in q4.get("lines", [])), str(q4)[:300])
    check("a line with no price: no subtotal on screen",
          "$" not in (pg.evaluate(TXT, "[data-ps='subtotal']") or "$"))

    def th_items(q):
        out = []
        for l in q.get("lines", []):
            head = l["name"] + (" (" + l["detail"] + ")" if l.get("detail") else "") + (" × " + str(l["quantity"]) if l["quantity"] > 1 else "")
            if not l.get("priced"):
                out.append(head + " " + l["statusText"])
            else:
                off = ", ".join(d["label"] + " " + d["amountText"] for d in l["discounts"])
                out.append(head + " " + l["netText"] + (" (" + off + ")" if off else ""))
        return out
    check("the take-home preview shows exactly what the email carries (same fingerprint, same items, the same note)",
          th4["present"] is True and th4["fingerprint"] == q4.get("fingerprint") and th4["items"] == th_items(q4)
          and pg.evaluate("(s) => escapeHtml(s)", q4.get("incompleteText") or "MISSING") in th4["detail"],
          str(th4)[:300])
    pg.evaluate("() => { const p = getPricingConfig(); p.products = p.products.concat(window.__pfKept); }")
    check("send section: no console errors", not errs, str(errs[:3]))
    pg.close()
    # the retry keeps its sendId
    pg, errs = open_page(browser, FAIL500.url)
    fresh_studio(pg, "en")
    sid = send_email(pg, "retry@example.com", 2800)
    r = FAIL500.posts()
    check("a transport failure (HTTP 500) is retried ONCE automatically with the same sendId",
          len(r) == 2 and all(x["json"].get("sendId") == sid for x in r) and r[0]["json"] == r[1]["json"], str(len(r)))
    check("after the automatic retry the button offers the customer's retry",
          pg.evaluate(TXT, "#emailSendBtn") == pg.evaluate("t('email.retry')").strip()
          and pg.evaluate("document.getElementById('emailSendBtn').disabled") is False)
    pg.click("#emailSendBtn")
    pg.wait_for_timeout(2800)
    r = FAIL500.posts()
    check("the customer's retry of the same content reuses the same sendId (server dedupe can hold)",
          len(r) == 4 and all(x["json"].get("sendId") == sid for x in r), str([x["json"].get("sendId") for x in r]))
    pg.fill("#emailInput", "retry-changed@example.com")
    pg.click("#emailSendBtn")
    pg.wait_for_timeout(2800)
    r = FAIL500.posts()
    check("changed contact fields are new content: a NEW sendId",
          len(r) == 6 and r[4]["json"]["sendId"] != sid and r[4]["json"]["sendId"] == r[5]["json"]["sendId"]
          and sp.delivery.valid_send_id(r[4]["json"]["sendId"]))
    pg.close()

    # ======================================================================
    # 5. fail closed
    # ======================================================================
    print("Fail closed (stale evidence, shipped data, sleep fit):")
    for name, srvx in (("stale price evidence", STALE), ("shipped data", SHIPPED)):
        pg, errs = open_page(browser, srvx.url)
        rec_ids = recommended(pg, ANSWERS)
        pg.evaluate("""async (items) => { const ids = Object.keys(window._drawerData || {});
          window.chooseFinalist(ids[0]); for (const [id, n] of items) { setSleepSystemItem(id, true); if (n > 1) setSleepSystemItemQuantity(id, n); }
          window.showSavedPicks(); await new Promise(r => setTimeout(r, 300)); }""", ITEMS)
        check(f"{name}: the studio renders nothing and the model declines",
              pg.evaluate("document.getElementById('purchaseStudio').hidden") is True
              and pg.evaluate("document.getElementById('purchaseStudio').innerHTML") == ""
              and pg.evaluate("purchaseStudioFor().show") is False)
        check(f"{name}: nothing is priced (no price on any surface, no summary, no take-home row)",
              pg.evaluate("""() => Object.keys(window._drawerData).every(id => ['drawer','results','handoff','sleepPlan']
                .every(s => pricePresentationFor(s, window._drawerData[id].m, answers.mattress_size, null).state !== 'available'))""")
              and pg.evaluate("purchaseSummaryFor(currentLang)") is None and pg.evaluate("psTakeHomeRow()") is None)
        sidx = send_email(pg, "closed@example.com", 1200)
        rx = srvx.by_send(sidx)
        check(f"{name}: the payload's quote is null", len(rx) == 1 and "quote" in rx[0]["json"] and rx[0]["json"]["quote"] is None)
        if name == "shipped data":
            rec_plain = rec_ids
        check(f"{name}: no console errors", not errs, str(errs[:3]))
        pg.close()
    pg, errs = open_page(browser, MAIN.url)
    check("sleep fit unchanged: the same answers give the same recommendations with prices and offers on",
          recommended(pg, ANSWERS) == rec_plain, str(rec_plain[:5]))
    pg.close()
    browser.close()

for s_ in (MAIN, FAIL500, STALE, SHIPPED):
    s_.close()
print(f"\nPurchase flow check: {passed} passed, {failed} failed ({time.time() - T0:.0f}s rendered)")
sys.exit(1 if failed else 0)
