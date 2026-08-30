# Feature-slice Plan and Goal template

Use this for a redesign gate, cross-screen feature, or other substantial change.
Start in Plan mode and replace bracketed text with the actual slice.

```text
Turn [source section, decision, issue, or PR] into an implementation goal.

Inspect the current branch, AGENTS.md, CLAUDE.md, relevant source documents,
canonical inputs, consumers, and existing tests before proposing changes. Challenge
conflicts, hidden assumptions, and missing owner decisions before implementation.

Outcome:
- [Describe customer-visible or operational result.]

Preserve:
- scoring and financing isolation;
- config-driven white-label boundaries and generated-file lineage;
- English/Spanish behavioral parity;
- public-kiosk privacy, reset, timeout, and stale-async safety;
- keyboard, touch, reduced-motion, forced-colors, and contrast requirements;
- production/demo and preview/live-send separation.

Boundaries:
- Keep [named behavior/files] unchanged.
- Do not commit, push, open or merge a PR, deploy, activate promotions, or enable
  live email unless explicitly requested.
- Stop for Blake only when an owner decision would materially change the result.

Done when:
- focused behavioral regression tests exist and pass;
- pwsh -File tools/run_full_suite.ps1 passes;
- the affected flow is browser-tested in English and Spanish at representative
  iPad dimensions, with console and reset checks recorded;
- generated artifacts and protected files pass integrity checks;
- the final diff is reviewed against CODE_REVIEW.md;
- remaining owner decisions and unverified physical-device checks are listed.
```

After the plan is accepted, start `/goal` with the refined outcome, constraints,
and verification criteria. Keep steering in the same task; open a new task only
when the desired outcome genuinely branches.

