# Item 3.7 — accessory-recommendation quality: offline audit (2026-08-30)

**Status:** read-only offline analysis, roadmap item 3.7 steps 1–3 (scenario
audit, relevance judgement, enumerated output-change list). **Scheduled by
Blake 2026-08-30; started after PR #76 merged (`3dac218`).** The engine, the
fixtures, the catalog and every rendered output are untouched; this document
was analysis for Blake; **step 4 was ruled on 2026-08-30** (see "Owner
decisions" below) — nothing in it is implemented by this document, and 3.7
stays ◐. Mattress-fit scoring is out of scope under any outcome.

**Tree audited:** `main` at `3dac218` — `index.html` SHA-256
`5135d9560a3128083a4f9765518eb2e93d93fd313f4abc7d0241c17ebd10ddf5`,
`data/accessories.json` (10 items), `data/quiz.json` (10 questions),
`tests/fixtures/phase1_output_baseline_daybreak_pr1.json`
(`baselineCommit: daybreak-pr1@31a7e79`).

**Owner decisions — Blake Ford, 2026-08-30 (step 4 ruling on §4).**
- **Approved for implementation: P1, P2, P3 only**, as separate bounded PRs
  **in the order P2 → P3 → P1.** P2 is renderer / presentation logic and must
  not move the recommendation baseline. P3 updates only the affected fixture
  scenarios and must prove the drawer prompt and the Sleep System hero agree.
  P1 adds a focused heat-only scenario rather than re-pinning unrelated
  fixtures (no existing baseline scenario exercises the difference). Each PR
  enumerates before / after outputs, preserves mattress scoring, and contains
  no unrelated recommendation change. Merge authorization is per PR.
- **P4 deferred** to a second approval tranche after P1–P3 are verified.
- **P5: prototype option C only** — keep the adjustability education / demo
  for no-trigger customers, remove the unjustified product hero from the
  default presentation. Not implemented until Blake reviews the prototype.
- **P6 not approved as a fit decision.** Recorded: the current premium-first
  base ladder is merchandising, not customer-derived relevance.
- **P7 not approved. P8 deferred. P10 recorded only.**
- **P9:** a factual catalog / copy decision packet — confirm whether the named
  low-profile, adjustable-fill and support alternatives are genuinely in the
  Lacks assortment; if not, propose copy naming only products / categories
  actually present. No invented inventory.
- This document lands on its own docs-only PR before any engine / output
  change; nothing else in 3.7 moves (3.7 stays ◐).

**Reproduce.** The harness and its structured output are committed beside this
document: `docs/accessory-recommendation-audit-2026-08-30/audit_accessories.mjs`
and `audit_results.json` (every scenario's answers, engine inputs, full ordered
list with scores / `matched` / reasons / triggers, per-step groups and heroes,
demo position, protection goal, drawer-prompt pillow, fixture agreement and
language-parity flags). From the repository root:
`node docs/accessory-recommendation-audit-2026-08-30/audit_accessories.mjs . <out.json>`
— on the audited tree the output is identical to the committed JSON. Copies are
also preserved outside the repository under
`Documents\DreamFinder-manual-gates\accessory-audit-2026-08-30\`.

**Method.** The harness (`audit_accessories.mjs`) extracts the
real engine functions verbatim from `index.html` — the same regex-extraction
pattern `tests/phase1_output_regression_check.mjs` uses — and executes them in
memory against the shipped catalog: `scoreAccessoriesFromAnswers`,
`qualifyRankedChoices`, `sleepSystemStepForItem`, `readSleepSystemGroups`,
`getSleepSystemViewModel`, `resolveFinalistState`, `getSleepSystemFinalist`,
`getSuggestedProtectionGoal`, `protectorSupportsGoal`, `protectionGoalLabel`,
`protectionGoalReason`, `getAdjustabilityDemo`. The hero (primary card)
selection lives inside the DOM-bound `renderSleepSystemMain()`, so its
ordering rules for the *default* screen state and its badge / reason rules are
transcribed in the harness (quoted in §1.3) rather than extracted; the drawer's
finalist pillow prompt rule (`showFinalistSleepSystemPrompt`) is transcribed
the same way. Every scenario was run in EN and ES.

**Controls that passed.** All 10 Phase 1 regression scenarios reproduce the
pinned fixture exactly (ordered list and step groups, 10/10); EN and ES
produce identical ids, scores, `matched` flags, groups and reason counts
(29/29); an independent re-derivation of "which answer fired each item's
score" from the catalog's `matchScores` keys agrees with the engine's reason
count on every item of every scenario.

**Not audited here:** the rendered Sleep System screen and steps 2–4 in a
browser, the analytics projection (nothing sends — `gasUrl` blank), the email
body (inactive), the wording quality of the Spanish reason strings (native
review deferred), and any real-customer distribution of answers.

---

## 1. The engine as it ships (facts, from the extracted source)

### 1.1 Inputs and scoring (`scoreAccessoriesFromAnswers`)

The scorer reads five answer fields and nothing else: `sleep_position`,
`temperature`, `sleep_issues`, `health_conditions`, `budget`. Every item
starts at `matchScores.default` (0 if absent) and adds, with one reason line
each:

| Answer condition | Score key added | Reason line (EN) |
|---|---|---|
| `sleep_position` = P | `position_P` | Matched to your side sleeping position / Optimized for back sleepers / Designed for stomach sleepers |
| `temperature` = `hot` | `cooling` **and** `hot` (both, if present) | You reported sleeping hot (one reason for both keys) |
| `sleep_issues` ∋ `back_pain` | `back_pain` | Targets the back pain you mentioned |
| `health_conditions` ∋ `snoring` | `snoring` | Helps with the snoring you reported |
| `health_conditions` ∋ `reflux` | `reflux` | You mentioned nighttime reflux |
| `health_conditions` ∋ `allergies` | `allergies` | Protects against the allergies you noted |
| `budget` = `premium` | `premium` | Matches your comfort preferences |

`matched` is true only if at least one answer-specific reason fired; an
unmatched item gets the neutral line "A solid option to round out your sleep
system". The list is sorted by score descending (stable — ties keep catalog
order).

**Signals the scorer does not read:** `sleep_issues` values `hot`, `hip_pain`,
`tossing`, `stiff`, `sagging`, `too_soft`; `health_conditions` values
`nerve_pain`, `extra_support`, `getting_older`; `temperature` values `cold`,
`opposite`; `partner_sleep`, `partner_disturbance`, `body_type`, `firmness`,
`mattress_size`, `trigger`. **`budget` is not a question in the shipped quiz**
(ids: trigger, mattress_size, partner_sleep, partner_disturbance,
sleep_position, body_type, temperature, firmness, sleep_issues,
health_conditions), so the `premium` branch is unreachable in the app.

### 1.2 Grouping and qualification (`readSleepSystemGroups`, `qualifyRankedChoices`)

Items are grouped by step — adjustability (subType `adjustable`), support
(other Foundations & Support), pillow, protection. Within a group, an item
qualifies if its score ≥ 60 % of the group's maximum score (`maxScore` is at
least 1), capped at 3; if fewer than 2 qualify, the list is back-filled from
the top of the group's order to 2. `meetsMatchThreshold` is stamped by the same
60 % rule — it is **relative to the group's best item, not to whether any
answer fired**. Support is then re-sorted foundation → low_profile → bunkie.

### 1.3 Hero, badge, reason, entry step, demo, protection goal (transcribed)

- **Hero** = the group's first item after the step's own re-sort. In the
  default state the only re-sort is protection: items supporting the current
  goal first (stable). Alternatives = the next two.
- **Badge:** support → "Support option"; protection → "Best for {goal}";
  adjustability and pillow → `meetsMatchThreshold` ? "Recommended to try" :
  "Worth comparing".
- **Reason line:** protection → the goal's reason; otherwise
  `primary.reasons[0]` (which is the neutral line when nothing fired).
- **Entry step** = `adjustability` for every customer arriving from Results
  ("Build Your Sleep System") or the Summary ("Edit Sleep System"); the drawer's
  finalist prompt enters at `pillow`.
- **Demo position** (`getAdjustabilityDemo`): back_pain → Zero Gravity; else
  reflux → Zero Gravity; else snoring → Anti-Snore; else Flat ("Start here to
  feel the mattress without elevation").
- **Protection goal** (`getSuggestedProtectionGoal`): allergies → allergens;
  else `temperature` = hot → cooling; else everyday. Spills is never suggested.
- **Drawer finalist prompt** (`showFinalistSleepSystemPrompt`): the first
  *Pillows* item in the overall scored order with `matched` = true; no matched
  pillow → no prompt.

### 1.4 The catalog the engine ranks (`data/accessories.json`)

| id | Name | Step | Price | matchTags | matchScores |
|---|---|---|---|---|---|
| base-bt2000 | BedTech BT2000 Adjustable Base | adjustability | 899 | snoring, reflux, back_pain | back_pain 3 · snoring 3 · reflux 3 · premium 1 |
| base-bt3000 | BedTech BT3000 Massage Base | adjustability | 1,099 | snoring, reflux, back_pain | back_pain 4 · snoring 3 · reflux 3 · premium 2 |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | adjustability | 1,599 | snoring, reflux, back_pain | back_pain 4 · snoring 4 · reflux 4 · premium 3 |
| foundation-princess | Chattam & Wells Standard Foundation | support | 499 | all | default 2 |
| pillow-flow | Bedgear Flow 2.0 Performance Pillow | pillow | 108 | cooling, hot_sleeper, all, all_positions | cooling 3 · hot 3 · position_side 1 · position_back 1 |
| pillow-gel-memory | Gel Memory Foam Cool Pillow | pillow | 99 | cooling, hot_sleeper, all, all_positions | **default 2** · cooling 2 · hot 2 · position_side 1 |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | protection | 149 | all, allergies, spills, everyday | default 1 · hot 1 · allergies 1 |
| protector-iprotect | Bedgear iProtect Mattress Protector | protection | 89 | all, allergies, spills, everyday | default 1 · allergies 2 |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | protection | 249 | cooling, hot_sleeper, spills, everyday | default 1 · cooling 3 · hot 3 |
| protector-tempur | TEMPUR-Protect Mattress Protector | protection | 189 | all, allergies, spills, everyday | default 1 · premium 2 · allergies 1 |

Observations on the data itself: the three adjustable bases carry identical
tags and a fixed weight ladder (Ergo ≥ BT3000 ≥ BT2000 on every key); the
`cooling` and `hot` keys are both added for the single answer `temperature =
hot`, so a hot sleeper adds +6 to Flow and Ver-Tex and +4 to the gel pillow;
the gel pillow is the only pillow with a `default`; there is one support item
(no low-profile or bunkie, although the support step offers a "lower height"
choice that sorts `low_profile` first); no pillow carries `position_stomach`;
Dri-Tec scores `hot` but is not tagged `cooling`/`hot_sleeper`, so it earns
cooling points yet never "supports" the cooling goal.

---

## 2. Step 1 — scenario audit (29 scenarios: 10 fixture + 18 representative + 1 probe)

Legend: **T/f** = `meetsMatchThreshold`; `*` = `matched` (an answer fired);
"neutral" = "A solid option to round out your sleep system"; **≠** = the
drawer's finalist pillow prompt names a different pillow than the Sleep
System's pillow hero. Inputs list only the five fields the scorer reads
(`budget` is empty in every real scenario).

| Scenario | position · temperature · issues · health | Adjustability hero [badge] — reason (group) | Pillow hero [badge] — reason (group) | Drawer prompt pillow | Protection goal → hero (group) | Demo position |
|---|---|---|---|---|---|---|
| s1 solo back firm no issues | back · comfortable · none · none | BT2000 [Worth comparing] — neutral (BT2000 0f, BT3000 0f) | Gel [Recommended to try] — neutral (Gel 2T, Flow 1f*) | Flow — "Optimized for back sleepers" **≠** | everyday → Dri-Tec (Dri-Tec 1T, iProtect 1T, Ver-Tex 1T) | Flat |
| s2 partner side hot back-pain snoring | side · hot · back_pain, hot · snoring | Ergo [Rec.] — back pain (Ergo 8T*, BT3000 7T*, BT2000 6T*) | Flow [Rec.] — side (Flow 7T*, Gel 7T*) | Flow — same | cooling → Ver-Tex (Ver-Tex 7T*, Dri-Tec 2f*) | Zero Gravity |
| s3 family combo cold plush reflux | combo · cold · hip_pain, sagging · reflux | Ergo [Rec.] — reflux (4T*, 3T*, 3T*) | Gel [Rec.] — neutral (Gel 2T, Flow 0f) | none | everyday → Dri-Tec (1T, 1T, 1T) | Zero Gravity |
| s4 partner stomach cold firm sagging | stomach · cold · sagging · — | BT2000 [Worth comparing] — neutral (0f, 0f) | Gel [Rec.] — neutral (2T, 0f) | none | everyday → Dri-Tec | Flat |
| s5 motion-dominant tossing | back · comfortable · tossing · none | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 1f*) | Flow — back **≠** | everyday → Dri-Tec | Flat |
| s6 solo side pressure relief | side · comfortable · hip_pain, stiff · nerve_pain, extra_support | BT2000 [Worth comparing] — neutral | Gel [Rec.] — side (Gel 3T*, Flow 1f*) | Gel — same | everyday → Dri-Tec | Flat |
| s7 partner combo opposite allergies | combo · opposite · too_soft · allergies | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 0f) | none | allergens → iProtect (iProtect 3T*, Dri-Tec 2T*, TEMPUR 2T*) | Flat |
| s8 no-idea hot aging | no_idea · hot · hot, tossing · getting_older | BT2000 [Worth comparing] — neutral | Flow [Rec.] — hot (Flow 6T*, Gel 6T*) | Flow — same | cooling → Ver-Tex (7T*, Dri-Tec 2f*) | Flat |
| s9 empty defaults | — · — · — · — | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 0f) | none | everyday → Dri-Tec | Flat |
| s10 solo goldilocks medium | side · comfortable · none · none | BT2000 [Worth comparing] — neutral | Gel [Rec.] — side (3T*, 1f*) | Gel — same | everyday → Dri-Tec | Flat |
| r01 solo side no issues | side · comfortable · none · none | as s10 | as s10 | Gel — same | everyday → Dri-Tec | Flat |
| r02 solo back no issues | back · comfortable · none · none | as s1 | as s1 | Flow — back **≠** | everyday → Dri-Tec | Flat |
| r03 solo stomach no issues | stomach · comfortable · none · none | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 0f) | none | everyday → Dri-Tec | Flat |
| r04 partner side snoring only | side · comfortable · none · snoring | Ergo [Rec.] — snoring (Ergo 4T*, BT2000 3T*, BT3000 3T*) | Gel [Rec.] — side (3T*, 1f*) | Gel — same | everyday → Dri-Tec | Anti-Snore |
| r05 partner back reflux only | back · comfortable · none · reflux | Ergo [Rec.] — reflux (4T*, 3T*, 3T*) | Gel [Rec.] — neutral (2T, 1f*) | Flow — back **≠** | everyday → Dri-Tec | Zero Gravity |
| r06 solo side back-pain only | side · comfortable · back_pain · none | BT3000 [Rec.] — back pain (BT3000 4T*, Ergo 4T*, BT2000 3T*) | Gel [Rec.] — side | Gel — same | everyday → Dri-Tec | Zero Gravity |
| r07 allergies only, back | back · comfortable · none · allergies | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 1f*) | Flow — back **≠** | allergens → iProtect (3T*, 2T*, 2T*) | Flat |
| r08 hot via sleep_issues only | side · comfortable · **hot** · none | BT2000 [Worth comparing] — neutral | Gel [Rec.] — side (3T*, 1f*) — **no cooling reason** | Gel — same | **everyday** → Dri-Tec | Flat |
| r09 hot via temperature only | side · **hot** · none · none | BT2000 [Worth comparing] — neutral | Flow [Rec.] — side (7T*, 7T*) | Flow — same | cooling → Ver-Tex (7T*, 2f*) | Flat |
| r10 cold sleeper, back | back · cold · none · none | as s1 | as s1 | Flow — back **≠** | everyday → Dri-Tec | Flat |
| r11 combo hot | combo · hot · none · none | BT2000 [Worth comparing] — neutral | Flow [Rec.] — hot (6T*, 6T*) | Flow — same | cooling → Ver-Tex | Flat |
| r12 no-idea position | no_idea · comfortable · none · none | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 0f) | none | everyday → Dri-Tec | Flat |
| r13 stomach snoring hot | stomach · hot · none · snoring | Ergo [Rec.] — snoring (4T*, 3T*, 3T*) | Flow [Rec.] — hot (6T*, 6T*) | Flow — same | cooling → Ver-Tex | Anti-Snore |
| r14 everything flagged | side · hot · back_pain, hot · snoring, reflux, allergies | Ergo [Rec.] — back pain (12T*, 10T*, 9T*) | Flow [Rec.] — side (7T*, 7T*) | Flow — same | **allergens → Dri-Tec** [Best for allergens] (group Ver-Tex 7T*, Dri-Tec 3f*; goal re-sort puts Dri-Tec first; **iProtect not surfaced**) | Zero Gravity |
| r15 getting-older extra-support | back · comfortable · stiff · getting_older, extra_support | BT2000 [Worth comparing] — neutral | Gel [Rec.] — neutral (2T, 1f*) | Flow — back **≠** | everyday → Dri-Tec | Flat |
| r16 hip pain, side | side · comfortable · hip_pain · none | as s10 | as s10 | Gel — same | everyday → Dri-Tec | Flat |
| r17 nerve pain, side | side · comfortable · none · nerve_pain | as s10 | as s10 | Gel — same | everyday → Dri-Tec | Flat |
| r18 partner opposite temperature | side · opposite · none · none | as s10 | as s10 | Gel — same | everyday → Dri-Tec | Flat |
| x01 PROBE `budget=premium` (unreachable) | side · comfortable · none · none · budget premium | Ergo [Rec.] — "Matches your comfort preferences" (Ergo 3T*, BT3000 2T*) | Gel [Rec.] — side | Gel — same | everyday → **TEMPUR-Protect** (3T*, Dri-Tec 1f) | Flat |

Support step, every scenario: the single foundation is the hero, "Support
option", neutral reason — there is nothing to rank.

---

## 3. Step 2 — relevance judgement (reasoning, not a score)

**A. Adjustability with no trigger (19 of 29 scenarios — every customer without
back pain, snoring or reflux).** All three bases score 0. The 60 % rule
qualifies nothing, so the min-2 back-fill surfaces the first two bases *in
catalog order*: BT2000 as hero with "Worth comparing" and the neutral line,
BT3000 as the alternative, TEMPUR-Ergo absent. Because adjustability is also
the entry step, **the first product every such customer sees in the Sleep
System is an $899 adjustable base with no basis in their answers**. The step
copy frames it as a demo ("A showroom demo is the best test"), the badge is
honest ("Worth comparing", not "Recommended"), and declining is one touch — so
this does not breach the 1.4 rule against unsupported "better matched" claims.
But it is the textbook shape of the generic upsell the north star rules out:
the item does not follow from the customer's answers, and nothing on the card
says so. Judgement: **not answer-driven; presentation honest; placement (first
beat, hero card) not earned.**

**B. Adjustability with a trigger (10 scenarios).** The trigger is genuine and
the reason line is true. The *ordering* among the three bases, however, is not
an answer distinction: all three carry the same tags, and the weights form a
fixed ladder, so snoring-only or reflux-only customers get the $1,599 Ergo as
hero (4 vs 3 vs 3), back-pain-only customers get the $1,099 BT3000 (4 = 4,
tie broken by catalog order over the Ergo), and any combination promotes the
Ergo. The reason line shown on the hero is equally true of the two
alternatives. Judgement: **the surfacing is relevant; the ranking is a
merchandising weight, not fit.** That is acceptable if Blake intends it — but
copy must keep saying "suggested because you mentioned…", never "the best
match", which the 1.4 rule already requires.

**C. Pillow (two products).** Three problems, all traceable to the gel
pillow's `default: 2` and to the badge reading the relative threshold instead
of `matched`:

1. For every non-hot back, stomach, combo or no-idea sleeper (12 scenarios),
   the gel pillow is the hero **badged "Recommended to try" with the neutral
   line** — the badge asserts an answer basis that does not exist. The
   `meetsMatchThreshold` stamp is relative to the group max, and the gel
   pillow *is* the group max on its default score alone.
2. **For every non-hot back sleeper (7 scenarios: s1, s5, r02, r05, r07, r10,
   r15) the drawer's finalist prompt and the Sleep System disagree.** The
   prompt names the Flow ("Try this pillow: Bedgear Flow 2.0 — Optimized for
   back sleepers", the only *matched* pillow), then opens the Sleep System at
   the pillow step whose hero is the **gel pillow** ("Recommended to try — A
   solid option…") with the Flow demoted to "Also compare". A customer who
   taps "View Sleep System" lands on a different pillow than the one they were
   just told to try. This is the one finding in the audit that is a
   customer-visible contradiction rather than a weak justification.
3. Stomach sleepers never get a position-matched pillow (no `position_stomach`
   on either product), and the pillow guidance refers to "the low-profile
   option" and "the adjustable-fill option" — products the catalog does not
   contain.

Where it works: side sleepers (gel wins on default + position, reason
"Matched to your side sleeping position" — true), and hot sleepers (Flow wins
the 7–7 tie by catalog order with a true cooling/position reason).

**D. Protection.** Allergies alone → iProtect (allergies 2) hero, "Best for
allergens": correct. Hot alone → Ver-Tex hero, "Best for cooling": correct.
Everyday → Dri-Tec by catalog order among four equal-score protectors;
TEMPUR-Protect never surfaces (cap 3): arbitrary but harmless. **Hot +
allergies (r14) is wrong in shape:** the group qualifies on the overall score,
which cooling dominates (Ver-Tex 7; everything else ≤ 3), so the group is
[Ver-Tex, Dri-Tec]; the allergens goal then re-sorts Dri-Tec (allergies 1,
below threshold) to hero "Best for allergens" — while iProtect, the catalog's
strongest allergy protector, is not surfaced at all and Ver-Tex, the strongest
item for the customer's *other* stated need, is demoted. The goal chooser
(allergies before hot) is a defensible priority; the qualification step does
not honour it.

**E. Signals the engine ignores.**
- `sleep_issues` ∋ `hot` (r08): the customer said heat is a problem, the
  scorer only reads `temperature`, so no cooling pillow, no cooling protector,
  everyday goal. The quiz offers both ways of saying it; the engine honours
  one. **Relevant recommendation missing.**
- `extra_support` / `getting_older` (r15, s8): no accessory mapping. An
  adjustable base is a common floor argument for ease of getting in and out
  of bed — but that is a claim the catalog data does not carry and the
  evidence rules do not yet support; listed as a question, not a proposal.
- `hip_pain`, `stiff`, `tossing`, `sagging`, `too_soft`, `nerve_pain`, `cold`,
  `opposite`, partner/family: no mapping and nothing in the catalog that would
  honestly answer them. No missing recommendation.

**F. Dormant code.** The `budget = premium` branch and the `premium` weights on
five items are unreachable in the shipped quiz (probe x01 shows what they
would do: Ergo and TEMPUR-Protect promoted with "Matches your comfort
preferences"). No output effect today.

**G. Verdict on the "better-matched accessories" claim (the reason 3.7
exists).** Earned, as "suggested because of a named answer": cooling pillows
and the cooling protector for hot sleepers; the allergen protector for
allergy-only customers; a base for back pain / snoring / reflux. **Not
earned:** any claim about the pillow for non-hot back / stomach / combo
sleepers (the hero is a default weight, and for back sleepers the app
contradicts itself); the base's first-beat hero placement for the majority of
customers with no trigger; the protection hero for hot + allergies. The 1.4
copy rule ("suggested *because of* a named answer, never best / right /
better-matched") remains the correct ceiling until the list below is ruled on.

---

## 4. Step 3 — enumerated output changes (the decision list, before → after)

Each item names the scenarios whose *output* changes; everything not listed is
unchanged. Nothing here is implemented. Any accepted item ships only on its
own PR with the Phase 1 output-regression fixture re-pinned for exactly the
listed scenarios (step 4). Recommended first approval set: **P1 + P2 + P3**.

| # | Proposed change (engine / catalog) | Scenarios changed | Before → after | Risk / note |
|---|---|---|---|---|
| **P1** | Treat `sleep_issues ∋ hot` as the hot signal alongside `temperature = hot` (scorer + protection-goal chooser). | r08 and any customer who flags heat as an issue but not as their temperature | r08: pillow hero Gel [Rec.] "side" (3, 1) → **Flow** [Rec.] "Matched to your side sleeping position" + "You reported sleeping hot" (7, 7 — identical to r09); protection everyday → Dri-Tec → **cooling → Ver-Tex** (7T, Dri-Tec 2f). Fixture scenarios: none change (s2 and s8 already say hot in both fields). | Lowest risk; pure signal parity between two answers that mean the same thing. |
| **P2** | Badge "Recommended to try" only when `matched` is true (an answer fired); otherwise "Worth comparing". Hero logic (renderer rule), no ranking change. | s1, s3, s4, s5, s7, s9, r02, r03, r05, r07, r10, r12, r15 (pillow badge); no adjustability change (already "Worth comparing" when unmatched) | Pillow hero badge "Recommended to try" → **"Worth comparing"** wherever the reason line is the neutral one. Ordering and groups identical. | Removes the overstated badge; the neutral line already says the truth. |
| **P3** | Within the pillow group, rank *matched* items above unmatched default-score items (or equivalently: the group hero must be matched when any matched pillow exists). | s1, s5, r02, r05, r07, r10, r15 (non-hot back sleepers) | Pillow hero Gel (neutral) → **Flow** "Optimized for back sleepers", Gel becomes the alternative — **the Sleep System hero now equals the drawer prompt's pillow**. With P2 the Flow is badged "Recommended to try" (matched); without P2 it would be "Worth comparing" (score 1 vs group max 2). Side and hot sleepers unchanged. | Fixes the customer-visible contradiction. Alternative P3b (catalog: remove Gel's `default: 2`) produces the same back-sleeper result but makes stomach / combo / no-idea heroes a 0–0 tie by catalog order; alternative P3c (make the *prompt* follow the hero) would have the prompt say "Try this pillow… A solid option…", defeating the prompt. P3 + P2 recommended. |
| **P4** | Protection: when a goal is suggested, qualify the group on goal support first (goal-supporting items ranked by their goal-specific weight, back-filled by the rest by score). | r14 (hot + allergies) and any allergies + hot customer; allergies-only and hot-only unchanged | r14: hero Dri-Tec "Best for allergens" (iProtect absent, Ver-Tex demoted) → **iProtect** "Best for allergens" (allergies 2), alternatives Dri-Tec (allergies 1, hot 1) and Ver-Tex (the cooling need, still surfaced). Exact after-state to be pinned by fixture on the change PR — hand-derived here. | Medium: touches the qualification rule for one step; a manual goal change on screen already re-sorts by support, so the shape is familiar. |
| **P5** | Entry step for customers with no base trigger — a decision, three options: (a) keep as-is (demo framing, honest badge); (b) enter at the first step whose hero is *matched* (pillow for side / hot; protection for allergies), adjustability still first in the rail; (c) on the adjustability step with no trigger, show the position demo without a hero product card (cards remain reachable under "Also compare"). | (b): the 19 no-trigger scenarios' entry step; (c): those scenarios' adjustability card | s1 under (b): first screen = pillow step (after P3: Flow, "Optimized for back sleepers") instead of BT2000 "Worth comparing"; under (c): the position demo with no $899 hero. | Step-order / hero logic — gated. (b) changes where every no-trigger customer starts; (c) removes the un-justified hero without moving the step. Blake's call; the audit only establishes that the current placement is not answer-driven. |
| **P6** | Base ordering among the three adjustable bases (the fixed weight ladder) — **no change proposed.** | — | — | Blake to confirm the premium-first ordering is intended merchandising; reason copy stays "because you mentioned…" (never "best"), per 1.4. |
| **P7** | Map `extra_support` / `getting_older` to the adjustability trigger — **not proposed.** | (would be r15, s8) | (would add a base hero with a new reason line) | Requires a substantiated claim and a reason string; no evidence in the repository supports it today. Question for Blake. |
| **P8** | Remove the unreachable `budget = premium` branch and the five `premium` weights — **no output change; not proposed now.** | none | identical outputs | Zero-risk cleanup for a later engine PR; leaving it is also zero-risk. |
| **P9** | Catalog gaps (data, not engine): no stomach-position pillow; no low-profile / adjustable-fill pillow though the pillow guidance names both; a single support item though the support step offers a lower-height choice. | stomach sleepers; anyone following the pillow guidance | — | Catalog / 1.4 copy questions for Blake — either add products through `incoming/lacks_accessories.json` or make the guidance name only what exists. |
| **P10** | `cooling` + `hot` double weights for one answer — **note only.** | none (ties preserved as ordered today) | — | Harmless now; would matter if P1 or new products change the tie structure. |

**Exit for 3.7 steps 1–3:** this list exists and is before Blake. Step 4 —
approval of specific items on their own PR, fixtures re-pinned to the listed
scenarios only, no other output changed — is the only route to any engine,
catalog or hero-logic change.
