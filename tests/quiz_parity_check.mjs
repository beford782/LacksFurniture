#!/usr/bin/env node
// Quiz extraction-fidelity check (TEMPORARY — lives only while index.html still
// carries the hardcoded QUESTIONS array; the app-hydration commit deletes both).
//
// Proves the config-driven quiz pipeline ships exactly what the app hardcodes:
// extracts the live QUESTIONS literal from index.html, applies the one known
// transform (body_type's dynamicCopy function -> declarative copyVariants), and
// deep-compares the result against shipped data/quiz.json. Also pins every
// option icon id to the app's built-in icon map.
//
// Run:  node tests/quiz_parity_check.mjs
//       node tests/quiz_parity_check.mjs --write-incoming   (one-time extraction
//         that (re)generates incoming/dreamfinder_quiz.json from index.html)

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(REPO, "index.html"), "utf8");

// ---- Extract and evaluate the real hardcoded array ------------------------
const m = html.match(/const QUESTIONS = (\[[\s\S]*?\n {4}\]);/);
if (!m) {
  console.log("  [FAIL] QUESTIONS literal not found in index.html");
  process.exit(1);
}
const QUESTIONS = (0, eval)("(" + m[1] + ")");

// ---- Transform to the config shape ----------------------------------------
// Identical data except dynamicCopy (a function, not serializable): its
// partner/family output becomes a declarative copyVariants entry. The shape is
// verified before translating so a future edit to the function can't be
// silently mistranslated.
function toConfigQuestions(qs) {
  return qs.map((q) => {
    const out = {};
    for (const [k, v] of Object.entries(q)) {
      if (k !== "dynamicCopy") out[k] = v;
    }
    if (typeof q.dynamicCopy === "function") {
      const solo = q.dynamicCopy({ partner_sleep: "solo" });
      const couple = q.dynamicCopy({ partner_sleep: "partner" });
      const family = q.dynamicCopy({ partner_sleep: "family" });
      if (solo !== null || !couple || !couple.question || !couple.helpText
          || JSON.stringify(couple) !== JSON.stringify(family)) {
        throw new Error(`dynamicCopy on '${q.id}' no longer matches the known `
          + `partner/family shape — update the copyVariants translation`);
      }
      out.copyVariants = [{
        when: { question: "partner_sleep", answerIn: ["partner", "family"] },
        question: couple.question,
        helpText: couple.helpText,
      }];
    }
    return out;
  });
}

const extracted = JSON.parse(JSON.stringify(toConfigQuestions(QUESTIONS)));

// ---- One-time extraction mode ---------------------------------------------
if (process.argv.includes("--write-incoming")) {
  const out = {
    _meta: {
      description: "DreamFinder quiz — canonical editable source. Rides the "
        + "workbook Quiz tab as a JSON envelope {\"quiz\": ...} and ships as "
        + "data/quiz.json (see tools/convert_store_data.py build_quiz).",
      contract: "Question ids, option ids, types, order, and scores are an "
        + "app-level contract validated by tools/validation.py validate_quiz — "
        + "app logic consumes them by name. Copy fields (category, question, "
        + "helpText, label, sublabel, copyVariants text) may be edited; "
        + "structure may not, without an app-code review.",
      extractedFrom: "index.html QUESTIONS array (scripted extraction via "
        + "tests/quiz_parity_check.mjs --write-incoming; dynamicCopy translated "
        + "to copyVariants)",
    },
    quiz: { questions: extracted },
  };
  const dest = path.join(REPO, "incoming", "dreamfinder_quiz.json");
  fs.writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${dest} (${extracted.length} questions)`);
  process.exit(0);
}

// ---- Parity check mode -----------------------------------------------------
let passed = 0, failed = 0;
function check(label, ok, detail = "") {
  if (ok) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " — " + detail : ""}`); }
}

// Canonical deep-compare: key order independent, values exact.
function canon(v) {
  if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
  if (v && typeof v === "object") {
    return "{" + Object.keys(v).sort()
      .map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

const shipped = JSON.parse(
  fs.readFileSync(path.join(REPO, "data", "quiz.json"), "utf8"));
const incoming = JSON.parse(
  fs.readFileSync(path.join(REPO, "incoming", "dreamfinder_quiz.json"), "utf8"));

check("12 questions extracted from index.html", extracted.length === 12);
check("shipped data/quiz.json deep-equals the extracted hardcoded array",
  canon(shipped.questions) === canon(extracted));
check("incoming/dreamfinder_quiz.json deep-equals the extracted array",
  canon(incoming.quiz.questions) === canon(extracted));

// Per-question drill-down on mismatch (diagnostics only).
if (canon(shipped.questions) !== canon(extracted)) {
  for (let i = 0; i < Math.max(shipped.questions.length, extracted.length); i++) {
    if (canon(shipped.questions[i]) !== canon(extracted[i])) {
      console.log(`         first divergent question index ${i} `
        + `(${(extracted[i] || shipped.questions[i] || {}).id})`);
      break;
    }
  }
}

// Every icon id must exist in the app's built-in icon map (s[name] || s.moon
// falls back silently, so a typo'd icon would otherwise ship undetected).
const iconIds = new Set();
for (const q of extracted) {
  for (const o of q.options || []) if (o.icon) iconIds.add(o.icon);
}
const missingIcons = [...iconIds].filter(
  (id) => !new RegExp(`\\b${id}: '<svg`).test(html));
check("every option icon id exists in the app icon map",
  missingIcons.length === 0, `missing: ${missingIcons.join(", ")}`);

console.log(`\nQuiz parity check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
