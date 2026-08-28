#!/usr/bin/env python3
"""Pricing validation totality check (Phase 2.1).

validate_pricing() is a BUILD GATE: the converter refuses to publish a bundle
when it reports errors. That only works if it always produces a verdict. For
every value python's json.loads can produce, anywhere in the pricing subtree —
and for every hostile value of the validator's own keyword arguments — this
must hold:

  1. no exception escapes;
  2. a ValidationReport is returned;
  3. malformed input produces at least one error naming the offending field;
  4. no diagnostic is unbounded (a 5,000-digit amount must not become the message);
  5. the caller's config object is not mutated.

The BASE document is the populated, non-shipping fixture under its injected
clock, so every probe starts from a document the validator ADMITS — a probe
that produces an error is therefore attributable to the probe.

Run: python tests/pricing_totality_check.py     (exit 0 = all pass)
"""
import io
import json
import os
import re
import sys
import traceback
from datetime import datetime

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402

passed = failed = 0
MAX_ERROR_CHARS = 900
LONG_DIGIT_RUN = re.compile(r"\d{200,}")
HUGE = 10 ** 5000
NAN, INF, NINF = float("nan"), float("inf"), float("-inf")

JSON_VALUES = [
    ("null", None), ("true", True), ("false", False),
    ("zero", 0), ("negative", -1), ("float", 1.5), ("huge int", HUGE),
    ("NaN", NAN), ("Infinity", INF), ("-Infinity", NINF),
    ("empty string", ""), ("string", "bad"), ("huge string", "x" * 20000),
    ("empty array", []), ("array", ["x"]), ("nested array", [[["deep"]]]),
    ("empty object", {}), ("object", {"a": 1}),
    ("nested object", {"a": {"b": {"c": 1}}}),
]


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" — {detail}" if detail else ""))
    return cond


def load(rel):
    with io.open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return json.load(f)


FX = load("tests/fixtures/pricing_populated_fixture.json")
CLOCK = datetime.fromisoformat(FX["_meta"]["clock"])
HOSTS = load("tools/source_hosts.json")["priceSourceHosts"]
MIDS = {m["id"] for tier in load("data/mattresses.json").values() for m in tier}
AIDS = {a["id"] for a in load("data/accessories.json")}
BASE = {"pricing": FX["pricing"],
        "financing": load("data/store-config.json").get("financing")}
KW = dict(allowed_source_hosts=HOSTS, mattress_ids=MIDS, accessory_ids=AIDS, now=CLOCK)


def _fingerprint(o):
    if isinstance(o, dict):
        return {k: _fingerprint(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_fingerprint(v) for v in o]
    if isinstance(o, int) and not isinstance(o, bool) and o.bit_length() > 128:
        return f"<int:{o.bit_length()} bits>"
    if isinstance(o, float) and (o != o or o in (INF, NINF)):
        return f"<float:{o!r}>"
    if isinstance(o, str) and len(o) > 4000:
        return f"<str:{len(o)}>"
    return o


def stable(obj):
    return json.dumps(_fingerprint(obj), sort_keys=True, allow_nan=True, default=repr)


def probe(label, config, expect_field=None, **kw_over):
    kw = dict(KW)
    kw.update(kw_over)
    try:
        before = stable(config)
    except BaseException as exc:                                  # noqa: BLE001
        check(f"{label}: harness prepared the case", False, f"{type(exc).__name__}")
        return None
    try:
        rep = validation.validate_pricing(config, **kw)
    except BaseException as exc:                                  # noqa: BLE001
        frames = [f for f in traceback.extract_tb(exc.__traceback__)
                  if "validation.py" in (f.filename or "")]
        site = f" at validation.py:{frames[-1].lineno}" if frames else ""
        check(f"{label}: returns a report (no exception)", False,
              f"{type(exc).__name__}: {str(exc)[:70]}{site}")
        return None
    ok = check(f"{label}: returns a ValidationReport",
               isinstance(rep, validation.ValidationReport))
    try:
        longest = max((len(e) for e in rep.errors + rep.warnings), default=0)
    except BaseException as exc:                                  # noqa: BLE001
        check(f"{label}: diagnostics are readable strings", False, f"{type(exc).__name__}")
        return rep
    ok &= check(f"{label}: diagnostics bounded", longest <= MAX_ERROR_CHARS, f"longest={longest}")
    ok &= check(f"{label}: no huge value embedded in a diagnostic",
                not any(LONG_DIGIT_RUN.search(e) for e in rep.errors + rep.warnings))
    ok &= check(f"{label}: input not mutated", stable(config) == before)
    if expect_field is not None:
        ok &= check(f"{label}: names the offending field {expect_field!r}",
                    any(expect_field in e for e in rep.errors),
                    "; ".join(e[:70] for e in rep.errors[:2]) or "(no errors)")
    return rep


def cfg_with(path, value):
    doc = json.loads(json.dumps(BASE))
    if not path:
        return value
    node = doc
    for key in path[:-1]:
        node = node[key]
    node[path[-1]] = value
    return doc


def main():
    print("Valid-input verdicts are preserved:")
    rep = validation.validate_pricing(json.loads(json.dumps(BASE)), **KW)
    check("the populated fixture validates clean under its clock", rep.ok and not rep.warnings,
          "; ".join(rep.errors[:2] + rep.warnings[:2]))
    check("absent pricing is a no-op", validation.validate_pricing({}, **KW).ok)
    check("null pricing is a no-op", validation.validate_pricing({"pricing": None}, **KW).ok)

    print("Top-level and block shapes:")
    for lbl, val in JSON_VALUES:
        probe(f"config = {lbl}", cfg_with((), val),
              None if isinstance(val, dict) else "config must be an object")
    for lbl, val in JSON_VALUES:
        expect = None if val is None else ("pricing" if not isinstance(val, dict) else "pricing")
        probe(f"pricing = {lbl}", cfg_with(("pricing",), val), expect)
    for field in sorted(validation.PRICING_KEYS):
        for lbl, val in JSON_VALUES:
            probe(f"pricing.{field} = {lbl}", cfg_with(("pricing", field), val))

    print("Nested objects and their leaves:")
    for block, keys in (("authority", validation.PRICING_AUTHORITY_KEYS),
                        ("mapClearance", validation.PRICING_MAP_KEYS),
                        ("surfaces", validation.PRICING_SURFACES),
                        ("purchaseAssessment", validation.PRICING_ASSESSMENT_KEYS)):
        for field in sorted(keys):
            for lbl, val in JSON_VALUES:
                probe(f"pricing.{block}.{field} = {lbl}", cfg_with(("pricing", block, field), val))
    for lbl, val in JSON_VALUES:
        probe(f"allowedSourceHosts[0] = {lbl}",
              cfg_with(("pricing", "allowedSourceHosts"), [val]),
              None if isinstance(val, str) and val.strip() else "allowedSourceHosts")
        probe(f"sizes[0] = {lbl}", cfg_with(("pricing", "sizes"), [val]), "pricing.sizes")

    print("products and their leaves:")
    for lbl, val in JSON_VALUES:
        probe(f"products[0] = {lbl}", cfg_with(("pricing", "products"), [val]),
              None if isinstance(val, dict) else "pricing.products[0]")
    for field in sorted(validation.PRICING_PRODUCT_KEYS):
        for lbl, val in JSON_VALUES:
            probe(f"products[0].{field} = {lbl}", cfg_with(("pricing", "products", 0, field), val))
    for block, keys in (("price", validation.PRICING_PRICE_KEYS),
                        ("evidence", validation.PRICING_EVIDENCE_KEYS),
                        ("window", validation.PRICING_WINDOW_KEYS)):
        for field in sorted(keys):
            for lbl, val in JSON_VALUES:
                probe(f"products[0].{block}.{field} = {lbl}",
                      cfg_with(("pricing", "products", 0, block, field), val))

    print("formulas and their leaves:")
    for lbl, val in JSON_VALUES:
        probe(f"formulas[0] = {lbl}", cfg_with(("pricing", "formulas"), [val]),
              None if isinstance(val, dict) else "pricing.formulas[0]")
    for field in sorted(validation.PRICING_FORMULA_KEYS):
        for lbl, val in JSON_VALUES:
            probe(f"formulas[0].{field} = {lbl}", cfg_with(("pricing", "formulas", 0, field), val))
    for lbl, val in JSON_VALUES:
        probe(f"formulas[0].inputs[0] = {lbl}", cfg_with(("pricing", "formulas", 0, "inputs"), [val]))

    print("Named regressions - the shapes most likely to raise:")
    NAMED = [
        ("amountMinor = huge int", ("pricing", "products", 0, "price", "amountMinor"), HUGE, "amountMinor"),
        ("amountMinor = NaN", ("pricing", "products", 0, "price", "amountMinor"), NAN, "amountMinor"),
        ("amountMinor = true", ("pricing", "products", 0, "price", "amountMinor"), True, "amountMinor"),
        ("maxAgeDays = true", ("pricing", "maxAgeDays"), True, "maxAgeDays"),
        ("maxAgeDays = huge int", ("pricing", "maxAgeDays"), HUGE, "maxAgeDays"),
        ("verifiedAt = huge int", ("pricing", "products", 0, "evidence", "verifiedAt"), HUGE, "verifiedAt"),
        ("verifiedAt = huge string", ("pricing", "products", 0, "evidence", "verifiedAt"), "9" * 20000, "verifiedAt"),
        ("sku = huge int", ("pricing", "products", 0, "sku"), HUGE, "sku"),
        ("sku = huge string", ("pricing", "products", 0, "sku"), "s" * 20000, "sku"),
        ("size = huge int", ("pricing", "products", 0, "size"), HUGE, "size"),
        ("sourceUrl = huge string", ("pricing", "products", 0, "evidence", "sourceUrl"),
         "https://www.lacks.com/" + "p" * 20000, None),
        ("sourceUrl = credentials", ("pricing", "products", 0, "evidence", "sourceUrl"),
         "https://user:pw@www.lacks.com/p", "sourceUrl"),
        ("lone surrogate in sku", ("pricing", "products", 0, "sku"), "a\ud800b", "sku"),
        ("lone surrogate in a key", ("pricing", "products", 0), {"a\ud800b": 1}, "products[0]"),
        ("transactionAmountMinor = huge int", ("pricing", "purchaseAssessment"),
         {"basis": "transaction-amount", "transactionAmountMinor": HUGE}, "transactionAmountMinor"),
        ("inputs = huge list", ("pricing", "formulas", 0, "inputs"), ["x"] * 5000, "inputs"),
        ("financing = string (formula cross-check source)", ("financing",), "bad", "names no financing plan"),
        ("financing.plans = [5]", ("financing",), {"plans": [5]}, "names no financing plan"),
    ]
    for lbl, path, val, expect in NAMED:
        probe(lbl, cfg_with(path, val), expect)

    print("The keyword arguments are hostile too:")
    for lbl, val in JSON_VALUES + [("list with non-string entries", [5, None, []]),
                                   ("mixed list", ["lacks.com", 7])]:
        probe(f"allowed_source_hosts = {lbl}", json.loads(json.dumps(BASE)),
              allowed_source_hosts=val)
        probe(f"mattress_ids = {lbl}", json.loads(json.dumps(BASE)), mattress_ids=val)
        probe(f"accessory_ids = {lbl}", json.loads(json.dumps(BASE)), accessory_ids=val)
        probe(f"now = {lbl}", json.loads(json.dumps(BASE)), now=val)
    check("a malformed canonical allowlist fails CLOSED",
          any("canonical price source-host allowlist" in e
              for e in validation.validate_pricing(json.loads(json.dumps(BASE)),
                                                   **dict(KW, allowed_source_hosts=5)).errors))
    check("a malformed canonical allowlist is reported",
          any("allowed_source_hosts" in e
              for e in validation.validate_pricing(json.loads(json.dumps(BASE)),
                                                   **dict(KW, allowed_source_hosts=5)).errors))
    check("a naive datetime clock is ignored, never raises",
          isinstance(validation.validate_pricing(json.loads(json.dumps(BASE)),
                                                 **dict(KW, now=datetime(2030, 1, 1))),
                     validation.ValidationReport))

    print(f"\nPricing totality check: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
