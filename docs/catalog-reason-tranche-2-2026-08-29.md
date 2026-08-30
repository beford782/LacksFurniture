# Item 1.3 — dark reason-authoring tranche 2: implementation record (2026-08-29)

**What this is.** The record of the second owner-authorized per-feature
catalog reason tranche for the Lacks deployment: eight (model, axis) pairs,
English and provisional Spanish, authored as **non-rendering catalog data**,
flowed through the canonical lineage, with the Phase 1 regression fixture
amended by the bounded Slice 5 C10 method. It **renders nothing and lifts no
gate. Item 1.3 remains ◐.** No engine source, scoring, ranking,
recommendation or rendered behavior changed; the only computed-output
movement is the authorized dormant `matchReasons` amendment recorded in §4.

**Baseline and branch.** `main` at
`2ba4cb982b513c2357164b5f069a87c50c4c7968` (the PR #74 merge; parents
`d842e6a8…` + `a3acd2df…`), verified unchanged at the start of the work.
Branch `claude/phase1-13-reason-tranche-2`, cut from that commit. Tranche 1
(PR #74; `docs/catalog-reason-tranche-1-2026-08-29.md`) is fixed history and
is not amended here.

**Owner authorization (Blake, 2026-08-29, in-session directive "Owner
decision — Item 1.3 dark reason-authoring tranche 2").** Decision A: the
exact eight EN and eight provisional ES strings in §1, for dark,
non-rendering catalog storage only, byte-exact; the optional s8 "Euro Top"
wording **not** approved. Decision B, approved separately: the bounded
matchReasons-only fixture amendment (86 cells, 43 EN + 43 ES; cumulative
138; only `scenarios.<s>.matchReasons.<lang>.<model>` may move; s9 and the
tranche-1 cells unchanged; `feelWord` retained; replacement hash computed
from the implemented fixture and pinned in the same diff; exact-copy,
reach, non-triviality, negative-control and mutation coverage added; every
mutation caught). Routing confirmations 1–8 as recorded in §6. Push and PR
authorized; **merge not authorized.**

## 1. The approved copy — exact bytes

| Slot | Exact target (live, §2) | EN | ES — **provisional, not native-reviewed** |
|---|---|---|---|
| `s4.reason_firm` | Platinum Maria Firm · SKU 1601-542 · Model # 1601-542-MI94750 · sku 1990893 | Rated Firm, with less give and more pushback at the surface. | Nivel de confort firme, con menos hundimiento y más empuje en la superficie. |
| `s2.reason_firm` | Platinum Paige Extra Firm · SKU 1601-752 · Model # 1601-752-ML59150 · sku 2029844 | Rated Extra Firm — a very firm feel with little give at the surface. | Nivel de confort extra firme: una sensación muy firme, con poco hundimiento en la superficie. |
| `s8.reason_firm` | Kendall Firm Euro Top · SKU 1601-452 · Model # 1601-452-MM91350 · sku 1991904 | Rated Firm, with less give and more pushback at the surface. | Nivel de confort firme, con menos hundimiento y más empuje en la superficie. |
| `s6.reason_medium` | Platinum Summit Medium · SKU 1601-642 · Model # 1601-642-MM29450 · sku 1990909 | Rated Medium — a balanced feel between plush and firm. | Nivel de confort medio: una sensación equilibrada entre suave y firme. |
| `s7.reason_plush` | Platinum Summit Plush · SKU 1601-672 · Model # 1601-672-MM27450 · sku 1990916 | Rated Plush — a softer feel with more give at the surface. | Nivel de confort suave: una sensación más suave, con más hundimiento en la superficie. |
| `b4.reason_firm` | Genesis Firm · SKU 1623-522 · Model # line displays the SKU (no manufacturer suffix) · sku 2176805 | Rated Firm, with less give and more pushback at the surface. | Nivel de confort firme, con menos hundimiento y más empuje en la superficie. |
| `b6.reason_firm` | Angelina Extra Firm · SKU 1601-212 · Model # 1601-212-MD27350 · sku 1991866 (**mattress** record, not the set) | Rated Extra Firm — a very firm feel with little give at the surface. | Nivel de confort extra firme: una sensación muy firme, con poco hundimiento en la superficie. |
| `b5.reason_plush` | Angelina Plush · SKU 1601-262 · Model # 1601-262-MD47350 · sku 1991876 | Rated Plush — a softer feel with more give at the surface. | Nivel de confort suave: una sensación más suave, con más hundimiento en la superficie. |

Eight EN strings (four distinct sentences) and eight ES strings (four
distinct sentences). The Firm models reuse the tranche-1 b2 sentence
verbatim and the Medium model reuses the tranche-1 b7 sentence verbatim;
"Extra Firm" and "Plush" are new sentences of the same pattern. Identical
sentences on different models are fine for the engine (deduplication is per
model) and each slot is pinned individually by the suite.

**Factual basis.** Each string rests on the page's "Mattress Comfort Level"
spec row, live-verified in §2: Firm (s4, s8, b4), Extra Firm (s2, b6),
Medium (s6), Plush (s7, b5). Every other clause is the term's ordinary
category meaning (less/more give and pushback at the surface; "very firm"
for Extra Firm; "softer" for Plush; "between plush and firm" for Medium).
**None is a product-performance promise.** No line asserts an outcome for a
body, a sleeper type, a temperature or a duration, a quantity, a price, a
patent or an origin. No product-to-product, quantified, superiority,
price-positioning or market-position comparison was introduced; "less give",
"more pushback", "little give", "more give" and "softer" are relative feel
descriptions derived from the manufacturer's comfort rating, not comparisons
against another product. No top-type clause is carried by any string (s2's
Tight Top, s8's Euro Top, s4's Box Top and b6's body-text Tight Top are
deliberately unused); no name marker ("II"); no construction; nothing from
any shipped `reason_default`.

**Claim-safety scan.** All sixteen strings scanned against the thirty
retired-claim tokens (`tests/claim_retirement_check.mjs` /
`tests/smoke_check.py`) and an excluded-class vocabulary (medical, pressure,
motion, cooling, comparison, superlative, price/value, warranty/durability,
percentages, origin, sleeper-type, trademark, top types, coil counts, stock):
**0 hits**; every string ends with a full stop; no pipes or quotes. Semantics
reviewed per string, not by keyword alone. None of the eight models is in
the retired set (g6, g7, g8, g9, s3), so neither retirement suite scans them
— the scan is by inspection, as for tranche 1.

**Spanish.** All eight ES strings are machine-drafted and **provisional**.
Clause-for-clause equivalent to their EN; "plush ↔ suave" follows the
app's Plush→Suave label mapping. The native-Spanish claim-equivalence
reviewer remains unnamed; **native review is required before any Spanish
reason activates** — and nothing can activate today, because no runtime
reader of `reasons_es` exists (§3).

## 2. Live evidence (browser session, 2026-08-30 00:29–00:32 UTC = 2026-08-29 19:29–19:32 CDT)

Every page opened in the owner's connected Chrome session (lacks.com returns
HTTP 403 to non-browser fetches), bound by rendered H1 + Model # + URL
trailing id = repository `sku`, never by slug text. All eight: live at the
exact record §3B URL (no redirect, no 404, no "Coming Soon"), displayed "In
Stock", spec-table label exactly "Mattress Comfort Level".

| Model | Access (UTC) | URL (`https://www.lacks.com/product/…`) | Comfort-level row | Notes |
|---|---|---|---|---|
| s4 | 00:29:12Z | `restonic-platinum-maria-ii-155-hybrid-bt-firm-queen-mattress-1601-542-mi94750-1990893` | **Firm** | H1 "Restonic Maria Hybrid BT Firm Queen Mattress"; body "Platinum Maria II" — identity-level variance, unchanged from the record |
| s2 | 00:29:57Z | `restonic-platinum-paige-ii-16-hybrid-extra-firm-queen-mattress-1601-752-ml59150-2029844` | **Extra Firm** | Mattress Top row "Tight Top"; no box-top wording anywhere on the page (the recorded contradiction was repository-side copy); no top-type clause authored |
| s8 | 00:30:36Z | `restonic-comfortcare-kendall-155-hybrid-firm-euro-top-queen-mattress-1601-452-mm91350-1991904` | **Firm** | "Euro Top" in H1, body and spec row; double space in H1 persists; Euro Top wording not authored |
| s6 | 00:30:57Z | `restonic-platinum-summit-138-hybrid-medium-tight-top-queen-mattress-1601-642-mm29450-1990909` | **Medium** | cooling axis untouched |
| s7 | 00:31:11Z | `restonic-platinum-summit-138-hybrid-plush-tight-top-queen-mattress-1601-672-mm27450-1990916` | **Plush** | cooling axis untouched |
| b4 | 00:31:24Z | `genesis-firm-queen-mattress-1623-522-2176805` | **Firm** | Model # line shows the bare SKU 1623-522; no Mattress Top row; shipped REVISE default untouched |
| b6 | 00:31:41Z | `restonic-comfortcare-angelina-ii-13-hybrid-extra-firm-queen-mattress-1601-212-md27350-1991866` | **Extra Firm** | mattress record (trailing id 1991866); no set language on the page; "Tight Top" is body text only; body/slug "Angelina II" |
| b5 | 00:31:58Z | `restonic-comfortcare-angelina-ii-13-plush-queen-mattress-1601-262-md47350-1991876` | **Plush** | Made-In row now renders "USA" (blank in the evidence record) — origin is excluded from authoring regardless; identity unaffected |

Observations at the recorded instants only. **Pages change**; the four
tranche-1 pages and these eight must be re-opened in a browser session and
the spec rows re-confirmed before any future rendering authorization.

## 3. Runtime facts — unchanged, and why nothing renders

- `index.html` is **byte-identical** to `2ba4cb9`. No engine source,
  scoring, ranking, recommendation, runtime, rendering or routing change of
  any kind; no JavaScript or CSS changed.
- `reasons` has exactly one reader, inside `calculateScores()`, guarded by
  the model's live scoring tags; the string is pushed into `matchReasons`
  after the score is accumulated and never feeds back. The reader count is
  unchanged (1).
- `calculateScores().matchReasons` is discarded at its only call site; there
  are **zero** `calc.matchReasons` references.
- **`reasons_es` has zero readers.** The engine reads `m.reasons` in both
  language passes, so the Spanish pass receives the **English** string —
  dormant, discarded, invisible. Recorded and pinned, not approved;
  language-aware routing and native review remain mandatory before any
  activation.
- The personalized reason surfaces (drawer "Why it made your shortlist" /
  Compare "Why it is here") remain **omitted** under PR #63 and pinned by
  `tests/results_presentation_check.mjs` and `tests/trust_integrity_check.mjs`;
  language switching restores nothing because the only writer was removed
  with the surfaces. **No customer-visible output changed.**
- The authorized axes (`firm`, `medium`, `plush`) are single lowercase tags
  unaffected by the `build-data.ps1` case-fold; roadmap 3.1 is neither touched
  nor a prerequisite. The 16 case-fold-dead slots stay dead and unauthored.
- `gasUrl` blank; pricing display disabled; discount mode disabled; `Code.gs`
  unchanged and undeployed; live email off; showroom authorization NO.

## 4. Canonical lineage, fixture movement and test ratchet

**Lineage (data only — no pipeline code changed).** `MATT_ES_KEYS` already
carried all eight per-feature reason keys after PR #74, so the sixteen new
values entered as data:

```
incoming/lacks_mattresses.json     (+8 EN top-level reason_* keys, +8 es.reason_* keys)
  → incoming/build_lacks_workbook.py  (unchanged)
  → incoming/Lacks_Store_Data.xlsx    (rebuilt by the builder)
  → tools/validate_workbook.py        (--source-images incoming/images --warnings-as-errors: OK)
  → tools/convert_store_data.py       (temp dir; only data/mattresses.csv + data/mattresses-es.csv copied in)
  → build-data.ps1                    (data/mattresses.json regenerated)
```

Nothing generated was hand-edited. `tests/lineage_check.py`: **10/10**.
Resulting catalog: **12 of 79 per-feature slots populated, 67 blank**; EN
and ES per-feature key sets identical on every model; the four tranche-1
strings byte-identical; retired models, cooling fields, default reasons and
the 16 dead slots unchanged; no per-feature key beyond the governed axes.

**Fixture movement (Decision B).** The established tool
(`--write-baseline`) was run in temp copies of the pre-change and post-change
trees, never on the committed fixture. Pre-change output == committed
fixture minus the obsolete `feelWord` field: **true (0 diffs)**. Post-change
vs pre-change: **exactly 86 changed paths**, every one
`scenarios.<s>.matchReasons.(en|es).(s4|s2|s8|s6|s7|b4|b6|b5).length: k != k+1`,
the appended element being the model's approved EN string in both
languages.

- **Reach:** `s6.medium` **8/10** (all but s6, s9); `s4/s2/s8/b4/b6.firm`
  **5/10** each (s2, s3, s4, s6, s7); `s7/b5.plush` **5/10** each (s2, s3,
  s4, s6, s10). Nine scenarios affected; **`s9_empty_defaults` unchanged**.
  43 EN + 43 ES = **86 cells**; with tranche 1's 52, **138 (69 EN + 69 ES)**.
- Every non-`matchReasons` path byte-identical (scores, results, resolved
  firmness, accessories, profile); the tranche-1 cells (s1/s5/b2/b7) and the
  other 18 models' `matchReasons` identical in every scenario and language.
- Amendment = the committed JSON with **only** those 86 cells replaced;
  `feelWord` retained (verbatim `--write-baseline` output drops it and fails
  the suite's own guard — not committed); re-serialising the untouched object
  reproduces the committed bytes exactly.
- **Reconstruction:** reverting only the 86 cells reproduces the tranche-1
  fixture byte-for-byte (LF sha `24dad016…`); removing only the eight EN
  source reasons regenerates the pre-change snapshot.
- **Input hash:** `24dad01631c99f861929868855082bc8385bae51d76ffc06a826f1d5583f00a1`.
  **New pinned hash (LF-normalized SHA-256):**
  `d973fae2fd4b31d7931ffb955830ebfc21256b8658d43c25522e0afaf23e48a6`, moved
  in the same diff with its ratchet comment.

**Test ratchet (`tests/phase1_output_regression_check.mjs`, non-weakening).**
`APPROVED_REASON_COPY` now carries all twelve pairs byte-exact (the axis
view, the exact-copy comparator, the live-tag pin and the per-string
negative controls — 24 ES + 1 EN — derive from it); the "exactly the four"
pin became "exactly the twelve" with a map-equals-catalog pin; the cell
count 52 → 138 with a separate pin that tranche 1's cells are still exactly
52; the reach pin covers all twelve. Existing mutations preserved: all 15
engine-source mutations and M1–M4 (M1 relabelled — g1 remains outside the
approved set). Added: **eight T2 removal mutations** (one per new slot),
**M5** unauthorized second axis on a tranche-2 model (`s6.reasons.support`),
**M6** unauthorized thirteenth model (`s9.reasons.medium`), **M7**
string-drift on the Extra Firm sentence — each `[applies]`, `[caught]` at
its named path, `[bounded]` (no divergence outside `matchReasons`); the loop
non-vacuity guard from PR #74 stands. Suite result: **185 passed, 0 failed**
(was 118/0).

## 5. Complete verification (this tree)

- Phase 1 output regression **185/0**; canonical lineage **10/0**; claim
  retirement **56/0**; smoke **118/0**; results presentation **103/103**;
  trust integrity **123/123**; scoring isolation **262/0**; workbook
  validation OK; strict golden bundle PASS.
- Full CI-equivalent step list: **47/47 steps, rc=0** (every suite in `.github/workflows/ci.yml`, including the rendered layout check).
- Mutation sweep: **501/501 caught, 0 survived, 0 did not apply**.
- `git diff --check` clean (working tree and ranged from `2ba4cb9`).
- Independent checks: 12 populated / 67 blank; 16 new exact strings; EN/ES
  pairing exact; dormant reach as above; no unexpected fixture movement;
  fixture LF sha `d973fae2…`; `index.html` blob == `2ba4cb9`; the 1.3
  Gated/Proceeds/Exit block content-hash `318de388…` == `2ba4cb9`; 0
  `reasons_es` readers; 1 `m.reasons` reader; 0 `calc.matchReasons`; blank
  `gasUrl`; pricing disabled; discount disabled; `Code.gs` unchanged; no
  scoring/recommendation source change.

## 6. Governance state after this tranche

- **Item 1.3 remains ◐.** Its Gated, Proceeds and Exit clauses are
  **unchanged** — neither narrowed, widened, weakened nor closed (block
  byte-identical to `2ba4cb9`).
- **The rendered-output gate is not lifted.** Twelve of 79 slots, with
  provisional Spanish and no native review, do **not** constitute the Gated
  clause's "populated per-feature catalog reason content"; the gate stays
  locked by ruling regardless of any dark tranche.
- Routing confirmations recorded (owner, 2026-08-29): (1) provisional paired
  Spanish may merge while non-rendering, native claim-equivalence review
  mandatory before activation; (2) the eight comfort-level facts are outside
  the unresolved cooling/legal route for this bounded dark tranche; (3) no
  Item 3.1 work; (4) no customer rendering; (5) no language-aware routing;
  (6) Item 1.3 remains ◐; (7) its rendered-output gate remains locked; (8) no
  additional model, axis, claim, optional wording, cleanup, refactor or
  governance amendment.
- **Remaining blockers:** native-Spanish claim-equivalence reviewer unnamed;
  the rendered-output gate; 3.1 🔒 (16 dead slots); per-model retired-suite
  dispositions for g6/g7/g8/g9/s3; the cooling/legal route for cooling-class
  slots; the Lacks page-correction and licensee requests; the pre-showroom
  device/accessibility matrix (blocking); showroom NO; live email off;
  pricing dark and 2.2 untouched. 67 slots remain blank; any further slot
  needs its own owner block.

## 7. What a later reader must re-verify

Pages change. The factual bases here are bound to the 2026-08-30 00:29–00:32
UTC capture instants; before any future rendering authorization, re-open all
twelve populated models' URLs in a browser session and re-confirm the spec
rows and identities.
