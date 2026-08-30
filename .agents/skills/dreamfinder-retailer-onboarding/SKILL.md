---
name: dreamfinder-retailer-onboarding
description: "Validate retailer onboarding workbooks and images, generate a DreamFinder retailer bundle, and produce a handoff-readiness report. Use for a new retailer deployment, retailer data refresh, onboarding intake review, or workbook-to-bundle conversion."
---

# DreamFinder retailer onboarding

Build a retailer deployment from governed inputs without leaking another
retailer's data or presenting an incomplete bundle as ready.

## Required context

Read `../../../AGENTS.md` and `../../../CLAUDE.md` before changing a repository.
For the full sequence, exact bundle inventory, deployment steps, and handoff
requirements, read `../../../onboarding/Build_Runbook.md`. Read only the phases
that apply when the request is limited to intake, validation, generation, or
handoff.

## Choose the operating mode

- **Intake/readiness:** inspect inputs and report gaps; do not generate files.
- **Bundle generation:** validate inputs, write the bundle only to the explicitly
  selected target repo/output directory, then verify it.
- **Existing retailer refresh:** identify canonical inputs and generated consumers
  first; preserve unrelated retailer configuration and owner rulings.
- **Handoff:** audit the completed bundle and prepare instructions or artifacts;
  do not publish, send, or deploy unless explicitly requested.

## Workflow

1. Confirm the target retailer, target repository/output directory, workbook,
   source-image directory, language scope, and whether a live GAS URL is expected.
   Never infer a missing retailer identity from Lacks, Bel, or another fixture.
2. Preflight the workbook, mattress/accessory/brand images, logo, and optional app
   icon against Runbook Phase 0. Missing required inputs are blockers, not values to
   fabricate.
3. Validate without writes first:

   ```text
   <python> tools/validate_workbook.py <workbook.xlsx> --source-images <images>
   ```

   For final readiness, add `--warnings-as-errors`. Add `--require-gas-url` only
   when the requested deliverable is intended for live sending; preview deployments
   should keep `gasUrl` blank.
4. Before generation, capture the target Git status and confirm the output scope.
   Run the converter with validation enabled; never use `--no-validate` for a
   deliverable:

   ```text
   <python> tools/convert_store_data.py <workbook.xlsx> --output-dir <target> --source-images <images> --warnings-as-errors
   ```

5. Verify the required runtime bundle, canonical-versus-generated lineage, image
   paths, allowed hosts, PWA manifest, English/Spanish coverage, and absence of
   another retailer's identity. Use `../../../tools/run_full_suite.ps1` when the
   target repo carries the DreamFinder verification suite.
6. For customer-visible output, follow
   `../../../agent-workflows/browser-evidence.md`. Treat live-host domain-lock and
   real email tests as separate manual gates; localhost cannot prove either.
7. Report the result as **ready**, **ready for preview only**, or **blocked**. List
   inputs used, commands run, generated files, validation evidence, remaining owner
   decisions, and manual/live gates still required.

## Safety boundaries

- Do not create a GitHub repository, repoint a remote, commit, push, deploy Pages,
  update Apps Script, send email, or share artifacts unless the user explicitly
  requests that action.
- Do not invent translations, financing terms, inventory, product claims, contact
  details, URLs, or owner approvals. Flag missing evidence.
- Do not treat a golden-template pass as validation of retailer data. It proves the
  toolchain; the retailer workbook, generated bundle, and browser flow need their
  own evidence.
- Keep source materials and generated artifacts inside the authorized target. Do
  not overwrite a different retailer deployment.
