# Sleep Brief — recommended candidate (A-derived) — variant notes

**PROTOTYPE ONLY.** Research artifact inside the Phase 1 decision package.
Not Phase 1 implementation, not approved, never imported or executed by the
production application. Renders frozen engine output captured from
main = `78f949c` (`../fixtures/PROVENANCE.md`).

## 1. What this candidate is

The external (Codex) review of the first decision-package head concluded
that neither Alternative A nor Alternative B should be approved unchanged,
and asked for a single recommended candidate combining the strongest
elements of both. This directory is that candidate. It was built in the
2026-08-07 correction pass by the lead, derived from Alternative A's code.

**Taken from Alternative A** (unchanged):

- the need-led hero — `h1` is `priorityRows[0]` strictly by index, with its
  one-line reason as the lede, and the captured production heading ("Your
  Sleep Brief" / "Tu Resumen de Sueño") demoted to a continuity eyebrow;
- the compact shared-view composition (badges + firmness in the hero,
  priorities beside the journey rail);
- the exact firmness presentation — 10 discrete segments, the exact captured
  integer, the Brief's own captured vocabulary word, sr-only sentence as the
  single accessible rendering;
- the exact engine-ordered priority list (1–3 rows, `<ol>`, ordinal markers,
  captured kind pills);
- the ≥920 px two-column landscape structure;
- the persistent sticky action bar.

**Taken from Alternative B**:

- the always-visible "Try this:" testing guidance — the fixture's captured
  implication-not-diagnosis copy, typographically subordinated but never
  behind a disclosure. This adopts the external evidence
  (`w2-progressive-disclosure`) over the roadmap's proposed disclosure; the
  A-vs-B contrast built to expose that disagreement is resolved in favor of
  visible guidance. The guidance describes what to try on the showroom
  floor; it does not diagnose or characterize the customer.
- visible category labels on the signal badges (a `<dl>`: dt = category,
  dd = value), replacing A's sr-only-label treatment;
- the complete position-badge mapping including `no_idea` → its own quiz
  label ("Not Sure" / "No Estoy Seguro") — the stored answer renders as
  stored instead of being omitted.

**Removed relative to both A and B**:

- the "Compare finalists" entry and its simulated 2-up dialog. The normal
  first-visit Sleep Brief has no saved finalists; production's one working
  Compare entry belongs to the Consultation Summary (requires exactly 2
  saved products) and production's Sleep Brief carries no Compare entry at
  all. A first-visit Compare demonstration therefore required simulated
  saved products to look complete — the external review correctly rejected
  that. No returning-session state is modeled on this screen: the
  saved-finalist Compare surface is the Consultation Summary's, which is
  outside this package's scope. The page-local "Compare selected
  mattresses" demonstration lives in the corrected `results-tabs/`
  candidate, where selection is real page state.

## 2. Contract compliance

- Hero = `profile[lang].priorityRows[0]` **by index** — never by kind,
  never re-selected.
- Priority list = `priorityRows` verbatim: engine order, engine count
  (1–3), never padded, filtered, re-sorted or selected by kind.
- Firmness = the exact captured integer 1–10; the word is the captured
  metaStrip Feel value; no rescaling, rounding, or new stops.
- No rank, score, kind-order, confidence or any hidden scoring output is
  reconstructed; no match percentage renders.
- Badges render stored answers (via verbatim `data/quiz.json` option
  labels) — never softened, reinterpreted, diagnosed, or fed back into any
  scoring logic. Health-adjacent answers (`sleep_issues`,
  `health_conditions`, `partner_disturbance`) are never read.
- Unanswered or unmapped signals are omitted, never placeholdered.

## 3. Copy provenance — four explicit classes

Every string on this screen belongs to exactly one class. Classes 3 and 4
are mechanically marked in the DOM.

**(1) Fixture-derived** (read from the frozen fixture; unmarked): eyebrow
(`dom.profileName`), hero title + lede (`priorityRows[0]`), priorities
heading (`dom.profilePrioritiesHeading`), every priority row's title, desc,
kind pill text/class, and "Try this" body (`row.test`), reassurance line
(`dom.profileReassurance`), journey heading/steps/copy, Edit-answers button
label (`dom.profileSecondary` — the production pair "← Edit my answers" /
"← Editar mis respuestas", index.html:13506, arrives via the fixture),
metaStrip badge labels and values (Temperature, Feel, Size), firmness
integer and word.

**(2) Production-verbatim hardcoded pairs** (byte-identical to production,
line cited; unmarked):

| string | EN | ES | production source |
|---|---|---|---|
| Try-this prompt | "Try this:" | "Pruébalo:" | index.html:13484 (trailing space trimmed) |

**(3) Proposed product copy** — every use site carries
`data-proposed-copy`, a **visible dotted underline** (legend at the foot of
the page), and an **sr-only "(proposed copy — not production)" suffix**:

| slot | EN | ES |
|---|---|---|
| basis-of-order line | "In order, based on your answers" | "En orden, según tus respuestas" |
| primary CTA — **note:** the external review described this pair as "approved existing terminology"; it is not. Production's primary is the mislabeled "Compare My Matches →" / "Comparar Mis Opciones →" (index.html:13509), and "See My Matches" appears nowhere in production — the pair is PROPOSED and marked as such. | "See My Matches →" | "Ver Mis Opciones →" |
| Position badge label | "Position" | "Posición" |
| Sharing badge label | "Sharing" | "Cama compartida" |
| Position badge value mapping | stored answer → verbatim quiz.json option label | same |
| Sharing badge value mapping | stored answer → quiz.json-derived label | same (solo-ES register deviation, §5) |
| firmness sr sentence template | "Firmness: {word}, {n} of 10" | "Firmeza: {word}, {n} de 10" |

**(4) Prototype chrome** (review-surface text that would never ship;
carries `data-prototype-chrome` where it is an element): the
simulated-action caption, the proposed-copy legend, the fixture-error
guard message, the sr-only "(proposed copy — not production)" marker
string itself, the localized `document.title`, and the shared harness
review bar.

**Marking-coverage narrowing (stated exactly):** every class-3 node
carries the attribute, the visible dotted underline and the sr suffix,
with one structural exception — the firmness sr sentence template is
itself screen-reader-only, so its "visible" marking cannot exist: the
visible firmness fragment ("{word} · {n}/10") renders fixture-derived
content only and is aria-hidden. The template's proposed status is marked
in the SR channel (suffix inside the sr sentence) and recorded here.

## 4. Language discipline

No cross-language, label, or identifier fallback. All non-fixture strings
resolve through a strict local `LX()` that returns `null` when the active
language's value is missing — the caller omits the element rather than
rendering English in Spanish mode. The shared harness `L()` (which mirrors
production's en-fallback) is deliberately not used by this candidate.

Inherited production behavior, rendered as captured and flagged rather
than silently fixed: the Size badge **value** is EN-only in ES mode
(production's `sizeLabels` has no ES side, so the captured ES-mode
metaStrip carries the English size name). That string is fixture-derived
captured content — the candidate itself performs no fallback — and the
defect remains flagged for Blake in the decision document.

## 5. Flags carried for native-Spanish review

- Sharing badge `solo` ES value "Duerme solo" is third person, matching the
  captured temperature register ("Duerme con calor"), deviating from
  quiz.json's option label. Pending native review.
- Sharing badge label ES "Cama compartida" (aligned with A/B's fix-pass
  vocabulary). Pending native review.
- All class-3 proposed ES strings above are drafted, not approved; Spanish
  sign-off is an explicit outstanding decision (decision document §12).

## 6. Deviations from production (shared with A, restated)

- The fixed production heading is demoted from `h1` to eyebrow; the need
  title takes `h1` (the gated 1.1 output made judgeable — not approved).
- Subtitle/summary/reflection/priorities-intro/plan-label prose is not
  rendered; its facts move into the labeled signal badges. The reassurance
  line is kept verbatim.
- The journey rail is upgraded from production `div`s to a real `<ol>`.
- The CTA mislabel ("Compare My Matches →" navigating to Results) is
  resolved by the proposed "See My Matches →" label; no Compare entry
  exists on this screen (production's Sleep Brief has none either).
- `tag-preference` (no production CSS rule — known gap) is styled here, as
  in A.

## 6b. Focused final pass (2026-08-07, pre-dry-run)

- **Required-vs-optional language classes.** `LRq` joins `LX`: required
  bilingual copy (the basis line, CTA, "Try this:" prompt, chrome strings,
  the sr proposed-marker) now renders a loud bilingual
  `PROTOTYPE CONTRACT FAILURE` naming the missing string and throws,
  instead of silently omitting; optional content (position/sharing badges)
  keeps omission semantics. No fallback of any kind, in any class.
- **Evaluation mode** (`?mode=evaluation`, via the shared harness): for
  the assisted-sales dry run. Same fixture, code, composition and
  interaction; the legend and sim caption are hidden and empty, sr-only
  "(proposed copy)" suffixes are not appended (clean accessible names),
  and the dotted underline is CSS-suppressed under `html.df-eval`;
  `data-proposed-copy` attributes stay for provenance. Reviewer mode (the
  default) keeps every provenance aid.
- **Mode-neutral tap feedback**: the simulated Edit/CTA buttons pulse on
  tap in BOTH modes (matching the Results candidate) — in evaluation mode
  the caption that used to flash is hidden, and without the pulse an
  evaluation-mode tap appeared dead, which the dry run would have recorded
  as a design defect (packet-inspector blocker).
- `document.title` still says "(prototype)" in evaluation mode —
  deliberate, consistent with the retained harness notice.

## 7. Open questions for Blake (return at implementation review)

- Keep or drop the "Your Sleep Brief" continuity eyebrow above the need-led
  hero (decision document §12, sub-decision 1a).
- Final badge vocabulary and the two proposed badge category labels.
- Sticky vs in-flow action bar on the eventual production screen.
- Whether the always-visible "Try this" copy length needs a tighter edit
  for the smallest supported viewport once the device matrix exists
  (Phase 0.4).
