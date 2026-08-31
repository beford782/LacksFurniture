# Owner asset request — North Star media foundation (D2, 2026-08-31)

**For:** Blake Ford. **Ruling:** North Star directive 2026-08-31, decision D2
(approved: prepare the owner asset request; do **not** check the live
assortment without permission — none was checked). **Status:** a request for
owner-supplied source files only. Nothing here blocks the runtime banner
fallback or any prototype; code-side presentation ships separately and this
document records exactly what code cannot repair.

Every fact below was measured from the shipped `images/` tree and its
`incoming/images/` sources at `main` `e446551` (dimensions, aspect ratios,
byte hashes). New files must come from Lacks-owned or Lacks-supplied product
sources — never fabricated, hand-cropped from other photos, or taken from a
third party — and must enter through the canonical pipeline
(`incoming/images/…` → `tools/convert_store_data.py`, which normalises to
JPEG q88 and caps the long edge at 1000px). Roughly 2000px-wide sources are
preferred so a DPR-2 hero stays crisp after the cap is raised for C2; 1000px
is the working minimum.

## 1. Tempur-Pedic banner crops → proper 3:2 re-exports (highest impact)

| id | Model | Shipped file | Size | AR |
|---|---|---|---|---|
| g4 | Tempur-LuxeBreeze 2.0 Soft | `images/mattresses/tempur-luxebreeze 2.0 soft.jpg` | 1000×247 | **4.05** |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | `images/mattresses/tempur-probreeze 2.0 medium hybrid.jpg` | 1000×226 | **4.42** |

Both are Gold-tier, so either can be the Best Match hero — the highest-value
recommendation currently looks least premium. In the Results 16:9 frame,
`cover` crops ~56–60% of the image away and upscales the remainder 2.44×; the
drawer and Compare frames are worse. The sources (`incoming/images/…`,
1190×295 / 1190×269) are clean white-canvas cutouts, just cropped to a banner
strip. **Request: re-exports of the same two product shots at ≈3:2 (≥1500×1000
if available), full mattress in frame, white canvas.** Until they arrive, the
runtime fallback letterboxes both on a white mat instead of cropping (X4).

## 2. Platinum Summit — one photograph serving three SKUs

`platinum summit firm.jpg`, `platinum summit medium.jpg`,
`platinum summit plush.jpg` (ids s5, s6, s7) are **byte-identical**
(md5 `983524efeb47…`, 109,685 bytes each) — and so are their three
`incoming/` sources, so this is a source gap, not a build artifact. The three
firmnesses render as visually identical products in Silver.
**Request: three distinct photographs if distinct sources exist.** If they do
not, per D2 the deliberate acceptance of one shared source should be recorded
(a one-line reply on this request suffices) rather than disguised.

## 3. Gel Memory Foam Cool Pillow — lifestyle scene where a cutout belongs

`images/accessories/pillow-gel-memory.jpg` (1000×833) is a staged bedroom
scene (headboard, window, plants) — the only lifestyle image in the app; every
other accessory is a product cutout, so it reads inconsistently in the
Sleep System's product frames. **Request: a product-only cutout of the same
pillow where appropriate** (the scene can stay for any future surface that
wants ambience).

## 4. Low-resolution sources (below the 1000px working minimum)

| File | Native size |
|---|---|
| `images/accessories/protector-tempur.jpg` | 721×385 |
| `images/accessories/foundation-princess.jpg` | 959×348 |

**Request: ≥1000px-wide re-exports if available.** Not blocking; recorded so
the gap is a decision, not an accident.

## 5. Filename migration to the kebab-case convention

All 26 mattress files carry spaces (`the roma.jpg`,
`tempur-probreeze 2.0 medium hybrid.jpg`, …), against the repo convention
(lowercase kebab-case, no spaces — CLAUDE.md "Image Format Convention"); all
10 accessory files already comply. Per D2 the renames go **through the
canonical pipeline now** (rename in `incoming/images/mattresses/`, update
`incoming/lacks_mattresses.json` image references, rebuild workbook → convert)
— a mechanical change we will prepare as its own bounded PR so the diff is
pure renames; no photograph changes. Noted here because it touches the same
files this request replaces: if re-exports arrive first, they should be saved
directly under kebab-case names (e.g. `tempur-probreeze-2-0-medium-hybrid.jpg`).

## Also observed, no action requested

- `gracie medium.jpg` (b7) is a straight head-on shot while the rest of the
  catalog is photographed three-quarter — visible when cards sit side by side.
  Cosmetic; replace only if a matching-angle source exists.
- The dormant email path sizes images with `object-fit`, which Outlook
  ignores (`Code.gs`); the fix is server-side and **live-activation-gated**
  (X15) — listed only so it is not forgotten at activation time.

*Nothing in this request authorizes touching the live lacks.com assortment;
sourcing is Blake's (or Lacks') action. Files received will be verified for
dimensions and provenance before entering `incoming/`.*
