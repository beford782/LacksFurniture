---
name: dreamfinder-release-readiness
description: "Audit a DreamFinder branch, pull request, or release candidate against project invariants, tests, browser evidence, and deployment controls. Use for release readiness, PR verification, pre-merge review, post-merge verification planning, or recurring maintenance audits."
---

# DreamFinder release readiness

Produce an evidence-backed release decision without confusing a branch push, PR
merge, Pages deployment, or live-backend activation.

## Required context

Read `../../../AGENTS.md`, `../../../CLAUDE.md`, and
`../../../CODE_REVIEW.md`. For releases or deployment changes, also read
`../../../docs/deployment-workflow.md`. For customer-visible changes, read
`../../../agent-workflows/browser-evidence.md`.

## Audit modes

- **Working tree or branch:** inspect local changes and determine whether they are
  review-ready.
- **Pull request:** compare the exact PR head to its base, inspect current checks,
  and identify merge blockers.
- **Release candidate:** verify the intended commit, full suite, browser evidence,
  generated artifacts, and remaining manual gates.
- **Post-merge:** distinguish merge, CI-on-main, Pages build/deploy, live smoke, and
  GAS activation as separate states.
- **Recurring maintenance:** run read-only checks and draft findings; never mutate
  the repo or external systems.

## Workflow

1. Identify the repository root, branch, base, exact commit or working-tree state,
   requested release target, and whether the audit may use live GitHub/web data.
2. Inspect the complete diff and trace changed generated files back to canonical
   inputs. Check unexpected binaries, secrets, network sinks, conflict markers, and
   another retailer's identity.
3. Apply `../../../CODE_REVIEW.md`, emphasizing scoring/financing isolation,
   claims evidence, bilingual parity, kiosk privacy, touch/keyboard behavior,
   production/demo separation, and deployment governance.
4. Run focused checks appropriate to the diff, then run:

   ```text
   pwsh -File tools/run_full_suite.ps1
   ```

   Record the actual count and result. The GitHub job name `Full suite (18 checks)`
   is a pinned compatibility label, not the current number of executed checks.
5. Require current browser evidence for affected customer-visible paths using the
   shared matrix. Never substitute source inspection for unperformed browser or
   physical-iPad checks.
6. For a PR or merged commit, verify remote checks only when live access is
   available. Report branch publication, PR state, main-branch CI, Pages build,
   Pages deploy, live smoke, and GAS state independently.
7. Return a decision:
   - **READY** — all required evidence is current and no blockers remain;
   - **CONDITIONALLY READY** — code evidence passes, with named manual/live gates;
   - **NOT READY** — one or more blocking findings or failed checks;
   - **UNKNOWN** — required evidence was inaccessible or not run.

## Output

Lead with the decision and exact audited state. Then provide:

- blocking findings with file/line evidence;
- tests and browser paths actually run;
- generated/protected-artifact result;
- remote CI/deployment states when checked;
- residual risks and owner decisions;
- smallest next action to reach READY.

## Authorization boundaries

An audit is read-only by default. Do not edit, commit, push, create or merge a PR,
change branch protection, deploy, update Apps Script, activate promotions, or send
email unless the user explicitly requests that separate action.
