// sleep_system_presentation_check.mjs — item 1.4, the Sleep System presentation.
//
// WHAT THIS ITEM CHANGED, AND WHAT IT DELIBERATELY DID NOT. The inherited
// Sleep System entered at `db46d4b` already implementing the four-step model
// (adjustability, support, pillow, protection) with a step rail, a plan
// summary, per-step guides and honest keep-current / decide-later states. Most
// of item 1.4's roadmap requirements were ALREADY MET by that inherited code.
// This item audited the real rendered output and made three presentation-only
// repairs where it genuinely failed:
//
//   R1  The primary card rendered the product DISTINCTION (`description`)
//       above the customer BENEFIT (`reasons[0]` / the protection-goal
//       reason) on all four steps in both languages — the exact inverse of
//       "customer benefit first, product distinction second". The two nodes
//       are swapped; the benefit block also stops being SMALLER (12px) than
//       the distinction beneath it (13px).
//   R2  The customer-benefit sentence was rendered a SECOND time, verbatim, at
//       the top of the salesperson guidance panel on adjustability, support
//       and pillow — and, through `notices.slice(0, 3)`, displaced each of
//       those steps' third real procedure note. The duplicate is removed and
//       the displaced note returns. No copy was authored: every surviving
//       string already shipped.
//   R3  `#sleepSystemGuidance` is a <section> with NO accessible name, so the
//       procedure panel was separate visually but was not exposed as a region
//       at all. It is now named from the eyebrow it already renders, re-set on
//       every render so a language switch relabels it.
//   R4  CLOSE-OUT (owner ruling 2026-08-25). Three CSS-only repairs — the
//       <=680px step rail wraps 2x2 instead of scrolling sideways with its
//       labels clipped, the procedure notes rise from 11px to the 15px floor,
//       the chip status rises from 10px to 12px and may wrap — and one copy
//       repair: the procedure panel addresses the SALESPERSON on all four
//       steps under a single "Specialist notes" eyebrow, with three headings
//       and eleven notes reworded out of customer voice (owner-approved EN;
//       ES provisional). Nothing the customer reads changed. Guards 13-14 pin
//       the close-out; guard 15 proves every pin bites.
//
// Everything else this suite asserts is INHERITED behaviour that already
// satisfied the requirement and is pinned here so it cannot regress — that is
// the item's implementation rule: preserve what works, protect it with tests.
//
// House style: EXTRACT the real renderers and state helpers from index.html by
// exact brace balancing and EXECUTE them against a DOM shim, driven by the
// REAL data/accessories.json and the REAL data/store-config.json financing
// block. This suite writes nothing; exit 0 = pass.
//
// Guards, in order:
//   1.  extraction (abort hard if any source is missing)
//   2.  the governed four-step order and its single definition
//   3.  benefit-first / distinction-second, all four steps, EN and ES
//   4.  the procedure region: separately labelled, and never a duplicate of
//       the customer-benefit block
//   5.  primary and alternative products stay distinguishable
//   6.  selected / keep-current / skipped / undecided render honestly
//   7.  empty data fails closed and cannot reach the mattress results
//   8.  prices are the catalog's, and there is exactly ONE price surface
//   9.  language switching preserves state and mixes no languages
//  10.  button semantics, the 44px floor and the handler pair
//  11.  financing stays config-disabled on this surface for Lacks
//  12.  item 1.3's contained outputs cannot return through this surface
//  13.  close-out CSS: rail 2x2 without a scroller, no breakpoint added,
//       15px notes, 12px wrapping statuses, name > status, the chip floor
//  14.  close-out copy: one eyebrow, approved headings, every approved note
//       in the state that selects it, retired customer-voice strings gone,
//       no second-person address, customer copy byte-identical to da4f746
//  15.  negative controls proving the load-bearing assertions bite
//
// Run: node tests/sleep_system_presentation_check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const ACCESSORIES_JSON = JSON.parse(readFileSync(join(root, 'data', 'accessories.json'), 'utf8'));
const STORE_CONFIG = JSON.parse(readFileSync(join(root, 'data', 'store-config.json'), 'utf8'));

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

// Exact brace-balanced extraction from the anchor's first `{`.
function extractFunction(anchor) {
  const start = html.indexOf(anchor);
  if (start === -1) return null;
  let i = html.indexOf('{', start);
  let depth = 1;
  i++;
  while (i < html.length && depth > 0) {
    const ch = html[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return html.slice(start, i) + ';';
}
// Same, for the bracket-delimited step table.
function extractArray(anchor) {
  const start = html.indexOf(anchor);
  if (start === -1) return null;
  let i = html.indexOf('[', start);
  let depth = 1;
  i++;
  while (i < html.length && depth > 0) {
    const ch = html[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    i++;
  }
  return html.slice(start, i) + ';';
}
// Live code only — comments are documentation, not behaviour. Used wherever an
// assertion must be about what the tree DOES, not what it explains.
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
// LIVE SOURCE, the same definition results_presentation_check uses for its
// containment gate: index.html with HTML comments and full-line JS comments
// removed, so a literal is judged on code that can execute or render. Both the
// 1.3 containment record and the 1.4 close-out comments QUOTE retired literals
// in comments — documentation, not output.
const liveHtml = html
  .replace(/\r\n/g, '\n')
  .replace(/<!--[\s\S]*?-->/g, '')
  .split('\n')
  .filter((l) => !/^\s*\/\//.test(l))
  .join('\n');

// -------------------------------------------------------------- 1. extraction
section('extraction — the real production sources');
const SRC = {
  STEPS: extractArray('const SLEEP_SYSTEM_STEPS ='),
  escapeHtml: extractFunction('function escapeHtml(str)'),
  text: extractFunction('function sleepSystemText(value)'),
  category: extractFunction('function sleepSystemCategory(item)'),
  stepFor: extractFunction('function sleepSystemStepForItem(item)'),
  qualify: extractFunction('function qualifyRankedChoices(sorted, scoreForItem)'),
  scorer: extractFunction('function scoreAccessoriesFromAnswers()'),
  readGroups: extractFunction('function readSleepSystemGroups()'),
  decision: extractFunction('function sleepSystemDecision(stepId)'),
  decisionLabel: extractFunction('function sleepSystemDecisionLabel(stepId, decision)'),
  posLabel: extractFunction('function adjustabilityPositionLabel(positionId)'),
  getDemo: extractFunction('function getAdjustabilityDemo()'),
  renderDemo: extractFunction('function renderAdjustabilityDemo()'),
  guidance: extractFunction('function sleepSystemGuidance(stepId, primary)'),
  rail: extractFunction('function renderSleepSystemRail()'),
  secondary: extractFunction('function sleepSystemSecondaryActions(stepId)'),
  supportGuide: extractFunction('function renderSupportGuide()'),
  pillowFit: extractFunction('function renderPillowFit(primary)'),
  suggestedGoal: extractFunction('function getSuggestedProtectionGoal()'),
  goalLabel: extractFunction('function protectionGoalLabel(goal)'),
  goalReason: extractFunction('function protectionGoalReason(goal)'),
  supportsGoal: extractFunction('function protectorSupportsGoal(item, goal)'),
  protectionGuide: extractFunction('function renderProtectionGuide()'),
  main: extractFunction('function renderSleepSystemMain(viewModel)'),
  plan: extractFunction('function renderSleepSystemPlan()'),
  footer: extractFunction('function renderSleepSystemFooter()')
};
const missing = Object.entries(SRC).filter(([, v]) => !v).map(([k]) => k);
ok('every Sleep System source extracted from index.html', missing.length === 0,
  missing.length ? 'missing: ' + missing.join(', ') : `${Object.keys(SRC).length} sources`);
if (missing.length) { console.log('FAIL — sources missing; aborting'); process.exit(1); }

// ------------------------------------------------------------- DOM harness
function makeEl(id) {
  const el = {
    id, attrs: {}, textContent: '', _html: '', disabled: false, hidden: false, style: {},
    dataset: {},
    setAttribute(k, v) { el.attrs[k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el.attrs, k) ? el.attrs[k] : null; },
    removeAttribute(k) { delete el.attrs[k]; },
    focus() { el._focusCount = (el._focusCount || 0) + 1; }
  };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}

// A live environment around the REAL extracted sources. Collaborators outside
// this surface are injected as sentinels so a leak is visible rather than
// silently plausible.
function makeEnv({
  lang = 'en',
  answers = {},
  cart = {},
  state = {},
  accessories = ACCESSORIES_JSON,
  finSurfaces = null,
  finEnabled = true,
  mutate = null
} = {}) {
  const els = new Map();
  const doc = {
    getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
    querySelector(sel) { if (!els.has(sel)) els.set(sel, makeEl(sel)); return els.get(sel); }
  };
  const surfaces = finSurfaces || (STORE_CONFIG.financing && STORE_CONFIG.financing.surfaces) || {};
  const win = {
    _accCart: cart,
    _sleepSystemState: Object.assign({
      activeStep: 'adjustability', decisions: {}, demoPosition: '', supportChoice: '',
      pillowCandidateId: '', pillowReaction: '', pillowFeedback: '', protectionGoal: ''
    }, state)
  };
  const analytics = { logged: [], log(e, d) { this.logged.push({ e, d }); } };
  let src = [
    SRC.STEPS, SRC.escapeHtml, SRC.text, SRC.category, SRC.stepFor, SRC.qualify, SRC.scorer,
    SRC.readGroups, SRC.decision, SRC.decisionLabel, SRC.posLabel, SRC.getDemo, SRC.renderDemo,
    SRC.guidance, SRC.rail, SRC.secondary, SRC.supportGuide, SRC.pillowFit, SRC.suggestedGoal,
    SRC.goalLabel, SRC.goalReason, SRC.supportsGoal, SRC.protectionGuide, SRC.main, SRC.plan,
    SRC.footer
  ].join('\n');
  if (mutate) src = mutate(src);
  const api = new Function(
    'document', 'window', 'currentLang', 'answers', 'ACCESSORIES', 'analytics',
    'financingEnabled', 'finSurfaceEnabled', 'FC',
    src + `
    return {
      groups: readSleepSystemGroups,
      main: renderSleepSystemMain,
      rail: renderSleepSystemRail,
      plan: renderSleepSystemPlan,
      footer: renderSleepSystemFooter,
      guidance: sleepSystemGuidance,
      decision: sleepSystemDecision,
      decisionLabel: sleepSystemDecisionLabel,
      STEPS: SLEEP_SYSTEM_STEPS
    };`
  )(
    doc, win, lang, answers, accessories, analytics,
    () => finEnabled,
    (n) => surfaces[n] !== false,
    (k) => 'FINANCING-COPY-SENTINEL:' + k
  );
  return { api, win, doc, analytics, get: (id) => doc.getElementById(id) };
}

// Render one step and hand back the two regions plus parsed pieces.
function renderStep(step, opts = {}) {
  const env = makeEnv(Object.assign({}, opts, {
    state: Object.assign({ activeStep: step }, opts.state || {})
  }));
  const groups = env.api.groups();
  env.api.main({ groups, finalist: null });
  env.api.rail();
  env.api.plan();
  const main = env.get('sleepSystemMain').innerHTML;
  const guidanceEl = env.get('sleepSystemGuidance');
  return {
    env, groups, main,
    guidance: guidanceEl.innerHTML,
    guidanceLabel: guidanceEl.getAttribute('aria-label'),
    rail: env.get('sleepSystemRail').innerHTML,
    plan: env.get('sleepSystemPlanList').innerHTML,
    planCount: env.get('sleepSystemPlanCount').textContent
  };
}

const STEP_IDS = ['adjustability', 'support', 'pillow', 'protection'];
// A customer whose answers fire an answer-specific reason on every step, so the
// benefit line is genuinely populated rather than the neutral fallback.
const ANSWERS = {
  sleep_position: 'side', temperature: 'hot', sleep_issues: ['back_pain'],
  health_conditions: ['snoring'], budget: 'premium'
};
const textOf = (h) => String(h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const nodeAt = (body, cls) => body.indexOf(`class="${cls}"`);
const notesOf = (g) => [...g.matchAll(/<span>([^<]*)<\/span><\/div>/g)].map((m) => m[1]);
const featuredBody = (main) => {
  const m = main.match(/<div class="sleep-system__featured-body">([\s\S]*?)<div class="sleep-system__actions">/);
  return m ? m[1] : null;
};
const grab = (body, cls) => {
  const m = body.match(new RegExp(`class="${cls}"[^>]*>([^<]*)`));
  return m ? m[1] : null;
};

// ------------------------------------------------ 2. the governed step order
section('step model — four steps, governed order, defined once');
{
  const env = makeEnv({ answers: ANSWERS });
  const ids = env.api.STEPS.map((s) => s.id);
  ok('exactly four steps', ids.length === 4, ids.join(','));
  ok('order is adjustability -> support -> pillow -> protection',
    ids.join(',') === STEP_IDS.join(','), ids.join(','));
  ok('every step carries EN and ES label, title, copy and guidance title',
    env.api.STEPS.every((s) =>
      s.label.en && s.label.es && s.title.en && s.title.es &&
      s.copy.en && s.copy.es && s.guidanceTitle.en && s.guidanceTitle.es));
  ok('SLEEP_SYSTEM_STEPS is declared exactly once (single source of the order)',
    (html.match(/const SLEEP_SYSTEM_STEPS\s*=/g) || []).length === 1);
  // The rail, plan and footer must all walk the SAME table rather than
  // re-listing the order — that is what makes the order un-forkable.
  ok('rail, plan and footer all iterate SLEEP_SYSTEM_STEPS',
    /SLEEP_SYSTEM_STEPS\.map/.test(stripComments(SRC.rail)) &&
    /SLEEP_SYSTEM_STEPS\.map/.test(stripComments(SRC.plan)) &&
    /SLEEP_SYSTEM_STEPS\[activeIndex \+ 1\]/.test(stripComments(SRC.footer)));
}
{
  const r = renderStep('adjustability', { answers: ANSWERS });
  const railNames = [...r.rail.matchAll(/step-name">([^<]*)</g)].map((m) => m[1]);
  ok('rail renders the four steps in governed order (EN)',
    railNames.join(',') === 'Adjustability,Support,Pillow,Protection', railNames.join(','));
  const planNames = [...r.plan.matchAll(/plan-item-name">([^<]*)</g)].map((m) => m[1]);
  ok('plan summary lists the same four steps in the same order',
    planNames.join(',') === railNames.join(','), planNames.join(','));
  const es = renderStep('adjustability', { answers: ANSWERS, lang: 'es' });
  const esNames = [...es.rail.matchAll(/step-name">([^<]*)</g)].map((m) => m[1]);
  ok('rail order is identical in ES (translation does not reorder)',
    esNames.join(',') === 'Ajustabilidad,Soporte,Almohada,Protección', esNames.join(','));
}

// ------------------------------- 3. benefit first, product distinction second
section('card hierarchy — customer benefit first, product distinction second');
for (const lang of ['en', 'es']) {
  for (const step of STEP_IDS) {
    const r = renderStep(step, { answers: ANSWERS, lang });
    const body = featuredBody(r.main);
    if (!body) { ok(`[${lang}/${step}] featured body renders`, false); continue; }
    const iName = nodeAt(body, 'sleep-system__featured-name');
    const iReason = nodeAt(body, 'sleep-system__featured-reason');
    const iDesc = nodeAt(body, 'sleep-system__featured-description');
    ok(`[${lang}/${step}] benefit block precedes the product description`,
      iReason > -1 && iDesc > -1 && iReason < iDesc,
      `reason@${iReason} desc@${iDesc}`);
    ok(`[${lang}/${step}] the product name still leads the block`,
      iName > -1 && iName < iReason);
    ok(`[${lang}/${step}] the benefit line is non-empty`,
      (grab(body, 'sleep-system__featured-reason') || '').trim().length > 0);
    ok(`[${lang}/${step}] the product distinction is non-empty and different from the benefit`,
      (grab(body, 'sleep-system__featured-description') || '').trim().length > 0 &&
      grab(body, 'sleep-system__featured-description') !== grab(body, 'sleep-system__featured-reason'));
  }
}
{
  // Hierarchy is not only DOM order: the benefit must not be rendered SMALLER
  // than the distinction sitting under it, or "first" is defeated visually.
  const reasonCss = html.match(/\.sleep-system__featured-reason \{[\s\S]*?\}/);
  const descCss = html.match(/\.sleep-system__featured-description \{[\s\S]*?\}/);
  const size = (css) => { const m = css && css[0].match(/font:\s*\d+\s+(\d+)px/); return m ? Number(m[1]) : null; };
  ok('benefit block font-size is at least the product description\'s',
    size(reasonCss) !== null && size(descCss) !== null && size(reasonCss) >= size(descCss),
    `benefit ${size(reasonCss)}px vs distinction ${size(descCss)}px`);
  ok('benefit block keeps its accent rule and tinted ground (a distinct visual role)',
    /border-left:\s*3px solid #9A7445/.test(reasonCss[0]) && /background:\s*#F6EFE4/.test(reasonCss[0]));
}

// -------------------- 4. the salesperson procedure region: labelled, distinct
section('procedure region — separately labelled, never a duplicate of the benefit');
for (const lang of ['en', 'es']) {
  for (const step of STEP_IDS) {
    const r = renderStep(step, { answers: ANSWERS, lang });
    const body = featuredBody(r.main);
    const benefit = body ? grab(body, 'sleep-system__featured-reason') : null;
    const notes = notesOf(r.guidance);
    ok(`[${lang}/${step}] procedure region carries an accessible name`,
      typeof r.guidanceLabel === 'string' && r.guidanceLabel.trim().length > 0,
      JSON.stringify(r.guidanceLabel));
    ok(`[${lang}/${step}] the region name is the label it visibly renders`,
      r.guidance.includes(`<div class="sleep-system__plan-eyebrow">${r.guidanceLabel}</div>`));
    ok(`[${lang}/${step}] the customer benefit is NOT repeated in the procedure panel`,
      benefit !== null && !notes.includes(benefit),
      `benefit=${JSON.stringify((benefit || '').slice(0, 46))}`);
    ok(`[${lang}/${step}] procedure panel renders its full three notes`,
      notes.length === 3, `${notes.length} notes`);
    ok(`[${lang}/${step}] the notes are distinct from one another`,
      new Set(notes).size === notes.length);
    ok(`[${lang}/${step}] no procedure note is repeated inside the customer card`,
      body !== null && notes.every((n) => !textOf(body).includes(n)));
  }
}
{
  // Structural, not incidental: nothing in the procedure builder may read the
  // product at all, so the benefit sentence cannot find its way back in.
  const live = stripComments(SRC.guidance);
  ok('sleepSystemGuidance reads no product reason in live code',
    !/\breasons\b/.test(live), 'no `reasons` reference outside comments');
  ok('sleepSystemGuidance reads no product field at all (parameter retained but unused)',
    !/\bprimary\s*[.&|?]/.test(live) && !/\bprimary\b/.test(live.replace(/function sleepSystemGuidance\([^)]*\)/, '')),
    'body never dereferences `primary`');
  ok('the procedure panel is a region element distinct from the customer main region',
    /<main class="sleep-system__main" id="sleepSystemMain">/.test(html) &&
    /<section class="sleep-system__guidance" id="sleepSystemGuidance">/.test(html));
  ok('procedure notes keep their own visual role (cool ground and rule, not the benefit\'s gold)',
    /\.sleep-system__notice \{[\s\S]*?border-left:\s*3px solid #48647A[\s\S]*?\}/.test(html));
}

// --------------------------- 5. primary and alternatives stay distinguishable
section('distinguishability — primary vs alternatives, and between alternatives');
for (const lang of ['en', 'es']) {
  for (const step of ['adjustability', 'protection']) {
    const r = renderStep(step, { answers: ANSWERS, lang });
    const alts = [...r.main.matchAll(
      /alternative-name">([^<]*)<\/div><div class="sleep-system__alternative-copy">([^<]*)</g)];
    const body = featuredBody(r.main);
    const primaryName = grab(body, 'sleep-system__featured-name');
    ok(`[${lang}/${step}] alternatives render`, alts.length >= 1, `${alts.length}`);
    ok(`[${lang}/${step}] every alternative names a different product than the primary`,
      alts.every((a) => a[1] !== primaryName));
    ok(`[${lang}/${step}] alternatives are distinguishable from each other by name AND copy`,
      new Set(alts.map((a) => a[1])).size === alts.length &&
      new Set(alts.map((a) => a[2])).size === alts.length);
    ok(`[${lang}/${step}] each alternative carries its own distinguishing copy`,
      alts.every((a) => a[2].trim().length > 0));
    ok(`[${lang}/${step}] the primary is marked out by an eyebrow the alternatives do not carry`,
      (grab(body, 'sleep-system__card-eyebrow') || '').trim().length > 0 &&
      !/sleep-system__alternative[\s\S]*sleep-system__card-eyebrow/.test(r.main));
  }
}
{
  // Materially different products must not collapse into one row: the three
  // bases differ in name and description in the real catalog.
  const r = renderStep('adjustability', { answers: ANSWERS });
  const ids = r.groups.adjustability.map((i) => i.id);
  ok('all three adjustable bases survive into the rendered group',
    ids.length === 3 && new Set(ids).size === 3, ids.join(','));
  const shown = textOf(r.main);
  ok('each base is individually identifiable on screen',
    r.groups.adjustability.every((i) => shown.includes(i.name.en || i.name)));
}

// ------------------------------------------- 6. decision states render honestly
section('decision states — selected, keep-current, skipped, undecided');
{
  const r = renderStep('pillow', { answers: ANSWERS });
  ok('undecided: rail and plan both read "Not decided"',
    /step-status">Not decided</.test(r.rail) && /plan-item-status">Not decided</.test(r.plan));
  ok('undecided: plan count is 0 / 4', r.planCount === '0 / 4', r.planCount);
  ok('undecided pillow: the add control is gated behind the physical fit check',
    /sleep-system__pillow-gate/.test(r.main) && !/data-sleep-action="select-item" data-item-id="pillow-/.test(r.main));
}
{
  const r = renderStep('pillow', {
    answers: ANSWERS, state: { pillowReaction: 'aligned' }, cart: { 'pillow-flow': { id: 'pillow-flow' } }
  });
  ok('selected: the card is marked selected and offers removal, not a second add',
    /class="sleep-system__featured is-selected"/.test(r.main) &&
    /data-sleep-action="remove-item"/.test(r.main) &&
    !/data-sleep-action="select-item" data-item-id="pillow-flow"/.test(r.main));
  ok('selected: rail and plan name the chosen product, not a generic "selected"',
    /step-status">Bedgear Flow 2\.0 Performance Pillow</.test(r.rail) &&
    /plan-item-status">Bedgear Flow 2\.0 Performance Pillow</.test(r.plan));
  ok('selected: plan count advances to 1 / 4', r.planCount === '1 / 4', r.planCount);
}
{
  const r = renderStep('support', { answers: ANSWERS, state: { supportChoice: 'current' } });
  ok('keep-current: the product card is replaced by the current-setup outcome',
    /sleep-system__support-outcome/.test(r.main) && !/sleep-system__featured"/.test(r.main));
  ok('keep-current: it states plainly that no new support is being added',
    textOf(r.main).includes('No new support is being added'));
  ok('keep-current: no price is shown for a product that is not being added',
    !/sleep-system__price/.test(r.main));
}
{
  const r = renderStep('support', { answers: ANSWERS, state: { supportChoice: 'unsure' } });
  ok('unsure: renders the specialist-check outcome rather than a recommendation',
    /sleep-system__support-outcome is-check/.test(r.main) && !/sleep-system__featured"/.test(r.main));
  const rd = renderStep('support', {
    answers: ANSWERS, state: { decisions: { support: { status: 'confirm' } } }
  });
  ok('unsure: the rail reports it as a specialist check, not as a completed choice',
    /step-status">Specialist check needed</.test(rd.rail));
}
{
  const r = renderStep('adjustability', {
    answers: ANSWERS, state: { decisions: { adjustability: { status: 'later' } } }
  });
  ok('skipped: "Decide later" is reported in both the rail and the plan',
    /step-status">Decide later</.test(r.rail) && /plan-item-status">Decide later</.test(r.plan));
  ok('skipped: the step still counts as addressed (1 / 4), not as done-and-bought',
    r.planCount === '1 / 4', r.planCount);
  const es = renderStep('adjustability', {
    answers: ANSWERS, lang: 'es', state: { decisions: { adjustability: { status: 'later' } } }
  });
  ok('skipped: ES reports "Decidir después"', /step-status">Decidir después</.test(es.rail));
}
{
  const r = renderStep('adjustability', {
    answers: ANSWERS, state: { demoPosition: 'reading', decisions: { adjustability: { status: 'demo' } } }
  });
  ok('demo request: the recorded position is named, not merely "demo"',
    /step-status">Demo: Reading</.test(r.rail), textOf(r.rail).slice(0, 80));
}

// -------------------------- 7. empty data fails closed, results are untouched
section('empty data — fails closed, and never reaches the mattress results');
{
  const env = makeEnv({ answers: ANSWERS, accessories: [] });
  let threw = null;
  let groups = null;
  try { groups = env.api.groups(); } catch (e) { threw = e; }
  ok('an empty catalog raises nothing', threw === null, threw ? String(threw) : '');
  ok('every step group is empty rather than back-filled with something else',
    groups && STEP_IDS.every((s) => Array.isArray(groups[s]) && groups[s].length === 0));
  env.api.main({ groups, finalist: null });
  const main = env.get('sleepSystemMain').innerHTML;
  ok('the step renders an explicit unavailable state, not a blank panel',
    textOf(main).includes('No products available in this category'));
  ok('it offers to skip and continue rather than blocking the customer',
    textOf(main).includes('You can skip this step and continue your plan'));
  ok('no price surface is invented for a product that does not exist',
    !/sleep-system__price/.test(main));
  ok('no add/select control is offered for a non-existent product',
    !/data-sleep-action="select-item"/.test(main));
}
{
  // The screen-level gate: with no accessories the workspace is hidden and the
  // customer is routed onward. This is the "does not affect mattress results"
  // half — the Sleep System withdraws itself instead of degrading the flow.
  const gate = extractFunction('function renderSleepSystem()');
  const live = stripComments(gate);
  ok('renderSleepSystem gates the whole workspace on the catalog being non-empty',
    /var hasAccessories = Array\.isArray\(ACCESSORIES\) && ACCESSORIES\.length > 0;/.test(live));
  ok('empty state shown, workspace/rail/footer hidden, and the renderers are not run',
    /empty\.hidden = hasAccessories/.test(live) &&
    /workspace\.hidden = !hasAccessories/.test(live) &&
    /rail\.hidden = !hasAccessories/.test(live) &&
    /footer\.hidden = !hasAccessories/.test(live) &&
    /if \(!hasAccessories\) return;/.test(live));
  ok('the empty state still offers the onward review control',
    /id="sleepSystemEmptyReview" type="button" data-sleep-action="review-plan"/.test(html));
  ok('no Sleep System renderer writes tierData, savedPicks or the results state',
    [SRC.main, SRC.rail, SRC.plan, SRC.footer, SRC.readGroups, gate]
      .every((s) => !/_resultsState\s*=|tierData\s*=|_savedPicks\s*=/.test(stripComments(s))));
  ok('the Sleep System never calls the mattress scorer',
    [SRC.main, SRC.readGroups, SRC.guidance]
      .every((s) => !/scoreMattress|calculateScore|_renderResults/.test(stripComments(s))));
}

// ---------------------------------- 8. prices unchanged, one price surface only
section('prices — the catalog\'s own, exactly one surface, none added');
{
  const priceOf = (id) => {
    const a = ACCESSORIES_JSON.find((x) => x.id === id);
    return a ? Number(a.price) : null;
  };
  for (const lang of ['en', 'es']) {
    for (const step of STEP_IDS) {
      const r = renderStep(step, { answers: ANSWERS, lang });
      const body = featuredBody(r.main);
      const shown = grab(body, 'sleep-system__price');
      const primaryId = r.groups[step][0].id;
      const expected = (lang === 'es' ? 'Desde $' : 'From $') + priceOf(primaryId).toLocaleString();
      ok(`[${lang}/${step}] the displayed price is the catalog price, formatted`,
        shown === expected, `${shown} vs ${expected}`);
      ok(`[${lang}/${step}] exactly one price surface renders`,
        (r.main.match(/class="sleep-system__price"/g) || []).length === 1);
      ok(`[${lang}/${step}] alternatives carry no price of their own`,
        !/sleep-system__alternative[\s\S]*?sleep-system__price/.test(r.main));
      ok(`[${lang}/${step}] the procedure panel carries no price`,
        !/\$/.test(textOf(r.guidance)));
    }
  }
}
{
  // No NEW price surface: the only price-bearing class on this screen is the
  // one that already shipped, and no total/subtotal/monthly figure is composed.
  const all = [SRC.main, SRC.rail, SRC.plan, SRC.footer, SRC.guidance, SRC.supportGuide,
    SRC.pillowFit, SRC.protectionGuide, SRC.renderDemo].map(stripComments).join('\n');
  ok('no second price class is rendered anywhere on this surface',
    (all.match(/sleep-system__price/g) || []).length === 1);
  ok('no subtotal, total or monthly figure is computed on this surface',
    !/subtotal|Subtotal|\btotal\b|perMonth|per_month|monthly/.test(all));
  ok('no price arithmetic across the cart is performed here',
    !/reduce\([^)]*price|\+\s*price\b|price\s*\*/.test(all));
  ok('the price line reads only the item\'s own catalog price',
    /Number\(primary\.price\)/.test(stripComments(SRC.main)));
}

// --------------------- 9. language switching preserves state, mixes no copy
section('language — state survives the swap and the two languages never mix');
{
  const shared = {
    activeStep: 'pillow', pillowReaction: 'aligned', pillowFeedback: 'aligned',
    supportChoice: 'standard', demoPosition: 'reading', protectionGoal: 'spills',
    decisions: { adjustability: { status: 'later' } }
  };
  const cart = { 'pillow-flow': { id: 'pillow-flow' } };
  const en = makeEnv({ answers: ANSWERS, lang: 'en', state: shared, cart });
  const before = JSON.parse(JSON.stringify(en.win._sleepSystemState));
  en.api.main({ groups: en.api.groups(), finalist: null });
  const es = makeEnv({ answers: ANSWERS, lang: 'es', state: shared, cart });
  es.api.main({ groups: es.api.groups(), finalist: null });
  const after = JSON.parse(JSON.stringify(es.win._sleepSystemState));
  ok('every state field is byte-identical across the language swap',
    JSON.stringify(before) === JSON.stringify(after));
  ok('the selected product survives the swap',
    Object.keys(es.win._accCart).join(',') === 'pillow-flow');
  ok('a render in either language mutates no decision',
    JSON.stringify(after.decisions) === JSON.stringify(shared.decisions));
}
{
  // Curated chrome markers. Product names are catalog data and are checked by
  // the price/hierarchy guards; these are the strings the RENDERER chooses.
  const EN_MARKERS = ['Recommended to try', 'Worth comparing', 'Support option', 'Also compare',
    'Decide later', 'Specialist notes', 'During the trial', 'Keep current pillow',
    'Already protected', 'From $', 'Not decided', 'Add to plan', 'Add protector to plan'];
  const ES_MARKERS = ['Recomendado para probar', 'Vale la pena comparar', 'Opción de soporte',
    'También compara', 'Decidir después', 'Notas del especialista', 'Durante la prueba',
    'Conservar almohada actual', 'Ya está protegido', 'Desde $', 'Sin decidir',
    'Agregar al plan', 'Agregar protector al plan'];
  for (const step of STEP_IDS) {
    const en = renderStep(step, { answers: ANSWERS, lang: 'en' });
    const es = renderStep(step, { answers: ANSWERS, lang: 'es' });
    const enAll = textOf(en.main) + ' ' + textOf(en.guidance) + ' ' + textOf(en.rail) + ' ' + textOf(en.plan);
    const esAll = textOf(es.main) + ' ' + textOf(es.guidance) + ' ' + textOf(es.rail) + ' ' + textOf(es.plan);
    const leakedEs = ES_MARKERS.filter((m) => enAll.includes(m));
    const leakedEn = EN_MARKERS.filter((m) => esAll.includes(m));
    ok(`[${step}] the EN render contains no Spanish chrome`, leakedEs.length === 0, leakedEs.join(' | '));
    ok(`[${step}] the ES render contains no English chrome`, leakedEn.length === 0, leakedEn.join(' | '));
    // Close-out: ONE eyebrow on every step, so the ES name is exact rather
    // than one of two (the former "Durante la prueba" alternative is retired).
    ok(`[${step}] the ES procedure region name is exactly "Notas del especialista"`,
      es.guidanceLabel === 'Notas del especialista', es.guidanceLabel);
  }
}
{
  // Every rendered pair on this surface is a real bilingual object, so a
  // language switch cannot strand an English string in a Spanish session.
  const pairs = [...stripComments(SRC.main + SRC.guidance + SRC.supportGuide + SRC.pillowFit +
    SRC.protectionGuide + SRC.renderDemo + SRC.secondary + SRC.decisionLabel)
    .matchAll(/\{\s*en:\s*(['"])/g)];
  const enOnly = [...stripComments(SRC.main + SRC.guidance).matchAll(/\{\s*en:\s*'[^']*'\s*\}/g)];
  ok('the renderers use bilingual {en, es} objects throughout', pairs.length > 30, `${pairs.length} pairs`);
  ok('no {en}-only object is rendered on this surface', enOnly.length === 0, `${enOnly.length}`);
}

// ------------------------- 10. button semantics, touch floor, handler pair
section('interaction — button semantics, 44px floor, handler pair, focus');
{
  const r = renderStep('protection', { answers: ANSWERS });
  const all = r.main;
  const controls = [...all.matchAll(/<button([^>]*)>/g)].map((m) => m[1]);
  ok('every rendered control is a real <button>',
    controls.length > 0 && !/<a [^>]*data-sleep-action/.test(all) && !/<div[^>]*data-sleep-action/.test(all));
  ok('every button declares type="button" (never a form submit)',
    controls.every((a) => /type="button"/.test(a)), `${controls.length} controls`);
  ok('every button carries a data-sleep-action the delegated handler understands',
    controls.every((a) => /data-sleep-action="[a-z-]+"/.test(a)));
  const railBtns = [...r.rail.matchAll(/<button([^>]*)>/g)].map((m) => m[1]);
  ok('rail steps are buttons with type and a step id',
    railBtns.length === 4 && railBtns.every((a) => /type="button"/.test(a) && /data-step="/.test(a)));
}
{
  ok('the action control keeps a 44px minimum height',
    /\.sleep-system__action \{[\s\S]*?min-height:\s*44px/.test(html));
  const bind = extractFunction('function bindSleepSystemInteractions()');
  const live = stripComments(bind);
  ok('Invariant 10 handler pair: both touchend and click are bound',
    /addEventListener\('touchend'/.test(live) && /addEventListener\('click'/.test(live));
  ok('touchend prevents the default so no ghost click follows',
    /event\.preventDefault\(\);\s*\r?\n?\s*suppressClickUntil/.test(live));
  ok('the click path is suppressed for the ghost window after a touch',
    /Date\.now\(\) < suppressClickUntil\) return;/.test(live));
  ok('pointerdown/up/cancel drive the pressed cue',
    /addEventListener\('pointerdown'/.test(live) && /addEventListener\('pointerup'/.test(live) &&
    /addEventListener\('pointercancel'/.test(live));
  ok('the delegation is bound once per screen, not per render',
    /dataset\.sleepSystemBound === 'true'/.test(live));
  ok('disabled controls are ignored on every path',
    (live.match(/control\.disabled/g) || []).length >= 3);
}
{
  // Focus destination: the screen's heading is populated by renderSleepSystem
  // BEFORE showScreen runs, which is what makes it a safe focus target.
  ok('the accessories screen still declares its focus heading',
    /accessoriesScreen: 'sleepSystemTitle'/.test(html));
  ok('showAccessories renders before it shows the screen',
    /renderSleepSystem\(\);\s*\r?\n\s*showScreen\('accessoriesScreen'\);/.test(html));
  ok('this item added no timer to the surface',
    [SRC.main, SRC.guidance, SRC.rail, SRC.plan, SRC.footer]
      .every((s) => !/setTimeout|setInterval/.test(stripComments(s))));
}

// ------------------------------- 11. financing stays disabled on this surface
section('financing — config-disabled on the Sleep System for Lacks');
{
  const surfaces = STORE_CONFIG.financing.surfaces;
  ok('store-config disables the Sleep System financing surface', surfaces.sleepSystem === false);
  ok('store-config disables the drawer financing surface too (item 1.5 state)',
    surfaces.drawer === false);
  for (const lang of ['en', 'es']) {
    const r = renderStep('support', { answers: ANSWERS, lang });
    ok(`[${lang}] no financing block renders in the procedure panel`,
      !/sleep-system__financing/.test(r.guidance) && !/FINANCING-COPY-SENTINEL/.test(r.guidance));
    ok(`[${lang}] no financing control is reachable from this surface`,
      !/openFinancingSheet/.test(r.guidance) && !/openFinancingSheet/.test(r.main));
  }
  // Positive control: the assertion above must be able to fail. With the
  // surface enabled the block DOES render — so its absence is the config
  // being honoured, not a dead branch.
  const on = renderStep('support', {
    answers: ANSWERS, finSurfaces: { drawer: false, sleepSystem: true }
  });
  ok('positive control: enabling the surface does render the block (the gate is live)',
    /sleep-system__financing/.test(on.guidance) && /FINANCING-COPY-SENTINEL/.test(on.guidance));
  const off = renderStep('support', {
    answers: ANSWERS, finEnabled: false, finSurfaces: { drawer: true, sleepSystem: true }
  });
  ok('financingEnabled() alone also suppresses the block',
    !/sleep-system__financing/.test(off.guidance));
  ok('the surface gate is read on every render, not cached',
    /financingEnabled\(\) && finSurfaceEnabled\('sleepSystem'\)/.test(stripComments(SRC.main)));
}

// ---------------- 12. item 1.3's contained outputs cannot return through here
section('item 1.3 containment — the contained outputs cannot return via 1.4');
{
  const GATED = [
    'Why it made your shortlist', 'Por qué llegó a tu lista',
    'Why it is here', 'Por qué está aquí'
  ];
  // Judged on `liveHtml` (defined with the source helpers above): the 1.3
  // containment record QUOTES the retired literals in an HTML comment.
  for (const literal of GATED) {
    ok(`contained literal absent from live code: "${literal}"`,
      !liveHtml.includes(literal));
  }
  const sleepSrc = [SRC.main, SRC.guidance, SRC.rail, SRC.plan, SRC.footer, SRC.readGroups,
    SRC.supportGuide, SRC.pillowFit, SRC.protectionGuide, SRC.renderDemo]
    .map(stripComments).join('\n');
  ok('no Sleep System renderer calls the contained why-fit producers',
    !/mattressShortlistFitText|hf2ReasonFor|buildMattressPriorities/.test(sleepSrc));
  ok('the removed drawer container is not recreated by this surface',
    !/drawerShortlistFit|drawerWhyLabel/.test(sleepSrc));
  ok('this surface renders no per-MATTRESS why-fit string',
    !/topPickReason|reasons_es/.test(sleepSrc));
  // The Sleep System's own benefit line is an ACCESSORY reason from the
  // in-app answer map — a different surface from item 1.3's per-model gate.
  // Pinned so a future edit cannot quietly widen it to mattresses.
  ok('the benefit line is sourced from the accessory item, never from a mattress',
    /primary\.reasons && primary\.reasons\[0\]/.test(stripComments(SRC.main)));
  ok('the accessory reason map is the app\'s own, not catalog reason columns',
    /const reasonMap = \{/.test(stripComments(SRC.scorer)) &&
    !/\.reasons_es\b/.test(stripComments(SRC.scorer)));
}

// ------------------------------------------- 13. close-out: the CSS repairs
section('close-out CSS — rail wraps 2x2 without a scroller, notes 15px, statuses 12px');
// Item 1.4 close-out (owner ruling 2026-08-25). Three CSS-only repairs, each
// pinned at the DECLARATION because nothing in this harness lays anything
// out — a "tidy-up" that reverted any of them would leave every rendered
// assertion green:
//   C1  at <=680px the step rail was four 112px chips in a sideways scroller;
//       "Adjustability" / "Ajustabilidad" / "Protección" clipped INSIDE their
//       chips and scrolling never revealed them (option B ruling). It now
//       wraps to two equal columns and does not scroll. No breakpoint was
//       added: the EXISTING <=680px block changed.
//   C2  the procedure notes rendered at 11px, under the 15px floor this
//       project applies to repaired lines. Ink, ground and rule are unchanged.
//   C3  the rail chip status rendered at 10px; it is now 12px and may wrap,
//       never truncated. The 13px step name stays the larger of the two.
// The audit is a function of the SOURCE so guard 15 can run it against a
// reverted tree and show each pin going red.

// Every `@media ... max-width` block at da4f746, counted once by hand:
//   git show da4f746:index.html | grep -c '@media.*max-width'   -> 24
// The close-out changed the existing <=680px block rather than adding a
// narrower one; this constant is what makes "no breakpoint added" a tested
// claim rather than a commit-message one.
const MEDIA_MAX_WIDTH_BLOCKS_AT_DA4F746 = 24;

function braceBlock(src, anchor) {
  const start = src.indexOf(anchor);
  if (start === -1) return '';
  let i = src.indexOf('{', start);
  let depth = 1;
  i++;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  return src.slice(start, i);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// The FIRST `selector { ... }` rule in `src` — the file's existing
// `html.match(/\.sleep-system__featured-reason \{[\s\S]*?\}/)` idiom.
const cssRule = (src, selector) => {
  const m = src.match(new RegExp(escapeRe(selector) + ' \\{[\\s\\S]*?\\}'));
  return m ? m[0] : '';
};
const fontOf = (css) => {
  const m = css.match(/font:\s*(\d+)\s+(\d+)px\/([\d.]+)\s/);
  return m ? { weight: Number(m[1]), px: Number(m[2]), lh: Number(m[3]) } : null;
};

function auditCloseoutCss(src) {
  const checks = [];
  const pin = (name, cond, detail = '') => checks.push([name, !!cond, detail]);
  // Stylesheet text only, comments removed: the close-out comments QUOTE the
  // retired geometry ("112px"), and a JS string may legitimately contain `/*`.
  const css = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
    .map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const narrowHeads = css.match(/@media \(max-width: 680px\) \{/g) || [];
  const narrow = narrowHeads.length === 1 ? braceBlock(css, '@media (max-width: 680px) {') : '';
  const railRules = css.match(/\.sleep-system__rail \{[\s\S]*?\}/g) || [];
  const railBase = cssRule(css, '.sleep-system__rail');
  const railNarrow = cssRule(narrow, '.sleep-system__rail');
  const notice = cssRule(css, '.sleep-system__notice');
  const status = cssRule(css, '.sleep-system__step-status');
  const name = cssRule(css, '.sleep-system__step-name');
  const step = cssRule(css, '.sleep-system__step');
  const footerNarrow = cssRule(narrow, '.sleep-system__footer');
  const noticeFont = fontOf(notice);
  const statusFont = fontOf(status);
  const nameFont = fontOf(name);
  const mediaBlocks = (css.match(/@media[^{]*max-width/g) || []).length;
  const flat = (r) => r.replace(/\s+/g, ' ');

  // C1 — the rail
  pin('C1: exactly one <=680px media block (the rail repair lives in the existing one)',
    narrowHeads.length === 1, `${narrowHeads.length} block(s)`);
  pin('C1: the <=680px rail rule wraps to two equal columns',
    /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/.test(railNarrow), flat(railNarrow));
  pin('C1: the <=680px rail rule declares no overflow and no padding-bottom (no sideways scroller)',
    railNarrow !== '' && !/overflow/.test(railNarrow) && !/padding-bottom/.test(railNarrow), flat(railNarrow));
  pin('C1: the base rail rule still lays the four steps in four columns',
    /grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\);/.test(railBase), flat(railBase));
  pin('C1: the rail is declared exactly twice (base + narrow) and neither uses the 112px scroll geometry',
    railRules.length === 2 && railRules.every((r) => !/minmax\(112px/.test(r) && !/overflow-x/.test(r)),
    `${railRules.length} rail rule(s)`);
  pin('C1: the base rail rule precedes the narrow one (the override wins by cascade order)',
    railBase !== '' && css.indexOf(railBase) < css.indexOf('@media (max-width: 680px) {'));
  pin('C1: no breakpoint added (the @media max-width count is the da4f746 count)',
    mediaBlocks === MEDIA_MAX_WIDTH_BLOCKS_AT_DA4F746,
    `${mediaBlocks} block(s), da4f746 had ${MEDIA_MAX_WIDTH_BLOCKS_AT_DA4F746}`);
  pin('C1: the step chip and its name never clip (no overflow hidden / nowrap / text-overflow)',
    step !== '' && name !== '' &&
    [step, name].every((r) => !/overflow:\s*hidden|white-space:\s*nowrap|text-overflow/.test(r)));
  pin('C1: the step chip keeps its 64px minimum height (room for a wrapped status)',
    /min-height:\s*64px;/.test(step));

  // C2 — the notes
  pin('C2: procedure notes are at least 15px', noticeFont !== null && noticeFont.px >= 15,
    noticeFont ? `${noticeFont.px}px` : 'no font shorthand');
  pin('C2: procedure notes keep weight 600 and line-height 1.4',
    noticeFont !== null && noticeFont.weight === 600 && noticeFont.lh === 1.4,
    noticeFont ? `${noticeFont.weight} ${noticeFont.px}px/${noticeFont.lh}` : '');
  pin('C2: procedure-note ink, ground and rule are unchanged (#394C5B on #EEF2F4, #48647A rule)',
    /color:\s*#394C5B;/.test(notice) && /background:\s*#EEF2F4;/.test(notice) &&
    /border-left:\s*3px solid #48647A;/.test(notice));

  // C3 — the statuses
  pin('C3: chip status is at least 12px', statusFont !== null && statusFont.px >= 12,
    statusFont ? `${statusFont.px}px` : 'no font shorthand');
  pin('C3: chip status keeps weight 500 and line-height 1.2',
    statusFont !== null && statusFont.weight === 500 && statusFont.lh === 1.2);
  pin('C3: chip status may wrap anywhere (a long product name breaks rather than overflows)',
    /overflow-wrap:\s*anywhere;/.test(status), flat(status));
  pin('C3: chip status is never truncated (no nowrap, no text-overflow, no overflow hidden)',
    status !== '' && !/white-space:\s*nowrap|text-overflow|overflow:\s*hidden/.test(status));
  pin('C3: the step name stays 13px and larger than the status (hierarchy holds)',
    nameFont !== null && statusFont !== null && nameFont.px === 13 && nameFont.px > statusFont.px,
    `name ${nameFont && nameFont.px}px vs status ${statusFont && statusFont.px}px`);

  // Deliberately untouched neighbours, pinned so nobody "fixes" them in passing.
  pin('untouched: the <=680px sticky footer keeps its owner-ruled negative margin (16px -14px -14px)',
    /margin:\s*16px -14px -14px;/.test(footerNarrow), flat(footerNarrow).slice(0, 80));
  pin('untouched: reduced-motion still disables the main-panel animation',
    /@media \(prefers-reduced-motion: reduce\) \{\s*\.sleep-system__main \{ animation: none; \}/.test(css));
  return checks;
}
for (const [name, cond, detail] of auditCloseoutCss(html)) ok(name, cond, detail);

// ------------------------------------------- 14. close-out: the copy repair
section('close-out copy — one eyebrow, approved headings, salesperson-voice notes');
// Item 1.4 close-out (owner ruling 2026-08-25): the procedure panel addresses
// the SALESPERSON on every step. One eyebrow ("Specialist notes") names the
// region on all four steps — the "During the trial" alternative is retired —
// three guidance headings and eleven notes were reworded out of customer
// voice (owner-approved EN; ES provisional), and nothing the CUSTOMER reads
// changed: step copy, card eyebrows, "Also compare" and every action label
// are pinned byte-for-byte to da4f746 at the end of this guard.
const unescapeHtml = (s) => String(s)
  .replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const notesText = (g) => notesOf(g).map(unescapeHtml);
const h2Of = (g) => { const m = String(g).match(/<h2>([^<]*)<\/h2>/); return m ? unescapeHtml(m[1]) : null; };
const EYEBROW = { en: 'Specialist notes', es: 'Notas del especialista' };
const HEADINGS = {
  adjustability: { en: 'Guide the showroom trial', es: 'Guía la prueba en la tienda' },
  support: { en: 'Confirm the setup', es: 'Confirma la configuración' },
  pillow: { en: 'Check alignment', es: 'Revisa la alineación' },
  protection: { en: 'Match protection to the priority', es: 'Ajusta la protección a la prioridad' }
};
// Every state that selects a different note: the pillow step reads the sleep
// position (side / back / stomach / one with no cue) and the recorded fit
// (none / low / high / aligned); the protection step reads the goal (the
// suggested one, then each explicit goal). Adjustability and support are
// state-free. 25 renders per language, reused by every guard below.
const POSITIONS = ['side', 'back', 'stomach', 'combination'];
const FEEDBACK = ['', 'low', 'high', 'aligned'];
const GOALS = ['', 'spills', 'allergens', 'cooling', 'everyday'];
function renderMatrix(mutate = null) {
  const rows = [];
  const push = (step, lang, answers, state, tag) => {
    const r = renderStep(step, { answers, lang, state, mutate });
    rows.push({ step, lang, r, notes: notesText(r.guidance), label: `${lang}/${step}${tag}` });
  };
  for (const lang of ['en', 'es']) {
    push('adjustability', lang, ANSWERS, {}, '');
    push('support', lang, ANSWERS, {}, '');
    for (const p of POSITIONS) {
      for (const f of FEEDBACK) {
        push('pillow', lang, Object.assign({}, ANSWERS, { sleep_position: p }),
          { pillowFeedback: f }, `/${p}/${f || 'unrecorded'}`);
      }
    }
    for (const g of GOALS) push('protection', lang, ANSWERS, { protectionGoal: g }, `/${g || 'suggested'}`);
  }
  return rows;
}
const MATRIX = renderMatrix();
const failing = (rows, pred) => rows.filter((row) => !pred(row)).map((row) => row.label);
{
  // 14a — ONE eyebrow, on every step, in both languages; the approved heading.
  for (const lang of ['en', 'es']) {
    for (const step of STEP_IDS) {
      const r = renderStep(step, { answers: ANSWERS, lang });
      ok(`[${lang}/${step}] the procedure region is named exactly "${EYEBROW[lang]}"`,
        r.guidanceLabel === EYEBROW[lang], JSON.stringify(r.guidanceLabel));
      ok(`[${lang}/${step}] the guidance heading is the approved "${HEADINGS[step][lang]}"`,
        h2Of(r.guidance) === HEADINGS[step][lang], JSON.stringify(h2Of(r.guidance)));
    }
  }
  const offLabel = failing(MATRIX, (row) => row.r.guidanceLabel === EYEBROW[row.lang] &&
    row.r.guidance.includes(`<div class="sleep-system__plan-eyebrow">${EYEBROW[row.lang]}</div>`));
  ok('the eyebrow (and the region name) stays "Specialist notes" / "Notas del especialista" in every state',
    offLabel.length === 0, offLabel.join(' | '));
  ok('the single eyebrow is one unconditional assignment, not a two-branch label',
    (stripComments(SRC.main).match(
      /var guidanceKind = sleepSystemText\(\{ en: 'Specialist notes', es: 'Notas del especialista' \}\);/g) || []).length === 1 &&
    !/guidanceKind = step\.id/.test(stripComments(SRC.main)));
  for (const literal of ['During the trial', 'Durante la prueba']) {
    ok(`retired eyebrow absent from live code: "${literal}"`, !liveHtml.includes(literal));
  }
}

// 14b — the eleven approved notes, each rendered in the state that selects it.
// EN strings are the owner-approved text; ES is provisional (native review
// deferred under roadmap Invariant 12) but must be the ES that shipped, not
// an English fallback.
const APPROVED_NOTES = [
  { step: 'support',
    en: 'Verify the final setup before the customer makes a selection.',
    es: 'Verifica la configuración final antes de que el cliente haga su selección.' },
  { step: 'adjustability',
    en: 'Recommend a base only after the customer tries the positions that matter most to them.',
    es: 'Recomienda una base solo después de que el cliente pruebe las posiciones que más le importan.' },
  { step: 'pillow',
    en: 'Explain how this pillow addresses the customer\'s priorities.',
    es: 'Explica cómo esta almohada responde a las prioridades del cliente.' },
  { step: 'pillow', answers: { sleep_position: 'side' },
    en: 'Check that the customer\'s head fills the shoulder-to-mattress gap.',
    es: 'Verifica que la cabeza del cliente llene el espacio entre el hombro y el colchón.' },
  { step: 'pillow', answers: { sleep_position: 'back' },
    en: 'Check that the customer\'s chin stays neutral rather than tipped forward.',
    es: 'Verifica que la barbilla del cliente se mantenga neutral, sin inclinarse hacia adelante.' },
  { step: 'pillow', answers: { sleep_position: 'combination' },
    en: 'Check that the customer\'s head stays centered over their shoulders.',
    es: 'Verifica que la cabeza del cliente se mantenga centrada sobre los hombros.' },
  { step: 'pillow', state: { pillowFeedback: 'low' },
    en: 'If the customer says it feels too low, add loft or try adjustable fill, then retest.',
    es: 'Si el cliente dice que se siente muy baja, agrega altura o prueba relleno ajustable y vuelve a probar.' },
  { step: 'pillow', state: { pillowFeedback: 'high' },
    en: 'If the customer says it feels too high, move to a lower profile, then retest.',
    es: 'Si el cliente dice que se siente muy alta, cambia a un perfil más bajo y vuelve a probar.' },
  { step: 'pillow', state: { pillowFeedback: 'aligned' },
    en: 'If the customer feels aligned, confirm comfort for several minutes before adding the pillow to the plan.',
    es: 'Si el cliente se siente alineado, confirma la comodidad durante varios minutos antes de agregar la almohada al plan.' },
  { step: 'protection', state: { protectionGoal: 'allergens' },
    en: 'Ask whether the customer prefers fitted protection or full encasement.',
    es: 'Pregunta si el cliente prefiere protección ajustada o cobertura completa.' },
  { step: 'protection',
    en: 'Review fit and care instructions with the customer.',
    es: 'Revisa las instrucciones de ajuste y cuidado con el cliente.' }
];
{
  for (const n of APPROVED_NOTES) {
    const answers = Object.assign({}, ANSWERS, n.answers || {});
    const where = n.step +
      (n.answers ? '/' + n.answers.sleep_position : '') +
      (n.state ? '/' + Object.values(n.state).join('/') : '');
    const en = notesText(renderStep(n.step, { answers, lang: 'en', state: n.state || {} }).guidance);
    const es = notesText(renderStep(n.step, { answers, lang: 'es', state: n.state || {} }).guidance);
    ok(`[en/${where}] renders the approved note "${n.en.slice(0, 40)}…"`,
      en.includes(n.en), en.join(' | ').slice(0, 140));
    ok(`[es/${where}] renders its ES counterpart "${n.es.slice(0, 40)}…"`,
      es.includes(n.es), es.join(' | ').slice(0, 140));
  }
  ok('the approved set is eleven distinct EN notes with eleven distinct ES counterparts',
    APPROVED_NOTES.length === 11 &&
    new Set(APPROVED_NOTES.map((n) => n.en)).size === 11 &&
    new Set(APPROVED_NOTES.map((n) => n.es)).size === 11 &&
    APPROVED_NOTES.every((n) => n.en !== n.es));
}

// 14c — the retired customer-voice strings: gone from live code, and never
// rendered in any state. The three retired guidance headings are included.
const RETIRED_CUSTOMER_VOICE = [
  'Your head should fill', 'Keep your chin neutral', 'Keep your head centered', 'that matter to you',
  'with your specialist', 'A specialist should verify', 'Customer said too low', 'Customer said too high',
  'Customer feels aligned', 'Explain why this pillow fits', 'Clarify whether fitted',
  'Tu cabeza debe', 'Mantén la barbilla', 'Mantén la cabeza centrada', 'importantes para ti',
  'con tu especialista', 'Un especialista debe', 'El cliente dijo', 'El cliente se siente alineado:',
  'Explica por qué esta almohada', 'Aclara si prefieren',
  'Try it in the showroom', 'Pruébala en la tienda', 'Notice your alignment', 'Observa tu alineación',
  'Choose by priority', 'Elige por prioridad'
];
// "with your specialist" / "con tu especialista" also live, legitimately, on
// a CUSTOMER surface (the results narrative's "Explore with your specialist
// in store"). Those two are judged on the Sleep System's own live source;
// every other fragment is judged on the whole live file.
const OTHER_SURFACE = new Set(['with your specialist', 'con tu especialista']);
const sleepLive = Object.values(SRC).map(stripComments).join('\n');
{
  for (const frag of RETIRED_CUSTOMER_VOICE) {
    const scoped = OTHER_SURFACE.has(frag);
    ok(`retired customer-voice string absent from ${scoped ? 'the Sleep System live source' : 'live code'}: "${frag}"`,
      !(scoped ? sleepLive : liveHtml).includes(frag));
  }
  const rendered = failing(MATRIX, (row) => {
    const panel = [row.r.guidanceLabel, h2Of(row.r.guidance)].concat(row.notes).join('\n');
    return RETIRED_CUSTOMER_VOICE.every((frag) => !panel.includes(frag));
  });
  ok('no retired string renders in the procedure panel in any state, either language',
    rendered.length === 0, rendered.join(' | '));
}

// 14d — no second-person address anywhere in the panel. JS `\b` is ASCII-only,
// so the Spanish test uses Unicode letter boundaries: "detente" must not match
// `te`, and "tú" must match. `usted` is included — formal address is still
// address. Imperatives ("Verifica", "Confirma") are the procedure voice and
// are not caught: they instruct the salesperson.
const EN_SECOND_PERSON = /\b(you|your|yours|yourself)\b/i;
const ES_SECOND_PERSON = /(?<!\p{L})(tu|tus|te|ti|tú|usted|ustedes)(?!\p{L})/iu;
{
  const hits = { en: [], es: [] };
  for (const row of MATRIX) {
    const re = row.lang === 'en' ? EN_SECOND_PERSON : ES_SECOND_PERSON;
    for (const line of [h2Of(row.r.guidance)].concat(row.notes)) {
      if (re.test(line)) hits[row.lang].push(`${row.label}: ${line}`);
    }
  }
  ok('no EN procedure heading or note addresses the customer (you / your)',
    hits.en.length === 0, [...new Set(hits.en)].slice(0, 4).join(' | '));
  ok('no ES procedure heading or note addresses the customer (tu / tus / te / ti / tú / usted)',
    hits.es.length === 0, [...new Set(hits.es)].slice(0, 4).join(' | '));
}

// 14e — no mixed languages, and guard 4's duplication rule in every state.
{
  // Paired row by row (same state, other language), so an `es:` value that
  // merely copies its `en:` value — what an English-only fallback looks like
  // in a bilingual object — is caught on the string itself.
  const enRows = MATRIX.filter((r) => r.lang === 'en');
  const esRows = MATRIX.filter((r) => r.lang === 'es');
  const mixed = [];
  enRows.forEach((en, i) => {
    const es = esRows[i];
    en.notes.forEach((note, k) => { if (es.notes[k] === note) mixed.push(`${es.label}: ${note}`); });
    if (h2Of(es.r.guidance) === h2Of(en.r.guidance)) mixed.push(`${es.label}: heading`);
  });
  ok('no ES render repeats an EN note or heading (no English-only fallback in the panel)',
    enRows.length === esRows.length && mixed.length === 0, mixed.slice(0, 3).join(' | '));
  // Guard 4, extended to the low/high/aligned and every protection-goal
  // state: the customer benefit stays OUT of the panel, three distinct notes
  // render, and no note leaks into the customer card.
  const dup = failing(MATRIX, (row) => {
    const body = featuredBody(row.r.main);
    if (!body) return false;
    const benefit = unescapeHtml(grab(body, 'sleep-system__featured-reason') || '');
    const card = unescapeHtml(textOf(body));
    return benefit.length > 0 && !row.notes.includes(benefit) &&
      row.notes.length === 3 && new Set(row.notes).size === 3 &&
      row.notes.every((n) => !card.includes(n));
  });
  ok('in every state: three distinct notes, the benefit not among them, none inside the card',
    dup.length === 0, dup.join(' | '));
}

// 14f — what the CUSTOMER reads is byte-identical to da4f746. The snapshots
// below were taken from `git show da4f746:index.html` once, by hand; the main
// renderer carried 33 bilingual literals there, and exactly one — the retired
// "During the trial" eyebrow pair — is gone.
const STEP_COPY_AT_DA4F746 = {
  adjustability: {
    label: { en: 'Adjustability', es: 'Ajustabilidad' },
    title: { en: 'Explore adjustable comfort', es: 'Explora la comodidad ajustable' },
    copy: {
      en: 'A base can change how the whole bed works for reading, relaxing, and certain sleep concerns. A showroom demo is the best test.',
      es: 'Una base puede cambiar cómo funciona toda la cama para leer, relajarse y ciertas necesidades de sueño. Una demostración es la mejor prueba.'
    }
  },
  support: {
    label: { en: 'Support', es: 'Soporte' },
    title: { en: 'Set the right support', es: 'Elige el soporte correcto' },
    copy: {
      en: 'Start with what will sit under the mattress. The right support protects the feel, height, and long-term setup.',
      es: 'Empieza con lo que irá debajo del colchón. El soporte correcto protege la sensación, la altura y la configuración.'
    }
  },
  pillow: {
    label: { en: 'Pillow', es: 'Almohada' },
    title: { en: 'Check head and neck alignment', es: 'Revisa la alineación de cabeza y cuello' },
    copy: {
      en: 'Try one pillow with your finalist mattress. The goal is neutral alignment, not simply the softest or tallest option.',
      es: 'Prueba una almohada con tu colchón finalista. La meta es una alineación neutral, no solo la opción más suave o alta.'
    }
  },
  protection: {
    label: { en: 'Protection', es: 'Protección' },
    title: { en: 'Protect without masking the feel', es: 'Protege sin ocultar la sensación' },
    copy: {
      en: 'Choose protection around the goal that matters most: spills, allergens, cooling, or everyday care.',
      es: 'Elige protección segun la meta más importante: derrames, alérgenos, frescura o cuidado diario.'
    }
  }
};
const MAIN_LITERALS_AT_DA4F746 = [
  ['No products available in this category', 'No hay productos disponibles en esta categoría'],
  ['You can skip this step and continue your plan.', 'Puedes omitir este paso y continuar tu plan.'],
  ['From $', 'Desde $'],
  ['Support option', 'Opción de soporte'],
  ['Recommended to try', 'Recomendado para probar'],
  ['Worth comparing', 'Vale la pena comparar'],
  ['Ask for a demo', 'Pedir demostración'],
  ['Remove base from plan', 'Quitar base del plan'],
  ['Keep this base in plan', 'Guardar esta base en el plan'],
  ['Decide later', 'Decidir después'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add support to plan', 'Agregar soporte al plan'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add aligned pillow to plan', 'Agregar almohada alineada al plan'],
  ['Record the physical fit above before adding this pillow.', 'Registra el ajuste físico arriba antes de agregar esta almohada.'],
  ['Keep current pillow', 'Conservar almohada actual'],
  ['Decide later', 'Decidir después'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add protector to plan', 'Agregar protector al plan'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add to plan', 'Agregar al plan'],
  ['Also compare', 'También compara'],
  ['Try this', 'Probar esta'],
  ['Selected', 'Seleccionado'],
  ['Add', 'Agregar'],
  ['Current setup', 'Configuración actual'],
  ['Keep it, then confirm compatibility', 'Conservalo y confirma compatibilidad'],
  ['No new support is being added. Your specialist can confirm that the current frame, platform, or slats meet the mattress requirements.',
    'No se agregara un soporte nuevo. Tu especialista puede confirmar que el marco, plataforma o tablillas cumplen los requisitos.'],
  ['Specialist check', 'Revisión del especialista'],
  ['Confirm the setup before adding support', 'Confirma la configuración antes de agregar soporte'],
  ['A quick frame and slat check will determine whether the current setup works or whether a foundation is needed.',
    'Una revisión rápida del marco y las tablillas determinara si la configuración actual funciona o si necesita una base.'],
  ['Specialist notes', 'Notas del especialista']
];
const SECONDARY_LITERALS_AT_DA4F746 = [
  ['Keep current support', 'Conservar soporte actual'],
  ['Ask a specialist', 'Preguntar a un especialista'],
  ['Ask for a demo', 'Pedir demostración'],
  ['Decide later', 'Decidir después'],
  ['Keep current pillow', 'Conservar almohada actual'],
  ['Decide later', 'Decidir después'],
  ['Already protected', 'Ya está protegido'],
  ['Decide later', 'Decidir después']
];
const BILINGUAL_LITERAL = /\{\s*en:\s*'((?:[^'\\]|\\.)*)'\s*,\s*es:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
const literalsOf = (s) => [...stripComments(s).matchAll(BILINGUAL_LITERAL)].map((m) => [m[1], m[2]]);
{
  const env = makeEnv({ answers: ANSWERS });
  for (const step of env.api.STEPS) {
    ok(`[${step.id}] label, title and customer copy are byte-identical to da4f746`,
      JSON.stringify({ label: step.label, title: step.title, copy: step.copy }) ===
        JSON.stringify(STEP_COPY_AT_DA4F746[step.id]));
  }
  const mainLits = literalsOf(SRC.main);
  ok('renderSleepSystemMain carries exactly the da4f746 bilingual literals minus the retired eyebrow (order and bytes)',
    JSON.stringify(mainLits) === JSON.stringify(MAIN_LITERALS_AT_DA4F746),
    `${mainLits.length} literal pairs (da4f746: 33, one retired)`);
  ok('sleepSystemSecondaryActions labels are byte-identical to da4f746',
    JSON.stringify(literalsOf(SRC.secondary)) === JSON.stringify(SECONDARY_LITERALS_AT_DA4F746));
  ok('the protection eyebrow prefix ("Best for " / "Mejor para ") is unchanged',
    /en: 'Best for ' \+ sleepSystemText\(protectionGoalLabel/.test(stripComments(SRC.main)) &&
    /es: 'Mejor para ' \+ sleepSystemText\(protectionGoalLabel/.test(stripComments(SRC.main)));
  // And rendered, so the pin is on output as well as source.
  const EYEBROWS = {
    en: { adjustability: /^(Recommended to try|Worth comparing)$/, support: /^Support option$/, protection: /^Best for .+$/ },
    es: { adjustability: /^(Recomendado para probar|Vale la pena comparar)$/, support: /^Opción de soporte$/, protection: /^Mejor para .+$/ }
  };
  const COMPARE = { en: 'Also compare', es: 'También compara' };
  for (const lang of ['en', 'es']) {
    for (const step of ['adjustability', 'support', 'protection']) {
      const r = renderStep(step, { answers: ANSWERS, lang });
      const eyebrow = grab(featuredBody(r.main), 'sleep-system__card-eyebrow') || '';
      ok(`[${lang}/${step}] the customer card eyebrow is the shipped one`,
        EYEBROWS[lang][step].test(eyebrow), JSON.stringify(eyebrow));
    }
    const r = renderStep('adjustability', { answers: ANSWERS, lang });
    ok(`[${lang}] the alternatives label still reads "${COMPARE[lang]}"`,
      r.main.includes(`<div class="sleep-system__alternatives-label">${COMPARE[lang]}</div>`));
  }
}

// ------------------------------------------------------ 15. negative controls
section('negative controls — the load-bearing assertions bite');
{
  // Re-invert the card and the hierarchy guard must fail.
  const inverted = renderStep('pillow', {
    answers: ANSWERS,
    mutate: (s) => s.replace(
      "'<div class=\"sleep-system__featured-reason\">' + escapeHtml(reason) + '</div>' +",
      '__REASON_MOVED__').replace(
      "'<p class=\"sleep-system__featured-description\">' + escapeHtml(sleepSystemText(primary.description)) + '</p>' +",
      "'<p class=\"sleep-system__featured-description\">' + escapeHtml(sleepSystemText(primary.description)) + '</p>' +\n'<div class=\"sleep-system__featured-reason\">' + escapeHtml(reason) + '</div>' +")
      .replace('__REASON_MOVED__', '')
  });
  const invBody = featuredBody(inverted.main);
  ok('control: re-inverting the card puts distinction before benefit again',
    invBody !== null && nodeAt(invBody, 'sleep-system__featured-description') <
      nodeAt(invBody, 'sleep-system__featured-reason'),
    'the hierarchy guard would fail on this tree');
}
{
  // Re-introduce the duplicate and the duplication guard must see it.
  const dup = renderStep('support', {
    answers: ANSWERS,
    mutate: (s) => s.replace(
      'return notices.slice(0, 3);',
      'if (primary && primary.reasons && primary.reasons[0]) notices.unshift(primary.reasons[0]);\nreturn notices.slice(0, 3);')
  });
  const dupBody = featuredBody(dup.main);
  const dupBenefit = grab(dupBody, 'sleep-system__featured-reason');
  ok('control: re-introducing the unshift puts the benefit back in the procedure panel',
    notesOf(dup.guidance).includes(dupBenefit),
    'the duplication guard would fail on this tree');
  // Close-out: the third support note is now the salesperson-voice string;
  // the precondition proves the clean tree renders it, so the displacement
  // assertion cannot pass vacuously against a string that never rendered.
  const THIRD_SUPPORT_NOTE = 'Verify the final setup before the customer makes a selection.';
  ok('control precondition: the unmutated support panel renders its third note',
    notesText(renderStep('support', { answers: ANSWERS }).guidance).includes(THIRD_SUPPORT_NOTE));
  ok('control: and it displaces the third procedure note again',
    !notesText(dup.guidance).includes(THIRD_SUPPORT_NOTE));
}
{
  // Strip the region name and the labelling guard must fail.
  const unnamed = renderStep('pillow', {
    answers: ANSWERS,
    mutate: (s) => s.replace("guidance.setAttribute('aria-label', guidanceKind);", '')
  });
  ok('control: removing the aria-label leaves the procedure region unnamed',
    unnamed.guidanceLabel === null,
    'the region-name guard would fail on this tree');
}
{
  // A second price surface must be visible to BOTH price guards.
  //
  // REVIEW REPAIR (PR #65): the first version of this control asserted
  // `count >= 1`, which the UNMUTATED tree already satisfies — it carries one
  // price surface by design. That assertion would have passed even if the
  // injection had silently failed to apply, making the control vacuous: it
  // could not distinguish "the guard sees the extra price" from "no extra
  // price was ever added". It now (a) proves the injection applied exactly
  // once against the real source, (b) asserts the EXACT post-injection count
  // rather than a floor, and (c) names the two production assertions it is a
  // control for and shows each would go red.
  const FIND = "'<div class=\"sleep-system__alternative-copy\">' ";
  const INJECT = "'<div class=\"sleep-system__price\">X</div><div class=\"sleep-system__alternative-copy\">' ";
  let injectionHits = null;
  const extraPrice = renderStep('protection', {
    answers: ANSWERS,
    mutate: (s) => {
      injectionHits = s.split(FIND).length - 1;
      return s.split(FIND).join(INJECT);
    }
  });
  ok('control: the alternative-price injection applies exactly once to the real source',
    injectionHits === 1, `${injectionHits} match(es) for the find string`);

  // Expected count is derived from the tree, not hardcoded, so the control
  // stays exact if the catalog's alternative count ever changes.
  const clean = renderStep('protection', { answers: ANSWERS });
  const altCount = (clean.main.match(/class="sleep-system__alternative"/g) || []).length;
  const expected = 1 + altCount;
  const count = (extraPrice.main.match(/class="sleep-system__price"/g) || []).length;
  ok('control: the mutated tree renders one price per alternative PLUS the primary',
    count === expected, `${count} price surfaces, expected ${expected} (1 primary + ${altCount} injected)`);
  ok('control: on the shipped catalog that is exactly two price surfaces',
    count === 2, `${count} price surfaces in the mutated tree`);
  ok('control: the "exactly one price surface renders" guard would FAIL on this tree',
    count !== 1, `${count} price surfaces`);
  ok('control: the "alternatives carry no price of their own" guard would FAIL on this tree',
    /sleep-system__alternative[\s\S]*?sleep-system__price/.test(extraPrice.main));
}

{
  // Close-out controls (guards 13-14). Each reverts ONE repair on a copy of
  // the source, proves the revert applied exactly once, and names the pin
  // that goes red. Rendered controls go through `mutate` on the extracted
  // sources; CSS controls run the same audit function against a mutated
  // copy of index.html.
  const ONE_LABEL = "var guidanceKind = sleepSystemText({ en: 'Specialist notes', es: 'Notas del especialista' });";
  const TWO_LABEL = "var guidanceKind = step.id === 'pillow' || step.id === 'protection'\n" +
    "        ? sleepSystemText({ en: 'Specialist notes', es: 'Notas del especialista' })\n" +
    "        : sleepSystemText({ en: 'During the trial', es: 'Durante la prueba' });";
  const applyOnce = (find, replace) => {
    let hits = null;
    const mutate = (s) => { hits = s.split(find).length - 1; return s.split(find).join(replace); };
    return { mutate, hits: () => hits };
  };

  // (a) the two-label eyebrow returns -> the exact-name pin fails on adjustability.
  const twoLabel = applyOnce(ONE_LABEL, TWO_LABEL);
  const relabelled = renderStep('adjustability', { answers: ANSWERS, mutate: twoLabel.mutate });
  ok('control: the one-label find string matches the real source exactly once', twoLabel.hits() === 1, `${twoLabel.hits()}`);
  ok('control: restoring the two-label eyebrow renames the adjustability region "During the trial"',
    relabelled.guidanceLabel === 'During the trial', 'the exact-eyebrow pin would fail on this tree');
  const relabelledEs = renderStep('support', { answers: ANSWERS, lang: 'es', mutate: twoLabel.mutate });
  ok('control: and the ES support region becomes "Durante la prueba"',
    relabelledEs.guidanceLabel === 'Durante la prueba', 'the exact ES-name pin in guard 9 would fail on this tree');

  // (b) one note back in customer voice -> the second-person pin fails in BOTH
  //     languages, and a retired fragment renders again.
  const SIDE_NEW = "side: { en: 'Check that the customer\\'s head fills the shoulder-to-mattress gap.', " +
    "es: 'Verifica que la cabeza del cliente llene el espacio entre el hombro y el colchón.' },";
  const SIDE_OLD = "side: { en: 'Your head should fill the shoulder-to-mattress gap.', " +
    "es: 'Tu cabeza debe llenar el espacio entre el hombro y el colchón.' },";
  const voice = applyOnce(SIDE_NEW, SIDE_OLD);
  const sideEn = notesText(renderStep('pillow', {
    answers: Object.assign({}, ANSWERS, { sleep_position: 'side' }), mutate: voice.mutate }).guidance);
  const sideEs = notesText(renderStep('pillow', {
    answers: Object.assign({}, ANSWERS, { sleep_position: 'side' }), lang: 'es', mutate: voice.mutate }).guidance);
  ok('control: the side-cue find string matches the real source exactly once', voice.hits() === 1, `${voice.hits()}`);
  ok('control: the customer-voice side cue trips the EN second-person pin',
    sideEn.some((n) => EN_SECOND_PERSON.test(n)), sideEn.join(' | ').slice(0, 120));
  ok('control: and trips the ES second-person pin',
    sideEs.some((n) => ES_SECOND_PERSON.test(n)), sideEs.join(' | ').slice(0, 120));
  ok('control: and renders a retired fragment again',
    sideEn.some((n) => n.includes('Your head should fill')) && sideEs.some((n) => n.includes('Tu cabeza debe')));
  ok('control: the neutral stomach cue does NOT trip either pin (the regex is not over-broad)',
    !EN_SECOND_PERSON.test('Look for a lower profile that avoids neck strain.') &&
    !ES_SECOND_PERSON.test('Busca un perfil bajo que evite tension en el cuello.') &&
    !ES_SECOND_PERSON.test('Cambia una posición a la vez y detente para notar la diferencia.') &&
    ES_SECOND_PERSON.test('Elige una base solo después de probar las posiciones importantes para ti.') &&
    ES_SECOND_PERSON.test('Confirma el ajuste y cuidado con tu especialista.'));

  // (c) an ES value copied from its EN -> the no-mixed-languages pin fails.
  const ES_THIRD = "es: 'Verifica la configuración final antes de que el cliente haga su selección.'";
  const EN_AS_ES = "es: 'Verify the final setup before the customer makes a selection.'";
  const mix = applyOnce(ES_THIRD, EN_AS_ES);
  const mixedEs = notesText(renderStep('support', { answers: ANSWERS, lang: 'es', mutate: mix.mutate }).guidance);
  const cleanEn = notesText(renderStep('support', { answers: ANSWERS, lang: 'en' }).guidance);
  ok('control: the ES third-note find string matches the real source exactly once', mix.hits() === 1, `${mix.hits()}`);
  ok('control: an English-only ES value renders the EN note under the ES flag',
    mixedEs[2] === cleanEn[2] && mixedEs[2] === 'Verify the final setup before the customer makes a selection.',
    'the no-mixed-languages pin would fail on this tree');

  // (d) each CSS repair reverted on a copy of index.html -> its pin goes red.
  //     Find strings are matched loosely across CRLF, the way the mutation
  //     sweep does it, and must hit exactly once.
  const CSS_CONTROLS = [
    ['rail back to four 112px scrolling columns',
      '      .sleep-system__rail {\n        grid-template-columns: repeat(2, minmax(0, 1fr));\n      }',
      '      .sleep-system__rail {\n        grid-template-columns: repeat(4, minmax(112px, 1fr));\n        overflow-x: auto;\n        padding-bottom: 4px;\n      }',
      ['C1: the <=680px rail rule wraps to two equal columns',
        'C1: the <=680px rail rule declares no overflow and no padding-bottom (no sideways scroller)',
        'C1: the rail is declared exactly twice (base + narrow) and neither uses the 112px scroll geometry']],
    ['rail regains overflow-x alone',
      '        grid-template-columns: repeat(2, minmax(0, 1fr));\n      }\n      .sleep-system__section-head {',
      '        grid-template-columns: repeat(2, minmax(0, 1fr));\n        overflow-x: auto;\n      }\n      .sleep-system__section-head {',
      ['C1: the <=680px rail rule declares no overflow and no padding-bottom (no sideways scroller)']],
    ['a new 600px breakpoint',
      '    @media (prefers-reduced-motion: reduce) {\n      .sleep-system__main { animation: none; }',
      '    @media (max-width: 600px) {\n      .sleep-system__rail { gap: 6px; }\n    }\n    @media (prefers-reduced-motion: reduce) {\n      .sleep-system__main { animation: none; }',
      ['C1: no breakpoint added (the @media max-width count is the da4f746 count)']],
    ['notes back to 11px',
      'font: 600 15px/1.4 var(--font-sans);', 'font: 600 11px/1.4 var(--font-sans);',
      ['C2: procedure notes are at least 15px']],
    ['statuses back to 10px',
      'font: 500 12px/1.2 var(--font-sans);', 'font: 500 10px/1.2 var(--font-sans);',
      ['C3: chip status is at least 12px']],
    ['statuses lose overflow-wrap',
      'font: 500 12px/1.2 var(--font-sans);\n      overflow-wrap: anywhere;', 'font: 500 12px/1.2 var(--font-sans);',
      ['C3: chip status may wrap anywhere (a long product name breaks rather than overflows)']],
    ['statuses grow past the step name',
      'font: 500 12px/1.2 var(--font-sans);', 'font: 500 14px/1.2 var(--font-sans);',
      ['C3: the step name stays 13px and larger than the status (hierarchy holds)']]
  ];
  const cleanAudit = new Map(auditCloseoutCss(html).map(([n, c]) => [n, c]));
  for (const [what, find, replace, pins] of CSS_CONTROLS) {
    const re = new RegExp(escapeRe(find).replace(/\n/g, '\\r?\\n'), 'g');
    const n = (html.match(re) || []).length;
    const mutated = html.replace(re, () => replace);
    const audit = new Map(auditCloseoutCss(mutated).map(([name, cond]) => [name, cond]));
    ok(`control: "${what}" find string matches index.html exactly once`, n === 1 && mutated !== html, `${n} match(es)`);
    for (const p of pins) {
      ok(`control: ${what} -> "${p}" goes red`,
        cleanAudit.get(p) === true && audit.get(p) === false,
        audit.has(p) ? '' : 'pin name not found in the audit');
    }
  }
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
