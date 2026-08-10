// construction_reveal_repair_check.mjs — slice 5a: repair & legibility.
//
// The reveal was authored against the navy fallback drawer, but the
// results-screen drawer — the ONLY production entry — re-themes light, and
// no `.dfm-cons-*` selector was in that override: every element rendered at
// roughly 1.1–1.3:1 on #FFFDF8. Two strata textures also read as materials
// (radial dots = coils/gel beads, vertical pinstripes = an innerspring) in
// direct contradiction of adjacent catalog copy (g4 disclaims coils).
//
// House style: EXTRACT the real DFM MOTION SPIKE block and EXECUTE the real
// markup/render functions against a DOM stub — plus arithmetic the static
// suites structurally cannot do: WCAG contrast ratios computed from the
// actual authored colors on BOTH drawer themes. Writes nothing; exit 0 = pass.
//
// Guards, in order:
//   1. tokens + contrast on the light drawer (text 4.5:1, non-text 3:1)
//   2. contrast on the navy fallback drawer (same floors)
//   3. four abstract fills — distinct by angle/weight/spacing, never motif
//   4. equal-weight geometry (no thickness or proportion implied)
//   5. forced-colors fallback: border-style carries the correspondence
//   6. legend a11y: visibility (not opacity alone), disclosure semantics
//   7. layer-to-swatch correspondence is structural (shared fill class)
//   8. markup identity across every mattress record, per language
//   9. customer-facing wording byte-identical to the approved lab strings
//  10. lifecycle: fresh collapsed per render, reduced-motion expanded,
//      rollback declines, wipe shell replaced

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');
const cssNorm = html.replace(/\r\n/g, '\n');
const mattressData = JSON.parse(readFileSync(join(here, '..', 'data', 'mattresses.json'), 'utf8'));

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}${detail ? ' — ' + detail : ''}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(t) { console.log(`\n== ${t} ==`); }

// ---------------------------------------------------------------- extraction
const beginMark = '// ===== DFM MOTION SPIKE (begin) =====';
const endMark = '// ===== DFM MOTION SPIKE (end) =====';
const b = html.indexOf(beginMark);
const e = html.indexOf(endMark);
if (b === -1 || e === -1) { console.log('FAIL — spike fences not found'); process.exit(1); }
const spikeSrc = html.slice(b, e);
const spikeSrcFlagOff = spikeSrc.replace(/enabled:\s*true\s*,/, 'enabled: false,');

// ------------------------------------------------------------ color helpers
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function channelLin(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function luminance(rgb) {
  const [r, g, bch] = rgb.map(channelLin);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bch;
}
function ratio(fg, bg) {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
// source-over composite of an rgba() layer onto an opaque backdrop
function over(rgba, alpha, backdrop) {
  return rgba.map((c, i) => Math.round(alpha * c + (1 - alpha) * backdrop[i]));
}
function fmt(r) { return r.toFixed(2) + ':1'; }

// --------------------------------------------------------- authored palette
section('authored palette extraction');
const baseTok = cssNorm.match(
  /\n    \.dfm-cons \{[\s\S]{0,600}?--dfm-cons-ink: (#[0-9A-Fa-f]{6});\s*--dfm-cons-wash: (#[0-9A-Fa-f]{6});\s*--dfm-cons-edge: (#[0-9A-Fa-f]{6});/);
ok('base (navy fallback) theme declares the three reveal tokens', !!baseTok);
const lightTok = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons \{\s*--dfm-cons-ink: (#[0-9A-Fa-f]{6});\s*--dfm-cons-wash: (#[0-9A-Fa-f]{6});\s*--dfm-cons-edge: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme declares the three reveal tokens (the P0 repair)', !!lightTok);
const drawerLight = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.mattress-drawer \{[\s\S]{0,900}?background: (#[0-9A-Fa-f]{6});/);
ok('light drawer surface color located', !!drawerLight);
const drawerNavy = cssNorm.match(
  /\.mattress-drawer \{[\s\S]{0,900}?linear-gradient\(180deg,\s*(#[0-9A-Fa-f]{6})\s*,?\s*(#[0-9A-Fa-f]{6})\)/);
ok('navy drawer gradient stops located', !!drawerNavy);
const lightBtn = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-btn \{\s*background: (#[0-9A-Fa-f]{6});\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates the toggle ink', !!lightBtn);
const lightBtnOpen = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-btn\[aria-expanded="true"\] \{\s*background: rgba\((\d+), (\d+), (\d+), (0?\.\d+)\);\s*border-color: (#[0-9A-Fa-f]{6});\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates the expanded toggle ink', !!lightBtnOpen);
const lightLabels = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-labels \{\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
const lightChip = cssNorm.match(
  /body:has\(#resultsScreen\.active\) \.dfm-cons-chip \{\s*color: (#[0-9A-Fa-f]{6});\s*\}/);
ok('light theme restates legend and chip ink', !!lightLabels && !!lightChip);
const labelOpacity = cssNorm.match(/\.dfm-cons\.is-open \.dfm-cons-labels li \{ opacity: (0?\.\d+); visibility: visible; \}/);
const chipOpacity = cssNorm.match(/\.dfm-cons-chip \{[\s\S]{0,200}?opacity: (0?\.\d+);/);
ok('legend and chip opacities located', !!labelOpacity && !!chipOpacity);
const baseBtnOpen = cssNorm.match(
  /\.dfm-cons-btn\[aria-expanded="true"\] \{\s*background: rgba\((\d+), (\d+), (\d+), (0?\.\d+)\);\s*border-color: var\(--gold, (#[0-9A-Fa-f]{6})\);\s*color: var\(--gold, (#[0-9A-Fa-f]{6})\);/);
ok('base expanded toggle ink located', !!baseBtnOpen);

if (failures) { console.log(`\nFAIL — ${checks - failures}/${checks}`); process.exit(1); }

const NAVY = [hexToRgb(drawerNavy[1]), hexToRgb(drawerNavy[2])];
const LIGHT = hexToRgb(drawerLight[1]);
const base = { ink: hexToRgb(baseTok[1]), wash: hexToRgb(baseTok[2]), edge: hexToRgb(baseTok[3]) };
const light = { ink: hexToRgb(lightTok[1]), wash: hexToRgb(lightTok[2]), edge: hexToRgb(lightTok[3]) };
const CREAM = hexToRgb('#F5EFE4'); // var(--cream) fallback, the base btn/labels ink
const OP_LABEL = parseFloat(labelOpacity[1]);
const OP_CHIP = parseFloat(chipOpacity[1]);

// ------------------------------------------------- light drawer contrast
section('light drawer contrast (the production surface)');
{
  const btnBg = hexToRgb(lightBtn[1]);
  const btnInk = hexToRgb(lightBtn[2]);
  let r = ratio(btnInk, btnBg);
  ok('toggle text meets 4.5:1', r >= 4.5, fmt(r));
  r = ratio(light.edge, LIGHT);
  ok('toggle/layer/swatch borders meet 3:1 on the panel', r >= 3, fmt(r));
  const openBg = over([+lightBtnOpen[1], +lightBtnOpen[2], +lightBtnOpen[3]], parseFloat(lightBtnOpen[4]), LIGHT);
  r = ratio(hexToRgb(lightBtnOpen[6]), openBg);
  ok('expanded toggle text meets 4.5:1 over its tint', r >= 4.5, fmt(r));
  r = ratio(hexToRgb(lightBtnOpen[5]), openBg);
  ok('expanded toggle border meets 3:1 over its tint', r >= 3, fmt(r));
  r = ratio(light.ink, LIGHT);
  ok('stratum ink meets 3:1 on the panel', r >= 3, fmt(r));
  r = ratio(light.ink, light.wash);
  ok('stratum ink meets 3:1 on its own wash (internal legibility)', r >= 3, fmt(r));
  r = ratio(light.edge, light.wash);
  ok('layer separation (edge on wash) meets 3:1', r >= 3, fmt(r));
  const labelEff = over(hexToRgb(lightLabels[1]), OP_LABEL, LIGHT);
  r = ratio(labelEff, LIGHT);
  ok('legend text meets 4.5:1 at its rendered opacity', r >= 4.5, fmt(r));
  const chipEff = over(hexToRgb(lightChip[1]), OP_CHIP, LIGHT);
  r = ratio(chipEff, LIGHT);
  ok('honesty chip meets 4.5:1 at its rendered opacity', r >= 4.5, fmt(r));
}

// -------------------------------------------------- navy drawer contrast
section('navy fallback drawer contrast (both gradient stops)');
for (const stop of NAVY) {
  const tag = '#' + stop.map((c) => c.toString(16).padStart(2, '0')).join('');
  const btnBg = over([255, 255, 255], 0.05, stop);
  let r = ratio(CREAM, btnBg);
  ok(`toggle text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  const openBg = over([+baseBtnOpen[1], +baseBtnOpen[2], +baseBtnOpen[3]], parseFloat(baseBtnOpen[4]), stop);
  r = ratio(hexToRgb(baseBtnOpen[6]), openBg);
  ok(`expanded toggle text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  r = ratio(base.ink, stop);
  ok(`stratum ink meets 3:1 on ${tag}`, r >= 3, fmt(r));
  r = ratio(base.edge, stop);
  ok(`borders meet 3:1 on ${tag}`, r >= 3, fmt(r));
  const labelEff = over(CREAM, OP_LABEL, stop);
  r = ratio(labelEff, stop);
  ok(`legend text meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
  const chipEff = over(CREAM, OP_CHIP, stop);
  r = ratio(chipEff, stop);
  ok(`honesty chip meets 4.5:1 on ${tag}`, r >= 4.5, fmt(r));
}
{
  let r = ratio(base.ink, base.wash);
  ok('stratum ink meets 3:1 on its own wash', r >= 3, fmt(r));
  r = ratio(base.edge, base.wash);
  ok('layer separation (edge on wash) meets 3:1', r >= 3, fmt(r));
}

// -------------------------------------------- abstract fills, no motifs
section('four abstract fills — distinct by geometry, never motif');
const fillRules = {};
for (const k of ['a', 'b', 'c', 'd']) {
  const m = cssNorm.match(new RegExp(`\\.dfm-cons-fill--${k} \\{ background: ([^;]+); \\}`));
  fillRules[k] = m ? m[1] : null;
}
ok('all four fill classes exist', Object.values(fillRules).every(Boolean));
const stripe = {};
for (const k of ['a', 'b', 'c']) {
  const m = (fillRules[k] || '').match(
    /^repeating-linear-gradient\((\d+)deg, var\(--dfm-cons-ink\) 0 (\d+)px, var\(--dfm-cons-wash\) \2px (\d+)px\)$/);
  stripe[k] = m ? { angle: +m[1], on: +m[2], period: +m[3] } : null;
}
ok('fills a/b/c are pure ink/wash stripe treatments', Object.values(stripe).every(Boolean));
ok('fill d is the solid value step (no pattern at all)', fillRules.d === 'var(--dfm-cons-ink)');
if (Object.values(stripe).every(Boolean)) {
  const angles = ['a', 'b', 'c'].map((k) => stripe[k].angle);
  const weights = ['a', 'b', 'c'].map((k) => stripe[k].on);
  ok('stripe angles pairwise distinct (non-hue channel one)', new Set(angles).size === 3, angles.join('/') + 'deg');
  ok('stripe weights pairwise distinct (non-hue channel two)', new Set(weights).size === 3, weights.join('/') + 'px');
  ok('no vertical pinstripe (90deg reads as an innerspring)', !angles.includes(90));
}
// scan every dfm-cons rule body, comments stripped, for banned motifs
const consRuleBodies = [...cssNorm.matchAll(/[^{}]*dfm-cons[^{}]*\{([^{}]*)\}/g)]
  .map((m) => m[1].replace(/\/\*[\s\S]*?\*\//g, ''));
ok('reveal CSS scanned (rules found)', consRuleBodies.length > 10, String(consRuleBodies.length));
ok('no radial/conic/image motif anywhere in the reveal CSS',
  consRuleBodies.every((body) => !/radial-gradient|conic-gradient|url\(|circle|ellipse/i.test(body)));
ok('no vertical-pinstripe declaration anywhere in the reveal CSS',
  consRuleBodies.every((body) => !/\b90deg/.test(body)));

// --------------------------------------------------------- equal geometry
section('equal-weight geometry — no thickness, no proportions');
ok('the shared layer rule fixes one 16px height for every stratum',
  /\.dfm-cons-layer \{[\s\S]{0,200}?height: 16px;/.test(cssNorm));
for (const k of ['a', 'b', 'c', 'd']) {
  const m = cssNorm.match(new RegExp(`\\.dfm-cons-layer--${k} \\{([^}]*)\\}`));
  ok(`stratum ${k} declares no height of its own`, !!m && !/height:/.test(m[1]));
}
ok('the stage still reserves its exploded height (no layout shift)',
  /\.dfm-cons-stage \{[\s\S]{0,200}?height: 122px;/.test(cssNorm));

// ------------------------------------------------- forced-colors fallback
section('forced-colors fallback — correspondence without hue or gradient');
const fcBlock = [...cssNorm.matchAll(/@media \(forced-colors: active\) \{[\s\S]*?\n    \}/g)]
  .map((m) => m[0]).find((t) => t.includes('dfm-cons-fill'));
ok('a forced-colors block covers the reveal fills', !!fcBlock);
if (fcBlock) {
  const styles = ['a', 'b', 'c', 'd'].map((k) => {
    const m = fcBlock.match(new RegExp(`\\.dfm-cons-fill--${k} \\{ border-style: (\\w+); \\}`));
    return m ? m[1] : null;
  });
  ok('each fill maps to a border-style', styles.every(Boolean), styles.join('/'));
  ok('the four border-styles are pairwise distinct', new Set(styles).size === 4);
  ok('layers and swatches widen their borders so the styles read',
    /\.dfm-cons-layer, \.dfm-cons-swatch \{ border-width: 3px; \}/.test(fcBlock));
}

// ----------------------------------------------- legend accessibility CSS
section('legend accessibility — visibility, not opacity alone');
ok('collapsed legend items leave the accessibility tree (visibility: hidden)',
  cssNorm.includes('.dfm-cons-labels li { opacity: 0; visibility: hidden; }'));
ok('open legend items are exposed (visibility: visible)',
  cssNorm.includes('.dfm-cons.is-open .dfm-cons-labels li { opacity: 0.85; visibility: visible; }'));
ok('gated close delays visibility until the fade completes',
  /body\.dfm-motion \.dfm-cons-labels li \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s var\(--dfm-settle\);/.test(cssNorm));
ok('gated open flips visibility immediately so the fade-in shows',
  /body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-labels li \{\s*transition: opacity var\(--dfm-settle\) var\(--dfm-e-settle\), visibility 0s;/.test(cssNorm));
ok('the reduced-motion defensive block names the higher-specificity is-open variant',
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*body\.dfm-motion \.dfm-cons\.is-open \.dfm-cons-labels li \{ transition: none; \}/.test(cssNorm));

// ------------------------------------------------------- executed markup
section('executed markup — disclosure semantics and correspondence');
function makeClock() {
  let now = 0; let nextId = 1; let tasks = [];
  return {
    setTimeout(fn, ms) { const id = nextId++; tasks.push({ id, at: now + ms, fn }); return id; },
    clearTimeout(id) { tasks = tasks.filter((t) => t.id !== id); },
    advance(ms) { now += ms; }
  };
}
function makeEl(id) {
  const el = {
    id, children: [], className: '', textContent: '', style: {}, attrs: {}, listeners: {}, parentNode: null,
    classList: {
      _s: new Set(),
      add(...c) { c.forEach((x) => el.classList._s.add(x)); },
      remove(...c) { c.forEach((x) => el.classList._s.delete(x)); },
      contains(c) { return el.classList._s.has(c); }
    },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return el.attrs[k]; },
    addEventListener(t, fn) { (el.listeners[t] = el.listeners[t] || []).push(fn); },
    fire(t, evt) { (el.listeners[t] || []).forEach((fn) => fn(evt || { type: t })); },
    appendChild(c) { c.parentNode = el; el.children.push(c); return c; },
    removeChild(c) { el.children = el.children.filter((x) => x !== c); c.parentNode = null; return c; },
    createElementNS: () => makeEl('svg')
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) { el._html = v; if (v === '') el.children = []; }
  });
  return el;
}
function makeConsEnv({ hostname = 'localhost', search = '?motion=1', reduced = false, lang = 'en', withHost = true, flagOff = false, model = null } = {}) {
  const clock = makeClock();
  const els = {};
  els.dfmGatherLayer = makeEl('dfmGatherLayer');
  const calls = { frames: 0, timers: 0, inserted: '' };
  if (withHost) {
    const parent = makeEl('drawerScrollParent');
    const host = makeEl('drawerDifferentiators');
    parent.appendChild(host);
    host.insertAdjacentHTML = (pos, htmlStr) => {
      calls.inserted = htmlStr;
      if (pos !== 'afterend') throw new Error('expected sibling insertion, got ' + pos);
      if (htmlStr.includes('id="dfmConstructionSection"')) {
        els.dfmConstructionSection = makeEl('dfmConstructionSection');
        els.dfmConstructionSection._markup = htmlStr;
        parent.appendChild(els.dfmConstructionSection);
      }
      if (htmlStr.includes('id="dfmConstructionPanel"')) {
        els.dfmConstructionPanel = makeEl('dfmConstructionPanel');
        els.dfmConstructionSection.appendChild(els.dfmConstructionPanel);
      }
      if (htmlStr.includes('id="dfmConsToggle"')) {
        els.dfmConsToggle = makeEl('dfmConsToggle');
        els.dfmConsToggle.setAttribute('aria-expanded', 'false');
        els.dfmConstructionPanel.appendChild(els.dfmConsToggle);
      }
    };
    els.drawerDifferentiators = host;
    els.drawerScrollParent = parent;
  }
  const bodyEl = makeEl('body');
  const win = {
    location: { hostname, search },
    matchMedia: () => ({ matches: reduced }),
    innerWidth: 1024, innerHeight: 768,
    // tripwires: a future closure over any of these must not change output
    currentDrawerMattress: model, _drawerMattress: model, selectedMattress: model
  };
  const doc = {
    body: bodyEl,
    getElementById: (id) => {
      if (id === 'dfmConstructionSection' && els.dfmConstructionSection &&
          !els.dfmConstructionSection.parentNode) return null;
      return els[id] || null;
    },
    createElementNS: (ns, tag) => makeEl(tag)
  };
  const src = (flagOff ? spikeSrcFlagOff : spikeSrc) +
    '\nreturn { consMarkup: window.dfmConstructionMarkup, consRender: window.dfmConstructionRender };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', src);
  const api = fn(win, doc, URLSearchParams,
    (f, ms) => { calls.timers++; return clock.setTimeout(f, ms); },
    (f) => { calls.frames++; return clock.setTimeout(f, 0); },
    (id) => clock.clearTimeout(id), lang);
  return { clock, els, calls, api };
}

const markupEn = makeConsEnv().api.consMarkup();
const markupEs = makeConsEnv({ lang: 'es' }).api.consMarkup();
ok('toggle is a disclosure: aria-expanded=false + aria-controls at rest',
  markupEn.includes('id="dfmConsToggle" aria-expanded="false" aria-controls="dfmConsLegend"'));
ok('the legend carries the stable controlled id',
  markupEn.includes('<ol class="dfm-cons-labels" id="dfmConsLegend">'));
ok('the toggle carries no aria-pressed (one state vocabulary, not two)',
  !markupEn.includes('aria-pressed'));
ok('the stage stays decorative (aria-hidden)',
  markupEn.includes('class="dfm-cons-stage" aria-hidden="true"'));
const KEYS = ['a', 'b', 'c', 'd'];
ok('each stratum wears its own fill class, in order',
  KEYS.every((k) => markupEn.includes(`class="dfm-cons-layer dfm-cons-layer--${k} dfm-cons-fill--${k}"`)) &&
  KEYS.every((k, i) => KEYS.slice(0, i).every((prev) =>
    markupEn.indexOf(`dfm-cons-layer--${prev}`) < markupEn.indexOf(`dfm-cons-layer--${k}`))));
const EN_LABELS = ['Comfort layer', 'Transition layer', 'Support core', 'Base layer'];
const ES_LABELS = ['Capa de confort', 'Capa de transición', 'Núcleo de soporte', 'Capa base'];
function legendItems(markup) {
  return [...markup.matchAll(/<li><span class="dfm-cons-swatch dfm-cons-fill--([a-d])" aria-hidden="true"><\/span>([^<]+)<\/li>/g)]
    .map((m) => ({ key: m[1], label: m[2] }));
}
for (const [markup, labels, tag] of [[markupEn, EN_LABELS, 'EN'], [markupEs, ES_LABELS, 'ES']]) {
  const items = legendItems(markup);
  ok(`${tag}: every legend item leads with an aria-hidden swatch`, items.length === 4);
  ok(`${tag}: swatch fills correspond to strata top-to-bottom (a..d)`,
    items.length === 4 && items.every((it, i) => it.key === KEYS[i] && it.label === labels[i]),
    items.map((it) => it.key + ':' + it.label).join(' | '));
}

// -------------------------------------------------- wording byte-identity
section('customer-facing wording — byte-identical to the approved strings');
const EXPECTED_EN = 'Construction demonstration' + 'Separate the layers' +
  EN_LABELS.join('') +
  'Construction demonstration — a general mattress build, not this model’s specification.';
const EXPECTED_ES = 'Demostración de construcción' + 'Separar las capas' +
  ES_LABELS.join('') +
  'Demostración de construcción — estructura general de un colchón, no las especificaciones de este modelo.';
ok('EN rendered text is byte-identical to the approved string set',
  markupEn.replace(/<[^>]+>/g, '') === EXPECTED_EN);
ok('ES rendered text is byte-identical to the approved string set',
  markupEs.replace(/<[^>]+>/g, '') === EXPECTED_ES);
ok('close labels preserved verbatim in both languages',
  spikeSrc.includes("'Reassemble the layers'") && spikeSrc.includes("'Reunir las capas'"));

// --------------------------------------- generic identity across the data
section('one generic build — identical markup for every mattress record');
const allModels = ['gold', 'silver', 'bronze'].flatMap((t) => mattressData[t] || []);
ok('mattress records loaded', allModels.length >= 20, String(allModels.length) + ' models');
ok('markup function is zero-arity', /dfmConstructionMarkup = function\(\)/.test(spikeSrc));
const consSrcStart = spikeSrc.indexOf('window.dfmConstructionMarkup');
const consSrcStop = spikeSrc.indexOf('// The styling hook is withheld');
const consSrc = spikeSrc.slice(consSrcStart, consSrcStop);
const modelKeys = [...new Set(allModels.flatMap((m) => Object.keys(m)))];
ok('markup source reads no per-model field (full key union, ' + modelKeys.length + ' keys)',
  modelKeys.every((k) => !new RegExp(`\\.${k}\\b`).test(consSrc)) &&
  !/currentDrawerMattress|selectedMattress|quizAnswers|answers\[|userProfile/.test(consSrc));
for (const lang of ['en', 'es']) {
  const outs = new Set(allModels.map((m) => makeConsEnv({ lang, model: m }).api.consMarkup()));
  ok(`${lang}: markup is identical across all ${allModels.length} models`, outs.size === 1);
}

// ------------------------------------------------------------- lifecycle
section('lifecycle — fresh collapsed per render; reduced expanded; rollback');
{
  const env = makeConsEnv();
  ok('render starts collapsed with aria-expanded=false',
    env.api.consRender() === true &&
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  env.els.dfmConsToggle.fire('click');
  ok('open flips aria-expanded to true with the reassemble label',
    env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'true' &&
    env.els.dfmConsToggle.textContent === 'Reassemble the layers');
  env.api.consRender(); // mattress navigation re-render
  const sections = env.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection');
  ok('mattress navigation renders ONE fresh collapsed panel (approved lifecycle)',
    sections.length === 1 &&
    !env.els.dfmConstructionPanel.classList.contains('is-open') &&
    env.els.dfmConsToggle.getAttribute('aria-expanded') === 'false');
  env.els.dfmConstructionSection.innerHTML = ''; // session wipe empties the shell
  env.api.consRender();
  ok('after a wipe the shell is replaced by ONE fresh collapsed panel',
    env.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection').length === 1 &&
    !env.els.dfmConstructionPanel.classList.contains('is-open'));
  ok('the scene scheduled zero frames and zero timers throughout',
    env.calls.frames === 0 && env.calls.timers === 0);
}
{
  const es = makeConsEnv({ lang: 'es' });
  es.api.consRender();
  es.api.consRender(); // language-change re-render path
  ok('language re-render carries ES markup in ONE fresh section',
    es.els.drawerScrollParent.children.filter((c) => c.id === 'dfmConstructionSection').length === 1 &&
    es.els.dfmConstructionSection._markup.includes('Demostración de construcción'));
}
{
  const reduced = makeConsEnv({ reduced: true });
  ok('reduced motion renders fully expanded with the legend exposed',
    reduced.api.consRender() === true &&
    reduced.els.dfmConstructionPanel.classList.contains('is-open') &&
    reduced.els.dfmConsToggle.getAttribute('aria-expanded') === 'true');
}
{
  const rollback = makeConsEnv({ hostname: 'beford782.github.io', flagOff: true, search: '?motion=1' });
  ok('rollback declines: no markup, no section, drawer stays legacy',
    rollback.api.consMarkup() === '' && rollback.api.consRender() === false &&
    rollback.calls.inserted === '');
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
