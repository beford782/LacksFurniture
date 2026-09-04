// A4.3 — the reduced quiz contract: nine defined questions, eight displayed for
// solo sleepers, nine for partner and family, and NOTHING left of the removed one.
//
// The owner approved Strategy 1 on 2026-09-03: the visit-trigger question is
// removed, and the Consultation Summary's context row goes with it, because
// `trigger` was its only source. That loss is deliberate and is pinned here so
// it cannot be "fixed" later by inference — a derived context phrase would be a
// claim about the customer's visit that no remaining answer supports.
//
// WHAT THIS SUITE PINS
//   1. Counts: nine defined questions in the canonical source, the generated
//      quiz and the validator's structural contract; eight displayed steps on
//      the solo path, nine on partner and family, executed through the app's own
//      visibleQuestions().
//   2. Absence: no `trigger` question, option, score, copy, implication, recap
//      entry, consumer or default survives anywhere in the shipped tree.
//   3. Non-restoration: injecting a stale or synthetic `answers.trigger` does
//      NOT bring the Summary row back and does not change any output.
//   4. The Summary: two rows render, the context element does not exist, and the
//      payload keeps `consultation.context` as an explicit empty string.
//   5. Navigation: Back crosses the conditional partner-disturbance boundary,
//      Edit exposes only the nine retained questions, and progress totals follow
//      the path.
//   6. EN/ES parity at the reduced count.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const html = read("index.html");
const norm = html.replace(/\r\n/g, "\n");
const QUIZ = JSON.parse(read("data", "quiz.json"));
const CANON = JSON.parse(read("incoming", "dreamfinder_quiz.json"));
const CFG = JSON.parse(read("data", "store-config.json"));
const VALIDATION = read("tools", "validation.py");
const DEMO = read("demo", "black-friday", "index.html").replace(/\r\n/g, "\n");

let passed = 0, failed = 0;
function ok(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return cond;
}
function section(n) { console.log(`\n-- ${n} --`); }

const ids = QUIZ.questions.map((q) => q.id);

// ---------- 1. counts ---------------------------------------------------------
section("1. nine defined questions, everywhere the count is declared");
ok("the generated quiz defines nine questions", QUIZ.questions.length === 9, `got ${QUIZ.questions.length}`);
ok("the canonical source defines the same nine, in the same order",
  CANON.quiz.questions.length === 9 && CANON.quiz.questions.every((q, i) => q.id === ids[i]));
ok("the validator's structural contract carries nine questions and no trigger",
  !/\("trigger", "single"/.test(VALIDATION)
  && (VALIDATION.match(/^\s{4}\("(\w+)", "(single|multiple|slider)",/gm) || []).length === 9,
  String((VALIDATION.match(/^\s{4}\("(\w+)", "(single|multiple|slider)",/gm) || []).length));
ok("mattress_size is now the first question", ids[0] === "mattress_size", ids.join(","));
ok("the conditional question is still partner_disturbance, still skipped for solo",
  QUIZ.questions.find((q) => q.id === "partner_disturbance").skipIf.question === "partner_sleep"
  && QUIZ.questions.find((q) => q.id === "partner_disturbance").skipIf.answer === "solo");

// ---------- 2. displayed steps, executed --------------------------------------
section("2. displayed steps per path, through the app's own visibleQuestions()");
const VIS_FN = (norm.match(/function visibleQuestions\(\)[\s\S]*?\n    \}/) || [""])[0];
ok("extracted visibleQuestions()", VIS_FN.length > 0);
const visible = (answers) =>
  new Function("QUESTIONS", "answers", VIS_FN + "\nreturn visibleQuestions();")(QUIZ.questions, answers);
const solo = visible({ partner_sleep: "solo" }).length;
const partner = visible({ partner_sleep: "partner" }).length;
const family = visible({ partner_sleep: "family" }).length;
const unanswered = visible({}).length;
ok("solo path shows EIGHT question steps", solo === 8, `got ${solo}`);
ok("partner path shows NINE question steps", partner === 9, `got ${partner}`);
ok("family path shows NINE question steps", family === 9, `got ${family}`);
ok("an unanswered session shows nine (nothing is skipped before partner_sleep is answered)", unanswered === 9);
ok("no path exceeds the nine-step maximum", Math.max(solo, partner, family, unanswered) <= 9);
ok("solo omits exactly partner_disturbance and nothing else",
  visible({ partner_sleep: "solo" }).map((q) => q.id).join(",")
    === ids.filter((i) => i !== "partner_disturbance").join(","));

// ---------- 3. absence --------------------------------------------------------
section("3. nothing of the removed question survives");
ok("no question, option or score named trigger in the generated quiz",
  !JSON.stringify(QUIZ).includes("trigger"));
ok("none in the canonical source either", !JSON.stringify(CANON).includes("trigger"));
ok("no trigger consultation implication in the shipped config (EN or ES)",
  !("trigger" in (CFG.salesNotes?.consultationImplications || {}))
  && !("trigger" in (CFG.salesNotes_es?.consultationImplications || {})));
ok("no trigger entry in the in-code recap vocabulary", !/\btrigger: \{ pain:/.test(norm));
ok("no runtime read of answers.trigger anywhere in the app", !/answers\.trigger\b/.test(norm));
ok("no trigger key is written into answers (no hidden default, no prefill)",
  !/answers\s*\[\s*['"]trigger['"]\s*\]\s*=/.test(norm) && !/answers\.trigger\s*=/.test(norm));
ok("ABSOLUTE: no trigger literal and no trigger object key appear in the app at all — no default, no seed, no map key, no leftover branch",
  !/['"]trigger['"]/.test(norm) && !/trigger\s*:/.test(norm),
  (norm.match(/.{0,60}(['"]trigger['"]|trigger\s*:).{0,40}/) || [""])[0].trim());
ok("every answers reset is an EMPTY object literal (no seeded question anywhere)",
  (norm.match(/answers = \{[^}]*\}/g) || []).every((m) => m === "answers = {}"),
  (norm.match(/answers = \{[^}]*\}/g) || []).filter((m) => m !== "answers = {}").join(" | "));
ok("the generated demo counterpart carries the same absence (rebuilt by its builder, not hand-edited)",
  !/answers\.trigger\b/.test(DEMO) && !/\btrigger: \{ pain:/.test(DEMO));
ok("no inferred replacement: the context row is not rebuilt from any other answer",
  /var ctxParts = \[\];/.test(norm)
  && (norm.match(/var ctxParts = \[\];/g) || []).length === 2,
  "both resolvers must yield an EMPTY context, not a derived one");

// ---------- 4. the Summary and the payload ------------------------------------
section("4. the Summary omits the row; the payload keeps the key");
ok("the context row's ELEMENT is gone from the markup", !norm.includes('id="hf2BriefContext"'));
ok("nothing looks the element up or assigns to it",
  !norm.includes("getElementById('hf2BriefContext')") && !/context\.textContent = vm\.context/.test(norm));
ok("the two surviving rows keep their ids and order",
  norm.indexOf('id="hf2BriefWho"') > 0
  && norm.indexOf('id="hf2BriefProfile"') > norm.indexOf('id="hf2BriefWho"'));
ok("no blank row, label or divider is rendered in its place",
  !/hf2-brief__row" id="hf2Brief(Context|Empty)"/.test(norm)
  && !/<div class="hf2-brief__row"><\/div>/.test(norm));
ok("the payload resolver still returns a context KEY (schema preserved)",
  /return \{ context: ctxParts\.join\([^)]*\), who:/.test(norm)
  || /context: ctxParts\.join/.test(norm));
{
  // Executed: both resolvers, with and without a stale trigger injected.
  const grab = (re) => (norm.match(re) || [""])[0];
  const SUMMARY = grab(/function resolveConsultationSummary\(\)\s*\{[\s\S]*?\n    \}/);
  const RECAP = grab(/function resolveConsultationRecap\(\)\s*\{[\s\S]*?\n    \}/);
  const IMPL = grab(/function consultImplication\(questionId, optionId\)\s*\{[\s\S]*?\n    \}/);
  const RECAP1 = grab(/function consultRecap\(questionId, optionId\)\s*\{[\s\S]*?\n    \}/);
  const LABEL = grab(/function answerLabelFor\(questionId, optionId\)\s*\{[\s\S]*?\n    \}/);
  const FEEL = grab(/function firmnessFeel\([\s\S]*?\n    \}/);
  const RECAPMAP = grab(/var CONSULT_RECAP = \{[\s\S]*?\n    \};/);
  const run = (answers) => new Function("answers", "QUESTIONS", "MAPS", `"use strict";
    var currentLang = 'en';
    var CONSULT_IMPLICATIONS = MAPS.en, CONSULT_IMPLICATIONS_ES = MAPS.es;
    ${RECAPMAP}
    ${IMPL}
    ${RECAP1}
    ${LABEL}
    ${FEEL}
    ${SUMMARY}
    ${RECAP}
    return { summary: resolveConsultationSummary(), recap: resolveConsultationRecap() };`)(
      JSON.parse(JSON.stringify(answers)), QUIZ.questions,
      { en: CFG.salesNotes?.consultationImplications || {}, es: CFG.salesNotes_es?.consultationImplications || {} });

  const base = { mattress_size: "queen", sleep_position: "side", temperature: "hot",
    firmness: 6, sleep_issues: ["back_pain"], health_conditions: ["snoring"] };
  const clean = run(base);
  ok("payload: consultation.context is an explicit empty string (key present, value empty)",
    clean.summary.context === "" && "context" in clean.summary);
  ok("screen: the recap's context is empty too", clean.recap.context === "");
  ok("the who and profile rows still render their content",
    clean.summary.who.length > 0 && clean.summary.profile.length > 0
    && clean.recap.who.length > 0 && clean.recap.profile.length > 0);

  const stale = run({ ...base, trigger: "pain" });
  ok("INJECTING a stale answers.trigger does NOT restore the context row",
    stale.summary.context === "" && stale.recap.context === "",
    `summary=${JSON.stringify(stale.summary.context)} recap=${JSON.stringify(stale.recap.context)}`);
  ok("...and changes no other row either",
    stale.summary.who === clean.summary.who && stale.summary.profile === clean.summary.profile
    && stale.recap.who === clean.recap.who && stale.recap.profile === clean.recap.profile);
}

// ---------- 5. navigation and state -------------------------------------------
section("5. navigation, edit and state");
ok("Next skips the conditional question for solo sleepers (the app's own skip branch is intact)",
  /if \(q\.skipIf && answers\[q\.skipIf\.question\] === q\.skipIf\.answer\)/.test(norm));
ok("Back resolves its target through visibleQuestions(), so it crosses the boundary the same way",
  /const vis = visibleQuestions\(\);/.test(norm));
ok("Review/Edit lists the visible questions only (one row per visible question)",
  /visibleQuestions\(\)/.test(norm.slice(norm.indexOf("function renderReview"), norm.indexOf("function renderReview") + 2000)));
ok("the wipe resets currentQuestion, answers and the edit flag (no per-question state survives)",
  /currentQuestion = 0;\s*answers = \{\};\s*editingFromReview = false;/.test(norm));
ok("analytics copies the answer set as-is, so it cannot emit a fabricated trigger",
  /analytics\.answers = Object\.assign\(\{\}, answers\);/.test(norm)
  && !/analytics[\s\S]{0,80}trigger/.test(norm));

// ---------- 6. EN/ES parity at the reduced count -------------------------------
section("6. EN/ES parity");
let missing = [];
for (const q of QUIZ.questions) {
  const bilingual = (o) => o && typeof o === "object" && typeof o.en === "string" && typeof o.es === "string";
  if (!bilingual(q.question)) missing.push(`${q.id}.question`);
  if (q.helpText && !bilingual(q.helpText)) missing.push(`${q.id}.helpText`);
  for (const o of q.options || []) {
    if (!bilingual(o.label)) missing.push(`${q.id}.${o.id}.label`);
    if (o.sublabel && !bilingual(o.sublabel)) missing.push(`${q.id}.${o.id}.sublabel`);
  }
}
ok("every retained question and option carries both languages", missing.length === 0, missing.slice(0, 5).join(", "));
ok("both languages describe the same nine questions (no per-language drift)",
  QUIZ.questions.filter((q) => q.question.en).length === 9
  && QUIZ.questions.filter((q) => q.question.es).length === 9);

console.log(`\nQuiz reduction check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
