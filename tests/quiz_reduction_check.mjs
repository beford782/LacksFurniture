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
//   8. The living nine-question contract in the principal guides, derived from
//      data/quiz.json so prose cannot drift away from the shipped quiz.
//   7. The conditional-answer invariant, executed in BOTH directions through the
//      real navigation functions and the real engine: an answer never outlives
//      the condition that made it askable, and a question that becomes askable
//      is asked. Section 7 is a CORRECTIVE addition (2026-09-04) — the reduction
//      shipped with the reconciliation missing, so a review edit of
//      partner_sleep could leave a hidden movement answer scoring underneath a
//      solo consultation, or return to the review with none at all.

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
const MATTRESSES = JSON.parse(read("data", "mattresses.json"));
const ACCESSORIES = JSON.parse(read("data", "accessories.json"));
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
// The two halves of the absolute observer, named once and used by both the
// assertion and its negative controls, so a control can never drift away from
// what is actually enforced. `\b` here is a REGEX WORD BOUNDARY: this source
// carried a literal U+0008 backspace byte in its place until 2026-09-04, so
// the object-key half matched nothing and an unquoted `trigger:` key would
// have passed unseen. The controls below fail the suite if that returns.
const TRIGGER_LITERAL = /['"]trigger['"]/;
const TRIGGER_KEY = /\btrigger\s*:/;
const triggerFree = (s) => !TRIGGER_LITERAL.test(s) && !TRIGGER_KEY.test(s);
ok("ABSOLUTE: no trigger literal and no trigger object key appear in the app at all — no default, no seed, no map key, no leftover branch",
  triggerFree(norm),
  (norm.match(/.{0,60}(['"]trigger['"]|\btrigger\s*:).{0,40}/) || [""])[0].trim());
ok("control: an unquoted `{ trigger: 'pain' }` object key makes the observer FAIL",
  !triggerFree(norm.replace("var ctxParts = [];", "var ctxParts = []; var seed = { trigger: 'pain' };")),
  "the object-key half is vacuous — check for a control byte in TRIGGER_KEY");
ok("control: a quoted trigger literal makes it fail too",
  !triggerFree(norm + "\nvar x = answers['trigger'];"));
ok("control: neither observer regex contains a control byte (the U+0008 defect)",
  !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(String(TRIGGER_KEY) + String(TRIGGER_LITERAL)),
  JSON.stringify(String(TRIGGER_KEY)));
ok("control: the object-key half is what catches an unquoted key (the literal half alone does not)",
  TRIGGER_KEY.test("var seed = { trigger: 'pain' };")
  && !TRIGGER_LITERAL.test("var seed = { trigger: 'pain' };"));
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

// ---------- 7. the conditional-answer invariant, EXECUTED ---------------------
//
// The reduction left one question conditional on another (`partner_disturbance`
// is skipped for a solo sleeper) and two options offered only to a shared bed
// (`body_type.different`, `temperature.opposite`). The review screen lets the
// customer edit `partner_sleep` AFTER those have been answered, so both
// conditions can flip mid-session, in both directions.
//
// The defect this section pins was real and shipped: an answer that outlived
// its condition stayed in `answers`, and `calculateScores()` iterates
// `answers`, not the visible questions — so a solo consultation kept awarding
// motionIsolation/hybrid from a partner's movement answer, and the Sleep
// Brief, accessories, Summary, analytics copy and handoff payload all inherited
// it. The repair is ONE rule in the state machine; these checks execute the
// real navigation functions and the real engine over it, so a partner_sleep
// guard added to some single consumer could not make them pass.
section("7. conditional answers reconcile in BOTH directions (executed)");
{
  const grab = (re, what) => {
    const m = norm.match(re);
    ok(`extracted ${what}`, !!m);
    return m ? m[0] : "";
  };
  const VIS = grab(/function visibleQuestions\(\)[\s\S]*?\n    \}/, "visibleQuestions()");
  const HOLD = grab(/function conditionalConditionsHold\(\)[\s\S]*?\n    \}/, "conditionalConditionsHold()");
  const RECONCILE = grab(/function reconcileConditionalAnswers\(before\)[\s\S]*?\n    \}/, "reconcileConditionalAnswers()");
  const PENDING = grab(/function pendingConditionalIndex\(\)[\s\S]*?\n    \}/, "pendingConditionalIndex()");
  const SELECT = grab(/window\.selectOption = function\(qId, optId, isMulti\) \{[\s\S]*?\n    \}/, "selectOption()");
  const NEXT = grab(/window\.nextQuestion = function\(\) \{[\s\S]*?\n    \}/, "nextQuestion()");
  const PREV = grab(/window\.prevQuestion = function\(\) \{[\s\S]*?\n    \}/, "prevQuestion()");
  const REVIEW = grab(/function goToReview\(\) \{[\s\S]*?\n    \}/, "goToReview()");
  const EDIT = grab(/window\.editAnswer = function\(idx\) \{[\s\S]*?\n    \}/, "editAnswer()");

  // The real state machine, with only the RENDERERS stubbed: every navigation
  // decision, every write to `answers` and the whole invariant are production
  // source. (The renderers themselves run against these same functions in
  // tests/quiz_presentation_check.mjs, which extracts the invariant too.)
  function flow(startAnswers, at) {
    const screens = [];
    const renders = [];
    let active = "questionScreen";
    const el = (id) => ({
      id,
      classList: { contains: (c) => c === "active" && id === active },
      focus() {}
    });
    const doc = { getElementById: el, activeElement: null };
    const api = new Function("document", "window", "QUESTIONS", "answers", "currentQuestion",
      "screens", "renders", "setActive", `"use strict";
      var editingFromReview = false;
      function showScreen(id) { screens.push(id); setActive(id); }
      function renderQuestion() { renders.push(QUESTIONS[currentQuestion].id); }
      function renderReview() { renders.push('REVIEW'); }
      ${VIS}
      ${HOLD}
      ${RECONCILE}
      ${PENDING}
      ${SELECT}
      ${NEXT}
      ${PREV}
      ${REVIEW}
      ${EDIT}
      return {
        select: function(q, o, m) { return window.selectOption(q, o, m); },
        next: function() { return window.nextQuestion(); },
        prev: function() { return window.prevQuestion(); },
        edit: function(i) { return window.editAnswer(i); },
        visible: function() { return visibleQuestions().map(function(q) { return q.id; }); },
        pending: function() { return pendingConditionalIndex(); },
        editing: function() { return editingFromReview; },
        at: function() { return currentQuestion; },
        answers: function() { return answers; }
      };`)(doc, {}, JSON.parse(JSON.stringify(QUIZ.questions)),
        JSON.parse(JSON.stringify(startAnswers)), at,
        screens, renders, (id) => { active = id; });
    return { api, screens, renders, atScreen: () => active };
  }
  const QID = (id) => QUIZ.questions.findIndex((q) => q.id === id);

  // Drives the quiz the way a customer does: tap an option, tap Next.
  function walk(path) {
    const f = flow({}, 0);
    const answerFor = { partner_sleep: path };
    while (f.atScreen() === "questionScreen") {
      const q = QUIZ.questions[f.api.at()];
      if (q.type === "slider") { /* the slider self-defaults; just advance */ }
      else if (q.type === "multiple") f.api.select(q.id, q.options[0].id, true);
      else f.api.select(q.id, answerFor[q.id] || q.options[0].id, false);
      f.api.next();
    }
    return f;
  }

  // ---- direction 1: partner + yes_often, then edited to solo ----------------
  const edited = flow({}, 0);
  for (const [qid, opt] of [["mattress_size", "queen"], ["partner_sleep", "partner"],
    ["partner_disturbance", "yes_often"], ["sleep_position", "side"],
    ["body_type", "average"], ["temperature", "hot"]]) {
    edited.api.select(qid, opt, false);
    edited.api.next();
  }
  edited.api.next();                                    // firmness slider
  edited.api.select("sleep_issues", "back_pain", true);
  edited.api.next();
  edited.api.select("health_conditions", "snoring", true);
  edited.api.next();
  ok("the partner walk reached the review with nine answered steps",
    edited.atScreen() === "reviewScreen" && edited.api.visible().length === 9,
    `${edited.atScreen()} / ${edited.api.visible().join(",")}`);
  ok("the partner walk really did record yes_often",
    edited.api.answers().partner_disturbance === "yes_often");

  edited.api.edit(QID("partner_sleep"));
  ok("Edit opened partner_sleep and turned edit mode on",
    edited.api.at() === QID("partner_sleep") && edited.api.editing() === true);
  edited.api.select("partner_sleep", "solo", false);
  ok("REPAIR (a): choosing solo normalizes the movement answer IMMEDIATELY — the stale value cannot survive the tap",
    edited.api.answers().partner_disturbance === "not_applicable",
    JSON.stringify(edited.api.answers().partner_disturbance));
  edited.api.next();
  ok("...and Next returns straight to the review (edit mode ends, no forward walk)",
    edited.atScreen() === "reviewScreen" && edited.api.editing() === false);
  ok("...with EIGHT visible rows, the solo count", edited.api.visible().length === 8,
    String(edited.api.visible().length));

  // The clean solo session the edited one must be indistinguishable from.
  const clean = flow({}, 0);
  for (const [qid, opt] of [["mattress_size", "queen"], ["partner_sleep", "solo"],
    ["sleep_position", "side"], ["body_type", "average"], ["temperature", "hot"]]) {
    clean.api.select(qid, opt, false);
    clean.api.next();
  }
  clean.api.next();
  clean.api.select("sleep_issues", "back_pain", true);
  clean.api.next();
  clean.api.select("health_conditions", "snoring", true);
  clean.api.next();
  ok("the clean solo walk reached the review in eight steps",
    clean.atScreen() === "reviewScreen" && clean.api.visible().length === 8);

  const A_EDIT = edited.api.answers(), A_CLEAN = clean.api.answers();
  ok("ANSWER STATE: the edited session equals a clean solo session, key for key",
    JSON.stringify(A_EDIT) === JSON.stringify(A_CLEAN),
    `edited=${JSON.stringify(A_EDIT)} clean=${JSON.stringify(A_CLEAN)}`);
  ok("...which is what analytics copies, so no hidden answer can be emitted",
    /analytics\.answers = Object\.assign\(\{\}, answers\);/.test(norm));

  // ---- the ENGINE, over both answer sets -----------------------------------
  const CALC = grab(/function calculateScores\(\)\s*\{[\s\S]*?\r?\n    \}/, "calculateScores()");
  const QUALIFY = grab(/function qualifyRankedChoices\([\s\S]*?\r?\n    \}/, "qualifyRankedChoices()");
  const SHOW = grab(/window\.showResults = function\(\) \{[\s\S]*?\r?\n    \}/, "window.showResults");
  const ACC = grab(/function scoreAccessoriesFromAnswers\(\)\s*\{[\s\S]*?\r?\n    \}/, "scoreAccessoriesFromAnswers()");
  const CATF = grab(/function sleepSystemCategory\([\s\S]*?\r?\n    \}/, "sleepSystemCategory()");
  const STEPF = grab(/function sleepSystemStepForItem\([\s\S]*?\r?\n    \}/, "sleepSystemStepForItem()");
  const VM = grab(/function getSleepSystemViewModel\(\)\s*\{[\s\S]*?\r?\n    \}/, "getSleepSystemViewModel()");
  const GROUPS = grab(/function readSleepSystemGroups\(\)\s*\{[\s\S]*?\r?\n    \}/, "readSleepSystemGroups()");
  const FINAL = grab(/function getSleepSystemFinalist\(\)\s*\{[\s\S]*?\r?\n    \}/, "getSleepSystemFinalist()");
  const RESOLVE = grab(/function resolveFinalistState\(\)\s*\{[\s\S]*?\r?\n    \}/, "resolveFinalistState()");
  const PROFILE = grab(/function showProfileScreen\(\) \{[\s\S]*?\r?\n    \}\r?\n/, "showProfileScreen()");
  const LFN = grab(/function L\(obj\) \{[\s\S]*?\r?\n    \}/, "L()");
  const ESC = grab(/function escapeHtml\([\s\S]*?\r?\n    \}/, "escapeHtml()");
  const SIG = grab(/function buildSleepSignatureSvg\(answers\) \{[\s\S]*?\r?\n    \}/, "buildSleepSignatureSvg()");

  const shim = () => {
    const els = new Map();
    const make = (id) => ({ id, innerHTML: "", textContent: "", style: {},
      classList: { add() {}, remove() {}, contains: () => false },
      setAttribute() {}, getAttribute: () => null, focus() {} });
    return { getElementById: (id) => { if (!els.has(id)) els.set(id, make(id)); return els.get(id); },
      querySelector: () => null, querySelectorAll: () => [] };
  };
  const cp = (x) => JSON.parse(JSON.stringify(x));

  const results = (answers, lang) => {
    const out = {};
    new Function("document", "window", "MATTRESSES", "QUESTIONS", "answers", "currentLang", "out",
      `"use strict";
      var analytics = { log: function(){} };
      var _resultsState = null;
      function _renderResults() {}
      function showScreen() {}
      function sessionSafeSummary() { return {}; }
      ${CALC}
      ${QUALIFY}
      ${SHOW};
      out.scores = calculateScores();
      window.showResults();
      out.state = _resultsState;
      out.analytics = analytics;`)(shim(), {}, MATTRESSES, QUIZ.questions, cp(answers), lang, out);
    const tiers = {};
    for (const tier of ["gold", "silver", "bronze"]) {
      tiers[tier] = out.state.tierData[tier].map((m) =>
        ({ id: m.id, score: m.score, pct: m.pct, meets: m.meetsMatchThreshold }));
    }
    return { scores: out.scores.scores, reasons: out.scores.matchReasons, tiers,
      topPick: out.analytics.topPick, allMatches: out.analytics.allMatches };
  };
  const accessories = (answers, lang) => {
    const out = {};
    new Function("ACCESSORIES", "window", "answers", "currentLang", "out", `"use strict";
      var _resultsState = null;
      var analytics = {};
      ${QUALIFY}
      ${CATF}
      ${STEPF}
      ${ACC}
      ${RESOLVE}
      ${FINAL}
      ${GROUPS}
      ${VM}
      out.ordered = scoreAccessoriesFromAnswers();
      out.vm = getSleepSystemViewModel();
      out.analytics = analytics;`)(ACCESSORIES,
        { _savedPicks: [], _favoriteMattressId: "" }, cp(answers), lang, out);
    const groups = {};
    for (const step of ["support", "adjustability", "pillow", "protection"]) {
      groups[step] = out.vm.groups[step].map((a) => ({ id: a.id, score: a.score }));
    }
    return { ordered: out.ordered.map((a) => ({ id: a.id, score: a.score, matched: a.matched, reasons: a.reasons })),
      groups, recommended: out.analytics.recommendedAccessories };
  };
  const profile = (answers, lang) => {
    const analytics = { trialFocus: [], log() {} };
    new Function("document", "window", "answers", "currentLang", "analytics", `"use strict";
      function t(k) { return k; }
      function showScreen() {}
      function dfmReducedMotion() { return false; }
      var _briefOpenPriority = null;
      ${ESC}
      ${LFN}
      ${SIG}
      ${PROFILE}
      showProfileScreen();`)(shim(), { _sleepSignatureEntry: false }, cp(answers), lang, analytics);
    return { trialFocus: analytics.trialFocus, profileName: analytics.profileName,
      subtitle: analytics.profileSubtitleByLang, brief: analytics.profileBriefByLang };
  };

  for (const lang of ["en", "es"]) {
    ok(`ENGINE (${lang}): scores, tier order, pct, threshold, top pick and allMatches are identical to a clean solo session`,
      JSON.stringify(results(A_EDIT, lang)) === JSON.stringify(results(A_CLEAN, lang)));
    ok(`ENGINE (${lang}): the accessory ordering, matched flags, reasons, Sleep System groups and recommendations are identical`,
      JSON.stringify(accessories(A_EDIT, lang)) === JSON.stringify(accessories(A_CLEAN, lang)));
    ok(`ENGINE (${lang}): the Sleep Brief priorities and the profile name, subtitle and brief are identical`,
      JSON.stringify(profile(A_EDIT, lang)) === JSON.stringify(profile(A_CLEAN, lang)));
  }

  // NON-VACUITY: the comparison above is only worth anything if the stale
  // answer would in fact have changed those outputs. It does — this is the
  // defect, measured.
  const STALE = Object.assign({}, A_CLEAN, { partner_disturbance: "yes_often" });
  ok("NON-VACUITY: a stale yes_often DOES move the scores (the defect was real, not cosmetic)",
    JSON.stringify(results(STALE, "en").scores) !== JSON.stringify(results(A_CLEAN, "en").scores));
  ok("NON-VACUITY: it also moves the Sleep Brief / profile output",
    JSON.stringify(profile(STALE, "en")) !== JSON.stringify(profile(A_CLEAN, "en")));

  // ---- direction 2: solo, then edited to partner and to family -------------
  for (const to of ["partner", "family"]) {
    const up = flow({}, 0);
    for (const [qid, opt] of [["mattress_size", "queen"], ["partner_sleep", "solo"],
      ["sleep_position", "side"], ["body_type", "average"], ["temperature", "hot"]]) {
      up.api.select(qid, opt, false);
      up.api.next();
    }
    up.api.next();
    up.api.select("sleep_issues", "back_pain", true);
    up.api.next();
    up.api.select("health_conditions", "snoring", true);
    up.api.next();
    ok(`solo→${to}: the solo walk stamped the sentinel and reached the review`,
      up.api.answers().partner_disturbance === "not_applicable" && up.atScreen() === "reviewScreen");

    up.api.edit(QID("partner_sleep"));
    up.api.select("partner_sleep", to, false);
    ok(`solo→${to} REPAIR (b): the machine-written sentinel is cleared — it was never the customer's answer`,
      !("partner_disturbance" in up.api.answers()),
      JSON.stringify(up.api.answers().partner_disturbance));
    ok(`solo→${to}: the movement question is outstanding`,
      up.api.pending() === QID("partner_disturbance"), String(up.api.pending()));
    up.api.next();
    ok(`solo→${to} REPAIR (d): Next PRESENTS the movement question instead of returning to the review`,
      up.atScreen() === "questionScreen" && up.api.at() === QID("partner_disturbance")
      && up.api.editing() === true,
      `${up.atScreen()} at=${up.api.at()} editing=${up.api.editing()}`);
    // Back must not reach the review either, and it must not be a dead
    // control: it steps to the question that OPENED the follow-up, so the
    // customer can undo the branch instead of being held on one screen.
    up.api.prev();
    ok(`solo→${to}: Back leads to partner_sleep — never to the review, never nowhere`,
      up.atScreen() === "questionScreen" && up.api.at() === QID("partner_sleep"),
      `${up.atScreen()} at=${up.api.at()}`);
    up.api.edit(QID("partner_disturbance"));
    up.api.next();
    ok(`solo→${to}: still held — an unanswered conditional question cannot finish`,
      up.atScreen() === "questionScreen" && up.api.at() === QID("partner_disturbance"));
    up.api.select("partner_disturbance", "sometimes", false);
    up.api.next();
    ok(`solo→${to}: answering it returns to the review, with NINE rows and no not_applicable`,
      up.atScreen() === "reviewScreen" && up.api.visible().length === 9
      && up.api.answers().partner_disturbance === "sometimes",
      `${up.atScreen()} rows=${up.api.visible().length} v=${up.api.answers().partner_disturbance}`);
  }

  // An explicit "Doesn't Apply" from a customer who IS asked is the customer's
  // answer and survives — only the sentinel written while the question was
  // hidden is cleared. Otherwise the repair would silently overrule a choice.
  {
    const f = flow({ mattress_size: "queen", partner_sleep: "partner",
      body_type: "average", temperature: "hot" }, QID("partner_disturbance"));
    f.api.select("partner_disturbance", "not_applicable", false);
    f.api.select("partner_sleep", "family", false);
    ok("an explicit Doesn't Apply, chosen while the question was ASKED, is not thrown away",
      f.api.answers().partner_disturbance === "not_applicable" && f.api.pending() === -1);
  }

  // ---- the hideIf half of the same rule ------------------------------------
  // body_type "Different weight ranges" and temperature "We're opposite" are
  // offered only to a shared bed, and both carry scoring weight. A withdrawn
  // option cannot remain the stored answer.
  {
    const f = flow({ mattress_size: "queen", partner_sleep: "partner",
      partner_disturbance: "sometimes", body_type: "different", temperature: "opposite" },
      QID("partner_sleep"));
    f.api.select("partner_sleep", "solo", false);
    ok("REPAIR (c): a partner-only option that is withdrawn stops being the answer",
      !("body_type" in f.api.answers()) && !("temperature" in f.api.answers()),
      JSON.stringify({ b: f.api.answers().body_type, t: f.api.answers().temperature }));
    ok("...and both are presented again rather than scored blank",
      f.api.pending() === QID("body_type"));
    f.api.select("body_type", "average", false);
    ok("...one at a time, in question order", f.api.pending() === QID("temperature"));
    f.api.select("temperature", "cold", false);
    ok("...and nothing is outstanding once both are answered", f.api.pending() === -1);
  }
  {
    const stale = { mattress_size: "queen", partner_sleep: "solo", partner_disturbance: "not_applicable",
      sleep_position: "side", body_type: "different", temperature: "hot",
      firmness: 6, sleep_issues: ["back_pain"], health_conditions: ["snoring"] };
    const fixed = Object.assign({}, stale); delete fixed.body_type;
    ok("NON-VACUITY: a withdrawn body_type option WOULD have kept scoring (medium/support/motionIsolation)",
      JSON.stringify(results(stale, "en").scores) !== JSON.stringify(results(fixed, "en").scores));
  }

  // ---- the ordinary paths are unchanged ------------------------------------
  {
    const s = walk("solo"), p = walk("partner"), fam = walk("family");
    ok("ordinary forward walk: solo still reaches the review in eight steps",
      s.atScreen() === "reviewScreen" && s.api.visible().length === 8);
    ok("ordinary forward walk: partner and family still take nine",
      p.api.visible().length === 9 && fam.api.visible().length === 9);
    ok("ordinary forward walk: the solo sentinel is still stamped exactly once, by the invariant",
      s.api.answers().partner_disturbance === "not_applicable"
      && (norm.match(/answers\[q\.id\] = 'not_applicable';/g) || []).length === 1);
    const back = flow({ mattress_size: "queen", partner_sleep: "solo",
      partner_disturbance: "not_applicable", sleep_position: "side" }, QID("sleep_position"));
    back.api.prev();
    ok("ordinary Back still steps over the skipped question to partner_sleep",
      back.api.at() === QID("partner_sleep"));
  }
}

// ---------- 8. the living nine-question contract, in the guides ---------------
//
// The A4.3 reduction changed the quiz but left the operational documentation
// claiming ten questions in eleven places, including the two onboarding guides a
// new retailer build is run from. Counts that only live in prose go stale
// silently, so they are pinned here — DERIVED from data/quiz.json, never
// retyped. A future structural change fails this section until the guides move
// with it.
//
// Deliberately narrow. It pins the sentences that state the contract, not every
// number in every file, and it does NOT touch dated investigation snapshots
// (docs/quiz-trust-investigation-*, docs/accessory-recommendation-audit-*,
// docs/trust-integrity-physical-gate-*): those record what a named commit
// contained on a named day and are supposed to keep saying so.
section("8. the living contract in the guides matches data/quiz.json");
{
  const DEFINED = QUIZ.questions.length;
  const OPTIONS = QUIZ.questions.reduce((n, q) => n + ((q.options || []).length), 0);
  const SOLO = visible({ partner_sleep: "solo" }).length;
  const SHARED = visible({ partner_sleep: "partner" }).length;
  ok("the counts under test are derived from the shipped quiz, not retyped",
    DEFINED === 9 && OPTIONS === 42 && SOLO === 8 && SHARED === 9,
    `defined=${DEFINED} options=${OPTIONS} solo=${SOLO} shared=${SHARED}`);

  const WORD = { 8: "eight", 9: "nine", 10: "ten", 11: "eleven", 12: "twelve" };
  const w = (n) => WORD[n] || String(n);

  // [file, [fragments that MUST appear]] — each fragment is built from the
  // derived counts, so it stops matching the moment the quiz changes shape.
  const GUIDES = [
    ["CLAUDE.md", [
      `leads a ${DEFINED}-question sleep quiz`,
      `(${SOLO} displayed steps for a solo sleeper)`,
      `The ${DEFINED} quiz questions (${OPTIONS} options; ${SOLO} displayed steps for a solo sleeper, ${SHARED} for`,
      `**Quiz → Results**: ${DEFINED} questions, ${OPTIONS} options (solo sleepers see ${SOLO}`
    ]],
    ["README.md", [
      `take a ${w(DEFINED)}-question sleep quiz`,
      `(${w(SOLO)} displayed steps`
    ]],
    ["onboarding/Onboarding_Guide.md", [
      `a quick ${DEFINED}-question`,
      `(solo sleepers see ${SOLO} —`
    ]],
    ["onboarding/Build_Runbook.md", [
      `Quiz runs all ${DEFINED} questions (${SOLO} on the solo path)`,
      `all ${DEFINED} questions, labels, sublabels in Spanish`
    ]],
    ["tools/validation.py", [
      `-> ${DEFINED} questions, ${OPTIONS} options`,
      `${SOLO} displayed steps on the solo path, ${SHARED} on`
    ]],
    ["tools/workbook_schema.py", [
      `${DEFINED} questions / ${OPTIONS} options`
    ]],
    ["docs/quiz-copy-engine-correspondence.md", [
      `the ${w(DEFINED)} \`helpText\` lines`,
      `## The ${w(DEFINED)} questions`
    ]],
    ["docs/rebuild-roadmap.md", [
      `the quiz is ${DEFINED} questions / ${OPTIONS} options`,
      `| 1 | Quiz: ${DEFINED} questions, exactly ${OPTIONS} options`
    ]]
  ];

  const stale = [];
  for (const [file, fragments] of GUIDES) {
    const text = read(...file.split("/")).replace(/\r\n/g, "\n");
    const absent = fragments.filter((f) => !text.includes(f));
    ok(`${file} states the shipped counts`, absent.length === 0,
      absent.map((f) => JSON.stringify(f)).join(" | "));
    if (absent.length) stale.push(file);
  }
  ok("every principal living guide is current", stale.length === 0, stale.join(", "));

  // The validator's pinned structural contract is the machine-readable half of
  // the same claim; the guides above are the human half. They must agree.
  const canonRows = (VALIDATION.match(/^\s{4}\("(\w+)", "(single|multiple|slider)",/gm) || []).length;
  ok("the validator's canonical tuple and the shipped quiz agree on the count",
    canonRows === DEFINED, `validator=${canonRows} quiz=${DEFINED}`);
  const canonOptions = (VALIDATION.match(/^\s{4}\("(\w+)", "(single|multiple)",[\s\S]*?\)\),$/gm) || []);
  ok("the option total the guides quote is the option total the quiz ships",
    OPTIONS === QUIZ.questions.reduce((n, q) => n + ((q.options || []).length), 0)
    && canonOptions.length > 0);

  // Dated snapshots are NOT rewritten: they record a named tree on a named day.
  // This pins that intent, so a future sweep of "10 questions" cannot quietly
  // launder the history into agreement with today's count.
  for (const snap of ["docs/accessory-recommendation-audit-2026-08-30.md",
    "docs/quiz-trust-investigation-2026-08-21.md"]) {
    const text = read(...snap.split("/")).replace(/\r\n/g, "\n");
    ok(`${snap} keeps its dated measurement of the tree it audited`,
      /\b(ten|10)[\s-]?(quiz )?questions?\b/i.test(text)
      || /all ten questions/i.test(text), "the historical count was rewritten");
  }
}

console.log(`\nQuiz reduction check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
