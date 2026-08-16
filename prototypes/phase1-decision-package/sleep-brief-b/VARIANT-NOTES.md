# Sleep Brief — Alternative B: "conservative hierarchy" (VARIANT NOTES)

**PROTOTYPE ONLY.** Wave 3, Phase 1 RESEARCH sprint. Renders frozen fixtures
captured from main = `78f949c` (`../fixtures/PROVENANCE.md`). Informs Blake's
decision; it is not implementation, not approval, and changes no production
behavior. All `index.html` line cites below are the production worktree file
(`C:/Users/BlakeFord/Documents/GitHub/LacksFurniture-phase1-prototypes/index.html`)
at that commit.

Files: `index.html` (shell), `sleep-brief-b.js` (render), `sleep-brief-b.css`
(presentation), this file.

View: serve the repo root over HTTP, open
`/prototypes/phase1-decision-package/sleep-brief-b/?scenario=dense-c&lang=en`
(scenario = `dense-c` | `dense-a` | `sparse-b`; lang = `en` | `es`).

---

## 1. Composition rationale

B's premise: the least disruptive composition that still fixes the
glanceability problem. It **retains** the verbatim h1 "Your Sleep Brief" /
"Tu Resumen de Sueño" (index.html:13170) and **keeps today's top-level
section order** (identity → what-we-test → journey → actions), then works
*within* that order:

- The engine's first priority (`priorityRows[0]`, by index) becomes a
  **conversation lead** directly beneath the h1 — prominent, but subordinate
  to the retained heading. It is an *echo*: the same row still renders as
  item 1 of the ordered list (nothing is filtered).
- The identity section's three prose sentences (subtitle, summary,
  reflection) are **condensed into five inert signal badges + the lead**
  (deviations D1–D3 below); the reassurance sentence is kept verbatim as the
  one retained trust line.
- Priorities render as a real `<ol>` in engine order with the **"Try this:"
  detail fully visible but typographically subordinated** (smaller, indented,
  consistent last position). This is B's deliberate contrast with
  disclosure-based treatments, per the w2-progressive-disclosure evidence
  (NN/g frequency criterion + GOV.UK "majority need" rule: the prompt is the
  action step of every consultation, so it stays visible; reading load is
  reduced by hierarchy, not hiding).
- The journey rail and actions stay in place; the CTA mislabel is resolved
  honestly (D9/D10).

Anchors-not-prose throughout (w2-assisted-sales): every customer-glanceable
element is a short noun phrase sized for 0.5–1 m two-person viewing; the
sentences belong to the salesperson.

---

## 2. Deliberate deviations from the current presentation

- **D1 — profileSubtitle prose dropped** (e.g. "Cozy Combo Sleeper · Family
  Bed", built at index.html:13062–13080). Its position/temperature/sharing
  signals are now carried atomically by the badge row.
- **D2 — profileSummary prose dropped** ("Your starting point: …" — the
  priority titles joined into a sentence). Carried by the conversation lead
  plus the ordered priority list itself.
- **D3 — profileReflection prose dropped** ("You are shopping for a Full, …",
  index.html:13207–13210). The same stored answers are carried by the
  position/sharing/size/feel badges.
- **D4 — Conversation lead added** beneath the retained h1: `priorityRows[0]`
  title + one-line reason, verbatim, BY INDEX. The row still renders as item
  1 of the `<ol>` — the lead is an echo, not a removal.
- **D5 — Journey heading promoted** from styled div to a real `h2`, and the
  journey steps re-expressed as a real `<ol>` (parsed from the captured
  innerHTML so text and order stay verbatim; production emits divs with
  `data-step`, index.html:13495–13497).
- **D6 — Ordinal markers (1..n) added to priorities**; honest per
  w2-ranked-information (the order is genuinely ranked; position is the
  claim). "Try this:" kept fully visible with typographic subordination —
  B's recorded contrast with Alternative A's composition space.
- **D7 — Firmness upgraded from word-only** (today's Brief shows no numeral)
  to word + exact integer + 10-discrete-segment strip, with the
  "Firmness: word, n of 10" accessible template. Never a continuous fill.
- **D8 — metaStrip restyled into the badge row**; order changed from
  Size·Feel·Temperature (index.html:13213–13216) to the fixed invariant
  Position → Feel → Temperature → Sharing → Size (w2-signal-badges
  positional-lookup rationale), with two proposed additions (position,
  sharing). Same `<dl>` semantics retained.
- **D9 — Primary CTA relabelled** from "Compare My Matches →" to PROPOSED
  "See My Matches →" — resolves the known 1.6 mislabel (the production CTA
  only navigates to Results, index.html:13509 → startResultsReveal). The new
  label claims navigation only.
- **D10 — New "Compare finalists" entry on the Brief** (verbatim label,
  index.html:16843). Production's only live compare entry is hf2; the Brief
  has none. Here it is a W3C APG disclosure (real button, `aria-expanded` +
  `aria-controls`) opening a prototype-simulated 2-up panel fed by
  `compareDemo` — labelled bilingually as simulation.
- **D11 — Compare panel stat subset**: Feel / Tier / Why it is here /
  Difference (labels verbatim, index.html:18892–18897). The production
  modal's Response and Your-reaction stats are omitted — their sources
  (`mattressResponseLabel`, `_mattressReactions`) are not captured in the
  fixture. No photography in this variant (B rule), unlike the production
  modal's `compare-col-img`.
- **D12 — tag-preference pill renders with the neutral base style**,
  mirroring production where no `.tag-preference` CSS rule exists (base pill
  only). Made explicit in CSS comments rather than silently "fixed".

---

## 3. Complete copy inventory

### 3a. Fixture data (verbatim engine/render output, per `ctx.lang`)

| Element | Fixture path |
|---|---|
| Eyebrow | `profile[lang].dom.profileEyebrow.textContent` |
| h1 | `profile[lang].dom.profileName.textContent` |
| Lead title/reason | `profile[lang].priorityRows[0].title` / `.desc` |
| Badge labels Size/Feel/Temperature + values | `profile[lang].metaStrip[0..2]` (positional; production emits fixed order, index.html:13213–13216) |
| Firmness integer | `firmness.value` |
| Firmness word (Brief) | `profile[lang].metaStrip[1].value` (the Brief's own inline bucket vocabulary, index.html:13199) |
| Reassurance | `dom.profileReassurance.textContent` |
| Plan label eyebrow | `dom.profilePlanLabel.textContent` |
| h2 "What we will test together" | `dom.profilePrioritiesHeading.textContent` (index.html:13223) |
| Intro | `dom.profilePrioritiesIntro.textContent` |
| Priority rows (title, desc, tag, tagClass, test) | `profile[lang].priorityRows[i]` — engine order/count by index, 1–3 |
| Journey h2 / steps / copy | `dom.profileJourneyHeading` / `dom.profileJourneySteps.innerHTML` (parsed) / `dom.profileJourneyCopy` |
| Edit Answers | `dom.profileSecondary.textContent` |
| Compare pair (ids, tiers, order) | `compareDemo.savedOrder` (first two) |
| Finalist name/brand/subBrand/firmness | `results.tierData[tier][…]` matched by id |
| Why it is here | `results.cardPriorities[lang][id][0]` (`title — desc`, production formula index.html:18882–18884); fallback `topPickReason` via `L()` |
| Difference | `differentiators[0].detail` via `L()` (production formula index.html:18897) |
| Price-tier symbol | `results.priceTierSymbols[tier]` (aria-hidden) |

### 3b. Verbatim production EN/ES pairs (copied with line cites)

| EN | ES | Source |
|---|---|---|
| `Try this: ` | `Pruébalo: ` | index.html:13484 (also present in captured row innerHTML) |
| `Compare finalists` | `Comparar finalistas` | index.html:16843 |
| `Compare Your Finalists` | `Compara Tus Finalistas` | index.html:18902 |
| `Gold` / `Silver` / `Bronze` | `Oro` / `Plata` / `Bronce` | index.html:18880 |
| `Feel` | `Sensación` | index.html:18892 |
| `Tier` | `Nivel` | index.html:18894 |
| `Why it is here` | `Por qué está aquí` | index.html:18895 |
| `Difference` | `Diferencia` | index.html:18897 |
| `Plush`/`Medium`/`Firm`/`Extra Firm` | `Suave`/`Medio`/`Firme`/`Extra Firme` | index.html:13676–13682 — `firmnessFeel()` word map **and thresholds replicated verbatim** for the per-model compare Feel words, because per-model feel words are not captured in the fixture. Flagged for lead review (open question Q8). |
| Position badge values (`Side Sleeper`/`De Lado`, `Back Sleeper`/`Boca Arriba`, `Stomach Sleeper`/`Boca Abajo`, `Combination`/`Combinación`, `Not Sure`/`No Estoy Seguro`) | | `data/quiz.json` `sleep_position` option labels (config-owned, verbatim) |
| Sharing badge values (`Solo Sleeper`/`Duermo Solo`, `With a Partner`/`Con Pareja`, `Family Bed`/`Cama Familiar`) | | `data/quiz.json` `partner_sleep` option labels (config-owned, verbatim) |

### 3c. PROPOSED copy (every use site carries `data-proposed-copy=""`)

| # | EN | ES | Purpose / rationale |
|---|---|---|---|
| P1 | Where we start | Por dónde empezamos | Conversation-lead label; echoes the verbatim reassurance phrasing ("This brief guides where we start." / "Este resumen define por dónde empezamos.", index.html:13219–13221) |
| P2 | See My Matches → | Ver Mis Opciones → | Honest navigation CTA replacing the 1.6 mislabel; ES mirrors production's "Comparar Mis Opciones →" with an honest verb |
| P3 | Position | Posición | Badge category label for `sleep_position` |
| P4 | Sharing | Cama compartida | Badge category label for `partner_sleep` — B2: aligned with Alternative A (was "Compañía", which does not convey bed-sharing); flagged for native-ES review |
| P5 | Firmness: {word}, {n} of 10 | Firmeza: {word}, {n} de 10 | Spec-mandated accessible-name template (sr-only, adjacent to the aria-hidden graphic) |
| P6 | Prototype: navigation buttons are simulated on this screen. | Prototipo: los botones de navegación están simulados en esta pantalla. | Always-visible actions caption so simulated buttons are never silent dead ends |
| P7 | Prototype simulation — sample saved finalists, not this customer's saves. | Simulación del prototipo — finalistas guardados de ejemplo, no los de este cliente. | Bilingual simulation label inside the compare panel |
| P8 | *(mapping)* `sleep_position` answer id → quiz.json option label rendered as a badge | idem | Proposed presentation mapping of a stored answer; strings verbatim (table §4) |
| P9 | *(mapping)* `partner_sleep` answer id → quiz.json option label rendered as a badge | idem | Proposed presentation mapping of a stored answer; strings verbatim except solo-ES (B2, table §4) |
| P10 | Fixture error — no priority rows captured. | Error de fixture — no hay filas de prioridades capturadas. | B7 guard: visible bilingual error when the fixture carries no priority rows (unreachable under the capture floor; prototype-harness copy, never customer-facing) |

---

## 4. Answer → badge mapping table (full, for review)

Badges are **inert status tags** (GOV.UK tag posture: light fill, dark text,
adjective/noun copy, never button-styled, never interactive). Fixed invariant
order: **Position → Feel → Temperature → Sharing → Size**. One fact per
badge; a missing/unknown answer omits the badge (no "—" placeholders).
**Health-adjacent answers (sleep_issues, health_conditions,
partner_disturbance) never become badges** — their implications remain in
need-framed priority copy only (w2-signal-badges / Phase 0.6).

| Signal | Stored answer | Badge value EN | Badge value ES | Value source |
|---|---|---|---|---|
| Position | `sleep_position: side` | Side Sleeper | De Lado | quiz.json verbatim |
| Position | `back` | Back Sleeper | Boca Arriba | quiz.json verbatim |
| Position | `stomach` | Stomach Sleeper | Boca Abajo | quiz.json verbatim |
| Position | `combo` | Combination | Combinación | quiz.json verbatim |
| Position | `no_idea` | Not Sure | No Estoy Seguro | quiz.json verbatim (render vs omit = open question Q2) |
| Feel | `firmness` (integer) | metaStrip Feel word + `n/10` + 10-segment strip | idem (ES word) | fixture (`metaStrip[1]`, `firmness.value`) |
| Temperature | `temperature` | metaStrip value (e.g. Sleeps cold) | e.g. Duerme con frío | fixture verbatim |
| Sharing | `partner_sleep: solo` | Solo Sleeper | Duerme solo | B2: register-adjusted from quiz.json's "Duermo Solo" (third person, matching the captured temperature register); native review pending |
| Sharing | `partner` | With a Partner | Con Pareja | quiz.json verbatim |
| Sharing | `family` | Family Bed | Cama Familiar | quiz.json verbatim |
| Size | `mattress_size` | metaStrip value (Twin/…/Cal King) | idem (proper nouns) | fixture verbatim |

---

## 5. Simulated behaviors (each labelled in the UI)

1. **Edit Answers / See My Matches** — navigation is simulated: the buttons
   pulse the always-visible bilingual caption (P6). No announcement (static
   prototype, no live regions). In production these navigate to Review /
   Results respectively.
2. **Compare finalists** — opens a disclosure panel fed by
   `compareDemo.savedOrder` (the shipped auto-pair rule as captured:
   favourite-first, then save order, first two). Labelled bilingually as
   simulation (P7). In production, saved-finalist state does not exist at
   first Brief render (see open question Q3).
3. **Scenario / language switching** — harness review bar (full page reload;
   language resolves at render time from bilingual state, matching the
   production rule).

---

## 6. Accessibility inventory

1. One `h1` (verbatim retained); labelled landmarks: `<main
   aria-labelledby>`, two `<section aria-labelledby>` with real `h2`s; `h3`
   panel title; `h4` finalist names. No skipped levels.
2. Real `<ol>` for ranked priorities and the journey rail (`role="list"`
   restores list semantics dropped by some engines under
   `list-style: none`); `<ul>` for the two compare finalists (no rank).
3. Ordinal number glyphs are `aria-hidden` — list semantics already announce
   position; no rank number, score, or percentage renders for any mattress.
4. Firmness: 10 discrete segments (never continuous), graphic and visible
   word/number `aria-hidden`, adjacent sr-only "Firmness: {word}, {n} of 10"
   / "Firmeza: {word}, {n} de 10". No `<meter>` / `role="meter"` (VoiceOver
   iOS unreliability, w2-firmness-viz).
5. Disclosure = real `<button>` with `aria-expanded` + `aria-controls` (W3C
   APG); chevron `▾` (existing production glyph vocabulary, cf.
   index.html:9888) is `aria-hidden` beside visible text. No `aria-pressed`
   anywhere (no toggles on this surface); never both patterns on one control.
6. No live regions — nothing announces in this static prototype.
7. Dual-ring `:focus-visible` (outline + box-shadow tokens) on all buttons;
   no `outline: none` anywhere.
8. All buttons `min-height: 48px` (≥44px rule) with
   `touch-action: manipulation`; no hover-only information.
9. Badges are inert `<dl>` content — light fill, dark text, visually distinct
   from buttons; filled/unfilled segments differ by luminance + border, not
   hue alone (WCAG 1.4.1, 1.4.11 ≥3:1 documented in CSS).
10. DOM order = visual order; body never scrolls horizontally (panel grid
    stacks; badges wrap; ES labels have 30%+ intrinsic-width headroom).
11. Customer-glanceable text at 7:1-class contrast (tokens annotated in
    CSS); operator detail ≈8:1.
12. Price-tier symbol (`$$$`) is `aria-hidden`; tier is conveyed as text in
    the Tier stat (avoids the "drawer announces $$$" trap).

---

## 7. Open questions

- **Q1** — "Compañía" as the Sharing badge label needs native-ES review
  (store-config `esReviewStatus: "pending-native-legal-review"`).
- **Q2** — `sleep_position: no_idea`: render "Not Sure" / "No Estoy Seguro"
  verbatim, or omit the badge? Fixtures don't exercise it (table-only).
- **Q3** — Production wiring for a Brief-level Compare entry: at first Brief
  render no saved picks exist, so the entry needs a disabled/explained
  empty state (<2 finalists). Not demonstrable from fixtures (all three
  carry exactly 2 simulated saves).
- **Q4** — Should the conversation lead also carry the kind pill? (Currently
  title + reason only; the pill appears on the list row.)
- **Q5** — Badge order: fixed Position→Feel→Temperature→Sharing→Size adopted
  per w2-signal-badges positional lookup; production metaStrip order (Size
  first) is the conservative alternative.
- **Q6** — The priorities intro line is kept visible here (conservative
  retention); reviewers should compare against A's handling.
- **Q7** — Feel renders once, as the badge-embedded firmness module. The
  alternative (word-only badge + separate module) would break the
  word+number pairing rule — confirm the embedded approach.
- **Q8** — The per-model compare Feel words required replicating the
  `firmnessFeel()` word map verbatim (index.html:13676–13682) because the
  fixture only captures the customer's own value. Lead to confirm this
  replication or extend fixtures with per-model words.

---

## 8. Explicitly NOT done

- No production files, fixtures, shared harness, other variant dirs, docs or
  tests were edited. No git commands were run.
- No analytics changes or event implementations (Sleep Brief emits no events
  today; nothing added).
- No invented per-model reasons — per-feature reason columns are empty
  across all 26 models and are deliberately excluded from the fixtures;
  card copy shown is the captured `cardPriorities` / `topPickReason` /
  `differentiators` output only.
- No score, pct, match percentage, mattress rank number, or winner/highlight
  treatment anywhere (verified by automated check across 3 scenarios × 2
  languages).
- No re-ordering, filtering, padding, or kind-based selection of engine
  output; priorities and tiers render by fixture index.
- No financing content of any kind; no photography; no new icon vocabulary
  (only the production `▾` text chevron); no live regions; no hover-only
  information; no `<meter>`; no continuous firmness bar.
- No dead production patterns resurrected (priority meter CSS, winner CSS,
  archetype nicknames, `displayPriority`, `--tier-*` vars, compare tray).
- Breakpoints are content-driven samples only — no showroom-hardware claims
  (Phase 0.4 pending).

---

## Lead integration pass (post-adversarial-review fixes)

Applied from the lead-triaged adversarial review. The original notes above
are retained; where a fix falsifies an earlier claim, the correction is
recorded here rather than silently rewritten. The only in-place edits made
above are to the proposed-copy / mapping tables (§3c, §4), so no stale
string can be copied out of them; each such edit is itemized below.

### Changes applied

- **B1.** The compare pair now consumes `fixture.compareDemo.autoPair` —
  computed at capture time by *executing* the real extracted
  `compareReviewFinalists()` (index.html:17398-17409) against the simulated
  saved state — instead of re-deriving `savedOrder.slice(0, 2)` locally.
  `savedOrder` is now only consulted to resolve each paired id's tier. The
  §3a row "Compare pair … `compareDemo.savedOrder` (first two)" and §5.2's
  "fed by `compareDemo.savedOrder`" description are superseded: fed by
  `compareDemo.autoPair`.
- **B2 (ES).** The Sharing badge label changed from "Compañía" to
  "Cama compartida" (aligning with Alternative A — "Compañía" does not
  convey bed-sharing), and the `solo` value to third-person "Duerme solo"
  (matching the captured temperature register). §3c P4 and the §4 table are
  updated in place; both strings remain flagged for native-ES review. Note
  the solo-ES value now deviates from quiz.json's verbatim option label
  ("Duermo Solo") — it is proposed copy, which corrects §3b's blanket
  "quiz.json verbatim" for that one value; Q1 now applies to
  "Cama compartida".
- **B3.** The badge row is reordered to **position → temperature → sharing
  → feel → size** — the order in Blake's spec, which Alternative A uses —
  so the two Briefs are directly comparable. This supersedes the order
  stated in D8, the §4 preamble, and Q5 (previously position → feel →
  temperature → sharing → size). The Feel badge still carries the embedded
  firmness module (Q7 unchanged); it now sits fourth.
- **B4.** The compare "Why it is here" fallback printed the
  customer-agnostic `topPickReason` under a customer-fit label for any
  tier, and did not mirror production's tier-dependent `hf2ReasonFor`. The
  stat is now OMITTED when `cardPriorities[lang][id]` has no captured rows,
  as Alternative A and results-grouped do. §3a's "fallback `topPickReason`
  via `L()`" row is superseded.
- **B5 (reflow).** The ≥640px journey row could not compress (flex items'
  `min-width: auto`); `.sb-journey-step` now sets `min-width: 0` so long ES
  strings reflow instead of overflowing.
- **B6 (outline).** The compare panel heading nested under "What happens
  next" in the document outline. The panel is now its own `<section>`
  (`aria-labelledby`) with the verbatim "Compare Your Finalists" /
  "Compara Tus Finalistas" pair as a same-level `h2` (was an `h3` inside
  the actions block). §6.1's heading inventory ("`h3` panel title") is
  superseded; finalist names remain `h4` — one level below their new `h2`
  section heading, an acceptable jump recorded here.
- **B7.** Audited every ranked `<ol>` with `list-style: none` for
  `role="list"`: both (`.sb-priorities`, `.sb-journey-steps`) already
  carried it — no markup change needed. `rows[0]` access is now guarded: an
  empty-priorities fixture renders a visible bilingual fixture-error line
  ("Fixture error — no priority rows captured." / "Error de fixture — no
  hay filas de prioridades capturadas.", added to §3c as P10) instead of
  throwing. Unreachable under the capture floor; the render still must
  never throw or go silently blank.
- **B8.** Per-model compare Feel words now consume the regenerated
  fixture's `entry.firmnessFeelWord[lang]` (executed from the real
  `firmnessFeel()` per model at capture time); the local word-map replica
  is deleted. This supersedes the §3b word-map row, and **resolves Q8** the
  way that question requested: the fixtures were extended.

### Corrections to falsified claims (B9)

1. **Bilingual completeness.** The Size badge renders production's EN-only
   `sizeLabels` values ("Full" / "Queen" / "King") in ES mode — an
   inherited production gap (index.html:13197-13198), not
   prototype-introduced. §4's Size row ("idem (proper nouns)") should be
   read with that exception explicit: the rendered ES-mode values are the
   production EN strings.
2. **B1's previous code comment claimed "as captured" while re-deriving.**
   Before this pass the code commented that the pair was "the shipped
   auto-pair rule as captured … consumed verbatim from
   compareDemo.savedOrder", but it actually re-derived
   `savedOrder.slice(0, 2)` locally rather than consuming an executed-rule
   output. Fixed by B1 (the fixture's `autoPair` is now the executed rule's
   output and is consumed verbatim).
3. **Open layout note — ES fold flip (adversary-measured datum).** At
   1112×834, a priority row falls below the fold in ES but not in EN. Not
   addressed in this pass; recorded as an open layout observation for the
   decision package (relevant to the two-person glanceability claim).
