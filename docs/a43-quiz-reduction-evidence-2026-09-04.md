# A4.3 corrective pass — 2026-09-04

Branch `claude/north-star-candidate-a43-quiz-reduction`, worktree
`Documents\GitWorktrees\LacksFurniture\a43-quiz`, on top of `af7282e`.

**No new owner decision was required or taken.** The reduction approved on 2026-09-03 stands
exactly as approved (`A43-OWNER-DECISION.md`). This pass repairs correctness and evidence
defects found inside it. No question id, option id, score tag, weight, cap, threshold,
tie-break, tier rule or recommendation baseline moved.

---

## 1. What was wrong

| # | Defect | Where |
|---|---|---|
| 1 | **A conditional answer outlived its condition.** Editing `partner_sleep` on the Review left the dependent answer in `answers`. `calculateScores()` iterates `answers`, not the visible questions, so a solo consultation kept awarding `motionIsolation`/`hybrid` from a partner's movement answer; the Sleep Brief, accessory scorer, Consultation Summary, analytics answer copy and handoff payload all inherited it. The reverse edit returned to the Review holding the machine's own `not_applicable` sentinel, presented as if the customer had chosen "Doesn't Apply". | `index.html` quiz state machine |
| 2 | **A test observer was vacuous.** The "ABSOLUTE: no trigger object key" half of `tests/quiz_reduction_check.mjs` was `/‹U+0008›trigger\s*:/` — a literal backspace byte where `\b` was intended. It matched nothing on any tree, so an unquoted `{ trigger: 'pain' }` key would have passed unseen. | `tests/quiz_reduction_check.mjs:95-97` |
| 3 | **The living documentation stayed on ten questions** in eleven statements, including both onboarding guides a retailer build is run from, and the Consultation Summary was still described as three rows. | see §4 |
| 4 | **The evidence was unlocatable.** The handoff cited `evidence/candidate-a43/`, which does not exist in the repository or in `af7282e`. | see §5 |

### Two further findings, not in the brief

- **The same defect class covers `hideIf`, not only `skipIf`.** `body_type.different`
  ("Different weight ranges") and `temperature.opposite` ("We're opposite") are offered only
  to a shared bed and both carry scoring weight (`medium`/`support`/`motionIsolation` and
  `cooling`/`hybrid`). An edit to solo withdrew the option while leaving it as the stored
  answer, so it kept scoring for a solo sleeper. Repaired under the same invariant, rule (c).
- **Two more U+0008 bytes, in a different shipped suite.** A whole-tree scan found the
  identical defect in `tests/financing_copy_policy_check.mjs` at lines 100 and 246
  (`/Fresh‹U+0008›/` and `/‹U+0008›p\.separatePath‹U+0008›/`), each making half of its
  assertion vacuous. Out of the brief's scope, repaired in the same pass because leaving a
  known-vacuous CI assertion in place is not a defensible alternative. Both regexes now carry
  a real `\b`, and the suite gained two controls proving they contain no control byte and
  still fire on the text they forbid. That suite went 215 → 217 checks.

## 2. The repair

One rule, owned by the quiz state machine, in `index.html` immediately after
`visibleQuestions()`. Three functions and four call sites; every consumer is left alone.

- **(a)** A question whose `skipIf` condition holds is not being asked, so its answer is the
  `not_applicable` sentinel — written **the moment the condition becomes true**, not when the
  forward walk happens to step past it. This is now the **only** place in the app that writes
  the sentinel; the duplicate assignment inside `nextQuestion()`'s skip branch was removed, so
  a mutation of the single writer cannot be masked by the other.
- **(b)** A question that stops being skipped **loses** that sentinel — the customer never
  chose it — which makes it unanswered.
- **(c)** An option withdrawn by `hideIf` cannot remain the stored answer; it is cleared,
  which arms the Next control's existing empty-answer gate. A multi-select is filtered rather
  than cleared, because an empty multi-select is already valid ("None of these").
- **(d)** `goToReview()` — the single door into the Review — is unreachable while a
  **conditional** question that is being asked has no answer. It routes to that question
  instead and keeps edit mode on, so answering it returns straight to the Review. Scope is
  exactly the questions this rule can invalidate (those with a `skipIf` or owning a `hideIf`
  option); every other question is already gated by the Next control on the forward walk, and
  this rule neither weakens nor duplicates that.

Call sites: `selectOption()` (with a before-snapshot, which is what distinguishes a
machine-written sentinel from a customer's own answer), and `nextQuestion()`,
`prevQuestion()`, `goToReview()` (re-assert, no snapshot). Ordinary forward/back navigation,
edit-mode focus behaviour, EN/ES parity and the initial-solo contract are unchanged.

**Back is not a dead control.** In edit mode with a follow-up outstanding, Back is ordinary
back navigation — it steps to the question that opened the follow-up, so the customer can undo
the branch. It cannot reach the Review, because `goToReview()` re-checks.

### The one behavioural choice

After a solo round trip, a `not_applicable` that the customer had **explicitly** chosen while
the question was visible is indistinguishable from the machine's sentinel, so it is re-asked
rather than restored. The invariant errs toward asking again rather than toward keeping a
value it can no longer attribute. An explicit "Doesn't Apply" that has **not** been through a
solo round trip survives untouched, and that is pinned by a test.

## 3. Coverage added

`tests/quiz_reduction_check.mjs` grew from 39 to 121 checks.

- **§7 — the invariant, executed.** The real `visibleQuestions`, `conditionalConditionsHold`,
  `reconcileConditionalAnswers`, `pendingConditionalIndex`, `selectOption`, `nextQuestion`,
  `prevQuestion`, `goToReview` and `editAnswer` are extracted from `index.html` and driven
  like a customer (tap an option, tap Next). The resulting answer set is then fed to the real
  `calculateScores`, `qualifyRankedChoices`, `window.showResults`,
  `scoreAccessoriesFromAnswers`, `getSleepSystemViewModel` and `showProfileScreen`. Only the
  renderers are stubbed; every navigation decision and every write to `answers` is production
  source.
  - partner + `yes_often` → edited to solo produces **byte-identical** scores, tier ordering,
    pct, threshold, top pick, `allMatches`, per-language match reasons, accessory ordering
    with matched flags and reasons, Sleep System groups, recommendations, Sleep Brief
    priorities and profile name/subtitle/brief to a clean solo session — **in EN and ES** —
    and an answer set equal key-for-key, which is what analytics copies.
  - solo → edited to partner **and** to family cannot finish on `not_applicable`: the movement
    question is presented, Next is gated on an answer, Back leads to `partner_sleep` and never
    to the Review, and the session finishes with nine rows and a real answer.
  - the `hideIf` half, both options, one at a time in question order.
  - Review rows and progress: 8 solo, 9 partner/family, before and after each edit.
  - **Non-vacuity is proved, not assumed**: the suite asserts that the stale `yes_often`
    *would* have moved the scores and the profile output, and that a withdrawn `body_type`
    option *would* have kept scoring. A comparison that could not have failed proves nothing.
- **§8 — the living contract.** The counts in eight principal guides are pinned **derived from
  `data/quiz.json`**, never retyped, so another structural reduction fails this section until
  the guides move with it. Dated investigation snapshots are explicitly pinned the other way:
  the check fails if their historical measurement is laundered into agreement with today.
- **§3 — the repaired observer plus four controls**, including one proving that an unquoted
  `{ trigger: 'pain' }` key makes the observer fail and one proving neither regex contains a
  control byte.

### Proved red before being written down

Each new suite check and each new sweep entry was run against a tree carrying the defect.
Against `af7282e`'s `index.html` the new §7 reports, among others:

```
[FAIL] REPAIR (a): choosing solo normalizes the movement answer IMMEDIATELY — "yes_often"
[FAIL] ANSWER STATE: the edited session equals a clean solo session, key for key
       edited={... "partner_disturbance":"yes_often" ...}
       clean ={... "partner_disturbance":"not_applicable" ...}
[FAIL] ENGINE (en): scores, tier order, pct, threshold, top pick and allMatches are identical
[FAIL] ENGINE (es): scores, tier order, pct, threshold, top pick and allMatches are identical
[FAIL] ENGINE (en/es): the Sleep Brief priorities and the profile name, subtitle and brief are identical
[FAIL] solo→partner REPAIR (b): the machine-written sentinel is cleared — "not_applicable"
```

Eight mutations were proved to turn the suite red in a sandbox before anything was written
down (`mutations-proved.log`): the reconciler unhooked; the sentinel unwritten; the
before-snapshot discarded; the clear disabled; a withdrawn option left standing; the
Review's door check defeated; Back ignoring the outstanding question; the probe silenced.
**Seven** of them became new sweep entries — the eighth (the sentinel unwritten) is already
covered by the pre-existing entry "quiz: the solo path stops stamping not_applicable",
whose find string now lands on the single writer, so it was not duplicated. One further
entry proves the living-contract pin is load-bearing. The sweep went 655 → 663 mutations.

One candidate entry **survived** on first attempt — "Back in edit mode ignores the outstanding
question" — because `goToReview()` re-checks and the screen therefore does not change. The
assertion was strengthened to measure Back's **destination** (`partner_sleep`), which is the
property the guard actually delivers, and the entry then failed correctly. Recorded because a
survivor that is explained away rather than fixed is how a sweep goes quiet.

**The sweep also caught a regression in this pass itself.** Two long-standing entries —
"a third network sink appears" and "a pixel beacon carries the answers" — anchor on the
three lines of `selectOption()` that the invariant changed, so they reported **did not
apply**: a stale anchor, which the sweep treats as a failure precisely because a mutation
that no longer applies is a property that has silently stopped being observed. Both were
re-pointed at the new source (same insertion point, same suites) and proved to apply and be
caught before the sweep was re-run. This is the mechanism working as designed, and it is
recorded rather than quietly fixed.

## 4. The living contract, synchronised

| File | Change |
|---|---|
| `CLAUDE.md` | Overview ("9-question ... 8 displayed steps for a solo sleeper"), quiz architecture ("9 quiz questions (42 options; 8 ... 9 ...)"), Key App Flows (counts + full removal history), and a new Key App Flows entry describing the conditional-answer invariant |
| `README.md` | "a nine-question sleep quiz (eight displayed steps for a solo sleeper)" |
| `onboarding/Onboarding_Guide.md` | 9-question / solo sees 8 |
| `onboarding/Build_Runbook.md` | "all 9 questions (8 on the solo path)"; Spanish pass "all 9 questions"; the profile-opener line no longer claims it uses `trigger`; **a new checklist item for the two conditional-edit directions** |
| `tools/validation.py` | canonical-contract comment: the 2026-09-03 removal, 10 → 9 / 42 options / 8 / 9 |
| `tools/workbook_schema.py` | Quiz tab: "9 questions / 42 options" |
| `docs/quiz-copy-engine-correspondence.md` | title "the nine `helpText` lines"; the Consultation Summary consumer description is now **two** rows, with the retirement and the no-inference rule stated |
| `docs/rebuild-roadmap.md` | governing premise (§ permanent operating premise) now 9 / 42 / 8 / 9; the 2026-08-12 ruling gains a supersession note; findings row 1 updated with its full dated lineage |

Dated investigation snapshots were **not** rewritten: `docs/quiz-trust-investigation-2026-08-21*`,
`docs/accessory-recommendation-audit-2026-08-30.md` (which names the exact commit it audited)
and `docs/trust-integrity-physical-gate-2026-08-21.md` keep their measurements of the tree as
it stood. `tests/quiz_presentation_check.mjs` had two stale labels ("all ten questions", "nine
Next transitions") corrected to match assertions that already read 8/9.

## 5. Evidence — what was actually found, and where it is

The handoff's `evidence/candidate-a43/` is **not** a repository path and never was. It is
relative to the manual-gates root, and the package **does exist and was recovered intact**:

```
C:\Users\BlakeFord\Documents\DreamFinder-manual-gates\north-star-program-2026-08-31\evidence\candidate-a43\
```

Nothing had to be reconstructed. `.gitignore` excludes manual-gate screenshots by policy, and
this package is 2386 files / 2277 PNG captures / 273.8 MiB, so the durable record committed to the repository is
`docs/a43-quiz-reduction-evidence-2026-09-04.md` plus a full sha256 manifest
(`.sha256`) of every retained file, following the precedent already set by
`docs/guided-selling-cohesion-review-2026-08-30-evidence.sha256`.

### Two inaccuracies in the original record, corrected here

1. **The capture directory is mislabelled.** `a43-cap-566c0b7/` and its `run-summary.json`
   label the run `...@566c0b7`, but the captured tree was the Phase 3 working tree (the
   readings show the post-reduction 8/9/9 counts, which do not exist at `566c0b7`). The
   captures are valid; the label is wrong. This pass labels its own run by the working-tree
   parent **and** the sha256 of the exact `index.html` served, so the tie is provable.
2. **"Dynamic progress reads 12.5% → 100%"** (commit `af7282e`) does not match the recorded
   data. The measured solo walk reads 11.1111% → 22.2222% (nine visible until `partner_sleep`
   is answered) → 37.5% → 50% → 62.5% → 75% → 87.5% → 100%. The behaviour is correct; the
   summary of it was not.

---

## 6. Verification performed

### Environment

| | |
|---|---|
| Repository | `C:\Users\BlakeFord\Documents\GitWorktrees\LacksFurniture\a43-quiz` |
| Branch | `claude/north-star-candidate-a43-quiz-reduction` |
| Parent commit | `af7282e04782d12fd6f78690af8d789d4963c52e` |
| Corrective commit | `(recorded in the commit that adds this file)` |
| `index.html` sha256 | `191d921af183f1d18fd933512bb6abc4569d9e5d3fde8ef3e8b874b2c0e34b2b` |
| Python | `3.14.2` (`C:\Users\BlakeFord\AppData\Local\Microsoft\WindowsApps\python.exe`), openpyxl `3.1.5`, Pillow `12.1.1`, qrcode `8.2` |
| Node | `v24.13.0` |
| PowerShell | `7.6.5` (`C:\Users\BlakeFord\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe`) |
| Chromium | `151.0.7922.34 via Playwright 1.62.0` (Playwright) |
| Started / finished (capture) | `2026-09-04T10:46:55` / `2026-09-04T11:25:01` |

### Commands

```
pwsh -NoProfile -File tools/run_full_suite.ps1
node tests/mutation_sweep.mjs
python tools/build_black_friday_demo.py
python tests/lineage_check.py
git diff --check
python ns_capture.py --root <worktree> --out <evidence>/cap-corrective \
  --label "claude/north-star-candidate-a43-quiz-reduction@worktree-on-af7282e index.html:<sha12>" \
  --contexts en-landscape,es-landscape,en-portrait,es-portrait,en-phone,es-phone \
  --rm --fc --scenes a43-quiz,a43-cond-edit
```

### Results

**CI mirror — PASSED, 53 checks plus the integrity guards** (`mirror.log`,
`mirror-exit.txt`). Python dependency preflight `import openpyxl, PIL, qrcode` OK. Suite
counts at this tree, with the ones this pass moved in bold:

| Suite | Result |
|---|---|
| validator self-test | 1331 passed, 0 failed |
| **quiz reduction** | **121 passed, 0 failed** (was 39) |
| **quiz presentation** | **222/222** |
| **financing copy policy** | **217 passed, 0 failed** (was 215) |
| phase 1 output regression | 190 passed, 0 failed |
| scoring isolation | 262 passed, 0 failed |
| scoring key contract | 27 passed, 0 failed |
| scoring vocabulary | 51 passed, 0 failed |
| consultation summary | 91 passed, 0 failed |
| consultation priorities | 284 passed, 0 failed |
| session safety | 567 passed, 0 failed |
| data-error recovery | 331 passed, 0 failed |
| trust integrity | 127/127 |
| A3.1 presentation | 288/288 |
| Sleep Plan | 274 passed, 0 failed |
| daybreak contract (demo byte-pin) | 87 passed, 0 failed |
| canonical Lacks lineage | 10 passed, 0 failed |
| smoke | 118 passed, 0 failed |

**Recommendations did not move.** `phase1_output_regression` (190) and `scoring_isolation`
(262) are unchanged, so no score, tier rule, threshold, cap, tie-break, weight or dormant key
moved. The pinned fixture `tests/fixtures/phase1_output_baseline_daybreak_pr1.json` is
untouched by this diff.

**Mutation sweep — 663/663 caught, 0 survived, 0 did not apply** (`sweep.log`, `sweep-exit.txt`). Every entry applied and every one was detected, including the eight this pass added. The run took the full manifest, not a subset.

**Generated lineage.** `tests/lineage_check.py` 10/10. The demo bundle was rebuilt through
`tools/build_black_friday_demo.py`, never hand-edited, and the `daybreak_contract` byte-pin
passes. The full chain was also re-executed in the worktree
(`build_lacks_workbook.py` → `convert_store_data.py incoming/Lacks_Store_Data.xlsx` →
`build-data.ps1` → `build_black_friday_demo.py`, log `regen-full.log`): every generated file
came back **content-identical to HEAD**. Two notes recorded rather than glossed:

- The workbook rebuild is not byte-reproducible — `incoming/Lacks_Store_Data.xlsx` came back
  45503 bytes against 45501, which is xlsx container non-determinism. A canonical cell-by-cell
  comparison of both files reports **90 rows, identical**, so the committed artifact was
  restored rather than churned into the diff.
- `data/accessories.json`, `data/allowed-hosts.js` and `manifest.json` are emitted LF while the
  checkout holds them CRLF. Git normalises both to the same blob (`git diff` is empty for all
  three, and an LF-normalised md5 matches `HEAD` exactly), so they do not appear in the commit;
  their checkout line endings were restored.

**Whitespace.** `git diff --check`, `git diff --cached --check` and the committed-range check
`git diff --check 5a43b25..HEAD` all pass.

**Working tree.** Clean after the full regeneration: the only modified paths are the ones this
pass intends, and there are no untracked files.

**Cross-platform.** The two suites this pass changed were additionally executed against an
LF-normalised copy of the tree — what GitHub Actions checks out on Linux — and pass there:
quiz reduction 121/121, quiz presentation 222/222.

**Control bytes.** Every tracked text file in the repository was scanned: **0** files carry a
control byte other than tab, CR or LF. Before this pass there were 3 such bytes across 2 files.

### Browser matrix

## Displayed steps per path, per context (scene `a43-quiz`)

| Context | solo | partner | family | solo (keyboard) | verdict |
|---|---|---|---|---|---|
| en-landscape | 8 | 9 | 9 | 8 | OK |
| en-landscape-forced-colors | 8 | 9 | 9 | 8 | OK |
| en-landscape-reduced-motion | 8 | 9 | 9 | 8 | OK |
| en-phone | 8 | 9 | 9 | 8 | OK |
| en-phone-forced-colors | 8 | 9 | 9 | 8 | OK |
| en-phone-reduced-motion | 8 | 9 | 9 | 8 | OK |
| en-portrait | 8 | 9 | 9 | 8 | OK |
| en-portrait-forced-colors | 8 | 9 | 9 | 8 | OK |
| en-portrait-reduced-motion | 8 | 9 | 9 | 8 | OK |
| es-landscape | 8 | 9 | 9 | 8 | OK |
| es-landscape-forced-colors | 8 | 9 | 9 | 8 | OK |
| es-landscape-reduced-motion | 8 | 9 | 9 | 8 | OK |
| es-phone | 8 | 9 | 9 | 8 | OK |
| es-phone-forced-colors | 8 | 9 | 9 | 8 | OK |
| es-phone-reduced-motion | 8 | 9 | 9 | 8 | OK |
| es-portrait | 8 | 9 | 9 | 8 | OK |
| es-portrait-forced-colors | 8 | 9 | 9 | 8 | OK |
| es-portrait-reduced-motion | 8 | 9 | 9 | 8 | OK |

Contexts with an unexpected count: **0** of 18

## Consultation Summary, per context (scene `a43-quiz`)

| Context | rows | row ids | empty rows | context element present | brief height |
|---|---|---|---|---|---|
| en-landscape | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| en-landscape-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| en-landscape-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| en-phone | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| en-phone-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| en-phone-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| en-portrait | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| en-portrait-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| en-portrait-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-landscape | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-landscape-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-landscape-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-phone | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| es-phone-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| es-phone-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 86 |
| es-portrait | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-portrait-forced-colors | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |
| es-portrait-reduced-motion | 2 | hf2BriefWho,hf2BriefProfile | 0 | False | 45 |

Contexts where the Summary is not exactly two populated rows with no context element: **0**

## The conditional-answer invariant, per context (scene `a43-cond-edit`)

D1 = partner + `yes_often`, edited to solo. D2 = solo, edited to partner.
D3 = a partner-only option (`body_type.different` + `temperature.opposite`) withdrawn by an edit to solo.

| Context | D1 screen/rows/movement | D2 asked q/movement/Next disabled | D2 Back lands on | D2 finish screen/rows/movement | D3 after solo (body+temp) | D3 re-asked | progress D1 / D2 | focus after routing |
|---|---|---|---|---|---|---|---|---|
| en-landscape | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-landscape-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-landscape-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-phone | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-phone-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-phone-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-portrait | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-portrait-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| en-portrait-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-landscape | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-landscape-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-landscape-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-phone | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-phone-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-phone-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-portrait | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-portrait-forced-colors | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |
| es-portrait-reduced-motion | reviewScreen/8/not_applicable | partner_disturbance/<<absent>>/True | partner_sleep | reviewScreen/9/sometimes | <<absent>>+<<absent>> | body_type | 2 / 8 then 2 / 9 | questionHeadline |

Contexts where either direction reconciled incorrectly: **0** of 18

## Progress and state during the solo walk (en-landscape; every context pinned above)

| Capture | progress width | visible steps | a trigger answer in state? |
|---|---|---|---|
| a43-solo-step1-mattress_size | 11.1111% | 9 | False |
| a43-solo-step2-partner_sleep | 22.2222% | 9 | False |
| a43-solo-step3-sleep_position | 37.5% | 8 | False |
| a43-solo-step4-body_type | 50% | 8 | False |
| a43-solo-step5-temperature | 62.5% | 8 | False |
| a43-solo-step6-firmness | 75% | 8 | False |
| a43-solo-step7-sleep_issues | 87.5% | 8 | False |
| a43-solo-step8-health_conditions | 100% | 8 | False |

- Contexts captured: **18**
- Captures recorded: **1440**
- Page errors: **0**  -  console errors/warnings: **0**  -  harness problems: **0**
- Sub-44px interactive controls recorded across the run: **0**
- Captures with page horizontal overflow: **0**
- A trigger answer was present in state in **0** of 612 walked steps (expected 0).

## WCAG 2.2 SC 1.4.12 Text Spacing (scene `a43-text-spacing`)

Overrides applied to every element: line-height 1.5, letter-spacing 0.12em,
word-spacing 0.16em, 2em after paragraphs and headings. The criterion is
**no loss of content or functionality**, measured as clipped leaf text, page
horizontal overflow, sub-44px controls, step counts and the conditional-edit
outcomes holding under the overrides.

| Context | line-height ratio | captures | clipped visible text | sr-only (by design) | overflowX | sub-44px | solo/partner steps | D1 rows/movement | D2 asked/Next gated | page+console errors |
|---|---|---|---|---|---|---|---|---|---|---|
| en-landscape | 1.5 | 23 | 0 | 1 | 0 | 0 | 8 / 9 | 8/not_applicable | partner_disturbance / True | 0 |
| en-phone | 1.5 | 23 | 0 | 1 | 0 | 0 | 8 / 9 | 8/not_applicable | partner_disturbance / True | 0 |
| es-landscape | 1.5 | 23 | 0 | 1 | 0 | 0 | 8 / 9 | 8/not_applicable | partner_disturbance / True | 0 |
| es-phone | 1.5 | 23 | 0 | 1 | 0 | 0 | 8 / 9 | 8/not_applicable | partner_disturbance / True | 0 |

Contexts with any loss of content or functionality under the overrides: **0** of 4

---

## 7. Not performed

- **No physical iPad or other mounted device.** Everything here is headless Chromium at the
  recorded viewports. The standing owner waiver of 2026-08-23 covers dev/preview work; the
  full pre-showroom device matrix remains **blocking and unperformed**, per the 2026-08-27
  ruling that deferred it to one consolidated end-of-roadmap session.
- **No WebKit or Firefox.** WebKit is not installed on this machine (recorded as an
  unperformed device waiver since the A3.1 pass). Chromium only.
- **No screen-reader pass** — permanently out of scope (owner ruling 2026-08-12).
- **No native Spanish review.** ES copy remains provisional under roadmap Invariant 12. The ES
  contexts here prove behavioural parity, not copy quality.
- **No role-play or salesperson walkthrough.**
- **No PR, no merge, no deploy, no service activation.** `gasUrl` stays blank; the branch is
  an evidence branch; `main` and the frozen branches are untouched. Nothing here is
  production-ready or showroom-validated.
