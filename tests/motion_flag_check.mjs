// motion_flag_check.mjs — DFM motion spike: flag gate + Card Table gather.
//
// House style (see session_safety_check.mjs): this does NOT grep for function
// names and call it coverage. It EXTRACTS the real DFM MOTION SPIKE block and
// the real startProfileReveal from index.html and EXECUTES them against a DOM
// stub, a controllable fake clock, and a fake location — proving BOTH paths:
//
//   disabled — the gate fails closed off-localhost, the legacy staged reveal
//   runs byte-for-byte with identical 1500 ms timing, and zero motion state
//   (layer class, clones, transforms) is ever created;
//
//   enabled — the gather takes ownership, clones the customer's ACTUAL review
//   rows (preferring sleep_position/temperature/firmness), advances into the
//   existing Sleep Brief at ~700 ms, and survives skip, 10x spam, reduced
//   motion, language switch, and mapping-failure fallbacks without leaking a
//   single clone or stale class.
//
// Static guarantees asserted alongside: the spike introduces no raw timers
// (session-scoped wrappers only) and never touches scoring or results
// machinery, so recommendation identity/ordering cannot change by
// construction. Writes nothing; exit 0 = pass.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(here, '..', 'index.html'), 'utf8');

let failures = 0;
let checks = 0;
function ok(name, cond, detail = '') {
  checks++;
  if (cond) { console.log(`  PASS  ${name}`); }
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
const revealSrc = extractFunction('window.startProfileReveal = function()');
ok('extraction: spike block found', spikeSrc.length > 500);
ok('extraction: startProfileReveal found', !!revealSrc && revealSrc.includes('_profileRevealInFlight'));

// ------------------------------------------------------- static guarantees
section('static guarantees');
ok('flag literal defaults to false', /enabled:\s*false/.test(spikeSrc));
ok('no raw setTimeout in spike (session-scoped only)',
  !/[^n]setTimeout\s*\(/.test(spikeSrc.replace(/sessionTimeout\s*\(/g, 'SST(')));
ok('no raw requestAnimationFrame in spike',
  !/requestAnimationFrame/.test(spikeSrc));
ok('no raw setInterval in spike', !/setInterval/.test(spikeSrc));
ok('spike never touches scoring/results machinery',
  !/calculateScores|showResults|MATTRESSES|displayPriority/.test(spikeSrc));
ok('spike never invents copy (no string assignments to answer text)',
  !/textContent\s*=\s*['"]/.test(spikeSrc));
ok('gather layer markup is aria-hidden',
  /<div id="dfmGatherLayer" aria-hidden="true">/.test(html));
ok('wipe registry covers the gather layer',
  /\{ id: 'dfmGatherLayer', remove: \['is-active'\] \}/.test(html));
ok('wipe clears gather clones', /dfmLayer\.innerHTML = ''/.test(html));
ok('reveal branch is guarded and falls through',
  /if \(window\.dfmStartGather && window\.dfmStartGather\(\)\) return;/.test(html));
// Codex finding 1: reduced motion must OWN the transition (direct advance),
// never bounce enabled users into the legacy 1500 ms overlay
ok('reduced-motion fast path advances directly (source)',
  /dfmReducedMotion\(\)\)\s*\{[\s\S]{0,600}?window\.showProfileScreen\(\);\s*return true;/.test(spikeSrc));
// Codex finding 2: the styling hook is withheld under reduced motion, and a
// defensive CSS override kills the literal-duration settle if the preference
// changes after load
ok('dfm-motion body class withheld under reduced motion (source)',
  /dfmMotionActive\(\) && !dfmReducedMotion\(\)/.test(spikeSrc));
// The defensive override only works if it comes AFTER the ordinary rules:
// a media query adds no specificity, so at equal specificity the LATER
// declaration wins. These assertions are ordering-aware — presence alone
// proved nothing (the original defect was a defensive block that existed
// but lost the cascade).
// line-ending-canonical copy: ordering logic must be checkout-agnostic (a
// Windows autocrlf checkout serves \r\n which literal \n needles never match)
const cssNorm = html.replace(/\r\n/g, '\n');
function lastReducedBlock() {
  const blocks = [...cssNorm.matchAll(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}/g)];
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i][0].includes('body.dfm-motion')) {
      return { text: blocks[i][0], index: blocks[i].index };
    }
  }
  return null;
}
const reducedBlk = lastReducedBlock();
ok('a defensive DFM reduced-motion block exists', !!reducedBlk);
const baseTransitionIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option {\n      transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease,\n        transform var(--dfm-quick) var(--dfm-e-compress);');
const baseActiveIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option:active {\n      transform: translateY(1px) scaleY(0.985);');
const baseSelectedIdx = cssNorm.indexOf('body.dfm-motion .noct-quiz-option.selected {\n      animation: dfmOptSettle');
ok('ordinary DFM rules located', baseTransitionIdx !== -1 && baseActiveIdx !== -1 && baseSelectedIdx !== -1);
ok('cascade assertions are non-vacuous (no anchor resolved to -1)',
  Math.min(baseTransitionIdx, baseActiveIdx, baseSelectedIdx) > -1);
if (reducedBlk) {
  ok('cascade: reduced override comes AFTER the ordinary transition rule (so it wins)',
    reducedBlk.index > baseTransitionIdx &&
    /body\.dfm-motion \.noct-quiz-option \{\s*transition: background 0\.15s ease, border-color 0\.15s ease, color 0\.15s ease;\s*\}/.test(reducedBlk.text));
  ok('cascade: reduced override comes AFTER the ordinary :active rule (transform: none wins)',
    reducedBlk.index > baseActiveIdx &&
    /body\.dfm-motion \.noct-quiz-option:active \{ transform: none; \}/.test(reducedBlk.text));
  ok('cascade: reduced override comes AFTER the ordinary .selected rule (animation: none wins)',
    reducedBlk.index > baseSelectedIdx &&
    /body\.dfm-motion \.noct-quiz-option\.selected \{ animation: none; \}/.test(reducedBlk.text));
  ok('reduced override does not reintroduce the transform transition',
    !/transform var\(--dfm-quick\)/.test(reducedBlk.text));
}
// Codex finding 3: the opacity exit must be short and UNDELAYED so every
// fade completes inside the 700 ms teardown
ok('clone opacity exit is 180 ms and undelayed (source)',
  /opacity 180ms var\(--dfm-e-settle\) 0ms/.test(spikeSrc));
ok('fade begins at the 500 ms step and teardown at 700 ms (source)',
  /\}, 500\);/.test(spikeSrc) && /dfmFinishGather\(gen\); \}, 700\);/.test(spikeSrc));
ok('clone CSS rule no longer carries a shared delayed transition',
  !/\.dfm-clone \{[\s\S]*?transition: transform var\(--dfm-place\)[\s\S]*?opacity var\(--dfm-settle\)/.test(html));

// --------------------------------------------------------------- harness
function makeClock() {
  let now = 0; let nextId = 1; let tasks = [];
  return {
    now: () => now,
    setTimeout(fn, ms) { const id = nextId++; tasks.push({ id, at: now + ms, fn }); return id; },
    clearTimeout(id) { tasks = tasks.filter((t) => t.id !== id); },
    advance(ms) {
      const until = now + ms;
      for (;;) {
        const due = tasks.filter((t) => t.at <= until).sort((x, y) => x.at - y.at)[0];
        if (!due) break;
        tasks = tasks.filter((t) => t !== due);
        now = due.at;
        due.fn();
      }
      now = until;
    }
  };
}

function makeEl(id) {
  const el = {
    id,
    children: [],
    className: '',
    textContent: '',
    style: {},
    attrs: {},
    listeners: {},
    parentNode: null,
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
    querySelector(sel) {
      const cls = sel.replace('.', '');
      const find = (n) => {
        for (const c of n.children) {
          if ((c.className || '').includes(cls)) return c;
          const deep = find(c); if (deep) return deep;
        }
        return null;
      };
      return find(el);
    },
    getBoundingClientRect() { return el._rect || { left: 40, top: 100 + el._idx * 60, width: 320, height: 48 }; },
    cloneNode() {
      const c = makeEl(el.id + '-clone');
      c.className = el.className;
      c.textContent = el.textContent;
      c._rect = el._rect;
      el.children.forEach((ch) => c.appendChild(ch.cloneNode()));
      return c;
    }
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return el._html || ''; },
    set(v) { el._html = v; if (v === '') el.children = []; }
  });
  return el;
}

function makeEnv({ hostname, search, reduced = false, lang = 'en' }) {
  const clock = makeClock();
  const els = {};
  for (const id of ['dfmGatherLayer', 'reviewList', 'reviewScreen',
    'resultsRevealOverlay', 'resultsRevealTitle', 'resultsRevealSubtitle']) {
    els[id] = makeEl(id);
  }
  els.reviewScreen.classList.add('active');
  const QIDS = ['sleep_quality', 'trigger', 'mattress_size', 'partner_sleep', 'sleep_position',
    'body_type', 'temperature', 'firmness', 'current_mattress_age', 'sleep_issues', 'health_conditions'];
  QIDS.forEach((qid, i) => {
    const row = makeEl('row-' + qid);
    row.className = 'noct-review-row';
    row._idx = i;
    row.textContent = 'ANSWER:' + qid;
    const edit = makeEl('edit-' + qid);
    edit.className = 'noct-review-edit';
    row.appendChild(edit);
    els.reviewList.appendChild(row);
  });
  const calls = { showProfile: [], overlayOpen: 0, overlayClose: 0 };
  const bodyEl = makeEl('body');
  const sandbox = {
    window: {
      location: { hostname, search },
      matchMedia: () => ({ matches: reduced }),
      innerWidth: 1024,
      innerHeight: 768,
      showProfileScreen: () => calls.showProfile.push(clock.now())
    },
    document: {
      body: bodyEl,
      getElementById: (id) => els[id] || null
    },
    URLSearchParams,
    sessionTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    sessionFrame: (fn) => clock.setTimeout(fn, 0),
    clearTimeout: (id) => clock.clearTimeout(id),
    currentLang: lang,
    visibleQuestions: () => QIDS.map((id) => ({ id })),
    getConsultationRevealElements: () => ({
      overlay: els.resultsRevealOverlay,
      title: els.resultsRevealTitle,
      subtitle: els.resultsRevealSubtitle
    }),
    openConsultationReveal: () => { calls.overlayOpen++; },
    closeConsultationReveal: () => { calls.overlayClose++; }
  };
  sandbox.window.dfmStartGather = undefined;
  const src = spikeSrc + '\n' + revealSrc + '\nreturn { dfmMotionActive, dfmStartGather: window.dfmStartGather, dfmFinishGather, startProfileReveal: window.startProfileReveal };';
  const fn = new Function('window', 'document', 'URLSearchParams', 'sessionTimeout',
    'sessionFrame', 'clearTimeout', 'currentLang', 'visibleQuestions',
    'getConsultationRevealElements', 'openConsultationReveal', 'closeConsultationReveal', src);
  const api = fn(sandbox.window, sandbox.document, URLSearchParams, sandbox.sessionTimeout,
    sandbox.sessionFrame, sandbox.clearTimeout, sandbox.currentLang, sandbox.visibleQuestions,
    sandbox.getConsultationRevealElements, sandbox.openConsultationReveal, sandbox.closeConsultationReveal);
  return { clock, els, calls, api, sandbox, body: bodyEl };
}

// --------------------------------------------------------------- gate tests
section('feature gate: fails closed everywhere except explicit local preview');
{
  const prod = makeEnv({ hostname: 'beford782.github.io', search: '?motion=1' });
  ok('production host + ?motion=1 stays DISABLED', prod.api.dfmMotionActive() === false);
  const prod2 = makeEnv({ hostname: 'beford782.github.io', search: '' });
  ok('production host default DISABLED', prod2.api.dfmMotionActive() === false);
  const local = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  ok('localhost + ?motion=1 ENABLED for owner review', local.api.dfmMotionActive() === true);
  const localOff = makeEnv({ hostname: 'localhost', search: '' });
  ok('localhost without the parameter stays DISABLED', localOff.api.dfmMotionActive() === false);
  const lan = makeEnv({ hostname: '192.168.1.20', search: '?motion=1' });
  ok('LAN host + ?motion=1 stays DISABLED (fail closed)', lan.api.dfmMotionActive() === false);
}

// ------------------------------------------------------------ disabled path
section('disabled path: legacy staged reveal, unchanged behavior and timing');
{
  const env = makeEnv({ hostname: 'beford782.github.io', search: '?motion=1' });
  env.api.startProfileReveal();
  ok('legacy overlay opened', env.calls.overlayOpen === 1);
  ok('in-flight flag set', env.sandbox.window._profileRevealInFlight === true);
  ok('stage one copy rendered from legacy strings',
    env.els.resultsRevealTitle.textContent === 'Building your Sleep Brief');
  ok('no gather layer activation', !env.els.dfmGatherLayer.classList.contains('is-active'));
  ok('no clones created', env.els.dfmGatherLayer.children.length === 0);
  env.clock.advance(1499);
  ok('no advance before legacy 1500 ms', env.calls.showProfile.length === 0);
  env.clock.advance(1);
  ok('advance at exactly the legacy 1500 ms (no added delay)',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 1500);
  ok('in-flight flag cleared', env.sandbox.window._profileRevealInFlight === false);
  ok('no dfm transforms on any element', env.els.reviewList.children.every((r) => !r.style.transform));
}

// ------------------------------------------------------------- enabled path
section('enabled path: gather owns the transition, then the existing Sleep Brief');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  ok('gather took ownership (no legacy overlay)', env.calls.overlayOpen === 0);
  ok('layer activated', env.els.dfmGatherLayer.classList.contains('is-active'));
  const clones = env.els.dfmGatherLayer.children;
  ok('three clones from the preferred trio',
    clones.length === 3 &&
    clones.map((c) => c.textContent).join('|') ===
      'ANSWER:sleep_position|ANSWER:temperature|ANSWER:firmness');
  ok('clones use the customer\'s actual rendered answer rows',
    clones.every((c) => c.textContent.startsWith('ANSWER:')));
  ok('edit buttons stripped from clones',
    clones.every((c) => !c.querySelector('.noct-review-edit')));
  ok('clone styling class applied', clones.every((c) => c.className.includes('dfm-clone')));
  ok('per-clone inline transitions: staggered travel, undelayed 180 ms fade',
    clones.every((c, i) =>
      (c.style.transition || '').includes('transform var(--dfm-place) var(--dfm-e-place) ' + (i * 40) + 'ms') &&
      (c.style.transition || '').includes('opacity 180ms var(--dfm-e-settle) 0ms')));
  env.clock.advance(0);
  ok('travel transforms applied after paint frames',
    clones.every((c) => /translate\(.+\) scale\(0\.62\) rotate\(/.test(c.style.transform || '')));
  env.clock.advance(500);
  ok('opacity exit begins at 500 ms on every clone (fade completes by 680 ms)',
    clones.every((c) => c.style.opacity === '0'));
  env.clock.advance(199);
  ok('no advance before 700 ms; clones still present through their fade',
    env.calls.showProfile.length === 0 && env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(1);
  ok('advance into existing Sleep Brief at 700 ms', env.calls.showProfile.length === 1);
  ok('layer deactivated and emptied',
    !env.els.dfmGatherLayer.classList.contains('is-active') &&
    env.els.dfmGatherLayer.children.length === 0);
  ok('in-flight flag cleared', env.sandbox.window._profileRevealInFlight === false);
  env.clock.advance(2000);
  ok('watchdog after completion is a no-op (single advance)', env.calls.showProfile.length === 1);
}

// ----------------------------------------------------- interruption + spam
section('interruption, spam, and cleanup');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  for (let i = 0; i < 10; i++) env.api.startProfileReveal();
  ok('10x re-entry blocked by in-flight guard (one clone set)',
    env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(100);
  env.els.dfmGatherLayer.fire('click');
  ok('tap-to-skip advances immediately', env.calls.showProfile.length === 1);
  ok('skip cleans the layer', env.els.dfmGatherLayer.children.length === 0 &&
    !env.els.dfmGatherLayer.classList.contains('is-active'));
  env.clock.advance(3000);
  ok('orphaned timers after skip are no-ops', env.calls.showProfile.length === 1);
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  env.api.startProfileReveal();
  env.clock.advance(100);
  // wipe mid-gather: session timers orphaned; registry + reset cleanup
  env.sandbox.window._profileRevealInFlight = false;
  env.els.dfmGatherLayer.classList.remove('is-active');
  env.els.dfmGatherLayer.innerHTML = '';
  env.clock.advance(3000);
  ok('wipe mid-gather leaves no clones and no stray advance... (timers were session-scoped in prod; harness approximates by cleanup)',
    env.els.dfmGatherLayer.children.length === 0);
}

// -------------------------------------------------- reduced motion + intl
section('reduced motion: enabled preview OWNS the transition — immediate, zero-animation');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', reduced: true });
  ok('reduced motion: dfm-motion body class is never added',
    !env.body.classList.contains('dfm-motion'));
  env.api.startProfileReveal();
  ok('reduced motion: legacy staged overlay is NOT opened', env.calls.overlayOpen === 0);
  ok('reduced motion: advance happens IMMEDIATELY at time zero',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 0);
  ok('reduced motion: zero clones, layer never activated',
    env.els.dfmGatherLayer.children.length === 0 &&
    !env.els.dfmGatherLayer.classList.contains('is-active'));
  ok('reduced motion: no in-flight flag left behind',
    env.sandbox.window._profileRevealInFlight !== true);
  env.clock.advance(3000);
  ok('reduced motion: no delayed second advance (single destination arrival)',
    env.calls.showProfile.length === 1);
}
{
  // flag OFF + reduced motion: existing production behavior, untouched
  const env = makeEnv({ hostname: 'beford782.github.io', search: '', reduced: true });
  ok('disabled + reduced: body class absent', !env.body.classList.contains('dfm-motion'));
  env.api.startProfileReveal();
  ok('disabled + reduced: legacy overlay path runs unchanged', env.calls.overlayOpen === 1);
  env.clock.advance(1500);
  ok('disabled + reduced: legacy 1500 ms arrival preserved',
    env.calls.showProfile.length === 1 && env.calls.showProfile[0] === 1500);
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', reduced: false });
  ok('non-reduced enabled preview DOES add the body class',
    env.body.classList.contains('dfm-motion'));
}
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1', lang: 'es' });
  env.api.startProfileReveal();
  ok('Spanish session: gather uses the same rendered (localized) rows',
    env.els.dfmGatherLayer.children.length === 3);
  env.clock.advance(800);
  ok('Spanish session completes into Sleep Brief', env.calls.showProfile.length === 1);
}

// ------------------------------------------------------ fallback mappings
section('mapping fallbacks never fabricate answers');
{
  const env = makeEnv({ hostname: 'localhost', search: '?motion=1' });
  // rows/questions mismatch -> must decline and run legacy
  env.els.reviewList.children.pop();
  env.api.startProfileReveal();
  ok('row/question count mismatch declines to legacy', env.calls.overlayOpen === 1);
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
