// Offers engine check — exact promotions and discounts in the ONE operable
// application (owner direction 2026-10-15; integration contract section 2).
//
// Extracts the REAL offer functions from index.html's marked Phase 2.2 price
// presentation gate block (offerAdmitted, admittedOffers, offerMatchesLine,
// quoteApplyOffers, quoteOfferTerms, buildConsultationQuote, ...) and
// executes them under an INJECTED clock against in-memory governed
// NON-SHIPPING pricing blocks. Nothing here is shipped data: production
// carries pricing.offers [] with the gate dark, which is proven first.
//
// Pinned:
//   * admission is fail-closed: gate open with every presentation approval,
//     current retailer-promotion evidence (named verifier, not future beyond
//     the 5-minute skew, within freshness.maxAgeDays, allowlisted host under
//     an APPROVED source policy), a named approval at a parseable,
//     non-future instant, now in [startsAt, endsAt) with offsets required,
//     and a well-formed effect - anything malformed is refused, a duplicated
//     id admits neither copy;
//   * application: eligibility (kinds, productIds, brands, sizes),
//     exclusions (an unknown brand never clears a brand exclusion), the
//     minimum judged on the PRE-discount subtotal, pay-in-full-only offers
//     only on a 'full' quote, (priority, id) order, an exclusive first
//     candidate applies alone, otherwise every combinable applies in order,
//     each offer at most once per line, percent-off floors, amount-off is per
//     unit x quantity clamped at the remaining amount;
//   * the quote: offers run only over a fully resolved quote; the NET
//     merchandise amount must pass the money admission or the quote is
//     unresolved; discounts carry {offerId, label, amountMinor};
//   * the email gate: quote enters the payload only while
//     pricing.surfaces.email is true and the summary is a v1 record;
//   * the payment-demo path is retired: no demo adapter, context or mark.
//
// Run: node tests/offers_engine_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const shipped = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const dictEn = JSON.parse(readFileSync(join(root, "data", "dict-en.json"), "utf8"));
const dictEs = JSON.parse(readFileSync(join(root, "data", "dict-es.json"), "utf8"));
const fx = JSON.parse(readFileSync(join(root, "tests", "fixtures", "pricing_populated_fixture.json"), "utf8"));

let passed = 0, failed = 0;
function check(label, cond, detail = "") {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
}
function section(name) { console.log(`\n== ${name} ==`); }

// ---------------------------------------------------------------------------
section("Extraction and containment");
// ---------------------------------------------------------------------------
const R_START = "// ═══ PHASE 2.1B DARK RESOLVER (definition only — called only through the 2.2 gate) ═══";
const R_END = "// ═══ END PHASE 2.1B DARK RESOLVER ═══";
const G_START = "// ═══ PHASE 2.2 PRICE PRESENTATION GATE (disabled implementation — production renders nothing) ═══";
const G_END = "// ═══ END PHASE 2.2 PRICE PRESENTATION GATE ═══";
const rs = html.indexOf(R_START), re = html.indexOf(R_END), gs = html.indexOf(G_START), ge = html.indexOf(G_END);
check("resolver and gate blocks found, in order", rs !== -1 && re > rs && gs > re && ge > gs);
const resolverBlock = html.slice(rs, re);
const gateBlock = html.slice(gs, ge);
const fnRe = (n) => new RegExp(`function ${n}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\}`);
const Lsrc = (html.match(fnRe("L")) || [""])[0];
const escSrc = (html.match(fnRe("escapeHtml")) || [""])[0];
check("L() and escapeHtml() extracted", Lsrc.length > 0 && escSrc.length > 0);
for (const name of ["offerAdmitted", "admittedOffers", "offerMatchesLine", "quoteApplyOffers", "quoteOfferTerms",
                    "pricingPresentationApproved", "offerEffectValid", "psEnabled", "purchaseSummaryFor",
                    "emailQuoteGate", "psFingerprint"]) {
  const d = new RegExp(`function\\s+${name}\\s*\\(`, "g");
  check(`${name} is declared exactly once, inside the gate block`,
    (html.match(d) || []).length === 1 && (gateBlock.match(d) || []).length === 1);
}
check("offers are read only through getPricingConfig() (the one pricing read stays the gate's)",
  (html.match(/STORE_CONFIG\s*\.\s*pricing\b/g) || []).length === 1
  && /admittedOffers\(getPricingConfig\(\), Date\.now\(\)\)/.test(gateBlock));
check("offers run inside buildConsultationQuote only over a fully resolved quote",
  /if \(listMinor !== null\) \{\s*var offers = admittedOffers\(getPricingConfig\(\), Date\.now\(\)\);/.test(gateBlock));

// ---------------------------------------------------------------------------
section("The payment-demo path is retired (one application)");
// ---------------------------------------------------------------------------
for (const token of ["demoAdmission", "__DF_DEMO_CONTEXT", "illustrativeDemo", "demoPriceEntry", "demoPlanAdmitted",
                     "demoPricePresentation", "demoPayEstimate", "DEMO_PRICE_STATUSES", "psDemoConfig",
                     "psIllustrative", "PS_ILLUS_MARK", "psSheetDemoPanel", "ps-illus", "◇"]) {
  check(`index.html no longer contains ${JSON.stringify(token)}`, html.indexOf(token) === -1);
}
check("no plan is routed by a `demo` flag any more", !/\.demo\s*===\s*true/.test(html));
for (const k of ["ps.illustrative_mark", "ps.center_example", "pay.fx.basis_example", "pay.fx.basis_equal_example"]) {
  check(`retired demo dictionary key ${k} is gone from both dictionaries`, !(k in dictEn) && !(k in dictEs));
}
const NEW_KEYS = ["ps.savings", "ps.savings_amount", "ps.list_subtotal", "ps.your_price", "ps.was", "ps.offer_line",
  "ps.offer_terms", "ps.cash_offer_dropped", "ps.threshold_unknown", "ps.center_plan", "ps.prices_verified",
  "ps.terms_verified", "ps.th_title_quote", "ps.preview_savings", "email.figures_changed", "email.retry", "email.retrying"];
for (const k of NEW_KEYS) {
  check(`${k} is bilingual (non-blank in both dictionaries)`,
    typeof dictEn[k] === "string" && dictEn[k].trim() && typeof dictEs[k] === "string" && dictEs[k].trim());
}
check("no customer-facing copy calls a governed plan an example any more",
  !/\(example\)|\(ejemplo\)/.test(dictEn["ps.mattress_monthly"] + dictEn["ps.cmp_monthly"] + dictEs["ps.mattress_monthly"] + dictEs["ps.cmp_monthly"]));

// ---------------------------------------------------------------------------
// Harness: both blocks compiled with an injected clock.
// ---------------------------------------------------------------------------
const CLOCK = Date.parse("2026-11-05T12:00:00-06:00");
function makeEnv({ pricing, financing = null, nowMs = CLOCK, lang = "en", finalist, accessories = [], win = {} } = {}) {
  const STORE_CONFIG = { pricing, financing };
  const DATE_SHIM = function (v) { return v === undefined ? new Date(nowMs) : new Date(v); };
  DATE_SHIM.now = () => nowMs;
  DATE_SHIM.parse = Date.parse;
  const src = [resolverBlock, gateBlock, Lsrc, escSrc].join("\n");
  return new Function(
    "document", "STORE_CONFIG", "currentLang", "getFinancingConfig", "t", "Date", "window",
    "answers", "resolveFinalistState", "ACCESSORIES", "financingPlanFresh", "answerLabelFor",
    `"use strict";\n${src}\nreturn { offerAdmitted, admittedOffers, offerMatchesLine, quoteApplyOffers,
      quoteOfferTerms, quote: buildConsultationQuote, psEnabled, emailQuoteGate, psFingerprint,
      purchaseSummaryFor, psPay, quoteQualifyingAmount, approved: pricingPresentationApproved };`)(
    { getElementById: () => null }, STORE_CONFIG, lang, () => financing, (k) => "DICT:" + k, DATE_SHIM, win,
    { mattress_size: "queen" }, finalist === undefined ? undefined : () => finalist, accessories,
    () => false, () => "");
}
const clone = (o) => JSON.parse(JSON.stringify(o));
const REC = (by) => ({ status: "approved", by, at: "2026-11-01T09:00:00-05:00" });
function PRICING(over = {}) {
  return Object.assign({
    schemaVersion: 1, enabled: true, displayEnabled: true, currency: "USD",
    authority: { owner: "Test owner", role: "merchandising" },
    freshness: { status: "approved", maxAgeDays: 7, approvedBy: "Test", approvedAt: "2026-11-01T09:00:00-05:00" },
    sourcePolicy: { status: "approved", allowedSourceHosts: ["lacks.com"], approvedBy: "Test", approvedAt: "2026-11-01T09:00:00-05:00" },
    presentation: { status: "approved", approvals: { business: REC("Biz"), legal: REC("Legal"), nativeReview: REC("Native") },
                    assumptions: [], disclosures: [], states: {} },
    surfaces: { handoff: true, results: true, email: false },
    products: [], formulas: [], offers: []
  }, over);
}
function OFFER(over = {}) {
  return Object.assign({
    id: "spring-sale-10",
    label: { en: "Spring sale", es: "Venta de primavera" },
    terms: { en: "10% off mattresses through Nov 14.", es: "10% de descuento en colchones hasta el 14 de nov." },
    effect: { type: "percent-off", basisPoints: 1000 },
    eligibility: { productKinds: ["mattress"] },
    startsAt: "2026-11-01T00:00:00-05:00",
    endsAt: "2026-11-15T00:00:00-06:00",
    stacking: "combinable",
    priority: 0,
    minimumMerchandiseMinor: null,
    payment: "any",
    evidence: { status: "retailer-promotion-current", sourceUrl: "https://www.lacks.com/spring-sale",
                verifiedAt: "2026-11-04T09:00:00-06:00", verifiedBy: "Tester" },
    approval: { by: "Owner", at: "2026-11-04T10:00:00-06:00" }
  }, over);
}
const env = makeEnv({ pricing: PRICING() });
const admit = (o, p = PRICING(), now = CLOCK) => env.offerAdmitted(o, p, now);

// ---------------------------------------------------------------------------
section("Shipped configuration: nothing admitted, nothing discounted");
// ---------------------------------------------------------------------------
check("shipped pricing.offers is [] and the email surface ships false",
  Array.isArray(shipped.pricing.offers) && shipped.pricing.offers.length === 0
  && shipped.pricing.surfaces && shipped.pricing.surfaces.email === false);
check("shipped config admits no offer, even one planted into it",
  env.admittedOffers(Object.assign(clone(shipped.pricing), { offers: [OFFER()] }), CLOCK).length === 0);
check("shipped config: the studio is not admitted (psEnabled false)",
  makeEnv({ pricing: shipped.pricing }).psEnabled() === false);
check("shipped config: the email quote is null even for a v1 summary",
  makeEnv({ pricing: shipped.pricing }).emailQuoteGate({ v: 1, lines: [] }) === null);

// ---------------------------------------------------------------------------
section("Admission: the governed offer, and every gate fail-closed");
// ---------------------------------------------------------------------------
check("a complete, current, approved offer is admitted", admit(OFFER()) === true);
check("gate: pricing.enabled false refuses", admit(OFFER(), PRICING({ enabled: false })) === false);
check("gate: displayEnabled false refuses", admit(OFFER(), PRICING({ displayEnabled: false })) === false);
{
  const p = PRICING(); p.presentation.status = "pending";
  check("gate: presentation not approved refuses", admit(OFFER(), p) === false);
  const q = PRICING(); q.presentation.approvals.legal = { status: "approved", by: "", at: "2026-11-01T09:00:00-05:00" };
  check("gate: an approval without a named approver refuses", admit(OFFER(), q) === false);
  const r = PRICING(); r.presentation.approvals.nativeReview.status = "pending";
  check("gate: native review pending refuses", admit(OFFER(), r) === false);
  check("gate: blank authority refuses", admit(OFFER(), PRICING({ authority: { owner: "", role: "x" } })) === false);
}
// dates: start inclusive, end exclusive, offsets required
const S = Date.parse("2026-11-01T00:00:00-05:00"), E = Date.parse("2026-11-15T00:00:00-06:00");
const evNow = (now) => OFFER({ evidence: Object.assign(OFFER().evidence, { verifiedAt: new Date(now - 3600000).toISOString() }),
                               approval: { by: "Owner", at: new Date(now - 3600000).toISOString() } });
check("dates: exactly at startsAt is admitted (inclusive)", admit(evNow(S), PRICING(), S) === true);
check("dates: 1 ms before startsAt is refused", admit(evNow(S - 1), PRICING(), S - 1) === false);
check("dates: 1 ms before endsAt is admitted", admit(evNow(E - 1), PRICING(), E - 1) === true);
check("dates: exactly at endsAt is refused (exclusive)", admit(evNow(E), PRICING(), E) === false);
check("dates: a stamp without an offset is refused", admit(OFFER({ startsAt: "2026-11-01T00:00:00" })) === false);
check("dates: endsAt equal to startsAt is refused", admit(OFFER({ endsAt: "2026-11-01T00:00:00-05:00" })) === false);
check("dates: endsAt before startsAt is refused", admit(OFFER({ endsAt: "2026-10-30T00:00:00-05:00" })) === false);
check("dates: unparseable is refused", admit(OFFER({ endsAt: "soon-05:00" })) === false);
check("clock: an invalid clock refuses", admit(OFFER(), PRICING(), NaN) === false);
// evidence
const ev = (over) => OFFER({ evidence: Object.assign(clone(OFFER().evidence), over) });
check("evidence: a status other than retailer-promotion-current is refused",
  admit(ev({ status: "retailer-product-page-current" })) === false && admit(ev({ status: "historical-snapshot" })) === false
  && admit(ev({ status: "illustrative" })) === false);
check("evidence: blank verifiedBy is refused", admit(ev({ verifiedBy: "  " })) === false);
check("evidence: verifiedAt 6 minutes in the future is refused", admit(ev({ verifiedAt: new Date(CLOCK + 360000).toISOString() })) === false);
check("evidence: verifiedAt 4 minutes in the future is admitted (5-minute skew)", admit(ev({ verifiedAt: new Date(CLOCK + 240000).toISOString() })) === true);
check("evidence: older than freshness.maxAgeDays is refused", admit(ev({ verifiedAt: new Date(CLOCK - 8 * 86400000).toISOString() })) === false);
check("evidence: no governed maxAgeDays refuses",
  admit(OFFER(), PRICING({ freshness: { status: "approved", maxAgeDays: null } })) === false);
check("evidence: a source host off the allowlist is refused", admit(ev({ sourceUrl: "https://example.com/sale" })) === false);
check("evidence: http (not https) is refused", admit(ev({ sourceUrl: "http://www.lacks.com/sale" })) === false);
check("evidence: an archive host is refused", admit(ev({ sourceUrl: "https://web.archive.org/web/1/https://www.lacks.com/" })) === false);
check("evidence: credentials in the URL are refused", admit(ev({ sourceUrl: "https://user@www.lacks.com/sale" })) === false);
check("evidence: an UNAPPROVED source policy refuses even an allowlisted host",
  admit(OFFER(), PRICING({ sourcePolicy: { status: "unapproved", allowedSourceHosts: ["lacks.com"] } })) === false);
// approval
check("approval: blank approver is refused", admit(OFFER({ approval: { by: "", at: "2026-11-04T10:00:00-06:00" } })) === false);
check("approval: unparseable instant is refused", admit(OFFER({ approval: { by: "Owner", at: "yesterday" } })) === false);
check("approval: an instant in the future is refused", admit(OFFER({ approval: { by: "Owner", at: "2026-11-06T10:00:00-06:00" } })) === false);
check("approval: missing is refused", admit(OFFER({ approval: undefined })) === false);
// effect
for (const [label, effect, ok] of [
  ["basisPoints 1", { type: "percent-off", basisPoints: 1 }, true],
  ["basisPoints 10000", { type: "percent-off", basisPoints: 10000 }, true],
  ["basisPoints 0", { type: "percent-off", basisPoints: 0 }, false],
  ["basisPoints 10001", { type: "percent-off", basisPoints: 10001 }, false],
  ["basisPoints 12.5", { type: "percent-off", basisPoints: 12.5 }, false],
  ["basisPoints as a string", { type: "percent-off", basisPoints: "1000" }, false],
  ["amountMinor 1", { type: "amount-off", amountMinor: 1 }, true],
  ["amountMinor 0", { type: "amount-off", amountMinor: 0 }, false],
  ["amountMinor negative", { type: "amount-off", amountMinor: -500 }, false],
  ["amountMinor fractional", { type: "amount-off", amountMinor: 99.5 }, false],
  ["unknown type", { type: "bogo", amountMinor: 100 }, false],
  ["missing", undefined, false]]) {
  check(`effect: ${label} -> ${ok ? "admitted" : "refused"}`, admit(OFFER({ effect })) === ok);
}
// malformed shape
for (const [label, over] of [
  ["id with capitals", { id: "Spring-Sale" }], ["id too short", { id: "ab" }], ["id with a space", { id: "spring sale" }],
  ["label missing Spanish", { label: { en: "Sale" } }], ["blank terms", { terms: { en: " ", es: "x" } }],
  ["no eligibility", { eligibility: undefined }], ["empty productKinds", { eligibility: { productKinds: [] } }],
  ["unknown product kind", { eligibility: { productKinds: ["frame"] } }],
  ["productIds not an array", { eligibility: { productKinds: ["mattress"], productIds: "g6" } }],
  ["empty productIds", { eligibility: { productKinds: ["mattress"], productIds: [] } }],
  ["exclusions not an object", { exclusions: "none" }],
  ["stacking unknown", { stacking: "stackable" }], ["priority negative", { priority: -1 }],
  ["priority fractional", { priority: 1.5 }], ["payment unknown", { payment: "cash" }],
  ["minimum negative", { minimumMerchandiseMinor: -1 }], ["minimum fractional", { minimumMerchandiseMinor: 10.5 }]]) {
  check(`malformed: ${label} is refused`, admit(OFFER(over)) === false);
}
{
  const o = OFFER(); delete o.minimumMerchandiseMinor;
  check("malformed: minimumMerchandiseMinor absent (it is required, null allowed) is refused", admit(o) === false);
}
check("malformed: null / a string / an array are refused, never thrown",
  admit(null) === false && admit("spring-sale-10") === false && admit([]) === false);
{
  const p = PRICING({ offers: [OFFER({ id: "dup-offer" }), OFFER({ id: "dup-offer", priority: 5 }), OFFER({ id: "solo-offer" })] });
  const ids = env.admittedOffers(p, CLOCK).map((o) => o.id);
  check("a duplicated id admits NEITHER copy (ambiguous), the rest still admit", JSON.stringify(ids) === JSON.stringify(["solo-offer"]));
  const q = PRICING({ offers: [OFFER({ id: "zz-late", priority: 1 }), OFFER({ id: "bb-mid", priority: 1 }), OFFER({ id: "aa-first", priority: 3 }), OFFER({ id: "cc-zero", priority: 0 })] });
  check("admitted offers are ordered by (priority asc, id asc)",
    JSON.stringify(env.admittedOffers(q, CLOCK).map((o) => o.id)) === JSON.stringify(["cc-zero", "bb-mid", "zz-late", "aa-first"]));
  check("admittedOffers tolerates a missing / hostile offers list",
    env.admittedOffers(PRICING({ offers: null }), CLOCK).length === 0
    && env.admittedOffers(PRICING({ offers: [null, 7, "x", {}] }), CLOCK).length === 0
    && env.admittedOffers(null, CLOCK).length === 0);
}

// ---------------------------------------------------------------------------
section("Application: quoteApplyOffers (pure)");
// ---------------------------------------------------------------------------
const LINE = (over = {}) => Object.assign({ kind: "mattress", productId: "g6", brand: "Restonic", size: "queen",
  quantity: 1, resolved: true, currency: "USD", unitAmountMinor: 100000, extendedAmountMinor: 100000,
  discounts: [], discountMinor: 0, netAmountMinor: 100000 }, over);
const ACCL = (over = {}) => LINE(Object.assign({ kind: "accessory", productId: "pillow-flow", brand: null, size: null,
  unitAmountMinor: 10000, extendedAmountMinor: 10000, netAmountMinor: 10000 }, over));
const apply = (lines, offers, payment) => env.quoteApplyOffers(lines, { offers, payment });
{
  const r = apply([LINE()], [OFFER()]);
  check("percent-off: 10% of $1,000.00 is $100.00, net $900.00",
    r.lines[0].discountMinor === 10000 && r.lines[0].netAmountMinor === 90000 && r.discountMinor === 10000
    && r.listMerchandiseMinor === 100000 && r.merchandiseMinor === 90000);
  check("the discount record is {offerId, label (bilingual object), amountMinor}",
    JSON.stringify(Object.keys(r.lines[0].discounts[0]).sort()) === JSON.stringify(["amountMinor", "label", "offerId"])
    && r.lines[0].discounts[0].label.es === "Venta de primavera" && r.lines[0].discounts[0].offerId === "spring-sale-10");
  const odd = apply([LINE({ extendedAmountMinor: 99999 })], [OFFER({ effect: { type: "percent-off", basisPoints: 1500 } })]);
  check("percent-off floors: 15% of 99,999 minor is 14,999 (never rounded up in the customer's favour or against it)",
    odd.lines[0].discountMinor === 14999 && odd.lines[0].netAmountMinor === 85000);
}
{
  const r = apply([ACCL({ quantity: 3, extendedAmountMinor: 30000 })],
    [OFFER({ id: "pillow-20", effect: { type: "amount-off", amountMinor: 2000 }, eligibility: { productKinds: ["accessory"] } })]);
  check("amount-off is per unit x quantity: $20 x 3 = $60", r.lines[0].discountMinor === 6000 && r.lines[0].netAmountMinor === 24000);
  const c = apply([ACCL({ quantity: 1, extendedAmountMinor: 3000 })],
    [OFFER({ id: "big-off", effect: { type: "amount-off", amountMinor: 50000 }, eligibility: { productKinds: ["accessory"] } })]);
  check("amount-off is clamped at the remaining amount: net never below zero",
    c.lines[0].discountMinor === 3000 && c.lines[0].netAmountMinor === 0);
}
{
  const exc = OFFER({ id: "excl-15", stacking: "exclusive", priority: 0, effect: { type: "percent-off", basisPoints: 1500 } });
  const comb = OFFER({ id: "comb-10", stacking: "combinable", priority: 10 });
  const r = apply([LINE()], [comb, exc]);
  check("an EXCLUSIVE first candidate applies alone (15%, the combinable 10% does not)",
    r.lines[0].discounts.length === 1 && r.lines[0].discounts[0].offerId === "excl-15" && r.lines[0].discountMinor === 15000);
  const r2 = apply([LINE()], [OFFER({ id: "excl-15", stacking: "exclusive", priority: 20, effect: { type: "percent-off", basisPoints: 1500 } }), comb]);
  check("an exclusive that is NOT first is skipped; the combinables apply",
    r2.lines[0].discounts.length === 1 && r2.lines[0].discounts[0].offerId === "comb-10");
  const r3 = apply([LINE()], [OFFER({ id: "b-five", priority: 1, effect: { type: "percent-off", basisPoints: 500 } }),
                              OFFER({ id: "a-ten", priority: 1 })]);
  check("combinables apply in (priority, id) order, each on the REMAINING amount: 10% then 5% = 10,000 + 4,500",
    r3.lines[0].discounts.map((d) => d.offerId).join(",") === "a-ten,b-five"
    && r3.lines[0].discounts[1].amountMinor === 4500 && r3.lines[0].netAmountMinor === 85500);
  const once = apply([LINE()], [OFFER(), OFFER()]);
  check("each offer id applies at most once per line", once.lines[0].discounts.length === 1 && once.lines[0].discountMinor === 10000);
  const tieExcl = apply([LINE()], [OFFER({ id: "b-excl", stacking: "exclusive", priority: 0 }), OFFER({ id: "a-comb", priority: 0 })]);
  check("a priority tie is broken by id: the combinable 'a-comb' is first, so the exclusive is skipped",
    tieExcl.lines[0].discounts.map((d) => d.offerId).join(",") === "a-comb");
}
{
  const kinds = apply([LINE(), ACCL()], [OFFER()]);
  check("eligibility.productKinds: a mattress offer leaves the accessory line alone",
    kinds.lines[0].discountMinor === 10000 && kinds.lines[1].discountMinor === 0 && kinds.lines[1].netAmountMinor === 10000);
  const ids = apply([LINE(), LINE({ productId: "g7" })], [OFFER({ eligibility: { productKinds: ["mattress"], productIds: ["g7"] } })]);
  check("eligibility.productIds: only the listed product", ids.lines[0].discountMinor === 0 && ids.lines[1].discountMinor === 10000);
  const brands = apply([LINE(), LINE({ brand: "Spring Air" }), LINE({ brand: null })], [OFFER({ eligibility: { productKinds: ["mattress"], brands: ["Spring Air"] } })]);
  check("eligibility.brands: only the listed brand; an UNKNOWN brand never matches",
    brands.lines.map((l) => l.discountMinor).join(",") === "0,10000,0");
  const sizes = apply([LINE(), LINE({ size: "king" }), ACCL()], [OFFER({ eligibility: { productKinds: ["mattress", "accessory"], sizes: ["king"] } })]);
  check("eligibility.sizes: the line's priced size; a sizeless line never matches a size-limited offer",
    sizes.lines.map((l) => l.discountMinor).join(",") === "0,10000,0");
  const exId = apply([LINE(), LINE({ productId: "g7" })], [OFFER({ exclusions: { productIds: ["g6"] } })]);
  check("exclusions.productIds remove a product", exId.lines.map((l) => l.discountMinor).join(",") === "0,10000");
  const exBrand = apply([LINE(), LINE({ brand: "Tempur" }), LINE({ brand: null })], [OFFER({ exclusions: { brands: ["Tempur"] } })]);
  check("exclusions.brands remove a brand, and an UNKNOWN brand cannot clear a brand exclusion (fail closed)",
    exBrand.lines.map((l) => l.discountMinor).join(",") === "10000,0,0");
}
{
  const two = [LINE({ extendedAmountMinor: 30000 }), LINE({ productId: "g7", extendedAmountMinor: 30000 })];
  const met = apply(two, [OFFER({ minimumMerchandiseMinor: 60000 })]);
  check("minimum is judged on the PRE-discount subtotal: 60,000 list meets a 60,000 minimum (although the net is lower)",
    met.discountMinor === 6000 && met.merchandiseMinor === 54000);
  const notMet = apply(two, [OFFER({ minimumMerchandiseMinor: 60001 })]);
  check("one minor unit short of the minimum applies nothing", notMet.discountMinor === 0 && notMet.appliedOffers.length === 0);
}
{
  const cash = OFFER({ id: "cash-5", payment: "pay-in-full-only", effect: { type: "percent-off", basisPoints: 500 } });
  check("pay-in-full-only applies to a 'full' quote", apply([LINE()], [cash], "full").discountMinor === 5000);
  check("...and the default quote payment is 'full'", apply([LINE()], [cash]).discountMinor === 5000);
  check("pay-in-full-only never applies to a 'financed' (plan) quote", apply([LINE()], [cash], "financed").discountMinor === 0);
  const both = apply([LINE()], [OFFER(), cash], "financed");
  check("a financed quote keeps the 'any' offer and drops only the pay-in-full-only one",
    both.appliedOffers.join(",") === "spring-sale-10" && both.discountMinor === 10000);
}
{
  const lines = [Object.freeze(LINE()), Object.freeze(ACCL())];
  let threw = null, r = null;
  try { r = apply(lines, [OFFER(), OFFER({ id: "acc-5", eligibility: { productKinds: ["accessory"] }, effect: { type: "percent-off", basisPoints: 500 } })]); }
  catch (e) { threw = e; }
  check("PURE: frozen input lines are not mutated and nothing throws", !threw && lines[0].discountMinor === 0 && r.lines[0] !== lines[0]);
  check("the quote's appliedOffers are unique ids in application order", JSON.stringify(r.appliedOffers) === JSON.stringify(["spring-sale-10", "acc-5"]));
  check("discountMinor is the sum of every line's discount", r.discountMinor === 10000 + 500 && r.merchandiseMinor === 110000 - 10500);
  check("no offers -> no discount, identity amounts", apply([LINE()], []).discountMinor === 0 && apply([LINE()], []).merchandiseMinor === 100000);
}

// ---------------------------------------------------------------------------
section("The quote: buildConsultationQuote over the governed fixture");
// ---------------------------------------------------------------------------
{
  const FCLOCK = Date.parse(fx._meta.clock);
  const fxP = (offers = []) => {
    const p = clone(fx.pricing);
    p.displayEnabled = true;
    p.surfaces = Object.assign({}, p.surfaces, { results: true });
    p.offers = offers;
    return p;
  };
  const fxOffer = (over = {}) => OFFER(Object.assign({
    startsAt: "2026-08-20T00:00:00-05:00", endsAt: "2026-09-10T00:00:00-05:00",
    evidence: { status: "retailer-promotion-current", sourceUrl: "https://www.lacks.com/fixture-sale",
                verifiedAt: "2026-08-26T10:00:00-05:00", verifiedBy: "FIXTURE tester" },
    approval: { by: "FIXTURE owner", at: "2026-08-26T11:00:00-05:00" }
  }, over));
  const M = { id: "g6", name: "Fixture Six", brand: "Fixture", skus: { queen: "FIXTURE-0001" } };
  const Q = (offers, payment) => makeEnv({ pricing: fxP(offers), financing: clone(fx.financing), nowMs: FCLOCK,
    finalist: { kind: "chosen", item: M } }).quote("results", "queen", payment ? { payment } : undefined);
  const base = Q([]);
  check("fixture: the governed mattress resolves (369,900) with no offer: no discount, quoteFor 'full'",
    base.status === "complete" && base.merchandiseMinor === 369900 && base.listMerchandiseMinor === 369900
    && base.discountMinor === 0 && base.appliedOffers.length === 0 && base.quoteFor === "full");
  const off = Q([fxOffer()]);
  check("an admitted 10% offer: list 369,900, discount 36,990, NET merchandise 332,910 - the figure everything reads",
    off.status === "complete" && off.listMerchandiseMinor === 369900 && off.discountMinor === 36990
    && off.merchandiseMinor === 332910 && off.lines[0].netAmountMinor === 332910
    && off.appliedOffers.join(",") === "spring-sale-10");
  const cash = Q([fxOffer({ id: "cash-5", payment: "pay-in-full-only", effect: { type: "percent-off", basisPoints: 500 } })], "financed");
  check("a financed quote does not carry a pay-in-full-only offer", cash.merchandiseMinor === 369900 && cash.quoteFor === "financed");
  const all = Q([fxOffer({ effect: { type: "percent-off", basisPoints: 10000 } })]);
  check("a net amount that fails the money admission (100% off -> 0) makes the quote UNRESOLVED, never $0",
    all.status === "unresolved" && all.merchandiseMinor === null && all.discountMinor === 0 && all.appliedOffers.length === 0);
  const expired = Q([fxOffer({ endsAt: "2026-08-27T07:00:00-05:00" })]);   // ended an hour before the fixture clock
  check("an offer that ended before now is not applied", expired.discountMinor === 0 && expired.merchandiseMinor === 369900);
  const unresolved = makeEnv({ pricing: fxP([fxOffer()]), financing: clone(fx.financing), nowMs: FCLOCK,
    finalist: { kind: "chosen", item: M }, win: { _accCart: { "pillow-flow": { id: "pillow-flow" } } },
    accessories: [{ id: "pillow-flow", name: "Flow", price: 108 }] }).quote("results", "queen");
  check("offers never run over an UNRESOLVED quote: no line carries a discount, nothing is applied",
    unresolved.status === "unresolved" && unresolved.lines.every((l) => l.discounts.length === 0 && l.discountMinor === 0)
    && unresolved.appliedOffers.length === 0);
  const dark = makeEnv({ pricing: Object.assign(fxP([fxOffer()]), { displayEnabled: false }), financing: clone(fx.financing),
    nowMs: FCLOCK, finalist: { kind: "chosen", item: M } }).quote("results", "queen");
  check("display disabled: nothing resolves and no offer is admitted", dark.merchandiseMinor === null && dark.appliedOffers.length === 0);
}

// ---------------------------------------------------------------------------
section("Qualifying amount and the email gate");
// ---------------------------------------------------------------------------
{
  const q = { status: "complete", hasMattress: true, merchandiseMinor: 300000, currency: "USD", finalist: { id: "g6" }, lines: [] };
  check("psPay: a plan that publishes a minimum WITHOUT a computable basis is threshold-unknown (no payment, never the subtotal assumed)",
    env.psPay(q, { id: "p", minimumPurchase: 500 }, 0, "queen").state === "threshold-unknown"
    && env.psPay(q, { id: "p", minimumPurchase: 500, qualifyingBasis: "order-total" }, 0, "queen").state === "threshold-unknown");
  check("psPay: a declared merchandise-subtotal basis is NOT threshold-unknown",
    env.psPay(q, { id: "p", minimumPurchase: 500, qualifyingBasis: "merchandise-subtotal" }, 0, "queen").state !== "threshold-unknown");
  check("psPay source passes quoteQualifyingAmount's amount, never the merchandise subtotal, as the qualifying amount",
    /var qual = quoteQualifyingAmount\(q, plan\);/.test(gateBlock)
    && /qualifyingMinor: qual\.amountMinor === null \? undefined : qual\.amountMinor/.test(gateBlock)
    && !/qualifyingMinor: q\.merchandiseMinor/.test(gateBlock));
  const on = makeEnv({ pricing: PRICING({ surfaces: { handoff: true, email: true } }) });
  const off = makeEnv({ pricing: PRICING({ surfaces: { handoff: true, email: false } }) });
  const sum = { v: 1, lines: [] };
  check("emailQuoteGate: surfaces.email true + a v1 summary -> that same summary", on.emailQuoteGate(sum) === sum);
  check("emailQuoteGate: surfaces.email false -> null", off.emailQuoteGate(sum) === null);
  check("emailQuoteGate: a non-v1 / absent summary -> null",
    on.emailQuoteGate({ v: 2 }) === null && on.emailQuoteGate(null) === null && on.emailQuoteGate("x") === null);
  check("psEnabled needs enabled, displayEnabled AND the handoff surface",
    on.psEnabled() === true
    && makeEnv({ pricing: PRICING({ surfaces: { handoff: false } }) }).psEnabled() === false
    && makeEnv({ pricing: PRICING({ displayEnabled: false }) }).psEnabled() === false
    && makeEnv({ pricing: PRICING({ enabled: false }) }).psEnabled() === false);
  check("purchaseSummaryFor refuses a language other than the active one (one formatter, no second computation)",
    env.purchaseSummaryFor("es") === null);
  const f1 = env.psFingerprint({ a: 1, lines: [{ netText: "$900" }] });
  check("the summary fingerprint is stable and sensitive to any figure",
    f1 === env.psFingerprint({ a: 1, lines: [{ netText: "$900" }] }) && f1 !== env.psFingerprint({ a: 1, lines: [{ netText: "$901" }] })
    && /^[0-9a-f]{16}$/.test(f1));
  check("the summary excludes computedAt from its fingerprint (a recompute of the same figures matches)",
    /out\.computedAt = new Date\(Date\.now\(\)\)\.toISOString\(\);\s*out\.fingerprint = psFingerprint\(figures\);/.test(gateBlock));
}
{
  const payloadAt = html.indexOf("const payload = {");
  const head = html.slice(payloadAt, payloadAt + 1200);
  check("the payload's new keys are exactly sendId and quote, and quote is the gated shared summary",
    /sendId: emailSendState\.sendId,/.test(head) && /quote: emailQuoteGate\(_summaryNow\),/.test(head));
  check("the summary sent is the one recomputed for the stale check (no second computation)",
    /const _summaryNow = \(typeof purchaseSummaryFor === 'function'\) \? purchaseSummaryFor\(currentLang\) : null;/.test(html));
}

console.log(`\nOffers engine check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
