// Sleep Brief — Alternative B ("conservative hierarchy"). PROTOTYPE ONLY.
//
// Renders entirely from the frozen fixture for ctx.lang. Section order is
// today's order (identity -> what-we-test -> journey -> actions), restyled
// for glanceability. Priorities render at the engine's index, order and
// count (1-3) — never padded, filtered, or selected by kind. No score, pct,
// rank number or winner treatment is ever rendered for mattresses.
//
// Copy sources (full inventory in VARIANT-NOTES.md):
//   (a) fixture data (verbatim engine/render output),
//   (b) verbatim production EN/ES pairs, line-cited below,
//   (c) PROPOSED copy — marked data-proposed-copy="" on the element.

(function () {
  "use strict";

  /* ---------------------------------------------------------------- *
   * Verbatim production EN/ES pairs (source: this worktree's          *
   * index.html at 78f949c; line numbers cited per string).            *
   * ---------------------------------------------------------------- */

  // index.html:13484 — the "Try this:" prompt label inside every priority row.
  var TRY_THIS = { en: "Try this: ", es: "Pruébalo: " };

  // index.html:16843 — hf2 compare entry label (the only live compare entry today).
  var COMPARE_FINALISTS = { en: "Compare finalists", es: "Comparar finalistas" };

  // index.html:18902 — compare modal title.
  var COMPARE_TITLE = { en: "Compare Your Finalists", es: "Compara Tus Finalistas" };

  // index.html:18880 — compare modal tier-name map (tier NAME, never pct).
  var TIER_NAMES = {
    en: { gold: "Gold", silver: "Silver", bronze: "Bronze" },
    es: { gold: "Oro", silver: "Plata", bronze: "Bronce" }
  };

  // index.html:18892, 18894, 18895, 18897 — compare modal stat labels.
  var STAT_FEEL = { en: "Feel", es: "Sensación" };
  var STAT_TIER = { en: "Tier", es: "Nivel" };
  var STAT_WHY = { en: "Why it is here", es: "Por qué está aquí" };
  var STAT_DIFF = { en: "Difference", es: "Diferencia" };

  // B8: per-model feel words are consumed from the fixture
  // (entry.firmnessFeelWord {en,es}, executed from the real firmnessFeel()
  // per model at capture time) — the local word-map replica is deleted.

  // data/quiz.json (sleep_position / partner_sleep option labels) — verbatim
  // production config strings, used under a PROPOSED presentation mapping
  // (stored answer id -> badge value). Full mapping table in VARIANT-NOTES.
  var POSITION_LABELS = {
    side: { en: "Side Sleeper", es: "De Lado" },
    back: { en: "Back Sleeper", es: "Boca Arriba" },
    stomach: { en: "Stomach Sleeper", es: "Boca Abajo" },
    combo: { en: "Combination", es: "Combinación" },
    no_idea: { en: "Not Sure", es: "No Estoy Seguro" }
  };
  var SHARING_LABELS = {
    // B2: solo-ES is third person ("Duerme solo"), matching the captured
    // temperature register — deviates from quiz.json's option label and
    // stays flagged for native review in VARIANT-NOTES §4.
    solo: { en: "Solo Sleeper", es: "Duerme solo" },
    partner: { en: "With a Partner", es: "Con Pareja" },
    family: { en: "Family Bed", es: "Cama Familiar" }
  };

  /* ---------------------------------------------------------------- *
   * PROPOSED copy — every use site carries data-proposed-copy="".     *
   * Listed with rationale in VARIANT-NOTES.md.                        *
   * ---------------------------------------------------------------- */
  var PROPOSED = {
    leadLabel: { en: "Where we start", es: "Por dónde empezamos" },
    ctaSee: { en: "See My Matches →", es: "Ver Mis Opciones →" },
    positionDt: { en: "Position", es: "Posición" },
    sharingDt: { en: "Sharing", es: "Cama compartida" }, // B2: aligns with A; "Compañía" did not convey bed-sharing. Native review pending.
    firmnessSrPrefix: { en: "Firmness: ", es: "Firmeza: " },
    firmnessSrOf: { en: " of 10", es: " de 10" },
    simActions: {
      en: "Prototype: navigation buttons are simulated on this screen.",
      es: "Prototipo: los botones de navegación están simulados en esta pantalla."
    },
    simCompare: {
      en: "Prototype simulation — sample saved finalists, not this customer's saves.",
      es: "Simulación del prototipo — finalistas guardados de ejemplo, no los de este cliente."
    },
    fixtureError: { // B7 guard
      en: "Fixture error — no priority rows captured.",
      es: "Error de fixture — no hay filas de prioridades capturadas."
    }
  };

  /* ---------------------------------------------------------------- *
   * Small DOM helpers (textContent only — fixture strings are data).  *
   * ---------------------------------------------------------------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function srOnly(text, proposed) {
    var s = el("span", "sr-only", text);
    if (proposed) s.setAttribute("data-proposed-copy", "");
    return s;
  }

  // Firmness display: 10 discrete segments with N filled (never a continuous
  // fill — the value is an exact integer), graphic aria-hidden, visible
  // word + number also aria-hidden, adjacent sr-only text carrying the
  // required accessible phrasing "Firmness: <word>, n of 10".
  function firmnessDisplay(word, value, lang) {
    var wrap = el("span", "sb-firmness");

    var visible = el("span", "sb-firmness-visible");
    visible.setAttribute("aria-hidden", "true");
    visible.appendChild(el("span", "sb-firmness-word", word));
    visible.appendChild(el("span", "sb-firmness-num", value + "/10"));
    wrap.appendChild(visible);

    var strip = el("span", "sb-firmness-strip");
    strip.setAttribute("aria-hidden", "true");
    for (var i = 1; i <= 10; i++) {
      strip.appendChild(el("span", "sb-firmness-seg" + (i <= value ? " is-filled" : "")));
    }
    wrap.appendChild(strip);

    wrap.appendChild(srOnly(
      PROPOSED.firmnessSrPrefix[lang] + word + ", " + value + PROPOSED.firmnessSrOf[lang],
      true
    ));
    return wrap;
  }

  /* ---------------------------------------------------------------- */

  DF.onReady(function (fixture, ctx) {
    var lang = ctx.lang;
    var L = ctx.L;
    var p = fixture.profile[lang];
    var dom = p.dom;
    var rows = p.priorityRows || []; // engine order, by index — 1 to 3 rows.
    var answers = fixture.meta.answers;

    document.title = lang === "es"
      ? "Resumen de Sueño — Alternativa B (prototipo)"
      : "Sleep Brief — Alternative B (prototype)";

    var app = document.getElementById("app");
    var main = el("main", "sb-wrap");
    main.setAttribute("aria-labelledby", "sb-h1");

    /* ===== 1. IDENTITY ============================================= */
    var identity = el("header", "sb-identity");

    identity.appendChild(el("p", "sb-eyebrow", dom.profileEyebrow.textContent));

    var h1 = el("h1", "sb-title", dom.profileName.textContent); // RETAINED verbatim (index.html:13170)
    h1.id = "sb-h1";
    identity.appendChild(h1);

    // Conversation lead: priorities[0] title + one-line reason, verbatim,
    // BY INDEX. Subordinate to the h1; the same row still renders as item 1
    // of the ordered list below (never filtered out).
    var lead = el("div", "sb-lead");
    var leadLabel = el("p", "sb-lead-label", PROPOSED.leadLabel[lang]);
    leadLabel.setAttribute("data-proposed-copy", "");
    lead.appendChild(leadLabel);
    if (rows[0]) {
      lead.appendChild(el("p", "sb-lead-title", rows[0].title));
      lead.appendChild(el("p", "sb-lead-reason", rows[0].desc));
    } else {
      // B7: the capture floor makes empty priorityRows unreachable, but an
      // empty-priorities fixture must render a visible bilingual error —
      // never throw, never go silently blank.
      var fixtureErr = el("p", "sb-lead-title", PROPOSED.fixtureError[lang]);
      fixtureErr.setAttribute("data-proposed-copy", "");
      lead.appendChild(fixtureErr);
    }
    identity.appendChild(lead);

    // Five signal badges — inert status tags (never buttons, never links,
    // never health-adjacent). Rendered as a <dl>, echoing the production
    // metaStrip semantics. Fixed invariant order (B3 — Blake's spec order,
    // the one Alternative A renders, so the two Briefs compare directly):
    // position -> temperature -> sharing -> feel -> size.
    // metaStrip is consumed positionally: production emits Size(0), Feel(1),
    // Temperature(2) in fixed order (index.html:13213-13216).
    var meta = p.metaStrip;
    var badges = el("dl", "sb-badges");

    function badge(dtText, ddNode, proposed) {
      var b = el("div", "sb-badge");
      if (proposed) b.setAttribute("data-proposed-copy", "");
      b.appendChild(el("dt", "sb-badge-label", dtText));
      var dd = el("dd", "sb-badge-value");
      if (typeof ddNode === "string") dd.textContent = ddNode;
      else dd.appendChild(ddNode);
      b.appendChild(dd);
      return b;
    }

    // Position (PROPOSED mapping of stored answer -> verbatim quiz.json label).
    var posVal = POSITION_LABELS[answers.sleep_position];
    if (posVal) badges.appendChild(badge(PROPOSED.positionDt[lang], L(posVal), true));

    // Temperature (verbatim metaStrip pair).
    if (meta[2]) badges.appendChild(badge(meta[2].label, meta[2].value));

    // Sharing (PROPOSED mapping of stored answer -> quiz.json-derived label;
    // solo-ES register adjusted, see B2 note above).
    var shareVal = SHARING_LABELS[answers.partner_sleep];
    if (shareVal) badges.appendChild(badge(PROPOSED.sharingDt[lang], L(shareVal), true));

    // Feel — doubles as the firmness treatment. Word = the Brief's OWN
    // vocabulary (the captured metaStrip Feel value; inline buckets at
    // index.html:13199), number = the exact fixture integer.
    if (meta[1]) {
      var feelBadge = badge(meta[1].label, firmnessDisplay(meta[1].value, fixture.firmness.value, lang));
      feelBadge.className += " sb-badge--firmness";
      badges.appendChild(feelBadge);
    }

    // Size (verbatim metaStrip pair).
    if (meta[0]) badges.appendChild(badge(meta[0].label, meta[0].value));

    identity.appendChild(badges);

    // Reassurance line retained verbatim (conservative composition keeps
    // this trust sentence; subtitle/summary/reflection prose is subsumed by
    // the badges + conversation lead — see VARIANT-NOTES deviations).
    identity.appendChild(el("p", "sb-reassurance", dom.profileReassurance.textContent));

    main.appendChild(identity);

    /* ===== 2. WHAT WE WILL TEST TOGETHER =========================== */
    var testSection = el("section", "sb-test");
    testSection.setAttribute("aria-labelledby", "sb-test-h2");

    testSection.appendChild(el("p", "sb-eyebrow", dom.profilePlanLabel.textContent));

    var h2test = el("h2", "sb-h2", dom.profilePrioritiesHeading.textContent); // verbatim (index.html:13223)
    h2test.id = "sb-test-h2";
    testSection.appendChild(h2test);

    testSection.appendChild(el("p", "sb-intro", dom.profilePrioritiesIntro.textContent));

    // Ranked priorities: real <ol>, engine order by index, 1-3 items.
    // Ordinal position markers are honest (the order is genuinely ranked);
    // no scores, no percentages. role="list" restores list semantics that
    // some engines drop when list-style is removed.
    var ol = el("ol", "sb-priorities");
    ol.setAttribute("role", "list");
    rows.forEach(function (row, i) {
      var li = el("li", "sb-priority");

      var head = el("div", "sb-priority-head");
      var num = el("span", "sb-priority-num", String(i + 1));
      num.setAttribute("aria-hidden", "true"); // list semantics already announce position
      head.appendChild(num);
      head.appendChild(el("span", "sb-priority-title", row.title));
      // Kind pill: verbatim tag text + captured tagClass. tag-preference has
      // no CSS rule in production (base pill only) — mirrored here as the
      // neutral base style, documented in VARIANT-NOTES.
      head.appendChild(el("span", "sb-pill " + row.tagClass, row.tag));
      li.appendChild(head);

      li.appendChild(el("p", "sb-priority-desc", row.desc));

      // "Try this:" testing detail — KEPT FULLY VISIBLE, typographically
      // subordinated (smaller, indented, consistent last position in every
      // row). This is B's deliberate contrast with disclosure-based
      // treatments, per the w2-progressive-disclosure evidence.
      var test = el("p", "sb-priority-test");
      test.appendChild(el("strong", null, TRY_THIS[lang]));
      test.appendChild(document.createTextNode(row.test));
      li.appendChild(test);

      ol.appendChild(li);
    });
    testSection.appendChild(ol);
    main.appendChild(testSection);

    /* ===== 3. JOURNEY (What happens next) ========================== */
    var journey = el("section", "sb-journey");
    journey.setAttribute("aria-labelledby", "sb-journey-h2");

    // Promoted from a plain div to a real h2 (deviation, documented).
    var h2j = el("h2", "sb-h2", dom.profileJourneyHeading.textContent);
    h2j.id = "sb-journey-h2";
    journey.appendChild(h2j);

    // Verbatim journey steps, re-expressed as a real <ol> (production emits
    // divs with data-step). Steps parsed from the captured innerHTML so text
    // and order stay verbatim. No aria-current: on this surface no step is
    // active yet (the whole rail is upcoming).
    var tmp = document.createElement("div");
    tmp.innerHTML = dom.profileJourneySteps.innerHTML;
    var stepNodes = tmp.querySelectorAll(".profile-launch__journey-step");
    var rail = el("ol", "sb-journey-steps");
    rail.setAttribute("role", "list");
    Array.prototype.forEach.call(stepNodes, function (node) {
      var li = el("li", "sb-journey-step");
      var num = el("span", "sb-journey-num", node.getAttribute("data-step") || "");
      num.setAttribute("aria-hidden", "true");
      li.appendChild(num);
      li.appendChild(el("span", "sb-journey-text", node.textContent));
      rail.appendChild(li);
    });
    journey.appendChild(rail);

    journey.appendChild(el("p", "sb-journey-copy", dom.profileJourneyCopy.textContent));
    main.appendChild(journey);

    /* ===== 4. ACTIONS ============================================== */
    var actions = el("div", "sb-actions");

    var btnRow = el("div", "sb-actions-row");

    // Edit Answers — verbatim label (index.html:13506 via fixture).
    var editBtn = el("button", "sb-btn sb-btn--secondary", dom.profileSecondary.textContent);
    editBtn.type = "button";
    btnRow.appendChild(editBtn);

    // Primary CTA — honest PROPOSED navigation label. Resolves the 1.6
    // mislabel: production's "Compare My Matches →" only navigates to
    // Results; this label claims navigation only.
    var seeBtn = el("button", "sb-btn sb-btn--primary", PROPOSED.ctaSee[lang]);
    seeBtn.type = "button";
    seeBtn.setAttribute("data-proposed-copy", "");
    btnRow.appendChild(seeBtn);

    // Separate compare entry — verbatim "Compare finalists" label
    // (index.html:16843), W3C APG disclosure pattern (aria-expanded +
    // aria-controls on a real button). Chevron is production's existing
    // text-glyph vocabulary (▾, cf. index.html:9888), aria-hidden.
    var cmpBtn = el("button", "sb-btn sb-btn--secondary sb-btn--compare");
    cmpBtn.type = "button";
    cmpBtn.appendChild(document.createTextNode(COMPARE_FINALISTS[lang]));
    var chev = el("span", "sb-chevron", "▾");
    chev.setAttribute("aria-hidden", "true");
    cmpBtn.appendChild(chev);
    cmpBtn.setAttribute("aria-expanded", "false");
    cmpBtn.setAttribute("aria-controls", "sb-compare-panel");
    btnRow.appendChild(cmpBtn);

    actions.appendChild(btnRow);

    // Always-visible prototype caption: navigation here is simulated
    // (explains the Edit / See buttons — nothing is a silent dead end).
    var simNote = el("p", "sb-sim-note", PROPOSED.simActions[lang]);
    simNote.setAttribute("data-proposed-copy", "");
    actions.appendChild(simNote);

    /* --- Simulated 2-up compare panel (from compareDemo) ----------- */
    // B6: the compare panel is its own <section> whose verbatim title pair
    // is a same-level h2, so the document outline no longer nests it under
    // "What happens next".
    var panel = el("section", "sb-compare-panel");
    panel.id = "sb-compare-panel";
    panel.setAttribute("aria-labelledby", "sb-compare-h2");
    panel.hidden = true;

    var simCompare = el("p", "sb-sim-note", PROPOSED.simCompare[lang]);
    simCompare.setAttribute("data-proposed-copy", "");
    panel.appendChild(simCompare);

    var h2c = el("h2", "sb-h3", COMPARE_TITLE[lang]); // .sb-h3 class keeps the panel-title visual size
    h2c.id = "sb-compare-h2";
    panel.appendChild(h2c);

    function findEntry(pick) {
      var arr = fixture.results.tierData[pick.tier] || [];
      for (var i = 0; i < arr.length; i++) {
        if (arr[i].id === pick.id) return arr[i];
      }
      return null;
    }

    // B1: pair = compareDemo.autoPair, computed at capture time by EXECUTING
    // the real extracted compareReviewFinalists() (index.html:17398-17409)
    // against the simulated saved state — consumed verbatim, never re-derived
    // here. (The previous savedOrder.slice(0, 2) local re-derivation, whose
    // comment wrongly claimed "as captured", is deleted.) savedOrder is only
    // consulted to resolve each paired id's tier.
    var savedOrder = fixture.compareDemo.savedOrder || [];
    var autoPair = fixture.compareDemo.autoPair || [];
    var cols = el("ul", "sb-compare-cols"); // unordered: the two finalists carry no rank
    cols.setAttribute("role", "list");
    autoPair.forEach(function (id) {
      var pick = null;
      savedOrder.forEach(function (s) { if (s.id === id) pick = s; });
      if (!pick) return;
      var m = findEntry(pick);
      if (!m) return;
      var li = el("li", "sb-compare-col");

      var name = el("h4", "sb-compare-name", m.name + " ");
      var sym = el("span", "sb-price-tier", fixture.results.priceTierSymbols[pick.tier] || "");
      sym.setAttribute("aria-hidden", "true"); // tier is conveyed as text in the Tier stat
      name.appendChild(sym);
      li.appendChild(name);

      li.appendChild(el("p", "sb-compare-brand",
        m.brand + (m.subBrand ? " · " + m.subBrand : "")));

      function stat(labelText, valueNode) {
        var s = el("div", "sb-stat");
        s.appendChild(el("span", "sb-stat-label", labelText));
        var v = el("span", "sb-stat-val");
        if (typeof valueNode === "string") v.textContent = valueNode;
        else v.appendChild(valueNode);
        s.appendChild(v);
        return s;
      }

      // Feel — per-model word consumed from the fixture (firmnessFeelWord,
      // executed from the real firmnessFeel() per model at capture; B8) +
      // the exact integer, same 10-segment treatment as the Brief's own
      // firmness display.
      li.appendChild(stat(STAT_FEEL[lang],
        firmnessDisplay(L(m.firmnessFeelWord), m.firmness, lang)));

      // Tier — tier NAME, never a percentage.
      li.appendChild(stat(STAT_TIER[lang], TIER_NAMES[lang][pick.tier] || pick.tier));

      // Why it is here — production formula: first captured card-priority
      // row (title — desc), by index, from cardPriorities[lang][id]
      // (cf. index.html:18882-18884). B4: with no captured rows the stat is
      // OMITTED (as Alternative A and results-grouped do) — the previous
      // topPickReason fallback printed customer-agnostic copy under a
      // customer-fit label and did not mirror production's tier-dependent
      // hf2ReasonFor.
      var cardRows = (fixture.results.cardPriorities[lang] || {})[m.id] || [];
      if (cardRows.length) {
        li.appendChild(stat(STAT_WHY[lang], cardRows[0].title + " — " + cardRows[0].desc));
      }

      // Difference — production formula: first differentiator detail
      // (cf. index.html:18897), resolved bilingually.
      var diff = (m.differentiators && m.differentiators[0])
        ? L(m.differentiators[0].detail) : "";
      if (diff) li.appendChild(stat(STAT_DIFF[lang], diff));

      cols.appendChild(li);
    });
    panel.appendChild(cols);
    actions.appendChild(panel);

    main.appendChild(actions);
    app.appendChild(main);

    /* ===== Interactions (all prototype-simulated) ================== */

    // Disclosure toggle — APG disclosure pattern. No live region: the
    // aria-expanded state change is the announcement.
    cmpBtn.addEventListener("click", function () {
      var expanded = cmpBtn.getAttribute("aria-expanded") === "true";
      cmpBtn.setAttribute("aria-expanded", String(!expanded));
      panel.hidden = expanded;
    });

    // Edit / See: navigation is simulated. The caption is always visible;
    // a brief visual pulse points at it so the tap is never a silent no-op.
    // Deliberately no announcement (static prototype — no live regions).
    function flashSimNote() {
      simNote.classList.remove("is-flash");
      void simNote.offsetWidth; // restart the animation
      simNote.classList.add("is-flash");
    }
    editBtn.addEventListener("click", flashSimNote);
    seeBtn.addEventListener("click", flashSimNote);
  });
})();
