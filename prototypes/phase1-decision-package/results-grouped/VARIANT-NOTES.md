# Results — grouped (single-open accordion) · VARIANT-NOTES

**Variant:** `results-grouped` (builder D) · Phase 1 decision package · RESEARCH PROTOTYPE ONLY.
Renders frozen fixtures captured from main = `78f949c` (`../fixtures/`, see PROVENANCE.md).
Not implementation, not approval, changes nothing in production. All `index.html:N` cites
below refer to the production file at 78f949c (read-only worktree root).

Viewing: serve the repo root over HTTP and open
`prototypes/phase1-decision-package/results-grouped/?scenario=dense-c&lang=en`
(scenarios `dense-c` / `dense-a` / `sparse-b`; lang `en` / `es`).

---

## 1. Composition rationale

Wave 2 tier-navigation research (w2-tier-navigation) excluded stacked side-by-side tier
groups: rendering all three tiers in one scan path visually asserts a global 1–9 ranking
the engine never computes. The **preserving replacement demonstrated here is a single-open
accordion** (W3C APG accordion pattern):

- Three tier sections in the fixed production `TIERS` order (gold, silver, bronze —
  index.html:11717-11718). Headers are **permanently visible** — the customer has standing
  evidence that Silver and Bronze exist even when never opened (the passive trust signal
  tabs cannot provide), and the salesperson gets a visible three-beat agenda to narrate.
- **Exactly one section open at a time; Gold open by default** — the engine's own default
  (`_resultsState.activeTier: 'gold'`, index.html:14558). Tapping the open header is a
  no-op, mirroring the production same-tier early-return (index.html:14273).
- **Rank-adjacency hygiene (the design's honesty argument):** only one tier's products are
  ever visible, so the three tier leaders never sit side-by-side and no cross-tier
  "overall" ranking is implied — the accordion inherits tabs' isolation while fixing tabs'
  discoverability weakness. Nothing cross-tier is ever rendered: no overall pick, no
  cross-tier ordinals, no size hierarchy between tier leaders (equal card anatomy in all
  three panels).
- Headers use the cheapest **correct** ARIA of any tier-navigation pattern: a real
  `<button>` inside an `<h2>`, `aria-expanded` + `aria-controls`, Enter/Space for free,
  document tab order untouched. (Production tier tabs carry no tab semantics at all.)
- **No auto-scroll on expand** (NN/g documents the disorientation — especially harmful
  with a second person watching the shared screen).
- **Sticky headers, content-driven:** the open tier's header is `position: sticky` so tier
  identity persists while a panel scrolls. Justification is content, not hardware: a
  three-card panel spans several viewport heights at the narrow end of the rendering
  sample spread, and the header is the anchor the salesperson narrates from (NN/g
  mobile-accordion sticky-header guidance). The sticky offset equals the measured harness
  review-bar height — prototype chrome accommodation only; in production the offset would
  be 0. The device matrix is unconfirmed (Phase 0.4 pending); no layout claim here is a
  device claim.

Surface order: results chrome → trial-focus strip → accordion → compare section →
financing module (secondary, downstream of all fit content) → footer fit-first hint.

## 2. Engine-output fidelity

- Tier membership, within-tier order, cap and back-fill are the fixture's
  `results.tierData`, consumed verbatim: `list[0]` = tier lead, `list.slice(1, 3)` =
  supporting (production slice semantics, index.html:14264/14268). Never re-sorted,
  filtered, padded or re-bucketed.
- Card fit rows = `cardPriorities[lang][id]` first three rows **by index**, verbatim
  (title, desc, tag). dense-c's `b7` has exactly one row → one row renders; sparse-b and
  the dense-c tie order pass through untouched — no special-casing anywhere.
- Firmness = the exact fixture integer; 10 discrete segments with N filled (never a
  continuous fill); word label from the Results surface's own vocabulary (see §4).
- `meetsMatchThreshold` drives the threshold-honest copy pairs on every card (lead eyebrow
  and supporting match-line); back-filled items would show "Additional comparison option"
  even at position 0. (All fixture entries happen to be `meetsMatchThreshold: true`, so
  the degraded state is a real code branch not exercised by the frozen data.)
- **Never rendered:** `score`, `pct`, any match percentage, any rank number for
  mattresses, any winner/highlight treatment. The customer-fit rows carry ordinal markers
  1–3 (they are genuinely ordered; display position is the honest claim —
  w2-ranked-information); mattress cards carry none.
- Empty-tier state is a **real code path** rendering the verbatim pair (index.html:14259);
  it is not reachable from the frozen fixtures (the shipped catalog fills all tiers —
  fixture limitation noted in the Wave 1 synthesis).

## 3. Deliberate deviations from current presentation

1. **Accordion replaces the tier tab row + descriptor strip** — the variant's premise.
   All three verbatim tier labels and descriptor pairs are permanently visible (production
   shows only the active tier's descriptor).
2. **One card anatomy for lead and supporting cards** (production's top-pick card is
   larger and richer than its supporting cards). Lead vs supporting differs only by
   position and the threshold-honest eyebrow pair; equal anatomy across tiers removes any
   size-as-rank reading.
3. **Differentiators shown on cards** — production shows them only in the mattress drawer
   (index.html:19216-19221). Surfaced here because the drawer is out of scope and the
   authored product-story layer is part of the card content demonstration.
4. **Authored display badges rendered** as inert status-tag chips from fixture
   `tags` / `tags_es` — production never renders `displayBadges` anywhere (authored but
   invisible). Product-describing anchors only; deliberately styled unlike any tappable
   control (w2-signal-badges pattern family).
5. **Product-story vs customer-fit layers explicitly labelled** ("About this model" —
   proposed — vs the verbatim "Why it is here") — production blurs the provenance
   (authored `topPickReason` sits unlabelled above answer-aware rows; w1-mattress-card
   rec. 3).
6. **Firmness segment graphic added** — current production cards show text only ("N/10" +
   word). Ten discrete segments, aria-hidden, word + numeral kept visible, sr phrase per
   the brief (w2-firmness-viz F4: discrete, never continuous).
7. **Card fit rows are a real `<ol>`** — production renders div rows with a rank glyph
   (index.html:14099-14108); the ground rules require ordered-list semantics.
8. **Compare made reachable from Results** (card toggle + tray + action-area entry) —
   dormant in production (`.compare-btn` never rendered; tray unreachable). The 2-up panel
   is an **inline disclosure, not a modal**: the production compare modal is the
   accessibility outlier (no dialog role, no trap, no Escape — w1-compare-path §1.5), and
   a static prototype must not replicate it nor half-build a dialog. Panel omits the
   Response and "Your reaction" rows (their inputs — `mattressResponseLabel`,
   `_mattressReactions` — are not fixture data).
9. **Stock line uses the supporting-card pair ("In stock"/"Disponible", index.html:14160)
   on all cards** — the lead card's production string interpolates `storeName()`
   (index.html:14089), which the fixture does not carry.
10. **Financing sheet not built; module inert.** The two module buttons are disabled and
    the shipped stale-closed state is represented by the verbatim `staleNotice` line
    rendered inline (in production it renders inside the sheet's rate-bearing cards,
    index.html:10825-10837). Module placement is downstream of ALL fit content (production
    places it after recommendations, before the footer CTAs — this page has no footer
    CTAs, so the module and the fit-first footer hint come last).
11. **Save button and mattress drawer omitted** (production cards carry "Save for later"
    and open a drawer). Out of this variant's scope (tier navigation + compare
    discoverability); the saved-pick contract and drawer lifecycle are untouched
    production behavior a real implementation must preserve.
12. **Offer cue (`#resultsOfferCue`) omitted** — the promotions system is inert in the
    shipped config (no `promotions` block), so it renders nothing today; omission matches
    shipped behavior. Also omitted: card promotion tabs/badges (same reason).

## 4. Word-label choice for firmness (documented, not re-bucketed)

Cards show the exact fixture integer plus a word from `firmnessFeel` — the Results
surface's own vocabulary, copied **verbatim** from index.html:13676-13682
(≤3 Plush/Suave · ≤5 Medium/Medio · ≤7 Firm/Firme · else Extra Firm/Extra Firme).
This is vocabulary *reuse*, not a new or unified bucketing: production's three per-surface
word maps disagree at 4/6/8 (fixture `firmness.note`); that conflict is reported to Blake,
not resolved here. The authored catalog `firmnessLabel` was rejected as the word source:
it never displays in production and is EN-only (ES would leak English). For every model in
the three fixtures the authored label happens to agree with the `firmnessFeel` bucket, so
the two choices are visually identical on this data.

## 5. Copy inventory

### (a) Fixture data (frozen, rendered verbatim)
`results.tierData` entries (name, brand, subBrand, firmness, tags/tags_es, topPickReason,
differentiators, imageUrl, meetsMatchThreshold), `results.cardPriorities[lang][id]` rows
(title/desc/tag), `results.priceTierSymbols`, `profile[lang].resultsTrialFocus` (captured
production markup, injected as-is).

### (b) Verbatim production EN/ES pairs (source line cites)

| String (EN / ES) | Source |
|---|---|
| "Your matches" / "Tus opciones" | index.html:13814 |
| 'Your `<span class="accent">`strongest matches`</span>` are ready' / 'Tus opciones `<span class="accent">`más compatibles`</span>` están listas' | index.html:13815-13817 |
| "Start with the first option, then compare how the others feel. Your comfort decides what stays." / "Empieza con la primera opción y compara cómo se sienten las demás. Tu comodidad decide cuál permanece." | index.html:13818-13820 |
| GOLD/SILVER/BRONZE / ORO/PLATA/BRONCE | index.html:13857-13859 |
| "Gold · premium materials" · "Silver · mid-range value" · "Bronze · entry-level" / "Oro · materiales premium" · "Plata · gama media" · "Bronce · básico" (verbatim incl. `tier-name` span) | index.html:13877-13883 |
| "Best place to start" / "El mejor punto de partida" | index.html:14131-14133 |
| "Additional comparison option" / "Opción adicional para comparar" | index.html:14083, 14159 |
| "Matches your priorities" / "Coincide con tus prioridades" | index.html:14158 |
| "More directions to compare" / "Más opciones para comparar" | index.html:14265-14267 |
| "In stock" / "Disponible" | index.html:14160 |
| "No strong matches in this tier." / "No hay coincidencias fuertes en este nivel." | index.html:14259 |
| firmnessFeel word pairs + thresholds (Plush/Suave, Medium/Medio, Firm/Firme, Extra Firm/Extra Firme) | index.html:13676-13682 |
| Gold/Oro · Silver/Plata · Bronze/Bronce (tier-name map) | index.html:19201-19203 (same pairs 18880) |
| "Compare Your Finalists" / "Compara Tus Finalistas" | index.html:18901-18902 |
| "Feel" / "Sensación" · "Tier" / "Nivel" · "Why it is here" / "Por qué está aquí" · "Difference" / "Diferencia" | index.html:18892-18897 |
| "What makes this one different" / "Lo que hace diferente a este" | index.html:19213-19215 |
| "N of 2 selected" / "N de 2 seleccionados" (tray count) | index.html:18850 |
| "Compare →" · "Clear" (EN halves only — production tray statics are EN-only) | index.html:18986, 18984 |
| "LACKS PAYMENT CHOICE" / "OPCIONES DE PAGO LACKS" | store-config.json financing.copy.eyebrow |
| "Better sleep. More ways to bring it home." / "Duerme mejor. Más opciones para llevarlo a casa." | financing.copy.headline |
| "Your strongest mattress match may have more than one way to bring it home." / "Tu mejor opción de colchón puede tener más de una forma de llegar a casa." | financing.copy.resultsLead |
| "Your matches are based on sleep fit — never on payment method." / "Tus opciones se basan en tu descanso — nunca en la forma de pago." | financing.copy.fitFirst |
| "Explore payment options" / "Explorar opciones de pago" | financing.copy.cta |
| "Plan the conversation" / "Planear la conversación" | financing.copy.resultsAsk |
| "Current payment options are available from your Lacks specialist." / "Tu especialista de Lacks tiene las opciones de pago actuales." | financing.copy.staleNotice |

Note: financing ES copy carries `esReviewStatus: "pending-native-legal-review"` in the
shipped config — the ES strings above are config-faithful but not final-reviewed.

"Why it is here" / "Por qué está aquí" is reused as the customer-fit layer label: in
production that exact label captions `priorities[0]` in the compare modal (18895), and it
is honest for unmatched rows too (production shows FEATURE-tagged rows under it, e.g. b7).

### (c) PROPOSED copy (all marked `data-proposed-copy=""` on the element)

| EN | ES | Purpose / rationale |
|---|---|---|
| About this model | Sobre este modelo | Product-story layer label — separates authored, customer-agnostic copy from the answer-aware fit rows (w1-mattress-card rec. 3). Product-describing, no buyer characterisation. |
| Compare | Comparar | Card-level compare toggle label — the control exists only as unrendered CSS/handler in production, so it has no shipped label. |
| Clear → **Borrar** (ES half only) | | Tray clear button — EN verbatim static (18984); shipped tray statics are EN-only and the bilingual rule requires an ES pair before the tray is reachable (w1-compare-path §4.6). |
| Compare → → **Comparar →** (ES half only) | | Tray go / action-area entry — EN verbatim static (18986); ES proposed for the same reason. |
| Select 2 mattresses to compare. | Selecciona 2 colchones para comparar. | Visible disabled-state explanation for the compare entry — new entries must disable/explain, never silently no-op (w1-compare-path §4.5). |
| Prototype simulation — this panel stands in for the production compare view. The working production entry is the Consultation Summary's "Compare finalists" button; the card-level path shown here is dormant in production. | Simulación del prototipo — este panel representa la vista de comparación de producción. La entrada de producción que funciona es el botón "Comparar finalistas" del resumen de consulta; la ruta desde las tarjetas que se muestra aquí está inactiva en producción. | Labels the 2-up panel bilingually as a simulation and names the working production path. Review chrome, not product copy. |
| Firmness: {word}, {n} of 10 | Firmeza: {word}, {n} de 10 | Brief-mandated accessible firmness phrasing (sr-only; the graphic is aria-hidden). "N of 10" avoids "slash" readings; word-first fronts the meaningful token (w2-firmness-viz F3). |
| Bronze · essential value | Bronce · valor esencial | **Documented only — NOT rendered.** Alternative for the shipped "entry-level"/"básico" descriptor, which is buyer-characterising (w1-results-tier-contract T7). The prototype renders the shipped pair verbatim; the copy change is Blake's own decision and is not smuggled into this variant. |

### Answer → badge mapping table

**None.** This variant renders **no answer-derived badges**. The only chips on cards are
authored product `displayBadges` from the fixture (product-describing, never
answer-derived). Rationale: w2-signal-badges places answer-restating badges with the
*customer context*, never on mattress cards (a badge on a card visually asserts a
per-model claim the data cannot back), and health-adjacent answers (pain/snoring/reflux —
present in dense-a and dense-c) must never become badges at all. The customer context on
this surface is already carried by the captured trial-focus strip. Mapping table is
therefore empty by design.

## 6. Simulated behaviors (each prototype-only)

| Behavior | Status |
|---|---|
| Accordion open/close (single-open, gold default, same-tier no-op, no auto-scroll) | Simulation of the proposed replacement for `_setActiveResultsTier`. Emits nothing (see §9). |
| Card compare toggle (aria-pressed), cap 2, disable-at-cap | Simulation — dormant-but-real in production (`toggleCompare` unreachable, index.html:18946-18951). |
| Compare tray (fixed bottom, appears on first selection, verbatim count line) | Simulation — tray can never appear in shipped app (w1-compare-path §1.3). |
| 2-up compare panel as inline disclosure | Simulation standing in for the production modal; labelled on-screen. Consultation Summary's "Compare finalists" is the working production path (noted on-screen). |
| Empty-tier state | Real code path, verbatim copy; not reachable from frozen fixtures. |
| Financing module | Static rendering of the shipped stale-closed state; buttons inert; sheet not built. |
| Language/scenario switching | Owned by the shared harness (full reload; render-time language resolution from bilingual state). |

## 7. Accessibility inventory

- One `h1` (results headline); `h2` for each tier header (APG heading-wrapped buttons),
  the compare section, and the financing section (sr-only, mirroring production's
  `#resultsFinancingHeading`); `h3` card names. No skipped levels.
- Landmarks: one `main` (aria-labelledby the h1); tier panels are `role="region"` +
  `aria-labelledby` their header buttons; compare and financing are `section` +
  `aria-labelledby`.
- Accordion: real `<button>`s with `aria-expanded` + `aria-controls`; the open header
  carries `aria-disabled="true"` (APG single-open convention — focusable, no-op);
  chevron `aria-hidden` with the tier text carrying meaning; Enter/Space native;
  no arrow-key roving (APG optional, omitted deliberately).
- Compare: card toggles use `aria-pressed` only; panel triggers use
  `aria-expanded`/`aria-controls` only — never both patterns on one control. Disabled
  states use the real `disabled` attribute (never opacity/pointer-events alone).
- Ranked customer-fit rows: real `<ol>` per card; visible rank chip `aria-hidden` (the
  list conveys position). Supporting cards in a `<ul>` (within-tier order preserved by DOM
  order; no rank numbers for mattresses).
- Firmness: 10 discrete segments, container `aria-hidden`; visible word + "N/10" also
  aria-hidden; single sr utterance "Firmness: {word}, {n} of 10" / "Firmeza: {word},
  {n} de 10". No `<meter>`/`role="meter"` (VoiceOver iOS unreliable). Filled vs unfilled
  segments differ by luminance fill + border, never hue alone.
- No live regions anywhere (static prototype — nothing announces); announcement-is-focus
  is untouched production behavior.
- Visible focus: dual-ring `:focus-visible` tokens on every control (+ `forced-colors`
  fallback); no `outline: none` anywhere.
- Touch: every interactive control ≥44px (headers 60px, buttons 48px, tray 44px),
  `touch-action: manipulation`. No hover-only information.
- DOM order = visual order; body never scrolls horizontally (columns stack at the
  content-driven breakpoint); images `max-width: 100%`.
- Product photos: `alt=""` with the model name as the adjacent heading (production sets
  `alt` = name, which would double-announce next to the `h3` — deviation noted).
  Price-tier symbol "$$$" is `aria-hidden` (the Tier row carries the tier name) — avoids
  the drawer's "$$$-in-accessible-name" trap (w1-accessibility §5.15).

## 8. Layout

Content-driven only, commented at every rule; **no breakpoint is a hardware claim**
(device matrix unconfirmed, Phase 0.4 pending). Echoes the production system: 1080px
results surface max-width, clamp() display type, single-column accordion (orientation-
robust by nature), fixed bottom tray with `env(safe-area-inset-bottom)`. Supporting cards
and compare columns go two-up only when two readable columns fit (≥760px content box);
otherwise stacked. Reads at 320 / 480 / 768×1024 portrait / 1024×768 landscape / 1180+.
Spanish strings are the longer set; full-width accordion headers absorb ES label growth
with 30%+ headroom (a key accordion-over-tabs advantage — w2-tier-navigation F8).
`prefers-reduced-motion` disables the chevron transition (the only animation).

## 9. ANALYTICS CONSEQUENCE (document only — nothing implemented)

Adopting this layout removes the tab switcher, the **only** reachable path to the
`tier_view` event. Production would have to **intentionally retire/replace `tier_view`
atomically** (w1-analytics-contract §2 and §8.1); this prototype implements none of it:

- **Call site** `analytics.log('tier_view', …)` — index.html:14278 (sole site, inside
  `_setActiveResultsTier`; reachable only through the tab markup at 13863-13865).
- **Declaration** `EVENT_FIELDS.tier_view` — index.html:13602. Call site and declaration
  must go in the same change: removing only one fails the set-equality guard in whichever
  direction was forgotten (`DEAD ENTRIES` / `PAYLOAD DROPPED FOR`,
  tests/session_async_check.mjs:1088/1090).
- **Behavioral enum rows** tests/session_async_check.mjs:715-716 execute
  `A.log("tier_view", …)` — must be re-anchored (e.g. to `save_pick_toggle`, which
  carries the same tier enum rule) or the suite fails before the sweep does.
- **`tierViews` counters** — init index.html:13530, increment 14277, only reader
  `getSummary()` 13654 (itself caller-less), wipe 18735; seeded/asserted by
  tests/session_safety_check.mjs:999 and 1220-1222. Needs an explicit keep-or-retire
  decision; keeping it writer-less is exactly the documented drift pattern.
- **`#tierTabs` DOM pins** — the app's `SESSION_CONTENT_IDS` (index.html:18472) and the
  wipe suite's own non-self-derived `REQUIRED_CONTENT_IDS`
  (tests/session_safety_check.mjs:1036). Removing the element is a conscious two-list
  contract change, not cleanup. (`tierDescriptor` likewise if the strip goes.)
- **The CI guard is a static text sweep** — it stays green with an orphaned, unreachable
  switcher (proven by the three dead declared events inside `_legacyShowAccessories`;
  216/0 pass today). Only intentional retirement closes the blind spot.
- **The replacement interaction needs a NEW named, enum-validated event** (e.g. a
  `tier_section_toggle` name — naming is production's decision) — **never a reused
  `tier_view`**: today's event means "switched away from the previously active tier,
  first gold view never logged", and an accordion has a different semantic moment.
  Behavioral coverage is required: an extract-and-execute emission test asserting the new
  render/toggle function logs the event with an enum-valid payload (the coverage the
  current guard explicitly lacks — nothing today proves `tier_view` is ever emitted), plus
  a redaction row (with sentinel-rejection case) in the enum table. Beware the
  double-log trap: an impression logged from the render path re-fires on every language
  switch (w1-analytics-contract §5.8).

## 10. Explicitly NOT done

- No analytics implementation, no event emission, no `EVENT_FIELDS`/test edits (§9 is
  documentation for the decision package only).
- No production edits of any kind; fixtures and shared harness untouched; no git commands.
- No invented per-model reasons; no relabelling of authored/generic product copy as
  customer-specific (all 26 models' per-feature reason columns are empty; the authored
  layer is labelled as product story).
- No score/pct/rank rendering; no winner logic (the dormant winner/highlight CSS stays
  dark); no cross-tier "overall" anything.
- No firmness re-bucketing or map unification (verbatim `firmnessFeel` reuse only, §4).
- No save flow, no mattress drawer, no modal dialog construction, no financing sheet, no
  promotions surfaces, no email/handoff surfaces.
- No answer-derived badges (see §5 mapping table); no urgency/scarcity/social-proof
  devices; no new icon vocabulary (the chevron glyph is the app's existing text-glyph
  idiom, aria-hidden beside visible text).
- No multi-open accordion mode (w2-tier-navigation: multi-open degrades to the
  stacked-group adjacency problem on demand — a policy question flagged, not built).

## 11. Open questions (for Blake / the decision package)

1. Single-open vs an allowed second open panel for a customer-requested cross-tier look —
   policy question; single-open protects adjacency hygiene, multi-open reintroduces it on
   demand (w2-tier-navigation unresolved #2).
2. "Bronze · entry-level"/"Bronce · básico" descriptor copy — buyer-characterising; kept
   verbatim here; alternative pair documented in §5(c), decision is Blake's alone.
3. Should the collapsed headers carry an option count (e.g. "3 options")? Omitted here to
   keep headers minimal; could aid the salesperson agenda but adds proposed copy.
4. Compare entry semantics if this layout ships: keep the card-level pair path (activating
   dormant production code) or funnel everything through the Consultation Summary? The
   Sleep Brief CTA mislabel ("Compare My Matches →" → navigation only) still needs its
   own resolution (w1-compare-path §4.10) — out of this variant's scope.
5. Replacement analytics event name and payload for the accordion toggle (§9) — needs a
   recorded decision before any implementation.
6. Sticky-header need on the real mounted device — content-driven here; re-evaluate when
   Phase 0.4 closes the device matrix.
7. Financing ES copy is `pending-native-legal-review` — rendered config-faithfully; final
   wording is outside this sprint.
8. Whether the supporting-card "In stock" pair should replace the lead card's
   storeName-interpolated string in production too (one string instead of two) — a copy
   decision, not assumed here.

---

## Lead integration pass (post-adversarial-review fixes)

Applied by the Results fix-builder from the lead-triaged adversarial review.
The sections above are the original build record; where a fix changes or
falsifies a claim made above, the correction is recorded here (originals are
kept, per package rule — corrected by appending, never rewritten).

### Changes applied

- **G1 (MAJOR — landscape photo): card photo height capped** —
  `.rg-card-photo { max-height: clamp(160px, 28vh, 320px); }` with
  `object-fit: cover` (content-driven, commented in CSS). Uncapped, the wide
  lead card's 16:9 photo alone ran ~500-550px tall at 1024-1112px content
  widths, so a landscape first screen was all photograph with zero fit
  information. Fold check by geometry (harness bar ~86px + results chrome
  ~312px + panel padding 18px above the photo; body padding + eyebrow +
  brand ≈ 60px between photo and name; name ≈ 34px; firmness row ≈ 27px):
  at 1112×834 the photo is ~234px → name bottom ≈ 743px, firmness bottom
  ≈ 780px, above the 834px fold; at 1024×768 the photo is ~215px → name
  ≈ 725px, firmness ≈ 762px, above the 768px fold. The originally suggested
  36vh cap failed the 768px check under the same arithmetic (name ≈ 785px),
  which is why the cap is 28vh.
- **G2: displayBadges chips removed** from the card face — they created a
  customer-facing surface production doesn't have (displayBadges render
  nowhere at 78f949c) and leaked EN strings, a mistranslation and a price
  superlative into it. *Supersedes deviation §3.4; the §5(a) fixture list's
  `tags/tags_es` entry no longer has a render site.*
- **G3: differentiators removed from the card face** — authored drawer copy
  incl. within-tier ranking and price claims does not belong on the
  fit-primary card. The compare panel keeps its existing Difference row
  (differentiators[0] detail, verbatim label). *Supersedes deviation §3.3.*
- **G4: FEATURE fit-tags are now visually distinct (muted) from KEY NEED**,
  keyed on the fixture `matched` flag (`.is-matched` / `.is-feature`). One
  shared style previously made an unmatched product fact read at the same
  claim strength as a matched customer need.
- **G5: compensating scroll after a header toggle.** Opening a tier below a
  tall open panel collapses that panel and yanked the clicked header (and
  the new content) off-viewport, leaving the user mid-list. The clicked
  header now gets `scrollIntoView({block:'start'})` with
  `scroll-margin-top: var(--rg-sticky-top)`. This keeps the *pressed
  control* on screen after a layout collapse — it is not the expand-time
  auto-scroll-jump the §1 "No auto-scroll on expand" bullet (NN/g) warns
  about; that bullet is hereby narrowed to: no *decorative* scroll on
  expand; a collapse-compensating scroll is required for orientation.
- **G6 (tray):** (a) Clear now moves focus to the action-area compare entry
  before the tray hides — focus was stranded on a `display:none` button
  (results-tabs already guarded this). Implementation note: after Clear the
  entry is real-`disabled` (zero selections), so the compare section heading
  — same action area, `tabindex="-1"` — receives the focus in that state.
  (b) The bottom content reserve is now the tray's **measured** rendered
  height (CSS var set from `offsetHeight`, re-measured on resize), replacing
  the fixed 140px a wrapped tray could exceed and cover the financing
  fit-first hint. (c) The same measured reserve guarantees the tray never
  hit-blocks a card's Compare button (mirrors results-tabs T10).
- **G7: every card Compare button carries an sr-only model-name suffix**
  (" — {name}") — nine identical "Compare" accessible names were
  indistinguishable in an AT rotor.
- **G8: accordion header accessible name carries the tier once.** It read
  "GOLD Gold · premium materials" (display label + the descriptor's
  tier-name span). The descriptor's duplicate word is now `aria-hidden`
  (visible text unchanged, still the verbatim pair), so the name is
  "GOLD · premium materials" / "ORO · materiales premium".
- **G9: `list.slice(1, 3)` → `list.slice(1)`.** The engine already caps
  tiers; a presentation-side cap is exactly the forbidden class — it would
  silently drop an engine-qualified result if a capture ever carried more
  than three. On the frozen fixtures (max 3 per tier) the rendered output is
  identical. *Corrects §2's "list.slice(1, 3) = supporting (production
  slice semantics)" line: the production slice at 14268 caps a list the
  engine has already capped; reproducing the cap presentation-side was
  re-capping, not fidelity.*
- **G10: all font-size declarations converted px → rem** (÷16; px kept for
  borders/spacing; the body base is 1rem). This was the only variant that
  ignored the browser's default-font-size setting.
- **G11 (ES 320px overlap): fit-tag chips may wrap at narrow widths** —
  `white-space: nowrap` removed. The nowrap "NECESIDAD CLAVE" chip collapsed
  the `minmax(0,1fr)` title track at 320px and painted over it; the title
  track was already `minmax(0,1fr)`, so the chip wrap is the operative
  change — nothing paints over anything now.
- **G12 (financing):** (a) `.rg-fin-rule` repainted with a neutral token
  (`--rg-ink-soft`) — the Gold tier accent visually bound payment choice to
  the Gold tier; (b) the module now carries the same bilingual sim-note the
  variant's other simulated sections carry ("Simulated — buttons are
  inactive in this prototype." / "Simulado — los botones están inactivos en
  este prototipo.", `data-proposed-copy`) — the disabled financing buttons
  were the one unlabelled dead end; (c) **staleNotice removed from the
  module** — production renders exactly six strings in `#resultsFinancing`
  (index.html:10972-10980) and shows staleNotice only inside the sheet, so
  the stale-closed state has **no visible marker on this surface, matching
  production**. Both fitFirst instances (module + footer hint) remain.
  *Supersedes deviation §3.10's staleNotice sentence and removes the §5(b)
  staleNotice row from the rendered set.*
- **G13: `document.title` localized per lang** (as both Sleep Briefs do).
- **G14: `role="list"` added to every `<ol>`/`<ul>` styled
  `list-style: none`** — the ranked fit rows `<ol>`, the supports `<ul>`,
  and the tray slots `<ul>` (Safari/VoiceOver drops list semantics on
  `list-style:none`).
- **G15: compare-panel firmness no longer leaks "Plush 3/10" raw.** The
  visible "{word} {n}/10" (production value form, 18892) is `aria-hidden`
  with an adjacent sr-only "Firmness: {word}, {n} of 10" / "Firmeza: {word},
  {n} de 10" sentence. The feel word everywhere now comes from the
  regenerated fixture's `entry.firmnessFeelWord` (executed from the real
  production `firmnessFeel` per model at capture); **the local word map is
  deleted**. *Corrects §4: the vocabulary statement stands, but the words
  are now fixture data, not a copied local bucketing.*

### Corrections to falsified claims (G16)

1. **"One card anatomy / equal anatomy" (§1, §3.2) was false as rendered.**
   The lead card renders roughly 2× the linear size of a supporting card
   with a much larger photo — that is not equal anatomy. The true claim is:
   the lead card carries **production-mirroring top-pick emphasis**
   (production's top-pick card IS larger and richer than its supporting
   cards), the eyebrow stays threshold-honest, and G1 now caps the photo so
   the emphasis never costs the first screen its fit information. §3.2's
   "removes any size-as-rank reading" is withdrawn for *within-tier*
   position emphasis; the cross-tier claim (no size hierarchy between tier
   *leaders* — all three leads share one anatomy) still holds.
2. **Three permanently-visible descriptors render the shipped quality/price
   ladder copy family adjacently** ("premium materials" / "mid-range value"
   / "entry-level" all on screen at once) — production shows one descriptor
   at a time. This is an inherent property of the accordion premise
   (permanently visible headers are the discoverability argument), and it
   is a tradeoff for Blake to weigh alongside the "entry-level"/"básico"
   copy decision (§5(c) alternative pair, open question §11.2): the
   accordion makes that buyer-characterising pair *permanently* visible,
   not just visible on the Bronze tab.
3. **G9 documented** (see above): the presentation-side `slice(1, 3)` cap
   contradicted §2's own "never re-sorted, filtered, padded or re-bucketed"
   rule; removed.

### Proposed-copy table delta

| Change | EN | ES | Note |
|---|---|---|---|
| Added | Simulated — buttons are inactive in this prototype. | Simulado — los botones están inactivos en este prototipo. | financing inert-interaction note (G12b); same pair results-tabs uses, `data-proposed-copy` marked |

No other proposed pairs changed. The localized `document.title` strings are
review chrome, not product copy, and cannot carry `data-proposed-copy`.
