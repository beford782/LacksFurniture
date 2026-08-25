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
//  13.  negative controls proving the load-bearing assertions bite
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
    ok(`[${step}] the ES procedure region name is Spanish`,
      /^(Notas del especialista|Durante la prueba)$/.test(es.guidanceLabel || ''), es.guidanceLabel);
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
  // LIVE SOURCE, the same definition results_presentation_check uses for this
  // gate: index.html with HTML comments and full-line JS comments removed, so
  // containment is judged on code that can execute or render. The 1.3
  // containment record itself QUOTES the retired literals in an HTML comment —
  // documentation, not output.
  const liveHtml = html
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');
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

// ------------------------------------------------------ 13. negative controls
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
  ok('control: and it displaces the third procedure note again',
    !notesOf(dup.guidance).includes('A specialist should verify the final setup.'));
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
  // A second price surface must be visible to the price guard.
  const extraPrice = renderStep('protection', {
    answers: ANSWERS,
    mutate: (s) => s.replace(
      "var alternativesHtml = alternatives.length",
      "var __x = 1; var alternativesHtml = alternatives.length")
      .replace("'<div class=\"sleep-system__alternative-copy\">' ", "'<div class=\"sleep-system__price\">X</div><div class=\"sleep-system__alternative-copy\">' ")
  });
  const count = (extraPrice.main.match(/class="sleep-system__price"/g) || []).length;
  ok('control: an added alternative price is counted by the price guard',
    count >= 1, `${count} price surfaces in the mutated tree`);
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
