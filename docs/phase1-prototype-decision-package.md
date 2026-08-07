# Phase 1 prototype decision package — Sleep Brief and Results

**RESEARCH / PROTOTYPE ONLY.** This package exists so Blake can decide the
two gated Phase 1 presentation questions from actual bilingual screens
instead of prose. It is **not** Phase 1 implementation and records **no**
approval. Phase 0.4 remains ⏳, Phase 0 remains open, the showroom device
matrix is unconfirmed, the production application is unchanged from
`origin/main` = `78f949c`, and the per-model catalog reasons remain missing
and were **not** invented.

**Correction pass (2026-08-07).** After Codex's independent review of head
`ad94e4e`, the package was corrected from a broad candidate-narrowing
exploration into a clean decision package with two **recommended
candidates**: an A-derived Sleep Brief (`sleep-brief-recommended/`) and the
corrected tier-tabs Results (`results-tabs/`). Alternatives A/B and the
grouped accordion are retained as exploration records (the accordion as
**rejected** exploration). Nothing in this pass upgrades agent reviews,
automated checks or screenshots into salesperson/customer observation —
the human evaluation is prepared, not performed, in
`docs/phase1-assisted-sales-evaluation-packet.md` (status: NOT RUN).

DreamFinder's operating premise throughout: a **salesperson-operated
presentation and consultation tool used with the customer present** — the
salesperson is the primary operator and narrator; the interface must hold
shared context, glanceability and conversational control. Sleep fit is
primary; Payment Choice is secondary and isolated.

Prototypes: `prototypes/phase1-decision-package/` (standalone; never
imported, linked or executed by the production app). Frozen engine fixtures:
`prototypes/phase1-decision-package/fixtures/` (captured by executing the
real engine at `78f949c`; see `PROVENANCE.md` there). Companion documents:
`docs/phase1-catalog-reason-authoring-brief.md` (corrected),
`docs/phase1-research-source-appendix.md` (new),
`docs/phase1-assisted-sales-evaluation-packet.md` (new, NOT RUN).

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
· básico" — buyer-characterising; the roadmap's ungated **Proceeds** list
(docs/rebuild-roadmap.md:750-751) already records that such labels must be
removed, so this is an executed decision pending in production, not an open
question; production remains unchanged by this package. Cards show: photo,
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

### 2.0 The two recommended candidates (correction pass)

**Sleep Brief — recommended candidate (`sleep-brief-recommended/`,
A-derived).** Combines A's need-led hero (`h1` = `priorityRows[0]` strictly
by index, production heading demoted to a continuity eyebrow), A's compact
shared-view composition, A's exact 1–10 firmness presentation (10 discrete
segments + the exact integer + the Brief's own captured word), A's exact
engine-ordered 1–3 priority list, A's ≥920 px landscape structure and
persistent sticky actions — with **B's always-visible "Try this:" testing
guidance** (the captured implication-not-diagnosis copy, typographically
subordinated, never behind a tap) and **visible category labels on the
signal badges** (a `<dl>`; captured metaStrip labels for
Temperature/Feel/Size, proposed labels for Position/Sharing). The
first-visit screen carries **no Compare entry**: there are no saved
finalists on a first visit, production's Sleep Brief has no Compare entry,
and the working saved-finalist Compare belongs to the Consultation Summary
— so the A/B compare demonstration (which needed simulated saved products)
is removed rather than dressed up. Action hierarchy: primary = proposed
"See My Matches →" (marked), secondary = the production Edit-answers entry
verbatim. Proposed copy is marked three ways (attribute, visible dotted
underline + legend, sr-only suffix); a strict resolver forbids
cross-language fallback. No returning-session state is modeled on this
screen.

**Focused final pass (2026-08-07, pre-dry-run) — applies to both
candidates.** Four further corrections landed after Codex's follow-up
review: **(1) strict language resolution** — the candidates no longer use
the shared harness's en-fallback resolver anywhere; required bilingual
copy fails loudly (a visible bilingual "PROTOTYPE CONTRACT FAILURE" naming
the string) when the active language's value is missing, optional content
omits, per-language fixture tables are presence-checked (a missing field
can no longer render the literal "undefined"), and language-neutral
scalars are the only shared values. **(2) topPickReason demoted** — the
claim-risk inventory (§10) shows it is not claim-safe customer-agnostic
copy, so the Results candidate renders **no product-description layer**
in either mode (a reviewer-mode-only chrome placeholder marks the region;
nothing may stand in for it, including reason_default). **(3) Evaluation
mode** (`?mode=evaluation`) — the assisted-sales dry-run surface: same
fixtures, code, composition and interaction, but no reviewer apparatus
(no scenario/language controls, no dotted proposed-copy marking or
legends, no sim notes or footnotes, no sr marker suffixes), with one
small "Prototype — not production" notice retained; the contract runner
proves product state is identical across modes. **(4) State-accurate
Compare language** — stable heading "Mattress comparison"; when closed,
the section opener reads "Compare selected mattresses" while the tray
keeps its production-verbatim "Compare →" (proposed ES "Comparar →");
while open, BOTH controls read "Close comparison". The packet's frozen URLs use evaluation mode.

**Results — recommended candidate (`results-tabs/`, corrected).**
Accessible tier tabs remain the navigation (full APG tabs contract). The
correction pass: **no tier-descriptor subtitle renders** (the roadmap
already decided buyer-characterising tier language — "Bronze ·
entry-level" / "Bronce · básico" — must go; this is executed, not re-asked;
any future subtitle needs explicit approval); the card hierarchy becomes
**one full-anatomy within-tier lead + two compact supporting comparisons**
(titles-and-tags talking points at salesperson-readable size; descs live
behind Details, as in production's drawer); **production-verbatim Details
and Save actions are restored** as clearly-identified inert prototype
controls; Compare uses **page-local terminology** ("Compare selected
mattresses" — never "finalists" for unsaved selections) and opening it
**scrolls to and focuses** the stable section heading so the tap has a
visible and focus consequence; Payment Choice stays one secondary
stale-closed module (the second `fitFirst` line mirrors production's own
footer hint — one module, two instances of that string, production-
faithful). Qualified tier membership and within-tier order are consumed
verbatim from fixtures under the engine's ≥60 % threshold/back-fill
contract; the underlying catalog is 9 gold / 10 silver / 7 bronze while
Results surfaces at most 3 per tier by the engine's cap (so "9/10/7"
describes the catalog, never the Results screen); no score or percentage
renders.

Both candidates are executed against every fixture scenario × language by
`fixtures/tools/contract_check.mjs` (§8). Sections 2.1–2.4 below are the
exploration record that produced them.

### 2.1 Sleep Brief — Alternative A (need-led) — exploration record

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

### 2.2 Sleep Brief — Alternative B (conservative hierarchy) — exploration record

- **The heading does not change.** "Your Sleep Brief" / "Tu Resumen de Sueño"
  stays the `h1`; the engine's first priority (same index-0 selection)
  appears *beneath* it as a subordinate conversation lead under a proposed
  "Where we start" / "Por dónde empezamos" label, and still renders as item 1
  of the list — an echo, not a removal.
- **Today's top-level section order is kept** (identity → what-we-test →
  journey → actions); the same prose is condensed into the same five
  badges, and each badge carries a visible category label (POSITION /
  TEMPERATURE / SHARING / FEEL / SIZE). Correction: the fix pass aligned
  badge **order** across the two Briefs, not labels — visible labels
  existed in B alone until the recommended candidate adopted them (§2.0).
- **The testing detail stays fully visible**, subordinated typographically —
  B's deliberate, recorded contrast with A.
- Same firmness treatment, same ordinal markers, same CTA resolution and
  simulated compare entry as A.
- The `tag-preference` pill is rendered with the neutral base style, mirroring
  production's *missing* CSS rule rather than silently fixing it.

### 2.3 Results — restyled tier tabs — as originally built (see §2.0 for the corrected candidate)

- Tabs remain the navigation. Contrast on unselected tabs is raised, targets
  are ≥44 px, and Spanish labels are checked against overflow (production's
  tab row can overflow below ~480 px).
- Cards gain a **provenance split**: a product-story layer (authored
  `topPickReason`, labelled "Product description" in this variant;
  the accordion variant labels it "About this model") visually separated
  from the answer-aware customer-fit rows — production blurs these.
- Firmness gains the 10-segment graphic alongside the existing numeral.
- Compare is made **discoverable**: card-level toggle, a selection tray and an
  action-area entry — reviving the pattern that exists in production CSS and
  handlers but never renders — capped at 2, opening a labelled simulated 2-up
  panel showing the tier **name** (never a percentage).
- The financing module is reproduced in its **shipped stale-closed state**
  (no rates anywhere), visually secondary, inert.
- The empty-tier state is implemented as a real code path.
- ~~A proposed alternative Bronze descriptor…~~ **Superseded by the
  correction pass:** no tier-descriptor subtitle renders at all. The
  roadmap had already decided that buyer-characterising tier language must
  be removed, so the shipped "entry-level" / "básico" pair no longer
  renders in any package variant and its removal is not presented as a new
  Blake decision. Production's descriptor line is unchanged and flagged.

### 2.4 Results — single-open accordion — REJECTED exploration

- **Tabs are replaced.** Three tier sections with headers permanently
  present **in the DOM** (the original "permanently visible" claim is
  corrected — with a tier panel open, the other headers routinely sit
  outside the viewport; only the open header is sticky, so the standing
  three-beat agenda this variant promised is not what it delivers, and
  that shortfall is the concrete ground for rejecting it). Gold open by
  default — the engine's own default — with W3C APG accordion semantics
  and no auto-scroll on expand. (Descriptor subtitles removed in the
  correction pass, as everywhere.)
- **Only one tier's products are ever visible**, so the three tier leaders
  never sit adjacent: this was the variant's honesty argument against the
  stacked-group alternative.
- One card anatomy for lead and supporting cards (production's top-pick card
  is larger and richer); position plus the threshold-honest eyebrow carry the
  within-tier distinction.
- The builder originally surfaced differentiators and authored display
  badges on cards; the adversarial fix pass **removed both** (they carried
  unreviewed price/ranking claims and, for badges, a surface production
  does not have) — differentiator detail now appears only inside the
  compare panel, mirroring production's drawer/compare placement.
- Same provenance split, firmness graphic, compare demo, inert financing
  module and real empty-tier path as the tabs variant.
- Ships a **documented-only** `tier_view` retirement plan (§11); no analytics
  are implemented.

## 3. What each prototype deliberately preserves

All four original exploration variants (verified by the lead and the Wave 4
sweeps, §8); the two recommended candidates additionally have every
rendering-contract bullet below executed against them by the contract
runner (§8) — excepting the accessibility bullet's visible-focus and
target-size elements (static CSS-text checks only, no layout engine) and
the final bullet (a git-diff property, verified by diff rather than by the
runner). Two §2.0 exceptions to the sixth bullet: the candidates render
neither the tier descriptors (removed package-wide) nor the compare-label
pairs (no first-visit Compare exists); and that bullet's
marked-proposed-copy clause is enforced visibly + audibly only in the
candidates — in the exploration variants the marking is attribute-only
(narrowed claim, README).

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

## 4. Screenshots — lean matched evidence set (correction pass)

`docs/images/phase1-prototypes/` — named
`<variant>__<scenario>__<lang>__<orientation>-<w>x<h>[__<state>].jpg`, each
stamped in the image with variant, scenario, language, state (where
applicable), viewport, display scale and the warning "illustrative review
viewport — NOT the showroom device matrix". **These are prototype evidence,
never hardware evidence.**

The evidence matrix covers the two recommended candidates. Matched EN/ES
cells use the **same fixture and same state** — a language difference is
only ever shown language-vs-language, never confounded with an orientation
or state change.

**Sleep Brief candidate (`sleep-brief-recommended`), fixture `dense-c`
except where noted:**

| cell | file |
|---|---|
| dense EN portrait | `…__dense-c__en__portrait-834x1112.jpg` |
| dense ES portrait (same fixture/state) | `…__dense-c__es__portrait-834x1112.jpg` |
| dense EN landscape | `…__dense-c__en__landscape-1112x834.jpg` |
| dense ES landscape (same fixture/state) | `…__dense-c__es__landscape-1112x834.jpg` |
| one-priority boundary (SYNTHETIC fixture, disclosed) | `…__boundary-one__en__portrait-834x1112.jpg` |

No returning-session Compare cell exists because no Compare state remains
in the Sleep Brief proposal (§2.0).

**Results candidate (`results-tabs`), fixture `dense-c`:**

| cell | file |
|---|---|
| EN portrait, Gold, 0 selected (Details/Save visible) | `…__en__portrait-834x1112.jpg` |
| ES portrait, same fixture and state | `…__es__portrait-834x1112.jpg` |
| EN landscape | `…__en__landscape-1112x834.jpg` |
| ES landscape, same fixture and state | `…__es__landscape-1112x834.jpg` |
| Silver tier selected | `…__en__portrait-834x1112__silver.jpg` |
| two products selected, tray visible | `…__en__portrait-834x1112__selected2.jpg` |
| Compare surface open (focused heading visible) | `…__en__portrait-834x1112__compare-open.jpg` |

Captured through `shared/viewport-harness.html` (exact-size iframe; only
on-screen rendering is scaled; scale stamped). Stateful cells are driven by
the results-tabs review-state driver (`?state=…` — prototype chrome that
replays real interactions through the real handlers), so **every cell is
reproducible by URL** with the harness `v`, `s`, `l`, `st`, `w`, `h`
parameters.

The compare-open cell must be captured through the viewport harness;
opening Compare scrolls the document, so a direct-URL headless screenshot
at 834×1112 captures a blank frame (the page itself is fine — the harness
scrolls an iframe, not the top-level document).

**Evaluation-mode cells (focused pass)** — stamped "evaluation-mode
prototype — not hardware evidence"; they verify the dry-run surface is
clean of reviewer apparatus while the composition is unchanged:

| cell | file |
|---|---|
| Sleep Brief, dense EN portrait, evaluation | `sleep-brief-recommended__dense-c__en__portrait-834x1112__eval.jpg` |
| Sleep Brief, dense ES landscape, evaluation | `sleep-brief-recommended__dense-c__es__landscape-1112x834__eval.jpg` |
| Results, dense EN portrait, evaluation | `results-tabs__dense-c__en__portrait-834x1112__eval.jpg` |
| Results, dense ES portrait, evaluation | `results-tabs__dense-c__es__portrait-834x1112__eval.jpg` |
| Results, compare open, evaluation | `results-tabs__dense-c__en__portrait-834x1112__compare-open__eval.jpg` |

The seven reviewer-mode results-tabs cells above were re-captured in the
focused pass (they now show the demoted product-description region and
the state-accurate Compare labels).

Historical exploration captures (sleep-brief-a incl. its disclosure-open
supplementary, sleep-brief-b, results-grouped) are retained as the record
of the pre-correction exploration state; the superseded pre-correction
results-tabs captures were replaced by the matrix above. The Wave 4
adversarial sweeps described in §8 ran against the pre-correction variants;
the contract runner (§8) is the executable evidence for the corrected
candidates.

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

The sharpest disagreement in the research program was on A's disclosure.
The roadmap proposed it; the external evidence
(`w2-progressive-disclosure`) argues **against** it: by NN/g's frequency
criterion the "Try this:" prompt is primary, every-consultation content,
and GOV.UK's guidance is verbatim "Do not use the details component to
hide information that the majority of your users will need."
**Correction:** an earlier head attributed a "50–80 % of users overlook
collapsed content" measurement to Baymard; that figure could not be
re-verified against any checkable Baymard publication and is withdrawn —
what the checkable sources support is qualitative (participants
"repeatedly observed to overlook" tab-hidden product-page content), a
heuristic risk to test in the assisted-sales dry run, not a decided
overlook rate (full context: `docs/phase1-research-source-appendix.md`).
On a shared display the tap cost lands on one person — hidden content is
invisible to the customer unless the operator opens it, a training
dependency, not a design guarantee. A implemented the disclosure so both
directions could be judged; **the recommended candidate resolves the
disagreement in favor of B's always-visible treatment** on the strength of
the qualitative guidance plus the shared-screen argument. A's
disclosure-open supplementary capture remains as the record of the road
not taken. Whether the operator/customer pair actually notices and uses
the visible guidance is exactly what the dry run's capture item 4
measures.

### 5.2 Results: restyled tabs vs single-open accordion

| | **Restyled tabs** | **Single-open accordion** |
|---|---|---|
| Rank adjacency | None — one tier at a time | None — one tier at a time |
| Other tiers' existence | A tab bar; research documents users overlooking tabbed content | Headers always in the DOM and reachable by scrolling — but NOT reliably co-visible (corrected claim; with a panel open the other headers routinely sit off-screen), so the "standing tour agenda" promise fails as built |
| Accessibility cost | Full ARIA tabs contract (production's tabs are plain divs with none of it) | Cheapest correct pattern: button + `aria-expanded` |
| Analytics cost | **None** — `tier_view` semantics unchanged | An intentional retire/replace change-set (§11) plus new behavioral coverage |
| Gate exposure | Restyling tabs is explicitly **Proceeds** — no gate | **Triggers the 1.3 adoption gate** |
| Glanceability (measured, pre-fix) | Image ≈18–21 % of viewport **height** at 834×1112/1112×834 (33 % at 1024×768, where firmness dipped just below the fold — the "both orientations" claim held only at the screenshot sizes); name above the fold at every size tested, net of the 88 px prototype review bar | Image ≈36 % portrait; landscape pre-fix: 63 % of raw viewport height at 1112×834, 65–72 % of usable viewport (height minus the 88 px review bar) across the landscape sizes tested — model name and firmness below the fold. **Fixed post-review by a content-driven photo height cap** (now ≈28 % with both above the fold), recorded in its VARIANT-NOTES |
| Rework risk | Low | If Phase 3.3 later adopts a global maximum, this is restyled, not rebuilt |

**Outcome (correction pass): accessible tier tabs are the recommended
direction; the accordion is rejected exploration.** The rejection ground is
concrete, not theoretical: the built accordion does not deliver the
discoverability/shared-agenda benefit claimed for it — its headers are not
reliably co-visible (above), so it pays the §11 analytics change-set and
the 1.3 adoption gate for a benefit it does not achieve. The earlier
glanceability gap was fixable styling; the co-visibility shortfall is what
kills the claim. On stacked/grouped layouts generally: the earlier
framing — that vertical adjacency *asserts* a global ranking and the
pattern was therefore "excluded before building" — is corrected to a
**layout risk, not a theorem**: adjacency *invites* a cross-tier ranking
read the engine does not compute, which a future layout would have to
manage; nothing makes such layouts logically invalid.

Both Results variants share one honest limitation: with the shipped catalog
every fixture entry meets the match threshold, so the "Additional comparison
option" degradation is implemented from the shipped copy pair but never
exercised on screen; the same applies to the empty-tier state.

## 6. Accessibility assessment

**Post-fix state, adversarially tested.** What the accessibility adversary's
sweeps confirmed across all four variants (4 variants × 3 scenarios × 2
languages × 4 viewports): zero `outline:none` rules anywhere and every
enabled control shows the dual-ring focus indicator under keyboard modality;
every painted control is keyboard reachable and operable; every disclosure
and toggle is a real `<button>` (aria-expanded and aria-pressed never
co-occur); every `aria-controls` resolves; zero non-review-bar touch targets
under 44×44 px; the `[hidden]` guard holds everywhere; heading order never
skips a level; DOM order equals visual order; no hover-only information
exists (zero `:hover` information rules, zero tooltips); no live regions or
duplicate announcement mechanisms.

What the adversary broke and the fix pass resolved (each verified by the
lead in-browser after fixing): the Sleep Brief A sticky action bar occluded
disclosure controls (dead taps) — eliminated; A's dialog had unreachable
backdrop-dismiss, element-scoped Escape and a strandable opener-restore —
now dialog-element dismiss, document-level Escape, explicit opener capture;
the compare trays stranded focus on a hidden button and hit-blocked card
buttons — focus now moves to a stable target and the content reserves the
tray's measured height; identical accessible names ("Compare" ×9, "Try
this:" ×3) — disambiguated with sr-only suffixes; the ranked `<ol>`s whose
`list-style:none` strips list semantics on iOS VoiceOver now carry
`role="list"`; the firmness graphic is aria-hidden everywhere with the
bilingual sentence "Firmness: {word}, N of 10" / "Firmeza: {word}, N de 10"
(per-model words consumed from the fixture, never re-derived); duplicate
tier-word announcements and the raw "Plush 3/10" leak in compare are fixed;
`document.title` localizes in all four variants.

Two accessible-vocabulary facts are inherited production behavior, kept and
flagged rather than fixed: the same integer can carry different words on
different surfaces (the Brief's own vocabulary vs `firmnessFeel` — the
documented three-map coexistence), and the Size badge value is EN-only in ES
mode (production's `sizeLabels` has no ES side). **No claim of assistive-
technology verification on real hardware is made — Phase 0.4 is open.**

Correction-pass note: the drawer-grade **dialog lifecycle** this section
describes was Alternative A's compare dialog. The recommended candidates
carry **no dialog** — the Sleep Brief candidate has no Compare surface,
and the Results candidate's compare is an inline panel whose opening
scrolls to and focuses a stable heading. The dialog-lifecycle exhibit
(the "before" contrast with production's modal) survives in the
`sleep-brief-a/` exploration record (`sba.js:363-437`) for whenever the
production modal is upgraded.

## 7. Shared salesperson/customer assessment

Frame (w2-assisted-sales): the screen anchors a narrated conversation —
anchors not prose, stable spatial positions, minimal operator heads-down
time, the customer's own answers as verifiable evidence up front.

**Sleep Briefs.** Both open with the customer's verifiable facts (badges
from their stored answers) and 1–3 need anchors in engine order. The
adversary measured A's disclosure design costing 3 taps to reach 44–49
words of the operator's in-store test script (hidden from the customer
unless the operator opens it) against B showing the same content with zero
taps — resolved in the recommended candidate by adopting B's zero-tap
treatment inside A's composition (§2.0). The previously reported ES fold
datum ("Spanish expansion pushes a priority row below the fold in B at
1112×834 where A shows zero fold flips") is **historical**: it was
measured on A and B as then built, and importing the always-visible
guidance into A's landscape grid invalidates it for the candidate. The
candidate's matched EN/ES landscape captures (§4) are the current
evidence; no fold claim is restated without the assisted-sales dry run.

**Results.** As originally built, the tabs variant kept three model names
+ three firmness values on the first screen at a dossier-like density
(most card detail below 14 px) — the recorded tradeoff of showing three
equal cards at once. **The corrected candidate addresses this directly**:
one full-anatomy lead card with talking-point-size fit rows, two compact
supporting cards (titles + tags only), and restored Details/Save actions
(§2.0). The accordion exploration's first-screen defect was fixed (photo
capped), but its claimed standing agenda — the three tier headers held
co-visible — is not what it delivers (only the open header pins; the
others routinely scroll off-screen), which with the descriptor removal
also moots the earlier "quality ladder permanently co-visible" concern.
Both Results variants scroll the switched-to tier's lead into view, so
"tap Silver, see Silver's best" holds everywhere.

Glance-distance type sizing against real showroom hardware remains
**unassessable** until Phase 0.4 closes the device matrix; the adversary's
arc-minute estimates against an assumed 264 ppi tablet are recorded in its
report as a Phase 0.4 evidence item, not a design verdict.

## 8. Data-contract and scoring-isolation assessment

The prototypes consume frozen fixtures captured by executing the real engine
at `78f949c` — the same extract-and-execute patterns as the shipped suites.
Provenance: `fixtures/PROVENANCE.md`. **Hashing scope, stated exactly
(correction pass):** sha256 (LF-normalized) covers the **three engine
inputs the capture reads** (`index.html`, `data/mattresses.json`,
`data/quiz.json`) and **all four fixture outputs** — `Code.gs` and the
wider `data/` tree are covered by the byte-identity-with-`origin/main`
abort guard, not by a hash, and the tooling/scenario definitions are
ordinary reviewed source in this branch. Parity verifies each hash against
its **exact named PROVENANCE table row** (one row per file, enforced), so
a regeneration cannot silently re-bless changed output. **Authored inputs,
stated exactly (correction pass — an earlier head said "the one authored
input", which undercounted):** (1) three pre-existing authored answer
vectors from the shipped test suites; (2) one newly authored SYNTHETIC
`boundary-one` vector — the one-priority state is unreachable from any
completed quiz (independently confirmed by a 151,200-execution sampling of
the real profile renderer: minimum reachable priority count is 2), so the
vector omits `sleep_position`, is flagged `syntheticAnswerVector` in its
fixture, and is evidence about the length-1 rendering contract only;
(3) the simulated `compareDemo.savedOrder` per scenario (save history is
customer input no capture can produce); the pair is computed by executing
the real extracted `compareReviewFinalists()`. Everything else in the
fixtures is executed engine output. Fixtures are deep-frozen at load by
the shared harness and by the contract runner, so "frozen" is enforced,
not asserted.

**What the executable checks do and do not cover — stated plainly.**

`parity_check.mjs` (**99/99 at this head**) proves the frozen fixtures
equal a fresh engine run, match their row-bound reviewed hashes, and clear
per-surface floors (its deep compare distinguishes arrays from numeric-key
objects). It does **not** test the prototypes.

`contract_check.mjs` (**994/994 at this head**, extended in the focused
pass with evaluation-mode parity checks, strict-language contracts and
state-accurate Compare labels) closes exactly that gap for the two
recommended candidates: it executes their
scripts in a Node DOM stub against all four scenarios × both languages and
asserts the rendering contracts — exact hero by index, priority order and
count, exact firmness integers, badge labels/order/source, tier
membership and order, threshold-honest eyebrow wiring, verbatim
Details/Save with sim identification, tab semantics and keyboard behavior,
the full compare state machine (0/1/2/ready/open/deselect/Clear, non-Gold),
the scroll+focus consequence of opening Compare, page-local terminology,
no score/percentage/descriptor leakage, no raw clinical identifiers,
ES-render language integrity, and proposed-copy marking in both channels.
**Scope honesty:** it runs with no layout engine — target-size and
overflow checks are static CSS-text checks; scroll/focus are asserted as
recorded calls, not pixels. It is **lead-executed only** (`node …`); it
does **not** run in repository CI, and repository CI at this head contains
no prototype step — CI results and prototype-runner results are always
reported separately. It proves deterministic prototype contracts —
never mounted-device usability, real assistive-technology behavior,
customer comprehension, or production readiness.

`contract_negative_check.mjs` (**new in the focused pass; 25/25 caught, 0
survived, 0 stale at this head**) is the RETAINED mutation evidence the
earlier report only narrated: it gates on a green unmutated baseline,
applies each mutation to an isolated temp copy (never the worktree),
verifies the mutation applied exactly once, requires the named responsible
observer to go red **on the intended property**, and reports
caught/survived/stale separately, exiting nonzero on any non-caught row.
Its strict-language cases additionally **demonstrate the closed vacuity**:
with the Spanish side of a string removed, the corrected candidates fail
loudly or omit, while the same mutation under the legacy en-fallback
resolver is shown to render English (five demonstrations; the remaining
per-language-table cases never had a fallback path, and say so).
**Language-claim scope, stated exactly:** "no cross-language fallback" now
covers bilingual objects (strict resolvers), per-language pre-resolved
tables (presence checks + required fields), and the trial-focus strip
(fails when the active language lacks a value the English side has;
omits when absent in both); language-neutral scalars
(names, ids, numeric firmness) are legitimately shared.

The pre-correction fidelity evidence remains as exploration history: the
Wave 4 adversarial sweeps (24 rendered priority combinations; 36 tier
views; 384-render overflow/zoom matrix) confirmed the core fidelity
properties in all four original variants; the lead's browser-executed
protocol from the first pass was documented but not retained as artifacts
— which is precisely why the contract and negative runners now exist as
committed, reproducible replacements.

Review-protocol note: fixtures ship `score`/`pct` on every tier entry for
parity purposes; nothing renders them, but they are visible in devtools —
during a stakeholder screen-share, keep devtools closed.

**What the adversaries broke — and what was done.** Ten adversaries filed
four findings labelled blocker and ~25 confirmed majors. Every accepted finding was reproduced
by the lead before action. The fix pass (recorded per-variant in each
`VARIANT-NOTES.md` "Lead integration pass" section) removed the one genuine
synthesis of engine output (a results-tabs demonstration block that cloned
the gold lead with a fabricated `meetsMatchThreshold:false` and rendered
empty-tier copy for a populated tier); removed the two prototype-invented
card surfaces that leaked unreviewed catalog copy (displayBadges chips,
card-face differentiators — the latter carrying within-tier ranking and
price claims); removed a false "From your answers" attribution over
non-answer-derived rows; capped the accordion's landscape photo; fixed the
sticky-bar occlusion blocker, dialog focus/Escape handling, tray
focus-stranding and hit-blocking; made tier identity persistent while
scrolling in the tabs variant; aligned the two Briefs' badge orders and ES
labels; and corrected every VARIANT-NOTES claim the adversaries falsified.

Known fixture limitations (recorded, not patched — and now quantified):
the below-threshold, back-fill and empty-tier states are not merely
uncaptured but **unexercisable from real data** — a 77,000-execution
sampling of the real engine on the shipped catalog produced zero
`meetsMatchThreshold:false` entries, tiers of always 2–3 entries, and no
empty tier. Both copy branches remain implemented as real code paths,
deliberately never demonstrated with fabricated data; the contract runner
additionally guards that no fixture entry carries a fabricated `false`.
The four fixtures qualify 18 of 26 catalog models (see PROVENANCE's
computed coverage section). Truncation IS well exercised: the engine
generates up to 8 priorities pre-slice for dense-c and renders exactly 3.

**Adversarial findings recorded but NOT fixed (rejected or kept as
tradeoffs, with reasons):**

- *Lead-card emphasis reads as winner treatment* — kept: production's own
  top-pick card is larger and richer than supporting cards; the prototypes
  mirror shipped behavior, with the photo cap reducing the disparity.
  VARIANT-NOTES corrected to stop claiming "equal anatomy".
- *Three tier descriptors form a quality/price ladder* — **overtaken by
  the correction pass**: descriptor subtitles no longer render anywhere in
  the package (roadmap-decided removal of buyer-characterising tier
  language — not a Blake decision to re-ask), and the "permanently
  visible" premise itself was corrected (headers are in the DOM, not
  reliably co-visible).
- *Gold listed first structurally privileges Gold* — rejected as a defect:
  Gold-first is the engine's own default and the product rule.
- *Font sizes vs an assumed 264 ppi tablet* — recorded as a Phase 0.4
  evidence item; nothing can be sized to unconfirmed hardware.
- *Inherited production copy issues* (EN/ES claim-strength differences in
  `profileReassurance`/`fitFirst`/"INCLUIDO", clipped-Spanish kind pills,
  EN-only size labels, mood shifts) — flagged for Blake, unchanged:
  production copy is out of scope for this sprint.
- *Viewport-harness iframe is ~15 px narrower than a real overlay-scrollbar
  tablet* — documented; breakpoints verified not to flip.
- *tabs variant's word count reads as a reading task* — partially addressed
  by the card de-cluttering; the residual density is a recorded tradeoff of
  the three-cards-at-once premise (§5.2).

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
authoring package (`docs/phase1-catalog-reason-authoring-brief.md`,
corrected 2026-08-07) defines what Lacks must author (the expanded
per-reason record: EN+ES, applicability state, evidence excerpt, claim
class, scope, approvers, timestamps, retirement), the blank 79-cell
applicability matrix, the Lane A / Lane B authoring split, and the
proposed provenance workflow. Its governing rule is **fail-closed by
omission**: a missing, stale, incomplete, invalid or unapproved
per-feature reason renders **nothing**, in both languages — never
`reason_default`, never English, never a label. Activation requires the
brief's full ten-prerequisite list (the `MATT_ES_KEYS` extension is item
1 of 10, not the whole list). One engine finding surfaced by the
correction-pass verification is recorded for Phase 3, report-only: the
`pressureRelief`/`motionIsolation` features-side casing break means the
quiz options scoring those keys award **zero points today** — a live
scoring defect, Blake-gated, never to be bundled into content or
presentation work. **Catalog claim risk (reframed in the focused pass):**
the four strings flagged earlier (g4 unqualified "10° cooler"; g9
"recovery benefits"; g9 antimicrobial-adjacent copper copy; b5 "a proven
pick for side sleepers") were **initial high-risk examples found during
the prototype audit — not an exhaustive legal/content review** — and the
earlier claim that only b5 renders in production was also false: **all
four render on production surfaces today** (Results cards, drawer,
compare "Difference" row). Codex's spot-check confirmed the undercount;
the systematic read that followed found it off by an order of magnitude.
The authoring brief now carries a **preliminary claim-risk inventory** of
all 364 customer-visible strings in topPickReason, reason_default,
highlight and the differentiators across all 26 models and both languages
(brief appendix): **83 inventory rows — covering roughly 109 of the 182
EN/ES pairs — carry a claim a reviewer must rule on, 24 of them Tier D/E
strings that render in production today**,
plus internal contradictions (four mutually exclusive price-leadership
claims; two colliding "firmest" claims) and five EN/ES claim divergences
(the unit-less "10°" reads plausibly as Celsius in Spanish). The durable
framing: the catalog predates the claim ladder, so NO string carries an
evidence record, and the whole of topPickReason and the differentiators
needs a claim-safety pass before Phase 1 promotes either field. It is a
preliminary classification for the named owner and legal reviewer — not a
legal approval. This is also why the
corrected Results candidate renders **no product-description layer**:
`topPickReason` is not established claim-safe customer-agnostic copy, no
other catalog field is approved for that surface either, and inventing
replacement copy is prohibited — the structural concept of a separately
labeled product description stays open with **no approved source**. The
fixtures qualify 18 of 26 models; of the four originally flagged strings'
models, g4 and g9 never render in any prototype (those flags rest on
direct catalog inspection; b5 does render — PROVENANCE records the
computed coverage).

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

## 12. Decision state (correction pass)

The section distinguishes what this package can already support from what
still requires Blake or external evidence. **Nothing below is "approved
because agents, screenshots, audits or automated checks prefer it"** —
supportable means the package's own artifacts and executed checks back the
direction; every approval remains Blake's.

### 12.1 Already supportable from this package

- **Need-led Sleep Brief direction** — the A-derived candidate exists,
  renders against all four fixtures in both languages, and its contracts
  are executed (768/768).
- **Visible, concise testing guidance** — the "Try this" copy renders
  always-visible in the candidate; the disclosure alternative is retained
  only as exploration record.
- **Exact firmness and ordered-priority preservation** — enforced by the
  contract runner and the deep-frozen fixtures.
- **Accessible tabs as the preferred tier-navigation foundation** — the
  corrected tabs candidate; the accordion is rejected exploration on the
  concrete co-visibility shortfall.
- **Removal of the buyer-characterising Bronze copy** — executed in every
  package variant; already decided by the roadmap's ungated Proceeds list,
  not re-asked.
- **Product description separated from customer-fit reasons** — the
  labelled product-story layer vs the fit rows, in the candidate.
- **Personalized reasons fail closed by omission** — the authoring brief's
  governing rule; no fallback to `reason_default`, English, labels or
  another feature.
- **Payment Choice stays secondary and isolated** — one stale-closed
  module, after all fit content, zero financing on the Sleep Brief.

### 12.2 Still requiring Blake or external evidence

1. **Final visual approval of both candidates — after the assisted-sales
   dry run.** The packet is frozen and empty
   (`docs/phase1-assisted-sales-evaluation-packet.md`); Blake runs it with
   one operator and one customer-role observer on one device. This is the
   exact next step.
2. **Final badge vocabulary and copy** — including the two proposed badge
   category labels, the solo-ES register deviation, and every
   `data-proposed-copy` string (note: "See My Matches →" is proposed, not
   existing terminology — production's primary is the mislabeled
   "Compare My Matches →").
3. **Native Spanish approval** — all proposed ES strings and the financing
   config's `pending-native-legal-review` status.
4. **Catalog owner and approval workflow** — name the Lacks merchandising
   owner (one necessary owner decision among the brief's ten activation
   prerequisites — not the single blocker); approve the corrected brief's
   record schema and Lane A first batch; route the **preliminary
   claim-risk inventory** (brief appendix: 83 flagged rows covering
   ~109 of 182 pairs, 24 Tier-D/E
   strings rendering in production today — the four earlier flags were
   initial examples, not the set) to that owner and legal for
   disposition; decide the `MATT_ES_KEYS` change and the brief's seven
   merchandising questions.
5. **Device matrix** — no prototype viewport is a hardware claim.
6. **Phase 0.4 closure** — remains ⏳; mounted-device evidence is not in
   this package.
7. **Phase 1 implementation authorization** — requires Phase 0 closure AND
   Blake's explicit go; nothing here starts it.
8. **Any Phase 3 scoring/schema change** — including the
   `pressureRelief`/`motionIsolation` casing defect (a live scoring bug,
   report-only here), Lane B reason columns, and the roadmap's
   scoring-fixture exit gate (build / investigate / defer / reject — the
   capture/parity mechanism here is the working cost model; the standing
   cost is the recurring re-green review burden).
9. **Production activation of customer-specific mattress reasons** — gated
   on the brief's full ten activation prerequisites, all unmet today.

**Scope of a "direction" approval — defined by property, not by
screenshot (correction pass).** A direction approval approves the named
structural properties below; everything not named remains open and
returns at implementation review. (The earlier "composition as
screenshotted" phrasing contradicted the reopened per-variant questions;
it is withdrawn.)

*A Sleep Brief direction approval covers:* the need-led hero
(`priorityRows[0]` by index); visible badge category labels; the exact
firmness word + integer presentation; the exact engine-ordered 1–3
priorities; always-visible testing guidance; the sleep-fit-first action
hierarchy (primary see-matches, secondary edit-answers); no first-visit
Compare; and the shared-view landscape structure. *It does NOT
automatically approve:* final CTA wording ("See My Matches →" is
proposed copy); badge vocabulary; any Spanish wording; exact type scale;
any hardware breakpoint; sticky-vs-in-flow action-bar behavior;
production focus implementation; or analytics changes.

*A Results direction approval covers:* persistent accessible tier tabs;
exact tier membership and within-tier order as engine-produced;
the lead/support visual hierarchy; visible Details, Save and page-local
Compare selection; score/match-percentage suppression; and Payment
Choice secondary and isolated. *It does NOT automatically approve:*
`topPickReason` or `reason_default` as a product-description source (no
catalog field is approved for that surface); any final catalog copy;
activating the dormant direct production Results Compare path; any
saved/finalist-state change; any scoring or tier change; the final
compare surface shape (inline panel vs dialog at implementation);
production analytics changes; or hardware breakpoints.

Secondary flags surfaced by research (each needs only an acknowledge/defer):
the tu-vs-usted register decision for ES copy; the handoff-screen voice
divergence (EN customer-voiced vs ES salesperson-voiced); the audit-found
CSS/dict/wipe defects in §1 (cleanup proposals, not part of this package's
scope).

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
| W2 claim-safety | ✅ report | FTC 2022 guidance, Moonlight Slumber | ✅ | A–E tiers; 3 catalog flags, lead-verified (W4 added the 4th, b5) |
| W2 content-governance | ✅ report | financing gate, GOV.UK lifecycle | ✅ | parity release gate; curated V1; named-owner dependency |
| W2 consultation-handoff | ✅ report | peak-end, Gong, ISPA | ✅ | division-of-labor rule; conclusion restraint |
| W3 fixture/provenance | ✅ (lead-executed) | parity 21/21 at delivery; 30/30 at final freeze (fix-pass fixture extension) | ✅ | agents unavailable in session-limit window; Wave 4/5 verified independently |
| W3 catalog-authoring package | ✅ (lead-executed) | programmatic 26-row inventory | ✅ | same replacement reason; verified against both catalog audits |
| W3 sleep-brief-a builder | ✅ variant + notes | need-led hero, disclosure, 5 badges | ✅ | composition delivered; 6 adversarial findings fixed in integration |
| W3 sleep-brief-b builder | ✅ variant + notes | fixed heading, visible detail | ✅ | composition delivered; pair-rule and ES-label findings fixed |
| W3 results-tabs builder | ✅ variant + notes (credit error killed only its return) | restyled tabs, compare revival | ✅ partially | demo block + promoted catalog surfaces removed in integration |
| W3 results-grouped builder | ✅ variant + notes | single-open accordion, APG semantics | ✅ partially | landscape photo capped; equal-anatomy claim corrected |
| W4 scoring-isolation adversary | ✅ report | fabricated-record demo block | ✅ | drove the demo-block removal + capture-pair execution |
| W4 tier-honesty adversary | ✅ report | anatomy claim vs render; tier-anchor gaps | ✅ | sticky tabs, notes corrections; ladder tradeoff recorded |
| W4 accessibility adversary | ✅ report | dead backdrop, Escape scope, tray focus | ✅ | all confirmed dialog/focus findings fixed |
| W4 bilingual adversary | ✅ report | chip EN leakage, Compañía, Duermo Solo | ✅ | chips removed; labels aligned; production-copy flags recorded |
| W4 shared-viewing adversary | ✅ report | sticky-bar occlusion blocker; word counts | ✅ | blocker fixed; density kept as recorded tradeoff |
| W4 catalog-claims adversary | ✅ report | b5 Tier-D string; 17/26 coverage | ✅ | b5 flagged; coverage computed into PROVENANCE |
| W4 compare-flow adversary | ✅ report | two-identical-columns panel; upstream no-op | ✅ | panel discriminates; disclosure added |
| W4 financing-isolation adversary | ✅ report | staleNotice 7th string; inverted hierarchy | ✅ | module returned to six production strings; button de-emphasized |
| W4 responsive adversary | ✅ report | ES 320 overlap; 200 % clipping; px-only type | ✅ | all confirmed reflow findings fixed; harness nit documented |
| W4 test-vacuity adversary | ✅ report | parity never tests prototypes; capture floor | ✅ | floors + PROVENANCE gate added; §8 rewritten honestly |
| W4 fix-builders (2, lead-directed) | ✅ | disjoint file sets | ✅ | applied the lead-triaged fix list; every change logged in VARIANT-NOTES |
| W5 evidence referee | ✅ report | re-ran parity + 2 suites; 16 verbatim pairs; 12 render claims | ✅ | pass-with-edits: 2 stale §2 bullets + precision fixes, all applied |
| W5 scope-and-gate referee | ✅ report | full diff classification vs allowed scope; gate-language sweep | ✅ | pass-with-edits: stale screenshot-provenance sentence + ledger fill, applied |
| W5 decision-quality referee | ✅ report | §12 decidability per decision | ✅ | pass-with-edits: four-string count, §12.4 cost/counter-case, scope line, brief Q7, 2 supplementary captures — applied |

**Conflicts and their resolutions.** The one material research conflict — the roadmap's proposed disclosure of the testing detail vs the external evidence against hiding primary content — was left open through the A/B build and **resolved in the correction pass in favor of visible guidance** (the A-derived candidate adopts B's treatment; §5.1). Cross-variant disagreements found by adversaries (rendered-vs-documented proposed Bronze copy; two ES words for the tray's Clear; fit-row heading present in one variant) were resolved toward the documented-only / production-faithful option in the fix pass. Rejected adversarial findings and kept-as-tradeoff items are recorded with reasons in §8.

### Correction pass (2026-08-07) — external review, findings and dispositions

Codex reviewed head `ad94e4e` and required nine corrections; the lead ran
four bounded inspection agents (Sleep Brief contract; Results/Compare;
catalog governance; fixture/test-vacuity), implemented, and a final
skeptical referee reviewed the completed head. Substantive findings and
dispositions, compactly:

- **Built the A-derived Sleep Brief candidate** (§2.0); first-visit Compare
  removed (simulated saved products rejected); disclosure-vs-visible
  resolved visible. Inspection addition: production's primary CTA pair is
  the mislabeled "Compare My Matches →" — "See My Matches →" stays marked
  proposed (Codex had described it as approved terminology; it is not).
- **Adopted tabs, rejected the accordion** on the corrected co-visibility
  ground; stacked-layout reasoning softened from theorem to layout risk;
  Bronze descriptor removal executed everywhere (roadmap-decided).
  Inspection additions: production dormant-Compare and Consultation
  Summary line numbers recorded in §36–37 of the inspection report;
  Details/Save were a genuine gap (never built), now restored inert.
- **Compare repaired**: scroll+focus consequence, page-local terminology,
  full state coverage; the tray's EN statics un-marked as proposed
  (they are production-verbatim).
- **Catalog brief rewritten**: fail-closed omission (three
  fallback-to-default rules deleted), ten activation prerequisites,
  expanded record schema, Lane A/B. Inspection corrections folded in: the
  casing mechanism was stated backwards (catalog is camelCase; the build's
  lowercase breaks the features side; reason keys already correct); the
  break is a **live scoring defect** (report-only, Phase 3); the dead
  styled `.drawer-feature-bullets` surface and `mField()`'s
  English-fallback line are named as traps; `reason_default` cannot be
  blanked (schema-required), so omission is a rendering rule.
- **Evidence layer rebuilt**: row-bound hashes (one row per file),
  array-aware deep compare, extended floors, deep-frozen fixtures,
  documented fixture schema, the synthetic `boundary-one` vector
  (unreachability independently confirmed by 151,200 samples), the
  contract runner (768/768), honest hashing/authored-input claims.
  Inspection additions: threshold/back-fill/empty-tier proven
  unexercisable by 77,000 samples; a reachable 3/2/2 tier shape exists but
  was not added (a fifth authored vector wasn't worth the provenance
  cost — recorded as an option).
- **Screenshots**: lean matched matrix for the candidates (§4), stateful
  cells reproducible by URL; superseded tabs captures replaced;
  exploration captures retained as history.
- **Research claims**: source appendix added
  (`docs/phase1-research-source-appendix.md`); the "50–80 %" figure
  withdrawn (§5.1).
- **Assisted-sales packet** frozen and empty
  (`docs/phase1-assisted-sales-evaluation-packet.md`) — the dry run is
  Blake's next step; nothing simulated it.
