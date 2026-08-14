# Handoff-layout regression check (rendered browser assertion).
#
# Guards the 854x698 owner-walkthrough defect: the completed handoff's
# summary card shrank inside the height-locked, centered handoff scene and
# its own rounded overflow:hidden silently clipped the System, Payment
# preference, and Options explored rows with NO scroll surface anywhere.
#
# Detects the MECHANISM, not a CSS string, at the exact reproduction
# viewport with the fullest realistic handoff state in BOTH languages:
#   1. the summary card is never internally clipped
#      (card.scrollHeight <= card.clientHeight + 1);
#   2. when content exceeds the viewport, the SCENE is the functional
#      scroll surface (computed overflow-y auto/scroll, maxScroll > 0);
#   3. no ancestor with hidden vertical overflow clips the last meaningful
#      content (Options explored row, explanatory note, New customer);
#   4. at an appropriate scroll position the last content is FULLY visible;
#   5. the handoff opens at the top, and a language switch resets the
#      scroll position.
#
# Prerequisites: playwright + chromium installed, and the prototype served
# (default http://localhost:8123, override with HANDOFF_CHECK_BASE).
# Run: python prototypes/demo-round-2026-08-13/checks/handoff_layout_check.py

import os, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("HANDOFF_CHECK_BASE", "http://localhost:8123") \
    + "/prototypes/demo-round-2026-08-13/"

FULLEST = """() => {
  demoFill(); go('results');
  cmpSel = computed.tiers.gold.slice(0,2).map(e=>e.id);
  finalistId = cmpSel[0];
  go('plan');
  const ranked = accRunner(ACC, answers, lang);
  const picks = ranked.filter(a=>a.matched).slice(0,3);
  sysSel = [ (picks[0]||ranked[0]).id ];
  openPay('plan');
  reviewPath('plan:lacks-in-house');
  reviewPath('promotional:Synchrony');
  considerPath('promotional:Synchrony');
  closePay(); go('handoff');
}"""

PROBE = """() => {
  const scene = document.getElementById('handoff');
  const card = document.querySelector('.card-consult');
  const rows = Array.from(document.querySelectorAll('#hRows .row'));
  const byLbl = t => rows.find(x => x.querySelector('b').textContent === t);
  const targets = {
    explored: byLbl(L(T.exploredLbl)),
    note: document.getElementById('hNote'),
    newCustomer: document.querySelector('.handoff-foot .cta')
  };
  const out = {
    openedAtTop: scene.scrollTop === 0,
    cardNotClipped: card.scrollHeight <= card.clientHeight + 1,
    sceneOverflow: getComputedStyle(scene).overflowY,
    sceneMax: scene.scrollHeight - scene.clientHeight,
    needsScroll: scene.scrollHeight > scene.clientHeight + 1,
    hiddenAncestorClips: false, reachable: {}
  };
  for (const [k, el] of Object.entries(targets)) {
    if (!el) { out.reachable[k] = false; continue; }
    // no ancestor with hidden overflow may clip the element
    let a = el.parentElement;
    while (a && a !== document.body) {
      const cs = getComputedStyle(a);
      if (cs.overflowY === 'hidden' && a.scrollHeight > a.clientHeight + 1)
        out.hiddenAncestorClips = true;
      a = a.parentElement;
    }
    el.scrollIntoView({block: 'nearest'});
    const r = el.getBoundingClientRect();
    out.reachable[k] = r.top >= -1 && r.bottom <= innerHeight + 1;
  }
  // language switch resets the scroll position
  scene.scrollTop = scene.scrollHeight;
  setLang(lang === 'en' ? 'es' : 'en');
  out.langSwitchResets = document.getElementById('handoff').scrollTop === 0;
  setLang(lang === 'en' ? 'es' : 'en');
  out.noH = document.documentElement.scrollWidth <= innerWidth + 1;
  return out;
}"""

failures = 0
def check(name, cond):
    global failures
    print(("PASS" if cond else "FAIL") + "  " + name)
    if not cond: failures += 1

with sync_playwright() as p:
    b = p.chromium.launch()
    for lang in ["en", "es"]:
        ctx = b.new_context(viewport={"width": 854, "height": 698})
        pg = ctx.new_page()
        pg.goto(BASE)
        pg.wait_for_function("() => !!(window.engine && window.FIN && window.clearPath)",
                             timeout=20000)
        if lang == "es":
            pg.evaluate("setLang('es')")
        pg.evaluate(FULLEST)
        r = pg.evaluate(PROBE)
        t = lang + " 854x698: "
        check(t + "handoff opens at the top", r["openedAtTop"])
        check(t + "summary card is never internally clipped", r["cardNotClipped"])
        check(t + "scene is the scroll surface when content exceeds height",
              (not r["needsScroll"]) or (r["sceneOverflow"] in ("auto", "scroll")
                                         and r["sceneMax"] > 0))
        check(t + "no hidden-overflow ancestor clips the last content",
              not r["hiddenAncestorClips"])
        check(t + "Options explored fully reachable", r["reachable"]["explored"])
        check(t + "explanatory sentence fully reachable", r["reachable"]["note"])
        check(t + "New customer fully reachable", r["reachable"]["newCustomer"])
        check(t + "language switch resets scroll", r["langSwitchResets"])
        check(t + "no horizontal overflow", r["noH"])
        ctx.close()
    b.close()

sys.exit(1 if failures else 0)
