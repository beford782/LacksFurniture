// Phase 2.2a price presentation gate check — the first CONSUMER of the 2.1b
// dark resolver, and the drawer surface that consumes the gate.
//
// Roadmap item 2.2 (Proceeds; owner build direction 2026-09-09): the disabled,
// non-live implementation. Production ships `pricing.enabled`,
// `pricing.displayEnabled` and every `pricing.surfaces` flag FALSE, so every
// price surface must render NOTHING — this suite proves that with the real
// gate over the real shipped configuration and the whole shipped catalog.
// It then opens the gate IN MEMORY on the governed NON-SHIPPING fixture
// (tests/fixtures/pricing_populated_fixture.json — never data/, never
// incoming/) and proves the consumption contract the roadmap's state table
// demands:
//
//   * off: pricing absent / emergency-disabled / display-disabled / surface
//     flag false -> hidden, empty, no attribute — on every surface;
//   * price-unavailable: price axis not resolved, freshness axis not 'fresh'
//     (the EXECUTED stale-refusal contract — stale resolves numerically in
//     the resolver and is refused here), or eligibility not 'eligible' -> no
//     numeric anywhere, only the governed state copy;
//   * available: the resolved amount, localized, with the governed
//     assumptions and disclosures adjacent; calculation and threshold carried
//     as STATUS only — no payment figure, no per-period text, ever;
//   * SKU identity comes from the CATALOG record (m.skus[size]); no skus, a
//     wrong size or a mismatched SKU resolves nothing;
//   * containment: the resolver is called from exactly one line, inside the
//     marked gate block; the shipped pricing config is read from exactly one
//     line, inside the gate block; nothing outside the two marked blocks
//     names `pricing` in executable code (the resolver suite keeps its scan);
//   * planted mutants — the sweep's own replace strings — are each REJECTED
//     by the specific assertion that claims to catch them.
//
// Run: node tests/pricing_presentation_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const demoHtml = readFileSync(join(root, "demo", "black-friday", "index.html"), "utf8");
const shipped = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const catalog = JSON.parse(readFileSync(join(root, "data", "mattresses.json"), "utf8"));
const dictEn = JSON.parse(readFileSync(join(root, "data", "dict-en.json"), "utf8"));
const dictEs = JSON.parse(readFileSync(join(root, "data", "dict-es.json"), "utf8"));
const fx = JSON.parse(readFileSync(
  join(root, "tests", "fixtures", "pricing_populated_fixture.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail = "") {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
  return !!cond;
}
function section(name) { console.log(`\n== ${name} ==`); }

// ---------------------------------------------------------------------------
// Extraction: the two marked blocks, verbatim, plus L() and escapeHtml().
// ---------------------------------------------------------------------------
const R_START = "// ═══ PHASE 2.1B DARK RESOLVER (definition only — called only through the 2.2 gate) ═══";
const R_END = "// ═══ END PHASE 2.1B DARK RESOLVER ═══";
const G_START = "// ═══ PHASE 2.2 PRICE PRESENTATION GATE (disabled implementation — production renders nothing) ═══";
const G_END = "// ═══ END PHASE 2.2 PRICE PRESENTATION GATE ═══";

section("Extraction and containment");
for (const [name, page] of [["index.html", html], ["demo/black-friday/index.html", demoHtml]]) {
  for (const [label, marker] of [["resolver start", R_START], ["resolver end", R_END],
                                 ["gate start", G_START], ["gate end", G_END]]) {
    check(`${name}: ${label} marker appears exactly once`, page.split(marker).length === 2);
  }
}
const rs = html.indexOf(R_START), re = html.indexOf(R_END);
const gs = html.indexOf(G_START), ge = html.indexOf(G_END);
check("blocks are well-formed and ordered: resolver, then gate", rs !== -1 && re > rs && gs > re && ge > gs);
const resolverBlock = html.slice(rs, re);
const gateBlock = html.slice(gs, ge);

const fn = (n) => new RegExp(`function ${n}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`);
function extract(re_, name) {
  const m = html.match(re_);
  if (!m) { failed++; console.log(`  [FAIL] could not extract ${name}`); return ""; }
  return m[0];
}
const Lsrc = extract(fn("L"), "L");
const escSrc = extract(fn("escapeHtml"), "escapeHtml");
check("L() and escapeHtml() extracted", Lsrc.length > 0 && escSrc.length > 0);

// Call-site containment (string form; the resolver suite owns the
// comment-stripped scans): the resolver is called on exactly one line, and
// that line is inside the gate block; the shipped config is read on exactly
// one line, inside the gate block; the gate's functions are declared once.
const callRe = /resolveDarkPricing\s*\(/g;
const declRe = /function\s+resolveDarkPricing\s*\(/g;
const callsAll = (html.match(callRe) || []).length - (html.match(declRe) || []).length;
const callsGate = (gateBlock.match(callRe) || []).length;
check("resolveDarkPricing is CALLED exactly once in the whole file, inside the gate block",
  callsAll === 1 && callsGate === 1, `all=${callsAll} gate=${callsGate}`);
const readRe = /STORE_CONFIG\s*\.\s*pricing\b/g;
check("STORE_CONFIG.pricing is read exactly once in the whole file, inside the gate block",
  (html.match(readRe) || []).length === 1 && (gateBlock.match(readRe) || []).length === 1);
for (const name of ["getPricingConfig", "pricingSurfaceEnabled", "pricingCatalogRecord", "pricingSkuFor", "pricingStateCopy",
                    "pricingCopyList", "formatPriceAmount", "pricePresentationFor", "renderDrawerPrice",
                    "priceSizeAnswer", "priceSlotFor"]) {
  const d = new RegExp(`function\\s+${name}\\s*\\(`, "g");
  check(`${name} is declared exactly once, inside the gate block`,
    (html.match(d) || []).length === 1 && (gateBlock.match(d) || []).length === 1);
}
check("the drawer calls renderDrawerPrice with the customer's size answer, once, before Payment Choice",
  html.split("renderDrawerPrice(m, answers && answers.mattress_size);").length === 2
  && html.indexOf("renderDrawerPrice(m, answers && answers.mattress_size);")
     < html.indexOf("renderDrawerFinancing();\n\n      var drawerPromos".replace(/\n/g, "\r\n"))
     || html.indexOf("renderDrawerPrice(m, answers && answers.mattress_size);")
     < html.indexOf("renderDrawerFinancing();\n\n      var drawerPromos"));
check("the drawer carries the price slot, hidden by default, directly above Payment Choice",
  /<div class="drawer-price" id="drawerPrice" hidden><\/div>\r?\n\s*<!-- Ways to bring it home/.test(html));
// Slice 2.2b: the four remaining surfaces reach the gate ONLY through
// priceSlotFor, each exactly once, each behind the sandbox typeof guard, and
// each naming its own surface key — so a surface flag governs exactly the
// surface it names.
const CONSUMERS = [
  ["results top pick", "priceSlotFor('results', m, 'noct-card-price')", "renderTopPickCard(m, tier)"],
  ["results supporting", "priceSlotFor('results', m, 'noct-card-price')", "renderSupportingCards(mattresses, tier)"],
  ["sleep system anchor", "priceSlotFor('sleepSystem', finalist, 'sleep-system__anchor-price')", "renderSleepSystemAnchor(finalistState, recommended)"],
  ["consultation summary hero", "priceSlotFor('handoff', item, 'hf2-finalist-hero__price')", "renderHf2FinalistHero()"],
  ["sleep plan finalist", "priceSlotFor('sleepPlan', m, 'hf2-pick__price')", "renderSleepPlanFinalist()"],
];
function fnBody(sig) {
  const at = html.indexOf("function " + sig);
  if (at === -1) return "";
  let depth = 0, i = html.indexOf("{", at);
  for (; i < html.length; i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") { depth--; if (depth === 0) return html.slice(at, i + 1); }
  }
  return "";
}
{
  const resultsCalls = html.split("priceSlotFor('results', m, 'noct-card-price')").length - 1;
  check("results: exactly two priceSlotFor calls (top pick + supporting), no other 'results' consumer", resultsCalls === 2);
  for (const [label, call, fn] of CONSUMERS) {
    const body = fnBody(fn);
    const guarded = "(typeof priceSlotFor === 'function' ? " + call + " : '')";
    check(`${label}: its renderer carries the guarded call exactly once`,
      body.length > 0 && body.split(guarded).length === 2, body.length ? "" : "renderer not found");
  }
  const totalCalls = (html.match(/priceSlotFor\s*\(/g) || []).length;
  const declared = (html.match(/function\s+priceSlotFor\s*\(/g) || []).length;
  check("priceSlotFor: declaration + exactly five consumer calls in the whole file", declared === 1 && totalCalls === 6, `calls=${totalCalls}`);
  check("no consumer supplies its own size (priceSizeAnswer is the only size source, read only inside the gate block)",
    (html.match(/priceSizeAnswer\s*\(/g) || []).length === 3 /* decl + priceSlotFor + priceStatusHtmlFor */
    && (gateBlock.match(/priceSizeAnswer\s*\(/g) || []).length === 3);
}
check("the drawer price label exists in both dictionaries",
  typeof dictEn["drawer.price_label"] === "string" && dictEn["drawer.price_label"].length > 0
  && typeof dictEs["drawer.price_label"] === "string" && dictEs["drawer.price_label"].length > 0
  && dictEn["drawer.price_label"] !== dictEs["drawer.price_label"]);

// ---------------------------------------------------------------------------
// Harness: compile both blocks with a recording document and an injected clock.
// ---------------------------------------------------------------------------
function makeEl(id) {
  const attrs = new Map();
  return {
    id, hidden: false, innerHTML: "", textContent: "",
    setAttribute(k, v) { attrs.set(k, String(v)); },
    removeAttribute(k) { attrs.delete(k); },
    getAttribute(k) { return attrs.has(k) ? attrs.get(k) : null; },
    hasAttribute(k) { return attrs.has(k); },
  };
}
const CLOCK = Date.parse(fx._meta.clock);
check("fixture clock parses", Number.isFinite(CLOCK));

function makeEnv({ pricing, financing, lang = "en", nowMs = CLOCK, mutate = null, answers = { mattress_size: "queen" }, win = undefined, finalist = undefined } = {}) {
  const els = new Map();
  const doc = { getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); } };
  const STORE_CONFIG = { pricing, financing };
  let src = [resolverBlock, gateBlock, Lsrc, escSrc].join("\n");
  if (mutate) src = mutate(src);
  const DATE_SHIM = { now: () => nowMs, parse: Date.parse };
  const api = new Function(
    "document", "STORE_CONFIG", "currentLang", "getFinancingConfig", "t", "Date",
    "window", "localStorage", "sessionStorage", "fetch", "analytics",
    "answers", "resolveFinalistState",
    `"use strict";\n${src}\nreturn { gate: pricePresentationFor, render: renderDrawerPrice,
       surface: pricingSurfaceEnabled, sku: pricingSkuFor, fmt: formatPriceAmount, slot: priceSlotFor,
       status: priceStatusHtmlFor };`)(
    doc, STORE_CONFIG, lang, () => STORE_CONFIG.financing, (k) => "DICT:" + k, DATE_SHIM,
    win, undefined, undefined, undefined, undefined, answers,
    finalist === undefined ? undefined : () => finalist);
  return { api, doc, el: (id) => doc.getElementById(id) };
}
const P = () => JSON.parse(JSON.stringify(fx.pricing));
const F = () => JSON.parse(JSON.stringify(fx.financing));
const ACTIVE = (over = {}) => {
  const p = P();
  p.displayEnabled = true;
  p.surfaces = Object.assign({ drawer: true, sleepSystem: false, results: false, handoff: false, sleepPlan: false }, over.surfaces || {});
  if (over.enabled === false) p.enabled = false;
  return p;
};
const M = (over = {}) => Object.assign({ id: "g6", name: "Fixture Six", skus: { queen: "FIXTURE-0001" } }, over);
const SURFACES = ["drawer", "sleepSystem", "results", "handoff", "sleepPlan"];
const SIZES = ["twin", "twin_xl", "full", "queen", "king", "cal_king"];
const isOff = (r) => r && r.state === "off" && r.amountMinor === null && r.text === "" && r.notes.length === 0;
const noNumeric = (s) => !/\$\s?\d/.test(s) && !/\d[.,]\d{3}/.test(s) && !/\/\s*(mo|month|mes|wk|week|sem)\b/i.test(s);

// ---------------------------------------------------------------------------
section("Production: every surface is OFF for every shipped mattress and size");
// ---------------------------------------------------------------------------
{
  const env = makeEnv({ pricing: shipped.pricing, financing: shipped.financing });
  check("shipped config: enabled, displayEnabled and every surface are false",
    shipped.pricing.enabled === false && shipped.pricing.displayEnabled === false
    && Object.values(shipped.pricing.surfaces).every((v) => v === false));
  let all = 0, off = 0;
  for (const tier of Object.keys(catalog)) {
    for (const m of catalog[tier]) {
      for (const size of SIZES) {
        for (const s of SURFACES) { all++; if (isOff(env.api.gate(s, m, size, null))) off++; }
      }
    }
  }
  check(`shipped catalog: ${all} surface×mattress×size combinations, all OFF`, all > 0 && off === all, `off=${off}`);
  check("shipped catalog carries no skus map on any mattress (nothing could resolve even if opened)",
    Object.values(catalog).flat().every((m) => !("skus" in m)));
  // Slice 2.2b: the `skus` column exists in the generated CSV (the pipeline
  // can carry governed values at the final gate) and ships BLANK on every
  // row; build-data.ps1 emits the JSON key only when populated, which is why
  // the shipped catalog above carries no map at all.
  {
    const csvText = readFileSync(join(root, "data", "mattresses.csv"), "utf8");
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const header = lines[0].split(",");
    const idx = header.indexOf("skus");
    check("generated CSV carries the skus column, between locally-made and features",
      idx !== -1 && header[idx - 1] === "locally-made" && header[idx + 1] === "features");
    // Rows may contain quoted commas; a blank skus cell is the empty field at
    // its position only when the row parses to the header width, so parse.
    const parseRow = (line) => {
      const out = []; let cur = "", q = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
        else if (c === '"') q = true;
        else if (c === ",") { out.push(cur); cur = ""; }
        else cur += c;
      }
      out.push(cur); return out;
    };
    const rows = lines.slice(1).map(parseRow);
    check(`every one of the ${rows.length} shipped CSV rows has a BLANK skus cell`,
      rows.length > 0 && rows.every((r) => r.length === header.length && (r[idx] || "").trim() === ""));
  }
  // Even a mattress that WOULD resolve under the fixture is off under shipped config.
  check("shipped config: a fixture-shaped mattress with a SKU is still OFF", isOff(env.api.gate("drawer", M(), "queen", null)));
  // The renderer over the shipped config: hidden, empty, no attribute, no digit.
  let rendered = 0, silent = 0;
  for (const tier of Object.keys(catalog)) for (const m of catalog[tier]) for (const size of SIZES) {
    rendered++;
    env.api.render(m, size);
    const box = env.el("drawerPrice");
    if (box.hidden === true && box.innerHTML === "" && box.getAttribute("data-price-state") === null) silent++;
  }
  check(`shipped catalog: the drawer price slot stays hidden and empty for all ${rendered} renders`, silent === rendered);
  check("shipped config: surface helper is strict (no map -> off; absent key -> off)",
    env.api.surface("drawer") === false && env.api.surface("nope") === false);
  check("no pricing config at all -> off and hidden", (() => {
    const e = makeEnv({ pricing: undefined, financing: shipped.financing });
    e.api.render(M(), "queen");
    return isOff(e.api.gate("drawer", M(), "queen", null)) && e.el("drawerPrice").hidden === true;
  })());
}

// ---------------------------------------------------------------------------
section("Fixture, dark: enabled but display-disabled is OFF (the activation switch is the switch)");
// ---------------------------------------------------------------------------
{
  const env = makeEnv({ pricing: P(), financing: F() });
  check("fixture is enabled AND display-disabled", fx.pricing.enabled === true && fx.pricing.displayEnabled === false);
  check("fixture dark: every surface OFF for the fixture product", SURFACES.every((s) => isOff(env.api.gate(s, M(), "queen", null))));
  const withSurface = P(); withSurface.surfaces.drawer = true;
  const e2 = makeEnv({ pricing: withSurface, financing: F() });
  check("fixture dark + surface flag true: still OFF (displayEnabled governs)", isOff(e2.api.gate("drawer", M(), "queen", null)));
}

// ---------------------------------------------------------------------------
section("Fixture, opened in memory: the consumption contract");
// ---------------------------------------------------------------------------
{
  const env = makeEnv({ pricing: ACTIVE(), financing: F() });
  const r = env.api.gate("drawer", M(), "queen", null);
  check("available: the resolved amount is admitted (369900 minor, USD, regular)",
    r.state === "available" && r.amountMinor === 369900 && r.currency === "USD" && r.kind === "regular");
  check("available: localized whole-dollar text with no cents", r.text === "$3,699", r.text);
  check("available: assumptions + disclosures adjacent, in order, in the active language",
    r.notes.length === 2 && r.notes[0] === fx.pricing.presentation.assumptions[0].en
    && r.notes[1] === fx.pricing.presentation.disclosures[0].en);
  check("available with NO plan: calculation unavailable, threshold unknown (status only)",
    r.calculation === "unavailable" && r.threshold === "unknown");
  const rp = env.api.gate("drawer", M(), "queen", { planId: "synchrony-9-99-72" });
  check("available with the fixture plan: calculation reports 'available' as STATUS — text unchanged, no payment figure",
    rp.calculation === "available" && rp.text === "$3,699" && !/\/\s*(mo|month)/i.test(rp.text + rp.notes.join(" ")));
  check("threshold with an explicit runtime amount: met / not-met (never from configuration)",
    env.api.gate("drawer", M(), "queen", { planId: "synchrony-9-99-72", transactionAmountMinor: 60000 }).threshold === "met"
    && env.api.gate("drawer", M(), "queen", { planId: "synchrony-9-99-72", transactionAmountMinor: 49998 }).threshold === "not-met");
  // Surface flags are per surface.
  check("surface flag: results false while drawer true -> results OFF, drawer available",
    isOff(env.api.gate("results", M(), "queen", null)) && env.api.gate("drawer", M(), "queen", null).state === "available");
  const e2 = makeEnv({ pricing: ACTIVE({ surfaces: { drawer: false, results: true } }), financing: F() });
  check("surface flag: drawer false while results true -> drawer OFF, results available",
    isOff(e2.api.gate("drawer", M(), "queen", null)) && e2.api.gate("results", M(), "queen", null).state === "available");
  // Emergency disable.
  const e3 = makeEnv({ pricing: ACTIVE({ enabled: false }), financing: F() });
  check("emergency disable (enabled false) with display on -> OFF, hidden", (() => {
    e3.api.render(M(), "queen");
    return isOff(e3.api.gate("drawer", M(), "queen", null)) && e3.el("drawerPrice").hidden === true;
  })());
  // The executed stale-refusal contract.
  const stale = makeEnv({ pricing: ACTIVE(), financing: F(), nowMs: CLOCK + 30 * 86400000 });
  const rs_ = stale.api.gate("drawer", M(), "queen", null);
  check("STALE (clock +30d): price-unavailable — the number the resolver still carries is REFUSED here",
    rs_.state === "price-unavailable" && rs_.amountMinor === null && rs_.text === fx.pricing.presentation.states["price-unavailable"].en);
  const limit = CLOCK + fx.pricing.freshness.maxAgeDays * 86400000 - (CLOCK - Date.parse(fx.pricing.products[0].evidence.verifiedAt));
  check("boundary: at the freshness limit -> available; one second past -> price-unavailable",
    makeEnv({ pricing: ACTIVE(), financing: F(), nowMs: limit }).api.gate("drawer", M(), "queen", null).state === "available"
    && makeEnv({ pricing: ACTIVE(), financing: F(), nowMs: limit + 1000 }).api.gate("drawer", M(), "queen", null).state === "price-unavailable");
  // Eligibility withheld.
  const notEligible = ACTIVE();
  notEligible.presentation.approvals.legal = { status: "unapproved", by: "", at: null };
  const rn = makeEnv({ pricing: notEligible, financing: F() }).api.gate("drawer", M(), "queen", null);
  check("eligibility withheld (legal approval missing) -> price-unavailable, no numeric",
    rn.state === "price-unavailable" && rn.amountMinor === null && noNumeric(rn.text));
  const noClear = ACTIVE();
  noClear.products[0].clearance = { status: "not-cleared", attestedBy: "", attestedAt: null, scope: null };
  check("eligibility withheld (clearance not attested) -> price-unavailable",
    makeEnv({ pricing: noClear, financing: F() }).api.gate("drawer", M(), "queen", null).state === "price-unavailable");
  // SKU identity from the catalog.
  check("no skus map on the mattress -> price-unavailable", env.api.gate("drawer", M({ skus: undefined }), "queen", null).state === "price-unavailable");
  check("wrong size (king asked, queen priced) -> price-unavailable", env.api.gate("drawer", M(), "king", null).state === "price-unavailable");
  check("size absent -> price-unavailable", env.api.gate("drawer", M(), undefined, null).state === "price-unavailable");
  check("mismatched SKU -> price-unavailable", env.api.gate("drawer", M({ skus: { queen: "OTHER-SKU" } }), "queen", null).state === "price-unavailable");
  check("blank SKU -> price-unavailable", env.api.gate("drawer", M({ skus: { queen: "   " } }), "queen", null).state === "price-unavailable");
  check("different product id -> price-unavailable", env.api.gate("drawer", M({ id: "g7" }), "queen", null).state === "price-unavailable");
  check("a mattress without an id -> OFF (nothing to ask)", isOff(env.api.gate("drawer", M({ id: undefined }), "queen", null)));
  // Currency formatting fails closed.
  check("formatter: whole dollars drop cents; cents kept; non-positive and bad currency -> ''",
    env.api.fmt(369900, "USD") === "$3,699" && env.api.fmt(369950, "USD") === "$3,699.50"
    && env.api.fmt(0, "USD") === "" && env.api.fmt(100, "") === "" && env.api.fmt(100, "NOT-A-CODE") === "");
  // "US" is not an ISO 4217 code: Intl throws, the formatter returns '', and
  // the gate fails closed even though the resolver resolved a number.
  const badCur = ACTIVE(); badCur.currency = "US"; badCur.products[0].price.currency = "US";
  const bc = makeEnv({ pricing: badCur, financing: F() }).api.gate("drawer", M(), "queen", null);
  check("an unformattable currency resolves in the resolver but the gate reports price-unavailable",
    bc.state === "price-unavailable" && bc.amountMinor === null);
}

// ---------------------------------------------------------------------------
section("Spanish: copy and formatting follow the active language");
// ---------------------------------------------------------------------------
{
  const es = makeEnv({ pricing: ACTIVE(), financing: F(), lang: "es" });
  const r = es.api.gate("drawer", M(), "queen", null);
  check("es: amount localized (3,699 grouped) without cents or a per-period suffix", /3[.,]699/.test(r.text) && noNumeric(r.notes.join(" ")));
  check("es: assumptions and disclosures in Spanish",
    r.notes[0] === fx.pricing.presentation.assumptions[0].es && r.notes[1] === fx.pricing.presentation.disclosures[0].es);
  const esStale = makeEnv({ pricing: ACTIVE(), financing: F(), lang: "es", nowMs: CLOCK + 30 * 86400000 });
  check("es: the unavailable state copy is the Spanish governed string",
    esStale.api.gate("drawer", M(), "queen", null).text === fx.pricing.presentation.states["price-unavailable"].es);
}

// ---------------------------------------------------------------------------
section("Drawer renderer: what actually lands in the slot");
// ---------------------------------------------------------------------------
{
  const env = makeEnv({ pricing: ACTIVE(), financing: F() });
  env.api.render(M(), "queen");
  const box = env.el("drawerPrice");
  check("available: slot visible, state attribute set", box.hidden === false && box.getAttribute("data-price-state") === "available");
  check("available: dictionary label, amount, then the two notes, in that order",
    box.innerHTML.indexOf("DICT:drawer.price_label") !== -1
    && box.innerHTML.indexOf("DICT:drawer.price_label") < box.innerHTML.indexOf("$3,699")
    && box.innerHTML.indexOf("$3,699") < box.innerHTML.indexOf(fx.pricing.presentation.assumptions[0].en)
    && (box.innerHTML.match(/drawer-price__note/g) || []).length === 2);
  // Off after available: the slot is cleared, not merely hidden.
  const dark = makeEnv({ pricing: P(), financing: F() });
  dark.api.render(M(), "queen");
  const b2 = dark.el("drawerPrice");
  check("off: hidden, EMPTY, no state attribute", b2.hidden === true && b2.innerHTML === "" && b2.getAttribute("data-price-state") === null);
  // Unavailable: copy only, no digit.
  const stale = makeEnv({ pricing: ACTIVE(), financing: F(), nowMs: CLOCK + 30 * 86400000 });
  stale.api.render(M(), "queen");
  const b3 = stale.el("drawerPrice");
  check("price-unavailable: visible with the governed copy only, no numeric, no notes",
    b3.hidden === false && b3.getAttribute("data-price-state") === "price-unavailable"
    && b3.innerHTML.indexOf(fx.pricing.presentation.states["price-unavailable"].en) !== -1
    && noNumeric(b3.innerHTML) && b3.innerHTML.indexOf("drawer-price__note") === -1);
  // Unavailable with NO governed copy: nothing renders (blank copy fails closed).
  const noCopy = ACTIVE(); noCopy.presentation.states = {};
  const nc = makeEnv({ pricing: noCopy, financing: F(), nowMs: CLOCK + 30 * 86400000 });
  nc.api.render(M(), "queen");
  check("price-unavailable with blank state copy -> hidden and empty (never a blank box)",
    nc.el("drawerPrice").hidden === true && nc.el("drawerPrice").innerHTML === "");
  // Escaping.
  const hostile = ACTIVE();
  hostile.presentation.disclosures[0].en = "<b onmouseover=x>disclosure</b>";
  const h = makeEnv({ pricing: hostile, financing: F() });
  h.api.render(M(), "queen");
  check("notes are HTML-escaped", h.el("drawerPrice").innerHTML.indexOf("<b onmouseover") === -1
    && h.el("drawerPrice").innerHTML.indexOf("&lt;b onmouseover") !== -1);
  check("missing slot element: renderer is a no-op (no throw)", (() => {
    const e = makeEnv({ pricing: ACTIVE(), financing: F() });
    e.doc.getElementById = () => null;
    try { e.api.render(M(), "queen"); return true; } catch (err) { return false; }
  })());
}

// ---------------------------------------------------------------------------
section("Slot builder (slice 2.2b): the four remaining surfaces");
// ---------------------------------------------------------------------------
{
  const SLOT_SURFACES = ["results", "sleepSystem", "handoff", "sleepPlan"];
  const env = makeEnv({ pricing: shipped.pricing, financing: shipped.financing });
  let all = 0, empty = 0;
  for (const tier of Object.keys(catalog)) for (const m of catalog[tier]) for (const s of SLOT_SURFACES) {
    all++; if (env.api.slot(s, m, "noct-card-price") === "") empty++;
  }
  check(`shipped catalog: priceSlotFor returns '' for all ${all} surface×mattress combinations`, all > 0 && empty === all);
  const dark = makeEnv({ pricing: P(), financing: F() });
  check("fixture dark: '' on every surface", SLOT_SURFACES.every((s) => dark.api.slot(s, M(), "x") === ""));
  const on = makeEnv({ pricing: ACTIVE({ surfaces: { drawer: false, results: true, sleepSystem: true, handoff: true, sleepPlan: true } }), financing: F() });
  for (const s of SLOT_SURFACES) {
    const h = on.api.slot(s, M(), "noct-card-price");
    check(`${s} on: slot carries the label, the amount, both notes and the state attribute`,
      h.indexOf('data-price-state="available"') !== -1 && h.indexOf("DICT:drawer.price_label") !== -1
      && h.indexOf("$3,699") !== -1 && (h.match(/noct-card-price__note/g) || []).length === 2);
  }
  check("only the named surface opens: results on, sleepPlan off -> sleepPlan slot ''",
    makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F() }).api.slot("sleepPlan", M(), "x") === "");
  check("the size comes from the customer's answer: no answer -> unavailable copy only, never a number, even with the gate open",
    (() => { const h = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), answers: {} }).api.slot("results", M(), "x");
      return h.indexOf('data-price-state="price-unavailable"') !== -1 && noNumeric(h); })());
  check("the size comes from the customer's answer: king answered, queen priced -> '' (unavailable copy only, no number)",
    (() => { const h = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), answers: { mattress_size: "king" } }).api.slot("results", M(), "x");
      return h.indexOf('data-price-state="price-unavailable"') !== -1 && noNumeric(h); })());
  check("a hostile class name falls back to the default base", on.api.slot("results", M(), "x\" onmouseover=\"y").indexOf('class="price-slot"') !== -1);
  // Slice 2.2c repair: the finalist surfaces hand the gate a PROJECTION (a
  // saved pick carries no skus); the SKU is read from the catalog record of
  // the same id in the results-time index, and from nowhere else.
  {
    const projection = { id: "g6", name: "Fixture Six" };           // no skus, like a saved pick
    const index = { g6: { m: M() }, g7: { m: M({ id: "g7", skus: { queen: "OTHER" } }) } };
    const withIndex = makeEnv({ pricing: ACTIVE({ surfaces: { sleepSystem: true } }), financing: F(), win: { _drawerData: index } });
    check("projection without skus resolves through the catalog record of the same id",
      withIndex.api.slot("sleepSystem", projection, "x").indexOf('data-price-state="available"') !== -1);
    const noIndex = makeEnv({ pricing: ACTIVE({ surfaces: { sleepSystem: true } }), financing: F(), win: { _drawerData: null } });
    check("projection without skus and no catalog index -> unavailable copy only",
      noIndex.api.slot("sleepSystem", projection, "x").indexOf('data-price-state="price-unavailable"') !== -1);
    const wrongId = makeEnv({ pricing: ACTIVE({ surfaces: { sleepSystem: true } }), financing: F(), win: { _drawerData: { g6: { m: M({ id: "g7" }) } } } });
    check("an index entry whose record id disagrees is ignored (no SKU borrowed across ids)",
      wrongId.api.slot("sleepSystem", projection, "x").indexOf('data-price-state="price-unavailable"') !== -1);
    check("a projection that carries its own skus map is used as-is (index not consulted)",
      makeEnv({ pricing: ACTIVE({ surfaces: { sleepSystem: true } }), financing: F(), win: { _drawerData: { g6: { m: M({ skus: { queen: "OTHER" } }) } } } })
        .api.slot("sleepSystem", M(), "x").indexOf('data-price-state="available"') !== -1);
  }
  check("stale on an open surface: unavailable copy only, no number",
    (() => { const h = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), nowMs: CLOCK + 30 * 86400000 }).api.slot("results", M(), "x");
      return h.indexOf(fx.pricing.presentation.states["price-unavailable"].en) !== -1 && noNumeric(h) && h.indexOf("__note") === -1; })());
  check("blank state copy on an open surface -> '' (never an empty box)",
    (() => { const p = ACTIVE({ surfaces: { results: true } }); p.presentation.states = {};
      return makeEnv({ pricing: p, financing: F(), nowMs: CLOCK + 30 * 86400000 }).api.slot("results", M(), "x") === ""; })());
}

// ---------------------------------------------------------------------------
section("Plan status copy beside Payment Choice (slice 2.2d): status only, never a figure");
// ---------------------------------------------------------------------------
{
  const CHOSEN = { kind: "chosen", item: M() };
  const PLAN_FORMULA = { id: "synchrony-9-99-72", minimumPurchase: 500 };   // the fixture's formula plan
  const PLAN_QUOTE = { id: "synchrony-0-48", minimumPurchase: 4200 };       // published plan, no formula
  const PLAN_NOMIN = { id: "lacks-in-house", minimumPurchase: null };
  const QUOTE = FX_STATE("quote-only"), THRESH = FX_STATE("threshold-unknown");
  function FX_STATE(k) { return { en: fx.pricing.presentation.states[k].en, es: fx.pricing.presentation.states[k].es }; }
  // Production: '' for every placement and plan, chosen finalist or not.
  {
    const e = makeEnv({ pricing: shipped.pricing, financing: shipped.financing, finalist: CHOSEN });
    check("shipped: '' for every placement and every shipped plan",
      ["results", "drawer", "handoff", "sleep-plan", "sleep-system", "sheet", "mexico", ""].every((pl) =>
        (shipped.financing.plans || []).every((p) => e.api.status(pl, p.id, p) === "")));
  }
  // Fixture dark: '' (the gate is off).
  check("fixture dark: ''", makeEnv({ pricing: P(), financing: F(), finalist: CHOSEN }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === "");
  const on = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: CHOSEN });
  check("opened, chosen finalist, plan without a formula but with a minimum -> quote-only AND threshold-unknown copy, in that order, no digit",
    (() => { const h = on.api.status("results", PLAN_QUOTE.id, PLAN_QUOTE);
      return h.indexOf(QUOTE.en) !== -1 && h.indexOf(THRESH.en) !== -1 && h.indexOf(QUOTE.en) < h.indexOf(THRESH.en)
        && (h.match(/fin-offer__price-status/g) || []).length === 2 && noNumeric(h); })());
  check("opened, plan WITH the fixture formula -> no quote-only copy; threshold-unknown only (minimum published, no runtime amount)",
    (() => { const h = on.api.status("results", PLAN_FORMULA.id, PLAN_FORMULA);
      return h.indexOf(QUOTE.en) === -1 && h.indexOf(THRESH.en) !== -1 && (h.match(/fin-offer__price-status/g) || []).length === 1; })());
  check("opened, plan without a published minimum -> quote-only copy only (no threshold line)",
    (() => { const h = on.api.status("results", PLAN_NOMIN.id, PLAN_NOMIN);
      return h.indexOf(QUOTE.en) !== -1 && h.indexOf(THRESH.en) === -1; })());
  check("placement -> surface: the sheet opened from the drawer reads the DRAWER flag (results open, drawer off -> '')",
    makeEnv({ pricing: ACTIVE({ surfaces: { drawer: false, results: true } }), financing: F(), finalist: CHOSEN }).api.status("drawer", PLAN_QUOTE.id, PLAN_QUOTE) === ""
    && makeEnv({ pricing: ACTIVE({ surfaces: { drawer: true, results: false } }), financing: F(), finalist: CHOSEN }).api.status("drawer", PLAN_QUOTE.id, PLAN_QUOTE) !== "");
  check("unmapped placements ('sheet', 'mexico', '', 7) -> ''",
    ["sheet", "mexico", "", 7, null].every((pl) => on.api.status(pl, PLAN_QUOTE.id, PLAN_QUOTE) === ""));
  check("no plan id -> ''", on.api.status("results", "", PLAN_QUOTE) === "" && on.api.status("results", null, PLAN_QUOTE) === "");
  check("no chosen finalist (kind none) -> ''",
    makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: { kind: "none", item: null } }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === "");
  check("no finalist resolver in scope (sandbox) -> ''",
    makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F() }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === "");
  check("stale price -> '' (status copy never appears without an available price)",
    makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: CHOSEN, nowMs: CLOCK + 30 * 86400000 }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === "");
  check("eligibility withheld -> ''",
    (() => { const p = ACTIVE({ surfaces: { results: true } }); p.presentation.approvals.legal = { status: "unapproved", by: "", at: null };
      return makeEnv({ pricing: p, financing: F(), finalist: CHOSEN }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === ""; })());
  check("es: the Spanish governed copy",
    makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: CHOSEN, lang: "es" }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE).indexOf(QUOTE.es) !== -1);
  check("blank governed copy -> nothing rendered for that line",
    (() => { const p = ACTIVE({ surfaces: { results: true } }); p.presentation.states = { "price-unavailable": p.presentation.states["price-unavailable"] };
      return makeEnv({ pricing: p, financing: F(), finalist: CHOSEN }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE) === ""; })());
  check("copy is HTML-escaped",
    (() => { const p = ACTIVE({ surfaces: { results: true } }); p.presentation.states["quote-only"].en = "<img src=x onerror=y>";
      const h = makeEnv({ pricing: p, financing: F(), finalist: CHOSEN }).api.status("results", PLAN_QUOTE.id, PLAN_QUOTE);
      return h.indexOf("<img") === -1 && h.indexOf("&lt;img") !== -1; })());
  // Source pins: every plan card in the sheet carries the guarded call; the sheet records and clears its placement.
  const sheet = fnBody("renderFinancingSheet()");
  check("renderFinancingSheet: four guarded status calls (promotional per plan, installment, evergreen, Mexico)",
    (sheet.match(/typeof priceStatusHtmlFor === 'function' && typeof _finSheetPlacement === 'string' \? priceStatusHtmlFor\(_finSheetPlacement, /g) || []).length === 4);
  check("priceStatusHtmlFor: declaration + exactly four calls in the whole file",
    (html.match(/function\s+priceStatusHtmlFor\s*\(/g) || []).length === 1 && (html.match(/priceStatusHtmlFor\s*\(/g) || []).length === 5);
  check("the sheet records its opening placement before rendering and clears it on close and in the wipe",
    /_finSheetPlacement = \(typeof placement === 'string'\) \? placement : '';\r?\n\s*renderFinancingSheet\(\);/.test(html)
    && (html.match(/_finSheetPlacement = '';/g) || []).length === 3 /* declaration + close + wipe */
    && (html.match(/var _finSheetPlacement = '';/g) || []).length === 1);
}

// ---------------------------------------------------------------------------
section("Totality: hostile inputs never throw and never admit a number");
// ---------------------------------------------------------------------------
{
  const env = makeEnv({ pricing: ACTIVE(), financing: F() });
  const hostile = [null, undefined, 0, "", [], {}, { id: 5 }, { id: "g6", skus: "queen" }, { id: "g6", skus: { queen: 7 } }];
  let ok = 0;
  for (const m of hostile) {
    for (const size of ["queen", 7, null, {}]) {
      try { const r = env.api.gate("drawer", m, size, { planId: 9, transactionAmountMinor: "x" }); if (r && r.state !== "available") ok++; } catch (e) { /* counted below */ }
    }
  }
  check("hostile mattress/size/opts: every call returns a non-available record without throwing", ok === hostile.length * 4);
  const hostileCfg = makeEnv({ pricing: { enabled: true, displayEnabled: true, surfaces: { drawer: true }, presentation: 5, products: "nope" }, financing: F() });
  check("hostile pricing config: price-unavailable, no throw",
    (() => { try { return hostileCfg.api.gate("drawer", M(), "queen", null).state === "price-unavailable"; } catch (e) { return false; } })());
}

// ---------------------------------------------------------------------------
section("Planted mutants (the sweep's own replace strings) are rejected");
// ---------------------------------------------------------------------------
function mutate(find, replace) {
  return (src) => {
    const n = src.split(find).length - 1;
    if (n !== 1) throw new Error(`mutant anchor matched ${n} times: ${find.slice(0, 60)}`);
    return src.replace(find, replace);
  };
}
{
  const GATE_OFF = "      if (!p || p.enabled !== true || p.displayEnabled !== true || !pricingSurfaceEnabled(surface)) return off;";
  const ADMIT = "      var admitted = !!(r && r.price && r.price.status === 'resolved'\n        && r.freshness && r.freshness.status === 'fresh'\n        && r.eligibility && r.eligibility.status === 'eligible');";
  const lf = (s) => s.replace(/\r\n/g, "\n");
  const withLf = (m) => (src) => m(lf(src));
  // M1: displayEnabled ignored -> the dark fixture becomes available.
  {
    const e = makeEnv({ pricing: (() => { const p = P(); p.surfaces.drawer = true; return p; })(), financing: F(),
      mutate: withLf(mutate(GATE_OFF, "      if (!p || p.enabled !== true || !pricingSurfaceEnabled(surface)) return off;")) });
    // Defence in depth: even with the gate's own displayEnabled check gone,
    // the resolver's eligibility axis refuses the number (not-eligible while
    // displayEnabled is false) — the mutant leaves OFF but never reaches
    // 'available'. Both facts are asserted: the OFF probe fails, and no number.
    const m1 = e.api.gate("drawer", M(), "queen", null);
    check("M1 displayEnabled ignored -> the dark-fixture OFF probe FAILS on the mutant (and the resolver still withholds the number)",
      m1.state === "price-unavailable" && m1.amountMinor === null);
  }
  // M2: surface flag ignored.
  {
    const e = makeEnv({ pricing: ACTIVE({ surfaces: { drawer: false, results: true } }), financing: F(),
      mutate: withLf(mutate(GATE_OFF, "      if (!p || p.enabled !== true || p.displayEnabled !== true) return off;")) });
    check("M2 surface flag ignored -> the per-surface OFF probe FAILS on the mutant", e.api.gate("drawer", M(), "queen", null).state === "available");
  }
  // M3: emergency disable ignored.
  {
    const e = makeEnv({ pricing: ACTIVE({ enabled: false }), financing: F(),
      mutate: withLf(mutate(GATE_OFF, "      if (!p || p.displayEnabled !== true || !pricingSurfaceEnabled(surface)) return off;")) });
    check("M3 emergency disable ignored -> the enabled-false OFF probe FAILS on the mutant", !isOff(e.api.gate("drawer", M(), "queen", null)));
  }
  // M4: stale admitted.
  {
    const e = makeEnv({ pricing: ACTIVE(), financing: F(), nowMs: CLOCK + 30 * 86400000,
      mutate: withLf(mutate(ADMIT, "      var admitted = !!(r && r.price && r.price.status === 'resolved'\n        && r.eligibility && r.eligibility.status === 'eligible');")) });
    check("M4 stale admitted -> the stale-refusal probe FAILS on the mutant", e.api.gate("drawer", M(), "queen", null).state === "available");
  }
  // M5: eligibility ignored.
  {
    const ne = ACTIVE(); ne.presentation.approvals.legal = { status: "unapproved", by: "", at: null };
    const e = makeEnv({ pricing: ne, financing: F(),
      mutate: withLf(mutate(ADMIT, "      var admitted = !!(r && r.price && r.price.status === 'resolved'\n        && r.freshness && r.freshness.status === 'fresh');")) });
    check("M5 eligibility ignored -> the eligibility-withheld probe FAILS on the mutant", e.api.gate("drawer", M(), "queen", null).state === "available");
  }
  // M6: the renderer prints while off.
  {
    const e = makeEnv({ pricing: P(), financing: F(),
      mutate: withLf(mutate("      if (pres.state === 'off' || !pres.text) {", "      if (false) {")) });
    e.api.render(M(), "queen");
    check("M6 renderer ignores OFF -> the hidden-and-empty probe FAILS on the mutant", e.el("drawerPrice").hidden === false);
  }
  // M7: the SKU is forged instead of read from the catalog.
  {
    const e = makeEnv({ pricing: ACTIVE(), financing: F(),
      mutate: withLf(mutate("      var sku = pricingSkuFor(m, size);", "      var sku = 'FIXTURE-0001';")) });
    check("M7 SKU forged -> the no-skus probe FAILS on the mutant", e.api.gate("drawer", M({ skus: undefined }), "queen", null).state === "available");
  }
  // M9: the slot builder ignores OFF (emits a box in production).
  {
    const e = makeEnv({ pricing: shipped.pricing, financing: shipped.financing,
      mutate: withLf(mutate("      if (pres.state === 'off' || !pres.text) return '';", "      if (false) return '';")) });
    check("M9 slot builder ignores OFF -> the shipped-catalog '' probe FAILS on the mutant", e.api.slot("results", catalog.gold[0], "x") !== "");
  }
  // M10: the slot size is a constant instead of the customer's answer.
  {
    const e = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), answers: {},
      mutate: withLf(mutate("      return (typeof answers === 'object' && answers) ? answers.mattress_size : undefined;", "      return 'queen';")) });
    check("M10 slot size forged -> the no-answer unavailable probe FAILS on the mutant (a number appears)",
      e.api.slot("results", M(), "x").indexOf('data-price-state="available"') !== -1);
  }
  // M11: the catalog-record lookup stops checking the record's id.
  {
    const e = makeEnv({ pricing: ACTIVE({ surfaces: { sleepSystem: true } }), financing: F(),
      win: { _drawerData: { g6: { m: M({ id: "g7" }) } } },
      mutate: withLf(mutate("      return (hit && typeof hit === 'object' && hit.id === m.id) ? hit : null;", "      return (hit && typeof hit === 'object') ? hit : null;")) });
    check("M11 index id check dropped -> the cross-id probe FAILS on the mutant",
      e.api.slot("sleepSystem", { id: "g6" }, "x").indexOf('data-price-state="available"') !== -1);
  }
  // M12: the status copy ignores the price state (copy beside a plan with no available price).
  {
    const e = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: { kind: "chosen", item: M() }, nowMs: CLOCK + 30 * 86400000,
      mutate: withLf(mutate("      if (pres.state !== 'available') return '';", "      if (false) return '';")) });
    check("M12 status copy ignores the price state -> the stale '' probe FAILS on the mutant",
      e.api.status("results", "synchrony-0-48", { id: "synchrony-0-48", minimumPurchase: 4200 }) !== "");
  }
  // M13: the threshold line stops requiring a published minimum.
  {
    const e = makeEnv({ pricing: ACTIVE({ surfaces: { results: true } }), financing: F(), finalist: { kind: "chosen", item: M() },
      mutate: withLf(mutate("      if (pres.threshold === 'unknown' && plan && typeof plan.minimumPurchase === 'number') {", "      if (pres.threshold === 'unknown') {")) });
    check("M13 threshold line without a published minimum -> the no-minimum probe FAILS on the mutant",
      e.api.status("results", "lacks-in-house", { id: "lacks-in-house", minimumPurchase: null }).indexOf(fx.pricing.presentation.states["threshold-unknown"].en) !== -1);
  }
  // M8: the surface helper defaults open like the financing helper.
  {
    const e = makeEnv({ pricing: (() => { const p = ACTIVE(); delete p.surfaces; return p; })(), financing: F(),
      mutate: withLf(mutate("      if (!s || typeof s !== 'object') return false;", "      if (!s || typeof s !== 'object') return true;")) });
    check("M8 surface helper defaults open -> the strict-helper probe FAILS on the mutant", e.api.gate("drawer", M(), "queen", null).state === "available");
  }
}

console.log(`\nPricing presentation check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
