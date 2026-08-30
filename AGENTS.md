# DreamFinder agent guide

This file is the durable entry point for coding agents working in this repository.
It applies to the whole tree.

## Start here

- Confirm the Git root and current branch before editing. This repository is often
  opened alongside several other DreamFinder worktrees; never treat the parent
  `Lacks PROTOTYPE` directory as the application repository.
- Read `CLAUDE.md` completely before non-trivial work. Despite its historical
  filename, it is the detailed project guide and contains the architecture,
  product invariants, owner rulings, deployment controls, and files requiring
  Blake's approval.
- Read the relevant source document for the requested work. For redesign slices,
  use the applicable section of `../DreamFinder-master-redesign.md` when it is
  available, plus `docs/rebuild-roadmap.md` and any named decision record.
- If the requested approach conflicts with a simpler or safer approach, explain
  the conflict and recommendation before changing direction. Continue without
  unnecessary questions when the choice does not materially affect scope.

## Source ownership

- `index.html` is the single-file kiosk application. Do not split its CSS or
  JavaScript into separate production files.
- Edit canonical inputs under `incoming/` and regenerate their derived files.
  Never hand-edit generated workbook, JSON, allowed-host, manifest, demo-bundle,
  PDF, or ZIP outputs unless the documented workflow explicitly names that file
  as canonical.
- `incoming/lacks_mattresses.json` is canonical for the deployed mattress lineup;
  `data/mattresses.csv`, `data/mattresses-es.csv` and `data/mattresses.json` are
  generated (workbook → `tools/convert_store_data.py` → `build-data.ps1`).
- Lacks-specific copy, products, colors, financing, and claims must remain out of
  store-agnostic application logic. Retailer-varying behavior is config-driven.
- Illustrative promotions live only in `demo/daybreak-black-friday.json` and its
  generated demo bundle. They must never enter production inputs or configuration.

## Current lifecycle status

- DreamFinder is a pre-floor prototype. It is not live in stores, in a pilot, or
  in production unless Blake explicitly says that floor-launch preparation has
  begun or authorizes a specific live action.
- Do not spend routine maintenance cycles refreshing financing terms, promotion
  evidence, or other time-sensitive floor content while the project remains in
  this pre-floor state. Stale or incomplete exact claims must continue to fail
  closed rather than being silently refreshed or displayed.
- Re-verify time-sensitive terms only when Blake requests that work, changes the
  underlying content, or explicitly starts launch-readiness preparation.
- Treat deployment, live-backend activation, store-floor rollout, and ongoing
  production monitoring as separate owner-gated phases; repository readiness by
  itself does not authorize any of them.

## Product north star

- The primary product goal for Codex and Claude Code is to make DreamFinder the
  most visually impressive, persuasive, and useful mattress-selling interface
  possible: it should help salespeople guide the conversation, wow customers,
  increase confidence, and convert more shoppers into better-fitting mattresses
  with more and better-matched accessories.
- Treat visual quality, emotional impact, clarity, responsiveness, touch polish,
  and salesperson usefulness as first-class acceptance criteria rather than
  optional finishing work. A merely functional interface is not the target.
- Improve conversion by making value, fit, tradeoffs, comparisons, and complete
  sleep-system benefits easy to understand. Never use deceptive urgency, hidden
  terms, unsupported claims, or financing influence on sleep-fit scoring.
- Accessory recommendations should feel intentional and personalized to the
  customer's needs, not like a generic upsell. Preserve the customer's ability
  to understand, decline, and continue without friction.
- When valid implementation choices are otherwise comparable, prefer the one
  that creates the stronger in-store demonstration, clearer salesperson story,
  more memorable customer moment, and more premium perceived experience without
  sacrificing speed, accessibility, bilingual parity, privacy, or trust.

## Non-negotiable product contracts

- Sleep fit comes first. Financing must never influence scoring, tiers,
  recommendations, priorities, or the Sleep Brief.
- Do not calculate monthly payments, collect financial data, invent inventory
  availability, or publish unsupported rate, term, savings, health, or product
  claims.
- Exact financing claims require current allowlisted evidence and must fail closed
  when stale or incomplete.
- Preserve English/Spanish behavioral parity, public-kiosk privacy, authoritative
  session wiping, touch and keyboard access, reduced motion, forced-colors
  behavior, and the configured domain lock.
- Keep `gasUrl` blank and all sends in preview mode unless Blake explicitly
  authorizes a live backend activation.
- Do not change the scoring model, tier boundaries, question/option IDs, score
  tags, canonical recommendation baselines, public API fields, or protected owner
  rulings without Blake's explicit approval.

## Working method

- Use Plan mode for cross-cutting, ambiguous, or multi-screen changes. Turn the
  result into an outcome, constraints, and verifiable completion criteria using
  `agent-workflows/feature-slice-goal.md`.
- Keep one Codex task per coherent outcome. Use separate Git worktrees for
  concurrent implementation; do not let two agents edit the same worktree or
  `index.html` in parallel.
- Parallel agents are appropriate for bounded read-only audits. Follow
  `agent-workflows/parallel-audits.md`.
- Prefer focused regression tests while iterating, then run the complete local
  mirror of CI before declaring implementation complete:

  ```powershell
  pwsh -File tools/run_full_suite.ps1
  ```

- In a Codex desktop environment without `python` on `PATH`, load the bundled
  workspace dependencies and pass its Python executable with `-Python`.
- On a Windows machine without PowerShell 7 (`pwsh`),
  `powershell -NoProfile -File tools/run_full_suite.ps1` runs the same mirror
  under Windows PowerShell 5.1; the runner accepts either.
- For customer-visible changes, serve over HTTP and complete the evidence matrix
  in `agent-workflows/browser-evidence.md`. `file://` is never a valid test.
- Review the final diff against `CODE_REVIEW.md`. Report tests and browser evidence
  actually observed; never describe an unrun check as passing.

## Definition of done

Work is complete only when all applicable conditions are true:

1. The requested outcome and named owner decisions are implemented without
   expanding scope.
2. Focused regression coverage exists and passes.
3. `tools/run_full_suite.ps1` passes, or the handoff names each unrun/failed check
   and the exact blocker.
4. Customer-visible behavior has recorded browser evidence in both languages at
   representative tablet dimensions, including console and reset checks.
5. Generated-file lineage and protected artifacts remain correct.
6. The final diff has been reviewed against `CODE_REVIEW.md`.
7. No commit, push, PR, merge, deployment, live email activation, or external
   publication occurs unless the user requested that action.

## Reusable workflows

- Use `$dreamfinder-retailer-onboarding` for retailer workbooks, images, bundle
  generation, onboarding readiness, and retailer handoff.
- Use `$dreamfinder-release-readiness` for branch, PR, release, CI, browser, and
  deployment-readiness audits.
- Recurring audits are read-only and draft findings. They must not activate
  promotions, rewrite approved claims, push changes, or deploy.
