# Phase 2.2 — disabled pricing incorporation (construction record)

**Status: construction, non-live.** Roadmap item 2.2 stays ◐; its Gated block
is unchanged and nothing here activates anything. This document records the
engineering design of the *disabled* implementation the owner build direction
of 2026-09-09 scheduled as the first production-readiness workstream, and the
slices in which it lands. Every slice ships with `pricing.enabled`,
`pricing.displayEnabled` and every `pricing.surfaces` flag **false**,
`products` and `formulas` **empty**, `exactPromotionsEnabled` **false** and
`gasUrl` **blank** — CI's operating-state lock refuses anything else.

"Production ready" for this item means the code, configuration model, UI
consumers, failure states, operational controls and a staging / live-like
verification path are complete and ready for the single final validation and
activation decision. It does not mean production-active.

---

## What 2.1 left behind, and what 2.2 adds

Phase 2.1 shipped a pure, deterministic resolver — `resolveDarkPricing`
(`index.html`, the marked `PHASE 2.1B DARK RESOLVER` block) — returning five
independent axes (price, calculation, threshold, freshness, eligibility) over
a governed pricing contract, with **zero call sites** and **nothing reading
the shipped pricing config**. Containment pins in three suites held every
pricing token inside that block. The roadmap's breadcrumb: *the first consumer
2.2 wires must turn the stale-refusal contract into an executed test.*

2.2 adds consumers. Because the containment pins forbid any consumer, the
work is as much about **re-binding the pins** as about the consumers
themselves: from "no consumer exists" to "consumers exist only through one
fail-closed gate, and render nothing in every production state".

## The gate (slice 2.2a, this record)

One marked block, `PHASE 2.2 PRICE PRESENTATION GATE`, directly after the
resolver. It is the **only** code that reads `STORE_CONFIG.pricing` (one line,
`getPricingConfig`) and the **only** code that calls the resolver (one line,
inside `pricePresentationFor`). Consumption rules, in order, each fail-closed:

| Outcome | When | What a surface may show |
|---|---|---|
| `off` | pricing absent; `enabled !== true` (emergency disable); `displayEnabled !== true`; this surface's flag `!== true` (strict — an absent map is off, unlike the financing helper which defaults open); or no product id | Nothing. The slot is hidden **and emptied**, with no state attribute. This is every production state. |
| `price-unavailable` | price axis not `resolved`; **or** freshness axis not `fresh` (stale / not-judgeable data is refused here — the executed stale-refusal contract); **or** eligibility axis not `eligible`; or the amount cannot be formatted | Only the governed `presentation.states["price-unavailable"]` copy, in the active language. Blank copy → hidden and empty. Never a number. |
| `available` | all three axes admit | The resolved amount, localized (`Intl.NumberFormat`, whole dollars without cents), with the governed `assumptions` and `disclosures` adjacent, in the active language. |

Carried through as **status only**, never a number: the calculation axis
(`available` / `quote-only` / `unavailable`) and the threshold axis (`met` /
`not-met` / `unknown`). No payment figure is computed or rendered anywhere
(the V1 invariant); the Payment Choice suite's §25 currency-amount ban on the
D4 surfaces still holds.

**SKU identity comes from the catalog, not from the pricing entry.** The
resolver resolves a price only for an exact product-size **and** SKU. The gate
takes that SKU from an optional per-size map on the mattress record,
`m.skus[size]`, with the size from the customer's `mattress_size` answer. The
shipped catalog carries no `skus` map, so nothing can resolve in production
even if the gate were open. Populating that map is governed real data — a
final-gate input (see "What stays for the final gate").

**Stateless by construction.** The gate stores nothing, so the session wipe
has nothing to clear; the email-gating suite's scans (payload, preview,
`Code.gs`, wipe block, analytics fields) are untouched and still pass.

### The first surface: the drawer

`#drawerPrice` sits directly above the drawer's Payment Choice box — price and
Payment Choice grounded on the same screen, never inside one card — and is
rendered by `renderDrawerPrice(m, answers.mattress_size)` on every drawer open
and language switch, before `renderDrawerFinancing()`. Off → hidden, empty, no
attribute. Available → the dictionary label (`drawer.price_label`, EN "Price" /
ES "Precio", added to both shared dictionaries), the amount, then the notes,
all HTML-escaped.

### Guards added or re-bound

- **New:** `tests/pricing_presentation_check.mjs` (76 checks) executes the real
  resolver + gate over the real shipped config for the whole catalog × six
  sizes × five surfaces (all off; the drawer slot hidden and empty for every
  render), then opens the gate in memory on the governed non-shipping fixture:
  the three outcomes, the stale boundary (at the limit available, one second
  past unavailable), eligibility withheld (approval missing; clearance not
  attested), SKU identity (no map / wrong size / mismatched / blank / other
  product), emergency disable, per-surface flags, both languages, escaping,
  hostile totality, and eight planted mutants — each rejected by the assertion
  that claims to catch it. Defence in depth is asserted, not assumed: a gate
  whose own `displayEnabled` check is removed still cannot reach `available`,
  because the resolver's eligibility axis withholds the number.
- **Re-bound:** `tests/pricing_resolver_check.mjs` — "zero call sites" became
  "exactly one call site, inside the gate block"; "nothing reads the shipped
  config" became "read from exactly one line, inside the gate block"; the
  bare-word `pricing` containment scan now excludes both marked blocks and
  still finds nothing outside them, on both pages.
- **Re-bound:** `tests/pricing_contract_check.py` — DOM silence over both
  blocks; `STORE_CONFIG.pricing` and `getPricingConfig` move from *absent* to
  *contained*; `resolvePrice` and `purchaseAssessment` stay absent; the CI
  wiring check names the new suite; five new sweep find-strings pinned to
  exactly one match.
- **Sweep:** eight `2.2a` entries with the presentation suite as observer
  (manifest 640 → 648).
- **Unchanged and still passing:** the shipped-state lock, the operating-state
  lock, the payload / preview / `Code.gs` / analytics / wipe scans, the
  resolver's purity pins, the demo bundle scan (rebuilt from the changed
  `index.html` with `tools/build_black_friday_demo.py`).
- **Suite count:** 48 → 49 checks with `-SkipMutationSweep`; the sweep is the
  50th.

### Discovery findings this slice answers

The read-only discovery pass that preceded the build flagged eight gaps; the
ones 2.2a resolves or deliberately defers:

- **State vocabularies.** The validator requires exactly three bilingual
  state copies at activation (`price-unavailable`, `quote-only`,
  `threshold-unknown`); the roadmap's state table names four states and the
  resolver adds `stale` and `not-judgeable`. The gate maps every refusal —
  unresolved, stale, not-judgeable, eligibility withheld — onto the single
  `price-unavailable` copy (never a number, never a reason a customer could
  misread as "approved but hidden"); `quote-only` and `threshold-unknown`
  copy are consumed in 2.2b beside Payment Choice. No validator change.
- **No SKU in the catalog.** Resolved by the optional `m.skus[size]` map read
  by the gate; the pipeline column ships empty in 2.2b.
- **Opposite surface defaults.** `pricingSurfaceEnabled` is strict (absent
  map or non-boolean → off); it does not share the financing helper.
- **No pricing state to wipe.** The gate is stateless; nothing joins the
  session wipe, and no analytics field is added.
- **Protected-file drift.** CI hashes `incoming/lacks_pricing.json` as a
  protected artifact; the local mirror's list omitted it. Added to the mirror
  in this slice.
- **Deferred:** the staging / live-like path (2.2c defines it); stale
  roadmap line-number citations (line numbers drift by design and are not
  load-bearing); the accessory-price surface (its own workstream, never a
  standalone withdrawal).

### Deliberately not in 2.2a

Nothing beyond the drawer renders. No results, Sleep System, handoff or Sleep
Plan consumer yet; no calculation / threshold copy on any surface; no
`skus` pipeline column; no harness. Each is a later slice.

## Slice plan

| Slice | Content | Ships with |
|---|---|---|
| **2.2a** (this record) | The gate; the drawer surface; containment re-bound; the presentation suite; sweep entries; dictionary label | All flags false |
| **2.2b** | The four remaining surfaces (`results`, `sleepSystem`, `handoff`, `sleepPlan`) through the same gate, each hidden and empty when off; calculation / threshold **status copy** (`quote-only`, `threshold-unknown`) adjacent to Payment Choice where a plan is in view — status only, never a figure; the `skus` catalog column through the canonical pipeline (`incoming/` → workbook → converter → `build-data.ps1`), shipping **empty**, with lineage and validator coverage; the Payment Choice §25 pin re-bound if any D4 surface gains a price slot | All flags false, `skus` empty |
| **2.2c** | Operational controls and the staging / live-like verification path: a localhost-only harness (modelled on `tools/serve_daybreak_demo.py`) that serves the app with the governed **non-shipping** fixture merged in memory, clearly labelled non-shipping, never writing `data/` or `demo/`; a rendered Playwright pass over that harness for every outcome on every surface in both languages and both orientations; emergency-disable and freshness-failure drills through the harness; the disabled-state DOM-silence rendered check over the shipped page | All flags false |

After 2.2c the item is "production ready" in the direction's sense and waits
for the final gate. None of the three slices advances or closes item 2.2 (its
Exit's exclusion).

## What stays for the final gate

Real governed price data (`products`, `formulas`, the catalog `skus` values);
`displayEnabled` and every surface flag; the written business and legal
approvals, native-Spanish review and MAP clearance; hardware and browser
verification on the mounted device; live deployment. No provisional value,
label or approval status in a fixture or harness is ever represented as
approved, and no fixture ever enters `incoming/`, the workbook, `data/` or
`demo/`.
