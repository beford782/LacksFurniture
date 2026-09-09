#!/usr/bin/env python3
"""Readiness gap G2 — the send-nothing verification path for email and lead delivery.

docs/production-readiness-gaps-2026-09-09.md, G2: the live-mode client path
(`emailDeliveryLive()` true) had never been exercised without a real Apps
Script `/exec` and a seed inbox. This check executes the REAL
tools/serve_delivery_preview.py machinery — the served configuration, the
loopback app server and the stub endpoint on a second loopback origin — and
drives the real application through headless Chromium over it, in both
languages. It proves:

  * the harness contract: loopback-only binds, the served configuration is
    the production document with ONE key (gasUrl) replaced — live-capable by
    the validator's own rule, in memory only, refused at start-up if the
    committed gasUrl is ever non-blank, the committed blank pinned by the
    smoke and session-safety suites — the stub's documented answers and CORS
    header, every other path served from disk unchanged, and a full
    build/serve/exercise/stop cycle leaving every committed file
    byte-identical;
  * RENDERED, shipped (gasUrl blank, plain server): the preview data-use
    sentence, the preview note, the Save verb, the preview confirmation with
    its honesty card, NO request of any kind carrying the customer's values
    (zero POSTs; every request stays on loopback), and a console that shows
    the payload's shape and never the typed address;
  * RENDERED, live over the harness: the live data-use sentence, the preview
    note gone, the Sending/Sent verbs, exactly ONE POST at the stub with NO
    preflight (the fetch is the "simple request" sendResults() claims), the
    payload contract (the closed key set, `lang`, the contact values as
    typed, the closed lead, the accessory packet, no payment-position field),
    the live confirmation copy with the honesty card hidden, and still
    nothing off loopback;
  * every failure path in the real page: a client-side invalid address (no
    POST at all), a server-declared refusal (the shipped Code.gs answer,
    `canspam_not_configured`, and `invalid_email`), an endpoint that echoes
    the address back (classified `unclassified`, the address never printed),
    an HTTP 500, a non-JSON body and an unreachable endpoint — each with the
    page's own error copy, the diagnostic code from the closed set, and the
    confirmation withheld;
  * Code.gs executed against the RECORDED payload (the same whole-file
    `new Function` load tests/email_priorities_check.mjs uses): the shipped
    file refuses it (`canspam_not_configured`, no row, no send) and logs
    shape only; with the CAN-SPAM values rebound in harness scope it appends
    one Sheet row and sends one email to the recorded address with the
    payload's language, carrying the recorded lead and accessory.

Requires the `playwright` package with Chromium installed for the rendered
pass (`python -m pip install playwright && python -m playwright install
chromium`); without it the rendered section is reported as NOT RUN and the
check fails, exactly like tests/sleep_plan_layout_check.py. Requires `node`
for the Code.gs replay.

Run: python tests/delivery_harness_check.py
"""

import hashlib
import json
import os
import socket
import subprocess
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_delivery_preview as srv  # noqa: E402
import validation  # noqa: E402

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


def sha(path):
    with open(os.path.join(REPO, path), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


WATCHED = ["data/store-config.json", "Code.gs", "index.html", "data/dict-en.json",
           "data/dict-es.json", "data/mattresses.json", "data/quiz.json"]
before = {p: sha(p) for p in WATCHED}


def load(path):
    with open(os.path.join(REPO, path), encoding="utf-8") as f:
        return json.load(f)


def read(path):
    with open(os.path.join(REPO, path), encoding="utf-8") as f:
        return f.read()


PROD = load("data/store-config.json")
DICT = {"en": load("data/dict-en.json"), "es": load("data/dict-es.json")}
STORE = PROD.get("storeName", "")

# The synthetic customer every walk types. Nothing about it is real.
TYPED = {"name": "Harness Tester", "email": "harness.tester@example.test", "phone": "(956) 555-0100"}

# The payload's closed key set (index.html sendResults(), `const payload = {`).
PAYLOAD_KEYS = {
    "storeName", "name", "email", "phone", "sleepProfile", "mattressSize", "discount",
    "dreamCode", "passExpiration", "passScope", "passTerms", "rsa", "lang", "allMatches",
    "accessories", "lead", "matchesSource", "priorities", "consultation", "emailPromotions",
    "promoSpanishDraft", "promoScenario", "promoDisclosure", "branding", "financing",
}
MATCH_KEYS = {"name", "brand", "matchPct", "meetsMatchThreshold", "line", "imageUrl"}
LEAD_KEYS = {"kind", "name", "brand", "line", "imageUrl"}
# The accessory packet: name, category and imageUrl are what Code.gs renders;
# the projection on main also carries id and reason (the accessory payload
# minimisation slice narrows it to the three). Anything else is a leak.
ACCESSORY_REQUIRED = {"name", "category", "imageUrl"}
ACCESSORY_ALLOWED = ACCESSORY_REQUIRED | {"id", "reason"}
PAYMENT_POSITION = {"payPref", "payExplored", "payOpen", "interest", "monthly", "apr"}

# Copy the page owns (inline in index.html; not dictionary keys).
COPY = {
    "en": {
        "saved": "✓ Saved", "sent": "✓ Sent!",
        "invalid": "Please enter a valid email address.",
        "declined": "We couldn't send your email — please ask your sales specialist to re-send it.",
        "network": "Network error. Please try again.",
        "live_sub": "Check your inbox for your personalized results.",
        "preview_sub": f"Bring this to a {STORE} sleep specialist to pick up where you left off.",
        "note": "Preview mode: live email delivery isn't connected yet.",
    },
    "es": {
        "saved": "✓ Guardado", "sent": "✓ ¡Enviado!",
        "invalid": "Por favor ingresa un correo electrónico válido.",
        "declined": "No pudimos enviar tu correo — por favor pide a tu especialista de sueño que lo reenvíe.",
        "network": "Error de red. Por favor intenta de nuevo.",
        "live_sub": "Revisa tu bandeja de entrada para ver tus resultados personalizados.",
        "preview_sub": f"Llévalo a un especialista de sueño de {STORE} para continuar donde lo dejaste.",
        "note": "Modo de vista previa: la entrega de correo en vivo aún no está conectada.",
    },
}

# ---- the shipped state ----------------------------------------------------------
print("Shipped state:")
check("the committed store-config carries a blank gasUrl (preview mode)", not PROD.get("gasUrl"))
ok, errors = srv.validator_verdict(PROD)
check("the committed store-config validates clean", ok, "; ".join(errors[:2]))

# ---- the harness contract -------------------------------------------------------
print("Harness contract:")
try:
    srv.DeliveryHarness(bind="0.0.0.0")
    check("a non-loopback bind is refused by the harness class", False)
except ValueError:
    check("a non-loopback bind is refused by the harness class", True)
check("a non-loopback bind is refused by the command line (exit 2)", srv.main(["--bind", "0.0.0.0"]) == 2)
check("loopback spellings are accepted (127.0.0.1, localhost, ::1); a public address is not",
      srv._loopback("127.0.0.1") and srv._loopback("localhost") and srv._loopback("::1")
      and not srv._loopback("0.0.0.0") and not srv._loopback("192.168.1.10"))

h = srv.DeliveryHarness(respond="success").start()
try:
    served = dict(h.config)
    gas = served.pop("gasUrl")
    prod_rest = dict(PROD)
    prod_rest.pop("gasUrl", None)
    check("the served configuration is the production document with ONE key replaced (gasUrl)",
          served == prod_rest and gas == h.gas_url)
    check("the served gasUrl names the stub on loopback, on a different origin from the app",
          urlparse(gas).hostname == "127.0.0.1" and urlparse(gas).port == h.stub_port
          and h.stub_port != h.app_port and urlparse(gas).path == srv.STUB_PATH)
    ok, errors = srv.validator_verdict(h.config)
    check("the served configuration is LIVE-CAPABLE by the validator's own runtime-truthiness rule",
          validation._runtime_truthy(h.config["gasUrl"]))
    # Recorded as a fact, not relied on: the validator accepts the served
    # document because the retailer privacy prose is written mode-neutral
    # (nothing in it claims that nothing leaves the tablet). Were preview-only
    # wording ever authored there, this line would flip and the served
    # document would be refused - either way it never ships.
    check("the validator accepts it: the shipped retailer privacy prose carries no preview-only wording",
          ok, "; ".join(errors[:2]))
    check("the committed blank gasUrl is pinned by the smoke and session-safety suites",
          'check("gasUrl is blank (no live sends)"' in read("tests/smoke_check.py")
          and 'check("gasUrl remains blank (no live email delivery)"' in read("tests/session_safety_check.mjs"))
    real_load = srv._load

    def live_committed(path):
        doc = real_load(path)
        if path.endswith("store-config.json"):
            doc = dict(doc, gasUrl="https://script.google.com/macros/s/EXAMPLE/exec")
        return doc
    srv._load = live_committed
    try:
        check("the command line refuses to run over a committed NON-BLANK gasUrl (exit 3)",
              srv.main(["--respond", "success"]) == 3)
    finally:
        srv._load = real_load

    def get(url, method="GET", data=None):
        req = urllib.request.Request(url, data=data, method=method)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                return resp.status, dict(resp.headers), resp.read()
        except urllib.error.HTTPError as e:
            return e.code, dict(e.headers), e.read()

    st, hd, body = get(h.url + "data/store-config.json?nocache=1")
    check("app server: intercepted store-config (query string included): 200, JSON, no-store, the served gasUrl",
          st == 200 and hd.get("Content-Type", "").startswith("application/json")
          and hd.get("Cache-Control") == "no-store" and json.loads(body)["gasUrl"] == h.gas_url)
    st, hd, _ = get(h.url + "data/store-config.json", method="HEAD")
    check("app server: HEAD on the intercepted path carries the same headers", st == 200 and hd.get("Cache-Control") == "no-store")
    for rel in ("index.html", "data/quiz.json", "data/mattresses.json", "Code.gs"):
        st, _, body = get(h.url + rel)
        with open(os.path.join(REPO, rel), "rb") as f:
            check(f"app server: {rel} is served from disk unchanged (byte-equal)", st == 200 and body == f.read())

    st, hd, body = get(h.gas_url, method="POST", data=json.dumps({"email": TYPED["email"], "lang": "en"}).encode())
    check("stub: POST /exec answers 200 {success:true} with Access-Control-Allow-Origin * and no-store",
          st == 200 and json.loads(body) == {"success": True}
          and hd.get("Access-Control-Allow-Origin") == "*" and hd.get("Cache-Control") == "no-store")
    st, hd, _ = get(h.gas_url, method="OPTIONS")
    check("stub: OPTIONS /exec is answered 204 (and recorded, so a preflight can be proved absent)",
          st == 204 and hd.get("Access-Control-Allow-Origin") == "*")
    st, _, body = get(h.gas_url.replace(srv.STUB_PATH, "/other"), method="POST", data=b"{}")
    check("stub: a POST to any other path is 404", st == 404)
    st, hd, body = get(h.recorded_url)
    rec = json.loads(body)
    check("stub: /__delivery/recorded lists the /exec requests in order with the parsed JSON (the wrong-path POST is not one)",
          st == 200 and [r["method"] for r in rec] == ["POST", "OPTIONS"]
          and rec[0]["json"] == {"email": TYPED["email"], "lang": "en"} and rec[1]["body"] is None)
    shape = srv.shape_summary(rec[0]["json"])
    check("the console shape summary carries counts and set/unset flags, never a value",
          shape["email"] == "set" and shape["fields"] == 2 and TYPED["email"] not in json.dumps(shape))
    check("shape summary of a non-JSON body is {json: false}", srv.shape_summary(None) == {"json": False})
finally:
    h.stop()

print("Stub answers:")
EXPECT = {
    "invalid_email": (200, {"success": False, "error": "invalid_email"}),
    "canspam_not_configured": (200, {"success": False, "error": "canspam_not_configured"}),
    "send_failed": (200, {"success": False, "error": "send_failed"}),
    "http_500": (500, {"success": False, "error": "send_failed"}),
}
for mode, (status, doc) in EXPECT.items():
    hm = srv.DeliveryHarness(respond=mode).start()
    try:
        st, hd, body = get(hm.gas_url, method="POST", data=b'{"email":"x@y.z"}')
        check(f"stub --respond {mode}: HTTP {status} {json.dumps(doc)}",
              st == status and json.loads(body) == doc and hd.get("Access-Control-Allow-Origin") == "*")
    finally:
        hm.stop()
hm = srv.DeliveryHarness(respond="echo").start()
try:
    st, _, body = get(hm.gas_url, method="POST", data=json.dumps({"email": TYPED["email"]}).encode())
    check("stub --respond echo: the error string carries the address the page sent (a hostile endpoint)",
          st == 200 and TYPED["email"] in json.loads(body)["error"])
finally:
    hm.stop()
hm = srv.DeliveryHarness(respond="malformed").start()
try:
    st, hd, body = get(hm.gas_url, method="POST", data=b"{}")
    is_json = True
    try:
        json.loads(body)
    except ValueError:
        is_json = False
    check("stub --respond malformed: HTTP 200 with a body that is not JSON", st == 200 and not is_json)
finally:
    hm.stop()
hm = srv.DeliveryHarness(unreachable=True)
try:
    p = urlparse(hm.gas_url)
    s = socket.socket()
    s.settimeout(2)
    refused = s.connect_ex((p.hostname, p.port)) != 0
    s.close()
    check("--unreachable: gasUrl names a loopback port nothing listens on (connection refused), not the stub",
          refused and p.port != hm.stub_port and p.hostname == "127.0.0.1")
finally:
    hm.stop()
try:
    srv.DeliveryHarness(respond="bogus")
    check("the harness class refuses an unknown response mode", False)
except ValueError:
    check("the harness class refuses an unknown response mode", True)


# ---- rendered pass ------------------------------------------------------------
print("Rendered pass (headless Chromium over the harness):")


def serve_plain():
    class Quiet(SimpleHTTPRequestHandler):
        def __init__(self, *a, **k):
            super().__init__(*a, directory=REPO, **k)

        def log_message(self, *_):
            pass
    server = ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
    t = threading.Thread(target=server.serve_forever, daemon=True)
    t.start()
    return server, server.server_address[1]


WALK_JS = r"""
async (ARGS) => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const ANS = { "sleep_position": "side", "sleep_issues": ["back_pain"], "health_conditions": ["snoring"],
                "temperature": "hot", "firmness": 5, "partner_sleep": "partner", "partner_disturbance": "sometimes",
                "body_type": "average", "mattress_size": "queen" };
  for (const k of Object.keys(ANS)) answers[k] = ANS[k];
  if (ARGS.lang === 'es') { await switchLanguage('es'); await wait(200); }
  const out = {};
  const txt = (id) => { const e = document.getElementById(id); return e ? e.textContent : null; };
  const shown = (id) => { const e = document.getElementById(id); return !!e && e.style.display !== 'none' && !e.hidden; };
  out.dataUse = txt('landingDataUse');
  showProfileScreen();
  window.showResults();
  await wait(150);
  const ids = Object.keys(window._drawerData || {});
  const first = ids[0];
  window.chooseFinalist(first);
  // One accessory in the authoritative cart, so the packet projection runs.
  const acc = (typeof ACCESSORIES !== 'undefined' && ACCESSORIES.length) ? ACCESSORIES[0] : null;
  if (acc) { window._accCart = window._accCart || {}; window._accCart[acc.id] = { reasonKeys: ['cooling'] }; }
  out.accessoryId = acc ? acc.id : null;
  window.showSavedPicks();
  await wait(100);
  window.showEmailCapture();
  await wait(100);
  out.before = { sendBtn: txt('emailSendBtn'), noteShown: shown('emailPreviewNote'), noteText: txt('emailPreviewNote'),
                 confirmVisible: document.getElementById('emailConfirmation').classList.contains('visible') };
  document.getElementById('emailNameInput').value = ARGS.name;
  document.getElementById('emailInput').value = ARGS.email;
  document.getElementById('emailPhoneInput').value = ARGS.phone;
  window.sendResults();
  out.inflight = txt('emailSendBtn');
  const btn = document.getElementById('emailSendBtn');
  const err = document.getElementById('emailError');
  const t0 = Date.now();
  while (Date.now() - t0 < 6000) {
    if (btn.classList.contains('sent') || (err.textContent && err.textContent.trim())) break;
    await wait(50);
  }
  await wait(100);
  out.after = { sendBtn: txt('emailSendBtn'), sent: btn.classList.contains('sent'), error: err.textContent,
                confirmVisible: document.getElementById('emailConfirmation').classList.contains('visible'),
                captureShown: shown('emailCaptureView'), subtitle: txt('emailConfirmationSubtitle'),
                previewCardShown: shown('emailPreviewModeCard') };
  return out;
}
"""


def walk(browser, port, lang, typed):
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    errors, console, requests = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: console.append((m.type, m.text)))
    page.on("request", lambda r: requests.append((r.method, r.url)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(WALK_JS, dict(typed, lang=lang))
    page.close()
    r["errors"], r["console"], r["requests"] = errors, console, requests
    return r


def console_text(r):
    return "\n".join(t for _, t in r["console"])


def off_loopback(r):
    return [u for _, u in r["requests"] if urlparse(u).hostname not in ("127.0.0.1", "localhost")]


def posts(r):
    return [u for m, u in r["requests"] if m == "POST"]


def common(tag, r, lang, typed):
    check(f"{tag}: no page error", not r["errors"], "; ".join(r["errors"][:2]))
    check(f"{tag}: every request the page made stayed on loopback", not off_loopback(r), str(off_loopback(r)[:2]))
    check(f"{tag}: the typed address never appears in the console",
          typed["email"] not in console_text(r) and typed["phone"] not in console_text(r))


def expect_preview(tag, r, lang, typed):
    common(tag, r, lang, typed)
    check(f"{tag}: the landing data-use sentence is the PREVIEW variant",
          r["dataUse"] == DICT[lang]["privacy.data_use_preview"], repr(r["dataUse"])[:80])
    check(f"{tag}: the preview note is shown under the CTA", r["before"]["noteShown"] and r["before"]["noteText"] == COPY[lang]["note"])
    check(f"{tag}: the in-flight verb saves, then the button reads Saved",
          r["inflight"] in ("Saving...", "Guardando...") and r["after"]["sendBtn"] == COPY[lang]["saved"] and r["after"]["sent"],
          f"{r['inflight']!r} -> {r['after']['sendBtn']!r}")
    check(f"{tag}: the confirmation shows the preview subtitle with the honesty card, the capture view hidden",
          r["after"]["confirmVisible"] and not r["after"]["captureShown"]
          and r["after"]["subtitle"] == COPY[lang]["preview_sub"] and r["after"]["previewCardShown"], repr(r["after"]["subtitle"])[:90])
    check(f"{tag}: NO POST of any kind was made (nothing sent, nothing logged)", not posts(r), str(posts(r)[:2]))
    check(f"{tag}: the console shows the payload's shape only", "Email preview (payload suppressed)" in console_text(r))


def expect_live_success(tag, r, lang, typed, recorded):
    common(tag, r, lang, typed)
    check(f"{tag}: the landing data-use sentence is the LIVE variant",
          r["dataUse"] == DICT[lang]["privacy.data_use_live"], repr(r["dataUse"])[:80])
    check(f"{tag}: the preview note is hidden", not r["before"]["noteShown"])
    check(f"{tag}: the in-flight verb sends, then the button reads Sent",
          r["inflight"] in ("Sending...", "Enviando...") and r["after"]["sendBtn"] == COPY[lang]["sent"] and r["after"]["sent"],
          f"{r['inflight']!r} -> {r['after']['sendBtn']!r}")
    check(f"{tag}: the confirmation shows the live subtitle and the honesty card is hidden",
          r["after"]["confirmVisible"] and r["after"]["subtitle"] == COPY[lang]["live_sub"] and not r["after"]["previewCardShown"]
          and not r["after"]["error"], repr(r["after"]["subtitle"])[:90])
    methods = [x["method"] for x in recorded]
    check(f"{tag}: exactly ONE POST reached the stub and NO preflight (a simple request, as sendResults() claims)",
          methods == ["POST"], str(methods))
    check(f"{tag}: the page made that one POST and no other", len(posts(r)) == 1 and posts(r)[0] == h_live.gas_url, str(posts(r)))
    if not recorded:
        return None
    rec = recorded[0]
    check(f"{tag}: the POST carried no JSON content type (no preflight trigger) and the app's origin",
          "json" not in rec["content_type"].lower() and rec["origin"] == f"http://127.0.0.1:{h_live.app_port}",
          f"{rec['content_type']!r} {rec['origin']!r}")
    p = rec["json"]
    check(f"{tag}: the body is JSON with exactly the closed payload key set",
          isinstance(p, dict) and set(p) == PAYLOAD_KEYS,
          str(sorted(set(p) ^ PAYLOAD_KEYS)) if isinstance(p, dict) else "not JSON")
    if not isinstance(p, dict):
        return None
    check(f"{tag}: lang, name, email and phone are the walk's values as typed",
          p.get("lang") == lang and p.get("name") == typed["name"] and p.get("email") == typed["email"] and p.get("phone") == typed["phone"])
    check(f"{tag}: storeName is the configured store; branding derives from config",
          p.get("storeName") == STORE and set(p.get("branding") or {}) == {"logoMain", "logoSub", "primary", "accent"})
    am = p.get("allMatches")
    check(f"{tag}: allMatches carries at least one entry of exactly name/brand/matchPct/meetsMatchThreshold/line/imageUrl",
          isinstance(am, list) and len(am) >= 1 and all(isinstance(m, dict) and set(m) == MATCH_KEYS for m in am))
    lead = p.get("lead") or {}
    check(f"{tag}: the lead is the chosen finalist (closed contract, matchesSource saved)",
          set(lead) == LEAD_KEYS and lead.get("kind") == "chosen" and lead.get("name") and p.get("matchesSource") == "saved",
          str(lead)[:100])
    acc = p.get("accessories")
    check(f"{tag}: the accessory packet carries the one cart item with name/category/imageUrl and nothing outside the allowed keys",
          isinstance(acc, list) and len(acc) == 1 and ACCESSORY_REQUIRED <= set(acc[0]) <= ACCESSORY_ALLOWED and acc[0]["name"],
          str(acc)[:120])
    flat = json.dumps(p)
    check(f"{tag}: no payment-position field anywhere in the payload",
          not any(f'"{k}"' in flat for k in PAYMENT_POSITION))
    fin = p.get("financing")
    check(f"{tag}: the financing block (if present) is category-level: heading/body/url/offerVersion/confirmNote",
          fin is None or set(fin) == {"heading", "body", "url", "offerVersion", "confirmNote"})
    check(f"{tag}: the Savings Pass fields are empty (discount.mode disabled)",
          p.get("discount") == 0 and p.get("dreamCode") == "" and p.get("passExpiration") == "")
    check(f"{tag}: consultation carries the three summary strings; priorities is a list",
          isinstance(p.get("consultation"), dict) and isinstance(p.get("priorities"), list))
    return p


def expect_declined(tag, r, lang, typed, recorded, code, copy_key):
    common(tag, r, lang, typed)
    check(f"{tag}: the page shows its own error copy and withholds the confirmation",
          r["after"]["error"] == COPY[lang][copy_key] and not r["after"]["confirmVisible"] and not r["after"]["sent"]
          and r["after"]["captureShown"], repr(r["after"]["error"])[:100])
    check(f"{tag}: the diagnostic names the closed-set code {code!r} and nothing from the response",
          any(t == "error" and f"send failed: {code}" in x for t, x in r["console"]),
          console_text(r)[-200:])
    methods = [x["method"] for x in recorded]
    check(f"{tag}: exactly one POST reached the stub", methods == ["POST"], str(methods))


def rendered():
    global h_live
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        check("rendered pass: playwright is installed (python -m pip install playwright && python -m playwright install chromium)", False)
        return {}
    payloads = {}
    with sync_playwright() as p:
        browser = p.chromium.launch()
        # SHIPPED: plain server, gasUrl blank.
        s, port = serve_plain()
        try:
            for lang in ("en", "es"):
                expect_preview(f"shipped {lang}", walk(browser, port, lang, TYPED), lang, TYPED)
        finally:
            s.shutdown()
            s.server_close()
        # LIVE over the harness: the happy path, both languages.
        for lang in ("en", "es"):
            h_live = srv.DeliveryHarness(respond="success").start()
            try:
                r = walk(browser, h_live.app_port, lang, TYPED)
                payloads[lang] = expect_live_success(f"live {lang}", r, lang, TYPED, h_live.recorder.snapshot())
            finally:
                h_live.stop()
        # Client-side invalid address: no POST at all.
        h_live = srv.DeliveryHarness(respond="success").start()
        try:
            bad = dict(TYPED, email="not-an-address")
            r = walk(browser, h_live.app_port, "en", bad)
            common("live en, invalid address typed", r, "en", TYPED)
            check("live en, invalid address typed: the page refuses before any request, with its own validation copy",
                  r["after"]["error"] == COPY["en"]["invalid"] and not posts(r) and not h_live.recorder.snapshot()
                  and not r["after"]["confirmVisible"], repr(r["after"]["error"]))
        finally:
            h_live.stop()
        # Server-declared refusals, hostile echo, transport failures.
        cases = [
            ("canspam_not_configured", "en", "canspam_not_configured", "declined"),
            ("invalid_email", "es", "invalid_email", "declined"),
            ("send_failed", "en", "send_failed", "declined"),
            ("echo", "en", "unclassified", "declined"),
            ("http_500", "en", "http_500", "network"),
            ("malformed", "es", "malformed_response", "network"),
        ]
        for mode, lang, code, copy_key in cases:
            h_live = srv.DeliveryHarness(respond=mode).start()
            try:
                r = walk(browser, h_live.app_port, lang, TYPED)
                expect_declined(f"live {lang}, stub answers {mode}", r, lang, TYPED, h_live.recorder.snapshot(), code, copy_key)
            finally:
                h_live.stop()
        h_live = srv.DeliveryHarness(unreachable=True).start()
        try:
            r = walk(browser, h_live.app_port, "en", TYPED)
            common("live en, endpoint unreachable", r, "en", TYPED)
            check("live en, endpoint unreachable: the network copy, the 'network' code, no confirmation",
                  r["after"]["error"] == COPY["en"]["network"] and not r["after"]["confirmVisible"]
                  and any(t == "error" and "send failed: network" in x for t, x in r["console"]),
                  console_text(r)[-200:])
            check("live en, endpoint unreachable: nothing reached the stub", not h_live.recorder.snapshot())
        finally:
            h_live.stop()
        browser.close()
    return payloads


h_live = None
payloads = rendered()

# ---- Code.gs against the recorded payload ---------------------------------------
print("Code.gs replay (the recorded payload through the real doPost):")
REPLAY_MJS = r"""
import { readFileSync } from "node:fs";
const [repo, payloadPath] = process.argv.slice(2);
const gs = readFileSync(repo + "/Code.gs", "utf8");
const payload = readFileSync(payloadPath, "utf8");
function build() {
  const log = [], rows = [], sent = [];
  const Logger = { log: (s) => log.push(String(s)) };
  const ContentService = { MimeType: { JSON: "json" },
    createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }), getContent: () => s }) };
  const SpreadsheetApp = { getActiveSpreadsheet: () => ({ getActiveSheet: () => ({ appendRow: (r) => rows.push(r) }) }) };
  const GmailApp = { sendEmail: (to, subject, body, opts) => sent.push({ to, subject, body, opts: opts || {} }) };
  const api = new Function("Logger", "ContentService", "SpreadsheetApp", "GmailApp", gs + `
    ;return { doPost: function(e) { return doPost(e); },
      approveCanSpam: function() { UNSUBSCRIBE_URL = 'https://example.test/unsubscribe'; POSTAL_ADDRESS = '1 Test St, Test TX 78501'; PRIVACY_CONTACT = 'privacy@example.test'; } };`)(Logger, ContentService, SpreadsheetApp, GmailApp);
  return { api, log, rows, sent };
}
const out = {};
{ const g = build(); const res = JSON.parse(g.api.doPost({ postData: { contents: payload } }).getContent());
  out.shipped = { res, rows: g.rows.length, sent: g.sent.length, log: g.log }; }
{ const g = build(); g.api.approveCanSpam(); const res = JSON.parse(g.api.doPost({ postData: { contents: payload } }).getContent());
  out.approved = { res, rows: g.rows.length, sent: g.sent.map((s) => ({ to: s.to, subject: s.subject, bodyLen: s.body.length,
    htmlLen: (s.opts.htmlBody || "").length, html: s.opts.htmlBody || "", bcc: s.opts.bcc || "" })), log: g.log }; }
process.stdout.write(JSON.stringify(out));
"""
node = None
for cand in ("node", "node.exe"):
    try:
        subprocess.run([cand, "--version"], capture_output=True, check=True)
        node = cand
        break
    except (OSError, subprocess.CalledProcessError):
        continue
check("node is available for the Code.gs replay", node is not None)
if node and payloads:
    tmpdir = tempfile.mkdtemp(prefix="df-delivery-")
    script = os.path.join(tmpdir, "replay.mjs")
    with open(script, "w", encoding="utf-8") as f:
        f.write(REPLAY_MJS)
    for lang, p in payloads.items():
        if not p:
            check(f"{lang}: a recorded payload exists to replay", False)
            continue
        ppath = os.path.join(tmpdir, f"payload-{lang}.json")
        with open(ppath, "w", encoding="utf-8") as f:
            json.dump(p, f)
        proc = subprocess.run([node, script, REPO.replace("\\", "/"), ppath], capture_output=True, text=True, encoding="utf-8")
        if not check(f"{lang}: Code.gs executed against the recorded payload", proc.returncode == 0, (proc.stderr or "")[:200]):
            continue
        out = json.loads(proc.stdout)
        sh, ap = out["shipped"], out["approved"]
        check(f"{lang}: the SHIPPED Code.gs refuses it (canspam_not_configured), appends no row, sends nothing",
              sh["res"] == {"success": False, "error": "canspam_not_configured"} and sh["rows"] == 0 and sh["sent"] == 0)
        check(f"{lang}: the shipped log is shape-only (the recorded address, name and phone never logged)",
              all(TYPED["email"] not in line and TYPED["name"] not in line and TYPED["phone"] not in line for line in sh["log"])
              and any("email=set" in line for line in sh["log"]))
        check(f"{lang}: with CAN-SPAM values rebound in harness scope, doPost succeeds, appends ONE row and sends ONE email to the recorded address",
              ap["res"] == {"success": True} and ap["rows"] == 1 and len(ap["sent"]) == 1 and ap["sent"][0]["to"] == TYPED["email"],
              str(ap["res"]))
        if len(ap["sent"]) == 1:
            s = ap["sent"][0]
            es = lang == "es"
            check(f"{lang}: the subject is in the payload's language",
                  ("Resumen" in s["subject"]) if es else ("Sleep Brief" in s["subject"]), s["subject"])
            check(f"{lang}: the HTML body carries the recorded lead and the recorded accessory",
                  p["lead"]["name"] in s["html"] and p["accessories"][0]["name"] in s["html"] and s["bodyLen"] > 0)
            check(f"{lang}: the approved log is still shape-only",
                  all(TYPED["email"] not in line for line in ap["log"]))
    for name in os.listdir(tmpdir):
        os.remove(os.path.join(tmpdir, name))
    os.rmdir(tmpdir)

# ---- committed files untouched ------------------------------------------------
print("Committed files:")
after = {p: sha(p) for p in WATCHED}
check("every watched committed file is byte-identical after the full cycle", before == after,
      ", ".join(p for p in WATCHED if before[p] != after[p]))
check("the committed gasUrl is still blank", not load("data/store-config.json").get("gasUrl"))

print(f"\nDelivery harness check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
