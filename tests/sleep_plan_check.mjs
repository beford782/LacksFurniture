#!/usr/bin/env node
// Sleep Plan check — Slice 5 (D5 / roadmap §1.7), owner rulings 2026-08-21.
//
// Two halves, deliberately distinct:
//
//   PART 1 — PASS-1 CHARACTERIZATION AGAINST SHIPPED CODE. These assertions
//   were written to be RED at 4a76503 for a stated reason (silent finalist
//   promotion, the reachable two-tap orphan, the impure accessory view model)
//   and to turn green ONLY when the Slice 5 behaviour lands. They need no new
//   symbol to fail, which is what makes them discriminating rather than
//   "extraction failed". Their red run is recorded in the C0 commit message.
//
//   PART 2 — THE SLICE 5 CONTRACT. Each section is gated on the symbol it
//   governs. A MISSING symbol is reported as an explicit [pending] line and
//   counted as a failure ONLY after the corresponding commit should have
//   landed (the REQUIRED set below). Until then absence is absence, not
//   success — and never a green.
//
// Every assertion that governs behaviour has a named mutant in
// tests/mutation_sweep.mjs whose observer list names THIS file explicitly
// (mutation_sweep's DEFAULT_SUITES fall-through would otherwise report a
// survivor as a pass).
//
// Run: node tests/sleep_plan_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const norm = html.replace(/\r\n/g, "\n");
const dictEn = JSON.parse(readFileSync(join(root, "data", "dict-en.json"), "utf8"));
const dictEs = JSON.parse(readFileSync(join(root, "data", "dict-es.json"), "utf8"));
const ACCESSORIES = JSON.parse(readFileSync(join(root, "data", "accessories.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
  return !!cond;
}
function section(name) { console.log(`\n-- ${name} --`); }

function extractFunction(anchor) {
  const start = norm.indexOf(anchor);
  if (start === -1) return null;
  let i = norm.indexOf("{", start);
  if (i === -1) return null;
  let depth = 1; i++;
  while (i < norm.length && depth > 0) {
    const ch = norm[i];
    if (ch === "{") depth++; else if (ch === "}") depth--;
    i++;
  }
  return norm.slice(start, i) + ";";
}
function countOccurrences(s, needle) { return s.split(needle).length - 1; }
function throwingWindow(seed = {}) {
  const store = Object.assign(Object.create(null), seed);
  return new Proxy(store, {
    get(t, k) {
      if (typeof k === "symbol") return undefined;
      if (k in t) return t[k];
      throw new Error(`read window.${String(k)} which this harness never declared`);
    },
    set(t, k, v) { t[k] = v; return true; },
    has(t, k) { return typeof k === "symbol" ? false : k in t; },
    deleteProperty(t, k) { delete t[k]; return true; }
  });
}

// Which Part 2 sections are REQUIRED at this head. The C0 commit ships this
// file with only Part 1 required; each later commit flips its section on by
// landing the symbol. A section listed here whose symbol is absent is a
// failure; one not listed is reported [pending].
const REQUIRED = new Set([
  // "resolveFinalistState",   // finalist provenance commit
  // "readSleepSystemGroups",  // content-consumer commit
  // "sleepPlanScreen",        // screen-shell commit
]);
function gate(symbolName, present) {
  if (present) return true;
  if (REQUIRED.has(symbolName)) { check(`[required] ${symbolName} is present`, false, "symbol absent at a head that requires it"); }
  else { console.log(`  [pending] ${symbolName} not present at this head — section skipped (not counted as pass)`); }
  return false;
}

// ============================================================================
// PART 1 — pass-1 characterization against SHIPPED code
// ============================================================================

const FINALIST_SRC = extractFunction("function getSleepSystemFinalist()");
const VIEWMODEL_SRC = extractFunction("function getSleepSystemViewModel()");
const QUALIFY_SRC = extractFunction("function qualifyRankedChoices(sorted, scoreForItem)");
const STEP_SRC = extractFunction("function sleepSystemStepForItem(item)");
const CAT_SRC = extractFunction("function sleepSystemCategory(item)");

section("pass-1 / finalist: no silent promotion (RED at 4a76503 by design)");
check("getSleepSystemFinalist() extracted", !!FINALIST_SRC);
if (FINALIST_SRC) {
  const run = (savedPicks, favorite, resultsState, analytics) => {
    try {
      return { ok: true, v: new Function("window", "_resultsState", "analytics",
        FINALIST_SRC + "\n return getSleepSystemFinalist();")(
        { _savedPicks: savedPicks, _favoriteMattressId: favorite }, resultsState, analytics) };
    } catch (e) { return { ok: false, err: e }; }
  };
  const saved = [{ id: "g5", name: "G5" }, { id: "g6", name: "G6" }];
  const gold = [{ id: "gX", name: "GX" }];
  const top = { name: "TOP", tier: "gold" };
  const HOSTILE = [
    ["blank ''", ""], ["whitespace '  '", "  "], ["unknown 'g999'", "g999"],
    ["'g1' not among the picks", "g1"], ["number 0", 0], ["number 42", 42],
    ["boolean true", true], ["array []", []], ["object {}", {}],
    ["{toString:null}", { toString: null }], ["lone surrogate", "\uD800"],
    ["null", null], ["undefined", undefined],
  ];
  // With picks present: NONE of these names a finalist; the honest result is
  // null (no explicit finalist). Shipped code returns saved[0] for all 13.
  for (const [label, fav] of HOSTILE) {
    const r = run(saved, fav, null, {});
    check(`hostile favorite ${label} with picks present yields NO finalist (not saved[0])`,
      r.ok && r.v === null, r.ok ? `got ${JSON.stringify(r.v)}` : `threw ${r.err && r.err.message}`);
  }
  // With no picks and engine output present: still no finalist. Shipped code
  // promotes tierData.gold[0], then analytics.topPick.
  check("no picks + Gold #1 present yields NO finalist (never the engine's pick)",
    (() => { const r = run([], "", { tierData: { gold } }, {}); return r.ok && r.v === null; })());
  check("no picks + empty gold + analytics.topPick yields NO finalist (never the analytics fallback)",
    (() => { const r = run([], "", { tierData: { gold: [] } }, { topPick: top }); return r.ok && r.v === null; })());
  // The REACHABLE two-tap orphan (owner ruling R-1 evidence): favorite g5 was
  // un-saved on Results; _savedPicks=[g6], favorite still 'g5'. Shipped code
  // returns g6 and labels it "your finalist".
  check("ORPHANED favorite (un-saved on Results: picks=[g6], favorite='g5') yields NO finalist — never another saved pick",
    (() => { const r = run([{ id: "g6", name: "G6" }], "g5", null, {}); return r.ok && r.v === null; })());
  // Blank-id pick at index >= 1: a blank favorite must NOT match a blank pick
  // id. (At index 0 the outcome is indistinguishable from saved[0]; index 1 is
  // the discriminating fixture.)
  check("a BLANK pick id at index 1 is never matched by a blank favorite (C12 pattern in the finalist path)",
    (() => { const r = run([{ id: "g6" }, { id: "", name: "BLANK" }], "", null, {}); return r.ok && r.v === null; })());
  // Malformed _savedPicks shapes must not throw.
  for (const [label, picks] of [["[null, pick]", [null, { id: "g6" }]], ["a string", "g5g6"], ["a non-array object", { 0: { id: "g6" } }]]) {
    const r = run(picks, "g6", null, {});
    check(`malformed _savedPicks ${label} does not throw`, r.ok, r.ok ? "" : `threw ${r.err && r.err.message}`);
  }
  // Controls that must hold in BOTH worlds.
  check("[control] exact valid favorite 'g6' among the picks resolves to g6",
    (() => { const r = run(saved, "g6", null, {}); return r.ok && r.v && r.v.id === "g6"; })());
  check("[control] empty session resolves to null",
    (() => { const r = run([], "", null, {}); return r.ok && r.v === null; })());
}

section("pass-1 / accessories: the shipped view model is not a safe Plan accessor (RED at 4a76503 by design)");
check("getSleepSystemViewModel() extracted", !!VIEWMODEL_SRC);
check("qualifyRankedChoices/sleepSystemStepForItem/sleepSystemCategory extracted", !!QUALIFY_SRC && !!STEP_SRC && !!CAT_SRC);
if (VIEWMODEL_SRC && QUALIFY_SRC && STEP_SRC && CAT_SRC && FINALIST_SRC) {
  // A5: rendering-time reads must not mutate analytics. The shipped view model
  // assigns analytics.recommendedAccessories on every call.
  const SENTINEL = Object.freeze([]);
  const analytics = { recommendedAccessories: SENTINEL, topPick: null };
  let scorerCalls = 0;
  const out = {};
  try {
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState", "onScore", "out",
      `"use strict";
       function scoreAccessoriesFromAnswers() { onScore(); throw new Error('PLAN_CALLED_SCORER'); }
       ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${FINALIST_SRC} ${VIEWMODEL_SRC}
       out.vm = getSleepSystemViewModel();`)(
      ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), {}, "en", analytics, null, () => { scorerCalls++; }, out);
    out.threw = null;
  } catch (e) { out.threw = e; }
  check("A6: reading the Plan's accessory groups does NOT invoke the scorer (a throwing scorer stub must not fire)",
    scorerCalls === 0 && !(out.threw && /PLAN_CALLED_SCORER/.test(out.threw.message)),
    out.threw ? out.threw.message : `scorer calls=${scorerCalls}`);
  check("A5: reading the Plan's accessory groups leaves analytics.recommendedAccessories IDENTICAL (sentinel identity, not deep-equal)",
    analytics.recommendedAccessories === SENTINEL);
}

// ============================================================================
// PART 2 — the Slice 5 contract (each section gated on its symbol)
// ============================================================================

section("contract / resolveFinalistState()");
const RESOLVER_SRC = extractFunction("function resolveFinalistState()");
if (gate("resolveFinalistState", !!RESOLVER_SRC)) {
  const run = (savedPicks, favorite) => {
    try {
      return { ok: true, v: new Function("window", RESOLVER_SRC + "\n return resolveFinalistState();")(
        { _savedPicks: savedPicks, _favoriteMattressId: favorite }) };
    } catch (e) { return { ok: false, err: e }; }
  };
  const saved = [{ id: "g5", name: "G5" }, { id: "g6", name: "G6" }];
  const r = run(saved, "g6");
  check("returns a discriminated {kind, item}", r.ok && r.v && typeof r.v.kind === "string");
  check("exact valid favorite -> kind 'chosen' with that item", r.ok && r.v.kind === "chosen" && r.v.item && r.v.item.id === "g6");
  check("no favorite with picks -> kind 'none' (never a promotion)", (() => { const x = run(saved, ""); return x.ok && x.v.kind === "none" && !x.v.item; })());
  check("empty picks -> kind 'none'", (() => { const x = run([], ""); return x.ok && x.v.kind === "none"; })());
  check("orphaned favorite (picks=[g6], favorite 'g5') -> kind 'none'", (() => { const x = run([{ id: "g6" }], "g5"); return x.ok && x.v.kind === "none"; })());
  check("blank pick id at index 1 with blank favorite -> kind 'none'", (() => { const x = run([{ id: "g6" }, { id: "" }], ""); return x.ok && x.v.kind === "none"; })());
  for (const [label, fav] of [["whitespace", "  "], ["number", 42], ["boolean", true], ["array", []], ["object", {}], ["{toString:null}", { toString: null }], ["lone surrogate", "\uD800"], ["null", null]]) {
    check(`hostile favorite ${label} -> kind 'none', no throw`, (() => { const x = run(saved, fav); return x.ok && x.v.kind === "none"; })());
  }
  for (const [label, picks] of [["[null, pick]", [null, { id: "g6" }]], ["a string", "g5g6"], ["an object", { 0: { id: "g6" } }]]) {
    check(`malformed _savedPicks ${label} -> no throw`, run(picks, "g6").ok);
  }
  check("the resolver never references tierData, topPick or analytics (no engine fallback path exists)",
    !/tierData|topPick|analytics/.test(RESOLVER_SRC));
}

section("contract / readSleepSystemGroups() — side-effect-free Plan accessor");
const READ_SRC = extractFunction("function readSleepSystemGroups()");
if (gate("readSleepSystemGroups", !!READ_SRC) && QUALIFY_SRC && STEP_SRC && CAT_SRC) {
  check("the accessor does not write analytics", !/analytics\s*\./.test(READ_SRC.replace(/\/\/.*$/gm, "")));
  check("the accessor does not reach the finalist (no getSleepSystemFinalist / _favoriteMattressId)",
    !/getSleepSystemFinalist|_favoriteMattressId|_savedPicks/.test(READ_SRC));
  check("the accessor does not re-sort by score and does not re-apply the support sub-type sort",
    !/\.sort\(/.test(READ_SRC.replace(/\/\/.*$/gm, "")) || /groups\.support\.sort/.test(READ_SRC) === false);
  // The shipped view model must still produce byte-identical groups (the
  // fixture pins them); the accessor must equal the view model's groups.
  if (VIEWMODEL_SRC && FINALIST_SRC) {
    const SCORE_SRC = extractFunction("function scoreAccessoriesFromAnswers()");
    const answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" };
    const out = {};
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState", "out",
      `"use strict"; ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${FINALIST_SRC} ${VIEWMODEL_SRC} ${READ_SRC}
       out.vm = getSleepSystemViewModel().groups; out.rd = readSleepSystemGroups();`)(
      ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), answers, "en", {}, null, out);
    const ids = (g) => ["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.id));
    check("the accessor's four groups equal the view model's four groups, id-for-id, index-for-index",
      JSON.stringify(ids(out.vm)) === JSON.stringify(ids(out.rd)));
  }
}

section("contract / Sleep Plan screen shell");
const SCREEN_PRESENT = /\sid="sleepPlanScreen"/.test(html);
if (gate("sleepPlanScreen", SCREEN_PRESENT)) {
  check("sleepPlanScreen is a .screen container with role=region",
    /<div\b[^>]*\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"[^>]*\sid="sleepPlanScreen"[^>]*\srole="region"/.test(html)
    || /<div\b[^>]*\sid="sleepPlanScreen"[^>]*\sclass="(?:[^"]*\s)?screen(?:\s[^"]*)?"[^>]*\srole="region"/.test(html));
  check("sleepPlanScreen is registered in SCREEN_NAME_KEYS", /sleepPlanScreen:\s*'screen\.sleep_plan'/.test(html));
  check("screen.sleep_plan is bilingual and translated",
    typeof dictEn["screen.sleep_plan"] === "string" && typeof dictEs["screen.sleep_plan"] === "string" && dictEn["screen.sleep_plan"] !== dictEs["screen.sleep_plan"]);
  check("sleepPlanScreen is registered in SCREEN_HEADING_IDS (render-then-showScreen shape)", /sleepPlanScreen:\s*'sleepPlanTitle'/.test(html));
  check("the Plan is wiped by name in resetSessionState (no typeof guard)",
    /window\._sleepPlanState = \{/.test(extractFunction("function resetSessionState(opts)") || ""));
  check("switchLanguage re-renders the Plan when it is active",
    /sleepPlanScreen[\s\S]{0,120}renderSleepPlan\(\)/.test(extractFunction("async function switchLanguage(lang)") || extractFunction("function switchLanguage(lang)") || ""));
}

console.log(`\nSleep Plan check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
