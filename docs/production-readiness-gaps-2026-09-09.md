# Production-readiness gaps — the enumeration (2026-09-09)

Roadmap sequence item 14, step 5, first half: the written list the direction
asked for before any gap is built. Enumerated against the roadmap's own open
records and the session record, on the state of `main` `e76890c` plus the
open construction PRs (#107–#112 and the two scoring re-cuts). Each gap says
what is **code** (buildable now, under the construction invariants) and what
is an **approval or physical verification** (the final gate). Nothing here
activates anything; no gap is a licence to touch scoring, financing, touch
handling or the store-agnostic boundary without its own bounded PR.

"Production ready" (owner direction 2026-09-09): the code, configuration
model, UI consumers, failure states, operational controls and a staging /
live-like verification path are complete and ready for the final gate. It
does not mean production-active.

## Gaps that are code, in the order proposed

| # | Gap | Where recorded | What is built now | What stays at the final gate |
|---|---|---|---|---|
| G1 | **Sleep Plan / Consultation Summary pick-card tier line** recorded 2026-08-23 as accessibility debt at 4.17:1 (`.hf2-pick__tier`), "NOT conforming and NOT accepted" — **already closed.** Slice 6 C5 (`5caa696`, PR #58, merged 2026-08-24) moved the line to `--accent-ink` (#2F271E on #FFFDF8, well above 4.5:1) on both surfaces and pinned it in `tests/contrast_check.mjs` with the retired pairing as the negative control; the roadmap's own 1.6 note records the closure. Only the 2026-09-09 reconciliation sentence in that note, which called the debt "untouched … and stays open", was stale | roadmap item 1.6 (2026-08-23 note); this enumeration | Nothing to build; the stale sentence is corrected in this PR | Nothing |
| G2 | **Send-nothing verification path for email and lead delivery.** The live-mode client path (`emailDeliveryLive()` true) has never been exercised without a real Apps Script endpoint; the runbook's Phase C needs a seed inbox and a real `/exec` | `docs/gas-activation-runbook.md` Phase C; roadmap item 14 step 5 | A loopback-only harness modelled on `tools/serve_pricing_preview.py` that serves the app with an in-memory `gasUrl` pointing at a stub endpoint on the same loopback server, records the POSTed payload and answers like GAS; a check that drives the real page in EN and ES, asserts the payload contract (`tests/email_gating_check.mjs`'s key set, the three-field accessory packet, `lang`), the live-mode data-use sentence, the confirmation copy swap, the invalid-email and unreachable-endpoint paths, and that nothing leaves loopback; `Code.gs` executed against the recorded payload where it can be (its pure helpers) | The seed-inbox test deployment, the production `/exec`, Sheet access, BCC — Phases C–E as written |
| G3 | **Privacy / consent live-mode wording and the `Code.gs` disclosure.** The overlay shows the draft-policy notice by decision; the live-mode data-use sentence exists in both dictionaries but the disclosure of what `Code.gs` does with a submitted address is unwritten as approved copy | roadmap register row "Privacy approval"; `docs/gas-activation-runbook.md` blocking items | The runtime already switches copy on `emailDeliveryLive()`; the harness in G2 proves the switch. The CAN-SPAM sentinels in `Code.gs` already hard-block sending until replaced | The approved policy wording, the privacy contact, the postal address and unsubscribe process, the native-Spanish review of the data-use sentences (owner + Lacks content) |
| G4 | **Local-CI mirror hardening** (interpreter admission preflight, pinned requirements with markers, the 3.12–3.14 range, import-for-real) — verified 2026-09-06 but never committed; frozen as working-tree changes in the `a43-recut` worktree | session record 2026-09-06 (memory) | Re-cut as its own tooling PR from then-current `main`: the retained patch plus the three new files, counts re-derived against the current mirror (the 2.2 slices and the scoring re-cuts each added steps) | Nothing |
| G5 | **Converter line-ending churn.** `tools/convert_store_data.py` rewrites five generated files it did not change (`accessories.json`, `quiz.json`, `store-config.json`, `allowed-hosts.js`, `manifest.json`) with LF endings on every run, so each regeneration dirties them for EOL only; every 2026-09-09 slice restored them by hand before committing | found 2026-09-09 during 2.2b | Write generated JSON with the checkout's line endings (or normalise on write and pin the committed files LF via `.gitattributes`, as the demo bundle already does), with a lineage check that a no-op regeneration leaves the tree clean | Nothing |
| G6 | **Documentation drift in `CLAUDE.md`**: the required-check paragraph states a fixed step count ("49 verification steps"); the count moves with every added suite (54 once the open construction PRs merge) and has already been corrected by hand twice | `CLAUDE.md` Deployment section | Replace the fixed number with the derivation the workflow comment already names, so the paragraph cannot drift again | Nothing (a CLAUDE.md docs edit; no owner mark) |
| G7 | **Daybreak "promo-muted-lines" latent defect**, recorded 2026-08-14 as reported-not-fixed | session record (memory index only; the detail was compacted) | Re-derive the report from the PR #42 / #43 review threads before deciding; if it is a presentation defect in the promotion cue lines it is a bounded fix with a rendered pin | If it turns out to touch promotion governance, the governed current-event contract applies |

## Gaps that are approvals or physical verification only (no code)

| Gap | Where recorded | Final-gate input |
|---|---|---|
| Kiosk hardening: Guided Access / MDM configuration, the mounted-device checklist, session timing values (`SESSION_POLICY` provisional defaults) | `docs/kiosk-device-hardening.md` | Owner-run device configuration and verification; a ruling on the timing values |
| The browser matrix, mounted iPad Pro / Safari verification, the pre-showroom accessibility matrix, the consolidated role-play kit and sessions | roadmap item 1.4, the cohesion milestone, the pre-floor evidence plan | The one final non-live validation pass |
| Native-Spanish linguistic approval (Invariant 12), the claim-equivalence reviewer | roadmap Invariants; 1.3 claim inventory | The consolidated pass |
| Real governed price data (products, formulas, catalog `skus` / accessory `sku` values), `displayEnabled`, the surface flags, business / legal / MAP approvals | roadmap item 2.2 | The activation decision |
| Accessory price values confirmed with Lacks | register row "Accessory price provenance" | The activation decision |
| Item 1.3 reason content (owner-authored) and its claim evidence | roadmap item 1.3 | Owner authoring; the evidence record |
| Items 3.3–3.6 | roadmap Phase 3 | Blake's decisions, each on its own evidence |

## Not gaps

- The 2.2 disabled implementation (2.2a–2.2d), the accessory-price provenance
  behaviour, the payload minimisation and the A4.1 / A4.2 re-cuts are open
  construction PRs, not gaps: they are built, mirror-green and awaiting Codex
  review and merge in order.
- Item 0.7 and Phase 0 stay closed; Phase 2.1 stays closed.

## Proposed order

G1 (smallest, rendered-contrast fix) → G5 and G6 together (tooling and docs
hygiene, one PR) → G4 (the mirror hardening re-cut) → G2 (the send-nothing
harness, the largest) → G7 (after its report is re-derived) → G3 is not code.
Each as its own bounded PR from then-current `main`, Codex-reviewed, merged
only on Blake's request.
