# Guided-selling cohesion review — pass 1 owner decisions (2026-08-30)

**For:** Blake Ford (owner / approver of record). **Milestone:** Phase 1 —
Guided-selling cohesion and conversion readiness (🔨). **Input:** the pass-1
packet `docs/guided-selling-cohesion-review-2026-08-30.md` (read-only evidence
and proposals, reviewed tree `6b449a4`, application bytes identical to `main`
`db68f3f`). **Status of this document:** the record of Blake's written
keep / change / experiment rulings on that packet. It moves no status, changes
no application byte, and authorizes no merge, deployment or showroom use. Each
*change* below is scheduled as its own bounded PR and is implemented only on
that PR under the standing Phase 1 constraints; each *experiment* is a
prototype on a branch that is never merged as such.

**Governance context.** PR #76 (the 2026-08-29 owner direction, roadmap and
guidance reconciliation, agent operating files) was approved by Blake and
merged 2026-08-30 as `3dac218` (CI run 33320468148 success; Pages build and
deployment success). The packet and its evidence were deliberately **not**
added to #76; they are preserved by this PR instead (see "Evidence
preservation" below).

## Rulings — Blake Ford, 2026-08-30 (verbatim intent, packet cross-reference)

### CHANGE — six bounded PRs

| # | Ruling | Packet source | Bound of the change | Preserved |
|---|---|---|---|---|
| C1 | Fix the Sleep System utility-bar / header collision in EN and ES at both tablet orientations. | Beat 9 (defect, measured by `probe_overlap.py`: at 1194×748 the fixed `.session-utility` bar covers the top 30 px of the "Review Sleep Plan" control; at 834×1108 it covers the right end of the h1) | CSS clearance for the Sleep System header at both breakpoints; no copy, data or engine change. Routed through the 1.4 Sleep System workstream (it is a 1.4 surface); item 1.4 stays ⏳. | The utility bar itself (language + Restart), its position on every other screen, and the Sleep System's content and step order. |
| C2 | Bring mattress identity and useful starting context into the Results landscape first fold. | Beat 5 (at 1194×748 the Best Match name sits ≈1,100 CSS px down — below the fold) | Landscape presentation of the Best Match hero only (image height cap and/or name · tier · feel brought into the first fold); portrait unchanged. | Card hierarchy, tier tabs, ordering, the tier-relativity note, the reason-content workstream (1.3 — content, not presentation). |
| C3 | Prototype a Consultation Summary finalist hero / status block and an improved implication-line presentation **without changing approved meaning**. | Beat 11 (the finalist is a sentence, not a moment; the implication lines render as lowercase fragments) | (a) a finalist hero band + status *block* carrying the existing three-state finalist semantics (chosen / recommended starting point / none) and the existing state strings; (b) presentation (capitalisation or labelled chips) of the approved 0.6 implication mapping. **No wording change** to either — any wording change is a separate owner decision. Prototype first, then the bounded PR. | Every card below the hero; the 0.6 mapping; the D5b finalist provenance rule (no promoted substitute). |
| C4 | Replace the full-width heading focus rectangles with a polished text-hugging treatment while preserving visible focus and the 0.3 behaviour. | Q6 (Results, Sleep Plan, Sleep System, Summary, take-home) | Focus-ring styling only (e.g. inline-block heading + offset ring in the brand ink); contrast re-checked by `tests/contrast_check.mjs`; forced-colors behaviour re-verified. | 0.3 exactly: `showScreen()` still moves focus to the screen heading and announces; focus stays visible on every screen. |
| C5 | Fix singular / plural "Selection(s)". | Q17 (the pill renders "1 Selections" from count + the static `header.picks` label) | A pluralised dictionary pair in `dict-en.json` / `dict-es.json` and the one call site; no other copy. | Everything else on the pill and header. |
| C6 | Replace "Don't lose your matches" with positive, non-loss-aversion wording. | Beat 12 (the one line in the journey that pressures rather than invites) | The take-home eyebrow only. The PR proposes the EN line for Blake's approval before merge; the ES line ships provisional (native review still deferred). | The take-home structure, checklist, form, preview-mode statement and privacy line. |

### KEEP — as shipped, evidence cited in the packet

| # | Surface | Packet evidence |
|---|---|---|
| K1 | Welcome | Beat 1 (`01-welcome`, four contexts) |
| K2 | Quiz structure | Beat 2 (`02-quiz-q1`, `02b-quiz-selected`) |
| K3 | Review | Beat 3 (`03-review`) — complete and editable by ruling |
| K4 | Mattress drawer structure | Beat 6 (`06-drawer`) |
| K5 | Compare structure | Beat 7 (`07`, `08-compare`) — content gap is 1.3 |
| K6 | Sleep Plan content | Beat 8 (`10-sleep-plan`) |
| K7 | Payment Choice | Beat 10 (`12-payment-choice`) |
| K8 | Take-home structure | Beat 12 (`14-take-home`) — eyebrow copy is C6 |
| K9 | **Ruling on the quiz focus follow-up:** touch focus returning to `body` after a tap is **not a defect**. Test the keyboard path specifically (Tab / Enter through a question, then Next) before treating anything here as a change. | Beat 2 follow-up, re-scoped from "bounded change" to "keyboard-path verification" |

### EXPERIMENT — prototypes on branches, never merged as such

| # | Ruling | Packet source | Shape |
|---|---|---|---|
| E1 | Sleep Brief **landscape composition only**. | Beat 4 | Rebalance the 1194×748 composition (larger signature panel; first priority expanded or the three priorities given more presence). No content change; constellation semantics and disclosure buttons stay; portrait untouched. Compared against the pass-1 capture; outcome is a decision, not a merge. |
| E2 | **Two chrome-normalisation alternatives**, prototyped side by side: (a) remove the isolated dark headers from Sleep Plan and Consultation Summary; (b) a slim unified identity treatment across the journey. | Q5 | Both prototyped on branches for the same beats in EN and ES at both orientations; Blake chooses after seeing both. Item 3.6 ("Richer persistent identity bar", ❓) stays ❓ — this normalises, it does not add. |
| E3 | The optional Welcome motif is **deferred**. | Beat 1 optional experiment | Not prototyped in this cycle; the 2026-08-21 restrained-Welcome ruling stands. |

### Not ruled — remain packet suggestions with no scheduled work

The drawer price-band colour polish (beat 6, low), the larger Results
continuity mark (beat 5, low) and every pass-2 item the packet lists as not
evaluated (motion and micro-interactions, touch feedback timing,
`prefers-reduced-motion`, forced colors, real-device rendering, Sleep System
steps 2–4, the Silver and Bronze tabs, the "Separate the layers" demonstration,
Compare with three items, the solo-sleeper path, the rendered take-home body).
Reason content on Results and Compare is item 1.3 (content), not a cohesion
change. None of these has an owner decision and none is scheduled.

## Schedule of bounded PRs (the milestone's "change items scheduled" clause)

Sequenced smallest-and-most-defective first; each PR is independent, carries
its own browser evidence in EN and ES at 1194×748 and 834×1108, and does not
bundle another item.

1. **C1** — Sleep System header clearance (defect; CSS; routed via 1.4).
2. **C5** — "Selection(s)" plural dictionary pair.
3. **C6** — take-home eyebrow wording (EN line approved by Blake on the PR).
4. **C4** — heading focus treatment (contrast + forced-colors re-checked).
5. **C2** — Results landscape first fold.
6. **C3** — Consultation Summary finalist hero / status block and implication
   presentation (prototype on a branch first, then the PR, meaning unchanged).
7. **E1**, **E2** — prototypes on branches, in either order, each ending in a
   recorded decision.

What every PR preserves: the standing Phase 1 constraints; scoring, ranking,
tiers, thresholds, caps, back-fill and the accessory engine untouched (the 3.7
audit is separate — see below); bilingual parity; reduced-motion and
forced-colors behaviour; memory-only sessions; `gasUrl` blank; the mounted-
device checks per the standing per-PR owner waiver (recorded NOT PERFORMED,
never a pass); Spanish provisional. Nothing here is showroom authorization.

**Milestone status:** stays 🔨. The exit clause is not met by this record: pass
2 (in-app browser and mounted device) is still owed for the surfaces the packet
could not judge statically, and the change items are scheduled, not shipped.

## Evidence preservation

- **Packet:** `docs/guided-selling-cohesion-review-2026-08-30.md`, committed by
  this PR byte-for-byte from the review clone (SHA-256
  `6562e240ae68a78b5c1656b391c515c322fb7c19a04caa88e6f7e5a3239b8ff4`,
  20,107 bytes), allowlisted in `.gitignore` like the other decision records.
- **Screenshots, walk report and probe scripts (95 files, 40,861,099 bytes):**
  copied 2026-08-30 from the review clone's
  `outputs/manual-gates/cohesion-review-2026-08-30/` to
  `C:\Users\BlakeFord\Documents\DreamFinder-manual-gates\cohesion-review-2026-08-30\`
  (the outside-the-repository location the trust-integrity physical-gate
  packet names as acceptable), copy verified file-by-file against the source
  hashes with zero mismatches; the packet is copied alongside. The
  per-file SHA-256 manifest is committed as
  `docs/guided-selling-cohesion-review-2026-08-30-evidence.sha256`
  (`sha256sum -c` from inside either evidence directory). The PNGs are not
  committed — `outputs/manual-gates/` stays git-ignored by design.
- The review clone (`Documents\Lacks PROTOTYPE\LacksFurniture-slice6`), its
  branch `codex/guided-selling-roadmap` and its `stash@{0}` are untouched and
  still hold the originals.

## Item 3.7 — accessory-recommendation audit (started the same day, separately)

Per Blake's instruction, the 3.7 offline audit (roadmap steps 1–3: scenario
audit, relevance judgement, enumerated output-change list) **began 2026-08-30
after #76 merged as read-only offline analysis**. It runs the real engine
functions extracted verbatim from `index.html` in a scratch harness against
the shipped `data/accessories.json`; the engine, the fixtures, the catalog and
every rendered output are untouched, and its output is a separate analysis
document for Blake — not part of this PR and not an approval of any change.
3.7 stays ◐.
