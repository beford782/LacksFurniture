# Nocturne — demo-impact prototype (2026-08-13)

**Status: PROTOTYPE ONLY — awaiting owner visual review.** Isolated under
`prototypes/`; no production behavior, scoring, canonical data, claims, or
deployment is changed. No production PR exists for this work.

## Run it

Serve the **repo root** (the prototype loads the real shipped data and
engine), then open the prototype:

```
python -m http.server 8000
# → http://localhost:8000/prototypes/demo-round-2026-08-13/
```

## 100% functional — how

- Questions come from the shipped `data/quiz.json` (all 10, skip logic,
  option rules, both languages).
- The catalog comes from the shipped `data/mattresses.json` with the
  approved product photography.
- `calculateScores()`, `qualifyRankedChoices()` and `showProfileScreen()`
  are **extracted verbatim from `index.html` at runtime** (the repo's own
  test-harness technique), so every score, tier, ordering, top pick,
  profile and priority is the production engine's output for the answers
  given. Different answers → genuinely different results.
- The EN/ES toggle re-renders everything and re-runs the engine in the
  active language.
- "Rehearsal: fill sample answers" on the welcome screen fills a plausible
  answer set for practicing the demo — results still come from the real
  engine.

## The visual direction (one direction, as ruled)

**Nocturne** — the shipped navy/brass identity taken to a cinematic,
imagery-forward register. Typeface pairing is iPad-native: Didot display,
Avenir Next body, Avenir Next Condensed utility. Product photography sits
on white gallery plates over warm linen cards against the night field.

**The signature element — the Sleep Signature constellation.** Ten stars,
one per question, light along a horizon arc as the customer answers. At
the reveal they connect into a constellation *derived from the actual
answers* — different answers draw a different signature — which then
stamps the results header and the consultation card. Personalization made
visible in one image.

## The 3–5 minute store-owner script

1. **(30s) Welcome.** "This is DreamFinder — your fitting room for sleep.
   It runs on the floor, guided by your salesperson." Point at the EN|ES
   toggle: "Fully bilingual, one tap."
2. **(60–90s) The fitting.** Hand them the tablet. "Ten questions, about
   two minutes." Let them answer 3–4 for real — point at the horizon arc
   lighting star by star. (Rehearsal fill exists if time is short.)
3. **(30s) The reveal.** The constellation draws. "That's their sleep
   signature — made from their answers, nobody else's. And these three
   chips are what your salesperson tests with them on every bed."
4. **(45s) The shortlist.** "Three tiers, best match first, real match
   percentages. Notice it's your inventory, your photography — this is
   the same engine that scores all 26 beds in the line." Flip a tier tab.
5. **(30s) Compare.** Tap two beds, hit Compare. "Side by side, and it
   says out loud when two beds are the same on a dimension — that's what
   stops the customer bouncing between five beds forever."
6. **(30s) The close.** Hand off. "Everything the customer decided lands
   on one consultation card for your salesperson: the finalist, the
   profile, what to test. The tool doesn't replace your closer — it hands
   them the close."

## What changed, and why it reads as more valuable

- **Imagery first.** The current welcome and journey are text-forward;
  the owner's own mounted-device verdict was "so textual… no pictures or
  graphics to intrigue." Nocturne leads every moment with product
  photography or the constellation — something to look at before
  something to read.
- **Personalization you can see.** The engine was always personal; now
  the constellation, the profile chip, the match rings and the priority
  chips make it *visibly* personal in seconds — the thing a store owner
  must believe to buy in.
- **A demo has moments.** Reveal, compare, and handoff are staged as
  beats a presenter can narrate, instead of screens to scroll.

## Deliberately unchanged

- **Recommendations** — the real engine, extracted verbatim; no re-ranking,
  no new inputs. Sleep-first direction preserved; financing appears
  nowhere in the prototype (secondary by design).
- **Copy discipline** — product cards show identity, firmness/feel, match
  %, and engine-computed priorities only. No construction or performance
  claims; the retired claim classes do not reappear.
- **Bilingual contract** — every string is an EN/ES pair; the toggle is
  live everywhere.
- Store name appears via a demo config constant; production reads
  `store-config.json` (white-label rule respected).

## Production-impact estimate (what could later ship as small slices)

| Prototype element | Ships as | Size | Gates |
|---|---|---|---|
| Welcome restyle (masthead, night field, single CTA) | 1.6 Welcome slice, config-driven copy | S | device pass |
| Quiz question restyle + horizon-arc progress | 1.2 presentation (no structure change) | M | device pass |
| Reveal constellation + profile/priority staging | 1.1 Proceeds (hero gate untouched — the heading stays until Blake approves a layout) | M | 1.1 approval for any composition change |
| Results: photo-forward cards, match ring, restyled tier tabs | 1.3 Proceeds ("restyling the current tier tabs" is explicitly allowed) | M–L | device pass |
| Compare: photo stage above the aligned rows | 1.6 Compare coherence | S–M | device pass |
| Consultation card restyle | 1.6 Consultation Summary direction | M | 1.6 owns 0.5's presentation re-decision |
| Sleep Signature constellation as a persistent brand element | cross-screen; new config-driven SVG component | M | owner direction |

Each slice would go through the canonical PR workflow with the Phase 1
output-regression gate proving recommendations unchanged.
