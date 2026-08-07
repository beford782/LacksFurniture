# Frozen fixture provenance — Phase 1 decision-package prototypes

**Engine source commit:** `78f949c60cb9d7192d51bd9b3b7155d39319f8df` (= origin/main; the capture aborts
unless index.html, data/ and Code.gs in this worktree are byte-identical to it)
**Worktree HEAD at capture:** `81b13788b4d366dede71dd8d0704a9c085ff36c3`
**Captured:** 2026-08-07T18:48:49.616Z
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

## Authored inputs (stated exactly — everything else is executed engine output)

The captures author **inputs**, never outputs. There are three authored
input classes, each disclosed:

1. **Three pre-existing authored answer vectors** (`dense-c`, `dense-a`,
   `sparse-b`) taken from the shipped test suites — see answer-set
   provenance below.
2. **One newly authored SYNTHETIC answer vector** (`boundary-one`): it
   omits `sleep_position`, which no completed quiz can do — every
   reachable position value triggers a priority emission, so the engine's
   one-priority floor is unreachable from real quiz input (the reachable
   minimum is 2, exercised by `sparse-b`). It exists solely to pin the
   length-1 rendering contract through the real engine and is evidence
   about that contract only, never about any real customer state. Its
   fixture carries `meta.syntheticAnswerVector: true`.
3. **Simulated saved-finalist state per scenario**
   (`compareDemo.savedOrder`: tier leads in save order). Save history is
   customer input — no engine execution can produce one. The compare PAIR
   is then computed by executing the real extracted
   `compareReviewFinalists()` (index.html:17398–17409) against that state.

An earlier head of this package described item 3 as "the one authored
input"; that undercounted — the answer vectors are authored inputs too.

## Answer-set provenance

- `dense-a`, `sparse-b`: verbatim `ANSWER_SETS` entries from
  `tests/scoring_isolation_check.mjs`.
- `dense-c`: that suite's "plus body, plush, reflux" set; its
  profile-relevant answers match `tests/consultation_priorities_check.mjs`
  fixture C (3 priorities including a 90/90 stable-sort tie) except
  `mattress_size` (full vs queen), which does not feed the priority engine.
- `boundary-one`: authored for the 2026-08-07 correction pass; NOT from
  any shipped suite and NOT producible by the quiz UI (see above).

## Model coverage (computed at capture)

The 4 captured answer sets qualify **18 of 26** catalog
models across all tiers and scenarios:
b1, b2, b5, b6, b7, g1, g2, g3, g6, g7, g8, s1, s10, s2, s3, s6, s7, s9.
Models never rendered by any fixture:
g4, g5, g9, s4, s5, s8, b3, b4.
Consequence, recorded honestly: of the models carrying the four
originally-flagged strings (initial audit examples — the systematic
preliminary claim-risk inventory in the authoring brief appendix covers
all 26 models), g4 and g9 never render in any prototype —
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

## Hashing scope (stated exactly)

The tables below hash: **every production source file the capture reads**
(`index.html`, `data/mattresses.json`, `data/quiz.json`) and **each
committed fixture output**. They do NOT hash the capture/parity tooling or
the scenario definitions — those are ordinary reviewed source files in this
branch, versioned by git like any other code. (`Code.gs` and the rest of
`data/` are guarded by the byte-identity-with-origin/main abort, but are
not read by the capture and are not hashed here.)

`parity_check.mjs` verifies each hash against its **exact named table
row** (file cell + hash cell in the same row) — a hash appearing elsewhere
in this document does not satisfy the check.

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
| scenario-boundary-one.json | `89317539f042ee23de5db914bd6a6f4af9557b2189616ecc3e5fb10f6276200e` |

## Fixture schema (per scenario JSON)

```
meta:        { scenario, description, engineSourceCommit, answers,
               syntheticAnswerVector? (true only on boundary-one),
               answerSetProvenance, method }
profile:     { en, es } × {
               dom: { <16 profile element ids>: { innerHTML, textContent } },
               priorityRows: [ { title, desc, tagClass, tag, test } ]  (1-3, engine order),
               priorityCount: number,
               metaStrip: [ { label, value } ]  (fixed production order: Size, Feel, Temperature),
               resultsTrialFocus: string (captured production HTML),
               trialFocus: [ analytics trial-focus entries ],
               profileBrief, profileBriefByLang }
firmness:    { value: integer 1-10, firmnessFeel: {en,es},
               getFirmnessLabel: {en,es}, note }
results:     { tierData: { gold, silver, bronze: [ entry ] },
               topPick, enEsParity, priceTierSymbols,
               cardPriorities: { en, es: { <modelId>: [ { title, desc, tag, matched } ] }, note },
               note }
  entry:     { id, name, brand, subBrand, pitchKey, archetype, firmness,
               firmnessLabel, locallyMade, tags, highlight, tags_es,
               highlight_es, imageUrl, topPickReason, differentiators,
               score, pct, meetsMatchThreshold, firmnessFeelWord: {en,es} }
compareDemo: { savedOrder: [ { id, tier } ] (SIMULATED, disclosed),
               autoPair: [ id, id ] (real compareReviewFinalists() output),
               favourite: null, note }
```

Arrays are arrays (never numeric-key objects); `parity_check.mjs`'s deep
compare distinguishes the two.

## Verification

`node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs`
re-executes the capture in memory and fails on any byte difference from the
frozen JSONs (priority order/count, firmness value, tier membership/order,
DOM output), verifies every hash against its exact named table row above
(and that each file has exactly one row), and floors these
prototype-consumed surfaces: priority rows (title/desc/tag/test), all three
tiers non-empty, metaStrip (3 labelled entries), resultsTrialFocus,
cardPriorities (>=1 titled row per tier entry), per-entry
firmness/firmnessFeelWord(en+es)/meetsMatchThreshold/differentiators/
topPickReason, priceTierSymbols, and the compareDemo pair. Surfaces NOT
individually floored (covered by whole-object parity only): the remaining
profile dom ids, row tagClass, trialFocus/profileBrief analytics
projections. Runtime immutability is separately enforced: the shared
harness and the contract runner deep-freeze the fixture object before any
variant sees it. Run parity against a clean checkout of the source commit
above.

`node prototypes/phase1-decision-package/fixtures/tools/contract_check.mjs`
is the separate prototype contract runner: it executes the two recommended
candidate prototypes against these fixtures in a DOM stub and asserts the
rendering contracts (see the script header for exactly what it does and
does not prove).
