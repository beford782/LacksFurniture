# DreamFinder rebuild roadmap — Lacks deployment

**Status: LIVING DOCUMENT. Phase 0 in progress; Phases 1–3 approved in shape,
not in detail.** This is the durable plan of record for the rebuild agreed on
2026-08-04. It supersedes ad-hoc session notes. When a phase item ships, update
its status line here in the same commit.

**Last updated:** 2026-08-04
**Baseline:** `5a9cd10` (origin/main — merge of PR #11, this roadmap's first
commit). Findings in the evidence appendix were established against `94eab0d`,
its parent, and re-checked against this baseline.
**Scope:** the Lacks deployment. Anything here that is not store-specific should
migrate back to the WGR template, but that migration is out of scope until
Phase 1 lands.

---

## What this document is for

The rebuild is four phases of genuinely different character, and the failure
mode is treating them as one undifferentiated backlog:

- **Phase 0** is defect and foundation work. Small, verifiable, no design input.
- **Phase 1** is the visible redesign. This is the substantial one — it changes
  what the customer and the salesperson actually see on every screen.
- **Phase 2** is price and payment integration. It builds dark, ships silent,
  and activates only behind business and legal gates.
- **Phase 3** is structural. It changes recommendations or the journey, so it
  requires evidence, not judgement.

The sequencing rule that matters: **Phase 3 items must not be bundled into
Phase 1.** A visual redesign that also silently changes which mattress is
recommended cannot be evaluated, because a reviewer cannot tell whether a
different top pick came from the new card design or from the scoring change.

### Status legend

| Mark | Meaning |
|---|---|
| ✅ | Shipped and verified on `main` |
| 🔨 | In progress on a branch |
| ⬜ | Approved in shape, not started |
| 🔒 | Blocked on an approval, a decision, or evidence |

---

## Invariants — these hold across every phase

None of these are negotiable by a redesign. Every phase item below is
constrained by all of them.

1. **Sleep fit first, payment choice second.** Financing never affects scoring,
   tier assignment, ranking, or the Sleep Brief. Pinned by
   `tests/scoring_isolation_check.mjs`.
2. **The store-agnostic boundary.** `index.html` contains no retailer name,
   colour, product, or code. New redesign copy is config-driven or it is a
   defect. Redesigns are the most common way this rule gets broken — a hardcoded
   heading is still a hardcoded heading.
3. **Bilingual by construction.** Every new user-facing string ships `en` and
   `es` together. A redesign that lands English-only is not done.
4. **The customer session is memory-only.** No new persistence, no new analytics
   field, no new payload key without review. `localStorage` is for staff/device
   state only.
5. **Diagnostics are allowlisted per event and value-validated.** See the
   analytics contract note in Phase 0.1 — this invariant is now enforced by set
   equality, not by name-by-name assertions.
6. **The kiosk collects no financial data.** Applications happen only on
   approved external Lacks/lender pages.
7. **Touch handling and `window.startOver()` are not to be refactored casually.**
   Both cost significant debugging to get right.

---

## Phase 0 — finish the foundation

Small, verifiable work. No design input required. This phase closes out before
Phase 1 design work begins, because Phase 1 will touch the same screens and
should not have to merge around known defects.

### 0.1 — Agenda analytics/test drift ✅

**Fixed in PR #11, merged to `main` as `5a9cd10` on 2026-08-04 and published by
the Pages deploy for that commit; the guard was then hardened in PR #12 after
review found it incomplete** — see the end of this item.
Building the specialist agenda (`2b34e7a`)
renamed two financing events at their call sites but left `EVENT_FIELDS`
declaring the old pair:

```
financing_interest_changed    ->  financing_agenda_changed
financing_followup_requested  ->  financing_agenda_reviewed
```

Because `redact()` treats an undeclared event as unknown and keeps only its
name, **both live agenda events were emitting `{_dropped: 4}` and nothing
else** — placement, language and layout, the entire reason the events exist,
never survived. All eighteen suites stayed green, and `tests/smoke_check.py`
asserted the presence of the two *dead* names, so it was passing on the wreckage
of what it meant to verify.

The durable fix is not the four corrected strings; it is the set-equality
invariant now in `tests/session_async_check.mjs`, which holds the call sites and
`EVENT_FIELDS` equal **in both directions**:

- logged but undeclared → the event silently loses its whole payload
- declared but never logged → dead contract surface outliving its code

Verified to fail on the defect before the fix was applied. `offerVersion`
remains deliberately redacted on every financing event — that is an existing
privacy decision pinned by test, not drift.

**PR #12: the guard had to fail closed.** As merged in PR #11, the scanner
recognised single-quoted event literals only, so
`analytics.log("new_event", payload)` was found as a call but yielded no name —
and because a newly added event has no stale `EVENT_FIELDS` entry either, both
equality assertions still passed while `redact()` dropped the event's whole
payload. The guard reproduced the very defect it existed to prevent. Measured,
not assumed: against a tree carrying that call, the original scanner reported
31 names and no problem, the corrected one reported
`PAYLOAD DROPPED FOR: brand_new_event`.
It now parses single-quoted, double-quoted and
un-interpolated template literals, supports the conditional form, and treats
**any** first argument it cannot statically enumerate — dynamic identifier,
interpolated template, concatenation, call expression, unterminated literal — as
a failure rather than a silent zero-name contribution. Nineteen executed
mutations cover the failure modes in both directions.

### 0.2 — This roadmap ✅

**Added in PR #11, merged to `main` as `5a9cd10` on 2026-08-04; corrected in
PR #12.** The document you are reading.

### 0.3 — `showScreen()` moves focus and announces ⬜

`showScreen()` (`index.html:11859`) swaps the `.active` class, retranslates,
toggles chrome and scrolls to top. It never moves focus and never announces, so
an assistive-technology user is left on a control that no longer exists.

**Do not specify "focus the screen heading."** The eight screens do not all have
one. `welcomeScreen` is a `<main class="main screen active">`; `questionScreen`
and `reviewScreen` lead with `h2`; `profileScreen`, `resultsScreen`,
`emailScreen` and `accessoriesScreen` lead with `h1`; and **`hf2Screen` has no
rendered heading at all**. A universal heading rule is unimplementable on at
least one screen and would invent headings on others purely to satisfy it.

**Destination policy:**

1. Prefer a meaningful *rendered* heading when the screen has one — rendered,
   because several headings are populated at runtime and an empty element is
   not a destination.
2. Otherwise focus the active screen container. `focusActiveScreen()`
   (`index.html:17302`) is already that primitive: it selects `.screen.active`,
   adds `tabindex="-1"` when absent, and focuses. Reuse it rather than writing
   a second one. The container needs an appropriate **bilingual accessible
   name**, which is config-driven copy, not a hardcoded English string.

**Refuse to move focus at all when:**

- a safety dialog or the mattress drawer owns focus — the dialog runs its own
  focus trap (`safetyKeydown`, `index.html:17311`) and stealing focus from it
  would break the trap and the modal's containment;
- the transition is a wipe/reset, where no announcement is appropriate and
  announcing anything risks describing the previous customer's session;
- the destination is `hidden` or `inert` — the existing visibility helper
  already rejects an element inside `[hidden], [inert]`, and focusing an inert
  target silently does nothing while the announcement still fires.

**Deferred announcements must revalidate at callback time**, not at schedule
time: both the session identity and the active language can change between the
two. `928f2ca` deliberately kept the sheet's agenda toggles out of the handoff
live region, and `tests/session_async_check.mjs` pins that no post-wipe async
work may compose an utterance for the previous customer. A screen-level
announcer must satisfy both without resurrecting that coupling.

### 0.4 — Recovery from the data-error overlay ⬜

The data-error overlay is currently a dead end: if `mattresses.json`,
`store-config.json`, `quiz.json` or the dictionary fails to load, the kiosk
displays an error and offers no route out. On a showroom floor that is a tablet
that stays broken until someone notices. Add an explicit retry, and a route to
a clean restart.

### 0.5 — Move the priorities block to handoff and email ⬜

The audit measured an 86-word priorities block on the Sleep Brief. It is
salesperson- and follow-up-grade content, not customer-facing reading load at
the moment of orientation. Move it to the handoff screen and the results email;
remove it from the Sleep Brief.

This is a prerequisite for Phase 1's Sleep Brief word-count target, and it is
listed in Phase 0 because it is a *move*, not a redesign.

### 0.6 — Replace medical-sounding handoff language ⬜

Handoff copy must read as **implication, not diagnosis**. The app must never
present its output as a clinical finding about the customer.

**Where the language actually comes from — verified, and not where an earlier
draft of this document said.** The handoff Profile row is built at
`index.html:16152` as `position · conditions · firmness · temperature`, and the
condition strings are resolved by `answerLabelFor('health_conditions', id)` —
i.e. they are the **quiz option labels themselves**, not store copy. The
offending strings are therefore:

| Option | Label | Sublabel |
|---|---|---|
| `snoring` | Snoring or Sleep Apnea | You or your partner |
| `nerve_pain` | Nerve Pain or Tingling | Shooting pain, numbness |
| `reflux` | Acid Reflux / Heartburn | Burns when lying down |

Concatenated, a handoff reads *"Side Sleeper · Snoring or Sleep Apnea · Nerve
Pain or Tingling · Medium 6/10"* — a clinical summary of a person, handed to a
salesperson. "Sleep Apnea" is a diagnosis the kiosk is in no position to record.

**Canonical source and pipeline.** These labels live in
`incoming/dreamfinder_quiz.json` → workbook **Quiz** tab (JSON envelope) →
`data/quiz.json`. `data/quiz.json` is **generated and must never be hand-edited**;
neither may `data/store-config.json`, which is generated from
`incoming/lacks_store_values.json` (flat dotted keys such as `text.trustSignal`
/ `text_es.trustSignal`) → workbook **Store Info** tab → `data/store-config.json`.
Change the canonical source, regenerate through `build_lacks_workbook.py` then
`tools/convert_store_data.py`, and verify the generated artifacts with the
strict golden bundle rather than inspecting them by eye.

Label text is copy-only variation, which `validate_quiz` permits — it pins ids,
types, option order and `scores`, not label strings. So this is a supported
change.

**But it is not only a relabel, and that is the design question this item has
to answer.** These labels are what the *customer* taps during the quiz, where
plain recognisable language ("Snoring or Sleep Apnea") is exactly what makes the
option findable. Softening them for the handoff would degrade the quiz. If the
handoff needs different phrasing from the quiz — implication rather than
restatement — that is a **handoff-side presentation mapping**: app code plus new
bilingual config keys, not an edit to the shared label. Decide which of the two
this is before writing any copy.

### 0.7 — Preserve session, privacy and financing isolation ⬜

Not a task so much as the acceptance condition for all of Phase 0: the existing
protections stay intact and their suites stay green.

---

## Phase 1 — the visible redesign

**This is the substantial phase.** Everything below changes what is on screen.
None of it changes what is recommended.

### Standing Phase 1 constraint

Every item here is presentation. If a Phase 1 change would alter scoring, tier
assignment, or ranking, it belongs in Phase 3 and needs its own approval.

### 1.1 — Sleep Brief ⬜

Reduce roughly **202 visible words to approximately 113–123** (audit figures).

- Replace the generic heading with a **need-based hero** derived from
  `topPriorities[0]`.
- Use the existing icon system — no new icon vocabulary.
- Add concise **signal badges**: position, temperature, sharing, feel, size.
- Show the customer's firmness on a **visual 1–10 dial** rather than as text.
- Replace prose-heavy priorities with **1–3 ranked priority cards**: icon, rank,
  short title, one-line reason, and a **collapsed "How to test this"** detail.
- Replace procedural prose with a simple **next-step rail**.
- Keep **Edit Answers**; add a clear **Compare My Matches** action.
- **No decorative photography on this screen.**

**Verified: this is mostly a presentation change over data that already
exists.** The scoring pass already computes `topPriorities` (capped at three)
with exactly the fields the card design needs — `name`, `why` (the one-line
reason), `test` (the "How to test this" body), and `kind`
(`need` / `compare` / `preference`, already mapped to distinct tags and colour
classes). A `profileJourneySteps` rail already renders three steps. So the
priority cards and the next-step rail are re-styling and re-structuring, not new
computation. That materially lowers this item's risk.

### 1.2 — Quiz ⬜

- Introduce useful option icons **only after reviewing all 56 for meaning**.
  Verified: the quiz has 12 questions and **exactly 56 options** (11 single- or
  multi-select questions plus the `firmness` slider, which has none), so the
  audit's "all 56" is the complete set and the review is bounded.
- **Suppress** confusing, insulting, or merely decorative icons. An icon that
  characterises the customer is worse than no icon.
- **Test** auto-advance for single-select questions rather than assuming it is
  an improvement. Eleven of the twelve questions are single- or multi-select;
  auto-advance is only coherent for the single-select subset.
- **Preserve current scoring** unless separately approved.

### 1.3 — Results and mattress cards ⬜

- Rework the card hierarchy so a salesperson can present it at a glance.
- Lead with **"why this fits this customer,"** not a wall of generic features.
- Make distinguishing features **scannable**, not paragraph-heavy.
- Give **Compare** a real customer-facing entry point.
- **Reconsider or remove the tier tab bar** while preserving the internal tier
  keys (`gold` / `silver` / `bronze` remain the data contract, and the `tier`
  analytics enum depends on them).
- Avoid labels such as **"entry-level"** that characterise the customer rather
  than the product.
- Keep **sleep fit visually dominant over financing**.
- **Prototype and verify at real iPad dimensions.** The audit settled the
  information priorities, not the pixels.

> **🔒 Blocker discovered 2026-08-04 — "why this fits" has no content to show.**
> Per-feature match reasons are read at `index.html:12318` as
> `m.reasons?.[feat]`, where `feat` is a quiz tag. Across all 26 catalog models
> the **only** populated reason key is `default` — every `reason_cooling`,
> `reason_pressureRelief`, `reason_motionIsolation`, `reason_support` … column
> in `data/mattresses.csv` is empty. So that lookup never resolves, and the only
> match reasons a customer ever sees are the two generic ones: the firmness
> sentence and the locally-made sentence.
>
> Leading the card with "why this fits this customer" therefore requires
> **authoring the per-feature reason content first**. This is a catalog content
> task for Lacks, not an app-code task, and it should start early because it
> gates the most valuable part of the card redesign.

### 1.4 — Sleep System ⬜

Still the largest reading load in the app — the audit measured roughly **976
words across four steps**.

- Rebuild its feature cards for **salesperson-led scanning**.
- Reduce repeated instructions and disclosure prose.
- **Separate customer-facing benefits from salesperson procedure.** Much of the
  976 words is procedure the customer does not need to read.
- Keep product distinctions, prices, and selection state clear.

### 1.5 — Financing footprint ⬜

- **Keep** the new Payment Choice agenda as built.
- Retain **Results + Payment Choice sheet + Handoff** as the core surface.
- **Remove or config-disable** duplicate financing content in the mattress
  drawer and the Sleep System.
- Keep financing orientation **separate from sleep-fit scoring** (Invariant 1).

Removing a placement has an analytics consequence: `placement` is a closed enum
(`results`, `drawer`, `handoff`, `sheet`, `mexico`, `sleep-system`). Retiring
the drawer and sleep-system placements means retiring their enum values, and the
Phase 0.1 set-equality invariant will catch it if the events and the contract
drift apart again.

---

## Phase 2 — price and payment integration

**Build dark first. No customer-facing output in the first stage.**

### 2.1 — The dark framework ⬜

Ship the whole mechanism with nothing rendered:

- verified **SKU/size prices**;
- approved **plan calculation modes**;
- **freshness, ownership and emergency-disable controls**, following the pattern
  financing already uses (`verifiedAt` + `maxAgeDays` + allowlisted `sourceUrl`,
  fail-closed);
- **no customer-facing output yet.**

**Two unavailability states, and they are not interchangeable.** Collapsing them
is how a kiosk ends up implying it knows a price it does not have:

| Condition | State | What is shown |
|---|---|---|
| The **product price** is missing, stale, or not approved | *price unavailable* | No numeric payment result of any kind. An explicit missing-price state — never a payment figure, never an estimate derived from a substitute price. |
| The **plan** has no approved payment calculation model, but an approved product price exists | *quote-only plan* | The price may be shown per Phase 2.2; no calculated periodic payment is shown, because the formula is not approved — not because the price is unknown. |

"Quote-only" is a property of a **financing plan**, never a fallback label for an
unverified price. A quote-only plan with a good price and a plan with no usable
price are different failures with different remedies, and a customer told
"ask us for a quote" when the real problem is a stale price receives a false
signal about what the store knows.

The existing financing freshness gates are the model to copy, and
`validate_financing` already enforces the V1 invariant that no product-level
monthly payment is calculated or shown. Phase 2 is the deliberate, gated
relaxation of that invariant — it must not happen by accident, and the validator
must be updated in the same change that relaxes it.

### 2.2 — Activation 🔒

**Only after business and legal approval:**

- show a verified **cash-price or price-range anchor**;
- show **illustrative periodic payments only for plans with approved formulas**;
- **preserve the plan's actual payment period** rather than forcing everything
  into "monthly" — a lease-to-own plan billed every two weeks is not a monthly
  plan and must not be displayed as one;
- keep **lease-to-own and credit visibly distinct**;
- show **required disclosures beside the amount**, not behind a link.

---

## Phase 3 — structural changes requiring evidence

These change recommendations or the journey. None of them may be bundled into
the Phase 1 visual redesign.

### 3.1 — Scoring case-fold defect 🔒

**Requires explicit approval — recommendations will change.**

Verified 2026-08-04. Feature matching at `index.html:12312` is an exact,
case-sensitive test:

```js
if (m.features?.includes(feat)) { ... }
```

`quiz.json` emits camelCase tags; the shipped catalog vocabulary is lowercase.
Two tags have exact case-variants in the catalog and therefore **never score**:

| Quiz tag | Catalog spelling | Models carrying it | Points currently awarded |
|---|---|---|---|
| `motionIsolation` | `motionisolation` | 3 / 26 | 0 |
| `pressureRelief` | `pressurerelief` | 13 / 26 | 0 |

Ten scoring rules across five questions feed these two tags — including
`partner_disturbance: yes_often` (+4), `sleep_issues: hip_pain` (+3),
`sleep_position: side` (+2) and `body_type: different` (+2). All of them are
currently dead. With `FEATURE_CAP = 5`, fixing this adds up to +5 to the 3
motion-isolation models and up to +5 to the 13 pressure-relief models.

That is bounded against firmness (max +50) and locally-made (+25), but because
**half the catalog** carries `pressurerelief`, it will reorder results for side
sleepers, hip-pain and stiffness answers — which is exactly the population the
tag exists to serve. Expect the top pick to change for some answer sets.

Six further quiz tags (`adjustable`, `comfort`, `durable`, `hypoallergenic`,
`memory`, `quality`) match **no** catalog feature in any casing. That is a
separate vocabulary gap, not a case-fold bug, and needs its own decision:
populate the catalog, or retire the tags.

**Do not fix this as a drive-by.** Fixing casing, fixing the vocabulary gap, and
redesigning the cards are three changes whose effects are indistinguishable if
they ship together.

### 3.2 — Global `maxScore` and tier restructuring ⬜

`maxScore` is currently computed per tier (`index.html:13795`), so a "96% match"
in Bronze and in Gold are not the same measurement. Evaluate a global maximum,
and evaluate whether the three-tier structure earns its place — this interacts
directly with Phase 1.3's proposal to remove the tier tab bar, and the two
should be decided together even though they ship apart.

### 3.3 — Richer persistent identity bar ⬜

Consider, do not assume.

### 3.4 — Journey changes tested with real sessions 🔒

Auto-advance (Phase 1.2) and any larger journey change need real
salesperson/customer sessions before adoption. Do not infer showroom behaviour
from a desk.

---

## Sequence of record

1. ✅ **Analytics/roadmap closeout** — Phase 0.1 + 0.2. PR #11 (merged as
   `5a9cd10`) fixed the event drift and added this roadmap; PR #12 made the
   event-set guard fail closed and corrected the roadmap's focus, data-source
   and pricing-terminology entries.
2. ⬜ **Finish the remaining Phase 0 defects** — 0.3 through 0.7.
3. ⬜ **Execute the redesign** — text, Sleep Brief, cards, comparison
   (Phase 1). Start the catalog reason-content authoring (1.3 blocker) in
   parallel, since it gates the card work and is not an engineering task.
4. ⬜ **Build the dark pricing/payment foundation** — Phase 2.1.
5. 🔒 **Activate prices and payments** — Phase 2.2, after the business and legal
   gates.
6. 🔒 **Consider scoring and tier structural changes last** — Phase 3.

---

## Evidence appendix — verified 2026-08-04

Findings established by direct inspection of the tree at `94eab0d`, as distinct
from the audit's measurements (word counts, which are cited as audit figures):

| # | Finding | Where |
|---|---|---|
| 1 | Both agenda analytics events emitted `{_dropped: 4}` — full payload loss | `index.html` `EVENT_FIELDS` |
| 2 | `smoke_check.py` asserted the two dead event names, passing for the wrong reason | `tests/smoke_check.py:326` |
| 3 | `offerVersion` redaction is deliberate and test-pinned, not drift | `tests/session_async_check.mjs` |
| 4 | Quiz has exactly 56 options across 12 questions (11 choice + 1 slider) | `data/quiz.json` |
| 5 | `topPriorities` already carries `name` / `why` / `test` / `kind` — Phase 1.1 is re-styling | `index.html:12692` |
| 6 | A next-step rail already exists (`profileJourneySteps`) | `index.html:12764` |
| 7 | Per-feature match reasons never render: only `default` is populated, for all 26 models | `data/mattresses.csv`, `index.html:12318` |
| 8 | `motionIsolation` / `pressureRelief` never score — case mismatch against catalog | `index.html:12312` |
| 9 | Six quiz tags match no catalog feature in any casing | `data/quiz.json` vs `data/mattresses.json` |
| 10 | `maxScore` is per-tier, so match percentages are not comparable across tiers | `index.html:13795` |

Added by PR #12, verified against `5a9cd10`:

| # | Finding | Where |
|---|---|---|
| 11 | The guard as merged in PR #11 missed double-quoted event literals, so a new event escaped both equality checks — the defect the guard exists to prevent | `tests/session_async_check.mjs` |
| 12 | There are 8 screens; `welcomeScreen` is a `<main>`, and `hf2Screen` renders **no** heading — so "focus the heading" is not universally implementable | `index.html:9506`, `9862` |
| 13 | `focusActiveScreen()` already provides the container-focus primitive (`.screen.active`, `tabindex="-1"`, focus) | `index.html:17302` |
| 14 | `showScreen()` moves no focus and makes no announcement | `index.html:11859` |
| 15 | Handoff condition strings are quiz option labels via `answerLabelFor`, not store copy — canonical source is `incoming/dreamfinder_quiz.json` | `index.html:16152` |

Line references are to the tree as of this commit and will drift; the
surrounding code excerpts are the durable anchor.
