// Writes the frozen presentation fixtures for the Phase 1 decision-package
// prototypes by executing the real engine/renderers at the worktree commit.
//
// Run from anywhere:  node prototypes/phase1-decision-package/fixtures/tools/capture_fixtures.mjs
//
// Outputs (all under prototypes/phase1-decision-package/fixtures/):
//   scenario-dense-c.json, scenario-dense-a.json, scenario-sparse-b.json
//   PROVENANCE.md  (commit, input hashes, fixture hashes, method, date)
//
// Timestamps live only in PROVENANCE.md so the fixture JSONs stay
// byte-reproducible for parity_check.mjs.

import { writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { root, SCENARIOS, captureScenario, lfSha256 } from "./capture_lib.mjs";

const fixturesDir = join(root, "prototypes", "phase1-decision-package", "fixtures");
const commit = execSync("git rev-parse HEAD", { cwd: root }).toString().trim();

const written = [];
for (const name of Object.keys(SCENARIOS)) {
  const fixture = captureScenario(name);
  const path = join(fixturesDir, `scenario-${name}.json`);
  writeFileSync(path, JSON.stringify(fixture, null, 1) + "\n");
  const sha = createHash("sha256")
    .update(readFileSync(path, "utf8").split("\r\n").join("\n"))
    .digest("hex");
  written.push({ name, file: `scenario-${name}.json`, sha });
  console.log(`[ok] scenario-${name}.json  priorities=${fixture.profile.en.priorityCount}  ` +
    `firmness=${fixture.firmness.value}  gold=${fixture.results.tierData.gold.length}` +
    `/silver=${fixture.results.tierData.silver.length}/bronze=${fixture.results.tierData.bronze.length}  sha256=${sha.slice(0, 12)}…`);
}

const provenance = `# Frozen fixture provenance — Phase 1 decision-package prototypes

**Source commit:** \`${commit}\` (= origin/main at capture time; PR #17 merge)
**Captured:** ${new Date().toISOString()}
**Capture command:** \`node prototypes/phase1-decision-package/fixtures/tools/capture_fixtures.mjs\`

## Method

Extract-and-execute, copied from the shipped suites (no scoring or ordering
logic reimplemented anywhere):

- \`showProfileScreen()\` + \`renderResultsTrialFocus()\` extracted from
  \`index.html\` by the same regexes as \`tests/consultation_priorities_check.mjs\`
  and executed against its recording DOM shim, per answer set, per language.
- \`calculateScores()\` + \`qualifyRankedChoices()\` + \`window.showResults\`
  extracted likewise (patterns from \`tests/scoring_isolation_check.mjs\`) and
  executed against \`data/mattresses.json\` + \`data/quiz.json\`; the fixture
  records the verbatim \`_resultsState.tierData\` projection (membership,
  within-tier order, qualification, cap, back-fill, pct, meetsMatchThreshold)
  and \`analytics.topPick\`.
- \`firmnessFeel()\`, \`getFirmnessLabel()\`, \`priceTierSymbol()\` extracted and
  executed for the scenario firmness value in both languages.
- EN/ES engine parity is asserted at capture time (capture aborts on
  divergence).

## Answer-set provenance

- \`dense-a\`, \`sparse-b\`: verbatim \`ANSWER_SETS\` entries from
  \`tests/scoring_isolation_check.mjs\`.
- \`dense-c\`: that suite's "plus body, plush, reflux" set; its
  profile-relevant answers match \`tests/consultation_priorities_check.mjs\`
  fixture C (3 priorities including a 90/90 stable-sort tie) except
  \`mattress_size\` (full vs queen), which does not feed the priority engine.

## Deliberate exclusions

- \`reasons\` / \`reasons_es\` are NOT carried into the tier fixtures: every
  per-feature reason column is empty across all 26 models and nothing renders
  any catalog reason today. Excluding them prevents a prototype from
  presenting generic defaults as customer-specific copy (the gated 1.3
  output).
- \`score\` and \`pct\` ARE carried, for provenance and parity checking only.
  No screen renders a match percentage or score today and no prototype may.
- Fixture JSONs carry no timestamps; capture date lives only in this file so
  the JSONs stay byte-reproducible.

## Input hashes (sha256 over LF-normalized text)

| file | sha256 |
|---|---|
| index.html | \`${lfSha256(join(root, "index.html"))}\` |
| data/mattresses.json | \`${lfSha256(join(root, "data", "mattresses.json"))}\` |
| data/quiz.json | \`${lfSha256(join(root, "data", "quiz.json"))}\` |

## Fixture hashes (sha256 over LF-normalized text)

| file | sha256 |
|---|---|
${written.map((w) => `| ${w.file} | \`${w.sha}\` |`).join("\n")}

## Verification

\`node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs\`
re-executes the capture in memory and fails on any byte difference from the
frozen JSONs (priority order/count, firmness value, tier membership/order,
DOM output). Run it against a clean checkout of the source commit above.
`;

writeFileSync(join(fixturesDir, "PROVENANCE.md"), provenance);
console.log(`[ok] PROVENANCE.md  commit=${commit.slice(0, 7)}`);
