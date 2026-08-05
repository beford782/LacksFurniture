# DreamFinder rebuild roadmap — Lacks deployment

**Status: LIVING DOCUMENT. Phase 0 in progress. Phases 1–3 are a plan of intent,
not a grant of approval — see the open-decisions register.**

**Last updated:** 2026-08-05
**Baseline:** `88f1e89882b4da30f7de5da903cea6e66e644549` — GitHub `main`, the merge
commit of PR #13. GitHub state is authoritative; a local checkout never is.
**Next implementation item:** Phase 0.4.

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
| 🔒 | Blocked — needs a decision, an approval, or evidence |
| ❓ | Proposed only. Not approved. Do not implement. |

**Rules for these marks.** ⬜ → 🔨 → ✅ may be moved by whoever does the work.
Moving anything **into or out of 🔒 or ❓ requires the named approver on that
item.** Every 🔒 and ❓ item states who decides and what unblocks it. If a blocker
applies to any part of an item, the item's own heading carries the mark — a
blocker buried in the body is invisible to anyone scanning headings.

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
2. **Nothing in Phase 0 or Phase 1 changes what is recommended.** This is broader
   than "scoring": it covers scoring, ranking, tier assignment, the firmness
   scale, and **which mattress, accessory, hero or priority a given answer set
   sees**. Any such change is Phase 3 and requires **Blake's sign-off**.
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
shipped state in the PR that carries this revision.

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

### 0.4 — Recovery from the data-error overlay ⬜ — NEXT

The overlay is terminal today. `showDataError()` sets `_dataLoadFailed`, writes one
sentence, and shows a full-viewport layer that contains **no interactive element of
any kind**. There is no route out: `startQuiz` short-circuits back to it on every
tap, screen-transition focus is refused while `_dataLoadFailed` is set, and the
failure surfaces on Welcome — where the persistent Restart control is deliberately
hidden. With a salesperson and customer both looking at it, this is a dead tablet
mid-conversation.

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

**Documentation obligation:** this adds a session-ending route.
`docs/kiosk-device-hardening.md` records each such route as separately verified on
hardware, precisely because verifying one says nothing about another. 0.4's exit
condition includes adding the new route to that table and re-verifying on the
mounted device.

### 0.5 — Route priorities content to the Consultation Summary and email ⬜

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

**Exit:** priorities content appears on the Consultation Summary and in the email;
a Sleep Brief diff is out of scope for this item.

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

### 0.7 — Prove the protections still hold ⬜

Not a feature. The acceptance gate for Phase 0: session, privacy, accessibility,
analytics-contract and financing-isolation protections remain intact.

**Exit:** the full repository suite is green — scoring isolation, session async and
privacy, session safety, financing totality, validation and quiz validation, the
QR suite, workbook validation and the strict golden bundle — and `git diff --check`
is clean.

---

## Phase 1 — the visible redesign

**This is the substantial phase.** Everything below changes what is on screen.
None of it changes what is recommended.

### Standing Phase 1 constraints

1. **Nothing here changes what is recommended** (Invariant 2). Scoring, ranking,
   tier assignment, the firmness scale, and hero/accessory selection are all out
   of scope. There is no "unless approved" escape in this phase — such a change is
   Phase 3 and needs Blake.
2. **Consume, never re-derive.** Where the design uses computed data, take it in
   the order and at the cap the engine produces. Do not re-rank, re-cap,
   re-weight, filter or re-derive it. Badges restate stored answers verbatim; no
   inferred or re-bucketed values.
3. **New copy is bilingual and config-driven** (Invariants 4 and 5).
4. **Accessibility acceptance criteria apply to every item** — see the section
   after 1.6.

**Phase 1 exit gate (recommended, not yet built):** capture a fixture of fixed
answer sets → (top pick, tier assignment, ordered result list, computed firmness)
at the Phase 1 baseline commit, and assert it unchanged by every Phase 1 PR
alongside `tests/scoring_isolation_check.mjs`. This is what would make Invariant 2
enforceable rather than aspirational. Building it is itself a proposal (❓) — it
needs Blake's agreement on cost.

### 1.1 — Sleep Brief ⬜ (component design ❓)

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

### 1.3 — Results and mattress cards 🔒 (component design ❓)

**Marked 🔒 because two blockers below gate its central bullets** — the missing
per-feature reason content, and the tier-tab decision. The unblocked parts (card
hierarchy, scannability, avoiding buyer-characterising labels, keeping sleep fit
dominant) may be designed meanwhile, but the item does not start as a whole.

- Rework the card hierarchy so a salesperson can present it at a glance.
- Lead with **why this fits this customer**, not a wall of generic features.
- Make distinguishing features scannable.
- Avoid labels such as "entry-level" that characterise the buyer rather than the
  product.
- Keep sleep fit visually dominant over financing.
- Prototype and verify at the real device matrix — see the accessibility and
  showroom section, and note the matrix is an open dependency.

> **🔒 Blocker — "why this fits" has no content to show.** Approver: Blake.
> Per-feature match reasons are read by quiz tag, but across all 26 models the
> only populated reason is the generic default; every per-feature reason column is
> empty. The card cannot honestly lead with this content until it exists. This is
> **catalog content authoring for Lacks**, not engineering, and it should start
> early because it gates the most valuable part of the redesign. Reasons must be
> accurate, product-specific, bilingual, and safe for a salesperson to repeat.

**Tier tabs: 🔒, and not a Phase 1 decision.** Approver: Blake, jointly with 3.2.
Removing the tabs forces Results to choose a single ordering, but match
percentages are **not comparable across tiers** because the maximum is computed
per tier. A Phase 1 removal would either invent a cross-tier ranking — a Phase 3
change — or display incomparable percentages side by side. Phase 1 may restyle the
tabs; it may not remove them. Internal keys `gold` / `silver` / `bronze` remain
the data contract regardless, and the `tier` analytics enum depends on them.

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
  analytics enum would then have to be undone. **Enum retirement is deferred**
  until Phase 2.2 confirms those surfaces will never be used; the set-equality
  guard polices both directions.
- Keep financing orientation separate from sleep-fit scoring (Invariant 1).
- Make financing concrete through eventual verified price grounding, not by
  repeating vague financing copy everywhere.

### 1.6 — Consultation Summary, Compare, and the remaining screens ⬜

Customer-facing terminology in this document is **Consultation Summary**. Internal
handoff element ids may remain until a separately approved refactor; the analytics
`placement` value `handoff` is a data contract and does not change.

**Consultation Summary.** Because the salesperson is already present, this is not
the moment a human enters the journey — it is where the conversation is concluded
and continued. It should carry the customer's most important sleep needs, the
finalists to compare, testing priorities, the selected Payment Choice discussion
topics, next steps, and save/send options where operationally available. It
receives new content from 0.5 and 0.6 and currently has no design direction of its
own; it needs one before that content lands.

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
participant corrects the first. **Compression or removal is 🔒** — approver Blake,
unblocked only by evidence from observed sessions.

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

## Accessibility and showroom acceptance criteria — device matrix 🔒

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

> **🔒 Open dependency — the device matrix does not exist.** Approver: Blake.
> No committed source in this repository identifies the showroom device, its
> viewport, or its orientation. "Real iPad dimensions" is therefore not yet a
> checkable acceptance criterion. **Do not invent dimensions**, and never write a
> width without its paired height — portrait and landscape on the same device are
> different designs. Confirm the hardware, then record the matrix here.

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

**Exit:** assert that no price or payment string reaches the DOM in any state.

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
the catalog spellings are lowercase. Ten scoring rules across five questions
currently award zero, including the strongest partner-disturbance answer and
hip pain. Roughly half the catalog carries the pressure-relief tag, so fixing it
will reorder results for exactly the side-sleeper and hip-pain population the tag
exists to serve.

Unblocked by: Blake's explicit approval, on its own PR, with the changed top picks
enumerated as evidence. **Not a drive-by fix.**

### 3.2 — Unmatched quiz-tag vocabulary 🔒

Six quiz tags match no catalog feature in any casing. Separate from 3.1 and needs
its own decision: populate the catalog vocabulary, or retire the tags.

### 3.3 — Global maximum score and tier structure 🔒

The maximum is computed per tier, so a "96% match" in Bronze and in Gold are not
the same measurement. Evaluate a global maximum, and whether the three-tier
structure earns its place. **Decided jointly with the 1.3 tier-tab question**, and
this decision comes first.

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
| Tier-tab presentation or removal | 🔒 | Blake | 3.3 resolved first |
| Auto-advance | 🔒 | Blake | Observed sessions |
| Review-screen compression or removal | 🔒 | Blake | Observed sessions |
| Final Sleep Brief and card layouts | ❓ | Blake | Prototypes at the real device matrix |
| The device matrix itself | 🔒 | Blake | Confirming the showroom hardware |
| Phase 2.2 price/payment activation | 🔒 | Blake + business/legal | Written approval |
| Scoring case-fold (3.1) | 🔒 | Blake | Approval + enumerated impact |
| Quiz-tag vocabulary gap (3.2) | 🔒 | Blake | Populate-or-retire decision |
| Global maxScore / tier structure (3.3) | 🔒 | Blake | Evidence |
| Firmness stops (3.5) | 🔒 | Blake | Evidence |
| Persistent identity bar (3.6) | ❓ | Blake | A case for it |
| Phase 1 scoring-fixture exit gate | ❓ | Blake | Agreement on cost |
| Dormant nickname-code cleanup | ❓ | Blake | Analytics review — see below |

**Visible Gold/Silver/Bronze presentation may change in Phase 1. Internal tier
keys do not, until separately approved structural work.**

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
3. 🔨 **Roadmap reconciliation** — this revision.
4. ⬜ **Remaining Phase 0** — 0.4, then 0.5, 0.6, 0.7.
5. ⬜ **The visible redesign** — Phase 1. Start the catalog reason-content
   authoring (1.3 blocker) in parallel and early; it is not engineering work and
   it gates the card redesign.
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
| 11 | The data-error overlay contains no interactive element, the failure flag is never cleared, and the overlay is absent from the session-layer close list |
| 12 | Compare works from the Consultation Summary only; the card-level control is never rendered and its tray is unreachable |
| 13 | Archetype nicknames are computed but never reach the DOM; the visible heading is a fixed bilingual string |
| 14 | `incoming/lacks_catalog_selection.json` carries 26 Queen-only SKU/price/regular-price observations dated 2026-07-30, outside the production generation path |
| 15 | Accessory prices flow end to end and display today; mattress prices do not exist anywhere in the shipped data |
