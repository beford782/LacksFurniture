# Phase 1 research source appendix

Compact provenance for every external source the decision package uses
**materially** (i.e., a claim in the package's argumentation rests on it).
Each entry states what the source directly supports, the inference the
package proposes for DreamFinder, and the limitation of that inference.

**Standing caveat for every entry:** none of these sources studied a
salesperson-operated mattress-consultation kiosk. Every inference below is
a *heuristic to test* in the assisted-sales dry run
(`docs/phase1-assisted-sales-evaluation-packet.md`), not direct evidence of
DreamFinder behavior. Agent reviews, automated audits, screenshots and
heuristic walkthroughs are **not** customer research and do not upgrade
any entry.

## Correction: the withdrawn "50–80%" figure

An earlier head of this package stated that "Baymard measured 50–80% of
users overlooking collapsed content." That figure **could not be
re-verified against any checkable Baymard publication** during the
2026-08-07 correction pass and is **withdrawn**. What the checkable
sources actually support (entries 3–4 below) is qualitative: Baymard's
usability testing repeatedly observed participants overlooking product-page
content reachable only through horizontal tabs, and reports the *site-side*
statistic that 29% of sites still use such tabs; NN/g advises showing all
content when the majority of it is needed. The design consequence the
package draws (keep the "Try this" testing guidance always visible) is
retained — but on the strength of the qualitative guidance plus the shared-
screen operator-dependency argument, not a quantified overlook rate. Whether
a salesperson actually discovers and narrates a collapsed control in *this*
consultation is exactly the kind of question only the assisted-sales dry run
(capture item 4) can answer.

## Sources

| # | Source (URL) | Type | Population / context | What it directly supports | Proposed DreamFinder inference | Limitations |
|---|---|---|---|---|---|---|
| 1 | NN/g, "Progressive Disclosure" — https://www.nngroup.com/articles/progressive-disclosure/ | Practitioner guidance article | General UI design; not retail kiosks | "Disclose everything that users frequently need up front"; secondary screens are for rarely-needed features | The per-consultation "Try this" testing guidance is frequently-needed content and should not sit behind a disclosure | Heuristic guidance, not an empirical study of this product or of shared-screen use |
| 2 | GOV.UK Design System, "Details" component — https://design-system.service.gov.uk/components/details/ | Government design-system guidance | UK government web services | Verbatim: "Do not use the details component to hide information that the majority of your users will need." | Same inference as #1 | Government self-service context, not an assisted sale; guidance, not measurement |
| 3 | NN/g, "Accordions on Desktop" — https://www.nngroup.com/articles/accordions-on-desktop/ | Practitioner guidance article | Desktop web content pages | "When your audience requires the majority or all the content on the page … show all the content at once" | Tier content and testing guidance that the consultation always uses should render expanded | No numeric overlook rate; desktop web, not tablet kiosk; no empirical study cited in the article itself |
| 4 | Baymard Institute, "Product Page UX: Avoid 'Horizontal Tabs'" — https://baymard.com/blog/avoid-horizontal-tabs | E-commerce usability research (qualitative findings + site benchmark) | E-commerce product pages, moderated usability testing; desktop and mobile | Participants "repeatedly observed to overlook core product page content" behind horizontal tabs; 29% **of sites** still use them (a site statistic, not a user rate) | Content hidden behind within-page tabs/collapses is at risk of being missed — a risk to manage and test, not a prohibition on the tier tablist (which switches *datasets*, not prose sections) | Self-service shoppers, not operator-narrated consultations; no quantified user-overlook percentage; product-page prose tabs differ from tier navigation |
| 5 | W3C ARIA Authoring Practices Guide, "Tabs Pattern" — https://www.w3.org/WAI/ARIA/apg/patterns/tabs/ | Normative-adjacent pattern specification | Web applications using ARIA | The tablist/tab/tabpanel roles, roving tabindex, and arrow/Home/End keyboard contract the corrected tabs candidate implements | Implement tier tabs exactly to this contract | A conformance pattern, not evidence users prefer tabs; AT behavior on real hardware unverified (Phase 0.4 open) |
| 6 | W3C ARIA Authoring Practices Guide, "Accordion Pattern" — https://www.w3.org/WAI/ARIA/apg/patterns/accordion/ | Normative-adjacent pattern specification | Web applications using ARIA | The button-in-heading + aria-expanded contract the rejected accordion exploration implemented | (Exploration record only — the accordion is rejected) | Same as #5 |
| 7 | WCAG 2.2 SC 2.5.8 Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html — and SC 2.5.5 Target Size (Enhanced) — https://www.w3.org/WAI/WCAG21/Understanding/target-size.html | W3C accessibility standard | All web content | 24px minimum (AA) / 44px enhanced (AAA) target sizes | The package's ≥44px touch-target floor on all interactive prototype controls | Static CSS/geometry checks only in this package; real finger accuracy on the mounted showroom device is untested (Phase 0.4) |
| 8 | Apple Human Interface Guidelines (Layout / touchscreen gestures) — https://developer.apple.com/design/human-interface-guidelines | Platform vendor guidance | iOS/iPadOS apps | 44pt minimum hit-target convention on Apple touch devices | Same ≥44px floor, motivated by the iPad showroom context | The showroom device matrix is unconfirmed; HIG points, not CSS px, and web rendering differs |
| 9 | GOV.UK Design System, "Tag" component — https://design-system.service.gov.uk/components/tag/ | Government design-system guidance | UK government services | The inert status-tag idiom (non-interactive, labelled, never button-like) | The Sleep Brief signal badges render as inert labelled status tags that cannot be mistaken for controls | Idiom transfer only; no claim about badge comprehension by mattress customers |
| 10 | FTC, "Health Products Compliance Guidance" (2022) — https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance | Regulatory guidance | US advertising of health-adjacent products | Substantiation doctrine, including implied claims: a claim implied by presentation context needs the same evidence as an express claim | A product string rendered under a "matched to you" frame is a stronger implied claim than the same string on a spec sheet — hence the claim-tier ladder and evidence records in the authoring brief | Guidance, not rulemaking; application to specific catalog strings needs counsel review (the preliminary claim-risk inventory in the authoring brief appendix awaits its owner/legal disposition) |
| 11 | FTC, In the Matter of Moonlight Slumber, LLC (2017 consent order) — https://www.ftc.gov/enforcement/cases-proceedings/162-3128/moonlight-slumber-matter | FTC enforcement action | US mattress marketer | The FTC pursues unsubstantiated mattress material/benefit claims (organic, natural latex, VOC-free, self-awarded seals) | Mattress-category precedent motivating the evidence-per-reason authoring record | One consent order about materials claims; not about fit/comfort reasons specifically |
| 12 | 16 CFR §14.9, FTC policy on foreign-language advertising — https://www.ecfr.gov/current/title-16/chapter-I/subchapter-A/part-14/section-14.9 | Federal regulation/policy statement | US advertising in languages other than English | Required disclosures must appear in the language of the advertisement | Spanish reasons and their qualifiers must stand on their own in Spanish — ES review is claim-equivalence review, not translation QA | Regulatory floor, not a copy-quality standard; native-review requirement is the package's own stricter rule |

## Sources cited in retained exploration records but no longer load-bearing

The Wave 2 research reports referenced additional sources (EHR/clienteling
studies, IPDAS decision-aid standards, peak-end literature, Gong sales-call
analyses, ISPA industry data, W3C/IBM text-expansion guidance, HTMHell
VoiceOver testing of visualization markup). Those references remain inside
the exploration records (VARIANT-NOTES and the research ledger) as context
for how the explorations were shaped, but **no decision in the corrected
package rests on them**, so they are not laundered into this appendix as
evidence. If a future decision needs one, it gets a full entry here first —
URL, context, direct claim, inference, limitations — before being cited.

## What none of this establishes

Generic e-commerce, government-service, disclosure, or regulatory research
is not direct evidence of DreamFinder behavior. Nothing in this appendix
demonstrates that a Lacks salesperson or customer will notice, understand,
or prefer anything in the prototypes. That evidence began with the
assisted-sales dry run (RUN 2026-08-07 as a solo, English-only expert
walkthrough — deviations recorded in the packet; direction decisions
only) and still requires, later, Phase 0.4 device evidence and any
real-customer validation Blake commissions.
