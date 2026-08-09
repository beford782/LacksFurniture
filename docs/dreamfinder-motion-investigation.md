# DreamFinder Motion Investigation — "Hand and Cloth"

**Date:** 2026-08-08 (revision 3, owner design ruling) · **Base commit:** `c8e5a95` (origin/main, PR #22 merge)
**Branch:** `claude/dreamfinder-motion-lab` · **Status:** OWNER DESIGN REVIEW — nothing here is approved for production
**Laboratory:** `prototypes/dreamfinder-motion-lab/` (isolated; never imported by the application)

> **Revision 2** applies the independent Codex visual review: the Night Loom was
> rebuilt to be causal (the brief's three labeled values visibly become labeled
> threads, a quilted cover swatch, then the recommendation — evaluated against a
> kill criterion, §10); the recommendation arrival now uses brand-provided
> transparent product photography on a tonal plinth with no nested scrolling;
> the construction strata are drawn as quilting/foam/pocketed-coil textures in a
> mattress silhouette; adjustable-base articulation is promoted into the spike
> group; and every statement about what the automation proves was tightened
> (§8, §11). Prototype-only throughout — no production surface changed.
>
> **Revision 3** records the owner's design ruling after personally experiencing
> the lab: the partner-motion ripple is **rejected** and fully removed from the
> runnable lab, replaced by the experimental **Shared-Bed Priority** scene
> (§10); everything else is design-approved at the classifications in §10 —
> which authorizes neither merge nor production work.
>
> **Revision 4** applies a follow-up ruling on that replacement: the tuck/file
> metaphor is **rejected** (too literal and fussy — filing a card, not a premium
> mattress experience) and rebuilt as the **stitched-label resolve** (§10), still
> Experimental. It also fixes a checker portability defect: byte budgets now
> measure canonical LF source bytes, so a Windows `core.autocrlf=true` checkout
> can no longer push a within-budget file over by CRLF expansion (§11b). All
> prior approvals, conditions, rejections, and governance restrictions are
> unchanged.
>
> **Revision 5** is a premium-material pass on that same Experimental scene: the
> owner found the stitched-label resolve understandable but short of the premium
> bar, so the separate-label treatment is replaced by the **Atelier Woven Mark**
> (§10) — wording integrated into the textile itself rather than a card placed
> on it. Classifications and governance are unchanged.
>
> **Revision 6** is documentation-only: it records the owner's **final design
> ruling** on Shared-Bed Priority (§10) — accepted as an Experimental/deferred
> direction with the Atelier Woven Mark as the preserved research version, not
> promoted, no further visual iteration authorized, physical disturbance
> demonstrations expressly rejected — and closes this lab's design-review loop.
> Production effort now prioritizes the approved motion directions. No lab,
> prototype, or evidence file changed; the runnable prototype is byte-identical
> to `4fd0c0e`.

This investigation was produced by five parallel specialist reviews — repository/integration
architecture, cinematic art direction, assisted-sales usability & accessibility, performance &
implementation risk, and asset provenance (repo + Dropbox) — reconciled into one plan, then
proven in a runnable, tested prototype. It authorizes nothing; it equips a decision.

---

## 1. Repository findings

**The app has no motion system today.** `index.html` (19,462 lines) contains 23 CSS
`@keyframes` and 59 transitions but zero Web Animations API calls, zero
`animationend`/`transitionend` listeners, zero `matchMedia`, zero `will-change`, and no
easing or duration tokens — four near-identical decelerate curves are spelled four different
ways. Screens cut via a hard `display` swap (`index.html:4247-4248`); there is no cross-screen
animation at all. The most choreographed surface is the Sleep Brief's ~2.2 s staged cascade
(`index.html:4834-5038`); the best existing motion instinct is the discount certificate
(`revealCertIn`, 480 ms `cubic-bezier(0.2,0.72,0.2,1)`, `index.html:5250`), whose placement
curve this lab promotes to canon.

**The one JS-driven sequence pair is the staged reveal overlays**
(`startProfileReveal` / `startResultsReveal`, `index.html:14427-14501`) — 1500 ms and 520 ms —
and they carry two defects the lab deliberately does not clone (§7).

**CI is closed-world and the lab is invisible to it.** Every check in
`.github/workflows/ci.yml` reads fixed named paths; nothing enumerates the tree; the
protected-artifact hash manifest names 20 files, none under `prototypes/` or `docs/`. The only
checks that touch new files are `git diff --check` (trailing whitespace) and the clean-tree
assertion. There is no repo-wide banned-phrase scanner — claims discipline for this lab had to
be built, not inherited (`tools/motion_lab_check.mjs` provides it).

**No verified performance target exists.** The only hardware evidence in the repo is
"an iPad, by hand, 2026-08-03" — no model, no iPadOS version
(`docs/kiosk-device-hardening.md:162`; checklist deliberately unticked at `:82-85`). Every
budget in §7 is therefore labeled provisional, following the `SESSION_POLICY`
`status: 'provisional-preview'` precedent (`index.html:17851`). Phase 0.4's open device
question and this lab's measurement question are the same question — one tethered
Web-Inspector session on the mounted device closes both.

**Prototype conventions come from PR #18** (never merged, by design): DO-NOT-MERGE banners in
README + page, frozen tokens/fixtures with provenance, `notranslate` meta, self-tests inside
the prototype directory and out of CI, served from repo root over HTTP. This lab follows all
of them.

**Data reality:** neither `data/mattresses.json` nor `incoming/lacks_mattresses.json` contains
any construction field — no heights, layers, thicknesses, coil systems. The only structured
physical descriptor is `firmnessScore`. Anything a layer animation renders has to come from
evidence outside the repo (§3) or be visibly generic.

## 2. Reconciled agent conclusions

Where the four design-facing reviews agreed, disagreed, and how each conflict was resolved in
the lab:

| Topic | Resolution |
|---|---|
| Core language | Unanimous: card-table physicality fits the consultation surface (it is literally paper on a table, `index.html:947-1110`), and motion must survive salesperson narration. |
| Night Loom duration & causality | Art direction specced 2400 ms; usability requires ≤1500 ms; the Codex review found the original weave read as unlabeled abstract lines. **Rebuilt causal:** the brief's three actual values become labeled ribbons that visibly leave the brief, cross as labeled color-coded threads, resolve into a quilted cover swatch, and the swatch parts into the recommendation — all inside the 1400 ms cut, which is now the only production candidate (the 2400 ms cut remains solely for side-by-side judgment). Kill-criterion evaluation in §10. |
| Firmness surface tech | Perf said "no CSS `d` morphing, try static cross-fades"; art direction required a genuinely local dent (transforms cannot produce one honestly). **Resolved: JS-driven point rewriting** (rAF only while pressing, loop provably dies at rest — selftest-asserted), which is neither CSS `d` animation nor a dishonest scale trick. |
| Auto-press invitation | Art direction wanted one automatic press after 2 s idle; usability bans idle motion outright. **Resolved: no auto-press.** A preset tap performs one press-and-release; nothing moves untouched. |
| Synchronized compare | Usability: harmful as choreography, valuable as synchronized *state*; art/perf: if animated, one shared clock. **Resolved: static bottom-baseline alignment is the recommended production treatment; the lab's synchronized build (WAAPI, single shared `startTime`) exists to let the owner see why it should stay a demo.** |
| Layer geometry | Art direction's two-mode spec (proportional vs demonstration) collided with the evidence: materials are verified for two models but full per-layer thicknesses are not. **Resolved: a middle honesty mode** — real spec-sourced material names, schematic equal-weight geometry, chip stating exactly that (§8). |
| WAAPI adoption | Arch scout: avoid (no precedent); perf: required for cancel/stagger/sync. **Resolved: evaluating WAAPI is part of the lab's purpose.** Verdict from building it: `Element.animate` + `finish()`/`cancel()` semantics carried the gather and compare scenes cleanly; class-driven CSS carried everything else. That split is the production recommendation. |
| Cooling | Usability: cut ambient cooling outright; art direction: honest only as textile. **Resolved: ambient version rejected; one-shot textile sheen survives in the experimental wing** with a no-temperature-implied chip. |

## 3. Asset and evidence inventory

Dropbox was reachable, authenticated as **beford@restonichouston.com** (Blake Ford,
namespace 281112554), read-only throughout; nothing was modified, moved, or copied into the
repo. Full sweep notes are in the PR body; the entries that matter for motion:

| Asset | Type | Provenance | Safety |
|---|---|---|---|
| `/Blake Dropbox/Specs/ML269 CC Platinum H Giselle Plush Smooth Top.xls` | Tier-1 factory material specification | Brand-provided, licensee-authorized; **contains dealer cost — never render or publish** | PROTOTYPE-ONLY (evidence) |
| `/Blake Dropbox/Rosy Ortiz 2026/Pricing/2025 Specs/*.xls` (~29 sheets, MI847 Maria among them) | Tier-1 specifications | Same | PROTOTYPE-ONLY (evidence) |
| `/Blake Dropbox/Customers/Lacks/2025 Cards/Chattam/Roma Spec Card (2).pdf` | Information card, 5-layer sequence w/ thicknesses | Brand-provided | PROTOTYPE-ONLY (carries an unverified 6,908-coil count and a comfort-label conflict) |
| `/Blake Dropbox/Customers/Lacks/Lacks Photography 2025/` (46 hi-res PNG + a `Mattress Only` isolated-cut subfolder) | Photography | **Brand-provided — cleanest licensing in the archive** | POTENTIALLY PRODUCTION-SAFE |
| `…/Lacks Photography 2025/Mattress Only/Giselle Plush Smooth-01.png` (6000×4000 RGBA, transparent, 16.1 MB, file_id `id:gLzry4ioE6AAAAAAAAApLg`) | Isolated product cut — **exact model match for the `b1` recommendation** | Brand-provided; committed to the lab only as a 920×433 / 92,633-byte optimized derivative (`assets/giselle-plush-smooth.png`; crop-to-alpha + resize + palette quantization). Dropbox untouched. Availability ≠ final production-licensing clearance | PROTOTYPE-ONLY derivative |
| `<repo>/images/mattresses/*.jpg` (26) | Beauty shots | Scraped from `linqcdn.avbportal.com` (retailer's own PDP art) | POTENTIALLY PRODUCTION-SAFE on the retailer's own kiosk |
| `/CSP/.../Copper by Spring Air CUTAWAY Sheets.pdf` (21 MB) | The **only true cutaway artwork found anywhere** | Brand-provided | **DO-NOT-USE** — the Copper claim family has zero located substantiation |
| Everything under other retailers' folders (Bel, Ivan Smith, Furniture Market, …) | Cards/specs | Brand-provided, other deployments | **DO-NOT-USE** — white-label boundary |

**Key negative finding:** the repo contains zero cutaway/layer imagery, and the only genuine
cutaway in Dropbox belongs to the one family (Copper) the lab must not touch. All layer
visuals in the lab are therefore drawn schematics, honestly labeled.

**Access limitations:** 5 MiB extraction ceiling (blocked the Copper cutaway PDF, the 16.8 MB
Chattam deck, six hi-res posters); image-only PDFs return empty text on fetch; `&` in a folder
path breaks path lookup (file_id works); semantic search is effectively filename-only — a
concept query ("cutaway cross section") returned nothing while the literal filename found it
instantly, so absence-of-results is not absence-of-assets.

## 4. Comparable-model crosswalk

**A rigorous crosswalk already exists and this investigation cites rather than duplicates
it:** §B.3 of `docs/phase1-claim-disposition-block-a.md`, reachable only on
`origin/claude/tier-de-claim-disposition` (PR #21, draft). 22 rows; verdict vocabulary
CONFIRMED / STRONG / PROVISIONAL / CONFLICTED / UNRESOLVED; its method was verified and
spot-checked against live Dropbox during this investigation and holds up.

What the lab uses from it:

- **`b1` Giselle Plush → factory ML269** — heights agree across four independent sources;
  build: zoned Marshall (pocketed) unit + hyper-soft visco. Mapping STRONG. The lab's primary
  model.
- **`s3` Platinum Maria Plush → MI847** — exact height match; wool/silk/poly quilted box top,
  two gel-infused visco layers, zoned Marshall R-2 unit. Mapping STRONG. The comparison
  partner.
- **The ceiling is STRONG, never CONFIRMED** — no located licensee record binds a Lacks
  *retail* SKU to a factory build (Appendix B's own rule). The lab's chips say
  "mapping strong, not SKU-confirmed" for exactly this reason.
- **Conflicts routed around:** `s6`/`s7` Summit "cool gel" appears in retail copy but in no
  candidate spec generation (Appendix B conflict C4 → counsel) — the lab renders no gel for
  Summit and does not use Summit at all; `b5` Angelina zoned/wrapped-coil copy conflicts with
  its 342 FE helical spec (C5) — not used.

**Proposed addition for the dossier maintainer** (found during this sweep; not acted on):
`g1` The Roma has **no row in B.3**, yet
`/Blake Dropbox/Customers/Lacks/2025 Cards/Chattam/Roma Spec Card (2).pdf` sits directly
beside the Palermo and St Pierre cards B.2 already cites. Height matches the capture at 16″;
layer sequence is the richest in the inventory (wools → graphite Talalay latex → micro-coil
layer → dual quad-coil). Confidence Medium (card tier only, no `MZ***SA` factory spec located,
and the card says "MEDIUM EURO-TOP" while capture and app say Firm — the same shape as the
existing C13 conflict family).

## 5. Technical options considered

| Option | Verdict | Why |
|---|---|---|
| CSS transforms/opacity via class toggles | **Adopted as default** | Repo idiom (all 23 existing keyframes work this way); composited; end-state-class discipline gives skip/reduced a durable truth |
| Web Animations API | **Adopted for two scenes only** (gather, compare) | Needed where geometry is computed at runtime (FLIP clones) or where both sides must share one clock (`startTime` assignment); `finish()` vs `cancel()` is the skip/abandon distinction |
| CSS transitions | **Adopted for two-way states** (layer explode/collapse, base articulation) | Natively retargetable mid-flight — interruption safety for free |
| SVG + CSS (`stroke-dashoffset` draw, `clip-path` reveal) | **Adopted for the loom** | ≤24 animated paths (21 concurrent max); weft dash-gaps + paint-order give a real plain weave without filters |
| JS rAF point-rewriting | **Adopted for the firmness surface only** (revision 3: the ripple, its other consumer, was rejected by the owner) | The only honest way to draw a local dent; loop provably dies at rest |
| SMIL | **Rejected** | No cancel API, no completion signal, cannot honor `prefers-reduced-motion` — the production adjustable-base SVG (`index.html:15399-15444`) demonstrates the trap: an 8 s infinite loop no media query can stop |
| Canvas 2D / WebGL | **Rejected for every concept** | No effect in this brief justifies the a11y opacity, battery cost, and new idiom |
| Animation libraries (GSAP etc.) | **Rejected** | Nothing here exceeded browser-native capability; zero dependencies added |

## 6. Recommended motion architecture

The "Hand and Cloth" system (full spec embedded in the lab's CSS/JS):

- **Principles:** weight before motion; compression is the only bounce (nothing exceeds rest
  scale — overshoot easing is banned and machine-checked); hands, not cameras (no pans, no
  zooms, one `perspective` value); one signature per session; motion must survive narration
  (>700 ms needs something being *said*); honest surfaces; **still is the default** — zero
  infinite animation, machine-checked.
- **Tokens:** duration tiers `--m-tap` 90 ms → `--m-arrive` 900 ms (+ 2400 ms signature,
  once); seven easing curves, all ≤ y=1, with the production certificate curve
  `cubic-bezier(0.2,0.72,0.2,1)` promoted to the canonical placement ease; an ink-tinted
  shadow ramp that is **never animated** (shadows fade via pre-baked pseudo-element opacity).
- **Transition hierarchy:** Signature (loom, once) → Arrival (hero, brief-gather; once per
  screen) → Routine (200–700 ms) → Response (90–200 ms) → **None** (language switch, errors,
  handoff updates, wake-from-sleep restoration).
- **Runner:** a ~7 KB dependency-free state machine (`scene-runner.js`) — idle→running→done,
  per-scene epoch guard copied from the production `sessionFrame` contract
  (`index.html:17879-17932`), watchdog at duration+250 ms, skip = `finish()`,
  abandon = `cancel()`, reduced-motion decided in JS before any animation is created, end
  state always a class. This is the piece with the highest production value regardless of
  which visual concepts survive.

## 7. Performance and accessibility risks

**Provisional budgets** (unverifiable until the mounted device is identified — the Phase 0.4
gap): lab ≤150 KB total text (actual 132.1 KB; raised from 120 KB in the correction pass — the
causal loom and textured strata added ~17 KB of hand-reviewable code), runtime JS ≤52 KB
(actual 49.4 KB); zero `longtask` entries during scenes; CLS exactly 0.00 (re-verified after
the correction pass — the growing reveal stage keeps its quiz-footprint `min-height`, so the
transition can neither shrink nor, at tablet widths, grow the stage); ≤12 composited layers
per scene; loom hard cap ~24 animated SVG paths; no image over 150 KB (the one committed
product derivative is 92.6 KB). The animated-property allowlist is **performance-oriented,
not a universal compositor guarantee** — clip-path, color changes and some SVG behavior may
paint on iPad Safari. **No frame-rate claim is made anywhere** — rAF timing is not compositor
truth; final performance requires inspection on the actual showroom device.

**Production defects found during investigation (main-track follow-ups, not fixed here):**

1. **Reduced-motion keeps the full wait** — `index.html:5475-5483` strips the reveal
   overlay's visuals but the 1500 ms of `sessionTimeout`s at `:14453-14473` still runs; a
   reduced-motion user stares at a static box. The lab's pattern (JS-first branch, collapsed
   timeline) is the fix shape.
2. **Six writes into one polite live region in 900 ms** — `startProfileReveal`
   (`:14447-14459`); VoiceOver is still reading stage one when stage three lands, and the
   destination screen never announces because the refusal gate is held (`:18243`).
3. **No tap-to-skip on the existing reveal** — `pointer-events:auto` (`:5513`) with no click
   handler.
4. **`#compareModal` is not a modal** (`:18991-19000`) — no `role="dialog"`, no focus trap,
   no focus restore, unnamed `&times;` close; yet `screenTransitionOwnedElsewhere()` treats
   it as one (`:18237-18238`). Prerequisite before *any* comparison motion work.
5. **SMIL base SVG loops 8 s infinitely and cannot honor reduced motion** (`:15399-15444`);
   the lab's articulation scene is the CSS-driven replacement candidate.
6. **Dead starfield work** — 40 hidden DOM nodes built on every boot (`:11654-11667`) into a
   container that is `display:none !important` (`:3775-3778`).
7. **`comparacion` missing its accent** (`:14487`) and reveal copy hardcoded EN/ES inline
   instead of `t()` (`:14436-14446`).

**Accessibility invariants the lab implements** (and any production spike must keep):
announcement-is-focus — no sequence announces its own progress (the doctrine at
`index.html:18247-18268`); focus never lands on a moving element; FLIP clones and thread
layers `aria-hidden` with the real content in the tree; explicit replay/skip as real buttons,
keyboard reachable; 44/48 px targets; radiogroups with arrow keys; layer labels in flow layout
(never pinned to geometry) so Spanish expansion cannot collide; reduced motion collapses the
timeline, not just the tweens, and was verified: full path completes in ~1.3 s with **zero
animations created**.

## 8. Claims and interpretation risks

The governing rule, applied everywhere and machine-linted by
`tools/motion_lab_check.mjs`: **animate materials and mechanism, never quantities.**
Stated precisely: the checker is a *restricted product-language and quantity lint* — it
proves the absence of the enumerated restricted patterns below, not complete claims safety;
copy review remains a human responsibility.

- No coil counts, heights, percentages, degrees, patent/ISO/EPA/antimicrobial/therapeutic
  language, superlatives, origin claims, or withdrawn claim families (Marvelous Middle,
  NatuVerex, Cool Gel) anywhere in lab copy — EN or ES. A mutation test confirmed the checker
  actually fails on injected violations (8/8 caught).
- The firmness surface represents the **customer's selection** and says so in a persistent
  caption. The Shared-Bed Priority scene (revision 3, replacing the rejected ripple) goes
  further: it *records* the customer's shared-bed concern as a stitched priority card and
  demonstrates nothing — no motion transfer, no isolation, no absorption — with a chip at
  rest reading "Based on what you told us — not a product-performance test." In production
  either treatment must never render for solo sleepers (their quiz skips the question), and
  no second sleeper profile is fabricated.
- Layer scenes carry an honesty chip **inside the diagram's container, at rest, in both
  languages**: spec mode = "materials from the manufacturer's factory-build specification
  (mapping strong, not SKU-confirmed); geometry schematic — not to scale"; generic mode =
  "construction demonstration — not this model's specification." If either side of a
  comparison is generic, both must present as generic.
- Cooling is rendered only as fabric (weave + one sheen) with an explicit
  no-temperature-implied chip; priority mapping uses mattress-surface bands, no human
  silhouette, complaint language only (the app already disclaims medical advice,
  `index.html:19012`).
- Interim-retirement caution: claims still rendering on main (g3 coil count, s1 "Patented
  Marvelous Middle", height strings) all carry REWRITE dispositions — their presence is not
  clearance, and the lab does not amplify them.

## 9. Decision matrix

Scale 1–5; higher is better for the first four, **lower is better for the last four**.
Assisted-sales clarity and risk scores follow the usability and perf reviews; memorability and
cost follow the build experience.

| Concept | Sales clarity | Mattress specificity | Memorability | Production usefulness | Perf risk | A11y risk | Claims risk | Impl. cost |
|---|---|---|---|---|---|---|---|---|
| Card Table (select/advance) | 5 | 4 | 4 | 5 | 2 | 2 | 1 | 3 |
| Sleep Brief gather | 5 | 3 | 4 | 4 | 2 | 2 | 1 | 3 |
| Night Loom (causal 1400 ms cut, replacing 520 ms reveal) | 4 | 5 | **5** | 3 | 3 | 2 | 1 | 4 |
| Firmness surface | **5** | **5** | 4 | **5** | 2 | 2 | 2 | 3 |
| Mattress arrival (plinth + approved transparent imagery) | 4 | 4 | 4 | 4 | 2 | 2 | 1 | 2 |
| Layer reveal (drawer, on-demand, textured strata) | **5** | **5** | 4 | **5** | 1 | 1 | 3 | 2 |
| Synchronized compare (animated) | 2 | 4 | 3 | 1 | 2 | **4** | 2 | 3 |
| Compare static alignment | 4 | 4 | 2 | 4 | 1 | 2* | 2 | 1 |
| Base articulation | **5** | **5** | 3 | **5** | 1 | 1 | 1 | 2 |
| Shared-Bed Priority — Atelier Woven Mark (exp./deferred, final ruling §10) | 4 | 3 | 3 | 3 | 1 | 1 | 2 | 2 |
| Cooling textile (exp.) | 2 | 3 | 2 | 2 | 2 | 1 | **4** | 2 |
| Cooling ambient (evaluated, not built) | 1 | 1 | 2 | 1 | 4 | **5** | **5** | 3 |
| Priority mapping (exp.) | 4 | 3 | 2 | 3 | 1 | 2 | 3 | 2 |

Codex-review adjustments reflected above: Night Loom sales clarity 3→4 (the causal rebuild
makes the transformation attributable — see the kill-criterion record in §10); mattress
arrival 3→4 across the board (approved transparent imagery on a tonal plinth, no nested
scrolling); layer reveal retains its scores with materially better legibility (textured
strata); **base articulation moves out of the experimental tier entirely** — highly
mattress/sleep-system specific, trivially narratable, lowest claims and a11y risk in the set,
and the natural replacement for the production SMIL loop that cannot honor reduced motion.

\* after the compare modal's missing dialog semantics are fixed — currently that surface is
unusable for screen-reader users regardless of motion.

## 10. Recommendation (final owner ruling recorded — revision 6)

**Night Loom kill-criterion record.** The criterion: if the labeled Sleep Brief cannot
visibly become a mattress-specific surface within the 1400 ms cut without feeling rushed or
confusing, reject it regardless of invested work. Verdict after rebuilding and viewing the
corrected cut at 1024×768 and tablet landscape: **passes.** The frozen intermediate frames
(evidence 13 → 04 → 14) show the causal chain at every stage — the three labeled ribbons
("I Sleep Hot" / "Side Sleeper" / "Plush") visibly leaving the actual brief, crossing the
warp as color-coded threads with persistent edge labels, resolving into a quilted cover
swatch carrying those same labeled bands, and the swatch parting into the recommendation.
Nothing in the sequence is an unlabeled abstraction, and 1400 ms accommodates it without
rush because the phases overlap. It therefore stays a candidate — but **conditional**, not
approved: the owner must confirm the causality reads to *them* (and ideally to a salesperson)
before any production spike; if it doesn't, the standing fallback is a 150 ms crossfade at
the same seam.

**Approve direction** (recommended production design spike, in order):

1. **Motion tokens + interruptible scene-runner pattern** — highest value, zero visual risk;
   also the vehicle for fixing production defects §7.1–3.
2. **Firmness surface** — the strongest concept in the set: salesperson-driven, honest,
   teaches what words can't.
3. **On-demand construction reveal in the mattress drawer** (never on drawer-open) — textured
   strata with the honesty chip; Giselle and Maria are ready today at STRONG.
4. **Card Table select/advance + Sleep Brief gather** — with the non-blocking ≤300 ms
   per-answer rule.
5. **Static bottom-aligned comparison** as the compare default (after the compare modal's
   dialog semantics are fixed, §7.4).
6. **Adjustable-base articulation** — promoted per the Codex review: mattress/sleep-system
   specific, trivially narratable, lowest claims and a11y risk in the set, and it retires the
   production SMIL loop that cannot honor reduced motion (§7.5). Prototype-only in this PR;
   the production SMIL implementation is untouched.

**Conditional:**

- **Mattress arrival (plinth-based)** — actual-device evaluation AND production-use
  permission for the Giselle image are still required (provenance §3; Dropbox availability is
  not a licensing determination). The no-nested-scroll responsive fit demonstrated at
  1024×768 must be kept.
- **Night Loom (causal 1400 ms cut only)** — actual showroom-iPad evaluation is still
  required, in addition to the owner confirming the rebuilt causality communicates (per the
  kill-criterion record above). Once per consultation, immediately skippable, config
  kill-switch, replacing `startResultsReveal` — never stacking on it. The 2400 ms cut is
  expressly not a candidate.

**Experimental/deferred:** Shared-Bed Priority using the Atelier Woven Mark (final owner
ruling below — accepted as a preserved research direction, not promoted, no further visual
iteration authorized); priority mapping (needs copy review).

**Rejected:** the partner-motion ripple (owner ruling below); **falling-object,
bowling-ball, glass-of-water, and equivalent physical disturbance demonstrations,
including any animation showing one side of a mattress remaining unnaturally still**
(final ruling below — they can reasonably imply measured motion-transfer, absorption,
isolation, stability, or impact performance, and remain rejected without appropriate
substantiation and approval); ambient cooling atmosphere (continuous motion + implied
thermal claim — fails on both axes); synchronized compare **as the production default**
(ship the static bottom-baseline alignment; the synchronized build stays a lab
demonstration); unsupported cutaway artwork (the Copper family in particular); any
quantity-rendering animation; and Night Loom in any form that needs the 2400 ms cut to
be understood.

### Owner ruling — partner-motion ripple REJECTED (revision 3)

After personally experiencing the lab, the owner rejected the partner-motion ripple:

- the transverse waveform appeared scientific/test-like rather than premium and tactile;
- it risked implying measured motion-transfer or isolation performance;
- it amplified a negative concern instead of producing a premium tactile experience.

The ripple has been removed from the runnable lab entirely (markup, behavior, controls,
strings). Its replacement, **Shared-Bed Priority**, is a design experiment in the
Experimental wing — not production authorization.

**Revision 4 — the tuck/file metaphor is also rejected.** The owner ruled the first
Shared-Bed treatment (label carried into a Sleep Brief panel as a filed card) too literal
and fussy — more like filing a card into a folder than a premium mattress experience. It
was rebuilt as a stitched-label resolve (a bordered label lowered onto a dashed seam).

**Revision 5 — premium-material pass: the Atelier Woven Mark.** The owner found the
stitched-label resolve understandable but short of the premium visual bar; the
separate-label treatment (a card-like panel placed on the bed) is replaced by wording
**integrated into the textile surface** (~780 ms): two quilted pillow panels settle with
quiet weight, one fine continuous warm-metallic seam draws once across the coverlet (no
dashes), the quilting draws subtly inward around the message (a denser lattice, feathered),
and the mark resolves on a single textile-tension settle — "Shared-bed priority" finished
as a restrained embossed title, "Partner movement matters to you." as the primary readable
line, and the honesty statement directly adjacent but visually quieter: "Based on what you
told us — not a product-performance test." No rectangular borders, outlines, or
interface-card styling anywhere; increased negative space, reduced contrast — a bespoke
upholstery detail, not a dashboard component. Title and concern become readable together,
not as separate UI steps. Both pillows stay visible; nothing folds, files, tucks, or
disappears. No wave, vibration, disturbance propagation, unmoving-partner side, bounce,
glow, particles, ambient loops, or implied isolation/absorption/reduction; no second
sleeper profile is fabricated. Adversarial review before commit: an ordinary viewer sees a
sewn atelier detail carrying recorded wording, not a mattress *performing*. Spanish
strings remain a prototype-only preview; the native-Spanish review gate remains open.

### Final owner ruling — Shared-Bed Priority (revision 6)

After experiencing the Atelier Woven Mark live, the owner ruled:

1. **Shared-Bed Priority is accepted as an Experimental/deferred design direction.**
2. The **Atelier Woven Mark** is visually understandable and acceptable **as the preserved
   research version**.
3. It is **not** promoted to Approved or Conditional.
4. It does **not** yet warrant inclusion in the initial production motion package.
5. **No further visual iteration on this scene is authorized at this time.**
6. The Atelier Woven Mark is preferable to physical disturbance demonstrations such as
   partner-motion waves or ripples; falling-object or bowling-ball demonstrations;
   glass-of-water demonstrations; and any animation showing one side of a mattress
   remaining unnaturally still.
7. Those physical demonstrations can reasonably imply measured motion-transfer,
   absorption, isolation, stability, or impact performance — **they remain rejected
   without appropriate substantiation and approval.**
8. The Atelier treatment instead **records the customer's stated shared-bed concern; it
   does not demonstrate a mattress result.**
9. The owner's "looks good enough for now" statement means **acceptable as a preserved
   Experimental concept — not production approval.**
10. **Production effort should now prioritize the stronger approved motion directions.**

**Scope of the owner's approval.** The owner's design verdicts are approval at exactly the
classifications in this section — they are NOT authorization to merge PR #23, begin
production implementation, activate motion in the app, resolve Phase 0.4, clear imagery
rights, or bypass content/legal/Spanish gates. With the final ruling above, this lab's
design-review loop is closed; the next task — separately authorized — is to define the
narrow production-motion spike from current `main`, using only the approved directions and
retaining all conditional gates.

**Smallest reversible production slice** (proposed, NOT implemented): add the motion tokens +
`prefers-reduced-motion` global baseline + the scene runner to `index.html` behind a
`store-config` flag `motion.enabled` (default **false**), and wire exactly one consumer — the
existing results-reveal seam — so flipping one config key A/Bs the entire direction and
reverting is deleting one flag. Every raw timer the runner adds must be registered in
`tests/session_async_check.mjs`'s owned inventory, and reduced-motion must collapse the
timeline (the §7.1 fix comes free).

## 11c. Verification record (revision 5 — Atelier Woven Mark)

- Node checker — **119/119 PASS** (120 prior, −3 stitched-label keyframe audits, +2
  woven-mark keyframe audits). Canonical bytes 144,365 total / 52,011 runtime JS — both
  within the unchanged budgets; the CRLF-invariant measurement and its assertions are
  preserved untouched.
- Restricted-language lint mutation — **3/3 categories caught** on the scene copy
  (unchanged customer strings; the lint re-run confirms coverage after the restyle).
- In-page suite — **58/58 PASS full-motion** and **58/58 PASS reduced-default**
  (headless Chrome under virtual time): the woven-mark scene runs a 780 ms timeline
  (800 ms measured end-to-end with scheduling overhead), replays, skips at 90 ms,
  cancels at 70 ms, survives 10× start spam, leaks nothing; reduced motion creates
  **zero animations** and shows the identical final composition; zero infinite
  animations; CLS 0.0000; zero console errors/warnings.
- Layout at true 390 / 736 / 1024 viewports: `horizOverflow=false` everywhere, no
  nested scrolling, final composition fits 1024×768.
- `tools/validation.py --self-test` — **633/633 PASS**; `git diff --check` clean;
  forbidden production paths byte-identical to base `c8e5a95`.
- Evidence (current): `evidence/16–22` — pillows settling (16), the fine seam drawing
  (17), the mark resolving with the quilting cinch (18), the final composition (19),
  reduced-motion final (20), Spanish preview (21), true-390 px reflow (22).

## 11b. Verification record (revision 4 — stitched-label resolve + checker portability)

- **Checker portability defect, reproduced then fixed:** on the committed LF source the
  runtime JS measured 52,005 bytes (within the 52 KB budget), but a Windows checkout with
  `core.autocrlf=true` expands LF to CRLF on disk — 53,270 bytes, 22 over — making the
  checker report 117/118 on an unchanged tree. Budgets now measure **canonical
  repository-source bytes** (CRLF normalized to LF before counting; budgets unchanged).
  Proven three ways: an in-checker assertion that identical content yields identical
  budgets under LF and CRLF; a scratch copy of all six lab files force-expanded to CRLF
  producing **byte-identical budget numbers and 120/120 PASS**; and a scratch copy with
  ~6 KB of genuine added content **failing** the runtime budget (119/120) — the
  normalization cannot hide a real overage. The trailing-whitespace scan also now splits
  on `\r?\n` so a CRLF checkout cannot mask a space before a line end.
- Node checker — **120/120 PASS** (118 prior, −3 tuck-era keyframe audits, +3
  stitched-resolve keyframe audits, +2 budget-portability assertions). Canonical bytes:
  143,563 total / 52,012 runtime JS, both within unchanged budgets.
- Restricted-language lint mutation — performance claims injected into the new scene's
  EN and ES copy (clinical, patent, degree-cooling): **3/3 categories caught**.
- In-page suite — **58/58 PASS in full-motion mode** and **58/58 PASS in
  reduced-default mode** (headless Chrome under virtual time). The stitched-resolve
  scene completes at **840 ms** (target 700–850), replays, skips at 90 ms, cancels at
  70 ms, survives 10× start spam, leaks no animations or elements; reduced motion
  creates **zero animations** and lands on the same final composition; CLS 0.0000; zero
  console errors/warnings; zero infinite animations.
- Layout at true 390 / 736 / 1024 viewports via the measurement rig:
  `horizOverflow=false` everywhere; the scene container (321 px wide at 390) has no
  nested scrolling and its final composition fits a 1024×768 viewport.
- `tools/validation.py --self-test` — **633/633 PASS**; `git diff --check` clean;
  forbidden production paths byte-identical to base `c8e5a95` (ranged diff).
- Evidence: revision 4's stitched-label captures were superseded and replaced in
  revision 5 when that presentation was replaced — current evidence is listed in §11c.

## 11a. Verification record (revision 3 — ripple removal + Shared-Bed Priority)

Environment note: the workstation locked during this pass (LogonUI active — a locked
session hides every page and throttles timers, which the harness detects and refuses),
so the in-page suite ran in **headless Chrome under virtual time** in both motion modes.
Headless Chrome defaults to `prefers-reduced-motion: reduce`; the lab gained a
`?fullmotion=1` mirror seam so the animated pipeline is exercisable there too, plus
`?scene=` / `&freeze=` deep-link capture affordances and `tools/measure.html` (an
iframe measurement rig) — all prototype tooling only.

- Node checker — **118/118 PASS** (ripple gone; Shared-Bed keyframes/transitions
  audited under the same allowlist; byte budgets hold at 139.6 KB total / 49.2 KB
  runtime JS).
- Restricted-language lint mutation test — injected performance claims into the new
  scene's EN and ES copy ("clinically proven isolation", percentage, patent): **3/3
  caught**.
- In-page suite, full-motion mode (`?selftest=1&fullmotion=1`) — **58/58 PASS** (three
  consecutive final runs; one earlier run flaked on a single timing row under virtual
  time). Covers the new scene end-to-end: completion at ~1050 ms, replay, skip@90 ms,
  cancel@70 ms, 10× start spam, no leaked animations, CLS 0.0000, zero console
  errors/warnings. The firmness rAF-at-rest check reports honestly as not-measurable
  where the environment dispatches no rAF (verified interactively in revision 2).
- In-page suite, reduced-default mode (`?selftest=1`) — **58/58 PASS**, including
  **zero animations created** on the Shared-Bed reduced branch, which lands directly
  on the same complete final state.
- Layout, measured at true viewports via the rig: 390 / 736 / 1024 px —
  `horizOverflow=false` at every width; the Shared-Bed container is 321 px wide at a
  390 px viewport, has no scrollable overflow (no nested scrolling), and its full
  final state (~640 px tall at 1024) fits a 1024×768 viewport.
- `tools/validation.py --self-test` — **633/633 PASS**; `git diff --check` clean;
  forbidden production paths byte-identical to base `c8e5a95` (verified by ranged
  diff).
- Evidence: revision 3's captures of the tuck treatment were superseded and replaced in
  revision 4 when that metaphor was rejected — current evidence is listed in §11b.
  Frames were captured with the deterministic freeze-seek affordance; the
  adversarial-review verdicts are recorded in §10.

## 11. Verification record (revision 2)

- `node prototypes/dreamfinder-motion-lab/tools/motion_lab_check.mjs` — **112/112 PASS**:
  allowlisted animated-property discipline (a performance-oriented allowlist, not a universal
  compositor guarantee), no infinite animation, tech bans, the restricted product-language
  and quantity lint EN+ES (a lint over enumerated patterns, not a proof of complete claims
  safety), byte budgets, trailing whitespace, and the scene state machine executed against a
  fake clock (completion, skip-finishes/reset-cancels, epoch orphaning, watchdog
  force-complete, reduced branch creates zero animations). Lint verified non-vacuous by
  mutation after the correction pass: **8/8 injected defects caught** (animated box-shadow +
  width, `transition: all`, infinite animation, hyphenated coil count, patent language,
  height number, percentage claim).
- In-page smoke suite (`?selftest=1`, Chrome on this workstation, page visible) —
  **47/47 PASS**: loading, full-sequence completion (causal loom → arrival chain), replay,
  rapid interruption (skip at 90 ms, cancel at 70 ms, 10× start spam), reduced-motion branch
  (zero animations created — the decorative transformation is bypassed entirely and lands on
  the same recommendation state), no leaked animations, zero infinite animations at rest,
  firmness rAF loop dies at rest, **CLS sum 0.0000**, zero console errors/warnings. The
  harness fails loudly if the page is hidden (throttled timers/paused rAF invalidate runs).
- **No nested scrolling, measured:** at 1024×768 the full recommendation state (badge, name,
  brand, entire product image, three fit reasons, primary action) renders inside the stage
  with `scrollHeight ≤ clientHeight` on both the step and the stage, and the stage fits the
  viewport. At ~738 px and in a 390 px frame the page reflows with zero horizontal overflow
  (scrollWidth 372 ≤ 387).
- Visual evidence: `prototypes/dreamfinder-motion-lab/evidence/01–15` — obsolete pre-revision
  captures were replaced, not left beside their contradictions. New in revision 2: loom
  ribbons leaving the brief (13), labeled mid-weave (04), quilted cloth swatch (14), plinth
  recommendation at 1024×768 (05), textured construction (07), textured bottom-baseline
  compare (08), reduced-motion end state (11), Spanish recommendation (15).
- What is **not** verified and cannot be from this workstation: frame pacing, compositor
  placement, layer memory, and touch feel on the mounted showroom iPad. Final performance
  requires inspection on the actual device. Provisional, per §7.

## 12. How to run

```
python -m http.server 8000        # from repo root
http://localhost:8000/prototypes/dreamfinder-motion-lab/            # the lab
http://localhost:8000/prototypes/dreamfinder-motion-lab/?selftest=1 # smoke suite
node prototypes/dreamfinder-motion-lab/tools/motion_lab_check.mjs   # static + state checks
```
