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
  // The one property the recovery suite cannot see: it lives in the Gate 1B
  // dialog, which only the session suite executes.
  ["the safety dialog restores focus behind a visible overlay",
    "var errorLayer = document.getElementById('dataErrorOverlay');\n        if (errorLayer && errorLayer.classList && errorLayer.classList.contains('visible')",
    "var errorLayer = document.getElementById('dataErrorOverlay');\n        if (false && errorLayer.classList && errorLayer.classList.contains('visible')",
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
];

// ---------------------------------------------------------------------------
if (process.argv.includes("--list")) {
  MUTATIONS.forEach(([label], i) => console.log(`${String(i + 1).padStart(2)}. ${label}`));
  console.log(`\n${MUTATIONS.length} mutations; default suites: ${DEFAULT_SUITES.join(", ")}`);
  process.exit(0);
}

const sandbox = mkdtempSync(join(tmpdir(), "df-mutsweep-"));
process.on("exit", () => { try { rmSync(sandbox, { recursive: true, force: true }); } catch {} });
for (const d of ["tests", "data", "docs", "tools", "incoming"]) {
  cpSync(join(root, d), join(sandbox, d), { recursive: true });
}
for (const f of ["index.html", "Code.gs"]) cpSync(join(root, f), join(sandbox, f));

const PRISTINE = readFileSync(join(sandbox, "index.html"), "utf8");

function runSuites(suites) {
  const red = [];
  for (const s of suites) {
    try {
      execFileSync("node", [s], { cwd: sandbox, stdio: "pipe", timeout: 180000 });
    } catch {
      red.push(s.replace("tests/", "").replace("_check.mjs", ""));
    }
  }
  return red;
}

function asRegex(find) {
  return new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\r?\n/g, "\\r?\\n"));
}

let survivors = 0, notApplied = 0, caught = 0;
const baseline = runSuites(WITH_SESSION);
console.log(`baseline (unmutated): ${baseline.length ? "RED — " + baseline.join(",") : "green"}\n`);
if (baseline.length) {
  console.log("::error:: the sweep cannot mean anything while the suites are red unmutated");
  process.exit(1);
}

for (const [label, find, replace, suites] of MUTATIONS) {
  const mutated = PRISTINE.replace(asRegex(find), replace);
  if (mutated === PRISTINE) {
    console.log(`  [NOT APPLIED] ${label}`);
    notApplied++;
    continue;
  }
  writeFileSync(join(sandbox, "index.html"), mutated);
  const red = runSuites(suites || DEFAULT_SUITES);
  if (red.length === 0) {
    console.log(`  [SURVIVED]    ${label}`);
    survivors++;
  } else {
    console.log(`  [caught by ${red.join(",")}] ${label}`);
    caught++;
  }
}
writeFileSync(join(sandbox, "index.html"), PRISTINE);

console.log(`\nMutation sweep: ${caught}/${MUTATIONS.length} caught, ${survivors} survived, ${notApplied} did not apply`);
if (survivors) console.log("A SURVIVOR is a safety property with no effective test.");
if (notApplied) console.log("A mutation that DID NOT APPLY is a stale manifest entry — its target moved or was renamed.");
process.exit(survivors === 0 && notApplied === 0 ? 0 : 1);
