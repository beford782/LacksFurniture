# Web review packet: payment demo (2026-10-06)

**Status: web review has NOT occurred.** CLAUDE.md's terminal-plus-web
pattern asks for web-Claude review of schema additions and white-label
boundary changes. The bounded agent reviews done in session do not replace
it. This packet is the handoff. Paste the raw command output, never a
summary.

## What to review

Branch `claude/payment-demo` (local, never pushed), four commits on
`a881ce6`. Run each command in that worktree and paste its raw output in
order:

```
git log --oneline a881ce6..HEAD
git diff --stat a881ce6..HEAD
git diff a881ce6..HEAD -- tools/validation.py
git diff a881ce6..HEAD -- tools/serve_pricing_preview.py
git diff a881ce6..HEAD -- index.html | sed -n '/Demo admission adapter/,/Purchase studio model/p'
git diff a881ce6..HEAD -- index.html | grep -n "^[+-].*\(demoAdmission\|demoPlanAdmitted\|demoPayEstimate\|demoPricePresentation\)"
git diff a881ce6..HEAD -- demo/payment-demo/demo.json docs/payment-demo-2026-10-05.md
python tests/payment_demo_check.py
```

`demo/black-friday/index.html` is a generated copy of `index.html`
(`tools/build_black_friday_demo.py`). `illustrative-prices.json` is
generated data; review its `_meta` and a few entries only.

## Decisions to check

1. **Admission boundary.** Demo admission needs:
   - the harness-written, frozen page context with a per-run nonce;
   - a validated `illustrativeDemo` config carrying the same nonce.

   Is that a sound separation of the normal served build from the harness
   demo? It is not, and does not claim to be, protection against
   client-side tampering.
2. **No fallback.**
   - `pricePresentationFor` branches on `demoAdmission()` alone.
   - `financingPlanFresh` routes `demo: true` plans to the adapter only.
   - `payEstimate` hands demo plans to `demoPayEstimate`.

   Can any production plan or entry reach the demo path, or any demo entry
   reach the production path?
3. **Honest records.**
   - Shipped approval, freshness and source-policy records are kept.
   - Historical `observedAt` values are unchanged.
   - Illustrative entries carry `method`.
   - Example plans are `verified: false`, carry `verificationStatus:
     "illustrative"`, and keep `paymentCalculationEnabled: false`.
   - `assembledAt` is a separate field.

   Is anything still implying approval or current verification?
4. **Production refusal.** `validate_pricing`, `validate_financing` and
   `validate_store_config` refuse the demo data by name. Is the refusal
   complete enough that a demo artifact can never pass the shipped
   pipeline?
5. **New schema surface (white-label).**
   - `illustrativeDemo`, `evidence.status` `historical-snapshot` /
     `illustrative`, plan `demo` / `demoCalculation` / `verificationStatus`.
   - The `split` flag on a cart entry.
   - New dictionary keys: `ps.*` and `pay.fx.basis_*`.

   None is retailer-specific. Confirm.
6. **Departure from slice 2.** Payment figures appear on the Summary,
   results, drawer and compare, under demo admission only. Acceptable for
   the demo?
7. **Scoring isolation.** Pricing never reaches scoring; the test compares
   recommendations with demo prices on and off. Confirm.

8. **Usability pass** (`cf72980`, `e130697`).
   - **Change mattress dialog:** it previews in a sandbox that swaps the
     cart, finalist and saved list and restores them in `finally`, and
     applies through `chooseFinalist`. Can a preview ever leak into state?
   - **Hidden sections:** the Summary's finalist hero and Sleep System list
     are hidden only while the studio shows. Any lost navigation?
   - **Comparison:** pay in full is the starting choice and no plan is
     preselected. Selection is marked by text plus `aria-pressed`.

   Review with
   `git diff d2cf9e9..HEAD -- index.html | sed -n '/function psContext/,/function purchaseStudioFor/p'`
   and the `psOpenSheet` / `psSheetApply` block.

## Evidence already observed (local)

- `tests/payment_demo_check.py`: 214/214 at `cf72980`.
- Full local mirror (`-SkipMutationSweep`): PASSED (66 checks plus integrity guards) at `e130697`.
- Targeted mutation entries: see the session handoff.
- Not observed: physical iPad, Safari on device, VoiceOver,
  native-Spanish review, legal or lender review, PR CI.
