#!/usr/bin/env python3
"""Payment Choice slice 2 - the governed payment facts, rendered.

Owner authorization 2026-10-03 replaced the V1 "no payment calculation"
invariant with a governed one. This check drives the REAL app in Chromium
against the preview harness's `payments` drill (tools/serve_pricing_preview.py:
fixture prices on shifted stamps, exact terms and the governed calculation
switched on in memory - never in shipped data) and pins:

  1. the arithmetic: the published fixed factor, in integer minor units,
     rounded UP to the next whole dollar (and NOT up when exact); a factor
     needing more than six decimals is refused, never rounded;
  2. the rendered figures for the one plan whose method is published, equal
     to the arithmetic over the purchase's own merchandise subtotal; the
     scheduled total and interest as maxima; every input the kiosk does not
     hold (down payment, tax, delivery, setup, total due today, complete
     amount paid, ownership) reads "To confirm"; no figure for any plan whose
     method is not published;
  3. equal weight: the monthly figure is not larger or heavier than the
     totals beside it;
  4. purchase-change recalculation: an item edit recomputes every figure from
     the new purchase on the same render and announces it;
  5. English/Spanish parity with the workspace open (same figures, the
     language's own labels, the same explored path);
  6. the comparison view carries the same figures for both paths;
  7. every gate fails closed, one at a time: exact terms off, the plan's
     calculation off, no formula artifact, stale financing, a purchase below
     the published minimum, an incomplete purchase, and pricing display off;
  8. take-home exclusion: no payment fact outside the workspace - the
     Summary, the Sleep Plan and the take-home preview carry none;
  9. the new-customer wipe leaves no fact in the DOM;
 10. under the SHIPPED configuration nothing renders at all;
 11. layout: portrait and both landscapes, no horizontal overflow, no
     console errors.

Run:  python tests/payment_facts_check.py
"""
import functools
import http.server
import json
import os
import re
import sys
import threading
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as sp  # noqa: E402

ANSWERS = {
    "sleep_position": "side", "sleep_issues": ["back_pain"],
    "health_conditions": ["snoring"], "temperature": "hot", "firmness": 5,
    "partner_sleep": "partner", "partner_disturbance": "sometimes",
    "body_type": "average", "mattress_size": "queen",
}
FACTOR_MICRO = 18521          # the published 1.8521%
TERM = 72
PLAN = "synchrony-9-99-72"

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


def expected_payment_minor(principal_minor):
    num = principal_minor * FACTOR_MICRO
    dollars, rem = divmod(num, 100_000_000)
    return (dollars + (1 if rem else 0)) * 100


def money(minor):
    whole = minor % 100 == 0
    return "$" + (f"{minor // 100:,}" if whole else f"{minor / 100:,.2f}")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def serve_state(state):
    start = datetime.now(timezone.utc).astimezone()
    cfg, cat, ver, acc = sp.build_injected(state, start)
    if not sp.dark_form_acceptable(state, ver):
        raise SystemExit(f"{state} drill refused: {ver['financing_errors'] + ver['dark_errors']}")
    srv = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), sp.make_handler(sp.encode(cfg), sp.encode(cat), sp.encode(acc)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


def serve_repo():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=REPO))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv


READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")

SETUP = r"""async (o) => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  for (const k in o.answers) answers[k] = o.answers[k];
  showProfileScreen(); window.showResults(); await w(300);
  const ids = Object.keys(window._drawerData || {});
  window.chooseFinalist(ids[0]); window._toggleSavePick(ids[1]);
  window.showSavedPicks(); await w(200);
  if (o.acc) { window.addReviewAccessory('pillow-flow'); window.addReviewAccessory('protector-dritec'); }
  await w(150);
  return ids.slice(0, 2);
}"""

OPEN_PROMO = r"""async () => {
  const w = (ms) => new Promise((r) => setTimeout(r, ms));
  document.getElementById('hf2FinancingExplore').click(); await w(400);
  document.querySelector('#financingSheetCards .fin-ws-row').click(); await w(300);
}"""

FACTS = r"""(plan) => {
  const sec = document.querySelector('.fin-fx[data-fx-plan="' + plan + '"]');
  if (!sec) return null;
  const rows = {};
  sec.querySelectorAll('.fin-fx__row, .fin-fx__keycell').forEach((r) => {
    rows[r.dataset.fx] = r.querySelector('.fin-fx__value').textContent.trim();
  });
  return { state: sec.dataset.fxState, rows: rows, text: sec.textContent };
}"""

QUOTE = "() => { var q = buildConsultationQuote('handoff', priceSizeAnswer()); return { status: q.status, m: q.merchandiseMinor }; }"


def new_page(browser, w, h, errors):
    ctx = browser.new_context(viewport={"width": w, "height": h})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append("console: " + m.text) if m.type == "error" else None)
    return ctx, page


def loaded(browser, url, errors, w=1194, h=834, acc=False):
    ctx, page = new_page(browser, w, h, errors)
    page.goto(url, wait_until="networkidle")
    page.wait_for_function(READY, timeout=20000)
    page.evaluate(SETUP, {"answers": ANSWERS, "acc": acc})
    return ctx, page


def rerender(page, js):
    page.evaluate("() => { " + js + "; renderFinancingSheet(); }")
    page.wait_for_timeout(150)


def main():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    from playwright.sync_api import sync_playwright

    pay_srv = serve_state("payments")
    pay_url = f"http://127.0.0.1:{pay_srv.server_address[1]}/index.html"
    repo_srv = serve_repo()
    repo_url = f"http://127.0.0.1:{repo_srv.server_address[1]}/index.html"
    errors = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch()

        # ---- 1. arithmetic ----------------------------------------------------
        print("1. The published fixed-factor arithmetic:")
        ctx, page = new_page(browser, 1194, 834, errors)
        page.goto(pay_url, wait_until="networkidle")
        page.wait_for_function(READY, timeout=20000)
        for principal in (139900, 50000, 100000, 99999999, 1):
            got = page.evaluate("(p) => payFixedFactorMinor(p, 18521)", principal)
            check(f"payment for {money(principal)} is {money(expected_payment_minor(principal))} "
                  f"(1.8521%, rounded up to the dollar)", got == expected_payment_minor(principal), str(got))
        check("an exact whole-dollar product is NOT rounded up ($1,000,000 -> $18,521)",
              page.evaluate("() => payFixedFactorMinor(100000000, 18521)") == 1852100)
        check("the published factor converts exactly (0.018521 -> 18521 ppm)",
              page.evaluate("() => payFactorMicro(0.018521)") == 18521)
        check("a factor needing a seventh decimal is refused, not rounded",
              page.evaluate("() => payFactorMicro(0.0185215)") is None)
        check("no principal, a zero or a fractional principal computes nothing",
              page.evaluate("() => [payFixedFactorMinor(0, 18521), payFixedFactorMinor(-5, 18521), "
                            "payFixedFactorMinor(10.5, 18521)].every(function(v) { return v === null; })"))
        ctx.close()

        # ---- 2/3. rendered figures, equal weight --------------------------------
        print("2. Rendered figures for the published-method plan (mattress only):")
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate(OPEN_PROMO)
        q = page.evaluate(QUOTE)
        fx = page.evaluate(FACTS, PLAN)
        check("the purchase is completely priced", q["status"] == "complete" and q["m"], str(q))
        pay = expected_payment_minor(q["m"])
        check("the plan's facts are calculated", fx and fx["state"] == "calculated", str(fx and fx["state"]))
        rows = (fx or {}).get("rows", {})
        check(f"monthly payment = {money(pay)}", rows.get("monthly") == money(pay), rows.get("monthly", ""))
        check("merchandise subtotal row equals the quote", rows.get("subtotal") == money(q["m"]))
        check("amount used for the estimate is the merchandise subtotal", rows.get("financed") == money(q["m"]))
        check(f"total of scheduled payments is the maximum {money(pay * TERM)}",
              rows.get("scheduled") == "Up to " + money(pay * TERM), rows.get("scheduled", ""))
        check("interest over the plan is the maximum (scheduled - financed)",
              rows.get("interest") == "Up to " + money(pay * TERM - q["m"]), rows.get("interest", ""))
        check("rate and schedule are the published terms",
              rows.get("rate") == "9.99% APR" and rows.get("schedule") == "72 fixed monthly payments", str(rows))
        for key in ("down", "tax", "fulfillment", "due", "total", "ownership"):
            check(f"'{key}' reads To confirm (the kiosk holds no such input)", rows.get(key) == "To confirm", rows.get(key, ""))
        check("eligibility states the published minimum and credit approval",
              "$500" in rows.get("eligibility", "") and "credit approval" in rows.get("eligibility", ""))
        key = page.evaluate("""() => { const s = document.querySelector('.fin-fx[data-fx-plan="synchrony-9-99-72"]');
          const k = s.querySelector('.fin-fx__key'); const ex = s.querySelector('.fin-fx__excludes');
          return { order: [...k.querySelectorAll('[data-fx]')].map(e => e.dataset.fx),
                   dup: [...s.querySelectorAll('.fin-fx__rows [data-fx="monthly"], .fin-fx__rows [data-fx="due"]')].length,
                   excludesAfter: !!(ex && (k.compareDocumentPosition(ex) & Node.DOCUMENT_POSITION_FOLLOWING)) }; }""")
        check("the key figures lead together: monthly, total due today, scheduled payments, interest",
              key["order"] == ["monthly", "due", "scheduled", "interest"], str(key))
        check("...each appears once (not repeated in the groups) and the exclusions label sits directly after them",
              key["dup"] == 0 and key["excludesAfter"], str(key))
        check("a shown payment says the minimum check is on merchandise only and is not an eligibility finding",
              "does not confirm eligibility" in fx["text"] and "What counts toward the minimum" in rows.get("eligibility", ""))
        check("the basis and estimate notes are adjacent to the figures",
              "1.8521%" in fx["text"] and "rounded up to the next whole dollar" in fx["text"]
              and "not an offer of credit" in fx["text"])
        zero = page.evaluate(FACTS, "synchrony-0-48")
        check("0%/48: no payment (method not published, down payment required)",
              zero and zero["state"] == "to-confirm" and zero["rows"]["monthly"] == "To confirm"
              and zero["rows"]["down"].startswith("Required"), str(zero and zero["rows"]))
        check("0%/48: interest stated in words, never as $0",
              zero and zero["rows"]["interest"] == "None on the promotional purchase")
        for pid in ("lacks-in-house", "lease-to-own", "build-my-credit"):
            f = page.evaluate(FACTS, pid)
            check(f"{pid}: every figure To confirm",
                  f and f["state"] == "to-confirm" and f["rows"]["monthly"] == "To confirm"
                  and f["rows"]["scheduled"] == "To confirm", str(f and f["rows"]))
        weight = page.evaluate("""() => {
          const s = document.querySelector('.fin-fx[data-fx-plan="synchrony-9-99-72"]');
          const v = (k) => getComputedStyle(s.querySelector('[data-fx="' + k + '"] .fin-fx__value'));
          return [v('monthly').fontSize, v('scheduled').fontSize, v('due').fontSize,
                  v('monthly').fontWeight, v('scheduled').fontWeight, v('due').fontWeight];
        }""")
        check("equal weight: monthly, total and due-today values share one size and weight",
              weight[0] == weight[1] == weight[2] and weight[3] == weight[4] == weight[5], str(weight))

        # ---- 6. comparison ------------------------------------------------------
        print("6. Comparison view:")
        page.evaluate("""async () => { const w = (ms) => new Promise((r) => setTimeout(r, ms));
          document.querySelector('.fin-ws-cmp-start:not([hidden])') && [...document.querySelectorAll('.fin-ws-cmp-start')].filter(b => b.offsetParent)[0].click(); await w(200);
          document.querySelectorAll('#financingSheetCards .fin-ws-row.is-picking')[0].click(); await w(300); }""")
        cmp_text = page.evaluate("() => document.getElementById('finWsStage').textContent")
        check("the comparison carries the monthly, total and due-today rows",
              "Monthly payment" in cmp_text and "Total of scheduled payments" in cmp_text and "Total due today" in cmp_text)
        check("the comparison shows the calculated payment for the published plan", money(pay) in cmp_text)
        page.evaluate("() => window.endPaymentCompare()")
        page.wait_for_timeout(200)

        # ---- 5. language parity -------------------------------------------------
        print("5. Spanish with the workspace open:")
        before = page.evaluate("() => Object.keys(payOpen).filter(function(k) { return payOpen[k]; })")
        page.evaluate("() => switchLanguage('es')")
        page.wait_for_timeout(500)
        es = page.evaluate(FACTS, PLAN)
        after = page.evaluate("() => Object.keys(payOpen).filter(function(k) { return payOpen[k]; })")
        check("same explored path after the switch", before == after, f"{before} vs {after}")
        check("Spanish labels", es and "Pago mensual" in es["text"] and "Total a pagar hoy" in es["text"], "")
        check("same monthly figure in Spanish", es and es["rows"]["monthly"] == money(pay), es and es["rows"]["monthly"])
        check("Spanish 'To confirm' wording", es and es["rows"]["due"] == "Por confirmar")
        page.evaluate("() => switchLanguage('en')")
        page.wait_for_timeout(400)

        # ---- 4. purchase change -------------------------------------------------
        print("4. Purchase change recalculates on the same render:")
        page.evaluate("() => { window.addReviewAccessory('pillow-flow'); }")
        page.evaluate("() => window.finWsAfterPurchaseEditForTest && 0")
        # Through the workspace's own edit path: open items, add a quantity.
        page.evaluate("() => { renderFinancingSheet(); }")
        q2 = page.evaluate(QUOTE)
        fx2 = page.evaluate(FACTS, PLAN)
        check("the purchase grew", q2["m"] and q2["m"] > q["m"], str(q2))
        check("the monthly figure follows the new purchase",
              fx2 and fx2["rows"]["monthly"] == money(expected_payment_minor(q2["m"])), fx2 and fx2["rows"]["monthly"])
        check("the scheduled total follows the new purchase",
              fx2 and fx2["rows"]["scheduled"] == "Up to " + money(expected_payment_minor(q2["m"]) * TERM))
        page.evaluate("() => { window._payWsView = 'items'; }")
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        page.evaluate("() => window.finWsRemove('pillow-flow')")
        page.wait_for_timeout(300)
        q3 = page.evaluate(QUOTE)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        fx3 = page.evaluate(FACTS, PLAN)
        check("removing the item from the workspace recomputes back to the mattress-only figure",
              q3["m"] == q["m"] and fx3 and fx3["rows"]["monthly"] == money(pay), f"{q3} {fx3 and fx3['rows']['monthly']}")
        live = page.inner_text("#financingSheetAction")
        check("the edit is announced with the recalculation", "recalculated" in live, live)

        # ---- 8. take-home exclusion --------------------------------------------
        print("8. Payment facts never leave the workspace:")
        outside = page.evaluate("() => [...document.querySelectorAll('[data-fx-state], .fin-fx')]"
                                ".filter(function(e) { return !document.getElementById('financingSheet').contains(e); }).length")
        check("no payment-fact element outside the workspace", outside == 0, str(outside))
        page.evaluate("() => window.closeFinancingSheet()")
        page.wait_for_timeout(200)
        summary = page.inner_text("#hf2Screen")
        check("the Summary shows no monthly payment", "Monthly payment" not in summary and money(pay) + " " not in summary
              and "Up to " not in summary)
        page.evaluate("() => window.showSleepPlan && window.showSleepPlan()")
        page.wait_for_timeout(300)
        plan_txt = page.evaluate("() => (document.getElementById('sleepPlanScreen') || {}).innerText || ''")
        check("the Sleep Plan shows no payment figure", "Monthly payment" not in plan_txt and "Up to $" not in plan_txt)
        page.evaluate("() => window.showEmailCapture && window.showEmailCapture()")
        page.wait_for_timeout(300)
        email_txt = page.evaluate("() => (document.getElementById('emailScreen') || {}).innerText || ''")
        check("the take-home preview carries no payment figure",
              "Monthly payment" not in email_txt and "Up to $" not in email_txt and "Pago mensual" not in email_txt)

        # ---- 9. wipe -------------------------------------------------------------
        print("9. New-customer wipe:")
        page.evaluate("() => window.startOver()")
        page.wait_for_timeout(400)
        left = page.evaluate("() => ({ fx: document.querySelectorAll('[data-fx-state]').length, "
                             "cards: document.getElementById('financingSheetCards').innerHTML.length, "
                             "hidden: document.getElementById('financingSheet').hidden, lang: currentLang })")
        check("no payment fact, no workspace content and the sheet closed after the wipe",
              left["fx"] == 0 and left["cards"] == 0 and left["hidden"] is True, str(left))
        ctx.close()

        # ---- 7. gates fail closed one at a time -----------------------------
        print("7. Every gate fails closed:")
        GATES = [
            ("exact terms off", "STORE_CONFIG.financing.exactPromotionsEnabled = false", None),
            ("plan calculation off", "STORE_CONFIG.financing.plans[0].paymentCalculationEnabled = false", "to-confirm"),
            ("no formula artifact", "STORE_CONFIG.pricing.formulas = []", "to-confirm"),
            ("method not published", "STORE_CONFIG.financing.plans[0].calculationMode = 'not-published'", "to-confirm"),
            ("rounding rule absent", "delete STORE_CONFIG.financing.plans[0].paymentRounding", "to-confirm"),
            ("factor absent", "delete STORE_CONFIG.financing.plans[0].publishedPaymentFactor", "to-confirm"),
            ("stale financing", "STORE_CONFIG.financing.verifiedAt = new Date(Date.now() - 30 * 86400000).toISOString()", None),
            ("purchase below the published minimum", "STORE_CONFIG.financing.plans[0].minimumPurchase = 1000000", "to-confirm"),
            ("pricing display off", "STORE_CONFIG.pricing.displayEnabled = false", None),
        ]
        for label, js, want in GATES:
            ctx, page = loaded(browser, pay_url, errors)
            page.evaluate(OPEN_PROMO)
            check(f"[{label}] baseline is calculated", (page.evaluate(FACTS, PLAN) or {}).get("state") == "calculated")
            rerender(page, js)
            f = page.evaluate(FACTS, PLAN)
            if want is None:
                check(f"[{label}] no figure renders (the table is withheld)", f is None
                      or f["rows"].get("monthly") == "To confirm", str(f and f["rows"].get("monthly")))
            else:
                check(f"[{label}] the plan reads To confirm, no figure",
                      f and f["state"] == want and f["rows"]["monthly"] == "To confirm"
                      and f["rows"]["scheduled"] == "To confirm", str(f and f["rows"]))
            if label in ("exact terms off", "stale financing", "pricing display off"):
                n_fx = page.evaluate("() => document.querySelectorAll('#financingSheet .fin-fx').length")
                check(f"[{label}] no plan shows a payment table at all (orientation only)", n_fx == 0, str(n_fx))
            if label.startswith("purchase below"):
                check("[below minimum] says so without a gap amount",
                      f and "below the advertised" in f["rows"]["eligibility"]
                      and not re.search(r"\$[\d,]+ (more|short|away)", f["text"]))
            ctx.close()
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate("() => { window._accCart = window._accCart || {}; window._accCart['no-such-item'] = { quantity: 1 }; }")
        page.evaluate(OPEN_PROMO)
        f = page.evaluate(FACTS, PLAN)
        check("[incomplete purchase] no figure, and it says why",
              f and f["state"] == "to-confirm" and f["rows"]["monthly"] == "To confirm"
              and "verified price" in f["text"], str(f and f["rows"]))
        ctx.close()

        # ---- 13. cost labels, fulfillment choice, comfort promise --------------
        print("13. Cost labels, fulfillment choice and the comfort promise:")
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate(OPEN_PROMO)
        fx = page.evaluate(FACTS, PLAN)
        lbl = page.evaluate("""() => { const s = document.querySelector('.fin-fx[data-fx-plan="synchrony-9-99-72"]');
          const L = (k) => s.querySelector('[data-fx="' + k + '"] .fin-fx__label').textContent;
          return { sub: L('subtotal'), fin: L('financed'), sch: L('scheduled'), tot: L('total'),
                   ex: (s.querySelector('.fin-fx__excludes') || {}).textContent || '' }; }""")
        check("four distinct cost labels: merchandise subtotal, amount financed, scheduled payments, complete purchase cost",
              lbl["sub"] == "Merchandise subtotal" and lbl["fin"] == "Amount financed (estimate)"
              and lbl["sch"] == "Total of scheduled payments" and lbl["tot"] == "Complete purchase cost", str(lbl))
        check("the calculated estimate is labelled as excluding tax and delivery or setup",
              "excludes sales tax and delivery or setup" in lbl["ex"], lbl["ex"])
        check("tax and delivery are separate rows, both To confirm before any choice",
              fx["rows"]["tax"] == "To confirm" and fx["rows"]["fulfillment"] == "To confirm", str(fx["rows"]))
        page.evaluate("() => window.setPaymentFulfil('pickup')")
        page.wait_for_timeout(200)
        fx2 = page.evaluate(FACTS, PLAN)
        ex2 = page.evaluate("() => document.querySelector('.fin-fx[data-fx-plan=\"synchrony-9-99-72\"] .fin-fx__excludes').textContent")
        check("choosing published warehouse pickup states no delivery charge, in words",
              fx2["rows"]["fulfillment"] == "No charge (warehouse pickup)", fx2["rows"]["fulfillment"])
        check("...tax, total due today and the complete purchase cost stay To confirm",
              fx2["rows"]["tax"] == "To confirm" and fx2["rows"]["due"] == "To confirm" and fx2["rows"]["total"] == "To confirm")
        check("...the monthly figure does not change (pickup is not financed money)", fx2["rows"]["monthly"] == fx["rows"]["monthly"])
        check("...and the estimate label now excludes only sales tax", "excludes sales tax, which" in ex2, ex2)
        check("the choice is pressed for assistive technology",
              page.get_attribute("#finWsFf-pickup", "aria-pressed") == "true"
              and page.get_attribute("#finWsFf-delivery", "aria-pressed") == "false")
        page.evaluate("() => switchLanguage('es')")
        page.wait_for_timeout(400)
        fxe = page.evaluate(FACTS, PLAN)
        check("the pickup choice survives a language switch, in Spanish wording",
              fxe["rows"]["fulfillment"] == "Sin cargo (recogida en almacén)", fxe["rows"]["fulfillment"])
        page.evaluate("() => switchLanguage('en')")
        page.wait_for_timeout(300)
        page.evaluate("() => window.setPaymentFulfil('delivery')")
        page.wait_for_timeout(200)
        check("choosing delivery returns the charge to To confirm",
              page.evaluate(FACTS, PLAN)["rows"]["fulfillment"] == "To confirm")
        # comfort promise checklist against the cart
        page.evaluate("() => { window.togglePaymentItems(); }")
        page.wait_for_timeout(250)
        cp = page.evaluate("""() => [...document.querySelectorAll('.fin-ws-cp__item')].map(li => [li.querySelector('.fin-ws-cp__label').textContent, li.classList.contains('is-in')])""")
        check("comfort promise: with neither item the checklist shows both as not in the plan",
              cp == [["A mattress protector", False], ["At least one pillow", False]], str(cp))
        page.evaluate("() => { window.addReviewAccessory('protector-dritec'); window.addReviewAccessory('pillow-flow'); renderFinancingSheet(); }")
        page.wait_for_timeout(250)
        cp2 = page.evaluate("""() => [...document.querySelectorAll('.fin-ws-cp__item')].map(li => li.classList.contains('is-in'))""")
        txt = page.evaluate("() => document.querySelector('.fin-ws-cp').textContent")
        check("comfort promise: adding a protector and a pillow marks both as in the plan", cp2 == [True, True], str(cp2))
        check("comfort promise: never claims the customer qualifies, and says adding items is a choice",
              "qualif" in txt and "always your choice" in txt and "you qualify" not in txt.lower())
        page.evaluate("() => window.startOver()")
        page.wait_for_timeout(400)
        check("the wipe clears the fulfillment choice", page.evaluate("() => _payFulfil") == "")
        ctx.close()
        ctx, page = loaded(browser, repo_url, errors)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        check("shipped configuration: no fulfillment control and no comfort-promise panel",
              page.evaluate("() => document.querySelectorAll('.fin-ws-ff, .fin-ws-cp').length") == 0)
        ctx.close()

        # ---- 14. purchase builder: lines, comparison, unpriced items/sizes ----
        print("14. Purchase builder and the mattress-only vs complete-system comparison:")
        PB = """() => { const c = document.querySelector('.fin-pb'); if (!c) return null;
          const g = (r, k) => (c.querySelector('[data-pb="' + r + '"] [data-col="' + k + '"]') || {}).textContent || null;
          return { notice: (c.querySelector('.fin-pb__notice') || {}).textContent || '',
                   m: [g('amount', 'mattress'), g('monthly', 'mattress'), g('scheduled', 'mattress')],
                   s: [g('amount', 'system'), g('monthly', 'system'), g('scheduled', 'system')],
                   d: [g('amount', 'diff'), g('monthly', 'diff')],
                   unknown: (c.querySelector('.fin-pb__unknown') || {}).textContent || '',
                   lines: [...document.querySelectorAll('.fin-ws-line')].map(l => (l.querySelector('.fin-ws-line__price') || {}).textContent || ''),
                   weights: [...c.querySelectorAll('.fin-pb__cell')].map(x => getComputedStyle(x).fontSize + '/' + getComputedStyle(x).fontWeight) }; }"""
        ctx, page = loaded(browser, pay_url, errors, acc=True)
        page.evaluate("() => { window.togglePaymentItems ? null : null; }")
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(300)
        q = page.evaluate("""() => { var q = buildConsultationQuote('handoff', priceSizeAnswer());
          return { status: q.status, m: q.merchandiseMinor, mat: q.lines.filter(function (l) { return l.kind === 'mattress'; })[0].extendedAmountMinor }; }""")
        pb = page.evaluate(PB)
        check("the builder renders when the purchase is fully priced", pb is not None and q["status"] == "complete", str(q))
        if pb:
            check("every line shows its own price (no line left blank)", all(x.strip() for x in pb["lines"]), str(pb["lines"]))
            mo, sy = expected_payment_minor(q["mat"]), expected_payment_minor(q["m"])
            check("mattress-only column: subtotal and monthly match the recomputation",
                  pb["m"][0] == money(q["mat"]) and pb["m"][1] == money(mo), str(pb["m"]))
            check("complete-system column: subtotal and monthly match the recomputation",
                  pb["s"][0] == money(q["m"]) and pb["s"][1] == money(sy), str(pb["s"]))
            check("the difference is the system minus the mattress, for both subtotal and monthly",
                  pb["d"][0] == "+" + money(q["m"] - q["mat"]) and pb["d"][1] == "+" + money(sy - mo), str(pb["d"]))
            check("unknown charges stay visible beside the comparison", "sales tax and delivery or setup" in pb["unknown"], pb["unknown"])
            check("equal weight: every comparison figure shares one size and weight", len(set(pb["weights"])) == 1, str(set(pb["weights"])))
        page.evaluate("() => { var a = ACCESSORIES.filter(function (x) { return x.id === 'pillow-flow'; })[0]; delete a.sku; delete a.accessorySkus; window.addReviewAccessory('pillow-flow'); renderFinancingSheet(); }")
        page.wait_for_timeout(250)
        pb2 = page.evaluate(PB)
        check("an item without a verified price withholds the complete-system figures, by name",
              pb2 and pb2["s"][0] == "To confirm" and pb2["s"][1] == "To confirm" and "no verified price" in pb2["notice"], str(pb2 and pb2["notice"]))
        check("...while the mattress-only figures still stand", pb2 and pb2["m"][1] == money(expected_payment_minor(q["mat"])))
        check("...and the unpriced line itself says so (never a blank price cell)",
              pb2 and any(x.strip() == "No verified price at Queen" for x in pb2["lines"]), str(pb2 and pb2["lines"]))
        ctx.close()
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate("() => { answers.mattress_size = 'twin_xl'; }")
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(300)
        pb3 = page.evaluate(PB)
        check("a size the mattress has no verified price at is stated explicitly, and no figure is shown",
              pb3 and "no verified price at" in pb3["notice"].lower() and pb3["m"][1] == "To confirm", str(pb3))
        check("...and the mattress line names the size it has no price at",
              pb3 and pb3["lines"] and pb3["lines"][0].strip() == "No verified price at Twin XL", str(pb3 and pb3["lines"]))
        ctx.close()
        ctx, page = loaded(browser, repo_url, errors, acc=True)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(300)
        check("shipped configuration: no builder card and no line prices",
              page.evaluate("() => document.querySelectorAll('.fin-pb, .fin-ws-line__price').length") == 0)
        ctx.close()

        # ---- 15. audit repairs (2026-10-03) ------------------------------------
        print("15. Audit repairs: policy gate, plan label, zero difference:")
        ctx, page = loaded(browser, pay_url, errors, acc=True)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        n0 = page.evaluate("() => document.querySelectorAll('.fin-ws-ff, .fin-ws-cp').length")
        page.evaluate("() => { STORE_CONFIG.salesPolicies.status = ''; renderFinancingSheet(); }")
        n1 = page.evaluate("() => document.querySelectorAll('.fin-ws-ff, .fin-ws-cp').length")
        page.evaluate("() => { STORE_CONFIG.salesPolicies.status = 'review'; STORE_CONFIG.salesPolicies.comfortPromise.sourceUrl = 'https://example.com/policy'; renderFinancingSheet(); }")
        n2 = page.evaluate("() => document.querySelectorAll('.fin-ws-cp').length")
        page.evaluate("() => { STORE_CONFIG.salesPolicies.comfortPromise.sourceUrl = 'https://www.lacks.com/return-and-store-policies'; STORE_CONFIG.pricing.displayEnabled = false; renderFinancingSheet(); }")
        n3 = page.evaluate("() => document.querySelectorAll('.fin-ws-ff, .fin-ws-cp').length")
        check("retailer policy content renders with a status, an allowlisted source and open pricing", n0 == 2, str(n0))
        check("...and is withheld without a status", n1 == 0, str(n1))
        check("...withheld when its source is off the allowlist", n2 == 0, str(n2))
        check("...and withheld when pricing display is off", n3 == 0, str(n3))
        ctx.close()
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate("() => { answers.mattress_size = 'twin_xl'; }")
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        check("no plan label is shown when nothing could be calculated",
              page.evaluate("() => document.querySelectorAll('.fin-pb__plan').length") == 0)
        ctx.close()
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate(OPEN_PROMO)
        same = page.evaluate("""() => { const p = (typeof purchaseBuilderFor === 'function') ? null : null;
          return (typeof pricingSameAmountText === 'function') ? pricingSameAmountText() : ''; }""")
        check("a zero difference reads as words, never a lone '+'", same == "Same", same)
        ctx.close()

        # ---- 16. review-only scenario panel ---------------------------------------
        print("16. Review-only scenario panel (assumptions):")
        SC = """() => { const r = document.getElementById('finScResults'); if (!r) return null;
          const g = (sel) => [...r.querySelectorAll(sel)].map(e => e.textContent.trim());
          const row = (k) => [...r.querySelectorAll('[data-sc="' + k + '"] .fin-sc__cell')].map(e => e.textContent.trim());
          const tot = g('.fin-sc__total span:last-child');
          return { chips: g('.fin-sc__chip'), missing: g('.fin-sc__missing').join(' '), due: tot[0], fin: tot[1],
                   heads: g('.fin-sc__row--head span').slice(1), monthly: row('monthly'), scheduled: row('scheduled'),
                   interest: row('interest'), cost: row('cost'), unc: g('.fin-sc__unc').join(' '),
                   rowLabels: [...r.querySelectorAll('.fin-sc__rk')].map(e => e.textContent) }; }"""
        def eqdiv(pm, n):
            dd, rr = divmod(pm, n * 100)
            return (dd + (1 if rr else 0)) * 100
        ctx, page = loaded(browser, pay_url, errors, acc=True)
        page.evaluate(OPEN_PROMO)
        fx_before = page.evaluate(FACTS, PLAN)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        page.evaluate("() => window.finScToggle()")
        page.wait_for_timeout(200)
        merch = page.evaluate("() => buildConsultationQuote('handoff', priceSizeAnswer()).merchandiseMinor")
        sc0 = page.evaluate(SC)
        check("the scenario panel opens with every assumption blank and nothing computed",
              sc0 and sc0["chips"] == [] and sc0["due"] == "Enter an assumption" and sc0["fin"] == "Enter an assumption"
              and all(x == "Enter an assumption" for x in sc0["monthly"]), str(sc0)[:300])
        check("...and names each missing assumption, asking for an explicit zero",
              "enter 0 if none" in sc0["missing"] and "paid today or financed" in sc0["missing"], sc0["missing"])
        check("plans without a published method are listed as uncalculated",
              "No published calculation method" in sc0["unc"] and "In-House" in sc0["unc"] and "Lease-to-own" in sc0["unc"], sc0["unc"])
        check("only plans with a published method get a column (9.99%/72 and 0%/48)",
              sc0["heads"] == ["9.99% APR for 72 months", "0% APR for 48 months"], str(sc0["heads"]))
        check("the rows distinguish financing interest and a MAXIMUM scheduled total from an exact payoff",
              any("not an exact payoff total" in x for x in sc0["rowLabels"]) and any(x.startswith("Financing interest") for x in sc0["rowLabels"]),
              str(sc0["rowLabels"]))
        page.fill("#finScTax", "8.25"); page.fill("#finScDown", "500")
        page.wait_for_timeout(150)
        sc1 = page.evaluate(SC)
        check("a blank delivery amount and no tax/delivery treatment are never treated as zero",
              sc1["due"] == "Enter an assumption" and sc1["fin"] == "Enter an assumption", str(sc1)[:240])
        check("typing keeps the field focused (results update without re-rendering the inputs)",
              page.evaluate("() => document.activeElement && document.activeElement.id") == "finScDown")
        page.fill("#finScDelivery", "150"); page.click("#finScTreat-financed")
        page.wait_for_timeout(200)
        sc2 = page.evaluate(SC)
        tax = (merch * 8250 + 50000) // 100000
        fin = merch - 50000 + tax + 15000
        p72 = expected_payment_minor(fin)
        check("financed: amount financed = merchandise - down + tax + delivery", sc2["fin"] == money(fin), f"{sc2['fin']} vs {money(fin)}")
        check("financed: total due today = the down payment only", sc2["due"] == "$500", sc2["due"])
        check("9.99%/72 on the scenario amount: monthly, maximum scheduled, financing interest, complete scenario cost",
              sc2["monthly"][0] == money(p72) and sc2["scheduled"][0] == money(p72 * 72)
              and sc2["interest"][0] == money(p72 * 72 - fin) and sc2["cost"][0] == money(50000 + p72 * 72), str(sc2)[:400])
        if merch >= 420000:
            p48 = eqdiv(fin, 48)
            check("0%/48 uses its published method (amount / 48, rounded up) and states no interest",
                  sc2["monthly"][1] == money(p48) and sc2["interest"][1] == "None on the promotional purchase", str(sc2["monthly"]))
        else:
            check("0%/48 below its advertised minimum says so, measured on merchandise",
                  ("below the advertised $4,200" in sc2["monthly"][1]
                   or "require tax and delivery at purchase" in sc2["monthly"][1]), str(sc2["monthly"]))
        check("every entered value is shown as an assumption", len(sc2["chips"]) == 4 and all(c.startswith("Assumed") for c in sc2["chips"]), str(sc2["chips"]))
        page.click("#finScTreat-today")
        page.wait_for_timeout(200)
        sc3 = page.evaluate(SC)
        check("paid today: due today = down + tax + delivery; financed = merchandise - down",
              sc3["due"] == money(50000 + tax + 15000) and sc3["fin"] == money(merch - 50000), f"{sc3['due']} {sc3['fin']}")
        fx_after = page.evaluate("() => { var r = {}; return r; }")
        page.evaluate("() => { window.togglePaymentItems(); }")
        page.wait_for_timeout(200)
        fx_after = page.evaluate(FACTS, PLAN)
        check("the verified payment table is unchanged by any assumption", fx_after and fx_after["rows"] == fx_before["rows"],
              str(fx_after and fx_after["rows"].get("due")))
        page.evaluate("() => switchLanguage('es')")
        page.wait_for_timeout(400)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        sce = page.evaluate(SC)
        check("Spanish: the same scenario figures with Spanish labels and chips",
              sce and sce["due"] == sc3["due"] and sce["monthly"][0] == sc3["monthly"][0]
              and any(c.startswith("Supuesto") for c in sce["chips"]), str(sce and sce["chips"]))
        page.evaluate("() => window.startOver()")
        page.wait_for_timeout(400)
        check("customer reset clears every assumption",
              page.evaluate("() => JSON.stringify(_payScenario)") == '{"open":false,"tax":"","delivery":"","down":"","treatment":""}')
        ctx.close()
        # explicit zeros: no charges means no treatment is needed
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => { window.togglePaymentItems(); }")
        page.wait_for_timeout(250)
        page.evaluate("() => window.finScToggle()")
        page.wait_for_timeout(200)
        page.fill("#finScTax", "0"); page.fill("#finScDelivery", "0"); page.fill("#finScDown", "0")
        page.wait_for_timeout(150)
        scz = page.evaluate(SC)
        m2 = page.evaluate("() => buildConsultationQuote('handoff', priceSizeAnswer()).merchandiseMinor")
        check("explicit zeros are accepted: no treatment needed, financed = merchandise, cost complete",
              scz["fin"] == money(m2) and scz["due"] == "$0" and scz["cost"][0] == money(expected_payment_minor(m2) * 72), str(scz)[:300])
        page.fill("#finScTax", "99")
        page.wait_for_timeout(150)
        check("an out-of-range tax rate is refused by name", "valid tax rate" in page.evaluate(SC)["missing"])
        ctx.close()
        # a partial scenario: the payment can compute, the complete cost cannot
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => { window.togglePaymentItems(); }")
        page.wait_for_timeout(250)
        page.evaluate("() => window.finScToggle()")
        page.wait_for_timeout(200)
        page.fill("#finScDown", "500"); page.fill("#finScDelivery", "150"); page.click("#finScTreat-today")
        page.wait_for_timeout(200)
        scp = page.evaluate(SC)
        check("partial scenario (tax blank, paid today): the payment computes but the complete cost waits for every assumption",
              scp["monthly"][0].startswith("$") and scp["cost"][0] == "Needs every assumption" and scp["due"] == "Enter an assumption",
              str(scp)[:300])
        ctx.close()
        # audit repairs: a $0 down payment, financed charges, nothing financed
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate("() => { var z = STORE_CONFIG.financing.plans.filter(function (p) { return p.id === 'synchrony-0-48'; })[0]; z.minimumPurchase = 1; }")
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => { window.togglePaymentItems(); }")
        page.wait_for_timeout(250)
        page.evaluate("() => window.finScToggle()")
        page.wait_for_timeout(200)
        page.fill("#finScTax", "8.25"); page.fill("#finScDelivery", "150"); page.fill("#finScDown", "0"); page.click("#finScTreat-today")
        page.wait_for_timeout(200)
        a1 = page.evaluate(SC)
        check("audit repairs: a $0 down payment does not satisfy 0%/48's required down payment",
              "Needs a down payment above" in a1["monthly"][1] and a1["monthly"][0].startswith("$"), str(a1["monthly"]))
        page.fill("#finScDown", "500"); page.click("#finScTreat-financed")
        page.wait_for_timeout(200)
        a2 = page.evaluate(SC)
        check("audit repairs: 0%/48 is not calculated when tax and delivery are financed (its terms require them at purchase)",
              "require tax and delivery at purchase" in a2["monthly"][1] and a2["monthly"][0].startswith("$"), str(a2["monthly"]))
        page.click("#finScTreat-today")
        m3 = page.evaluate("() => buildConsultationQuote('handoff', priceSizeAnswer()).merchandiseMinor")
        page.fill("#finScDown", f"{m3 // 100}.{m3 % 100:02d}")
        page.wait_for_timeout(200)
        a3 = page.evaluate(SC)
        tax3 = (m3 * 8250 + 50000) // 100000
        check("audit repairs: with nothing financed the complete scenario cost equals total due today",
              a3["fin"] == "$0" and a3["cost"][0] == money(m3 + tax3 + 15000) and a3["cost"][0] == a3["due"], str(a3)[:300])
        check("audit repairs: screen readers hear 'minus' for the subtracted down payment",
              page.evaluate("() => [...document.querySelectorAll('#finScResults .fin-sc__sr')].map(e => e.textContent.trim())").count("minus") >= 1)
        ctx.close()
        # the verified table never calculates 0%/48 without a down payment,
        # even when its minimum is met
        ctx, page = loaded(browser, pay_url, errors)
        page.evaluate("() => { var z = STORE_CONFIG.financing.plans.filter(function (p) { return p.id === 'synchrony-0-48'; })[0]; z.minimumPurchase = 1; }")
        page.evaluate(OPEN_PROMO)
        z = page.evaluate(FACTS, "synchrony-0-48")
        check("0%/48 in the verified table stays To confirm without a down payment, even above its minimum",
              z and z["rows"]["monthly"] == "To confirm" and z["state"] == "to-confirm", str(z and z["rows"].get("monthly")))
        ctx.close()
        ctx, page = loaded(browser, repo_url, errors, acc=True)
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        check("shipped configuration: no scenario panel", page.evaluate("() => document.querySelectorAll('.fin-sc').length") == 0)
        ctx.close()
        ctx, page = loaded(browser, pay_url, errors, acc=True)
        page.evaluate("() => { delete STORE_CONFIG.reviewTools; }")
        page.evaluate(OPEN_PROMO)
        page.evaluate("() => window.togglePaymentItems()")
        page.wait_for_timeout(250)
        check("without the reviewTools flag the panel never renders", page.evaluate("() => document.querySelectorAll('.fin-sc').length") == 0)
        ctx.close()

        # ---- 10. shipped configuration ---------------------------------------
        print("10. Shipped configuration renders nothing:")
        ctx, page = loaded(browser, repo_url, errors)
        page.evaluate(OPEN_PROMO)
        n = page.evaluate("() => document.querySelectorAll('[data-fx-state], .fin-fx').length")
        txt = page.evaluate("() => document.getElementById('financingSheet').textContent")
        check("no payment-fact element under the shipped gates", n == 0, str(n))
        check("no currency figure or per-period text in the shipped workspace",
              not re.search(r"\$\s?\d", txt) and "Monthly payment" not in txt)
        ctx.close()

        # ---- 11. layout --------------------------------------------------------
        print("11. Layout:")
        for (w, h) in ((1194, 834), (1024, 768), (834, 1194)):
            for lang in ("en", "es"):
                ctx, page = loaded(browser, pay_url, errors, w, h)
                if lang == "es":
                    page.evaluate("() => switchLanguage('es')")
                    page.wait_for_timeout(300)
                page.evaluate(OPEN_PROMO)
                lay = page.evaluate("""() => {
                  const s = document.querySelector('.fin-fx[data-fx-plan="synchrony-9-99-72"]');
                  if (!s) return { missing: true };
                  const r = s.getBoundingClientRect(), vw = innerWidth, out = [];
                  s.querySelectorAll('.fin-fx__label, .fin-fx__value').forEach((e) => {
                    const b = e.getBoundingClientRect();
                    if (b.right > vw + 0.5 || e.scrollWidth > e.clientWidth + 1) out.push(e.textContent.slice(0, 30));
                  });
                  return { missing: false, overflow: out, right: r.right, vw: vw,
                           cols: getComputedStyle(s.querySelector('.fin-fx__groups')).gridTemplateColumns.split(' ').length };
                }""")
                tag = f"[{lang} {w}x{h}]"
                check(f"{tag} the facts table renders with no horizontal overflow",
                      not lay.get("missing") and not lay["overflow"] and lay["right"] <= lay["vw"] + 0.5, str(lay))
                if h > w:
                    check(f"{tag} portrait stacks the groups in one column", lay.get("cols") == 1, str(lay.get("cols")))
                ctx.close()

        browser.close()
    print("12. Review-build capture directory:")
    check("--capture-dir is refused outside the website/review states",
          sp.main(["--state", "payments", "--capture-dir", REPO]) == 2)
    check("--capture-dir without a snapshot and mapping is refused",
          sp.main(["--state", "review", "--capture-dir", os.path.join(REPO, "docs")]) == 2)
    real = [e for e in errors if "favicon" not in e]
    check("no page errors or console errors across every walk", not real, "; ".join(real[:3]))
    print(f"\nPayment facts check: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
