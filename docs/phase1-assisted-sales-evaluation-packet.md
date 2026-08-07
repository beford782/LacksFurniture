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

**Run this only after Codex has re-reviewed the corrected head.**

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
| Mode | **evaluation** (the frozen URLs below carry it) | — |
| Task | scripted in §3, one script per station | — |
| Serving | repo root over HTTP (`python -m http.server 8000`) | ______________________ |

**URL/state discipline:** use ONLY the frozen URLs below. Do not change
scenario, language, or mode mid-station, and do not use the reviewer-mode
pages during the dry run. **If the URL or state changes mid-station (a
reload with different parameters, a scenario/language switch, a stray
navigation), STOP, note it in the observation log, and restart that station
from its frozen URL.**

Evaluation mode strips the reviewer apparatus (scenario/language controls,
proposed-copy underlines and legends, simulation notes and footnotes) so
observation is not annotation-biased. It uses the same fixtures, the same
candidate code, and the identical product composition, order and
interaction; one small "Prototype — not production" notice remains.

## 2. Stations and frozen URLs

| Station | Candidate | Frozen URL (replace port if different) |
|---|---|---|
| S1 — Sleep Brief | `sleep-brief-recommended` | `http://localhost:8000/prototypes/phase1-decision-package/sleep-brief-recommended/?scenario=dense-c&lang=en&mode=evaluation` |
| S2 — Results | `results-tabs` (corrected) | `http://localhost:8000/prototypes/phase1-decision-package/results-tabs/?scenario=dense-c&lang=en&mode=evaluation` |

For the second-language pass, replace `lang=en` with `lang=es` in both URLs.
No other variant is part of this evaluation: the A/B Sleep Briefs and the
grouped accordion are exploration records (the accordion rejected), and they
have no evaluation mode — running them here would confound the comparison
with reviewer apparatus. The one open A-vs-B style question (does a
per-customer hero title cost operator recognition across sessions?) is asked
verbally in the §6 debrief instead of being staged.

## 3. Task scripts (read aloud; one per station)

> **S1 (Sleep Brief) — to the operator:** "A customer has just finished the
> quiz. Using this screen, walk them through what it says: open with their
> main sleep need, then tell them what you'll test together and how, and
> finish by telling them what happens next. Narrate as you would on the
> floor."
>
> **S2 (Results) — to the operator:** "You've just brought the customer to
> their matches. Show them their three tiers, tell them where to start and
> why, pick two mattresses to compare, and open the comparison. Narrate as
> you would on the floor."
>
> **Both stations — to the observer (customer role):** "Behave as a
> customer: watch the screen while the salesperson talks, answer naturally,
> and say out loud whenever you can't see, can't find, or don't understand
> something."

Second pass (where practical): repeat the same scripts in the other
language (`es` if the first pass was `en`) using the frozen `lang=es` URLs.

## 4. Observation log

Log every notable event as one row. Do not summarize while observing —
write the event first, interpret later.

| # | Station | Event observed | Immediate consequence | Likely cause | Confidence (high/med/low) |
|---|---|---|---|---|---|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |
| 4 | | | | | |
| 5 | | | | | |
| 6 | | | | | |
| 7 | | | | | |
| 8 | | | | | |

(Add rows as needed. An empty log after a completed session is itself a
finding — record "no notable events" explicitly rather than leaving blank.)

## 5. Structured capture checklist

Every question names its station. "n/a" cells are printed where the feature
is **absent from that station by design** — never record a result there.
"Not observed" is a valid answer for fillable cells.

### S1 — Sleep Brief (`sleep-brief-recommended`)

| # | Question | Result |
|---|---|---|
| S1.1 | Can **both** people state the customer's primary sleep need after the opening? | ______ |
| S1.2 | Are the badge **category labels** (POSITION / TEMPERATURE / SHARING / FEEL / SIZE) understandable without explanation? | ______ |
| S1.3 | Is **firmness** understood as a feel target ("Plush, 2 of 10") rather than a score or rating? | ______ |
| S1.4 | Is the always-visible **"Try this"** guidance noticed and usable in the operator's narration without prompting? | ______ |
| S1.5 | Does the **sticky action area** obscure or compete with the final priority card at any scroll position? | ______ |
| S1.6 | Does the primary CTA ("See My Matches →") communicate **what happens next**? | ______ |
| S1.7 | Can the operator narrate the recommendation **without hunting** (no visible searching/scrolling for the next talking point)? | ______ |
| S1.8 | Does either person **lose context during scrolling** (asks "where are we", re-orients, re-reads)? | ______ |
| S1.9 | Is the **device repositioned** (turned, tilted, handed over) to complete any step? How often? | ______ |
| S1.10 | Are there **repeated or missed taps** (a tap with no visible consequence, or the same control tapped twice)? | ______ |
| S1.11 | Compare understanding | n/a — the first-visit Sleep Brief has no Compare |
| S1.12 | Payment Choice distraction | n/a — Payment Choice is absent from the Sleep Brief |

### S2 — Results (`results-tabs`)

| # | Question | Result |
|---|---|---|
| S2.1 | Are **all three tiers** discoverable (does the pair notice Silver and Bronze exist)? | ______ |
| S2.2 | Is the **selected tier** always clear to the customer? | ______ |
| S2.3 | Can the operator distinguish the **lead recommendation from the supporting choices** at a glance? | ______ |
| S2.4 | Can the operator find **Details, Save and Compare** without hunting? | ______ |
| S2.5 | Does Compare's **enabled state** make sense (disabled until two are selected; the hint explains)? | ______ |
| S2.6 | Does opening Compare create an **obvious consequence** (the view moves to the comparison; nothing feels inert)? | ______ |
| S2.7 | Does **Payment Choice** interrupt or distract from the sleep-fit conversation at any point? | ______ |
| S2.8 | Is the **absence of a product-description blurb** on the lead card noticed? Does its absence harm the narration? | ______ |
| S2.9 | Can both people state which mattress is "the one to start with" and why (fit rows), without invented product claims? | ______ |
| S2.10 | Does either person lose context during scrolling? | ______ |
| S2.11 | Is the device repositioned to complete any step? How often? | ______ |
| S2.12 | Are there repeated or missed taps? | ______ |
| S2.13 | "Try this" guidance noticeability | n/a — the testing guidance lives on the Sleep Brief, not Results |

### Second-language pass (both stations)

| # | Question | S1 result | S2 result |
|---|---|---|---|
| L.1 | Is the state **consistent** between English and Spanish — same layout, same data, nothing appearing in English that appeared in Spanish's place (the Size value, e.g. "Queen", is a known production EN-only exception)? | ______ | ______ |
| L.2 | Does any Spanish wording make the operator or customer hesitate (candidate ES copy is drafted, not native-reviewed)? | ______ | ______ |

## 6. Debrief questions (ask verbally after both passes; record answers)

- Operator: would a per-customer hero title ("Comfortable elevation" instead
  of a fixed "Your Sleep Brief") cost you recognition or a repeatable
  opening across many customers? **Record as SPECULATION about an unseen
  alternative — the fixed-heading variant is not staged in this session
  (§2), so this answer is opinion, not observation.**
  ______________________________________
- Operator: on Results, did you miss having a product blurb on the lead
  card, and what would you have said in its place? ____________________
- Both: what almost broke the conversation, even if it recovered? ______

## 7. Session verdicts (Blake fills after both passes)

- Sleep Brief direction (need-led hero, visible testing guidance): confirm /
  revise / reject — with the observation rows that drove the call:
  ______________________________________________________________________
- Results direction (tier tabs, lead/support hierarchy, Compare
  consequence): confirm / revise / reject — with the observation rows that
  drove the call:
  ______________________________________________________________________
- Anything that must change **before** Phase 1 implementation authorization:
  ______________________________________________________________________
- Anything to re-test on the real showroom device once Phase 0.4 closes:
  ______________________________________________________________________

## 8. What this dry run cannot establish

Even fully completed, this session does not establish: mounted-showroom-
device behavior (Phase 0.4 remains ⏳), real assistive-technology behavior
on hardware, representative-customer comprehension (the customer role is
played by an internal observer), Spanish copy approval (requires a native
Spanish reviewer), catalog copy approval (the claim-risk inventory awaits
its owner), the fixed-heading-vs-need-led-hero comparison (the fixed-
heading variant is not staged; the §6 debrief answer is speculation), or
production readiness. Do not cite this packet for any of those.
