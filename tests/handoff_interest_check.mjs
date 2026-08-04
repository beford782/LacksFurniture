// Financing specialist-agenda gate.
// Pins the salesperson-led orientation model: semantic discussion items are
// marked in the sheet and carried into handoff without becoming product
// selections, scoring inputs, diagnostics, persisted data, or email payload.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}
function extract(re, label) {
  const m = html.match(re);
  check(`${label} found`, !!m);
  return m ? m[0] : "";
}

const items = extract(/function finAgendaItems\(\)\s*\{[\s\S]*?\n    \}/, "finAgendaItems()");
const control = extract(/function finAgendaControl\(item\)\s*\{[\s\S]*?\n    \}/, "finAgendaControl()");
const toggle = extract(/window\.toggleFinancingAgenda = function\(key\)\s*\{[\s\S]*?\n    \};/, "toggleFinancingAgenda()");
const handoff = extract(/function renderHandoffFinancing\(\)\s*\{[\s\S]*?\n    \}/, "renderHandoffFinancing()");
const decline = extract(/window\.setFinancingInterestChoice = function\(state\)\s*\{[\s\S]*?\n    \};/, "handoff not-now control");
const eventBase = extract(/function finEventBase\(placement\)\s*\{[\s\S]*?\n    \}/, "finEventBase()");
const wipe = extract(/function resetSessionState\(opts\)\s*\{[\s\S]{0,9000}/, "resetSessionState()");

// Model A: a single provider-level promotional category, individual evergreen
// and installment paths, and a separate Mexico scenario. Never per-rate cards.
check("promotions group by provider", items.includes("finPromotionalByProvider(groups.promotional)"));
check("installment and evergreen paths remain individual", items.includes("groups.installment.concat(groups.evergreen)"));
check("Mexico is selected by presentation scenario", items.includes("groups['scenario-mexico']"));
check("agenda keys contain no rates or term values", !/apr|termMonths|purchaseMinimum/.test(items));

// Toggle controls are explicit stateful buttons and work for touch presentation.
check("sheet controls expose aria-pressed", control.includes("aria-pressed=\"") && control.includes("is-marked"));
check("sheet controls preserve touch preventDefault", control.includes("ontouchend=\"event.preventDefault()"));
check("only inventory keys can be toggled", toggle.includes("finAgendaItems().some"));
check("unmark deletes the key instead of retaining false residue", toggle.includes("delete financingAgenda[key]"));
check("marking clears the not-now state", toggle.includes("financingAgendaDismissed = false"));

// Handoff is a salesperson-guided discussion agenda, not an application.
check("handoff renders only selected agenda items", handoff.includes("var selected = finAgendaSelected()") && handoff.includes("fin-agenda-list"));
check("handoff includes the consequence statement", handoff.includes("agendaConsequence"));
check("handoff retains an equally available not-now route", handoff.includes("hf2FinancingInterestNotNow") && handoff.includes("agendaNotNow"));
check("handoff can reopen the sheet to change the agenda", handoff.includes("agendaChange"));
check("renderer never focuses a hidden handoff", !handoff.includes(".focus("));
check("handoff not-now rerender restores focus to the replacement control",
  decline.includes("hadFocusInside") && decline.includes("hf2FinancingInterestChange")
  && decline.includes("hf2FinancingInterestNotNow") && decline.includes("target.focus()"));

// The copy must describe a salesperson/customer conversation, not self-service.
const copy = cfg.financing.copy;
for (const lang of ["en", "es"]) {
  check(`[${lang}] agenda prompt is bilingual`, typeof copy.agendaPrompt?.[lang] === "string" && copy.agendaPrompt[lang].length > 20);
  check(`[${lang}] no-application consequence is bilingual`, typeof copy.agendaConsequence?.[lang] === "string" && copy.agendaConsequence[lang].length > 20);
}
check("English prompt explicitly says review together", /together/i.test(copy.agendaPrompt.en));
check("English prompt names the customer as discussion owner", /customer/i.test(copy.agendaPrompt.en));

// Privacy and isolation: no choice telemetry, no transport, no persistence,
// and the one authoritative session wipe clears both agenda structures.
check("diagnostic base excludes financing interest and agenda fields", !/\b(interest|agenda|planId)\s*:/.test(eventBase));
check("email payload does not transmit interest or agenda", !/financing:[\s\S]{0,700}(interest|agenda)/.test(html));
check("agenda state is memory-only", !/(localStorage|sessionStorage|indexedDB)\.[^(]*\([^)]*financingAgenda/.test(html));
check("session wipe clears the agenda map", wipe.includes("financingAgenda = {}"));
check("session wipe clears the declined state", wipe.includes("financingAgendaDismissed = false"));
check("legacy global financing-interest state is gone", !/var financingInterest\b/.test(html));

// Presentation-only means it cannot enter the scoring function.
const score = extract(/function calculateScores\([^)]*\)\s*\{[\s\S]*?\n    \}/, "calculateScores()");
check("agenda state is absent from score calculation", !/financingAgenda|finAgenda/.test(score));

console.log(`\nFinancing specialist agenda check: ${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
