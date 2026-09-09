#!/usr/bin/env python3
"""Readiness gap G7 — the drawer promotion block's ink, measured rendered.

The defect (recorded 2026-08-14 as "promo muted lines invisible on light
drawer", reported-not-fixed; re-derived 2026-09-09 in
docs/daybreak-promo-muted-lines-2026-09-09.md): promotionDetailBlockHtml()
and promotionDrawerDetailHtml() inline-styled their detail, disclosure,
expiry, provenance, draft-note and store-wide lines warm white at .6/.5/.45
alpha and their badge label, source link and scenario disclosure bright
gold — a palette authored for the navy drawer shell — while the block they
render into (.drawer-promotion) is a cream panel. Production ships no
scenario, so the root page never rendered the block and the defect stayed
latent; the Black Friday demo page patched only the muted literal in its own
derived copy (transform T5), leaving the gold at ~2:1 there too.

The repair resolves every colour in the block through three tokens declared
on .drawer-promotion (--drawer-promo-accent / -muted / -note). This check
proves it RENDERED, in headless Chromium, on the real page:

  * shipped configuration (no scenario): the block is hidden and empty —
    production still renders no promotion;
  * the illustrative Black Friday scenario injected in memory exactly as
    tools/serve_daybreak_demo.py serves it, root page, EN and ES: the block
    is visible for a qualifying mattress, every text line in it has a
    contrast ratio of at least 4.5:1 (WCAG AA for text under 18pt) against
    the panel's rendered background at BOTH ends of its gradient, and no
    line is rendered with a translucent colour;
  * the committed demo bundle (demo/black-friday/, served from disk) passes
    the same measurement — the derived page inherits the tokens;
  * source pins: the tokens are declared once, neither promo function
    carries a warm-white or bright-gold literal any more, and the demo
    builder no longer patches the block's colour (T5 retired).

Requires the `playwright` package with Chromium installed (`python -m pip
install playwright && python -m playwright install chromium`); without it
the rendered section is reported as NOT RUN and the check fails, exactly
like tests/sleep_plan_layout_check.py.

Run: python tests/promo_muted_lines_check.py
"""

import hashlib
import json
import os
import re
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_daybreak_demo as demo_srv  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))
    return cond


def read(path):
    with open(os.path.join(REPO, path), encoding="utf-8") as f:
        return f.read()


def sha(path):
    with open(os.path.join(REPO, path), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


WATCHED = ["index.html", "data/store-config.json", "demo/black-friday/index.html",
           "demo/black-friday/data/store-config.json", "demo/daybreak-black-friday.json"]
before = {p: sha(p) for p in WATCHED}
html = read("index.html")
demo_html = read("demo/black-friday/index.html")
builder = read("tools/build_black_friday_demo.py")

MIN_RATIO = 4.5

# ---- source pins ----------------------------------------------------------------
print("Source pins:")
fn_detail = re.search(r"function promotionDetailBlockHtml\(p\) \{[\s\S]*?\n    \}", html)
fn_drawer = re.search(r"function promotionDrawerDetailHtml\(mattress\) \{[\s\S]*?\n    \}", html)
check("both promo render functions located", bool(fn_detail and fn_drawer))
fns = (fn_detail.group(0) if fn_detail else "") + (fn_drawer.group(0) if fn_drawer else "")
check("no warm-white literal (rgba(248,246,241,…)) remains in either promo function",
      "rgba(248,246,241" not in fns)
check("no bright-gold literal (--color-gold-bright) remains in either promo function",
      "--color-gold-bright" not in fns)
check("every colour in the two functions resolves through a --drawer-promo-* token",
      set(re.findall(r"color:\s*([^;\"']+)", fns)) <= {"var(--drawer-promo-muted)", "var(--drawer-promo-accent)", "var(--drawer-promo-note)"}
      and fns.count("var(--drawer-promo-") >= 6,
      str(set(re.findall(r"color:\s*([^;\"']+)", fns))))
block_css = re.search(r"\.drawer-promotion \{[\s\S]*?\n    \}", html)
check(".drawer-promotion declares the three tokens exactly once each",
      bool(block_css) and all(block_css.group(0).count(tok) == 1 for tok in
                              ("--drawer-promo-accent: var(--accent-ink);", "--drawer-promo-muted: #665D54;", "--drawer-promo-note: #7A7168;")))
check("the demo builder no longer patches the block's colour (T5 retired) and refuses the old literal",
      "rgba(74,63,48,0.78)" not in builder and '_expect(out, "rgba(248,246,241,0.6)", 0' in builder)
check("the committed demo page carries the token, not a hand-blended literal",
      "var muted = 'color:var(--drawer-promo-muted);';" in demo_html and "rgba(74,63,48,0.78)" not in demo_html)


# ---- colour maths ---------------------------------------------------------------
def parse_rgba(s):
    m = re.match(r"rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)", s or "")
    if not m:
        return None
    r, g, b = (float(m.group(i)) for i in (1, 2, 3))
    a = float(m.group(4)) if m.group(4) is not None else 1.0
    return (r, g, b, a)


def blend(fg, bg):
    """fg (r,g,b,a) composited over an opaque bg (r,g,b)."""
    a = fg[3]
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3))


def luminance(rgb):
    def ch(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(fg_rgb, bg_rgb):
    l1, l2 = luminance(fg_rgb), luminance(bg_rgb)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def gradient_stops(background_image, base):
    """The opaque colours at both ends of the block's gradient over `base`."""
    stops = re.findall(r"rgba?\([^)]*\)", background_image or "")
    if not stops:
        return [base]
    return [blend(parse_rgba(s), base) for s in stops]


# ---- rendered pass --------------------------------------------------------------
print("Rendered pass (headless Chromium):")


def serve(handler_cls):
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_cls)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


class Plain(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=REPO, **k)

    def log_message(self, *_):
        pass


WALK_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ANS = { "sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
                "temperature": "hot", "firmness": 5, "partner_sleep": "partner", "partner_disturbance": "sometimes",
                "body_type": "average", "mattress_size": "queen" };
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  if (ARGS.lang === 'es') { await switchLanguage('es'); await wait(200); }
  showProfileScreen();
  window.showResults();
  await wait(150);
  const ids = Object.keys(window._drawerData || {});
  // A qualifying mattress: the scenario's eligible brands (drawer records
  // carry the catalog record under `m`).
  const brandOf = (id) => { const d = window._drawerData[id]; return d && d.m ? d.m.brand : null; };
  const pick = ids.find((id) => ARGS.brands.includes(brandOf(id))) || ids[0];
  window.openMattressDrawer(pick, ids);
  await wait(200);
  const block = document.getElementById('drawerPromotion');
  const detail = document.getElementById('drawerPromotionDetail');
  const cs = getComputedStyle(block);
  // The first opaque ancestor background behind the block.
  let el = block.parentElement, base = null;
  while (el) {
    const c = getComputedStyle(el).backgroundColor;
    if (c && !/rgba\(\s*0,\s*0,\s*0,\s*0\)/.test(c) && c !== 'transparent') { base = c; break; }
    el = el.parentElement;
  }
  const lines = [];
  detail.querySelectorAll('*').forEach((n) => {
    const own = Array.from(n.childNodes).some((c) => c.nodeType === 3 && c.textContent.trim());
    if (!own) return;
    const s = getComputedStyle(n);
    lines.push({ tag: n.tagName.toLowerCase(), text: n.textContent.trim().slice(0, 60), color: s.color, fontSize: s.fontSize,
                 bg: s.backgroundColor });
  });
  return { pick, brand: brandOf(pick),
           visible: block.classList.contains('is-visible') && cs.display !== 'none',
           detailHtmlLength: detail.innerHTML.length,
           blockBg: cs.backgroundColor, blockImage: cs.backgroundImage, base, lines };
}
"""


def walk(browser, port, path, lang, brands):
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"http://127.0.0.1:{port}{path}", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(WALK_JS, {"lang": lang, "brands": brands})
    page.close()
    r["errors"] = errors
    return r


def expect_legible(tag, r):
    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
    check(f"{tag}: the drawer promotion block is visible for a qualifying mattress ({r.get('brand')})",
          r["visible"] and r["detailHtmlLength"] > 0)
    base = parse_rgba(r["base"]) or (255, 253, 248, 1.0)
    base_rgb = base[:3]
    if r["blockBg"] and parse_rgba(r["blockBg"]) and parse_rgba(r["blockBg"])[3] > 0:
        base_rgb = blend(parse_rgba(r["blockBg"]), base_rgb)
    stops = gradient_stops(r["blockImage"], base_rgb)
    check(f"{tag}: the block's rendered background is light at both gradient ends",
          stops and all(luminance(s) > 0.6 for s in stops), str([tuple(int(c) for c in s) for s in stops]))
    check(f"{tag}: at least five text lines rendered in the block", len(r["lines"]) >= 5, str(len(r["lines"])))
    worst = None
    translucent = []
    for line in r["lines"]:
        col = parse_rgba(line["color"])
        if col is None:
            continue
        if col[3] < 1.0:
            translucent.append(line["text"])
        # A line with its own opaque background (the disclosure box) is judged
        # against that; everything else against both gradient ends.
        own_bg = parse_rgba(line["bg"])
        bgs = [blend(own_bg, stops[0])] if own_bg and own_bg[3] > 0 else stops
        ratio = min(contrast(blend(col, bg), bg) for bg in bgs)
        if worst is None or ratio < worst[0]:
            worst = (ratio, line["text"], line["color"], line["fontSize"])
    check(f"{tag}: no line is rendered with a translucent colour", not translucent, str(translucent[:2]))
    check(f"{tag}: every line reaches {MIN_RATIO}:1 against the panel (worst {worst[0]:.2f}:1 — {worst[1]!r} {worst[2]} {worst[3]})" if worst else f"{tag}: lines measured",
          worst is not None and worst[0] >= MIN_RATIO)


def rendered():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        check("rendered pass: playwright is installed (python -m pip install playwright && python -m playwright install chromium)", False)
        return
    fx = demo_srv.demo.load_fixture()
    brands = sorted({b for it in fx["scenario"]["items"] for b in it.get("eligibleBrands", [])})
    injected, _ends = demo_srv.build_injected_config()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # Shipped: no scenario, the block never renders.
        s, port = serve(Plain)
        try:
            r = walk(browser, port, "/", "en", brands)
            check("shipped en: no page error", not r["errors"], "; ".join(r["errors"][:2]))
            check("shipped en: the promotion block stays hidden and empty (production renders no promotion)",
                  not r["visible"] and r["detailHtmlLength"] == 0)
            # The committed demo bundle, served from disk, inherits the tokens.
            for lang in ("en", "es"):
                expect_legible(f"demo bundle {lang}", walk(browser, port, "/demo/black-friday/", lang, brands))
        finally:
            s.shutdown()
            s.server_close()
        # Root page with the illustrative scenario injected in memory.
        s, port = serve(demo_srv.make_handler(json.dumps(injected, ensure_ascii=False).encode("utf-8")))
        try:
            for lang in ("en", "es"):
                expect_legible(f"root + injected scenario {lang}", walk(browser, port, "/", lang, brands))
        finally:
            s.shutdown()
            s.server_close()
        browser.close()


rendered()

print("Committed files:")
after = {p: sha(p) for p in WATCHED}
check("every watched committed file is byte-identical after the cycle", before == after,
      ", ".join(p for p in WATCHED if before[p] != after[p]))

print(f"\nPromo muted lines check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
