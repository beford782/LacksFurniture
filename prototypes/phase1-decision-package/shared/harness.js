// Shared prototype harness — Phase 1 decision package.
//
// Loads a frozen fixture (captured from main = 78f949c; see
// ../fixtures/PROVENANCE.md) and provides the review controls every variant
// shares: scenario switch (dense-c / dense-a / sparse-b), language switch
// (EN / ES). The harness owns NO product presentation — each variant
// directory owns its own composition and must not edit this file.
//
// Contract for variants:
//   DF.onReady(function (fixture, ctx) { renderYourVariant(fixture, ctx); })
//   ctx = { scenario, lang, L }  — L(obj) mirrors production semantics:
//   resolve {en, es} objects to the active language, falling back to en.
//   Re-render happens by full page reload with new query params, matching
//   the production rule that language resolves at render time from bilingual
//   state (never stored resolved).
//
// PROTOTYPE ONLY. Not imported, linked or executed by the production
// application. Interactions simulated here against frozen fixtures are
// prototype behavior, not production behavior.

(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var scenario = params.get("scenario") || "dense-c";
  var lang = params.get("lang") === "es" ? "es" : "en";
  // boundary-one is the disclosed SYNTHETIC one-priority boundary state
  // (see fixtures/PROVENANCE.md) — a rendering-contract probe, not a
  // reachable customer state.
  var SCENARIOS = ["dense-c", "dense-a", "sparse-b", "boundary-one"];
  if (SCENARIOS.indexOf(scenario) === -1) scenario = "dense-c";

  function L(obj) {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : "");
  }

  function deepFreeze(obj) {
    if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
      Object.freeze(obj);
      Object.keys(obj).forEach(function (k) { deepFreeze(obj[k]); });
    }
    return obj;
  }

  function link(newParams) {
    var p = new URLSearchParams(window.location.search);
    Object.keys(newParams).forEach(function (k) { p.set(k, newParams[k]); });
    return window.location.pathname + "?" + p.toString();
  }

  function buildReviewBar(fixture) {
    var bar = document.createElement("div");
    bar.className = "df-review-bar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", lang === "es"
      ? "Controles de revisión del prototipo (no son parte del producto)"
      : "Prototype review controls (not product UI)");

    var note = document.createElement("p");
    note.className = "df-review-bar__note";
    // The commit comes from the fixture itself (meta.engineSourceCommit,
    // stamped by the capture) — never hardcoded here, so a recapture at a
    // different engine commit is reflected on every screen automatically.
    var commit = (fixture && fixture.meta && fixture.meta.engineSourceCommit
      ? String(fixture.meta.engineSourceCommit).slice(0, 7) : "unknown");
    note.textContent = (lang === "es"
      ? "PROTOTIPO — no es producción. Datos congelados del commit "
      : "PROTOTYPE — not production. Frozen fixture data from commit ")
      + commit + ".";
    bar.appendChild(note);

    function group(labelText, items) {
      var g = document.createElement("div");
      g.className = "df-review-bar__group";
      var lb = document.createElement("span");
      lb.className = "df-review-bar__label";
      lb.textContent = labelText;
      g.appendChild(lb);
      items.forEach(function (it) {
        var a = document.createElement("a");
        a.className = "df-review-bar__btn" + (it.active ? " is-active" : "");
        a.href = it.href;
        a.textContent = it.text;
        if (it.active) a.setAttribute("aria-current", "true");
        g.appendChild(a);
      });
      return g;
    }

    bar.appendChild(group(lang === "es" ? "Escenario:" : "Scenario:",
      SCENARIOS.map(function (s) {
        return { text: s, href: link({ scenario: s }), active: s === scenario };
      })));
    bar.appendChild(group(lang === "es" ? "Idioma:" : "Language:", [
      { text: "EN", href: link({ lang: "en" }), active: lang === "en" },
      { text: "ES", href: link({ lang: "es" }), active: lang === "es" },
    ]));
    return bar;
  }

  var readyCbs = [];
  var loaded = null;

  window.DF = {
    onReady: function (cb) {
      if (loaded) cb(loaded.fixture, loaded.ctx);
      else readyCbs.push(cb);
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    fetch("../fixtures/scenario-" + scenario + ".json")
      .then(function (r) {
        if (!r.ok) throw new Error("fixture fetch failed: " + r.status);
        return r.json();
      })
      .then(function (fixture) {
        // Correction pass: "frozen" is now ENFORCED, not asserted — the
        // fixture object is deep-frozen before any variant sees it, so an
        // in-place sort()/splice()/overwrite throws in strict mode instead
        // of silently re-ordering engine output.
        deepFreeze(fixture);
        document.documentElement.setAttribute("lang", lang);
        document.body.insertBefore(buildReviewBar(fixture), document.body.firstChild);
        loaded = { fixture: fixture, ctx: { scenario: scenario, lang: lang, L: L } };
        readyCbs.forEach(function (cb) { cb(loaded.fixture, loaded.ctx); });
        readyCbs = [];
      })
      .catch(function (e) {
        var err = document.createElement("p");
        err.setAttribute("role", "alert");
        err.textContent = "Fixture load failed (" + e.message + "). Serve the repo root over HTTP, e.g.: python -m http.server 8000";
        document.body.insertBefore(err, document.body.firstChild);
      });
  });
})();
