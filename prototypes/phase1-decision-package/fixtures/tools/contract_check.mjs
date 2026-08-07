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

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const pkg = join(root, "prototypes", "phase1-decision-package");
const fixturesDir = join(pkg, "fixtures");

const SCENARIO_NAMES = ["dense-c", "dense-a", "sparse-b", "boundary-one"];
const LANGS = ["en", "es"];

let passed = 0, failed = 0;
const failures = [];
function check(label, cond, detail) {
  if (cond) { passed++; }
  else { failed++; failures.push(label + (detail ? " — " + detail : "")); console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

/* ================= minimal DOM stub (no layout engine) ================= */

class StubNode {
  constructor(tag, doc) {
    this.tagName = (tag || "").toUpperCase();
    this._doc = doc;
    this.children = [];
    this.parentNode = null;
    this._attrs = new Map();
    this._classes = new Set();
    this._text = "";
    this._innerHTML = null;
    this._listeners = new Map();
    this.style = Object.assign(Object.create({ setProperty() {} }), {});
    this.nodeType = 1;
    this._focusCalls = 0;
    this._scrollIntoViewCalls = 0;
  }
  get id() { return this._attrs.get("id") || ""; }
  set id(v) { this._attrs.set("id", v); this._doc._register(this); }
  get className() { return [...this._classes].join(" "); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get classList() {
    const self = this;
    return {
      add: (c) => self._classes.add(c),
      remove: (c) => self._classes.delete(c),
      contains: (c) => self._classes.has(c),
    };
  }
  setAttribute(k, v) {
    this._attrs.set(k, String(v));
    if (k === "id") this._doc._register(this);
    if (k === "class") this.className = v;
  }
  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
  removeAttribute(k) { this._attrs.delete(k); }
  get hidden() { return this._attrs.has("hidden"); }
  set hidden(v) { if (v) this._attrs.set("hidden", ""); else this._attrs.delete("hidden"); }
  appendChild(n) {
    if (n && typeof n === "object") { n.parentNode = this; this.children.push(n); }
    return n;
  }
  get textContent() {
    let t = this._text || "";
    if (this._innerHTML) t += stripTags(this._innerHTML);
    for (const c of this.children) t += c.nodeType === 3 ? c.textContent : c.textContent;
    return t;
  }
  set textContent(v) { this._text = String(v); this.children = []; this._innerHTML = null; }
  get innerHTML() { return this._innerHTML || ""; }
  set innerHTML(v) {
    this._innerHTML = String(v) || null;
    this.children = []; this._text = "";
  }
  addEventListener(type, fn) {
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type).push(fn);
  }
  dispatch(type, eventProps) {
    const e = Object.assign({ type, target: this, currentTarget: this, preventDefault() {} }, eventProps || {});
    for (const fn of this._listeners.get(type) || []) fn(e);
    return e;
  }
  focus() { this._focusCalls++; this._doc.activeElement = this; this._doc.focusLog.push(this); }
  scrollIntoView() { this._scrollIntoViewCalls++; this._doc.scrollLog.push(this); }
  getBoundingClientRect() { return { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 }; }
  get offsetHeight() { return 0; }
  querySelectorAll(sel) { return queryAll(this, sel); }
  querySelector(sel) { return queryAll(this, sel)[0] || null; }
  // template-element support: the journey rail parses captured production
  // markup through template.content.querySelectorAll(".cls").
  get content() {
    const html = this._innerHTML || "";
    return {
      querySelectorAll(sel) {
        const cls = sel.replace(/^\./, "");
        const out = [];
        const re = new RegExp(`<[a-z]+[^>]*class="[^"]*${cls}[^"]*"[^>]*>([\\s\\S]*?)<\\/`, "g");
        let m;
        while ((m = re.exec(html))) out.push({ textContent: stripTags(m[1]) });
        return out;
      },
    };
  }
}

function stripTags(html) { return String(html).replace(/<[^>]*>/g, ""); }

function walk(node, fn) {
  fn(node);
  for (const c of node.children || []) if (c.nodeType === 1) walk(c, fn);
}

function queryAll(rootNode, sel) {
  const out = [];
  // supports ".class", "tag", "[attr]" and comma lists — enough for the variants
  const alts = sel.split(",").map((s) => s.trim());
  walk(rootNode, (n) => {
    if (n === rootNode) return;
    for (const a of alts) {
      if (a.startsWith(".") && n._classes && n._classes.has(a.slice(1))) { out.push(n); return; }
      if (a.startsWith("[") && n._attrs && n._attrs.has(a.slice(1, -1))) { out.push(n); return; }
      if (/^[a-z][a-z0-9]*$/i.test(a) && n.tagName === a.toUpperCase()) { out.push(n); return; }
    }
  });
  return out;
}

function makeDocument() {
  const registry = new Map();
  const doc = {
    _register(n) { if (n.id) registry.set(n.id, n); },
    activeElement: null,
    focusLog: [],
    scrollLog: [],
    title: "",
    documentElement: null,
    body: null,
    createElement(tag) { return new StubNode(tag, doc); },
    createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
    getElementById(id) {
      if (!registry.has(id)) {
        // auto-create (the variants' static skeleton elements): matches the
        // capture harness's recording-shim approach.
        const n = new StubNode("div", doc);
        n.setAttribute("id", id);
        registry.set(id, n);
      }
      return registry.get(id);
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    removeEventListener() {},
  };
  doc.documentElement = new StubNode("html", doc);
  doc.body = new StubNode("body", doc);
  return doc;
}

/* ============ execute a variant script against one fixture ============ */

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.freeze(obj);
    Object.keys(obj).forEach((k) => deepFreeze(obj[k]));
  }
  return obj;
}

function runVariant(scriptPath, fixture, scenario, lang) {
  const src = readFileSync(scriptPath, "utf8");
  const doc = makeDocument();
  const win = {
    addEventListener() {}, removeEventListener() {},
    scrollByCalls: [],
    scrollBy(...a) { win.scrollByCalls.push(a); },
    location: { search: "" },
  };
  const DF = { _cb: null, onReady(cb) { DF._cb = cb; } };
  const L = (obj) => {
    if (obj == null) return "";
    if (typeof obj === "string") return obj;
    return obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : "");
  };
  const noTimer = () => 0;
  new Function("window", "document", "DF", "setTimeout", "clearTimeout", "URLSearchParams", src)(
    win, doc, DF, noTimer, noTimer, URLSearchParams);
  if (!DF._cb) throw new Error("variant registered no DF.onReady callback");
  // Deep-frozen, matching the shared harness: an in-place mutation of engine
  // output throws instead of silently re-ordering it.
  DF._cb(deepFreeze(JSON.parse(JSON.stringify(fixture))), { scenario, lang, L });
  return { doc, win };
}

function loadFixture(name) {
  return JSON.parse(readFileSync(join(fixturesDir, `scenario-${name}.json`), "utf8"));
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
        // Lead: product story labelled; supports: none.
        const story = card.querySelector(".product-story");
        if (i === 0) {
          check(`${label}/${tier}: lead carries labelled product description`,
            story && textOf(story).includes(entry.topPickReason[lang] || entry.topPickReason.en || ""));
        } else {
          check(`${label}/${tier}: support card has no product-story block`, !story);
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
      const headingWant = lang === "es" ? "Comparar colchones seleccionados" : "Compare selected mattresses";
      check(`${label}: compare heading/entry use page-local selection terminology`,
        textOf(doc.getElementById("compareHeading")).startsWith(headingWant));
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

    // Deselection closes a stale panel.
    toggleOf(goldCards[1]).dispatch("click");
    check(`${label}: deselection — panel closes, tray back to 1 of 2`,
      comparePanelEl.hidden && textOf(tray).includes(lang === "es" ? "1 de 2" : "1 of 2"));
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

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  console.log("\nFailed checks:");
  failures.forEach((f) => console.log("  - " + f));
}
process.exit(failed ? 1 : 0);
