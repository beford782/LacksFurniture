# Phase 1 assisted-sales evaluation packet — expert-assisted dry run

**STATUS: NOT RUN.** Every result field in this packet is empty. Nothing in
this document is evidence until Blake (or a delegate) has actually run the
session described here and filled the fields in. Agent reviews, automated
checks and screenshots are **not** salesperson/customer observation and must
never be transcribed into these fields.

This is an **expert-assisted dry run**, not customer research: the
customer-role participant is an internal observer playing a customer, not a
representative customer recruited under a research protocol. Findings from
this dry run inform Blake's Phase 1 direction decisions; they do not
substitute for Phase 0.4 device evidence or for any later real-customer
validation.

---

## 1. Fixed session parameters (freeze before starting; do not vary mid-run)

| Parameter | Value to freeze | Filled in at run time |
|---|---|---|
| Date / time | — | ______________________ |
| Operator (salesperson role) | one person, plays the salesperson throughout | ______________________ |
| Observer (customer role) | one person, plays the customer throughout | ______________________ |
| Device | the **same physical device** for every station and pass | ______________________ |
| Orientation / mount | fixed for the whole session; note if hand-held | ______________________ |
| Fixture scenario | `dense-c` for all stations (same data everywhere) | ______________________ |
| Language | one language for the whole first pass (`en` or `es`) | ______________________ |
| Task | scripted in §3, identical at every station | — |
| Serving | repo root over HTTP (`python -m http.server 8000`) | ______________________ |

If any parameter changes mid-session (device swap, orientation change,
scenario change), stop, note it, and restart the affected station. Mixed
parameters make the comparison unusable.

## 2. Stations

Compare only the serious candidates. Run the stations in the order below on
the first pass; **reverse the station-internal variant order on the second
pass** where a contrast variant is included, so order effects are visible.

| Station | Primary candidate | Optional contrast (only if the question below still feels open) |
|---|---|---|
| S1 — Sleep Brief | `sleep-brief-recommended/` (A-derived) | `sleep-brief-b/` — only for the open question "does a per-customer hero title cost the operator recognition/repeatability across sessions?" |
| S2 — Results | `results-tabs/` (corrected) | none planned — the grouped accordion is rejected exploration and is not part of this evaluation |

URLs (replace port if different):

```
http://localhost:8000/prototypes/phase1-decision-package/sleep-brief-recommended/?scenario=dense-c&lang=en
http://localhost:8000/prototypes/phase1-decision-package/sleep-brief-b/?scenario=dense-c&lang=en
http://localhost:8000/prototypes/phase1-decision-package/results-tabs/?scenario=dense-c&lang=en
```

## 3. Task script (read aloud; identical at every station)

> **To the operator:** "A customer has just finished the quiz. Using this
> screen, walk them through what it says: open with their main sleep need,
> tell them what you'll test together and how, then take them to their
> matches. On the Results screen, show them their three tiers, pick two
> mattresses to compare, and open the comparison. Narrate as you would on
> the floor."
>
> **To the observer (customer role):** "Behave as a customer: watch the
> screen while the salesperson talks, answer naturally, and say out loud
> whenever you can't see, can't find, or don't understand something."

Second pass (where practical): repeat the same script in the other language
(`es` if the first pass was `en`), and reverse the variant order inside S1
if the contrast variant is being used.

## 4. Observation log

Log every notable event as one row. Do not summarize while observing —
write the event first, interpret later. Preference codes: `C` = primary
candidate, `A` = contrast/alternative variant, `T` = tie, `U` = unknown /
not comparative.

| # | Station / variant | Event observed | Immediate consequence | Likely cause | Confidence (high/med/low) | Preference (C/A/T/U) |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |
| 4 | | | | | | |
| 5 | | | | | | |
| 6 | | | | | | |
| 7 | | | | | | |
| 8 | | | | | | |

(Add rows as needed. An empty log after a completed session is itself a
finding — record "no notable events" explicitly rather than leaving blank.)

## 5. Structured capture checklist (fill every field; "not observed" is a valid answer)

| # | Question | S1 result | S2 result |
|---|---|---|---|
| 1 | Can **both** people state the customer's primary sleep need after the opening? | ______ | ______ |
| 2 | Can the operator narrate the recommendation **without hunting** (no visible searching/scrolling to find the next talking point)? | ______ | ______ |
| 3 | Can the customer see **which state or tier is active** at all times? | ______ | ______ |
| 4 | Is the actionable testing guidance ("Try this") **noticed** — referenced or acted on by either person without prompting? | ______ | ______ |
| 5 | Does either person **lose context during scrolling** (asks "where are we", re-orients, re-reads)? | ______ | ______ |
| 6 | Is the **device repositioned** (turned, tilted, handed over) to complete any step? How often? | ______ | ______ |
| 7 | Are there **repeated or missed taps** (a tap with no visible consequence, or the same control tapped twice)? | ______ | ______ |
| 8 | Does the operator/customer pair **understand Compare** — what is selected, when it becomes available, what opening it shows? | ______ | n/a for S1 first-visit state — record here only if the returning-session demo state was shown: ______ |
| 9 | Does **Payment Choice** content distract from sleep fit at any point? | ______ | ______ |
| 10 | On the second-language pass: is the **state consistent** between English and Spanish (same layout, same data, nothing falling back to English)? | ______ | ______ |

## 6. Session verdicts (Blake fills after both passes)

- Sleep Brief direction (need-led hero, visible testing guidance): confirm /
  revise / reject — with the observation rows that drove the call:
  ______________________________________________________________________
- Results direction (tier tabs, corrected cards, Compare consequence):
  confirm / revise / reject — with the observation rows that drove the call:
  ______________________________________________________________________
- Anything that must change **before** Phase 1 implementation authorization:
  ______________________________________________________________________
- Anything to re-test on the real showroom device once Phase 0.4 closes:
  ______________________________________________________________________

## 7. What this dry run cannot establish

Even fully completed, this session does not establish: mounted-showroom-
device behavior (Phase 0.4 remains ⏳), real assistive-technology behavior
on hardware, representative-customer comprehension (the customer role is
played by an internal observer), Spanish copy approval (requires a native
Spanish reviewer), or production readiness. Do not cite this packet for any
of those.
