# P9 — accessory catalog / copy decision packet (2026-08-30)

**For:** Blake Ford. **Source of the question:** item 3.7 audit decision list
P9 (`docs/accessory-recommendation-audit-2026-08-30.md`) and the owner
instruction of 2026-08-30: *confirm whether the named low-profile,
adjustable-fill and support alternatives are genuinely in the Lacks
assortment; if not, propose copy that names only products / categories
actually present. Do not invent inventory.*

**Status:** factual packet — read-only findings plus copy proposals for
Blake's decision. Nothing here is implemented; no product is added or
removed; no engine or copy change ships from this document. **Scope of the
evidence: repository artifacts only. The live lacks.com site and the store's
physical assortment were NOT checked.** Where this packet says "not in the
assortment" it means "not present in any catalog artifact committed to this
repository".

---

## 1. Findings — what the Lacks assortment in this repository contains

**The shipped accessory catalog is 10 items** (`incoming/lacks_accessories.json`
→ workbook `Accessories` tab → `data/accessories.json`; all three agree):

| Step | Items | Sub-type |
|---|---|---|
| Adjustability | BedTech BT2000 ($899), BedTech BT3000 Massage ($1,099), TEMPUR-Ergo 3.0 Power Base ($1,599) | `adjustable` ×3 |
| Support | Chattam & Wells Standard Foundation ($499) — a standard-height (9") foundation | `foundation` ×1 |
| Pillow | Bedgear Flow 2.0 Performance Pillow ($108), Gel Memory Foam Cool Pillow ($99) | blank ×2 |
| Protection | Bedgear Dri-Tec ($149), Bedgear iProtect ($89), Bedgear Ver-Tex Cooling ($249), TEMPUR-Protect ($189) | blank ×4 |

Direct answers to the three questions:

| Named in the app's copy or logic | In the Lacks assortment (repo)? | Evidence |
|---|---|---|
| **(a) a low-profile pillow** ("Try the low-profile option next…", "move to a lower profile", "Look for a lower profile…") | **No.** | Two pillows only; neither is low-profile / low-loft. `incoming/lacks_accessories.json` lines 26–37; workbook `Accessories` tab has 10 rows, `Sub-Type` blank for both pillows. |
| **(b) an adjustable-fill pillow** ("Try the adjustable-fill option next so the specialist can add loft…", "add loft or try adjustable fill") | **No.** | Neither pillow is adjustable-fill (Flow 2.0 is a fixed performance pillow; the gel pillow is one-piece gel memory foam). |
| **(c) support alternatives — a low-profile foundation and a bunkie board** (the support step's "Lower height" choice sorts `low_profile` first; the engine orders `foundation → low_profile → bunkie`) | **No.** | Exactly one non-adjustable support item exists; no `low_profile` and no `bunkie` row in the JSON, the workbook, or `data/accessories.json`. `tests/phase1_output_regression_check.mjs` lines 657–662 pin "support group is single-item on the shipped catalog". |

**Where the phantom products came from.** The copy strings, the `low_profile`
/ `bunkie` sort keys and — decisively — two hard-coded product ids in the
pillow-fit handler are **inherited WG&R template artifacts** that described
WG&R inventory (`git log -S`: introduced in `db46d4b`, the pre-Lacks WG&R
build). The WG&R catalog contained exactly the products the copy still
describes — *TEMPUR-Breeze ProLo 2.0 Pillow* (low-profile), *TEMPUR-Adapt
ProAdjust Pillow* (adjustable-fill), *WG&R Slate Low-Profile Foundation* and a
*WG&R Bunkie Board*. The Lacks build commit `5204888` deleted their images
and replaced the catalog with the 10 Lacks items, but did not update the copy
or the handler.

**The 2026-07-30 lacks.com scrape never recorded any of them.**
`incoming/lacks_catalog_selection.json` (`_meta`: "lacks.com
/api/rest/categories/mattresses/products + mattress-accessories, scraped
2026-07-30 via browser session") holds 12 accessory records: the 3 adjustable
bases, the 4 protectors, the 2 pillows that shipped, plus two sheet sets
(Bedgear Hyper-Cotton, Bedgear Dri-Tec Performance) and one mis-tagged
*Tempur-Protect Breeze Protector* — all three unshipped items are sheets or a
protector, none is a pillow, foundation or bunkie board. **No low-profile
pillow, adjustable-fill pillow, low-profile foundation or bunkie board was
scraped and dropped; the scrape simply never saw one.** Whether the store
stocks them physically is not answerable from the repository.

**A provenance gap worth knowing (not a P9 question, recorded for
completeness):** the *Chattam & Wells Standard Foundation* — the single
product the whole support step rests on — is the only accessory with **no
scrape record, no SKU and no image-URL provenance** in
`lacks_catalog_selection.json` / `fetch_lacks_images.py`. It is hand-added.

## 2. A behaviour finding the copy question exposed

The pillow-fit reaction handler (`index.html` ≈ lines 19301–19311,
`handleSleepSystemAction`, action `pillow-reaction`) does not look for a
low-profile or adjustable-fill product by attribute. It looks up **two
hard-coded ids that do not exist in the Lacks catalog**:

- reaction "Too low" → `pillow-tempur-proadjust` (the WG&R adjustable-fill pillow);
- reaction "Too high" → `pillow-tempur-breeze-prolo` (the WG&R low-profile pillow).

Both `find()`s return `undefined`, so `pillowCandidateId` falls back to the
pillow the customer is already holding. **On the floor: the specialist is told
"Try the adjustable-fill option next…" / "Try the low-profile option next…",
and the screen re-sorts the same pillow to the front.** The only two pillow
candidates are Flow 2.0 and the gel pillow, so no third product can appear.
The same two dead ids survive in `demo/black-friday/index.html`.

The support step behaves analogously: "Lower height" (`renderSupportGuide`,
`id: 'low'`) re-sorts a one-element array, so the customer who asks for a
lower bed is shown the same 9" standard foundation badged "Support option".

This is a copy-truth defect in the 1.4 surface (the app promises a product
that cannot be shown), not a 3.7 ranking question; it is listed here because
P9's copy remedy and this handler must change together or the copy will keep
lying by omission.

## 3. Options for Blake (no inventory invented)

**Option A — copy and handler name only what exists (recommended if the store
does not stock the alternatives).** Replace the four product-promising lines
with procedure lines that stay true on the shipped catalog, and make the
"Too low" / "Too high" reactions offer *the other* pillow in the catalog
(there are two) rather than a phantom third:

| Surface | Today (EN) | Proposed (EN) — provisional wording for Blake | Proposed (ES) — provisional, not native-reviewed |
|---|---|---|---|
| Pillow fit, reaction "Too low" (`renderPillowFit` feedback) | Try the adjustable-fill option next so the specialist can add loft, then record the fit again. | Try the other pillow on this mattress and compare the height, then record the fit again. | Prueba la otra almohada en este colchón y compara la altura; luego vuelve a registrar el ajuste. |
| Pillow fit, reaction "Too high" | Try the low-profile option next, then check whether the chin and neck return to neutral. | Try the other pillow on this mattress, then check whether the chin and neck return to neutral. | Prueba la otra almohada en este colchón y revisa si la barbilla y el cuello vuelven a neutral. |
| Specialist note, "too low" (`sleepSystemGuidance`, pillow) | If the customer says it feels too low, add loft or try adjustable fill, then retest. | If the customer says it feels too low, compare the other pillow, then retest. | Si el cliente dice que se siente muy baja, compara la otra almohada y vuelve a probar. |
| Specialist note, "too high" | If the customer says it feels too high, move to a lower profile, then retest. | If the customer says it feels too high, compare the other pillow, then retest. | Si el cliente dice que se siente muy alta, compara la otra almohada y vuelve a probar. |
| Position cue, stomach sleeper | Look for a lower profile that avoids neck strain. | Check that the neck stays level rather than bent upward. | Verifica que el cuello se mantenga nivelado y no doblado hacia arriba. |
| Support step, "Lower height" choice (`renderSupportGuide`) | Lower height — Easier entry or lower look | Remove the choice while the catalog carries one foundation height; or keep it and have it read: "Lower height — Ask a specialist about lower-height options" (a question, not a product). | Altura más baja — Pregunta a un especialista por opciones de menor altura |
| Handler `pillow-reaction` | seeks `pillow-tempur-proadjust` / `pillow-tempur-breeze-prolo` | choose the highest-ranked pillow in the group **other than** the current one (no product ids in code — the catalog decides) | — |

Everything above is copy / presentation on the 1.4 surface; it changes no
ranking, selection, grouping, step order or hero logic (so it is not a 3.7
output change), but it is customer-visible copy and therefore needs Blake's
approval of the exact EN strings, with ES provisional under the deferred
native-review ruling.

**Option B — add the products to the catalog (only if Lacks genuinely stocks
them).** If the store carries a low-profile pillow, an adjustable-fill pillow,
a low-profile foundation and/or a bunkie board, add them through
`incoming/lacks_accessories.json` with `subType: low_profile` / `bunkie` where
applicable, re-run `build_lacks_workbook.py` + `convert_store_data.py`, source
real images via the documented linqcdn technique, and give the pillow handler
attribute-based lookups instead of ids. **Prerequisite: confirmation of the
actual assortment from Lacks or the live catalog — not from this packet.**
Adding any product also changes the accessory engine's outputs (new items
enter the groups), which is a 3.7 step-4 approval item in its own right.

**Option C — both:** Option A now (the copy is false today regardless of what
the store stocks), Option B later if the assortment is confirmed.

**Recommendation:** Option C. The copy should stop naming products the app
cannot show as soon as Blake approves wording; whether to widen the catalog
is a separate, evidence-gated decision.

## 4. Owner ruling — Blake Ford, 2026-08-30: **Option C**

Correct the copy and the dead template-product behaviour now; widen the
catalog later only if Lacks confirms the real assortment. This packet and
the ruling land durably (docs-only PR) **before** the implementation PR.

**Approved English direction** (ES remains provisional pending native review):

| Surface | Approved EN |
|---|---|
| Pillow fit, reaction "Too low" | Try another pillow on this mattress and compare the height, then record the fit again. |
| Pillow fit, reaction "Too high" | Try another pillow on this mattress, then check whether your chin and neck feel neutral. |
| Specialist note, too low | If the pillow feels too low, compare another pillow, then retest. |
| Specialist note, too high | If the pillow feels too high, compare another pillow, then retest. |
| Stomach-sleeper cue | Check that the neck stays level rather than bending upward. |
| `pillow-reaction` handler | Replace the dead WG&R-id lookup with **the highest-ranked pillow other than the current pillow. No hard-coded product IDs.** |
| Support step, "Lower height" choice | **Remove the actionable choice while the catalog has only one foundation height.** |
| Support step, non-interactive specialist note (allowed) | If a lower finished bed height matters, ask which foundation heights are available. |

**Constraints of the ruling:** do not add products; do not claim inventory
availability; do not check the live assortment unless separately requested.
The implementation is a bounded PR from updated `main` with proper tests,
fixture treatment where an output moves, and regenerated outputs.

## 5. What this packet does not do

It does not verify the live lacks.com catalog or the store's physical
inventory; it does not add, remove or re-price any product; it does not
change copy; it does not touch the accessory engine. Every proposed string is
provisional until Blake approves the English and a native reviewer approves
the Spanish.
