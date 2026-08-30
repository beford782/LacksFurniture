# DreamFinder code-review contract

Review behavior and risk, not formatting already enforced mechanically. Lead with
actionable findings ordered by severity, with exact file and line references.

## Blockers

Flag the change as blocking when it does any of the following without an explicit,
recorded owner decision:

- changes scoring, tier membership, quiz IDs, score tags, recommendation baselines,
  or allows financing to affect sleep-fit outputs;
- introduces retailer-specific values into store-agnostic logic;
- hand-edits a generated artifact or breaks source-to-workbook-to-bundle lineage;
- publishes an exact financing, inventory, savings, health, availability, or
  product claim without governed evidence;
- weakens session wiping, contact-data isolation, email gating, analytics privacy,
  domain locking, or production/demo separation;
- removes English/Spanish parity, keyboard access, focus restoration, the 44px
  touch floor, reduced-motion behavior, forced-colors behavior, or required
  contrast;
- enables a live `gasUrl`, promotion scenario, email send, or deployment path;
- changes protected release controls or required-check names without coordinated
  repository settings and recovery documentation.

## Required review passes

1. Trace each changed value to its canonical source and generated consumers.
2. Compare behavior in English and Spanish, including fallback and missing-copy
   paths.
3. Inspect public-kiosk lifecycle behavior: restart, timeout, reset, stale async
   completion, focus restoration, and prior-customer data removal.
4. Re-check financing and promotional isolation from scoring, email, analytics,
   and ordinary production configuration.
5. Verify focused tests exercise behavior rather than only matching source text.
6. Confirm the full-suite result and browser-evidence matrix are current for the
   reviewed commit or working tree.
7. Inspect `git diff --check`, generated artifacts, unexpected binaries, secrets,
   localhost-only assumptions, and unintended network sinks.

## Review output

- Findings first, ordered blocker/high/medium/low.
- For each finding: behavior, evidence, impact, and smallest safe correction.
- Then list assumptions, unverified checks, and remaining owner decisions.
- If there are no findings, say so explicitly and still name residual risks or
  verification gaps.

