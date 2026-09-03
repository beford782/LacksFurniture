// a31_presentation_check.mjs — the A3.1 copy-reduction / functional-visual
// candidate (owner directive 2026-09-01, evening): the three presentation-layer
// audience corrections the owner ruled, pinned so they cannot silently regress
// and so the protected surfaces around them provably did not move.
//
//   1. Ruling 6 — the quiz completion label is "Finish and review together"
//      (ES provisional), promises no signature, is dictionary-driven, and the
//      completion still lands on the tablet handoff (five endpoints, no more).
//   2. Ruling 5 — a `confirm` ("specialist check needed") decision joins the
//      Summary's "Still open" list, qualified by its state, through a
//      dictionary pair; the specialist workspace's own classification of that
//      decision (addressed / considered) is untouched. EXECUTED against the
//      real lead-line renderer in both languages, plus a negative control.
//   3. Ruling 3 — the accessory engine records a reason KEY beside every
//      reason string (reasonKeys parallel to reasons) while the strings the
//      fixture, the Summary card and the take-home payload consume are
//      byte-identical; the specialist reason adapter maps keys to neutral
//      evidence tags (all matched keys named), falls back to the engine string
//      on anything unmapped, and is consumed by exactly the two specialist
//      surfaces (Sleep System featured card, drawer finalist-pillow prompt).
//      EXECUTED scorer and adapter, plus negative controls.
//   Product-proof drawer (owner-approved revision 2026-09-02): the trial
//      drawer section covers the reversible finalist / Save model; the
//      product-proof content section pins the explicit nine-column schema
//      extension, 26-model coverage, family sharing, canonical lineage and
//      the copy rules (A31_PP_ROOT runs it against another tree).
//
// House style: readFileSync + extract-and-execute against a DOM shim. Writes
// nothing; exit 0 = pass.
//
// Run: node tests/a31_presentation_check.mjs

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const norm = html.replace(/\r\n/g, '\n');
const dictEn = JSON.parse(readFileSync(join(root, 'data', 'dict-en.json'), 'utf8'));
const dictEs = JSON.parse(readFileSync(join(root, 'data', 'dict-es.json'), 'utf8'));
const ACCESSORIES = JSON.parse(readFileSync(join(root, 'data', 'accessories.json'), 'utf8'));

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
function extractArray(anchor) {
  const start = norm.indexOf(anchor);
  if (start === -1) return null;
  let i = norm.indexOf('[', start);
  let depth = 1;
  i++;
  while (i < norm.length && depth > 0) {
    const ch = norm[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    i++;
  }
  return norm.slice(start, i) + ';';
}
function mustReplace(src, find, replace) {
  const out = src.replace(find, replace);
  if (out === src) throw new Error('control mutation did not apply: ' + String(find).slice(0, 60));
  return out;
}
// LIVE SOURCE: index.html with HTML comments and full-line JS comments
// removed, so a retired literal is judged on code that can execute or render.
const liveHtml = norm.replace(/<!--[\s\S]*?-->/g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SECOND_PERSON_EN = /\b(you|your|yours|yourself)\b/i;
const SECOND_PERSON_ES = /(?<!\p{L})(tu|tus|te|ti|tú|usted|ustedes)(?!\p{L})/iu;

// =========================================================== 1. ruling 6
section('ruling 6 — quiz completion: "Finish and review together", no signature promise, handoff unchanged');
{
  ok('EN dictionary carries the ruled completion label',
    dictEn['brief.quiz_finish'] === 'Finish and review together');
  ok('ES dictionary carries the provisional translation (distinct from EN)',
    dictEs['brief.quiz_finish'] === 'Terminar y revisar juntos' && dictEs['brief.quiz_finish'] !== dictEn['brief.quiz_finish']);
  ok('the label promises no signature in either language (the signature appears one screen later, after Begin)',
    !/signature|firma/i.test(dictEn['brief.quiz_finish'] + ' ' + dictEs['brief.quiz_finish']));
  ok('the label carries no decorative arrow and no first person',
    !/→|&rarr;/.test(dictEn['brief.quiz_finish'] + dictEs['brief.quiz_finish'])
    && !/\b(my|me|I)\b/.test(dictEn['brief.quiz_finish']) && !/\b(mi|mis|yo)\b/i.test(dictEs['brief.quiz_finish']));
  ok('the static control matches the rendered dictionary string (no two-narrator flash)',
    /id="reviewNextBtn">Finish and review together<\/button>/.test(norm));
  ok('the control is relabeled through the dictionary at render time, not a literal',
    /nextBtn\.textContent = t\('brief\.quiz_finish'\)/.test(norm)
    && (norm.match(/See my sleep signature/g) || []).length === 0);
  ok('the completion still lands on the tablet handoff: exactly five call sites, none added',
    (norm.match(/window\.showTabletHandoff\(\);/g) || []).length === 5);
  ok('the retired label is absent from the demo bundle too (regenerated)',
    !readFileSync(join(root, 'demo', 'black-friday', 'index.html'), 'utf8').includes('See my sleep signature'));
}

// =========================================================== 2. ruling 5
section('ruling 5 — a specialist-check-needed decision is genuinely unresolved on the shared Summary');
const leadSrc = extractFunction('function renderHf2LeadLine()');
const finSrc = extractFunction('function resolveFinalistState()');
const fallbackSrc = extractFunction('function finalistRecommendedFallback()');
const lineSrc = extractFunction('function sleepPlanModelLine(m)');
const tierSrc = extractFunction('function sleepPlanTierLabel(tier)');
const decisionSrc = extractFunction('function sleepSystemDecision(stepId)');
const textSrc = extractFunction('function sleepSystemText(value)');
const stepForSrc = extractFunction('function sleepSystemStepForItem(item)');
const catSrc = extractFunction('function sleepSystemCategory(item)');
const stepsSrc = extractArray('const SLEEP_SYSTEM_STEPS =');
ok('lead-line sources extracted',
  !!leadSrc && !!finSrc && !!fallbackSrc && !!lineSrc && !!tierSrc && !!decisionSrc && !!textSrc && !!stepForSrc && !!catSrc && !!stepsSrc);
ok('the Still-open filter names the confirm state beside later and open (source)',
  leadSrc.includes("return st === 'later' || st === 'open' || st === 'confirm';"));
ok('the qualified row renders through a dictionary pair carrying the {step} slot in both languages',
  typeof dictEn['hf2.status_open_check'] === 'string' && dictEn['hf2.status_open_check'].includes('{step}')
  && typeof dictEs['hf2.status_open_check'] === 'string' && dictEs['hf2.status_open_check'].includes('{step}')
  && dictEn['hf2.status_open_check'] !== dictEs['hf2.status_open_check']
  && leadSrc.includes("t('hf2.status_open_check', { step: label })"));
ok('the specialist workspace still classifies confirm as addressed (considered) — untouched by the ruling',
  /if \(status === 'already' \|\| status === 'confirm' \|\| status === 'demo'\) return 'addressed';/.test(norm));

function makeLeadEnv({ lang = 'en', decisions = {}, mutate = null } = {}) {
  const els = new Map();
  const el = (id) => ({ id, textContent: '', innerHTML: '', hidden: false, className: '' });
  const doc = { getElementById(id) { if (!els.has(id)) els.set(id, el(id)); return els.get(id); } };
  const D = lang === 'es' ? dictEs : dictEn;
  const t = (k, repl) => {
    let v = Object.prototype.hasOwnProperty.call(D, k) ? D[k] : k;
    if (repl) Object.keys(repl).forEach((r) => { v = v.split('{' + r + '}').join(repl[r]); });
    return v;
  };
  const win = {
    _savedPicks: [{ id: 'g1', name: 'Cloud Nine', brand: 'Restonic', tier: 'gold', imageUrl: '' }],
    _favoriteMattressId: 'g1',
    _accCart: {},
    _mattressReactions: {},
    _sleepSystemState: { decisions }
  };
  let src = [stepsSrc, catSrc, stepForSrc, textSrc, decisionSrc, finSrc, fallbackSrc, tierSrc, lineSrc, leadSrc].join('\n')
    + '\nout.run = function() { renderHf2LeadLine(); };';
  if (mutate) src = mutate(src);
  const out = {};
  new Function('window', 'document', 't', 'FC', 'financingEnabled', 'finPaymentPaths', 'payPref', 'PAY_NOT_NOW',
    '_resultsState', 'currentLang', 'ACCESSORIES', 'escapeHtml', 'reactionLabel', 'out',
    '"use strict";' + src)(
    win, doc, t, (k) => k, () => false, () => [], null, 'not_now', null, lang, ACCESSORIES,
    (v) => String(v), (r) => r, out);
  out.run();
  return { rows: doc.getElementById('hf2StatusRows'), els };
}
{
  const mixed = { support: { status: 'confirm' }, pillow: { status: 'later' }, adjustability: { status: 'demo', position: 'flat' }, protection: { status: 'already' } };
  const en = makeLeadEnv({ decisions: mixed });
  ok('EN: the confirm step appears under Still open, qualified as a specialist check',
    !en.rows.hidden && en.rows.innerHTML.includes('Support (specialist check needed)'),
    en.rows.innerHTML.slice(0, 160));
  ok('EN: the deferred step is still listed; addressed (demo / keep-current) steps are not',
    en.rows.innerHTML.includes('Pillow') && !en.rows.innerHTML.includes('Adjustability') && !en.rows.innerHTML.includes('Protection'));
  ok('EN: the row is the dictionary sentence (Still open: …), one producer',
    en.rows.innerHTML.includes(dictEn['hf2.status_open'].replace('{list}', 'Support (specialist check needed) · Pillow')));
  const es = makeLeadEnv({ lang: 'es', decisions: mixed });
  ok('ES: the qualified row resolves in Spanish (provisional)',
    es.rows.innerHTML.includes(dictEs['hf2.status_open_check'].replace('{step}', 'Soporte')) && es.rows.innerHTML.includes('Almohada'));
  const none = makeLeadEnv({ decisions: { support: { status: 'already' }, pillow: { status: 'already' }, adjustability: { status: 'demo', position: 'flat' }, protection: { status: 'already' } } });
  ok('nothing unresolved: the Still-open row is hidden, not an empty sentence',
    none.rows.hidden === true && none.rows.innerHTML === '');
  const control = makeLeadEnv({ decisions: mixed, mutate: (s) => mustReplace(s, " || st === 'confirm';", ';') });
  ok('negative control: dropping confirm from the filter hides the specialist check again (the pin bites)',
    !control.rows.innerHTML.includes('Support'));
  const wordsEn = dictEn['hf2.status_open_check'].replace('{step}', '');
  const wordsEs = dictEs['hf2.status_open_check'].replace('{step}', '');
  ok('the qualified phrase is customer-safe on the shared surface (no second person, no internal jargon)',
    !SECOND_PERSON_EN.test(wordsEn) && !SECOND_PERSON_ES.test(wordsEs) && !/handoff|RSA/i.test(wordsEn));
}

// =========================================================== 3. ruling 3
section('ruling 3 — reason keys beside byte-stable reason strings; the specialist adapter');
const scorerSrc = extractFunction('function scoreAccessoriesFromAnswers()');
const prefixSrc = extractFunction('var SPECIALIST_REASON_PREFIX =');
const nounsSrc = extractFunction('var SPECIALIST_REASON_NOUNS =');
const adapterSrc = extractFunction('function specialistReasonLabel(keys, fallback)');
ok('scorer and adapter sources extracted', !!scorerSrc && !!prefixSrc && !!nounsSrc && !!adapterSrc);

function runScorer(answers, lang = 'en', mutate = null) {
  let src = scorerSrc + '\nout.list = scoreAccessoriesFromAnswers();';
  if (mutate) src = mutate(src);
  const out = {};
  new Function('answers', 'currentLang', 'ACCESSORIES', 'out', '"use strict";' + src)(answers, lang, ACCESSORIES, out);
  return out.list;
}
function runAdapter(keys, fallback, lang = 'en', mutate = null) {
  let src = prefixSrc + '\n' + nounsSrc + '\n' + adapterSrc + '\nout.v = specialistReasonLabel(keys, fallback);';
  if (mutate) src = mutate(src);
  const out = {};
  new Function('keys', 'fallback', 'currentLang', 'out', '"use strict";' + src)(keys, fallback, lang, out);
  return out.v;
}
const PERSONA = { trigger: 'pain', mattress_size: 'queen', partner_sleep: 'partner', partner_disturbance: 'sometimes',
  sleep_position: 'side', body_type: 'average', temperature: 'hot', firmness: 5, sleep_issues: ['back_pain'], health_conditions: ['snoring'] };
{
  const list = runScorer(PERSONA);
  const byId = Object.fromEntries(list.map((a) => [a.id, a]));
  ok('every accessory carries reasonKeys parallel to reasons (same length, at least one each)',
    list.length === ACCESSORIES.length && list.every((a) => Array.isArray(a.reasonKeys) && a.reasonKeys.length === a.reasons.length && a.reasons.length >= 1));
  ok('the engine reason STRINGS are byte-identical to the shipped map (Ergo: back pain + snoring)',
    JSON.stringify(byId['base-tempur-ergo'].reasons) === JSON.stringify(['Targets the back pain you mentioned', 'Helps with the snoring you reported']));
  ok('…and the keys name the same evidence in the same order',
    JSON.stringify(byId['base-tempur-ergo'].reasonKeys) === JSON.stringify(['back_pain', 'snoring']));
  ok('a hot side sleeper\'s Flow pillow keys are position + cooling; the hot key is not double-pushed when cooling fired',
    JSON.stringify(byId['pillow-flow'].reasonKeys) === JSON.stringify(['position_side', 'cooling'])
    && JSON.stringify(byId['pillow-flow'].reasons) === JSON.stringify(['Matched to your side sleeping position', 'You reported sleeping hot']));
  ok('an unmatched catalog item carries the standard key beside the neutral string',
    byId['foundation-princess'].matched === false
    && JSON.stringify(byId['foundation-princess'].reasonKeys) === JSON.stringify(['standard'])
    && byId['foundation-princess'].reasons[0] === 'A solid option to round out your sleep system');
  const es = runScorer(PERSONA, 'es');
  const esErgo = es.find((a) => a.id === 'base-tempur-ergo');
  ok('ES: the keys are language-invariant while the strings localise (engine behaviour unchanged)',
    JSON.stringify(esErgo.reasonKeys) === JSON.stringify(['back_pain', 'snoring'])
    && esErgo.reasons[0] === 'Se enfoca en el dolor de espalda que mencionaste');
  ok('the scorer pushes a key beside every string push (nine sites each) and returns both arrays',
    (scorerSrc.match(/reasons\.push\(reasonMap/g) || []).length === 9
    && (scorerSrc.match(/reasonKeys\.push\(/g) || []).length === 9
    && scorerSrc.includes('return { ...a, score, matched, reasons, reasonKeys };'));
  ok('the two mutation-proof engine lines the phase-1 fixture executes are byte-exact',
    scorerSrc.includes('const matched = reasons.length > 0;') && scorerSrc.includes('accessoryData.sort((a, b) => b.score - a.score);'));
}
{
  const NOUNS = {
    en: { position_side: 'side sleeping', position_back: 'back sleeping', position_stomach: 'stomach sleeping', cooling: 'sleeps hot', hot: 'temperature',
      back_pain: 'lower-back discomfort', snoring: 'snoring', reflux: 'nighttime reflux', allergies: 'allergies', premium: 'premium comfort' },
    es: { position_side: 'dormir de lado', position_back: 'dormir boca arriba', position_stomach: 'dormir boca abajo', cooling: 'duerme con calor', hot: 'temperatura',
      back_pain: 'molestia lumbar', snoring: 'ronquidos', reflux: 'reflujo nocturno', allergies: 'alergias', premium: 'comodidad premium' }
  };
  const PREFIX = { en: 'Reported priority: ', es: 'Prioridad reportada: ' };
  for (const lang of ['en', 'es']) {
    const bad = Object.keys(NOUNS[lang]).filter((k) => runAdapter([k], 'FALLBACK', lang) !== PREFIX[lang] + NOUNS[lang][k]);
    ok(`[${lang}] every answer-derived key renders as the evidence tag (prefix + noun)`, bad.length === 0, bad.join(','));
    ok(`[${lang}] every matched key is named — a multi-key reason lists all of them`,
      runAdapter(['back_pain', 'snoring'], 'FALLBACK', lang) === PREFIX[lang] + NOUNS[lang].back_pain + ' · ' + NOUNS[lang].snoring);
    ok(`[${lang}] the standard key renders as the neutral catalog tag`,
      runAdapter(['standard'], 'FALLBACK', lang) === (lang === 'es' ? 'Opción del catálogo' : 'Catalog option'));
    ok(`[${lang}] the default key renders as a profile match`,
      /^(Profile match|Coincidencia de perfil): /.test(runAdapter(['default'], 'FALLBACK', lang)));
    const all = Object.keys(NOUNS[lang]).map((k) => runAdapter([k], '', lang)).concat([runAdapter(['standard'], '', lang), runAdapter(['default'], '', lang)]);
    ok(`[${lang}] no adapter label addresses the customer (second person)`,
      all.every((v) => !(lang === 'es' ? SECOND_PERSON_ES : SECOND_PERSON_EN).test(v)), all.filter((v) => (lang === 'es' ? SECOND_PERSON_ES : SECOND_PERSON_EN).test(v)).join(' | '));
  }
  ok('an unmapped key falls back to the engine string (never blank)',
    runAdapter(['not_a_key'], 'Engine string', 'en') === 'Engine string'
    && runAdapter(['back_pain', 'not_a_key'], 'Engine string', 'en') === 'Engine string');
  ok('a missing key list falls back to the engine string',
    runAdapter(undefined, 'Engine string', 'en') === 'Engine string' && runAdapter([], 'Engine string', 'en') === 'Engine string');
  ok('a missing key list AND no engine string renders empty, not undefined',
    runAdapter([], '', 'en') === '' && runAdapter(undefined, undefined, 'en') === '');
}
{
  // Consumers: exactly the two specialist surfaces adapt; the shared Summary
  // card and the customer's take-home keep the engine string.
  ok('the Sleep System featured card renders its benefit line through the adapter, keeping the engine read as the fallback',
    norm.includes("specialistReasonLabel(primary.reasonKeys, primary.reasons && primary.reasons[0] ? primary.reasons[0] : '')"));
  ok('the drawer finalist-pillow prompt renders its reason through the adapter',
    norm.includes("specialistReasonLabel(pillow.reasonKeys, pillow.reasons[0] || '')"));
  ok('the adapter has exactly those two call sites',
    (norm.match(/specialistReasonLabel\(/g) || []).length === 3, `${(norm.match(/specialistReasonLabel\(/g) || []).length} incl. the definition`);
  const accCard = extractFunction('function renderHf2AccCard(item, secondary)');
  const takeHome = extractFunction('function getSelectedAccessoryPlan()');
  ok('the shared Summary accessory card keeps the engine string (customer-safe; matches the take-home)',
    !!accCard && accCard.includes('reason.textContent = item.reasons[0];') && !accCard.includes('specialistReasonLabel'));
  ok('the take-home accessory plan keeps the engine string',
    !!takeHome && takeHome.includes("reason: selected.reasons && selected.reasons[0] ? selected.reasons[0] : ''") && !takeHome.includes('specialistReasonLabel'));
  ok('the cart snapshot keeps the engine strings (language-at-add-time behaviour unchanged)',
    /reasons: scored \? scored\.reasons\.slice\(0, 2\) : \[\]/.test(norm));
}
{
  // Negative controls.
  const noKeys = runScorer(PERSONA, 'en', (s) => mustReplace(s, "reasons.push(reasonMap.snoring); reasonKeys.push('snoring'); }", 'reasons.push(reasonMap.snoring); }'));
  const ergo = noKeys.find((a) => a.id === 'base-tempur-ergo');
  ok('control: a key push that goes missing is detected (reasons and keys no longer parallel)',
    ergo.reasons.length === 2 && ergo.reasonKeys.length === 1);
  const passthrough = runAdapter(['back_pain'], 'Targets the back pain you mentioned', 'en',
    (s) => mustReplace(s, "      if (!list.length) return fallback || '';", "      return fallback || '';"));
  ok('control: an adapter that stops mapping is detected (the customer-voiced engine string would leak to the specialist card)',
    passthrough === 'Targets the back pain you mentioned');
}

// ======================================================= 4. Results (A3.1 c2)
section('Results — copy budget, product hero, image attributes, decode hold');
{
  const topSrc = extractFunction('function renderTopPickCard(m, tier)');
  const supSrc = extractFunction('function renderSupportingCards(mattresses, tier)');
  const chromeSrc = extractFunction('function renderResultsChrome()');
  const renderSrc = extractFunction('function _renderResults()');
  ok('Results sources extracted', !!topSrc && !!supSrc && !!chromeSrc && !!renderSrc);
  ok('the support sentence is retired: renderer empties + hides #resultsSubhead; static is hidden and empty',
    chromeSrc.includes("resultsSubhead.textContent = ''; resultsSubhead.hidden = true;")
    && /id="resultsSubhead" hidden><\/p>/.test(norm)
    && !norm.includes('Begin with the first match, then compare comfort in person.'));
  ok('the supporting-grid heading is retired (the index-only role labels structure the row)',
    renderSrc.includes("document.getElementById('resultsSupportingHeading').textContent = '';")
    && !norm.includes('More directions to compare'));
  ok('no card template renders the "View match details" cue (retired: the card and Try open the drawer)',
    !topSrc.includes('noct-card-details') && !supSrc.includes('noct-card-details')
    && !/\.noct-card-details \{/.test(norm));
  ok('the action cluster reads compare -> Try -> save in both templates',
    /\+\s+compareBtn\s+\+\s+tryBtn\s+\+\s+saveBtn/.test(topSrc) && /\+\s+compareBtn\s+\+\s+tryBtn\s+\+\s+saveBtn/.test(supSrc));
  ok('the delegated handler routes the Try control (and no details selector) to the drawer',
    norm.includes("var tryCtl = e.target.closest('.noct-card-try');") && !norm.includes(".closest('.noct-card-details"));
  ok('the hero photo is decorative beside its name and reserves its frame (alt="", width/height), with no loading/decoding hint (the X9 hold awaits it)',
    topSrc.includes('<img class="noct-toppick-photo" src="\' + escapeHtml(m.imageUrl) + \'" width="1500" height="1000" alt="">')
    && !/noct-toppick-photo[^>]*loading=/.test(topSrc) && !/noct-toppick-photo[^>]*decoding=/.test(topSrc));
  ok('the support photos are decorative, reserved and decoded off the main path',
    supSrc.includes('<img class="noct-support-photo" src="\' + escapeHtml(m.imageUrl) + \'" width="1600" height="900" alt="" decoding="async">'));
  ok('no product image anywhere is lazy-loaded (first-fold identity never waits)',
    !/loading="lazy"/.test(norm));
  ok('the landscape hero frame is a 3:2 uncropped frame on the mat (contain), not a column-stretched cover crop',
    /\.noct-toppick-photo \{\s*aspect-ratio: 3 \/ 2;\s*width: 100%;\s*height: auto;\s*min-height: 0;\s*align-self: center;\s*object-fit: contain;\s*\}/.test(norm));
  ok('the X9 decode hold awaits the hero photo itself, never "the first img in the container"',
    norm.includes("document.querySelector('#topPickContainer img.noct-toppick-photo')")
    && !norm.includes("document.querySelector('#topPickContainer img')"));
  ok('the Brief->Results status card speaks one sentence (subtitle emptied, element kept)',
    norm.includes("elements.subtitle.textContent = '';") && /'resultsRevealTitle', 'resultsRevealSubtitle'/.test(norm));
}

// ======================================================== 5. Drawer (product-proof slice 1)
section('Trial drawer — no standalone prompt, no reaction capture, no gate; reversible finalist, Undo, Save toggle');
{
  const openSrc = extractFunction('window.openMattressDrawer = function(mattressId, orderList, opts)');
  const chooseSrc = extractFunction('window.chooseFinalist = function(mattressId)');
  const clearSrc = extractFunction('window.clearFinalist = function(mattressId)');
  const toggleSrc = extractFunction('window.toggleFinalist = function(mattressId)');
  const undoSrc = extractFunction('window.undoFinalistReplacement = function()');
  const nameSrc = extractFunction('function mattressNameById(mattressId)');
  const announceSrc = extractFunction('function announceFinalist(text)');
  const labelSrc = extractFunction('function finalistButtonLabel(isChosen)');
  const paintBtnSrc = extractFunction('function paintFinalistButton(btn)');
  const repaintSrc = extractFunction('window._repaintFinalistControls = function()');
  const toggleSaveSrc = extractFunction('window._toggleSavePick = function(mattressId)');
  const saveDrawerSrc = extractFunction('window.saveDrawerPick = function()');
  const paintSaveSrc = extractFunction('function paintDrawerSaveButton(mattressId)');
  const paintFinSrc = extractFunction('window.paintDrawerFinalist = function(mattressId)');
  const noticeSrc = extractFunction('function paintDrawerFinalistNotice(mattressId)');
  const hf2ToggleSrc = extractFunction('window.toggleFavoriteMattress = function(mattressId)');
  ok('drawer sources extracted', [openSrc, chooseSrc, clearSrc, toggleSrc, undoSrc, nameSrc, announceSrc, labelSrc, paintBtnSrc, repaintSrc, toggleSaveSrc, saveDrawerSrc, paintSaveSrc, paintFinSrc, noticeSrc, hf2ToggleSrc].every(Boolean));

  // ---- reaction capture is gone everywhere (owner decisions 1-3)
  ok('no reaction controls render: no reaction row, no data-reaction buttons in the drawer markup, no reaction painter',
    !norm.includes('id="drawerReactionRow"') && !norm.includes('data-reaction="soft"') && !norm.includes('paintDrawerReactions')
    && !norm.includes('setDrawerReaction') && !norm.includes('drawerReactionLabel'));
  ok('no reaction gate remains: the producer has no reaction guard and the drawer finalist button is never disabled',
    !/_mattressReactions/.test(chooseSrc) && !/disabled/.test(paintFinSrc)
    && /id="drawerFinalistBtn" class="finalist-btn drawer-finalist-btn" data-id="" aria-pressed="false"><\/button>/.test(norm)
    && !norm.includes('drawerFinalistHint') && !norm.includes("t('drawer.finalist_hint')"));
  ok('no reaction state survives in session code (no map, no wipe line, no reactionLabel)',
    !norm.includes('_mattressReactions') && !norm.includes('reactionLabel(') && !norm.includes('setMattressReaction'));
  ok('no Summary reaction chip, no Compare reaction row, no Sleep System reaction text',
    !norm.includes('hf2-reaction-chip') && !norm.includes("hf2.status_reaction_label") && !norm.includes("'Observed reaction'")
    && !norm.includes("'Reacción observada'") && !norm.includes('Not recorded yet') && !norm.includes('reactionText'));
  ok('the removed dictionary keys have no consumers and are gone from both dictionaries',
    !('drawer.finalist_hint' in dictEn) && !('drawer.finalist_hint' in dictEs)
    && !('hf2.status_reaction_label' in dictEn) && !('hf2.status_reaction_label' in dictEs)
    && !norm.includes('drawer.finalist_hint') && !norm.includes('hf2.status_reaction_label'));
  ok('the drawer step rings and the numbered workflow are retired (no data-step, no .drawer-step rule)',
    !norm.includes('data-step="1"') && !norm.includes('.drawer-step::before') && !norm.includes('paintDrawerSteps'));
  ok('no "nothing to record" explanation was added in either language',
    !liveHtml.includes('No response to record') && !liveHtml.includes('nothing to record') && !liveHtml.includes('Nada que registrar'));

  // ---- statics: labels, pressed grammar, notice, live region, focus, wipe
  ok('the finalist labels are the reversible pair in both dictionaries',
    dictEn['finalist.choose_as'] === 'Make finalist' && dictEn['finalist.chosen_btn'] === 'Finalist ✓'
    && dictEs['finalist.choose_as'] === 'Hacer finalista' && dictEs['finalist.chosen_btn'] === 'Finalista ✓');
  ok('the notice / Undo / live-region strings exist in both languages with their slots',
    ['drawer.undo', 'drawer.finalist_replaces', 'drawer.finalist_replaced', 'drawer.finalist_live_set', 'drawer.finalist_live_replaced', 'drawer.finalist_live_restored', 'drawer.finalist_live_cleared']
      .every((k) => typeof dictEn[k] === 'string' && dictEn[k] && typeof dictEs[k] === 'string' && dictEs[k] && dictEn[k] !== dictEs[k])
    && dictEn['drawer.finalist_replaces'] === 'Choosing this replaces {name} as finalist.' && dictEs['drawer.finalist_replaces'].includes('{name}')
    && dictEn['drawer.finalist_live_replaced'].includes('{previous}') && dictEs['drawer.finalist_live_replaced'].includes('{previous}'));
  ok('the Save control is a pressed-state toggle in the markup and the notice, Undo and live region ship hidden/empty',
    /id="drawerInterestedBtn" class="drawer-btn drawer-btn-secondary" aria-pressed="false"/.test(norm)
    && /<div class="drawer-finalist-note" id="drawerFinalistNote" hidden>/.test(norm)
    && /id="drawerFinalistUndoBtn" hidden/.test(norm)
    && /<div class="sr-only" id="drawerFinalistLive" role="status" aria-live="polite" aria-atomic="true"><\/div>/.test(norm));
  ok('the delegated handler routes every finalist control through the reversible toggle; the Summary control agrees',
    /closest\('\.finalist-btn'\)[\s\S]{0,200}window\.toggleFinalist\(finBtn\.getAttribute\('data-id'\)\)/.test(norm)
    && hf2ToggleSrc.includes('window.toggleFinalist(mattressId);'));
  ok('the finalist button and Undo take the two-ring focus treatment with the CanvasText fallback; the pressed Save reads by geometry',
    /\.drawer-finalist-btn:focus-visible,\s*\n\s*\.drawer-undo-btn:focus-visible,\s*\n\s*\.drawer-btn:focus-visible \{\s*\n\s*outline: 3px solid var\(--focus-ring-outer\);/.test(norm)
    && /@media \(forced-colors: active\) \{\s*\n\s*\.drawer-back-to-results:focus-visible,\s*\n\s*\.drawer-nav-btn:focus-visible,\s*\n\s*\.drawer-finalist-btn:focus-visible,/.test(norm)
    && /\.drawer-btn-secondary\[aria-pressed="true"\] \{ border: 3px double CanvasText; \}/.test(norm)
    && /\.drawer-undo-btn \{\s*\n\s*min-height: 44px;/.test(norm));
  ok('the wipe resets both controls, closes the notice and Undo, clears the undo record, and empties the notice + live text',
    /\{ id: 'drawerFinalistBtn', remove: \['chosen'\], attrs: \{ 'aria-pressed': 'false', 'data-id': '' \} \},/.test(norm)
    && /\{ id: 'drawerInterestedBtn', remove: \['saved'\], attrs: \{ 'aria-pressed': 'false' \} \},/.test(norm)
    && /\{ id: 'drawerFinalistNote', hiddenAttr: true \},\s*\n\s*\{ id: 'drawerFinalistUndoBtn', hiddenAttr: true \},/.test(norm)
    && /'drawerFinalistNoteText', 'drawerFinalistLive',/.test(norm)
    && /window\._favoriteMattressId = '';\s*\n\s*window\._finalistUndo = null;/.test(norm));
  ok('closing the drawer ends the Undo window; the pillow prompt follows the first save (Save or Choose) once per session',
    /drawer\.classList\.remove\('drawer-open'\);\s*\n\s*\/\/[^\n]*\n\s*window\._finalistUndo = null;/.test(norm)
    && toggleSrc.includes("if (mattressId === window._currentDrawerMattressId && typeof showFinalistSleepSystemPrompt === 'function') showFinalistSleepSystemPrompt();")
    && saveDrawerSrc.includes('showFinalistSleepSystemPrompt();'));
  const proofSrcStatic = extractFunction('function paintDrawerProductProof(m)') || '';
  ok('the drawer name is written as text only - no price-tier glyph returns beside it (A3.1 retirement kept)',
    openSrc.includes("document.getElementById('drawerName').textContent = m.name;") && !openSrc.includes('price-tier'));
  ok('the drawer opener paints the product proof once and writes no trial prompt, reaction or step labels of its own (the standalone Try block is retired; the consolidated section is the painter\'s)',
    /^\s*paintDrawerProductProof\(m\);/m.test(openSrc) && !openSrc.includes('getMattressTrialPrompts(') && !openSrc.includes('trialCue')
    && !proofSrcStatic.replace(/\/\/[^\n]*/g, '').includes('trialCue') && !proofSrcStatic.includes('getMattressTrialPrompts(')
    && !openSrc.includes('drawerReactionLabel') && !openSrc.includes('drawerFinalistLabel') && !openSrc.includes('drawerNoticeLabel'));

  // ---- EXECUTED: the finalist / save state model against the real producers
  function makeDrawerEnv({ lang = 'en', opened = 'g5', saved = [], fav = '', promptSpy = null } = {}) {
    const D = lang === 'es' ? dictEs : dictEn;
    const t = (k, repl) => { let v = Object.prototype.hasOwnProperty.call(D, k) ? D[k] : k; if (repl) Object.keys(repl).forEach((r) => { v = v.split('{' + r + '}').join(repl[r]); }); return v; };
    const els = new Map();
    const el = (id, cls = '') => { const set = new Set(); const attrs = {}; return { id, className: cls, textContent: '', hidden: false, attrs,
      classList: { toggle(c, force) { const on = force === undefined ? !set.has(c) : !!force; if (on) set.add(c); else set.delete(c); return on; }, add(c) { set.add(c); }, remove(c) { set.delete(c); }, contains(c) { return set.has(c); } },
      setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; } }; };
    const get = (id) => { if (!els.has(id)) els.set(id, el(id)); return els.get(id); };
    const fin = get('drawerFinalistBtn'); fin.className = 'finalist-btn drawer-finalist-btn'; fin.attrs['data-id'] = '';
    const cardFin = el('fin-g6', 'finalist-btn'); cardFin.attrs['data-id'] = 'g6'; els.set('fin-g6', cardFin);
    const doc = { getElementById: (id) => get(id), querySelectorAll: (sel) => (sel === '.finalist-btn' ? [fin, cardFin] : []) };
    const tierData = { gold: [{ id: 'g5', name: 'Five', brand: 'B', firmness: 5 }, { id: 'g6', name: 'Six', brand: 'B', firmness: 6 }, { id: 'g7', name: 'Seven', brand: 'B', firmness: 7 }], silver: [], bronze: [] };
    const win = { _savedPicks: saved.map((id) => ({ id, name: tierData.gold.find((m) => m.id === id).name })), _favoriteMattressId: fav, _finalistUndo: null,
      _currentDrawerMattressId: opened, _drawerData: { g5: { m: tierData.gold[0] }, g6: { m: tierData.gold[1] }, g7: { m: tierData.gold[2] } }, _updatePicksBadge: () => {} };
    const prompts = { n: 0 };
    const src = [chooseSrc, clearSrc, toggleSrc, undoSrc, nameSrc, announceSrc, labelSrc, paintBtnSrc, repaintSrc, toggleSaveSrc, saveDrawerSrc, paintSaveSrc, paintFinSrc, noticeSrc, hf2ToggleSrc].join('\n')
      + '\nout.api = { choose: window.chooseFinalist, clear: window.clearFinalist, toggle: window.toggleFinalist, undo: window.undoFinalistReplacement, save: window.saveDrawerPick, paint: window.paintDrawerFinalist, hf2: window.toggleFavoriteMattress, toggleSave: window._toggleSavePick };';
    const out = {};
    new Function('window', 'document', 't', '_resultsState', 'analytics', 'saveButtonLabel', 'firmnessFeel', 'renderHf2', '_renderResults', 'showFinalistSleepSystemPrompt', 'out',
      '"use strict";' + src)(win, doc, t, { tierData }, { log() {} }, (s) => (s ? 'Saved ✓' : 'Save'), () => 'Feel', () => {}, () => {}, () => { prompts.n++; if (promptSpy) promptSpy(); }, out);
    out.api.paint(opened);
    const savedIds = () => win._savedPicks.map((p) => p.id);
    return { win, els: get, api: out.api, savedIds, prompts, fin, cardFin, note: get('drawerFinalistNote'), noteText: get('drawerFinalistNoteText'), undo: get('drawerFinalistUndoBtn'), live: get('drawerFinalistLive'), saveBtn: get('drawerInterestedBtn') };
  }
  {
    const e = makeDrawerEnv();
    ok('executed: a fresh drawer shows "Make finalist" (unpressed, never disabled), Save unpressed, no notice, empty live region',
      e.fin.textContent === 'Make finalist' && e.fin.getAttribute('aria-pressed') === 'false' && e.fin.getAttribute('disabled') === null
      && e.saveBtn.textContent === 'Save' && e.saveBtn.getAttribute('aria-pressed') === 'false' && e.note.hidden === true && e.live.textContent === '');
    e.api.toggle('g5');
    ok('executed: a mattress becomes the finalist with no prior input; it is force-saved; the button reads "Finalist ✓" pressed; announced once',
      e.win._favoriteMattressId === 'g5' && e.savedIds().includes('g5') && e.fin.textContent === 'Finalist ✓' && e.fin.getAttribute('aria-pressed') === 'true'
      && e.saveBtn.getAttribute('aria-pressed') === 'true' && e.live.textContent === 'Finalist: Five.' && e.note.hidden === true);
    ok('executed: the pillow prompt fires on the first save made by choosing (once per session guard is the prompt\'s own)', e.prompts.n === 1);
    e.api.toggle('g5');
    ok('executed: tapping "Finalist ✓" clears finalist status but keeps the mattress saved; announced',
      e.win._favoriteMattressId === '' && e.savedIds().includes('g5') && e.fin.textContent === 'Make finalist' && e.fin.getAttribute('aria-pressed') === 'false'
      && e.saveBtn.getAttribute('aria-pressed') === 'true' && e.live.textContent === 'No finalist selected.');
    e.api.toggle('g5'); e.api.toggle('g5'); e.api.toggle('g5');
    ok('executed: repeated toggles are idempotent per state (set, clear, set)', e.win._favoriteMattressId === 'g5' && e.savedIds().filter((x) => x === 'g5').length === 1);
  }
  {
    // Replacement + Undo, from the drawer of the replacing mattress.
    const e = makeDrawerEnv({ opened: 'g6', saved: ['g5'], fav: 'g5' });
    ok('executed: with a different finalist the notice names it ("Choosing this replaces Five as finalist.") and Undo is hidden',
      e.note.hidden === false && e.noteText.textContent === 'Choosing this replaces Five as finalist.' && e.undo.hidden === true);
    e.api.toggle('g6');
    ok('executed: choosing replaces the finalist; the previous finalist stays saved; the notice offers Undo; announced with both names',
      e.win._favoriteMattressId === 'g6' && e.savedIds().includes('g5') && e.savedIds().includes('g6')
      && e.note.hidden === false && e.noteText.textContent === 'Now the finalist. Replaced Five.' && e.undo.hidden === false && e.undo.textContent === 'Undo'
      && e.live.textContent === 'Finalist: Six. Replaced Five.' && e.cardFin.getAttribute('aria-pressed') === 'true');
    e.api.undo();
    ok('executed: Undo restores the previous finalist, both stay saved, the notice returns to the replacement warning, announced',
      e.win._favoriteMattressId === 'g5' && e.savedIds().includes('g5') && e.savedIds().includes('g6') && e.win._finalistUndo === null
      && e.noteText.textContent === 'Choosing this replaces Five as finalist.' && e.undo.hidden === true && e.live.textContent === 'Finalist restored: Five.');
    e.api.undo();
    ok('executed: a second Undo is a no-op', e.win._favoriteMattressId === 'g5' && e.live.textContent === 'Finalist restored: Five.');
  }
  {
    // Undo when the previous finalist was un-saved in between: the invariant holds (chooseFinalist re-saves).
    const e = makeDrawerEnv({ opened: 'g6', saved: ['g5'], fav: 'g5' });
    e.api.toggle('g6');
    e.api.toggleSave('g5');
    ok('executed: un-saving the previous finalist hides Undo (nothing to restore to) and leaves the current finalist intact',
      e.win._favoriteMattressId === 'g6' && !e.savedIds().includes('g5') && (e.api.paint('g6'), e.undo.hidden === true));
    e.api.undo();
    ok('executed: Undo after that still cannot break the finalist-implies-saved invariant',
      (e.win._favoriteMattressId === '' || e.savedIds().includes(e.win._favoriteMattressId)));
  }
  {
    // Save toggle in the drawer.
    const e = makeDrawerEnv();
    e.api.save();
    ok('executed: drawer Save saves (pressed, "Saved ✓"), never chooses, and fires the pillow prompt once',
      e.savedIds().includes('g5') && e.win._favoriteMattressId === '' && e.saveBtn.textContent === 'Saved ✓' && e.saveBtn.getAttribute('aria-pressed') === 'true' && e.prompts.n === 1);
    e.api.save();
    ok('executed: drawer Save un-saves on the second tap (a real toggle)', !e.savedIds().includes('g5') && e.saveBtn.getAttribute('aria-pressed') === 'false' && e.saveBtn.textContent === 'Save');
    e.api.toggle('g5'); e.api.save();
    ok('executed: un-saving the current finalist from the drawer clears finalist status atomically (invariant) and announces it',
      !e.savedIds().includes('g5') && e.win._favoriteMattressId === '' && e.live.textContent === 'No finalist selected.' && e.fin.getAttribute('aria-pressed') === 'false');
    ok('executed: the prompt fired once for two saves (once-per-session is the prompt\'s own guard here: the spy counts calls)', e.prompts.n >= 2);
  }
  {
    // Summary control agreement + ES.
    const e = makeDrawerEnv({ lang: 'es', opened: 'g6', saved: ['g5'], fav: 'g5' });
    ok('executed (ES): the notice and labels resolve in Spanish', e.noteText.textContent === 'Elegirlo reemplaza a Five como finalista.' && e.fin.textContent === 'Hacer finalista');
    e.api.hf2('g6');
    ok('executed (ES): the Summary control replaces through the same toggle and the live text is Spanish',
      e.win._favoriteMattressId === 'g6' && e.live.textContent === 'Finalista: Six. Reemplazó a Five.');
    e.api.hf2('g6');
    ok('executed (ES): the Summary control on the current finalist clears it (agreeing with the drawer) and keeps it saved',
      e.win._favoriteMattressId === '' && e.savedIds().includes('g6') && e.live.textContent === 'No hay finalista seleccionado.');
  }
  {
    const e = makeDrawerEnv({ opened: 'g6', saved: ['g5'], fav: 'g5' });
    const broken = mustReplace(noticeSrc, "text.textContent = t('drawer.finalist_replaces', { name: mattressNameById(fav) });", "text.textContent = '';");
    const out = {};
    new Function('window', 'document', 't', 'mattressNameById', 'out', '"use strict";' + broken + '\nout.run = function(id) { paintDrawerFinalistNotice(id); };')(e.win, { getElementById: (id) => e.els(id) }, (k, r) => (dictEn[k] || k).replace('{name}', (r || {}).name || ''), () => 'Five', out);
    out.run('g6');
    ok('negative control: a notice that stops naming the finalist is detected', e.noteText.textContent === '');
  }
}

// ======================================================== 6. Compare (A3.1 c2)
section('Compare — column head image attributes');
{
  ok('the Compare column-head photo is decorative beside its name, reserved, decoded async, and its src is escaped',
    norm.includes(`'<div class="cmp-head-img"><img src="' + escapeHtml(m.imageUrl) + '" width="1500" height="1000" alt="" decoding="async"></div>'`));
}

// ==================================================== 7. Sleep System (A3.1 c3)
section('Sleep System — retired note panel, in-step lines, trial diagram, F1 frame, sidecar strip, specialist-check mark');
{
  const mainSrc = extractFunction('function renderSleepSystemMain(viewModel)');
  const demoSrc = extractFunction('function renderAdjustabilityDemo()');
  const guideSrc = extractFunction('function sleepSystemGuidance(stepId, primary)');
  const railSrc = extractFunction('function renderSleepSystemRail()');
  const planSrc = extractFunction('function renderSleepSystemPlan()');
  ok('Sleep System sources extracted', !!mainSrc && !!demoSrc && !!guideSrc && !!railSrc && !!planSrc);
  ok('the note panel is retired: it carries only the config-gated financing block and hides otherwise',
    mainSrc.includes("guidance.innerHTML = financingBlock;") && mainSrc.includes("guidance.hidden = !financingBlock;")
    && !mainSrc.includes('sleep-system__notice-list') && !liveHtml.includes("'Specialist note'"));
  ok('the three retained contextual lines render in-step through the ONE producer (sleepSystemGuidance)',
    norm.includes("escapeHtml(sleepSystemGuidance('support')[0] || '')")
    && norm.includes("escapeHtml(sleepSystemGuidance('pillow')[0] || '')")
    && norm.includes("escapeHtml(sleepSystemGuidance('protection')[0] || '')")
    && guideSrc.includes('return [notice];'));
  ok('the adjustability note and the three pillow reaction notes are retired from live code (ruling 2 + lead justification)',
    ['Recommend a base only after the customer tries', 'If the pillow feels too low', 'If the pillow feels too high', 'If the customer feels aligned']
      .every((lit) => !liveHtml.includes(lit)));
  ok('the retired framing copy is gone from the step guides and header',
    ['Showroom position demo', 'Start with the setup', 'Physical fit check', 'Choose the priority',
     'This is a compatibility and bed-height decision', 'Why first: support protects', 'Record the fit after the customer lies',
     'Start with the customer goal', 'Keep the mattress finalist central', 'A quick frame and slat check', 'No new support is being added',
     'Record the physical fit above', 'How does this pillow position the neck']
      .every((lit) => !liveHtml.includes(lit)));
  ok('the section opens with the category name; the governed step titles stay in the table unrendered',
    mainSrc.includes("tabindex=\"-1\">' + escapeHtml(sleepSystemText(step.label)) + '</h2>")
    && !mainSrc.includes('sleepSystemText(step.title)') && /title: \{ en: 'Explore adjustable comfort'/.test(norm));
  ok('the featured card renders the ruling-3 evidence tag on every step (the protection goal sentence is retired from the card)',
    mainSrc.includes("var reason = specialistReasonLabel(primary.reasonKeys, primary.reasons && primary.reasons[0] ? primary.reasons[0] : '');")
    && !mainSrc.includes('protectionGoalReason('));
  ok('the base decision reads "Keep in plan" (EN) / "Guardar en el plan" (ES, provisional)',
    mainSrc.includes("{ en: 'Keep in plan', es: 'Guardar en el plan' }"));
  ok('"Also compare" rows carry name only; the P5 neutral base rows keep their distinguishing copy',
    !/alternative-name">' \+ escapeHtml\(sleepSystemText\(item\.name\)\) \+ '<\/div>' \+\n\s*'<div class="sleep-system__alternative-copy">'/.test(mainSrc)
    && mainSrc.includes('sleep-system__base-row-copy'));
  // Trial diagram.
  ok('the Flat ghost is drawn behind the articulated panels whenever the position is not Flat, and the stage label names the comparison',
    // The ghost markup must sit directly under its own Flat gate (a sweep
    // survivor showed the stage-label ternary alone satisfied a looser test).
    /\(selected\.id !== 'flat'\s*\n\s*\? '<span class="sleep-system__bed-ghost sleep-system__bed-ghost--head"><\/span>/.test(demoSrc)
    && !/\(false\s*\n\s*\? '<span class="sleep-system__bed-ghost/.test(demoSrc)
    && demoSrc.includes("sleepSystemText({ en: ' vs Flat', es: ' vs Plana' })")
    && /\.sleep-system__bed-ghost \{[^}]*border: 1px dashed #8B7B67;/.test(norm));
  ok('the demo eyebrow and the lift sentence are retired; the position title is the one instruction',
    !demoSrc.includes('sleep-system__demo-copy') && demoSrc.includes('sleep-system__demo-title'));
  ok('every position chip carries aria-pressed and a forced-colors pressed rule exists in its own block',
    demoSrc.includes(`aria-pressed="' + (position.id === selected.id ? 'true' : 'false') + '"`)
    && /@media \(forced-colors: active\) \{\s*\.sleep-system__position\[aria-pressed="true"\] \{ border: 3px double CanvasText;/.test(norm));
  ok('the bed frame and pillow carry borders (survive forced colors) and the piece stroke is >= 3:1 on the stage',
    /\.sleep-system__bed-frame \{[^}]*border: 1px solid #66584A;/.test(norm)
    && /\.sleep-system__bed-pillow \{[^}]*border: 1px solid #8B7B67;/.test(norm)
    && /\.sleep-system__bed-head,\s*\.sleep-system__bed-middle,\s*\.sleep-system__bed-foot \{[^}]*border: 1px solid #8B7B67;/.test(norm));
  ok('the demo card sits on the mat, not a decorative gradient',
    /\.sleep-system__demo \{[^}]*background: #FFFDF8;/.test(norm) && !/\.sleep-system__demo \{[^}]*linear-gradient/.test(norm));
  // F1.
  ok('F1: the featured frame keeps its 2:1 ratio and mat with min-width: 0 and NO competing min-height',
    /\.sleep-system__featured-image \{[^}]*aspect-ratio: 2 \/ 1;[^}]*min-width: 0;[^}]*background: #FFFDF8;/.test(norm)
    && !/\.sleep-system__featured-image \{[^}]*min-height\s*:/.test(norm));
  // Type floor.
  ok('the position caption and the plan detail meet the 4.5:1 floor at >= 10px',
    /\.sleep-system__position small \{[^}]*color: #6C6054;[^}]*font: 500 10px/.test(norm)
    && /\.sleep-system__plan-detail \{[^}]*color: #6C6054;[^}]*font: 500 11px/.test(norm));
  // Sidecar strip + specialist-check mark.
  ok('the sidecar is a four-cell mark strip; the name/status pair stays for assistive technology (sr-only)',
    planSrc.includes(`'<span class="sr-only"><span class="sleep-system__plan-item-name">'`)
    && /\.sleep-system__plan-list \{[^}]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/.test(norm));
  ok('a specialist check is drawn as its own "?" mark on the rail and the sidecar while it still counts as addressed',
    (norm.match(/if \(checkNeeded\) mark = '\?';/g) || []).length === 2
    && railSrc.includes("(checkNeeded ? ' is-check' : '')") && planSrc.includes("(checkNeeded ? ' is-check' : '')")
    && /if \(status === 'already' \|\| status === 'confirm' \|\| status === 'demo'\) return 'addressed';/.test(norm)
    && /\.sleep-system__step\.is-check \.sleep-system__step-num \{[^}]*border-style: double;/.test(norm));
  ok('the header keeps one support sentence',
    norm.includes("en: 'Add only what supports the customer’s needs.'") && /id="sleepSystemSubtitle">Add only what supports the customer’s needs\.</.test(norm));
}

// ============================================ 8. Summary / take-home / Brief (A3.1 c4)
section('Consultation Summary — recap rows, names-only priorities with ordinal rings, NEXT cue, trims; take-home lighter; Brief ordinals');
{
  const cueSrc = extractFunction('function consultationNextCue()');
  const recapLookup = extractFunction('function consultRecap(questionId, optionId)');
  const recapMap = (norm.match(/var CONSULT_RECAP = \{[\s\S]*?\n    \};/) || [''])[0];
  ok('Summary sources extracted', !!cueSrc && !!recapLookup && recapMap.length > 200);
  ok('the title is the directive\'s ("Consultation summary" / "Resumen de la consulta") and the subtitle is retired (element kept, empty, hidden)',
    /id="hf2ReviewTitle">Consultation summary<\/h1>/.test(norm)
    && /<p class="hf2-review-subtitle" id="hf2ReviewSubtitle" hidden><\/p>/.test(norm)
    && norm.includes("hf2ReviewTitle: es ? 'Resumen de la consulta' : 'Consultation summary',")
    && !liveHtml.includes('A quick recap of what matters') && !liveHtml.includes('hf2ReviewSubtitle: es'));
  ok('"Consultation status" stays the region name but leaves the visible page (sr-only), still written from the dictionary',
    /<div class="hf2-review-section__label sr-only" id="hf2LeadLabel"><\/div>/.test(norm)
    && norm.includes("label.textContent = t('hf2.lead_label');"));
  ok('the implication rows are the compact "Visit focus" / "Enfoque de la visita" projection (synthesis change 4) and render the recap projection',
    /id="hf2NeedsLabel">Visit focus</.test(norm) && norm.includes("hf2NeedsLabel: es ? 'Enfoque de la visita' : 'Visit focus',")
    && norm.includes('var vm = resolveConsultationRecap();') && !liveHtml.includes('What we set out to solve'));
  ok('the recap map is bilingual, id-keyed on the five consumed questions, and gated on the approved implication',
    ['trigger', 'sleep_issues', 'sleep_position', 'health_conditions', 'temperature'].every((q) => recapMap.includes(q + ': {'))
    && recapMap.includes('en: {') && recapMap.includes('es: {')
    && recapLookup.includes("var approved = consultImplication(questionId, optionId);") && recapLookup.includes("if (!approved) return '';"));
  {
    // Executed: fail-closed on every path.
    const env = new Function('currentLang', 'consultImplication', recapMap + '\n' + recapLookup + '\nreturn consultRecap;');
    const withApproved = env('en', () => 'approved text');
    const blank = env('en', () => '');
    const es = env('es', () => 'x');
    ok('executed: a known option renders its noun; a blank approved implication renders nothing; unknown ids render nothing',
      withApproved('sleep_issues', 'back_pain') === 'Lower-back support'
      && blank('sleep_issues', 'back_pain') === ''
      && withApproved('sleep_issues', 'nope') === '' && withApproved('nope', 'x') === '' && withApproved('', 'x') === ''
      && es('sleep_issues', 'back_pain') === 'Soporte lumbar');
  }
  ok('the priorities render as NAMES with the ordinal ring; the reason and Try prose stay on the Brief/Plan/email',
    norm.includes(`'<span class="hf2-ordinal" aria-hidden="true">' + (i + 1) + '</span>'`)
    && !/brief\.try_this|item\.why\[|item\.test\[/.test(extractFunction('function renderHf2Priorities()'))
    && /\.hf2-ordinal \{[^}]*border-radius: 50%;/.test(norm) && /\.hf2-priorities \{[^}]*list-style: none;/.test(norm));
  ok('the status block: the metadata line is retired (node kept, hidden); no verdict chip exists (product-proof slice 1)',
    norm.includes("if (metaEl) { metaEl.textContent = ''; metaEl.hidden = true; }")
    && !norm.includes('hf2.status_reaction_label') && !norm.includes('hf2-reaction-chip'));
  ok('the saved-picks and Sleep System hints ship hidden (keys stay written; ruling 7), the empty state is the short line',
    /id="hf2FinalistsHint" hidden>/.test(norm) && /id="hf2SystemHint" hidden>/.test(norm)
    && dictEn['hf2.no_system_items'] === 'Nothing added yet.' && dictEs['hf2.no_system_items'] === 'Aún no se ha agregado nada.');
  ok('the finale reads "Ready to save"; its hint is blank and hidden unless the config-gated Savings Pass branch applies - the ONE NEXT cue renders in the status block (synthesis change 4)',
    /id="hf2PassLabel">Ready to save</.test(norm) && norm.includes("hf2PassLabel: es ? 'Listo para guardar' : 'Ready to save',")
    && !norm.includes(': consultationNextCue()') && norm.includes("? consultationNextCue() : '';")
    && norm.includes("if (passHint) passHint.hidden = !passHint.textContent;"));
  {
    // Executed NEXT cue: finalist first, then the first open step in rail
    // order, then a pending specialist check, then the save. Payment never.
    const STEPS = [{ id: 'adjustability', label: { en: 'Adjustability', es: 'Ajustabilidad' } }, { id: 'support', label: { en: 'Support', es: 'Soporte' } },
      { id: 'pillow', label: { en: 'Pillow', es: 'Almohada' } }, { id: 'protection', label: { en: 'Protection', es: 'Protección' } }];
    const run = (lang, kind, statuses, src = cueSrc) => new Function('currentLang', 'resolveFinalistState', 'SLEEP_SYSTEM_STEPS', 'sleepSystemDecision', 'sleepSystemText',
      src + '\nreturn consultationNextCue();')(lang, () => ({ kind }), STEPS, (id) => ({ status: statuses[id] || 'open' }), (o) => o[lang]);
    ok('executed: no finalist -> choose a finalist (EN + ES)',
      run('en', 'none', {}) === 'Next: choose a finalist' && run('es', 'recommended', {}) === 'Siguiente: elegir un finalista');
    ok('executed: the first open step in rail order names the cue',
      run('en', 'chosen', { adjustability: 'open' }) === 'Next: compare adjustable-base positions'
      && run('en', 'chosen', { adjustability: 'demo', support: 'later' }) === 'Next: confirm what sits under the mattress'
      && run('en', 'chosen', { adjustability: 'demo', support: 'already', pillow: 'open' }) === 'Next: check pillow fit on the finalist'
      && run('es', 'chosen', { adjustability: 'demo', support: 'already', pillow: 'added', protection: 'open' }) === 'Siguiente: elegir la prioridad de protección');
    ok('executed: a pending specialist check is the cue only when nothing is open; nothing open -> save',
      run('en', 'chosen', { adjustability: 'demo', support: 'confirm', pillow: 'added', protection: 'added' }) === 'Next: specialist check on support'
      && run('en', 'chosen', { adjustability: 'demo', support: 'confirm', pillow: 'open', protection: 'added' }) === 'Next: check pillow fit on the finalist'
      && run('en', 'chosen', { adjustability: 'demo', support: 'already', pillow: 'added', protection: 'added' }) === 'Next: save to take home'
      && run('es', 'chosen', { adjustability: 'demo', support: 'already', pillow: 'added', protection: 'added' }) === 'Siguiente: guardar para llevar');
    ok('executed: the cue never names payment', !/pay|pago/i.test(cueSrc.replace(/\/\/[^\n]*/g, '').replace(/1\.5 surface[^\n]*/g, '')));
    const broken = cueSrc.replace("if ((st === 'open' || st === 'later') && cues[step.id]) return cues[step.id];", '');
    ok('negative control: dropping the open-step read makes an open step report "save" (the cue pin would fail)',
      broken !== cueSrc && run('en', 'chosen', { adjustability: 'open' }, broken) === 'Next: save to take home');
  }
  // Take-home.
  ok('take-home: the subhead keeps only its purpose clause (static + both runtime branches)',
    /id="emailSubhead">So a sleep specialist can pick up where you left off\.<\/p>/.test(norm)
    && norm.includes("'So a ' + storeName() + ' sleep specialist can pick up where you left off.'")
    && norm.includes("'Para que un especialista de sueño de ' + storeName() + ' continúe donde lo dejaste.'")
    && !liveHtml.includes('Keep your mattress matches'));
  ok('take-home: the packet counts stand alone ("1 saved"), the empty Sleep System row is factual, the finalist\'s own photo (or nothing) joins the row',
    norm.includes("(savedMattresses.length + ' saved'))") && norm.includes("(recCount + ' recommended'))")
    && !liveHtml.includes('· your strongest matches') && !liveHtml.includes('Explore with your specialist in store')
    && norm.includes("(_esE ? 'Nada agregado aún' : 'Nothing added yet') }")
    && norm.includes("return fin && fin.kind === 'chosen' && fin.item && fin.item.imageUrl ? String(fin.item.imageUrl) : '';")
    && norm.includes(`'<img class="email-save-thumb" src="' + escapeHtml(r.thumb) + '" alt="" width="60" height="40" decoding="async">'`)
    && /\.email-save-thumb \{[^}]*object-fit: contain;[^}]*background: #FFFDF8;/.test(norm));
  // Take-home preview honesty (synthesis change 5 + ruling 6).
  ok('take-home: exactly one concise preview disclosure, the owner-specified wording, static + both runtime branches (ES provisional); the old "Preview mode: live…" line is gone',
    /id="emailPreviewNote">Preview: email delivery isn’t connected yet\.<\/div>/.test(norm)
    && norm.includes(`: "Preview: email delivery isn’t connected yet.";`)
    && norm.includes("? 'Vista previa: el envío por correo aún no está conectado.'")
    && !liveHtml.includes('Preview mode: live email delivery') && !liveHtml.includes('Modo de vista previa: la entrega de correo en vivo')
    && norm.includes("noteEl.style.display = isDemoMode ? '' : 'none';"));
  ok('take-home: the confirmation states the delivery fact alone; the config suffix (demoDeliveryNote) is retired from render and no longer read anywhere',
    norm.includes("setText('emailPreviewModeNote', es ? 'No se envió ningún correo.' : 'No email was sent.');")
    && !/getSavingsPassConfig\(\)\.demoDeliveryNote/.test(norm)
    && !/setText\('emailPreviewModeNote'[^\n]*demoDeliveryNote/.test(norm)
    && (norm.match(/demoDeliveryNote/g) || []).length === 3);
  // Brief ordinals.
  ok('Brief: every priority row carries the shared ordinal ring before its title, hidden from assistive technology; the title keeps the accessible name',
    norm.includes(`+ '<span class="noct-profile-priority-ordinal" aria-hidden="true">' + (i + 1) + '</span>'\n            + '<span class="noct-profile-priority-title">'`)
    && /\.noct-profile-priority-ordinal \{[^}]*border: 1\.5px solid var\(--accent-ink\);[^}]*border-radius: 50%;/.test(norm)
    && /\.noct-profile-priority-title \{\s*flex: 1;/.test(norm));
}

// ============================================ 9. Reserved image size never defeats the CSS frame (A3.1 c6)
section('Results photos — the width/height attributes reserve the ratio; the CSS frame governs the box in every orientation');
{
  // The b44c891 capture run showed the top-pick hero at 736x1000 in portrait
  // and both support photos 900px tall in every orientation: a definite
  // attribute height defeats aspect-ratio unless the rule resets it.
  ok('the top-pick photo base rule resets the attribute height before its 16:9 frame (portrait keeps the fold)',
    /\.noct-toppick-photo \{\s*\n\s*width: 100%;\s*\n(?:\s*\/\*[\s\S]*?\*\/\s*\n)?\s*height: auto;\s*\n\s*aspect-ratio: 16 \/ 9;/.test(norm));
  ok('the support photo rule resets the attribute height before its 16:9 frame',
    /\.noct-support-photo \{\s*\n\s*width: 100%;\s*\n\s*height: auto;[^\n]*\n\s*aspect-ratio: 16 \/ 9;/.test(norm));
  ok('the landscape 3:2 hero override keeps height: auto too',
    /\.noct-toppick-photo \{\s*\n\s*aspect-ratio: 3 \/ 2;\s*\n\s*width: 100%;\s*\n\s*height: auto;/.test(norm));
  ok('every reserved Results/drawer/Compare photo pairs its attributes with a CSS frame that owns the height',
    norm.includes('width="1500" height="1000" alt="">') && norm.includes('width="1600" height="900" alt="" decoding="async">')
    && /\.drawer-hero img \{ width:100%; height:100%; object-fit:contain; display:block; \}/.test(norm)
    && /\.cmp-head-img img \{[^}]*height: 100%/.test(norm));
}

// ============================================ 10. Pillow fit - generic fit-response marks (A3.1 synthesis, change 2)
section('Pillow fit — three generic fit-response marks, paired with their labels, never the pillow\'s loft');
{
  const markSrc = extractFunction('function fitResponseMark(id)');
  const fitSrc = extractFunction('function renderPillowFit(primary)');
  ok('pillow sources extracted', !!markSrc && !!fitSrc);
  const fitCss = (norm.match(/\.sleep-system__fit-response \{[^}]*\}/) || [''])[0];
  ok('naming: the mark is a fit RESPONSE in class, data attribute and builder; no loft/height vocabulary anywhere in the mark, the renderer or its CSS',
    !!markSrc && fitSrc.includes('fitResponseMark(option.id)') && markSrc.includes('data-fit-response="')
    && !/loft/i.test(markSrc.replace(/\/\/[^\n]*/g, '')) && !/loft/i.test(fitSrc.replace(/\/\/[^\n]*/g, ''))
    && !/loft/i.test(fitCss) && !/loft/i.test(norm.slice(norm.indexOf('.sleep-system__fit-response {'), norm.indexOf('.sleep-system__pillow-reaction.is-active {'))));
  ok('the mark is decorative (aria-hidden) and code-native (inline SVG in currentColor; no raster, no product dimension read)',
    markSrc.includes(`aria-hidden="true">`) && markSrc.includes('<svg viewBox="0 0 30 20" focusable="false">')
    && (markSrc.match(/currentColor/g) || []).length >= 3 && !/<img|url\(|primary\.|loft|height/i.test(markSrc.replace(/\/\/[^\n]*/g, '')));
  ok('the three marks differ by the head\'s position against the neutral line (below / level / above)',
    markSrc.includes("var headY = id === 'low' ? 15 : (id === 'high' ? 5 : 10);"));
  ok('the note under the buttons states the distinction in both languages',
    fitSrc.includes("{ en: 'The marks show the reported fit, not this pillow’s height.', es: 'Las marcas muestran el ajuste reportado, no la altura de esta almohada.' }"));
  ok('the response group is named for assistive technology (EN + ES) and every button exposes aria-pressed',
    fitSrc.includes(`role="group" aria-label="' +`) && fitSrc.includes("{ en: 'Customer fit response', es: 'Respuesta de ajuste del cliente' }")
    && fitSrc.includes(`'" aria-pressed="' + (reaction === option.id ? 'true' : 'false') +`));
  ok('forced colors: the pressed fit-response button is drawn by border in the candidate block (state never colour alone); the 44px floor holds (52px)',
    /@media \(forced-colors: active\) \{[^}]*\.sleep-system__position\[aria-pressed="true"\][^}]*\}[\s\S]{0,400}\.sleep-system__pillow-reaction\[aria-pressed="true"\],\s*\.sleep-system__protection-goal\[aria-pressed="true"\] \{ border: 3px double CanvasText; \}/.test(norm)
    && /\.sleep-system__pillow-reaction \{\s*min-height: 52px;/.test(norm));
  ok('the handler contract is untouched: data-sleep-action="pillow-reaction" + data-reaction identity, the P9 candidate swap and the feedback copy',
    fitSrc.includes(`data-sleep-action="pillow-reaction" data-reaction="' + option.id + '"`)
    && fitSrc.includes("var feedback = window._sleepSystemState.pillowFeedback || '';")
    && fitSrc.includes("Try another pillow on this mattress and compare the height, then record the fit again."));

  // EXECUTED: the renderer in both languages and every response state.
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function runFit(lang, reaction, feedback = '', src = markSrc + '\n' + fitSrc) {
    const win = { _sleepSystemState: { pillowReaction: reaction, pillowFeedback: feedback } };
    return new Function('window', 'escapeHtml', 'sleepSystemText', 'sleepSystemGuidance', 'pillowFitRationale', 'answers',
      '"use strict";' + src + '\nreturn renderPillowFit({});')(
      win, esc, (o) => (typeof o === 'string' ? o : (o[lang] || o.en)), () => ['guide line'], () => ({ en: 'rationale', es: 'razón' }), {});
  }
  const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const en = runFit('en', '');
  const marks = [...en.matchAll(/data-fit-response="([a-z]+)" aria-hidden="true"/g)].map((m) => m[1]);
  ok('executed: exactly three marks render, in order low / aligned / high, each aria-hidden', JSON.stringify(marks) === '["low","aligned","high"]');
  const buttons = [...en.matchAll(/<button type="button" class="sleep-system__pillow-reaction[^"]*" aria-pressed="(true|false)" data-sleep-action="pillow-reaction" data-reaction="([a-z]+)">([\s\S]*?)<\/button>/g)];
  ok('executed: every button pairs its mark with its own visible label (the mark carries no text of its own)',
    buttons.length === 3
    && buttons.every((b) => b[3].includes(`data-fit-response="${b[2]}"`))
    && buttons.map((b) => text(b[3])).join('|') === 'Too low|Feels aligned|Too high'
    && [...en.matchAll(/<span class="sleep-system__fit-response"[\s\S]*?<\/span>/g)].every((m) => text(m[0]) === ''));
  ok('executed: nothing recorded -> no button is pressed; a recorded response presses exactly its button',
    buttons.every((b) => b[1] === 'false')
    && [...runFit('en', 'low').matchAll(/aria-pressed="(true|false)" data-sleep-action="pillow-reaction" data-reaction="([a-z]+)"/g)].map((m) => m[2] + ':' + m[1]).join(',') === 'low:true,aligned:false,high:false'
    && [...runFit('en', 'high').matchAll(/aria-pressed="(true|false)" data-sleep-action="pillow-reaction" data-reaction="([a-z]+)"/g)].map((m) => m[2] + ':' + m[1]).join(',') === 'low:false,aligned:false,high:true');
  const headYOf = (html, id) => (html.match(new RegExp(`data-fit-response="${id}"[\\s\\S]*?<circle cx="6" cy="(\\d+)"`)) || [])[1];
  ok('executed: the low mark sits below the line, aligned on it, high above it (distinct silhouettes)',
    headYOf(en, 'low') === '15' && headYOf(en, 'aligned') === '10' && headYOf(en, 'high') === '5');
  ok('executed: the note renders in EN and ES beneath the group; the group carries its bilingual name',
    en.includes('<p class="sleep-system__fit-response-note">The marks show the reported fit, not this pillow’s height.</p>')
    && runFit('es', '').includes('<p class="sleep-system__fit-response-note">Las marcas muestran el ajuste reportado, no la altura de esta almohada.</p>')
    && en.includes('role="group" aria-label="Customer fit response">') && runFit('es', '').includes('aria-label="Respuesta de ajuste del cliente">'));
  ok('executed: the feedback line still renders after a recorded response (behaviour preserved)',
    runFit('en', 'low', 'low').includes('<div class="sleep-system__pillow-feedback">Try another pillow on this mattress and compare the height, then record the fit again.</div>'));
  const exposed = runFit('en', '', '', mustReplace(markSrc, `aria-hidden="true">`, '>') + '\n' + fitSrc);
  ok('negative control: a mark that loses aria-hidden is detected', !/data-fit-response="low" aria-hidden="true"/.test(exposed));
}

// ============================================ 11. Protection goals - compact goal glyphs (A3.1 synthesis, change 3)
section('Protection goals — four compact goal glyphs, paired with their labels, depicting the customer\'s goal only');
{
  const glyphSrc = extractFunction('function goalGlyph(id)');
  const guideSrc = extractFunction('function renderProtectionGuide()');
  ok('protection sources extracted', !!glyphSrc && !!guideSrc);
  ok('naming + semantics: the glyph is a goal glyph (class, data attribute, builder), decorative (aria-hidden), code-native SVG in currentColor, and reads no product',
    !!glyphSrc && guideSrc.includes('goalGlyph(goal.id)') && glyphSrc.includes(`data-goal-glyph="' + id + '" aria-hidden="true">`)
    && glyphSrc.includes('<svg viewBox="0 0 20 20" focusable="false" fill="none" stroke="currentColor"')
    && !/<img|url\(|primary\.|item\.|matchTags|waterproof|barrier|breathable|protect/i.test(glyphSrc.replace(/\/\/[^\n]*/g, '')));
  ok('the four glyphs are distinct shapes keyed by the four goal ids',
    ['spills:', 'allergens:', 'cooling:', 'everyday:'].every((k) => glyphSrc.includes(k))
    && glyphSrc.includes('<path d="M10 3.2') && (glyphSrc.match(/<circle /g) || []).length === 3
    && glyphSrc.includes('<rect x="3.4"') && glyphSrc.includes("var shape = shapes[id] || shapes.everyday;"));
  ok('every goal button keeps its visible label AND the governed copy line beside the glyph (the glyph never replaces text)',
    guideSrc.includes("{ id: 'spills', label: { en: 'Spills', es: 'Derrames' }, copy: { en: 'Waterproof coverage', es: 'Cobertura impermeable' } }")
    && guideSrc.includes("{ id: 'everyday', label: { en: 'Everyday care', es: 'Cuidado diario' }, copy: { en: 'Simple daily protection', es: 'Protección diaria sencilla' } }")
    && guideSrc.includes(`goalGlyph(goal.id) +\n                escapeHtml(sleepSystemText(goal.label)) +\n                '<small>' + escapeHtml(sleepSystemText(goal.copy)) + '</small>' +`));
  ok('the goal group is named for assistive technology (EN + ES) and every button exposes aria-pressed; the 44px floor holds (72px)',
    guideSrc.includes("{ en: 'Protection goal', es: 'Meta de protección' }") && guideSrc.includes(`role="group" aria-label="' +`)
    && guideSrc.includes(`'" aria-pressed="' + (selected === goal.id ? 'true' : 'false') +`)
    && /\.sleep-system__protection-goal \{\s*min-height: 72px;/.test(norm));
  ok('the selection contract is untouched: data-sleep-action="protection-goal" + data-protection-goal identity, the suggested-goal badge, the suggested/selected derivation',
    guideSrc.includes(`data-sleep-action="protection-goal" data-protection-goal="' + goal.id + '"`)
    && guideSrc.includes("var suggested = getSuggestedProtectionGoal();") && guideSrc.includes("var selected = window._sleepSystemState.protectionGoal || suggested;")
    && guideSrc.includes(`'<span class="sleep-system__goal-badge">' + escapeHtml(sleepSystemText({ en: 'Suggested', es: 'Sugerida' })) + '</span>'`));

  // EXECUTED: the guide in both languages, suggested vs selected.
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function runGuide(lang, selectedGoal, suggested = 'everyday', src = glyphSrc + '\n' + guideSrc) {
    const win = { _sleepSystemState: { protectionGoal: selectedGoal } };
    return new Function('window', 'escapeHtml', 'sleepSystemText', 'sleepSystemGuidance', 'getSuggestedProtectionGoal', 'protectionRationale', 'protectionGoalLabel',
      '"use strict";' + src + '\nreturn renderProtectionGuide();')(
      win, esc, (o) => (typeof o === 'string' ? o : (o[lang] || o.en)), () => ['guide line'], () => suggested, () => ({ en: 'rationale', es: 'razón' }), () => ({ en: 'x', es: 'x' }));
  }
  const text = (html) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const en = runGuide('en', '');
  const glyphs = [...en.matchAll(/data-goal-glyph="([a-z]+)" aria-hidden="true"/g)].map((m) => m[1]);
  ok('executed: exactly four glyphs render, in goal order, each aria-hidden', JSON.stringify(glyphs) === '["spills","allergens","cooling","everyday"]');
  const buttons = [...en.matchAll(/<button type="button" class="sleep-system__protection-goal[^"]*" aria-pressed="(true|false)" data-sleep-action="protection-goal" data-protection-goal="([a-z]+)">([\s\S]*?)<\/button>/g)];
  ok('executed: every button pairs its own glyph with its visible label and copy; the glyph itself carries no text',
    buttons.length === 4 && buttons.every((b) => b[3].includes(`data-goal-glyph="${b[2]}"`))
    && buttons.map((b) => text(b[3]).replace(/^Suggested ?/, '')).join('|') === 'SpillsWaterproof coverage|AllergensBarrier or encasement|CoolingBreathable surface|Everyday careSimple daily protection'
    && [...en.matchAll(/<span class="sleep-system__goal-glyph"[\s\S]*?<\/span>/g)].every((m) => text(m[0]) === ''));
  const pressed = (html) => [...html.matchAll(/aria-pressed="(true|false)" data-sleep-action="protection-goal" data-protection-goal="([a-z]+)"/g)].map((m) => m[2] + ':' + m[1]).join(',');
  ok('executed: with nothing tapped the suggested goal is the pressed one; a tapped goal presses exactly its button; the Suggested badge stays on the suggested goal',
    pressed(en) === 'spills:false,allergens:false,cooling:false,everyday:true'
    && pressed(runGuide('en', 'spills', 'cooling')) === 'spills:true,allergens:false,cooling:false,everyday:false'
    && /data-protection-goal="cooling"><span class="sleep-system__goal-badge">Suggested<\/span><span class="sleep-system__goal-glyph" data-goal-glyph="cooling"/.test(runGuide('en', 'spills', 'cooling')));
  const shapeOf = (html, id) => (html.match(new RegExp(`data-goal-glyph="${id}" aria-hidden="true"><svg[^>]*>([\\s\\S]*?)</svg>`)) || [])[1];
  ok('executed: the four glyph shapes differ', new Set(['spills', 'allergens', 'cooling', 'everyday'].map((id) => shapeOf(en, id))).size === 4);
  ok('executed: ES renders the same four glyphs beside the Spanish labels and the Spanish group name',
    JSON.stringify([...runGuide('es', '').matchAll(/data-goal-glyph="([a-z]+)"/g)].map((m) => m[1])) === '["spills","allergens","cooling","everyday"]'
    && runGuide('es', '').includes('aria-label="Meta de protección">') && runGuide('es', '').includes('Derrames<small>Cobertura impermeable</small>'));
  const exposed = runGuide('en', '', 'everyday', mustReplace(glyphSrc, `aria-hidden="true">`, '>') + '\n' + guideSrc);
  ok('negative control: a glyph that loses aria-hidden is detected', !/data-goal-glyph="spills" aria-hidden="true"/.test(exposed));
}

// ============================================ 12. Consultation Summary composition (A3.1 synthesis, change 4 + ruling 5)
section('Consultation Summary — first-fold order, one NEXT cue in the status block, payment out of the card, Visit focus vs Priorities, attribution below the fold');
{
  const at = (m) => norm.indexOf(m);
  ok('status block order: thumbnail -> finalist eyebrow -> name -> rows (Still open) -> NEXT cue -> (payment node, never rendered) -> route',
    at('id="hf2StatusThumb"') < at('id="hf2LeadLine"') && at('id="hf2LeadLine"') < at('id="hf2StatusName"')
    && at('id="hf2StatusName"') < at('id="hf2StatusRows"') && at('id="hf2StatusRows"') < at('id="hf2StatusNext"')
    && at('id="hf2StatusNext"') < at('id="hf2StatusPayment"') && at('id="hf2StatusPayment"') < at('id="hf2StatusRoute"')
    && /<p class="hf2-status__next" id="hf2StatusNext" hidden><\/p>/.test(norm));
  ok('the lead renderer no longer derives a payment sentence (no hf2.pay_state, no payment-path read); the status payment node is always empty and hidden',
    !/hf2\.pay_state|finPaymentPaths\(\)|FC\('preference/.test(leadSrc)
    && leadSrc.includes("        payEl.textContent = '';\n        payEl.hidden = true;") && leadSrc.includes('lineEl.textContent = lead;'));
  ok('the financing module keeps its preference row - the one payment surface on the screen (handoff + sheet)',
    (norm.match(/FC\('paymentPreferenceLabel'\)/g) || []).length === 2 && /function renderHandoffFinancing\(\)/.test(norm));
  ok('exactly one NEXT cue call site (the status block); the finale hint no longer calls it',
    (norm.match(/(?<!function )consultationNextCue\(\)/g) || []).length === 1
    && leadSrc.includes("var cue = (typeof consultationNextCue === 'function') ? consultationNextCue() : '';"));
  ok('the NEXT cue node joins the wipe\'s text inventory', /'hf2StatusMeta', 'hf2StatusNext',/.test(norm));
  ok('Visit focus (the recap rows) and Priorities (the ordered markers) are two labels, two concepts - static and rendered, EN + ES',
    /id="hf2NeedsLabel">Visit focus</.test(norm) && /id="hf2PrioritiesLabel">Priorities</.test(norm)
    && norm.includes("hf2NeedsLabel: es ? 'Enfoque de la visita' : 'Visit focus',") && norm.includes("hf2PrioritiesLabel: es ? 'Prioridades' : 'Priorities',")
    && !liveHtml.includes("hf2PrioritiesLabel: es ? 'Lo que probaremos juntos'"));
  ok('the priorities are three horizontal ordered markers (grid, compact cards >= 44px), stacked only on narrow screens; the ordinal ring and the bare <ol> semantics stay',
    /\.hf2-priorities \{\s*display: grid;\s*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[^}]*list-style: none;/.test(norm)
    && /\.hf2-priorities__item \{[^}]*min-height: 44px;[^}]*border-radius: 8px;/.test(norm)
    && /@media \(max-width: 560px\) \{[^@]*\.hf2-priorities \{ grid-template-columns: 1fr; \}/.test(norm)
    && /<ol class="hf2-priorities" id="hf2Priorities"><\/ol>/.test(norm));
  ok('the store attribution and the salesperson strip are not first-fold content: both sit after the Sleep System section and before the payment module and the save; the intro carries no attribution',
    at('id="hf2SleepSystemSection"') < at('id="hf2Attribution"') && at('id="hf2Attribution"') < at('id="hf2RsaStripBtn"')
    && at('id="hf2RsaStripBtn"') < at('id="hf2Financing"') && at('id="hf2Financing"') < at('id="hf2PassLabel"')
    && !/<div class="hf2-review-intro">[\s\S]*?id="hf2Attribution"[\s\S]*?id="hf2ReviewTitle"/.test(norm)
    && /<div class="hf2-review-nav hf2-review-nav--record">\s*<div class="hf2-review-attribution" id="hf2Attribution" hidden><\/div>/.test(norm));
  ok('the attribution renderer and the salesperson picker are untouched (config-derived line; disclosure button; wipe entries)',
    /storeName\(\) \? \(attrSub \? storeName\(\) \+ ' · ' \+ attrSub : storeName\(\)\) : '';/.test(norm)
    && /id="hf2RsaStripBtn" type="button"\s*\n\s*aria-expanded="false" aria-controls="hf2RsaPanel"/.test(norm)
    && /\{ id: 'hf2RsaPanel', hiddenAttr: true \},/.test(norm) && /'emailNameInput', 'emailInput', 'emailPhoneInput', 'hf2RsaAddInput'/.test(norm));

  // EXECUTED: the status block renders the cue once, the payment node never.
  const mixed = { support: { status: 'confirm' }, pillow: { status: 'later' }, adjustability: { status: 'demo', position: 'flat' }, protection: { status: 'already' } };
  const withCue = makeLeadEnv({ decisions: mixed, mutate: (s) => 'function consultationNextCue() { return "Next: check pillow fit on the finalist"; }\n' + s });
  const next = withCue.els.get('hf2StatusNext');
  const pay = withCue.els.get('hf2StatusPayment');
  ok('executed: the status block carries the cue after the Still-open row, and no payment text',
    next.textContent === 'Next: check pillow fit on the finalist' && next.hidden === false
    && pay.textContent === '' && pay.hidden === true
    && withCue.rows.innerHTML.includes('Support (specialist check needed)'));
  const noCue = makeLeadEnv({ decisions: mixed });
  ok('executed: without a cue producer the node stays empty and hidden (never a stale line)',
    noCue.els.get('hf2StatusNext').textContent === '' && noCue.els.get('hf2StatusNext').hidden === true);
  const dropped = makeLeadEnv({ decisions: mixed, mutate: (s) => 'function consultationNextCue() { return "Next: x"; }\n' + mustReplace(s, "nextEl.textContent = cue;", "nextEl.textContent = '';") });
  ok('negative control: a renderer that drops the cue is detected', dropped.els.get('hf2StatusNext').textContent === '');
}

section('Product-proof content — explicit schema extension, 26-model coverage, family sharing, canonical lineage, copy rules');
{
  // Owner-approved A3.1 mattress-drawer revision (2026-09-02), slice 2: the
  // premium story, the compact trial cue, up to two "What to notice" proofs
  // and the construction labels are canonical Lacks content in
  // incoming/lacks_mattresses.json, carried through the workbook -> CSV ->
  // JSON pipeline as NINE explicit new columns (nothing repurposed). Set
  // A31_PP_ROOT to run this section against another tree.
  const ppRoot = process.env.A31_PP_ROOT || root;
  const read = (rel) => readFileSync(join(ppRoot, ...rel.split('/')), 'utf8').replace(/\r\n/g, '\n');
  const safe = (fn) => { try { return fn(); } catch (e) { return false; } };
  const schemaPy = read('tools/workbook_schema.py');
  const builderPy = read('incoming/build_lacks_workbook.py');
  const buildPs1 = read('build-data.ps1');
  const validationPy = read('tools/validation.py');
  const canonical = JSON.parse(read('incoming/lacks_mattresses.json'));
  const generated = JSON.parse(read('data/mattresses.json'));
  const csvHead = read('data/mattresses.csv').split('\n')[0].split(',');
  const csvEsHead = read('data/mattresses-es.csv').split('\n')[0].split(',');
  const FIELDS = ['storyHeadline', 'storyNarrative', 'trialCue', 'proof1Title', 'proof1Cue', 'proof2Title', 'proof2Cue', 'constructionComfort', 'constructionSupport'];
  const all = ['gold', 'silver', 'bronze'].flatMap((t) => generated[t] || []);
  const byId = new Map(all.map((m) => [m.id, m]));
  const bi = (o) => !!o && typeof o === 'object' && typeof o.en === 'string' && typeof o.es === 'string';
  const filled = (o) => bi(o) && o.en.trim() !== '' && o.es.trim() !== '';
  const blank = (o) => bi(o) && o.en.trim() === '' && o.es.trim() === '';
  const J = (v) => JSON.stringify(v);

  // ---- pipeline: an explicit schema extension, never a repurposed field
  ok('workbook schema declares the nine product-proof columns and their (ES) twins',
    FIELDS.every((f) => schemaPy.includes(`col("${f}",`) && schemaPy.includes(`col("${f} (ES)", "${f}_es", lang="es"`)));
  ok('the ES CSV contract lists the nine columns after differentiator2Detail',
    FIELDS.every((f) => new RegExp(`"differentiator2Detail",[\\s\\S]*?"${f}",`).test(schemaPy)));
  ok('the workbook builder carries the nine keys in both its EN column list and its ES key list',
    (builderPy.match(/"constructionComfort", "constructionSupport",/g) || []).length === 2
    && (builderPy.match(/"storyHeadline", "storyNarrative", "trialCue",/g) || []).length === 2);
  ok('build-data.ps1 emits bilingual story / trial cue / construction objects only when populated, and proofs as an ordered array',
    /\$mattress\["proofs"\] = \$proofs/.test(buildPs1)
    && /if \(\$null -ne \$construction\) \{ \$mattress\["construction"\] = \$construction \}/.test(buildPs1)
    && /if \(\$null -ne \$storyHeadline\) \{ \$mattress\["storyHeadline"\] = \$storyHeadline \}/.test(buildPs1)
    && /if \(\$null -ne \$storyNarrative\) \{ \$mattress\["storyNarrative"\] = \$storyNarrative \}/.test(buildPs1)
    && /if \(\$null -ne \$trialCue\) \{ \$mattress\["trialCue"\] = \$trialCue \}/.test(buildPs1));
  ok('the validator treats each proof as one bilingual component, refuses a proof title without its cue, and fills proofs in order',
    /\("proof1", \("proof1Title", "proof1Cue"\)\)/.test(validationPy) && /\("proof2", \("proof2Title", "proof2Cue"\)\)/.test(validationPy)
    && /without proof\{n\}Cue/.test(validationPy) && /proofs fill in order/.test(validationPy)
    && /"storyHeadline", "storyNarrative", "trialCue",\s*"constructionComfort", "constructionSupport"\):/.test(validationPy));
  ok('the generated CSVs carry the nine columns (EN) and the nine (ES) columns',
    FIELDS.every((f) => csvHead.includes(f) && csvEsHead.includes(f)));
  ok('the differentiator pairs still exist as their own columns (Compare keeps its "Why it helps"; nothing was repurposed)',
    ['differentiator1Title', 'differentiator1Detail', 'differentiator2Title', 'differentiator2Detail'].every((c) => csvHead.includes(c) && csvEsHead.includes(c)));

  // ---- coverage: 26 models, story + cue + construction everywhere, one or two proofs
  ok('26 generated mattresses, every canonical id present',
    all.length === 26 && canonical.length === 26 && canonical.every((c) => byId.has(c.id)));
  ok('every model carries a bilingual story headline, story narrative and trial cue',
    all.every((m) => filled(m.storyHeadline) && filled(m.storyNarrative) && filled(m.trialCue)));
  ok('every model carries one or two proofs, each a bilingual title + cue pair (a proof is never a bare title)',
    all.every((m) => Array.isArray(m.proofs) && m.proofs.length >= 1 && m.proofs.length <= 2 && m.proofs.every((p) => filled(p.title) && filled(p.cue))));
  ok('every model carries a construction object with a bilingual comfort label and a bilingual support slot',
    all.every((m) => !!m.construction && filled(m.construction.comfort) && bi(m.construction.support)));
  ok('support labels are blank only where the approved story names no support layer (g2, g4) and filled everywhere else',
    safe(() => all.every((m) => (['g2', 'g4'].includes(m.id) ? blank(m.construction.support) : filled(m.construction.support)))));

  // ---- canonical lineage: generated objects equal the canonical EN / ES cells
  ok('generated values equal the canonical incoming/lacks_mattresses.json cells for all nine fields in both languages',
    safe(() => canonical.every((c) => {
      const m = byId.get(c.id); const es = c.es || {};
      const same = (o, f) => o.en === (c[f] || '') && o.es === (es[f] || '');
      const p = m.proofs || [];
      const proofsOk = ['1', '2'].every((n) => {
        const t = c[`proof${n}Title`] || '', cue = c[`proof${n}Cue`] || '';
        const te = es[`proof${n}Title`] || '', ce = es[`proof${n}Cue`] || '';
        const idx = Number(n) - 1;
        if (!t && !cue && !te && !ce) return p.length <= idx;
        return !!p[idx] && p[idx].title.en === t && p[idx].cue.en === cue && p[idx].title.es === te && p[idx].cue.es === ce;
      });
      return same(m.storyHeadline, 'storyHeadline') && same(m.storyNarrative, 'storyNarrative') && same(m.trialCue, 'trialCue')
        && same(m.construction.comfort, 'constructionComfort') && same(m.construction.support, 'constructionSupport') && proofsOk;
    })));

  // ---- the mattress-family rule (owner): shared proofs, distinct stories
  const mayfair = ['g6', 'g7'].map((id) => byId.get(id));
  const summit = ['s5', 's6', 's7'].map((id) => byId.get(id));
  ok('Reserve Mayfair Plush and Medium share identical proofs and construction labels',
    safe(() => mayfair.every((m) => m.name.startsWith('Reserve Mayfair')) && J(mayfair[0].proofs) === J(mayfair[1].proofs) && J(mayfair[0].construction) === J(mayfair[1].construction)));
  ok('the Mayfair proofs are the owner-approved pair, verbatim',
    safe(() => mayfair[0].proofs[0].title.en === 'Hand-tufted cooling surface'
      && mayfair[0].proofs[0].cue.en === 'Touch the Tencel cover and notice the smooth, cool first contact.'
      && mayfair[0].proofs[1].title.en === 'Natural responsive comfort'
      && mayfair[0].proofs[1].cue.en === 'Press and release the wool, latex and microcoil comfort stack to feel its quick recovery.'));
  ok('Platinum Summit Firm, Medium and Plush share identical proofs and construction labels',
    safe(() => summit.every((m) => m.name.startsWith('Platinum Summit')) && summit.every((m) => J(m.proofs) === J(summit[0].proofs) && J(m.construction) === J(summit[0].construction))));
  ok('the Summit proofs are the owner-approved pair, verbatim',
    safe(() => summit[0].proofs[0].title.en === 'Cooling comfort layers'
      && summit[0].proofs[0].cue.en === 'Touch the cooling cover, then settle into the breathable comfort foam beneath it.'
      && summit[0].proofs[1].title.en === 'Pocketed zoned support'
      && summit[0].proofs[1].cue.en === 'Change positions and feel the coil system respond beneath the surface.'));
  ok('family members keep their own story headline and trial cue (shared proofs, distinct stories)',
    safe(() => mayfair[0].storyHeadline.en !== mayfair[1].storyHeadline.en && mayfair[0].trialCue.en !== mayfair[1].trialCue.en
      && new Set(summit.map((m) => m.storyHeadline.en)).size === 3 && new Set(summit.map((m) => m.trialCue.en)).size === 3));

  // ---- copy rules: demonstrations, never claims; no comparisons, prices or terms
  const texts = (m) => [m.storyHeadline, m.storyNarrative, m.trialCue, m.construction.comfort, m.construction.support, ...m.proofs.flatMap((p) => [p.title, p.cue])];
  const enText = safe(() => all.flatMap((m) => texts(m).map((o) => o.en))) || [];
  const esText = safe(() => all.flatMap((m) => texts(m).map((o) => o.es))) || [];
  const bannedEn = /\b(best|better|superior|coolest|healthier|healthy|decades|prevents?|eliminates?|cures?|medical|delivery|in stock|warranty|guarantee|versus|vs\.?|compared to|month(ly)?)\b|\$/i;
  const bannedEs = /\b(mejor|saludable|previene|elimina|décadas|garantía|entrega|en existencia|cura|médico|versus|vs\.?|comparado con|mensual)\b|\$/i;
  ok('no EN product-proof text carries a superiority, health, durability, price, delivery, warranty or comparison claim',
    enText.length === 26 * 9 && enText.every((t) => !bannedEn.test(t)));
  ok('no ES product-proof text carries such a claim (provisional Spanish, same rules)',
    esText.length === 26 * 9 && esText.every((t) => !bannedEs.test(t)));
  ok('proof cues are demonstration instructions: every EN cue opens with an action verb',
    safe(() => all.every((m) => m.proofs.every((p) => /^(Touch|Reveal|Press|Roll|Settle|Point|Lie|Remain|Place|Identify|Notice|Try|Move|Test|Sit|Let|Change|Feel|Stay)\b/.test(p.cue.en)))));
  ok('every EN trial cue is one compact sentence (a single terminal period, under 110 characters)',
    safe(() => all.every((m) => (m.trialCue.en.match(/[.!?]/g) || []).length === 1 && m.trialCue.en.length < 110)));
  ok('proof titles stay short so two fit beside the construction demonstration (EN < 45, ES < 60 characters)',
    safe(() => all.every((m) => m.proofs.every((p) => p.title.en.length < 45 && p.title.es.length < 60))));
  ok('product names are preserved exactly: no story or proof text renames a model',
    safe(() => all.every((m) => texts(m).every((o) => !/\bMayfair Firm\b|\bSummit Soft\b|Tempur ?Pedic\b/.test(o.en)))));
}

section('Product-proof drawer painter — "Try this mattress" (0/1/2 demonstrations with Comfort / Support bases), no standalone Try, dormant schematic gate, ES, order');
{
  const pStart = norm.indexOf('    // ---- Product-proof drawer painter (owner decisions 2026-09-02)');
  const pStop = norm.indexOf('    // ---- end product-proof painter');
  const painterSrc = pStart !== -1 && pStop !== -1 ? norm.slice(pStart, pStop) : '';
  const painterCode = painterSrc.replace(/\/\/[^\n]*/g, '');
  const dStart = norm.indexOf('id="mattressDrawer"');
  const dStop = norm.indexOf('<!-- SCREEN: Saved Picks');
  const drawerHtml = norm.slice(dStart, dStop);
  const at = (s) => drawerHtml.indexOf(s);
  ok('the painter block is fenced and extractable, with the fail-closed schematic gate inside it',
    painterSrc.includes('function paintDrawerProductProof(m)') && painterSrc.includes('function constructionSchematicAvailable(m)')
    && painterSrc.includes('window.constructionSchematicAvailable = constructionSchematicAvailable;'));
  ok('the painter reads canonical fields only - never answers, quiz tags or features (construction is never inferred)',
    painterCode.length > 0 && !/answers|\.features|\.tags|quizTags|archetype/.test(painterCode)
    && /m\.storyHeadline/.test(painterCode) && /m\.proofs/.test(painterCode) && /m\.construction\b/.test(painterCode));
  ok('the standalone Try consumer is gone: the painter no longer reads trialCue, and the engine prompt has no drawer consumer',
    !/trialCue/.test(painterCode) && !/getMattressTrialPrompts/.test(painterCode));
  const MATT = JSON.parse(readFileSync(join(root, 'data', 'mattresses.json'), 'utf8'));
  const ALLM = ['gold', 'silver', 'bronze'].flatMap((t) => MATT[t] || []);
  const findM = (id) => ALLM.find((m) => m.id === id);
  ok('trialCue stays intact and unrendered: present for all 26 models in both languages in the generated JSON and the canonical source, named by the schema and the build script',
    ALLM.length === 26 && ALLM.every((m) => m.trialCue && m.trialCue.en && m.trialCue.es)
    && (readFileSync(join(root, 'incoming', 'lacks_mattresses.json'), 'utf8').split('"trialCue"').length - 1) >= 26
    && readFileSync(join(root, 'tools', 'workbook_schema.py'), 'utf8').includes('trialCue')
    && readFileSync(join(root, 'build-data.ps1'), 'utf8').includes('trialCue'));
  function runPainter(m, { lang = 'en', mutate = null, config = undefined, stale = false } = {}) {
    const els = new Map();
    const mk = (id) => { const set = new Set(); return { id, hidden: undefined, textContent: '', innerHTML: '', parentNode: null,
      classList: { toggle(c, f) { const on = f === undefined ? !set.has(c) : !!f; if (on) set.add(c); else set.delete(c); return on; }, contains(c) { return set.has(c); }, add(c) { set.add(c); }, remove(c) { set.delete(c); } } }; };
    const removed = [];
    if (stale) { const s = mk('dfmConstructionSection'); s.parentNode = { removeChild(c) { removed.push(c.id); } }; els.set('dfmConstructionSection', s); }
    const doc = { getElementById: (id) => { if (id === 'dfmConstructionSection' && !els.has(id)) return null; if (!els.has(id)) els.set(id, mk(id)); return els.get(id); } };
    const renders = { n: 0 };
    const win = { dfmConstructionRender: () => { renders.n++; return true; } };
    const D = lang === 'es' ? dictEs : dictEn;
    const t = (k) => (Object.prototype.hasOwnProperty.call(D, k) ? D[k] : k);
    const src = (mutate ? mutate(painterSrc) : painterSrc) + '\nreturn { paint: paintDrawerProductProof, gate: constructionSchematicAvailable };';
    const fn = new Function('document', 'window', 'currentLang', 'L', 'escapeHtml', 't', 'STORE_CONFIG', src);
    const Lx = (o) => (o && typeof o === 'object') ? (o[lang] || o.en || '') : (typeof o === 'string' ? o : '');
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const api = fn(doc, win, lang, Lx, esc, t, config);
    api.paint(JSON.parse(JSON.stringify(m)));
    return { get: (id) => els.get(id) || mk(id), renders, removed, gate: api.gate };
  }
  const count = (html, needle) => (html.split(needle).length - 1);
  const basisOf = (html, i) => { const cards = html.split('<div class="drawer-proof">').slice(1); const c = cards[i] || ''; const mm = c.match(/<div class="drawer-proof__basis">([\s\S]*?)<\/div>/); return mm ? mm[1] : null; };
  const role = (r) => '<span class="drawer-proof__basis-role">' + r + '</span> · ';

  // ---- Mayfair Plush (two proofs, both labels), English
  const g6 = findM('g6');
  const r6 = runPainter(g6);
  const try6 = r6.get('drawerTry');
  const proofs6 = r6.get('drawerProofs').innerHTML;
  ok('story: headline and narrative render from the canonical fields and the block shows',
    r6.get('drawerStory').hidden === false && r6.get('drawerStoryHeadline').textContent === g6.storyHeadline.en
    && r6.get('drawerStoryBody').textContent === g6.storyNarrative.en);
  ok('"Try this mattress" is the single post-story section: dictionary label, shown, paired, two cards, no standalone Try line and no trial-cue text anywhere in it',
    r6.get('drawerTryLabel').textContent === 'Try this mattress' && try6.hidden === false && try6.classList.contains('is-pair')
    && count(proofs6, '<div class="drawer-proof">') === 2 && !proofs6.includes('drawer-try-prompt') && !proofs6.includes(g6.trialCue.en)
    && !/drawer-try-prompt|drawerTryPrompts|drawerNoticeLabel|drawerProofGrid|drawerProofsLabel|drawerInside\b|drawerInsideBlock/.test(painterSrc));
  ok('each demonstration is a title, a physical cue and one aria-hidden glyph (the canonical proof strings, verbatim)',
    count(proofs6, 'class="drawer-proof__icon" aria-hidden="true"') === 2 && count(proofs6, '<svg ') === 2 && count(proofs6, 'aria-hidden="true"') === 4
    && proofs6.includes('<div class="drawer-proof__title">Hand-tufted cooling surface</div>')
    && proofs6.includes('<div class="drawer-proof__cue">Touch the Tencel cover and notice the smooth, cool first contact.</div>')
    && proofs6.includes('<div class="drawer-proof__title">Natural responsive comfort</div>'));
  ok('the Comfort basis attaches to proof 1 and the Support basis to proof 2, as "Role · label" from the canonical construction fields, escaped',
    basisOf(proofs6, 0) === role('Comfort') + g6.construction.comfort.en
    && basisOf(proofs6, 1) === role('Support') + g6.construction.support.en
    && count(proofs6, 'drawer-proof__basis"') === 2 && painterSrc.includes("escapeHtml(basis.role) + '</span> · ' + escapeHtml(basis.text)"));
  ok('no separate inside list, no "See what is inside" / "What to notice" label, no schematic call and no disclaimer for a catalog model',
    !proofs6.includes('drawer-inside') && !/See what is inside|What to notice|Mira qué hay dentro|Qué notar/.test(painterSrc)
    && r6.renders.n === 0 && !proofs6.includes('vary by model'));
  ok('glyphs follow the EN cue verb: Touch/Press -> touch mark; Reveal -> notice mark; Change -> move mark',
    count(proofs6, 'r="2.4"') === 2
    && runPainter(findM('g1')).get('drawerProofs').innerHTML.includes('c2-3.6 11-3.6 13 0')
    && runPainter(findM('s5')).get('drawerProofs').innerHTML.includes('M3 4.5l3.5 3.5L3 11.5'));

  // ---- Saint Pierre: the story names no support layer -> proof 2 carries no basis
  const r2 = runPainter(findM('g2'));
  const p2 = r2.get('drawerProofs').innerHTML;
  ok('a blank Support label leaves proof 2 without a basis - no placeholder, no empty wrapper, no synthesized layer',
    count(p2, '<div class="drawer-proof">') === 2 && count(p2, 'drawer-proof__basis"') === 1
    && basisOf(p2, 0) !== null && basisOf(p2, 0).startsWith(role('Comfort')) && basisOf(p2, 1) === null
    && !p2.includes('>Support<') && !p2.includes('drawer-proof__basis"></div>'));
  const supportOnly = JSON.parse(JSON.stringify(g6)); supportOnly.construction = { comfort: { en: '', es: '' }, support: g6.construction.support };
  const ps = runPainter(supportOnly).get('drawerProofs').innerHTML;
  ok('a blank Comfort label leaves proof 1 without a basis while proof 2 keeps its Support basis (bases never shift between demonstrations)',
    basisOf(ps, 0) === null && basisOf(ps, 1) === role('Support') + g6.construction.support.en);

  // ---- proof counts: one, zero, three (capped), a bare title
  const one = JSON.parse(JSON.stringify(g6)); one.proofs = one.proofs.slice(0, 1);
  const r1 = runPainter(one);
  const p1 = r1.get('drawerProofs').innerHTML;
  ok('one proof: one card with its Comfort basis, no Support basis anywhere, the section shown but not paired',
    count(p1, '<div class="drawer-proof">') === 1 && count(p1, 'drawer-proof__basis"') === 1 && !p1.includes('>Support<')
    && r1.get('drawerTry').hidden === false && !r1.get('drawerTry').classList.contains('is-pair'));
  const zero = JSON.parse(JSON.stringify(g6)); zero.proofs = [];
  const r0 = runPainter(zero);
  ok('zero proofs: the whole section collapses (hidden, empty card list, not paired) - no label stands over nothing and no basis is orphaned',
    r0.get('drawerTry').hidden === true && r0.get('drawerProofs').innerHTML === '' && !r0.get('drawerTry').classList.contains('is-pair'));
  const three = JSON.parse(JSON.stringify(g6)); three.proofs = three.proofs.concat([{ title: { en: 'Third', es: 'Tercero' }, cue: { en: 'Try it.', es: 'Pruébalo.' } }]);
  const bareTitle = JSON.parse(JSON.stringify(g6)); bareTitle.proofs[1].cue = { en: '', es: '' };
  ok('three proofs are capped at two; a title without its cue is dropped (and its basis with it)',
    count(runPainter(three).get('drawerProofs').innerHTML, '<div class="drawer-proof">') === 2
    && count(runPainter(bareTitle).get('drawerProofs').innerHTML, '<div class="drawer-proof">') === 1
    && count(runPainter(bareTitle).get('drawerProofs').innerHTML, 'drawer-proof__basis"') === 1);

  // ---- Spanish session: provisional strings, same glyphs (keyed to the EN cue)
  const r6es = runPainter(g6, { lang: 'es' });
  const pes = r6es.get('drawerProofs').innerHTML;
  ok('ES: the section label, the role terms, the story and the proofs render in Spanish (provisional); glyphs unchanged',
    r6es.get('drawerTryLabel').textContent === 'Prueba este colchón' && r6es.get('drawerStoryHeadline').textContent === g6.storyHeadline.es
    && pes.includes(g6.proofs[0].title.es) && pes.includes(g6.proofs[0].cue.es)
    && basisOf(pes, 0) === role('Confort') + g6.construction.comfort.es
    && basisOf(pes, 1) === role('Soporte') + g6.construction.support.es
    && count(pes, 'r="2.4"') === 2);
  ok('the three new dictionary strings exist in both languages, differ, and carry the ruled English',
    ['drawer.try_section', 'drawer.basis_comfort', 'drawer.basis_support'].every((k) => typeof dictEn[k] === 'string' && dictEn[k] && typeof dictEs[k] === 'string' && dictEs[k] && dictEn[k] !== dictEs[k])
    && dictEn['drawer.try_section'] === 'Try this mattress' && dictEn['drawer.basis_comfort'] === 'Comfort' && dictEn['drawer.basis_support'] === 'Support'
    && dictEs['drawer.try_section'] === 'Prueba este colchón');

  // ---- collapse: a model with no product-proof content, and labels without proofs
  const bare = { id: 'x1', name: 'Bare', features: ['hybrid'], tags: ['Cooling'] };
  const rb = runPainter(bare);
  ok('collapse: a model with no product-proof content hides the story and the Try section and renders nothing else - no engine prompt, no labels, no schematic',
    rb.get('drawerStory').hidden === true && rb.get('drawerStoryHeadline').textContent === '' && rb.get('drawerTry').hidden === true
    && rb.get('drawerProofs').innerHTML === '' && rb.renders.n === 0);
  const labelsOnly = { id: 'x2', name: 'Labels', construction: { comfort: { en: 'Cooling cover', es: 'Funda fresca' }, support: { en: 'Coils', es: 'Resortes' } } };
  const rl = runPainter(labelsOnly);
  ok('labels without proofs render nothing: a basis exists only on a demonstration (no free-standing Comfort / Support list, no schematic)',
    rl.get('drawerTry').hidden === true && rl.get('drawerProofs').innerHTML === '' && rl.renders.n === 0);

  // ---- the dormant schematic gate (executed)
  ok('gate: closed for every catalog model with no retailer enablement (26 / 26)',
    ALLM.every((m) => runPainter(m).gate(m) === false));
  const enabled = { constructionSchematic: true };
  ok('gate: retailer enablement alone opens nothing - the Comfort / Support labels are not diagram data (26 / 26 still closed)',
    ALLM.every((m) => runPainter(m, { config: enabled }).gate(m) === false));
  const diag = JSON.parse(JSON.stringify(g6)); diag.constructionDiagram = [{ role: 'comfort' }, { role: 'support' }];
  ok('gate: model-level diagram data alone opens nothing (no enablement)', runPainter(diag).gate(diag) === false);
  ok('gate: opens only with BOTH the enablement and non-empty model-level diagram data; an empty array stays closed',
    runPainter(diag, { config: enabled }).gate(diag) === true
    && (() => { const e = JSON.parse(JSON.stringify(diag)); e.constructionDiagram = []; return runPainter(e, { config: enabled }).gate(e) === false; })());
  ok('executed: with the gate closed the painter never calls the schematic renderer, and it removes a panel a previous render left behind',
    r6.renders.n === 0 && runPainter(g6, { stale: true }).removed.includes('dfmConstructionSection'));
  ok('executed: with the gate open the painter calls the renderer exactly once', runPainter(diag, { config: enabled }).renders.n === 1);
  ok('statics: the renderer call site sits inside the gate and is the only call; the dormant renderer targets #drawerTry as its sibling host',
    painterSrc.includes("      if (constructionSchematicAvailable(m)) {\n        if (window.dfmConstructionRender) window.dfmConstructionRender();\n      }")
    && (norm.match(/dfmConstructionRender\(\)/g) || []).length === 1
    && norm.includes("var host = document.getElementById('drawerTry');"));
  ok('statics: nothing in the store configuration or the catalog enables the schematic today (fail closed by absence)',
    !readFileSync(join(root, 'data', 'store-config.json'), 'utf8').includes('constructionSchematic')
    && ALLM.every((m) => !('constructionDiagram' in m)));
  ok('statics: the schematic strings (the layer control, the legend, the disclaimer) live only in the dormant renderer - never in the painter or the static drawer markup',
    !painterSrc.includes('Separate the layers') && !painterSrc.includes('vary by model') && !painterSrc.includes('dfm-cons')
    && !drawerHtml.includes('dfm-cons') && !drawerHtml.includes('Separate the layers') && !drawerHtml.includes('vary by model'));

  // ---- negative controls
  const tryBack = runPainter(g6, { mutate: (src) => mustReplace(src, "}).join('');\n      if (section) {", "}).join('');\n      document.getElementById('drawerProofs').innerHTML = '<div class=\"drawer-try-prompt\">' + escapeHtml(L(m.trialCue || '')) + '</div>' + document.getElementById('drawerProofs').innerHTML;\n      if (section) {") });
  ok('negative control: a painter that restores the standalone Try line is detected', tryBack.get('drawerProofs').innerHTML.includes(g6.trialCue.en));
  const noCollapse = runPainter(bare, { mutate: (src) => mustReplace(src, 'storyEl.hidden = !(storyHead || storyBody);', 'storyEl.hidden = false;') });
  ok('negative control: a painter that never collapses the story is detected', noCollapse.get('drawerStory').hidden === false);
  const noCollapseTry = runPainter(zero, { mutate: (src) => mustReplace(src, 'section.hidden = proofs.length === 0;', 'section.hidden = false;') });
  ok('negative control: a painter that leaves the Try section open over zero proofs is detected', noCollapseTry.get('drawerTry').hidden === false);
  const noCap = runPainter(three, { mutate: (src) => mustReplace(src, '.slice(0, 2);', '.slice(0, 3);') });
  ok('negative control: a painter that renders a third proof is detected', count(noCap.get('drawerProofs').innerHTML, '<div class="drawer-proof">') === 3);
  const synth = runPainter(findM('g2'), { mutate: (src) => mustReplace(src, "labels.support ? { role: t('drawer.basis_support'), text: labels.support } : null", "{ role: t('drawer.basis_support'), text: labels.support || 'Support core' }") });
  ok('negative control: a painter that synthesizes a Support basis is detected', basisOf(synth.get('drawerProofs').innerHTML, 1) !== null);
  const swapped = runPainter(g6, { mutate: (src) => mustReplace(src, 'var basis = bases[i];', 'var basis = bases[1 - i];') });
  ok('negative control: bases that swap demonstrations are detected', basisOf(swapped.get('drawerProofs').innerHTML, 0) !== role('Comfort') + g6.construction.comfort.en);
  const invented = runPainter(supportOnly, { mutate: (src) => mustReplace(src, 'return { comfort: L(c.comfort), support: L(c.support) };', "return { comfort: L(c.comfort) || (m.features || []).join(' '), support: L(c.support) };") });
  ok('negative control: a painter that invents a basis from quiz features is detected', basisOf(invented.get('drawerProofs').innerHTML, 0) !== null);
  const openGate = runPainter(g6, { mutate: (src) => mustReplace(src, 'return enabled && diagram;', 'return true;') });
  ok('negative control: a gate that opens by default is detected', openGate.renders.n === 1);
  const unguarded = runPainter(g6, { mutate: (src) => mustReplace(src, 'if (constructionSchematicAvailable(m)) {', 'if (true) {') });
  ok('negative control: an unguarded renderer call is detected', unguarded.renders.n === 1);

  // ---- markup order and boundaries (statics)
  ok('drawer order: identity, story, "Try this mattress", pillow prompt, financing, promotion, then the sticky action footer (actions, notice, live region) as the last element',
    at('id="drawerFeelAnchor"') < at('id="drawerStory"') && at('id="drawerStory"') < at('id="drawerTry"')
    && at('id="drawerTry"') < at('id="drawerTryLabel"') && at('id="drawerTryLabel"') < at('id="drawerProofs"')
    && at('id="drawerProofs"') < at('id="drawerSystemPrompt"') && at('id="drawerSystemPrompt"') < at('id="drawerFinancing"')
    && at('id="drawerFinancing"') < at('id="drawerPromotion"') && at('id="drawerPromotion"') < at('id="drawerActionFooter"')
    && at('id="drawerActionFooter"') < at('id="drawerCtaRow"') && at('id="drawerCtaRow"') < at('id="drawerFinalistNote"')
    && at('id="drawerFinalistNote"') < at('id="drawerFinalistLive"'));
  ok('the retired drawer elements are gone from the markup and the live source (no standalone Try, no proof grid, no inside list, no stranded label)',
    ['drawerNoticeLabel', 'drawerTryPrompts', 'drawerProofGrid', 'drawerProofBlock', 'drawerProofsLabel', 'drawerInsideBlock', 'drawerInside', 'drawerInsideLabel', 'drawerInsideLabels']
      .every((id) => !norm.includes('id="' + id + '"') && !norm.includes("'" + id + "'"))
    && !liveHtml.includes('drawer-try-prompt') && !liveHtml.includes('drawer-inside') && !liveHtml.includes('drawer-proof-grid') && !liveHtml.includes('drawer-proof-block'));
  ok('the drawer carries no Key features cards, no comparison entry and no versus language',
    !drawerHtml.includes('drawerDifferentiators') && !/openCompare|compare-btn|versus|\bvs\b/i.test(drawerHtml)
    && !painterSrc.includes('versus'));
  ok('every drawer control in the product-proof flow meets the 44px touch floor (finalist 52, Undo 44, pillow-prompt buttons 44; the dormant toggle keeps 44)',
    /\.drawer-finalist-btn \{[^}]*min-height: 52px;/.test(norm) && /\.drawer-undo-btn \{[^}]*min-height: 44px;/.test(norm)
    && /\.dfm-cons-btn \{[^}]*min-height: 44px;/.test(norm)
    && /\.drawer-system-prompt__actions button \{[^}]*min-height: 44px;/.test(norm));
  ok('the story and the Try section start collapsed in the static markup, with an empty label and an empty card list',
    drawerHtml.includes('<div class="drawer-story" id="drawerStory" hidden>')
    && drawerHtml.includes('<div class="drawer-try" id="drawerTry" hidden>\n            <div class="drawer-section-label" id="drawerTryLabel"></div>\n            <div class="drawer-proofs" id="drawerProofs"></div>\n          </div>'));
  ok('the wipe owns the regions (content, text and collapsed rest state) and no longer names retired ids',
    /var SESSION_CONTENT_IDS = \[[\s\S]*?'drawerProofs', 'dfmConstructionSection',[\s\S]*?\];/.test(norm)
    && !/var SESSION_CONTENT_IDS = \[[\s\S]*?'drawer(Inside|TryPrompts)'[\s\S]*?\];/.test(norm)
    && /'drawerStoryHeadline', 'drawerStoryBody',/.test(norm)
    && norm.includes("{ id: 'drawerStory', hiddenAttr: true }") && norm.includes("{ id: 'drawerTry', hiddenAttr: true, remove: ['is-pair'] }")
    && !norm.includes("{ id: 'drawerProofGrid'") && !norm.includes("{ id: 'drawerProofBlock'") && !norm.includes("{ id: 'drawerInsideBlock'"));
  ok('CSS: a pair of demonstrations sits side by side on tablets and stacks on phones (inside the existing 560px block, no new breakpoint); hidden blocks do not paint; the retired rules are gone',
    norm.includes('.drawer-try.is-pair .drawer-proofs { grid-template-columns: repeat(2, minmax(0, 1fr)); }')
    && /@media \(max-width: 560px\) \{[\s\S]*?\.drawer-try\.is-pair \.drawer-proofs \{ grid-template-columns: 1fr; \}[\s\S]*?\n    \}/.test(norm)
    && norm.includes('.drawer-try[hidden],\n    .drawer-story[hidden] { display: none; }')
    && !/\.drawer-proof-grid|\.drawer-inside|\.drawer-try-prompt/.test(norm));
  ok('CSS: the basis line is quiet (muted 12px) under a small-caps brass role; the light drawer restates the basis inks; forced colors keep the CanvasText boundary on the cards',
    /\.drawer-proof__basis \{\s*margin-top: 7px;\s*color: var\(--cream-dim\);\s*font: 500 12px\/1\.4 var\(--font-sans\);/.test(norm)
    && /\.drawer-proof__basis-role \{\s*color: var\(--gold\);[\s\S]{0,160}?text-transform: uppercase;/.test(norm)
    && /body:has\(#resultsScreen\.active\) \.drawer-story__headline,/.test(norm) && /body:has\(#resultsScreen\.active\) \.drawer-proof__cue,/.test(norm)
    && /body:has\(#resultsScreen\.active\) \.drawer-proof__basis,/.test(norm)
    && norm.includes('body:has(#resultsScreen.active) .drawer-proof__basis-role { color: var(--accent-ink); }')
    && /body:has\(#resultsScreen\.active\) \.drawer-proof \{\s*border-color: #D8CCBD;/.test(norm)
    && /@media \(forced-colors: active\) \{\s*\.drawer-proof \{ border: 1px solid CanvasText; \}\s*\.drawer-proof__icon \{ border: 1px solid CanvasText; color: CanvasText; \}\s*\}/.test(norm));
}

section('Docked product-action footer — a sibling below the scroll viewport inside the detail column; never over content; compact expanded state');
{
  const dStart = norm.indexOf('id="mattressDrawer"');
  const dStop = norm.indexOf('<!-- SCREEN: Saved Picks');
  const drawerHtml = norm.slice(dStart, dStop);
  const at = (s) => drawerHtml.indexOf(s);
  function segmentOf(html, marker) {
    const open = html.indexOf(marker);
    if (open === -1) return null;
    const start = html.lastIndexOf('<', open);
    const re = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*?(\/?)>/g;
    re.lastIndex = start;
    let depth = 0, m;
    while ((m = re.exec(html))) {
      const closing = m[1] === '/', selfClosing = m[3] === '/' || /^(br|hr|img|input|meta|link)$/i.test(m[2]);
      if (m[0].startsWith('<!--')) continue;
      if (selfClosing) continue;
      depth += closing ? -1 : 1;
      if (depth === 0) return html.slice(start, m.index + m[0].length);
    }
    return null;
  }
  const workspace = segmentOf(drawerHtml, 'class="drawer-workspace"') || '';
  const detail = segmentOf(drawerHtml, 'id="drawerDetail"') || '';
  const scrollCol = segmentOf(drawerHtml, 'id="drawerScroll"') || '';
  const footer = segmentOf(drawerHtml, 'id="drawerActionFooter"') || '';
  const hero = segmentOf(drawerHtml, 'id="drawerHeroImg"') || '';
  ok('the workspace holds the photo column and ONE detail column; the detail column holds the scroll viewport and then the footer as SIBLINGS (the footer is not inside the scroll viewport, and not in the photo column)',
    !!workspace && !!detail && !!scrollCol && !!footer && !!hero
    && workspace.includes(detail) && workspace.includes(hero) && !hero.includes('drawerActionFooter')
    && detail.includes(scrollCol) && detail.includes(footer) && !scrollCol.includes('drawerActionFooter')
    && detail.indexOf('id="drawerScroll"') < detail.indexOf('id="drawerActionFooter"')
    && workspace.indexOf('id="drawerHeroImg"') < workspace.indexOf('id="drawerDetail"'));
  ok('the footer is the LAST element of the detail column (nothing but whitespace or comments between the scroll viewport, the footer and the column\'s close)',
    !!detail && /^\s*(?:<!--[\s\S]*?-->\s*)*$/.test(detail.slice(detail.indexOf(scrollCol) + scrollCol.length, detail.indexOf(footer)))
    && /^\s*(?:<!--[\s\S]*?-->\s*)*<\/div>\s*$/.test(detail.slice(detail.indexOf(footer) + footer.length)));
  ok('the scroll viewport keeps the whole content order: identity, Feel, story, "Try this mattress", pillow prompt, financing, promotion - and nothing else',
    at('id="drawerName"') < at('id="drawerFeelAnchor"') && at('id="drawerFeelAnchor"') < at('id="drawerStory"') && at('id="drawerStory"') < at('id="drawerTry"')
    && at('id="drawerTry"') < at('id="drawerSystemPrompt"') && at('id="drawerSystemPrompt"') < at('id="drawerFinancing"') && at('id="drawerFinancing"') < at('id="drawerPromotion"')
    && at('id="drawerPromotion"') < at('id="drawerActionFooter"')
    && ['drawerName', 'drawerFeelAnchor', 'drawerStory', 'drawerTry', 'drawerSystemPrompt', 'drawerFinancing', 'drawerPromotion'].every((id) => scrollCol.includes('id="' + id + '"'))
    && ['drawerCtaRow', 'drawerFinalistBtn', 'drawerInterestedBtn', 'drawerFinalistNote', 'drawerFinalistUndoBtn', 'drawerFinalistLive'].every((id) => !scrollCol.includes('id="' + id + '"')));
  const FOOTER_IDS = ['drawerCtaRow', 'drawerFinalistBtn', 'drawerInterestedBtn', 'drawerFinalistNote', 'drawerFinalistNoteText', 'drawerFinalistUndoBtn', 'drawerFinalistLive'];
  ok('the footer holds both actions, the replacement notice, Undo and the finalist live region - in that order, the live region last, the prompt / financing / promotion never inside',
    FOOTER_IDS.every((id) => footer.includes('id="' + id + '"'))
    && FOOTER_IDS.map((id) => footer.indexOf('id="' + id + '"')).every((v, i, a) => i === 0 || v > a[i - 1])
    && footer.lastIndexOf('<div') === footer.lastIndexOf('<div class="sr-only" id="drawerFinalistLive"')
    && ['drawerSystemPrompt', 'drawerFinancing', 'drawerPromotion', 'drawerTry', 'drawerStory'].every((id) => !footer.includes(id)));
  ok('the two action buttons keep their verbatim markup and the notice / live region their pinned shapes',
    footer.includes('<button id="drawerFinalistBtn" class="finalist-btn drawer-finalist-btn" data-id="" aria-pressed="false"></button>')
    && footer.includes('<button id="drawerInterestedBtn" class="drawer-btn drawer-btn-secondary" aria-pressed="false" onclick="window.saveDrawerPick()" ontouchend="event.preventDefault();window.saveDrawerPick();">Save for later</button>')
    && footer.includes('<div class="drawer-finalist-note" id="drawerFinalistNote" hidden>')
    && footer.includes('<div class="sr-only" id="drawerFinalistLive" role="status" aria-live="polite" aria-atomic="true"></div>'));
  const promptSrc = extractFunction('function showFinalistSleepSystemPrompt()') || '';
  const dismissSrc = extractFunction('window.dismissFinalistSleepSystemPrompt = function()') || '';
  ok('the pillow prompt keeps its trigger, guard, dismissal and announcement, and never relocates itself into the footer',
    promptSrc.includes('if (window._finalistAccessoryPromptShown) return;') && promptSrc.includes("prompt.classList.add('is-visible');")
    && dismissSrc.includes("prompt.classList.remove('is-visible');")
    && !/drawerActionFooter|appendChild|insertAdjacentElement|insertBefore|scrollIntoView/.test(promptSrc)
    && /<div class="drawer-system-prompt" id="drawerSystemPrompt" aria-live="polite">/.test(drawerHtml));
  // ---- CSS: the detail column, the scroll viewport, the docked footer
  const detailRule = (norm.match(/\n    \.drawer-detail \{([^}]*)\}/) || [])[1] || '';
  const scrollRule = (norm.match(/\n    \.drawer-scroll \{([^}]*)\}/) || [])[1] || '';
  const footerRule = (norm.match(/\n    \.drawer-action-footer \{([^}]*)\}/) || [])[1] || '';
  ok('CSS: the detail column is a vertical flex container with min-height: 0 that owns the horizontal padding variable; the scroll viewport is flex: 1 / min-height: 0 / overflow-y: auto with its own bottom padding; the footer is a flex-shrink: 0 sibling',
    /display:\s*flex;/.test(detailRule) && /flex-direction:\s*column;/.test(detailRule) && /min-height:\s*0;/.test(detailRule) && /--drawer-pad-x:\s*22px;/.test(detailRule)
    && /overflow-y:\s*auto;/.test(scrollRule) && /flex:\s*1;/.test(scrollRule) && /min-height:\s*0;/.test(scrollRule) && /padding:\s*20px var\(--drawer-pad-x\) 20px;/.test(scrollRule)
    && /flex-shrink:\s*0;/.test(footerRule));
  ok('CSS: no overlay compensation survives - the footer has no position, no auto or negative margins; the scroll viewport has no scroll-padding, no flex-column workaround and no spacer padding; no spacer rule exists',
    !/position:/.test(footerRule) && !/margin/.test(footerRule)
    && !/scroll-padding/.test(scrollRule) && !/display:\s*flex/.test(scrollRule)
    && !/\.drawer-scroll > :not\(\.drawer-action-footer\)/.test(norm) && !/drawer-scroll-spacer|drawer-footer-spacer/.test(norm)
    && (() => { const m = scrollRule.match(/padding:\s*\d+px var\(--drawer-pad-x\) (\d+)px/); return !!m && Number(m[1]) <= 24; })());
  ok('CSS: the scroll viewport is the only vertical scroller in the column (the detail column and the footer declare no overflow)',
    !/overflow/.test(detailRule) && !/overflow/.test(footerRule) && /overflow-y:\s*auto;/.test(scrollRule));
  ok('CSS: the footer keeps its surface (solid lower ground, one divider, soft lift, safe-area padding through the shared variable), no radius',
    /padding:\s*10px var\(--drawer-pad-x\) calc\(12px \+ env\(safe-area-inset-bottom, 0px\)\);/.test(footerRule)
    && /background:\s*#0d1f3c;/.test(footerRule) && /border-top:\s*1px solid rgba\(255,255,255,0\.14\);/.test(footerRule)
    && /box-shadow:\s*0 -10px 24px rgba\(0,0,0,0\.28\);/.test(footerRule) && !/border-radius/.test(footerRule));
  ok('CSS: the portrait and phone blocks keep the photo above the detail column and the same scroll / footer relationship (the column flexes, the variable narrows, the top padding tightens)',
    /@media \(max-width: 760px\), \(orientation: portrait\) \{[\s\S]*?\.drawer-workspace \{\s*display: flex;\s*flex-direction: column;\s*min-height: 0;\s*\}[\s\S]*?\.drawer-detail \{ flex:1; min-height:0; --drawer-pad-x: 18px; \}[\s\S]*?\.drawer-scroll \{ padding-top:16px; \}/.test(norm)
    && /@media \(max-width: 560px\) \{[\s\S]*?\.drawer-detail \{ --drawer-pad-x: 16px; \}[\s\S]*?\.drawer-scroll \{ padding-top:14px; \}/.test(norm));
  ok('CSS: the expanded replacement state is one compact row where width permits - the text flexes beside Undo, wraps cleanly (min-width 0, overflow-wrap) and is never truncated; Undo keeps its 44px floor and does not stretch',
    /\.drawer-finalist-note \{\s*display: flex;\s*flex-wrap: wrap;\s*align-items: center;\s*gap: 6px 12px;\s*margin: 8px 0 0;/.test(norm)
    && norm.includes('.drawer-finalist-note > span { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; }')
    && /\.drawer-undo-btn \{\s*min-height: 44px;\s*flex: 0 0 auto;/.test(norm)
    && !/\.drawer-finalist-note[^}]*text-overflow/.test(norm) && !/\.drawer-finalist-note[^}]*white-space:\s*nowrap/.test(norm)
    && /\.drawer-finalist-btn \{[^}]*min-height: 52px;/.test(norm) && /\.drawer-btn \{[^}]*min-height:52px;/.test(norm));
  ok('CSS: the light drawer restates the footer surface; forced colors keep a CanvasText divider',
    /body:has\(#resultsScreen\.active\) \.drawer-action-footer \{\s*background: #FFFDF8;\s*border-top-color: #D1C5B6;/.test(norm)
    && /@media \(forced-colors: active\) \{\s*\.drawer-action-footer \{ border-top: 1px solid CanvasText; \}\s*\}/.test(norm));
  ok('the open and nav paths still reset the scroll viewport (not the column), and the wipe still resets the relocated controls and notice',
    /document\.getElementById\('drawerScroll'\)\.scrollTop = 0;/.test(norm)
    && /\{ id: 'drawerFinalistBtn', remove: \['chosen'\], attrs: \{ 'aria-pressed': 'false', 'data-id': '' \} \},/.test(norm)
    && /\{ id: 'drawerFinalistNote', hiddenAttr: true \},\s*\n\s*\{ id: 'drawerFinalistUndoBtn', hiddenAttr: true \},/.test(norm)
    && /'drawerFinalistNoteText', 'drawerFinalistLive',/.test(norm));
  // ---- negative controls on the structure logic
  const backInside = drawerHtml.replace('        </div>\n        <!-- Docked product-action footer', '        <!-- Docked product-action footer'); // drop the viewport's own close: the footer falls inside it
  const insideSeg = segmentOf(backInside, 'id="drawerScroll"') || '';
  ok('negative control: a footer that falls back inside the scroll viewport is detected', insideSeg.includes('drawerActionFooter'));
  const split = drawerHtml.replace('          </div>\n          <div class="drawer-finalist-note" id="drawerFinalistNote" hidden>', '          </div>\n        </div>\n        <div class="drawer-finalist-orphan">\n          <div class="drawer-finalist-note" id="drawerFinalistNote" hidden>');
  ok('negative control: a notice split out of the footer is detected', split !== drawerHtml && !(segmentOf(split, 'id="drawerActionFooter"') || '').includes('drawerFinalistNote'));
  ok('negative control: an overlay footer (position: absolute / sticky) or a spacer would be detected by the rule pins', !/position:/.test(footerRule) && !/scroll-padding/.test(scrollRule));
}

section('Drawer title focus — programmatic focus on every open; the branded ring for keyboard entry only (input-modality attribute); forced colors; no unconditional suppression');
{
  const openSrc = extractFunction('window.openMattressDrawer = function(mattressId, orderList, opts)') || '';
  const closeSrc = extractFunction('window.closeMattressDrawer = function(opts)') || '';
  const keySrc = extractFunction('function drawerKeydown(e)') || '';
  const wipeSrc = extractFunction('function resetSessionState(opts)') || '';
  const ruleM = norm.match(/\n    \.drawer-mattress-name:focus-visible \{([^}]*)\}/);
  const body = ruleM ? ruleM[1] : '';
  const condM = norm.match(/\n    \.mattress-drawer\[data-focus-entry="pointer"\] \.drawer-mattress-name:focus-visible \{([^}]*)\}/);
  const cond = condM ? condM[1] : '';
  const fcM = norm.match(/@media \(forced-colors: active\) \{\s*\.drawer-mattress-name:focus-visible \{([^}]*)\}\s*\}/);
  const fc = fcM ? fcM[1] : '';
  ok('focus entry is unchanged: the title stays focusable (tabindex -1, attribute order pinned by smoke) and openMattressDrawer moves focus to it',
    norm.includes('<div class="drawer-mattress-name" id="drawerName" tabindex="-1"></div>')
    && openSrc.includes("var title = document.getElementById('drawerName');\n      if (title && typeof title.focus === 'function') title.focus();"));
  ok('the keyboard ring rule (unconditional selector) keeps the shared two-ring tokens at the ruled 5px offset, hugging the text, left-aligned, tokens only, and never outline: none',
    !!ruleM && /outline:\s*3px solid var\(--focus-ring-outer\);/.test(body) && /outline-offset:\s*5px;/.test(body)
    && /box-shadow:\s*0 0 0 8px var\(--focus-ring-inner\);/.test(body) && /width:\s*fit-content;/.test(body) && /max-width:\s*100%;/.test(body)
    && !/margin-inline:\s*auto/.test(body) && !/#[0-9A-Fa-f]{3,6}\b/.test(body) && !/outline:\s*none/.test(body));
  ok('the ONLY suppression is the conditional pointer-entry rule (data-focus-entry="pointer" on the drawer), placed after the keyboard rule and before the forced-colors counterpart',
    !!condM && /outline:\s*none;/.test(cond) && /box-shadow:\s*none;/.test(cond)
    && norm.indexOf(ruleM ? ruleM[0] : 'x') < norm.indexOf(condM ? condM[0] : 'y') && norm.indexOf(condM ? condM[0] : 'y') < norm.indexOf(fcM ? fcM[0] : 'z')
    && !/\.mattress-drawer \.drawer-mattress-name:focus-visible/.test(norm) && !/\.drawer-mattress-name:focus(?!-visible)[\s,{]/.test(norm)
    && (norm.match(/drawer-mattress-name:focus-visible \{/g) || []).length === 3);
  ok('the forced-colors counterpart keeps a CanvasText ring with no halo for keyboard entry, after the anchored first forced-colors block and after the heading block',
    !!fcM && /outline-color:\s*CanvasText;/.test(fc) && /box-shadow:\s*none;/.test(fc) && !/outline:\s*none/.test(fc)
    && norm.indexOf(fcM[0]) > norm.indexOf('.fin-btn:focus-visible')
    && norm.indexOf(fcM[0]) > norm.indexOf('.hf2-review-title:focus-visible {\n        outline-color: CanvasText;'));
  // ---- the tracker (fenced, executed)
  const tStart = norm.indexOf('    // ---- Drawer focus-entry modality (owner ruling 2026-09-02, corrective pass)');
  const tStop = norm.indexOf('    // ---- end focus-entry modality');
  const trackerSrc = tStart !== -1 && tStop !== -1 ? norm.slice(tStart, tStop) : '';
  ok('the tracker is fenced and drawer-scoped: capture-phase listeners for keydown, pointerdown, mousedown and touchstart on the document, one resolver, no other modality system in the file',
    trackerSrc.includes("document.addEventListener('keydown', function() { window._drawerInputModality = 'keyboard'; }, true);")
    && trackerSrc.includes("document.addEventListener('pointerdown', function() { window._drawerInputModality = 'pointer'; }, true);")
    && trackerSrc.includes("document.addEventListener('mousedown', function() { window._drawerInputModality = 'pointer'; }, true);")
    && trackerSrc.includes("document.addEventListener('touchstart', function() { window._drawerInputModality = 'pointer'; }, { capture: true, passive: true });")
    && trackerSrc.includes('function drawerFocusEntryModality()') && trackerSrc.includes('window.drawerFocusEntryModality = drawerFocusEntryModality;')
    && (norm.match(/_drawerInputModality/g) || []).length === 7);
  function runTracker(mutate) {
    const listeners = [];
    const doc = { addEventListener: (type, fn, opts) => listeners.push({ type, fn, opts }) };
    const win = {};
    const src = (mutate ? mutate(trackerSrc) : trackerSrc) + '\nreturn drawerFocusEntryModality;';
    const resolve = new Function('window', 'document', src)(win, doc);
    const fire = (type) => listeners.filter((l) => l.type === type).forEach((l) => l.fn({ type }));
    return { resolve, fire, listeners, win };
  }
  const tr = runTracker();
  ok('executed: every listener is capture-phase (it must see the input before any handler opens the drawer); unknown input fails visible (keyboard)',
    tr.listeners.length === 4 && tr.listeners.every((l) => l.opts === true || (l.opts && l.opts.capture === true)) && tr.resolve() === 'keyboard');
  const seq = [];
  tr.fire('pointerdown'); seq.push(tr.resolve());
  tr.fire('keydown'); seq.push(tr.resolve());
  tr.fire('pointerdown'); seq.push(tr.resolve());
  tr.fire('touchstart'); seq.push(tr.resolve());
  tr.fire('keydown'); seq.push(tr.resolve());
  tr.fire('mousedown'); seq.push(tr.resolve());
  tr.fire('keydown'); seq.push(tr.resolve());
  ok('executed: pointer -> keyboard -> pointer -> touch -> keyboard -> mouse -> keyboard resolves correctly at every step (no leak in either direction; Enter / Space are keydowns)',
    seq.join(',') === 'pointer,keyboard,pointer,pointer,keyboard,pointer,keyboard');
  // ---- the open / close / keydown / wipe contract (statics on the real sources)
  const setLine = "      drawer.setAttribute('data-focus-entry', typeof drawerFocusEntryModality === 'function' ? drawerFocusEntryModality() : 'keyboard');";
  ok('openMattressDrawer recomputes the entry attribute unconditionally on EVERY open - after the drawer opens, before the lifecycle block moves focus to the title',
    openSrc.includes(setLine) && (openSrc.match(/data-focus-entry/g) || []).length === 1
    && openSrc.indexOf(setLine) > openSrc.indexOf("drawer.classList.add('drawer-open');")
    && openSrc.indexOf(setLine) < openSrc.indexOf('// ---- dialog lifecycle') && openSrc.indexOf(setLine) < openSrc.indexOf('title.focus();')
    && !/if \(.*\)\s*drawer\.setAttribute\('data-focus-entry'/.test(openSrc));
  ok('closeMattressDrawer clears the attribute (an opening never inherits the previous one); the wipe closes the drawer, resets the tracker and declares the attribute in SESSION_LAYERS',
    closeSrc.includes("      drawer.removeAttribute('data-focus-entry');")
    && wipeSrc.includes('window._drawerInputModality = null;')
    && norm.includes("{ id: 'mattressDrawer', attrs: { 'data-focus-entry': '' } },"));
  ok('any key pressed inside the open drawer flips the entry to keyboard before the Escape / Tab handling, so normal visible keyboard focus follows',
    /^\s*function drawerKeydown\(e\) \{\s*\n\s*\/\/[^\n]*\n\s*\/\/[^\n]*\n\s*var drawer = document\.getElementById\('mattressDrawer'\);\s*\n\s*if \(drawer\) drawer\.setAttribute\('data-focus-entry', 'keyboard'\);/.test(keySrc)
    && keySrc.indexOf("'keyboard'") < keySrc.indexOf("e.key === 'Escape'"));
  ok('the name keeps the ring\'s reach clear of the brand line above it: a 10px top margin, the brand rule unchanged',
    /\.drawer-mattress-name \{ font:800 clamp\(24px,3vw,34px\)\/1\.08 var\(--font-serif\); color:var\(--cream\); margin:10px 0 6px; \}/.test(norm)
    && /\.drawer-mattress-brand \{ font:700 12px\/1\.2 var\(--font-sans\); text-transform:uppercase; letter-spacing:1\.4px; color:var\(--gold\); \}/.test(norm));
  ok('the pinned control and heading focus lists are untouched (the title has its own rules, placed after the heading block)',
    /\.drawer-nav-btn:focus-visible,\n\s*\.drawer-finalist-btn:focus-visible,\n\s*\.drawer-undo-btn:focus-visible,\n\s*\.drawer-btn:focus-visible \{/.test(norm)
    && /\.noct-results-headline:focus-visible,\s*\.noct-email-headline:focus-visible,\s*\.sleep-system__title:focus-visible,\s*\.hf2-review-title:focus-visible\s*\{/.test(norm)
    && !/\.hf2-review-title:focus-visible,\s*\.drawer-mattress-name/.test(norm)
    && (ruleM ? norm.indexOf(ruleM[0]) > norm.indexOf('#sleepPlanScreen .hf2-review-title:focus-visible') : false));
  // ---- negative controls
  const blind = runTracker((src) => mustReplace(src, "document.addEventListener('keydown', function() { window._drawerInputModality = 'keyboard'; }, true);", ''));
  blind.fire('pointerdown'); blind.fire('keydown');
  ok('negative control: a tracker that stops seeing the keyboard leaks a pointer entry into a keyboard opening - detected', blind.resolve() !== 'keyboard');
  ok('negative control: a guarded (inherited) entry attribute is detected by the recompute pin',
    /if \(.*\)\s*drawer\.setAttribute\('data-focus-entry'/.test(mustReplace(openSrc, setLine, "      if (!drawer.hasAttribute('data-focus-entry')) " + setLine.trim())));
  ok('negative control: an unconditional suppression (selector without the pointer attribute) is detected',
    /\.mattress-drawer \.drawer-mattress-name:focus-visible/.test(mustReplace(norm, '.mattress-drawer[data-focus-entry="pointer"] .drawer-mattress-name:focus-visible {', '.mattress-drawer .drawer-mattress-name:focus-visible {')));
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
