// Trust integrity and transparency gate (Phase 1 cross-cutting, 2026-08-21).
//
// The gate's premise is that the app must tell the truth about itself: what a
// quiz answer changes, what leaves the device, who sees the answers, and how
// strong a match claim is. Each section below pins one of those truths to the
// code that makes it true, so the copy cannot drift away from the behaviour
// without this suite going red:
//
//   A. copy <-> engine correspondence — every canonical question has a row in
//      docs/quiz-copy-engine-correspondence.md whose cited score tags are the
//      question's real tags, the inert-tag set recorded there equals the set
//      computed from the shipped catalog, the shipped help lines are the lines
//      the document records, and no banned claim (weights, size filter, health
//      outcome, "easy fix", "best", ...) appears in any help line.
//   B. the heritage / trust-story rail is absent from production (no
//      quiz.trustStories, no validator contract, no renderer, no CLAUDE.md
//      paragraph) — the prototype is research, not product.
//   C. privacy voice — (added with the privacy commit)
//   D. tier-relativity legibility — (added with the legibility commit)
//
// Run: node tests/trust_integrity_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const html = read("index.html");
const norm = html.replace(/\r\n/g, "\n");
const QUIZ = JSON.parse(read("data", "quiz.json"));
const CANON = JSON.parse(read("incoming", "dreamfinder_quiz.json"));
const MATTRESSES = JSON.parse(read("data", "mattresses.json"));
const DOC = read("docs", "quiz-copy-engine-correspondence.md").replace(/\r\n/g, "\n");
const VALIDATION = read("tools", "validation.py");
const CLAUDE_MD = read("CLAUDE.md");

let checks = 0, failures = 0;
function ok(name, cond, detail = "") {
  checks++;
  if (!cond) failures++;
  console.log(`  ${cond ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  return !!cond;
}
function section(t) { console.log(`\n== ${t} ==`); }

// ================================================================ A. copy <-> engine
section("A — copy <-> engine correspondence (docs/quiz-copy-engine-correspondence.md)");

const questions = QUIZ.questions;
const canonical = CANON.quiz.questions;
ok("the generated quiz and its canonical source carry the same ten ids in the same order",
  questions.length === 10 && canonical.length === 10
  && questions.every((q, i) => q.id === canonical[i].id));

// One heading per canonical question, numbered by position, and nothing else.
const headings = [...DOC.matchAll(/^### (\d+)\. ([a-z_]+)\s*$/gm)].map((m) => ({ n: Number(m[1]), id: m[2] }));
ok("every canonical question has exactly one numbered section, in quiz order, and there are no extra sections",
  headings.length === questions.length
  && headings.every((h, i) => h.n === i + 1 && h.id === questions[i].id),
  headings.map((h) => `${h.n}.${h.id}`).join(","));

// The section text for one question id.
function sectionFor(id) {
  const start = DOC.indexOf(`\n### ${headings.findIndex((h) => h.id === id) + 1}. ${id}\n`);
  if (start < 0) return "";
  const rest = DOC.slice(start + 1);
  const next = rest.slice(1).search(/\n### \d+\. /);
  return next < 0 ? rest : rest.slice(0, next + 1);
}
function field(sec, label) {
  const m = sec.match(new RegExp(`^- \\*\\*${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:\\*\\*\\s*(.*)$`, "m"));
  return m ? m[1].trim() : null;
}
function tagsOf(q) {
  const set = new Set();
  (q.options || []).forEach((o) => Object.keys(o.scores || {}).forEach((t) => set.add(t)));
  return set;
}

// Cited tags must be EXACTLY the question's real score tags — no invented
// mechanism, and no live mechanism left undocumented.
for (const q of questions) {
  const sec = sectionFor(q.id);
  const cited = field(sec, "Cited tags");
  const real = tagsOf(q);
  const citedSet = new Set(cited === null || /^none\b/i.test(cited)
    ? [] : cited.replace(/\.$/, "").split(",").map((s) => s.trim()).filter(Boolean));
  const same = citedSet.size === real.size && [...real].every((t) => citedSet.has(t));
  ok(`${q.id}: the document cites exactly the question's real score tags`, cited !== null && same,
    `cited=[${[...citedSet].join(",")}] real=[${[...real].join(",")}]`);
}

// Zero-scoring questions are named as such.
const zeroScoring = questions.filter((q) => q.type !== "slider" && tagsOf(q).size === 0).map((q) => q.id);
ok("the two zero-scoring questions are trigger and mattress_size (engine fact)",
  zeroScoring.join(",") === "trigger,mattress_size");
ok("the document names the zero-scoring questions in its engine section",
  /\*\*Zero-scoring questions\.\*\*\s*`trigger` and `mattress_size`/.test(DOC));

// The inert-tag set recorded in the document equals the set computed from the
// shipped catalog. When 3.1 (case-fold) or 3.2 (vocabulary) ships, this fails
// on purpose: every help line must be re-audited against the new engine truth.
const catalogFeatures = new Set();
Object.values(MATTRESSES).forEach((list) => list.forEach((m) => (m.features || []).forEach((f) => catalogFeatures.add(f))));
const allTags = new Set();
questions.forEach((q) => tagsOf(q).forEach((t) => allTags.add(t)));
const inert = [...allTags].filter((t) => !catalogFeatures.has(t)).sort();
const docInert = (DOC.match(/`Inert tags: ([^`]*)`/) || [null, ""])[1].split(",").map((s) => s.trim()).filter(Boolean).sort();
ok("the inert-tag set recorded in the document equals the set computed from data/mattresses.json",
  inert.length === docInert.length && inert.every((t, i) => t === docInert[i]),
  `computed=[${inert.join(",")}] documented=[${docInert.join(",")}]`);
ok("the catalog still matches score tags case-sensitively (3.1 is locked; the copy was written for this)",
  /m\.features\?\.includes\(feat\)/.test(norm));

// The shipped help lines are the lines the document records, in both languages.
for (const q of questions) {
  const sec = sectionFor(q.id);
  const en = field(sec, "Current EN") ?? field(sec, "Current EN (unchanged)");
  const es = field(sec, "Current ES (provisional)") ?? field(sec, "Current ES (unchanged)");
  ok(`${q.id}: the shipped EN help line is the one the document records`, en !== null && en === q.helpText.en,
    en === q.helpText.en ? "" : `doc="${en}" shipped="${q.helpText.en}"`);
  ok(`${q.id}: the shipped ES help line is the one the document records`, es !== null && es === q.helpText.es,
    es === q.helpText.es ? "" : `doc="${es}" shipped="${q.helpText.es}"`);
}
ok("the canonical source and the generated bundle carry identical help lines (pipeline, not hand edits)",
  questions.every((q, i) => q.helpText.en === canonical[i].helpText.en && q.helpText.es === canonical[i].helpText.es));

// Banned claims. Each phrase is one the investigation found shipped, or one
// the gate forbids outright (numeric weights, outcomes, availability, feel
// promises, exclamation, markup — help lines are inserted unescaped).
const BANNED_EN = [
  /easy fix/i, /\bbiggest\b/i, /\bbest\b/i, /\bunmatched\b/i, /fits your space/i, /\bin stock\b/i,
  /fast delivery/i, /made in texas/i, /\brelieves?\b/i, /stops? snoring/i, /\bcures?\b/i, /\btreats?\b/i,
  /guarantee/i, /\bnever\b/i, /trusted for/i, /\d/, /!/, /[<&]/
];
const BANNED_ES = [
  /\bfácil\b/i, /\bmayores?\b/i, /\bmejor(es)?\b/i, /garantiz/i, /\bcura\b/i, /\balivia\b/i,
  /se ajusten a tu espacio/i, /clave para/i, /\bnunca\b/i, /\bsiempre\b/i, /\d/, /!/, /¡/, /[<&]/
];
function helpLines(q) {
  const out = [["en", q.helpText.en], ["es", q.helpText.es]];
  (q.copyVariants || []).forEach((v) => {
    if (v && v.helpText) out.push(["en", v.helpText.en], ["es", v.helpText.es]);
  });
  return out;
}
for (const q of questions) {
  const hits = [];
  for (const [lang, text] of helpLines(q)) {
    const rules = lang === "en" ? BANNED_EN : BANNED_ES;
    rules.forEach((re) => { if (re.test(text || "")) hits.push(`${lang}:${re}`); });
    if (!text || !text.trim()) hits.push(`${lang}:empty`);
  }
  ok(`${q.id}: no banned claim, digit, exclamation or markup in any help line (EN, ES, variants)`, hits.length === 0, hits.join(" "));
}

// The overclaims the investigation found are gone from the shipped copy.
ok("the three shipped overclaims and the benefit claim are gone in both languages",
  !/fits your space|biggest clue|easy fix|first upgrades you'll feel|se ajusten a tu espacio|clave para un sueño|mayores mejoras/i
    .test(JSON.stringify(questions.map((q) => q.helpText))));
ok("the size line does not claim availability",
  !/available|availability|disponib/i.test(questions.find((q) => q.id === "mattress_size").helpText.en
    + questions.find((q) => q.id === "mattress_size").helpText.es));
ok("the health line names no condition-to-product pairing as a treatment",
  !/snor|reflux|reflujo|ronqu|pain|dolor/i.test(questions.find((q) => q.id === "health_conditions").helpText.en
    + questions.find((q) => q.id === "health_conditions").helpText.es));
ok("the document records the re-audit triggers (scores, catalog tags, priorities, accessories, consultation, email)",
  /Code\/data locations that trigger a re-audit/.test(DOC) && /calculateScores\(\)/.test(DOC)
  && /resolveConsultationSummary\(\)/.test(DOC) && /scoreAccessoriesFromAnswers\(\)/.test(DOC));
ok("the document records the verification date and the outstanding approvals (owner sign-off, native ES)",
  /\*\*Verification date:\*\* 2026-08-21/.test(DOC) && /sign-off as governed quiz copy is\s+still owed/.test(DOC)
  && /NATIVE REVIEW REQUIRED/.test(DOC));

// ================================================================ B. no heritage rail
section("B — the trust-story / heritage rail is absent from production");
ok("data/quiz.json has no trustStories block (retailer prose never enters the quiz contract)",
  !("trustStories" in QUIZ) && !JSON.stringify(QUIZ).includes("trustStories"));
ok("incoming/dreamfinder_quiz.json has no trustStories block", !JSON.stringify(CANON).includes("trustStories"));
ok("index.html has no story-rail renderer, CSS or loader",
  !/quizTrustStoryMarkup|noct-quiz-trust|__DF_QUIZ_TRUST_STORIES|trustStories/.test(norm));
ok("tools/validation.py has no trustStories contract and no unknown_root tightening",
  !/trustStories|unknown_root/.test(VALIDATION));
ok("CLAUDE.md carries no paragraph legitimizing trustStories in quiz.json", !/trustStories/.test(CLAUDE_MD));
ok("the quiz root contract is still exactly {questions} (no widening for retailer prose)",
  Object.keys(QUIZ).join(",") === "questions" && Object.keys(CANON.quiz).join(",") === "questions");

// ================================================================ summary
console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
