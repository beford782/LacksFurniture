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

// --- FIX 1: two-dimensional payment state ---
const pref = fnBody("payPrefLabel");
const topics = fnBody("payTopicsLabel");
assert("payPrefLabel exists (preference dimension)", pref.length > 0);
assert("payTopicsLabel exists (topics dimension)", topics.length > 0);
assert("topics are NOT gated on the review preference", !topics.includes('"review"'));
assert("topics render marked finAgenda ids", topics.includes("finAgenda"));
assert("not_now suppresses the active agenda via governed dismissed line",
  topics.includes('"not_now"') && topics.includes("agendaDismissed"));
assert("empty topics fall back to governed agendaEmpty", topics.includes("agendaEmpty"));
const handoff = fnBody("renderHandoff");
assert("handoff renders the preference row", handoff.includes("payPrefLabel()"));
assert("handoff renders the topics row", handoff.includes("payTopicsLabel()"));
assert("old single-row payDecisionLabel is gone", !html.includes("function payDecisionLabel"));
const reset = fnBody("resetJourneyState");
assert("reset clears preference AND topics",
  /payDecision\s*=\s*null/.test(reset) && /finAgenda\s*=\s*\{\}/.test(reset));

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
assert("note selection reads finalist AND decision state",
  /finalistId\s*\?\s*\(payDecision !== null \? T\.hNoteFinDec : T\.hNoteFinOpen\)/.test(handoff));
assert("'payment conversation you chose' phrasing is gone (EN)",
  !html.includes("payment conversation you chose"));
assert("'conversación de pago que elegiste' phrasing is gone (ES)",
  !html.includes("que elegiste"));

process.exit(failures ? 1 : 0);
