# Trust integrity gate — owner review packet (2026-08-21)

**For:** Blake Ford (content owner / business approver).
**Branch:** `claude/phase1-trust-integrity` (draft PR — see the implementation
report for the number). **Nothing is merged, deployed or showroom-authorized.**
**What you are approving here:** nine quiz help lines, three customer-facing
data-use/audience sentences, the removal of one hardcoded promise, and four
decisions that only you can make. The technical detail is in
`docs/trust-integrity-implementation-2026-08-21.md`; you do not need it to
approve the copy.

Legend — **Ranks:** the line's answer changes the sleep-fit ranking.
**Consult:** it feeds the specialist's Consultation Summary. **Suggests:** it
changes accessory / adjustable-base suggestions or the Sleep Brief trial
priorities. Owner status ☐ = awaiting your decision. ES status: every Spanish
line is **provisional — native review owed** (roadmap Invariant 12).

## 1. Quiz help lines (9 of 10 changed; `body_type` unchanged)

| # | id | Previous EN → **Proposed EN** | Previous ES → **Proposed ES** | Ranks / Consult / Suggests | Why the old line was wrong or weaker → why the new one is code-true | Owner | ES |
|---|---|---|---|---|---|---|---|
| 1 | `trigger` | No pressure — this just helps your specialist focus on what matters to you. → **This doesn't change your sleep-fit ranking. It helps your specialist focus on what matters to you.** | Sin presión — esto ayuda a tu especialista a enfocarse en lo que te importa. → **Esto no cambia el orden de tus opciones. Ayuda a tu especialista a enfocarse en lo que te importa.** | no / yes (context row) / no | Old line was true but silent about the key fact; every option scores nothing. "No pressure" already appears on Welcome, so the repeat was dropped. | ☐ | provisional |
| 2 | `mattress_size` | So every mattress we show actually fits your space. → **We carry your selected size into the consultation. Your sleep-fit ranking is based on your comfort and support answers.** | Nos aseguraremos de que las recomendaciones se ajusten a tu espacio → **Tomamos en cuenta el tamaño que elijas en la consulta. El orden de tus opciones se basa en tus respuestas sobre comodidad y soporte.** | no / yes (size label opens the "who" row) / no | **Overclaim:** size never filters the lineup and no availability check exists anywhere. New line names the only real use (consultation + display) and says what ranks. | ☐ | provisional |
| 3 | `partner_sleep` | Who shares your bed shapes which features matter most. → **This shapes the questions that follow and what we suggest testing together.** | Esto determina qué características importan más → **Esto define las preguntas que siguen y lo que sugerimos probar juntos.** | partly (`family` → durability; `partner` → an inert tag) / no / yes (Motion control trial priority) | "Matter most" overstated a ≤2-point tag; the live effects are the skip/hide flow and the trial priority. | ☐ | provisional |
| 4 | `partner_disturbance` | Motion isolation is one of the first upgrades you'll feel. → **The more movement wakes you, the more it shapes your matches and what we suggest testing.** | El aislamiento de movimiento es una de las mayores mejoras en un colchón nuevo → **Cuanto más te despierte el movimiento, más influye en tus opciones y en lo que sugerimos probar.** | yes, graded (live: `hybrid` 3/2/0; `motionIsolation` is inert here — see note) / no / yes (Motion control priority rank) | **Benefit promise** ("you'll feel"). New line states the graded effect that actually exists. **Your preferred line ("…the more we favor motion isolation") is deferred:** the `motionIsolation` tag never matches this catalog's lowercase `motionisolation` (roadmap 3.1, locked), so it would describe a rule that has no effect today. It is recorded for adoption if/when 3.1 ships — not implemented before. | ☐ | provisional |
| 5 | `sleep_position` | Your sleep position is the biggest clue to the support you need. → **This helps us favor pressure relief, support, or a responsive feel.** | Piensa en cómo terminas naturalmente → **Esto nos ayuda a priorizar alivio de presión, soporte o una sensación con más respuesta.** | yes / yes (profile row) / yes (pillows, pressure priority) | **Overclaim:** a ≤5-point tag against the 50-point firmness term is not "the biggest clue". The ES line was not a translation at all. New line names the feel families the tags favor. **One gloss for you to accept or reject:** "pressure relief" is plain language for the live side-sleeper tags (`plush`, `soft` — cushioning); the literal `pressureRelief` tag is inert in this catalog (3.1). Stricter alternative: "a softer, cushioning feel, support, or a responsive feel" / "una superficie más suave, soporte o una sensación con más respuesta". | ☐ wording · ☐ gloss | provisional |
| 6 | `body_type` | *(unchanged)* This helps us account for cushioning, support, and durability. | *(unchanged)* | yes / no / yes (support priority) | True as shipped. | — | on the consolidated ledger |
| 7 | `temperature` | Sleeping hot or cold is an easy fix with the right materials. → **If you sleep hot, we favor cooling features in your matches.** | La regulación de temperatura es clave para un sueño profundo → **Si duermes con calor, priorizamos materiales refrescantes en tus opciones.** | yes (`hot` → cooling 3, hybrid 2; `cold` → 1 point) / yes (profile row) / yes (cooling pillows/protectors) | **Benefit/health claim** ("easy fix"; ES "key to deep sleep"). New line states the one live mechanism and is deliberately silent about "cold" (one point). | ☐ | provisional |
| 8 | `firmness` | No wrong answer here, just slide to what feels best. → **No wrong answer here, just slide to the feel you prefer.** | *(unchanged)* Desliza a tu comodidad ideal | yes (dominant term) / yes (feel + value) / no | Only "best" changed — it is on the gate's banned list even though it was harmless here. | ☐ | on the consolidated ledger |
| 9 | `sleep_issues` | Tap anything you've noticed. Each one points us toward a fix. → **Tap anything you've noticed. These shape which features we favor and what we suggest testing.** | Toca las que apliquen → **Toca lo que hayas notado. Esto define qué características priorizamos y qué sugerimos probar.** | yes for 6 of 8 options (`stiff`, `none` rank nothing here) / yes (each issue's implication in the "who" row) / yes (back pain → base scoring + demo position) | "A fix" is an outcome claim. "What we suggest testing" keeps the line true for the two options that rank nothing. | ☐ | provisional |
| 10 | `health_conditions` | Tap any that apply. A few of these change what we'd suggest. → **Tap any that apply. Some shape your matches; some change what we suggest trying, like an adjustable base or a mattress protector.** | Toca las que apliquen → **Toca lo que aplique. Algunas influyen en tus opciones; otras cambian lo que sugerimos probar, como una base ajustable o un protector de colchón.** | yes for 3 of 7 options (nerve pain, extra support, getting older) / yes (profile row: e.g. head-of-bed elevation) / yes (snoring/reflux → base scoring + demo; allergies → protector goal) | Old line was true but incomplete. New line says both effects without pairing any condition with a product as a treatment (no health-outcome claim). | ☐ | provisional |

**Lines that affect ranking:** 3 (partly), 4, 5, 6, 7, 8, 9, 10. **Do not affect
ranking:** 1, 2. **Consultation only:** 1. **Affect product-feature / base /
accessory suggestions or trial priorities:** 3, 4, 5, 6, 7, 9, 10.
Full engine evidence per line: `docs/quiz-copy-engine-correspondence.md`.

## 2. Privacy and data-use copy

### 2.1 Welcome data-use sentence (shown under the "Find My Sleep Match" button)

- **EN (shown now — `gasUrl` is blank):** During this showroom session, your answers stay on this tablet and are used to create your matches and specialist summary. Restart clears them.
- **ES (provisional, PRIORITY native review):** Durante esta sesión en la tienda, tus respuestas permanecen en esta tableta y se usan para crear tus resultados y el resumen para tu especialista. Reiniciar las borra.
- **Live-mode variant (authored, NOT shown while `gasUrl` is blank):** EN: Your answers are used on this tablet to create your matches and specialist summary. They are sent only if you choose to email your Sleep Brief. Restart clears them. / ES: Tus respuestas se usan en esta tableta para crear tus resultados y el resumen para tu especialista. Solo se envían si eliges recibir tu Resumen de Sueño por correo. Reiniciar las borra.
- **Behavioral basis:** answers live only in memory; the app has exactly two network calls (loading its own data files, and a results POST that exists only when a Google Apps Script URL is configured — it is blank); no beacon, socket, cookie, storage or URL carries answers; the salesperson roster is the only thing in `localStorage`; a confirmed Restart (and the final idle timeout) wipes answers and every derived screen. All of this is pinned by tests.
- **Conditions that would make it false:** a `gasUrl` is configured (then the live variant renders instead, automatically — and the build refuses preview wording in retailer policy text); a new network sink is added (the test suite fails); answers are ever persisted (the session suites fail).
- **Owner status:** ☐ approve wording · ☐ name the approver of record.

### 2.2 Review-screen audience sentence (replaces "A quick check, then your specialist builds your recommendations.")

- **EN:** These answers create your matches and the summary your specialist will review with you.
- **ES (provisional, PRIORITY native review):** Estas respuestas crean tus resultados y el resumen que tu especialista revisará contigo.
- **Exactly what the specialist sees** (the Consultation Summary, on the same tablet): the customer's finalists / the engine's recommended starting point; the 1–3 trial priorities with testing prose; three summary rows built from the answers — *context* (why they came in), *who* (mattress size, then a testing implication for each sleep issue ticked, e.g. back pain → "test lower-back support carefully"), *profile* (sleep-position implication, a testing implication for each health condition ticked, e.g. snoring → "test head-of-bed elevation on an adjustable base", the firmness feel and value, the temperature implication). **The specialist does not see the raw answer list**, but the implications are one-to-one with the health and sleep-issue answers, so a specialist can infer them. The sentence is written so it does not claim otherwise.
- **Owner status:** ☐ approve wording · ☐ rule on the specialist-summary scope (register).

### 2.3 Removed hardcoded email promise

- **Previous (template, both languages):** "Your info is never sold to third parties. Unsubscribe anytime." / "Tu información nunca se vende. Puedes cancelar la suscripción en cualquier momento."
- **Why removed:** an absolute promise no code kept, an "unsubscribe" for a subscription that does not exist, and a white-label breach (retailer policy hardcoded in the shared app).
- **Replacement behaviour:** the email screen shows only your configured line — EN "We'll only use your email to send your results." / ES "Solo usaremos tu correo para enviarte tus resultados." (the Spanish line was configured but ignored before; it now renders) — plus the existing "Preview mode: live email delivery isn't connected yet." note. **No approval needed** to remove; ☐ confirm you do not want the promise re-authored as retailer policy.

### 2.4 Privacy overlay ("Privacy & Terms" link on the email screen)

- **Current customer-visible copy (your configured draft, unchanged):** "Draft policy — pending Lacks Furniture approval before live use." / "DreamFinder collects your name, email, and optional phone number to deliver your mattress recommendations. Your information is only used for this purpose and is never sold. DreamFinder does not send your information to lenders. If you choose to open Lacks' financing or application pages, you continue on lacks.com — a separate site governed by its own terms and privacy policy." / "To access or remove your information, contact your local Lacks Furniture store." (ES equivalents configured.)
- **Status:** the draft notice is **visible to customers** today. In preview mode nothing is collected or retained, so "collects … to deliver" describes the future email-enabled mode, not today's. **Unresolved decision (yours + business/legal):** the final wording, who approves it, and the email-enabled wording (which must also disclose what the Apps Script does with a submitted address — today it would log a sheet row and BCC a central inbox). ☐

### 2.5 Idle dialog

- **Current:** "Still comparing? Your session is paused to protect your privacy." (Gate 1B required copy, test-pinned.)
- **Literally true?** Partly: the screen is obscured and inert while the dialog is up, but the session is not "paused" (a countdown runs) and the answers persist for the grace period (5 min) before they clear.
- **Recommendation:** **defer** — leave as shipped; if you want it exact, a candidate is "This session is hidden while no one is using it. Continue, or start a new customer to clear it." (needs two test pins updated). ☐ keep / ☐ change / ☐ defer

### 2.6 Spanish — strings needing PRIORITY native review (before any showroom use)

1. `privacy.data_use_preview` (2.1) — a literal rendering of "stay on this tablet" could read as a storage promise ("se guardan"), and "Restart clears them" must not become "deletes everything" (the salesperson roster persists by design).
2. `privacy.data_use_live` (2.1) — "sent only if you choose" must stay conditional; a looser verb ("se comparten") would widen the promise.
3. `review.help` (2.2) — "revisará contigo" must not become "decidirá por ti" or imply the specialist receives the answers elsewhere.
All nine quiz ES lines in §1 are also provisional (consolidated pass).

## 3. Tier presentation — your decision (nothing changed in this branch except the note's size)

Today: Gold is the first tab; "Best match" is the first card *within the active tier*; the note "Match strength is relative within each tier" is now body size (15px) in both languages.

| Option | What it is | Cost / risk | Phase |
|---|---|---|---|
| **A — Retain Gold-first** | No change; within-tier ranking stays; relativity note stays highly visible | Smallest change. Risk: a customer reads the first visible Gold "Best match" as best overall. | Phase 1 (already shipped) |
| **B — Neutral initial tier choice** | Customer (or salesperson) picks a price tier before any card shows | Adds control; changes the journey; needs its own approval, design and device testing; presentation-only if it keeps tiers, membership, order and threshold intact — otherwise Phase 3 | Phase 1 presentation with explicit approval |
| **C — Cross-tier highest-fit marker** | Show which mattress scores highest across all tiers | Requires a global maximum / cross-tier semantics — changes what the customer is told about fit | **Phase 3.3 — your explicit approval** |
| **D — Another owner-approved approach** | — | — | as ruled |

Wording guidance whichever you choose: never "price has no influence" without
distinguishing the sleep-fit *score* (which ignores price, promotions and
financing — test-pinned) from the tier *presentation* (which is grouped by
price). ☐ A ☐ B ☐ C ☐ D

## 4. Founding year — decision to record (no copy changed in this branch)

- Lacks' own history supports **1935** for the McAllen store (and the Welcome line says "since 1935").
- The BBB profile reportedly lists **1924**. It may describe a predecessor business or be inaccurate; it is **not** proof that 1935 is false.
- The discrepancy needs corporate or archival resolution before the heritage line is governed as a fact.
- No anniversary count is added. No heritage rail ships in this branch.
☐ confirm 1935 from records · ☐ explain the BBB entry · ☐ leave as is for now

## 5. Physical gates still owed (not satisfied by browser emulation)

**Mounted iPad Pro 11" — landscape (1194×748):** EN partner path, EN solo path, ES partner path, ES solo path; tall-question transitions (firmness → issues → health) land with the question at the top; Back transitions; Edit Answers from Review; language switch mid-quiz (no jump, focus stays on the language button); Welcome privacy line visible and readable; Review audience line; Results tier-relativity note readable at arm's length; no clipped controls; no unexpected page position; touch targets; glare/readability; on-screen keyboard on the email screen.
**Mounted iPad — portrait (834×1108):** repeat the critical paths; no overlap, no clipping, no horizontal scrolling, supporting copy wraps naturally, focus does not cause disruptive viewport jumps.
**VoiceOver sanity pass** (screen-reader *function* stays out of scope by your 2026-08-12 ruling; this is a sanity check only): start quiz; answer one option question; advance — the new headline is read once; selecting an answer does not re-read the headline; the Welcome privacy line and the Review line are reachable in reading order and are not announced as live status updates; Back is understandable; a language switch does not produce duplicate focus announcements. ☐ run it / ☐ accept the residual risk.
**Windows forced colors:** Welcome line, a question (headline ring after a keyboard Enter on Next), Review line, Results note all legible; browser emulation evidence exists but is not a physical pass.
**Known residues (pre-existing, recorded, not fixed here):** at 1194×748 in Spanish the Welcome "Tu consulta crea" outcome row bottoms ~39px below the fold (its second line ~20px; the wider ES button wraps the time estimate) — owner of the Welcome composition is 1.6; the Results tier-tab row overflows ~19px at 320px wide (outside the device matrix) — 1.3; the Sleep System's own reason lines ("Helps with the snoring you reported", "Targets the back pain you mentioned") are benefit-flavoured next to help lines that now avoid such claims — 1.4, for your ruling on consistency.
