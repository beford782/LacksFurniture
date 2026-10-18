#!/usr/bin/env python3
"""Exact-product drawer visuals (store-config `productVisuals`), image
hardening, and the foundation-or-adjustable-base explainer (2026-10-17).

  1. shipped data: `productVisuals` is empty and the drawer renders no
     visuals section;
  2. the runtime gate renders an approved entry ONLY for the exact product
     (id AND name), refuses drafts, missing permission, a photo labelled
     generic, a non-gallery path and missing dimensions; caps at three;
  3. labels: a photo is "Another view / Detail photo of this model"; a
     generic illustration says "General illustration, not this model";
     reserved width/height, lazy loading, bilingual alt and caption;
  4. a visual that fails to load leaves no figure, no caption and no
     broken-image icon (the section hides); a failing hero photo removes
     itself; the drawer still works;
  5. the session wipe empties and hides the section;
  6. the base explainer: closed by default on the base step, decorative SVG
     (aria-hidden), dictionary text in both languages, opening it changes
     neither the plan nor the step's order; absent from other steps;
  7. no console errors except the deliberately failing images.

Run:  python tests/product_visuals_check.py
"""
import json
import os
import sys
import threading
from http.server import ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as sp  # noqa: E402

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


def _json(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return json.load(f)


CFG = _json("data/store-config.json")
CAT = _json("data/mattresses.json")
ACC = _json("data/accessories.json")
print("1. Shipped data")
check("shipped productVisuals is an empty array", CFG.get("productVisuals") == [])

srv = ThreadingHTTPServer(("127.0.0.1", 0), sp.make_handler(sp.encode(CFG), sp.encode(CAT), sp.encode(ACC)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_address[1]}/"
with open(os.path.join(REPO, "images", "accessories", sorted(os.listdir(os.path.join(REPO, "images", "accessories")))[0]), "rb") as f:
    JPEG = f.read()

READY = ("() => typeof appStartReady === 'function' && appStartReady() === true"
         " && typeof _dataLoaded === 'object' && _dataLoaded.accessories === true")
ANSWERS = {"sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
           "temperature": "hot", "firmness": 5, "partner_sleep": "partner",
           "partner_disturbance": "sometimes", "body_type": "average", "mattress_size": "queen"}
LOAD = """async (a) => { const w = (ms) => new Promise(r => setTimeout(r, ms));
  for (const k in a) answers[k] = a[k]; showProfileScreen(); window.showResults(); await w(350);
  return Object.keys(window._drawerData || {}); }"""
SECTION = """() => { const s = document.getElementById('drawerVisuals');
  return { hidden: s.hidden, html: s.innerHTML.length,
    figs: Array.from(s.querySelectorAll('figure')).map(f => ({ kind: f.dataset.visualKind, scope: f.dataset.visualScope,
      chip: f.querySelector('.drawer-visual__chip').textContent.trim(),
      cap: f.querySelector('.drawer-visual__caption').textContent.trim(),
      scope: ((f.querySelector('.drawer-visual__scope') || {}).textContent || '').trim(),
      img: { src: f.querySelector('img').getAttribute('src'), alt: f.querySelector('img').alt,
             w: f.querySelector('img').getAttribute('width'), h: f.querySelector('img').getAttribute('height'),
             lazy: f.querySelector('img').getAttribute('loading') } })),
    label: (document.getElementById('drawerVisualsLabel') || {}).textContent || '' }; }"""


def entry(m, **kw):
    e = {"productId": m["id"], "productName": m["name"], "kind": "view", "scope": "exact",
         "file": f"images/mattresses/gallery/{m['id']}-angle.jpg", "width": 1000, "height": 667,
         "alt": {"en": f"{m['name']}, three-quarter view", "es": f"{m['name']}, vista de tres cuartos"},
         "caption": {"en": "The same model from a three-quarter angle.",
                     "es": "El mismo modelo desde un ángulo de tres cuartos."},
         "sourceUrl": "https://www.lacks.com/x", "verifiedAt": "2026-10-17", "status": "approved",
         "permission": {"approvedBy": "Test", "approvedAt": "2026-10-17", "reference": "browser test"},
         "source": {"sku": "TEST-" + m["id"], "listingTitle": m["name"] + " Queen Mattress", "size": "queen"},
         "sizeScope": "all-sizes"}
    if kw.get("kind") in ("detail", "illustration") and "sizeScope" not in kw:
        e["sizeScope"] = "pictured-size"
    if kw.get("scope") == "generic" and kw.get("kind") == "illustration":
        e["source"], e["sizeScope"] = None, None
    e.update(kw)
    return e


from playwright.sync_api import sync_playwright  # noqa: E402

with sync_playwright() as p:
    browser = p.chromium.launch()
    try:
        pg = browser.new_page(viewport={"width": 1180, "height": 820})
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda x: errs.append(str(x)))

        def route(r):
            path = r.request.url.split("?", 1)[0]
            if path.endswith("-angle.jpg") or path.endswith("-detail.jpg") or path.endswith("-diagram.jpg"):
                return r.fulfill(status=200, body=JPEG, headers={"Content-Type": "image/jpeg"})
            if "/gallery/" in path:
                return r.fulfill(status=404, body="")
            return r.continue_()
        pg.route("**/images/mattresses/gallery/**", route)
        pg.goto(URL)
        pg.wait_for_function(READY, timeout=20000)
        ids = pg.evaluate(LOAD, ANSWERS)
        m0 = pg.evaluate("(id) => { const m = (window._drawerData[id] || {}).m || MATTRESSES.find(x => x.id === id); return { id: m.id, name: m.name }; }", ids[0])
        m1 = pg.evaluate("(id) => { const m = (window._drawerData[id] || {}).m || MATTRESSES.find(x => x.id === id); return { id: m.id, name: m.name }; }", ids[1])

        def open_with(entries, mid=None):
            pg.evaluate("(e) => { STORE_CONFIG.productVisuals = e; }", entries)
            pg.evaluate("(id) => { window.openMattressDrawer(id); }", mid or m0["id"])
            pg.wait_for_timeout(400)
            return pg.evaluate(SECTION)

        v = open_with([])
        check("shipped (empty) productVisuals: drawer visuals hidden and empty", v["hidden"] and v["html"] == 0, str(v))
        pg.keyboard.press("Escape")

        print("2/3. Exact-product gate and labelling")
        v = open_with([entry(m0)])
        check("an approved exact view renders for its own product",
              not v["hidden"] and len(v["figs"]) == 1 and v["figs"][0]["img"]["src"].endswith(f"{m0['id']}-angle.jpg"), str(v))
        f0 = v["figs"][0] if v["figs"] else {}
        check("labelled 'Another view of this model' with its caption",
              f0.get("chip") == "Another view of this model" and f0.get("cap") == "The same model from a three-quarter angle.", str(f0))
        check("reserved dimensions, lazy loading and a bilingual alt in English",
              f0.get("img", {}).get("w") == "1000" and f0.get("img", {}).get("h") == "667"
              and f0.get("img", {}).get("lazy") == "lazy" and f0.get("img", {}).get("alt", "").endswith("three-quarter view"), str(f0))
        check("the section heading is neutral ('A closer look')", v["label"] == "A closer look", v["label"])
        check("display scope: a whole-bed view names the pictured listing size and SKU",
              f0.get("scope") == f"Pictured: Queen listing, SKU TEST-{m0['id']}.", str(f0.get("scope")))
        pg.keyboard.press("Escape")
        cases = {
            "another product's entry": entry(m1),
            "id matches but the name differs (family resemblance)": entry(m0, productName=m0["name"] + " II"),
            "a draft": entry(m0, status="draft", permission=None),
            "a draft that carries a permission record": entry(m0, status="draft"),
            "approved without permission": entry(m0, permission=None),
            "a blank permission field": entry(m0, permission={"approvedBy": " ", "approvedAt": "2026-10-17", "reference": "x"}),
            "a photo labelled generic": entry(m0, scope="generic"),
            "a path outside the gallery": entry(m0, file="images/mattresses/the roma.jpg"),
            "a non-jpg file": entry(m0, file=f"images/mattresses/gallery/{m0['id']}-angle.png"),
            "missing dimensions": entry(m0, width=None),
            "a one-language caption": entry(m0, caption={"en": "x", "es": ""}),
            "no listing identity (id + name only)": entry(m0, source=None),
            "a listing missing its SKU": entry(m0, source={"sku": "", "listingTitle": "x", "size": "queen"}),
            "a detail photo claimed for all sizes": entry(m0, kind="detail", sizeScope="all-sizes",
                                                          file=f"images/mattresses/gallery/{m0['id']}-detail.jpg"),
            "an unknown size scope": entry(m0, sizeScope="queen"),
            "a generic illustration that names a listing": entry(m0, kind="illustration", scope="generic", sourceUrl=None,
                                                                  sizeScope="all-sizes",
                                                                  source={"sku": "1", "listingTitle": "x", "size": "queen"},
                                                                  file=f"images/mattresses/gallery/{m0['id']}-diagram.jpg"),
        }
        for label, e in cases.items():
            v = open_with([e])
            check(f"not rendered: {label}", v["hidden"] and not v["figs"], str(v)[:160])
            pg.keyboard.press("Escape")
        v = open_with([entry(m0, kind="illustration", scope="generic", sourceUrl=None,
                             file=f"images/mattresses/gallery/{m0['id']}-diagram.jpg")])
        check("a generic illustration renders labelled 'General illustration, not this model'",
              v["figs"] and v["figs"][0]["chip"] == "General illustration, not this model", str(v))
        pg.keyboard.press("Escape")
        v = open_with([entry(m0, kind="detail", file=f"images/mattresses/gallery/{m0['id']}-detail.jpg"),
                       entry(m0, kind="illustration", scope="exact", file=f"images/mattresses/gallery/{m0['id']}-diagram.jpg")])
        check("detail photo and exact illustration carry their own labels",
              [f["chip"] for f in v["figs"]] == ["Detail photo of this model", "Illustration of this model"], str(v))
        check("display scope: pictured-size images also say other sizes may differ",
              all(f["scope"].endswith("Other sizes may differ.") for f in v["figs"]), str([f["scope"] for f in v["figs"]]))
        pg.keyboard.press("Escape")
        v = open_with([entry(m0, file=f"images/mattresses/gallery/{m0['id']}-angle{n}-angle.jpg") for n in range(5)])
        check("at most three visuals per product", len(v["figs"]) == 3, str(len(v["figs"])))
        pg.keyboard.press("Escape")
        pg.evaluate("async () => { await switchLanguage('es'); }")
        pg.wait_for_timeout(300)
        v = open_with([entry(m0)])
        check("Spanish: label, caption, alt and heading",
              v["figs"] and v["figs"][0]["chip"] == "Otra vista de este modelo"
              and v["figs"][0]["cap"].startswith("El mismo modelo") and v["figs"][0]["img"]["alt"].endswith("vista de tres cuartos")
              and v["label"] == "Un vistazo más de cerca", str(v))
        pg.keyboard.press("Escape")
        pg.evaluate("async () => { await switchLanguage('en'); }")
        pg.wait_for_timeout(300)

        print("4. Broken images degrade gracefully")
        errs_before = len(errs)
        v = open_with([entry(m0, file=f"images/mattresses/gallery/{m0['id']}-missing.jpg")])
        pg.wait_for_timeout(600)
        v = pg.evaluate(SECTION)
        check("a visual that fails to load removes its figure and caption, and the section hides",
              v["hidden"] and not v["figs"] and v["html"] == 0, str(v))
        pg.keyboard.press("Escape")
        v = open_with([entry(m0), entry(m0, kind="detail", file=f"images/mattresses/gallery/{m0['id']}-missing.jpg")])
        pg.wait_for_timeout(600)
        v = pg.evaluate(SECTION)
        check("one failing visual among two leaves the good one and the section", not v["hidden"] and len(v["figs"]) == 1, str(v))
        pg.keyboard.press("Escape")
        pg.evaluate("(id) => { const m = window._drawerData[id].m; m._keep = m.imageUrl; m.imageUrl = 'images/mattresses/does-not-exist.jpg'; }", m0["id"])
        pg.evaluate("(id) => window.openMattressDrawer(id)", m0["id"])
        pg.wait_for_timeout(700)
        hero = pg.evaluate("(n) => ({ imgs: document.querySelectorAll('#drawerHeroImg img').length, open: document.getElementById('drawerName').textContent.indexOf(n) === 0 })", m0["name"])
        check("a failing hero photo removes itself (no broken-image icon) and the drawer still renders", hero["imgs"] == 0 and hero["open"], str(hero))
        pg.keyboard.press("Escape")
        pg.evaluate("(id) => { const m = window._drawerData[id].m; m.imageUrl = m._keep; delete m._keep; }", m0["id"])
        check("hero attributes are escaped (a quote in a name cannot break out)",
              pg.evaluate("""(id) => { const m = window._drawerData[id].m; const keep = m.name; m.name = 'A" onerror="window.__x=1';
                window.openMattressDrawer(id); const img = document.querySelector('#drawerHeroImg img');
                const ok = !!img && img.alt === 'A" onerror="window.__x=1' && window.__x === undefined; m.name = keep; return ok; }""", m0["id"]))
        pg.keyboard.press("Escape")

        # Comparison header: a photo that fails to load removes itself.
        pg.evaluate("(id) => { const m = window._drawerData[id].m; m._keep = m.imageUrl; m.imageUrl = 'images/mattresses/does-not-exist.jpg'; }", m0["id"])
        pg.evaluate("(ids) => { window._compareSelected = ids; window.openCompareModal(); }", [m0["id"], m1["id"]])
        pg.wait_for_timeout(800)
        cmp_ = pg.evaluate("""() => Array.from(document.querySelectorAll('.cmp-head-img')).map(w => w.querySelectorAll('img').length)""")
        check("comparison header: the failing photo is removed (no broken-image icon) and the other remains",
              sorted(cmp_) == [0, 1], str(cmp_))
        pg.keyboard.press("Escape")
        pg.evaluate("(id) => { const m = window._drawerData[id].m; m.imageUrl = m._keep; delete m._keep; window._compareSelected = []; }", m0["id"])

        print("5. Session wipe")
        open_with([entry(m0)])
        pg.keyboard.press("Escape")
        pg.evaluate("() => resetSessionState()")
        pg.wait_for_timeout(150)
        v = pg.evaluate(SECTION)
        check("resetSessionState empties and hides the visuals section", v["hidden"] and v["html"] == 0, str(v))

        print("6. Base explainer")
        pg.evaluate(LOAD, ANSWERS)
        pg.evaluate("() => { window.chooseFinalist(Object.keys(window._drawerData)[0]); window.showAccessories('base'); }")
        pg.wait_for_timeout(400)
        ex = pg.evaluate("""() => { const d = document.querySelector('#sleepSystemMain details.edu-base');
          return d ? { open: d.open, summary: d.querySelector('summary').textContent.trim(),
            svgs: Array.from(d.querySelectorAll('svg')).map(s => s.getAttribute('aria-hidden') + '|' + s.getAttribute('focusable')),
            text: d.textContent.replace(/\\s+/g, ' ').trim() } : null; }""")
        check("explainer present on the base step, closed by default",
              ex and ex["open"] is False and ex["summary"] == "Foundation or adjustable base?", str(ex))
        check("both diagrams are decorative (aria-hidden, not focusable)", ex and ex["svgs"] == ["true|false", "true|false"], str(ex))
        check("text names both options and the specialist confirmation, with no health or compatibility claim",
              ex and "Foundation" in ex["text"] and "Adjustable base" in ex["text"] and "confirmed by your specialist" in ex["text"]
              and not any(w in ex["text"].lower() for w in ("snor", "reflux", "pain", "relief", "compatible with all", "health")), ex and ex["text"])
        cart0 = pg.evaluate("() => JSON.stringify(window._accCart || {})")
        order0 = pg.evaluate("() => Array.from(document.querySelectorAll('#sleepSystemMain [data-item-id]')).map(b => b.dataset.itemId).join(',')")
        pg.click("#sleepSystemMain details.edu-base summary")
        pg.wait_for_timeout(150)
        check("opening it shows the panels and changes neither the plan nor the order",
              pg.evaluate("() => document.querySelector('#sleepSystemMain details.edu-base').open") is True
              and pg.evaluate("() => JSON.stringify(window._accCart || {})") == cart0
              and pg.evaluate("() => Array.from(document.querySelectorAll('#sleepSystemMain [data-item-id]')).map(b => b.dataset.itemId).join(',')") == order0)
        pg.evaluate("async () => { await switchLanguage('es'); }")
        pg.wait_for_timeout(300)
        es = pg.evaluate("() => { const d = document.querySelector('#sleepSystemMain details.edu-base'); return d ? d.textContent : ''; }")
        check("Spanish explainer text", "¿Base fija o base ajustable?" in es and "Base ajustable" in es and "Tu especialista confirma" in es, es[:120])
        pg.evaluate("async () => { await switchLanguage('en'); window._sleepSystemState.activeStep = 'pillow'; renderSleepSystem(); }")
        pg.wait_for_timeout(200)
        check("not shown on the other steps", pg.evaluate("() => !document.querySelector('#sleepSystemMain details.edu-base')"))

        # Reduced motion: the base explainer opens complete and nothing in it
        # animates (it has no motion in any mode).
        pg.emulate_media(reduced_motion="reduce")
        pg.evaluate("() => { window._sleepSystemState.activeStep = 'base'; renderSleepSystem(); }")
        pg.wait_for_timeout(200)
        pg.click("#sleepSystemMain details.edu-base summary")
        rm = pg.evaluate("""() => { const out = [];
          document.querySelectorAll('#sleepSystemMain details.edu-base, #sleepSystemMain details.edu-base *').forEach(el => {
            const cs = getComputedStyle(el);
            if ((cs.animationName && cs.animationName !== 'none') || cs.transitionDuration.split(',').some(d => parseFloat(d) > 0)) out.push(el.className); });
          return { open: document.querySelector('#sleepSystemMain details.edu-base').open, moving: out,
                   reduce: matchMedia('(prefers-reduced-motion: reduce)').matches }; }""")
        check("reduced motion: the base explainer opens complete and nothing in it animates",
              rm["reduce"] and rm["open"] and rm["moving"] == [], str(rm))
        pg.emulate_media(reduced_motion="no-preference")

        unexpected = [e for e in errs if "404" not in e and "Failed to load resource" not in e]
        check("no console errors beyond the deliberately missing images", not unexpected, str(unexpected[:3]))
        pg.close()
    finally:
        browser.close()
        srv.shutdown()
        srv.server_close()

print(f"\nproduct_visuals_check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
