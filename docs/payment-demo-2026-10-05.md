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

## Summary usability pass (2026-10-06, owner-directed)

**Goal:** make the Summary easy to operate in a customer conversation. Changing the
mattress, refining the system and comparing payments should each take one
obvious action. All of this applies under demo admission only.

**Change mattress**
- The button sits beside the selected mattress and is always present, even
  with one saved pick.
- It opens a focused dialog listing:
  - the current mattress first;
  - then the saved picks;
  - then the leading three recommendations of each tier, in their existing
    sleep-fit order, each once.
- Each option shows:
  - image;
  - tier and position;
  - its existing highlight;
  - price in the current size;
  - the complete-system difference;
  - the monthly difference under unchanged terms.
- A **preview** changes nothing: quotes are built in a sandbox that swaps
  the cart, finalist and saved list, then restores them.
- **Apply** goes through `chooseFinalist`. Size, the Sleep System,
  quantities, the plan and the down payment are kept.
- **Cancel** or Escape leaves the purchase unchanged and restores focus to
  the button that opened the dialog. Applied changes are announced.
- The hero now reads **"Your selected mattress"**. "Best match" appears only
  through the recommendation's own tier/position line.

**One purchase presentation**
- While the studio shows, the Summary's separate finalist hero and Sleep
  System list are hidden.
- Each item gets a compact row with Change, Remove and, where supported,
  quantity.
- An empty category offers **Add**.
- Alternatives open only in the dialog. Split King and the quantity rules
  are unchanged.

**One selected-payment centerpiece**
- It shows the monthly payment (or pay in full), term, APR and down payment,
  with the merchandise subtotal, total paid and interest beside them.
- Amount financed, the scheduled total, the rounding note and provenance sit
  in a closed **Payment details** disclosure.
- The comparison is a compact list. The selected option is marked with a
  check, the word "Selected" and `aria-pressed`.
- Pay in full is the starting choice, framed as one payment.

**Monthly effects** now appear as current-versus-proposed previews inside
the dialog, built from two complete quotes. They are no longer shown on every
settled row.

## Pricing and payment refinement (2026-10-06, owner-directed)

**Direction.** Blake confirmed a pasted refinement brief in session ("Run as
written"). It authorizes this bounded refinement, a three-agent read-only swarm,
regression tests, browser verification and local commits. It does not authorize a
push, PR, merge, deployment, publication, messages to Lacks or lenders, or any live
activation. The brief's starting findings came from Codex; each was re-verified here
before any change.

**Goal:** make every figure mean one thing, keep the purchase's configuration when
an item is replaced, and make the payment comparison quick to scan. The Summary
structure from the usability pass is kept.

**One meaning for each figure.** `psPay` returns the shared read model every payment
surface formats from:
- `merchMinor`, `downMinor`, `financedMinor`;
- `scheduledMinor`, the sum of scheduled payments, excluding the down payment;
- `totalPaidMinor`, the down payment plus the scheduled payments;
- `interestMinor` (0 under equal division);
- `*Upper` flags.

`psBound` adds "up to" only when the figure is an upper bound. An equal division
that divides exactly is exact; every fixed-factor figure is an upper bound. The
arithmetic is unchanged.

The centerpiece, the comparison, Bring It Home and the take-home preview all read
`totalPaidMinor`. The take-home row used to state "total of payments" without the
down payment beside a Summary "total paid" that included it. It now states total
paid and interest.

**Comparison.** Each row has explicit cells: choice (term on one line, APR on the
next), monthly payment, and total paid with interest beneath. The old
`:nth-of-type` grid selectors never matched; they are replaced by explicit classes.
- The APR and term are no longer repeated beside the plan name.
- A down payment applies to every plan, so the list states it once ("Totals paid
  include your $500 down payment").
- Pay in full reads "One payment", with its total paid and "No interest".
- There is no endorsement or preselection; selection is shown by a check mark, text
  and `aria-pressed`.

**Centerpiece.**
- Pay in full: the amount once, framed as one payment. The duplicate subtotal figure
  is removed; the purchase area keeps the subtotal and its exclusions.
- Financing: "Example financing", the monthly figure, then term, APR and down
  payment, then total paid (with how it is made up), interest, and merchandise
  subtotal ("the products' price, before financing").
- The rounding note in Payment details has an exact variant for an exact schedule.

**Replacement keeps its configuration.** A replacement option carries a `config`:
- the prior quantity (two pillows stay two);
- a split King, when the replacement is an adjustable base with a clean Twin XL SKU
  (`psSplitCapable`).

What cannot be kept is named before Apply ("This base has no split King option: it
becomes one King base"). The preview and Apply read the same option config. A
leftover down payment no longer shapes any figure while Pay in full or a quote-only
plan is in view.

**Change sheet.**
- The sheet and its backdrop are body children. While the sheet is open, everything
  else is inert (the financing workspace's ownership pattern). Only what the sheet
  set is released, on Apply, Cancel, Escape, Browse all and the wipe.
- The keydown handler yields to the session-safety dialog above it.
- Focus survives repaints and language switches.
- Apply labels name the action: "Choose this mattress", "Replace with 2 of this
  pillow", "Remove the base".
- The mattress list starts focused (current, saved, each tier's leading match).
  "More matches (n)" adds the rest in tier and fit order.
- "Browse all matches" leaves a "Back to the priced sleep system" control on Results.
  It clears on return, or once the Summary is reached by any route.

**Feedback.**
- One visible confirmation after an applied change ("...: system payment changed
  from $103/mo to $105/mo under the same plan."), cleared by the next action.
- The payment panel is no longer a live region. Plan and down-payment changes are
  announced once, in one sentence, debounced while typing.
- The active down-payment preset is marked; a custom amount marks none.

**Fit and value.** The selected mattress shows its own catalog `highlight` (existing
product copy). **Personalised per-answer mattress reasons were NOT added.** They sit
behind item 1.3's rendered-output gate (owner-held, not lifted;
`tests/results_presentation_check.mjs` pins that `buildMattressPriorities` has no
rendered consumer). Each Sleep System row shows the cart's stored, answer-matched
reason key; the generic `default`/`standard` keys are omitted.

**Not changed:** scoring, tiers, IDs, tags, baselines, the calculation methods,
admission, the production gates, `gasUrl`, touch handling, and the public API
fields.

## Physical iPad check

2026-10-06: Blake ran the demo on a physical iPad (Safari, via the
`--device` harness) at `d2cf9e9` and reported that it all worked. That is
the owner's own report; no device-side details (orientation, connection
route, VoiceOver) were recorded. **That acceptance covers the pre-usability-
pass UI.**

2026-10-07: Blake ran a nine-step device checklist at `c070e23` (Safari, EN
and ES, landscape and portrait) and reported that every step passed. Steps
7-8 were retested on the device at `d395c8a` (the in-sheet language switch
below) and Blake reported that they passed. The web-review fixes below
(after `d395c8a`) have not been run on the device.

## In-sheet language switch (2026-10-07, Codex review of `c070e23`)

Codex reproduced one should-fix issue: an open change sheet makes every body
child inert, including the persistent language bar, so the customer could not
switch language while keeping the sheet open. The existing check called
`switchLanguage()` directly and missed it.

- **Fix:** the sheet carries its own English/Español switch, following the
  payment workspace's in-dialog pattern. It reuses `finWsSetLang`, the
  `session.lang_*` and `pay.ws.lang_group` keys, and `.fin-ws-lang` styling.
  It appears only when the retailer configures more than one language, and
  `updateLanguageControls()` marks it at once.
- **Unchanged:** background isolation (the bar stays inert under the sheet),
  Restart, touch handling (`psBtn`), scoring, payment arithmetic, admission,
  and the production gates.
- **Regression:** `payment_demo_check` now clicks the sheet's buttons (mouse,
  in Chromium) in both language orders. It checks that the pick, `aria-pressed`, focus and
  isolation are kept, that the bar cannot be clicked under the sheet, and
  that a single-language retailer gets no switch. Sweep entry 861 deletes the
  switch and is caught.

## Web-review fixes (2026-10-08, after `d395c8a`)

Web review of `d395c8a` (relayed by Blake) and a read-only browser check
found four customer-facing items. Blake approved implementing them
("Yes, run as written"). No scoring, payment arithmetic, admission,
production validator, session, `gasUrl` or activation change.

- **Price note** (`demo.json`), which read as if Lacks had confirmed each
  illustrative price: now "Demo price, illustrative. Lacks confirms final
  prices." / "Precio de demostración, ilustrativo. Lacks confirma los precios
  finales."
  **Superseded the same day (Blake, 2026-10-12, after the iPad pass of this
  note):** the per-price note and the demo notice box are both removed from
  the screens (purchase studio, Bring It Home panel, take-home preview), "all
  parties know it is a demo and not live". `demo.json` no longer carries
  `priceNote`; the harness serves no pricing disclosure. The ◇ illustrative
  mark and the price/payment provenance lines stay. The `notice` text stays in
  `demo.json` because demo admission requires it; it is not rendered.
  Review follow-up (Blake, 2026-10-12): the take-home preview's price line
  now carries the same ◇ on each illustrative price, and the price-source line
  that explains the mark follows its totals only when a ◇ appears. Still no
  notice and no per-price note. `payment_demo_check` covers the notice's
  absence on the Summary, Bring It Home and the take-home, swaps in a real
  illustrative accessory to prove the take-home mark (then swaps it back), and
  sweep entries 865-870 reinstate each removed notice or drop the mark or
  source line.
- **Bring It Home rounding.** With $500 down, a 0% example showed a total
  above the purchase price beside "Interest: none" with no explanation. The
  panel now carries `ps.sheet_rounding` beneath its plans: whole-dollar
  rounding, totals marked "up to" are upper bounds, the final total may be
  lower, and rounding is not interest. It makes no promise about a final
  payment; the demo does not calculate one.
- **Policy capture dates.** The Comfort Promise title and the pickup and
  delivery notes (harness data only) now name their recorded capture date
  (`observedAt`, Oct 3, 2026). Nothing records a publication date, and
  nothing is verified (`review-only-pending-retailer-approval`).
- **Matched reasons only.** The accessory change sheet no longer shows the
  generic "standard" line for an item no answer matched; matched reasons are
  kept.

Dismissed after evidence: the basis note's "of the purchase" wording (it
renders only where the amount used is the full purchase), and the suspected
studio / Bring It Home / comparison payment mismatch (identical figures at
$0 and $500 down; the comparison shows no Demo figures). Future risk: the
quantity limit table is duplicated three times in `index.html`.

## Review status

- **Web review** of `d395c8a` (relayed by Blake, 2026-10-08): no blockers;
  the confirmed items are fixed above. Earlier review sets:
  `docs/payment-demo-web-review-packet-2026-10-06.md`.
- **Codex review** of `c070e23` (relayed by Blake, 2026-10-07): one
  should-fix finding, fixed above.
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
