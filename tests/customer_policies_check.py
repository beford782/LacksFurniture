#!/usr/bin/env python3
"""Governed retailer customer policies (store-config `customerPolicies`,
2026-10-17): the comfort-exchange card and the "getting your new bed home"
panel on the Consultation Summary, their take-home rows, and the shared
fulfillment preference.

  1. build: the shipped block is all drafts with approval null and validates;
     the harness's approved copy carries FIXTURE signatures that the
     production validator refuses;
  2. shipped data renders NOTHING (sections hidden and empty, no take-home
     rows, no workspace policy card);
  3. approved policies render with pricing DARK (independent of prices):
     timeline from the configured numbers, the conditions, the official links
     on allowlisted hosts only, the specialist statement;
  4. the runtime gate withholds a section that is draft, Spanish-pending,
     unapproved, stale, off-host, malformed or absent - each on its own;
  5. the checklist follows the cart (protector / pillow, in and out), never
     adds an item, never claims eligibility, and does not move the ranking;
  6. the preference: aria-pressed, shared by the workspace, books nothing,
     never enters the purchase model or the send identity, appears in the
     take-home preview only as an in-store row, and is wiped by
     resetSessionState together with the sections;
  7. English/Spanish parity of the rendered structure; a language switch
     keeps the preference; no console errors;
  8. the email: a recorded send (loopback stub) carries no policy copy and
     no preference.

Run:  python tests/customer_policies_check.py
"""
import copy
import json
import os
import sys
import threading
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as sp  # noqa: E402
import validation  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

passed = failed = 0
SECTIONS = ("comfortPromise", "fulfillment", "afterPurchase", "mexicoDelivery")


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


def _json(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return json.load(f)


# ---- 1. build -------------------------------------------------------------------
print("1. Build: shipped drafts, harness fixture refused by the validator")
SHIPPED_CFG = _json("data/store-config.json")
SHIPPED_CAT = _json("data/mattresses.json")
SHIPPED_ACC = _json("data/accessories.json")
SRC = _json("incoming/lacks_consultation_guide.json")["customerPolicies"]
HOSTS = validation.load_source_hosts().get("policySourceHosts")
cp_shipped = SHIPPED_CFG.get("customerPolicies")
check("shipped customerPolicies equals the canonical source (no transform)", cp_shipped == SRC)
check("every shipped section is a draft with approval null and Spanish review pending",
      all(cp_shipped[s]["status"] == "draft" and cp_shipped[s]["approval"] is None
          and cp_shipped[s]["spanishReview"] == "pending" for s in SECTIONS))
check("the shipped block validates", validation.validate_customer_policies(
    SHIPPED_CFG, allowed_source_hosts=HOSTS).ok)
APPROVED = sp.review_customer_policies(SHIPPED_CFG)
rv = validation.validate_customer_policies({"customerPolicies": APPROVED}, allowed_source_hosts=HOSTS)
check("the harness's approved copy is REFUSED by the validator for its FIXTURE signatures",
      (not rv.ok) and sum("not a genuine attestation" in e for e in rv.errors) == len(SECTIONS),
      str(rv.errors[:2]))
check("the harness does not mutate shipped data", SHIPPED_CFG["customerPolicies"] == SRC)
PURCHASE_CFG, PURCHASE_CAT, _VERD, PURCHASE_ACC = sp.build_injected(
    "purchase", datetime.now(timezone.utc).astimezone())
check("the purchase drill carries the approved fixture copy",
      all(PURCHASE_CFG["customerPolicies"][s]["status"] == "approved" for s in SECTIONS))
POLICY_CFG = copy.deepcopy(SHIPPED_CFG)
POLICY_CFG["customerPolicies"] = APPROVED
check("the policies-only config keeps pricing dark",
      POLICY_CFG["pricing"]["displayEnabled"] is False and POLICY_CFG["pricing"]["enabled"] is False)


# ---- servers --------------------------------------------------------------------
class Server:
    def __init__(self, cfg, cat, acc, stub=False):
        self.stub = sp.GasStub("success").start() if stub else None
        if stub:
            cfg = sp.with_gas_url(cfg, self.stub.gas_url)
        self.srv = ThreadingHTTPServer(("127.0.0.1", 0),
                                       sp.make_handler(sp.encode(cfg), sp.encode(cat), sp.encode(acc)))
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}/"

    def posts(self):
        with urllib.request.urlopen(self.stub.recorded_url, timeout=10) as r:
            return [x for x in json.loads(r.read().decode("utf-8")) if x.get("method") == "POST"]

    def close(self):
        self.srv.shutdown()
        self.srv.server_close()
        if self.stub:
            self.stub.stop()


SHIPPED = Server(SHIPPED_CFG, SHIPPED_CAT, SHIPPED_ACC)
POLICY = Server(POLICY_CFG, SHIPPED_CAT, SHIPPED_ACC)
PURCHASE = Server(PURCHASE_CFG, PURCHASE_CAT, PURCHASE_ACC, stub=True)

READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
ANSWERS = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
           "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
           "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
LOAD = """async (o) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  if (typeof resetSessionState === 'function') resetSessionState(); await w(100);
  for (const k in o.answers) answers[k] = o.answers[k];
  showProfileScreen(); window.showResults(); await w(350);
  const ids = Object.keys(window._drawerData || {});
  window.chooseFinalist(ids[0]);
  for (const [id, n] of o.items) { setSleepSystemItem(id, true); if (n > 1) setSleepSystemItemQuantity(id, n); }
  window.showSavedPicks(); await w(300); return ids; }"""
VIEW = """() => {
  const sec = (id, body) => { const s = document.getElementById(id), b = document.getElementById(body);
    return s && b ? { hidden: s.hidden, html: b.innerHTML.trim().length,
    text: s.textContent.replace(/\\s+/g, ' ').trim() } : null; };
  return { comfort: sec('hf2ComfortSection', 'hf2ComfortBody'), home: sec('hf2HomeSection', 'hf2HomeBody'),
    req: Array.from(document.querySelectorAll('#hf2ComfortBody .cpol-req__item')).map(li => [li.dataset.req,
      li.classList.contains('is-in'), li.querySelector('.cpol-req__state').textContent.trim()]),
    steps: Array.from(document.querySelectorAll('#hf2ComfortBody .cpol-step__when')).map(e => e.textContent.trim()),
    links: Array.from(document.querySelectorAll('.cpol .cpol-link')).map(a => [a.href, a.target, a.rel]),
    pressed: Array.from(document.querySelectorAll('#hf2HomeBody [id^="hf2Ff-"]')).map(b => [b.id, b.getAttribute('aria-pressed')]),
    preferred: Array.from(document.querySelectorAll('#hf2HomeBody .cpol-card.is-preferred')).length,
    cards: document.querySelectorAll('#hf2HomeBody .cpol-card').length,
    mexico: !!document.querySelector('#hf2HomeBody .cpol-mexico'),
    after: !!document.querySelector('#hf2HomeBody .cpol-after') }; }"""
CART = "() => JSON.stringify(Object.keys(window._accCart || {}).sort().map(k => [k, window._accCart[k].quantity]))"
RERENDER = "() => { renderHf2(); }"
MOTION_JS = """(sel) => { const out = [];
  document.querySelectorAll(sel).forEach(root => [root, ...root.querySelectorAll('*')].forEach(el => {
    const cs = getComputedStyle(el);
    const moving = (cs.animationName && cs.animationName !== 'none')
      || cs.transitionDuration.split(',').some(d => parseFloat(d) > 0);
    if (moving) out.push((el.id || el.className || el.tagName) + ':' + cs.animationName + '/' + cs.transitionDuration);
  })); return out; }"""



def open_page(browser, url, w=1180, h=820):
    pg = browser.new_page(viewport={"width": w, "height": h})
    errs = []
    pg.on("console", lambda m, e=errs: e.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda x, e=errs: e.append(str(x)))
    pg.goto(url)
    pg.wait_for_function(READY, timeout=20000)
    return pg, errs


def view(pg):
    return pg.evaluate(VIEW)


from playwright.sync_api import sync_playwright  # noqa: E402

with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        # ---- 2. shipped data renders nothing ------------------------------------
        print("2. Shipped data: nothing renders")
        pg, errs = open_page(browser, SHIPPED.url)
        pg.evaluate(LOAD, {"answers": ANSWERS, "items": [["protector-vertex", 1], ["pillow-gel-memory", 1]]})
        v = view(pg)
        check("comfort and home sections hidden and empty under shipped data",
              v["comfort"]["hidden"] and v["home"]["hidden"] and v["comfort"]["html"] == 0 and v["home"]["html"] == 0, str(v))
        check("customerPolicy() is null for every shipped section",
              pg.evaluate("() => ['comfortPromise','fulfillment','afterPurchase','mexicoDelivery'].every(k => customerPolicy(k) === null)"))
        pg.evaluate("window.showEmailCapture()")
        pg.wait_for_timeout(250)
        prev = pg.evaluate("() => document.getElementById('emailPreview').textContent")
        check("no policy row in the take-home preview under shipped data",
              "Comfort Promise" not in prev and "Getting your new bed home" not in prev, prev[:200])
        check("no console errors (shipped)", not errs, str(errs[:3]))
        pg.close()

        # ---- 3. approved, pricing dark ------------------------------------------
        print("3. Approved policies render with pricing dark")
        pg, errs = open_page(browser, POLICY.url)
        pg.evaluate(LOAD, {"answers": ANSWERS, "items": []})
        v = view(pg)
        check("comfort and home sections render while pricing display is off",
              not v["comfort"]["hidden"] and not v["home"]["hidden"]
              and pg.evaluate("() => getPricingConfig().displayEnabled === false"), str(v["comfort"])[:200])
        check("the timeline reads from the configured numbers (Delivery / 30 nights / 90 days)",
              v["steps"] == ["Delivery", "30 nights", "90 days"], str(v["steps"]))
        check("all published conditions are present in the disclosure",
              pg.evaluate("() => document.querySelectorAll('#hf2ComfortBody .cpol-more li').length")
              == len(SRC["comfortPromise"]["conditions"]))
        check("the specialist statement and the official policy link render",
              "Your specialist confirms whether your purchase qualifies." in v["comfort"]["text"]
              and "lacks.com/return-and-store-policies" in v["comfort"]["text"])
        check("every policy link is https on an allowlisted host, opens a new tab, noopener",
              v["links"] and all(h.startswith("https://www.lacks.com/") and t == "_blank" and "noopener" in r
                                 for h, t, r in v["links"]), str(v["links"]))
        check("delivery and pickup cards, Mexico disclosure and after-purchase help render",
              v["cards"] == 2 and v["mexico"] and v["after"], str(v))
        txt = (v["comfort"]["text"] + " " + v["home"]["text"]).lower()
        check("no '90-day return(s)', refund promise, date, booking or price wording",
              not any(w in txt for w in ("90-day return", "90 day return", "full refund", "$", "booked for",
                                         "scheduled for", "in stock", "guaranteed")), txt[:300])
        check("the 'mattresses cannot be exchanged' line is never shown",
              "not covered under" not in txt and "cannot be exchanged" not in txt.replace(
                  "pillows and protectors cannot be refunded or exchanged", ""))

        # ---- 5. checklist follows the cart --------------------------------------
        print("5. Checklist follows the cart; nothing added, nothing claimed")
        check("empty plan: protector and pillow both 'Not in your plan'",
              v["req"] == [["protector", False, "Not in your plan"], ["pillow", False, "Not in your plan"]], str(v["req"]))
        cart0 = pg.evaluate(CART)
        pg.evaluate(RERENDER)
        pg.evaluate(RERENDER)
        check("rendering the checklist adds nothing to the plan", pg.evaluate(CART) == cart0 == "[]", pg.evaluate(CART))
        rank0 = pg.evaluate("() => JSON.stringify(Object.keys(window._drawerData || {}))")
        pg.evaluate("() => { setSleepSystemItem('protector-vertex', true); renderHf2(); }")
        v = view(pg)
        check("protector added: protector 'In your plan', pillow still 'Not in your plan'",
              v["req"] == [["protector", True, "In your plan"], ["pillow", False, "Not in your plan"]], str(v["req"]))
        pg.evaluate("() => { setSleepSystemItem('pillow-gel-memory', true); renderHf2(); }")
        v = view(pg)
        check("pillow added: both 'In your plan'", [r[1] for r in v["req"]] == [True, True], str(v["req"]))
        pg.evaluate("() => { setSleepSystemItem('protector-vertex', false); renderHf2(); }")
        v = view(pg)
        check("protector removed: back to 'Not in your plan'", v["req"][0][1] is False and v["req"][1][1] is True, str(v["req"]))
        check("with both items in the plan the card never says eligible / covered / qualifies",
              not any(w in pg.evaluate("() => { setSleepSystemItem('protector-vertex', true); renderHf2(); "
                                       "return Array.from(document.querySelectorAll('#hf2ComfortBody .cpol-req__state')).map(e => e.textContent).join(' ').toLowerCase(); }")
                      for w in ("eligible", "covered", "qualif", "approved")))
        check("the explicit 'not a confirmation of eligibility' statement is shown beside the checklist",
              "not a confirmation of eligibility" in view(pg)["comfort"]["text"])
        check("recommendation order is unchanged by policy rendering and cart edits",
              pg.evaluate("() => JSON.stringify(Object.keys(window._drawerData || {}))") == rank0)

        # ---- 4. runtime gate, one condition at a time ---------------------------
        print("4. Runtime gate withholds each failing section")
        GATE = """(m) => { const keep = JSON.parse(JSON.stringify(STORE_CONFIG.customerPolicies));
          const s = STORE_CONFIG.customerPolicies.comfortPromise;
          if (m === 'draft') s.status = 'draft';
          if (m === 'es') s.spanishReview = 'pending';
          if (m === 'approval') s.approval = null;
          if (m === 'approvalBlank') s.approval.approvedBy = '  ';
          if (m === 'stale') s.verifiedAt = '2025-01-01';
          if (m === 'future') s.verifiedAt = '2099-01-01';
          if (m === 'host') s.sourceUrl = 'https://example.com/policy';
          if (m === 'http') s.sourceUrl = 'http://www.lacks.com/return-and-store-policies';
          if (m === 'maxAge') s.maxAgeDays = 0;
          if (m === 'array') STORE_CONFIG.customerPolicies.comfortPromise = [];
          if (m === 'absent') delete STORE_CONFIG.customerPolicies.comfortPromise;
          if (m === 'noHosts') STORE_CONFIG.customerPolicies.allowedSourceHosts = [];
          if (m === 'noTitle') delete s.title;
          renderHf2();
          const out = { comfort: document.getElementById('hf2ComfortSection').hidden,
                        empty: document.getElementById('hf2ComfortBody').innerHTML === '' };
          STORE_CONFIG.customerPolicies = keep; renderHf2(); return out; }"""
        for m in ("draft", "es", "approval", "approvalBlank", "stale", "future", "host", "http", "maxAge",
                  "array", "absent", "noHosts", "noTitle"):
            r = pg.evaluate(GATE, m)
            check(f"comfort card withheld when: {m}", r["comfort"] and r["empty"], str(r))
        check("the gate restores cleanly (card back after the cases)", not view(pg)["comfort"]["hidden"])
        r = pg.evaluate("""() => { const keep = JSON.parse(JSON.stringify(STORE_CONFIG.customerPolicies));
          STORE_CONFIG.customerPolicies.fulfillment.status = 'draft'; renderHf2();
          const o = { home: document.getElementById('hf2HomeSection').hidden,
            cards: document.querySelectorAll('#hf2HomeBody .cpol-card').length,
            mexico: !!document.querySelector('#hf2HomeBody .cpol-mexico'),
            heading: (document.getElementById('hf2HomeTitle') || {}).textContent };
          STORE_CONFIG.customerPolicies = keep; renderHf2(); return o; }""")
        check("each home part is gated independently (fulfillment draft: no cards, Mexico and help remain)",
              not r["home"] and r["cards"] == 0 and r["mexico"] and r["heading"] == "Next steps", str(r))
        r = pg.evaluate("""() => { const keep = JSON.parse(JSON.stringify(STORE_CONFIG.customerPolicies));
          ['fulfillment','afterPurchase','mexicoDelivery'].forEach(k => STORE_CONFIG.customerPolicies[k].status = 'draft');
          renderHf2(); const o = document.getElementById('hf2HomeSection').hidden;
          STORE_CONFIG.customerPolicies = keep; renderHf2(); return o; }""")
        check("home section hidden when all three of its parts are drafts", r is True)
        r = pg.evaluate("""() => { const keep = STORE_CONFIG.customerPolicies; delete STORE_CONFIG.customerPolicies;
          renderHf2(); const o = [document.getElementById('hf2ComfortSection').hidden, document.getElementById('hf2HomeSection').hidden];
          STORE_CONFIG.customerPolicies = keep; renderHf2(); return o; }""")
        check("no customerPolicies block at all: both sections hidden, no error", r == [True, True])
        r = pg.evaluate("""() => { const keep = JSON.parse(JSON.stringify(STORE_CONFIG.customerPolicies));
          STORE_CONFIG.customerPolicies.afterPurchase.links[0].url = 'https://example.com/contacts';
          renderHf2(); const hrefs = Array.from(document.querySelectorAll('#hf2HomeBody .cpol-after a')).map(a => a.href);
          STORE_CONFIG.customerPolicies = keep; renderHf2(); return hrefs; }""")
        check("an off-allowlist after-purchase link is not rendered (the others are)",
              r == ["https://www.lacks.com/services#service-form"], str(r))

        # ---- 6. preference --------------------------------------------------------
        print("6. Preference: shared, books nothing, wiped")
        pg.click("#hf2Ff-delivery")
        v = view(pg)
        check("tapping delivery presses it (aria-pressed) and marks only the delivery card",
              v["pressed"] == [["hf2Ff-delivery", "true"], ["hf2Ff-pickup", "false"]] and v["preferred"] == 1, str(v["pressed"]))
        check("focus stays on the pressed control after the repaint",
              pg.evaluate("document.activeElement && document.activeElement.id") == "hf2Ff-delivery")
        # The touch path never focuses the button (and Safari's click does
        # not either): blur, fire the inline touchend handler, and the
        # repaint must still land focus on the pressed control.
        r = pg.evaluate("""() => { document.activeElement && document.activeElement.blur();
          const b = document.getElementById('hf2Ff-pickup');
          new Function('event', b.getAttribute('ontouchend')).call(b, { preventDefault() {} });
          return [_payFulfil, document.activeElement && document.activeElement.id]; }""")
        check("touch activation (no prior focus): preference set and focus returns to the pressed control",
              r == ["pickup", "hf2Ff-pickup"], str(r))
        pg.evaluate("() => { const t = document.getElementById('hf2Ff-pickup'); new Function('event', t.getAttribute('ontouchend')).call(t, { preventDefault() {} }); }")
        pg.evaluate("() => { document.getElementById('hf2Ff-delivery').click(); }")
        check("the preference is the one shared state (_payFulfil)", pg.evaluate("_payFulfil") == "delivery")
        check("the panel says nothing is booked", "Nothing is booked, scheduled or charged" in v["home"]["text"])
        pg.click("#hf2Ff-delivery")
        check("tapping again clears it", pg.evaluate("_payFulfil") == "" and view(pg)["preferred"] == 0)
        pg.click("#hf2Ff-pickup")
        pg.evaluate("window.showEmailCapture()")
        pg.wait_for_timeout(250)
        rows = pg.evaluate("""() => Array.from(document.querySelectorAll('#emailPreview .email-save-row')).map(r =>
          [r.classList.contains('is-empty'), r.textContent.replace(/\\s+/g, ' ').trim()])""")
        pol = [r for r in rows if "Comfort Promise" in r[1] or "Getting your new bed home" in r[1]]
        check("take-home preview: one comfort row and one home row, both in-store (present:false)",
              len(pol) == 2 and all(r[0] for r in pol), str(rows))
        check("the home row names the preference as a preference",
              any("Preference discussed: Warehouse pickup." in r[1] for r in pol), str(pol))
        recap = pg.evaluate("() => document.getElementById('emailRecap').textContent")
        check("the recap marks the policy rows 'in store'",
              "90-Day Comfort Promise — in store" in recap and "Getting your new bed home — in store" in recap, recap)
        pg.evaluate("() => { resetSessionState(); }")
        pg.wait_for_timeout(150)
        check("resetSessionState wipes the preference and empties and hides both sections",
              pg.evaluate("""() => _payFulfil === '' && document.getElementById('hf2ComfortSection').hidden
                && document.getElementById('hf2HomeSection').hidden
                && document.getElementById('hf2ComfortBody').innerHTML === ''
                && document.getElementById('hf2HomeBody').innerHTML === ''"""))
        # Keyboard: Enter and Space operate the toggles, Tab moves between
        # them, the pressed control keeps a visible focus ring after the
        # repaint, and the wipe leaves no focus on a detached control.
        pg.evaluate(LOAD, {"answers": ANSWERS, "items": []})
        pg.focus("#hf2Ff-delivery")
        pg.keyboard.press("Enter")
        k1 = pg.evaluate("""() => ({ pref: _payFulfil, id: document.activeElement && document.activeElement.id,
          ring: getComputedStyle(document.activeElement).outlineStyle,
          ringW: getComputedStyle(document.activeElement).outlineWidth })""")
        check("keyboard Enter sets the preference and focus stays on the control",
              k1["pref"] == "delivery" and k1["id"] == "hf2Ff-delivery", str(k1))
        check("...with a visible keyboard focus ring (3px solid)", k1["ring"] == "solid" and k1["ringW"] == "3px", str(k1))
        pg.keyboard.press("Tab")
        pg.keyboard.press(" ")
        k2 = pg.evaluate("() => [_payFulfil, document.activeElement && document.activeElement.id, "
                         "document.getElementById('hf2Ff-pickup').getAttribute('aria-pressed'), "
                         "document.getElementById('hf2Ff-delivery').getAttribute('aria-pressed')]")
        check("Tab reaches the next choice and Space selects it (pressed state moves)",
              k2 == ["pickup", "hf2Ff-pickup", "true", "false"], str(k2))
        pg.evaluate("() => resetSessionState()")
        pg.wait_for_timeout(150)
        k3 = pg.evaluate("""() => ({ pref: _payFulfil, attached: document.body.contains(document.activeElement),
          buttons: document.querySelectorAll('[id^="hf2Ff-"]').length })""")
        check("reset with focus on the toggle: preference wiped and the controls removed (focus falls back to the page)",
              k3 == {"pref": "", "attached": True, "buttons": 0}, str(k3))
        pg.evaluate(LOAD, {"answers": ANSWERS, "items": []})
        check("the next customer starts with neither choice pressed",
              pg.evaluate("() => Array.from(document.querySelectorAll('[id^=\"hf2Ff-\"]')).map(b => b.getAttribute('aria-pressed'))")
              == ["false", "false"])
        check("the changed Summary UI has no animation or transition (nothing to reduce)",
              pg.evaluate(MOTION_JS, "#hf2ComfortSection, #hf2HomeSection") == [])
        check("no console errors (policies, pricing dark)", not errs, str(errs[:3]))
        pg.close()

        # Reduced motion: the same complete content, nothing animated.
        ctx = browser.new_context(viewport={"width": 1180, "height": 820}, reduced_motion="reduce")
        rp = ctx.new_page()
        rerrs = []
        rp.on("pageerror", lambda x: rerrs.append(str(x)))
        rp.goto(POLICY.url)
        rp.wait_for_function(READY, timeout=20000)
        rp.evaluate(LOAD, {"answers": ANSWERS, "items": ["protector-vertex"]})
        rv_ = view(rp)
        check("reduced motion: both sections render complete (timeline, checklist, cards, toggles)",
              not rv_["comfort"]["hidden"] and not rv_["home"]["hidden"] and rv_["steps"] == ["Delivery", "30 nights", "90 days"]
              and len(rv_["req"]) == 2 and rv_["cards"] == 2 and len(rv_["pressed"]) == 2, str(rv_)[:300])
        # Note: the changed UI has no motion in ANY mode (checked above), so
        # this confirms the reduced-motion render is complete and still
        # motionless; it is not a reduced-motion-specific branch.
        check("reduced motion: matchMedia reports reduce and no element of the changed UI animates",
              rp.evaluate("() => matchMedia('(prefers-reduced-motion: reduce)').matches")
              and rp.evaluate(MOTION_JS, "#hf2ComfortSection, #hf2HomeSection") == [])
        check("reduced motion: no page errors", not rerrs, str(rerrs[:2]))
        ctx.close()

        # ---- 7. Spanish parity ------------------------------------------------------
        print("7. English / Spanish parity")
        pg_en, e_en = open_page(browser, POLICY.url, 1180, 820)
        pg_es, e_es = open_page(browser, POLICY.url, 820, 1180)
        for pgx in (pg_en, pg_es):
            pgx.evaluate(LOAD, {"answers": ANSWERS, "items": [["protector-vertex", 1]]})
            pgx.click("#hf2Ff-pickup")
        pg_es.evaluate("async () => { await switchLanguage('es'); }")
        pg_es.wait_for_timeout(300)
        ve, vs = view(pg_en), view(pg_es)
        shape = lambda v: (len(v["req"]), [r[1] for r in v["req"]], len(v["steps"]), len(v["links"]),
                           v["cards"], v["mexico"], v["after"], v["pressed"])
        check("same structure, states and links in both languages", shape(ve) == shape(vs), f"{shape(ve)} vs {shape(vs)}")
        check("Spanish copy renders (title, timeline, checklist state)",
              "Promesa de Comodidad de 90 Días" in vs["comfort"]["text"] and vs["steps"] == ["Entrega", "30 noches", "90 días"]
              and vs["req"][0][2] == "En tu plan", str(vs["steps"]))
        check("a language switch keeps the preference", pg_es.evaluate("_payFulfil") == "pickup"
              and ["hf2Ff-pickup", "true"] in vs["pressed"])
        check("the Spanish 'no booking' statement renders", "no se reserva, programa ni cobra nada" in vs["home"]["text"])
        sw = pg_es.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth")
        check("no horizontal overflow at 820x1180 in Spanish", sw)
        check("no console errors (EN/ES)", not e_en and not e_es, str((e_en + e_es)[:3]))
        pg_en.close()
        pg_es.close()

        # ---- 6b / 8. purchase model, identity and the email ---------------------
        print("8. Purchase model, send identity and email unchanged by policies")
        pg, errs = open_page(browser, PURCHASE.url)
        pg.evaluate(LOAD, {"answers": ANSWERS, "items": [["protector-vertex", 1], ["pillow-gel-memory", 2]]})
        pg.wait_for_function("() => { const b = document.getElementById('purchaseStudio'); return b && !b.hidden; }", timeout=10000)
        check("the comfort card renders beside the purchase studio",
              not pg.evaluate("document.getElementById('hf2ComfortSection').hidden"))
        before = pg.evaluate("() => JSON.stringify([buildConsultationQuote(), consultationIdentityKey()])")
        pg.click("#hf2Ff-delivery")
        mid = pg.evaluate("() => JSON.stringify([buildConsultationQuote(), consultationIdentityKey()])")
        pg.click("#hf2Ff-pickup")
        after = pg.evaluate("() => JSON.stringify([buildConsultationQuote(), consultationIdentityKey()])")
        check("the preference never changes the purchase quote or the send identity", before == mid == after)
        pg.evaluate("window.showEmailCapture()")
        pg.wait_for_timeout(300)
        pg.fill("#emailNameInput", "Fixture")
        pg.fill("#emailInput", "policy-check@example.invalid")
        pg.click("#emailSendBtn")
        pg.wait_for_timeout(1500)
        posts = PURCHASE.posts()
        body = json.dumps(posts[-1]["json"]) if posts else ""
        check("a send was recorded on the loopback stub", bool(posts))
        check("the recorded payload carries no policy copy and no preference",
              body and not any(w in body for w in ("Comfort Promise", "comfortPromise", "customerPolicies",
                                                   "Warehouse pickup", "Getting your new bed home", "_payFulfil")))
        check("no console errors (purchase)", not errs, str(errs[:3]))
        pg.close()
    finally:
        browser.close()
        for s in (SHIPPED, POLICY, PURCHASE):
            s.close()

print(f"\ncustomer_policies_check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
