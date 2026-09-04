// A4.1 — the scoring feature-key contract, and the golden ranking matrix that
// makes it load-bearing.
//
// THE DEFECT THIS SUITE EXISTS FOR (roadmap 3.1, "Scoring case-fold defect").
// The catalog authors its scoring tags in camelCase — `pressureRelief`,
// `motionIsolation` — and the quiz awards points under those same camelCase
// keys. The comparison in calculateScores() is an exact array-membership test
// (`m.features?.includes(feat)`), so the two spellings must agree byte for
// byte. They did not: build-data.ps1 lowercased every tag before restoring
// capitals after a hyphen, so a camelCase tag with no hyphen never recovered
// and reached the engine as `pressurerelief` / `motionisolation`. Ten scoring
// rules across six questions — every motionIsolation and pressureRelief award
// — could never fire, including the strongest partner-disturbance answer and
// hip pain. The repair is in the generator; index.html is not touched.
//
// WHAT IS PINNED HERE:
//   1. The key contract: every feature tag the catalog ships is an exact quiz
//      scoring key, and no tag differs from a quiz key by case alone (the
//      defect class itself, not just its two known instances).
//   2. Reachability: for every quiz key, how many catalog models can match it,
//      pinned as a table. The keys that match nothing are enumerated and must
//      equal exactly the FIVE roadmap 3.2 vocabulary-gap keys that remain after
//      A4.2 corrected `durable` to the canonical `durability` — no more (a
//      regression would add one) and no fewer (silently "fixing" 3.2 is an
//      owner decision, not a drive-by; the five are governed dormant in
//      tools/validation.py QUIZ_DORMANT_TAGS, and tests/scoring_vocabulary_check.mjs owns them).
//   3. The golden ranking matrix: 57 scenarios across feels, couples, needs,
//      ties, fallbacks and the composites the Phase 1 fixture already uses,
//      each producing the REAL engine's per-tier ordered results (id, score,
//      pct, meetsMatchThreshold) and gold top pick. Nothing here reimplements
//      a calculation: calculateScores(), qualifyRankedChoices() and
//      window.showResults() are executed verbatim from index.html.
//   4. The generator's normalizer source, so the one-line repair cannot be
//      reverted silently.
//
// THE CASE-FOLD PROOF (section 6). The pre-repair behaviour is preserved as a
// second fixture. The suite re-runs the whole matrix against an in-memory
// catalog whose tags are lowercased — exactly what the old generator emitted —
// and requires that it reproduces those pre-repair bytes, and that it differs
// from the current matrix. That is what makes the repair's effect auditable in
// both directions: the only thing that changed is the case of two tags.
//
// RATCHET (same doctrine as the Phase 1 output fixture): both fixtures are
// sha256-pinned below, so regenerating one means editing this comment too.
//   node tests/scoring_key_contract_check.mjs                 -> verify
//   node tests/scoring_key_contract_check.mjs --write-golden  -> regenerate both
// Regenerating certifies whatever the tree produces; do not regenerate to make
// a red suite green.

import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const BUILD_PS1 = readFileSync(join(root, "build-data.ps1"), "utf8");
const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

const GOLDEN_PATH = join(root, "tests", "fixtures", "a41_scoring_golden.json");
const CASEFOLD_PATH = join(root, "tests", "fixtures", "a41_scoring_golden_casefold.json");
const GOLDEN_SHA256 = "4b9cee5267ed336826c948609d4e4e4c8e2eda5f74eb93eb8612c79efd8b127b";
const CASEFOLD_SHA256 = "ef1fd91f5138c9fd6596d1c54b52bf1690d99ef8fbeebbf0a3ca44c9afa490ee";

const WRITE_MODE = process.argv.includes("--write-golden");

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return cond;
}
function section(name) { console.log(`\n-- ${name} --`); }
function grab(re, what) {
  const m = html.match(re);
  check(`extracted ${what}`, !!m);
  return m ? m[0] : "";
}
const clone = (x) => JSON.parse(JSON.stringify(x));
// LF-normalized, like tests/phase1_output_regression_check.mjs: the repo checks
// these fixtures out with CRLF on Windows, so a raw-byte digest pins the
// checkout's line endings rather than the content. (A4.2 repair: the A4.1
// commit pinned raw bytes and was therefore red in any fresh worktree.)
const sha = (s) => createHash("sha256").update(String(s).split("\r\n").join("\n")).digest("hex");

// ---------- extraction (verbatim engine source) ------------------------------
section("extraction");
const CALC_FN = grab(/function calculateScores\(\)\s*\{[\s\S]*?\r?\n    \}/, "calculateScores()");
const QUALIFY_FN = grab(/function qualifyRankedChoices\([\s\S]*?\r?\n    \}/, "qualifyRankedChoices()");
const SHOW_RESULTS_FN = grab(/window\.showResults = function\(\) \{[\s\S]*?\r?\n    \}/, "window.showResults()");
if (failed) { console.log("\nextraction failed — aborting"); process.exit(1); }
check("the engine compares feature keys by exact array membership (the contract this suite polices)",
  /if \(m\.features\?\.includes\(feat\)\)/.test(CALC_FN));
check("the per-feature cap is unchanged at 5 (the bound on this repair's effect)",
  /const FEATURE_CAP = 5;/.test(CALC_FN));

// ---------- harness ----------------------------------------------------------
// Same shims as tests/phase1_output_regression_check.mjs: a minimal DOM and a
// window Proxy that throws on an undeclared read, so an engine that started
// consulting session state would fail loudly instead of scoring silently.
function domShim() {
  const els = new Map();
  const make = (id) => {
    const classes = new Set();
    return {
      id, innerHTML: "", textContent: "", style: {},
      classList: { add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c) },
      setAttribute() {}, getAttribute: () => null, focus() {}
    };
  };
  return { doc: { getElementById: (id) => { if (!els.has(id)) els.set(id, make(id)); return els.get(id); },
    querySelector: () => null, querySelectorAll: () => [] } };
}
function throwingWindow(seed = {}) {
  const store = Object.assign(Object.create(null), seed);
  return new Proxy(store, {
    get(t, k) {
      if (typeof k === "symbol") return undefined;
      if (k in t) return t[k];
      throw new Error(`engine read window.${String(k)}, which this harness never declared`);
    },
    set(t, k, v) { t[k] = v; return true; },
    has(t, k) { return typeof k === "symbol" ? false : k in t; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
}
function runResults(answers, mattresses = MATTRESSES) {
  const { doc } = domShim();
  const out = {};
  new Function("document", "window", "MATTRESSES", "QUESTIONS", "answers", "currentLang", "out", `"use strict";
    var analytics = { log: function(){} };
    var _resultsState = null;
    function _renderResults() {}
    function showScreen() {}
    function sessionSafeSummary() { return {}; }
    ${CALC_FN}
    ${QUALIFY_FN}
    ${SHOW_RESULTS_FN};
    window.showResults();
    out.state = _resultsState;
    out.analytics = analytics;`)(doc, throwingWindow(), mattresses, QUIZ.questions, clone(answers), "en", out);
  const tiers = {};
  for (const tier of ["gold", "silver", "bronze"]) {
    tiers[tier] = out.state.tierData[tier].map((m) => ({
      id: m.id, score: m.score, pct: m.pct, meets: m.meetsMatchThreshold }));
  }
  return { tiers, topPick: out.analytics.topPick ? out.analytics.topPick.name : null };
}
function runScoreMap(answers, mattresses = MATTRESSES) {
  return new Function("MATTRESSES", "QUESTIONS", "answers", "currentLang", `"use strict";
    ${CALC_FN}
    return calculateScores().scores;`)(mattresses, QUIZ.questions, clone(answers), "en");
}

// ---------- the scenario matrix ----------------------------------------------
// Feels (the slider axis), couples (every partner shape the quiz allows),
// needs (each scoring option in isolation, so a rule's effect is attributable
// to that rule alone), ties and fallbacks (empty and all-"none"), and the
// composites the Phase 1 fixture already uses, so the two suites agree.
const SCENARIOS = {};
for (let f = 1; f <= 10; f++) SCENARIOS[`feel_${String(f).padStart(2, "0")}`] = { firmness: f };
SCENARIOS.couples_solo = { partner_sleep: "solo" };
for (const d of ["yes_often", "sometimes", "rarely", "not_applicable"]) {
  SCENARIOS[`couples_partner_${d}`] = { partner_sleep: "partner", partner_disturbance: d };
  SCENARIOS[`couples_family_${d}`] = { partner_sleep: "family", partner_disturbance: d };
}
for (const p of ["side", "back", "stomach", "combo", "no_idea"]) SCENARIOS[`need_position_${p}`] = { sleep_position: p };
for (const b of ["petite", "average", "athletic", "plus", "different"]) SCENARIOS[`need_body_${b}`] = { body_type: b };
for (const t of ["hot", "comfortable", "cold", "opposite"]) SCENARIOS[`need_temp_${t}`] = { temperature: t };
for (const i of ["back_pain", "hip_pain", "hot", "tossing", "stiff", "sagging", "too_soft", "none"]) {
  SCENARIOS[`need_issue_${i}`] = { sleep_issues: [i] };
}
for (const h of ["nerve_pain", "allergies", "snoring", "reflux", "extra_support", "getting_older", "none"]) {
  SCENARIOS[`need_health_${h}`] = { health_conditions: [h] };
}
SCENARIOS.fallback_empty = {};
SCENARIOS.fallback_all_none = { sleep_issues: ["none"], health_conditions: ["none"] };
// Tie probes: neutral answers with a mid slider leave large score plateaus, so
// the sort's stability (catalog order) is what decides — pinned deliberately.
SCENARIOS.tie_neutral_mid = { firmness: 5, partner_sleep: "solo", temperature: "comfortable" };
SCENARIOS.tie_neutral_edge = { firmness: 1, partner_sleep: "solo", temperature: "comfortable" };
// Composites (the Phase 1 fixture's own scenarios, so both suites see the same
// customers; ids kept recognisable).
SCENARIOS.composite_s2_partner_side_hot_backpain = {
  trigger: "pain", mattress_size: "queen", partner_sleep: "partner", partner_disturbance: "yes_often",
  sleep_position: "side", body_type: "average", temperature: "hot", firmness: 4,
  sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring"] };
SCENARIOS.composite_s3_family_combo_cold_plush = {
  trigger: "worn_out", mattress_size: "full", partner_sleep: "family", partner_disturbance: "sometimes",
  sleep_position: "combo", body_type: "plus", temperature: "cold", firmness: 2,
  sleep_issues: ["hip_pain", "sagging"], health_conditions: ["reflux"] };
SCENARIOS.composite_s5_motion_dominant = {
  trigger: "browsing", mattress_size: "queen", partner_sleep: "partner", partner_disturbance: "yes_often",
  sleep_position: "back", body_type: "average", temperature: "comfortable", firmness: 5,
  sleep_issues: ["tossing"], health_conditions: ["none"] };
SCENARIOS.composite_s6_solo_side_pressure = {
  trigger: "pain", mattress_size: "twin_xl", partner_sleep: "solo", sleep_position: "side", body_type: "petite",
  temperature: "comfortable", firmness: 3, sleep_issues: ["hip_pain", "stiff"],
  health_conditions: ["nerve_pain", "extra_support"] };
SCENARIOS.composite_s7_partner_combo_different = {
  trigger: "upgrade", mattress_size: "cal_king", partner_sleep: "partner", partner_disturbance: "rarely",
  sleep_position: "combo", body_type: "different", temperature: "opposite", firmness: 6,
  sleep_issues: ["too_soft"], health_conditions: ["allergies"] };

// ---------- 1. the key contract ----------------------------------------------
section("1. feature-key contract (catalog spellings vs quiz scoring keys)");
const models = ["gold", "silver", "bronze"].flatMap((t) => MATTRESSES[t]);
const quizKeys = new Set();
for (const q of QUIZ.questions) for (const o of q.options || []) for (const k of Object.keys(o.scores || {})) quizKeys.add(k);
const catalogTags = new Set();
for (const m of models) for (const f of m.features || []) catalogTags.add(f);
const lowerQuiz = new Map([...quizKeys].map((k) => [k.toLowerCase(), k]));

const notAKey = [...catalogTags].filter((t) => !quizKeys.has(t)).sort();
check("every catalog feature tag is an exact quiz scoring key",
  notAKey.length === 0, `unmatched: ${JSON.stringify(notAKey)}`);
const caseOnly = notAKey.filter((t) => lowerQuiz.has(t.toLowerCase()));
check("no catalog tag differs from a quiz key by CASE alone (the 3.1 defect class, not just its two instances)",
  caseOnly.length === 0, `case-only mismatches: ${JSON.stringify(caseOnly.map((t) => `${t} vs ${lowerQuiz.get(t.toLowerCase())}`))}`);
check("the two repaired tags reach the engine in camelCase",
  catalogTags.has("pressureRelief") && catalogTags.has("motionIsolation"),
  `tags: ${JSON.stringify([...catalogTags].sort())}`);
check("their lowercase forms are gone from the catalog",
  !catalogTags.has("pressurerelief") && !catalogTags.has("motionisolation"));

// ---------- 2. reachability ---------------------------------------------------
section("2. reachability of every quiz scoring key");
const reach = {};
for (const k of [...quizKeys].sort()) reach[k] = models.filter((m) => (m.features || []).includes(k)).length;
for (const [k, n] of Object.entries(reach)) console.log(`     ${k.padEnd(16)} ${n} model(s)`);
check("pressureRelief is reachable (half the catalog carries it)", reach.pressureRelief === 13, `got ${reach.pressureRelief}`);
check("motionIsolation is reachable (three models carry it)", reach.motionIsolation === 3, `got ${reach.motionIsolation}`);
const dead = Object.entries(reach).filter(([, n]) => n === 0).map(([k]) => k).sort();
// A4.2 corrected `durable` to the canonical `durability` at the authoritative
// source, so the dead set is five; the remaining keys are governed dormant in
// tools/validation.py QUIZ_DORMANT_TAGS (tests/scoring_vocabulary_check.mjs).
const EXPECTED_DEAD = ["adjustable", "comfort", "hypoallergenic", "memory", "quality"];
check("the keys that match NO catalog model are exactly the five roadmap 3.2 vocabulary-gap keys that remain after A4.2 corrected `durable` — this pass neither adds to them nor silently populates them",
  JSON.stringify(dead) === JSON.stringify(EXPECTED_DEAD), `dead: ${JSON.stringify(dead)}`);
// The ten repaired rules, enumerated from the quiz itself.
const repairedRules = [];
for (const q of QUIZ.questions) for (const o of q.options || []) {
  for (const k of ["pressureRelief", "motionIsolation"]) {
    if ((o.scores || {})[k]) repairedRules.push(`${q.id}.${o.id}:${k}+${o.scores[k]}`);
  }
}
check("exactly ten scoring rules across six questions were dead and are now live",
  repairedRules.length === 10 && new Set(repairedRules.map((r) => r.split(".")[0])).size === 6,
  repairedRules.join(" "));

// ---------- 3. the golden ranking matrix -------------------------------------
section("3. golden ranking matrix (real engine, 57 scenarios)");
function snapshot(mattresses) {
  const out = {};
  for (const [name, answers] of Object.entries(SCENARIOS)) {
    const r = runResults(answers, mattresses);
    out[name] = { topPick: r.topPick, tiers: r.tiers, scores: runScoreMap(answers, mattresses) };
  }
  return out;
}
// The pre-repair catalog: the generator's old output, reproduced by lowercasing
// the tags it used to destroy. Nothing else differs.
function casefoldCatalog() {
  const c = clone(MATTRESSES);
  for (const t of ["gold", "silver", "bronze"]) for (const m of c[t]) {
    m.features = (m.features || []).map((f) => (f === "pressureRelief" || f === "motionIsolation" ? f.toLowerCase() : f));
  }
  return c;
}
const current = snapshot(MATTRESSES);
const prerepair = snapshot(casefoldCatalog());
check("the matrix covers 57 scenarios across feels, couples, needs, ties, fallbacks and composites",
  Object.keys(current).length === 57, `got ${Object.keys(current).length}`);

if (WRITE_MODE) {
  writeFileSync(GOLDEN_PATH, JSON.stringify(current, null, 1) + "\n");
  writeFileSync(CASEFOLD_PATH, JSON.stringify(prerepair, null, 1) + "\n");
  console.log(`\n  wrote ${GOLDEN_PATH}\n    sha256 ${sha(readFileSync(GOLDEN_PATH, "utf8"))}`);
  console.log(`  wrote ${CASEFOLD_PATH}\n    sha256 ${sha(readFileSync(CASEFOLD_PATH, "utf8"))}`);
  console.log("\n  --write-golden: fixtures regenerated; move BOTH pinned hashes in the same reviewed diff.");
  process.exit(0);
}

const goldenRaw = readFileSync(GOLDEN_PATH, "utf8");
const casefoldRaw = readFileSync(CASEFOLD_PATH, "utf8");
check("the golden fixture is the pinned bytes", sha(goldenRaw) === GOLDEN_SHA256, `sha ${sha(goldenRaw)}`);
check("the pre-repair fixture is the pinned bytes", sha(casefoldRaw) === CASEFOLD_SHA256, `sha ${sha(casefoldRaw)}`);
const golden = JSON.parse(goldenRaw);
const casefold = JSON.parse(casefoldRaw);

function diffPaths(a, b, prefix = "") {
  const out = [];
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const pa = a ? a[k] : undefined, pb = b ? b[k] : undefined;
    const path = prefix ? `${prefix}.${k}` : k;
    if (pa && pb && typeof pa === "object" && typeof pb === "object") out.push(...diffPaths(pa, pb, path));
    else if (JSON.stringify(pa) !== JSON.stringify(pb)) out.push(path);
  }
  return out;
}
const driftNow = diffPaths(current, golden);
check("the engine reproduces the golden matrix exactly", driftNow.length === 0,
  `${driftNow.length} cells drifted, first: ${driftNow.slice(0, 4).join(", ")}`);

// ---------- 4. the generator's normalizer ------------------------------------
section("4. the generator (build-data.ps1) — the repair's actual site");
// A4.2 corrective pass: the normalizer now lives in a named function,
// Convert-FeatureTag, so tests/feature_tag_normalization_check.py can execute
// the generator's own bytes against the shared case table. Same behaviour, same
// property pinned here: the whole tag is never lowercased.
const FEATURE_FN = (BUILD_PS1.match(/function Convert-FeatureTag \{[\s\S]*?\n\}/) || [""])[0];
check("the tag normalizer no longer lowercases the whole tag before camelizing",
  !!FEATURE_FN && !/Trim\(\)\.ToLower\(\)/.test(FEATURE_FN)
  && /\$tag = if \(\$null -eq \$Tag\) \{ '' \} else \{ \$Tag\.Trim\(\) \}/.test(FEATURE_FN)
  && /ForEach-Object \{ Convert-FeatureTag \$_ \}/.test(BUILD_PS1));
check("kebab-case input is still converted to camelCase (the documented contract is kept, not dropped)",
  /\$parts = \$tag\.Split\('-'\)/.test(BUILD_PS1) && /Substring\(0,1\)\.ToUpper\(\)/.test(BUILD_PS1));
check("the first kebab segment is still lowered, so PRESSURE-relief style input still normalizes",
  /\$camel = \$parts\[0\]\.ToLower\(\)/.test(BUILD_PS1));
check("the reason-column mapping is untouched (it was always camelCase and already agreed with the quiz)",
  /@\{ csv = "reason_pressureRelief";\s*json = "pressureRelief" \}/.test(BUILD_PS1));

// ---------- 5. case-fold proof (both directions) -----------------------------
section("5. case-fold proof — the repair's whole effect, in both directions");
const driftPre = diffPaths(prerepair, casefold);
check("lowercasing ONLY those two tags reproduces the pre-repair fixture byte for byte — the repair changed nothing else",
  driftPre.length === 0, `${driftPre.length} cells drifted, first: ${driftPre.slice(0, 4).join(", ")}`);
const changed = diffPaths(golden, casefold);
check("the repair does move rankings (the fixtures are not accidentally identical)", changed.length > 0);
const movedScenarios = new Set(changed.map((p) => p.split(".")[0]));
console.log(`     ${changed.length} pinned cells differ across ${movedScenarios.size} of 57 scenarios`);
// Every scenario that moved must award at least one of the repaired keys.
const awards = {};
for (const q of QUIZ.questions) for (const o of q.options || []) {
  const s = o.scores || {};
  if (s.pressureRelief || s.motionIsolation) awards[`${q.id}:${o.id}`] = s;
}
function scenarioAwardsRepairedKey(answers) {
  return Object.entries(answers).some(([qId, ans]) =>
    (Array.isArray(ans) ? ans : [ans]).some((o) => awards[`${qId}:${o}`]));
}
const unexplained = [...movedScenarios].filter((s) => !scenarioAwardsRepairedKey(SCENARIOS[s]));
check("every scenario whose ranking moved awards pressureRelief or motionIsolation — no ranking moved for any other reason",
  unexplained.length === 0, `unexplained: ${JSON.stringify(unexplained)}`);
const unmoved = Object.keys(SCENARIOS).filter((s) => !movedScenarios.has(s));
const shouldNotMove = unmoved.filter((s) => scenarioAwardsRepairedKey(SCENARIOS[s]));
console.log(`     ${unmoved.length} scenarios are byte-identical to the pre-repair matrix`);
check("a scenario that awards neither repaired key cannot have moved (checked from the other side)",
  [...movedScenarios].every((s) => scenarioAwardsRepairedKey(SCENARIOS[s])));

// Independent expectation model: recompute each model's delta from the quiz
// rules, the catalog tags and the engine's per-feature cap WITHOUT the engine,
// and require the engine's own score deltas to agree exactly. An unexplained
// point of movement fails here.
section("6. per-model score deltas reconciled against an independent model");
const FEATURE_CAP = 5;
function expectedDelta(answers, model) {
  let total = 0;
  for (const key of ["pressureRelief", "motionIsolation"]) {
    if (!(model.features || []).includes(key)) continue;
    let awarded = 0;
    for (const [qId, ans] of Object.entries(answers)) {
      for (const optId of (Array.isArray(ans) ? ans : [ans])) {
        const pts = (awards[`${qId}:${optId}`] || {})[key];
        if (!pts) continue;
        const add = Math.min(pts, FEATURE_CAP - awarded);
        if (add > 0) awarded += add;
      }
    }
    total += awarded;
  }
  return total;
}
let reconciled = 0, mismatches = [];
for (const [name, answers] of Object.entries(SCENARIOS)) {
  for (const m of models) {
    const observed = golden[name].scores[m.id] - casefold[name].scores[m.id];
    const expected = expectedDelta(answers, m);
    reconciled++;
    if (observed !== expected) mismatches.push(`${name}/${m.id}: engine ${observed} vs model ${expected}`);
  }
}
check(`every one of the ${reconciled} per-scenario/per-model score deltas equals the independently modelled award (cap 5 per key)`,
  mismatches.length === 0, mismatches.slice(0, 4).join(" | "));
check("no model ever loses points (a reachable signal can only add)",
  Object.keys(SCENARIOS).every((n) => models.every((m) => golden[n].scores[m.id] >= casefold[n].scores[m.id])));

// ---------- summary ----------------------------------------------------------
console.log(`\nScoring key contract check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
