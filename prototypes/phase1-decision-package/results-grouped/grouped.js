// Results — grouped (single-open accordion). Phase 1 prototype, variant-owned JS.
//
// PROTOTYPE ONLY — renders frozen fixture data (captured from main = 78f949c)
// via the shared harness. Never imported or executed by production. Nothing
// here recomputes, re-sorts, filters, caps or re-tiers engine output: tier
// membership, within-tier order, priority rows, firmness integers and
// meetsMatchThreshold flags all come verbatim from the fixture.
//
// Interactions in this file (accordion open/close, compare selection, the
// 2-up compare panel) are PROTOTYPE SIMULATIONS. No analytics are implemented
// anywhere (see VARIANT-NOTES.md, "Analytics consequence" — document only).
//
// String sources (see VARIANT-NOTES.md for the full inventory):
//   (a) fixture data (frozen),
//   (b) verbatim production EN/ES pairs — each carries its index.html line
//       cite (worktree at 78f949c) or data/store-config.json key in a comment,
//   (c) PROPOSED copy — marked with data-proposed-copy="" on the element.

(function () {
  "use strict";

  // Fixed production tier order — index.html:11717-11718 (var TIERS = [...]).
  var TIERS = ["gold", "silver", "bronze"];

  DF.onReady(function (fixture, ctx) {
    var lang = ctx.lang;
    var es = lang === "es";
    var L = ctx.L;

    /* ================= Verbatim production strings =================
       All EN/ES pairs below are copied byte-verbatim from the read-only
       production sources at 78f949c. */
    var STR = {
      // index.html:13814
      eyebrow: { en: "Your matches", es: "Tus opciones" },
      // index.html:13815-13817 (verbatim innerHTML incl. the accent span)
      headlineHtml: {
        en: 'Your <span class="accent">strongest matches</span> are ready',
        es: 'Tus opciones <span class="accent">más compatibles</span> están listas'
      },
      // index.html:13818-13820
      subhead: {
        en: "Start with the first option, then compare how the others feel. Your comfort decides what stays.",
        es: "Empieza con la primera opción y compara cómo se sienten las demás. Tu comodidad decide cuál permanece."
      },
      // index.html:13857-13859 (tier tab labels, verbatim)
      tierLabel: {
        gold:   { en: "GOLD",   es: "ORO" },
        silver: { en: "SILVER", es: "PLATA" },
        bronze: { en: "BRONZE", es: "BRONCE" }
      },
      // Tier descriptor subtitles removed (correction pass, 2026-08-07):
      // the roadmap already decided buyer-characterising tier language
      // ("Bronze · entry-level" / "Bronce · básico") must go, and no
      // replacement subtitle is rendered anywhere in the package — any
      // subtitle copy needs explicit approval first. Production's
      // descriptor line (index.html:13877-13883) is unchanged and flagged.
      // NOTE this variant is retained as REJECTED EXPLORATION (see
      // VARIANT-NOTES header); this edit only removes the flagged copy.
      // index.html:19201-19203 (drawer tier-name map; same pairs at 18880)
      tierName: {
        gold:   { en: "Gold",   es: "Oro" },
        silver: { en: "Silver", es: "Plata" },
        bronze: { en: "Bronze", es: "Bronce" }
      },
      // index.html:14131-14133 (top-pick eyebrow, threshold-honest pair)
      bestStart: { en: "Best place to start", es: "El mejor punto de partida" },
      // index.html:14083 / 14159 (below-threshold label, both card kinds)
      comparisonOption: { en: "Additional comparison option", es: "Opción adicional para comparar" },
      // index.html:14158 (supporting-card match line)
      matchesPriorities: { en: "Matches your priorities", es: "Coincide con tus prioridades" },
      // index.html:14265-14267
      moreDirections: { en: "More directions to compare", es: "Más opciones para comparar" },
      // index.html:14160 (supporting-card stock line; used on all cards here —
      // the lead card's production string interpolates storeName, which the
      // fixture does not carry — see VARIANT-NOTES deviations)
      inStock: { en: "In stock", es: "Disponible" },
      // index.html:14259 (empty-tier state)
      emptyTier: { en: "No strong matches in this tier.", es: "No hay coincidencias fuertes en este nivel." },
      // (diffLabel removed with the card-face differentiators block — fix G3;
      // the compare panel's Difference row keeps its own verbatim label below)
      // index.html:18895 (compare-modal stat label, reused as the customer-fit
      // layer label — production renders priorities[0] under this exact label)
      whyHere: { en: "Why it is here", es: "Por qué está aquí" },
      // index.html:18892 (compare-modal stat label)
      feel: { en: "Feel", es: "Sensación" },
      // index.html:18894 (compare-modal stat label)
      tier: { en: "Tier", es: "Nivel" },
      // index.html:18897 (compare-modal stat label)
      difference: { en: "Difference", es: "Diferencia" },
      // index.html:18901-18902 (compare modal title)
      compareTitle: { en: "Compare Your Finalists", es: "Compara Tus Finalistas" },
      // index.html:18850 (tray count line — bilingual in production JS)
      trayCount: function (n) {
        return es ? n + " de 2 seleccionados" : n + " of 2 selected";
      },

      // ----- Financing (Payment Choice) — data/store-config.json financing.copy,
      // verbatim key values. ES copy status: "pending-native-legal-review"
      // (financing.esReviewStatus) — flagged in VARIANT-NOTES.
      finEyebrow:  { en: "LACKS PAYMENT CHOICE", es: "OPCIONES DE PAGO LACKS" },                     // copy.eyebrow
      finHeadline: { en: "Better sleep. More ways to bring it home.", es: "Duerme mejor. Más opciones para llevarlo a casa." }, // copy.headline
      finLead:     { en: "Your strongest mattress match may have more than one way to bring it home.", es: "Tu mejor opción de colchón puede tener más de una forma de llegar a casa." }, // copy.resultsLead
      finFitFirst: { en: "Your matches are based on sleep fit — never on payment method.", es: "Tus opciones se basan en tu descanso — nunca en la forma de pago." }, // copy.fitFirst
      finExplore:  { en: "Explore payment options", es: "Explorar opciones de pago" },               // copy.cta
      finAsk:      { en: "Plan the conversation", es: "Planear la conversación" }                    // copy.resultsAsk
      // finStale removed (fix G12c): production renders exactly six strings in
      // #resultsFinancing (index.html:10972-10980); staleNotice renders only
      // inside the financing sheet (index.html:10825-10837), which this
      // prototype does not build — so the stale-closed state has no visible
      // marker on this surface, matching production.
    };

    /* ================= PROPOSED copy (category c) =================
       Every use site carries data-proposed-copy="". Full rationale table in
       VARIANT-NOTES.md. */
    var PROPOSED = {
      aboutModel: { en: "About this model", es: "Sobre este modelo" },
      compareToggle: { en: "Compare", es: "Comparar" },
      // Tray statics: EN "Clear" / "Compare →" are verbatim production statics
      // (index.html:18984 / 18986); the ES halves are PROPOSED — the shipped
      // tray statics are English-only (dormant UI, w1-compare-path §1.3).
      trayClear: { en: "Clear", es: "Borrar" },
      trayGo: { en: "Compare →", es: "Comparar →" },
      selectTwo: { en: "Select 2 mattresses to compare.", es: "Selecciona 2 colchones para comparar." },
      simNote: {
        en: "Prototype simulation — this panel stands in for the production compare view. The working production entry is the Consultation Summary's “Compare finalists” button; the card-level path shown here is dormant in production.",
        es: "Simulación del prototipo — este panel representa la vista de comparación de producción. La entrada de producción que funciona es el botón “Comparar finalistas” del resumen de consulta; la ruta desde las tarjetas que se muestra aquí está inactiva en producción."
      },
      // Brief-mandated accessible firmness phrasing (sr-only):
      // "Firmness: Medium, 4 of 10" / "Firmeza: Medio, 4 de 10".
      firmnessSr: function (word, n) {
        return es ? "Firmeza: " + word + ", " + n + " de 10" : "Firmness: " + word + ", " + n + " of 10";
      },
      // Financing inert-interaction note (fix G12b) — the same bilingual
      // sim-note the variant's other simulated sections carry; the disabled
      // financing buttons were the one unlabelled dead end.
      finSim: {
        en: "Simulated — buttons are inactive in this prototype.",
        es: "Simulado — los botones están inactivos en este prototipo."
      }
    };

    // The local firmnessFeel word map is DELETED (fix G15 / fixture
    // regeneration): every fixture tier entry now carries firmnessFeelWord
    // {en,es}, executed from the real production firmnessFeel per model at
    // capture time — consumed via L(m.firmnessFeelWord), never re-bucketed
    // locally.

    /* ================= helpers ================= */

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }
    function P(node) { node.setAttribute("data-proposed-copy", ""); return node; }

    var tierData = fixture.results.tierData;
    var cardPriorities = (fixture.results.cardPriorities && fixture.results.cardPriorities[lang]) || {};
    var priceTierSymbols = fixture.results.priceTierSymbols || {};

    // Localized page title (fix G13; both Sleep Brief variants do the same).
    document.title = lang === "es"
      ? "Resultados — agrupados (acordeón de apertura única) · prototipo Fase 1"
      : "Results — grouped (single-open accordion) · Phase 1 prototype";

    // id -> { m, tier } lookup across all tiers (fixture order preserved).
    var byId = {};
    TIERS.forEach(function (tier) {
      (tierData[tier] || []).forEach(function (m) { byId[m.id] = { m: m, tier: tier }; });
    });

    /* ================= state (prototype-only) ================= */
    // Gold open by default = the engine's own default (_resultsState.activeTier
    // = 'gold', index.html:14558). Exactly one section open at a time.
    var openTier = "gold";
    var compareSel = [];   // selection order preserved; cap 2 (mirrors index.html:18827)
    var panelOpen = false;

    /* ================= build ================= */

    var app = document.getElementById("app");
    var main = el("main", "rg-main");
    main.setAttribute("aria-labelledby", "rgHeadline");
    app.appendChild(main);

    // --- Header (verbatim production results chrome) ---
    main.appendChild(el("p", "rg-eyebrow", L(STR.eyebrow)));
    var h1 = el("h1", "rg-headline");
    h1.id = "rgHeadline";
    h1.innerHTML = L(STR.headlineHtml); // verbatim production markup (13815-13817)
    main.appendChild(h1);
    main.appendChild(el("p", "rg-subhead", L(STR.subhead)));

    // --- Trial-focus strip (captured production markup from the fixture) ---
    var focusHtml = fixture.profile[lang] && fixture.profile[lang].resultsTrialFocus;
    if (focusHtml) {
      var strip = el("div", "rg-trial-focus");
      strip.innerHTML = focusHtml; // frozen fixture capture of renderResultsTrialFocus output
      main.appendChild(strip);
    }

    // --- Accordion (W3C APG accordion pattern; single-open) ---
    var acc = el("div", "rg-acc");
    main.appendChild(acc);

    var accBtns = {};
    var accPanels = {};

    TIERS.forEach(function (tier) {
      var item = el("div", "rg-acc-item");
      item.setAttribute("data-tier", tier);

      var h2 = el("h2", "rg-acc-h");
      var btn = el("button", "rg-acc-btn");
      btn.type = "button";
      btn.id = "rgAccBtn-" + tier;
      btn.setAttribute("aria-controls", "rgAccPanel-" + tier);
      btn.setAttribute("data-tier", tier);

      btn.appendChild(el("span", "rg-acc-label", L(STR.tierLabel[tier])));
      // Descriptor subtitle no longer renders (correction pass — see the
      // STR comment above). The header carries the tier label alone; the
      // fix-G8 duplicate-tier-word handling went with the descriptor.
      var chev = el("span", "rg-acc-chevron", "▾");
      chev.setAttribute("aria-hidden", "true");
      btn.appendChild(chev);

      btn.addEventListener("click", function () { setOpenTier(tier); });
      h2.appendChild(btn);
      item.appendChild(h2);

      var panel = el("div", "rg-acc-panel");
      panel.id = "rgAccPanel-" + tier;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btn.id);
      buildPanelContent(panel, tier);
      item.appendChild(panel);

      accBtns[tier] = btn;
      accPanels[tier] = panel;
      acc.appendChild(item);
    });

    // --- Compare section (discoverability demo; simulation labelled) ---
    var cmpSection = el("section", "rg-compare");
    cmpSection.setAttribute("aria-labelledby", "rgCompareH");
    var cmpH = el("h2", "rg-compare-h", L(STR.compareTitle)); // verbatim modal title (18901-18902)
    cmpH.id = "rgCompareH";
    // tabindex="-1": programmatic focus target for the tray-Clear focus move
    // (fix G6a) when the compare entry below is real-disabled; never in the
    // tab order.
    cmpH.setAttribute("tabindex", "-1");
    cmpSection.appendChild(cmpH);
    cmpSection.appendChild(P(el("p", "rg-sim-note", L(PROPOSED.simNote))));
    var cmpHint = P(el("p", "rg-compare-hint", L(PROPOSED.selectTwo)));
    cmpSection.appendChild(cmpHint);
    var cmpOpenBtn = P(el("button", "rg-compare-open", L(PROPOSED.trayGo)));
    cmpOpenBtn.type = "button";
    cmpOpenBtn.disabled = true;
    cmpOpenBtn.setAttribute("aria-expanded", "false");
    cmpOpenBtn.setAttribute("aria-controls", "rgComparePanel");
    cmpOpenBtn.addEventListener("click", function () { setPanelOpen(!panelOpen); });
    cmpSection.appendChild(cmpOpenBtn);
    var cmpPanel = el("div", "rg-compare-panel");
    cmpPanel.id = "rgComparePanel";
    cmpPanel.hidden = true;
    cmpSection.appendChild(cmpPanel);
    main.appendChild(cmpSection);

    // --- Financing module (secondary; shipped stale-closed state; inert) ---
    main.appendChild(buildFinancing());
    // Footer hint mirrors production #resultsFooterHint carrying fitFirst
    // when financing is enabled (index.html:13826-13827).
    main.appendChild(el("p", "rg-footer-hint", L(STR.finFitFirst)));

    // --- Compare tray (fixed bottom; hidden until a first selection) ---
    var tray = buildTray();
    app.appendChild(tray.root);

    updateCompareUI();

    // Sticky-header offset = harness review-bar height (prototype chrome only;
    // production has no review bar). Measured, not hardcoded.
    function setBarOffset() {
      var bar = document.querySelector(".df-review-bar");
      document.documentElement.style.setProperty("--rg-sticky-top", (bar ? bar.offsetHeight : 0) + "px");
    }
    setBarOffset();
    window.addEventListener("resize", setBarOffset);

    /* ================= accordion behavior ================= */

    // Single-open accordion. Tapping the open header is a no-op — mirrors the
    // production same-tier early-return (index.html:14273). Per APG, when the
    // pattern does not permit collapsing the open panel, its header button
    // carries aria-disabled="true" (not disabled — it stays focusable).
    function setOpenTier(tier) {
      if (tier === openTier) return;
      openTier = tier;
      TIERS.forEach(function (t) {
        var isOpen = t === openTier;
        accBtns[t].setAttribute("aria-expanded", String(isOpen));
        if (isOpen) accBtns[t].setAttribute("aria-disabled", "true");
        else accBtns[t].removeAttribute("aria-disabled");
        accPanels[t].hidden = !isOpen;
      });
      // Fix G5: collapsing a tall panel above the clicked header would yank
      // the header away and leave the viewport mid-list. This is a
      // COMPENSATING scroll that keeps the pressed control on screen after
      // the layout collapse — not the expand-time auto-scroll-jump the
      // NN/g-cited guidance warns about. .rg-acc-h carries scroll-margin-top
      // = var(--rg-sticky-top) so the header lands below the harness bar.
      var h = accBtns[tier].closest(".rg-acc-h");
      if (h && h.scrollIntoView) h.scrollIntoView({ block: "start" });
    }
    // Initialize states (gold open).
    TIERS.forEach(function (t) {
      var isOpen = t === openTier;
      accBtns[t].setAttribute("aria-expanded", String(isOpen));
      if (isOpen) accBtns[t].setAttribute("aria-disabled", "true");
      accPanels[t].hidden = !isOpen;
    });

    /* ================= panels & cards ================= */

    function buildPanelContent(panel, tier) {
      var list = tierData[tier] || [];

      // Empty-tier state — REAL code path (loader guarantees only gold
      // non-empty; index.html:11753, 14254-14263). Not reachable from the
      // frozen fixtures (all tiers populated) — noted in VARIANT-NOTES.
      if (list.length === 0) {
        panel.appendChild(el("div", "rg-empty", L(STR.emptyTier)));
        return;
      }

      // Index 0 = tier lead; 1-2 = supporting — production slice semantics
      // (index.html:14264, 14268). Fixture order consumed verbatim.
      var lead = el("div", "rg-lead");
      lead.appendChild(buildCard(list[0], tier, true));
      panel.appendChild(lead);

      // Fix G9: slice(1), never slice(1, 3) — the engine already caps tiers;
      // a presentation-side cap is exactly the forbidden class (it would
      // silently drop an engine-qualified result if a capture ever carried
      // more than three).
      var supports = list.slice(1);
      if (supports.length) {
        panel.appendChild(el("p", "rg-more-label", L(STR.moreDirections)));
        var ul = el("ul", "rg-supports");
        ul.setAttribute("role", "list"); // fix G14: list-style:none drops list semantics in Safari/VO
        supports.forEach(function (m) {
          var li = el("li");
          li.appendChild(buildCard(m, tier, false));
          ul.appendChild(li);
        });
        panel.appendChild(ul);
      }
    }

    // One card anatomy for every card in every tier (equal anatomy; no
    // cross-tier size hierarchy). Lead vs supporting differs ONLY by display
    // position and the threshold-honest eyebrow pair.
    function buildCard(m, tier, isLead) {
      var card = el("article", "rg-card");
      card.setAttribute("data-tier", tier);
      card.setAttribute("data-id", m.id);

      if (m.imageUrl) {
        var img = document.createElement("img");
        img.className = "rg-card-photo";
        img.src = "../../../" + m.imageUrl; // fixture imageUrl, repo-root relative
        img.alt = ""; // model name is the adjacent heading; empty alt avoids double announcement
        card.appendChild(img);
      }

      var body = el("div", "rg-card-body");
      card.appendChild(body);

      // Threshold-honest eyebrow (never "best" copy on a back-filled item):
      // lead: 14131-14133; supporting: 14158-14159 pair in the same slot.
      var eyebrowText = isLead
        ? (m.meetsMatchThreshold ? L(STR.bestStart) : L(STR.comparisonOption))
        : (m.meetsMatchThreshold ? L(STR.matchesPriorities) : L(STR.comparisonOption));
      body.appendChild(el("p", "rg-card-eyebrow", eyebrowText));

      body.appendChild(el("p", "rg-card-brand", m.brand + (m.subBrand ? " · " + m.subBrand : "")));
      body.appendChild(el("h3", "rg-card-name", m.name));

      // Firmness: exact fixture integer; word from the fixture's per-model
      // firmnessFeelWord (executed from the real production firmnessFeel at
      // capture — fix G15); 10 discrete segments, N filled; graphic
      // aria-hidden; sr text = brief-mandated phrasing.
      body.appendChild(buildFirmness(m));

      // displayBadges chips removed (fix G2): they created a customer-facing
      // surface production doesn't have (displayBadges render nowhere at
      // 78f949c) and leaked EN strings, a mistranslation and a price
      // superlative into it.

      // Product-story layer (authored, customer-agnostic) — labelled as such.
      body.appendChild(P(el("p", "rg-layer-label", L(PROPOSED.aboutModel))));
      body.appendChild(el("p", "rg-reason", L(m.topPickReason)));

      // Customer-fit layer — first three fixture rows by index, verbatim,
      // never re-derived or reordered (cardPriorities[lang][id]). Real <ol>:
      // the rows are genuinely ordered; display position is the honest claim.
      var rows = (cardPriorities[m.id] || []).slice(0, 3);
      if (rows.length) {
        // Lead fix (adversarial finding, cross-variant consistency with
        // results-tabs): NO heading over the fit rows. Production renders
        // these rows headerless on cards; "Why it is here" is production's
        // single-row COMPARE-modal label, and using it as a card heading
        // over rows that can be all-FEATURE (not answer-matched) overclaims
        // customer-specific justification. The KEY NEED / FEATURE tags on
        // each row carry the honest provenance.
        var ol = el("ol", "rg-fit-rows");
        ol.setAttribute("role", "list"); // fix G14: list-style:none drops list semantics in Safari/VO
        rows.forEach(function (r, i) {
          var li = el("li", "rg-fit-row");
          var rank = el("span", "rg-fit-rank", String(i + 1));
          rank.setAttribute("aria-hidden", "true"); // <ol> already conveys position
          li.appendChild(rank);
          li.appendChild(el("span", "rg-fit-title", r.title));
          // Fix G4: FEATURE (unmatched) tags get a visually distinct, muted
          // style keyed on the fixture's matched flag — KEY NEED and FEATURE
          // must not read as the same claim strength.
          li.appendChild(el("span",
            "rg-fit-tag " + (r.matched ? "is-matched" : "is-feature"),
            r.tag)); // fixture tag verbatim (KEY NEED / FEATURE / NECESIDAD CLAVE / INCLUIDO)
          li.appendChild(el("span", "rg-fit-desc", r.desc));
          ol.appendChild(li);
        });
        body.appendChild(ol);
      }

      // Differentiators removed from the card face (fix G3): authored drawer
      // copy incl. within-tier ranking and price claims does not belong on
      // the fit-primary card; the compare panel keeps its Difference row.

      // Footer: stock line + compare toggle (aria-pressed; the card-level
      // compare control is dormant in production — this is the
      // discoverability demo, labelled in the compare section).
      var footer = el("div", "rg-card-footer");
      footer.appendChild(el("span", "rg-stock", L(STR.inStock)));
      var cmp = P(el("button", "rg-cmp-btn", L(PROPOSED.compareToggle)));
      cmp.type = "button";
      cmp.setAttribute("aria-pressed", "false");
      cmp.setAttribute("data-id", m.id);
      // Fix G7: sr-only model-name suffix — nine buttons named just
      // "Compare" are indistinguishable in an AT rotor list.
      cmp.appendChild(el("span", "sr-only", " — " + m.name));
      cmp.addEventListener("click", function () { toggleCompare(m.id); });
      footer.appendChild(cmp);
      body.appendChild(footer);

      return card;
    }

    function buildFirmness(m) {
      // Fix G15/fixture regeneration: feel word consumed from the fixture's
      // firmnessFeelWord (executed from the real production firmnessFeel per
      // model at capture) — no local word map.
      var word = L(m.firmnessFeelWord);
      var n = m.firmness;
      var wrap = el("div", "rg-firmness");

      var sr = el("span", "sr-only", PROPOSED.firmnessSr(word, n));
      wrap.appendChild(sr);

      var visible = el("span", "rg-firm-visible");
      visible.setAttribute("aria-hidden", "true"); // sr text above is the single announcement
      visible.appendChild(el("span", "rg-firm-word", word));
      var pips = el("span", "rg-firm-pips");
      for (var i = 1; i <= 10; i++) {
        pips.appendChild(el("span", "rg-firm-pip" + (i <= n ? " is-filled" : "")));
      }
      visible.appendChild(pips);
      visible.appendChild(el("span", "rg-firm-num", n + "/10")); // production numeral form (14139)
      wrap.appendChild(visible);
      return wrap;
    }

    /* ================= compare (prototype simulation) ================= */

    function toggleCompare(id) {
      var i = compareSel.indexOf(id);
      if (i > -1) compareSel.splice(i, 1);
      else {
        if (compareSel.length >= 2) return; // cap 2 (mirrors index.html:18827); buttons disable at cap
        compareSel.push(id);
      }
      if (panelOpen) setPanelOpen(false); // selection change closes the open panel
      updateCompareUI();
    }

    function updateCompareUI() {
      var count = compareSel.length;

      // Card toggles: pressed state; at cap, unselected toggles get a real
      // disabled attribute (disable/explain — never a silent no-op; the tray
      // count "2 of 2 selected" is the visible explanation).
      var btns = document.querySelectorAll(".rg-cmp-btn");
      Array.prototype.forEach.call(btns, function (b) {
        var selected = compareSel.indexOf(b.getAttribute("data-id")) > -1;
        b.setAttribute("aria-pressed", String(selected));
        if (!selected && count >= 2) b.setAttribute("disabled", "");
        else b.removeAttribute("disabled");
      });

      // Action-area entry.
      cmpOpenBtn.disabled = count < 2;
      cmpHint.hidden = count >= 2;

      // Tray.
      tray.root.hidden = count === 0;
      tray.count.textContent = STR.trayCount(count); // verbatim bilingual line (18850)
      tray.slots.textContent = "";
      compareSel.forEach(function (id) {
        var entry = byId[id];
        tray.slots.appendChild(el("li", "rg-tray-slot", entry ? entry.m.name : id));
      });
      tray.go.disabled = count < 2; // mirrors production go.disabled (18856)
      setTrayReserve();
    }

    // Fix G6b/G6c: the bottom content reserve equals the tray's MEASURED
    // rendered height — never the old fixed 140px guess — so a wrapped
    // multi-line tray can neither cover the financing fit-first hint nor
    // hit-block a card's Compare button. 0 while the tray is hidden.
    function setTrayReserve() {
      var h = tray.root.hidden ? 0 : tray.root.offsetHeight;
      document.documentElement.style.setProperty("--rg-tray-reserve", h + "px");
    }
    window.addEventListener("resize", setTrayReserve);

    function setPanelOpen(open) {
      panelOpen = open && compareSel.length === 2;
      cmpPanel.hidden = !panelOpen;
      cmpOpenBtn.setAttribute("aria-expanded", String(panelOpen));
      tray.go.setAttribute("aria-expanded", String(panelOpen));
      if (panelOpen) renderComparePanel();
      // No auto-scroll, no focus move — plain disclosure semantics.
    }

    function renderComparePanel() {
      cmpPanel.textContent = "";
      var cols = el("div", "rg-compare-cols");
      compareSel.forEach(function (id) {
        var entry = byId[id];
        if (!entry) return;
        cols.appendChild(buildCompareCol(entry.m, entry.tier));
      });
      cmpPanel.appendChild(cols);
    }

    // 2-up column — mirrors the production compare-modal rows it can honestly
    // reproduce from fixture data (labels verbatim, 18892-18897): Feel, Tier
    // (NAME, never pct), Why it is here (priorities[0] title — desc, the
    // production formula at 18882-18883), Difference (differentiators[0]
    // detail, 18897). Response and "Your reaction" rows are omitted — their
    // inputs (mattressResponseLabel, _mattressReactions) are not fixture data.
    function buildCompareCol(m, tier) {
      var col = el("div", "rg-compare-col");

      if (m.imageUrl) {
        var img = document.createElement("img");
        img.src = "../../../" + m.imageUrl;
        img.alt = "";
        col.appendChild(img);
      }

      var name = el("p", "rg-compare-name", m.name + " ");
      var sym = el("span", "rg-price-tier", priceTierSymbols[tier] || "");
      sym.setAttribute("aria-hidden", "true"); // "$$$" is decorative; the Tier row carries the tier name
      name.appendChild(sym);
      col.appendChild(name);
      col.appendChild(el("p", "rg-compare-brand", m.brand + (m.subBrand ? " · " + m.subBrand : "")));

      var dl = el("dl", "rg-compare-stats");
      function stat(label, value) {
        dl.appendChild(el("dt", null, label));
        dl.appendChild(el("dd", null, value));
      }
      // Feel row (fix G15): the visible "{word} N/10" (production value form,
      // 18892) is aria-hidden; the adjacent sr-only sentence carries the
      // brief-mandated phrasing — raw "Plush 3/10" must never be announced.
      // Word from the fixture's firmnessFeelWord, never a local map.
      dl.appendChild(el("dt", null, L(STR.feel)));
      var feelDd = el("dd");
      var feelVisible = el("span", null, L(m.firmnessFeelWord) + " " + m.firmness + "/10");
      feelVisible.setAttribute("aria-hidden", "true");
      feelDd.appendChild(feelVisible);
      feelDd.appendChild(el("span", "sr-only", PROPOSED.firmnessSr(L(m.firmnessFeelWord), m.firmness)));
      dl.appendChild(feelDd);
      stat(L(STR.tier), L(STR.tierName[tier]));                           // tier NAME, never a percentage
      var rows = cardPriorities[m.id] || [];
      if (rows.length) stat(L(STR.whyHere), rows[0].title + " — " + rows[0].desc); // production formula (18882-18883)
      var d0 = (m.differentiators && m.differentiators[0]) || null;
      if (d0) stat(L(STR.difference), L(d0.detail));
      col.appendChild(dl);

      return col;
    }

    /* ================= financing (inert, stale-closed) ================= */

    function buildFinancing() {
      var sec = el("section", "rg-fin");
      sec.setAttribute("aria-labelledby", "rgFinH");

      var rule = el("div", "rg-fin-rule");
      rule.setAttribute("aria-hidden", "true");
      sec.appendChild(rule);

      // Real (visually hidden) heading from copy.headline — mirrors the
      // production sr-only #resultsFinancingHeading (index.html:9662-9666).
      var h = el("h2", "sr-only", L(STR.finHeadline));
      h.id = "rgFinH";
      sec.appendChild(h);

      sec.appendChild(el("span", "rg-fin-eyebrow", L(STR.finEyebrow)));
      sec.appendChild(el("p", "rg-fin-lead", L(STR.finLead)));
      sec.appendChild(el("p", "rg-fin-fitfirst", L(STR.finFitFirst)));

      var actions = el("div", "rg-fin-actions");
      var explore = el("button", "rg-fin-btn", L(STR.finExplore));
      explore.type = "button";
      explore.disabled = true; // inert in this prototype — the financing sheet is out of scope
      var ask = el("button", "rg-fin-btn", L(STR.finAsk));
      ask.type = "button";
      ask.disabled = true;
      actions.appendChild(explore);
      actions.appendChild(ask);
      sec.appendChild(actions);

      // Fix G12b: the same bilingual sim-note the variant's other simulated
      // sections carry — the disabled financing buttons were the one
      // unlabelled dead end on the page.
      sec.appendChild(P(el("p", "rg-sim-note", L(PROPOSED.finSim))));

      // No staleNotice here (fix G12c): production renders exactly six
      // strings in #resultsFinancing and shows staleNotice only inside the
      // sheet — so the stale-closed state has no visible marker on this
      // surface, matching production. (No exact rates or terms render
      // anywhere either way.)
      return sec;
    }

    /* ================= tray ================= */

    function buildTray() {
      var root = el("div", "rg-tray");
      root.hidden = true;
      var inner = el("div", "rg-tray-inner");
      root.appendChild(inner);

      var count = el("p", "rg-tray-count", STR.trayCount(0));
      inner.appendChild(count);

      var slots = el("ul", "rg-tray-slots");
      slots.setAttribute("role", "list"); // fix G14: list-style:none drops list semantics in Safari/VO
      inner.appendChild(slots);

      var actions = el("div", "rg-tray-actions");
      var clear = P(el("button", "rg-tray-btn", L(PROPOSED.trayClear)));
      clear.type = "button";
      clear.addEventListener("click", function () {
        compareSel = [];
        setPanelOpen(false);
        updateCompareUI();
        // Fix G6a: the tray — with the focused Clear button — just left the
        // page (display:none); focus must land on a stable visible element,
        // never be stranded on a hidden control (results-tabs guards this
        // with its active tab). Target: the action-area compare entry; it is
        // real-disabled at zero selections, so its labelled section heading
        // (tabindex="-1", same action area) takes the focus in that state.
        if (!cmpOpenBtn.disabled) cmpOpenBtn.focus();
        else cmpH.focus();
      });
      var go = P(el("button", "rg-tray-btn", L(PROPOSED.trayGo)));
      go.type = "button";
      go.disabled = true;
      go.setAttribute("aria-expanded", "false");
      go.setAttribute("aria-controls", "rgComparePanel");
      go.addEventListener("click", function () { setPanelOpen(!panelOpen); });
      actions.appendChild(clear);
      actions.appendChild(go);
      inner.appendChild(actions);

      return { root: root, count: count, slots: slots, go: go };
    }
  });
})();
