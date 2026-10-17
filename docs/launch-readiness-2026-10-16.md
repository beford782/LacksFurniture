# Launch readiness: one application, by scope (2026-10-16)

Owner direction (Blake, 2026-10-15/16): one operable application; readiness is judged on a complete usable assortment and the integrated payment experience; a failure must disable only its own scope (whole app, one product, one offer, one plan, or email); a missing optional offer never disables a valid purchase.

Status: audit of branch `claude/one-app-integration` at `a7581ac` (PR #139); recommendations 2-4 were then implemented on the same branch (2026-10-17). Nothing here authorizes merge, deployment, activation or a send. Companion: `docs/assortment-coverage-2026-10-16.md` (product x size x SKU coverage), `docs/one-application-2026-10-15.md` (inputs table).

## 1. Blast radius: what each failure disables today (code reading)

| Failure | Disabled at runtime | Code |
|---|---|---|
| No offers configured | Nothing. Prices, totals and payments run without discounts | `admittedOffers` index.html:14329; `buildConsultationQuote` 14465 |
| One invalid / expired / unapproved offer | That offer only. A duplicated id drops every copy of that id | `offerAdmitted` 14287, `admittedOffers` 14329 |
| One product-size unpriced, stale, uncleared or without a SKU | That product at that size renders **nothing** (`off`, not "price unavailable"). In the studio that line is listed as missing, and the subtotal, every payment, all offers and the emailed quote are withheld | `pricePresentationFor` 13922 (`if (!sku) return off`; `!fresh \|\| !eligible` -> off); `quoteLineFor` 14162; `purchaseSummaryFor` 16126 |
| The chosen mattress unpriced at the customer's size | The whole purchase studio (accessory prices in the studio included). Sleep System accessory prices still show on their own surface | `psContext` 15719 |
| One plan stale, unverified, `paymentCalculationEnabled` false, no formula artifact | That plan only. An open-end promo plan drops out of the studio cards. Other plans still calculate | `psPlans` 15591, `payEstimate` 14919, resolver `finValid` 13640, formula axis 13663-13697 |
| Financing envelope stale (top-level `verifiedAt`) or `exactPromotionsEnabled` false | Every exact term and payment (scope: financing). Generic Payment Choice education stays | `financingTermsFresh` 13391, resolver `finValid` 13640 |
| Plan with a minimum but no `qualifyingBasis` | No payment for that plan ("Minimum purchase basis to confirm"). Both Synchrony plans publish minimums, so this blocks every payment today | `psPay` 15537, `quoteQualifyingAmount` 14523 |
| `gasUrl` blank / send fails / CAN-SPAM properties unset | Email only. Preview mode, or one auto-retry then "Try again", or `canspam_not_configured`. The consultation and figures are untouched | `emailDeliveryLive` 20511; send path ~24150-24330 |
| A presentation approval, authority, freshness or sourcePolicy approval missing | Every price, offer and payment (scope: pricing as a whole, by design). The consultation is untouched | resolver eligibility 13714; `pricingPresentationApproved` 14270 |
| One malformed `pricing.products` entry at build time | The whole converter run: blocking error, no files written. Caught on the PR, so the deployed site is unaffected | `tools/convert_store_data.py` 984-989 |

### Scopes broader than the failure (recommendations, not implemented)

1. **Build/CI time bomb (largest).** Once pricing is enabled, a single entry that ages past `freshness.maxAgeDays` (`validate_pricing` -> `_pricing_freshness`, validation.py:3641, called at 4471), an expired price window (4553), stale offer evidence (4027), an ended offer (warning, 3999) or a stale financing stamp with `exactPromotionsEnabled` true (warning, 2694) becomes blocking. CI runs the validator with `--warnings-as-errors` (ci.yml:246-249; `tests/lineage_check.py`:167). Result: one product, offer or plan aging out turns **every** PR red and stops the converter, which blocks unrelated fixes. With financing `maxAgeDays: 7` that happens weekly. Runtime already fails each of these closed per entry. **Change:** in `tools/validation.py`, report age-only conditions (stale, expired window, ended offer, stale financing) as a non-blocking "inert at runtime" class that `--warnings-as-errors` does not promote. Keep every structural, authority and evidence-shape error blocking. Add a separate scheduled freshness report. Note: the roadmap's 2026-08-28 round-3 correction records "validation still refuses a stale entry in an enabled production configuration", so this is Blake's governance call.
2. **Unmatched product shows nothing, not "price unavailable".** `pricePresentationFor` returns `off` when there is no SKU or no entry. The `price-unavailable` state is reachable only for a fresh, eligible entry that fails formatting. **Change:** in `pricePresentationFor`, when pricing is active and approved (`pricingPresentationApproved(p)` and the surface is on) but the product-size has no SKU or no entry, return `price-unavailable` with governed copy. Stale and unapproved entries stay `off` (roadmap state table).
   - **Implemented 2026-10-17 (uncommitted, PR #139 branch):** `pricePresentationFor` returns `price-unavailable` for no SKU / no entry only while `pricingPresentationApproved(p)` and the surface are on; existing stale or uncleared entries and every dark state stay `off` (pinned in `tests/pricing_presentation_check.mjs`).
3. **One unpriced accessory withholds valid offers on priced lines.** Offers run only over a fully resolved quote (14465), so the mattress shows its list price while a protector is unpriced. **Change:** in `buildConsultationQuote`, apply an admitted offer whose `minimumMerchandiseMinor` is null and `payment` is `any` to resolved lines even when the quote is incomplete, still without a subtotal. Minimum-bearing offers stay withheld.
   - **Implemented 2026-10-17:** `quoteApplyLineOffers` discounts resolved lines on an incomplete quote with the complete path's stacking; any fitting offer with a minimum keeps that line at list; pay-in-full-only applies under pay in full only; no subtotal, savings total or payment.
4. **One unpriced line removes every priced figure from the email.** `purchaseSummaryFor` returns null unless complete (16126), so `quote` is null. **Change (needs Code.gs, owned elsewhere):** a partial summary, v2, with priced lines plus "price unavailable" lines and no subtotal or payment. Until then the studio's Remove action lets the salesperson complete the purchase.
   - **Implemented 2026-10-17:** summary v2 (`complete: true|false`); the incomplete form lists priced lines and "Price unavailable" lines with no total keys; `emailQuoteGate`, Code.gs `_safeQuote` and both MIME builders accept it and refuse any total in it; the take-home renders the same summary.
5. **Accessory-only purchase cannot be quoted** (`psContext` 15719 requires a priced mattress). This is acceptable for the mattress-led consultation. Revisit only if Lacks wants accessory-only quotes.

## 2. Approvals and restrictions: source, need, and consolidation

Source key: **B** = Blake's instruction; **D** = documented business or governance requirement; **X** = external (law, lender or vendor); **I** = implementation choice. Reg Z, FTC and MAP characterizations are mine, are not recorded in the repo, and need legal confirmation.

| Gate | Protects | Source | Keep? | Combine into |
|---|---|---|---|---|
| `pricing.authority` owner/role | An accountable price owner | I (Phase 2.1 contract), under B 2026-08-28 approval-timing ruling (roadmap §2.1) | Yes | **A** |
| `freshness` approval + `maxAgeDays` (1-60) | Stale prices | I; the value is a business choice | Yes | **A** |
| `sourcePolicy` approval + hosts | Off-site and archive evidence | I (`tools/source_hosts.json`) | Yes | **A** |
| Presentation approvals: business, legal | Price and payment wording | B 2026-08-28: final business/legal approval right before live deployment | Yes | **A** |
| Presentation approval: native Spanish | ES parity | D (roadmap round-1 correction: "remain activation requirements"); deferred for review builds 2026-10-14 | Yes | **A** (separate signer line) |
| Per-entry `verifiedBy`/`verifiedAt` | No fabricated attestation | I (validator); truthfulness | Yes | One **price verification batch** per recapture |
| Per-entry MAP clearance | Vendor pricing policy | X (vendor MAP/UPP); D (activation requirement, roadmap 2026-08-28) | Yes | **C** (one Lacks/vendor letter covering the list) |
| Sale-price classification (`regular` vs `promotional` + `endsAt`) | Truthful former-price/sale claims | X (FTC 16 CFR 233, Texas DTPA); I (promo needs end) | Yes | **A** (policy ruling) |
| Offer evidence + approval | Exact discounts | I | Yes, per offer | Per offer (delegate the approver role in **A**) |
| Financing `verifiedAt` + `maxAgeDays: 7` | Changed lender terms ("discontinue or alter anytime") | D (`lacks_financing.json` `_meta.operatingState`: weekly re-verification); the value 7 is I | Yes; the value is negotiable | Weekly re-verify task |
| `exactPromotionsEnabled` | Exact rate and term claims | B/D (operating decision; a named owner accepts the weekly and takedown duty) | Yes | **A** |
| `paymentCalculationEnabled` + formula artifacts | Payment figures only from published methods | B 2026-10-03 (implementation authorized, activation separate); X (Reg Z 1026.16/1026.24 trigger terms, lender advertising approval) | Yes | **A** (legal) + **C** (lender) |
| `qualifyingBasis` | Not implying eligibility | I; needs an X fact from Synchrony/Lacks | Yes | A fact, not an approval (written lender answer) |
| `downPaymentRequired` (0%/48) | No payment on an assumed $0 down | X (published lender term) | Yes | A fact |
| CAN-SPAM values (unsubscribe, postal, privacy contact) | Lawful commercial email | X (CAN-SPAM, 15 U.S.C. 7704) | Yes | **E** |
| `gasUrl` blank + CI lock | No accidental sends | B (CLAUDE.md; 2026-10-15 "not authorized: customer emails") | Re-pin | **E** |
| Privacy-copy mode validator | Truthful data-use statements | I (`_check_privacy_prose_mode`) | Yes | **E** (approved EN/ES copy) |
| `discount.mode: disabled` | No non-redeemable "code" promise | B (CLAUDE.md) | Yes; offers replace it | none |
| Daybreak `scenarios: {}` | Ungoverned campaigns | B/D (owner auth + evidence + bilingual review) | Yes, until a campaign | per campaign |
| Domain lock | App runs only on allowed hosts | I (M1, `allowedHosts`) | Yes | none |

**Recommended consolidation: four owner-level records plus recurring operational stamps.**
- **A. Lacks launch approval.** One dated record signed by Blake (owner), Lacks business and Lacks legal, with a native-Spanish signer line. It covers authority, freshness `maxAgeDays`, source hosts, the price context (which store or ZIP), sale-price policy, presentation (business/legal/ES), `exactPromotionsEnabled` and the weekly duty owner, the two formula approvals, the surfaces to turn on, and the offer-approver role. The validator's separate fields are all filled from this one record (same `by`/`at`).
- **C. External clearance.** One written confirmation from Lacks (and vendors as needed) that the listed prices are MAP-compliant. Lender (Synchrony) approval of the payment presentation.
- **E. Email go-live.** Sending account, CAN-SPAM values, approved EN/ES privacy copy, the `/exec` URL.
- **Recurring, not approvals:** a price verification batch per recapture, weekly financing re-verification, and per-offer approval.

## 3. What "lifting the CI lock" means

The step is **"Shipped operating state unchanged"** in `.github/workflows/ci.yml` (lines 797-847). It runs inside the required check "Full suite (18 checks)". It asserts five things against `data/store-config.json`:
1. `financing.exactPromotionsEnabled is False`
2. `gasUrl` blank
3. `discount.mode == "disabled"`
4. `promotions` equals the inert Daybreak contract (`scenarios: {}`)
5. "pricing ships dark": `enabled` and `displayEnabled` False, every surface False including `email`, and `products`, `formulas` and `offers` all `[]`

A lifting PR does **not** delete the step. It changes `incoming/` (pricing, financing, `build_lacks_workbook.py` "GAS URL"), regenerates `data/`, and **replaces** each lifted assertion with a pin of the approved activated value:
- pricing: `enabled`/`displayEnabled` True and `surfaces` equal to the exact approved map. Pin the products (productId, size, sku) set or its digest, `formulas[].planId` == the approved plans, and `offers` == [] or the approved ids. Pin identities, not timestamps, so weekly refreshes stay reviewable without editing CI.
- financing: `exactPromotionsEnabled` True.
- email: `gasUrl ==` the exact approved `/exec` URL.

Assertions 3 and 4 stay as they are. Each pin should also accept the fully dark form, so an emergency takedown (`enabled: false` or a blank `gasUrl`) never fails CI. The same PR updates the co-pins that assert the shipped dark state: `tests/smoke_check.py`:55, `tests/session_safety_check.mjs`:1670-1671, `tests/exact_promotions_policy_check.mjs`:77, `tests/pricing_contract_check.py` (172, 241, 270), and any shipped-state pins in `tests/pricing_harness_check.py`. The required check remains required, and branch protection is unchanged. Merging that PR is the activation and deploys through Pages, so it needs Blake's explicit authorization.

## 4. Launch phases (full intended scope preserved)

| Phase | Operates | Still unavailable | Needs |
|---|---|---|---|
| 1 (today, preview) | Full consultation, recommendations, Sleep System, Payment Choice education ("To confirm", no figures), take-home preview | All prices, payments, offers, email | none (already in preview) |
| 2 Prices | Verified prices for the matched subset (50 mattress pairs and 37 accessory sizes at best, all re-verified). Purchase studio for fully priced purchases; a partly priced purchase shows its priced lines (with line offers) and "price unavailable" lines, with no total or payment, on screen and in the email | Prices for 106 unmatched mattress pairs; payments | A, C (MAP), recapture plus verification batch, catalog SKU map, sale-price ruling, fix 1 (time bomb) |
| 3 Payments | 9.99%/72 fixed-factor and 0%/48 equal-division | In-house, lease-to-own, Build My Credit, Mexico ("To confirm") | Fresh browser re-verification, `qualifyingBasis` from Synchrony, the 0%/48 rounding sentence captured verbatim, lender approval, `exactPromotionsEnabled` and `paymentCalculationEnabled` |
| 4 Email | Live take-home with the priced quote | none | E plus a controlled real send |
| 5 Offers | Current Lacks promotions | none | Per-offer evidence and approval |

**Financing currency conflict (open).** Caller-reported search-index evidence from 2026-10-16 shows a lacks.com financing variant reading "9.99% APR for 60 months, fixed payments 2.1242%". The repo holds 72 months / 1.8521%, verified 2026-10-03. Nobody knows which version is current (lacks.com returns 403 to automation). Phase 3 needs a fresh capture in Blake's own browser before any plan is re-stamped.

**Owner decisions (grouped):**
1. Sign record A, and name the Lacks business, legal and Spanish signers.
2. Obtain C: the MAP letter and the lender presentation approval.
3. Rule on sale-price classification and the store/ZIP price context.
4. Decide whether age-based validation stops blocking CI (recommendation 1). Recommended: yes, because each item already fails closed on its own at runtime. This would revise the 2026-08-28 round-3 correction. Recommendations 2-4 are already built.
5. Choose the sending account and obtain record E.
6. Authorize each activation PR and its merge.

**Verification outstanding:**
- browser walk on real iPad devices;
- VoiceOver;
- native-Spanish review;
- a controlled real delivery to a seed inbox (EN and ES);
- full CI on each activation PR's exact head;
- post-merge `ci-closeout`;
- a Pages served-file check that `data/store-config.json` matches the merged blob.
