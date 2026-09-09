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
for (const name of ["getPricingConfig", "pricingSurfaceEnabled", "pricingSkuFor", "pricingStateCopy",
                    "pricingCopyList", "formatPriceAmount", "pricePresentationFor", "renderDrawerPrice"]) {
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

function makeEnv({ pricing, financing, lang = "en", nowMs = CLOCK, mutate = null } = {}) {
  const els = new Map();
  const doc = { getElementById(id) { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); } };
  const STORE_CONFIG = { pricing, financing };
  let src = [resolverBlock, gateBlock, Lsrc, escSrc].join("\n");
  if (mutate) src = mutate(src);
  const DATE_SHIM = { now: () => nowMs, parse: Date.parse };
  const api = new Function(
    "document", "STORE_CONFIG", "currentLang", "getFinancingConfig", "t", "Date",
    "window", "localStorage", "sessionStorage", "fetch", "analytics",
    `"use strict";\n${src}\nreturn { gate: pricePresentationFor, render: renderDrawerPrice,
       surface: pricingSurfaceEnabled, sku: pricingSkuFor, fmt: formatPriceAmount };`)(
    doc, STORE_CONFIG, lang, () => STORE_CONFIG.financing, (k) => "DICT:" + k, DATE_SHIM,
    undefined, undefined, undefined, undefined, undefined);
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
  // M8: the surface helper defaults open like the financing helper.
  {
    const e = makeEnv({ pricing: (() => { const p = ACTIVE(); delete p.surfaces; return p; })(), financing: F(),
      mutate: withLf(mutate("      if (!s || typeof s !== 'object') return false;", "      if (!s || typeof s !== 'object') return true;")) });
    check("M8 surface helper defaults open -> the strict-helper probe FAILS on the mutant", e.api.gate("drawer", M(), "queen", null).state === "available");
  }
}

console.log(`\nPricing presentation check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
