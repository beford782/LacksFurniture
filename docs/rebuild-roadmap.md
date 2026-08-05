# DreamFinder rebuild roadmap — Lacks deployment

**Status: LIVING DOCUMENT. Phase 0 in progress. Phases 1–3 are a plan of intent,
not a grant of approval — see the open-decisions register.**

**Last updated:** 2026-08-05
**Baseline:** `572d405238a16649dfe7e64288637ae6e5b4a1bc` — GitHub `main`, the merge
commit of PR #15 (2026-08-05). GitHub state is authoritative; a local checkout
never is.
**Next implementation item:** Phase 0.6. Phase 0.5 ships in the PR that carries
this revision; 0.4's code is merged and the item holds at ⏳ on its outstanding
hardware verification, so it does not come back round as the next item.

**Scope:** the Lacks deployment. Migrating store-agnostic work back to the WGR
template is a real goal but has no owner, no phase and no schedule here; treat it
as out of scope until someone gives it one.

---

## What this document is for

The rebuild is four phases of genuinely different character, and the failure mode
is treating them as one undifferentiated backlog:

- **Phase 0** — defect and foundation work. Small, verifiable, and either
  mechanical or already decided.
- **Phase 1** — the visible redesign. Presentation only.
- **Phase 2** — price and payment. Builds dark, ships silent, activates only
  behind business and legal gates.
- **Phase 3** — structural. Changes what is recommended, so it requires evidence
  and Blake's sign-off.

The sequencing rule that matters: **Phase 3 items must not be bundled into Phase
1.** A visual redesign that also silently changes which mattress is recommended
cannot be evaluated, because a reviewer cannot tell whether a different top pick
came from the new card design or from a scoring change.

A second rule, learned the hard way: **no phase may leave `main` in a degraded
state for a later phase to repair.** Where a change removes something the customer
relies on, the removal ships in the same commit as its replacement.

### Status legend

| Mark | Meaning |
|---|---|
| ✅ | Shipped and verified on `main` |
| 🔨 | In progress on a branch |
| ⬜ | Approved to build, not started |
| ◐ | A named output may not ship or merge until its condition is met; listed Proceeds work continues |
| 🔒 | Blocked — no part of this item may start |
| ⏳ | Code merged on `main`; a named verification remains outstanding. Not closed, and not ✅ |
| ❓ | Proposed only. Not approved. Do not implement. |

**Rules for these marks.** ⬜ → 🔨 → ✅ may be moved by whoever does the work.
Moving anything **into or out of ◐, 🔒 or ❓ requires the named approver on that
item** — and that includes editing a ◐ item's Gated or Proceeds lists. Every ◐, 🔒
and ❓ item states who decides and what unblocks it.

**⏳ blocks calling an item done.** Moving ⏳ → ✅ requires the named
verification, recorded on the item.

**Where a mark goes.** Scope (whole item vs a portion) and stage (blocks starting
vs blocks merging) are independent, and one mark cannot carry both.

- **🔒 means no part of this item may start.** It goes on the item's heading.
- **◐ gates a production output, not an activity.** The named output may not
  ship or merge until its condition is met; everything in Proceeds continues,
  including prototypes and branch implementation. It goes on the item's heading
  and is **invalid without both of these directly beneath it**:
  - **Gated** — approver, unblock condition, and what may not be done, written as
    a **property of the output a reviewer can check in a diff**, not as an
    activity.
  - **Proceeds:** what may be done now.

  A ◐ item missing either list, or whose Gated line reads as an intention rather
  than a checkable property, **is read as 🔒**. The default when a mark is sloppy
  is more locked, not less.
- **A gate that applies to every item in a phase is recorded once**, in that
  phase's own gate block, and is not copied onto item headings. A mark carried by
  every heading distinguishes nothing.
- **A phase-wide merge gate is recorded once, in that phase's gate block, and
  nowhere else.** Item Exit lines do not repeat it.
- **A gate a test enforces needs no heading mark**, provided the suite fails
  deterministically on the gated change and the failure names the gate. Name the
  test in the body — the guard is the notice.

**Guards on ◐:** work under Proceeds may not encode an outcome of the gated
decision, ship placeholder content standing in for it, or remove anything the
gated decision might want to keep. If the unblocked portion turns out to require
the gated decision, **the item reverts to 🔒 and goes back to the approver.** A ◐
item's **Exit:** must state what it excludes.

**An entry in the open-decisions register bars adopting or shipping that
decision** — not prototypes, and not work listed under a Proceeds line.

**Merging moves an item to ⏳ automatically** when a named verification on it
remains outstanding.

**"Approved to build" means:** the problem is agreed, the constraints are agreed,
and implementation may begin. It does **not** approve a specific layout, wording,
or component set. Where this document names components, read them as the current
proposal unless the item says otherwise.

---

## The permanent operating premise

**DreamFinder is a salesperson-operated presentation and consultation tool, used
with the customer present.** The salesperson is the primary operator, guide,
narrator and interpreter. Both people normally view the same iPad. The interface
supports a shared, glanceable human conversation and **must not design the
salesperson out of it**.

It must nonetheless remain safe, respectful, accessible, comprehensible and
bilingual **if a customer interacts with it directly**, because they will.

**Sleep fit is primary. Payment Choice is secondary.**

This premise supersedes any older self-service framing, including the
"customers take a 12-question sleep quiz" description in CLAUDE.md, which
predates it. Where the two conflict, this premise governs product direction;
CLAUDE.md continues to govern architecture, i18n and the generated-artifact
pipeline.

Three consequences that change how items below are written:

- "Customer-facing" and "salesperson-facing" are not disjoint audiences on a
  shared screen. Content is not made acceptable merely by moving it to the
  Consultation Summary — both people can see both surfaces.
- Reading load is a cost paid **out loud**, by the salesperson, on every
  presentation. That is the real argument for concision, not a word count.
- A failure the customer can see is a failure in front of a customer. An error
  state is not "a tablet nobody noticed"; it is an interruption of a sales
  conversation.

---

## Invariants — these hold across every phase

None of these are negotiable by a redesign.

1. **Sleep fit is independent of financing.** Financing never affects scoring,
   ranking, tier assignment, the Sleep Brief, or match reasons. Pinned by
   `tests/scoring_isolation_check.mjs`.
2. **Nothing in Phase 0 or Phase 1 changes what the engine computes.** This is
   broader than "scoring": it covers scoring and firmness computation, the
   engine's computed mattress / accessory / priority selection, and ordering,
   tier assignment, caps, filtering and ranking. Any change to what is computed
   is Phase 3 and requires **Blake's sign-off**.

   **Presentation may change which already-computed value is surfaced, and
   where.** It may not change the value, the set it was drawn from, or that set's
   order. Surfacing the engine's top-ranked priority as a hero is a presentation
   change; re-deciding which priority ranks first is not. See Phase 1 constraint
   2, which is where this is enforced.
3. **The store-agnostic boundary.** `index.html` contains no retailer name,
   colour, product or code. A redesign is the most common way this rule gets
   broken — a hardcoded heading is still a hardcoded heading.
4. **Bilingual by construction.** Every new user-facing or salesperson-facing
   string ships `en` and `es` together. A redesign that lands English-only is not
   done.
5. **New copy is config-driven and goes through the pipeline.** Author at the
   canonical `incoming/` source, regenerate via `build_lacks_workbook.py` then
   `tools/convert_store_data.py`, and verify with the strict golden bundle.
   **Never hand-edit** `data/store-config.json`, `data/quiz.json`,
   `data/mattresses.json`, `data/accessories.json` or `data/allowed-hosts.js`.
   `data/dict-en.json` / `data/dict-es.json` are the exception — hand-maintained,
   generic, shared across retailers, and never a home for retailer copy.
6. **The customer session is memory-only.** No new persistence. `localStorage` is
   for reviewed staff/device state only.
7. **Diagnostics are allowlisted per event and value-validated**, and the logged
   event set and `EVENT_FIELDS` are held to set equality in both directions.
8. **The kiosk collects no financial data.** Applications happen only on approved
   external Lacks/lender pages.
9. **Focus, wipe and language safety.** Focus ownership is respected (safety
   dialog, drawer, overlays); no post-wipe announcement; no stale-language
   announcement; every customer-ending path clears the whole session.
10. **Touch handling and `window.startOver()` are not refactored casually**, and
    `location.reload()` is never used.

---

## Phase 0 — finish the foundation

Closes out before Phase 1 implementation begins.

### 0.1 — Agenda analytics contract ✅

**Shipped.** PR #11 (merged `5a9cd10`) corrected an event rename that had left
`EVENT_FIELDS` declaring two retired names while two live events went undeclared —
so both agenda events emitted a drop-count and nothing else. PR #12 (merged
`1aef27d`) then made the guard itself fail closed after review found it recognised
only single-quoted literals and, later, only exact `analytics.log(` spacing.

The durable outcome is Invariant 7: the call sites and `EVENT_FIELDS` are held to
set equality in both directions, and any `analytics.log()` call whose event name
cannot be statically enumerated fails the suite. Implementation and mutation
evidence live in `tests/session_async_check.mjs` and in the PR history; they are
not restated here.

### 0.2 — This roadmap ✅

Added in PR #11, corrected in PR #12, reconciled against the operating premise and
shipped state in PR #14 (merged `7fa8390`, 2026-08-05).

### 0.3 — `showScreen()` moves focus and announces ✅

**Shipped.** Final PR #13 head `1574c53e41c7541f1f8a056f1efbb0bd589809f4`, merged
as `88f1e89882b4da30f7de5da903cea6e66e644549`. CI and the Pages deployment both
succeeded on that merge commit.

**What shipped, so nobody re-derives it wrongly:**

- **Announcement is focus.** There is deliberately **no live region and no
  deferred utterance**. An earlier design deferred a second utterance through a
  live region; it produced a double announcement on named containers ("Sleep quiz,
  region" then "Sleep quiz") and its callback was never bound to the destination
  that scheduled it, so a superseded transition could speak over the screen that
  replaced it. Both were removed at the cause. **Do not reintroduce a deferred
  screen announcer.**
- **Destination policy.** Five screens render their heading before the transition
  and are focused directly: `profileScreen`, `resultsScreen`, `hf2Screen`,
  `emailScreen`, `accessoriesScreen`. `welcomeScreen` has no heading;
  `questionScreen` and `reviewScreen` render theirs *after* the transition, so
  focusing them would announce the previous question or the previous render's
  language. Those three focus their named container instead.
- **Every container is nameable.** All eight carry a nameable role
  (`role="region"`, or `<main>` for welcome) plus a bilingual `aria-label` from
  `data/dict-en.json` / `data/dict-es.json`. A plain `<div>` has the implicit
  `generic` role, which cannot be named, so the label would be discarded.
- **Fail-closed naming.** A missing dictionary entry never becomes the spoken
  name, and a stale label is removed rather than left behind.
- **Refusals**, checked before the move: wipe in progress, safety dialog, drawer
  (`drawer-open`, not `inert`), financing sheet, compare modal, privacy overlay,
  failed data load, either staged reveal. A destination that is already active is
  a re-render, not a transition, and moves no focus.

**Known limitation carried forward:** question-to-question changes are not
announced. See Phase 1.2.

### 0.4 — Recovery from the data-error overlay ⏳

**Code merged: PR #15, merge commit `572d405` (2026-08-05). The item holds at ⏳
— not ✅ — because its named verification is hardware, and that has not
happened.** The retry and clean-restart routes are recorded as unverified on any
device in `docs/kiosk-device-hardening.md`, whose checklist for them stands
unchecked. Reporting 0.4 as done on the strength of the merged PR is a
misreport.

What the merged code carries, against the requirements below:
the loader is extracted from its IIFE into a named, re-invocable `loadAppData()`
driven by a declarative `DATA_SOURCES` table (core vs independently non-fatal
accessories preserved, per-resource so a retry re-fetches only what is missing);
bilingual **Try again** and **Start over** controls on the overlay, the latter
delegating to `window.startOver()` with no second wipe implementation; the
failure flag and the poll counter cleared on recovery; `aria-hidden` restored;
`dataErrorOverlay` added to `SESSION_LAYERS` and `dataErrorLive` to
`SESSION_TEXT_IDS`; and load-generation plus session-epoch guards so a
superseded or post-wipe completion updates state without raising a layer,
announcing, or moving focus. Evidence: `tests/data_error_recovery_check.mjs`
(new, executes the real extracted code; every safety property named above is
mutated and the suite must fail when it is removed) and the wipe matrix in
`tests/session_safety_check.mjs`. The count is deliberately not stated here — it
went stale twice inside three commits, and the property is what matters.

Review rounds after the first implementation added the rest of what "the route
is not recovery if it can be terminal" actually requires, and each came from a
defect found rather than from the original plan: **bounded deadlines** on every
data and dictionary request, because an unbounded fetch on a black-holed
network left the in-flight latch stuck and Retry answering "still trying"
forever; an **applier-aware verdict**, because fetching the data and being able
to render it are different things and a throwing applier reported success;
**mattress schema validation with a narrow assign**, because the scoring pass
iterates every top-level key and the results pass slices all three tiers, both
after the twelfth question and neither wrapped; **dictionary identity**, because
a Spanish request that fell back to English recorded itself as Spanish and was
never retried; and **modal ownership in both directions** — the overlay yields
Tab to a layer above it, and a safety dialog closing over a visible overlay hands
focus to the overlay instead of restoring an opener now behind it.

The overlay was terminal before this item. `showDataError()` set `_dataLoadFailed`,
wrote one sentence, and showed a full-viewport layer that contained **no interactive
element of any kind**. There was no route out: `startQuiz` short-circuited back to
it on every tap, screen-transition focus was refused while `_dataLoadFailed` was
set, and the failure surfaced on Welcome — where the persistent Restart control is
deliberately hidden. With a salesperson and customer both looking at it, this was a
dead tablet mid-conversation.

Requirements:

- An explicit **retry** that re-fetches the failed resources. **Not
  `location.reload()`** — Invariant 10, and the file currently has zero violations
  of it. The loader is presently an IIFE and would need extracting into a named,
  re-invocable function.
- A route to a **clean restart**.
- **Reset the failure state on success**: `_dataLoadFailed` is currently set once
  and never cleared, and the retry-attempt counter needs the same treatment.
- **Clear the overlay** — remove its visible class and restore `aria-hidden`.
- **Add the overlay to the session-layer close list.** It is absent today, so a
  wipe leaves it stranded over a fresh Welcome screen while `focusWelcomeEntry()`
  focuses a Start button underneath it.
- Handle partial failure — one dataset failing is not all of them.
- Accessible status and focus behaviour, bilingual, consistent with 0.3.

**Exit — two conditions, separately satisfied.** The *code* exit is the
requirements above, green suites and a merged PR. The *hardware* exit is the
route verified on the mounted showroom device. They are not the same, and the
first does not imply the second — the same four-way distinction this document
applies to email (UI, payload, activation, verified delivery).

**Status after the code merges: ⏳, not ✅.** 0.4 becomes ✅ only when the retry
and clean-restart routes are recorded as verified on the confirmed mounted
showroom device in `docs/kiosk-device-hardening.md`. That document is marked
blocking for showroom use and records that the tests never established the test
iPad is the mounted device — so **this may not happen on this timeline**.

What ⏳ does and does not block, precisely: 0.5, 0.6 and 0.7 proceed while 0.4
awaits verification, and prototypes and research continue wherever already
allowed. But **Phase 0 cannot close and Phase 1 implementation cannot begin until
that verification is recorded** — the phase sequence is not weakened by this mark.
**Reporting 0.4 as done, shipped or complete on the strength of the merged PR is a
misreport.**

**Documentation obligation:** this adds a session-ending route.
`docs/kiosk-device-hardening.md` records each such route as separately verified on
hardware, precisely because verifying one says nothing about another. 0.4's exit
condition includes adding the new route to that table and re-verifying on the
mounted device.

### 0.5 — Route priorities content to the Consultation Summary and email ⏳

**Ships in the PR that carries this revision (branch
`claude/phase0.5-priority-handoff`); ⏳ reads as "complete on this PR's merge" —
its exit is entirely code-level, so no verification survives the merge the way
0.4's hardware gate does. On merge this item is done and 0.6 is next.**

**What shipped, so nobody re-derives it wrongly:**

- **The engine produces one to three priorities, not always three.** A solo
  side sleeper with no issues and mid firmness yields exactly two. Both new
  surfaces render the engine's count in the engine's order — never padded,
  never synthesised. (The earlier "the three computed priorities" phrasing in
  this section's exit was corrected to match 1.1's "1–3 priority cards", which
  had it right.)
- **The store is the widened `analytics.trialFocus`.** Each element keeps its
  `{en, es}` name pair — so `renderResultsTrialFocus()` and its `L(item)` read
  are zero lines changed — and gains `why: {en, es}` and `test: {en, es}`,
  captured from the bilingual arguments `addPriority` already received and
  discarded. No new session variable, no rank field, no score, no kind: the
  wipe line and its post-wipe assertion were already in place.
- **The Consultation Summary section** sits between "What we set out to solve"
  and the finalists: the existing `hf2-review-section` pattern, a bare `<ol>`
  with no class (native ordered-list semantics; reusing the Sleep Brief's
  `.noct-profile-priority-*` classes would have coupled this screen to the
  exact classes 1.1 replaces), hidden entirely — label and all — when no valid
  priority state exists. Label reuses the approved "What we will test
  together" / "Lo que probaremos juntos" pair.
- **The email carries a bounded `priorities` field**: at most three entries of
  exactly `name`/`reason`/`test`, pre-localized to the payload's `lang` at send
  time. Code.gs treats it as untrusted (array-coerced, capped, per-field
  `_safeText`, allowlist-projected into `safeData`, escaped at every HTML
  interpolation) and renders it in the HTML email after the Sleep Brief line
  and in the plain-text fallback in the same order. The sheet row is untouched
  — priorities are email content, not a lead-record column.
- **Known, accepted near-duplication — recorded as 1.6 email debt:** the
  `sleepProfile` line is largely the lowercased priority names, and the new
  block repeats those names with their reason and testing text. Suppressing the
  brief line was rejected as non-additive; 1.6 owns the email surface and
  re-decides this alongside the on-screen presentation. **Both the hf2 section
  and the email block are 1.6 inherited debt.**
- **Within-session staleness is a latent property, not new:** stored priorities
  refresh only when `showProfileScreen()` re-runs, which today is guaranteed
  before hf2 is reachable after any answer edit (the only forward path off
  Review re-renders the profile). `analytics.profileBriefByLang` and the
  pre-0.5 `trialFocus` had the same property. 1.6's navigation rework must not
  open a Review → hf2 path without revisiting this.

**Additive only. This item does not change the Sleep Brief.**

Render the priorities content on the Consultation Summary and in the results
email, and stage the detailed testing, procedural and follow-up guidance as
Consultation Summary and email content.

**Why the Sleep Brief is explicitly out of scope here.** An earlier version of this
roadmap removed the priorities block in Phase 0 and rebuilt it as ranked cards in
Phase 1.1. Across the intervening PRs, `main` would have shipped a Sleep Brief
whose "What we will test together" heading and lead-in sat above an empty list —
and 1.1's hero derives from the same data. The visible transition now belongs
entirely to 1.1.

**This is not a file move.** The email currently carries none of this prose; the
payload sends only the brief-summary string. Routing it there means new payload
fields and Code.gs changes. The Results screen already renders a condensed
derivative of the same three priority names, so a third surface must be designed
against the two that exist, not added blind.

**Exit:** the computed priorities (one to three, at the engine's length) render on
the Consultation Summary and in the results email, in the order the engine
produces them, bilingual, with no change to the Sleep Brief.

**Presentation constraint — a limit, not a licence.** The on-screen addition is
**one** new section, using the existing section pattern and ordered-list
semantics, placed above the finalists it explains. **It introduces no new
component class.** A diff that adds one has left additive content and entered
redesign; it stops and waits for 1.6. This presentation is **provisional and is
re-decided in 1.6**, where it is recorded as inherited design debt rather than a
settled layout.

**The real cost here is plumbing, not design.** The computed priorities are local
to the profile render; the only thing that outlives them carries names without the
reason or testing text. 0.5 must widen that or lift the data to session scope —
work that is entirely independent of any presentation decision, which is why this
item can proceed while 1.6 is still open. The email side is a new payload field
plus a Code.gs block; with `gasUrl` blank this is capability work, not delivery.

### 0.6 — Implication, not diagnosis, on the Consultation Summary ⬜

**Approved route — decided, not open: add a separate bilingual consultation-summary
presentation mapping. Do not relabel the shared quiz options.**

The Consultation Summary's profile and who rows are built by resolving quiz option
labels directly, so a customer reads back something like *"Side Sleeper · Snoring
or Sleep Apnea · Nerve Pain or Tingling · Medium 6/10"* — a clinical summary of a
person. "Sleep Apnea" is a diagnosis the kiosk is in no position to record.

Relabelling the quiz was considered and **rejected**: those same labels render on
the quiz option buttons and on the Review screen, where plain, self-recognising
language is exactly what makes an option findable. One label store cannot serve
both surfaces. The quiz says what the customer recognises; the summary says what
it implies for mattress testing.

Requirements:

- **Quiz option `id`, order, `type`, `scores` and customer-facing labels are
  unchanged.** A diff touching any of those is out of scope for Phase 0 and, for
  `scores`, is a Phase 3 change requiring Blake's sign-off.
- Add config-driven **English and Spanish implication copy** for the Consultation
  Summary and email, **keyed by option id** — never by label text, so a future
  relabel cannot silently break it.
- The retailer-facing `salesNotes` / `salesNotes_es` channel is the closest
  architectural fit: it is already the sales-floor prose channel, already hydrated
  from store config, and already understood as salesperson copy. Authored at
  `incoming/lacks_store_values.json` and regenerated (Invariant 5).
- **Never present a quiz answer as a diagnosis.**
- Test that clinical-style quiz labels cannot leak into the Consultation Summary
  or the email.

**Exit:** the Consultation Summary's who and profile rows, and their email
equivalents, resolve implication copy keyed by option id rather than quiz option
labels, in both languages; quiz option `id`, order, `type`, `scores` and
customer-facing labels are unchanged; and a test proves clinical-style quiz labels
cannot reach either surface. **This item changes no layout** — it substitutes
content into the three existing summary rows — and therefore carries **no
dependency on 1.6**.

### 0.7 — Prove the protections still hold ⬜

Not a feature. The acceptance gate for Phase 0: session, privacy, accessibility,
analytics-contract and financing-isolation protections remain intact.

**Exit:** the full repository suite is green — scoring isolation, session async and
privacy, session safety, data-error recovery, financing totality, validation and
quiz validation, the QR suite, workbook validation and the strict golden bundle —
and `git diff --check` is clean.

---

## Phase 1 — the visible redesign

**This is the substantial phase.** Everything below changes what is on screen.
None of it changes what is recommended.

### Standing Phase 1 constraints

1. **Nothing here changes what is recommended** (Invariant 2). Scoring, ranking,
   tier assignment, the firmness scale, the qualification threshold, the result
   cap, the back-fill, and **every engine-computed ordering — mattresses,
   accessories, adjustability demo positions and Sleep Brief priorities alike** —
   are out of scope. There is no "unless approved" escape in this phase; such a
   change is Phase 3 and needs Blake.
2. **Consume, never re-derive.** A Phase 1 surface may read engine output, choose
   which element of it to display, and style it. It must take that output **at the
   index, in the order and at the cap the engine produced**. It must not re-sort
   or re-rank; change or re-apply the cap; recompute or re-weight the score that
   produced the order; filter, deduplicate or substitute elements; merge, split or
   re-bucket them; synthesise an element when the engine produced none; or
   condition the selection on anything other than position in the engine's own
   list.

   Prohibited **for mattresses, accessories, heroes and priorities without
   distinction**: selecting by any predicate other than index — including a field
   carried on the element itself (`kind`, `matched`, `subType`,
   `meetsMatchThreshold`, `tier`).

   **Reading stored answers is permitted for one purpose: rendering that answer,
   or its reviewed presentation mapping, verbatim.** The position, temperature,
   sharing, feel and size signal badges are exactly this, and need no engine or
   view-model refactor. Answers may not select, filter, substitute, reorder,
   reweight or synthesise mattresses, accessories, heroes, priorities or any other
   computed engine output.

   **Concretely:** the Sleep Brief hero is the first element of the computed
   priority list and nothing else — not "the highest-scoring need", not "the first
   one whose kind is `need`". An accessory hero is the first element of that
   step's computed group — not "the highest-scoring matched item", not "an
   adjustable base when snoring is flagged". The adjustability demo position is
   whatever the engine returned; Phase 1 does not re-evaluate its conditions, add
   one, or change which position wins a tie. Badges restate stored answers
   verbatim; no inferred or re-bucketed values.

   *(One engine-side reorder already exists and is not what this forbids: the
   support group is re-sorted after qualification by a fixed sub-type order. That
   is inside the engine. Phase 1 neither undoes it nor copies the pattern.)*
3. **New copy is bilingual and config-driven** (Invariants 4 and 5).
4. **Accessibility acceptance criteria apply to every item** — see the section
   after 1.6.

**Phase 1 exit gate (recommended, not yet built):** capture a fixture of fixed
answer sets → (top pick, tier assignment, ordered result list, computed firmness)
at the Phase 1 baseline commit, and assert it unchanged by every Phase 1 PR
alongside `tests/scoring_isolation_check.mjs`. This is what would make Invariant 2
enforceable rather than aspirational. Building it is itself a proposal (❓) — it
needs Blake's agreement on cost.

### 1.1 — Sleep Brief ◐

**Gated** — approver Blake, unblocked by his approval of a reviewed prototype,
recorded here with the date. Two output properties, neither of which may appear in
a merged diff before that:

- the fixed bilingual heading "Your Sleep Brief" / "Tu Resumen de Sueño" is
  replaced by, or subordinated to, a need-derived hero;
- the screen's section order or top-level composition differs from `main`.

Prototypes and unmerged branches are not these outputs. The component set below is
a proposal, not an approved layout.

**Proceeds:** prototyping; the firmness dial rendering the existing computed value
unchanged; and the priority cards **once 0.5 has shipped**, since the detail they
displace needs somewhere to go first. Replacing the prose priorities block with
cards inside the existing section slot is a Proceeds change, not a change of
top-level composition.

*(This item was previously ⬜ while its final design was transitively blocked by
the device matrix and carried an unmarked hard dependency on 0.5 in prose — a
worse under-block than the one that prompted this correction.)*

The central redesign. Reduce reading load and make the first five seconds useful
to a salesperson presenting it aloud.

Current proposal — **not approved in detail**:

- A **need-based hero** derived from the top priority, replacing the generic
  heading. (The heading today reads "Your Sleep Brief" / "Tu Resumen de Sueño".)
- Reuse the existing icon system; no new icon vocabulary.
- Concise **signal badges**: position, temperature, sharing, feel, size.
- The customer's firmness on a **visual 1–10 dial**. **Constraint:** render the
  existing computed value. No stops, no rounding, no rescaling — the number shown
  equals the number scored. Changing the scale is Phase 3.5.
- **1–3 priority cards** in the engine's existing order: icon, position, short
  title, one-line reason, and the testing detail behind progressive disclosure.
- A simple next-step rail. **One already exists** ("What happens next", three
  steps) — this is restructuring, not new computation.
- Keep **Edit Answers**. The **"Compare My Matches"** control also already
  exists — see 1.6 for what is actually wrong with it.
- **No decorative photography on this screen.** This is a constraint, not a
  proposal.

**The priorities swap ships here, atomically.** The prose block is removed in the
same change that lands the cards; the customer never sees a Sleep Brief without
priority orientation. Requires 0.5 shipped, so the detail has somewhere to go.

**Two facts that lower the risk, kept separate from the design above.** The engine
already computes the top three priorities with the fields a card needs — a name, a
one-line reason, a testing prompt, and a kind (must-solve / worth-comparing / feel
preference). There is **no rank field**; ordering is by an internal score that is
never rendered, so "rank" is a display position, not data. And the testing prompt
is currently **fully visible** on the Sleep Brief, labelled "Try this:" — moving it
behind disclosure is a real reduction in visible words, not a relocation of
something already hidden.

**Exit:** the redesigned Sleep Brief ships with the priorities swap atomic, the
dial showing the engine's own value, and every accessibility criterion met.
**Excluded until the gate lifts:** the three layout properties named in the Gated
block above. This item cannot be closed by shipping prototypes — if Blake has not
approved a reviewed prototype and it is not recorded here, the remainder is still
open.

### 1.2 — Quiz ⬜

- Review all 56 option icons for meaning **before** introducing any. Suppress
  icons that are confusing, insulting, medicalising or merely decorative. An icon
  that characterises the customer is worse than no icon.
- No payment or budget question. No financing content.
- No scoring change hidden inside presentation work.

**Question-transition accessibility — an acceptance criterion, not an option.**

Advancing between questions calls the question renderer without a screen
transition, so Phase 0.3 does not announce it and cannot: the same-screen guard
that suppresses re-render announcements is correct and must stay. An
assistive-technology user answering question 4 currently gets no indication that
question 5 has appeared.

Requirements:

- A new question provides a reliable focus and context announcement, bilingual.
- **No duplicate speech.** The renderer also runs on every option tap, on language
  switch, and on the two paths that already transition screens and already
  announce. A new-question guard analogous to the shipped same-screen guard is
  required.
- Answer controls, touch behaviour, language switching, session safety and Review
  behaviour are all preserved. The renderer rewrites its container wholesale, so
  inline handlers and disabled-state logic must survive.
- Reuse the shipped refusal gate rather than reimplementing it, and do not
  reintroduce a deferred or live-region announcer (0.3).

**This is not a scoring change and is not optional because auto-advance is
unresolved.** Auto-advance is a separate journey decision — see 3.4 🔒. The
announcement gap exists today with manual navigation.

### 1.3 — Results and mattress cards ◐

*(The heading previously also carried ❓, which contradicted its own Proceeds
list: ❓ means do not implement, while Proceeds authorises implementation. The
document already says globally that named components are proposals unless an item
says otherwise, so the second mark added nothing but the conflict.)*

**Gated** — two outputs, each with its own unblock condition. Neither may appear
in a merged diff until its condition is met.

- **Reason-led per-model personalisation.** Approver: Blake; unblocked by
  populated per-feature catalog reason content. Gated output: any rendered card,
  drawer or summary string presenting a per-model "why this fits *this customer*"
  reason. Across all 26 models every per-feature reason column is empty and only
  the generic default is populated, so **placeholder, sample, authored-in-app or
  generic-default text standing in for that content does not lift the gate** — a
  diff adding such a string *is* the gated output, not a step toward it.
- **Adoption of a replacement tier navigation.** Approver: Blake; unblocked by his
  approval of a reviewed prototype. Gated output: a merged diff in which the tier
  tab affordance is no longer the shipped Results navigation. Prototypes and
  unmerged branches are not this output. Any replacement must preserve tier
  identity and membership, the internal keys, within-tier ordering, per-tier
  percentage computation, the qualification threshold, the result cap and the
  back-fill; introduce no mixed cross-tier ordering; avoid presenting tier leaders
  so as to imply cross-tier ranking; and handle `tier_view` in the same change.
  **This gate does not wait on 3.3.**

**Proceeds:** card hierarchy and scannability of distinguishing features; removing
buyer-characterising labels; keeping sleep fit visually dominant over financing;
restyling the current tier tabs; and **prototyping** replacement tier navigations,
including grouped, stacked and accordion layouts. Each must read correctly against
**today's** content — that is, with only the generic default reason present — and
must leave the shipped tab affordance in place until the adoption gate lifts.

- Rework the card hierarchy so a salesperson can present it at a glance.
- Lead with **why this fits this customer**, not a wall of generic features.
- Make distinguishing features scannable.
- Avoid labels such as "entry-level" that characterise the buyer rather than the
  product.
- Keep sleep fit visually dominant over financing.
- Prototype and verify at the real device matrix — see the accessibility and
  showroom section, and note the matrix is an open dependency.

**The reason content is catalog authoring for Lacks, not engineering.** It should
start early because it gates the most valuable part of this redesign. Reasons must
be accurate, product-specific, bilingual, and safe for a salesperson to repeat.

**Tier navigation — a Phase 1 presentation question, still unresolved.** Approver:
Blake. Prototyping proceeds; adopting a replacement does not.

An earlier draft claimed removing the tab affordance forces Results into a single
cross-tier ordering. **That was wrong**, and the correction matters because it was
being used to defer a presentation decision into Phase 3. The per-tier data is
built for all three tiers unconditionally, before any tab exists; the active tier
is only a lookup key. A grouped, stacked or accordion presentation can therefore
drop the tabs while preserving tiers, tier keys, within-tier order, per-tier
percentages and the per-tier qualification threshold — no cross-tier ranking
required, and no engine change.

Two real constraints remain, and they are not the one that was claimed:

- **The honesty hazard is real but narrower than an earlier draft claimed, and it
  is a design constraint rather than a blocker.** That draft said stacking puts
  three incomparable percentages in one viewport. **No match percentage is
  rendered on any screen.** The percentage is computed per tier and reaches the
  customer only through the results email; on screen the cards carry a qualitative
  line, and the drawer and compare modal show the tier name. The genuine instance
  of cross-tier incomparability is the **email**, which already lists saved picks
  from different tiers with their per-tier percentages adjacent — today, with tabs
  in place. Tabs never protected that surface and no tier-navigation change
  touches it. What a stacked layout does raise is **rank adjacency**: three tier
  leaders side by side, each presented as its tier's best, inviting a comparison
  the tiers do not support. That is a checkable property of a layout, so it
  belongs in the adoption gate's criteria — not in a phase dependency.
- **`tier_view` has exactly one call site — inside the tab switcher.** A layout
  that removes tab switching must delete that call site or the switcher containing
  it. **But the guard is a static text sweep, not a runtime observation.** It
  fails with `DEAD ENTRIES: tier_view` only if the literal `analytics.log` call is
  removed from source; leaving the switcher defined but unreachable keeps the
  suite green. The tree already proves this — two events are declared in
  `EVENT_FIELDS` whose only call sites sit inside a function the suite itself
  pins as never called, and it passes today. So the guard catches a source-level
  deletion, not a reachability regression, and nothing proves `tier_view` is ever
  actually emitted. A replacement presentation must therefore **intentionally**
  retire or replace the event and add behavioural coverage suited to the new
  interaction; CI will not do that thinking for anyone. (`tier_view` is separately
  pinned behaviourally for enum redaction, which is a different guarantee.)

**What is Phase 3.3, not Phase 1:** a global maximum score, any mixed cross-tier
ranking or single merged list, removing or merging a tier, changing which tier a
model belongs to, and changing the qualification threshold, the result cap or the
back-fill.

**Two effects, not one cascade.** The displayed/flagged basis and the
qualification basis are computed **separately**, in different functions. Changing
the first alone changes the computed percentage — which reaches the customer only
in the email — *and* the on-screen best-match/comparison copy, since the same
value drives that flag; it does **not** change which models appear. Membership
changes only if the qualification maximum or its threshold changes. Both are Phase
3.3, for different reasons: the first changes what the customer is told about fit,
the second changes what is recommended. Note also that the qualification helper is
**shared with the Sleep System**, so a change made inside it is not
mattress-scoped.

**None of this gates a Phase 1 presentation that leaves all of it unchanged.** If
3.3 later adopts a global maximum, a preserving Phase 1 layout is restyled, not
rebuilt; that rework risk is a cost to weigh at approval, not a bar on
proceeding.

**Internal keys `gold` / `silver` / `bronze` are not in scope for either.** The
catalog JSON is keyed by them; results state and every tier surface — tabs,
descriptors, drawer, handoff cards, comparison view, price symbols, CSS custom
properties — keys off them; the `tier` analytics enum enumerates them and **two**
events carry them (`tier_view` and `save_pick_toggle`); saved picks carry a tier
the Consultation Summary consumes; and tests pin the catalog split, the enum
redaction, the `tierViews` wipe and a no-re-tier assertion.

**They are not carried by the session summary or the email.** The session-safe
summary returns counts only, the email's match map reconstructs each entry without
a tier, and `Code.gs` has no reference to tier at all. An earlier draft asserted
both; neither is true.

**Exit:** the card hierarchy is presentable at a glance, distinguishing features
are scannable, no label characterises the buyer, and sleep fit reads as dominant
over financing. **Excluded until their gates lift — both, separately:** (1) any
card that leads with a per-model "why this fits" reason, and (2) any replacement
for the tier tab affordance. Shipping the unblocked portion does not close this
item: the reason-led card is the point of the redesign, and the tier-navigation
question stays outstanding here until Blake approves a reviewed prototype or
records that the tabs stand.

### 1.4 — Sleep System ⬜

The largest reading load in the app.

- Rebuild feature cards for salesperson-led scanning: customer benefit first,
  product distinction second.
- **Separate customer-facing benefit from salesperson procedure**, and reduce
  repeated instructions and disclosure prose.
- Keep product distinctions and selection state clear. Do not compress so far that
  materially different products become indistinguishable.
- **Prices:** accessory prices are displayed today and stay as they are. Phase 1
  adds no new price surface, and this bullet does not license one — see Phase 2.

### 1.5 — Financing footprint ⬜

- **Keep the Payment Choice agenda as built.** It is a deliberate product
  decision: the salesperson marks financing topics to discuss; sheet controls are
  persistent toggles carrying their own pressed state and announcing nothing;
  handoff actions are transitions and do announce; agenda state is session-only,
  never affects scoring or the Sleep Brief, is excluded from email and diagnostics
  beyond approved allowlisted events, and wipes with the session. **Do not** revert
  it to an interested/not-interested classification, a plan selector, a
  qualification form, or a scoring input.
- **Config-disable** duplicate financing content in the mattress drawer and the
  Sleep System. Prefer disabling to deletion: Phase 2 may want a per-product price
  anchor on the drawer, and retiring the placement values from the closed
  analytics enum would then have to be undone.

  **Enum retirement is deferred**, and the reason is not the one an earlier draft
  gave. Config-disabling a surface does not remove its call site, so retiring
  those values would retire values the shipped source still passes — and **nothing
  catches that**. Invariant 7's set-equality guard compares logged event *names*
  against `EVENT_FIELDS` *keys*; it never inspects enum values, and both surfaces
  log an event that stays logged from the results and handoff paths regardless. At
  runtime an unlisted value is silently dropped with only an anonymous count —
  the same drift 0.1 closed at the event-name level, still open at the value
  level. Invariant 7 governs event and field sets and says nothing about value
  sets; **that gap is the reason to defer, not a reason to proceed.**

  Protection across the enum is uneven rather than uniform: two values are
  load-bearing in behavioural assertions in `tests/session_async_check.mjs` and
  would fail the suite if retired; the other four, including one of the two this
  bullet contemplates retiring, are pinned by nothing. Retire only when Phase 2.2
  confirms the surfaces are permanently unused **and** the call sites go in the
  same change.
- Keep financing orientation separate from sleep-fit scoring (Invariant 1).
- Make financing concrete through eventual verified price grounding, not by
  repeating vague financing copy everywhere.

### 1.6 — Consultation Summary, Compare, and the remaining screens ⬜

**The Review screen stays complete and fully editable.** That is the approved
default, not a pending question, and it does not hold this item open. Compressing
or removing it is a separate locked decision (see the register) that only Blake
may take, on observed-session evidence. Restyling that preserves every answer and
every correction path needs no approval.

Customer-facing terminology in this document is **Consultation Summary**. Internal
handoff element ids may remain until a separately approved refactor. The analytics
`placement` value `handoff` stays as-is by policy — note that unlike two other
values in that enum it is not pinned by any test, so the constraint is a decision
recorded here, not a guard that would catch a change.

**Consultation Summary.** Because the salesperson is already present, this is not
the moment a human enters the journey — it is where the conversation is concluded
and continued. It should carry the customer's most important sleep needs, the
finalists to compare, testing priorities, the selected Payment Choice discussion
topics, next steps, and save/send options where operationally available.

It carries content added additively by 0.5 under an explicit no-new-component
constraint, and content substituted in place by 0.6. **1.6 owns the design
direction for this screen and must re-decide 0.5's provisional presentation** —
that presentation ships as a deliberate constraint, not as an endorsed layout, and
1.6 is not complete while it stands unreviewed. **Phase 0's exit does not depend
on this design.**

**Exit:** the Consultation Summary, Welcome, the mattress drawer and the email
each ship their reworked presentation on `main`, **or** carry a no-change decision
explicitly approved by Blake and recorded here with the date; Compare is reachable
and correctly labelled from the Sleep Brief, the results cards, the results action
area and the Consultation Summary, with the existing working entry preserved and
the Sleep Brief CTA's label/behaviour mismatch resolved; and 0.5's provisional
priorities presentation has been **either replaced, or kept under a no-change
decision approved by Blake and recorded here with the date**.

A description of intended direction, written by whoever is doing the work,
satisfies no clause of this exit — this is a visible-redesign item, and 1.6 is the
only owner of 0.5's inherited design debt. Preserving "no change" as a legitimate
outcome avoids forcing churn; requiring an approver's dated decision removes the
path an implementer can walk alone.

Review compression or removal is out of scope here; leaving Review as it stands
satisfies this item.

**Compare — the gap is discoverability, not absence.** Four facts:

| Surface | State today |
|---|---|
| Consultation Summary "Compare finalists" | **Works.** Auto-selects two saved picks (favourite first) — the customer never chooses which two. |
| Sleep Brief "Compare My Matches" | **Exists but misleads.** Navigates to Results; never opens comparison. |
| Results cards | **No entry.** The card-level select-to-compare control is never rendered. |
| Results compare tray and modal | **Built and dormant** — unreachable because nothing renders the card trigger. |

So Phase 1 reactivates and makes discoverable; it does not build. Provide coherent
access from the Sleep Brief, results cards, the results action area, and the
Consultation Summary — **preserving the working entry**. Resolve the Sleep Brief
CTA's label/behaviour mismatch. Do not turn Compare into another feature wall.

**Welcome.** Brief, calm, and framed for a salesperson opening the conversation
with the customer beside them. One restrained Payment Choice acknowledgment — no
coupon-styled tease, no self-deferring "come back after your matches". Persistent
language and restart controls stay available. Do not promise an inaccurate
completion time.

**Review screen.** A protected confirmation and correction step: where the
salesperson confirms answers, a couple catches a misunderstanding, and a second
participant corrects the first. It stays as it is; compression or removal is a
separate locked decision.

**Mattress drawer.** Genuine product detail — firmness, match reasons, features.
Duplicate financing reduced per 1.5. Eventually it may show a verified price and
one concise path to Payment Choice. It must never become a per-product wall of
speculative payment claims.

**Email.** The only artifact the customer leaves with. A concise brief, ranked
priorities, matches, practical testing guidance, and approved next steps. **Never**
financing-interest or agenda state, medical-style labels, unapproved rates or
terms, or customer data beyond the reviewed payload contract. Keep four things
distinct: UI implementation, payload capability, GAS activation, and verified
delivery — `gasUrl` is blank today, so no email change is "live" merely because the
template exists.

---

## Accessibility and showroom acceptance criteria

These apply to every Phase 1 item.

**Component semantics — approved:**

- Decorative hero icon: `aria-hidden`, when the heading carries its meaning.
- Firmness visualisation: a meaningful role and a bilingual accessible verbal
  value (e.g. "Medium, 4 of 10"). The current text form is readable by assistive
  technology; a graphic without this is a regression, not a redesign.
- Ranked priorities: an ordered list. Order conveyed by position and a number
  glyph alone is not conveyed.
- Progressive disclosure: a real `button` with `aria-expanded`, and a bilingual
  accessible name.
- Next-step rail: ordered semantics, with `aria-current` where appropriate. The
  existing rail renders plain divs, so "restyling" must not preserve that.
- Icon badges retain visible text. Icons never replace text.
- **Contrast and visible focus remain required.** Focus is now load-bearing, not
  cosmetic: since 0.3, focus *is* the screen-transition announcement. A suppressed
  or invisible focus ring is a functional defect for sighted users on every
  transition — and a redesign is exactly when focus rings get styled away.

**Real-device QA must cover** the actual approved showroom iPad hardware and
browser, its viewport width **and** height, both orientations, English and
Spanish, glare and shared-viewing conditions, and touch.

### Phase 1 merge gate — the device matrix

A phase-wide **merge gate**, not an item status. Recorded here only — item Exit
lines do not repeat it, and it carries no heading mark.

It does not override the Phase 0 → Phase 1 sequence; the two apply in order:

- **Before Phase 0 closes:** Phase 1 research and prototyping may proceed. Phase 1
  implementation may not begin.
- **After Phase 0 closes:** this gate independently permits Phase 1
  implementation, and blocks merging until verification on the confirmed
  hardware.

**Approver: Blake, unblocked by confirming the showroom hardware.** No committed
source in this repository identifies the showroom device, its viewport or its
orientation, so "real iPad dimensions" is not yet a checkable acceptance
criterion. **No Phase 1 change merges without verification on the confirmed
hardware.**

Prototyping and implementation proceed meanwhile under one restriction: **no new
CSS breakpoint, and no change to an existing one, may be justified as matching the
showroom device until the matrix is recorded here.** That is scoped deliberately.
`index.html` already carries roughly 25 width-based media queries, including one
explicitly bracketing tablet widths, so a flat "do not invent dimensions" reads as
either already-violated or as a ban on responsive CSS — and would be ignored
either way. The enforceable rule is about *new justification*, not about
responsive design.

Never write a width without its paired height: portrait and landscape on the same
device are different designs.

---

## Phase 2 — price and payment

**Build dark first. No customer-facing output in the first stage.**

### 2.1 — The dark framework ⬜

Ship the whole mechanism with nothing rendered: product/SKU/size identity,
verified prices, canonical source and generation pipeline, price ownership,
source-URL allowlisting, `verifiedAt`, `maxAgeDays` or an approved
merchandising-calendar control, emergency disable, plan eligibility, approved
calculation modes, payment frequency, disclosures, bilingual presentation data,
deterministic validation, and fail-closed behaviour.

**Exit:** DOM silence is necessary but not sufficient. Deterministic tests must
prove the dark framework actually implements, with no customer-visible price or
payment output in any state:

- product / SKU / size identity;
- approved source and ownership metadata;
- freshness and cadence control, and emergency disable;
- plan eligibility, calculation mode, and the plan's actual cadence;
- the price-unavailable and quote-only states as **separate** outcomes;
- a missing, stale or unapproved price producing **no numeric result**;
- validation and fail-closed behaviour on every one of the above.

**Two unavailability states, never conflated:**

| Condition | State | What is shown |
|---|---|---|
| The **product price** is missing, stale, or unapproved | *price unavailable* | No numeric price and no payment result. No estimate from a substitute price, and never a figure inferred from another size. |
| The **plan** has no approved payment formula, but an approved price exists | *quote-only plan* | The price may be shown per 2.2; no calculated periodic payment, because the **formula** is missing — not the price. |

"Quote-only" is a property of a plan. It is never a fallback label for an
unverified price.

> **⚠️ `incoming/lacks_catalog_selection.json` is discovery evidence, not a price
> source.** It contains 26 Queen-model observations carrying SKU, a promotional
> price and a regular price, from a browser-session scrape dated **2026-07-30**.
> Queen is the only size represented. It sits **outside the production
> mattress-data generation path** — the build inputs carry no price at all, the
> shipped catalog's price column is empty by design, and the only consumer of this
> file is a one-off image-fetch helper.
>
> Its shape is a near-perfect structural match for "verified SKU/size prices",
> which is exactly why this warning exists. **It must not enter customer-facing
> output or the Phase 2 pipeline merely because it exists.** It is not
> business-approved, carries no `verifiedAt`, no freshness policy and no
> allowlisted source, and its prices are promotional — the kind that move on a
> merchandising calendar. **Never infer another size's price from Queen.**
>
> Phase 2.1 still requires approved ownership, an approved source, freshness and
> cadence control, size identity, legal and MAP clearance, validation, and
> emergency-disable behaviour.

**Validator relaxation is gated too.** The shipped invariant that no product-level
payment is calculated or shown is enforced by validation. Split it: 2.1 may relax
what is **computed**; what may be **displayed** stays enforced until 2.2 is
approved. Otherwise the dark phase silently weakens a shipped guarantee ahead of
its gate.

### 2.2 — Activation 🔒

Approver: Blake, plus written business and legal approval. Hardware and browser
verification required.

Only then: an approved cash-price or price-range anchor; periodic-payment
illustrations **only** for plans with approved formulas; the plan's **actual
cadence** preserved — a biweekly lease-to-own payment is never rendered as
monthly; lease-to-own visibly distinct from credit; required disclosure adjacent
to the amount; assumptions disclosed; no implied approval; no financial data
collected; applications linked only to approved external destinations; emergency
disable and freshness failure preserved.

Price and Payment Choice should be grounded on the same screen but need not share
one card. Keep the payment agenda structurally stable rather than varying it by
tier or by customer interest.

---

## Phase 3 — structural changes requiring evidence

Every item here changes what is recommended or how the journey works. **Approver
for all of them: Blake.** None may be bundled into Phase 1.

### 3.1 — Scoring case-fold defect 🔒

Two quiz tags never match the catalog because the comparison is case-sensitive and
the catalog spellings are lowercase. **Ten scoring rules across six questions**
currently award zero — `partner_sleep`, `partner_disturbance`, `sleep_position`,
`body_type`, `sleep_issues` and `health_conditions` — including the strongest
partner-disturbance answer and hip pain.

**The defect is in the generator, not the catalog and not the app.** The CSV
authors these tags correctly in camelCase. The build script lowercases every tag
and then restores capitals only after a hyphen, so a tag without one never
recovers. The same script maps the per-feature reason columns *without*
lowercasing, so the reasons map is keyed camelCase and already agrees with the
quiz — the features array is the sole disagreement. The fix is a one-line
generator change plus regeneration through the pipeline; `index.html` is not
touched.

**Bounded impact, for the evidence Blake needs.** A per-feature cap limits
accumulation, so the maximum swing is +5 per tag and +10 combined, per model
carrying the tag — not the naive sum of the dead rules. Pressure relief is carried
by half the catalog and reorders broadly; motion isolation is carried by three
models and reorders narrowly but sharply, since it holds the largest individual
awards. Solo sleepers reach only the pressure-relief rules, because the
partner-disturbance question and the differing-body-type option are both skipped
for them — so the reordering concentrates on partnered sleepers and on the
side-sleeper / hip-pain population the tags exist to serve.

Unblocked by: Blake's explicit approval, on its own PR, with the changed top picks
enumerated as evidence. **Not a drive-by fix.**

### 3.2 — Unmatched quiz-tag vocabulary 🔒

Six quiz tags match no catalog feature in any casing. Separate from 3.1 and needs
its own decision: populate the catalog vocabulary, or retire the tags.

### 3.3 — Global maximum score and tier structure 🔒

The maximum is computed per tier, so a "96% match" in Bronze and in Gold are not
the same measurement. Evaluate a global maximum, and whether the three-tier
structure earns its place.

**This is independent of 1.3's tier-navigation presentation**, which may be
approved and ship first provided it preserves tier identity and membership,
within-tier ordering, per-tier percentages, the qualification threshold, the
result cap and the back-fill. 3.3 changes the measurement; 1.3 changes how the
existing measurement is arranged on screen. **Neither waits on the other.**

One factual note, since it is the basis of the whole comparability argument: the
percentage is **not rendered on any screen** today. It is computed per tier and
reaches the customer only through the results email. A global maximum therefore
changes the email's numbers and the on-screen best-match/comparison copy; it
changes on-screen membership only if the qualification basis changes with it.

### 3.4 — Auto-advance and journey changes 🔒

Auto-advance for single-select questions is a hypothesis, not an improvement.
Removing the pause changes answer-revision behaviour, hence answer sets, hence
recommendations. Unblocked only by observed salesperson/customer sessions.
Question-transition accessibility (1.2) is **not** part of this decision and does
not wait on it.

### 3.5 — Firmness scale and stops 🔒

Reducing the ten-position firmness input to fewer stops changes scoring; firmness
is the largest single scoring term. Not a cosmetic simplification. The 1.1 dial
renders the existing value and must not rescale it.

### 3.6 — Richer persistent identity bar ❓

Proposed only. No evidence, no design, no approval. Listed so it is not mistaken
for approved work.

---

## Open decisions register

Everything here is **unresolved**. An item's absence from this list is not
approval; its presence is a bar on proceeding.

| Decision | Mark | Approver | Unblocked by |
|---|---|---|---|
| Tier navigation presentation — adopting a replacement (Phase 1) | 🔒 | Blake | Blake's approval of a reviewed prototype — gated portion of 1.3 ◐; prototyping proceeds now; **not gated by 3.3** |
| Auto-advance | 🔒 | Blake | Observed sessions |
| Review-screen compression or removal | 🔒 | Blake | Observed sessions. Review otherwise stays as it is; this does not hold 1.6 open |
| Final Sleep Brief layout | 🔒 | Blake | Blake's approval of a reviewed prototype — gated output of 1.1 ◐ |
| The device matrix itself | 🔒 | Blake | Confirming the showroom hardware — Phase 1 **merge** gate, blocks merging not starting |
| Phase 2.2 price/payment activation | 🔒 | Blake + business/legal | Written approval |
| Scoring case-fold (3.1) | 🔒 | Blake | Approval + enumerated impact |
| Quiz-tag vocabulary gap (3.2) | 🔒 | Blake | Populate-or-retire decision |
| Global maxScore / cross-tier ranking / tier merge or removal / threshold, cap, back-fill (3.3) | 🔒 | Blake | Evidence. **Does not gate a preserving Phase 1 tier-navigation change** |
| Firmness stops (3.5) | 🔒 | Blake | Evidence |
| Persistent identity bar (3.6) | ❓ | Blake | A case for it |
| Phase 1 scoring-fixture exit gate | ❓ | Blake | Agreement on cost |
| Dormant nickname-code cleanup | ❓ | Blake | Analytics review — see below |

**Visible Gold/Silver/Bronze presentation may change in Phase 1** — including
replacing the tab affordance with a grouped, stacked or accordion layout, which
preserves tiers, within-tier order and per-tier percentages and needs no engine
change. That change still needs Blake's approval of a reviewed prototype, but it
is a *presentation* decision, not a Phase 3 one, and **it does not wait on 3.3**.
A Phase 1 layout may ship first provided the diff preserves tier identity and
membership, within-tier ordering, per-tier percentage computation, the
qualification threshold, the result cap and the back-fill, and introduces no
mixed cross-tier ordering.

**Internal tier keys do not change**, and the structural questions — a global
maximum, mixed cross-tier ranking, removing or merging a tier, or altering the
qualification threshold, cap or back-fill — remain Phase 3.3, because each of them
changes what is recommended.

---

## Facts that correct earlier drafts

Recorded because each one previously sent work in the wrong direction.

**There is no visible nickname hero.** The engine computes archetype nicknames
("The Goldilocks", "The Ache Fighter", and fourteen others), but they never reach
the DOM. The visible Sleep Brief heading is the fixed bilingual string "Your Sleep
Brief" / "Tu Resumen de Sueño". The nickname is assigned only to an analytics
field, which nothing reads — not the email payload, not Code.gs, not any renderer.
**Retiring a live nickname hero is therefore not a Phase 1.1 blocker**, because
there is nothing visible to retire.

Dormant nickname cleanup is separate work (❓ above) and must not be bundled into
presentation changes without reviewing the analytics implications first. Two
cautions if it is ever done: the analytics field is in the session-wipe list and
pinned by tests, so those move together; and the heading **element** must stay — it
is the 0.3 focus destination for the Sleep Brief and the `aria-labelledby` target
for two ancestors. A companion icon-key variable is read by nothing at all.

**Mattress `archetype` is a different thing entirely** — live per-product copy used
for response labels, differentiator titles, trial prompts and summary reasons.
It shares only a word with the nickname engine. **Do not remove it accidentally.**

**Compare exists.** See the table in 1.6. The working entry is on the Consultation
Summary; the Sleep Brief CTA is mislabelled; the card-level path is dormant.

**The priorities data has no rank field.** Ordering is by an internal score that is
never rendered. "Rank" in the 1.1 proposal means display position.

**Word counts in this document came from an audit that is not in this repository.**
They are indicative, not acceptance criteria, and they drift with every copy
change. Re-measure against the tree before implementing to a target, and do not
cite the audit as authority for a design decision.

**No "20-step working agreement" and no 2026-08-02 design study exist in this
repository.** Neither is a citable source here. If either is to be referenced, it
must be committed first.

**Process material lives elsewhere.** Branching, PR flow, required checks, the
pre-merge checklist and post-merge verification are in
`docs/deployment-workflow.md`; architecture, i18n and the generated-artifact
pipeline are in CLAUDE.md. This document does not restate them. If a durable
contributor or review checklist is wanted, it belongs in its own governance
document, not here.

---

## Sequence of record

1. ✅ **Analytics contract and roadmap** — 0.1, 0.2. PR #11 (`5a9cd10`), PR #12
   (`1aef27d`).
2. ✅ **Screen-transition focus and announcement** — 0.3. PR #13, head `1574c53`,
   merged `88f1e89`.
3. ✅ **Roadmap reconciliation** — 0.2. PR #14 (`7fa8390`).
4. 🔨 **Remaining Phase 0** — 0.4 merged (PR #15, `572d405`; ⏳, hardware
   verification outstanding), 0.5 in the PR carrying this revision, then 0.6,
   0.7. Phase 0 cannot close while 0.4's hardware gate is open.
5. ⬜ **The visible redesign** — Phase 1. Start the catalog reason-content
   authoring (1.3's gated content) in parallel and early; it is not engineering
   work, and it gates **reason-led/personalised-card completion** — not the card
   redesign itself, which proceeds against today's generic-default content per
   1.3's Proceeds list.
6. ⬜ **Dark pricing/payment foundation** — 2.1.
7. 🔒 **Activate prices and payments** — 2.2, after business and legal approval.
8. 🔒 **Structural scoring and tier changes last** — Phase 3.

---

## Evidence appendix

Findings established by direct inspection of the tree, distinct from the audit's
word counts. Line numbers drift with every merge and are deliberately omitted; the
described behaviour is the durable anchor.

| # | Finding |
|---|---|
| 1 | Quiz: 12 questions, exactly 56 options (11 choice questions plus the firmness slider) — so "review all 56 icons" is a bounded task |
| 2 | The engine already computes the top three priorities with name, reason, testing prompt and kind; there is no rank field, and ordering is by an unrendered score |
| 3 | A next-step rail already exists on the Sleep Brief, rendering three steps as plain divs |
| 4 | The "Try this:" testing prompt is currently fully visible on the Sleep Brief, not behind disclosure |
| 5 | Per-feature match reasons never render: only the generic default is populated, across all 26 models |
| 6 | Two quiz tags never score against the catalog because the match is case-sensitive; six more match no catalog feature in any casing |
| 7 | The maximum score is per-tier, so match percentages are not comparable across tiers |
| 8 | Consultation Summary condition strings are quiz option labels resolved at render time, which is why 0.6 needs a separate mapping rather than a relabel |
| 9 | Of 8 screens, `welcomeScreen` and `questionScreen` render no heading, and the Sleep Brief heading is empty until runtime — the basis for 0.3's destination policy |
| 10 | Question-to-question advance renders without a screen transition, so 0.3 does not announce it; the renderer also runs on every option tap and on language switch |
| 11 | The data-error overlay was terminal *before* 0.4 — no interactive element, a failure flag never cleared, and absent from the session-layer close list. These are the findings 0.4 was written against, not current state |
| 12 | Compare works from the Consultation Summary only; the card-level control is never rendered and its tray is unreachable |
| 13 | Archetype nicknames are computed but never reach the DOM; the visible heading is a fixed bilingual string |
| 14 | `incoming/lacks_catalog_selection.json` carries 26 Queen-only SKU/price/regular-price observations dated 2026-07-30, outside the production generation path |
| 15 | Accessory prices flow end to end and display today; mattress prices do not exist anywhere in the shipped data |
