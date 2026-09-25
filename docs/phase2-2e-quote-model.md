# Phase 2.2e/2.2f — the consultation quote model and the visible subtotal

**Status:** built 2026-09-20 on branch `claude/phase2-quote-model` from `main` `fe013e9`.
Nothing activated, no mark moved, item 2.2 stays ◐. Committed as WIP checkpoints
`81060a0` (2026-09-21) and `6380772` (2026-09-24, accessory categories, drill
cache, parent/child mapping), the mapper-rule tests and CI wiring `9d99478`
(2026-09-24), then reconciled with `main` `5f19e9d` on 2026-09-24 (workbook,
data bundle and demo bundle regenerated from the reconciled canonical inputs,
never hand-merged). No PR until Blake orders one; still not integration-ready.

This is 2.2 **Proceeds** work: disabled implementation behind the false
production flags, proven with governed non-shipping fixtures and the localhost
harness. It changes no `data/` or `incoming/` file and ships no price.

> **This record is the artifact Blake is asked to trust, so its numbers are
> re-derived against the tree rather than carried forward.** An adversarial
> review of an earlier revision found it reporting four sweep entries where
> there were seven, two stale suite counts, and a "recorded gap" paragraph
> describing a state the diff itself had already changed. All three are
> corrected here.

---

## 1. What was missing (2.2e)

Slices 2.2a–2.2d completed the disabled price **presentation**. What none of
them created was a model of **the purchase**. Every consumer asked the gate
about exactly one product, and `transactionAmountMinor` — the resolver's
purchase-threshold input, built in 2.1b — was read at `index.html:12680`,
passed through at `:12880`, and **supplied by no caller anywhere**.

## 2. The quote model

Inside the Phase 2.2 gate block: `quoteCartRecords`, `quoteLineFor`,
`buildConsultationQuote`, `quoteQualifyingAmount`, plus wiring in
`priceStatusHtmlFor`.

**Why inside the gate block.** `tests/pricing_contract_check.py` `DOM_CONTAINED`
counts tokens as **substrings over the whole file** and requires each count to
equal its count inside the two marked blocks. A field named `unitAmountMinor`
outside those blocks fails CI.

**Why it calls the gate, never the resolver.** `resolveDarkPricing` is pinned to
one call site. Each line calls `pricePresentationFor` instead, inheriting the
whole fail-closed ladder; the quote adds no new way for a price to appear.

**The aggregation rule.** One unresolved line voids the whole merchandise
amount. Never zero, never a partial sum, never inferred from another size. An
unresolved line **keeps its identity** in `lines` rather than being dropped —
including a selected cart id the catalog does not carry, which is emitted with
`reason: 'no-catalog-record'`. The sum re-enters `priceMoneyValid`, the same
admission every part passed.

**`hasMattress`.** An accessories-only cart resolves fine and would otherwise
report `status: 'complete'`. The record states explicitly whether a mattress is
part of the purchase, so no consumer can present a protector's price as the
complete consultation. (Found by adversarial review; it was reachable in the
model even though the caller happened to guard it.)

### Merchandise subtotal is not the qualifying purchase amount

A published minimum is measured against an amount the **lender** defines —
whether tax, delivery and setup count, whether excluded categories come out,
initial purchase vs account balance. No configured plan publishes that. So a
plan is threshold-assessed **only if it declares** `qualifyingBasis`;
`merchandise-subtotal` is the one basis the runtime can compute, and an
undeclared or unsupported basis yields no amount and an honest `unknown`.

`qualifyingBasis` is an exact, lender-specific claim, so it rides the same
evidence gate as `apr` / `termMonths` / `minimumPurchase` in
`validate_financing` — it cannot be switched on without verification.

The validator's `FINANCING_QUALIFYING_BASES` and the runtime's
`QUOTE_QUALIFYING_BASES` are pinned equal by a test that **reads both files**.
The previous "mirror" was a comment plus a self-restating literal, and widening
the runtime array passed the entire suite; the replacement fails on exactly
that mutation.

### The behaviour change, named

`threshold-unknown` now fires only when the purchase genuinely cannot be
determined. Two assertions were re-cut as a reviewed change. The first re-cut
**dropped an ordering guarantee** (`quote-only` must be read before the
threshold line) — caught by adversarial review and restored, since swapping the
render order had started passing.

## 3. Below-minimum is its own state (2.2e)

`threshold-not-met` was added to `PRICING_STATE_KEYS` with provisional
bilingual copy in the non-shipping fixture, and is **required at activation**.
There is deliberately **no `threshold-met` key** — a met minimum is not credit
approval — and a self-test asserts `threshold-met` is rejected as a state name.

The residual gap is real but narrow: the copy itself is fixture-provisional and
needs business, legal and native-language review before activation.

## 4. The visible complete-system subtotal (2.2f)

`renderHf2SystemTotal()` renders a merchandise subtotal on the **Consultation
Summary only**, between the Sleep System list and Payment Choice — items
justify the figure, and payment follows the total rather than leading it.

**Why only there.** The Sleep System screen is pinned against composing a total
(`tests/sleep_system_presentation_check.mjs`, including the sticky rail). The
Sleep Plan cannot carry one honestly: `renderSleepPlanSystem`
(`index.html:21903`) lists pillow and protection groups only, so a base the
customer chose never appears there and a total would total items they cannot
see.

**What it will not say.** No order total, no all-in figure. The kiosk holds no
tax, delivery or setup facts, so governed copy states in the customer's own
language that this is merchandise only. `PRICING_TOTAL_KEYS` deliberately
refuses an `order-total` key.

**States.** `complete` → the amount, the exclusion line, the pending-verification
label. Any line unresolved → the governed `incomplete` line and **no number**.
Nothing resolved at all (dark, stale, activation-unapproved, emergency-disabled)
→ the slot is hidden and empty, because those states reach no surface even to
say a subtotal is unavailable. No mattress → hidden.

The slot is cleared by name in the session wipe's innerHTML list and re-hidden
via `SESSION_LAYERS`. (`wipeLayer` only toggles classes/attrs/display — an
earlier revision passed it `html`/`hidden` keys it silently ignores.)

## 5. Accessory size variants

The retailer sells a protector as five separate products, one per size, each
with its own SKU and price. The shipped catalog collapsed all five into one
ungoverned `price: 89` — SKU `833806`, the **Queen** — shown to every customer
under a "From" label.

`validate_pricing` requires `size: null` on every `productKind: "accessory"`
entry, and that contract is unchanged. Size is resolved on the **catalog** side
instead: an `accessorySkus` map (size → that size's own sku) chooses which
accessory to ask about, and the resolver query stays sizeless. The key is
deliberately distinct from the mattress `skus` map so the two cannot be
confused by shape. A size the family is not sold in resolves **nothing** — it
never falls back to another size's variant, which is the "From $" defect this
replaces.

## 6. Website extraction — corrections after review

`tools/fetch_lacks_prices.py` writes `demo/price-snapshot/`. Codex review of
the first snapshot found four defects, all confirmed and all fixed:

| defect | correction |
|---|---|
| **114 source URLs were synthesised `/product/None`, and 74 of those were classified clean** — priced with a link that does not exist | evidence is never synthesised. A product URL is recorded only when the record carries one; otherwise the evidence is the **real category-listing URL**, labelled as such, and the row is flagged so it can never count as clean |
| every size-less accessory flagged, including throws and pillows | size requirements are **product-type aware**; only types actually sold by mattress size are flagged |
| a blanket "set" detector flagged 59 legitimate accessory sets with a **mattress-only** bundle warning | "set" warns only where a set would be mistaken for the thing being priced. For a sheet or comforter set the set **is** the product (`scope: accessory-set`); for a mattress, "set" / "with foundation" is a real hazard |
| — | `snapshot.md` crashed on a differently-shaped problem row, so the review file silently failed to regenerate |

Earlier self-inflicted defects, also corrected: reading `regular_price` (the
crossed-out price) as the selling price, which overstated every mattress;
`?p=2` pagination that silently re-served page 1; absent `type_id` treated as a
bundle signal; and `poa` treated as "price on application" when its values are
stock states.

**Configurable parents.** One GET per parent page resolves every child from the
same island; each child carries its own absolute price. The parent's figure is
demonstrably the cheapest child's, so it is **never** substituted. The size
dimension is detected by **option labels mapping to known sizes**, not by
`code == "size"` — requiring that code refused every configurable mattress in
the app's own assortment.

`tools/map_app_to_website.py` maps the approved lineup onto variants and
**never changes it**: a match requires brand, a distinctive model token,
firmness and size to agree, and a generation-marker difference (II, III, 2.0)
downgrades to ambiguous.

## 6b. The website-data preview (`--state website`)

```
python tools/serve_pricing_preview.py --state website --port 8982
```

Serves the ordinary repository with `pricing` replaced in memory by **actual
extracted lacks.com prices**, for the subset of the approved assortment that
has sufficient current identity and price evidence. Every record is re-validated
here against today's admission rules — a snapshot's own "clean" classification
is not trusted, because it was written by whatever version of the extractor
produced it.

**What is delivered**

- A same-size, website-priced finalist comparison: "Comparing Queen
  mattresses", Reserve Mayfair Medium **$3,699** vs Copper Cushion Firm
  **$2,999**, difference **+$700** on the higher-priced side. The `$$$` tier
  band is suppressed whenever an exact price renders in the same table, so
  the customer never reads two contradictory price signals. Tier labels,
  tier assignment and scoring are untouched.
- Itemised Consultation Summary lines with size, quantity and extended price,
  reconciling on screen to the merchandise subtotal.
- Visible quantity and removal controls, with per-product limits.

**Coverage, as of the current capture**

| | |
|---|---|
| eligible size slots | **44**, across **24 of 26** app mattresses |
| by size | queen 23 · twin 8 · king 7 · full 6 · twin XL 0 · cal king 0 |
| website-priced accessories | **none** — 7 unresolved, 3 variant-conflict |

All of it is *subject to the current evidence*: the numbers move with the
capture and with the admission rules.

**What is therefore NOT delivered.** Complete-system website pricing is
unfinished. Any cart containing an accessory yields `state: incomplete` and the
merchandise subtotal is **withheld** — never completed from fixture prices. A
partial website preview is the honest outcome; an apparently-complete total
assembled from two sources is not, and the harness suite pins that no fixture
placeholder reaches website-sourced material.

Production activation remains off. `pricing.displayEnabled` and every surface
ship `false`, the served form is refused by `validate_pricing` exactly as it
should be, and preview eligibility is independent of both owner verification
and activation.

## 6c. Retrieval timestamps survive replay

**The defect:** every row was stamped with the *current run's* start time, so
rebuilding from an untouched cache made prices captured long ago look freshly
observed — and the preview consumed that as evidence freshness. A stale price
would have rendered as current indefinitely, just because the file was
regenerated.

The observation instant now rides the data end to end:

```
cached page (retrievedAt) -> variant.observedAt -> mapping candidate.observedAt
                          -> preview evidence.verifiedAt  (PER ENTRY)
```

`generatedAt` is recorded separately and says only when the file was assembled.
The snapshot also carries `observedFrom` / `observedTo`, and mixed-age captures
keep their per-entry dates: the current preview serves **8 distinct observation
stamps** spanning the real capture window, not one synthetic "now".

Pinned by `tests/price_extraction_check.py`: a cache replay keeps the original
instant, replaying twice does not move it, a legacy row-cache entry is
backfilled with its own page's instant rather than today's, an expired entry is
a miss, and an absent observation stays absent rather than defaulting to now.

## 7. Evidence actually observed

Re-derived against this tree:

| suite | result |
|---|---|
| `pricing_presentation_check.mjs` | **241 / 0** (baseline at `fe013e9`: 176) |
| `pricing_contract_check.py` | **169 / 0** (baseline: 158) |
| `pricing_resolver_check.mjs` | 235 / 0 |
| `pricing_totality_check.py` | 10909 / 0 |
| `tools/validation.py --self-test` | **1356 / 0** (baseline: 1337; re-derived 2026-09-24 on the reconciled tree) |
| `price_extraction_check.py` (new; wired into CI and the mirror 2026-09-24) | **79 / 0** (53 at `81060a0`) |
| `mapping_check.py` (new; wired 2026-09-24) | **47 / 0** (26 at `6380772`; the ten 6380772-rule cases added in `9d99478`) |
| `scoring_isolation_check.mjs` | 262 / 0 |
| `phase1_output_regression_check.mjs` | 190 / 0 |
| `session_safety_check.mjs` | 568 / 0 |
| `email_gating_check.mjs` | 118 / 0 |
| `sleep_system_presentation_check.mjs` | 686 / 0 |
| `payment_choice_check.mjs` | 440 / 0 |
| `consultation_summary_check.mjs` | 128 / 0 |
| `trust_integrity_check.mjs` | 127 / 0 |
| `session_async_check.mjs` | 287 / 0 |
| `contrast_check.mjs` | 196 / 0 |
| `financing_totality_check.py` | 3576 / 0 |
| `smoke_check.py` | 118 / 0 |
| `daybreak_contract_check.py` | 88 / 0 |
| `lineage_check.py` | 10 / 0 |

**Mutation sweep: manifest 737 → 748.** Eleven new entries plus one re-anchored
(the accessory SKU grammar moved into `pricingCleanSku`). **Twelve mutants
verified CAUGHT** individually on a temp tree. On the reconciled tree
(2026-09-24) the manifest is **757**: main's seven (g5 omission, DR-01) plus two
mapper-discipline entries from `9d99478` (digit-free stem, parent/child
model-number equality), both verified caught by `mapping_check.py`.

**Compare surface rendered coverage (2026-09-24, after the reconciliation).**
`pricing_harness_check.py` now opens the compare modal on every walk (seven
drill states plus the shipped page, EN/ES, 1194x748 and 834x1108) and pins the
price row, the same-size difference (signed on the dearer side, dash on the
other, equal to the two amounts' gap), the size line, the tier glyphs, no
per-period text, and in `available` a language switch with the modal open,
a reopen in the other language, and the new-customer wipe. Two defects found
and repaired in the same commit, with the failing run recorded first (577 / 6):
the `$$$` tier glyph yielded to ANY price-row text, so the unavailable copy
suppressed it (now `exact` is set only when a side is `available`), and the
wipe left the previous customer's size line ("Comparing Queen mattresses")
in the hidden modal (now cleared and re-hidden by name). Three sweep entries
cover the repairs; manifest **760**. Harness after: **583 / 0**.

**Open-modal language switch and the equal-price path (2026-09-24, follow-up).**
The behaviours pass now runs in `available` and `unavailable` and pins that a
switch made WITH THE MODAL OPEN repaints the title, close label, governed row
copy and size line at once, on the same screen, with the same two models,
amounts and return-focus owner. Fail-before (631 / 4): only the title followed;
the close label and the rows stayed English until a close-and-reopen. Repair:
`openCompareModal()` registers a copy-only repaint hook while open,
`closeCompareModal()` drops it, and `switchLanguage()` calls it only when the
modal is visible. A served copy of the `available` drill with every mattress at
one amount pins the equal-price presentation (one merged price cell, the
difference row in words - "Same" / "Igual" - never a signed figure or "$0.00",
tier glyphs yielding, size line, no per-period text); that path already
rendered correctly. Two sweep entries (repaint call removed; equal branch
skipped), each verified caught individually (631 / 4 each); manifest **762**.
Harness after: **635 / 0**.

One candidate entry was **withdrawn as vacuous**: summing lines of different
currencies SURVIVED, because currency uniformity is enforced twice upstream.
The guard stays as defence in depth, its unreachability is recorded at the
branch, and two tests pin the upstream enforcements.

## 8. What must come from Lacks before any of this resolves a real price

1. An approved retail price source (`sourcePolicy.status` is `unapproved`,
   `authority.owner` blank).
2. A freshness cadence (`maxAgeDays` is `null`).
3. Per-size SKUs for the 26 mattresses and the 10 accessories.
4. Governed copy — the `threshold-not-met` string and the four
   `presentation.totals` strings — with business, legal and native review.
5. For any payment illustration: the published rounding rule, the final-month
   reduction, and whether tax and delivery sit inside the financed amount.
   Total-of-payments is not modelled anywhere and should be a required
   companion to any per-period figure.

Two unguarded honesty risks found while auditing, both pre-existing: there is
**no `deferred-interest` plan kind and no guard**, so the structure most often
mispresented as "0%" is the one the schema cannot distinguish from a genuine
equal-payment offer; and plan `calculationMode` is not enum-validated.
