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
  catalogLowProfile: extractFunction('function catalogHasLowProfileSupport()'),
  supportGuide: extractFunction('function renderSupportGuide()'),
  // A3 (owner ruling 2026-09-01): the evidence-typed rationale producers.
  pillowRationale: extractFunction('function pillowFitRationale()'),
  protRationale: extractFunction('function protectionRationale(selected, suggested)'),
  // A3.1 synthesis (owner counterprompt 2026-09-02, change 2): the generic
  // fit-response mark builder the pillow renderer calls.
  fitMark: extractFunction('function fitResponseMark(id)'),
  pillowFit: extractFunction('function renderPillowFit(primary)'),
  suggestedGoal: extractFunction('function getSuggestedProtectionGoal()'),
  goalLabel: extractFunction('function protectionGoalLabel(goal)'),
  goalReason: extractFunction('function protectionGoalReason(goal)'),
  supportsGoal: extractFunction('function protectorSupportsGoal(item, goal)'),
  protectionGuide: extractFunction('function renderProtectionGuide()'),
  // A3.1 (owner ruling 3, 2026-09-01): the key-keyed specialist reason
  // adapter and its two maps — the featured card's benefit line renders
  // through it on this specialist surface.
  reasonPrefix: extractFunction('var SPECIALIST_REASON_PREFIX ='),
  reasonNouns: extractFunction('var SPECIALIST_REASON_NOUNS ='),
  reasonAdapter: extractFunction('function specialistReasonLabel(keys, fallback)'),
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
  const classes = new Set();
  const el = {
    id, attrs: {}, textContent: '', _html: '', disabled: false, hidden: false, style: {},
    dataset: {},
    // A3-5: the real footer renderer toggles a secondary-styling class, so
    // the shim models classList minimally (Set-backed, contains-checkable).
    classList: {
      add(...cs) { cs.forEach((c) => classes.add(c)); },
      remove(...cs) { cs.forEach((c) => classes.delete(c)); },
      contains(c) { return classes.has(c); },
      toggle(c, force) {
        const on = force === undefined ? !classes.has(c) : !!force;
        if (on) classes.add(c); else classes.delete(c);
        return on;
      }
    },
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
    SRC.catalogLowProfile, SRC.guidance, SRC.rail, SRC.secondary, SRC.supportGuide,
    SRC.pillowRationale, SRC.protRationale, SRC.fitMark, SRC.pillowFit, SRC.suggestedGoal,
    SRC.goalLabel, SRC.goalReason, SRC.supportsGoal, SRC.protectionGuide,
    SRC.reasonPrefix, SRC.reasonNouns, SRC.reasonAdapter, SRC.main, SRC.plan,
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
// A3.1 (owner directive 2026-09-01): the retired note panel's retained lines
// render INSIDE their step through the same producer.
const guideLinesOf = (main) => [...String(main).matchAll(/<p class="sleep-system__guide-line">([^<]*)<\/p>/g)].map((m) => m[1]);
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
section('procedure region — retired panel; the one contextual line lives in its step (A3.1)');
// A3.1 (owner directive 2026-09-01): the persistent "Specialist note" panel is
// retired. The region element stays (wipe roster; config-gated financing
// block only) and is EMPTY, HIDDEN and unnamed on this deployment; every
// retained contextual line renders inside its step through the same producer
// (sleepSystemGuidance) as `.sleep-system__guide-line` — exactly one on the
// support / pillow / protection steps, none on adjustability (the demo's
// position title is that step's instruction). The line is never the card's
// benefit and never sits inside the card.
for (const lang of ['en', 'es']) {
  for (const step of STEP_IDS) {
    const r = renderStep(step, { answers: ANSWERS, lang });
    const body = featuredBody(r.main);
    const benefit = body ? grab(body, 'sleep-system__featured-reason') : null;
    const lines = guideLinesOf(r.main);
    ok(`[${lang}/${step}] the retired note panel renders nothing, is hidden and unnamed (no financing block on this deployment)`,
      r.guidance === '' && r.env.get('sleepSystemGuidance').hidden === true && r.guidanceLabel === null,
      JSON.stringify(r.guidanceLabel));
    ok(`[${lang}/${step}] the step carries ${step === 'adjustability' ? 'no' : 'exactly one'} in-step contextual line (A3.1)`,
      step === 'adjustability' ? lines.length === 0 : (lines.length === 1 && lines[0].trim().length > 0), `${lines.length} line(s)`);
    ok(`[${lang}/${step}] the customer benefit is NOT repeated as the contextual line`,
      benefit !== null && !lines.includes(benefit),
      `benefit=${JSON.stringify((benefit || '').slice(0, 46))}`);
    ok(`[${lang}/${step}] no contextual line is repeated inside the customer card`,
      body !== null && lines.every((n) => !textOf(body).includes(n)));
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
    // A3.1: the row's marketing sentence is retired — photo + name identify it.
    const alts = [...r.main.matchAll(/alternative-name">([^<]*)<\/div><\/div>/g)];
    const body = featuredBody(r.main);
    const primaryName = grab(body, 'sleep-system__featured-name');
    ok(`[${lang}/${step}] alternatives render`, alts.length >= 1, `${alts.length}`);
    ok(`[${lang}/${step}] every alternative names a different product than the primary`,
      alts.every((a) => a[1] !== primaryName));
    ok(`[${lang}/${step}] alternatives are distinguishable from each other by name`,
      new Set(alts.map((a) => a[1])).size === alts.length);
    ok(`[${lang}/${step}] no "Also compare" row carries a marketing sentence (A3.1)`,
      !/sleep-system__alternative-copy"/.test(r.main));
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
  // A3: the primary phrase counts considered categories; nothing considered
  // yet means the detail line stays empty and hidden.
  ok('undecided: plan count reads "0 of 4 considered" (A3)', r.planCount === '0 of 4 considered', r.planCount);
  ok('undecided: the detail line is empty and hidden',
    r.env.get('sleepSystemPlanDetail').textContent === '' && r.env.get('sleepSystemPlanDetail').hidden === true);
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
  ok('selected: plan count advances to "1 of 4 considered" with detail "1 added" (A3)',
    r.planCount === '1 of 4 considered' && r.env.get('sleepSystemPlanDetail').textContent === '1 added',
    r.planCount + ' / ' + r.env.get('sleepSystemPlanDetail').textContent);
}
{
  const r = renderStep('support', { answers: ANSWERS, state: { supportChoice: 'current' } });
  ok('keep-current: the product card is replaced by the current-setup outcome',
    /sleep-system__support-outcome/.test(r.main) && !/sleep-system__featured"/.test(r.main));
  // A3.1: the heading says "keep it"; the one instruction is the confirmation.
  ok('keep-current: the one instruction is the compatibility confirmation (A3.1)',
    textOf(r.main).includes('Confirm the current frame, platform, or slats'));
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
  // A3 (owner ruling 2026-09-01, building on X2/D7): a deferral is a
  // CONSIDERED decision — it counts toward "N of 4 considered" (which is what
  // legitimately arms Review) while the detail names it as deferred, never as
  // added or addressed. Nothing is claimed as completed.
  ok('skipped: a deferral counts as considered, is named deferred in the detail, and renders is-deferred',
    r.planCount === '1 of 4 considered'
    && r.env.get('sleepSystemPlanDetail').textContent === '0 added · 1 deferred'
    && /is-deferred/.test(r.rail) && /is-deferred/.test(r.plan),
    r.planCount + ' / ' + r.env.get('sleepSystemPlanDetail').textContent);
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
    'Decide later', 'Specialist note', 'During the trial', 'Keep current pillow',
    'Already protected', 'From $', 'Not decided', 'Add to plan', 'Add protector to plan',
    ' of 4 considered', 'Why first', 'Reported priority', 'Trial focus']; // A3 phrases
  const ES_MARKERS = ['Recomendado para probar', 'Vale la pena comparar', 'Opción de soporte',
    'También compara', 'Decidir después', 'Nota del especialista', 'Durante la prueba',
    'Conservar almohada actual', 'Ya está protegido', 'Desde $', 'Sin decidir',
    'Agregar al plan', 'Agregar protector al plan',
    ' de 4 consideradas', 'Por qué primero', 'Prioridad reportada', 'Enfoque de la prueba']; // A3 phrases
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
    // A3.1: the panel is retired — unnamed and empty in both languages.
    ok(`[${step}] the retired procedure region is unnamed and empty in ES too (A3.1)`,
      es.guidanceLabel === null && es.guidance === '', String(es.guidanceLabel));
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
// A3 (owner ruling 2026-09-01): the panel is ONE compact note under a
// singular eyebrow; the per-step guidance h2 is retired (the step head
// carries the title, the guide panel carries instruction + rationale).
const EYEBROW = { en: 'Specialist note', es: 'Nota del especialista' };
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
    rows.push({ step, lang, r, notes: notesText(r.guidance), lines: guideLinesOf(r.main).map(unescapeHtml), label: `${lang}/${step}${tag}` });
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
  // 14a (A3.1) — the panel and its eyebrow are retired: no eyebrow producer,
  // no plural or singular label literal anywhere in live code, nothing rendered
  // in the aside region in any state.
  for (const literal of ['Durante la prueba\'', 'Specialist notes', 'Notas del especialista', "'Specialist note'", "'Nota del especialista'"]) {
    ok(`retired eyebrow absent from live code: "${literal}"`, !liveHtml.includes(literal));
  }
  ok('no guidanceKind assignment survives (the eyebrow producer left with the panel)',
    !/guidanceKind/.test(stripComments(SRC.main)));
  const shown = failing(MATRIX, (row) => row.r.guidance === '' && row.r.guidanceLabel === null && h2Of(row.r.guidance) === null);
  ok('the retired panel renders nothing in every state, either language (A3.1)', shown.length === 0, shown.join(' | '));
  void EYEBROW;
}

// 14b (A3.1, owner directive 2026-09-01) — the RETAINED contextual lines,
// each rendered IN ITS STEP in the state that selects it, through the same
// producer (sleepSystemGuidance). Retired under ruling 2 (redundant with the
// step's own content) and the lead's justification (the adjustability note
// restated the enforced sequence): the adjustability note, the three P9
// pillow reaction notes (the in-section feedback line says the same thing).
// The retired strings must be absent from live code. EN strings are the
// owner-approved 1.4-close-out / 3.7-P9 text; ES provisional (Invariant 12).
const APPROVED_NOTES = [
  // 3.7 P9 (Option C): this catalog ships one foundation height.
  { step: 'support',
    en: 'If a lower finished bed height matters, ask which foundation heights are available.',
    es: 'Si importa una altura de cama más baja, pregunta qué alturas de base están disponibles.' },
  // 1.4 close-out technique note — the pillow step's one instruction in every fit state.
  { step: 'pillow',
    en: 'Test it on the finalist mattress and watch the neck line from the side.',
    es: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.' },
  { step: 'pillow', state: { pillowFeedback: 'low' },
    en: 'Test it on the finalist mattress and watch the neck line from the side.',
    es: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.' },
  { step: 'pillow', state: { pillowFeedback: 'high' },
    en: 'Test it on the finalist mattress and watch the neck line from the side.',
    es: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.' },
  { step: 'pillow', state: { pillowFeedback: 'aligned' },
    en: 'Test it on the finalist mattress and watch the neck line from the side.',
    es: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.' },
  { step: 'protection', state: { protectionGoal: 'spills' },
    en: 'Confirm waterproof coverage without a stiff or noisy feel.',
    es: 'Confirma cobertura impermeable sin sensación rígida o ruidosa.' },
  { step: 'protection', state: { protectionGoal: 'allergens' },
    en: 'Prioritize an allergen barrier that remains breathable.',
    es: 'Prioriza una barrera contra alérgenos que sea transpirable.' },
  { step: 'protection', state: { protectionGoal: 'cooling' },
    en: 'Check that the protector does not trap extra heat.',
    es: 'Verifica que el protector no atrape calor adicional.' },
  { step: 'protection', state: { protectionGoal: 'everyday' },
    en: 'Keep the mattress feel familiar while adding daily protection.',
    es: 'Mantén la sensación del colchón mientras agregas protección diaria.' }
];
{
  for (const n of APPROVED_NOTES) {
    const answers = Object.assign({}, ANSWERS, n.answers || {});
    const where = n.step +
      (n.answers ? '/' + n.answers.sleep_position : '') +
      (n.state ? '/' + Object.values(n.state).join('/') : '');
    const en = guideLinesOf(renderStep(n.step, { answers, lang: 'en', state: n.state || {} }).main).map(unescapeHtml);
    const es = guideLinesOf(renderStep(n.step, { answers, lang: 'es', state: n.state || {} }).main).map(unescapeHtml);
    ok(`[en/${where}] renders the approved line in-step "${n.en.slice(0, 40)}…"`,
      en.includes(n.en), en.join(' | ').slice(0, 140));
    ok(`[es/${where}] renders its ES counterpart in-step "${n.es.slice(0, 40)}…"`,
      es.includes(n.es), es.join(' | ').slice(0, 140));
  }
  ok('the retained set is six distinct EN lines with six distinct ES counterparts (A3.1)',
    new Set(APPROVED_NOTES.map((n) => n.en)).size === 6 &&
    new Set(APPROVED_NOTES.map((n) => n.es)).size === 6 &&
    APPROVED_NOTES.every((n) => n.en !== n.es));
  const RETIRED_NOTES = [
    'Recommend a base only after the customer tries the positions that matter most to them.',
    'Recomienda una base solo después de que el cliente pruebe las posiciones que más le importan.',
    'If the pillow feels too low, compare another pillow, then retest.',
    'If the pillow feels too high, compare another pillow, then retest.',
    'If the customer feels aligned, confirm comfort for several minutes before adding the pillow to the plan.',
    'Si la almohada se siente muy baja, compara otra almohada y vuelve a probar.',
    'Si la almohada se siente muy alta, compara otra almohada y vuelve a probar.',
    'Si el cliente se siente alineado, confirma la comodidad durante varios minutos antes de agregar la almohada al plan.'
  ];
  for (const lit of RETIRED_NOTES) {
    ok(`retired note absent from live code (A3.1 ruling 2): "${lit.slice(0, 44)}…"`, !liveHtml.includes(lit));
  }
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
    const panel = [row.r.guidanceLabel, h2Of(row.r.guidance)].concat(row.notes, row.lines).join('\n');
    return RETIRED_CUSTOMER_VOICE.every((frag) => !panel.includes(frag));
  });
  ok('no retired string renders in the procedure panel or the in-step lines in any state, either language',
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
    for (const line of [h2Of(row.r.guidance)].concat(row.notes, row.lines)) {
      if (line && re.test(line)) hits[row.lang].push(`${row.label}: ${line}`);
    }
  }
  ok('no EN procedure heading, note or in-step line addresses the customer (you / your)',
    hits.en.length === 0, [...new Set(hits.en)].slice(0, 4).join(' | '));
  ok('no ES procedure heading, note or in-step line addresses the customer (tu / tus / te / ti / tú / usted)',
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
    en.lines.forEach((line, k) => { if (es.lines[k] === line) mixed.push(`${es.label}: ${line}`); });
  });
  ok('no ES render repeats an EN note or in-step line (no English-only fallback)',
    enRows.length === esRows.length && mixed.length === 0, mixed.slice(0, 3).join(' | '));
  // Guard 4, extended to the low/high/aligned and every protection-goal
  // state: the customer benefit stays OUT of the panel, exactly ONE note
  // renders (A3), and it never leaks into the customer card.
  const dup = failing(MATRIX, (row) => {
    const body = featuredBody(row.r.main);
    if (!body) return false;
    const benefit = unescapeHtml(grab(body, 'sleep-system__featured-reason') || '');
    const card = unescapeHtml(textOf(body));
    const expected = row.step === 'adjustability' ? 0 : 1;
    return benefit.length > 0 && !row.lines.includes(benefit) &&
      row.lines.length === expected && row.lines.every((n) => n.trim().length > 0 && !card.includes(n));
  });
  ok('in every state: the ruled number of in-step lines, the benefit not among them, none inside the card (A3.1)',
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
  ['Keep in plan', 'Guardar en el plan'],
  ['Decide later', 'Decidir después'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add support to plan', 'Agregar soporte al plan'],
  ['Remove from plan', 'Quitar del plan'],
  ['Add aligned pillow to plan', 'Agregar almohada alineada al plan'],
  ['Record the fit first.', 'Registra el ajuste primero.'],
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
  // A3.1: the heading says "keep it"; one instruction.
  ['Confirm the current frame, platform, or slats meet the mattress requirements.',
    'Confirma que el marco, la plataforma o las tablillas cumplan los requisitos del colchón.'],
  ['Specialist check', 'Revisión del especialista'],
  ['Confirm the setup before adding support', 'Confirma la configuración antes de agregar soporte'],
  // 3.7 P5 option C (owner ruling + implementation approval 2026-08-30): the
  // neutral no-trigger base-compare block. EN approved; ES provisional.
  ['Optional base demo', 'Demostración opcional de base'],
  ['Optional base demo', 'Demostración opcional de base'],
  ['Try the positions first', 'Prueba las posiciones primero'],
  // A3: neutral operator framing on the specialist surface.
  ['The answers do not point to a specific adjustable base. Demo the positions, then compare a base only if the movement improves comfort.',
    'Las respuestas no apuntan a una base ajustable en particular. Demuestra las posiciones y compara una base solo si el movimiento mejora la comodidad.'],
  ['Bases to compare', 'Bases para comparar'],
  ['Selected', 'Seleccionado'],
  ['Add to plan', 'Agregar al plan'],
  ['Ask for a demo', 'Pedir demostración'],
  ['Decide later', 'Decidir después']
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
  // A3.1: three pairs re-ruled (Keep in plan, Record the fit first, the
  // keep-current instruction), two retired (the unsure explanation, the
  // panel eyebrow).
  ok('renderSleepSystemMain carries exactly the ruled bilingual literals (da4f746 minus the retired eyebrow, plus the nine P5 pairs, with the A3.1 re-rules; order and bytes)',
    JSON.stringify(mainLits) === JSON.stringify(MAIN_LITERALS_AT_DA4F746),
    `${mainLits.length} literal pairs (da4f746: 33, one retired, nine P5 pairs added 2026-08-30)`);
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
    // A3.1 (owner ruling 3, 2026-09-01): on this specialist surface the
    // engine's neutral string renders through the key-keyed adapter as the
    // catalog tag; the engine string itself is unchanged (pinned by the
    // phase-1 fixture and tests/a31_presentation_check.mjs).
    en: { rec: 'Recommended to try', worth: 'Worth comparing', neutral: 'Catalog option' },
    es: { rec: 'Recomendado para probar', worth: 'Vale la pena comparar', neutral: 'Opción del catálogo' }
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
      ok(`[${lang}/pillow/${label}] its reason line is the neutral catalog tag (the badge and the reason agree; A3.1 adapter)`,
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
      const from = /: \(primary\.matched(\r?\n)/;
      if (!from.test(s)) throw new Error('P2 negative control: anchor not found');
      return s.replace(from, ': (primary.meetsMatchThreshold$1');
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
    // A3.1 (owner ruling 3): rendered through the specialist reason adapter
    // (key -> neutral evidence tag); the engine strings are unchanged.
    en: { back: 'Reported priority: back sleeping', side: 'Reported priority: side sleeping', rec: 'Recommended to try' },
    es: { back: 'Prioridad reportada: dormir boca arriba', side: 'Prioridad reportada: dormir de lado', rec: 'Recomendado para probar' }
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
      ok(`[${lang}/pillow/${label}] the hero card is badged "${REASON[lang].rec}" with the back-sleeper evidence tag (P2 + P3 + A3.1 adapter)`,
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
      // A3 (owner ruling 2026-09-01): operator voice — no "your chin".
      high: 'Try another pillow on this mattress, then check that the chin and neck stay neutral.',
      // A3: the position cue moved into the step's rationale line; the panel
      // note for a stomach sleeper with no recorded fit is the neutral
      // neck-line note, and the rationale carries the level-neck check.
      stomach: 'Test it on the finalist mattress and watch the neck line from the side.',
      stomachRationale: 'Reported priority: stomach sleeper — the neck stays level, not bent upward.',
      heightNote: 'If a lower finished bed height matters, ask which foundation heights are available.',
      compareNote: 'Compare standard and lower bed heights.'
    },
    es: {
      low: 'Prueba otra almohada en este colchón y compara la altura; luego vuelve a registrar el ajuste.',
      high: 'Prueba otra almohada en este colchón y revisa que la barbilla y el cuello queden neutrales.',
      stomach: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.',
      stomachRationale: 'Prioridad reportada: duerme boca abajo — el cuello se mantiene nivelado, sin doblarse.',
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
    const stLines = guideLinesOf(st.main).map(unescapeHtml);
    ok(`[${lang}/pillow/stomach] the neutral technique line renders in-step and the rationale carries the level-neck check, no "lower profile" product`,
      stLines.includes(A.stomach)
      && unescapeHtml(st.main).includes(A.stomachRationale)
      && !stLines.some((n) => /lower profile|perfil bajo/i.test(n)),
      stLines.join(' | ').slice(0, 160));
    const sup = renderStep('support', { answers: ANSWERS, lang });
    const choiceIds = [...sup.main.matchAll(/data-support-choice="([^"]+)"/g)].map((m) => m[1]);
    ok(`[${lang}/support] on a catalog with one foundation height the actionable "Lower height" choice is withheld (current / standard / unsure remain)`,
      JSON.stringify(choiceIds) === JSON.stringify(['current', 'standard', 'unsure']), JSON.stringify(choiceIds));
    const supLines = guideLinesOf(sup.main).map(unescapeHtml);
    ok(`[${lang}/support] the step's contextual line carries the non-interactive height prompt instead of a comparison the catalog cannot offer`,
      supLines.includes(A.heightNote) && !supLines.includes(A.compareNote),
      supLines.join(' | ').slice(0, 160));
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
    const lowLines = guideLinesOf(sup.main).map(unescapeHtml);
    ok('data-driven: and the comparison line returns in place of the height prompt',
      lowLines.includes(APPROVED.en.compareNote) && !lowLines.includes(APPROVED.en.heightNote));
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
    // A3 (owner ruling 2026-09-01): the body is operator-neutral on the
    // specialist surface — same meaning, no customer second person.
    en: { eyebrow: 'Optional base demo', heading: 'Try the positions first', list: 'Bases to compare', add: 'Add to plan', selectedL: 'Selected', demo: 'Ask for a demo', later: 'Decide later',
      body: 'The answers do not point to a specific adjustable base. Demo the positions, then compare a base only if the movement improves comfort.' },
    es: { eyebrow: 'Demostración opcional de base', heading: 'Prueba las posiciones primero', list: 'Bases para comparar', add: 'Agregar al plan', selectedL: 'Seleccionado', demo: 'Pedir demostración', later: 'Decidir después',
      body: 'Las respuestas no apuntan a una base ajustable en particular. Demuestra las posiciones y compara una base solo si el movimiento mejora la comodidad.' }
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
      (lang !== 'en' || /Keep in plan/.test(t.main)));
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
  // Re-introduce the echo (A3 form: the one-note return is replaced by the
  // benefit) and the duplication guard must see it.
  const dup = renderStep('support', {
    answers: ANSWERS,
    mutate: (s) => {
      // A3.1 (ruling 3): the card's benefit line is the adapter label, so the
      // echo control reproduces exactly that — and, because the in-step line
      // calls the producer without the product BY CONTRACT, the control also
      // hands the product over (both replacements must apply).
      const a = s.replace('return [notice];',
        'var echoed = window.__echoPrimary; if (echoed && echoed.reasons && echoed.reasons[0]) return [specialistReasonLabel(echoed.reasonKeys, echoed.reasons[0])];\nreturn [notice];');
      // The support guide renders in its own function after the featured
      // item is chosen, so the product reaches the producer through the render.
      const b = a.replace('var primary = items[0];', 'var primary = items[0]; window.__echoPrimary = primary;');
      if (a === s || b === a) throw new Error('echo control did not apply');
      return b;
    }
  });
  const dupBody = featuredBody(dup.main);
  const dupBenefit = grab(dupBody, 'sleep-system__featured-reason');
  // A3.1: the producer feeds the in-step line, so the echo lands there.
  ok('control: re-introducing the echo puts the benefit into the in-step contextual line',
    guideLinesOf(dup.main).includes(dupBenefit),
    'the duplication guard would fail on this tree');
  const RETAINED_SUPPORT_NOTE = 'If a lower finished bed height matters, ask which foundation heights are available.';
  ok('control precondition: the unmutated support step renders its retained line',
    guideLinesOf(renderStep('support', { answers: ANSWERS }).main).map(unescapeHtml).includes(RETAINED_SUPPORT_NOTE));
  ok('control: and the echo displaces the retained line',
    !guideLinesOf(dup.main).map(unescapeHtml).includes(RETAINED_SUPPORT_NOTE));
}
{
  // Strip the region name and the labelling guard must fail.
  // A3.1: un-hide the empty retired panel and the retired-panel guard fails.
  const shownPanel = renderStep('pillow', {
    answers: ANSWERS,
    mutate: (s) => { const out = s.replace('guidance.hidden = !financingBlock;', 'guidance.hidden = false;'); if (out === s) throw new Error('panel control did not apply'); return out; }
  });
  ok('control: un-hiding the retired panel is detected',
    shownPanel.env.get('sleepSystemGuidance').hidden === false,
    'the retired-panel guard would fail on this tree');
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
  // A3.1: the "Also compare" row is photo + name; the injection keys on the
  // name cell (the P5 neutral-base row keeps its own copy cell and differs).
  const FIND = "'<div><div class=\"sleep-system__alternative-name\">' + escapeHtml(sleepSystemText(item.name)) + '</div></div>' +";
  const INJECT = "'<div class=\"sleep-system__price\">X</div><div><div class=\"sleep-system__alternative-name\">' + escapeHtml(sleepSystemText(item.name)) + '</div></div>' +";
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
  const PANEL_OFF = "guidance.hidden = !financingBlock;";
  const PANEL_ON = "guidance.hidden = false; guidance.innerHTML = '<div class=\"sleep-system__notice\"><span>&#10003;</span><span>note</span></div>' + financingBlock;";
  const applyOnce = (find, replace) => {
    let hits = null;
    const mutate = (s) => { hits = s.split(find).length - 1; return s.split(find).join(replace); };
    return { mutate, hits: () => hits };
  };

  // (a) A3.1: the retired panel is revived with a note in the aside -> the
  //     retired-panel pins fail on every step.
  const panelBack = applyOnce(PANEL_OFF, PANEL_ON);
  const revived = renderStep('support', { answers: ANSWERS, mutate: panelBack.mutate });
  ok('control: the panel-off find string matches the real source exactly once', panelBack.hits() === 1, `${panelBack.hits()}`);
  ok('control: reviving the panel renders a note in the aside again (the retired-panel pins would fail on this tree)',
    revived.guidance !== '' && notesOf(revived.guidance).length === 1 && revived.env.get('sleepSystemGuidance').hidden === false);

  // (b) the retained aligned note back in customer voice -> the second-person
  //     pin fails, per language (A3: the note set is one contextual note).
  // (b) A3.1: the retained technique line back in customer voice -> the
  //     second-person pin (now scanning in-step lines) fails, per language.
  const ALIGNED_EN_NEW = "en: 'Test it on the finalist mattress and watch the neck line from the side.',";
  const ALIGNED_EN_OLD = "en: 'Test it on your finalist mattress and watch your neck line from the side.',";
  const ALIGNED_ES_NEW = "es: 'Pruébala en el colchón finalista y observa la línea del cuello de lado.'";
  const ALIGNED_ES_OLD = "es: 'Pruébala en tu colchón finalista y observa tu línea del cuello de lado.'";
  const voiceEn = applyOnce(ALIGNED_EN_NEW, ALIGNED_EN_OLD);
  const alignedEn = guideLinesOf(renderStep('pillow', {
    answers: ANSWERS, state: { pillowFeedback: 'aligned' }, mutate: voiceEn.mutate }).main).map(unescapeHtml);
  ok('control: the technique-line EN find string matches the real source exactly once', voiceEn.hits() === 1, `${voiceEn.hits()}`);
  ok('control: a customer-voice technique line trips the EN second-person pin',
    alignedEn.some((n) => EN_SECOND_PERSON.test(n)), alignedEn.join(' | ').slice(0, 120));
  const voiceEs = applyOnce(ALIGNED_ES_NEW, ALIGNED_ES_OLD);
  const alignedEs = guideLinesOf(renderStep('pillow', {
    answers: ANSWERS, lang: 'es', state: { pillowFeedback: 'aligned' }, mutate: voiceEs.mutate }).main).map(unescapeHtml);
  ok('control: the technique-line ES find string matches the real source exactly once', voiceEs.hits() === 1, `${voiceEs.hits()}`);
  ok('control: and the ES revert trips the ES second-person pin',
    alignedEs.some((n) => ES_SECOND_PERSON.test(n)), alignedEs.join(' | ').slice(0, 120));
  ok('control: the neutral stomach cue does NOT trip either pin (the regex is not over-broad)',
    !EN_SECOND_PERSON.test('Look for a lower profile that avoids neck strain.') &&
    !ES_SECOND_PERSON.test('Busca un perfil bajo que evite tension en el cuello.') &&
    !ES_SECOND_PERSON.test('Cambia una posición a la vez y detente para notar la diferencia.') &&
    ES_SECOND_PERSON.test('Elige una base solo después de probar las posiciones importantes para ti.') &&
    ES_SECOND_PERSON.test('Confirma el ajuste y cuidado con tu especialista.'));

  // (c) an ES value copied from its EN -> the no-mixed-languages pin fails.
  // A3.1: keyed on the retained support line (the adjustability note is retired).
  const ES_NOTE = "es: 'Si importa una altura de cama más baja, pregunta qué alturas de base están disponibles.'";
  const EN_AS_ES = "es: 'If a lower finished bed height matters, ask which foundation heights are available.'";
  const mix = applyOnce(ES_NOTE, EN_AS_ES);
  const mixedEs = guideLinesOf(renderStep('support', { answers: ANSWERS, lang: 'es', mutate: mix.mutate }).main).map(unescapeHtml);
  const cleanEn = guideLinesOf(renderStep('support', { answers: ANSWERS, lang: 'en' }).main).map(unescapeHtml);
  ok('control: the ES line find string matches the real source exactly once', mix.hits() === 1, `${mix.hits()}`);
  ok('control: an English-only ES value renders the EN line under the ES flag',
    mixedEs[0] === cleanEn[0] && mixedEs[0] === 'If a lower finished bed height matters, ask which foundation heights are available.',
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
  // A3: the considered count in both languages, with the honest detail line
  // (participles agree — the C5 rule). This mixed set is also a complete one
  // (four decisions), so the single Review control must be visible.
  {
    const mixed = { decisions: { adjustability: { status: 'demo' }, support: { status: 'already' }, protection: { status: 'later' } } };
    const en = renderStep('pillow', { answers: ANSWERS, state: Object.assign({ pillowReaction: 'aligned' }, mixed), cart: { 'pillow-flow': { id: 'pillow-flow' } } });
    ok('count: "4 of 4 considered" with detail "1 added · 2 addressed · 1 deferred" (A3)',
      en.planCount === '4 of 4 considered'
      && en.env.get('sleepSystemPlanDetail').textContent === '1 added · 2 addressed · 1 deferred'
      && en.env.get('sleepSystemPlanReview').hidden === false,
      en.planCount + ' / ' + en.env.get('sleepSystemPlanDetail').textContent);
    const es = renderStep('pillow', { answers: ANSWERS, lang: 'es', state: Object.assign({ pillowReaction: 'aligned' }, mixed), cart: { 'pillow-flow': { id: 'pillow-flow' } } });
    ok('count ES: "4 de 4 consideradas" + "1 agregado · 2 atendidos · 1 aplazado" (provisional)',
      es.planCount === '4 de 4 consideradas'
      && es.env.get('sleepSystemPlanDetail').textContent === '1 agregado · 2 atendidos · 1 aplazado',
      es.planCount + ' / ' + es.env.get('sleepSystemPlanDetail').textContent);
  }
  // A3: the all-deferred session — the ruling's named contradiction. The
  // count and the visible Review agree ("considered"), and the detail says
  // plainly that nothing was added.
  {
    const allDef = { decisions: { adjustability: { status: 'later' }, support: { status: 'later' }, pillow: { status: 'later' }, protection: { status: 'later' } } };
    const r = renderStep('protection', { answers: ANSWERS, state: allDef });
    ok('A3 all-deferred: "4 of 4 considered", detail "0 added · 4 deferred", Review visible, status announces ready',
      r.planCount === '4 of 4 considered'
      && r.env.get('sleepSystemPlanDetail').textContent === '0 added · 4 deferred'
      && r.env.get('sleepSystemPlanReview').hidden === false
      && /All four considered/.test(r.env.get('sleepSystemPlanStatus').textContent),
      r.planCount + ' / ' + r.env.get('sleepSystemPlanDetail').textContent);
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
    ok('negative control: reverting the classifier renames the deferral as addressed (the A3 detail + class pins bite)',
      env.get('sleepSystemPlanDetail').textContent === '0 added · 1 addressed'
      && /is-addressed/.test(env.get('sleepSystemRail').innerHTML)
      && !/is-deferred/.test(env.get('sleepSystemRail').innerHTML));
  }
}

// --------------------------------- 17. A3 — audience voice + single primary
section('A3 — rationale evidence voice, footer demotion, completion demotion');
{
  const r = renderStep('pillow', { answers: ANSWERS });
  const rat = (r.main.match(/class="sleep-system__rationale">([^<]*)</) || [])[1] || '';
  ok('A3: the pillow rationale is evidence-typed and operator-voiced',
    /^(Reported priority|Trial focus):/.test(unescapeHtml(rat)) && !EN_SECOND_PERSON.test(rat), rat);
  const es = renderStep('pillow', { answers: ANSWERS, lang: 'es' });
  const ratEs = (es.main.match(/class="sleep-system__rationale">([^<]*)</) || [])[1] || '';
  ok('A3 ES: the rationale keeps the evidence prefix and no customer pronoun',
    /^(Prioridad reportada|Enfoque de la prueba):/.test(unescapeHtml(ratEs)) && !ES_SECOND_PERSON.test(ratEs), ratEs);
  ok('A3: the section head renders no right-column paragraph (density budget)',
    !/sleep-system__section-copy/.test(r.main));
  const prot = renderStep('protection', { answers: ANSWERS });
  const protRat = unescapeHtml((prot.main.match(/class="sleep-system__rationale">([^<]*)</) || [])[1] || '');
  ok('A3: the protection rationale is honest about its evidence (reported, not diagnosed)',
    /^Reported priority: sleeps hot\.$/.test(protRat), protRat);
  const chosen = renderStep('protection', { answers: ANSWERS, state: { protectionGoal: 'spills' } });
  const chosenRat = unescapeHtml((chosen.main.match(/class="sleep-system__rationale">([^<]*)</) || [])[1] || '');
  ok('A3: an explicitly tapped goal reads "Selected goal", never a reported claim',
    /^Selected goal: spills\.$/.test(chosenRat), chosenRat);
}
{
  const env = makeEnv({ answers: ANSWERS, state: { activeStep: 'protection' } });
  env.api.footer();
  ok('A3-5: the last step keeps the skip-to-Plan control, demoted to secondary styling',
    env.get('sleepSystemNext').hidden === false
    && env.get('sleepSystemNext').textContent === 'Review Sleep Plan'
    && env.get('sleepSystemNext').classList.contains('sleep-system__footer-primary--secondary'),
    env.get('sleepSystemNext').textContent);
  const mid = makeEnv({ answers: ANSWERS, state: { activeStep: 'support' } });
  mid.api.footer();
  ok('A3: mid-journey the footer continues to the next category (never demoted)',
    mid.get('sleepSystemNext').hidden === false && /^Continue to /.test(mid.get('sleepSystemNext').textContent)
    && !mid.get('sleepSystemNext').classList.contains('sleep-system__footer-primary--secondary'),
    mid.get('sleepSystemNext').textContent);
  ok('A3-5: the demoted footer class ships its secondary palette rule',
    /\.sleep-system__footer-primary--secondary \{[\s\S]*?background: #FFFDF8;[\s\S]*?\}/.test(html));
}
ok('A3: the completion demotion rule ships (is-complete primaries take the secondary palette)',
  /\.sleep-system__workspace\.is-complete \.sleep-system__action--primary:not\(\.sleep-system__action--selected\) \{[\s\S]*?background: #FFFDF8;[\s\S]*?\}/.test(html));
ok("A3-5: a wipe strips the completion marker declaratively (SESSION_LAYERS entry)",
  /\{ id: 'sleepSystemWorkspace', remove: \['is-complete'\] \},/.test(html));
ok('A3: renderSleepSystem toggles is-complete from the same open-count truth',
  /workspace\.classList\.toggle\('is-complete', ssOpenCount === 0\);/.test(html));
ok('A3: the detail surface joined the wipe inventory (SESSION_TEXT_IDS)',
  /var SESSION_TEXT_IDS = \[[\s\S]*?'sleepSystemPlanDetail',[\s\S]*?\];/.test(html));

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
