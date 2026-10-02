# Payment Choice workspace, slice 1 (2026-09-27)

Implementation record for the "Bring it home" payment workspace. Orientation
only: no price, rate, term or payment figure is added, and every production
gate is unchanged (`exactPromotionsEnabled` false, `pricing.enabled` and
`displayEnabled` false, every pricing surface false, `gasUrl` blank).

Design study (private, owner-held): hub folder
`Projects\LacksFurniture\payment-choice-study-2026-09-27\` (revision 3.1 and
its Codex handoff).

## Owner direction this slice implements (Blake, 2026-09-27)

1. Summary-centred workspace; the Results entry is kept.
2. Path-level payment preferences (one "Promotional financing" preference per
   provider, never per offer).
3. The explicit preference is shown in the on-screen consultation (Summary and
   the on-screen Sleep Plan) and excluded from printed, emailed, downloaded or
   shared output. The email builder already excludes it; there is no print,
   download or share code.
4. The customer-facing "Options explored" history is removed from every
   surface. `payExplored` stays an internal, wiped record and is rendered
   nowhere.
5. Optional, neutral guidance: "What shall we look at first?" with information
   topics (Due today, Payment schedule, Full cost, Ownership). A topic explains
   information; it never explores, selects, ranks, hides or reorders a path,
   and never asks about credit circumstances.
6. Orientation-only first slice; pricing and financial calculations disabled.

This supersedes, for the Summary and Sleep Plan, the D4 wording in
`docs/rebuild-roadmap.md` that listed an "options-explored" row (around lines
2045, 3781, 3844, 4030). `optionsExploredLabel` and `reviewOption` move from
`PAYMENT_CHOICE_REQUIRED_COPY` to `PAYMENT_CHOICE_RETIRED_COPY`.
`preferenceNotNow` now reads "Not choosing a payment option today" /
"Hoy no elegimos una forma de pago" (decision 9 of the implementation brief).

## What was built

- The financing sheet (`#financingSheet`, same dialog, same entry points) is
  presented as a full-viewport workspace: return control, title, fit-first
  line, an in-dialog EN/ES switch, and close. The persistent utility bar and
  the screen behind are made `inert` while it is open (drawer idiom) and
  released exactly on close and by the wipe.
- Chooser (left): one row per path plus a separate Mexico row and one global
  "not choosing today" toggle. A row explores its path; the explored row and
  the considered row are distinguished by text and shape, not colour alone.
- Stage (right), one of four views: the customer's sleep system on arrival
  (the finalist's own catalog image, model, brand and size, and the selected
  pieces); one path's governed panel; a two-path comparison; the itemized
  purchase with its supported edits.
- Every path's governed panel is always in the document, hidden unless it is
  the explored path, so the fail-closed body is rendered for every path on
  every render. With stale terms the confirmation section leads with the
  governed `staleNotice`.
- Governed orientation copy (validated by `_check_ungated_text`):
  `howPromotional`, `howInstallment`, `howMexico`, `topicDue`, `topicSchedule`,
  `topicFull`, `topicOwnership`. Workspace chrome lives in the dictionaries
  under `pay.ws.*` (EN/ES, drafts pending native review).
- Item edits call the Summary's existing setters (`setSleepSystemItem`,
  `setSleepSystemItemQuantity`, `window.chooseFinalist` among saved picks
  only), then repaint the screen behind. There is no second cart.

## State

Payment dimensions are unchanged: `payPref` (written only by Consider, Clear
and not-choosing-today) and `payExplored` (internal). `payOpen` now holds at
most one path. New ephemeral presentation state, never logged, e-mailed,
persisted or read by scoring, all cleared by name in `resetSessionState()`:
`_payCompare`, `_payComparePicking`, `_payTopic`, `_payTopicsOpen`,
`_payWsView`, `_payWsRemoved`, `_payWsChange`.

## Rules recorded for later pricing and payment slices

- A purchase edit immediately withdraws every dependent payment figure (panel,
  compare, change note, live region) until it is recomputed from the new
  purchase; an obsolete figure is never shown as current.
- A known down payment is labelled "Down payment"; "Total due today" reads "to
  confirm" while tax, delivery or other upfront charges are unknown.
- Merchandise subtotal, purchase total, down payment, amount financed, total
  of scheduled payments and total amount paid are distinct; a figure that
  excludes tax or delivery is never called the complete amount paid.
- Lease-to-own gets its own presentation (ownership, schedule, early purchase,
  total cost to own), never a credit model.
- Missing values are never zero and never silently omitted from a "total".
- Controlled development (dark, fixtures, harness) and live activation are
  separate permissions.

## Status (2026-09-28)

- **Implementation: complete for slice 1**, uncommitted, in worktree
  `GitWorktrees\LacksFurniture\payment-workspace`, branch
  `claude/payment-choice-workspace`, base `c4afdc3` (PR #132 merge), on
  computer `CRodHPLT-090922`.
- **Release readiness: not established.** No commit, push, PR, review, merge
  or deployment has happened; physical iPad Safari, VoiceOver and native
  Spanish review are not done; the pre-commit items below are open; showroom
  use remains owner-gated.
- The visual direction was accepted by Blake on 2026-09-28 (arrival product
  stage, persistent product strip, aligned comparison, portrait purchase-first,
  saved state shown on the row and the action area only, product photo on the
  panel paper with a 4% near-white lift and a short top/bottom feather,
  measured overflow cue above the sticky action bar).

## Final design, as built

- Arrival: a broad product stage (the finalist's own catalog photo on the
  panel paper, one soft floor shadow), model and size with "Review items",
  then the selected pieces as compact tiles, then one invitation line.
- Exploring, saving, comparing: a persistent product strip (thumbnail, model,
  brand and size, "Review items").
- Detail: name, "Offered through" (only when configured), "How it works",
  one "What needs confirming" section led by the governed stale notice when
  exact terms are withheld; sticky actions (Consider / marker + Clear,
  Compare with..., Hide details).
- Compare: one aligned table (Offered through, How it works) and one shared
  "What needs confirming for both" section.
- Portrait: on arrival the purchase precedes the list; once explored, the
  panel follows the list.
- The image treatment is CSS only (`mix-blend-mode`, `filter: brightness`,
  `mask-image`). No file under `images/` or `incoming/images/` changed.

## Behaviour change to acknowledge

A plan with no canonical identity or no resolvable label previously rendered
as an unselectable informational card; in the workspace it has no row and no
panel, so it is absent. This is fail-safe (less copy reaches the customer),
but it is not in the owner-directed list and needs Blake's acknowledgment.
The shipped configuration has no such plan.

(Correction pass, 2026-09-30: kept. `finPaymentPaths()` excludes such a path
by contract, and every workspace surface renders only paths, so there is
nothing for an informational card to belong to; the retired group-based
renderer could show informational copy with no valid path behind it. The
distinct valid case, a promotional plan with no provider, is unchanged: it
is the one generic "Promotional financing" path with identity `promo-`.)

## Verification

`tests/payment_workspace_check.py` (new, rendered, EN/ES at 1194x834 and
1024x768, plus portrait): state contract, item edits, language preservation,
Summary and Sleep Plan text, wipe, keyboard, pointer-tap focus, Results entry
without a finalist, reduced motion, touch floor, duplicate ids, portrait
order, and no price or rate text.

Final-tree results are recorded in the hub handoff for this study:
`Projects\LacksFurniture\payment-choice-study-2026-09-27\IMPLEMENTATION-HANDOFF-2026-09-28.md`.

## Correction pass (2026-09-30)

Focused corrections authorized by Blake before his iPad walkthrough. The
visual direction and every owner decision above are unchanged. Nothing is
committed. The findings came from an independent Codex review, and each one
was re-verified against the source before it was changed.

Fixed:

1. **"Choose a finalist" from the Sleep Plan.** `finWsGoChooseFinalist` handled
   Results and the Summary only. From the Sleep Plan it closed the workspace
   and left the Plan on screen. The fix: from any screen other than Results it
   now takes the Sleep Plan's own route (`sleepPlanChooseFinalist`). On
   Results, and from the drawer after closing it, it only moves focus. Both
   routes share `focusFirstFinalistControl()`, now scoped to `#resultsScreen`.
   Nothing is selected, wiped or re-ranked.
2. **Focus return after the opener is repainted.** Saving or clearing a
   preference rebuilds the Sleep Plan's financing region, which detaches the
   stored opener. `closeFinancingSheet` now resolves the opener in this order:
   the stored node, then the element that now carries its id, then the
   placement's own opener (`FIN_WS_OPENERS`). A target must be connected,
   rendered and enabled, and must sit outside the closed workspace and any
   hidden or inert subtree. If no target qualifies, focus is blurred out of
   the hidden sheet. A workspace opened by touch stored no control, so closing
   it moves no focus (unchanged). The Sleep System opener gained the id
   `sleepSystemFinancingExplore` so it has a stable identity.
3. **Provider identity.** "Offered through" now names the path's own
   configured provider (`finSafeProvider`) for promotional, installment and
   Mexico paths. It no longer uses `storeName()`. The Mexico path is a
   destination scenario, so its provider is its plan's provider. A missing
   provider reads the governed neutral "Confirmed in store". Evergreen
   programs still present no provider (unchanged).
4. **Provider-neutral shared explanations.** `howPromotional`,
   `howInstallment` and `howMexico` are shared by every path in their group.
   They named the Lacks Furniture Synchrony HOME card and Lacks' own credit
   team, so a second lender would have inherited them. They are rewritten in
   the canonical source (`incoming/lacks_financing.json`, and the pricing
   fixture mirror) to name no lender. The lender is named only on the path's
   "Offered through" line. The workbook, `data/store-config.json` and the demo
   bundle were regenerated through the documented chain. The new copy passes
   `_check_ungated_text`. No rate, eligibility or calculation was added.
   Moving provider-specific explanations onto plans would be a schema
   addition, so it is deferred to Blake.
5. **`.fin-official-link` gains `touch-action: manipulation`.** This gap is
   inherited from base `c4afdc3` and was found by the new measured-touch
   check.
6. **Historical-capture test clock (test only).**
   `tests/pricing_website_admission_check.py` now judges the committed capture
   at a fixed instant inside its validity window (2026-09-24T12:00Z). It also
   pins the freshness boundary: accepted at exactly oldest observation +
   `maxAgeDays`, and refused one second later and 30 days later, with every
   error naming its age. Production clocks, freshness logic, evidence stamps,
   `maxAgeDays` and all gates are unchanged.

Tests strengthened:

- `tests/payment_choice_check.mjs`:
  - §13's vacuous OR-check is split into independent checks. One proves no
    history container or label renders. The other proves no stale or planted
    unknown id reaches any rendered surface, in EN and ES. A negative control
    leaks the token without restoring the old list class.
  - §30 covers provider identity and neutral shared copy, in details and in
    the comparison table, EN and ES. It uses the Lacks configuration, a
    second promotional lender, an external installment provider and missing
    providers. Two negative controls go with it.
  - §31 covers focus return after a repaint, from the Sleep Plan and the
    Summary after save and after clear. It covers the by-id step alone (an
    unmapped placement) and has a stored-node negative control.
- `tests/sleep_plan_check.mjs`: its harness now extracts the shared
  `focusFirstFinalistControl()`.
- `tests/payment_workspace_check.py` (rendered) adds sections 6–12:
  - "Choose a finalist" from Results, the Summary and the Sleep Plan (EN/ES),
    with a served-mutation control that reproduces the old route.
  - Focus return for Results, the Summary and the Sleep Plan × {explore, save,
    clear} × {Escape, return control, close button, pointer click}, with Tab
    continuing outside the workspace and a served-mutation control.
  - Viewed-versus-saved history on the Summary and Sleep Plan (EN/ES), plus a
    check that the take-home preview is byte-identical to a customer who never
    opened payments.
  - A figure scan over every detail (hidden panels included), every comparison
    pair, every topic and the items view, with planted-figure controls on
    each surface.
  - Measured 44px targets, computed touch-action, and horizontal clipping and
    label overflow in six views at 1194x834, 1024x768 and 834x1194, EN/ES.
  - Language switch with a real saved preference, comparison and topic.
  - Forced-colors cues checked where they live (the viewed row's border; the
    saved row's icon border and state text).
- `tests/mutation_sweep.mjs`: entries 794–796 cover provider identity, the
  stored-node close and the by-id step (observer: the payment suite). Run
  alone with `--from 794` on 2026-09-30: baseline green, 3/3 caught. The first
  run found the by-id step surviving, which led to the §31 test above. The
  Sleep Plan finalist route has no sweep entry: its only observer is the
  rendered suite, which runs about 212s, past the sweep's 180s per-observer
  timeout. A trial entry made the sweep baseline red, so the route is proved
  by the rendered suite's own served-mutation control instead.

Mutation sweep record (corrected): the 2026-09-28 run caught 716 of 793
entries on a disposable copy, and the memory reaper stopped it at entry 717.
The 77 entries it did not run (717–793) span:

| Entries | Area |
| --- | --- |
| 717–727 | Email delivery, live-send and send harness |
| 728–733 | Promotion panel contrast and the demo builder |
| 734–742 | Sleep System presentation (F1/F2) |
| 743–750 | Device rehearsal server |
| 751–755 | Results/drawer tray clearance (DR-01) |
| 756–757, 776 | Mapper |
| 758–763 | Mattress comparison modal |
| 764–767 | Pillows |
| 768–769 | Quantity focus |
| 770–775 | Website admission |
| 777–779 | Website preview |
| 780–782 | Quote lines |
| 783–786 | Take-home quantities |
| 787 | Email packet |
| 788–793 | Code.gs |

The earlier description ("delivery, website admission and Code.gs; none
touched by this slice") was wrong. This slice also edits
`tests/sleep_system_presentation_check.mjs`, which observes entries 734–742.
**A complete sweep has not been run on any version of this slice.** It
remains required against the final candidate, after the walkthrough.

## Portrait correction (2026-09-30, after Blake's iPad walkthrough)

**Finding.** In portrait, tapping an option opened its panel below the option
list. Its actions (Consider / Compare with… / Hide details) were below the
screen, and nothing scrolled to them. Blake found them in landscape.

**Correction.** Applies in the stacked layout only, gated on the CSS's own
query `(max-width: 900px), (orientation: portrait)`, so landscape never
scrolls.

- **Explicit open** (`reviewPaymentPath`) brings the stage to the top: the
  purchase strip, then the panel heading. On a keyboard open, focus moves to
  that heading (now `tabindex="-1"`), so focus is never left on a row scrolled
  out of view.
- **Explicit Hide details** returns to the option's row; on a keyboard press,
  focus goes to that row.
- **Compare with…** brings the pick prompt in the list into view. Picking a
  counterpart, cancelling, or Done comparing brings the stage back. On a
  keyboard press, Done comparing focuses the panel heading instead of an
  off-screen row.
- **No scrolling on** save, clear, language switch or repaint.
- **Reduced motion** jumps instead of smooth-scrolling.

Nothing at the top is sticky in the stacked layout. The preview-only rehearsal
banner is not compensated for in production CSS.

**Tests.** `tests/payment_workspace_check.py` section 13 checks:

- Every option at 834×1194 and 768×1024, EN/ES: the heading is in view and
  unobscured (an `elementFromPoint` hit test), and the actions are in view
  whenever the panel fits.
- Save, clear and repaint move nothing.
- A language switch keeps the panel in view. Near the end of the scroll range
  the reflow can clamp by a line or two.
- Hide details returns to the row; Compare pick prompt, comparison and Done
  each come into view.
- Keyboard: the heading takes focus, Tab continues into the panel, and Hide
  details returns focus to the row.
- Reduced motion: the jump is immediate.
- Landscape: no scroll of the sheet or the list.
- A served-mutation control proves the check is not vacuous.

**Sweep coverage.** The suite's new `--only nav` mode runs sections 6 and 13
only, in about 110s. It is the mutation sweep's observer for the finalist
route and the portrait reveal (entries 794–795). This resolves the conflict
between the full suite's ~212s run and the sweep's 180s per-observer limit
without changing the limit.

**Runner change.** `tests/mutation_sweep.mjs` now reports an entry whose
observers were only killed (timeout or signal) as **ERRORED**, separately
from caught and survived. Previously such an entry counted as caught. Any
errored entry makes the sweep exit non-zero, and
`tests/mutation_manifest_check.mjs` pins that exit rule.

**Copy.** Blake approved the three provider-neutral sentences exactly as
shown to him in-session (EN and ES), on 2026-09-30. The Spanish still needs
native review before launch.

**Final verification (2026-10-01).** CI mirror, all 67 steps before the sweep:
passed. Full mutation sweep: 798/798 caught, 0 survived, 0 errored, 0 not
applied, 0 unrun. It completed in two segments on the same tree after a
low-memory stop; entries 746–747 timed out once under memory pressure and
were caught on the resumed run (`--from 746`). The portrait fix has not yet
been re-checked on a physical iPad.

## Device and review status (2026-10-01)

This supersedes the "has not yet been re-checked" line above and the
2026-09-28 status list.

- **Physical iPad Safari:** the full walkthrough passed on 2026-09-30, apart
  from one portrait finding, which was then fixed. **The portrait fix was
  re-checked on Blake's iPad on 2026-10-01 and passed** ("all good"). These
  are owner-reported results from Blake's own device, recorded in the hub
  handoff.
- **Native Spanish review and VoiceOver:** see "Reconciled status" at the end
  of this record, which supersedes the earlier wording of this bullet.

## Audit fixes (2026-10-01, Codex independent audit)

All three findings were reproduced with Codex's `probe.py` before the fix,
then re-run after it.

1. **The drawer's inert state is preserved.** Opening payments now uses the
   session-safety dialog's ownership pattern (`finWsInertBackground`): every
   body sibling except the workspace and its backdrop becomes inert. That
   includes an open mattress drawer, so it is isolated while payments is open.
   - Anything already inert is skipped and never released by payments. One
     example is Results, whose inert is owned by the open drawer.
   - `finWsReleaseInert` releases only what payments itself changed.
   - An exception: if an element's own dialog lifecycle hid it while payments
     was open, it keeps its inert. This covers the wipe closing the drawer;
     the test is `aria-hidden` becoming `"true"` after it was `"false"` when
     payments opened.
2. **The workspace language switch follows `store-config.languages`.**
   `applyLanguageConfig` now applies the welcome and utility rule to
   `#finWsLang`: a single configured language, or a missing field, hides the
   switch. Each button is also shown only if its own language is configured.
3. **Saved-picks escape closed** (inherited from base `c4afdc3`). The pill,
   compare tray, utility bar and every screen are body siblings, so all of
   them are now isolated. Tab cannot leave the workspace, and the pill can no
   longer change the screen underneath.

**Tests.** `tests/payment_workspace_check.py` section 14 (`--only isolation`,
about 77s) covers:

- Isolation from Results, the Summary and the Sleep Plan, EN/ES: nothing
  behind payments is exposed; the pill cannot change the screen; 45 Tab
  presses stay inside the workspace; and closing restores exactly the prior
  inert set.
- Payments opened from the drawer, closed with Escape, the close button and
  the return control, EN/ES. While payments is open, the drawer is isolated
  and Results stays inert. After closing, the drawer is usable, Results is
  still inert, focus is on the drawer's opener, and the inert set is
  unchanged. The drawer then closes normally.
- Nested reset by `startOver()` and by timeout expiry: payments and the
  drawer both close, and only the closed dialogs stay inert.
- The timeout warning over payments: after Continue, payments is still fully
  isolated, and closing it restores the original state.
- `languages` set to `['en']`, missing, `['es']`, and `['en','es']`.
- Four served-mutation controls, plus matching sweep entries 799–802.

**Final verification of the audit fixes (2026-10-01):**

- **CI mirror** (`run_full_suite.ps1 -KeepGoing -SkipMutationSweep`): PASSED,
  64 checks plus integrity guards (all 70 steps). The full rendered workspace
  suite passed 446/446.
- **Full mutation sweep**, run on the same tree as two parallel shards to work
  within this computer's memory: entries 1–400 caught 400/400, and entries
  401–802 caught 402/402. **802/802 caught, 0 survived, 0 errored, 0 not
  applied, 0 unrun.** Both shard baselines were green.
- **Sweep runner change:** `tests/mutation_sweep.mjs` gained `--to M`, which
  ends the selection at entry M. Disjoint `--from`/`--to` ranges run as shards
  that together cover the manifest, each with its own sandbox and baseline.
  An out-of-range `--to` is refused with exit 2.

## Reconciled status (2026-10-01, close-out)

This is the current state. Where it differs from an earlier section of this
record, this section wins.

### Code identity

- Branch `claude/payment-choice-workspace`, HEAD and base
  `c4afdc3c528e6265f46dc9de0fc3e69ee057df18`. Everything is uncommitted:
  25 modified files and 2 untracked.
- Combined SHA-256 of all 26 changed files other than this record:
  `9ee522a0742f2be5db678ea61659897573146e6abadc9f39221516295693ddd7`.
- `index.html` SHA-256:
  `03b285c2036eea670de706261c294e228c6ddd5a4cabd3f2c4a493d6db86b6c0`
  (last modified 2026-10-01 18:58).
- The per-file hashes and the script that produces them are in the hub:
  `verification-2026-10-01-audit\code-identity-2026-10-01.txt` and
  `code_identity.py`.
- **This record was edited after all testing**, which is why the identity
  above excludes it. No test reads this file.

### What was run, on what

All commands were run from the worktree root with Python 3.14.7.

1. **Final CI mirror**
   - Command: `powershell -NoProfile -File tools/run_full_suite.ps1 -KeepGoing -SkipMutationSweep`
   - Tree: the final tree (identity `9ee522a0…`).
   - Result: **PASSED, 64 checks plus integrity guards; 70 of 70 runner steps.**
   - Selected suites inside that run: payment workspace 446/446, payment
     choice 484/484, mutation manifest 75/75, lineage 10/10.
   - Log: `full-mirror-final-tree-2026-10-01.log`.
2. **Full mutation sweep, as two parallel segments**
   - Commands: `node tests/mutation_sweep.mjs --from 1 --to 400` and
     `node tests/mutation_sweep.mjs --from 401 --to 802`.
   - They ran at the same time as an earlier mirror run
     (`-SkipMutationSweep`, also passed 64 checks), to fit this computer's
     memory. This was not one uninterrupted sweep.
   - Tree: identical to the final tree except for
     `tests/mutation_manifest_check.mjs`, which gained the `--to` tests
     afterwards. That file is not an observer of any sweep entry.
   - Result: **1–400 caught 400/400; 401–802 caught 402/402. 802 of 802
     caught, 0 survived, 0 errored, 0 not applied, 0 unrun.** Both baselines
     were green.
   - Coverage check: the result rows of the two logs, joined, equal the
     802-entry manifest in order, once each
     (`verify_sweep_logs.py`, output in `sweep-coverage-verification.txt`).
   - Logs: `mutation-sweep-1-400.log`, `mutation-sweep-401-802.log`.
3. **`--to` audit**
   - Command: `node tests/mutation_manifest_check.mjs` (75/75).
   - Its new section F runs a planted four-entry manifest with marker
     observers. It proves, by which observers actually executed:
     - inclusive bounds for seven `--from`/`--to` combinations;
     - the selected-entry count in the summary;
     - a baseline that covers exactly the selected entries' observers;
     - two disjoint shards covering every entry once;
     - seven malformed or reversed ranges refused with exit 2 before any
       observer runs.
   - Two negative controls (an exclusive upper bound; a baseline taken from
     the whole manifest) are detected.
4. **Browser evidence** (Playwright headless Chromium over loopback HTTP):
   screenshots and logs in the hub folders `verification-2026-09-30\`,
   `verification-2026-09-30\portrait-fix\` and
   `verification-2026-10-01-audit\screenshots\`. No console or page errors
   in any capture run.

### Device and human review

- **iPad walkthrough (Blake, physical iPad Safari, 2026-09-30):** steps 1–11
  passed, with one portrait finding.
- **iPad portrait re-check (Blake, 2026-10-01):** passed ("all good"). This
  covers the portrait correction only.
- **The three audit fixes that came after it** (drawer inert ownership, the
  workspace language rule, background isolation including the saved-picks
  pill) **have NOT been checked on a physical device.** They are verified in
  automated Chromium only. The drawer-financing and single-language paths are
  not enabled in the shipped configuration.
- **Native Spanish review and VoiceOver: owner-reported passed, details not
  specified.**
  - Blake typed "1 and 2 pass" on 2026-10-01, in reply to a list reading
    "1. Native Spanish review of the new and changed wording. 2. VoiceOver
    pass."
  - Asked twice afterwards, he chose "Keep as passed" and then "Passed, no
    details".
  - Who reviewed the Spanish, which strings or screens were reviewed, and
    which device and flows VoiceOver covered were not stated.
  - Neither was observed by Claude.
  - Both statements predate the three audit fixes, which change focus and
    isolation behaviour and add no copy.
  - The project-wide requirement for native Spanish review before showroom
    authorization (owner ruling 2026-09-20) is a separate sign-off and is not
    changed by this.

### Review against CODE_REVIEW.md

No blockers found.

- Scoring, quiz, mattress data, recommendation baselines, `Code.gs` and the
  allowed-hosts file are untouched.
- The code added to `index.html` contains no retailer or lender literal and
  no storage, network or reload call.
- Every gate is closed in the generated config: `gasUrl` blank, discount
  disabled, `exactPromotionsEnabled` false, pricing `enabled` and
  `displayEnabled` false, promotion `scenarios` empty, drawer and Sleep System
  financing surfaces false, no plan with payment calculation enabled.
- Generated files trace to their sources (lineage check 10/10; demo rebuilt
  with `python tools/build_black_friday_demo.py`).
- English and Spanish dictionaries carry the same 198 keys; every financing
  copy entry has both languages.

Residual risks:

- No physical-device check of the audit fixes (above).
- Safari and WebKit were exercised only by Blake's hands-on checks; all
  automated evidence is Chromium.
- While payments is open, the data-error and privacy overlays are inert like
  everything else behind it. Neither can be opened from the workspace.
- The full rendered workspace suite took 389 seconds in the final mirror,
  longer than the sweep's 180-second observer limit. The sweep uses its focused
  `--only nav` and `--only isolation` modes instead.

### Readiness

Ready for a commit and a draft pull request when Blake asks for them. Not
authorized for merge, deployment, showroom use or any live activation.
