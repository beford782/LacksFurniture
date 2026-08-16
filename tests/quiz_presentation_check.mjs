// quiz_presentation_check.mjs — the Quiz presentation slice (Slice 3, item 1.2).
//
// What this slice is: a PRESENTATION pass over the consultation quiz. The
// owner ruled the Quiz displays ZERO option icons ("a refined consultation
// form, not an illustrated card quiz"), capped the option grid at two
// columns, and authorized five accessibility repairs — aria-pressed on the
// option buttons, a non-color selected cue (normal + forced colors), visible
// focus on every quiz/review control, 44px interaction floors, and
// keyboard-only focus restoration across the rerender selectOption() forces.
//
// Nothing about scoring, answers, question/option structure, skip logic,
// navigation, copy or the dictionaries changes. This suite therefore has two
// halves and says which is which in its own output:
//
//   CHARACTERIZATION — behavior that was already correct before the slice and
//   must survive it byte-for-byte in meaning. These were GREEN before any
//   implementation and are the regression net.
//
//   REPAIR — genuine defects observed RED against the pre-slice tree. Each one
//   names the defect it pins.
//
// House style (results_presentation_check.mjs idiom): EXTRACT the real
// quizColsClass / visibleQuestions / resolveQuizCopy / applyQuestionAccent /
// getFirmnessLabel / renderQuestion / selectOption / nextQuestion /
// prevQuestion / formatAnswer / renderReviewChrome / renderReview /
// editAnswer / L from index.html and EXECUTE them against a DOM shim, driven
// by the COMMITTED data/quiz.json — plus CSS text parsing for the touch
// floors, selected-state geometry and focus wiring. Contrast arithmetic is
// deliberately NOT duplicated here; tests/contrast_check.mjs owns the Quiz
// color pairs. Writes nothing; exit 0 = pass.
//
// Run: node tests/quiz_presentation_check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const norm = html.replace(/\r\n/g, '\n');
const QUIZ = JSON.parse(readFileSync(join(here, '..', 'data', 'quiz.json'), 'utf8'));
const dictEn = JSON.parse(readFileSync(join(here, '..', 'data', 'dict-en.json'), 'utf8'));
const dictEs = JSON.parse(readFileSync(join(here, '..', 'data', 'dict-es.json'), 'utf8'));

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

// Slices out of the NORMALIZED text: the working tree is CRLF on Windows and
// LF on CI, and several assertions below match across line breaks. Extracting
// from `norm` makes the extracted source identical on both.
function extractFunction(anchor) {
  const start = norm.indexOf(anchor);
  if (start === -1) return null;
  let i = norm.indexOf('{', start);
  let depth = 1;
  i++;
  while (i < norm.length && depth > 0) {
    const ch = norm[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return norm.slice(start, i) + ';';
}

// ------------------------------------------------------------- extraction
section('extraction — the real quiz sources, not a copy');
const SOURCES = {
  L: 'function L(obj)',
  accents: 'const QUESTION_ACCENTS = {',
  applyAccent: 'function applyQuestionAccent(qId, text, lang)',
  cols: 'function quizColsClass(n)',
  visible: 'function visibleQuestions()',
  resolveCopy: 'function resolveQuizCopy(q)',
  render: 'window.renderQuestion = function()',
  feel: 'function getFirmnessLabel(val)',
  select: 'window.selectOption = function(qId, optId, isMulti)',
  next: 'window.nextQuestion = function()',
  prev: 'window.prevQuestion = function()',
  review: 'function goToReview()',
  formatAnswer: 'function formatAnswer(q, v)',
  reviewChrome: 'function renderReviewChrome()',
  renderReview: 'window.renderReview = function()',
  edit: 'window.editAnswer = function(idx)'
};
const src = {};
let missing = [];
for (const [key, anchor] of Object.entries(SOURCES)) {
  src[key] = extractFunction(anchor);
  if (!src[key]) missing.push(key);
}
ok('all sixteen production quiz sources found', missing.length === 0, missing.join(','));
if (missing.length) { console.log('FAIL — sources missing'); process.exit(1); }

// ------------------------------------------------------------ DOM harness
function makeEl(id, doc) {
  const el = {
    id, style: {}, attrs: {}, textContent: '', _html: '', _ev: {},
    _focusCount: 0, _focusOpts: null, _focusVisible: false, _detached: false,
    value: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    getAttribute(k) { return el.attrs[k]; },
    setAttribute(k, v) { el.attrs[k] = v; },
    addEventListener(type, fn) { (el._ev[type] = el._ev[type] || []).push(fn); },
    // The production guard is `active.matches(':focus-visible')`; the shim
    // answers it from an explicit flag so a test can model a KEYBOARD
    // activation (true) and a TOUCH/POINTER activation (false) distinctly.
    matches(sel) { return sel === ':focus-visible' ? el._focusVisible : false; },
    focus(opts) { el._focusCount++; el._focusOpts = opts || null; if (doc) doc.activeElement = el; },
    fire(type) { (el._ev[type] || []).forEach((fn) => fn.call(el, { type })); }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html; },
    set(v) {
      // Rendering REPLACES the subtree: every element the previous markup
      // owned is detached, and every id the new markup declares becomes
      // reachable through getElementById as a fresh element. That is exactly
      // the condition the keyboard focus repair has to survive.
      el._html = String(v);
      if (!doc) return;
      (el._owned || []).forEach((cid) => {
        const prev = doc._els.get(cid);
        if (prev) prev._detached = true;
        doc._els.delete(cid);
      });
      const owned = [...el._html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
      owned.forEach((cid) => {
        const child = makeEl(cid, doc);
        child._ownerHtml = el._html;
        doc._els.set(cid, child);
      });
      el._owned = owned;
    }
  });
  return el;
}

const SCREEN_IDS = ['welcomeScreen', 'questionScreen', 'reviewScreen', 'profileScreen', 'resultsScreen'];

function makeQuizEnv({ lang = 'en', answers = {}, at = 0, mutate = null, active = 'questionScreen' } = {}) {
  const doc = {
    _els: new Map(),
    activeElement: null,
    getElementById(id) {
      if (!doc._els.has(id)) doc._els.set(id, makeEl(id, doc));
      return doc._els.get(id);
    }
  };
  SCREEN_IDS.forEach((s) => { doc.getElementById(s); });
  if (active) doc.getElementById(active).classList.add('active');

  const D = lang === 'es' ? dictEs : dictEn;
  const t = (key) => (Object.prototype.hasOwnProperty.call(D, key) ? D[key] : key);
  const win = {};
  const screenCalls = [];
  const showScreen = (id) => {
    screenCalls.push(id);
    SCREEN_IDS.forEach((s) => doc.getElementById(s).classList.remove('active'));
    doc.getElementById(id).classList.add('active');
  };

  let body = [
    src.L, src.accents, src.applyAccent, src.cols, src.visible, src.resolveCopy,
    src.feel, src.render, src.select, src.next, src.prev, src.review,
    src.formatAnswer, src.reviewChrome, src.renderReview, src.edit
  ].join('\n');
  if (mutate) body = mutate(body);

  const preamble = 'var currentLang = __lang;\n'
    + 'var QUESTIONS = __questions;\n'
    + 'var currentQuestion = __at;\n'
    + 'var answers = __answers;\n'
    + 'var editingFromReview = false;\n';
  // In the page these live on window AND as globals; inside this Function
  // scope only the window property exists, so the bare-identifier calls the
  // production code makes (renderQuestion(), goToReview(), …) need the same
  // binding. Declared AFTER the body so the assignments have already run.
  const bind = '\nvar renderQuestion = window.renderQuestion;\n'
    + 'var selectOption = window.selectOption;\n'
    + 'var nextQuestion = window.nextQuestion;\n'
    + 'var prevQuestion = window.prevQuestion;\n'
    + 'var renderReview = window.renderReview;\n'
    + 'var editAnswer = window.editAnswer;\n';
  const tail = 'return {\n'
    + '  render: function(){ return window.renderQuestion(); },\n'
    + '  select: function(q,o,m){ return window.selectOption(q,o,m); },\n'
    + '  next: function(){ return window.nextQuestion(); },\n'
    + '  prev: function(){ return window.prevQuestion(); },\n'
    + '  review: function(){ return window.renderReview(); },\n'
    + '  edit: function(i){ return window.editAnswer(i); },\n'
    + '  visible: function(){ return visibleQuestions(); },\n'
    + '  cols: function(n){ return quizColsClass(n); },\n'
    + '  feel: function(v){ return getFirmnessLabel(v); },\n'
    + '  format: function(q,v){ return formatAnswer(q,v); },\n'
    + '  setLang: function(l){ currentLang = l; },\n'
    + '  getLang: function(){ return currentLang; },\n'
    + '  at: function(){ return currentQuestion; },\n'
    + '  answers: function(){ return answers; },\n'
    + '  wipe: function(){ currentQuestion = 0; answers = {}; editingFromReview = false; },\n'
    + '  editing: function(){ return editingFromReview; }\n'
    + '};';

  const api = new Function(
    'document', 'window', 't', 'showScreen', '__lang', '__questions', '__at', '__answers',
    preamble + body + bind + tail
  )(doc, win, t, showScreen, lang, JSON.parse(JSON.stringify(QUIZ.questions)), at, answers);

  return { api, doc, get: (id) => doc.getElementById(id), screenCalls, win };
}

// Parse the option buttons out of rendered question markup.
function optionsOf(markup) {
  return [...markup.matchAll(/<button class="noct-quiz-option([^"]*)"([\s\S]*?)>\s*<span class="opt-label">([\s\S]*?)<\/span>/g)]
    .map((m) => {
      const attrs = m[2];
      const idm = attrs.match(/\bid="([^"]+)"/);
      const pressed = attrs.match(/aria-pressed="([^"]+)"/);
      const sel = attrs.match(/selectOption\('([^']+)', '([^']+)'/);
      return {
        classes: m[1].trim(),
        selected: /\bselected\b/.test(m[1]),
        id: idm ? idm[1] : null,
        pressed: pressed ? pressed[1] : null,
        qId: sel ? sel[1] : null,
        optId: sel ? sel[2] : null,
        label: m[3].trim()
      };
    });
}
const colClassOf = (markup) => (markup.match(/class="noct-quiz-options ([^"]*)"/) || [null, ''])[1].trim();
const QID = (id) => QUIZ.questions.findIndex((q) => q.id === id);

// ================================================================ CHARACTERIZATION
// Behavior that was already correct before this slice. GREEN before any
// implementation; the regression net for everything the slice must not move.

section('CHARACTERIZATION — governed structure (data/quiz.json is the contract)');
ok('exactly 10 questions', QUIZ.questions.length === 10, `got ${QUIZ.questions.length}`);
const allOptions = QUIZ.questions.reduce((n, q) => n + (q.options ? q.options.length : 0), 0);
ok('exactly 47 configured options', allOptions === 47, `got ${allOptions}`);
const cardinalities = QUIZ.questions.filter((q) => q.options).map((q) => q.options.length);
[3, 4, 5, 6, 7, 8].forEach((n) => {
  ok(`the governed set still contains a ${n}-option question (this suite exercises every cardinality)`,
    cardinalities.includes(n), `cardinalities: ${cardinalities.join(',')}`);
});
ok('exactly one slider question (firmness) and no other non-option type',
  QUIZ.questions.filter((q) => q.type === 'slider').map((q) => q.id).join(',') === 'firmness');
ok('the two questions retired on 2026-08-12 are absent from the governed set',
  !QUIZ.questions.some((q) => q.id === 'sleep_quality' || q.id === 'current_mattress_age'));

section('CHARACTERIZATION — zero option icons reach the customer UI (owner ruling)');
// The 47 dormant icon fields and their validator requirement stay intact; what
// is pinned here is that NOTHING renders them. "Passes the meaning test" is not
// pre-approval to render an icon later.
const iconFields = QUIZ.questions.reduce(
  (n, q) => n + (q.options ? q.options.filter((o) => typeof o.icon === 'string' && o.icon.length).length : 0), 0);
ok('all 47 configured option-icon fields remain in the governed data (dormant, not deleted)',
  iconFields === 47, `icon fields: ${iconFields}`);
ok('the live option renderer never calls icon(opt.icon)',
  !/icon\(\s*opt\.icon\s*\)/.test(src.render) && !/opt\.icon/.test(src.render));
{
  let iconHits = 0;
  let optionCount = 0;
  for (const lang of ['en', 'es']) {
    for (const q of QUIZ.questions) {
      if (!q.options) continue;
      const env = makeQuizEnv({ lang, at: QID(q.id), answers: { partner_sleep: 'partner' } });
      env.api.render();
      const markup = env.get('questionContainer').innerHTML;
      optionCount += optionsOf(markup).length;
      if (/opt-icon|<svg|<img|&#x2713;|✓|✔/.test(markup)) iconHits++;
    }
  }
  ok('no rendered question in either language emits a pictogram, SVG, image or decorative checkmark',
    iconHits === 0, `${optionCount} option buttons rendered across EN+ES`);
}

section('CHARACTERIZATION — visible-question set and skip semantics');
{
  const solo = makeQuizEnv({ answers: { partner_sleep: 'solo' } });
  const shared = makeQuizEnv({ answers: { partner_sleep: 'partner' } });
  ok('solo path shows 9 questions', solo.api.visible().length === 9, `got ${solo.api.visible().length}`);
  ok('shared path shows 10 questions', shared.api.visible().length === 10, `got ${shared.api.visible().length}`);
  ok('partner_disturbance is the omitted one on the solo path',
    !solo.api.visible().some((q) => q.id === 'partner_disturbance')
    && shared.api.visible().some((q) => q.id === 'partner_disturbance'));
}
{
  // Walking forward off partner_sleep=solo stamps not_applicable and lands
  // past partner_disturbance.
  const env = makeQuizEnv({ at: QID('partner_sleep'), answers: {} });
  env.api.render();
  env.api.select('partner_sleep', 'solo', false);
  env.api.next();
  ok('solo skip stamps not_applicable on partner_disturbance',
    env.api.answers().partner_disturbance === 'not_applicable');
  ok('solo skip lands on sleep_position, never on the skipped question',
    QUIZ.questions[env.api.at()].id === 'sleep_position', QUIZ.questions[env.api.at()].id);
  env.api.prev();
  ok('walking back skips the same question in reverse',
    QUIZ.questions[env.api.at()].id === 'partner_sleep', QUIZ.questions[env.api.at()].id);
}
{
  const env = makeQuizEnv({ at: QID('partner_sleep'), answers: {} });
  env.api.render();
  env.api.select('partner_sleep', 'partner', false);
  env.api.next();
  ok('shared path renders partner_disturbance and stamps nothing',
    QUIZ.questions[env.api.at()].id === 'partner_disturbance'
    && env.api.answers().partner_disturbance === undefined);
}

section('CHARACTERIZATION — hideIf filtering and configured option order');
{
  let orderFailures = [];
  let hideChecked = 0;
  for (const q of QUIZ.questions) {
    if (!q.options) continue;
    const env = makeQuizEnv({ at: QID(q.id), answers: { partner_sleep: 'partner' } });
    env.api.render();
    const got = optionsOf(env.get('questionContainer').innerHTML).map((o) => o.optId).join(',');
    const want = q.options
      .filter((o) => !o.hideIf || (o.hideIf.question === 'partner_sleep' ? 'partner' : undefined) !== o.hideIf.answer)
      .map((o) => o.id).join(',');
    if (got !== want) orderFailures.push(`${q.id}: ${got} != ${want}`);
  }
  ok('every question renders its options in configured order', orderFailures.length === 0, orderFailures.join(' | '));
  const hideOpts = QUIZ.questions.flatMap((q) => (q.options || []).filter((o) => o.hideIf).map((o) => ({ q, o })));
  hideOpts.forEach(({ q, o }) => {
    hideChecked++;
    const hidden = makeQuizEnv({ at: QID(q.id), answers: { [o.hideIf.question]: o.hideIf.answer } });
    hidden.api.render();
    const shown = makeQuizEnv({ at: QID(q.id), answers: {} });
    shown.api.render();
    ok(`hideIf removes ${q.id}/${o.id} when ${o.hideIf.question}=${o.hideIf.answer}, keeps it otherwise`,
      !optionsOf(hidden.get('questionContainer').innerHTML).some((x) => x.optId === o.id)
      && optionsOf(shown.get('questionContainer').innerHTML).some((x) => x.optId === o.id));
  });
  ok('at least one hideIf option exists to exercise', hideChecked > 0, `${hideChecked} hideIf options`);
}

section('CHARACTERIZATION — selection semantics (manual advance, cap, exclusivity)');
ok('selectOption never advances: no nextQuestion/goToReview call in its body',
  !/nextQuestion\s*\(/.test(src.select) && !/goToReview\s*\(/.test(src.select));
{
  const env = makeQuizEnv({ at: QID('trigger'), answers: {} });
  env.api.render();
  env.api.select('trigger', QUIZ.questions[QID('trigger')].options[0].id, false);
  ok('single-select stores the option and stays on the same question (no auto-advance)',
    env.api.answers().trigger === QUIZ.questions[QID('trigger')].options[0].id
    && env.api.at() === QID('trigger'));
  env.api.select('trigger', QUIZ.questions[QID('trigger')].options[2].id, false);
  ok('single-select REPLACES the previous answer (never accumulates)',
    env.api.answers().trigger === QUIZ.questions[QID('trigger')].options[2].id);
  const marked = optionsOf(env.get('questionContainer').innerHTML).filter((o) => o.selected);
  ok('exactly one option carries the selected class after a single-select', marked.length === 1);
}
{
  const q = QUIZ.questions[QID('sleep_issues')];
  const env = makeQuizEnv({ at: QID('sleep_issues'), answers: {} });
  env.api.render();
  const ids = q.options.filter((o) => o.id !== 'none').map((o) => o.id);
  env.api.select('sleep_issues', ids[0], true);
  env.api.select('sleep_issues', ids[1], true);
  ok('multi-select accumulates', env.api.answers().sleep_issues.join(',') === `${ids[0]},${ids[1]}`);
  env.api.select('sleep_issues', ids[1], true);
  ok('re-tapping a multi option removes it (toggle)', env.api.answers().sleep_issues.join(',') === ids[0]);
  env.api.select('sleep_issues', ids[1], true);
  env.api.select('sleep_issues', ids[2], true);
  env.api.select('sleep_issues', ids[3], true);
  ok('multi-select caps at 3 selections', env.api.answers().sleep_issues.length === 3,
    env.api.answers().sleep_issues.join(','));
  env.api.select('sleep_issues', 'none', true);
  ok('"None" is exclusive — it clears every other selection',
    env.api.answers().sleep_issues.join(',') === 'none');
  env.api.select('sleep_issues', ids[0], true);
  ok('choosing a real option after "None" drops "None"',
    env.api.answers().sleep_issues.join(',') === ids[0]);
  const multi = optionsOf(env.get('questionContainer').innerHTML);
  ok('multi question renders the pick-up-to-3 note',
    /noct-quiz-multi-note/.test(env.get('questionContainer').innerHTML) && multi.length === 8);
}
{
  const q = QUIZ.questions[QID('health_conditions')];
  const env = makeQuizEnv({ lang: 'es', at: QID('health_conditions'), answers: {} });
  env.api.render();
  ok('the 7-option multi question renders all 7 options in Spanish',
    optionsOf(env.get('questionContainer').innerHTML).length === 7 && q.options.length === 7);
  env.api.select('health_conditions', 'none', true);
  env.api.select('health_conditions', q.options[0].id, true);
  ok('"None" exclusivity holds in Spanish too',
    env.api.answers().health_conditions.join(',') === q.options[0].id);
}

section('CHARACTERIZATION — firmness slider values and input behavior');
{
  const q = QUIZ.questions[QID('firmness')];
  const env = makeQuizEnv({ at: QID('firmness'), answers: {} });
  env.api.render();
  const markup = env.get('questionContainer').innerHTML;
  ok('slider renders governed min/max/default verbatim',
    markup.includes(`min="${q.min}"`) && markup.includes(`max="${q.max}"`)
    && markup.includes(`value="${q.defaultValue}"`),
    `min=${q.min} max=${q.max} default=${q.defaultValue}`);
  ok('slider min/max/default are still 1/10/5', q.min === 1 && q.max === 10 && q.defaultValue === 5);
  ok('rendering the slider seeds the default answer', env.api.answers().firmness === q.defaultValue);
  ok('all governed end labels render',
    q.labels.every((l) => markup.includes(l.en) || markup.includes(l.es)));
  const slider = env.get('firmnessSlider');
  slider.value = '9';
  slider.fire('input');
  ok('dragging the slider stores the integer value', env.api.answers().firmness === 9);
  ok('the value readout and feel word follow the input',
    env.get('sliderVal').textContent === '9' && env.get('sliderLabel').textContent === env.api.feel(9));
  ok('feel word mapping unchanged across the range',
    [1, 3, 5, 7, 10].map((v) => env.api.feel(v)).join('|')
      === 'Very Soft|Soft to Medium|Medium|Medium Firm to Firm|Extra Firm');
}
{
  const env = makeQuizEnv({ lang: 'es', at: QID('firmness'), answers: {} });
  env.api.render();
  ok('Spanish feel words unchanged across the range',
    [1, 3, 5, 7, 10].map((v) => env.api.feel(v)).join('|')
      === 'Muy Suave|Suave a Medio|Medio|Medio Firme a Firme|Extra Firme');
}

section('CHARACTERIZATION — EN/ES structural parity and language preservation');
{
  const diffs = [];
  for (const q of QUIZ.questions) {
    if (!q.options) continue;
    const a = makeQuizEnv({ lang: 'en', at: QID(q.id), answers: { partner_sleep: 'partner' } });
    const b = makeQuizEnv({ lang: 'es', at: QID(q.id), answers: { partner_sleep: 'partner' } });
    a.api.render(); b.api.render();
    const ma = a.get('questionContainer').innerHTML;
    const mb = b.get('questionContainer').innerHTML;
    const oa = optionsOf(ma); const ob = optionsOf(mb);
    if (oa.length !== ob.length) diffs.push(`${q.id}: count ${oa.length}/${ob.length}`);
    if (oa.map((o) => o.optId).join(',') !== ob.map((o) => o.optId).join(',')) diffs.push(`${q.id}: order`);
    if (colClassOf(ma) !== colClassOf(mb)) diffs.push(`${q.id}: grid ${colClassOf(ma)}/${colClassOf(mb)}`);
    if (oa.map((o) => o.pressed).join(',') !== ob.map((o) => o.pressed).join(',')) diffs.push(`${q.id}: state`);
    if (oa.some((o, i) => o.label === ob[i].label && q.options[i] && q.options[i].label.en !== q.options[i].label.es)) {
      diffs.push(`${q.id}: untranslated label`);
    }
  }
  ok('EN and ES render identical structure (count, order, grid, state) and different text',
    diffs.length === 0, diffs.join(' | '));
}
{
  const env = makeQuizEnv({ at: QID('sleep_position'), answers: { partner_sleep: 'partner' } });
  env.api.render();
  env.api.select('sleep_position', QUIZ.questions[QID('sleep_position')].options[1].id, false);
  const before = { at: env.api.at(), answers: JSON.stringify(env.api.answers()) };
  env.api.setLang('es');
  env.api.render();
  const after = optionsOf(env.get('questionContainer').innerHTML);
  ok('a language switch preserves the current question and every stored answer',
    env.api.at() === before.at && JSON.stringify(env.api.answers()) === before.answers);
  ok('a language switch preserves the selected option after the rerender',
    after.filter((o) => o.selected).map((o) => o.optId).join(',')
      === QUIZ.questions[QID('sleep_position')].options[1].id);
  ok('a language switch re-renders the copy in the new language',
    env.get('questionContainer').innerHTML.includes('Pregunta 5'));
}
ok('switchLanguage re-renders the ACTIVE question so its copy follows the language',
  /questionScreen\.classList\.contains\('active'\)\)\s*\{\s*window\.renderQuestion\(\);/.test(norm.replace(/\n\s*/g, ' ').replace(/if \(questionScreen && /, 'if (questionScreen'))
  || /if \(questionScreen && questionScreen\.classList\.contains\('active'\)\) \{\s*window\.renderQuestion\(\);\s*\}/.test(norm));
ok('switchLanguage re-renders the Review rows so their copy follows the language',
  /if \(reviewScreen && reviewScreen\.classList\.contains\('active'\)\) \{\s*window\.renderReview\(\);\s*\}/.test(norm));

section('CHARACTERIZATION — the language-switch focus path the option ids opened');
// Giving options stable ids made them eligible for switchLanguage()'s existing
// "put focus back where the customer left it" hint, which before Slice 3 could
// never name an option (they had no id). That path is NOT modified here — it
// belongs to the session/language machinery — but the two properties that keep
// it safe are pinned, because the ids are what made it reachable.
ok('switchLanguage records the focus hint by id, which is why option ids now feed this path',
  /var active = document\.activeElement;\s*if \(active && active\.id\) _langFocusHintId = active\.id;/.test(norm));
ok('restoreLanguageFocus resolves the hint through getElementById AFTER the rerender, so it can only reach the live replacement — never a detached option',
  /function restoreLanguageFocus\(\) \{[\s\S]*?var el = document\.getElementById\(candidates\[i\]\);[\s\S]*?el\.focus\(\);/.test(norm));
ok('the hint is cleared by the wipe, so one customer\'s option cannot be refocused for the next',
  /_langFocusHintId = null;/.test(norm));

section('CHARACTERIZATION — Review rows, order, and the Edit round trip');
{
  const answers = {
    trigger: QUIZ.questions[QID('trigger')].options[0].id,
    partner_sleep: 'partner', firmness: 7
  };
  const env = makeQuizEnv({ at: 0, answers, active: 'reviewScreen' });
  env.api.review();
  const rows = [...env.get('reviewList').innerHTML.matchAll(/noct-review-question">([\s\S]*?)</g)].map((m) => m[1]);
  ok('Review lists every visible question, in question order',
    rows.length === 10 && rows[0] === QUIZ.questions[0].question.en);
  ok('Review renders one Edit control per row',
    (env.get('reviewList').innerHTML.match(/noct-review-edit/g) || []).length === 10);
  ok('Review renders the firmness answer as value + feel word',
    env.get('reviewList').innerHTML.includes('7/10 · Medium Firm to Firm'));
}
{
  const solo = makeQuizEnv({ answers: { partner_sleep: 'solo' }, active: 'reviewScreen' });
  solo.api.review();
  ok('Review omits partner_disturbance on the solo path',
    !solo.get('reviewList').innerHTML.includes(QUIZ.questions[QID('partner_disturbance')].question.en)
    && (solo.get('reviewList').innerHTML.match(/noct-review-row"/g) || []).length === 9);
}
{
  const env = makeQuizEnv({ answers: { partner_sleep: 'partner' }, active: 'reviewScreen' });
  env.api.review();
  const idx = QID('temperature');
  env.api.edit(idx);
  ok('Edit opens the question screen on the requested question',
    env.api.at() === idx && env.screenCalls[env.screenCalls.length - 1] === 'questionScreen'
    && optionsOf(env.get('questionContainer').innerHTML).map((o) => o.qId)
      .every((qid) => qid === QUIZ.questions[idx].id));
  env.api.select('temperature', QUIZ.questions[idx].options[0].id, false);
  ok('correcting the answer while editing stores the new value',
    env.api.answers().temperature === QUIZ.questions[idx].options[0].id);
  env.api.next();
  ok('Next from an edited question returns straight to Review (no forward walk)',
    env.screenCalls[env.screenCalls.length - 1] === 'reviewScreen' && env.api.editing() === false);
  env.api.review();
  ok('the corrected answer is reflected in the Review row',
    env.get('reviewList').innerHTML.includes(QUIZ.questions[idx].options[0].label.en));
}
{
  const env = makeQuizEnv({ answers: { partner_sleep: 'partner' }, active: 'reviewScreen' });
  env.api.review();
  env.api.edit(QID('body_type'));
  env.api.prev();
  ok('Back from an edited question also returns to Review',
    env.screenCalls[env.screenCalls.length - 1] === 'reviewScreen');
}

section('CHARACTERIZATION — touch/click handler pair is untouched (Invariant 10)');
ok('option buttons keep the shipped onclick + ontouchend pair verbatim',
  src.render.includes(`onclick="selectOption('\${q.id}', '\${opt.id}', \${isMulti})"`)
  && src.render.includes(`ontouchend="event.preventDefault();selectOption('\${q.id}', '\${opt.id}', \${isMulti});"`));
ok('Back keeps its shipped pair verbatim',
  src.render.includes(`onclick="prevQuestion()" ontouchend="event.preventDefault();prevQuestion();"`));
ok('Next keeps its shipped pair verbatim (including the disabled guard on touch)',
  src.render.includes(`onclick="nextQuestion()" ontouchend="event.preventDefault();nextQuestion();"`)
  && src.render.includes(`ontouchend="event.preventDefault();if(!this.disabled)nextQuestion();"`));
ok('Review Edit keeps its shipped pair verbatim',
  src.renderReview.includes(`onclick="window.editAnswer(' + idx + ')" ontouchend="event.preventDefault();window.editAnswer(' + idx + ');"`));
ok('no quiz control was converted to a radio/checkbox role or an arrow-key group',
  !/role="radio/.test(src.render) && !/role="checkbox/.test(src.render)
  && !/role="radiogroup"/.test(src.render) && !/onkeydown/.test(src.render));
ok('every option button keeps touch-action: manipulation',
  /\.noct-quiz-option \{[^}]*touch-action: manipulation;/.test(norm));

section('CHARACTERIZATION — a wipe leaves no quiz residue');
ok('the wipe blanks both generated quiz containers',
  /var SESSION_CONTENT_IDS = \[\s*'questionContainer', 'reviewList',/.test(norm));
ok('the wipe resets currentQuestion, answers and the edit flag',
  /currentQuestion = 0;\s*answers = \{\};\s*editingFromReview = false;/.test(norm));
{
  const env = makeQuizEnv({ at: QID('temperature'), answers: { temperature: 'hot', partner_sleep: 'partner' } });
  env.api.render();
  ok('pre-wipe: the stored answer renders as selected',
    optionsOf(env.get('questionContainer').innerHTML).some((o) => o.selected));
  env.api.wipe();
  env.api.render();
  ok('post-wipe: no option renders selected and no answer survives',
    !optionsOf(env.get('questionContainer').innerHTML).some((o) => o.selected)
    && Object.keys(env.api.answers()).length === 0 && env.api.at() === 0);
  env.api.review();
  ok('post-wipe: Review shows no stale answers (every row reads the em-dash placeholder)',
    (env.get('reviewList').innerHTML.match(/noct-review-answer">—</g) || []).length >= 9);
}

// ================================================================ REPAIR
// Genuine defects observed RED against the pre-slice tree (b05d47f).

section('REPAIR 1 — aria-pressed carries the selected state on every option');
{
  const env = makeQuizEnv({ at: QID('sleep_position'), answers: {} });
  env.api.render();
  const q = QUIZ.questions[QID('sleep_position')];
  env.api.select('sleep_position', q.options[2].id, false);
  const opts = optionsOf(env.get('questionContainer').innerHTML);
  ok('single-select: every option carries aria-pressed',
    opts.length === 5 && opts.every((o) => o.pressed === 'true' || o.pressed === 'false'),
    opts.map((o) => o.pressed).join(','));
  ok('single-select: aria-pressed mirrors the stored answer exactly',
    opts.filter((o) => o.pressed === 'true').map((o) => o.optId).join(',') === q.options[2].id
    && opts.every((o) => (o.pressed === 'true') === o.selected));
}
{
  const q = QUIZ.questions[QID('sleep_issues')];
  const env = makeQuizEnv({ at: QID('sleep_issues'), answers: {} });
  env.api.render();
  env.api.select('sleep_issues', q.options[1].id, true);
  env.api.select('sleep_issues', q.options[3].id, true);
  const opts = optionsOf(env.get('questionContainer').innerHTML);
  ok('multiple-select: every option carries aria-pressed',
    opts.length === 8 && opts.every((o) => o.pressed === 'true' || o.pressed === 'false'),
    opts.map((o) => o.pressed).join(','));
  ok('multiple-select: aria-pressed marks exactly the stored answers',
    opts.filter((o) => o.pressed === 'true').map((o) => o.optId).sort().join(',')
      === [q.options[1].id, q.options[3].id].sort().join(','));
  ok('an unanswered question renders every option aria-pressed="false"',
    optionsOf(makeQuizEnv({ at: QID('sleep_issues'), answers: {} }).api.render()
      || (() => { const e = makeQuizEnv({ at: QID('sleep_issues'), answers: {} }); e.api.render();
        return e.get('questionContainer').innerHTML; })()).every((o) => o.pressed === 'false'));
}
{
  // Every question, both languages: aria-pressed and the selected class agree.
  const bad = [];
  for (const lang of ['en', 'es']) {
    for (const q of QUIZ.questions) {
      if (!q.options) continue;
      const first = q.options[0].id;
      const answers = q.type === 'multiple' ? { [q.id]: [first] } : { [q.id]: first };
      answers.partner_sleep = q.id === 'partner_sleep' ? first : 'partner';
      const env = makeQuizEnv({ lang, at: QID(q.id), answers });
      env.api.render();
      optionsOf(env.get('questionContainer').innerHTML).forEach((o) => {
        if ((o.pressed === 'true') !== o.selected) bad.push(`${lang}/${q.id}/${o.optId}`);
        if (o.pressed !== 'true' && o.pressed !== 'false') bad.push(`${lang}/${q.id}/${o.optId}:missing`);
      });
    }
  }
  ok('aria-pressed agrees with the visual selected state for every option in both languages',
    bad.length === 0, bad.slice(0, 6).join(','));
}

section('REPAIR 2 — the selected state is not carried by color alone');
const optBaseCss = (norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, ''])[1];
const optSelCss = (norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option\.selected \{([^}]*)\}/) || [null, ''])[1];
ok('the resting option reserves the selected rail transparently (no reflow on selection)',
  /border-left:\s*6px solid transparent;/.test(optBaseCss), optBaseCss.trim().split('\n').length + ' decls');
ok('the selected option changes GEOMETRY, not only color (2px boundary + 6px rail)',
  /border-width:\s*2px;/.test(optSelCss) && /border-left-width:\s*6px;/.test(optSelCss));
ok('the selected option compensates padding so the label and sublabel never move',
  /padding:\s*19px 21px 19px 17px;/.test(optSelCss) && /padding:\s*20px 22px 20px 17px;/.test(optBaseCss));
ok('the selected option uses a restrained warm tint, not a filled brass/red block',
  /background:\s*#F2E9DB;/.test(optSelCss) && !/var\(--consultation-red\)/.test(optSelCss));
ok('no decorative checkmark, icon, shadow, gradient or new selection animation was added',
  !/content:\s*['"]/.test(optSelCss) && !/box-shadow/.test(optSelCss)
  && !/gradient/.test(optSelCss) && !/animation/.test(optSelCss));
ok('labels keep the serif treatment and sublabels reach 14–15px with comfortable leading',
  /font-family: var\(--font-serif\);/.test((norm.match(/\.noct-quiz-option \.opt-label \{([^}]*)\}/) || [null, ''])[1])
  && /font-size:\s*15px;/.test((norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \.opt-sub \{([^}]*)\}/) || [null, ''])[1])
  && /line-height:\s*1\.45;/.test((norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \.opt-sub \{([^}]*)\}/) || [null, ''])[1]));

section('REPAIR 3 — forced colors: the cue must WIN the cascade, not merely exist');
// The first version of this section asserted only that a string of CSS was
// present. It was: `.noct-quiz-option[aria-pressed="true"]` is (0,2,0) and lost
// to the normal selected rule at (1,3,1), which already sets border-width: 2px
// — so the declaration never applied and the assertion passed anyway. These
// checks compute the CASCADE OUTCOME and the resulting box geometry instead.
//
// Honest scope: this is static cascade analysis of the shipped stylesheet, not
// a rendered forced-colors verification. No forced-colors rendering environment
// was available; nothing here claims the cue was seen.

// Specificity of a compound selector, per CSS Selectors 4. `:has()` takes the
// specificity of its most specific argument.
function specificity(sel) {
  let s = sel.trim();
  let a = 0, b = 0, c = 0;
  s = s.replace(/:has\(([^)]*)\)/g, (_, inner) => {
    const [ia, ib, ic] = specificity(inner);
    a += ia; b += ib; c += ic;
    return ' ';
  });
  a += (s.match(/#[\w-]+/g) || []).length;
  b += (s.match(/\.[\w-]+/g) || []).length;
  b += (s.match(/\[[^\]]*\]/g) || []).length;
  b += (s.match(/:(?!:)(?!has\b)[\w-]+/g) || []).length;
  c += (s.replace(/[#.\[][^\s>+~]*/g, ' ').match(/\b[a-zA-Z][\w-]*\b/g) || []).length;
  return [a, b, c];
}
const cmpSpec = (x, y) => (x[0] - y[0]) || (x[1] - y[1]) || (x[2] - y[2]);

// Pull a rule body out of an already-isolated @media block. Takes the block
// TEXT, not a regex: several forced-colors blocks exist and the focus one also
// mentions `.noct-quiz-option` (as `:focus-visible`), so matching by regex
// against the whole file silently resolves to the wrong block.
function ruleIn(block, selector) {
  if (!block) return null;
  const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}');
  const r = block.match(re);
  return r ? r[1] : null;
}
// Comments are stripped before any CSS is parsed, the same way
// tests/contrast_check.mjs does it. A rationale comment inside a rule body that
// quotes a declaration ("the base rule's `border-left: 6px solid transparent`")
// is prose, not CSS, and a regex parser that sees it reads the wrong geometry
// and the wrong colours.
const cssNorm = norm.replace(/\/\*[\s\S]*?\*\//g, '');
const forcedWideBlock = (() => {
  const blocks = cssNorm.match(/@media \(forced-colors: active\) \{[\s\S]*?\n    \}/g) || [];
  // the quiz state block is the one declaring the aria-pressed geometry
  return blocks.find((b) => b.includes('[aria-pressed="true"]') && b.includes('border-width')) || '';
})();
const forcedNarrowBlock = (cssNorm.match(/@media \(forced-colors: active\) and \(max-width: 700px\) \{[\s\S]*?\n    \}/) || [''])[0];

const SEL_NORMAL_SELECTED = 'body:has(#questionScreen.active) .noct-quiz-option.selected';
const SEL_FORCED_SELECTED = 'body:has(#questionScreen.active) .noct-quiz-option.selected[aria-pressed="true"]';
const SEL_FORCED_RESTING = 'body:has(#questionScreen.active) .noct-quiz-option';

// Both halves matter: the selector the FILE ships must be the one whose
// specificity outranks the normal rule. Comparing two constants would pass
// against any tree at all — that is the exact vacuity this section replaced.
ok('the forced-colors selected rule outranks the normal selected rule (so it can actually apply)',
  norm.includes(SEL_FORCED_SELECTED)
  && norm.includes(SEL_NORMAL_SELECTED)
  && cmpSpec(specificity(SEL_FORCED_SELECTED), specificity(SEL_NORMAL_SELECTED)) > 0,
  `forced ${specificity(SEL_FORCED_SELECTED).join(',')} vs normal ${specificity(SEL_NORMAL_SELECTED).join(',')}`);
ok('the retired (0,2,0) selector that lost the cascade is gone',
  !/^\s*\.noct-quiz-option\[aria-pressed="true"\] \{/m.test(norm));
ok('the forced-colors selected rule is scoped to the active quiz screen',
  forcedWideBlock.includes(SEL_FORCED_SELECTED));
ok('the resting option gets a uniform 1px WIDTH on all four sides under forced colors',
  /border-width:\s*1px;/.test(ruleIn(forcedWideBlock, SEL_FORCED_RESTING) || ''));

// The width alone is not the boundary. The base rule declares
// `border-left: 6px solid transparent`, so unless the forced rule pins a colour
// too, the left edge's VISIBILITY depends on whether the UA forces
// `transparent` — which forced colours does not guarantee. Searching the forced
// block for the word "transparent" cannot see that, because the transparency
// lives in a rule the block does not contain. So resolve the cascade instead.
{
  const baseResting = (cssNorm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, ''])[1];
  const normalSelected = (cssNorm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option\.selected \{([^}]*)\}/) || [null, ''])[1];
  const forcedResting = ruleIn(forcedWideBlock, SEL_FORCED_RESTING) || '';
  const forcedSelected = ruleIn(forcedWideBlock, SEL_FORCED_SELECTED) || '';

  ok('precondition: the base resting rule really does declare a transparent left rail (the hazard is real)',
    /border-left:\s*6px solid transparent;/.test(baseResting));
  ok('precondition: the normal selected rule really does declare an author colour',
    /border-color:\s*var\(--accent-ink\);/.test(normalSelected));

  // A colour on the RESTING rule alone is not enough: that selector is (1,2,1)
  // and loses to the normal selected rule at (1,3,1), so a selected option would
  // keep the author colour. Both forced rules must pin it.
  ok('the forced RESTING rule pins an explicit system colour on all four edges',
    /border-color:\s*CanvasText;/.test(forcedResting));
  ok('the forced SELECTED rule pins it too — the resting rule alone cannot reach a selected option',
    /border-color:\s*CanvasText;/.test(forcedSelected));

  const idxCanvas = cssNorm.indexOf('border-color: CanvasText;', cssNorm.indexOf(forcedWideBlock.slice(0, 40)));
  const idxRail = cssNorm.indexOf('border-left: 6px solid transparent;');
  const idxInk = cssNorm.indexOf('border-color: var(--accent-ink);', cssNorm.indexOf('background: #F2E9DB;'));
  ok('resting: the system colour ties the base rail on specificity and is declared later, so it wins',
    cmpSpec(specificity(SEL_FORCED_RESTING), specificity(SEL_FORCED_RESTING)) === 0
    && idxRail > 0 && idxCanvas > idxRail,
    `${specificity(SEL_FORCED_RESTING).join(',')} at ${idxCanvas} vs rail at ${idxRail}`);
  ok('selected: the system colour OUTRANKS the normal selected author colour, so selected edges are system-coloured',
    cmpSpec(specificity(SEL_FORCED_SELECTED), specificity(SEL_NORMAL_SELECTED)) > 0
    && idxInk > 0 && idxCanvas > 0,
    `forced selected ${specificity(SEL_FORCED_SELECTED).join(',')} vs normal selected ${specificity(SEL_NORMAL_SELECTED).join(',')}`);
  ok('no forced-colors quiz rule reintroduces transparent or an author colour token',
    !/transparent/.test(forcedWideBlock) && !/transparent/.test(forcedNarrowBlock)
    && !/var\(--/.test(forcedWideBlock.match(/border-color:[^;]*;/g)?.join(' ') || ''));
}
ok('the forced-colors selected option carries a 3px frame with a 6px left rail',
  /border-width:\s*3px;/.test(ruleIn(forcedWideBlock, SEL_FORCED_SELECTED) || '')
  && /border-left-width:\s*6px;/.test(ruleIn(forcedWideBlock, SEL_FORCED_SELECTED) || ''));
ok('forced colors is achieved without forced-color-adjust: none',
  !/forced-color-adjust\s*:\s*none/.test(norm));

// --- per-side border+padding totals: text and box must not move ------------
function sides(body, fallbackBorder) {
  if (body === null) return null;
  const pad = (body.match(/padding:\s*([^;]+);/) || [])[1];
  const bw = (body.match(/border-width:\s*([\d.]+)px;/) || [])[1];
  const blw = (body.match(/border-left-width:\s*([\d.]+)px;/) || [])[1];
  const shorthand = (body.match(/border:\s*([\d.]+)px/) || [])[1];
  const bl = (body.match(/border-left:\s*([\d.]+)px/) || [])[1];
  const base = parseFloat(bw ?? shorthand ?? fallbackBorder?.all ?? 'NaN');
  const left = parseFloat(blw ?? bl ?? bw ?? shorthand ?? fallbackBorder?.left ?? 'NaN');
  if (!pad) return null;
  const p = pad.trim().split(/\s+/).map((v) => parseFloat(v));
  const [pt, pr, pb, pl] = p.length === 4 ? p
    : p.length === 2 ? [p[0], p[1], p[0], p[1]]
    : [p[0], p[0], p[0], p[0]];
  return { top: base + pt, right: base + pr, bottom: base + pb, left: left + pl };
}
const eq = (x, y) => x && y && x.top === y.top && x.right === y.right && x.bottom === y.bottom && x.left === y.left;
const show = (o) => (o ? `${o.top}/${o.right}/${o.bottom}/${o.left}` : 'unparsed');
{
  // normal state, wide
  const nRest = sides((cssNorm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, null])[1]);
  const nSel = sides((cssNorm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option\.selected \{([^}]*)\}/) || [null, null])[1],
    { all: 1, left: 6 });
  // forced state, wide
  const fRest = sides(ruleIn(forcedWideBlock, SEL_FORCED_RESTING));
  const fSel = sides(ruleIn(forcedWideBlock, SEL_FORCED_SELECTED));
  ok('normal state: selected and resting already share border+padding on every side',
    eq(nRest, nSel), `resting ${show(nRest)} vs selected ${show(nSel)}`);
  ok('forced colors: resting keeps the SAME per-side totals as normal, so nothing moves entering forced colors',
    eq(fRest, nRest), `forced ${show(fRest)} vs normal ${show(nRest)}`);
  ok('forced colors: selecting does not move the text or grow the box',
    eq(fSel, fRest), `selected ${show(fSel)} vs resting ${show(fRest)}`);
}
{
  // narrow breakpoint, both states
  const narrow = (cssNorm.match(/@media \(max-width: 700px\) \{[\s\S]*?\n    \}/) || [''])[0];
  const nRest = sides((narrow.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, null])[1],
    { all: 1, left: 6 });
  const nSel = sides((narrow.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option\.selected \{([^}]*)\}/) || [null, null])[1],
    { all: 2, left: 6 });
  const fRest = sides(ruleIn(forcedNarrowBlock, SEL_FORCED_RESTING), { all: 1, left: 1 });
  const fSel = sides(ruleIn(forcedNarrowBlock, SEL_FORCED_SELECTED), { all: 3, left: 6 });
  ok('narrow breakpoint has its own forced-colors geometry (else the wide rule wins there by source order)',
    !!forcedNarrowBlock && forcedNarrowBlock.includes(SEL_FORCED_SELECTED));
  ok('narrow breakpoint, normal state: totals already match between states',
    eq(nRest, nSel), `resting ${show(nRest)} vs selected ${show(nSel)}`);
  ok('narrow breakpoint, forced colors: resting totals match the normal narrow state',
    eq(fRest, nRest), `forced ${show(fRest)} vs normal ${show(nRest)}`);
  ok('narrow breakpoint, forced colors: selecting does not move the text or grow the box',
    eq(fSel, fRest), `selected ${show(fSel)} vs resting ${show(fRest)}`);
  ok('the narrow forced block is placed AFTER the wide one (equal specificity — order decides)',
    norm.indexOf('@media (forced-colors: active) and (max-width: 700px)')
      > norm.indexOf(forcedWideBlock.slice(0, 60)));
}
{
  const firstForcedIdx = norm.indexOf('@media (forced-colors: active)');
  const quizForcedIdx = norm.indexOf(SEL_FORCED_SELECTED);
  const focusBlockIdx = norm.indexOf('.fin-btn:focus-visible');
  ok('the quiz forced-colors block is placed AFTER the anchored focus block (suite ordering preserved)',
    firstForcedIdx > focusBlockIdx && quizForcedIdx > firstForcedIdx);
  ok('the first forced-colors block in the file is still the focus one',
    norm.slice(firstForcedIdx, firstForcedIdx + 900).includes('outline-color: CanvasText'));
}

section('REPAIR 4 — every quiz and review control has a visible focus indicator');
const consolidatedFocus = (norm.match(/\.fin-btn:focus-visible,[\s\S]*?\n    \}/) || [''])[0];
const firstForced = (norm.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n    \}/) || [''])[0];
['.noct-quiz-option', '.noct-quiz-back', '.noct-quiz-next', '.noct-review-edit', '.noct-slider-track']
  .forEach((sel) => {
    ok(`${sel} joined the consolidated semantic two-ring focus rule`,
      consolidatedFocus.includes(`${sel}:focus-visible`));
    ok(`${sel} joined the anchored forced-colors focus fallback (CanvasText, no halo)`,
      firstForced.includes(`${sel}:focus-visible`));
  });
ok('the shared focus treatment itself is unchanged (3px outer ring, 2px offset, 5px halo)',
  /outline: 3px solid var\(--focus-ring-outer\);\s*outline-offset: 2px;\s*box-shadow: 0 0 0 5px var\(--focus-ring-inner\);/.test(consolidatedFocus));
ok('the forced-colors fallback itself is unchanged (CanvasText outline, halo dropped)',
  /outline-color: CanvasText;\s*box-shadow: none;/.test(firstForced));
const sliderCss = (norm.match(/\.noct-slider-track \{([^}]*)\}/) || [null, ''])[1];
ok('the firmness slider no longer removes its outline without a replacement',
  !/outline:\s*none;/.test(sliderCss) && consolidatedFocus.includes('.noct-slider-track:focus-visible'));

section('CHARACTERIZATION — controls that already cleared the 44px floor');
function cssBlock(sel) {
  const re = new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}');
  return (norm.match(re) || [null, ''])[1];
}
{
  // Option rows are sized by min-height at all three breakpoints; none was
  // ever below the floor, so none is "repaired" here — they are pinned.
  const heights = [
    ['base', cssBlock('.noct-quiz-option')],
    ['consultation', (norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, ''])[1]],
    ['sub-700', (norm.match(/@media \(max-width: 700px\)[\s\S]*?body:has\(#questionScreen\.active\) \.noct-quiz-option \{([^}]*)\}/) || [null, ''])[1]]
  ].map(([where, css]) => [where, parseFloat((css.match(/min-height:\s*([\d.]+)px;/) || [])[1] ?? 'NaN')]);
  ok('the option row clears 44px at every breakpoint',
    heights.every(([, h]) => h >= 44), heights.map(([w, h]) => `${w}=${h}px`).join(' '));
  // Next has no min-height: its box is padding + one serif line. Line-height
  // is unset, so ~1.2em is the conservative floor used here.
  const nextBoxes = [
    ['base', cssBlock('.noct-quiz-next')],
    ['consultation', (norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-next,[\s\S]*?\{([^}]*)\}/) || [null, ''])[1]],
    ['sub-700', (norm.match(/@media \(max-width: 700px\)[\s\S]*?\.noct-quiz-next,[\s\S]*?\{([^}]*)\}/) || [null, ''])[1]]
  ].map(([where, css]) => {
    const pad = parseFloat((css.match(/padding:\s*([\d.]+)px/) || [])[1] ?? '0');
    const fs = parseFloat((css.match(/font-size:\s*([\d.]+)px/) || [])[1] ?? '17');
    return [where, 2 * pad + fs * 1.2];
  });
  ok('Next clears 44px at every breakpoint from padding + line box alone',
    nextBoxes.every(([, h]) => h >= 44), nextBoxes.map(([w, h]) => `${w}≈${h.toFixed(1)}px`).join(' '));
}

section('REPAIR 5 — 44x44 CSS-px interaction floors (Back, Review Edit, slider band)');
[['.noct-quiz-back', 'Back'], ['.noct-review-edit', 'Review Edit']].forEach(([sel, label]) => {
  ok(`${label} carries an explicit 44px minimum height`,
    /min-height: 44px;/.test(cssBlock(sel)), sel);
});
ok('Back and Review Edit center their label inside the enlarged box',
  /display: inline-flex;/.test(cssBlock('.noct-quiz-back'))
  && /align-items: center;/.test(cssBlock('.noct-quiz-back'))
  && /display: inline-flex;/.test(cssBlock('.noct-review-edit'))
  && /align-items: center;/.test(cssBlock('.noct-review-edit')));
{
  // The slider band is the input's border box: content height + vertical
  // padding. The PAINTED line stays thin (background clipped to the content
  // box) and the thumb stays 20px — the band is transparent.
  const h = parseFloat((sliderCss.match(/height:\s*([\d.]+)px;/) || [])[1] ?? 'NaN');
  const pad = parseFloat((sliderCss.match(/padding:\s*([\d.]+)px 0;/) || [])[1] ?? 'NaN');
  const band = h + 2 * pad;
  // The global reset is `* { box-sizing: border-box }`. Without an explicit
  // opt-out the padding would eat the content box, the painted line would
  // collapse to 0px and vanish — while this arithmetic still read 44px. So
  // the opt-out is asserted BEFORE the band, not as a style preference.
  ok('the slider opts out of the global border-box reset, so the band arithmetic below is real',
    /box-sizing: content-box;/.test(sliderCss));
  ok('the firmness slider interaction band reaches 44 CSS px', band >= 44,
    `height ${h}px + 2 × ${pad}px padding = ${band}px`);
  ok('the painted track line stays thin (background clipped to the content box)',
    /background-clip: content-box;/.test(sliderCss) && h <= 2,
    `painted line ${h}px`);
  ok('the enlarged band is absorbed by negative margins so layout does not shift',
    /margin:\s*-?[\d.]+px 0 -?[\d.]+px;/.test(sliderCss) || /margin:\s*-[\d.]+px/.test(sliderCss));
  ok('the slider carries touch-action: manipulation (CLAUDE.md interactive-element rule)',
    /touch-action: manipulation;/.test(sliderCss));
  const thumbW = (norm.match(/\.noct-slider-track::-webkit-slider-thumb \{([^}]*)\}/) || [null, ''])[1];
  const thumbM = (norm.match(/\.noct-slider-track::-moz-range-thumb \{([^}]*)\}/) || [null, ''])[1];
  ok('the PAINTED thumb is unchanged at 20px in both engines',
    /width: 20px;\s*height: 20px;/.test(thumbW) && /width: 20px;\s*height: 20px;/.test(thumbM));
}
{
  const q = QUIZ.questions[QID('firmness')];
  const env = makeQuizEnv({ at: QID('firmness'), answers: {} });
  env.api.render();
  const markup = env.get('questionContainer').innerHTML;
  ok('enlarging the band changed no slider value, stop, default or handler',
    markup.includes(`min="${q.min}"`) && markup.includes(`max="${q.max}"`)
    && markup.includes(`value="${q.defaultValue}"`)
    && /addEventListener\('input'/.test(src.render)
    && !/ontouchstart|ontouchmove|touchstart/.test(src.render));
}

section('REPAIR 6 — keyboard-only focus restoration across the rerender');
ok('the restoration uses no timer, rAF or deferred frame',
  !/setTimeout|requestAnimationFrame|sessionFrame|setInterval/.test(src.select));
ok('the restoration uses the established focus({preventScroll:true}) try/catch idiom',
  /focus\(\{ preventScroll: true \}\)/.test(src.select) && /try \{/.test(src.select) && /catch/.test(src.select));
ok('options carry stable ids derived from question id + option id',
  src.render.includes('id="qopt-${q.id}-${opt.id}"'));
{
  const q = QUIZ.questions[QID('body_type')];
  const env = makeQuizEnv({ at: QID('body_type'), answers: {} });
  env.api.render();
  const ids = optionsOf(env.get('questionContainer').innerHTML).map((o) => o.id);
  ok('every rendered option has a unique, derivable id',
    ids.length === 5 && ids.every((id, i) => id === `qopt-body_type-${q.options[i].id}`)
    && new Set(ids).size === ids.length, ids.join(','));

  // KEYBOARD: the activated option holds focus and matches :focus-visible.
  const target = env.get(`qopt-body_type-${q.options[1].id}`);
  target._focusVisible = true;
  env.doc.activeElement = target;
  target.classList.add('noct-quiz-option');
  env.api.select('body_type', q.options[1].id, false);
  const replacement = env.get(`qopt-body_type-${q.options[1].id}`);
  ok('keyboard activation: focus lands on the REPLACEMENT option, synchronously',
    replacement !== target && replacement._focusCount === 1, `focus calls: ${replacement._focusCount}`);
  ok('keyboard activation: focus is restored with preventScroll (no scroll jump)',
    !!replacement._focusOpts && replacement._focusOpts.preventScroll === true);
  ok('keyboard activation: no other option receives focus',
    optionsOf(env.get('questionContainer').innerHTML)
      .filter((o) => env.get(o.id)._focusCount > 0).length === 1);
}
{
  // TOUCH/POINTER: ontouchend calls preventDefault, so the button never takes
  // focus; a mouse click focuses it but never matches :focus-visible. Both are
  // modeled here — neither may invoke the restoration path.
  const q = QUIZ.questions[QID('temperature')];
  const touch = makeQuizEnv({ at: QID('temperature'), answers: {} });
  touch.api.render();
  touch.doc.activeElement = null; // preventDefault() on touchend: focus stays off the control
  touch.api.select('temperature', q.options[0].id, false);
  ok('touch activation: nothing is focused (activeElement never became the option)',
    touch.get(`qopt-temperature-${q.options[0].id}`)._focusCount === 0);

  const mouse = makeQuizEnv({ at: QID('temperature'), answers: {} });
  mouse.api.render();
  const clicked = mouse.get(`qopt-temperature-${q.options[1].id}`);
  clicked.classList.add('noct-quiz-option');
  clicked._focusVisible = false; // a mouse click focuses but is NOT :focus-visible
  mouse.doc.activeElement = clicked;
  mouse.api.select('temperature', q.options[1].id, false);
  ok('pointer activation: the replacement option is NOT focused (restoration is keyboard-only)',
    mouse.get(`qopt-temperature-${q.options[1].id}`)._focusCount === 0);
  ok('pointer activation still stores the answer and rerenders normally',
    mouse.api.answers().temperature === q.options[1].id
    && optionsOf(mouse.get('questionContainer').innerHTML).filter((o) => o.selected).length === 1);
}
{
  // Multi-select keyboard restoration: the toggled option keeps focus so a
  // keyboard user can pick a second and third answer without re-tabbing.
  const q = QUIZ.questions[QID('health_conditions')];
  const env = makeQuizEnv({ lang: 'es', at: QID('health_conditions'), answers: {} });
  env.api.render();
  const target = env.get(`qopt-health_conditions-${q.options[2].id}`);
  target.classList.add('noct-quiz-option');
  target._focusVisible = true;
  env.doc.activeElement = target;
  env.api.select('health_conditions', q.options[2].id, true);
  ok('multi-select keyboard activation restores focus to the same option (Spanish path)',
    env.get(`qopt-health_conditions-${q.options[2].id}`)._focusCount === 1);
}

section('REPAIR 7 — the option grid never exceeds two columns');
{
  const env = makeQuizEnv({});
  const map = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `${n}:${env.api.cols(n)}`);
  ok('1–3 options render one column', [1, 2, 3].every((n) => env.api.cols(n) === 'cols-1'), map.join(' '));
  ok('4–8 options render two columns', [4, 5, 6, 7, 8].every((n) => env.api.cols(n) === 'cols-2'), map.join(' '));
  ok('cols-3 is never emitted for any live cardinality',
    ![1, 2, 3, 4, 5, 6, 7, 8].some((n) => env.api.cols(n) === 'cols-3'));
}
{
  const emitted = [];
  for (const q of QUIZ.questions) {
    if (!q.options) continue;
    const env = makeQuizEnv({ at: QID(q.id), answers: { partner_sleep: 'partner' } });
    env.api.render();
    emitted.push(`${q.id}=${colClassOf(env.get('questionContainer').innerHTML)}`);
  }
  ok('no live question emits cols-3 (7- and 8-option questions included)',
    !emitted.some((e) => e.endsWith('cols-3')), emitted.join(' '));
  ok('the 8-option and 7-option questions render two columns',
    emitted.includes('sleep_issues=cols-2') && emitted.includes('health_conditions=cols-2'));
  ok('the 3-option question renders one column', emitted.includes('partner_sleep=cols-1'));
}
ok('the sub-700px one-column responsive behavior is preserved',
  /@media \(max-width: 700px\)[\s\S]*?body:has\(#questionScreen\.active\) \.noct-quiz-options\.cols-2[\s\S]*?grid-template-columns: 1fr;/.test(norm));
ok('the option grid does not scroll internally and never clips a choice',
  !/\.noct-quiz-options[^{]*\{[^}]*overflow[^}]*(scroll|hidden|auto)/.test(norm));

section('REPAIR 8 — hover decoration cannot stick, and never impersonates selection');
{
  const hoverCss = (norm.match(/body:has\(#questionScreen\.active\) \.noct-quiz-option:hover \{([^}]*)\}/) || [null, ''])[1];
  ok('hover holds the selected rail transparent, so a hovered option never reads as chosen',
    /border-left-color:\s*transparent;/.test(hoverCss));
  const hoverIdx = norm.indexOf('body:has(#questionScreen.active) .noct-quiz-option:hover');
  const selIdx = norm.indexOf('body:has(#questionScreen.active) .noct-quiz-option.selected {');
  ok('the equally specific .selected rule comes AFTER hover, so a hovered selected option keeps its ink rail',
    hoverIdx > -1 && selIdx > hoverIdx);
}
[
  'body:has\\(#questionScreen\\.active\\) \\.noct-quiz-option:hover',
  '\\.noct-quiz-back:hover',
  '\\.noct-review-edit:hover'
].forEach((sel) => {
  const idx = norm.search(new RegExp(sel));
  const before = norm.slice(Math.max(0, idx - 600), idx);
  ok(`hover styling for ${sel.replace(/\\\\/g, '')} is gated behind @media (hover: hover)`,
    idx > -1 && /@media \(hover: hover\)/.test(before)
    && before.lastIndexOf('@media (hover: hover)') > before.lastIndexOf('\n    }\n'));
});

// ---------------------------------------------------- negative controls
// Each control proves the assertion above it actually bites.
section('negative controls — the load-bearing assertions fail on a broken tree');
{
  const env = makeQuizEnv({
    at: QID('sleep_position'), answers: {},
    mutate: (s) => s.replace(/aria-pressed="\$\{isSel \? 'true' : 'false'\}"/, '')
  });
  env.api.render();
  ok('control: stripping aria-pressed is detected',
    optionsOf(env.get('questionContainer').innerHTML).every((o) => o.pressed === null));
}
{
  const env = makeQuizEnv({
    at: QID('sleep_position'), answers: {},
    mutate: (s) => s.replace("if (n <= 3) return 'cols-1';", "if (n <= 3) return 'cols-1'; if (n > 6) return 'cols-3';")
  });
  ok('control: a restored cols-3 branch is detected', env.api.cols(8) === 'cols-3');
}
{
  const env = makeQuizEnv({
    at: QID('body_type'), answers: {},
    mutate: (s) => s.replace(/if \(restoreId\)/, 'if (false)')
  });
  env.api.render();
  const q = QUIZ.questions[QID('body_type')];
  const target = env.get(`qopt-body_type-${q.options[0].id}`);
  target.classList.add('noct-quiz-option');
  target._focusVisible = true;
  env.doc.activeElement = target;
  env.api.select('body_type', q.options[0].id, false);
  ok('control: a dropped keyboard focus restore is detected',
    env.get(`qopt-body_type-${q.options[0].id}`)._focusCount === 0);
}
{
  const env = makeQuizEnv({
    at: QID('temperature'), answers: {},
    mutate: (s) => s.replace(/&& active\.matches\(':focus-visible'\)/, '')
  });
  env.api.render();
  const q = QUIZ.questions[QID('temperature')];
  const clicked = env.get(`qopt-temperature-${q.options[0].id}`);
  clicked.classList.add('noct-quiz-option');
  clicked._focusVisible = false;
  env.doc.activeElement = clicked;
  env.api.select('temperature', q.options[0].id, false);
  ok('control: dropping the :focus-visible guard is detected (pointer would steal focus)',
    env.get(`qopt-temperature-${q.options[0].id}`)._focusCount === 1);
}
{
  const env = makeQuizEnv({
    at: QID('sleep_issues'), answers: {},
    mutate: (s) => s.replace('if (answers[qId].length >= 3) return;', '')
  });
  env.api.render();
  const q = QUIZ.questions[QID('sleep_issues')];
  q.options.filter((o) => o.id !== 'none').slice(0, 5).forEach((o) => env.api.select('sleep_issues', o.id, true));
  ok('control: removing the 3-selection cap is detected', env.api.answers().sleep_issues.length > 3);
}
{
  const env = makeQuizEnv({
    at: QID('sleep_issues'), answers: {},
    mutate: (s) => s.replace("if (optId === 'none') {", 'if (false) {')
  });
  env.api.render();
  const q = QUIZ.questions[QID('sleep_issues')];
  env.api.select('sleep_issues', q.options[0].id, true);
  env.api.select('sleep_issues', 'none', true);
  ok('control: removing "None" exclusivity is detected', env.api.answers().sleep_issues.length === 2);
}
{
  const env = makeQuizEnv({
    at: QID('sleep_position'), answers: { partner_sleep: 'partner' },
    mutate: (s) => s.replace('${displayOptions.map(opt => {', '${displayOptions.slice().reverse().map(opt => {')
  });
  env.api.render();
  ok('control: reversing displayed option order is detected',
    optionsOf(env.get('questionContainer').innerHTML)[0].optId
      === QUIZ.questions[QID('sleep_position')].options[4].id);
}
{
  const env = makeQuizEnv({
    at: QID('body_type'), answers: { partner_sleep: 'solo' },
    mutate: (s) => s.replace('!opt.hideIf || answers[opt.hideIf.question] !== opt.hideIf.answer', 'true')
  });
  env.api.render();
  const before = makeQuizEnv({ at: QID('body_type'), answers: { partner_sleep: 'solo' } });
  before.api.render();
  ok('control: neutralizing hideIf is detected',
    optionsOf(env.get('questionContainer').innerHTML).length
      > optionsOf(before.get('questionContainer').innerHTML).length
    || QUIZ.questions.every((q) => !(q.options || []).some((o) => o.hideIf)));
}
{
  const env = makeQuizEnv({
    at: QID('trigger'), answers: {},
    mutate: (s) => s.replace('      renderQuestion();\n      if (restoreId) {',
      '      renderQuestion();\n      window.nextQuestion();\n      if (restoreId) {')
  });
  env.api.render();
  env.api.select('trigger', QUIZ.questions[QID('trigger')].options[0].id, false);
  ok('control: an auto-advance injected into selectOption is detected', env.api.at() !== QID('trigger'));
}
{
  const env = makeQuizEnv({
    at: QID('partner_sleep'), answers: {},
    mutate: (s) => s.replace("answers[q.id] = 'not_applicable';", '')
  });
  env.api.render();
  env.api.select('partner_sleep', 'solo', false);
  env.api.next();
  ok('control: breaking the solo not_applicable stamp is detected',
    env.api.answers().partner_disturbance !== 'not_applicable');
}
{
  const env = makeQuizEnv({
    at: QID('trigger'), answers: {},
    mutate: (s) => s.replace('id="qopt-${q.id}-${opt.id}"', '')
  });
  env.api.render();
  ok('control: removing the stable option ids is detected',
    optionsOf(env.get('questionContainer').innerHTML).every((o) => o.id === null));
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
