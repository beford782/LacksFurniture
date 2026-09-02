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

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
