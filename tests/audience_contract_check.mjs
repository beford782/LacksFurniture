// audience_contract_check.mjs — the A3 post-quiz audience contract
// (owner ruling 2026-09-01).
//
// The journey has one declared primary audience per screen — `customer`
// (the customer holds and operates), `specialist` (the salesperson operates;
// copy is neutral operator guidance, safe to show briefly), `shared` (the
// salesperson holds and deliberately reviews together with the customer) —
// and an EXPLICIT tablet handoff between quiz completion and the shared
// Sleep Brief. This suite pins:
//
//   1. the declared contract: every .screen container carries data-audience,
//      the JS SCREEN_AUDIENCE map agrees with the markup in BOTH directions,
//      and the drawer + compare modal declare `specialist`;
//   2. the handoff: source order (Review -> handoff -> Brief), the h1 focus
//      target, the labelled specialist continuation, roster registration
//      (SCREEN_HEADING_IDS / SCREEN_NAME_KEYS / SESSION_TEXT_IDS), exactly
//      five completion call sites and no other caller, render-before-show,
//      Begin arming the signature entry, the language-switch relocalise
//      branch, and the dictionary-backed named/anonymous greeting EXECUTED
//      against both dictionaries;
//   3. the per-surface voice: specialist chrome carries the A3 evidence
//      vocabulary and no customer second person (scoped pins on the exact
//      strings — NOT a naive global "you" ban: shared and customer surfaces
//      legitimately keep "your", and the drawer's trial prompts stay spoken
//      lines by ruling);
//   4. negative controls proving the executable assertions bite.
//
// House style: readFileSync + extract-and-execute against a DOM shim.
// Writes nothing; exit 0 = pass.
//
// Run: node tests/audience_contract_check.mjs

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

// ------------------------------------------------------- 1. the declared map
section('the declared audience contract — markup and map agree, both ways');
{
  const mapSrc = (norm.match(/var SCREEN_AUDIENCE = \{[\s\S]*?\};/) || [''])[0];
  ok('SCREEN_AUDIENCE is declared exactly once', (norm.match(/var SCREEN_AUDIENCE = \{/g) || []).length === 1);
  const mapEntries = Object.fromEntries(
    [...mapSrc.matchAll(/([A-Za-z0-9_]+): '(customer|specialist|shared)'/g)].map((m) => [m[1], m[2]]));
  // The derived screen roster (session_safety's own idiom): every element
  // whose class list carries the `screen` token.
  const roster = [];
  for (const m of norm.matchAll(/<(main|div|section)\b([^>]*)>/g)) {
    const attrs = m[2];
    const cls = (attrs.match(/\sclass="([^"]*)"/) || [, ''])[1];
    if (!/(^|\s)screen(\s|$)/.test(cls)) continue;
    const id = (attrs.match(/\sid="([^"]*)"/) || [, ''])[1];
    const aud = (attrs.match(/\sdata-audience="([^"]*)"/) || [, ''])[1];
    roster.push({ id, aud });
  }
  ok(`every .screen container declares a data-audience (${roster.length} screens)`,
    roster.length >= 10 && roster.every((s) => ['customer', 'specialist', 'shared'].includes(s.aud)),
    roster.filter((s) => !s.aud).map((s) => s.id).join(','));
  const rosterIds = roster.map((s) => s.id).sort();
  const mapIds = Object.keys(mapEntries).sort();
  ok('the map and the markup name the same screens (set equality, both directions)',
    JSON.stringify(rosterIds) === JSON.stringify(mapIds),
    `markup: ${rosterIds.join(',')} | map: ${mapIds.join(',')}`);
  const disagree = roster.filter((s) => mapEntries[s.id] !== s.aud).map((s) => s.id);
  ok('every declared value agrees between markup and map', disagree.length === 0, disagree.join(','));
  // The ruled assignments themselves.
  const RULED = {
    welcomeScreen: 'customer', questionScreen: 'customer', reviewScreen: 'customer',
    tabletHandoffScreen: 'shared', profileScreen: 'shared', resultsScreen: 'specialist',
    sleepPlanScreen: 'shared', hf2Screen: 'shared', emailScreen: 'customer',
    accessoriesScreen: 'specialist'
  };
  for (const [id, aud] of Object.entries(RULED)) {
    ok(`${id} is declared ${aud} (the ruled contract)`, mapEntries[id] === aud, mapEntries[id]);
  }
  ok('the trial drawer and the compare modal declare specialist',
    /id="mattressDrawer"[^>]*data-audience="specialist"|data-audience="specialist"[^>]*id="mattressDrawer"/.test(norm.replace(/\n/g, ' '))
    && /id="compareModal"[^>]*\n?[^>]*data-audience="specialist"/.test(norm));
}

// ------------------------------------------------------------ 2. the handoff
section('the tablet handoff — structure, rosters, endpoints, language, wipe');
const renderSrc = extractFunction('function renderTabletHandoff()');
const showSrc = extractFunction('window.showTabletHandoff = function()');
const beginSrc = extractFunction('window.beginGuidedReview = function()');
ok('handoff sources extracted', !!renderSrc && !!showSrc && !!beginSrc);
{
  const iReview = norm.indexOf('<div class="screen" id="reviewScreen"');
  const iHandoff = norm.indexOf('<div class="screen" id="tabletHandoffScreen"');
  const iProfile = norm.indexOf('<div class="screen" id="profileScreen"');
  ok('source order: Review -> tablet handoff -> Sleep Brief',
    iReview > -1 && iHandoff > iReview && iProfile > iHandoff);
  ok('the customer line is the focusable h1 (the announce target)',
    /<h1 class="handoff-title" id="tabletHandoffTitle" tabindex="-1">/.test(norm));
  ok('the specialist continuation is a separately LABELLED block (not colour-only)',
    /id="tabletHandoffSpecialistLabel"/.test(norm)
    && /id="tabletHandoffBegin"\s*\n\s*onclick="window\.beginGuidedReview\(\)"\s*\n\s*ontouchend="event\.preventDefault\(\);window\.beginGuidedReview\(\);"/.test(norm));
  ok('the handoff is registered in SCREEN_HEADING_IDS and SCREEN_NAME_KEYS',
    /tabletHandoffScreen: 'tabletHandoffTitle'/.test(norm)
    && /tabletHandoffScreen: 'screen\.tablet_handoff'/.test(norm));
  ok('the greeting joined the wipe text inventory (it can carry the take-home first name)',
    /var SESSION_TEXT_IDS = \[[\s\S]*?'tabletHandoffTitle',[\s\S]*?\];/.test(norm));
  ok('showTabletHandoff renders FIRST, then transitions (heading-announce contract)',
    /window\.showTabletHandoff = function\(\) \{\s*\n\s*renderTabletHandoff\(\);\s*\n\s*showScreen\('tabletHandoffScreen'\);\s*\n\s*\};/.test(norm));
  ok('Begin guided review arms the one-time signature entry and opens the Brief',
    /window\.beginGuidedReview = function\(\) \{\s*\n\s*window\._sleepSignatureEntry = true;\s*\n\s*window\.showProfileScreen\(\);\s*\n\s*\};/.test(norm));
  // Every completion path — and ONLY completion paths — lands on the handoff:
  // startProfileReveal (reduced motion, missing overlay, staged completion),
  // dfmFinishGather, and dfmStartGather's reduced-motion branch.
  ok('exactly five quiz-completion call sites reach the handoff (no return-navigation replay)',
    (norm.match(/window\.showTabletHandoff\(\);/g) || []).length === 5,
    `${(norm.match(/window\.showTabletHandoff\(\);/g) || []).length}`);
  ok('the staged completion still guards on the Review screen being active',
    /if \(reviewScreen && reviewScreen\.classList\.contains\('active'\)\) \{[\s\S]{0,200}?window\.showTabletHandoff\(\);/.test(norm));
  ok('a language switch relocalises the handoff in place (no showScreen, no focus move)',
    /var tabletHandoffScreen = document\.getElementById\('tabletHandoffScreen'\);\s*\n\s*if \(tabletHandoffScreen && tabletHandoffScreen\.classList\.contains\('active'\)\) \{\s*\n\s*renderTabletHandoff\(\);\s*\n\s*\}/.test(norm));
  ok('the greeting reads ONLY the already-supported take-home name field (no new capture)',
    /getElementById\('emailNameInput'\)/.test(renderSrc)
    && (renderSrc.match(/getElementById\('([A-Za-z0-9]+)'\)/g) || []).every((c) =>
      /tabletHandoff|emailNameInput/.test(c)));
}
// Dictionary parity for the handoff strings.
{
  const KEYS = ['screen.tablet_handoff', 'handoff2.eyebrow', 'handoff2.title',
    'handoff2.title_named', 'handoff2.specialist_label', 'handoff2.begin', 'brief.review_together'];
  for (const k of KEYS) {
    ok(`${k} is bilingual and genuinely translated`,
      typeof dictEn[k] === 'string' && dictEn[k].length > 0
      && typeof dictEs[k] === 'string' && dictEs[k].length > 0 && dictEn[k] !== dictEs[k]);
  }
  ok('the named greeting carries the {name} slot in both languages',
    dictEn['handoff2.title_named'].includes('{name}') && dictEs['handoff2.title_named'].includes('{name}'));
}
// EXECUTED: the greeting against both dictionaries, named and anonymous.
function makeHandoffEnv({ lang = 'en', name = '', mutate = null } = {}) {
  const els = new Map();
  const el = (id) => ({ id, textContent: '', hidden: false, value: id === 'emailNameInput' ? name : '' });
  const doc = { getElementById(id) { if (!els.has(id)) els.set(id, el(id)); return els.get(id); } };
  const D = lang === 'es' ? dictEs : dictEn;
  const screens = [];
  const calls = [];
  const win = {
    showProfileScreen: () => calls.push('brief')
  };
  let src = renderSrc + '\n' + showSrc + '\n' + beginSrc + '\n';
  if (mutate) src = mutate(src);
  new Function('document', 'window', 'showScreen', 't', `"use strict";${src}`)(
    doc, win, (id) => screens.push(id),
    (k, repl) => {
      let v = Object.prototype.hasOwnProperty.call(D, k) ? D[k] : k;
      if (repl) Object.keys(repl).forEach((r) => { v = v.replace('{' + r + '}', repl[r]); });
      return v;
    });
  return { els, doc, win, screens, calls };
}
{
  const env = makeHandoffEnv({});
  env.win.showTabletHandoff();
  ok('anonymous EN: the fallback greeting renders and the screen transitions after the render',
    env.els.get('tabletHandoffTitle').textContent === dictEn['handoff2.title']
    && env.screens.join(',') === 'tabletHandoffScreen'
    && env.els.get('tabletHandoffBegin').textContent === dictEn['handoff2.begin']);
  const named = makeHandoffEnv({ name: '  Maria  ' });
  named.win.showTabletHandoff();
  ok('named EN: the greeting consumes the trimmed take-home first name',
    named.els.get('tabletHandoffTitle').textContent
      === dictEn['handoff2.title_named'].replace('{name}', 'Maria'));
  const es = makeHandoffEnv({ lang: 'es' });
  es.win.showTabletHandoff();
  ok('anonymous ES: the provisional Spanish greeting renders',
    es.els.get('tabletHandoffTitle').textContent === dictEs['handoff2.title']
    && es.els.get('tabletHandoffSpecialistLabel').textContent === dictEs['handoff2.specialist_label']);
  const begin = makeHandoffEnv({});
  begin.win.beginGuidedReview();
  ok('Begin guided review: the signature entry is armed and the Brief opens',
    begin.win._sleepSignatureEntry === true && begin.calls.join(',') === 'brief');
}

// --------------------------------------------------- 3. the per-surface voice
section('specialist surfaces — A3 evidence vocabulary, no customer second person');
{
  const chrome = extractFunction('function renderResultsChrome()');
  // A3.1 (owner directive 2026-09-01): the support sentence is retired - the
  // title, the "Best match" eyebrow and "Try this mattress" already say it.
  ok('Results: eyebrow / title carry the ruled specialist framing (EN + ES); the support line is retired',
    chrome.includes("es ? 'Guía del especialista' : 'Specialist guide'")
    && chrome.includes("'Recommended <span class=\"accent\">starting points</span>'")
    && chrome.includes("'Puntos de partida <span class=\"accent\">recomendados</span>'")
    && chrome.includes("resultsSubhead.textContent = ''; resultsSubhead.hidden = true;")
    && !chrome.includes('Begin with the first match'));
  ok('Results statics match the rendered strings (no two-narrator flash)',
    /id="resultsEyebrow">Specialist guide</.test(norm)
    && /id="resultsHeadline">Recommended <span class="accent">starting points<\/span></.test(norm)
    && /id="resultsSubhead" hidden><\/p>/.test(norm));
  ok('the trial-focus label is neutral evidence ("Trial focus", not "Your trial focus")',
    norm.includes("(es ? 'Enfoque de la prueba' : 'Trial focus')"));
  // A3.1: three numbered steps - Try, Ask, Choose - replace the three
  // narrations of one trial; the spoken question stays explicit.
  ok('the drawer steps name the operator’s job in three numbered labels; the spoken question is explicit',
    norm.includes("? 'Pregunta: “¿Cómo se sintió este colchón?”'")
    && norm.includes(": 'Ask: “How did this mattress feel?”'")
    && norm.includes("currentLang === 'es' ? 'Probar' : 'Try'")
    && norm.includes("currentLang === 'es' ? 'Elegir finalista' : 'Choose a finalist'"));
  ok('the drawer finalist hint is operator voice in both dictionaries',
    dictEn['drawer.finalist_hint'] === 'Record a reaction before choosing a finalist.'
    && dictEs['drawer.finalist_hint'] === 'Registra una reacción antes de elegir un finalista.');
  ok('Compare reports observed trial evidence',
    norm.includes("label: _esCmp ? 'Reacción observada' : 'Observed reaction'")
    && dictEn['compare.modal_title'] === 'Compare shortlisted mattresses');
  ok('the Brief->Results status card narrates neutrally, in one sentence (A3.1 retired the subtitle)',
    norm.includes("es ? 'Abriendo la comparación en tienda' : 'Opening the showroom comparison'")
    && norm.includes("elements.subtitle.textContent = '';")
    && !norm.includes('The mattress matches are ready to compare.'));
  ok('the Sleep System header is the ruled specialist frame (EN + ES)',
    norm.includes("sleepSystemEyebrow: { en: 'Specialist guide', es: 'Guía del especialista' }")
    && norm.includes("sleepSystemTitle: { en: 'Build the sleep setup', es: 'Arma el sistema de sueño' }")
    && norm.includes("en: 'Add only what supports the customer’s needs.'"));
  ok('screen names for the two specialist working surfaces carry no customer possessive',
    !/\byour\b/i.test(dictEn['screen.results']) && !/\byour\b/i.test(dictEn['screen.sleep_system'])
    && !/\btus?\b/i.test(dictEs['screen.results']) && !/\btus?\b/i.test(dictEs['screen.sleep_system']));
}
section('shared and customer surfaces — deliberate second person, marked moments');
{
  ok('the Brief keeps its customer-friendly identity and gains "Review together"',
    dictEn['brief.heading'] === 'Your Sleep Brief'
    && dictEn['brief.review_together'] === 'Review together'
    && dictEs['brief.review_together'] === 'Revisen juntos'
    && /id="profileAudienceEyebrow"/.test(norm)
    && /setProfileText\('profileAudienceEyebrow', t\('brief\.review_together'\)\);/.test(norm));
  ok('the Brief’s shared-screen controls drop the first person (specialist operates)',
    norm.includes("es ? '← Editar respuestas' : '← Edit answers'")
    && norm.includes("es ? 'Continuar a las opciones →' : 'Continue to matches →'"));
  ok('the Summary keeps the shared orientation and title',
    /id="hf2ReviewEyebrow">Review with the customer</.test(norm)
    && /hf2ReviewTitle: es \? 'Tu Resumen de Consulta' : 'Your Consultation Summary',/.test(norm));
  ok('the Summary close speaks to both people (take home, not "for the customer")',
    norm.includes(": 'Review the plan together, then save it to take home.'"));
  ok('the take-home returns to customer voice and drops the internal "handoff" jargon',
    dictEn['email.eyebrow'] === 'Take your matches home'
    && norm.includes("es ? 'Volver al resumen' : 'Back to the summary'")
    && /id="emailConfirmBackHandoff"[^>]*>Back to the summary</.test(norm));
  // A3.1 (owner ruling 6, 2026-09-01): the completion action names the shared
  // review that follows the tablet handoff and no longer promises the
  // signature (which appears one screen later, after Begin). Customer
  // language, first-person-free; ES provisional.
  ok('the quiz completion label is the ruled shared-review action (A3.1 ruling 6)',
    dictEn['brief.quiz_finish'] === 'Finish and review together'
    && dictEs['brief.quiz_finish'] === 'Terminar y revisar juntos');
}

// ------------------------------------------------------- 4. negative controls
section('negative controls — the executable assertions bite');
{
  const noNamed = makeHandoffEnv({ name: 'Maria', mutate: (s) => {
    const out = s.replace("? t('handoff2.title_named', { name: firstName })", "? t('handoff2.title')");
    if (out === s) throw new Error('control mutation did not apply');
    return out;
  } });
  noNamed.win.showTabletHandoff();
  ok('control: dropping the named branch is detected (the greeting ignores the name)',
    noNamed.els.get('tabletHandoffTitle').textContent === dictEn['handoff2.title']
    && noNamed.els.get('tabletHandoffTitle').textContent !== dictEn['handoff2.title_named'].replace('{name}', 'Maria'));
  const noArm = makeHandoffEnv({ mutate: (s) => {
    const out = s.replace('window._sleepSignatureEntry = true;', '');
    if (out === s) throw new Error('control mutation did not apply');
    return out;
  } });
  noArm.win.beginGuidedReview();
  ok('control: a Begin that stops arming the signature entry is detected',
    noArm.win._sleepSignatureEntry !== true && noArm.calls.join(',') === 'brief');
}

// ------------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
