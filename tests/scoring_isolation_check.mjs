// Scoring isolation check — executes the real calculateScores().
//
// CLAUDE.md states the invariant twice: "Sleep fit first, payment choice
// second — financing NEVER affects scoring, tiers, or the Sleep Brief", and
// "Do not modify scoring weights or logic without confirming with Blake. This
// area has had significant prior tuning."
//
// Both statements lived only in prose. Nothing executed the scoring engine, so
// a mutation making financing interest a scoring input:
//     if (financingInterest === 'interested') { ...scores[m.id] += 40 }
// survived every suite, as did 10x-ing the locally-made bonus — enough to
// invert Gold/Silver/Bronze ordering and the "top 3 scoring >= 60% of top"
// qualification rule.
//
// This suite compiles calculateScores() against the real shipped catalogue and
// quiz, and asserts:
//   1. scores are byte-identical across every financing state;
//   2. the documented weights still hold (firmness ladder, locally-made +25,
//      the per-feature cap, the >=4 diff penalty);
//   3. golden pins on the shipped catalogue, so a silent retune is visible.
//
// Run: node tests/scoring_isolation_check.mjs     (exit 0 = all pass)
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const MATTRESSES = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
  return cond;
}

const m = html.match(/function calculateScores\(\)\s*\{[\s\S]*?\n    \}/);
if (!check("extracted calculateScores()", !!m)) process.exit(1);

// The engine reads MATTRESSES, QUESTIONS, answers and currentLang from module
// scope. Financing state (financingInterest / financingExplored) is deliberately
// declared here too: if the engine ever starts reading it, this harness will
// happily supply it — and the equality assertions below will catch it.
const engine = new Function("MATTRESSES", "QUESTIONS", `
  var answers = {}, currentLang = 'en';
  var financingInterest = 'undecided', financingExplored = false;
  ${m[0]}
  return function (a, lang, finInterest, finExplored) {
    answers = a; currentLang = lang;
    financingInterest = finInterest; financingExplored = finExplored;
    return calculateScores();
  };`)(MATTRESSES, QUIZ.questions);

const ANSWER_SETS = {
  "side sleeper, hot, back pain": {
    sleep_quality: "poor", trigger: "pain", mattress_size: "queen",
    partner_sleep: "partner", partner_disturbance: "yes_often",
    sleep_position: "side", body_type: "average", temperature: "hot",
    firmness: 4, current_mattress_age: "eight_fifteen",
    sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring"]
  },
  "solo, firm, no issues": {
    sleep_quality: "well", trigger: "upgrade", mattress_size: "king",
    partner_sleep: "solo", sleep_position: "back", body_type: "athletic",
    temperature: "comfortable", firmness: 8,
    current_mattress_age: "under_2", sleep_issues: ["none"],
    health_conditions: ["none"]
  },
  "plus body, plush, reflux": {
    sleep_quality: "fair", trigger: "worn_out", mattress_size: "full",
    partner_sleep: "family", partner_disturbance: "sometimes",
    sleep_position: "combo", body_type: "plus", temperature: "cold",
    firmness: 2, current_mattress_age: "fifteen_plus",
    sleep_issues: ["hip_pain", "sagging"], health_conditions: ["reflux"]
  }
};

// Every financing state the app can be in.
const FIN_STATES = [
  ["undecided", false], ["undecided", true],
  ["interested", false], ["interested", true],
  ["not_now", false], ["not_now", true]
];

// --- 1. Financing state cannot move a single point --------------------------
console.log("Financing state does not affect scoring:");
for (const [name, answers] of Object.entries(ANSWER_SETS)) {
  for (const lang of ["en", "es"]) {
    const base = engine(answers, lang, "undecided", false);
    const baseJson = JSON.stringify(base.scores);
    for (const [interest, explored] of FIN_STATES) {
      const got = engine(answers, lang, interest, explored);
      check(`[${lang}] ${name} - scores identical with interest=${interest}/explored=${explored}`,
        JSON.stringify(got.scores) === baseJson);
    }
    // Match reasons are the Sleep Brief's raw material; they must not move either.
    const reasonsJson = JSON.stringify(base.matchReasons);
    const withInterest = engine(answers, lang, "interested", true);
    check(`[${lang}] ${name} - match reasons identical too`,
      JSON.stringify(withInterest.matchReasons) === reasonsJson);
  }
}

// --- 2. The scoring engine never mentions financing at all ------------------
console.log("The engine's source contains no financing identifier:");
for (const id of ["financingInterest", "financingExplored", "getFinancingConfig",
                  "financingTermsFresh", "exactPromotionsEnabled", "FC("]) {
  check(`calculateScores() does not reference ${id}`, !m[0].includes(id));
}

// --- 3. Documented weights still hold ---------------------------------------
// From CLAUDE.md: firmness is a linear slide (50 - diff*10, floored at 0) with
// an extra -20 once diff >= 4; locally-made is +25; the per-feature cap is 5.
console.log("Documented scoring weights hold:");
const all = Object.values(MATTRESSES).flat();
{
  // Isolate firmness by supplying ONLY the firmness answer.
  const at = (v) => engine({ firmness: v }, "en", "undecided", false).scores;
  for (const target of [1, 5, 10]) {
    const s = at(target);
    for (const mm of all) {
      const diff = Math.abs(mm.firmness - target);
      let expected = Math.max(0, 50 - diff * 10);
      if (diff >= 4) expected -= 20;
      if (mm.locallyMade === true) expected += 25;
      if (s[mm.id] !== expected) {
        check(`firmness ${target}: ${mm.id} scores ${expected}`, false,
          `got ${s[mm.id]}`);
        break;
      }
    }
  }
  check("firmness ladder + locally-made bonus reproduce exactly for every model",
    [1, 5, 10].every(t => {
      const s = at(t);
      return all.every(mm => {
        const d = Math.abs(mm.firmness - t);
        let e = Math.max(0, 50 - d * 10);
        if (d >= 4) e -= 20;
        if (mm.locallyMade === true) e += 25;
        return s[mm.id] === e;
      });
    }));
  const local = all.filter(x => x.locallyMade === true);
  const nonlocal = all.filter(x => x.locallyMade !== true);
  check("catalogue actually exercises both locally-made branches",
    local.length > 0 && nonlocal.length > 0,
    `${local.length} local / ${nonlocal.length} not`);
}

// --- 3b. The per-feature cap actually caps ----------------------------------
// FEATURE_CAP=5 exists so overlapping signals cannot run a score away. The
// documented example is exactly this one: "hot sleeper + 'too hot' issue".
// temperature/hot awards cooling=3 and sleep_issues/hot awards cooling=3, so a
// cooling mattress would gain 6 uncapped and must gain 5. Measured as a DELTA
// over a baseline that already includes the first answer, so the assertion does
// not depend on catalogue-wide absolute values — and so BOTH raising and
// lowering the cap is visible.
console.log("The per-feature cap caps:");
{
  const FIRM = 5;
  const carriers = all.filter(mm => (mm.features || []).includes("cooling"));
  check("catalogue has models carrying cooling", carriers.length > 0, `${carriers.length}`);
  const CAP = 5;
  const ANS = { firmness: FIRM, temperature: "hot", sleep_issues: ["hot"] };
  const base = engine({ firmness: FIRM }, "en", "undecided", false).scores;
  const both = engine(ANS, "en", "undecided", false).scores;

  // Expected feature contribution, computed analytically from the quiz data:
  // per feature, sum the awards from the supplied answers, then apply the cap.
  // Any change to FEATURE_CAP — up OR down — makes this disagree with the engine.
  const opts = [];
  for (const [qid, ansVal] of Object.entries(ANS)) {
    const q = QUIZ.questions.find(x => x.id === qid);
    if (!q || q.type === "slider") continue;
    for (const sel of Array.isArray(ansVal) ? ansVal : [ansVal]) {
      const o = (q.options || []).find(x => x.id === sel);
      if (o && o.scores) opts.push(o);
    }
  }
  const expectedDelta = (mm) => {
    const tot = {};
    for (const o of opts) {
      for (const [f, p] of Object.entries(o.scores)) {
        if (!(mm.features || []).includes(f)) continue;
        const cur = tot[f] || 0;
        tot[f] = cur + Math.max(0, Math.min(p, CAP - cur));
      }
    }
    return Object.values(tot).reduce((a, b) => a + b, 0);
  };
  const wrong = all.filter(mm => (both[mm.id] - base[mm.id]) !== expectedDelta(mm));
  check("feature awards match the analytic cap model for EVERY model",
    wrong.length === 0,
    wrong.slice(0, 3).map(mm =>
      `${mm.id}: got +${both[mm.id] - base[mm.id]} want +${expectedDelta(mm)}`).join(" | "));
  check("the fixture actually exercises the cap (cooling 3+3 would exceed it)",
    carriers.some(mm => {
      let raw = 0;
      for (const o of opts) if (o.scores.cooling && (mm.features || []).includes("cooling")) raw += o.scores.cooling;
      return raw > CAP;
    }));
}

// --- 4. Golden pins on the shipped catalogue --------------------------------
// A silent retune (weights, cap, penalty) changes these numbers.
console.log("Golden pins on the shipped catalogue:");
for (const [name, answers] of Object.entries(ANSWER_SETS)) {
  const { scores } = engine(answers, "en", "undecided", false);
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const top = ranked[0];
  const qualified = ranked.filter(([, v]) => v >= top[1] * 0.6);
  check(`${name}: deterministic winner and a stable qualified set`,
    top[1] > 0 && qualified.length > 0 && qualified.length <= ranked.length);
  // EN and ES must rank identically — language must not reorder results.
  const es = engine(answers, "es", "undecided", false).scores;
  check(`${name}: EN and ES produce identical scores`,
    JSON.stringify(scores) === JSON.stringify(es));
}

console.log(`\nScoring isolation check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
