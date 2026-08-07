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

*(TO FILL after Wave 3 builder delivery — per variant, from VARIANT-NOTES.)*

## 3. What each prototype deliberately preserves

*(TO FILL after Wave 3 builder delivery — per variant.)*

## 4. Screenshots

*(TO FILL after the screenshot matrix: EN/ES × portrait/landscape ×
dense/sparse per variant, under `docs/images/phase1-prototypes/`. Viewports
are illustrative and content-driven — not the showroom device matrix.)*

## 5. Tradeoffs

*(TO FILL after Wave 3 + Wave 4; the research-backed axes are already fixed:
need-led hero vs stable heading (recognition, salesperson repeatability);
disclosure vs visible testing detail — external evidence argues the "Try
this" prompt is primary every-consultation content (w2-progressive-disclosure)
and Alternative A implements the roadmap-proposed disclosure anyway so the
choice is judged on real screens; tabs (zero rank adjacency, known
discoverability weakness) vs single-open accordion (headers as standing tour
agenda, cheapest correct a11y, analytics retirement cost). Stacked
side-by-side groups were excluded: three adjacent tier leaders assert a
global ranking the engine never computes.)*

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
