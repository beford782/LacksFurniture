# Results — restyled tier tabs (variant `results-tabs`)

> **STATUS: RECOMMENDED CANDIDATE (correction pass, 2026-08-07).** Following
> the external (Codex) review, accessible tier tabs are the decision
> package's recommended Results navigation direction, and this variant —
> as corrected in the "External-review correction pass" section at the end
> of this file — is the candidate Blake evaluates. The grouped accordion
> (`results-grouped/`) is retained as rejected exploration. Sections §1–§10
> below are the original build record plus the first fix pass; where the
> correction pass changes or supersedes a claim, the correction section
> governs.

**PROTOTYPE ONLY — Phase 1 decision package. Not implementation, not approval;
nothing here changes production behavior.** Renders entirely from the frozen
fixtures (main = `78f949c`, see `../fixtures/PROVENANCE.md`) via the shared
harness. All `index.html:` line cites below are the production worktree file at
`78f949c`.

View: `http://localhost:8000/prototypes/phase1-decision-package/results-tabs/?scenario=dense-c&lang=en`

---

## 1. Composition rationale

The tab affordance **stays the navigation** — this variant is the strongest
restyle of what ships, fixing the known weaknesses *inside* the tab paradigm:

- **Unselected-tab contrast raised** (NN/g finding via w2-tier-navigation F3:
  faded unselected tabs read as decoration and Silver/Bronze go undiscovered).
  Unselected tabs are full-contrast ink on a visible bordered chip; the selected
  tab is a filled block with a reinforcing underline — selection is never
  conveyed by hue alone.
- **Overflow-proof tab row.** The shipped bar (fixed `gap:40px`,
  `letter-spacing:0.3em`, 13px labels) can exceed its container below ~480px and
  is invisibly clipped by `body{overflow-x:hidden}` (w1-responsive-layout §1.7).
  Here each tab is `flex:1` with `clamp()`ed type and letter-spacing and
  `white-space:nowrap`; at a 320px viewport each tab still gets ~96px and the
  longest label (BRONCE) fits with headroom. Labels are the verbatim pairs —
  GOLD/SILVER/BRONZE · ORO/PLATA/BRONCE — never wrapped, never truncated.
- **Real APG tab semantics.** The shipped tabs are buttons with a class-only
  active state and no ARIA (w1-accessibility-focus §1.1). This restyle adds
  `tablist`/`tab`/`tabpanel` roles, `aria-selected`, `aria-controls`, roving
  tabindex, and Arrow/Home/End keys with automatic activation. Targets ≥48px.
- **Trial-focus strip above the cards** — the captured `resultsTrialFocus`
  content, so the customer's own priorities anchor the conversation before any
  product copy (w2-assisted-sales F1/F7: verify → convince).
- **Equal-anatomy cards with provenance layering.** Lead and supporting cards
  share one component at one size; lead emphasis is size-neutral (accent border
  + eyebrow). Each card separates the **product-story layer** (authored,
  customer-agnostic: `topPickReason`, differentiators, authored badges) from the
  **customer-fit layer** (answer-aware template rows from
  `cardPriorities[lang][id]`), each visibly labelled — the current card blurs
  these two provenances (w1-mattress-card-content rec. 3).
- **Compare discoverability revived** — the dormant-but-real production pattern
  (CSS + delegated handler exist; trigger never rendered — w1-compare-path):
  card-level `aria-pressed` toggle, selection tray, action-area entry, and a
  simulated 2-up panel, capped at 2. All labelled prototype simulation.
- **Financing stays secondary** — the shipped `#resultsFinancing` reproduced in
  its stale-closed state, paper-card, dark-neutral buttons, after the fit
  content, inert.

Two-tier reading model (w2-tablet-shared-viewing): tab labels, model names and
the firmness value are sized as customer-glanceable anchors (~7:1-class
contrast); descriptions and tags stay operator-scale.

---

## 2. Deliberate deviations from current presentation

1. **Tab semantics upgraded to the full APG tabs pattern** (roles,
   `aria-selected`, roving tabindex, arrow keys). Production tabs are class-only
   `<button>`s with no ARIA (index.html:13856–13870).
2. **Tab bar restyled**: full-width equal-flex segmented buttons, raised
   unselected contrast, `clamp()` type/letter-spacing so ES labels never
   wrap/overflow at 320–480px (production overflow risk), ≥48px targets.
3. **Card firmness word omitted.** Cards show the 10-segment strip + the exact
   `N/10`; production cards show `N/10` + the `firmnessFeel()` word
   (index.html:14138–14141). Why: the fixture carries no per-model feel word
   (only the customer's own value's words), re-implementing the `firmnessFeel`
   bucket map would be prohibited recomputation, and the authored
   `firmnessLabel` is EN-only and never displayed in production (g4/g9 diverge
   from what customers see). Accessible phrasing used instead:
   "Firmness: N of 10" / "Firmeza: N de 10". Open question §9.1.
4. **Firmness graphic added**: 10 discrete segments with N filled (production
   cards have no graphic). Discrete-only per w2-firmness-viz F4 — never a
   continuous fill; graphic `aria-hidden`, real text adjacent.
5. **Equal-size card grid replaces the top-pick + supporting split.** The
   separator heading "More directions to compare" / "Más opciones para
   comparar" (index.html:14265–14267) is **dropped**: in an equal-size grid
   there is no supporting block for it to head. The lead/supporting distinction
   is carried by the threshold-honest eyebrow pairs instead. The pair is
   recorded here so the copy is not lost.
6. **Card priority rows are a real `<ol>` with visible ordinal markers.**
   Production renders div rows with a rank glyph (index.html:14099–14108) —
   order not programmatically conveyed. Supporting cards get the full rows +
   tags (production shows title-only chips, index.html:14177–14179) — required
   by equal anatomy.
7. **Provenance layering labels added** ("Product description" / "From your
   answers") — production interleaves authored product copy and answer-aware
   template rows with no provenance distinction.
8. **Authored display badges rendered** (`entry.tags` / `tags_es`) as inert
   product-fact chips. They render nowhere at `78f949c` (verbatim data,
   invisible today — w1-mattress-card-content §1.5). Display-only; wording
   untouched (the badges are invisibly load-bearing for drawer response
   labels/trial prompts — never reword them).
9. **Differentiators shown on results cards** (verbatim bilingual objects,
   under the verbatim drawer label "What makes this one different" / "Lo que
   hace diferente a este"). Production shows them only in the drawer and
   compare modal.
10. **Compare pattern activated and adjusted**: trigger rendered (production
    never renders `.compare-btn`); the 2-up view is an **inline
    `aria-expanded` disclosure panel**, not the production modal — the shipped
    compare modal is the documented dialog-lifecycle outlier (no role, no trap,
    no Escape) and a static prototype should not make it reachable as-is; cap-2
    is enforced by real `disabled` on unselected toggles (production's soft cap
    silently no-ops, index.html:18827); tray ES statics are proposed copy
    (production tray statics are EN-only, index.html:18980–18986).
11. **Financing module shows the `staleNotice` line in its body.** In
    production the staleNotice renders inside the (unopened) financing sheet
    cards; this prototype does not implement the sheet, so the stale-closed
    shipped state is made visible in the module itself. Both buttons present
    (`cta` + `resultsAsk` pairs) but inert, with a bilingual "simulated" note.
12. **Save / details buttons, drawer, offer cues and footer CTAs omitted**
    (out of this variant's scope — see §10). No promotions surface anywhere:
    the shipped config has no `promotions` block, so cues/badges render nothing
    today and are correctly absent here.

Flagged, not changed: the tier descriptor renders **as-shipped**, including
"Bronze · entry-level" / "Bronce · básico" (index.html:13877–13883). That pair
is buyer-characterising copy and is **a copy decision Blake must make
separately** — this prototype additionally shows a `data-proposed-copy`
alternative ("Bronze · everyday value" / "Bronce · valor cotidiano") beside the
shipped line when Bronze is active, purely as decision input.

---

## 3. Copy inventory

Every rendered string is exactly one of the three classes below.

### 3a. Fixture data (verbatim engine/render output — frozen)

| Content | Fixture path |
|---|---|
| Trial-focus strip (label + joined priorities) | `profile[lang].resultsTrialFocus` (captured HTML, inserted verbatim) |
| Tier membership + within-tier order | `results.tierData[gold\|silver\|bronze]` (order by index, never re-sorted) |
| Model name, brand, subBrand | tierData entry fields |
| Firmness integer | `entry.firmness` (exact; no rounding/rescale) |
| `topPickReason` | `entry.topPickReason` `{en,es}` |
| Differentiator titles/details | `entry.differentiators[].title/detail` `{en,es}` |
| Authored badges | `entry.tags` / `entry.tags_es` |
| Product photos | `entry.imageUrl`, prefixed `../../../` |
| Customer-fit rows (title, desc, tag, matched) | `results.cardPriorities[lang][id]`, first three by index |
| `meetsMatchThreshold` (drives eyebrow copy branch) | tierData entry field |
| Price-tier symbols | `results.priceTierSymbols` |

Never rendered: `score`, `pct`, `topPick.matchPct`, any rank number for
mattresses, any winner/highlight treatment.

### 3b. Verbatim production EN/ES pairs (source cited)

| EN | ES | Source |
|---|---|---|
| Your matches | Tus opciones | index.html:13814 |
| Your `<accent>`strongest matches`</accent>` are ready | Tus opciones `<accent>`más compatibles`</accent>` están listas | index.html:13815–13817 |
| Start with the first option, then compare how the others feel. Your comfort decides what stays. | Empieza con la primera opción y compara cómo se sienten las demás. Tu comodidad decide cuál permanece. | index.html:13818–13820 |
| GOLD / SILVER / BRONZE | ORO / PLATA / BRONCE | index.html:13857–13859 |
| Gold · premium materials | Oro · materiales premium | index.html:13877–13883 |
| Silver · mid-range value | Plata · gama media | index.html:13877–13883 |
| Bronze · entry-level | Bronce · básico | index.html:13877–13883 (flagged §2) |
| Best place to start | El mejor punto de partida | index.html:14131–14133 |
| Additional comparison option | Opción adicional para comparar | index.html:14083, 14159 |
| Matches your priorities | Coincide con tus prioridades | index.html:14158 |
| No strong matches in this tier. | No hay coincidencias fuertes en este nivel. | index.html:14254–14263 |
| Gold / Silver / Bronze | Oro / Plata / Bronce | index.html:19201–19203, 18880 |
| What makes this one different | Lo que hace diferente a este | index.html:19213–19215 |
| Compare Your Finalists | Compara Tus Finalistas | index.html:18901–18902 |
| Compare finalists | Comparar finalistas | index.html:9939, 16843 |
| Feel | Sensación | index.html:18892 |
| Tier | Nivel | index.html:18894 |
| *N* of 2 selected | *N* de 2 seleccionados | index.html:18850 |
| Clear (EN only) | — | index.html:18984 (production static is EN-only; ES side proposed, §3c) |
| Compare → (EN only) | — | index.html:18986 (same) |

Financing pairs, verbatim from `data/store-config.json` `financing.copy.*`
(ES flagged `esReviewStatus: "pending-native-legal-review"` in config):

| Key | EN | ES |
|---|---|---|
| `eyebrow` | LACKS PAYMENT CHOICE | OPCIONES DE PAGO LACKS |
| `headline` (sr-only module h2) | Better sleep. More ways to bring it home. | Duerme mejor. Más opciones para llevarlo a casa. |
| `resultsLead` | Your strongest mattress match may have more than one way to bring it home. | Tu mejor opción de colchón puede tener más de una forma de llegar a casa. |
| `staleNotice` | Current payment options are available from your Lacks specialist. | Tu especialista de Lacks tiene las opciones de pago actuales. |
| `fitFirst` | Your matches are based on sleep fit — never on payment method. | Tus opciones se basan en tu descanso — nunca en la forma de pago. |
| `cta` | Explore payment options | Explorar opciones de pago |
| `resultsAsk` | Plan the conversation | Planear la conversación |

### 3c. PROPOSED copy (every instance carries `data-proposed-copy=""`)

| EN | ES | Purpose / rationale |
|---|---|---|
| Matches by tier | Opciones por nivel | sr-only `h2` naming the tier section + labelling the tablist (real heading hierarchy; no production string names this region) |
| Product description | Descripción del producto | provenance label for the authored product-story layer — keeps customer-agnostic copy visibly generic |
| From your answers | Según tus respuestas | provenance label for the answer-aware customer-fit layer — truthful basis-of-order disclosure (rows derive from quiz answers) |
| Compare | Comparar | card-level compare toggle label — production renders no trigger, so no production label exists (accessible name appends the model name) |
| Limpiar / Comparar → | (ES sides for the EN-only production tray statics "Clear" / "Compare →") | production tray statics have no ES re-render path — flagged; adopting them in production needs a relocalise hook |
| Select 2 mattresses to compare | Selecciona 2 colchones para comparar | explanation on the disabled compare openers — a disabled control must explain, never silently no-op |
| PROTOTYPE SIMULATION — production selection logic unchanged | SIMULACIÓN DE PROTOTIPO — la lógica de selección de producción no cambia | required banner on the simulated 2-up panel |
| Simulated — buttons are inactive in this prototype. | Simulado — los botones están inactivos en este prototipo. | financing inert-interaction note |
| Proposed alternative: Bronze · everyday value | Alternativa propuesta: Bronce · valor cotidiano | optional alternative bronze descriptor for Blake's separate copy decision (shipped pair still renders verbatim) |
| In production today, Compare opens from the Consultation Summary's "Compare finalists" button. | En producción hoy, Comparar se abre desde el botón "Comparar finalistas" del Resumen de Consulta. | on-page footnote naming the currently-working production compare path |
| Non-exercisable states (demonstration) · Not reachable from the frozen fixtures… · Below-threshold copy state · Empty tier | Estados no alcanzables (demostración) · No alcanzable desde los datos congelados… · Estado de texto bajo el umbral · Nivel vacío | demonstration-section chrome |
| Firmness: *N* of 10 | Firmeza: *N* de 10 | sr-only accessible firmness phrasing (ground-rules template with the feel word omitted per deviation §2.3) |

No medical/diagnostic/buyer-characterising words; the ES banned list (aliviar,
terapeutico, ortopedico, corregir, tratar) does not appear in any proposed
string.

---

## 4. Answer → badge mapping table

**None.** This variant renders no answer-derived badges. The only
answer-derived content is the trial-focus strip and the customer-fit rows, both
consumed verbatim from the fixture. (Health-adjacent answers — pain, snoring,
reflux — therefore cannot become badges here, by construction.)

---

## 5. Simulated behaviors (each labelled in the UI or in code comments)

| Behavior | Status |
|---|---|
| Tier tab switching | **Real prototype behavior** — client-side re-render against fixture `tierData` (all three tiers captured). NOT simulated. But: production `tier_view` analytics belongs to the production switcher; this prototype implements **no analytics** (see §6). |
| Card compare toggle / tray / cap 2 | **Prototype simulation** of the dormant production pattern (`.compare-btn` CSS + delegated handler exist at 78f949c; trigger never rendered). Selection state is page-local; production selection logic (`toggleCompare`/`_compareSelected`) is untouched. |
| 2-up compare panel | **Prototype simulation**, bilingually bannered "PROTOTYPE SIMULATION — production selection logic unchanged". Inline disclosure, not the production modal (deviation §2.10). Shows name, brand·subBrand, tier name (verbatim pairs), price-tier symbol from fixture, firmness N/10. |
| `compareDemo` fixture (`savedOrder`/`autoPair`) | **Not consumed.** The tray starts empty by design; the fixture's auto-pair documents the production hf2 rule (favourite-first, then save order, first two) for the decision doc. |
| Financing buttons | **Inert** (real `disabled` + bilingual simulated note). No sheet, no links, no rates anywhere. |
| Empty-tier state | **Real code path** (`renderTierCards` with an empty list) — not reachable from the frozen fixtures (shipped catalog fills all tiers); demonstrated in the labelled section. |
| Below-threshold copy state | **Real code branch** driven by `meetsMatchThreshold` — all frozen fixture entries are `true`, so the false branch is demonstrated via a labelled flag-flipped copy of the active gold lead in the demonstration section only. |
| Language / scenario switching | Harness-owned full page reload (matches the render-time-resolution production rule). |

---

## 6. Analytics consequence

**Tabs are retained, so `tier_view` semantics are unchanged and nothing needs
to be retired.** Explicitly: the single production call site
(`_setActiveResultsTier`, index.html:14278), the `EVENT_FIELDS` entry, the
`tierViews` counters, and the `#tierTabs` test pins all remain valid under this
variant — no event retirement, no replacement event, no semantics change. This
prototype itself implements **zero** analytics (no events, no counters, no
impression logging — including the financing module impression, which in
production is visibility-guarded at index.html:10989–10992).

---

## 7. Accessibility inventory

- **Headings/landmarks**: one `h1` (results headline); `h2` per section
  (tiers sr-only, compare sr-only = verbatim modal title, financing sr-only =
  verbatim config headline — matching production's sr-only fin heading pattern,
  demonstrations visible); `h3` per mattress name (cards and compare columns);
  `main` + `section[aria-labelledby]` landmarks. DOM order = visual order
  (the sticky tray is last in DOM and visually pinned last).
- **APG tabs**: `tablist` labelled by the section heading; `tab` buttons with
  `aria-selected`, `aria-controls`, roving tabindex; ArrowLeft/Right/Home/End
  with automatic activation; single `tabpanel` relabelled per active tab.
- **Toggles vs disclosures, never both on one control**: card compare toggles
  are `aria-pressed` buttons (accessible name includes the model name); the
  compare openers (action-area entry + tray Go) are disclosures with
  `aria-expanded` + `aria-controls`; cap-2 uses the real `disabled` attribute
  (never opacity-only, never a silent no-op).
- **Ranked semantics**: customer-fit rows are a real `<ol>` (position is the
  honest ordinal claim); the card collection is a `<ul role="list">` — no rank
  numbers for mattresses anywhere.
- **Firmness**: 10 discrete segments, N filled, `aria-hidden`; visible `N/10`
  `aria-hidden`; adjacent sr-only "Firmness: N of 10" / "Firmeza: N de 10".
  No `<meter>`/`role=meter` (VoiceOver/iOS unreliable). Filled vs unfilled
  differ by luminance + border, not hue alone.
- **No live regions** — static prototype; state changes announce through
  `aria-pressed`/`aria-expanded`/`aria-selected` semantics only.
- **Focus**: dual-ring `:focus-visible` tokens on every control with a
  `forced-colors` fallback; no `outline:none` anywhere; clearing the tray moves
  focus to the active tab (never dropped on BODY).
- **Touch**: all controls ≥44px (tabs/buttons 48px), `touch-action:
  manipulation`, no hover-only information.
- **Images**: product photos only (fixture `imageUrl`), `alt` = model name;
  decorative rules/graphics `aria-hidden`. No icon vocabulary introduced.
- **Contrast**: customer-glanceable anchors ~12–14:1; operator detail ≥6.5:1;
  tag chips ≥7:1 on their chip grounds; unselected tabs full-contrast ink
  (the NN/g fix).
- **Reflow**: single-column at narrow widths; body never scrolls horizontally
  (`min-width:0` guards on all grid children); `prefers-reduced-motion`
  respected; sticky tray pads `env(safe-area-inset-bottom)`.

## 8. Layout notes

Breakpoints are **content-driven samples, never device claims** (device matrix
unconfirmed, Phase 0.4 pending). The card and compare grids use
`auto-fit/minmax` so columns derive from available space, not width brackets;
the only media query (≤560px tray wrap) is labelled content-driven in the CSS.
Page column echoes the production per-surface max-width (1080px) with `clamp()`
padding instead of production's fixed 48px (the tab-row clipping contributor).
The tray's negative margins are derived from the same `clamp()` as the page
padding — avoiding the production seam trap (w1-responsive-layout §4.9).
Checked mentally at 320 / 480 / 768×1024 portrait / 1024×768 landscape / 1180+,
both languages (ES strings are longer; all labels wrap except tab labels, which
clamp instead — verified BRONCE fits at 320px).

---

## 9. Open questions (for the decision doc / Blake)

1. **Per-model firmness word**: should the fixture (and any future contract)
   carry each model's `firmnessFeel` word so cards can pair word + number
   without recomputing buckets — or should the authored `firmnessLabel` become
   the displayed word (a content decision: g4 "Soft" vs displayed "Plush", g9
   "Cushion Firm" vs "Firm", and it is EN-only today)?
2. **Bronze descriptor copy** ("entry-level" / "básico") — buyer-characterising;
   keep, adopt the proposed alternative, or something else? Separate decision.
3. **Compare surface shape in production**: inline disclosure panel (as here)
   vs upgrading the existing modal to the drawer-grade dialog lifecycle?
4. **Cap-2 behavior**: adopt real `disabled` + explanation (as here) over the
   production silent soft-cap?
5. **Equal-size grid**: is size-neutral lead emphasis (eyebrow + accent border)
   strong enough for the within-tier "start here" claim, and where does the
   dropped "More directions to compare" pair live if the split layout retires?
6. **Tray ES statics**: adopt the proposed pairs (needs a relocalise hook wired
   into `switchLanguage` — new layers do not relocalise for free)?
7. **Authored badges**: should `tags`/`tags_es` actually ship on cards? They are
   authored-but-invisible today and invisibly load-bearing for drawer
   response labels/trial prompts — display is safe, rewording is not.

## 10. Explicitly NOT done

- **No production edits** of any kind; fixtures and shared harness untouched.
- **No analytics**: no `tier_view`, no impression events, no counters — and no
  proposal to change them (tabs retained ⇒ nothing to retire, §6).
- **No invented reasons**: no per-model customer-specific copy exists and none
  was synthesized; authored copy is labelled product description; template
  customer-fit rows are labelled as answer-derived and consumed verbatim.
- **No score/pct/rank/percentage/winner rendering**; no cross-tier ranking
  implication (tier order is the fixed TIERS order; tier-framed labels only).
- **No save/finalist flow, no drawer, no footer next-step CTAs, no email, no
  promotions surfaces, no Savings Pass** (disabled in shipped config), **no
  financing sheet**, no rates or payment math anywhere.
- **No re-bucketing / vocabulary unification** of the three firmness word maps
  (flagged upstream; a Blake-gated change).
- **No live regions, no modal lifecycle, no location.reload, no external or
  CDN assets.**
- **compareDemo fixture state not consumed** (documented in §5).

---

## Lead integration pass (post-adversarial-review fixes)

Applied by the Results fix-builder from the lead-triaged adversarial review.
The sections above are the original build record; where a fix changes or
falsifies a claim made above, the correction is recorded here (originals are
kept, per package rule — corrected by appending, never rewritten).

### Changes applied

- **T1 (MAJOR — fabricated record): demonstration section deleted.** The
  "Non-exercisable states (demonstration)" section deep-cloned the real gold
  lead with `meetsMatchThreshold` flipped to `false` — **synthesised engine
  output**, exactly the class this package forbids — and rendered empty-tier
  copy labelled for a tier that has matches. The section, its styles and its
  proposed strings (demoHeading / demoNote / demoThreshold / demoEmpty) are
  removed. The below-threshold and empty-tier copy pairs remain implemented
  in the card/panel code paths, exercised only by data;
  results-grouped's document-only approach is the package standard.
  *Corrects §5's "demonstrated in the labelled section" rows and §2/§3c
  demonstration-chrome references: there is no demonstration section.*
- **T2: displayBadges chips removed** from the card face. They created a
  customer-facing surface production doesn't have (badges render nowhere at
  78f949c) and promoted catalog strings that leaked EN text, a mistranslation
  and a price superlative past the copy audit. *Supersedes deviation §2.8;
  open question §9.7 (should badges ship?) remains a Blake decision but this
  prototype no longer pre-renders them.*
- **T3: differentiators removed from the card face; compare panel
  strengthened instead.** Authored drawer copy — including within-tier
  ranking and price claims — does not belong on the fit-primary card
  (*supersedes deviation §2.9*). The 2-up compare panel previously showed
  only Tier + Feel, so two same-tier same-feel finalists produced identical
  columns; it now adds the brand·subBrand line (already present) plus a
  "What makes this one different" row from `differentiators[0]` title +
  detail — the production compare modal's Difference row analog
  (index.html:18897).
- **T4: card photos now `alt=""`** — the model name is the adjacent `h3`;
  `alt` = name double-announced. *Corrects §7 "Images: `alt` = model name".*
- **T5: card fit-rows heading removed** ("From your answers" / "Según tus
  respuestas" deleted from render and from the proposed-copy set). FEATURE
  rows are **not** answer-derived, so the label was a false attribution;
  production renders these rows with no heading — the KEY NEED / FEATURE
  tags speak for themselves. *Corrects §2.7 and the §3c row for that pair
  (the "Product description" layer label stays).*
- **T6: tab row is `position: sticky`** with an opaque background and a
  z-index above the cards — tier identity and tier switching stay reachable
  at every scroll position of a long card list (content-driven, commented in
  CSS). The top offset is the measured harness review-bar height (prototype
  chrome only; production would be `top: 0`).
- **T7: tier activation restores list top.** On tab activation, if the top
  of the new tier's card grid sits above the sticky tab row, the window
  scrolls so it lands just under the row — switching tiers from deep scroll
  no longer lands mid-list. Compensating scroll for the content swap; no-op
  when the grid top is already in view.
- **T8: card firmness readout carries the visible feel word** from the
  regenerated fixture's `entry.firmnessFeelWord[lang]` (executed from the
  real production `firmnessFeel` per model at capture), next to the numeral,
  with the package accessible template "Firmness: {word}, {n} of 10" /
  "Firmeza: {word}, {n} de 10". No local word map exists (none did — the
  word was previously omitted). *Resolves deviation §2.3 and open question
  §9.1: the fixture now carries the per-model word, so no recomputation was
  needed. The §3c sr-phrasing row's "feel word omitted" note is obsolete.*
- **T9: "Compare Your Finalists" heading is now visible** (was sr-only;
  results-grouped shows it visibly — package consistency), and the compare
  panel's price-tier symbol is `aria-hidden` with the announced Tier value
  the pure tier name. *Corrects §7's "compare sr-only" heading inventory
  line.*
- **T10: tray can no longer hit-block card Compare buttons** — while the
  tray is visible the page reserves the tray's **measured** rendered height
  as extra bottom padding (re-measured on resize). Tray ES "Limpiar" is
  unified to **"Borrar"** (results-grouped's proposed pair) so the package
  proposes one ES pair for the production EN-only "Clear" static. *Corrects
  the §3c "Limpiar" row.*
- **T11: `.tier-descriptor-alt` no longer renders.** The proposed Bronze
  descriptor rendered live on the Bronze tab, stacking two commercial
  framings; it is now documented-only (here and §3c), like results-grouped.
  The shipped "Bronze · entry-level" / "Bronce · básico" pair still renders
  verbatim; the copy decision remains Blake's (§9.2).
- **T12 (financing):**
  (a) the module's primary button is now **outlined**, not solid-filled —
  production ranks it below the brand-filled footer CTAs this prototype
  omits, so a fill would have made it the only filled action on the screen;
  (b) the **second production fitFirst instance** is added after the module
  — the results footer hint line (production renders `FC('fitFirst')` into
  `#resultsFooterHint` when financing is on, index.html:13823-13834);
  (c) **staleNotice removed from the module** — production renders exactly
  six strings in `#resultsFinancing` and shows staleNotice only inside the
  sheet, so the stale-closed state has **no visible marker on this surface,
  matching production**. *Supersedes deviation §2.11 and removes the §3b
  staleNotice row from the rendered set.*
- **T13: `document.title` is localized per lang** (as both Sleep Briefs do).
- **T14 (200% text):** the tab row **can** overflow at 200% text size on
  narrow viewports — the CSS comment claiming it "can NEVER overflow" was
  false. The row now wraps (`flex-wrap`; tabs floor at label max-content
  width instead of clipping) and the comment is corrected. The headline
  gets `overflow-wrap: anywhere` so the long ES accent word cannot force
  horizontal overflow at narrow widths.

### Corrections to falsified claims (T15)

1. **Copy-policy scope (§3c closing assertion).** "No medical/diagnostic/
   buyer-characterising words … does not appear in any proposed string" was
   true only of the PROPOSED table — it silently exempted the catalog strings
   this variant *promoted* into new customer-facing surfaces (displayBadges
   chips and on-card differentiators), which carried an EN leak, a
   mistranslation and a price superlative. With T2/T3 those surfaces are
   removed, so the assertion now matches the rendered page; its scope is:
   proposed strings audited, and no promoted catalog surfaces exist on the
   card face anymore.
2. **"Row can NEVER overflow" (§1 bullet 2, §8, and the former CSS
   comment).** False at 200% browser text size on narrow viewports: rem-based
   type doubles while the viewport doesn't, and nowrap labels clipped. The
   row now wraps instead (T14); "verified BRONCE fits at 320px" holds only at
   100% text size.
3. **§5's demonstration-section rows** described flag-flipped fixture data as
   a demonstration device; that was synthesised engine output and is deleted
   (T1). The below-threshold and empty-tier states are now *documented-only*
   here: both remain real code branches (`meetsMatchThreshold` false ⇒
   "Additional comparison option" eyebrow; empty tier array ⇒ verbatim
   empty-tier line), unreachable from the frozen fixtures.

### Proposed-copy table delta

| Change | EN | ES | Note |
|---|---|---|---|
| Updated | Firmness: {word}, {n} of 10 | Firmeza: {word}, {n} de 10 | sr-only firmness template now carries the fixture feel word (T8); replaces the word-omitted variant in §3c |
| Updated | Clear → **Borrar** (ES half) | | was "Limpiar"; unified with results-grouped (T10) |
| Removed | From your answers | Según tus respuestas | false attribution on non-answer-derived FEATURE rows (T5) |
| Removed | Non-exercisable states chrome (4 strings) | | demonstration section deleted (T1) |
| Removed from render | Proposed alternative: Bronze · everyday value | Alternativa propuesta: Bronce · valor cotidiano | documented-only now (T11); pair retained in §3c as decision input |

No new proposed pairs were introduced by this pass (the localized
`document.title` strings are review chrome, not product copy, and cannot
carry `data-proposed-copy`).

---

## External-review correction pass (2026-08-07)

Applied by the lead from the Codex review of head `ad94e4e`. Same
convention: originals above are kept; where a claim is changed or
superseded, this section governs.

### C1 — Tier descriptor subtitles no longer render (supersedes §2 flag, §3b rows, §9.2)

The descriptor line ("Gold · premium materials" / "Silver · mid-range
value" / "Bronze · entry-level" and the ES pairs) is removed from the
render entirely. The roadmap **already decided** that buyer-characterising
tier language must be removed — presenting "entry-level"/"básico" as a
pending Blake copy decision was wrong; the removal is executed here, not
re-asked. No replacement subtitle renders: any future subtitle must state
neutral product/presentation facts and needs explicit approval first.
Production's descriptor line is unchanged and remains flagged in the
decision document. Superseded by this item: the §2 closing flag paragraph,
§3b's three descriptor rows, §3c's "Proposed alternative: Bronze ·
everyday value" row (and the T11/proposed-copy-delta references to it —
both candidate replacement pairs, tabs' "everyday value" and grouped's
"essential value", are retired in favor of no subtitle), and §9.2. The
roadmap's own record: docs/rebuild-roadmap.md:750-751 places "Avoid labels
such as 'entry-level' that characterise the buyer rather than the
product" under its ungated **Proceeds** heading.

### C2 — Page-local Compare terminology (supersedes §3b "Compare (Your) Finalists" rows)

The compare section heading and its opener now read **"Compare selected
mattresses" / "Comparar colchones seleccionados"** (PROPOSED pair). The
production "finalists" vocabulary is deliberately not used on this page:
what is selected here is page-local Results selection state, never
persisted saved/finalist state, and calling it "finalists" misstated the
state. "Saved finalists" remains reserved for the Consultation Summary's
working production entry (its footnote on this page now also names the
two-saved-products requirement). The dormant direct production Results
Compare path stays dormant — nothing here activates it.

### C3 — Opening Compare has a visible and focus consequence

Activating either compare opener now scrolls the stable section heading to
the top of the viewport and moves focus to it (`tabindex="-1"` heading;
`scroll-margin-top` clears sticky chrome). Previously the panel could
un-hide below the operator's scroll position with no navigation or focus
movement — a tap that appeared inert. Deselection-driven auto-close leaves
focus on the control the operator just pressed.

### C4 — Details and Save actions restored (supersedes §2.12's omission)

Every card now carries the production-verbatim Details and Save actions
("View match details →" / "Ver detalles →", index.html:14123–14125;
"Save for later" / "Guardar", index.html:13694–13697) so card density and
action hierarchy are credible. They are **inert prototype controls**,
identified as such three ways: `aria-describedby` → the visible card sim
note ("Prototype: the Details and Save actions on the cards are simulated
— no live app behind this screen."), a visible pulse on tap (a tap must
not appear dead), and this record. No save-state is simulated — Save never
toggles to "Saved ✓", because simulated saved products were exactly what
the external review rejected.

### C5 — Card hierarchy: one lead + two compact supports (supersedes §1 "equal-anatomy", §2.5, §2.6)

The equal-anatomy grid is replaced: the within-tier lead card renders full
width with full anatomy (photo beside body from ~700px, labelled product
description, full fit rows at salesperson-readable type), and the two
supporting entries render as compact comparison cards (shallower photo,
fit-row **titles + tags only** — descs live behind Details, as in
production's drawer; no product-story paragraph). The compact rendering is
a presentation subset **by index** — nothing is re-ordered, re-selected or
recomputed. This mirrors production's own top-pick-vs-supporting split and
carries no cross-tier implication (one tier visible at a time). Fit-row
title type is raised to talking-point size. The dossier-density tradeoff
recorded in the decision document §7 is directly addressed by this change.

### C6 — Copy-provenance classes separated; proposed marking made visible + audible

`data-proposed-copy` now marks **only** proposed product copy, and every
marked node carries a visible dotted underline (CSS on the attribute) plus
an sr-only "(proposed copy — not production)" suffix; a page-foot legend
explains the underline. Prototype apparatus (sim banners, the financing
inert note, the card sim note, the production-constraint footnote, the
legend) is reclassified `data-prototype-chrome` — the earlier pass
conflated the two classes. The EN tray statics ("Clear", "Compare →") are
production-verbatim and are no longer proposed-marked in EN; only their ES
sides carry the marking. §3c's class definition is superseded accordingly.

### C7 — Fourth fixture scenario

The harness now also serves `boundary-one` — the disclosed SYNTHETIC
one-priority boundary state (see `../fixtures/PROVENANCE.md`). For this
Results variant it is a rendering-fidelity data point ONLY: its
`cardPriorities`/`metaStrip` were produced with `sleep_position`
undefined and are not representative of any reachable customer state.
The contract runner's render==fixture assertions remain valid against
it; no glanceability or content claim should cite it.

### Verification

These contracts are executed by
`fixtures/tools/contract_check.mjs` (all four scenarios × EN/ES): tier
membership/order, lead/support split, threshold-honest eyebrows, exact
per-card firmness, verbatim Details/Save with sim identification, tab
semantics and keyboard behavior, the full compare state machine
(0/1/2/ready/open/deselect/Clear, non-Gold selection), the focus+scroll
consequence, terminology ("finalists" only inside the chrome footnote),
no-percentage/no-descriptor leakage, Payment Choice singular and
stale-closed, and proposed-copy marking. See that script's header for what
it does NOT prove (no layout engine, no device, no AT).
