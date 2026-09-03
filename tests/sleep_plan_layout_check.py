#!/usr/bin/env python3
"""Sleep Plan rendered-layout check (hotfix, 2026-08-23).

WHY THIS EXISTS. The Sleep Plan screen (#sleepPlanScreen, Slice 5) shipped
with NO CSS rule of its own. `.screen.active { display: flex }` therefore
applied with the flex-ROW default and the dark root theme: on the deployed
preview the Plan rendered as nine side-by-side columns, its financing headline
was dark-on-dark, and at tablet portrait the financing block and the Continue
control sat outside the viewport. Every static suite was green, because none
of them renders. This check renders.

WHAT IT PROVES, per viewport (tablet landscape 1194x748, tablet portrait
834x1108, a narrow supported viewport 390x844, and 597x374 — the mounted
landscape device at 200% zoom):
  * the active Plan lays out as a COLUMN (computed flex-direction), every
    direct child spans the screen's content width, and the children stack
    top-to-bottom in DOM order;
  * nothing overflows horizontally (document scrollWidth == clientWidth; every
    direct child's box lies inside the viewport width);
  * the Plan shares the warm work theme the Consultation Summary uses (same
    body background), and the title, the Payment Choice headline and the
    Continue control's label are readable: >= 4.5:1 against the surface
    behind them (WCAG 1.4.3 floor);
  * the Continue control is displayed, inside the page, and REACHABLE BY
    KEYBOARD from the focused heading with a bounded number of Tab presses.

HOW. A loopback-only HTTP server serves the repository root on an ephemeral
port (the domain lock accepts 127.0.0.1); headless Chromium loads the app and
reaches the Plan through the app's own public functions (answers -> Sleep
Brief -> Results -> showSleepPlan('results')). No repository file is written.
Requires the `playwright` package with Chromium installed
(`python -m pip install playwright && python -m playwright install chromium`).

Slice 6 extends the same run with a CONSULTATION SUMMARY pass (the redesign
would otherwise ship with zero rendered verification - the exact blind spot
that produced this file): per viewport, with a chosen finalist and a saved
pick, the Summary must lay out as a column with no horizontal overflow, the
lead line must speak the finalist and payment state legibly, and the send
button must be reachable. A final forced-colors pass (Chromium forced-colors
emulation) proves no probed Summary/Plan text renders invisible.

Run: python tests/sleep_plan_layout_check.py
     python tests/sleep_plan_layout_check.py --screenshots <dir>   # also save PNGs
"""

import argparse
import functools
import http.server
import os
import re
import sys
import threading

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VIEWPORTS = [
    ("tablet-landscape", 1194, 748),   # confirmed mounted iPad Pro 11" landscape
    ("tablet-portrait", 834, 1108),    # confirmed mounted iPad Pro 11" portrait
    ("narrow", 390, 844),              # narrow supported viewport (the trust gate's measurement width)
    ("landscape-200pct", 597, 374),    # the mounted landscape device at 200% zoom (WCAG 1.4.10 reflow)
]

# A complete answer set: partner path, hot sleeper, snoring -> the engine
# produces three priorities, so the Plan renders every block including the
# priorities list and the Sleep System items.
ANSWERS = {
    "trigger": "pain", "sleep_position": "side", "sleep_issues": ["back_pain"],
    "health_conditions": ["snoring"], "temperature": "hot", "firmness": 5,
    "partner_sleep": "partner", "partner_disturbance": "sometimes",
    "body_type": "average", "mattress_size": "queen",
}

MAX_TABS = 80
MIN_CONTRAST = 4.5

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):  # keep the check output readable
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def start_server():
    handler = functools.partial(QuietHandler, directory=REPO)
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server, server.server_address[1]


def _channel(v):
    v = v / 255.0
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4


def _luminance(rgb):
    r, g, b = rgb
    return 0.2126 * _channel(r) + 0.7152 * _channel(g) + 0.0722 * _channel(b)


def contrast(fg, bg):
    l1, l2 = _luminance(fg), _luminance(bg)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


_RGB = re.compile(r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)")
# Chromium serialises a translucent computed background in the modern form,
# e.g. "color(srgb 0.10 0.12 0.15 / 0.92)"; channels are 0..1 there.
_SRGB = re.compile(r"color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:/\s*([\d.]+))?\s*\)")


def parse_rgba(s):
    """-> ((r, g, b), alpha) in 0..255 / 0..1, or None when unparseable."""
    m = _RGB.match(s or "")
    if m:
        alpha = float(m.group(4)) if m.group(4) is not None else 1.0
        return (int(m.group(1)), int(m.group(2)), int(m.group(3))), alpha
    m = _SRGB.match(s or "")
    if m:
        alpha = float(m.group(4)) if m.group(4) is not None else 1.0
        return tuple(int(round(float(m.group(i)) * 255)) for i in (1, 2, 3)), alpha
    return None


def composite(layers):
    """Paint `layers` (nearest first) over each other, nearest on top; the
    last layer is treated as opaque. Returns an opaque (r, g, b) or None."""
    parsed = [parse_rgba(x) for x in layers]
    parsed = [p for p in parsed if p is not None]
    if not parsed:
        return None
    rgb = parsed[-1][0]
    for (top, a) in reversed(parsed[:-1]):
        rgb = tuple(int(round(a * t + (1 - a) * b)) for t, b in zip(top, rgb))
    return rgb


def parse_rgb(s):
    p = parse_rgba(s)
    return p[0] if p and p[1] > 0 else None


PROBE_JS = r"""
(ANS) => {
  const out = {};
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();                 // producer: stores analytics.trialFocus
  window.showResults();                // engine: _resultsState
  window.showSleepPlan('results');     // renders, then showScreen('sleepPlanScreen')
  const s = document.getElementById('sleepPlanScreen');
  const cs = getComputedStyle(s);
  const sb = s.getBoundingClientRect();
  const doc = document.documentElement;
  const bgOf = (el) => {
    // Every painted background behind the element, nearest first, ending at
    // the body: translucent layers are composited by the Python side so the
    // contrast is measured the way the eye sees it.
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') layers.push(c);
    }
    layers.push(getComputedStyle(document.body).backgroundColor);
    return layers;
  };
  const title = document.getElementById('sleepPlanTitle');
  const finHead = document.getElementById('sleepPlanFinancingHeadline');
  const cont = document.getElementById('sleepPlanContinue');
  const cb = cont.getBoundingClientRect();
  out.active = s.classList.contains('active');
  out.display = cs.display;
  out.flexDirection = cs.flexDirection;
  out.screenBox = { x: sb.x, y: sb.y, w: sb.width, h: sb.height };
  out.bodyBg = getComputedStyle(document.body).backgroundColor;
  out.hf2ThemeProbe = (function () {
    // The Summary's theme, read the same way, for the parity assertion.
    window.showSavedPicks();
    const bg = getComputedStyle(document.body).backgroundColor;
    window.showSleepPlan('results');
    return bg;
  })();
  out.children = Array.from(s.children).map((c) => {
    const r = c.getBoundingClientRect();
    return { id: c.id || c.className, x: r.x, y: r.y, w: r.width, h: r.height, display: getComputedStyle(c).display };
  });
  out.scrollWidth = doc.scrollWidth; out.clientWidth = doc.clientWidth;
  // `lines` counts the title's line fragments (one text node -> one rect per
  // line) and `overflows` its clipped width: together they are the "not
  // squeezed into a sliver" guard. The box width alone stopped being that
  // guard with cohesion C4 — a focused heading now shrinks its box to its
  // text on purpose.
  out.title = { text: title.textContent, color: getComputedStyle(title).color, bg: bgOf(title), w: title.getBoundingClientRect().width,
                lines: (() => { const rg = document.createRange(); rg.selectNodeContents(title); return rg.getClientRects().length; })(),
                overflows: title.scrollWidth > title.clientWidth + 1 };
  out.finHead = { text: finHead.textContent, color: getComputedStyle(finHead).color, bg: bgOf(finHead), hidden: finHead.closest('[hidden]') !== null };
  out.continue = { text: cont.textContent, hidden: cont.hidden, display: getComputedStyle(cont).display,
                   x: cb.x, y: cb.y, w: cb.width, h: cb.height, docHeight: doc.scrollHeight,
                   color: getComputedStyle(cont).color, bg: bgOf(cont) };
  out.activeElement = document.activeElement ? (document.activeElement.id || document.activeElement.tagName) : null;
  out.pageErrors = (window.__pageErrors || []);
  return out;
}
"""


SUMMARY_JS = r"""
(ANS) => {
  const out = {};
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();
  window.showResults();
  // Real interactions: choose the engine's top pick as the finalist (this
  // auto-saves it), then open the Summary through the chokepoint.
  const top = _resultsState.tierData.gold[0];
  (function(__id) { window.chooseFinalist(__id); })(top.id);
  window.showSavedPicks();
  const s = document.getElementById('hf2Screen');
  const cs = getComputedStyle(s);
  const doc = document.documentElement;
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent') layers.push(c);
    }
    layers.push(getComputedStyle(document.body).backgroundColor);
    return layers;
  };
  const lead = document.getElementById('hf2LeadLine');
  const title = document.getElementById('hf2ReviewTitle');
  const tier = document.querySelector('.hf2-pick__tier');
  const send = document.getElementById('hf2SendBtn');
  const sb = send.getBoundingClientRect();
  out.flexDirection = cs.flexDirection;
  out.scrollWidth = doc.scrollWidth; out.clientWidth = doc.clientWidth;
  out.activeElement = document.activeElement ? document.activeElement.id : null;
  out.title = title.textContent;
  out.lead = { text: (lead.textContent + ' ' + ((document.getElementById('hf2StatusName') || {}).textContent || '')).trim(), color: getComputedStyle(lead).color, bg: bgOf(lead) };
  out.tier = tier ? { text: tier.textContent, color: getComputedStyle(tier).color, bg: bgOf(tier) } : null;
  out.send = { text: send.textContent, x: sb.x, w: sb.width, color: getComputedStyle(send).color, bg: bgOf(send) };
  out.attribution = document.getElementById('hf2Attribution').textContent;
  out.picks = document.querySelectorAll('#hf2PicksList .hf2-pick').length;
  return out;
}
"""


COMPARE_LABEL_JS = r"""
async (ARGS) => {
  const out = {};
  const ANS = ARGS.answers;
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();
  window.showResults();
  const gold = _resultsState.tierData.gold;
  if (ARGS.mode === "saved") {
    // Two SAVED picks, no persisted comparison pair.
    window._toggleSavePick(gold[0].id);
    window._toggleSavePick(gold[1].id);
  } else {
    // The honesty case: a complete comparison pair chosen from cards the
    // customer never saved, with zero saved picks.
    window.toggleCompare(gold[1].id);
    window.toggleCompare(gold[2].id);
  }
  // switchLanguage is async (it fetches the dictionary): AWAIT it, or the
  // probe reads the outgoing language and reports a false result.
  if (ARGS.lang === "es") await switchLanguage("es");
  window.showSavedPicks();
  const btn = document.getElementById("hf2CompareBtn");
  const cs = getComputedStyle(btn);
  const r = btn.getBoundingClientRect();
  out.label = btn.textContent;
  out.disabled = btn.disabled;
  out.visible = cs.display !== "none" && cs.visibility !== "hidden" && r.width > 0 && r.height > 0;
  out.inPage = r.x >= 0 && r.x + r.width <= window.innerWidth + 1;
  out.savedCount = (window._savedPicks || []).length;
  out.pair = (window._compareSelected || []).slice();
  out.cards = document.querySelectorAll("#hf2PicksList .hf2-pick").length;
  out.bodyHasRetired = document.body.innerText.indexOf("Compare saved picks") !== -1
    || document.body.innerText.indexOf("Comparar selecciones guardadas") !== -1;
  return out;
}
"""

COMPARE_LABELS = {"en": "Compare mattresses", "es": "Comparar colchones"}


def run_compare_label(browser, port, shots_dir):
    """The Summary compare control must read honestly in EVERY state its
    enable rule admits - including a persisted pair of mattresses the
    customer never saved (roadmap item 1.6's outstanding exit clause)."""
    for lang in ("en", "es"):
        for mode, desc in (("saved", "two saved picks"),
                           ("unsaved-pair", "a persisted pair from UNSAVED cards, zero saved picks")):
            print(f"\n-- COMPARE LABEL [{lang}] {desc} --")
            page = browser.new_page(viewport={"width": 1194, "height": 748})
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
            page.wait_for_selector("#startBtn")
            r = page.evaluate(COMPARE_LABEL_JS, {"answers": ANSWERS, "mode": mode, "lang": lang})
            if shots_dir:
                os.makedirs(shots_dir, exist_ok=True)
                page.screenshot(path=os.path.join(shots_dir, f"compare-label-{lang}-{mode}.png"))
            want = COMPARE_LABELS[lang]
            check(f"[{lang}/{mode}] no page error and the control is visibly rendered inside the page",
                  not errors and r["visible"] and r["inPage"], str(errors)[:120])
            check(f"[{lang}/{mode}] the rendered label reads '{want}'",
                  r["label"].strip() == want, f"got {r['label']!r}")
            check(f"[{lang}/{mode}] the control is ENABLED in this state (enable rule unchanged)",
                  r["disabled"] is False)
            check(f"[{lang}/{mode}] no retired 'saved picks' compare wording is visible anywhere on the Summary",
                  not r["bodyHasRetired"])
            if mode == "saved":
                check(f"[{lang}/{mode}] the state is what it claims: two saved picks rendered, no persisted pair",
                      r["savedCount"] == 2 and r["cards"] == 2 and len(r["pair"]) == 0,
                      f"saved={r['savedCount']} cards={r['cards']} pair={r['pair']}")
            else:
                check(f"[{lang}/{mode}] the state is what it claims: ZERO saved picks and a complete persisted pair",
                      r["savedCount"] == 0 and r["cards"] == 0 and len(r["pair"]) == 2,
                      f"saved={r['savedCount']} cards={r['cards']} pair={r['pair']}")
            page.close()


def run_summary(browser, port, name, width, height, shots_dir):
    print(f"\n-- SUMMARY {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(SUMMARY_JS, ANSWERS)
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"summary-{name}-{width}x{height}.png"))
    check("the Summary renders without a page error and focuses its title", not errors and r["activeElement"] == "hf2ReviewTitle")
    check("the Summary is a flex COLUMN with no horizontal document scroll",
          r["flexDirection"] == "column" and r["scrollWidth"] <= r["clientWidth"],
          f"flex={r['flexDirection']} scrollW={r['scrollWidth']}/{r['clientWidth']}")
    # A3.1 (owner directive 2026-09-01): the shared close is titled "Consultation summary".
    check("the visible title is the Consultation summary", "Consultation summary" in r["title"])
    # C3-A2 (owner ruling 2026-09-01): the chosen state is the approved split -
    # finalist.chosen as the eyebrow in the lead line and the product name in the
    # serif display node; the probe reads both together.
    check("the chosen finalist appears in the status block with the finalist vocabulary (eyebrow + display name)",
          "Finalist" in r["lead"]["text"] and len(r["lead"]["text"]) > 20, r["lead"]["text"][:80])
    l_fg, l_bg = parse_rgb(r["lead"]["color"]), composite(r["lead"]["bg"])
    l_ratio = contrast(l_fg, l_bg) if l_fg and l_bg else 0
    check(f"the lead line is readable (>= {MIN_CONTRAST}:1, got {l_ratio:.2f})", l_ratio >= MIN_CONTRAST)
    if r["tier"]:
        t_fg, t_bg = parse_rgb(r["tier"]["color"]), composite(r["tier"]["bg"])
        t_ratio = contrast(t_fg, t_bg) if t_fg and t_bg else 0
        check(f"the pick-card tier line clears the repaired floor (>= {MIN_CONTRAST}:1, got {t_ratio:.2f})", t_ratio >= MIN_CONTRAST)
    check("exactly the saved pick renders (no suggestion padding)", r["picks"] == 1, f"picks={r['picks']}")
    check("the attribution line is config-derived and non-empty", len(r["attribution"]) > 0)
    s_fg, s_bg = parse_rgb(r["send"]["color"]), composite(r["send"]["bg"])
    s_ratio = contrast(s_fg, s_bg) if s_fg and s_bg else 0
    check(f"the send button sits inside the page and its label is readable (got {s_ratio:.2f}:1)",
          r["send"]["x"] >= 0 and r["send"]["x"] + r["send"]["w"] <= width + 1 and s_ratio >= MIN_CONTRAST)
    page.close()


# Cohesion change C1 (owner ruling 2026-08-30): the fixed session utility bar
# (language + Restart, `position: fixed; top: 8px; right: 8px`) collided with
# the Sleep System header — at 1194x748 it covered the top of the "Review
# Sleep Plan" control, at 834x1108 the right end of the h1 — in both languages.
# The screen now reserves --session-utility-clearance like the Sleep Brief
# does. This pass renders the Sleep System in EN and ES at both mounted tablet
# viewports and proves the bar's box intersects none of the title, the Back
# control or the top Review control, and that the heading still takes focus.
SLEEP_SYSTEM_JS = r"""
async (ARGS) => {
  const ANS = ARGS.answers;
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  showProfileScreen();
  window.showResults();
  (function(__id) { window.chooseFinalist(__id); })(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories();
  await new Promise((res) => setTimeout(res, 500));
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return null;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const inter = (a, b) => !!(a && b && !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y));
  const bar = rect(document.querySelector('.session-utility'));
  const title = rect(document.getElementById('sleepSystemTitle'));
  const back = rect(document.getElementById('sleepSystemBack'));
  const review = rect(document.getElementById('sleepSystemReviewTop'));
  const sidecarReview = rect(document.getElementById('sleepSystemPlanReview'));
  const helper = document.getElementById('sleepSystemPlanHelper');
  const reviewControls = Array.from(document.querySelectorAll('[data-sleep-action="review-plan"]'))
    .filter((el) => el.offsetParent !== null || getComputedStyle(el).position === 'fixed').length;
  const doc = document.documentElement;
  return {
    barVisible: !!bar, title, back, review, bar, sidecarReview,
    helperVisible: !!(helper && !helper.hidden && helper.textContent.trim()),
    visibleReviewControls: reviewControls,
    barOverTitle: inter(bar, title), barOverBack: inter(bar, back), barOverReview: inter(bar, review),
    activeElement: document.activeElement && document.activeElement.id,
    titleText: (document.getElementById('sleepSystemTitle') || {}).textContent || '',
    scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
  };
}
"""


def run_sleep_system_header(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- SLEEP SYSTEM header vs utility bar {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(SLEEP_SYSTEM_JS, {"answers": ANSWERS, "lang": lang})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"sleep-system-header-{lang}-{name}-{width}x{height}.png"))
    check("the Sleep System renders without a page error and focuses its title",
          not errors and r["activeElement"] == "sleepSystemTitle", f"active={r['activeElement']} errors={errors[:1]}")
    check("the persistent utility bar is present on the Sleep System", r["barVisible"])
    # Sleep System A2 (owner ruling 2026-09-01): the header review control is
    # retired; before four categories are decided NO review primary renders -
    # only the progress count and a quiet helper - and the sidecar control is
    # the single responsive control that appears when all four are decided.
    check("the title and Back control render; the retired header Review control does not (A2)",
          bool(r["title"] and r["back"]) and r["review"] is None,
          f"title={bool(r['title'])} back={bool(r['back'])} review={r['review']}")
    check("A2: with categories still open, no Review Sleep Plan control is visible and the quiet helper is",
          r["visibleReviewControls"] == 0 and r["sidecarReview"] is None and r["helperVisible"],
          f"visibleReviewControls={r['visibleReviewControls']} sidecar={r['sidecarReview']} helper={r['helperVisible']}")
    check("the utility bar does not intersect the h1",
          not r["barOverTitle"], f"bar={r['bar']} title={r['title']}")
    check("the utility bar does not intersect the Back control",
          not r["barOverBack"], f"bar={r['bar']} back={r['back']}")
    check("the utility bar intersects no review control (none is rendered before four decisions)",
          not r["barOverReview"], f"bar={r['bar']} review={r['review']}")
    check("no horizontal document scroll", r["scrollWidth"] <= r["clientWidth"], f"{r['scrollWidth']}/{r['clientWidth']}")
    page.close()


def run_forced_colors(browser, port, shots_dir):
    print("\n-- forced-colors (Chromium emulation) 1194x748 --")
    page = browser.new_page(viewport={"width": 1194, "height": 748}, forced_colors="active")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(SUMMARY_JS, ANSWERS)
    if shots_dir:
        page.screenshot(path=os.path.join(shots_dir, "summary-forced-colors-1194x748.png"))
    check("forced colors: the Summary renders without a page error", not errors)
    # C4: the focused title keeps a solid ring and drops the halo (the
    # CanvasText fallback block applied); its text is not invisible.
    fc = page.evaluate("""() => { const t = document.getElementById('hf2ReviewTitle'); const cs = getComputedStyle(t);
        return { active: document.activeElement === t, outlineStyle: cs.outlineStyle, outlineWidth: parseFloat(cs.outlineWidth), boxShadow: cs.boxShadow }; }""")
    check("forced colors: the focused Summary title keeps a solid 3px ring with no halo (C4 fallback applied)",
          fc["active"] and fc["outlineStyle"] == "solid" and abs(fc["outlineWidth"] - 3) < 0.5 and fc["boxShadow"] == "none", str(fc))
    for label in ("lead", "send"):
        el = r[label]
        fg, bg = parse_rgb(el["color"]), composite(el["bg"])
        ok = fg is not None and bg is not None and fg != bg
        check(f"forced colors: the {label} text is not invisible (fg != bg)", ok,
              f"color={el['color']} bg={el['bg']}")
    page.close()


# X11 (North Star ruling D9, 2026-08-31): under forced colors the active tier
# tab, the active Sleep System rail step and the card's selected Compare /
# saved Save were indistinguishable from their resting neighbours (fills are
# stripped and every border — including a reserved `transparent` one — is
# painted CanvasText). Each state now differs in border geometry. This pass
# renders Results and the Sleep System under Chromium's forced-colors
# emulation and compares COMPUTED border width/style between the active and a
# resting sibling, and proves the compensated padding keeps the boxes equal.
FORCED_STATES_JS = r"""
async (ARGS) => {
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  const gold = _resultsState.tierData.gold;
  window.toggleCompare(gold[0].id);
  window._toggleSavePick(gold[0].id);
  await new Promise((res) => setTimeout(res, 300));
  const geo = (el) => { if (!el) return null; const c = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { bw: parseFloat(c.borderTopWidth), bs: c.borderTopStyle, w: Math.round(r.width), h: Math.round(r.height), pad: [c.paddingTop, c.paddingRight, c.paddingBottom, c.paddingLeft].join(' ') }; };
  const tabs = Array.from(document.querySelectorAll('.noct-tier-tab'));
  const activeTab = tabs.find((t) => t.classList.contains('active')), restTab = tabs.find((t) => !t.classList.contains('active'));
  const cmp = Array.from(document.querySelectorAll('#resultsScreen .compare-btn'));
  const selCmp = cmp.find((b) => b.classList.contains('selected')), restCmp = cmp.find((b) => !b.classList.contains('selected'));
  const saves = Array.from(document.querySelectorAll('#resultsScreen .noct-save-btn'));
  const saved = saves.find((b) => b.classList.contains('saved')), restSave = saves.find((b) => !b.classList.contains('saved'));
  const results = { activeTab: geo(activeTab), restTab: geo(restTab), selCmp: geo(selCmp), restCmp: geo(restCmp), saved: geo(saved), restSave: geo(restSave),
                    forced: matchMedia('(forced-colors: active)').matches };
  (function(__id) { window.chooseFinalist(__id); })(gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories();
  await new Promise((res) => setTimeout(res, 400));
  const steps = Array.from(document.querySelectorAll('#sleepSystemRail .sleep-system__step'));
  const activeStep = steps.find((s) => s.classList.contains('is-active')), restStep = steps.find((s) => !s.classList.contains('is-active') && !s.classList.contains('is-complete'));
  return { results, rail: { activeStep: geo(activeStep), restStep: geo(restStep) } };
}
"""


def run_forced_colors_states(browser, port, shots_dir):
    print("\n-- forced-colors state cues (X11) 1194x748 --")
    page = browser.new_page(viewport={"width": 1194, "height": 748}, forced_colors="active")
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(FORCED_STATES_JS, {"answers": ANSWERS})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, "forced-colors-states-1194x748.png"))
    R = r["results"]
    check("forced colors: emulation active, Results rendered with an active tab, a selected Compare and a saved Save, no page error",
          R["forced"] and not errors and R["activeTab"] and R["restTab"] and R["selCmp"] and R["restCmp"] and R["saved"] and R["restSave"], str(errors)[:120])
    if R["activeTab"] and R["restTab"]:
        check(f"forced colors: the active tier tab differs from a resting tab in border width AND style ({R['activeTab']['bw']}px {R['activeTab']['bs']} vs {R['restTab']['bw']}px {R['restTab']['bs']})",
              R["activeTab"]["bw"] > R["restTab"]["bw"] and R["activeTab"]["bs"] == "double" and R["restTab"]["bs"] != "double")
        check("forced colors: the active and resting tabs keep the same height (compensated padding, no reflow)",
              R["activeTab"]["h"] == R["restTab"]["h"], f"{R['activeTab']['h']} vs {R['restTab']['h']}")
    if R["selCmp"] and R["restCmp"]:
        check(f"forced colors: the selected Compare differs from a resting Compare in border width ({R['selCmp']['bw']}px vs {R['restCmp']['bw']}px)",
              R["selCmp"]["bw"] > R["restCmp"]["bw"] + 0.5)
        check("forced colors: the selected and resting Compare controls keep the same height", R["selCmp"]["h"] == R["restCmp"]["h"], f"{R['selCmp']['h']} vs {R['restCmp']['h']}")
    if R["saved"] and R["restSave"]:
        check(f"forced colors: the saved Save differs from a resting Save in border width ({R['saved']['bw']}px vs {R['restSave']['bw']}px)",
              R["saved"]["bw"] > R["restSave"]["bw"] + 0.5)
    S = r["rail"]
    check("forced colors: the Sleep System rail rendered an active step and a resting step", bool(S["activeStep"] and S["restStep"]))
    if S["activeStep"] and S["restStep"]:
        check(f"forced colors: the active rail step differs from a resting step in border width ({S['activeStep']['bw']}px vs {S['restStep']['bw']}px)",
              S["activeStep"]["bw"] > S["restStep"]["bw"] + 1)
        check("forced colors: the active and resting rail steps keep the same width (compensated padding)",
              S["activeStep"]["w"] == S["restStep"]["w"], f"{S['activeStep']['w']} vs {S['restStep']['w']}")
    page.close()


def run_viewport(browser, port, name, width, height, shots_dir):
    print(f"\n-- {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(PROBE_JS, ANSWERS)
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"sleep-plan-{name}-{width}x{height}.png"))

    check("the app reached the Plan without a page error", r["active"] and not errors, "; ".join(errors))
    check("the active Plan is a flex COLUMN", r["display"] == "flex" and r["flexDirection"] == "column",
          f"display={r['display']} flex-direction={r['flexDirection']}")

    kids = [c for c in r["children"] if c["display"] != "none"]
    screen_w = r["screenBox"]["w"]
    stacked = all(kids[i]["y"] + kids[i]["h"] <= kids[i + 1]["y"] + 1 for i in range(len(kids) - 1))
    check(f"the {len(kids)} visible blocks stack top-to-bottom in DOM order (no side-by-side columns)", stacked,
          "; ".join(f"{c['id']}@y={c['y']:.0f}" for c in kids))
    # The focused title is excluded on purpose: since cohesion C4 a focused
    # heading shrinks its box to its text (its own guard is the "not squeezed"
    # title check below). Every other block must still span the column.
    blocks = [c for c in kids if c["id"] != "sleepPlanTitle"]
    wide = all(c["w"] >= 0.6 * screen_w for c in blocks)
    check("every block (the focused title aside) spans the screen (>= 60% of the screen's content width)", wide,
          "; ".join(f"{c['id']}:{c['w']:.0f}/{screen_w:.0f}" for c in blocks if c["w"] < 0.6 * screen_w))
    inside = all(c["x"] >= -1 and c["x"] + c["w"] <= width + 1 for c in kids)
    check("no block lies outside the viewport horizontally", inside,
          "; ".join(f"{c['id']}:x={c['x']:.0f}..{c['x'] + c['w']:.0f}" for c in kids if not (c["x"] >= -1 and c["x"] + c["w"] <= width + 1)))
    check("the document does not scroll horizontally", r["scrollWidth"] <= r["clientWidth"],
          f"scrollWidth={r['scrollWidth']} clientWidth={r['clientWidth']}")

    check("the Plan shares the Consultation Summary's (warm work) theme background",
          r["bodyBg"] == r["hf2ThemeProbe"], f"plan={r['bodyBg']} summary={r['hf2ThemeProbe']}")

    t_fg, t_bg = parse_rgb(r["title"]["color"]), composite(r["title"]["bg"])
    t_ratio = contrast(t_fg, t_bg) if t_fg and t_bg else 0
    check(f"the title '{r['title']['text']}' is readable (>= {MIN_CONTRAST}:1, got {t_ratio:.2f}) and not squeezed into a sliver (<= 2 lines, no clipped overflow)",
          t_ratio >= MIN_CONTRAST and r["title"]["lines"] <= 2 and not r["title"]["overflows"],
          f"color={r['title']['color']} bg={r['title']['bg']} width={r['title']['w']:.0f}/{screen_w:.0f} lines={r['title']['lines']} overflows={r['title']['overflows']}")
    f_fg, f_bg = parse_rgb(r["finHead"]["color"]), composite(r["finHead"]["bg"])
    f_ratio = contrast(f_fg, f_bg) if f_fg and f_bg else 0
    check(f"the Payment Choice headline is rendered and readable (>= {MIN_CONTRAST}:1, got {f_ratio:.2f})",
          not r["finHead"]["hidden"] and f_ratio >= MIN_CONTRAST,
          f"hidden={r['finHead']['hidden']} color={r['finHead']['color']} bg={r['finHead']['bg']}")

    c = r["continue"]
    c_fg, c_bg = parse_rgb(c["color"]), composite(c["bg"])
    c_ratio = contrast(c_fg, c_bg) if c_fg and c_bg else 0
    check(f"the Continue control's label is readable on its fill (>= {MIN_CONTRAST}:1, got {c_ratio:.2f})",
          c_ratio >= MIN_CONTRAST, f"color={c['color']} bg={c['bg']}")
    check("the Continue control is displayed and lies inside the page horizontally",
          (not c["hidden"]) and c["display"] != "none" and c["x"] >= 0 and c["x"] + c["w"] <= width + 1 and c["w"] > 0,
          f"hidden={c['hidden']} display={c['display']} x={c['x']:.0f} w={c['w']:.0f}")

    # Keyboard reachability: from the screen's focus destination (the heading,
    # per 0.3) Tab forward until the Continue control owns focus.
    reached = None
    for i in range(1, MAX_TABS + 1):
        page.keyboard.press("Tab")
        active = page.evaluate("document.activeElement && document.activeElement.id")
        if active == "sleepPlanContinue":
            reached = i
            break
    check(f"the Continue control is reachable by keyboard (Tab x{reached} from the focused heading)", reached is not None,
          f"not reached within {MAX_TABS} Tabs; focus started at {r['activeElement']}")
    if reached is not None:
        in_view = page.evaluate("""() => { const r = document.getElementById('sleepPlanContinue').getBoundingClientRect();
            return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth; }""")
        check("...and focusing it scrolls it fully into view", in_view)
    page.close()


# Cohesion change C4 (owner ruling 2026-08-30): the screen headings that take
# programmatic focus on every transition wore only the UA `outline: auto` on a
# display:block h1 - a full-width rectangle up to 3.2x wider than the words
# (Plan title: 1154px box, 364px of text at 1194x748). The author treatment
# shrinks the focused heading's box to its text and draws the shared two-ring
# pair at a 5px offset, on :focus-visible only. This pass reaches the Plan and
# the Summary through a KEYBOARD activation (Enter on the control that leads
# there), so :focus-visible is exercised the way a keyboard user exercises
# it, and proves per language and tablet viewport:
#   * the destination heading owns focus and matches :focus-visible;
#   * the author ring is on it (solid 3px outline, offset >= 4px, halo);
#   * the ring hugs the text: a one-line heading's box is no wider than its
#     text range (+2px);
#   * nothing moves: the text's position is identical with the ring and after
#     blur() removes it (the ring is an overlay on the same layout);
#   * blur() removes the ring (no persistent decoration).
HEADING_SETUP_JS = r"""
async (ARGS) => {
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  (function(__id) { window.chooseFinalist(__id); })(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories();
  await new Promise((res) => setTimeout(res, 400));
  return (document.querySelector('.screen.active') || {}).id;
}
"""

HEADING_MEASURE_JS = r"""
() => {
  const ae = document.activeElement;
  const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  const text = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const b = rg.getBoundingClientRect();
                         return { x: b.x, y: b.y, w: b.width, h: b.height, lines: rg.getClientRects().length }; };
  const read = () => { const cs = getComputedStyle(ae); return { box: box(ae), text: text(ae), outlineStyle: cs.outlineStyle,
                       outlineWidth: parseFloat(cs.outlineWidth), outlineOffset: parseFloat(cs.outlineOffset), boxShadow: cs.boxShadow }; };
  const focused = read();
  let fv = null; try { fv = ae.matches(':focus-visible'); } catch (e) {}
  focused.fv = fv;
  ae.blur();
  const blurred = read();
  ae.focus({ preventScroll: true });
  return { id: ae.id, screen: (document.querySelector('.screen.active') || {}).id, focused, blurred };
}
"""


def _check_heading(tag, r, expect_id):
    f, b = r["focused"], r["blurred"]
    check(f"[{tag}] the keyboard activation landed on #{expect_id} and it owns focus",
          r["id"] == expect_id, f"active={r['id']} screen={r['screen']}")
    check(f"[{tag}] the focused heading matches :focus-visible after a keyboard activation", f["fv"] is True)
    check(f"[{tag}] the author ring is on it: solid 3px outline at >= 4px offset with the inner halo",
          f["outlineStyle"] == "solid" and abs(f["outlineWidth"] - 3) < 0.5 and f["outlineOffset"] >= 4 and f["boxShadow"] != "none",
          f"style={f['outlineStyle']} width={f['outlineWidth']} offset={f['outlineOffset']} shadow={str(f['boxShadow'])[:40]}")
    hug = (f["box"]["w"] <= f["text"]["w"] + 2) if f["text"]["lines"] == 1 else True
    check(f"[{tag}] the ring hugs the text: box {f['box']['w']:.0f}px vs text {f['text']['w']:.0f}px ({f['text']['lines']} line(s))", hug)
    still = abs(f["text"]["x"] - b["text"]["x"]) < 0.5 and abs(f["text"]["y"] - b["text"]["y"]) < 0.5
    check(f"[{tag}] the text does not move when the ring leaves (same x/y focused and blurred)", still,
          f"focused=({f['text']['x']:.1f},{f['text']['y']:.1f}) blurred=({b['text']['x']:.1f},{b['text']['y']:.1f})")
    check(f"[{tag}] blur() removes the ring (no persistent decoration)", b["outlineStyle"] == "none")


def run_heading_focus(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- HEADING FOCUS (C4) keyboard path {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    screen = page.evaluate(HEADING_SETUP_JS, {"answers": ANSWERS, "lang": lang})
    check(f"[{lang}/{name}] the setup reached the Sleep System without a page error",
          screen == "accessoriesScreen" and not errors, f"screen={screen} errors={errors[:1]}")
    # Sleep System -> Plan by keyboard. A2: the ONE review control (the sidecar's)
    # appears only once all four categories are decided; a legitimate deferral is a
    # decision, so defer the remaining steps first and re-render, then Enter on it.
    ready = page.evaluate("""() => {
      SLEEP_SYSTEM_STEPS.forEach((step) => {
        if (sleepSystemDecision(step.id).status === 'open') {
          window._sleepSystemState.decisions[step.id] = { status: 'later' };
        }
      });
      renderSleepSystem();
      const btn = document.getElementById('sleepSystemPlanReview');
      const top = document.getElementById('sleepSystemReviewTop');
      return { visible: !!btn && !btn.hidden && btn.offsetParent !== null, topHidden: !!top && top.hidden,
               controls: Array.from(document.querySelectorAll('[data-sleep-action="review-plan"]')).filter((el) => el.offsetParent !== null).length };
    }""")
    check(f"[{lang}/{name}] A2: once all four categories are decided exactly ONE Review Sleep Plan control is visible (the sidecar's)",
          ready["visible"] and ready["topHidden"] and ready["controls"] == 1, str(ready))
    page.evaluate("() => document.getElementById('sleepSystemPlanReview').scrollIntoView({block: 'center'})")
    page.focus("#sleepSystemPlanReview")
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    r = page.evaluate(HEADING_MEASURE_JS)
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"heading-focus-plan-{lang}-{name}-{width}x{height}.png"))
    _check_heading(f"{lang}/{name}/Plan", r, "sleepPlanTitle")
    # Plan -> Summary by keyboard (Enter on Continue).
    page.evaluate("() => document.getElementById('sleepPlanContinue').scrollIntoView({block: 'center'})")
    page.focus("#sleepPlanContinue")
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    r = page.evaluate(HEADING_MEASURE_JS)
    if shots_dir:
        page.screenshot(path=os.path.join(shots_dir, f"heading-focus-summary-{lang}-{name}-{width}x{height}.png"))
    _check_heading(f"{lang}/{name}/Summary", r, "hf2ReviewTitle")
    check(f"[{lang}/{name}] no page error during the keyboard path", not errors, str(errors)[:120])
    page.close()


# X1 (North Star ruling D9, 2026-08-31): in portrait the floating Selections
# pill covered the compare tray's "Compare →" once a pick was saved (100×31 of
# the 104×35 control; 6 of 36 tap points reached it in EN, 11/36 in ES — the
# rest opened the Summary). The pill now lifts above the tray by the tray's
# rendered height while the tray is shown. This pass renders Results with one
# saved pick and two compare selections, in EN and ES at both tablet viewports,
# and proves with a 6×6 elementFromPoint grid that every point on Compare and
# on Clear reaches its own control, that the pill does not intersect the tray,
# that the pill itself stays fully tappable, and that clearing the tray drops
# the pill back to its resting position.
TRAY_PILL_JS = r"""
async (ARGS) => {
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  const gold = _resultsState.tierData.gold;
  window._toggleSavePick(gold[0].id);
  window.toggleCompare(gold[0].id);
  window.toggleCompare(gold[1].id);
  // Settle on the REAL animations (the tray's 0.25s entrance slide and the
  // pill's 0.2s bottom transition), not a fixed sleep: under CI load a fixed
  // wait left the tray mid-slide, so a row of hit-test points fell below the
  // viewport and elementFromPoint returned null (measured 30/36).
  const settle = async () => {
    const els = [document.getElementById('compareTray'), document.getElementById('savedPicksBtn')];
    await Promise.all(els.flatMap((el) => el.getAnimations({ subtree: true })).map((a) => a.finished.catch(() => {})));
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  };
  await settle();
  const R = (el) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, top: b.top, bottom: b.bottom }; };
  const inter = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const hit = (el) => { const b = el.getBoundingClientRect(); let ok = 0; for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
    const t = document.elementFromPoint(b.left + (i + 0.5) * b.width / 6, b.top + (j + 0.5) * b.height / 6); if (t && (t === el || el.contains(t))) ok++; } return ok; };
  const tray = document.getElementById('compareTray'), go = document.getElementById('compareTrayGo'),
        clr = document.getElementById('compareTrayClear'), pill = document.getElementById('savedPicksBtn');
  const shown = { tray: R(tray), go: R(go), clear: R(clr), pill: R(pill), pillOverTray: inter(R(pill), R(tray)), pillOverGo: inter(R(pill), R(go)),
                  goHit: hit(go), clearHit: hit(clr), pillHit: hit(pill), lifted: pill.classList.contains('noct-picks-pill--lifted'),
                  clearance: pill.style.getPropertyValue('--df-tray-clearance'), pillBottom: getComputedStyle(pill).bottom };
  window.clearCompare();
  await settle();
  const cleared = { trayDisplay: tray.style.display, lifted: pill.classList.contains('noct-picks-pill--lifted'),
                    pillBottom: getComputedStyle(pill).bottom, pill: R(pill), pillHit: hit(pill) };
  return { shown, cleared, vh: window.innerHeight };
}
"""


def run_compare_tray_pill(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- COMPARE TRAY vs Selections pill (X1) {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height}, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(TRAY_PILL_JS, {"answers": ANSWERS, "lang": lang})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"tray-pill-{lang}-{name}-{width}x{height}.png"))
    s, c = r["shown"], r["cleared"]
    tag = f"{lang}/{name}"
    check(f"[{tag}] Results rendered with the tray shown and the pill visible, no page error",
          not errors and s["tray"]["h"] > 0 and s["pill"]["h"] > 0, f"errors={errors[:1]} tray={s['tray']} pill={s['pill']}")
    check(f"[{tag}] the pill is lifted by the tray's rendered height ({s['tray']['h']:.0f}px)",
          s["lifted"] and s["clearance"] == f"{s['tray']['h']:.0f}px", f"lifted={s['lifted']} clearance={s['clearance']!r}")
    check(f"[{tag}] the pill does not intersect the tray (pill bottom {s['pill']['bottom']:.0f} <= tray top {s['tray']['top']:.0f})",
          not s["pillOverTray"] and s["pill"]["bottom"] <= s["tray"]["top"] + 0.5)
    check(f"[{tag}] every one of 36 points on Compare reaches Compare (was 6/36 EN, 11/36 ES in portrait)",
          s["goHit"] == 36, f"reached {s['goHit']}/36")
    check(f"[{tag}] every one of 36 points on Clear reaches Clear", s["clearHit"] == 36, f"reached {s['clearHit']}/36")
    check(f"[{tag}] the lifted pill itself is fully tappable (36/36) and inside the viewport",
          s["pillHit"] == 36 and s["pill"]["y"] >= 0 and s["pill"]["bottom"] <= r["vh"] + 0.5, f"reached {s['pillHit']}/36 pill={s['pill']}")
    check(f"[{tag}] clearing the tray drops the pill back to its resting position (bottom 16px, class removed, still tappable)",
          c["trayDisplay"] == "none" and not c["lifted"] and c["pillBottom"] == "16px" and c["pillHit"] == 36,
          f"display={c['trayDisplay']} lifted={c['lifted']} bottom={c['pillBottom']} hit={c['pillHit']}")
    page.close()


# X12 (North Star ruling D9, 2026-08-31): the swarm measured a dozen controls
# under the 44px touch floor (Welcome language toggle 40x27, compare tray
# 104x35 / 53x35, Selections pill x40, "Save for later" x33, Compare close
# 32x29, drawer Back/Prev/Next x42, Summary pick/accessory actions x42, RSA
# strip x34, RSA add x37, take-home secondary actions x33/x32). Two were ruled
# acceptable with reason and stay: the card's "View details" (the card itself
# opens the drawer) and the inline privacy link (running text). This pass
# walks Welcome -> Results (tray shown, pill shown) -> drawer -> Compare ->
# Summary (roster open) -> take-home -> preview confirmation in EN and ES at
# both tablet viewports and requires every other visible interactive control
# to be at least 44x44 CSS px.
TOUCH_FLOOR_JS = r"""
async (ARGS) => {
  const vis = (el) => { const c = getComputedStyle(el); if (c.display === 'none' || c.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  const desc = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + ((typeof el.className === 'string' && el.className.trim()) ? '.' + el.className.trim().split(/\s+/)[0] : '');
  const small = (label) => { const out = []; for (const el of document.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])')) {
      if (!vis(el) || el.closest('[inert]') || el.disabled) continue; const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) out.push({ screen: label, desc: desc(el), w: Math.round(r.width), h: Math.round(r.height) }); } return out; };
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  if (ARGS.lang === 'es') await switchLanguage('es');
  let found = small('welcome');
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  const gold = _resultsState.tierData.gold;
  window._toggleSavePick(gold[0].id);
  window.toggleCompare(gold[0].id);
  window.toggleCompare(gold[1].id);
  await wait(450);
  found = found.concat(small('results+tray+pill'));
  openResultCardDrawer(document.querySelector('#resultsScreen [data-id][data-tier]'));
  await wait(500);
  found = found.concat(small('drawer'));
  window.closeMattressDrawer();
  await wait(450);
  window.openCompareModal();
  await wait(450);
  found = found.concat(small('compare-modal'));
  window.closeCompareModal();
  await wait(400);
  (function(__id) { window.chooseFinalist(__id); })(gold[0].id);
  window.showSavedPicks();
  await wait(400);
  const strip = document.getElementById('hf2RsaStripBtn'); if (strip) { strip.click(); await wait(250); }
  found = found.concat(small('summary+roster'));
  window.showEmailCapture();
  await wait(400);
  found = found.concat(small('take-home'));
  let live = (typeof emailDeliveryLive === 'function') ? emailDeliveryLive() : null;
  if (live === false) {
    const input = document.getElementById('emailInput'); if (input) input.value = 'preview@example.com';
    const send = document.getElementById('emailSendBtn'); if (send) { send.click(); await wait(1200); found = found.concat(small('take-home-confirmation')); }
  }
  return { found, live };
}
"""
ALLOWED_SMALL = ("noct-card-details", "emailPrivacyLink")


def run_touch_floor(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- TOUCH FLOOR sweep (X12) {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height}, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(TOUCH_FLOOR_JS, {"answers": ANSWERS, "lang": lang})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"touch-floor-end-{lang}-{name}-{width}x{height}.png"))
    offenders = [o for o in r["found"] if not any(a in o["desc"] for a in ALLOWED_SMALL)]
    accepted = [o for o in r["found"] if any(a in o["desc"] for a in ALLOWED_SMALL)]
    check(f"[{lang}/{name}] the sweep reached the preview confirmation without a page error (emailDeliveryLive() === false)",
          not errors and r["live"] is False, f"errors={errors[:1]} live={r['live']}")
    check(f"[{lang}/{name}] every visible interactive control on the swept screens is >= 44x44 CSS px, except the two recorded exceptions ({len(accepted)} occurrences of View details / privacy link)",
          not offenders, "; ".join(f"{o['screen']}:{o['desc']} {o['w']}x{o['h']}" for o in offenders[:14]))
    page.close()


# Consolidation pass (owner ruling 2026-09-02): the drawer's finalist and Save
# controls live in a STICKY footer at the bottom of the scrollable story
# column. Rendered proof per viewport and language: the footer is position:
# sticky on the column's bottom edge at the top, middle and end of the scroll
# range; at the end of the range the last scroll-flow content clears it (it is
# the column's last in-flow element); both actions are visible without
# scrolling and keep their targets; in landscape the footer stays off the
# photo column; the first-save pillow prompt stays in the flow, outside the
# footer, and scrolls clear of it (scroll-padding); choosing from the footer
# works and announces through the live region that travels with it.
DRAWER_FOOTER_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const q = (id) => document.getElementById(id);
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
  const vis = (el) => { const c = getComputedStyle(el); if (c.display === 'none' || c.visibility === 'hidden') return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  await wait(300);
  openResultCardDrawer(document.querySelector('#resultsScreen [data-id][data-tier]'));
  await wait(700);
  const scroll = q('drawerScroll'), footer = q('drawerActionFooter'), hero = q('drawerHeroImg');
  const fin = q('drawerFinalistBtn'), save = q('drawerInterestedBtn'), prompt = q('drawerSystemPrompt'), live = q('drawerFinalistLive');
  if (!footer) return { drawerOpen: q('mattressDrawer').classList.contains('drawer-open'), position: null };
  const lastFlow = () => { const kids = Array.from(scroll.children).filter((c) => c !== footer && vis(c)); const k = kids[kids.length - 1]; return k ? { id: k.id, rect: rect(k) } : null; };
  const snap = () => ({ scrollTop: Math.round(scroll.scrollTop), scrollMax: Math.round(scroll.scrollHeight - scroll.clientHeight), scroll: rect(scroll), footer: rect(footer), fin: rect(fin), save: rect(save), hero: rect(hero), last: lastFlow() });
  const out = { landscape: innerWidth > innerHeight, drawerOpen: q('mattressDrawer').classList.contains('drawer-open'),
    position: getComputedStyle(footer).position, scrollPaddingBottom: getComputedStyle(scroll).scrollPaddingBottom,
    footerBg: getComputedStyle(footer).backgroundColor, footerRadius: getComputedStyle(footer).borderTopLeftRadius,
    overflowX: scroll.scrollWidth > scroll.clientWidth + 1, docOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  out.top = snap();
  scroll.scrollTop = Math.round((scroll.scrollHeight - scroll.clientHeight) / 2); await wait(150); out.mid = snap();
  scroll.scrollTop = scroll.scrollHeight; await wait(150); out.end = snap();
  scroll.scrollTop = 0; await wait(120);
  save.click(); await wait(500);
  out.savePressed = save.getAttribute('aria-pressed');
  out.promptVisible = prompt.classList.contains('is-visible') && vis(prompt);
  out.promptInFooter = footer.contains(prompt);
  prompt.scrollIntoView({ block: 'nearest' }); await wait(150);
  out.prompt = rect(prompt); out.footerAfterPrompt = rect(footer);
  fin.click(); await wait(400);
  out.finPressed = fin.getAttribute('aria-pressed');
  out.finInFooter = footer.contains(fin) && footer.contains(save) && footer.contains(live) && footer.contains(q('drawerFinalistNote'));
  out.live = (live.textContent || '').trim();
  out.favoriteIsOpen = window._favoriteMattressId === window._currentDrawerMattressId;
  window.closeMattressDrawer(); await wait(300);
  return out;
}
"""


def run_drawer_footer(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- DRAWER FOOTER (consolidation pass) {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height}, has_touch=True)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(DRAWER_FOOTER_JS, {"answers": ANSWERS, "lang": lang})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"drawer-footer-end-{lang}-{name}-{width}x{height}.png"))
    tag = f"[{lang}/{name}]"
    near = lambda a, b, tol=1.5: abs(a - b) <= tol
    check(f"{tag} the drawer opened without a page error; the footer is position: sticky and the column keeps 150px of terminal scroll padding",
          not errors and r.get("drawerOpen") and r.get("position") == "sticky" and r.get("scrollPaddingBottom") == "150px",
          f"errors={errors[:1]} open={r.get('drawerOpen')} position={r.get('position')} scrollPadding={r.get('scrollPaddingBottom')}")
    if r.get("position") != "sticky":
        for _ in range(7):
            check(f"{tag} (footer absent) rendered footer geometry could not be measured", False, "no #drawerActionFooter")
        page.close()
        return
    for label in ("top", "mid", "end"):
        s = r[label]
        check(f"{tag} {label} of the scroll range: the footer sits on the column's bottom edge, inside the column",
              near(s["footer"]["b"], s["scroll"]["b"]) and s["footer"]["l"] >= s["scroll"]["l"] - 1 and s["footer"]["r"] <= s["scroll"]["r"] + 1
              and s["footer"]["t"] >= s["scroll"]["t"],
              f"footer={s['footer']} scroll={s['scroll']} scrollTop={s['scrollTop']}/{s['scrollMax']}")
    t = r["top"]
    check(f"{tag} both actions are visible without scrolling and keep their targets (finalist >= 52 tall, Save >= 52 tall, both >= 44 wide)",
          t["fin"]["h"] >= 52 and t["save"]["h"] >= 52 and t["fin"]["w"] >= 44 and t["save"]["w"] >= 44
          and t["fin"]["t"] >= t["scroll"]["t"] and t["fin"]["b"] <= t["scroll"]["b"] + 1 and t["save"]["b"] <= t["scroll"]["b"] + 1,
          f"fin={t['fin']} save={t['save']} scroll={t['scroll']}")
    e = r["end"]
    check(f"{tag} at the end of the scroll range the last scroll-flow content clears the footer (nothing rests underneath it)",
          e["last"] is not None and e["last"]["rect"]["b"] <= e["footer"]["t"] + 0.5 and (e["scrollMax"] == 0 or e["scrollTop"] >= e["scrollMax"] - 1),
          f"last={e['last']} footer={e['footer']} scrollTop={e['scrollTop']}/{e['scrollMax']}")
    if r["landscape"]:
        check(f"{tag} landscape: the footer stays inside the story column, off the photo column",
              t["footer"]["l"] >= t["hero"]["r"] - 1, f"footer.l={t['footer']['l']} hero.r={t['hero']['r']}")
    check(f"{tag} no horizontal overflow in the column or the document; the footer is a surface, not a card (no radius)",
          not r["overflowX"] and not r["docOverflow"] and r["footerRadius"] in ("0px", "0"),
          f"overflowX={r['overflowX']} doc={r['docOverflow']} radius={r['footerRadius']}")
    check(f"{tag} the first save from the footer shows the pillow prompt in the scroll flow, outside the footer, and it scrolls clear of the footer",
          r["savePressed"] == "true" and r["promptVisible"] and not r["promptInFooter"]
          and r["prompt"]["b"] <= r["footerAfterPrompt"]["t"] + 0.5,
          f"save={r['savePressed']} visible={r['promptVisible']} inFooter={r['promptInFooter']} prompt={r['prompt']} footer={r['footerAfterPrompt']}")
    check(f"{tag} choosing from the footer makes the open mattress the finalist (pressed) and announces through the live region that travels with the actions",
          r["finPressed"] == "true" and r["favoriteIsOpen"] and r["finInFooter"] and len(r["live"]) > 0,
          f"pressed={r['finPressed']} inFooter={r['finInFooter']} live={r['live'][:60]!r}")
    page.close()


# Consolidation pass (owner ruling 2026-09-02): the drawer's accessible name
# takes programmatic focus on open and used to show only the UA rectangle.
# Rendered proof: on the KEYBOARD path (a Tab precedes the open) the title
# matches :focus-visible and draws the author ring (3px solid outline at a
# 5px offset with the halo) hugging its text; on the POINTER path (a real
# click on the result card opens the drawer) the title is focused and never
# draws the browser-default `auto` ring - Chromium's heuristic may still
# match :focus-visible after a script focus() (it did in every earlier
# capture, which is where the UA rectangle came from), in which case the
# author ring is what appears. Focus entry itself is unchanged in both paths.
DRAWER_TITLE_SETUP_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  await wait(400);
  const card = document.querySelector('#resultsScreen [data-id][data-tier]');
  const r = card.getBoundingClientRect();
  return { x: r.left + Math.min(40, r.width / 4), y: r.top + Math.min(40, r.height / 4) };
}
"""
DRAWER_TITLE_PROBE_JS = r"""
() => {
  const title = document.getElementById('drawerName');
  const cs = getComputedStyle(title);
  const info = title.parentElement.getBoundingClientRect();
  const r = title.getBoundingClientRect();
  return { open: document.getElementById('mattressDrawer').classList.contains('drawer-open'), focused: document.activeElement === title,
    focusVisible: title.matches(':focus-visible'), outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineOffset: cs.outlineOffset,
    boxShadow: cs.boxShadow, titleW: Math.round(r.width), infoW: Math.round(info.width), text: (title.textContent || '').trim() };
}
"""


def run_drawer_title_focus(browser, port, name, width, height, shots_dir):
    print(f"\n-- DRAWER TITLE FOCUS (consolidation pass) en {name} {width}x{height} --")
    for mode in ("keyboard", "pointer"):
        page = browser.new_page(viewport={"width": width, "height": height}, has_touch=(mode == "pointer"))
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
        page.wait_for_selector("#startBtn")
        pt = page.evaluate(DRAWER_TITLE_SETUP_JS, {"answers": ANSWERS})
        if mode == "keyboard":
            page.keyboard.press("Tab")
            page.evaluate("() => openResultCardDrawer(document.querySelector('#resultsScreen [data-id][data-tier]'))")
        else:
            page.mouse.click(pt["x"], pt["y"])
        page.wait_for_timeout(800)
        r = page.evaluate(DRAWER_TITLE_PROBE_JS)
        if shots_dir:
            os.makedirs(shots_dir, exist_ok=True)
            page.screenshot(path=os.path.join(shots_dir, f"drawer-title-focus-{mode}-{name}-{width}x{height}.png"))
        tag = f"[en/{name}/{mode}]"
        check(f"{tag} the drawer opened without a page error and the title holds focus (focus entry unchanged)",
              not errors and r["open"] and r["focused"], f"errors={errors[:1]} open={r['open']} focused={r['focused']} text={r['text']!r}")
        if mode == "keyboard":
            check(f"{tag} the title matches :focus-visible and draws the author ring - 3px solid outline at a 5px offset with the halo, not the UA rectangle",
                  r["focusVisible"] and r["outlineStyle"] == "solid" and r["outlineWidth"] == "3px" and r["outlineOffset"] == "5px" and r["boxShadow"] != "none",
                  f"focusVisible={r['focusVisible']} outline={r['outlineStyle']} {r['outlineWidth']} offset={r['outlineOffset']} shadow={r['boxShadow'][:40]}")
            short = len(r["text"]) <= 22
            check(f"{tag} the ring hugs the title text (fit-content narrower than its column{'' if short else '; long name wraps, width capped'})",
                  (r["titleW"] < r["infoW"] - 24) if short else (r["titleW"] <= r["infoW"]),
                  f"titleW={r['titleW']} infoW={r['infoW']} text={r['text']!r}")
        else:
            check(f"{tag} a pointer opening never draws the browser-default ring: either no ring (no :focus-visible match) or the author ring (3px solid with the halo)",
                  r["outlineStyle"] in ("none", "solid") and (r["outlineStyle"] == "none" or (r["outlineWidth"] == "3px" and r["boxShadow"] != "none")),
                  f"focusVisible={r['focusVisible']} outline={r['outlineStyle']} {r['outlineWidth']} shadow={r['boxShadow'][:40]}")
        page.close()


# Wave 3 / X4 (North Star ruling D1, 2026-08-31): a product source whose
# natural aspect ratio exceeds 3 is a banner crop — `cover` showed a blurred
# upscaled strip of the two Tempur-Pedic Gold sources (4.05:1 / 4.42:1) on
# every surface. dfTagBannerImage() tags such images at load; CSS letterboxes
# them on a white mat, outranking even the drawer hero's inline cover style.
# This pass renders Results, waits for the real image loads, and proves the
# tagging is exact in both directions, then opens the drawer on the banner
# mattress and proves the inline style lost.
BANNER_JS = r"""
async (ARGS) => {
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  await new Promise((res) => setTimeout(res, 250));
  const settleImg = (i) => (i.complete ? Promise.resolve() : new Promise((res) => {
    i.addEventListener('load', res, { once: true }); i.addEventListener('error', res, { once: true }); }));
  await Promise.all(Array.from(document.images).map(settleImg));
  await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  const info = (i) => ({ src: (i.currentSrc || i.src).split('/').pop(), ar: i.naturalHeight ? +(i.naturalWidth / i.naturalHeight).toFixed(2) : 0,
                         tagged: i.classList.contains('df-img--banner'), fit: getComputedStyle(i).objectFit });
  const results = Array.from(document.images).filter((i) => i.naturalWidth).map(info);
  const banner = _resultsState.tierData.gold.find((m) => {
    const el = document.querySelector('#resultsScreen [data-id="' + m.id + '"] img');
    return el && el.naturalHeight && el.naturalWidth / el.naturalHeight > 3;
  });
  let drawer = null;
  if (banner) {
    openResultCardDrawer(document.querySelector('#resultsScreen [data-id="' + banner.id + '"]'));
    await new Promise((res) => setTimeout(res, 500));
    const h = document.querySelector('.drawer-hero img');
    if (h) { await settleImg(h); await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res))); drawer = info(h); }
  }
  return { results, bannerModel: banner ? banner.name : null, drawer };
}
"""


def run_banner_fallback(browser, port, shots_dir):
    print("\n-- BANNER FALLBACK (X4 / Wave 3) 1194x748 --")
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(BANNER_JS, {"answers": ANSWERS})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, "banner-fallback-1194x748.png"))
    banners = [i for i in r["results"] if i["ar"] > 3]
    standards = [i for i in r["results"] if 0 < i["ar"] <= 3]
    check("Results rendered with a banner-crop Gold source present (the re-export gap this fallback covers)",
          not errors and len(banners) >= 1 and bool(r["bannerModel"]), f"errors={errors[:1]} banner={r['bannerModel']}")
    check("every banner-crop image (AR > 3) is tagged and letterboxes (computed object-fit: contain)",
          bool(banners) and all(i["tagged"] and i["fit"] == "contain" for i in banners), str(banners[:4]))
    check(f"no standard source is tagged ({len(standards)} checked)",
          all(not i["tagged"] for i in standards), str([i for i in standards if i["tagged"]][:4]))
    check("the drawer hero on the banner mattress letterboxes despite its inline cover style (!important won)",
          r["drawer"] is not None and r["drawer"]["tagged"] and r["drawer"]["fit"] == "contain", str(r["drawer"]))
    page.close()


# X10 (North Star ruling D7, 2026-08-31): every Sleep System decision rebuilds
# all four regions, and keyboard focus fell to <body> each time — the
# salesperson lost their place on every decision and step change. The repair
# restores focus to the control with the SAME data-* identity (the action name
# flips select-item <-> remove-item), else the step heading. This pass drives
# three real keyboard activations and reads where focus actually landed.
SS_FOCUS_SETUP_JS = r"""
async (ARGS) => {
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  showProfileScreen();
  window.showResults();
  (function(__id) { window.chooseFinalist(__id); })(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results');
  window.showAccessories();
  await new Promise((res) => setTimeout(res, 400));
  return (document.querySelector('.screen.active') || {}).id;
}
"""
SS_FOCUS_PROBE_JS = r"""
() => { const ae = document.activeElement; let fv = null; try { fv = ae && ae.matches(':focus-visible'); } catch (e) {}
  const attr = (a) => (ae && ae.getAttribute) ? ae.getAttribute(a) : null;
  const current = Array.from(document.querySelectorAll('#sleepSystemRail [aria-current="step"]'));
  return { tag: ae && ae.tagName, action: attr('data-sleep-action'),
           identity: attr('data-position') || attr('data-item-id') || attr('data-step') || attr('data-status') || '',
           fv, ariaCurrentCount: current.length, ariaCurrentStep: current[0] ? current[0].getAttribute('data-step') : null }; }
"""


def run_sleep_system_focus(browser, port, shots_dir):
    print("\n-- SLEEP SYSTEM keyboard place (X10) 1194x748 --")
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    screen = page.evaluate(SS_FOCUS_SETUP_JS, {"answers": ANSWERS})
    check("X10 setup reached the Sleep System without a page error", screen == "accessoriesScreen" and not errors,
          f"screen={screen} errors={errors[:1]}")
    # 1. Enter on a demo-position tile: the re-render must hand focus back to
    #    the SAME tile (identity, not action name).
    page.focus("#sleepSystemMain [data-sleep-action='demo-position'][data-position='flat']")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    r = page.evaluate(SS_FOCUS_PROBE_JS)
    check("[demo-position] focus survives the re-render on the same tile, still :focus-visible",
          r["action"] == "demo-position" and r["identity"] == "flat" and r["fv"] is True, str(r))
    # 2. Enter on the base's add control: it flips to remove-item with the same
    #    data-item-id, and focus must follow the identity across the flip.
    item_id = page.evaluate("() => { const b = document.querySelector(\"#sleepSystemMain [data-sleep-action='select-item']\"); return b && b.getAttribute('data-item-id'); }")
    check("[select-item] an add control exists on the triggered adjustability step", bool(item_id), str(item_id))
    if item_id:
        page.focus(f"#sleepSystemMain [data-sleep-action='select-item'][data-item-id='{item_id}']")
        page.keyboard.press("Enter")
        page.wait_for_timeout(500)
        r2 = page.evaluate(SS_FOCUS_PROBE_JS)
        check("[select-item] after adding, focus sits on the SAME item's remove control (identity survived the action flip)",
              r2["action"] == "remove-item" and r2["identity"] == item_id and r2["fv"] is True, str(r2))
    # 3. Enter on a rail step: the rebuilt rail hands focus to the equivalent
    #    step control, and aria-current="step" moves with the active step.
    page.focus("#sleepSystemRail [data-sleep-action='step'][data-step='support']")
    page.keyboard.press("Enter")
    page.wait_for_timeout(500)
    r3 = page.evaluate(SS_FOCUS_PROBE_JS)
    check("[rail] focus lands on the re-rendered support step and aria-current=\"step\" marks it exactly once",
          r3["action"] == "step" and r3["identity"] == "support" and r3["ariaCurrentCount"] == 1 and r3["ariaCurrentStep"] == "support", str(r3))
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, "sleep-system-focus-1194x748.png"))
    check("X10: no page error during the keyboard path", not errors, str(errors)[:120])
    page.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--screenshots", default="", help="directory to save a PNG per viewport (outside the repo)")
    args = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("playwright is not installed: python -m pip install playwright && python -m playwright install chromium")
        return 2
    server, port = start_server()
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for name, w, h in VIEWPORTS:
                run_viewport(browser, port, name, w, h, args.screenshots)
            for name, w, h in VIEWPORTS[:2]:
                run_summary(browser, port, name, w, h, args.screenshots)
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:2]:
                    run_sleep_system_header(browser, port, name, w, h, lang, args.screenshots)
            run_compare_label(browser, port, args.screenshots)
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:2]:
                    run_heading_focus(browser, port, name, w, h, lang, args.screenshots)
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:2]:
                    run_compare_tray_pill(browser, port, name, w, h, lang, args.screenshots)
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:2]:
                    run_touch_floor(browser, port, name, w, h, lang, args.screenshots)
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:3]:
                    run_drawer_footer(browser, port, name, w, h, lang, args.screenshots)
            for name, w, h in VIEWPORTS[:2]:
                run_drawer_title_focus(browser, port, name, w, h, args.screenshots)
            run_banner_fallback(browser, port, args.screenshots)
            run_sleep_system_focus(browser, port, args.screenshots)
            run_forced_colors(browser, port, args.screenshots)
            run_forced_colors_states(browser, port, args.screenshots)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(f"\nSleep Plan layout check: {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
