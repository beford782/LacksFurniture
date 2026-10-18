# Lacks.com feature expansion: plan, acceptance criteria and evidence (2026-10-17)

Status: LOCAL implementation on branch `claude/lacks-site-features` (worktree
`Documents/GitWorktrees/LacksFurniture/lacks-site-features`), based on PR #139's
head `b992a70`. Nothing is committed, pushed, merged, deployed, activated or sent.
Blake authorized local research and implementation only (2026-10-17, confirming
a pasted brief with "Run as written").

## Outcome: what is built versus what a customer can see today

| Piece | Implemented capability | Visible with SHIPPED data (today) |
|---|---|---|
| Comfort Promise card (Summary) | yes, with governed fixture tests | **no**: every policy section is a draft |
| Getting your new bed home (Summary): cards, preference toggle, Mexico disclosure, after-purchase links | yes | **no**: drafts |
| Take-home in-store policy rows | yes | **no**: drafts |
| Pickup "no delivery charge" payment fact | gated by its own approval record (`fulfillment.pickupChargeFact`) | **no**: the fact is a draft, and pricing is dark |
| Exact-product drawer gallery (`productVisuals`) | contract, validator (listing SKU, title and size), renderer and tests | **no**: ships EMPTY; no photo imported, no permission recorded |
| Drawer and compare image hardening (escaped attributes, broken photo removes itself) | yes | **yes**: applies to the existing product photos |
| Foundation-or-adjustable-base explainer (Sleep System base step) | yes | **yes**: a closed disclosure, EN/ES |

The visible change today is therefore modest: the base explainer and the
image fallbacks. Richer product imagery and finalist explanations remain
LIMITED. The gallery is prepared but empty, the comparison is unchanged apart
from the image fallback, and no model gained a new photo or explanation. The
policy content is complete and tested, but it is dark until Lacks approves each
section.

## Decisions taken (ordinary, reversible implementation choices)

1. **One governed policy contract: `customerPolicies`.** It replaces the
   review-only `salesPolicies` block. The validator still refuses
   `salesPolicies`.
   - The canonical source is `incoming/lacks_consultation_guide.json`. It goes
     through the workbook Guide tab (envelope `{"customerPolicies": ...,
     "productVisuals": ...}`) to `store-config.customerPolicies` and
     `store-config.productVisuals`, the same channel as Pricing and Quiz
     (converter `build_consultation_guide`). Pricing stays the last data tab.
   - Build ceiling: `tools/source_hosts.json` `policySourceHosts`
     (lacks.com, www.lacks.com). Price and financing hosts are not reused.
   - The validator is `validate_customer_policies`, called from
     `validate_store_config`. A fixture, placeholder, review-build or
     illustrative signature is refused there, as for pricing. The runtime
     gate (`customerPolicy()` in index.html) re-checks status, Spanish review,
     the presence of the approval record, freshness and host.
   - There are four independent sections: `comfortPromise`, `fulfillment`,
     `afterPurchase` and `mexicoDelivery`.
   - Each section carries its own evidence record: `status` (draft or approved),
     `sourceUrl` on an allowlisted policy host, `verifiedAt`, `maxAgeDays`,
     `spanishReview` and `approval`.
   - A section renders only when all of these hold:
     - it is approved;
     - it carries a real approval record;
     - its Spanish review is approved;
     - it is fresh;
     - its source is allowlisted.
   - Shipped data carries every section as `draft` with `approval: null`.
     `tests/smoke_check.py` and the CI operating-state lock pin this.
   - The review harness (`tools/serve_pricing_preview.py`) approves the shipped
     copy in memory, with FIXTURE signatures and today's stamp, for the
     `payments`, `review` and `purchase` states only. The validator refuses
     that copy, so it can never ship.
2. **Policy content no longer depends on pricing on the Consultation Summary.**
   The Bring It Home workspace keeps its existing extra price gate.
   - **Informational approval never carries a financial consequence**
     (cleanup pass): the payment-table fact "published free pickup means no
     delivery charge" has its own record, `fulfillment.pickupChargeFact
     {status, approval}`. It ships `draft` with approval null, pinned by the CI
     lock and the smoke check.
   - The validator admits it only inside an approved fulfillment section that
     publishes `pickupNoCharge: true`, with its own genuine approval.
   - Both payment sites read one gate, `pickupNoChargeFact()`. The purchase
     quote (`buildConsultationQuote`) never had a delivery charge and still
     has none: no parallel calculation was added.
   - The harness approves the fact (FIXTURE) only in the `payments`/`review`
     drill states.
3. **Fulfillment preference stays one ephemeral state (`_payFulfil`).** It is
   shared by the Summary panel and the workspace.
   - It is labelled as a preference for this conversation only. Nothing is
     booked.
   - It is not emailed and never enters the purchase model or the send
     identity.
   - It is already wiped by `resetSessionState()`.
4. **The take-home preview shows the policy rows as in-store rows**
   (`present: false`, "— in store"). They are not part of any email.
   - Carrying them in email would need Code.gs builders, the closed payload key
     set, the send identity and the stale guard. The brief allows email only
     when the existing contract carries it safely, and it does not.
5. **Product imagery: capability, not new photos.**
   - Agent B found no material, quilting, edge or construction photos for any
     model. At best there is a second angle of the same bed, and the three
     Chattam & Wells angles are near-identical.
   - No image-use permission is documented (owner ruling D2 requires
     Lacks-owned or Lacks-supplied sources, verified before entering
     `incoming/`).
   - So no new photo ships. The drawer and compare images are hardened
     instead: escaped attributes and a graceful fallback on load failure. The
     hero keeps its CSS-sized well; only gallery images carry explicit
     width/height.
   - An optional `productVisuals` gallery capability is added, ships empty, and
     is verified with governed test data. Since the cleanup pass it needs
     listing identity, not only id and name:
     - `source {sku, listingTitle, size}` is matched by the build validator
       against retailer listing evidence (`--listing-evidence`, for Lacks
       `incoming/lacks_catalog_selection.json`, Queen listings only). It
       rejects a DECLARED listing that disagrees with the evidence (another
       generation's title, another SKU, an unmapped size). It cannot prove the
       image file itself came from that listing: no image URL or hash is
       recorded, and `sourceUrl` need only be a first-party page. That
       provenance stays a matter for the permission review.
     - `sizeScope` is `pictured-size` for details and exact illustrations, and
       `all-sizes` only for whole-bed views.
     - The drawer prints "Pictured: <size> listing, SKU <sku>." and, for a
       pictured-size image, "Other sizes may differ.".

6. **Education: one decision-point explainer.** A short, original
   foundation-versus-adjustable-base disclosure on the Sleep System base step,
   built as native SVG with dictionary text.
   - Foam/hybrid/coil was not built: production data has no construction-type
     field, so it would not connect to any decision. The drawer's owner-ruled
     generic construction demonstration already covers the generic story.
   - The size comparison was not built: size is chosen only inside the dark
     pricing studio.

## Acceptance criteria

All items were checked against the working tree identified below (`[evidence: tree 22c8b62a]`). A box
is ticked only where the named evidence exists.

- [x] Shipped `customerPolicies`: every section is `draft` with approval null,
      and `fulfillment.pickupChargeFact` is a draft. Evidence: smoke check, the
      CI lock lines, and customer_policies_check section 1.
- [x] Shipped data renders no policy content (sections hidden and empty; no
      take-home rows; no workspace card). Evidence: customer_policies_check
      section 2; browser screenshots `*-shipped-summary.png`.
- [x] The validator refuses each of these:
      - an approved section without a genuine approval;
      - an approved section with Spanish review pending;
      - stale evidence;
      - an off-host or http source or link;
      - one-language text;
      - unknown or missing keys;
      - a bad timeline;
      - `salesPolicies`;
      - a payment fact approved without its own approval or outside approved
        guidance.
      Evidence: `tools/validation.py --self-test`, 1570/0.
- [x] Runtime gate: each failing condition withholds the section (13 cases).
      Evidence: customer_policies_check section 4.
- [x] Comfort card:
      - the timeline comes from config numbers;
      - the checklist follows the cart and never adds an item or says eligible;
      - "Main published conditions" includes the authorization and exclusion
        rule;
      - the specialist statement and policy link are present.
      Evidence: customer_policies_check sections 3 and 5.
- [x] Getting home:
      - published points and specialist confirmations;
      - the preference toggle (`aria-pressed`, keyboard Enter/Tab/Space,
        visible focus ring, touch-path focus return, wiped and unpressed for the
        next customer);
      - no charge, date or booking wording;
      - Mexico shown separately from credit;
      - off-host links not rendered.
      Evidence: customer_policies_check sections 3, 4 and 6.
- [x] Approving the fulfillment GUIDANCE alone does not produce a zero
      delivery charge. A payment fact marked approved without its record is
      not honoured. The purchase quote is unchanged. Evidence:
      payment_facts_check (163/0) and sweep entries 928-929.
- [x] Take-home: in-store rows only (`present:false`), and the recorded
      loopback email payload carries no policy copy or preference. Evidence:
      customer_policies_check sections 6 and 8.
- [x] Scoring, tiers, baselines, purchase model, payload keys and send
      identity are unchanged. Evidence: phase 1 output regression, scoring
      isolation, purchase flow 412/0, delivery harness 292/0, and
      customer_policies_check section 8 (quote and identity unchanged by the
      preference).
- [x] Images:
      - the drawer hero and the compare header remove a failing photo (no
        broken-image icon);
      - attributes are escaped;
      - the gallery renders only approved entries with exact id and name and
        a well-formed listing identity and size scope (the runtime checks the
        shape; the match against listing evidence happens at build);
      - generic illustrations are labelled generic and the display scope is
        printed;
      - nothing renders when the gallery is empty.
      Evidence: product_visuals_check 42/0 and validator self-test.
- [x] Base explainer: EN/ES, `aria-hidden` art, closed by default, no motion,
      no health or compatibility claim. Evidence: product_visuals_check
      section 6 plus the reduced-motion case.
- [x] Reduced motion: the changed Summary UI and the explainer render complete,
      and no element animates or transitions. Evidence: customer_policies_check
      (reduced-motion context); product_visuals_check (emulated).
- [x] EN/ES dictionary parity. Evidence: session_safety parity check;
      customer_policies_check section 7.
- [x] Lineage. Evidence: lineage check, strict golden bundle, workbook
      validation; demo bundle `--check`.
- [x] Browser over HTTP (Playwright Chromium, loopback): EN 1180x820 and ES
      820x1180, forced colors, shipped vs approved-fixture, console clean,
      reset wipes. Screenshots: `outputs/manual-gates/lacks-site-features-2026-10-17/`
      (git-ignored). They were captured before the cleanup pass. The cleanup
      changed no visible Summary layout; the drawer gallery scope line is
      exercised only in tests.
- [ ] **Real iPad / Safari:** NOT performed.
- [ ] **VoiceOver:** NOT performed.
- [ ] **Native-Spanish review:** NOT performed.
- [ ] **Lacks business/legal approval of any section:** none exists; every
      section stays a draft.
- [ ] **Full mutation sweep:** NOT run locally (policy). The required CI check
      runs it.

## Source and asset inventory (checked 2026-10-17, store context "Brownsville Galleria", no ZIP)

| Item | Source | Observed | Status |
|---|---|---|---|
| 90-Day Comfort Promise terms | https://www.lacks.com/return-and-store-policies | Every new mattress purchase; at least 30 nights; within 90 days of delivery; one exchange for equal or greater value, customer pays the difference; purchase must include a mattress protector ("bed guard") and at least one pillow; mattress used with that protector; good condition, free of stains, odors or damage; local delivery fee (amount unpublished); no refunds; pillows and protectors cannot be refunded or exchanged | Wording READY (draft); approval and Spanish name NEED LACKS |
| Final-sale line "Mattresses, which are not covered under our 90-Day Comfort Promise…" | Same page and /faq | Ambiguous; contradicts the dedicated section if read literally | NOT imported; Lacks to clarify |
| Delivery: inside, assembled, set up in a prepared room; clear path; no decorator services (bed making) | https://www.lacks.com/services | Charge, dates and address coverage unpublished; old-mattress removal never mentioned | Wording READY (draft) |
| Free central-warehouse pickup; sales contract plus matching photo ID; third-party waiver for another person | /services, /faq | Street name differs ("Drive" on /services, "Street" in /faq); hours and phone volatile | Linked, address NOT embedded |
| Store pickup ("Pickup at Store") | /faq only (online checkout) | Not on /services | NOT imported |
| Mexico door delivery through an import agent: import, assembly, placement, removal of leftover material; additional charge | /faq (native Spanish), https://www.lacks.com/promotions/mexico-ads | Coverage, cost and timing unpublished | Wording READY (draft); scope NEEDS LACKS |
| After-purchase: /services#service-form, /contacts | /faq, site navigation | Mattress warranty-claim route unpublished | Links READY (draft) |
| /extended-protection-plans | That page | Furniture, appliances and electronics only; "mattress" absent | EXCLUDED |
| Blog hybrid vs memory foam (2023-11-24) | /blog/hybrid-vs-memory-foam | Health and sleeper-position claims unsupported | EXCLUDED (no claims imported) |
| Secondary photos g1, g2, g3, s5/s6/s7, s9 | linqcdn.avbportal.com (same listings as shipped primaries) | Second three-quarter angle only; no detail or construction; g1 slug and s9 generation conflicts; s5–s7 byte-identical | NOT shipped: no documented image permission (D2) |
| Lacks logo b0030.png | assets.avbportal.com | 256×98 black raster wordmark | NOT imported; ask Lacks for an SVG or hi-res kit |
| Category art category-1.png | cdn.avbportal.com | Generic older Tempur image, not in the lineup | EXCLUDED |
| Manufacturer images and icons (Spring Air Roma) | springair.com / Shopify CDN | Third party; icon implies a cooling claim | EXCLUDED |

## Decisions Lacks or Blake must make before any section is approved

1. **Comfort Promise scope:**
   - the meaning of the final-sale mattress line;
   - whether clearance, special-order, floor-model and Mexico-delivered
     mattresses qualify;
   - when the 90 days start for a pickup order;
   - whether the protector and pillow must be on the same ticket;
   - the official Spanish program name.
2. **Delivery and pickup:**
   - charges and coverage;
   - whether old-mattress removal is offered;
   - whether setup includes a foundation or adjustable base;
   - the warehouse street name;
   - whether in-store buyers can pick up at a local store.
3. **Mexico delivery:** coverage, cost, timing and current service scope.
4. **After purchase:** the mattress warranty-claim route.
5. **Spanish:** native-Spanish review of every section (`spanishReview`).
6. **Approval record:** a named approver, date and reference per section. This
   is the activation change, and the CI lock must be lifted deliberately.
7. **Image permission:** written Lacks permission (and scope) for listing photos
   before any gallery entry ships.

## Consolidation with a concurrent Codex edit (2026-10-17, ~16:53-16:55)

A Codex session edited this same worktree while this work was in progress. It
was building a competing `consultationGuide` contract as a Store Info JSON
column. Blake confirmed Codex was stopped and asked for one merged contract.

That work was not adopted, for four reasons:
- its delivery and pickup route cards rendered with no approval gate, so
  unapproved policy text would have shown in shipped data;
- its foam/hybrid education was injected into every drawer and comparison
  without a gate, beside the owner-ruled generic construction demonstration;
- its validator used the price host list as the policy ceiling;
- it added a compare row.

The idea kept from it is exact SKU and size matching for photos, reflected in
`productVisuals`' exact id and name rule.

Its complete diff and working scripts are preserved, uncommitted, at
`%TEMP%\claude\...\scratchpad\codex-preserved\worktree-state-before-consolidation.patch`
(session scratchpad), and the tree was restored to HEAD before re-applying
this work.

## Implementation map

- **Contract:**
  - `incoming/lacks_consultation_guide.json`;
  - `tools/workbook_schema.py` (Guide tab);
  - `incoming/build_lacks_workbook.py` (`guide_rows`);
  - `tools/convert_store_data.py` (`build_consultation_guide`, the
    product-visual normalization, `validate_product_visuals` wiring);
  - `tools/validation.py` (`validate_customer_policies`,
    `validate_product_visuals`, self-tests);
  - `tools/source_hosts.json` (`policySourceHosts`);
  - `tests/fixtures/build_bel_workbook.py` (Guide tab round trip).
- **Runtime (index.html):**
  - `customerPolicy()`, plus `paySalesPolicy()` re-pointed with its price gate
    kept;
  - `comfortPromiseRequirements()`, shared by the workspace card and the
    Summary;
  - `renderHf2CustomerPolicies()` drives `#hf2ComfortSection` (after the Sleep
    System) and `#hf2HomeSection` (before Payment Choice);
  - `customerPolicyTakeHomeRows()` (in-store rows);
  - `setPaymentFulfil()` repaints both surfaces;
  - `productVisualsFor()` / `renderDrawerVisuals()` / `dfVisualFailed()`
    (`#drawerVisuals`);
  - escaped drawer and compare `img` attributes with `onerror` removal;
  - `renderBaseExplainer()` on the Sleep System base step;
  - session wipe inventory and hidden-reset entries;
  - CSS (`.cpol-*`, `.drawer-visual*`, `.edu-base*`), with forced-colors rules
    after the first forced-colors block.
- **Dictionaries:** 31 new keys in each language (`cpol.*`, `edu.base.*`,
  `gal.*`, `pay.ff.pickup_unconfirmed`); `pay.cp.conditions` relabelled;
  EN/ES parity kept.
- **Tests:**
  - `tests/customer_policies_check.py` and `tests/product_visuals_check.py`
    (new; in ci.yml and `tools/run_full_suite.ps1`);
  - `tests/payment_facts_check.py` (section 15 moved onto the governed
    contract);
  - `tests/smoke_check.py` (draft lock);
  - CI operating-state lock line;
  - mutation sweep entries 899-939 (new) and 813 and 824 (re-anchored).
- **Harness:** `review_customer_policies()` replaces `review_sales_policies()`.

## Not built, deliberately

- **Foam/hybrid/innerspring explainer:** production data carries no
  construction type, so it would not attach to any decision. The drawer
  already has the owner-ruled generic construction demonstration.
- **Size comparison:** size is chosen only inside the dark pricing studio, so
  there is no active size decision in shipped flow.
- **Policy content in the email:** this would need Code.gs builders, the
  closed payload key set, the send identity and the stale guard.
- **A compare-row or compare gallery:** the drawer carries exact-product
  visuals. The comparison keeps its fit-first table.
- **The Lacks raster logo:** it is 256 px and black-only; an SVG or high-res
  kit should be requested.

## Independent review (read-only agent, 2026-10-17) and resolution

No blocker or high finding. The reviewer confirmed:
- every policy section is a draft, `productVisuals` is empty, and nothing new
  renders under shipped data;
- the email, Code.gs, `sendResults` and `consultationIdentityKey` are
  untouched;
- gasUrl, pricing, promotions and financing are unchanged;
- no retailer content was added to `index.html` logic;
- the workbook rebuild matches the committed one cell for cell;
- EN/ES key sets are identical.

| Finding | Resolution |
|---|---|
| M1 "All published conditions" omitted the authorization/inspection rule and the clearance/as-is/final-sale/special-order exclusions | Label is now "Main published conditions" (both cards); a draft condition states those rules and that the specialist confirms how they apply |
| M2 focus after the preference toggle relied on `document.activeElement` (touch and Safari never focus the button) | `setPaymentFulfil(id, source)`; both surfaces pass their source and focus returns explicitly; a touch-path test and sweep entry 927 |
| M3 doc and evidence were git-ignored | `.gitignore` negations added; captures copied to `docs/lacks-site-evidence-2026-10-17/` |
| L1 "two ways" (the FAQ also publishes store pickup through online checkout) | "these ways" |
| L2 delivery setup could read as including base setup | added "Whether setup of your bed base is included" to what the specialist confirms |
| L3 "leftover packaging material" added a word; Spanish register, "bodega" and the program name | "Removal of leftover material"; the Spanish points are recorded for native review in `_meta.spanish` |
| L4 `productVisuals` not in the CI lock | the lock and the smoke check pin `productVisuals == []` |
| L5 validator self-test read this retailer's file | it falls back to an inline generic fixture when the file is absent |
| L6 off-host link untested; weak drawer check | a runtime test and sweep entry 926 for an off-allowlist link; the drawer check now asserts the model name |
| L7 state glyphs could be spoken | `content: "..." / ""` (empty alternative text) |
| L8 declared dimensions are not checked against the file; stale gallery files are not cleaned | open, low: no gallery entry ships; revisit when the first approved photo is added |
| L9 approving `fulfillment` also enables "pickup means no delivery charge" in the payment facts beside governed prices | RESOLVED in the cleanup pass: a separate `pickupChargeFact` approval is required; approving it remains an owner decision (8) |

Still unresolved, and left as the reviewer noted:
- `cpol.tl_start` ("Delivery") is a shared dictionary label. A retailer whose
  window starts at purchase would need a config field.
- `mexicoDelivery` is a named section in the generic validator.
- (The compare-header `onerror` test was added in the cleanup pass, as sweep entry 937.)

## Additional owner decision

8. Whether to approve `fulfillment.pickupChargeFact` separately: the
   payment-facts rule "published free pickup means no delivery charge".
   Since the cleanup pass, approving the guidance never turns it on. It needs
   its own approval record, and it shows only beside governed prices, which
   are dark.

## Verification performed (first pass - SUPERSEDED by the cleanup record below)

- **Local CI mirror:** every check in `tools/run_full_suite.ps1` except the
  mutation sweep: 70/70 PASS.
  - Run one check at a time in the foreground (scratchpad `run_range.py`).
  - The background run of the runner was stopped by the system for low memory
    after 26 checks.
  - Check 53 was re-run alone after its test fix: customer policies 67/0.
  - Product visuals: 33/0.
- **Mutation sweep, targeted:**
  - entries 899-927 (new): 29/29 caught;
  - 813, 814 and 824 (touched): 3/3 caught;
  - all 927 entries apply.
  - The full sweep was NOT run locally (policy: CI only).
- **Static checks:** `git diff --check` clean; demo bundle `--check` OK;
  lineage OK.
- **Browser (Playwright Chromium, loopback, FIXTURE approvals in memory):**
  - EN 1180x820 and ES 820x1180;
  - shipped state hides both sections;
  - approved state renders with pricing dark;
  - forced colors;
  - base explainer;
  - take-home rows "in store";
  - reset wipes;
  - no horizontal overflow;
  - no console errors.
  - Screenshots are in `outputs/manual-gates/lacks-site-features-2026-10-17/`
    (git-ignored).
- **Not performed:**
  - real iPad / Safari;
  - VoiceOver;
  - native-Spanish review;
  - reduced-motion pass (the new UI has no motion);
  - live lacks.com re-check after 2026-10-17;
  - real email;
  - the full mutation sweep.

## Cleanup pass (2026-10-17, Blake's request): changes and durable verification record

**Changes:**
1. **Pickup payment fact decoupled from the guidance approval.** Added
   `fulfillment.pickupChargeFact` and its gate `pickupNoChargeFact()`, with
   validator rules, CI lock and smoke lines, harness approval only in the
   payment drill states, a payment_facts regression, and sweep entries
   928-930.
2. **Gallery listing identity:**
   - added `source {sku, listingTitle, size}` and `sizeScope`;
   - `listing_size_from_title` / `listing_evidence_from`;
   - converter `--listing-evidence`;
   - runtime shape gate and the "Pictured: ..." display line;
   - validator self-tests, browser cases, and sweep entries 931-935.
   `productVisuals` stays `[]`, no asset was imported, and no permission
   record was made.
3. **Verification gaps closed:**
   - comparison-header broken-photo fallback (test and sweep entry 937);
   - reduced motion (Summary sections and the explainer);
   - keyboard Enter/Tab/Space with a visible focus ring (new
     `.cpol button:focus-visible`; sweep entry 936);
   - focus after the wipe and the next customer starting unpressed.
4. **This record:** the outcome table, the evidence-backed checkboxes, and
   this verification record.

**Working-tree identity:**
- Base commit `b992a70`.
- Uncommitted tree, excluding this doc: `git write-tree` =
  `22c8b62a092dc1d86b8abfad9f698b30076624ad`. This was computed with a
  temporary index (`git read-tree HEAD; git add -A; git rm --cached` this
  doc), so the real index was untouched. It covers 31 paths.
- **Final tree** (after the checks, excluding this doc):
  `966db15846844d7c7f22272e3ab383d730f5781a`. It differs from `22c8b62a` only
  in `incoming/lacks_consultation_guide.json` `_meta` documentation text,
  which is not shipped and not in the workbook. The lineage check re-run on
  the final tree passed 10/0.
- To re-derive it, repeat those steps with `GIT_INDEX_FILE` pointing at a
  scratch file.

**Checks run on that tree (Windows, Python 3.14.7, Node 24.13.0, Chromium 151):**
- **Local CI mirror:** every check in `tools/run_full_suite.ps1` except the
  mutation sweep: 70/70 PASS, run one at a time in the foreground. Results
  included:
  - validation self-test 1570/0;
  - smoke;
  - lineage and golden;
  - payment workspace 446/0;
  - payment facts 162/0;
  - purchase flow 412/0;
  - customer policies 76/0;
  - product visuals 42/0;
  - pricing harness;
  - delivery harness 292/0;
  - mutation manifest 116/0.
- After the mirror, `tests/payment_facts_check.py` gained one assertion (a fact
  approved without its record) and was re-run alone: 163/0. The tree hash
  above includes that test change.
- **Mutation sweep, targeted:**
  - 899-937: 39/39 caught. 929 initially survived; the test was added and it
    was re-run caught.
  - 813-814: caught.
  - All 937 entries apply.
  - The full sweep was not run.
- **Static checks:** demo bundle `--check` OK; `git diff --check` clean.

**Not performed:**
- real iPad / Safari;
- VoiceOver;
- native-Spanish review;
- live lacks.com re-check after 2026-10-17;
- real email;
- the full mutation sweep;
- a fresh screenshot set after the cleanup pass.

## Second independent review (cleanup pass) and final verification record

No blocker or high finding. Activation state, the purchase model, the email
payload and EN/ES parity were confirmed unchanged or intact.

| Finding | Resolution |
|---|---|
| M1 the listing check proves the declared listing agrees with the evidence, not the image's origin | doc reworded (decision 5); provenance stays with the permission review |
| M2 approved guidance alone put "Published as free" pickup copy beside a "To confirm" charge | the workspace pickup note is neutral ("confirmed in store") unless the payment fact is approved; stale comment fixed; test plus sweep entry 939 |
| L1 the scenario payment site had no test of its own | a payment_facts assertion (`paymentScenarioFor` pickup false under a draft fact) plus sweep entry 938 |
| L2 `listing_size_from_title` misread "Twin Extra Long", "Full XL" and "Split King" | twin-extra-long and txl map to Twin XL; unmodelled modifiers return None; self-test cases added |
| L3 runtime accepted any non-empty size | runtime whitelist of the six size ids |
| L4 the payment fact could reuse the guidance approval | the validator refuses an identical reference; self-test added |
| L5 the reduced-motion and reset-focus assertions read stronger than they are | labels and comments now say what they prove: the changed UI has no motion in any mode; on reset the controls are removed and focus falls back to the page |
| L6 stale doc lines | corrected above |
| L7 the runner comment count was already wrong at HEAD | "70 checks plus the mutation sweep = 71" |
| L8 `mexicoDelivery` / `.cpol-mexico` are retailer-shaped names in generic code | open (low), listed earlier |

**Final working-tree identity:**
- Base `b992a70`, uncommitted.
- `git write-tree` over a temporary index, excluding this doc: **`2f0e673cab2a2c64d2999c091e762418a2e700f5`** (31 paths). The real index was never touched.
- This supersedes `22c8b62a` and `966db158` above, which were intermediate.

**Checks run on `2f0e673c`:**
- **Local CI mirror:** every check in `tools/run_full_suite.ps1` except the
  mutation sweep: **70/70 PASS**, run one at a time in the foreground.
  Results included:
  - validation self-test 1571/0;
  - payment workspace 446/0;
  - payment facts 165/0;
  - purchase flow 412/0;
  - customer policies 76/0;
  - product visuals 42/0;
  - delivery harness 292/0;
  - mutation manifest 116/0;
  - lineage, golden, smoke and pricing harness.
- **Mutation sweep, targeted, on this code:**
  - 928-939: 12/12 caught;
  - 899-927: 29/29 caught on the immediately preceding tree. The final edits
    changed none of those anchors or their observers' assertions beyond
    labels.
  - 813-814: caught (preceding tree).
  - All 939 entries apply.
  - The FULL sweep was not run (policy: the required CI check runs it).
- **Static checks:** demo bundle `--check` OK; `git diff --check` clean.

**Not performed:**
- real iPad / Safari;
- VoiceOver;
- native-Spanish review;
- live lacks.com re-check after 2026-10-17;
- real email;
- the full mutation sweep;
- a fresh screenshot set after the cleanup passes. The earlier screenshots
  predate them; Summary layout is unchanged apart from the neutral workspace
  pickup note, which sits in the dark pricing workspace.

## Update after PR #139's CI fix (2026-10-18)

#139's required CI failed in the mutation sweep:
- entry 881 survived as an equivalent mutant;
- entry 871 timed out.

#139 received a test-only fix, `4027199`:
- entry 881 retired;
- the purchase-flow stale-figures click fails fast;
- the per-observer limit raised to 300s.

This branch merged it in `4bfac10`, a clean merge that touched only
`tests/mutation_sweep.mjs` and `tests/purchase_flow_check.py`.

**Sweep numbering:** every entry number above 881 cited in this document uses
the earlier numbering. Since the merge, each is ONE LOWER:
- this branch's entries 899-939 are now 898-938;
- for example, the pickup payment-fact entries 928-930 are now 927-929;
- entries 813, 814 and 824 are unchanged.

All 938 entries apply after the merge (anchor check). The application code
and the shipped data are unchanged by the merge, so the verification record
above still stands for them. This branch's PR CI runs the full sweep on the
merged head.
