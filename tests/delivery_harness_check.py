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
    payload's language, carrying the recorded lead and accessory; the same
    recorded payload delivered again is a duplicate (no second row or email).

One operable application (contract 2026-10-15, sections 3-5) adds:

  * the send identity: every live POST carries a well-formed `sendId`; the
    stub emulates Code.gs's dedupe and `invalid_request`; a rapid double tap
    makes exactly ONE POST (button disabled + aria-busy while in flight); a
    transport failure (HTTP 500, non-JSON body) is retried exactly once with
    the SAME sendId, a server refusal never; `--respond flaky` (first POST of
    each sendId fails) yields two POSTs with one sendId and a success; the
    visible retry after a persistent failure reuses the sendId;
  * the purchase summary: `quote` is in the closed key set and is null in the
    shipped configuration (pricing is dark);
  * Code.gs fixtures through the real doPost (with LockService/CacheService
    stubs): missing/malformed sendId and non-object bodies -> invalid_request
    with nothing written; duplicate sendId -> {success:true, duplicate:true}
    with no row and no email; the lock taken and released on every path; a
    failed or refused send is not recorded (retryable); hand-built EN and ES
    v:1 summaries render every figure VERBATIM in both MIME parts (including
    the plain-text fallback), deliberately inconsistent figures prove there
    is no server arithmetic, hostile text is escaped (HTML) or bracket-
    stripped (plain), length caps hold, the log carries presence + line count
    only, and every malformed summary drops the whole section.

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
import re
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
    # One operable application (contract 2026-10-15, sections 3-4): the send
    # identity and the purchase summary. `quote` is null while
    # pricing.surfaces.email is false (shipped: pricing is dark).
    "sendId", "quote",
}
SEND_ID_RE = srv.SEND_ID_RE
TRANSPORT_CODES = {"http_500", "malformed_response"}
MATCH_KEYS = {"name", "brand", "matchPct", "meetsMatchThreshold", "line", "imageUrl"}
LEAD_KEYS = {"kind", "name", "brand", "line", "imageUrl"}
# The accessory packet: name, category, quantity and imageUrl are what Code.gs
# renders (quantity joined 2026-09-27, PR #132 review repair); the projection
# on main also carries id and reason (the accessory payload minimisation
# slice narrows it). Anything else is a leak.
ACCESSORY_REQUIRED = {"name", "category", "quantity", "imageUrl"}
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

    SID = "harnessSendId-0000000001"
    first = {"email": TYPED["email"], "lang": "en", "sendId": SID}
    st, hd, body = get(h.gas_url, method="POST", data=json.dumps(first).encode())
    check("stub: POST /exec answers 200 {success:true} with Access-Control-Allow-Origin * and no-store",
          st == 200 and json.loads(body) == {"success": True}
          and hd.get("Access-Control-Allow-Origin") == "*" and hd.get("Cache-Control") == "no-store")
    st, _, body = get(h.gas_url, method="POST", data=json.dumps(first).encode())
    check("stub: the SAME sendId again answers {success:true, duplicate:true} (Code.gs's dedupe)",
          st == 200 and json.loads(body) == {"success": True, "duplicate": True})
    bad_ids = [None, "", "short", "x" * 41, "has spaces in it 0123456789", 12345678901234567890123]
    answers = []
    for bad in bad_ids:
        doc = {"email": TYPED["email"], "lang": "en"}
        if bad is not None:
            doc["sendId"] = bad
        st, _, body = get(h.gas_url, method="POST", data=json.dumps(doc).encode())
        answers.append((st, json.loads(body)))
    check("stub: a missing, empty, short, long, non-charset or non-string sendId answers invalid_request",
          all(a == (200, {"success": False, "error": "invalid_request"}) for a in answers), str(answers[:2]))
    st, hd, _ = get(h.gas_url, method="OPTIONS")
    check("stub: OPTIONS /exec is answered 204 (and recorded, so a preflight can be proved absent)",
          st == 204 and hd.get("Access-Control-Allow-Origin") == "*")
    st, _, body = get(h.gas_url.replace(srv.STUB_PATH, "/other"), method="POST", data=b"{}")
    check("stub: a POST to any other path is 404", st == 404)
    st, hd, body = get(h.recorded_url)
    rec = json.loads(body)
    n_bad = len(bad_ids)
    check("stub: /__delivery/recorded lists the /exec requests in order with the parsed JSON (the wrong-path POST is not one)",
          st == 200 and [r["method"] for r in rec] == ["POST"] * (2 + n_bad) + ["OPTIONS"]
          and rec[0]["json"] == first and rec[-1]["body"] is None)
    check("stub: each recorded POST names its outcome (sent, duplicate, invalid_request); the preflight none",
          [r.get("outcome") for r in rec] == ["sent", "duplicate"] + ["invalid_request"] * n_bad + [None],
          str([r.get("outcome") for r in rec]))
    shape = srv.shape_summary(rec[0]["json"])
    check("the console shape summary carries counts and set/unset flags, never a value",
          shape["email"] == "set" and shape["fields"] == 3 and shape["sendId"] == "valid"
          and shape["quote"] == "absent" and shape["quote_lines"] == 0
          and TYPED["email"] not in json.dumps(shape) and SID not in json.dumps(shape))
    check("shape summary of a non-JSON body is {json: false}", srv.shape_summary(None) == {"json": False})
finally:
    h.stop()

print("Stub answers:")
EXPECT = {
    "invalid_request": (200, {"success": False, "error": "invalid_request"}),
    "invalid_email": (200, {"success": False, "error": "invalid_email"}),
    "canspam_not_configured": (200, {"success": False, "error": "canspam_not_configured"}),
    "send_failed": (200, {"success": False, "error": "send_failed"}),
    "http_500": (500, {"success": False, "error": "send_failed"}),
}
for mode, (status, doc) in EXPECT.items():
    hm = srv.DeliveryHarness(respond=mode).start()
    try:
        st, hd, body = get(hm.gas_url, method="POST", data=b'{"email":"x@y.z","sendId":"stubModeSendId-000000001"}')
        check(f"stub --respond {mode}: HTTP {status} {json.dumps(doc)}",
              st == status and json.loads(body) == doc and hd.get("Access-Control-Allow-Origin") == "*")
        if mode in srv.GAS_ERROR_CODES and mode != "invalid_request":
            st, _, body = get(hm.gas_url, method="POST", data=b'{"email":"x@y.z","sendId":"stubModeSendId-000000001"}')
            check(f"stub --respond {mode}: a refusal is not remembered as sent (the same sendId is refused again, never 'duplicate')",
                  json.loads(body) == doc)
    finally:
        hm.stop()
hm = srv.DeliveryHarness(respond="flaky").start()
try:
    seq = []
    for sid in ("flakySendId-00000000001", "flakySendId-00000000001", "flakySendId-00000000001",
                "flakySendId-00000000002", "flakySendId-00000000002"):
        st, _, body = get(hm.gas_url, method="POST", data=json.dumps({"email": "x@y.z", "sendId": sid}).encode())
        seq.append((st, json.loads(body)))
    check("stub --respond flaky: per sendId the first POST is HTTP 500, the second succeeds, a third is a duplicate",
          seq == [(500, {"success": False, "error": "send_failed"}), (200, {"success": True}),
                  (200, {"success": True, "duplicate": True}),
                  (500, {"success": False, "error": "send_failed"}), (200, {"success": True})], str(seq))
    check("stub --respond flaky: the recorded outcomes are http_500, sent, duplicate, http_500, sent",
          [r.get("outcome") for r in hm.recorder.snapshot()] == ["http_500", "sent", "duplicate", "http_500", "sent"])
    st, _, body = get(hm.gas_url, method="POST", data=b'{"email":"x@y.z"}')
    check("stub --respond flaky: a missing sendId is invalid_request (never a 500 to retry)",
          (st, json.loads(body)) == (200, {"success": False, "error": "invalid_request"}))
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
  const btn = document.getElementById('emailSendBtn');
  const err = document.getElementById('emailError');
  if (ARGS.doubleTap) {
    // A rapid double (triple) tap: the button's click path, the touchend path
    // (which calls sendResults() without consulting `disabled`), and the click
    // path again, all in the same task. Exactly one send may leave the page.
    btn.click();
    out.inflight = txt('emailSendBtn');
    window.sendResults();
    btn.click();
    out.busy = { disabled: btn.disabled === true, ariaBusy: btn.getAttribute('aria-busy') };
  } else {
    window.sendResults();
    out.inflight = txt('emailSendBtn');
  }
  const settle = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 10000) {
      if (btn.classList.contains('sent') || (err.textContent && err.textContent.trim())) break;
      await wait(50);
    }
    await wait(100);
  };
  await settle();
  if (ARGS.retryAfterError && err.textContent && err.textContent.trim()) {
    // The customer's (or salesperson's) retry after the visible error: the
    // same content, so the same sendId.
    out.firstError = err.textContent;
    err.textContent = '';
    window.sendResults();
    await settle();
  }
  out.after = { sendBtn: txt('emailSendBtn'), sent: btn.classList.contains('sent'), error: err.textContent,
                confirmVisible: document.getElementById('emailConfirmation').classList.contains('visible'),
                captureShown: shown('emailCaptureView'), subtitle: txt('emailConfirmationSubtitle'),
                previewCardShown: shown('emailPreviewModeCard') };
  return out;
}
"""


def walk(browser, port, lang, typed, **opts):
    page = browser.new_page(viewport={"width": 1194, "height": 748})
    errors, console, requests = [], [], []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: console.append((m.type, m.text)))
    page.on("request", lambda r: requests.append((r.method, r.url)))
    page.goto(f"http://127.0.0.1:{port}/", wait_until="networkidle")
    page.wait_for_selector("#startBtn")
    r = page.evaluate(WALK_JS, dict(typed, lang=lang, **opts))
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
    check(f"{tag}: sendId is a 22-40 character [A-Za-z0-9_-] string (contract section 4)",
          isinstance(p.get("sendId"), str) and SEND_ID_RE.match(p["sendId"]) is not None, repr(p.get("sendId"))[:60])
    check(f"{tag}: the stub recorded the POST as sent (not a duplicate, not invalid_request)",
          rec.get("outcome") == "sent", str(rec.get("outcome")))
    check(f"{tag}: quote is null in the shipped configuration (pricing is dark; pricing.surfaces.email false)",
          "quote" in p and p["quote"] is None, repr(p.get("quote"))[:80])
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
    check(f"{tag}: the accessory packet carries the one cart item with name/category/quantity/imageUrl and nothing outside the allowed keys",
          isinstance(acc, list) and len(acc) == 1 and ACCESSORY_REQUIRED <= set(acc[0]) <= ACCESSORY_ALLOWED and acc[0]["name"]
          and acc[0]["quantity"] == 1,
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
    if code in TRANSPORT_CODES:
        # Contract section 4: a transport failure is retried ONCE automatically
        # with the same sendId before the error copy appears.
        ids = [(x.get("json") or {}).get("sendId") if isinstance(x.get("json"), dict) else None for x in recorded]
        check(f"{tag}: a transport failure is retried exactly once: two POSTs, no preflight", methods == ["POST", "POST"],
              str(methods))
        check(f"{tag}: ...both carrying the SAME well-formed sendId",
              len(ids) == 2 and ids[0] == ids[1] and isinstance(ids[0], str) and SEND_ID_RE.match(ids[0]) is not None,
              str(ids))
    else:
        check(f"{tag}: exactly one POST reached the stub (a server refusal is never retried)", methods == ["POST"],
              str(methods))


def sent_ids(recorded):
    return [(x.get("json") or {}).get("sendId") if isinstance(x.get("json"), dict) else None
            for x in recorded if x["method"] == "POST"]


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
            ("invalid_request", "es", "invalid_request", "declined"),
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
        # Rapid double tap (contract section 4, in-flight guard): click, the
        # touchend path and click again in one task -> exactly ONE POST.
        for lang in ("en", "es"):
            h_live = srv.DeliveryHarness(respond="success").start()
            try:
                r = walk(browser, h_live.app_port, lang, TYPED, doubleTap=True)
                rec = h_live.recorder.snapshot()
                tag = f"live {lang}, rapid double tap"
                common(tag, r, lang, TYPED)
                check(f"{tag}: exactly ONE POST reached the stub", [x["method"] for x in rec] == ["POST"],
                      str([x.get("outcome") for x in rec]))
                check(f"{tag}: the page made exactly one POST", len(posts(r)) == 1, str(posts(r)))
                check(f"{tag}: while in flight the button is disabled and aria-busy",
                      (r.get("busy") or {}).get("disabled") is True and (r.get("busy") or {}).get("ariaBusy") == "true",
                      str(r.get("busy")))
                check(f"{tag}: the send completes and the button stays done",
                      r["after"]["sent"] and r["after"]["sendBtn"] == COPY[lang]["sent"] and not r["after"]["error"],
                      repr(r["after"]["sendBtn"]))
            finally:
                h_live.stop()
        # Flaky endpoint (first POST of a sendId is HTTP 500): the client's one
        # automatic retry carries the SAME sendId and succeeds.
        h_live = srv.DeliveryHarness(respond="flaky").start()
        try:
            r = walk(browser, h_live.app_port, "en", TYPED)
            rec = h_live.recorder.snapshot()
            ids = sent_ids(rec)
            tag = "live en, flaky endpoint"
            common(tag, r, "en", TYPED)
            check(f"{tag}: exactly TWO POSTs (one automatic retry), no preflight",
                  [x["method"] for x in rec] == ["POST", "POST"], str([x["method"] for x in rec]))
            check(f"{tag}: both carry the SAME well-formed sendId",
                  len(ids) == 2 and ids[0] == ids[1] and isinstance(ids[0], str) and SEND_ID_RE.match(ids[0]) is not None,
                  str(ids))
            check(f"{tag}: the stub recorded http_500 then sent",
                  [x.get("outcome") for x in rec] == ["http_500", "sent"], str([x.get("outcome") for x in rec]))
            check(f"{tag}: the page reports success (Sent, live confirmation, no error)",
                  r["after"]["sent"] and r["after"]["confirmVisible"] and not r["after"]["error"]
                  and r["after"]["subtitle"] == COPY["en"]["live_sub"], repr(r["after"]))
        finally:
            h_live.stop()
        # Persistent transport failure, then the visible retry: the retry
        # action reuses the sendId (same content), so a late success could
        # never mail twice.
        h_live = srv.DeliveryHarness(respond="http_500").start()
        try:
            r = walk(browser, h_live.app_port, "en", TYPED, retryAfterError=True)
            ids = sent_ids(h_live.recorder.snapshot())
            tag = "live en, HTTP 500 then the visible retry"
            check(f"{tag}: the first attempt showed the network copy after its one automatic retry",
                  r.get("firstError") == COPY["en"]["network"], repr(r.get("firstError")))
            check(f"{tag}: four POSTs in all (2 automatic + 2 after the retry tap), every one the SAME sendId",
                  len(ids) == 4 and len(set(ids)) == 1 and isinstance(ids[0], str) and SEND_ID_RE.match(ids[0]) is not None,
                  str(ids))
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
try:
    payloads = rendered()
except Exception as exc:  # a page error mid-walk must not hide the replay results below
    check("rendered pass: every walk ran to completion", False, f"{type(exc).__name__}: {str(exc)[:300]}")
    payloads = {}
    if h_live is not None:
        try:
            h_live.stop()
        except Exception:
            pass

# ---- Code.gs replayed through the real doPost ------------------------------------
# A generic scenario runner: each scenario is one fresh "deployment" (its own
# script cache, lock, sheet and mailbox) that receives a sequence of POST
# bodies. The whole Code.gs file is loaded with `new Function`, exactly like
# tests/email_priorities_check.mjs; the CAN-SPAM rebind happens in harness
# scope only (the source keeps its sentinels).
REPLAY_MJS = r"""
import { readFileSync } from "node:fs";
const [repo, scenariosPath] = process.argv.slice(2);
const gs = readFileSync(repo + "/Code.gs", "utf8");
const scenarios = JSON.parse(readFileSync(scenariosPath, "utf8"));
function build(gmailFailures) {
  const log = [], rows = [], sent = [], lock = { waits: 0, releases: 0, held: 0 };
  let failuresLeft = gmailFailures || 0;
  const cache = new Map();
  const Logger = { log: (s) => log.push(String(s)) };
  const ContentService = { MimeType: { JSON: "json" },
    createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }), getContent: () => s }) };
  const SpreadsheetApp = { getActiveSpreadsheet: () => ({ getActiveSheet: () => ({ appendRow: (r) => rows.push(r) }) }) };
  const GmailApp = { sendEmail: (to, subject, body, opts) => {
    if (failuresLeft > 0) { failuresLeft -= 1; throw new Error("forced Gmail failure"); }
    sent.push({ to, subject, body, opts: opts || {} }); } };
  const LockService = { getScriptLock: () => ({
    waitLock: (ms) => { lock.waits += 1; lock.held += 1; lock.lastWait = ms; },
    releaseLock: () => { lock.releases += 1; lock.held -= 1; } }) };
  const CacheService = { getScriptCache: () => ({
    get: (k) => (cache.has(k) ? cache.get(k).v : null),
    put: (k, v, ttl) => { cache.set(k, { v: String(v), ttl }); } }) };
  const api = new Function("Logger", "ContentService", "SpreadsheetApp", "GmailApp", "LockService", "CacheService", gs + `
    ;return { doPost: function(e) { return doPost(e); },
      approveCanSpam: function() { UNSUBSCRIBE_URL = 'https://example.test/unsubscribe'; POSTAL_ADDRESS = '1 Test St, Test TX 78501'; PRIVACY_CONTACT = 'privacy@example.test'; } };`)(
    Logger, ContentService, SpreadsheetApp, GmailApp, LockService, CacheService);
  return { api, log, rows, sent, lock, cache, setFailures: (n) => { failuresLeft = n; } };
}
const out = {};
for (const sc of scenarios) {
  const g = build(0);
  if (sc.approve) g.api.approveCanSpam();
  const responses = [];
  for (const step of sc.posts) {
    g.setFailures(step.gmailFailures || 0);
    const contents = typeof step.raw === "string" ? step.raw : JSON.stringify(step.body);
    responses.push(JSON.parse(g.api.doPost({ postData: { contents } }).getContent()));
  }
  out[sc.name] = { responses, rows: g.rows, log: g.log, lock: g.lock,
    cache: [...g.cache.entries()].map(([k, v]) => ({ k, ttl: v.ttl })),
    sent: g.sent.map((s) => ({ to: s.to, subject: s.subject, body: s.body, html: s.opts.htmlBody || "",
      hasHtml: "htmlBody" in s.opts, bcc: s.opts.bcc || "" })) };
}
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


def replay(scenarios):
    """Run scenarios through the real doPost; {name: result} or None."""
    tmpdir = tempfile.mkdtemp(prefix="df-delivery-")
    try:
        script = os.path.join(tmpdir, "replay.mjs")
        with open(script, "w", encoding="utf-8") as f:
            f.write(REPLAY_MJS)
        spath = os.path.join(tmpdir, "scenarios.json")
        with open(spath, "w", encoding="utf-8") as f:
            json.dump(scenarios, f)
        proc = subprocess.run([node, script, REPO.replace("\\", "/"), spath], capture_output=True, text=True,
                              encoding="utf-8")
        if not check("the Code.gs replay executed (" + ", ".join(s["name"] for s in scenarios)[:120] + ")",
                     proc.returncode == 0, (proc.stderr or "")[:300]):
            return None
        return json.loads(proc.stdout)
    finally:
        for name in os.listdir(tmpdir):
            os.remove(os.path.join(tmpdir, name))
        os.rmdir(tmpdir)


SENT_OK = {"success": True}
DUPLICATE = {"success": True, "duplicate": True}
INVALID_REQUEST = {"success": False, "error": "invalid_request"}
CANSPAM = {"success": False, "error": "canspam_not_configured"}

# ---- (a) the recorded payload (rendered pass) through doPost ----------------------
print("Code.gs replay (the recorded payload through the real doPost):")
if node and payloads:
    for lang, p in payloads.items():
        if not p:
            check(f"{lang}: a recorded payload exists to replay", False)
            continue
        out = replay([
            {"name": "shipped", "approve": False, "posts": [{"body": p}]},
            {"name": "approved", "approve": True, "posts": [{"body": p}, {"body": p}]},
        ])
        if not out:
            continue
        sh, ap = out["shipped"], out["approved"]
        check(f"{lang}: the SHIPPED Code.gs refuses it (canspam_not_configured), appends no row, sends nothing",
              sh["responses"] == [CANSPAM] and not sh["rows"] and not sh["sent"])
        check(f"{lang}: the shipped log is shape-only (the recorded address, name and phone never logged)",
              all(TYPED["email"] not in line and TYPED["name"] not in line and TYPED["phone"] not in line for line in sh["log"])
              and any("email=set" in line and "sendId=set" in line and "quote=absent" in line for line in sh["log"]))
        check(f"{lang}: with CAN-SPAM values rebound in harness scope, doPost succeeds, appends ONE row and sends ONE email to the recorded address",
              ap["responses"][:1] == [SENT_OK] and len(ap["rows"]) == 1 and len(ap["sent"]) == 1
              and ap["sent"][0]["to"] == TYPED["email"], str(ap["responses"]))
        check(f"{lang}: the SAME recorded payload delivered again (same sendId) is a duplicate: no second row, no second email",
              ap["responses"][1:] == [DUPLICATE] and len(ap["rows"]) == 1 and len(ap["sent"]) == 1, str(ap["responses"]))
        if len(ap["sent"]) == 1:
            s = ap["sent"][0]
            es = lang == "es"
            check(f"{lang}: the subject is in the payload's language",
                  ("Resumen" in s["subject"]) if es else ("Sleep Brief" in s["subject"]), s["subject"])
            check(f"{lang}: the HTML body carries the recorded lead and the recorded accessory",
                  p["lead"]["name"] in s["html"] and p["accessories"][0]["name"] in s["html"] and len(s["body"]) > 0)
            heading = "Tu cotizaci" if es else "Your quote"
            check(f"{lang}: with quote null (pricing dark) no quote section renders in either part",
                  heading not in s["html"] and heading not in s["body"])
            check(f"{lang}: the approved log is still shape-only",
                  all(TYPED["email"] not in line for line in ap["log"]))
elif node:
    check("Code.gs replay of the recorded payload: a rendered payload exists (rendered pass did not produce one)", False)

# ---- (b) fixtures: sendId, dedupe, lock, the quote section ---------------------------
print("Code.gs replay (fixtures: sendId, dedupe, lock, quote):")


def base_payload(**over):
    doc = {
        "storeName": "Test Store", "name": "Fixture Customer", "email": "fixture.customer@example.test",
        "phone": "9565550199", "sleepProfile": "The Balanced Sleeper", "mattressSize": "queen",
        "discount": 0, "dreamCode": "", "passExpiration": "", "passScope": "", "passTerms": "",
        "rsa": "", "lang": "en",
        "allMatches": [{"name": "Fixture Mattress", "brand": "FB", "matchPct": "88",
                        "meetsMatchThreshold": True, "line": "Gold - first pick", "imageUrl": ""}],
        "accessories": [], "lead": {"kind": "chosen", "name": "Fixture Mattress", "brand": "FB", "line": "", "imageUrl": ""},
        "matchesSource": "saved", "priorities": [], "consultation": {"context": "", "who": "", "profile": ""},
        "emailPromotions": [], "promoSpanishDraft": "", "promoScenario": "", "promoDisclosure": "",
        "branding": {"logoMain": "", "logoSub": "", "primary": "", "accent": ""}, "financing": None,
        "sendId": "fixtureSendId-0000000001", "quote": None,
    }
    doc.update(over)
    return doc


# Hand-built purchase summaries matching contract section 3. The figures are
# DELIBERATELY inconsistent (the subtotal is not the sum of the lines, the
# minor-unit numbers disagree with the text) so a server that recomputed
# anything would be caught: every figure must appear verbatim.
QUOTE_EN = {
    "v": 1, "currency": "USD", "size": "queen", "sizeLabel": "Queen",
    "lines": [
        {"name": "Fixture Hybrid Plush", "detail": "Queen mattress", "quantity": 1, "listText": "$1,899.00",
         "discounts": [{"label": "Fixture 10% off mattresses", "amountText": "−$189.90"},
                       {"label": "Fixture pay-in-full 5%", "amountText": "−$85.46"}],
         "netText": "$1,623.64"},
        {"name": "Fixture Cloud Pillow", "detail": "Standard", "quantity": 2, "listText": "$198.00",
         "discounts": [{"label": "Fixture $20 off each pillow", "amountText": "−$40.00"}], "netText": "$158.00"},
        {"name": "Fixture <b>Bold</b> & \"Quoted\" Protector", "detail": "<script>alert(1)</script>", "quantity": 1,
         "listText": "$89.99", "discounts": [], "netText": "$89.99"},
    ],
    "listSubtotalText": "$2,186.99", "discountText": "−$315.36", "merchandiseText": "$1,871.63",
    "merchandiseMinor": 777777, "discountMinor": 888888,
    "exclusionsText": "Before sales tax, delivery and setup",
    "offerTerms": ["Fixture terms A: valid on qualifying mattresses through Nov 15.",
                   "Fixture terms B: <img src=x onerror=alert(2)> per pillow."],
    "payment": {"kind": "plan", "planLabel": "Fixture 24-month equal-payment plan", "aprText": "0% APR",
                "termText": "24 months", "downText": "$0.00", "financedText": "$1,871.63",
                "paymentText": "up to $77.99/mo", "paymentMinor": 666666, "totalPaidText": "up to $1,871.76",
                "interestText": "$0.00", "upper": True,
                "disclosure": "Fixture disclosure: subject to credit approval; minimum purchase applies."},
    "provenance": "Terms verified Oct 3, 2026 · example.test",
    "computedAt": "2026-10-15T12:00:00.000Z", "fingerprint": "fx-fingerprint-1",
}
QUOTE_ES = json.loads(json.dumps(QUOTE_EN))
QUOTE_ES.update({
    "sizeLabel": "Queen (matrimonial grande)", "exclusionsText": "Antes de impuestos, entrega e instalación",
    "offerTerms": ["Términos de prueba A: válido en colchones participantes."],
    "provenance": "Términos verificados el 3 oct 2026 · example.test",
})
QUOTE_ES["lines"][0]["detail"] = "Colchón queen"
QUOTE_ES["lines"][0]["discounts"] = [{"label": "Prueba: 10% en colchones", "amountText": "−$189.90"}]
QUOTE_ES["payment"] = {"kind": "plan", "planLabel": "Plan de prueba a 24 meses", "aprText": "0% APR",
                       "termText": "24 meses", "downText": "$0.00", "financedText": "$1,871.63",
                       "paymentText": "hasta $77.99/mes", "paymentMinor": 666666,
                       "totalPaidText": "hasta $1,871.76", "interestText": "$0.00", "upper": True,
                       "disclosure": "Divulgación de prueba: sujeto a aprobación de crédito."}
QUOTE_FULL = json.loads(json.dumps(QUOTE_EN))
QUOTE_FULL["payment"] = {"kind": "full", "totalText": "$1,871.63"}
QUOTE_QUOTE_ONLY = json.loads(json.dumps(QUOTE_EN))
QUOTE_QUOTE_ONLY["payment"] = {"kind": "quote-only", "planLabel": "Fixture lease-to-own option",
                               "note": "Terms are quoted in store by the provider."}


def figures(q):
    """Every *Text figure and label string the summary carries (the verbatim set)."""
    vals = [q["merchandiseText"], q["listSubtotalText"], q["discountText"], q["exclusionsText"], q["provenance"],
            q["sizeLabel"]]
    for line in q["lines"]:
        vals += [line["listText"], line["netText"]]
        for d in line["discounts"]:
            vals += [d["label"], d["amountText"]]
    pay = q["payment"]
    vals += [v for k, v in pay.items() if isinstance(v, str) and k != "kind"]
    vals += q["offerTerms"]
    return [v for v in vals if v]


def safe_strings(q):
    """The strings that carry no markup (hostile ones are checked separately)."""
    return [v for v in figures(q) if "<" not in v and "&" not in v and '"' not in v]


def html_escape(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
            .replace('"', "&quot;").replace("'", "&#39;"))


if node:
    bad_quotes = {
        "v2": dict(QUOTE_EN, v=2),
        "eur": dict(QUOTE_EN, currency="EUR"),
        "no-lines": dict(QUOTE_EN, lines=[]),
        "21-lines": dict(QUOTE_EN, lines=[QUOTE_EN["lines"][1]] * 21),
        "7-terms": dict(QUOTE_EN, offerTerms=["t"] * 7),
        "line-without-net": dict(QUOTE_EN, lines=[dict(QUOTE_EN["lines"][0], netText="")]),
        "quantity-zero": dict(QUOTE_EN, lines=[dict(QUOTE_EN["lines"][0], quantity=0)]),
        "quantity-string": dict(QUOTE_EN, lines=[dict(QUOTE_EN["lines"][0], quantity="2")]),
        "unknown-payment": dict(QUOTE_EN, payment={"kind": "lease", "planLabel": "x"}),
        "plan-without-payment": dict(QUOTE_EN, payment=dict(QUOTE_EN["payment"], paymentText="")),
        "no-merchandise": dict(QUOTE_EN, merchandiseText=""),
        "figure-object": dict(QUOTE_EN, merchandiseText={"amount": 1}),
        "array": [QUOTE_EN],
        "string": "quote",
    }
    huge = "N" * 5000
    scenarios = [
        {"name": "missing", "approve": True, "posts": [{"body": {k: v for k, v in base_payload().items() if k != "sendId"}}]},
        {"name": "malformed", "approve": True, "posts": [
            {"body": base_payload(sendId=bad)} for bad in ("", "short", "x" * 41, "spaces are not allowed 0123", 1234567890123456789012345, None, ["fixtureSendId-0000000001"])]},
        {"name": "non-object", "approve": True, "posts": [{"raw": "null"}, {"raw": "[]"}, {"raw": "\"text\""}]},
        {"name": "dedupe", "approve": True, "posts": [{"body": base_payload()}, {"body": base_payload()},
                                                       {"body": base_payload(sendId="fixtureSendId-0000000002")}]},
        {"name": "shipped-refusal-not-recorded", "approve": False, "posts": [{"body": base_payload()}]},
        {"name": "failed-send-retryable", "approve": True, "posts": [{"body": base_payload(), "gmailFailures": 2},
                                                                      {"body": base_payload()}, {"body": base_payload()}]},
        {"name": "invalid-email-not-recorded", "approve": True, "posts": [
            {"body": base_payload(email="nope")}, {"body": base_payload()}]},
        {"name": "quote-en", "approve": True, "posts": [{"body": base_payload(quote=QUOTE_EN)}]},
        {"name": "quote-es", "approve": True, "posts": [{"body": base_payload(lang="es", quote=QUOTE_ES)}]},
        {"name": "quote-en-fallback", "approve": True, "posts": [{"body": base_payload(quote=QUOTE_EN), "gmailFailures": 1}]},
        {"name": "quote-full", "approve": True, "posts": [{"body": base_payload(quote=QUOTE_FULL)}]},
        {"name": "quote-only", "approve": True, "posts": [{"body": base_payload(lang="es", quote=QUOTE_QUOTE_ONLY)}]},
        {"name": "quote-huge", "approve": True, "posts": [{"body": base_payload(quote=dict(
            QUOTE_EN, lines=[dict(QUOTE_EN["lines"][1], name=huge)], offerTerms=[huge]))}]},
    ] + [{"name": "bad-" + k, "approve": True, "posts": [{"body": base_payload(quote=v)}]} for k, v in bad_quotes.items()]
    out = replay(scenarios)
    if out:
        m = out["missing"]
        check("missing sendId: invalid_request, no row, no email, lock never taken",
              m["responses"] == [INVALID_REQUEST] and not m["rows"] and not m["sent"] and m["lock"]["waits"] == 0,
              str(m["responses"]))
        m = out["malformed"]
        check("malformed sendId (empty, short, 41 chars, spaces, number, null, array): every one invalid_request, nothing written or sent",
              m["responses"] == [INVALID_REQUEST] * 7 and not m["rows"] and not m["sent"], str(m["responses"]))
        m = out["non-object"]
        check("a JSON body that is not an object (null, array, string): invalid_request, nothing written or sent",
              m["responses"] == [INVALID_REQUEST] * 3 and not m["rows"] and not m["sent"], str(m["responses"]))
        d = out["dedupe"]
        check("dedupe: the same sendId twice -> {success:true} then {success:true, duplicate:true}; a new sendId sends again",
              d["responses"] == [SENT_OK, DUPLICATE, SENT_OK], str(d["responses"]))
        check("dedupe: the duplicate appended NO row and sent NO email (2 rows, 2 emails for 3 POSTs)",
              len(d["rows"]) == 2 and len(d["sent"]) == 2)
        check("dedupe: the sendId record is cached under 'df-sent:<sendId>' for 21600 s (the CacheService maximum)",
              sorted(c["k"] for c in d["cache"]) == ["df-sent:fixtureSendId-0000000001", "df-sent:fixtureSendId-0000000002"]
              and all(c["ttl"] == 21600 for c in d["cache"]), str(d["cache"]))
        check("dedupe: the script lock is taken (10000 ms wait) and released on every path, duplicates included",
              d["lock"]["waits"] == 3 and d["lock"]["releases"] == 3 and d["lock"]["held"] == 0
              and d["lock"].get("lastWait") == 10000, str(d["lock"]))
        check("dedupe: the duplicate is logged shape-only (no address, no sendId value)",
              any("duplicate" in line for line in d["log"])
              and all("fixture.customer@example.test" not in line and "fixtureSendId" not in line for line in d["log"]))
        r = out["shipped-refusal-not-recorded"]
        check("the SHIPPED CAN-SPAM refusal still holds with a valid sendId: no row, no email, nothing cached",
              r["responses"] == [CANSPAM] and not r["rows"] and not r["sent"] and not r["cache"])
        r = out["failed-send-retryable"]
        check("a send that failed (both Gmail attempts threw) is send_failed and NOT recorded: the same sendId then sends, once",
              r["responses"] == [{"success": False, "error": "send_failed"}, SENT_OK, DUPLICATE]
              and len(r["sent"]) == 1 and r["lock"]["held"] == 0, str(r["responses"]))
        r = out["invalid-email-not-recorded"]
        check("an invalid_email refusal is not recorded: the corrected request with the same sendId sends",
              r["responses"] == [{"success": False, "error": "invalid_email"}, SENT_OK] and len(r["sent"]) == 1)
        for name, q, es in (("quote-en", QUOTE_EN, False), ("quote-es", QUOTE_ES, True)):
            r = out[name]
            ok_send = check(f"{name}: send succeeds with ONE email and ONE row", r["responses"] == [SENT_OK]
                            and len(r["sent"]) == 1 and len(r["rows"]) == 1, str(r["responses"]))
            if not ok_send:
                continue
            html, plain = r["sent"][0]["html"], r["sent"][0]["body"]
            heading = "Tu cotización" if es else "Your quote"
            check(f"{name}: the '{heading}' section is present in BOTH the HTML and the plain part",
                  heading in html and heading in plain)
            missing_html = [v for v in safe_strings(q) if v not in html]
            missing_plain = [v for v in safe_strings(q) if v not in plain]
            check(f"{name}: every figure and label string renders VERBATIM in the HTML part",
                  not missing_html, str(missing_html[:3]))
            check(f"{name}: every figure and label string renders VERBATIM in the plain part",
                  not missing_plain, str(missing_plain[:3]))
            check(f"{name}: every line name renders, quantities stated beside the name",
                  all(html.find(l["name"] if "<" not in l["name"] else html_escape(l["name"])) != -1 for l in q["lines"])
                  and "&times; 2" in html and "Fixture Cloud Pillow x 2" in plain)
            check(f"{name}: the client-only minor-unit numbers are never rendered (no server arithmetic, no raw numbers)",
                  all(n not in html and n not in plain for n in ("777777", "888888", "666666", "7,777.77", "8,888.88")))
            labels = (["Plan", "APR", "Plazo", "Pago inicial", "Monto financiado", "Pago mensual", "Total pagado",
                       "Interés", "Subtotal de mercancía", "Tu precio", "Precio de lista"] if es else
                      ["Plan", "APR", "Term", "Down payment", "Amount financed", "Monthly payment", "Total paid",
                       "Interest", "Merchandise subtotal", "Your price", "List price"])
            check(f"{name}: the localized row labels render in both parts",
                  all(lb in html and lb in plain for lb in labels), str([lb for lb in labels if lb not in html or lb not in plain]))
            check(f"{name}: the quote sits after the Sleep System and before the CTA in the HTML part",
                  html.find(heading) < html.find("Bring this email" if not es else "Lleva este correo"))
            check(f"{name}: the quote never reaches the sheet row (still 9 cells, no figure)",
                  len(r["rows"][0]) == 9 and q["merchandiseText"] not in json.dumps(r["rows"][0]))
            check(f"{name}: the log records quote presence and line count only - no figure, no name",
                  any(f"quote=present, quote_lines={len(q['lines'])}" in line for line in r["log"])
                  and all(q["merchandiseText"] not in line and q["lines"][0]["name"] not in line for line in r["log"]))
            if not es:
                check(f"{name}: hostile markup is ESCAPED in the HTML part (name, detail, offer terms)",
                      "<b>Bold</b>" not in html and "<script>alert(1)</script>" not in html
                      and "<img src=x onerror=alert(2)>" not in html
                      and html_escape("Fixture <b>Bold</b> & \"Quoted\" Protector") in html
                      and "&lt;script&gt;alert(1)&lt;/script&gt;" in html
                      and "&lt;img src=x onerror=alert(2)&gt;" in html)
                check(f"{name}: hostile markup arrives without angle brackets in the plain part",
                      "<script>" not in plain and "<img" not in plain and "<b>" not in plain
                      and "Fixture bBold/b & \"Quoted\" Protector" in plain and "scriptalert(1)/script" in plain)
        r = out["quote-en-fallback"]
        check("quote-en, HTML send failed: the plain-text fallback still carries the whole quote",
              r["responses"] == [SENT_OK] and len(r["sent"]) == 1 and not r["sent"][0]["hasHtml"]
              and all(v in r["sent"][0]["body"] for v in safe_strings(QUOTE_EN)))
        r = out["quote-full"]
        check("pay-in-full payment block: 'Pay in full' with the total, verbatim, both parts; no plan rows",
              r["responses"] == [SENT_OK] and all("Pay in full" in x and "$1,871.63" in x
                                                  for x in (r["sent"][0]["html"], r["sent"][0]["body"]))
              and "Monthly payment" not in r["sent"][0]["html"] and "Amount financed" not in r["sent"][0]["body"])
        r = out["quote-only"]
        check("quote-only payment block (ES): the plan label and note render, no figures invented",
              r["responses"] == [SENT_OK] and all("Fixture lease-to-own option" in x and "Terms are quoted in store by the provider." in x
                                                  for x in (r["sent"][0]["html"], r["sent"][0]["body"]))
              and "Pago mensual" not in r["sent"][0]["html"] and "Monto financiado" not in r["sent"][0]["body"])
        r = out["quote-huge"]
        runs = lambda text: sorted(len(x) for x in re.findall("N{50,}", text))
        check("length caps: a 5000-character line name renders as exactly 200 characters, an offer term as 600 (both parts)",
              r["responses"] == [SENT_OK] and runs(r["sent"][0]["body"]) == [200, 600]
              and runs(r["sent"][0]["html"]) == [200, 600], str(runs(r["sent"][0]["body"])))
        for k in bad_quotes:
            r = out["bad-" + k]
            check(f"malformed quote ({k}): the send still succeeds and the quote section is ABSENT from both parts (all-or-nothing)",
                  r["responses"] == [SENT_OK] and len(r["sent"]) == 1
                  and "Your quote" not in r["sent"][0]["html"] and "Your quote" not in r["sent"][0]["body"],
                  str(r["responses"]))

# ---- committed files untouched ------------------------------------------------
print("Committed files:")
after = {p: sha(p) for p in WATCHED}
check("every watched committed file is byte-identical after the full cycle", before == after,
      ", ".join(p for p in WATCHED if before[p] != after[p]))
check("the committed gasUrl is still blank", not load("data/store-config.json").get("gasUrl"))

print(f"\nDelivery harness check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
