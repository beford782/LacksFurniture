// A4.2 — the scoring VOCABULARY contract: every quiz scoring key is either a
// reachable catalog feature or an explicitly governed dormant key.
//
// A4.1 proved the case-fold half of roadmap 3.1: two keys the catalog carried
// were unreachable because the generator lowercased them. What remained was
// roadmap 3.2 — six keys that matched no catalog model in any casing. This
// suite is the governance the owner directed for them:
//
//   1. `durable` was a spelling variant of the catalog's canonical `durability`
//      and is CORRECTED at the authoritative source (incoming/dreamfinder_quiz
//      .json -> workbook Quiz tab -> data/quiz.json). It must not reappear.
//   2. The remaining five stay DORMANT, and dormancy is now declared rather
//      than discovered: tools/validation.py carries QUIZ_DORMANT_TAGS, one
//      entry per key, each with a classification, the reason it cannot be made
//      reachable today, and the owner dependency that would resolve it.
//   3. Nothing may silently activate a dormant key (adding it to a model's
//      features), and nothing may quietly delete a declaration.
//
// The classifications, from the A4.2 investigation:
//   B = a legitimate, discriminating concept whose authoritative catalog data
//       is absent (adjustable, hypoallergenic, memory)
//   C = a generic, non-discriminating concept that should not rank mattresses
//       (comfort, quality)
// No key may be declared A (a proven spelling mismatch) and stay dormant — A is
// a correction, not a state — and D (unresolved) must be empty or named.
//
// DORMANCY IS PROVED, NOT ASSERTED: section 5 strips every dormant award from
// the quiz in memory and re-runs the whole ranking matrix through the real
// engine. If a "dormant" key were actually scoring, the rankings would move.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const html = read("index.html");
const QUIZ = JSON.parse(read("data", "quiz.json"));
const CANON = JSON.parse(read("incoming", "dreamfinder_quiz.json"));
const MATTRESSES = JSON.parse(read("data", "mattresses.json"));
const VALIDATION = read("tools", "validation.py");
const DOC = read("docs", "quiz-copy-engine-correspondence.md").replace(/\r\n/g, "\n");

let passed = 0, failed = 0;
function ok(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return cond;
}
function section(n) { console.log(`\n-- ${n} --`); }
const clone = (x) => JSON.parse(JSON.stringify(x));

const models = ["gold", "silver", "bronze"].flatMap((t) => MATTRESSES[t]);
const catalogFeatures = new Set(models.flatMap((m) => m.features || []));
const quizKeys = new Set();
for (const q of QUIZ.questions) for (const o of q.options || []) for (const k of Object.keys(o.scores || {})) quizKeys.add(k);

// ---------- 1. the declaration -----------------------------------------------
section("1. the dormant-key declaration in tools/validation.py");
const declBlock = (VALIDATION.match(/QUIZ_DORMANT_TAGS = \{[\s\S]*?\n\}/) || [""])[0];
ok("tools/validation.py declares QUIZ_DORMANT_TAGS", declBlock.length > 0);
const DECL = {};
for (const m of declBlock.matchAll(/"(\w+)":\s*\("([A-D])",\s*"((?:[^"\\]|\\.)*)",\s*"((?:[^"\\]|\\.)*)"\)/g)) {
  DECL[m[1]] = { cls: m[2], reason: m[3], owner: m[4] };
}
const EXPECTED = {
  adjustable: "B", hypoallergenic: "B", memory: "B", comfort: "C", quality: "C",
};
ok("the declared dormant set is exactly the five governed keys",
  JSON.stringify(Object.keys(DECL).sort()) === JSON.stringify(Object.keys(EXPECTED).sort()),
  `declared=${JSON.stringify(Object.keys(DECL).sort())}`);
for (const [key, cls] of Object.entries(EXPECTED)) {
  const d = DECL[key];
  ok(`${key}: declared class ${cls} with a reason and an owner dependency`,
    !!d && d.cls === cls && d.reason.length > 30 && d.owner.length > 10,
    d ? `class=${d.cls} reason=${d.reason.length}ch owner=${d.owner.length}ch` : "missing");
}
ok("no key is declared A (a proven spelling mismatch is corrected, never governed as dormant)",
  !Object.values(DECL).some((d) => d.cls === "A"));
ok("no key is declared D (an unresolved key would have to be named in the report, not left in the code)",
  !Object.values(DECL).some((d) => d.cls === "D"));

// ---------- 2. the contract ---------------------------------------------------
section("2. every quiz scoring key is reachable or governed");
const unreachable = [...quizKeys].filter((k) => !catalogFeatures.has(k)).sort();
const ungoverned = unreachable.filter((k) => !DECL[k]);
ok("no quiz scoring key is unreachable AND ungoverned", ungoverned.length === 0,
  `ungoverned: ${JSON.stringify(ungoverned)}`);
const governedButReachable = Object.keys(DECL).filter((k) => catalogFeatures.has(k));
ok("no declared-dormant key is actually reachable (a stale declaration hides a live signal)",
  governedButReachable.length === 0, `stale: ${JSON.stringify(governedButReachable)}`);
ok("the unreachable set equals the declared set exactly",
  JSON.stringify(unreachable) === JSON.stringify(Object.keys(DECL).sort()),
  `unreachable=${JSON.stringify(unreachable)}`);
const vocab = (VALIDATION.match(/QUIZ_SCORE_TAGS = frozenset\(\([\s\S]*?\)\)/) || [""])[0];
ok("the validator's QUIZ_SCORE_TAGS is a superset of the shipped keys",
  [...quizKeys].every((k) => vocab.includes(`"${k}"`)));
ok("the validator enforces the contract at build time (validate_quiz cross-checks catalog features)",
  /def validate_quiz\(quiz, catalog_features=None\)/.test(VALIDATION)
  && /QUIZ_DORMANT_TAGS/.test(VALIDATION.split("def validate_quiz")[1] || ""));

// ---------- 3. the corrected key ---------------------------------------------
section("3. `durable` -> `durability` (the proven vocabulary correction)");
ok("`durable` is gone from the shipped quiz", !quizKeys.has("durable"));
ok("`durable` is gone from the canonical source (incoming/dreamfinder_quiz.json)",
  !/"durable"/.test(JSON.stringify(CANON)));
ok("`durable` is gone from the validator's allowed vocabulary (re-introducing it is now an error)",
  !vocab.includes('"durable"'));
ok("`durability` is reachable and carried by the catalog", catalogFeatures.has("durability"));
const durabilityAwards = [];
for (const q of QUIZ.questions) for (const o of q.options || []) {
  if ((o.scores || {}).durability) durabilityAwards.push(`${q.id}.${o.id}:+${o.scores.durability}`);
}
ok("the two corrected options now award `durability`, beside the three that always did",
  JSON.stringify(durabilityAwards.slice().sort()) === JSON.stringify([
    "body_type.plus:+2", "health_conditions.extra_support:+3", "partner_sleep.family:+2",
    "sleep_issues.none:+1", "sleep_issues.sagging:+2"].sort()),
  durabilityAwards.join(" "));

// ---------- 4. the forbidden mappings ----------------------------------------
section("4. forbidden mappings (the owner's explicit non-goals)");
// A dormant key must not be "resolved" by attaching it to a model, nor by
// aliasing it onto a different canonical feature.
for (const key of Object.keys(EXPECTED)) {
  ok(`${key}: no catalog model carries it (it was not silently activated)`,
    !models.some((m) => (m.features || []).includes(key)));
}
const FORBIDDEN = {
  adjustable: ["support", "hybrid", "zoned"],
  memory: ["motionIsolation", "pressureRelief"],
};
for (const [key, banned] of Object.entries(FORBIDDEN)) {
  const optsAwarding = [];
  for (const q of QUIZ.questions) for (const o of q.options || []) {
    if ((o.scores || {})[key] !== undefined) optsAwarding.push({ q: q.id, o: o.id, scores: o.scores });
  }
  const leaked = optsAwarding.filter((e) => banned.some((b) => e.scores[b] !== undefined && !CANON_ORIGINAL_HAS(e.q, e.o, b)));
  ok(`${key}: no option that awards it gained one of ${banned.join("/")} (no synonym mapping)`,
    leaked.length === 0, JSON.stringify(leaked.map((e) => `${e.q}.${e.o}`)));
}
function CANON_ORIGINAL_HAS(qId, oId, key) {
  const qs = CANON.quiz.questions;
  const q = qs.find((x) => x.id === qId);
  const o = q && (q.options || []).find((x) => x.id === oId);
  return !!(o && (o.scores || {})[key] !== undefined);
}
ok("the shipped quiz's scores equal the canonical source's scores (no runtime-only vocabulary)",
  JSON.stringify(QUIZ.questions.map((q) => [q.id, (q.options || []).map((o) => [o.id, o.scores || {}])]))
  === JSON.stringify(CANON.quiz.questions.map((q) => [q.id, (q.options || []).map((o) => [o.id, o.scores || {}])])));

// ---------- 5. dormancy, proved by execution ---------------------------------
section("5. dormancy proved: stripping every dormant award changes no ranking");
const CALC_FN = (html.match(/function calculateScores\(\)\s*\{[\s\S]*?\r?\n    \}/) || [""])[0];
const QUALIFY_FN = (html.match(/function qualifyRankedChoices\([\s\S]*?\r?\n    \}/) || [""])[0];
const SHOW_FN = (html.match(/window\.showResults = function\(\) \{[\s\S]*?\r?\n    \}/) || [""])[0];
ok("extracted the engine (calculateScores, qualifyRankedChoices, showResults)",
  !!CALC_FN && !!QUALIFY_FN && !!SHOW_FN);

function domShim() {
  const els = new Map();
  const make = (id) => ({ id, innerHTML: "", textContent: "", style: {},
    classList: { add() {}, remove() {}, contains: () => false }, setAttribute() {}, getAttribute: () => null, focus() {} });
  return { getElementById: (id) => { if (!els.has(id)) els.set(id, make(id)); return els.get(id); },
    querySelector: () => null, querySelectorAll: () => [] };
}
function runResults(answers, questions) {
  const out = {};
  new Function("document", "window", "MATTRESSES", "QUESTIONS", "answers", "currentLang", "out", `"use strict";
    var analytics = { log: function(){} };
    var _resultsState = null;
    function _renderResults() {}
    function showScreen() {}
    function sessionSafeSummary() { return {}; }
    ${CALC_FN}
    ${QUALIFY_FN}
    ${SHOW_FN};
    window.showResults();
    out.state = _resultsState;`)(domShim(), {}, MATTRESSES, questions, clone(answers), "en", out);
  const tiers = {};
  for (const t of ["gold", "silver", "bronze"]) {
    tiers[t] = out.state.tierData[t].map((m) => `${m.id}:${m.score}:${m.pct}:${m.meetsMatchThreshold ? 1 : 0}`).join(",");
  }
  return tiers;
}
// Every answer that carries a dormant award, plus the composites that mix them.
const PROBES = {};
for (const q of QUIZ.questions) for (const o of q.options || []) {
  const keys = Object.keys(o.scores || {}).filter((k) => DECL[k]);
  if (!keys.length) continue;
  PROBES[`${q.id}.${o.id}`] = q.type === "multiple" ? { [q.id]: [o.id] } : { [q.id]: o.id };
}
PROBES.composite_all_dormant = {
  partner_sleep: "partner", partner_disturbance: "yes_often", temperature: "cold",
  sleep_issues: ["tossing", "stiff", "sagging"], health_conditions: ["allergies", "snoring", "getting_older"],
};
const stripped = clone(QUIZ.questions);
let strippedAwards = 0;
for (const q of stripped) for (const o of q.options || []) {
  for (const k of Object.keys(o.scores || {})) if (DECL[k]) { delete o.scores[k]; strippedAwards++; }
}
ok("the strip removed every declared dormant award from the in-memory quiz", strippedAwards > 0);
let moved = [];
for (const [name, answers] of Object.entries(PROBES)) {
  const a = runResults(answers, QUIZ.questions);
  const b = runResults(answers, stripped);
  if (JSON.stringify(a) !== JSON.stringify(b)) moved.push(name);
}
ok(`removing every dormant award changes NO ranking in any of the ${Object.keys(PROBES).length} probe scenarios — the five keys are provably inert`,
  moved.length === 0, `moved: ${JSON.stringify(moved)}`);
ok("the probe set covers every option that carries a dormant award",
  Object.keys(PROBES).length >= 10);

// ---------- 6. the document ---------------------------------------------------
section("6. the correspondence document records the same governance");
const docInert = (DOC.match(/`Inert tags: ([^`]*)`/) || [null, ""])[1].split(",").map((s) => s.trim()).filter(Boolean).sort();
ok("the document's inert list equals the declared dormant set",
  JSON.stringify(docInert) === JSON.stringify(Object.keys(DECL).sort()),
  `doc=${JSON.stringify(docInert)}`);
ok("the document no longer lists `durable` as inert", !docInert.includes("durable"));
for (const key of Object.keys(EXPECTED)) {
  ok(`the document names ${key}'s owner dependency`, new RegExp("`" + key + "`").test(DOC));
}

// ---------- 7. the correction's whole ranking effect ------------------------
// tests/fixtures/a42_scoring_pre_vocab_golden.json is the 57-scenario matrix as
// it stood at dcb63e5 (the accepted A4.1 head), captured BEFORE this pass
// touched the quiz. The current matrix is the A4.1 golden, regenerated here. The
// only difference between them must be the `durable` -> `durability` correction:
// scenarios whose answers use neither corrected option must be byte-identical,
// and no model that lacks `durability` may move at all.
section("7. before/after: the correction moved exactly what it should");
const PRE_PATH = join(root, "tests", "fixtures", "a42_scoring_pre_vocab_golden.json");
const POST_PATH = join(root, "tests", "fixtures", "a41_scoring_golden.json");
const shaLF = (str) => createHash("sha256").update(String(str).split("\r\n").join("\n")).digest("hex");
const preRaw = readFileSync(PRE_PATH, "utf8");
ok("the pre-correction matrix is the pinned bytes (captured at dcb63e5)",
  shaLF(preRaw) === "1ceecf198a25dd1c996ba74f9889aaa85abd91e197bcb10ce8bdc43f5c2ce703",
  `sha ${shaLF(preRaw)}`);
const PRE = JSON.parse(preRaw);
const POST = JSON.parse(readFileSync(POST_PATH, "utf8"));
ok("both matrices carry the same 57 scenarios",
  JSON.stringify(Object.keys(PRE).sort()) === JSON.stringify(Object.keys(POST).sort()));
const movedScenarios = Object.keys(POST).filter((k) => JSON.stringify(PRE[k]) !== JSON.stringify(POST[k])).sort();
const EXPECTED_MOVED = ["composite_s6_solo_side_pressure", "fallback_all_none",
  "need_health_extra_support", "need_issue_none"];
ok("exactly the four scenarios whose answers use a corrected option moved — sleep_issues.none and health_conditions.extra_support",
  JSON.stringify(movedScenarios) === JSON.stringify(EXPECTED_MOVED),
  `moved=${JSON.stringify(movedScenarios)}`);
ok(`the other ${Object.keys(POST).length - EXPECTED_MOVED.length} scenarios are byte-identical`,
  Object.keys(POST).filter((k) => !EXPECTED_MOVED.includes(k))
    .every((k) => JSON.stringify(PRE[k]) === JSON.stringify(POST[k])));
const durabilityCarriers = new Set(models.filter((m) => (m.features || []).includes("durability")).map((m) => m.id));
let deltas = 0, offTag = [], negative = [];
for (const name of Object.keys(POST)) {
  for (const m of models) {
    const d = POST[name].scores[m.id] - PRE[name].scores[m.id];
    if (d === 0) continue;
    deltas++;
    if (!durabilityCarriers.has(m.id)) offTag.push(`${name}/${m.id}`);
    if (d < 0) negative.push(`${name}/${m.id}:${d}`);
  }
}
ok(`every one of the ${deltas} score changes landed on a model that carries \`durability\``,
  offTag.length === 0, offTag.slice(0, 4).join(", "));
ok("no model lost points (a corrected key can only add, and the per-feature cap bounds it at 5)",
  negative.length === 0, negative.slice(0, 4).join(", "));
// The correction DOES change the gold top pick, in three scenarios and for one
// reason: g5 and g7 were tied on score and the tie fell to catalog order. g7
// carries `durability` and g5 does not, so the corrected award breaks the tie
// toward the model the signal was always meant to favour. Enumerated rather
// than waved through - any other top-pick movement fails here.
const TOP_PICK_CHANGES = {
  need_issue_none: ["Tempur-ProBreeze 2.0 Medium Hybrid", "Reserve Mayfair Medium"],
  need_health_extra_support: ["Tempur-ProBreeze 2.0 Medium Hybrid", "Reserve Mayfair Medium"],
  fallback_all_none: ["Tempur-ProBreeze 2.0 Medium Hybrid", "Reserve Mayfair Medium"],
};
const topMoved = Object.keys(POST).filter((k) => PRE[k].topPick !== POST[k].topPick).sort();
ok("the gold top pick changed in exactly the three enumerated scenarios",
  JSON.stringify(topMoved) === JSON.stringify(Object.keys(TOP_PICK_CHANGES).sort()),
  `moved=${JSON.stringify(topMoved)}`);
for (const [name, [before, after]] of Object.entries(TOP_PICK_CHANGES)) {
  ok(`${name}: top pick ${before} -> ${after}, and the winner carries \`durability\` while the model it passed does not`,
    PRE[name].topPick === before && POST[name].topPick === after
    && durabilityCarriers.has(POST[name].tiers.gold[0].id)
    && !durabilityCarriers.has(PRE[name].tiers.gold[0].id),
    `${PRE[name].topPick} -> ${POST[name].topPick}`);
  const wasTied = PRE[name].tiers.gold[0].score === PRE[name].tiers.gold[1].score;
  ok(`${name}: the models were TIED before the correction (${PRE[name].tiers.gold[0].score} each) — the corrected signal broke the tie, it did not overturn a lead`,
    wasTied, `scores ${PRE[name].tiers.gold.map((m) => m.id + ":" + m.score).join(" > ")}`);
}

console.log(`\nScoring vocabulary check: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
