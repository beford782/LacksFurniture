# Phase 1 assisted-sales evaluation packet — expert-assisted dry run

**STATUS: RUN — WITH RECORDED DEVIATIONS (2026-08-07, first pass).**
Session executed by Blake Ford after the Codex re-review gate passed at
head `c73324e`. **Deviations from the frozen protocol, stated plainly:**

1. **Solo session** — Blake played both the operator and the customer
   role. Every "can both people…"/shared-viewing item below is therefore
   **self-report by one expert**, not two-person observation; this run is
   an expert walkthrough, one grade weaker than the designed paired dry
   run.
2. **English pass only** — the Spanish pass was skipped and remains an
   open item (§5 L-section marked NOT RUN).
3. **Transcription method** — answers were given live by Blake in an
   interview and transcribed into this document by the session assistant.
   Every result below is Blake's stated observation; none originates from
   agent output, automated checks, or screenshots.
4. **Serving** — via the temporary public static mirror
   (`beford782.github.io/df-phase1-dryrun`, pinned to commit `c73324e`)
   instead of `localhost`; path and query parameters of the frozen URLs
   were identical (scenario `dense-c`, `mode=evaluation`).

This remains an **expert-assisted dry run**, not customer research. It
does not substitute for Phase 0.4 device evidence, native Spanish review,
or any later real-customer validation.

---

## 1. Fixed session parameters (as run)

| Parameter | Frozen value | As run |
|---|---|---|
| Date / time | — | 2026-08-07, evening |
| Operator (salesperson role) | one person throughout | Blake Ford |
| Observer (customer role) | one person throughout | **Blake Ford (SOLO — deviation 1)** |
| Device | same physical device throughout | iPad (model not stated) |
| Orientation / mount | fixed for the session | **held in hand, landscape** |
| Fixture scenario | `dense-c` all stations | dense-c ✓ |
| Language | one language per pass | EN (first pass; ES pass not run) |
| Mode | evaluation | evaluation ✓ (verified: minimal notice only) |
| Task | scripted per station (§3) | scripts read and followed ✓ |
| Serving | repo over HTTP | static mirror pinned to `c73324e` (deviation 4) |

No mid-station URL/state change occurred; no restart was needed.

## 2. Stations (as run)

S1 `sleep-brief-recommended` and S2 `results-tabs`, both dense-c EN
evaluation mode, launched from the mirror's launcher page. No other
variant was staged.

## 3. Task scripts

Read aloud as written in the frozen packet (S1: open with the main need →
what we'll test and how → what happens next; S2: show three tiers → where
to start and why → select two → open the comparison).

## 4. Observation log (events as reported by Blake)

| # | Station | Event observed | Immediate consequence | Likely cause | Confidence |
|---|---|---|---|---|---|
| 1 | S1 | "What happens next" journey rail judged non-informative in landscape | Prime right-column space underused; operator suggests graphics/imagery there instead | Generic three-step production journey copy (rendered verbatim by design) | med |
| 2 | S1 | The elevation "Try this" line could not be narrated at the Brief stage | Top-billed priority's testing guidance goes unused in the opening | Sequencing: the adjustable-base test only happens after a finalist is chosen; the guidance reads as an immediate task | high |
| 3 | S1 | Sticky action bar slightly crowds content ("a little bit") | Minor visual crowding at some scroll positions, hand-held landscape | Bar reserve tuned on other geometry; re-check on mounted device | med |
| 4 | S2 | Sibling models within a tier read as near-duplicates (Reserve Mayfair pair; Platinum plush/medium trio) | Walkthrough confusion — hard to say why one over the other | No on-card product-difference content: description layer demoted (unapproved source), differentiators compare-panel-only | high |
| 5 | S2 | Compare-open reads as "the same screen — same headers" | Sense of arrival at a distinct comparison context diluted | Sticky tier tab row persists above the comparison panel | high |
| 6 | S2 | Payment Choice module "kind of blended together" with the page | No distraction — but operator asks whether it should be MORE noticeable to plant the financing seed | Deliberate secondary styling; visibility level is an implementation dial within the fit-first rule | med |
| 7 | both | Recurring operator idea (three separate mentions): use lacks.com per-model spec cards as the substance source — not as images, but AI-interpreted into concrete comparative construction facts ("Maria adds two layers of serene foam; Mayfair adds a micro-coil layer") | Names a concrete candidate source for the empty product-description/comparison-substance gap | The structural gap this package deliberately shipped with (no approved source) | high |

## 5. Structured capture checklist (Blake's answers)

### S1 — Sleep Brief (`sleep-brief-recommended`)

| # | Question | Result |
|---|---|---|
| S1.1 | Both people state the primary need? | **Yes (solo self-report):** "Comfortable elevation — the big title made it obvious." |
| S1.2 | Badge category labels understandable? | **Mixed:** workable, but the Sharing badge's value felt possibly redundant — "did they need to be reminded this was the family bed?" |
| S1.3 | Firmness read as a feel target, not a score? | **NO (adverse):** "It seems more like a score or rating." |
| S1.4 | "Try this" noticed and usable in narration? | **Partial/no (adverse, sequencing):** the elevation guidance can't be used at this stage (log #2). |
| S1.5 | Sticky action area obscure/compete? | **Slightly:** "a little bit" (log #3). |
| S1.6 | CTA communicates what happens next? | **NO (adverse):** "honestly not really." Direction given: enticing, journey-launch energy — "glowing or something" — without being cheesy. Wording remains open. |
| S1.7 | Operator narrates without hunting? | No hunting reported (not directly probed; solo). |
| S1.8 | Context lost during scrolling? | Not reported — "only had to scroll." |
| S1.9 | Device repositioned? | **No.** |
| S1.10 | Repeated or missed taps? | **No.** |
| S1.11 | Compare understanding | n/a — no Compare on the first-visit Sleep Brief |
| S1.12 | Payment Choice distraction | n/a — absent from the Sleep Brief |

### S2 — Results (`results-tabs`)

| # | Question | Result |
|---|---|---|
| S2.1 | All three tiers discoverable? | **Yes** — with the sibling-duplication confusion inside tiers (log #4). |
| S2.2 | Selected tier always clear? | **Yes.** |
| S2.3 | Lead distinguishable from supports at a glance? | **NO (adverse):** the visual treatment is present but the lead doesn't justify itself — "need real differences," pointing at spec-card substance (logs #4, #7). |
| S2.4 | Details/Save/Compare findable without hunting? | **Yes** — "easy to find." |
| S2.5 | Compare's disabled state makes sense? | **Yes** — "that was clear." |
| S2.6 | Opening Compare an obvious consequence? | **Mixed (adverse nuance):** the scroll landed correctly, but "having the same headers as before was a little confusing" — the comparison didn't feel like a distinct place (log #5). |
| S2.7 | Payment Choice interrupts? | **No** — blended in; operator questions whether it is too quiet (log #6). |
| S2.8 | Absence of product blurb noticed/harmful? | **Yes, noticed and costly** for sibling differentiation — the session's central theme (logs #4, #7). |
| S2.9 | Can both state "the one to start with and why"? | **Not fully** — which one, yes; a substantive *why* beyond the fit rows, no (subsumed in S2.3). |
| S2.10 | Context lost scrolling? | No. |
| S2.11 | Device repositioned? | No. |
| S2.12 | Repeated/missed taps? | "Don't think so." |
| S2.13 | "Try this" noticeability | n/a — guidance lives on the Sleep Brief |

### Second-language pass

**NOT RUN — skipped by decision during the session.** L.1/L.2 remain
open, alongside native Spanish review.

## 6. Debrief answers

- **Per-customer hero title vs fixed heading** *(recorded as SPECULATION —
  the fixed-heading variant was not staged)*: "I wouldn't worry about the
  opening being repeatable or not." The need-led hero stands; the residual
  A-vs-B question is retired.
- **Missing the product blurb on the lead card:** yes — answered
  throughout S2: the wanted replacement is spec-card-derived comparative
  substance through the approval workflow (log #7), not the old
  topPickReason copy.
- **What almost broke the conversation:** "Not really — everything flowed
  fine."

## 7. Session verdicts (Blake's)

- **Sleep Brief direction: CONFIRMED** ("sounds right"), with recorded
  revision items: firmness readout reads as a score (S1.3); CTA unclear,
  wants journey-launch energy (S1.6); journey rail underuses landscape
  space (log #1); Sharing badge value questioned (S1.2); minor sticky-bar
  crowding (S1.5).
- **Results direction: CONFIRMED in structure, REVISE in presentation** —
  "needs more images maybe and graphics instead of all text"; plus the
  compare-context dilution (S2.6) and the Payment Choice visibility dial
  (S2.7) as implementation-review items.
- **Must change before Phase 1 implementation authorization:** "need some
  other validation of why one mattress is superior to the other and why
  that is important to sleep" — i.e., **substantive, evidence-backed
  product-difference and fit content. The catalog-content workflow (named
  owner, spec-card evidence, claim-safety pass; possibly AI-drafted,
  always human-approved) is the critical path.** Structure approved;
  substance is the blocker.
- **Re-test on the real device once Phase 0.4 closes:** sticky-bar
  crowding in hand-held landscape; compare-open context feel; ("think you
  got it" to these nominations).

## 8. What this run cannot establish

Unchanged from the frozen packet, now with the run's own deviations added:
mounted-showroom-device behavior (Phase 0.4 remains ⏳), real
assistive-technology behavior, representative-customer comprehension —
**further weakened by the solo deviation: no second person observed
anything today** — Spanish behavior and copy (pass not run; native review
outstanding), catalog copy approval (the claim-risk inventory still awaits
its owner), the fixed-heading comparison (speculation only), and
production readiness. Do not cite this packet for any of those.
