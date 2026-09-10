# Integrated production-readiness candidate — 2026-09-09

Roadmap sequence item 14, **step 6** of the owner build direction of
2026-09-09: **one integrated candidate** assembled from the bounded
construction PRs, with its **automated** engineering verification run once
on the combined state. **Step 7 — the final combined human validation and the
activation decision — has NOT been run.** Nothing in this candidate activates
anything; its inactive configuration is a *safety posture*, not an activation
decision, and every human-facing gate the direction deferred stays deferred to
the single final pass listed at the end.

Codex reviewed the first cut of this candidate and returned **NOT READY**. Its
corrections were applied on the same branch as additive commits and are
recorded in the "Codex corrections" section below.

## What the candidate is

Branch `claude/integrated-candidate-2026-09-09`, from `main` `e76890c`
(PR #106), merging the seven construction tips with `--no-ff` in this
order, so every constituent PR is a first-class parent in the history:

| merge | PR(s) | tip | what it carries |
|---|---|---|---|
| 1 | #107 → #108 → #109 → #110 → #112 | `928bb8f` | Phase 2.2 disabled pricing incorporation (gate, five surfaces, localhost harness, Payment Choice status copy) and accessory price provenance |
| 2 | #111 | `1a837f0` | the email packet's accessory projection narrowed to the exact `Code.gs` fields (name, category, imageUrl) |
| 3 | #113 → #114 | `bd6633e` | A4.1 case-fold repair (nine-question impact measured) and A4.2 vocabulary governance, with #114's CI wiring fix |
| 4 | #115 | `0bec310` | the readiness gap enumeration, G5 converter line endings, G6 count derivation, G1 stale sentence |
| 5 | #116 | `eded83d` | G4 the local-CI mirror's interpreter admission gate, re-cut |
| 6 | #117 | `963ef7e` | G2 the send-nothing delivery harness and its rendered check |
| 7 | #118 | `158b9de` | G7 the drawer promotion ink repair, report and rendered check |
| integration | — | `f996807` | the merged runner's array closed cleanly; every stated step count re-derived |
| corrections | — | see below | the Codex corrections, additive |

Integration facts worth knowing: the conflicts were the same three
families every time (the workflow's count comment, the mirror's check
array, the sweep manifest) and were resolved by keeping both sides; the
binary workbook was regenerated from the merged `incoming/` sources through
the canonical pipeline rather than merged; the demo bundle matches a fresh
rebuild; the converter's line-ending churn on untouched files (fixed by G5)
was discarded before G5 was merged.

## Codex corrections (applied on this branch)

1. **The governed presentation contract, restored globally.** As first
   built, the Phase 2.2 gate mapped every refusal — unresolved, stale,
   not-judgeable, activation-unapproved — onto the `price-unavailable` copy.
   That contradicted the roadmap's own state table for item 2.2 (stale:
   "nothing a customer can see"; unapproved: "nothing on any shipped/live
   customer surface"). `pricePresentationFor` now returns `off` when pricing
   or the surface is disabled, when no applicable record/SKU exists, whenever
   freshness is absent or not fresh (stale, not-judgeable), and whenever
   eligibility is absent or not eligible; `price-unavailable` only when fresh
   and eligible but the admitted price cannot be resolved or safely
   formatted; `available` only for resolved + fresh + eligible data passing
   runtime formatting validation. Stale and unapproved data stays inert: no
   slot, no copy, no number, no email material, no analytics, no persistence.
   Source, comments, the presentation suite, the rendered harness (a sixth
   `unavailable` drill state), the Phase 2.2 record, the roadmap notes and the
   sweep manifest with targeted negative controls were re-cut to it.
2. **Runtime money admission.** Before any formatting or presentation
   admission the gate requires a safe-integer `amountMinor`, strictly
   positive, at most the validator's 1,000,000,000 minor-unit maximum, and
   currency exactly `USD`; `Intl.NumberFormat` is formatting only (it accepts
   `XXX`). Hostile cases — `XXX`, fractional, oversized, zero, negative,
   malformed currency and more — each fail closed with no visible amount.
3. **The email-payload roadmap row** now records the actual history: PR #104
   had already projected the accessory price away; this candidate narrowed
   the remaining projected object to the exact `Code.gs` fields.
4. **Status wording** (this document, the roadmap's item-14 note, PR #119):
   step 6 assembly complete; automated verification complete; final combined
   gate pending; the inactive configuration is a safety posture.
5. **Device-accessible rehearsal path.** The loopback harness could not be
   reached from a mounted iPad and the public preview keeps pricing disabled.
   `tools/serve_pricing_preview.py --device <private IPv4>` now serves the
   same in-memory drill state on one RFC 1918 address this machine owns —
   the domain lock satisfied in memory only, a fixed NON-SHIPPING banner on
   the page, fixture data only, the committed blank `gasUrl` kept (nothing
   can send), every public / unspecified / link-local / IPv6 / hostname bind
   refused, the loopback default byte-for-byte unchanged, and — the device
   audit's load-bearing finding — only the app's own paths served (the
   loopback default serves the whole repository, listings and the `.git`
   pointer included; in device mode everything else is 404, and — after the
   Codex re-review reproduced `/data/%2e%2e/CLAUDE.md` → 200 — the request
   path is percent-decoded once into one canonical grammar that is both
   authorised and served, so encoded traversal is 404 too) — so mounted
   Safari can walk available, stale, unapproved, unavailable and disabled.
   Pinned by the harness check (refusal matrix, path allowlist, allowlist and
   banner probes, a name-mapped Chromium proof that needs no LAN, and a real
   private-address walk when the host has one). Operator limits the audit
   measured — the idle window cannot be shortened off loopback, `192.168.*`
   reads as development, Safari tab not Home Screen, hotspot or isolated AP —
   are in the harness docstring. Running it is not the mounted-device pass;
   that pass remains in the final gate, now with a path.

## The pricing presentation matrix (restored contract, executed)

| condition | resolver axes | gate outcome | what a surface shows | pinned by |
|---|---|---|---|---|
| pricing absent / `enabled` false / `displayEnabled` false / surface flag not `true` | — | `off` | nothing (hidden, emptied) | presentation suite; harness `dark`, `disabled`; every shipped walk |
| no applicable catalog record / SKU (no `skus`, wrong size, mismatched or blank SKU, other product) | price unavailable → freshness not-judgeable | `off` | nothing | presentation suite; harness `available` with king answered |
| technically valid but **stale** (evidence past the cadence) | resolved, **stale** | `off` | nothing — inert internal data | presentation suite (boundary at the limit), harness `stale` |
| no governed cadence / nothing to judge | **not-judgeable** | `off` | nothing | presentation suite |
| technically valid but **activation-unapproved** (approval or clearance withheld) | resolved, fresh, **not-eligible** | `off` | nothing | presentation suite, harness `unapproved` |
| fresh + eligible, admitted price fails the runtime money admission (currency `XXX`, `US`, `usd`, `EUR`…) or cannot be formatted | resolved, fresh, eligible | `price-unavailable` | the governed copy only, no number, no notes | presentation suite, harness `unavailable` |
| fresh + eligible, price out of the validator's bounds (fractional, zero, negative, above the maximum, non-integer) | price unavailable (the resolver's own bounds) → not-judgeable | `off` | nothing | presentation suite hostile cases |
| resolved + fresh + eligible + admitted | all admit | `available` | the localized amount with the governed assumptions and disclosures adjacent | presentation suite, harness `available` (five surfaces, EN/ES, two orientations, and the device walk) |

## Invariants — verified on the candidate's shipped data

| invariant (owner direction, verbatim) | value on the candidate | pinned by |
|---|---|---|
| `gasUrl` remains blank; no live lead or email delivery | `""` | smoke, session-safety, delivery harness (shipped walk: zero POSTs); the device rehearsal refuses a non-blank value |
| `pricing.displayEnabled` remains false; all production pricing surfaces remain false | `false`; every surface `false` | pricing contract (dark shipped-state lock), pricing presentation, pricing harness (shipped walk: no slot) |
| production pricing products and formulas remain empty | `[]` / `[]` | pricing contract, converter validation |
| `exactPromotionsEnabled` remains false | `false` | financing validation, harness Invariant 11 |
| no provisional or unapproved price, financing, inventory or Spanish claim represented as approved | every harness value is a FIXTURE placeholder and says so; the device banner repeats it; Spanish stays provisional | pricing harness, Payment Choice §25, trust integrity |
| no showroom authorization or live production activation implied | `promotions.scenarios` `{}`, `discount.mode` `disabled`, Code.gs CAN-SPAM sentinels in place | Daybreak contract, delivery harness Code.gs replay (shipped refuses) |

## Automated candidate verification (on the exact final head)

The full combined verification — the complete local mirror (every step but
the sweep, in the foreground driver), the complete mutation sweep (zero
survived, zero did-not-apply), demo parity, `git diff --check` and CI — is
run on the **exact final head** of PR #119 after this document is committed,
and its results are recorded in the PR's evidence comment, which names that
head. A docs-only commit after those runs would move the head, so the numbers
live there, not here. Suite sizes on the corrected candidate: pricing
presentation 176, pricing harness 324, pricing contract 158, resolver 235;
sweep manifest 708; lineage 10/10; demo bundle `--check` matches a fresh
rebuild; every pricing-gate and device-rehearsal sweep entry was also run
against its observers in an isolated sandbox before the full sweep (all
caught).

## Not an activation decision

The candidate is production-**inactive** in every configurable respect, and
that is a safety posture: activation of any surface — live delivery
(`gasUrl`), pricing display, exact promotion terms, a current-event scenario,
the Savings Pass — is a separate, owner-gated act that no merge, CI run or
Pages build authorizes, and that this document does not decide.

## The one final human pass (pending, not waived)

Consolidated from every interim gate the direction deferred; none has been
performed:

- mounted iPad / Safari device pass, both orientations, touch and rotation (2026-08-23 waiver; 1.4 matrix) — the pricing states now walkable through the device rehearsal path
- salesperson role-play kits and the customer-visible consultation read-through
- native-Spanish review (Invariant 12; every ES string stays provisional)
- business / legal approval of pricing display, financing exact terms, privacy / CAN-SPAM values (G3) and promotion evidence
- governed real pricing data (products, formulas, authority, freshness, catalog SKUs) before `pricing.displayEnabled` can be true
- showroom authorization, backend (Apps Script) activation and the live activation decision itself
