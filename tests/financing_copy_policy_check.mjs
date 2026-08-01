// Financing copy-policy renderer contract — Commit F (Cycle 2).
//
// tools/validation.py refuses RESERVED OR UNREVIEWED financing language in
// strings that render OUTSIDE the exact-terms gate: likely exact/time-sensitive
// markers (rates, duration and currency units, cadences, counts, deferrals),
// plus payment-noun phrasing outside the reviewed neutral allowlist. A hit
// means the wording is reserved or unreviewed — it is not a semantic proof that
// the prose states an exact claim. That classification is only correct while the
// renderer keeps gating what it gates today. This test pins the renderer's
// actual structure by BRACE-MATCHING the gated block — not by measuring
// distance between substrings — so a future edit that moves a field out of the
// gate (silently creating a new bypass the validator does not check) fails here.
//
// Run: node tests/financing_copy_policy_check.mjs

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const cfg = JSON.parse(readFileSync(join(root, "data", "store-config.json"), "utf8"));
const py = readFileSync(join(root, "tools", "validation.py"), "utf8");

let passed = 0, failed = 0;
function check(label, cond) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}`); }
}

// --- extract renderFinancingSheet() by brace matching ---
function blockFrom(src, startIdx) {
  const open = src.indexOf("{", startIdx);
  if (open < 0) return "";
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  return "";
}

const fnIdx = html.indexOf("function renderFinancingSheet()");
check("renderFinancingSheet() located", fnIdx > 0);
const sheet = blockFrom(html, fnIdx);
check("renderFinancingSheet() body extracted", sheet.length > 1000);

// --- the promotional (gated) block ---
const gateIdx = sheet.indexOf("if (fresh && syn.length && syn.every(financingPlanFresh))");
check("promotional exact-terms gate located", gateIdx > 0);
const gated = blockFrom(sheet, gateIdx);
check("gated block extracted", gated.length > 100);

// Everything in the sheet that is NOT inside the gated block is ungated.
const ungated = sheet.slice(0, sheet.indexOf(gated)) + sheet.slice(sheet.indexOf(gated) + gated.length);

// --- fields the validator treats as GATED must live inside the gated block ---
for (const expr of ["L(p.headline)", "L(p.detail)", "L(p.disclosure)"]) {
  check(`promotional ${expr} renders INSIDE the exact-terms gate`, gated.includes(expr));
}

// --- fields the validator treats as UNGATED must NOT be inside it ---
for (const expr of ["L(ih.headline)", "L(mx.headline)", "L(ih.disclosure)", "L(mx.disclosure)"]) {
  check(`${expr} renders OUTSIDE the exact-terms gate (validator guards it)`,
    ungated.includes(expr) && !gated.includes(expr));
}
check("provider renders outside the gate (promotional card title)",
  /var provider = \(syn\[0\] && syn\[0\]\.provider\)/.test(sheet)
  && ungated.includes("provider") && !gated.includes("+ provider"));

// --- per-plan freshness ternaries still gate the exact details ---
check("in-house detail is gated by ihFresh",
  /ihFresh\s*\?[\s\S]{0,120}L\(ih\.detail\)/.test(sheet));
check("scenario detail + representativeExample are gated by mxFresh",
  /mxFresh\s*\?[\s\S]{0,200}L\(mx\.detail\)/.test(sheet)
  && /mxFresh\s*\?[\s\S]{0,400}L\(mx\.representativeExample\)/.test(sheet));

// --- evergreen card is genuinely ungated (validator guards its detail) ---
const moreIdx = sheet.indexOf("var lto = byId['lease-to-own']");
check("evergreen card located", moreIdx > 0);
const evergreen = sheet.slice(moreIdx, sheet.indexOf("// Card 4", moreIdx));
check("evergreen headline+detail render with no freshness gate",
  evergreen.includes("L(p.headline)") && evergreen.includes("L(p.detail)")
  && !/fresh/i.test(evergreen));

// --- handoff chips use non-promotional headlines ungated ---
const chipIdx = html.indexOf("var seenKinds = {};");
const chips = html.slice(chipIdx, chipIdx + 700);
check("handoff chips label non-promotional plans from plan.headline",
  chips.includes("L(p.headline)") && !/fresh/i.test(chips));

// --- validator classification agrees with the renderer's membership test ---
check("validator's gated-plan predicate mirrors the promotional card filter",
  /kind"\) == "open-end-promotional-credit"[\s\S]{0,120}separatePath"\) is not True/.test(py)
  && sheet.includes("p.kind === 'open-end-promotional-credit' && !p.separatePath"));
check("validator guards provider, non-promotional headline/disclosure, evergreen detail",
  /fields = \["provider"\]/.test(py)
  && /fields \+= \["headline", "disclosure"\]/.test(py)
  && /\("lease-to-own", "credit-builder"\)[\s\S]{0,80}append\("detail"\)/.test(py));

// --- every shipped copy key really is an ungated surface ---
const copyKeys = Object.keys(cfg.financing.copy);
const announceKeys = ["interestMarkedAnnounce", "interestNotNowAnnounce", "interestClearedAnnounce"];
const missing = copyKeys.filter(k => !html.includes(`FC('${k}')`) && !announceKeys.includes(k));
check(`every financing.copy key has a runtime consumer (unconsumed: ${JSON.stringify(missing)})`,
  missing.length === 0);
check("no financing.copy key is read inside the exact-terms gate",
  !copyKeys.some(k => k !== "staleNotice" && gated.includes(`FC('${k}')`)));

// --- shipped data is clean under the guard (mirrors the python rule) ---
const SIGNALS = [
  /\d/, /%/, /[$€£]|\bUSD\b|\bMXN\b/i, /\bAPR\b/i,
  /\bno interest\b|\binterest[-\s]free\b|\bzero interest\b|\bdeferred interest\b|\bsin\s+inter[eé]s(?:es)?\b|\bcero\s+inter[eé]s(?:es)?\b/i,
  /\bper month\b|\ba month\b|\bmonthly payments?\b|\bequal payments?\b|\bal mes\b|\bpor mes\b|\bpagos?\s+mensual(?:es)?\b|\bmensualidades\b/i,
];
const dirty = (s) => SIGNALS.some(rx => rx.test(s || ""));
const offenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (dirty(v[lang])) offenders.push(`copy.${k}.${lang}`);
}
for (const p of cfg.financing.plans) {
  const gatedPlan = p.kind === "open-end-promotional-credit" && p.separatePath !== true;
  const fields = ["provider"].concat(gatedPlan ? [] : ["headline", "disclosure"])
    .concat(["lease-to-own", "credit-builder"].includes(p.kind) ? ["detail"] : []);
  for (const f of fields) {
    const v = p[f];
    if (typeof v === "string") { if (dirty(v)) offenders.push(`${p.id}.${f}`); }
    else if (v) for (const lang of ["en", "es"]) if (dirty(v[lang])) offenders.push(`${p.id}.${f}.${lang}`);
  }
}
check(`shipped ungated financing copy trips no guarded signal (offenders: ${JSON.stringify(offenders)})`,
  offenders.length === 0);

// ---------------------------------------------------------------------------
// separatePath: BEHAVIOURAL equivalence, not source similarity.
// The REAL predicate is extracted from index.html and executed over every
// field shape; Python's classification is modelled from its documented rule
// (`separatePath is not True`).
//   * {absent,false,true} is the only SCHEMA-LEGAL domain, and the predicates
//     agree throughout it — that is the guarantee the boolean contract buys.
//   * Some ILLEGAL values (null, "", 0) also agree, accidentally. Agreement is
//     therefore not exclusive to the legal domain, and claiming otherwise
//     would be false.
//   * The truthy non-booleans ("false","true",1,1.0,[],{}) are the dangerous
//     divergent subset.
//   * All non-booleans are rejected by schema regardless of whether they
//     diverge.
// ---------------------------------------------------------------------------
const predSrc = (sheet.match(/plans\.filter\(function\(p\)\s*\{\s*return ([^;]+);/) || [])[1];
check("promotional filter predicate extracted from the renderer", !!predSrc);
const inSyn = new Function("p", `return (${predSrc});`);

// Two SEPARATE concepts, deliberately not conflated:
//   (1) every present non-boolean is a schema error;
//   (2) only the TRUTHY non-booleans actually diverge. null, "" and 0 agree in
//       both languages and are rejected purely as schema violations. Claiming
//       "any other value is truthy in the browser" would be false.
const LEGAL = [["absent", undefined], ["false", false], ["true", true]];
const TRUTHY_DIVERGENT = [['"false"', "false"], ['"true"', "true"], ["1", 1],
                          ["1.0", 1.0], ["[]", []], ["{}", {}]];
const FALSY_AGREEING = [["null", null], ['""', ""], ["0", 0]];
const pyGated = (v) => !(v === true);        // python: `separatePath is not True`
const jsInSyn = (v) => {
  const p = { kind: "open-end-promotional-credit" };
  if (v !== undefined) p.separatePath = v;
  return inSyn(p) === true;
};
for (const [label, v] of LEGAL) {
  check(`legal shape ${label}: renderer and validator agree exactly`, jsInSyn(v) === pyGated(v));
}
for (const [label, v] of TRUTHY_DIVERGENT) {
  check(`${label} genuinely diverges (JS drops it from the promo group, Python calls it gated)`,
    jsInSyn(v) === false && pyGated(v) === true);
}
for (const [label, v] of FALSY_AGREEING) {
  check(`${label} does NOT diverge — rejected as a schema violation, not a divergence`,
    jsInSyn(v) === true && pyGated(v) === true);
}
check("validation.py requires separatePath to be a JSON boolean",
  /"separatePath" in plan and not isinstance\(plan\.get\("separatePath"\), bool\)/.test(py)
  && /must be a JSON \s*"?\s*\n?\s*f?"?boolean/.test(py.replace(/\s+/g, " ")));

// ---------------------------------------------------------------------------
// The four hardcoded id consumers, and the validator's temporary role table.
// ---------------------------------------------------------------------------
const ROLE_CARDS = {
  "lacks-in-house": ["headline", "disclosure"],
  "lease-to-own": ["headline", "detail", "disclosure"],
  "build-my-credit": ["headline", "detail", "disclosure"],
  "mexico-in-house": ["headline", "disclosure"],
};
for (const id of Object.keys(ROLE_CARDS)) {
  check(`renderer still fetches '${id}' by hardcoded id`, sheet.includes(`byId['${id}']`));
  check(`validator's temporary role table covers '${id}'`, new RegExp(`"${id}":\\s*\\{`).test(py));
}
// Anchored to the function body, so removing the id-driven branch fails here
// even though the string `role = ` also occurs as a substring of `_role = `.
const ungatedFnBody = (py.match(/def _ungated_plan_fields\(plan: dict\) -> tuple:[\s\S]*?\n    return tuple\(fields\)/) || [""])[0];
check("_ungated_plan_fields body extracted", ungatedFnBody.length > 200);
check("validator classifies role ids by id, not by mutated kind",
  /_RENDERER_ROLE_IDS\.get\(plan\.get\("id"\)\)/.test(ungatedFnBody)
  && /return \("provider",\) \+ role\["ungated"\]/.test(ungatedFnBody));
check("role ids are excluded from the gated-offer predicate",
  /if plan\.get\("id"\) in _RENDERER_ROLE_IDS:\s*\n\s*return False/.test(py));
check("validator pins each role id's expected kind and separatePath",
  /hardcoded card that assumes kind/.test(py) && /assumes separatePath/.test(py));

// Each role card's ungated field set must match what the renderer displays
// outside its freshness gate.
check("in-house card: headline+disclosure ungated, detail gated",
  ungated.includes("L(ih.headline)") && ungated.includes("L(ih.disclosure)")
  && /ihFresh\s*\?[\s\S]{0,120}L\(ih\.detail\)/.test(sheet));
check("Mexico card: headline+disclosure ungated, detail+example gated",
  ungated.includes("L(mx.headline)") && ungated.includes("L(mx.disclosure)")
  && /mxFresh\s*\?[\s\S]{0,400}L\(mx\.representativeExample\)/.test(sheet));
check("evergreen card: headline+detail ungated (no freshness variable at all)",
  evergreen.includes("L(p.headline)") && evergreen.includes("L(p.detail)")
  && !/fresh/i.test(evergreen));
check("promotional card: headline+detail+disclosure all inside the gate",
  ["L(p.headline)", "L(p.detail)", "L(p.disclosure)"].every(e => gated.includes(e)));

// ---------------------------------------------------------------------------
// Written-out (digit-free) exact claims must be caught by the shared signals.
// ---------------------------------------------------------------------------
const UNIT_SIGNALS = [
  /\bmonths?\b|\bmonthly\b|\bweeks?\b|\bweekly\b|\byears?\b|\byearly\b|\bannual(?:ly)?\b|\bmes\b|\bmeses\b|\bmensual(?:es|mente)?\b|\bsemanas?\b|\bsemanal(?:es)?\b|\ba[ñn]os?\b|\banual(?:es|mente)?\b/i,
  /\bpercent(?:age)?\b|\bpor\s+ciento\b|\bporcentaje\b/i,
  /\bdollars?\b|\bd[oó]lar(?:es)?\b|\bpesos?\b|\beuros?\b/i,
  /\binstallments?\b|\bmensualidades?\b|\bcuotas?\b|\babonos?\b/i,
];
const unitDirty = (s) => UNIT_SIGNALS.some(rx => rx.test(s || ""));
for (const s of ["Choose twelve months for repayment.", "Elige doce meses para pagar.",
                 "Only nine percent interest.", "Solo nueve por ciento.",
                 "Just fifty dollars down.", "Solo cincuenta pesos.",
                 "Pay in twelve installments.", "Make one payment every week."]) {
  check(`written-out claim detected: ${s.slice(0, 34)}`, unitDirty(s));
}
for (const s of ["Exact rates and terms are not shown right now.",
                 "Las tasas y los plazos exactos no se muestran en este momento.",
                 "Current payment options are available from your Lacks specialist.",
                 "Todas las opciones de pago están sujetas a términos y aprobación."]) {
  check(`generic phrasing stays clean: ${s.slice(0, 34)}`, !unitDirty(s));
}
check("validation.py carries the same unit signals",
  /duration-unit/.test(py) && /percent-word/.test(py)
  && /currency-unit/.test(py) && /installment-count/.test(py));
check("validation.py carries the count/down-payment/deferral/proportion signals",
  /repetition-count/.test(py) && /down-payment/.test(py)
  && /deferral/.test(py) && /proportion/.test(py));

// The payment noun is STRUCTURAL: default-deny with a neutral-collocation
// allowlist, because "payment"/"pago" is legitimate shipped vocabulary.
check("validation.py handles the payment noun structurally, not by a plain ban",
  /_NEUTRAL_PAYMENT_PHRASES/.test(py) && /def _bare_payment_noun/.test(py)
  && /_PAYMENT_NOUN\.search\(_NEUTRAL_PAYMENT_PHRASES\.sub/.test(py));
const NEUTRAL_PAY = /\bpayment\s+(?:options?|choices?|methods?)\b|\b(?:opciones?|formas?|m[eé]todos?|maneras?)\s+de\s+pago\b/gi;
const PAY_NOUN = /\bpayments?\b|\bpagos?\b/i;
const barePayment = (s) => PAY_NOUN.test((s || "").replace(NEUTRAL_PAY, " "));
for (const s of ["Make twelve payments.", "Haz doce pagos.", "Repay in twelve payments.",
                 "Only one payment required.", "Un solo pago requerido."]) {
  check(`ordinary-word payment count detected: ${s}`, barePayment(s));
}
for (const s of ["Explore payment options", "Explorar opciones de pago",
                 "Your Sleep Plan. Your Payment Choices.", "never on payment method.",
                 "nunca en la forma de pago.", "Lacks Payment Choice offers more than one way."]) {
  check(`neutral payment concept stays legal: ${s.slice(0, 38)}`, !barePayment(s));
}
// Shipped ungated copy must survive the payment-noun rule untouched.
const payOffenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (barePayment(v[lang])) payOffenders.push(`copy.${k}.${lang}`);
}
check(`shipped ungated copy has no bare payment noun (offenders: ${JSON.stringify(payOffenders)})`,
  payOffenders.length === 0);

// ---------------------------------------------------------------------------
// HONESTY PINS. Every description in validation.py must match the behaviour.
// These fail if a future edit restores a claim that was previously false.
// ---------------------------------------------------------------------------
check("validation.py documents the limits of lexical validation",
  /CANNOT prove the absence/.test(py) && /not\s*\n?#?\s*as a proof/.test(py.replace(/\s+/g, " ")));
check("validation.py no longer claims the unit ban 'closes the whole class'",
  !/closes the whole class/.test(py));
check("validation.py does not claim the detector is purely value-oriented",
  !/VALUE-oriented/i.test(py) && !/topic-oriented/i.test(py));
check("validation.py does not claim bare 'months' remains allowed",
  !/"months" on its own/.test(py) && !/never on generic words/i.test(py));
check("validation.py states the conservative marker-oriented posture instead",
  /MARKER-oriented/.test(py) && /rejected with no\s*\n?#?\s*numeric value/.test(py.replace(/\s+/g, " ")));
check("validation.py does not claim every non-allowlisted payment noun states an actual payment",
  !/Any other use states something about actual payments/.test(py)
  && /DEFAULT-DENY against a REVIEWED ALLOWLIST/.test(py)
  && /NOT because the\s*\n?#?\s*prose has been shown to contain an exact claim/.test(py.replace(/\s+/g, " ")));
// Python f-strings split messages across adjacent literals, so normalise the
// concatenation before searching — otherwise a claim written as
// `"...the only values on " f"which..."` would slip past a naive regex.
const pyFlat = py.replace(/["']\s*\n\s*f?["']/g, "").replace(/\s+/g, " ");
check("validation.py does not claim every illegal separatePath shape diverges",
  !/any other value is truthy in the browser/.test(pyFlat)
  && !/the only values on which/.test(pyFlat)
  && /Others do NOT diverge/.test(py)
  && /Some illegal shapes happen to agree too/.test(pyFlat));
// The user-facing error must not misdiagnose a default-deny rejection as a
// proven exact claim — the payment-noun signal fires on benign wording too.
check("_check_ungated_text does not report every rejection as a proven exact claim",
  !/but states an exact claim/.test(pyFlat)
  && /uses reserved or unreviewed financing language/.test(pyFlat)
  && /does not by itself establish that this text states an exact claim/.test(pyFlat));
check("_check_ungated_text offers both remedies to the editor",
  /reword it using reviewed generic orientation language/.test(pyFlat)
  && /move genuine verified terms into a freshness-gated plan field/.test(pyFlat));
check("_check_ungated_text docstring distinguishes the two hit categories",
  /It does NOT by itself prove/.test(pyFlat)
  && /payment-noun phrase outside the reviewed neutral allowlist/.test(pyFlat));
check("the stable error substring survives the rewording",
  /renders outside the exact-terms gate/.test(pyFlat)
  && /_UNGATED_ERR = "renders outside the exact-terms gate"/.test(py));
// Behavioural counterparts — the pins above describe what these prove.
const barePaymentBenign = ["Payment information is available in store.",
                           "Ask your specialist about payment.",
                           "Choose a payment program."];
for (const s of barePaymentBenign) {
  check(`default-deny rejects benign-but-unreviewed wording (documented false positive): ${s.slice(0, 40)}`,
    barePayment(s));
}
check("bare 'months' with no numeral is rejected (posture claim is behaviourally true)",
  /\bmonths?\b/i.test("Choose the right months"));
const shippedUnitOffenders = [];
for (const [k, v] of Object.entries(cfg.financing.copy)) {
  for (const lang of ["en", "es"]) if (unitDirty(v[lang])) shippedUnitOffenders.push(`copy.${k}.${lang}`);
}
for (const p of cfg.financing.plans) {
  for (const f of (ROLE_CARDS[p.id] || []).concat(["provider"])) {
    const v = p[f];
    if (typeof v === "string") { if (unitDirty(v)) shippedUnitOffenders.push(`${p.id}.${f}`); }
    else if (v) for (const lang of ["en", "es"]) if (unitDirty(v[lang])) shippedUnitOffenders.push(`${p.id}.${f}.${lang}`);
  }
}
check(`shipped ungated copy trips no unit marker (offenders: ${JSON.stringify(shippedUnitOffenders)})`,
  shippedUnitOffenders.length === 0);

console.log(`\nFinancing copy policy check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
