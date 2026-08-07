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
- **Two of the eight reason keys are engine-dead regardless of content —
  and the mechanism is the reverse of what an earlier draft said.** The
  catalog stores `pressureRelief` / `motionIsolation` in camelCase
  (matching the quiz's score keys exactly), but `build-data.ps1:42`
  lowercases every feature tag and its kebab-to-camel restorer (:44-51)
  cannot fire on hyphen-less tags — so `data/mattresses.json` carries
  `pressurerelief`/`motionisolation` and the features guard at
  `index.html:13014` never passes for them. The reason KEYS themselves are
  already correct (`build-data.ps1:65-66` maps `reason_pressureRelief` →
  `pressureRelief`, matching the quiz key): the break is entirely on the
  features side, so a naive fix that lowercased the reason keys would break
  the half that currently works. **This is also a live scoring defect, not
  only a reason blocker**: the quiz options scoring `pressureRelief` (4
  option-instances) and `motionIsolation` (6) award zero points today. A
  data-only repair route exists (writing `pressure-relief`/`motion-isolation`
  in `incoming/lacks_mattresses.json` lets the existing restorer re-camel
  them with no code change) — but any repair alters scoring output and
  remains the Blake-gated Phase 3.1 decision; it must NOT be bundled into
  content or presentation work.

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
confirm or strike, not a decision. "—" = tag not present, **as document
shorthand only**: in the authoring record itself every cell's state must be
explicit (`approved` / `not_applicable` / `pending`), and `not_applicable`
is a recorded decision with a decider — never an unexplained blank or dash.
**No cell below may be filled by engineering, by AI, or by copying
`reason_default`.** Reminder: the `reason_pressureRelief` and
`reason_motionIsolation` columns are **Lane B** — engine-dead until Phase
3.1 regardless of content (see §4 authoring lanes).

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

**Fail-closed display rule (the governing rule of this brief, corrected
2026-08-07 per external review):**

> **A missing, stale, incomplete, invalid, or unapproved per-feature reason
> causes the personalized reason to be OMITTED — in both languages.**

There is **no fallback**. Not to `reason_default`, not to English, not to a
label, identifier or feature name, not to another feature's reason.
`reason_default` may never stand in for "why this mattress fits this
customer": it is customer-agnostic product copy, and presenting it in a
personalized slot would imply it was produced from the customer's answers —
which is exactly the misrepresentation the 1.3 gate exists to prevent. (An
earlier draft of this brief proposed falling back to the bilingual generic
default; that rule is withdrawn everywhere it appeared.)

If generic product copy is ever displayed at all, it must: occupy a
**separately labeled, customer-agnostic product-description surface** (the
prototypes' "Product description" layer is the demonstrated shape); never
appear in a personalized fit/reason slot; never imply derivation from the
customer's answers; and carry its **own** product/copy approval, separate
from any reason approval.

Two constraints make this a **rendering** rule, not a data rule:
`reason_default` cannot simply be emptied to force omission — it is
`required=True` in `tools/workbook_schema.py:263` and `tools/validation.py`
asserts on a blank value — so the field stays populated (to feed the
product-description surface) while the renderer omits it from any
personalized slot. And one standing trap must be defused before any wiring:
`index.html:8148-8175` styles a dead `.drawer-feature-bullets` surface whose
comment says it surfaces `m.reasons*` — no JavaScript creates it, and an
implementer following that comment would wire generic defaults into a
reason-shaped surface. It may not be reused without a config-driven,
separately-labeled decision (prerequisite 4).

**Authoring surface.** All content enters through
`incoming/lacks_mattresses.json` only. The chain
`incoming → build_lacks_workbook.py → Lacks_Store_Data.xlsx →
tools/convert_store_data.py → data/mattresses.csv(+ -es.csv) →
build-data.ps1 → data/mattresses.json` is lineage-pinned
(`tests/lineage_check.py`) and hook-guarded — hand-editing any generated
artifact fails CI. English per-feature reasons flow through this chain today
with **zero code changes**.

**Activation prerequisites — ALL of the following, each its own reviewed
change, before any authored reason renders to a customer.** (An earlier
draft named only the `MATT_ES_KEYS` fix; that alone is nowhere near
sufficient.)

1. **Exact key reachability**: every reason key resolves correctly against
   the engine's feature tags (today `MATT_ES_KEYS` in
   `incoming/build_lacks_workbook.py:89-92` omits the eight ES reason keys,
   so Spanish per-feature reasons are silently dropped; and the
   `pressureRelief`/`motionIsolation` features-side casing break makes
   those two keys unreachable regardless of content — note the reason KEYS
   are already correct, so the fix must target the features side only; see
   §1). Downstream of `MATT_ES_KEYS` the chain is already built and
   waiting: `tools/workbook_schema.py:272-281` declares all eight
   `reason_* (ES)` workbook columns, `tools/convert_store_data.py:159-183`
   derives ES CSV columns generically from the `" (ES)"` suffix,
   `data/mattresses-es.csv` already carries all eight headers (empty), and
   `build-data.ps1:163-167` merges them into `reasons_es` — which is why
   the extension is genuinely one line.
2. **A language-aware runtime consumer for `reasons_es`** — none exists at
   `78f949c` (`reasons_es` has zero references in `index.html`).
3. **Preservation of `matchReasons` (or its approved replacement) through
   the presentation view model** — today the engine's `matchReasons` return
   value is discarded at its only call site (`index.html:14505-14506`).
4. **Config-driven rendering in the correct surface**: reasons render only
   in the personalized-reason surface, never mixed into the
   product-description layer, and the rendering is config/data-driven, not
   hardcoded.
5. **Validation of EN/ES pair completeness** per slot (a slot with one
   language missing is invalid → omitted in both).
6. **Behavioral tests proving both languages render** the approved content.
7. **Omission tests** proving missing, stale, incomplete, invalid and
   unapproved slots render **nothing** in the personalized surface — in
   both languages.
8. **Evidence and approval metadata present and validated** per the record
   schema below (fail-closed on absence or staleness).
9. **No-fallback verification**: explicit tests that no code path
   substitutes labels, identifiers, English, another feature's reason, or
   `reason_default` into a personalized slot. One concrete existing
   carrier to prohibit by name: `mField()` at `index.html:11148` returns
   `m[field]` (English) when the `_es` side is falsy — the natural
   per-field pattern would silently serve English reasons to a Spanish
   customer; reasons must not flow through that fallback.
10. **Explicit confirmation that Phase 3-gated scoring keys remain
    inactive**: activating content must not activate
    `pressureRelief`/`motionIsolation` scoring, the Phase 3.1 casing fix, or
    any schema addition — those stay Blake-gated scoring/schema decisions.

**Proposed per-reason record** (mirrors the house provenance pattern already
shipped for financing — `verifiedAt` + `maxAgeDays` + allowlisted
`sourceUrl`, fail-closed). Expanded 2026-08-07 per external review — each
authored reason carries **all** of:

| field | content |
|---|---|
| `productId` | stable product/model/SKU identifier (catalog `id`; ids are never reused) |
| `reasonKey` | the exact feature/reason key (e.g. `cooling`) |
| `en` | the English reason |
| `es` | the Spanish reason (authored, never machine-translated) |
| `applicability` | **`approved` / `not_applicable` / `pending`** — every cell state is explicit; "not applicable" is a recorded decision with the decider, never an unexplained blank or dash |
| `evidence.sourceUrl` | Lacks or official-manufacturer URL/document (allowlisted hosts only) |
| `evidence.excerpt` | short evidence excerpt or description of what the source states |
| `claimClass` | the A–E claim-tier rating (per language — see the ladder below) |
| `scope` | product/model/size scope the claim holds for |
| `author` | who drafted it |
| `businessApprover` | the named Lacks owner who signed it off |
| `esReviewer` | the native Spanish reviewer |
| `legalReviewer` | legal/compliance reviewer, **required** for Tier B claims and anything health-adjacent |
| `approvalStatus` | draft / in-review / approved / rejected |
| `approvedAt` / `esApprovedAt` | approval timestamps |
| `reviewBy` / `maxAgeDays` | re-verification date or maximum age (fail-closed on expiry) |
| `retired` / `retiredReason` | retirement status and reason (withdraw, don't delete) |
| `notes` | free-form authoring notes |

```json
"reasons": { "cooling": {
  "productId": "g5", "reasonKey": "cooling",
  "en": "…", "es": "…",
  "applicability": "approved",
  "evidence": { "sourceUrl": "<Lacks or manufacturer document/URL>",
                "excerpt": "<what the source actually states>",
                "sourceNote": "spec sheet / law tag / brand doc",
                "verifiedAt": "YYYY-MM-DD", "maxAgeDays": 365 },
  "claimClass": { "en": "C", "es": "C" },
  "scope": "all sizes",
  "author": "<name>", "businessApprover": "<named Lacks owner>",
  "esReviewer": "<native reviewer>", "legalReviewer": null,
  "approvalStatus": "approved",
  "approvedAt": "YYYY-MM-DD", "esApprovedAt": "YYYY-MM-DD",
  "reviewBy": "YYYY-MM-DD",
  "retired": false, "retiredReason": null, "notes": "" } }
```

The exact envelope shape is a design question for the implementation phase;
what is non-negotiable is the field set above and fail-closed behavior
(omission, both languages) on any missing, stale, incomplete, invalid or
unapproved field.

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
  reviewed ES equivalent ships in **neither** language — the slot is
  **omitted** (the fail-closed display rule above; the earlier
  falls-back-to-default wording is withdrawn). Never
  EN-first-with-ES-backlog.
- **Curated V1 is legitimate:** 2–3 evidence-backed slots per model beats
  chasing all 208 cells — empty slots fail closed **by omission**: the
  personalized reason simply does not render, and no generic copy takes its
  place in that slot.
- **Cadence:** event-driven (catalog rescrape / lineup change triggers
  re-verification for affected models) with `maxAgeDays` ≈ 180–365 as the
  calendar backstop (exact value = merchandising question 7).
- **Retirement:** withdraw, don't delete — status `retired` + date + reason;
  build excludes it; the record stays for audit; ids are never reused.
- **Allowlist candidates for product-fact sources:** lacks.com, restonic.com,
  springair.com (incl. Chattam & Wells), tempurpedic.com/sealy.com, plus the
  Genesis official site once identified — never aggregators or review sites.

**Existing catalog claim risk (reframed in the focused pass — NOT edited
this sprint).** An earlier head presented "four flagged existing catalog
strings" as the claim-review scope. That formulation was wrong twice over: those four
(g4 unqualified "10° cooler"; g9 "recovery benefits"; g9
antimicrobial-adjacent copper phrasing; b5 "a proven pick for side
sleepers") were **initial high-risk examples found during the prototype
audit — not an exhaustive legal/content review** — and the earlier claim
that only b5 renders in production was also false: **all four render in
production surfaces today** (g4 and g9 topPickReasons on Results cards; g4
and g9 differentiator strings in the drawer and compare "Difference" row;
b5 on Results cards). An external spot-check immediately found
further unflagged material claims (g2 "The most luxurious plush in the
store", g5 "Proven all-night cooling", g7 "the most versatile bed in the
Reserve line", g8 segment targeting, s7 performance promise, s9 partner
claims, s10 "best price in its class"-class value claims, among others).

The **Appendix — preliminary claim-risk inventory** below therefore reads
every customer-visible string in `topPickReason`, `reason_default`,
`highlight`, and the differentiator titles/details, across all 26 models
and both languages, and classifies each flagged string under the A–E
ladder. It is a **preliminary risk inventory for the named owner and
legal/compliance reviewer — not a legal approval and not a content edit**;
regex screening generated candidates, but every string was read
individually. Disposition of every row (grandfather, hot-fix, re-qualify,
or retire) belongs to the named Lacks owner with legal review where the
class requires it.

Direct consequence for the Phase 1 candidates: because `topPickReason` is
not established claim-safe customer-agnostic copy, the corrected Results
candidate renders **no product-description layer** — no catalog field is
approved as that surface's source, and inventing replacement copy is
prohibited.

**Workflow (roles and cadence):**

1. **Author** (Lacks merchandising) drafts EN reason per confirmed applicable
   cell, citing evidence.
2. **Evidence verifier** confirms the source is Lacks/manufacturer and current
   (the 2026-07-30 `incoming/lacks_catalog_selection.json` scrape is the
   existing SKU-stamped observation base; re-verify against the live floor).
3. **Spanish reviewer** (native) authors/reviews ES with equal claim strength.
4. **Approver** (the named Lacks owner) signs each reason; date recorded.
5. **Retirement:** when a model leaves the lineup its reasons leave with it in
   the same change; when construction changes, the reason is **omitted in
   both languages until re-verified and re-approved** (`verifiedAt` resets).
6. **Salesperson test before approval:** read the sentence aloud with a
   customer imagined present; if it cannot be said comfortably, it does not
   ship.

**Authoring priorities — two lanes (corrected 2026-08-07; the earlier
recommendation to start with `motionisolation`/`responsive` was wrong: one
is engine-dead until Phase 3.1 and the other has no reason column at all).**

**Lane A — actionable now (current-schema, engine-live keys):** `cooling`
(6 models — the most differentiating live key), then the feel trio
(`plush` / `medium` / `firm`), then `durability` and `support`. Within Lane
A, still author the low-frequency, genuinely distinguishing cells first and
treat near-universal tags (`support` 19) as last: near-universal tags
reproduce the template-duplication problem with authored words.

**Lane B — gated or schema-undecided (do NOT author as the first batch):**
`motionIsolation` and `pressureRelief` (engine-dead until the Phase 3.1
casing fix — a Blake-gated scoring change), and `responsive`, `hybrid`,
`soft`, `zoned` plus the quiz-only tags (no reason column exists — a
schema addition, engineering + Blake). Authoring Lane B before its
scoring/schema decision produces content that cannot render, invites
pressure to bundle gated engine changes into content work, and risks
authoring against a vocabulary that the schema decision then changes.
Lane B waits for its corresponding decision.

## 5. Questions requiring merchandising input

1. Which Lane A cells should be authored first? (Lane recommendation in §4:
   `cooling`, then the feel trio, low-frequency cells first.)
2. Should `soft`, `zoned`, `hybrid`, `responsive` get reason columns at all
   (schema addition — engineering + Blake)? Until decided, these are
   **Lane B** and are not authored.
3. `reason_pressureRelief` / `reason_motionIsolation` are engine-dead until
   Phase 3.1 — **Lane B**: they wait for the scoring decision rather than
   being authored-and-held (see §4 for why author-and-hold is rejected).
4. Should either authored-but-invisible field `firmnessLabel` or
   `displayBadges` ever render? Each is a standing trap today. For
   `reason_default` the question is narrower and pre-constrained: it may
   **never** occupy a personalized fit/reason slot or appear under a
   "matched to you" frame (the fail-closed rule, §4) — the only open
   question is whether a separately labeled customer-agnostic
   product-description surface should exist for it, and who approves that
   surface's copy.
5. **Who is the named Lacks owner/approver for reason content?** (Decision
   requested from Blake in the decision package.)
6. Is the 2026-07-30 catalog scrape still representative of the floor lineup,
   or does evidence gathering start with a fresh walk?
7. What `maxAgeDays` backstop should construction-claim provenance carry —
   180 or 365 days? (Verification labor vs the risk of an uncaught spec
   change shipping under the same model name; referenced by the cadence
   bullet in §4.)

## 6. Explicitly not done here

- No reason was authored, drafted, sampled or suggested — the matrix ships
  blank.
- No generic default was relabelled or repositioned as customer-specific.
- Nothing was wired into the generation pipeline; no validator was
  implemented; `MATT_ES_KEYS` was not changed.
- The 1.3 reason gate is not lifted, moved or reinterpreted by this document.


---

## Appendix — preliminary claim-risk inventory (focused pass, 2026-08-07)

**PRELIMINARY RISK INVENTORY — NOT A LEGAL REVIEW, NOT A CONTENT EDIT.**
Produced read-only from `data/mattresses.json` at `78f949c`. All **364
strings (182 EN/ES pairs)** in `topPickReason` (52), `reason_default` (52),
`highlight` (52), `differentiators[].title` (104) and
`differentiators[].detail` (104) across all 26 models were extracted by
script and **read individually** — regex screening generated candidates,
but every string was inspected, including those without trigger words.
Classification uses the A–E ladder in §4. Disposition of every row
(grandfather, hot-fix, re-qualify, retire) belongs to the named Lacks owner
with legal review where the class requires it.

**Bottom line.** 83 of 182 pairs (45.6%) carry a claim a reviewer must rule
on; **24 are Tier D/E and render in production today**. The four strings
the package originally flagged are a subset of those 24, not the set. The
durable framing (deliberately not a count, which any stricter reviewer
would move): **the catalog was authored before the claim ladder existed,
so NO string in it carries an evidence record, and the whole of
`topPickReason` and the differentiators require a claim-safety pass before
Phase 1 promotes either field to any new surface.** This is why the
corrected Results candidate renders no product-description layer.

### Verified render surfaces (corrections to earlier statements)

- `topPickReason` renders **only** on production Results cards
  (index.html:14085, :14164) — not on handoff or compare (both prefer
  `priorities[0]`).
- Differentiators render in the drawer (:19216) and — index 0 — in the
  compare modal "Difference" row (:18897).
- `highlight` renders **NOWHERE** in production (its only call sites are
  fallbacks that never fire: `hf2ReasonFor` is guarded by
  `buildMattressPriorities(m).length`, non-empty for all 26 models, and
  the :17196 differentiator fallback never fires — all 26 have authored
  differentiators). It joins `reason_default` in the
  authored-but-invisible class.
- **All four originally flagged strings render in production** (an earlier
  head said only b5 did): g4/g9 topPickReasons on Results cards; g4/g9
  differentiator strings in drawer + compare; b5 on Results cards.

### Internal contradictions (provable from the catalog alone)

1. Four mutually exclusive price/value-leadership claims: b4 "the best
   value in the store", b7 "the friendliest price in the store", s10 "the
   best price in its class", b6 "the most accessible price" — while
   `price` is blank by design and the app never shows one.
2. Two colliding "firmest" claims: g8 "the firmest luxury option in the
   store" (firmness 8) vs s2 "The firmest Platinum" (also 8, also
   luxury-positioned).
3. One feature, two incompatible quantifications: Marvelous Middle is
   "25% more support" (s1) and "25% thicker center coils" (s3, s4, s8,
   s10, b5, b6); "25% more support" is in no measurable unit.
4. The catalog disparages constructions it sells: s5 vs the b7 innerspring;
   s4 vs the s10 tight-top.

### Block A — Tier D/E, renders in production (24 rows)

Legend — prod: R = Results cards · D = drawer · D+C = drawer + compare
Difference row · — = renders nowhere. proto: Y = the pre-correction
prototype promoted it (topPickReason on lead cards, or card-face
differentiators before fix T3/G3); n/c = model outside the 18-model
fixture coverage. ES sides are claim-equivalent unless listed under
"Spanish divergences".

| # | model · field | EN excerpt | class | why flagged | prod | proto | evidence/reviewer | status |
|---|---|---|---|---|---|---|---|---|
| A1 | g5 · topPickReason | "Proven all-night cooling…" | D | express substantiation word + unqualified duration promise (same defect class as the flagged b5, previously unflagged) | R | n/c | Tempur-Pedic + legal | prohibited_pending_evidence |
| A2 | b5 · topPickReason | "…a proven pick for side sleepers." | D | original flag #4 | R | Y | legal | prohibited_pending_evidence |
| A3 | g9 · topPickReason | "Copper cooling and recovery benefits…" | D/E | original flag #2; therapeutic-adjacent | R | n/c | Spring Air + legal | prohibited_pending_evidence |
| A4 | g4 · topPickReason | "The coolest-sleeping soft mattress in the store — up to 10° cooler all night." | B→D | store-wide superlative AND the Tier B claim stripped of its qualifier and extended to "all night" (stronger than flag #1 recorded) | R | n/c | Tempur-Pedic + legal | prohibited_pending_evidence |
| A5 | s9 · topPickReason | "…wrapped coils that keep partner movement on their side." | D | absolute motion-isolation promise | R | Y | Restonic + legal | prohibited_pending_evidence |
| A6 | s10 · topPickReason | "…at the best price in its class." | D | price leadership, class undefined, no price shown in app | R | Y | merch + legal | prohibited_pending_evidence |
| A7 | g8 · topPickReason | "…the choice for back and stomach sleepers who want luxury." | D | definite-article segment prescription | R | Y | merch + legal | review_required |
| A8 | g2 · topPickReason | "The most luxurious plush in the store…" | D | store-wide subjective superlative | R | Y | merch | review_required |
| A9 | g7 · topPickReason | "…the most versatile bed in the Reserve line." | D | line superlative, unsubstantiable as worded | R | Y | Restonic/merch | review_required |
| A10 | s7 · topPickReason | "Soft, cooling pressure relief — plush without the heat." | D | efficacy claim + absolute thermal promise | R | Y | Restonic | review_required |
| A11 | b1 · topPickReason | "Honest plush comfort for side sleepers…" | D | segment targeting on a lead card | R | Y | merch | review_required |
| A12 | b5 · differentiators[0] | "Shoulder-and-hip relief" + "…target exactly where side sleepers ache." | E | pain claim + segment + absolute "exactly" — stronger than the b5 string the brief did flag, and previously unflagged | D+C | Y | legal | prohibited_pending_evidence |
| A13 | s9 · differentiators[0].detail | "Each coil moves alone, so a restless partner doesn't wake you." | D | outcome promise about the customer's sleep | D+C | Y | Restonic + legal | prohibited_pending_evidence |
| A14 | s2 · differentiators[1].detail | "…keeps hips level in every position." | D/E | absolute universal anatomical promise | D | Y | Restonic + legal | prohibited_pending_evidence |
| A15 | s5 · differentiators[1].detail | "Keeps your spine aligned…" | E | spinal-alignment health claim | D | n/c | legal | prohibited_pending_evidence |
| A16 | g8 · differentiators[0].detail | "…the firmest luxury option in the store." | D | store-wide superlative contradicted by the catalog itself (s2) | D+C | Y | merch | prohibited_pending_evidence |
| A17 | g3 · differentiators[1].detail | "Tufting locks the layers so the pillowtop can't shift or pocket over years of use." | D | absolute negative durability promise; warranty-adjacent | D | Y | Chattam & Wells | prohibited_pending_evidence |
| A18 | g9 · differentiators[0].detail | "…stay naturally fresher than standard foam." | B/E | original flag #3, antimicrobial-adjacent | D+C | n/c | Spring Air + legal | prohibited_pending_evidence |
| A19 | g4 · differentiators[0].title | "Feels up to 10° cooler" | B | original flag #1, no qualifier; unit unstated (see Spanish divergences) | D | n/c | Tempur-Pedic | prohibited_pending_evidence |
| A20 | g4 · differentiators[0].detail | "…you can feel the moment you lie down — made for hot sleepers." | D | outcome promise + segment | D+C | n/c | Tempur-Pedic | review_required |
| A21 | g2 · differentiators[0].detail | "…for side sleepers who want cloud comfort without bottoming out." | D | segment + absolute performance | D+C | Y | merch | review_required |
| A22 | s7 · differentiators[0].detail | "Gel-infused foam keeps the soft layers from trapping heat." | D | absolute thermal promise | D+C | Y | Restonic | review_required |
| A23 | s7 · differentiators[1].detail | "Hybrid coils prevent the hammock feel of all-foam soft beds." | D | absolute + category disparagement | D | Y | Restonic | review_required |
| A24 | s3 · differentiators[1].detail | "Individually wrapped coils isolate motion and firm up under your hips." | D | absolute "isolate" + anatomical | D | Y | Restonic | review_required |

### Block B — Tier B/D: comparatives, durability, price, popularity (38 rows)

| # | model · field | EN excerpt | class | why flagged | prod | proto | evidence/reviewer | status |
|---|---|---|---|---|---|---|---|---|
| B1 | g6 · reason_default | "…built by Restonic craftspeople to last a lifetime." | D | strongest lifespan promise in the catalog | — | n/c | Restonic + legal | prohibited_pending_evidence |
| B2 | g3 · reason_default | "…engineered to hold for decades." | D | multi-decade lifespan promise | — | n/c | C&W | prohibited_pending_evidence |
| B3 | g7 · differentiators[1].detail | "…built to outlast foam-only beds." | D | comparative durability vs a whole category | D | Y | Restonic | prohibited_pending_evidence |
| B4 | s1 · reason_default | "Patented Marvelous Middle delivers 25% more support… where your body needs it most." | B/D | patent claim + quantified claim in no measurable unit + physiological assertion | — | n/c | Restonic + legal | prohibited_pending_evidence |
| B5 | b4 · reason_default | "…the best value in the store." | D | store-wide value leadership; conflicts B6/B7/A6 | — | n/c | merch + legal | prohibited_pending_evidence |
| B6 | b7 · reason_default | "…the friendliest price in the store." | D | store-wide price leadership; conflicts B5 | — | n/c | merch + legal | prohibited_pending_evidence |
| B7 | b6 · reason_default | "…at the most accessible price." | D | price leadership; conflicts B5/B6 | — | Y | merch | review_required |
| B8 | g7 · reason_default | "…luxury that works for almost every sleeper." | D | universal-suitability claim, in tension with the fit-quiz premise | — | n/c | merch | review_required |
| B9 | g2 · reason_default | "…softness that never loses its support." | D | absolute durability | — | n/c | C&W | review_required |
| B10 | g8 · differentiators[1].detail | "…keep the firm feel from softening early." | D | durability promise | D | Y | Restonic | review_required |
| B11 | s10 · differentiators[1].detail | "…protect the firm feel from early body impressions." | D | body impressions = the standard warranty failure mode | D | Y | Restonic + legal | review_required |
| B12 | b4 · differentiators[1] | "Best-value firm" + "The most affordable true firm hybrid in the lineup." | D | price superlative in both halves | D | n/c | merch | review_required |
| B13 | b7 · differentiators[1] | "Friendliest price" + "The most affordable way into a zoned Restonic build." | D | price superlative in both halves | D | Y | merch | review_required |
| B14 | b4 · highlight | "…at the best value" | D | value leadership | — | n/c | merch | review_required |
| B15 | b7 · highlight | "…at the friendliest price" | D | price leadership | — | n/c | merch | review_required |
| B16 | b1 · differentiators[1].detail | "Restonic quality without the Platinum price." | B/D | asserts quality parity with the retailer's own higher tier; undercuts the tier structure | D | Y | merch | review_required |
| B17 | s10 · reason_default | "…maximum alignment without the luxury price tag." | B/D | same family as B16 | — | n/c | merch | review_required |
| B18 | s6 · reason_default | "…in the feel most sleepers pick." | D | popularity claim, no data | — | n/c | merch | review_required |
| B19 | s6 · differentiators[0] | "Crowd-pleasing medium" + "The feel most couples agree on…" | D | popularity claim, no data | D+C | Y | merch | review_required |
| B20 | b5 · reason_default | "…relieve shoulder and hip pressure — a side-sleeper favorite…" | D/E | anatomical efficacy + popularity | — | n/c | Restonic + legal | review_required |
| B21 | s1 · differentiators[0].detail | "25% more support under hips and lower back, where most beds sag first." | B/D | quantified claim + market-wide disparaging durability generalization | D+C | Y | Restonic | review_required |
| B22 | s8 · differentiators[1].detail | "…holds hips level where beds break down first." | D | anatomical absolute + market disparagement | D | n/c | Restonic | review_required |
| B23 | g6 · differentiators[0].detail | "…natural materials most factory beds skip." | B/D | market-wide generalization | D+C | Y | Restonic | review_required |
| B24 | b6 · differentiators[1].detail | "Center-third reinforcement most value firm beds skip." | B/D | same family as B23 | D | Y | Restonic | review_required |
| B25 | g1 · differentiators[0].detail | "Merino wool, camel hair, and cashmere breathe and temper heat in a way synthetic foams can't." | B/D | absolute category-superiority thermal claim; also names camel hair, which appears nowhere else in g1's copy | D+C | Y | C&W | review_required |
| B26 | g2 · differentiators[1].detail | "…keep the plush layers cooler than dense foam pillow-tops." | B | comparative thermal claim, no test method | D | Y | C&W | review_required |
| B27 | g5 · differentiators[0].detail | "Noticeably cooler on contact than standard TEMPUR models." | B | comparative vs the manufacturer's own line without the manufacturer's qualifier | D+C | n/c | Tempur-Pedic | review_required |
| B28 | g3 · differentiators[0].detail | "Several times the coil count of a standard bed…" | B | quantified comparative, referent undefined | D+C | Y | C&W | review_required |
| B29 | s5 · differentiators[0].detail | "Adds cooling comfort a plain firm innerspring doesn't have." | B/D | disparages a category the catalog sells (b7) | D+C | n/c | merch | review_required |
| B30 | s4 · differentiators[0].detail | "…without the bare, hard feel of a tight-top firm." | B | disparages a construction the catalog sells (s10) | D+C | n/c | merch | review_required |
| B31 | s3 · differentiators[0].detail | "…more depth than a standard plush." | B | referent undefined | D+C | Y | Restonic | review_required |
| B32 | b4 · differentiators[0].detail | "…more responsive than foam value beds." | B | category comparative | D+C | n/c | Genesis | review_required |
| B33 | b5 · differentiators[1].detail | "…a bigger usable sleep surface than value plush beds." | B | category comparative | D | Y | Restonic | review_required |
| B34 | s6 · differentiators[1].detail | "…the memory-foam warmth common in medium beds." | B | category generalization | D | Y | Restonic | review_required |
| B35 | g1 · differentiators[1].detail | "…instead of the slow sink of memory foam." | B | category disparagement | D | Y | C&W | review_required |
| B36 | s9 · differentiators[1].detail | "…without the deep sink of memory-foam beds." | B | category disparagement | D | Y | Restonic | review_required |
| B37 | s2 · differentiators[0].detail | "Noticeably firmer than the Paige Firm — for sleepers who want no sink at all." | B/D | the comparative is factual (8 vs 7) but "no sink at all" is absolute | D+C | Y | Restonic | review_required |
| B38 | b7 · topPickReason | "…the smart starter pick." | C/D | buyer-characterising — the roadmap already struck "Bronze · entry-level" for exactly this | R | Y | merch | review_required |

### Block C — apparently factual, needs a Class A source record (21 rows)

| # | model · field | EN excerpt | class | why flagged | prod | proto | evidence/reviewer | status |
|---|---|---|---|---|---|---|---|---|
| C1 | g3 · highlight, topPickReason, diff[0] | "4,294 coils" ×3 | A | precise spec repeated in 3 fields; one source, three exposure points | R, D+C | Y | C&W spec sheet | apparently_factual_pending_owner_review |
| C2 | s1,s3,s4,s8,s10,b5,b6 · multiple | "25% thicker center coils" / "25% more support" | A/B | 9 occurrences of one manufacturer figure stated two incompatible ways | R, D+C | Y | Restonic | review_required |
| C3 | g2 · highlight | "16.5 inches of luxury" + "Our most indulgent plush" | A/D | dimensional spec + store-scoped superlative | — | n/c | C&W | review_required |
| C4 | s1 · highlight, diff[1] | "16-inch box top" ×2 | A | dimensional spec | — | Y | Restonic | apparently_factual_pending_owner_review |
| C5 | s3 · reason_default | "15-inch plush box top" | A | dimensional spec | — | n/c | Restonic | apparently_factual_pending_owner_review |
| C6 | s3,s4,b5 · multiple | "3-inch edge encasement" ×4 | A | dimensional spec | D+C | Y | Restonic | apparently_factual_pending_owner_review |
| C7 | b1,b2 · reason_default | "12.5-inch" ×2 | A | dimensional spec | — | n/c | Restonic | apparently_factual_pending_owner_review |
| C8 | b3,b4 · reason_default, diff[1] | "Thirty years" / "30-year family company" ×3 | A | company-age claim | D | n/c | Genesis/Kingdom | apparently_factual_pending_owner_review |
| C9 | b3 · highlight, reason_default | "engineered in the USA" / "engineered entirely in the USA" | A/B | origin claim — FTC Made-in-USA enforcement is strict; ES differs (below) | — | n/c | Genesis + legal | prohibited_pending_evidence |
| C10 | b4 · reason_default | "engineered entirely in the USA" | A/B | same as C9 | — | n/c | Genesis + legal | prohibited_pending_evidence |
| C11 | g6 · highlight | "Hand-made in Texas" | A/B | state-of-origin claim; ALSO load-bearing for the +25 locally-made scoring bonus, whose current basis is a verbal attribution (Blake, 2026-07-30), not a document | — | n/c | Restonic + legal | prohibited_pending_evidence |
| C12 | g6 · topPickReason | "made regionally by Restonic" | A/B | softer origin claim, same evidence need | R | Y | Restonic | apparently_factual_pending_owner_review |
| C13 | g9 · reason_default | "Patented NatuVerex copper fabric" | A/B | patent claim — false patent marking is its own liability | — | n/c | Spring Air + legal | prohibited_pending_evidence |
| C14 | g4 · reason_default | "Tempur-Pedic's coolest mattress" | B | brand-line superlative, checkable | — | n/c | Tempur-Pedic | apparently_factual_pending_owner_review |
| C15 | s2 · topPickReason | "The firmest Platinum" | B | factual within catalog but collides with A16 | R | Y | merch | apparently_factual_pending_owner_review |
| C16 | g8 · reason_default | "The firmest bed in the Reserve line…" | B | factual within catalog; + segment tail | — | n/c | Restonic | apparently_factual_pending_owner_review |
| C17 | b6 · differentiators[0].detail | "The firmest feel in the bronze tier — no plush give at all." | B/D | superlative factual (b6=8, bronze max); "no plush give at all" absolute | D+C | Y | merch | apparently_factual_pending_owner_review |
| C18 | b1 · differentiators[0].detail | "Softer than the Gracie…" | B | factual (3 vs 5) but names a SKU the customer may not have on screen | D+C | Y | merch | apparently_factual_pending_owner_review |
| C19 | g1 · topPickReason, reason_default | "firm, breathable… support" / "support that breathes and lasts" | C/D | thermal mechanism unqualified + durability | R | Y | C&W | review_required |
| C20 | g5 · highlight, reason_default | "All-night cooling" / "true TEMPUR pressure relief" | B/D | duration promise + efficacy assertion | — | n/c | Tempur-Pedic | review_required |
| C21 | s5,s9,s7,b5,b2,b1,s8 · reason_default/highlight | "pressure relief", "absorbs a partner's movement", "stays still all night", "keeps your spine aligned", "cushions shoulders and hips", "support your hips and lower back" | C/D/E | 8 efficacy/anatomical assertions in never-rendering fields — exactly the strings most likely to be lifted verbatim if reason_default ever gains a surface | — | n/c | Restonic + legal | review_required |

### Spanish divergences (claim-equivalence review, not translation QA)

1. **The "10°" claim carries no unit in either language** (g4 highlight,
   topPickReason, diff[0].title). EN-US readers default to Fahrenheit; a
   Spanish-speaking RGV customer plausibly reads "10° más fresco" as
   Celsius — nearly double the manufacturer's claim. Under 16 CFR §14.9
   the Spanish claim stands on its own, and as written it stands on its
   own as a much larger claim.
2. b3/b4: "engineered in the USA" → "diseñado en EE. UU." — *diseñado* =
   "designed", a different origin claim.
3. g9: "stay naturally fresher" → "se mantienen naturalmente más frescas" —
   *fresco* reads primarily as *cooling* in ES, partly losing the
   cleanliness implication; the two languages make different claims.
4. g7: "works for almost every sleeper" → "funciona para casi todos" — ES
   drops "sleeper", broadening to people generally.
5. s10: "at a working price" → "a un precio accesible" — EN register word
   vs ES mild affordability claim.

No ES side is untranslated or machine-artifacted. Retained English brand/
industry terms (euro-top, box top, Marvelous Middle, Breeze, Pure Cool)
are appropriate; *cushion-firm* (g9, ×4) reads least naturally unglossed.

### Inspected and deliberately not flagged (99 of 182 pairs)

Representative sample, so this inventory is auditable as a full read
rather than a trigger-word sweep: g1 highlight (material list, no
promise); s1/s3/s5 topPickReasons and highlights (construction
description only); s6 topPickReason ("The balanced pick" — positioning,
not leadership); b2 "at an everyday price" (claims no rank); b3
diff[0].detail (intra-catalog construction fact); g5 diff[1].detail
("adds airflow and a touch of responsiveness" — the hedged Class C voice
this brief recommends, and the best-written line in the catalog for that
purpose); 46 of 52 differentiator titles are pure construction/feel nouns.

### Status totals

18 prohibited_pending_evidence · 53 review_required · 12
apparently_factual_pending_owner_review = 83 flagged pairs. The dump can
be regenerated any time from `data/mattresses.json` (the five fields
above, 26 models, both languages).
