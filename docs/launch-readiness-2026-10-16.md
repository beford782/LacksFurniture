# Launch readiness: one application, by scope (2026-10-16)

Owner direction (Blake, 2026-10-15/16): one operable application; readiness is judged on a complete usable assortment and the integrated payment experience; a failure must disable only its own scope (whole app, one product, one offer, one plan, or email); a missing optional offer never disables a valid purchase.

Status: audited at `a7581ac` (PR #139). Recommendations 2-4 are implemented (committed at `d9cf802`); recommendation 1 is **not implemented** and waits for Blake's decision. This revision (2026-10-17) describes the behaviour after the 2026-10-17 reliability repair, committed on PR #139 after `d9cf802`: the send-identity fix and the session send-attempt registry (section 1a), the unified "Price unavailable" wording, the delivery-probe v2 quote and the regenerated demo bundle. Nothing here authorizes merge, deployment, activation or a send. Companion: `docs/assortment-coverage-2026-10-16.md` (product x size x SKU coverage), `docs/one-application-2026-10-15.md` (inputs table).

## 1. Blast radius: what each failure disables at `d9cf802` (code reading)

Functions are in `index.html` unless named otherwise. Line numbers are omitted because they move with every edit.

| Failure | Disabled at runtime | Code |
|---|---|---|
| No offers configured | Nothing. Prices, totals and payments run without discounts | `admittedOffers`, `buildConsultationQuote` |
| One invalid / expired / unapproved offer | That offer only. A duplicated id drops every copy of that id | `offerAdmitted`, `admittedOffers` |
| A product-size with no SKU or no price entry (pricing approved, surface on) | That product at that size shows "Price unavailable". In the purchase studio it is a "Price unavailable" line. Priced lines keep their figures and any minimum-free line offer. The subtotal, savings total, whole-quote offers and every payment are withheld. The take-home and the email carry the same incomplete summary (priced lines plus "Price unavailable" lines, no total or payment) | `pricePresentationFor`, `quoteApplyLineOffers`, `purchaseSummaryFor` (v2, `complete:false`) |
| A product-size with a stale or uncleared entry, or pricing not approved | That product at that size shows nothing (`off`). In a purchase it counts as an unpriced line, as above | `pricePresentationFor` (`!fresh \|\| !eligible` -> off) |
| The chosen mattress unpriced at the customer's size | The whole purchase studio (accessory prices in the studio included). Sleep System accessory prices still show on their own surface (see recommendation 5) | `psContext` |
| One plan stale, unverified, `paymentCalculationEnabled` false, no formula artifact | That plan only. An open-end promo plan drops out of the studio cards. Other plans still calculate | `psPlans`, `payEstimate`, resolver `finValid` and formula axis |
| Financing envelope stale (top-level `verifiedAt`) or `exactPromotionsEnabled` false | Every exact term and payment (scope: financing). Generic Payment Choice education stays | `financingTermsFresh`, resolver `finValid` |
| Plan with a minimum but no `qualifyingBasis` | No payment for that plan ("Minimum purchase basis to confirm"). Both Synchrony plans publish minimums, so this blocks every payment today | `psPay`, `quoteQualifyingAmount` |
| `gasUrl` blank, a send fails, or CAN-SPAM properties unset | Email only: preview mode; or one automatic retry, then "Try again"; or `delivery_unconfirmed` (no resend of that send); or `canspam_not_configured`. The consultation and figures are untouched. See section 1a | `emailDeliveryLive`, `sendResults`; `Code.gs` `doPost` |
| A presentation approval, authority, freshness or sourcePolicy approval missing | Every price, offer and payment (scope: pricing as a whole, by design). The consultation is untouched | resolver eligibility, `pricingPresentationApproved` |
| One malformed `pricing.products` entry at build time | The whole converter run: blocking error, no files written. Caught on the PR, so the deployed site is unaffected | `tools/convert_store_data.py` |

### 1a. Email delivery: what the code does and does not promise

**What it does.**
- **One sendId per content.** Each send carries a client `sendId`. The kiosk keeps the same id for the automatic retry, the visible "Try again" and a re-opened take-home screen. It also keeps it across a language switch, with or without a priced quote attached (see the send identity entry below).
- **New id when content changes.** A different address or different content (answers, shortlist, finalist, Sleep System or purchase) makes a new id, unless that exact content was already sent this session, in which case its original id returns. The new-customer wipe starts over.
- **The server's record.** Under the script lock, `Code.gs` checks a 6-hour cache and then a durable hidden ledger tab ("DreamFinder Sends"). It writes and flushes a `sending` marker **before** calling MailApp.
- **Same sendId repeated (duplicate suppression).** A sendId already recorded as sent gets `duplicate`: no second email and no second lead row.
- **Uncertain outcomes are not resent.** A sendId left in `sending` or `unconfirmed` gets `delivery_unconfirmed` and is never sent again. This covers a stopped execution, a MailApp exception and a lost response. The kiosk shows "may already have been sent, check your inbox" and keeps the id.
- **Failed lead row.** The ledger stays `row_pending` with the lead kept, for `recoverPendingLeads()`.
- **Pre-send failures.** A failure before the send (lock, ledger read, quota, marker write) answers `send_failed`: nothing was sent and the same id may retry.

**What it does not promise.**
- **Delivery.** MailApp accepting a message is not inbox delivery. Spam filtering and bounces are not observed.
- **A resend when the outcome is uncertain.** After `delivery_unconfirmed` the customer may have received nothing. The kiosk will not resend that content; staff check the inbox or the BCC copy (`docs/gas-activation-runbook.md`, Recovery).
- **No duplicates across sendIds.** Suppression is per `sendId` only. A second email can still go out under a new id:
  - when the address or the content changes after an unconfirmed attempt;
  - on another device or after the new-customer wipe;
  - when staff resend by hand.
- **Protection if the ledger is lost.** It depends on the ledger tab surviving. Deleting or editing that tab removes the record.
- **Real concurrency.** It relies on Apps Script `LockService` serializing executions. The tests use a simulated lock and sequential requests. Real concurrent executions are not exercised until the controlled live test.
- **Send identity vs preview fingerprint (defect found 2026-10-17, fixed in the 2026-10-17 reliability repair after `d9cf802`).**
  - **The defect.** At `d9cf802`, the client keyed `sendId` on the address plus the localized summary fingerprint. A language switch after an uncertain send therefore made a new `sendId`, and the customer could get a second email.
  - **The fix: two keys.**
    - `summary.fingerprint` (localized, unchanged) remains the preview-integrity guard: a send whose content differs from the preview is refused.
    - `purchaseIdentityKey()` hashes only substantive facts: line kind, product, sku, size, split, quantity, minor amounts and applied offer ids, and for a complete purchase the totals, plan and minor payment figures. It contains no labels, formatted text, timestamps or customer data, and is never sent.
    - `consultationIdentityKey()` adds the rest of the email's substance in language-neutral form: quiz answers, saved picks and favourite, finalist, Sleep System cart, consultation priorities and the credited salesperson. The content key is the recipient address plus this identity. Without it, while no priced purchase is shown (today's dark pricing), the key would be the address alone, and a changed shortlist after a confirmed send would be answered as a duplicate and never emailed (found in review 2026-10-17, fixed and tested).
  - **Rules: the session send-attempt registry (added 2026-10-17, reliability repair).**
    - **One record per content.** The client keeps one record per content key (recipient address plus content identity) sent this session: `{ sendId, state }`.
    - **Returning to earlier content.** Content sent earlier in the session always goes out again under its own original `sendId`, whatever was sent in between: address A -> B -> A, or purchase X -> Y -> X (complete or incomplete, in either language, after reopening the screen, on any retry). The server's ledger then answers `duplicate` or `delivery_unconfirmed`, never a second email.
    - **New content.** A new recipient or new content gets a fresh `sendId` that no other record uses.
    - **Not part of the identity.** An edited name or phone, the presentation language, and the letter case of the address (A@x and a@x are one recipient; the payload keeps the address as typed). The credited salesperson ("Helped by") is part of it.
    - **Not covered: time-varying promotions.** Promotion admission that changes with the clock (`promotionActiveAt`) can alter the email without changing the key. This is inert while the shipped Daybreak `scenarios` is empty; it must be revisited before a timed campaign is activated.
    - **States.**
      - `in-flight`: the request is out; taps are refused meanwhile.
      - `uncertain`: transport failure or `delivery_unconfirmed`.
      - `confirmed`: success or duplicate.
      - `failed`: the server refused before sending (`send_failed`, `invalid_email`, `invalid_request`, `canspam_not_configured`; nothing sent, and the server keeps the id retryable).
    - **States are reports only.** Every state reuses its id; the state never decides whether a new id is minted.
    - **Outcomes.** Each response writes only its own record. A response arriving after the wipe changes nothing: it is `sessionBound`, and its record belongs to the dropped registry.
    - **No eviction.** Records are never evicted, because evicting an uncertain record would make that content resendable. The wipe drops the whole registry (it holds addresses), the used-id set and the current attempt.
  - **Tests.** These are pinned in `tests/purchase_flow_check.py` sections 4b and 4c (asserting the POSTed `sendId`s and the record states; `--only send-identity` is the sweep's focused observer) and `tests/session_async_check.mjs`. Mutation entries 869 (re-anchored) and 886-893 cover them.
  - **Limits.**
    - **A re-send after a confirmed send.** Re-sending identical content to the same address in the same session is answered as a duplicate (no second copy). A customer who needs another copy is a new session or a staff forward from the BCC.
    - **Per session and per device.** Another iPad or a new customer session can send the same purchase to the same address again.
    - **The client cannot see delivery.** A confirmed send means MailApp accepted it, not that it reached the inbox.
    - **Real concurrency.** Concurrent Apps Script executions are still untested offline. The server tests are sequential requests under a simulated lock.

### Scopes broader than the failure (1 open; 2-4 implemented in `d9cf802`; 5 accepted as is)

1. **Age-based validation blocks every PR. Open: not implemented, waiting for Blake's decision (decision 4).**
   - **The problem.** Once pricing is enabled, each of these becomes a blocking build failure:
     - an entry older than `freshness.maxAgeDays` (`validate_pricing` -> `_pricing_freshness` in `tools/validation.py`);
     - an expired price window;
     - stale offer evidence;
     - an ended offer (a warning);
     - a stale financing stamp while `exactPromotionsEnabled` is true (a warning).

     CI runs the validator with `--warnings-as-errors` (`ci.yml`; `tests/lineage_check.py`). So one product, offer or plan aging out turns **every** PR red and stops the converter, which also blocks unrelated fixes. With financing `maxAgeDays: 7`, that happens weekly. At runtime, each of these items already fails closed on its own.
   - **Proposed change.** In `tools/validation.py`, report age-only conditions (stale, expired window, ended offer, stale financing) as a non-blocking "inert at runtime" class that `--warnings-as-errors` does not promote. Every structural, authority and evidence-shape error stays blocking. A separate scheduled freshness report is added.
   - **Tradeoffs.**
     - *For:* an unrelated fix, including an emergency takedown edit, is never held up by an expiry date. Weekly financing re-stamps stop being CI emergencies.
     - *Against:*
       - It revises the 2026-08-28 round-3 correction ("validation still refuses a stale entry in an enabled production configuration").
       - It moves the last guard against shipping stale figures from build time to runtime alone.
       - A stale item that falls back to "Price unavailable" or "To confirm" can go unnoticed for longer unless the freshness report is watched.
       - A runtime defect in a freshness check would no longer have the validator as a backstop.
     - *Middle option:* keep age blocking on PRs that change `incoming/` or `data/`, and non-blocking on code-only PRs.
   - **Evidence needed before relying on it.** Each item below must be pinned by a test, and by mutation-sweep entries that are caught.
     - **Runtime scope.** For every age condition (stale entry, expired window, stale offer evidence, ended offer, stale financing stamp, stale formula artifact), only that entry's scope changes:
       - a stale price entry turns that product at that size `off`, while other products stay priced and a purchase containing it becomes the incomplete form;
       - an aged offer is dropped, while prices and payments stay;
       - an aged plan drops that plan only;
       - a stale financing envelope withholds exact terms and payments, while prices stay.
     - **Rendered and email checks.** A rendered pass (`tests/purchase_flow_check.py` or the pricing harness) shows the same on the studio, take-home and email payload.
     - **Same clock.** The runtime and validator age arithmetic agree at the boundary day (UTC, inclusive or exclusive).
     - **Validator classification.** The validator classifies only age conditions as non-blocking. A negative control shows a structural, authority or evidence-shape error still fails `--warnings-as-errors`.
     - **Freshness report.** The scheduled freshness report fires on a stale fixture and is owned by a named person.

     None of this exists yet, because the change is not implemented.
2. **Unmatched product shows nothing, not "price unavailable".**
   - **Audit finding.** At `a7581ac`, `pricePresentationFor` returned `off` when there was no SKU or no entry.
   - **Implemented in `d9cf802`.** `pricePresentationFor` returns `price-unavailable` for no SKU or no entry only while `pricingPresentationApproved(p)` and the surface are on. Stale or uncleared entries and every dark state stay `off`. This is pinned in `tests/pricing_presentation_check.mjs`.
3. **One unpriced accessory withheld valid offers on priced lines.**
   - **Audit finding.** At `a7581ac`, offers ran only over a fully resolved quote.
   - **Implemented in `d9cf802`.**
     - `quoteApplyLineOffers` discounts resolved lines on an incomplete quote, with the complete path's stacking.
     - Any fitting offer with a minimum keeps that line at list.
     - A pay-in-full-only offer applies only to a pay-in-full quote.
     - There is no subtotal, savings total or payment.
4. **One unpriced line removed every priced figure from the email.**
   - **Audit finding.** At `a7581ac`, `purchaseSummaryFor` returned null unless the quote was complete.
   - **Implemented in `d9cf802`.**
     - Summary v2 (`complete: true|false`): the incomplete form lists priced lines and "Price unavailable" lines, with no total keys.
     - `emailQuoteGate`, `Code.gs` `_safeQuote` and both email builders (HTML and plain text) accept it and refuse any total in it.
     - The take-home renders the same summary.
5. **Accessory-only purchase cannot be quoted** (`psContext` requires a priced mattress). This is acceptable for the mattress-led consultation. Revisit only if Lacks wants accessory-only quotes.

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
| 2 Prices | Verified prices for the matched subset (50 mattress pairs and 37 accessory sizes at best, all re-verified). Purchase studio for fully priced purchases; a partly priced purchase shows its priced lines (with line offers) and "price unavailable" lines, with no total or payment, on screen and in the email | Prices for 106 unmatched mattress pairs; payments | A, C (MAP), recapture plus verification batch, catalog SKU map, sale-price ruling. (Optional: decision 4, age-based CI policy. Under the existing policy an aged entry fails every PR until it is re-stamped.) |
| 3 Payments | 9.99%/72 fixed-factor and 0%/48 equal-division | In-house, lease-to-own, Build My Credit, Mexico ("To confirm") | Blake's human re-verification and re-stamp (the 2026-10-17 automated capture matches the configured terms and contains the 0%/48 rounding sentence), `qualifyingBasis` from Synchrony, the 0%/48 rounding sentence in a tracked record, lender approval, `exactPromotionsEnabled` and `paymentCalculationEnabled` |
| 4 Email | Live take-home with the priced quote, sent once per sendId (section 1a; not guaranteed delivery) | none | E (the section 1a send-identity fix is in the 2026-10-17 reliability repair), plus a controlled real send (`tools/gas_delivery_probe.py`, EN and ES, to Blake's own inbox) |
| 5 Offers | Current Lacks promotions | none | Per-offer evidence and approval |

**Financing evidence (updated 2026-10-17).**
- **Capture.** An automated browser capture of lacks.com/financing and /faq (store Brownsville Galleria, no ZIP) shows 9.99% APR for **72 months**, fixed payments of **1.8521%** rounded up to the whole dollar, and a $500 minimum. That matches the repository.
- **60-month variant.** An undated search-index snippet read "9.99% APR for 60 months, fixed payments 2.1242%". Its chronology is not established: it does not match the 2026-10-17 capture, but nothing shows whether it came before or after it, or applied somewhere else. Only Blake's own verification settles which terms are current.
- **0%/48 rounding.** The capture also contains the 0%/48 equal-division rounding sentence.
- **Still open.**
  - It is an automated observation, not human verification, lender confirmation or approval.
  - The minimum-purchase basis is still unpublished.
  - The in-house term conflict (up to 24 vs 6-36 months) remains.
  - `verifiedAt` stays 2026-10-03 (past its 7-day limit).
- **Data unchanged.** Financing data is not re-stamped or activated.
- **Evidence.** It lives outside the repo; see `docs/one-application-2026-10-15.md`.

**Owner decisions (grouped):**
1. Sign record A, and name the Lacks business, legal and Spanish signers.
2. Obtain C: the MAP letter and the lender presentation approval.
3. Rule on sale-price classification and the store/ZIP price context.
4. Optionally decide whether age-based validation stops blocking CI (recommendation 1: tradeoffs, a middle option, and the evidence it needs). This is **not required for activation**. Keeping the existing policy is a valid choice; its cost is that an aged price, offer or plan fails every PR until it is re-stamped or removed. Recommendation 1 is not implemented and stays separate from PR #139. Recommendations 2-4 are built in `d9cf802`.
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
