#!/usr/bin/env python3
"""Regression coverage for tools/fetch_lacks_prices.py.

Every case here reconstructs a defect the extractor actually shipped, so the
assertion cannot be vacuous:

  * 114 records were given a SYNTHESISED source URL of `/product/None`, and 74
    of those were then classified "clean" - priced with a source link that does
    not exist.
  * Every size-less accessory was flagged `no-resolvable-size`, including throw
    blankets and pillows, which are not sold by mattress size at all.
  * A blanket "set" detector flagged 59 legitimate accessory sets (sheet sets,
    comforter sets) with a MATTRESS-ONLY bundle warning.
  * `regular_price` (the crossed-out price) must never be read as the selling
    price.

Pure and offline: no HTTP request is made and no file is written.
"""
import io
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "tools"))
import fetch_lacks_prices as fx  # noqa: E402

passed = failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" - {detail}" if detail else ""))


def rec(**over):
    base = {
        "name": "Restonic Grace II 11.5\" Medium King Mattress",
        "sku": "2037188", "entity_id": "2015764", "model_number": "1601-133-MC45866",
        "manufacturer": "Restonic", "collection_name": "Grace",
        "mattress_size": "King", "type_id": "simple", "has_options": False,
        "required_options": "0", "display_price": True,
        "display_request_a_quote": False,
        "final_price_without_tax": 779, "regular_price_without_tax": 1099.95,
        "product_url": "https://www.lacks.com/product/restonic-grace-ii-king-2037188",
        "url_key": "restonic-grace-ii-king-2037188",
    }
    base.update(over)
    return base


def row(kind="mattress", category="king-mattresses", expected="king", **over):
    return fx.extract_record(rec(**over), category, expected, kind)


print("Evidence is never synthesised:")
r = row(product_url=None, url_key=None)
check("no product_url and no url_key -> NO /product/None anywhere",
      "/product/None" not in r["sourceUrl"] and "None" not in r["sourceUrl"].rsplit("/", 1)[-1],
      r["sourceUrl"])
check("...evidence falls back to the REAL category listing URL",
      r["evidence"]["type"] == "category-listing"
      and r["evidence"]["url"] == "https://www.lacks.com/catalog/king-mattresses?display_mode=products",
      str(r["evidence"]))
check("...and the row is FLAGGED, so it can never be counted clean",
      "no-product-page-evidence-category-listing-only" in r["exceptions"])
r = row(product_url="https://www.lacks.com/product/None", url_key=None)
check("a literal /product/None product_url is rejected, not trusted",
      r["evidence"]["type"] == "category-listing" and "/product/None" not in r["sourceUrl"])
r = row(product_url=None, url_key="none")
check("url_key of the string 'none' is rejected",
      r["evidence"]["type"] == "category-listing")
r = row(product_url=None, url_key="restonic-grace-ii-king-2037188")
check("a real url_key builds a real product-page URL",
      r["evidence"]["type"] == "product-page"
      and r["sourceUrl"].endswith("/product/restonic-grace-ii-king-2037188"))
r = row()
check("a present product_url is used as product-page evidence",
      r["evidence"]["type"] == "product-page" and r["exceptions"] == [], str(r["exceptions"]))

print("\nSelling price is final_price, never the crossed-out regular price:")
r = row()
check("selling = final_price_without_tax (779.00 -> 77900 minor)",
      r["sellingAmountMinor"] == 77900, str(r["sellingAmountMinor"]))
check("regular recorded separately (1099.95 -> 109995 minor)",
      r["regularAmountMinor"] == 109995, str(r["regularAmountMinor"]))
check("the two are never conflated", r["sellingAmountMinor"] != r["regularAmountMinor"])
r = row(final_price_without_tax=None)
check("no final price -> no selling amount and an exception",
      r["sellingAmountMinor"] is None and "no-exact-selling-price" in r["exceptions"])

print("\nInteger minor units, exactly or not at all:")
check("1099.95 -> 109995", fx.to_minor(1099.95) == 109995)
check("779 -> 77900", fx.to_minor(779) == 77900)
check("0 -> 0", fx.to_minor(0) == 0)
for bad in (None, "779", True, float("nan"), float("inf"), -1, 0.001, 1.005):
    check(f"{bad!r} -> None (never a wrong number)", fx.to_minor(bad) is None)

print("\nSize requirements are product-type aware:")
cases = [
    ("Signature Design by Ashley Anawood Blue Throw Blanket", "throw", False),
    ("Lavender Memory Foam 28\" Pillow", "pillow", False),
    ("Bedgear Iprotect Queen Mattress Protector", "protector", False),
    ("Bedgear Dri-Tec Performance Sheet Set", "sheets", True),
    ("Paragon 9-Pc Bed Ensemble", "bedding_set", True),
]
for name, want_type, want_flag in cases:
    got = fx.product_type_of(name, "accessory")
    r = row(kind="accessory", category="mattress-accessories", expected=None,
            name=name, mattress_size=None)
    flagged = "no-resolvable-size" in r["exceptions"]
    check(f"{want_type:12s} {name[:44]!r} -> type ok", got == want_type, f"got {got}")
    check(f"{want_type:12s} ...size-required={want_flag}, flagged={flagged}",
          flagged == want_flag, str(r["exceptions"]))
r = row(kind="accessory", category="mattress-accessories", expected=None,
        name="Bedgear Iprotect Queen Mattress Protector", mattress_size=None)
check("a SIZED accessory still resolves its size from the name",
      r["size_id"] == "queen" and "no-resolvable-size" not in r["exceptions"])

print("\nSet/bundle classification is product-type aware:")
r = row(kind="accessory", category="mattress-accessories", expected=None,
        name="Bedgear Grey Dri-Tec Performance Full Sheet Set", mattress_size=None)
check("a sheet SET is the product: no mattress-only bundle warning",
      not any("mattress" in e and "foundation" in e for e in r["exceptions"]),
      str(r["exceptions"]))
check("...and it is scoped as an accessory set",
      r["scope"] == "accessory-set" and r["isMultiPieceSet"] is True, r["scope"])
r = row(name="Restonic Grace II King Mattress Set")
check("a MATTRESS 'Set' IS warned about (the price may include a foundation)",
      any(e.startswith("mattress-price-may-include") for e in r["exceptions"]),
      str(r["exceptions"]))
check("...and is scoped mattress-set, never mattress-only", r["scope"] == "mattress-set")
r = row(name="Restonic Grace II King Mattress w/ Foundation")
check("'w/ Foundation' is caught too",
      any(e.startswith("mattress-price-may-include") for e in r["exceptions"]))
r = row()
check("an ordinary mattress is scoped mattress-only", r["scope"] == "mattress-only")

print("\nSize parsing never confuses adjacent sizes:")
for name, want in [("Bedgear Iprotect Twin Xl Mattress Protector", "twin_xl"),
                   ("Iprotect Twin Mattress Protector", "twin"),
                   ("Ver-Tex California King Protector", "cal_king"),
                   ("Ver-Tex Cal King Protector", "cal_king"),
                   ("Ver-Tex King Protector", "king"),
                   ("Ver-Tex Full Protector", "full")]:
    got, _ = fx.size_from_name(name)
    check(f"{name[:46]!r} -> {want}", got == want, f"got {got}")
got, _ = fx.size_from_name("Split King Adjustable Base")
check("'Split King' is NOT silently mapped to king", got is None, f"got {got}")

print("\nVariant parents and quote-only products are excluded, not guessed:")
r = row(type_id="configurable", has_options=True)
check("a configurable parent is flagged, never priced as a variant",
      "configurable-parent-not-an-exact-variant" in r["exceptions"])
r = row(type_id=None)
check("an ABSENT type_id is not a bundle signal (100 accessories were lost to this)",
      not any("configurable" in e for e in r["exceptions"]), str(r["exceptions"]))
r = row(display_request_a_quote=True)
check("display_request_a_quote -> quote-only", "quote-only-product" in r["exceptions"])
for poa in ("Low Stock", "Product Coming Soon", ""):
    r = row(poa=poa)
    check(f"poa={poa!r} is stock state, NOT price-on-application",
          not any("application" in e for e in r["exceptions"]), str(r["exceptions"]))

print("\nCategory never establishes a size:")
r = row(mattress_size="Queen", category="king-mattresses", expected="king")
check("a Queen found on the King page is filed as QUEEN and flagged",
      r["size_id"] == "queen"
      and any(e.startswith("size-differs-from-category") for e in r["exceptions"]))

print("\nReplaying a cache does not refresh a price:")
# THE DEFECT THIS PINS: an earlier build stamped every row with the CURRENT
# run's start time. Rebuilding from an untouched cache therefore made prices
# captured weeks ago look freshly observed, and the website preview consumed
# that as evidence freshness - so a stale price would have rendered as current
# indefinitely, simply because the file was regenerated.
import json as _json
import shutil as _shutil
import tempfile as _tempfile
import datetime as _dt

_tmp = _tempfile.mkdtemp(prefix="freshcache_")
try:
    OLD = "2026-01-02T03:04:05+00:00"
    _cache = os.path.join(_tmp, ".cache")
    os.makedirs(_cache)
    _orig_dir = fx.CACHE_DIR
    fx.CACHE_DIR = _cache
    try:
        raw = {
            "name": "Restonic Grace II 11.5\" Medium King Mattress",
            "sku": "2037188", "entity_id": "2015764", "mattress_size": "King",
            "type_id": "simple", "has_options": False, "required_options": "0",
            "display_price": True, "display_request_a_quote": False,
            "final_price_without_tax": 779, "regular_price_without_tax": 1099.95,
            "product_url": "https://www.lacks.com/product/restonic-grace-ii-king-2037188",
            "url_key": "restonic-grace-ii-king-2037188", "manufacturer": "Restonic",
        }
        with io.open(fx.cache_path("king-mattresses", 1), "w", encoding="utf-8") as f:
            _json.dump({"category": "king-mattresses", "page": 1, "pageCount": 1,
                        "retrievedAt": OLD, "records": [raw]}, f)

        seen = []
        rows, problems = fx.collect("king-mattresses", "king", "mattress",
                                    max_pages=2, pause=0, log=seen.append,
                                    cache_hours=10 ** 9)
        check("a cache hit makes NO network request (the log says cached)",
              any("cached" in line for line in seen) and not problems, str(seen))
        check("the replayed row keeps the ORIGINAL retrieval instant",
              len(rows) == 1 and rows[0]["observedAt"] == OLD,
              str(rows[0].get("observedAt") if rows else None))
        now_iso = fx.now_iso()
        check("...and that instant is NOT this run's clock",
              rows[0]["observedAt"] != now_iso and rows[0]["observedAt"] < now_iso)
        check("re-extraction still applies TODAY's rules to the cached record",
              rows[0]["sellingAmountMinor"] == 77900 and rows[0]["productType"] == "mattress"
              and rows[0]["evidence"]["type"] == "product-page")

        # replay a second time: the stamp must not creep forward
        rows2, _ = fx.collect("king-mattresses", "king", "mattress",
                              max_pages=2, pause=0, log=lambda _m: None,
                              cache_hours=10 ** 9)
        check("replaying twice does not move the observation instant",
              rows2[0]["observedAt"] == OLD)

        # a LEGACY cache entry (pre-fix, rows not records) is backfilled, not
        # silently given today's date
        legacy_row = fx.extract_record(raw, "king-mattresses", "king", "mattress", None)
        legacy_row.pop("observedAt", None)
        with io.open(fx.cache_path("king-mattresses", 1), "w", encoding="utf-8") as f:
            _json.dump({"category": "king-mattresses", "page": 1, "pageCount": 1,
                        "retrievedAt": OLD, "rows": [legacy_row]}, f)
        rows3, _ = fx.collect("king-mattresses", "king", "mattress",
                              max_pages=2, pause=0, log=lambda _m: None,
                              cache_hours=10 ** 9)
        check("a legacy row-cache entry is backfilled with ITS page's instant",
              rows3 and rows3[0].get("observedAt") == OLD,
              str(rows3[0].get("observedAt") if rows3 else None))

        # an expired cache entry is a MISS - it must not be replayed as fresh
        rows4, problems4 = fx.collect("king-mattresses", "king", "mattress",
                                      max_pages=1, pause=0, log=lambda _m: None,
                                      cache_hours=0.000001)
        check("an entry older than the cache window is not reused from cache",
              rows4 == [] or all(r.get("observedAt") != OLD for r in rows4)
              or bool(problems4))
    finally:
        fx.CACHE_DIR = _orig_dir
finally:
    _shutil.rmtree(_tmp, ignore_errors=True)

print("\nGeneration and observation are different facts:")
check("extract_record records the observation it was given, not a clock read",
      fx.extract_record(
          {"name": "X Queen Mattress", "sku": "1", "mattress_size": "Queen",
           "type_id": "simple", "display_price": True,
           "final_price_without_tax": 1, "product_url": "https://www.lacks.com/product/x-1"},
          "queen-mattresses", "queen", "mattress", "2020-01-01T00:00:00+00:00"
      )["observedAt"] == "2020-01-01T00:00:00+00:00")
check("an absent observation stays absent rather than defaulting to now",
      fx.extract_record(
          {"name": "X Queen Mattress", "sku": "1", "mattress_size": "Queen",
           "type_id": "simple", "display_price": True,
           "final_price_without_tax": 1, "product_url": "https://www.lacks.com/product/x-1"},
          "queen-mattresses", "queen", "mattress"
      )["observedAt"] is None)

print(f"\nPrice extraction check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
