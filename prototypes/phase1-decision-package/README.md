# Phase 1 decision-package prototypes

**RESEARCH / PROTOTYPE ONLY — not Phase 1 implementation, not approved for
merge, never imported or executed by the production application.** Phase 0.4
remains pending, Phase 0 remains open, and the showroom device matrix is
unconfirmed. Everything here renders against frozen engine output captured
from main = `78f949c` (see `fixtures/PROVENANCE.md`); nothing recomputes,
re-orders, filters, caps or synthesises engine output.

## Layout

| path | owner | contents |
|---|---|---|
| `fixtures/` | fixture/provenance builder (lead) | frozen scenario JSONs, capture tooling, parity check — FROZEN; builders may not edit |
| `shared/` | lead | fixture-loading harness + review-bar styling — builders may not edit |
| `sleep-brief-a/` | builder A | Sleep Brief Alternative A (need-led hero) |
| `sleep-brief-b/` | builder B | Sleep Brief Alternative B (conservative fixed heading) |
| `results-tabs/` | builder C | Results — strongest restyle of the current Gold/Silver/Bronze tabs |
| `results-grouped/` | builder D | Results — preserving grouped/accordion presentation |

Builder isolation: each variant directory has exactly one owner; no two
builders edit the same file; fixtures and shared harness are read-only inputs.

## Viewing

Serve the repo root over HTTP and open a variant:

```
python -m http.server 8000
http://localhost:8000/prototypes/phase1-decision-package/sleep-brief-a/?scenario=dense-c&lang=en
```

Query params: `scenario` = `dense-c` | `dense-a` | `sparse-b`; `lang` = `en` | `es`.

## Ground rules every variant obeys

- Priorities render at the engine's index, order and count (1–3, never
  padded, never filtered, never selected by kind).
- The firmness integer renders exactly; word labels come from the destination
  surface's own live vocabulary; the internal score, any rank number and any
  match percentage never render.
- Gold/Silver/Bronze identity, membership and within-tier order are the
  fixture's, verbatim; no cross-tier ranking or leader comparison implied.
- All copy bilingual, taken verbatim from the production renderers (via the
  fixtures) — no invented customer-specific reasons, no medical or
  buyer-characterising phrasing, no decorative photography, existing icon
  vocabulary only.
- Sleep fit visually dominant; financing at most the existing secondary
  module in its stale-closed shipped state; zero financing on Sleep Brief and
  Compare surfaces.
- Real headings/landmarks, `<ol>` for ranked lists, real buttons,
  `aria-expanded` on disclosures, bilingual accessible names (firmness as
  "Medium, 4 of 10" / "Medio, 4 de 10"), visible text on every icon badge,
  decorative icons `aria-hidden`, visible focus, ≥44px touch targets,
  keyboard operable, no hover-only information, one announcement mechanism.
- Illustrative viewport spread only (320 / 480 / 768×1024 portrait /
  1024×768 landscape / 1180+), labelled content-driven — never presented as
  the showroom device matrix.
