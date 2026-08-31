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
  window.chooseFinalist(top.id);
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
  out.lead = { text: lead.textContent, color: getComputedStyle(lead).color, bg: bgOf(lead) };
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
    check("the visible title is the Consultation Summary", "Consultation Summary" in r["title"])
    check("the chosen finalist appears in the lead line with the finalist vocabulary",
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
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
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
  const doc = document.documentElement;
  return {
    barVisible: !!bar, title, back, review, bar,
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
    check("the title, Back control and top Review control all render", bool(r["title"] and r["back"] and r["review"]),
          f"title={bool(r['title'])} back={bool(r['back'])} review={bool(r['review'])}")
    check("the utility bar does not intersect the h1",
          not r["barOverTitle"], f"bar={r['bar']} title={r['title']}")
    check("the utility bar does not intersect the Back control",
          not r["barOverBack"], f"bar={r['bar']} back={r['back']}")
    check("the utility bar does not intersect the top Review Sleep Plan control",
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
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
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
    # Sleep System -> Plan by keyboard (Enter on the top "Review Sleep Plan" control).
    page.focus("#sleepSystemReviewTop")
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
            run_forced_colors(browser, port, args.screenshots)
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    print(f"\nSleep Plan layout check: {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
