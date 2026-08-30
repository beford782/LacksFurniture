// Item 3.7 step 1 — OFFLINE, READ-ONLY accessory-recommendation audit harness.
//
// Executes the REAL accessory engine functions extracted verbatim from
// index.html (the tests/phase1_output_regression_check.mjs pattern) against
// the shipped data/accessories.json, for the Phase 1 regression scenarios plus
// representative profiles. Writes ONLY to this scratchpad directory. Touches
// no repository file.
//
// Usage: node audit_accessories.mjs <repoRoot> <outJsonPath>
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";

const root = process.argv[2];
const outPath = process.argv[3];
const html = readFileSync(join(root, "index.html"), "utf8");
const ACCESSORIES = JSON.parse(readFileSync(join(root, "data", "accessories.json"), "utf8"));
const QUIZ = JSON.parse(readFileSync(join(root, "data", "quiz.json"), "utf8"));
const FIXTURE = JSON.parse(readFileSync(join(root, "tests", "fixtures", "phase1_output_baseline_daybreak_pr1.json"), "utf8"));

const sha = (s) => createHash("sha256").update(s).digest("hex");

function grab(name, argsPattern = "\\([^)]*\\)") {
  const re = new RegExp("function " + name + argsPattern + "\\s*\\{[\\s\\S]*?\\r?\\n    \\}");
  const m = html.match(re);
  if (!m) throw new Error("could not extract " + name);
  return m[0];
}

const SRC = {
  qualifyRankedChoices: grab("qualifyRankedChoices"),
  sleepSystemCategory: grab("sleepSystemCategory"),
  sleepSystemStepForItem: grab("sleepSystemStepForItem"),
  sleepSystemText: grab("sleepSystemText"),
  scoreAccessoriesFromAnswers: grab("scoreAccessoriesFromAnswers"),
  resolveFinalistState: grab("resolveFinalistState"),
  getSleepSystemFinalist: grab("getSleepSystemFinalist"),
  readSleepSystemGroups: grab("readSleepSystemGroups"),
  getSleepSystemViewModel: grab("getSleepSystemViewModel"),
  getSuggestedProtectionGoal: grab("getSuggestedProtectionGoal"),
  protectionGoalLabel: grab("protectionGoalLabel"),
  protectionGoalReason: grab("protectionGoalReason"),
  protectorSupportsGoal: grab("protectorSupportsGoal"),
  getAdjustabilityDemo: grab("getAdjustabilityDemo"),
};

// The hero (primary) selection inside renderSleepSystemMain() is DOM-bound, so
// its three ordering rules and the badge/reason rules are TRANSCRIBED here for
// the default screen state (no support choice, no pillow candidate, no manual
// protection goal). Source: index.html renderSleepSystemMain(). Any drift
// between this transcription and the renderer is a harness defect, not an
// engine finding — the transcription is quoted in the audit document.
function heroFor(stepId, items, ctx) {
  let list = items.slice();
  if (stepId === "protection") {
    const goal = ctx.protectionGoal;
    list = list.slice().sort((a, b) => {
      const ag = ctx.protectorSupportsGoal(a, goal) ? 1 : 0;
      const bg = ctx.protectorSupportsGoal(b, goal) ? 1 : 0;
      return bg - ag;
    });
  }
  const primary = list[0] || null;
  const alternatives = list.slice(1, 3);
  let badge = "", reason = "";
  if (primary) {
    if (stepId === "support") badge = "Support option";
    else if (stepId === "protection") badge = "Best for " + ctx.protectionGoalLabel(ctx.protectionGoal).en;
    else badge = primary.meetsMatchThreshold ? "Recommended to try" : "Worth comparing";
    reason = stepId === "protection"
      ? ctx.protectionGoalReason(ctx.protectionGoal).en
      : (primary.reasons && primary.reasons[0]) || "";
  }
  return { primary: primary && primary.id, badge, reason, alternatives: alternatives.map((a) => a.id) };
}

function run(answers, lang) {
  const out = {};
  const win = {
    _savedPicks: [], _favoriteMattressId: "", _accCart: {},
    _sleepSystemState: { activeStep: "adjustability", decisions: {}, demoPosition: "", supportChoice: "", pillowCandidateId: "", pillowReaction: "", pillowFeedback: "", protectionGoal: "" }
  };
  new Function("ACCESSORIES", "window", "answers", "currentLang", "out", `"use strict";
    var _resultsState = null;
    var analytics = {};
    ${Object.values(SRC).join("\n")}
    out.ordered = scoreAccessoriesFromAnswers();
    out.vm = getSleepSystemViewModel();
    out.protectionGoal = getSuggestedProtectionGoal();
    out.demo = getAdjustabilityDemo();
    out.fns = { protectorSupportsGoal, protectionGoalLabel, protectionGoalReason };
    out.analytics = analytics;`)(ACCESSORIES, win, JSON.parse(JSON.stringify(answers)), lang, out);
  return out;
}

// Independent re-derivation of which answer fired each item's score, from the
// catalog's matchScores keys. Cross-checked against the engine's reasons count.
function triggers(a, answers) {
  const t = [];
  const pos = answers.sleep_position || "", temp = answers.temperature || "";
  const issues = answers.sleep_issues || [], health = answers.health_conditions || [];
  const ms = a.matchScores || {};
  if (ms["position_" + pos]) t.push("sleep_position=" + pos);
  if (temp === "hot" && ms.cooling) t.push("temperature=hot(cooling)");
  if (temp === "hot" && ms.hot) t.push("temperature=hot(hot)");
  if (issues.includes("back_pain") && ms.back_pain) t.push("sleep_issues:back_pain");
  if (health.includes("snoring") && ms.snoring) t.push("health_conditions:snoring");
  if (health.includes("reflux") && ms.reflux) t.push("health_conditions:reflux");
  if (health.includes("allergies") && ms.allergies) t.push("health_conditions:allergies");
  if (answers.budget === "premium" && ms.premium) t.push("budget=premium (NO SUCH QUIZ QUESTION)");
  return t;
}

const REP = {
  r01_solo_side_no_issues: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["none"] },
  r02_solo_back_no_issues: { partner_sleep: "solo", sleep_position: "back", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["none"] },
  r03_solo_stomach_no_issues: { partner_sleep: "solo", sleep_position: "stomach", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["none"] },
  r04_partner_side_snoring_only: { partner_sleep: "partner", sleep_position: "side", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["snoring"] },
  r05_partner_back_reflux_only: { partner_sleep: "partner", sleep_position: "back", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["reflux"] },
  r06_solo_side_back_pain_only: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["back_pain"], health_conditions: ["none"] },
  r07_allergies_only_back: { partner_sleep: "solo", sleep_position: "back", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["allergies"] },
  r08_hot_via_sleep_issue_only: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["hot"], health_conditions: ["none"] },
  r09_hot_via_temperature_only: { partner_sleep: "solo", sleep_position: "side", temperature: "hot", sleep_issues: ["none"], health_conditions: ["none"] },
  r10_cold_sleeper_back: { partner_sleep: "solo", sleep_position: "back", temperature: "cold", sleep_issues: ["none"], health_conditions: ["none"] },
  r11_combo_position_hot: { partner_sleep: "partner", sleep_position: "combo", temperature: "hot", sleep_issues: ["none"], health_conditions: ["none"] },
  r12_no_idea_position: { partner_sleep: "solo", sleep_position: "no_idea", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["none"] },
  r13_stomach_snoring_hot: { partner_sleep: "partner", sleep_position: "stomach", temperature: "hot", sleep_issues: ["none"], health_conditions: ["snoring"] },
  r14_everything_flagged: { partner_sleep: "partner", sleep_position: "side", temperature: "hot", sleep_issues: ["back_pain", "hot"], health_conditions: ["snoring", "reflux", "allergies"] },
  r15_getting_older_extra_support: { partner_sleep: "solo", sleep_position: "back", temperature: "comfortable", sleep_issues: ["stiff"], health_conditions: ["getting_older", "extra_support"] },
  r16_hip_pain_side: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["hip_pain"], health_conditions: ["none"] },
  r17_nerve_pain_side: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["nerve_pain"] },
  r18_partner_opposite_temperature: { partner_sleep: "partner", sleep_position: "side", temperature: "opposite", sleep_issues: ["none"], health_conditions: ["none"] },
  // PROBE ONLY: `budget` is not a quiz question; this shows what the dormant
  // branch would do if an answer the quiz cannot produce were present.
  x01_PROBE_budget_premium_unreachable: { partner_sleep: "solo", sleep_position: "side", temperature: "comfortable", sleep_issues: ["none"], health_conditions: ["none"], budget: "premium" },
};

const scenarios = {};
for (const [id, s] of Object.entries(FIXTURE.scenarios)) scenarios[id] = s.answers;
Object.assign(scenarios, REP);

const report = {
  tree: { indexHtmlSha256: sha(html), accessoriesSha256: sha(JSON.stringify(ACCESSORIES)), fixtureBaselineCommit: FIXTURE.baselineCommit },
  quizQuestionIds: QUIZ.questions.map((q) => q.id),
  catalog: ACCESSORIES.map((a) => ({ id: a.id, name: a.name.en, category: a.category.en, subType: a.subType || null, price: a.price, matchTags: a.matchTags, matchScores: a.matchScores })),
  extractedFunctionSha256: Object.fromEntries(Object.entries(SRC).map(([k, v]) => [k, sha(v)])),
  scenarios: {},
  fixtureAgreement: {},
  languageParity: {},
};

for (const [id, answers] of Object.entries(scenarios)) {
  const en = run(answers, "en");
  const es = run(answers, "es");
  const ctx = {
    protectionGoal: en.protectionGoal,
    protectorSupportsGoal: en.fns.protectorSupportsGoal,
    protectionGoalLabel: en.fns.protectionGoalLabel,
    protectionGoalReason: en.fns.protectionGoalReason,
  };
  const steps = {};
  for (const step of ["adjustability", "support", "pillow", "protection"]) {
    const items = en.vm.groups[step];
    steps[step] = {
      items: items.map((a) => ({ id: a.id, score: a.score, matched: a.matched, meetsMatchThreshold: a.meetsMatchThreshold, reasons: a.reasons, triggers: triggers(a, answers) })),
      hero: heroFor(step, items, ctx),
    };
  }
  const ordered = en.ordered.map((a) => ({ id: a.id, score: a.score, matched: a.matched, reasons: a.reasons, triggers: triggers(a, answers) }));
  const triggerMismatch = ordered.filter((a) => a.matched && a.triggers.length !== a.reasons.length && !(a.triggers.includes("temperature=hot(cooling)") && a.triggers.includes("temperature=hot(hot)"))).map((a) => a.id);
  report.scenarios[id] = {
    answers,
    engineInputs: { sleep_position: answers.sleep_position || "", temperature: answers.temperature || "", sleep_issues: answers.sleep_issues || [], health_conditions: answers.health_conditions || [], budget: answers.budget || "" },
    ordered,
    entryStep: "adjustability",
    steps,
    adjustabilityDemo: { recommendedPosition: en.demo.recommended, suggestion: en.demo.suggestion.en },
    suggestedProtectionGoal: en.protectionGoal,
    recommendedAccessoriesProjection: en.analytics.recommendedAccessories.map((r) => ({ name: r.name, category: r.category, score: r.score, meetsMatchThreshold: r.meetsMatchThreshold })),
    triggerMismatch,
    // showFinalistSleepSystemPrompt(): the first Pillows item in overall order
    // whose `matched` flag is true (an answer-specific reason fired); null = no prompt.
    drawerPromptPillow: (() => { const p = en.ordered.find((a) => a.matched && ACCESSORIES.find((c) => c.id === a.id).category.en === "Pillows"); return p ? { id: p.id, reason: p.reasons[0] } : null; })(),
    pillowHeroVsPrompt: (() => { const p = en.ordered.find((a) => a.matched && ACCESSORIES.find((c) => c.id === a.id).category.en === "Pillows"); const h = steps.pillow.hero.primary; return !p ? "no-prompt" : (p.id === h ? "same" : "DIFFERENT(prompt=" + p.id + ",hero=" + h + ")"); })(),
  };
  const enIds = JSON.stringify(en.ordered.map((a) => [a.id, a.score, a.matched]));
  const esIds = JSON.stringify(es.ordered.map((a) => [a.id, a.score, a.matched]));
  const enGroups = JSON.stringify(Object.fromEntries(Object.entries(en.vm.groups).map(([k, v]) => [k, v.map((a) => [a.id, a.meetsMatchThreshold])])));
  const esGroups = JSON.stringify(Object.fromEntries(Object.entries(es.vm.groups).map(([k, v]) => [k, v.map((a) => [a.id, a.meetsMatchThreshold])])));
  report.languageParity[id] = { orderedIdentical: enIds === esIds, groupsIdentical: enGroups === esGroups, reasonCountsIdentical: en.ordered.every((a, i) => a.reasons.length === es.ordered[i].reasons.length) };
  if (FIXTURE.scenarios[id]) {
    const f = FIXTURE.scenarios[id].accessories;
    const fOrdered = JSON.stringify(f.en.ordered.map((a) => [a.id, a.score, a.matched]));
    const fGroups = f.en.groups ? JSON.stringify(Object.fromEntries(Object.entries(f.en.groups).map(([k, v]) => [k, v.map((a) => [a.id, a.meetsMatchThreshold])]))) : null;
    report.fixtureAgreement[id] = { orderedMatchesFixture: fOrdered === enIds, groupsMatchFixture: fGroups === null ? "fixture has no groups" : fGroups === enGroups };
  }
}

writeFileSync(outPath, JSON.stringify(report, null, 1));

// Console summary
console.log("index.html sha256", report.tree.indexHtmlSha256);
console.log("fixture baselineCommit", report.tree.fixtureBaselineCommit);
console.log("fixture agreement:", JSON.stringify(report.fixtureAgreement));
const parityFail = Object.entries(report.languageParity).filter(([, v]) => !(v.orderedIdentical && v.groupsIdentical && v.reasonCountsIdentical)).map(([k]) => k);
console.log("language parity failures:", parityFail.length ? parityFail.join(",") : "none");
const mism = Object.entries(report.scenarios).filter(([, v]) => v.triggerMismatch.length).map(([k, v]) => k + ":" + v.triggerMismatch.join("/"));
console.log("trigger/reason count mismatches:", mism.length ? mism.join(" ") : "none");
console.log("");
for (const [id, s] of Object.entries(report.scenarios)) {
  console.log("=== " + id + "  inputs=" + JSON.stringify(s.engineInputs));
  console.log("  ordered: " + s.ordered.map((a) => a.id + "(" + a.score + (a.matched ? "*" : "") + ")").join(" > "));
  for (const step of ["adjustability", "support", "pillow", "protection"]) {
    const st = s.steps[step];
    console.log("  " + step.padEnd(13) + " items=[" + st.items.map((a) => a.id + ":" + a.score + (a.meetsMatchThreshold ? "T" : "f")).join(", ") + "]  HERO=" + st.hero.primary + " [" + st.hero.badge + "] \"" + st.hero.reason + "\"  alt=" + JSON.stringify(st.hero.alternatives));
  }
  console.log("  drawer prompt pillow=" + JSON.stringify(s.drawerPromptPillow) + "  vs hero: " + s.pillowHeroVsPrompt);
  console.log("  demo position=" + s.adjustabilityDemo.recommendedPosition + " (" + s.adjustabilityDemo.suggestion + ")  protection goal=" + s.suggestedProtectionGoal);
}
