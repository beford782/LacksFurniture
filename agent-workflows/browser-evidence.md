# Browser evidence matrix

Use the in-app browser against an HTTP-served working tree for customer-visible
changes. Automated DOM checks supplement this pass; they do not replace it.

## Setup

- Serve the repository root over HTTP. Never use `file://`.
- Use a representative iPad viewport. Record the exact width, height, browser,
  branch, and commit or working-tree state.
- Keep developer-console observation active for uncaught errors, failed requests,
  and blocked mixed/domain content.
- Use only preview mode. Do not enter real customer information.

## Minimum matrix

Repeat affected paths in English and Spanish:

| Area | Evidence to record |
| --- | --- |
| Welcome and quiz | Layout, focus visibility, selected state, touch targets, progress, language switch |
| Sleep Brief | Customer-derived content, disclosure behavior, decorative semantics, reduced motion |
| Results and tier tabs | Order, labels, no fabricated claims, keyboard/touch interaction |
| Mattress detail and comparison | Dialog name, focus trap/restore, selection cap, clear/reset behavior |
| Sleep System and plan | Finalist provenance, accessory behavior, no rescoring side effects |
| Payment Choice | Disclosure-first path, external-link/QR behavior, no payment calculation or data collection |
| Handoff/save | Preview gating, no live send, expected summary content |
| Session safety | Restart confirmation, timeout recovery, authoritative wipe, no prior-customer residue |

Also check reduced-motion and forced-colors behavior when the change touches
animation, focus, status, dialogs, or selection state.

## Evidence format

Record:

- branch and commit/working-tree identifier;
- URL and viewport;
- paths exercised in each language;
- screenshots for changed screens and important failure states;
- console/network observations;
- pass/fail with exact reproduction steps for failures;
- anything requiring a physical iPad or live backend that remains unverified.

Store temporary screenshots under `outputs/manual-gates/`; this path is ignored by
Git. Commit only an explicitly approved evidence record, never customer data.
