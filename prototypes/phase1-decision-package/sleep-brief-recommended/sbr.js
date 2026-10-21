/* Sleep Brief — RECOMMENDED CANDIDATE (A-derived). PROTOTYPE ONLY.
 *
 * Renders entirely from the frozen fixture for ctx.lang (harness contract:
 * DF.onReady). Nothing here recomputes, re-orders, filters, caps or
 * synthesises engine output:
 *   - hero = profile[lang].priorityRows[0] BY INDEX (never by kind);
 *   - priority list = priorityRows verbatim, engine order and count (1-3);
 *   - firmness = the exact captured integer; word = the Brief's own captured
 *     vocabulary (metaStrip "Feel" value);
 *   - "Try this:" testing guidance = the fixture's captured row.test copy,
 *     ALWAYS VISIBLE (adopted from Alternative B).
 *
 * Copy provenance — four explicit classes, each mechanically marked:
 *   (1) FIXTURE-DERIVED — read from the frozen fixture; unmarked.
 *   (2) PRODUCTION-VERBATIM — hardcoded EN/ES pair with its production
 *       index.html line cited; unmarked (byte-identical to production).
 *   (3) PROPOSED product copy — carries data-proposed-copy, a visible dotted
 *       underline, and an sr-only "(proposed copy — not production)" suffix.
 *   (4) PROTOTYPE CHROME — review-surface text that would never ship
 *       (sim caption, legend, fixture-error); carries data-prototype-chrome.
 *
 * Language discipline: NO cross-language fallback. Every non-fixture string
 * is resolved by LX(), which returns null when the active language's value
 * is missing — callers omit the element rather than render English in ES
 * mode. (The shared harness L() retains production's en-fallback semantics;
 * this candidate deliberately does not use it.)
 */
(function () {
  "use strict";

  /* ---------- (2) Verbatim production pairs (source lines cited; see
     VARIANT-NOTES.md copy inventory for the full table) ---------- */
  var VERBATIM = {
    tryThis: { en: "Try this:", es: "Pruébalo:" } // index.html:13484 (trailing space trimmed)
  };

  /* ---------- (3) PROPOSED product copy — every use site is marked
     visibly and for screen readers via markProposed() ---------- */
  var PROPOSED = {
    basis: { en: "In order, based on your answers",
             es: "En orden, según tus respuestas" },
    cta:   { en: "See My Matches →",
             es: "Ver Mis Opciones →" },
    positionDt: { en: "Position", es: "Posición" },
    sharingDt:  { en: "Sharing",  es: "Cama compartida" }
  };

  /* ---------- (4) Prototype chrome — never product copy ---------- */
  var CHROME = {
    simCaption: { en: "Prototype: these actions are simulated — no live app behind this screen.",
                  es: "Prototipo: estas acciones son simuladas — no hay una aplicación real detrás de esta pantalla." },
    legend: { en: "Dotted-underlined text is proposed copy (not production). All other text is fixture-captured or verbatim production copy.",
              es: "El texto con subrayado punteado es copia propuesta (no de producción). Todo el resto del texto proviene del fixture o es copia textual de producción." },
    srProposed: { en: " (proposed copy — not production)",
                  es: " (copia propuesta — no de producción)" },
    fixtureError: { en: "Fixture error — no priority rows captured.",
                    es: "Error de fixture — no hay filas de prioridades capturadas." }
  };

  /* Accessible firmness sentence — phrasing mandated by the roadmap/a11y
     report ("Firmness: Medium, 4 of 10" / "Firmeza: Medio, 4 de 10").
     The TEMPLATE is proposed copy; word and integer are fixture-derived. */
  function firmSrText(word, n, lang) {
    return lang === "es"
      ? "Firmeza: " + word + ", " + n + " de 10"
      : "Firmness: " + word + ", " + n + " of 10";
  }

  /* PROPOSED presentation mappings for the two answer-derived badges.
     Values are verbatim data/quiz.json option labels (config-owned,
     customer-facing, reviewed bilingual copy) rendered for the STORED
     answer id — never softened, reinterpreted or diagnosed; the
     mapping-to-badge is the proposed part. "no_idea" renders its own quiz
     label ("Not Sure") rather than being omitted — the stored answer is
     shown as stored. Health-adjacent answers (sleep_issues,
     health_conditions, partner_disturbance) are never read here at all. */
  var POSITION_BADGE = {
    side:    { en: "Side Sleeper",    es: "De Lado" },
    back:    { en: "Back Sleeper",    es: "Boca Arriba" },
    stomach: { en: "Stomach Sleeper", es: "Boca Abajo" },
    combo:   { en: "Combination",     es: "Combinación" },
    no_idea: { en: "Not Sure",        es: "No Estoy Seguro" }
  };
  var SHARING_BADGE = {
    // solo-ES is third person, matching the captured temperature register
    // ("Duerme con calor"); deviates from quiz.json's option label and stays
    // flagged for native review in VARIANT-NOTES §5.
    solo:    { en: "Solo Sleeper",    es: "Duerme solo" },
    partner: { en: "With a Partner",  es: "Con Pareja" },
    family:  { en: "Family Bed",      es: "Cama Familiar" }
  };

  /* ---------- strict language resolution: NO fallback of any kind ----------
     LX  = OPTIONAL bilingual content: missing value returns null and the
           caller omits the element (DOM and accessible text alike).
     LRq = REQUIRED bilingual copy: missing value is a CONTRACT FAILURE —
           a visible labelled error renders and the script throws. Never
           English, never a label or identifier.
     Language-neutral scalars (names, ids, numeric firmness) bypass both. */
  function LX(obj, lang) {
    if (obj == null) return null;
    if (typeof obj === "string") return obj;
    return obj[lang] != null && obj[lang] !== "" ? obj[lang] : null;
  }
  function LRq(obj, lang, what) {
    var v = LX(obj, lang);
    if (v == null) failContract(lang, what || "unnamed required string");
    return v;
  }
  function failContract(lang, what) {
    var msg = (lang === "es"
      ? "FALLO DE CONTRATO DEL PROTOTIPO — falta la cadena requerida en el idioma activo: "
      : "PROTOTYPE CONTRACT FAILURE — required string missing in the active language: ") + what;
    var host = byId("sbrMain") || document.body;
    if (host) {
      var p = el("p", "contract-failure", msg);
      p.setAttribute("role", "alert");
      p.setAttribute("data-prototype-chrome", "");
      host.appendChild(p);
    }
    throw new Error(msg);
  }

  /* ---------- tiny DOM helpers (textContent only — no injected HTML) ---------- */
  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { var n = byId(id); if (n) n.textContent = value; }
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Proposed-copy marking: attribute (mechanical, both modes), dotted
     underline (visible, via CSS gated to reviewer mode) and an sr-only
     suffix (screen reader, reviewer mode only — the suffix is reviewer
     apparatus inside the accessible name, so evaluation mode renders the
     clean product accessible name; the attribute keeps provenance
     machine-checkable in both modes). */
  var activeLang = "en";
  var activeMode = "reviewer";
  function markProposed(node) {
    node.setAttribute("data-proposed-copy", "");
    if (activeMode !== "evaluation") {
      node.appendChild(el("span", "sr-only",
        LRq(CHROME.srProposed, activeLang, "CHROME.srProposed")));
    }
    return node;
  }

  DF.onReady(function (fixture, ctx) {
    var lang = ctx.lang;
    activeLang = lang;
    activeMode = ctx.mode === "evaluation" ? "evaluation" : "reviewer";
    var prof = fixture.profile[lang];
    var rows = prof.priorityRows || [];

    document.title = lang === "es"
      ? "Resumen de Sueño — candidato recomendado (prototipo)"
      : "Sleep Brief — recommended candidate (prototype)";

    /* ===== Hero: strictly priorityRows[0] BY INDEX ===== */
    // Eyebrow = the fixture's own captured heading (dom.profileName),
    // never a hardcoded pair.
    setText("sbrEyebrow", prof.dom.profileName.textContent);
    if (rows[0]) {
      setText("sbrHeroTitle", rows[0].title);
      setText("sbrHeroLede", rows[0].desc);
    } else {
      // The capture floor makes empty priorityRows unreachable, but the
      // render must never be a silent blank hero — visible bilingual error.
      setText("sbrHeroTitle", LRq(CHROME.fixtureError, lang, "CHROME.fixtureError"));
      byId("sbrHeroTitle").setAttribute("data-prototype-chrome", "");
    }

    renderBadges(fixture, prof, lang);
    renderFirmness(fixture, prof, lang);

    /* ===== Priorities: engine order and count, <ol>, visible tests ===== */
    setText("sbrPrioritiesHeading", prof.dom.profilePrioritiesHeading.textContent);
    var basis = byId("sbrBasis");
    if (basis) {
      basis.textContent = LRq(PROPOSED.basis, lang, "PROPOSED.basis");
      markProposed(basis);
    }
    renderPriorities(rows, lang);
    setText("sbrReassure", prof.dom.profileReassurance.textContent);

    /* ===== Journey rail: verbatim steps as an <ol> ===== */
    setText("sbrJourneyHeading", prof.dom.profileJourneyHeading.textContent);
    renderJourney(prof.dom.profileJourneySteps.innerHTML);
    setText("sbrJourneyCopy", prof.dom.profileJourneyCopy.textContent);

    /* ===== Legend (prototype chrome — reviewer mode only) ===== */
    if (activeMode === "evaluation") {
      byId("sbrLegend").hidden = true;
    } else {
      setText("sbrLegend", LRq(CHROME.legend, lang, "CHROME.legend"));
    }

    /* ===== Actions (prototype-simulated; NO compare entry) ===== */
    setText("sbrEditBtn", prof.dom.profileSecondary.textContent); // fixture == verbatim index.html:13506
    var cta = byId("sbrCtaBtn");
    if (cta) {
      cta.textContent = LRq(PROPOSED.cta, lang, "PROPOSED.cta");
      markProposed(cta);
    }
    if (activeMode === "evaluation") {
      // The technical simulation note is reviewer apparatus; the retained
      // "Prototype — not production" notice lives in the harness bar.
      byId("sbrSimCaption").hidden = true;
    } else {
      setText("sbrSimCaption", LRq(CHROME.simCaption, lang, "CHROME.simCaption"));
    }
    wireSimulatedActions();
  });

  /* ---------- Signal badges: dl with VISIBLE category labels; fixed
     invariant order position, temperature, sharing, feel, size; omit
     anything unanswered/unmapped, never placeholder ---------- */
  function renderBadges(fixture, prof, lang) {
    var list = byId("sbrBadges");
    if (!list) return;
    var answers = (fixture.meta && fixture.meta.answers) || {};
    var meta = prof.metaStrip || [];
    // Captured meta strip order is fixed by production: [0]=Size [1]=Feel [2]=Temperature.
    var sizeEntry = meta[0], feelEntry = meta[1], tempEntry = meta[2];

    var items = [];
    var pos = LX(POSITION_BADGE[answers.sleep_position], lang);
    var posDt = LX(PROPOSED.positionDt, lang);
    if (pos && posDt) items.push({ label: posDt, value: pos, proposed: true });
    if (tempEntry) items.push({ label: tempEntry.label, value: tempEntry.value, proposed: false });
    var share = LX(SHARING_BADGE[answers.partner_sleep], lang);
    var shareDt = LX(PROPOSED.sharingDt, lang);
    if (share && shareDt) items.push({ label: shareDt, value: share, proposed: true });
    if (feelEntry) items.push({ label: feelEntry.label, value: feelEntry.value, proposed: false });
    if (sizeEntry) items.push({ label: sizeEntry.label, value: sizeEntry.value, proposed: false });

    items.forEach(function (item) {
      if (!item.value) return; // omit, never placeholder
      var wrap = el("div", "sbr-badge", null);
      wrap.appendChild(el("dt", "sbr-badge__label", item.label));
      var dd = el("dd", "sbr-badge__value", item.value);
      wrap.appendChild(dd);
      if (item.proposed) markProposed(wrap);
      list.appendChild(wrap);
    });
  }

  /* ---------- Firmness: 10 discrete segments, exact integer, Brief
     vocabulary; graphic + visible fragments aria-hidden, sr sentence is the
     single accessible rendering (template = proposed copy) ---------- */
  function renderFirmness(fixture, prof, lang) {
    var host = byId("sbrFirm");
    if (!host) return;
    var value = fixture.firmness && fixture.firmness.value;
    var feelEntry = (prof.metaStrip || [])[1];
    if (typeof value !== "number" || !feelEntry) return; // omit if uncaptured

    var sr = el("span", "sr-only",
      firmSrText(feelEntry.value, value, lang)
      + (activeMode === "evaluation" ? "" : LRq(CHROME.srProposed, lang, "CHROME.srProposed")));
    sr.setAttribute("data-proposed-copy", ""); // phrasing template is proposed
    host.appendChild(sr);

    var visible = el("div", "sbr-firm__visible", null);
    visible.setAttribute("aria-hidden", "true");
    visible.appendChild(el("span", "sbr-firm__label", feelEntry.label)); // captured metaStrip label
    var strip = el("div", "sbr-firm__strip", null);
    for (var i = 1; i <= 10; i++) {
      strip.appendChild(el("span", "sbr-firm__seg" + (i <= value ? " is-filled" : ""), null));
    }
    visible.appendChild(strip);
    visible.appendChild(el("span", "sbr-firm__value", feelEntry.value + " · " + value + "/10"));
    host.appendChild(visible);
  }

  /* ---------- Priority cards: <ol>, ordinal markers, kind pill from the
     captured render (tag + tagClass), desc visible, "Try this:" testing
     guidance ALWAYS VISIBLE (Alternative B's treatment — the captured
     implication-not-diagnosis copy, typographically subordinated) ---------- */
  function renderPriorities(rows, lang) {
    var list = byId("sbrPriorityList");
    if (!list) return;

    rows.forEach(function (row, i) {
      var li = el("li", "sbr-priority", null);

      var head = el("div", "sbr-priority__head", null);
      var ordinal = el("span", "sbr-priority__ordinal", String(i + 1) + ".");
      ordinal.setAttribute("aria-hidden", "true"); // <ol> semantics already announce position
      head.appendChild(ordinal);
      head.appendChild(el("h3", "sbr-priority__title", row.title));
      head.appendChild(el("span", "sbr-tag " + (row.tagClass || ""), row.tag));
      li.appendChild(head);

      li.appendChild(el("p", "sbr-priority__desc", row.desc));

      // Always-visible testing guidance: fixture row.test verbatim behind
      // the production-verbatim "Try this:" prompt. No disclosure, no tap.
      var test = el("p", "sbr-priority__test", null);
      test.appendChild(el("strong", null, LRq(VERBATIM.tryThis, lang, "VERBATIM.tryThis") + " "));
      test.appendChild(document.createTextNode(row.test));
      li.appendChild(test);

      list.appendChild(li);
    });
  }

  /* ---------- Journey rail: parse the captured step markup, re-emit as <ol>
     items (text verbatim; production renders divs — semantics upgrade is a
     documented deviation) ---------- */
  function renderJourney(stepsHtml) {
    var list = byId("sbrJourneyList");
    if (!list || !stepsHtml) return;
    var tpl = document.createElement("template");
    tpl.innerHTML = stepsHtml; // fixture-captured production markup, parsed detached
    var steps = tpl.content.querySelectorAll(".profile-launch__journey-step");
    Array.prototype.forEach.call(steps, function (step) {
      list.appendChild(el("li", null, step.textContent));
    });
  }

  /* ---------- Simulated Edit/CTA actions ----------
     Mode-neutral tap feedback: the pressed button itself pulses in BOTH
     modes (matching the Results candidate's simPulse), so an evaluation-
     mode tap never appears dead — without it, S1's dry run would record a
     no-visible-consequence tap as a design finding when it was apparatus
     removal (packet-inspector blocker). The labelled caption additionally
     flashes in reviewer mode, where it is visible. */
  var flashTimer = null;
  function wireSimulatedActions() {
    ["sbrEditBtn", "sbrCtaBtn"].forEach(function (id) {
      var btn = byId(id);
      if (!btn) return;
      btn.addEventListener("click", function () {
        btn.classList.add("sim-pulse");
        setTimeout(function () { btn.classList.remove("sim-pulse"); }, 900);
        if (activeMode === "evaluation") return;
        var caption = byId("sbrSimCaption");
        if (!caption) return;
        caption.classList.add("is-flash");
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(function () { caption.classList.remove("is-flash"); }, 1600);
      });
    });
  }
})();
