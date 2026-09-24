#!/usr/bin/env python3
"""Regression coverage for tools/map_app_to_website.py.

Every case reconstructs a way the mapper could assert an identity it has not
earned:

  * shared words are CANDIDATE DISCOVERY, not proof. Nothing may reach a
    confirmed/verified status on name overlap.
  * an accessory must match on PRODUCT TYPE and BRAND, not on the highest word
    overlap - a protector must never map to a pillow family.
  * two SKUs claiming the same family AND size is a CONFLICT to report, never a
    silent dictionary overwrite that keeps whichever came last.
  * a pillow (and anything else not sold by mattress size) must survive with no
    size, not be filtered out.
  * status names must say WHO decided.

Pure and offline: builds a synthetic repo in a temp dir, runs the real
build(), and reads the real output. No network, and the repository is never
written to.
"""
import copy
import io
import json
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import map_app_to_website as M  # noqa: E402

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" - {detail}" if detail else ""))


CSV_HEADER = ("tier,id,name,brand,subBrand,firmnessScore,firmnessLabel\n")
MATTRESS_ROWS = [
    "gold,g1,Reserve Mayfair Plush,Restonic,Reserve,3,Plush\n",
    "gold,g2,Angelina Extra Firm,Restonic,ComfortCare,8,Extra Firm\n",
]


def variant(**over):
    v = {"kind": "mattress", "family": "Reserve", "brand": "Restonic",
         "name": "Restonic Reserve Mayfair Plush Queen Mattress",
         "size_raw": "Queen", "size_id": "queen", "sku": "111", "entityId": "e1",
         "modelNumber": "M-1", "sellingAmountMinor": 99900, "regularAmountMinor": 129900,
         "currency": "USD", "scope": "mattress-only", "productType": "mattress",
         "familyKey": "reserve mayfair", "exceptions": [],
         "evidence": {"type": "product-page", "url": "https://example.test/p/111"}}
    v.update(over)
    return v


def accessory(**over):
    v = {"kind": "accessory", "family": "Iprotect Mattress Protector",
         "brand": None, "name": "Bedgear Iprotect Queen Mattress Protector",
         "size_raw": "Queen", "size_id": "queen", "sku": "a1", "entityId": "ae1",
         "modelNumber": None, "sellingAmountMinor": 8995, "regularAmountMinor": 8995,
         "currency": "USD", "scope": "accessory-only", "productType": "protector",
         "familyKey": "iprotect mattress protector", "exceptions": [],
         "evidence": {"type": "product-page", "url": "https://example.test/p/a1"}}
    v.update(over)
    return v


def run(variants, accessories_json, mattress_rows=None, verified=None):
    """Build a synthetic repo, run the real build(), return the mapping."""
    tmp = tempfile.mkdtemp(prefix="mapchk_")
    try:
        os.makedirs(os.path.join(tmp, "data"))
        out = os.path.join(tmp, "demo", "price-snapshot")
        os.makedirs(out)
        with io.open(os.path.join(tmp, "data", "mattresses.csv"), "w", encoding="utf-8") as f:
            f.write(CSV_HEADER)
            for r in (mattress_rows if mattress_rows is not None else MATTRESS_ROWS):
                f.write(r)
        with io.open(os.path.join(tmp, "data", "accessories.json"), "w", encoding="utf-8") as f:
            json.dump(accessories_json, f)
        with io.open(os.path.join(out, "snapshot.json"), "w", encoding="utf-8") as f:
            json.dump({"_meta": {"retrievedAtStart": "2026-09-20T00:00:00+00:00"},
                       "variants": variants}, f)
        if verified is not None:
            with io.open(os.path.join(out, "verified-mapping.json"), "w", encoding="utf-8") as f:
                json.dump(verified, f)
        old = (M.REPO, M.OUT_DIR, M.SNAP, M.VERIFIED)
        M.REPO, M.OUT_DIR = tmp, out
        M.SNAP = os.path.join(out, "snapshot.json")
        M.VERIFIED = os.path.join(out, "verified-mapping.json")
        try:
            rc = M.build()
            assert rc == 0, rc
            return json.load(io.open(os.path.join(out, "mapping.json"), encoding="utf-8"))
        finally:
            M.REPO, M.OUT_DIR, M.SNAP, M.VERIFIED = old
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


ACC_PROTECTOR = [{"id": "protector-iprotect", "price": 89,
                  "name": {"en": "Bedgear iProtect Mattress Protector", "es": "x"}}]
ACC_PILLOW = [{"id": "pillow-flow", "price": 108,
               "name": {"en": "Bedgear Flow 2.0 Performance Pillow", "es": "x"}}]

print("Name overlap is discovery, never identity:")
out = run([variant()], ACC_PROTECTOR)
g1 = next(m for m in out["mattresses"] if m["appId"] == "g1")
st = g1["sizes"]["queen"]["status"]
check("a clean single match is PREVIEW-ELIGIBLE, never owner-verified",
      st == "preview-eligible", st)

def all_statuses(doc):
    out = set()
    for m in doc["mattresses"]:
        for d in m["sizes"].values():
            out.add(d["status"])
    for a in doc["accessories"]:
        out.add(a["status"])
    return out


ALLOWED = {"owner-verified", "preview-eligible", "machine-ambiguous",
           "variant-conflict", "unresolved"}
check("every status is one of the five names that say WHO decided",
      all_statuses(out) <= ALLOWED, str(all_statuses(out)))
check("no status claims a confirmation the tool cannot make",
      not any("confirm" in st for st in all_statuses(out)), str(all_statuses(out)))
check("the meta states the app catalog has no SKU and that leads are never prices",
      "no SKU" in out["_meta"]["skuEvidence"]
      and "never reused" in out["_meta"]["skuEvidence"], out["_meta"]["skuEvidence"][:120])
check("the meta separates identity evidence from verification and activation",
      "activation" in out["_meta"]["note"] and "verification" in out["_meta"]["note"])

print("\nEvidence legs reject a wrong product that shares words:")
out = run([variant(name="Restonic Reserve Mayfair FIRM Queen Mattress")], ACC_PROTECTOR)
st = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]["queen"]["status"]
check("a FIRMNESS mismatch is rejected outright (Firm never satisfies Plush)",
      st == "unresolved", st)
out = run([variant(brand="Serta", name="Serta Reserve Mayfair Plush Queen Mattress")], ACC_PROTECTOR)
st = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]["queen"]["status"]
check("a BRAND mismatch is rejected outright", st == "unresolved", st)
out = run([variant(name="Restonic Reserve Mayfair II Plush Queen Mattress")], ACC_PROTECTOR)
d = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]["queen"]
check("a GENERATION marker the app does not carry downgrades, never confirms",
      d["status"] == "machine-ambiguous", d["status"])
out = run([variant(size_id="king")], ACC_PROTECTOR)
d = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]
check("a size with no candidate stays unresolved; another size is never borrowed",
      d["queen"]["status"] == "unresolved" and d["king"]["status"] == "preview-eligible")

print("\nTwo equally good candidates choose nothing:")
out = run([variant(sku="111"), variant(sku="222", entityId="e2")], ACC_PROTECTOR)
d = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]["queen"]
check("two surviving candidates -> machine-ambiguous, both reported, none chosen",
      d["status"] == "machine-ambiguous" and d["candidateCount"] == 2
      and "sku" not in d, d["status"])

print("\nOwner verification is the only confirmation:")
out = run([variant()], ACC_PROTECTOR,
          verified={"g1:queen": {"sku": "999", "sellingAmountMinor": 1,
                                 "name": "owner said so"}})
d = next(m for m in out["mattresses"] if m["appId"] == "g1")["sizes"]["queen"]
check("a verified row is owner-verified and uses the OWNER's sku, not the guess",
      d["status"] == "owner-verified" and d["sku"] == "999", str(d)[:120])
check("verified rows are counted in the meta", out["_meta"]["verifiedRowsLoaded"] == 1)

print("\nAccessories match on TYPE and BRAND, not word count:")
# a pillow family that shares MORE words with the protector's app name than the
# real protector does - word overlap alone would pick it
out = run([variant(),
           accessory(productType="pillow", familyKey="bedgear mattress protector pillow",
                     name="Bedgear Mattress Protector Performance Pillow", sku="wrong")],
          ACC_PROTECTOR)
a = out["accessories"][0]
check("a PILLOW never satisfies a protector, however many words it shares",
      a["status"] == "unresolved", str(a)[:160])
out = run([variant(), accessory(name="Serta Iprotect Queen Mattress Protector", sku="brandx")],
          ACC_PROTECTOR)
a = out["accessories"][0]
check("a different BRAND is rejected even with the model word present",
      a["status"] == "unresolved", str(a)[:160])
out = run([variant(), accessory()], ACC_PROTECTOR)
a = out["accessories"][0]
check("the right type and brand yields preview-eligible (identity evidence, not verification)",
      a["status"] == "preview-eligible" and "queen" in a["variants"], str(a)[:160])
check("the expected product type is recorded for review", a["expectedType"] == "protector")

print("\nTwo SKUs for one family+size is a CONFLICT, not a silent overwrite:")
out = run([variant(),
           accessory(sku="a1", sellingAmountMinor=8995),
           accessory(sku="a2", entityId="ae2", sellingAmountMinor=9995)],
          ACC_PROTECTOR)
a = out["accessories"][0]
check("status is variant-conflict", a["status"] == "variant-conflict", str(a)[:200])
check("both SKUs and both amounts are reported",
      any(set(c["skus"]) == {"a1", "a2"} and set(c["amounts"]) == {8995, 9995}
          for c in a.get("conflicts", [])), str(a.get("conflicts"))[:200])
check("neither price silently wins the size slot",
      "queen" not in (a.get("variants") or {}), str(a.get("variants"))[:120])

print("\nSize-independent accessories survive without a size:")
out = run([variant(), accessory(productType="pillow", size_id=None, size_raw=None,
                                name="Bedgear Flow 2.0 Performance Pillow",
                                familyKey="flow 2.0 performance pillow", sku="p1")],
          ACC_PILLOW)
a = out["accessories"][0]
check("a pillow with NO mattress size is mapped, not filtered out",
      a["status"] == "preview-eligible", str(a)[:160])
check("...and is marked size-independent, with its variant kept under a null size",
      a.get("sizeIndependent") is True and "None" in a["variants"], str(a.get("variants"))[:140])
check("...and its size-independent variant records that fact",
      a["variants"]["None"]["sizeIndependent"] is True)

print("\nHelper-level guarantees:")
check("firmness: 'Firm' does not satisfy 'Extra Firm'",
      M.firmness_of("Extra Firm") == "extra_firm" and M.firmness_of("Firm") == "firm")
check("generation: II is detected, a 12.5\" dimension is not mistaken for one",
      M.generation_of('Grace II 11.5" Medium') == {"ii"}
      and M.generation_of('Grace 11.5" Medium') == set())
check("model tokens drop brand and firmness noise",
      "mayfair" in M.model_tokens("Reserve Mayfair Plush")
      and "plush" not in M.model_tokens("Reserve Mayfair Plush")
      and "restonic" not in M.model_tokens("Restonic Reserve Mayfair"))
check("a variant with no price is never a candidate",
      run([variant(sellingAmountMinor=None)], ACC_PROTECTOR)["mattresses"][0]
      ["sizes"]["queen"]["status"] == "unresolved")

# ---------------------------------------------------------------------------
# 6380772 rules: model-number stem identity and configurable parent vs child.
# Proven load-bearing against the pre-6380772 mapper (rules 1, 5, 8, 9, 10 all
# failed there), and case 4b caught a real defect in 6380772 as committed: a
# purely alphabetic name word ("motion") became model-number identity. The
# repair requires a digit in the stem token.
# ---------------------------------------------------------------------------
PARENT_FLAG = "configurable-parent-not-an-exact-variant"


def base(**over):
    """A website adjustable-base record whose NAME carries no app model token;
    only its model number can identify it (the BT2000QN case)."""
    v = accessory(family="Adjustable Base", productType="base",
                  name="Bedtech Queen Adjustable Base With Head & Foot Motion",
                  familyKey="adjustable base head foot", sku="283083", entityId="be1",
                  modelNumber="BT2000QN", sellingAmountMinor=89900, regularAmountMinor=89900)
    v.update(over)
    return v


ACC_BASE = [{"id": "base-bt2000", "price": 899,
             "name": {"en": "BedTech BT2000 Adjustable Base", "es": "x"}}]
ACC_BASE_GENERIC = [{"id": "base-motion", "price": 899,
                     "name": {"en": "BedTech Motion Adjustable Base", "es": "x"}}]
ACC_BASE_BRANDONLY = [{"id": "base-bedtech", "price": 899,
                       "name": {"en": "BedTech Adjustable Base", "es": "x"}}]


def acc(out):
    return out["accessories"][0]


print("\nModel-number stem identity (6380772 rule 1):")
check("the parent flag the mapper partitions on is the one these cases plant",
      getattr(M, "PARENT_FLAG", None) == PARENT_FLAG, str(getattr(M, "PARENT_FLAG", None)))
a = acc(run([variant(), base()], ACC_BASE))
check("1. BT2000QN matches app token BT2000: preview-eligible with the Queen variant",
      a["status"] == "preview-eligible"
      and a.get("variants", {}).get("queen", {}).get("sku") == "283083", str(a)[:200])
check("1b. ...and the family is the model-number family, not the display-name family",
      str(a.get("familyKey", "")).startswith("model-number:"), str(a.get("familyKey")))
a = acc(run([variant(), base(modelNumber="BT3000QN")], ACC_BASE))
check("2. BT3000QN does not match BT2000", a["status"] == "unresolved", str(a)[:200])
a = acc(run([variant(), base(modelNumber="XBT2000QN")], ACC_BASE))
check("3. a token only in the MIDDLE of a model number does not match",
      a["status"] == "unresolved", str(a)[:200])
a = acc(run([variant(), base(modelNumber="BEDTECH2000QN")], ACC_BASE_BRANDONLY))
check("4a. a BRAND word never becomes model-number identity (BEDTECH2000QN vs 'BedTech')",
      a["status"] == "unresolved", str(a)[:200])
a = acc(run([variant(), base(modelNumber="MOTION2000QN",
                             name="Bedtech Queen Adjustable Base With Head & Foot")],
            ACC_BASE_GENERIC))
check("4b. a generic NAME word never becomes model-number identity (MOTION2000QN vs 'Motion')",
      a["status"] == "unresolved", str(a)[:200])
check("4c. helper: a digit-free token is never a stem, a part-number token is",
      M.model_number_stem("MOTION2000QN", {"motion"}) is None
      and M.model_number_stem("BT2000QN", {"bt2000"}) == "bt2000")

print("\nConfigurable parent vs exact child (6380772 rule 2):")
child = accessory(sku="170991", modelNumber="BGM03AWFQ", sellingAmountMinor=14995,
                  regularAmountMinor=14995)
parent = accessory(sku="833804", entityId="ae2", modelNumber="BGM03AWFQ",
                   sellingAmountMinor=14995, regularAmountMinor=14995,
                   exceptions=[PARENT_FLAG])
a = acc(run([variant(), child, parent], ACC_PROTECTOR))
q = (a.get("variants") or {}).get("queen") or {}
check("5. same model number: resolves to the CHILD sku, preview-eligible",
      a["status"] == "preview-eligible" and q.get("sku") == "170991", str(a)[:240])
note = q.get("parentCorroboration") or {}
check("5b. ...with the parent recorded as corroboration (sku, model number, price agreement)",
      note.get("parentSkus") == ["833804"] and note.get("modelNumber") == "BGM03AWFQ"
      and note.get("agreesOnPrice") is True, str(note)[:200])
a = acc(run([variant(), child,
             accessory(sku="833804", entityId="ae2", modelNumber="BGM026003",
                       exceptions=[PARENT_FLAG])], ACC_PROTECTOR))
check("6. DIFFERENT parent/child model numbers stay a variant-conflict with both SKUs",
      a["status"] == "variant-conflict"
      and any(set(c["skus"]) == {"170991", "833804"} for c in a.get("conflicts", [])),
      str(a)[:240])
check("6b. ...and no price wins the Queen slot", "queen" not in (a.get("variants") or {}))
a = acc(run([variant(), accessory(sku="170991", modelNumber=None),
             accessory(sku="833804", entityId="ae2", modelNumber=None,
                       exceptions=[PARENT_FLAG])], ACC_PROTECTOR))
check("7a. BOTH model numbers missing: no collapse, variant-conflict",
      a["status"] == "variant-conflict" and "queen" not in (a.get("variants") or {}),
      str(a)[:240])
a = acc(run([variant(), accessory(sku="170991", modelNumber=None),
             accessory(sku="833804", entityId="ae2", modelNumber="BGM03AWFQ",
                       exceptions=[PARENT_FLAG])], ACC_PROTECTOR))
check("7b. CHILD model number missing: no collapse, variant-conflict",
      a["status"] == "variant-conflict" and "queen" not in (a.get("variants") or {}),
      str(a)[:240])
a = acc(run([variant(), child,
             accessory(sku="833804", entityId="ae2", modelNumber=None,
                       exceptions=[PARENT_FLAG])], ACC_PROTECTOR))
check("7c. PARENT model number missing: no collapse, variant-conflict",
      a["status"] == "variant-conflict" and "queen" not in (a.get("variants") or {}),
      str(a)[:240])
a = acc(run([variant(), parent], ACC_PROTECTOR))
check("8. a PARENT-ONLY size never becomes an exact purchasable price",
      "queen" not in (a.get("variants") or {}) and a["status"] != "preview-eligible",
      str(a)[:240])
check("8b. ...and the reason names the parent-only case",
      any(c.get("reason") == "configurable-parent-only-no-exact-variant"
          and c.get("skus") == ["833804"] for c in a.get("conflicts", [])),
      str(a.get("conflicts"))[:200])
a = acc(run([variant(), child,
             accessory(sku="170992", entityId="ae3", modelNumber="BGM03AWFQ",
                       sellingAmountMinor=15995),
             parent], ACC_PROTECTOR))
check("9. two exact children with different SKUs remain a conflict even with a corroborating parent",
      a["status"] == "variant-conflict"
      and any(set(c["skus"]) == {"170991", "170992"} for c in a.get("conflicts", []))
      and "queen" not in (a.get("variants") or {}), str(a)[:240])
cheap_parent = accessory(sku="833804", entityId="ae2", modelNumber="BGM03AWFQ",
                         sellingAmountMinor=12995, regularAmountMinor=12995,
                         exceptions=[PARENT_FLAG])
with_parent = acc(run([variant(), child, cheap_parent], ACC_PROTECTOR))
without_parent = acc(run([variant(), child], ACC_PROTECTOR))
qw = (with_parent.get("variants") or {}).get("queen") or {}
check("10. parent/child PRICE disagreement is recorded explicitly (agreesOnPrice False)",
      (qw.get("parentCorroboration") or {}).get("agreesOnPrice") is False,
      str(qw.get("parentCorroboration"))[:200])
check("10b. ...the CHILD's price is the one carried, never the parent's 'starting at'",
      qw.get("sellingAmountMinor") == 14995 and qw.get("sku") == "170991", str(qw)[:200])
check("10c. ...and identity is not strengthened: same status as with no parent at all",
      with_parent["status"] == without_parent["status"] == "preview-eligible",
      f"{with_parent['status']} vs {without_parent['status']}")

print(f"\nMapping check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
