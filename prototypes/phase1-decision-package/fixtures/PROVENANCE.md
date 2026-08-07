# Frozen fixture provenance — Phase 1 decision-package prototypes

**Engine source commit:** `78f949c60cb9d7192d51bd9b3b7155d39319f8df` (= origin/main; the capture aborts
unless index.html, data/ and Code.gs in this worktree are byte-identical to it)
**Worktree HEAD at capture:** `17d7fa43a217eddf192adaa1f2945657ccd53f72`
**Captured:** 2026-08-07T15:08:28.451Z
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
  executed for the scenario firmness value in both languages, and
  `firmnessFeel()` additionally executed per tier entry so every per-model
  display word is captured, never re-derived by a prototype.
- EN/ES engine parity is asserted at capture time (capture aborts on
  divergence), and a capture floor aborts the freeze if any load-bearing
  surface parses empty (priority rows, rendered headings, tier entries) —
  a silent extraction drift can no longer freeze an empty fixture.
- **One authored input, disclosed:** `compareDemo.savedOrder` is simulated
  saved-finalist state (tier leads in save order). Save history is customer
  input — no engine execution can produce one — so this is the single place
  the capture authors data rather than recording it. The compare PAIR is
  then computed by executing the real extracted `compareReviewFinalists()`
  (index.html:17398–17409) against that state.

## Answer-set provenance

- `dense-a`, `sparse-b`: verbatim `ANSWER_SETS` entries from
  `tests/scoring_isolation_check.mjs`.
- `dense-c`: that suite's "plus body, plush, reflux" set; its
  profile-relevant answers match `tests/consultation_priorities_check.mjs`
  fixture C (3 priorities including a 90/90 stable-sort tie) except
  `mattress_size` (full vs queen), which does not feed the priority engine.

## Model coverage (computed at capture)

The three fixed answer sets qualify **17 of 26** catalog
models across all tiers and scenarios:
b1, b2, b5, b6, b7, g1, g2, g3, g6, g7, g8, s1, s10, s2, s3, s6, s7.
Models never rendered by any fixture:
g4, g5, g9, s4, s5, s8, s9, b3, b4.
Consequence, recorded honestly: the flagged catalog claim strings on models
outside this set (g4, g5, g9 among them) never render in any prototype —
those flags come from direct catalog inspection, not from fixture rendering.
Coverage follows from the engine's own qualification on the fixed answer
sets; widening it would require additional captured answer sets, never a
change to qualification.

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
| scenario-dense-c.json | `530e738895c070c5602f351a27db0ee80750ad1466bdb0ca6da1b64ac2d2d87e` |
| scenario-dense-a.json | `a5088aab4ae6aea9729e935bff2d442f8ce2655275aba19ddbde834fb8751638` |
| scenario-sparse-b.json | `1250fa9698edfa1fba6391bae0cfdc80153b891cb2ec08489b19bbf24c074f64` |

## Verification

`node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs`
re-executes the capture in memory and fails on any byte difference from the
frozen JSONs (priority order/count, firmness value, tier membership/order,
DOM output). Run it against a clean checkout of the source commit above.
