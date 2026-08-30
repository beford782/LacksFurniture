# Parallel audit boundaries

Use parallel agents to shorten independent analysis, not to create competing edits
to the single-file application.

## Good bounded assignments

- Accessibility, focus, touch, reduced-motion, and forced-colors audit
- English/Spanish parity and fallback audit
- Financing claims, evidence freshness, and scoring-isolation audit
- Generated-file lineage and protected-artifact audit
- Test-gap and mutation-resistance analysis
- Visual hierarchy critique using browser screenshots

Each audit should be read-only, name its evidence, distinguish findings from
preferences, and return a compact report to one primary task.

## Avoid

- Two agents editing `index.html` in the same worktree
- Parallel regeneration of the workbook or data bundle
- One agent changing tests while another changes the same behavior contract
- Concurrent commits, rebases, pushes, deployments, or live external actions

If implementation must run concurrently, create separate Git worktrees and give
each task non-overlapping ownership. The primary task reviews and integrates the
results, then runs the full suite once on the combined state.

