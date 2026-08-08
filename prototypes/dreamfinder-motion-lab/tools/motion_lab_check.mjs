// DreamFinder Motion Lab — static + state-machine checks.
// PROTOTYPE ONLY — deliberately NOT wired into repository CI (PR #18 precedent:
// prototype checks stay inside the prototype's scope).
//
// What this proves:
//   1. The lab's CSS animates only compositor-safe properties (transform,
//      opacity, clip-path, stroke-dashoffset, letter-spacing) — the property
//      denylist that encodes the performance review's verdicts as a rule.
//   2. No `transition: all`, no infinite animation, no Canvas/WebGL/SMIL.
//   3. Byte budgets hold (lab total <= 120 KB, runtime JS <= 45 KB).
//   4. The scene runner actually implements idle->running->done with working
//      skip/reset/replay/watchdog/reduced-motion semantics — executed here
//      against a fake clock and fake animations, not grepped for.
//   5. No quantity-claim language anywhere in the lab (materials and
//      mechanism, never quantities).
//   6. No trailing whitespace (repo CI runs `git diff --check` over new files).
//
// What this cannot prove: frame rate, compositor smoothness, or anything about
// the actual showroom tablet. Those need the mounted device and Web Inspector.
//
// Runs read-only. Writes nothing. Exit 0 = pass, 1 = fail.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const lab = (f) => join(here, '..', f);

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}`); }
  else { failures++; console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); }
}
function section(title) { console.log(`\n== ${title} ==`); }

const files = {
  html: readFileSync(lab('index.html'), 'utf8'),
  css: readFileSync(lab('motion-lab.css'), 'utf8'),
  runner: readFileSync(lab('scene-runner.js'), 'utf8'),
  js: readFileSync(lab('motion-lab.js'), 'utf8'),
  selftest: readFileSync(lab('selftest.js'), 'utf8'),
  readme: readFileSync(lab('README.md'), 'utf8')
};

// ---------------------------------------------------------------- budgets
section('byte budgets');
const totalBytes = Object.values(files).reduce((n, s) => n + Buffer.byteLength(s), 0);
const runtimeJs = Buffer.byteLength(files.runner) + Buffer.byteLength(files.js);
ok(`lab total ${totalBytes} bytes <= 120 KB`, totalBytes <= 120 * 1024);
ok(`runtime JS ${runtimeJs} bytes <= 45 KB`, runtimeJs <= 45 * 1024);

// ------------------------------------------------------- CSS property rules
section('CSS animated-property discipline');

// audit CODE, not commentary — comments legitimately name banned things
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const cssCode = stripCss(files.css);

// brace-matched @keyframes extraction (a lazy regex swallows following rules)
function extractKeyframes(css) {
  const blocks = [];
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') { depth++; }
      else if (css[i] === '}') { depth--; }
      i++;
    }
    blocks.push([m[1], css.slice(re.lastIndex, i - 1)]);
  }
  return blocks;
}

const KEYFRAME_ALLOW = new Set(['transform', 'opacity', 'clip-path', 'stroke-dashoffset', 'letter-spacing']);
const kfBlocks = extractKeyframes(cssCode);
ok('found keyframes to audit', kfBlocks.length > 0, 'none found — extraction broken?');
for (const [name, body] of kfBlocks) {
  const props = [...body.matchAll(/([a-z-]+)\s*:/g)].map((m) => m[1]);
  const bad = props.filter((p) => !KEYFRAME_ALLOW.has(p));
  ok(`@keyframes ${name} animates only compositor-safe properties`, bad.length === 0, bad.join(', '));
}

const TRANSITION_ALLOW = new Set([
  'transform', 'opacity', 'clip-path', 'visibility',
  'border-color', 'background-color', 'color', 'none'
]);
const transitions = [...cssCode.matchAll(/transition(?:-property)?\s*:\s*([^;]+);/g)];
ok('found transitions to audit', transitions.length > 0);
for (const [decl, value] of transitions) {
  if (/^transition-(duration|delay|timing-function)/.test(decl)) { continue; }
  const propNames = value.split(',').map((seg) => seg.trim().split(/\s+/)[0]);
  const bad = propNames.filter((p) => !TRANSITION_ALLOW.has(p) && !p.startsWith('var('));
  ok(`transition [${value.trim().slice(0, 48)}] uses only safe properties`, bad.length === 0, bad.join(', '));
  ok(`transition [${value.trim().slice(0, 48)}] is not 'all'`, !propNames.includes('all'));
}

ok('no infinite animation anywhere in lab CSS', !/\binfinite\b/.test(cssCode));
ok('prefers-reduced-motion block present', /@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(files.css));
ok('manual reduced-motion override class present', /\.ml-force-reduced\b/.test(files.css));
ok('no will-change left on persistent elements', !/will-change/.test(files.css));
ok('no backdrop-filter (full-viewport readback on iPad)', !/backdrop-filter/.test(files.css));

// ------------------------------------------------------------ tech bans
section('technology bans');
const codeAll = files.html + files.js + files.runner + files.selftest;
ok('no <canvas>', !/<canvas/i.test(codeAll));
ok('no getContext/WebGL', !/getContext|webgl/i.test(codeAll));
ok('no SMIL <animate>', !/<animate/i.test(files.html) && !/<animate(?:Transform|Motion)?\b/.test(files.js));
ok('no raw location.reload', !/location\.reload/.test(codeAll));
ok('no external network fetches', !/fetch\s*\(|XMLHttpRequest|WebSocket/.test(files.js + files.runner));
ok('lab never reads production data files', !/data\/(store-config|mattresses|quiz|dict)/.test(files.js + files.runner + files.selftest));

// ------------------------------------------------------------ claims rules
section('claims discipline — materials and mechanism, never quantities');
const textOnly = files.html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, ' ');
const visible = textOnly + '\n' + stripJs(files.js); // i18n strings live in the JS
const CLAIM_PATTERNS = [
  [/\d[\d,]*[\s-]*(coils?)\b/i, 'coil counts'],
  [/\d+(?:\.\d+)?\s*(?:-\s*)?(inch|inches|in\.)\b/i, 'height/thickness numbers'],
  [/\b(patent|patented|patente)\b/i, 'patent language'],
  [/\bISO\s?\d/i, 'ISO certification'],
  [/\bEPA\b/, 'EPA registration'],
  [/\b(antimicrobial|anti-microbial|antibacterial|anti-bacterial|antiviral|anti-viral|therapeutic|clinically|doctor|médic)/i, 'medical/therapeutic language'],
  [/\d+\s*(?:°|degrees?|grados?)\s*(cooler|cooling|más fresco)?/i, 'degree-cooling numbers'],
  [/%\s*(more|less|thicker|cooler|firmer|más|menos)/i, 'percentage claims'],
  [/\b(coolest|firmest|most luxurious|most indulgent)\b/i, 'superlatives'],
  [/\bmade in (usa|texas|america)\b/i, 'origin claims'],
  [/marvelous middle|natuverex|cool gel|gel fresco/i, 'withdrawn claim families']
];
for (const [re, label] of CLAIM_PATTERNS) {
  const m = visible.match(re);
  ok(`no ${label}`, !m, m ? `found: "${m[0]}"` : '');
}
ok('honesty chip (spec mode) present in both languages',
  /not SKU-confirmed/.test(files.html) && /no confirmada por SKU/.test(files.js));
ok('honesty chip (demonstration mode) present in both languages',
  /not this model's specification/.test(files.html) && /no las especificaciones de este modelo/.test(files.js));
ok('DO NOT MERGE banner present in the page', /DO NOT MERGE/.test(files.html));
ok('experimental wing labeled not approved', /none of these is approved for production/i.test(files.html));

// -------------------------------------------------------- hygiene
section('tree hygiene (mirrors repo `git diff --check`)');
for (const [name, content] of Object.entries(files)) {
  const trailing = content.split('\n').findIndex((l) => /[ \t]+$/.test(l));
  ok(`${name}: no trailing whitespace`, trailing === -1, trailing >= 0 ? `line ${trailing + 1}` : '');
}

// ----------------------------------------- execute the scene state machine
section('scene runner executed against a fake clock');

const sandboxModule = { exports: {} };
new Function('module', 'self', files.runner + '\n')(sandboxModule, undefined);
const SR = sandboxModule.exports;
ok('runner exports createScene', typeof SR.createScene === 'function');

function makeClock() {
  let now = 0;
  let nextId = 1;
  let tasks = [];
  return {
    now: () => now,
    dropDelays: new Set(),
    setTimeout(fn, ms) {
      const id = nextId++;
      if (!this.dropDelays.has(ms)) { tasks.push({ id, at: now + ms, fn }); }
      return id;
    },
    clearTimeout(id) { tasks = tasks.filter((t) => t.id !== id); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = tasks.filter((t) => t.at <= until).sort((a, b) => a.at - b.at)[0];
        if (!due) { break; }
        tasks = tasks.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = until;
    }
  };
}
function makeAnim() {
  return {
    playState: 'running',
    finishedCaught: false,
    finished: { catch(fn) { this.caught = true; } },
    finish() { this.playState = 'finished'; },
    cancel() { this.playState = 'idle'; }
  };
}
function makeScene({ reduced = false } = {}) {
  const clock = makeClock();
  const created = [];
  const calls = [];
  const env = {
    setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    clearTimeout: (id) => clock.clearTimeout(id),
    animate: () => { const a = makeAnim(); created.push(a); return a; },
    prefersReducedMotion: () => reduced,
    strict: true,
    onIllegalEdge: () => {}
  };
  const scene = SR.createScene({
    name: 'test',
    duration: 1000,
    reducedDuration: 0,
    steps: [
      { at: 0, run: (ctx) => { calls.push('step0'); ctx.animate(); } },
      { at: 500, run: (ctx) => { calls.push('step500'); ctx.animate(); } }
    ],
    applyInitial: () => calls.push('initial'),
    applyFinal: () => calls.push('final')
  }, env);
  return { scene, clock, created, calls };
}

{
  const { scene, clock, calls } = makeScene();
  ok('starts idle', scene.state === 'idle');
  scene.start();
  ok('start -> running', scene.state === 'running');
  ok('start() while running is a no-op', scene.start() === false && scene.state === 'running');
  clock.advance(0);
  ok('step at 0 ran', calls.includes('step0'));
  clock.advance(1000);
  ok('completes to done at duration', scene.state === 'done');
  ok('applyFinal ran on completion', calls.includes('final'));
  ok('watchdog did not fire on a healthy run', !scene.watchdogFired);
  scene.reset();
  ok('reset from done -> idle with applyInitial', scene.state === 'idle' && calls.includes('initial'));
  ok('replay works after reset', scene.start() === true && scene.state === 'running');
}
{
  const { scene, clock, created, calls } = makeScene();
  scene.start();
  clock.advance(100);
  scene.skip();
  ok('skip mid-run -> done', scene.state === 'done');
  ok('skip finishes (not cancels) animations', created.every((a) => a.playState === 'finished'));
  const stepCount = calls.filter((c) => c === 'step500').length;
  clock.advance(2000);
  ok('later steps orphaned after skip (epoch guard)', calls.filter((c) => c === 'step500').length === stepCount);
}
{
  const { scene, clock, created } = makeScene();
  scene.start();
  clock.advance(100);
  scene.reset();
  ok('reset mid-run -> idle', scene.state === 'idle');
  ok('reset cancels (not finishes) animations', created.every((a) => a.playState === 'idle'));
  clock.advance(3000);
  ok('nothing fires after mid-run reset', scene.state === 'idle');
}
{
  const { scene, clock } = makeScene();
  // sabotage the completion timer so only the watchdog can save the scene
  clock.dropDelays.add(1000);
  scene.start();
  clock.advance(1000 + SR.WATCHDOG_GRACE_MS + 1);
  ok('watchdog force-completes a stalled scene', scene.state === 'done' && scene.watchdogFired);
}
{
  const { scene, clock, created, calls } = makeScene({ reduced: true });
  scene.start();
  clock.advance(1);
  ok('reduced branch reaches done immediately', scene.state === 'done');
  ok('reduced branch creates ZERO animations', created.length === 0, `created ${created.length}`);
  ok('reduced branch still applies the final classes', calls.includes('final'));
}

// ---------------------------------------------------------------- summary
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
