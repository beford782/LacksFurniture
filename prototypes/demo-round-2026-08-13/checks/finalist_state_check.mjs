// Finalist-semantics + claim-language ratchets (revision 3).
//
// Static assertions against the prototype source:
//   1. resetJourneyState clears finalistId (New customer / Start over wipe).
//   2. renderPlan renders the honest split: T.finalist ONLY behind a
//      finalistId test, T.recommendedStart + T.noFinalistYet on the null path,
//      and the old conflated "FINALIST · BEST MATCH" suffix is gone.
//   3. renderHandoff carries the status line and an explicit Finalist row that
//      can state absence (noFinalistYet).
//   4. renderCompare renders trial priorities as ONE shared customer-level
//      block (trialPrioritiesLbl), never split per mattress via row(testLbl).
//   5. No line in the prototype (index.html or README) pairs "1935" with
//      financing vocabulary — company heritage is fine, financing vintage is
//      an unverified claim and must never reappear.
//
// Run: node prototypes/demo-round-2026-08-13/checks/finalist_state_check.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, "..", "index.html"), "utf8");
const readme = readFileSync(join(here, "..", "README.md"), "utf8");

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

// 1. reset semantics
const reset = fnBody("resetJourneyState");
assert("resetJourneyState clears finalistId", /finalistId\s*=\s*null/.test(reset));

// 2. plan honesty
const plan = fnBody("renderPlan");
assert("renderPlan branches finalist vs recommended starting point",
  plan.includes("finalistId ? L(T.finalist) : L(T.recommendedStart)"));
assert("renderPlan states absence via noFinalistYet", plan.includes("T.noFinalistYet"));
assert("old conflated 'Finalist · Best match' suffix is gone",
  !plan.includes("L(T.finalist) + (finalistId"));

// 3. handoff honesty
const handoff = fnBody("renderHandoff");
assert("renderHandoff sets an explicit status line", handoff.includes("hStatus"));
assert("renderHandoff has a Finalist row that can state absence",
  handoff.includes("L(T.finalist)") && handoff.includes("T.noFinalistYet"));

// 4. compare shared block
const compare = fnBody("renderCompare");
assert("compare renders ONE shared trial-priorities block",
  compare.includes("trialPrioritiesLbl"));
assert("compare never splits priorities per mattress via row(testLbl)",
  !compare.includes("row(L(T.testLbl)"));
assert("compare never indexes trialFocus into per-side cells",
  !/row\(.*trialFocus\[/.test(compare));

// 5. no financing-vintage language anywhere in the prototype
const FINANCE_WORDS = /financ|credit|crédito|lease|APR/i;
for (const [label, text] of [["index.html", html], ["README.md", readme]]) {
  const offenders = text.split(/\r?\n/).filter(l => l.includes("1935") && FINANCE_WORDS.test(l));
  assert("no '1935' + financing-vocabulary line in " + label, offenders.length === 0);
  for (const o of offenders) console.log("        offending line: " + o.trim());
}

process.exit(failures ? 1 : 0);
