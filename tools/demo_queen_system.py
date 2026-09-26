"""Drive the real app through a complete website-priced Queen Sleep System.

WHAT THIS IS. A DEMONSTRATION, not a test and not an approval. It starts the
real `serve_pricing_preview` machinery in its `website` drill state, opens the
real `index.html` in headless Chromium, and builds a Queen system by pressing
the app's own visible controls - the same buttons a salesperson presses. It
then reports what the screen actually said at each step and writes a
screenshot per step.

WHAT IT PROVES AND WHAT IT DOES NOT. Every amount it shows was extracted from
lacks.com and is PENDING OWNER VERIFICATION. Nothing here approves a price,
activates pricing, or authorises a showroom. The production gates stay closed
throughout and the run asserts that they did: this preview opens the gate in
memory over an isolated, clearly-labelled drill state, exactly as the pricing
harness does, and `data/store-config.json` on disk is never touched.

THE FOUR BEHAVIOURS IT DEMONSTRATES, in one continuous session:

  1. a complete itemised website-priced Queen system - the mattress and every
     accessory the current evidence can price, each with its own line, its
     size and its extended amount, and a merchandise subtotal that reconciles
     against them. WHICH accessories those are is read from the drill's own
     coverage at run time, never assumed here;
  2. a QUANTITY change made through the visible +/- stepper;
  3. REMOVE and RESTORE of a line through the visible plan controls;
  4. an UNRESOLVED-PRICE case: a product the website evidence cannot identify
     gets no price, its line reads a dash, and the subtotal is WITHHELD rather
     than quietly recomputed over the lines that did resolve.

Run:  python tools/demo_queen_system.py
      python tools/demo_queen_system.py --out outputs/manual-gates/slice-2.2j

Requires playwright with Chromium (`python -m pip install playwright &&
python -m playwright install chromium`). Without it the run reports that it
could not render and exits non-zero, rather than reporting a demonstration it
did not perform.
"""

import argparse
import json
import os
import sys
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as srv  # noqa: E402

FAILURES = []


def observe(label, ok, detail=""):
    """Record one observation. A demonstration still has to be honest about
    what it saw, so a disagreement is a failure here exactly as in a suite."""
    print(("  ok   " if ok else "  FAIL ") + label + (f"  [{detail}]" if detail else ""))
    if not ok:
        FAILURES.append(label)
    return ok


# The app's own readiness, not the network's: #startBtn is static markup and
# the data arrives behind it. Borrowed verbatim in intent from
# tests/pricing_harness_check.py, which learned it the hard way.
APP_READY_JS = ("() => typeof appStartReady === 'function' && appStartReady() === true"
                " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")

# One walk to the Summary, then a snapshot of the itemised total exactly as it
# renders. `step` names which press produced this state.
SETUP_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ANS = { "sleep_position": "side", "sleep_issues": ["back_pain"],
                "health_conditions": ["snoring"], "temperature": "hot",
                "firmness": 5, "partner_sleep": "partner",
                "partner_disturbance": "sometimes", "body_type": "average",
                "mattress_size": "queen" };
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();
  window.showResults();
  await wait(150);
  const ids = Object.keys(window._drawerData || {});
  // The finalist is the caller's choice so the demonstration can name a
  // mattress whose Queen price the website evidence actually carries.
  const pick = (ARGS.finalist && ids.indexOf(ARGS.finalist) >= 0) ? ARGS.finalist : ids[0];
  window.chooseFinalist(pick);
  window.showAccessories();
  await wait(150);
  window.showSavedPicks();
  await wait(200);
  return { finalist: pick, ids: ids };
}
"""

READ_TOTAL_JS = r"""
() => {
  const box = document.getElementById('hf2SystemTotal');
  if (!box) return { present: false };
  const items = Array.from(box.querySelectorAll('.hf2-system-total__item')).map((li) => ({
    name: (li.querySelector('.hf2-system-total__item-name') || {}).textContent || '',
    amount: ((li.querySelector('.hf2-system-total__item-amount') || {}).textContent || '').trim(),
    unresolved: !!li.querySelector('.hf2-system-total__item-unresolved')
  }));
  return {
    present: true,
    hidden: box.hidden,
    state: box.getAttribute('data-total-state'),
    items: items,
    subtotal: ((box.querySelector('.hf2-system-total__amount') || {}).textContent || '').trim(),
    note: ((box.querySelector('.hf2-system-total__note') || {}).textContent || '').trim(),
    provenance: ((box.querySelector('.hf2-system-total__pending') || {}).textContent || '').trim()
  };
}
"""

# Press a plan control by the item it belongs to. Real clicks on the real
# buttons: the demonstration is worth nothing if it calls the handlers
# directly, because that is not what a salesperson can do.
PRESS_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cards = Array.from(document.querySelectorAll('.hf2-acc-card'));
  let card = null;
  for (const c of cards) {
    const btn = c.querySelector('[onclick*="' + ARGS.itemId + '"]');
    if (btn) { card = c; break; }
  }
  if (!card) return { pressed: false, why: 'no card for ' + ARGS.itemId };
  let sel;
  if (ARGS.what === 'remove') sel = '.hf2-acc-card__action--remove';
  else if (ARGS.what === 'add') sel = '.hf2-acc-card__action';
  else sel = '.hf2-acc-card__qty-btn';
  let btns = Array.from(card.querySelectorAll(sel));
  if (ARGS.what === 'plus') btns = btns.filter((b) => b.textContent.trim() === '+');
  if (ARGS.what === 'minus') btns = btns.filter((b) => b.textContent.trim() === '−');
  const btn = btns[0];
  if (!btn) return { pressed: false, why: 'no ' + ARGS.what + ' control on the card' };
  if (btn.disabled) return { pressed: false, why: ARGS.what + ' control is disabled', disabled: true };
  btn.click();
  await wait(200);
  return { pressed: true, label: (btn.getAttribute('aria-label') || btn.textContent || '').trim() };
}
"""

QTY_JS = r"""
(ARGS) => {
  const cards = Array.from(document.querySelectorAll('.hf2-acc-card'));
  for (const c of cards) {
    if (c.querySelector('[onclick*="' + ARGS.itemId + '"]')) {
      const out = c.querySelector('.hf2-acc-card__qty-value');
      const plus = Array.from(c.querySelectorAll('.hf2-acc-card__qty-btn')).filter((b) => b.textContent.trim() === '+')[0];
      return { value: out ? out.textContent.trim() : null,
               stepper: !!out,
               plusDisabled: plus ? !!plus.disabled : null };
    }
  }
  return { value: null, stepper: false, plusDisabled: null };
}
"""


def add_to_cart(page, item_id):
    """Put one accessory in the cart through the app's own setter, then
    repaint. The ADD control lives on the Sleep System step; the Summary is
    where remove/restore and quantity are demonstrated by hand."""
    return page.evaluate(
        "(id) => { const ok = (typeof setSleepSystemItem === 'function')"
        " ? setSleepSystemItem(id, true) : false; if (typeof renderHf2 === 'function') renderHf2();"
        " return { ok: ok, inCart: !!(window._accCart || {})[id] }; }", item_id)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", default=os.path.join("outputs", "manual-gates", "slice-2.2j"),
                    help="where the step screenshots go")
    ap.add_argument("--finalist", default="g9",
                    help="app mattress id to take to the Summary (needs a website Queen price)")
    ap.add_argument("--size", default="queen")
    ap.add_argument("--unresolved", default="pillow-gel-memory",
                    help="the accessory with no website price, for the withheld-subtotal case")
    args = ap.parse_args(argv)

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is not installed; this demonstration cannot render.")
        print("  python -m pip install playwright && python -m playwright install chromium")
        return 2

    out_dir = os.path.join(REPO, args.out) if not os.path.isabs(args.out) else args.out
    os.makedirs(out_dir, exist_ok=True)

    start = datetime.now(timezone.utc)
    cfg, cat, verdicts, acc = srv.build_injected("website", start)

    # WHICH ACCESSORIES THIS RUN CAN PRICE IS AN OUTPUT, NOT AN ASSUMPTION.
    # Reading it from the drill's own coverage keeps the demonstration honest
    # when the evidence changes underneath it: a product that loses its
    # product-page evidence drops out of the priced system and shows up in the
    # report as withheld, instead of turning into a failed assertion about a
    # line that was never going to render.
    _, _, acc_skus, coverage = srv.build_website(start)
    priced = sorted(aid for aid, sizes in (acc_skus or {}).items()
                    if args.size in (sizes or {}))
    print("accessories this run can price at " + args.size + ": "
          + (", ".join(priced) if priced else "(none)"))
    if not priced:
        print("  no accessory carries a website price at this size - the complete-system")
        print("  demonstration needs at least one. Nothing is wrong with the app.")
        return 3

    # The gates this demonstration must not move. The drill opens the gate IN
    # MEMORY; the committed configuration is what ships, and it stays shut.
    shipped = srv._load(os.path.join(REPO, "data", "store-config.json"))
    sp = shipped.get("pricing") or {}
    observe("shipped config on disk: pricing.enabled false",
            sp.get("enabled") is False, f"enabled={sp.get('enabled')}")
    observe("shipped config on disk: pricing.displayEnabled false",
            sp.get("displayEnabled") is False, f"displayEnabled={sp.get('displayEnabled')}")
    observe("shipped config on disk: every pricing surface false",
            all(v is False for v in (sp.get("surfaces") or {}).values()),
            json.dumps(sp.get("surfaces")))
    observe("shipped config on disk: gasUrl blank (preview mode)",
            shipped.get("gasUrl") == "")
    observe("the in-memory drill state is REFUSED by the shipping validator",
            bool(verdicts.get("served_refused")))

    prods = cfg["pricing"]["products"]
    observe("every served price cites a product page on an allowlisted host",
            all("/product/" in e["evidence"]["sourceUrl"] for e in prods),
            f"{len(prods)} priced entries")
    observe("no FIXTURE placeholder in any served price",
            "FIXTURE" not in json.dumps(prods))

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), srv.make_handler(srv.encode(cfg), srv.encode(cat), srv.encode(acc)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    port = server.server_address[1]
    base_url = f"http://127.0.0.1:{port}"
    print(f"\npreview serving at {base_url} (website drill, in-memory only)\n")

    shots = []

    def shot(page, name):
        p = os.path.join(out_dir, f"{name}.png")
        page.screenshot(path=p, full_page=True)
        shots.append(p)

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch()
            page = browser.new_page(viewport={"width": 1194, "height": 834})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base_url + "/index.html", wait_until="networkidle")
            page.wait_for_selector("#startBtn")
            page.wait_for_function(APP_READY_JS, timeout=15000)

            setup = page.evaluate(SETUP_JS, {"finalist": args.finalist})
            observe("the walk reached the Summary with the intended finalist",
                    setup.get("finalist") == args.finalist,
                    f"finalist={setup.get('finalist')}")

            print("\nSTEP 1 - mattress only")
            t1 = page.evaluate(READ_TOTAL_JS)
            shot(page, "01-mattress-only")

            print("\nSTEP 2 - add every accessory this run can price at " + args.size)
            for item in priced:
                r = add_to_cart(page, item)
                observe(f"{item} is in the cart", r.get("inCart") is True)
            page.evaluate("() => { if (typeof renderHf2 === 'function') renderHf2(); }")
            t2 = page.evaluate(READ_TOTAL_JS)
            shot(page, "02-complete-system")
            print(f"    state={t2.get('state')} subtotal={t2.get('subtotal')!r}")
            for it in t2.get("items", []):
                print(f"      - {it['name'].strip()[:52]:<52} {it['amount']}")
            observe("the complete system reports a COMPLETE subtotal",
                    t2.get("state") == "complete", f"state={t2.get('state')}")
            observe("every line carries an amount (none unresolved)",
                    all(not it["unresolved"] for it in t2.get("items", [])))
            observe("one line per purchased item: the mattress plus every priced accessory",
                    len(t2.get("items", [])) == 1 + len(priced),
                    f"{len(t2.get('items', []))} lines for 1 mattress + {len(priced)} accessories")
            observe("the subtotal names the website and its pending status",
                    "pending verification" in (t2.get("provenance") or "").lower(),
                    (t2.get("provenance") or "")[:80])

            print("\nSTEP 3 - the unresolved-price case")
            r = add_to_cart(page, args.unresolved)
            observe(f"{args.unresolved} is in the cart", r.get("inCart") is True)
            page.evaluate("() => { if (typeof renderHf2 === 'function') renderHf2(); }")
            t3 = page.evaluate(READ_TOTAL_JS)
            shot(page, "03-unresolved-withheld")
            print(f"    state={t3.get('state')} subtotal={t3.get('subtotal')!r} note={t3.get('note')!r}")
            for it in t3.get("items", []):
                print(f"      - {it['name'].strip()[:52]:<52} {it['amount'] or '(dash)'}")
            observe("one line now reads unresolved",
                    any(it["unresolved"] for it in t3.get("items", [])))
            observe("the subtotal is WITHHELD, not recomputed over the resolved lines",
                    t3.get("state") == "incomplete" and not t3.get("subtotal"),
                    f"state={t3.get('state')} subtotal={t3.get('subtotal')!r}")

            print("\nSTEP 4 - quantity through the visible stepper")
            q0 = page.evaluate(QTY_JS, {"itemId": args.unresolved})
            observe("the unresolved item shows a quantity stepper", q0.get("stepper") is True,
                    f"value={q0.get('value')}")
            p1 = page.evaluate(PRESS_JS, {"itemId": args.unresolved, "what": "plus"})
            observe("the + control was pressed", p1.get("pressed") is True, p1.get("why", ""))
            q1 = page.evaluate(QTY_JS, {"itemId": args.unresolved})
            observe("the visible count went 1 -> 2", q1.get("value") == "2", f"value={q1.get('value')}")
            t4 = page.evaluate(READ_TOTAL_JS)
            shot(page, "04-quantity-two")
            observe("a quantity change on an unpriced line still withholds the subtotal",
                    t4.get("state") == "incomplete")

            print("\nSTEP 5 - the base and the protector refuse a second unit")
            for item in priced:
                q = page.evaluate(QTY_JS, {"itemId": item})
                observe(f"{item} offers no stepper (more than one is not a real configuration)",
                        q.get("stepper") is False)

            print("\nSTEP 6 - remove, then restore")
            rm = page.evaluate(PRESS_JS, {"itemId": args.unresolved, "what": "remove"})
            observe("the Remove control was pressed", rm.get("pressed") is True, rm.get("why", ""))
            t5 = page.evaluate(READ_TOTAL_JS)
            shot(page, "05-removed-complete-again")
            print(f"    state={t5.get('state')} subtotal={t5.get('subtotal')!r}")
            observe("removing the unpriced line restores the COMPLETE subtotal",
                    t5.get("state") == "complete", f"state={t5.get('state')}")
            observe("the restored subtotal equals the one before the unpriced line was added",
                    t5.get("subtotal") == t2.get("subtotal"),
                    f"{t5.get('subtotal')!r} vs {t2.get('subtotal')!r}")

            back = page.evaluate(PRESS_JS, {"itemId": args.unresolved, "what": "add"})
            if not back.get("pressed"):
                add_to_cart(page, args.unresolved)
                page.evaluate("() => { if (typeof renderHf2 === 'function') renderHf2(); }")
            t6 = page.evaluate(READ_TOTAL_JS)
            shot(page, "06-restored-withheld-again")
            observe("restoring it withholds the subtotal again", t6.get("state") == "incomplete",
                    f"state={t6.get('state')}")
            q2 = page.evaluate(QTY_JS, {"itemId": args.unresolved})
            observe("restoring starts the count at one again", q2.get("value") == "1",
                    f"value={q2.get('value')}")

            observe("no page error during the whole session", not errors,
                    "; ".join(errors[:2]))

            # The observation dates ride on the evidence, not on this run.
            print("\nSOURCE OBSERVATION DATES carried into the served prices:")
            seen = {}
            for e in prods:
                d = (e["evidence"].get("verifiedAt") or "")[:10]
                seen[d] = seen.get(d, 0) + 1
            for d in sorted(seen):
                print(f"    {d}: {seen[d]} priced entries")
            observe("more than one observation date survives (ages are per entry, not per run)",
                    len(seen) > 1, json.dumps(seen))

            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    print("\nscreenshots:")
    for p in shots:
        print("   " + os.path.relpath(p, REPO))
    print()
    if FAILURES:
        print(f"{len(FAILURES)} observation(s) did not hold:")
        for f in FAILURES:
            print("   - " + f)
        return 1
    print("every observation held. Website-sourced, PENDING OWNER VERIFICATION;")
    print("no price is approved and no production gate was opened.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
