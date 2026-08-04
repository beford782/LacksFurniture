# DreamFinder rebuild roadmap — Lacks deployment

**Status: LIVING DOCUMENT. Phase 0 in progress; Phases 1–3 approved in shape,
not in detail.** This is the durable plan of record for the rebuild agreed on
2026-08-04. It supersedes ad-hoc session notes. When a phase item ships, update
its status line here in the same commit.

**Last updated:** 2026-08-04
**Baseline:** `94eab0d` (origin/main — merge of PR #10, specialist agenda)
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

**Shipped 2026-08-04 (this branch).** Building the specialist agenda (`2b34e7a`)
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

### 0.2 — This roadmap ✅

**Shipped 2026-08-04 (this branch).** The document you are reading.

### 0.3 — `showScreen()` moves focus and announces ⬜

Screen transitions currently change content without moving focus or announcing
the change, so assistive technology users are stranded on a control that no
longer exists. `showScreen()` must move focus to the new screen's heading and
announce the transition.

**Constraint that makes this non-trivial:** the app already has a live region
used by the handoff screen, and `928f2ca` deliberately kept the sheet's agenda
toggles *out* of it. A screen-level announcer must not resurrect that coupling,
and must not fire during a session wipe — `tests/session_async_check.mjs`
already pins that no post-wipe async work may compose an utterance for the
previous customer.

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

Handoff copy must read as **implication, not diagnosis**. The quiz collects
health conditions (snoring, reflux, back pain) and the app must never phrase
its output as a clinical finding about the customer. This is a copy change in
`store-config.json` `text` / `text_es`, not an app-code change.

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
- **quote-only fallbacks** where a price is not verified;
- **freshness, ownership and emergency-disable controls**, following the pattern
  financing already uses (`verifiedAt` + `maxAgeDays` + allowlisted `sourceUrl`,
  fail-closed);
- **no customer-facing output yet.**

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

1. ✅ **Small analytics/roadmap closeout PR** — Phase 0.1 + 0.2.
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

Line references are to the tree as of this commit and will drift; the
surrounding code excerpts are the durable anchor.
