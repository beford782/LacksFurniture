#!/usr/bin/env python3
"""Website drill admission: observation dates and size-independent accessories
(PR #132 review repairs, 2026-09-25).

Executes the REAL tools/serve_pricing_preview.py website drill (build_website
and build_injected) over a synthetic snapshot + mapping in a temp dir. Offline;
the repository's committed snapshot and mapping are never read or written by
the synthetic cases.

WHY THIS EXISTS. Two review findings on PR #132:

  1. A price's observation instant is EVIDENCE - it is what the runtime
     freshness axis judges. The drill used to repair a missing or unreadable
     `observedAt` by substituting "one hour ago", and to clamp a future stamp
     to "five minutes ago". Either way a price nobody observed at that time
     was served as freshly observed. The committed snapshot carries rows with
     no observedAt at all, so this was live in the website preview.
  2. The mapper wrote a size-independent accessory's variant under the key
     str(None) == "None"; the drill then filed the SKU under the mattress size
     "None", which no customer has, so a size-independent accessory could
     never price - and "None" appeared in coverage as if it were a size.

WHAT IT PROVES:
  * a variant whose observedAt is missing, unparseable, offset-less, or later
    than the run's own clock is REFUSED by name in the coverage report and
    never priced;
  * a trustworthy stamp is passed through UNCHANGED into evidence.verifiedAt
    and clearance.attestedAt (never re-stamped, never clamped);
  * a size-independent variant (the mapper's explicit key) is filed as the
    accessory's single `sku` - the shape pricingSkuFor resolves for every
    customer size - and the string "None" is never a size anywhere;
  * a legacy "None" key is refused by name, never filed as a size;
  * a family mixing a size-independent and sized variants is refused whole;
  * sized variants still file per size (regression guard);
  * the mapper and the drill agree on the size-independent key.

Run: python tests/pricing_website_admission_check.py
"""
import copy
import io
import json
import os
import shutil
import sys
import tempfile
from datetime import datetime, timedelta, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import serve_pricing_preview as srv  # noqa: E402
import map_app_to_website as M  # noqa: E402

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


START = datetime(2026, 9, 25, 15, 0, 0, tzinfo=timezone.utc)
GOOD = "2026-09-20T23:28:50+00:00"
HOST = json.load(io.open(os.path.join(REPO, "tools", "source_hosts.json"), encoding="utf-8"))["priceSourceHosts"][0]
CATALOG = json.load(io.open(os.path.join(REPO, "data", "mattresses.json"), encoding="utf-8"))
MATTRESS_ID = CATALOG["gold"][0]["id"]
ACCESSORIES = json.load(io.open(os.path.join(REPO, "data", "accessories.json"), encoding="utf-8"))
PILLOW_ID = next(a["id"] for a in ACCESSORIES if a["id"].startswith("pillow-"))
PROTECTOR_ID = next(a["id"] for a in ACCESSORIES if a["id"].startswith("protector-"))


def variant(sku, observed=GOOD, size_id="queen", amount=49900):
    return {"sku": sku, "kind": "accessory", "name": "synthetic " + sku, "size_id": size_id,
            "sellingAmountMinor": amount, "currency": "USD", "observedAt": observed,
            "evidence": {"type": "product-page", "url": f"https://{HOST}/product/{sku}"}}


def run(variants, mattresses=(), accessories=()):
    """Point the drill at a synthetic snapshot + mapping and build the website
    state. Returns (products, mattress_skus, accessory_skus, coverage,
    injected) where injected = build_injected('website', START)."""
    tmp = tempfile.mkdtemp(prefix="webadm_")
    old = (srv.SNAPSHOT, srv.MAPPING)
    try:
        snap = os.path.join(tmp, "snapshot.json")
        mapping = os.path.join(tmp, "mapping.json")
        with io.open(snap, "w", encoding="utf-8") as f:
            json.dump({"_meta": {}, "variants": list(variants)}, f)
        with io.open(mapping, "w", encoding="utf-8") as f:
            json.dump({"mattresses": list(mattresses), "accessories": list(accessories)}, f)
        srv.SNAPSHOT, srv.MAPPING = snap, mapping
        products, m_skus, a_skus, coverage = srv.build_website(START)
        injected = srv.build_injected("website", START)
        return products, m_skus, a_skus, coverage, injected
    finally:
        srv.SNAPSHOT, srv.MAPPING = old
        shutil.rmtree(tmp, ignore_errors=True)


def mattress_row(sku):
    return {"appId": MATTRESS_ID, "appName": "synthetic", "sizes": {"queen": {"status": "preview-eligible", "sku": sku}}}


def accessory_row(app_id, variants_by_key):
    return {"appId": app_id, "status": "preview-eligible", "familyKey": "synthetic",
            "variants": {k: {"sku": sku} for k, sku in variants_by_key.items()}}


def rejected_reason(coverage, sku):
    for r in coverage["mattressRejected"] + coverage["accessoriesRejected"]:
        if r.get("sku") == sku:
            return r.get("reason")
    return None


# --------------------------------------------------------------- 1. dates
print("Observation dates: untrustworthy stamps are refused by name; trustworthy ones pass through unchanged")
FUTURE = (START + timedelta(days=2)).isoformat()
cases = [
    ("missing (None)", None, "observation-missing"),
    ("missing (empty string)", "", "observation-missing"),
    ("unparseable text", "last tuesday", "observation-unparseable"),
    ("offset-less (naive) stamp", "2026-09-20T23:28:50", "observation-offset-missing"),
    ("later than the run's own clock", FUTURE, "observation-in-future"),
    ("one second after the run's clock", (START + timedelta(seconds=1)).isoformat(), "observation-in-future"),
]
for label, stamp, expected in cases:
    sku = "M-" + expected
    products, m_skus, _, cov, (cfg, cat, verdicts, acc) = run(
        [dict(variant(sku, observed=stamp), kind="mattress")], mattresses=[mattress_row(sku)])
    served = [e for e in cfg["pricing"]["products"] if e.get("sku") == sku]
    check(f"observedAt {label}: refused with reason {expected!r}", rejected_reason(cov, sku) == expected,
          f"reason={rejected_reason(cov, sku)!r}")
    check(f"observedAt {label}: nothing priced for that sku (no product, no catalog sku map, no served entry)",
          not products and not m_skus and not served, f"products={len(products)} skus={m_skus} served={len(served)}")

# A stamp exactly at the run's clock is not in the future.
sku = "M-at-clock"
products, m_skus, _, cov, (cfg, cat, verdicts, acc) = run(
    [dict(variant(sku, observed=START.isoformat()), kind="mattress")], mattresses=[mattress_row(sku)])
check("observedAt equal to the run's clock is admitted (only LATER is the future)",
      rejected_reason(cov, sku) is None and m_skus == {MATTRESS_ID: {"queen": sku}}, f"{rejected_reason(cov, sku)} {m_skus}")

# Trustworthy stamps pass through byte-for-byte, whatever their offset.
for label, stamp in [("UTC offset", GOOD), ("a non-UTC offset", "2026-09-20T18:28:50-05:00"),
                     ("an old but real observation", "2026-06-01T08:00:00+00:00")]:
    sku = "M-good"
    products, m_skus, _, cov, (cfg, cat, verdicts, acc) = run(
        [dict(variant(sku, observed=stamp), kind="mattress")], mattresses=[mattress_row(sku)])
    served = [e for e in cfg["pricing"]["products"] if e.get("sku") == sku]
    check(f"a trustworthy stamp ({label}) is admitted and priced", len(served) == 1 and m_skus == {MATTRESS_ID: {"queen": sku}},
          f"served={len(served)} skus={m_skus} rejected={rejected_reason(cov, sku)}")
    if served:
        e = served[0]
        check(f"...and evidence.verifiedAt is the stamp UNCHANGED ({stamp})", e["evidence"]["verifiedAt"] == stamp,
              repr(e["evidence"]["verifiedAt"]))
        check("...and clearance.attestedAt and scope.evidenceVerifiedAt carry the same unchanged stamp",
              e["clearance"]["attestedAt"] == stamp and e["clearance"]["scope"]["evidenceVerifiedAt"] == stamp,
              f"{e['clearance']['attestedAt']!r} {e['clearance']['scope']['evidenceVerifiedAt']!r}")

# The verdict helper itself, for the exact boundary.
check("observation_verdict: the helper exists on the drill", callable(getattr(srv, "observation_verdict", None)))
if callable(getattr(srv, "observation_verdict", None)):
    check("observation_verdict: a non-string (number) stamp is unparseable, not treated as missing-and-repaired",
          srv.observation_verdict(1758400000, START) in ("observation-unparseable", "observation-missing"))
    check("observation_verdict: a good stamp returns None", srv.observation_verdict(GOOD, START) is None)

# ----------------------------------------------------- 2. size-independent
print("\nSize-independent accessories: filed as the single sku; 'None' is never a size")
KEY = getattr(srv, "SIZE_INDEPENDENT_KEY", None)
check("the drill and the mapper agree on ONE explicit size-independent key (and it is not 'None' or a size)",
      isinstance(KEY, str) and KEY == getattr(M, "SIZE_INDEPENDENT_KEY", object()) and KEY != "None" and KEY not in M.SIZES,
      f"drill={KEY!r} mapper={getattr(M, 'SIZE_INDEPENDENT_KEY', None)!r}")
if isinstance(KEY, str):
    products, _, a_skus, cov, (cfg, cat, verdicts, acc) = run(
        [variant("P-1", size_id=None, amount=9900)], accessories=[accessory_row(PILLOW_ID, {KEY: "P-1"})])
    rec = next(a for a in acc if a["id"] == PILLOW_ID)
    check("a size-independent pillow variant is admitted and priced", len(products) == 1 and products[0]["size"] is None,
          str(products)[:160])
    check("...and the injected accessory record carries the single string `sku` (no per-size map)",
          rec.get("sku") == "P-1" and "accessorySkus" not in rec, f"sku={rec.get('sku')!r} map={rec.get('accessorySkus')!r}")
    check("...and the string 'None' appears nowhere in the coverage report as a size",
          "None" not in json.dumps(cov) and all(r.get("size") != "None" for r in cov["accessoriesRejected"]), json.dumps(cov)[:200])
    check("...and coverage names the key, not a mattress size, for that accessory",
          any(c["appId"] == PILLOW_ID and c["sizes"] == [KEY] for c in cov["accessories"]), str(cov["accessories"]))
    served = [e for e in cfg["pricing"]["products"] if e.get("productId") == PILLOW_ID]
    check("...and the served pricing entry is an accessory entry with size null",
          len(served) == 1 and served[0]["productKind"] == "accessory" and served[0]["size"] is None, str(served)[:160])

# A legacy "None" key (str(None)) is refused by name, never a size.
products, _, a_skus, cov, (cfg, cat, verdicts, acc) = run(
    [variant("P-2", size_id=None, amount=9900)], accessories=[accessory_row(PILLOW_ID, {"None": "P-2"})])
rec = next(a for a in acc if a["id"] == PILLOW_ID)
check("a legacy 'None' variant key is refused by name (size-key-not-a-size:None)",
      rejected_reason(cov, "P-2") == "size-key-not-a-size:None", repr(rejected_reason(cov, "P-2")))
check("...and nothing is filed under a size called 'None'", not products and "sku" not in rec and "accessorySkus" not in rec,
      f"products={products} rec_sku={rec.get('sku')!r} map={rec.get('accessorySkus')!r}")

# Mixed families are refused whole.
if isinstance(KEY, str):
    products, _, a_skus, cov, (cfg, cat, verdicts, acc) = run(
        [variant("X-free", size_id=None), variant("X-queen", size_id="queen")],
        accessories=[accessory_row(PROTECTOR_ID, {KEY: "X-free", "queen": "X-queen"})])
    rec = next(a for a in acc if a["id"] == PROTECTOR_ID)
    check("a family mixing a size-independent and a sized variant is refused whole (mixed-size-independence)",
          not products and any(r["appId"] == PROTECTOR_ID and r["reason"] == "mixed-size-independence" for r in cov["accessoriesRejected"])
          and "sku" not in rec and "accessorySkus" not in rec, str(cov["accessoriesRejected"])[:200])

# Sized variants still file per size; an unknown size key is refused.
products, _, a_skus, cov, (cfg, cat, verdicts, acc) = run(
    [variant("S-queen", size_id="queen"), variant("S-king", size_id="king"), variant("S-odd", size_id="odd")],
    accessories=[accessory_row(PROTECTOR_ID, {"queen": "S-queen", "king": "S-king", "sofa": "S-odd"})])
rec = next(a for a in acc if a["id"] == PROTECTOR_ID)
check("sized variants file per size into accessorySkus (regression guard)",
      rec.get("accessorySkus") == {"queen": "S-queen", "king": "S-king"} and "sku" not in rec, str(rec.get("accessorySkus")))
check("a variant under a key that is not a mattress size is refused by name",
      rejected_reason(cov, "S-odd") == "size-key-not-a-size:sofa", repr(rejected_reason(cov, "S-odd")))

print(f"\n{passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
