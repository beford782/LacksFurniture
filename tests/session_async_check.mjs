// Session asynchrony + diagnostic-privacy boundary — behavioural regression.
//
// Gate 1B amendment. Two defects this pins, both present on the pre-amendment
// branch (43b25ed) and both reproducible below:
//
//  1. POST-WIPE ASYNCHRONOUS MUTATION. sendResults() completed through a RAW
//     setTimeout(showSuccess, 1200) in preview mode - the deployment's only
//     path, since gasUrl is blank - and through unguarded fetch continuations
//     on the live path. Either could run AFTER the authoritative wipe and
//     rewrite the send button, capture view and confirmation over the NEXT
//     customer's session.
//
//  2. DIAGNOSTIC PRIVACY. analytics.log() printed and retained its raw data
//     argument, so the customer's name/email/phone (email_previewed) and every
//     raw quiz answer (session_summary) reached a console anyone can open on a
//     showroom tablet, and stayed in analytics.events. Preview mode separately
//     printed the entire email payload. Console history is NOT something the
//     session wipe can retract, so the fix has to be that the data is never
//     written - console.clear() would be theatre.
//
// Everything here EXECUTES source extracted verbatim from index.html against a
// DOM shim, a fake clock and deferred promises. Nothing is reimplemented.
//
// Run: node tests/session_async_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function section(name) { console.log(`\n-- ${name} --`); }
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}

const SENTINEL_EMAIL = "prior.customer@example.invalid";
const SENTINEL_NAME = "PRIOR-CUSTOMER-NAME-x7";
const SENTINEL_PHONE = "956-555-0199";
const SENTINEL_ANSWER = "PRIOR-ANSWER-q3";

// ===========================================================================
// 1. OWNED INVENTORY OF RAW DELAYED WORK  (the static guard)
// ===========================================================================
section("owned inventory: every raw setTimeout / setInterval / rAF is classified");

// The complete classification of asynchronous work in index.html. Anything
// scheduled through sessionTimeout() / sessionFrame() / sessionBound() is
// session-owned and needs no entry. Everything ELSE must appear here with a
// class and a reason, or this suite fails.
//
//   A = session/customer-bearing  -> must be cancelled AND epoch-guarded
//   B = device/application lifecycle -> safe across sessions
//   C = unreachable during a customer session -> proven, not assumed
//
// Keyed on line TEXT rather than line number so it survives edits elsewhere.
const RAW_ALLOWLIST = [
  { cls: "A", count: 1, match: "_finInterestAnnounceTimer = setTimeout(",
    why: "cancelled by name in cancelFinInterestPending() + clearFinInterestAnnouncement(), both called by the wipe" },
  { cls: "A", count: 1, match: "_finInterestFocusFrame = requestAnimationFrame(",
    why: "cancelled by name via cancelAnimationFrame in cancelFinInterestPending(), called by the wipe" },
  { cls: "A", count: 1, match: "_drawerCloseTimer = setTimeout(",
    why: "cleared by name in closeMattressDrawer(), which the wipe calls first with {immediate:true}" },
  { cls: "B", count: 1, match: "__STARFIELD_RAF__",
    why: "one-time boot decoration; runs before any session and mutates only the starfield" },
  { cls: "B", count: 1, match: "_idleTicker = setInterval(idleReconcile,",
    why: "the idle controller's own ticker; lifecycle infrastructure, cleared and re-armed by idleRestart()" },
  { cls: "B", count: 1, match: "var id = setTimeout(function() {",
    why: "the sessionTimeout() implementation itself" },
  { cls: "B", count: 1, match: "var id = requestAnimationFrame(function() {",
    why: "the sessionFrame() implementation itself" },
  { cls: "C", count: 8, match: "__LEGACY_ACCESSORIES__",
    why: "staggered reveal inside window._legacyShowAccessories, which has NO call site (asserted below)" },
];

// Locate the dead legacy renderer so its raw timers can be attributed to it.
const legacyStart = html.indexOf("window._legacyShowAccessories = function() {");
check("the legacy accessories renderer was located", legacyStart !== -1);
const legacyEnd = html.indexOf("\r\n    function scoreAccessoriesFromAnswers", legacyStart) !== -1
  ? html.indexOf("\r\n    window.showAccessories = function", legacyStart)
  : html.length;
const legacyBody = legacyStart === -1 ? "" : html.slice(legacyStart, legacyEnd > 0 ? legacyEnd : html.length);

// Proof for class C: unreachable because nothing calls it.
{
  const refs = (html.match(/_legacyShowAccessories/g) || []).length;
  check(`_legacyShowAccessories is defined once and never called (${refs} reference${refs === 1 ? "" : "s"})`,
    refs === 1);
}

// Enumerate every RAW delayed call and attribute each to an allowlist entry.
{
  const lines = html.split(/\r?\n/);
  const rawRe = /(?<![A-Za-z_$.])(setTimeout|setInterval|requestAnimationFrame)\s*\(/;
  const raw = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip lines whose only occurrence is inside sessionTimeout( / sessionFrame(
    const stripped = line.replace(/session(Timeout|Frame)\s*\(/g, "");
    if (rawRe.test(stripped)) {
      // Context, not a byte offset: index.html is CRLF, so a character offset
      // accumulated from split("\n") lengths drifts by one per line.
      raw.push({ n: i + 1, text: line.trim(), context: lines.slice(i, i + 8).join(" ") });
    }
  }
  check(`found raw delayed calls to classify (${raw.length})`, raw.length > 0);

  const unattributed = [];
  const counts = {};
  for (const r of raw) {
    const inLegacy = legacyBody.includes(r.text) && r.text.includes("setTimeout(");
    // Longest match first: "var id = requestAnimationFrame(" must win over the
    // bare "requestAnimationFrame(" it contains, or the two collide.
    const byLength = RAW_ALLOWLIST.filter((a) => !a.match.startsWith("__"))
      .sort((x, y) => y.match.length - x.match.length);
    let hit = byLength.find((a) => r.text.includes(a.match));
    if (!hit && inLegacy) hit = RAW_ALLOWLIST.find((a) => a.match === "__LEGACY_ACCESSORIES__");
    if (!hit && r.text === "requestAnimationFrame(function() {" && r.context.includes("starfield")) {
      hit = RAW_ALLOWLIST.find((a) => a.match === "__STARFIELD_RAF__");
    }
    if (!hit) unattributed.push(`line ${r.n}: ${r.text.slice(0, 90)}`);
    else counts[hit.match] = (counts[hit.match] || 0) + 1;
  }
  check(`every raw delayed call is classified in the owned inventory${unattributed.length ? " — UNCLASSIFIED: " + unattributed.join(" | ") : ""}`,
    unattributed.length === 0);
  for (const a of RAW_ALLOWLIST) {
    check(`[${a.cls}] ${a.match.slice(0, 52)} — expected ${a.count}, found ${counts[a.match] || 0}`,
      (counts[a.match] || 0) === a.count);
  }
}

check("sessionFrame() exists so animation frames can be session-owned",
  /function sessionFrame\(fn\) \{/.test(html));
check("sessionBound() exists so promise continuations validate at callback time",
  /function sessionBound\(fn\) \{/.test(html));
check("the wipe cancels registered frames as well as timers",
  /_sessionFrames\.forEach\(function\(id\) \{ cancelAnimationFrame\(id\); \}\);/.test(html));
check("the epoch is bumped AFTER both registries are drained",
  /_sessionFrames = \[\];[\s\S]{0,220}_sessionEpoch\+\+;/.test(html));

// ===========================================================================
// 2. EXECUTE THE REAL SEND-COMPLETION PATH
// ===========================================================================
// Wrapped so a tree WITHOUT the amendment (the pre-amendment HEAD) reports a
// legible failure for every behavioural contract instead of dying on the first
// missing symbol. A crash is a failure too, but it hides how much is unmet.
try {
const guardsSrc = grab(/var _sessionEpoch = 1;[\s\S]*?function clearSessionTimers\(\) \{[\s\S]*?\n    \}/,
  "the session timer/frame/bound guards");
// The real failure classifiers, executed rather than stubbed.
const classifiersSrc = grab(
  /var EMAIL_FAILURE_CODES = \[[\s\S]*?function transportFailureCode\(err\) \{[\s\S]*?\n    \}/,
  "the send-failure classifiers");
const showSuccessSrc = grab(/      function showSuccess\(\) \{[\s\S]*?\n      \}/, "showSuccess()");
const showErrorSrc = grab(/      function showError\(msg\) \{[\s\S]*?\n      \}/, "showError()");
// index.html is CRLF, so the terminator must tolerate the \r before each \n.
const sendBlockSrc = grab(/      if \(gasUrl && !scenarioBlocksEmail\) \{[\s\S]*?\r?\n      \}\r?\n    \};/,
  "the send-completion block (live fetch + preview)");

function makeEl(id) {
  const cls = new Set();
  return {
    id, style: {}, textContent: "", innerHTML: "", value: "", disabled: false, hidden: false,
    classList: {
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      contains: (c) => cls.has(c),
    },
    scrollIntoView() {},
    setAttribute() {}, removeAttribute() {},
  };
}

// Fake clock shared by the timer tests.
let NOW = 5_000_000, seq = 1;
let timeouts = new Map(), frames = new Map();
const clock = {
  setTimeout(fn, ms) { const id = seq++; timeouts.set(id, { fn, at: NOW + (ms || 0) }); return id; },
  clearTimeout(id) { timeouts.delete(id); },
  requestAnimationFrame(fn) { const id = seq++; frames.set(id, { fn, at: NOW + 16 }); return id; },
  cancelAnimationFrame(id) { frames.delete(id); },
  advance(ms) {
    NOW += ms;
    for (const [id, t] of [...timeouts]) if (t.at <= NOW) { timeouts.delete(id); t.fn(); }
    for (const [id, f] of [...frames]) if (f.at <= NOW) { frames.delete(id); f.fn(); }
  },
  // The real hazard: the event loop has ALREADY handed the callback to the
  // task queue, so clearTimeout can no longer reach it. Snapshot must be taken
  // BEFORE the wipe — taking it after would find an empty map and the test
  // would pass without exercising anything.
  snapshot() { return [...timeouts.values(), ...frames.values()]; },
  fireSnapshot(snap) { snap.forEach((t) => t.fn()); },
  pending() { return timeouts.size + frames.size; },
};

// A fetch whose promise we resolve/reject by hand, after the wipe.
let deferred = null;
function deferredFetch() {
  return new Promise((resolve, reject) => { deferred = { resolve, reject }; });
}

const consoleLines = [];
const fakeConsole = {
  log: (...a) => consoleLines.push(["log", ...a]),
  warn: (...a) => consoleLines.push(["warn", ...a]),
  error: (...a) => consoleLines.push(["error", ...a]),
};

function buildSendHarness(opts) {
  const els = {
    emailSendBtn: makeEl("emailSendBtn"),
    emailCaptureView: makeEl("emailCaptureView"),
    emailConfirmation: makeEl("emailConfirmation"),
    emailError: makeEl("emailError"),
  };
  const doc = { getElementById: (id) => els[id] || makeEl(id) };
  const payload = {
    name: SENTINEL_NAME, email: SENTINEL_EMAIL, phone: SENTINEL_PHONE,
    sleepProfile: "The Back Saver", allMatches: [{ name: "m1" }, { name: "m2" }],
    accessories: [{ id: "a1" }], lang: "en",
  };
  const fn = new Function(
    "document", "console", "setTimeout", "clearTimeout", "requestAnimationFrame",
    "cancelAnimationFrame", "fetch", "gasUrl", "scenarioBlocksEmail", "isEmailPreview",
    "currentLang", "payload", "sendBtn", "errorEl", "confirmation", "out",
    `
    ${guardsSrc}
    ${classifiersSrc}
    ${showSuccessSrc}
    ${showErrorSrc}
    out.run = function() {
      ${sendBlockSrc.replace(/\n    \};$/, "")}
    };
    out.wipe = clearSessionTimers;
    out.epoch = function() { return _sessionEpoch; };
    out.pendingRegistered = function() { return _sessionTimers.length + _sessionFrames.length; };
    out.sessionTimeout = sessionTimeout;
    out.sessionFrame = sessionFrame;
    out.sessionBound = sessionBound;
    `
  );
  const out = {};
  fn(doc, fakeConsole, clock.setTimeout, clock.clearTimeout, clock.requestAnimationFrame,
    clock.cancelAnimationFrame, opts.fetch || deferredFetch, opts.gasUrl || "", false,
    !opts.gasUrl, "en", payload, els.emailSendBtn, els.emailError, els.emailConfirmation, out);
  return { out, els };
}

function sendState(els) {
  return {
    btnText: els.emailSendBtn.textContent,
    sent: els.emailSendBtn.classList.contains("sent"),
    sending: els.emailSendBtn.classList.contains("sending"),
    captureHidden: els.emailCaptureView.style.display === "none",
    confirmVisible: els.emailConfirmation.classList.contains("visible"),
    error: els.emailError.textContent,
  };
}
function untouched(s) {
  return !s.sent && !s.sending && !s.captureHidden && !s.confirmVisible && s.error === "" && s.btnText === "";
}

section("preview completion after the wipe (the reported reproduction)");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  check("preview scheduled its completion through the session registry",
    out.pendingRegistered() === 1);
  const before = out.epoch();
  const clockBefore = clock.pending();
  out.wipe();                              // authoritative wipe fires first
  check("the wipe drained the registry", out.pendingRegistered() === 0);
  // Both halves of the rule, separately. Forgetting the ids without cancelling
  // them would leave the timer armed in the browser and pass the check above.
  check("REGRESSION: the underlying timer was really cancelled, not just forgotten",
    clockBefore > 0 && clock.pending() === 0);
  check("the wipe rotated the epoch", out.epoch() > before);
  clock.advance(2000);                     // past the 1200ms deadline
  const s = sendState(els);
  check("REGRESSION: showSuccess() cannot run after the wipe", untouched(s));
  check("  send button not rewritten", s.btnText === "" && !s.sent);
  check("  capture view not hidden", !s.captureHidden);
  check("  confirmation not revealed", !s.confirmVisible);
}

section("preview completion in an UNINTERRUPTED session still works");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  clock.advance(2000);
  const s = sendState(els);
  check("ordinary same-session completion is unaffected",
    s.sent && s.captureHidden && s.confirmVisible);
}

section("preview completion belonging to a FRESH session still works");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.wipe();                              // previous customer cleared first
  out.run();                               // new customer sends
  clock.advance(2000);
  const s = sendState(els);
  check("a fresh session's own callback is not rejected by the epoch guard",
    s.sent && s.captureHidden && s.confirmVisible);
}

section("already-dispatched callback (epoch guard, not cancellation)");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  out.run();
  // Snapshot BEFORE the wipe: this models a callback the event loop has
  // already dispatched, which clearTimeout can no longer reach. Only the
  // callback-time epoch check can stop it.
  const dispatched = clock.snapshot();
  check("there is a dispatched callback to test with", dispatched.length > 0);
  out.wipe();
  clock.fireSnapshot(dispatched);          // run it anyway, as the browser would
  check("REGRESSION: a callback already dispatched before the wipe is rejected",
    untouched(sendState(els)));
}

section("live path: continuations settling AFTER the wipe");
const liveCases = [
  { name: "success", settle: (d) => d.resolve({ ok: true, json: async () => ({ success: true }) }) },
  { name: "server-declared failure", settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: "quota" }) }) },
  { name: "malformed response", settle: (d) => d.resolve({ ok: true, json: async () => null }) },
  { name: "non-ok HTTP", settle: (d) => d.resolve({ ok: false, status: 503, json: async () => ({}) }) },
  { name: "network rejection", settle: (d) => d.reject(new Error("network down")) },
];
for (const c of liveCases) {
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  out.wipe();                              // wipe while the request is in flight
  c.settle(deferred);
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const s = sendState(els);
  check(`REGRESSION: ${c.name} after the wipe mutates nothing`, untouched(s));
}

section("live path: continuations settling INSIDE their own session still work");
{
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  deferred.resolve({ ok: true, json: async () => ({ success: true }) });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  const s = sendState(els);
  check("same-session success still completes the send", s.sent && s.confirmVisible);
}
{
  const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
  out.run();
  deferred.resolve({ ok: true, json: async () => ({ success: false, error: "quota" }) });
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  check("same-session server failure still surfaces an error to the customer",
    sendState(els).error.length > 0);
}

section("every send continuation is bound, structurally");
{
  // The first continuation only parses JSON and cannot mutate the page, so
  // unbinding it is not observable behaviourally — which is exactly why it
  // needs a structural assertion. All three are bound, uniformly, so a
  // reviewer removing any one of them is caught.
  const bound = (sendBlockSrc.match(/\.(then|catch)\(sessionBound\(/g) || []).length;
  check(`all three fetch continuations are sessionBound (found ${bound})`, bound === 3);
  check("no continuation is left unbound",
    !/\.(then|catch)\(\s*function/.test(sendBlockSrc));
}

section("error diagnostics carry no server- or exception-supplied text");
{
  // A GAS endpoint, a proxy, or a malformed body is outside our control, and
  // the request we just sent it contained the customer's name, email and
  // phone. Anything echoed back must not reach a log line.
  const errCases = [
    { name: "server-declared error string",
      settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: SENTINEL_EMAIL }) }) },
    { name: "server error containing a name",
      settle: (d) => d.resolve({ ok: true, json: async () => ({ success: false, error: "rejected for " + SENTINEL_NAME }) }) },
    { name: "rejection whose Error.message holds a sentinel",
      settle: (d) => d.reject(Object.assign(new Error("POST /gas?who=" + SENTINEL_EMAIL), { name: "TypeError" })) },
    { name: "malformed response (JSON parse throws with body text)",
      settle: (d) => d.resolve({ ok: true, json: async () => {
        throw Object.assign(new SyntaxError("Unexpected token in " + SENTINEL_PHONE), { name: "SyntaxError" }); } }) },
    { name: "non-ok HTTP",
      settle: (d) => d.resolve({ ok: false, status: 503, json: async () => ({}) }) },
  ];
  for (const c of errCases) {
    // (a) SAME session: the customer must still get a localized generic error.
    const { out, els } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    c.settle(deferred);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed = JSON.stringify(consoleLines);
    const leaked = [SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].filter((s) => printed.includes(s));
    check(`REGRESSION: ${c.name} — no sentinel in console${leaked.length ? " — LEAKED " + leaked.join(",") : ""}`,
      leaked.length === 0);
    check(`  ${c.name} — customer still sees a localized generic error`,
      els.emailError.textContent.length > 0 && !els.emailError.textContent.includes(SENTINEL_EMAIL));
    check(`  ${c.name} — a classification code was logged`,
      /send failed/.test(printed) && /(unclassified|malformed_response|network|http_\d{3}|quota|auth|rate_limit|invalid_recipient|server_error|disabled)/.test(printed));

    // (b) POST-WIPE: the same settle must mutate nothing and still not leak.
    const b = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    b.out.run();
    b.out.wipe();
    c.settle(deferred);
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    const printed2 = JSON.stringify(consoleLines);
    check(`  ${c.name} — after the wipe: nothing mutated`, untouched(sendState(b.els)));
    check(`  ${c.name} — after the wipe: no sentinel in console`,
      ![SENTINEL_EMAIL, SENTINEL_NAME, SENTINEL_PHONE].some((s) => printed2.includes(s)));
  }
  // An allowlisted server code is still useful signal.
  {
    const { out } = buildSendHarness({ gasUrl: "https://example.invalid/gas", fetch: deferredFetch });
    consoleLines.length = 0;
    out.run();
    deferred.resolve({ ok: true, json: async () => ({ success: false, error: "quota" }) });
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    check("an allowlisted server failure code survives as signal",
      JSON.stringify(consoleLines).includes("quota"));
  }
}

section("error diagnostics: static sweep");
{
  check("the server's error string is never logged directly",
    !/console\.error\([^)]*\bmsg\b/.test(html));
  check("the Error object is never logged directly",
    !/console\.error\([^)]*,\s*err\s*\)/.test(html));
  check("failures are logged through a classifier",
    /emailFailureCode\(/.test(html) && /transportFailureCode\(/.test(html));
  check("the server code classifier validates against a closed set",
    /EMAIL_FAILURE_CODES\.indexOf\(raw\) !== -1/.test(html));
  check("the transport classifier validates its own thrown shape",
    /\/\^http_\\d\{3\}\$\/\.test\(msg\)/.test(html));
  check("no thrown Error embeds a customer value",
    !/throw new Error\([^)]*(payload|email|name|phone|answers)/i.test(html));
}

section("cancellation does not break the drawer");
{
  // The drawer's slide-out timer is deliberately NOT session-registered: it is
  // cleared by name inside closeMattressDrawer, which the wipe calls first.
  // Pin that it is still cleared that way, so the new registry cannot be
  // mistaken for the drawer's owner.
  const closeSrc = (html.match(/window\.closeMattressDrawer = function\([^)]*\) \{[\s\S]*?\n    \};/) || [""])[0];
  check("closeMattressDrawer still clears its own timer by name",
    /clearTimeout\(_drawerCloseTimer\)/.test(closeSrc));
  check("the drawer timer was NOT moved onto the session registry",
    !/sessionTimeout\(/.test(closeSrc));
  const wipeSrc = (html.match(/function resetSessionState\(opts\) \{[\s\S]*?\n    \}/) || [""])[0];
  check("the wipe still unwinds the drawer before draining timers",
    wipeSrc.indexOf("closeMattressDrawer(") < wipeSrc.indexOf("clearSessionTimers()"));
}

// ===========================================================================
// 3. DIAGNOSTIC PRIVACY — execute the real analytics object
// ===========================================================================
section("diagnostic privacy: the real analytics.log() redaction");

const analyticsSrc = grab(/const analytics = \{[\s\S]*?\n    \};/, "the analytics object");
const A = (() => {
  const fn = new Function("console", "Date", `${analyticsSrc}; return analytics;`);
  const FakeDate = function () {}; FakeDate.now = () => 1;
  return fn(fakeConsole, FakeDate);
})();

function runLogged(fn) { consoleLines.length = 0; fn(); return JSON.stringify(consoleLines); }

{
  // The exact payload the shipped call site passes (index.html email_previewed).
  const printed = runLogged(() =>
    A.log("email_previewed", { email: SENTINEL_EMAIL, name: SENTINEL_NAME, phone: SENTINEL_PHONE }));
  check("REGRESSION: email never reaches console", !printed.includes(SENTINEL_EMAIL));
  check("REGRESSION: name never reaches console", !printed.includes(SENTINEL_NAME));
  check("REGRESSION: phone never reaches console", !printed.includes(SENTINEL_PHONE));
  check("the event NAME is preserved", printed.includes("email_previewed"));
  const retained = JSON.stringify(A.events);
  check("REGRESSION: contact values are not retained in analytics.events",
    !retained.includes(SENTINEL_EMAIL) && !retained.includes(SENTINEL_NAME) && !retained.includes(SENTINEL_PHONE));
  check("the retained event still records that it happened", retained.includes("email_previewed"));
}
{
  const printed = runLogged(() =>
    A.log("session_summary", {
      sessionId: "s1", durationSec: 42,
      answers: { firmness: SENTINEL_ANSWER, sleep_position: SENTINEL_ANSWER },
      topPick: { id: "g7", name: SENTINEL_ANSWER },
      cardExpands: { g7: 2 },
    }));
  check("REGRESSION: raw quiz answers never reach console", !printed.includes(SENTINEL_ANSWER));
  check("approved aggregates survive (durationSec)", printed.includes("42"));
  check("the session identifier does NOT survive", !printed.includes("s1"));
  check("REGRESSION: raw answers are not retained in analytics.events",
    !JSON.stringify(A.events).includes(SENTINEL_ANSWER));
}
section("diagnostic privacy: an UNKNOWN event keeps only its name");
{
  // The defect a global key allowlist has: an approved KEY is not a licence to
  // print an arbitrary string. Every key that used to be globally approved is
  // tried here, each carrying a customer sentinel, on an event nobody declared.
  const APPROVED_KEYS = ["reason", "status", "step", "tier", "lang", "interest",
    "placement", "offerVersion", "sessionId", "count", "attempt", "saved",
    "itemsShown", "durationSec", "answeredCount", "entryStep", "layout"];
  const leaks = [];
  for (const k of APPROVED_KEYS) {
    const printed = runLogged(() => A.log("some_future_event", { [k]: SENTINEL_ANSWER }));
    const retained = JSON.stringify(A.events);
    if (printed.includes(SENTINEL_ANSWER)) leaks.push(`${k} (console)`);
    if (retained.includes(SENTINEL_ANSWER)) leaks.push(`${k} (retained)`);
  }
  check(`REGRESSION: no otherwise-approved key leaks on an unknown event${leaks.length ? " — LEAKED: " + leaks.join(", ") : ""}`,
    leaks.length === 0);
  // ...and the same keys carrying real contact values, all at once.
  const printed = runLogged(() => A.log("some_future_event", {
    reason: SENTINEL_EMAIL, status: SENTINEL_NAME, step: SENTINEL_PHONE,
    tier: SENTINEL_ANSWER, lang: SENTINEL_EMAIL, placement: SENTINEL_NAME,
    interest: SENTINEL_PHONE, offerVersion: SENTINEL_ANSWER, sessionId: SENTINEL_EMAIL,
  }));
  check("REGRESSION: contact values under approved keys never reach console",
    !printed.includes(SENTINEL_EMAIL) && !printed.includes(SENTINEL_NAME)
    && !printed.includes(SENTINEL_PHONE) && !printed.includes(SENTINEL_ANSWER));
  check("an unknown event still records that it happened", printed.includes("some_future_event"));
  check("...and reports how many fields it dropped, without naming them",
    /_dropped/.test(printed) && !printed.includes("offerVersion"));
}

section("diagnostic privacy: string values are enum-validated, not merely key-approved");
{
  const cases = [
    ["tier_view", "tier", "gold", true],
    ["tier_view", "tier", SENTINEL_ANSWER, false],
    ["sleep_system_step_viewed", "step", "pillow", true],
    ["sleep_system_step_viewed", "step", SENTINEL_ANSWER, false],
    ["sleep_system_decision_recorded", "status", "confirm", true],
    ["sleep_system_decision_recorded", "status", SENTINEL_ANSWER, false],
    ["finance_details_open", "placement", "drawer", true],
    ["finance_details_open", "placement", SENTINEL_ANSWER, false],
    ["finance_details_open", "lang", "es", true],
    ["finance_details_open", "lang", SENTINEL_ANSWER, false],
    ["session_ended", "reason", "idle_timeout", true],
    ["session_ended", "reason", SENTINEL_ANSWER, false],
  ];
  for (const [ev, key, val, shouldSurvive] of cases) {
    const printed = runLogged(() => A.log(ev, { [key]: val }));
    const survived = printed.includes(val);
    check(`${ev}.${key} = ${val === SENTINEL_ANSWER ? "<sentinel>" : `"${val}"`} ${shouldSurvive ? "survives" : "is redacted"}`,
      survived === shouldSurvive);
  }
}

section("diagnostic privacy: numeric and boolean fields are TYPE-validated too");
{
  // A field declared `num` or `bool` must not accept a string. Otherwise the
  // enum work is bypassed simply by choosing a differently-typed key.
  const typeCases = [
    ["session_ended", "durationSec", SENTINEL_ANSWER, false],
    ["session_ended", "durationSec", 42, true],
    ["session_ended", "answeredCount", SENTINEL_EMAIL, false],
    ["session_ended", "answeredCount", 11, true],
    ["session_ended", "resultsViewed", SENTINEL_NAME, false],
    ["session_ended", "resultsViewed", true, true],
    ["save_pick_toggle", "saved", SENTINEL_PHONE, false],
    ["save_pick_toggle", "saved", false, true],
    ["accessories_viewed", "itemsShown", SENTINEL_ANSWER, false],
    ["accessories_viewed", "itemsShown", 7, true],
  ];
  for (const [ev, key, val, shouldSurvive] of typeCases) {
    const printed = runLogged(() => A.log(ev, { [key]: val }));
    const survived = printed.includes(JSON.stringify(val));
    check(`${ev}.${key} = ${typeof val === "string" ? "<sentinel string>" : String(val)} ${shouldSurvive ? "survives" : "is redacted"}`,
      survived === shouldSurvive);
  }
  // NaN / Infinity are numbers but not diagnostics.
  check("non-finite numbers are redacted",
    !runLogged(() => A.log("session_ended", { durationSec: NaN })).includes("null"));
}

section("diagnostic privacy: identifiers and customer state are not diagnostics");
{
  const printed = runLogged(() => A.log("finance_details_open", {
    placement: "drawer", lang: "en", layout: "tablet",
    offerVersion: "2026-07", interest: "interested",
  }));
  check("financing interest is treated as customer state and redacted",
    !printed.includes("interested"));
  // Behavioural redaction alone would still pass if someone re-approved the
  // field but the enum were missing (or vice versa). Pin BOTH halves, so
  // either step back towards approving it is caught on its own.
  {
    const enumsSrc = (html.match(/ENUMS: \{[\s\S]*?\n      \},/) || [""])[0];
    const fieldsSrc = (html.match(/EVENT_FIELDS: \(function\(\) \{[\s\S]*?\n      \}\)\(\),/) || [""])[0];
    check("no `interest` enum is declared", !/\binterest:\s*\[/.test(enumsSrc));
    check("no event declares `interest` as an approved field",
      !/\binterest:\s*'/.test(fieldsSrc));
    check("no event declares `offerVersion` as an approved field",
      !/\bofferVersion:\s*'/.test(fieldsSrc));
    check("no event declares `sessionId` as an approved field",
      !/\bsessionId:\s*'/.test(fieldsSrc));
  }
  check("the placement/lang/layout diagnostics still survive",
    printed.includes("drawer") && printed.includes("tablet"));
  const s = runLogged(() => A.log("session_ended", { reason: "idle_timeout", sessionId: "abc123xyz" }));
  check("sessionId is not emitted as a diagnostic", !s.includes("abc123xyz"));
  check("the reason code still survives", s.includes("idle_timeout"));
  check("sessionSafeSummary no longer builds a sessionId at all",
    !/function sessionSafeSummary[\s\S]{0,900}?sessionId: analytics\.sessionId/.test(html));
}
{
  // Reactions and selections are named in the requirement explicitly.
  const printed = runLogged(() => {
    A.log("save_pick_toggle", { mattressId: SENTINEL_ANSWER, tier: "gold", saved: true });
    A.log("pillow_fit_recorded", { reaction: SENTINEL_ANSWER, candidateId: SENTINEL_ANSWER });
    A.log("adjustable_base_hero_shown", { snoring: true, reflux: false, backPain: true });
  });
  check("REGRESSION: saved selections never reach console", !printed.includes(SENTINEL_ANSWER));
  check("non-customer diagnostics survive (tier, saved)",
    printed.includes("gold") && printed.includes("true"));
  const health = JSON.stringify(consoleLines);
  check("REGRESSION: health-condition answers are redacted even as booleans",
    !/snoring/.test(health) && !/reflux/.test(health) && !/backPain/.test(health));
  check("...and the drop is accounted for", /_dropped/.test(health));
}
{
  check("analytics.events cannot grow a circular self-reference",
    (() => { try { JSON.stringify(A.events); return true; } catch (e) { return false; } })());
}

section("diagnostic privacy: the preview payload log");
{
  const { out, els } = buildSendHarness({ gasUrl: "" });
  consoleLines.length = 0;
  out.run();
  const printed = JSON.stringify(consoleLines);
  check("REGRESSION: the email payload is no longer printed",
    !printed.includes(SENTINEL_EMAIL) && !printed.includes(SENTINEL_NAME) && !printed.includes(SENTINEL_PHONE));
  check("...and the sleep profile with it", !printed.includes("The Back Saver"));
  check("a shape-only preview diagnostic remains", printed.includes("payload suppressed"));
  check("the shape carries counts, not contents", /"matches":2|matches.{0,4}2/.test(printed));
}

section("diagnostic privacy: static sweep of the shipped source");
{
  // No console call may pass a whole payload/summary/state object again.
  check("no console statement prints the email payload",
    !/console\.\w+\([^)]*JSON\.stringify\(payload/.test(html));
  check("no console statement prints analytics.getSummary()",
    !/console\.\w+\([^)]*getSummary\(\)/.test(html));
  check("analytics.log no longer prints its raw data argument",
    !/console\.log\('\[DreamFinder\]', event, data/.test(html));
  check("analytics.log prints the redacted copy",
    /console\.log\('\[DreamFinder\]', event, safe\);/.test(html));
  check("the drawer diagnostic no longer dumps the per-customer match map",
    !/console\.warn\('\[Drawer\] No data for', mattressId, window\._drawerData\)/.test(html));
  check("session_summary now logs the safe aggregate",
    /analytics\.log\('session_summary', sessionSafeSummary\(/.test(html));
  // Comments stripped: the source explains WHY console.clear() is not a fix,
  // and that rationale must not read as a use of it.
  const codeOnly = html.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");
  check("console.clear() is NOT used as a privacy mechanism",
    !/console\.clear\s*\(/.test(codeOnly));
  check("redaction is scoped per EVENT, not by a global key list",
    /EVENT_FIELDS:/.test(html) && !/SAFE_KEYS:/.test(html));
  check("an unlisted event yields no fields at all",
    /hasOwnProperty\.call\(this\.EVENT_FIELDS, event\)/.test(html));
  check("string values are validated against closed enums",
    /enums\[rule\] && typeof v === 'string' && enums\[rule\]\.indexOf\(v\) !== -1/.test(html));
}

} catch (err) {
  section("behavioural execution");
  check("the extracted async/privacy implementation executes end to end", false);
  console.log("      could not run against this tree: "
    + String(err && err.stack ? err.stack.split("\n")[0] : err));
  console.log("      (expected on a tree without the amendment — every post-wipe,");
  console.log("       deferred-fetch and redaction contract above is unmet.)");
}

console.log(`\nSession async/privacy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
