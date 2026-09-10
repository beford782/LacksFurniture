// Prototype NEGATIVE/MUTATION runner — retained evidence that the positive
// observers actually catch the defects they claim to catch.
//
// Run: node prototypes/phase1-decision-package/fixtures/tools/contract_negative_check.mjs
// Exit 0 = baseline green AND every mutation caught; exit 1 otherwise.
//
// Method (per mutation):
//   1. The UNMODIFIED baseline observers run first; any red aborts the run
//      (a mutation "caught" against a red baseline proves nothing).
//   2. The whole prototypes/phase1-decision-package tree is copied to an
//      isolated temp directory; the mutation is applied THERE, never to the
//      worktree, and the runner verifies the edit applied exactly the
//      expected number of times (else the mutation is reported STALE).
//   3. The named responsible observer runs against the mutated copy
//      (CONTRACT_PKG_DIR / PARITY_FIXTURES_DIR overrides); it must exit
//      nonzero AND its failure output must match the intended-property
//      pattern — a nonspecific failure does not count as caught.
//   4. The temp copy is discarded; the next mutation starts from pristine.
//   Results are reported as CAUGHT / SURVIVED / STALE, separately.
//
// The strict-language mutations additionally demonstrate the vacuity the
// strict resolvers closed: the same missing-Spanish mutation is re-run with
// the resolver reverted to the legacy en-fallback shape, and the runner
// asserts English WOULD have appeared — proving the old shared-L behavior
// masked the defect while the corrected candidate fails/omits as required.
//
// PROTOTYPE-ONLY TOOLING. Not repository CI; report its result separately.

import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { runVariant, queryAll, loadFixture } from "./stub_dom.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const pkg = join(root, "prototypes", "phase1-decision-package");
const toolsDir = join(pkg, "fixtures", "tools");

function runNode(script, env) {
  try {
    const out = execFileSync(process.execPath, [script], {
      env: { ...process.env, ...env }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: (e.stdout || "") + (e.stderr || "") };
  }
}

/* ---------------- 1. baseline gate ---------------- */

console.log("== baseline observers (unmutated) ==");
const baseParity = runNode(join(toolsDir, "parity_check.mjs"));
const baseContract = runNode(join(toolsDir, "contract_check.mjs"));
console.log(`  parity:   exit ${baseParity.code}  ${(baseParity.out.match(/\d+ passed, \d+ failed/) || [""])[0]}`);
console.log(`  contract: exit ${baseContract.code}  ${(baseContract.out.match(/\d+ passed, \d+ failed/g) || []).pop() || ""}`);
if (baseParity.code !== 0 || baseContract.code !== 0) {
  console.error("ABORT: baseline observers are red — mutation results would be meaningless.");
  process.exit(1);
}

/* ---------------- 2. mutation definitions ---------------- */

// file paths are relative to the package root; find/replace are exact
// strings; expect = required occurrence count of `find` before mutation.
const REASON_DEFAULT_G1 = "Merino wool, cashmere, and graphite latex over multiple coil layers"; // data/mattresses.json g1 reason_default excerpt

const MUTATIONS = [
  {
    name: "wrong Sleep Brief hero (rows[last] instead of rows[0])",
    file: "sleep-brief-recommended/sbr.js", observer: "contract",
    find: 'setText("sbrHeroTitle", rows[0].title);',
    replace: 'setText("sbrHeroTitle", rows[rows.length - 1].title);',
    failPattern: /hero title == priorityRows\[0\]\.title/,
  },
  {
    name: "reordered priorities",
    file: "sleep-brief-recommended/sbr.js", observer: "contract",
    find: "rows.forEach(function (row, i) {",
    replace: "rows.slice().reverse().forEach(function (row, i) {",
    failPattern: /row \d title exact/,
  },
  {
    name: "altered firmness (+1)",
    file: "sleep-brief-recommended/sbr.js", observer: "contract",
    find: "var value = fixture.firmness && fixture.firmness.value;",
    replace: "var value = (fixture.firmness && fixture.firmness.value) + 1;",
    failPattern: /firmness segments filled == exact integer/,
  },
  {
    name: "match percentage leakage",
    file: "results-tabs/script.js", observer: "contract",
    find: "body.appendChild(firmnessBlock(entry));",
    replace: 'body.appendChild(firmnessBlock(entry));\n      body.appendChild(el("p", { text: entry.pct + "% match" }));',
    failPattern: /no captured match percentage renders/,
  },
  {
    name: "missing tier",
    file: "results-tabs/script.js", observer: "contract",
    find: 'var TIERS = ["gold", "silver", "bronze"];',
    replace: 'var TIERS = ["gold", "silver"];',
    failPattern: /exactly three role=tab/,
  },
  {
    name: "reordered tier",
    file: "results-tabs/script.js", observer: "contract",
    find: 'var TIERS = ["gold", "silver", "bronze"];',
    replace: 'var TIERS = ["silver", "gold", "bronze"];',
    failPattern: /exactly three role=tab|card ids == fixture membership\+order/,
  },
  {
    name: "Bronze descriptor restored",
    file: "results-tabs/script.js", observer: "contract",
    find: "tiersSection.appendChild(tablist);",
    replace: 'tiersSection.appendChild(tablist);\n    tiersSection.appendChild(el("p", { text: "Bronze · entry-level" }));',
    failPattern: /no buyer-characterising tier descriptor in render/,
  },
  {
    name: "Compare opens with no focus/scroll consequence",
    file: "results-tabs/script.js", observer: "contract",
    find: '        compareHeadingEl.scrollIntoView({ block: "start" });\n        compareHeadingEl.focus({ preventScroll: true });',
    replace: "",
    failPattern: /opening Compare scrolls to AND focuses/,
  },
  {
    name: "Compare opener retains open-state label",
    file: "results-tabs/script.js", observer: "contract",
    find: "      setOpenerLabels();\n      if (state.panelOpen) {",
    replace: "      if (state.panelOpen) {",
    failPattern: /open state — both compare controls read/,
  },
  {
    name: '"finalists" used for page-local selection',
    file: "results-tabs/script.js", observer: "contract",
    find: 'compareOpen: { en: "Compare selected mattresses", es: "Comparar colchones seleccionados" },',
    replace: 'compareOpen: { en: "Compare finalists", es: "Comparar finalistas" },',
    failPattern: /"finalists" vocabulary only in the production-constraint footnote|closed opener carries the action label/,
  },
  {
    name: "product-story/topPickReason promotion restored",
    file: "results-tabs/script.js", observer: "contract",
    find: "      body.appendChild(firmnessBlock(entry));",
    replace: '      body.appendChild(firmnessBlock(entry));\n      if (isLead) body.appendChild(el("div", { "class": "product-story" }, [el("p", { text: entry.topPickReason[activeLang] })]));',
    failPattern: /topPickReason does NOT render|no product-story block exists/,
  },
  {
    name: "generic reason_default substituted into a personalized reason slot",
    file: "results-tabs/script.js", observer: "contract",
    find: '      var fit = el("div", { "class": "customer-fit" + (full ? "" : " is-compact") });',
    replace: `      rows = [{ title: ${JSON.stringify(REASON_DEFAULT_G1)}, desc: "generic default copy", tag: "FEATURE", matched: false }];\n      var fit = el("div", { "class": "customer-fit" + (full ? "" : " is-compact") });`,
    failPattern: /fit-row titles == fixture rows by index/,
  },
  {
    name: "evaluation mode still shows reviewer apparatus",
    file: "results-tabs/script.js", observer: "contract",
    find: 'function reviewerOnly() { return activeMode !== "evaluation"; }',
    replace: "function reviewerOnly() { return true; }",
    failPattern: /zero prototype-chrome elements in evaluation output/,
  },
  {
    name: "array replaced by numeric-key object (hash re-blessed)",
    file: "fixtures/scenario-boundary-one.json", observer: "parity", reblessHash: true,
    find: '"autoPair": [\n   "g7",\n   "s6"\n  ],',
    replace: '"autoPair": {"0": "g7", "1": "s6"},',
    failPattern: /object vs array|array vs object/,
  },
  {
    name: "fixture hash moved to the wrong PROVENANCE row",
    file: "fixtures/PROVENANCE.md", observer: "parity", swapHashes: ["scenario-dense-c.json", "scenario-dense-a.json"],
    failPattern: /matches its exact PROVENANCE\.md table row/,
  },
];

/* ---------------- 3. helpers ---------------- */

function makeSandbox() {
  const dir = mkdtempSync(join(tmpdir(), "df-negative-"));
  cpSync(pkg, dir, { recursive: true });
  return dir;
}

// EOL-portable mutation application (Codex re-review fix): a fresh
// checkout under core.autocrlf=true materializes these files with CRLF,
// which would make every exact multiline `find` (authored with LF-only
// escapes) miss and report STALE. Matching therefore runs on
// LF-normalized text, and the mutated result is written back in the
// file's ORIGINAL line-ending style so the sandbox stays
// self-consistent. Applied-exactly-once verification is preserved, on
// the normalized text.
function applyTextMutation(sandbox, m) {
  const path = join(sandbox, m.file);
  const raw = readFileSync(path, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const before = raw.split("\r\n").join("\n");
  const count = before.split(m.find).length - 1;
  if (count !== (m.occurrences || 1)) return { ok: false, count };
  const after = before.split(m.find).join("\u0000SPLIT\u0000").replace(/\u0000SPLIT\u0000/g, () => m.replace);
  if (after === before) return { ok: false, count };
  writeFileSync(path, eol === "\r\n" ? after.split("\n").join("\r\n") : after);
  return { ok: true, count };
}

function sha256LF(path) {
  const { createHash } = awaitCrypto();
  return createHash("sha256").update(readFileSync(path, "utf8").split("\r\n").join("\n")).digest("hex");
}
import { createHash } from "node:crypto";
function awaitCrypto() { return { createHash }; }

let caught = 0, survived = 0, stale = 0;
const rows = [];

function record(name, status, detail) {
  if (status === "CAUGHT") caught++;
  else if (status === "SURVIVED") survived++;
  else stale++;
  rows.push({ name, status, detail });
  console.log(`  [${status}] ${name}${detail ? " — " + detail : ""}`);
}

/* ---------------- 4. file-level mutations ---------------- */

console.log("\n== file-level mutations ==");
for (const m of MUTATIONS) {
  const sandbox = makeSandbox();
  try {
    let applied;
    if (m.swapHashes) {
      // swap the two named fixture-hash rows in the sandbox PROVENANCE
      const provPath = join(sandbox, "fixtures", "PROVENANCE.md");
      let prov = readFileSync(provPath, "utf8");
      const hashOf = (f) => (prov.match(new RegExp(`\\| ${f.replace(/\./g, "\\.")} \\| \`([0-9a-f]{64})\``)) || [])[1];
      const [fA, fB] = m.swapHashes;
      const hA = hashOf(fA), hB = hashOf(fB);
      applied = { ok: !!(hA && hB && hA !== hB) };
      if (applied.ok) {
        prov = prov.replace(hA, "\u0000TMP\u0000").replace(hB, hA).replace("\u0000TMP\u0000", hB);
        writeFileSync(provPath, prov);
      }
    } else {
      applied = applyTextMutation(sandbox, m);
      if (applied.ok && m.reblessHash) {
        // re-bless the mutated fixture's hash so the row-bound hash check
        // passes and the DEEP COMPARE is what must catch the shape change.
        const f = m.file.split("/").pop();
        const provPath = join(sandbox, "fixtures", "PROVENANCE.md");
        let prov = readFileSync(provPath, "utf8");
        prov = prov.replace(
          new RegExp(`(\\| ${f.replace(/\./g, "\\.")} \\| \`)[0-9a-f]{64}(\`)`),
          `$1${sha256LF(join(sandbox, m.file))}$2`);
        writeFileSync(provPath, prov);
      }
    }
    if (!applied.ok) { record(m.name, "STALE", `mutation did not apply (found ${applied.count ?? "?"}×)`); continue; }

    const env = m.observer === "parity"
      ? { PARITY_FIXTURES_DIR: join(sandbox, "fixtures") }
      : { CONTRACT_PKG_DIR: sandbox };
    const script = join(toolsDir, m.observer === "parity" ? "parity_check.mjs" : "contract_check.mjs");
    const res = runNode(script, env);
    if (res.code === 0) record(m.name, "SURVIVED", "observer stayed green");
    else if (m.failPattern.test(res.out)) record(m.name, "CAUGHT", "");
    else record(m.name, "SURVIVED", "observer red but NOT on the intended property");
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

/* ---------------- 5. strict-language mutations (with legacy-fallback
   demonstration): remove the Spanish side of each surface, prove the
   strict candidate fails/omits with NO English, then prove the legacy
   en-fallback resolver WOULD have produced English. ---------------- */

console.log("\n== strict-language mutations (ES removed; legacy demonstrated) ==");

const LEGACY_TABS = {
  find: "  function LOpt(obj) {\n    if (obj == null) return null;\n    if (typeof obj === \"string\") return obj;\n    return obj[activeLang] != null && obj[activeLang] !== \"\" ? obj[activeLang] : null;\n  }",
  replace: "  function LOpt(obj) {\n    if (obj == null) return null;\n    if (typeof obj === \"string\") return obj;\n    return obj[activeLang] != null ? obj[activeLang] : (obj.en != null ? obj.en : null);\n  }",
};
const LEGACY_SBR = {
  find: "  function LX(obj, lang) {\n    if (obj == null) return null;\n    if (typeof obj === \"string\") return obj;\n    return obj[lang] != null && obj[lang] !== \"\" ? obj[lang] : null;\n  }",
  replace: "  function LX(obj, lang) {\n    if (obj == null) return null;\n    if (typeof obj === \"string\") return obj;\n    return obj[lang] != null ? obj[lang] : (obj.en != null ? obj.en : null);\n  }",
};

// Each entry removes the ES side of one required/optional surface.
// expect: "failure" (required → controlled contract failure naming the
// string) or "omission" (optional → element absent). englishValue is the
// EN string that must NOT appear strictly and MUST appear under legacy.
const LANG_MUTATIONS = [
  {
    name: "proposed Results action copy (P.compareOpen)",
    file: "results-tabs/script.js", variant: "tabs", expect: "failure",
    // capture WITHOUT opening the panel: opening swaps the opener label to
    // the (still-Spanish) Close pair, which would hide the legacy English.
    open: false,
    find: 'compareOpen: { en: "Compare selected mattresses", es: "Comparar colchones seleccionados" },',
    replace: 'compareOpen: { en: "Compare selected mattresses" },',
    englishValue: "Compare selected mattresses", failureNames: "P.compareOpen",
  },
  {
    name: "financing string (FC.fitFirst)",
    file: "results-tabs/script.js", variant: "tabs", expect: "failure",
    find: '      en: "Your matches are based on sleep fit — never on payment method.",\n      es: "Tus opciones se basan en tu descanso — nunca en la forma de pago.",',
    replace: '      en: "Your matches are based on sleep fit — never on payment method.",',
    englishValue: "Your matches are based on sleep fit", failureNames: "FC.fitFirst",
  },
  {
    name: "prototype-chrome string (CHROME.cardSim)",
    file: "results-tabs/script.js", variant: "tabs", expect: "failure",
    find: '      en: "Prototype: the Details and Save actions on the cards are simulated — no live app behind this screen.",\n      es: "Prototipo: las acciones de Detalles y Guardar en las tarjetas son simuladas — no hay una aplicación real detrás de esta pantalla.",',
    replace: '      en: "Prototype: the Details and Save actions on the cards are simulated — no live app behind this screen.",',
    englishValue: "no live app behind this screen", failureNames: "CHROME.cardSim",
  },
  {
    name: "accessible firmness template (P.firmnessSrPre)",
    file: "results-tabs/script.js", variant: "tabs", expect: "failure",
    find: 'firmnessSrPre: { en: "Firmness: ", es: "Firmeza: " },',
    replace: 'firmnessSrPre: { en: "Firmness: " },',
    englishValue: "Firmness: ", failureNames: "P.firmnessSrPre",
  },
  {
    name: "Sleep Brief proposed copy (PROPOSED.basis)",
    file: "sleep-brief-recommended/sbr.js", variant: "sbr", expect: "failure",
    find: 'basis: { en: "In order, based on your answers",\n             es: "En orden, según tus respuestas" },',
    replace: 'basis: { en: "In order, based on your answers" },',
    englishValue: "In order, based on your answers", failureNames: "PROPOSED.basis",
  },
  {
    name: "differentiator detail (fixture ES side removed)",
    file: "fixtures/scenario-dense-c.json", variant: "tabs", expect: "omission",
    fixtureEdit: (fx) => {
      const entry = fx.results.tierData.gold[0];
      const en = entry.differentiators[0].detail.en;
      delete entry.differentiators[0].detail.es;
      return en;
    },
  },
  {
    name: "per-FIELD deletion inside a fit row (would have rendered the literal 'undefined')",
    file: "fixtures/scenario-dense-c.json", variant: "tabs", expect: "failure",
    // Raw per-language scalar reads — no resolver ever touched them and no
    // fallback path existed; before the gap fix this rendered "undefined"
    // with every observer green.
    legacyApplicable: false,
    failureNames: "cardPriorities.es[0].desc",
    fixtureEdit: (fx) => {
      const id = fx.results.tierData.gold[0].id;
      const en = fx.results.cardPriorities.en[id][0].desc;
      delete fx.results.cardPriorities.es[id][0].desc;
      return en;
    },
  },
  {
    name: "whole per-language fit-row table missing (cardPriorities.es)",
    file: "fixtures/scenario-dense-c.json", variant: "tabs", expect: "failure",
    legacyApplicable: false,
    failureNames: "results.cardPriorities.es",
    fixtureEdit: (fx) => {
      const id = fx.results.tierData.gold[0].id;
      const en = fx.results.cardPriorities.en[id][0].title;
      delete fx.results.cardPriorities.es;
      return en;
    },
  },
  {
    name: "trial focus present in EN but missing in ES",
    file: "fixtures/scenario-dense-c.json", variant: "tabs", expect: "failure",
    legacyApplicable: false,
    failureNames: "profile.es.resultsTrialFocus",
    fixtureEdit: (fx) => {
      delete fx.profile.es.resultsTrialFocus;
      return "YOUR TRIAL FOCUS";
    },
  },
  {
    name: "fit rows (fixture ES side removed for the gold lead)",
    file: "fixtures/scenario-dense-c.json", variant: "tabs", expect: "omission",
    // cardPriorities is selected STRUCTURALLY per language
    // (cardPriorities[lang]), never through a resolver — no English-fallback
    // path has ever existed for this surface, so there is no legacy behavior
    // to demonstrate; the mutation proves strict omission with no English.
    legacyApplicable: false,
    fixtureEdit: (fx) => {
      const id = fx.results.tierData.gold[0].id;
      const en = fx.results.cardPriorities.en[id][0].title;
      delete fx.results.cardPriorities.es[id];
      return en;
    },
  },
];

function runTabsEs(sandbox, fixture, open) {
  const res = { threw: null, doc: null };
  try {
    const r = runVariant(join(sandbox, "results-tabs", "script.js"), fixture, "dense-c", "es");
    res.doc = r.doc;
    if (open) {
      const cards = queryAll(r.doc.getElementById("tierPanel"), ".m-card");
      queryAll(cards[0], ".compare-toggle")[0].dispatch("click");
      queryAll(cards[1], ".compare-toggle")[0].dispatch("click");
      queryAll(r.doc.getElementById("app"), ".compare-entry")[0].dispatch("click");
    }
  } catch (e) { res.threw = e; }
  return res;
}
function runSbrEs(sandbox, fixture) {
  const res = { threw: null, doc: null };
  try {
    res.doc = runVariant(join(sandbox, "sleep-brief-recommended", "sbr.js"), fixture, "dense-c", "es").doc;
  } catch (e) { res.threw = e; }
  return res;
}
function docText(doc) {
  let t = doc.title + "\n";
  const seen = new Set();
  const gather = (n) => {
    if (!n || seen.has(n)) return; seen.add(n);
    t += n._text || "";
    if (n._innerHTML) t += String(n._innerHTML).replace(/<[^>]*>/g, "");
    (n.children || []).forEach((c) => (c.nodeType === 3 ? (t += c.textContent) : gather(c)));
  };
  ["app", "sbrMain", "sbrHeroTitle", "sbrBasis", "sbrPriorityList", "sbrBadges", "sbrFirm",
    "sbrLegend", "sbrSimCaption", "sbrEditBtn", "sbrCtaBtn", "sbrJourneyList"].forEach((id) => gather(doc.getElementById(id)));
  return t;
}

for (const m of LANG_MUTATIONS) {
  const sandbox = makeSandbox();
  try {
    // apply the ES-removal mutation
    let englishValue = m.englishValue;
    if (m.fixtureEdit) {
      const p = join(sandbox, m.file);
      const fx = JSON.parse(readFileSync(p, "utf8"));
      englishValue = m.fixtureEdit(fx);
      writeFileSync(p, JSON.stringify(fx, null, 1) + "\n");
    } else {
      const applied = applyTextMutation(sandbox, m);
      if (!applied.ok) { record(m.name, "STALE", "mutation did not apply"); continue; }
    }

    const fixture = loadFixture(join(sandbox, "fixtures"), "dense-c");
    const doOpen = m.open !== false;
    const strict = m.variant === "sbr" ? runSbrEs(sandbox, fixture) : runTabsEs(sandbox, fixture, doOpen);

    let strictOk, detail = "";
    if (m.expect === "failure") {
      const msg = strict.threw ? String(strict.threw.message) : "";
      const named = msg.includes("FALLO DE CONTRATO") && msg.includes(m.failureNames);
      const noEnglish = !strict.doc || !docText(strict.doc).includes(englishValue);
      strictOk = !!strict.threw && named && noEnglish;
      if (!strictOk) detail = strict.threw ? `threw but ${named ? "English leaked" : "wrong message: " + msg.slice(0, 80)}` : "did not throw";
    } else {
      const text = strict.doc ? docText(strict.doc) : "";
      const noEnglish = !text.includes(englishValue);
      strictOk = !strict.threw && noEnglish;
      if (!strictOk) detail = strict.threw ? "threw unexpectedly" : "English appeared under strict resolver";
    }

    // legacy demonstration: revert the resolver to the en-fallback shape in
    // the SAME sandbox and prove English WOULD appear (and no throw).
    if (m.legacyApplicable === false) {
      if (strictOk) record(m.name, "CAUGHT", `strict ${m.expect}; legacy n/a (no fallback path ever existed)`);
      else record(m.name, "SURVIVED", detail);
      continue;
    }
    const legacy = m.variant === "sbr" ? LEGACY_SBR : LEGACY_TABS;
    const legacyFile = m.variant === "sbr" ? "sleep-brief-recommended/sbr.js" : "results-tabs/script.js";
    const legacyApplied = applyTextMutation(sandbox, { file: legacyFile, ...legacy });
    let legacyOk = false, legacyDetail = "legacy resolver patch did not apply";
    if (legacyApplied.ok) {
      const l = m.variant === "sbr" ? runSbrEs(sandbox, fixture) : runTabsEs(sandbox, fixture, doOpen);
      const text = l.doc ? docText(l.doc) : "";
      legacyOk = !l.threw && text.includes(englishValue);
      legacyDetail = legacyOk ? "" : (l.threw ? "legacy run threw" : "legacy run did not produce English");
    }

    if (strictOk && legacyOk) record(m.name, "CAUGHT", `strict ${m.expect}; legacy produced English`);
    else record(m.name, "SURVIVED", [detail, legacyDetail].filter(Boolean).join("; "));
  } finally {
    rmSync(sandbox, { recursive: true, force: true });
  }
}

/* ---------------- 6. summary ---------------- */

console.log(`\n${caught} caught, ${survived} survived, ${stale} stale (of ${rows.length})`);
if (survived || stale) {
  console.log("Non-caught mutations:");
  rows.filter((r) => r.status !== "CAUGHT").forEach((r) => console.log(`  - [${r.status}] ${r.name} — ${r.detail}`));
}
process.exit(survived || stale ? 1 : 0);
