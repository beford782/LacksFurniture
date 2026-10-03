#!/usr/bin/env python3
"""The "Bring it home" payment workspace (payment-choice slice 1, 2026-09-27).
RENDERED: the real page in headless Chromium, real clicks and key presses, over
a loopback server on the repository root.

WHY THIS EXISTS. The Payment Choice sheet became a Consultation-Summary-centred
workspace: a chooser of every path, one stage that shows the customer's chosen
sleep system on arrival, a path's governed explanation once explored, a
comparison, or the itemized purchase with its supported edits. The static
suites prove the state machine and the fail-closed renderer in isolation; this
suite proves the owner decisions hold on the real screen:

  * arriving explores, saves and records NOTHING, and the arrival stage shows
    the customer's actual finalist (image, model, size) and selected pieces;
  * one tap explores ONE path; only Consider saves; comparing never saves;
    "not choosing today" and Clear are distinct states;
  * item edits go through the existing purchase model (the Summary mirrors
    them), and the one-line change note names the change without money;
  * a language switch inside the workspace preserves every state;
  * the Summary and Sleep Plan show the saved preference and never an
    explored history; the wipe clears the workspace completely;
  * under the shipped gates, no digit-bearing price, rate, "$" or APR reaches
    the workspace text;
  * every path, the Mexico entry and "not choosing today" are on screen at
    1194x834 and 1024x768 in English and Spanish, with no control under 44px;
  * opened from Results with no finalist, the workspace says so honestly and
    no finalist is silently chosen.

Correction pass (2026-09-30) adds, each with a served-mutation or planted
negative control where the check could otherwise pass vacuously:

  * "Choose a finalist" from Results, the Summary and the Sleep Plan lands on
    a finalist control on Results, selecting, discarding and re-ranking
    nothing;
  * close (Escape, the return control, the close button, a pointer click)
    after exploring, saving or clearing returns focus to the CURRENT opener
    from Results, the Summary and the Sleep Plan - including the Sleep Plan
    opener that a saved preference repaints - releases the background, and
    Tab continues outside the workspace;
  * after viewing four paths and saving one, the Summary and Sleep Plan show
    the saved preference and none of the others, EN and ES, and the
    take-home preview is identical to a customer who never opened payments;
  * every detail (hidden panels included), every comparison pair, every
    topic and the item view carry no rate, term or payment figure;
  * measured 44px targets, computed touch-action, and no horizontal clipping
    or label overflow in every view at 1194x834, 1024x768 and 834x1194, EN/ES;
  * a language switch preserves a real saved preference, explored path,
    comparison and topic;
  * forced colors keeps viewed and saved rows distinct from resting rows.

Run: python tests/payment_workspace_check.py
"""
import functools
import http.server
import os
import re
import sys
import threading

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

ANSWERS = {
    "sleep_position": "side", "sleep_issues": ["back_pain"],
    "health_conditions": ["snoring"], "temperature": "hot", "firmness": 5,
    "partner_sleep": "partner", "partner_disturbance": "sometimes",
    "body_type": "average", "mattress_size": "queen",
}

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


# Negative controls serve a MUTATED copy of index.html from memory at its own
# path, so the real file is never written. Each entry is one planted defect.
OVERRIDES = {}


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        body = OVERRIDES.get(self.path.split("?")[0])
        if body is None:
            return super().do_GET()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def plant(name, old, new):
    """Serve index.html with one substitution at /__mut_<name>.html; the
    substitution must apply exactly once (a control that plants nothing would
    prove nothing)."""
    src = open(os.path.join(REPO, "index.html"), encoding="utf-8").read()
    if src.count(old) != 1:
        raise SystemExit(f"negative control {name!r}: anchor found {src.count(old)} times")
    OVERRIDES[f"/__mut_{name}.html"] = src.replace(old, new).encode("utf-8")
    return f"__mut_{name}.html"


def start_server():
    handler = functools.partial(QuietHandler, directory=REPO)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")

SETUP = r"""async (o) => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const k in o.answers) answers[k] = o.answers[k];
  showProfileScreen(); window.showResults(); await w(300);
  const ids = Object.keys(window._drawerData || {});
  if (o.finalist) { window.chooseFinalist(ids[0]); window._toggleSavePick(ids[1]); }
  if (o.summary) { window.showSavedPicks(); await w(200); }
  if (o.acc) {
    window.addReviewAccessory('base-bt2000'); window.addReviewAccessory('pillow-flow');
    window.changeReviewAccessoryQuantity('pillow-flow', 1); window.addReviewAccessory('protector-dritec');
  }
  await w(150);
  return ids.slice(0, 2);
}"""

STATE = """() => ({ pref: payPref, open: Object.keys(payOpen).filter(function(k) { return payOpen[k] === true; }),
  explored: payExplored.slice(), cmp: _payCompare, topic: _payTopic, view: _payWsView,
  lang: currentLang, sheetHidden: document.getElementById('financingSheet').hidden })"""

FIT = r"""() => {
  const vh = innerHeight, out = { clipped: [], small: [] };
  const ch = document.querySelector('.fin-ws-chooser').getBoundingClientRect();
  document.querySelectorAll('#financingSheet .fin-ws-row, #finWsNotNow').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom > vh + 0.5 || r.bottom > ch.bottom + 0.5 || r.height === 0) out.clipped.push(el.id);
  });
  document.querySelectorAll('#financingSheet button, #financingSheet a[href]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    if (r.height < 44 || r.width < 44) out.small.push((el.id || el.className) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  return out;
}"""

NUMERIC = r"""() => {
  const t = document.getElementById('financingSheet').innerText;
  return { dollars: (t.match(/\$\s?\d/g) || []).length, percent: (t.match(/\d\s*%/g) || []).length,
           apr: (t.match(/\bAPR\b|\bTAE\b/g) || []).length, perPeriod: (t.match(/\/\s*(mo|month|mes)\b/gi) || []).length };
}"""


# Financial content in the WHOLE workspace, hidden panels included
# (textContent, not innerText). The patterns are figure-shaped - a currency
# amount, a percentage, APR/TAE, a per-period rate, a counted term or payment
# - so a product model number (BT2000), a quantity or a size never matches.
FIN_SCAN = r"""(sel) => {
  const root = document.querySelector(sel || '#financingSheet');
  const parts = [];
  if (root) { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); while (w.nextNode()) parts.push(w.currentNode.nodeValue); }
  const t = parts.join(' ');
  const pats = { dollars: /\$\s?\d/g, percent: /\d\s*%/g, apr: /\bAPR\b|\bTAE\b/g,
    perPeriod: /\/\s*(mo|month|mes)\b/gi,
    counted: /\b\d+\s*(months?|meses|weeks?|semanas|payments?|pagos)/gi,
    perMonth: /\d[\d,.]*\s*(per month|a month|al mes|por mes|monthly|mensual(es)?)\b/gi };
  const out = {}; let n = 0;
  for (const k in pats) { const m = t.match(pats[k]) || []; n += m.length; if (m.length) out[k] = m.slice(0, 3); }
  return { n: n, hits: out, len: t.length };
}"""

# Rendered touch targets and horizontal fit of every VISIBLE workspace
# control: measured box >= 44x44, computed touch-action, no box past the
# viewport, no label wider than its own box.
LAYOUT = r"""() => {
  const sheet = document.getElementById('financingSheet'), vw = innerWidth;
  const out = { small: [], touch: [], clipX: [], labelOverflow: [], sheetScrollX: sheet.scrollWidth > sheet.clientWidth + 1, n: 0 };
  sheet.querySelectorAll('button, a[href]').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(el).visibility === 'hidden') return;
    out.n++;
    const name = el.id || el.className;
    if (r.width < 43.99 || r.height < 43.99) out.small.push(name + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    if (getComputedStyle(el).touchAction !== 'manipulation') out.touch.push(name + ':' + getComputedStyle(el).touchAction);
    if (r.left < -0.5 || r.right > vw + 0.5) out.clipX.push(name);
    if (el.scrollWidth > el.clientWidth + 1) out.labelOverflow.push(name + ' ' + el.scrollWidth + '>' + el.clientWidth);
  });
  sheet.querySelectorAll('.fin-ws-row__name, .fin-ws-row__state, .fin-ws-cmp__cell, .fin-ws-cmp__name, .fin-ws-detail__name').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    if (r.right > vw + 0.5) out.clipX.push(el.className);
    if (el.scrollWidth > el.clientWidth + 1) out.labelOverflow.push(el.className + ' ' + el.scrollWidth + '>' + el.clientWidth);
  });
  return out;
}"""

FOCUS_AT = r"""() => {
  const a = document.activeElement, sheet = document.getElementById('financingSheet');
  const r = a && a.getBoundingClientRect ? a.getBoundingClientRect() : null;
  return { id: a ? a.id : '', cls: a ? String(a.className) : '', tag: a ? a.tagName : '',
    connected: !!(a && a.isConnected), inSheet: !!(a && sheet.contains(a)), body: a === document.body,
    rendered: !!(r && r.width > 0 && r.height > 0), sheetHidden: sheet.hidden,
    inert: [...document.querySelectorAll('[inert]')].map(function(e) { return e.id; }).sort(),
    screen: (document.querySelector('.screen.active') || {}).id || '' };
}"""


def new_page(browser, w, h, errors, **ctx):
    context = browser.new_context(viewport={"width": w, "height": h}, **ctx)
    page = context.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    return context, page


# --only nav: just the navigation sections (6: "Choose a finalist" from each
# entry point; 13: the portrait reveal), which run well inside the mutation
# sweep's 180s per-observer timeout. CI runs the whole file; the sweep uses
# this mode as the observer for the navigation entries.
# --only isolation: just section 14 (background isolation, nested dialogs,
# the language rule) - the sweep's observer for those entries.
ONLY = (sys.argv[sys.argv.index("--only") + 1:][:1] or [None])[0] if "--only" in sys.argv else None
NAV_ONLY = ONLY is not None          # any focused mode skips the general sections
RUN_NAV = ONLY in (None, "nav")
RUN_ISO = ONLY in (None, "isolation")


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is required (tools/requirements-suite.txt)")
        return 1
    server = start_server()
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        if not NAV_ONLY:
            # ---- 1. layout: every path on screen, touch floor, no numbers, EN/ES x two landscapes
            print("Layout at both tablet landscapes, EN and ES:")
            for (w, h) in ((1194, 834), (1024, 768)):
                for lang in ("en", "es"):
                    ctx, page = new_page(browser, w, h, errors)
                    page.goto(url, wait_until="networkidle")
                    page.wait_for_function(READY, timeout=20000)
                    if lang == "es":
                        page.evaluate("() => switchLanguage('es')")
                        page.wait_for_timeout(400)
                    page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
                    page.click("#hf2FinancingExplore")
                    page.wait_for_timeout(450)
                    tag = f"[{lang} {w}x{h}]"
                    fit = page.evaluate(FIT)
                    rows = page.eval_on_selector_all("#financingSheet .fin-ws-row", "els => els.length")
                    check(f"{tag} four paths plus the Mexico entry are rows", rows == 5, str(rows))
                    check(f"{tag} every row and 'not choosing today' are on screen", not fit["clipped"], str(fit["clipped"]))
                    check(f"{tag} no workspace control under 44px", not fit["small"], str(fit["small"]))
                    dup = page.evaluate("() => { var seen = {}, d = []; document.querySelectorAll('#financingSheet [id]').forEach(function(e) { if (seen[e.id]) d.push(e.id); seen[e.id] = 1; }); return d; }")
                    check(f"{tag} no duplicate ids inside the workspace", not dup, str(dup))
                    num = page.evaluate(NUMERIC)
                    check(f"{tag} no price, rate or per-period figure under the shipped gates",
                          num == {"dollars": 0, "percent": 0, "apr": 0, "perPeriod": 0}, str(num))
                    page.click("#financingSheetCards .fin-ws-row >> nth=0")
                    page.wait_for_timeout(300)
                    fit2 = page.evaluate(FIT)
                    check(f"{tag} explored view keeps every row on screen", not fit2["clipped"], str(fit2["clipped"]))
                    num2 = page.evaluate(NUMERIC)
                    check(f"{tag} explored view shows no price or rate either", sum(num2.values()) == 0, str(num2))
                    ctx.close()

            # ---- 2. state contract
            print("State contract:")
            ctx, page = new_page(browser, 1194, 834, errors)
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(450)
            s0 = page.evaluate(STATE)
            check("opening records nothing: no explored path, no preference, no history",
                  s0["open"] == [] and s0["pref"] is None and s0["explored"] == [] and s0["sheetHidden"] is False, str(s0))
            view = page.eval_on_selector("#finWsStage", "e => e.dataset.view")
            check("arrival shows the customer's sleep system", view == "showcase", view)
            fav = page.evaluate("() => { var p = (window._savedPicks || []).filter(function(x) { return x.id === window._favoriteMattressId; })[0]; return p ? { name: p.name, img: p.imageUrl || p.image } : null; }")
            show_name = page.inner_text("#finWsShowTitle")
            check("the arrival stage names the actual finalist", fav is not None and show_name.strip() == fav["name"], f"{show_name!r} vs {fav}")
            img_src = page.get_attribute(".fin-ws-show__img", "src")
            check("the arrival stage shows the finalist's own catalog image", bool(fav) and img_src == fav["img"], str(img_src))
            check("the arrival stage names the selected size", "Queen" in page.inner_text(".fin-ws-show__meta"))
            check("the arrival stage lists the selected pieces", page.eval_on_selector_all(".fin-ws-part", "e => e.length") == 3)
            page.click("#financingSheetCards .fin-ws-row >> nth=1")
            page.wait_for_timeout(300)
            s1 = page.evaluate(STATE)
            check("one tap explores exactly that path and saves nothing", len(s1["open"]) == 1 and s1["pref"] is None, str(s1))
            check("the explored row says so in text", "viewing" in page.inner_text("#financingSheetCards .fin-ws-row.is-explored").lower())
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            page.wait_for_timeout(300)
            s2 = page.evaluate(STATE)
            check("exploring another path replaces the explored one (one at a time)", len(s2["open"]) == 1 and s2["open"] != s1["open"], str(s2))
            page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(300)
            s3 = page.evaluate(STATE)
            check("Consider is the only action that sets the preference", s3["pref"] == s2["open"][0], str(s3))
            check("the saved row carries the considering text", "✓" in page.inner_text("#financingSheetCards .fin-ws-row.is-pref"))
            page.click("#financingSheetCards .fin-ws-row >> nth=1")
            page.wait_for_timeout(250)
            page.click(".fin-ws-cmp-start:visible")
            page.wait_for_timeout(200)
            page.click("#financingSheetCards .fin-ws-row.is-picking >> nth=1")
            page.wait_for_timeout(300)
            s4 = page.evaluate(STATE)
            check("comparing sets a counterpart and never touches the preference", s4["cmp"] and s4["pref"] == s3["pref"], str(s4))
            check("the compare view is titled as a comparison of two options", "Comparing two options" in page.inner_text("#finWsStage"))
            page.click("#finWsCmpDone")
            page.wait_for_timeout(200)
            page.click("#finWsNotNow")
            page.wait_for_timeout(250)
            s5 = page.evaluate(STATE)
            check("'not choosing today' is its own state, pressed", s5["pref"] == "not_now" and page.get_attribute("#finWsNotNow", "aria-pressed") == "true", str(s5))
            page.click("#finWsNotNow")
            page.wait_for_timeout(250)
            check("pressing it again returns to not selected", page.evaluate(STATE)["pref"] is None)
            page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(250)
            page.click("[id^='finPathClear-']:visible")
            page.wait_for_timeout(250)
            s6 = page.evaluate(STATE)
            check("Clear returns to not selected (distinct from 'not choosing today')", s6["pref"] is None, str(s6))

            # topic
            page.click("#finWsTopicBtn")
            page.wait_for_timeout(150)
            before = page.evaluate(STATE)
            page.click("#finWsTopic-due")
            page.wait_for_timeout(250)
            after = page.evaluate(STATE)
            check("a topic explains, and explores, selects or reorders nothing",
                  after["topic"] == "due" and after["open"] == before["open"] and after["pref"] == before["pref"], str(after))
            note = page.inner_text(".fin-ws-topic-note")
            check("the 'Due today' topic explains what must be confirmed, with no figure",
                  "confirmed" in note and not re.search(r"\d", note), note)

            # item edits through the existing model
            page.click("#finWsIdentItems")
            page.wait_for_timeout(250)
            cart = lambda: page.evaluate("() => Object.fromEntries(Object.entries(window._accCart).map(([k, v]) => [k, v.quantity || 1]))")
            page.click("#finWsQtyInc-pillow-flow")
            page.wait_for_timeout(250)
            check("the quantity step goes through the purchase model", cart().get("pillow-flow") == 3, str(cart()))
            page.click("#finWsRemove-base-bt2000")
            page.wait_for_timeout(250)
            check("removing the base updates the purchase model", "base-bt2000" not in cart(), str(cart()))
            change = page.inner_text(".fin-ws-change")
            check("the change note names the removed item, with no money", "BedTech" in change and "$" not in change, change)
            check("the Summary mirrors the removal", "BT2000" not in page.inner_text("#hf2AccessoriesList"))
            page.click("#finWsAddBack-base-bt2000")
            page.wait_for_timeout(250)
            check("Add back restores it", "base-bt2000" in cart(), str(cart()))
            fav0 = page.evaluate("() => window._favoriteMattressId")
            page.click(".fin-ws-finalist[aria-pressed='false']")
            page.wait_for_timeout(300)
            fav1 = page.evaluate("() => window._favoriteMattressId")
            check("switching finalist chooses an existing saved pick", fav1 and fav1 != fav0
                  and page.evaluate("(id) => window._savedPicks.some(function(p) { return p.id === id; })", fav1))

            # language switch preserves everything
            page.click("[id^='finPathConsider-']") if page.is_visible("[id^='finPathConsider-']") else None
            page.click("#finWsIdentItems") if page.is_visible("#finWsIdentItems") else None
            sa = page.evaluate(STATE)
            page.click("#finWsLangEs")
            page.wait_for_timeout(600)
            sb = page.evaluate(STATE)
            check("the in-workspace language switch preserves every workspace state",
                  {k: v for k, v in sa.items() if k != "lang"} == {k: v for k, v in sb.items() if k != "lang"} and sb["lang"] == "es",
                  f"{sa} -> {sb}")
            check("the workspace chrome switched language", "Volver" in page.inner_text("#financingSheetBack"))
            page.click("#finWsLangEn")
            page.wait_for_timeout(600)

            # return to the Summary
            if page.is_visible("#finWsItemsBack"):
                page.click("#finWsItemsBack")
                page.wait_for_timeout(200)
            if page.get_attribute("[id^='finPathReview-plan-lacks']", "aria-expanded") != "true":
                page.click("[id^='finPathReview-plan-lacks']")
                page.wait_for_timeout(200)
            if page.is_visible("[id^='finPathConsider-']:visible"):
                page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(250)
            page.click("#financingSheetBack")
            page.wait_for_timeout(350)
            summary = page.inner_text("#hf2Financing")
            check("the Summary shows the saved preference", "Lacks In-House Credit" in summary, summary[:160])
            # A word check alone proves little (section 8 below proves the viewed
            # options themselves are absent, in both languages); this pins the
            # retired label.
            check("the Summary carries no retired 'Options explored' label", "options explored" not in page.inner_text("#hf2Screen").lower())
            check("closing releases the background (no inert screen or utility bar)",
                  page.evaluate("() => !document.getElementById('hf2Screen').hasAttribute('inert') && !document.getElementById('sessionUtility').hasAttribute('inert')"))
            page.evaluate("() => window.showSleepPlan('summary')")
            page.wait_for_timeout(300)
            plan = page.inner_text("#sleepPlanFinancing")
            check("the on-screen Sleep Plan keeps the saved preference", "Lacks In-House Credit" in plan, plan[:160])
            check("the Sleep Plan carries no retired 'Options explored' label", "options explored" not in plan.lower())

            # wipe
            page.evaluate("() => window.showSavedPicks()")
            page.wait_for_timeout(200)
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(300)
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            page.evaluate("() => { window.setPaymentTopic('full'); }")
            page.evaluate("() => window.startOver()")
            page.wait_for_timeout(700)
            w = page.evaluate("() => ({ pref: payPref, open: Object.keys(payOpen).length, explored: payExplored.length, cmp: _payCompare, topic: _payTopic, view: _payWsView, removed: _payWsRemoved.length, hidden: document.getElementById('financingSheet').hidden, inert: [...document.querySelectorAll('[inert]')].map(function(e) { return e.id; }).sort() })")
            check("the wipe clears the workspace and releases the background",
                  w["pref"] is None and w["open"] == 0 and w["explored"] == 0 and w["cmp"] is None and w["topic"] == ""
                  and w["view"] == "" and w["removed"] == 0 and w["hidden"] is True
                  and w["inert"] == ["mattressDrawer", "sessionSafetyDialog"], str(w))
            ctx.close()

            # ---- 3. keyboard: focus in, trap, Escape restores
            print("Keyboard and focus:")
            ctx, page = new_page(browser, 1194, 834, errors)
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
            page.focus("#hf2FinancingExplore")
            page.keyboard.press("Enter")
            page.wait_for_timeout(450)
            check("focus moves to the workspace title", page.evaluate("() => document.activeElement.id") == "financingSheetTitle")
            page.focus("[id^='finPathReview-plan-lacks']")
            page.keyboard.press("Enter")
            page.wait_for_timeout(300)
            check("exploring by keyboard keeps focus on the row", page.evaluate("() => document.activeElement.id").startswith("finPathReview-plan-lacks"))
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            check("Escape closes and restores focus to the opener", page.evaluate("() => document.activeElement.id") == "hf2FinancingExplore")
            ctx.close()

            # ---- 3b. pointer taps keep focus inside the dialog (Escape still works)
            ctx, page = new_page(browser, 1194, 834, errors)
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(400)
            page.click("#financingSheetCards .fin-ws-row >> nth=1")
            page.wait_for_timeout(250)
            in_sheet = page.evaluate("() => document.getElementById('financingSheet').contains(document.activeElement)")
            check("after a pointer tap on a row, focus stays inside the dialog", in_sheet)
            page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(250)
            check("after a pointer tap on Consider, focus stays inside the dialog",
                  page.evaluate("() => document.getElementById('financingSheet').contains(document.activeElement)"))
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)
            check("Escape still closes the workspace after pointer taps", page.evaluate("() => document.getElementById('financingSheet').hidden"))
            ctx.close()

            # ---- 3c. portrait fallback: one column, nothing overlaps, everything reachable
            print("Portrait fallback:")
            for lang in ("en", "es"):
                ctx, page = new_page(browser, 834, 1194, errors)
                page.goto(url, wait_until="networkidle")
                page.wait_for_function(READY, timeout=20000)
                if lang == "es":
                    page.evaluate("() => switchLanguage('es')")
                    page.wait_for_timeout(400)
                page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
                page.click("#hf2FinancingExplore")
                page.wait_for_timeout(400)
                for step in ("arrival", "explored"):
                    if step == "explored":
                        page.click("#financingSheetCards .fin-ws-row >> nth=0")
                        page.wait_for_timeout(300)
                    geo = page.evaluate("""() => {
                      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY }; };
                      return { chooser: r('.fin-ws-chooser'), stage: r('#finWsStage'), foot: r('.fin-ws-foot'),
                               overflowX: document.getElementById('financingSheet').scrollWidth > innerWidth };
                    }""")
                    # Arrival establishes the purchase before the list; once a path
                    # is explored its panel follows the list. Either way: no overlap.
                    first, second = ("stage", "chooser") if step == "arrival" else ("chooser", "stage")
                    ok = (geo["chooser"] and geo["stage"] and geo["foot"]
                          and geo[first]["bottom"] <= geo[second]["top"] + 0.5
                          and geo[second]["bottom"] <= geo["foot"]["top"] + 0.5 and not geo["overflowX"])
                    check(f"[{lang} 834x1194 {step}] {first}, {second} and footer stack in order without overlap", ok, str(geo))
                ctx.close()

            # ---- 4. Results entry, no finalist: honest, nothing chosen
            print("Results entry without a finalist:")
            ctx, page = new_page(browser, 1194, 834, errors)
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": False, "summary": False, "acc": False})
            page.evaluate("() => document.getElementById('resultsFinancingExplore').click()")
            page.wait_for_timeout(450)
            check("the workspace opens from Results with a Results return",
                  page.is_visible("#financingSheet") and "matches" in page.inner_text("#financingSheetBack").lower())
            check("no finalist says so honestly", page.inner_text("#finWsShowTitle").strip() == "No finalist selected yet")
            check("no finalist is silently chosen", page.evaluate("() => window._favoriteMattressId || ''") == "")
            ctx.close()

            # ---- 5. reduced motion
            ctx, page = new_page(browser, 1194, 834, errors, reduced_motion="reduce")
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(300)
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            check("reduced motion: the stage change is instant (no animation)",
                  page.evaluate("() => getComputedStyle(document.querySelector('.fin-ws-stage > *')).animationName") == "none")
            ctx.close()

        def load(w=1194, h=834, lang="en", path="index.html", **setup):
            ctx, page = new_page(browser, w, h, errors)
            page.goto(url.replace("index.html", path), wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            if lang == "es":
                page.evaluate("() => switchLanguage('es')")
                page.wait_for_timeout(400)
            opts = {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True}
            opts.update(setup)
            page.evaluate(SETUP, opts)
            return ctx, page

        def open_by_key(page, opener):
            page.focus("#" + opener)
            page.keyboard.press("Enter")
            page.wait_for_timeout(400)

        ORIGINS = {
            "Results": ("resultsFinancingExplore", "() => { window.backToResultsFromReview(); }"),
            "Summary": ("hf2FinancingExplore", "() => { window.showSavedPicks(); }"),
            "Sleep Plan": ("sleepPlanFinancingExplore", "() => { window.showSleepPlan('summary'); }"),
        }

        if RUN_NAV:
            # ---- 6. "Choose a finalist" from every entry point (correction pass 1)
            print("Choose a finalist, with no finalist, from each entry point:")
            RESULT_IDS = "() => [...document.querySelectorAll('#resultsScreen .finalist-btn')].map(function(b) { return b.dataset.id; })"
            SESSION = """() => ({ fav: window._favoriteMattressId || '', picks: (window._savedPicks || []).map(function(p) { return p.id; }),
              answers: JSON.stringify(answers), cart: Object.keys(window._accCart || {}).sort(), lang: currentLang })"""

            def choose_finalist_case(origin, lang, path="index.html"):
                opener, go = ORIGINS[origin]
                ctx, page = load(lang=lang, path=path, finalist=False, summary=False, acc=False)
                before_ids = page.evaluate(RESULT_IDS)
                page.evaluate("() => window._toggleSavePick(Object.keys(window._drawerData)[1])")
                page.evaluate(go)
                page.wait_for_timeout(300)
                before = page.evaluate(SESSION)
                open_by_key(page, opener)
                shown = page.is_visible("#finWsChooseFinalist")
                page.focus("#finWsChooseFinalist")
                page.keyboard.press("Enter")
                page.wait_for_timeout(700)
                f = page.evaluate(FOCUS_AT)
                after = page.evaluate(SESSION)
                after_ids = page.evaluate(RESULT_IDS)
                in_view = page.evaluate("() => { var r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }")
                ctx.close()
                return shown, f, before, after, before_ids, after_ids, in_view

            for origin in ORIGINS:
                for lang in ("en", "es"):
                    tag = f"[{origin} {lang}]"
                    shown, f, before, after, b_ids, a_ids, in_view = choose_finalist_case(origin, lang)
                    check(f"{tag} the empty stage offers 'Choose a finalist'", shown)
                    check(f"{tag} it returns to the mattress choices (Results active, workspace closed)",
                          f["screen"] == "resultsScreen" and f["sheetHidden"], str(f))
                    check(f"{tag} focus lands on a finalist control, visible on screen",
                          "finalist-btn" in f["cls"] and f["rendered"] and in_view and not f["inSheet"], str(f))
                    check(f"{tag} nothing is selected, discarded or re-ranked",
                          after == before and after["fav"] == "" and a_ids == b_ids and bool(a_ids),
                          f"{before} -> {after}; {b_ids[:3]} -> {a_ids[:3]}")
                    check(f"{tag} the background is released", f["inert"] == ["mattressDrawer", "sessionSafetyDialog"], str(f["inert"]))
            # Negative control: the pre-correction route (Results and Summary only).
            mut = plant("choose_finalist_old",
                        "      var results = document.getElementById('resultsScreen');\n      if (results && results.classList.contains('active')) {\n        if (typeof focusFirstFinalistControl === 'function') focusFirstFinalistControl();\n        return;\n      }\n      if (typeof window.sleepPlanChooseFinalist === 'function') window.sleepPlanChooseFinalist();",
                        "      var hf2 = document.getElementById('hf2Screen');\n      if (hf2 && hf2.classList.contains('active')) window.backToResultsFromReview();")
            _, f, *_ = choose_finalist_case("Sleep Plan", "en", path=mut)
            check("control: the pre-correction route is DETECTED from the Sleep Plan (it stays on the Plan)",
                  f["screen"] == "sleepPlanScreen", str(f))


            # ---- 13. portrait: an explicitly opened option is brought into view
            print("Portrait: opening an option brings its panel into view:")
            GEO = r"""(pathId) => {
              const sheet = document.getElementById('financingSheet'), vh = innerHeight;
              const enc = (k) => document.querySelector('[id^="' + k + '-"][data-path-id="' + pathId + '"], #' + CSS.escape(k + '-' + pathId));
              const head = document.getElementById(finPathDom('finWsName', pathId));
              const act = document.getElementById(finPathDom('finPathConsider', pathId)) || document.getElementById(finPathDom('finPathClear', pathId));
              const row = document.getElementById(finPathDom('finPathReview', pathId));
              const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vis: r.top >= -0.5 && r.bottom <= vh + 0.5 }; };
              const hit = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); const x = r.left + Math.min(20, r.width / 2), y = r.top + r.height / 2;
                if (y < 0 || y > vh) return false; const at = document.elementFromPoint(x, y); return !!at && (at === e || e.contains(at)); };
              return { scroll: sheet.scrollTop, maxScroll: sheet.scrollHeight - sheet.clientHeight, vh: vh,
                       head: box(head), headHit: hit(head), act: box(act), actHit: hit(act), row: box(row), rowHit: hit(row),
                       active: document.activeElement ? document.activeElement.id : '', view: document.getElementById('finWsStage').dataset.view };
            }"""

            def portrait_page(lang, w=834, h=1194, path="index.html", **ctx):
                c, p = new_page(browser, w, h, errors, **ctx)
                p.goto(url.replace("index.html", path), wait_until="networkidle")
                p.wait_for_function(READY, timeout=20000)
                if lang == "es":
                    p.evaluate("() => switchLanguage('es')")
                    p.wait_for_timeout(400)
                p.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
                p.click("#hf2FinancingExplore")
                p.wait_for_timeout(400)
                return c, p

            def to_top(p):
                p.evaluate("() => { document.getElementById('financingSheet').scrollTop = 0; }")
                p.wait_for_timeout(100)

            for (w, h) in ((834, 1194), (768, 1024)):
                for lang in ("en", "es"):
                    c, p = portrait_page(lang, w, h)
                    ids = p.evaluate("() => finPaymentPaths().map(function(x) { return x.id; })")
                    tag = f"[{lang} {w}x{h}]"
                    for pid in ids:
                        to_top(p)
                        p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{pid}']")
                        p.wait_for_timeout(900)
                        g = p.evaluate(GEO, pid)
                        check(f"{tag} {pid}: the opened panel's heading is in view and unobscured",
                              g["head"] and g["head"]["vis"] and g["headHit"] and g["scroll"] > 0, str(g))
                        # A panel that fits on screen shows its actions too; a taller
                        # one keeps its heading and the actions follow by scrolling.
                        fits = g["act"] and g["head"] and (g["act"]["bottom"] - g["head"]["top"]) <= g["vh"] - 12
                        check(f"{tag} {pid}: its actions are in view and unobscured (or, for a taller panel, reachable below)",
                              g["act"] and ((g["act"]["vis"] and g["actHit"]) if fits else g["act"]["bottom"] - g["vh"] <= g["maxScroll"] - g["scroll"] + 1), str(g))
                    # Saving, clearing, a language switch and a repaint never scroll.
                    pid = ids[1]
                    to_top(p)
                    p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{pid}']")
                    p.wait_for_timeout(900)
                    # What the customer sees must not move: the panel heading's
                    # on-screen position (scroll offsets can legitimately differ
                    # when the browser anchors the view through a reflow above).
                    y0 = p.evaluate(GEO, pid)["head"]["top"]
                    still = {}
                    p.click(f"[id='{p.evaluate('(i) => finPathDom(\"finPathConsider\", i)', pid)}']")
                    p.wait_for_timeout(700)
                    still["save"] = p.evaluate(GEO, pid)["head"]["top"]
                    p.click(f"[id='{p.evaluate('(i) => finPathDom(\"finPathClear\", i)', pid)}']")
                    p.wait_for_timeout(700)
                    still["clear"] = p.evaluate(GEO, pid)["head"]["top"]
                    p.evaluate("() => renderAllFinancingSurfaces()")
                    p.wait_for_timeout(500)
                    still["repaint"] = p.evaluate(GEO, pid)["head"]["top"]
                    # Activated in place: a pointer would have to scroll up to the
                    # head to reach the switch, which is the customer moving, not
                    # the switch. This measures the switch alone.
                    p.evaluate("(b) => document.getElementById(b).click()", "finWsLangEs" if lang == "en" else "finWsLangEn")
                    p.wait_for_timeout(900)
                    g_lang = p.evaluate(GEO, pid)
                    check(f"{tag} saving, clearing and a repaint never move the open panel on screen",
                          all(abs(v - y0) <= 2 for v in still.values()), f"y0={y0} {still}")
                    # A language switch reflows the copy (Spanish runs longer), so
                    # near the end of the scroll range the browser may clamp by a
                    # few lines; what must hold is that the panel stays in view.
                    check(f"{tag} a language switch keeps the open panel in view and unobscured (no jump)",
                          g_lang["head"]["vis"] and g_lang["headHit"] and abs(g_lang["head"]["top"] - y0) <= 80,
                          f"y0={y0} after={g_lang['head']}")
                    p.click("#finWsLangEn" if lang == "en" else "#finWsLangEs")
                    p.wait_for_timeout(700)
                    # Hide details returns to the option's row.
                    p.click(f"[id='{p.evaluate('(i) => finPathDom(\"finWsHide\", i)', pid)}']")
                    p.wait_for_timeout(900)
                    g = p.evaluate(GEO, pid)
                    check(f"{tag} Hide details returns to the option's row in the list", g["row"] and g["row"]["vis"] and g["rowHit"], str(g))
                    # Comparison: the pick prompt, then the comparison, come into view.
                    to_top(p)
                    p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{ids[0]}']")
                    p.wait_for_timeout(900)
                    p.click(".fin-ws-cmp-start:visible")
                    p.wait_for_timeout(900)
                    pick = p.evaluate("() => { const e = document.querySelector('#financingSheetCards .fin-ws-picking'); const r = e && e.getBoundingClientRect(); return !!r && r.top >= -0.5 && r.bottom <= innerHeight; }")
                    check(f"{tag} Compare with... brings the pick prompt in the list into view", pick)
                    p.click("#financingSheetCards .fin-ws-row.is-picking >> nth=0")
                    p.wait_for_timeout(900)
                    cmp_vis = p.evaluate("() => { const e = document.getElementById('finWsCmpTitle'); const r = e && e.getBoundingClientRect(); return !!r && r.top >= -0.5 && r.bottom <= innerHeight; }")
                    check(f"{tag} picking the counterpart brings the comparison into view", cmp_vis)
                    p.click("#finWsCmpDone")
                    p.wait_for_timeout(900)
                    g = p.evaluate(GEO, ids[0])
                    check(f"{tag} Done comparing brings the option's panel back into view", g["view"] == "detail" and g["head"]["vis"], str(g))
                    c.close()

            # Keyboard: Enter on a row moves focus to the heading that came into view;
            # Tab continues into the panel; Done comparing lands on the heading too.
            for lang in ("en", "es"):
                c, p = portrait_page(lang)
                ids = p.evaluate("() => finPaymentPaths().map(function(x) { return x.id; })")
                p.focus(f"#financingSheetCards .fin-ws-row[data-path-id='{ids[2]}']")
                p.keyboard.press("Enter")
                p.wait_for_timeout(900)
                g = p.evaluate(GEO, ids[2])
                head_id = p.evaluate("(i) => finPathDom('finWsName', i)", ids[2])
                check(f"[{lang} portrait keyboard] Enter on a row focuses the panel heading, in view",
                      g["active"] == head_id and g["head"]["vis"], str(g))
                p.keyboard.press("Tab")
                nxt = p.evaluate("() => document.activeElement.id")
                check(f"[{lang} portrait keyboard] Tab continues into the panel", nxt.startswith("finPathConsider-") or nxt.startswith("finPath"), nxt)
                p.focus(f"[id='{p.evaluate('(i) => finPathDom(\"finWsHide\", i)', ids[2])}']")
                p.keyboard.press("Enter")
                p.wait_for_timeout(900)
                g = p.evaluate(GEO, ids[2])
                check(f"[{lang} portrait keyboard] Hide details returns focus to the option's row, in view",
                      g["active"] == p.evaluate("(i) => finPathDom('finPathReview', i)", ids[2]) and g["row"]["vis"], str(g))
                c.close()

            # Reduced motion: the reveal is an instant jump (no smooth animation).
            c, p = portrait_page("en", reduced_motion="reduce")
            ids = p.evaluate("() => finPaymentPaths().map(function(x) { return x.id; })")
            to_top(p)
            p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{ids[0]}']")
            p.wait_for_timeout(60)
            g = p.evaluate(GEO, ids[0])
            check("[portrait reduced motion] the reveal is immediate", g["head"]["vis"] and g["scroll"] > 0, str(g))
            c.close()

            # Landscape is unchanged: opening an option scrolls nothing.
            c, p = portrait_page("en", 1194, 834)
            ids = p.evaluate("() => finPaymentPaths().map(function(x) { return x.id; })")
            before = p.evaluate("() => [document.getElementById('financingSheet').scrollTop, document.querySelector('.fin-ws-chooser').scrollTop]")
            for pid in ids[:3]:
                p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{pid}']")
                p.wait_for_timeout(500)
            after = p.evaluate("() => [document.getElementById('financingSheet').scrollTop, document.querySelector('.fin-ws-chooser').scrollTop]")
            check("[landscape] opening options scrolls neither the sheet nor the list", before == after, f"{before} -> {after}")
            c.close()

            # Negative control: without the reveal, the portrait check fails.
            mut = plant("portrait_no_reveal", "      if (opening) finWsRevealPanel(id, keepFocus);\n", "")
            c, p = portrait_page("en", path=mut)
            ids = p.evaluate("() => finPaymentPaths().map(function(x) { return x.id; })")
            to_top(p)
            p.click(f"#financingSheetCards .fin-ws-row[data-path-id='{ids[0]}']")
            p.wait_for_timeout(900)
            g = p.evaluate(GEO, ids[0])
            check("control: with the reveal removed, the panel's actions stay off screen (the check above is not vacuous)",
                  g["scroll"] == 0 and g["act"] and not g["act"]["vis"], str(g))
            c.close()

        if not NAV_ONLY:
            # ---- 7. focus return after the opener is repainted (correction pass 2)
            print("Focus return after exploring, saving and clearing:")

            def focus_case(page, opener, action, closer):
                open_by_key(page, opener)
                # The explored path and the preference persist between visits (by
                # design, until the wipe), so each case starts from what is there.
                if page.get_attribute("#financingSheetCards .fin-ws-row >> nth=1", "aria-expanded") != "true":
                    page.focus("#financingSheetCards .fin-ws-row >> nth=1")
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(250)
                if action in ("save", "clear"):
                    if page.is_visible("[id^='finPathClear-']:visible"):
                        page.focus("[id^='finPathClear-']:visible")
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(250)
                    page.focus("[id^='finPathConsider-']:visible")
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(250)
                if action == "clear":
                    page.focus("[id^='finPathClear-']:visible")
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(250)
                if closer == "Escape":
                    page.keyboard.press("Escape")
                elif closer == "click":
                    page.click("#financingSheetClose")
                else:
                    page.focus("#" + closer)
                    page.keyboard.press("Enter")
                page.wait_for_timeout(350)
                f = page.evaluate(FOCUS_AT)
                page.keyboard.press("Tab")
                page.wait_for_timeout(100)
                nxt = page.evaluate(FOCUS_AT)
                return f, nxt

            for origin, (opener, go) in ORIGINS.items():
                ctx, page = load()
                page.evaluate(go)
                page.wait_for_timeout(300)
                for action in ("explore", "save", "clear"):
                    for closer in ("Escape", "financingSheetBack", "financingSheetClose", "click"):
                        f, nxt = focus_case(page, opener, action, closer)
                        tag = f"[{origin}, {action}, {closer}]"
                        check(f"{tag} focus returns to the opener, connected and visible",
                              f["id"] == opener and f["connected"] and f["rendered"] and not f["inSheet"] and f["sheetHidden"], str(f))
                        check(f"{tag} the background is released and Tab continues outside the workspace",
                              f["inert"] == ["mattressDrawer", "sessionSafetyDialog"] and not nxt["inSheet"] and not nxt["body"], f"{f['inert']} next={nxt}")
                ctx.close()
            # Negative control: the pre-correction close (focus the stored node).
            mut = plant("focus_old", "      var returnTo = finWsReturnTarget(_financeReturnFocus, placementAtClose);",
                        "      var returnTo = _financeReturnFocus;")
            ctx, page = load(path=mut)
            page.evaluate(ORIGINS["Sleep Plan"][1])
            page.wait_for_timeout(300)
            f, _ = focus_case(page, "sleepPlanFinancingExplore", "save", "Escape")
            check("control: the stored-node close is DETECTED (focus stays on the workspace title or body)",
                  f["id"] != "sleepPlanFinancingExplore" and (f["inSheet"] or f["body"]), str(f))
            ctx.close()

            # ---- 8. no customer-facing exploration history (correction pass 5B)
            print("Summary and Sleep Plan show the saved preference, never the viewed history:")
            LABELS = "() => finPaymentPaths().map(function(p) { return { id: p.id, label: p.label }; })"
            for lang in ("en", "es"):
                ctx, page = load(lang=lang)
                page.evaluate("() => window.showEmailCapture()")
                page.wait_for_timeout(400)
                take_home_before = page.inner_text("#emailScreen")
                page.evaluate("() => window.showSavedPicks()")
                page.wait_for_timeout(250)
                page.click("#hf2FinancingExplore")
                page.wait_for_timeout(400)
                labels = page.evaluate(LABELS)
                for i in (0, 2, 3):
                    page.click(f"#financingSheetCards .fin-ws-row >> nth={i}")
                    page.wait_for_timeout(200)
                page.click("#financingSheetCards .fin-ws-row >> nth=1")
                page.wait_for_timeout(200)
                page.click("[id^='finPathConsider-']:visible")
                page.wait_for_timeout(250)
                st = page.evaluate(STATE)
                saved = next(x for x in labels if x["id"] == st["pref"])
                viewed = [x for x in labels if x["id"] in st["explored"] and x["id"] != st["pref"]]
                check(f"[{lang}] the scenario is real: four paths viewed, one saved",
                      len(st["explored"]) == 4 and saved and len(viewed) == 3, str(st))
                page.click("#financingSheetBack")
                page.wait_for_timeout(300)
                regions = {"Summary": page.inner_text("#hf2Financing")}
                page.evaluate("() => window.showSleepPlan('summary')")
                page.wait_for_timeout(300)
                regions["Sleep Plan"] = page.inner_text("#sleepPlanFinancing")
                for name, text in regions.items():
                    check(f"[{lang}] {name} shows the saved preference", saved["label"] in text, text[:200])
                    leaked = [x["label"] for x in viewed if x["label"] in text]
                    check(f"[{lang}] {name} lists none of the other viewed options", not leaked, str(leaked))
                page.evaluate("() => window.showEmailCapture()")
                page.wait_for_timeout(400)
                take_home = page.inner_text("#emailScreen")
                check(f"[{lang}] the take-home preview is IDENTICAL with and without viewing and saving (the preference is not in it)",
                      bool(take_home.strip()) and take_home == take_home_before,
                      "first difference at char %d" % next((i for i, (a, b) in enumerate(zip(take_home, take_home_before)) if a != b), -1))
                ctx.close()

            # ---- 9. no rate, term or payment figure on ANY workspace surface (5C)
            print("Financial content across details, comparison, topics and items (hidden content included):")
            for lang in ("en", "es"):
                ctx, page = load(lang=lang)
                page.click("#hf2FinancingExplore")
                page.wait_for_timeout(400)
                seen = {}
                seen["arrival"] = page.evaluate(FIN_SCAN)
                n_rows = page.eval_on_selector_all("#financingSheetCards .fin-ws-row", "e => e.length")
                for i in range(n_rows):
                    page.click(f"#financingSheetCards .fin-ws-row >> nth={i}")
                    page.wait_for_timeout(200)
                    seen[f"detail {i}"] = page.evaluate(FIN_SCAN)
                    if page.is_visible(".fin-ws-cmp-start:visible"):
                        page.click(".fin-ws-cmp-start:visible")
                        page.wait_for_timeout(150)
                        n_pick = page.eval_on_selector_all("#financingSheetCards .fin-ws-row.is-picking", "e => e.length")
                        for j in range(n_pick):
                            if j:
                                page.click(".fin-ws-cmp-start:visible") if page.is_visible(".fin-ws-cmp-start:visible") else None
                                page.wait_for_timeout(150)
                            page.click(f"#financingSheetCards .fin-ws-row.is-picking >> nth={j}")
                            page.wait_for_timeout(200)
                            seen[f"compare {i}x{j}"] = page.evaluate(FIN_SCAN)
                            page.click("#finWsCmpDone")
                            page.wait_for_timeout(150)
                            if page.get_attribute(f"#financingSheetCards .fin-ws-row >> nth={i}", "aria-expanded") != "true":
                                page.click(f"#financingSheetCards .fin-ws-row >> nth={i}")
                                page.wait_for_timeout(150)
                for key in ("due", "schedule", "full", "ownership"):
                    page.click("#finWsTopicBtn")
                    page.wait_for_timeout(120)
                    page.click(f"#finWsTopic-{key}")
                    page.wait_for_timeout(200)
                    seen[f"topic {key}"] = page.evaluate(FIN_SCAN)
                page.click("#finWsIdentItems")
                page.wait_for_timeout(250)
                seen["items"] = page.evaluate(FIN_SCAN)
                dirty = {k: v["hits"] for k, v in seen.items() if v["n"]}
                n_cmp = len([k for k in seen if k.startswith("compare")])
                check(f"[{lang}] every surface scanned ({len(seen)} views: {n_rows} details, {n_cmp} comparisons, 4 topics, items) is figure-free",
                      not dirty and n_cmp >= 6 and all(v["len"] > 200 for v in seen.values()), str(dirty)[:300])
                # Negative controls: a planted figure on each newly covered surface,
                # including one inside a HIDDEN panel, is caught by the same scan.
                for where, sel in (("a hidden detail panel", "#financingSheetCards .fin-path-panel[hidden]"),
                                   ("the items view", "#finWsStage"),
                                   ("a topic note", "#financingSheetCards")):
                    planted = page.evaluate("""(sel) => { const e = document.querySelector(sel); if (!e) return false;
                      const s = document.createElement('span'); s.className = '__planted'; s.hidden = true;
                      s.textContent = ' 9.99% APR for 72 months, $25/mo '; e.appendChild(s); return true; }""", sel)
                    caught = page.evaluate(FIN_SCAN)
                    page.evaluate("() => document.querySelectorAll('.__planted').forEach(function(e) { e.remove(); })")
                    check(f"[{lang}] control: a planted figure in {where} is caught",
                          planted and {"percent", "apr", "counted", "dollars", "perPeriod"} <= set(caught["hits"]), str(caught["hits"]))
                ctx.close()
            # And the comparison table itself, which the loop above leaves.
            ctx, page = load()
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(400)
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            page.wait_for_timeout(200)
            page.click(".fin-ws-cmp-start:visible")
            page.wait_for_timeout(150)
            page.click("#financingSheetCards .fin-ws-row.is-picking >> nth=0")
            page.wait_for_timeout(200)
            page.evaluate("() => { const c = document.querySelector('.fin-ws-cmp__cell'); c.textContent += ' 0% APR for 48 months'; }")
            caught = page.evaluate(FIN_SCAN)
            check("control: a planted term in a comparison cell is caught", {"percent", "apr", "counted"} <= set(caught["hits"]), str(caught["hits"]))
            ctx.close()

            # ---- 10. measured touch targets and horizontal fit, every view (5D)
            print("Measured touch targets and horizontal fit:")
            for (w, h) in ((1194, 834), (1024, 768), (834, 1194)):
                for lang in ("en", "es"):
                    ctx, page = load(w, h, lang)
                    page.click("#hf2FinancingExplore")
                    page.wait_for_timeout(400)
                    views = {"arrival": page.evaluate(LAYOUT)}
                    page.click("#finWsTopicBtn")
                    page.wait_for_timeout(150)
                    views["topics open"] = page.evaluate(LAYOUT)
                    page.click("#finWsTopic-ownership")
                    page.wait_for_timeout(150)
                    page.click("#financingSheetCards .fin-ws-row >> nth=3")
                    page.wait_for_timeout(200)
                    page.click("[id^='finPathConsider-']:visible")
                    page.wait_for_timeout(200)
                    views["saved detail + topic"] = page.evaluate(LAYOUT)
                    page.click(".fin-ws-cmp-start:visible")
                    page.wait_for_timeout(150)
                    views["picking"] = page.evaluate(LAYOUT)
                    page.click("#financingSheetCards .fin-ws-row.is-picking >> nth=0")
                    page.wait_for_timeout(200)
                    views["compare"] = page.evaluate(LAYOUT)
                    page.click("#finWsIdentItems")
                    page.wait_for_timeout(200)
                    views["items"] = page.evaluate(LAYOUT)
                    for view, lay in views.items():
                        tag = f"[{lang} {w}x{h} {view}]"
                        check(f"{tag} every visible control measures at least 44x44 ({lay['n']} measured)",
                              lay["n"] >= 5 and not lay["small"], str(lay["small"]))
                        check(f"{tag} every visible control has touch-action: manipulation", not lay["touch"], str(lay["touch"]))
                        check(f"{tag} nothing is clipped horizontally and no label overflows its box",
                              not lay["clipX"] and not lay["labelOverflow"] and not lay["sheetScrollX"],
                              f"{lay['clipX']} {lay['labelOverflow']} scrollX={lay['sheetScrollX']}")
                    ctx.close()

            # ---- 11. language switch with a real saved preference AND a live comparison (5E)
            print("Language switch with nonempty state:")
            ctx, page = load()
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(400)
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            page.wait_for_timeout(200)
            page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(200)
            page.click("#financingSheetCards .fin-ws-row >> nth=1")
            page.wait_for_timeout(200)
            page.click(".fin-ws-cmp-start:visible")
            page.wait_for_timeout(150)
            page.click("#financingSheetCards .fin-ws-row.is-picking >> nth=1")
            page.wait_for_timeout(250)
            page.evaluate("() => window.setPaymentTopic('full')")
            page.wait_for_timeout(150)
            sa = page.evaluate(STATE)
            view_a = page.eval_on_selector("#finWsStage", "e => e.dataset.view")
            check("seeded: a saved preference, an explored path, a comparison counterpart and a topic are all live",
                  sa["pref"] and sa["pref"] != "not_now" and len(sa["open"]) == 1 and sa["cmp"] and sa["topic"] == "full"
                  and view_a == "compare", f"{sa} view={view_a}")
            for lang, btn in (("es", "#finWsLangEs"), ("en", "#finWsLangEn")):
                page.click(btn)
                page.wait_for_timeout(500)
                sb = page.evaluate(STATE)
                same = {k: v for k, v in sa.items() if k != "lang"} == {k: v for k, v in sb.items() if k != "lang"}
                check(f"switching to {lang} preserves the preference, the explored path, the comparison and the topic",
                      same and sb["lang"] == lang, f"{sa} -> {sb}")
                check(f"after switching to {lang} the comparison is still on screen with both columns",
                      page.eval_on_selector("#finWsStage", "e => e.dataset.view") == "compare"
                      and page.eval_on_selector_all(".fin-ws-cmp__name", "e => e.length") == 2)
                saved_state = page.inner_text("#financingSheetCards .fin-ws-row.is-pref")
                check(f"after switching to {lang} the saved row still says so in that language",
                      page.evaluate("() => FC('currentlyConsidering')").lower() in saved_state.lower(), saved_state)
            ctx.close()

            # ---- 12. forced colors: the viewed, saved and compared rows stay distinguishable
            ctx, page = new_page(browser, 1194, 834, errors, forced_colors="active")
            page.goto(url, wait_until="networkidle")
            page.wait_for_function(READY, timeout=20000)
            page.evaluate(SETUP, {"answers": ANSWERS, "finalist": True, "summary": True, "acc": True})
            page.click("#hf2FinancingExplore")
            page.wait_for_timeout(400)
            page.click("#financingSheetCards .fin-ws-row >> nth=0")
            page.wait_for_timeout(200)
            page.click("[id^='finPathConsider-']:visible")
            page.wait_for_timeout(200)
            page.click("#financingSheetCards .fin-ws-row >> nth=1")
            page.wait_for_timeout(200)
            # The viewed row's cue is its own system border; the saved row's cue
            # is its icon's 3px system border plus its state text (the row border
            # is reserved for "viewing"), so each is checked where it lives.
            fc = page.evaluate("""() => { const q = (s) => document.querySelector(s);
              const b = (e) => { if (!e) return null; const c = getComputedStyle(e); return c.borderTopWidth + ' ' + c.borderLeftWidth + ' ' + c.borderTopStyle; };
              const rest = q('#financingSheetCards .fin-ws-row:not(.is-explored):not(.is-pref)'), ex = q('#financingSheetCards .fin-ws-row.is-explored'), pr = q('#financingSheetCards .fin-ws-row.is-pref');
              return { fc: matchMedia('(forced-colors: active)').matches, rest: b(rest), explored: b(ex),
                       restIcon: b(rest && rest.querySelector('.fin-ws-row__icon')), prefIcon: b(pr && pr.querySelector('.fin-ws-row__icon')),
                       prefText: pr ? pr.innerText : '' }; }""")
            check("forced colors: the viewed row's system border differs from a resting row",
                  fc["fc"] and fc["explored"] != fc["rest"], str(fc))
            check("forced colors: the saved row keeps a geometric cue (its icon border) and its state text",
                  fc["prefIcon"] != fc["restIcon"] and page.evaluate("() => FC('currentlyConsidering')").lower() in fc["prefText"].lower(), str(fc))
            ctx.close()

        # ---- 14. background isolation and nested dialogs (Codex audit, 2026-10-01)
        if RUN_ISO:
            print("Background isolation, nested dialogs and the language rule:")
            INERT = "() => [...document.querySelectorAll('[inert]')].map(function(e) { return e.id || e.tagName.toLowerCase(); }).sort()"
            ISO_STATE = r"""() => {
              const sheet = document.getElementById('financingSheet'), back = document.getElementById('financingSheetBackdrop');
              const exposed = [...document.body.children].filter(function(e) {
                return e !== sheet && e !== back && e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE' && !e.closest('[inert]');
              }).map(function(e) { return e.id || e.tagName.toLowerCase(); });
              const pill = document.getElementById('savedPicksBtn');
              return { exposed: exposed, pillInert: !!(pill && pill.closest('[inert]')),
                       screen: (document.querySelector('.screen.active') || {}).id || '', sheetOpen: !sheet.hidden,
                       drawerOpen: document.getElementById('mattressDrawer').classList.contains('drawer-open'),
                       drawerInert: document.getElementById('mattressDrawer').hasAttribute('inert'),
                       resultsInert: document.getElementById('resultsScreen').hasAttribute('inert'),
                       active: document.activeElement ? document.activeElement.id : '' };
            }"""

            def iso_page(path="index.html", lang="en", **setup):
                c, p = new_page(browser, 1194, 834, errors)
                p.goto(url.replace("index.html", path), wait_until="networkidle")
                p.wait_for_function(READY, timeout=20000)
                if lang == "es":
                    p.evaluate("() => switchLanguage('es')")
                    p.wait_for_timeout(400)
                opts = {"answers": ANSWERS, "finalist": True, "summary": False, "acc": False}
                opts.update(setup)
                p.evaluate(SETUP, opts)
                return c, p

            def background_case(path="index.html", lang="en", origin="Results"):
                c, p = iso_page(path, lang)
                opener, go = ORIGINS[origin]
                p.evaluate(go)
                p.wait_for_timeout(300)
                before = p.evaluate(INERT)
                open_by_key(p, opener)
                st = p.evaluate(ISO_STATE)
                screen0 = st["screen"]
                # The saved-picks pill: focus it directly and press Enter.
                try:
                    p.evaluate("() => document.getElementById('savedPicksBtn').focus()")
                    p.keyboard.press("Enter")
                except Exception:
                    pass
                p.wait_for_timeout(300)
                st2 = p.evaluate(ISO_STATE)
                # Tab many times: focus never leaves the workspace.
                left = []
                for _ in range(45):
                    p.keyboard.press("Tab")
                    if not p.evaluate("() => document.getElementById('financingSheet').contains(document.activeElement)"):
                        left.append(p.evaluate("() => document.activeElement.id || document.activeElement.tagName"))
                p.keyboard.press("Escape")
                p.wait_for_timeout(300)
                after = p.evaluate(INERT)
                fin = p.evaluate(ISO_STATE)
                c.close()
                return st, st2, screen0, left, before, after, fin

            for origin in ("Results", "Summary", "Sleep Plan"):
                for lang in ("en", "es"):
                    tag = f"[{origin} {lang}]"
                    st, st2, screen0, left, before, after, fin = background_case(lang=lang, origin=origin)
                    check(f"{tag} while payments is open, nothing behind it is exposed (screens, utility bar, saved-picks pill, compare tray)",
                          st["sheetOpen"] and st["exposed"] == [] and st["pillInert"], str(st))
                    check(f"{tag} the saved-picks pill cannot change the screen underneath",
                          st2["sheetOpen"] and st2["screen"] == screen0 and st2["exposed"] == [], f"{screen0} -> {st2}")
                    check(f"{tag} Tab never leaves the workspace", not left, str(left[:5]))
                    check(f"{tag} closing restores EXACTLY the inert state that existed before opening",
                          after == before and not fin["sheetOpen"] and fin["active"] == ORIGINS[origin][0], f"{before} -> {after}; {fin}")
            mut = plant("iso_screens_only",
                        "      kids.forEach(function(el) {\n        if (el === sheet || el === backdrop || !el.setAttribute) return;",
                        "      kids.filter(function(el) { return el.classList && el.classList.contains('screen'); }).forEach(function(el) {\n        if (el === sheet || el === backdrop || !el.setAttribute) return;")
            st, st2, screen0, *_ = background_case(path=mut)
            check("control: isolating only the screens is DETECTED (the pill stays exposed and changes the screen)",
                  not st["pillInert"] and st2["screen"] != screen0, f"{st} / {st2}")

            # Nested: Results -> mattress drawer -> payments. The supported (not
            # shipped) drawer surface is enabled in memory only.
            def nested(path="index.html", lang="en"):
                c, p = iso_page(path, lang)
                p.evaluate("() => { STORE_CONFIG.financing.surfaces.drawer = true; window.backToResultsFromReview(); }")
                p.wait_for_timeout(300)
                p.evaluate("() => window.openMattressDrawer(Object.keys(window._drawerData)[0])")
                p.wait_for_timeout(500)
                return c, p

            for lang in ("en", "es"):
                for closer in ("Escape", "financingSheetClose", "financingSheetBack"):
                    c, p = nested(lang=lang)
                    before = p.evaluate(INERT)
                    open_by_key(p, "drawerFinancingExplore")
                    mid = p.evaluate(ISO_STATE)
                    if closer == "Escape":
                        p.keyboard.press("Escape")
                    else:
                        p.focus("#" + closer)
                        p.keyboard.press("Enter")
                    p.wait_for_timeout(400)
                    end = p.evaluate(ISO_STATE)
                    after = p.evaluate(INERT)
                    tag = f"[drawer {lang} {closer}]"
                    check(f"{tag} the open drawer is isolated behind payments (Results stays inert under it)",
                          mid["sheetOpen"] and mid["drawerOpen"] and mid["drawerInert"] and mid["resultsInert"] and mid["exposed"] == [], str(mid))
                    check(f"{tag} closing payments leaves the drawer open and usable, Results still inert, focus on the drawer's opener",
                          not end["sheetOpen"] and end["drawerOpen"] and not end["drawerInert"] and end["resultsInert"]
                          and end["active"] == "drawerFinancingExplore" and after == before, f"{end}; {before} -> {after}")
                    # And the drawer then closes normally, releasing Results.
                    p.evaluate("() => window.closeMattressDrawer()")
                    p.wait_for_timeout(500)
                    check(f"{tag} the drawer then closes normally and releases Results",
                          p.evaluate(INERT) == ["mattressDrawer", "sessionSafetyDialog"], str(p.evaluate(INERT)))
                    c.close()

            # Nested reset: drawer + payments open, then the new-customer wipe
            # (Restart's confirmed path) and the timeout wipe.
            for how in ("startOver", "timeout"):
                c, p = nested()
                open_by_key(p, "drawerFinancingExplore")
                if how == "startOver":
                    p.evaluate("() => window.startOver()")
                    p.wait_for_timeout(900)
                else:
                    p.evaluate("() => window.__dfSetSessionPolicy({ idleWarningMs: 800, graceMs: 800 })")
                    p.wait_for_timeout(4500)
                st = p.evaluate(ISO_STATE)
                inert = p.evaluate(INERT)
                check(f"[nested reset: {how}] the wipe closes payments and the drawer and leaves only the closed dialogs inert",
                      not st["sheetOpen"] and not st["drawerOpen"] and st["drawerInert"] and inert == ["mattressDrawer", "sessionSafetyDialog"]
                      and st["screen"] == "welcomeScreen", f"{st} {inert}")
                c.close()
            mut = plant("iso_release_all",
                        "        if (hiddenNow && !rec.wasHidden) return;\n", "")
            c, p = nested(path=mut)
            open_by_key(p, "drawerFinancingExplore")
            p.evaluate("() => window.startOver()")
            p.wait_for_timeout(900)
            check("control: releasing a drawer its own lifecycle closed is DETECTED (the closed drawer would be left non-inert)",
                  not p.evaluate("() => document.getElementById('mattressDrawer').hasAttribute('inert')"))
            c.close()
            mut = plant("iso_no_ownership", "        if (el.hasAttribute && el.hasAttribute('inert')) return;\n", "")
            c, p = nested(path=mut)
            open_by_key(p, "drawerFinancingExplore")
            p.keyboard.press("Escape")
            p.wait_for_timeout(400)
            check("control: taking ownership of Results' existing inert is DETECTED (closing payments would expose Results under the drawer)",
                  not p.evaluate("() => document.getElementById('resultsScreen').hasAttribute('inert')"))
            c.close()

            # The timeout dialog layered over payments: Continue keeps payments
            # isolated; closing payments then restores the original state.
            c, p = iso_page()
            p.evaluate("() => window.backToResultsFromReview()")
            p.wait_for_timeout(300)
            before = p.evaluate(INERT)
            open_by_key(p, "resultsFinancingExplore")
            p.evaluate("() => window.__dfSetSessionPolicy({ idleWarningMs: 700, graceMs: 60000 })")
            p.wait_for_timeout(1600)
            warn = p.evaluate("() => !document.getElementById('sessionSafetyDialog').hidden")
            p.evaluate("() => window.safetyDialogCancel()")
            p.wait_for_timeout(300)
            p.evaluate("() => window.__dfSetSessionPolicy({ idleWarningMs: 600000, graceMs: 600000 })")
            st = p.evaluate(ISO_STATE)
            p.keyboard.press("Escape")
            p.wait_for_timeout(300)
            check("[timeout over payments] the warning appears over payments; after Continue payments is still open and fully isolated",
                  warn and st["sheetOpen"] and st["exposed"] == [], str(st))
            check("[timeout over payments] closing payments afterwards restores exactly the original inert state",
                  p.evaluate(INERT) == before, f"{before} -> {p.evaluate(INERT)}")
            c.close()

            # Language controls follow store-config.languages.
            LANG_VIS = """() => ({ ws: document.getElementById('finWsLang').offsetParent !== null,
              en: document.getElementById('finWsLangEn').offsetParent !== null, es: document.getElementById('finWsLangEs').offsetParent !== null,
              landing: getComputedStyle(document.getElementById('landingLangToggle')).display !== 'none',
              utility: getComputedStyle(document.getElementById('sessionLangGroup')).display !== 'none' })"""
            for label, js, expect_ws in (("['en']", "STORE_CONFIG.languages = ['en']", False),
                                         ("missing", "delete STORE_CONFIG.languages", False),
                                         ("['es']", "STORE_CONFIG.languages = ['es']", False),
                                         ("['en','es']", "STORE_CONFIG.languages = ['en', 'es']", True)):
                c, p = iso_page()
                p.evaluate("() => { " + js + "; applyLanguageConfig(); window.backToResultsFromReview(); }")
                p.wait_for_timeout(200)
                open_by_key(p, "resultsFinancingExplore")
                v = p.evaluate(LANG_VIS)
                check(f"[languages {label}] the workspace switch follows the configured languages, like the welcome and utility switches",
                      v["ws"] == expect_ws and v["en"] == expect_ws and v["es"] == expect_ws
                      and v["landing"] == expect_ws and v["utility"] == expect_ws, str(v))
                if label in ("['en']", "missing"):   # Spanish is not configured here
                    p.evaluate("() => document.getElementById('finWsLangEs').click()")
                    p.wait_for_timeout(300)
                    check(f"[languages {label}] the hidden control changes nothing even if activated programmatically",
                          p.evaluate("() => currentLang") == "en")
                c.close()
            mut = plant("lang_ws_ignored",
                        "      if (wsLang) wsLang.style.display = single ? 'none' : '';\n", "")
            c, p = iso_page(path=mut)
            p.evaluate("() => { STORE_CONFIG.languages = ['en']; applyLanguageConfig(); window.backToResultsFromReview(); }")
            open_by_key(p, "resultsFinancingExplore")
            check("control: a workspace switch that ignores the configuration is DETECTED",
                  p.evaluate(LANG_VIS)["ws"])
            c.close()

        browser.close()
    server.shutdown()
    check("no page errors or console errors on any path", not errors, "; ".join(errors[:5]))
    print(f"\nPayment workspace check: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
