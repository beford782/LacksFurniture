// Isolation check #5 structural-honesty ratchet (revision 3).
//
// Guards against the exact rev-2 defect class: the in-app check comparing a
// fingerprint key the fingerprint never emits (pe.suppressed === ps.suppressed
// evaluated undefined === undefined, so the "suppression state" third of the
// check's label was vacuously true).
//
// Asserts, statically, against the prototype source:
//   1. payFingerprint() emits a `structural:` object and a `strings:` field,
//      and never returns unparseable non-JSON (the old "none" string).
//   2. The structural literal carries every property check #5 claims to cover.
//   3. structuralSame compares pe.structural vs ps.structural WHOLESALE via
//      JSON.stringify, and asserts strings DIFFER (copy actually changed).
//   4. Every pe.<key>/ps.<key> the comparison references is a key the
//      fingerprint actually emits at top level.
//
// Run: node prototypes/demo-round-2026-08-13/checks/iso5_structural_check.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "index.html"), "utf8");

let failures = 0;
function assert(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + "  " + name);
  if (!cond) failures++;
}

// --- extract payFingerprint ---
const fpStart = src.indexOf("function payFingerprint()");
assert("payFingerprint() exists", fpStart > -1);
const fpEnd = src.indexOf("\nfunction ", fpStart + 1);
const fp = src.slice(fpStart, fpEnd > -1 ? fpEnd : fpStart + 4000);

assert("fingerprint emits a structural: object", /structural:\s*\{/.test(fp));
assert("fingerprint emits a strings: field", /strings:\s*m\.cards\.map/.test(fp));
assert("unavailable model returns parseable JSON, not 'none'",
  !/return\s+"none"/.test(fp) && /structural:\s*null/.test(fp));

const REQUIRED_KEYS = ["order", "count", "scenarios", "mexicoLast", "exact",
  "offerCount", "stale", "detailSuppressed", "anyStale", "officialUrl",
  "destinations", "calc"];
// anchor on the object LITERAL — the unavailable-model early return also
// contains "structural:" (as null) and must not satisfy the key scan
const litStart = fp.indexOf("structural: {");
assert("fingerprint's structural object literal found", litStart > -1);
const structuralBlock = litStart > -1 ? fp.slice(litStart, fp.indexOf("strings:", litStart)) : "";
for (const k of REQUIRED_KEYS) {
  assert("structural emits `" + k + "`", new RegExp("\\b" + k + ":").test(structuralBlock));
}

// --- extract the structuralSame comparison ---
const cmpStart = src.indexOf("var structuralSame");
assert("structuralSame comparison exists", cmpStart > -1);
const cmpEnd = src.indexOf(";", cmpStart);
const cmp = src.slice(cmpStart, cmpEnd);

assert("compares the WHOLE structural object wholesale",
  cmp.includes("JSON.stringify(pe.structural) === JSON.stringify(ps.structural)"));
assert("asserts copy actually DIFFERS between EN and ES",
  cmp.includes("JSON.stringify(pe.strings) !== JSON.stringify(ps.strings)"));
assert("guards that structural exists on both fingerprints",
  cmp.includes("pe.structural && ps.structural"));

// --- every referenced fingerprint key must actually be emitted ---
const emittedTop = new Set(["structural", "strings"]);
const refs = [...cmp.matchAll(/\b(?:pe|ps)\.([A-Za-z_$][\w$]*)/g)].map(m => m[1]);
assert("comparison references at least one fingerprint key", refs.length > 0);
for (const r of new Set(refs)) {
  assert("referenced key `" + r + "` is actually emitted by payFingerprint", emittedTop.has(r));
}

process.exit(failures ? 1 : 0);
