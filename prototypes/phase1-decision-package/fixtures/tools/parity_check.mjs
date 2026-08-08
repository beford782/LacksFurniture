// Fixture parity check — proves the frozen fixture JSONs still equal a fresh
// execution of the real engine/renderers at the current worktree commit.
//
// Run: node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs
// Exit 0 = every scenario byte-identical; exit 1 otherwise.
//
// This is NOT production acceptance, and it does NOT test the prototypes.
// It proves exactly one thing: the frozen fixture JSONs equal a fresh
// execution of the real engine/renderers, and match the sha256 table in
// PROVENANCE.md. NOT COVERED by this script (verified instead by
// browser-executed checks and the Wave 4 adversarial review, recorded in
// docs/phase1-prototype-decision-package.md §8): whether any PROTOTYPE
// renders the fixture faithfully — a variant could re-order, filter or pad
// output and this script would stay green. Capture and check also share the
// extraction layer (capture_lib), so a shared parser drift is guarded by
// the capture floor (which aborts on empty parses), not by this diff.

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { root, SCENARIOS, captureScenario } from "./capture_lib.mjs";

// PARITY_FIXTURES_DIR override lets the negative runner point this script
// at an isolated mutated copy of the fixtures without touching the
// worktree. Engine sources are always read from the real root (the
// byte-identity guard still applies).
const fixturesDir = process.env.PARITY_FIXTURES_DIR
  || join(root, "prototypes", "phase1-decision-package", "fixtures");

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

// Points at the first differing path, so a red run says where, not just that.
// Arrays and objects are DISTINCT: an array never equals a numeric-key
// object, even with identical entries (correction pass — the earlier
// key-union walk treated [1,2] and {0:1,1:2} as equal).
function firstDiff(a, b, path = "$") {
  if (typeof a !== typeof b) return `${path} (type ${typeof a} vs ${typeof b})`;
  if (Array.isArray(a) !== Array.isArray(b)) {
    return `${path} (${Array.isArray(a) ? "array" : "object"} vs ${Array.isArray(b) ? "array" : "object"})`;
  }
  if (a === null || b === null || typeof a !== "object") {
    return Object.is(a, b) ? null : `${path} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`;
  }
  if (Array.isArray(a) && a.length !== b.length) {
    return `${path} (array length ${a.length} vs ${b.length})`;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDiff(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

// PROVENANCE gate: every hashed file must match the sha256 in its EXACT
// named table row — `| <file> | \`<sha>\` |` — so a hash appearing anywhere
// else in the document cannot satisfy the check (correction pass — the
// earlier whole-file includes() accepted a hash in any position), and a
// regeneration cannot silently re-bless changed output: changing a fixture
// requires changing the reviewed provenance row in the same diff.
const provenance = readFileSync(join(fixturesDir, "PROVENANCE.md"), "utf8");
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function rowBound(file, sha) {
  return new RegExp(`^\\| ${escapeRe(file)} \\| \`${sha}\` \\|\\s*$`, "m").test(provenance);
}
for (const name of Object.keys(SCENARIOS)) {
  const file = `scenario-${name}.json`;
  const sha = createHash("sha256")
    .update(readFileSync(join(fixturesDir, file), "utf8").split("\r\n").join("\n"))
    .digest("hex");
  check(`${file} sha256 matches its exact PROVENANCE.md table row`, rowBound(file, sha),
    `computed ${sha.slice(0, 16)}… has no matching | ${file} | row`);
  // Exactly one table row per fixture file — a duplicated row (one right,
  // one wrong) must not pass.
  const rowCount = (provenance.match(new RegExp(`^\\| ${escapeRe(file)} \\| `, "gm")) || []).length;
  check(`${file} has exactly one PROVENANCE table row`, rowCount === 1, `found ${rowCount}`);
}
// Input files the capture reads are row-bound too: PROVENANCE drift against
// the actual inputs is a failure even though the byte-identity guard already
// pins them to origin/main.
for (const rel of ["index.html", "data/mattresses.json", "data/quiz.json"]) {
  const sha = createHash("sha256")
    .update(readFileSync(join(root, ...rel.split("/")), "utf8").split("\r\n").join("\n"))
    .digest("hex");
  check(`${rel} sha256 matches its exact PROVENANCE.md input row`, rowBound(rel, sha),
    `computed ${sha.slice(0, 16)}… has no matching | ${rel} | row`);
}

for (const name of Object.keys(SCENARIOS)) {
  console.log(`\n-- scenario-${name} --`);
  let frozen;
  try {
    frozen = JSON.parse(readFileSync(join(fixturesDir, `scenario-${name}.json`), "utf8"));
  } catch (e) {
    check(`frozen fixture readable`, false, String(e.message));
    continue;
  }
  const fresh = captureScenario(name);

  // Floors on the FROZEN side too — a frozen fixture that parses empty must
  // never pass, whatever the fresh capture does. Correction pass: floors
  // now cover EVERY prototype-consumed surface, not just priorities+gold.
  check(`frozen priority count is >= 1 (${frozen.profile.en.priorityCount})`,
    frozen.profile.en.priorityCount >= 1 && frozen.profile.es.priorityCount >= 1);
  for (const tier of ["gold", "silver", "bronze"]) {
    check(`frozen ${tier} tier is non-empty (${frozen.results.tierData[tier].length})`,
      frozen.results.tierData[tier].length >= 1);
  }
  for (const lang of ["en", "es"]) {
    const p = frozen.profile[lang];
    check(`[${lang}] metaStrip has 3 labelled entries`,
      Array.isArray(p.metaStrip) && p.metaStrip.length === 3 &&
      p.metaStrip.every((e) => e.label && e.value));
    check(`[${lang}] resultsTrialFocus captured non-empty`,
      typeof p.resultsTrialFocus === "string" && p.resultsTrialFocus.length > 0);
    check(`[${lang}] every priority row carries title/desc/tag/test`,
      p.priorityRows.every((r) => r.title && r.desc && r.tag && r.test));
    let cardPrioOk = true;
    for (const tier of ["gold", "silver", "bronze"]) {
      for (const m of frozen.results.tierData[tier]) {
        const rows = (frozen.results.cardPriorities[lang] || {})[m.id];
        if (!Array.isArray(rows) || rows.length < 1 ||
            !rows.every((r) => r.title && r.tag)) cardPrioOk = false;
      }
    }
    check(`[${lang}] cardPriorities present (>=1 titled row) for every tier entry`, cardPrioOk);
  }
  let entryOk = true;
  for (const tier of ["gold", "silver", "bronze"]) {
    for (const m of frozen.results.tierData[tier]) {
      if (typeof m.firmness !== "number" ||
          !m.firmnessFeelWord || !m.firmnessFeelWord.en || !m.firmnessFeelWord.es ||
          typeof m.meetsMatchThreshold !== "boolean" ||
          !Array.isArray(m.differentiators) || m.differentiators.length < 1 ||
          !m.topPickReason) entryOk = false;
    }
  }
  check(`every tier entry carries firmness/feelWord(en+es)/threshold/differentiators/topPickReason`, entryOk);
  check(`compareDemo pair resolves to 2 distinct saved entries`,
    Array.isArray(frozen.compareDemo.autoPair) && frozen.compareDemo.autoPair.length === 2 &&
    new Set(frozen.compareDemo.autoPair).size === 2 &&
    frozen.compareDemo.autoPair.every((id) =>
      frozen.compareDemo.savedOrder.some((s) => s.id === id)));
  check(`priceTierSymbols carries all three tiers`,
    ["gold", "silver", "bronze"].every((t) =>
      typeof (frozen.results.priceTierSymbols || {})[t] === "string" &&
      frozen.results.priceTierSymbols[t].length > 0));

  // Whole-object parity (the load-bearing assertion).
  const diff = firstDiff(frozen, fresh);
  check(`frozen fixture equals fresh engine execution`, diff === null, diff || undefined);

  // Named spot checks so a red run reads meaningfully in CI output.
  check(`priority count preserved (${frozen.profile.en.priorityCount})`,
    frozen.profile.en.priorityCount === fresh.profile.en.priorityCount);
  check(`priority order preserved: ${frozen.profile.en.priorityRows.map((r) => r.title).join(" > ")}`,
    JSON.stringify(frozen.profile.en.priorityRows.map((r) => r.title)) ===
    JSON.stringify(fresh.profile.en.priorityRows.map((r) => r.title)));
  check(`firmness value exact (${frozen.firmness.value})`,
    frozen.firmness.value === fresh.firmness.value);
  for (const tier of ["gold", "silver", "bronze"]) {
    check(`${tier} membership+order preserved (${frozen.results.tierData[tier].map((m) => m.id).join(",") || "empty"})`,
      JSON.stringify(frozen.results.tierData[tier].map((m) => m.id)) ===
      JSON.stringify(fresh.results.tierData[tier].map((m) => m.id)));
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
