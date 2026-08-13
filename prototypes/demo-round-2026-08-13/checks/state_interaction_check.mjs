// Revision 3.1 state-interaction ratchets.
//
// Guards the rev-3.1 corrective fixes against regression:
//   FIX 1 — payment preference and agenda topics are SEPARATE dimensions:
//     marked topics render regardless of preference (never gated on
//     "review"), not_now suppresses the active agenda via the governed
//     dismissed line (policy b — state preserved, presentation suppressed),
//     and the old single-row payDecisionLabel is gone.
//   FIX 4A — the one finalist-dependent test instruction is withheld until
//     a finalist exists (testProseFor gate, both-language detection), and
//     no renderer bypasses the gate with a raw L(p.test).
//   FIX 4B — the handoff note is selected from BOTH finalist state and
//     payment-decision state; the "payment conversation you chose"
//     phrasing cannot reappear in either language.
//
// Run: node prototypes/demo-round-2026-08-13/checks/state_interaction_check.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");

let failures = 0;
function assert(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + "  " + name);
  if (!cond) failures++;
}
function fnBody(name) {
  const start = html.indexOf("function " + name + "(");
  if (start < 0) return "";
  const end = html.indexOf("\nfunction ", start + 1);
  return html.slice(start, end > -1 ? end : start + 6000);
}

// --- FIX 1 (as corrected by the live-conversation ruling): payment state
// models OBSERVABLE actions — explored paths, a current preference, and an
// explicit pause — never a future-discussion agenda ---
const pref = fnBody("payPrefLabel");
const explored = fnBody("payExploredLabel");
assert("payPrefLabel exists (current preference)", pref.length > 0);
assert("preference resolves a deliberately selected PATH title",
  pref.includes("payPref") && pref.includes("c.title"));
assert("payExploredLabel exists (observable history)", explored.length > 0);
assert("explored history excludes the current preference (its own row)",
  explored.includes("id !== payPref"));
assert("pause suppresses the history from the active handoff",
  /if \(payPref === "not_now"\) return null/.test(explored));
// review and consider are DISTINCT actions: reviewing reveals governed
// details and records history; only Consider may set the preference
const review = fnBody("reviewPath");
assert("reviewPath exists (exploration action)", review.length > 0);
assert("reviewPath toggles the revealed details", review.includes("payOpen[id]"));
assert("reviewPath records exploration on reveal", review.includes("payExplored[id] = true"));
assert("reviewPath NEVER touches the preference", !review.includes("payPref"));
const consider = fnBody("considerPath");
assert("considerPath records a deliberate selection AND the history",
  consider.includes("payPref = id") && consider.includes("payExplored[id] = true"));
assert("a newer deliberate selection replaces the pause (unconditional assignment)",
  !consider.includes('"not_now"'));
// clearing is EXPLICIT: Consider is one-way, the marker is not a control,
// and only clearPath may clear a path preference
assert("considerPath is ONE-WAY (no silent toggle-to-clear branch)",
  !consider.includes("payPref = null") && !/payPref === id/.test(consider));
const clear = fnBody("clearPath");
assert("clearPath exists (the only explicit clear)", clear.length > 0);
assert("clearPath clears to null (never to not_now)",
  clear.includes("payPref = null") && !clear.includes('"not_now"'));
assert("clearPath never touches the explored history", !clear.includes("payExplored"));
assert("clearPath announces the removal", clear.includes("interestClearedAnnounce"));
const rpClear = fnBody("renderPayment");
assert("selected state renders as a MARKER (span), not a clickable control",
  rpClear.includes('<span class="pref-mark">'));
assert("the marker is never wired to considerPath or clearPath",
  !/pref-mark[^>]*onclick/.test(rpClear));
assert("the subordinate clear action sits beside the marker",
  rpClear.indexOf("clearPath") > -1 && rpClear.indexOf('class="clear-pref"') > -1);
assert("Consider renders only for non-preferred open cards (one-way set)",
  /\} else \{[\s\S]{0,400}considerPath/.test(rpClear.slice(rpClear.indexOf("pref-mark"))));
const rp = fnBody("renderPayment");
assert("governed details render only when reviewed open", /if \(isOpen\)\{/.test(rp));
assert("the Consider action lives INSIDE the revealed details",
  rp.indexOf("considerPath") > rp.indexOf("if (isOpen){"));
assert("review control exposes expanded state accessibly", rp.includes('aria-expanded="'));
assert("Consider has its own label, distinct from the considering state",
  html.includes("consider:{en:") && html.includes("considering:{en:"));
assert("reset clears the revealed-details state", /payOpen\s*=\s*\{\}/.test(fnBody("resetJourneyState")));
assert("pausePayment exists and toggles the authoritative pause",
  fnBody("pausePayment").includes('"not_now"'));
const handoff = fnBody("renderHandoff");
assert("handoff renders the preference row", handoff.includes("payPrefLabel()"));
assert("handoff renders the explored row only when genuinely useful",
  handoff.includes("payExploredLabel()") && /if \(explored\)/.test(handoff));
const reset = fnBody("resetJourneyState");
assert("reset clears preference AND explored history",
  /payPref\s*=\s*null/.test(reset) && /payExplored\s*=\s*\{\}/.test(reset));
// agenda framing is retired: no render path may touch the agenda copy keys,
// and no agenda vocabulary may appear in prototype-authored strings
for (const key of ["agendaMark", "agendaMarked", "drawerMark", "agendaConsequence", "agendaDismissed", "agendaEmpty", "agendaPrompt"]) {
  assert("no render path reads FIN.copy." + key, !html.includes("FIN.copy." + key));
}
assert("no 'Add to discussion' vocabulary", !html.includes("Add to discussion"));
assert("old agenda/decision identifiers are gone",
  !/\b(finAgenda|payDecision|togAgenda|decideUndecided)\b/.test(html));
assert("consequence line preserves the governed no-submission sentence EN",
  html.includes("Nothing is submitted and no application is started."));
assert("consequence line preserves the governed no-submission sentence ES",
  html.includes("No se envía nada y no se inicia ninguna solicitud."));

// --- FIX 4A: finalist-dependent test prose withheld ---
const gate = fnBody("testProseFor");
assert("testProseFor gate exists", gate.length > 0);
assert("gate keys on finalistId", gate.includes("finalistId"));
assert("gate detects BOTH language variants", gate.includes("finalist|finalista")
  && gate.includes("p.test.en") && gate.includes("p.test.es"));
for (const fn of ["renderReveal", "renderPlan", "renderHandoff"]) {
  const body = fnBody(fn);
  assert(fn + " uses the gate", body.includes("testProseFor("));
  assert(fn + " never renders raw L(p.test)", !body.includes("L(p.test)"));
}

// --- FIX 4B: handoff note from both dimensions ---
for (const k of ["hNoteFinDec", "hNoteFinOpen", "hNoteStartDec", "hNoteStartOpen"]) {
  assert("note variant " + k + " exists", html.includes(k + ":{en:"));
}
assert("note selection reads finalist AND payment-preference state",
  /finalistId\s*\?\s*\(payPref !== null \? T\.hNoteFinDec : T\.hNoteFinOpen\)/.test(handoff));
assert("'payment conversation you chose' phrasing is gone (EN)",
  !html.includes("payment conversation you chose"));
assert("'conversación de pago que elegiste' phrasing is gone (ES)",
  !html.includes("que elegiste"));

// --- FIX 2: single-open reveal accordion + focus preservation ---
assert("accordion state is a single index, not a multi-open map",
  html.includes("var prioOpenIdx = null") && !/prioOpen\[/.test(html));
const tog = fnBody("togglePrio");
assert("togglePrio closes the previous disclosure (single-open expression)",
  tog.includes("prioOpenIdx = (prioOpenIdx === i) ? null : i"));
assert("togglePrio restores focus to the re-rendered button",
  tog.includes('getElementById("prioBtn" + i)') && tog.includes(".focus()"));
const reveal31 = fnBody("renderReveal");
assert("priority buttons carry stable ids for focus restore",
  reveal31.includes("prioBtn' + i"));
assert("open state derives from the single index", reveal31.includes("prioOpenIdx === i"));

// --- FIX 3: one authoritative language-state writer ---
const als = fnBody("applyLanguageState");
assert("applyLanguageState exists", als.length > 0);
assert("it synchronizes aria-pressed for BOTH toggles",
  (als.match(/setAttribute\("aria-pressed"/g) || []).length === 2);
assert("it synchronizes <html lang>", als.includes("documentElement.lang"));
assert("setLang routes through it", fnBody("setLang").includes("applyLanguageState(l)"));
const so = fnBody("startOver");
assert("startOver routes through it (after journey reset)",
  so.includes('applyLanguageState("en")'));
assert("startOver no longer hand-toggles language classes",
  !so.includes('classList.add("on")'));

// --- FIX 5: modal containment / restoration / localization ---
assert("background inert sync exists", html.includes("function syncBackgroundInert("));
for (const fn of ["openDetail", "closeDetail", "runIso", "closeIso"]) {
  assert(fn + " syncs background inert", fnBody(fn).includes("syncBackgroundInert()"));
}
assert("Tab trap exists and is wired", html.includes("function trapDialogTab(")
  && html.includes('e.key === "Tab"'));
const ci = fnBody("closeIso");
assert("closeIso restores focus to the opener (with fallback)",
  ci.includes("isoReturnFocus") && ci.includes(".focus()"));
const cd = fnBody("closeDetail");
assert("closeDetail falls back to the same mattress's Details button",
  cd.includes("detailReturnId") && cd.includes("d-btn"));
assert("close-button names are localized EN/ES",
  html.includes("closeLbl:{en:") && html.includes('setAttribute("aria-label", L(T.closeLbl))'));
assert("open isolation report re-renders rows on language switch",
  html.includes("function renderIsoRows(") && fnBody("render").includes("renderIsoRows()"));

process.exit(failures ? 1 : 0);
