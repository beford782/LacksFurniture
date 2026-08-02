// Handoff interest focus/announcement check — Commit C (Cycle 1) invariants,
// including the amend-round fixes: bottom specialist announcement, repeatable
// announcements (clear + deferred repopulate), and tracked/cancellable
// pending work (focus frame + announce timer) reset by startOver().
//
// The REAL functions are regex-extracted from index.html and executed inside
// a shared-scope factory with controlled setTimeout/clearTimeout/rAF stubs —
// not reimplemented fakes. Static pins cover wiring that needs a live DOM.
//
// Run: node tests/handoff_interest_check.mjs

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
function count(re) { return (html.match(re) || []).length; }
function extract(re, name) {
  const m = html.match(re);
  check(`${name} found`, !!m);
  return m ? m[0] : "";
}

// --- extract the real functions ---
const mapSrc = extract(/function finInterestFocusTarget\(state\)\s*\{[\s\S]*?\n    \}/, "finInterestFocusTarget()");
const annSrc = extract(/function announceFinInterest\(state\)\s*\{[\s\S]*?\n    \}/, "announceFinInterest()");
const cancelSrc = extract(/function cancelFinInterestPending\(\)\s*\{[\s\S]*?\n    \}/, "cancelFinInterestPending()");

// --- behavioral: focus target mapping (unchanged contract) ---
const target = new Function(`${mapSrc}; return finInterestFocusTarget;`)();
check("Yes (interested) -> Change", target("interested") === "hf2FinancingInterestChange");
check("Not right now -> Change", target("not_now") === "hf2FinancingInterestChange");
check("Change/clear (undecided) -> Yes", target("undecided") === "hf2FinancingInterestYes");

// --- shared-scope harness: real announce + cancel with controlled timers ---
function makeHarness() {
  const h = {
    region: { textContent: "initial" },
    visible: true,
    lang: "en",
    timers: [],          // {cb, cleared}
    frames: [],          // {cb, cancelled}
    cancelledFrames: 0,
  };
  const FCmap = {
    en: { interestMarkedAnnounce: "MARKED-EN", interestNotNowAnnounce: "NOTNOW-EN", interestClearedAnnounce: "CLEARED-EN" },
    es: { interestMarkedAnnounce: "MARKED-ES", interestNotNowAnnounce: "NOTNOW-ES", interestClearedAnnounce: "CLEARED-ES" },
  };
  const env = {
    document: { getElementById: (id) => (id === "hf2FinancingStatus" ? h.region : null) },
    FC: (k) => FCmap[h.lang][k] || "",
    finHandoffVisible: () => h.visible,
    setTimeout: (cb) => { h.timers.push({ cb, cleared: false }); return h.timers.length - 1; },
    clearTimeout: (id) => { if (h.timers[id]) h.timers[id].cleared = true; },
    cancelAnimationFrame: () => { h.cancelledFrames++; },
  };
  const factory = new Function(
    "document", "FC", "finHandoffVisible", "setTimeout", "clearTimeout", "cancelAnimationFrame",
    `var _finInterestFocusFrame = null;
     var _finInterestAnnounceTimer = null;
     ${annSrc}
     ${cancelSrc}
     return {
       announce: announceFinInterest,
       cancel: cancelFinInterestPending,
       getTimer: function() { return _finInterestAnnounceTimer; },
       getFrame: function() { return _finInterestFocusFrame; },
       setFrame: function(v) { _finInterestFocusFrame = v; },
     };`);
  h.api = factory(env.document, env.FC, env.finHandoffVisible, env.setTimeout, env.clearTimeout, env.cancelAnimationFrame);
  h.flush = () => { h.timers.forEach(t => { if (!t.cleared && !t.done) { t.done = true; t.cb(); } }); };
  h.pendingCount = () => h.timers.filter(t => !t.cleared && !t.done).length;
  return h;
}

// announce -> clear first, deferred repopulate, timer stored then nulled
{
  const h = makeHarness();
  h.api.announce("interested");
  check("announce clears the region synchronously", h.region.textContent === "");
  check("announcement timer ID is stored", h.api.getTimer() !== null);
  h.flush();
  check("deferred callback populates the marked message", h.region.textContent === "MARKED-EN");
  check("timer ID cleared after callback runs", h.api.getTimer() === null);
}

// repeated identical message announces again (clear + repopulate both times)
{
  const h = makeHarness();
  h.api.announce("interested"); h.flush();
  const first = h.region.textContent;
  h.api.announce("interested");
  check("repeat: region cleared again before repopulating", h.region.textContent === "");
  h.flush();
  check("repeat: identical marked message re-announced", h.region.textContent === "MARKED-EN" && first === "MARKED-EN");
}

// second announcement cancels the previous pending timer
{
  const h = makeHarness();
  h.api.announce("interested");
  h.api.announce("not_now");
  check("second announcement cancels the prior pending timer", h.timers[0].cleared === true && h.pendingCount() === 1);
  h.flush();
  check("only the newest message lands", h.region.textContent === "NOTNOW-EN");
}

// hidden/inactive handoff prevents population — both at call and at flush
{
  const h = makeHarness();
  h.visible = false;
  h.api.announce("interested");
  check("hidden handoff: no timer scheduled, region untouched", h.api.getTimer() === null && h.region.textContent === "initial");
  h.visible = true;
  h.api.announce("interested");
  h.visible = false; // handoff hides while deferred
  h.flush();
  check("handoff hidden mid-defer: callback declines to populate", h.region.textContent === "");
}

// language switch mid-defer announces current-language text (FC at flush time)
{
  const h = makeHarness();
  h.api.announce("interested");
  h.lang = "es";
  h.flush();
  check("FC(key) resolved at flush time (no stale-language capture)", h.region.textContent === "MARKED-ES");
}

// cancelFinInterestPending: cancels + nulls both pending IDs
{
  const h = makeHarness();
  h.api.announce("interested");
  h.api.setFrame(7);
  h.api.cancel();
  check("cancel clears pending announce timer + nulls ID", h.timers[0].cleared === true && h.api.getTimer() === null);
  check("cancel cancels pending focus frame + nulls ID", h.cancelledFrames === 1 && h.api.getFrame() === null);
  h.flush();
  check("cancelled announcement never lands", h.region.textContent === "");
}

// --- wiring: capture-before-render + guarded, tracked restoration ---
const wrap = extract(/window\.setFinancingInterestChoice = function\(state\)\s*\{[\s\S]*?\n    \};/, "setFinancingInterestChoice wrapper");
const capturePos = wrap.indexOf("container.contains(document.activeElement)");
const statePos = wrap.indexOf("setFinancingInterest(state, 'handoff')");
check("activeElement containment captured before setFinancingInterest()", capturePos > -1 && statePos > capturePos);
check("restoration gated on origin AND visibility before rAF",
  /if \(hadFocusInside && finHandoffVisible\(\)\)\s*\{[\s\S]*?requestAnimationFrame/.test(wrap));
check("new transition cancels a still-pending focus frame first",
  /cancelAnimationFrame\(_finInterestFocusFrame\)[\s\S]*?_finInterestFocusFrame = requestAnimationFrame/.test(wrap));
check("focus frame ID stored and nulled inside the callback",
  /_finInterestFocusFrame = requestAnimationFrame\(function\(\)\s*\{\s*_finInterestFocusFrame = null;/.test(wrap));
check("rAF re-queries by stable id and re-checks connected/hidden/visible",
  /getElementById\(targetId\)/.test(wrap) && /isConnected/.test(wrap)
  && /closest\('\[hidden\]'\)/.test(wrap) && (wrap.match(/finHandoffVisible\(\)/g) || []).length >= 2);
check("wrapper announces via announceFinInterest(state)", wrap.includes("announceFinInterest(state)"));

// --- bottom specialist action (requestFinancingFollowup) ---
const follow = extract(/window\.requestFinancingFollowup = function\(placement\)\s*\{[\s\S]*?\n    \};/, "requestFinancingFollowup()");
check("handoff placement announces the marked state via the scoped helper",
  /if \(placement === 'handoff'\) announceFinInterest\('interested'\)/.test(follow));
check("non-handoff placements never reach the handoff announcement (single guarded call site)",
  (follow.match(/announceFinInterest\('/g) || []).length === 1);
check("bottom specialist path schedules no focus work",
  !follow.includes("requestAnimationFrame") && !/\.focus\(/.test(follow));

// --- visibility guard implementation ---
const vis = extract(/function finHandoffVisible\(\)\s*\{[\s\S]*?\n    \}/, "finHandoffVisible()");
check("finHandoffVisible() checks screen .active + module hidden + hidden ancestors",
  vis.includes("classList.contains('active')") && vis.includes("!mod.hidden") && vis.includes("closest('[hidden]')"));
check("guard does not rely on offsetParent", !vis.includes("offsetParent"));

// --- renderer stays focus-neutral ---
const renderer = extract(/function renderHandoffFinancing\(\)\s*\{[\s\S]*?\n    \}/, "renderHandoffFinancing()");
check("renderHandoffFinancing() contains no focus() call", !/\.focus\(/.test(renderer));

// --- startOver: cancels pending work FIRST, then clears the region ---
const startOverBlock = html.match(/window\.startOver = function[\s\S]{0,4000}/);
check("startOver cancels pending interest work via cancelFinInterestPending()",
  !!startOverBlock && startOverBlock[0].includes("cancelFinInterestPending();"));
check("cancellation precedes the financing state reset and region clear",
  !!startOverBlock && startOverBlock[0].indexOf("cancelFinInterestPending();") <
    startOverBlock[0].indexOf("financingInterest = 'undecided'"));
check("startOver() clears the interest status region",
  !!startOverBlock && /hf2FinancingStatus[\s\S]{0,200}textContent = ''/.test(startOverBlock[0]));

// --- stable, unique IDs on the generated controls ---
for (const id of ["hf2FinancingInterestYes", "hf2FinancingInterestNotNow", "hf2FinancingInterestChange"]) {
  check(`id "${id}" present exactly once`, count(new RegExp(`id="${id}"`, "g")) === 1);
}

// --- touch wiring preserved exactly (source-escaped form) ---
for (const state of ["interested", "not_now", "undecided"]) {
  check(`${state} control keeps onclick + ontouchend preventDefault wiring`,
    html.includes(`onclick="window.setFinancingInterestChoice(\\'${state}\\')" `)
    && html.includes(`ontouchend="event.preventDefault();window.setFinancingInterestChoice(\\'${state}\\');"`));
}
check("no new addEventListener in wrapper/renderer/followup",
  !wrap.includes("addEventListener") && !renderer.includes("addEventListener") && !follow.includes("addEventListener"));

// --- live region markup ---
check("module-scoped live region exact markup (sr-only/status/polite/atomic)",
  /<div\s+class="sr-only"\s+id="hf2FinancingStatus"\s+role="status"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/.test(html));
check("live region is unique", count(/id="hf2FinancingStatus"/g) === 1);

// --- headings ---
check("hf2 financing headline is now an h2",
  html.includes('<h2 class="fin-handoff__headline" id="hf2FinancingHeadline"></h2>')
  && !html.includes('<h3 class="fin-handoff__headline"'));
check("results financing section labelled by the new heading",
  html.includes('id="resultsFinancing" hidden aria-labelledby="resultsFinancingHeading"'));
check("results sr-only h2 present and unique",
  count(/<h2 class="sr-only" id="resultsFinancingHeading"><\/h2>/g) === 1);
check("renderResultsFinancing populates the heading from FC('headline')",
  /resultsFinancingHeading'\)\.textContent = FC\('headline'\)/.test(html));

// --- language-switch residue: BEHAVIOURAL, not a grep -----------------------
// The handoff status region is the one financing string no renderer rewrites,
// so after a language switch it used to hold the PREVIOUS language's sentence.
// This executes the real announceFinInterest() and clearFinInterestAnnouncement()
// against a stub DOM and asserts the residue is gone — and, just as important,
// that clearing does not itself queue an announcement.
{
  const grab = (re, name) => {
    const m = html.match(re);
    check(`${name} extracted for behavioural test`, !!m);
    return m ? m[0] : "";
  };
  const srcAnnounce = grab(
    /function announceFinInterest\(state\)\s*\{[\s\S]*?\n    \}/, "announceFinInterest()");
  const srcClear = grab(
    /function clearFinInterestAnnouncement\(\)\s*\{[\s\S]*?\n    \}/,
    "clearFinInterestAnnouncement()");

  // Stub only what these two functions touch. `writes` records every
  // assignment to the region so we can tell "cleared" from "re-announced".
  const harness = new Function(`
    var writes = [];
    var _finInterestAnnounceTimer = null;
    var _lang = 'en';
    var _visible = true;
    var region = {
      _t: '',
      get textContent() { return this._t; },
      set textContent(v) { this._t = v; writes.push(v); }
    };
    var timers = [];
    function setTimeout(fn) { timers.push(fn); return timers.length; }
    function clearTimeout(id) { if (id) timers[id - 1] = null; }
    function document_getElementById() { return region; }
    var document = { getElementById: document_getElementById };
    function finHandoffVisible() { return _visible; }
    function FC(key) {
      var en = { interestMarkedAnnounce: 'Marked for your specialist.',
                 interestNotNowAnnounce: 'Not right now selected.',
                 interestClearedAnnounce: 'Selection cleared.' };
      var es = { interestMarkedAnnounce: 'Marcado para tu especialista.',
                 interestNotNowAnnounce: 'Ahora no.',
                 interestClearedAnnounce: 'Seleccion borrada.' };
      return (_lang === 'es' ? es : en)[key] || '';
    }
    ${srcAnnounce}
    ${srcClear}
    return {
      announce: announceFinInterest,
      clear: clearFinInterestAnnouncement,
      flush: function () { timers.forEach(function (f) { if (f) f(); }); timers = []; },
      setLang: function (l) { _lang = l; },
      text: function () { return region.textContent; },
      writes: function () { return writes.slice(); },
      pendingTimers: function () { return timers.filter(Boolean).length; }
    };`)();

  harness.announce('interested');
  harness.flush();
  const beforeSwitch = harness.text();
  check("announcement lands in the region (EN)",
    beforeSwitch === 'Marked for your specialist.');

  // The language switch: clear, then the renderers run in the new language.
  const writesBefore = harness.writes().length;
  harness.setLang('es');
  harness.clear();
  const afterClear = harness.text();
  const newWrites = harness.writes().slice(writesBefore);

  check("prior-language text is REMOVED by the language switch", afterClear === '');
  check("clearing writes only the empty string (announces nothing)",
    newWrites.length === 1 && newWrites[0] === '');
  check("no stale announcement is left queued after the switch",
    harness.pendingTimers() === 0);
  harness.flush();
  check("nothing re-announces after the switch flushes", harness.text() === '');

  // A queued-but-unflushed announcement must not survive into the new language.
  harness.announce('not_now');
  harness.setLang('es');
  harness.clear();
  harness.flush();
  check("an in-flight announcement cannot land in the new language",
    harness.text() === '');

  // The mechanism the fix must not break: repeats still re-announce.
  harness.announce('interested'); harness.flush();
  const first = harness.text();
  harness.announce('interested'); harness.flush();
  check("repeat announcement still re-announces the same message (ES)",
    first.length > 0 && harness.text() === first);
}
check("switchLanguage clears the handoff announcement before re-rendering",
  /clearFinInterestAnnouncement\(\);\s*\n\s*renderAllFinancingSurfaces\(\);/.test(html));
check("the sheet's own status region is NOT cleared by the language switch",
  !/clearFinancingSheetStatus/.test(html)
  && /region\.textContent = _finSheetStale/.test(html));

// --- exclusions ---
check("no aria-pressed introduced anywhere", count(/aria-pressed/g) === 0);
check("stale 'messages always differ' comment removed", !html.includes("always differ"));

console.log(`\nHandoff interest check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
