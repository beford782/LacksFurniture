#!/usr/bin/env python3
"""Phase 2.1 pricing contract check — shipped-state lock + real-pipeline traversal.

Owns the DARK framework's production/test separation:

  * the committed production pricing configuration is EXACTLY the dark
    contract: enabled false, displayEnabled false, every surface false,
    products [] and formulas [] — at every layer (canonical source, workbook
    Pricing tab envelope, generated store-config, generated demo bundle) with
    ZERO transforms between canonical source and shipped config;
  * no numeric price ships: no amountMinor / transactionAmountMinor / payment
    figure of any kind exists in any production artifact;
  * the Daybreak Promotions envelope is untouched (still exactly
    {promotions, financing}) — pricing rides its OWN tab;
  * the price-specific canonical allowlist exists, is narrow, and the shipped
    runtime allowlist does not widen it;
  * a POPULATED, NON-SHIPPING fixture (tests/fixtures/pricing_populated_fixture
    .json) traverses the real pipeline in a temp workbook — canonical envelope
    -> Pricing tab -> converter build_pricing -> build_store_config ->
    validate_pricing under an INJECTED clock — and is admitted; then five
    single-field corruptions of the same document are each REFUSED, so the
    admission is not vacuous. (The JS resolver leg joins this traversal in
    Phase 2.1b; there is no runtime pricing code in 2.1a.)
  * the fixture's placeholder text never appears in a shipping artifact;
  * every mutation-sweep find string this slice adds matches its target
    EXACTLY ONCE (the sweep itself does not check uniqueness).

This lock is a PRE-ACTIVATION lock, permanent until Phase 2.2: relaxing the
displayEnabled / surfaces assertions is the 2.2 activation change and arrives
only with Blake's plus written business/legal approval recorded on the item.
Populating products/formulas is NOT a lock relaxation — it is the ordinary
governed path (validate_pricing admits or refuses it) — but the assertions
that products and formulas are [] below must then be re-pinned to the
approved content in the same reviewed diff.

Run: python tests/pricing_contract_check.py
"""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402
import workbook_schema as schema  # noqa: E402
import convert_store_data as converter  # noqa: E402

import openpyxl  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" - {detail}" if detail else ""))


def _read(path):
    with io.open(os.path.join(REPO, path), encoding="utf-8", newline="") as f:
        return f.read()


def _load(path):
    return json.loads(_read(path))


def _lf(text):
    return text.replace("\r\n", "\n")


SIZES = ["twin", "twin_xl", "full", "queen", "king", "cal_king"]
DARK = {
    "schemaVersion": 1,
    "enabled": False,
    "displayEnabled": False,
    "currency": "USD",
    "authority": {"owner": "", "role": ""},
    "mapClearance": {"status": "not-cleared", "clearedBy": "", "clearedAt": None},
    "esReviewStatus": "pending-native-legal-review",
    "maxAgeDays": 7,
    "allowedSourceHosts": ["lacks.com", "www.lacks.com"],
    "sizes": SIZES,
    "surfaces": {"drawer": False, "sleepSystem": False, "results": False,
                 "handoff": False, "sleepPlan": False},
    "purchaseAssessment": {"basis": "unknown"},
    "products": [],
    "formulas": [],
}
# Strings that would betray a shipped price or payment figure. Deliberately
# the FIELD names the contract itself uses, so a populated products[] cannot
# slip into production by accident.
NO_SHIP_STRINGS = ('"amountMinor"', '"transactionAmountMinor"', '"monthlyPayment"',
                   '"perMonth"', '"estimatedPayment"', '"publishedPaymentFactor"',
                   "FIXTURE")

# ---- production artifacts ---------------------------------------------------
print("Production shipped-state lock (dark until Phase 2.2):")
src = _load("incoming/lacks_pricing.json")
check("canonical pricing source is exactly the dark contract",
      src.get("pricing") == DARK,
      json.dumps(src.get("pricing"))[:200])
check("canonical pricing source carries _meta documentation (never shipped)",
      isinstance(src.get("_meta"), dict) and set(src) == {"_meta", "pricing"})

cfg = _load("data/store-config.json")
check("generated store-config pricing is exactly the dark contract",
      cfg.get("pricing") == DARK)
check("generated store-config pricing deep-equals the canonical source (zero transforms)",
      cfg.get("pricing") == src.get("pricing"))
check("pricing sits after financing in the shipped key order",
      list(cfg).index("pricing") == list(cfg).index("financing") + 1)
raw_cfg = _read("data/store-config.json")
for s in NO_SHIP_STRINGS:
    check(f"no shipped price/payment figure: {s!r} absent from store-config", s not in raw_cfg)
check("shipped pricing products and formulas are empty",
      cfg.get("pricing", {}).get("products") == [] and cfg.get("pricing", {}).get("formulas") == [])
check("shipped pricing is disabled AND display-disabled AND every surface off",
      cfg.get("pricing", {}).get("enabled") is False
      and cfg.get("pricing", {}).get("displayEnabled") is False
      and all(v is False for v in cfg.get("pricing", {}).get("surfaces", {}).values())
      and set(cfg.get("pricing", {}).get("surfaces", {})) == validation.PRICING_SURFACES)

# The workbook: its own tab, chunked envelope, Daybreak envelope untouched.
wb = openpyxl.load_workbook(os.path.join(REPO, "incoming", "Lacks_Store_Data.xlsx"))
check("workbook carries the Pricing tab as the last schema tab",
      wb.sheetnames == schema.get_tab_names() and wb.sheetnames[-1] == "Pricing")
ws = wb["Pricing"]
payload = "".join(str(row[0].value or "") for row in ws.iter_rows(min_row=2))
envelope = json.loads(payload)
check("workbook Pricing envelope is exactly {pricing}", set(envelope) == {"pricing"})
check("workbook Pricing slot deep-equals the canonical source", envelope.get("pricing") == DARK)
check("_meta is not propagated into the Pricing envelope", "_meta" not in payload)
for s in NO_SHIP_STRINGS:
    check(f"no shipped price/payment figure: {s!r} absent from the workbook envelope", s not in payload)
pws = wb["Promotions"]
ppayload = "".join(str(row[0].value or "") for row in pws.iter_rows(min_row=2))
check("Daybreak Promotions envelope still carries exactly promotions and financing",
      set(json.loads(ppayload)) == {"promotions", "financing"})
check("pricing never entered the Promotions envelope", '"pricing"' not in ppayload)

# The demo bundle derives from production config and must carry the same dark block.
demo_cfg = _load("demo/black-friday/data/store-config.json")
check("demo bundle pricing deep-equals production pricing", demo_cfg.get("pricing") == DARK)

# The canonical allowlist: price-specific, narrow, and the shipped list does not widen it.
hosts = validation.load_source_hosts()
price_hosts = hosts.get("priceSourceHosts")
check("tools/source_hosts.json declares priceSourceHosts",
      isinstance(price_hosts, list) and price_hosts == ["lacks.com", "www.lacks.com"])
check("price allowlist admits no lender, archive or image-CDN host",
      not any(h for h in price_hosts if "synchrony" in h or "archive" in h or "linqcdn" in h))
check("shipped pricing.allowedSourceHosts does not widen the canonical list",
      all(any(h == c or h.endswith("." + c) for c in price_hosts)
          for h in cfg["pricing"]["allowedSourceHosts"]))

# The shipped contract validates clean under the real clock and an injected one.
mattress_ids = {m["id"] for tier in _load("data/mattresses.json").values() for m in tier}
accessory_ids = {a["id"] for a in _load("data/accessories.json")}
rep = validation.validate_pricing(cfg, allowed_source_hosts=price_hosts,
                                  mattress_ids=mattress_ids, accessory_ids=accessory_ids)
check("shipped pricing validates clean under the real clock (no errors, no warnings)",
      rep.ok and not rep.warnings, "; ".join(rep.errors[:2] + rep.warnings[:2]))

# ---- the operating-state lock names the switch --------------------------------
ci = _lf(_read(".github/workflows/ci.yml"))
check("CI operating-state lock names pricing.displayEnabled",
      "pricing ships dark" in ci and "displayEnabled" in ci)
check("CI runs this suite and the pricing totality suite",
      "tests/pricing_contract_check.py" in ci and "tests/pricing_totality_check.py" in ci)
check("CI protects the canonical pricing source",
      "incoming/lacks_pricing.json" in ci)

# ---- the populated NON-SHIPPING fixture traverses the real pipeline ------------
print("Populated fixture traversal (temp workbook, injected clock):")
fx = _load("tests/fixtures/pricing_populated_fixture.json")
CLOCK = datetime.fromisoformat(fx["_meta"]["clock"])
fx_pricing = fx["pricing"]
check("fixture is populated (one product, one formula) and dark for display",
      len(fx_pricing["products"]) == 1 and len(fx_pricing["formulas"]) == 1
      and fx_pricing["displayEnabled"] is False and fx_pricing["enabled"] is True)
for rel in ("data/store-config.json", "incoming/lacks_pricing.json",
            "demo/black-friday/data/store-config.json"):
    check(f"fixture placeholder text never appears in {rel}", "FIXTURE" not in _read(rel))
check("fixture placeholder text never appears in the workbook Pricing envelope",
      "FIXTURE" not in payload)


def _fixture_workbook(dst, pricing_value, chunk=97):
    """Copy the committed workbook and rewrite ONLY its Pricing tab with the
    given envelope, chunked small so reassembly is genuinely exercised."""
    shutil.copyfile(os.path.join(REPO, "incoming", "Lacks_Store_Data.xlsx"), dst)
    w = openpyxl.load_workbook(dst)
    s = w["Pricing"]
    s.delete_rows(2, s.max_row)
    text = json.dumps({"pricing": pricing_value}, ensure_ascii=False,
                      separators=(",", ":"))
    for i in range(0, len(text), chunk):
        s.append([text[i:i + chunk]])
    w.save(dst)
    return len(range(0, len(text), chunk))


tmp = tempfile.mkdtemp(prefix="df-pricing-contract-")
try:
    wb_path = os.path.join(tmp, "fixture.xlsx")
    rows = _fixture_workbook(wb_path, fx_pricing)
    check("fixture envelope was chunked across multiple rows", rows > 3, f"rows={rows}")
    twb = openpyxl.load_workbook(wb_path, read_only=True, data_only=True)
    try:
        rebuilt = converter.build_pricing(twb)
        check("converter build_pricing reassembles the fixture exactly", rebuilt == fx_pricing)
        config = converter.build_store_config(twb)
    finally:
        twb.close()
    check("converter build_store_config carries the fixture as `pricing`",
          config.get("pricing") == fx_pricing)
    check("converter leaves financing/promotions untouched by the Pricing tab",
          config.get("financing") == cfg.get("financing")
          and config.get("promotions") == cfg.get("promotions"))
    kw = dict(allowed_source_hosts=price_hosts, mattress_ids=mattress_ids,
              accessory_ids=accessory_ids)
    rep = validation.validate_pricing(config, now=CLOCK, **kw)
    check("validate_pricing ADMITS the populated fixture under its clock (no errors, no warnings)",
          rep.ok and not rep.warnings, "; ".join(rep.errors[:3] + rep.warnings[:2]))

    # Non-vacuity: five single-field corruptions of the SAME document, each refused.
    def corrupt(path, value):
        doc = json.loads(json.dumps(config))
        node = doc
        for k in path[:-1]:
            node = node[k]
        if value is KeyError:
            del node[path[-1]]
        else:
            node[path[-1]] = value
        return doc

    CASES = [
        ("displayEnabled flipped true", ("pricing", "displayEnabled"), True, "Phase 2.2"),
        ("product size removed (never inferred)", ("pricing", "products", 0, "size"), KeyError,
         "never inferred from another size"),
        ("amountMinor as a float", ("pricing", "products", 0, "price", "amountMinor"), 3699.0,
         "amountMinor"),
        ("evidence status from the promotions ladder",
         ("pricing", "products", 0, "evidence", "status"), "retailer-full-page-archive",
         "evidence.status"),
        ("purchase basis = product price", ("pricing", "purchaseAssessment"),
         {"basis": "product-price"}, "never the qualifying purchase amount"),
    ]
    for label, path, value, needle in CASES:
        bad = validation.validate_pricing(corrupt(path, value), now=CLOCK, **kw)
        check(f"fixture corrupted — {label} -> REFUSED",
              not bad.ok and any(needle in e for e in bad.errors),
              "; ".join(bad.errors[:2]) or "(admitted)")
    stale = validation.validate_pricing(config, now=CLOCK + timedelta(days=30), **kw)
    check("the injected clock is the clock: same fixture 30 days on -> stale, refused",
          not stale.ok and any("older than maxAgeDays" in e for e in stale.errors))

    # The real converter subprocess admits the fixture workbook's SHAPE (its
    # freshness verdict depends on the wall clock, so only the shape is
    # asserted here) and refuses a hostile Pricing payload without a traceback.
    hostile = os.path.join(tmp, "hostile.xlsx")
    _fixture_workbook(hostile, {"products": "bad", "displayEnabled": True})
    proc = subprocess.run([sys.executable, os.path.join(REPO, "tools", "convert_store_data.py"),
                           hostile, "--validate-only"], capture_output=True, text=True, cwd=REPO)
    out = (proc.stdout or "") + (proc.stderr or "")
    check("converter REFUSES a hostile Pricing payload (nonzero exit)", proc.returncode != 0)
    check("converter names the pricing defects, no traceback",
          "pricing" in out and "displayEnabled" in out and "Traceback" not in out,
          out.strip()[-160:])
finally:
    shutil.rmtree(tmp, ignore_errors=True)

# ---- mutation-sweep find strings match exactly once ---------------------------
print("Mutation-sweep find-string uniqueness (the sweep does not check this):")
SWEEP_FINDS = [
    ("tools/validation.py",
     "    if display is True:\n        r.add_error(\"pricing.displayEnabled must be false"),
    ("tools/validation.py",
     "                elif type(size) is not str or size not in size_set:"),
    ("tools/validation.py",
     "        if enabled:\n            r.add_error(msg)\n        else:\n            r.add_warning(msg)"),
    ("tools/validation.py",
     "                if type(amt) is not int or amt <= 0 or amt > PRICING_AMOUNT_MINOR_MAX:\n"
     "                    r.add_error(f\"{tag}.price.amountMinor"),
    ("tools/validation.py",
     "    for k in obj:\n        if k not in allowed:\n            r.add_error(f\"{tag}: key"),
    ("data/store-config.json",
     "    \"enabled\": false,\n    \"displayEnabled\": false,"),
]
for target, find in SWEEP_FINDS:
    n = _lf(_read(target)).count(find)
    check(f"{target}: sweep find string matches exactly once ({find[:48]!r}...)", n == 1, f"count={n}")

print(f"\nPricing contract check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
