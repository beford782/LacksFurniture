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

// ======================================================== 5. Drawer (A3.1 c2)
section('Trial drawer — three numbered steps, one prompt, hero frame, retired duplicates');
{
  const openSrc = extractFunction('window.openMattressDrawer = function(mattressId, orderList, opts)');
  const stepsSrc = extractFunction('function paintDrawerSteps(mattressId)');
  const gateSrc = extractFunction('window.paintDrawerFinalist = function(mattressId)');
  const repaintSrc = extractFunction('window._repaintFinalistControls = function()');
  ok('drawer sources extracted', !!openSrc && !!stepsSrc && !!gateSrc && !!repaintSrc);
  const iTry = norm.indexOf('id="drawerNoticeLabel" data-step="1"');
  const iAsk = norm.indexOf('id="drawerReactionLabel" data-step="2"');
  const iChoose = norm.indexOf('id="drawerFinalistLabel" data-step="3"');
  const iCta = norm.indexOf('id="drawerCtaRow"');
  ok('the three step labels are numbered 1-2-3 in source order and precede the finalist control',
    iTry > -1 && iAsk > iTry && iChoose > iAsk && iCta > iChoose
    && /class="drawer-section-label drawer-step" id="drawerNoticeLabel" data-step="1">Try</.test(norm)
    && /class="drawer-section-label drawer-step" id="drawerFinalistLabel" data-step="3">Choose a finalist</.test(norm));
  // Synthesis (owner counterprompt 2026-09-02, change 1): the whole workflow -
  // Try, Ask, Choose, the finalist control and its follow-up prompt - precedes
  // the Key features label, so the construction demonstration (inserted after
  // #drawerDifferentiators) can never sit above the first trial action; the
  // identity header and the feel line still come first.
  const iKeyFeatures = norm.indexOf('id="drawerDifferentiatorsLabel"');
  const iPrompt = norm.indexOf('id="drawerSystemPrompt"');
  const iFeel = norm.indexOf('id="drawerFeelAnchor"');
  ok('synthesis: the Try/Ask/Choose workflow (through the finalist control and its follow-up prompt) precedes Key features and the construction host; the identity header precedes the workflow',
    iKeyFeatures > -1 && iFeel > -1 && iFeel < iTry && iPrompt > iCta && iPrompt < iKeyFeatures,
    JSON.stringify({ iFeel, iTry, iCta, iPrompt, iKeyFeatures }));
  ok('the renderer writes the step labels in both languages (question kept explicit; no "record" narration)',
    openSrc.includes("currentLang === 'es' ? 'Probar' : 'Try'")
    && openSrc.includes("? 'Pregunta: “¿Cómo se sintió este colchón?”'") && openSrc.includes(": 'Ask: “How did this mattress feel?”'")
    && openSrc.includes("currentLang === 'es' ? 'Elegir finalista' : 'Choose a finalist'")
    && !openSrc.includes('Record the customer') && !openSrc.includes('During the trial'));
  ok('exactly one spoken trial prompt renders (the engine still produces two; the render takes the model-specific first line)',
    openSrc.includes('getMattressTrialPrompts(m).slice(0, 1).map(')
    && /return prompts\.slice\(0, 2\);/.test(norm));
  ok('the finalist hint is the ruled short line in both dictionaries',
    dictEn['drawer.finalist_hint'] === 'Record a reaction before choosing a finalist.'
    && dictEs['drawer.finalist_hint'] === 'Registra una reacción antes de elegir un finalista.');
  ok('the drawer name carries no price-tier glyph and the duplicate sub line is retired (hidden, empty)',
    openSrc.includes("document.getElementById('drawerName').textContent = m.name;")
    && openSrc.includes("drawerSubEl.textContent = ''; drawerSubEl.hidden = true;")
    && !openSrc.includes('priceTierSymbol('));
  ok('priceTierSymbol keeps its Compare consumer',
    (norm.match(/priceTierSymbol\(/g) || []).length >= 2);
  ok('the drawer hero is the one drawer image: mat frame (contain), reserved, decorative; the hidden thumb fetches nothing',
    openSrc.includes(`heroEl.innerHTML = '<img src="' + escapeHtml(imgSrc) + '" width="1500" height="1000" alt="">';`)
    && openSrc.includes("imgEl.innerHTML = '';")
    && /\.drawer-hero img \{ width:100%; height:100%; object-fit:contain; display:block; \}/.test(norm)
    && /\.drawer-hero \{[^}]*aspect-ratio: 3 \/ 2;/.test(norm));
  ok('the differentiators label is a label, in the Compare row\'s vocabulary (EN + ES + static)',
    openSrc.includes("? 'Características clave'") && openSrc.includes(": 'Key features'")
    && /id="drawerDifferentiatorsLabel">Key features</.test(norm) && !liveHtml.includes('What makes this one different'));
  ok('the drawer Back control reuses the Plan/Summary dictionary pair (one string, three consumers)',
    /data-i18n="plan\.back_to_matches">← Back to matches<\/button>/.test(norm) && dictEn['plan.back_to_matches'] === '← Back to matches');
  ok('the construction chip keeps the honesty statement and drops the customer-directed clause (EN + ES)',
    /\? 'Los materiales y la construcción exactos varían según el modelo\.'\n        : 'Exact materials and construction vary by model\.';/.test(norm)
    && !liveHtml.includes('Ask your specialist about the model'));
  ok('the step rings are painted from the gate (paintDrawerFinalist) and from every finalist repaint',
    gateSrc.includes('paintDrawerSteps(mattressId);') && repaintSrc.includes('paintDrawerSteps(window._currentDrawerMattressId);'));
  ok('the step rings join the wipe (persistent nodes, state classes stripped)',
    /\{ id: 'drawerNoticeLabel', remove: \['is-done', 'is-current'\] \},\s*\{ id: 'drawerReactionLabel', remove: \['is-done', 'is-current'\] \},\s*\{ id: 'drawerFinalistLabel', remove: \['is-done', 'is-current'\] \},/.test(norm));
  ok('the ring is a border + glyph (never colour alone): numeral by attribute, check when done, heavier ring when current',
    /\.drawer-step::before \{[^}]*content: attr\(data-step\);[^}]*border:1\.5px solid currentColor;/.test(norm)
    && /\.drawer-step\.is-done::before \{ content:'\\2713'; \}/.test(norm)
    && /\.drawer-step\.is-current::before \{ border-width:2\.5px; \}/.test(norm));

  // EXECUTED: the step painter across the three gate states + a control.
  function runSteps({ reactions = {}, fav = '', id = 'g5', mutate = null } = {}) {
    const els = new Map();
    const el = (eid) => { const set = new Set(); return { id: eid, classList: {
      toggle(c, force) { const on = force === undefined ? !set.has(c) : !!force; if (on) set.add(c); else set.delete(c); return on; },
      contains(c) { return set.has(c); } } }; };
    const doc = { getElementById(eid) { if (!els.has(eid)) els.set(eid, el(eid)); return els.get(eid); } };
    let src = stepsSrc + '\nout.run = function() { paintDrawerSteps(id); };';
    if (mutate) src = mutate(src);
    const out = {};
    new Function('window', 'document', 'id', 'out', '"use strict";' + src)({ _mattressReactions: reactions, _favoriteMattressId: fav }, doc, id, out);
    out.run();
    const state = (eid) => { const c = els.get(eid).classList; return c.contains('is-done') ? 'done' : (c.contains('is-current') ? 'current' : 'plain'); };
    return { try: state('drawerNoticeLabel'), ask: state('drawerReactionLabel'), choose: state('drawerFinalistLabel') };
  }
  const before = runSteps();
  ok('before a reaction: every ring is a plain numeral (the trial is under way; nothing is claimed done)',
    before.try === 'plain' && before.ask === 'plain' && before.choose === 'plain', JSON.stringify(before));
  const after = runSteps({ reactions: { g5: 'good' } });
  ok('after a reaction: Try and Ask are done, Choose is current',
    after.try === 'done' && after.ask === 'done' && after.choose === 'current', JSON.stringify(after));
  const chosen = runSteps({ reactions: { g5: 'good' }, fav: 'g5' });
  ok('after choosing this mattress: all three done',
    chosen.try === 'done' && chosen.ask === 'done' && chosen.choose === 'done', JSON.stringify(chosen));
  const other = runSteps({ reactions: { g5: 'good' }, fav: 'g7' });
  ok('a finalist chosen elsewhere does not mark this mattress\'s Choose step done',
    other.choose === 'current', JSON.stringify(other));
  const control = runSteps({ reactions: { g5: 'good' }, mutate: (s) => mustReplace(s, "var reacted = !!(mattressId && (window._mattressReactions || {})[mattressId]);", 'var reacted = false;') });
  ok('control: a painter that ignores the reaction is detected', control.try === 'plain' && control.choose === 'plain', JSON.stringify(control));
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
  ok('the implication rows are labelled "Priorities" / "Prioridades" and render the recap projection',
    /id="hf2NeedsLabel">Priorities</.test(norm) && norm.includes("hf2NeedsLabel: es ? 'Prioridades' : 'Priorities',")
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
  ok('the status block: the metadata line is retired (node kept, hidden) and the verdict chip keeps its label sr-only',
    norm.includes("if (metaEl) { metaEl.textContent = ''; metaEl.hidden = true; }")
    && norm.includes(`'<div class="hf2-status__row"><span class="sr-only">' + esc(t('hf2.status_reaction_label'))`));
  ok('the saved-picks and Sleep System hints ship hidden (keys stay written; ruling 7), the empty state is the short line',
    /id="hf2FinalistsHint" hidden>/.test(norm) && /id="hf2SystemHint" hidden>/.test(norm)
    && dictEn['hf2.no_system_items'] === 'Nothing added yet.' && dictEs['hf2.no_system_items'] === 'Aún no se ha agregado nada.');
  ok('the finale reads "Ready to save" and its hint is the state-derived NEXT cue (Savings Pass branch config-gated)',
    /id="hf2PassLabel">Ready to save</.test(norm) && norm.includes("hf2PassLabel: es ? 'Listo para guardar' : 'Ready to save',")
    && norm.includes(': consultationNextCue()'));
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

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
