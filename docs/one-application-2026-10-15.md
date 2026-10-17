# One operable application (owner direction 2026-10-15)

## The direction

Blake, 2026-10-15 (his instruction in session, endorsing a pasted brief):

- There is **no separate payment demo**.
- Pricing, payment calculation, exact promotions and discounts, and email delivery belong to the **one normal application**. Only one version is maintained from now on.
- This supersedes the earlier direction to keep these features in a separate demo or to defer them. That direction is recorded in `docs/payment-demo-2026-10-05.md`, which is now historical.

**Authorized:** implementation, commits, pushing the integration branch, and opening the PR.

**Not authorized:**
- merging;
- production deployment;
- customer emails;
- showroom activation.

Each of those still needs Blake's explicit decision.

## What the normal application now does

Everything below runs in the ordinary build (`index.html` with `data/store-config.json`). There is no startup context, no localhost requirement and no demo entry point.

### One purchase model
`buildConsultationQuote` is the single source for every figure:
- the finalist mattress at the customer's own size;
- every Sleep System line with its quantity;
- a split King base (two Twin XL units), when the base supports it;
- offers;
- totals.

The purchase studio on the Consultation Summary (`purchaseStudioFor` / `renderPurchaseStudio`) reads it, and so does each of these:
- the change-sheet previews;
- the compare system rows;
- Bring It Home (`psSheetPanel`);
- the take-home preview;
- the email.

`purchaseSummaryFor(lang)` is the one closed record that the take-home and the email both consume. Its figures are formatted by the same formatters the screen uses, and its fingerprint guards against stale totals.

### Exact promotions and discounts
Offers are configured in `pricing.offers[]` and validated by `tools/validation.py`. Each offer declares:
- an effect: percent off in basis points, or amount off per unit;
- eligibility by product kind, product ids, brands and sizes;
- exclusions;
- a `[startsAt, endsAt)` window;
- stacking (`exclusive` or `combinable`) and a priority;
- a minimum, measured on the pre-discount complete subtotal;
- a payment rule (`any` or `pay-in-full-only`);
- current evidence on an approved source host;
- a named approval.

The runtime admits an offer only behind the same approved, fresh pricing gate as prices. Malformed data fails closed.

How offers apply:
- Per line, by (priority, id). An exclusive first candidate applies alone. Otherwise every combinable candidate applies, each id at most once.
- Discounts floor to the cent and never take a line below zero.
- The net subtotal feeds the down-payment bound, the financed amount, the qualifying amount, the payments, the monthly differences and the email. A discount cannot be applied twice.
- A pay-in-full-only offer is excluded from plan quotes, and the studio states the difference.

The Savings Pass (`discount.mode`) stays a non-redeemable presentation code. It is never applied to a figure. An exact store discount is configured as an offer.

### Payments
Payments are calculated only through the published, verified methods:
- **`published-fixed-factor`:** the published factor, rounded up to the whole dollar;
- **`published-equal-division`:** a 0% plan, principal ÷ term rounded up.

Every production gate still applies:
- `financingPlanFresh`, including `exactPromotionsEnabled`;
- `paymentCalculationEnabled`;
- an approved, fresh formula artifact;
- a complete priced purchase.

New in the purchase model:
- A plan that publishes a minimum but no computable `qualifyingBasis` shows **"Minimum purchase basis to confirm"**. The merchandise subtotal is never assumed as the qualifying amount.
- A plan with `downPaymentRequired` shows **no figure until a down payment is entered**, and says so.

The studio always distinguishes the merchandise subtotal (cash price), the amount financed, the monthly payment, the total paid (down payment plus scheduled payments) and the interest. "Up to" marks every rounded upper bound. Plans without a published method read "To confirm".

### Email
The take-home flow sends the same purchase summary as `quote`, but only when `pricing.surfaces.email` is true and the summary is complete. Otherwise `quote` is null.

Client behaviour:
- A `sendId` (24 characters, crypto random) is created per content, reused for a retry, and renewed when the figures or contact fields change.
- An in-flight guard (`disabled` + `aria-busy`) stops a double tap from sending twice.
- A transport failure (network, HTTP 5xx, malformed response) retries once automatically with the same `sendId`. After that, a visible "Try again" also reuses it.
- Server refusals are not retried.
- The stale-fingerprint guard re-renders the preview instead of sending changed figures.

`Code.gs` behaviour:
- It requires a valid `sendId` (`invalid_request` otherwise).
- It deduplicates under `LockService` + `CacheService`: a repeated `sendId` gets `{success:true, duplicate:true}` with no row and no email.
- It renders the quote verbatim, escaped, with no server arithmetic.
- Credentials and recipients stay server-side.
- The CAN-SPAM hard block is unchanged.

Preview mode (blank `gasUrl`) still sends nothing. See `docs/gas-activation-runbook.md`.

### Bilingual, accessible, touch
- Every new string has an EN and an ES dictionary key, and a language switch keeps the purchase.
- The struck list price carries a visually hidden "Was" / "Antes".
- Touch handling is unchanged (`psBtn` touchend + click).

## What was retired
- **The demo adapter in `index.html`:** `demoAdmission`, `demoPriceEntry`, `demoPricePresentation`, `demoPlanAdmitted`, `demoPlanById`, `demoPayEstimate`, `DEMO_*`, `psDemoConfig`, `psIllustrative`, the ◇ marks, and every `plan.demo` branch.
- **In the harness:** the demo state, `__DF_DEMO_CONTEXT`, `illustrativeDemo` assembly, the Operator panel and `validate_payment_demo` (`tools/serve_pricing_preview.py --state demo`).
- **Demo data:** `demo/payment-demo/` (`demo.json`, `illustrative-prices.json`).
- **Tests:** `tests/payment_demo_check.py`. The behaviour it covered moved to `tests/purchase_flow_check.py`, which runs against the governed `purchase` harness state. Its mutation-sweep entries were retired or re-anchored.

**Kept:**
- the Daybreak Black Friday demo (`demo/black-friday`);
- the price captures (`demo/price-review`, `demo/price-snapshot`);
- the production validators' refusal of demo provenance (`historical-snapshot`, `illustrative`, demo plan keys, `illustrativeDemo`). These stop unverified values from ever entering production.

## Controls kept, and why

| Control | Why it remains |
|---|---|
| Pricing gate: approvals, authority, freshness, source policy, per-product clearance | No unapproved or stale price is ever shown |
| Validator refusal of governance signatures marked fixture / placeholder / review build / pending verification / illustrative | Harness data can never validate as production |
| `exactPromotionsEnabled`, plan freshness and the formula artifact | No stale or unpublished payment terms |
| CI "Shipped operating state unchanged" lock | The owner's activation switch. Shipped data stays dark until Blake changes it. It now also pins `pricing.offers == []` and `surfaces.email == false` |
| Blank `gasUrl` preview mode, and the `Code.gs` CAN-SPAM block | No accidental email |
| Domain lock | Unchanged |

Activation is now a **configuration decision**. A pricing block with `displayEnabled` and its surfaces on validates once every governance record is complete, and is refused, naming the missing record, otherwise. No code change is needed to go live.

## Inputs still required for full operation
None of these exist in approved form. Each feature stays fail-closed until its input is configured.

| Input | Feature it blocks | Where it is configured |
|---|---|---|
| Pricing authority (owner, role); freshness approval with `maxAgeDays`; source-policy approval with allowed hosts | Every price, and so everything below | `incoming/lacks_pricing.json` → `pricing.authority`, `.freshness`, `.sourcePolicy` |
| Presentation approvals: business, legal, native Spanish review | Every price and payment display, including payment figures outside the workspace | `pricing.presentation.approvals` |
| A verified price per product and size (SKU, amount, evidence, `verifiedBy`), a catalog SKU map, and per-product MAP/advertising clearance | Prices, totals, quotes | `pricing.products[]`; catalog identity: the mattress `skus` column and the accessory `sku` (size-independent) or `accessorySkus` (`SKUs by Size`, added in this change) in `incoming/lacks_mattresses.json` / `incoming/lacks_accessories.json` |
| Surfaces to turn on (results, drawer, compare, sleepSystem, sleepPlan, handoff, email) | Where figures appear; `email` puts the quote in the email | `pricing.surfaces` |
| Fresh financing re-verification (the current `verifiedAt` of 2026-10-03 is past its 7-day `maxAgeDays`) and `exactPromotionsEnabled: true` | Exact plan terms and every payment | `incoming/lacks_financing.json` |
| `publishedPaymentFactor` for Synchrony 9.99% / 72 months (not published in the current evidence) | That plan's payment | the plan in `incoming/lacks_financing.json` |
| `qualifyingBasis` for each plan with a minimum (Synchrony $500, 0%/48 $4,200) | Payments under those plans (otherwise "Minimum purchase basis to confirm") | the plans |
| `paymentCalculationEnabled: true` per plan, plus an approved formula artifact (mode, cadence, approver, verified source) | Payments | plans; `pricing.formulas[]` |
| Lacks in-house terms (open conflict: "up to 24" vs "6–36 months"), lease-to-own and Build My Credit methods | These stay "To confirm" | `incoming/lacks_financing.json` |
| Any current promotion or discount: effect, eligibility, exclusions, dates, stacking, evidence, approval | Offers | `pricing.offers[]` |
| A deployed Apps Script `/exec` URL | Live email | `gasUrl` (store values) |
| CAN-SPAM unsubscribe URL, postal address, privacy contact; BCC destination; privacy and consent copy (EN/ES) | Any real send (`Code.gs` refuses until set) | `Code.gs` constants; `store-config` text |

**Unresolved approvals (business, legal and owner), as distinct from code:**
- business and legal approval of the price and payment presentation, and of payment figures outside the workspace;
- lender approval of the payment presentation;
- native Spanish review;
- the Lacks in-house term conflict;
- the step-7 human validation (VoiceOver, device matrix, role-play);
- any activation.

## Verification (2026-10-15/16)
See the PR description for the exact suites and counts.

The browser walk ran on the governed `purchase` harness state with the loopback mail stub. Playwright Chromium was used because Chrome could not reach the loopback harness. It covered:
- EN at 1180×820 and ES at 820×1180;
- size change;
- split King;
- stacking and the exclusive offer;
- the pay-in-full-only offer dropped under financing, with a note;
- the 72-month fixed-factor and 0%/48 equal-division plans, including the required down payment;
- invalid and too-large down payments;
- a take-home send whose recorded `quote` equals the screen line for line;
- a double tap (one POST);
- HTTP 500 (one automatic retry with the same `sendId`, then "Try again").

Two defects found in that walk were fixed:
- the required down payment read as "optional" and "Needs a complete, priced purchase";
- the take-home said "To confirm" where the email said "Below this plan's minimum".

All figures were fixture values. **No real customer was emailed, and no real send occurred.**
