/* DreamFinder Motion Lab — scene implementations.
 * PROTOTYPE ONLY — DO NOT MERGE. Never imported by the production application.
 *
 * Content rule enforced throughout: materials and mechanism, never quantities.
 * No coil counts, heights, percentages, degrees, patent/certification language.
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var urlForcedReduced = params.get('reducedmotion') === '1';
  /* ?fullmotion=1 is the mirror seam: headless Chrome defaults to
   * prefers-reduced-motion: reduce, so the harness needs a way to exercise
   * the ANIMATED pipeline there too. Test affordance only. */
  var urlForcedFull = params.get('fullmotion') === '1';
  var manualForcedReduced = false;
  var mql = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* THE single reduced-motion seam. The runner branches on this in JS before
   * any animation is created; CSS token collapse is the visual backstop. */
  function prefersReducedMotion() {
    if (manualForcedReduced || urlForcedReduced) { return true; }
    if (urlForcedFull) { return false; }
    return !!(mql && mql.matches);
  }

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var live = $('#mlLive');
  function announce(en, es) {
    if (!live) { return; }
    live.textContent = (lang === 'es' && es) ? es : en;
  }

  /* ---------- i18n preview (customer-surface strings only) ---------- */
  var lang = params.get('es') === '1' ? 'es' : 'en';
  var ES = {
    'q-count-1': 'Pregunta 10 de 12',
    'q-count-2': 'Pregunta 11 de 12',
    'q-count-3': 'Pregunta 12 de 12',
    'q1': '¿Cómo duermes normalmente?',
    'q2': '¿Cómo duermes en cuanto a temperatura?',
    'q3': '¿Qué nivel de firmeza prefieres?',
    'a-side': 'De Lado', 'a-side-sub': 'Acurrucado',
    'a-back': 'Boca Arriba', 'a-back-sub': 'Acostado de espalda',
    'a-stomach': 'Boca Abajo', 'a-stomach-sub': 'Boca abajo',
    'a-combo': 'Combinación', 'a-combo-sub': 'Me muevo mucho',
    'a-hot': 'Duermo con Calor', 'a-hot-sub': 'Sudores nocturnos, quito las cobijas',
    'a-comf': 'Estoy Cómodo', 'a-comf-sub': 'Sin problemas de temperatura',
    'a-cold': 'Duermo con Frío', 'a-cold-sub': 'Necesito cobijas para calentarme',
    'a-plush': 'Suave', 'a-plush-sub': 'Sensación suave y envolvente',
    'a-medium': 'Medio', 'a-medium-sub': 'Sensación equilibrada',
    'a-firm': 'Firme', 'a-firm-sub': 'Sólido, hundimiento mínimo',
    'btn-gather': 'Reunir el Perfil de Sueño',
    'brief-eyebrow': 'Perfil de Sueño',
    'brief-h': 'Lo que nos dijiste',
    'brief-k1': 'Posición', 'brief-k2': 'Temperatura', 'brief-k3': 'Firmeza preferida',
    'btn-reveal': 'Revelar la recomendación',
    'btn-regather': 'Repetir la reunión',
    'badge-top': 'Mejor Coincidencia',
    'fit-1': 'Sensación suave — la firmeza que elegiste en el cuestionario',
    'fit-2': 'Duermes de lado — tu posición apunta a un perfil de confort más suave',
    'fit-3': 'Dormir con calor queda anotado en tu perfil para la conversación en tienda',
    'btn-construction': 'Ver la construcción',
    'btn-replay-reveal': 'Repetir revelación',
    'btn-restart': 'Reiniciar demo',
    'feel-soft': 'Suave', 'feel-medium': 'Medio', 'feel-firm': 'Firme',
    'firm-caption': 'Tu firmeza elegida — solo demostración',
    'static-soft': 'Suave — hundimiento profundo y localizado',
    'static-medium': 'Medio — hundimiento equilibrado',
    'static-firm': 'Firme — respuesta amplia y superficial',
    'model-generic': 'Demostración genérica',
    'btn-explode': 'Separar las capas',
    'btn-reassemble': 'Reunir las capas',
    'lyr-quilt': 'Funda acolchada',
    'lyr-visco': 'Capa de confort de espuma viscoelástica suave',
    'lyr-coil': 'Unidad de resortes ensacados por zonas',
    'lyr-wool': 'Box top acolchado con mezcla de lana',
    'lyr-gel-u': 'Espuma viscoelástica con gel — superior',
    'lyr-gel-l': 'Espuma viscoelástica con gel — inferior',
    'lyr-gen-comfort': 'Capa de confort',
    'lyr-gen-transition': 'Capa de transición',
    'lyr-gen-core': 'Núcleo de soporte',
    'lyr-gen-base': 'Capa base',
    'chip-spec': 'Materiales según la especificación de fábrica del fabricante (correspondencia sólida, no confirmada por SKU). Geometría esquemática — no a escala.',
    'chip-demo': 'Demostración de construcción — estructura general de un colchón, no las especificaciones de este modelo.',
    'chip-cool': 'Solo representación del material — no se muestra ni se implica rendimiento de temperatura.',
    /* Shared-Bed Priority — prototype-only preview strings; the
     * native-Spanish review gate remains open */
    'sb-title': 'Prioridad de cama compartida',
    'sb-concern': 'El movimiento de tu pareja te importa.',
    'sb-chip': 'Basado en lo que nos dijiste — no es una prueba de rendimiento del producto.',
    'btn-sb-replay': 'Repetir el pliegue de prioridad',
    'btn-cool': 'Mostrar el material de la funda',
    'pose-flat': 'Plana', 'pose-head': 'Cabecera elevada', 'pose-both': 'Cabecera + pies',
    'zone-shoulders': 'Hombros', 'zone-back': 'Zona lumbar', 'zone-hips': 'Caderas'
  };
  var EXPLODE_EN = { explode: 'Separate the layers', reassemble: 'Reassemble the layers' };

  function applyLang() {
    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      if (el.dataset.mlEn === undefined) { el.dataset.mlEn = el.innerHTML; }
      if (lang === 'es' && ES[key]) { el.textContent = ES[key]; }
      else { el.innerHTML = el.dataset.mlEn; }
    });
    document.body.setAttribute('lang', lang);
    var t = $('#mlLangToggle');
    if (t) { t.setAttribute('aria-pressed', lang === 'es' ? 'true' : 'false'); }
    syncExplodeLabel();
  }

  /* ---------- runner environment ---------- */
  var env = {
    setTimeout: function (fn, ms) { return window.setTimeout(fn, ms); },
    clearTimeout: function (id) { window.clearTimeout(id); },
    animate: function (el, keyframes, options) { return el.animate(keyframes, options); },
    prefersReducedMotion: prefersReducedMotion,
    strict: false,
    onIllegalEdge: function (name, from, to) {
      /* logged, never thrown, in normal operation */
      if (window.console && console.warn) { console.warn('[motion-lab] ignored edge', name, from + '->' + to); }
    }
  };

  /* ---------- radiogroup helper (arrow keys + roving tabindex) ---------- */
  function wireRadiogroup(groupEl, onChange) {
    var radios = $$('[role="radio"]', groupEl);
    function select(idx, focus) {
      radios.forEach(function (r, i) {
        r.setAttribute('aria-checked', i === idx ? 'true' : 'false');
        r.tabIndex = i === idx ? 0 : -1;
      });
      if (focus) { radios[idx].focus(); }
      onChange(radios[idx], idx);
    }
    radios.forEach(function (r, i) {
      r.tabIndex = r.getAttribute('aria-checked') === 'true' ? 0 : -1;
      r.addEventListener('click', function () { select(i, false); });
      r.addEventListener('keydown', function (e) {
        var d = 0;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { d = 1; }
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { d = -1; }
        else { return; }
        e.preventDefault();
        select((i + d + radios.length) % radios.length, true);
      });
    });
    return { select: select, radios: radios };
  }

  /* ================= Night Loom (causal cut) ================= */
  /* The customer's three actual Sleep Brief values become LABELED ribbons that
   * visibly leave the brief, cross the warp as labeled threads, resolve into a
   * quilted cover swatch, and the swatch parts into the recommendation. The
   * 1400 ms cut is the only production candidate; 2400 ms exists for
   * side-by-side judgment. */
  var stage = $('#mlStage');
  var loomEl = $('#mlLoom');
  var loomSkipBtn = $('#mlLoomSkip');
  var LOOM_CUTS = {
    1400: { ribbonDur: 380, ribbonStagger: 60, weaveStart: 260, warpStagger: 12, weftBase: 400, weftStep: 90, clothAt: 900, clothDur: 280, tensionAt: 880, partAt: 1080, partDur: 320, veilAt: 640, total: 1400 },
    2400: { ribbonDur: 600, ribbonStagger: 90, weaveStart: 420, warpStagger: 18, weftBase: 700, weftStep: 170, clothAt: 1500, clothDur: 380, tensionAt: 1450, partAt: 1850, partDur: 450, veilAt: 1000, total: 2400 }
  };
  var loomCut = 1400;

  /* weft rows: [brief answer key, y in viewBox, color, direction, ribbon class] */
  var LOOM_THREADS = [
    { q: 'q2', y: 140, color: '#7E9AAE', rtl: false, cls: 'ml-ribbon--temp' },
    { q: 'q3', y: 300, color: '#B8935D', rtl: true, cls: 'ml-ribbon--firm' },
    { q: 'q1', y: 420, color: 'rgba(250,189,15,0.7)', rtl: false, cls: 'ml-ribbon--pos' }
  ];
  var loomRibbons = [];
  var loomTags = [];
  function clearLoomExtras() {
    loomRibbons.concat(loomTags).forEach(function (el) {
      if (el.parentNode) { el.parentNode.removeChild(el); }
    });
    loomRibbons = [];
    loomTags = [];
  }

  function buildLoom() {
    var cut = LOOM_CUTS[loomCut];
    var W = 1000, H = 560, MID = H / 2;
    var warpsX = [80, 185, 290, 395, 500, 605, 710, 815, 920];
    /* weft dash gaps sit at even-index warps, so threads read as passing under */
    var gapsAt = [0, 2, 4, 6, 8].map(function (i) { return warpsX[i]; });
    var x0 = 30, x1 = 970;
    var dashes = [];
    var cursor = x0;
    gapsAt.forEach(function (gx) {
      dashes.push((gx - 8) - cursor, 16);
      cursor = gx + 8;
    });
    dashes.push(x1 - cursor);
    var dash = dashes.join(' ');

    function warpSeg(x, i, yA, yB) {
      return '<path class="warp" d="M' + x + ' ' + yA + ' V' + yB + '"' +
        ' stroke="rgba(184,147,93,0.6)" stroke-width="2" stroke-linecap="butt"' +
        ' style="--d:' + (i * cut.warpStagger) + 'ms"' +
        ' stroke-dasharray="' + (yB - yA) + '" stroke-dashoffset="' + (yB - yA) + '"></path>';
    }
    /* the cloth swatch halves: the threads become a quilted ticking surface,
     * carrying the three labeled bands as woven stripes */
    function clothHalf(name) {
      var isUpper = name === 'upper';
      var path = isUpper
        ? 'M250 280 V120 Q250 96 274 96 H726 Q750 96 750 120 V280 Z'
        : 'M250 280 H750 V440 Q750 464 726 464 H274 Q250 464 250 440 Z';
      var stripes = '';
      LOOM_THREADS.forEach(function (t) {
        var inUpper = t.y < MID;
        if (inUpper !== isUpper) { return; }
        stripes += '<rect x="250" y="' + (t.y - 5) + '" width="500" height="10" fill="' + t.color + '" opacity="0.85"></rect>';
      });
      return '<g class="ml-cloth">' +
        '<path d="' + path + '" fill="url(#mlPatTick)" stroke="rgba(184,147,93,0.45)" stroke-width="1.5"></path>' +
        stripes + '</g>';
    }
    function half(name, yA, yB) {
      var behind = '', front = '';
      warpsX.forEach(function (x, i) {
        if (i % 2 === 1) { behind += warpSeg(x, i, yA, yB); }
        else { front += warpSeg(x, i, yA, yB); }
      });
      var weftMarkup = '';
      LOOM_THREADS.forEach(function (t, wi) {
        var inUpper = t.y < MID;
        if ((name === 'upper') !== inUpper) { return; }
        var delay = (cut.weftBase - cut.weaveStart) + wi * cut.weftStep;
        weftMarkup += '<path class="weft' + (t.rtl ? ' weft--rtl' : '') + '"' +
          ' d="M' + x0 + ' ' + t.y + ' H' + x1 + '"' +
          ' stroke="' + t.color + '" stroke-width="3" stroke-linecap="butt"' +
          ' stroke-dasharray="' + dash + '" style="--d:' + delay + 'ms"></path>';
      });
      return '<g class="ml-loom-' + name + '">' + behind + weftMarkup + front + clothHalf(name) + '</g>';
    }

    loomEl.innerHTML =
      '<svg class="ml-loom-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false">' +
      '<rect class="ml-loom-veil" x="0" y="0" width="' + W + '" height="' + H + '" fill="#14171C"></rect>' +
      '<g class="ml-loom-field">' + half('upper', 0, MID) + half('lower', MID, H) + '</g>' +
      '</svg>';
    loomEl.style.setProperty('--tension-at', (cut.tensionAt - cut.weaveStart) + 'ms');
    loomEl.style.setProperty('--part-at', (cut.partAt - cut.weaveStart) + 'ms');
    loomEl.style.setProperty('--part-dur', cut.partDur + 'ms');
    loomEl.style.setProperty('--cloth-at', (cut.clothAt - cut.weaveStart) + 'ms');
    loomEl.style.setProperty('--cloth-dur', cut.clothDur + 'ms');

    /* persistent labels at each thread's entry edge (aria-hidden: the real
     * values remain in the Sleep Brief's accessible DOM) */
    var stageH = stage.clientHeight || 460;
    var stageW = stage.clientWidth || 900;
    LOOM_THREADS.forEach(function (t, wi) {
      var tag = document.createElement('div');
      tag.className = 'ml-weft-tag';
      tag.setAttribute('aria-hidden', 'true');
      tag.textContent = labelFor(answers[t.q] || defaultAnswer(t.q));
      tag.style.setProperty('--tag-color', t.color);
      tag.style.setProperty('--d', ((cut.weftBase - cut.weaveStart) + wi * cut.weftStep) + 'ms');
      tag.style.top = (t.y / 560 * stageH - 12) + 'px';
      if (t.rtl) { tag.style.right = '10px'; } else { tag.style.left = '10px'; }
      loomEl.appendChild(tag);
      loomTags.push(tag);
    });
  }

  function defaultAnswer(q) {
    return { q1: 'q1:side', q2: 'q2:hot', q3: 'q3:plush' }[q];
  }

  /* labeled ribbons: measured off the actual brief rows, flown to each
   * thread's entry point, fading as the weft takes over */
  function spawnRibbons(ctx) {
    var cut = LOOM_CUTS[loomCut];
    var stageRect = stage.getBoundingClientRect();
    var rows = $$('#mlBrief li');
    var stageH = stageRect.height;
    var stageW = stageRect.width;
    var rowFor = { q1: rows[0], q2: rows[1], q3: rows[2] };
    LOOM_THREADS.forEach(function (t, i) {
      var ribbon = document.createElement('div');
      ribbon.className = 'ml-ribbon ' + t.cls;
      ribbon.setAttribute('aria-hidden', 'true');
      ribbon.textContent = labelFor(answers[t.q] || defaultAnswer(t.q));
      var row = rowFor[t.q];
      var sx = stageW * 0.5 - 70, sy = stageH * 0.3 + i * 44;
      if (row && !steps.brief.hidden) {
        var r = row.getBoundingClientRect();
        sx = r.right - stageRect.left - 150;
        sy = r.top - stageRect.top + (r.height - 30) / 2;
      }
      ribbon.style.left = sx + 'px';
      ribbon.style.top = sy + 'px';
      stage.appendChild(ribbon);
      loomRibbons.push(ribbon);
      var ty = t.y / 560 * stageH - 15;
      var tx = t.rtl ? (stageW - 190) : 16;
      ctx.animate(ribbon, [
        { transform: 'translate(0,0)', opacity: 1, easing: 'cubic-bezier(0.32,0.06,0.20,1)' },
        { transform: 'translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px)', opacity: 1, offset: 0.78, easing: 'cubic-bezier(0.20,0.72,0.20,1)' },
        { transform: 'translate(' + (tx - sx) + 'px,' + (ty - sy) + 'px)', opacity: 0 }
      ], { duration: cut.ribbonDur + 160, delay: i * cut.ribbonStagger, fill: 'both' });
    });
  }

  function makeLoomSteps() {
    var cut = LOOM_CUTS[loomCut];
    return [
      { at: 0, run: function (ctx) {
        clearLoomExtras();
        buildLoom();
        loomEl.hidden = false;
        loomEl.classList.remove('is-done', 'is-weaving');
        brief.classList.add('is-departing');
        spawnRibbons(ctx);
        loomSkipBtn.hidden = false;
        loomSkipBtn.focus();
      } },
      { at: LOOM_CUTS[loomCut].weaveStart, run: function () {
        /* force style flush so the weaving class starts animations cleanly */
        void loomEl.offsetWidth;
        loomEl.classList.add('is-weaving');
      } },
      { at: LOOM_CUTS[loomCut].veilAt, run: function () {
        stage.classList.add('is-dark');
        steps.brief.hidden = true;
      } }
    ];
  }

  var revealStep = $('#mlStepReveal');
  var loomScene = SceneRunner.createScene({
    name: 'loom',
    duration: LOOM_CUTS[loomCut].total,
    reducedDuration: 300,
    steps: makeLoomSteps(),
    reducedRun: function () {
      /* reduced motion bypasses the decorative transformation entirely and
       * lands directly on the same recommendation state */
    },
    applyInitial: function () {
      clearLoomExtras();
      loomEl.classList.remove('is-weaving', 'is-done');
      loomEl.hidden = true;
      loomSkipBtn.hidden = true;
      brief.classList.remove('is-departing');
    },
    applyFinal: function () {
      clearLoomExtras();
      loomEl.classList.remove('is-weaving');
      loomEl.classList.add('is-done');
      loomEl.hidden = true;
      loomSkipBtn.hidden = true;
      brief.classList.remove('is-departing');
      stage.classList.add('is-dark', 'is-reveal');
      steps.q3.hidden = true; /* steps are exclusive even when scenes run out of demo order */
      steps.brief.hidden = true;
      revealStep.hidden = false;
    }
  }, env);

  /* ================= Mattress arrival (runner factory) ================= */
  function makeArrivalScene(name, rootEl) {
    return SceneRunner.createScene({
      name: name,
      duration: 1250,
      reducedDuration: 200,
      steps: [
        { at: 0, run: function () {
          rootEl.classList.remove('is-idle', 'is-done');
          void rootEl.offsetWidth;
          rootEl.classList.add('is-running');
        } }
      ],
      applyInitial: function () {
        rootEl.classList.remove('is-running', 'is-done');
        rootEl.classList.add('is-idle');
      },
      applyFinal: function () {
        rootEl.classList.remove('is-running', 'is-idle');
        rootEl.classList.add('is-done');
      }
    }, env);
  }
  var arrivalScene = makeArrivalScene('arrival', $('#mlArrival'));
  var arrivalSolo = makeArrivalScene('arrivalSolo', $('#mlArrivalSolo'));

  /* ================= Guided demo path ================= */
  var demoGen = 0;
  var answers = { q1: null, q2: null, q3: null };
  var ANSWER_LABEL = {
    'q1:side': ['a-side'], 'q1:back': ['a-back'], 'q1:stomach': ['a-stomach'], 'q1:combo': ['a-combo'],
    'q2:hot': ['a-hot'], 'q2:comfortable': ['a-comf'], 'q2:cold': ['a-cold'],
    'q3:plush': ['a-plush'], 'q3:medium': ['a-medium'], 'q3:firm': ['a-firm']
  };
  function labelFor(key) {
    var k = ANSWER_LABEL[key] ? ANSWER_LABEL[key][0] : null;
    if (!k) { return ''; }
    if (lang === 'es' && ES[k]) { return ES[k]; }
    var el = $('[data-i18n="' + k + '"]');
    return el ? (el.dataset.mlEn !== undefined ? stripTags(el.dataset.mlEn) : el.textContent) : '';
  }
  function stripTags(html) {
    var d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent;
  }

  var steps = {
    q1: $('#mlStepQ1'), q2: $('#mlStepQ2'), q3: $('#mlStepQ3'),
    brief: $('#mlStepBrief'), reveal: $('#mlStepReveal')
  };

  function showStep(id, focusHeading) {
    Object.keys(steps).forEach(function (k) {
      steps[k].hidden = k !== id;
      steps[k].classList.remove('is-exiting', 'is-entering-from');
    });
    if (focusHeading) {
      var h = $('h3', steps[id]) || $('h4', steps[id]);
      if (h) { h.focus(); }
    }
  }

  /* routine question advance: exit 200ms, 60ms hold (the salesperson speaks),
   * enter 320ms. Interruptible: a newer advance simply supersedes. */
  function advanceStep(fromId, toId) {
    var gen = ++demoGen;
    var from = steps[fromId], to = steps[toId];
    if (prefersReducedMotion()) { showStep(toId, true); return; }
    from.classList.add('is-exiting');
    window.setTimeout(function () {
      if (gen !== demoGen) { return; }
      from.hidden = true;
      from.classList.remove('is-exiting');
      window.setTimeout(function () {
        if (gen !== demoGen) { return; }
        to.classList.add('is-entering-from');
        to.hidden = false;
        void to.offsetWidth;
        to.classList.remove('is-entering-from');
        var h = $('h3', to) || $('h4', to);
        if (h) { h.focus(); }
      }, 60);
    }, 200);
  }

  var NEXT = { q1: 'q2', q2: 'q3' };
  $$('.ml-card[data-answer]').forEach(function (card) {
    card.addEventListener('click', function () {
      var key = card.getAttribute('data-answer');
      var q = key.split(':')[0];
      answers[q] = key;
      var group = card.parentElement;
      group.classList.add('has-selection');
      $$('.ml-card', group).forEach(function (c) {
        c.setAttribute('aria-pressed', c === card ? 'true' : 'false');
      });
      if (q === 'q3') {
        $('#mlGatherBtn').disabled = false;
        return; /* the salesperson takes the gather beat explicitly */
      }
      /* non-blocking: the advance rides behind the register-rule draw */
      var gen = ++demoGen;
      window.setTimeout(function () {
        if (gen !== demoGen) { return; }
        advanceStep(q, NEXT[q]);
      }, prefersReducedMotion() ? 0 : 300);
    });
  });

  /* ---------- gather: three answer cards become the Sleep Brief ---------- */
  function fillBrief() {
    $('#mlBriefV1').textContent = labelFor(answers.q1 || 'q1:side');
    $('#mlBriefV2').textContent = labelFor(answers.q2 || 'q2:hot');
    $('#mlBriefV3').textContent = labelFor(answers.q3 || 'q3:plush');
  }
  var brief = $('#mlBrief');
  var gatherClones = [];
  function clearClones() {
    gatherClones.forEach(function (c) { if (c.parentNode) { c.parentNode.removeChild(c); } });
    gatherClones = [];
  }

  var gatherScene = SceneRunner.createScene({
    name: 'gather',
    duration: 1100,
    reducedDuration: 220,
    steps: [
      { at: 0, run: function (ctx) {
        fillBrief();
        steps.q3.hidden = true;
        steps.brief.hidden = false;
        brief.classList.remove('is-shown');
        var sw = stage.clientWidth, sh = stage.clientHeight;
        var stackX = sw * 0.5, stackY = sh * 0.34;
        var origins = [
          { x: sw * 0.18, y: sh * 0.62 },
          { x: sw * 0.50, y: sh * 0.74 },
          { x: sw * 0.82, y: sh * 0.62 }
        ];
        var keys = [answers.q1 || 'q1:side', answers.q2 || 'q2:hot', answers.q3 || 'q3:plush'];
        keys.forEach(function (key, i) {
          var clone = document.createElement('div');
          clone.className = 'ml-card ml-clone';
          clone.setAttribute('aria-hidden', 'true');
          clone.innerHTML = '<span class="ml-card-label"></span>';
          $('.ml-card-label', clone).textContent = labelFor(key);
          clone.style.width = '190px';
          clone.style.left = (stackX - 95) + 'px';
          clone.style.top = (stackY - 30) + 'px';
          clone.style.zIndex = String(5 + i);
          stage.appendChild(clone);
          gatherClones.push(clone);
          var dx = origins[i].x - stackX, dy = origins[i].y - stackY;
          var rot = ((i * 37) % 5) - 2;
          ctx.animate(clone, [
            { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1) rotate(0deg)', opacity: 0.9, easing: 'cubic-bezier(0.20,0.72,0.20,1)' },
            { transform: 'translate(0,0) scale(0.86) rotate(' + rot + 'deg)', opacity: 1, offset: 0.38, easing: 'cubic-bezier(0.16,0.84,0.28,1)' },
            { transform: 'translate(0,0) scale(0.86) rotate(0deg)', opacity: 1, offset: 0.58, easing: 'linear' },
            { transform: 'translate(0,0) scale(0.86) rotate(0deg)', opacity: 1, offset: 0.78, easing: 'linear' },
            { transform: 'translate(0,0) scale(0.92) rotate(0deg)', opacity: 0 }
          ], { duration: 1050, delay: i * 26, fill: 'both' });
        });
      } },
      { at: 640, run: function () {
        brief.classList.add('is-shown');
        var h = $('h3', steps.brief);
        if (h) { h.focus(); }
      } }
    ],
    applyInitial: function () {
      clearClones();
      brief.classList.remove('is-shown', 'is-departing');
      stage.classList.remove('is-dark', 'is-reveal');
      steps.brief.hidden = true;
      steps.reveal.hidden = true; /* steps are exclusive even when scenes run out of demo order */
      steps.q3.hidden = false;
    },
    applyFinal: function () {
      clearClones();
      fillBrief();
      brief.classList.remove('is-departing');
      stage.classList.remove('is-dark', 'is-reveal');
      steps.q3.hidden = true;
      steps.reveal.hidden = true;
      steps.brief.hidden = false;
      brief.classList.add('is-shown');
    }
  }, env);

  $('#mlGatherBtn').addEventListener('click', function () {
    demoGen++;
    if (gatherScene.state === 'done') { gatherScene.reset(); }
    gatherScene.start();
  });
  $('#mlRegatherBtn').addEventListener('click', function () {
    gatherScene.replay();
  });

  /* ---------- reveal: loom then arrival, skippable as one gesture ---------- */
  var loomWasSkipped = false;
  function startReveal() {
    demoGen++;
    loomWasSkipped = false;
    /* the brief stays VISIBLE while its ribbons depart — causality is the
     * whole point; it hides only once the veil covers it (loom step) */
    /* decode the hero image while the loom weaves, so arrival never races it */
    var img = $('#mlHeroImg');
    if (img && img.decode) { img.decode().catch(function () {}); }
    if (arrivalScene.state !== 'idle') { arrivalScene.reset(); }
    if (loomScene.state !== 'idle') { loomScene.reset(); }
    loomScene.def.duration = LOOM_CUTS[loomCut].total;
    loomScene.def.steps = makeLoomSteps();
    loomScene.start();
  }
  loomScene.def.onState = function (state) {
    if (state === 'done') {
      revealStep.hidden = false;
      if (loomWasSkipped || prefersReducedMotion()) {
        arrivalScene.start();
        arrivalScene.skip();
        focusHero();
      } else {
        arrivalScene.start();
      }
    }
  };
  arrivalScene.def.onState = function (state) {
    if (state === 'done') { focusHero(); }
  };
  function focusHero() {
    var h = $('#mlHeroName');
    if (h && !revealStep.hidden) { h.focus(); }
  }
  function skipReveal() {
    if (loomScene.state === 'running') {
      loomWasSkipped = true;
      stage.classList.add('is-dark');
      loomScene.skip();
    } else if (arrivalScene.state === 'running') {
      arrivalScene.skip();
    }
  }
  $('#mlRevealBtn').addEventListener('click', startReveal);
  loomSkipBtn.addEventListener('click', function (e) { e.stopPropagation(); skipReveal(); });
  loomEl.addEventListener('click', skipReveal);
  $('#mlReplayRevealBtn').addEventListener('click', function () {
    revealStep.hidden = true;
    stage.classList.remove('is-dark', 'is-reveal');
    steps.brief.hidden = false; /* ribbons depart from the visible brief */
    if (arrivalScene.state !== 'idle') { arrivalScene.reset(); }
    if (loomScene.state !== 'idle') { loomScene.reset(); }
    startReveal();
  });
  $('#mlToLayersBtn').addEventListener('click', function () {
    var target = $('#scene-layers');
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    var h = $('h3', target);
    if (h) { h.focus({ preventScroll: true }); }
  });
  $('#mlRestartBtn').addEventListener('click', restartDemo);
  function restartDemo() {
    demoGen++;
    if (loomScene.state !== 'idle') { loomScene.reset(); }
    if (arrivalScene.state !== 'idle') { arrivalScene.reset(); }
    if (gatherScene.state !== 'idle') { gatherScene.reset(); }
    answers = { q1: null, q2: null, q3: null };
    $$('.ml-card[data-answer]').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
    $$('.ml-cards').forEach(function (g) { g.classList.remove('has-selection'); });
    $('#mlGatherBtn').disabled = true;
    stage.classList.remove('is-dark', 'is-reveal');
    revealStep.hidden = true;
    showStep('q1', true);
  }

  /* loom duration variant control */
  wireRadiogroup($('[aria-label="Night Loom duration variant"]'), function (radio) {
    loomCut = parseInt(radio.getAttribute('data-loomcut'), 10) || 2400;
  });

  /* gallery arrival replay */
  $('#mlArrivalReplay').addEventListener('click', function () { arrivalSolo.replay(); });

  /* ================= layer separation component ================= */
  var layerUIs = { giselle: $('#mlLayersGiselle'), maria: $('#mlLayersMaria'), generic: $('#mlLayersGeneric') };
  var activeModel = 'giselle';
  var exploded = false;
  var explodeBtn = $('#mlExplodeBtn');
  function syncExplodeLabel() {
    if (!explodeBtn) { return; }
    if (lang === 'es') { explodeBtn.textContent = exploded ? ES['btn-reassemble'] : ES['btn-explode']; }
    else { explodeBtn.textContent = exploded ? EXPLODE_EN.reassemble : EXPLODE_EN.explode; }
    explodeBtn.setAttribute('aria-pressed', exploded ? 'true' : 'false');
  }
  function renderLayers() {
    Object.keys(layerUIs).forEach(function (k) {
      var ui = layerUIs[k];
      ui.hidden = k !== activeModel;
      var on = (k === activeModel) && exploded;
      ui.classList.toggle('is-exploded', on);
      $('.ml-layerstack', ui).classList.toggle('is-exploded', on);
    });
    syncExplodeLabel();
  }
  explodeBtn.addEventListener('click', function () {
    exploded = !exploded;
    renderLayers();
  });
  wireRadiogroup($('#mlLayerModelGroup'), function (radio) {
    activeModel = radio.getAttribute('data-model');
    renderLayers();
  });

  /* ================= synchronized compare (one shared WAAPI clock) ======= */
  var compareEl = $('#mlCompare');
  var compareScene = SceneRunner.createScene({
    name: 'compare',
    duration: 650,
    reducedDuration: 180,
    steps: [
      { at: 0, run: function (ctx) {
        compareEl.classList.add('ml-sync');
        var anims = [];
        $$('.ml-layerstack', compareEl).forEach(function (st) {
          st.classList.add('is-exploded');
          $$('.ml-layer', st).forEach(function (layer) {
            var lift = parseFloat(layer.style.getPropertyValue('--lift')) || 0;
            var i = parseFloat(layer.style.getPropertyValue('--i')) || 0;
            var a = ctx.animate(layer, [
              { transform: 'translateY(0px)' },
              { transform: 'translateY(' + (lift * -22) + 'px)' }
            ], { duration: 380, delay: i * 55, easing: 'cubic-bezier(0.32,0.06,0.20,1)', fill: 'backwards' });
            if (a) { anims.push(a); }
          });
        });
        /* the entire point: every layer on both sides shares one start time */
        if (anims.length && document.timeline && document.timeline.currentTime !== null) {
          var t0 = document.timeline.currentTime;
          anims.forEach(function (a) { a.startTime = t0; });
        }
      } }
    ],
    applyInitial: function () {
      $$('.ml-layerstack', compareEl).forEach(function (st) { st.classList.remove('is-exploded'); });
    },
    applyFinal: function () {
      $$('.ml-layerstack', compareEl).forEach(function (st) { st.classList.add('is-exploded'); });
      compareEl.classList.remove('ml-sync');
    }
  }, env);
  $('#mlCompareReplay').addEventListener('click', function () {
    compareEl.classList.add('ml-sync'); /* collapse instantly, no reverse show */
    compareScene.reset();
    void compareEl.offsetWidth;
    compareScene.start();
  });

  /* ================= firmness surface engine ================= */
  function buildRows(groupEl, rowsY, x0, x1, samples) {
    var paths = [];
    rowsY.forEach(function (y) {
      var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      groupEl.appendChild(p);
      paths.push({ el: p, y: y });
    });
    var xs = [];
    for (var i = 0; i < samples; i++) { xs.push(x0 + (x1 - x0) * (i / (samples - 1))); }
    return { paths: paths, xs: xs };
  }
  function renderRows(grid, dentFn) {
    grid.paths.forEach(function (row, ri) {
      var d = '';
      grid.xs.forEach(function (x, xi) {
        var y = row.y + dentFn(x, row.y, ri);
        d += (xi === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1);
      });
      row.el.setAttribute('d', d);
    });
  }

  /* feel presets: f on the production 1-10 scale (soft 2 / medium 5 / firm 9) */
  var FEEL_F = { soft: 2, medium: 5, firm: 9 };
  var FEEL_RESULT = {
    soft: ['Soft — deep, local sink', 'Suave — hundimiento profundo y localizado'],
    medium: ['Medium — balanced sink', 'Medio — hundimiento equilibrado'],
    firm: ['Firm — shallow, broad response', 'Firme — respuesta amplia y superficial']
  };
  function feelParams(f) {
    return {
      depth: (30 - 2.4 * f) * 0.8,          /* soft sinks deep…            */
      sigma: (78 + 8.5 * f) * 0.62,         /* …firm spreads wide+shallow  */
      pressIn: 270 - 12 * f,
      rebound: 800 - 52 * f,
      rowFall: 0.45
    };
  }

  function FirmnessEngine(svgSel, groupSel) {
    var svg = $(svgSel);
    var grid = buildRows($(groupSel), [30, 46, 62, 78, 94, 110, 126], 12, 308, 33);
    var st = { f: 5, px: 160, py: 62, t: 0, target: 0, raf: 0, last: 0, pressing: false };
    var contact = $('#mlFirmContact');

    function dent(x, y) {
      var p = feelParams(st.f);
      var rowDist = Math.abs(y - st.py) / 16;
      return p.depth *
        Math.exp(-((x - st.px) * (x - st.px)) / (2 * p.sigma * p.sigma)) *
        Math.exp(-rowDist * p.rowFall) * st.t;
    }
    function draw() {
      renderRows(grid, function (x, y) { return dent(x, y); });
      if (contact && svg && svg.id === 'mlFirmSvg') {
        var p = feelParams(st.f);
        contact.setAttribute('cx', st.px);
        contact.setAttribute('cy', st.py);
        contact.setAttribute('rx', (p.sigma * 0.55 * st.t).toFixed(1));
        contact.setAttribute('ry', (7 * st.t).toFixed(1));
      }
    }
    function tick(now) {
      var p = feelParams(st.f);
      /* dt floor: browsers can deliver duplicate rAF timestamps (iOS Safari,
       * virtual-time harnesses); dt=0 would stall the exponential settle and
       * the loop would never reach rest */
      var dt = Math.min(48, Math.max(8, now - (st.last || now)));
      st.last = now;
      var tau = (st.target > st.t ? p.pressIn : p.rebound) / 3;
      st.t += (st.target - st.t) * (1 - Math.exp(-dt / tau));
      draw();
      if (Math.abs(st.target - st.t) > 0.008 || st.pressing) {
        st.raf = window.requestAnimationFrame(tick);
      } else {
        st.t = st.target;
        draw();
        st.raf = 0; /* the loop MUST die at rest — asserted by the selftest */
      }
    }
    function kick() {
      if (prefersReducedMotion()) { st.t = st.target; st.last = 0; draw(); return; }
      if (!st.raf) { st.last = 0; st.raf = window.requestAnimationFrame(tick); }
    }
    function toViewBox(evt) {
      var r = svg.getBoundingClientRect();
      return {
        x: 12 + ((evt.clientX - r.left) / r.width) * 296,
        y: 12 + ((evt.clientY - r.top) / r.height) * 126
      };
    }
    svg.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var pt = toViewBox(e);
      st.px = Math.max(24, Math.min(296, pt.x));
      st.py = Math.max(30, Math.min(126, pt.y));
      st.pressing = true;
      st.target = 1;
      kick();
    });
    svg.addEventListener('pointermove', function (e) {
      if (!st.pressing) { return; }
      var pt = toViewBox(e);
      st.px = Math.max(24, Math.min(296, pt.x));
      st.py = Math.max(30, Math.min(126, pt.y));
    });
    function release() { st.pressing = false; st.target = 0; kick(); }
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);
    svg.addEventListener('pointerleave', function () { if (st.pressing) { release(); } });

    draw();
    return {
      state: st,
      setFeel: function (feel) {
        st.f = FEEL_F[feel] || 5;
        /* one demonstration press at panel center — tap-driven, never looped */
        st.px = 160; st.py = 70;
        if (prefersReducedMotion()) { st.t = 1; draw(); return; }
        st.target = 1;
        kick();
        window.clearTimeout(st.holdTimer);
        st.holdTimer = window.setTimeout(function () { st.target = 0; kick(); }, 400 + feelParams(st.f).pressIn);
      },
      isAnimating: function () { return !!st.raf; },
      draw: draw
    };
  }
  var firmness = FirmnessEngine('#mlFirmSvg', '#mlFirmRows');
  wireRadiogroup($('#mlFirmGroup'), function (radio) {
    var feel = radio.getAttribute('data-feel');
    firmness.setFeel(feel);
    var r = FEEL_RESULT[feel];
    announce(r[0], r[1]);
  });

  /* static reduced-motion figures: same math, three frozen presets */
  $$('#mlFirmStatic svg').forEach(function (svg) {
    var feel = svg.getAttribute('data-staticfeel');
    var f = FEEL_F[feel];
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('stroke', 'rgba(245,239,228,0.5)');
    g.setAttribute('stroke-width', '1.2');
    g.setAttribute('fill', 'none');
    svg.appendChild(g);
    var grid = buildRows(g, [18, 32, 46, 60, 74, 88], 8, 192, 25);
    var p = feelParams(f);
    renderRows(grid, function (x, y) {
      var rowDist = Math.abs(y - 46) / 14;
      return p.depth * 0.62 *
        Math.exp(-((x - 100) * (x - 100)) / (2 * p.sigma * p.sigma * 0.4)) *
        Math.exp(-rowDist * p.rowFall);
    });
  });

  /* ================= experimental: shared-bed priority ================= */
  /* The customer's recorded shared-bed concern becomes a stitched fabric
   * label and tucks into the Sleep Brief as a priority card. Records a
   * priority; demonstrates nothing about mattress performance. */
  var sharedBedEl = $('#mlSharedBed');
  var sharedBedScene = SceneRunner.createScene({
    name: 'sharedbed',
    duration: 1050,
    reducedDuration: 0,
    steps: [
      { at: 0, run: function () {
        sharedBedEl.classList.remove('is-idle', 'is-done');
        void sharedBedEl.offsetWidth;
        sharedBedEl.classList.add('is-running');
      } }
    ],
    applyInitial: function () {
      sharedBedEl.classList.remove('is-running', 'is-done');
      sharedBedEl.classList.add('is-idle');
    },
    applyFinal: function () {
      sharedBedEl.classList.remove('is-running', 'is-idle');
      sharedBedEl.classList.add('is-done');
    }
  }, env);
  $('#mlSharedBedReplay').addEventListener('click', function () {
    sharedBedScene.replay();
  });

  /* ================= experimental: cooling textile ================= */
  var cool = $('#mlCoolSwatch');
  var coolTimer = 0;
  $('#mlCoolBtn').addEventListener('click', function () {
    cool.classList.add('is-cool');
    if (prefersReducedMotion()) { return; }
    cool.classList.remove('is-sheen');
    void cool.offsetWidth;
    cool.classList.add('is-sheen');
    window.clearTimeout(coolTimer);
    coolTimer = window.setTimeout(function () { cool.classList.remove('is-sheen'); }, 1100);
  });

  /* ================= experimental: adjustable-base articulation ========== */
  var BASE_POSE = {
    flat: { head: 0, foot: 0, en: 'Base position: flat', es: 'Posición de la base: plana' },
    head: { head: 18, foot: 0, en: 'Base position: head raised', es: 'Posición de la base: cabecera elevada' },
    both: { head: 18, foot: -9, en: 'Base position: head and foot raised', es: 'Posición de la base: cabecera y pies elevados' }
  };
  var baseHead = $('#mlBaseHead');
  var baseFoot = $('#mlBaseFoot');
  wireRadiogroup($('#mlBaseGroup'), function (radio) {
    var pose = BASE_POSE[radio.getAttribute('data-pose')] || BASE_POSE.flat;
    baseHead.style.transform = 'rotate(' + pose.head + 'deg)';
    baseFoot.style.transform = 'rotate(' + pose.foot + 'deg)';
    announce(pose.en, pose.es);
  });

  /* ================= experimental: priority mapping ================= */
  $$('#mlZoneGroup [data-zone]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var band = document.getElementById(btn.getAttribute('data-zone'));
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      band.classList.toggle('is-active', on);
    });
  });

  /* ================= review-bar toggles + boot ================= */
  function syncReducedUI() {
    var on = prefersReducedMotion();
    document.body.classList.toggle('is-reduced', on);
    var t = $('#mlReducedToggle');
    if (t) { t.setAttribute('aria-pressed', manualForcedReduced ? 'true' : 'false'); }
  }
  $('#mlReducedToggle').addEventListener('click', function () {
    manualForcedReduced = !manualForcedReduced;
    document.documentElement.classList.toggle('ml-force-reduced', manualForcedReduced);
    syncReducedUI();
    firmness.draw();
  });
  if (mql && mql.addEventListener) { mql.addEventListener('change', syncReducedUI); }
  $('#mlLangToggle').addEventListener('click', function () {
    lang = lang === 'es' ? 'en' : 'es';
    applyLang();
    fillBrief();
  });

  /* progressive enhancement: everything above is wired, so enable controls */
  $$('button[disabled]').forEach(function (b) { b.disabled = false; });
  $('#mlGatherBtn').disabled = true; /* until the third answer exists */
  document.body.classList.add('js-ready');
  if (urlForcedReduced) { document.documentElement.classList.add('ml-force-reduced'); }
  if (urlForcedFull) { document.documentElement.classList.add('ml-force-full'); }
  syncReducedUI();
  if (lang === 'es') { applyLang(); }
  showStep('q1', false);
  renderLayers();

  /* ?scene=<name> deep-link: scroll to and start one runner scene on load —
   * used for owner review links and for deterministic frame capture.
   * &freeze=<ms> additionally pauses every animation and SEEKS it to that
   * timestamp (runner timers cleared), leaving a still of the scene at that
   * exact moment for screenshots. Capture affordance only. */
  var deepLink = params.get('scene');
  if (deepLink) {
    window.setTimeout(function () {
      try {
      var sceneMap = { arrival: arrivalSolo, compare: compareScene, sharedbed: sharedBedScene };
      var scn = sceneMap[deepLink];
      if (!scn) { return; }
      var freeze = parseInt(params.get('freeze'), 10);
      if (!(freeze > 0)) {
        /* review-link mode scrolls to the scene; capture mode must not —
         * headless screenshots of a programmatically scrolled page render
         * only the background */
        var host = { arrival: '#scene-arrival', compare: '#scene-compare', sharedbed: '#mlSharedBed' }[deepLink];
        var el = $(host);
        if (el) { el.scrollIntoView({ block: 'center' }); }
      }
      if (scn.state !== 'idle') { scn.reset(); }
      scn.start();
      if (freeze > 0) {
        document.documentElement.setAttribute('data-ml-freeze-armed', String(freeze));
        /* double-nested macrotask: runs right after the scene's 0 ms step,
         * still within the first milliseconds — the seek makes the WHEN
         * irrelevant, only the ORDER matters */
        window.setTimeout(function () { window.setTimeout(function () {
          scn._clearTimers();
          document.getAnimations().forEach(function (a) {
            try { a.pause(); a.currentTime = freeze; } catch (e) {}
          });
          /* marker for capture tooling: confirms the still was taken */
          document.documentElement.setAttribute('data-ml-frozen', String(freeze));
        }, 0); }, 0);
      }
      } catch (e) {
        /* surfaced for capture tooling — a silent deep-link failure would
         * otherwise masquerade as a default-state screenshot */
        document.documentElement.setAttribute('data-ml-deeplink-error', String(e && e.message || e));
      }
    }, 0);
  }

  /* surface for the selftest harness — lab-internal, no production coupling */
  window.MotionLab = {
    scenes: { gather: gatherScene, loom: loomScene, arrival: arrivalScene, arrivalSolo: arrivalSolo, compare: compareScene, sharedbed: sharedBedScene },
    firmness: firmness,
    demo: { restart: restartDemo, answers: function () { return answers; }, startReveal: startReveal, skipReveal: skipReveal },
    setLoomCut: function (v) { loomCut = v; },
    getLoomCut: function () { return loomCut; },
    setForceReduced: function (v) {
      manualForcedReduced = !!v;
      document.documentElement.classList.toggle('ml-force-reduced', manualForcedReduced);
      syncReducedUI();
    },
    prefersReducedMotion: prefersReducedMotion,
    setLang: function (v) { lang = v === 'es' ? 'es' : 'en'; applyLang(); fillBrief(); }
  };
})();
