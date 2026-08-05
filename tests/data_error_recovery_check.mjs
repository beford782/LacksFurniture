// Phase 0.4 — recovery from the data-error overlay.
//
// This does NOT grep for function names. It EXTRACTS the real Phase 0.4 block
// from index.html (everything between the DATA LOAD + RECOVERY markers), plus
// the real L(), fetchDictionary()/loadDictionary(), session-epoch primitives,
// focusWelcomeEntry(), startQuiz(), SESSION_LAYERS and wipeLayer(), and
// EXECUTES them against a DOM shim, a programmable fetch and a fake clock —
// the same extract-and-execute pattern as tests/session_safety_check.mjs and
// tests/drawer_lifecycle_check.mjs.
//
// The regression it exists to pin: the overlay was TERMINAL. showDataError()
// set a write-once flag, wrote one sentence and showed a full-viewport layer
// containing no interactive element of any kind. startQuiz short-circuited back
// to it on every tap, screen-transition focus was refused for the rest of the
// tablet's life, and a wipe left the overlay stranded — aria-hidden="false" —
// over a fresh Welcome screen whose Start button had just been focused
// underneath it. With a salesperson and a customer both looking at it, that is
// a dead tablet mid-conversation.
//
// Every safety property below is also MUTATED: the mutation battery at the end
// rebuilds the app from deliberately broken source and fails if the assertion
// that covers it still passes. A guard that survives its own mutation is
// decorative.
//
// Run: node tests/data_error_recovery_check.mjs

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

// ---------- extract the real source ----------------------------------------
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? (m[1] !== undefined ? m[1] : m[0]) : "";
}

const DATA_BLOCK = grab(
  /\/\/ ==== PHASE 0\.4 DATA LOAD \+ RECOVERY :: BEGIN =+([\s\S]*?)\/\/ ==== PHASE 0\.4 DATA LOAD \+ RECOVERY :: END =+/,
  "the Phase 0.4 data-load + recovery block");
const L_FN = grab(/function L\(obj\) \{[\s\S]*?\n    \}/, "L()");
const DICT_FNS = grab(
  /async function fetchDictionary\(lang\) \{[\s\S]*?\n    \}\s*\n[\s\S]*?async function loadDictionary\(lang\) \{[\s\S]*?\n    \}/,
  "fetchDictionary() + loadDictionary()");
const EPOCH_BLOCK = grab(
  /var _sessionEpoch = 1;[\s\S]*?function clearSessionTimers\(\) \{[\s\S]*?\n    \}/,
  "the session-epoch primitives (sessionTimeout / sessionBound / clearSessionTimers)");
const FOCUS_WELCOME = grab(/function focusWelcomeEntry\(\) \{[\s\S]*?\n    \}/, "focusWelcomeEntry()");
const FOCUS_ACTIVE = grab(/function focusActiveScreen\(\) \{[\s\S]*?\n    \}/, "focusActiveScreen()");
// Includes the poll counter's own declaration: the recovery path resets it, so
// a suite that declared its own copy would prove nothing about the real one.
const START_QUIZ = grab(
  /var _startQuizAttempts = 0;[\s\S]*?window\.startQuiz = function\(\) \{[\s\S]*?\n    \};/,
  "startQuiz() and its poll counter");
const SESSION_LAYERS_SRC = grab(/var SESSION_LAYERS = \[[\s\S]*?\n    \];/, "SESSION_LAYERS");
const WIPE_LAYER_SRC = grab(/function wipeLayer\(spec\) \{[\s\S]*?\n    \}/, "wipeLayer()");
const SESSION_TEXT_IDS_SRC = grab(/var SESSION_TEXT_IDS = \[[\s\S]*?\n    \];/, "SESSION_TEXT_IDS");

// ---------- source-level contracts ------------------------------------------
section("source contracts: the loader is re-invocable, and nothing reloads the page");

check("the loader is a NAMED function, not the old IIFE",
  /async function loadAppData\(\) \{/.test(DATA_BLOCK)
  && !/\(async function loadAppData\(\) \{/.test(html));
check("it is invoked at boot, and its rejection cannot go unhandled",
  /\n    loadAppData\(\)\.catch\(function\(err\) \{[\s\S]*?showDataError\(\);/.test(DATA_BLOCK));
check("there is exactly one loadAppData implementation",
  (html.match(/function loadAppData\(/g) || []).length === 1);
check("no full page reload anywhere in the file, in code OR in prose",
  !/location\s*\.\s*reload\s*\(/.test(html));
check("the retry control re-invokes the loader rather than a second load path",
  /window\.dataErrorRetry = function\(\) \{[\s\S]*?loadAppData\(\)/.test(DATA_BLOCK));
check("the clean-restart control delegates to window.startOver()",
  /window\.dataErrorRestart = function\(\) \{[\s\S]*?return window\.startOver\(\);[\s\S]*?\};/.test(DATA_BLOCK));
check("clean restart contains no reset implementation of its own",
  !/dataErrorRestart[\s\S]{0,400}(analytics\.|answers\s*=|_savedPicks|SESSION_LAYERS)/.test(DATA_BLOCK));
check("window.startOver() still delegates to the ONE authoritative wipe",
  /window\.startOver = function\(\) \{\s*return resetSessionState\(/.test(html)
  && (html.match(/function resetSessionState\(/g) || []).length === 1);
// The session guard binds `_sessionEpoch` after one microtask, which only
// works because the boot call and the epoch's declaration share a script scope
// — the epoch is initialised by the time the first `await` resumes. Split that
// script block, or move the boot call, and the typeof fallback silently
// substitutes "the session never changed" and the guard turns off with no test
// failure, because a harness always declares both bindings. So the layout is
// pinned rather than assumed.
{
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const withBoot = blocks.filter((b) => /\n    loadAppData\(\)\.catch\(/.test(b));
  check("the boot call lives in exactly one script block", withBoot.length === 1);
  check("that block also declares _sessionEpoch and sessionBound, so the guard binds a real epoch",
    withBoot.length === 1
    && /var _sessionEpoch = 1;/.test(withBoot[0])
    && /function sessionBound\(fn\)/.test(withBoot[0]));
}
check("the block schedules no raw delayed work of its own",
  !/\bsetTimeout\s*\(|\bsetInterval\s*\(|requestAnimationFrame\s*\(/.test(DATA_BLOCK));
check("the block touches no scoring, financing or analytics state",
  !/analytics\s*\.|scoreM|firmnessScore|financing/i.test(DATA_BLOCK));

section("source contracts: the overlay is a focusable dialog, not a live region");

const overlayMarkup = grab(
  /<div id="dataErrorOverlay"[\s\S]*?\n  <\/div>/, "the overlay markup");
check('the overlay root is role="alertdialog"', /role="alertdialog"/.test(overlayMarkup));
check('the overlay root is aria-modal="true"', /aria-modal="true"/.test(overlayMarkup));
check('the overlay root is programmatically focusable (tabindex="-1")',
  /tabindex="-1"/.test(overlayMarkup));
check("the overlay root is named and described by its own title and body",
  /aria-labelledby="dataErrorTitle"/.test(overlayMarkup)
  && /aria-describedby="dataErrorText"/.test(overlayMarkup));
check("the overlay root starts aria-hidden", /aria-hidden="true"/.test(overlayMarkup));
check("the overlay root carries NO aria-live — announcement is focus (0.3)",
  !/id="dataErrorOverlay"[^>]*aria-live/.test(overlayMarkup)
  && !/id="dataErrorOverlay"[^>]*role="status"/.test(overlayMarkup));
check("the retry-outcome status region is a polite sr-only status",
  /<div id="dataErrorLive" role="status" aria-live="polite" class="sr-only"><\/div>/.test(overlayMarkup));
check("both controls are real buttons with touch AND click handlers",
  /id="dataErrorRetryBtn"[\s\S]*?onclick="window\.dataErrorRetry\(\)"[\s\S]*?ontouchend="event\.preventDefault\(\);window\.dataErrorRetry\(\);"/.test(overlayMarkup)
  && /id="dataErrorRestartBtn"[\s\S]*?onclick="window\.dataErrorRestart\(\)"[\s\S]*?ontouchend="event\.preventDefault\(\);window\.dataErrorRestart\(\);"/.test(overlayMarkup));
check("the controls keep the 48px target and touch-action: manipulation",
  /\.data-error__btn \{[^}]*min-height:48px/.test(html)
  && /\.data-error__btn \{[^}]*touch-action: manipulation/.test(html));
check("the controls have a visible focus ring and a forced-colors override",
  /\.data-error__btn:focus-visible \{[^}]*var\(--focus-ring-outer\)/.test(html)
  && /@media \(forced-colors: active\) \{\s*\.data-error__btn:focus-visible \{[^}]*CanvasText/.test(html));
check("no retailer name, colour or product reaches the overlay copy",
  !/Lacks|Restonic|Chattam|storePrimary/i.test(
    (DATA_BLOCK.match(/var DATA_ERROR_COPY = \{[\s\S]*?\n    \};/) || [""])[0]));

section("source contracts: the wipe's authoritative inventory");

check("dataErrorOverlay is IN the session-layer close list",
  /\{ id: 'dataErrorOverlay'/.test(SESSION_LAYERS_SRC));
check("closing it restores aria-hidden and clears aria-busy",
  /\{ id: 'dataErrorOverlay'[\s\S]*?'aria-hidden': 'true'[\s\S]*?'aria-busy': 'false'/.test(SESSION_LAYERS_SRC));
check("it also drops the visible class and the display",
  /\{ id: 'dataErrorOverlay', remove: \['visible'\], display: 'none'/.test(SESSION_LAYERS_SRC));
check("dataErrorLive is IN the session text-region inventory",
  /'dataErrorLive'/.test(SESSION_TEXT_IDS_SRC));

// ---------- harness ---------------------------------------------------------
function makeEl(id, doc, className) {
  const attrs = new Map();
  const classes = new Set((className || "").split(" ").filter(Boolean));
  const el = {
    id, hidden: false, disabled: false, textContent: "", innerHTML: "",
    style: {}, descendants: [],
    get className() { return [...classes].join(" "); },
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    setAttribute: (k, v) => attrs.set(k, String(v)),
    removeAttribute: (k) => attrs.delete(k),
    getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
    hasAttribute: (k) => attrs.has(k),
    focus() { doc.activeElement = el; },
    contains: (other) => other === el || el.descendants.indexOf(other) !== -1,
    listeners: [],
    addEventListener(evt, fn) { el.listeners.push({ evt, fn }); },
    offsetParent: {},
  };
  return el;
}

// A programmable fetch. Every route is a function so a test can defer, reject,
// return a bad status, or return a body that fails to parse.
function okJson(body) {
  return () => Promise.resolve({ ok: true, status: 200, json: async () => body });
}
function httpError(status) {
  return () => Promise.resolve({ ok: false, status, json: async () => ({}) });
}
function networkFail() {
  return () => Promise.reject(new TypeError("Failed to fetch"));
}
function badJson() {
  return () => Promise.resolve({
    ok: true, status: 200,
    json: async () => { throw new SyntaxError("Unexpected token <"); },
  });
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const GOOD_MATTRESSES = { gold: [{ id: "g1" }], silver: [{ id: "s1" }], bronze: [] };
const GOOD_QUIZ = { questions: [{ id: "q1" }, { id: "q2" }] };
const GOOD_STORE = { storeName: "Test Store", languages: ["en", "es"] };
const GOOD_ACC = [{ id: "a1" }];

function goodPlan(over) {
  return Object.assign({
    "./data/mattresses.json": okJson(GOOD_MATTRESSES),
    "./data/store-config.json": okJson(GOOD_STORE),
    "./data/quiz.json": okJson(GOOD_QUIZ),
    "./data/accessories.json": okJson(GOOD_ACC),
    "./data/dict-en.json": okJson({ "session.restart": "Restart" }),
    "./data/dict-es.json": okJson({ "session.restart": "Reiniciar" }),
  }, over || {});
}

// Build one app instance from (possibly mutated) source.
function buildApp(opts) {
  opts = opts || {};
  const source = opts.source || DATA_BLOCK;
  const plan = opts.plan || goodPlan();
  const fetchLog = [];
  const consoleLines = [];
  const doc = { activeElement: null, listeners: [] };

  const ids = ["dataErrorOverlay", "dataErrorTitle", "dataErrorText", "dataErrorLive",
    "dataErrorRetryBtn", "dataErrorRestartBtn", "startBtn", "landingHeadlineMain",
    "welcomeScreen", "questionScreen", "mattressDrawer"];
  const byId = {};
  ids.forEach((id) => { byId[id] = makeEl(id, doc); });
  // Welcome is the active screen at boot, and #startBtn lives inside it —
  // the containment focusWelcomeEntry()'s contract depends on.
  byId.welcomeScreen.classList.add("active");
  byId.welcomeScreen.descendants = [byId.startBtn, byId.landingHeadlineMain];
  byId.dataErrorOverlay.descendants = [byId.dataErrorTitle, byId.dataErrorText,
    byId.dataErrorLive, byId.dataErrorRetryBtn, byId.dataErrorRestartBtn];
  // The shipped markup's starting state, not a blank element: "aria-hidden was
  // restored" means nothing if the shim started with no attribute at all.
  byId.dataErrorOverlay.setAttribute("aria-hidden", "true");
  byId.dataErrorOverlay.setAttribute("aria-busy", "false");
  byId.dataErrorOverlay.style.display = "none";
  const body = makeEl("body", doc);
  doc.activeElement = body;
  doc.body = body;
  doc.getElementById = (id) => byId[id] || null;
  doc.querySelectorAll = () => [];
  doc.querySelector = (sel) => (sel === ".screen.active"
    ? [byId.welcomeScreen, byId.questionScreen].find((s) => s.classList.contains("active")) || null
    : null);
  // #startBtn is only focusable while its screen is active, which is what
  // makes the "focus landed on BODY" failure observable here at all. The
  // shared shim's unconditional focus() is exactly what hid it.
  byId.startBtn.focus = function() {
    if (byId.welcomeScreen.classList.contains("active")) doc.activeElement = byId.startBtn;
  };
  byId.landingHeadlineMain.focus = function() {
    if (byId.welcomeScreen.classList.contains("active")) doc.activeElement = byId.landingHeadlineMain;
  };
  doc.addEventListener = (evt, fn) => { doc.listeners.push({ evt, fn }); };
  doc.contains = () => true;

  // Fake clock for the startQuiz poll.
  let now = 0;
  const timers = [];
  const clock = {
    setTimeout(fn, ms) { timers.push({ id: timers.length + 1, at: now + (ms || 0), fn, live: true }); return timers.length; },
    clearTimeout(id) { const t = timers[id - 1]; if (t) t.live = false; },
    advance(ms) {
      now += ms;
      timers.filter((t) => t.live && t.at <= now).forEach((t) => { t.live = false; t.fn(); });
    },
    pending() { return timers.filter((t) => t.live).length; },
  };

  const fetchImpl = (url) => {
    fetchLog.push(url);
    const route = plan[url];
    if (!route) return Promise.reject(new TypeError("no route for " + url));
    return route(url);
  };
  const consoleImpl = {
    log: (...a) => consoleLines.push(["log", ...a].map(String).join(" ")),
    warn: (...a) => consoleLines.push(["warn", ...a].map(String).join(" ")),
    error: (...a) => consoleLines.push(["error", ...a].map(String).join(" ")),
  };

  const out = {};
  const win = {};
  const body_src = `
    "use strict";
    var MATTRESSES = { gold: [], silver: [], bronze: [] };
    var STORE_CONFIG = {};
    var QUESTIONS = [];
    var ACCESSORIES = [];
    var SUBBRAND_NOTES = {}, BRAND_NOTES = {}, SUBBRAND_NOTES_ES = {}, BRAND_NOTES_ES = {};
    var DICT = {};
    var currentLang = ${JSON.stringify(opts.lang || "en")};
    var currentQuestion = 0, answers = {}, editingFromReview = false;
    var analytics = { startedAt: null, log: function() {} };
    var applyCalls = [];
    function applyStoreConfig() { applyCalls.push('applyStoreConfig'); }
    function applyLanguageConfig() { applyCalls.push('applyLanguageConfig'); }
    function applyTranslations() { applyCalls.push('applyTranslations'); }
    function showScreen(id) { out.screens.push(id); }
    function renderQuestion() { out.rendered++; }
    function transportFailureCode(err) {
      var name = (err && typeof err.name === 'string') ? err.name : '';
      if (name === 'TypeError') return 'network';
      if (name === 'SyntaxError') return 'malformed_response';
      return 'unclassified';
    }
    // The ownership predicate dataErrorKeydown() consults. Controllable, so a
    // test can open the safety dialog over the overlay for real.
    var _safetyMode = null;
    function safetyDialogMode() { return _safetyMode; }
    ${L_FN}
    ${DICT_FNS}
    ${EPOCH_BLOCK}
    ${FOCUS_WELCOME}
    ${FOCUS_ACTIVE}
    ${SESSION_LAYERS_SRC}
    ${SESSION_TEXT_IDS_SRC}
    ${WIPE_LAYER_SRC}
    ${source}
    ${opts.startQuizSource || START_QUIZ}

    out.probe = function() {
      return {
        dataLoadFailed: _dataLoadFailed,
        loaded: Object.assign({}, _dataLoaded),
        generation: _dataLoadGeneration,
        inFlight: _dataLoadInFlight,
        quizAttempts: _startQuizAttempts,
        quizGeneration: _startQuizGeneration,
        accessories: ACCESSORIES,
        questions: QUESTIONS.length,
        gold: (MATTRESSES.gold || []).length,
        goldId: (MATTRESSES.gold && MATTRESSES.gold[0] && MATTRESSES.gold[0].id) || '',
        storeName: STORE_CONFIG.storeName || '',
        dictKeys: Object.keys(DICT).length,
        epoch: _sessionEpoch,
        applyCalls: applyCalls.slice(),
        lang: currentLang
      };
    };
    out.load = function() { return loadAppData(); };
    out.show = function(o) { return showDataError(o); };
    out.retry = function() { return window.dataErrorRetry(); };
    out.restart = function() { return window.dataErrorRestart(); };
    out.startQuiz = function() { return window.startQuiz(); };
    out.setLang = function(l) { currentLang = l; };
    out.applyTranslations = function() { applyTranslations(); };
    out.renderCopy = function() { renderDataError(); };
    // What the authoritative wipe does to this layer and its announcement
    // region, through the REAL inventories and the REAL wipeLayer().
    out.wipeLayers = function() {
      SESSION_LAYERS.forEach(wipeLayer);
      SESSION_TEXT_IDS.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    };
    out.bumpEpoch = function() { clearSessionTimers(); };
    out.visible = function() { return dataErrorVisible(); };
    out.keydown = function(e) { return dataErrorKeydown(e); };
    out.setSafetyMode = function(m) { _safetyMode = m; };
    out.activateScreen = function(id) {
      ['welcomeScreen', 'questionScreen'].forEach(function(s) {
        document.getElementById(s).classList.remove('active');
      });
      document.getElementById(id).classList.add('active');
    };
    out.coreReady = function() { return coreDataReady(); };
    out.seedAccessories = function(v) { ACCESSORIES = v; _dataLoaded.accessories = false; };
  `;

  new Function("document", "window", "fetch", "console", "out", "setTimeout",
    "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", body_src)(
    doc, win, fetchImpl, consoleImpl, Object.assign(out, { screens: [], rendered: 0 }),
    clock.setTimeout.bind(clock), clock.clearTimeout.bind(clock),
    () => 0, () => {});

  return { out, doc, byId, win, fetchLog, consoleLines, clock, body,
    startQuizSource: opts.startQuizSource || START_QUIZ };
}

// Drain microtasks AND the macrotask queue, so every await inside the loader
// has resumed before an assertion runs.
async function settle(times = 4) {
  for (let i = 0; i < times; i++) await new Promise((r) => setTimeout(r, 0));
}

function overlayState(h) {
  const o = h.byId.dataErrorOverlay;
  return {
    visible: o.classList.contains("visible"),
    ariaHidden: o.getAttribute("aria-hidden"),
    ariaBusy: o.getAttribute("aria-busy"),
    title: h.byId.dataErrorTitle.textContent,
    body: h.byId.dataErrorText.textContent,
    retry: h.byId.dataErrorRetryBtn.textContent,
    restart: h.byId.dataErrorRestartBtn.textContent,
    live: h.byId.dataErrorLive.textContent,
    focus: h.doc.activeElement && h.doc.activeElement.id,
  };
}

// ===========================================================================
// 1. BOOT
// ===========================================================================
section("boot: a clean load raises nothing and steals no focus");
{
  const h = buildApp();
  await settle();
  const s = overlayState(h);
  const p = h.out.probe();
  check("no overlay after a clean boot", !s.visible && s.ariaHidden === "true");
  check("the failure flag is clear", p.dataLoadFailed === false);
  check("every source is marked loaded",
    p.loaded.mattresses && p.loaded.storeConfig && p.loaded.quiz && p.loaded.accessories);
  check("the real payloads were applied (gold tier, questions, store name)",
    p.gold === 1 && p.questions === 2 && p.storeName === "Test Store");
  check("accessories were applied", p.accessories.length === 1);
  check("the post-load appliers ran in order",
    p.applyCalls.join(",") === "applyStoreConfig,applyLanguageConfig,applyTranslations");
  check("boot did not move focus", s.focus === "body");
  check("the load latch is released", p.inFlight === false);
}

// ===========================================================================
// 2. CORE FAILURE -> OVERLAY
// ===========================================================================
section("core failure raises the overlay, announces once, and offers two routes");
{
  const h = buildApp({ plan: goodPlan({ "./data/mattresses.json": httpError(503) }) });
  h.byId.dataErrorLive.textContent = "PRIOR-UTTERANCE";   // so "silent" is not vacuous
  await settle();
  const s = overlayState(h);
  const p = h.out.probe();
  check("the overlay is visible", s.visible);
  check("it is exposed to assistive tech", s.ariaHidden === "false");
  check("the failure flag is set", p.dataLoadFailed === true);
  check("the failed source is NOT marked loaded", p.loaded.mattresses === false);
  check("the sources that succeeded ARE marked loaded",
    p.loaded.storeConfig === true && p.loaded.quiz === true && p.loaded.accessories === true);
  check("focus moved to the dialog itself — one utterance, from the dialog's own name",
    s.focus === "dataErrorOverlay");
  check("the status region is silent, so nothing is said twice", s.live === "");
  check("both controls carry English labels",
    s.retry === "Try again" && s.restart === "Start over");
  check("the title and body are populated", !!s.title && !!s.body);
  check("the failure was logged without echoing the raw error object",
    h.consoleLines.some((l) => l.includes("mattresses.json")));
}

// ===========================================================================
// 3. SUCCESSFUL RETRY
// ===========================================================================
section("successful retry: state cleared, overlay closed, focus handed back");
{
  // The poll counter has to be RAISED before the retry, or "it is reset" is a
  // check on a zero that was never anything else. So: hold the mattress fetch
  // open, tap Start three times (each tap increments and schedules a poll),
  // and only then let the load fail.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({ plan });
  await settle(1);
  h.out.startQuiz(); h.out.startQuiz(); h.out.startQuiz();
  check("precondition: the poll counter is raised", h.out.probe().quizAttempts === 3);
  d.resolve({ ok: false, status: 503, json: async () => ({}) });
  await settle();
  check("precondition: the overlay is up", overlayState(h).visible);
  check("precondition: the counter survived into the failure",
    h.out.probe().quizAttempts === 3);
  const before = h.fetchLog.length;

  plan["./data/mattresses.json"] = okJson(GOOD_MATTRESSES);
  const verdict = await h.out.retry();
  await settle();
  const s = overlayState(h);
  const p = h.out.probe();
  check("the loader reports a recovery", verdict === "recovered");
  check("the overlay is hidden", !s.visible);
  check("aria-hidden is RESTORED, not left at false", s.ariaHidden === "true");
  check("aria-busy is cleared", s.ariaBusy === "false");
  check("_dataLoadFailed is cleared", p.dataLoadFailed === false);
  check("_startQuizAttempts is reset", p.quizAttempts === 0);
  check("the status region is cleared", s.live === "");
  check("focus lands on the Welcome entry, never BODY", s.focus === "startBtn");
  check("the recovered payload is applied", p.gold === 1);
  const retried = h.fetchLog.slice(before);
  check(`the retry re-fetched ONLY the missing source (${retried.join(", ") || "none"})`,
    retried.join(",") === "./data/mattresses.json");
  check("...and did not re-fetch a dictionary that had already loaded",
    retried.every((u) => u.indexOf("dict-") === -1));
  check("the quiz can now start", (h.out.startQuiz(), h.out.screens.includes("questionScreen")));
}

// ===========================================================================
// 4. REPEATED FAILURE
// ===========================================================================
section("repeated failure: announced through the status region, not re-announced by focus");
{
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({ plan });
  await settle();
  check("precondition: the overlay is up", overlayState(h).visible);
  h.byId.dataErrorRetryBtn.focus();          // where a real tap leaves focus

  const verdict = await h.out.retry();
  await settle();
  const s = overlayState(h);
  check("the loader still reports failure", verdict === "failed");
  check("the overlay stays visible", s.visible);
  check("focus is NOT pulled back to the dialog — no second announcement",
    s.focus === "dataErrorRetryBtn");
  check("the outcome is announced through the status region",
    s.live === "Still having trouble. Please notify a team member.");
  check("aria-busy is released", s.ariaBusy === "false");
  check("the failure flag stays set", h.out.probe().dataLoadFailed === true);

  // ...and a third attempt behaves identically, with no growth in state.
  const g2 = h.out.probe().generation;
  await h.out.retry();
  await settle();
  check("a third attempt advances exactly one load generation",
    h.out.probe().generation === g2 + 1);
  check("the overlay is still up and still says the same thing",
    overlayState(h).visible
    && overlayState(h).live === "Still having trouble. Please notify a team member.");
}

section("repeated failure: focus escaping the dialog is repaired, not left on BODY");
{
  const h = buildApp({ plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  h.doc.activeElement = h.body;              // something took focus out of the dialog
  await h.out.retry();
  await settle();
  check("focus is returned to the control that gets used again",
    h.doc.activeElement.id === "dataErrorRetryBtn");
}

// ===========================================================================
// 5. PARTIAL FAILURE
// ===========================================================================
section("partial failure: one dataset failing is not all of them");
{
  // 5a — accessories alone: independently non-fatal, exactly as before.
  const h = buildApp({ plan: goodPlan({ "./data/accessories.json": httpError(404) }) });
  await settle();
  const p = h.out.probe();
  check("an accessories failure never raises the overlay", !overlayState(h).visible);
  check("...and never sets the failure flag", p.dataLoadFailed === false);
  check("...and degrades to an empty list", Array.isArray(p.accessories) && p.accessories.length === 0);
  check("...while the core data is fully applied", p.gold === 1 && p.questions === 2);
  check("a warning was logged, not an error",
    h.consoleLines.some((l) => l.startsWith("warn") && l.includes("accessories.json")));
}
{
  // 5b — accessories failing does not become fatal on a retry either.
  const plan = goodPlan({ "./data/accessories.json": networkFail(), "./data/quiz.json": httpError(500) });
  const h = buildApp({ plan });
  await settle();
  plan["./data/quiz.json"] = okJson(GOOD_QUIZ);
  const verdict = await h.out.retry();
  await settle();
  check("a core recovery succeeds while accessories are still failing", verdict === "recovered");
  check("the overlay is closed", !overlayState(h).visible);
  check("accessories remain an empty list", h.out.probe().accessories.length === 0);
}
{
  // 5c — each core source in turn, and the good ones are not discarded.
  for (const [url, label] of [["./data/mattresses.json", "mattresses"],
    ["./data/store-config.json", "store-config"], ["./data/quiz.json", "quiz"]]) {
    const plan = goodPlan({ [url]: httpError(500) });
    const h = buildApp({ plan });
    await settle();
    const p = h.out.probe();
    const key = { "./data/mattresses.json": "mattresses",
      "./data/store-config.json": "storeConfig", "./data/quiz.json": "quiz" }[url];
    const others = Object.keys(p.loaded).filter((k) => k !== key);
    check(`${label} failing raises the overlay`, overlayState(h).visible);
    check(`${label} failing does not discard the sources that loaded`,
      p.loaded[key] === false && others.every((k) => p.loaded[k] === true));
    const before = h.fetchLog.length;
    plan[url] = url === "./data/mattresses.json" ? okJson(GOOD_MATTRESSES)
      : url === "./data/quiz.json" ? okJson(GOOD_QUIZ) : okJson(GOOD_STORE);
    await h.out.retry();
    await settle();
    const retried = h.fetchLog.slice(before);
    check(`the ${label} retry re-fetches only ${label}`, retried.join(",") === url);
    check(`${label} recovery closes the overlay`, !overlayState(h).visible);
  }
}
{
  // 5d — payloads that parse but the app cannot start on.
  const cases = [
    ["mattresses.json with no gold tier", { "./data/mattresses.json": okJson({ gold: [], silver: [], bronze: [] }) }],
    ["quiz.json with no questions", { "./data/quiz.json": okJson({ questions: [] }) }],
    ["mattresses.json that fails to parse", { "./data/mattresses.json": badJson() }],
    ["a network-level rejection", { "./data/quiz.json": networkFail() }],
  ];
  for (const [label, over] of cases) {
    const h = buildApp({ plan: goodPlan(over) });
    await settle();
    check(`${label} is treated as a core failure`,
      overlayState(h).visible && h.out.probe().dataLoadFailed === true);
  }
  // The no-gold case specifically must not be "recoverable" into a Start button
  // that polls for ten seconds and puts the same overlay back.
  const plan = goodPlan({ "./data/mattresses.json": okJson({ gold: [], silver: [], bronze: [] }) });
  const h = buildApp({ plan });
  await settle();
  const verdict = await h.out.retry();
  await settle();
  check("retrying unusable data reports failure rather than a false recovery",
    verdict === "failed" && overlayState(h).visible && h.out.probe().dataLoadFailed === true);
}

// ===========================================================================
// 6. REPEATED / CONCURRENT RETRY
// ===========================================================================
section("repeated taps are answered, not queued");
{
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": httpError(503) });
  const h = buildApp({ plan });
  await settle();
  plan["./data/mattresses.json"] = () => d.promise;
  const first = h.out.retry();
  await settle(1);
  const genAfterFirst = h.out.probe().generation;
  const fetchesAfterFirst = h.fetchLog.length;

  const second = h.out.retry();
  const third = h.out.retry();
  check("a second tap while a load is in flight is a no-op", second === false && third === false);
  check("...it opens no new load generation", h.out.probe().generation === genAfterFirst);
  check("...and issues no new requests", h.fetchLog.length === fetchesAfterFirst);
  check("...but it does say something rather than looking dead",
    overlayState(h).live === "Trying again…");
  check("the dialog is marked busy while the load runs",
    overlayState(h).ariaBusy === "true");
  // aria-busy on an ancestor tells assistive tech to withhold live-region
  // updates, and #dataErrorLive is inside the layer — so the "Trying again"
  // write has to happen BEFORE the flag, or it is the one message this branch
  // exists to deliver and the one most likely to be swallowed.
  check("the status is written before aria-busy is raised, not after",
    /setDataErrorStatus\(L\(DATA_ERROR_COPY\.retrying\)\);\s*[\r\n]+\s*if \(overlay\) overlay\.setAttribute\('aria-busy', 'true'\);/
      .test(DATA_BLOCK));

  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  const verdict = await first;
  await settle();
  check("the in-flight load still completes and recovers", verdict === "recovered");
  check("the latch is released afterwards", h.out.probe().inFlight === false);
}

// ===========================================================================
// 7. STALE / OUT-OF-ORDER COMPLETION
// ===========================================================================
section("first success wins, whichever response lands last");
{
  // Two loads racing on the SAME url must apply ONE payload, and which one must
  // not depend on arrival order. Distinguishable payloads, or "it was applied"
  // is true either way and the guard could be deleted unnoticed.
  const OLDER = { gold: [{ id: "older" }], silver: [], bronze: [] };
  const NEWER = { gold: [{ id: "newer" }], silver: [], bronze: [] };
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({ plan });
  await settle(1);
  plan["./data/mattresses.json"] = okJson(NEWER);
  await h.out.load();                       // the newer load lands first
  await settle();
  check("the load that landed first applied its payload",
    h.out.probe().goldId === "newer" && h.out.probe().loaded.mattresses === true);
  d.resolve({ ok: true, status: 200, json: async () => OLDER });
  await settle();
  check("the slower response landing afterwards does NOT overwrite it",
    h.out.probe().goldId === "newer");
}
{
  // A failed accessories load leaves an EMPTY list, never a stale one. Seeded
  // first: ACCESSORIES starts as [] by declaration, so asserting emptiness
  // after a failure proves nothing unless it held something to begin with.
  const h = buildApp({ plan: goodPlan({ "./data/accessories.json": httpError(404) }) });
  await settle();
  h.out.seedAccessories([{ id: "stale-from-a-previous-load" }]);
  check("precondition: the list is not empty", h.out.probe().accessories.length === 1);
  await h.out.load();
  await settle();
  check("a failed accessories load degrades to an empty list, not a stale one",
    h.out.probe().accessories.length === 0);
  check("...and still does not raise the overlay", !overlayState(h).visible);
}

section("a superseded load contributes its data but never speaks");
{
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({ plan });
  await settle(1);
  // A NEWER load starts and fails while the first is still in flight.
  plan["./data/mattresses.json"] = httpError(500);
  const newer = h.out.load();
  await settle();
  check("the newer load raised the overlay", overlayState(h).visible);
  check("the newer load reports failure", (await newer) === "failed");

  // Now the older one lands, successfully.
  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await settle();
  check("the older load's payload is still applied — good data is never thrown away",
    h.out.probe().loaded.mattresses === true && h.out.probe().gold === 1);
  check("but it does NOT close an overlay a newer failure raised",
    overlayState(h).visible === true);
  check("...and does not clear the failure flag", h.out.probe().dataLoadFailed === true);
  check("a fresh retry then recovers with nothing left to fetch",
    (await h.out.retry()) === "recovered" && !overlayState(h).visible);
}

section("a load that lands after a wipe updates state but never announces");
{
  // 7a — a SUCCESS landing after the wipe.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": httpError(503) });
  const h = buildApp({ plan });
  await settle();
  check("precondition: the overlay is up", overlayState(h).visible);
  plan["./data/mattresses.json"] = () => d.promise;
  const retry = h.out.retry();
  await settle(1);

  h.out.wipeLayers();                 // the wipe closes the layer...
  h.out.bumpEpoch();                  // ...and rotates the session epoch
  h.byId.startBtn.focus();            // the wipe's own focus, which must stand
  h.doc.activeElement = h.byId.startBtn;
  const focusBefore = h.doc.activeElement.id;

  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  const verdict = await retry;
  await settle();
  const s = overlayState(h);
  check("the late success still clears the failure state", verdict === "recovered"
    && h.out.probe().dataLoadFailed === false);
  check("the overlay stays closed", !s.visible && s.ariaHidden === "true");
  check("the wipe's focus is not stolen by the late completion",
    h.doc.activeElement.id === focusBefore);
}
{
  // 7a' — the epoch guard in isolation. resetSessionState() closes the layers
  // and THEN rotates the epoch, so this is the ordering-independent half of the
  // property: once the session has moved on, a late recovery updates state and
  // stops there, whatever the overlay's visual state happens to be.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": httpError(503) });
  const h = buildApp({ plan });
  await settle();
  plan["./data/mattresses.json"] = () => d.promise;
  const retry = h.out.retry();
  await settle(1);
  h.out.bumpEpoch();                  // epoch rotates while the overlay is STILL up
  h.byId.questionScreen.focus();      // whatever the new owner focused
  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await retry;
  await settle();
  check("the late recovery still closes the overlay and clears the flag",
    !overlayState(h).visible && h.out.probe().dataLoadFailed === false);
  check("but it does not move focus once the session has rotated",
    h.doc.activeElement.id === "questionScreen");
}
{
  // 7b — a FAILURE landing after the wipe must not raise a layer over the
  // fresh session, or announce into it.
  const d = deferred();
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({ plan });
  await settle();
  plan["./data/quiz.json"] = () => d.promise;
  const retry = h.out.retry();
  await settle(1);

  h.out.wipeLayers();
  h.out.bumpEpoch();
  h.byId.startBtn.focus();

  d.resolve({ ok: false, status: 500, json: async () => ({}) });
  const verdict = await retry;
  await settle();
  const s = overlayState(h);
  check("the late failure is still recorded", verdict === "failed"
    && h.out.probe().dataLoadFailed === true);
  check("no overlay is raised over the fresh Welcome screen", !s.visible);
  check("nothing is announced into the new session", s.live === "");
  check("focus stays where the wipe put it", h.doc.activeElement.id === "startBtn");
  check("and the next Start tap surfaces the failure properly",
    (h.out.startQuiz(), overlayState(h).visible
      && h.doc.activeElement.id === "dataErrorOverlay"));
}

// ===========================================================================
// 8. WIPE / RESTART WHILE THE OVERLAY IS VISIBLE
// ===========================================================================
section("wipe and clean restart while the overlay is visible");
{
  const h = buildApp({ plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  // The state a wipe landing mid-retry would actually find, so none of the
  // assertions below can pass on a value that was already correct.
  h.byId.dataErrorLive.textContent = "PRIOR-UTTERANCE";
  h.byId.dataErrorOverlay.setAttribute("aria-busy", "true");
  h.byId.dataErrorOverlay.style.display = "flex";
  check("precondition: overlay up, exposed, busy, and holding an utterance",
    overlayState(h).visible && overlayState(h).ariaHidden === "false"
    && overlayState(h).ariaBusy === "true" && overlayState(h).live === "PRIOR-UTTERANCE");

  h.out.wipeLayers();                 // the REAL SESSION_LAYERS through the REAL wipeLayer
  const s = overlayState(h);
  check("the wipe closes the overlay", !s.visible);
  check("the wipe restores aria-hidden", s.ariaHidden === "true");
  check("the wipe clears aria-busy", s.ariaBusy === "false");
  check("the wipe sets display:none", h.byId.dataErrorOverlay.style.display === "none");
  check("the wipe clears the announcement region", s.live === "");
}
{
  const h = buildApp({ plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  const calls = [];
  h.win.startOver = function() { calls.push("startOver"); h.out.wipeLayers(); return "wiped"; };
  const r = h.out.restart();
  check("Start over delegates to the canonical wipe exactly once",
    calls.length === 1 && r === "wiped");
  check("...which closes the overlay through the layer inventory",
    !overlayState(h).visible && overlayState(h).ariaHidden === "true");
}

// ===========================================================================
// 9. THE STALE START-QUIZ POLL
// ===========================================================================
section("a poll queued before the overlay appeared cannot start a quiz after recovery");
{
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({ plan });
  await settle(1);
  h.out.startQuiz();                          // data not in yet -> schedules a poll
  check("precondition: a poll is pending and no quiz started",
    h.clock.pending() === 1 && !h.out.screens.includes("questionScreen"));

  h.out.show();                               // the overlay appears (staff-notify)
  check("the overlay retired the poll generation", h.out.probe().quizGeneration > 0);

  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await settle();
  check("the data recovered", h.out.probe().dataLoadFailed === false);
  h.clock.advance(500);                       // the stale poll fires
  check("the stale poll does NOT start a quiz nobody asked for",
    !h.out.screens.includes("questionScreen"));
  h.out.startQuiz();                          // an explicit tap still works
  check("an explicit Start still starts the quiz",
    h.out.screens.includes("questionScreen"));
}

// ===========================================================================
// 8b. THE QUIZ NEVER STARTS ON PARTIAL CORE DATA, AND RECOVERY FOCUSES THE
//     SCREEN THAT IS ACTUALLY ACTIVE
// ===========================================================================
section("partial core data cannot start a quiz, and recovery focuses what is active");
{
  // Per-source application publishes mattresses and quiz the moment they land.
  // Under the old Promise.all they could not arrive without store-config, so
  // "the quiz started while a core source was still in flight" was unreachable.
  // It must stay unreachable.
  const d = deferred();
  const plan = goodPlan({ "./data/store-config.json": () => d.promise });
  const h = buildApp({ plan });
  await settle();
  const p = h.out.probe();
  check("precondition: mattresses and quiz landed, store-config has not",
    p.loaded.mattresses && p.loaded.quiz && p.loaded.storeConfig === false);
  check("precondition: the old guard alone would have let the quiz start",
    p.gold > 0 && p.questions > 0);
  h.out.startQuiz();
  check("the quiz does NOT start while a core source is outstanding",
    !h.out.screens.includes("questionScreen") && h.out.coreReady() === false);

  d.resolve({ ok: true, status: 200, json: async () => GOOD_STORE });
  await settle();
  h.out.startQuiz();
  check("...and starts as soon as every core source is in",
    h.out.screens.includes("questionScreen") && h.out.coreReady() === true);
}
{
  // Belt and braces on the same failure: if the overlay is ever raised over a
  // screen other than Welcome, recovery must not hand focus to a Start button
  // inside a display:none container — that lands on BODY, which is precisely
  // what focusWelcomeEntry()'s own contract says it exists to prevent.
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({ plan });
  await settle();
  h.out.activateScreen("questionScreen");
  h.out.show();
  check("precondition: the overlay is up over a non-Welcome screen",
    overlayState(h).visible && !h.byId.welcomeScreen.classList.contains("active"));
  plan["./data/quiz.json"] = okJson(GOOD_QUIZ);
  await h.out.retry();
  await settle();
  check("recovery focuses the ACTIVE screen, never BODY",
    h.doc.activeElement === h.byId.questionScreen);
  check("...and the overlay is closed and out of the tree",
    !overlayState(h).visible && overlayState(h).ariaHidden === "true");
}

// ===========================================================================
// 9b. TAB CONTAINMENT
// ===========================================================================
section("the modal contains Tab, and Escape does not dismiss a broken kiosk");
{
  const h = buildApp({ plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  const overlay = h.byId.dataErrorOverlay;
  const retry = h.byId.dataErrorRetryBtn;
  const restart = h.byId.dataErrorRestartBtn;
  const key = (k, shift) => {
    let prevented = false;
    h.out.keydown({ key: k, shiftKey: !!shift, preventDefault() { prevented = true; } });
    return prevented;
  };
  // On the DOCUMENT, not the layer: a listener on the layer only fires while
  // focus is already inside it, which is the one case that needs no repair.
  check("the keydown handler is bound to the document exactly once",
    h.doc.listeners.filter((l) => l.evt === "keydown").length === 1
    && overlay.listeners.filter((l) => l.evt === "keydown").length === 0);
  check("precondition: focus starts on the container", h.doc.activeElement === overlay);

  check("Tab from the container hands off to the first control",
    key("Tab") && h.doc.activeElement === retry);
  check("Tab from the first control is left to the browser",
    !key("Tab") && h.doc.activeElement === retry);
  restart.focus();
  check("Tab from the last control wraps to the first",
    key("Tab") && h.doc.activeElement === retry);
  check("Shift+Tab from the first control wraps to the last",
    key("Tab", true) && h.doc.activeElement === restart);
  overlay.focus();
  check("Shift+Tab from the container hands off to the last control",
    key("Tab", true) && h.doc.activeElement === restart);

  h.byId.startBtn.focus();                 // focus escaped underneath the modal
  check("Tab from outside the layer is pulled back in",
    key("Tab") && h.doc.activeElement === retry);

  const before = h.doc.activeElement;
  check("Escape does nothing — there is no route out that leaves the kiosk broken",
    !key("Escape") && h.doc.activeElement === before && overlayState(h).visible);

  h.out.show({ retryFailed: true });
  check("a repeat show does not stack a second listener",
    h.doc.listeners.filter((l) => l.evt === "keydown").length === 1);

  // OWNERSHIP. Being on the document means this handler sees Tabs that belong
  // to a layer stacked ON TOP of this one, and this layer stays `visible`
  // underneath. The reachable case: a broken kiosk idles for five minutes, the
  // timeout warning opens, and openSafetyDialog() inerts every body child —
  // this overlay among them. Cancelling the dialog's Tab and then focusing into
  // an inert subtree kills Tab inside a dialog whose Escape deliberately does
  // not cancel, locking a keyboard user out of Continue while the session wipes.
  h.out.setSafetyMode("timeout");
  h.byId.dataErrorOverlay.setAttribute("inert", "");
  h.byId.startBtn.focus();
  h.doc.activeElement = h.byId.landingHeadlineMain;   // stand-in for the dialog's title
  const held = h.doc.activeElement;
  check("Tab is left alone while the safety dialog owns the screen",
    !key("Tab") && h.doc.activeElement === held);
  check("...and Shift+Tab likewise", !key("Tab", true) && h.doc.activeElement === held);

  h.byId.dataErrorOverlay.removeAttribute("inert");
  check("the safety-dialog mode alone is enough to refuse",
    !key("Tab") && h.doc.activeElement === held);
  h.out.setSafetyMode(null);
  h.byId.dataErrorOverlay.setAttribute("inert", "");
  check("an inert overlay alone is enough to refuse",
    !key("Tab") && h.doc.activeElement === held);
  h.byId.dataErrorOverlay.removeAttribute("inert");
  h.byId.mattressDrawer.classList.add("drawer-open");
  check("an open drawer is enough to refuse",
    !key("Tab") && h.doc.activeElement === held);
  h.byId.mattressDrawer.classList.remove("drawer-open");
  check("with every other layer gone, containment resumes",
    key("Tab") && h.doc.activeElement === retry);

  h.out.wipeLayers();
  h.byId.startBtn.focus();
  check("with the layer closed the handler is inert",
    !key("Tab") && h.doc.activeElement === h.byId.startBtn);
}

// ===========================================================================
// 10. BILINGUAL, INCLUDING WITH NO DICTIONARY AT ALL
// ===========================================================================
section("both languages, dictionary or no dictionary");
{
  const h = buildApp({ lang: "es", plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  const s = overlayState(h);
  check("Spanish title", s.title === "Tenemos problemas para cargar");
  check("Spanish body", s.body.startsWith("Por favor avise a un miembro del equipo"));
  check("Spanish controls",
    s.retry === "Intentar de nuevo" && s.restart === "Empezar de nuevo");
  await h.out.retry();
  await settle();
  check("Spanish retry-failure status",
    overlayState(h).live.startsWith("Seguimos teniendo problemas"));
}
{
  // Every dictionary route fails, so DICT stays empty. The overlay must still
  // be fully readable in both languages.
  const noDict = goodPlan({
    "./data/quiz.json": httpError(500),
    "./data/dict-en.json": networkFail(),
    "./data/dict-es.json": networkFail(),
  });
  const h = buildApp({ lang: "es", plan: noDict });
  await settle();
  const s = overlayState(h);
  check("no dictionary was loaded at all", h.out.probe().dictKeys === 0);
  check("the Spanish copy is still there with no dictionary",
    s.title === "Tenemos problemas para cargar"
    && s.retry === "Intentar de nuevo" && s.restart === "Empezar de nuevo");
  check("no dictionary KEY leaked into the visible copy",
    !/^[a-z_]+\.[a-z_]+$/.test(s.title) && !/^[a-z_]+\.[a-z_]+$/.test(s.retry));

  const hEn = buildApp({ lang: "en", plan: Object.assign({}, noDict) });
  await settle();
  check("...and the English copy likewise",
    overlayState(hEn).title === "We’re having trouble loading"
    && overlayState(hEn).retry === "Try again");
}
{
  // A language change while the overlay is up relocalises it in place.
  const h = buildApp({ lang: "en", plan: goodPlan({ "./data/quiz.json": httpError(500) }) });
  await settle();
  check("precondition: English copy", overlayState(h).retry === "Try again");
  h.out.setLang("es");
  h.out.renderCopy();
  check("the visible overlay follows the language change",
    overlayState(h).retry === "Intentar de nuevo"
    && overlayState(h).title === "Tenemos problemas para cargar");
}
check("applyTranslations re-renders the overlay copy, but only while it is visible",
  /if \(typeof renderDataError === 'function'[\s\S]{0,160}dataErrorVisible\(\)\) \{\s*renderDataError\(\);/.test(html));

// ===========================================================================
// 11. MUTATION BATTERY — every safety property above, removed
// ===========================================================================
section("mutations: each assertion must fail when its safety property is removed");

// index.html is CRLF, so a multi-line search string has to tolerate the \r the
// extracted source really carries. A mutation that silently fails to apply
// would leave the "caught" assertion passing against UNMUTATED source, which is
// the vacuous outcome this battery exists to prevent — so the substitution is
// itself asserted.
function mutate(from, to) {
  const re = new RegExp(
    from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\r?\n/g, "\\r?\\n"));
  const src = DATA_BLOCK.replace(re, to);
  check(`  [setup] mutation applied: ${from.replace(/\s+/g, " ").slice(0, 56)}…`,
    src !== DATA_BLOCK);
  return src;
}

{
  // M1 — recovery no longer clears the write-once failure flag.
  const h = buildApp({
    source: mutate("      _dataLoadFailed = false;\n      _startQuizAttempts = 0;",
      "      _startQuizAttempts = 0;"),
    plan: goodPlan(),
  });
  await settle();
  h.out.show();                               // force the overlay up
  await h.out.retry();
  await settle();
  check("MUTATION: a recovery that does not clear _dataLoadFailed is caught",
    h.out.probe().dataLoadFailed === true);
}
{
  // M2 — recovery no longer resets the poll counter. Same shape as the positive
  // case: the counter is raised for real first, so the mutant has something to
  // leave standing.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({
    source: mutate("      _startQuizAttempts = 0;\n      var wasVisible", "      var wasVisible"),
    plan,
  });
  await settle(1);
  h.out.startQuiz(); h.out.startQuiz();
  const raised = h.out.probe().quizAttempts;
  check("  [setup] the counter really was raised", raised === 2);
  d.resolve({ ok: false, status: 503, json: async () => ({}) });
  await settle();
  plan["./data/mattresses.json"] = okJson(GOOD_MATTRESSES);
  await h.out.retry();
  await settle();
  check("MUTATION: a recovery that leaves _startQuizAttempts standing is caught",
    h.out.probe().quizAttempts === raised);
}
{
  // M3 — the overlay is hidden but left in the accessibility tree.
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({
    source: mutate("      overlay.setAttribute('aria-hidden', 'true');\n      overlay.setAttribute('aria-busy', 'false');\n      setDataErrorStatus('');",
      "      overlay.setAttribute('aria-busy', 'false');\n      setDataErrorStatus('');"),
    plan,
  });
  await settle();
  plan["./data/quiz.json"] = okJson(GOOD_QUIZ);
  await h.out.retry();
  await settle();
  check("MUTATION: hiding without restoring aria-hidden is caught",
    overlayState(h).ariaHidden === "false");
}
{
  // M4 — the generation guard is removed, so a superseded load speaks.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({
    source: mutate("      if (generation !== _dataLoadGeneration) return 'stale';",
      "      if (false) return 'stale';"),
    plan,
  });
  await settle(1);
  plan["./data/mattresses.json"] = httpError(500);
  await h.out.load();
  await settle();
  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await settle();
  check("MUTATION: a superseded load closing a newer failure's overlay is caught",
    !overlayState(h).visible);
}
{
  // M5a — the session guard is removed, so a late FAILURE raises a layer over
  // the fresh session.
  const d = deferred();
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({
    source: mutate("        var owned = sessionUnchanged() === true;", "        var owned = true;"),
    plan,
  });
  await settle();
  plan["./data/quiz.json"] = () => d.promise;
  const retry = h.out.retry();
  await settle(1);
  h.out.wipeLayers(); h.out.bumpEpoch(); h.byId.startBtn.focus();
  d.resolve({ ok: false, status: 500, json: async () => ({}) });
  await retry;
  await settle();
  check("MUTATION: a post-wipe failure re-raising the overlay is caught",
    overlayState(h).visible === true);
}
{
  // M5b — and the same guard on the SUCCESS path: a late recovery that moves
  // focus after the session rotated.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": httpError(503) });
  const h = buildApp({
    source: mutate("        var owned = sessionUnchanged() === true;", "        var owned = true;"),
    plan,
  });
  await settle();
  plan["./data/mattresses.json"] = () => d.promise;
  const retry = h.out.retry();
  await settle(1);
  h.out.bumpEpoch();                          // the epoch rotates under the load
  h.byId.questionScreen.focus();              // stand-in for the new owner's target
  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await retry;
  await settle();
  check("MUTATION: a late recovery stealing focus from the new session is caught",
    h.doc.activeElement.id === "startBtn");
}
{
  // M6 — the loader stops skipping sources that already loaded.
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({
    source: mutate("            .filter(function(src) { return !_dataLoaded[src.key]; })",
      "            .filter(function(src) { return true; })"),
    plan,
  });
  await settle();
  const before = h.fetchLog.length;
  plan["./data/quiz.json"] = okJson(GOOD_QUIZ);
  await h.out.retry();
  await settle();
  const retried = h.fetchLog.slice(before).filter((u) => u.indexOf("dict-") === -1);
  check("MUTATION: a retry that re-fetches everything is caught",
    retried.length > 1);
}
{
  // M7 — the usability precondition on mattresses.json is removed.
  const h = buildApp({
    source: mutate("          if (!payload || !payload.gold || !payload.gold.length) {\n            throw new Error('mattresses.json has no gold tier');\n          }",
      "          if (false) { throw new Error('mattresses.json has no gold tier'); }"),
    plan: goodPlan({ "./data/mattresses.json": okJson({ gold: [], silver: [], bronze: [] }) }),
  });
  await settle();
  check("MUTATION: accepting a mattress file the app cannot start on is caught",
    !overlayState(h).visible && h.out.probe().dataLoadFailed === false);
}
{
  // M8 — the overlay stops retiring the pending start-quiz poll.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": () => d.promise });
  const h = buildApp({
    source: mutate("      _startQuizGeneration++;", "      _startQuizGeneration += 0;"),
    plan,
  });
  await settle(1);
  h.out.startQuiz();
  h.out.show();
  d.resolve({ ok: true, status: 200, json: async () => GOOD_MATTRESSES });
  await settle();
  h.clock.advance(500);
  check("MUTATION: a stale poll starting the quiz after recovery is caught",
    h.out.screens.includes("questionScreen"));
}
{
  // M9 — the overlay re-announces itself on every failure.
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({
    source: mutate("      if (!wasVisible) {", "      if (true) {"),
    plan,
  });
  await settle();
  h.byId.dataErrorRetryBtn.focus();
  await h.out.retry();
  await settle();
  check("MUTATION: re-focusing the dialog on a repeat failure is caught",
    h.doc.activeElement.id === "dataErrorOverlay");
}
{
  // M9b — the container hand-off is removed, so Shift+Tab off the initial
  // focus destination walks straight out of the modal.
  const h = buildApp({
    source: mutate("      if (active === overlay || !dataErrorOwnsFocus()) {",
      "      if (false) {"),
    plan: goodPlan({ "./data/quiz.json": httpError(500) }),
  });
  await settle();
  let prevented = false;
  h.out.keydown({ key: "Tab", shiftKey: true, preventDefault() { prevented = true; } });
  check("MUTATION: Tab escaping the modal from the container is caught",
    !prevented && h.doc.activeElement === h.byId.dataErrorOverlay);
}
{
  // M10 — the in-flight latch is removed, so taps stack up.
  const d = deferred();
  const plan = goodPlan({ "./data/mattresses.json": httpError(503) });
  const h = buildApp({
    source: mutate("      if (_dataLoadInFlight) {", "      if (false) {"),
    plan,
  });
  await settle();
  plan["./data/mattresses.json"] = () => d.promise;
  h.out.retry();
  await settle(1);
  const gen = h.out.probe().generation;
  h.out.retry();
  await settle(1);
  check("MUTATION: a second tap opening a second load generation is caught",
    h.out.probe().generation > gen);
}

{
  // M11 — the ownership refusals are removed, so the document-level handler
  // cancels Tab for a dialog stacked on top of this layer.
  const h = buildApp({
    source: mutate("      if (overlay.hasAttribute && overlay.hasAttribute('inert')) return;\n      if (typeof safetyDialogMode === 'function' && safetyDialogMode() !== null) return;",
      "      if (false) return;"),
    plan: goodPlan({ "./data/quiz.json": httpError(500) }),
  });
  await settle();
  h.out.setSafetyMode("timeout");
  h.byId.dataErrorOverlay.setAttribute("inert", "");
  h.doc.activeElement = h.byId.landingHeadlineMain;
  let prevented = false;
  h.out.keydown({ key: "Tab", shiftKey: false, preventDefault() { prevented = true; } });
  check("MUTATION: stealing Tab from the safety dialog is caught",
    prevented && h.doc.activeElement !== h.byId.landingHeadlineMain);
}
{
  // M12 — recovery goes back to focusing Welcome unconditionally, so focus is
  // left inside the layer it just hid (BODY, in a real browser).
  const plan = goodPlan({ "./data/quiz.json": httpError(500) });
  const h = buildApp({
    source: mutate("      if (onWelcome && typeof focusWelcomeEntry === 'function') focusWelcomeEntry();\n      else if (typeof focusActiveScreen === 'function') focusActiveScreen();",
      "      if (typeof focusWelcomeEntry === 'function') focusWelcomeEntry();"),
    plan,
  });
  await settle();
  h.out.activateScreen("questionScreen");
  h.out.show();
  h.byId.dataErrorRetryBtn.focus();
  plan["./data/quiz.json"] = okJson(GOOD_QUIZ);
  await h.out.retry();
  await settle();
  check("MUTATION: focusing a hidden Welcome from another screen is caught",
    h.doc.activeElement !== h.byId.questionScreen);
}
{
  // M13 — startQuiz drops the coreDataReady() guard, so the quiz starts with a
  // core source still in flight.
  const d = deferred();
  const plan = goodPlan({ "./data/store-config.json": () => d.promise });
  const h = buildApp({
    source: DATA_BLOCK,
    plan,
    startQuizSource: START_QUIZ.replace("|| QUESTIONS.length === 0 || !coreDataReady()",
      "|| QUESTIONS.length === 0"),
  });
  await settle();
  // Anchored to the GUARD, not to the identifier: the comment above it names
  // coreDataReady() too, so a bare /coreDataReady/ would match unmutated source
  // and report a substitution that never happened.
  check("  [setup] the startQuiz guard really was weakened",
    /QUESTIONS\.length === 0 \|\| !coreDataReady\(\)/.test(START_QUIZ)
    && !/QUESTIONS\.length === 0 \|\| !coreDataReady\(\)/.test(h.startQuizSource));
  h.out.startQuiz();
  check("MUTATION: starting a quiz on partial core data is caught",
    h.out.screens.includes("questionScreen"));
}

// ===========================================================================
console.log(`\nData-error recovery check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
