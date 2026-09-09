# Integrated production-readiness candidate — 2026-09-09

Roadmap sequence item 14, steps 6 and 7 of the owner build direction of
2026-09-09: **one integrated candidate** assembled from the bounded
construction PRs, and **one final combined validation with the activation
decision recorded**. "Production ready" here means what the direction
defined: code, configuration model, UI consumers, failure states,
operational controls and the staging / live-like verification path are
complete. It does **not** mean production-active: nothing in this
candidate activates anything, and every human-facing gate the direction
deferred stays deferred to the single final pass listed at the end.

## What the candidate is

Branch `claude/integrated-candidate-2026-09-09`, from `main` `e76890c`
(PR #106), merging the seven construction tips with `--no-ff` in this
order, so every constituent PR is a first-class parent in the history:

| merge | PR(s) | tip | what it carries |
|---|---|---|---|
| 1 | #107 → #108 → #109 → #110 → #112 | `928bb8f` | Phase 2.2 disabled pricing incorporation (gate, five surfaces, localhost harness, Payment Choice status copy) and accessory price provenance |
| 2 | #111 | `1a837f0` | accessory payload minimisation (the email packet's three-field accessory projection) |
| 3 | #113 → #114 | `bd6633e` | A4.1 case-fold repair (nine-question impact measured) and A4.2 vocabulary governance, with #114's CI wiring fix |
| 4 | #115 | `0bec310` | the readiness gap enumeration, G5 converter line endings, G6 count derivation, G1 stale sentence |
| 5 | #116 | `eded83d` | G4 the local-CI mirror's interpreter admission gate, re-cut |
| 6 | #117 | `963ef7e` | G2 the send-nothing delivery harness and its rendered check |
| 7 | #118 | `158b9de` | G7 the drawer promotion ink repair, report and rendered check |
| integration | — | `f996807` | the merged runner's array closed cleanly; every stated step count re-derived |

Integration facts worth knowing: the conflicts were the same three
families every time (the workflow's count comment, the mirror's check
array, the sweep manifest) and were resolved by keeping both sides; the
binary workbook was regenerated from the merged `incoming/` sources through
the canonical pipeline rather than merged; the demo bundle matches a fresh
rebuild; the converter's line-ending churn on untouched files (fixed by G5)
was discarded before G5 was merged.

## Invariants — verified on the candidate's shipped data

| invariant (owner direction, verbatim) | value on the candidate | pinned by |
|---|---|---|
| `gasUrl` remains blank; no live lead or email delivery | `""` | smoke, session-safety, delivery harness (shipped walk: zero POSTs) |
| `pricing.displayEnabled` remains false; all production pricing surfaces remain false | `false`; every surface `false` | pricing contract (dark shipped-state lock), pricing presentation, pricing harness (shipped walk: no slot) |
| production pricing products and formulas remain empty | `[]` / `[]` | pricing contract, converter validation |
| `exactPromotionsEnabled` remains false | `false` | financing validation, harness Invariant 11 |
| no provisional or unapproved price, financing, inventory or Spanish claim represented as approved | every harness value is a FIXTURE placeholder and says so; Spanish stays provisional | pricing harness, Payment Choice §25, trust integrity |
| no showroom authorization or live production activation implied | `promotions.scenarios` `{}`, `discount.mode` `disabled`, Code.gs CAN-SPAM sentinels in place | Daybreak contract, delivery harness Code.gs replay (shipped refuses) |

## Final combined validation (automated, on the candidate head)

| gate | result |
|---|---|
| local mirror, every step but the sweep (foreground driver) | 56 passed, 0 failed (run in two parts; the host killed the first driver under memory pressure at step 51 and the second resumed from the next step) |
| mutation sweep | 695/695 caught, 0 survived, 0 did not apply |
| lineage (sources → workbook → bundle) | 10/10 |
| demo bundle `--check` | 3 generated files match a fresh rebuild |
| pricing harness (staging / live-like path, rendered) | in the mirror |
| delivery harness (send-nothing live path, rendered) | in the mirror |
| promo-ink rendered check | in the mirror |
| suite preflight (interpreter admission gate) | in the mirror |
| CI on the candidate PR (#119) | Full suite pass (16m36s, Linux sweep included) |

## Activation decision

**Not activated.** The candidate is production-ready in the direction's
sense and production-inactive in every configurable respect. Activation of
any surface — live delivery (`gasUrl`), pricing display, exact promotion
terms, a current-event scenario, the Savings Pass — is a separate,
owner-gated act that no merge, CI run or Pages build authorizes.

## The one final human pass (deferred, not waived)

Consolidated from every interim gate the direction deferred:

- mounted iPad / Safari device pass, both orientations, touch and rotation (2026-08-23 waiver; 1.4 matrix)
- salesperson role-play kits and the customer-visible consultation read-through
- native-Spanish review (Invariant 12; every ES string stays provisional)
- business / legal approval of pricing display, financing exact terms, privacy / CAN-SPAM values (G3) and promotion evidence
- governed real pricing data (products, formulas, authority, freshness) before `pricing.displayEnabled` can be true
- showroom authorization and the live activation decision itself
