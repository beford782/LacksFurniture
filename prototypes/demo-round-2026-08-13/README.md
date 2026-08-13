# Nocturne — demo-impact prototype (2026-08-13, revision 2)

**Status: PROTOTYPE ONLY — awaiting owner visual review.** Isolated under
`prototypes/`; no production behavior, scoring, canonical data, claims, or
deployment is changed. No production PR exists for this work.

**Revision 2 (owner correction, 2026-08-13):** the first cut omitted the
Payment Choices layer — roughly half the commercial story. This revision
integrates it end to end without letting it touch the fitting. See "Why
the first prototype omitted this layer" at the bottom.

## Run it

Serve the **repo root** (the prototype loads the real shipped data and
engine), then open the prototype:

```
python -m http.server 8000
# → http://localhost:8000/prototypes/demo-round-2026-08-13/
```

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
  language. "Rehearsal: fill sample answers" fills a plausible answer set
  for practicing the demo — results still come from the real engine.

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

The Sleep Plan combines: the explicit finalist (chosen on the compare
screen or in a detail sheet), trial priorities, compared mattresses,
optional Sleep System selections (production accessory ranking, governed
`sleepSystemGuidance` line), and the Payment Choices decision as three
equal, reversible buttons — governed "Plan the conversation" (the config's
`resultsAsk`, = the directive's "Review options"), governed "Not right
now" (`agendaNotNow`, = "Not now"), and "Undecided". "Not right now" is
exactly as prominent and as usable as the others, and any choice can be
changed or cleared (governed announce copy confirms both).

The handoff card (governed headline "Your Sleep Plan. Your Payment
Choices.") gives the salesperson: profile, what the customer needs to
feel, which mattresses were compared, the finalist, Sleep System picks,
and the payment signal — the decision plus any agenda-marked paths. No
raw quiz answers, no eligibility implication.

## State isolation — demonstrated live

"Isolation check" on the welcome screen runs in-app and reports PASS/FAIL:

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
5. Language changes copy only — program order, suppression state, and
   destinations are structurally identical EN vs ES (no language routing).
6. Exact rate/term claims render only when production's own
   `financingTermsFresh()` allows them (fail-closed today, including the
   In-House and Mexico details).
7. No plan enables payment calculation — no monthly-payment estimate can
   exist (V1 invariant).

Harness honesty was proven by mutation: temporarily injecting an
answer-sensitive payment model flips check 3 to FAIL; restoring it
returns 7/7 PASS (verified in-session, 2026-08-13).

Also absent by construction: monthly-payment estimates, approval
predictions, product-specific qualification, credit or income questions,
ZIP-code routing.

## The 3–5 minute store-owner script (revised — the full business story)

1. **(25s) Welcome.** "This is DreamFinder — your fitting room for sleep.
   Bilingual, one tap. And notice the promise at the bottom: the
   consultation builds toward a Sleep Plan **and** Payment Choices — but
   payment waits its turn."
2. **(60s) The fitting.** Hand them the tablet; let them answer 3–4
   questions for real. "Ten questions, about two minutes. No payment
   interruptions, no credit questions — the fitting stays about sleep."
3. **(25s) The reveal.** The constellation draws. "Their sleep signature,
   from their answers. These three chips are what your salesperson tests
   with them on every bed."
4. **(40s) The shortlist.** "Your inventory, your photography, real match
   percentages. And here's the line that protects the whole thing —
   *'Your matches are based on sleep fit — never on payment method.'*
   The customer can explore payment right here, and the matches cannot
   move."
5. **(60s) Payment Choices.** Open the sheet. "Every way Lacks brings a
   bed home, in one governed screen: promotional financing, Lacks
   In-House Credit, lease-to-own, Build My Credit, and the
   Mexico-delivery program,
   always present, in Spanish too. Look at the promotional card today:
   the system is showing 'your specialist has current options' instead
   of a rate — because the config's verification window lapsed. It
   refuses to advertise yesterday's terms. That's built-in compliance,
   and when your team re-verifies, current terms come back on. The
   customer can mark paths to discuss — nothing is submitted, no
   application starts."
6. **(45s) Compare → finalist → Sleep Plan.** "They compare side by side,
   pick a real finalist, add the base the engine suggested — and answer
   one respectful question: talk payment now, not right now, or
   undecided. 'Not right now' is a first-class answer; nobody gets
   cornered."
7. **(25s) The close.** The handoff card. "Your salesperson gets the
   whole consultation: what to have them feel, what they compared, the
   finalist — and whether to open the payment conversation. The tool
   doesn't replace your closer. It hands them the close, with the
   payment door already ajar exactly as far as the customer opened it."

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
UI labels as `{en, es}` pairs. Landscape verified in-session; portrait
CSS is in place for every new scene (single-column plan grid, stacked
payment band) but the workstation window manager refused a portrait
viewport, so portrait is deferred to the iPad review — same status as
revision 1.

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
