/* Sleep Brief — ALTERNATIVE A (need-led hero). PROTOTYPE ONLY.
 *
 * Renders entirely from the frozen fixture for ctx.lang (harness contract:
 * DF.onReady). Nothing here recomputes, re-orders, filters, caps or
 * synthesises engine output:
 *   - hero = profile[lang].priorityRows[0] BY INDEX (never by kind);
 *   - priority list = priorityRows verbatim, engine order and count (1-3);
 *   - firmness = the exact captured integer; word = the Brief's own captured
 *     vocabulary (metaStrip "Feel" value);
 *   - compare panel = compareDemo.autoPair looked up in results.tierData,
 *     tier NAME shown, never pct/score/rank.
 *
 * Copy discipline: every string below is (a) fixture data, (b) a verbatim
 * production EN/ES pair with its index.html line cited, or (c) PROPOSED copy
 * marked data-proposed-copy and listed in VARIANT-NOTES.md. All interactions
 * are prototype simulations against frozen fixtures, not production behavior.
 */
(function () {
  "use strict";

  /* ---------- (b) Verbatim production pairs (source lines cited; see
     VARIANT-NOTES.md copy inventory for the full table) ---------- */
  var VERBATIM = {
    eyebrow:      { en: "Your Sleep Brief",        es: "Tu Resumen de Sueño" },        // index.html:13170
    tryThis:      { en: "Try this:",               es: "Pruébalo:" },                  // index.html:13484 (trailing space trimmed)
    editAnswers:  { en: "← Edit my answers",       es: "← Editar mis respuestas" },    // index.html:13506
    compareEntry: { en: "Compare finalists",       es: "Comparar finalistas" },        // index.html:16843
    compareTitle: { en: "Compare Your Finalists",  es: "Compara Tus Finalistas" },     // index.html:18902
    statFeel:     { en: "Feel",                    es: "Sensación" },                  // index.html:18892
    statTier:     { en: "Tier",                    es: "Nivel" },                      // index.html:18894
    statWhy:      { en: "Why it is here",          es: "Por qué está aquí" },          // index.html:18895
    statDiff:     { en: "Difference",              es: "Diferencia" },                 // index.html:18897
    tierNames: {                                                                       // index.html:18880
      gold:   { en: "Gold",   es: "Oro" },
      silver: { en: "Silver", es: "Plata" },
      bronze: { en: "Bronze", es: "Bronce" }
    }
  };

  /* Verbatim word map of firmnessFeel() — index.html:13676-13682. This is the
     compare surface's own live vocabulary (the production compare modal shows
     firmnessFeel(m.firmness) at 18878/18892); the map is copied, not
     re-derived, and applied to the fixture's captured per-mattress integer. */
  function firmFeelWord(n, lang) {
    var es = lang === "es";
    if (n <= 3) return es ? "Suave" : "Plush";
    if (n <= 5) return es ? "Medio" : "Medium";
    if (n <= 7) return es ? "Firme" : "Firm";
    return es ? "Extra Firme" : "Extra Firm";
  }

  /* ---------- (c) PROPOSED copy — every entry rendered with
     data-proposed-copy and listed in VARIANT-NOTES.md ---------- */
  var PROPOSED = {
    basis:      { en: "In order, based on your answers",
                  es: "En orden, según tus respuestas" },
    cta:        { en: "See My Matches →",
                  es: "Ver Mis Opciones →" },
    simBanner:  { en: "PROTOTYPE SIMULATION — production selection logic unchanged",
                  es: "SIMULACIÓN DE PROTOTIPO — la lógica de selección de producción no cambia" },
    simCaption: { en: "Prototype: these actions are simulated — no live app behind this screen.",
                  es: "Prototipo: estas acciones son simuladas — no hay una aplicación real detrás de esta pantalla." },
    srPosition: { en: "Position",     es: "Posición" },
    srSharing:  { en: "Bed sharing",  es: "Cama compartida" },
    close:      { en: "Close",        es: "Cerrar" }
  };

  /* Accessible firmness sentence — phrasing mandated by the roadmap/a11y
     report ("Firmness: Medium, 4 of 10" / "Firmeza: Medio, 4 de 10"). */
  function firmSrText(word, n, lang) {
    return lang === "es"
      ? "Firmeza: " + word + ", " + n + " de 10"
      : "Firmness: " + word + ", " + n + " of 10";
  }

  /* PROPOSED presentation mappings for the two answer-derived badges.
     Values are verbatim data/quiz.json option labels (config-owned,
     customer-facing, reviewed bilingual copy); the mapping-to-badge is the
     proposed part. Full table in VARIANT-NOTES.md. "no_idea" is deliberately
     absent -> the position badge is omitted for that answer. Health-adjacent
     answers (sleep_issues, health_conditions, partner_disturbance) are never
     read here at all. */
  var POSITION_BADGE = {
    side:    { en: "Side Sleeper",    es: "De Lado" },
    back:    { en: "Back Sleeper",    es: "Boca Arriba" },
    stomach: { en: "Stomach Sleeper", es: "Boca Abajo" },
    combo:   { en: "Combination",     es: "Combinación" }
  };
  var SHARING_BADGE = {
    solo:    { en: "Solo Sleeper",    es: "Duermo Solo" },
    partner: { en: "With a Partner",  es: "Con Pareja" },
    family:  { en: "Family Bed",      es: "Cama Familiar" }
  };

  /* ---------- tiny DOM helpers (textContent only — no injected HTML) ---------- */
  function byId(id) { return document.getElementById(id); }
  function setText(id, value) { var n = byId(id); if (n) n.textContent = value; }
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  DF.onReady(function (fixture, ctx) {
    var lang = ctx.lang;
    var L = ctx.L;
    var prof = fixture.profile[lang];
    var rows = prof.priorityRows || [];

    document.title = lang === "es"
      ? "Resumen de Sueño A — prototipo"
      : "Sleep Brief A — prototype";

    /* ===== Hero: strictly priorityRows[0] BY INDEX ===== */
    setText("sbaEyebrow", L(VERBATIM.eyebrow));
    if (rows[0]) {
      setText("sbaHeroTitle", rows[0].title);
      setText("sbaHeroLede", rows[0].desc);
    }

    renderBadges(fixture, prof, lang);
    renderFirmness(fixture, prof, lang);

    /* ===== Priorities: engine order and count, <ol> ===== */
    setText("sbaPrioritiesHeading", prof.dom.profilePrioritiesHeading.textContent);
    setText("sbaBasis", L(PROPOSED.basis));
    renderPriorities(rows, lang);
    setText("sbaReassure", prof.dom.profileReassurance.textContent);

    /* ===== Journey rail: verbatim steps as an <ol> ===== */
    setText("sbaJourneyHeading", prof.dom.profileJourneyHeading.textContent);
    renderJourney(prof.dom.profileJourneySteps.innerHTML);
    setText("sbaJourneyCopy", prof.dom.profileJourneyCopy.textContent);

    /* ===== Actions (all prototype-simulated) ===== */
    setText("sbaEditBtn", prof.dom.profileSecondary.textContent); // fixture == verbatim index.html:13506
    setText("sbaCtaBtn", L(PROPOSED.cta));
    setText("sbaCompareBtn", L(VERBATIM.compareEntry));
    setText("sbaSimCaption", L(PROPOSED.simCaption));
    wireSimulatedActions();

    /* ===== Compare panel (simulated; built once, opened on demand) ===== */
    setText("sbaCompareTitle", L(VERBATIM.compareTitle));
    setText("sbaSimBanner", L(PROPOSED.simBanner));
    setText("sbaCompareClose", L(PROPOSED.close));
    renderCompareColumns(fixture, lang, L);
    wireCompareDialog();
  });

  /* ---------- Signal badges: fixed invariant order position, temperature,
     sharing, feel, size; omit anything unanswered/unmapped ---------- */
  function renderBadges(fixture, prof, lang) {
    var list = byId("sbaBadges");
    if (!list) return;
    var answers = (fixture.meta && fixture.meta.answers) || {};
    var meta = prof.metaStrip || [];
    // Captured meta strip order is fixed by production: [0]=Size [1]=Feel [2]=Temperature.
    var sizeEntry = meta[0], feelEntry = meta[1], tempEntry = meta[2];

    var items = [];
    var pos = POSITION_BADGE[answers.sleep_position];
    if (pos) items.push({ sr: PROPOSED.srPosition[lang], value: pos[lang], proposed: true });
    if (tempEntry) items.push({ sr: tempEntry.label, value: tempEntry.value, proposed: false });
    var share = SHARING_BADGE[answers.partner_sleep];
    if (share) items.push({ sr: PROPOSED.srSharing[lang], value: share[lang], proposed: true });
    if (feelEntry) items.push({ sr: feelEntry.label, value: feelEntry.value, proposed: false });
    if (sizeEntry) items.push({ sr: sizeEntry.label, value: sizeEntry.value, proposed: false });

    items.forEach(function (item) {
      if (!item.value) return; // omit, never placeholder
      var li = el("li", null, null);
      if (item.proposed) li.setAttribute("data-proposed-copy", "");
      if (item.sr) li.appendChild(el("span", "sr-only", item.sr + ": "));
      li.appendChild(el("span", null, item.value));
      list.appendChild(li);
    });
  }

  /* ---------- Firmness: 10 discrete segments, exact integer, Brief
     vocabulary; graphic + visible fragments aria-hidden, sr sentence is the
     single accessible rendering ---------- */
  function renderFirmness(fixture, prof, lang) {
    var host = byId("sbaFirm");
    if (!host) return;
    var value = fixture.firmness && fixture.firmness.value;
    var feelEntry = (prof.metaStrip || [])[1];
    if (typeof value !== "number" || !feelEntry) return; // omit if uncaptured

    var sr = el("span", "sr-only", firmSrText(feelEntry.value, value, lang));
    sr.setAttribute("data-proposed-copy", ""); // phrasing template listed as proposed
    host.appendChild(sr);

    var visible = el("div", "sba-firm__visible", null);
    visible.setAttribute("aria-hidden", "true");
    visible.appendChild(el("span", "sba-firm__label", feelEntry.label)); // captured metaStrip label
    var strip = el("div", "sba-firm__strip", null);
    for (var i = 1; i <= 10; i++) {
      strip.appendChild(el("span", "sba-firm__seg" + (i <= value ? " is-filled" : ""), null));
    }
    visible.appendChild(strip);
    visible.appendChild(el("span", "sba-firm__value", feelEntry.value + " · " + value + "/10"));
    host.appendChild(visible);
  }

  /* ---------- Priority cards: <ol>, ordinal markers, kind pill from the
     captured render (tag + tagClass), desc visible, test behind an APG
     disclosure (evidence headwind documented in VARIANT-NOTES) ---------- */
  function renderPriorities(rows, lang) {
    var list = byId("sbaPriorityList");
    if (!list) return;

    rows.forEach(function (row, i) {
      var li = el("li", "sba-priority", null);

      var head = el("div", "sba-priority__head", null);
      var ordinal = el("span", "sba-priority__ordinal", String(i + 1) + ".");
      ordinal.setAttribute("aria-hidden", "true"); // <ol> semantics already announce position
      head.appendChild(ordinal);
      head.appendChild(el("h3", "sba-priority__title", row.title));
      head.appendChild(el("span", "sba-tag " + (row.tagClass || ""), row.tag));
      li.appendChild(head);

      li.appendChild(el("p", "sba-priority__desc", row.desc));

      var panelId = "sbaTestPanel" + i;
      var btn = el("button", "sba-disclose", null);
      btn.type = "button";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", panelId);
      btn.appendChild(el("span", null, L2(VERBATIM.tryThis, lang)));
      var chev = el("span", "sba-chev", "▾");
      chev.setAttribute("aria-hidden", "true");
      btn.appendChild(chev);
      li.appendChild(btn);

      var panel = el("div", "sba-priority__test", null);
      panel.id = panelId;
      panel.hidden = true;
      panel.appendChild(el("p", null, row.test));
      li.appendChild(panel);

      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", expanded ? "false" : "true");
        panel.hidden = expanded;
      });

      list.appendChild(li);
    });
  }

  /* ---------- Journey rail: parse the captured step markup, re-emit as <ol>
     items (text verbatim; production renders divs — semantics upgrade is a
     documented deviation) ---------- */
  function renderJourney(stepsHtml) {
    var list = byId("sbaJourneyList");
    if (!list || !stepsHtml) return;
    var tpl = document.createElement("template");
    tpl.innerHTML = stepsHtml; // fixture-captured production markup, parsed detached
    var steps = tpl.content.querySelectorAll(".profile-launch__journey-step");
    Array.prototype.forEach.call(steps, function (step) {
      list.appendChild(el("li", null, step.textContent));
    });
  }

  /* ---------- Simulated Edit/CTA actions: flash the labelled caption ---------- */
  var flashTimer = null;
  function wireSimulatedActions() {
    ["sbaEditBtn", "sbaCtaBtn"].forEach(function (id) {
      var btn = byId(id);
      if (!btn) return;
      btn.addEventListener("click", function () {
        var caption = byId("sbaSimCaption");
        if (!caption) return;
        caption.classList.add("is-flash");
        if (flashTimer) clearTimeout(flashTimer);
        flashTimer = setTimeout(function () { caption.classList.remove("is-flash"); }, 1600);
      });
    });
  }

  /* ---------- Compare columns: compareDemo.autoPair + tierData, verbatim.
     Equal anatomy per column; tier NAME only; no score/pct/rank, no winner
     treatment, no photography on this surface ---------- */
  function renderCompareColumns(fixture, lang, L) {
    var host = byId("sbaCompareCols");
    if (!host) return;
    var results = fixture.results || {};
    var tierData = results.tierData || {};
    var symbols = results.priceTierSymbols || {};
    var cardPrio = (results.cardPriorities || {})[lang] || {};
    var savedOrder = (fixture.compareDemo && fixture.compareDemo.savedOrder) || [];
    var pair = (fixture.compareDemo && fixture.compareDemo.autoPair) || [];

    pair.forEach(function (id) {
      var saved = null;
      savedOrder.forEach(function (s) { if (s.id === id) saved = s; });
      if (!saved) return;
      var entry = null;
      (tierData[saved.tier] || []).forEach(function (m) { if (m.id === id) entry = m; });
      if (!entry) return;

      var col = el("div", "sba-compare-col", null);

      var name = el("h3", null, entry.name + " ");
      var sym = el("span", "sba-price-tier", symbols[saved.tier] || "");
      sym.setAttribute("aria-hidden", "true"); // tier is announced by name in the stats below
      name.appendChild(sym);
      col.appendChild(name);
      col.appendChild(el("p", "sba-compare-brand",
        entry.brand + (entry.subBrand ? " · " + entry.subBrand : "")));

      var dl = el("dl", null, null);

      // Feel — compare surface vocabulary (firmnessFeel map, verbatim) + exact integer
      dl.appendChild(el("dt", null, L2(VERBATIM.statFeel, lang)));
      var feelDd = el("dd", null, null);
      var word = firmFeelWord(entry.firmness, lang);
      var feelSr = el("span", "sr-only", firmSrText(word, entry.firmness, lang));
      feelSr.setAttribute("data-proposed-copy", ""); // proposed phrasing template
      feelDd.appendChild(feelSr);
      var feelVisible = el("span", null, word + " · " + entry.firmness + "/10");
      feelVisible.setAttribute("aria-hidden", "true");
      feelDd.appendChild(feelVisible);
      dl.appendChild(feelDd);

      // Tier — NAME only, never pct
      dl.appendChild(el("dt", null, L2(VERBATIM.statTier, lang)));
      dl.appendChild(el("dd", null, L2(VERBATIM.tierNames[saved.tier], lang)));

      // Why it is here — first captured card-priority row BY INDEX
      // (production format: title — desc, index.html:18883); omitted if uncaptured
      var prio = cardPrio[id];
      if (prio && prio[0]) {
        dl.appendChild(el("dt", null, L2(VERBATIM.statWhy, lang)));
        dl.appendChild(el("dd", null, prio[0].title + " — " + prio[0].desc));
      }

      // Difference — first differentiator detail, verbatim bilingual product copy
      var diff = (entry.differentiators || [])[0];
      if (diff && diff.detail) {
        dl.appendChild(el("dt", null, L2(VERBATIM.statDiff, lang)));
        dl.appendChild(el("dd", null, L(diff.detail)));
      }

      col.appendChild(dl);
      host.appendChild(col);
    });
  }

  /* ---------- Compare dialog lifecycle (drawer-grade; the production compare
     modal lacks all of this and is the documented "before" exhibit):
     remember the opener, focus the labelled title, Tab trap with the title
     outside the cycle, Escape closes, inert exactly what was taken and
     release exactly that, restore the opener. No live regions. ---------- */
  function wireCompareDialog() {
    var openBtn = byId("sbaCompareBtn");
    var dialog = byId("sbaCompareDialog");
    var backdrop = byId("sbaDialogBackdrop");
    var closeBtn = byId("sbaCompareClose");
    var title = byId("sbaCompareTitle");
    if (!openBtn || !dialog || !backdrop || !closeBtn || !title) return;

    openBtn.setAttribute("aria-haspopup", "dialog");

    var opener = null;
    var inerted = []; // exact elements we inerted, released verbatim on close

    function openDialog() {
      opener = document.activeElement;
      inerted = [];
      Array.prototype.forEach.call(document.body.children, function (child) {
        if (child === dialog || child === backdrop) return;
        if (child.tagName === "SCRIPT") return;
        if (!child.inert) { child.inert = true; inerted.push(child); }
      });
      backdrop.hidden = false;
      dialog.hidden = false;
      title.focus();
    }

    function closeDialog() {
      dialog.hidden = true;
      backdrop.hidden = true;
      inerted.forEach(function (n) { n.inert = false; });
      inerted = [];
      if (opener && document.contains(opener)) opener.focus();
      opener = null;
    }

    openBtn.addEventListener("click", openDialog);
    closeBtn.addEventListener("click", closeDialog);
    backdrop.addEventListener("click", closeDialog);

    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); closeDialog(); return; }
      if (e.key !== "Tab") return;
      // Trap: cycle among tabbable controls; the title (tabindex=-1) holds
      // initial focus but sits outside the cycle.
      var focusable = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === title)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* L() for tables keyed by fixed pairs when ctx isn't in scope. */
  function L2(obj, lang) {
    if (obj == null) return "";
    return obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : "");
  }
})();
