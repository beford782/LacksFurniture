# PR #24 motion spike — showroom-device check record

**Date:** 2026-08-08 · **Reviewed code head:** `e33bb2a` (branch
`claude/motion-spike-card-gather`, base `c8e5a95`)
**Scope:** the Card Table selected-card feedback and review→profile gather behind
`MOTION_POLICY.enabled = false` — nothing else.

This is a narrowly scoped device-check record for PR #24 only. It is created because
no canonical motion-device ledger exists: `docs/kiosk-device-hardening.md` is the
autofill/persistence hardening record and its per-route verification table covers
session-ending routes, not motion. Any documentation-only commit that carries this
file contains **code byte-identical to `e33bb2a`**.

## Authoritative review results at `e33bb2a`

| Item | Result |
|---|---|
| Owner visual ruling | The enabled Card Table/gather is **preferred over the legacy staged reveal** |
| Final Codex review | **PASS** on exact code head `e33bb2a`; no remaining blocking or should-fix findings |
| Motion suite (`tests/motion_flag_check.mjs`) | **70/70** |
| `tools/validation.py --self-test` | **633/633** |
| CI `Full suite (18 checks)` | **PASS** on `e33bb2a` |
| Showroom-device experience | **Owner-attested PASS** — the motion felt preferable to the legacy reveal on the tested showroom iPad |
| Scoring / recommendation identity / ordering / copy / catalog / Spanish strings | **Unchanged** |
| Feature flag | **OFF** (`MOTION_POLICY.enabled = false`) |

## Device-check result — stated precisely

- **Functional showroom-device motion check: PASSED by owner attestation.**
- **Exact device/browser metadata: PENDING CAPTURE.** The owner has not yet supplied:
  1. the exact iPad model name;
  2. the exact iPadOS version;
  3. whether the test used Safari or the installed Home Screen/PWA experience.
  These values are deliberately **not** inferred or invented here.
- **The motion-performance device evaluation required by PR #24's own governance:
  functionally passed, but its audit record remains incomplete until the metadata
  above is supplied.**

## Relationship to the roadmap's Phase 0.4 — an important correction

Earlier PR #24 text loosely called this evaluation "Phase 0.4 showroom-device
testing." Inspecting the canonical definition (`docs/rebuild-roadmap.md` §0.4), the
roadmap's **Phase 0.4 is a different requirement entirely**: *recovery from the
data-error overlay*, whose hardware exit is the **retry and clean-restart routes
verified on the confirmed mounted showroom device**, recorded in
`docs/kiosk-device-hardening.md`. Stated per that definition:

1. **What this owner test closes:** the showroom-device motion evaluation attached to
   PR #24's governance (the "actual showroom-iPad evaluation" condition carried by
   the motion program) — functionally, with the audit record incomplete as above.
   Nothing else.
2. **What remains open:** the roadmap's actual Phase 0.4 hardware exit — the
   data-error retry and clean-restart routes verified on the confirmed mounted
   device — plus the per-device hardening checklist in
   `docs/kiosk-device-hardening.md`, which stands deliberately unticked. This motion
   attestation says nothing about the data-error routes and does **not** advance,
   close, or partially close Phase 0.4. Phase 0 therefore still cannot close on the
   strength of this record.
3. **What cannot be determined from the available record:** whether the iPad used
   for this motion test is the confirmed *mounted* showroom device at all, and in
   which browser context it ran — precisely the missing metadata. Until captured,
   this test cannot even be evaluated as contributing evidence toward the
   mounted-device chain that Phase 0.4 and the hardening checklist require.

## Standing restrictions

This record authorizes nothing. The feature remains OFF; PR #24 remains draft and
DO NOT MERGE. Next actions are the owner's: (1) supply the three metadata fields and
complete this audit record; (2) explicitly authorize merging PR #24 with the feature
still OFF; (3) handle activation later in a separate PR, subject to the standing
gates (native-Spanish review for any future strings; the roadmap's actual Phase 0.4;
kiosk hardening checklist for the mounted device).
