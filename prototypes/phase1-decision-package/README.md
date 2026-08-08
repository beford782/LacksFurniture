# Phase 1 decision-package prototypes

**RESEARCH / PROTOTYPE ONLY — not Phase 1 implementation, not approved for
merge, never imported or executed by the production application.** Phase 0.4
remains pending, Phase 0 remains open, and the showroom device matrix is
unconfirmed. Everything here renders against frozen engine output
captured/re-blessed from synchronized main = `01b03b9` — byte-equivalent
to the earlier `78f949c` capture except the embedded `engineSourceCommit`
pointer (see `fixtures/PROVENANCE.md`, the authoritative record); nothing
recomputes,
re-orders, filters, caps or synthesises engine output.

## Layout

| path | status | contents |
|---|---|---|
| `fixtures/` | frozen (lead-owned) | frozen scenario JSONs, capture tooling, parity check, prototype contract runner |
| `shared/` | lead-owned | fixture-loading harness + review-bar styling |
| `sleep-brief-recommended/` | **RECOMMENDED candidate** | A-derived Sleep Brief (need-led hero + always-visible testing guidance + labelled badges; no first-visit Compare) |
| `results-tabs/` | **RECOMMENDED candidate** (as corrected) | accessible tier tabs; lead + compact-support cards; page-local "Compare selected mattresses" |
| `sleep-brief-a/` | exploration record | Alternative A (need-led hero, disclosure-hidden testing detail) |
| `sleep-brief-b/` | exploration record | Alternative B (conservative fixed heading, visible testing detail) |
| `results-grouped/` | **rejected exploration** | single-open accordion (see its VARIANT-NOTES banner for the rejection ground) |

The A/B Sleep Briefs and the accordion are retained as the record of the
exploration that produced the recommended candidates; they are not proposed
for adoption.

## Viewing

Windows note: a fresh clone needs `git config core.longpaths true` (the
screenshot filenames exceed MAX_PATH in deep directories), and the
verification scripts below run identically on LF and CRLF
(`core.autocrlf=true`) checkouts.

Serve the repo root over HTTP and open a variant:

```
python -m http.server 8000
http://localhost:8000/prototypes/phase1-decision-package/sleep-brief-recommended/?scenario=dense-c&lang=en
```

Query params: `scenario` = `dense-c` | `dense-a` | `sparse-b` |
`boundary-one` (a disclosed SYNTHETIC one-priority boundary state — see
`fixtures/PROVENANCE.md`); `lang` = `en` | `es`; `mode` = `evaluation`
(recommended candidates only — strips reviewer apparatus for the
assisted-sales dry run; reviewer mode is the default and keeps every
provenance aid); `state` (results-tabs only — replays real interactions
for reproducible screenshot cells).

## Verification

```
node prototypes/phase1-decision-package/fixtures/tools/parity_check.mjs            # fixtures == fresh engine run + row-bound hashes + surface floors
node prototypes/phase1-decision-package/fixtures/tools/contract_check.mjs          # recommended candidates honor the rendering contracts (DOM-stub execution, both modes)
node prototypes/phase1-decision-package/fixtures/tools/contract_negative_check.mjs # retained mutation evidence: every observer proven to catch its defect (isolated temp copies; never touches the worktree)
```

Each script's header states exactly what it proves and does not prove.
None is mounted-device, assistive-technology, or customer evidence, and
none runs in repository CI.

## Ground rules every variant obeys

- Priorities render at the engine's index, order and count (1–3, never
  padded, never filtered, never selected by kind).
- The firmness integer renders exactly; word labels come from the destination
  surface's own live vocabulary; the internal score, any rank number and any
  match percentage never render.
- Gold/Silver/Bronze identity, membership and within-tier order are the
  fixture's, verbatim; no cross-tier ranking or leader comparison implied.
- Copy provenance is explicit, in four classes: fixture-derived; verbatim
  production EN/ES pairs (line-cited); PROPOSED product copy (marked
  `data-proposed-copy` — in the recommended candidates also visibly
  dotted-underlined and sr-suffixed); and prototype chrome
  (`data-prototype-chrome`, never product copy). No invented
  customer-specific reasons, no medical or buyer-characterising phrasing,
  no decorative photography, existing icon vocabulary only. (The earlier
  claim that ALL copy was "taken verbatim from the production renderers"
  overstated — the proposed class exists and is marked.)
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
