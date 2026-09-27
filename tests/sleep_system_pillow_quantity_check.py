#!/usr/bin/env python3
"""Two-pillow plan + Summary quantity keyboard place (PR #132 review repairs,
2026-09-25). RENDERED: the real page in headless Chromium, real clicks and
real key presses, over a loopback server on the repository root.

WHY THIS EXISTS. PR #132 raised the pillow step's capacity to two distinct
pillows and added a quantity stepper on the Consultation Summary. Two review
findings showed both were defeated by code that no static suite exercised:

  1. "Try this" (try-pillow) and every fit reaction (pillow-reaction) cleared
     EVERY pillow from the cart. A couple who added the first pillow, set it
     to two, then tested the second pillow lost the first pillow and its
     quantity before the second could be added - the two-pillow allowance was
     unreachable from the screen.
  2. The quantity stepper re-renders the Summary on every press, which drops
     keyboard focus to <body>. A keyboard user pressing Enter on "+" lost
     their place after one press; at the limits the pressed control becomes
     disabled, so there was no control to return to at all.

WHAT IT PROVES (pillow path, one page):
  * with pillow A in the plan at quantity 2, pressing "Try this" on pillow B
    keeps A in the cart at quantity 2;
  * recording B's fit as aligned still keeps A at quantity 2;
  * adding B yields a cart of exactly {A: 2, B: 1}, and the Summary renders
    both cards with those quantities;
  * "Try this" on A while both are in the plan keeps both, and A's card
    offers its Remove control (a selected pillow is never stranded behind the
    untested-pillow gate);
  * recording A as "too low" drops ONLY A; B survives with its quantity.

WHAT IT PROVES (keyboard path, a second page):
  * Enter on "+" steps 1 -> 2 and focus stays on that same "+", :focus-visible;
  * Enter to the maximum (4) disables "+" and moves focus to "-" for the same
    item (the appropriate control, because a disabled one cannot hold focus);
  * Enter on "-" back to 1 disables "-" and moves focus to "+";
  * no page error anywhere on either path.

Run: python tests/sleep_system_pillow_quantity_check.py
"""
import functools
import http.server
import json
import os
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


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start_server():
    handler = functools.partial(QuietHandler, directory=REPO)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


# Reaches the Sleep System's pillow step through the app's own public
# functions (the same path tests/sleep_plan_layout_check.py uses), and
# returns the pillow group in the order the step renders it.
SETUP_JS = r"""
async (A) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  startQuiz(); await wait(200);
  for (const k of Object.keys(A)) answers[k] = A[k];
  window.showResults(); await wait(400);
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories('pillow'); await wait(400);
  return { screen: (document.querySelector('.screen.active') || {}).id,
           pillows: readSleepSystemGroups().pillow.map((a) => a.id) };
}
"""

CART_JS = r"""
() => Object.fromEntries(Object.entries(window._accCart || {}).map(([id, e]) => [id, e.quantity]))
"""

# What the Summary renders per cart card: the card's item id (from its
# stepper controls) and the quantity shown in its <output>.
SUMMARY_JS = r"""
() => Array.from(document.querySelectorAll('#hf2AccessoriesList .hf2-acc-block--cart .hf2-acc-card')).map((card) => {
  const out = card.querySelector('.hf2-acc-card__qty-value');
  const btn = card.querySelector('.hf2-acc-card__qty-btn');
  const label = btn ? (btn.getAttribute('aria-label') || '') : '';
  return { qty: out ? out.textContent : null, label };
})
"""

FOCUS_JS = r"""
() => { const ae = document.activeElement; let fv = null; try { fv = ae && ae.matches(':focus-visible'); } catch (e) {}
  const a = (k) => (ae && ae.getAttribute) ? ae.getAttribute(k) : null;
  const scope = document.getElementById('hf2AccessoriesList');
  const plus = scope && scope.querySelector('.hf2-acc-card__qty-btn[aria-label^="One more"]');
  const minus = scope && scope.querySelector('.hf2-acc-card__qty-btn[aria-label^="One fewer"]');
  const out = scope && scope.querySelector('.hf2-acc-card__qty-value');
  return { tag: ae && ae.tagName, label: a('aria-label'), item: a('data-qty-item'), delta: a('data-qty-delta'), fv,
           qty: out ? out.textContent : null, plusDisabled: plus ? plus.disabled : null, minusDisabled: minus ? minus.disabled : null }; }
"""

PLUS = "#hf2AccessoriesList .hf2-acc-card__qty-btn[aria-label^='One more']"
MINUS = "#hf2AccessoriesList .hf2-acc-card__qty-btn[aria-label^='One fewer']"


def open_pillow_step(browser, port, errors):
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    setup = page.evaluate(SETUP_JS, ANSWERS)
    return page, setup


def click(page, selector):
    page.wait_for_selector(selector, state="visible", timeout=5000)
    page.click(selector)
    page.wait_for_timeout(300)


def run_pillow_path(browser, port):
    print("\n-- PILLOW: the first pillow and its quantity survive testing and adding the second --")
    errors = []
    page, setup = open_pillow_step(browser, port, errors)
    pillows = setup["pillows"]
    check("setup reached the Sleep System pillow step without a page error",
          setup["screen"] == "accessoriesScreen" and not errors, f"{setup} errors={errors[:1]}")
    check("control: the catalog offers at least two pillows (the allowance needs two)", len(pillows) >= 2, str(pillows))
    if len(pillows) < 2 or errors:
        page.close()
        return
    a_id, b_id = pillows[0], pillows[1]

    # Pillow A: record the fit as aligned, then add it.
    click(page, "#sleepSystemMain [data-sleep-action='pillow-reaction'][data-reaction='aligned']")
    click(page, f"#sleepSystemMain [data-sleep-action='select-item'][data-item-id='{a_id}']")
    cart = page.evaluate(CART_JS)
    check(f"pillow A ({a_id}) is in the plan at quantity 1 after the aligned reaction and Add", cart == {a_id: 1}, str(cart))

    # Set A to two on the Summary through its own "+" control.
    page.evaluate("() => window.showSavedPicks()")
    page.wait_for_timeout(400)
    click(page, PLUS)
    cart = page.evaluate(CART_JS)
    check("the Summary's + control sets pillow A to quantity 2", cart == {a_id: 2}, str(cart))

    # Back to the pillow step; test pillow B.
    page.evaluate("() => window.showAccessories('pillow')")
    page.wait_for_timeout(400)
    click(page, f"#sleepSystemMain [data-sleep-action='try-pillow'][data-item-id='{b_id}']")
    cart = page.evaluate(CART_JS)
    check(f"'Try this' on pillow B ({b_id}) keeps pillow A in the plan at quantity 2",
          cart.get(a_id) == 2, str(cart))
    click(page, "#sleepSystemMain [data-sleep-action='pillow-reaction'][data-reaction='aligned']")
    cart = page.evaluate(CART_JS)
    check("recording pillow B's fit as aligned still keeps pillow A at quantity 2", cart.get(a_id) == 2, str(cart))
    click(page, f"#sleepSystemMain [data-sleep-action='select-item'][data-item-id='{b_id}']")
    cart = page.evaluate(CART_JS)
    check("adding pillow B yields exactly {A: 2, B: 1}", cart == {a_id: 2, b_id: 1}, str(cart))

    # The Summary shows both cards with their quantities.
    page.evaluate("() => window.showSavedPicks()")
    page.wait_for_timeout(400)
    cards = page.evaluate(SUMMARY_JS)
    qtys = sorted(c["qty"] for c in cards)
    check("the Summary renders two pillow cards with quantities 2 and 1", len(cards) == 2 and qtys == ["1", "2"], str(cards))

    # Trying A again while both are in the plan: nothing leaves the plan, and
    # A's card offers Remove (a selected pillow is not stranded behind the gate).
    page.evaluate("() => window.showAccessories('pillow')")
    page.wait_for_timeout(400)
    click(page, f"#sleepSystemMain [data-sleep-action='try-pillow'][data-item-id='{a_id}']")
    cart = page.evaluate(CART_JS)
    check("'Try this' on the already-selected pillow A keeps both pillows and both quantities",
          cart == {a_id: 2, b_id: 1}, str(cart))
    has_remove = page.evaluate(
        f"() => !!document.querySelector(\"#sleepSystemMain [data-sleep-action='remove-item'][data-item-id='{a_id}']\")")
    check("the selected pillow's card offers its Remove control before a re-recorded fit", has_remove)

    # "Feels aligned" on the selected pillow A drops nothing.
    click(page, "#sleepSystemMain [data-sleep-action='pillow-reaction'][data-reaction='aligned']")
    cart = page.evaluate(CART_JS)
    check("recording the selected pillow A as aligned keeps both pillows and both quantities", cart == {a_id: 2, b_id: 1}, str(cart))

    # "Too low" on A is a verdict on A alone.
    click(page, "#sleepSystemMain [data-sleep-action='pillow-reaction'][data-reaction='low']")
    cart = page.evaluate(CART_JS)
    check("recording pillow A as 'too low' removes ONLY A; pillow B keeps its quantity", cart == {b_id: 1}, str(cart))
    check("pillow path: no page error", not errors, str(errors)[:160])
    page.close()


def run_keyboard_path(browser, port):
    print("\n-- KEYBOARD: focus stays on the appropriate quantity control, including at the limits --")
    errors = []
    page, setup = open_pillow_step(browser, port, errors)
    pillows = setup["pillows"]
    check("setup reached the pillow step", setup["screen"] == "accessoriesScreen" and pillows, str(setup))
    if not pillows:
        page.close()
        return
    a_id = pillows[0]
    click(page, "#sleepSystemMain [data-sleep-action='pillow-reaction'][data-reaction='aligned']")
    click(page, f"#sleepSystemMain [data-sleep-action='select-item'][data-item-id='{a_id}']")
    page.evaluate("() => window.showSavedPicks()")
    page.wait_for_timeout(400)
    check("the Summary shows a quantity stepper for the pillow", page.query_selector(PLUS) is not None)

    page.focus(PLUS)
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    r = page.evaluate(FOCUS_JS)
    check("Enter on + steps the quantity to 2", r["qty"] == "2", str(r))
    check("...and focus stays on the same + control, :focus-visible",
          r["tag"] == "BUTTON" and (r["label"] or "").startswith("One more") and r["fv"] is True, str(r))

    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    r = page.evaluate(FOCUS_JS)
    check("two more Enters reach the maximum of 4 and + becomes disabled", r["qty"] == "4" and r["plusDisabled"] is True, str(r))
    check("at the maximum, focus moves to the same item's - control (the one that can still act), :focus-visible",
          r["tag"] == "BUTTON" and (r["label"] or "").startswith("One fewer") and r["fv"] is True, str(r))

    for _ in range(3):
        page.keyboard.press("Enter")
        page.wait_for_timeout(200)
    page.wait_for_timeout(200)
    r = page.evaluate(FOCUS_JS)
    check("three Enters on - return to 1 and - becomes disabled", r["qty"] == "1" and r["minusDisabled"] is True, str(r))
    check("at the minimum, focus moves back to the + control, :focus-visible",
          r["tag"] == "BUTTON" and (r["label"] or "").startswith("One more") and r["fv"] is True, str(r))
    cart = page.evaluate(CART_JS)
    check("the cart quantity matches what the control shows", cart == {a_id: 1}, str(cart))
    check("keyboard path: no page error", not errors, str(errors)[:160])
    page.close()


def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is not installed: python -m pip install -r tools/requirements-suite.txt && python -m playwright install chromium")
        return 2
    server, port = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            run_pillow_path(browser, port)
            run_keyboard_path(browser, port)
            browser.close()
    finally:
        server.shutdown()
    print(f"\n{passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
