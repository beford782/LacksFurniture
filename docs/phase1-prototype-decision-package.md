# Phase 1 prototype decision package — Sleep Brief and Results

**RESEARCH / PROTOTYPE ONLY.** This package exists so Blake (with Codex
review) can decide the two gated Phase 1 presentation questions from actual
bilingual screens instead of prose. It is **not** Phase 1 implementation and
records **no** approval. Phase 0.4 remains ⏳, Phase 0 remains open, the
showroom device matrix is unconfirmed, the production application is
unchanged from `origin/main` = `78f949c`, and the per-model catalog reasons
remain missing and were **not** invented.

Prototypes: `prototypes/phase1-decision-package/` (standalone; never
imported, linked or executed by the production app). Frozen engine fixtures:
`prototypes/phase1-decision-package/fixtures/` (captured by executing the
real engine at `78f949c`; see `PROVENANCE.md` there). Companion document:
`docs/phase1-catalog-reason-authoring-brief.md`.

---

## 1. Current shipped-state facts (all verified at `78f949c`, cite-checked)

**Sleep Brief (`#profileScreen`).** Rendered wholly by `showProfileScreen()`
(index.html:13042–13520). Exactly two headings: `h1#profileName` — the fixed
bilingual pair "Your Sleep Brief" / "Tu Resumen de Sueño" (13170) — and
`h2#profilePrioritiesHeading` "What we will test together" / "Lo que
probaremos juntos" (13223). All copy is renderer-inline bilingual ternaries
(not dict/config). The engine computes 1–3 priorities (nine answer-triggered
emission sites → internal 0–100 score → one descending stable sort →
`slice(0,3)`; count is never padded); the internal score is read exactly once
(the sort comparator, 13403) and never rendered; there is no rank field. Each
priority carries a kind (need / compare / preference) rendered only as the
"Must solve" / "Worth comparing" / "Feel preference" pill — `kind` exists
only inside the renderer's scope and is deliberately absent from
`analytics.trialFocus` (test-pinned). The "Try this:" testing prompt is fully
visible today. Firmness is the stored integer 1–10 (default 5); the Brief
shows bucketed words only (no numeral), and three different word-bucketings
coexist across surfaces, disagreeing at 4, 6 and 8. The "Compare My Matches →"
CTA only navigates to Results (the known 1.6 mislabel); the one working
Compare entry is the Consultation Summary's "Compare finalists" button.
Financing content on this screen: none.

**Results.** All three tiers are built unconditionally before any tab exists
(14516–14530); `activeTier` is only a lookup key. Within-tier order = one
descending sort by engine score; qualification ≥ 60 % of tier max, cap 3,
back-fill to min(2, n) (`qualifyRankedChoices`, 15546–15559 — shared with the
Sleep System). Back-filled items can carry `meetsMatchThreshold:false` even
at position 0; shipped copy degrades honestly ("Best place to start" vs
"Additional comparison option"). Per-tier percentages are computed but **no
screen renders a percentage** — they reach the customer only via the email.
Top pick is always Gold #1 by product rule. Tier identity lives in five
separate hardcoded bilingual name maps (tabs, descriptor, hf2 tag, compare
modal, drawer). The Bronze descriptor reads "Bronze · entry-level" / "Bronce
· básico" (buyer-characterising; flagged, unchanged). Cards show: photo,
threshold-honest eyebrow, brand·subBrand, name, authored `topPickReason`
(product copy), firmness "N/10" + `firmnessFeel` word, three
template-generated per-mattress rows (`buildMattressPriorities`), stock line,
details/save buttons.

**Catalog reasons.** Across all 26 models every per-feature reason column is
empty; `reason_default` is populated (26 unique per-model, customer-agnostic,
bilingual) but **renders nowhere** — the engine's `matchReasons` return value
is discarded at its only call site (14505–14506). There is no per-model
customer-specific "why this fits you" content anywhere in the app; presenting
generic or placeholder text as that content is itself the gated 1.3 output.

**Compare.** One working entry (Consultation Summary → auto-pairs
favourite-first-then-save-order from saved finalists, exactly 2). The results
card compare trigger and tray are built and styled but unreachable (no markup
ever renders `.compare-btn`); the modal is live but lacks dialog semantics,
focus trap and Escape — the accessibility outlier among the app's layers.
Winner/highlight CSS exists but no winner logic; none may be added.

**Analytics.** 31 declared events, default-deny field allowlists, no
transport (memory + console only). `tier_view` has exactly one call site
inside the tab switcher and counts switches only (the initial Gold view is
never logged). The CI guard for event/call-site parity is a static text
sweep, reachability-blind: three declared events (not the roadmap's two) sit
today in a function pinned as never called. Compare, drawer-save and the
Sleep Brief emit no events at all.

**Financing.** Driven by `STORE_CONFIG.financing`, fail-closed freshness
gating; the shipped state is **stale-closed** (`exactPromotionsEnabled:
false`) so no exact rate or term renders anywhere in the kiosk today. The
Sleep Brief and Compare carry zero financing. The promotions system is inert
in the shipped config (no `promotions` key). Executed proof of scoring
isolation: `tests/scoring_isolation_check.mjs`, 69/69 at this commit.

**Layout.** Live system: per-surface content max-widths (680–1180), clamp()
fluid type, OR-portrait stacking (portrait at any width stacks the two-panel
surfaces), dvh-capped internally-scrolling sheets, sticky bottom action bars
with safe-area padding. 21 width-based media queries with no shared token
scale; the "iPad optimization" bracket targets only dead selectors. No
committed source records the showroom device, viewport or orientation.

**Defects found during audit (report-only; nothing changed):**
`--tier-gold/-silver/-bronze` custom properties have zero consumers;
`.silver-drawer`/`.bronze-drawer` reference undefined `--silver`/`--bronze`
(the accent never paints); `tag-preference` has no CSS rule; four profile
text nodes are absent from the session-wipe inventories; the on-screen legal
disclaimer mentions "Match percentages" though none render; `savedPicks[].tier`
is write-only; dict files carry 59 dead keys of 89 and `dict-es`
`tier_explainer` has drifted from live copy; the results tier-tab row can
overflow below ~480 px and is clipped by `body{overflow-x:hidden}`; CLAUDE.md
still describes a sticky cart bar and an `mField()` i18n accessor that are
dead on main.

## 2. What each prototype changes

Each variant's full, self-declared deviation list lives in its
`VARIANT-NOTES.md`; this is the decision-relevant summary.

### 2.1 Sleep Brief — Alternative A (need-led)

- **The heading changes.** `h1` becomes the engine's **first priority, taken
  strictly by index** (dense-c → "Comfortable elevation"), with its one-line
  reason as the lede. The fixed pair "Your Sleep Brief" / "Tu Resumen de
  Sueño" survives verbatim, demoted to a small continuity eyebrow. *This is
  the gated 1.1 output made judgeable — not approved.*
- **Prose is replaced by anchors.** The subtitle, summary, reflection,
  priorities intro and plan label are not rendered; their facts move into
  five inert signal badges. The reassurance line is kept verbatim.
- **The testing detail moves behind an APG disclosure** ("Try this:" /
  "Pruébalo:" as the trigger). Implemented per the roadmap proposal
  *against* the external evidence — see §5.
- **Firmness gains a graphic**: 10 discrete segments, the exact integer, the
  Brief's own word, plus the accessible phrasing "Firmness: Medium, 4 of 10".
  Production shows a word only, no number, no graphic.
- **Ordinal markers** on the priority list plus a proposed basis-of-order
  line, "In order, based on your answers" / "En orden, según tus respuestas".
- **The CTA mislabel is resolved**: a proposed honest navigation label ("See
  My Matches →" / "Ver Mis Opciones →") plus a separate, correctly-labelled
  "Compare finalists" / "Comparar finalistas" entry (verbatim from the one
  working production entry) opening a labelled, prototype-simulated 2-up
  panel with drawer-grade dialog semantics.
- Actions sit in a sticky bottom bar with safe-area padding; the journey rail
  becomes a real `<ol>`.

### 2.2 Sleep Brief — Alternative B (conservative hierarchy)

- **The heading does not change.** "Your Sleep Brief" / "Tu Resumen de Sueño"
  stays the `h1`; the engine's first priority (same index-0 selection)
  appears *beneath* it as a subordinate conversation lead under a proposed
  "Where we start" / "Por dónde empezamos" label, and still renders as item 1
  of the list — an echo, not a removal.
- **Today's top-level section order is kept** (identity → what-we-test →
  journey → actions); the same prose is condensed into the same five badges,
  but each badge carries a visible category label (POSITION / FEEL /
  TEMPERATURE / SHARING / SIZE).
- **The testing detail stays fully visible**, subordinated typographically —
  B's deliberate, recorded contrast with A.
- Same firmness treatment, same ordinal markers, same CTA resolution and
  simulated compare entry as A.
- The `tag-preference` pill is rendered with the neutral base style, mirroring
  production's *missing* CSS rule rather than silently fixing it.

### 2.3 Results — restyled tier tabs

- Tabs remain the navigation. Contrast on unselected tabs is raised, targets
  are ≥44 px, and Spanish labels are checked against overflow (production's
  tab row can overflow below ~480 px).
- Cards gain a **provenance split**: an "About this model" / "Product
  description" product-story layer (authored `topPickReason`) visually
  separated from the answer-aware customer-fit rows — production blurs these.
- Firmness gains the 10-segment graphic alongside the existing numeral.
- Compare is made **discoverable**: card-level toggle, a selection tray and an
  action-area entry — reviving the pattern that exists in production CSS and
  handlers but never renders — capped at 2, opening a labelled simulated 2-up
  panel showing the tier **name** (never a percentage).
- The financing module is reproduced in its **shipped stale-closed state**
  (no rates anywhere), visually secondary, inert.
- The empty-tier state is implemented as a real code path.
- A proposed alternative Bronze descriptor is shown alongside the shipped
  "entry-level" / "básico" copy, which is rendered as-shipped.

### 2.4 Results — single-open accordion

- **Tabs are replaced.** Three tier sections with permanently visible headers
  (verbatim names and descriptors), Gold open by default — the engine's own
  default — with W3C APG accordion semantics and no auto-scroll on expand.
- **Only one tier's products are ever visible**, so the three tier leaders
  never sit adjacent: this is the variant's honesty argument against the
  stacked-group alternative.
- One card anatomy for lead and supporting cards (production's top-pick card
  is larger and richer); position plus the threshold-honest eyebrow carry the
  within-tier distinction.
- Differentiators and authored display badges are surfaced on cards —
  production renders differentiators only in the drawer and display badges
  nowhere.
- Same provenance split, firmness graphic, compare demo, inert financing
  module and real empty-tier path as the tabs variant.
- Ships a **documented-only** `tier_view` retirement plan (§11); no analytics
  are implemented.

## 3. What each prototype deliberately preserves

All four, verified by the lead (§8):

- **Priorities at the engine's index, order and count.** sparse-b renders
  exactly two; dense-c preserves the 90/90 stable-sort tie order. Nothing is
  padded, filtered, re-sorted, or selected by kind.
- **The exact firmness integer** — on the Sleep Brief the customer's value, on
  Results each model's own — rendered as N of 10 discrete segments plus the
  numeral, with word labels taken from the destination surface's own live
  vocabulary. No rescaling, rounding or new stops; the three production word
  maps are not silently unified.
- **Tier identity, membership and within-tier order** exactly as captured, in
  the fixed Gold→Silver→Bronze order, with the internal keys untouched.
- **No score, percentage, mattress rank number or winner treatment anywhere**,
  and no cross-tier ranking implication.
- **Threshold-honest copy** wired to `meetsMatchThreshold`, not to position.
- **Verbatim production bilingual pairs** for the fixed heading, Edit Answers,
  tier names and descriptors, kind pills, threshold copy and the working
  compare label; every other string is either fixture data or explicitly
  marked `data-proposed-copy`.
- **No invented per-model reasons.** Authored product copy is labelled as
  product description; no per-feature catalog reason is rendered (all are
  empty).
- **Zero financing on the Sleep Brief and inside compare**; on Results, one
  secondary module in its shipped stale-closed state.
- **Accessibility**: real headings and landmarks, `<ol>` for ranked lists,
  real buttons, `aria-expanded` disclosures, bilingual accessible names,
  aria-hidden graphics with adjacent text, visible focus, ≥44 px targets.
- **No production file, fixture or shared-harness file was modified by any
  builder**; no analytics event was added, renamed or simulated.

## 4. Screenshots

`docs/images/phase1-prototypes/` — 12 captures, named
`<variant>__<scenario>__<lang>__<orientation>-<w>x<h>.jpg`, each stamped in
the image with variant, scenario, language, viewport, display scale and the
warning "illustrative review viewport — NOT the showroom device matrix".

| variant | dense-c EN portrait | dense-c ES landscape | sparse-b EN portrait |
|---|---|---|---|
| sleep-brief-a | ✅ 834×1112 | ✅ 1112×834 | ✅ 834×1112 |
| sleep-brief-b | ✅ 834×1112 | ✅ 1112×834 | ✅ 834×1112 |
| results-tabs | ✅ 834×1112 | ✅ 1112×834 | ✅ 834×1112 |
| results-grouped | ✅ 834×1112 | ✅ 1112×834 | ✅ 834×1112 |

Captured through `prototypes/phase1-decision-package/shared/viewport-harness.html`,
which renders a variant inside an exactly-sized iframe so its media queries
resolve at the target viewport; only the on-screen rendering is scaled, and
the scale factor is stamped on every image. Reviewers can reproduce any cell —
or any other size — by opening that harness with `v`, `s`, `l`, `w`, `h`
parameters. Beyond these 12 images, the lead ran programmatic checks across
**48 variant × scenario × language × viewport combinations** (adding 400×800
and both dense scenarios) for overflow, heading order, priority order and
count, per-card firmness parity, tier order and membership, percentage/score
leakage, Spanish completeness and touch-target size.

## 5. Tradeoffs

### 5.1 Sleep Brief: A (need-led) vs B (conservative)

| | **A — need-led** | **B — conservative** |
|---|---|---|
| First thing read aloud | The customer's actual top need ("Comfortable elevation") | The screen's name, then the need |
| Recognition across visits | Weaker — the title changes per customer | Stronger — a stable, nameable screen |
| Salesperson repeatability | Opening line differs every session | Same opening line every session |
| Reading load | Lowest — most prose removed, testing detail hidden | Low — same prose removed, testing detail kept but subordinated |
| Testing detail | Behind a disclosure (a tap, by one person, on a shared screen) | Always visible to both people |
| Gate exposure | **Triggers the 1.1 gate** (heading replaced) | **Also triggers it** (heading subordinated) — but less far |
| Risk | The eyebrow may read as a subtitle; a "need" title can feel like a diagnosis if copy drifts | Less differentiated from today; the win is smaller |

The sharpest disagreement in the whole research program is on A's disclosure.
The roadmap proposes it; the external evidence
(`w2-progressive-disclosure`) argues **against** it: by NN/g's own
frequency criterion the "Try this:" prompt is primary, every-consultation
content, GOV.UK guidance forbids hiding what the majority need, and Baymard
measured 50–80 % of users overlooking collapsed content. On a shared display
the tap cost lands on one person — hidden content is invisible to the
customer unless the operator opens it, which is a training dependency, not a
design guarantee. **A implements it anyway so Blake can judge both directions
against real screens**; B is the visible-detail counterfactual. Note this is
separable: A's composition could ship with the detail visible.

### 5.2 Results: restyled tabs vs single-open accordion

| | **Restyled tabs** | **Single-open accordion** |
|---|---|---|
| Rank adjacency | None — one tier at a time | None — one tier at a time |
| Other tiers' existence | A tab bar; research documents users overlooking tabbed content | Headers permanently visible as a standing tour agenda |
| Accessibility cost | Full ARIA tabs contract (production's tabs are plain divs with none of it) | Cheapest correct pattern: button + `aria-expanded` |
| Analytics cost | **None** — `tier_view` semantics unchanged | An intentional retire/replace change-set (§11) plus new behavioral coverage |
| Gate exposure | Restyling tabs is explicitly **Proceeds** — no gate | **Triggers the 1.3 adoption gate** |
| Glanceability (measured) | Image ≈18–21 % of viewport; lead model name and firmness **above the fold** in both orientations | Image ≈36 % portrait / **63 % landscape**; in landscape the model name (y≈998) and firmness (y≈1050) fall **below** an 834 px fold |
| Rework risk | Low | If Phase 3.3 later adopts a global maximum, this is restyled, not rebuilt |

The measured glanceability gap is the accordion's main weakness and is a
**fixable styling issue, not intrinsic to the pattern** — the image is the
variant's own choice, not a consequence of accordions. It is reported here
because it is exactly what a salesperson would hit first on a landscape
mount. Stacked side-by-side groups were **excluded before building**: three
adjacent tier leaders assert a global ranking the engine never computes
(`w2-tier-navigation`), and the effect worsens in landscape.

Both Results variants share one honest limitation: with the shipped catalog
every fixture entry meets the match threshold, so the "Additional comparison
option" degradation is implemented from the shipped copy pair but never
exercised on screen; the same applies to the empty-tier state.

## 6. Accessibility assessment

*(TO FILL after the accessibility adversary; the build bar every variant was
required to meet: real headings/landmarks, `<ol>` for ranked lists, real
buttons, aria-expanded disclosures, aria-pressed toggles, bilingual
accessible names, firmness spoken as "Medium, 4 of 10" / "Medio, 4 de 10",
visible text on every badge, decorative glyphs hidden, visible dual-ring
focus, ≥44 px targets, keyboard operation, no hover-only info, no duplicate
announcement mechanism.)*

## 7. Shared salesperson/customer assessment

*(TO FILL after the shared-viewing adversary; evaluation frame from
w2-assisted-sales: anchors not prose, one large assertion per view, stable
spatial positions, operator heads-down time as the metric, customer-verifiable
evidence — the customer's own answers — up front.)*

## 8. Data-contract and scoring-isolation assessment

The prototypes consume frozen fixtures captured by executing the real engine
at `78f949c` — the same extract-and-execute patterns as the shipped suites.
Provenance: `fixtures/PROVENANCE.md` (engine-source commit pinned; capture
aborts if `index.html`/`data/`/`Code.gs` differ from `origin/main`;
LF-normalized sha256 of every input and output).
`fixtures/tools/parity_check.mjs` re-executes the capture and byte-compares:
21/21 at freeze (priority order/count, firmness integer, tier
membership/order, rendered Sleep Brief DOM). EN/ES engine parity asserted at
capture. Scenario provenance: the answer sets are verbatim reuses of the
characterized fixture library in the shipped suites (dense-c carries the
90/90 stable-sort tie whose sorted set differs from insertion order; sparse-b
produces exactly two priorities). *(Adversarial verification results TO FILL
after Wave 4: scoring-isolation, tier-honesty and test-vacuity adversaries.)*

Known fixture limitations (recorded, not patched): every captured tier entry
has `meetsMatchThreshold:true`, so the "Additional comparison option" state
is implemented from the shipped copy pair but not exercisable from fixture
data; the empty-tier state likewise (the shipped catalog fills all tiers);
no captured scenario exercises the back-fill path.

## 9. Device-matrix limitation

No committed source records the showroom device, viewport, orientation, or
mount (the hardening doc's iPad tests recorded no dimensions). Phase 0.4
remains ⏳ and Phase 0 open. Every prototype viewport (320 / 480 / 768×1024
portrait / 1024×768 landscape / 1180+) is an illustrative, content-driven
sample — **none is a showroom-hardware claim**, no breakpoint in any
prototype is justified by hardware, and the non-mounted iPad evidence
referenced elsewhere is useful reference only and satisfies neither the
Phase 0.4 nor the Phase 1 hardware gates. Nothing in this package is
device-approved.

## 10. Catalog-content limitation

Reason-led mattress cards — the point of the 1.3 redesign — cannot be
honestly built today: all per-feature reason columns are empty and even the
generic default renders nowhere. The prototypes therefore show only existing
generic/product-describing behavior, visually separated from customer-fit
template copy, and **no invented per-model reason appears anywhere**. The
authoring package (`docs/phase1-catalog-reason-authoring-brief.md`) defines
what Lacks must author (EN+ES, evidence, approver, verified date), the blank
79-cell applicability matrix, and the proposed provenance workflow. Its one
engineering prerequisite (the `MATT_ES_KEYS` extension, without which Spanish
reasons silently drop) is flagged, not implemented. Three existing catalog
strings are flagged for claim review (g4 unqualified "10° cooler"; g9
"recovery benefits"; g9 antimicrobial-adjacent copper copy) — grandfather or
hot-fix is Blake's call.

## 11. Analytics consequence of replacing tier tabs

`tier_view` belongs to the tab interaction: its single call site lives inside
`_setActiveResultsTier` (index.html:14278), reachable only from the tab
markup; it counts switches only and the initial Gold view is never logged.
Adopting a tab-less layout therefore requires an **intentional retire/replace
decision** executed atomically across: the call site (14278), the
`EVENT_FIELDS` declaration (13602), the behavioral enum-redaction rows
(tests/session_async_check.mjs:715–716 — re-anchor to `save_pick_toggle`),
the `tierViews` counters and wipe (13530/14277/13654/18735 + safety-suite
seeds), and the `#tierTabs` DOM pins (index.html:18472 +
tests/session_safety_check.mjs:1036). The existing CI guard is a static text
sweep that stays green with an orphaned switcher (three dead declared events
prove this pattern live today), so a replacement interaction needs a **new**
named, enum-validated event with extract-and-execute behavioral coverage —
never a reused `tier_view`. **None of this is implemented in this sprint;**
the accordion prototype documents it and changes no analytics.

## 12. Decisions requested from Blake

Each is independently answerable; none is recorded as made.

1. **Sleep Brief presentation (1.1 gate):** Alternative A (need-led hero),
   Alternative B (conservative hierarchy), or revise. Sub-decisions if A:
   accept the heading replacement and the disclosure of the testing detail
   (noting the external evidence against hiding it); if B: accept typographic
   subordination as the reading-load reduction.
2. **Tier navigation (1.3 adoption gate):** keep/restyle the tabs (approve
   the restyle direction), approve the single-open accordion direction (with
   the §11 analytics change-set as an acknowledged implementation cost), or
   revise. Stacked groups are recommended excluded (rank adjacency).
3. **Catalog authoring:** approve the proposed content workflow (claim tiers,
   bilingual parity gate, provenance record, curated V1) and **name the Lacks
   merchandising owner** — the single blocking dependency; also: grandfather
   or hot-fix the three flagged catalog strings; decide the `MATT_ES_KEYS`
   prerequisite change; answer the six merchandising questions in the brief.
4. **Phase 1 scoring-fixture exit gate:** approve investigation/
   implementation cost of the roadmap's recommended frozen-fixture gate
   (610–615) — the fixture tooling built for this package demonstrates
   feasibility (extract-and-execute + sha-pinned parity) — or defer, or
   reject.

Secondary flags surfaced by research (each needs only an acknowledge/defer):
the tu-vs-usted register decision for ES copy; the handoff-screen voice
divergence (EN customer-voiced vs ES salesperson-voiced); the
buyer-characterising Bronze descriptor; the audit-found CSS/dict/wipe
defects in §1 (cleanup proposals, not part of this package's scope).

---

## Research ledger

| Agent / task | Delivered | Key evidence | Conclusion used? | Why / why not |
|---|---|---|---|---|
| W1 sleep-brief-runtime | ✅ report | index.html:9610–9638, 13042–13520 | ✅ | Sleep Brief contract: headings, copy sources, focus policy |
| W1 priority-firmness-isolation | ✅ report | 13231–13404, tests pins | ✅ | priority order/cap/tie contract; three firmness vocabularies; fixture spec |
| W1 results-tier-contract | ✅ report | 14503–14573, 15546–15559 | ✅ | tier build, qualification/back-fill, consumer inventory; CSS defects found |
| W1 compare-path | ✅ report | 17398–17409, 18867–18917 | ✅ | one working entry; dormant tray/trigger; modal a11y outlier |
| W1 mattress-card-content | ✅ report | data/mattresses.csv, 14081–14218 | ✅ | card anatomy; reason deadness; displayBadges trap |
| W1 catalog-pipeline | ✅ report | build_lacks_workbook.py:81–103 | ✅ | authoring surface; MATT_ES_KEYS silent-drop; provenance model |
| W1 bilingual-contract | ✅ report | 11123–11149, dict scan | ✅ | dead dict keys; verbatim string tables; store-bilingual-resolve-at-render |
| W1 accessibility-focus | ✅ report | 12529–12575, 18170–18298 | ✅ | focus-only announcements; dialog contract; aria-expanded absent |
| W1 responsive-layout | ✅ report | 29 @media inventory | ✅ | live layout system; dead brackets; no hardware-derived breakpoint exists |
| W1 analytics-contract | ✅ report | 13585–13638, guard suites | ✅ | tier_view retirement change-set; roadmap count corrected (3 dead events) |
| W1 financing-isolation | ✅ report | 10262–11116, executed 69/69 | ✅ | stale-closed shipped state; zero financing on Brief/Compare |
| W1 consultation-email | ✅ report | resolver + payload projections | ✅ | one-resolver contract; wipe-by-id leak risk; gold-top-3 email fallback |
| W2 assisted-sales | ✅ report | EHR/clienteling/redundancy research | ✅ | anchors-not-prose; heads-down-time metric |
| W2 progressive-disclosure | ✅ report | NN/g, Baymard, GOV.UK, APG | ✅ | evidence against hiding "Try this"; shaped the A/B contrast |
| W2 ranked-information | ✅ report | FTC dark-patterns, IPDAS, NN/g | ✅ | ordinals for priorities; equal tier-leader anatomy; basis-of-order line |
| W2 firmness-viz | ✅ report | HTMHell VoiceOver matrix, APG | ✅ | 10 discrete segments; word+number pairing; no meter role |
| W2 signal-badges | ✅ report | GOV.UK tag, NN/g icons, Cambridge | ✅ | inert status tags; never health-adjacent badges |
| W2 tier-navigation | ✅ report | APG tabs/accordion, NN/g, Baymard | ✅ | stacked groups excluded; accordion as challenger |
| W2 comparison-interface | ✅ report | Baymard compare research | ✅ | shipped pattern is correct; surface, don't rebuild |
| W2 tablet-shared-viewing | ✅ report | WCAG 2.5.8/2.5.5, HIG, ADA | ✅ | two-tier reading model; 44 pt; contrast targets; no orientation lock |
| W2 bilingual-presentation | ✅ report | W3C/IBM expansion, es-US retail | ✅ | Spanish-first QA; glossary freeze; tu/usted + handoff-voice flags |
| W2 claim-safety | ✅ report | FTC 2022 guidance, Moonlight Slumber | ✅ | A–E tiers; three flagged catalog strings (lead-verified) |
| W2 content-governance | ✅ report | financing gate, GOV.UK lifecycle | ✅ | parity release gate; curated V1; named-owner dependency |
| W2 consultation-handoff | ✅ report | peak-end, Gong, ISPA | ✅ | division-of-labor rule; conclusion restraint |
| W3 fixture/provenance | ✅ (lead-executed) | parity 21/21; suites 69/69, 226/226 | ✅ | agents unavailable in session-limit window; Wave 4/5 verify independently |
| W3 catalog-authoring package | ✅ (lead-executed) | programmatic 26-row inventory | ✅ | same replacement reason; verified against both catalog audits |
| W3 sleep-brief-a builder | *(TO FILL)* | | | |
| W3 sleep-brief-b builder | *(TO FILL)* | | | |
| W3 results-tabs builder | *(TO FILL)* | | | |
| W3 results-grouped builder | *(TO FILL)* | | | |
| W4 adversaries (≥8) | *(TO FILL)* | | | |
| W5 referees (≥3) | *(TO FILL)* | | | |

*(Conflicts between agents and their resolutions, plus rejected findings,
are recorded in the delivery report and folded in here at package freeze.)*
