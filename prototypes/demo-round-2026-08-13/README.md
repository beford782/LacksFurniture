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
  governed config's own copy; nothing is hand-authored.**
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
3. **Invented financing-history claim removed.** The script said "South
   Texas families have financed with Lacks since 1935." The verified fact
   is company heritage (family-owned, South Texas, since 1935) — no
   source verifies any financing program's vintage, so the claim is gone
   and nothing replaced it. Ratchet: a grep gate fails any line pairing
   "1935" with financing vocabulary (`checks/finalist_state_check.mjs`).
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
buttons, agenda toggles, Sleep System toggles, and the payment decision;
the results card is no longer an ARIA button with buttons nested inside
it (Details and Compare are real buttons; tap-anywhere still works);
`role="dialog"` + `aria-modal` + labels on the detail sheet and isolation
report, with initial focus, focus restoration, and Escape-to-close;
`:focus-visible` outlines. Scope discipline: fixes cover the surfaces
revision 3 touched; screen-reader/VoiceOver device work remains
permanently out of scope by owner ruling, and a deeper production
accessibility pass stays production work.

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
"Ways to bring it home → Plan the conversation" link; the Sleep Plan
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

Each card carries the governed "Add to discussion" agenda toggle; the
sheet closes with the official Lacks financing-page link (fails closed via
`financingSourceAllowed`), the external-site notice, the governed
disclosure footer, and the agenda consequence line ("Nothing is submitted
and no application is started"). Visuals are sober typographic cards — no
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
`sleepSystemGuidance` line), and the Payment Choices decision as three
equal, reversible buttons — governed "Plan the conversation" (the config's
`resultsAsk`, = the directive's "Review options"), governed "Not right
now" (`agendaNotNow`, = "Not now"), and "Undecided". "Not right now" is
exactly as prominent and as usable as the others, and any choice can be
changed or cleared (governed announce copy confirms both).

The handoff card (store attribution + governed headline "Your Sleep
Plan. Your Payment Choices.") gives the salesperson: the profile
subtitle, the trial priorities with their in-store test script, which
mattresses were compared, the finalist — explicitly distinguished from
the engine's recommendation, with "No finalist selected yet" stated when
none was chosen — Sleep System picks, and the payment signal (the
decision plus any agenda-marked paths). No raw quiz answers, no
eligibility implication.

## State isolation — demonstrated live

"Isolation check" on the welcome screen (presenter mode) runs in-app and
reports PASS/FAIL:

1. Payment state (decision, agenda marks, Sleep System picks) cannot move
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
   only exact claims wait for re-verification. Mark a path to discuss —
   nothing is submitted, no application starts."
6. **(30s) Spanish, live.** Tap ES with the sheet open. "Same programs,
   same order, same gates — the customer's marked agenda survives the
   switch. The whole journey does this: answers, finalist, plan." Natural,
   reviewed Spanish throughout — nothing performed.
7. **(45s) Compare → finalist → the close.** Back in EN: compare side by
   side — the trial priorities span BOTH beds, because they belong to the
   customer, not to a mattress. Pick a real finalist, add the suggested
   base, answer the one respectful question (now / not right now /
   undecided — 'not right now' is a first-class answer). Then hand the
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
Landscape is verified at the recorded device viewport (1194×748).
Portrait is verified at the exact device width (834px); the workstation
display cannot produce the device's full 1108px height, so full-height
portrait and touch behavior remain deferred to the physical iPad review —
same standing caveat as revisions 1–2.

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
| Handoff payment signal row | extension of the handoff renderer | S–M | reuses agenda state |
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
