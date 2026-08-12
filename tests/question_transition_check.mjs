// Phase 1.2 — question-transition accessibility.
//
// Advancing between quiz questions calls renderQuestion() without a screen
// transition, so Gate 2A (0.3) does not announce it and must not: its
// same-screen guard is correct. Before 1.2, an assistive-technology user
// answering question 4 got no indication question 5 had appeared. The fix:
// renderQuestion() tracks the rendered question id, showScreen() clears the
// tracker on every genuine screen transition, and ONLY a same-screen id
// change focuses the freshly rendered #questionHeadline — whose aria-label
// carries the position and question text in the active language. The refusal
// gate is the SHIPPED one (screenTransitionOwnedElsewhere), not a copy; no
// live region, no deferred announcer, no timer.
//
// This suite does not grep for behavior. It EXTRACTS the real showScreen(),
// renderQuestion(), the continuity tracker, focusQuestionTransition(), the
// Gate 2A destination/refusal/restorable machinery, and the real navigation
// functions (selectOption, nextQuestion, prevQuestion, editAnswer,
// goToReview, renderReview) from index.html and EXECUTES them against a
// focus-recording DOM shim and the real shipped quiz — the same
// extract-and-execute pattern as tests/consultation_priorities_check.mjs.
//
// The shim materializes #questionHeadline by PARSING the rendered container
// HTML, so a heading that failed to render (or lost its aria-label) is a
// real absence here, not a stubbed success.
//
// MUTATION PROOF (runs every invocation): six in-memory mutations of the
// extracted source — genuine-transition guard removed, same-question
// rerenders moving focus, initial-entry suppression removed, refusal gate
// bypassed, accessible name removed, accessible name language-stale — must
// each flip at least one targeted observation, or the suite fails as
// vacuous.
//
// Run: node tests/question_transition_check.mjs   (exit 0 = all pass)

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return cond;
}
function section(name) { console.log(`\n-- ${name} --`); }
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}

// ---------- extractions ------------------------------------------------------
section("extraction");
const SHOW_SCREEN = grab(/window\.showScreen = function\(id\) \{[\s\S]*?\r?\n    \}/, "window.showScreen");
const RENDER_Q = grab(/window\.renderQuestion = function\(\) \{[\s\S]*?\r?\n    \}/, "window.renderQuestion");
const TRACKER = grab(/var _renderedQuestionId = null;\r?\n    function noteScreenTransitionForQuiz\(\) \{ _renderedQuestionId = null; \}/, "the continuity tracker");
const SELECT_OPT = grab(/window\.selectOption = function\(qId, optId, isMulti\) \{[\s\S]*?\r?\n    \}/, "window.selectOption");
const NEXT_Q = grab(/window\.nextQuestion = function\(\) \{[\s\S]*?\r?\n    \}/, "window.nextQuestion");
const PREV_Q = grab(/window\.prevQuestion = function\(\) \{[\s\S]*?\r?\n    \}/, "window.prevQuestion");
const EDIT_ANSWER = grab(/window\.editAnswer = function\(idx\) \{[\s\S]*?\r?\n    \}/, "window.editAnswer");
const GO_REVIEW = grab(/function goToReview\(\) \{[\s\S]*?\r?\n    \}/, "goToReview()");
const RENDER_REVIEW = grab(/window\.renderReview = function\(\) \{[\s\S]*?\r?\n    \};/, "window.renderReview");
const REVIEW_CHROME = grab(/function renderReviewChrome\(\) \{[\s\S]*?\r?\n    \}/, "renderReviewChrome()");
const FORMAT_ANSWER = grab(/function formatAnswer\(q, v\) \{[\s\S]*?\r?\n    \}/, "formatAnswer()");
const VISIBLE_Q = grab(/function visibleQuestions\(\) \{[\s\S]*?\r?\n    \}/, "visibleQuestions()");
const RESOLVE_COPY = grab(/function resolveQuizCopy\(q\) \{[\s\S]*?\r?\n    \}/, "resolveQuizCopy()");
const ACCENTS = grab(/const QUESTION_ACCENTS = \{[\s\S]*?\};/, "QUESTION_ACCENTS");
const APPLY_ACCENT = grab(/function applyQuestionAccent\(qId, text, lang\) \{[\s\S]*?\r?\n    \}/, "applyQuestionAccent()");
const COLS = grab(/function quizColsClass\(n\) \{[\s\S]*?\r?\n    \}/, "quizColsClass()");
const FIRM_LABEL = grab(/function getFirmnessLabel\(val\) \{[\s\S]*?\r?\n    \}/, "getFirmnessLabel()");
const L_FN = grab(/function L\(obj\) \{[\s\S]*?\r?\n    \}/, "L()");
const ESCAPE_FN = grab(/function escapeHtml\([\s\S]*?\r?\n    \}/, "escapeHtml()");
const HEADING_IDS = grab(/var SCREEN_HEADING_IDS = \{[\s\S]*?\};/, "SCREEN_HEADING_IDS");
const NAME_KEYS = grab(/var SCREEN_NAME_KEYS = \{[\s\S]*?\};/, "SCREEN_NAME_KEYS");
const OWNED = grab(/function screenTransitionOwnedElsewhere\(\) \{[\s\S]*?\r?\n    \}/, "screenTransitionOwnedElsewhere()");
const RESTORABLE = grab(/function isFocusRestorable\(el\) \{[\s\S]*?\r?\n    \}/, "isFocusRestorable()");
const FOCUS_ACTIVE = grab(/function focusActiveScreen\(\) \{[\s\S]*?\r?\n    \}/, "focusActiveScreen()");
const FOCUS_DEST = grab(/function focusScreenDestination\(id\) \{[\s\S]*?\r?\n    \}/, "focusScreenDestination()");
const FOCUS_Q = grab(/function focusQuestionTransition\(\) \{[\s\S]*?\r?\n    \}/, "focusQuestionTransition()");
if (failed) { console.log("\nextraction failed — aborting"); process.exit(1); }

// The heading contract, asserted at the source level too: both renderer
// branches emit the same focusable, labelled heading.
section("markup contract");
check("both renderer branches emit the labelled focusable heading (2 occurrences)",
  RENDER_Q.split('id="questionHeadline" tabindex="-1" aria-label="${headingLabel}"').length === 3);

// ---------- DOM shim ---------------------------------------------------------
const SCREENS = ["welcomeScreen", "questionScreen", "reviewScreen", "profileScreen",
  "resultsScreen", "hf2Screen", "emailScreen", "accessoriesScreen"];
const HEADLINE_RE = /<h2 class="noct-quiz-headline" id="questionHeadline" tabindex="-1" aria-label="([^"]*)">([\s\S]*?)<\/h2>/;

function makeShim() {
  const focusLog = [];
  const els = new Map();
  function makeEl(id) {
    const classes = new Set();
    return {
      id, innerHTML: "", textContent: "", style: {}, scrollTop: 0,
      _classes: classes, _label: null,
      classList: {
        add: (c) => classes.add(c), remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
        toggle: (c, force) => {
          const on = force === undefined ? !classes.has(c) : !!force;
          if (on) classes.add(c); else classes.delete(c);
        }
      },
      setAttribute() {}, getAttribute: () => null, addEventListener() {},
      focus() { focusLog.push({ id: this.id, label: this._label }); }
    };
  }
  SCREENS.forEach((id) => els.set(id, makeEl(id)));
  els.get("welcomeScreen")._classes.add("active");
  const doc = {
    getElementById(id) {
      if (id === "questionHeadline") {
        // Materialized from the ACTUAL rendered container: a heading that did
        // not render, or rendered without its aria-label, is genuinely absent.
        const c = els.get("questionContainer");
        const m = c ? (c.innerHTML || "").match(HEADLINE_RE) : null;
        if (!m) return null;
        if (!els.has(id)) els.set(id, makeEl(id));
        const h = els.get(id);
        h._label = m[1];
        h.textContent = m[2].replace(/<[^>]*>/g, "");
        return h;
      }
      if (!els.has(id)) els.set(id, makeEl(id));
      return els.get(id);
    },
    querySelector(sel) {
      if (sel === ".screen.active") {
        return SCREENS.map((s) => els.get(s)).find((e) => e._classes.has("active")) || null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".screen") return SCREENS.map((s) => els.get(s));
      return [];
    },
    documentElement: { lang: "en" }
  };
  return { doc, els, focusLog };
}

// ---------- harness ----------------------------------------------------------
function build(overrides = {}) {
  const src = Object.assign({
    showScreen: SHOW_SCREEN, renderQ: RENDER_Q, tracker: TRACKER, focusQ: FOCUS_Q
  }, overrides);
  const { doc, els, focusLog } = makeShim();
  const win = { scrollTo() {} };
  const out = {};
  new Function("document", "window", "QUESTIONS", "out", `"use strict";
    var currentLang = 'en';
    var currentQuestion = 0;
    var answers = {};
    var editingFromReview = false;
    var _wipeInProgress = false;
    var _safetyModeValue = null;
    function safetyDialogMode() { return _safetyModeValue; }
    function t(k) { return k; }
    function applyTranslations() {}
    ${ESCAPE_FN}
    ${L_FN}
    ${ACCENTS}
    ${HEADING_IDS}
    ${NAME_KEYS}
    ${VISIBLE_Q}
    ${RESOLVE_COPY}
    ${APPLY_ACCENT}
    ${COLS}
    ${FIRM_LABEL}
    ${FORMAT_ANSWER}
    ${REVIEW_CHROME}
    ${RESTORABLE}
    ${OWNED}
    ${FOCUS_ACTIVE}
    ${FOCUS_DEST}
    ${src.focusQ}
    ${src.tracker}
    ${src.showScreen}
    ${src.renderQ}
    ${SELECT_OPT}
    ${NEXT_Q}
    ${PREV_Q}
    ${GO_REVIEW}
    ${RENDER_REVIEW}
    ${EDIT_ANSWER}
    // In the app, window IS the global object, so extracted code that calls
    // bare renderQuestion()/showScreen()/renderReview() resolves through the
    // window.* assignments above. The shim window is a plain object; these
    // delegating declarations restore that resolution without copying code.
    function renderQuestion() { return window.renderQuestion(); }
    function showScreen(id) { return window.showScreen(id); }
    function renderReview() { return window.renderReview(); }
    out.api = {
      showScreen: function(id) { window.showScreen(id); },
      renderQuestion: function() { window.renderQuestion(); },
      selectOption: function(a, b, c) { window.selectOption(a, b, c); },
      nextQuestion: function() { window.nextQuestion(); },
      prevQuestion: function() { window.prevQuestion(); },
      editAnswer: function(i) { window.editAnswer(i); },
      goToReview: function() { goToReview(); },
      setLang: function(l) { currentLang = l; },
      setQuestion: function(i) { currentQuestion = i; },
      getQuestion: function() { return currentQuestion; },
      setAnswer: function(q, v) { answers[q] = v; },
      setSafetyMode: function(m) { _safetyModeValue = m; },
      getTracker: function() { return _renderedQuestionId; }
    };`)(doc, win, QUIZ.questions, out);
  const headingLabel = () => {
    const h = doc.getElementById("questionHeadline");
    return h ? h._label : null;
  };
  return { api: out.api, doc, els, focusLog, headingLabel };
}

// Enter the quiz the way the app does: a genuine screen transition, then the
// first render. Returns the moves that entry produced.
function enterQuiz(h) {
  const before = h.focusLog.length;
  h.api.showScreen("questionScreen");
  h.api.renderQuestion();
  return h.focusLog.slice(before);
}
function movesDuring(h, fn) {
  const before = h.focusLog.length;
  fn();
  return h.focusLog.slice(before);
}

// ---------- observations (shared by live checks and mutation proof) ----------
function observe(overrides = {}, lang = "en") {
  const o = {};

  // initial entry from Welcome
  {
    const h = build(overrides);
    h.api.setLang(lang);
    o.initialEntry = enterQuiz(h).map((m) => m.id);
  }
  // Next: genuine same-screen change
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.setAnswer("trigger", "pain");
    o.next = movesDuring(h, () => h.api.nextQuestion()).map((m) => m.id);
    o.nextLabel = h.headingLabel();
    // Back: genuine change in the other direction
    o.back = movesDuring(h, () => h.api.prevQuestion()).map((m) => m.id);
    o.backLabel = h.headingLabel();
  }
  // Option tap on the same question (also the disabled->enabled Next rerender)
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    o.optionTap = movesDuring(h, () => h.api.selectOption("trigger", "pain", false)).map((m) => m.id);
  }
  // Language switch on the same question (switchLanguage() re-invokes the renderer)
  {
    const h = build(overrides);
    enterQuiz(h);
    o.langSwitch = movesDuring(h, () => { h.api.setLang("es"); h.api.renderQuestion(); }).map((m) => m.id);
    o.langSwitchLabel = h.headingLabel();
  }
  // Review-edit return: transition away and back must announce ONCE (screen)
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.setAnswer("trigger", "pain");
    h.api.nextQuestion();
    h.api.goToReview();
    o.trackerAfterLeavingQuiz = h.api.getTracker();
    o.reviewEdit = movesDuring(h, () => h.api.editAnswer(0)).map((m) => m.id);
    // Edit-mode Next snaps straight back to Review (editingFromReview) — a
    // genuine screen transition, announced ONCE by Gate 2A, never doubled.
    h.api.setAnswer("trigger", "pain");
    o.editSnapBack = movesDuring(h, () => h.api.nextQuestion()).map((m) => m.id);
  }
  // Review back-path (prevQuestion while reviewScreen is active), then a
  // genuine in-quiz change — continuity must be re-established after return
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.goToReview();
    o.reviewBack = movesDuring(h, () => h.api.prevQuestion()).map((m) => m.id);
    o.nextAfterReturn = movesDuring(h, () => h.api.prevQuestion()).map((m) => m.id);
  }
  // Refusal: safety dialog owns focus during a genuine change
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.setAnswer("trigger", "pain");
    h.api.setSafetyMode("restart");
    o.dialogRefusal = movesDuring(h, () => h.api.nextQuestion()).map((m) => m.id);
    // ownership released: the next genuine change announces normally
    h.api.setSafetyMode(null);
    o.afterDialogRelease = movesDuring(h, () => h.api.prevQuestion()).map((m) => m.id);
  }
  // Refusal: open drawer owns focus
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.setAnswer("trigger", "pain");
    h.doc.getElementById("mattressDrawer").classList.add("drawer-open");
    o.drawerRefusal = movesDuring(h, () => h.api.nextQuestion()).map((m) => m.id);
  }
  // Skip logic: solo sleepers skip partner_disturbance; position uses the
  // VISIBLE list (11), not the raw index
  {
    const h = build(overrides);
    h.api.setLang(lang);
    enterQuiz(h);
    h.api.setAnswer("partner_sleep", "solo");
    h.api.setQuestion(QUIZ.questions.findIndex((q) => q.id === "partner_sleep"));
    h.api.renderQuestion();
    o.skip = movesDuring(h, () => h.api.nextQuestion()).map((m) => m.id);
    o.skipLabel = h.headingLabel();
    o.skipLandedOn = QUIZ.questions[h.api.getQuestion()].id;
  }
  return o;
}

// ---------- live checks ------------------------------------------------------
section("English behavior");
const en = observe({}, "en");
check("initial entry announces the SCREEN once (shipped Gate 2A), never the heading",
  en.initialEntry.length === 1 && en.initialEntry[0] === "questionScreen",
  JSON.stringify(en.initialEntry));
check("Next: exactly one focus move, to the question heading",
  en.next.length === 1 && en.next[0] === "questionHeadline", JSON.stringify(en.next));
check("Next: accessible name carries position and question text",
  !!en.nextLabel && /^Question 2 of 10\. /.test(en.nextLabel)
  && en.nextLabel.includes(QUIZ.questions[1].question.en), en.nextLabel || "(null)");
check("Back: exactly one focus move, to the question heading",
  en.back.length === 1 && en.back[0] === "questionHeadline", JSON.stringify(en.back));
check("Back: accessible name returns to position 1",
  !!en.backLabel && /^Question 1 of 10\. /.test(en.backLabel), en.backLabel || "(null)");
check("option tap rerender (incl. Next enable/disable): ZERO focus moves",
  en.optionTap.length === 0, JSON.stringify(en.optionTap));
check("language switch on the same question: ZERO focus moves",
  en.langSwitch.length === 0, JSON.stringify(en.langSwitch));
check("language switch: accessible name re-renders in the NEW language",
  !!en.langSwitchLabel && /^Pregunta 1 de 10\. /.test(en.langSwitchLabel),
  en.langSwitchLabel || "(null)");
check("leaving the quiz clears the continuity tracker",
  en.trackerAfterLeavingQuiz === null, String(en.trackerAfterLeavingQuiz));
check("review-edit return: ONE announcement (the screen), heading not double-spoken",
  en.reviewEdit.length === 1 && en.reviewEdit[0] === "questionScreen",
  JSON.stringify(en.reviewEdit));
check("edit-mode Next snaps back to Review with ONE screen announcement",
  en.editSnapBack.length === 1 && en.editSnapBack[0] === "reviewScreen",
  JSON.stringify(en.editSnapBack));
check("review back-path: ONE announcement (the screen)",
  en.reviewBack.length === 1 && en.reviewBack[0] === "questionScreen",
  JSON.stringify(en.reviewBack));
check("after returning to the quiz, the next genuine change announces again",
  en.nextAfterReturn.length === 1 && en.nextAfterReturn[0] === "questionHeadline",
  JSON.stringify(en.nextAfterReturn));
check("safety dialog open: the genuine change yields — ZERO moves",
  en.dialogRefusal.length === 0, JSON.stringify(en.dialogRefusal));
check("ownership released: the following genuine change announces normally",
  en.afterDialogRelease.length === 1 && en.afterDialogRelease[0] === "questionHeadline",
  JSON.stringify(en.afterDialogRelease));
check("open drawer: the genuine change yields — ZERO moves",
  en.drawerRefusal.length === 0, JSON.stringify(en.drawerRefusal));
check("skip logic: solo path lands past partner_disturbance with ONE move",
  en.skip.length === 1 && en.skip[0] === "questionHeadline" && en.skipLandedOn === "sleep_position",
  `${JSON.stringify(en.skip)} landed ${en.skipLandedOn}`);
check("skip logic: position reflects the VISIBLE list (4 of 9)",
  !!en.skipLabel && /^Question 4 of 9\. /.test(en.skipLabel), en.skipLabel || "(null)");

section("Spanish behavior");
const es = observe({}, "es");
check("[es] Next: one move to the heading, name in Spanish",
  es.next.length === 1 && es.next[0] === "questionHeadline"
  && !!es.nextLabel && /^Pregunta 2 de 10\. /.test(es.nextLabel)
  && es.nextLabel.includes(QUIZ.questions[1].question.es), es.nextLabel || "(null)");
check("[es] option tap: zero moves", es.optionTap.length === 0);
check("[es] review-edit return: one screen announcement",
  es.reviewEdit.length === 1 && es.reviewEdit[0] === "questionScreen");
check("[es] dialog refusal holds", es.dialogRefusal.length === 0);
check("[es] skip position uses the visible list",
  !!es.skipLabel && /^Pregunta 4 de 9\. /.test(es.skipLabel), es.skipLabel || "(null)");

section("full quiz walk (EN, partnered — all 10 questions)");
{
  const h = build();
  enterQuiz(h);
  const answerFor = (q) => {
    if (q.type === "slider") return null; // renderer self-defaults
    if (q.type === "multiple") return [q.options[0].id];
    if (q.id === "partner_sleep") return "partner";
    return q.options[0].id;
  };
  let headingMoves = 0, otherMoves = 0;
  for (let i = 0; i < QUIZ.questions.length; i++) {
    const q = QUIZ.questions[QUIZ.questions.findIndex((x) => x.id === QUIZ.questions[i].id)];
    const v = answerFor(q);
    if (v !== null) h.api.setAnswer(q.id, v);
    const moves = movesDuring(h, () => h.api.nextQuestion());
    for (const m of moves) (m.id === "questionHeadline" ? headingMoves++ : otherMoves++);
  }
  check("9 heading announcements for 9 question advances, then ONE review screen announcement",
    headingMoves === 9 && otherMoves === 1, `heading=${headingMoves} other=${otherMoves}`);
  check("the walk ends on the review screen",
    h.doc.querySelector(".screen.active").id === "reviewScreen");
}

section("visible heading preserved");
{
  const h = build();
  enterQuiz(h);
  const head0 = h.doc.getElementById("questionHeadline");
  check("heading text equals the visible question text",
    !!head0 && head0.textContent === QUIZ.questions[0].question.en, head0 && head0.textContent);
  // Q1 (trigger) deliberately has no accent entry; advance to mattress_size,
  // which does, to prove the label does not replace the accented content.
  h.api.setAnswer("trigger", "pain");
  h.api.nextQuestion();
  const c = h.doc.getElementById("questionContainer").innerHTML;
  check("visible headline keeps the accent markup (label does not replace content)",
    c.includes('class="noct-quiz-headline"') && c.includes('<span class="accent">'));
}

// ---------- mutation proof ----------------------------------------------------
section("mutation proof (the guard is load-bearing)");
const MUTATIONS = [
  {
    name: "genuine-transition guard removed (always announce)",
    key: "renderQ", src: RENDER_Q,
    find: "var genuineQuestionChange = _renderedQuestionId !== null && _renderedQuestionId !== q.id;",
    replace: "var genuineQuestionChange = true;",
    symptom: (m) => m.initialEntry.length > 1 || m.reviewEdit.length > 1
  },
  {
    name: "same-question rerenders move focus",
    key: "renderQ", src: RENDER_Q,
    find: " && _renderedQuestionId !== q.id;",
    replace: " && true;",
    symptom: (m) => m.optionTap.length > 0 || m.langSwitch.length > 0
  },
  {
    name: "initial-entry duplicate suppression removed",
    key: "renderQ", src: RENDER_Q,
    find: "_renderedQuestionId !== null && ",
    replace: "",
    symptom: (m) => m.initialEntry.length > 1
  },
  {
    name: "focus-refusal ownership bypassed",
    key: "focusQ", src: FOCUS_Q,
    find: "if (screenTransitionOwnedElsewhere()) return;",
    replace: "",
    symptom: (m) => m.dialogRefusal.length > 0 || m.drawerRefusal.length > 0
  },
  {
    name: "accessible question name absent",
    key: "renderQ", src: RENDER_Q,
    find: ' aria-label="${headingLabel}"',
    replace: "",
    symptom: (m) => m.next.length !== 1 || m.next[0] !== "questionHeadline" || !m.nextLabel
  },
  {
    name: "accessible question name language-stale",
    key: "renderQ", src: RENDER_Q,
    find: "(es ? 'Pregunta ' : 'Question ')",
    replace: "('Question ')",
    symptom: (m, mEs) => !mEs.nextLabel || !/^Pregunta /.test(mEs.nextLabel)
  }
];
for (const mu of MUTATIONS) {
  if (!check(`[applies] ${mu.name}`, mu.src.includes(mu.find), "find-string not in source")) continue;
  const mutated = mu.src.split(mu.find).join(mu.replace);
  const m = observe({ [mu.key]: mutated }, "en");
  const mEs = observe({ [mu.key]: mutated }, "es");
  check(`[caught] ${mu.name}`, mu.symptom(m, mEs) === true);
}

console.log(`\nQuestion transition check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
