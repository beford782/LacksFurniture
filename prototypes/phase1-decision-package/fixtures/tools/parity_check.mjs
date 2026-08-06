// Fixture parity check — proves the frozen fixture JSONs still equal a fresh
// execution of the real engine/renderers at the current worktree commit.
//
// Run: node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs
// Exit 0 = every scenario byte-identical; exit 1 otherwise.
//
// This is NOT production acceptance. It proves exactly one thing: the
// prototype package's fixtures preserve captured engine output (priority
// order and count, firmness value, tier membership and within-tier order,
// rendered Sleep Brief DOM) with no re-ranking, filtering, padding,
// rescaling or synthesis. It intentionally re-runs the full capture rather
// than spot-checking fields, so any drift — engine, renderer, catalog, quiz
// or fixture edit — turns it red.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { root, SCENARIOS, captureScenario } from "./capture_lib.mjs";

const fixturesDir = join(root, "prototypes", "phase1-decision-package", "fixtures");

let passed = 0, failed = 0;
function check(label, cond, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

// Points at the first differing path, so a red run says where, not just that.
function firstDiff(a, b, path = "$") {
  if (typeof a !== typeof b) return `${path} (type ${typeof a} vs ${typeof b})`;
  if (a === null || b === null || typeof a !== "object") {
    return Object.is(a, b) ? null : `${path} (${JSON.stringify(a)} vs ${JSON.stringify(b)})`;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = firstDiff(a[k], b[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
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
