# Guided-selling cohesion review — pass 1 (read-only evidence and proposals)

**Date:** 2026-08-30. **Milestone:** Phase 1 — Guided-selling cohesion and
conversion readiness (🔨, opened by Blake 2026-08-30 as a read-only evidence
and proposal phase). **Reviewer:** Claude Code. **Status of this document:**
proposals only — every keep / change / experiment below is a *recommendation*
until Blake records the decision on the milestone. Nothing here changes the
application, a test, or a status.

**Tree reviewed:** branch `codex/guided-selling-roadmap` at `6b449a4`
(application bytes identical to `main` `db68f3f` — the two commits on the
branch are docs and tooling only), served over HTTP at `http://127.0.0.1:8765/`
from the clone `Documents\Lacks PROTOTYPE\LacksFurniture-slice6`.

**Method.** Playwright/Chromium (headless, device scale 2, touch on) drove the
real screen-level entry points the repo's own rendered check uses
(`tests/sleep_plan_layout_check.py`): the answer set *pain · side · back pain ·
snoring · hot · firmness 5 · partner · sometimes · average · queen*, then
`goToReview → showProfileScreen → showResults → openResultCardDrawer →
toggleCompare×2 → openCompareModal → chooseFinalist(top gold) →
showSleepPlan → showAccessories → openFinancingSheet → showSavedPicks →
showEmailCapture`. Welcome → quiz and the first option were real taps.
Captured per beat: viewport and full-page PNG, the focused element, the active
screen, horizontal overflow, open dialogs, page errors, console errors and
warnings. Four contexts: **EN and ES × 1194×748 (landscape) and 834×1108
(portrait)** — the confirmed mounted iPad Pro 11" viewports. Evidence:
`outputs/manual-gates/cohesion-review-2026-08-30/` (gitignored; 4 folders × 28
PNGs, `walk-report.json`, the two probe scripts).

**What a static capture cannot judge — NOT evaluated in this pass:** motion and
micro-interactions, touch feedback timing, `prefers-reduced-motion`, forced
colors, real-device rendering, Sleep System steps 2–4, the Silver and Bronze
tabs, the drawer's "Separate the layers" demonstration, Compare with three
items, the solo-sleeper path, and the rendered email body of the take-home
preview (only the capture form was rendered). These need the in-app browser or
the mounted device and are listed for pass 2.

## Mechanical results (all four contexts)

- **Page errors: 0.** Console: one expected warning per context
  (`[financing] exactPromotionsEnabled is not true - exact terms hidden`).
- **Horizontal overflow: none** on any beat, either orientation, either language.
- **Focus on transition:** every screen change moved focus to the screen
  heading (`questionScreen`, `reviewScreen`, `profileName`, `resultsHeadline`,
  `drawerName`, `compareModalTitle`, `sleepPlanTitle`, `sleepSystemTitle`,
  `financingSheetTitle`, `hf2ReviewTitle`, `emailHeadline`) — the 0.3
  contract holds. Welcome loads with focus on `body` (expected). After a real
  tap on a quiz option, focus returned to `body` — see Q2 below.
- **Language parity:** every beat rendered the same structure in Spanish with
  no missing or mixed strings observed in the captures.

## Beat-by-beat: evidence, north-star read, proposed decision

Each beat lists the salesperson line it invites (EN, then ES — the Spanish is
*provisional*, not native-reviewed) and a proposed decision.

### 1. Invitation — Welcome (`01-welcome`)
**Seen.** Wordmark, "Sleep Shop", heritage line, the two-line serif headline,
one sentence of purpose, one gold CTA, the data-use sentence, the
"Your consultation builds" line and the towns line. Restrained, editorial,
immediately legible. Landscape leaves the lower third empty.
**North star.** Reads as a premium consultation, not a form landing page.
First five seconds: what this is and what to tap are unmistakable. Emotional
weight: quiet by design (a quieter moment, correctly).
**Line.** "Let's find what actually fits how you sleep — a few questions, then
we'll test the matches together." / "Vamos a encontrar lo que de verdad se
ajusta a cómo duermes — unas preguntas y luego probamos las opciones juntos."
**Proposed: KEEP.** *Experiment (optional, low):* a faint Sleep Signature
motif in the empty lower-right of the landscape composition, foreshadowing the
reveal; the restrained Welcome ruling of 2026-08-21 stands and this must not
add content.

### 2. Discovery — Quiz (`02-quiz-q1`, `02b-quiz-selected`)
**Seen.** "Question 1 · of 10", a thin progress rule, a large serif question,
the ranking-neutrality helper, two-column option cards with title + sublabel,
a disabled Next that enables on selection. Selected state: dark 2 px border and
warm fill. Zero icons.
**North star.** Consultation-form character intact; tactile selected state;
one obvious next action. (The orange outline on "Just Browsing" in the
first-render capture is a hover artifact of the automation cursor, not a
style — verified by `:hover` matching.)
**Line.** "Tap what's closest — there's no wrong answer, this just tells me
where to focus." / "Toca lo que más se parezca — no hay respuesta incorrecta,
solo me dice dónde enfocarme."
**Proposed: KEEP.** *Follow-up (low, a11y):* after a tap the focused element
is `body`; a keyboard or switch user loses their place. Returning focus to the
selected option (or to Next) is a bounded change worth a device check.

### 3. Discovery — Review (`03-review`)
**Seen.** "Almost there / Quick *review*", two-column list of every question
with the answer and an EDIT control per row. Complete and editable.
**North star.** A quieter decision moment; it does its job without noise.
**Line.** "Quick check — anything you'd change before I show you the matches?"
/ "Un vistazo rápido — ¿cambiarías algo antes de ver las opciones?"
**Proposed: KEEP** (the Review stays complete and editable by ruling).

### 4. Reveal — Sleep Brief (`04-sleep-brief`)
**Seen.** Landscape: left panel with "Your Sleep Brief / Made from your
answers / Your Sleep Signature" and the seven-point constellation, one summary
sentence; right panel "What we will test together" with three collapsed
priorities and a large empty area beneath them before the CTA row. Portrait:
the constellation gets a full-width panel and the composition breathes.
**North star.** This is the first *wow* beat and the landscape composition
under-delivers it: the signature is small relative to its panel and the right
column is half empty, so the reveal reads as a sparse settings page rather than
a moment. Portrait already delivers it.
**Line.** "This is your sleep signature — nobody else's. These three things are
what we'll test on every mattress." / "Esta es tu firma de sueño — de nadie
más. Estas tres cosas son las que vamos a probar en cada colchón."
**Proposed: EXPERIMENT (landscape only).** Rebalance the landscape
composition: a larger signature panel, and either the first priority expanded
by default or the three priorities given more presence. No content change; the
constellation semantics and disclosure buttons stay. Prototype on a branch,
compare against the current capture.

### 5. Confidence — Results (`05-results`, `05-results-full`)
**Seen.** Eyebrow, "Your *strongest matches* are ready", the guidance
sentence, the trial-focus chip, tier tabs, the tier-relativity note, then the
Best Match card whose hero image fills the rest of the first fold. At
1194×748 the model name sits roughly 1,100 CSS px down — **below the fold** —
so the first five seconds show a headline and a fabric texture. Portrait puts
the name at the bottom of the first fold. The hero card carries name, 5/10
Medium and the controls, **no reasons**; the second and third cards likewise.
The small constellation at top-left carries continuity from the Brief but is
tiny.
**North star.** Structure is right (best match first, then "more directions to
compare", then Payment Choice, then Build Your Sleep System / Review Sleep
Plan). Two gaps: (a) landscape first-fold comprehension, (b) the reason-led
card content — the point of the Results redesign — is absent because item 1.3's
content is not authored (12 of 79 slots, dark). The Compare modal makes the
same gap visible: the second model shows "—" for Key feature and Why it helps.
**Line.** "Here's your best fit and two to compare it against. We'll lie on all
three — your comfort decides, not the badge." / "Aquí está tu mejor opción y dos
para compararla. Probamos las tres — decide tu comodidad, no la etiqueta."
**Proposed: CHANGE (bounded, landscape hero).** Cap the hero image height in
landscape (or overlay name · tier · feel on the image) so the Best Match name
is inside the first fold at 1194×748; portrait unchanged. **KEEP** the card
hierarchy; the reason content is the 1.3 workstream, not a presentation change.
*Experiment (low):* a slightly larger continuity mark (the signature) so it
reads as an identity rather than a speck.

### 6. Confidence — Mattress drawer (`06-drawer`)
**Seen.** Back to all matches, Prev / 1 of 3 / Next; brand eyebrow, name, tier
chip, "$$$" band in orange-red, feel line, "Feel: Medium 5/10 · responsive
hybrid", "What makes this one different" (two cards), Construction
demonstration with "Separate the layers", the variance disclaimer, "As you try
it, notice…".
**North star.** Turns specifications into customer-facing distinctions — this
is the strongest explanatory surface in the app. The price band's orange-red
is the loudest colour on the screen and competes with the name.
**Line.** "Two things make this one different — the cool cover and the coil
base. When you lie down, notice…" / "Dos cosas hacen diferente a este — la
funda fresca y la base de resortes. Cuando te acuestes, fíjate en…"
**Proposed: KEEP.** *Polish (low):* tone the price-band colour toward the
palette. The "Separate the layers" demo was not exercised in this pass.

### 7. Comparison — Compare (`07`, `08-compare`)
**Seen.** Sticky dark selection bar "2 of 2 selected" with Clear and Compare;
the modal: two images, names and bands, rows Feel / Response / Tier ("Same for
both" in italics), then the highlighted ≠ rows Key feature / Why it helps, and
Your reaction.
**North star.** It explains meaningful differences rather than merely showing
columns — the ≠ emphasis is exactly the salesperson's cue. The gap is content
("—" on the second model), owned by 1.3.
**Line.** "Same feel, same tier — the real difference is here: this one's cover
runs cooler. That's what to notice." / "Misma sensación, mismo nivel — la
diferencia real está aquí: la funda de este es más fresca. En eso fíjate."
**Proposed: KEEP** (structure). Content → 1.3.

### 8. Commitment — Sleep Plan (`10-sleep-plan`)
**Seen.** The dark "Lacks / DreamFinder — personalized sleep consultation"
header appears here for the first time; "← Back to matches"; "Your plan for the
in-store trial / Your Sleep Plan"; Finalist card; "What we will test together"
with three try-this lines; Compared mattresses; the Selections pill.
**North star.** Content is exactly right for the beat. Two continuity issues:
(a) the dark header exists only on this screen and the Summary — the rest of the
journey has no header — so the chrome changes mid-story; (b) the focus ring on
the h1 is a full-width black rectangle (see Q6).
**Line.** "This is our plan for the floor — your finalist, and the three things
to feel for." / "Este es nuestro plan para la tienda — tu finalista y las tres
cosas que hay que sentir."
**Proposed: KEEP** content; chrome → Q5 below.

### 9. System building — Sleep System (`11-sleep-system`)
**Seen.** "Optional setup guidance / Explore Your Sleep Setup"; the finalist
band "Building around your finalist"; the four-step rail (Adjustability ·
Support · Pillow · Protection, all "Not decided"); step 1 with the position
demo, "Suggested first because you mentioned back pain", position tiles with
Zero Gravity SUGGESTED, the recommended base with "Targets the back pain you
mentioned", From $1,599, and the three controls "Ask for a demo / Keep this
base in plan / Decide later"; Specialist notes; "Your plan 0/4".
**North star.** Benefit-first, relevance stated from the customer's own answer,
declining is one obvious touch — this screen already carries most of the 1.4
workstream's scope for step 1. **Defect:** the fixed `.session-utility` bar
(language + Restart, `position: fixed; top: 8px; right: 8px; z-index: 150`)
collides with the screen header in **both languages**: at 1194×748 it covers
the top 30 px of the 46 px "Review Sleep Plan" control (bar y 8–64 vs control
y 34–80); at 834×1108 it covers the right end of the h1 (bar x 568–826 vs
title x 25–809). Measured with `probe_overlap.py`; visible in the captures.
**Line.** "You mentioned back pain — so before anything else, feel this
position. If it doesn't help, we skip it." / "Mencionaste dolor de espalda —
así que antes que nada, siente esta posición. Si no ayuda, la saltamos."
**Proposed: CHANGE (defect, bounded CSS).** Give the Sleep System header
clearance for the utility bar (top padding or a header row that reserves the
bar's height at both breakpoints), verified at both viewports in both
languages. Route through the 1.4 workstream (it is a 1.4 surface). Steps 2–4
were not rendered in this pass.

### 10. Commitment — Payment Choice sheet (`12-payment-choice`)
**Seen.** "Lacks Payment Choice / Better sleep. More ways to bring it home."
disclosure sentence, the sleep-fit independence line, then per option an icon,
name and two controls "Review this option / Consider this option".
**North star.** Disclosure-first and calm; the paired buttons are heavy but
unambiguous.
**Line.** "Fit first, always. When you're ready, here are the ways to bring it
home — nothing is submitted from this tablet." / "Primero el ajuste, siempre.
Cuando estés listo, estas son las formas de llevarlo a casa — desde esta
tableta no se envía nada."
**Proposed: KEEP.**

### 11. Handoff — Consultation Summary (`13-summary`, `13-summary-full`)
**Seen.** Dark header, "← Back to matches", "select salesperson"; small
constellation; "Lacks Furniture · Sleep Shop / Review with the customer / Your
Consultation Summary"; cards: Consultation status (one sentence: "Finalist ✓
Tempur-Pedic · ProBreeze · Tempur-ProBreeze 2.0 Medium Hybrid (Gold · Best
match). Payment preference: Not selected."), What we set out to solve (three
lowercase fragment lines), What we will test together, Your saved picks (with
"Compare mattresses"), Your Sleep System ("Nothing added…"), Lacks Payment
Choice (preference, chips, QR, Explore payment options), then "Your
consultation is ready to save" with Review Sleep Plan / **Save picks**.
**North star.** Complete, honest, and every fact the salesperson needs is
present; the next action is clear. But it reads as an administrative report,
not a culmination: the finalist is a sentence, not a moment; the "What we set
out to solve" block renders as lowercase fragments; no image anywhere. The
lens asks for a memorable visual close and an unmistakable finalist state.
**Line.** "Here's the whole story on one page — what you came in for, what we
tested, and the one you chose." / "Aquí está toda la historia en una página —
a qué viniste, qué probamos y el que elegiste."
**Proposed: CHANGE (bounded).** (a) A finalist hero band at the top — image,
name, tier, feel, the explicit finalist / recommended-starting-point state —
replacing the status *sentence* with a status *block* (the semantics and the
existing state strings unchanged). (b) Present the implication lines with
sentence capitalisation or as labelled chips — presentation of the approved
0.6 mapping, no wording change (any wording change is Blake's). Everything
below the hero: **KEEP.**

### 12. Handoff — Take-home preview (`14-take-home`)
**Seen.** "Don't lose your matches / Save your Lacks Furniture *Sleep Brief*",
the "What you'll save" checklist (Sleep Brief ✓, Saved mattress picks ✓ 1
saved, Sleep System picks ○ explore in store, Payment options ✓), the form
(name optional, email required, phone optional), "Save My Sleep Brief →",
"Preview mode: live email delivery isn't connected yet", the privacy line.
**North star.** Preserves the consultation story, finalist semantics, system
selections and next step honestly; preview mode is stated plainly.
**Line.** "Want to keep this? It saves your brief and your picks so any
specialist can pick up where we left off." / "¿Quieres guardarlo? Guarda tu
resumen y tus opciones para que cualquier especialista continúe donde lo
dejamos."
**Proposed: KEEP.** *Copy question for Blake (low):* the eyebrow "Don't lose
your matches" is loss-aversion phrasing — not deceptive, but the one line in
the journey that pressures rather than invites.

## Cross-cutting questions (decisions for Blake)

- **Q5 — Two chrome systems.** The dark Lacks/DreamFinder header (template
  heritage) appears only on Sleep Plan and Consultation Summary; Welcome,
  quiz, Brief, Results, Sleep System and take-home have no header. Visual
  continuity breaks at the commitment beat. Options: remove the dark header
  from Plan and Summary (Nocturne-consistent, cheapest), or adopt one slim
  identity treatment everywhere. Register item 3.6 ("Richer persistent
  identity bar", ❓) is adjacent; this proposal is to *normalise*, not to add.
  **Proposed: CHANGE — normalise (remove or unify), Blake's choice.**
- **Q6 — Heading focus ring.** Since 0.3, focus on the screen heading *is* the
  transition announcement, so it must stay visible. On Results, Sleep Plan,
  Sleep System, Summary and take-home it renders as a full-width black
  rectangle around the h1 that a customer reads as a glitch. **Proposed:
  CHANGE (a11y-preserving)** — keep a visible ring but make the heading
  `inline-block` (ring hugs the text) and/or use an offset ring in the brand
  ink; contrast re-checked by `tests/contrast_check.mjs`.
- **Q17 — Selections pill.** "1 Selections" (count + the static `header.picks`
  label). Low; a pluralised dictionary pair would fix it.
- **Reason content is the largest lever on the confidence and comparison
  beats**, and it is content (1.3), not presentation: no cohesion change can
  substitute for it.

## Proposed decision table (for Blake to confirm or overrule)

| Beat / surface | Proposed | Bounded change, if any | Owner note |
|---|---|---|---|
| Welcome | keep (+ optional experiment) | signature motif in the empty landscape quadrant | must not add content (2026-08-21 ruling) |
| Quiz | keep | focus return after tap (a11y, low) | device check |
| Review | keep | — | ruling: complete and editable |
| Sleep Brief | **experiment** (landscape) | rebalance the landscape composition | no content change |
| Results | **change** | landscape hero height cap or overlay; larger continuity mark (low) | reason content → 1.3 |
| Drawer | keep | price-band colour (low) | demo not exercised |
| Compare | keep | — | content → 1.3 |
| Sleep Plan | keep | — | chrome → Q5 |
| Sleep System | **change (defect)** | header clearance for the utility bar, both breakpoints, both languages | route via 1.4 workstream |
| Payment Choice | keep | — | — |
| Consultation Summary | **change** | finalist hero band + status block; implication lines capitalised/chips | no wording change without Blake |
| Take-home | keep | eyebrow copy question (low) | — |
| Cross-cutting Q5 | **change** | normalise the chrome | touches 3.6 ❓ |
| Cross-cutting Q6 | **change** | heading focus ring hugs text | focus must stay visible |

## What this pass did not do

No application file was edited. No test was changed. No status moved. The
in-app browser was not usable for exact-viewport work on this machine (the
Chrome window ignored resize requests), so composition evidence is headless;
motion, touch and reduced-motion judgement is deferred to pass 2 in the in-app
browser and to the mounted device.
