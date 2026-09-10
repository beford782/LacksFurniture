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
(`python -m pip install -r tools/requirements-suite.txt && python -m playwright install chromium`).

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
import json
import os
import re
import sys
import threading

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# The deployment's configured retailer name (data/store-config.json); the E2-A
# chrome pass proves the Plan's config-derived attribution renders it.
with open(os.path.join(REPO, "data", "store-config.json"), encoding="utf-8") as _cfg:
    STORE_NAME = json.load(_cfg).get("storeName", "")

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
  // Final-gate finding F1 (Blake, mounted iPad landscape, 2026-09-10): the
  // featured card's picture ran under its text. The image box and the body are
  // grid neighbours; the box (and the img inside it) must end before the body
  // starts, and the box must stay inside the card.
  const card = document.querySelector('#sleepSystemMain .sleep-system__featured');
  const box = card && card.querySelector('.sleep-system__featured-image');
  const img = box && box.querySelector('img');
  const body = card && card.querySelector('.sleep-system__featured-body');
  const featured = card ? { card: rect(card), box: rect(box), img: rect(img), body: rect(body) } : null;
  return {
    barVisible: !!bar, title, back, review, bar,
    barOverTitle: inter(bar, title), barOverBack: inter(bar, back), barOverReview: inter(bar, review),
    featured,
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
    f = r.get("featured")
    check("F1: the featured card renders with an image box, an image and a body",
          bool(f and f["card"] and f["box"] and f["img"] and f["body"]), str(f)[:160])
    if f and f["box"] and f["img"] and f["body"] and f["card"]:
        check("F1: the image box ends before the body column starts (no picture over text)",
              f["box"]["x"] + f["box"]["w"] <= f["body"]["x"] + 0.5,
              f"box right={f['box']['x'] + f['box']['w']:.0f} body left={f['body']['x']:.0f}")
        check("F1: the image itself stays inside its box and before the body",
              f["img"]["x"] + f["img"]["w"] <= f["body"]["x"] + 0.5 and f["img"]["x"] >= f["box"]["x"] - 0.5,
              f"img right={f['img']['x'] + f['img']['w']:.0f} body left={f['body']['x']:.0f}")
        check("F1: the image box stays inside the card",
              f["box"]["x"] + f["box"]["w"] <= f["card"]["x"] + f["card"]["w"] + 0.5,
              f"box right={f['box']['x'] + f['box']['w']:.0f} card right={f['card']['x'] + f['card']['w']:.0f}")
    page.close()


# E2-A chrome normalisation (cohesion experiment E2 alternative (a), ruled
# 2026-08-30; candidate-only under the 2026-09-06 direction): the last two dark
# page headers (Plan, Summary) are hidden like every other screen's, which
# makes the fixed session utility card their top-band neighbour, and the card
# is pinned to one light pairing on the quiz and Review so the persistent
# element never flips polarity. This pass renders the quiz, the Plan and the
# Summary in EN and ES at both mounted tablet viewports and proves: no header
# is displayed on any of them; the card's computed surface is the same light
# surface on all three; the card's box intersects neither the heading nor the
# Back control on the Plan and the Summary; the heading still takes focus; the
# Plan's config-derived attribution renders; no horizontal scroll.
CHROME_JS = r"""
async (ARGS) => {
  const ANS = ARGS.answers;
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const rect = (el) => {
    if (!el) return null;
    const b = el.getBoundingClientRect();
    if (b.width === 0 && b.height === 0) return null;
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  };
  const inter = (a, b) => !!(a && b && !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y));
  const snap = (titleId, backId) => {
    const header = document.querySelector('.header');
    const bar = document.querySelector('.session-utility');
    const doc = document.documentElement;
    const barRect = rect(bar);
    const backRect = backId ? rect(document.getElementById(backId)) : null;
    // Control boundaries on the card: the resting (unpressed) language pill
    // and Restart, as the browser actually resolves them.
    const resting = document.querySelector('.session-utility__btn[aria-pressed="false"]');
    const restart = document.querySelector('.session-utility__restart');
    return {
      headerDisplay: header ? getComputedStyle(header).display : 'missing',
      barBg: bar ? getComputedStyle(bar).backgroundColor : null,
      restingBorder: resting ? getComputedStyle(resting).borderTopColor : null,
      restartBorder: restart ? getComputedStyle(restart).borderTopColor : null,
      restartFill: restart ? getComputedStyle(restart).backgroundColor : null,
      barOverTitle: inter(barRect, rect(document.getElementById(titleId))),
      barOverBack: backId ? inter(barRect, backRect) : false,
      barBottom: barRect ? barRect.y + barRect.h : null,
      backTop: backRect ? backRect.y : null,
      activeElement: document.activeElement && document.activeElement.id,
      scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth,
    };
  };
  const out = {};
  startQuiz(); await wait(250); out.quiz = snap('questionHeadline', null);
  showProfileScreen();
  window.showResults();
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
  window.showSleepPlan('results'); await wait(300);
  out.plan = snap('sleepPlanTitle', 'sleepPlanBack');
  const attr = document.getElementById('sleepPlanAttribution');
  out.planAttribution = attr ? { hidden: attr.hidden, text: attr.textContent } : null;
  window.showSavedPicks(); await wait(300);
  out.summary = snap('hf2ReviewTitle', 'hf2BackToMatches');
  return out;
}
"""


def run_chrome_normalisation(browser, port, name, width, height, lang, shots_dir):
    print(f"\n-- E2-A chrome: headers hidden, utility card light, clear of Plan/Summary headings {lang} {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(CHROME_JS, {"answers": ANSWERS, "lang": lang})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"chrome-summary-{lang}-{name}-{width}x{height}.png"))
    check("quiz, Plan and Summary render without a page error", not errors, str(errors[:1]))
    for screen in ("quiz", "plan", "summary"):
        check(f"{screen}: no page header is displayed", r[screen]["headerDisplay"] == "none", r[screen]["headerDisplay"])
    check("the utility card keeps ONE light surface on the quiz, the Plan and the Summary (no polarity flip)",
          r["quiz"]["barBg"] == r["plan"]["barBg"] == r["summary"]["barBg"] == "rgb(255, 253, 248)",
          f"quiz={r['quiz']['barBg']} plan={r['plan']['barBg']} summary={r['summary']['barBg']}")
    # WCAG 1.4.11: a control boundary that identifies the control is non-text
    # UI and needs 3:1 against its immediate background. Measured from the
    # computed colours the browser resolves on each screen (rgb(...) strings,
    # so any alpha would surface as rgba and fail the parse).
    for screen in ("quiz", "plan", "summary"):
        s = r[screen]
        rb, rf, sb, sf = parse_rgb(s["restingBorder"]), parse_rgb(s["barBg"]), parse_rgb(s["restartBorder"]), parse_rgb(s["restartFill"])
        ok_parse = all(v is not None for v in (rb, rf, sb, sf))
        check(f"{screen}: the resting language pill's boundary clears 3:1 on the card surface (computed)",
              ok_parse and contrast(rb, rf) >= 3.0, f"{s['restingBorder']} on {s['barBg']}" + (f" = {contrast(rb, rf):.2f}:1" if ok_parse else ""))
        check(f"{screen}: the Restart boundary clears 3:1 on the card surface and against its own fill (computed)",
              ok_parse and contrast(sb, rf) >= 3.0 and contrast(sb, sf) >= 3.0,
              f"{s['restartBorder']} on {s['barBg']} / {s['restartFill']}" + (f" = {contrast(sb, rf):.2f}:1 / {contrast(sb, sf):.2f}:1" if ok_parse else ""))
    for screen, title in (("plan", "sleepPlanTitle"), ("summary", "hf2ReviewTitle")):
        check(f"{screen}: the heading takes focus", r[screen]["activeElement"] == title, f"active={r[screen]['activeElement']}")
        check(f"{screen}: the utility card does not intersect the h1", not r[screen]["barOverTitle"])
        check(f"{screen}: the utility card does not intersect the Back control", not r[screen]["barOverBack"])
        # The card sits top-right and the Back control top-left, so a box
        # intersection alone cannot prove the clearance; the Back control's
        # top edge must clear the card's bottom edge (the reserved band).
        check(f"{screen}: the Back control starts below the utility card's bottom edge (clearance reserved)",
              r[screen]["backTop"] is not None and r[screen]["barBottom"] is not None and r[screen]["backTop"] >= r[screen]["barBottom"],
              f"backTop={r[screen]['backTop']} barBottom={r[screen]['barBottom']}")
        check(f"{screen}: no horizontal document scroll", r[screen]["scrollWidth"] <= r[screen]["clientWidth"],
              f"{r[screen]['scrollWidth']}/{r[screen]['clientWidth']}")
    check("the Plan renders its config-derived attribution (storeName present in this deployment)",
          bool(r["planAttribution"]) and not r["planAttribution"]["hidden"] and STORE_NAME in r["planAttribution"]["text"],
          str(r["planAttribution"]))
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
  window.chooseFinalist(gold[0].id);
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
  // 2026-09-08 floor slice: the three controls this slice raised are reported
  // by geometry, so the pass proves they were walked, not merely not flagged.
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), minH: getComputedStyle(el).minHeight }; };
  const walked = {};
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
  walked.details = box(document.querySelector('.noct-toppick .noct-card-details'));
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
  window.chooseFinalist(gold[0].id);
  window.showSavedPicks();
  await wait(400);
  const strip = document.getElementById('hf2RsaStripBtn'); if (strip) { strip.click(); await wait(250); }
  found = found.concat(small('summary+roster'));
  // The roster's add row (name input + confirm) renders only after the
  // panel's add control is tapped; walk it too (2026-09-08 floor slice).
  const rosterAdd = document.querySelector('.hf2-rsa-panel__add'); if (rosterAdd) { rosterAdd.click(); await wait(250); }
  found = found.concat(small('summary+roster+addrow'));
  const rowInput = document.getElementById('hf2RsaAddInput'), rowConfirm = document.getElementById('hf2RsaAddConfirm');
  walked.rosterInput = box(rowInput); walked.rosterConfirm = box(rowConfirm);
  window.showEmailCapture();
  await wait(400);
  found = found.concat(small('take-home'));
  let live = (typeof emailDeliveryLive === 'function') ? emailDeliveryLive() : null;
  if (live === false) {
    const input = document.getElementById('emailInput'); if (input) input.value = 'preview@example.com';
    const send = document.getElementById('emailSendBtn'); if (send) { send.click(); await wait(1200); found = found.concat(small('take-home-confirmation')); }
  }
  return { found, live, walked };
}
"""
# The details control left this list in the 2026-09-08 accessibility-floor
# slice (candidate): it now declares the floor and is measured like its
# three 44px row-mates.
ALLOWED_SMALL = ("emailPrivacyLink",)


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
    check(f"[{lang}/{name}] every visible interactive control on the swept screens is >= 44x44 CSS px, except the one recorded exception ({len(accepted)} occurrences of the privacy link)",
          not offenders, "; ".join(f"{o['screen']}:{o['desc']} {o['w']}x{o['h']}" for o in offenders[:14]))
    w = r["walked"]
    check(f"[{lang}/{name}] the Results details control was walked and clears the floor by declaration and by render (was 31px, a recorded exception)",
          bool(w.get("details")) and w["details"]["h"] >= 44 and w["details"]["minH"] == "44px", str(w.get("details")))
    check(f"[{lang}/{name}] the roster add row was opened and its name input clears the floor (was 40px, never walked)",
          bool(w.get("rosterInput")) and w["rosterInput"]["h"] >= 44 and w["rosterInput"]["minH"] == "44px", str(w.get("rosterInput")))
    check(f"[{lang}/{name}] the roster add row's confirm clears the floor in both axes (was 40px tall)",
          bool(w.get("rosterConfirm")) and w["rosterConfirm"]["h"] >= 44 and w["rosterConfirm"]["w"] >= 44 and w["rosterConfirm"]["minH"] == "44px", str(w.get("rosterConfirm")))
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


# X7-B2 (candidate, 2026-09-07): the compact landscape quiz. The landscape
# quiz had no rendered check at all - the fold harness that measured the block
# never selected an option and never ran forced colors, which is how a
# forced-colors cascade defeat and a selected-state reflow both shipped
# unseen in the A2 evidence. This pass renders the slider and the two longest
# multi-select questions (plus the first question for the header geometry) at
# the mounted landscape viewport and the 1024x768 / 901px gate-floor controls,
# in both languages, and asserts: the single next action inside the fold with
# and without three selections; no document overflow on either axis for the
# English firmness layout; option cells at or above the 44px floor and
# geometrically identical resting vs selected; Next's declared 44px floor at
# its unchanged computed size; the utility card one row tall and clear of the
# eyebrow, the progress count and the headline by the card's own 8px inset;
# the same clearance under an emulated 24px safe-area inset (the body shifts
# with the card); and, under forced colors, the compact cell geometry kept
# with the selected cue's distinct boundary and readable native colours.
QUIZ_LANDSCAPE_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f = (v) => Math.round(v * 10) / 10;
  const R = (el) => { if (!el) return null; const r = el.getBoundingClientRect();
    return { top: f(r.top), bottom: f(r.bottom), left: f(r.left), right: f(r.right), w: f(r.width), h: f(r.height) }; };
  const T = (el) => { if (!el || !el.firstChild) return null; const rg = document.createRange(); rg.selectNodeContents(el);
    const r = rg.getBoundingClientRect(); return { top: f(r.top), bottom: f(r.bottom), left: f(r.left), right: f(r.right), w: f(r.width), h: f(r.height) }; };
  const hit = (a, b) => !!(a && b && a.w > 0 && b.w > 0 && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
  if (ARGS.lang === 'es') { await switchLanguage('es'); }
  startQuiz();
  await wait(300);
  answers['partner_sleep'] = 'partner';
  const vh = window.innerHeight;
  const envTop = (() => { const d = document.createElement('div'); d.style.paddingTop = 'env(safe-area-inset-top, 0px)';
    document.body.appendChild(d); const v = getComputedStyle(d).paddingTop; d.remove(); return v; })();
  const snap = () => {
    window.scrollTo(0, 0);
    const bar = document.querySelector('.session-utility');
    const eyebrow = document.querySelector('.noct-quiz-eyebrow');
    const pct = document.querySelector('.noct-quiz-progress-pct');
    const head = document.querySelector('#questionHeadline');
    const next = document.querySelector('.noct-quiz-next');
    const opts = Array.from(document.querySelectorAll('.noct-quiz-option'));
    const b = R(bar);
    return {
      barH: b ? b.h : null, barBottom: b ? b.bottom : null,
      nextBottom: next ? R(next).bottom : null, nextH: next ? R(next).h : null, nextMinH: next ? getComputedStyle(next).minHeight : null,
      docH: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth,
      minOptH: opts.length ? Math.min(...opts.map((o) => R(o).h)) : null,
      barHitsEyebrow: hit(b, T(eyebrow)), barHitsPct: hit(b, T(pct)), barHitsHeadline: hit(b, R(head)),
      clrPct: (b && pct) ? f(T(pct).top - b.bottom) : null,
      pctTextTop: pct ? T(pct).top : null, pctFont: pct ? getComputedStyle(pct).fontFamily : null,
      pctLineHeight: pct ? getComputedStyle(pct).lineHeight : null, pctFontSize: pct ? getComputedStyle(pct).fontSize : null,
    };
  };
  const out = { vh, envTop, questions: [] };
  for (const q of visibleQuestions()) {
    if (!ARGS.questions.includes(q.id)) continue;
    currentQuestion = QUESTIONS.indexOf(q);
    renderQuestion();
    await wait(120);
    const rest = snap();
    let sel = null;
    if (q.type !== 'slider') {
      const isMulti = q.type === 'multiple';
      const ids = q.options.map((o) => o.id);
      const b0 = document.getElementById('qopt-' + q.id + '-' + ids[0]);
      const before = { label: R(b0.querySelector('.opt-label')), box: R(b0) };
      const pick = isMulti ? [ids[0], ids[2], ids[4]] : [ids[0]];
      for (const id of pick) { selectOption(q.id, id, isMulti); await wait(60); }
      await wait(120);
      const b1 = document.getElementById('qopt-' + q.id + '-' + ids[0]);
      // The motion flag settles a selected option through a 200ms scaleY animation; a
      // read inside its tail shows a sub-pixel height and label offset that is the
      // animation, not a reflow. Measure only once every running animation has finished.
      await Promise.all(b1.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
      const b2 = document.getElementById('qopt-' + q.id + '-' + ids[1]);
      const cs1 = getComputedStyle(b1), cs2 = getComputedStyle(b2);
      b1.focus({ preventScroll: true });
      sel = Object.assign(snap(), {
        labelMovedX: f(R(b1.querySelector('.opt-label')).left - before.label.left),
        labelMovedY: f(R(b1.querySelector('.opt-label')).top - before.label.top),
        boxGrew: f(R(b1).h - before.box.h),
        selBorder: [cs1.borderTopWidth, cs1.borderLeftWidth].join('/'), restBorder: [cs2.borderTopWidth, cs2.borderLeftWidth].join('/'),
        selFg: cs1.color, selBg: cs1.backgroundColor, ringStyle: getComputedStyle(b1).outlineStyle, ringWidth: getComputedStyle(b1).outlineWidth,
      });
    }
    out.questions.push({ q: q.id, type: q.type, resting: rest, selected: sel });
  }
  return out;
}
"""

QUIZ_LANDSCAPE_QUESTIONS = ["mattress_size", "firmness", "sleep_issues", "health_conditions"]


def run_quiz_landscape(browser, port, name, width, height, lang, shots_dir, forced=False, inset=0, reference=None):
    mode = "forced colors" if forced else (f"safe-area inset {inset}px" if inset else "normal")
    print(f"\n-- X7-B2 landscape quiz: fold, cells, Next floor, utility clearance [{mode}] {lang} {name} {width}x{height} --")
    kw = {"viewport": {"width": width, "height": height}}
    if forced:
        kw["forced_colors"] = "active"
    page = browser.new_page(**kw)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    if inset:
        cdp = page.context.new_cdp_session(page)
        cdp.send("Emulation.setSafeAreaInsetsOverride", {"insets": {"top": inset, "left": 0, "bottom": 0, "right": 0}})
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(QUIZ_LANDSCAPE_JS, {"lang": lang, "questions": QUIZ_LANDSCAPE_QUESTIONS})
    if shots_dir:
        os.makedirs(shots_dir, exist_ok=True)
        page.screenshot(path=os.path.join(shots_dir, f"quiz-landscape-{mode.split()[0]}-{lang}-{name}-{width}x{height}.png"))
    tag = f"[{mode}] {lang} {name}"
    check(f"{tag}: the quiz renders without a page error", not errors, str(errors[:1]))
    if inset:
        check(f"{tag}: the emulated safe-area inset reaches env() (the scenario is real, not a no-op)", r["envTop"] == f"{inset}px", r["envTop"])
    by = {q["q"]: q for q in r["questions"]}
    vh = r["vh"]
    for qid in ("firmness", "sleep_issues", "health_conditions"):
        q = by[qid]
        check(f"{tag}: {qid} - the single next action ends inside the fold (resting)",
              q["resting"]["nextBottom"] is not None and q["resting"]["nextBottom"] <= vh, f"nextBottom={q['resting']['nextBottom']} vh={vh}")
        if q["selected"]:
            check(f"{tag}: {qid} - Next stays inside the fold with three selections in three rows",
                  q["selected"]["nextBottom"] <= vh, f"nextBottom={q['selected']['nextBottom']} vh={vh}")
    fm = by["firmness"]["resting"]
    check(f"{tag}: firmness - no horizontal document overflow", fm["scrollW"] <= fm["clientW"], f"{fm['scrollW']}/{fm['clientW']}")
    if not inset:
        check(f"{tag}: firmness - no vertical document overflow either (the headline fits its column)", fm["docH"] <= vh, f"docH={fm['docH']} vh={vh}")
    for qid in ("mattress_size", "sleep_issues", "health_conditions"):
        q = by[qid]
        check(f"{tag}: {qid} - every option cell clears the 44px floor", q["resting"]["minOptH"] is not None and q["resting"]["minOptH"] >= 44, str(q["resting"]["minOptH"]))
        s = q["selected"]
        check(f"{tag}: {qid} - selecting moves no label and grows no cell",
              s["labelMovedX"] == 0 and s["labelMovedY"] == 0 and s["boxGrew"] == 0, f"moved=({s['labelMovedX']},{s['labelMovedY']}) grew={s['boxGrew']}")
        if forced:
            check(f"{tag}: {qid} - the selected cue keeps a distinct boundary from its resting neighbour (geometry, not colour)",
                  s["selBorder"] != s["restBorder"], f"selected {s['selBorder']} vs resting {s['restBorder']}")
            check(f"{tag}: {qid} - the selected option's text is readable (system fg != bg)",
                  parse_rgb(s["selFg"]) is not None and parse_rgb(s["selBg"]) is not None and parse_rgb(s["selFg"]) != parse_rgb(s["selBg"]),
                  f"{s['selFg']} on {s['selBg']}")
            check(f"{tag}: {qid} - the focused option keeps a solid ring of at least 2px", s["ringStyle"] == "solid" and float(s["ringWidth"].replace("px", "")) >= 2, f"{s['ringStyle']} {s['ringWidth']}")
            if reference is not None:
                check(f"{tag}: {qid} - forced colors keeps the compact cell height of the normal landscape state",
                      abs(q["resting"]["minOptH"] - reference[qid]) < 1, f"forced {q['resting']['minOptH']} vs normal {reference[qid]}")
    nx = by["mattress_size"]["resting"]
    check(f"{tag}: Next declares its 44px floor and keeps its computed size above it", nx["nextMinH"] == "44px" and nx["nextH"] >= 44, f"min-height={nx['nextMinH']} h={nx['nextH']}")
    ms = by["mattress_size"]["resting"]
    check(f"{tag}: the utility card renders one row (the shipped labels cannot wrap it at this width)", ms["barH"] is not None and ms["barH"] <= 70, str(ms["barH"]))
    check(f"{tag}: the utility card does not intersect the eyebrow, the progress count or the headline",
          not ms["barHitsEyebrow"] and not ms["barHitsPct"] and not ms["barHitsHeadline"])
    # Visible-ink clearance below the fixed utility card, measured from the progress count's text
    # Range bounding box, which varies with the OS font that -apple-system / system-ui resolves to:
    #   Windows / Segoe UI mirror: 8px (the card's own inset);
    #   Linux CI sans-serif fallback: 6px.
    # 6px is therefore the AUTOMATED cross-platform minimum. The emulated 1194x748 viewport matches
    # the mounted iPad Pro's dimensions but is Chromium with the host font, not a physical-iPad /
    # Safari font measurement (Apple's system font there is not Segoe UI); that measurement belongs
    # to the deferred final device pass. The intersection checks above are the collision contract;
    # this one is the margin.
    check(f"{tag}: the progress count keeps at least the 6px automated cross-platform minimum visible-ink clearance below the card (Windows/Segoe UI mirror 8px, Linux CI sans-serif fallback 6px; the emulated viewport is not a physical-iPad font measurement)",
          ms["clrPct"] is not None and ms["clrPct"] >= 6,
          f"barBottom={ms['barBottom']} textTop={ms['pctTextTop']} clearance={ms['clrPct']} font-family={ms['pctFont']} font-size={ms['pctFontSize']} line-height={ms['pctLineHeight']}")
    page.close()
    return {qid: by[qid]["resting"]["minOptH"] for qid in ("mattress_size", "sleep_issues", "health_conditions")}


# X6 hover consumer class (candidate, 2026-09-08; roster form after the Codex
# review of the same day): every Results control whose hover, focus-visible or
# stateful paint changes its text or boundary colour, rendered and driven with
# a real pointer, in both languages and both colour modes. The roster below is
# the contract: every (control, state) pair it names must be OBSERVED, or the
# pass fails - a minimum count would not notice an omitted state. States are
# reached through the app itself, on one page per context, in an order that
# only ever adds state: resting controls first, then one comparison selection
# (the tray's Compare is disabled with one, its Clear is live), then a second
# selection (Compare enabled), then a save (saved Save, the picks pill), then
# a chosen finalist. Normal colours: text >= 4.5:1 on the surface it actually
# sits on and any PAINTED hover boundary >= 3:1 (a reserved border whose
# computed alpha is zero, the tier tabs' forced-colors idiom, is not a painted
# boundary and is skipped for exactly that reason). Forced colors: text and
# fill stay native (fg != bg) and stateful variants keep a boundary geometry
# distinct from their resting neighbour. The details control's focus-visible
# is reached by a real keyboard Tab, and the pass asserts the element MATCHES
# :focus-visible before it measures the text and the ring; a disabled tray
# Compare under an attempted pointer hover must keep its disabled paint.
RESULTS_HOVER_ROSTER = [
    # (key, selector, prep, states)  prep runs once, before the first read of that key
    ("details", ".noct-toppick .noct-card-details", "", ("resting", "hover", "focus-visible")),
    ("compare", ".noct-toppick .compare-btn", "", ("resting", "hover")),
    ("save", ".noct-toppick .noct-save-btn", "", ("resting", "hover")),
    ("finalist", ".noct-toppick .finalist-btn", "", ("resting", "hover")),
    ("tier tab", "#resultsScreen .noct-tier-tab:not(.active)", "", ("resting", "hover")),
    ("tier tab active", "#resultsScreen .noct-tier-tab.active", "", ("resting", "hover")),
    ("review back", "#resultsScreen .noct-results-review-btn", "", ("resting", "hover")),
    ("results CTA", "#resultsScreen .noct-results-cta", "", ("resting", "hover")),
    ("compare selected", ".noct-toppick .compare-btn.selected", "compare-1", ("resting", "hover")),
    ("tray Compare disabled", ".compare-tray-go:disabled", "", ("resting", "hover")),
    ("tray Clear", ".compare-tray-clear", "", ("resting", "hover")),
    ("tray Compare", ".compare-tray-go:not(:disabled)", "compare-2", ("resting", "hover")),
    ("save saved", ".noct-toppick .noct-save-btn.saved", "save", ("resting", "hover")),
    ("picks pill", ".noct-picks-pill", "", ("resting", "hover")),
    ("finalist chosen", ".noct-toppick .finalist-btn.chosen", "finalist", ("resting", "hover")),
]
RESULTS_HOVER_STATEFUL = {"compare selected": "compare", "save saved": "save", "finalist chosen": "finalist", "tier tab active": "tier tab"}
RESULTS_HOVER_OPEN_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  if (ARGS.lang === 'es') await switchLanguage('es');
  for (const k of Object.keys(ARGS.answers)) answers[k] = ARGS.answers[k];
  startQuiz(); await wait(200); window.showResults(); await wait(500);
  return true;
}
"""
RESULTS_HOVER_PREP_JS = r"""
async (prep) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gold = _resultsState.tierData.gold;
  if (prep === 'compare-1') window.toggleCompare(gold[0].id);
  if (prep === 'compare-2') window.toggleCompare(gold[1].id);
  if (prep === 'save') window._toggleSavePick(gold[0].id);
  if (prep === 'finalist') window.chooseFinalist(gold[0].id);
  await wait(450);
  return { compared: (typeof _compareSelection !== 'undefined' && _compareSelection) ? _compareSelection.length : null };
}
"""
RESULTS_HOVER_LOCATE_JS = r"""
async (sel) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const el = document.querySelector(sel);
  if (!el) return null;
  el.scrollIntoView({ block: 'center' }); await wait(150);
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
"""
RESULTS_HOVER_READ_JS = r"""
(sel) => {
  const b = document.querySelector(sel); if (!b) return null;
  const cs = getComputedStyle(b);
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const alpha = (c) => { const m = parse(c); return m ? (m.length < 4 ? 1 : m[3]) : null; };
  let el = b.parentElement, backdrop = null;
  while (el) { const bg = getComputedStyle(el).backgroundColor; if (alpha(bg) > 0) { backdrop = bg; break; } el = el.parentElement; }
  const effBg = alpha(cs.backgroundColor) > 0 ? cs.backgroundColor : backdrop;
  return { fg: cs.color, bg: cs.backgroundColor, effBg, backdrop, borderW: parseFloat(cs.borderTopWidth), borderStyle: cs.borderTopStyle,
    borderColor: cs.borderTopColor, borderAlpha: alpha(cs.borderTopColor), outline: cs.outlineStyle + ' ' + cs.outlineWidth + ' ' + cs.outlineColor,
    outlineColor: cs.outlineColor, outlineWidth: parseFloat(cs.outlineWidth), outlineStyle: cs.outlineStyle,
    hover: b.matches(':hover'), focusVisible: b.matches(':focus-visible'), active: document.activeElement === b, disabled: b.disabled === true,
    text: (b.textContent || '').trim().slice(0, 24) };
}
"""
RESULTS_HOVER_KEYBOARD_JS = r"""
() => {
  // Park keyboard focus on the tier tab strip, the nearest focusable BEFORE the
  // hero cluster in tab order, so a real Tab sequence reaches the details control.
  const tab = document.querySelector('#resultsScreen .noct-tier-tab');
  if (tab) tab.focus({ preventScroll: true });
  return !!tab;
}
"""


def run_results_hover_states(browser, port, lang, forced):
    mode = "forced colors" if forced else "normal colours"
    tag = f"[{mode}] {lang}"
    print(f"\n-- X6 hover consumer class, rendered roster {tag} tablet-landscape 1194x748 --")
    kw = {"viewport": {"width": 1194, "height": 748}}
    if forced:
        kw["forced_colors"] = "active"
    page = browser.new_page(**kw)
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    page.evaluate(RESULTS_HOVER_OPEN_JS, {"answers": ANSWERS, "lang": lang})
    observed = set()
    resting_border = {}

    def judge(key, state, r, rest=None):
        observed.add((key, state))
        fg, bg = parse_rgb(r["fg"]), (parse_rgb(r["effBg"]) if r["effBg"] else None)
        if forced:
            check(f"{tag} {key} {state}: text stays native and readable (fg != bg)", fg is not None and bg is not None and fg != bg, f"{r['fg']} on {r['effBg']}")
        else:
            ok_parse = fg is not None and bg is not None
            floor = 4.5
            if r["disabled"]:
                # An inactive control is exempt from the text floor; the assertion is that it is still legible ink on its fill.
                check(f"{tag} {key} {state}: disabled paint is measured (WCAG-exempt from 4.5:1) and stays legible >= 3:1",
                      ok_parse and contrast(fg, bg) >= 3, f"{r['fg']} on {r['effBg']}" + (f" = {contrast(fg, bg):.2f}:1" if ok_parse else ""))
            else:
                check(f"{tag} {key} {state}: text >= {floor}:1 on the surface it sits on", ok_parse and contrast(fg, bg) >= floor,
                      f"{r['fg']} on {r['effBg']}" + (f" = {contrast(fg, bg):.2f}:1" if ok_parse else ""))
            if state == "hover" and r["borderW"] > 0 and r["borderStyle"] != "none" and r["backdrop"] and not r["disabled"]:
                if rest is not None and r["borderColor"] == rest["borderColor"] and r["borderW"] == rest["borderW"]:
                    # Hover did not touch the boundary: it is the resting hairline, not a hover cue.
                    # Asserted unchanged and reported; the resting hairline's own ratio is a separate,
                    # pre-existing design question outside the hover consumer class.
                    bd, back = parse_rgb(r["borderColor"]), parse_rgb(r["backdrop"])
                    check(f"{tag} {key} hover: the boundary is the unchanged resting hairline, not a hover cue (observed {contrast(bd, back):.2f}:1)" if bd and back else f"{tag} {key} hover: the boundary is the unchanged resting hairline",
                          True)
                elif r["borderAlpha"] == 0:
                    check(f"{tag} {key} hover: a reserved transparent border (computed alpha 0) is excluded from the boundary floor, and only for that reason",
                          r["borderAlpha"] == 0, r["borderColor"])
                else:
                    bd, back = parse_rgb(r["borderColor"]), parse_rgb(r["backdrop"])
                    check(f"{tag} {key} hover: the painted boundary >= 3:1 on its backdrop", bd is not None and back is not None and contrast(bd, back) >= 3,
                          f"{r['borderColor']} on {r['backdrop']}" + (f" = {contrast(bd, back):.2f}:1" if bd and back else ""))

    for key, sel, prep, states in RESULTS_HOVER_ROSTER:
        if prep:
            info = page.evaluate(RESULTS_HOVER_PREP_JS, prep)
            if prep == "compare-1":
                check(f"{tag} the first comparison selection was made through the app (tray Compare disabled with one)", info.get("compared") in (1, None), str(info))
            if prep == "compare-2":
                check(f"{tag} the second comparison selection was made through the app (tray Compare enabled with two)", info.get("compared") in (2, None), str(info))
        c = page.evaluate(RESULTS_HOVER_LOCATE_JS, sel)
        check(f"{tag} {key}: the control renders on Results in this state", bool(c), sel)
        if not c:
            continue
        page.mouse.move(2, 2)
        page.wait_for_timeout(120)
        rest = page.evaluate(RESULTS_HOVER_READ_JS, sel)
        if "resting" in states:
            judge(key, "resting", rest)
        if key == "tray Compare disabled":
            check(f"{tag} tray Compare disabled: the control is really disabled after one selection", rest["disabled"], str(rest["disabled"]))
        if key == "tray Compare":
            check(f"{tag} tray Compare: the control is enabled after two selections", not rest["disabled"], str(rest["disabled"]))
        if "hover" in states:
            page.mouse.move(c["x"], c["y"])
            page.wait_for_timeout(250)
            hov = page.evaluate(RESULTS_HOVER_READ_JS, sel)
            check(f"{tag} {key} hover: the pointer is over the control (the state is real, not assumed)", bool(hov) and hov["hover"])
            if hov:
                judge(key, "hover", hov, rest)
                if key == "tray Compare disabled":
                    check(f"{tag} tray Compare disabled: an attempted pointer hover leaves the disabled paint unchanged",
                          hov["fg"] == rest["fg"] and hov["bg"] == rest["bg"] and hov["borderColor"] == rest["borderColor"],
                          f"resting {rest['fg']}/{rest['bg']} vs hover {hov['fg']}/{hov['bg']}")
            page.mouse.move(2, 2)
            page.wait_for_timeout(150)
        if "focus-visible" in states:
            parked = page.evaluate(RESULTS_HOVER_KEYBOARD_JS)
            reached = None
            for _ in range(24):
                page.keyboard.press("Tab")
                st = page.evaluate(RESULTS_HOVER_READ_JS, sel)
                if st and st["active"]:
                    reached = st
                    break
            check(f"{tag} {key} focus-visible: a real keyboard Tab sequence from the tier strip reaches the control", parked and reached is not None)
            if reached:
                check(f"{tag} {key} focus-visible: the element MATCHES :focus-visible under keyboard modality", reached["focusVisible"], str(reached["focusVisible"]))
                judge(key, "focus-visible", reached)
                if not forced:
                    ring, back = parse_rgb(reached["outlineColor"]), parse_rgb(reached["backdrop"] or reached["effBg"])
                    check(f"{tag} {key} focus-visible: a solid ring >= 2px is painted and clears 3:1 on the backdrop",
                          reached["outlineStyle"] == "solid" and reached["outlineWidth"] >= 2 and ring is not None and back is not None and contrast(ring, back) >= 3,
                          reached["outline"] + (f" = {contrast(ring, back):.2f}:1" if ring and back else ""))
                else:
                    check(f"{tag} {key} focus-visible: the ring stays a solid native outline under forced colors", reached["outlineStyle"] == "solid" and reached["outlineWidth"] >= 2, reached["outline"])
            page.evaluate("() => { if (document.activeElement) document.activeElement.blur(); }")
        if forced:
            if key in RESULTS_HOVER_STATEFUL:
                base = RESULTS_HOVER_STATEFUL[key]
                if base in resting_border:
                    rw_, rs_ = resting_border[base]
                    check(f"{tag} {key}: keeps a boundary geometry distinct from the resting {base} (width or style)",
                          (rest["borderW"], rest["borderStyle"]) != (rw_, rs_), f"resting {rw_}px {rs_} vs {rest['borderW']}px {rest['borderStyle']}")
            else:
                resting_border[key] = (rest["borderW"], rest["borderStyle"])
    # Modality negative control, run LAST because it toggles a support-card comparison: a real
    # pointer click focuses that Compare button WITHOUT matching :focus-visible, and the next
    # keyboard Tab lands on a control that DOES match. If the browser ever blurred that line,
    # the keyboard assertion on the details control above would prove nothing.
    pc = page.evaluate(RESULTS_HOVER_LOCATE_JS, ".noct-support-card .compare-btn")
    check(f"{tag} modality control: a support-card Compare renders for the pointer click", bool(pc))
    if pc:
        page.mouse.click(pc["x"], pc["y"])
        page.wait_for_timeout(400)
        clicked = page.evaluate(RESULTS_HOVER_READ_JS, ".noct-support-card .compare-btn")
        check(f"{tag} modality negative control: pointer-initiated focus does not match :focus-visible",
              bool(clicked) and clicked["active"] and not clicked["focusVisible"], str(clicked and (clicked["active"], clicked["focusVisible"])))
        page.keyboard.press("Tab")
        page.wait_for_timeout(120)
        tabbed = page.evaluate("() => { const a = document.activeElement; return a ? a.matches(':focus-visible') : null; }")
        check(f"{tag} modality positive control: the next keyboard Tab lands on a control that matches :focus-visible", tabbed is True, str(tabbed))
    expected = {(key, state) for key, _sel, _prep, states in RESULTS_HOVER_ROSTER for state in states}
    missing = sorted(expected - observed)
    check(f"{tag} every named control/state in the roster was observed ({len(observed)} of {len(expected)})", not missing, "; ".join(f"{k}:{s}" for k, s in missing))
    check(f"{tag} the hover roster renders without a page error", not errors, str(errors[:1]))
    page.close()

# Accessory rationale follows the language (deployed-preview review, 2026-09-08):
# the real app, English, choose a finalist, compare two, save one, add the
# recommended base and the Dri-Tec protector in the Sleep System, open the
# Consultation Summary, switch to Spanish and back. The two rationale lines
# must follow the language each time. The SETUP is proven before the switch
# (finalist, the ordered comparison pair, the saved pick, the cart's reason
# keys, the two Sleep System decisions), and the complete semantic snapshot
# (finalist, window._compareSelected, saved picks, cart, decisions) must be
# byte-identical at all three points: EN before, ES after the first switch,
# EN after switching back. A negative control clears the comparison pair and
# the saved picks in the Spanish state and requires the predicate to reject.
# Analytics is NOT part of this contract: syncAccessoryAnalytics() resolves
# the reason keys in the language active when a selection happens, and
# switchLanguage() does not re-run it; no consumer asked for live-language
# analytics, so the assertion is on the customer-facing surfaces only.
L10N_JS = r"""
async (A) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  startQuiz(); await wait(200);
  for (const k of Object.keys(A)) answers[k] = A[k];
  window.showResults(); await wait(400);
  const gold = _resultsState.tierData.gold;
  const ids = { finalist: gold[0].id, compare: [gold[0].id, gold[1].id], saved: gold[1].id };
  window.chooseFinalist(gold[0].id); window.toggleCompare(gold[0].id); window.toggleCompare(gold[1].id); window._toggleSavePick(gold[1].id); await wait(200);
  window.showAccessories(); await wait(400);
  setSleepSystemItem('base-tempur-ergo', true); setSleepSystemItem('protector-dritec', true); await wait(200);
  const snapshot = () => ({ finalist: window._favoriteMattressId, compare: (window._compareSelected || []).slice(),
    saved: (window._savedPicks || []).map((p) => p.id), cart: window._accCart, decisions: window._sleepSystemState.decisions });
  const state = () => JSON.stringify(snapshot());
  const lines = () => Array.from(document.querySelectorAll('#hf2AccessoriesList .hf2-acc-card__reason')).map((e) => e.textContent);
  const out = { ids, setup: snapshot() };
  window.showSavedPicks(); await wait(400);
  out.en1 = lines(); out.s1 = state(); out.planEn = getSelectedAccessoryPlan().map((a) => a.reason);
  await switchLanguage('es'); await wait(400);
  out.es = lines(); out.s2 = state(); out.planEs = getSelectedAccessoryPlan().map((a) => a.reason); out.lang2 = currentLang;
  // negative control of the preservation predicate: a Spanish state whose comparison pair and
  // saved picks were cleared must NOT equal the English snapshot (computed on a copy, the app is untouched)
  const cleared = snapshot(); cleared.compare = []; cleared.saved = []; out.sCleared = JSON.stringify(cleared);
  await switchLanguage('en'); await wait(400);
  out.en2 = lines(); out.s3 = state(); out.lang3 = currentLang;
  return out;
}
"""


def run_accessory_reason_language(browser, port, name, width, height, shots_dir):
    print(f"\n-- accessory rationale follows the language (EN -> ES -> EN on the Summary) {name} {width}x{height} --")
    page = browser.new_page(viewport={"width": width, "height": height})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(L10N_JS, ANSWERS)
    EN = ["Addresses your temperature concerns", "Targets the back pain you mentioned"]
    ES = ["Aborda tus preocupaciones de temperatura", "Se enfoca en el dolor de espalda que mencionaste"]
    ids, setup = r["ids"], r["setup"]
    check(f"[{name}] the journey renders without a page error", not errors, str(errors[:1]))
    # setup proof, before any switch
    check(f"[{name}] setup: the finalist is the chosen first Gold mattress", setup["finalist"] == ids["finalist"], f"{setup['finalist']} vs {ids['finalist']}")
    check(f"[{name}] setup: window._compareSelected holds the two Gold ids in order", setup["compare"] == ids["compare"], f"{setup['compare']} vs {ids['compare']}")
    check(f"[{name}] setup: the saved picks contain the saved Gold mattress", ids["saved"] in setup["saved"], str(setup["saved"]))
    cart = setup["cart"]
    check(f"[{name}] setup: the cart holds the base and the Dri-Tec protector with their reason keys (back_pain then snoring; hot)",
          set(cart.keys()) == {"base-tempur-ergo", "protector-dritec"} and cart["base-tempur-ergo"].get("reasonKeys") == ["back_pain", "snoring"]
          and cart["protector-dritec"].get("reasonKeys") == ["hot"] and "reasons" not in cart["base-tempur-ergo"] and "reasons" not in cart["protector-dritec"],
          str({k: v.get("reasonKeys") for k, v in cart.items()}))
    dec = setup["decisions"]
    check(f"[{name}] setup: the Sleep System decisions record both selected components",
          dec.get("adjustability", {}).get("status") == "selected" and dec.get("adjustability", {}).get("itemId") == "base-tempur-ergo"
          and dec.get("protection", {}).get("status") == "selected" and dec.get("protection", {}).get("itemId") == "protector-dritec", str(dec))
    # the lines follow the language
    check(f"[{name}] EN Summary: the two rationale lines are English", sorted(r["en1"]) == EN, str(r["en1"]))
    check(f"[{name}] EN plan / take-home projection carries the two English lines", sorted(r["planEn"]) == EN, str(r["planEn"]))
    check(f"[{name}] ES Summary after switchLanguage('es'): both lines are Spanish (the reported defect)", r["lang2"] == "es" and sorted(r["es"]) == ES, str(r["es"]))
    check(f"[{name}] ES Summary: no English rationale survives the switch", not any(l in EN for l in r["es"]))
    check(f"[{name}] ES plan / take-home projection follows the switch", sorted(r["planEs"]) == ES, str(r["planEs"]))
    check(f"[{name}] EN again after switchLanguage('en'): the lines return to English", r["lang3"] == "en" and sorted(r["en2"]) == EN, str(r["en2"]))
    # complete semantic snapshot, byte-identical at all three points
    check(f"[{name}] the complete semantic snapshot (finalist, comparison pair, saved picks, cart, decisions) is byte-identical EN -> ES", r["s1"] == r["s2"],
          "" if r["s1"] == r["s2"] else f"before={r['s1'][:160]} ... after={r['s2'][:160]}")
    check(f"[{name}] ...and byte-identical again after switching back to EN", r["s1"] == r["s3"])
    check(f"[{name}] negative control: a Spanish state with the comparison pair and saved picks cleared is rejected by the same predicate", r["s1"] != r["sCleared"])
    page.close()

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
  window.chooseFinalist(_resultsState.tierData.gold[0].id);
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
        print("playwright is not installed: python -m pip install -r tools/requirements-suite.txt && python -m playwright install chromium")
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
            for lang in ("en", "es"):
                for name, w, h in VIEWPORTS[:2]:
                    run_chrome_normalisation(browser, port, name, w, h, lang, args.screenshots)
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
                ref = None
                for name, w, h in (("tablet-landscape", 1194, 748), ("landscape-1024", 1024, 768), ("landscape-gate-floor", 901, 748)):
                    cells = run_quiz_landscape(browser, port, name, w, h, lang, args.screenshots)
                    if name == "tablet-landscape":
                        ref = cells
                run_quiz_landscape(browser, port, "tablet-landscape", 1194, 748, lang, args.screenshots, forced=True, reference=ref)
                run_quiz_landscape(browser, port, "tablet-landscape", 1194, 748, lang, args.screenshots, inset=24)
            for lang in ("en", "es"):
                run_results_hover_states(browser, port, lang, forced=False)
                run_results_hover_states(browser, port, lang, forced=True)
            for name, w, h in VIEWPORTS[:2]:
                run_accessory_reason_language(browser, port, name, w, h, args.screenshots)
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
