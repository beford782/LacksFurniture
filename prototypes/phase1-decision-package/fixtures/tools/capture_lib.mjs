// Frozen-fixture capture library — Phase 1 decision-package prototypes.
//
// Extracts the REAL engine and renderer functions from index.html at the
// worktree's checked-out commit and EXECUTES them against fixed answer sets,
// recording their actual output. Nothing here reimplements, approximates or
// re-derives scoring, priorities, ordering, caps or firmness — the same
// extract-and-execute pattern as tests/scoring_isolation_check.mjs and
// tests/consultation_priorities_check.mjs, which this file's regexes copy.
//
// Consumed by capture_fixtures.mjs (writes the frozen JSON) and
// parity_check.mjs (re-captures and diffs against the frozen JSON).

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

// Engine-source guard, shared by capture AND parity: refuse to run against
// modified engine sources, and record the engine commit inside every fixture
// so no display surface has to hardcode it.
export const engineCommit = execSync("git rev-parse origin/main", { cwd: root }).toString().trim();
try {
  execSync("git diff --quiet origin/main -- index.html data Code.gs", { cwd: root });
} catch {
  throw new Error("index.html/data/Code.gs differ from origin/main — refusing to run against modified engine sources");
}

const html = readFileSync(join(root, "index.html"), "utf8");
export const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
export const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

export function lfSha256(path) {
  return createHash("sha256")
    .update(readFileSync(path, "utf8").split("\r\n").join("\n"))
    .digest("hex");
}

function grab(re, what) {
  const m = html.match(re);
  if (!m) throw new Error("extraction failed: " + what);
  return m[0];
}

// Same extraction patterns as the shipped suites.
const PROFILE_FN = grab(/function showProfileScreen\(\) \{[\s\S]*?\r?\n    \}\r?\n/, "showProfileScreen()");
const TRIAL_FN = grab(/function renderResultsTrialFocus\(\)\s*\{[\s\S]*?\n    \}/, "renderResultsTrialFocus()");
const L_FN = grab(/function L\(obj\) \{[\s\S]*?\n    \}/, "L()");
const ESCAPE_FN = grab(/function escapeHtml\([\s\S]*?\n    \}/, "escapeHtml()");
const CALC_FN = grab(/function calculateScores\(\)\s*\{[\s\S]*?\n    \}/, "calculateScores()");
const QUALIFY_FN = grab(/function qualifyRankedChoices\([\s\S]*?\n    \}/, "qualifyRankedChoices()");
const RESULTS_FN = grab(/window\.showResults = function\(\) \{[\s\S]*?\r?\n    \}/, "window.showResults");
const FEEL_FN = grab(/function firmnessFeel\([\s\S]*?\n    \}/, "firmnessFeel()");
const MATTPRI_FN = grab(/function buildMattressPriorities\([\s\S]*?\n    \}/, "buildMattressPriorities()");
const PAIR_FN = grab(/window\.compareReviewFinalists = function\(\) \{[\s\S]*?\n    \}/, "compareReviewFinalists()");
const LABEL_FN = grab(/function getFirmnessLabel\([\s\S]*?\n    \}/, "getFirmnessLabel()");
const SYMBOL_FN = grab(/function priceTierSymbol\([\s\S]*?\n    \}/, "priceTierSymbol()");

// Recording DOM shim — identical in spirit to consultation_priorities_check.mjs.
function makeDoc() {
  const els = new Map();
  const make = (id) => {
    const classes = new Set();
    return {
      id, innerHTML: "", textContent: "", style: {},
      classList: {
        add: (c) => classes.add(c),
        remove: (c) => classes.delete(c),
        contains: (c) => classes.has(c),
      },
      setAttribute() {}, getAttribute: () => null, focus() {},
    };
  };
  const doc = {
    getElementById: (id) => {
      if (!els.has(id)) els.set(id, make(id));
      return els.get(id);
    },
    querySelector: () => null, querySelectorAll: () => [],
  };
  return { els, doc };
}

const PROFILE_IDS = [
  "profileEyebrow", "profileName", "profileSubtitle", "profileSummary",
  "profileReflection", "profileMetaStrip", "profileReassurance",
  "profilePlanLabel", "profilePrioritiesHeading", "profilePrioritiesIntro",
  "profilePriorities", "profileJourneyHeading", "profileJourneySteps",
  "profileJourneyCopy", "profileSecondary", "profileCta",
];

function parseBriefList(innerHTML) {
  return [...innerHTML.matchAll(/<li class="noct-profile-priority-row">([\s\S]*?)<\/li>/g)]
    .map((m) => ({
      title: (m[1].match(/priority-title">([\s\S]*?)<\/div>/) || [, ""])[1],
      desc: (m[1].match(/priority-desc">([\s\S]*?)<\/div>/) || [, ""])[1],
      tagClass: (m[1].match(/priority-tag (tag-[a-z]+)">/) || [, ""])[1],
      tag: (m[1].match(/priority-tag tag-[a-z]+">([\s\S]*?)<\/div>/) || [, ""])[1],
      test: (m[1].match(/priority-test"><strong>[\s\S]*?<\/strong>([\s\S]*?)<\/div>$/) || [, ""])[1],
    }));
}

function parseMetaStrip(innerHTML) {
  return [...innerHTML.matchAll(/meta-label">([\s\S]*?)<\/dt><dd[^>]*>([\s\S]*?)<\/dd>/g)]
    .map((m) => ({ label: m[1], value: m[2] }));
}

// Executes the real Sleep Brief render for one answer set in one language.
export function runProfile(answers, lang) {
  const { els, doc } = makeDoc();
  const analytics = { trialFocus: [], log() {} };
  const out = {};
  new Function("document", "window", "answers", "currentLang", "analytics", "out",
    `"use strict";
    function t(k) { return k; }
    function showScreen() {}
    ${ESCAPE_FN}
    ${L_FN}
    ${PROFILE_FN}
    ${TRIAL_FN}
    out.run = function() { showProfileScreen(); renderResultsTrialFocus(); };
    `)(doc, {}, JSON.parse(JSON.stringify(answers)), lang, analytics, out);
  out.run();

  const dom = {};
  for (const id of PROFILE_IDS) {
    const el = els.get(id);
    dom[id] = el ? { innerHTML: el.innerHTML, textContent: el.textContent } : null;
  }
  const trialFocusEl = els.get("resultsTrialFocus");
  return {
    dom,
    priorityRows: parseBriefList(els.get("profilePriorities")?.innerHTML || ""),
    priorityCount: parseBriefList(els.get("profilePriorities")?.innerHTML || "").length,
    metaStrip: parseMetaStrip(els.get("profileMetaStrip")?.innerHTML || ""),
    resultsTrialFocus: trialFocusEl ? trialFocusEl.innerHTML : "",
    trialFocus: analytics.trialFocus,
    profileBrief: analytics.profileBrief ?? null,
    profileBriefByLang: analytics.profileBriefByLang ?? null,
  };
}

// Executes the real scoring engine + the real tier build (window.showResults)
// for one answer set in one language, returning _resultsState verbatim.
export function runResults(answers, lang) {
  const { doc } = makeDoc();
  const win = {};
  const out = {};
  new Function("document", "window", "answers", "currentLang", "MATTRESSES", "QUESTIONS", "out",
    `"use strict";
    var financingAgenda = {}, financingAgendaDismissed = false, financingExplored = false;
    var _resultsState = null;
    var analytics = { log: function() {}, tierViews: { gold: 0, silver: 0, bronze: 0 } };
    function showScreen() {}
    function _renderResults() {}
    function sessionSafeSummary() { return {}; }
    ${CALC_FN}
    ${QUALIFY_FN}
    ${RESULTS_FN}
    out.run = function() {
      window.showResults();
      return { state: _resultsState, topPick: analytics.topPick, allMatches: analytics.allMatches };
    };
    `)(doc, win, JSON.parse(JSON.stringify(answers)), lang, MATTRESSES, QUIZ.questions, out);
  return out.run();
}

// Executes the real per-mattress card-row template (buildMattressPriorities)
// for every surviving tier entry in one language. This is the answer-aware
// template copy the current Results card renders (the card template shows the
// first three rows); captured so prototype cards can stay faithful without
// re-implementing the template.
export function runCardPriorities(answers, lang, tierData) {
  const out = {};
  const fn = new Function("answers", "currentLang", "m",
    `"use strict";
    ${MATTPRI_FN}
    return buildMattressPriorities(m);`);
  for (const tier of ["gold", "silver", "bronze"]) {
    for (const m of tierData[tier] || []) {
      out[m.id] = fn(JSON.parse(JSON.stringify(answers)), lang, m);
    }
  }
  return out;
}

// Executes the REAL shipped auto-pair rule (window.compareReviewFinalists,
// index.html:17398-17409) against a simulated saved-finalist state. The saved
// state itself is necessarily authored — save history is customer input, not
// engine output, and no capture can produce one — but the pairing rule is
// extracted and executed, never re-typed. openCompareModal is stubbed to a
// recorder so the function's real _compareSelected write is what we capture.
export function runAutoPair(savedOrder, favouriteId) {
  const out = {};
  new Function("window", "out",
    `"use strict";
    ${PAIR_FN}
    out.run = function (saved, fav) {
      window._savedPicks = saved;
      window._favoriteMattressId = fav;
      window._compareSelected = null;
      window.openCompareModal = function () {};
      window.compareReviewFinalists();
      return window._compareSelected;
    };`)({}, out);
  return out.run(savedOrder.map((p) => ({ id: p.id })), favouriteId ?? undefined);
}

// Runs the two standalone firmness vocabulary functions for one value/language.
export function firmnessWords(value, lang) {
  const out = {};
  new Function("currentLang", "out",
    `"use strict";
    ${FEEL_FN}
    ${LABEL_FN}
    ${SYMBOL_FN}
    out.feel = firmnessFeel(${JSON.stringify(value)});
    out.label = getFirmnessLabel(${JSON.stringify(value)});
    out.symbols = { gold: priceTierSymbol('gold'), silver: priceTierSymbol('silver'), bronze: priceTierSymbol('bronze') };
    `)(lang, out);
  return out;
}

// Fields carried into the frozen tier fixture. reasons/reasons_es are
// deliberately EXCLUDED: every per-feature column is empty across all 26
// models and nothing renders them today — including them would only tempt a
// prototype into presenting generic defaults as customer-specific reasons.
const TIER_ENTRY_FIELDS = [
  "id", "name", "brand", "subBrand", "pitchKey", "archetype", "firmness",
  "firmnessLabel", "locallyMade", "tags", "highlight", "tags_es",
  "highlight_es", "imageUrl", "topPickReason", "differentiators",
  "score", "pct", "meetsMatchThreshold",
];

export function projectTierData(tierData) {
  const proj = {};
  for (const tier of ["gold", "silver", "bronze"]) {
    proj[tier] = (tierData[tier] || []).map((m) => {
      const e = {};
      for (const f of TIER_ENTRY_FIELDS) if (m[f] !== undefined) e[f] = m[f];
      // Per-model display word from the REAL firmnessFeel(), both languages,
      // so no prototype ever re-derives a word map from its own thresholds.
      e.firmnessFeelWord = {
        en: firmnessWords(m.firmness, "en").feel,
        es: firmnessWords(m.firmness, "es").feel,
      };
      return e;
    });
  }
  return proj;
}

// CAPTURE FLOOR. A silent extraction/parse failure must never freeze an
// empty fixture that parity then re-blesses green (adversarial finding:
// parseBriefList returning [] on a regex drift would do exactly that).
// Every load-bearing capture surface must be non-trivially populated.
function assertCaptureFloor(name, profile, tierProj) {
  for (const lang of ["en", "es"]) {
    const p = profile[lang];
    if (!p.priorityRows.length) throw new Error(name + "/" + lang + ": zero priority rows parsed — extraction drift, refusing to freeze");
    if (p.priorityCount !== p.trialFocus.length) throw new Error(name + "/" + lang + ": parsed row count != trialFocus length");
    for (const id of ["profileName", "profilePrioritiesHeading", "profileSecondary", "profileCta"]) {
      if (!p.dom[id] || !p.dom[id].textContent) throw new Error(name + "/" + lang + ": empty rendered " + id);
    }
    for (const r of p.priorityRows) {
      if (!r.title || !r.tag || !r.test) throw new Error(name + "/" + lang + ": priority row missing title/tag/test — parser drift");
    }
  }
  if (!tierProj.gold.length) throw new Error(name + ": empty gold tier — engine/catalog extraction drift");
  for (const tier of ["gold", "silver", "bronze"]) {
    for (const m of tierProj[tier]) {
      if (!m.id || !m.name || typeof m.firmness !== "number") throw new Error(name + "/" + tier + ": malformed tier entry");
    }
  }
}

// The three fixed answer sets. Provenance: dense-a and sparse-b are verbatim
// ANSWER_SETS entries from tests/scoring_isolation_check.mjs; dense-c is that
// suite's "plus body, plush, reflux" set, whose profile-relevant answers match
// tests/consultation_priorities_check.mjs fixture C (the tie-carrying,
// sorted-set-differs-from-insertion-set design) except mattress_size
// (full vs queen), which does not feed the priority engine.
export const SCENARIOS = {
  "dense-c": {
    description: "Dense: 3 priorities incl. a 90/90 tie resolved by stable-sort insertion order; plus-body plush sleeper with reflux in a family bed.",
    answers: {
      sleep_quality: "fair", trigger: "worn_out", mattress_size: "full",
      partner_sleep: "family", partner_disturbance: "sometimes",
      sleep_position: "combo", body_type: "plus", temperature: "cold",
      firmness: 2, current_mattress_age: "fifteen_plus",
      sleep_issues: ["hip_pain", "sagging"], health_conditions: ["reflux"],
    },
  },
  "dense-a": {
    description: "Dense: 3 priorities, all kind 'need'; the classic hot side sleeper with back pain and a disturbed partner.",
    answers: {
      sleep_quality: "poor", trigger: "pain", mattress_size: "queen",
      partner_sleep: "partner", partner_disturbance: "yes_often",
      sleep_position: "side", body_type: "average", temperature: "hot",
      firmness: 4, current_mattress_age: "eight_fifteen",
      sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring"],
    },
  },
  "sparse-b": {
    description: "Sparse: exactly 2 priorities (engine never pads to 3); solo back sleeper, firm preference, no issues.",
    answers: {
      sleep_quality: "well", trigger: "upgrade", mattress_size: "king",
      partner_sleep: "solo", sleep_position: "back", body_type: "athletic",
      temperature: "comfortable", firmness: 8,
      current_mattress_age: "under_2", sleep_issues: ["none"],
      health_conditions: ["none"],
    },
  },
};

// Full capture for one scenario. Everything inside comes from executing the
// real functions; the only authored content is the scenario description.
export function captureScenario(name) {
  const { description, answers } = SCENARIOS[name];

  const profile = { en: runProfile(answers, "en"), es: runProfile(answers, "es") };

  const resEn = runResults(answers, "en");
  const resEs = runResults(answers, "es");
  const tierEn = projectTierData(resEn.state.tierData);
  const tierEs = projectTierData(resEs.state.tierData);
  const scoresEqual = JSON.stringify(tierEn) === JSON.stringify(tierEs);
  if (!scoresEqual) throw new Error("EN/ES tierData diverged for " + name + " — engine language independence violated");

  const firmnessValue = answers.firmness !== undefined ? answers.firmness : 5;

  // Compare-demo state: simulate saving the first two distinct tier leaders in
  // save order (gold[0], then silver[0]; fall back to gold[1] if silver is
  // empty). With no favourite set, the shipped auto-pair rule
  // (compareReviewFinalists: favourite-first, then save order, slice(0,2))
  // selects exactly these two. This is recorded state for a prototype to
  // consume — the pair choice below is a documented application of the shipped
  // rule, not a new selection algorithm.
  const savedOrder = [];
  if (tierEn.gold[0]) savedOrder.push({ id: tierEn.gold[0].id, tier: "gold" });
  if (tierEn.silver[0]) savedOrder.push({ id: tierEn.silver[0].id, tier: "silver" });
  else if (tierEn.gold[1]) savedOrder.push({ id: tierEn.gold[1].id, tier: "gold" });

  assertCaptureFloor(name, profile, tierEn);

  return {
    meta: {
      scenario: name,
      description,
      engineSourceCommit: engineCommit,
      answers,
      answerSetProvenance:
        "tests/scoring_isolation_check.mjs ANSWER_SETS (dense-a, sparse-b verbatim; dense-c = 'plus body, plush, reflux' whose profile-relevant answers match tests/consultation_priorities_check.mjs fixture C)",
      method:
        "Extract-and-execute from index.html at the worktree commit (see PROVENANCE.md): showProfileScreen()+renderResultsTrialFocus() against the recording DOM shim of tests/consultation_priorities_check.mjs; calculateScores()+qualifyRankedChoices()+window.showResults against data/mattresses.json + data/quiz.json. No scoring, ordering, cap or firmness value is reimplemented or edited.",
    },
    profile,
    firmness: {
      value: firmnessValue,
      firmnessFeel: { en: firmnessWords(firmnessValue, "en").feel, es: firmnessWords(firmnessValue, "es").feel },
      getFirmnessLabel: { en: firmnessWords(firmnessValue, "en").label, es: firmnessWords(firmnessValue, "es").label },
      note: "Three per-surface word maps coexist at this commit (brief meta strip inline buckets, firmnessFeel, getFirmnessLabel) and disagree at 4/6/8 — a prototype must reuse the destination surface's own vocabulary and always render the exact integer value.",
    },
    results: {
      tierData: tierEn,
      topPick: resEn.topPick,
      enEsParity: scoresEqual,
      priceTierSymbols: firmnessWords(firmnessValue, "en").symbols,
      cardPriorities: {
        en: runCardPriorities(answers, "en", resEn.state.tierData),
        es: runCardPriorities(answers, "es", resEn.state.tierData),
        note: "Verbatim output of buildMattressPriorities(m) per surviving model per language ({title, desc, tag, matched} rows). The production card template renders the first three rows; prototypes do the same by index and never re-derive or reorder them.",
      },
      note: "tierData is the verbatim projection of _resultsState.tierData: per-tier order, qualification (>=60% of tier max), cap 3 and min-2 back-fill exactly as the engine produced them. pct/score are included for provenance and parity checking only — neither may be rendered on any screen.",
    },
    compareDemo: {
      savedOrder,
      autoPair: runAutoPair(savedOrder, null),
      favourite: null,
      note: "SIMULATED saved-finalist state for the Compare discoverability demo — save history is customer input, so savedOrder is authored (tier leads in save order) and disclosed as such. The PAIR is computed by executing the real extracted compareReviewFinalists() (index.html:17398-17409) against that state, never re-typed. Prototype interactions against this state are prototype behavior, not production.",
    },
  };
}
