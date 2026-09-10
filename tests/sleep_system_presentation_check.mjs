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
//       no explicit customer-directed second-person pronouns in procedure
//       headings or notes (salesperson imperatives such as "Verifica" and
//       "Confirma" are intentionally allowed), customer copy byte-identical
//       to da4f746, and the per-alternative control's 44x44px touch floor
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
  statusKind: extractFunction('function sleepSystemStatusKind(status)'),
  posLabel: extractFunction('function adjustabilityPositionLabel(positionId)'),
  getDemo: extractFunction('function getAdjustabilityDemo()'),
  renderDemo: extractFunction('function renderAdjustabilityDemo()'),
  guidance: extractFunction('function sleepSystemGuidance(stepId, primary)'),
  rail: extractFunction('function renderSleepSystemRail()'),
  secondary: extractFunction('function sleepSystemSecondaryActions(stepId)'),
  // Candidate 2026-09-06: the three-state helpers the card and the setup
  // choices call (see section 17).
  decisionAttrs: extractFunction('function sleepSystemDecisionAttrs(decision, status)'),
  decisionBanner: extractFunction('function sleepSystemDecisionBanner(stepId, decision)'),
  choiceAttrs: extractFunction('function sleepSystemChoiceAttrs(active)'),
  handler: extractFunction('function handleSleepSystemAction(control)'),
  catalogLowProfile: extractFunction('function catalogHasLowProfileSupport()'),
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
    SRC.readGroups, SRC.decision, SRC.decisionLabel, SRC.statusKind, SRC.posLabel, SRC.getDemo, SRC.renderDemo,
    SRC.catalogLowProfile, SRC.guidance, SRC.rail, SRC.secondary, SRC.decisionAttrs, SRC.decisionBanner, SRC.choiceAttrs,
    SRC.supportGuide, SRC.pillowFit, SRC.suggestedGoal,
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
      scorer: scoreAccessoriesFromAnswers,
      suggestedGoal: getSuggestedProtectionGoal,
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
  // X2 (owner ruling D7, 2026-08-31): the completion fraction is retired —
  // the neutral phrase claims only what happened.
  ok('undecided: plan count reads "0 added · 0 addressed"', r.planCount === '0 added · 0 addressed', r.planCount);
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
  ok('selected: plan count advances to "1 added · 0 addressed" (X2)', r.planCount === '1 added · 0 addressed', r.planCount);
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
  // X2 (owner ruling D7, 2026-08-31): re-ruled. A deferral used to count as
  // addressed (1 / 4) — a claimed completion the customer never made. It now
  // counts toward NOTHING and renders as deferred, not done.
  ok('skipped: a deferral is claimed by neither number ("0 added · 0 addressed") and renders is-deferred',
    r.planCount === '0 added · 0 addressed' && /is-deferred/.test(r.rail) && /is-deferred/.test(r.plan), r.planCount);
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
    'Already protected', 'From $', 'Not decided', 'Add to plan', 'Add protector to plan',
    ' added · ', ' addressed']; // X2 count phrase
  const ES_MARKERS = ['Recomendado para probar', 'Vale la pena comparar', 'Opción de soporte',
    'También compara', 'Decidir después', 'Notas del especialista', 'Durante la prueba',
    'Conservar almohada actual', 'Ya está protegido', 'Desde $', 'Sin decidir',
    'Agregar al plan', 'Agregar protector al plan',
    ' agregado', ' atendido']; // X2 count phrase (covers the plurals as substrings)
  for (const step of STEP_IDS) {
    const en = renderStep(step, { answers: ANSWERS, lang: 'en' });
    const es = renderStep(step, { answers: ANSWERS, lang: 'es' });
    // X2: the count phrase joined the derived surfaces, so it joins the leak check.
    const enAll = textOf(en.main) + ' ' + textOf(en.guidance) + ' ' + textOf(en.rail) + ' ' + textOf(en.plan) + ' ' + en.planCount;
    const esAll = textOf(es.main) + ' ' + textOf(es.guidance) + ' ' + textOf(es.rail) + ' ' + textOf(es.plan) + ' ' + es.planCount;
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

// ------------------------------------- 14. accessory rationale follows the language
// Deployed-preview review (2026-09-08): add the recommended base and the
// Dri-Tec protector in English, open the Consultation Summary, switch to
// Spanish - the two rationale lines stayed English. Cause: setSleepSystemItem
// snapshotted the scorer's already-localized strings into the cart and
// renderHf2Accessories re-used them. The cart now stores reason KEYS and every
// surface resolves them in the current language through ACCESSORY_REASON_COPY.
// Executed here against the REAL extracted sources: the scorer (unchanged and
// fixture-pinned), the cart writer, the Summary renderer, the Plan / take-home
// projection and the resolvers, with a switchable currentLang.
section('accessory rationale follows the language (cart stores keys, surfaces resolve at read time)');
{
  const grab = (anchor) => { const s = extractFunction(anchor); if (!s) throw new Error('missing ' + anchor); return s; };
  const tableSrc = (() => {
    const start = html.indexOf('var ACCESSORY_REASON_COPY = {');
    const end = html.indexOf('\n    };', start);
    return start > 0 && end > start ? html.slice(start, end + '\n    };'.length) : null;
  })();
  ok('the keyed bilingual reason table exists once', !!tableSrc && (html.match(/var ACCESSORY_REASON_COPY = \{/g) || []).length === 1);
  const SRC_L10N = [
    tableSrc, grab('function accessoryReasonText(key, lang)'), grab('function accessoryReasonKey(text)'),
    SRC.STEPS, SRC.text, SRC.category, SRC.stepFor, SRC.qualify, SRC.scorer,
    grab('function setSleepSystemItem(itemId, shouldSelect)'), grab('function getSelectedAccessoryPlan()'),
    grab('function syncAccessoryAnalytics()'), grab('function renderHf2Accessories()'),
    grab('function renderHf2AccBlock(headingText, items, secondary)'), grab('function renderHf2AccCard(item, secondary)')
  ].join('\n');
  const makeL10nEnv = (mutate) => {
    // A tiny DOM: createElement / appendChild / textContent / className / innerHTML, enough for the card renderer.
    // innerHTML = '' must clear the children, as the real renderer relies on it to repaint.
    const mkEl = (tag) => { const el = { tag, className: '', textContent: '', _html: '', hidden: false, style: {}, children: [],
      appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, getAttribute() { return null; },
      querySelectorAll(sel) { const out = []; const cls = sel.replace(/^\./, ''); const walk = (n) => { n.children.forEach((c) => { if ((c.className || '').split(' ').includes(cls)) out.push(c); walk(c); }); }; walk(this); return out; } };
      Object.defineProperty(el, 'innerHTML', { get() { return this._html; }, set(v) { this._html = v; if (v === '') this.children = []; } });
      return el; };
    const els = new Map();
    const doc = { getElementById(id) { if (!els.has(id)) { const e = mkEl('div'); e.id = id; els.set(id, e); } return els.get(id); }, createElement: mkEl };
    doc.getElementById('hf2AccessoriesList').innerHTML = '';
    const win = { _accCart: {}, _sleepSystemState: { activeStep: 'adjustability', decisions: {}, demoPosition: '', supportChoice: '', pillowCandidateId: '', pillowReaction: '', pillowFeedback: '', protectionGoal: '' }, _updatePicksBadge: null };
    const analytics = { selectedAccessories: [], logged: [], log(e, d) { this.logged.push({ e, d }); } };
    let src = SRC_L10N;
    if (mutate) src = mutate(src);
    const api = new Function('document', 'window', 'answers', 'ACCESSORIES', 'analytics', 't', 'escapeHtml', 'renderSleepSystem',
      'var currentLang = "en";\n' + src + `
      return { setLang(l) { currentLang = l; }, setItem: setSleepSystemItem, render: renderHf2Accessories, plan: getSelectedAccessoryPlan,
               text: accessoryReasonText, key: accessoryReasonKey, table: ACCESSORY_REASON_COPY, scorer: scoreAccessoriesFromAnswers, analytics };`)(
      doc, win, { sleep_position: 'side', sleep_issues: ['back_pain'], health_conditions: ['snoring'], temperature: 'hot', firmness: 5, partner_sleep: 'partner', body_type: 'average', mattress_size: 'queen' },
      ACCESSORIES_JSON, analytics, (k) => k, (s) => s, () => {});
    const lines = () => doc.getElementById('hf2AccessoriesList').querySelectorAll('.hf2-acc-card__reason').map((e) => e.textContent);
    return { api, win, doc, lines, analytics };
  };
  const EN = { back: 'Targets the back pain you mentioned', hot: 'Addresses your temperature concerns' };
  const ES = { back: 'Se enfoca en el dolor de espalda que mencionaste', hot: 'Aborda tus preocupaciones de temperatura' };

  // parity: the scorer's reasonMap and the keyed table carry the same twelve lines in both languages
  {
    const literal = stripComments(SRC.scorer).match(/const reasonMap = \{([\s\S]*?)\n\s*\};/);
    ok('the scorer still carries its own literal reasonMap (fixture-pinned, self-contained)', !!literal);
    const pairs = [...(literal ? literal[1] : '').matchAll(/'([a-z_]+)':\s*_es \? '((?:[^'\\]|\\.)*)' : '((?:[^'\\]|\\.)*)'/g)]
      .map((m) => [m[1], m[3].replace(/\\'/g, "'"), m[2].replace(/\\'/g, "'")]);
    const env0 = makeL10nEnv();
    const table = env0.api.table;
    ok('the scorer map and the keyed table have the same twelve keys',
      pairs.length === 12 && Object.keys(table).length === 12 && pairs.every(([k]) => k in table), pairs.map((p) => p[0]).join(','));
    ok('every English line matches between the scorer map and the keyed table', pairs.every(([k, en]) => table[k] && table[k].en === en),
      pairs.filter(([k, en]) => !table[k] || table[k].en !== en).map(([k]) => k).join(','));
    ok('every Spanish line matches between the scorer map and the keyed table', pairs.every(([k, , es]) => table[k] && table[k].es === es),
      pairs.filter(([k, , es]) => !table[k] || table[k].es !== es).map(([k]) => k).join(','));
    const texts = Object.values(table).flatMap((c) => [c.en, c.es]);
    ok('no two keys share a line in either language (the selection-time reverse lookup is unambiguous)', new Set(texts).size === texts.length);
    ok('accessoryReasonKey() recovers the key from either language and returns "" for unknown text',
      env0.api.key(EN.back) === 'back_pain' && env0.api.key(ES.back) === 'back_pain' && env0.api.key(ES.hot) === 'hot' && env0.api.key('not a reason') === '');
    ok('accessoryReasonText() resolves the current language and falls back to English for an unknown language',
      env0.api.text('hot') === EN.hot && env0.api.text('hot', 'es') === ES.hot && env0.api.text('hot', 'xx') === EN.hot && env0.api.text('nope') === '');
  }

  // the journey: add in EN, read the Summary, switch to ES, switch back
  {
    const env = makeL10nEnv();
    env.api.setItem('base-tempur-ergo', true);
    env.api.setItem('protector-dritec', true);
    const cart = env.win._accCart;
    ok('the cart stores reason KEYS for the base (back pain, then snoring from the health answer) and the protector (hot), not a language\'s text',
      JSON.stringify(cart['base-tempur-ergo'].reasonKeys) === '["back_pain","snoring"]' && JSON.stringify(cart['protector-dritec'].reasonKeys) === '["hot"]'
      && !('reasons' in cart['base-tempur-ergo']) && !('reasons' in cart['protector-dritec']),
      JSON.stringify({ base: cart['base-tempur-ergo'].reasonKeys, protector: cart['protector-dritec'].reasonKeys }));
    const state = () => JSON.stringify({ cart: env.win._accCart, decisions: env.win._sleepSystemState.decisions });
    const s0 = state();
    env.api.render();
    ok('EN Summary: the two rationale lines are the English lines', JSON.stringify(env.lines().sort()) === JSON.stringify([EN.hot, EN.back].sort()), JSON.stringify(env.lines()));
    ok('EN plan / take-home projection carries the English lines', JSON.stringify(env.api.plan().map((a) => a.reason).sort()) === JSON.stringify([EN.hot, EN.back].sort()));
    env.api.setLang('es');
    env.api.render();
    ok('ES Summary after the switch: both rationale lines are Spanish (the reported defect)', JSON.stringify(env.lines().sort()) === JSON.stringify([ES.hot, ES.back].sort()), JSON.stringify(env.lines()));
    ok('ES Summary: no English rationale survives the switch', !env.lines().some((l) => l === EN.back || l === EN.hot));
    ok('ES plan / take-home projection follows the switch', JSON.stringify(env.api.plan().map((a) => a.reason).sort()) === JSON.stringify([ES.hot, ES.back].sort()));
    env.api.setLang('en');
    env.api.render();
    ok('EN again: the lines return to English', JSON.stringify(env.lines().sort()) === JSON.stringify([EN.hot, EN.back].sort()));
    ok('the cart and the Sleep System decisions are byte-identical across EN -> ES -> EN', state() === s0);
  }

  // hostile negative control: a cart entry poisoned with cached English text must not leak
  {
    const env = makeL10nEnv();
    env.win._accCart['base-tempur-ergo'] = { id: 'base-tempur-ergo', name: 'TEMPUR-Ergo 3.0 Power Base', category: 'Foundations & Support', imageUrl: '', reasons: [EN.back], reasonKeys: ['back_pain'] };
    env.win._accCart['protector-dritec'] = { id: 'protector-dritec', name: 'Bedgear Dri-Tec Mattress Protector', category: 'Protectors', imageUrl: '', reasons: [EN.hot], reasonKeys: ['hot'] };
    env.api.setLang('es');
    env.api.render();
    ok('hostile: cached English text on the cart entry is ignored - the Spanish Summary renders Spanish from the keys',
      JSON.stringify(env.lines().sort()) === JSON.stringify([ES.hot, ES.back].sort()) && !env.lines().some((l) => /you mentioned|your temperature/.test(l)), JSON.stringify(env.lines()));
    ok('hostile: the plan projection ignores the cached text too', env.api.plan().every((a) => a.reason === ES.back || a.reason === ES.hot));
    // negative control of the detector: the OLD renderer (cart[a.id].reasons) would show the stale English
    const old = makeL10nEnv((src) => src.replace(
      "reasons: (cart[a.id].reasonKeys || []).map(function(key) { return accessoryReasonText(key); })",
      'reasons: cart[a.id].reasons || []'));
    old.win._accCart['base-tempur-ergo'] = { id: 'base-tempur-ergo', reasons: [EN.back], reasonKeys: ['back_pain'] };
    old.api.setLang('es');
    old.api.render();
    ok('negative control: the pre-fix renderer is detected (it shows the cached English line under Spanish)', old.lines()[0] === EN.back, JSON.stringify(old.lines()));
    // negative control: a writer that stores strings instead of keys leaves the Summary without a line
    const strWriter = makeL10nEnv((src) => src.replace(
      'reasonKeys: scored ? scored.reasons.slice(0, 2).map(accessoryReasonKey).filter(Boolean) : []',
      'reasons: scored ? scored.reasons.slice(0, 2) : []'));
    strWriter.api.setItem('base-tempur-ergo', true);
    strWriter.api.setLang('es');
    strWriter.api.render();
    ok('negative control: a cart writer that stores localized strings is detected (no rationale line renders)', strWriter.lines().length === 0, JSON.stringify(strWriter.lines()));
  }
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

  // C4 — the per-alternative "Add" control (review correction, owner ruling
  // 2026-08-25). The visual pass measured it at 40x45px, under the 44px touch
  // floor. Both minimums are pinned on the BASE rule (the first
  // `.sleep-system__alternative button {` rule; the <=680px override only
  // repositions it); padding, type and placement are asserted unchanged.
  const altButton = cssRule(css, '.sleep-system__alternative button');
  const minPx = (rule, prop) => { const m = rule.match(new RegExp(prop + ':\\s*(\\d+)px')); return m ? Number(m[1]) : null; };
  pin('C4: the alternative Add control declares min-width >= 44px',
    minPx(altButton, 'min-width') !== null && minPx(altButton, 'min-width') >= 44,
    `min-width ${minPx(altButton, 'min-width')}px`);
  pin('C4: the alternative Add control declares min-height >= 44px',
    minPx(altButton, 'min-height') !== null && minPx(altButton, 'min-height') >= 44,
    `min-height ${minPx(altButton, 'min-height')}px`);
  pin('C4: its padding, type and pointer semantics are unchanged (8px 11px, 700 11px/1.2, manipulation)',
    /padding:\s*8px 11px;/.test(altButton) && /font:\s*700 11px\/1\.2/.test(altButton) &&
    /touch-action:\s*manipulation;/.test(altButton));

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
  // 3.7 P9 (owner ruling 2026-08-30, Option C): approved EN; ES provisional.
  { step: 'pillow', state: { pillowFeedback: 'low' },
    en: 'If the pillow feels too low, compare another pillow, then retest.',
    es: 'Si la almohada se siente muy baja, compara otra almohada y vuelve a probar.' },
  { step: 'pillow', state: { pillowFeedback: 'high' },
    en: 'If the pillow feels too high, compare another pillow, then retest.',
    es: 'Si la almohada se siente muy alta, compara otra almohada y vuelve a probar.' },
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

// 14d — the invariant, precisely: NO EXPLICIT CUSTOMER-DIRECTED SECOND-PERSON
// PRONOUNS APPEAR IN PROCEDURE HEADINGS OR NOTES. It is a pronoun check, not a
// ban on the second person as a grammatical category: Spanish salesperson-
// directed imperatives ("Verifica", "Confirma", "Revisa") are the procedure
// voice and are intentionally allowed — they instruct the salesperson and
// carry no pronoun. JS `\b` is ASCII-only, so the Spanish test uses Unicode
// letter boundaries: "detente" must not match `te`, and "tú" must match.
// `usted` is included — formal address is still customer-directed address.
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
  ['Recommended to try', 'Recomendado para probar'],
  ['Worth comparing', 'Vale la pena comparar'],
  ['Details', 'Ver detalles'],
  ['Try this', 'Probar esta'],
  ['Selected', 'Seleccionado'],
  ['Add', 'Agregar'],
  ['Viewing an alternative', 'Viendo una alternativa'],
  ['Back to recommended', 'Volver a la recomendada'],
  ['Current setup', 'Configuración actual'],
  ['Keep it, then confirm compatibility', 'Conservalo y confirma compatibilidad'],
  ['No new support is being added. Your specialist can confirm that the current frame, platform, or slats meet the mattress requirements.', 'No se agregara un soporte nuevo. Tu especialista puede confirmar que el marco, plataforma o tablillas cumplen los requisitos.'],
  ['Specialist check', 'Revisión del especialista'],
  ['Confirm the setup before adding support', 'Confirma la configuración antes de agregar soporte'],
  ['A quick frame and slat check will determine whether the current setup works or whether a foundation is needed.', 'Una revisión rápida del marco y las tablillas determinara si la configuración actual funciona o si necesita una base.'],
  ['Optional base demo', 'Demostración opcional de base'],
  ['Optional base demo', 'Demostración opcional de base'],
  ['Try the positions first', 'Prueba las posiciones primero'],
  ['Your answers do not point to a specific adjustable base. Try the positions, then compare a base only if the movement improves your comfort.', 'Tus respuestas no apuntan a una base ajustable en particular. Prueba las posiciones y compara una base solo si el movimiento mejora tu comodidad.'],
  ['Bases to compare', 'Bases para comparar'],
  ['Selected', 'Seleccionado'],
  ['Add to plan', 'Agregar al plan'],
  ['Ask for a demo', 'Pedir demostración'],
  ['Decide later', 'Decidir después'],
  ['Specialist notes', 'Notas del especialista'],
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
  // F2 (final-gate finding, Blake, 2026-09-10): five pairs added - the
  // displaced recommendation's tag reuses the two eyebrow pairs, plus Details,
  // Viewing an alternative, Back to recommended. Owner-requested; ES provisional
  // (Invariant 12) until the native review.
  ok('renderSleepSystemMain carries exactly the da4f746 bilingual literals minus the retired eyebrow plus the nine owner-approved P5 pairs plus the five F2 pairs (order and bytes)',
    JSON.stringify(mainLits) === JSON.stringify(MAIN_LITERALS_AT_DA4F746),
    `${mainLits.length} literal pairs (da4f746: 33, one retired, nine P5 pairs added 2026-08-30, five F2 pairs added 2026-09-10)`);
  ok('sleepSystemSecondaryActions labels are byte-identical to da4f746',
    JSON.stringify(literalsOf(SRC.secondary)) === JSON.stringify(SECONDARY_LITERALS_AT_DA4F746));
  // X3 (owner ruling D7, 2026-08-31): re-ruled from "Best for" — the
  // superlative 1.4 forbids — to "Suggested for" / "Sugerido para"
  // (ES provisional).
  ok('the protection eyebrow prefix is the ruled "Suggested for " / "Sugerido para " (X3)',
    /en: 'Suggested for ' \+ sleepSystemText\(protectionGoalLabel/.test(stripComments(SRC.main)) &&
    /es: 'Sugerido para ' \+ sleepSystemText\(protectionGoalLabel/.test(stripComments(SRC.main)));
  // And rendered, so the pin is on output as well as source.
  const EYEBROWS = {
    en: { adjustability: /^(Recommended to try|Worth comparing)$/, support: /^Support option$/, protection: /^Suggested for .+$/ },
    es: { adjustability: /^(Recomendado para probar|Vale la pena comparar)$/, support: /^Opción de soporte$/, protection: /^Sugerido para .+$/ }
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

// --------------------------------------- 14c. F2: viewing a non-recommended option
// Final-gate finding F2 (Blake, mounted iPad, 2026-09-10): "see more details of
// the other adjustable and pillow options". A viewed alternative takes the
// featured card with its full treatment; viewing decides nothing; the engine's
// first pick stays in the list with its honest tag; "Back to recommended"
// restores the order; a view is per step and is wiped. Pillows keep "Try this".
section('F2 - viewing a non-recommended option');
{
  // The rendered name, as the renderer escapes it (Chattam & Wells -> &amp;).
  const sleepSystemName = (item, lang) => {
    const raw = (item.name && typeof item.name === 'object') ? (item.name[lang] || item.name.en) : item.name;
    return String(raw).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };
  for (const lang of ['en', 'es']) {
    for (const step of ['adjustability', 'support', 'protection']) {
      const base = renderStep(step, { answers: ANSWERS, lang });
      const [top, ...rest] = base.groups[step];
      if (!rest.length) {
        // A single-item group (support under the harness answers) has nothing
        // to view: no Details control renders and a view id is ignored.
        const lone = renderStep(step, { answers: ANSWERS, lang, state: { viewCandidateId: top.id } });
        ok(`[${lang}/${step}] a single-item group offers no Details control and ignores a view id`,
          !base.main.includes('data-sleep-action="view-item"') && !lone.main.includes('sleep-system__viewing')
          && grab(featuredBody(lone.main), 'sleep-system__featured-name') === sleepSystemName(top, lang));
        continue;
      }
      const details = (base.main.match(/data-sleep-action="view-item"/g) || []).length;
      const rows = (base.main.match(/class="sleep-system__alternative"/g) || []).length;
      ok(`[${lang}/${step}] every alternative row carries a Details control and no viewing line shows`,
        details === rows && rows >= 1 && !base.main.includes('sleep-system__viewing'), `${details}/${rows}`);
      const viewed = renderStep(step, { answers: ANSWERS, lang, state: { viewCandidateId: rest[0].id } });
      const body = featuredBody(viewed.main);
      ok(`[${lang}/${step}] the viewed alternative takes the featured card (name, image, benefit line, price)`,
        grab(body, 'sleep-system__featured-name') === sleepSystemName(rest[0], lang)
        && (viewed.main.match(/class="sleep-system__price"/g) || []).length === 1);
      ok(`[${lang}/${step}] the card names the viewing state and offers the way back`,
        viewed.main.includes('sleep-system__viewing') && viewed.main.includes('data-sleep-action="view-recommended"'));
      const eyebrow = grab(body, 'sleep-system__card-eyebrow') || '';
      ok(`[${lang}/${step}] the viewed card never claims "Recommended to try" (3.7 P2 stays with the engine's first pick)`,
        !/Recommended to try|Recomendado para probar/.test(eyebrow), eyebrow);
      const alts = [...viewed.main.matchAll(/alternative-name">([^<]*)<\/div><div class="sleep-system__alternative-copy">([^<]*)</g)].map((m) => m[1]);
      ok(`[${lang}/${step}] the engine's first pick is now in the list, tagged, and no alternative carries an eyebrow or a price`,
        alts.includes(sleepSystemName(top, lang)) && viewed.main.includes('sleep-system__alternative-tag')
        && !/sleep-system__alternative[\s\S]*sleep-system__card-eyebrow/.test(viewed.main)
        && !/sleep-system__alternative[\s\S]*?sleep-system__price/.test(viewed.main));
      ok(`[${lang}/${step}] viewing decides nothing (no decision recorded, cart untouched)`,
        Object.keys(viewed.env.win._sleepSystemState.decisions).length === 0 && Object.keys(viewed.env.win._accCart).length === 0);
      const unknown = renderStep(step, { answers: ANSWERS, lang, state: { viewCandidateId: 'no-such-item' } });
      ok(`[${lang}/${step}] an unknown view id changes nothing`, grab(featuredBody(unknown.main), 'sleep-system__featured-name') === sleepSystemName(top, lang)
        && !unknown.main.includes('sleep-system__viewing'));
    }
    const pillow = renderStep('pillow', { answers: ANSWERS, lang });
    const pillowAlt = pillow.groups.pillow[1];
    const pillowViewed = pillowAlt ? renderStep('pillow', { answers: ANSWERS, lang, state: { viewCandidateId: pillowAlt.id } }) : pillow;
    ok(`[${lang}] the pillow step keeps "Try this" and ignores a view id (no Details control, no viewing line)`,
      !pillow.main.includes('data-sleep-action="view-item"') && !pillowViewed.main.includes('sleep-system__viewing')
      && grab(featuredBody(pillowViewed.main), 'sleep-system__featured-name') === sleepSystemName(pillow.groups.pillow[0], lang));
  }
  // The handler: view-item sets the id, view-recommended clears it, a step change clears it.
  const HANDLER = extractFunction('function handleSleepSystemAction(control)');
  const MOVE = extractFunction('function moveSleepSystemStep(direction)');
  function drive(action, attrs, state) {
    const win = { _accCart: {}, _sleepSystemState: Object.assign({ activeStep: 'adjustability', decisions: {}, demoPosition: '', supportChoice: '',
      pillowCandidateId: '', viewCandidateId: '', pillowReaction: '', pillowFeedback: '', protectionGoal: '' }, state || {}) };
    const src = [SRC.category, SRC.stepFor, SRC.qualify, SRC.scorer, SRC.readGroups, HANDLER, MOVE].join('\n');
    new Function('window', 'answers', 'currentLang', 'ACCESSORIES', 'analytics', 'control', 'SLEEP_SYSTEM_STEPS', 'document',
      src + `
      function syncAccessoryAnalytics() {}
      function renderSleepSystem() {}
      handleSleepSystemAction(control);`)(
      win, ANSWERS, 'en', ACCESSORIES_JSON, { log() {} },
      { getAttribute: (k) => (k === 'data-sleep-action' ? action : (attrs || {})[k] || null) },
      makeEnv({ answers: ANSWERS }).api.STEPS, { getElementById: () => null });
    return win._sleepSystemState;
  }
  ok('view-item records the viewed id and nothing else', (() => { const s = drive('view-item', { 'data-item-id': 'base-x' }); return s.viewCandidateId === 'base-x' && Object.keys(s.decisions).length === 0; })());
  ok('view-recommended clears it', drive('view-recommended', {}, { viewCandidateId: 'base-x' }).viewCandidateId === '');
  ok('a rail step change clears it', drive('step', { 'data-step': 'support' }, { viewCandidateId: 'base-x' }).viewCandidateId === '');
  ok('next-step clears it', drive('next-step', {}, { viewCandidateId: 'base-x' }).viewCandidateId === '');
  ok('the initial Sleep System state declares viewCandidateId and the wipe resets it',
    /viewCandidateId: '',/.test(html.slice(html.indexOf('window._sleepSystemState = {'), html.indexOf('window._sleepSystemState = {') + 1200))
    && (html.match(/viewCandidateId: '',/g) || []).length === 2);
}

// ------------------------------------------------------ 15. negative controls
// --------------------------------------------- 14b. 3.7 P2 badge honesty
// Owner ruling 2026-08-30 (docs/accessory-recommendation-audit-2026-08-30.md,
// P2): "Recommended to try" requires an ANSWER-DERIVED match. The hero is the
// group's best item, so it always meets the relative 60% threshold - the gel
// pillow does so on its catalog default score alone for every non-hot back /
// stomach / combo sleeper, and used to be badged as recommended beside the
// neutral "A solid option..." line. The badge now keys on `matched`. Rendered
// through the real renderer; ranking and groups are asserted UNCHANGED.
section('3.7 P2 - "Recommended to try" requires an answer-derived match (rendered)');
{
  // P3 (stacked on P2) ranks a matched pillow first, so a non-hot BACK sleeper
  // now heroes the matched Flow; the unmatched-hero cases are the sleepers no
  // pillow matches - stomach and combo (no position_stomach / position_combo
  // weight exists in the catalog).
  const COMBO = { sleep_position: 'combo', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const STOMACH = { sleep_position: 'stomach', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const SIDE_ONLY = { sleep_position: 'side', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const NO_TRIGGER = SIDE_ONLY;
  const BACK_PAIN = { sleep_position: 'side', temperature: 'comfortable', sleep_issues: ['back_pain'], health_conditions: ['none'] };
  const BADGE = {
    en: { rec: 'Recommended to try', worth: 'Worth comparing', neutral: 'A solid option to round out your sleep system' },
    es: { rec: 'Recomendado para probar', worth: 'Vale la pena comparar', neutral: 'Una buena opción para completar tu sistema de sueño' }
  };
  for (const lang of ['en', 'es']) {
    const b = BADGE[lang];
    for (const [label, answers] of [['combo sleeper', COMBO], ['stomach sleeper', STOMACH]]) {
      const r = renderStep('pillow', { answers, lang });
      const hero = r.groups.pillow[0];
      const eyebrow = grab(featuredBody(r.main), 'sleep-system__card-eyebrow');
      const reason = grab(featuredBody(r.main), 'sleep-system__featured-reason');
      ok(`[${lang}/pillow/${label}] the hero is unmatched (no answer fired) yet the group's best item`,
        hero && hero.matched === false && hero.meetsMatchThreshold === true, hero && `${hero.id} matched=${hero.matched} T=${hero.meetsMatchThreshold}`);
      ok(`[${lang}/pillow/${label}] an unmatched hero is badged "${b.worth}", never "${b.rec}"`,
        eyebrow === b.worth, JSON.stringify(eyebrow));
      ok(`[${lang}/pillow/${label}] its reason line is the neutral one (the badge and the reason agree)`,
        reason === b.neutral, JSON.stringify(reason));
    }
    {
      const r = renderStep('pillow', { answers: SIDE_ONLY, lang });
      const hero = r.groups.pillow[0];
      const eyebrow = grab(featuredBody(r.main), 'sleep-system__card-eyebrow');
      ok(`[${lang}/pillow/side sleeper] a matched hero keeps "${b.rec}"`,
        hero && hero.matched === true && eyebrow === b.rec, `${hero && hero.id} ${JSON.stringify(eyebrow)}`);
    }
    {
      const none = renderStep('adjustability', { answers: NO_TRIGGER, lang });
      const some = renderStep('adjustability', { answers: BACK_PAIN, lang });
      // 3.7 P5 (owner ruling 2026-08-30): a no-trigger customer gets NO hero on
      // this step at all - the neutral base-compare block renders instead (its
      // own section below asserts the details). The unmatched-hero badge rule
      // stays observed through the pillow cases above.
      ok(`[${lang}/adjustability] no trigger -> no hero card at all; the neutral compare block renders (P5)`,
        none.groups.adjustability[0].matched === false && featuredBody(none.main) === null &&
          /sleep-system__bases-compare/.test(none.main));
      ok(`[${lang}/adjustability] back pain -> matched base hero badged "${b.rec}"`,
        some.groups.adjustability[0].matched === true && grab(featuredBody(some.main), 'sleep-system__card-eyebrow') === b.rec);
    }
  }
  // Presentation only: the engine's groups for these answer sets are the same
  // objects the badge used to read - ids, order, scores and threshold stamps
  // are unchanged by this rule (the Phase 1 output-regression fixture pins
  // them independently; this is the local statement of the same invariant).
  const stomach = renderStep('pillow', { answers: STOMACH });
  ok('P2 moves no ranking: the stomach sleeper\'s pillow group is still gel (2, T) then Flow (0, f)',
    JSON.stringify(stomach.groups.pillow.map((a) => [a.id, a.score, a.meetsMatchThreshold])) ===
      JSON.stringify([['pillow-gel-memory', 2, true], ['pillow-flow', 0, false]]),
    JSON.stringify(stomach.groups.pillow.map((a) => [a.id, a.score, a.meetsMatchThreshold])));
  // Negative control: re-key the badge on the relative threshold (the shipped
  // pre-P2 rule) and the back-sleeper assertion must fail.
  const reverted = renderStep('pillow', {
    answers: STOMACH,
    mutate: (s) => {
      // The extracted source keeps index.html's own line endings (CRLF on
      // Windows checkouts), so the anchor tolerates either.
      // F2 (2026-09-10) added `&& !viewing` to the badge condition; the anchor
      // follows the shipped line.
      const from = /: \(primary\.matched && !viewing(\r?\n)/;
      if (!from.test(s)) throw new Error('P2 negative control: anchor not found');
      return s.replace(from, ': (primary.meetsMatchThreshold && !viewing$1');
    }
  });
  ok('negative control: keying the badge on meetsMatchThreshold again re-badges the unmatched hero as recommended',
    grab(featuredBody(reverted.main), 'sleep-system__card-eyebrow') === 'Recommended to try');
}

// --------------------------------------------- 14c. 3.7 P3 matched-first pillow
// Owner ruling 2026-08-30 (P3): a matched pillow ranks above an unmatched
// default-score pillow. The drawer's finalist prompt reads the first MATCHED
// pillow in scorer order; the Sleep System hero is the pillow group's first
// item. Before P3 they disagreed for every non-hot back sleeper (prompt Flow,
// hero gel). Rendered through the real renderer with the real engine groups.
section('3.7 P3 - a matched pillow ranks above an unmatched default-score pillow (rendered; prompt and hero agree)');
{
  const BACK_ONLY = { sleep_position: 'back', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const BACK_REFLUX = { sleep_position: 'back', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['reflux'] };
  const SIDE_ONLY = { sleep_position: 'side', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const SIDE_HOT = { sleep_position: 'side', temperature: 'hot', sleep_issues: ['none'], health_conditions: ['none'] };
  const STOMACH = { sleep_position: 'stomach', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const promptPillowOf = (env) => {
    const p = env.api.scorer().find((a) => a.matched && sleepSystemCategoryEn(a) === 'Pillows');
    return p ? p.id : null;
  };
  function sleepSystemCategoryEn(a) { return typeof a.category === 'object' ? a.category.en : a.category; }
  const REASON = {
    en: { back: 'Optimized for back sleepers', side: 'Matched to your side sleeping position', rec: 'Recommended to try' },
    es: { back: 'Optimizado para los que duermen boca arriba', side: 'Adaptado a tu posición de dormir de lado', rec: 'Recomendado para probar' }
  };
  for (const lang of ['en', 'es']) {
    for (const [label, answers] of [['back sleeper', BACK_ONLY], ['back sleeper with reflux', BACK_REFLUX]]) {
      const r = renderStep('pillow', { answers, lang });
      const hero = r.groups.pillow[0];
      const eyebrow = grab(featuredBody(r.main), 'sleep-system__card-eyebrow');
      const reason = grab(featuredBody(r.main), 'sleep-system__featured-reason');
      ok(`[${lang}/pillow/${label}] the matched Flow (position_back) is the hero ahead of the default-score gel pillow`,
        hero && hero.id === 'pillow-flow' && hero.matched === true &&
          r.groups.pillow[1] && r.groups.pillow[1].id === 'pillow-gel-memory' && r.groups.pillow[1].matched === false,
        JSON.stringify(r.groups.pillow.map((a) => [a.id, a.score, a.matched, a.meetsMatchThreshold])));
      ok(`[${lang}/pillow/${label}] the hero card is badged "${REASON[lang].rec}" with the back-sleeper reason (P2 + P3 together)`,
        eyebrow === REASON[lang].rec && reason === REASON[lang].back, `${JSON.stringify(eyebrow)} ${JSON.stringify(reason)}`);
      ok(`[${lang}/pillow/${label}] the drawer's finalist-prompt pillow and the Sleep System hero are the SAME pillow`,
        promptPillowOf(r.env) === hero.id, `prompt=${promptPillowOf(r.env)} hero=${hero.id}`);
      ok(`[${lang}/pillow/${label}] the threshold stamp is untouched (Flow 1 < 60% of the gel pillow's 2 stays false)`,
        hero.meetsMatchThreshold === false && r.groups.pillow[1].meetsMatchThreshold === true);
    }
    for (const [label, answers, heroId] of [['side sleeper', SIDE_ONLY, 'pillow-gel-memory'], ['hot side sleeper', SIDE_HOT, 'pillow-flow']]) {
      const r = renderStep('pillow', { answers, lang });
      ok(`[${lang}/pillow/${label}] unchanged: hero ${heroId} is matched and equals the prompt pillow`,
        r.groups.pillow[0].id === heroId && r.groups.pillow[0].matched === true && promptPillowOf(r.env) === heroId,
        `hero=${r.groups.pillow[0].id} prompt=${promptPillowOf(r.env)}`);
    }
    {
      const r = renderStep('pillow', { answers: STOMACH, lang });
      ok(`[${lang}/pillow/stomach sleeper] no matched pillow -> no prompt, gel stays the (unmatched) hero, order unchanged`,
        promptPillowOf(r.env) === null && r.groups.pillow[0].id === 'pillow-gel-memory' && r.groups.pillow[0].matched === false);
    }
  }
  // Pillow group only: adjustability, support and protection orders are the
  // engine's pre-P3 orders for the same answer sets.
  {
    const r = renderStep('adjustability', { answers: BACK_REFLUX });
    ok('P3 touches only the pillow group: the adjustability order for a reflux customer is still Ergo, BT2000, BT3000',
      JSON.stringify(r.groups.adjustability.map((a) => a.id)) === JSON.stringify(['base-tempur-ergo', 'base-bt2000', 'base-bt3000']),
      JSON.stringify(r.groups.adjustability.map((a) => a.id)));
    const p = renderStep('protection', { answers: SIDE_HOT });
    ok('P3 touches only the pillow group: the hot sleeper\'s protection order is still Ver-Tex, Dri-Tec',
      JSON.stringify(p.groups.protection.map((a) => a.id)) === JSON.stringify(['protector-vertex', 'protector-dritec']));
  }
  // Negative control: neutralise the comparator and the back sleeper's hero
  // reverts to the gel pillow, disagreeing with the prompt again.
  const reverted = renderStep('pillow', {
    answers: BACK_ONLY,
    mutate: (s) => {
      const from = 'return (b.matched ? 1 : 0) - (a.matched ? 1 : 0);';
      if (!s.includes(from)) throw new Error('P3 negative control: anchor not found');
      return s.replace(from, 'return 0;');
    }
  });
  ok('negative control: neutralising the matched-first comparator puts the gel pillow back ahead of the prompt\'s Flow',
    reverted.groups.pillow[0].id === 'pillow-gel-memory' && promptPillowOf(reverted.env) === 'pillow-flow');
}

// --------------------------------------------- 14d. 3.7 P1 heat parity
// Owner ruling 2026-08-30 (P1): `sleep_issues` containing `hot` is the same
// heat signal the accessory scorer and the protection-goal chooser use for
// `temperature: hot`. Rendered through the real renderer; parity is asserted
// as identical engine groups for the two ways of saying heat.
section('3.7 P1 - sleep_issues "hot" is the same heat signal as temperature "hot" (scorer + protection goal)');
{
  const ISSUE_ONLY = { sleep_position: 'side', temperature: 'comfortable', sleep_issues: ['hot'], health_conditions: ['none'] };
  const TEMP_ONLY = { sleep_position: 'side', temperature: 'hot', sleep_issues: ['none'], health_conditions: ['none'] };
  const BOTH = { sleep_position: 'side', temperature: 'hot', sleep_issues: ['hot'], health_conditions: ['none'] };
  const NEITHER = { sleep_position: 'side', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const HEAT_ONLY_DEFAULTS = { sleep_issues: ['hot'] };
  const slim = (groups) => JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.map((a) => [a.id, a.score, a.matched, a.meetsMatchThreshold])])));
  const HOT_REASON = { en: 'You reported sleeping hot', es: 'Reportaste dormir caliente' };
  const COOL_BADGE = { en: 'Suggested for cooling', es: 'Sugerido para frescura' }; // X3 re-rule
  for (const lang of ['en', 'es']) {
    const issue = renderStep('pillow', { answers: ISSUE_ONLY, lang });
    const temp = renderStep('pillow', { answers: TEMP_ONLY, lang });
    const both = renderStep('pillow', { answers: BOTH, lang });
    ok(`[${lang}] parity: heat said only as a sleep issue produces the SAME engine groups as heat said only as the temperature`,
      slim(issue.groups) === slim(temp.groups), slim(issue.groups));
    ok(`[${lang}] parity: saying it both ways is not double-counted (groups identical to either alone)`,
      slim(both.groups) === slim(temp.groups));
    ok(`[${lang}/pillow/issue-only] the Flow is the hero on the cooling weights with the heat reason present`,
      issue.groups.pillow[0].id === 'pillow-flow' && issue.groups.pillow[0].score === 7 &&
        issue.groups.pillow[0].reasons.includes(HOT_REASON[lang]),
      JSON.stringify(issue.groups.pillow[0].reasons));
    ok(`[${lang}] the suggested protection goal is cooling for the issue-only customer (same as temperature-only)`,
      issue.env.api.suggestedGoal() === 'cooling' && temp.env.api.suggestedGoal() === 'cooling');
    const prot = renderStep('protection', { answers: ISSUE_ONLY, lang });
    ok(`[${lang}/protection/issue-only] Ver-Tex is the hero, badged "${COOL_BADGE[lang]}"`,
      prot.groups.protection[0].id === 'protector-vertex' && grab(featuredBody(prot.main), 'sleep-system__card-eyebrow') === COOL_BADGE[lang],
      JSON.stringify(grab(featuredBody(prot.main), 'sleep-system__card-eyebrow')));
    const none = renderStep('pillow', { answers: NEITHER, lang });
    ok(`[${lang}] a customer who says heat neither way is unchanged (gel hero on the side-position weight, everyday goal)`,
      none.groups.pillow[0].id === 'pillow-gel-memory' && none.groups.pillow[0].score === 3 && none.env.api.suggestedGoal() === 'everyday');
  }
  {
    const d = renderStep('pillow', { answers: HEAT_ONLY_DEFAULTS });
    ok('the focused heat-only scenario on engine defaults surfaces the cooling pillows (Flow 6, gel 6) and the cooling goal',
      JSON.stringify(d.groups.pillow.map((a) => [a.id, a.score, a.matched])) === JSON.stringify([['pillow-flow', 6, true], ['pillow-gel-memory', 6, true]])
        && d.env.api.suggestedGoal() === 'cooling',
      JSON.stringify(d.groups.pillow.map((a) => [a.id, a.score, a.matched])));
  }
  // Negative control: read only the temperature answer again and the
  // issue-only customer loses the cooling pillow and the cooling goal.
  const reverted = renderStep('pillow', {
    answers: ISSUE_ONLY,
    mutate: (s) => {
      const from = "const hotSleeper = temp === 'hot' || issues.includes('hot');";
      if (!s.includes(from)) throw new Error('P1 negative control: anchor not found');
      return s.replace(from, "const hotSleeper = temp === 'hot';");
    }
  });
  ok('negative control: reading only the temperature answer drops the issue-only customer back to the gel pillow on position alone',
    reverted.groups.pillow[0].id === 'pillow-gel-memory' && reverted.groups.pillow[0].score === 3);
}

// --------------------------------------------- 14e. 3.7 P9 Option C
// Owner ruling 2026-08-30: the pillow-fit copy and the support guidance named
// a low-profile pillow, an adjustable-fill pillow and lower foundation heights
// the Lacks catalog does not carry (WG&R template artifacts), and the
// pillow-reaction handler looked up two WG&R product ids that do not exist,
// so "Too low" / "Too high" re-offered the same pillow. Rendered through the
// real renderer; the handler is exercised through the real
// handleSleepSystemAction() with a fake control.
section('3.7 P9 Option C - copy names only what the catalog holds; the reaction handler offers the other cataloged pillow; the height choice follows the catalog');
{
  const APPROVED = {
    en: {
      low: 'Try another pillow on this mattress and compare the height, then record the fit again.',
      high: 'Try another pillow on this mattress, then check whether your chin and neck feel neutral.',
      stomach: 'Check that the neck stays level rather than bending upward.',
      heightNote: 'If a lower finished bed height matters, ask which foundation heights are available.',
      compareNote: 'Compare standard and lower bed heights.'
    },
    es: {
      low: 'Prueba otra almohada en este colchón y compara la altura; luego vuelve a registrar el ajuste.',
      high: 'Prueba otra almohada en este colchón y revisa si la barbilla y el cuello se sienten neutrales.',
      stomach: 'Verifica que el cuello se mantenga nivelado y no se doble hacia arriba.',
      heightNote: 'Si importa una altura de cama más baja, pregunta qué alturas de base están disponibles.',
      compareNote: 'Compara alturas estándar y más bajas.'
    }
  };
  const STOMACH = Object.assign({}, ANSWERS, { sleep_position: 'stomach' });
  for (const lang of ['en', 'es']) {
    const A = APPROVED[lang];
    for (const fb of ['low', 'high']) {
      const r = renderStep('pillow', { answers: ANSWERS, lang, state: { pillowFeedback: fb } });
      const feedback = grab(r.main, 'sleep-system__pillow-feedback');
      ok(`[${lang}/pillow/too ${fb}] the fit feedback is the approved line and names no product`,
        feedback === A[fb] && !/adjustable|low-profile|perfil bajo|relleno ajustable/i.test(feedback || ''), JSON.stringify(feedback));
    }
    const st = renderStep('pillow', { answers: STOMACH, lang });
    ok(`[${lang}/pillow/stomach] the position cue is the approved check, not a "lower profile" product`,
      notesText(st.guidance).includes(A.stomach) && !notesText(st.guidance).some((n) => /lower profile|perfil bajo/i.test(n)),
      notesText(st.guidance).join(' | ').slice(0, 160));
    const sup = renderStep('support', { answers: ANSWERS, lang });
    const choiceIds = [...sup.main.matchAll(/data-support-choice="([^"]+)"/g)].map((m) => m[1]);
    ok(`[${lang}/support] on a catalog with one foundation height the actionable "Lower height" choice is withheld (current / standard / unsure remain)`,
      JSON.stringify(choiceIds) === JSON.stringify(['current', 'standard', 'unsure']), JSON.stringify(choiceIds));
    ok(`[${lang}/support] the specialist notes carry the non-interactive height prompt instead of a comparison the catalog cannot offer`,
      notesText(sup.guidance).includes(A.heightNote) && !notesText(sup.guidance).includes(A.compareNote),
      notesText(sup.guidance).join(' | ').slice(0, 160));
  }
  // Data-driven: a catalog that carries a low_profile support item gets the
  // choice and the comparison note back with no code change.
  {
    const withLow = ACCESSORIES_JSON.concat([{
      id: 'foundation-test-lowpro', name: { en: 'Test Low-Profile Foundation', es: 'Base de perfil bajo de prueba' },
      category: { en: 'Foundations & Support', es: 'Bases y Soportes' }, subType: 'low_profile', price: 1,
      description: { en: 'test', es: 'prueba' }, image: '', matchTags: ['all'], matchScores: { default: 1 }
    }]);
    const sup = renderStep('support', { answers: ANSWERS, accessories: withLow });
    const choiceIds = [...sup.main.matchAll(/data-support-choice="([^"]+)"/g)].map((m) => m[1]);
    ok('data-driven: with a low_profile support item in the catalog the "Lower height" choice returns',
      JSON.stringify(choiceIds) === JSON.stringify(['current', 'standard', 'low', 'unsure']), JSON.stringify(choiceIds));
    ok('data-driven: and the comparison note returns in place of the height prompt',
      notesText(sup.guidance).includes(APPROVED.en.compareNote) && !notesText(sup.guidance).includes(APPROVED.en.heightNote));
  }
  // The reaction handler: the real handleSleepSystemAction() with a fake
  // control. "Too low" / "Too high" must move the candidate to the
  // highest-ranked OTHER cataloged pillow; "aligned" keeps it. No product id
  // may appear in the handler source.
  const HANDLER_SRC = extractFunction('function handleSleepSystemAction(control)');
  ok('the handler source names no product id (the WG&R lookups are gone)',
    !!HANDLER_SRC && !/pillow-tempur|pillow-flow|pillow-gel/.test(stripComments(HANDLER_SRC)));
  function reactionRun(reaction, startCandidate) {
    const win = {
      _accCart: {},
      _sleepSystemState: { activeStep: 'pillow', decisions: {}, demoPosition: '', supportChoice: '',
        pillowCandidateId: startCandidate, pillowReaction: '', pillowFeedback: '', protectionGoal: '' }
    };
    const logged = [];
    const src = [SRC.category, SRC.stepFor, SRC.qualify, SRC.scorer, SRC.readGroups, HANDLER_SRC].join('\n');
    new Function('window', 'answers', 'currentLang', 'ACCESSORIES', 'analytics', 'control',
      src + `
      function syncAccessoryAnalytics() {}
      function renderSleepSystem() {}
      handleSleepSystemAction(control);`)(
      win, ANSWERS, 'en', ACCESSORIES_JSON, { log: (e, d) => logged.push({ e, d }) },
      { getAttribute: (k) => (k === 'data-sleep-action' ? 'pillow-reaction' : k === 'data-reaction' ? reaction : null) });
    return { state: win._sleepSystemState, logged };
  }
  const groupsNow = makeEnv({ answers: ANSWERS }).api.groups().pillow.map((a) => a.id);
  ok('control: the shipped catalog carries exactly two pillows in the group for this customer', groupsNow.length === 2, JSON.stringify(groupsNow));
  const [first, second] = groupsNow;
  const low = reactionRun('low', first);
  ok(`"Too low" from the hero (${first}) moves the candidate to the other cataloged pillow (${second})`,
    low.state.pillowCandidateId === second && low.state.pillowReaction === '' && low.state.pillowFeedback === 'low', JSON.stringify(low.state));
  const high = reactionRun('high', second);
  ok(`"Too high" from the alternative (${second}) moves the candidate back to the hero (${first})`,
    high.state.pillowCandidateId === first && high.state.pillowReaction === '', JSON.stringify(high.state));
  const noStart = reactionRun('low', '');
  ok('with no candidate yet, "Too low" starts from the hero and offers the other pillow', noStart.state.pillowCandidateId === second);
  const aligned = reactionRun('aligned', first);
  ok('"Feels aligned" keeps the current pillow and records the aligned reaction',
    aligned.state.pillowCandidateId === first && aligned.state.pillowReaction === 'aligned' && aligned.state.pillowFeedback === 'aligned');
  ok('the analytics event names the next pillow', low.logged.some((l) => l.e === 'pillow_fit_recorded' && l.d.nextPillowId === second));
  // Negative control: a hard-coded id lookup returns -> the reaction re-offers the same pillow.
  {
    const from = 'window._sleepSystemState.pillowCandidateId = otherPillow ? otherPillow.id : currentPillowId;';
    if (!HANDLER_SRC.includes(from)) throw new Error('P9 negative control: anchor not found');
    const mutated = HANDLER_SRC.replace(from, "var phantom = pillowItems.find(function(i) { return i.id === 'pillow-tempur-proadjust'; }); window._sleepSystemState.pillowCandidateId = phantom ? phantom.id : currentPillowId;");
    const win = { _accCart: {}, _sleepSystemState: { activeStep: 'pillow', decisions: {}, demoPosition: '', supportChoice: '', pillowCandidateId: first, pillowReaction: '', pillowFeedback: '', protectionGoal: '' } };
    new Function('window', 'answers', 'currentLang', 'ACCESSORIES', 'analytics', 'control',
      [SRC.category, SRC.stepFor, SRC.qualify, SRC.scorer, SRC.readGroups, mutated].join('\n') + `
      function syncAccessoryAnalytics() {}
      function renderSleepSystem() {}
      handleSleepSystemAction(control);`)(win, ANSWERS, 'en', ACCESSORIES_JSON, { log() {} },
      { getAttribute: (k) => (k === 'data-sleep-action' ? 'pillow-reaction' : k === 'data-reaction' ? 'low' : null) });
    ok('negative control: a phantom-id lookup re-offers the same pillow (the assertion above bites)', win._sleepSystemState.pillowCandidateId === first);
  }
}

// --------------------------------------------- 14f. 3.7 P5 option C
// Owner ruling + implementation approval 2026-08-30: when no answer points to
// an adjustable base (no back pain / snoring / reflux - the group's best item
// is unmatched), the adjustability step keeps the position demo and presents
// ALL cataloged adjustable bases as a neutral compare list - catalog order,
// equal prominence, no price, no availability claim, rows add to the plan
// ("Add to plan"), "Ask for a demo" primary. Trigger customers unchanged.
section('3.7 P5 option C - no-trigger customers get the demo plus a neutral all-bases compare list, never an unjustified hero');
{
  const NO_TRIGGER = { sleep_position: 'back', temperature: 'comfortable', sleep_issues: ['none'], health_conditions: ['none'] };
  const TRIGGER = { sleep_position: 'side', temperature: 'hot', sleep_issues: ['back_pain'], health_conditions: ['snoring'] };
  const CATALOG_BASES = ACCESSORIES_JSON.filter((a) => (typeof a.category === 'object' ? a.category.en : a.category) === 'Foundations & Support' && a.subType === 'adjustable').map((a) => a.id);
  const T = {
    en: { eyebrow: 'Optional base demo', heading: 'Try the positions first', list: 'Bases to compare', add: 'Add to plan', selectedL: 'Selected', demo: 'Ask for a demo', later: 'Decide later',
      body: 'Your answers do not point to a specific adjustable base. Try the positions, then compare a base only if the movement improves your comfort.' },
    es: { eyebrow: 'Demostración opcional de base', heading: 'Prueba las posiciones primero', list: 'Bases para comparar', add: 'Agregar al plan', selectedL: 'Seleccionado', demo: 'Pedir demostración', later: 'Decidir después',
      body: 'Tus respuestas no apuntan a una base ajustable en particular. Prueba las posiciones y compara una base solo si el movimiento mejora tu comodidad.' }
  };
  const rowIds = (html) => [...html.matchAll(/class="sleep-system__alternative sleep-system__base-row">[\s\S]*?data-item-id="([^"]+)"/g)].map((m) => m[1]);
  for (const lang of ['en', 'es']) {
    const L = T[lang];
    const r = renderStep('adjustability', { answers: NO_TRIGGER, lang });
    ok(`[${lang}/no-trigger] the group's best base is unmatched (the premise holds)`, r.groups.adjustability[0] && r.groups.adjustability[0].matched === false);
    ok(`[${lang}/no-trigger] no featured product card and no price surface render`,
      !/class="sleep-system__featured[ "]/.test(r.main) && !/sleep-system__price/.test(r.main));
    ok(`[${lang}/no-trigger] the position demo still renders`, /sleep-system__demo/.test(r.main));
    ok(`[${lang}/no-trigger] the neutral block carries the approved eyebrow, heading, body and list heading`,
      r.main.includes(`<div class="sleep-system__card-eyebrow">${L.eyebrow}</div>`) &&
      r.main.includes(`<h3 class="sleep-system__featured-name">${L.heading}</h3>`) &&
      textOf(r.main).includes(L.body) &&
      r.main.includes(`<div class="sleep-system__alternatives-label">${L.list}</div>`));
    ok(`[${lang}/no-trigger] ALL cataloged adjustable bases render, in catalog order (not the engine's back-filled group)`,
      JSON.stringify(rowIds(r.main)) === JSON.stringify(CATALOG_BASES) && CATALOG_BASES.length === 3, JSON.stringify(rowIds(r.main)));
    ok(`[${lang}/no-trigger] every row's action reads "${L.add}" and adds via select-item (equal prominence, no hero treatment)`,
      (r.main.match(new RegExp(`data-sleep-action="select-item" data-item-id="[^"]+">${L.add}</button>`, 'g')) || []).length === 3);
    ok(`[${lang}/no-trigger] "${L.demo}" is the block's primary action and "${L.later}" its secondary`,
      new RegExp(`sleep-system__action--primary" data-sleep-action="decision" data-status="demo">${L.demo}</button>`).test(r.main) &&
      new RegExp(`sleep-system__action--secondary" data-sleep-action="decision" data-status="later">${L.later}</button>`).test(r.main));
    ok(`[${lang}/no-trigger] no availability or floor claim in the block`,
      !/on the floor|in stock|available today|en la tienda|disponible/i.test(textOf(r.main)));
    const sel = renderStep('adjustability', { answers: NO_TRIGGER, lang, cart: { 'base-bt3000': { id: 'base-bt3000' } } });
    ok(`[${lang}/no-trigger] a selected row reads "${L.selectedL}" and offers removal`,
      new RegExp(`class="is-selected" data-sleep-action="remove-item" data-item-id="base-bt3000">${L.selectedL}</button>`).test(sel.main));
    const t = renderStep('adjustability', { answers: TRIGGER, lang });
    ok(`[${lang}/trigger] the triggered flow is unchanged - hero card, price, three controls, no neutral block`,
      /class="sleep-system__featured[ "]/.test(t.main) && /sleep-system__price/.test(t.main) &&
      !/sleep-system__bases-compare/.test(t.main) && /data-status="demo"/.test(t.main) && /data-status="later"/.test(t.main) &&
      (lang !== 'en' || /Keep this base in plan/.test(t.main)));
  }
  // Negative controls.
  const NT = { answers: NO_TRIGGER };
  const heroBack = renderStep('adjustability', Object.assign({}, NT, {
    mutate: (s) => {
      const from = "(supportOutcome || (adjustabilityNoTrigger ? basesCompareHtml : productHtml))";
      if (!s.includes(from)) throw new Error('P5 negative control: assembly anchor not found');
      return s.replace(from, '(supportOutcome || productHtml)');
    }
  }));
  ok('negative control: restoring the hero in the assembly re-renders the unjustified product card for a no-trigger customer',
    /class="sleep-system__featured[ "]/.test(heroBack.main) && /sleep-system__price/.test(heroBack.main));
  const groupBack = renderStep('adjustability', Object.assign({}, NT, {
    mutate: (s) => {
      const from = 'return sleepSystemStepForItem(item) === \'adjustability\';';
      if (!s.includes(from)) throw new Error('P5 negative control: filter anchor not found');
      return s.replace('var allBases = (Array.isArray(ACCESSORIES) ? ACCESSORIES : []).filter(function(item) {',
        'var allBases = items.slice(); void (function(item) {');
    }
  }));
  ok('negative control: sourcing the list from the engine group again drops it to the back-filled two, so the all-bases assertion bites',
    rowIds(groupBack.main).length === 2, JSON.stringify(rowIds(groupBack.main)));
}

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
      ['C3: the step name stays 13px and larger than the status (hierarchy holds)']],
    // Review correction: the alternative Add control's 44px floor. The padding
    // line anchors both finds to this rule (the .sleep-system__action rule
    // also declares min-height: 44px but pads 9px 13px).
    ['alternative Add control sinks back to 40px high',
      'min-height: 44px;\n      padding: 8px 11px;', 'min-height: 40px;\n      padding: 8px 11px;',
      ['C4: the alternative Add control declares min-height >= 44px']],
    ['alternative Add control loses its min-width',
      'min-width: 44px;\n      min-height: 44px;\n      padding: 8px 11px;', 'min-height: 44px;\n      padding: 8px 11px;',
      ['C4: the alternative Add control declares min-width >= 44px']]
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

// --------------------------------- 16. X2/X3/X10 (North Star ruling D7, 2026-08-31)
section('X2/X3/X10 — three honest states, factual wording, the keyboard\'s place');
{
  // X2: executed per status kind. The dash (&#8211;) marks an ADDRESSED
  // decision; the sage checkmark belongs to an actual addition alone.
  {
    const r = renderStep('adjustability', { answers: ANSWERS, state: { demoPosition: 'reading', decisions: { adjustability: { status: 'demo' } } } });
    ok('demo: the rail chip is is-addressed with the neutral dash — never the checkmark, never is-complete',
      /class="sleep-system__step is-active is-addressed"/.test(r.rail) && /step-num">&#8211;</.test(r.rail)
      && !/is-complete/.test(r.rail) && !/&#10003;/.test(r.rail));
    ok('demo: the sidecar row mirrors it (is-addressed, dash mark)',
      /plan-item is-addressed"/.test(r.plan) && /plan-mark">&#8211;</.test(r.plan));
  }
  {
    const r = renderStep('pillow', { answers: ANSWERS, state: { pillowReaction: 'aligned' }, cart: { 'pillow-flow': { id: 'pillow-flow' } } });
    ok('selected: the sage checkmark marks the actual addition on both surfaces',
      /is-selected"/.test(r.rail) && /step-num">&#10003;</.test(r.rail)
      && /plan-item is-selected"/.test(r.plan) && /plan-mark">&#10003;</.test(r.plan));
  }
  {
    const r = renderStep('adjustability', { answers: ANSWERS, state: { decisions: { adjustability: { status: 'later' } } } });
    const firstChip = r.rail.split('data-step="support"')[0];
    ok('deferred: the chip keeps its NUMBER inside the dashed ring (is-deferred) — a deferral is not completion',
      /is-deferred"/.test(firstChip) && /step-num">1</.test(firstChip) && !/&#10003;|&#8211;/.test(firstChip));
    ok('deferred: the sidecar mark stays empty in the dashed ring',
      /plan-item is-deferred"/.test(r.plan) && !/plan-mark">&#10003;|plan-mark">&#8211;/.test(r.plan.split('plan-item-name')[1] ? r.plan.split('sleep-system__plan-item ')[1] : r.plan));
  }
  // X2: the neutral count phrase in both languages (participles agree — the C5 rule).
  {
    const mixed = { decisions: { adjustability: { status: 'demo' }, support: { status: 'already' }, protection: { status: 'later' } } };
    const en = renderStep('pillow', { answers: ANSWERS, state: Object.assign({ pillowReaction: 'aligned' }, mixed), cart: { 'pillow-flow': { id: 'pillow-flow' } } });
    ok('count: "1 added · 2 addressed" — the deferral is claimed by neither number', en.planCount === '1 added · 2 addressed', en.planCount);
    const es = renderStep('pillow', { answers: ANSWERS, lang: 'es', state: Object.assign({ pillowReaction: 'aligned' }, mixed), cart: { 'pillow-flow': { id: 'pillow-flow' } } });
    ok('count ES: "1 agregado · 2 atendidos" (singular participle agrees; wording provisional)', es.planCount === '1 agregado · 2 atendidos', es.planCount);
  }
  // X10: aria-current="step" on the active rail control alone.
  {
    const r = renderStep('support', { answers: ANSWERS });
    ok('the active rail step carries aria-current="step" and it appears exactly once',
      (r.rail.match(/aria-current="step"/g) || []).length === 1
      && r.rail.includes('data-step="support" aria-current="step"'));
  }
  // X10: the capture/restore pair, static against the shipped source.
  ok('X10: renderSleepSystem() captures before the four regions rebuild and restores after (one site, no timer)',
    /var focusKey = sleepSystemFocusKey\(\);\s*renderSleepSystemRail\(\);[\s\S]{0,120}renderSleepSystemFooter\(\);\s*sleepSystemRestoreFocus\(focusKey\);/.test(html));
  ok('X10: the capture half is identity-gated — a [data-sleep-action] control inside this screen matching :focus-visible',
    /function sleepSystemFocusKey\(\)[\s\S]{0,900}\[data-sleep-action\]'\) \|\| !active\.matches\(':focus-visible'\)/.test(html));
  ok('X10: the restore half is synchronous with preventScroll and falls back to the step heading, then the screen heading',
    /function sleepSystemRestoreFocus\(key\)[\s\S]{0,1200}sleepSystemSectionTitle[\s\S]{0,300}sleepSystemTitle[\s\S]{0,400}preventScroll: true/.test(html)
    && !/function sleepSystemRestoreFocus\(key\)[\s\S]{0,1200}setTimeout/.test(html));
  ok('X10: identity is the data-* attribute set, never the action name (select-item flips to remove-item)',
    /SLEEP_SYSTEM_IDENTITY_ATTRS = \['data-item-id', 'data-step', 'data-status',\s*'data-position', 'data-reaction', 'data-support-choice', 'data-protection-goal'\]/.test(html));
  ok('X10: the step-heading fallback is rendered focusable',
    SRC.main.includes('id="sleepSystemSectionTitle" tabindex="-1"'));
  // X3: the forbidden claims are gone from the live renderers.
  ok('X3: "Best for" / "Mejor para" appear nowhere in the live Sleep System main renderer',
    !stripComments(SRC.main).includes("'Best for '") && !stripComments(SRC.main).includes("'Mejor para '"));
  // X3: the take-home packet line is factual customer action, evaluated for real.
  {
    const pStart = html.indexOf('var packet = [');
    const pEnd = html.indexOf('\n      ];', pStart);
    ok('X3: the take-home packet literal located', pStart !== -1 && pEnd !== -1);
    if (pStart !== -1 && pEnd !== -1) {
      const literal = html.slice(pStart + 'var packet = '.length, pEnd + '\n      ]'.length);
      const build = (es, acc) => new Function('_esE', 'savedMattresses', 'recCount', 'selectedAccessories',
        '"use strict"; return ' + literal + ';')(es, [], 3, Array.from({ length: acc }, () => ({})));
      const row = (rows) => rows.find((entry) => /piece|pieza/.test(entry.detail || ''));
      ok('X3: one added piece reads "1 piece · the bases, pillows or protectors you added"',
        row(build(false, 1)).detail === '1 piece · the bases, pillows or protectors you added', row(build(false, 1)).detail);
      ok('X3: two pieces pluralize with the same factual wording',
        row(build(false, 2)).detail === '2 pieces · the bases, pillows or protectors you added');
      ok('X3 ES: "1 pieza / 2 piezas · las bases, almohadas o protectores que agregaste" (provisional)',
        row(build(true, 1)).detail === '1 pieza · las bases, almohadas o protectores que agregaste'
        && row(build(true, 2)).detail === '2 piezas · las bases, almohadas o protectores que agregaste');
      ok('X3: "matched to you" / "para ti" appear nowhere in the packet literal',
        !/matched to you|para ti\b/.test(literal));
    }
  }
  // X2: the count phrase is now customer-derived, so its surface joins the
  // authoritative wipe (the session suite seeds every implementation-listed
  // id; this pin makes its removal observable).
  ok('X2: the derived count surface joined the wipe inventory (SESSION_TEXT_IDS)',
    /var SESSION_TEXT_IDS = \[[\s\S]*?'sleepSystemPlanCount'[\s\S]*?\];/.test(html));
  // Negative control (guard-15 convention): reverting the classifier must
  // flip the deferred assertions, proving they bite.
  {
    const mutate = (src) => {
      const out = src.replace("if (status === 'later') return 'deferred';", "if (status === 'later') return 'addressed';");
      if (out === src) throw new Error('negative-control mutation did not apply');
      return out;
    };
    const env = makeEnv({ answers: ANSWERS, state: { activeStep: 'adjustability', decisions: { adjustability: { status: 'later' } } }, mutate });
    env.api.rail();
    env.api.plan();
    ok('negative control: reverting the classifier makes a deferral count as addressed again (so the X2 assertions bite)',
      env.get('sleepSystemPlanCount').textContent === '0 added · 1 addressed'
      && /is-addressed/.test(env.get('sleepSystemRail').innerHTML)
      && !/is-deferred/.test(env.get('sleepSystemRail').innerHTML));
  }
}

// ------------- 17. Candidate 2026-09-06: three states on the card, reversible
// Item 1.4 scope: "suggested / selected / declined - unmistakable ... every
// choice optional and reversible; declining is one obvious touch with no
// confirm-to-decline friction". Before this candidate the card marked only
// the selected state; keep-current / demo / decide-later lived on the rail
// alone, and no recorded decision could be undone except by making another.
// No new copy: every string asserted below is one the rail already renders.
section('candidate 2026-09-06 — the card states its decision, the control is pressed, one touch reopens');
const pressedOf = (main) => (main.match(/aria-pressed="true" class="[^"]*" data-sleep-action="decision"/g) || []).length;
const bannerOf = (main) => grab(main, 'sleep-system__decision is-addressed') || grab(main, 'sleep-system__decision is-deferred');
{
  const r = renderStep('adjustability', { answers: ANSWERS, state: { decisions: { adjustability: { status: 'later' } } } });
  const body = featuredBody(r.main);
  ok('deferred: the card carries the decision line "Decide later" (the rail\'s own label) inside its body',
    body !== null && bannerOf(body) === 'Decide later', JSON.stringify(bannerOf(body)));
  ok('deferred: the card is marked is-deferred (dashed, like the rail ring) - not is-selected',
    /class="sleep-system__featured is-deferred"/.test(r.main) && !/featured is-selected/.test(r.main));
  ok('deferred: exactly the "Decide later" control is pressed (aria-pressed="true") and the demo control is not',
    pressedOf(r.main) === 1 &&
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="later">Decide later<\/button>/.test(r.main) &&
    /aria-pressed="false" class="[^"]*" data-sleep-action="decision" data-status="demo">Ask for a demo<\/button>/.test(r.main));
  ok('deferred: the decision line precedes the eyebrow, the name still leads the benefit',
    body !== null && body.indexOf('sleep-system__decision') < body.indexOf('sleep-system__card-eyebrow') &&
    nodeAt(body, 'sleep-system__featured-name') < nodeAt(body, 'sleep-system__featured-reason'));
  ok('deferred: the card keeps its single price surface (a deferral is not a removal of the product)',
    (r.main.match(/class="sleep-system__price"/g) || []).length === 1);
}
{
  const r = renderStep('adjustability', { answers: ANSWERS, state: { demoPosition: 'reading', decisions: { adjustability: { status: 'demo' } } } });
  ok('addressed (demo): the card states "Demo: Reading" and is marked is-addressed',
    bannerOf(featuredBody(r.main) || '') === 'Demo: Reading' && /class="sleep-system__featured is-addressed"/.test(r.main));
  ok('addressed (demo): the primary "Ask for a demo" control is the pressed one',
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="demo">Ask for a demo<\/button>/.test(r.main) && pressedOf(r.main) === 1);
}
{
  const r = renderStep('pillow', { answers: ANSWERS, state: { decisions: { pillow: { status: 'already' } } } });
  ok('addressed (keep current pillow): the card states "Using current setup" and presses "Keep current pillow"',
    bannerOf(featuredBody(r.main) || '') === 'Using current setup' &&
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="already">Keep current pillow<\/button>/.test(r.main) && pressedOf(r.main) === 1);
  ok('addressed: the pillow add gate is untouched by the decision line (fit still recorded first)',
    /sleep-system__pillow-gate/.test(r.main));
}
{
  const es = renderStep('protection', { answers: ANSWERS, lang: 'es', state: { decisions: { protection: { status: 'later' } } } });
  ok('ES deferred: the decision line reads "Decidir después" and presses the ES control',
    bannerOf(featuredBody(es.main) || '') === 'Decidir después' &&
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="later">Decidir después<\/button>/.test(es.main));
  const en = renderStep('protection', { answers: ANSWERS, state: { decisions: { protection: { status: 'already' } } } });
  ok('addressed (already protected): "Using current setup" on the card, "Already protected" pressed',
    bannerOf(featuredBody(en.main) || '') === 'Using current setup' &&
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="already">Already protected<\/button>/.test(en.main));
}
{
  const r = renderStep('adjustability', { answers: ANSWERS });
  ok('open: no decision line, no pressed decision control, the card class is exactly the shipped one',
    !/sleep-system__decision/.test(r.main) && pressedOf(r.main) === 0 && /class="sleep-system__featured"/.test(r.main));
  ok('open: every decision control still carries an explicit aria-pressed="false" (a toggle, not a one-way action)',
    (r.main.match(/aria-pressed="false" class="[^"]*" data-sleep-action="decision"/g) || []).length === 2);
  const sel = renderStep('pillow', { answers: ANSWERS, state: { pillowReaction: 'aligned' }, cart: { 'pillow-flow': { id: 'pillow-flow' } } });
  ok('selected: the cart wins - no decision line, no pressed decision, is-selected alone',
    !/sleep-system__decision/.test(sel.main) && pressedOf(sel.main) === 0 && /class="sleep-system__featured is-selected"/.test(sel.main));
  ok('selected: the add/remove primary never carries aria-pressed (its label flips, so it is not a toggle)',
    !/aria-pressed="[^"]*" class="[^"]*" data-sleep-action="(select-item|remove-item)"/.test(sel.main));
}
{
  // The no-trigger base block has no card; it states the decision the same way.
  const NO_TRIGGER = { sleep_position: 'side', temperature: 'cool', sleep_issues: [], health_conditions: [], budget: 'mid' };
  const r = renderStep('adjustability', { answers: NO_TRIGGER, state: { decisions: { adjustability: { status: 'later' } } } });
  ok('no-trigger block: the deferred decision line renders ahead of the base compare block and "Decide later" is pressed',
    /sleep-system__bases-compare/.test(r.main) && bannerOf(r.main) === 'Decide later' &&
    r.main.indexOf('sleep-system__decision') < r.main.indexOf('sleep-system__bases-compare') &&
    /aria-pressed="true" class="[^"]*" data-sleep-action="decision" data-status="later">Decide later<\/button>/.test(r.main));
}
// The setup choices expose their active member as pressed (aria-pressed, the
// finalist / Compare / quiz-option precedent), never by class alone.
{
  const pressedChoices = (html, cls) => (html.match(new RegExp(`class="${cls}[^"]*" aria-pressed="true"`, 'g')) || []).length;
  const allChoices = (html, cls) => (html.match(new RegExp(`class="${cls}[^"]*" aria-pressed="(true|false)"`, 'g')) || []).length;
  const a = renderStep('adjustability', { answers: ANSWERS });
  ok('positions: the suggested position is the one pressed member; every position declares aria-pressed',
    pressedChoices(a.main, 'sleep-system__position') === 1 && allChoices(a.main, 'sleep-system__position') === 4 &&
    /is-active" aria-pressed="true" data-sleep-action="demo-position" data-position="zero-gravity"/.test(a.main));
  const s = renderStep('support', { answers: ANSWERS, state: { supportChoice: 'standard' } });
  ok('support choices: the active choice is pressed, the others declare false',
    pressedChoices(s.main, 'sleep-system__support-choice') === 1 && allChoices(s.main, 'sleep-system__support-choice') === 3);
  const s0 = renderStep('support', { answers: ANSWERS });
  ok('support choices: with no choice made, none is pressed', pressedChoices(s0.main, 'sleep-system__support-choice') === 0);
  const p = renderStep('pillow', { answers: ANSWERS, state: { pillowReaction: 'aligned' } });
  ok('pillow fit: "Feels aligned" is pressed once recorded, the other two declare false',
    pressedChoices(p.main, 'sleep-system__pillow-reaction') === 1 && allChoices(p.main, 'sleep-system__pillow-reaction') === 3 &&
    /aria-pressed="true" data-sleep-action="pillow-reaction" data-reaction="aligned"/.test(p.main));
  const g = renderStep('protection', { answers: ANSWERS });
  ok('protection goals: the suggested goal (cooling for a hot sleeper) is pressed by default, all four declare aria-pressed',
    pressedChoices(g.main, 'sleep-system__protection-goal') === 1 && allChoices(g.main, 'sleep-system__protection-goal') === 4 &&
    /aria-pressed="true" data-sleep-action="protection-goal" data-protection-goal="cooling"/.test(g.main));
}
// One touch reopens: the delegated handler, executed against the real
// extracted source with the renderers stubbed (the state is the subject).
{
  const runHandler = (actions, seed = {}) => {
    const win = {
      _accCart: seed.cart || {},
      _sleepSystemState: Object.assign({
        activeStep: 'adjustability', decisions: {}, demoPosition: '', supportChoice: '',
        pillowCandidateId: '', pillowReaction: '', pillowFeedback: '', protectionGoal: ''
      }, seed.state || {}),
      showSleepPlan() { win._planShown = true; },
      backToResultsFromReview() {}
    };
    const analytics = { logged: [], log(e, d) { this.logged.push({ e, d }); } };
    const renders = { count: 0 };
    const src = [SRC.STEPS, SRC.text, SRC.category, SRC.stepFor, SRC.decision, SRC.handler].join('\n');
    const handle = new Function(
      'window', 'analytics', 'ACCESSORIES', 'answers', 'currentLang', 'document',
      'setSleepSystemItem', 'moveSleepSystemStep', 'renderSleepSystem', 'syncAccessoryAnalytics',
      'getSuggestedProtectionGoal', 'readSleepSystemGroups', 'escapeHtml',
      src + '\nreturn handleSleepSystemAction;'
    )(win, analytics, ACCESSORIES_JSON, ANSWERS, 'en', { getElementById() { return null; } },
      () => {}, () => {}, () => { renders.count++; }, () => {}, () => 'everyday', () => ({ pillow: [] }), (s) => s);
    for (const attrs of actions) handle({ getAttribute(k) { return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null; } });
    return { win, analytics, renders };
  };
  const later = { 'data-sleep-action': 'decision', 'data-status': 'later' };
  const demo = { 'data-sleep-action': 'decision', 'data-status': 'demo' };
  const one = runHandler([later]);
  ok('handler: one press records "later"', one.win._sleepSystemState.decisions.adjustability.status === 'later');
  const two = runHandler([later, later]);
  ok('handler: pressing "Decide later" again REOPENS the step (status open) - one touch, no confirm',
    two.win._sleepSystemState.decisions.adjustability.status === 'open' && two.renders.count === 2);
  ok('handler: the reopen is recorded as a decision event with status "open" (no new event name, no new field)',
    two.analytics.logged.every((l) => l.e === 'sleep_system_decision_recorded') &&
    two.analytics.logged[1].d.status === 'open' && Object.keys(two.analytics.logged[1].d).sort().join(',') === 'status,step');
  const swap = runHandler([later, demo]);
  ok('handler: a different decision replaces rather than reopens', swap.win._sleepSystemState.decisions.adjustability.status === 'demo');
  const demoTwice = runHandler([demo, demo], { state: { demoPosition: 'reading' } });
  ok('handler: pressing "Ask for a demo" again at the same position cancels the request (open)',
    demoTwice.win._sleepSystemState.decisions.adjustability.status === 'open');
  const demoMoved = runHandler([demo, { 'data-sleep-action': 'demo-position', 'data-position': 'flat' }, demo], { state: { demoPosition: 'reading' } });
  ok('handler: pressing "Ask for a demo" after moving the demo position UPDATES the recorded position instead of cancelling',
    demoMoved.win._sleepSystemState.decisions.adjustability.status === 'demo' &&
    demoMoved.win._sleepSystemState.decisions.adjustability.position === 'flat');
  const pillowAlready = runHandler([{ 'data-sleep-action': 'decision', 'data-status': 'already' }, { 'data-sleep-action': 'decision', 'data-status': 'already' }],
    { state: { activeStep: 'pillow' } });
  ok('handler: "Keep current pillow" twice reopens the pillow step', pillowAlready.win._sleepSystemState.decisions.pillow.status === 'open');
  const current = { 'data-sleep-action': 'support-choice', 'data-support-choice': 'current' };
  const keep = runHandler([current], { state: { activeStep: 'support' } });
  ok('handler: choosing "Keep current support" records the choice and the already status',
    keep.win._sleepSystemState.supportChoice === 'current' && keep.win._sleepSystemState.decisions.support.status === 'already');
  const keepTwice = runHandler([current, current], { state: { activeStep: 'support' } });
  ok('handler: pressing the active setup choice again CLEARS it and reopens the support step (the product card returns)',
    keepTwice.win._sleepSystemState.supportChoice === '' && keepTwice.win._sleepSystemState.decisions.support.status === 'open');
  const selectedThenLater = runHandler([later], { cart: { 'base-bt3000': { id: 'base-bt3000' } } });
  ok('handler: a decision on a step with an added product evicts the product and records the decision (unchanged behaviour)',
    !selectedThenLater.win._accCart['base-bt3000'] && selectedThenLater.win._sleepSystemState.decisions.adjustability.status === 'later');
}
// The stylesheet: the decision line, the card kinds, the pressed cue, the
// legible captions, the settle-in motion and its reduced-motion removal, and
// the forced-colors geometry - each pinned at the declaration.
{
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (sel) => cssRule(css, sel);
  const reason = fontOf(rule('.sleep-system__featured-reason'));
  ok('spoken line: the benefit block is 16px semibold (the loudest line under the name), rule and ground unchanged',
    reason !== null && reason.px === 16 && reason.weight === 600 &&
    /border-left:\s*3px solid #9A7445/.test(rule('.sleep-system__featured-reason')) && /background:\s*#F6EFE4/.test(rule('.sleep-system__featured-reason')));
  ok('decision line: declared, uppercase, neutral addressed palette (#EEE7DC / #4E483C / #8A7B69 - the rail\'s addressed kind)',
    /text-transform:\s*uppercase/.test(rule('.sleep-system__decision')) && /background:\s*#EEE7DC/.test(rule('.sleep-system__decision')) &&
    /color:\s*#4E483C/.test(rule('.sleep-system__decision')) && /border:\s*1px solid #8A7B69/.test(rule('.sleep-system__decision')));
  ok('decision line: the deferred variant is dashed with no fill (a deferral is not a decision made)',
    /border-style:\s*dashed/.test(rule('.sleep-system__decision.is-deferred')) && /background:\s*transparent/.test(rule('.sleep-system__decision.is-deferred')));
  ok('card kinds: is-deferred dashes the card border but keeps the solid left rule; is-addressed takes the addressed left rule',
    /border-style:\s*dashed/.test(rule('.sleep-system__featured.is-deferred')) && /border-left-style:\s*solid/.test(rule('.sleep-system__featured.is-deferred')) &&
    /border-left-color:\s*#8A7B69/.test(rule('.sleep-system__featured.is-addressed')));
  ok('pressed decision control: neutral ground and ink with an inset ring - never the sage of an addition',
    /background:\s*#EEE7DC/.test(rule('.sleep-system__action[aria-pressed="true"]')) &&
    /box-shadow:\s*inset 0 0 0 1px #8A7B69/.test(rule('.sleep-system__action[aria-pressed="true"]')) &&
    !/#63765D/.test(rule('.sleep-system__action[aria-pressed="true"]')));
  const capPx = (sel) => { const f = fontOf(rule(sel)); return f ? f.px : null; };
  ok('captions: the position, support-choice and protection-goal captions are 11px in #6C6054 (were 9px #857768)',
    [capPx('.sleep-system__position small'), capPx('.sleep-system__support-choice small'), capPx('.sleep-system__protection-goal small')].every((px) => px !== null && px >= 11) &&
    ['.sleep-system__position small', '.sleep-system__support-choice small', '.sleep-system__protection-goal small'].every((s) => /color:\s*#6C6054/.test(rule(s))));
  const badgePx = (sel) => { const m = rule(sel).match(/font-size:\s*(\d+)px/); return m ? Number(m[1]) : null; };
  ok('badges: the "Suggested" badges are at least 10px (were 8px)',
    badgePx('.sleep-system__position-badge') >= 10 && badgePx('.sleep-system__goal-badge') >= 10);
  ok('motion: the card, the outcome card and the base block settle in with the existing step-in keyframe',
    /\.sleep-system__featured,\s*\.sleep-system__support-outcome,\s*\.sleep-system__bases-compare \{\s*animation: sleepSystemStepIn 220ms ease-out;\s*\}/.test(css));
  const reducedAt = css.search(/@media \(prefers-reduced-motion: reduce\) \{\s*\.sleep-system__main \{ animation: none; \}/);
  const reduced = reducedAt === -1 ? '' : braceBlock(css.slice(reducedAt), '@media (prefers-reduced-motion: reduce) {');
  ok('reduced motion: the same block that stills the panel stills the card settle-in',
    /\.sleep-system__featured,\s*\.sleep-system__support-outcome,\s*\.sleep-system__bases-compare \{ animation: none; \}/.test(reduced));
  const fcBlocks = [...css.matchAll(/@media \(forced-colors: active\) \{/g)].map((m) => braceBlock(css.slice(m.index), '@media (forced-colors: active) {'));
  const fc = fcBlocks.find((b) => b.includes('.sleep-system__action[aria-pressed="true"]')) || '';
  ok('forced colors: the pressed decision control gets 3px CanvasText with padding compensated (9/13 -> 7/11)',
    /\.sleep-system__action\[aria-pressed="true"\] \{\s*border-width: 3px;\s*border-color: CanvasText;\s*padding: 7px 11px;\s*\}/.test(fc));
  ok('forced colors: every setup-choice group carries the same geometry cue when pressed',
    ['.sleep-system__position[aria-pressed="true"]', '.sleep-system__support-choice[aria-pressed="true"]', '.sleep-system__protection-goal[aria-pressed="true"]', '.sleep-system__pillow-reaction[aria-pressed="true"]']
      .every((s) => fc.includes(s)) && (fc.match(/border-color: CanvasText;/g) || []).length >= 4);
  ok('forced colors: the decision line keeps its dashed-vs-solid distinction and the deferred card its dashed border',
    /\.sleep-system__decision \{ border: 1px solid CanvasText; \}/.test(fc) && /\.sleep-system__decision\.is-deferred \{ border-style: dashed; \}/.test(fc) &&
    /\.sleep-system__featured\.is-deferred \{ border-style: dashed; border-left-style: solid; \}/.test(fc));
  ok('forced colors: the anchored first block and the rail block are untouched (own block, after them)',
    fcBlocks.length >= 3 && fcBlocks.indexOf(fc) > fcBlocks.findIndex((b) => b.includes('.sleep-system__step.is-active')));
}
// Guard-15 convention: the sweep entries that target this candidate must
// match the tree exactly once, so a stale entry is observable here.
{
  const CANDIDATE_FINDS = [
    "var reopening = currentDecision.status === requestedStatus &&",
    "if (window._sleepSystemState.supportChoice === supportChoice) supportChoice = '';",
    "return ' aria-pressed=\"' + (pressed ? 'true' : 'false') + '\"';",
    "if (kind !== 'addressed' && kind !== 'deferred') return '';",
    "return ' aria-pressed=\"' + (active ? 'true' : 'false') + '\"';",
    ".sleep-system__action[aria-pressed=\"true\"] {\n        border-width: 3px;\n        border-color: CanvasText;\n        padding: 7px 11px;\n      }"
  ];
  const lf = html.replace(/\r\n/g, '\n');
  for (const find of CANDIDATE_FINDS) {
    const n = lf.split(find).length - 1;
    ok(`candidate sweep find matches exactly once: ${JSON.stringify(find.slice(0, 56))}…`, n === 1, `count=${n}`);
  }
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
