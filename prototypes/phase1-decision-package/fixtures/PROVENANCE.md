# Frozen fixture provenance — Phase 1 decision-package prototypes

**Source commit:** `78f949c60cb9d7192d51bd9b3b7155d39319f8df` (= origin/main at capture time; PR #17 merge)
**Captured:** 2026-08-06T23:35:41.550Z
**Capture command:** `node prototypes/phase1-decision-package/fixtures/tools/capture_fixtures.mjs`

## Method

Extract-and-execute, copied from the shipped suites (no scoring or ordering
logic reimplemented anywhere):

- `showProfileScreen()` + `renderResultsTrialFocus()` extracted from
  `index.html` by the same regexes as `tests/consultation_priorities_check.mjs`
  and executed against its recording DOM shim, per answer set, per language.
- `calculateScores()` + `qualifyRankedChoices()` + `window.showResults`
  extracted likewise (patterns from `tests/scoring_isolation_check.mjs`) and
  executed against `data/mattresses.json` + `data/quiz.json`; the fixture
  records the verbatim `_resultsState.tierData` projection (membership,
  within-tier order, qualification, cap, back-fill, pct, meetsMatchThreshold)
  and `analytics.topPick`.
- `firmnessFeel()`, `getFirmnessLabel()`, `priceTierSymbol()` extracted and
  executed for the scenario firmness value in both languages.
- EN/ES engine parity is asserted at capture time (capture aborts on
  divergence).

## Answer-set provenance

- `dense-a`, `sparse-b`: verbatim `ANSWER_SETS` entries from
  `tests/scoring_isolation_check.mjs`.
- `dense-c`: that suite's "plus body, plush, reflux" set; its
  profile-relevant answers match `tests/consultation_priorities_check.mjs`
  fixture C (3 priorities including a 90/90 stable-sort tie) except
  `mattress_size` (full vs queen), which does not feed the priority engine.

## Deliberate exclusions

- `reasons` / `reasons_es` are NOT carried into the tier fixtures: every
  per-feature reason column is empty across all 26 models and nothing renders
  any catalog reason today. Excluding them prevents a prototype from
  presenting generic defaults as customer-specific copy (the gated 1.3
  output).
- `score` and `pct` ARE carried, for provenance and parity checking only.
  No screen renders a match percentage or score today and no prototype may.
- Fixture JSONs carry no timestamps; capture date lives only in this file so
  the JSONs stay byte-reproducible.

## Input hashes (sha256 over LF-normalized text)

| file | sha256 |
|---|---|
| index.html | `fe8f18981442595867a1690e960b9d4b0f95ccdd6432fa7a8a9fe2fbe2a12489` |
| data/mattresses.json | `908ea1e3de5f85790e37d76496ed1a3fd0e78afc8cee6cd2ffd685043993d97a` |
| data/quiz.json | `bc1068f7b73d480526677785927919c5da710769e7f8a329cfbf8ce865819d70` |

## Fixture hashes (sha256 over LF-normalized text)

| file | sha256 |
|---|---|
| scenario-dense-c.json | `58179b69e2e83b6392053911e40d477bb0944886c169bb60f1b9111f7a19d241` |
| scenario-dense-a.json | `f2fa5c33e874cd81c1499e038535b79da2dc1c3b518794ef2489186b62d4dbda` |
| scenario-sparse-b.json | `d7af9daf8db42d02c630a0f0ccc329cd4250696e887c2d95507aa03ffea1af4b` |

## Verification

`node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs`
re-executes the capture in memory and fails on any byte difference from the
frozen JSONs (priority order/count, firmness value, tier membership/order,
DOM output). Run it against a clean checkout of the source commit above.
