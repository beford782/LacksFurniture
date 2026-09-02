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
const STORE_CONFIG = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));

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
  "resolveFinalistState", "chooseFinalist",   // finalist provenance commit (C2)
  "readSleepSystemGroups",   // accessor commit (C3)
  "sleepPlanScreen", "renderSleepPlan",   // screen-shell commit (C4)
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
  // Once the resolver lands, getSleepSystemFinalist() delegates to it; the
  // sandbox includes it when present so the wrapper is exercised as shipped.
  const RESOLVER_FOR_PASS1 = extractFunction("function resolveFinalistState()") || "";
  const run = (savedPicks, favorite, resultsState, analytics) => {
    try {
      return { ok: true, v: new Function("window", "_resultsState", "analytics",
        RESOLVER_FOR_PASS1 + "\n" + FINALIST_SRC + "\n return getSleepSystemFinalist();")(
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
  // A5: the shipped view model MUTATES analytics.recommendedAccessories on
  // every call, so it is not a safe thing for a renderer to read. At 4a76503
  // it was the only accessor; the Plan's accessor (readSleepSystemGroups,
  // gated below) must leave the sentinel IDENTICAL. Measured with a real
  // scorer so the call reaches the write.
  const SENTINEL = Object.freeze([]);
  const analytics = { recommendedAccessories: SENTINEL, topPick: null };
  const SCORE_FOR_A5 = extractFunction("function scoreAccessoriesFromAnswers()");
  const READ_FOR_A5 = extractFunction("function readSleepSystemGroups()") || "";
  new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState",
    `"use strict"; ${SCORE_FOR_A5} ${extractFunction("function resolveFinalistState()") || ""} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${FINALIST_SRC} ${READ_FOR_A5} ${VIEWMODEL_SRC}
     getSleepSystemViewModel();`)(
    ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), { sleep_position: "side" }, "en", analytics, null);
  check("A5 (characterization): the shipped view model REASSIGNS analytics.recommendedAccessories — a renderer must not read through it",
    analytics.recommendedAccessories !== SENTINEL);
  if (READ_FOR_A5) {
    const a2 = { recommendedAccessories: SENTINEL, topPick: null };
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics",
      `"use strict"; ${SCORE_FOR_A5} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_FOR_A5} readSleepSystemGroups();`)(
      ACCESSORIES, throwingWindow({}), { sleep_position: "side" }, "en", a2);
    check("A5: the Plan's accessor leaves analytics.recommendedAccessories IDENTICAL (sentinel identity, not deep-equal)",
      a2.recommendedAccessories === SENTINEL);
  } else {
    console.log("  [pending] A5 accessor half skipped — readSleepSystemGroups not present at this head");
  }
  // A6 belongs to the Plan RENDERER (it must never call the scorer, directly
  // or indirectly); it is asserted in the screen-shell section with a
  // throwing scorer stub once renderSleepPlan exists.
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

section("contract / chooseFinalist() producer + atomic clears (R-1)");
const CHOOSE_SRC = extractFunction("window.chooseFinalist = function(mattressId)");
const TOGGLE_SAVE_SRC = extractFunction("window._toggleSavePick = function(mattressId)");
const REMOVE_SRC = extractFunction("window.removeReviewMattress = function(mattressId)");
const HF2_TOGGLE_SRC = extractFunction("window.toggleFavoriteMattress = function(mattressId)");
if (gate("chooseFinalist", !!CHOOSE_SRC && !!TOGGLE_SAVE_SRC && !!REMOVE_SRC && !!HF2_TOGGLE_SRC)) {
  // Minimal executable environment: a results state with two gold mattresses,
  // a DOM stub that records button repaints, an analytics recorder.
  // Loop-A2 (owner ruling 2026-09-01): a finalist exists only after a recorded
  // trial reaction, enforced at the ONE producer. The matrix below exercises
  // producer semantics WITH reactions recorded; the gate itself is proven by
  // the no-reaction environment after it.
  const mk = (reactions = { g5: "good", g6: "firm" }) => {
    const events = [];
    const buttons = {};
    const doc = {
      getElementById: (id) => buttons[id] || null,
      querySelectorAll: () => Object.values(buttons).filter((b) => b.className.includes("finalist-btn")),
    };
    const btn = (id, cls) => (buttons[id] = { id, className: cls, attrs: {}, textContent: "",
      classList: { add(c) { if (!this._s.has(c)) this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); }, _s: new Set() },
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : (k === "data-id" ? id.replace(/^fin-/, "") : null); } });
    btn("save-g5", "noct-save-btn"); btn("save-g6", "noct-save-btn");
    btn("fin-g5", "finalist-btn"); btn("fin-g6", "finalist-btn");
    const win = { _savedPicks: [], _favoriteMattressId: "", _updatePicksBadge: () => {}, _mattressReactions: reactions };
    const resultsState = { tierData: { gold: [{ id: "g5", name: "G5", brand: "B", firmness: 5 }, { id: "g6", name: "G6", brand: "B", firmness: 6 }], silver: [], bronze: [] } };
    new Function("window", "document", "_resultsState", "analytics", "t", "saveButtonLabel", "firmnessFeel", "renderHf2", "_renderResults",
      `"use strict";
       ${TOGGLE_SAVE_SRC}
       ${CHOOSE_SRC}
       function finalistButtonLabel(c) { return c ? 'CHOSEN' : 'CHOOSE'; }
       window._repaintFinalistControls = function() {
         document.querySelectorAll('.finalist-btn').forEach(function(btn) {
           var on = btn.getAttribute('data-id') === window._favoriteMattressId;
           btn.classList.toggle('chosen', on); btn.setAttribute('aria-pressed', on ? 'true' : 'false'); btn.textContent = finalistButtonLabel(on);
         });
       };
       ${REMOVE_SRC}
       ${HF2_TOGGLE_SRC}`)(
      win, doc, resultsState, { log: (e, d) => events.push({ e, d }) }, (k) => k, (s) => (s ? "SAVED" : "SAVE"), () => "FEEL", () => {}, () => {});
    return { win, events, buttons };
  };
  {
    const { win } = mk();
    win.chooseFinalist("g5");
    check("choosing an UNSAVED mattress saves it AND sets it as finalist (atomic)",
      win._savedPicks.some((p) => p.id === "g5") && win._favoriteMattressId === "g5");
    win.chooseFinalist("g6");
    check("choosing a second mattress REPLACES the previous finalist (single finalist) and saves it",
      win._favoriteMattressId === "g6" && win._savedPicks.some((p) => p.id === "g6") && win._savedPicks.some((p) => p.id === "g5"));
    const before = win._favoriteMattressId;
    win.chooseFinalist("g6");
    check("re-choosing the current finalist is an idempotent no-op (never a toggle off)", win._favoriteMattressId === before && before === "g6");
  }
  {
    // The Consultation Summary's control carries the SAME "Chosen ✓" label as
    // the Results producer (finalistButtonLabel) and must mean the same thing:
    // activating it on the current finalist keeps the finalist and keeps the
    // pick saved. Unsetting belongs to the adjacent Remove control. (External
    // review P2 at eb7b124: the hf2 control toggled the finalist OFF, so the
    // next Plan render silently fell back to the recommended starting point.)
    const { win } = mk();
    win.toggleFavoriteMattress("g5");
    check("hf2 control on an unchosen saved pick SETS it as finalist through the producer (saves + chooses)",
      win._favoriteMattressId === "g5" && win._savedPicks.some((p) => p.id === "g5"));
    win.toggleFavoriteMattress("g5");
    check("hf2 control on the CURRENT finalist is idempotent — finalist kept, pick still saved (never a toggle off)",
      win._favoriteMattressId === "g5" && win._savedPicks.some((p) => p.id === "g5"));
    win.toggleFavoriteMattress("g6");
    check("hf2 control on another pick REPLACES the finalist (single finalist), both picks stay saved",
      win._favoriteMattressId === "g6" && win._savedPicks.some((p) => p.id === "g5") && win._savedPicks.some((p) => p.id === "g6"));
  }
  {
    const { win } = mk();
    win._toggleSavePick("g5");
    check("SAVING ALONE never chooses a finalist", win._savedPicks.length === 1 && win._favoriteMattressId === "");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win._toggleSavePick("g6");
    win._toggleSavePick("g5");   // un-save the chosen one on Results
    check("un-saving the chosen mattress on Results ATOMICALLY clears _favoriteMattressId (the two-tap orphan is closed)",
      !win._savedPicks.some((p) => p.id === "g5") && win._favoriteMattressId === "");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win._toggleSavePick("g6");
    win._toggleSavePick("g6");   // un-save a NON-finalist
    check("un-saving a different mattress leaves the finalist intact", win._favoriteMattressId === "g5");
  }
  {
    const { win } = mk();
    win.chooseFinalist("g5"); win.removeReviewMattress("g5");
    check("hf2 Remove of the chosen mattress clears the finalist", win._favoriteMattressId === "" && !win._savedPicks.some((p) => p.id === "g5"));
  }
  {
    const { win, events } = mk();
    win.chooseFinalist("g5");
    check("choosing emits NO analytics event of its own (only the save toggle's existing event, if a save happened)",
      events.every((x) => x.e === "save_pick_toggle"));
    for (const bad of ["", "  ", null, undefined, 42, {}, [], "g999"]) {
      const w = mk().win; w.chooseFinalist(bad);
      check(`chooseFinalist(${JSON.stringify(bad)}) is a no-op: no finalist, no throw, no stray save`,
        w._favoriteMattressId === "" && !w._savedPicks.some((p) => p && p.id === bad));
    }
  }
  // Loop-A2 (owner ruling 2026-09-01): Results may not create a finalist. The
  // two card templates emit "Try this mattress" (opens the trial drawer) and
  // define NO finalist producer; the drawer's control is static markup routed
  // through the same delegated handler into the one producer.
  {
    const { win } = mk({});
    win.chooseFinalist("g5");
    check("Loop-A2 gate: choosing a mattress with NO recorded reaction is refused - no finalist, no stray save",
      win._favoriteMattressId === "" && win._savedPicks.length === 0);
    const withReaction = mk({ g5: "good" }).win;
    withReaction.chooseFinalist("g5");
    check("Loop-A2 gate: the same call succeeds once a reaction is recorded",
      withReaction._favoriteMattressId === "g5" && withReaction._savedPicks.some((p) => p.id === "g5"));
  }
  check("Loop-A2: the Results card templates define NO finalist producer",
    countOccurrences(norm, "class=\"finalist-btn'") === 0);
  check("Loop-A2: both card templates EMIT the Try control between compare and save",
    // A3.1 (owner directive 2026-09-01): the details cue is retired; the
    // cluster reads compare -> Try -> save in both templates.
    (norm.match(/\+\s+compareBtn\s+\+\s+tryBtn\s+\+\s+saveBtn/g) || []).length === 2
    && countOccurrences(norm, 'class="noct-card-try"') === 2);
  check("Loop-A2: the producer carries the trial gate (refuses an unreacted mattress before any save)",
    /if \(!\(\(window\._mattressReactions \|\| \{\}\)\[mattressId\]\)\) return;/.test(norm)
    && norm.indexOf("(window._mattressReactions || {})[mattressId]") < norm.indexOf("window._toggleSavePick(mattressId);"));
  check("Loop-A2: the drawer footer control is disabled until a reaction and repainted on reaction and on open",
    /id="drawerFinalistBtn" class="finalist-btn drawer-finalist-btn" data-id="" aria-pressed="false" disabled/.test(norm)
    && /paintDrawerReactions\(mattressId\);\s*\n\s*window\.paintDrawerFinalist\(mattressId\);/.test(norm)
    && /if \(typeof window\.paintDrawerFinalist === 'function'\) window\.paintDrawerFinalist\(mattressId\);/.test(norm));
  check("the finalist control is routed through the delegated click handler before the card-tap path",
    /closest\('\.finalist-btn'\)[\s\S]{0,200}chooseFinalist\(/.test(norm)
    && norm.indexOf("closest('.finalist-btn')") < norm.indexOf("closest('.noct-toppick, .noct-support-card')"));
  check("the drawer's save control no longer says 'Save as Finalist' (labels a save as a save)",
    !/Save as Finalist|Guardar como finalista|Finalist saved|Finalista guardado/.test(norm));
  check("hf2 no longer calls saved picks 'finalists' (plural vocabulary retired)",
    !/'Your finalists'|'Tus finalistas'|'Add to finalists'|'Agregar a finalistas'|'Compare finalists'|'Comparar finalistas'|Only saved finalists|Solo los finalistas/.test(norm));
  check("the compare modal title no longer labels an arbitrary pair as finalists",
    !/Compare Your Finalists|Compara Tus Finalistas/.test(norm));
  check("the Sleep System anchor label is kind-aware (finalist vs recommended starting point) and dictionary-driven",
    /t\('finalist\.building_around_finalist'\)/.test(norm) && /t\('finalist\.building_around_recommended'\)/.test(norm)
    && !/'Building around your finalist'/.test(norm));
  for (const k of ["finalist.chosen", "finalist.recommended", "finalist.none", "finalist.choose", "finalist.choose_as", "finalist.chosen_btn",
    "finalist.building_around_finalist", "finalist.building_around_recommended", "compare.modal_title", "hf2.saved_picks_label", "hf2.compare_saved",
    "hf2.saved_picks_hint"]) {
    check(`dict key ${k} present in both languages and translated`,
      typeof dictEn[k] === "string" && dictEn[k].length > 0 && typeof dictEs[k] === "string" && dictEs[k].length > 0 && dictEn[k] !== dictEs[k]);
  }
  // The hint paired with "Your saved picks" must not call every saved pick a
  // finalist (saving and choosing are separate actions). External review P2
  // at 0613805: the renamed label still sat beside "Saved finalists are sent".
  check("the saved-picks hint is dictionary-driven and uses saved-pick terminology in BOTH languages (no 'finalist')",
    /hf2FinalistsHint:\s*t\('hf2\.saved_picks_hint'\)/.test(norm) && !/Saved finalists are sent/.test(norm) && !/Los finalistas guardados se env/.test(norm)
    && !/finalist/i.test(dictEn["hf2.saved_picks_hint"]) && !/finalista/i.test(dictEs["hf2.saved_picks_hint"]));
  check("the governed EN strings are exact", dictEn["finalist.chosen"] === "Finalist ✓" && dictEn["finalist.recommended"] === "Recommended starting point"
    && dictEn["finalist.none"] === "No finalist selected yet" && dictEn["finalist.choose"] === "Choose a finalist"
    && dictEn["finalist.choose_as"] === "Choose as finalist" && dictEn["finalist.chosen_btn"] === "Chosen ✓");
}

section("contract / readSleepSystemGroups() — side-effect-free Plan accessor");
const READ_SRC = extractFunction("function readSleepSystemGroups()");
const SCORE_SRC = extractFunction("function scoreAccessoriesFromAnswers()");
if (gate("readSleepSystemGroups", !!READ_SRC) && QUALIFY_SRC && STEP_SRC && CAT_SRC && SCORE_SRC) {
  const stripComments = (src) => src.replace(/\/\/.*$/gm, "");
  check("the accessor writes nothing to analytics", !/analytics\s*\./.test(stripComments(READ_SRC)));
  check("the accessor writes nothing to window state", !/window\.[A-Za-z_$][\w$]*\s*=/.test(stripComments(READ_SRC)));
  check("the accessor does not reach the finalist", !/getSleepSystemFinalist|resolveFinalistState|_favoriteMattressId|_savedPicks/.test(READ_SRC));
  // 3.7 P3 (owner ruling 2026-08-30) added a second engine-owned sort - the
  // matched-first pillow rank. The Plan reads the engine's order, so the pin
  // stays: exactly those two sorts, and neither comparator (nor anything after
  // qualification) re-sorts on score.
  check("the accessor carries the engine-owned support sub-type sort and the P3 matched-first pillow sort, and NO score re-sort",
    /groups\.support\.sort\(/.test(READ_SRC) && /groups\.pillow\.sort\(/.test(READ_SRC)
    && (stripComments(READ_SRC).match(/\.sort\(/g) || []).length === 2
    && !/score/.test(stripComments(READ_SRC).slice(stripComments(READ_SRC).indexOf("groups.support.sort("))));
  // A: engine parity. The accessor's groups must equal the fixture-facing
  // view model's groups id-for-id, index-for-index (the fixture pins the
  // latter; this ties the Plan's source to the pinned one).
  {
    const answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" };
    const out = {};
    new Function("ACCESSORIES", "window", "answers", "currentLang", "analytics", "_resultsState", "out",
      `"use strict"; ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${extractFunction("function resolveFinalistState()") || ""} ${FINALIST_SRC} ${READ_SRC} ${VIEWMODEL_SRC}
       out.vm = getSleepSystemViewModel().groups; out.rd = readSleepSystemGroups();`)(
      ACCESSORIES, throwingWindow({ _savedPicks: [], _favoriteMattressId: "" }), answers, "en", {}, null, out);
    const ids = (g) => ["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.id));
    check("the accessor's four groups equal the view model's four groups, id-for-id, index-for-index",
      JSON.stringify(ids(out.vm)) === JSON.stringify(ids(out.rd)));
    check("at the pinned catalog every group is non-empty (support/adjustability/pillow/protection)",
      ["support", "adjustability", "pillow", "protection"].every((k) => out.rd[k].length > 0));
  }
  // B: NOT memoized — and the assertion discriminates a PER-LANGUAGE memo,
  // which an EN/ES-differ check cannot. Same language, module-scope answers
  // mutated between two reads: the output MUST change. The scorer reads
  // `answers` directly, so no plumbing is needed.
  {
    const out = {};
    new Function("ACCESSORIES", "window", "currentLang", "out",
      `"use strict"; var answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" };
       ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
       out.a = JSON.stringify(readSleepSystemGroups());
       answers = { sleep_position: "back", temperature: "cold", sleep_issues: [], health_conditions: ["back_pain"], budget: "premium" };
       out.b = JSON.stringify(readSleepSystemGroups());
       out.a2 = (function(){ answers = { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" }; return JSON.stringify(readSleepSystemGroups()); })();`)(
      ACCESSORIES, throwingWindow({}), "en", out);
    check("two reads in the SAME language with answers mutated between them differ (no memo of any kind, per-language included)",
      out.a !== out.b);
    check("restoring the answers restores the output (deterministic given inputs)", out.a === out.a2);
  }
  // C: language reaches the reasons through the read, every time (no stale
  // first-render language). ES-first equals EN-then-ES.
  {
    const run = (seq) => {
      const out = {};
      new Function("ACCESSORIES", "window", "answers", "seq", "out",
        `"use strict"; var currentLang = seq[0];
         ${SCORE_SRC} ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
         out.r = seq.map(function(l){ currentLang = l; return readSleepSystemGroups(); });`)(
        ACCESSORIES, throwingWindow({}), { sleep_position: "side", temperature: "hot", sleep_issues: ["snoring"], health_conditions: [], budget: "mid" }, seq, out);
      return out.r;
    };
    const [en, es] = run(["en", "es"]);
    const [esFirst] = run(["es"]);
    const ids = (g) => JSON.stringify(["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.id)));
    const reasons = (g) => JSON.stringify(["support", "adjustability", "pillow", "protection"].map((k) => g[k].map((a) => a.reasons)));
    check("EN and ES reads yield identical ids in identical order (ranking is language-invariant)", ids(en) === ids(es));
    check("EN and ES reads yield DIFFERENT reason text (language reaches the read)", reasons(en) !== reasons(es));
    check("an ES-first read equals the ES read after EN (no first-render language freeze)", reasons(esFirst) === reasons(es));
  }
  // D: the accessor really invokes the scorer exactly once per read (a
  // throwing stub fires; a counting stub counts one) — it is a READ of the
  // engine, not a cache.
  {
    let calls = 0; let threw = null;
    try {
      new Function("ACCESSORIES", "window", "answers", "currentLang", "onScore",
        `"use strict"; function scoreAccessoriesFromAnswers() { onScore(); return []; }
         ${QUALIFY_SRC} ${CAT_SRC} ${STEP_SRC} ${READ_SRC}
         readSleepSystemGroups(); readSleepSystemGroups();`)(ACCESSORIES, throwingWindow({}), {}, "en", () => { calls++; });
    } catch (e) { threw = e; }
    check("each read invokes the engine scorer exactly once (two reads -> two calls; no cache)", !threw && calls === 2, threw && threw.message);
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
  check("switchLanguage re-renders the Plan when it is active (a live classList.contains('active') branch, not dead text)",
    /var sleepPlanScreen = document\.getElementById\('sleepPlanScreen'\);\s*if \(sleepPlanScreen && sleepPlanScreen\.classList\.contains\('active'\)\) \{\s*renderSleepPlan\(\);/.test(
      extractFunction("async function switchLanguage(lang)") || extractFunction("function switchLanguage(lang)") || ""));
}

section("contract / renderSleepPlan() — executed against a DOM stub");
const RENDER_SRCS = [
  "function sleepPlanTrialFocusIsComplete(stored)", "function sleepPlanTierLabel(tier)",
  "function sleepPlanMattressById(id)", "function sleepPlanModelLine(m)",
  "function renderSleepPlanFinalist()", "function renderSleepPlanPriorities()",
  "function renderSleepPlanCompared()", "function renderSleepPlanSystem()", "function renderSleepPlan()",
  "window.showSleepPlan = function(origin)", "window.sleepPlanBack = function()",
  "window.sleepPlanContinue = function()", "window.sleepPlanChooseFinalist = function()",
  "window.sleepPlanReturnToBrief = function()",
].map((a) => extractFunction(a));
const FALLBACK_SRC = extractFunction("function finalistRecommendedFallback()");
if (gate("renderSleepPlan", RENDER_SRCS.every(Boolean) && !!FALLBACK_SRC && !!READ_SRC && !!RESOLVER_SRC)) {
  const PLAN_SRC = RENDER_SRCS.join("\n");
  // Source-level bans on the renderer (cheap, and they catch the obvious).
  check("the renderer never calls scoreAccessoriesFromAnswers() (source)", !/scoreAccessoriesFromAnswers\s*\(/.test(PLAN_SRC));
  check("the renderer never calls getSleepSystemViewModel() (source)", !/getSleepSystemViewModel\s*\(/.test(PLAN_SRC));
  check("the renderer never writes analytics (source)", !/analytics\s*\.\s*[A-Za-z_$][\w$]*\s*=/.test(PLAN_SRC) && !/analytics\.log\(/.test(PLAN_SRC));
  check("the renderer never reads tierData/topPick for the FINALIST (the engine read is the caller-owned fallback only)",
    !/tierData|topPick/.test(extractFunction("function renderSleepPlanFinalist()").replace(/finalistRecommendedFallback\(\)/g, "")) );
  check("the renderer never reaches the payment dimensions", !/payExplored|payPref|payOpen|PAY_NOT_NOW|payRecordExplored|reviewPaymentPath/.test(PLAN_SRC));
  check("the renderer resolves tier labels through the existing results.tier_* keys (no second tier authority)",
    /'results\.tier_' \+/.test(PLAN_SRC) && !/'Oro'|'Plata'|'Bronce'|'Gold'|'Silver'|'Bronze'/.test(PLAN_SRC));
  check("the renderer contains no inline bilingual literal", !/\{\s*en:\s*'/.test(PLAN_SRC));
  check("the completeness predicate inlined in the Plan is textually identical to the producer/consumer copies",
    (() => {
      // Indentation differs (the producer/consumer copies sit one level
      // deeper), so compare with whitespace collapsed — the PREDICATE must be
      // identical, not the column it starts in.
      const ws = (x) => x.replace(/\s+/g, " ").trim();
      const plan = ws((PLAN_SRC.match(/var entryOk = function\(item\) \{[\s\S]*?\};/) || [""])[0]);
      const hf2 = ws((norm.match(/var entryOk = function\(item\) \{[\s\S]*?\};/) || [""])[0]);
      return plan.length > 50 && plan === hf2;
    })());

  // Executable harness: DOM stub, throwing scorer by default, recorder for
  // analytics, throwingWindow for undeclared reads.
  function makePlanEnv({ savedPicks = [], favorite = "", compare = [], cart = {}, trialFocus = null, results = null, groups = null, lang = "en", scorer = "throw" } = {}) {
    const els = {}; const focusLog = []; const screens = [];
    const mk = (id, tag) => (els[id] = { id, tag, innerHTML: "", textContent: "", hidden: false, style: {}, attrs: {},
      setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
      focus() { focusLog.push(id); }, scrollIntoView() {}, classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, contains(c) { return this._s.has(c); }, toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); } } });
    for (const id of ["sleepPlanBack", "sleepPlanEyebrow", "sleepPlanTitle", "sleepPlanContinue", "sleepPlanFinalistLabel", "sleepPlanFinalist",
      "sleepPlanPrioritiesLabel", "sleepPlanPriorities", "sleepPlanPrioritiesRecovery", "sleepPlanPrioritiesRecoveryText", "sleepPlanPrioritiesRecoveryBtn",
      "sleepPlanComparedLabel", "sleepPlanCompared", "sleepPlanSystemLabel", "sleepPlanSystem"]) mk(id);
    const doc = { getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [] };
    const analytics = { trialFocus: trialFocus === null ? [
      { en: "P1", es: "P1e", why: { en: "w1", es: "w1e" }, test: { en: "t1", es: "t1e" } },
      { en: "P2", es: "P2e", why: { en: "w2", es: "w2e" }, test: { en: "t2", es: "t2e" } },
      { en: "P3", es: "P3e", why: { en: "w3", es: "w3e" }, test: { en: "t3", es: "t3e" } }] : trialFocus,
      recommendedAccessories: Object.freeze([]), topPick: null, log: () => { analytics._logged = (analytics._logged || 0) + 1; } };
    const win = throwingWindow({ _savedPicks: savedPicks, _favoriteMattressId: favorite, _compareSelected: compare, _accCart: cart,
      _drawerData: {}, _sleepPlanState: { prioritiesInvalid: false, origin: "" } });
    const HOSTILE_GROUPS = groups || {
      support: [], adjustability: [],
      pillow: [ { id: "p-A", score: 10, matched: false, meetsMatchThreshold: false, name: { en: "A", es: "Ae" } },
                { id: "p-B", score: 99, matched: true, meetsMatchThreshold: true, name: { en: "B", es: "Be" } },
                { id: "p-C", score: 55, matched: true, meetsMatchThreshold: false, name: { en: "C", es: "Ce" } } ],
      protection: [ { id: "x-Z", score: 1, matched: false, meetsMatchThreshold: false, name: { en: "Z", es: "Ze" } } ] };
    const scorerSrc = scorer === "throw"
      ? "function scoreAccessoriesFromAnswers() { throw new Error('PLAN_CALLED_SCORER'); }"
      : "function scoreAccessoriesFromAnswers() { return []; }";
    const out = { screens, focusLog, els, win, analytics };
    const dict = (k) => (lang === "es" ? "ES:" : "EN:") + k;
    try {
      new Function("document", "window", "analytics", "_resultsState", "currentLang", "t", "escapeHtml", "L", "sleepSystemText", "showScreen", "_renderResults", "showProfileScreen", "sessionTimeout", "out",
        `"use strict";
         ${scorerSrc}
         // The accessor is REPLACED by a fixture for the renderer tests: this
         // proves the renderer consumes whatever the engine hands it at exact
         // indices, and cannot reach the real scorer (which throws).
         function readSleepSystemGroups() { return ${JSON.stringify(HOSTILE_GROUPS)}; }
         ${RESOLVER_SRC}
         ${FALLBACK_SRC}
         // The payment moment is a separate financing surface exercised by
         // payment_choice_check §29; stubbed here so the Plan renderer's own
         // contract is tested in isolation from D4's module state.
         function renderSleepPlanFinancing() {}
         ${PLAN_SRC}
         out.api = { render: renderSleepPlan, show: window.showSleepPlan, back: window.sleepPlanBack, cont: window.sleepPlanContinue, choose: window.sleepPlanChooseFinalist, recover: window.sleepPlanReturnToBrief };`)(
        doc, win, analytics, results, lang, dict, (x) => String(x), (o) => (o && typeof o === "object" ? (o[lang] || o.en) : String(o)), (o) => (o && typeof o === "object" ? (o[lang] || o.en) : String(o)),
        (id) => { screens.push(id); out.titleAtShow = (out.titleAtShow || []).concat([els.sleepPlanTitle.textContent]); }, () => { out.rendered = (out.rendered || 0) + 1; }, () => { out.profile = (out.profile || 0) + 1; }, (fn) => fn(), out);
      out.err = null;
    } catch (e) { out.err = e; }
    return out;
  }
  const RESULTS = { tierData: { gold: [{ id: "g1", name: "Gold One", tier: "gold" }, { id: "g2", name: "Gold Two", tier: "gold" }], silver: [], bronze: [] } };
  const ids = (html, attr) => [...String(html).matchAll(new RegExp(attr + '="([^"]+)"', "g"))].map((m) => m[1]);

  // A6 — the renderer never reaches the scorer (a throwing stub must not fire).
  { const env = makePlanEnv({ results: RESULTS }); env.api.render();
    check("A6: renderSleepPlan() completes with a THROWING scorer installed (the renderer never reaches it, directly or indirectly)", !env.err, env.err && env.err.message); }

  // Accessory block: hostile snapshot consumed at EXACT indices, order, length.
  { const env = makePlanEnv({ results: RESULTS, cart: { "p-B": { reasons: [] } } }); env.api.render();
    const got = ids(env.els.sleepPlanSystem.innerHTML, "data-acc-id");
    const idx = ids(env.els.sleepPlanSystem.innerHTML, "data-acc-index");
    check("system block renders pillow THEN protection at exact indices and produced length — ['p-A','p-B','p-C','x-Z']", JSON.stringify(got) === JSON.stringify(["p-A", "p-B", "p-C", "x-Z"]));
    check("system block indices are 0..n-1 in DOM order (index fidelity, not just sequence)", JSON.stringify(idx) === JSON.stringify(["0", "1", "2", "3"]));
    check("hostile order is NOT re-sorted by score (index 0 is the LOWEST score)", got[0] === "p-A");
    check("matched=false / meetsMatchThreshold=false items are NOT filtered", got.includes("p-A") && got.includes("x-Z"));
    check("an ADDED item stays in its engine position and reads 'added' (overlay, never a filter)",
      got[1] === "p-B" && /data-acc-id="p-B"[\s\S]*?EN:plan\.added/.test(env.els.sleepPlanSystem.innerHTML));
    check("not-added items read 'not added'", (env.els.sleepPlanSystem.innerHTML.match(/EN:plan\.not_added/g) || []).length === 3); }
  { const env = makePlanEnv({ results: RESULTS, groups: { support: [], adjustability: [], pillow: [{ id: "p-A", name: { en: "A" } }], protection: [] } }); env.api.render();
    check("a SHORT engine output renders at its produced length (1) — no backfill, no cap", ids(env.els.sleepPlanSystem.innerHTML, "data-acc-id").length === 1); }
  { const env = makePlanEnv({ results: RESULTS, groups: { support: [], adjustability: [], pillow: [], protection: [] } }); env.api.render();
    check("an EMPTY engine output renders an empty block without throwing (accessories-unavailable path)", !env.err && env.els.sleepPlanSystem.innerHTML === ""); }

  // Finalist block: the three states, never a substitution.
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g2" }); env.api.render();
    check("chosen: label is finalist.chosen and the chosen mattress renders; no route-back control",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.chosen" && /Gold Two/.test(env.els.sleepPlanFinalist.innerHTML) && !/sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "" }); env.api.render();
    check("saved picks with NO favorite: label is finalist.recommended, the ENGINE's Gold #1 (not saved[0]) renders, absence stated, route-back offered",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && /Gold One/.test(env.els.sleepPlanFinalist.innerHTML)
      && !/Gold Two/.test(env.els.sleepPlanFinalist.innerHTML) && /EN:finalist\.none/.test(env.els.sleepPlanFinalist.innerHTML) && /sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g9" }); env.api.render();
    check("stale favorite ('g9' unsaved): recommended state, never a promotion of saved[0]",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && !/Gold Two/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { // PRODUCTION SHAPE: showResults() maps MATTRESSES[tier] entries with score/pct/
    // meetsMatchThreshold and NO `tier` property (the tier is the bucket key only).
    // The recommended starting point is read from that bucket, so its tier-and-
    // position line must still resolve to Gold · lead. (External review P2 at
    // eb7b124: the fallback returned the raw entry and the line rendered blank.)
    const PROD = { tierData: { gold: [{ id: "g1", name: "Gold One", score: 90, pct: 100, meetsMatchThreshold: true },
                                      { id: "g2", name: "Gold Two", score: 80, pct: 89, meetsMatchThreshold: true }], silver: [], bronze: [] } };
    const env = makePlanEnv({ results: PROD, savedPicks: [], favorite: "" }); env.api.render();
    const html = env.els.sleepPlanFinalist.innerHTML;
    check("recommended starting point from PRODUCTION-shaped tierData (no tier stamp) still renders Gold One",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended" && /Gold One/.test(html));
    check("…and its model line carries the GOLD tier label (results.tier_gold), not a blank tier",
      /results\.tier_gold/.test(html) && !/results\.tier_(?![a-z])/.test(html));
    check("…and the lead position within Gold (results.match_lead)", /results\.match_lead/.test(html));
    check("the fallback does not mutate the engine's tierData entry (no tier stamped onto the shared object)",
      !("tier" in PROD.tierData.gold[0])); }
  { // NO-FINALIST HONESTY (owner ruling 2026-08-23, Slice 5 C10). The Plan's
    // priorities are the stored Sleep Brief prose; in the no-finalist state they
    // sit beside "Recommended starting point / No finalist selected yet", so the
    // real producer prose may not call the recommendation "the finalist". The
    // trialFocus used here is built from the REAL priority strings in the
    // producer source (every quoted argument of every addPriority(...) call),
    // not a hand-written fixture — so a regression in the source is what fails.
    const producer = (norm.match(/addPriority\(([\s\S]*?)\);/g) || []);
    const strings = producer.flatMap((call) => [...call.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]));
    check("the producer source exposes its priority strings (harness sanity)", producer.length >= 5 && strings.length >= 20);
    check("no producer priority string says 'the finalist' / 'el finalista' (source)",
      !strings.some((s) => /\bfinalist(a|as|s)?\b/i.test(s)), strings.filter((s) => /finalist/i.test(s)).join(" | "));
    const PROD2 = { tierData: { gold: [{ id: "g1", name: "Gold One", score: 90, pct: 100, meetsMatchThreshold: true }], silver: [], bronze: [] } };
    const realFocus = [{ en: "Comfortable elevation", es: "Elevación cómoda",
      why: { en: strings.find((s) => /raised upper body/i.test(s)) || "", es: strings.find((s) => /posición elevada/i.test(s)) || "" },
      test: { en: strings.find((s) => /^Try the .* flat, then with the head/i.test(s)) || "", es: strings.find((s) => /^Prueba el .* plano y luego/i.test(s)) || "" } }];
    check("the real 'Comfortable elevation' prose was located in the producer source", !!realFocus[0].test.en && !!realFocus[0].test.es && !!realFocus[0].why.en);
    for (const lang of ["en", "es"]) {
      const env = makePlanEnv({ results: PROD2, savedPicks: [], favorite: "", trialFocus: realFocus, lang }); env.api.render();
      const plain = (env.els.sleepPlanPriorities.innerHTML + " " + env.els.sleepPlanFinalist.innerHTML).replace(/(EN|ES):[a-z_.]+/g, "");
      check(`[${lang}] no-finalist Plan: the finalist block is the RECOMMENDED state (not a finalist)`,
        env.els.sleepPlanFinalistLabel.textContent === (lang === "es" ? "ES:" : "EN:") + "finalist.recommended");
      check(`[${lang}] no-finalist Plan: the rendered priority and finalist markup never calls the recommendation 'the finalist' (dictionary keys excluded)`,
        !/\bfinalist(a|as|s)?\b/i.test(plain), plain.slice(0, 200));
      check(`[${lang}] no-finalist Plan: the testing line says 'mattress' / 'colchón'`,
        lang === "es" ? /colchón plano/.test(env.els.sleepPlanPriorities.innerHTML) : /mattress flat/.test(env.els.sleepPlanPriorities.innerHTML));
    }
  }
  { const env = makePlanEnv({ results: { tierData: { gold: [], silver: [], bronze: [] } } }); env.api.render();
    check("no engine pick and no favorite: label is finalist.none, nothing rendered as a mattress, route-back offered",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.none" && !/hf2-pick__name/.test(env.els.sleepPlanFinalist.innerHTML) && /sleepPlanChooseFinalist/.test(env.els.sleepPlanFinalist.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g2", name: "Gold Two", tier: "gold" }], favorite: "g2" });
    env.api.render(); env.win._favoriteMattressId = ""; env.api.render();
    check("the Plan RE-RESOLVES on every render (favorite cleared between renders -> recommended, not a cached Finalist ✓)",
      env.els.sleepPlanFinalistLabel.textContent === "EN:finalist.recommended"); }

  // Compared block: membership, equality + order, unresolvable ids omitted.
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }, { id: "g2", name: "Gold Two", tier: "gold" }], compare: ["g2", "g1"] }); env.api.render();
    check("compared block renders EXACTLY _compareSelected in its order (['g2','g1'])", JSON.stringify(ids(env.els.sleepPlanCompared.innerHTML, "data-compared-id")) === JSON.stringify(["g2", "g1"])); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }], compare: [] }); env.api.render();
    check("compared block with an empty selection renders the neutral empty line — NEVER the saved picks", /EN:plan\.compared_empty/.test(env.els.sleepPlanCompared.innerHTML) && !/Gold One/.test(env.els.sleepPlanCompared.innerHTML)); }
  { const env = makePlanEnv({ results: RESULTS, savedPicks: [{ id: "g1", name: "Gold One", tier: "gold" }], compare: ["g1", "zzz", "", 42, null] }); env.api.render();
    check("unresolvable / blank / wrong-type compare ids are omitted; no raw token is rendered", JSON.stringify(ids(env.els.sleepPlanCompared.innerHTML, "data-compared-id")) === JSON.stringify(["g1"]) && !/zzz/.test(env.els.sleepPlanCompared.innerHTML)); }

  // Priorities: all-or-nothing, recovery, forward control withheld.
  { const env = makePlanEnv({ results: RESULTS }); env.api.render();
    check("valid priorities render 3 <li> in an <ol> and the forward control is available",
      (env.els.sleepPlanPriorities.innerHTML.match(/<li /g) || []).length === 3 && env.els.sleepPlanPrioritiesRecovery.hidden === true && env.els.sleepPlanContinue.hidden === false); }
  for (const badIndex of [0, 1, 2]) {
    const base = [ { en: "P1", es: "P1e", why: { en: "w1", es: "w1e" }, test: { en: "t1", es: "t1e" } },
      { en: "P2", es: "P2e", why: { en: "w2", es: "w2e" }, test: { en: "t2", es: "t2e" } },
      { en: "P3", es: "P3e", why: { en: "w3", es: "w3e" }, test: { en: "t3", es: "t3e" } } ];
    const broken = Object.assign({}, base[badIndex]); delete broken.test;
    const env = makePlanEnv({ results: RESULTS, trialFocus: base.map((x, i) => (i === badIndex ? broken : x)) }); env.api.render();
    check(`one malformed entry at index ${badIndex}: ZERO rows, recovery shown with the governed copy, forward control WITHHELD`,
      (env.els.sleepPlanPriorities.innerHTML.match(/<li /g) || []).length === 0 && env.els.sleepPlanPrioritiesRecovery.hidden === false
      && env.els.sleepPlanPrioritiesRecoveryText.textContent === "EN:plan.priorities_recovery" && env.els.sleepPlanContinue.hidden === true
      && env.win._sleepPlanState.prioritiesInvalid === true);
    env.api.cont();
    check(`...and sleepPlanContinue() is a no-op while priorities are invalid (index ${badIndex})`, env.screens.length === 0);
  }
  { const env = makePlanEnv({ results: RESULTS, trialFocus: [] }); env.api.render(); env.api.recover();
    check("the recovery action returns to the producer (showProfileScreen) and does NOT wipe, fetch, log, or touch _dataLoadFailed",
      env.profile === 1 && !env.analytics._logged && !/showDataError|_dataLoadFailed|resetSessionState|fetch\(/.test(extractFunction("window.sleepPlanReturnToBrief = function()"))); }

  // Routes + focus shape.
  { const env = makePlanEnv({ results: RESULTS }); env.api.show("results");
    check("showSleepPlan renders THEN shows (the heading is ALREADY populated at the moment showScreen is called)",
      env.screens[0] === "sleepPlanScreen" && env.titleAtShow && env.titleAtShow[0] === "EN:plan.title");
    env.api.back(); check("Back returns to Results", env.screens[1] === "resultsScreen" && env.rendered === 1); }
  { const env = makePlanEnv({ results: null }); env.api.show("results"); check("showSleepPlan is a no-op before Results exist", env.screens.length === 0); }
  { const env = makePlanEnv({ results: RESULTS }); env.api.choose();
    check("'Choose a finalist' routes BACK to Results (never to hf2) and re-renders it", env.screens[0] === "resultsScreen" && env.rendered === 1); }
  { const env = makePlanEnv({ results: RESULTS, lang: "es" }); env.api.render();
    check("ES render resolves every label through the dictionary in ES", env.els.sleepPlanTitle.textContent === "ES:plan.title" && env.els.sleepPlanSystemLabel.textContent === "ES:plan.system_label"); }

  // ---- Layout + theme contract (hotfix 2026-08-23) ------------------------
  // The Plan shipped with NO CSS rule of its own. `.screen.active` is
  // `display: flex` with the flex-ROW default and the dark root tokens, so the
  // deployed Plan rendered as nine side-by-side columns on the dark theme, its
  // Payment Choice headline (hardcoded dark ink) was invisible, and at tablet
  // portrait the financing block and Continue sat outside the viewport. Every
  // static suite was green. These pins make the omission itself a failure:
  // the Plan is a multi-block screen built on the hf2 classes, so it must
  // carry hf2's column override and sit in every hf2 theme group. The
  // rendered proof (three viewports, computed layout, contrast, keyboard
  // reach) lives in tests/sleep_plan_layout_check.py.
  section("Part 2 — layout + theme contract (the Plan shares hf2's column layout and warm theme)");
  {
    const css = (norm.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
    const rules = [];
    const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(css))) {
      const sel = m[1].split("\n").map((x) => x.trim()).filter(Boolean).join(" ").replace(/.*\*\//, "").trim();
      rules.push({ sel: sel.split(",").map((x) => x.trim()), body: m[2] });
    }
    const withSel = (needle) => rules.filter((r) => r.sel.includes(needle));
    check("#sleepPlanScreen.active has the column layout override (flex-direction: column) — the .screen.active default is a ROW",
      withSel("#sleepPlanScreen.active").some((r) => /flex-direction:\s*column/.test(r.body)));
    check("#sleepPlanScreen.active carries the same padding as #hf2Screen.active (one rule, both selectors)",
      rules.some((r) => r.sel.includes("#sleepPlanScreen.active") && r.sel.includes("#hf2Screen.active") && /flex-direction:\s*column/.test(r.body) && /padding:/.test(r.body)));
    check("body:has(#sleepPlanScreen.active) is in the warm work-theme token group (--color-bg …) with the Summary",
      rules.some((r) => r.sel.includes("body:has(#sleepPlanScreen.active)") && r.sel.includes("body:has(#hf2Screen.active)") && /--color-bg:/.test(r.body) && /--color-text:/.test(r.body)));
    check("#sleepPlanScreen.active is in the warm background/ink group with #hf2Screen.active",
      rules.some((r) => r.sel.includes("#sleepPlanScreen.active") && r.sel.includes("#hf2Screen.active") && /background:\s*#F3EEE5/i.test(r.body) && /color:\s*#2F271E/i.test(r.body)));
    // Parity: every hf2-scoped theme rule for a class the Plan's markup uses
    // must name the Plan too — otherwise the next shared class silently
    // renders un-themed on the Plan again.
    const planMarkup = (norm.match(/<div class="screen" id="sleepPlanScreen"[\s\S]*?<div class="screen" id="hf2Screen"/) || [""])[0];
    const shared = ["hf2-review-eyebrow", "hf2-review-section__label", "hf2-review-section", "hf2-review-title", "hf2-review-nav", "hf2-back-btn", "hf2-send-btn", "hf2-pick", "hf2-acc-card"]
      .filter((c) => new RegExp('class="(?:[^"]*\s)?' + c + '(?:\s[^"]*)?"').test(planMarkup));
    check(`the Plan's markup uses hf2 classes (${shared.length} found: ${shared.join(", ")})`, shared.length >= 5);
    const missing = [];
    for (const r of rules) {
      for (const c of shared) {
        const hf2Sel = r.sel.find((x) => x === `#hf2Screen .${c}`);
        if (hf2Sel && !r.sel.includes(`#sleepPlanScreen .${c}`)) missing.push(hf2Sel);
      }
    }
    check("every #hf2Screen-scoped rule for a class the Plan uses also names #sleepPlanScreen (theme parity)",
      shared.length >= 5 && missing.length === 0, missing.join(" | ") || "shared class set empty");
    check("the hf2 eyebrow/section-label ink rule names the Plan (labels read as accent ink, not the dark-theme token)",
      rules.some((r) => r.sel.includes("#sleepPlanScreen .hf2-review-section__label") && /--accent-ink/.test(r.body)));

    // The forward control. hf2 restates its Send button on the store primary
    // through `.hf2-review-finale`, a wrapper the Plan does not have, so the
    // Plan's Continue would fall back to the base .hf2-send-btn pairing —
    // --color-bg on --color-accent — which on the warm theme is below the
    // 4.5:1 floor. The restatement is therefore load-bearing, and both halves
    // are proven numerically rather than by string presence.
    const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lum = (rgb) => { const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const [r, g, b] = rgb; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))]; return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const token = (name) => ((norm.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1] || "");
    const warm = (name) => (((rules.find((r) => r.sel.includes("body:has(#hf2Screen.active)") && /--color-bg:/.test(r.body)) || { body: "" }).body).match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`)) || [])[1] || "";
    const storePrimary = (STORE_CONFIG.colors && STORE_CONFIG.colors.storePrimary) || "";
    const onStorePrimary = token("on-store-primary");
    const sendRule = rules.find((r) => r.sel.includes("#sleepPlanScreen .hf2-send-btn"));
    check("the Plan's Continue (.hf2-send-btn) is restated on the store primary with --on-store-primary ink, like the Summary's Send button",
      !!sendRule && /background:\s*var\(--store-primary\)/.test(sendRule.body) && /color:\s*var\(--on-store-primary\)/.test(sendRule.body));
    check(`...and that pairing clears 4.5:1 on this store's primary (${onStorePrimary} on ${storePrimary} = ${storePrimary && onStorePrimary ? ratio(onStorePrimary, storePrimary).toFixed(2) : "?"}:1)`,
      /^#[0-9A-Fa-f]{6}$/.test(storePrimary) && /^#[0-9A-Fa-f]{6}$/.test(onStorePrimary) && ratio(onStorePrimary, storePrimary) >= 4.5);
    check(`negative control — the base pairing the restatement replaces (--color-bg ${warm("color-bg")} on --color-accent ${warm("color-accent")}) is BELOW 4.5:1 on the warm theme, so the restatement is load-bearing`,
      !!warm("color-bg") && !!warm("color-accent") && ratio(warm("color-bg"), warm("color-accent")) < 4.5);
  }

  // ---- Roster-derived layout rule (the failure class, not just the instance) --
  // `.screen.active` is a flex ROW. A screen with a single wrapper child never
  // notices; a screen with several direct children renders them side by side
  // unless it carries a column override. Every multi-child screen in the roster
  // must therefore have one — derived from SCREEN_NAME_KEYS and the static
  // markup, so the next screen added without its rule fails here, not on a
  // customer's tablet.
  section("Part 2 — every multi-child screen in the roster has a column layout rule");
  {
    const css = (norm.match(/<style>[\s\S]*?<\/style>/) || [""])[0];
    const rules = [];
    const re = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = re.exec(css))) {
      const sel = m[1].split("\n").map((x) => x.trim()).filter(Boolean).join(" ").replace(/.*\*\//, "").trim();
      rules.push({ sel: sel.split(",").map((x) => x.trim()), body: m[2] });
    }
    const ids = [...(((norm.match(/var SCREEN_NAME_KEYS = \{([\s\S]*?)\};/) || ["", ""])[1]).matchAll(/(\w+Screen):/g))].map((x) => x[1]);
    const markup = norm.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<!--[\s\S]*?-->/g, "");
    const VOID = new Set(["br", "input", "img", "hr", "meta", "link", "path", "circle", "polyline", "stop", "rect", "line", "use", "source", "area", "col", "wbr"]);
    // Count direct element children of the root tag carrying id="<id>".
    const directChildren = (id) => {
      const open = markup.match(new RegExp(`<(div|main|section)\\b[^>]*\\sid="${id}"[^>]*>`));
      if (!open) return -1;
      let i = open.index + open[0].length, depth = 0, count = 0;
      const tag = /<\/?([a-zA-Z][\w-]*)[^>]*?(\/?)>/g; tag.lastIndex = i;
      let t;
      while ((t = tag.exec(markup))) {
        const closing = t[0][1] === "/", name = t[1].toLowerCase(), selfClosed = t[2] === "/" || VOID.has(name);
        if (closing) { if (depth === 0) break; depth--; continue; }
        if (depth === 0) count++;
        if (!selfClosed) depth++;
      }
      return count;
    };
    const classesOf = (id) => ((markup.match(new RegExp(`<(?:div|main|section)\\b[^>]*\\sid="${id}"[^>]*>`)) || [""])[0].match(/class="([^"]*)"/) || ["", ""])[1].split(/\s+/).filter(Boolean);
    const hasColumnRule = (id, classes, ruleSet) => ruleSet.some((r) => /flex-direction:\s*column/.test(r.body)
      && (r.sel.includes(`#${id}.active`) || r.sel.includes(`#${id}`) || classes.some((c) => r.sel.includes(`.${c}`))));
    check(`the screen roster was derived from SCREEN_NAME_KEYS (${ids.length} screens)`, ids.length >= 9 && ids.includes("sleepPlanScreen") && ids.includes("hf2Screen"));
    for (const id of ids) {
      const n = directChildren(id);
      const ok = n <= 1 || hasColumnRule(id, classesOf(id), rules);
      check(`${id}: ${n} direct child${n === 1 ? "" : "ren"} — ${n <= 1 ? "single wrapper, row default is harmless" : "column rule present"}`, n >= 0 && ok);
    }
    // Negative control: strip the Plan's selector from the layout rule and the
    // derivation must turn red for the Plan alone.
    const stripped = rules.map((r) => ({ sel: r.sel.filter((x) => x !== "#sleepPlanScreen.active"), body: r.body }));
    check("negative control — without its selector in the column rule the Plan (9 children) is flagged and hf2 is not",
      !hasColumnRule("sleepPlanScreen", [], stripped) && hasColumnRule("hf2Screen", [], stripped) && directChildren("sleepPlanScreen") > 1);
  }

  // Route ledger pins (per call site; the chokepoint body is untouched).
  check("the showSavedPicks() chokepoint body is UNCHANGED (renderHf2(); showScreen('hf2Screen');)",
    /window\.showSavedPicks = function\(\) \{\s*renderHf2\(\);\s*showScreen\('hf2Screen'\);\s*\};/.test(norm));
  check("email 'Back to handoff' still targets showSavedPicks() (never the Plan)", /id="emailConfirmBackHandoff" onclick="window\.showSavedPicks\(\)"/.test(norm));
  check("the floating Selections pill still targets showSavedPicks() (R-5)", /id="savedPicksBtn"\s+onclick="window\.showSavedPicks\(\)"/.test(norm));
  check("the Sleep System review-plan branch and the last-step terminal both route to the Plan", (norm.match(/window\.showSleepPlan\('sleep-system'\)/g) || []).length === 2);
  check("the Results 'Review with customer' CTA routes to the Plan", /id="reviewWithCustomerBtn" onclick="window\.showSleepPlan\('results'\)"/.test(norm));
  check("hf2Screen's spoken name is now distinct from the Plan's", dictEn["screen.handoff"] !== dictEn["screen.sleep_plan"] && dictEs["screen.handoff"] !== dictEs["screen.sleep_plan"]);
  check("the governed recovery strings are exact EN", dictEn["plan.priorities_recovery"] === "We couldn't prepare the trial priorities. Return to the Sleep Brief and try again." && dictEn["plan.priorities_recovery_action"] === "Return to Sleep Brief");
  // ---- Slice 6 C4: the Summary is a compact read model of saved state ------
  section("Slice 6 C4 — read model: saved-only picks, cart-only system, drawer-only reactions");
  {
    const picksSrc = extractFunction("function renderHf2Picks()");
    const pickSrc = extractFunction("function renderHf2Pick(m, tier)");
    const accSrc = extractFunction("function renderHf2Accessories()");
    check("renderHf2Picks renders ONLY saved picks in stored order (no suggestion pool, no favourite-first sort)",
      !!picksSrc && !/suggestionPool|tierData|\.sort\(/.test(picksSrc)
      && /window\._savedPicks/.test(picksSrc));
    check("...the empty state is worded, dictionary-driven", /t\('hf2\.no_saved_picks'\)/.test(picksSrc));
    check("...the hint is the dictionary sentence — no runtime count overwrite, no delivery claim",
      /t\('hf2\.saved_picks_hint'\)/.test(picksSrc) && !/are sent|se env/i.test(picksSrc));
    check("...Compare enables from two saved picks OR a persisted complete pair (C3)",
      /_compareSelected/.test(picksSrc) && /saved\.length < 2/.test(picksSrc));
    // Re-ruled for the North Star candidate (owner rulings 2026-09-01): Loop-A2
    // gates the Summary control on the recorded reaction and C3-A2 (D3) renders
    // the reaction as a chip - existing memory-only data via reactionLabel, no
    // re-derived reason prose. The compactness arms stay.
    check("the pick card is compact: Plan-parity model line, no re-derived reason; reaction reads only as the D3 chip / Loop-A2 gate",
      !!pickSrc && /sleepPlanModelLine/.test(pickSrc)
      && !/buildMattressPriorities|hf2ReasonFor/.test(pickSrc));
    check("renderHf2Accessories is cart-only: no scorer, no suggestion fill, catalog-resolved names",
      !!accSrc && !/scoreAccessoriesFromAnswers|recommendationCount|Still worth trying/.test(accSrc)
      && /window\._accCart/.test(accSrc) && /ACCESSORIES/.test(accSrc));
    check("...with a worded, dictionary-driven empty state and hint",
      /t\('hf2\.no_system_items'\)/.test(accSrc) && /t\('hf2\.system_hint'\)/.test(accSrc));
    check("the Summary no longer claims anything 'is sent' in either language (preview truth; gasUrl is blank)",
      (() => {
        // Extraction REQUIRED: a failed region match must FAIL the check,
        // never fall through to a vacuous pass on a placeholder string.
        const region = (norm.match(/function renderHf2Picks\(\)[\s\S]*?function renderHf2AccBlock/) || [""])[0];
        return region.length > 200
          && !/Only saved picks are sent|Only included pieces are sent|se envían\./.test(region)
          && !/are sent/i.test(dictEn["hf2.saved_picks_hint"]) && !/se env/i.test(dictEs["hf2.saved_picks_hint"]);
      })());
    check("the lead line is in the wipe inventories (app SESSION_TEXT_IDS)",
      /'hf2LeadLine',/.test(norm));
  }

  // ---- Slice 6 C4: the composed lead + payment sentence (executed) ----------
  section("Slice 6 C4 — lead line: finalist state composed with payment state");
  {
    const leadSrc = extractFunction("function renderHf2LeadLine()");
    const finSrc = extractFunction("function resolveFinalistState()");
    const fallbackSrc = extractFunction("function finalistRecommendedFallback()");
    const lineSrc = extractFunction("function sleepPlanModelLine(m)");
    const tierSrc = extractFunction("function sleepPlanTierLabel(tier)");
    check("extractions for the lead-line execution", !!leadSrc && !!finSrc && !!fallbackSrc && !!lineSrc && !!tierSrc);

    const DICT = { en: dictEn, es: dictEs };
    function makeLeadEnv(opts) {
      const els = {};
      const doc = { getElementById: (id) => (els[id] = els[id] || { textContent: "", hidden: false }) };
      const win = throwingWindow({
        _savedPicks: opts.saved || [],
        _favoriteMattressId: opts.fav || ""
      });
      const lang = opts.lang || "en";
      const t = (k, repl) => {
        let v = DICT[lang][k] != null ? DICT[lang][k] : k;
        if (repl) for (const key of Object.keys(repl)) v = v.split("{" + key + "}").join(repl[key]);
        return v;
      };
      const FC = (k) => ({ preferenceNotNow: lang === "es" ? "Ahora no" : "Not right now",
                           preferenceNone: lang === "es" ? "Sin seleccionar" : "Not selected" })[k] || k;
      const src = finSrc + "\n" + fallbackSrc + "\n" + tierSrc + "\n" + lineSrc + "\n" + leadSrc
        + "\nout.run = function() { renderHf2LeadLine(); };";
      const out = {};
      new Function("window", "document", "t", "FC", "financingEnabled", "finPaymentPaths",
        "payPref", "PAY_NOT_NOW", "_resultsState", "currentLang", "out",
        '"use strict";' + src)(
        win, doc, t, FC, () => opts.financing !== false,
        () => (opts.paths || [{ id: "plan-a", label: "Path A" }]),
        "payPref" in opts ? opts.payPref : null, "not_now",
        opts.results === undefined ? null : opts.results, lang, out);
      out.run();
      return els;
    }
    const RESULTS = { tierData: { gold: [{ id: "g1", name: "Cloud Nine", brand: "Restonic" }], silver: [], bronze: [] } };
    // Re-ruled for the North Star candidate C3-A2 (owner ruling 2026-09-01): the
    // lead is a status block - the lead sentence and the payment sentence are
    // separate nodes (hf2LeadLine + hf2StatusPayment); in the CHOSEN state the
    // approved hf2.lead_chosen split renders finalist.chosen as the eyebrow, the
    // product NAME in the serif display node and brand/tier as quiet metadata.
    // The recommended and none sentences are verbatim. Every cell asserts the
    // pair; nothing is dropped.
    const payOf = (e) => e.hf2StatusPayment ? e.hf2StatusPayment.textContent : "";
    // A3.1 synthesis (owner counterprompt 2026-09-02, ruling 5 + change 4): the
    // payment preference is no longer composed into the status block at all -
    // the financing module's preference row is the one payment surface. Every
    // former "pairs with payment" cell now asserts the node is empty and
    // hidden in that state (the lead sentence assertions are unchanged).
    check("synthesis: the lead renderer derives no payment sentence (no hf2.pay_state, no payment-path read)",
      !/hf2\.pay_state|finPaymentPaths\(\)|FC\('preference/.test(leadSrc));
    check("synthesis: the financing module keeps the preference row (handoff + sheet)",
      (norm.match(/FC\('paymentPreferenceLabel'\)/g) || []).length === 2);
    // A3.1 (owner directive 2026-09-01): the brand/tier metadata line leaves
    // the status block (the saved-pick card keeps the tier honesty); the node
    // stays, empty and hidden.
    const _chosenPair = (e) => e.hf2LeadLine.textContent === dictEn["finalist.chosen"]
      && e.hf2StatusName.textContent === "Cloud Nine" && e.hf2StatusName.hidden === false
      && e.hf2StatusMeta.textContent === "" && e.hf2StatusMeta.hidden === true;

    let els = makeLeadEnv({ saved: [{ id: "g1", name: "Cloud Nine", brand: "Restonic", tier: "gold" }], fav: "g1", results: RESULTS, financing: false });
    check("chosen + financing off: the C3-A2 hierarchy alone - eyebrow, serif name, quiet metadata, no payment node",
      _chosenPair(els) && payOf(els) === "" && els.hf2StatusPayment.hidden === true);
    check("...the label renders from the dictionary", els.hf2LeadLabel.textContent === dictEn["hf2.lead_label"]);

    els = makeLeadEnv({ results: RESULTS, payPref: null });
    check("no finalist + engine pick + nothing selected: recommended sentence (verbatim) paired with 'Not selected'",
      els.hf2LeadLine.textContent === "No finalist selected yet — Restonic · Cloud Nine (" + dictEn["results.tier_gold"] + " · " + dictEn["results.match_lead"] + ") is the recommended starting point."
      && payOf(els) === "" && els.hf2StatusPayment.hidden === true
      && els.hf2StatusName.hidden === true && els.hf2StatusName.textContent === "");

    els = makeLeadEnv({ results: RESULTS, payPref: "not_now" });
    check("...Not right now never reaches the status block (synthesis: the module's preference row is the one payment surface)",
      payOf(els) === "" && els.hf2StatusPayment.hidden === true);

    els = makeLeadEnv({ results: RESULTS, payPref: "plan-a" });
    check("...a considered path never reaches the status block either", payOf(els) === "" && els.hf2StatusPayment.hidden === true);

    els = makeLeadEnv({ results: RESULTS, payPref: "gone-path" });
    check("...a stale path id falls back to 'Not selected', never a raw token",
      payOf(els) === "" && !/gone-path/.test(els.hf2LeadLine.textContent + payOf(els)));

    els = makeLeadEnv({ results: null, financing: false });
    check("no finalist and no results: the honest none sentence", els.hf2LeadLine.textContent === dictEn["hf2.lead_none"]);

    els = makeLeadEnv({ lang: "es", results: RESULTS, payPref: null });
    check("ES: the paired sentences resolve fully in Spanish",
      els.hf2LeadLine.textContent.indexOf("Aún no se ha elegido finalista") === 0
      && payOf(els) === "" && els.hf2StatusPayment.hidden === true);

    // C12 (R3 I1): the remaining matrix cells — chosen composes with every
    // payment state, and the none sentence composes too.
    const CHOSEN_CELL = { saved: [{ id: "g1", name: "Cloud Nine", brand: "Restonic", tier: "gold" }], fav: "g1", results: RESULTS };
    els = makeLeadEnv(Object.assign({ payPref: "plan-a" }, CHOSEN_CELL));
    check("chosen x selected path: the C3-A2 hierarchy, no payment text in the block",
      _chosenPair(els) && payOf(els) === "" && els.hf2StatusPayment.hidden === true);
    els = makeLeadEnv(Object.assign({ payPref: "not_now" }, CHOSEN_CELL));
    check("chosen x paused: ...still no payment text",
      _chosenPair(els) && payOf(els) === "" && els.hf2StatusPayment.hidden === true);
    els = makeLeadEnv(Object.assign({ payPref: null }, CHOSEN_CELL));
    check("chosen x unselected: ...still no payment text",
      _chosenPair(els) && payOf(els) === "" && els.hf2StatusPayment.hidden === true);
    els = makeLeadEnv({ results: null, payPref: "plan-a" });
    check("none x selected path: the honest none sentence (verbatim), no payment text",
      els.hf2LeadLine.textContent === dictEn["hf2.lead_none"] && payOf(els) === "" && els.hf2StatusPayment.hidden === true
      && els.hf2StatusName.hidden === true);
    els = makeLeadEnv({ results: null, payPref: "not_now" });
    check("none x paused: ...no payment text",
      els.hf2LeadLine.textContent === dictEn["hf2.lead_none"] && payOf(els) === "" && els.hf2StatusPayment.hidden === true);
    // C3-A2 route: an incomplete consultation is routed back to the trial, never
    // shown as complete; the chosen state offers no route.
    els = makeLeadEnv({ results: null, payPref: "not_now" });
    check("C3-A2: the none state offers the return-to-trial route",
      els.hf2StatusRoute && els.hf2StatusRoute.hidden === false && /hf2RouteTrial/.test(els.hf2StatusRoute.innerHTML || ""));
    els = makeLeadEnv(Object.assign({ payPref: null }, CHOSEN_CELL));
    check("C3-A2: the chosen state offers no route",
      els.hf2StatusRoute && els.hf2StatusRoute.hidden === true);

    check("renderAllFinancingSurfaces refreshes the lead line (typeof-guarded — a payment tap cannot leave it stale)",
      /if \(typeof renderHf2LeadLine === 'function'\) renderHf2LeadLine\(\);/.test(
        (norm.match(/function renderAllFinancingSurfaces\(\)[\s\S]*?\n    \}/) || [""])[0]));
  }

  // ---- Slice 6 C8: RSA picker accessibility ---------------------------------
  section("Slice 6 C8 — RSA picker: real buttons, disclosure semantics, no native dialog");
  {
    check("roster items are real buttons with aria-current and the Invariant-10 touch pair",
      /itemBtn\.type = 'button';/.test(norm)
      && /itemBtn\.setAttribute\('aria-current', isCurrent \? 'true' : 'false'\);/.test(norm)
      && /itemBtn\.ontouchend = function\(event\) \{ event\.preventDefault\(\); selectHf2Rsa\(rsaName\); \};/.test(norm)
      && !/li\.onclick/.test(norm));
    check("the strip button declares the disclosure (aria-expanded + aria-controls) and every toggle branch derives it from the panel",
      /id="hf2RsaStripBtn" type="button"\s*\r?\n\s*aria-expanded="false" aria-controls="hf2RsaPanel"/.test(norm)
      && /strip\.setAttribute\('aria-expanded', panel\.hasAttribute\('hidden'\) \? 'false' : 'true'\);/.test(norm));
    check("window.prompt is gone from executable code (comments may explain why)",
      (norm.split("\n").filter((l) => l.includes("window.prompt") && !/^\s*(\/\/|<!--|\*)/.test(l)).length) === 0);
    check("the inline add row is NOT a form, its input clears with the contact wipe, and its layers reset",
      !/<form[^>]*hf2Rsa/.test(norm)
      && /'emailNameInput', 'emailInput', 'emailPhoneInput', 'hf2RsaAddInput'/.test(norm)
      && /\{ id: 'hf2RsaAddRow', hiddenAttr: true \},/.test(norm)
      && /\{ id: 'hf2RsaStripBtn', attrs: \{ 'aria-expanded': 'false' \} \},/.test(norm));
    check("the byte-pinned hf2RsaPanel layer entry is untouched",
      /\{ id: 'hf2RsaPanel', hiddenAttr: true \},/.test(norm));
    check("Escape closes the open panel and focus returns to the strip",
      /if \(event\.key !== 'Escape'\) return;/.test(norm)
      && /window\.toggleHf2RsaPanel\('close'\);\s*\r?\n\s*var strip = document\.getElementById\('hf2RsaStripBtn'\);\s*\r?\n\s*if \(strip && typeof strip\.focus === 'function'\) strip\.focus\(\);/.test(norm));
    check("no NEW localStorage reference: the raw count stays at six (five executable device-roster lines + one comment; trust_integrity owns the executable-line pin)",
      (norm.match(/localStorage/g) || []).length === 6);
  }

  // ---- Compare-control label honesty (item 1.6's outstanding exit clause) ---
  // The Summary's compare control is enabled by TWO different conditions, and
  // one of them can open a pair the customer never saved. The label must be
  // accurate in every state the enable rule admits, with no conditional
  // wording. Executed against the shipped source and the real dictionaries.
  section("Compare control: an honest label in every enabled state");
  {
    const LABEL = { en: "Compare mattresses", es: "Comparar colchones" };
    const RETIRED = { en: "Compare saved picks", es: "Comparar selecciones guardadas" };
    const DICTS = { en: dictEn, es: dictEs };

    // The two shipped blocks, extracted verbatim: the label writer inside
    // renderHf2() and the enable rule inside renderHf2Picks().
    const labelBlock = (norm.match(/ {6}var compareBtn = document\.getElementById\('hf2CompareBtn'\);\r?\n {6}if \(compareBtn\) compareBtn\.textContent = t\('hf2\.compare_saved'\);/) || [""])[0];
    const picksSrc = extractFunction("function renderHf2Picks()");
    check("extractions: the label writer and renderHf2Picks",
      labelBlock.length > 80 && !!picksSrc && picksSrc.includes("compareBtn.disabled"));

    // One environment renders BOTH: the label writer, then the real
    // renderHf2Picks, so the visible label and the disabled flag come from
    // the same shipped code paths the app runs.
    const render = (lang, saved, pair) => {
      const els = {};
      const doc = {
        getElementById: (id) => (els[id] = els[id] || { textContent: "", hidden: false, disabled: false, innerHTML: "", appendChild() {} }),
      };
      const win = throwingWindow({
        _savedPicks: saved,
        _compareSelected: pair,
        _drawerData: {},
      });
      const t = (k) => (DICTS[lang][k] != null ? DICTS[lang][k] : k);
      new Function("window", "document", "t", "renderHf2Pick",
        '"use strict";' + labelBlock + "\n" + picksSrc + "\nrenderHf2Picks();")(
        win, doc, t, () => ({}));
      return els.hf2CompareBtn;
    };

    const TWO_SAVED = [{ id: "g1" }, { id: "g2" }];
    const ONE_SAVED = [{ id: "g1" }];
    const PAIR = ["g7", "s3"];

    for (const lang of ["en", "es"]) {
      const want = LABEL[lang];
      // State 1: two saved picks, no persisted pair.
      let btn = render(lang, TWO_SAVED, []);
      check(`[${lang}] two saved picks, no pair: the control reads "${want}" and is enabled`,
        btn.textContent === want && btn.disabled === false, btn.textContent);
      // State 2: two saved picks AND a persisted pair.
      btn = render(lang, TWO_SAVED, PAIR);
      check(`[${lang}] two saved picks with a persisted pair: same label, enabled`,
        btn.textContent === want && btn.disabled === false, btn.textContent);
      // State 3: the honesty case — a complete pair persisted from UNSAVED
      // Results cards, with zero or one saved pick.
      btn = render(lang, [], PAIR);
      check(`[${lang}] ZERO saved picks with a persisted unsaved pair: the label does not claim "saved picks"`,
        btn.textContent === want && btn.disabled === false, btn.textContent);
      btn = render(lang, ONE_SAVED, PAIR);
      check(`[${lang}] ONE saved pick with a persisted unsaved pair: same honest label, enabled`,
        btn.textContent === want && btn.disabled === false, btn.textContent);
      // The disabled posture is UNCHANGED where it was disabled before.
      btn = render(lang, [], []);
      check(`[${lang}] no saved picks and no pair: still disabled (enable rule unchanged)`,
        btn.disabled === true && btn.textContent === want);
      btn = render(lang, ONE_SAVED, []);
      check(`[${lang}] one saved pick and no pair: still disabled (enable rule unchanged)`,
        btn.disabled === true && btn.textContent === want);
      // An incomplete persisted selection does not enable the control.
      btn = render(lang, [], ["g7"]);
      check(`[${lang}] a one-item persisted selection does not enable the control`,
        btn.disabled === true);
      // The retired wording is gone from the rendered control.
      btn = render(lang, TWO_SAVED, []);
      check(`[${lang}] the retired wording never renders on the control`,
        btn.textContent.indexOf(RETIRED[lang]) === -1);
    }

    // The dictionary values themselves, and the pre-render static markup.
    check("both dictionaries carry the honest label and neither retains the retired wording",
      dictEn["hf2.compare_saved"] === LABEL.en && dictEs["hf2.compare_saved"] === LABEL.es
      && dictEn["hf2.compare_saved"] !== RETIRED.en && dictEs["hf2.compare_saved"] !== RETIRED.es);
    check("the static pre-render markup carries the honest label too (nothing flashes the retired wording)",
      /id="hf2CompareBtn"[\s\S]{0,220}>Compare mattresses<\/button>/.test(norm)
      && norm.indexOf(">Compare saved picks</button>") === -1);
    check("the retired customer strings are absent from the whole app source",
      norm.indexOf("Compare saved picks") === -1 && norm.indexOf("Comparar selecciones guardadas") === -1);

    // Nothing else moves: the enable rule, the key, and the action are pinned
    // byte-for-byte.
    check("the enable rule is byte-unchanged (two saved picks OR a complete persisted pair)",
      norm.includes("if (compareBtn) compareBtn.disabled = saved.length < 2\n        && !(Array.isArray(window._compareSelected) && window._compareSelected.length === 2);"));
    check("the dictionary key is unchanged (values changed, no rename)",
      /"hf2\.compare_saved":/.test(readFileSync(join(root, "data", "dict-en.json"), "utf8"))
      && /"hf2\.compare_saved":/.test(readFileSync(join(root, "data", "dict-es.json"), "utf8"))
      && /compareBtn\.textContent = t\('hf2\.compare_saved'\);/.test(norm));
    check("the control's route/action is unchanged (both handlers still call compareReviewFinalists)",
      /id="hf2CompareBtn"[\s\S]{0,200}onclick="window\.compareReviewFinalists\(\)"[\s\S]{0,200}ontouchend="event\.preventDefault\(\);window\.compareReviewFinalists\(\);"/.test(norm));
  }

  // ---- Slice 6 C12: the payload lead assembly, executed ---------------------
  section("Slice 6 C12 — payload lead/matchesSource assembly (executed)");
  {
    const finSrc = extractFunction("function resolveFinalistState()");
    const fallbackSrc = extractFunction("function finalistRecommendedFallback()");
    const lineSrc = extractFunction("function sleepPlanModelLine(m)");
    const tierSrc = extractFunction("function sleepPlanTierLabel(tier)");
    // The lead-assembly block inside sendResults, extracted verbatim — the
    // anchor line is unique in the file.
    const leadBlock = (norm.match(/const _finalist = resolveFinalistState\(\);[\s\S]*?const lead = \{[\s\S]*?\r?\n      \};/) || [""])[0];
    const srcMS = (norm.match(/const matchesSource = saved\.length > 0 \? 'saved' : 'recommended';/) || [""])[0];
    check("extractions: the lead assembly and the provenance line", leadBlock.length > 200 && srcMS.length > 10);
    const runLead = (savedArr, fav, results) => {
      const win = throwingWindow({ _savedPicks: savedArr, _favoriteMattressId: fav });
      const t = (k) => k;
      return new Function("window", "_resultsState", "t", "currentLang", "toAbsoluteImageUrl", "saved",
        '"use strict";' + finSrc + "\n" + fallbackSrc + "\n" + tierSrc + "\n" + lineSrc + "\n"
        + srcMS + "\n" + leadBlock + "\nreturn { lead: lead, matchesSource: matchesSource };")(
        win, results, t, "en", (u) => u || "", savedArr);
    };
    const RESULTS2 = { tierData: { gold: [{ id: "g1", name: "Cloud Nine", brand: "Restonic", subBrand: "Core", imageUrl: "" }], silver: [], bronze: [] } };
    let out = runLead([{ id: "g1", name: "Cloud Nine", brand: "Restonic · Core", subBrand: "Core", tier: "gold" }], "g1", RESULTS2);
    check("chosen: the favourite saved pick is the lead; provenance 'saved'",
      out.lead.kind === "chosen" && out.lead.name === "Cloud Nine" && out.matchesSource === "saved");
    check("...the saved record's pre-joined display brand is NOT double-joined",
      out.lead.brand === "Restonic · Core");
    out = runLead([], "", RESULTS2);
    check("no saved picks: the engine top pick is the lead, HONESTLY kind 'recommended', provenance 'recommended'",
      out.lead.kind === "recommended" && out.lead.name === "Cloud Nine" && out.matchesSource === "recommended");
    check("...the raw engine brand joins its subBrand exactly as the list rows do",
      out.lead.brand === "Restonic · Core");
    out = runLead([], "", null);
    check("no results at all: the lead fails closed to kind 'none' with every field blank",
      out.lead.kind === "none" && out.lead.name === "" && out.lead.brand === ""
      && out.lead.line === "" && out.lead.imageUrl === "");
    out = runLead([{ id: "s9", name: "Other", brand: "OtherBrand", tier: "silver" }], "", RESULTS2);
    check("saved WITHOUT a favourite: provenance 'saved', but the lead stays the honest recommendation — never a promoted saved[0]",
      out.matchesSource === "saved" && out.lead.kind === "recommended" && out.lead.name === "Cloud Nine");
  }

  // ---- Slice 6 C12: RSA focus restore + packet rows + mode verbs ------------
  section("Slice 6 C12 — RSA focus restore, packet rows, mode-aware verbs");
  {
    const rsaSel = extractFunction("function selectHf2Rsa(name)");
    check("roster-select and successful-add close the panel AND restore focus to the strip (the Escape pattern)",
      !!rsaSel && /toggleHf2RsaPanel\('close'\);/.test(rsaSel)
      && /getElementById\('hf2RsaStripBtn'\)/.test(rsaSel)
      && /strip\.focus\(\)/.test(rsaSel));
    check("the email packet row labels the list Saved mattress picks / Recommended matches — never finalists",
      /\? \(_esE \? 'Selecciones de colchón guardadas' : 'Saved mattress picks'\)/.test(norm)
      && /: \(_esE \? 'Colchones recomendados' : 'Recommended matches'\)/.test(norm));
    check("the in-flight verb is mode-aware (Saving… while delivery is not live)",
      /sendBtn\.textContent = emailDeliveryLive\(\)\s*\r?\n\s*\? \(currentLang === 'es' \? 'Enviando\.\.\.' : 'Sending\.\.\.'\)\s*\r?\n\s*: \(currentLang === 'es' \? 'Guardando\.\.\.' : 'Saving\.\.\.'\);/.test(norm));
    check("the Summary send verbs are mode-aware (Save picks / Save Pass & Picks in preview)",
      /var live = emailDeliveryLive\(\);/.test(norm)
      && /'Guardar Pase y Selecciones' : 'Save Pass & Picks'/.test(norm)
      && /'Guardar selecciones' : 'Save picks'/.test(norm));
    check("C13 (external review): the reveal handler never writes the send verb itself — the ONE mode-aware renderer owns it",
      (() => {
        const reveal = extractFunction("function renderHf2DiscountButton()");
        return !!reveal && reveal.length > 200
          && !/hf2SendBtn/.test(reveal)
          && /renderHf2SendButton\(\);/.test(reveal);
      })());
  }

  // ---- Slice 6 C6: Welcome — tease removed, estimate removed, keys retired --
  section("Slice 6 C6 — Welcome removals");
  {
    const INCOMING_FIN = JSON.parse(readFileSync(join(root, "incoming", "lacks_financing.json"), "utf8"));
    const CFG_FIN_COPY = (STORE_CONFIG.financing && STORE_CONFIG.financing.copy) || {};
    check("the Payment Choice tease branch is gone from the Welcome renderer (no financingEnabled tease, no tease FC reads)",
      !/FC\('welcomeTagline'\)|FC\('welcomeSupport'\)/.test(norm)
      && !/financingEnabled\(\)\) \{\s*\r?\n\s*if \(teaseRow\) teaseRow\.hidden = false;/.test(norm));
    check("...the Savings-Pass tease branch (template capability) survives, dormant",
      /savingsPassEnabled\(\)\) \{\s*\r?\n\s*if \(teaseRow\) teaseRow\.hidden = false;/.test(norm));
    check("the tease copy keys are retired from the canonical envelope AND the generated config",
      !("welcomeTagline" in (INCOMING_FIN.copy || {})) && !("welcomeSupport" in (INCOMING_FIN.copy || {}))
      && !("welcomeTagline" in CFG_FIN_COPY) && !("welcomeSupport" in CFG_FIN_COPY)
      && Object.keys(CFG_FIN_COPY).length > 10);
    check("the completion-time estimate is gone: no element, no renderer write, no static literal",
      !/id="landingTimeEstimate"/.test(norm) && !/setText\('landingTimeEstimate'/.test(norm) && !/≈ 4 minutes/.test(norm));
    check("the outcome row keeps the one quiet Payment Choice reference (config voice.outcomeItems)",
      /landingOutcomeItems/.test(norm) && /Payment Choices/.test(JSON.stringify(STORE_CONFIG.voice || {})));
    check("the rendered heritage (the Welcome eyebrow) is untouched",
      /setText\('landingEyebrow', voice\.eyebrow\)/.test(norm) && /setText\('landingHeritage', textBlock\.heritage\)/.test(norm));
  }

  // ---- Slice 6 C2: retitle, honest CTA, attribution, secondary Plan route --
  section("Slice 6 C2 — Summary identity and routes");
  check("the Results CTA names its destination: 'Review Sleep Plan' in both languages (runtime writer)",
    /reviewWithCustomerBtn'\)\.textContent = es \? 'Revisar Plan de Sueño →' : 'Review Sleep Plan →';/.test(norm));
  check("...and the static fallback label matches", /window\.showSleepPlan\('results'\);">Review Sleep Plan →<\/button>/.test(norm));
  // A3.1: the directive's title for the shared close.
  check("the Summary's visible title is 'Consultation summary' / 'Resumen de la consulta' (no longer the Plan's name)",
    /hf2ReviewTitle: es \? 'Resumen de la consulta' : 'Consultation summary',/.test(norm)
    && /id="hf2ReviewTitle">Consultation summary<\/h1>/.test(norm)
    && !/Review Your Sleep Plan/.test(norm));
  check("the Summary's back control uses the SAME dictionary pair as the Plan's (plan.back_to_matches) — no inline fork",
    /backBtn\.textContent = t\('plan\.back_to_matches'\);/.test(norm)
    && !/'← Volver a colchones' : '← Back to matches'/.test(norm));
  check("the secondary 'Review Sleep Plan' action exists with the Invariant-10 pair and the 'summary' origin",
    /id="hf2ReviewPlanBtn" type="button"\s*\r?\n\s*onclick="window\.showSleepPlan\('summary'\)"\s*\r?\n\s*ontouchend="event\.preventDefault\(\);window\.showSleepPlan\('summary'\);"/.test(norm)
    && (norm.match(/window\.showSleepPlan\('summary'\)/g) || []).length === 2);
  check("...its label comes from the dictionary and it hides while Results state is absent",
    /planBtn\.textContent = t\('hf2\.review_plan'\);/.test(norm) && /planBtn\.hidden = !_resultsState;/.test(norm)
    && typeof dictEn["hf2.review_plan"] === "string" && typeof dictEs["hf2.review_plan"] === "string"
    && dictEn["hf2.review_plan"] !== dictEs["hf2.review_plan"]);
  check("the attribution line is config-derived only (storeName + voice.retailerSubline) and hides when blank",
    /var attribution = document\.getElementById\('hf2Attribution'\);/.test(norm)
    && /storeName\(\) \? \(attrSub \? storeName\(\) \+ ' · ' \+ attrSub : storeName\(\)\) : '';/.test(norm)
    && /attribution\.hidden = !attrText;/.test(norm)
    && /id="hf2Attribution" hidden><\/div>/.test(norm));

  check("the Plan's generated containers are in the content/text wipe inventories",
    ["sleepPlanFinalist", "sleepPlanPriorities", "sleepPlanCompared", "sleepPlanSystem", "sleepPlanFinancingInterest"].every((id) => new RegExp(`'${id}'`).test((norm.match(/var SESSION_CONTENT_IDS = \[[\s\S]*?\];/) || [""])[0]))
    && /'sleepPlanFinancingStatus', 'sleepPlanPrioritiesRecoveryText'/.test(norm));
}

console.log(`\nSleep Plan check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
