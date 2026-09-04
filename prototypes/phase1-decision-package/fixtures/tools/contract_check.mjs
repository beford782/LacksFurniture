// Prototype CONTRACT runner — Phase 1 decision-package recommended candidates.
//
// Run: node prototypes/phase1-decision-package/fixtures/tools/contract_check.mjs
// Exit 0 = every contract holds; exit 1 otherwise.
//
// WHAT THIS PROVES (exactly): it executes the two RECOMMENDED candidate
// prototypes (sleep-brief-recommended, results-tabs) inside a minimal Node
// DOM stub, against every frozen fixture scenario (dense-c, dense-a,
// sparse-b, boundary-one) in both languages, and asserts the deterministic
// rendering contracts listed below — hero identity, priority order/count,
// exact firmness, badge order/source, tier membership/order, threshold-copy
// wiring, terminology, proposed-copy marking, tab semantics, the compare
// selection state machine (0/1/2/ready/open/deselect, non-Gold), and the
// focus/scroll consequence of opening Compare.
//
// WHAT THIS DOES NOT PROVE: mounted-showroom-device usability, real
// assistive-technology behavior, visual layout or overflow as actually
// painted (the stub has no layout engine — the target-size and overflow
// checks here are STATIC CSS-text checks, representative only), customer
// comprehension, or production readiness. It does not run in repository CI
// unless CI is explicitly changed to call it — report its result separately
// from the repository suite. Phase 0.4 remains open.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  stripTags, walk, queryAll, runVariant as runVariantStub,
  loadFixture as loadFixtureFrom,
} from "./stub_dom.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
// CONTRACT_PKG_DIR override lets the negative runner point this script at an
// isolated mutated copy of the package without touching the worktree.
const pkg = process.env.CONTRACT_PKG_DIR || join(root, "prototypes", "phase1-decision-package");
const fixturesDir = join(pkg, "fixtures");

const SCENARIO_NAMES = ["dense-c", "dense-a", "sparse-b", "boundary-one"];
const LANGS = ["en", "es"];

let passed = 0, failed = 0;
const failures = [];
function check(label, cond, detail) {
  if (cond) { passed++; }
  else { failed++; failures.push(label + (detail ? " — " + detail : "")); console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

/* DOM stub + variant executor live in stub_dom.mjs (shared with the
   negative runner). runVariant passes a STRICT ctx.L — no English
   fallback — and ctx.mode; see stub_dom.mjs for the rationale. */

function runVariant(scriptPath, fixture, scenario, lang, opts) {
  return runVariantStub(scriptPath, fixture, scenario, lang, opts);
}

function loadFixture(name) {
  return loadFixtureFrom(fixturesDir, name);
}

function textOf(node) { return node.textContent; }

function allText(doc) {
  let t = doc.title + "\n";
  // gather every registered/created node reachable from ids we know plus body
  const seen = new Set();
  const gather = (n) => { if (!n || seen.has(n)) return; seen.add(n); t += n._text || ""; if (n._innerHTML) t += stripTags(n._innerHTML); (n.children || []).forEach((c) => c.nodeType === 3 ? (t += c.textContent) : gather(c)); };
  // walk from every root-ish node
  for (const id of ["app", "sbrMain", "sbrEyebrow", "sbrHeroTitle", "sbrHeroLede", "sbrBadges", "sbrFirm", "sbrPrioritiesHeading", "sbrBasis", "sbrPriorityList", "sbrReassure", "sbrJourneyHeading", "sbrJourneyList", "sbrJourneyCopy", "sbrLegend", "sbrEditBtn", "sbrCtaBtn", "sbrSimCaption"]) {
    gather(doc.getElementById(id));
  }
  return t;
}

const CLINICAL_RAW = [
  "hip_pain", "back_pain", "sleep_issues", "health_conditions", "partner_disturbance",
  "reflux", "reflujo", "apnea", "snor", "ronquido", "diagnos",
];

/* ======================= Sleep Brief candidate ======================= */

const SBR_JS = join(pkg, "sleep-brief-recommended", "sbr.js");
const SBR_HTML = readFileSync(join(pkg, "sleep-brief-recommended", "index.html"), "utf8");
const SBR_CSS = readFileSync(join(pkg, "sleep-brief-recommended", "sbr.css"), "utf8");

console.log("\n=== sleep-brief-recommended ===");

// Static-source contracts (once). Comments are stripped first — the checks
// target markup/code, not the explanatory prose about what was removed.
const stripHtmlComments = (s) => s.replace(/<!--[\s\S]*?-->/g, "");
const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
check("sbr: no Compare entry anywhere in the candidate (markup)",
  !/compar/i.test(stripHtmlComments(SBR_HTML)));
check("sbr: no Compare/compareDemo consumption in the candidate (script)",
  !/compareDemo|finalist/i.test(stripJsComments(readFileSync(SBR_JS, "utf8"))));
check("sbr: sim caption + legend are prototype chrome in markup",
  /id="sbrSimCaption" data-prototype-chrome=""/.test(SBR_HTML) &&
  /id="sbrLegend" data-prototype-chrome=""/.test(SBR_HTML));
check("sbr: CSS declares >=48px min-height action targets (static check)",
  /\.sbr-btn\s*\{[^}]*min-height:\s*48px/.test(SBR_CSS));
check("sbr: CSS keeps the page from horizontal scroll (static check)",
  /body\s*\{[^}]*overflow-x:\s*hidden/.test(SBR_CSS));
check("sbr: CSS marks proposed copy visibly (static check)",
  /\[data-proposed-copy\]\s*\{[^}]*underline dotted/.test(SBR_CSS));

for (const scenario of SCENARIO_NAMES) {
  const fixture = loadFixture(scenario);
  for (const lang of LANGS) {
    const label = `sbr ${scenario}/${lang}`;
    const { doc } = runVariant(SBR_JS, fixture, scenario, lang);
    const prof = fixture.profile[lang];
    const rows = prof.priorityRows;

    // Hero is exactly priorityRows[0], by index.
    check(`${label}: hero title == priorityRows[0].title`,
      textOf(doc.getElementById("sbrHeroTitle")) === rows[0].title,
      JSON.stringify(textOf(doc.getElementById("sbrHeroTitle"))));
    check(`${label}: hero lede == priorityRows[0].desc`,
      textOf(doc.getElementById("sbrHeroLede")) === rows[0].desc);
    check(`${label}: eyebrow == captured production heading`,
      textOf(doc.getElementById("sbrEyebrow")) === prof.dom.profileName.textContent);

    // Priorities: exact order, exact count (1-3), visible always-on tests.
    const list = doc.getElementById("sbrPriorityList");
    const items = list.children.filter((c) => c.nodeType === 1);
    check(`${label}: priority count exact (${rows.length})`, items.length === rows.length,
      `rendered ${items.length}`);
    rows.forEach((row, i) => {
      const li = items[i];
      if (!li) return;
      const h3 = li.querySelector("h3");
      check(`${label}: row ${i} title exact`, h3 && textOf(h3) === row.title);
      const test = li.querySelector(".sbr-priority__test");
      check(`${label}: row ${i} Try-this guidance rendered visibly (no disclosure)`,
        test && !test.hidden && textOf(test).includes(row.test));
      check(`${label}: row ${i} kind pill verbatim`,
        li.querySelector(".sbr-tag") && textOf(li.querySelector(".sbr-tag")) === row.tag);
    });
    check(`${label}: no disclosure buttons inside the priority list`,
      list.querySelectorAll("button").length === 0 &&
      queryAll(list, "[aria-expanded]").length === 0);

    // Firmness: exact integer, captured word, sr template, proposed-marked.
    const firm = doc.getElementById("sbrFirm");
    const filled = queryAll(firm, ".is-filled").length;
    check(`${label}: firmness segments filled == exact integer (${fixture.firmness.value})`,
      filled === fixture.firmness.value, `filled ${filled}`);
    const firmText = textOf(firm);
    check(`${label}: firmness numeral rendered as N/10`,
      firmText.includes(`${fixture.firmness.value}/10`));
    const feelWord = prof.metaStrip[1].value;
    const srExpect = lang === "es"
      ? `Firmeza: ${feelWord}, ${fixture.firmness.value} de 10`
      : `Firmness: ${feelWord}, ${fixture.firmness.value} of 10`;
    check(`${label}: firmness sr sentence uses the captured Brief vocabulary`,
      firmText.includes(srExpect));

    // Badges: dl with visible labels, invariant order, fixture-true values.
    const badges = doc.getElementById("sbrBadges").children.filter((c) => c.nodeType === 1);
    const ddVals = badges.map((b) => textOf(b.querySelector(".sbr-badge__value")));
    const dtVals = badges.map((b) => textOf(b.querySelector(".sbr-badge__label")));
    check(`${label}: every badge has a visible category label`,
      dtVals.every((v) => v && v.trim().length > 0));
    const iTemp = ddVals.indexOf(prof.metaStrip[2].value);
    const iFeel = ddVals.findIndex((v, i) => v === prof.metaStrip[1].value && i > iTemp);
    const iSize = ddVals.indexOf(prof.metaStrip[0].value);
    check(`${label}: captured metaStrip values present in temp<feel<size order`,
      iTemp > -1 && iFeel > iTemp && iSize > iFeel,
      JSON.stringify(ddVals));
    const hasPosition = !!fixture.meta.answers.sleep_position;
    check(`${label}: position badge ${hasPosition ? "present first" : "OMITTED (unanswered)"}`,
      hasPosition ? badges[0] && badges[0].getAttribute("data-proposed-copy") !== null && ddVals.length >= 4
                  : ddVals.length === (fixture.meta.answers.partner_sleep ? 4 : 3));

    // Actions: production edit label; proposed CTA; nothing else.
    check(`${label}: secondary action is the production Edit-answers label`,
      textOf(doc.getElementById("sbrEditBtn")) === prof.dom.profileSecondary.textContent);
    const cta = doc.getElementById("sbrCtaBtn");
    check(`${label}: primary CTA is the proposed See-My-Matches pair, marked`,
      textOf(cta).startsWith(lang === "es" ? "Ver Mis Opciones" : "See My Matches") &&
      cta.getAttribute("data-proposed-copy") !== null);

    // Proposed-copy marking: attribute + sr suffix on every marked node.
    const marker = lang === "es" ? "(copia propuesta" : "(proposed copy";
    let allMarked = true;
    for (const id of ["sbrBasis", "sbrCtaBtn"]) {
      if (!textOf(doc.getElementById(id)).includes(marker)) allMarked = false;
    }
    walk(doc.getElementById("sbrBadges"), (n) => {
      if (n.getAttribute && n.getAttribute("data-proposed-copy") !== null &&
          !textOf(n).includes(marker)) allMarked = false;
    });
    check(`${label}: every proposed node carries the sr "(proposed copy)" suffix`, allMarked);

    // Leakage: no percentages, scores, ranks, or raw clinical identifiers.
    const text = allText(doc);
    check(`${label}: no percent/score/rank leakage`,
      !/%/.test(text) && !/\bscore\b/i.test(text) && !/match(ed)? percentage/i.test(text));
    check(`${label}: no raw clinical identifiers in rendered text`,
      !CLINICAL_RAW.some((w) => text.toLowerCase().includes(w)));

    // Language integrity: ES render carries no EN marker strings.
    if (lang === "es") {
      const enMarkers = ["Try this:", "See My Matches", "In order, based on your answers",
        "(proposed copy", "Edit my answers"];
      check(`${label}: no English fallback markers in ES render`,
        !enMarkers.some((m) => text.includes(m)),
        enMarkers.filter((m) => text.includes(m)).join("|"));
      check(`${label}: authored Spanish present (Pruébalo)`,
        text.includes("Pruébalo:"));
    }
  }
}

/* ========================= Results tabs candidate ========================= */

const TABS_JS = join(pkg, "results-tabs", "script.js");
const TABS_SRC = readFileSync(TABS_JS, "utf8");
const TABS_CSS = readFileSync(join(pkg, "results-tabs", "styles.css"), "utf8");
const TIERS = ["gold", "silver", "bronze"];

console.log("\n=== results-tabs ===");

check("tabs: buyer-characterising descriptors absent from source (comments stripped)",
  !/entry-level|básico|basico|premium materials|mid-range|gama media|materiales premium/
    .test(TABS_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")));
check("tabs: CSS declares >=48px card/tab targets and >=44px tray targets (static check)",
  /\.tier-tab\s*\{[^}]*min-height:\s*48px/.test(TABS_CSS) &&
  /\.card-btn\s*\{[^}]*min-height:\s*48px/.test(TABS_CSS) &&
  /\.compare-toggle\s*\{[^}]*min-height:\s*48px/.test(TABS_CSS) &&
  /\.tray-btn\s*\{[^}]*min-height:\s*44px/.test(TABS_CSS));
check("tabs: CSS keeps the page from horizontal scroll (static check)",
  /body\s*\{[^}]*overflow-x:\s*hidden/.test(TABS_CSS));
check("tabs: CSS marks proposed copy visibly (static check)",
  /\[data-proposed-copy\]\s*\{[^}]*underline dotted/.test(TABS_CSS));

for (const scenario of SCENARIO_NAMES) {
  // boundary-one note: for this variant the synthetic vector is a rendering-
  // fidelity data point ONLY — its cardPriorities/metaStrip were produced
  // with sleep_position undefined and are not representative of any
  // reachable customer state (disclosed in PROVENANCE.md). The assertions
  // below are render==fixture contracts, which remain valid.
  const fixture = loadFixture(scenario);

  // Threshold-copy guard: 77,000-run sampling of the real engine on the
  // shipped catalog found ZERO meetsMatchThreshold:false entries — the
  // degraded branch is unreachable from real data. Every fixture entry must
  // therefore be true; a fabricated false entry (the adversarial finding
  // this package once contained) fails here.
  check(`fixture ${scenario}: every tier entry meetsMatchThreshold===true (degraded branch unreachable from real data)`,
    TIERS.every((t) => fixture.results.tierData[t].every((m) => m.meetsMatchThreshold === true)));

  for (const lang of LANGS) {
    const label = `tabs ${scenario}/${lang}`;
    const { doc } = runVariant(TABS_JS, fixture, scenario, lang);
    const app = doc.getElementById("app");
    const tierData = fixture.results.tierData;

    // --- tab semantics ---
    const tablist = queryAll(app, "[role]").filter((n) => n.getAttribute("role") === "tablist")[0];
    check(`${label}: role=tablist present`, !!tablist);
    const tabs = tablist ? tablist.children.filter((n) => n.getAttribute("role") === "tab") : [];
    check(`${label}: exactly three role=tab in gold/silver/bronze order`,
      tabs.length === 3 && tabs.map((t) => t.id).join(",") === "tab-gold,tab-silver,tab-bronze");
    check(`${label}: initial selection is Gold with roving tabindex`,
      tabs.length === 3 &&
      tabs[0].getAttribute("aria-selected") === "true" && tabs[0].getAttribute("tabindex") === "0" &&
      tabs[1].getAttribute("aria-selected") === "false" && tabs[1].getAttribute("tabindex") === "-1");
    const panel = doc.getElementById("tierPanel");
    check(`${label}: role=tabpanel labelled by the active tab`,
      panel.getAttribute("role") === "tabpanel" && panel.getAttribute("aria-labelledby") === "tab-gold");

    // --- card contract per tier (checked on the active tier, then switched) ---
    function assertTierCards(tier) {
      const cards = queryAll(panel, ".m-card");
      const ids = cards.map((c) => c.getAttribute("data-id"));
      check(`${label}/${tier}: card ids == fixture membership+order`,
        JSON.stringify(ids) === JSON.stringify(tierData[tier].map((m) => m.id)),
        JSON.stringify(ids));
      check(`${label}/${tier}: exactly one lead card, first by index`,
        cards.length > 0 && cards[0]._classes.has("is-lead") &&
        cards.slice(1).every((c) => c._classes.has("is-support")));
      tierData[tier].forEach((entry, i) => {
        const card = cards[i];
        if (!card) return;
        const filled = queryAll(card, ".filled").length;
        check(`${label}/${tier}: ${entry.id} firmness exact (${entry.firmness})`,
          filled === entry.firmness, `filled ${filled}`);
        const eyebrow = textOf(card.querySelector(".m-card-eyebrow"));
        const expectedEyebrow = entry.meetsMatchThreshold
          ? (i === 0 ? (lang === "es" ? "El mejor punto de partida" : "Best place to start")
                     : (lang === "es" ? "Coincide con tus prioridades" : "Matches your priorities"))
          : (lang === "es" ? "Opción adicional para comparar" : "Additional comparison option");
        check(`${label}/${tier}: ${entry.id} threshold-honest eyebrow`, eyebrow === expectedEyebrow, eyebrow);
        // NO product-description layer anywhere (focused pass): topPickReason
        // is not established claim-safe copy and must not render in either
        // language. The lead card carries the reviewer-mode-only chrome
        // placeholder instead; nothing in evaluation mode.
        check(`${label}/${tier}: ${entry.id} topPickReason does NOT render (either language)`,
          !textOf(card).includes(entry.topPickReason.en) &&
          !textOf(card).includes(entry.topPickReason.es));
        check(`${label}/${tier}: no product-story block exists`,
          !card.querySelector(".product-story"));
        const placeholder = card.querySelector(".product-desc-placeholder");
        if (i === 0) {
          check(`${label}/${tier}: lead carries the reviewer-mode description placeholder (chrome)`,
            placeholder && placeholder.getAttribute("data-prototype-chrome") !== null &&
            /could occupy|podría ocupar/.test(textOf(placeholder)));
        } else {
          check(`${label}/${tier}: support card has no description placeholder`, !placeholder);
          check(`${label}/${tier}: support fit rows are compact (no descs)`,
            queryAll(card, ".fit-desc").length === 0);
        }
        // Fit rows subset by index, titles exact.
        const fitTitles = queryAll(card, ".fit-title").map(textOf);
        const expectRows = (fixture.results.cardPriorities[lang][entry.id] || []).slice(0, 3);
        check(`${label}/${tier}: ${entry.id} fit-row titles == fixture rows by index`,
          JSON.stringify(fitTitles) === JSON.stringify(expectRows.map((r) => r.title)));
        // Actions: verbatim Details/Save + compare toggle.
        const detailsWant = lang === "es" ? "Ver detalles →" : "View match details →";
        const saveWant = lang === "es" ? "Guardar" : "Save for later";
        const btns = queryAll(card, "button");
        check(`${label}/${tier}: ${entry.id} Details/Save verbatim + sim-identified`,
          btns.some((b) => textOf(b).startsWith(detailsWant) && b.getAttribute("aria-describedby") === "cardSimNote") &&
          btns.some((b) => textOf(b).startsWith(saveWant) && b.getAttribute("aria-describedby") === "cardSimNote"));
        check(`${label}/${tier}: ${entry.id} compare toggle present, unpressed`,
          queryAll(card, ".compare-toggle").length === 1);
      });
    }
    assertTierCards("gold");

    // No tier subtitle / buyer-characterising copy in the render.
    const fullText = () => textOf(app) + "\n" + doc.title;
    check(`${label}: no buyer-characterising tier descriptor in render`,
      !/entry-level|básico|premium materials|mid-range|gama media|materiales premium/i.test(fullText()));

    // Terminology: "finalists" only inside the prototype-chrome footnote.
    {
      const t = fullText();
      const found = (t.match(/finalist|finalista/gi) || []).length;
      let chromeFinalists = 0;
      walk(app, (n) => {
        if (n.getAttribute && n.getAttribute("data-prototype-chrome") !== null) {
          chromeFinalists += (n.textContent.match(/finalist|finalista/gi) || []).length;
        }
      });
      check(`${label}: "finalists" vocabulary only in the production-constraint footnote`,
        found === chromeFinalists, `${found} total vs ${chromeFinalists} in chrome`);
      // State-accurate compare language (focused pass): stable noun-phrase
      // heading, action-verb opener — never duplicates of each other.
      const headingWant = lang === "es" ? "Comparación de colchones" : "Mattress comparison";
      const openWant = lang === "es" ? "Comparar colchones seleccionados" : "Compare selected mattresses";
      const headingText = textOf(doc.getElementById("compareHeading"));
      const entryText = textOf(queryAll(app, ".compare-entry")[0]);
      check(`${label}: compare heading is the stable noun phrase`,
        headingText.startsWith(headingWant), headingText);
      check(`${label}: closed opener carries the action label, distinct from the heading`,
        entryText.startsWith(openWant) && !entryText.startsWith(headingWant), entryText);
    }

    // Leakage: captured pct values must never render as percentages.
    {
      const t = fullText();
      let leaked = false;
      for (const tier of TIERS) for (const m of tierData[tier]) {
        if (m.pct !== undefined && t.includes(`${m.pct}%`)) leaked = true;
      }
      check(`${label}: no captured match percentage renders`, !leaked);
      check(`${label}: no "match percentage" phrasing`, !/match(ed)? percentage|porcentaje de coincidencia/i.test(t));
    }

    // Payment Choice: one secondary module, disabled, stale-closed (no rates).
    {
      const fins = queryAll(app, ".fin-module");
      check(`${label}: exactly one Payment Choice module`, fins.length === 1);
      const finText = fins[0] ? textOf(fins[0]) : "";
      check(`${label}: financing is stale-closed (no rate/term/price text)`,
        !/%|APR|\$|\bmes(es)?\b|\bmonth(s|ly)?\b/i.test(finText));
      check(`${label}: financing buttons inert`,
        queryAll(fins[0], "button").every((b) => b.getAttribute("disabled") !== null));
    }

    // Heading structure: exactly one h1; no h3 before the first h2.
    {
      const hs = [];
      walk(app, (n) => { if (/^H[1-6]$/.test(n.tagName)) hs.push(n.tagName); });
      check(`${label}: exactly one h1`, hs.filter((h) => h === "H1").length === 1);
      const firstH2 = hs.indexOf("H2"), firstH3 = hs.indexOf("H3");
      check(`${label}: no h3 precedes the first h2`, firstH3 === -1 || (firstH2 !== -1 && firstH2 < firstH3));
    }

    // --- compare selection state machine ---
    const entryBtn = queryAll(app, ".compare-entry")[0];
    const tray = queryAll(app, ".compare-tray")[0];
    const heading = doc.getElementById("compareHeading");
    const goldCards = queryAll(panel, ".m-card");
    const toggleOf = (card) => queryAll(card, ".compare-toggle")[0];

    check(`${label}: state 0 — entry disabled, tray hidden, hint visible`,
      entryBtn.getAttribute("disabled") !== null && tray.hidden &&
      !queryAll(app, ".compare-hint")[0].hidden);

    toggleOf(goldCards[0]).dispatch("click");
    check(`${label}: state 1 — toggle pressed, tray shows 1 of 2, entry still disabled`,
      toggleOf(goldCards[0]).getAttribute("aria-pressed") === "true" &&
      !tray.hidden && textOf(tray).includes(lang === "es" ? "1 de 2" : "1 of 2") &&
      entryBtn.getAttribute("disabled") !== null);

    toggleOf(goldCards[1]).dispatch("click");
    check(`${label}: state 2 — compare-ready, entry enabled, hint hidden`,
      entryBtn.getAttribute("disabled") === null &&
      queryAll(app, ".compare-hint")[0].hidden &&
      textOf(tray).includes(lang === "es" ? "2 de 2" : "2 of 2"));
    check(`${label}: cap 2 — third toggle disabled`,
      goldCards[2] ? toggleOf(goldCards[2]).getAttribute("disabled") !== null : true);

    const trayGo = queryAll(tray, ".go")[0];
    const closeWant = lang === "es" ? "Cerrar comparación" : "Close comparison";
    const openWant2 = lang === "es" ? "Comparar colchones seleccionados" : "Compare selected mattresses";
    const trayGoClosedWant = lang === "es" ? "Comparar →" : "Compare →";

    const scrollsBefore = heading._scrollIntoViewCalls, focusBefore = heading._focusCalls;
    entryBtn.dispatch("click");
    const comparePanelEl = doc.getElementById("comparePanel");
    check(`${label}: compare-open — panel visible with both selected models`,
      !comparePanelEl.hidden &&
      queryAll(comparePanelEl, ".compare-col").length === 2 &&
      textOf(comparePanelEl).includes(tierData.gold[0].name) &&
      textOf(comparePanelEl).includes(tierData.gold[1].name));
    check(`${label}: opening Compare scrolls to AND focuses the stable heading`,
      heading._scrollIntoViewCalls === scrollsBefore + 1 &&
      heading._focusCalls === focusBefore + 1 &&
      doc.activeElement === heading);
    check(`${label}: compare panel shows tier NAME, never a percentage`,
      textOf(comparePanelEl).includes(lang === "es" ? "Oro" : "Gold") &&
      !/%/.test(textOf(comparePanelEl)));
    // State-accurate open labels: BOTH routes read Close, never the opener
    // label, while aria-expanded says true (focused pass).
    check(`${label}: open state — both compare controls read "Close comparison"`,
      textOf(entryBtn).startsWith(closeWant) && textOf(trayGo).startsWith(closeWant) &&
      entryBtn.getAttribute("aria-expanded") === "true" &&
      trayGo.getAttribute("aria-expanded") === "true");

    // Deselection closes a stale panel; labels revert to the closed state.
    toggleOf(goldCards[1]).dispatch("click");
    check(`${label}: deselection — panel closes, tray back to 1 of 2`,
      comparePanelEl.hidden && textOf(tray).includes(lang === "es" ? "1 de 2" : "1 of 2"));
    check(`${label}: closed state — labels revert (opener action, tray production static)`,
      textOf(entryBtn).startsWith(openWant2) &&
      textOf(trayGo).startsWith(trayGoClosedWant) &&
      entryBtn.getAttribute("aria-expanded") === "false");
    check(`${label}: EN closed tray label carries no proposed marking (production-verbatim)`,
      lang === "es" || trayGo.getAttribute("data-proposed-copy") === null);
    // Clear empties and moves focus to the active tab.
    queryAll(tray, "button")[0].dispatch("click");
    check(`${label}: Clear — tray hidden, focus on active tier tab`,
      tray.hidden && doc.activeElement === tabs[0]);

    // --- non-Gold tier: switch to silver by keyboard, select there ---
    tabs[0].dispatch("keydown", { key: "ArrowRight" });
    check(`${label}: ArrowRight — silver selected, focus moved, panel relabelled`,
      tabs[1].getAttribute("aria-selected") === "true" &&
      tabs[1].getAttribute("tabindex") === "0" &&
      doc.activeElement === tabs[1] &&
      panel.getAttribute("aria-labelledby") === "tab-silver");
    assertTierCards("silver");
    const silverCards = queryAll(panel, ".m-card");
    toggleOf(silverCards[0]).dispatch("click");
    toggleOf(silverCards[1]).dispatch("click");
    check(`${label}: non-Gold selection reaches compare-ready`,
      entryBtn.getAttribute("disabled") === null &&
      textOf(tray).includes(tierData.silver[0].name));

    // SECOND opening route: the sticky tray action must produce the same
    // consequences as the section opener — panel visible with the silver
    // pair, focus+scroll on the stable heading, Close labels on both routes.
    const s2 = heading._scrollIntoViewCalls, f2 = heading._focusCalls;
    trayGo.dispatch("click");
    check(`${label}: tray route — panel opens with the silver pair`,
      !comparePanelEl.hidden &&
      textOf(comparePanelEl).includes(tierData.silver[0].name) &&
      textOf(comparePanelEl).includes(tierData.silver[1].name));
    check(`${label}: tray route — focus/scroll consequence and Close labels on both routes`,
      heading._scrollIntoViewCalls === s2 + 1 && heading._focusCalls === f2 + 1 &&
      textOf(entryBtn).startsWith(closeWant) && textOf(trayGo).startsWith(closeWant));
    trayGo.dispatch("click");
    check(`${label}: tray route — closes again, labels revert`,
      comparePanelEl.hidden && textOf(trayGo).startsWith(trayGoClosedWant));

    // Language integrity (ES render).
    if (lang === "es") {
      const t = fullText();
      const enMarkers = ["Compare selected mattresses", "Save for later", "View match details",
        "Best place to start", "Matches your priorities", "(proposed copy"];
      check(`${label}: no English fallback markers in ES render`,
        !enMarkers.some((m) => t.includes(m)),
        enMarkers.filter((m) => t.includes(m)).join("|"));
    }

    // Proposed marking carries the sr suffix everywhere.
    {
      const marker = lang === "es" ? "(copia propuesta" : "(proposed copy";
      let ok = true;
      walk(app, (n) => {
        if (n.getAttribute && n.getAttribute("data-proposed-copy") !== null &&
            !n.textContent.includes(marker)) ok = false;
      });
      check(`${label}: every proposed node carries the sr "(proposed copy)" suffix`, ok);
    }
  }
}

/* ============ evaluation mode: same product state, zero reviewer
   apparatus (focused pass). The mode exists so the assisted-sales dry run
   is not biased by annotation; these checks prove it removes ONLY
   reviewer apparatus and does not change product-state output. ============ */

console.log("\n=== evaluation mode ===");

check("eval: shared harness sets the df-eval class and builds the minimal notice bar",
  /classList\.add\("df-eval"\)/.test(readFileSync(join(pkg, "shared", "harness.js"), "utf8")) &&
  /df-review-bar--eval/.test(readFileSync(join(pkg, "shared", "harness.js"), "utf8")));
check("eval: both candidate stylesheets suppress the proposed-copy underline under html.df-eval",
  /html\.df-eval \[data-proposed-copy\]\s*\{\s*text-decoration:\s*none/.test(SBR_CSS_TEXT()) &&
  /html\.df-eval \[data-proposed-copy\]\s*\{\s*text-decoration:\s*none/.test(TABS_CSS));

function SBR_CSS_TEXT() { return readFileSync(join(pkg, "sleep-brief-recommended", "sbr.css"), "utf8"); }

for (const scenario of SCENARIO_NAMES) {
  const fixture = loadFixture(scenario);
  for (const lang of LANGS) {
    const label = `eval ${scenario}/${lang}`;
    const srMark = lang === "es" ? "(copia propuesta" : "(proposed copy";

    // ---- Sleep Brief candidate ----
    {
      const rev = runVariant(SBR_JS, fixture, scenario, lang).doc;
      const ev = runVariant(SBR_JS, fixture, scenario, lang, { mode: "evaluation" }).doc;
      check(`${label} sbr: no sr proposed-copy suffix in evaluation output`,
        !allText(ev).includes(srMark));
      check(`${label} sbr: legend and sim caption hidden and empty in evaluation`,
        ev.getElementById("sbrLegend").hidden && textOf(ev.getElementById("sbrLegend")) === "" &&
        ev.getElementById("sbrSimCaption").hidden && textOf(ev.getElementById("sbrSimCaption")) === "");
      // Product-state snapshot; the reviewer-only sr suffix is the ONE
      // legitimate textual difference, stripped before comparing.
      const fullSuffix = lang === "es"
        ? " (copia propuesta — no de producción)" : " (proposed copy — not production)";
      const strip = (d) => [
        textOf(d.getElementById("sbrHeroTitle")), textOf(d.getElementById("sbrHeroLede")),
        queryAll(d.getElementById("sbrPriorityList"), "h3").map(textOf).join("|"),
        queryAll(d.getElementById("sbrFirm"), ".is-filled").length,
        queryAll(d.getElementById("sbrBadges"), ".sbr-badge__value").map(textOf).join("|"),
        textOf(d.getElementById("sbrEditBtn")),
        textOf(d.getElementById("sbrCtaBtn")),
        textOf(d.getElementById("sbrBasis")),
      ].join("~").split(fullSuffix).join("");
      check(`${label} sbr: product state identical across modes (apparatus removed only)`,
        strip(rev) === strip(ev), "");
      check(`${label} sbr: proposed-copy attributes retained in evaluation (provenance)`,
        queryAll(ev.getElementById("sbrBadges"), "[data-proposed-copy]").length ===
        queryAll(rev.getElementById("sbrBadges"), "[data-proposed-copy]").length);
    }

    // ---- Results tabs candidate ----
    {
      const rev = runVariant(TABS_JS, fixture, scenario, lang).doc;
      const ev = runVariant(TABS_JS, fixture, scenario, lang, { mode: "evaluation" }).doc;
      const revApp = rev.getElementById("app");
      const evApp = ev.getElementById("app");
      check(`${label} tabs: zero prototype-chrome elements in evaluation output`,
        queryAll(evApp, "[data-prototype-chrome]").length === 0,
        `${queryAll(evApp, "[data-prototype-chrome]").length} found`);
      check(`${label} tabs: no sr proposed-copy suffix in evaluation output`,
        !textOf(evApp).includes(srMark));
      check(`${label} tabs: no description placeholder in evaluation (review-only)`,
        queryAll(evApp, ".product-desc-placeholder").length === 0);
      const cardState = (d) => {
        const p = d.getElementById("tierPanel");
        return [
          queryAll(p, ".m-card").map((c) => c.getAttribute("data-id")).join("|"),
          queryAll(p, ".fit-title").map(textOf).join("|"),
          queryAll(p, ".filled").length,
          queryAll(p, ".details-btn").length, queryAll(p, ".save-btn").length,
          queryAll(p, ".compare-toggle").length,
        ].join("~");
      };
      check(`${label} tabs: product state identical across modes (cards, fit rows, actions)`,
        cardState(rev) === cardState(ev));
      // Compare flow still fully works in evaluation mode, with the focus
      // consequence and without the sim banner.
      const cards = queryAll(ev.getElementById("tierPanel"), ".m-card");
      queryAll(cards[0], ".compare-toggle")[0].dispatch("click");
      queryAll(cards[1], ".compare-toggle")[0].dispatch("click");
      const evEntry = queryAll(evApp, ".compare-entry")[0];
      const evHeading = ev.getElementById("compareHeading");
      const f0 = evHeading._focusCalls;
      evEntry.dispatch("click");
      check(`${label} tabs: evaluation compare-open works with focus consequence, no sim banner`,
        !ev.getElementById("comparePanel").hidden &&
        evHeading._focusCalls === f0 + 1 &&
        queryAll(ev.getElementById("comparePanel"), ".sim-banner").length === 0);
    }
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\nFailed checks:");
  failures.forEach((f) => console.log("  - " + f));
}
process.exit(failed ? 1 : 0);
