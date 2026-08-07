// Results — restyled tier tabs (Phase 1 prototype, variant "results-tabs").
//
// PROTOTYPE ONLY. Renders entirely from the frozen fixture (main = 78f949c)
// for ctx.lang. Tier membership, within-tier order, firmness integers and
// card-priority rows are consumed verbatim — nothing is recomputed,
// re-sorted, filtered, padded or capped here.
//
// Tab switching is REAL prototype behavior (all three tiers are present in
// fixture tierData, switching is a client-side re-render). NO analytics are
// implemented: the production tier_view event and its counters belong to the
// production tier switcher and are deliberately untouched by this prototype.
//
// Compare selection/tray/panel is a PROTOTYPE SIMULATION of the dormant
// production pattern (CSS + handlers exist at 78f949c, trigger never
// rendered); production selection logic is unchanged by this page.

(function () {
  "use strict";

  /* ------------------------------------------------------------------ *
   * Copy tables. Three provenance classes, kept separate on purpose:
   *  V  = verbatim production EN/ES pair (source line cited)
   *  FC = verbatim financing config pair (data/store-config.json)
   *  P  = PROPOSED copy (bilingual; element carries data-proposed-copy;
   *       full inventory + rationale in VARIANT-NOTES.md)
   * ------------------------------------------------------------------ */

  var V = {
    eyebrow: { en: "Your matches", es: "Tus opciones" },                                   // index.html:13814
    headlinePre: { en: "Your ", es: "Tus opciones " },                                     // index.html:13815-13817
    headlineAccent: { en: "strongest matches", es: "más compatibles" },
    headlinePost: { en: " are ready", es: " están listas" },
    subhead: {                                                                             // index.html:13818-13820
      en: "Start with the first option, then compare how the others feel. Your comfort decides what stays.",
      es: "Empieza con la primera opción y compara cómo se sienten las demás. Tu comodidad decide cuál permanece.",
    },
    tabs: {                                                                                // index.html:13857-13859
      gold: { en: "GOLD", es: "ORO" },
      silver: { en: "SILVER", es: "PLATA" },
      bronze: { en: "BRONZE", es: "BRONCE" },
    },
    // Tier descriptor subtitles are NOT rendered in this candidate
    // (correction pass, 2026-08-07). The roadmap already decided that
    // buyer-characterising tier language ("Bronze · entry-level" / "Bronce ·
    // básico") must be removed — that is not a new decision — and the
    // external review's guidance is that the safest prototype renders no
    // subtitle at all: any replacement subtitle must state neutral
    // product/presentation facts and needs explicit approval first.
    // Production still renders its descriptor line (index.html:13877-13883),
    // unchanged and flagged in the decision document.
    leadEyebrow: { en: "Best place to start", es: "El mejor punto de partida" },           // index.html:14131-14133
    comparisonOption: { en: "Additional comparison option", es: "Opción adicional para comparar" }, // index.html:14083, 14159
    supportMatch: { en: "Matches your priorities", es: "Coincide con tus prioridades" },   // index.html:14158
    emptyTier: { en: "No strong matches in this tier.", es: "No hay coincidencias fuertes en este nivel." }, // index.html:14254-14263
    tierNames: {                                                                           // index.html:19201-19203 / 18880
      gold: { en: "Gold", es: "Oro" },
      silver: { en: "Silver", es: "Plata" },
      bronze: { en: "Bronze", es: "Bronce" },
    },
    diffLabel: { en: "What makes this one different", es: "Lo que hace diferente a este" },// index.html:19213-19215
    // "Compare Your Finalists" / "Compare finalists" are deliberately NOT
    // used on this page (correction pass): the selection here is page-local
    // Results state, not persisted saved-finalist state, so calling it
    // "finalists" misstated what is selected. The saved-finalist vocabulary
    // belongs to the Consultation Summary's working entry (index.html:16843).
    detailsBtn: { en: "View match details →", es: "Ver detalles →" },                      // index.html:14123-14125
    saveBtn: { en: "Save for later", es: "Guardar" },                                      // index.html:13694-13697 (unsaved state)
    feelLabel: { en: "Feel", es: "Sensación" },                                       // index.html:18892
    tierLabel: { en: "Tier", es: "Nivel" },                                                // index.html:18894
    trayCountOf2: { en: " of 2 selected", es: " de 2 seleccionados" },                     // index.html:18850
    trayClearEn: "Clear",                                                                  // index.html:18984 (EN-only production static)
    trayGoEn: "Compare →",                                                            // index.html:18986 (EN-only production static)
  };

  var FC = {                                                                               // data/store-config.json financing.copy.*
    eyebrow: { en: "LACKS PAYMENT CHOICE", es: "OPCIONES DE PAGO LACKS" },
    headline: { en: "Better sleep. More ways to bring it home.", es: "Duerme mejor. Más opciones para llevarlo a casa." },
    resultsLead: {
      en: "Your strongest mattress match may have more than one way to bring it home.",
      es: "Tu mejor opción de colchón puede tener más de una forma de llegar a casa.",
    },
    fitFirst: {
      en: "Your matches are based on sleep fit — never on payment method.",
      es: "Tus opciones se basan en tu descanso — nunca en la forma de pago.",
    },
    cta: { en: "Explore payment options", es: "Explorar opciones de pago" },
    resultsAsk: { en: "Plan the conversation", es: "Planear la conversación" },
    // staleNotice deliberately absent (fix T12c): production renders exactly
    // six strings in #resultsFinancing (headline, eyebrow, resultsLead,
    // fitFirst, cta, resultsAsk — index.html:10972-10980); staleNotice
    // renders only inside the financing sheet (index.html:10825-10837),
    // which this prototype does not build.
  };

  var P = {
    tiersHeading: { en: "Matches by tier", es: "Opciones por nivel" },
    productStory: { en: "Product description", es: "Descripción del producto" },
    // customerFit heading removed (fix T5): FEATURE rows are not
    // answer-derived, so "From your answers" was a false attribution;
    // production renders these rows with no heading — the KEY NEED /
    // FEATURE tags speak for themselves.
    compareToggle: { en: "Compare", es: "Comparar" },
    // Correction pass: page-local selection vocabulary. These are PROPOSED
    // pairs; the production "finalists" vocabulary is deliberately not used
    // for unsaved page-local selections.
    compareHeading: { en: "Compare selected mattresses", es: "Comparar colchones seleccionados" },
    trayClearEs: "Borrar", // unified with results-grouped's proposed ES pair (fix T10)
    trayGoEs: "Comparar →",
    selectTwo: { en: "Select 2 mattresses to compare", es: "Selecciona 2 colchones para comparar" },
    // Package accessible-firmness template (fix T8):
    // "Firmness: {word}, {n} of 10" / "Firmeza: {word}, {n} de 10".
    // The word is fixture data (entry.firmnessFeelWord, executed from the
    // real production firmnessFeel per model) — no local word map exists.
    firmnessSrPre: { en: "Firmness: ", es: "Firmeza: " },
    firmnessSrPost: { en: " of 10", es: " de 10" },
  };

  /* Prototype CHROME — review-surface text that would never ship. Marked
     data-prototype-chrome, NOT data-proposed-copy (correction pass: the two
     classes were previously conflated; proposed = candidate product copy,
     chrome = prototype apparatus). */
  var CHROME = {
    simBanner: {
      en: "PROTOTYPE SIMULATION — production selection logic unchanged",
      es: "SIMULACIÓN DE PROTOTIPO — la lógica de selección de producción no cambia",
    },
    finSim: {
      en: "Simulated — buttons are inactive in this prototype.",
      es: "Simulado — los botones están inactivos en este prototipo.",
    },
    cardSim: {
      en: "Prototype: the Details and Save actions on the cards are simulated — no live app behind this screen.",
      es: "Prototipo: las acciones de Detalles y Guardar en las tarjetas son simuladas — no hay una aplicación real detrás de esta pantalla.",
    },
    footnote: {
      en: "In production today, the customer-facing Compare opens from the Consultation Summary’s “Compare finalists” button and pairs two saved finalists.",
      es: "En producción hoy, el Comparar del cliente se abre desde el botón “Comparar finalistas” del Resumen de Consulta y empareja dos finalistas guardados.",
    },
    legend: {
      en: "Dotted-underlined text is proposed copy (not production). All other text is fixture-captured or verbatim production copy.",
      es: "El texto con subrayado punteado es copia propuesta (no de producción). Todo el resto del texto proviene del fixture o es copia textual de producción.",
    },
    srProposed: { en: " (proposed copy — not production)", es: " (copia propuesta — no de producción)" },
  };

  var TIERS = ["gold", "silver", "bronze"]; // fixed order — never re-ordered

  /* ------------------------------------------------------------------ *
   * Tiny DOM helpers (create-element based: text is escaped by default).
   * ------------------------------------------------------------------ */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "html") node.innerHTML = attrs[k]; // fixture-captured HTML only
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // Proposed-copy marking (correction pass): attribute (mechanical), dotted
  // underline (visible, via CSS on the attribute) and an sr-only
  // "(proposed copy — not production)" suffix (screen reader). A visible
  // legend at the foot of the page explains the underline.
  var activeLang = "en";
  function proposed(node) {
    node.setAttribute("data-proposed-copy", "");
    var suffix = CHROME.srProposed[activeLang];
    if (suffix) {
      var s = document.createElement("span");
      s.className = "sr-only";
      s.textContent = suffix;
      node.appendChild(s);
    }
    return node;
  }

  // Prototype-chrome marking: review apparatus, never product copy.
  function chrome(node) { node.setAttribute("data-prototype-chrome", ""); return node; }

  /* ------------------------------------------------------------------ */

  DF.onReady(function (fixture, ctx) {
    var L = ctx.L;
    var lang = ctx.lang;
    activeLang = lang;
    var tierData = fixture.results.tierData;
    var cardPriorities = fixture.results.cardPriorities[lang] || {};
    var priceSymbols = fixture.results.priceTierSymbols || {};

    // Localized page title (fix T13; both Sleep Brief variants do the same).
    document.title = lang === "es"
      ? "Resultados — pestañas de nivel reestilizadas (prototipo Fase 1)"
      : "Results — restyled tier tabs (Phase 1 prototype)";

    var state = {
      tier: "gold",        // production default tier
      selected: [],        // compare selection, cap 2 (prototype simulation)
      panelOpen: false,
    };

    var app = document.getElementById("app");

    /* ---------------- results chrome (verbatim pairs) ---------------- */

    app.appendChild(el("p", { "class": "results-eyebrow", text: L(V.eyebrow) }));
    var h1 = el("h1", { "class": "results-headline" });
    h1.appendChild(document.createTextNode(L(V.headlinePre)));
    h1.appendChild(el("span", { "class": "accent", text: L(V.headlineAccent) }));
    h1.appendChild(document.createTextNode(L(V.headlinePost)));
    app.appendChild(h1);
    app.appendChild(el("p", { "class": "results-subhead", text: L(V.subhead) }));

    // Trial-focus strip: captured production render, verbatim fixture HTML.
    var trialFocusHtml = fixture.profile[lang] && fixture.profile[lang].resultsTrialFocus;
    if (trialFocusHtml) {
      app.appendChild(el("div", { "class": "trial-focus", html: trialFocusHtml }));
    }

    /* ---------------- tier tabs (APG tabs pattern) ---------------- */

    var tiersSection = el("section", { "aria-labelledby": "tiersHeading" });
    tiersSection.appendChild(proposed(el("h2", { id: "tiersHeading", "class": "sr-only", text: L(P.tiersHeading) })));

    var tablist = el("div", { role: "tablist", "class": "tier-tabs", "aria-labelledby": "tiersHeading" });
    var tabButtons = {};
    TIERS.forEach(function (tier) {
      var tab = el("button", {
        type: "button",
        role: "tab",
        id: "tab-" + tier,
        "class": "tier-tab",
        "aria-selected": tier === state.tier ? "true" : "false",
        "aria-controls": "tierPanel",
        tabindex: tier === state.tier ? "0" : "-1",
        text: L(V.tabs[tier]),
      });
      tab.addEventListener("click", function () { activateTier(tier); });
      tab.addEventListener("keydown", tablistKeydown);
      tabButtons[tier] = tab;
      tablist.appendChild(tab);
    });
    tiersSection.appendChild(tablist);

    // No tier-descriptor subtitle renders (correction pass): the roadmap
    // already decided buyer-characterising tier language must go, and the
    // safest prototype is no subtitle — see the V-table comment above.
    // Production's descriptor line is unchanged and flagged.

    // Card sim note (prototype chrome): identifies the inert Details/Save
    // card actions. Referenced by aria-describedby from every such button.
    var cardSimNote = chrome(el("p", { id: "cardSimNote", "class": "card-sim-note", text: L(CHROME.cardSim) }));
    tiersSection.appendChild(cardSimNote);

    // The tab row is position:sticky (fix T6). The offset below the harness
    // review bar is measured, never hardcoded — prototype chrome
    // accommodation only; production has no review bar, so there top would
    // be 0.
    function setStickyOffset() {
      var bar = document.querySelector(".df-review-bar");
      document.documentElement.style.setProperty(
        "--tabs-sticky-top", (bar ? bar.offsetHeight : 0) + "px");
    }
    setStickyOffset();
    window.addEventListener("resize", setStickyOffset);

    var panel = el("div", {
      id: "tierPanel",
      role: "tabpanel",
      "aria-labelledby": "tab-" + state.tier,
    });
    tiersSection.appendChild(panel);
    app.appendChild(tiersSection);

    // Roving tabindex + arrow keys, automatic activation (APG tabs).
    function tablistKeydown(e) {
      var idx = TIERS.indexOf(e.target.id.replace("tab-", ""));
      var next = null;
      if (e.key === "ArrowRight") next = (idx + 1) % TIERS.length;
      else if (e.key === "ArrowLeft") next = (idx + TIERS.length - 1) % TIERS.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = TIERS.length - 1;
      if (next === null) return;
      e.preventDefault();
      var tier = TIERS[next];
      tabButtons[tier].focus();
      activateTier(tier);
    }

    function activateTier(tier) {
      if (state.tier === tier) return; // same-tier tap is a no-op (production early-return)
      state.tier = tier;
      TIERS.forEach(function (t) {
        tabButtons[t].setAttribute("aria-selected", t === tier ? "true" : "false");
        tabButtons[t].setAttribute("tabindex", t === tier ? "0" : "-1");
      });
      panel.setAttribute("aria-labelledby", "tab-" + tier);
      renderPanel();
      // Fix T7: switching tiers from a deep scroll position must not land
      // mid-list — if the top of the new tier's card grid sits above the
      // sticky tab row, scroll so it lands just under the row. This is a
      // compensating scroll for the content swap under the pressed control,
      // not a decorative auto-jump; when the grid top is already in view it
      // is a no-op.
      var stickyBottom = tablist.getBoundingClientRect().bottom;
      var panelTop = panel.getBoundingClientRect().top;
      if (panelTop < stickyBottom) window.scrollBy(0, panelTop - stickyBottom);
      // NO analytics here: production logs tier_view from its own switcher;
      // this prototype implements none.
    }

    /* ---------------- cards ---------------- */

    // Package accessible-firmness phrasing (fix T8): the feel word comes from
    // the fixture's per-model firmnessFeelWord — executed from the real
    // production firmnessFeel at capture time. No local word map exists.
    function firmnessSrText(entry) {
      return L(P.firmnessSrPre) + L(entry.firmnessFeelWord) + ", "
        + entry.firmness + L(P.firmnessSrPost);
    }

    function firmnessBlock(entry) {
      var firmness = entry.firmness;
      var strip = el("div", { "class": "firm-strip", "aria-hidden": "true" });
      for (var i = 1; i <= 10; i++) {
        strip.appendChild(el("span", { "class": "firm-seg" + (i <= firmness ? " filled" : "") }));
      }
      return el("div", { "class": "firm-row" }, [
        strip,
        // Visible feel word next to the numeral (fix T8) — fixture data,
        // aria-hidden with the sr-only sentence carrying the single
        // announcement.
        el("span", { "class": "firm-word", "aria-hidden": "true", text: L(entry.firmnessFeelWord) }),
        el("span", { "class": "firm-num", "aria-hidden": "true", text: firmness + "/10" }),
        el("span", { "class": "sr-only", text: firmnessSrText(entry) }),
      ]);
    }

    // Card hierarchy (correction pass): ONE within-tier lead card with full
    // anatomy; the supporting entries render as COMPACT comparison cards —
    // same fixture rows, same index order, but titles + tags only (descs and
    // the product-story paragraph live in production's drawer, represented
    // here by the inert Details action). Nothing is re-ordered, re-selected
    // or recomputed; the compact rendering is a presentation subset by index.
    // The threshold copy branches are driven by entry.meetsMatchThreshold —
    // the false branch is a real code path exercised only by data (all
    // frozen fixture entries are true; never synthesised — fix T1).
    function renderCard(entry, opts) {
      var isLead = !!opts.lead;
      var eyebrowText = entry.meetsMatchThreshold
        ? (isLead ? L(V.leadEyebrow) : L(V.supportMatch))
        : L(V.comparisonOption);

      var body = el("div", { "class": "m-card-body" });
      body.appendChild(el("p", { "class": "m-card-eyebrow", text: eyebrowText }));
      body.appendChild(el("h3", { "class": "m-card-name", text: entry.name }));
      body.appendChild(el("p", {
        "class": "m-card-brand",
        text: entry.brand + (entry.subBrand ? " · " + entry.subBrand : ""),
      }));
      body.appendChild(firmnessBlock(entry));

      if (isLead) {
        // PRODUCT-STORY layer (lead card only): authored, customer-agnostic
        // copy, labelled as product description (provenance clarity) —
        // visually separated from the answer-aware customer-fit rows below.
        // displayBadges chips removed (fix T2); differentiators removed from
        // the card face (fix T3) — differentiators[0] discriminates in the
        // compare panel instead.
        var story = el("div", { "class": "product-story" });
        story.appendChild(proposed(el("p", { "class": "layer-label", text: L(P.productStory) })));
        story.appendChild(el("p", { "class": "reason", text: L(entry.topPickReason) }));
        body.appendChild(story);
      }

      // CUSTOMER-FIT layer: answer-aware template rows, verbatim fixture
      // cardPriorities[lang][id], first three by index; real <ol> because
      // the row order is genuinely ordered (position is the honest claim).
      // Lead card: full rows (title + desc + tag, salesperson-readable type).
      // Supporting cards: compact talking points (title + tag, same order).
      var rows = (cardPriorities[entry.id] || []).slice(0, 3);
      if (rows.length) body.appendChild(customerFitBlock(rows, isLead));

      // Action cluster: inert Details + Save (production-verbatim labels,
      // clearly identified as prototype-only via aria-describedby and the
      // visible card sim note) + the compare toggle (prototype simulation of
      // the dormant production pattern; aria-pressed, real disabled at cap 2).
      var actions = el("div", { "class": "card-actions" });

      var detailsBtn = el("button", {
        type: "button",
        "class": "card-btn details-btn",
        "aria-describedby": "cardSimNote",
        text: L(V.detailsBtn),
      });
      detailsBtn.appendChild(el("span", { "class": "sr-only", text: " — " + entry.name }));
      detailsBtn.addEventListener("click", function () { simPulse(detailsBtn); });
      actions.appendChild(detailsBtn);

      var saveBtn = el("button", {
        type: "button",
        "class": "card-btn save-btn",
        "aria-describedby": "cardSimNote",
        text: L(V.saveBtn),
      });
      saveBtn.appendChild(el("span", { "class": "sr-only", text: " — " + entry.name }));
      saveBtn.addEventListener("click", function () { simPulse(saveBtn); });
      actions.appendChild(saveBtn);

      var toggle = el("button", {
        type: "button",
        "class": "compare-toggle",
        "aria-pressed": "false",
        "data-id": entry.id,
        "data-tier": opts.tier || "",
      });
      toggle.appendChild(document.createTextNode(L(P.compareToggle)));
      toggle.appendChild(el("span", { "class": "sr-only", text: " — " + entry.name }));
      proposed(toggle); // proposed pair; suffix appended after the visible label
      toggle.addEventListener("click", function () { toggleCompare(entry.id); });
      actions.appendChild(toggle);

      body.appendChild(actions);

      var card = el("article", {
        "class": "m-card " + (isLead ? "is-lead" : "is-support"),
        "data-id": entry.id,
      });
      if (entry.imageUrl) {
        card.appendChild(el("img", {
          "class": "m-card-photo",
          src: "../../../" + entry.imageUrl,
          // Empty alt (fix T4): the model name is the adjacent h3 heading;
          // alt = name double-announces.
          alt: "",
        }));
      }
      card.appendChild(body);
      return card;
    }

    // Inert-action feedback: the tap must not appear dead, and must not
    // pretend to work — pulse the pressed control; the sim note explains.
    function simPulse(btn) {
      btn.classList.add("sim-pulse");
      setTimeout(function () { btn.classList.remove("sim-pulse"); }, 900);
    }

    function customerFitBlock(rows, full) {
      // No heading on the fit rows (fix T5): FEATURE rows are not
      // answer-derived, so a "From your answers" label was a false
      // attribution; production renders these rows with no heading — the
      // KEY NEED / FEATURE tags speak for themselves.
      var fit = el("div", { "class": "customer-fit" + (full ? "" : " is-compact") });
      var list = el("ol", {});
      rows.forEach(function (row) {
        var li = el("li", {});
        li.appendChild(el("span", { "class": "fit-title", text: row.title }));
        if (full) li.appendChild(el("p", { "class": "fit-desc", text: row.desc }));
        li.appendChild(el("span", { "class": "fit-tag " + (row.matched ? "matched" : "unmatched"), text: row.tag }));
        list.appendChild(li);
      });
      fit.appendChild(list);
      return fit;
    }

    // Renders a tier's card list (fixture order; index 0 = tier lead) or the
    // verbatim empty-tier state. This is a REAL code path: it runs whenever a
    // tier array is empty — the shipped catalog fills all tiers, so it is
    // exercised only by data (fix T1: never demonstrated with synthesised
    // engine output).
    function renderTierCards(container, list, tier) {
      container.innerHTML = "";
      if (!list.length) {
        container.appendChild(el("p", { "class": "empty-tier", text: L(V.emptyTier) }));
        return;
      }
      var grid = el("ul", { "class": "card-grid", role: "list" });
      list.forEach(function (entry, i) {
        grid.appendChild(el("li", {}, [renderCard(entry, { lead: i === 0, tier: tier })]));
      });
      container.appendChild(grid);
    }

    function renderPanel() {
      renderTierCards(panel, tierData[state.tier] || [], state.tier);
      syncCompareUi(); // restore pressed/disabled state on re-rendered toggles
    }

    /* ---------------- compare (prototype simulation) ---------------- */

    var compareSection = el("section", { "aria-labelledby": "compareHeading" });
    // Visible heading (fix T9), with the correction-pass terminology:
    // "Compare selected mattresses" — this section acts on page-local
    // selection, never on saved finalists, so the production "finalists"
    // vocabulary would misstate the state. PROPOSED pair. tabindex="-1" so
    // opening Compare can move focus to this stable heading.
    var compareHeadingEl = proposed(el("h2", {
      id: "compareHeading",
      "class": "compare-heading",
      tabindex: "-1",
      text: L(P.compareHeading),
    }));
    compareSection.appendChild(compareHeadingEl);

    var compareEntryBtn = el("button", {
      type: "button",
      "class": "compare-entry",
      "aria-expanded": "false",
      "aria-controls": "comparePanel",
      disabled: "",
      text: L(P.compareHeading),
    });
    proposed(compareEntryBtn);
    compareEntryBtn.addEventListener("click", togglePanel);
    var compareHint = proposed(el("p", { "class": "compare-hint", text: L(P.selectTwo) }));
    compareSection.appendChild(el("div", { "class": "compare-actions" }, [compareEntryBtn, compareHint]));

    var comparePanel = el("div", { id: "comparePanel", "class": "compare-panel", hidden: "" });
    compareSection.appendChild(comparePanel);
    compareSection.appendChild(chrome(el("p", { "class": "compare-footnote", text: L(CHROME.footnote) })));
    app.appendChild(compareSection);

    function findEntry(id) {
      for (var t = 0; t < TIERS.length; t++) {
        var list = tierData[TIERS[t]] || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) return { entry: list[i], tier: TIERS[t] };
        }
      }
      return null;
    }

    function toggleCompare(id) {
      var idx = state.selected.indexOf(id);
      if (idx > -1) state.selected.splice(idx, 1);
      else if (state.selected.length < 2) state.selected.push(id);
      if (state.selected.length < 2 && state.panelOpen) togglePanel(); // close a stale panel
      syncCompareUi();
    }

    function syncCompareUi() {
      var full = state.selected.length >= 2;
      // Card toggles: pressed state; real disabled on unselected at cap
      // (the production soft cap silently no-ops — a prototype control must
      // explain instead; see VARIANT-NOTES).
      var toggles = app.querySelectorAll(".compare-toggle");
      Array.prototype.forEach.call(toggles, function (btn) {
        var pressed = state.selected.indexOf(btn.getAttribute("data-id")) > -1;
        btn.setAttribute("aria-pressed", pressed ? "true" : "false");
        if (!pressed && full) btn.setAttribute("disabled", "");
        else btn.removeAttribute("disabled");
      });
      // Openers enabled only at exactly 2.
      if (full) {
        compareEntryBtn.removeAttribute("disabled");
        trayGoBtn.removeAttribute("disabled");
        compareHint.hidden = true;
      } else {
        compareEntryBtn.setAttribute("disabled", "");
        trayGoBtn.setAttribute("disabled", "");
        compareHint.hidden = false;
      }
      renderTray();
      if (state.panelOpen) renderComparePanel();
    }

    function togglePanel() {
      state.panelOpen = !state.panelOpen;
      compareEntryBtn.setAttribute("aria-expanded", state.panelOpen ? "true" : "false");
      trayGoBtn.setAttribute("aria-expanded", state.panelOpen ? "true" : "false");
      if (state.panelOpen) {
        renderComparePanel();
        comparePanel.hidden = false;
        // Correction pass: activating Compare must have an obvious visible
        // AND focus consequence. The panel sits below the operator's likely
        // scroll position, so without this the tap appeared inert. Scroll
        // the stable section heading to the top and move focus to it.
        compareHeadingEl.scrollIntoView({ block: "start" });
        compareHeadingEl.focus({ preventScroll: true });
      } else {
        comparePanel.hidden = true;
      }
    }

    function renderComparePanel() {
      comparePanel.innerHTML = "";
      comparePanel.appendChild(chrome(el("p", { "class": "sim-banner", text: L(CHROME.simBanner) })));
      var cols = el("div", { "class": "compare-cols" });
      state.selected.forEach(function (id) {
        var found = findEntry(id);
        if (!found) return;
        var m = found.entry;
        var col = el("div", { "class": "compare-col" });
        col.appendChild(el("h3", { text: m.name }));
        col.appendChild(el("p", { "class": "c-brand", text: m.brand + (m.subBrand ? " · " + m.subBrand : "") }));
        // Tier row (fix T9): the price-tier symbol is decorative and
        // aria-hidden; the announced Tier value is the pure tier name.
        var tierStat = el("p", { "class": "compare-stat" }, [
          el("span", { "class": "label", text: L(V.tierLabel) }),
          el("span", { "class": "value" }, [
            document.createTextNode(L(V.tierNames[found.tier])),
            priceSymbols[found.tier]
              ? el("span", { "class": "price-tier", "aria-hidden": "true", text: " " + priceSymbols[found.tier] })
              : null,
          ]),
        ]);
        col.appendChild(tierStat);
        // Visible "{word} N/10" is aria-hidden; the sr-only sibling carries
        // the package template ("Firmness: {word}, N of 10" — fix T8).
        var feelStat = el("p", { "class": "compare-stat" }, [
          el("span", { "class": "label", text: L(V.feelLabel) }),
          el("span", { "class": "value", "aria-hidden": "true", text: L(m.firmnessFeelWord) + " " + m.firmness + "/10" }),
          el("span", { "class": "sr-only", text: firmnessSrText(m) }),
        ]);
        col.appendChild(feelStat);
        // Differentiator row (fix T3): differentiators[0] title + detail —
        // the production compare modal's Difference row analog
        // (index.html:18897) — so two same-tier, same-feel finalists can
        // never render as identical columns.
        var d0 = (m.differentiators && m.differentiators[0]) || null;
        if (d0) {
          col.appendChild(el("p", { "class": "compare-stat diff" }, [
            el("span", { "class": "label", text: L(V.diffLabel) }),
            el("span", { "class": "value", text: L(d0.title) + " — " + L(d0.detail) }),
          ]));
        }
        cols.appendChild(col);
      });
      comparePanel.appendChild(cols);
    }

    /* ---------------- financing (secondary, stale-closed) ---------------- */

    var finSection = el("section", { "class": "fin-module", "aria-labelledby": "finHeading" });
    finSection.appendChild(el("div", { "class": "fin-rule", "aria-hidden": "true" }));
    finSection.appendChild(el("h2", { id: "finHeading", "class": "sr-only", text: L(FC.headline) }));
    finSection.appendChild(el("span", { "class": "fin-eyebrow", text: L(FC.eyebrow) }));
    finSection.appendChild(el("p", { "class": "fin-lead", text: L(FC.resultsLead) }));
    // No staleNotice here (fix T12c): production renders exactly six strings
    // in #resultsFinancing and shows staleNotice only inside the sheet — so
    // the stale-closed state has no visible marker on this surface, matching
    // production.
    finSection.appendChild(el("p", { "class": "fin-fit-first", text: L(FC.fitFirst) }));
    // Fix T12a: the module's primary button is OUTLINED (see styles.css) —
    // production ranks it below the brand-filled footer CTAs this prototype
    // omits, so a solid fill would make it the only filled action on screen.
    finSection.appendChild(el("div", { "class": "fin-actions" }, [
      el("button", { type: "button", "class": "fin-btn primary", disabled: "", text: L(FC.cta) }),
      el("button", { type: "button", "class": "fin-btn secondary", disabled: "", text: L(FC.resultsAsk) }),
    ]));
    finSection.appendChild(chrome(el("p", { "class": "fin-sim-note", text: L(CHROME.finSim) })));
    app.appendChild(finSection);

    // Second production fitFirst instance (fix T12b): the results footer
    // hint line — production renders FC('fitFirst') into #resultsFooterHint
    // whenever financing is enabled (index.html:13823-13834). This is a
    // sleep-fit-primacy reassurance, not a second Payment Choice module —
    // the module above is the surface's single Payment Choice representation.
    app.appendChild(el("p", { "class": "results-footer-hint", text: L(FC.fitFirst) }));

    // Proposed-copy legend (prototype chrome) — explains the dotted
    // underline marking used on every proposed string on this page.
    app.appendChild(chrome(el("p", { "class": "page-legend", text: L(CHROME.legend) })));

    // The former "non-exercisable state demonstrations" section is deleted
    // (fix T1): it deep-cloned a real fixture entry with meetsMatchThreshold
    // flipped — synthesised engine output — and rendered empty-tier copy for
    // a tier that has matches. Both copy states remain implemented in the
    // card/panel code paths above, exercised only by data; the document-only
    // approach (VARIANT-NOTES) is the package standard.

    /* ---------------- selection tray (last in DOM, sticky bottom) ---------------- */

    var trayCount = el("span", { "class": "tray-count" });
    var traySlots = el("span", { "class": "tray-slots-wrap" });
    var trayClearBtn = el("button", { type: "button", "class": "tray-btn" });
    // Production tray statics are EN-only ("Clear" / "Compare →",
    // index.html:18984/18986); only the ES sides are PROPOSED — the EN
    // renders are production-verbatim and carry no proposed marking.
    trayClearBtn.textContent = lang === "es" ? P.trayClearEs : V.trayClearEn;
    if (lang === "es") proposed(trayClearBtn);
    trayClearBtn.addEventListener("click", function () {
      state.selected = [];
      if (state.panelOpen) togglePanel();
      syncCompareUi();
      // The tray (and the focused Clear button) just left the page — move
      // focus to the active tier tab instead of dropping it on BODY.
      tabButtons[state.tier].focus();
    });
    var trayGoBtn = el("button", {
      type: "button",
      "class": "tray-btn go",
      "aria-expanded": "false",
      "aria-controls": "comparePanel",
      disabled: "",
    });
    trayGoBtn.textContent = lang === "es" ? P.trayGoEs : V.trayGoEn;
    if (lang === "es") proposed(trayGoBtn);
    trayGoBtn.addEventListener("click", togglePanel);

    var tray = el("div", { "class": "compare-tray", hidden: "" }, [
      trayCount,
      traySlots,
      el("span", { "class": "tray-actions" }, [trayClearBtn, trayGoBtn]),
    ]);
    app.appendChild(tray);

    // Fix T10: while the tray is visible, the page content reserves the
    // tray's MEASURED rendered height as extra bottom padding so the tray
    // can never hit-block a card's Compare button (a wrapped multi-line tray
    // is taller than any fixed guess).
    function setTrayReserve() {
      if (tray.hidden) {
        app.style.paddingBottom = "";
      } else {
        app.style.paddingBottom =
          "calc(clamp(14px, 4vw, 48px) + " + tray.offsetHeight + "px)";
      }
    }
    window.addEventListener("resize", setTrayReserve);

    function renderTray() {
      if (!state.selected.length) { tray.hidden = true; setTrayReserve(); return; }
      tray.hidden = false;
      trayCount.textContent = state.selected.length + L(V.trayCountOf2); // "N of 2 selected" / "N de 2 seleccionados" (index.html:18850)
      traySlots.innerHTML = "";
      state.selected.forEach(function (id) {
        var found = findEntry(id);
        traySlots.appendChild(el("span", { "class": "tray-slot", text: found ? found.entry.name : id }));
      });
      setTrayReserve();
    }

    /* ---------------- initial render ---------------- */

    renderPanel();

    /* ---------------- review-state driver (PROTOTYPE CHROME) ----------------
       ?state=<name> replays REAL interactions through the real handlers so
       every screenshot cell is reproducible by URL — it never sets state
       directly and adds no product behavior. Values:
         silver        — activate the Silver tab
         selected1     — select the active tier's lead for compare
         selected2     — select the active tier's first two (compare-ready)
         compare-open  — selected2, then open the compare panel
       Combine with a leading tier via "silver+selected2" etc. */
    (function reviewStateDriver() {
      var state = new URLSearchParams(window.location.search).get("state");
      if (!state) return;
      state.split("+").forEach(function (step) {
        if (step === "silver" || step === "bronze") {
          tabButtons[step].dispatchEvent(new Event("click"));
        } else if (step === "selected1" || step === "selected2" || step === "compare-open") {
          var toggles = panel.querySelectorAll(".compare-toggle");
          if (toggles[0]) toggles[0].dispatchEvent(new Event("click"));
          if (step !== "selected1" && toggles[1]) toggles[1].dispatchEvent(new Event("click"));
          if (step === "compare-open") compareEntryBtn.dispatchEvent(new Event("click"));
        }
      });
    })();
  });
})();
