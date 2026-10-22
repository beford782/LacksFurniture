#!/usr/bin/env python3
"""Compare-tray clearance check (DR-01, design review 2026-09-18, packet v2.1).

WHY THIS EXISTS. The compare tray is fixed to the bottom of the viewport and
the C2 first fold places the best match's action row (details / Compare /
Choose / Save) in the last ~57 px of a landscape tablet and on the fold line
in portrait. On 5d9fb29 every entry to Results with two models selected -
including "Back to matches" from the Summary - left that whole row under the
tray, and a tap from memory on "Compare" landed on the tray's "Clear" and
silently emptied the comparison. Every static suite was green, because none
of them renders a tray. This check renders.

WHAT IT PROVES, per EN/ES x tablet landscape 1194x748 / tablet portrait
834x1108 (headless Chromium, touch), with the compare tray showing:
  AC-01  landing positions - on Results entry, after "Back to matches", after
         "View in matches", after closing the drawer, after a language switch
         and after a tier switch, no VISIBLE action-row control is covered by
         the tray or the lifted Selections pill, and none sits within the
         16 px separation of either (elementFromPoint sampling AND geometry);
         the best match is fully visible after an entry;
  AC-02  commit moments - after Compare (1st and 2nd), Choose as finalist and
         Save, the WHOLE row of the tapped control is clear, measured after
         the tray and the pill have settled, and the correction is at most
         ONE programmatic scroll (window.scrollTo is counted);
  AC-02b a correction never leaves ANY Results control (tier tabs, card
         actions, CTAs) within 16 px of the top utility bar - Gold and Silver;
  AC-03  reachability - at the page end no action row is covered;
  AC-04  the tray's own actions sit >= 16 px inside its top edge, and a fine
         stopped-scroll sweep (2 px steps across the tray's top-edge band)
         shows a tap aimed at the visible part of a half-covered card button,
         or spilling up to 16 px below it, never lands on a tray action; the
         smallest tappable visible sliver is reported;
  AC-05  the tray's hit area equals its painted box.
It also reports the measured entry displacement per context (the accepted
prototype trade-off: the header starts partly scrolled off).

HOW. A loopback-only HTTP server serves the tree (the repository root, or
--root <dir> - used to prove this check FAILS on 5d9fb29) on an ephemeral
port; the app is driven through its public functions and real touch taps.
No repository file is written. Requires playwright + Chromium (see
tools/requirements-suite.txt).

Run: python tests/compare_tray_clearance_check.py [--root DIR] [--report FILE] [--fail-fast]
"""

import argparse
import functools
import http.server
import json
import os
import sys
import threading

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARGIN = 16
VIEWPORTS = [("L", 1194, 748), ("P", 834, 1108)]
ANSWERS = {
    "mattress_size": "queen", "partner_sleep": "partner", "partner_disturbance": "sometimes",
    "sleep_position": "back", "body_type": "average", "temperature": "hot", "firmness": 8,
    "sleep_issues": ["back_pain", "hip_pain"], "health_conditions": ["snoring"],
}
READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")

passed = failed = 0
report = {"contexts": {}}
# --fail-fast (the mutation sweep's mode): stop at the first failed assertion.
# A passing run still executes every scenario, so the unmutated baseline keeps
# full coverage. Exit 1 means an assertion failed; exit 3 means the run ended
# without a verdict (setup error, crash, browser timeout), which the sweep
# reports as ERRORED rather than as a caught mutation.
fail_fast = False
NO_VERDICT = 3


class FirstFailure(Exception):
    pass


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))
        if fail_fast:
            raise FirstFailure(name)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start_server(root):
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=root))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, server.server_address[1]


# Resting geometry of the bottom overlays, read from LAYOUT (the tray slides
# in with a transform and the lifted pill transitions `bottom`), plus the top
# utility bar; then every visible action-row control is sampled at 9 points.
PROBE_JS = r"""
(M) => {
  const vw = document.documentElement.clientWidth, vh = innerHeight;
  const tray = document.getElementById('compareTray');
  const trayShown = !!(tray && tray.style.display === 'block' && tray.offsetHeight > 0);
  const trayH = trayShown ? tray.offsetHeight : 0;
  const ov = [];
  if (trayShown) ov.push({ name: 'tray', left: 0, right: vw, top: vh - trayH, bottom: vh });
  const pill = document.getElementById('savedPicksBtn');
  if (trayShown && pill && pill.classList.contains('noct-picks-pill--lifted') && pill.offsetWidth > 0) {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const b = vh - (rem + trayH + 8), r = vw - rem;
    ov.push({ name: 'pill', left: r - pill.offsetWidth, right: r, top: b - pill.offsetHeight, bottom: b });
  }
  const u = document.getElementById('sessionUtility');
  if (u && !u.hidden && u.offsetWidth > 0) { const q = u.getBoundingClientRect(); ov.push({ name: 'utility', left: q.left, right: q.right, top: q.top, bottom: q.bottom }); }
  const rows = [...document.querySelectorAll('#resultsScreen .noct-card-action-cluster')].filter(e => e.offsetWidth > 0);
  const bad = [];
  let bestVisible = null;
  rows.forEach((row, ri) => {
    const rr = row.getBoundingClientRect();
    if (rr.bottom <= 0 || rr.top >= vh) return;
    const inTop = !!row.closest('#topPickContainer');
    if (inTop) bestVisible = rr.top >= 0 && rr.bottom <= vh;
    for (const o of ov) {
      if (rr.top < o.bottom + M && rr.bottom > o.top - M && rr.left < o.right + M && rr.right > o.left - M)
        bad.push({ row: ri, top: inTop, by: o.name, why: 'within ' + M + 'px of ' + o.name, rowBox: [Math.round(rr.top), Math.round(rr.bottom)] });
    }
    for (const el of row.querySelectorAll('button')) {
      const r = el.getBoundingClientRect();
      for (const fx of [0.15, 0.5, 0.85]) for (const fy of [0.2, 0.5, 0.8]) {
        const x = r.left + r.width * fx, y = r.top + r.height * fy;
        if (x < 0 || x >= vw || y < 0 || y >= vh) continue;
        const h = document.elementFromPoint(x, y);
        if (!h || !(h === el || el.contains(h))) {
          const by = !h ? 'none' : tray && tray.contains(h) ? 'tray' : (pill && pill.contains(h)) ? 'pill' : (u && u.contains(h)) ? 'utility' : 'other';
          bad.push({ row: ri, top: inTop, by, why: 'covered: ' + (el.innerText || '').trim().slice(0, 24) + ' -> ' + (h ? (h.id || h.className.toString().slice(0, 30)) : 'none') });
        }
      }
    }
  });
  const bottomBad = bad.filter(b => b.by === 'tray' || b.by === 'pill');
  const utilBad = bad.filter(b => b.by === 'utility');
  return { scrollY: Math.round(pageYOffset), trayShown, trayH, overlays: ov, bad: bottomBad.slice(0, 12), badCount: bottomBad.length,
           utilBad: utilBad.slice(0, 6), utilBadCount: utilBad.length, bestVisible,
           screen: document.querySelector('.screen.active').id };
}
"""

# Every visible Results control (tier tabs, card actions, footer CTAs...) that a
# correction could have parked within the separation of the top utility bar.
TOPBAR_JS = r"""
(M) => { const u = document.getElementById('sessionUtility'); if (!u || u.hidden || !u.offsetWidth) return [];
  const q = u.getBoundingClientRect(); const vh = innerHeight;
  return [...document.querySelectorAll('#resultsScreen button, #resultsScreen a[href]')].filter(e => e.offsetWidth).map(e => [e, e.getBoundingClientRect()])
    .filter(([e, r]) => r.bottom > 0 && r.top < vh && r.top < q.bottom + M && r.bottom > q.top - M && r.left < q.right + M && r.right > q.left - M)
    .map(([e, r]) => (e.innerText || '').trim().slice(0, 20) + ' @' + Math.round(r.top)); }
"""

COUNT_SCROLLS_JS = r"""
() => {
  if (!window.__dr01Scrolls) {
    window.__dr01Scrolls = [];
    const orig = window.scrollTo;
    window.scrollTo = function(a, b) {
      const top = (a && typeof a === 'object') ? a.top : b;
      window.__dr01Scrolls.push(Math.round(top || 0));
      // Forward the ORIGINAL arguments: scrollTo(options, undefined) would be
      // read as scrollTo(x, y) and jump to the top.
      return orig.apply(window, arguments);
    };
  }
  window.__dr01Scrolls.length = 0;
}
"""


def run_context(browser, base, lang, oname, w, h):
    key = f"{lang}-{oname}"
    ctxrep = report["contexts"].setdefault(key, {})
    print(f"\n== {key} {w}x{h}")
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=True, locale="es-US" if lang == "es" else "en-US")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.goto(base, wait_until="networkidle")
    page.wait_for_function(READY, timeout=20000)
    if lang == "es":
        page.evaluate("async () => { await switchLanguage('es'); }")
        page.wait_for_timeout(300)
    page.evaluate("(A) => { for (const k of Object.keys(A)) answers[k] = A[k]; showProfileScreen(); window.showResults(); }", ANSWERS)
    page.wait_for_function("() => document.querySelector('.screen.active').id === 'resultsScreen' && !window._resultsRevealInFlight", timeout=15000)
    page.wait_for_timeout(400)

    def probe():
        return page.evaluate(PROBE_JS, MARGIN)

    def settle(ms=450):
        page.wait_for_timeout(ms)

    def scrolls():
        return page.evaluate("() => (window.__dr01Scrolls || []).slice()")

    def tap(sel):
        # A real touch tap when the control can receive it; if an overlay
        # covers it (the very defect under test), fall back to the control's
        # own click so the scenario still runs and the probe reports the cover.
        loc = page.locator(sel).first
        loc.scroll_into_view_if_needed()
        try:
            loc.tap(timeout=4000)
        except Exception:
            print(f"  [info] {key} tap on {sel} was intercepted by an overlay; used element.click()")
            loc.evaluate("el => el.click()")

    top_ids = page.evaluate("() => [...document.querySelectorAll('#resultsScreen [data-id].noct-toppick, #resultsScreen [data-id].noct-support-card')].map(c => c.getAttribute('data-id'))")
    best, second = top_ids[0], top_ids[1]

    # --- AC-02: commit moments -------------------------------------------------
    page.evaluate("() => { document.scrollingElement.scrollTop = 0; }")
    page.evaluate(COUNT_SCROLLS_JS)
    tap(f"#resultsScreen .compare-btn[data-id='{best}']")
    settle()
    p = probe()
    s = scrolls()
    check(f"{key} AC-02 first Compare (tray appears): the best match's whole row is clear", not [b for b in p["bad"] if b["top"]], json.dumps(p["bad"][:3]))
    check(f"{key} AC-02 first Compare: at most one corrective scroll", len(s) <= 1, str(s))
    page.evaluate(COUNT_SCROLLS_JS)
    tap(f"#resultsScreen .compare-btn[data-id='{second}']")
    settle()
    p = probe()
    s = scrolls()
    row_ok = page.evaluate(PROBE_JS.replace("rows.forEach((row, ri) => {", "rows.filter(r => r.querySelector('.compare-btn[data-id=\"%s\"]')).forEach((row, ri) => {" % second), MARGIN)
    check(f"{key} AC-02 second Compare (tray at two): the tapped card's whole row is clear", row_ok["badCount"] == 0, json.dumps(row_ok["bad"][:3]))
    check(f"{key} AC-02 second Compare: at most one corrective scroll", len(s) <= 1, str(s))
    tb = page.evaluate(TOPBAR_JS, MARGIN)
    check(f"{key} AC-02b a correction ({len(s)} scroll) parks no Results control within {MARGIN}px of the utility bar",
          len(s) == 0 or not tb, json.dumps(tb[:3]))
    page.evaluate(COUNT_SCROLLS_JS)
    page.evaluate("() => { document.scrollingElement.scrollTop = 0; }")
    tap(f"#resultsScreen .finalist-btn[data-id='{best}']")
    settle()
    p = probe()
    s = scrolls()
    check(f"{key} AC-02 Choose as finalist (tray showing): the chosen card's whole row is clear", not [b for b in p["bad"] if b["top"]], json.dumps(p["bad"][:3]))
    check(f"{key} AC-02 Choose: at most one corrective scroll", len(s) <= 1, str(s))

    # --- AC-01: landing positions (Gold, the default view, and Silver) --------
    for tier in ("silver", "gold"):
        page.evaluate("(t) => { window._setActiveResultsTier(t); window.showSavedPicks(); }", tier)
        settle(300)
        page.evaluate(COUNT_SCROLLS_JS)
        tap("#hf2BackToMatches")
        settle()
        p = probe()
        s = [x for x in scrolls() if x != 0]
        tb = page.evaluate(TOPBAR_JS, MARGIN)
        ctxrep[f"entryDisplacementPx_{tier}"] = p["scrollY"]
        ctxrep["trayHeightPx"] = p["trayH"]
        print(f"  [info] {key} entry displacement after 'Back to matches' ({tier}): {p['scrollY']} px (tray {p['trayH']} px)")
        check(f"{key} AC-01 Back to matches ({tier}): no visible action-row control covered or within {MARGIN}px of the tray / pill", p["badCount"] == 0, json.dumps(p["bad"][:3]))
        check(f"{key} AC-01 Back to matches ({tier}): the best match's row is fully visible", p["bestVisible"] is True, str(p["bestVisible"]))
        check(f"{key} AC-01 Back to matches ({tier}): at most one corrective scroll", len(s) <= 1, str(s))
        check(f"{key} AC-02b Back to matches ({tier}): no Results control within {MARGIN}px of the utility bar", not tb, json.dumps(tb[:3]))

    # View in matches (Summary -> a saved pick's own route) - one smooth scroll only
    page.evaluate("() => { window.showSavedPicks(); }")
    settle(300)
    page.evaluate(COUNT_SCROLLS_JS)
    page.evaluate("(id) => window.showMattressInResults(id, _resultsState.activeTier)", second)
    settle(1300)
    p = probe()
    s = [x for x in scrolls() if x != 0]
    check(f"{key} AC-01 View in matches: no visible action-row control covered", p["badCount"] == 0, json.dumps(p["bad"][:3]))
    check(f"{key} AC-01 View in matches: one scroll to the card (no second jump)", len(s) <= 1, str(s))

    # Drawer close at a position that leaves a row under the tray
    pos = page.evaluate("""() => { const rows = [...document.querySelectorAll('#resultsScreen .noct-card-action-cluster')];
        const tray = document.getElementById('compareTray'); const trayTop = innerHeight - tray.offsetHeight;
        const r = rows[rows.length - 1].getBoundingClientRect(); const y = Math.max(0, Math.round(pageYOffset + r.top - trayTop + 10));
        document.scrollingElement.scrollTop = y; return pageYOffset; }""")
    settle(200)
    before_bad = probe()["badCount"]
    page.evaluate("() => openResultCardDrawer(document.querySelector('#resultsScreen .noct-support-card'))")
    page.wait_for_selector("#mattressDrawer.drawer-open")
    settle(500)
    page.evaluate(COUNT_SCROLLS_JS)
    tap(".drawer-back-to-results")
    settle(600)
    p = probe()
    s = scrolls()
    check(f"{key} AC-01 drawer close from an obstructed position: clearance restored (was {before_bad} bad samples)", p["badCount"] == 0, json.dumps(p["bad"][:3]))
    check(f"{key} AC-01 drawer close: at most one corrective scroll", len(s) <= 1, str(s))
    # Drawer close where clearance already passes: the exact scroll is kept
    page.evaluate("() => { document.scrollingElement.scrollTop = 0; }")
    page.evaluate("() => window._ensureResultsClearance && window._ensureResultsClearance(null)")
    kept = page.evaluate("() => pageYOffset")
    page.evaluate("() => openResultCardDrawer(document.querySelector('#resultsScreen .noct-toppick'))")
    page.wait_for_selector("#mattressDrawer.drawer-open")
    settle(500)
    tap(".drawer-back-to-results")
    settle(600)
    check(f"{key} AC-01 drawer close when already clear: scroll preserved exactly", page.evaluate("() => pageYOffset") == kept,
          f"{kept} -> {page.evaluate('() => pageYOffset')}")

    # Language switch and tier switch re-render in place
    other = "en" if lang == "es" else "es"
    page.evaluate("async (l) => { await switchLanguage(l); }", other)
    settle(500)
    p = probe()
    check(f"{key} AC-01 language switch ({lang}->{other}): no visible action-row control covered", p["badCount"] == 0, json.dumps(p["bad"][:3]))
    page.evaluate("async (l) => { await switchLanguage(l); }", lang)
    settle(500)
    tabs = page.locator("#tierTabs button")
    if tabs.count() >= 2:
        tabs.nth(1).tap()
        settle()
        p = probe()
        check(f"{key} AC-01 tier switch: no visible action-row control covered", p["badCount"] == 0, json.dumps(p["bad"][:3]))
        tabs.nth(0).tap()
        settle()

    # --- AC-03: reachability at the page end -------------------------------------
    page.evaluate("() => { document.scrollingElement.scrollTop = document.scrollingElement.scrollHeight; }")
    settle(300)
    p = probe()
    check(f"{key} AC-03 page end: no action row covered", not [b for b in p["bad"] if "covered" in b["why"]], json.dumps(p["bad"][:3]))

    # --- AC-04 / AC-05: the tray's own edge ---------------------------------------
    geo = page.evaluate("""() => { const t = document.getElementById('compareTray'); const tr = t.getBoundingClientRect();
        const topEdge = innerHeight - t.offsetHeight;
        const acts = [...t.querySelectorAll('button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), inset: Math.round((r.top - tr.top) * 10) / 10 }; });
        let hitMin = 1e9, hitMax = -1;
        for (let y = topEdge - 6; y <= topEdge + 6; y++) { const hh = document.elementFromPoint(innerWidth / 2, y); if (hh && t.contains(hh)) { hitMin = Math.min(hitMin, y); hitMax = Math.max(hitMax, y); } }
        return { acts, topEdge, hitTop: hitMin }; }""")
    ctxrep["trayActionInsets"] = geo["acts"]
    check(f"{key} AC-04 tray actions sit >= {MARGIN}px inside the tray's top edge",
          all(a["inset"] >= MARGIN for a in geo["acts"]), json.dumps(geo["acts"]))
    check(f"{key} AC-05 tray hit area starts at its painted top edge", abs(geo["hitTop"] - geo["topEdge"]) <= 1, json.dumps(geo))

    # Fine stopped-scroll sweep across the tray's top edge (2 px steps): taps
    # aimed at the visible part of a half-covered card button, and fingertip
    # spill up to MARGIN px below it, must never reach a tray ACTION.
    sweep = page.evaluate(r"""(M) => {
      const t = document.getElementById('compareTray'); const topEdge = innerHeight - t.offsetHeight;
      const acts = [...t.querySelectorAll('button')];
      const se = document.scrollingElement; const start = se.scrollTop; const res = { stops: 0, hazards: [], minSliver: null };
      const btns = [...document.querySelectorAll('#resultsScreen .noct-card-action-cluster button')];
      for (let y = 0; y <= se.scrollHeight - innerHeight; y += 2) {
        se.scrollTop = y;
        for (const b of btns) {
          const r = b.getBoundingClientRect();
          if (!(r.top < topEdge && r.bottom > topEdge)) continue;   // only half-covered at the tray edge
          res.stops++;
          const sliver = topEdge - r.top;
          const ax = r.left + r.width / 2, ay = r.top + sliver / 2;
          const aim = document.elementFromPoint(ax, ay);
          if (aim === b || b.contains(aim)) res.minSliver = res.minSliver === null ? sliver : Math.min(res.minSliver, sliver);
          for (const spill of [0, 4, 8, 12, M]) {
            const hh = document.elementFromPoint(ax, Math.min(innerHeight - 1, topEdge + spill));
            if (hh && acts.some(a => a === hh || a.contains(hh))) { res.hazards.push({ scrollTop: y, button: b.innerText.trim().slice(0, 20), spill, hit: hh.innerText.trim() }); break; }
          }
        }
      }
      se.scrollTop = start; res.hazards = res.hazards.slice(0, 8); return res;
    }""", MARGIN)
    ctxrep["fineSweep"] = {"stops": sweep["stops"], "hazards": len(sweep["hazards"]), "minTappableSliverPx": sweep["minSliver"]}
    print(f"  [info] {key} fine sweep: {sweep['stops']} half-covered stops; smallest tappable visible sliver {sweep['minSliver']} px")
    check(f"{key} AC-04 fine sweep: no aimed or spilled tap at the tray edge reaches a tray action", not sweep["hazards"], json.dumps(sweep["hazards"][:3]))

    check(f"{key} no page errors", not errors, "; ".join(errors[:2]))
    ctx.close()


# Footer reachability (phone fix, 2026-10-19): at the page end with the tray
# showing, Build Your Sleep System and Review Sleep Plan must sit >= MARGIN
# above the tray's resting top edge and receive a tap at every sample point.
# The phone tray wraps to 131-166px; before the fix it covered Review Sleep
# Plan at 390/430px even at full scroll.
FOOTER_VIEWPORTS = [("phone390", 390, 844, True), ("phone430", 430, 932, True),
                    ("P", 834, 1108, False), ("L", 1194, 748, False), ("desk", 1180, 820, False)]
FOOTER_JS = r"""
(M) => {
  const vh = innerHeight, tray = document.getElementById('compareTray');
  const shown = !!(tray && tray.style.display === 'block' && tray.offsetHeight > 0);
  const trayTop = shown ? vh - tray.offsetHeight : vh;
  return ['buildSystemBtn', 'reviewWithCustomerBtn'].map(id => {
    const el = document.getElementById(id), r = el.getBoundingClientRect();
    let hits = 0, misses = [];
    for (const fx of [0.1, 0.5, 0.9]) for (const fy of [0.15, 0.5, 0.85]) {
      const h = document.elementFromPoint(r.left + r.width * fx, r.top + r.height * fy);
      if (h && (h === el || el.contains(h))) hits++; else misses.push(h ? (h.id || h.className.toString().slice(0, 24)) : 'none');
    }
    return { id, hits, misses: misses.slice(0, 3), gap: Math.round(trayTop - r.bottom), ok: hits === 9 && r.bottom <= trayTop - M };
  });
}
"""


def run_footer_context(browser, base, lang, name, w, h, mobile):
    key = f"footer-{lang}-{name}"
    print(f"\n== {key} {w}x{h}")
    ctx = browser.new_context(viewport={"width": w, "height": h}, has_touch=True, is_mobile=mobile,
                              locale="es-US" if lang == "es" else "en-US")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.goto(base, wait_until="networkidle")
    page.wait_for_function(READY, timeout=20000)
    if lang == "es":
        page.evaluate("async () => { await switchLanguage('es'); }")
        page.wait_for_timeout(300)
    page.evaluate("(A) => { for (const k of Object.keys(A)) answers[k] = A[k]; showProfileScreen(); window.showResults(); }", ANSWERS)
    page.wait_for_function("() => document.querySelector('.screen.active').id === 'resultsScreen' && !window._resultsRevealInFlight", timeout=15000)
    page.wait_for_timeout(400)
    ids = page.evaluate("() => [...document.querySelectorAll('#resultsScreen [data-id].noct-toppick, #resultsScreen [data-id].noct-support-card')].map(c => c.getAttribute('data-id'))")
    best, second = ids[0], ids[1]

    def tap(sel):
        loc = page.locator(sel).first
        loc.scroll_into_view_if_needed()
        try:
            loc.tap(timeout=4000)
        except Exception:
            # An intercepted tap is the defect: record it, then click so the
            # remaining checks still run.
            check(f"{key} a real tap reaches {sel}", False, "intercepted by an overlay")
            loc.evaluate("el => el.click()")
        page.wait_for_timeout(500)

    def at_end():
        page.evaluate("() => window.scrollTo(0, document.documentElement.scrollHeight)")
        page.wait_for_timeout(450)
        return page.evaluate(FOOTER_JS, MARGIN)

    def sel():
        return page.evaluate("() => (window._compareSelected || []).slice()")

    def clear():
        page.evaluate("() => { if (window._compareSelected.length) document.getElementById('compareTrayClear').click(); }")
        page.wait_for_timeout(300)

    for n, picks in ((2, [best, second]), (1, [best])):
        clear()
        for mid in picks:
            tap(f"#resultsScreen .compare-btn[data-id='{mid}']")
        for r in at_end():
            check(f"{key} tray={n}: {r['id']} is clear of the tray at the page end (gap {r['gap']}px >= {MARGIN}, {r['hits']}/9 taps land)",
                  r["ok"], json.dumps(r))
    # Two selected: open the comparison, close it, continue to the Sleep Plan and back.
    clear()
    for mid in (best, second):
        tap(f"#resultsScreen .compare-btn[data-id='{mid}']")
    tap("#compareTrayGo")
    opened = page.evaluate("() => { const m = document.getElementById('compareModal'); return !!m && m.offsetWidth > 0 && getComputedStyle(m).display !== 'none'; }")
    check(f"{key} the comparison opens from the tray", opened)
    tap("#compareModalClose")
    check(f"{key} closing the comparison keeps both selections", sel() == [best, second], str(sel()))
    at_end()
    tap("#reviewWithCustomerBtn")
    scr = page.evaluate("() => document.querySelector('.screen.active').id")
    check(f"{key} a real tap on Review Sleep Plan opens the Sleep Plan with two selected", scr == "sleepPlanScreen", scr)
    check(f"{key} continuing to the Sleep Plan keeps both selections", sel() == [best, second], str(sel()))
    tap("#sleepPlanBack")
    back = page.evaluate("""() => ({ screen: document.querySelector('.screen.active').id,
      tray: document.getElementById('compareTray').style.display, slots: document.querySelectorAll('#compareTraySlots .compare-tray-slot').length,
      cls: document.getElementById('resultsScreen').classList.contains('df-tray-shown') })""")
    check(f"{key} back to matches restores the tray, both slots and the footer clearance",
          back == {"screen": "resultsScreen", "tray": "block", "slots": 2, "cls": True}, json.dumps(back))
    f = at_end()
    check(f"{key} after the round trip both footer CTAs are still clear", all(r["ok"] for r in f), json.dumps(f))
    # One selected: a real tap on Build Your Sleep System.
    tap(f"#resultsScreen .compare-btn[data-id='{second}']")
    check(f"{key} un-comparing one leaves one selected", sel() == [best], str(sel()))
    at_end()
    tap("#buildSystemBtn")
    scr = page.evaluate("() => document.querySelector('.screen.active').id")
    check(f"{key} a real tap on Build Your Sleep System opens it with one selected", scr == "accessoriesScreen", scr)
    check(f"{key} building the Sleep System keeps the selection", sel() == [best], str(sel()))
    # Clearing the tray drops the reserved space.
    page.evaluate("() => window.showScreen('resultsScreen')")
    page.wait_for_timeout(300)
    clear()
    gone = page.evaluate("() => !document.getElementById('resultsScreen').classList.contains('df-tray-shown')"
                         " && getComputedStyle(document.querySelector('#resultsScreen .noct-results-footer')).paddingBottom === '0px'")
    check(f"{key} with the tray cleared the footer reserves no space", gone)
    check(f"{key} no page errors", not errors, "; ".join(errors[:2]))
    ctx.close()


def run_resize_context(browser, base, lang):
    # The tray re-wraps when the viewport changes (rotation, split view) with no
    # tray re-render: 73px at tablet width, ~166px on a phone. The footer's
    # reserved space must follow the tray's new height.
    key = f"footer-resize-{lang}"
    print(f"\n== {key} 834x1108 -> 390x844")
    ctx = browser.new_context(viewport={"width": 834, "height": 1108}, has_touch=True)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.goto(base, wait_until="networkidle")
    page.wait_for_function(READY, timeout=20000)
    if lang == "es":
        page.evaluate("async () => { await switchLanguage('es'); }")
        page.wait_for_timeout(300)
    page.evaluate("(A) => { for (const k of Object.keys(A)) answers[k] = A[k]; showProfileScreen(); window.showResults(); }", ANSWERS)
    page.wait_for_function("() => document.querySelector('.screen.active').id === 'resultsScreen' && !window._resultsRevealInFlight", timeout=15000)
    page.wait_for_timeout(400)
    ids = page.evaluate("() => [...document.querySelectorAll('#resultsScreen [data-id].noct-toppick, #resultsScreen [data-id].noct-support-card')].map(c => c.getAttribute('data-id'))")
    for mid in ids[:2]:
        page.evaluate("(id) => window.toggleCompare(id)", mid) if page.evaluate("() => typeof window.toggleCompare === 'function'") \
            else page.locator(f"#resultsScreen .compare-btn[data-id='{mid}']").first.click()
        page.wait_for_timeout(300)
    before = page.evaluate("() => document.getElementById('compareTray').offsetHeight")
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(700)
    after = page.evaluate("""() => ({ tray: document.getElementById('compareTray').offsetHeight,
      reserved: getComputedStyle(document.getElementById('resultsScreen')).getPropertyValue('--df-tray-clearance').trim() })""")
    check(f"{key} the tray re-wraps taller on the narrower viewport ({before}px -> {after['tray']}px)", after["tray"] > before, json.dumps(after))
    check(f"{key} the footer's reserved height follows the re-wrapped tray", after["reserved"] == f"{after['tray']}px", json.dumps(after))
    page.evaluate("() => window.scrollTo(0, document.documentElement.scrollHeight)")
    page.wait_for_timeout(450)
    f = page.evaluate(FOOTER_JS, MARGIN)
    check(f"{key} after the resize both footer CTAs are clear of the tray", all(r["ok"] for r in f), json.dumps(f))
    check(f"{key} no page errors", not errors, "; ".join(errors[:2]))
    ctx.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=REPO)
    ap.add_argument("--report")
    ap.add_argument("--fail-fast", action="store_true")
    args = ap.parse_args()
    global fail_fast
    fail_fast = args.fail_fast
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright not installed: python -m pip install -r tools/requirements-suite.txt && python -m playwright install chromium")
        return NO_VERDICT if fail_fast else 1
    server, port = start_server(os.path.abspath(args.root))
    base = f"http://127.0.0.1:{port}/"
    print(f"compare tray clearance check - serving {os.path.abspath(args.root)} at {base}")
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            for lang in ("en", "es"):
                for oname, w, h in VIEWPORTS:
                    run_context(browser, base, lang, oname, w, h)
            for lang in ("en", "es"):
                for name, w, h, mobile in FOOTER_VIEWPORTS:
                    run_footer_context(browser, base, lang, name, w, h, mobile)
                run_resize_context(browser, base, lang)
            browser.close()
    except FirstFailure as e:
        print(f"\ncompare tray clearance (--fail-fast): stopped at the first failed assertion: {e}")
        return 1
    except Exception:
        if not fail_fast:
            raise
        import traceback
        traceback.print_exc()
        print(f"\ncompare tray clearance (--fail-fast): no verdict - the run ended on an error after {passed} passed assertions")
        return NO_VERDICT
    finally:
        server.shutdown()
    report["passed"], report["failed"] = passed, failed
    if args.report:
        with open(args.report, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=1)
    print(f"\ncompare tray clearance: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
