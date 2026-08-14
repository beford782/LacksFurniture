# Nocturne — demo-impact prototype (2026-08-13, revision 3)

**Status: PROTOTYPE ONLY — awaiting owner visual review.** Isolated under
`prototypes/`; no production behavior, scoring, canonical data, claims, or
deployment is changed. No production PR exists for this work.

**Revision 2 (owner correction, 2026-08-13):** the first cut omitted the
Payment Choices layer — roughly half the commercial story. This revision
integrates it end to end without letting it touch the fitting. See "Why
the first prototype omitted this layer" at the bottom.

**Revision 3 (integrity + personalization round, 2026-08-13):** corrects
four integrity defects found in review and turns the generic-premium
surface into a demonstrably personalized Lacks experience. Details in
"Revision 3 — what changed and why" below.

**Revision 3.1 (corrective interaction-state pass, 2026-08-13):** fixes
the remaining state combinations found in independent review — payment
exploration that survives every preference state without being inflated
into intent, a single-open reveal accordion that keeps the CTA
reachable, one authoritative language state, incomplete-journey copy
that never claims an unmade choice, and a complete modal focus
contract. Includes the owner's live-conversation correction: the
walkthrough IS the payment conversation, so the interaction is modeled
as exploration and preference capture — never a future-discussion
agenda. Details in "Revision 3.1" below.

**Handoff responsive repair (owner-walkthrough defect, 2026-08-14):** at
constrained heights (owner reproduction: 854×698) the summary card shrank
inside the height-locked, centered handoff scene and its own rounded
`overflow:hidden` silently clipped the System, Payment preference, and
Options explored rows with no scroll surface. Fix: the handoff scene
scrolls vertically (`overflow:auto`, auto-margin centering — centered
when it fits, scrolls from the top when it doesn't), the card grows to
its content (`flex:none` — it may never internally clip), the starfield
is fixed so the background stays stable, and every handoff entry or
major re-render (including a language switch) resets the scroll to the
top. Verified at 854×698, 800×650, 834×698, 1194×748, 1180×820,
834×985, and 834×1112 × EN/ES × customer/presenter (28/28), all six
payment states reachable, keyboard reach intact. Rendered ratchet:
`checks/handoff_layout_check.py` (requires playwright + the served
prototype; fails against the pre-fix source).

## Run it

Serve the **repo root** (the prototype loads the real shipped data and
engine), then open the prototype:

```
python -m http.server 8000
# → http://localhost:8000/prototypes/demo-round-2026-08-13/
```

**Presenter mode** (rehearsal tools) is a documented opt-in:

```
http://localhost:8000/prototypes/demo-round-2026-08-13/?presenter=1
```

Without `?presenter=1` the welcome screen shows no rehearsal controls and
no Isolation check button, and the quiz shows no completion shortcut —
they are `display:none` (invisible AND unfocusable). Presenter mode gates
display only; scoring, payment, session state, and customer behavior are
identical either way.

## 100% functional — how

- Questions come from the shipped `data/quiz.json` (all 10, skip logic,
  option rules, both languages).
- The catalog comes from the shipped `data/mattresses.json` with the
  approved product photography; accessories from `data/accessories.json`.
- The financing layer reads `data/store-config.json` →
  `store-config.financing`. **Every payment statement on screen is the
  governed config's own copy, with one disclosed exception:** the
  live-conversation ruling (owner, 2026-08-13) retired the governed
  agenda strings (`agendaMark`/`agendaMarked`/`drawerMark` and the
  rendered use of `agendaConsequence`) and supplied replacement
  vocabulary that does not exist in the envelope yet. Those strings —
  "Review this option" / "Currently considering", the "Payment
  preference" / "Options explored" labels, and the consequence line
  (which preserves the governed "Nothing is submitted and no
  application is started." sentence verbatim in both languages) — are
  owner-directed prototype UI copy, flagged in code as PROPOSED
  ENVELOPE EXTENSIONS pending adoption through
  `incoming/lacks_financing.json` — as are the exploration/preference
  pair "Review this option" / "Hide details", "Consider this option"
  ("Considerar esta opción"), and "Clear preference" ("Quitar
  preferencia") — the Spanish subject to the standing native-review
  caveat. Canonical financing config is untouched.
- These production functions are **extracted verbatim from `index.html`
  at runtime** (the repo's test-harness technique):
  - `calculateScores()`, `qualifyRankedChoices()`, `showProfileScreen()`
    — every score, tier, top pick, profile and priority is the production
    engine's output for the answers given
  - `scoreAccessoriesFromAnswers()` — the Sleep System suggestions are
    the production accessory ranking, reasons included
  - `financingTermsFresh()`, `financingPlanFresh()`, `financingAgeOk()`,
    `financingSourceAllowed()`, `finGroupedPlans()`,
    `finPromotionalByProvider()` + taxonomy constants — **what may be
    claimed on the payment screen is decided by production's own gating
    code**, not by a demo imitation
- EN | ES re-renders everything and re-runs the engine in the active
  language. Language switching preserves comparison state, the active
  tier, the finalist, and the payment decision (rev 3 fixed a wipe).
- Presenter rehearsal (`?presenter=1` only): "Rehearsal: fill sample
  answers" on the welcome fills the full sample set; **"Complete
  remaining questions for rehearsal"** on the quiz fills ONLY the
  questions the presenter has not answered — it never overwrites an
  entered answer, respects skip logic, and completes through the real
  engine. Honesty note for the script: after a partial fill the output is
  built from the owner's real answers PLUS the sample's remaining ones —
  say so; do not present it as wholly customer-authored. The sample set
  contains only the shipped quiz's 10 question ids (the retired
  sleep_quality key is gone as of rev 3).
- The reveal's reflection sentence, the why/test trial guidance, and the
  profile subtitle are all production engine output captured verbatim —
  the prototype authors none of them.

## Revision 3 — what changed and why

### Integrity corrections (mandatory, shipped first)

1. **Compare "Test for" misattribution.** Rev 2 assigned the customer's
   first trial priority to mattress A and the second to mattress B — a
   per-mattress claim the engine never made. The compare screen now shows
   ONE shared "Your trial priorities" block spanning both columns (all
   priorities, engine order, no truncation). The hero card's priority
   chips were removed and the detail sheet's chips are labeled "Your
   trial priorities" for the same reason: customer-level guidance never
   renders as one model's attribute.
2. **Isolation check #5 was partly vacuous.** Its suppression clause
   compared a fingerprint key that was never emitted (undefined ===
   undefined — could not fail). The payment fingerprint now emits one
   `structural` object (availability, order, scenario inclusion,
   suppressed/exact state per card, official + per-card destinations,
   calculation capability) compared WHOLESALE between EN and ES, and the
   check additionally asserts the copy actually differs. Proven honest by
   four live mutations (language-routed suppression / destination / calc,
   and a broken language switch) — each flips exactly check #5 to FAIL.
   Static ratchet: `checks/iso5_structural_check.mjs`.
3. **Invented financing-history claim removed.** The script asserted
   that South Texas families had used the store's payment programs since
   the founding year. The verified fact is company heritage only
   (family-owned, South Texas, since 1935) — no source verifies any
   payment program's vintage, so the claim is gone and nothing replaced
   it. Ratchet: a grep gate fails any line that pairs the founding year
   with financing vocabulary (`checks/finalist_state_check.mjs`), which
   is also why this paragraph describes the removed claim instead of
   quoting it.
4. **Silent finalist fallback eliminated.** Rev 2's plan and handoff
   substituted the engine's top pick when no finalist existed and labeled
   it "Finalist." State semantics are now explicit — "Best match" =
   algorithm output on results; "Compared" = customer placed it in
   comparison; "Finalist" = customer explicitly chose it — and without a
   finalist the plan and handoff show **"Recommended starting point"**
   plus **"No finalist selected yet"** with a route back to choose one.
   The plan CTAs are un-gated so the honest incomplete state is reachable
   and demonstrable. The handoff note no longer promises "your finalist"
   unconditionally.

Also fixed while mapping: a language switch used to silently wipe the
comparison selection and active tier (contradicting the i18n rule);
`setLang` now preserves both.

### Personalization (production output only — nothing hand-authored)

- **The reveal speaks their answers back.** Production composes a
  bilingual reflection sentence ("You are shopping for a Queen, share the
  bed with a partner, sleep mostly on your side, and prefer a plush
  feel."); rev 2 captured and discarded it. It now renders under the
  reveal title, captured verbatim from the extracted `showProfileScreen()`
  and recomposed on every language switch. Known production asymmetry,
  inherited not fixed: the size label is English in both languages.
- **The shipped why/test guidance renders.** Each trial priority already
  carried bilingual `why` and `test` prose the prototype never read. Now:
  tap-to-disclose on the reveal (why + what to try), test lines in the
  Sleep Plan, and the specialist's in-store script on the handoff card
  (production handoff parity). Always customer-level, never per-mattress.
- **Need-led hierarchy.** The trial priorities and reflection are the
  reveal's primary content. The archetype is demoted to its bilingual
  subtitle; the internal profile name (never customer-facing in
  production, and untranslated) no longer renders anywhere a customer
  sees — reveal chip, results stamp, and handoff now use the subtitle.
- **Lacks identity, config-driven, one signal per surface.** Welcome
  opens on `voice.eyebrow` / `voice_es.eyebrow` ("FAMILY-OWNED · SOUTH
  TEXAS · SINCE 1935"); the handoff band carries `storeName` above the
  governed headline (Lacks introduces the fitting; Lacks resumes the
  relationship). The inline store constant is gone — every store
  reference resolves from `SC.storeName` at render time. Deliberately NOT
  used: the text wordmark spec (no real logo asset exists in the repo —
  rendering one would fabricate a mark), the city list (no ES value),
  `text.trustSignal` (duplicates the heritage eyebrow), and the
  production palette (a separate owner decision).
- **Made in Texas provenance chip.** Renders strictly on the shipped
  `locallyMade` boolean (`data/mattresses.csv` column `locally-made` →
  `data/mattresses.json`), on cards, the detail sheet, and compare sides.
  21 of 26 models qualify (18 Restonic + 3 Chattam & Wells); verified
  26/26 against the flag at both function and DOM level. Provenance basis
  is the owner ruling recorded in `incoming/lacks_catalog_selection.json`
  (`_meta.notes`): "locallyMade: Restonic + Chattam & Wells (mfr
  Restonic, Texas licensee per Blake)". Nuance for visual review: the
  only production-verbatim customer string is "Made locally"; "Made in
  Texas" follows the owner's directive and ruling, and Chattam & Wells
  carries it via the manufactured-by-Restonic ruling. The chip never
  extends to quality/durability/performance language.

### Match-percentage presentation (no scoring change)

Percentages are normalized WITHIN each tier, so several models can show
100% and numbers are not comparable across tiers. Rev 3 keeps the engine
order byte-identical and: adds a visible "Match strength is relative
within each tier" note on results; keeps tier-labeled percentages in
compare only when both models share a tier, switching to ordinal language
("Best match" / "Close alternative" / "Worth comparing") cross-tier; and
speaks tier + rank instead of a naked percentage on the detail sheet, the
Sleep Plan, and the handoff card. The card rings remain (tier-scoped by
the grid itself, framed by the note).

### Stale-financing governance band (visible fail-closed state)

`paymentModel()` computed `anyStale` and nothing rendered it; the
fail-closed sheet read as missing content. Rev 3 renders a sheet-level
governance band, `financing.copy.staleAnnouncement` verbatim ("Exact
rates and terms are not shown right now. Your Lacks specialist can
confirm current payment options in store."), driven by the same predicate
production uses. Semantics, stated precisely:

- `staleNotice` stays exactly as production renders it — visible,
  per-card, unchanged.
- `staleAnnouncement` is **screen-reader-only in production** (a
  `role="status"` live region). The band keeps `role="status"` — an
  SR-to-visible-and-announced upgrade, not a repurposing — and mirrors
  production's lifecycle: populated when the sheet renders, cleared on
  close so a reopen re-announces, re-announced in the new language on a
  switch. **This is a PROPOSED production change**; production today
  shows sighted customers no sheet-level stale statement.
- The band is scoped to exact rates and terms only. Evergreen paths
  (lease-to-own, Build My Credit) keep their full detail and normal
  contrast — nothing implies Payment Choices is unavailable, that every
  path is stale, or anything about eligibility.
- The isolation harness now pins `anyStale` to its derivation (check #6),
  so the band cannot decouple from the gate it reports.
- `verifiedAt` and `exactPromotionsEnabled` are untouched. **No financing
  verification event was fabricated for this revision** (see the
  demo-prep rule below). If different band wording is ever wanted, that
  is a NEW governed config key through the envelope pipeline — not
  hand-authored prototype copy.

### Accessibility on touched surfaces

`aria-pressed` on the language toggle, tier tabs, compare tags, finalist
buttons, path-preference toggles, Sleep System toggles, and the payment
pause control;
the results card is no longer an ARIA button with buttons nested inside
it (Details and Compare are real buttons; tap-anywhere still works);
`role="dialog"` + `aria-modal` + labels on the detail sheet and isolation
report, with initial focus, focus restoration, and Escape-to-close
(revision 3.1 completed the contract: background inert, Tab
containment, opener restoration with fallbacks, localized names);
`:focus-visible` outlines. Scope discipline: fixes cover the surfaces
revision 3 touched; screen-reader/VoiceOver device work remains
permanently out of scope by owner ruling, and a deeper production
accessibility pass stays production work.

## Revision 3.1 — corrective interaction-state pass

### Payment interaction = live exploration + preference capture

**The walkthrough IS the conversation** (owner ruling, 2026-08-13) —
the customer and specialist are using the tool together in real time,
so the interaction never assembles items for a future discussion. The
model captures OBSERVABLE actions only:

- **Explored paths** — every path whose governed details the customer
  deliberately opened. History, never intent.
- **Current preference** — one path "currently considering" (a
  provisional preference — never an application, approval, eligibility
  determination, or financing commitment), or "Not right now" (the
  authoritative pause), or nothing.

Two DISTINCT per-card actions keep those meanings apart:
**"Review this option"** is exploration only — it reveals the option's
governed details (cards are collapsed by default) and records the path
in the explored history; it can never set a preference. Inside the
revealed details, **"Consider this option"** is the intentional,
ONE-WAY action that records the provisional preference. The selected
state renders as a non-interactive **"Currently considering ✓"
marker** — it can never silently clear itself — with a visibly
subordinate, explicit **"Clear preference"** action beside it (the
only way to clear a path preference; it announces the removal via the
sheet's status region, restores focus to the option's Consider
control, and never deletes the explored history). Single-select:
choosing another path replaces the preference; clearing after an
earlier pause yields "Not selected", never "Not right now". If the
preferred card is collapsed, the static marker stays truthful and the
clear action is available immediately after reopening the details.
Merely reviewing one or several options can never
produce "Currently considering" anywhere in the UI or handoff, and
navigating to the sheet records nothing by itself. The handoff
summarizes what actually happened — a "Payment preference" row always,
an "Options explored" row only when genuinely useful (explored paths
beyond the current preference):

| what happened | Payment preference row | Options explored row |
|---|---|---|
| no payment interaction | Not selected | (absent) |
| explored, nothing selected | Not selected | the explored paths |
| a path selected for review | that path's title | other explored paths, if any |
| preference explicitly cleared | Not selected | all explored paths (history intact) |
| Not right now chosen | Not right now | (suppressed — paused means paused) |

**Not-right-now precedence, stated exactly:** the pause is the
authoritative current state. Explored history is suppressed from the
active handoff (never presented as active requests) but PRESERVED
internally; a newer deliberate path selection is the one action that
replaces the pause — the customer reopened the conversation
themselves — and the history returns with it. Exploration is never
inflated into intent; a made choice never erases the history behind
it. EN/ES switching changes labels only (path ids and destinations are
language-independent); Start over and New customer clear both
dimensions.

### Single-open reveal accordion, measured

Zero or one priority may be disclosed; opening one closes the other;
at most one `aria-expanded="true"`; focus follows the toggled priority
across the innerHTML re-render. The vertical budget was repaired
(constellation capped at min(26vh,170px), tighter stack gap, the
summary sub-line yields while a disclosure is open), and the scene
uses margin-auto centering with overflow:auto so the CTA can never be
clipped out of reach — the scrollbar never appears at supported
viewports. Measured worst-case single-open content height (geometry
method: scene width simulated at exact device widths, both languages):
698px at 1194px and 1180px widths — fits the 748 and 820 heights;
768px at 834px width — fits the 985 and 1112 heights. The restored
multi-open implementation measures 1075px at 834px/ES — past every
target, which is the defect.

### One authoritative language state

`applyLanguageState()` is the only writer for the language variable,
`<html lang>`, both visual selected states, and both `aria-pressed`
values; the mid-session toggle and the new-customer reset both route
through it (the reset after the journey wipe, so nothing recomputes a
cleared journey). Verified: New customer / Start over from welcome,
quiz, results, Payment Choices, and handoff all land in fully
consistent English; mid-session switching preserves answers, tier,
comparison, finalist, Sleep System picks, payment preference, explored
paths, and presenter mode. The rev-3 defect (visible English with
`aria-pressed` still claiming Spanish) is mutation-reproduced and
ratchet-blocked.

### Incomplete states never claim a made choice

The one production test instruction that assumes a finalist (the
Comfortable-elevation branch — traced; production ships no
context-neutral variant) is withheld until a finalist exists:
detection against BOTH language variants, withhold-not-rewrite, the
priority's name and why always render, every other priority keeps its
full prose. The handoff note derives from finalist state AND payment
state (four bilingual variants) — it can no longer say a payment
conversation was chosen beside a "Not selected yet" row, and that
phrasing is ratchet-banned in both languages.

### Modal contract completed

`aria-modal` alone was not containment. Both dialogs now: make the
background inert while open (restored on close, never left behind by
Start over), contain Tab and Shift+Tab with wrap and an
escaped-focus redirect, close on Escape (the visible × stays the
primary exit — iPads have no Escape), and restore focus to the
invoking control — the detail sheet falls back to the same mattress's
Details button if the cards re-rendered, the isolation report to the
live scene. Close buttons are localized (Close/Cerrar), and an open
isolation report re-renders its rows on a language switch.

### Verification and ratchets

`checks/state_interaction_check.mjs` (47 assertions) covers the state
table, the withhold gate, the note matrix, the accordion, the language
authority, and the modal contract; its fix-1/fix-4 assertions FAIL
against the rev-3 source and its fix-2/3/5 assertions FAIL against the
3.1-commit-1 source. Live mutation proofs: multi-open overflow,
focus-losing accordion, hand-toggled reset (stale ARIA), disabled
trap, non-restoring close, plus the commit-1 set. Browser matrix run
EN+ES with the geometry method standing in for real windows at device
widths (the workstation constraint documented under EN/ES and layout);
the physical-iPad touch review remains outstanding.

### Deferred product recommendations (recorded, NOT in 3.1)

1. **Percentage rings** remain visually dominant and can show multiple
   100% values; a future design pass should weigh replacing them with
   ordinal language. Not redesigned here.
2. **Locally-made scoring transparency:** the +25 `locallyMade` bonus
   means match strength includes a retailer preference, not only sleep
   attributes. Owner decision for later: disclose the local preference
   separately, or reconsider its place inside the score. Unchanged here.
3. **Dedicated visible financing-status copy:** production should
   preferably get its own visible governed key rather than reusing
   `staleAnnouncement`; the prototype's visible reuse stays explicitly
   marked as a proposed production change. No canonical config change.
4. **Native Spanish showroom review:** "Queen", subtitle phrasing,
   capitalization, and regional register need a qualified native Lacks
   reviewer; the shipped bilingual behavior is kept as-is.
5. **Customer-recorded mattress reactions** remain the recommended next
   substantive personalization phase.
6. **Physical iPad validation** is still required for touch, safe
   areas, real browser chrome, and mounted-showroom behavior; the
   workstation matrix does not replace it.

## The two-path architecture (the roadmap's, made visible)

1. **Sleep path:** answers → Sleep Signature → profile + trial
   priorities → tiered matches → comparison → explicit finalist →
   Sleep Plan.
2. **Payment Choices:** an optional, invariant information layer.
   It never enters scoring, and quiz answers never alter it.

The journey makes both meaningful: the welcome sets the neutral
expectation (governed `welcomeSupport` copy plus the config voice's
"Your consultation builds …Payment Choices" line, subordinate to Start);
the quiz shows only a journey indicator (Fitting · Matches · Sleep Plan ·
Payment Choices — payment never interrupts the fitting); the first real
entry appears **after** the matches, leading with the governed firewall
line "Your matches are based on sleep fit — never on payment method";
the mattress detail sheet carries the one quiet, consistent
"Ways to bring it home → Explore payment options" link; the Sleep Plan
records an equal, reversible decision; the handoff hands the specialist
the payment-conversation signal.

## The canonical Payment Choices screen

Structure mirrors production `renderFinancingSheet()` card for card, in
governed order:

1. **Synchrony promotional financing** — exact offers render **only**
   when production's `financingTermsFresh()` passes (strict
   `exactPromotionsEnabled === true` AND `verifiedAt` within `maxAgeDays`
   AND an allowlisted https source). Today that gate is closed
   (`exactPromotionsEnabled: false`, and the 2026-07-31 verification is
   past its 7-day window), so the card shows the specialist-confirm
   staleNotice — exactly as deployed production does right now.
2. **Lacks In-House Credit** — its detail states a term range, so it is
   freshness-gated like the exact offers (production's own rule); stale →
   staleNotice, disclosure still shown.
3. **Lease-to-own** and 4. **Build My Credit** — claim-safe orientation
   details always show, plus production's fixed additional-options
   disclosure. Never any payment math.
5. **Purchasing for delivery to Mexico?** — selected only by
   `presentationScenario: "mexico-delivery"`, visible to everyone, fixed
   last, in both languages. Detail and the representative example are
   freshness-gated (suppressed today). Links only the verified
   `mexicoInfoUrl`; the config's unverified Mexico application URL is
   never rendered (its own config note).

Each card is collapsed by default and carries the "Review this option"
exploration control — revealing the governed details records the path
as explored, never a preference; the distinct "Consider this option"
action inside the details records the provisional preference
(owner-directed prototype copy — see the disclosed exception above).
The sheet closes with the official Lacks financing-page link (fails
closed via `financingSourceAllowed`), the external-site notice, the
governed disclosure footer, and the consequence line, which preserves
the governed "Nothing is submitted and no application is started"
sentence verbatim. Visuals are sober typographic cards — no
cash imagery, approval marks, gauges, countdowns, or any implication that
a displayed mattress qualifies.

**Demo-prep rule — do not "freshen" the config.** To preview the
exact-claim presentation it is not enough to flip
`exactPromotionsEnabled`; the 2026-07-31 `verifiedAt` is past its 7-day
window, so the age gate still suppresses. Editing `verifiedAt` to make
the demo show rates would fabricate a verification event that never
happened. The suppressed state IS the correct demonstration until a real
re-verification against the allowlisted source is performed and recorded.

## The Sleep Plan and handoff

The Sleep Plan combines: the finalist when one was explicitly chosen (on
the compare screen or in a detail sheet) — otherwise an honestly labeled
"Recommended starting point" with "No finalist selected yet" and a route
back — trial priorities with their test guidance, compared mattresses,
optional Sleep System selections (production accessory ranking, governed
`sleepSystemGuidance` line), and the live payment moment: the current
preference stated plainly ("Payment preference: …"), a governed
"Explore payment options" button that NAVIGATES to the sheet without
recording anything (exploring is not intent), and governed "Not right
now" — the authoritative, equal, reversible pause. Any preference can
be changed or cleared (governed announce copy confirms both), and a
deliberate path selection on the sheet replaces the pause.

The handoff card (store attribution + governed headline "Your Sleep
Plan. Your Payment Choices.") gives the salesperson: the profile
subtitle, the trial priorities with their in-store test script, which
mattresses were compared, the finalist — explicitly distinguished from
the engine's recommendation, with "No finalist selected yet" stated when
none was chosen — Sleep System picks, and the payment summary of what
actually happened in the walkthrough: the current preference, plus the
options explored when that adds information ("Not right now"
suppresses the history — revision-3.1 table above). No raw quiz
answers, no eligibility implication, no future-discussion agenda.

## State isolation — demonstrated live

"Isolation check" on the welcome screen (presenter mode) runs in-app and
reports PASS/FAIL:

1. Payment state (preference, explored paths, Sleep System picks) cannot move
   scores, recommendation order, default tier, top-pick emphasis, the
   Sleep Signature, or Sleep Brief priorities — verified by live engine
   re-runs across six payment-state mutations. (Structurally: the
   extracted engine's only inputs are `(answers, language)`.)
2. The saved finalist is untouched by payment-state changes.
3. Quiz answers cannot change program availability, order, or financing
   language — two contrasting answer profiles produce byte-identical
   payment output. (`paymentModel()` reads `store-config.financing` only.)
4. The Mexico path is visible to everyone and fixed last.
5. Language changes copy only — program availability, order, scenario
   inclusion, suppressed/exact state, official and per-card destinations,
   and calculation capability are compared as ONE structural object that
   must be identical EN vs ES, while the copy itself must actually
   differ. (Rev 3: the rev-2 version of this check compared a key the
   fingerprint never emitted and could not fail.)
6. Exact rate/term claims render only when production's own
   `financingTermsFresh()` allows them (fail-closed today, including the
   In-House and Mexico details) — and `anyStale`, which drives the
   governance band, is pinned to its per-card derivation.
7. No plan enables payment calculation — no monthly-payment estimate can
   exist (V1 invariant).

Harness honesty was proven by mutation: injecting an answer-sensitive
payment model flips check 3 to FAIL (rev 2, 2026-08-13); rev 3 added four
proofs for check 5 — language-routed suppression, a language-routed
Mexico destination, language-routed calculation capability, and a broken
language switch that leaves ES rendering English copy — each flips
exactly check 5 to FAIL, and restoring returns 7/7 PASS (verified live,
2026-08-13). `checks/iso5_structural_check.mjs` and
`checks/finalist_state_check.mjs` ratchet the repairs statically (both
FAIL against the rev-2 source).

Also absent by construction: monthly-payment estimates, approval
predictions, product-specific qualification, credit or income questions,
ZIP-code routing.

## The 3–5 minute store-owner script (revision 3 — run in `?presenter=1`)

1. **(25s) Welcome — Lacks introduces the fitting.** The screen opens on
   the owner's own line: FAMILY-OWNED · SOUTH TEXAS · SINCE 1935. "Your
   heritage frames the experience — straight from your config, both
   languages. DreamFinder supports your specialist; it never replaces
   them. And the promise at the bottom: the consultation builds toward a
   Sleep Plan and Payment Choices — but payment waits its turn."
2. **(60s) The fitting.** Hand them the tablet; let them answer 3–4
   questions for real. Then tap **"Complete remaining questions for
   rehearsal"** — their answers stay, only the unanswered ones fill from
   the sample. Say so: "The rest is a rehearsal fill — your first four
   answers are really yours, and everything you're about to see is
   computed from the combined set by the production engine."
3. **(25s) The reveal — their answers, spoken back.** The constellation
   draws, and under the title the engine restates what they said: "You
   are shopping for a Queen, share the bed with a partner…" Tap one
   priority open: "One answer — side sleeping — became one priority —
   pressure relief — and one showroom action: settle in for a minute and
   notice pressure at the shoulder and hip. That's the fitting script,
   written from their answers."
4. **(40s) The shortlist.** "Your inventory, your photography. Order is
   the engine's honest signal — the note says match strength is relative
   within each tier, so nobody's oversold a number. See the Made in Texas
   chips: your locally-made lineup, flagged from your own catalog data.
   And the line that protects everything: *'Your matches are based on
   sleep fit — never on payment method.'*"
5. **(60s) Payment Choices — governed, visibly.** Open the sheet. "Every
   way Lacks brings a bed home: promotional financing, Lacks In-House
   Credit, lease-to-own, Build My Credit, and the Mexico-delivery
   program, always present. Read the brass band: exact rates and terms
   are not shown right now — because the governed verification conditions
   aren't currently satisfied. The system refuses to advertise yesterday's
   terms; that is a compliance feature, not a broken screen. Notice
   lease-to-own and Build My Credit still show their full orientation —
   only exact claims wait for re-verification. Select a path to
   consider together, right here — nothing is submitted, no
   application starts."
6. **(30s) Spanish, live.** Tap ES with the sheet open. "Same programs,
   same order, same gates — the customer's preference and explored
   options survive the switch. The whole journey does this: answers,
   finalist, plan." The
   Spanish is the shipped bilingual copy — still pending native Lacks
   review — and nothing is performed or improvised.
7. **(45s) Compare → finalist → the close.** Back in EN: compare side by
   side — the trial priorities span BOTH beds, because they belong to the
   customer, not to a mattress. Pick a real finalist, add the suggested
   base, and settle the payment moment together — explore the options
   now, or 'not right now', a first-class answer. Then hand the
   owner the handoff card and role-play: "You just walked over. Five
   seconds — what do you know?" The card says what the customer CHOSE
   versus what the engine recommended; if no finalist was picked it says
   so — "No finalist selected yet," never a pretend choice.
8. **(15s) The privacy close.** Tap "New customer." Card gone,
   constellation gone, language back to English. "The next shopper
   inherits nothing. That's the session discipline production enforces."

## Before / after — the key payment moments

- **Before (production today):** payment lives in a compact results
  module and a utilitarian sheet; visually it reads as a footnote next to
  the editorial sleep journey.
- **After (this prototype):** payment is a staged movement of the same
  Nocturne journey — expectation on the welcome, governed firewall line
  at the results, a cinematic full-screen Payment Choices sheet, an equal
  three-way decision inside the Sleep Plan, and an explicit signal on the
  consultation card. Same governed copy, same gating, same isolation —
  presented like half the business, because it is.
- In-session captures (2026-08-13): welcome with payment expectation;
  results with the fit-first band; Payment Choices EN and ES (stale
  presentation); Sleep Plan with the decision row; handoff with the
  payment signal; isolation report 7/7 PASS.

## EN/ES and layout

Every new string is bilingual — financing copy from the governed config,
UI labels as `{en, es}` pairs. One inherited production asymmetry is
documented above (size labels render in English in the ES reflection).

Viewport status, stated exactly: the device-exact viewports (landscape
1194×748, portrait 834×985 at exact device width) were verified on
2026-08-13 for the revision-2 layout. The revision-3 additions
(reflection, priority disclosure, governance band, honest-state notes,
identity lines) were swept EN+ES at 1920×889 wide landscape — no
horizontal scroll, everything in view — but could not be re-swept at
device-exact sizes in-session (the workstation's Chrome windows were in
active use and kept re-maximizing). All additions sit inside the
already-verified column flows with max-width caps and the portrait media
rules are unchanged, so risk is low — but device-size confirmation of
revision 3, full-height portrait, and touch behavior all belong to the
physical iPad review, the same standing caveat as revisions 1–2.

Touch-handling note: the prototype uses `onclick` +
`touch-action: manipulation` throughout (no `touchend`/`pointerdown`
ghost-click guards — production's hard-won pattern). Adding those guards
is a deliberate change that needs the owner's touch-rules sign-off, so it
is documented here for the iPad pass rather than slipped into revision 3.

## Deliberately unchanged

- **Recommendations** — the real engine, extracted verbatim; no
  re-ranking, no new scoring inputs of any kind.
- **Financing governance** — production's gating code decides every
  claim; where production suppresses, the prototype suppresses.
- **Copy discipline** — no construction or performance claims; retired
  claim classes do not reappear; no hand-authored financing claims.
- **White-label boundary** — store identity comes from config (the demo
  constant is flagged); financing structure is config-driven throughout.

## Production-impact estimate

Sleep-side slices are unchanged from revision 1 (welcome S, quiz restyle
M, reveal M gated on 1.1 approval, results M–L, compare S–M, consultation
M, constellation component M). The Payment Choices integration adds:

| Prototype element | Ships as | Size | Notes / gates |
|---|---|---|---|
| Welcome payment expectation + outcome line | config-driven copy slot on the welcome | S | copy exists in config already |
| Quiz journey indicator | presentation-only strip | S | no quiz structure change |
| Results fit-first band restyle | restyle of the existing `resultsFinancing` module | S–M | copy keys already wired |
| Payment Choices sheet restyle (Nocturne cards) | restyle of `renderFinancingSheet` markup/CSS; logic untouched | M | gating code must not change; validate_financing + smoke pins |
| Sleep Plan scene (finalist + decision) | **new screen** between compare and handoff; decision state joins the session wipe inventory | L | biggest new surface; touch + session-reset review; device pass |
| Explicit finalist selection | new state + compare/detail controls | M | feeds handoff + email |
| Handoff payment signal rows | extension of the handoff renderer | S–M | reuses preference + explored-path state |
| Isolation checks | port into `tests/` as a node suite pinning both directions | S | belongs in the suite regardless |
| Answer reflection + why/test surfacing | presentation of existing engine output | S–M | no engine change; email/handoff parity check |
| Honest finalist semantics | state labels + incomplete-plan handling | S | pairs with the Sleep Plan slice |
| Stale governance band | **PROPOSED production change**: render `staleAnnouncement` visibly with `role="status"` (production is SR-only today); lifecycle must ride along | S | needs owner + review sign-off explicitly |
| Made in Texas chip | config/dict-driven provenance chip on `locallyMade` | S | wording decision (vs production-verbatim "Made locally") is the owner's |
| Match-% presentation | tier-relative note + ordinal language | S | no scoring change; copy review |
| Presenter mode | query-param-gated rehearsal tools | S | kiosk hardening review decides the mechanism |

## Recommended next revision

**Customer-recorded trial reactions** (capturing what the customer felt
on each tested bed and carrying it to the handoff) is the highest-value
next step — deliberately NOT built in revision 3 to keep this round
reviewable.

Each slice goes through the canonical PR workflow with the Phase 1
output-regression gate proving recommendations byte-identical.

## Why the first prototype omitted this layer, and how this corrects it

The omission was a judgment error in scoping, not a technical constraint:
I read the demo priority ("sleep-first, financing secondary") as license
to show financing nowhere at all, when the roadmap's actual model is two
first-class paths with a strict one-way firewall. A store owner buys the
whole commercial story — fit that builds trust *and* a governed,
pressure-free road to "bring it home" — so a demo without Payment Choices
undersold the product's half that pays for it. The correction integrates
the layer at every point the roadmap defines (welcome expectation, quiz
indicator only, post-matches entry, one quiet detail link, Sleep Plan
decision, canonical sheet, handoff signal), sources every statement from
the governed config, lets production's own extracted gating decide what
may be claimed, and proves the firewall live in both directions with the
in-app isolation check.
