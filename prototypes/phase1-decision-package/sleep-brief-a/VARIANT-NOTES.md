# Sleep Brief — Alternative A (need-led hero) — VARIANT NOTES

**PROTOTYPE ONLY.** Research artifact for the Phase 1 decision package. Not
implementation, not approval; nothing here changes production behavior. Renders
frozen engine output captured from main = `78f949c` (see
`../fixtures/PROVENANCE.md`). The roadmap 1.1 proposal this variant makes
judgeable is **not yet approved** — the fixed Sleep Brief heading is a pinned
1.1 gate boundary and replacing it in production requires Blake's recorded
approval.

Files: `index.html` (skeleton + landmarks), `sba.css` (all styling),
`sba.js` (all rendering from the fixture via `DF.onReady`).

Verified: a recording-DOM smoke check executed `sba.js` against all three
scenarios × both languages (hero by index, badge order, exact firmness
integer/10 segments, priority order+count incl. sparse-b's 2 and dense-c's tie
order, disclosure semantics, journey verbatim, compare columns with tier NAME
and zero percentages, dialog lifecycle, ES-leak spot check) — all passed.

---

## 1. Composition rationale

The need-led bet: the customer's #1 priority — `profile[lang].priorityRows[0]`,
selected **by index only** (never by kind, never "most important-looking") —
becomes the dominant `h1`, its one-line reason the lede. The screen opens with
*why we are here* instead of a generic title, exploiting the
convince/translate/verify mechanics from w2-assisted-sales: the headline is a
customer-verifiable restatement of their own answers, sized for two-person
viewing at 0.5–1 m.

Below the hero, one glanceable signals band (inert badges + firmness strip)
replaces today's prose subtitle/summary/reflection/meta-strip cluster —
anchors, not prose (w2-assisted-sales F4: short noun-phrase anchors the
salesperson narrates around; duplicated prose competes with the narrator).
Then the full 1–3 priority list in engine order (the hero **duplicates** row 1;
the list never filters it out — engine order and count render verbatim), the
three-step journey rail, and an honest action row.

Spatial stability: hero top, signals band under it, priorities left/center,
journey rail right (stacked below ~920px), actions pinned bottom — stable
positions the salesperson can point at (deixis).

Sleep fit is visually dominant throughout; there is **zero financing content**
on this screen (matches production: the Sleep Brief carries none) and no
photography.

---

## 2. Deliberate deviations from current presentation (each is a
proposal-to-judge, not an approved change)

1. **Need-led hero**: `h1` = `priorityRows[0].title` (verbatim, by index);
   its `desc` is the lede. The production fixed heading pair "Your Sleep
   Brief" / "Tu Resumen de Sueño" (index.html:13170) is kept **verbatim as a
   small eyebrow** above the h1 for continuity — my call, documented; dropping
   it entirely is an open question for the 1.1 gate.
2. **Prose reduction**: `profileSubtitle` (persona line), `profileSummary`,
   `profileReflection`, `profilePrioritiesIntro` and `profilePlanLabel` are
   not rendered. Their factual content survives as signal badges and the
   hero; the narrator supplies the sentences (w2-assisted-sales F4).
   `profileReassurance` is kept verbatim (trust line, closes the priorities
   section).
3. **Signal badges**: the meta strip (`dl` Size/Feel/Temperature) is
   recomposed as up to five inert GOV.UK-status-tag-style badges in fixed
   invariant order — position, temperature, sharing, feel, size — adding two
   answer-derived badges (position, sharing) via the PROPOSED mapping table in
   §5. Unanswered/unmapped signals are omitted (no placeholders). Never
   health-adjacent (sleep_issues / health_conditions / partner_disturbance are
   never read by the badge code).
4. **Firmness visualization**: production Brief shows a word only; this
   variant renders a 10-discrete-segment strip (exact captured integer filled,
   never a continuous bar) + the word from the Brief's own captured vocabulary
   (metaStrip "Feel" value) + `n/10` numeral, paired always.
5. **"Try this:" behind an APG disclosure** (aria-expanded + aria-controls,
   verbatim trigger label pair, index.html:13484). **KNOWN EVIDENCE
   HEADWIND**: w2-progressive-disclosure concludes the test prompt is primary
   every-consultation content and recommends AGAINST hiding it (NN/g frequency
   criterion, GOV.UK "majority need" rule, Baymard overlook data). Alternative
   A implements the roadmap-proposed disclosure anyway so Blake can judge both
   directions against real screens — Alternative B keeps it visible.
6. **Ordinal markers + basis line**: priority rows get visible ordinal
   numerals (honest — the list is genuinely engine-ordered; display position
   is the claim, per w2-ranked-information) plus the PROPOSED basis-of-order
   line "In order, based on your answers" / "En orden, según tus respuestas".
7. **Journey rail semantics**: production renders the three steps as plain
   `div`s (index.html:13495-13497); this variant re-emits the verbatim step
   text as an `<ol>`. No `aria-current` — no step is current on the Brief
   (the journey has not started).
8. **CTA mislabel resolved**: production `#profileCta` "Compare My Matches →"
   is navigation-only (the known 1.6 mislabel). This variant relabels the
   primary CTA as honest navigation — PROPOSED "See My Matches →" / "Ver Mis
   Opciones →" — and adds a **separate, correctly-labelled Compare entry**
   using the verbatim working-entry pair "Compare finalists" / "Comparar
   finalistas" (index.html:16843), which opens the prototype-simulated 2-up
   panel. Production's Brief has no compare entry today.
9. **Compare panel lifecycle**: implements the drawer-grade dialog contract
   the production compare modal lacks (role=dialog, aria-modal, labelled
   title focus, Tab trap with title outside the cycle, Escape, exact inert
   bookkeeping, opener restore). Panel omits production's "Response" /
   "Your reaction" rows — `mattressResponseLabel` output and runtime reactions
   are not fixture data; fail-closed omission instead of synthesis.
10. **Kind pills legible + tag-preference styled**: production pill text is
    8px; resized to 11px-class for shared viewing. `tag-preference` has **NO
    production CSS rule** (base pill only — known gap, flag not fix): all
    three pill states (`tag-key`, `tag-high`, `tag-preference`) are styled in
    `sba.css`, with the third documented as prototype-authored.
11. **Sticky action bar**: actions sit in a sticky bottom bar with safe-area
    padding (echoes production's sticky-bar system; production Brief buttons
    are in-flow).
12. **Accessible firmness phrasing**: adds "Firmness: <word>, n of 10" /
    "Firmeza: <word>, n de 10" as the single screen-reader rendering (graphic
    + visible fragments aria-hidden). Production Brief has no accessible
    firmness treatment (it shows no number at all).

---

## 3. Copy inventory — complete

Every rendered string is exactly one of the three categories below.

### 3a. Fixture data (rendered verbatim, by index, for `ctx.lang`)

| Element | Fixture path |
|---|---|
| Hero h1 + lede | `profile[lang].priorityRows[0].title` / `.desc` |
| Badge values: temperature, feel, size (+ their sr category labels) | `profile[lang].metaStrip[2]/[1]/[0]` `.value` / `.label` |
| Firmness integer | `firmness.value` (exact; 10-segment fill count) |
| Firmness word | `profile[lang].metaStrip[1].value` (the Brief's own captured vocabulary) |
| Priorities heading | `profile[lang].dom.profilePrioritiesHeading.textContent` |
| Priority rows (title, desc, tag text, tagClass, test) | `profile[lang].priorityRows[i]` — engine order/count, 1–3, never padded or filtered |
| Reassurance line | `profile[lang].dom.profileReassurance.textContent` |
| Journey heading / steps / copy | `dom.profileJourneyHeading` / `dom.profileJourneySteps` (step text parsed from the captured markup, re-emitted as `<ol>`) / `dom.profileJourneyCopy` |
| Edit Answers label | `dom.profileSecondary.textContent` (identical to the verbatim pair below) |
| Compare columns: name, brand, subBrand, firmness integer | `results.tierData[tier][j]` for `compareDemo.autoPair` ids (tier from `compareDemo.savedOrder`) |
| Compare "Why it is here" row | `results.cardPriorities[lang][id][0]` — first row **by index**, format `title — desc` (production format, index.html:18883); omitted if uncaptured |
| Compare "Difference" row | `entry.differentiators[0].detail[lang]` |
| Price-tier glyph (aria-hidden) | `results.priceTierSymbols[tier]` |

### 3b. Verbatim production EN/ES pairs (source line cited)

| EN | ES | Source |
|---|---|---|
| Your Sleep Brief | Tu Resumen de Sueño | index.html:13170 (eyebrow) |
| Try this: | Pruébalo: | index.html:13484 (disclosure trigger; trailing space trimmed) |
| ← Edit my answers | ← Editar mis respuestas | index.html:13506 |
| Compare finalists | Comparar finalistas | index.html:16843 |
| Compare Your Finalists | Compara Tus Finalistas | index.html:18902 (dialog title) |
| Feel | Sensación | index.html:18892 (compare stat label) |
| Tier | Nivel | index.html:18894 |
| Why it is here | Por qué está aquí | index.html:18895 |
| Difference | Diferencia | index.html:18897 |
| Gold / Silver / Bronze | Oro / Plata / Bronce | index.html:18880 (tier-name map) |
| Plush / Medium / Firm / Extra Firm word map (≤3 / ≤5 / ≤7 / else) | Suave / Medio / Firme / Extra Firme | index.html:13676-13682 (`firmnessFeel`) — copied verbatim and applied to the fixture's captured per-mattress integer, exactly as the production compare modal does at 18878/18892; the map is the compare surface's own live vocabulary, not a new or unified bucketing |

### 3c. PROPOSED copy (every instance carries `data-proposed-copy=""`)

| EN | ES | Purpose / rationale |
|---|---|---|
| In order, based on your answers | En orden, según tus respuestas | Basis-of-order disclosure near the priorities (w2-ranked-information F6; spec-required) |
| See My Matches → | Ver Mis Opciones → | Honest navigation relabel of the mislabelled production CTA (keeps production's ES noun "Opciones") |
| Prototype simulation — sample saved finalists, not this customer's saves. | Simulación del prototipo — finalistas guardados de ejemplo, no los de este cliente. | Mandatory label on the simulated compare panel (A5: honest wording, shared verbatim with Alternative B; replaced the original "PROTOTYPE SIMULATION — production selection logic unchanged" pair) |
| Prototype: these actions are simulated — no live app behind this screen. | Prototipo: estas acciones son simuladas — no hay una aplicación real detrás de esta pantalla. | Caption labelling Edit/CTA as simulated (aria-describedby on both buttons) |
| Position | Posición | sr-only category prefix for the position badge (no captured label exists for it) |
| Bed sharing | Cama compartida | sr-only category prefix for the sharing badge (same reason) |
| Firmness: {word}, {n} of 10 | Firmeza: {word}, {n} de 10 | Accessible firmness sentence — phrasing mandated by the roadmap/a11y report; template listed here because it is not yet production copy |
| Close | Cerrar | Compare dialog close button (production's close is a bare × with no accessible name — the defect, not a source) |
| Fixture error — no priority rows captured. | Error de fixture — no hay filas de prioridades capturadas. | A10 guard: visible bilingual error when the fixture carries no priority rows (unreachable under the capture floor; prototype-harness copy, never customer-facing) |
| Position/sharing badge values | (see §5 table) | PROPOSED presentation mappings; the strings themselves are verbatim `data/quiz.json` option labels (config-owned, reviewed customer-facing bilingual copy) |

All PROPOSED ES strings should get native review before any production use
(`financing.esReviewStatus: "pending-native-legal-review"` is the precedent).

---

## 4. Signal-badge rules as built

- Fixed invariant order: **position → temperature → sharing → feel → size**.
- Inert: not buttons, not links, no pointer affordance; rectangular
  light-fill/dark-text tags deliberately distinct from the rounded buttons
  and the uppercase pill kind-tags (GOV.UK tag family, per w2-signal-badges).
- Omit, never placeholder: a missing/unmapped answer drops the badge
  (`no_idea` position deliberately unmapped — restating "Not Sure" as a badge
  invites the customer to ask why; omission rule from w2-signal-badges).
- **Never health-adjacent**: pain/snoring/reflux/disturbance answers are
  never read by the badge code path at all.
- Known production gap inherited *knowingly*: size values are the EN proper
  nouns ("Full", "King") in both languages — `data/quiz.json`'s own ES labels
  are those same proper nouns, so there is no visible ES defect; the
  production `sizeLabels` EN-only bypass (index.html:13197) is flagged here,
  not fixed.
- Badge values keep the verbatim Title Case of their sources (copy discipline
  outranks GOV.UK's sentence-case preference; re-casing would create new
  unreviewed strings).

## 5. Answer → badge mapping table (PROPOSED; for review)

Values are verbatim `data/quiz.json` option labels (config-owned, reviewed
bilingual customer copy). The *mapping into badge form* is the proposed part;
both badge `<li>`s carry `data-proposed-copy=""`.

| Signal | Stored answer (`meta.answers`) | EN badge | ES badge |
|---|---|---|---|
| position | `sleep_position: side` | Side Sleeper | De Lado |
| position | `sleep_position: back` | Back Sleeper | Boca Arriba |
| position | `sleep_position: stomach` | Stomach Sleeper | Boca Abajo |
| position | `sleep_position: combo` | Combination | Combinación |
| position | `sleep_position: no_idea` | *(omitted)* | *(omitted)* |
| sharing | `partner_sleep: solo` | Solo Sleeper | Duerme solo *(A9: third person, matching the captured temperature register "Duerme con calor"; was quiz.json's "Duermo Solo" — native review pending)* |
| sharing | `partner_sleep: partner` | With a Partner | Con Pareja |
| sharing | `partner_sleep: family` | Family Bed | Cama Familiar |

Temperature / feel / size badges take their values (and sr labels) verbatim
from the captured `metaStrip` pairs — no mapping involved.

---

## 6. Simulated behaviors (all prototype-only, none touch production logic)

| Control | Behavior | Label |
|---|---|---|
| ← Edit my answers | No navigation; flashes the visible "simulated" caption (`aria-describedby` points at it) | Caption P4, always visible |
| See My Matches → | Same simulated treatment | Caption P4 |
| Compare finalists | Opens the prototype 2-up compare panel fed by `compareDemo.autoPair` + `tierData` — pair and order are the fixture's shipped auto-pair rule output; the prototype selects nothing | "PROTOTYPE SIMULATION — production selection logic unchanged" banner inside the panel (bilingual, proposed) |
| Try this: disclosures | Real APG disclosure interaction over fixture content | — |
| Scenario/language switching | Harness review bar (full page reload; language resolves at render from bilingual state, matching production's rule) | Harness-owned |

No analytics events are emitted or simulated anywhere (Sleep Brief emits none
today; instrumenting any new interaction is a recorded open decision, not a
prototype behavior).

---

## 7. Accessibility inventory

- **Headings/landmarks**: one `h1` (hero title); `h2` for priorities,
  journey, and the dialog title; `h3` for priority-card and compare-column
  titles; no skipped levels. `<main aria-labelledby>`; both sections
  `aria-labelledby`.
- **Lists**: priorities and journey rail are real `<ol>`s (order is the
  honest ordinal claim; `<ol>` announces "1 of 3"); badges are a `<ul
  role="list">` (restores semantics under `list-style:none`) with sr-only
  category prefixes; ordinal numerals and the chevron/price glyphs are
  `aria-hidden` (semantics carried by text and list structure).
- **Buttons**: every operable element is a real `<button type="button">`.
  Disclosures use `aria-expanded` + `aria-controls` (W3C APG); no
  `aria-pressed` anywhere (no toggles-of-state on this screen); never both
  patterns on one control.
- **Firmness**: 10 discrete segments, N filled (never a continuous fill);
  graphic and visible word/number fragments live in one `aria-hidden` block;
  the single accessible rendering is the sr-only sentence "Firmness: Plush,
  2 of 10" / "Firmeza: Suave, 2 de 10". No `<meter>`/`role=meter` (VoiceOver
  iOS unreliability, w2-firmness-viz F2). Same pattern for the per-mattress
  firmness text in compare columns. Segment borders ≥3:1 against paper and
  fill; filled/unfilled differ by luminance, not hue.
- **Compare dialog**: `role="dialog" aria-modal="true" aria-labelledby`;
  opener remembered; labelled `h2` title (`tabindex="-1"`) focused on open;
  Tab trap with the title outside the cycle; Escape closes; backdrop click
  closes; inert applied to the exact recorded elements and released exactly;
  opener focus restored if still in the document. Entry button carries
  `aria-haspopup="dialog"`.
- **No live regions** — static prototype; nothing announces. The one
  announcement-adjacent affordance is `aria-describedby` from the simulated
  buttons to the visible caption.
- **Focus**: dual-ring `:focus-visible` (3px dark outline + 2px white inner
  ring) on all controls; **no `outline: none` anywhere** in the stylesheet.
- **Touch**: all buttons `min-height: 48px` and `touch-action: manipulation`;
  no hover-only information (hover states are not used at all).
- **Order/overflow**: DOM order = visual order everywhere (the primary CTA is
  last in DOM and last visually); the body never scrolls horizontally; the
  compare panel scrolls vertically inside its own container.
- **Contrast**: customer-glanceable text at 7:1-class (ink `#241e17` on paper
  `#f7f2e9` ≈ 13:1; badge text ≈ 9.6:1; muted body ≈ 8.6:1 on card); pill
  text ≥ 4.5:1 on its tinted fills.
- **Bilingual completeness**: every rendered string resolves for `ctx.lang`
  from fixture data, cited verbatim pairs, or proposed pairs — the smoke
  check asserts zero English leakage in ES mode. Spanish headroom: hero
  measure capped at 22ch with wrapping; badges and pills wrap rather than
  truncate; the document `<title>` is also localized.

---

## 8. Open questions (for Blake / the decision package)

1. Keep the fixed pair "Your Sleep Brief" / "Tu Resumen de Sueño" as the
   eyebrow, or drop it entirely once the need-led hero exists? (1.1 gate —
   the fixed heading is a pinned boundary; this is Blake's recorded call.)
2. Disclosure vs always-visible "Try this:" — the w2 evidence recommends
   visible; the deciding datum is floor observation (do salespeople read the
   prompt aloud?), which belongs with Phase 0.4 work. Judge A against B.
3. All PROPOSED ES strings need native review before production use
   (pending-native-legal-review precedent).
4. Does *size* deserve one of the five badge slots (it is logistics, not
   sleep fit)? — w2-signal-badges unresolved tradeoff #1.
5. Screen-reader announcement identity: under the 0.3 contract the transition
   focus lands on the `h1`, which is now a per-customer priority title rather
   than the stable "Your Sleep Brief". Is a variable announcement acceptable,
   or should focus target a stable label?
6. Compare columns reuse the verbatim `firmnessFeel` word map applied to
   captured integers (exactly what the production compare modal renders).
   Confirm this reuse is acceptable, vs. showing integer-only.
7. `tag-preference` has no production CSS rule — needs its own reviewed
   production fix regardless of which Brief variant wins.
8. Sticky bottom action bar vs in-flow actions (production Brief is
   in-flow) — judge on device once Phase 0.4 yields mounted-device evidence.

---

## 9. Explicitly NOT done

- No production files, fixtures, shared harness, docs, tests, or other
  variant directories were edited; all writes are inside `sleep-brief-a/`.
  No git commands were run (the lead commits).
- No analytics changes: no events emitted, renamed, or simulated; `tier_view`
  and the Sleep Brief's zero-event status are untouched (document-only rule).
- No engine work of any kind: no re-scoring, re-ordering, filtering, padding,
  capping, tier changes, or firmness recomputation — priorities render at the
  engine's index/order/count (sparse-b renders exactly 2; dense-c's 90/90 tie
  order is preserved by index), tier membership/order verbatim, firmness as
  the exact captured integer.
- No score, pct, match percentage, mattress rank number, or winner/highlight
  treatment anywhere (compare columns are equal-anatomy, tier-labelled).
- No invented per-model reasons: compare "Why it is here" rows are captured
  `cardPriorities` rows by index; "Difference" rows are captured product
  differentiator copy; nothing generic is relabelled as customer-specific.
- No financing content, no photography, no new icon vocabulary (the only
  glyphs are the existing text chevron `▾`, the arrow characters inside
  verbatim/proposed labels, and the aria-hidden price-tier symbols).
- No health-adjacent badges; no medical/diagnostic/buyer-characterising copy
  (ES banned list respected; no banned word appears in any proposed string).
- No live regions, no `<meter>`, no `location.reload()`, no external/CDN
  assets, no fonts fetched.
- Fixture text was not edited, corrected, or re-cased — including inherited
  production quirks (EN proper-noun size values in ES, Title Case quiz
  labels), which are flagged above instead.

---

## Lead integration pass (post-adversarial-review fixes)

Applied from the lead-triaged adversarial review. The original notes above
are retained; where a fix falsifies an earlier claim, the correction is
recorded here rather than silently rewritten. The only in-place edits made
above are to the proposed-copy / mapping tables (§3c, §5), so no stale
string can be copied out of them; each such edit is itemized below.

### Changes applied

- **A1 (BLOCKER — sticky bar occlusion).** `.sba-actions` painted over
  content and could cover the "Try this:" disclosure buttons at some
  viewports. Fixed in `sba.css`: the scrolling content container
  (`.sba-columns`) now carries bottom padding of
  `calc(var(--sba-actions-h) + env(safe-area-inset-bottom, 0px))`, where
  `--sba-actions-h: 15rem` is a deliberate over-estimate of the bar's
  tallest rendering (three stacked buttons + wrapped caption at 200% text),
  so no content can sit under the bar; `.sba-actions` gets an explicit
  `z-index: 10` — below the dialog backdrop (40) and dialog (50); and the
  disclosure buttons get a matching `scroll-margin-bottom` as
  belt-and-braces.
- **A2 (200% text clipping).** The default stacked grid used a plain `1fr`
  track (i.e. `minmax(auto, 1fr)`), so nowrap pills could blow the track out
  at 200% text. `.sba-columns` now uses `minmax(0, 1fr)` exactly as the
  ≥920px rule already did, and `.sba-tag` no longer sets
  `white-space: nowrap` — pills wrap at narrow widths instead of
  overflowing.
- **A3 (dialog).** (a) The backdrop click handler was unreachable dead code
  — the full-viewport `.sba-dialog` covers the scrim, so clicks could never
  reach the backdrop. The dismiss handler now lives on the dialog element
  itself, closing when `e.target` is the dialog root (the standard pattern);
  the backdrop handler is deleted. (b) Escape is bound on `document` while
  the dialog is open and removed on close, so it works wherever focus is.
  (c) The opener is captured from the activating event's `currentTarget` at
  open time — never `document.activeElement` — so focus restore works on
  the tap path and under double-click.
- **A4.** The eyebrow now consumes
  `profile[lang].dom.profileName.textContent` from the fixture; the
  hardcoded `VERBATIM.eyebrow` pair is deleted. The §3b row "Your Sleep
  Brief / Tu Resumen de Sueño … (eyebrow)" should now be read as §3a
  fixture data (`dom.profileName.textContent`).
- **A5 (honesty).** The compare-panel banner now carries Alternative B's
  honest wording pair ("Prototype simulation — sample saved finalists, not
  this customer's saves." / "Simulación del prototipo — finalistas guardados
  de ejemplo, no los de este cliente."); §3c updated in place, and §6's
  quoted "PROTOTYPE SIMULATION — production selection logic unchanged"
  banner string is superseded by the same change. The "Compare finalists"
  button is now connected to the visible "these actions are simulated"
  caption via `aria-describedby="sbaSimCaption"`.
  **Production disclosure (mirrors B's Q3):** on the production Brief this
  compare entry sits upstream of every save site — at first Brief render no
  saved finalists exist — so a production implementation needs a
  disabled/explained state for fewer than 2 finalists. Not demonstrable
  from fixtures (all three carry exactly 2 simulated saves).
- **A6.** The three disclosure buttons shared the accessible name "Try
  this:"; each now appends an sr-only suffix carrying that priority's
  title, so every disclosure's accessible name is unique.
- **A7.** Compare-dialog per-model feel words now consume the regenerated
  fixture's `entry.firmnessFeelWord[lang]` (executed from the real
  `firmnessFeel()` per model at capture time); the local word-map copy is
  deleted. The §3b word-map row and open question §8.6 are superseded: this
  variant no longer contains any word map — the fixture carries the words.
- **A8.** `role="list"` added to the ranked `<ol>`s (`.sba-priority-list`,
  `.sba-journey-list`), which render with `list-style: none` — exactly what
  this variant's own index.html comment prescribed for the badges.
- **A9 (ES register).** The sharing badge mapping for `solo` is now the
  third-person "Duerme solo" (matching the captured temperature register
  "Duerme con calor"); it was "Duermo Solo". The §5 table is updated in
  place; the string now deviates from quiz.json's option label and remains
  flagged for native review.
- **A10 (guard).** If the fixture's `priorityRows` is empty, the hero
  renders a visible bilingual fixture-error line ("Fixture error — no
  priority rows captured." / "Error de fixture — no hay filas de
  prioridades capturadas.", added to §3c) instead of a silent blank hero.
  The capture floor makes this unreachable; the render still must not be
  silent.

### Corrections to falsified claims (A11)

1. **§7 "the smoke check asserts zero English leakage in ES mode" — false
   as stated.** The Size badge renders production's EN-only `sizeLabels`
   values ("Full" / "Queen" / "King") in ES mode — an inherited production
   gap (index.html:13197-13198), not prototype-introduced. The claim should
   read: zero English leakage in ES mode *except* the Size badge value,
   which reproduces the production `sizeLabels` EN-only bypass. (§4's
   framing that "there is no visible ES defect" understates this: the
   rendered values are the production EN strings.)
2. **§7 "backdrop click closes" — false before the A3 fix.** The backdrop
   handler was unreachable dead code (the full-viewport dialog element
   covered the scrim), so outside-click dismissal did not work at all.
   It works only as of A3, and now lives on the dialog root, not the
   backdrop.
3. **The "Verified:" smoke checks are not repo artifacts.** They lived in
   an ephemeral scratchpad and cannot be re-run from this repository; treat
   that paragraph as narrative, not reproducible evidence.
