# Item 1.3 — first dark reason-authoring tranche: implementation record (2026-08-29)

**What this is.** The record of the first owner-authorized per-feature catalog
reason content for the Lacks deployment: four (model, axis) pairs, English and
provisional Spanish, authored as **non-rendering catalog data** and flowed
through the canonical lineage, with the Phase 1 regression fixture amended by
the bounded Slice 5 C10 method. It **renders nothing, changes no engine
behaviour and lifts no gate. Item 1.3 remains ◐.**

**Base.** `main` at `d842e6a8b09fcd6416f94435b6b7701f52dbbc4f` (the PR #73
merge, 2026-08-28), carrying `docs/catalog-reason-evidence-2026-08-28.md`
(the evidence record this tranche rests on). `main` had not advanced when
the branch was cut.

**Authorization.** Owner (Blake) — Decision A (the exact eight strings) and
Decision B (the matchReasons-only fixture amendment) approved as separate
rulings, with the routing confirmations recorded in §6, after the read-only
Phase A package (frozen candidates, three independent audits, twelve-question
copy-standard analysis) presented in the 2026-08-29 session. The earlier
label-only candidate strings and the expected fixture hash computed for them
(`a2eee828…`) were superseded by the owner's authoritative copy and are void.

## 1. The approved copy — exact bytes

| Slot | Exact target (record §3) | EN | ES — **provisional, not native-reviewed** |
|---|---|---|---|
| `s5.reason_firm` | Platinum Summit Firm · SKU 1601-622 · Model # 1601-622-MM28450 · sku 1990906 | Rated Firm, with less give at the surface and a tight-top construction without a pillow-top layer. | Nivel de confort firme, con menos hundimiento en la superficie y una construcción tight top sin capa tipo pillow top. |
| `s1.reason_support` | Platinum Paige Firm · SKU 1601-732 · Model # 1601-732-ML99150 · sku 1991909 | Individually pocketed coils that move independently, zoned for targeted support, with foam encasement around the edge. | Resortes embolsados individualmente que se mueven de forma independiente, zonificados para brindar soporte focalizado, con encapsulado de espuma alrededor del borde. |
| `b2.reason_firm` | Giselle Firm · SKU 1601-372 · Model # 1601-372-ML23950 · sku 2031228 | Rated Firm, with less give and more pushback at the surface. | Nivel de confort firme, con menos hundimiento y más empuje en la superficie. |
| `b7.reason_medium` | Gracie Medium · SKU 1601-132 · Model # 1601-132-MC45850 · sku 2030258 | Rated Medium — a balanced feel between plush and firm. | Nivel de confort medio: una sensación equilibrada entre suave y firme. |

**Factual basis (evidence record, §4/§5).** s5: comfort-level spec row
"Firm"; "Tight Top" in H1 and spec. s1: "zoned individually pocketed coils"
and "HD foam encasement" (quantities deliberately unused). b2: spec row
"Firm". b7: spec row "Medium". Every other clause is ordinary category
interpretation of those stated terms — what *firm*, *medium*, *tight top*,
*pocketed*, *zoned* and *encasement* mean by definition (less give / more
pushback at the surface; no pillow-top layer; coils that move independently;
support targeted by zone; a foam rail at the edge; a feel between plush and
firm). **None is a product-performance promise.** No line asserts an outcome
for a body, a sleeper type, a temperature, a duration, a comparison with any
other product, a quantity, a price, a patent or an origin.

**Pre-edit equivalence audit (recorded, not acted on).** Each ES sentence
carries the same clauses and hedges as its EN sentence and adds no attribute.
One note for the native reviewer: s1's ES "para brindar soporte focalizado"
supplies a verb ("provide") where EN has "for targeted support" — same
design-intent claim, slightly more active phrasing; not material. Programmatic
scan of all eight strings against the thirty retired-claim tokens
(`tests/claim_retirement_check.mjs` / `tests/smoke_check.py`): **0 hits**; the
retired bigrams ("zoned coils", "resortes zonificados", "wrapped", "maximum
support") are absent by construction. The four models are outside the retired
set (g6, g7, g8, g9, s3), so neither suite scans them; the check is by
inspection, as the evidence record's §10 housekeeping note anticipated.

**Spanish status.** All four ES strings are **provisional**. The
native-Spanish claim-equivalence reviewer (roadmap 1.3 blockers; evidence
record §11(2)) remains unnamed. **Native review is required before any
Spanish reason activates** — and there is nothing to activate today, because
no runtime reader of `reasons_es` exists (§3).

## 2. What changed, and how it flowed

Canonical lineage, executed in order — no generated artifact was hand-edited:

```
incoming/lacks_mattresses.json      (+4 EN top-level reason_* keys, +4 es.reason_* keys)
  → incoming/build_lacks_workbook.py (MATT_ES_KEYS extended; stale comment corrected)
  → incoming/Lacks_Store_Data.xlsx   (rebuilt by the builder)
  → tools/validate_workbook.py       (--source-images incoming/images --warnings-as-errors: OK)
  → tools/convert_store_data.py      (to a temp dir; only data/mattresses.csv + data/mattresses-es.csv copied in)
  → build-data.ps1                   (data/mattresses.json regenerated)
```

- **`MATT_ES_KEYS` extension (pipeline plumbing only).** The builder's
  Spanish key list previously carried `reason_default` alone among the reason
  fields, so the eight `reason_* (ES)` workbook cells were structurally blank
  and the validator's both-or-neither parity rule (`tools/validation.py`,
  per reason column) made any per-feature Spanish reason unbuildable. The
  list now carries all eight per-feature keys (`reason_cooling`,
  `reason_pressureRelief`, `reason_motionIsolation`, `reason_support`,
  `reason_plush`, `reason_medium`, `reason_firm`, `reason_durability`). The
  workbook columns already existed (`tools/workbook_schema.py`); only cell
  filling changed. **No additional reason was populated** — the other 75 slots
  (and every cell of every other model) remain blank in both languages, and
  the suite pins that (§4).
- **`tests/lineage_check.py`: 10/10** on the rebuilt tree — the committed
  workbook is cell-identical to a fresh rebuild from the sources, and every
  generated artifact matches the committed bundle canonically.

## 3. Runtime facts — unchanged, and why nothing renders

- `index.html` is **byte-identical** to `d842e6a`. No engine, runtime,
  rendering or routing change of any kind.
- `reasons` has exactly one reader, inside `calculateScores()`
  (`const reason = m.reasons?.[feat]`), guarded by the model's live scoring
  tags; the string is pushed into `matchReasons` **after** the score is
  accumulated and never feeds back into it.
- `calculateScores().matchReasons` is discarded at its only call site
  (`window.showResults` keeps `calc.scores` only). No `.matchReasons`
  consumer exists.
- **`reasons_es` has no reader anywhere.** The engine reads `m.reasons` in
  both language passes, so the Spanish pass receives the **English** string
  — dormant, discarded, invisible. This is recorded here and in the suite,
  not approved: language-aware reason routing and native-Spanish
  claim-equivalence review remain mandatory before any activation.
- The personalized reason surfaces (drawer "Why it made your shortlist" /
  Compare "Why it is here") remain **omitted** under PR #63, pinned by
  `tests/results_presentation_check.mjs` and `tests/trust_integrity_check.mjs`
  (both green on this tree). **No customer-visible output changed.**
- The three authorized axes (`firm`, `support`, `medium`) are single
  lowercase tags unaffected by the `build-data.ps1` case-fold; the roadmap 3.1
  defect is neither touched nor a prerequisite here. The 16 case-fold-dead
  slots stay dead and unauthored.

## 4. The regression fixture — bounded amendment (Slice 5 C10 method)

Populating the four EN reasons changes exactly one pinned output class: the
per-language `matchReasons` harvest. Evidence, all produced by the
established tool (`node tests/phase1_output_regression_check.mjs
--write-baseline`) run in **temp copies** of the pre-change and post-change
trees, never on the committed fixture:

- Pre-change tool output == committed fixture minus the obsolete `feelWord`
  field: **true** (0 diffs). Post-change tool output (LF sha
  `7fab36c2…`) differs from it in **exactly 52 paths**, every one of the form
  `scenarios.<s>.matchReasons.(en|es).(s1|s5|b2|b7).length: k != k+1` —
  one element appended, and that element is the model's authorized EN
  string in both languages.
- **Per-model reach:** `s1.support` 8/10 (all but s10, s9); `b7.medium`
  8/10 (all but s6, s9); `s5.firm` 5/10 and `b2.firm` 5/10 (s2, s3, s4, s6,
  s7). Nine scenarios affected; **`s9_empty_defaults` unchanged**. 26 EN +
  26 ES cells = **52**.
- **Every other snapshot path byte-identical:** scores, results (tier
  membership, order, pct, threshold, cap, back-fill, top pick), resolved
  firmness, accessories, profile — and the other 22 models' `matchReasons` in
  every scenario and language.
- The fixture was amended by replacing **only** those 52 cells in the
  committed JSON; the obsolete `feelWord` bytes stay pinned (the suite
  requires it — verbatim `--write-baseline` output, which drops the field,
  fails its own "only feelWord is excluded" guard and was **not** committed).
  Re-serialising the untouched object reproduces the committed bytes exactly,
  so the diff is the 52 cells and nothing else.
- **Reconstruction proof:** reverting only those 52 cells reproduces the
  previous fixture byte-for-byte (LF sha `e7e5c27d…`); removing only the four
  EN source reasons regenerates the previous snapshot.
- **New pinned hash (LF-normalized SHA-256):**
  `24dad01631c99f861929868855082bc8385bae51d76ffc06a826f1d5583f00a1`,
  moved in the same diff as the fixture, with the ratchet comment recording
  the bounded change.

**Test ratchet.** All **15** existing engine-source mutations are preserved,
apply and are caught. Four **catalog-data** mutations were added in the
suite's style (in-memory catalog copy → re-snapshot → required divergence at
a named path **and** none outside `matchReasons`; a stale or zero-divergence
entry fails): **M1** unauthorized fifth model (`g1.reasons.support`, 8
scenarios), **M2** unauthorized second axis (`s1.reasons.firm`, 5), **M3**
approved-string drift (`s5.reasons.firm` minus its full stop, 5), **M4**
tranche removal (`b7.reasons.medium` deleted, 8). Non-triviality pins: exactly
the four (model, axis) per-feature keys exist in `reasons`; `reasons_es`
carries the identical per-feature key set on every model; every authorized
axis is a live scoring tag; the baseline holds the tranche in exactly 52
cells, 26 of them ES cells holding English; per-model reach as above.

**Latent defect found and repaired in the same suite (reported, not
hidden).** Since the 2026-08-15 `feelWord` amendment, the mutation loop had
diffed the *raw* baseline — which retains `feelWord` — against fresh
snapshots, which never produce it. Every mutation therefore "diverged" in
10/10 scenarios whatever it changed, and the `[caught]` lines were vacuous
(a probe on the unmutated engine reported 10/10 divergence). The loop now
applies the same `feelWord` exclusion the compare section uses, and a new
guard proves the unmutated engine reports **zero** divergence on that basis.
On the repaired basis all fifteen source mutations still diverge, with real
counts (10, 3, 9, 10, 10, 7, 7, 10, 9, 7, 1, 10, 10, 3, 10). Historical
mutation counts quoted in earlier PR records for this suite between those
dates were the vacuous 10/10 figure.

Suite result on this tree: **97 passed, 0 failed** (previously 77/0).

## 5. Claim classes — what was deliberately not introduced

No cooling, medical or anatomical, pressure-relief, motion, quantified,
comparative, superlative, price/value, durability/longevity, warranty,
patent/trademark, origin (hand-made / Texas / USA), sleeper-type, stock or
delivery claim was introduced in either language. In particular: s5's
**cooling axis is untouched** (cooling-class claims stay routed under the
unresolved cooling/legal question, evidence record §11(7)); s1 carries no
"25%" form, no Marvelous Middle, no zone location and no body outcome; b2
carries no Giselle/Grace layer construction (§6 C-giselle); b7 carries no
"Gracie II" marker, no price position and no adjustable-base statement. The
retirement suites were **not** amended or weakened.

## 6. Governance state after this tranche

- **Item 1.3 remains ◐.** Its Gated, Proceeds and Exit clauses are
  **unchanged** — neither narrowed, widened, weakened nor closed.
- **The rendered-output gate is not lifted.** The Gated clause is "unblocked
  by populated per-feature catalog reason content"; **four of 79 slots,
  with provisional Spanish and no native review, do not constitute that
  unblock**, and by owner ruling the gate stays locked regardless of any
  dark tranche. The gated output — any rendered per-model "why this fits
  *this customer*" string — appears in no diff here.
- **The four facts are outside the unresolved cooling/legal route** (owner
  confirmation, 2026-08-29).
- **Not authorized and not implemented:** customer rendering; language-aware
  reason routing; any additional model or axis; the 3.1 case-fold change;
  cooling claims; any pricing or Phase 2 work (pricing remains dark; 2.2 is
  untouched).
- Standing restrictions unchanged: showroom authorization NO; the
  pre-showroom device and accessibility matrix (1.4) remains deferred and
  blocking; `gasUrl` blank; Spanish provisional throughout.
- Reconciliation baseline: the app baseline is unchanged by this tranche
  (`index.html` identical); catalog data and the Phase 1 fixture moved as
  recorded above.

## 7. What a later reader must re-verify

Pages change. The factual bases are bound to the evidence record's capture
instant (2026-08-29 ≈ 01:00Z); any future rendering authorization must
re-open the four URLs in a browser session (lacks.com returns 403 to
non-browser fetches) and re-confirm the spec rows before the strings reach a
customer.
