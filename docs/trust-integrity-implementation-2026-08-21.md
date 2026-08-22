# Trust integrity and transparency — implementation report (2026-08-21)

**Status:** implemented on branch `claude/phase1-trust-integrity`; **not merged,
not deployed, not showroom-authorized.** Owner review, the device-matrix merge
gate on the confirmed hardware, and the open decisions below all stand.
**Placement:** Phase 1 cross-cutting gate (roadmap block after item 1.7), after
Slice 4 Payment Choice and before Slice 5 Sleep Plan in the approved order.
**Discovered by:** the 2026-08-21 quiz trust investigation
(`docs/quiz-trust-investigation-2026-08-21.md`, companion agent reports in
`docs/quiz-trust-investigation-2026-08-21-agent-reports.md`).

## 1. Objective

Make the quiz tell the truth about itself: every per-question explanation
names a mechanism the engine actually runs; a question is never presented
off-screen; the customer is told once, plainly, what happens to their answers
and who sees the summary built from them; the one honest statement about tier
match strength is readable; and none of those sentences can drift away from the
code without a test going red. No conversion, upsell, brand-exposure or
"reassurance count" goal — the in-quiz heritage rail the prototype built was
not shipped.

## 2. Baseline commit

`4a765034b402ddfbfdb8bfcf3313cf2ee6c8e88b` — `origin/main` at branch creation
(PR #52 merge, 2026-08-20). Baseline suite at that commit (run by the
architecture audit before any edit): validator self-test 951/0, smoke 116/0,
converter self-test 16/0, golden `--strict` reproduced, lineage 10/0, daybreak
contract 87/0, QR 188/0, scoring isolation 247/0, Phase 1 output regression
72/0 (14 mutations caught), quiz presentation 176/176, contrast 90/0, session
safety 535/0, session async 283/0, results presentation 83/83, consultation
summary 94/0, email gating 96/0, payment choice 420/420; mutation sweep
301/301 caught.

## 3. Branch and worktree

- Worktree: `C:\Users\BlakeFord\Documents\GitWorktrees\LacksFurniture\trust-integrity`
  (sibling under the repo's worktree discipline directory), created clean
  from `origin/main` with `git worktree add -b claude/phase1-trust-integrity … origin/main`.
- Branch: `claude/phase1-trust-integrity`.
- The canonical checkout (`Documents\GitHub\LacksFurniture`, branch
  `claude/nocturne-slice5-sleep-plan` @ `6decbef`, Slice 5 in progress) and the
  prototype clone (`Documents\Lacks PROTOTYPE\LacksFurniture-slice4`, branch
  `claude/nocturne-slice4-payment-choice` @ `5436dea`, dirty, the trust-story
  prototype) were **not touched**: nothing reset, stashed, rebased, merged or
  cherry-picked. Only the two investigation documents were copied from the
  prototype (byte-identical, sha256 `2e83b415…` and `26c9d62e…`).
- Commits (in order):
  1. `3bfbe92` docs: place trust integrity gate in phase 1 roadmap
  2. `c979547` fix: restore quiz context after question navigation
  3. `d56284d` content: align quiz explanations with engine behavior
  4. `66f787d` fix: align privacy copy with deployment behavior
  5. `812a984` fix: make tier relativity disclosure legible
  6. `8d0bda6` fix: resolve the independent review findings (§14b)
  7. *(this report)* docs: trust integrity implementation report

## 4. Roadmap placement

`docs/rebuild-roadmap.md` (commit `3bfbe92`): a new unnumbered block
**"Phase 1 cross-cutting gate — Trust integrity and transparency 🔨"** after
item 1.7 and before the accessibility criteria; the approved-slice-order list
gains a dated parenthetical placing the gate after (4) and before (5) and
recording that Slice 5 had already begun on its own branch (not re-sequenced);
the header's "Next implementation item" paragraph is corrected with the
document's own correction idiom (Slice 5 🔨, not ⬜); the reconciliation
baseline moves to `4a76503` with the chain kept; items 1.2, 1.3 and 1.6 carry
cross-reference parentheticals; Invariant 12 records the privacy-sentence
exception; the open-decisions register gains eight rows (§19 below); the
sequence of record gains entry 8 and renumbers. Phase 0 is not reopened; 3.3 is
untouched.

## 5. Investigation findings accepted

- The scroll carry-over defect (D1) — reproduced on `main` before the fix.
- The `helpText` overclaims (`mattress_size`, `sleep_position`, `temperature`,
  `partner_disturbance`) and the Spanish lines that said something different.
- The template-hardcoded "never sold / unsubscribe anytime" promise (EN+ES).
- The unacknowledged specialist audience of the Consultation Summary.
- The 11px relativity note.
- Do not build the heritage rail; keep heritage on Welcome once.
- Mechanism language, never weights; the copy–engine correspondence table.
- A `gasUrl`-gated data-use sentence with a live-mode variant; a network-sink
  pin; native-Spanish review of privacy sentences first.

## 6. Findings modified or rejected

| Investigation said | What shipped, and why |
|---|---|
| Welcome sentence D1: "Your answers aren't saved or sent anywhere — … Restart clears them at any time." | The owner's preferred wording ("…stay on this tablet and are used to create your matches and specialist summary. Restart clears them.") — it names the specialist audience and avoids the absolute "anywhere". |
| `partner_disturbance` → "the more we favor motion isolation" (owner's preferred line) | Adapted: "the more it shapes your matches and what we suggest testing." The `motionIsolation` tag never matches this catalog's lowercase `motionisolation` (roadmap 3.1 🔒), so the preferred line is true of the rule but not of this deployment's output. Recorded in the correspondence doc for adoption once 3.1 ships. |
| `health_conditions` → "Snoring or reflux, for example, is why we'd suggest an adjustable base." | No condition→product pairing (reads as a treatment claim). Shipped: "Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector." |
| Line references in the investigation (e.g. `index.html:10744`) | Were prototype-tree lines; on `main` the promise lived at `:10773` and `:16402–16404`. The investigation docs are preserved verbatim as research records. |
| "text_es.emailPrivacy is not supplied" (code comment the investigation relied on) | False — it is configured; the renderer ignored it. Now honoured. |
| Data-use sentence location: the investigation's architecture section proposed dictionary copy; the white-label reading could also argue store-config | Dictionary, in two mode variants, selected at runtime from `gasUrl` (one source of truth, no new workbook column); the retailer's own policy prose stays in config and is gated at build. |
| Sleep System containers absent from the wipe list (data-flow audit) | Not changed here: they are rebuilt before every display, so no previous customer's text can be seen; adding them conflicts with Slice 5's edits to the same table. Deferred to Slice 5 / 1.4 (§18). |
| Idle-dialog wording ("paused to protect your privacy") | Left as shipped: it is Gate 1B required copy pinned exactly by the session suite; recorded as an owner decision. |

## 7. Exact implemented behaviour

**A. Question navigation (`c979547`).** `renderQuestion()` records the id it
last rendered (`_renderedQuestionId`). A render whose id differs from the
recorded one is a question change and calls `afterQuestionChange()`: refusal
gate (`screenTransitionOwnedElsewhere()`), active-screen check, then exactly
`showScreen()`'s scroll idiom (`window.scrollTo(0, 0)`; `screen.scrollTop = 0`),
then `#questionHeadline.focus({ preventScroll: true })` in the
`focusScreenDestination()` idiom. The `<h2>` carries `id="questionHeadline"
tabindex="-1"` in both render branches (no permanent tab stop) and joins the
consolidated two-ring `:focus-visible` block and its forced-colors fallback.
`showScreen()` nulls the record on every true screen transition, so the first
render after `startQuiz`, Review → Edit and Review → Back is owned by the
screen transition (container focus, as before) and not double-handled. Same-id
renders — an answer tap (Slice 3's keyboard restoration in `selectOption()`
is untouched) and a language switch (`restoreLanguageFocus()` owns it) — are
not changes. No timer, no frame, no live region, no announcement, no
touch-handler change, no auto-advance.

**B. Quiz copy (`d56284d`).** Nine help lines rewritten at the canonical source
and regenerated (workbook → `data/quiz.json`); §8 lists them. No `scores`,
option, id, order, type or skip rule changed.

**C. Privacy voice (`66f787d`).** `emailDeliveryLive()` — `gasUrl` configured
AND the active promotion scenario does not block submission — is the one mode
truth; it mirrors `sendResults()`'s own gate (proven equivalent over the
matrix) and now drives the email screen's preview note. `renderDataUseStatement()`
renders `privacy.data_use_live` or `privacy.data_use_preview` from the
dictionary into `<p id="landingDataUse">` on Welcome; a missing or blank variant
renders nothing and hides the element (never the key, never the other mode's
sentence). `renderReviewChrome()` reads `t('review.help')`. The email screen's
static promise span is removed (markup and renderer); the lead reads
`localizedConfigBlock('text').emailPrivacy || ''`. The privacy overlay's
pre-config placeholder is empty and hydrates to config or nothing.
`tools/validation.py` rejects preview-mode signal phrases in retailer privacy
prose under a live `gasUrl` — "live" meaning the runtime's own notion, any
non-blank `gasUrl`; a non-blank placeholder `gasUrl` ("TODO",
"https://example.com/…") is itself a build error, because the kiosk would
treat it as live and POST to it.

**D. Review line (`66f787d`).** The Review help line is the audience statement
(§8). Plain paragraph, 15px, normal flow, not focusable, not live.

**E. Tier note (`812a984`).** `.noct-tier-descriptor .tier-relativity` 11px →
15px, line-height 1.45, normal tracking; wording, key, markup, ink token and
every tier semantic unchanged.

**F. Trust-story prototype.** Not brought over: no `quiz.trustStories`, no
validator contract, no renderer or CSS, no CLAUDE.md paragraph — pinned by
`tests/trust_integrity_check.mjs` section B. The prototype worktree is
preserved untouched as research evidence.

**G. Results explainability — documented, not built.** What exists today:
per-mattress `matchReasons` ("Why it matches you" in the drawer — only the
two firmness reasons, since every per-feature reason column is empty; 1.3's
reason gate); the Sleep Brief's "Made from your answers" hero and the 1–3 trial
priorities with in-store testing prose; the Sleep System's "Suggested first
because you mentioned …" lines; the relativity note; Edit Answers from Review
and the Sleep Brief's secondary action. What is hidden: there is no
findable statement at Results of what was compared and what was not used.
Recommended (next Phase 1 slice, not this one; verify each clause before
adoption): "Within each price tier, matches are ranked using your firmness
preference and the sleep features your answers pointed to. Promotions and
financing do not change the sleep-fit score." — true today: the ranking is
`calculateScores()` (firmness term + feature tags), financing/promotions are
pinned out by `tests/scoring_isolation_check.mjs`, and tiers are price
groupings ranked within (the "within each price tier" clause keeps scoring and
Gold-first presentation distinct).

## 8. Exact copy changes

Quiz help lines (EN → ES provisional; previous lines in
`docs/quiz-copy-engine-correspondence.md`):

| id | EN | ES (provisional) |
|---|---|---|
| trigger | This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you. | Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa. |
| mattress_size | We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers. | Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte. |
| partner_sleep | This shapes the questions that follow and what we suggest testing together. | Esto define las preguntas que siguen y lo que sugerimos probar juntos. |
| partner_disturbance | The more movement wakes you, the more it shapes your matches and what we suggest testing. | Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar. |
| sleep_position | This helps us favor pressure relief, support, or a responsive feel. | Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta. |
| body_type | *(unchanged)* | *(unchanged)* |
| temperature | If you sleep hot, we favor cooling features in your matches. | Si duermes con calor, priorizamos materiales refrescantes en tus opciones. |
| firmness | No wrong answer here, just slide to the feel you prefer. | *(unchanged)* Desliza a tu comodidad ideal |
| sleep_issues | Tap anything you've noticed. These shape which features we favor and what we suggest testing. | Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar. |
| health_conditions | Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector. | Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón. |

Dictionary (generic, both languages):

| key | EN | ES (provisional — NATIVE REVIEW REQUIRED FIRST) |
|---|---|---|
| privacy.data_use_preview *(shown: gasUrl blank)* | During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them. | Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra. |
| privacy.data_use_live *(not shown here)* | Your answers are used on this tablet to create your matches and specialist summary. They are sent only if you choose to email your Sleep Brief. Restart clears them. | Tus respuestas se usan en esta tableta para crear tus resultados y el resumen para tu especialista. Solo se envían si eliges recibir tu Resumen de Sueño por correo. Reiniciar las borra. |
| review.help | These answers create your matches and the summary your specialist will review with you. | Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo. |

Removed: "Your info is never sold to third parties. Unsubscribe anytime." /
"Tu información nunca se vende. Puedes cancelar la suscripción en cualquier
momento." (email screen, template); "A quick check, then your specialist builds
your recommendations." / "Asegúrate de que todo esté bien, luego construiremos
tu combinación." (Review, inline); the overlay's placeholder "…never sold or
shared with third parties." (pre-config DOM). Unchanged: `text.emailPrivacy`
("We'll only use your email to send your results." / "Solo usaremos tu correo
para enviarte tus resultados." — now rendered in both languages), the preview
notes, the privacy overlay's configured body and draft notice, the idle
dialog, the relativity line.

## 9. Data-flow inventory (verified on `4a76503` and re-verified on `812a984`)

| State | Where | Lifetime | Who sees it | Sink |
|---|---|---|---|---|
| `answers` | in-memory module variable | until confirmed Restart, final idle timeout (5 min visible + 5 min obscured), or the email confirmation's "Start New Customer" | customer + salesperson on the shared screen; Review lists every answer as labels | none |
| derived: scores, match reasons, tiers, Sleep Brief priorities, Sleep Signature, profile subtitle, accessory scores, consultation summary rows, saved picks, payment state | in-memory / DOM | same; every customer-ending path wipes the state and every *visible* container (`SESSION_CONTENT_IDS`, `resetSessionState`); the four hidden Sleep System containers are rebuilt before each display rather than wiped (§18) | same; the Consultation Summary shows the specialist implications derived from sleep-issue and health answers | none |
| name / email / phone | inputs + in-memory locals | same | same | with `gasUrl` blank: nothing is sent; a preview recap is shown. With `gasUrl` set: one POST to `gasUrl` on Save |
| salesperson name / roster | `localStorage` `dreamfinder.<store>.deviceRsa` / `.rsaList` (5 call sites) | device-persistent, outside the wipe by design | staff | none |
| analytics | in-memory `events[]` + a redacted `console.log` | session | nobody off-device | none; `EVENT_FIELDS` default-deny, answer values and contact values never logged (session async suite) |
| URL | — | — | — | only `?motion=1` is read; nothing is written |

Network sinks in `index.html`: exactly two `fetch()` call sites — and exactly
two references to the `fetch` identifier at all — the bounded same-origin
JSON loader (`boundedJson`) and `fetch(gasUrl, …)` inside
`if (gasUrl && !scenarioBlocksEmail)`. No external URL literal in executable
code other than the SVG namespace; no protocol-relative URL. Zero
`XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`, `navigator.share`,
`postMessage`, `window.open`, `Image(`, `.src =`, `location =`,
`document.location`, `window.name`, clipboard, Worker/SharedWorker,
`BroadcastChannel`, `RTCPeerConnection`, `importScripts`, `.submit(`,
history/location writes, iframes, cookies, `sessionStorage`, `indexedDB`,
Cache API, service worker, or external script/style URLs. One `<form>`,
`onsubmit` prevents default, no `action`.
External financing links are bare allowlisted URLs; the QR encodes
`https://www.lacks.com/financing` with no query. Pinned by
`tests/trust_integrity_check.mjs` section C on comment-stripped code.

## 10. Privacy-copy truth table (this deployment: `gasUrl` blank)

| Statement | Where | Mechanism | Verdict | Falsified when |
|---|---|---|---|---|
| "During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them." | Welcome | dict `privacy.data_use_preview`, runtime-selected | TRUE | `gasUrl` set — then the live variant renders instead (build also rejects preview wording in retailer prose) |
| "Your answers are used on this tablet … They are sent only if you choose to email your Sleep Brief. Restart clears them." | Welcome, live mode only | dict `privacy.data_use_live` | TRUE in live mode (send only on Save; raw answers are not sent — only `mattressSize` as a label plus derived profile/priorities/summary, so "they are sent" overstates in the safe direction) — **live readiness caveat:** Code.gs's sheet row and default BCC must be disclosed before any `gasUrl` is set | an automatic send or a beacon is added (sink pin) |
| "These answers create your matches and the summary your specialist will review with you." | Review | dict `review.help` | TRUE (`calculateScores`; `resolveConsultationSummary`) | the Consultation Summary stops deriving from answers, or a surface other than the shared screen receives it |
| "We'll only use your email to send your results." | Email screen | config `text.emailPrivacy` / `text_es` | CONDITIONAL — vacuous in preview (nothing sent; the adjacent "Preview mode" note says so); in live mode needs the BCC/sheet disclosure | `gasUrl` set with default Code.gs |
| "Preview mode: live email delivery isn't connected yet." / "No email was sent…" | Email screen | inline, shown when `!emailDeliveryLive()` | TRUE | — |
| Privacy overlay body (retailer draft: "collects your name, email… never sold… does not send your information to lenders…") + "Draft policy — pending Lacks Furniture approval before live use." | Overlay from the email screen | config `text.privacyBody` / `privacyDraftNotice` | RETAILER DRAFT, labelled as such; "does not send … to lenders" TRUE; "collects" is a live-mode description | owner decision (§19) |
| "Your session is paused to protect your privacy." | Idle dialog | dict `safety.timeout_body` (Gate 1B required copy) | AMBIGUOUS (screen obscured and inert; answers persist for the grace period) | owner decision (§19) |
| "This clears the current answers, mattress selections, and Sleep Plan." | Restart dialog | dict | TRUE | — |

No "anonymous", "never shared", "nothing is stored", "deleted immediately",
"cleared when you finish" or "unsubscribe" sentence remains anywhere the
customer can see (trust suite + smoke guard).

## 11. Copy–engine correspondence

`docs/quiz-copy-engine-correspondence.md` — one section per canonical question
(previous/current EN/ES, real score tags, consumers, what the copy may and may
not say, verdict), the engine facts (firmness term, exact-match feature tags,
the zero-scoring questions, the eight inert tags and why), re-audit triggers,
and approval status. Pinned by `tests/trust_integrity_check.mjs` section A.

## 12. Accessibility behaviour

- Question change: headline top ≥ 108px at 1194×748, 834×1108, 390×844,
  320×568 and 597×374 after every Next and Back on both paths;
  `activeElement` = `H2#questionHeadline`; keyboard Enter on Next draws the
  two-ring ring (`:focus-visible` true); touch/mouse Next draws none; Tab after
  the headline goes to the first option; Shift+Tab skips the headline (no tab
  stop). Reduced motion: identical (scroll is instant `auto`). Forced colors:
  CanvasText ring and text.
- Supporting copy: Welcome line 16px `#685C4D` on `#F4EFE6` (5.68:1); Review
  line 15px same pair; tier note 15px `#665D54` on `#F3EEE5` (5.58:1). All in
  normal flow, not focusable, no `aria-live`, no role. Welcome line inside the
  first viewport at 1194×748 in EN (564–612) and ES (608–656). No horizontal
  overflow at 320px on Welcome, question or Review, including under the WCAG
  1.4.12 text-spacing override. 200%-equivalent (597×374): all three lines
  render and wrap.
- Pre-existing, not this gate: the Results tier-tab row overflows by 19px at
  320px (Bronze tab); 320px is outside the recorded device matrix. Recorded for
  1.3. Also for 1.3: the tier note (15px) now visually outranks the 12px
  descriptor line above it ("Gold · premium materials"); raising the
  descriptor is outside this gate's authorization.
- Welcome at 1194×748 in Spanish: the second line of the "Tu consulta crea"
  outcome list sits 20px below the fold (715–768) because the wider ES CTA
  wraps the time estimate onto its own line (pre-existing); the data-use line
  is inside the fold in both languages. For the owner's iPad pass.
- VoiceOver: not run (owner decision §19; screen-reader functionality is out of
  scope by the 2026-08-12 ruling).

## 13. Generated-file lineage

`incoming/dreamfinder_quiz.json` (9 help lines) → `python incoming/build_lacks_workbook.py`
→ `incoming/Lacks_Store_Data.xlsx` (Quiz tab envelope verified by reading the
cell back: `{"quiz": …}`, no `trustStories`) → `python tools/validate_workbook.py … --warnings-as-errors`
→ `python tools/convert_store_data.py incoming/Lacks_Store_Data.xlsx --output-dir . --source-images incoming/images`
→ `data/quiz.json` (32/34 lines changed, all `helpText`). Every other generated
artifact (`data/store-config.json`, `data/accessories.json`,
`data/allowed-hosts.js`, `manifest.json`, `data/mattresses.json`) is
byte-identical after normalization. `demo/black-friday/` rebuilt with
`python tools/build_black_friday_demo.py` in every commit that touched
`index.html`; `tests/daybreak_contract_check.py` 87/0. Dictionaries are
hand-maintained (Invariant 5 exception). The Phase 1 output fixture
`tests/fixtures/phase1_output_baseline_daybreak_pr1.json` is untouched and its
pinned sha holds.

## 14. Test commands and results

See §14a (filled from the full local run) and the commit messages. New and
changed suites: `tests/trust_integrity_check.mjs` (new, registered in
`.github/workflows/ci.yml` after the quiz presentation step), quiz
presentation REPAIR 9 + five negative controls (failed first: 27 assertions red
on the unrepaired tree), contrast block, smoke privacy guard, validator
self-test cases, daybreak demo runtime extraction update, mutation manifest
301 → 326 (all new entries proven caught with the subset runner; two Slice 3
entries repaired after the headline's focus selector shifted their find text).

## 14a. Full local run (CI-equivalent)

Every step of `.github/workflows/ci.yml` run locally in order (Python
3.14.2 / Node 24.13 — CI pins 3.12 / 20.18.1) at `812a984`, then the suites
touched by the review fix-up re-run at `8d0bda6`:

| Step | Result |
|---|---|
| validation self-test | 974 passed, 0 failed *(961 at `812a984`)* |
| financing totality | 3395 / 0 |
| smoke | 118 / 0 |
| canonical / converter / reverify self-tests | 14 / 16 / 25, all 0 failed |
| workbook validation (`--warnings-as-errors`) | OK, no issues |
| strict golden bundle | reproduced |
| canonical lineage (sources → workbook → bundle) | 10 / 0 |
| QR payload / committed asset | 188 / 0 / OK |
| financing render / copy policy / taxonomy / URL / exact-promotions | 319, 215, 102, 53, 45 — all 0 failed |
| scoring isolation | 247 / 0 |
| payment choice | 420 / 420 |
| email gating | 96 / 0 |
| contrast | 98 / 0 |
| drawer lifecycle | 44 / 0 |
| session safety / session async / data-error recovery | 535, 283, 331 — all 0 failed |
| consultation priorities / email priorities / consultation summary | 219, 96, 94 — all 0 failed |
| motion flag / compare modal / construction reveal / compare entry | 202, 65, 102, 75 — all passed |
| Phase 1 output regression | 72 / 0 (14 mutations caught; fixture and sha unchanged) |
| claim retirement / integrity repairs | 53, 17 — 0 failed |
| results presentation / sleep brief presentation | 83 / 83, 134 / 134 |
| quiz presentation | 217 / 217 *(209 at `812a984`)* |
| **trust integrity (new)** | 111 / 111 *(106 at `812a984`)* |
| daybreak demo runtime / contract / server | 55, 87, 23 — 0 failed |
| mutation sweep | 326 / 326 caught at `812a984`; 331 entries at `8d0bda6`, every trust-gate entry re-proven caught with the subset runner (full re-run pending in §14c) |
| `git diff --check 4a76503..HEAD` | clean |
| protected artifacts byte-identical after the suites; operating state unchanged (gasUrl blank, exactPromotionsEnabled false, discount disabled, promotions inert) | ok |

## 14b. Independent review findings and resolutions (at `812a984`)

Three read-only reviewers re-audited the branch. **No blocker on the branch
itself.** Resolutions shipped in `8d0bda6`:

| Reviewer | Finding | Resolution |
|---|---|---|
| A (privacy) | The validator keyed its prose gate on its placeholder heuristic; the runtime treats any non-blank `gasUrl` as live, so a sentinel `gasUrl` built green with preview wording while the kiosk would speak live copy and POST to the sentinel | Gate keyed on any non-blank `gasUrl`; a non-blank placeholder is a build error; 13 self-test cases |
| A | The sink pin passed 9 plausible sink forms (spaced `fetch (`, `window['fetch']`, pixel `img.src`, bare `location =`, clipboard, `window.name`, bracket `localStorage`, protocol-relative links) | Pin widened (§9); pixel-beacon and spaced-call sweep entries |
| A | `PREVIEW_MODE_SIGNALS` missed the project's own proposed preview sentences; bare "never sent" would mis-reject lender wording | List widened to every proposed sentence; "never sent" narrowed |
| A | The privacy overlay's retailer draft body still describes live-mode collection under a blank `gasUrl` | Retailer-authored draft under its draft notice — owner decision (§19), not code |
| A | `privacy-policy-contact` kept a template fallback | Config-or-nothing like its siblings |
| B (navigation/copy) | REPAIR 9 could not see a tracker frozen at the first question (ad-hoc mutant survived) | Walkers count from before the tap; answer-tap-after-Next (touch + keyboard), gate-release, inactive-screen and `isFocusRestorable` cases; negative control; three sweep entries |
| B | Welcome outcome row pushed below the 1194×748 fold in Spanish (items 727–780) | Margins tightened (items now 715–768: a 20px residue from the pre-existing ES CTA wrap) — recorded for the owner's iPad pass; the data-use line itself is inside the fold in both languages |
| B | Four provisional ES help lines read awkwardly ("características frescas", "sensación más reactiva", "Llevamos el tamaño", "Marca" vs "Toca") | Reworded at the canonical source; still provisional |
| B | Correspondence doc misquoted the `body_type` copy-variant line; variant lines were not pinned | Fixed and pinned |
| B | Two test labels stronger than their assertions | Relabelled / folded |
| B | Tier note (15px) now outranks the 12px tier descriptor visually | Left as is — the descriptor is outside this gate's authorization; recorded for 1.3 |
| C (architecture) | `tests/sleep_brief_presentation_check.mjs` captured the focus block through a fixed 700-char window the new selector overflowed: a vacuous pass here, red on the first merge with Slice 5 | Brace-anchored regex; the match is the first block |
| C | Roadmap header enumerated seven register rows of eight; the 🔒 row did not say what locks it; the report was referenced before it existed | Fixed; this report committed |
| C | CLAUDE.md should record where mode-aware data-use copy lives | One bullet added to the bilingual architecture section |
| C | Merge with Slice 5 (`6decbef`): three trivial both-added conflicts (`data/dict-en.json`, `data/dict-es.json`, `tests/mutation_sweep.mjs` observer constants), everything else auto-merges; the merged tree was exercised green apart from the Sleep Brief window (now fixed) | Recorded; whoever merges second re-runs `python tools/build_black_friday_demo.py` |

Reviewer NOTES left as recorded: the hidden Sleep System containers (§18);
`text.privacyBody` still says "never sold" (retailer draft, register); the
orphaned `review.category/title/looks_good` keys (pre-existing); the
hand-kept signal lists are coupled by a test, so a future rewrite of the
preview sentence must update both; `heading.focus({preventScroll:true})`
from a `touchend` handler was verified in Chromium only — it is the idiom
`focusScreenDestination()` already uses, but this branch has not been
observed on the device.

## 14c. Final run at the reviewed head

*(see the terminal summary for the post-`8d0bda6` full run and CI status)*

## 15. Manual device-matrix results

Browser (Chromium, Playwright, DPR 1) at the recorded matrix sizes and beyond,
EN and ES, partner and solo paths — §12. **Physical iPad Pro 11" (1194×748
landscape, 834×1108 portrait), real touch, glare, and the Windows
forced-colors rendering remain owner-run gates under the phase-wide merge
gate; not performed here.**

## 16. Screenshots / scratch evidence

Session scratchpad (ephemeral, not committed):
`…\scratchpad\welcome_1194x748_{en,es}.png`, `welcome_390x844_{en,es}.png`,
`question_mattress_size_en.png`, `question_temperature_es.png`,
`after_fix_1194x748_firmness_next.png`, `after_fix_1194x748_sleep_issues_next.png`,
`keyboard_headline_focus.png`, `review_1194x748_{en,es}.png`,
`review_390x844_{en,es}.png`, `email_1194x748_{en,es}.png`,
`results_1194x748_{en,es}.png`, `results_320x568_{en,es}.png`,
`forced_welcome.png`, `forced_question_size.png`, `textspacing_welcome_320.png`,
`textspacing_review_320.png`, `zoom200_review.png`; measurement JSON
`verify_nav_results.json`, `verify_privacy_results.json`,
`verify_tier_results.json`, `verify_emulations.json`; the pre-fix defect
reproduction `shot_1194x748_partner_firmness_next.png` and
`probe_nav_results.json` (Agent B, on `4a76503`).

## 17. Scoring-output proof

`node tests/phase1_output_regression_check.mjs` → 72/0 with the committed
fixture and pinned sha unchanged across all five commits;
`node tests/scoring_isolation_check.mjs` → 247/0; `git diff 4a76503..812a984 -- data/quiz.json`
touches only `helpText` values (no `scores`, ids, order, types, `skipIf`,
`hideIf`). The engine reads none of the changed fields.

## 18. Deferred work

- Sleep System containers (`#sleepSystemMain/Guidance/Rail/PlanList`) are not
  in `SESSION_CONTENT_IDS`; rebuilt before display, so nothing visible
  survives a wipe, but the hidden DOM retains answer-derived prose until the
  next render. Slice 5 / 1.4 (that table is being edited there).
- Live-mode readiness: before any `gasUrl` is set, disclose or disable
  Code.gs's sheet row and default BCC, resolve `privacyDraftNotice`, and
  author the email-enabled wording (register).
- `emailPreviewNote` / "No email was sent" strings are inline EN/ES literals
  (true; a later dictionary move).
- Dead `text.trustSignal` ("90 years") has no consumer; retire or govern.
- `text.disclaimerBody` mentions "match percentages" — none render on screen.
- Results method note + one modest limitation (§7 G) — next Phase 1 slice.
- Results tier-tab row overflow at 320px (pre-existing) — 1.3.
- Optional moderated research condition for heritage (register).

## 19. Open owner decisions (recorded in the roadmap register, not resolved)

1. **Tier presentation:** retain Gold-first with the within-tier model, a
   neutral initial tier choice, a cross-tier highest-fit marker, or another
   owner-approved control (3.3 territory for anything cross-tier).
2. **Heritage:** Welcome only (current), an optional moderated-research
   condition, or no additional heritage.
3. **Founding year:** confirm 1935 through corporate records; explain the BBB
   "1924" entry; no anniversary arithmetic.
4. **Privacy approval:** approver of record; final showroom wording;
   `privacyDraftNotice`; the native-Spanish reviewer for the data-use
   sentences; the email-enabled wording (incl. BCC/sheet disclosure).
5. **Specialist audience:** exact scope of the Consultation Summary; whether
   the customer may control what appears; whether health-derived implications
   remain.
6. **Measurement:** moderated current-vs-process-transparency sessions;
   whether heritage is retained as a third condition; any aggregate local
   store (must record no answers and no identity).
7. **VoiceOver:** a required manual pass on the mounted iPad, or explicitly
   accepted residual risk.
8. **Idle-dialog wording** (Gate 1B required copy, test-pinned).
9. **Quiz copy sign-off** as governed quiz copy (CLAUDE.md) — the nine lines
   in §8; and the `partner_disturbance` preferred line once 3.1 ships.

## 20. Native-Spanish review debt

Provisional ES strings shipped by this gate (all owed native review; the three
dictionary sentences **first**, ahead of the consolidated pass):
`privacy.data_use_preview`, `privacy.data_use_live`, `review.help`; quiz
`helpText.es` for `trigger`, `mattress_size`, `partner_sleep`,
`partner_disturbance`, `sleep_position`, `temperature`, `sleep_issues`,
`health_conditions`. Unchanged ES lines (`body_type`, `firmness`) are already on
the consolidated ledger.

## 21. Showroom-authorization status

**Not authorized.** `docs/kiosk-device-hardening.md` remains BLOCKING; the
phase-wide device-matrix merge gate (physical iPad, both orientations, EN/ES)
and Blake's live review apply to this branch exactly as to every slice; Spanish
is provisional; no privacy policy is claimed approved.

## 22. Rollback strategy

Each commit is independently revertible with `git revert` (no commit depends
on a later one). Reverting `d56284d` requires re-running the canonical pipeline
(workbook → convert) because it changes the xlsx and `data/quiz.json` together;
reverting `c979547`, `66f787d` or `812a984` requires `python tools/build_black_friday_demo.py`
to keep the demo bundle byte-matched. `3bfbe92` is docs-only. Nothing was
pushed to `main`; no deployment occurred.
