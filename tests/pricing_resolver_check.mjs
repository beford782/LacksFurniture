// Phase 2.1b dark-resolver check — the JS leg of the pricing traversal.
//
// Extracts the REAL resolveDarkPricing() from index.html (the marked
// definition-only block), compiles it in a poisoned scope that proves purity
// behaviourally (no Date beyond Date.parse, no window/document/storage/fetch,
// no app globals), and drives it through the five-axis matrix over
// tests/fixtures/pricing_populated_fixture.json and in-memory governed
// variants under the fixture's INJECTED clock:
//
//   * the five axes are INDEPENDENT: a resolved price implies nothing about
//     calculation, threshold, cadence/freshness or eligibility;
//   * price axis: technically INVALID data (missing, unverified, unauthorized
//     source, malformed, expired) yields no numeric result in ANY context;
//     technically valid but STALE data resolves as INERT INTERNAL DATA — the
//     freshness axis reports 'stale' and every fail-closed consumer must
//     refuse anything not 'fresh' (the numeric-EXISTS assertion below is what
//     makes that refusal contract non-vacuous);
//   * activation-unapproved (case a): approvals stripped -> the price still
//     resolves numerically, eligibility reports not-eligible, and nothing
//     ships or renders (containment + zero live call sites, pinned here and
//     in tests/pricing_contract_check.py);
//   * threshold: EXPLICIT runtime transaction amount in MINOR units; absent
//     or invalid -> unknown; plan minimums are MAJOR units — the * 100
//     conversion is proven at the $499/$600-vs-$500 boundary;
//   * calculation: STATUS only, derived from formula-artifact validity under
//     financing governance — never from the exact-term output flag, which
//     the resolver does not read;
//   * totality: hostile JSON anywhere (lone surrogates included) never
//     throws and always yields the five-axis shape;
//   * planted mutants (the sweep's own replace strings) are each REJECTED by
//     the specific assertion that claims to catch them.
//
// Run: node tests/pricing_resolver_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const fx = JSON.parse(readFileSync(
  join(root, "tests", "fixtures", "pricing_populated_fixture.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail = "") {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
}
function section(name) { console.log(`\n== ${name} ==`); }

// ---- comment stripping (string-literal aware), mirrored from the email suite
function stripComments(source) {
  let out = "", i = 0, prev = "", prevWord = "";
  while (i < source.length) {
    const c = source[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === c) { j++; break; }
        j++;
      }
      out += source.slice(i, j);
      prev = c; prevWord = ""; i = j;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (c === "/" && /[=(,:;!&|?{}\n]/.test(prev || "\n") && !/return|typeof/.test(prevWord)) {
      // conservative regex-literal skip
      let j = i + 1, inClass = false;
      while (j < source.length) {
        if (source[j] === "\\") { j += 2; continue; }
        if (source[j] === "[") inClass = true;
        else if (source[j] === "]") inClass = false;
        else if (source[j] === "/" && !inClass) { j++; break; }
        else if (source[j] === "\n") break;
        j++;
      }
      out += source.slice(i, j);
      prev = "/"; prevWord = ""; i = j;
      continue;
    }
    out += c;
    if (!/\s/.test(c)) {
      prev = c;
      prevWord = /[A-Za-z0-9_$]/.test(c) ? prevWord + c : "";
    }
    i++;
  }
  return out;
}

function balancedBlock(src, from) {
  const openIdx = src.indexOf("{", from);
  if (openIdx === -1) return "";
  let depth = 0, i = openIdx;
  while (i < src.length) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < src.length) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      i = j; continue;
    }
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
    i++;
  }
  return "";
}

// ===========================================================================
section("Extraction, containment and purity");
// ===========================================================================
const START = "// ═══ PHASE 2.1B DARK RESOLVER (definition only — zero live call sites) ═══";
const END = "// ═══ END PHASE 2.1B DARK RESOLVER ═══";
check("resolver markers appear exactly once each",
  html.split(START).length === 2 && html.split(END).length === 2);
const blockStart = html.indexOf(START), blockEnd = html.indexOf(END);
check("resolver block is well-formed", blockStart !== -1 && blockEnd > blockStart);
const block = html.slice(blockStart, blockEnd);

const declAt = block.indexOf("function resolveDarkPricing(");
check("resolver declaration found inside the block", declAt !== -1);
const body = balancedBlock(block, declAt);
check("resolver body brace-balances", body.length > 0);
const fnSrc = block.slice(declAt, declAt + (block.indexOf(body, declAt) - declAt) + body.length);
check("resolver source extracted verbatim", fnSrc.startsWith("function resolveDarkPricing(") && fnSrc.endsWith("}"));

const fnCode = stripComments(fnSrc);
const htmlCode = stripComments(html);

// Zero live call sites: the name appears exactly once (its declaration) in
// the whole file's executable code.
check("resolveDarkPricing has ZERO live call sites (declaration only)",
  (htmlCode.match(/resolveDarkPricing\s*\(/g) || []).length === 1);
check("nothing anywhere reads the shipped pricing config (no STORE_CONFIG.pricing)",
  !/STORE_CONFIG\s*\.\s*pricing\b/.test(htmlCode) && !htmlCode.includes("getPricingConfig"));

// Escape-hardened containment (round-2 test audit R2): outside the resolver
// block, executable code never names `pricing` at all. Two scans close the
// substring lock's escapes: (A) the bare word over string-BLANKED code
// catches destructured ({pricing}), aliased (C.pricing) and identifier
// reads while sparing legitimate copy strings ("Final pricing, ...");
// (B) a bracket-access scan over string-KEPT code catches
// STORE_CONFIG['pricing']. Both pages get both scans.
function blankStrings(src) {
  return src
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/"(?:\\.|[^"\\])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}
const demoHtml = readFileSync(join(root, "demo", "black-friday", "index.html"), "utf8");
for (const [pageName, page] of [["index.html", html], ["demo/black-friday/index.html", demoHtml]]) {
  const s = page.indexOf(START), e = page.indexOf(END);
  check(`${pageName}: resolver markers present for the containment scan`, s !== -1 && e > s);
  const outside = page.slice(0, s) + page.slice(e + END.length);
  const outsideCode = stripComments(outside);
  const hitA = blankStrings(outsideCode).match(/[^\n]{0,40}\bpricing\b[^\n]{0,40}/);
  check(`${pageName}: the bare word 'pricing' never appears in executable code outside the block`,
    hitA === null, hitA ? hitA[0] : "");
  const hitB = outsideCode.match(/[^\n]{0,30}\[\s*['"`]pricing['"`]\s*\][^\n]{0,30}/);
  check(`${pageName}: no bracketed ['pricing'] access outside the block`,
    hitB === null, hitB ? hitB[0] : "");
}
check("...scan A fires on planted destructured and aliased reads",
  /\bpricing\b/.test(blankStrings(stripComments("const {pricing} = STORE_CONFIG;")))
  && /\bpricing\b/.test(blankStrings(stripComments("var C = STORE_CONFIG; C.pricing.enabled;"))));
check("...scan B fires on a planted bracketed read",
  /\[\s*['"`]pricing['"`]\s*\]/.test(stripComments("var x = STORE_CONFIG['pricing'];")));
check("...and scan A correctly spares a legitimate copy string",
  !/\bpricing\b/.test(blankStrings(stripComments("var t = 'Final pricing, eligibility, terms';"))));

// Source purity pins: the clock is a parameter; no ambient time, DOM, storage,
// network or app-global access; the exact-term output flag is never read.
check("resolver never calls Date.now or new Date()",
  !/Date\s*\.\s*now\b/.test(fnCode) && !/new\s+Date\s*\(/.test(fnCode));
check("resolver touches no DOM, storage, network or app global",
  // (?<!\.) — the pricing contract's own `entry.window` PROPERTY is data,
  // not the global; only a free-standing binding read counts.
  !/(?<![.\w$])(?:window|document|localStorage|sessionStorage|indexedDB|fetch|XMLHttpRequest|navigator|STORE_CONFIG|getFinancingConfig|financingTermsFresh|financingPlanFresh|currentLang|analytics|logEvent)\b/.test(fnCode));
check("resolver never reads the exact-term output flag",
  !fnCode.includes("exactPromotionsEnabled"));
check("resolver never encodes identity through URI functions (surrogate-safe)",
  !/encodeURI|decodeURI|escape\s*\(/.test(fnCode));

// Behavioural purity: compile with every dangerous binding shadowed. Date is
// a shim exposing ONLY parse — any other Date use throws and the totality
// sweep below would catch it.
const DATE_SHIM = { parse: Date.parse };
const factory = new Function(
  "window", "document", "localStorage", "sessionStorage", "fetch",
  "XMLHttpRequest", "STORE_CONFIG", "getFinancingConfig", "Date",
  `"use strict";\n${fnSrc}\nreturn resolveDarkPricing;`);
const resolver = factory(undefined, undefined, undefined, undefined, undefined,
  undefined, undefined, undefined, DATE_SHIM);
check("resolver compiles in the poisoned scope", typeof resolver === "function");

// ===========================================================================
section("Fixture base case — axes populated, independent");
// ===========================================================================
const CLOCK = Date.parse(fx._meta.clock);
check("fixture clock parses", Number.isFinite(CLOCK));
const P = () => JSON.parse(JSON.stringify(fx.pricing));
const F = () => JSON.parse(JSON.stringify(fx.financing));
const Q = (over = {}) => Object.assign(
  { productId: "g6", sku: "FIXTURE-0001", size: "queen",
    planId: "synchrony-9-99-72", nowMs: CLOCK }, over);
const AX = ["price", "calculation", "threshold", "freshness", "eligibility"];
const ENUMS = {
  price: ["resolved", "unavailable"],
  calculation: ["available", "quote-only", "unavailable"],
  threshold: ["met", "not-met", "unknown"],
  freshness: ["fresh", "stale", "not-judgeable"],
  eligibility: ["eligible", "not-eligible"],
};
function shapeOk(r) {
  return !!r && typeof r === "object"
    && AX.every((a) => r[a] && typeof r[a] === "object"
      && ENUMS[a].includes(r[a].status));
}
const base = resolver(P(), F(), Q());
check("base: five-axis shape with closed enums", shapeOk(base));
check("base: price RESOLVED with the fixture amount (integer minor units)",
  base.price.status === "resolved" && base.price.amountMinor === 369900
  && base.price.currency === "USD" && base.price.kind === "regular");
check("base: freshness fresh under the fixture clock", base.freshness.status === "fresh");
check("base: calculation AVAILABLE — the dark formula validates with exact-term output OFF",
  base.calculation.status === "available" && fx.financing.exactPromotionsEnabled === false);
check("base: threshold unknown with NO runtime amount", base.threshold.status === "unknown");
check("base: eligibility NOT-ELIGIBLE even fully approved — displayEnabled is false and axes are independent",
  base.eligibility.status === "not-eligible" && fx.pricing.displayEnabled === false);

// Determinism and freshness of the result object.
check("deterministic: two identical calls deep-equal",
  JSON.stringify(base) === JSON.stringify(resolver(P(), F(), Q())));
{
  const a = resolver(P(), F(), Q());
  a.price.amountMinor = 1;
  const b = resolver(P(), F(), Q());
  check("pure: mutating one result never leaks into the next", b.price.amountMinor === 369900);
}
// The exact-term flag is orthogonal at runtime too.
{
  const fOn = F(); fOn.exactPromotionsEnabled = true;
  check("exact-term flag flipped ON changes NO axis (never read)",
    JSON.stringify(resolver(P(), fOn, Q())) === JSON.stringify(base));
}

// ===========================================================================
section("Case (a) — technically valid, activation-unapproved: resolves numerically, not-eligible");
// ===========================================================================
function stripApprovals(p) {
  p.authority = { owner: "", role: "" };
  p.presentation = {
    status: "unapproved",
    approvals: { business: { status: "unapproved", by: "", at: null },
                 legal: { status: "unapproved", by: "", at: null },
                 nativeReview: { status: "pending", by: "", at: null } },
    assumptions: [], disclosures: [], states: {},
  };
  p.products[0].clearance = { status: "not-cleared", attestedBy: "", attestedAt: null, scope: null };
  return p;
}
const caseA = resolver(stripApprovals(P()), F(), Q());
check("case (a): the price axis RESOLVES numerically inside the governed fixture",
  caseA.price.status === "resolved" && caseA.price.amountMinor === 369900);
check("case (a): eligibility reports not-eligible", caseA.eligibility.status === "not-eligible");
check("case (a): freshness and calculation are untouched by approval state",
  caseA.freshness.status === "fresh" && caseA.calculation.status === "available");

// ===========================================================================
section("Case (b) — technically valid but STALE: inert internal data, axis reports stale");
// ===========================================================================
const DAY = 86400000;
const staleAll = resolver(P(), F(), Q({ nowMs: CLOCK + 30 * DAY }));
check("case (b): the numeric EXISTS — stale resolves as inert internal data, never stripped",
  staleAll.price.status === "resolved" && staleAll.price.amountMinor === 369900);
check("case (b): the cadence/freshness axis reports STALE", staleAll.freshness.status === "stale");
check("case (b): the financing side aged out independently (plan stale -> calculation unavailable, threshold unknown)",
  staleAll.calculation.status === "unavailable" && staleAll.threshold.status === "unknown");
// Boundary instants: verifiedAt + maxAgeDays exactly is FRESH (strictly-older
// is stale), one second past is STALE — mirroring the Python validator.
const EV_AT = Date.parse(fx.pricing.products[0].evidence.verifiedAt);
const LIMIT = EV_AT + fx.pricing.freshness.maxAgeDays * DAY;
check("boundary: exactly at verifiedAt+maxAgeDays -> fresh (strict inequality, both legs agree)",
  resolver(P(), F(), Q({ nowMs: LIMIT })).freshness.status === "fresh");
check("boundary: one second past the limit -> stale",
  resolver(P(), F(), Q({ nowMs: LIMIT + 1000 })).freshness.status === "stale");
// No governed cadence -> not-judgeable (never silently fresh), price untouched.
{
  const p = P();
  p.freshness = { status: "unapproved", maxAgeDays: null, approvedBy: "", approvedAt: null };
  const r = resolver(p, F(), Q());
  check("no governed cadence -> freshness not-judgeable, price still resolved",
    r.freshness.status === "not-judgeable" && r.price.status === "resolved");
}

// ===========================================================================
section("Converse — technically INVALID: no numeric result in any context");
// ===========================================================================
function leakFree(r) {
  return r.price.status === "unavailable" && r.price.amountMinor === null
    && !JSON.stringify(r).includes("369900");
}
const INVALID = [
  ["unknown productId", (p) => { p.products[0].productId = "g99"; }],
  ["unknown size (never inferred from queen)", null, { size: "king" }],
  ["missing size in the query", null, { size: undefined }],
  ["wildcard entry size", (p) => { p.products[0].size = "*"; }, { size: "*" }],
  ["unverified evidence", (p) => { p.products[0].evidence.verified = false; }],
  ["evidence verified as the string 'true'", (p) => { p.products[0].evidence.verified = "true"; }],
  ["malformed verifiedAt", (p) => { p.products[0].evidence.verifiedAt = "not-a-stamp"; }],
  ["offset-less verifiedAt", (p) => { p.products[0].evidence.verifiedAt = "2026-08-26T10:00:00"; }],
  ["materially future verifiedAt", (p) => { p.products[0].evidence.verifiedAt = "2026-08-27T13:00:00+00:00"; }],
  ["blank verifiedBy", (p) => { p.products[0].evidence.verifiedBy = "  "; }],
  ["unauthorized source host", (p) => { p.products[0].evidence.sourceUrl = "https://deals.example.com/x"; }],
  ["archive capture as evidence", (p) => {
    p.sourcePolicy.allowedSourceHosts.push("web.archive.org");
    p.products[0].evidence.sourceUrl = "https://web.archive.org/web/2026/x"; }],
  ["http source", (p) => { p.products[0].evidence.sourceUrl = "http://www.lacks.com/x"; }],
  ["credentialed source", (p) => { p.products[0].evidence.sourceUrl = "https://u:p@www.lacks.com/x"; }],
  ["empty shipped allowlist (unapproved source policy allows nothing)",
    (p) => { p.sourcePolicy.allowedSourceHosts = []; }],
  ["UNAPPROVED source policy with populated hosts (defense in depth — round-2 contract audit R1)",
    (p) => { p.sourcePolicy.status = "unapproved"; }],
  ["allowlist not an array", (p) => { p.sourcePolicy.allowedSourceHosts = "lacks.com"; }],
  ["float amountMinor", (p) => { p.products[0].price.amountMinor = 3699.0 + 0.5; }],
  ["zero amountMinor", (p) => { p.products[0].price.amountMinor = 0; }],
  ["negative amountMinor", (p) => { p.products[0].price.amountMinor = -1; }],
  ["string amountMinor", (p) => { p.products[0].price.amountMinor = "369900"; }],
  ["boolean amountMinor", (p) => { p.products[0].price.amountMinor = true; }],
  ["amount over the sanity ceiling", (p) => { p.products[0].price.amountMinor = 10 ** 10; }],
  ["currency mismatch", (p) => { p.products[0].price.currency = "MXN"; }],
  ["price kind outside the enum", (p) => { p.products[0].price.kind = "from"; }],
  ["evidence status from the promotions ladder",
    (p) => { p.products[0].evidence.status = "retailer-full-page-archive"; }],
  ["expired window", (p) => { p.products[0].window = { startAt: null, endsAt: "2026-08-01T00:00:00+00:00" }; }],
  ["malformed window end", (p) => { p.products[0].window = { startAt: null, endsAt: "whenever" }; }],
  ["promotional price without a published end",
    (p) => { p.products[0].price.kind = "promotional"; }],
  ["malformed window start bound",
    (p) => { p.products[0].window = { startAt: "whenever", endsAt: null }; }],
  ["window start in the future (price not yet started)",
    (p) => { p.products[0].window = { startAt: "2026-09-15T00:00:00+00:00", endsAt: null }; }],
  ["entry with a blank SKU (identity incomplete)",
    (p) => { p.products[0].sku = ""; }],
  ["emergency disable (enabled false)", (p) => { p.enabled = false; }],
  ["enabled as the string 'true'", (p) => { p.enabled = "true"; }],
];
for (const [label, mut, qOver] of INVALID) {
  const p = P();
  if (mut) mut(p);
  const r = resolver(p, F(), Q(qOver || {}));
  check(`invalid — ${label} -> price unavailable, zero numeric leakage`, leakFree(r),
    JSON.stringify(r.price));
  check(`invalid — ${label} -> freshness not-judgeable (invalidity is not staleness)`,
    r.freshness.status === "not-judgeable");
}
// Emergency disable is DISTINCT from stale, and financing-side axes survive it.
{
  const p = P(); p.enabled = false;
  const r = resolver(p, F(), Q({ transactionAmountMinor: 60000 }));
  check("emergency disable: calculation degrades to quote-only (formulas dark with pricing off), plan-side threshold still assessable",
    r.calculation.status === "quote-only" && r.threshold.status === "met"
    && r.freshness.status === "not-judgeable");
}
// SKU identity (exact-head review finding 1): the query names the exact SKU
// or nothing resolves — missing, blank, malformed and mismatched all fail
// with zero numeric leakage.
for (const [label, sku] of [["missing", undefined], ["null", null],
  ["blank", "   "], ["mismatched", "FIXTURE-9999"], ["non-string", 5],
  ["lone-surrogate", "a\ud800b"]]) {
  const r = resolver(P(), F(), Q({ sku }));
  check(`SKU ${label} -> price unavailable, zero numeric leakage`, leakFree(r),
    JSON.stringify(r.price));
}
check("SKU exact match (the base query) still resolves — the identity check is not over-broad",
  resolver(P(), F(), Q()).price.status === "resolved");

// Price-window boundaries (exact-head review finding 2): start-INCLUSIVE,
// end-EXCLUSIVE. The window opens after the evidence stamp so every probe
// instant keeps the evidence non-future and fresh.
{
  const winP = () => {
    const p = P();
    p.products[0].price.kind = "promotional";
    p.products[0].window = { startAt: "2026-08-27T00:00:00+00:00",
                             endsAt: "2026-09-01T00:00:00+00:00" };
    return p;
  };
  const S = Date.parse("2026-08-27T00:00:00+00:00");
  const E = Date.parse("2026-09-01T00:00:00+00:00");
  const st = (nowMs) => resolver(winP(), F(), Q({ nowMs })).price.status;
  check("inside the window -> resolved", st(CLOCK) === "resolved");
  check("one second BEFORE startAt -> unavailable (not yet started)",
    st(S - 1000) === "unavailable");
  check("EXACTLY at startAt -> resolved (start-inclusive boundary)", st(S) === "resolved");
  check("one second before endsAt -> resolved", st(E - 1000) === "resolved");
  check("EXACTLY at endsAt -> unavailable (end-exclusive boundary preserved)",
    st(E) === "unavailable");
}

// Top-level financing-envelope governance (exact-head review finding 3):
// a malformed, future, stale or off-allowlist ENVELOPE makes calculation
// unavailable and the threshold unknown even though the nested plan and
// formula are pristine — while the PRICE axis stays resolved (independence).
const FIN_ENV_BAD = [
  ["stale envelope verifiedAt", (f) => { f.verifiedAt = "2026-07-31T16:43:00-05:00"; }],
  ["future envelope verifiedAt (beyond skew)", (f) => { f.verifiedAt = "2026-08-27T13:00:00+00:00"; }],
  ["malformed envelope verifiedAt", (f) => { f.verifiedAt = "not-a-stamp"; }],
  ["missing envelope verifiedAt", (f) => { delete f.verifiedAt; }],
  ["offset-less envelope verifiedAt", (f) => { f.verifiedAt = "2026-08-26T10:00:00"; }],
  ["http envelope source", (f) => { f.sourceUrl = "http://www.lacks.com/financing"; }],
  ["off-allowlist envelope source", (f) => { f.sourceUrl = "https://deals.example.com/financing"; }],
  ["credentialed envelope source", (f) => { f.sourceUrl = "https://u:p@www.lacks.com/financing"; }],
  ["archive envelope source", (f) => {
    f.allowedSourceHosts.push("web.archive.org");
    f.sourceUrl = "https://web.archive.org/web/2026/financing"; }],
  ["missing envelope maxAgeDays", (f) => { delete f.maxAgeDays; }],
  ["zero envelope maxAgeDays", (f) => { f.maxAgeDays = 0; }],
  ["oversize envelope maxAgeDays", (f) => { f.maxAgeDays = 61; }],
  ["float envelope maxAgeDays", (f) => { f.maxAgeDays = 7.5; }],
];
for (const [label, mut] of FIN_ENV_BAD) {
  const f = F(); mut(f);
  const r = resolver(P(), f, Q({ transactionAmountMinor: 60000 }));
  check(`financing envelope — ${label} -> calculation unavailable AND threshold unknown`,
    r.calculation.status === "unavailable" && r.threshold.status === "unknown");
  check(`financing envelope — ${label} -> the price axis is untouched (independence)`,
    r.price.status === "resolved");
}
{
  const f = F(); f.verifiedAt = "2026-08-27T12:02:00+00:00";
  check("envelope stamp 2 min ahead (inside skew) -> still governs (calculation available)",
    resolver(P(), f, Q()).calculation.status === "available");
}

// Clock skew at the resolver (round-2 test audit N1): a within-skew future
// evidence stamp is valid; past the 5-minute skew it is invalid.
{
  const p = P(); p.products[0].evidence.verifiedAt = "2026-08-27T12:02:00+00:00";
  check("evidence stamp 2 min ahead (inside clock skew) -> still resolved",
    resolver(p, F(), Q()).price.status === "resolved");
  p.products[0].evidence.verifiedAt = "2026-08-27T12:06:00+00:00";
  check("evidence stamp 6 min ahead (outside clock skew) -> unavailable",
    resolver(p, F(), Q()).price.status === "unavailable");
}
// An accessory entry resolves with a null-size query (derived variant).
{
  const p = P();
  p.products[0] = Object.assign(JSON.parse(JSON.stringify(p.products[0])), {
    productKind: "accessory", productId: "pillow-flow", size: null, sku: "FIXTURE-0002" });
  const r = resolver(p, F(), Q({ productId: "pillow-flow", sku: "FIXTURE-0002", size: null }));
  check("accessory entry: resolves for a null-size query", r.price.status === "resolved");
  const r2 = resolver(p, F(), Q({ productId: "pillow-flow", sku: "FIXTURE-0002", size: "queen" }));
  check("accessory entry: a sized query does not match it", r2.price.status === "unavailable");
  const r3 = resolver(p, F(), Q({ productId: "pillow-flow", sku: "FIXTURE-0001", size: null }));
  check("accessory entry: the OTHER entry's SKU does not match it (SKU identity holds per kind)",
    r3.price.status === "unavailable");
}

// ===========================================================================
section("Threshold — explicit runtime MINOR-unit amount vs MAJOR-unit plan minimums");
// ===========================================================================
const tq = (amt) => resolver(P(), F(), Q({ transactionAmountMinor: amt })).threshold.status;
check("absent amount -> unknown", tq(undefined) === "unknown");
for (const [label, v] of [["zero", 0], ["negative", -1], ["float", 250000.5],
  ["string", "250000"], ["NaN", NaN], ["boolean true", true],
  ["Infinity", Infinity], ["null", null], ["object", { amount: 250000 }]]) {
  check(`invalid amount (${label}) -> unknown`, tq(v) === "unknown");
}
check("$600 (60000 minor) vs the $500 minimum -> MET (the *100 conversion is load-bearing)",
  tq(60000) === "met");
check("$499 (49900 minor) vs the $500 minimum -> NOT-MET (a naive minor-vs-major compare would say met)",
  tq(49900) === "not-met");
check("$500.00 exactly (50000 minor) -> met (>= boundary)", tq(50000) === "met");
// A smuggled config amount can never substitute for the runtime argument.
{
  const p = P();
  p.purchaseAssessment = { policy: "runtime-transaction-amount", transactionAmountMinor: 250000 };
  const f = F();
  f.plans[0].transactionAmountMinor = 250000;
  check("planted config transaction amounts + NO runtime argument -> still unknown",
    resolver(p, f, Q()).threshold.status === "unknown");
}
// A plan with no published minimum assesses nothing.
check("plan without minimumPurchase (lacks-in-house) + a valid amount -> unknown",
  resolver(P(), F(), Q({ planId: "lacks-in-house", transactionAmountMinor: 60000 }))
    .threshold.status === "unknown");
// minimumPurchase schema alignment (exact-head review finding 4): the
// validator admits currency-precision decimals, and the resolver converts
// them EXACTLY — a validator-admitted value is never runtime-malformed.
{
  const f = F(); f.plans[0].minimumPurchase = 499.99;
  const t = (amt) => resolver(P(), f, Q({ transactionAmountMinor: amt })).threshold.status;
  check("$499.99 minimum: 49998 minor -> not-met (one cent below the exact conversion)",
    t(49998) === "not-met");
  check("$499.99 minimum: 49999 minor -> met (the exact boundary)", t(49999) === "met");
  check("$499.99 minimum: 50000 minor -> met (above)", t(50000) === "met");
}
{
  const f = F(); f.plans[0].minimumPurchase = 499.999;
  check("beyond currency precision (499.999 — now refused by the narrowed validator) -> unknown, fail-closed",
    resolver(P(), f, Q({ transactionAmountMinor: 60000 })).threshold.status === "unknown");
}
{
  const f = F(); f.plans[0].minimumPurchase = 0;
  check("explicit zero minimum -> met for any valid amount",
    resolver(P(), f, Q({ transactionAmountMinor: 1 })).threshold.status === "met");
}
// Non-numeric plan minimums still assess nothing (round-2 test audit N2).
for (const [label, v] of [["string", "500"], ["boolean", true], ["negative", -5]]) {
  const f = F(); f.plans[0].minimumPurchase = v;
  check(`malformed minimumPurchase (${label}) + a valid amount -> unknown`,
    resolver(P(), f, Q({ transactionAmountMinor: 60000 })).threshold.status === "unknown");
}
// Threshold never echoes the amount into any axis.
{
  const r = resolver(P(), F(), Q({ transactionAmountMinor: 77777700 }));
  check("the runtime amount appears NOWHERE in the result",
    !JSON.stringify(r).includes("77777700"));
}

// ===========================================================================
section("Calculation — quote-only vs unavailable vs available, never conflated");
// ===========================================================================
check("plan with no formula (synchrony-0-48, calculationMode not-published) -> QUOTE-ONLY",
  resolver(P(), F(), Q({ planId: "synchrony-0-48" })).calculation.status === "quote-only");
check("unknown planId -> calculation UNAVAILABLE (not quote-only)",
  resolver(P(), F(), Q({ planId: "no-such-plan" })).calculation.status === "unavailable");
check("no planId in the query -> calculation UNAVAILABLE",
  resolver(P(), F(), Q({ planId: undefined })).calculation.status === "unavailable");
{
  const f = F(); f.enabled = false;
  check("financing disabled -> calculation UNAVAILABLE",
    resolver(P(), f, Q()).calculation.status === "unavailable");
}
// Axis independence in BOTH directions.
{
  const p = P(); p.products[0].evidence.verified = false;
  const r = resolver(p, F(), Q());
  check("invalid price + valid formula -> price unavailable WHILE calculation stays available (independent axes)",
    r.price.status === "unavailable" && r.calculation.status === "available");
}
{
  const r = resolver(P(), F(), Q({ planId: "synchrony-0-48" }));
  check("resolved price + formulaless plan -> resolved + quote-only (the two states share no token)",
    r.price.status === "resolved" && r.calculation.status === "quote-only"
    && r.price.status !== r.calculation.status);
}
// Formula-integrity negatives: each degrades to quote-only, never available.
const FORMULA_BAD = [
  ["missing an input", (p) => { p.formulas[0].inputs = ["principalMinor"]; }],
  ["extra input", (p) => { p.formulas[0].inputs = ["principalMinor", "publishedPaymentFactor", "apr"]; }],
  ["duplicate input", (p) => { p.formulas[0].inputs = ["principalMinor", "principalMinor"]; }],
  ["unknown mode", (p) => { p.formulas[0].mode = "estimated"; }],
  ["cadence outside the enum", (p) => { p.formulas[0].cadence = "per-month"; }],
  ["unverified cadence", (p) => { p.formulas[0].cadenceVerified = false; }],
  ["blank approvedBy", (p) => { p.formulas[0].approvedBy = " "; }],
  ["malformed approvedAt", (p) => { p.formulas[0].approvedAt = "sometime"; }],
  ["stale formula evidence", (p) => { p.formulas[0].verifiedAt = "2026-07-31T16:43:00-05:00"; }],
  ["formula source off the financing allowlist", (p) => { p.formulas[0].sourceUrl = "https://linqcdn.avbportal.com/x"; }],
];
for (const [label, mut] of FORMULA_BAD) {
  const p = P(); mut(p);
  check(`formula ${label} -> quote-only (a broken artifact never calculates)`,
    resolver(p, F(), Q()).calculation.status === "quote-only");
}
{
  const f = F(); f.plans[0].calculationMode = "not-published";
  check("plan calculationMode mismatch -> quote-only",
    resolver(P(), f, Q()).calculation.status === "quote-only");
}
{
  const f = F(); f.plans[0].verified = false;
  const r = resolver(P(), f, Q());
  check("unverified plan -> calculation unavailable AND threshold unknown (plan facts gone)",
    r.calculation.status === "unavailable"
    && resolver(P(), f, Q({ transactionAmountMinor: 60000 })).threshold.status === "unknown");
}
{
  const f = F(); f.plans[0].verifiedAt = "2026-07-31T16:43:00-05:00";
  check("stale plan -> calculation unavailable", resolver(P(), f, Q()).calculation.status === "unavailable");
}

// ===========================================================================
section("Eligibility — the activation set, computed for real, unreachable in 2.1");
// ===========================================================================
// Only a displayEnabled:true document could ever report eligible — and the
// validator plus CI's operating-state lock refuse that document. The
// computation is still real (M1 below proves this assertion can fail).
{
  const p = P(); p.displayEnabled = true; // NON-ADMISSIBLE probe document
  check("even a fully-approved document is eligible ONLY under displayEnabled:true (harness probe)",
    resolver(p, F(), Q()).eligibility.status === "eligible");
  const p2 = stripApprovals(P()); p2.displayEnabled = true;
  check("displayEnabled true WITHOUT approvals -> still not-eligible (approvals are not decorative)",
    resolver(p2, F(), Q()).eligibility.status === "not-eligible");
}
// Per-conjunct negatives (round-2 test audit R1): withdrawing any ONE member
// of the eligibility AND-chain flips the axis, so no conjunct is decorative
// and a mutant deleting one cannot survive.
const CONJUNCTS = [
  ["business approval withdrawn", (p) => { p.presentation.approvals.business.status = "unapproved"; }],
  ["legal approval withdrawn", (p) => { p.presentation.approvals.legal.status = "unapproved"; }],
  ["native review back to pending", (p) => { p.presentation.approvals.nativeReview.status = "pending"; }],
  ["blank authority owner", (p) => { p.authority.owner = ""; }],
  ["blank authority role", (p) => { p.authority.role = " "; }],
  ["clearance not-cleared", (p) => { p.products[0].clearance.status = "not-cleared"; }],
  ["blank clearance attestation", (p) => { p.products[0].clearance.attestedBy = ""; }],
  ["presentation status unapproved", (p) => { p.presentation.status = "unapproved"; }],
];
for (const [label, mut] of CONJUNCTS) {
  const p = P(); p.displayEnabled = true; mut(p);
  check(`eligibility conjunct — ${label} -> not-eligible even under displayEnabled:true`,
    resolver(p, F(), Q()).eligibility.status === "not-eligible");
}

// ===========================================================================
section("Totality — hostile inputs never throw, always the five-axis shape");
// ===========================================================================
const HOSTILE = [undefined, null, 0, 1, true, false, "", "x", "\ud800", 3.14,
  [], [5], {}, { a: 1 }, { toString: null }, { valueOf: null }];
let threw = 0, badShape = 0;
for (const a of HOSTILE) for (const b of HOSTILE) {
  try {
    const r = resolver(a, b, { productId: "g6", size: "queen", planId: "p", nowMs: CLOCK });
    if (!shapeOk(r)) badShape++;
  } catch (e) { threw++; }
}
check("hostile pricing x financing configs: zero throws, shape always intact",
  threw === 0 && badShape === 0, `threw=${threw} badShape=${badShape}`);
threw = 0; badShape = 0;
for (const q of HOSTILE) {
  try { if (!shapeOk(resolver(P(), F(), q))) badShape++; } catch (e) { threw++; }
}
check("hostile queries: zero throws, shape always intact", threw === 0 && badShape === 0);
const HOSTILE_DEEP = [
  (p) => { p.products = "bad"; },
  (p) => { p.products = [5, null, "x", { productId: {} }]; },
  (p) => { p.products[0].price = "x"; },
  (p) => { p.products[0].evidence = 7; },
  (p) => { p.products[0].clearance = []; },
  (p) => { p.sourcePolicy = null; },
  (p) => { p.freshness = "weekly"; },
  (p) => { p.products[0].productId = "a\ud800b"; },
  (p) => { p.products[0].evidence.sourceUrl = "https://\ud800.example/x"; },
];
threw = 0; badShape = 0;
for (const mut of HOSTILE_DEEP) {
  const p = P();
  try { mut(p); if (!shapeOk(resolver(p, F(), Q()))) badShape++; } catch (e) { threw++; }
}
check("hostile deep shapes (lone surrogates included): zero throws, shape intact",
  threw === 0 && badShape === 0, `threw=${threw} badShape=${badShape}`);
for (const [label, clock] of [["string clock", "123"], ["NaN clock", NaN],
  ["Infinity clock", Infinity], ["absent clock", undefined]]) {
  const r = resolver(P(), F(), Q({ nowMs: clock, transactionAmountMinor: 60000 }));
  check(`invalid injected clock (${label}) -> every time-dependent axis fails closed`,
    r.price.status === "unavailable" && r.freshness.status === "not-judgeable"
    && r.calculation.status === "unavailable" && r.threshold.status === "unknown"
    && r.eligibility.status === "not-eligible");
}
// Query surrogate identity never throws and never matches.
check("lone-surrogate query identity -> unavailable, no throw",
  resolver(P(), F(), Q({ productId: "a\ud800b" })).price.status === "unavailable");

// ===========================================================================
section("Planted mutants — every detector can fire (the sweep's replace strings)");
// ===========================================================================
// Each mutant recompiles the REAL source with the sweep's replacement and
// asserts the specific probe that claims to catch it actually fails.
function mutate(find, replace) {
  // LF-normalized copies so a multi-line find matches regardless of the
  // checkout's line endings (the sweep normalizes the same way).
  const src0 = fnSrc.replace(/\r\n/g, "\n");
  const page0 = html.replace(/\r\n/g, "\n");
  check(`mutant find-string anchors once: ${find.slice(0, 48)}...`,
    src0.split(find).length === 2 || page0.split(find).length === 2);
  const src = src0.includes(find) ? src0.replace(find, replace) : null;
  if (src === null) return null;
  try {
    return new Function("Date", `"use strict";\n${src}\nreturn resolveDarkPricing;`)(DATE_SHIM);
  } catch (e) { return null; }
}
{
  const m = mutate("        eligible = p.displayEnabled === true",
    "        eligible = true || p.displayEnabled === true");
  check("M1 eligibility forced true -> the case (a) not-eligible probe FAILS on the mutant",
    m !== null && m(stripApprovals(P()), F(), Q()).eligibility.status === "eligible");
}
{
  const m = mutate("          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';\n"
    + "          if (freshness === 'stale') { priceValid = false; amountMinor = null; }");
  check("M2 stale strips the numeric -> the inert-internal-data probe FAILS on the mutant",
    m !== null && m(P(), F(), Q({ nowMs: CLOCK + 30 * DAY })).price.status === "unavailable");
}
{
  const m = mutate("          freshness = (now - evInstant) > mad * 86400000 ? 'stale' : 'fresh';",
    "          freshness = (now - evInstant) > mad * 86400000 ? 'fresh' : 'fresh';");
  check("M3 stale conflated with fresh -> the stale-axis probe FAILS on the mutant",
    m !== null && m(P(), F(), Q({ nowMs: CLOCK + 30 * DAY })).freshness.status === "fresh");
}
{
  const m = mutate("      var txn = q.transactionAmountMinor;",
    "      var txn = 250000;");
  check("M4 threshold read from a constant/config -> the absent-input probe FAILS on the mutant",
    m !== null && m(P(), F(), Q()).threshold.status !== "unknown");
}
{
  const m = mutate("          threshold = txn >= minMinor ? 'met' : 'not-met';",
    "          threshold = txn >= plan.minimumPurchase ? 'met' : 'not-met';");
  check("M5 exact conversion dropped -> the $499 boundary probe FAILS on the mutant",
    m !== null && m(P(), F(), Q({ transactionAmountMinor: 49900 })).threshold.status === "met");
}
{
  const m = mutate("          if (!isStr(q.sku) || !nonBlank(q.sku) || e.sku !== q.sku) continue;",
    "          if (false) continue;");
  check("M9 SKU identity check removed -> the mismatched-SKU probe FAILS on the mutant",
    m !== null && m(P(), F(), Q({ sku: "FIXTURE-9999" })).price.status === "resolved");
}
{
  const m = mutate("if (startAt !== null && now < startAt) winOk = false;",
    "if (false && startAt !== null && now < startAt) winOk = false;");
  const p = P();
  p.products[0].price.kind = "promotional";
  p.products[0].window = { startAt: "2026-08-27T00:00:00+00:00", endsAt: "2026-09-01T00:00:00+00:00" };
  check("M10 window-start check removed -> the before-start probe FAILS on the mutant",
    m !== null && m(p, F(), Q({ nowMs: Date.parse("2026-08-27T00:00:00+00:00") - 1000 }))
      .price.status === "resolved");
}
{
  const m = mutate("if (startRaw !== null && startRaw !== undefined && startAt === null) winOk = false;",
    "if (false) winOk = false;");
  const p = P();
  p.products[0].window = { startAt: "whenever", endsAt: null };
  check("M12 malformed-start-bound check removed -> the malformed-start probe FAILS on the mutant",
    m !== null && m(p, F(), Q()).price.status === "resolved");
}
{
  const m = mutate("        finValid = finAt !== null && finAt <= now + SKEW_MS\n          && (now - finAt) <= finMad * 86400000\n          && allowedHost(fin.sourceUrl, fin.allowedSourceHosts);",
    "        finValid = true;");
  const f = F(); f.verifiedAt = "2026-07-31T16:43:00-05:00";
  check("M11 financing-envelope gate forced open -> the stale-envelope probe FAILS on the mutant",
    m !== null && m(P(), f, Q()).calculation.status !== "unavailable");
}
{
  const m = mutate("        calculation = 'quote-only';",
    "        calculation = 'unavailable';");
  check("M8 quote-only conflated with unavailable -> the never-conflated probe FAILS on the mutant",
    m !== null && m(P(), F(), Q({ planId: "synchrony-0-48" })).calculation.status === "unavailable");
}

console.log(`\nPricing resolver check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
