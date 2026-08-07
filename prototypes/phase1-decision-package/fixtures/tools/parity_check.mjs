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

// PROVENANCE gate: every frozen fixture file must match the sha256 recorded
// in PROVENANCE.md, so a regeneration cannot silently re-bless changed
// output — changing a fixture now requires changing the reviewed provenance
// table in the same diff.
const provenance = readFileSync(join(fixturesDir, "PROVENANCE.md"), "utf8");
for (const name of Object.keys(SCENARIOS)) {
  const file = `scenario-${name}.json`;
  const sha = createHash("sha256")
    .update(readFileSync(join(fixturesDir, file), "utf8").split("\r\n").join("\n"))
    .digest("hex");
  check(`${file} sha256 matches the PROVENANCE.md table`, provenance.includes(sha),
    `computed ${sha.slice(0, 16)}… not found in PROVENANCE.md`);
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
  // never pass, whatever the fresh capture does.
  check(`frozen priority count is >= 1 (${frozen.profile.en.priorityCount})`,
    frozen.profile.en.priorityCount >= 1 && frozen.profile.es.priorityCount >= 1);
  check(`frozen gold tier is non-empty (${frozen.results.tierData.gold.length})`,
    frozen.results.tierData.gold.length >= 1);

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
