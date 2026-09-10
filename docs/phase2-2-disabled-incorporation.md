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
| `off` *(also — Codex correction 2026-09-09, the roadmap's state table restored)* | no applicable catalog record / SKU for this product-size; freshness axis absent or not `fresh` (stale, not-judgeable); eligibility axis absent or not `eligible` (activation-unapproved) | Nothing. Stale and unapproved data is inert internal data: no slot, no state copy, no number, no email material, no analytics, no persistence — never anything a customer could read as "approved but hidden". |
| `price-unavailable` | **only** freshness `fresh` **and** eligibility `eligible`, but the admitted price cannot be resolved or safely formatted: it fails the runtime money admission (safe-integer minor units, strictly positive, at most the governed 1,000,000,000 minor-unit maximum, currency exactly `USD` — `Intl.NumberFormat` is formatting only and accepts `XXX`) or the formatter cannot express it | Only the governed `presentation.states["price-unavailable"]` copy, in the active language. Blank copy → hidden and empty. Never a number. |
| `available` | resolved **and** fresh **and** eligible **and** admitted | The resolved amount, localized (`Intl.NumberFormat`, whole dollars without cents), with the governed `assumptions` and `disclosures` adjacent, in the active language. |

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
  past OFF), eligibility withheld (approval missing; clearance not
  attested — OFF), SKU identity (no map / wrong size / mismatched / blank /
  other product — OFF), the fresh + eligible + unadmitted price-unavailable
  fixture (currency `XXX`), the runtime money admission's hostile cases,
  emergency disable, per-surface flags, both languages, escaping,
  hostile totality, and the planted mutants — each rejected by the assertion
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
  resolver adds `stale` and `not-judgeable`. *(As first built, the gate
  mapped every refusal — unresolved, stale, not-judgeable, eligibility
  withheld — onto the single `price-unavailable` copy. The Codex review of
  the integrated candidate (2026-09-09) found that this contradicted the
  roadmap's own state table — stale: "nothing a customer can see";
  activation-unapproved: "nothing on any shipped/live customer surface" —
  and the contract was restored: stale, not-judgeable, unapproved and
  no-record are OFF; `price-unavailable` is reserved for fresh + eligible
  data whose admitted price fails the runtime money admission or cannot be
  formatted.)* `quote-only` and `threshold-unknown` copy are consumed in
  2.2b beside Payment Choice. No validator change.
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
| **2.2b** | The four remaining surfaces (`results` top-pick and supporting cards, the `sleepSystem` finalist anchor, the `handoff` Consultation Summary finalist hero, the `sleepPlan` finalist) through the same gate via one slot builder (`priceSlotFor`) that returns `''` in every production state, so each template emits exactly what it emitted before; the size always the customer's own answer; the `skus` catalog column through the canonical pipeline (`incoming/` → workbook → converter → `build-data.ps1`), shipping **empty**, with lineage and validator coverage | All flags false, `skus` empty |
| **2.2c** | The staging / live-like verification path: `tools/serve_pricing_preview.py`, a localhost-only **non-shipping** harness that serves the app with the governed fixture merged in memory (one FIXTURE queen price per shipped mattress, a FIXTURE SKU per mattress, stamps shifted to the server's start), six drill states (dark, available, stale, unapproved, unavailable, disabled — the sixth added 2026-09-09 under Codex review: fresh and eligible, currency XXX, refused by the runtime money admission), the production validators judging every state before it serves (dark forms clean; the stale drill refused for staleness and the unavailable drill for its currency; every opened form refused), never writing `data/` or `demo/`; `tests/pricing_harness_check.py` executing the builder and handler against a live loopback server and driving the real page through headless Chromium for the shipped configuration and every drill state, both languages, both tablet orientations (shipped, dark, stale, unapproved and disabled silent everywhere — the restored contract; available with FIXTURE amounts and adjacent disclosures on all five surfaces; unavailable copy-only). The walk found and 2.2c repaired a gap: the finalist surfaces hand the gate a saved-pick projection without `skus`, so the gate now reads the SKU from the catalog record of the same id in the results-time index, and from nowhere else | All flags false |
| **2.2d** | Calculation / threshold **status copy** beside Payment Choice: the sheet records the placement it was opened from (memory only; cleared on close and by the wipe), every plan card asks the gate for the customer's chosen finalist on that placement's surface, and only an `available` price yields copy — `quote-only` when the plan has no approved formula, `threshold-unknown` when the plan publishes a minimum purchase and no runtime transaction amount exists. Status only, never a figure; the §25 currency-amount ban on the D4 surfaces stands untouched; `''` in every production state. The harness opens the sheet from the Sleep Plan in every state; the threshold line sits inside the promotional exact-offer block, which the harness cannot open because `exactPromotionsEnabled` stays false (Invariant 11), so the unit suite owns it | All flags false |

With 2.2a–2.2d the disabled implementation the 2026-09-09 direction named is
complete for this item — code, configuration model, UI consumers, failure
states, operational controls and the staging / live-like verification path —
and waits for the final gate. None of it closes item 2.2.

After 2.2c the item has the code, configuration model, consumers, failure
states, operational controls and staging path the direction named, and waits
for the final gate — which has not been run. None of the three slices advances or closes item 2.2 (its
Exit's exclusion).

## Device rehearsal path (Codex correction 2026-09-09)

The loopback harness cannot be reached from a mounted iPad, and the public
preview keeps pricing disabled, so before this correction no physical device
could exercise active pricing or its failure states. `tools/serve_pricing_preview.py
--device <private IPv4 of this machine>` closes that gap as a **separate,
opt-in, non-shipping** mode: the same in-memory drill state (dark, available,
stale, unapproved, unavailable, disabled) served on one RFC 1918 address this
machine owns, so mounted Safari on the same private network walks every
state. Its guarantees, each pinned by `tests/pricing_harness_check.py` (a
refusal matrix, an in-memory allowlist and banner probe, and Chromium walks
over the host's own private address): the default loopback mode is byte-for-
byte unchanged and `--bind` still refuses every non-loopback address;
`--device` refuses 0.0.0.0, loopback, link-local, multicast, reserved and
public addresses, IPv6, hostnames, the documentation ranges, and any private
address the machine does not own (the bind fails); the domain lock is
satisfied in memory only (`/data/allowed-hosts.js` served as exactly the bind
address — the committed allowlist is never written); the page is served with
one fixed NON-SHIPPING banner naming the state, appended in memory before the
page's own `</body>`; every price is the FIXTURE placeholder and says so
beside itself; the served store-config keeps the committed blank `gasUrl`
(the mode refuses to start otherwise), so nothing can send; every response is
`no-store` and `noindex`; and — the device audit's load-bearing finding — the
mode serves **only the app** (`/`, `index.html`, `manifest.json`, an in-memory
`robots.txt` that disallows everything, `data/`, `images/`): the loopback
default serves the whole repository with directory listings, `docs/`,
`incoming/`, `tools/`, `tests/` and the `.git` pointer, which is fine on
loopback and a disclosure on a shared network, so in device mode every other
path is 404 and no directory is ever listed — judged on ONE percent-decoded,
canonical request path that is also exactly the path served (the Codex
re-review of 2026-09-10 reproduced `/data/%2e%2e/CLAUDE.md` → 200 while the
allowlist still judged the raw path; the harness check now drives encoded
traversal, encoded separators, double encoding, overlong UTF-8, NUL and dot
segments on GET and HEAD against a live device server). The check proves the domain lock
without a real LAN bind (Chromium's host-resolver rules map a name onto
loopback: the shipped allowlist blanks it, device mode admits it) and adds a
real private-address bind when the host has one. Measured limits an operator
must expect: the session-policy override refuses non-loopback hosts, so the
idle warning and wipe cannot be shortened on the device; `isDevelopmentMode()`
treats `192.168.*` as development and `10.x` as production; rehearse in a
Safari tab, not from the Home Screen (`manifest.json`'s `start_url` names the
Pages path); the RSA roster starts empty per origin; and while it runs the
page is readable by every device on that network with no authentication —
use a phone hotspot or an isolated access point, never a guest network.
Nothing here is a Lacks price, approval, clearance or verification, and
running it is not the mounted-device pass — that pass remains in the final
gate, now with a path to walk.

## What stays for the final gate

Real governed price data (`products`, `formulas`, the catalog `skus` values);
`displayEnabled` and every surface flag; the written business and legal
approvals, native-Spanish review and MAP clearance; hardware and browser
verification on the mounted device; live deployment. No provisional value,
label or approval status in a fixture or harness is ever represented as
approved, and no fixture ever enters `incoming/`, the workbook, `data/` or
`demo/`.
