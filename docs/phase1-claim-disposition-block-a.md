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
`main` = `bdf56d0`. Revised 2026‑08‑08 per Codex's independent review of the
first commit (`1e49dc9`): Codex confirmed all 24 REWRITE dispositions and
required targeted corrections, applied in this revision and itemized in §6
and §12. Legal and regulatory observations throughout this document are
issue‑spotting by non‑lawyers — potential risks identified for qualified
legal/compliance review, never legal conclusions or advice.

---

## 1. Scope and provenance

The 24 rows below are **Block A** of the 83‑row preliminary claim‑risk
inventory in `docs/phase1-catalog-reason-authoring-brief.md` (appendix), as
recorded on PR #18 at `8e850c4`. That inventory artifact lives on PR #18's
reviewed commit and is **not present on `main`**; this PR does not import or
merge the prototype/research package. The stable provenance link for the
inventory used here is:
<https://github.com/beford782/LacksFurniture/blob/8e850c43b96e99a008a3a6eb617a8c6c1ffee44e/docs/phase1-catalog-reason-authoring-brief.md>

Block A is every Tier‑D/E string that **renders in the production
application today**. Rows A1–A11 are `topPickReason` strings (Results
cards); rows A12–A24 are `differentiators` strings. The production rendering
rule (verified against `index.html`, drawer renderer and compare renderer at
`index.html:18897`): the mattress drawer renders **both** the title and the
detail of every differentiator; the compare modal's Difference row renders
**only** `differentiators[0].detail`. Rows marked "compare" in the table are
those whose dispositioned string reaches that surface.

All 24 quoted strings are extracted from `data/mattresses.json` at the base
commit and verified programmatically for **exact code‑point equality**
(24/24 — §12); the row set matches the brief's appendix exactly, each row
appears exactly once, and no row outside Block A is dispositioned here.

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
  catalog itself and cannot be repaired by narrowing. RETIRE maps to the
  authoring brief's retirement workflow (`retired` + `retiredReason`):
  withdraw from rendering, don't delete — the record stays for audit with
  date and reason, and ids are never reused. It is the repository‑aligned
  equivalent of removing a claim from rendering while preserving its audit
  record; no separate "REMOVE" state exists.
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
   finals; where price arithmetic is cited (A6's per‑reading
   illustrations), the regular prices preserve the same orderings, so those
   illustrations are robust to promotion changes.
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
3. **Several Lacks SKUs require exact upstream mapping confirmation before
   published claims can be attached to them.** The gap differs by model —
   for the Tempur‑Pedic units a current upstream product line clearly
   exists and the open question is generation/SKU mapping; for the Spring
   Air Copper unit a strong plausible upstream referent exists and the open
   question is exact build equivalence; for the Restonic Platinum models no
   model‑level page exists on restonic.com and the gap is model‑level
   licensee documentation. "Not found on restonic.com" is a negative about
   the corporate site only — Restonic is a licensee cooperative, and
   licensee records may exist; it is not proof that no upstream or licensee
   record exists anywhere. Mapping status:

   | Lacks ID | Lacks SKU | Captured product name | Plausible upstream line/model | Mapping status | Unresolved question | Required record |
   |---|---|---|---|---|---|---|
   | g5 | 1302592 | Queen Tempur-Pro-Breeze 2.0 Medium Hybrid Mattress 10Yr Limited Warranty | TEMPUR‑ProBreeze® (current published line, [T1]) | line exists; generation mapping unconfirmed | does the Lacks "2.0" unit map to the current published construction and claims (incl. the 5° basis)? | Tempur‑Pedic dealer claim sheet |
   | g4 | 1302546 | Queen Tempur-Luxe Breeze 2.0 2.0 Soft Mattress 10Yr Limited Warranty | TEMPUR‑LuxeBreeze® Soft (current published line, [T1]) | line exists; generation mapping unconfirmed | same, for the 10° basis; °F/°C unit; PCM attribution | Tempur‑Pedic dealer claim sheet |
   | g9 | 2037053 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted Queen Mattress | Copper Hybrid Cushion Firm Eurotop ([S1]) | strong plausible referent; build equivalence unconfirmed — [S1] lists a 16.5‑inch height vs the captured 13.5‑inch (top style "Quilted" matches) | exact build/SKU equivalence; whether each published material/regulatory claim applies to SKU 2037053 | Spring Air spec/regulatory sheet |
   | s7 | 1990916 | Restonic Platinum Summit 13.8" Hybrid Plush Tight Top Queen Mattress | none found on restonic.com (licensee‑built line) | model‑level specification gap | bill of materials (gel layer; coil‑unit series) | Restonic Texas licensee records |
   | s3 | 1990900 | Restonic Platinum Maria 15.25" Hybrid Plush Box Top Queen Mattress | none found on restonic.com (licensee‑built line) | model‑level specification gap | coil‑unit series; Marvelous Middle® applicability | Restonic Texas licensee records |

   Until the named record confirms the mapping, claims published for the
   upstream line cannot be attached to the Lacks SKU — a risk dimension the
   inventory's A–E ladder does not currently capture (see §8.2).

## 4. Outcome summary

**All 24 rows: REWRITE. 0 RETAIN, 0 RETIRE, 0 row‑level ESCALATE. 16 rows
carry LEGAL‑REVIEW‑REQUIRED under the rubric's enumerated triggers; 4
further rows carry ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED (§4.1).**

Not one string was substantiated as written; not one was empty underneath.
Every row wraps a real construction or material fact in at least one
overreach, falling into five repeating shapes:

1. An express‑substantiation word with nothing behind it ("proven" — A1, A2).
2. A manufacturer's qualified number stripped of its mandatory qualifier
   (the Tempur "10°/5° cooler" family — A1, A4, A19).
3. A store‑ or class‑wide superlative that is undefined, unverifiable in
   principle, or in tension with the catalog's own data (A4, A6, A7, A8,
   A9, A16 — each row states which applies; A16's "firmest" is contradicted
   by the catalog's four‑way firmness‑8 tie, while A6's price clause is
   unsubstantiated because its comparison set is undefined, not
   universally refuted — see A6).
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
| A6 | s10 Kendall Extra Firm | topPickReason (Results) | D | REWRITE | no¹ | current price clause dropped; a new price claim = new authoring decision (§10) |
| A7 | g8 Royal Reserve Extra Firm | topPickReason (Results) | D | REWRITE | **YES** | "hand‑made" |
| A8 | g2 The Saint Pierre | topPickReason (Results) | D | REWRITE | no | — |
| A9 | g7 Reserve Mayfair Medium | topPickReason (Results) | D | REWRITE | **YES** | "hand‑made"; SKU comfort variant |
| A10 | s7 Platinum Summit Plush | topPickReason (Results) | D | REWRITE | **YES** (see §6 R4) | SKU identity |
| A11 | b1 Giselle Plush | topPickReason (Results) | D | REWRITE | no | — |
| A12 | b5 Angelina Plush | differentiators[0] (title: drawer; detail: drawer+compare) | E | REWRITE | **YES** | Marvelous Middle patent status |
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

¹ No flag under the rubric's enumerated triggers;
ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED — see §4.1 and the row block.

### 4.1 Legal/counsel review queue

Two distinct categories, recalculated directly from the row dossiers. All
entries are issue‑spotting by non‑lawyers: they identify potential risks
requiring qualified legal/compliance review, and make no legal
determinations.

**LEGAL‑REVIEW‑REQUIRED (rubric's enumerated triggers) — 16 rows:**
A1, A2, A3, A4, A5, A7, A9, A10, A12, A13, A14, A15, A18, A19, A20, A24.

**ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED (outside the strict flag) — 4
rows:**
- **A6** — inherits the preliminary inventory's "merch + legal" routing;
  unqualified price‑leadership claims are a recognized potential
  advertising‑risk area. The rubric's enumerated triggers do not cover
  price claims, which is why the flag is "no"; the inventory's routing is
  honored through this category.
- **A17** — potential warranty/advertising consistency concern (the
  string's relationship to the manufacturer's published warranty terms).
- **A22** — rides the cooling‑claims set review (R4).
- **A23** — potential comparative‑advertising risk (adverse assertion about
  a competing product category).

**Total operational queue before counsel: 20 of 24 rows** (16 required + 4
recommended; no row is counted in both categories). Overlap note: the
cooling‑claims set (R4, §9) spans both categories — A10, A18, A19, A20 are
required‑flag rows and A22 is a recommended row; routing the set as one
item reviews all five together without double‑counting. Conditional
mentions that are **not** counted in either category: A11 (its dossier
notes a stricter reviewer *may* want the price element reviewed with the
price‑leadership cluster) and A16 (reviewed alongside flagged A7 by the g8
coupling rather than on its own ground).

## 5. How to read the row blocks

Each block preserves the researching agent's findings in normalized form:
the verbatim string, its discrete claim elements, evidence with quotes and
what each bears on, explicit negative results, the disposition with
structural rewrite guidance (never replacement copy), the legal flag with its
ground, confidence, and open items. Citations marked **[PV]** were
independently re‑fetched and confirmed by the primary (2026‑08‑07, and
re‑verified 2026‑08‑08 in the Codex correction pass); bracketed source IDs
like [T1] or [R1] resolve to literal URLs in the evidence‑reference ledger
(§13), which also lists the citations accepted on agent report alone.

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

**R2 — Mapping‑gap rows stay REWRITE, with execution blocked.** For
A18, A19/A20, A22, A23 and A24 the exact SKU/generation mapping to a
published upstream specification is unconfirmed (§3.3 table — the gap
ranges from generation mapping on the Tempur units, to build equivalence on
the Copper unit, to model‑level licensee documentation on the Platinum
models), so even the *kept* construction facts rest on an unresolved
identity mapping. Group 3 recommended REWRITE because the wording defects are
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

**Codex correction pass (2026‑08‑08).** Codex independently reviewed the
first commit, confirmed all 24 REWRITE dispositions, and required targeted
corrections, all applied in this revision. The prior conclusions they
replace are historical only and no longer represent this document's
position: (1) A6's price clause was previously called "refuted under every
reading of class" — corrected to *unsubstantiated* (undefined comparison
set, dynamic undated prices, no rendered price context), with the catalog
arithmetic retained as illustrations, not universal refutation; (2) A17's
warranty finding was previously called a direct contradiction — corrected
to *unsupported/not established by the cited sources*, with the warranty
undermining a broad no‑impressions reading without disproving the tufting
mechanism; (3) the legal queue was split into required vs
counsel‑recommended categories (§4.1) and neutral risk language replaced
statutory characterizations; (4) "five models have no upstream referent"
was corrected to the per‑model mapping‑status table (§3.3); (5) the "25%
thicker center coils" finding was recast from a proven mis‑transcription to
an unresolved source conflict pending licensee records (§8.4); (6) all 24
quoted strings were restored to exact source code points (11 had been
typography‑normalized with non‑breaking hyphens) and are now verified
programmatically; (7) A12's surface was split precisely (title: drawer
only; detail: drawer + compare); (8) RETIRE was mapped to the brief's
retirement workflow (§2); (9) an evidence‑reference ledger with literal
URLs was added (§13) and every load‑bearing source re‑fetched — during
which one further evidence correction surfaced: A21's "sinking into a
cloud"/"stuck" sentences are a customer review on the Spring Air page, not
manufacturer copy, and are no longer relied on (see A21); (10) three
send‑ready dealer/licensee evidence requests were drafted for owner review
(Appendix A — NOT SENT).

---

## 7. Row dossiers

### A1 — g5 · Tempur‑ProBreeze 2.0 Medium Hybrid (Tempur‑Pedic, Gold, firmness 5)

**Field:** `topPickReason` — Results cards.
**String:** "Proven all-night cooling with adaptive TEMPUR contour and hybrid support."

**Disposition: REWRITE · Legal flag: YES** (express substantiation:
"proven") · Confidence: high.

**Elements:** (1) "Proven" — express substantiation attached to cooling
performance; (2) "all‑night cooling" — unqualified duration promise;
(3) "adaptive TEMPUR contour" — material fact; (4) "hybrid support" —
construction fact.

**Evidence.**
- Tempur‑Pedic Breeze cooling page [T3] **[PV]**: "TEMPUR‑Breeze®
  mattresses utilize our proven cooling materials to create an all‑night
  cooling experience that lasts from the minute you lie down to the moment
  you wake up." — "proven" modifies the **materials**, not the cooling
  performance; the catalog's syntax moves it onto the performance claim. Note
  the second clause: Tempur asserts the all‑night duration **in its own
  voice, unqualified** — no qualified duration framing exists anywhere on
  the page. The page cites no study, test method, or third‑party validation
  for "proven" **[PV]** (the sentence appears on [T3]; the Breeze collection
  pages [T1]/[T2] do not use "proven" — re‑verified 2026‑08‑08). The only
  quantified, substantiated claim is the footnoted
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
- restonic.com ComfortCare Level 1 [R1] **[PV]**: "800 Series Individually
  Wrapped Coil Unit featuring the exclusive Marvelous Middle® prevents
  motion transfer between partners. Delivers 25% more support in the center
  third of the mattress." Center‑third zoning is a real, manufacturer‑
  documented feature — Restonic's published quantification is **25% more
  support**; the capture's "25% thicker center coils" is a conflicting
  formulation whose direction cannot be resolved without the licensee's
  model‑level record (§8.4).
- `data/mattresses.json` b5 + capture (sku 1991876): firmness 3 "Plush";
  features plush/soft/pressurerelief/zoned; badge "Marvelous Middle"; capture
  desc "25% thicker center coils for shoulder/hip pressure relief … popular
  with side sleepers" **[PV]** — note "popular with", a popularity
  observation, not a fit prescription; and note the unresolved
  thickness‑vs‑support formulation conflict (§8.4).

**Searched, not found.** No Angelina page on restonic.com; no manufacturer
pressure‑relief or side‑sleeper claim tied to ComfortCare (the only
pressure‑relief language found on restonic.com is in a customer review); no
use of "proven" by Restonic in this context **[PV** for the Level‑1 page's
absence of side‑sleeper/pain language**]**.

**Rewrite guidance.** Drop "proven" (bare express substantiation) and the
side‑sleeper prescription. Keep: plush surface (firmness 3) and the zoned
center‑third construction — quantified only in whichever form the
licensee's model‑level record confirms; do not attach either the "25% more
support" or the "25% thicker" figure to this SKU without that confirmation
(§8.4). "Pressure relief" should be reviewed rather than carried as‑is: its
only support is Lacks' own marketing copy — circular for substantiation
purposes even though lacks.com is an admissible source class.

**Open items.** The "25% thicker center coils" ↔ "25% more support"
unresolved source conflict (also A12, §8.4).

---

### A3 — g9 · Copper Cushion Firm (Spring Air, Gold, firmness 6)

**Field:** `topPickReason` — Results cards.
**String:** "Copper cooling and recovery benefits with balanced cushion-firm hybrid support."

**Disposition: REWRITE · Legal flag: YES** (health/therapeutic outcome:
"recovery"; antimicrobial‑adjacent context; Tier E element) · Confidence:
high. **Highest‑risk row in group 1.**

**Elements:** (1) "Copper cooling" — material + thermal; (2) "recovery
benefits" — physiological/therapeutic outcome; (3) "balanced cushion‑firm" —
firmness; (4) "hybrid support" — construction.

**Evidence.**
- springair.com Copper Hybrid Cushion Firm Eurotop product page [S1]
  **[PV]**: copper materials "pulling heat away from your body", cover
  "resists microbial buildup", "Proudly crafted in the USA", hybrid. The
  word "recovery" **does not appear** **[PV]**.
- springair.com Copper collection [S3] **[PV]**: "Patented Natuverex™ Copper
  fabric paired with copper‑infused memory foams for a cooler, healthier
  sleep experience"; no recovery claim ("recovery" absent from the whole
  page, re‑verified 2026‑08‑08).
- springair.com copper‑benefits blog [S2] **[PV]**: the only recovery‑adjacent
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
Lacks is the speaker on two surfaces. The upstream mapping to Spring Air's
Copper Hybrid Cushion Firm Eurotop is plausible but unconfirmed at build
level (§3.3 — [S1] lists 16.5″ vs the captured 13.5″). Display‑label note:
the authored "cushion‑firm" renders to the customer as "Firm" (firmness‑6
bucket), so the string's own firmness word does not match the screen (§8.6).

---

### A4 — g4 · Tempur‑LuxeBreeze 2.0 Soft (Tempur‑Pedic, Gold, firmness 2)

**Field:** `topPickReason` — Results cards.
**String:** "The coolest-sleeping soft mattress in the store — up to 10° cooler all night."

**Disposition: REWRITE · Legal flag: YES** (quantified performance claim
severed from its mandated qualifier; inventory routes "Tempur‑Pedic +
legal") · Confidence: high.

**Elements:** (1) store‑wide cross‑brand superlative, definite article;
(2) "up to 10° cooler" — quantified thermal claim stripped of "feels", the
comparator, and the measurement basis; (3) "all night" — duration; (4)
"soft" — firmness descriptor.

**Evidence.**
- Tempur‑Pedic Breeze pages [T1]/[T2]/[T4] **[PV]**: the claim exists only
  as "Feels Up to 10° Cooler" with the mandatory footnote: "LuxeBreeze®
  feels up to 10 degrees cooler based on the average heat index increase of
  TEMPUR‑LuxeBreeze® compared to TEMPUR‑ProAdapt® models measured over an
  8‑hour period." A heat‑**index** average vs **Tempur's own ProAdapt**, over
  8 hours — not a thermometer reading, not vs the customer's bed, not a
  continuous state. Tempur's own superlative is brand‑line scoped
  ("Offering your coolest night's sleep yet…" — on the Breeze article
  [T4]), never cross‑brand.
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
**String:** "Serious extra-firm zoned support at the best price in its class."

**Disposition: REWRITE · Legal flag: no¹** under the rubric's enumerated
triggers, which do not cover price claims; **ADDITIONAL‑COUNSEL‑REVIEW‑
RECOMMENDED** (§4.1) — the preliminary inventory routes this row "merch +
legal", and unqualified price‑leadership claims are a recognized potential
advertising‑risk area for qualified review · Confidence: high.

**Elements:** (1) "extra‑firm"; (2) "zoned support"; (3) "the best price";
(4) "in its class" — undefined comparison set.

**Evidence.** The price clause is **unsubstantiated as written**: its
comparison set ("its class") is undefined in the rendered claim, its price
basis is dynamic with no disclosed measurement date or validity period, and
the app renders no price context a customer could evaluate. The catalog
arithmetic below **illustrates why the claim cannot be accepted without a
defined class** — the claim's truth value changes with the reading — not a
universal refutation:
- Capture + `data/mattresses.json` **[PV]** (2026‑07‑30 promotional prices;
  regular prices preserve every ordering cited): under a cross‑tier
  "extra‑firm zoned" reading, **b6 — the same extra‑firm zoned hybrid
  profile (same "Marvelous Middle" badge, same center‑coil desc) — is $500
  less than s10** ($799 vs $1,299; s2 $2,199; g8 $3,099, not zoned). Under
  a whole‑Silver‑tier reading, s10 **ties s8 and s9** at the tier's lowest
  promotional price ($1,299) — tied‑for‑lowest, not unique leadership,
  though a tie does not by itself disprove "best price". Under a
  Silver‑tier‑extra‑firm‑zoned reading, s10 **may be the lowest‑priced
  qualifying model** (s2 at $2,199 is the only other candidate). No reading
  is authoritative because none is disclosed.
- Elements 1–2 substantiated (features firm/support/zoned/hybrid) **[PV]**.

**Searched, not found.** No manufacturer source can substantiate price
leadership — it is an assortment fact; and because the claim's comparison
set is undefined, no record could be checked against the claim as written.

**Rewrite guidance.** Drop the current price clause — unsubstantiated for
the reasons above. Keep: extra‑firm (8) zoned hybrid tight‑top support. A
**newly authored** price claim could be considered only with: (i) a written
comparison‑set definition; (ii) a dated full‑assortment price census;
(iii) a validity/expiration rule; (iv) merchandising approval; and (v) any
legal/compliance review that qualified reviewers require (§10). **Must be
ruled together with the other three price‑leadership claims**
(reason_default rows B5 b4, B6 b7, B7 b6 — outside Block A): all four use
undefined comparison sets and, ruled independently, can contradict each
other (§8.5).

---

### A7 — g8 · Royal Reserve Extra Firm (Restonic, Gold, firmness 8)

**Field:** `topPickReason` — Results cards.
**String:** "Hand-made extra-firm support — the choice for back and stomach sleepers who want luxury."

**Disposition: REWRITE · Legal flag: YES** ("hand‑made" is a
manufacturing‑provenance representation in the origin family, on a model
carrying `locallyMade: true` which awards +25 in scoring) · Confidence:
medium (high that the prescription must drop; the hand‑made element is
records‑dependent).

**Elements:** (1) "Hand‑made" — manufacturing method; (2) "extra‑firm
support"; (3) "the choice for back and stomach sleepers" — definite‑article
segment prescription; (4) "who want luxury" — positioning.

**Evidence.**
- restonic.com homepage [R5] **[PV]**: brand tagline "Handcrafted mattresses
  since 1938" (brand‑wide, not SKU substantiation); /explore [R4]'s
  **title** is "Handmade Quality Mattresses" but its **body makes no
  handmade or manufacturing‑method claim at all** **[PV]**.
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
- springair.com St Pierre Super Plush Eurotop [S7] **[PV]**: "Cashmere,
  Merino and Camel wool provide a natural approach…"; "NanoCoil® and micro
  coil layer adapt to movement, paired with a dual‑layered Quad coil system
  for resilient support. With over 8,000 coils…" — elements 2 and 3 fully
  and precisely substantiated. The page uses "spa‑like luxury" as a product
  descriptor, never a model‑vs‑model ranking **[PV]**.
- springair.com C&W collection [S9] **[PV]**: St Pierre is the line's
  highest‑priced model ($7,499.99 MSRP vs Roma $6,499.99, Palermo
  $5,099.99–$5,599.99, re‑verified 2026‑08‑08); the collection is "the
  pinnacle of mattress artistry" — supports "top of the Chattam & Wells
  line", a manufacturer‑line claim, never a store‑wide one.
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
**String:** "Hand-made luxury in a true medium — the most versatile bed in the Reserve line."

**Disposition: REWRITE · Legal flag: YES** ("hand‑made"
manufacturing‑provenance representation on a `locallyMade: true` model; see
R1) · Confidence: high on the superlative; medium on hand‑made.

**Elements:** (1) "Hand‑made"; (2) "luxury" (puffery); (3) "a true medium" —
firmness; (4) "the most versatile bed in the Reserve line" —
definite‑article ranked superlative on an unmeasurable attribute.

**Evidence.**
- springair.com Reserve collection [S5] **[PV]**: the official Reserve line
  is five models (Imperial Eurotop Ultra Plush, Mayfair Eurotop Plush, Royal
  Cushion Firm, Cathedral Plush, Cardinal Firm) — **no Medium exists in the
  manufacturer's line at all**, and the page states no ranking among its
  members **[PV]**.
- springair.com Reserve Mayfair Eurotop Plush (nearest official SKU) [S6]
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
- restonic.com ComfortCare Level 1 [R1] **[PV]** and /explore [R4]:
  "CoolComfort Gel‑Infused Foam… Provides optimal surface cooling,
  cushioning and conformability"; "Creates a cooling effect by gently moving heat away from
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

**Field:** `differentiators[0]` (title + detail). The **title renders in
the drawer only**; the **detail renders in the drawer and in the compare
modal's Difference row** (compare renders only `.detail` —
`index.html:18897`).
**String:** title "Shoulder-and-hip relief" | detail "The plush surface and center zoning target exactly where side sleepers ache."

**Disposition: REWRITE · Legal flag: YES** (Tier E: anatomical‑outcome title
+ express pain claim + segment prescription; patent‑adjacent use of the
Marvelous Middle mark without ® or attribution) · Confidence: high.

**Elements:** (1) "Shoulder‑and‑hip relief" — bare anatomical‑outcome
promise; (2) "plush surface and center zoning" — construction; (3) "target
exactly" — absolute precision; (4) "where side sleepers ache" — pain claim +
segment prescription.

**Evidence.**
- restonic.com /explore [R4] **[PV]**: "Patented Marvelous Middle®
  technology delivers 25% more support in the middle of the mattress, where
  you need it most"; "Extra lumbar support in the center third."
  ComfortCare Level 1 [R1] **[PV]**: "…Delivers 25% more support in the
  center third of the mattress." The zoning is real and named; Restonic's
  published quantification is **support**, while the capture states **coil
  thickness** — an unresolved source conflict (§8.4).
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
center‑zoned coil unit — quantified only per the licensee's model‑level
confirmation (Restonic's published wording is "25% more support in the
center third" [R4]/[R1]; the capture's "25% thicker center coils" is a
conflicting formulation — attach neither figure to this SKU until the
record resolves which applies, §8.4) — and the 3‑inch HD foam edge
encasement, noting the encasement is capture‑sourced only (Lacks' own
copy — the same self‑sourcing caveat A2 applies to "pressure relief";
confirm it on the licensee spec sheet). The same review must resolve the
thickness‑vs‑support conflict wherever the phrasing appears (§8.4).

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
- restonic.com ComfortCare Level 1 [R1] **[PV]** (same wording at Level 5
  [R3] and HealthRest Level 4 [R6]): "…Individually Wrapped Coil Unit
  featuring the exclusive Marvelous Middle® prevents motion transfer
  between partners" — element 1 substantiated for the ComfortCare line; the
  manufacturer's motion claim is itself absolute ("prevents") but is about
  **motion transfer**, never a waking/sleep outcome.
- springair.com Mayfair page [S6] **[PV]**: "reduced motion transfer" — the
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
- restonic.com /explore [R4] **[PV]**: "Patented Marvelous Middle®
  technology delivers 25% more support in the middle of the mattress…";
  "Extra lumbar support in the center third" — the feature is real and the
  closest supportable benefit is lumbar support in the center third, which
  is neither hip‑leveling nor positional.
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
the center‑third reinforcement itself, with proper attribution to Restonic's
Marvelous Middle® — quantified only per the licensee's model‑level
confirmation (Restonic's published wording is "25% more support in the
center third" / "extra lumbar support in the center third" [R4]; do not
attach a figure to this SKU without that confirmation, §8.4).

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
  [R1] **[PV]** and from HealthRest Level 4 [R6]; restonic.com has no
  Platinum line at all.
- restonic.com gel materials (Level 1 [R1] **[PV]**, /explore [R4]): "CoolComfort
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
- springair.com Reserve collection [S5] **[PV]**: the official line has no
  Extra Firm at all; the official Reserve Royal is **Cushion Firm**; no
  firmness ranking or "sleep on top" language on the Reserve Royal page.
  Capture g8 **[PV]**: "Hand‑made hybrid, natural materials, extra firm
  support" — extra‑firm positioning supported, no superlative.
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

**Disposition: REWRITE · Legal flag: no¹** per enumerated triggers (class D,
no health/efficacy/antimicrobial/patent/origin element);
**ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED** (§4.1) — the string's relationship
to the manufacturer's published warranty terms presents a potential
warranty/advertising consistency concern for qualified review, and a kiosk
is a sales channel · Confidence: high on the unsupported‑overreach finding;
the warranty tension is documented, though it is a consistency concern
rather than a direct disproof of the tufting mechanism.

**Elements:** (1) tufting locks the comfort layers; (2) "can't shift" —
absolute negative; (3) "can't … pocket" — absolute negative about body
impressions; (4) "over years of use" — unbounded durability promise.

**Evidence.**
- chattamandwells.com/craftsmanship [C2] **[PV]**: "The proven old
  traditional technique of hand tufting lives on with two times the amount
  of tufts, which gracefully compress every indulgent comfort layer to form
  a serene sleeping surface" — element 1's construction fact substantiated
  (2× tuft density; tufting compresses the comfort layers). **No claim that
  tufting prevents shifting, settling, pocketing or impressions; no
  durability timeline** **[PV]**.
- chattamandwells.com/warranty [C1] **[PV]** — bears on elements 2–4
  **without establishing them**: the warranty treats impressions under
  1‑1/2″ as "normal and represents the conforming of the surface to the
  shape of the sleeper" (10‑Year, Non‑Prorated), and separately lists "Tuft
  Straps that have become dislodged into the mattress" as a covered defect.
  It contains no statement about comfort layers shifting or "pocketing".
  This **undermines any broad no‑impressions reading** of the catalog
  string, but it does not equate normal impressions with layer shifting or
  pocketing (no cited source defines "pocket"), does not establish that
  normal impressions result from layer movement, and does not show the
  tufting mechanism fails.
- springair.com Palermo product page [S8] **[PV]**: cooling knit, Talalay
  latex, natural wools, NanoCoils®, Quad coils, "Over 4,000 coils", 10‑year
  warranty — no shift/pocket/impression language (re‑verified 2026‑08‑08).

**Searched, not found.** No tufting‑prevents‑X claim or stated durability
period on any of the three official pages; the only official tufting claim is
the craftsmanship sentence above.

**Rewrite guidance.** Drop elements 2–4 entirely — absolute negatives and an
unbounded durability promise that **no cited source establishes**; the
warranty's normalization of sub‑1½″ impressions additionally cuts against
any broad no‑impressions reading. Keep: hand‑tufted build with twice the
usual tuft count, compressing the comfort layers — present‑tense
construction description only, no future‑performance or non‑degradation
promise.

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
- springair.com Copper collection [S3] **[PV]**: "Patented Natuverex™
  Copper fabric paired with copper‑infused memory foams for a cooler,
  healthier sleep experience"; "resists microbial buildup"; "natural
  cleanliness of copper". (Upstream spelling is itself inconsistent —
  "Natuverex™" in the collection tagline, "NatuVerex" in product
  descriptions — a detail for the Spring Air request, Appendix A.)
- springair.com copper‑benefits blog [S2] **[PV]**: "Copper transfers heat
  up to 8× faster than conventional memory foam (Thermal Conductivity
  Handbook 2023)" — the **only** substantiated comparative vs conventional
  foam, and it is about **heat transfer, not freshness**. "ISO 22196 tests
  show copper‑infused surfaces **can** reduce **certain** bacteria by > 99 %
  within two hours" — hedges the catalog dropped.
- springair.com Copper Hybrid product pages [S1]/[S4] **[PV]**:
  manufacturer's own product‑level hedging — "**encourage** cooler and
  cleaner rest", "**assist in** temperature regulation and odor control" —
  which the catalog's flat "dissipate … and stay naturally fresher" removes.

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

**Open items (potential risks for qualified review — not legal
conclusions).** (a) Antimicrobial claims on treated articles are a
regulated area (EPA/FIFRA treated‑article rules); whether "stay naturally
fresher" is permissible, in what form, and how the surrounding g9 copy
("a cleaner sleep" in `reasons.default`, "recovery benefits" in A3) bears
on it are questions for qualified legal/compliance review. (b)
`reasons.default` asserts "Patented NatuVerex" — patent status is a Spring
Air corporate record (§10). (c) The upstream mapping is plausible but
unconfirmed at build level (§3.3 — [S1] lists 16.5″ vs the captured
13.5″); each published claim's applicability to SKU 2037053 rests on it.

---

### A19 — g4 · Tempur‑LuxeBreeze 2.0 Soft (Tempur‑Pedic, Gold, firmness 2)

**Field:** `differentiators[0].title` — drawer only. (The compare
Difference row renders only the `.detail` half of this object — production
`index.html:18897` — so the title never reaches the compare surface; the
detail is A20.)
**String:** "Feels up to 10° cooler"

**Disposition: REWRITE · Legal flag: YES** (quantified performance claim
whose substantiation **exists** but depends on a disclosure the catalog
stripped — a potential qualified‑claim substantiation concern for qualified
review; the manufacturer's own consistent disclosure practice indicates it
treats the qualifier as material) · Confidence: high.

**Elements:** (1) quantified "up to 10°"; (2) hedge "Feels … up to" —
present and correctly reproduced; (3) comparison basis — **absent**; (4)
measurement basis and duration — **absent**; (5) unit of the figure —
absent (and absent upstream too).

**Evidence.**
- tempurpedic.com ([T1], [T2], [T4] — consistent **in substance** across
  all three) **[PV]**: the headline is always "Feels Up to 10° Cooler"
  **with** a footnote stating the basis; the quoted long form is [T2]/[T4]'s
  wording — "LuxeBreeze® feels up to 10 degrees cooler based on the average
  heat index increase of TEMPUR‑LuxeBreeze® compared to TEMPUR‑ProAdapt®
  models measured over an 8‑hour period" — while [T1] carries an
  abbreviated wording of the same basis. The manufacturer **never publishes
  the number bare** **[PV]**. The footnote discloses: a heat‑**index** differential (not a
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
**String:** "Phase-change cooling you can feel the moment you lie down — made for hot sleepers."

**Disposition: REWRITE · Legal flag: YES** (performance/efficacy claim
stated as guaranteed outcome; travels to review as one item with A19 —
same differentiator object) · Confidence: med‑high (medium only on the PCM
element; **both** readings forbid RETAIN).

**Elements:** (1) the cooling mechanism is phase‑change (PCM); (2) the
cooling is perceptible immediately on contact; (3) stated as fact about the
customer ("you **can** feel"), not design intent; (4) "made for hot
sleepers" — segment prescription.

**Evidence.**
- tempurpedic.com "all‑new TEMPUR‑Breeze" article [T4] **[PV]**: "Thanks to the
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
- tempurpedic.com heat‑management article [T5] **[PV]** (re‑verified
  2026‑08‑08): "designed to draw heat away from the body from the moment
  you lie down"; "designed to provide an immediate cool‑to‑the‑touch feel"
  — design‑intent statements throughout; the manufacturer never states the
  outcome as fact about what the customer will feel.

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
**String:** "A sink-in soft surface for side sleepers who want cloud comfort without bottoming out."

**Disposition: REWRITE · Legal flag: no** (sleep *position* is a preference
segment, not an anatomical outcome; class D, no enumerated trigger) ·
Confidence: high on the dropped elements (clean negatives on 3–4); element
1's super‑plush surface is manufacturer‑supported, while element 2's cloud
framing lost its only source in this revision's review reclassification.

**Elements:** (1) soft, sink‑in surface; (2) "cloud comfort"; (3) "for side
sleepers" — segment prescription; (4) "without bottoming out" — absolute
performance promise.

**Evidence.**
- springair.com St Pierre page [S7] **[PV]**: the **manufacturer's
  description** supports element 1 (a soft, super‑plush surface) — "The
  St. Pierre Super Plush Euro Top pairs cooling knit, natural wools,
  Talalay latex, and 8,000+ coils for spa‑like luxury"; "indulgent comfort
  with precision support" — plus the NanoCoil®/micro‑coil layer over a
  dual‑layered Quad coil system. **Attribution correction (this
  revision):** the page's "like sinking into a cloud" and "without that
  'stuck' feeling" sentences sit in a **customer review** on the page
  (re‑verified 2026‑08‑08), not in manufacturer copy — under the rubric
  they are not substantiation and are no longer relied on, **which removes
  element 2's ("cloud comfort") only source**.
  **Note on element 4:** the review's "stuck" sentence would in any case be
  a different claim from "without bottoming out" — "stuck" is about the
  surface releasing you when you move; "bottoming out" is about comfort
  layers fully compressing under load. Reading one as support for the other
  would be a substitution, not a citation.
- `data/mattresses.json` g2 **[PV]**: firmness 3 "Plush";
  plush/soft/pressurerelief features — consistent with 1–2; nothing supports
  3–4.

**Searched, not found.** No side‑sleeper or sleep‑position recommendation
for the St Pierre on springair.com or chattamandwells.com **[PV]**; no
"bottoming out" or layers‑won't‑fully‑compress claim **[PV]**.

**Rewrite guidance.** Drop the segment prescription (also a
product‑coherence problem: it competes with the quiz's scoring) and the
absolute "without bottoming out" (no manufacturer sentence supports it, and
the review's "stuck" sentence is a different claim that must not be
substituted). Keep: the super‑plush euro‑top of natural wools and Talalay
latex over a multi‑layer coil system. Subjective sink‑in/cloud framing has
**no manufacturer source** on this page — the cloud sentence is a customer
review — so if such framing is wanted it is an authoring choice to be made
in the authoring workflow, not a citation. If a support counterweight is
wanted, the citable fact is the 8,000+‑coil dual‑layered Quad system
described as "resilient support", stated as construction.

---

### A22 — s7 · Platinum Summit Plush (Restonic, Silver, firmness 3)

**Field:** `differentiators[0].detail` — drawer + compare Difference row.
**String:** "Gel-infused foam keeps the soft layers from trapping heat."

**Disposition: REWRITE · Legal flag: no¹** per enumerated triggers (thermal
comfort, class D); **ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED** (§4.1) — rides
the cooling‑claims set review with A10, A18's heat half, A19 and A20
(adopted, R4) · Confidence: medium (high that RETAIN is unavailable; medium
because the model's materials cannot be confirmed).

**Elements:** (1) gel‑infused foam present; (2) the soft layers do not trap
heat — thermal outcome; (3) "keeps … from" — absolute, unhedged; (4) scope:
the whole soft‑layer system.

**Evidence.**
- restonic.com ComfortCare Level 5 [R3] **[PV]** (re‑fetched 2026‑08‑08;
  confirmed verbatim): TempaGel® — "gel that
  dissipates heat instead of storing it";
  CoolComfort Gel‑Infused Foam — "optimal surface cooling"; "Triple Cooling
  Technology creates a cooling effect by gently moving heat away…". The
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
**String:** "Hybrid coils under the plush top prevent the hammock feel of all-foam soft beds."

**Disposition: REWRITE · Legal flag: no¹** per enumerated triggers;
**ADDITIONAL‑COUNSEL‑REVIEW‑RECOMMENDED** (§4.1), weighted higher than
A17's by the researching agent: an unsubstantiated adverse factual
assertion about a competing product category presents a **potential
comparative‑advertising risk requiring qualified legal/compliance review**,
it is made on a sales‑floor kiosk, and it disparages a category Lacks
itself very likely stocks · Confidence: high on disposition and negatives;
medium on the surviving fact (SKU reason).

**Elements:** (1) coil unit beneath the plush layers; (2) "prevent" —
absolute; (3) all‑foam soft beds have a "hammock feel" — adverse factual
assertion about a competing category; (4) implied superiority over that
category.

**Evidence.**
- restonic.com hybrid explainer [R7]: "The springs provide the bounciness
  people love about innerspring mattresses while memory foam absorbs excess
  motion" — the manufacturer frames the hybrid's benefit **additively** and
  never disparages all‑foam construction (which Restonic itself sells).
- restonic.com ComfortCare Level 5 [R3] **[PV]**: coil unit provides support
  and prevents motion transfer; nothing about hammocking or all‑foam
  comparison.
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
- restonic.com ComfortCare Level 5 [R3] **[PV]** (re‑fetched 2026‑08‑08):
  "1,000 Series Individually Wrapped Coil Unit featuring the Marvelous
  Middle® prevents motion transfer between partners" (the page renders the
  unit name both with and without "exclusive" — heading vs full
  description; [R1]'s description form, quoted at A13, includes it) — the
  unusual case
  where the manufacturer's wording is **stronger** than the catalog's
  ("prevents" vs "isolate"); the problem is **scope, not degree**: the claim
  belongs to the ComfortCare 800/1,000 Series units, not to this model.
- Same source [R3] **[PV]**: "Delivers 25% more support in the center third
  of the mattress" — Restonic locates the effect at a **mattress‑geometry
  region** (center third) and quantifies it as **support**. The catalog
  relocates it to "under your hips" — converting a geometry spec into an
  anatomical claim — and s3's `reasons.default` separately renders it as
  "25% thicker center coils", a formulation in **unresolved conflict** with
  Restonic's published wording (§8.4). Until the licensee record resolves
  which formulation applies to this SKU, neither quantification can be
  attached to it, which leaves element 3's mechanism unconfirmed.
- `data/mattresses.json` s3 **[PV]**: zoned + motionisolation features,
  firmness 3 "Plush" — internally consistent.

**Searched, not found.** No "Platinum Maria Plush" on restonic.com; the
agents' lacks.com searches surfaced no Maria model. Neither the wrapped‑coil
unit nor the Marvelous Middle zoning is confirmable for this SKU from any
authoritative source. No Restonic claim locates the zoning effect at the
sleeper's hips.

**Rewrite guidance.** Drop "under your hips" — express the effect the way
the manufacturer does, as center‑third mattress geometry. Requalify the
zoning per the licensee's model‑level confirmation: Restonic's only
published wording is "25% more support in the center third" [R3]/[R1], the
capture's "thicker coils" formulation is in unresolved conflict with it
(§8.4), and neither figure should be attached to this SKU without that
record. "Isolate motion" may survive in substance **contingent on spec
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
and the Copper build‑equivalence question. Recommendation: request once per
brand, not per row. Send‑ready drafts of all three requests are in
Appendix A — **NOT SENT; owner review required**.

**8.2 Exact upstream mapping is a risk dimension the inventory does not
capture.** Five floor models require SKU/generation/build mapping
confirmation before published upstream claims can be attached to them
(§3.3 table — the gap ranges from generation mapping to build equivalence
to model‑level licensee documentation). This is not a bad claim but a claim
whose product identity is not yet tied to a confirmed specification. Worth
adding to the inventory as a dimension separate from claim class.

**8.3 The g4 cooling fix spans four fields, only two of which are Block A
rows.** A4 (`topPickReason`) and A19/A20 (`differentiators[0]`) are
dispositioned here; g4's `highlight` ("Feels up to 10° cooler, soft TEMPUR
comfort") and `reasons.default` ("Tempur‑Pedic's coolest mattress") carry
the same unqualified claim family and are **not** dispositioned here (out of
Block A scope) — they are recorded for the owner so the model is fixed
coherently, not field by field.

**8.4 The "25% thicker center coils" phrasing is an unresolved source
conflict — a suspected transcription issue pending model‑level
specifications.** Restonic's corporate site publishes "25% **more support**
in the center third" ([R1], [R3], [R4] — the only currently published
manufacturer wording, primary‑verified on three pages). The dated
Lacks/licensee capture renders "25% **thicker center coils**" on six models
(s3, s4, s8, s10, b5, b6 — capture descs and/or `reasons.default`/highlight
fields), and an adjacent seventh instance carries the same substitution
without the number — b7's `reasons.default` says "Restonic's thicker center
coils" (s1 alone renders the "25% more support" form). Thickness and
support are different quantities, so at most one formulation is correct
**per SKU** — but the available evidence establishes the conflict, not the
direction of the error: a generic corporate statement cannot prove that a
specific Texas‑licensee build lacks physically thicker center coils, and
the model‑level licensee specifications are missing. **Both formulations
fail closed for quantified production copy** until the licensee record
resolves which applies to each SKU. Only b5's and s3's Block A rows are
dispositioned here; the conflict resolution should ride whichever workflow
touches the other five models.

**8.5 The four price‑leadership claims must be ruled on together, under one
class definition.** A6 (s10) plus reason_default rows B5 (b4), B6 (b7) and
B7 (b6) — the brief's contradiction #1. All four use undefined comparison
sets ("its class", "in the store", etc.); A6's clause is unsubstantiated as
written (see A6), and ruled independently under different implicit
readings, the four can contradict each other. B5/B6/B7 are outside Block A
and are not dispositioned here.

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
| Marvelous Middle quantification | **A12 + A24** (+ s4/s8/s10/b6/b7 phrasing, out of scope, §8.4) | One unresolved thickness‑vs‑support conflict — resolve per licensee record |
| Price leadership | **A6** (+ B5/B6/B7, out of scope, §8.5) | Four undefined comparison sets — one class definition must govern all |
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

**A8's "most luxurious in the store"** is deliberately not in this
register: no record or test could resolve a subjective cross‑brand
superlative — "luxurious" has no measurable definition — so the element is
dropped outright with no return path. **A6's current price clause** is
likewise dropped as written (undefined comparison set, dynamic undated
prices, no rendered price context); a future price claim would be a **new
authoring decision**, not a revival of this string, and requires a written
comparison‑set definition, a dated full‑assortment price census, a
validity/expiration rule, merchandising approval, and any legal/compliance
review that qualified reviewers require (see A6).

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

**Independently re‑fetched and confirmed by the primary,** marked **[PV]**
in the rows: every source listed as primary‑verified in the
evidence‑reference ledger (§13), first on 2026‑08‑07 and re‑fetched
2026‑08‑08 during the Codex correction pass — all 25 external sources in
the ledger (the 26th entry, [L1], is the repository capture; within [R9]
only the Drew & Jonathan sibling pages remain agent‑reported), including
every load‑bearing citation. Every quoted sentence
relied on above was confirmed verbatim or near‑verbatim on the cited page.
The 2026‑08‑08 re‑fetch surfaced one evidence correction (A21's
"cloud"/"stuck" sentences are customer‑review content, not manufacturer
copy — see A21 and §6) and one upstream detail (the Natuverex™/NatuVerex
spelling inconsistency — see A18).

**Verified directly against the repository at base `bdf56d0`:** all 24 row
strings vs `data/mattresses.json` — **programmatic exact code‑point
comparison, 24/24 exact, zero normalization differences** (A12 verified as
its exact title and exact detail); the firmness‑8 four‑way tie; gold‑tier
firmness spread; the soft‑end cooling pair (g4, s7); the full 26‑model price
census and the A6 price illustrations (promo and regular prices); subBrand
Reserve/Royal Reserve split; feature/tag sets for s2, s5, s7, s9, b5, g7,
g8; all quoted capture descriptions (g2, g4, g7, g8, g9, s2, s5, s7,
s9, s10, b1, b5, b6) including the g9 "health/recovery angle" annotation;
and the production rendering rule (drawer renders title + detail; compare
renders only `differentiators[0].detail` — `index.html:18897`).

**Accepted on the researching agent's report (not independently
re‑fetched):** only the agents' negative lacks.com **search results** (live
fetches were blocked, §3.1) and the Drew & Jonathan page within [R9] (its
Scott Living sibling was re‑fetched and confirms the same 5‑zone claim
pattern). Every cited page in §13 was otherwise primary‑verified on
2026‑08‑08. None of the agent‑reported items is the sole support for any
disposition.

**Research‑model coverage disclosure:** the three research agents and the
primary ran on the same model family; this is convergent research, not
independent‑model replication.

**First‑pass adversarial review (historical — pre‑commit `1e49dc9`,
2026‑08‑07).** The first version of this document was adversarially
reviewed by a reused research agent (read‑only): no blocking findings; five
should‑fix corrections and applicable notes were applied before the first
commit; the reviewer independently re‑fetched eight load‑bearing citations
and re‑verified the intra‑catalog assertions, all of which held. (That
review's closing statement that all 24 quoted strings were verbatim was
itself later found imprecise: Codex's review of `1e49dc9` identified 11
strings whose ASCII hyphens had been typography‑normalized to non‑breaking
hyphens. This revision restored exact source code points, now verified
programmatically — 24/24 exact.)

**Codex correction pass (2026‑08‑08).** Codex independently reviewed
`1e49dc9`, confirmed all 24 REWRITE dispositions, and required the ten
corrections itemized in §6, all applied in this revision. As part of the
pass, every primary‑verifiable cited URL was re‑fetched and confirmed
(§13), the exact‑string comparison was made programmatic and reproducible,
and the production surfaces were re‑verified against `index.html`. A final
read‑only adversarial review of the corrected document preceded the
correction commit.

## 13. Evidence‑reference ledger

Every external source cited in this document, with literal URLs. All URLs
below were fetched and confirmed on 2026‑08‑08 (the Codex correction pass);
"primary‑verified" means the primary fetched the page and confirmed the
quoted propositions on it. Quotations throughout this document are excerpts
for traceability, not reproductions of the pages.

| ID | Organization | Page title | URL | Retrieved | Verification | Rows supported | Material limitation |
|---|---|---|---|---|---|---|---|
| T1 | Tempur‑Pedic | TEMPUR‑Breeze® \| Tempur‑Pedic | <https://www.tempurpedic.com/shop-mattresses/tempur-breeze/> | 2026‑08‑08 | primary‑verified | A4, A19, §3.3 | marketing page; both 10° and 5° claims carry the ++ footnote |
| T2 | Tempur‑Pedic | TEMPUR‑Breeze® \| Tempur‑Pedic | <https://www.tempurpedic.com/shop-mattresses/breeze-collection/> | 2026‑08‑08 | primary‑verified | A4, A19 | does **not** contain "proven"; 10° footnote present |
| T3 | Tempur‑Pedic | How TEMPUR‑Breeze® Cooling Works \| Tempur‑Pedic | <https://www.tempurpedic.com/shop-mattresses-pillows/breeze-collection/> | 2026‑08‑08 | primary‑verified | A1 | sole located instance of the "proven cooling materials" sentence |
| T4 | Tempur‑Pedic | The All‑New TEMPUR‑Breeze® (article, 2023‑05‑24) | <https://www.tempurpedic.com/tempur-love/the-all-new-tempur-breeze/> | 2026‑08‑08 | primary‑verified | A4, A19, A20 | 2023 editorial article; may lag current product pages |
| T5 | Tempur‑Pedic | How TEMPUR‑Breeze® Helps Manage Heat for a Cooler Night's Sleep | <https://www.tempurpedic.com/tempur-love/how-tempur-breeze-helps-manage-heat-for-a-cooler-nights-sleep/> | 2026‑08‑08 | primary‑verified | A20 | editorial article |
| C1 | Chattam & Wells | 10‑Year Warranty Non‑Prorated | <https://www.chattamandwells.com/warranty> | 2026‑08‑08 | primary‑verified | A17 | warranty terms; defines neither "shift" nor "pocket" |
| C2 | Chattam & Wells | Craftsmanship — Chattam & Wells | <https://www.chattamandwells.com/craftsmanship> | 2026‑08‑08 | primary‑verified | A17 | brand‑level craftsmanship page, not a SKU spec |
| S1 | Spring Air | Copper Hybrid Cushion Firm Eurotop – Spring Air | <https://www.springair.com/products/copper-hybrid-cushion-firm-eurotop> | 2026‑08‑08 | primary‑verified | A3, A18, §3.3 | lists 16.5″ height vs the captured 13.5″ Lacks SKU |
| S2 | Spring Air | Copper mattress benefits (blog) | <https://www.springair.com/blogs/news/copper-mattress-benefits-spring-air> | 2026‑08‑08 | primary‑verified | A3, A18 | blog; cites "Thermal Conductivity Handbook 2023" without a link |
| S3 | Spring Air | Copper by Spring Air (collection) | <https://www.springair.com/collections/copper> | 2026‑08‑08 | primary‑verified | A3, A18 | 11 models, none named exactly "Copper Cushion Firm"; Natuverex™/NatuVerex spelling inconsistent on‑site |
| S4 | Spring Air | Copper Hybrid Firm Eurotop – Spring Air | <https://www.springair.com/products/copper-hybrid-firm-eurotop> | 2026‑08‑08 | primary‑verified | A18 | sibling model (Firm, not Cushion Firm) |
| S5 | Spring Air | Reserve by Spring Air (collection) | <https://www.springair.com/collections/reserve-by-spring-air> | 2026‑08‑08 | primary‑verified | A9, A16 | Spring Air‑badged line; the Lacks Reserve SKUs are Restonic‑badged |
| S6 | Spring Air | Reserve Mayfair Eurotop Plush – Spring Air | <https://www.springair.com/products/reserve-mayfair-eurotop-plush> | 2026‑08‑08 | primary‑verified | A9, A13 | Eurotop Plush comfort — not the Lacks Medium Tight Top variant |
| S7 | Spring Air | Chattam & Wells St Pierre Super Plush Eurotop | <https://www.springair.com/products/chattam-wells-st-pierre-super-plush-eurotop> | 2026‑08‑08 | primary‑verified | A8, A21 | the "cloud"/"stuck" sentences on this page are a customer review, not manufacturer copy |
| S8 | Spring Air | Chattam & Wells Palermo Pillowtop | <https://www.springair.com/products/chattam-wells-palermo-pillowtop> | 2026‑08‑08 | primary‑verified | A17 | publishes "Over 4,000 coils" vs the catalog's precise 4,294 |
| S9 | Spring Air | Chattam & Wells (collection) | <https://www.springair.com/collections/chattam-wells> | 2026‑08‑08 | primary‑verified | A8 | MSRPs are Spring Air DTC prices, not Lacks prices |
| R1 | Restonic | ComfortCare® Level 1 – Restonic | <https://restonic.com/mattress/comfortcare-level-1> | 2026‑08‑08 | primary‑verified | A2, A5, A10, A12, A13, A14, A15, §8.4 | corporate Level‑line page; no Lacks model names exist on restonic.com |
| R2 | Restonic | ComfortCare® Level 4 – Restonic | <https://restonic.com/mattress/comfortcare-level-4> | 2026‑08‑08 | primary‑verified | A5, A13 | 1,000 Series wording |
| R3 | Restonic | ComfortCare® Level 5 – Restonic | <https://restonic.com/mattress/comfortcare-level-5> | 2026‑08‑08 | primary‑verified | A13, A22, A23, A24, §8.4 | corporate Level‑line page; no Lacks model names |
| R4 | Restonic | Handmade Quality Mattresses \| Restonic (/explore) | <https://restonic.com/explore> | 2026‑08‑08 | primary‑verified | A7, A9, A12, A14, A15 | page **title** says "Handmade"; body makes no manufacturing‑method claim |
| R5 | Restonic | Restonic Mattress \| Handcrafted mattresses since 1938 (homepage) | <https://restonic.com/> | 2026‑08‑08 | primary‑verified | A7, A9, §3.2 | brand‑level tagline only; lists four collections, none matching Lacks model names |
| R6 | Restonic | HealthRest Level 4 – Restonic | <https://restonic.com/mattress/healthrest-level-4> | 2026‑08‑08 | primary‑verified | A13, A15 | Level‑line page; confirms R1/R3 wording pattern |
| R7 | Restonic | Can a Hybrid Mattress Improve Your Sleep? – Restonic (blog) | <https://restonic.com/blog/hybrid-mattress> | 2026‑08‑08 | primary‑verified | A22, A23 | blog; "hammock" confirmed absent |
| R8 | Restonic | FAQ About Restonic Mattresses \| Restonic | <https://restonic.com/faq> | 2026‑08‑08 | primary‑verified | A13 | the disputing quote is customer‑review content, cited only as bearing against an absolute promise — never as substantiation |
| R9 | Restonic | Scott Living Signature Mattress – Restonic (+ Drew & Jonathan sibling pages, agent‑reported) | <https://restonic.com/mattress/scott-living-signature> | 2026‑08‑08 | primary‑verified (Scott Living); agent‑reported (Drew & Jonathan) | A15 | used only as evidence **against** A15 (the 5‑zone Q5S™ spinal‑alignment claim belongs to other collections) |
| L1 | Lacks (repository capture) | lacks.com REST API catalog capture | `incoming/lacks_catalog_selection.json` (repo path; `_meta.source`: "lacks.com /api/rest/categories/mattresses/products + mattress-accessories, scraped 2026-07-30 via browser session") | captured 2026‑07‑30 | repository record | all lacks‑side facts; §3.1 | dated snapshot; live lacks.com returned 403/429 to research fetches; prices are 2026‑07‑30 promotional finals |

## Appendix A — DRAFT REQUESTS — NOT SENT; OWNER REVIEW REQUIRED

Three send‑ready evidence requests, drafted for the owner's review. **None
has been sent; no manufacturer, licensee, or dealer has been contacted.**
Sending them, and to whom, is the owner's decision. Each request closes the
records‑dependent items in §10 for its brand. Common instruction embedded
in each: unsupported elements remain omitted from the kiosk until written
evidence arrives.

### A.1 Draft request — Tempur‑Pedic dealer/brand representative

> Subject: Claim‑substantiation documentation for two Tempur‑Pedic floor
> models (Lacks Furniture DreamFinder kiosk)
>
> We are reviewing the product claims our showroom kiosk displays for two
> Tempur‑Pedic units and need current dealer documentation before any
> claim language is used:
>
> - **Lacks SKU 1302592** — captured name "Queen Tempur-Pro-Breeze 2.0
>   Medium Hybrid Mattress 10Yr Limited Warranty" (our id g5); proposed
>   mapping: TEMPUR‑ProBreeze® Medium Hybrid.
> - **Lacks SKU 1302546** — captured name "Queen Tempur-Luxe Breeze 2.0
>   2.0 Soft Mattress 10Yr Limited Warranty" (our id g4); proposed
>   mapping: TEMPUR‑LuxeBreeze® Soft.
>
> Questions requiring written resolution:
> 1. Do these "2.0"‑labeled units correspond to the current published
>    TEMPUR‑ProBreeze®/TEMPUR‑LuxeBreeze® generation? If "2.0" denotes a
>    different generation, exactly which published claims apply to each
>    unit as built?
> 2. In "Feels up to 10° cooler" / "Feels up to 5° cooler": what unit does
>    the degree figure represent (°F, °C, or a heat‑index construct)?
> 3. The complete mandatory comparison/measurement qualifier for each
>    cooling claim (your sites publish: "…based on the average heat index
>    increase of TEMPUR‑[Luxe/Pro]Breeze® compared to TEMPUR‑ProAdapt®
>    models measured over an 8‑hour period") and the required presentation
>    of that qualifier in retail use.
> 4. Is Pure Cool®/Pure Cool® Plus a phase‑change material? Which
>    component produces the immediate cool‑to‑the‑touch sensation — the
>    SmartClimate® cover's heat‑absorbing fibers, a phase‑change layer, or
>    both?
> 5. Approved retailer claim language for these two units, with all
>    mandatory qualifiers, and trademark‑attribution requirements
>    (TEMPUR®, SmartClimate®, Pure Cool®).
>
> Requested documents: the current dealer claim sheet / retailer
> advertising guidelines covering these SKUs, with document revision and
> effective date, and written confirmation that the documentation applies
> to the exact units above as stocked. Until this arrives, unsupported
> claim elements remain omitted from our kiosk.

### A.2 Draft request — Restonic Texas licensee

> Subject: Model‑level specification and claim documentation for Restonic
> floor models (Lacks Furniture DreamFinder kiosk)
>
> Restonic's corporate site documents technologies (Marvelous Middle®,
> TempaGel®, CoolComfort, wrapped‑coil units) at the ComfortCare
> "Level" line level, but none of the model names we stock. We need
> model‑level licensee documentation for the following units before claim
> language is used:
>
> | Lacks id | SKU | Captured product name |
> |---|---|---|
> | s9 | 1991879 | Restonic Kendall III Hybrid Luxury Medium Queen Mattress |
> | s10 | 1989356 | Restonic ComfortCare Kendall 14.5" Hybrid Extra Firm Tight Top Queen Mattress |
> | s8 | 1991904 | Restonic ComfortCare Kendall 15.5" Hybrid Firm Euro Top Queen Mattress |
> | b5 | 1991876 | Restonic Angelina Plush Queen Mattress (ComfortCare Angelina II 13") |
> | b6 | 1991866 | Restonic ComfortCare Angelina 13" Hybrid Extra Firm Queen Mattress |
> | s5 | 1990906 | Restonic Platinum Summit 13.8" Hybrid Firm Tight Top Queen Mattress |
> | s6 | 1990909 | Restonic Platinum Summit 13.8" Hybrid Medium Tight Top Queen Mattress |
> | s7 | 1990916 | Restonic Platinum Summit 13.8" Hybrid Plush Tight Top Queen Mattress |
> | s3 | 1990900 | Restonic Platinum Maria 15.25" Hybrid Plush Box Top Queen Mattress |
> | s4 | 1990893 | Restonic Maria Hybrid BT Firm Queen Mattress |
> | s1 | 1991909 | Restonic Platinum Paige 16" Hybrid Firm Box Top Queen Mattress |
> | s2 | 2029844 | Restonic Platinum Paige II 16" Hybrid Extra Firm Queen Mattress |
> | g6 | 1992762 | Restonic Reserve Mayfair 15" Hybrid Plush Euro Top Queen Mattress |
> | g7 | 1992759 | Restonic Reserve Mayfair 15" Hybrid Medium Tight Top Queen Mattress |
> | g8 | 1991959 | Restonic Royal Reserve 14" Hybrid Extra Firm Tight Top Queen Mattress |
> | b7 | 2030258 | Restonic Gracie II Medium Queen Mattress |
>
> Questions requiring written resolution:
> 1. Exact model‑to‑line mappings for each SKU (ComfortCare Level/series,
>    Platinum, Reserve — including the Reserve Mayfair "Medium Tight Top"
>    variant, which does not appear in the published Spring Air Reserve
>    collection).
> 2. The coil‑unit series in each SKU (800 Series, 1,000 Series, other),
>    and whether each carries Marvelous Middle®.
> 3. For the center‑third zoning: does "25% thicker center coils" (our
>    2026‑07‑30 lacks.com capture) or "25% more support in the center
>    third" (restonic.com) apply to each SKU — and what is the measurement
>    definition behind whichever figure is correct?
> 4. Bills of material: the gel comfort layer in the Platinum Summit
>    models; the support/zoning system in the Platinum Summit Firm (our
>    s5); full BOM for the Platinum Summit and Platinum Maria models;
>    edge‑encasement spec for the Angelina models.
> 5. Wrapped‑coil and motion‑transfer documentation, including any test
>    basis behind "prevents motion transfer between partners".
> 6. The meaning and SKU scope of "hand‑made"/"handcrafted" for the
>    Reserve Mayfair and Royal Reserve builds — in writing, stating which
>    processes it covers. Related: does Spring Air publish line‑level
>    "Handcrafted Reserve" copy?
> 7. Texas/licensee origin and assembly documentation for these SKUs
>    (this also bears on our kiosk's locally‑made designation).
> 8. Trademark/patent attribution requirements for Marvelous Middle®, and
>    its patent status, for retail use.
> 9. Current spec‑sheet revisions with effective dates, and written
>    confirmation that each record applies to the exact SKU/build stocked.
>
> Until this documentation arrives, unsupported claim elements remain
> omitted from our kiosk.

### A.3 Draft request — Spring Air dealer/brand representative

> Subject: Specification and claim documentation for the Copper hybrid
> floor model (Lacks Furniture DreamFinder kiosk)
>
> We stock one Spring Air Copper unit and need documentation tying
> published claims to the exact build:
>
> - **Lacks SKU 2037053** — captured name "Copper by SpringAir 13.5"
>   Hybrid Euro-Top Cushion Firm Quilted Queen Mattress" (our id g9);
>   proposed mapping: Copper Hybrid Cushion Firm Eurotop
>   (springair.com/products/copper-hybrid-cushion-firm-eurotop).
>
> Questions requiring written resolution:
> 1. Exact build/SKU equivalence: your published Copper Hybrid Cushion
>    Firm Eurotop lists a 16.5‑inch height; our unit is captured at 13.5
>    inches with a Quilted top. Is this the same model (different spec
>    revision, regional build, or a different model)? Which published
>    claims apply to SKU 2037053 as built?
> 2. The copper cover and copper‑infused foam bill of materials for this
>    SKU.
> 3. Approved cooling wording for retail use — including whether the
>    published "Copper transfers heat up to 8× faster than conventional
>    memory foam" comparative may be used at retail, and with what basis
>    statement.
> 4. NatuVerex/Natuverex: the correct spelling, trademark status, and
>    whether any patent representation is approved for retail use (your
>    collection page states "Patented Natuverex™").
> 5. Antimicrobial support: is the published ISO 22196 result
>    finished‑product or material‑level? Does the copper treatment have an
>    EPA registration or treated‑article status, if applicable — and what
>    freshness/cleanliness claims, if any, are approved for retail use?
> 6. Approved retailer claim language with all required qualifiers,
>    document revision/effective date, and written confirmation that the
>    documentation applies to SKU 2037053.
>
> Until this documentation arrives, unsupported claim elements remain
> omitted from our kiosk.
