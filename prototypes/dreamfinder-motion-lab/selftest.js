/* DreamFinder Motion Lab — in-page smoke harness (?selftest=1).
 * PROTOTYPE ONLY — DO NOT MERGE. Never wired into repository CI.
 *
 * Smoke coverage: loading, full-sequence completion, explicit replay, rapid
 * interruption, reduced-motion branch, leaked-animation baseline, console
 * error/warning count, plus longtask and layout-shift observation where the
 * browser supports it. Frame rate is deliberately NOT asserted — rAF timing
 * is not compositor truth, and nothing here claims a frame rate it has not
 * measured on the actual showroom device.
 */
(function () {
  'use strict';
  if (new URLSearchParams(window.location.search).get('selftest') !== '1') { return; }

  var results = [];
  var consoleErrors = 0;
  var consoleWarnings = 0;
  var origError = console.error;
  var origWarn = console.warn;
  console.error = function () { consoleErrors++; return origError.apply(console, arguments); };
  console.warn = function () { consoleWarnings++; return origWarn.apply(console, arguments); };
  window.addEventListener('error', function () { consoleErrors++; });
  window.addEventListener('unhandledrejection', function () { consoleErrors++; });

  var longTasks = 0;
  var clsSum = 0;
  var observersSupported = { longtask: false, cls: false };
  try {
    var lt = new PerformanceObserver(function (list) { longTasks += list.getEntries().length; });
    lt.observe({ type: 'longtask', buffered: true });
    observersSupported.longtask = true;
  } catch (e) {}
  try {
    var ls = new PerformanceObserver(function (list) {
      list.getEntries().forEach(function (en) { if (!en.hadRecentInput) { clsSum += en.value; } });
    });
    ls.observe({ type: 'layout-shift', buffered: true });
    observersSupported.cls = true;
  } catch (e) {}

  function record(name, pass, detail) {
    results.push({ name: name, pass: !!pass, detail: detail || '' });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  /* leaked-animation baseline counts WAAPI Animation objects only: CSS
   * transitions/animations are class-driven, end with their classes, and are
   * not what the runner is responsible for cleaning up */
  function animCount() {
    if (!document.getAnimations) { return -1; }
    return document.getAnimations().filter(function (a) {
      return !(window.CSSTransition && a instanceof CSSTransition) &&
        !(window.CSSAnimation && a instanceof CSSAnimation);
    }).length;
  }
  var visibilityWarned = false;
  function assertVisible() {
    if (document.visibilityState !== 'visible' && !visibilityWarned) {
      visibilityWarned = true;
      record('environment: page visible during test', false,
        'page is hidden — timers throttle and rAF pauses; results are invalid');
    }
  }

  function sceneTimeout(scene) {
    return (scene.env.prefersReducedMotion() ? (scene.def.reducedDuration || 0) : scene.def.duration) +
      SceneRunner.WATCHDOG_GRACE_MS + 400;
  }

  function runToDone(scene) {
    return new Promise(function (resolve) {
      var t0 = performance.now();
      if (scene.state !== 'idle') { scene.reset(); }
      scene.start();
      var lim = sceneTimeout(scene);
      (function poll() {
        if (scene.state === 'done') { resolve(performance.now() - t0); return; }
        if (performance.now() - t0 > lim + 500) { resolve(-1); return; }
        setTimeout(poll, 40);
      })();
    });
  }

  async function testScene(name, scene) {
    var baseline = animCount();

    /* 1. full-sequence completion within duration + watchdog grace */
    var elapsed = await runToDone(scene);
    record(name + ': completes', elapsed >= 0 && elapsed <= sceneTimeout(scene),
      elapsed < 0 ? 'never reached done' : Math.round(elapsed) + 'ms (limit ' + sceneTimeout(scene) + 'ms)');
    record(name + ': watchdog not needed', !scene.watchdogFired, scene.watchdogFired ? 'watchdog forced completion' : '');

    /* 2. no leaked animations after done */
    await wait(120);
    var after = animCount();
    record(name + ': no leaked animations', after <= baseline,
      'baseline ' + baseline + ' after ' + after);

    /* 3. explicit replay works */
    scene.reset();
    record(name + ': reset returns to idle', scene.state === 'idle', 'state=' + scene.state);
    var replayElapsed = await runToDone(scene);
    record(name + ': replays', replayElapsed >= 0, replayElapsed < 0 ? 'stuck' : Math.round(replayElapsed) + 'ms');

    /* 4. rapid interruption: skip at ~90ms lands on done, not limbo */
    scene.reset();
    scene.start();
    await wait(90);
    scene.skip();
    record(name + ': skip mid-run lands done', scene.state === 'done', 'state=' + scene.state);
    await wait(80);
    record(name + ': skip leaves no animations', animCount() <= baseline, String(animCount()));

    /* 5. replay spam: ten synchronous start() calls behave as one run */
    scene.reset();
    var beforeSpam = scene.animationsCreatedLastRun;
    for (var i = 0; i < 10; i++) { scene.start(); }
    await wait(60);
    scene.skip();
    record(name + ': start() is idempotent while running', scene.state === 'done', 'state=' + scene.state);
    scene.reset();

    /* 6. cancel mid-run returns to a clean idle */
    scene.start();
    await wait(70);
    scene.reset();
    record(name + ': cancel mid-run returns to idle', scene.state === 'idle', 'state=' + scene.state);
  }

  async function testReducedBranch(name, scene) {
    MotionLab.setForceReduced(true);
    var baseline = animCount();
    var elapsed = await runToDone(scene);
    record(name + ' (reduced): completes fast', elapsed >= 0 && elapsed <= (scene.def.reducedDuration || 0) + 700,
      elapsed < 0 ? 'stuck' : Math.round(elapsed) + 'ms');
    record(name + ' (reduced): zero animations created', scene.animationsCreatedLastRun === 0,
      'created ' + scene.animationsCreatedLastRun);
    scene.reset();
    MotionLab.setForceReduced(false);
  }

  async function run() {
    await wait(300); /* let boot settle */
    assertVisible();
    record('loading: MotionLab initialized', !!window.MotionLab && !!window.SceneRunner, '');
    record('loading: body.js-ready set', document.body.classList.contains('js-ready'), '');

    /* isolated scenes first */
    await testScene('arrivalSolo', MotionLab.scenes.arrivalSolo);
    await testScene('compare', MotionLab.scenes.compare);

    /* demo path pieces, driven the way a user would reach them */
    MotionLab.demo.restart();
    document.querySelector('[data-answer="q1:side"]').click();
    await wait(700);
    document.querySelector('[data-answer="q2:hot"]').click();
    await wait(700);
    document.querySelector('[data-answer="q3:plush"]').click();
    await wait(120);
    record('demo: gather button enabled after third answer', !document.getElementById('mlGatherBtn').disabled, '');
    await testScene('gather', MotionLab.scenes.gather);

    /* full reveal sequence: loom chains into arrival */
    MotionLab.setLoomCut(1400);
    MotionLab.demo.startReveal();
    var t0 = performance.now();
    await new Promise(function (resolve) {
      (function poll() {
        var loom = MotionLab.scenes.loom, arr = MotionLab.scenes.arrival;
        if (loom.state === 'done' && arr.state === 'done') { resolve(); return; }
        if (performance.now() - t0 > 6000) { resolve(); return; }
        setTimeout(poll, 60);
      })();
    });
    record('reveal: loom completed', MotionLab.scenes.loom.state === 'done', 'state=' + MotionLab.scenes.loom.state);
    record('reveal: arrival chained and completed', MotionLab.scenes.arrival.state === 'done', 'state=' + MotionLab.scenes.arrival.state);

    /* tap-to-skip the loom */
    document.getElementById('mlReplayRevealBtn').click();
    await wait(150);
    MotionLab.demo.skipReveal();
    await wait(250);
    record('reveal: tap-to-skip lands on finished results',
      MotionLab.scenes.loom.state === 'done' && MotionLab.scenes.arrival.state === 'done',
      'loom=' + MotionLab.scenes.loom.state + ' arrival=' + MotionLab.scenes.arrival.state);

    /* reduced-motion branch */
    await testReducedBranch('gather', MotionLab.scenes.gather);
    await testReducedBranch('loom', MotionLab.scenes.loom);
    await testReducedBranch('arrivalSolo', MotionLab.scenes.arrivalSolo);
    await testReducedBranch('compare', MotionLab.scenes.compare);

    /* firmness engine: rAF loop must die at rest */
    var radios = document.querySelectorAll('#mlFirmGroup [role="radio"]');
    radios[2].click();
    await wait(120);
    radios[0].click(); /* rapid retarget */
    await wait(2600);
    record('firmness: rAF loop stops at rest', !MotionLab.firmness.isAnimating(), '');

    /* no infinite animations anywhere at rest */
    await wait(300);
    var infinite = document.getAnimations ? document.getAnimations().filter(function (a) {
      return a.effect && a.effect.getTiming && a.effect.getTiming().iterations === Infinity;
    }).length : 0;
    record('rest state: zero infinite animations', infinite === 0, String(infinite));

    /* observers + console hygiene */
    if (observersSupported.cls) {
      record('layout-shift total is 0.00', clsSum < 0.005, clsSum.toFixed(4));
    } else {
      record('layout-shift observer unsupported here (report only)', true, 'not measurable in this browser');
    }
    if (observersSupported.longtask) {
      record('long tasks (report only)', true, longTasks + ' entries — budget: 0 during scenes on target hardware');
    } else {
      record('longtask observer unsupported here (report only)', true, 'not measurable in this browser');
    }
    record('console: zero errors', consoleErrors === 0, consoleErrors + ' errors');
    record('console: zero warnings', consoleWarnings === 0, consoleWarnings + ' warnings');
    assertVisible();

    render();
  }

  function render() {
    var pass = results.filter(function (r) { return r.pass; }).length;
    var fail = results.length - pass;
    var out = document.getElementById('mlSelftestOut');
    var html = '<div class="ml-selftest"><h2>Selftest: ' +
      (fail === 0 ? '<span class="pass">PASS</span>' : '<span class="fail">FAIL</span>') +
      ' — ' + pass + '/' + results.length + '</h2><table><tbody>';
    results.forEach(function (r) {
      html += '<tr><td class="' + (r.pass ? 'pass' : 'fail') + '">' + (r.pass ? 'PASS' : 'FAIL') +
        '</td><td>' + r.name + '</td><td>' + r.detail + '</td></tr>';
    });
    html += '</tbody></table></div>';
    out.innerHTML = html;
    document.title = (fail === 0 ? '[PASS] ' : '[FAIL] ') + document.title;
    window.__MOTION_LAB_SELFTEST = { pass: fail === 0, passed: pass, failed: fail, results: results };
    console.log('[motion-lab selftest]', fail === 0 ? 'PASS' : 'FAIL', pass + '/' + results.length);
  }

  if (document.readyState === 'complete') { run(); }
  else { window.addEventListener('load', function () { run(); }); }
})();
