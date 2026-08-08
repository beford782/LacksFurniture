# Block A claim disposition — 24 Tier‑D/E strings rendering in production

**RECOMMENDATION PACKAGE — AWAITING OWNER DISPOSITION. Nothing in this
document edits the catalog, the application, the prototypes, the fixtures, or
any roadmap status.** Every disposition below is a recommendation to the named
Lacks content owner and business approver (Blake Ford, named 2026‑08‑07). No
recommendation takes effect until the owner rules on it, and rows flagged
LEGAL‑REVIEW‑REQUIRED additionally await a legal/compliance reviewer, a role
that is **explicitly unfilled**. This document is an input to the claim‑risk
activation prerequisite recorded in the Phase 1 authoring brief — it does not
close that prerequisite.

Prepared 2026‑08‑07 on branch `claude/tier-de-claim-disposition` from
`main` = `bdf56d0`.

---

## 1. Scope and provenance

The 24 rows below are **Block A** of the 83‑row preliminary claim‑risk
inventory in `docs/phase1-catalog-reason-authoring-brief.md` (appendix), as
recorded on PR #18 at `8e850c4`: every Tier‑D/E string that **renders in the
production application today**. Rows A1–A11 are `topPickReason` strings
(Results cards); rows A12–A24 are `differentiators` strings (mattress drawer;
those marked "compare" also render in the compare modal's Difference row).

All 24 verbatim strings were re‑verified against `data/mattresses.json` at the
base commit before research began; the row set matches the brief's appendix
exactly, each row appears exactly once, and no row outside Block A is
dispositioned here.

### Method

Three parallel research agents worked non‑overlapping groups (A1–A8, A9–A16,
A17–A24) under one shared rubric (§2), with read‑only repository access and
web research; they made no repository changes and did no Spanish‑language
work. The primary (session lead) then independently reconciled the three
dossiers: every intra‑catalog assertion was re‑verified directly against
`data/mattresses.json` and `incoming/lacks_catalog_selection.json`, and every
load‑bearing manufacturer citation was independently re‑fetched and confirmed
(the verification ledger in §12 lists which citations were primary‑verified
and which stand on the agent's report alone). Conflicts and normalizations are
documented in §6 — nothing an agent filed was silently altered.

## 2. Rubric applied

One disposition per row:

- **RETAIN** — the claim exactly as written, including qualifiers,
  superlatives and scope, is substantiated by an authoritative source. If a
  source supports only a weaker, qualified, or narrower version, RETAIN is
  forbidden.
- **REWRITE** — a real, supportable construction/material fact underlies the
  string, but the claim as written overreaches. The dossier states which
  elements must drop and which supportable fact remains. **No replacement copy
  is authored here** — copy goes through the authoring workflow with its own
  approvals.
- **RETIRE** — no supportable fact underneath, or the claim contradicts the
  catalog itself and cannot be repaired by narrowing.
- **ESCALATE** — conflicting evidence, or truth resolvable only from
  Lacks/manufacturer internal records, or anything the rubric cannot decide.

**Fail‑closed rule:** unsupported ≠ RETAIN; low‑confidence RETAIN is
forbidden; absence of evidence is reported explicitly, never papered over.

**Legal flag** (independent of disposition): marked when a row involves
health/therapeutic or anatomical‑outcome language; "proven"/efficacy
substantiation; antimicrobial or cleanliness implications; patent claims;
origin (Made in USA / Texas) claims; or any Tier E element.

**Evidence standards:** official manufacturer domains (tempurpedic.com,
restonic.com, springair.com including Chattam & Wells) and lacks.com pages
only; intra‑catalog facts verify against `data/mattresses.json`. Aggregators,
review sites, and other retailers' marketing are excluded.

## 3. Evidence caveats (read before the rows)

Three structural facts limit what any disposition in this document can rest
on. They are findings in their own right.

1. **lacks.com could not be fetched live.** Every live request from the
   research agents returned HTTP 403 or 429 (consistent with the AVB/Magento
   browser‑session requirement recorded in project docs). All "lacks.com
   says" facts below therefore cite the repository's committed capture
   `incoming/lacks_catalog_selection.json` (scraped 2026‑07‑30 via browser
   session) — a dated record of lacks.com content, **not a live
   re‑verification**. Prices cited from it are the 2026‑07‑30 promotional
   finals; where a price comparison is load‑bearing (A6), the regular prices
   preserve the same ordering, so the conclusion is robust to promotion
   changes.
2. **restonic.com publishes none of the Restonic models Lacks sells.**
   Restonic is a licensee cooperative; its site lists ComfortCare by "Level"
   (1–5), Signature, HealthRest, Grand Palais, Biltmore, Scott Living, and
   Drew & Jonathan — no Kendall, Angelina, Giselle, Gracie, Platinum
   (Paige/Summit/Maria), Reserve Mayfair, or Royal Reserve page exists there.
   Manufacturer substantiation for Restonic rows exists only at the
   generic‑technology level (Marvelous Middle®, TempaGel®, CoolComfort,
   wrapped‑coil units), never at the model level. Model‑level substantiation
   for every Restonic bed on the floor can only come from the Texas
   licensee's spec sheets. 21 of the catalog's 26 models are Restonic or
   Chattam & Wells, so this gap reaches far beyond Block A.
3. **Several Lacks SKU names have no upstream referent at all.**
   "Tempur‑LuxeBreeze **2.0**" / "Tempur‑ProBreeze **2.0**" (Tempur‑Pedic
   publishes no "2.0"), "Copper Cushion Firm" (Spring Air's nearest is
   "Copper Hybrid Cushion Firm Eurotop"), and "Platinum Summit
   Plush"/"Platinum Maria Plush" (nowhere on restonic.com, and not in the
   agents' lacks.com search results either) cannot be tied to any published
   specification. Claims about these models rest on an unverified identity
   mapping — a category of risk the inventory's A–E ladder does not currently
   capture (see §8.2).

## 4. Outcome summary

**All 24 rows: REWRITE. 0 RETAIN, 0 RETIRE, 0 row‑level ESCALATE. 16 rows
carry LEGAL‑REVIEW‑REQUIRED as filed.**

Not one string was substantiated as written; not one was empty underneath.
Every row wraps a real construction or material fact in at least one
overreach, falling into five repeating shapes:

1. An express‑substantiation word with nothing behind it ("proven" — A1, A2).
2. A manufacturer's qualified number stripped of its mandatory qualifier
   (the Tempur "10°/5° cooler" family — A1, A4, A19).
3. A store‑wide or class‑wide superlative the catalog itself refutes or
   cannot define (A4, A6, A7, A8, A9, A16).
4. An outcome, efficacy or segment promise about the customer rather than a
   fact about the product (A2, A3, A5, A7, A10–A15, A17, A20–A24).
5. An adverse factual assertion about a competing product category (A23).

Row‑level ESCALATE was not used because in every row the **claim as written**
was decidable — each one demonstrably overreaches its best available support,
so the disposition of the current string never depends on records we lack.
What the missing records govern is whether certain **dropped elements may
return later**; those are tracked fail‑closed in the records‑dependent
register (§10) rather than by suspending the row.

| Row | Model | Field (surface) | Class | Disposition | Legal flag | Records‑dependent element |
|---|---|---|---|---|---|---|
| A1 | g5 ProBreeze 2.0 Medium Hybrid | topPickReason (Results) | D | REWRITE | **YES** | "2.0" SKU identity |
| A2 | b5 Angelina Plush | topPickReason (Results) | D | REWRITE | **YES** | — |
| A3 | g9 Copper Cushion Firm | topPickReason (Results) | D/E | REWRITE | **YES** | SKU identity; live PDP check |
| A4 | g4 LuxeBreeze 2.0 Soft | topPickReason (Results) | B→D | REWRITE | **YES** | "2.0" SKU identity; store‑wide superlative (§10) |
| A5 | s9 Kendall Luxury Medium | topPickReason (Results) | D | REWRITE | **YES** | coil‑unit spec |
| A6 | s10 Kendall Extra Firm | topPickReason (Results) | D | REWRITE | no | — (price clause refuted) |
| A7 | g8 Royal Reserve Extra Firm | topPickReason (Results) | D | REWRITE | **YES** | "hand‑made" |
| A8 | g2 The Saint Pierre | topPickReason (Results) | D | REWRITE | no | — |
| A9 | g7 Reserve Mayfair Medium | topPickReason (Results) | D | REWRITE | **YES** | "hand‑made"; SKU comfort variant |
| A10 | s7 Platinum Summit Plush | topPickReason (Results) | D | REWRITE | **YES** (see §6 R4) | SKU identity |
| A11 | b1 Giselle Plush | topPickReason (Results) | D | REWRITE | no | — |
| A12 | b5 Angelina Plush | differentiators[0] (drawer+compare) | E | REWRITE | **YES** | Marvelous Middle patent status |
| A13 | s9 Kendall Luxury Medium | differentiators[0].detail (drawer+compare) | D | REWRITE | **YES** | coil‑unit spec |
| A14 | s2 Platinum Paige Extra Firm | differentiators[1].detail (drawer) | D/E | REWRITE | **YES** | patent status |
| A15 | s5 Platinum Summit Firm | differentiators[1].detail (drawer) | E | REWRITE | **YES** | zoned‑system spec |
| A16 | g8 Royal Reserve Extra Firm | differentiators[0].detail (drawer+compare) | D | REWRITE | no | store‑wide ranking; "Reserve line" scope |
| A17 | g3 The Palermo | differentiators[1].detail (drawer) | D | REWRITE | no¹ | — |
| A18 | g9 Copper Cushion Firm | differentiators[0].detail (drawer+compare) | B/E | REWRITE | **YES** | SKU identity; EPA status; patent status |
| A19 | g4 LuxeBreeze 2.0 Soft | differentiators[0].title (drawer) | B | REWRITE | **YES** | "2.0" SKU identity; °F/°C unit |
| A20 | g4 LuxeBreeze 2.0 Soft | differentiators[0].detail (drawer+compare) | D | REWRITE | **YES** | PCM attribution |
| A21 | g2 The Saint Pierre | differentiators[0].detail (drawer+compare) | D | REWRITE | no | — |
| A22 | s7 Platinum Summit Plush | differentiators[0].detail (drawer+compare) | D | REWRITE | no¹ | SKU spec (gel layer) |
| A23 | s7 Platinum Summit Plush | differentiators[1].detail (drawer) | D | REWRITE | no¹ | SKU spec (hybrid unit) |
| A24 | s3 Platinum Maria Plush | differentiators[1].detail (drawer) | D | REWRITE | **YES** | SKU spec (coil series) |

¹ No flag under the rubric's enumerated triggers, but the researching agent
recommended legal review on independent grounds — see the row block and §6 R4.

## 5. How to read the row blocks

Each block preserves the researching agent's findings in normalized form:
the verbatim string, its discrete claim elements, evidence with quotes and
what each bears on, explicit negative results, the disposition with
structural rewrite guidance (never replacement copy), the legal flag with its
ground, confidence, and open items. Citations marked **[PV]** were
independently re‑fetched and confirmed by the primary on 2026‑08‑07; §12
lists the rest.

## 6. Reconciliation decisions (primary's, documented)

The three dossiers agreed on every question of fact — no agent's evidence
conflicted with another agent's or with the repository, so the mandate's
conflict‑ESCALATE rule was never triggered. Five normalization decisions were
still required; nothing else in any dossier was altered.

**R1 — "Hand‑made" is treated identically on A7 (g8) and A9 (g7).** The two
groups filed the same evidence base for both models — Restonic's brand‑wide
tagline ("Handcrafted mattresses since 1938"), an /explore page whose *title*
says "Handmade Quality Mattresses" while its body makes no manufacturing
claim **[PV]**, no hand‑made language on any Spring Air/Reserve product page
**[PV]**, and the Lacks capture's own "Hand‑made hybrid, natural materials"
descriptions — but group 1 concluded the element cannot carry (A7) while
group 2 would have kept it citing the Lacks capture (A9). Identical evidence
must produce identical treatment, and the fail‑closed rule picks the stricter
one: **"hand‑made" does not carry on either row on current evidence**. It is
a records‑dependent element (§10) that may return only on the Restonic Texas
licensee's written confirmation of what "hand‑made" covers for these builds.
This matters doubly because both models carry `locallyMade: true`, which
awards +25 in scoring — an origin‑family representation that also moves the
recommendation. One thread stays open: a search snippet suggests Spring Air
may publish line‑scoped "Handcrafted Reserve" copy — materially stronger
than the brand‑wide tagline weighed here — but it could not be landed on any
fetchable official page (two candidate URLs 404; the resolving Reserve
collection page contains no handcrafted/hand‑made language), and a snippet
is not admissible under the rubric. The licensee/dealer request (§10) should
ask the question directly; a confirmed line‑level claim would reopen this
decision.

**R2 — Unverifiable‑SKU rows stay REWRITE, with execution blocked.** For
A18, A19/A20, A22, A23 and A24 the model name has no upstream referent
(§3.3), so even the *kept* construction facts rest on an unverified identity
mapping. Group 3 recommended REWRITE because the wording defects are
independently disqualifying — they would remain with a perfect spec sheet in
hand — and flagged the identity gap as an ESCALATE‑class dependency. That
standard is adopted for all such rows in all groups: **the disposition of the
current string is REWRITE; execution of any rewrite is blocked until the
relevant dealer/spec sheet confirms the model's materials** (§10). A strict
reader who prefers row‑level ESCALATE for A22/A23/A24 as a set loses nothing:
under either label, no copy changes until the records arrive.

**R3 — The brief's "firmest" contradiction is upgraded.** The inventory
recorded the A16 "firmest luxury" collision as g8 vs s2. Verified against
`data/mattresses.json` at base: firmness 8 is a **four‑way tie** — g8 (Gold),
s2, s10 (Silver), b6 (Bronze) — and g8 is the only one of the four *without*
the zoned feature. The brief's contradiction register should be corrected
when it is next edited (no edit is made here).

**R4 — One flag discrepancy is surfaced, not silently fixed.** A10 ("plush
without the heat", flagged YES‑narrowly by group 2) and A22 ("keeps the soft
layers from trapping heat", flagged no‑with‑recommendation by group 3) make
the same class of claim — an unquantified absolute thermal promise — and
carry different flags as filed. Both filings are preserved above. The
primary's recommendation moots the discrepancy: **route the whole cooling set
(A10, A18's heat half, A19, A20, A22) to legal review as a single item**, so
one house rule gets set for how absolute a thermal claim may be. Group 3
independently recommended exactly this set review on A22.

**R5 — Group 2's summary miscount corrected.** Group 2's cover note said
five of its rows carry the legal flag; its own row blocks flag six (A9, A10,
A12, A13, A14, A15). The row blocks are authoritative; totals in §4 use
them.

---

## 7. Row dossiers

### A1 — g5 · Tempur‑ProBreeze 2.0 Medium Hybrid (Tempur‑Pedic, Gold, firmness 5)

**Field:** `topPickReason` — Results cards.
**String:** "Proven all‑night cooling with adaptive TEMPUR contour and hybrid support."

**Disposition: REWRITE · Legal flag: YES** (express substantiation:
"proven") · Confidence: high.

**Elements:** (1) "Proven" — express substantiation attached to cooling
performance; (2) "all‑night cooling" — unqualified duration promise;
(3) "adaptive TEMPUR contour" — material fact; (4) "hybrid support" —
construction fact.

**Evidence.**
- tempurpedic.com Breeze collection page **[PV]**: "TEMPUR‑Breeze®
  mattresses utilize our proven cooling materials to create an all‑night
  cooling experience that lasts from the minute you lie down to the moment
  you wake up." — "proven" modifies the **materials**, not the cooling
  performance; the catalog's syntax moves it onto the performance claim. Note
  the second clause: Tempur asserts the all‑night duration **in its own
  voice, unqualified** — no qualified duration framing exists anywhere on
  the page. The page cites no study, test method, or third‑party validation
  for "proven" **[PV]** (the sentence appears on the shop‑mattresses‑pillows
  URL; the other Breeze URL does not use "proven"). The only quantified,
  substantiated claim is the footnoted
  "ProBreeze® feels up to 5 degrees cooler based on the average heat index
  increase of TEMPUR‑ProBreeze® compared to TEMPUR‑ProAdapt® models measured
  over an 8‑hour period" **[PV]** — the catalog string carries none of that
  basis (not "feels", not the comparator, not the 8‑hour heat‑index frame).
- `data/mattresses.json` g5 + capture (sku 1302592): firmness 5; hybrid;
  "hybrid coils + TEMPUR material" — elements 3 and 4 substantiated **[PV]**.

**Searched, not found.** No substantiation of "proven" anywhere on
tempurpedic.com; no model page for a "ProBreeze **2.0**" (the tried URL
404'd). Older retailer copy repeating "3°" is out of date — the current
published figure is 5°.

**Rewrite guidance.** Drop "Proven" — echoing a manufacturer's
unsubstantiated adjective in Lacks' own voice makes Lacks its speaker. Drop
"all‑night cooling" on the same speaker‑shift ground: Tempur's own duration
language is as unqualified as the catalog's, so there is no qualified
duration framing for the element to travel with — repeating it makes Lacks
the speaker of an unsubstantiated duration promise. Keep: TEMPUR‑material
contouring and the hybrid coil base. If a
quantified cooling claim is wanted, the only defensible form is Tempur's
verbatim qualified one — which likely does not fit a Results card, i.e. the
practical answer is the number leaves the card.

**Open items.** Whether the "2.0" unit on the Lacks floor is the build the
published claims attach to (§10). A reviewer could argue Tempur's own
sentence licenses a retailer echo; rejected fail‑closed, but the owner may
want counsel's view.

---

### A2 — b5 · Angelina Plush (Restonic ComfortCare, Bronze, firmness 3)

**Field:** `topPickReason` — Results cards.
**String:** "Zoned plush pressure relief — a proven pick for side sleepers."

**Disposition: REWRITE · Legal flag: YES** ("proven" express substantiation +
"pressure relief" anatomical efficacy) · Confidence: high on "proven";
medium overall.

**Elements:** (1) "Zoned" — construction; (2) "plush" — firmness; (3)
"pressure relief" — anatomical efficacy; (4) "proven" — express
substantiation; (5) "for side sleepers" — segment prescription.

**Evidence.**
- restonic.com ComfortCare Level 1 **[PV]**: "800 Series Individually
  Wrapped Coil Unit featuring the exclusive Marvelous Middle® prevents
  motion transfer between partners. Delivers 25% more support in the center
  third of the mattress." Center‑third zoning is a real, manufacturer‑
  documented feature — quantified as **25% more support**, not thicker coils.
- `data/mattresses.json` b5 + capture (sku 1991876): firmness 3 "Plush";
  features plush/soft/pressurerelief/zoned; badge "Marvelous Middle"; capture
  desc "25% thicker center coils for shoulder/hip pressure relief … popular
  with side sleepers" **[PV]** — note "popular with", a popularity
  observation, not a fit prescription; and note the thickness phrasing
  mismatch (§8.4).

**Searched, not found.** No Angelina page on restonic.com; no manufacturer
pressure‑relief or side‑sleeper claim tied to ComfortCare (the only
pressure‑relief language found on restonic.com is in a customer review); no
use of "proven" by Restonic in this context **[PV** for the Level‑1 page's
absence of side‑sleeper/pain language**]**.

**Rewrite guidance.** Drop "proven" (bare express substantiation) and the
side‑sleeper prescription. Keep: plush surface (firmness 3) and the zoned
center‑third construction in the manufacturer's documented form. "Pressure
relief" should be reviewed rather than carried as‑is: its only support is
Lacks' own marketing copy — circular for substantiation purposes even though
lacks.com is an admissible source class.

**Open items.** The "25% thicker center coils" ↔ "25% more support"
transcription defect (also A12, §8.4).

---

### A3 — g9 · Copper Cushion Firm (Spring Air, Gold, firmness 6)

**Field:** `topPickReason` — Results cards.
**String:** "Copper cooling and recovery benefits with balanced cushion‑firm hybrid support."

**Disposition: REWRITE · Legal flag: YES** (health/therapeutic outcome:
"recovery"; antimicrobial‑adjacent context; Tier E element) · Confidence:
high. **Highest‑risk row in group 1.**

**Elements:** (1) "Copper cooling" — material + thermal; (2) "recovery
benefits" — physiological/therapeutic outcome; (3) "balanced cushion‑firm" —
firmness; (4) "hybrid support" — construction.

**Evidence.**
- springair.com Copper Hybrid Cushion Firm Eurotop product page **[PV]**:
  copper materials "pulling heat away from your body", cover "resists
  microbial buildup", "Proudly crafted in the USA", hybrid. The word
  "recovery" **does not appear** **[PV]**.
- springair.com Copper collection: "Patented Natuverex™ Copper fabric paired
  with copper‑infused memory foams for a cooler, healthier sleep experience";
  no recovery claim.
- springair.com copper‑benefits blog **[PV]**: the only recovery‑adjacent
  line Spring Air publishes is expressly hedged — "Preliminary studies
  suggest copper ions may enhance local blood flow; larger peer‑reviewed
  trials are ongoing." Also: "Copper transfers heat up to 8× faster than
  conventional memory foam (Thermal Conductivity Handbook 2023)"; "ISO 22196
  tests show copper‑infused surfaces can reduce certain bacteria by > 99 %
  within two hours."
- Capture g9 (sku 2037053) **[PV]**: the scrape note itself reads "…
  **health/recovery angle**; hybrid euro‑top" — the apparent origin of
  "recovery" is an **internal scrape annotation**, not a manufacturer claim.

**Searched, not found.** No Spring Air page asserts recovery, healing, muscle
recovery, inflammation reduction, or circulation benefit as an unqualified
product claim.

**Rewrite guidance.** Drop "recovery benefits" entirely — an outcome claim
whose best source says "trials are ongoing" and whose apparent origin is an
internal annotation. Keep: copper‑infused cooling material (as material
description, not performance promise) and the cushion‑firm hybrid
construction. Do **not** substitute the antimicrobial/ISO 22196 material —
that trades a therapeutic claim for an antimicrobial one (see A18).

**Open items.** Live lacks.com PDP for sku 2037053 should be checked by
someone with a browser session — if the live page makes a recovery claim,
Lacks is the speaker on two surfaces. "Copper Cushion Firm" has no upstream
referent (§3.3). Display‑label note: the authored "cushion‑firm" renders to
the customer as "Firm" (firmness‑6 bucket), so the string's own firmness word
does not match the screen (§8.6).

---

### A4 — g4 · Tempur‑LuxeBreeze 2.0 Soft (Tempur‑Pedic, Gold, firmness 2)

**Field:** `topPickReason` — Results cards.
**String:** "The coolest‑sleeping soft mattress in the store — up to 10° cooler all night."

**Disposition: REWRITE · Legal flag: YES** (quantified performance claim
severed from its mandated qualifier; inventory routes "Tempur‑Pedic +
legal") · Confidence: high.

**Elements:** (1) store‑wide cross‑brand superlative, definite article;
(2) "up to 10° cooler" — quantified thermal claim stripped of "feels", the
comparator, and the measurement basis; (3) "all night" — duration; (4)
"soft" — firmness descriptor.

**Evidence.**
- tempurpedic.com Breeze pages **[PV]**: the claim exists only as "Feels Up
  to 10° Cooler" with the mandatory footnote: "LuxeBreeze® feels up to 10
  degrees cooler based on the average heat index increase of
  TEMPUR‑LuxeBreeze® compared to TEMPUR‑ProAdapt® models measured over an
  8‑hour period." A heat‑**index** average vs **Tempur's own ProAdapt**, over
  8 hours — not a thermometer reading, not vs the customer's bed, not a
  continuous state. Tempur's own superlative is brand‑line scoped ("your
  coolest night's sleep yet"), never cross‑brand.
- `data/mattresses.json` **[PV]**: exactly two models are soft‑end
  (firmness ≤ 3) with the cooling feature — g4 and s7 (cool‑gel memory foam,
  different manufacturer). The store‑wide superlative reduces to an untested
  g4‑vs‑s7 comparison with no common test basis.

**Searched, not found.** No cross‑brand cooling comparison anywhere on
tempurpedic.com; no test data comparing g4 to s7 or any other Lacks model.

**Rewrite guidance.** Drop the store‑wide superlative outright — no
substantiation path exists short of commissioned comparative testing. The
number may appear only with Tempur's complete qualifier attached; stripped as
here, it must drop. Keep: Pure Cool Plus phase‑related cooling materials
(see A20 for the attribution caveat), cool‑to‑touch cover, soft TEMPUR
contour. **Must travel with A19/A20** (same claim family on the drawer
surface) and with g4's `highlight` and `reasons.default` (§8.3) or the card
and drawer will disagree.

**Open items.** "2.0" SKU identity (§10). "Soft" renders to the customer as
"Plush" (§8.6). "All night" is additionally unsupported: the basis is an
8‑hour **average**, not a continuous state.

---

### A5 — s9 · Kendall Luxury Medium (Restonic ComfortCare, Silver, firmness 5)

**Field:** `topPickReason` — Results cards.
**String:** "Balanced medium comfort with wrapped coils that keep partner movement on their side."

**Disposition: REWRITE · Legal flag: YES** (efficacy claim — asserts a
specific functional outcome; inventory routes "Restonic + legal") ·
Confidence: medium (high that the string overreaches; lower on what remains,
because the coil‑unit claim cannot be tied to this bed).

**Elements:** (1) "balanced medium comfort" — firmness; (2) "wrapped
coils" — construction; (3) "keep partner movement on their side" — absolute
motion‑containment promise.

**Evidence.**
- restonic.com ComfortCare Level 1/4 **[PV** for Level 1**]**: "…Individually
  Wrapped Coil Unit featuring the exclusive Marvelous Middle® prevents
  motion transfer between partners." The manufacturer's claim is equally
  absolute — but restonic.com elsewhere uses the softer "reduce partner
  disturbance from motion transfer"; the manufacturer contradicts itself on
  strength, and the claim belongs to ComfortCare "Levels", not to any bed
  named Kendall.
- `data/mattresses.json` s9 + capture (sku 1991879) **[PV]**: firmness 5
  "Medium"; motionisolation feature; "motion‑isolating wrapped coils" —
  elements 1–2 substantiated.

**Searched, not found.** No Kendall page on restonic.com; no published
motion‑transfer test standard or measurement anywhere found.

**Rewrite guidance.** Drop the containment promise — motion is attenuated,
not confined to a half, and it promises the customer's night rather than
describing the product. Keep: individually wrapped coils, balanced medium
feel, as construction. If motion language is wanted, the path is a licensee
spec sheet confirming this bed's coil unit, then the manufacturer's wording —
not a stronger paraphrase.

**Open items.** **Must be resolved together with A13** (same promise, same
model, drawer surface). Engine note (not a claim issue): the
`motionisolation` tag scores zero today (casing defect, brief §1) — the card
promises what the scoring ignored.

---

### A6 — s10 · Kendall Extra Firm (Restonic ComfortCare, Silver, firmness 8)

**Field:** `topPickReason` — Results cards.
**String:** "Serious extra‑firm zoned support at the best price in its class."

**Disposition: REWRITE · Legal flag: no** (no enumerated trigger; the
inventory routes "merch + legal" and unqualified price‑leadership carries its
own advertising exposure — recorded, not adjudicated here) · Confidence:
high — **the only Block A row refuted by arithmetic rather than absence of
evidence.**

**Elements:** (1) "extra‑firm"; (2) "zoned support"; (3) "the best price";
(4) "in its class" — undefined comparison set.

**Evidence.**
- Capture + `data/mattresses.json` **[PV]**: firmness‑8 zoned models and
  2026‑07‑30 prices — s2 $2,199 · s10 $1,299 · b6 $799. **b6 is the same
  extra‑firm zoned hybrid profile (same "Marvelous Middle" badge, same
  center‑coil desc) at $500 less.** Adding g8 ($3,099, not zoned) makes four
  extra‑firm beds; s10 is second‑cheapest of the four — cheaper than s2 and
  g8 but undercut by b6, so it is not best‑priced there either. Under the
  only rescuing
  reading ("class" = Silver tier), s10 at $1,299 **ties s8 and s9** — a
  three‑way tie is not "the best price". Regular prices (s10 $1,699.95, b6
  $1,049.95) preserve the ordering **[PV]**.
- Elements 1–2 substantiated (features firm/support/zoned/hybrid) **[PV]**.

**Searched, not found.** No source can substantiate price leadership — it is
an assortment fact, and Lacks' own assortment refutes it.

**Rewrite guidance.** Drop the entire price clause — the element on its own
is RETIRE‑grade: contradicted by Lacks' own catalog under every reading of
"class", and unfalsifiable on a kiosk that displays no prices. Keep:
extra‑firm (8) zoned hybrid tight‑top support. **Must be ruled together with
the other three price‑leadership claims** (reason_default rows B5 b4, B6 b7,
B7 b6 — outside Block A): the four are mutually exclusive, and fixing them
one at a time leaves survivors that contradict each other (§8.5).

---

### A7 — g8 · Royal Reserve Extra Firm (Restonic, Gold, firmness 8)

**Field:** `topPickReason` — Results cards.
**String:** "Hand‑made extra‑firm support — the choice for back and stomach sleepers who want luxury."

**Disposition: REWRITE · Legal flag: YES** ("hand‑made" is a
manufacturing‑provenance representation in the origin family, on a model
carrying `locallyMade: true` which awards +25 in scoring) · Confidence:
medium (high that the prescription must drop; the hand‑made element is
records‑dependent).

**Elements:** (1) "Hand‑made" — manufacturing method; (2) "extra‑firm
support"; (3) "the choice for back and stomach sleepers" — definite‑article
segment prescription; (4) "who want luxury" — positioning.

**Evidence.**
- restonic.com **[PV]**: brand tagline "Handcrafted mattresses since 1938"
  (brand‑wide, not SKU substantiation); /explore's **title** is "Handmade
  Quality Mattresses" but its **body makes no handmade or manufacturing‑
  method claim at all** **[PV]**.
- Capture g8 (sku 1991959) **[PV]**: "Hand‑made hybrid, natural materials,
  extra firm support" — Lacks' own assertion; element 2 solidly supported.
- `data/mattresses.json` **[PV]**: the definite article is refuted
  intra‑catalog — firm‑end, more luxury‑positioned alternatives exist (g1 The
  Roma and g3 The Palermo, both firmness 7, both priced above g8; s2 firmness
  8 "luxury build"), and g8 is the **only firmness‑8 model without the zoned
  feature**.

**Searched, not found.** "Reserve"/"Royal Reserve" nowhere on restonic.com;
no manufacturer statement that any specific Restonic bed is hand‑assembled;
no definition of what "hand‑made" covers.

**Rewrite guidance.** Drop the definite‑article prescription — it asserts
exclusive suitability the catalog itself contradicts, and it competes with
the quiz's own scoring. Keep: extra‑firm hybrid tight‑top support (firmness
8). "Hand‑made" does **not** carry on current evidence (reconciliation R1);
it may return only on the licensee's written confirmation (§10).

**Open items.** **Must be resolved together with A16** (same model). The
"Reserve line" scope question (§8.7) touches this model's other copy.

---

### A8 — g2 · The Saint Pierre (Chattam & Wells, Gold, firmness 3)

**Field:** `topPickReason` — Results cards.
**String:** "The most luxurious plush in the store — natural fibers over layered coil support."

**Disposition: REWRITE · Legal flag: no** (subjective positioning; the
defect is verifiability, not an enumerated trigger) · Confidence: high.
**Lowest‑effort fix in group 1: delete the first clause and the remainder is
already substantiated.**

**Elements:** (1) "The most luxurious plush in the store" — store‑wide
subjective superlative; (2) "natural fibers"; (3) "layered coil support".

**Evidence.**
- springair.com St Pierre Super Plush Eurotop **[PV]**: "Cashmere, Merino
  and Camel wool provide a natural approach…"; "NanoCoil® and micro coil
  layer adapt to movement, paired with a dual‑layered Quad coil system for
  resilient support. With over 8,000 coils…" — elements 2 and 3 fully and
  precisely substantiated. The page uses "spa‑like luxury" as a product
  descriptor, never a model‑vs‑model ranking **[PV]**.
- springair.com C&W collection: St Pierre is the line's highest‑priced model;
  the collection is "the pinnacle of mattress artistry" — supports "top of
  the Chattam & Wells line", a manufacturer‑line claim, never a store‑wide
  one.
- Capture **[PV]**: g2 $5,999 is the priciest plush‑tagged model, but g4
  ($5,899, also plush‑tagged) sits $100 behind — even a price‑as‑luxury proxy
  is a near‑tie, and the app displays no prices.

**Searched, not found.** No "most luxurious"/"most premium" superlative for
the St Pierre anywhere on springair.com; no source could substantiate a
cross‑brand luxury ranking ("luxurious" has no measurable definition — unlike
A4's thermal superlative, no test could ever resolve it).

**Rewrite guidance.** Drop the store‑wide superlative. Keep both remaining
elements — the strongest surviving substrate in group 1. If a positioning cue
is wanted, "top of the Chattam & Wells line" is manufacturer‑supportable in a
way "most luxurious in the store" never will be.

**Open items.** Spec‑level equivalence of the Lacks 16.5" build vs Spring
Air's DTC listing is unconfirmed (the surviving facts hold across both
descriptions).

---

### A9 — g7 · Reserve Mayfair Medium (Restonic, Gold, firmness 5)

**Field:** `topPickReason` — Results cards.
**String:** "Hand‑made luxury in a true medium — the most versatile bed in the Reserve line."

**Disposition: REWRITE · Legal flag: YES** ("hand‑made"
manufacturing‑provenance representation on a `locallyMade: true` model; see
R1) · Confidence: high on the superlative; medium on hand‑made.

**Elements:** (1) "Hand‑made"; (2) "luxury" (puffery); (3) "a true medium" —
firmness; (4) "the most versatile bed in the Reserve line" —
definite‑article ranked superlative on an unmeasurable attribute.

**Evidence.**
- springair.com Reserve collection **[PV]**: the official Reserve line is
  five models (Imperial Eurotop Ultra Plush, Mayfair Eurotop Plush, Royal
  Cushion Firm, Cathedral Plush, Cardinal Firm) — **no Medium exists in the
  manufacturer's line at all**, and the page states no ranking among its
  members **[PV]**.
- springair.com Reserve Mayfair Eurotop Plush (nearest official SKU)
  **[PV]**: Tencel cover, New Zealand wool, Talalay latex + Serene® foam,
  encased coils "zoned with 25% more support in the middle third", "Crafted
  in the USA" — natural materials substantiated; **no hand‑made or
  hand‑tufted bullet anywhere** **[PV]**.
- Capture g7 (sku 1992759) **[PV]**: "Hand‑made hybrid, natural materials,
  medium tight top" — Lacks' own assertion. `data/mattresses.json`: firmness
  5 "Medium" — element 3 verified **[PV]**.
- Intra‑catalog scope problem **[PV]**: subBrand "Reserve" covers exactly two
  models (g6, g7); g8 is subBrand "Royal Reserve" — yet g8's own
  `reason_default` says "The firmest bed in the Reserve line", so the catalog
  contradicts itself about the line's membership (§8.7).

**Searched, not found.** No versatility ranking or "most versatile"
statement about any Reserve model on restonic.com or springair.com; no
official page exists for the exact Lacks SKU (a Medium Tight Top Mayfair).

**Rewrite guidance.** Drop the superlative — unmeasurable, unsupported, and
its comparison set is defined inconsistently by the catalog itself (neither
rewrite here nor on A16 can be scoped until the "Reserve line" boundary is
settled, §8.7). Keep: natural materials (wool/Tencel/latex at line level,
with the SKU‑variant caveat) and the medium firmness (5, tight top).
"Hand‑made" does **not** carry on current evidence (R1; §10).

---

### A10 — s7 · Platinum Summit Plush (Restonic, Silver, firmness 3)

**Field:** `topPickReason` — Results cards.
**String:** "Soft, cooling pressure relief — plush without the heat."

**Disposition: REWRITE · Legal flag: YES as filed** (unqualified absolute
performance promise, express‑substantiation family; a strict enumerated‑
triggers reading could downgrade — see R4: route with the cooling set) ·
Confidence: high.

**Elements:** (1) "Soft" — firmness; (2) "cooling" — thermal; (3) "pressure
relief"; (4) "plush without the heat" — absolute thermal promise (absence of
heat retention).

**Evidence.**
- restonic.com ComfortCare Level 1 **[PV]** and /explore: "CoolComfort
  Gel‑Infused Foam… Provides optimal surface cooling, cushioning and
  conformability"; "Creates a cooling effect by gently moving heat away from
  your body for a temperature‑controlled micro‑climate"; TempaGel® "gel that
  dissipates heat instead of storing it". The manufacturer's register is
  strictly comparative/hedged — heat is *moved away* or *dissipated*, never
  absent.
- Capture s7 (sku 1990916) **[PV]**: "Gel memory foam plush tight top" —
  lacks.com's own s7 description asserts **no** cooling benefit (the sibling
  s5's does). `data/mattresses.json`: firmness 3 "Plush", cooling +
  pressurerelief features, "Cool Gel" tag **[PV]**.

**Searched, not found.** No claim anywhere on restonic.com that a gel‑infused
plush mattress sleeps *without* heat; no temperature‑differential figure for
any Restonic product; no Platinum Summit page exists.

**Rewrite guidance.** Drop "without the heat" — an absolute thermal promise
no source supports. Keep: gel‑infused memory foam over hybrid coils,
plush/soft feel (firmness 3), and the manufacturer‑stated cooling *effect* in
the manufacturer's own hedged wording. "Pressure relief" is slightly stronger
than the source's "cushioning/buffers" register — reviewer's judgement call.

**Open items.** SKU identity (§3.3, §10). Review as part of the cooling set
(R4).

---

### A11 — b1 · Giselle Plush (Restonic, Bronze, firmness 3)

**Field:** `topPickReason` — Results cards.
**String:** "Honest plush comfort for side sleepers at an everyday price."

**Disposition: REWRITE · Legal flag: no** (no enumerated trigger;
merchandising sign‑off needed on the price element, and a stricter reviewer
may want legal given the price‑leadership contradiction cluster) ·
Confidence: medium‑high.

**Elements:** (1) "Honest" — puffery; (2) "plush comfort" — firmness; (3)
"for side sleepers" — segment prescription on a lead card, independent of the
quiz; (4) "at an everyday price" — price positioning in an app that displays
no price.

**Evidence.**
- `data/mattresses.json` b1: firmness 3 "Plush" — element 2 verified
  **[PV]**.
- Capture b1 (sku 2031219) **[PV]**: "12.5in plush profile" — **no
  side‑sleeper language** (unlike b5, whose desc says "popular with side
  sleepers"); price $1,069 promo / $1,399.95 reg.
- Intra‑catalog price census **[PV]**: b1 at $1,069 is sixth‑lowest of 26 and
  the **second‑cheapest of the plush models** — b5 Angelina Plush is $799;
  five models undercut b1 (b7 $569, b5/b6 $799, b4 $895, b3 $995). "Everyday
  price" is not false, but b1 is not the value option and a cheaper plush
  sibling sits in the same catalog. The adjacent authored fact "Restonic
  quality without the Platinum price" **is** intra‑catalog true ($1,069 is
  below every Platinum SKU, $1,499–$2,199) **[PV]**.

**Searched, not found.** No Giselle page on restonic.com; no manufacturer
statement recommending a plush Restonic model for side sleepers (only
customer reviews and editorial blog content, which are not substantiation).

**Rewrite guidance.** Drop the side‑sleeper prescription — no acceptable
source prescribes it, b1's own capture is silent on it, and a fixed segment
prescription on a lead card cuts against the quiz‑driven fit model. Re‑scope
or drop the price element — no price renders anywhere in the app, and b1 is
not the low‑price choice; the intra‑catalog‑true positioning is the
below‑Platinum price band. Keep: the plush 12.5‑inch build (firmness 3).

---

### A12 — b5 · Angelina Plush (Restonic ComfortCare, Bronze, firmness 3)

**Field:** `differentiators[0]` — drawer + compare Difference row.
**String:** "title: Shoulder‑and‑hip relief | detail: The plush surface and center zoning target exactly where side sleepers ache."

**Disposition: REWRITE · Legal flag: YES** (Tier E: anatomical‑outcome title
+ express pain claim + segment prescription; patent‑adjacent use of the
Marvelous Middle mark without ® or attribution) · Confidence: high.

**Elements:** (1) "Shoulder‑and‑hip relief" — bare anatomical‑outcome
promise; (2) "plush surface and center zoning" — construction; (3) "target
exactly" — absolute precision; (4) "where side sleepers ache" — pain claim +
segment prescription.

**Evidence.**
- restonic.com /explore **[PV]**: "Patented Marvelous Middle® technology
  delivers 25% more support in the middle of the mattress, where you need it
  most"; "Extra lumbar support in the center third." ComfortCare Level 1
  **[PV]**: "…Delivers 25% more support in the center third of the
  mattress." The zoning is real, named, and quantified — as **support**, not
  coil thickness.
- Capture b5 (sku 1991876) **[PV]**: "25% thicker center coils for
  shoulder/hip pressure relief; 3in HD foam edge encasement; popular with
  side sleepers" — strongest support in the row, but it says *pressure
  relief*, not ache relief, and *popular with*, not "for".
- `data/mattresses.json` b5 **[PV]**: zoned + pressurerelief features,
  "Marvelous Middle" and "Side Sleeper" tags.

**Searched, not found.** No manufacturer claim that Marvelous Middle or a
plush surface relieves ache or pain, or targets side sleepers' pressure
points — official Restonic product copy contains **no pain or ache claim
anywhere**; the Level‑1 page has no occurrence of "spine", "alignment",
"hips" or "side sleeper" **[PV]**. No Angelina page exists.

**Rewrite guidance.** Drop "exactly" (absolute precision no source could
support), the ache/pain framing including the title's bare "relief" promise
(Restonic's register is "support" and "pressure relief", never pain), and the
definite segment prescription. Keep: plush surface (firmness 3), the
center‑zoned coil unit **in the manufacturer's quantification** — 25% more
support in the center third, attributed to Restonic's patented Marvelous
Middle® — and the 3‑inch HD foam edge encasement, noting the encasement is
capture‑sourced only (Lacks' own copy — the same self‑sourcing caveat A2
applies to "pressure relief"; confirm it on the licensee spec sheet). The
same pass must correct the "25% thicker center coils" phrasing wherever it
appears (§8.4).

---

### A13 — s9 · Kendall Luxury Medium (Restonic ComfortCare, Silver, firmness 5)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Each coil moves alone, so a restless partner doesn't wake you."

**Disposition: REWRITE · Legal flag: YES** (absolute efficacy promise; and
by coupling — A5, the same promise on the same model's Results surface, is
already routed "Restonic + legal"; splitting them would leave the claim live
on one surface after the other is fixed) · Confidence: high.

**Elements:** (1) "Each coil moves alone" — pocketed‑coil construction;
(2) "so a restless partner doesn't wake you" — absolute sleep‑outcome
promise.

**Evidence.**
- restonic.com ComfortCare Level 1 **[PV]** (same wording at Level 5 and
  HealthRest Level 4): "…Individually Wrapped Coil Unit featuring the
  exclusive Marvelous Middle® prevents motion transfer between partners" —
  element 1 substantiated for the ComfortCare line; the manufacturer's motion
  claim is itself absolute ("prevents") but is about **motion transfer**,
  never a waking/sleep outcome.
- springair.com Mayfair page **[PV]**: "reduced motion transfer" — the
  qualified register available for the same mechanism.
- Capture s9 **[PV]**: "motion‑isolating wrapped coils". Bearing against
  element 2: a customer review published on restonic.com's own FAQ disputes
  precisely this promise.

**Searched, not found.** No claim anywhere on restonic.com that a mattress
prevents a partner's movement from *waking* the sleeper; no Kendall page.

**Rewrite guidance.** Drop the sleep‑outcome clause — an unqualified promise
about the customer's night that depends on the sleeper, not the product, and
that no source makes. Keep: individually wrapped coils compressing
independently; the motion‑isolation benefit. Reviewer decision: inherit
Restonic's absolute "prevents motion transfer" with attribution, or adopt the
qualified "reduced motion transfer" — the primary and the researching agent
both recommend the qualified form. **Resolve together with A5.**

---

### A14 — s2 · Platinum Paige Extra Firm (Restonic, Silver, firmness 8)

**Field:** `differentiators[1].detail` — drawer only.
**String:** "Marvelous Middle reinforcement keeps hips level in every position."

**Disposition: REWRITE · Legal flag: YES** (anatomical‑outcome language;
patent‑adjacent use of the mark without ® or attribution) · Confidence:
high.

**Elements:** (1) "Marvelous Middle reinforcement" — named feature; (2)
"keeps hips level" — anatomical outcome; (3) "in every position" — universal
scope.

**Evidence.**
- restonic.com /explore **[PV]**: "Patented Marvelous Middle® technology
  delivers 25% more support in the middle of the mattress…"; "Extra lumbar
  support in the center third" — the feature is real and the closest
  supportable benefit is lumbar support in the center third, which is neither
  hip‑leveling nor positional.
- Explicit negative **[PV]**: "spine", "alignment", "hips", "side sleeper"
  do not appear in official ComfortCare product copy.
- Capture s2 (sku 2029844) **[PV]**: "Marvelous Middle; luxury hybrid extra
  firm" — feature present on this SKU, no anatomical outcome asserted.
  `data/mattresses.json`: zoned feature, "Marvelous Middle" tag **[PV]**.

**Searched, not found.** No claim that Marvelous Middle keeps hips level,
prevents hip/pelvic sink, or performs "in every position", on any acceptable
source (a pelvis‑sink description exists only on an excluded third‑party
retailer blog, and was not relied on). No Platinum Paige page exists.

**Rewrite guidance.** Drop "keeps hips level" and "in every position". Keep:
the center‑third reinforcement in the manufacturer's own quantification
("25% more support in the center third" / "extra lumbar support in the center
third") with proper attribution to Restonic's patented Marvelous Middle®.

**Open items.** Whether "Patented" corresponds to a live patent is a
Restonic/Lacks record (§10) — the catalog string makes no patent assertion of
its own, so this does not change the disposition.

---

### A15 — s5 · Platinum Summit Firm (Restonic, Silver, firmness 7)

**Field:** `differentiators[1].detail` — drawer only.
**String:** "Keeps your spine aligned while the gel layer softens contact points."

**Disposition: REWRITE · Legal flag: YES** (Tier E: postural/health outcome
stated as a guarantee) · Confidence: high.

**Elements:** (1) "Keeps your spine aligned" — postural/health outcome,
absolute and universal; (2) "the gel layer" — construction; (3) "softens
contact points" — pressure relief.

**Evidence.**
- Restonic **does** make spinal‑alignment claims — but only for specific
  5‑zone systems on collections that do not include this SKU (Scott Living
  "5 support zones for correct spinal alignment"; Drew & Jonathan "Quantum
  Edge, 5 support zone system"; Signature "proper spinal alignment"). This
  bears **against** the row: the claim is tied to systems this model is not
  documented to have.
- Explicit negatives: "spine"/"alignment" absent from ComfortCare Level 1
  **[PV]** and from HealthRest Level 4; restonic.com has no Platinum line at
  all.
- restonic.com gel materials (Level 1 **[PV]**, /explore): "CoolComfort
  Gel‑Infused Foam… cushioning and conformability"; TempaGel® "buffers
  sensitive pressure points and helps improve circulation" — hedged register
  supporting elements 2–3. Capture s5 (sku 1990906) **[PV]**: "Full layer
  memory foam with cool gel; pressure relief + cooling; hybrid firm tight
  top" — no alignment claim.

**Searched, not found.** No Platinum Summit page; no spinal‑alignment claim
attached to a gel‑over‑firm‑hybrid construction or to any model outside the
5‑zone collections.

**Rewrite guidance.** Drop "Keeps your spine aligned" — a health outcome
Restonic reserves for zoned systems this SKU is not documented to have, and
which s5's own capture does not assert. Keep: the full gel‑infused
memory‑foam layer over a firm hybrid core, and pressure‑point cushioning in
the manufacturer's hedged register. **Trap for reviewers:** genuine Restonic
alignment language exists on *other* lines — a skim of restonic.com could
wrongly conclude the claim is substantiated. If a spec sheet shows s5 uses a
zoned support system, the fact base changes and this row should be
re‑examined.

---

### A16 — g8 · Royal Reserve Extra Firm (Restonic, Gold, firmness 8)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Holds you fully on top of the bed — the firmest luxury option in the store."

**Disposition: REWRITE · Legal flag: no** (no enumerated trigger; note g8's
other row A7 routes to legal, and the two must be resolved together) ·
Confidence: high.

**Elements:** (1) "Holds you fully on top" — absolute no‑sink claim; (2)
"the firmest … option" — superlative; (3) "luxury" — undefined narrowing
category; (4) "in the store" — store‑wide scope.

**Evidence.**
- `data/mattresses.json` **[PV]** (decisive): firmness 8 is the catalog
  maximum and is a **four‑way tie** — g8 (Gold), s2, s10 (Silver), b6
  (Bronze). g8 is tied, not firmest. This upgrades the brief's recorded
  two‑way collision (R3). Even the charitable "firmest of the luxury options"
  fails: the catalog itself calls the equally‑firm s2 "a luxury build". No
  luxury field or flag exists in the schema — the comparison set is undefined
  and unauditable. The only defensible narrowing is the Gold tier, where g8
  *is* firmest (g1/g3 = 7, g9 = 6) **[PV]** — but "Gold tier" is a
  DreamFinder scoring construct never shown to the customer as "luxury", and
  is not what the string says.
- Capture `_meta` **[PV]**: the kiosk catalog is a 26‑model selection; the
  note "Sealy/Stearns & Foster excluded per Blake 2026‑07‑30 (not in live
  catalog)" concerns brand availability and says nothing about the live
  assortment's size. Nothing in the repository enumerates the store's full
  assortment, and live enumeration is blocked (§3.1) — so a store‑wide claim
  cannot be substantiated from the kiosk data.
- springair.com Reserve collection **[PV]**: the official line has no Extra
  Firm at all; the official Reserve Royal is **Cushion Firm**; no firmness
  ranking or "sleep on top" language on the Reserve Royal page. Capture g8
  **[PV]**: "Hand‑made hybrid, natural materials, extra firm support" —
  extra‑firm positioning supported, no superlative.
- Supportable remnant **[PV]**: g8's own `reason_default` ("The firmest bed
  in the Reserve line") is intra‑catalog **true** iff Royal Reserve counts as
  Reserve (g6 = 3, g7 = 5, g8 = 8) — the boundary question, §8.7.

**Searched, not found.** No "firmest" ranking, no definition of a luxury
segment, no "sleep on top of the mattress" claim on springair.com or
restonic.com. Lacks' full live assortment could not be enumerated (fetch
blocked); whether it exceeds the kiosk catalog is itself unverified.

**Rewrite guidance.** Drop the superlative, the undefined "luxury" category,
and the store‑wide scope together; drop "fully". Keep: extra‑firm (8, tied
at the top of the catalog's scale), the natural‑materials hybrid build per
the capture, and a minimal‑sink *feel* described as feel, not guarantee. If
merchandising wants any ranking, the only catalog‑defensible version is the
line‑scoped one g8 already uses elsewhere — which waits on the "Reserve
line" boundary (§8.7). Whether Lacks may ever say "firmest in the store" is
genuinely records‑dependent (full assortment + a written definition of the
set) — §10. **Resolve together with A7.**

**Open items.** The official Reserve Royal (Cushion Firm) vs the Lacks SKU
(Extra Firm) are plausibly different badged SKUs (Restonic‑badged vs Spring
Air‑badged) rather than a contradiction — unconfirmed without lacks.com
access.

---

### A17 — g3 · The Palermo (Chattam & Wells, Gold, firmness 7)

**Field:** `differentiators[1].detail` — drawer only.
**String:** "Tufting locks the layers so the pillowtop can't shift or pocket over years of use."

**Disposition: REWRITE · Legal flag: no** per enumerated triggers (class D,
no health/efficacy/antimicrobial/patent/origin element) — **with the agent's
recommendation for legal review anyway**: the string makes a performance
representation the manufacturer's own warranty expressly disclaims, which is
warranty‑representation exposure at the point of sale · Confidence: high —
the contradiction is documented, not inferred.

**Elements:** (1) tufting locks the comfort layers; (2) "can't shift" —
absolute negative; (3) "can't … pocket" — absolute negative about body
impressions; (4) "over years of use" — unbounded durability promise.

**Evidence.**
- chattamandwells.com/craftsmanship **[PV]**: "the proven old traditional
  technique of hand tufting lives on with two times the amount of tufts,
  which gracefully compress every indulgent comfort layer to form a serene
  sleeping surface" — element 1 substantiated (2× tuft density, compresses
  and holds the layers). **No claim that tufting prevents shifting,
  settling, pocketing or impressions; no durability timeline** **[PV]**.
- chattamandwells.com/warranty **[PV]** — **directly contradicts elements
  2–4**: impressions under 1‑1/2″ are "normal and represents the conforming
  of the surface to the shape of the sleeper" (10‑Year, Non‑Prorated). The
  manufacturer's own warranty tells the buyer impressions are expected and
  not a defect; the catalog promises the opposite.
- springair.com Palermo product page: cooling knit, Talalay latex, natural
  wools, NanoCoils®, Quad coils, "Over 4,000 coils", 10‑year warranty — no
  shift/pocket/impression language.

**Searched, not found.** No tufting‑prevents‑X claim or stated durability
period on any of the three official pages; the only official tufting claim is
the craftsmanship sentence above.

**Rewrite guidance.** Drop elements 2–4 entirely — not merely unsupported but
affirmatively contradicted by the manufacturer's published warranty. Keep:
hand‑tufted build with twice the usual tuft count, compressing and holding
the comfort layers — present‑tense construction description only, no
future‑performance or non‑degradation promise.

**Open items.** Coil‑count note for whoever owns g3's other differentiator:
the catalog asserts a precise "4,294 coils"; Spring Air publishes only "Over
4,000". ES handoff note (recorded, no Spanish review performed): the EN/ES
pair for this field must be reviewed and fixed together when the
native‑Spanish pass happens — the research agent recorded an incidental
observation about the ES wording for that reviewer; no characterization of
it is made here.

---

### A18 — g9 · Copper Cushion Firm (Spring Air, Gold, firmness 6)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Copper fabric and foams dissipate heat and stay naturally fresher than standard foam."

**Disposition: REWRITE · Legal flag: YES** (antimicrobial/cleanliness
implication — enumerated trigger; inventory class B/E) · Confidence: high;
the negative search result is clean and repeated across three official
pages.

**Elements:** (1) copper fabric dissipates heat; (2) copper foams dissipate
heat; (3) "stay naturally fresher" — freshness/cleanliness,
antimicrobial‑adjacent; (4) "than standard foam" — unqualified comparative on
freshness; (5) "naturally" — inherent‑effect implication.

**Evidence.**
- springair.com Copper collection: "Patented Natuverex™ Copper fabric paired
  with copper‑infused memory foams for a cooler, healthier sleep experience";
  "resists microbial buildup"; "natural cleanliness of copper".
- springair.com copper‑benefits blog **[PV]**: "Copper transfers heat up to
  8× faster than conventional memory foam (Thermal Conductivity Handbook
  2023)" — the **only** substantiated comparative vs conventional foam, and
  it is about **heat transfer, not freshness**. "ISO 22196 tests show
  copper‑infused surfaces **can** reduce **certain** bacteria by > 99 %
  within two hours" — hedges the catalog dropped.
- springair.com Copper Hybrid product pages **[PV]**: manufacturer's own
  product‑level hedging — "**encourage** cooler and cleaner rest", "**assist
  in** temperature regulation and odor control" — which the catalog's flat
  "dissipate … and stay naturally fresher" removes.

**Searched, not found.** A freshness comparison against standard/conventional
foam: **nowhere on springair.com** — "fresher" as a comparative appears on no
official page. No product named exactly "Copper Cushion Firm" exists
upstream (nearest: "Copper Hybrid Cushion Firm Eurotop"). No EPA registration
number, no treated‑article statement, no substantiation of the ISO result
for the finished mattress (vs "copper‑infused surfaces" generically).

**Rewrite guidance.** Drop the entire "stay naturally fresher than standard
foam" clause — an antimicrobial/hygiene implication with no comparative
substantiation and no verifiable regulatory basis; the manufacturer's own
claim is the far narrower, hedged, article‑scoped "resists microbial
buildup"/"odor control". Keep the heat elements: copper‑infused cover and
foams aiding heat transfer; if a comparative is wanted, Spring Air's cited
"up to 8× faster than conventional memory foam" is the only one with a
stated basis and must travel with that basis. The heat half travels to legal
review with the cooling‑claims set (R4, §9).

**Open items (for counsel).** (a) US antimicrobial claims on treated
articles are EPA/FIFRA‑regulated; the treated‑article exemption permits
claims about protecting the **article**, not the sleeper — "stay naturally
fresher" sits at that boundary and g9's surrounding copy pushes it over
("a cleaner sleep" in `reasons.default`, "recovery benefits" in A3).
(b) `reasons.default` asserts "Patented NatuVerex" — patent status is a
Spring Air corporate record (§10). (c) The SKU identity mapping is
unverified (§3.3) — every claim on this model rests on it.

---

### A19 — g4 · Tempur‑LuxeBreeze 2.0 Soft (Tempur‑Pedic, Gold, firmness 2)

**Field:** `differentiators[0].title` — drawer only. (The compare
Difference row renders only the `.detail` half of this object — production
`index.html:18897` — so the title never reaches the compare surface; the
detail is A20.)
**String:** "Feels up to 10° cooler"

**Disposition: REWRITE · Legal flag: YES** (quantified performance claim
whose substantiation **exists** but depends on a disclosure the catalog
stripped — the classic qualified‑claim failure, worse than an unsourced
claim because the manufacturer's own practice establishes the qualifier as
material) · Confidence: high.

**Elements:** (1) quantified "up to 10°"; (2) hedge "Feels … up to" —
present and correctly reproduced; (3) comparison basis — **absent**; (4)
measurement basis and duration — **absent**; (5) unit of the figure —
absent (and absent upstream too).

**Evidence.**
- tempurpedic.com (three pages, consistent) **[PV]**: the headline is always
  "Feels Up to 10° Cooler" **with** the footnote: "LuxeBreeze® feels up to
  10 degrees cooler based on the average heat index increase of
  TEMPUR‑LuxeBreeze® compared to TEMPUR‑ProAdapt® models measured over an
  8‑hour period." The manufacturer **never publishes the number bare**
  **[PV]**. The footnote discloses: a heat‑**index** differential (not a
  temperature reading), vs **another Tempur‑Pedic model** (not the
  customer's bed or any absolute baseline), as an **average over 8 hours**
  (not a peak or continuous state). A showroom customer reading the bare
  title reasonably takes it as "this bed runs 10° cooler than what I sleep
  on now" — a materially different, unsubstantiated claim.

**Searched, not found.** No unfootnoted publication of the 10° claim
anywhere on tempurpedic.com; no model named "LuxeBreeze 2.0" (site names
TEMPUR‑LuxeBreeze® and LuxeBreeze® Hybrid in Soft/Firm/Medium‑Hybrid);
whether the published substantiation carries to a unit the retailer labels
"2.0" is not publicly determinable. The °F/°C gap originates upstream.

**Rewrite guidance.** RETAIN is forbidden even though the wording is
verbatim‑manufacturer: the source substantiates the number **only in company
with its comparison basis** — the rubric's "supports only a qualified
version" case exactly. Two owner‑choice paths: (a) keep the claim and attach
the manufacturer's basis in the same visual unit (a drawer title may not
have room — an implementation question, not just copy); or (b) drop the
number and keep the unquantified fact that this is Tempur‑Pedic's most
cooling‑focused construction. What must not survive is the bare number.
**The fix does not stay inside A19**: g4's `topPickReason` (A4, which adds
"all night" — unsupported by an 8‑hour *average*), `highlight` ("Feels up to
10° cooler, soft TEMPUR comfort") and `reasons.default` ("Tempur‑Pedic's
coolest mattress") all need the same qualifier decision (§8.3). Route with
the cooling‑claims legal set (R4, §9).

**Open items.** Tempur‑Pedic dealer claim sheet resolves the "2.0"
generation question and the °F/°C unit at once (§10).

---

### A20 — g4 · Tempur‑LuxeBreeze 2.0 Soft (Tempur‑Pedic, Gold, firmness 2)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Phase‑change cooling you can feel the moment you lie down — made for hot sleepers."

**Disposition: REWRITE · Legal flag: YES** (performance/efficacy claim
stated as guaranteed outcome; travels to review as one item with A19 —
same differentiator object) · Confidence: med‑high (medium only on the PCM
element; **both** readings forbid RETAIN).

**Elements:** (1) the cooling mechanism is phase‑change (PCM); (2) the
cooling is perceptible immediately on contact; (3) stated as fact about the
customer ("you **can** feel"), not design intent; (4) "made for hot
sleepers" — segment prescription.

**Evidence.**
- tempurpedic.com "all‑new TEMPUR‑Breeze" page **[PV]**: "Thanks to the
  heat‑absorbing fibers in our parented [sic — manufacturer's typo for
  'patented'] cool‑to‑the‑touch SmartClimate® Cover, you'll experience a
  cooling sensation from the moment you lie down." **The immediate
  on‑contact sensation is attributed to the SmartClimate cover's
  heat‑absorbing fibers — not to phase‑change material.** The catalog's
  attribution is a **mechanism misattribution**, not just an overreach.
- Same page **[PV]**: "our Pure Cool® Plus material, is designed to pull
  heat away from the body, so even the hottest of sleepers can stay cool
  throughout the night" — the hot‑sleeper framing is permissive ("even the
  hottest … **can** stay cool"), never prescriptive, and consistently
  hedged ("is designed to"), which the catalog drops.
- tempurpedic.com heat‑management page: "designed to draw heat away from the
  body from the moment you lie down"; "designed to provide an immediate
  cool‑to‑the‑touch feel" — design‑intent statements throughout; the
  manufacturer never states the outcome as fact about what the customer will
  feel.

**Searched, not found (reported explicitly).** The term "phase change
material" appears on **none** of the fetched tempurpedic.com pages **[PV**
for the all‑new‑Breeze page**]**. Search snippets attribute "Phase Change
Material" to PureCool+™, but that wording could not be landed on a fetched
official page — the PCM attribution is treated as **unconfirmed**,
fail‑closed. No "made for hot sleepers" or equivalent prescription found.

**Rewrite guidance.** Drop the segment prescription; drop or requalify the
guaranteed sensory outcome (the manufacturer's own register is "designed
to"). The PCM attribution must not survive in current form pending
verification: if the immediate on‑contact feel is what is described, the
manufacturer credits the SmartClimate cover's fibers, so naming phase‑change
as that sensation's mechanism is wrong even if PCM exists elsewhere in the
build. Keep: the multi‑layer cooling construction (cool‑to‑touch
SmartClimate® cover, heat‑diffusing layer, Pure Cool® Plus material)
designed to pull heat away from the body. Route with the cooling‑claims
legal set (R4, §9).

**Open items.** PCM verification and the "2.0" identity — both resolvable
from the Tempur‑Pedic dealer claim sheet alongside A19's questions (§10).

---

### A21 — g2 · The Saint Pierre (Chattam & Wells, Gold, firmness 3)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "A sink‑in soft surface for side sleepers who want cloud comfort without bottoming out."

**Disposition: REWRITE · Legal flag: no** (sleep *position* is a preference
segment, not an anatomical outcome; class D, no enumerated trigger) ·
Confidence: high — clean negatives on both defective elements, clean
positives on both survivors.

**Elements:** (1) soft, sink‑in surface; (2) "cloud comfort"; (3) "for side
sleepers" — segment prescription; (4) "without bottoming out" — absolute
performance promise.

**Evidence.**
- springair.com St Pierre page **[PV]**: "This mattress is incredibly
  soft—like sinking into a cloud at the end of the day"; "It cradles the
  body perfectly without that 'stuck' feeling you get from some softer
  beds"; NanoCoil®/micro‑coil over dual‑layered Quad coil system, 8,000+
  coils — elements 1–2 supported almost word for word. **Note on element 4:**
  "without that 'stuck' feeling" is **not** the same claim as "without
  bottoming out" — "stuck" is about the surface releasing you when you move;
  "bottoming out" is about comfort layers fully compressing under load.
  Reading one as support for the other would be a substitution, not a
  citation.
- `data/mattresses.json` g2 **[PV]**: firmness 3 "Plush";
  plush/soft/pressurerelief features — consistent with 1–2; nothing supports
  3–4.

**Searched, not found.** No side‑sleeper or sleep‑position recommendation
for the St Pierre on springair.com or chattamandwells.com **[PV]**; no
"bottoming out" or layers‑won't‑fully‑compress claim **[PV]**.

**Rewrite guidance.** Drop the segment prescription (also a
product‑coherence problem: it competes with the quiz's scoring) and the
absolute "without bottoming out" (the manufacturer's nearest sentence is a
different claim and must not be silently substituted). Keep: the super‑plush
euro‑top of natural wools and Talalay latex over a multi‑layer coil system —
the "sinking into a cloud" framing is available verbatim from Spring Air if
the authoring workflow wants it. If a support counterweight is wanted, the
citable fact is the 8,000+‑coil dual‑layered Quad system described as
"resilient support", stated as construction.

---

### A22 — s7 · Platinum Summit Plush (Restonic, Silver, firmness 3)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Gel‑infused foam keeps the soft layers from trapping heat."

**Disposition: REWRITE · Legal flag: no** per enumerated triggers (thermal
comfort, class D) — **with the agent's recommendation to review as one
cooling‑claims set with A10, A18's heat half, A19 and A20** (adopted, R4) ·
Confidence: medium (high that RETAIN is unavailable; medium because the
model's materials cannot be confirmed).

**Elements:** (1) gel‑infused foam present; (2) the soft layers do not trap
heat — thermal outcome; (3) "keeps … from" — absolute, unhedged; (4) scope:
the whole soft‑layer system.

**Evidence.**
- restonic.com ComfortCare Level 5 (not independently re‑fetched; the same
  technology block was primary‑verified on Level 1): TempaGel® — "gel that
  dissipates heat instead of storing it";
  CoolComfort Gel‑Infused Foam — "optimal surface cooling"; "Triple Cooling
  Technology Creates a cooling effect by gently moving heat away…". The
  manufacturer's strongest language is about the **gel material**, published
  for the **ComfortCare line** — not about the finished soft‑layer system of
  a Platinum Summit model. Its blog framing is weaker still ("Gel adds
  exceptional surface coolness").
- `data/mattresses.json` s7 **[PV]**: cooling + plush features; the Summit
  siblings (s5/s6) carry cool‑gel copy consistently — no internal
  contradiction.

**Searched, not found (stated plainly).** No "Platinum Summit Plush" page on
restonic.com; the agents' lacks.com searches surfaced other Restonic Platinum
models but no Summit. **No authoritative source confirms this SKU contains
gel‑infused foam at all** — element 1, the premise of the string, rests
solely on the catalog's own assertion.

**Rewrite guidance.** Drop the absolute system‑level promise — it admits no
variation by sleeper, room or bedding, and neither of the manufacturer's own
registers underwrites it. Keep, **contingent on spec confirmation**: a
gel‑infused memory‑foam comfort layer and its cooling function, phrased as
what the material does. Same overreach pattern as A19: the industry's
substantiated cooling language is comparative and qualified; the catalog's is
absolute.

**Open items.** SKU identity/bill of materials — ESCALATE‑class dependency;
one Restonic Platinum dealer spec sheet closes A22, A23 and A24 together
(§10).

---

### A23 — s7 · Platinum Summit Plush (Restonic, Silver, firmness 3)

**Field:** `differentiators[1].detail` — drawer only.
**String:** "Hybrid coils under the plush top prevent the hammock feel of all‑foam soft beds."

**Disposition: REWRITE · Legal flag: no** per enumerated triggers — **with
the agent's recommendation for legal review weighted higher than A17's**: an
unsubstantiated adverse factual assertion about a competing product category
is Lanham Act §43(a) false‑advertising territory, made on a sales‑floor
kiosk, and it disparages a category Lacks itself very likely stocks ·
Confidence: high on disposition and negatives; medium on the surviving fact
(SKU reason).

**Elements:** (1) coil unit beneath the plush layers; (2) "prevent" —
absolute; (3) all‑foam soft beds have a "hammock feel" — adverse factual
assertion about a competing category; (4) implied superiority over that
category.

**Evidence.**
- restonic.com hybrid explainer: "The springs provide the bounciness people
  love about innerspring mattresses while memory foam absorbs excess
  motion" — the manufacturer frames the hybrid's benefit **additively** and
  never disparages all‑foam construction (which Restonic itself sells).
- restonic.com ComfortCare Level 5: coil unit provides support and prevents
  motion transfer; nothing about hammocking or all‑foam comparison.
- `data/mattresses.json` s7 **[PV]**: hybrid feature — element 1 internally
  consistent, subject to the SKU caveat.

**Searched, not found (reported explicitly).** "Hammock", "sagging",
"sinking", or any characterization of all‑foam mattresses as hammock‑like:
**nowhere on restonic.com**; no test, survey or technical basis for the
characterization on any authoritative source.

**Rewrite guidance.** Drop the whole "prevent the hammock feel of all‑foam
soft beds" clause. Keep: this is a hybrid with a pocketed‑coil support unit
beneath the plush layers, stated affirmatively; any contrast must be a
neutral construction contrast, not an assertion that the other category
feels bad. **This is the clearest house‑style case in Block A: no
manufacturer evidence could ever rescue the claim, because it is about
someone else's product.** Worth checking whether Lacks stocks all‑foam soft
beds — if so, the string argues against Lacks' own inventory.

**Open items.** Same SKU dependency as A22 (§10).

---

### A24 — s3 · Platinum Maria Plush (Restonic, Silver, firmness 3)

**Field:** `differentiators[1].detail` — drawer only.
**String:** "Individually wrapped coils isolate motion and firm up under your hips."

**Disposition: REWRITE · Legal flag: YES** (anatomical‑outcome language —
"firm up under your hips" claims how the product acts on a body part; the
fix is narrow: the manufacturer's geometric framing says the same commercial
thing without the anatomical assertion) · Confidence: medium (high that
element 4 must go; medium overall — model‑level spec unverified).

**Elements:** (1) individually wrapped coils; (2) "isolate motion" —
absolute; (3) zoned behaviour ("firm up" in a region); (4) anatomical
localisation — "under your hips".

**Evidence.**
- restonic.com ComfortCare Level 5 (not independently re‑fetched; the
  Level 1 equivalent wording is primary‑verified): "1,000
  Series Individually Wrapped Coil Unit featuring the exclusive Marvelous
  Middle® prevents motion transfer between partners" — the unusual case
  where the manufacturer's wording is **stronger** than the catalog's
  ("prevents" vs "isolate"); the problem is **scope, not degree**: the claim
  belongs to the ComfortCare 800/1,000 Series units, not to this model.
- Same source (the identical sentence is primary‑verified on Level 1):
  "Delivers 25% more support in the center third of the mattress" — Restonic
  locates the effect at a **mattress‑geometry
  region** (center third) and quantifies it as **support**. The catalog
  relocates it to "under your hips" — converting a geometry spec into an
  anatomical claim — and s3's `reasons.default` separately renders it as
  "25% thicker center coils", a mis‑transcription (§8.4) that undercuts
  element 3 here: the catalog's own account of the zoning mechanism is
  wrong.
- `data/mattresses.json` s3 **[PV]**: zoned + motionisolation features,
  firmness 3 "Plush" — internally consistent.

**Searched, not found.** No "Platinum Maria Plush" on restonic.com; the
agents' lacks.com searches surfaced no Maria model. Neither the wrapped‑coil
unit nor the Marvelous Middle zoning is confirmable for this SKU from any
authoritative source. No Restonic claim locates the zoning effect at the
sleeper's hips.

**Rewrite guidance.** Drop "under your hips" — express the effect the way
the manufacturer does, as center‑third mattress geometry. Requalify the
zoning to what Restonic actually publishes (25% more support, not thicker
coils). "Isolate motion" may survive in substance **contingent on spec
confirmation** of which coil series this SKU uses — and even then the
qualified register is recommended over the manufacturer's absolute
"prevents", since motion isolation varies with partner weight and movement.
Keep: individually wrapped coils; center‑third reinforcement if confirmed.

**Open items.** Which coil series (800/1,000/other) this SKU uses — if a
different unit, the motion claim loses its source entirely. One dealer spec
sheet closes A22/A23/A24 (§10).

---

## 8. Cross‑cutting findings

**8.1 One dealer‑materials request per brand closes most open items.**
A Tempur‑Pedic dealer claim sheet resolves A1/A4/A19/A20 (the "2.0"
generation question, the °F/°C unit, the PCM attribution). A Restonic
licensee spec‑sheet request resolves A5/A13 (coil unit), A15 (zoned system),
A22/A23/A24 (Platinum bill of materials), and the "hand‑made" question on
A7/A9. A Spring Air Copper spec/regulatory sheet closes A18's EPA question
and the Copper SKU identity. Recommendation: request once per brand, not
per row.

**8.2 Unverifiable‑SKU identity is a risk dimension the inventory does not
capture.** Five floor models carry names with no upstream referent (§3.3).
This is not a bad claim but a claim about a product whose identity cannot be
tied to any published specification. Worth adding to the inventory as a
dimension separate from claim class.

**8.3 The g4 cooling fix spans four fields, only two of which are Block A
rows.** A4 (`topPickReason`) and A19/A20 (`differentiators[0]`) are
dispositioned here; g4's `highlight` ("Feels up to 10° cooler, soft TEMPUR
comfort") and `reasons.default` ("Tempur‑Pedic's coolest mattress") carry
the same unqualified claim family and are **not** dispositioned here (out of
Block A scope) — they are recorded for the owner so the model is fixed
coherently, not field by field.

**8.4 The "25% thicker center coils" phrasing is a catalog‑wide
mis‑transcription.** Restonic publishes "25% **more support** in the center
third" (verified on two official pages **[PV]**). The catalog renders it as
"25% **thicker center coils**" on six models (s3, s4, s8, s10, b5, b6 —
capture descs and/or `reasons.default`/highlight fields), and an adjacent
seventh instance carries the same substitution without the number — b7's
`reasons.default` says "Restonic's thicker center coils". Thickness and
support are different quantities; no acceptable source states a thickness
percentage (s1 alone renders the manufacturer's correct "25% more support"
form). Only b5's and s3's Block A rows are dispositioned here; the phrasing
correction should ride whichever workflow touches the other five.

**8.5 The four price‑leadership claims are mutually exclusive and must be
ruled on together.** A6 (s10) plus reason_default rows B5 (b4), B6 (b7) and
B7 (b6) — the brief's contradiction #1. A6's price clause is refuted
arithmetically by the catalog itself; fixing the four one at a time leaves
survivors that contradict each other. B5/B6/B7 are outside Block A and are
not dispositioned here.

**8.6 Two rows' firmness words disagree with the screen.** The customer
sees the display label for the firmness bucket, so A3's "cushion‑firm"
renders as "Firm" and A4's "soft" renders as "Plush". Any rewrite should use
the destination surface's own vocabulary.

**8.7 "The Reserve line" has no settled boundary.** subBrand "Reserve" =
{g6, g7}; g8 is "Royal Reserve"; Spring Air's official Reserve collection is
five models including the Royal; yet g8's `reason_default` claims membership
("The firmest bed in the Reserve line" — intra‑catalog true only if Royal
Reserve counts). A9's and A16's rewrites cannot be scoped until the owner
settles the boundary (three candidate definitions: the two Lacks Mayfair
SKUs; those plus Royal Reserve; Spring Air's five‑model collection).

**8.8 Engine coherence note (recorded, not a claim defect).** The
`motionisolation` feature tag scores zero today (casing defect, brief §1) —
s9's card promises motion isolation while the scoring that routed the
customer there ignored it. Already tracked with the brief's §1 findings.

**8.9 Spanish handoff note (no Spanish review was performed).** The EN side
of A17 is being rewritten; its ES counterpart must not be fixed
independently — the future native‑Spanish claim‑equivalence review should
handle the pair together (the research agent recorded an incidental
observation about the ES wording for that reviewer; no characterization of
it is made here). The paired‑Spanish deferral and the open native‑Spanish
review gate are unchanged by this document.

## 9. Coupling registry — rows that must be resolved together

| Set | Members | Why |
|---|---|---|
| s9 motion promise | **A5 + A13** | Same promise, same model, two surfaces (Results card + drawer/compare) |
| g8 | **A7 + A16** | Same model; prescription + superlative share the "Reserve line" and luxury‑positioning questions |
| g4 cooling | **A4 + A19 + A20** (+ g4 `highlight`, `reasons.default` — out of scope, recorded §8.3) | One qualifier decision governs all |
| Reserve boundary | **A9 + A16** (+ g8 `reason_default`, out of scope) | Neither rewrite scopes until the line's membership is settled (§8.7) |
| Marvelous Middle quantification | **A12 + A24** (+ s4/s8/s10/b6 phrasing, out of scope, §8.4) | One correct manufacturer figure |
| Price leadership | **A6** (+ B5/B6/B7, out of scope, §8.5) | Four mutually exclusive claims |
| Cooling‑claims legal set | **A10 + A18 (heat half) + A19 + A20 + A22** | One house rule on how absolute a thermal claim may be (R4) |
| Platinum spec set | **A22 + A23 + A24** | One Restonic dealer spec sheet closes all three |

## 10. Records‑dependent element register (fail‑closed)

Elements dropped or blocked by REWRITE dispositions that may be revisited
**only** when the named record arrives. Until then each stays out, by
omission.

| Element | Rows | Record required |
|---|---|---|
| "Hand‑made" | A7, A9 | Restonic Texas licensee written confirmation of what "hand‑made" covers for these builds (also bears on the `locallyMade` +25 scoring flag). Ask specifically whether Spring Air publishes line‑level "Handcrafted Reserve" copy — an unlandable search snippet suggests it (§6 R1); confirmation would reopen R1 |
| "2.0" model identity; °F/°C unit; PCM attribution | A1, A4, A19, A20 | Tempur‑Pedic dealer claim sheet |
| Kendall coil‑unit spec; Platinum Summit/Maria bill of materials and coil series; Summit zoned‑system question; Mayfair "Medium" comfort variant | A5, A9, A13, A15, A22, A23, A24 | Restonic licensee spec sheets |
| Copper SKU identity; EPA/treated‑article status | A3, A18 | Spring Air spec/regulatory sheet |
| Store‑wide rankings ("in the store") | A4, A16 | Lacks full‑assortment records + a written definition of the comparison set — and even then, the cross‑brand performance superlative (A4) additionally needs commissioned comparative testing |
| Patent status (Marvelous Middle®, Natuverex™) | A12, A14, A18 (record‑only) | Restonic / Spring Air corporate records — no catalog string asserts a patent directly today; the flag guards attribution wording |
| Live lacks.com PDP content (post‑2026‑07‑30) | all lacks‑cited rows; specifically A3 | Browser‑session check of the live pages |

Two dropped elements are deliberately **not** in this register because no
record could bring them back: **A6's price clause** is refuted by the
catalog itself under every reading of "class" (a future assortment change
could ground a *different* claim, but nothing rehabilitates this one as
written), and **A8's "most luxurious in the store"** is unresolvable by any
record or test — "luxurious" has no measurable definition. Both are dropped
outright, with no return path.

## 11. What this document deliberately does not do

- It **authors no replacement copy** — REWRITE guidance is structural only;
  copy goes through the authoring workflow with owner and (where flagged)
  legal approval, and the native‑Spanish review gate applies before any
  Spanish content activates.
- It changes **no** catalog data, production file, prototype, fixture,
  scoring logic, schema, or protected contract, and moves **no** roadmap
  status. Phase 0.4 remains open; Phase 1 implementation remains
  unauthorized.
- It dispositions **only** the 24 Block A rows. Block B/C observations
  (§8.3–8.5) are recorded as context, not dispositioned.
- It performed **no Spanish review** (owner's explicit deferral decision,
  2026‑08‑07, stands; §8.9 is a handoff note, not review output).

## 12. Verification ledger

**Independently re‑fetched and confirmed by the primary (2026‑08‑07),**
marked **[PV]** in the rows: chattamandwells.com `/warranty` and
`/craftsmanship`; tempurpedic.com Breeze collection pages (both URLs) and
the "all‑new TEMPUR‑Breeze" article; restonic.com ComfortCare Level 1 and
`/explore`; springair.com Reserve collection, Reserve Mayfair Eurotop Plush,
Copper Hybrid Cushion Firm Eurotop, the copper‑benefits blog post, and the
Chattam & Wells St Pierre page (fetched twice — positive facts, then
negatives). Every quoted sentence relied on above was confirmed verbatim or
near‑verbatim on the cited page.

**Verified directly against the repository at base `bdf56d0`:** all 24 row
strings vs `data/mattresses.json`; the firmness‑8 four‑way tie; gold‑tier
firmness spread; the soft‑end cooling pair (g4, s7); the full 26‑model price
census and the A6 refutation (promo and regular prices); subBrand
Reserve/Royal Reserve split; feature/tag sets for s2, s5, s7, s9, b5, g7,
g8; and all quoted capture descriptions (g2, g4, g7, g8, g9, s2, s5, s7,
s9, s10, b1, b5, b6) including the g9 "health/recovery angle" annotation.

**Accepted on the researching agent's report (not independently
re‑fetched):** restonic.com ComfortCare Level 4/Level 5, HealthRest Level 4,
the hybrid‑mattress blog explainer, the FAQ page, and the Scott Living /
Drew & Jonathan pages (A15's *against*‑evidence); springair.com C&W
collection page, Palermo product page, and Copper collection page (its key
sentences are corroborated verbatim by two primary‑verified pages);
tempurpedic.com heat‑management article; the agents' negative lacks.com
search results. None of these is the sole support for any disposition.

**Research‑model coverage disclosure:** the three research agents and the
primary ran on the same model family; this is convergent research, not
independent‑model replication.

**Adversarial review (pre‑commit, 2026‑08‑07).** The completed diff was
adversarially reviewed by a reused research agent (read‑only) against the
governing checklist: all seven items passed with **no blocking findings**.
Five should‑fix corrections were applied in this revision before commit —
a records‑register direction error (A6/A8 wrongly listed with a return
path), A19's production surface and non‑verbatim string (title‑only, drawer
only — verified against production `index.html:18897`), two register
omissions (A5/A13 coil‑unit spec; A9's comfort‑variant question), an
over‑ellipsized A1 quote that hid Tempur's own unqualified duration clause,
and a mis‑attributed A16 capture citation — plus the reviewer's applicable
notes (capture‑only caveat on A12's edge encasement; cooling‑set
back‑references on A18/A19/A20; the b7 "thicker center coils" variant; A6
price‑rank phrasing; narrowed Spanish handoff notes; clarified [PV]
placement on Level‑5 quotes; the Spring Air "Handcrafted Reserve" open
thread on R1). The reviewer independently re‑fetched eight load‑bearing
citations and re‑verified the intra‑catalog assertions; all held. With the
A19 correction, all 24 quoted strings are verbatim against
`data/mattresses.json` at base.
