# Phase 1 catalog-reason authoring brief — Lacks Furniture

**Status: RESEARCH SPRINT OUTPUT — for review by Blake and Lacks merchandising.
Nothing in this document lifts the 1.3 reason gate, authorizes rendering, or
changes the pipeline.** Baseline: main = `78f949c`. Every catalog fact below
was extracted programmatically from the committed catalog
(`data/mattresses.json` / `data/mattresses.csv`, generated from
`incoming/lacks_mattresses.json`); nothing is transcribed by hand.

## 1. Why this document exists

The most valuable part of the Phase 1 Results redesign — a mattress card that
leads with *why this model fits this customer* — is gated on content that does
not exist yet (docs/rebuild-roadmap.md, item 1.3): across all 26 models, every
per-feature reason column is empty, and only a generic per-model default is
populated. The roadmap is explicit that placeholder, sample, authored-in-app
or generic-default text standing in for that content **is** the gated output,
not a step toward it. This brief therefore does three things and no more:

1. records the verified catalog facts a content author needs;
2. defines exactly what Lacks must author (and in which languages, with what
   evidence);
3. proposes — without implementing — the schema, validation and review
   workflow that would make that content safe to ship and safe for a
   salesperson to repeat aloud.

Two load-bearing engine facts frame everything below (verified at `78f949c`):

- **No catalog reason renders anywhere today — not even the default.** The
  scoring engine's `matchReasons` return value is discarded at its only call
  site (`index.html:14505-14506`), the per-feature lookup can never fire on an
  all-empty catalog (`index.html:13020`), `reasons_es` has zero references,
  and `default` is never a feature tag. The current card "reason"
  (`topPickReason`) and the drawer differentiators are authored **product**
  copy, never presented as customer-specific.
- **Two of the eight reason keys are engine-dead regardless of content.** The
  build script lowercases feature tags (`build-data.ps1`), while the quiz
  emits `pressureRelief` / `motionIsolation` in camelCase — so those two
  reason keys can never match a scored feature until the Phase 3.1 casing fix,
  which is a Blake-gated scoring change and must NOT be bundled into content
  or presentation work.

## 2. Verified catalog facts

**Lineup:** 26 models — Gold 9, Silver 10, Bronze 7. Brands: Chattam & Wells,
Tempur-Pedic, Restonic, Spring Air, Genesis. 21 models are flagged
locally-made (+25 scoring bonus; Restonic and Chattam & Wells per Blake,
2026-07-30).

**Emptiness (verified programmatically, all 26 rows):** all eight per-feature
columns — `reason_cooling`, `reason_pressureRelief`, `reason_motionIsolation`,
`reason_support`, `reason_plush`, `reason_medium`, `reason_firm`,
`reason_durability` — are empty in every row; `reason_default` is populated in
all 26 rows in both languages and is a **unique, model-specific,
customer-agnostic** string per model (not one shared generic sentence).

**Engine feature-tag frequencies across the lineup** (these drive scoring and
are the candidate "applicability" vocabulary for reasons): hybrid 21,
support 19, pressurerelief 13, firm 12, durability 12, zoned 11, plush 7,
soft 7, medium 7, cooling 6, responsive 3, motionisolation 3.

**Schema coverage gaps worth knowing before authoring:**

- Catalog tags with **no** reason column: `soft`, `zoned`, `hybrid`,
  `responsive`. Quiz-only score tags with no column: `adjustable`, `comfort`,
  `durable`, `hypoallergenic`, `memory`, `quality`.
- Engine-live reason keys (single-word, casing survives): `cooling`,
  `support`, `plush`, `medium`, `firm`, `durability`. Engine-dead until 3.1:
  `pressureRelief`, `motionIsolation` (casing mismatch above).
- The authored `firmnessLabel` column is **never displayed**; screens derive
  the shown word from the numeric score (`firmnessFeel` buckets), and the two
  disagree on some models (e.g. g4 authored "Soft" displays as "Plush"; g9
  authored "Cushion Firm" displays as "Firm"). Authors should write against
  the customer-visible vocabulary, not the authored column.
- `displayBadges` never render visibly, but response labels, trial prompts
  and difference text substring-match against them — rewording badges is a
  behavior change, not copy polish.

### Table 1 — model identity and fit facts

| id | tier | model | brand · sub-brand | firmness (authored label) | locally made | engine feature tags | display badges |
|---|---|---|---|---|---|---|---|
| g1 | gold | The Roma | Chattam & Wells · Roma | 7 (Firm) | yes | support, firm, durability, hybrid, responsive, zoned | Luxury Natural Fibers, Firm, Euro-Top |
| g2 | gold | The Saint Pierre | Chattam & Wells · Saint Pierre | 3 (Plush) | yes | plush, soft, pressurerelief, durability, hybrid | Luxury Natural Fibers, Plush, Euro-Top |
| g3 | gold | The Palermo | Chattam & Wells · Palermo | 7 (Firm) | yes | support, firm, durability, zoned, hybrid | 4,294 Coils, Firm, Hand-Tufted |
| g4 | gold | Tempur-LuxeBreeze 2.0 Soft | Tempur-Pedic · LuxeBreeze | 2 (Soft) | no | cooling, soft, plush, pressurerelief, motionisolation | Cooling, Soft, Memory Foam |
| g5 | gold | Tempur-ProBreeze 2.0 Medium Hybrid | Tempur-Pedic · ProBreeze | 5 (Medium) | no | cooling, medium, hybrid, pressurerelief, support | Cooling, Hybrid, Medium |
| g6 | gold | Reserve Mayfair Plush | Restonic · Reserve | 3 (Plush) | yes | plush, soft, pressurerelief, hybrid, durability | Hand-Made, Plush, Natural Materials |
| g7 | gold | Reserve Mayfair Medium | Restonic · Reserve | 5 (Medium) | yes | medium, support, hybrid, durability, pressurerelief | Hand-Made, Medium, Natural Materials |
| g8 | gold | Royal Reserve Extra Firm | Restonic · Royal Reserve | 8 (Extra Firm) | yes | firm, support, durability, hybrid | Hand-Made, Extra Firm, Natural Materials |
| g9 | gold | Copper Cushion Firm | Spring Air · Copper | 6 (Cushion Firm) | no | cooling, medium, support, hybrid, responsive | Copper-Infused, Cooling, Cushion Firm |
| s1 | silver | Platinum Paige Firm | Restonic · Platinum | 7 (Firm) | yes | firm, support, zoned, hybrid, durability | Marvelous Middle, Firm, Box Top |
| s2 | silver | Platinum Paige Extra Firm | Restonic · Platinum | 8 (Extra Firm) | yes | firm, support, zoned, hybrid | Marvelous Middle, Extra Firm, Hybrid |
| s3 | silver | Platinum Maria Plush | Restonic · Platinum | 3 (Plush) | yes | plush, soft, pressurerelief, zoned, hybrid, motionisolation | Plush Box Top, Zoned Coils, Edge Support |
| s4 | silver | Platinum Maria Firm | Restonic · Platinum | 7 (Firm) | yes | firm, support, zoned, hybrid, durability | Firm Box Top, Zoned Coils, Edge Support |
| s5 | silver | Platinum Summit Firm | Restonic · Platinum | 7 (Firm) | yes | firm, cooling, support, hybrid, pressurerelief | Cool Gel, Firm, Hybrid |
| s6 | silver | Platinum Summit Medium | Restonic · Platinum | 5 (Medium) | yes | medium, cooling, pressurerelief, hybrid, support | Cool Gel, Medium, Hybrid |
| s7 | silver | Platinum Summit Plush | Restonic · Platinum | 3 (Plush) | yes | plush, soft, cooling, pressurerelief, hybrid | Cool Gel, Plush, Hybrid |
| s8 | silver | Kendall Firm Euro Top | Restonic · ComfortCare | 7 (Firm) | yes | firm, support, zoned, hybrid | Marvelous Middle, Firm, Euro Top |
| s9 | silver | Kendall Luxury Medium | Restonic · ComfortCare | 5 (Medium) | yes | medium, motionisolation, pressurerelief, hybrid, support | Hybrid, Medium, Motion Isolation |
| s10 | silver | Kendall Extra Firm | Restonic · ComfortCare | 8 (Extra Firm) | yes | firm, support, zoned, hybrid, durability | Marvelous Middle, Extra Firm, Tight Top |
| b1 | bronze | Giselle Plush | Restonic · Giselle | 3 (Plush) | yes | plush, soft, pressurerelief | Plush, 12.5-Inch, Value |
| b2 | bronze | Giselle Firm | Restonic · Giselle | 7 (Firm) | yes | firm, support, durability | Firm, 12.5-Inch, Value |
| b3 | bronze | Genesis Euro Top | Genesis · Kingdom Mattress | 5 (Medium) | no | medium, hybrid, support, durability, pressurerelief | Hybrid, Euro Top, Made in USA |
| b4 | bronze | Genesis Firm | Genesis · Kingdom Mattress | 7 (Firm) | no | firm, hybrid, support, durability | Hybrid, Firm, Made in USA |
| b5 | bronze | Angelina Plush | Restonic · ComfortCare | 3 (Plush) | yes | plush, soft, pressurerelief, zoned | Marvelous Middle, Plush, Side Sleeper |
| b6 | bronze | Angelina Extra Firm | Restonic · ComfortCare | 8 (Extra Firm) | yes | firm, support, zoned, hybrid | Marvelous Middle, Extra Firm, Hybrid |
| b7 | bronze | Gracie Medium | Restonic · Grace | 5 (Medium) | yes | medium, support, zoned, responsive | Innerspring, Medium, Best Value |

### Table 2 — currently authored copy (product-describing, customer-agnostic; none of it renders as a "reason" today)

| id | reason_default (EN) | reason_default (ES) | differentiators (titles) |
|---|---|---|---|
| g1 | Merino wool, cashmere, and graphite latex over multiple coil layers — firm support that breathes and lasts. | Lana Merino, cachemira y látex de grafito sobre múltiples capas de resortes — soporte firme que respira y dura. | Natural fiber comfort layers; Coil-on-coil with graphite latex |
| g2 | A deep plush euro-top of wool and cashmere over layered coils — indulgent softness that never loses its support. | Un euro-top suave y profundo de lana y cachemira sobre capas de resortes — suavidad indulgente que nunca pierde su soporte. | Deep plush euro-top; Breathable natural fill |
| g3 | 4,294 coils, Merino wool, and a hand-tufted build — firm alignment engineered to hold for decades. | 4,294 resortes, lana Merino y construcción copetuda a mano — alineación firme diseñada para durar décadas. | 4,294-coil support system; Hand-tufted construction |
| g4 | Tempur-Pedic's coolest mattress — Pure Cool Plus material pulls heat away while soft TEMPUR cradles every curve. | El colchón más fresco de Tempur-Pedic — el material Pure Cool Plus disipa el calor mientras el TEMPUR suave abraza cada curva. | Feels up to 10° cooler; Soft TEMPUR contour |
| g5 | Cool-to-the-touch Breeze cover and Pure Cool material over a hybrid coil base — cooling plus true TEMPUR pressure relief. | Funda Breeze fresca al tacto y material Pure Cool sobre una base híbrida de resortes — frescura más el verdadero alivio de presión TEMPUR. | Cool-to-touch Breeze cover; Hybrid coil base |
| g6 | A hand-made hybrid of natural materials with a plush euro-top — built by Restonic craftspeople to last a lifetime. | Un híbrido hecho a mano con materiales naturales y euro-top suave — construido por artesanos de Restonic para durar toda la vida. | Hand-made construction; Plush euro-top feel |
| g7 | Hand-made with natural materials in a balanced medium tight-top — luxury that works for almost every sleeper. | Hecho a mano con materiales naturales en un tight-top medio equilibrado — lujo que funciona para casi todos. | True balanced medium; Natural-material build |
| g8 | The firmest bed in the Reserve line — hand-made hybrid support with natural materials for sleepers who want maximum lift. | La cama más firme de la línea Reserve — soporte híbrido hecho a mano con materiales naturales para quienes quieren máxima elevación. | True extra-firm lift; Hand-made durability |
| g9 | Patented NatuVerex copper fabric and copper-infused memory foam — a cleaner, cooler sleep over cushion-firm hybrid support. | Tela de cobre patentada NatuVerex y espuma viscoelástica con cobre — un sueño más limpio y fresco sobre soporte híbrido cushion-firm. | Copper-infused sleep surface; Cushion-firm balance |
| s1 | Patented Marvelous Middle delivers 25% more support in the center third — where your body needs it most. | El patentado Marvelous Middle brinda 25% más soporte en el tercio central — donde tu cuerpo más lo necesita. | Marvelous Middle zoning; Luxury box-top build |
| s2 | Extra-firm hybrid support with Marvelous Middle zoning — maximum lift without giving up the luxury layers. | Soporte híbrido extra firme con zonificación Marvelous Middle — máxima elevación sin renunciar a las capas de lujo. | Extra-firm support core; Zoned center third |
| s3 | A 15-inch plush box top with 25% thicker center coils and 3-inch edge encasement — soft where you feel it, supported where you need it. | Un box top suave de 15 pulgadas con resortes centrales 25% más gruesos y encasado de borde de 3 pulgadas — suave donde lo sientes, con soporte donde lo necesitas. | Deep box-top plush; Zoned wrapped coils |
| s4 | Firm box-top support with 25% thicker center coils and full edge encasement — alignment-first comfort with a finished luxury feel. | Soporte box-top firme con resortes centrales 25% más gruesos y encasado completo de borde — confort que prioriza la alineación con acabado de lujo. | Firm with a finished top; 3-inch edge encasement |
| s5 | A full layer of cool-gel memory foam over a firm hybrid core — pressure relief with a cooling effect and solid alignment. | Una capa completa de espuma con gel fresco sobre un núcleo híbrido firme — alivio de presión con efecto refrescante y alineación sólida. | Cool-gel memory foam layer; Firm hybrid core |
| s6 | Cool-gel memory foam on a balanced medium hybrid — pressure relief, cooling, and support in the feel most sleepers pick. | Espuma con gel fresco sobre un híbrido medio equilibrado — alivio de presión, frescura y soporte en la sensación que la mayoría elige. | Crowd-pleasing medium; Gel-cooled surface |
| s7 | Plush gel memory foam over hybrid coils — soft, cool pressure relief for side sleepers who sleep warm. | Espuma viscoelástica suave con gel sobre resortes híbridos — alivio de presión suave y fresco para quienes duermen de lado con calor. | Plush that stays cool; Supported softness |
| s8 | 25% thicker coils in the center third support your hips and lower back while the euro top softens the firm surface. | Resortes 25% más gruesos en el tercio central soportan caderas y espalda baja mientras el euro top suaviza la superficie firme. | Euro-top over firm coils; Thicker center-third coils |
| s9 | Layers of conforming foam over wrapped coils — balanced medium comfort that absorbs a partner's movement. | Capas de espuma adaptable sobre resortes envueltos — confort medio equilibrado que absorbe el movimiento de la pareja. | Wrapped-coil motion isolation; Conforming comfort layers |
| s10 | Extra-firm hybrid support with 25% thicker center coils — maximum alignment without the luxury price tag. | Soporte híbrido extra firme con resortes centrales 25% más gruesos — máxima alineación sin precio de lujo. | Extra-firm tight top; Zoned center support |
| b1 | A 12.5-inch plush build that cushions shoulders and hips — easy softness at a price that makes sense. | Una construcción suave de 12.5 pulgadas que acolcha hombros y caderas — suavidad fácil a un precio razonable. | True plush surface; Everyday value |
| b2 | A no-nonsense 12.5-inch firm that keeps your spine aligned — dependable support night after night. | Un firme de 12.5 pulgadas sin rodeos que mantiene tu columna alineada — soporte confiable noche tras noche. | Straightforward firm feel; Everyday value |
| b3 | Thirty years of Kingdom Mattress family know-how in a euro-top hybrid engineered entirely in the USA. | Treinta años de experiencia familiar de Kingdom Mattress en un híbrido euro-top diseñado completamente en EE. UU. | Euro-top comfort layer; Built-to-last engineering |
| b4 | A firm hybrid engineered entirely in the USA by a 30-year family company — solid support at the best value in the store. | Un híbrido firme diseñado completamente en EE. UU. por una empresa familiar de 30 años — soporte sólido al mejor valor de la tienda. | Firm hybrid core; Best-value firm |
| b5 | 25% thicker center coils relieve shoulder and hip pressure — a side-sleeper favorite with real edge support. | Resortes centrales 25% más gruesos alivian la presión de hombros y caderas — favorito de quienes duermen de lado con soporte de borde real. | Shoulder-and-hip relief; 3-inch edge encasement |
| b6 | An extra-firm hybrid with 25% thicker center coils — maximum support at the most accessible price. | Un híbrido extra firme con resortes centrales 25% más gruesos — máximo soporte al precio más accesible. | Value extra-firm; Zoned hybrid core |
| b7 | A balanced medium innerspring with Restonic's thicker center coils — real quality at the friendliest price in the store. | Un colchón de resortes medio equilibrado con los resortes centrales más gruesos de Restonic — calidad real al precio más amigable de la tienda. | Responsive innerspring feel; Friendliest price |

## 3. What Lacks must author (currently missing — nothing below is populated)

For each model, for each feature the merchandising team confirms applicable,
Lacks must author a **product-specific reason**: one sentence explaining why
*this model's construction* serves *that customer need*, safe for a
salesperson to say aloud verbatim with the customer present. Each authored
reason requires **all** of:

| field | requirement |
|---|---|
| English copy | one sentence, product-specific, non-medical, non-buyer-characterising |
| Spanish copy | authored equivalent (not machine-translated), reviewed by a native speaker; same claim strength |
| Feature / customer-need applicability | confirmed by merchandising, not inferred from tags alone |
| Evidence / provenance | Lacks or official manufacturer source only (spec sheet, law tag, brand documentation); never aggregators |
| Reviewer / approver | the named Lacks owner signs off per reason |
| Last verified date | recorded per reason; re-verify on catalog change or age-out |

**Claim-safety ladder** (to be refined by the external claim-safety research
in the decision package): construction/material facts (safest — "graphite
latex over coil-on-coil") → feature-to-need mappings (need evidence the
feature does what the reason claims) → subjective promises ("you'll sleep
cooler" — avoid) → medical/therapeutic claims (**prohibited**).

### Table 3 — blank authoring matrix

"☐ applicable — EMPTY" marks cells where the model's **committed engine tags**
suggest the reason key applies — a starting point for merchandising to
confirm or strike, not a decision. "—" = tag not present. **No cell below may
be filled by engineering, by AI, or by copying `reason_default`.** Reminder:
the `reason_pressureRelief` and `reason_motionIsolation` columns are
engine-dead until Phase 3.1 regardless of content.

| id | reason_cooling | reason_pressureRelief | reason_motionIsolation | reason_support | reason_plush | reason_medium | reason_firm | reason_durability |
|---|---|---|---|---|---|---|---|---|
| g1 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| g2 | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY |
| g3 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| g4 | ☐ applicable — EMPTY | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — | — |
| g5 | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — |
| g6 | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY |
| g7 | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY |
| g8 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| g9 | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — |
| s1 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| s2 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — |
| s3 | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — | — |
| s4 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| s5 | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — |
| s6 | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — |
| s7 | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | — | — |
| s8 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — |
| s9 | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — |
| s10 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| b1 | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | — | — |
| b2 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| b3 | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY |
| b4 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | ☐ applicable — EMPTY |
| b5 | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — | — | — |
| b6 | — | — | — | ☐ applicable — EMPTY | — | — | ☐ applicable — EMPTY | — |
| b7 | — | — | — | ☐ applicable — EMPTY | — | ☐ applicable — EMPTY | — | — |

## 4. Proposed authoring schema and workflow (PROPOSAL — not wired into the pipeline)

**Authoring surface.** All content enters through
`incoming/lacks_mattresses.json` only. The chain
`incoming → build_lacks_workbook.py → Lacks_Store_Data.xlsx →
tools/convert_store_data.py → data/mattresses.csv(+ -es.csv) →
build-data.ps1 → data/mattresses.json` is lineage-pinned
(`tests/lineage_check.py`) and hook-guarded — hand-editing any generated
artifact fails CI. English per-feature reasons flow through this chain today
with **zero code changes**.

**One engineering prerequisite (its own reviewed change, before any Spanish
authoring):** `MATT_ES_KEYS` in `incoming/build_lacks_workbook.py:89-92` omits
the eight ES reason keys, so Spanish per-feature reasons placed in the `es`
block are **silently dropped** and no validator catches it. This one-line
extension plus a lineage-green rebuild must land first.

**Proposed per-reason record** (mirrors the house provenance pattern already
shipped for financing — `verifiedAt` + `maxAgeDays` + allowlisted
`sourceUrl`, fail-closed):

```json
"reasons": { "cooling": { "en": "…", "es": "…",
  "evidence": { "source": "<Lacks or manufacturer document/URL>",
                "sourceNote": "spec sheet / law tag / brand doc",
                "verifiedAt": "YYYY-MM-DD", "maxAgeDays": 365 },
  "approvedBy": "<named Lacks owner>", "esReviewedBy": "<native reviewer>" } }
```

The exact envelope shape is a design question for the implementation phase;
what is non-negotiable is the field set (both languages, evidence, approver,
date) and fail-closed behavior on staleness.

**Validators to design (NOT implemented in this sprint):** per-column EN↔ES
pairing; reason-key ⊆ model-features reachability; a copy-register lint
mirroring `tests/financing_copy_policy_check.mjs` (no medical vocabulary, no
buyer-characterising phrasing, no superlative/comparative claims without
evidence).

**Refinements from the external research pass** (claim-safety and
content-governance reports in the Phase 1 decision package):

- **Claim tiers** (rate every authored reason, per language, in display
  context): **A** verbatim construction facts from an allowlisted source ·
  **B** manufacturer performance claims with their qualifier intact (e.g.
  Tempur-Pedic's "up to 10° cooler" officially carries a vs.-their-own-model,
  test-method qualifier) · **C** "designed to" mechanism mappings — the
  intended voice for authored reasons · **D** outcome promises ("you'll sleep
  cooler") — prohibited · **E** health/therapeutic claims — prohibited
  (FTC substantiation doctrine covers implied claims; a reason under a
  "matched to you" frame is a stronger implied claim than spec-sheet text).
- **Spanish is tier-rated independently** (16 CFR 14.9: Spanish claims and
  qualifiers must stand on their own in Spanish) — ES review is
  claim-equivalence review, not translation QA.
- **Bilingual parity is a per-slot release gate:** an EN reason without a
  reviewed ES equivalent ships in **neither** language; the slot falls back
  to the bilingual generic default. Never EN-first-with-ES-backlog.
- **Curated V1 is legitimate:** 2–3 evidence-backed slots per model beats
  chasing all 208 cells — empty slots already fail closed to the default.
- **Cadence:** event-driven (catalog rescrape / lineup change triggers
  re-verification for affected models) with `maxAgeDays` ≈ 180–365 as the
  calendar backstop (exact value = merchandising question 7).
- **Retirement:** withdraw, don't delete — status `retired` + date + reason;
  build excludes it; the record stays for audit; ids are never reused.
- **Allowlist candidates for product-fact sources:** lacks.com, restonic.com,
  springair.com (incl. Chattam & Wells), tempurpedic.com/sealy.com, plus the
  Genesis official site once identified — never aggregators or review sites.

**Flagged existing catalog strings (review needed — NOT edited this sprint).**
Lead-verified present in `data/mattresses.json`; each pre-dates this rubric:

1. **g4 Tempur-LuxeBreeze 2.0 Soft** — "Feels up to 10° cooler" (highlight,
   topPickReason, differentiator) ships **without** the manufacturer's
   mandatory comparison qualifier (Tier B claim rendered unqualified).
2. **g9 Copper Cushion Firm** — "recovery benefits" (topPickReason) has no
   located support on springair.com (Tier D risk).
3. **g9** — "naturally fresher" / "a cleaner, cooler sleep" copper phrasing
   (differentiator, reason_default) is antimicrobial-adjacent (Tier B/E
   boundary; needs manufacturer language verification).

Whether these are grandfathered or hot-fixed is Blake's call, recorded in the
decision package.

**Workflow (roles and cadence):**

1. **Author** (Lacks merchandising) drafts EN reason per confirmed applicable
   cell, citing evidence.
2. **Evidence verifier** confirms the source is Lacks/manufacturer and current
   (the 2026-07-30 `incoming/lacks_catalog_selection.json` scrape is the
   existing SKU-stamped observation base; re-verify against the live floor).
3. **Spanish reviewer** (native) authors/reviews ES with equal claim strength.
4. **Approver** (the named Lacks owner) signs each reason; date recorded.
5. **Retirement:** when a model leaves the lineup its reasons leave with it in
   the same change; when construction changes, `verifiedAt` resets or the
   reason fails closed.
6. **Salesperson test before approval:** read the sentence aloud with a
   customer imagined present; if it cannot be said comfortably, it does not
   ship.

**Authoring priority recommendation:** start with low-frequency,
genuinely distinguishing tags — `motionisolation` (3 models), `responsive`
(3), `cooling` (6), then the feel trio (`plush`/`medium`/`firm`) — and treat
`hybrid` (21) and `support` (19) as last: near-universal tags reproduce the
template-duplication problem with authored words.

## 5. Questions requiring merchandising input

1. Which applicable cells should be authored first? (Recommendation above.)
2. Should `soft`, `zoned`, `hybrid`, `responsive` get reason columns at all
   (schema addition — engineering + Blake), or is the existing 8-column set
   the intended vocabulary?
3. `reason_pressureRelief` / `reason_motionIsolation` are engine-dead until
   Phase 3.1 — author now and hold, or defer those two columns?
4. Should any of the three authored-but-invisible fields (`firmnessLabel`,
   `displayBadges`, `reason_default`) ever render? Each is a standing trap
   today.
5. **Who is the named Lacks owner/approver for reason content?** (Decision
   requested from Blake in the decision package.)
6. Is the 2026-07-30 catalog scrape still representative of the floor lineup,
   or does evidence gathering start with a fresh walk?

## 6. Explicitly not done here

- No reason was authored, drafted, sampled or suggested — the matrix ships
  blank.
- No generic default was relabelled or repositioned as customer-specific.
- Nothing was wired into the generation pipeline; no validator was
  implemented; `MATT_ES_KEYS` was not changed.
- The 1.3 reason gate is not lifted, moved or reinterpreted by this document.
