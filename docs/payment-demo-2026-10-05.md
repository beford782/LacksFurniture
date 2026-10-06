# Payment demo: owner demo-first direction (2026-10-05, closeout 2026-10-06)

## The direction (Blake, confirmed in session)

Build a complete, visually impressive **pricing and payment demonstration**
for Lacks:
- the price of the best-fitting mattress in the customer's size;
- the complete Sleep System;
- the payment choices;
- what changes when an item is upgraded, removed or paid for differently.

This is the primary customer demonstration. It supersedes the roadmap's "no
further slice is authorized" wording **for this bounded demo only**.

**Authorized:**
- the integrated demo, with the app presentation and purchase-state changes it needs;
- a narrowly isolated demo adapter;
- illustrative demo data and harness tooling;
- LAN access for an iPad through the existing `--device` mode;
- focused regression coverage;
- a bounded agent swarm;
- local commits on the implementation branch.

**Not authorized:**
- presenting illustrative figures as Lacks offers;
- fabricating evidence, approvals or current-price verification;
- activating production pricing, promotions, payment calculation or live services;
- changing sleep-fit scoring or protected public fields;
- push, PR, merge, deployment, external publication, or messages to Lacks or lenders.

**Owner choices:**
- the first showing is on a **physical iPad**, through the existing `--device` mode;
- interest-bearing examples use the **fixed-factor** method only (no amortization method added);
- **historical snapshot prices** where captured;
- lease-to-own shows **"To confirm"**.

## How to run it

- Laptop: `python tools/serve_pricing_preview.py --state demo --port 8000`, then
  open `http://127.0.0.1:8000/`.
- iPad: `python tools/serve_pricing_preview.py --device <this laptop's
  private IPv4> --state demo --port 8000`, then open
  `http://<that address>:8000/` in a Safari tab.

Everything is assembled in memory. No committed production file changes.

## What the demo contains

- **Prices.** Lacks.com product pages from the committed 2026-10-03 capture
  (`demo/price-review/2026-10-03`). Each keeps its **own observation
  instant** and is labelled historical. Gaps are filled from
  `demo/payment-demo/illustrative-prices.json`: each fill names its method
  and is marked ◇ on every price surface. Every catalog mattress is priced in
  every size.
- **Payments.** Four example plans in `demo/payment-demo/demo.json`,
  provider "Demo": 0% for 12 and 24 months (equal division), and 9.99% for
  48 and 72 months (fixed factor). Each `exampleFactor` is the standard
  amortization factor.
  - The plans are `verified: false`, carry `verificationStatus:
    "illustrative"`, and keep calculation **off**.
  - Their example method sits in `demoCalculation`.
  - Lease-to-own and Lacks in-house credit are the real records, unchanged,
    and read "To confirm".
- **The purchase studio** on the Consultation Summary
  (`purchaseStudioFor` / `renderPurchaseStudio`):
  - size chips;
  - the mattress being priced, chosen from the saved picks;
  - base, pillow and protector choices, each with its price difference and
    monthly difference;
  - an **explicit split King** (two Twin XL adjustable bases, priced as two
    Twin XL units; leaving King returns it to one base);
  - the itemised merchandise subtotal;
  - pay in full and the example plans, each showing total paid with the down
    payment included;
  - an optional, validated down payment;
  - the selected plan's figures.
- **Monthly effects** are the difference between two complete quotes under
  the same plan, term and down payment.
- **Other surfaces.** Results cards, the drawer and compare show the monthly
  example, and compare adds the complete system with each mattress. The
  take-home preview lists the priced system as "shown in store, not
  emailed"; nothing is added to any send payload.

## The demo admission boundary

The app admits demo data only through **one adapter** in the price-gate
block of `index.html` (`demoAdmission`, `demoPriceEntry`,
`demoPricePresentation`, `demoPlanAdmitted`, `demoPayEstimate`).

The consumers that reach it:
- `pricePresentationFor` branches to the adapter only under demo admission;
- `financingPlanFresh` routes a plan marked `demo: true` to the adapter, and
  never routes any other plan there;
- `payEstimate` hands a demo plan to `demoPayEstimate`, which uses the same
  integer helpers (`payFixedFactorMinor`, `payEqualDivisionMinor`,
  `priceMoneyValid`).

Production admission is unchanged and never falls back to the adapter.

Demo admission needs **two** conditions:
1. **A harness demo context.** `tools/serve_pricing_preview.py --state demo`
   writes `window.__DF_DEMO_CONTEXT` into the page it serves. The object is
   frozen and non-writable, and carries a per-run random nonce.
2. **A validated `illustrativeDemo` configuration** carrying the same nonce,
   contract `payment-demo/1`, an assembly time and the bilingual notices,
   with `gasUrl` blank.

Neither condition alone admits anything. A config flag, a URL parameter, a
storage value or any control in the app cannot create the context.

This boundary separates **the normal served build from the harness
demonstration**. It is not protection against someone editing client-side
code; no browser-side check can be.

What the demo waives, and what it doesn't:
- It waives real-offer **approval** only.
- The adapter, and the harness's `validate_payment_demo`, still check:
  - identity (the catalog's own SKU for that product and size);
  - size and money (integer minor units, USD);
  - provenance status and observation time not after assembly;
  - supported method, factor precision, APR/term ranges and rounding.

Honest records:
- Pricing approval, freshness, source-policy and clearance records are the
  **shipped** ones (unapproved/pending).
- No formula artifact is written.
- Financing `exactPromotionsEnabled` stays false, and its own `verifiedAt`
  is untouched.
- The assembly time (`illustrativeDemo.assembledAt`) is separate from every
  evidence time and never substitutes for one.

The production validators **refuse** the demo data by name:
- `validate_pricing` refuses the demo provenance statuses;
- `validate_financing` refuses the demo-only plan fields;
- `validate_store_config` refuses `illustrativeDemo`.

The harness serves the demo only when the demo contract validates **and**
all three production validators refuse it.

**Consequence:** the governed payment-details sheet (Bring It Home) makes no
exact claim for an example plan. Examples are calculated in the studio only.

## Deliberate departure from the governed review build

Slice 2 keeps payment figures inside the workspace only. The demo shows them
on the Summary, results, drawer and compare because the owner direction
asks for monthly payments beside merchandise prices. This applies **only**
under demo admission; the governed `payments`/`review` builds and shipped
behaviour are unchanged.

## Physical iPad check

2026-10-06: Blake ran the demo on a physical iPad (Safari, via the
`--device` harness) at `d2cf9e9` and reported that it all worked. That is
the owner's own report; no device-side details (orientation, connection
route, VoiceOver) were recorded.

## Review status

- **Web review** (CLAUDE.md's terminal-plus-web pattern) **has not
  occurred.** The review packet is
  `docs/payment-demo-web-review-packet-2026-10-06.md`.
- **Agent reviews** (bounded, read-only) were completed and their findings
  resolved. They do not replace web review.

## Pre-launch list (not demo blockers)

- Real Lacks prices per size and accessory, with owner verification, and
  MAP/advertising clearance for exact prices.
- Real lender plans, factors, minimums, down-payment rules and disclosures,
  plus lender and legal approval of the payment presentation, including
  payment figures outside the workspace.
- Native-Spanish review of all studio copy.
- Tax, delivery and setup: unknown, excluded and labelled.
- Whether the studio should move from demo-only into the governed review
  build: an owner decision.
- VoiceOver and moderated role-play (sequence step 7). The physical iPad
  demo run passed by Blake's report (above).
