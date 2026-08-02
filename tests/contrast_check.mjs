// Contrast check — Commit B (Cycle 1) invariants.
//
// Proves: (1) the REAL pickAccessibleForeground() extracted from index.html
// chooses a foreground with WCAG contrast >= 4.5:1 for the configured Lacks
// colors, the brand-neutral defaults, and edge cases; (2) the financing
// focus rules no longer derive from --store-primary and use the semantic
// two-ring tokens with a forced-colors override; (3) .fin-btn-primary keeps
// its hardcoded light-on-dark pairing.
//
// Ratio verification uses an INDEPENDENT luminance implementation below so
// a bug in the app helper cannot self-certify; the foreground CHOICE under
// test always comes from the real extracted function.
//
// Run: node tests/contrast_check.mjs

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

// --- extract and compile the real helper ---
const m = html.match(/function pickAccessibleForeground\(hex\)\s*\{[\s\S]*?\n    \}/);
check("pickAccessibleForeground() found in index.html", !!m);
const pick = m ? new Function(`${m[0]}; return pickAccessibleForeground;`)() : () => null;

// --- independent luminance / ratio (NOT the app implementation) ---
function lum(hex) {
  const h = hex.length === 4 ? [...hex.slice(1)].map(c => c + c).join("") : hex.slice(1);
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a, b) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// --- helper behavior: required palette ---
const cases = [
  ["#FABD0F", "#000000"], // Lacks storePrimary -> dark
  ["#FFD24D", "#000000"], // Lacks storePrimaryLight -> dark (independent pick)
  ["#B8935D", "#000000"], // brand-neutral default brass
  ["#C9A874", "#000000"], // brand-neutral default brass light
  ["#000000", "#FFFFFF"], // black bg -> white
  ["#FFFFFF", "#000000"], // white bg -> black
];
for (const [bg, want] of cases) {
  const got = pick(bg);
  check(`${bg} -> ${want}`, got === want);
  check(`${bg} pairing >= 4.5:1 (got ${ratio(bg, got ?? "#FF0000").toFixed(2)}:1)`, !!got && ratio(bg, got) >= 4.5);
}

// middle-luminance case: endpoints must still clear 4.5:1 (theoretical floor ~4.58)
const mid = pick("#767676");
check("middle gray #767676 picks a foreground", mid === "#000000" || mid === "#FFFFFF");
check(`middle gray pairing >= 4.5:1 (got ${ratio("#767676", mid ?? "#FF0000").toFixed(2)}:1)`, !!mid && ratio("#767676", mid) >= 4.5);

// three-digit hex expansion
check("#fff (3-digit) expands and picks #000000", pick("#fff") === "#000000");
check("#000 (3-digit) expands and picks #FFFFFF", pick("#000") === "#FFFFFF");

// malformed / missing input -> null fallback (CSS default stands)
for (const bad of ["yellow", "", "#FABD0", "#GGGGGG", null, undefined, 42]) {
  check(`unsupported input ${JSON.stringify(bad)} -> null`, pick(bad) === null);
}

// --- configured Lacks colors, straight from shipped config ---
check("shipped storePrimary is #FABD0F", cfg.colors.storePrimary === "#FABD0F");
check("shipped storePrimaryLight is #FFD24D", cfg.colors.storePrimaryLight === "#FFD24D");
check("Lacks normal CTA selects dark foreground", pick(cfg.colors.storePrimary) === "#000000");
check("Lacks hover CTA independently selects dark foreground", pick(cfg.colors.storePrimaryLight) === "#000000");

// --- static wiring: focus tokens ---
check("no :focus-visible rule uses --store-primary anymore",
  !/:focus-visible[^}]*var\(--store-primary\)/.test(html));
const focusSelectors = [".fin-btn:focus-visible", ".fin-sheet-close:focus-visible",
  ".fin-sheet-title:focus-visible", ".fin-official-link:focus-visible",
  "#resultsScreen .noct-results-cta:focus-visible"];
const consolidated = html.match(/\.fin-btn:focus-visible,[\s\S]{0,400}?\{[\s\S]*?\}/);
check("consolidated focus rule covers all five pilot selectors",
  !!consolidated && focusSelectors.every(s => consolidated[0].includes(s)));
check("focus rule uses semantic two-ring tokens",
  !!consolidated && consolidated[0].includes("var(--focus-ring-outer)") && consolidated[0].includes("var(--focus-ring-inner)"));
const forced = html.match(/@media \(forced-colors: active\)\s*\{[\s\S]*?\n    \}/);
check("forced-colors override exists for the same five selectors",
  !!forced && focusSelectors.every(s => forced[0].includes(s)));
check("forced-colors override uses CanvasText and drops the halo",
  !!forced && forced[0].includes("outline-color: CanvasText") && forced[0].includes("box-shadow: none"));
check(":root declares safe defaults for all four semantic tokens",
  ["--focus-ring-inner: #FFFFFF", "--focus-ring-outer: #000000",
   "--on-store-primary: #000000", "--on-store-primary-light: #000000"].every(s => html.includes(s)));

// --- static wiring: CTA foregrounds ---
check("results CTA normal state uses var(--on-store-primary)",
  /#resultsScreen \.noct-results-cta \{[^}]*color: var\(--on-store-primary\);/.test(html));
check("results CTA hover state uses var(--on-store-primary-light)",
  /#resultsScreen \.noct-results-cta:hover \{[^}]*color: var\(--on-store-primary-light\);/.test(html));
check("applyStoreConfig computes both foreground tokens via the helper",
  /--on-store-primary', onPrimary\)/.test(html) && /--on-store-primary-light', onPrimaryLight\)/.test(html));

// --- .fin-btn-primary must keep its hardcoded light-on-dark pairing ---
const finPrimary = html.match(/\.fin-btn-primary \{[^}]*\}/);
check(".fin-btn-primary keeps light-on-dark (#211E19 / #F7F2E8)",
  !!finPrimary && finPrimary[0].includes("background: #211E19") && finPrimary[0].includes("color: #F7F2E8"));
check(".fin-btn-primary does not use the on-store tokens",
  !!finPrimary && !finPrimary[0].includes("--on-store"));

console.log(`\nContrast check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
