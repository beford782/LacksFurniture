# Payment demo — owner demo-first direction (2026-10-05)

## The direction (Blake, 2026-10-05, confirmed in session)

Build a complete, visually impressive **pricing and payment demonstration**
for Lacks: the price of the best-fitting mattress in the customer's size, the
complete Sleep System, the payment choices, and what changes when an item is
upgraded, removed, or paid for differently. This is the primary customer
demonstration. It supersedes the roadmap's "no further slice is authorized"
wording **for this bounded demo only**.

Authorized: the integrated demo, the app presentation and internal purchase-state
changes it needs, isolated illustrative demo data and harness tooling, LAN demo
access for an iPad through the existing `--device` mode, focused regression
coverage, a bounded agent swarm, local commits on the implementation branch.

Not authorized: presenting illustrative figures as Lacks offers; fabricating
evidence, approvals or current-price verification; activating production
pricing, promotions, payment calculation or live services; changing sleep-fit
scoring or protected public fields; push, PR, merge, deployment, external
publication, or messages to Lacks or lenders.

Owner choices recorded the same day: **fixed factor** for interest-bearing
examples (no amortization method added), **historical snapshot prices** where
captured, lease-to-own shown as **"To confirm"**, the first showing on a
**physical iPad**.

## What it is

- `python tools/serve_pricing_preview.py --state demo` (loopback) or
  `--device <this laptop's private IPv4> --state demo` (iPad on the same
  private network). Everything is assembled **in memory**.
- Prices: lacks.com product pages from the committed 2026-10-03 capture
  (`demo/price-review/2026-10-03`, labelled *historical*), plus illustrative
  fills (`demo/payment-demo/illustrative-prices.json`, each with its method,
  marked ◇ in the UI). Every catalog mattress is priced in every size.
- Payments: four example plans (`demo/payment-demo/demo.json`, provider
  "Demo"): 0% for 12 and 24 months (published equal division), 9.99% for 48
  and 72 months (fixed factors equal to the amortization factor). Computed
  only by the app's governed `payEstimate`. Lease-to-own and in-house credit
  read "To confirm".
- The **purchase studio** on the Consultation Summary (`purchaseStudioFor` /
  `renderPurchaseStudio` in `index.html`) renders only when the build declares
  `illustrativeDemo.enabled` and the price gate is open. Shipped data has
  neither, so production renders nothing (pinned by
  `tests/payment_demo_check.py`).
- Monthly effects are the difference between two **complete** quotes under
  the same plan, term and down payment.
- The demo's internal approval stamps all read `ILLUSTRATIVE DEMO`; the
  customer sees the bilingual demo notice and the price/payment provenance
  lines, never an approval claim. The demo re-dates its own dataset at server
  start so the app's freshness gates admit it; the historical observation
  date stays in the customer-facing provenance line.

## Deliberate departure from the governed review build

Slice 2 keeps payment figures inside the workspace only (take-home
exclusion). The demo shows them on the Summary because the owner direction
asks for monthly payments beside merchandise prices. This applies **only**
under `illustrativeDemo`; the governed `payments`/`review` builds and shipped
behaviour are unchanged. Promoting the studio to the governed path is an
owner decision for launch preparation.

## Pre-launch list (not demo blockers)

- Real Lacks prices per size and accessory, with owner verification; MAP or
  advertising clearance for showing exact prices.
- Real lender plans, factors, minimums, down-payment rules and disclosures;
  lender and legal approval of the payment presentation, including payment
  figures outside the workspace.
- Native-Spanish review of all studio copy.
- Tax, delivery and setup: unknown, excluded and labelled.
- Split-base configurations (two Twin XL bases under a King) are not
  modelled; quantities of a base stay 1.
- Physical iPad Safari, VoiceOver and moderated role-play (sequence step 7).
