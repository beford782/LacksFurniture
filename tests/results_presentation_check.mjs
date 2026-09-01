// results_presentation_check.mjs — the Results presentation slice (Slice 1, D3).
//
// What shipped and why: the tier tabs carried color-only state with no
// selected-state attribute, no stable ids, and a sub-44px hit area; the
// renderer re-applied the engine's cap (`list.slice(0, 3)` / `slice(1, 3)`)
// in presentation; the lead/support labels branched on the item field
// `meetsMatchThreshold` (a predicate Phase 1 constraint 2 prohibits for role
// selection); a one-item tier stranded the support heading over an empty
// grid; the Bronze descriptor characterised the buyer ("entry-level" /
// "básico"); and both cards rendered synthesized buildMattressPriorities()
// rows. Slice 1 (owner-approved 2026-08-14) replaces all of that with
// index-only role labels from the governed dictionaries, the exact D3
// relativity line, restyled 44px pill tabs with aria-pressed, and
// engine-cap-only consumption.
//
// House style: EXTRACT the real renderTierTabs / renderTierDescriptor /
// renderTopPickCard / renderSupportingCards / _renderResults /
// window._setActiveResultsTier from index.html and EXECUTE them against a
// DOM shim — plus CSS text parsing for the touch floor and focus wiring and
// independent WCAG arithmetic on the shipped results-theme tokens. Writes
// nothing; exit 0 = pass.
//
// Guards, in order:
//   1. extraction (abort hard if any source is missing)
//   2. hierarchy: hero is list[0] by index, supports are list.slice(1) in
//      input order with NO presentation cap (4-item negative-control input),
//      no stranded heading, empty tier renders no fabricated cards
//   3. role labels are index-only: hostile item fields (pct, score,
//      meetsMatchThreshold) cannot move a card between roles or change copy
//   4. tier tabs: ids, type="button", aria-pressed mirrors the active tier,
//      tier_view logs the real tier on a real switch, 44px floor,
//      focus-visible + forced-colors wiring, Invariant 10 handler pair,
//      synchronous focus restore to the re-rendered active tab on a tier tap
//   5. ruled EN/ES copy verbatim from the governed dictionaries (dict-driven,
//      not inline literals), including the relativity line
//   6. the "entry-level" / "básico" descriptor is retired file-wide
//   7. synthesized priorities are absent from BOTH card renderers while
//      buildMattressPriorities() itself and its non-Results consumers survive
//   8. banned content never renders: percentages/rings, provenance/origin,
//      archetype nicknames, buyer-characterising labels, reason fallbacks,
//      availability claims
//   9. wiring: drawer order, handler precedence, wipe inventory, no new timers
//  10. in-memory negative controls proving the load-bearing assertions bite
//
// Run: node tests/results_presentation_check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const norm = html.replace(/\r\n/g, '\n');
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

// ------------------------------------------------------------- extraction
section('extraction');
const tabsSrc = extractFunction('function renderTierTabs()');
const descriptorSrc = extractFunction('function renderTierDescriptor()');
const topPickSrc = extractFunction('function renderTopPickCard(m, tier)');
const supportSrc = extractFunction('function renderSupportingCards(mattresses, tier)');
const renderSrc = extractFunction('function _renderResults()');
const setTierSrc = extractFunction('window._setActiveResultsTier = function(tier)');
ok('all six production sources found',
  !!tabsSrc && !!descriptorSrc && !!topPickSrc && !!supportSrc && !!renderSrc && !!setTierSrc);
if (!tabsSrc || !descriptorSrc || !topPickSrc || !supportSrc || !renderSrc || !setTierSrc) {
  console.log('FAIL — sources missing');
  process.exit(1);
}

// ------------------------------------------------------------ DOM harness
function makeEl(id) {
  const el = {
    id, style: {}, attrs: {}, textContent: '', _html: '',
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    getAttribute(k) { return el.attrs[k]; },
    setAttribute(k, v) { el.attrs[k] = v; },
    focus(opts) { el._focusCount = (el._focusCount || 0) + 1; el._focusOpts = opts || null; }
  };
  Object.defineProperty(el, 'innerHTML', { get() { return el._html; }, set(v) { el._html = v; } });
  return el;
}

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Build a live environment around the REAL extracted renderers. Collaborators
// outside this slice are injected as sentinels/stubs (compare_modal_check
// idiom); buildMattressPriorities is deliberately NOT provided — if either
// card renderer still referenced it, execution would throw.
function makeResultsEnv({ lang = 'en', tier = 'gold', list = [], state = null, compare = [], dict = null, mutate = null } = {}) {
  const els = new Map();
  const doc = {
    getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); }
  };
  const D = dict || (lang === 'es' ? dictEs : dictEn);
  const t = (key) => Object.prototype.hasOwnProperty.call(D, key) ? D[key] : key;
  const win = { _savedPicks: [], _compareSelected: compare.slice() };
  const analytics = { tierViews: {}, logged: [], log(ev, data) { this.logged.push({ ev, data }); } };
  const offerCue = { calls: [] };
  const initialState = state || { activeTier: tier, tierData: { gold: list, silver: [], bronze: [] } };
  let src = tabsSrc + '\n' + descriptorSrc + '\n' + topPickSrc + '\n' + supportSrc + '\n'
    + renderSrc + '\n' + setTierSrc + '\n';
  if (mutate) src = mutate(src);
  const api = new Function(
    'document', 'window', 'currentLang', 't', 'escapeHtml',
    'topPickReasonText', 'firmnessFeel', 'getMattressPromotion',
    'promotionOfferTabHtml', 'promotionBadgesHtml', 'saveButtonLabel', 'finalistButtonLabel',
    'buildDrawerData', 'renderResultsChrome', 'renderResultsTrialFocus',
    'renderResultsOfferCue', 'analytics', '__initialState',
    'var _resultsState = __initialState;\n'
    + src
    + 'return { render: _renderResults, setTier: function(x){ return window._setActiveResultsTier(x); },'
    + ' getState: function(){ return _resultsState; } };'
  )(
    doc, win, lang, t, esc,
    (m) => m.topPickReason || '',
    () => 'FEEL',
    () => ({ sentinel: true }),
    (p) => (p ? '<!--PROMO-TAB-->' : ''),
    () => '<!--PROMO-BADGES-->',
    (s) => (s ? 'Saved' : 'Save'),
    (c) => (c ? 'Chosen' : 'Choose as finalist'),
    () => ({}),
    () => {}, () => {},
    (l) => { offerCue.calls.push(l); },
    analytics, initialState
  );
  const get = (id) => doc.getElementById(id);
  return { api, get, analytics, offerCue, win, state: initialState };
}

const M = (id, over = {}) => Object.assign({
  id, name: 'Model ' + id.toUpperCase(), brand: 'BrandCo', subBrand: 'Line',
  firmness: 5, pct: 70, score: 50, meetsMatchThreshold: true,
  imageUrl: '', locallyMade: true, archetype: 'NICKNAME-SENTINEL',
  kind: 'support', matched: true, subType: 'foam', tier: 'gold',
  topPickReason: ''
}, over);

// Hostile ordering: index 0 carries the LEAST favorable fields, later items
// the most favorable — role assignment must ignore all of them.
const HOSTILE = [
  M('m1', { meetsMatchThreshold: false, pct: 62, score: 10 }),
  M('m2', { pct: 100, score: 99, topPickReason: 'reason-two' }),
  M('m3', { meetsMatchThreshold: false, pct: 61 }),
  M('m4', { pct: 98, score: 97 })
];

function cardIds(html) {
  return [...html.matchAll(/class="noct-support-card" data-id="([^"]+)"/g)].map((m) => m[1]);
}

// ---------------------------------------------- hierarchy: index-only, no cap
section('hierarchy — hero is list[0], supports are list.slice(1), no presentation cap');
{
  const env = makeResultsEnv({ list: HOSTILE });
  env.api.render();
  const lead = env.get('topPickContainer').innerHTML;
  const supports = env.get('supportingRow').innerHTML;
  ok('hero is the engine list\'s index 0 despite hostile fields (m1: below threshold, lowest pct/score)',
    /class="noct-toppick" data-id="m1"/.test(lead));
  ok('hero eyebrow is the ruled dict label, unconditioned on any item field',
    lead.includes('<div class="noct-toppick-eyebrow">' + dictEn['results.match_lead'] + '</div>'));
  ok('four-item negative-control input renders one lead and THREE supports (view does not re-apply the engine cap)',
    cardIds(supports).length === 3, `got ${cardIds(supports).length}`);
  ok('supports preserve original input order', cardIds(supports).join(',') === 'm2,m3,m4');
  ok('support 1 labeled Second match, support 2 Third match, support 3 unlabeled (past the named positions)',
    supports.includes('<div class="noct-support-role">' + dictEn['results.match_second'] + '</div>')
    && supports.includes('<div class="noct-support-role">' + dictEn['results.match_third'] + '</div>')
    && (supports.match(/noct-support-role/g) || []).length === 2);
  ok('promotion cue receives the FULL engine list (not a slice)',
    env.offerCue.calls.length === 1 && env.offerCue.calls[0].length === 4);
  ok('support heading renders when supports exist',
    env.get('resultsSupportingHeading').textContent.length > 0);
}
{
  const env = makeResultsEnv({ list: [M('solo')] });
  env.api.render();
  ok('one-item tier: lead renders, support row empty, NO stranded support heading',
    /data-id="solo"/.test(env.get('topPickContainer').innerHTML)
    && env.get('supportingRow').innerHTML === ''
    && env.get('resultsSupportingHeading').textContent === '');
}
{
  const env = makeResultsEnv({ list: [M('a'), M('b')] });
  env.api.render();
  ok('two-item tier: one support labeled Second match',
    cardIds(env.get('supportingRow').innerHTML).join(',') === 'b'
    && env.get('supportingRow').innerHTML.includes(dictEn['results.match_second']));
}
{
  const env = makeResultsEnv({ list: [M('a'), M('b'), M('c')] });
  env.api.render();
  ok('three-item tier: two supports in order with both ordinals',
    cardIds(env.get('supportingRow').innerHTML).join(',') === 'b,c'
    && env.get('supportingRow').innerHTML.includes(dictEn['results.match_third']));
}
{
  const env = makeResultsEnv({ tier: 'bronze', list: HOSTILE });
  env.api.render();
  ok('empty tier renders no fabricated cards and no support heading',
    !/noct-toppick"/.test(env.get('topPickContainer').innerHTML)
    && env.get('supportingRow').innerHTML === ''
    && env.get('resultsSupportingHeading').textContent === '');
}
{
  // Field-mutation immunity: flipping every favorable/unfavorable field
  // changes neither role assignment nor ordinal copy.
  const flipped = HOSTILE.map((m, i) => Object.assign({}, m, {
    meetsMatchThreshold: i === 0, pct: i === 0 ? 100 : 10, score: i === 0 ? 99 : 1,
    matched: !m.matched, kind: 'x' + i, subType: 'y' + i, tier: 'bronze'
  }));
  const env = makeResultsEnv({ list: flipped });
  env.api.render();
  ok('mutating item fields cannot change role or ordinal label',
    /class="noct-toppick" data-id="m1"/.test(env.get('topPickContainer').innerHTML)
    && cardIds(env.get('supportingRow').innerHTML).join(',') === 'm2,m3,m4'
    && env.get('supportingRow').innerHTML.includes(dictEn['results.match_second']));
  ok('no role-selecting predicate in the renderers: neither card source conditions role copy on item fields',
    !/meetsMatchThreshold/.test(topPickSrc) && !/meetsMatchThreshold/.test(supportSrc));
}

// ----------------------------------------------------------------- tier tabs
section('tier tabs — identity, selected state, tier_view, touch, focus');
{
  const env = makeResultsEnv({ list: HOSTILE });
  env.api.render();
  const tabs = env.get('tierTabs').innerHTML;
  ok('three tabs with exact internal identities and stable ids',
    ['gold', 'silver', 'bronze'].every((t) => tabs.includes(`id="tierTab-${t}"`)));
  ok('every tab is type="button"', (tabs.match(/type="button"/g) || []).length === 3);
  ok('exactly one tab carries aria-pressed="true" and it is the active tier',
    (tabs.match(/aria-pressed="true"/g) || []).length === 1
    && /id="tierTab-gold" aria-pressed="true"/.test(tabs));
  ok('inactive tabs carry aria-pressed="false"', (tabs.match(/aria-pressed="false"/g) || []).length === 2);
  ok('EN tab labels', tabs.includes('GOLD') && tabs.includes('SILVER') && tabs.includes('BRONZE'));

  env.api.setTier('silver');
  const tabs2 = env.get('tierTabs').innerHTML;
  ok('a real tier change moves aria-pressed to the new tier',
    /id="tierTab-silver" aria-pressed="true"/.test(tabs2)
    && /id="tierTab-gold" aria-pressed="false"/.test(tabs2));
  ok('a real tier change logs tier_view with the correct tier',
    env.analytics.logged.length === 1
    && env.analytics.logged[0].ev === 'tier_view'
    && env.analytics.logged[0].data.tier === 'silver');
  const focusedTab = env.get('tierTab-silver');
  ok('the tier tap synchronously restores focus to the newly rendered active tab (preventScroll)',
    focusedTab._focusCount === 1 && !!focusedTab._focusOpts && focusedTab._focusOpts.preventScroll === true,
    `focus calls: ${focusedTab._focusCount || 0}`);
  ok('focus restoration targets the incoming tier, never the outgoing one',
    !env.get('tierTab-gold')._focusCount);
  env.api.setTier('silver');
  ok('re-tapping the active tier logs nothing (no duplicate tier_view)',
    env.analytics.logged.length === 1);
  ok('re-tapping the active tier restores no focus (the early return precedes any render)',
    focusedTab._focusCount === 1);
  ok('tierViews counter advanced for the viewed tier', env.analytics.tierViews.silver === 1);
}
{
  const env = makeResultsEnv({ lang: 'es', list: HOSTILE });
  env.api.render();
  const tabs = env.get('tierTabs').innerHTML;
  ok('ES tab labels', tabs.includes('ORO') && tabs.includes('PLATA') && tabs.includes('BRONCE'));
}
ok('tabs keep the shipped onclick + ontouchend pair verbatim (Invariant 10 — touch semantics unchanged)',
  tabsSrc.includes(`onclick="window._setActiveResultsTier(\\'`)
  && tabsSrc.includes(`ontouchend="event.preventDefault();window._setActiveResultsTier(\\'`));
const tabCss = (norm.match(/\.noct-tier-tab \{([^}]*)\}/) || [null, ''])[1];
ok('tier tab meets the 44px touch floor with touch-action: manipulation',
  /min-height: 44px;/.test(tabCss) && /touch-action: manipulation;/.test(tabCss));
ok('base tab reserves the forced-colors border box (transparent border — no reflow on switch)',
  /border: 2px solid transparent;/.test(tabCss));
const tabActiveCss = (norm.match(/\.noct-tier-tab\.active \{([^}]*)\}/) || [null, ''])[1];
ok('active tab state is carried by a token fill, not color alone (and never the raw store primary)',
  /background: var\(--color-text\);/.test(tabActiveCss)
  && /color: var\(--color-surface\);/.test(tabActiveCss)
  && !/store-primary/.test(tabActiveCss));
// Cap widened for Slice 3: the consolidated rule took on the five Quiz and
// Review selectors, so the selector list outgrew the old 400-char scan window.
const consolidatedFocus = norm.match(/\.fin-btn:focus-visible,[\s\S]{0,900}?\{[\s\S]*?\}/);
ok('tier tab joined the consolidated semantic focus rule',
  !!consolidatedFocus && consolidatedFocus[0].includes('.noct-tier-tab:focus-visible')
  && consolidatedFocus[0].includes('var(--focus-ring-outer)'));
const firstForced = norm.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n    \}/);
ok('tier tab focus joins the first forced-colors block (CanvasText, no halo)',
  !!firstForced && firstForced[0].includes('.noct-tier-tab:focus-visible')
  && firstForced[0].includes('outline-color: CanvasText'));
// X11 (North Star D9, 2026-08-31): forced colors paints the RESTING tab's
// reserved 2px transparent border CanvasText too, so a 2px solid cue was no
// cue. The active tab now differs in STYLE and WIDTH (3px double), with the
// padding compensated so the label does not move between states.
const tabForced = norm.match(/@media \(forced-colors: active\)\s*\{[^}]*?\.noct-tier-tab\.active \{ border: (\d+)px (double|solid) CanvasText; padding: (\d+)px (\d+)px (\d+)px (\d+)px; \}\s*\}/);
ok('forced-colors keeps a non-color selected cue for the active tab that differs from the resting tab in style AND width (3px double)',
  !!tabForced && tabForced[1] === '3' && tabForced[2] === 'double');
{
  const base = norm.match(/\.noct-tier-tab \{[^}]*border: (\d+)px solid transparent;[^}]*padding: (\d+)px (\d+)px (\d+)px (\d+)px;/);
  ok('the forced active tab keeps the resting geometry (border + padding per side identical, so no reflow on a tab switch)',
    !!base && !!tabForced && [2, 3, 4, 5].every((i) => Number(base[i]) + Number(base[1]) === Number(tabForced[i + 1]) + Number(tabForced[1])));
}

// ---------------------------------------------------------------- ruled copy
section('ruled EN/ES copy — governed dictionaries, verbatim');
ok('EN dict carries the approved role labels verbatim',
  dictEn['results.match_lead'] === 'Best match'
  && dictEn['results.match_second'] === 'Second match'
  && dictEn['results.match_third'] === 'Third match');
ok('ES dict carries the approved role labels verbatim',
  dictEs['results.match_lead'] === 'Mejor opción'
  && dictEs['results.match_second'] === 'Segunda opción'
  && dictEs['results.match_third'] === 'Tercera opción');
ok('the exact D3 relativity line ships in both dictionaries',
  dictEn['results.match_relativity'] === 'Match strength is relative within each tier'
  && dictEs['results.match_relativity'] === 'La afinidad es relativa dentro de cada nivel');
ok('dict parity: every results.match_* key exists in both languages with distinct values',
  ['results.match_lead', 'results.match_second', 'results.match_third', 'results.match_relativity']
    .every((k) => k in dictEn && k in dictEs && dictEn[k] !== dictEs[k]));
ok('renderers resolve role copy through t() (dict-driven, not inline literals)',
  topPickSrc.includes(`t('results.match_lead')`)
  && supportSrc.includes(`'results.match_second'`)
  && supportSrc.includes(`'results.match_third'`)
  && descriptorSrc.includes(`t('results.match_relativity')`));
{
  const env = makeResultsEnv({ lang: 'es', list: HOSTILE });
  env.api.render();
  const lead = env.get('topPickContainer').innerHTML;
  const supports = env.get('supportingRow').innerHTML;
  const descriptor = env.get('tierDescriptor').innerHTML;
  ok('ES render carries the ES labels with correct accents',
    lead.includes('Mejor opción') && supports.includes('Segunda opción')
    && supports.includes('Tercera opción'));
  ok('ES relativity line renders verbatim in the tier descriptor',
    descriptor.includes('La afinidad es relativa dentro de cada nivel'));
}
{
  const env = makeResultsEnv({ list: HOSTILE });
  env.api.render();
  ok('EN relativity line renders verbatim in the tier descriptor',
    env.get('tierDescriptor').innerHTML
      .includes('<span class="tier-relativity">Match strength is relative within each tier</span>'));
}

// --------------------------------------------------- descriptor retirement
section('buyer-characterising descriptor retired');
ok('no "entry-level" anywhere in index.html', !/entry-level/i.test(norm));
ok('no "básico" / "nivel de entrada" anywhere in index.html',
  !/básico|basico|nivel de entrada/i.test(norm));
ok('no buyer label survives in either dictionary',
  !/entry-level|básico|nivel de entrada/i.test(JSON.stringify(dictEn) + JSON.stringify(dictEs)));
ok('Bronze descriptor is the bare tier name (no replacement buyer label)',
  descriptorSrc.includes(`html = '<span class="tier-name">Bronze</span>';`)
  && descriptorSrc.includes(`html = '<span class="tier-name">Bronce</span>';`));
ok('Gold/Silver keep their product-descriptive lines',
  descriptorSrc.includes('premium materials') && descriptorSrc.includes('mid-range value'));

// ------------------------------------- synthesized priorities: Results only
section('synthesized priorities de-rendered from Results cards only');
ok('neither card renderer calls buildMattressPriorities (execution above would have thrown if referenced)',
  !topPickSrc.includes('buildMattressPriorities') && !supportSrc.includes('buildMattressPriorities'));
ok('the priority row / chip markup is gone from both renderers',
  !/noct-toppick-priority/.test(topPickSrc) && !/noct-support-chip/.test(supportSrc));
ok('buildMattressPriorities() itself survives, unchanged in reach',
  norm.includes('function buildMattressPriorities(m)'));
// Slice 6: the Consultation Summary became a read model and dropped its
// re-derived reason line (4 -> 3). Item 1.3 containment (2026-08-24) then
// removed the compare modal's gated why-fit derivation (3 -> 2), so the
// helper's only remaining consumers are its own definition and the drawer
// DATA builder - which assembles `feats` that nothing renders. The helper
// therefore has NO rendered consumer at all, which is the containment.
ok('exactly its non-Results consumers remain: definition + drawer data',
  (norm.match(/buildMattressPriorities\(/g) || []).length === 2,
  `found ${(norm.match(/buildMattressPriorities\(/g) || []).length} occurrences`);
const drawerDataSrc = extractFunction('function buildDrawerData()');
ok('the drawer data path still consumes the helper',
  !!drawerDataSrc && drawerDataSrc.includes('buildMattressPriorities(m)'));

// -------------------------------------------------------------- banned output
section('banned content never renders');
{
  for (const lang of ['en', 'es']) {
    const env = makeResultsEnv({ lang, list: HOSTILE });
    env.api.render();
    const out = env.get('tierTabs').innerHTML + env.get('tierDescriptor').innerHTML
      + env.get('topPickContainer').innerHTML + env.get('supportingRow').innerHTML
      + env.get('resultsSupportingHeading').textContent;
    ok(`[${lang}] no match percentage, ring, or gauge treatment on Results output`,
      !/\d\s*%/.test(out) && !/\bpct\b/.test(out) && !/-ring|gauge|stroke-dasharray/i.test(out));
    ok(`[${lang}] no provenance/origin content despite locallyMade:true on every fixture`,
      !/texas|hecho en|made locally|locallyMade|origin/i.test(out));
    ok(`[${lang}] no archetype nickname reaches the cards`, !out.includes('NICKNAME-SENTINEL'));
    ok(`[${lang}] no availability vocabulary`, !/stock|disponible|availab/i.test(out));
    ok(`[${lang}] promotion sentinels survive on lead AND support cards`,
      env.get('topPickContainer').innerHTML.includes('<!--PROMO-TAB-->')
      && env.get('topPickContainer').innerHTML.includes('<!--PROMO-BADGES-->')
      && env.get('supportingRow').innerHTML.includes('<!--PROMO-TAB-->')
      && env.get('supportingRow').innerHTML.includes('<!--PROMO-BADGES-->'));
  }
}
{
  const env = makeResultsEnv({ list: HOSTILE });
  env.api.render();
  const lead = env.get('topPickContainer').innerHTML;
  const supports = env.get('supportingRow').innerHTML;
  ok('missing approved reason content omits the reason block completely (no fallback)',
    !lead.includes('noct-toppick-reason')
    && (supports.match(/noct-support-reason/g) || []).length === 1
    && supports.includes('reason-two'));
  ok('renderers synthesise no reason from features/highlight/tags/answers',
    !/m\.features|m\.highlight|m\.quizTags|answers\[/.test(topPickSrc + supportSrc));
}
ok('renderers reference no archetype or locallyMade field',
  !/archetype|locallyMade/.test(topPickSrc + supportSrc + tabsSrc + descriptorSrc + renderSrc));

// ------------------------------------------------------------------- wiring
section('wiring — drawer order, handler precedence, wipe inventory, timers');
ok('lead container precedes the support row in the document (drawer prev/next order: hero first)',
  norm.indexOf('id="topPickContainer"') < norm.indexOf('id="supportingRow"'));
const drawerOpenSrc = extractFunction('function openResultCardDrawer(card)');
ok('drawer ordering walks lead then supports in DOM order',
  !!drawerOpenSrc
  && drawerOpenSrc.indexOf('.noct-toppick[data-tier=') < drawerOpenSrc.indexOf('.noct-support-card[data-tier='));
{
  const handlerStart = norm.indexOf(`document.addEventListener('click', function(e) {`);
  const handlerSlice = norm.slice(handlerStart, handlerStart + 4000);
  ok('delegated handler routes .compare-btn BEFORE the card-open path (compare never opens the drawer)',
    handlerStart !== -1
    && handlerSlice.indexOf(`'.compare-btn'`) !== -1
    && handlerSlice.indexOf(`'.compare-btn'`) < handlerSlice.indexOf(`'.noct-toppick, .noct-support-card'`));
}
{
  // Language switch preserves the session: same state object re-rendered in
  // ES keeps the active tier and the compare selection.
  const state = { activeTier: 'gold', tierData: { gold: HOSTILE, silver: [], bronze: [] } };
  const en = makeResultsEnv({ lang: 'en', state, compare: ['m2'] });
  en.api.render();
  const es = makeResultsEnv({ lang: 'es', state, compare: ['m2'] });
  es.api.render();
  ok('language switching preserves the active tier and the Compare selection',
    es.api.getState().activeTier === 'gold'
    && /data-id="m2" aria-pressed="true"/.test(es.get('supportingRow').innerHTML));
}
const contentIds = (norm.match(/SESSION_CONTENT_IDS = \[[\s\S]*?\]/) || [''])[0];
ok('wipe inventory still owns every Results container this slice renders into',
  ['tierTabs', 'tierDescriptor', 'topPickContainer', 'supportingRow']
    .every((id) => contentIds.includes(`'${id}'`)));
ok('no new timers or animation frames entered the Results render path',
  !/setTimeout|setInterval|requestAnimationFrame/
    .test(tabsSrc + descriptorSrc + topPickSrc + supportSrc + renderSrc + setTierSrc));

// ----------------------------------------------------- contrast arithmetic
section('contrast — independent WCAG arithmetic on the shipped theme tokens');
function hexToRgb(hex) { const h = hex.replace('#', ''); return [0, 2, 4].map((x) => parseInt(h.slice(x, x + 2), 16)); }
function lum(rgb) {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = rgb.map(f); return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); }
{
  const theme = norm.match(/body:has\(#resultsScreen\.active\),[\s\S]{0,400}?--color-bg: (#[0-9A-Fa-f]{6});\s*--color-surface: (#[0-9A-Fa-f]{6});[\s\S]{0,200}?--color-text: (#[0-9A-Fa-f]{6});\s*--color-text-muted: (#[0-9A-Fa-f]{6});/);
  ok('results (showroom) theme tokens located', !!theme);
  if (theme) {
    const [, bg, surface, text, muted] = theme;
    const label = ratio(hexToRgb(surface), hexToRgb(text));
    ok('active pill label (surface on text fill) clears 4.5:1', label >= 4.5, label.toFixed(2) + ':1');
    const fill = ratio(hexToRgb(text), hexToRgb(bg));
    ok('active pill fill clears 3:1 against the page (state indicator floor)', fill >= 3, fill.toFixed(2) + ':1');
    const rel = ratio(hexToRgb(muted), hexToRgb(bg));
    ok('relativity line ink clears 4.5:1 on the page', rel >= 4.5, rel.toFixed(2) + ':1');
    ok('resting (inactive) tab ink is the muted token and clears 4.5:1 on the page',
      /color: var\(--color-text-muted\);/.test(tabCss) && rel >= 4.5, rel.toFixed(2) + ':1');
    const descCss = (norm.match(/\.noct-tier-descriptor \{([^}]*)\}/) || [null, ''])[1];
    ok('tier descriptor ink is the muted token (subtle is below the floor at 13px/12px)',
      /color: var\(--color-text-muted\);/.test(descCss));
  }
  const ink = norm.match(/--accent-ink:\s*(#[0-9A-Fa-f]{6})/);
  ok('support role label resolves to --accent-ink on the results surface (warm-theme group)',
    /#resultsScreen \.noct-support-role,/.test(norm) && !!ink);
  if (ink && theme) {
    const role = ratio(hexToRgb(ink[1]), hexToRgb(theme[2]));
    ok('support role ink clears 4.5:1 on the card surface', role >= 4.5, role.toFixed(2) + ':1');
  }
}

// ---------------------------------------------------- negative controls
section('negative controls — the load-bearing assertions genuinely bite');
// A control whose replacement silently missed would exercise UNMUTATED code
// and could pass while proving nothing — the exact vacuity the sweep bans.
function mustReplace(src, find, replace) {
  const out = src.replace(find, replace);
  if (out === src) throw new Error('negative-control mutation did not apply: ' + find);
  return out;
}
{
  const env = makeResultsEnv({
    list: HOSTILE,
    mutate: (s) => mustReplace(s, 'renderTopPickCard(list[0], tier);', 'renderTopPickCard(list[1], tier);')
  });
  env.api.render();
  ok('control: a hero moved off index 0 is detected',
    !/class="noct-toppick" data-id="m1"/.test(env.get('topPickContainer').innerHTML));
}
{
  const env = makeResultsEnv({
    list: HOSTILE,
    mutate: (s) => mustReplace(s, 'var supports = list.slice(1);', 'var supports = list.slice(1, 3);')
  });
  env.api.render();
  ok('control: a re-applied presentation cap is detected (3 supports become 2)',
    cardIds(env.get('supportingRow').innerHTML).length === 2);
}
{
  const env = makeResultsEnv({ list: HOSTILE, dict: {} });
  env.api.render();
  ok('control: a dict bypass is detected (empty dictionary degrades to the raw key, not silent English)',
    env.get('topPickContainer').innerHTML.includes('results.match_lead'));
}
{
  const env = makeResultsEnv({
    list: HOSTILE,
    mutate: (s) => mustReplace(s, "var tab = document.getElementById('tierTab-' + tier);", 'var tab = null;')
  });
  env.api.render();
  env.api.setTier('silver');
  ok('control: a dropped focus restore is detected (no focus call reaches the new active tab)',
    !env.get('tierTab-silver')._focusCount);
}

// ============================================================================
// ITEM 1.3 REASON-GATE CONTAINMENT (owner ruling 2026-08-24)
// ----------------------------------------------------------------------------
// Two rendered per-model, per-customer "why this fits" outputs predated the
// gate (entered 2da6fef, before the gate at fc3329b): the drawer's
// "Why it made your shortlist" sentence and the Compare "Why it is here" row.
// Their history is not a breach, but they are not grandfathered: the gate
// fails closed by OMISSION. The Compare half is pinned in
// tests/compare_modal_check.mjs; the drawer half and the catalog-reason
// reachability facts are pinned here.
//
// Containment is of the RENDERED OUTPUT. The producing functions are retained
// on purpose - breaking them would hide, not contain, and would change what
// other suites can execute. So the first assertion proves the producer still
// WORKS, and the rest prove nothing renders it.
// ============================================================================
{
  // LIVE SOURCE: index.html with HTML comments and JS line comments removed,
  // so containment is judged on code that can actually execute or render.
  // Commentary that quotes a retired literal is documentation, not output.
  const live = norm
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .filter((l) => !/^\s*\/\//.test(l))
    .join('\n');

  const shortlistSrc = extractFunction('function mattressShortlistFitText(m)');
  ok('the why-fit producer is retained, not broken (containment is by omission)',
    !!shortlistSrc && shortlistSrc.includes('function mattressShortlistFitText(m)'));

  // EXECUTE the real producer in both languages against a real-shaped model,
  // so a future "containment" that silently guts the function is detected.
  const makeShortlist = (lang, answers) => new Function('currentLang', 'answers', `"use strict";
    ${extractFunction('function firmnessFeel(score)')}
    ${extractFunction('function mattressResponseLabel(m)')}
    ${shortlistSrc}
    return mattressShortlistFitText;`)(lang, answers);

  const hotSideSleeper = {
    temperature: 'hot', sleep_position: 'side', sleep_issues: ['back_pain'],
    partner_sleep: 'partner', health_conditions: []
  };
  const model = { id: 'x1', features: ['cooling', 'pressure', 'support', 'motion'],
                  archetype: 'hybrid', firmness: 5 };

  const en = makeShortlist('en', hotSideSleeper)(model);
  const es = makeShortlist('es', hotSideSleeper)(model);
  ok('producer still yields answer-derived EN text when executed directly',
    typeof en === 'string' && en.length > 0);
  ok('producer still yields answer-derived ES text when executed directly',
    typeof es === 'string' && es.length > 0 && es !== en);

  // ---- the containment itself ---------------------------------------------
  ok('no renderer calls the why-fit producer any more',
    (live.match(/mattressShortlistFitText\(/g) || []).length === 1,
    `found ${(live.match(/mattressShortlistFitText\(/g) || []).length} live occurrences (definition only expected)`);

  ok('the drawer why-fit heading element is gone (no stranded label)',
    !norm.includes('id="drawerWhyLabel"'));
  ok('the drawer why-fit container element is gone (no empty box, no a11y remnant)',
    !norm.includes('id="drawerShortlistFit"'));

  // Both languages: neither literal may survive anywhere in the shipped app.
  for (const [lang, literal] of [['EN', 'Why it made your shortlist'],
                                 ['ES', 'Por qué llegó a tu lista']]) {
    ok(`${lang}: the contained drawer why-fit string appears in no live code`,
      !live.includes(literal));
  }
  // The Compare labels are contained too - pinned in compare_modal_check.mjs
  // by execution; pinned here as a source-level backstop in both languages.
  for (const [lang, literal] of [['EN', 'Why it is here'],
                                 ['ES', 'Por qué está aquí']]) {
    ok(`${lang}: the contained Compare why-fit label appears in no live code`,
      !live.includes(literal));
  }

  // No language-switch path can restore it: renderDrawer is the only writer
  // and runs on every open AND every switch, so absence there is sufficient.
  const drawerWriter = norm.includes('function renderDrawer(')
    ? extractFunction('function renderDrawer(') : null;
  if (drawerWriter) {
    ok('the drawer writer contains no why-fit write in either language',
      !drawerWriter.includes('drawerWhyLabel') && !drawerWriter.includes('drawerShortlistFit'));
  }

  // ---- preserved drawer content must still be written ----------------------
  for (const id of ['drawerFeelAnchor', 'drawerDifferentiatorsLabel',
                    'drawerDifferentiators']) {
    ok(`preserved drawer surface still present: ${id}`, norm.includes(`id="${id}"`));
  }

  // ---- catalog reason objects remain non-rendering (dead), unchanged --------
  ok('catalog reasons still have exactly one reader, inside the scoring loop',
    (norm.match(/\.reasons\?\.\[/g) || []).length === 1);
  ok('catalog reasons_es still has NO reader at all',
    !norm.includes('reasons_es'));
  ok('the per-feature reason harvest is still discarded, not rendered',
    /var calc = calculateScores\(\);\s*\n\s*var scores = calc\.scores;/.test(norm) &&
    !norm.includes('calc.matchReasons'));

  // ---- product-specific reason-like surfaces are NOT contained -------------
  // These are outside the gate because they are product-specific, not derived
  // from the customer's answers. Proven, not asserted: their extracted bodies
  // must contain no read of `answers`.
  for (const [name, anchor] of [
    ['topPickReasonText', 'function topPickReasonText(m)'],
    ['mattressDifferentiators', 'function mattressDifferentiators(m)'],
    ['hf2ReasonFor', 'function hf2ReasonFor(m, tier)'],
    ['mattressDifferenceText', 'function mattressDifferenceText(m)']
  ]) {
    const body = extractFunction(anchor);
    ok(`${name} is outside the gate: it reads no customer answer`,
      !!body && !/answers[.[]/.test(body));
  }
}

// ------------------------------------------------ C5: count-aware nouns
// Cohesion pass-1 ruling C5 (2026-08-30): the floating Selections pill
// rendered a live number beside a static plural ("1 Selections"); the ES
// label ("Favoritos") disagreed with the control's accessible name ("Ver
// tus selecciones"); and the take-home packet concatenated "1 guardados".
// House style: EXECUTE the real producers against the DOM shim with each
// governed dictionary; the take-home packet literal is evaluated with the
// same free variables showEmailCapture() gives it.
section('C5 — the Selections pill and the take-home saved count agree with their number');
{
  const labelSrc = extractFunction('window._picksPillLabel = function(total)');
  const badgeSrc = extractFunction('window._updatePicksBadge = function()');
  ok('pill label producer and badge renderer found', !!labelSrc && !!badgeSrc);

  function pillEnv(lang, saved, acc = 0, mutate = null) {
    const els = new Map();
    const doc = {
      getElementById(id) {
        if (!els.has(id)) {
          const el = makeEl(id);
          // the badge renderer uses classList.toggle(cls, force), which the
          // shared shim does not model
          el.classList.toggle = (c, force) => {
            const on = force === undefined ? !el.classList._s.has(c) : !!force;
            if (on) el.classList._s.add(c); else el.classList._s.delete(c);
            return on;
          };
          els.set(id, el);
        }
        return els.get(id);
      }
    };
    const D = lang === 'es' ? dictEs : dictEn;
    const t = (key) => Object.prototype.hasOwnProperty.call(D, key) ? D[key] : key;
    const win = { _savedPicks: Array.from({ length: saved }, (_, i) => ({ id: 'm' + i })), _accCart: {} };
    for (let i = 0; i < acc; i++) win._accCart['a' + i] = true;
    let src = labelSrc + '\n' + badgeSrc;
    if (mutate) src = mutate(src);
    new Function('window', 'document', 't', '"use strict";\n' + src)(win, doc, t);
    win._updatePicksBadge();
    return {
      label: doc.getElementById('savedPicksLabel').textContent,
      count: String(doc.getElementById('savedPicksCount').textContent),
      visible: doc.getElementById('savedPicksBtn').classList.contains('noct-picks-pill--visible')
    };
  }
  if (labelSrc && badgeSrc) {
    const en1 = pillEnv('en', 1), en2 = pillEnv('en', 2), enMixed = pillEnv('en', 1, 1), en0 = pillEnv('en', 0);
    ok('EN: one saved pick renders "1 Selection"', en1.count === '1' && en1.label === 'Selection', `${en1.count} ${en1.label}`);
    ok('EN: two saved picks render "2 Selections"', en2.count === '2' && en2.label === 'Selections', `${en2.count} ${en2.label}`);
    ok('EN: the noun follows the TOTAL (1 mattress + 1 accessory = 2 Selections)', enMixed.count === '2' && enMixed.label === 'Selections');
    ok('EN: zero picks hides the pill (label stays plural, never "0 Selection")', !en0.visible && en0.label === 'Selections');
    const es1 = pillEnv('es', 1), es2 = pillEnv('es', 2);
    ok('ES: one saved pick renders "1 Selección"', es1.label === 'Selección', es1.label);
    ok('ES: two saved picks render "2 Selecciones"', es2.label === 'Selecciones', es2.label);
    ok('ES: the pill label no longer reads "Favoritos" (it agrees with its accessible name "Ver tus selecciones")',
      dictEs['header.picks'] !== 'Favoritos' && norm.includes("'Ver tus selecciones'"));
    ok('both governed dictionaries carry the singular / plural pair',
      typeof dictEn['header.picks_one'] === 'string' && typeof dictEs['header.picks_one'] === 'string'
      && dictEn['header.picks'] !== dictEn['header.picks_one'] && dictEs['header.picks'] !== dictEs['header.picks_one']);
    ok('the label span is owned by the renderer (id, no static data-i18n plural)',
      /<span class="noct-picks-pill__label" id="savedPicksLabel">/.test(html)
      && !/noct-picks-pill__label"[^>]*data-i18n=/.test(html));
    ok('applyTranslations() re-derives the label through the same producer on a language switch',
      /var picksLabel = document\.getElementById\('savedPicksLabel'\);[\s\S]{0,400}?window\._picksPillLabel\(\s*parseInt\(picksCountEl && picksCountEl\.textContent, 10\) \|\| 0\)/.test(html));
    // negative control: an always-plural producer must be caught above
    const mutated = pillEnv('en', 1, 0, (s) => mustReplace(s, "t(total === 1 ? 'header.picks_one' : 'header.picks')", "t('header.picks')"));
    ok('negative control: an always-plural producer renders "1 Selections" (so the singular assertion bites)', mutated.label === 'Selections');
  }

  // ---- take-home packet: ES participles agree with the count -------------
  const pStart = html.indexOf('var packet = [');
  const pEnd = pStart === -1 ? -1 : html.indexOf('\n      ];', pStart);
  ok('take-home packet literal found inside showEmailCapture()', pStart !== -1 && pEnd !== -1 && pStart > html.indexOf('window.showEmailCapture = function()'));
  if (pStart !== -1 && pEnd !== -1) {
    const literal = html.slice(pStart + 'var packet = '.length, pEnd + '\n      ]'.length);
    const build = (es, saved, rec, acc = 0) => new Function('_esE', 'savedMattresses', 'recCount', 'selectedAccessories', '"use strict"; return ' + literal + ';')(
      es, Array.from({ length: saved }, () => ({})), rec, Array.from({ length: acc }, () => ({})));
    const detailOf = (rows) => rows.find((r) => /guardad|saved|recomend|recommend/.test(r.detail || '')).detail;
    ok('ES: one saved pick reads "1 guardado ·"', detailOf(build(true, 1, 3)).startsWith('1 guardado ·'), detailOf(build(true, 1, 3)));
    ok('ES: two saved picks read "2 guardados ·"', detailOf(build(true, 2, 3)).startsWith('2 guardados ·'));
    ok('ES: one recommended match (nothing saved) reads "1 recomendado ·"', detailOf(build(true, 0, 1)).startsWith('1 recomendado ·'));
    ok('ES: three recommended matches read "3 recomendados ·"', detailOf(build(true, 0, 3)).startsWith('3 recomendados ·'));
    ok('EN: the invariant forms are untouched ("1 saved ·", "2 saved ·", "3 recommended ·")',
      detailOf(build(false, 1, 3)).startsWith('1 saved ·') && detailOf(build(false, 2, 3)).startsWith('2 saved ·') && detailOf(build(false, 0, 3)).startsWith('3 recommended ·'));
  }
}

// ------------------------------------------------ X12: 44px touch floor
// North Star ruling D9 (2026-08-31): one bounded PR for every control the
// swarm measured under 44 CSS px (Welcome language toggle, compare tray,
// Selections pill, "Save for later", Compare close, drawer Back/Prev/Next,
// Summary pick / accessory actions, RSA strip and add, take-home secondary
// actions). The rendered sweep in tests/sleep_plan_layout_check.py proves
// the result; these pins keep each declaration in place. Two exceptions are
// recorded, not repaired: the card's "View details" (the card itself opens
// the drawer) and the inline privacy link (running text).
section('X12 — the 44px touch floor is declared on every listed control');
{
  const rule = (sel) => (norm.match(new RegExp('\\n    ' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')) || [null, ''])[1];
  const floor = [
    ['.landing-lang-btn', /min-height: 44px;[\s\S]*min-width: 44px;/],
    ['.noct-save-btn', /min-height: 44px;/],
    ['.noct-email-secondary', /min-height: 44px;/],
    ['.hf2-acc-card__action', /min-height: 44px;/],
    ['.hf2-pick__action', /min-height: 44px;/],
    ['.hf2-rsa-strip__btn', /min-height: 44px;/],
    ['.hf2-rsa-panel__add', /min-height: 44px;/],
    ['.noct-picks-pill', /min-height: 44px;/],
    ['.compare-modal-close', /min-width: 44px;[\s\S]*min-height: 44px;/],
    ['.drawer-back-to-results', /min-height: 44px;/],
    ['.drawer-nav-btn', /min-height: 44px;/]
  ];
  for (const [sel, re] of floor) ok(`${sel} declares the 44px floor`, re.test(rule(sel)), rule(sel).replace(/\s+/g, ' ').slice(0, 70));
  ok('.compare-tray-clear / .compare-tray-go declare the 44px floor in both dimensions',
    /\.compare-tray-clear, \.compare-tray-go \{ white-space: nowrap; min-height: 44px; min-width: 44px; \}/.test(norm));
  ok('no listed control keeps the old 42px floor',
    !/\.(hf2-pick__action|hf2-acc-card__action|drawer-back-to-results|drawer-nav-btn) \{[^}]*min-height: 42px;/.test(norm));
  const ring = norm.match(/\.compare-modal-close:focus-visible \{([^}]*)\}/);
  ok('the Compare close control carries the two-ring author focus indicator',
    !!ring && /outline: 3px solid var\(--focus-ring-outer\);/.test(ring[1]) && /box-shadow: 0 0 0 5px var\(--focus-ring-inner\);/.test(ring[1]));
  const fc = norm.match(/@media \(forced-colors: active\) \{\s*\.compare-modal-close:focus-visible \{\s*outline-color: CanvasText;\s*box-shadow: none;\s*\}\s*\}/);
  ok('...with a CanvasText fallback placed after the anchored first forced-colors block',
    !!fc && norm.indexOf(fc[0]) > norm.indexOf('.fin-btn:focus-visible'));
}

// ------------------------------------------ Wave 3: media foundation
// North Star ruling 2026-08-31 (D1/D2 route, Wave 3): a source whose natural
// aspect ratio exceeds 3 is a banner crop (the two Tempur-Pedic Gold sources
// ship at 4.05:1 / 4.42:1) — it letterboxes on a white mat instead of being
// cropped and upscaled by `cover`; and every product frame sits on the white
// image mat. The rendered proof is tests/sleep_plan_layout_check.py's banner
// pass; the static contract is pinned here. The re-export request itself is
// docs/asset-request-north-star-2026-08-31.md (owner-supplied data — code
// must not pretend to fix it).
section('Wave 3 — banner fallback and white image mats (X4/X5)');
{
  ok('the banner tagger exists with the ruled threshold (natural AR > 3)',
    /function dfTagBannerImage\(img\)/.test(norm) && /var DF_BANNER_AR = 3;/.test(norm)
    && /img\.naturalWidth \/ img\.naturalHeight > DF_BANNER_AR/.test(norm));
  ok('one CAPTURE-phase load listener feeds it (load does not bubble; registered before any product markup renders)',
    /document\.addEventListener\('load', function\(e\) \{\s*dfTagBannerImage\(e\.target\);\s*\}, true\);/.test(norm));
  const bannerRule = (norm.match(/\.df-img--banner \{([^}]*)\}/) || [null, ''])[1];
  ok('the fallback rule letterboxes on the white mat and outranks the drawer hero inline style (!important is load-bearing)',
    /object-fit: contain !important;/.test(bannerRule) && /background: #FFFDF8;/.test(bannerRule));
  const rule = (sel) => (norm.match(new RegExp('\\n    ' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{([^}]*)\\}')) || [null, ''])[1];
  const mats = [
    ['.noct-toppick-photo', /background: #FFFDF8;/],
    ['.noct-support-photo', /background: #FFFDF8;/],
    ['.sleep-system__featured-image', /aspect-ratio: 2 \/ 1;[\s\S]*background: #FFFDF8;/],
    ['.sleep-system__anchor-image', /aspect-ratio: 3 \/ 2;[\s\S]*background: #FFFDF8;/],
    ['.sleep-system__alternative img', /background: #FFFDF8;/]
  ];
  for (const [sel, re] of mats) ok(`${sel} sits on the white image mat (frame contract kept)`, re.test(rule(sel)), rule(sel).replace(/\s+/g, ' ').slice(0, 70));
  ok('the Compare head light override is the white mat with a hairline',
    /body:has\(#resultsScreen\.active\) \.cmp-head-img,\s*body:has\(#hf2Screen\.active\) \.cmp-head-img \{\s*background: #FFFDF8;[^}]*border: 1px solid #D1C5B6;\s*\}/.test(norm));
  ok('no results product frame keeps the beige mat token',
    !/\.noct-(toppick|support)-photo \{[^}]*var\(--color-surface-alt\)/.test(norm));
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
