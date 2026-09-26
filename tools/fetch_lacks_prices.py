#!/usr/bin/env python3
"""Extract exact per-variant retail prices from the retailer's public website
into a REVIEWABLE, NON-SHIPPING snapshot.

  website -> automated extraction -> reviewable snapshot -> owner verification
                                                         -> verified preview data

This tool performs the first two steps only. It writes to `demo/price-snapshot/`
and NOTHING else. It never touches `incoming/`, `data/`, the workbook, or any
production configuration, and the snapshot it produces is explicitly
UNVERIFIED: nothing here is a business-approved price, and the pricing
contract's `sourcePolicy` remains `unapproved` regardless of what this
captures.

WHY THE HTML AND NOT THE API
----------------------------
`incoming/fetch_lacks_images.py` records that the site's pages and `/api/rest/*`
sit behind PerimeterX. Re-tested 2026-09-20: `/api/rest/*` still returns 403 to
an automated request, but the size-specific catalog pages return 200 and embed a
complete Next.js `__NEXT_DATA__` island carrying full product records. This tool
reads that island. It makes ordinary paced GETs for public catalog pages and
sends no credentials.

PRICE SEMANTICS - THE TRAP THIS TOOL EXISTS TO AVOID
-----------------------------------------------------
`regular_price_without_tax` is the CROSSED-OUT price. `final_price_without_tax`
is the SELLING price. On the first page sampled, every record carried a final
price BELOW its regular price. Reading `regular_price` as the selling price
would overstate every mattress by hundreds of dollars, so this tool records both
and treats `final_price_without_tax` as the selling price, always.

SIZE IS READ FROM THE RECORD, NEVER THE CATEGORY
-------------------------------------------------
The `king-mattresses` category page returned 23 King records and 1 Queen. A
variant's size therefore comes from its own `mattress_size` field; any record
whose size disagrees with the category it was found in is still captured, filed
under its OWN size, and flagged. No size is ever inferred from another size.
"""
import argparse
import datetime as _dt
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT_DIR = os.path.join(REPO, "demo", "price-snapshot")

BASE = "https://www.lacks.com"
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/140.0 Safari/537.36")

# Category -> the quiz size id it is EXPECTED to carry. Expected only: every
# record is filed under its own `mattress_size`, and a disagreement is flagged.
MATTRESS_CATEGORIES = [
    ("twin", "twin"),
    ("twin-xl", "twin_xl"),
    ("full-mattresses", "full"),
    ("queen-mattresses", "queen"),
    ("king-mattresses", "king"),
    ("california-king-mattresses", "cal_king"),
]
# Accessory categories, and the product type the CATEGORY asserts (None = let
# the name decide). `mattress-accessories` alone left the app's pillows and
# every base unmatchable: it yielded 1 pillow record and 0 bases, so all four
# app bases and both pillows could only ever read "unresolved". The slugs come
# from the retailer's own nav on /catalog/mattresses (read 2026-09-21);
# "Adjustable Bases" is spelled `adjustable-beds` there.
#
# A category type is an ASSERTION, not an override: it fills in a type the
# name does not carry (a base named only "BedTech BT2000"), and where the name
# says something else entirely the NAME wins and the row is flagged, because a
# protector filed under a base category is a shelving accident, not a base.
ACCESSORY_CATEGORIES = [
    ("mattress-accessories", None),
    ("bedding-protectors", None),
    ("pillows", "pillow"),
    ("adjustable-beds", "base"),
    ("foundations", "base"),
    ("standard-foundations", "base"),
]
CATEGORY_PRODUCT_TYPE = {c: t for c, t in ACCESSORY_CATEGORIES if t}

# `mattress_size` as the site spells it -> the quiz's size id. Anything absent
# from this map is captured with size_id None and flagged, never guessed.
SIZE_IDS = {
    "twin": "twin", "twin xl": "twin_xl", "twinxl": "twin_xl",
    "full": "full", "full xl": None, "double": "full",
    "queen": "queen", "king": "king",
    "california king": "cal_king", "cal king": "cal_king", "cal. king": "cal_king",
    "split king": None, "split california king": None,
}

# ---------------------------------------------------------------------------
# Product types. Size requirements and set/bundle meaning are PRODUCT-TYPE
# AWARE: "Full Sheet Set" is a legitimate accessory sold as a set, while a
# mattress "set" usually means mattress + foundation and must never be totalled
# as a mattress. A throw blanket has no mattress size at all, and a pillow's
# size is a pillow size, not a mattress size.
# Order matters - the first pattern that matches wins, longest/most specific
# first.
PRODUCT_TYPES = [
    ("protector", r"\bprotector\b|\bmattress\s+pad\b|\bencasement\b"),
    ("base", r"\badjustable\s+base\b|\bpower\s+base\b|\bfoundation\b|\bbox\s*spring\b"),
    ("topper", r"\btopper\b"),
    ("sheets", r"\bsheet\s+set\b|\bsheets\b|\bpillowcase\b"),
    ("bedding_set", r"\bcomforter\s+set\b|\bduvet\s+set\b|\bbed\s+ensemble\b|"
                    r"\bbedding\s+set\b|\bquilt\s+set\b|\bcoverlet\s+set\b|\d+\s*-?\s*pc\b"),
    ("pillow", r"\bpillow\b"),
    ("throw", r"\bthrow\b|\bblanket\b"),
    ("mattress", r"\bmattress\b"),
]

# Which product types are sold BY mattress size. Anything else may legitimately
# carry no mattress size, and its absence is not an exception.
SIZE_REQUIRED = {"mattress", "protector", "base", "topper", "sheets", "bedding_set"}
# Types whose product IS a multi-piece set. For these, "set" in the name is the
# product, not a bundling hazard.
SET_IS_THE_PRODUCT = {"sheets", "bedding_set"}


def product_type_of(name, kind):
    if not isinstance(name, str):
        return "mattress" if kind == "mattress" else "other"
    low = name.lower()
    for tname, pattern in PRODUCT_TYPES:
        if re.search(pattern, low):
            # a mattress-category record is a mattress even if its name also
            # says "protector"; trust the category for kind, the name for type
            if kind == "mattress" and tname != "mattress":
                continue
            return tname
    return "mattress" if kind == "mattress" else "other"


ISLAND = re.compile(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', re.S)


def now_iso():
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat()


def fetch(url, timeout=40, retries=3, pause=4.0):
    """One paced GET. Returns (status, text) and never raises for HTTP errors.

    The site throttles bursts: a run of rapid requests earns a 403 that clears
    on its own within about a minute (observed 2026-09-20). A 403 or 429 is
    therefore treated as BACK OFF AND RETRY, not as an answer about the
    catalog. If it still refuses after the backoff, the caller records the
    refusal as a category problem - it never becomes an invented price.
    """
    last = None
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, headers={"User-Agent": UA,
                                                   "Accept": "text/html,application/xhtml+xml"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code in (403, 429) and attempt < retries:
                wait = 30.0 * (attempt + 1)
                print(f"    http {e.code}; backing off {wait:.0f}s", flush=True)
                time.sleep(wait)
                continue
            return e.code, ""
        except Exception as e:  # noqa: BLE001 - recorded as a problem row, never invented
            last = repr(e)
            time.sleep(pause * (attempt + 1))
    return None, last or "unknown transport failure"


def island(text):
    m = ISLAND.search(text or "")
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except Exception:  # noqa: BLE001
        return None


def to_minor(value):
    """Major-unit number -> integer MINOR units, EXACTLY or not at all.

    Mirrors the pricing contract: integer cents, no floats, no rounding of a
    value that is not already at currency precision. Returns None rather than
    a wrong number.
    """
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if value != value or value in (float("inf"), float("-inf")):  # NaN / inf
        return None
    if value < 0:
        return None
    scaled = value * 100
    if scaled > 9007199254740991:
        return None
    minor = round(scaled)
    if abs(scaled - minor) > 1e-6:
        return None
    return int(minor)


def size_id_for(raw):
    if not isinstance(raw, str):
        return None
    return SIZE_IDS.get(raw.strip().lower())


# Accessories carry no `mattress_size`; their size lives in the product NAME
# ("Bedgear Iprotect Twin Xl Mattress Protector"). Longest patterns first so
# "Twin Xl" and "California King" win over "Twin" and "King". A name with no
# recognised size yields None and is flagged - never guessed.
NAME_SIZES = [
    (r"\bcalifornia\s+king\b", "cal_king"), (r"\bcal\.?\s*king\b", "cal_king"),
    (r"\bsplit\s+king\b", None),
    (r"\btwin\s*xl\b", "twin_xl"), (r"\bfull\s*xl\b", None),
    (r"\bking\b", "king"), (r"\bqueen\b", "queen"),
    (r"\bfull\b", "full"), (r"\btwin\b", "twin"),
]


def size_from_name(name):
    """(size_id, matched_text) parsed from a product name, or (None, None)."""
    if not isinstance(name, str):
        return None, None
    low = name.lower()
    for pattern, sid in NAME_SIZES:
        m = re.search(pattern, low)
        if m:
            return sid, m.group(0)
    return None, None


def family_of(name, matched):
    """The product family: the displayed name with its size token removed, so
    every size of one product collapses to ONE customer-facing family."""
    if not isinstance(name, str):
        return None
    out = name
    if matched:
        out = re.sub(re.escape(matched), " ", out, flags=re.I)
    out = re.sub(r"\s{2,}", " ", out).strip(" -,")
    return out or name


# Some listings of the same product omit the brand word ("Iprotect Mattress
# Protector" vs "Bedgear Iprotect Mattress Protector"), which would split one
# family in two. Collapse on a normalised key: lowercase, punctuation out,
# leading brand word dropped.
BRAND_WORDS = ("bedgear", "tempur-pedic", "tempur", "restonic", "serta", "sealy",
               "beautyrest", "simmons", "stearns", "purple", "malouf")


def family_key(fam):
    if not isinstance(fam, str):
        return None
    k = re.sub(r"[^a-z0-9 ]+", " ", fam.lower())
    k = re.sub(r"\s{2,}", " ", k).strip()
    for b in BRAND_WORDS:
        if k.startswith(b + " "):
            k = k[len(b) + 1:]
            break
    return k or None


def slug_note(name, evidence):
    """Flag a product-page slug whose words do not overlap the product name."""
    if not isinstance(name, str) or evidence.get("type") != "product-page":
        return None
    slug = (evidence.get("url") or "").rsplit("/", 1)[-1].lower()
    if not slug:
        return None
    stop = {"mattress", "queen", "king", "full", "twin", "cal", "california",
            "the", "and", "with", "set", "firm", "plush", "medium", "soft",
            "extra", "euro", "top", "tight", "pillow", "hybrid", "xl"}
    words = {w for w in re.split(r"[^a-z0-9]+", norm_name(name)) if len(w) > 3 and w not in stop}
    slug_words = {w for w in re.split(r"[^a-z0-9]+", slug) if len(w) > 3 and w not in stop}
    if words and slug_words and not (words & slug_words):
        return "source-url-slug-names-a-different-product-than-this-record"
    return None


def norm_name(s):
    return re.sub(r"[^a-z0-9 ]+", " ", (s or "").lower())


def extract_record(rec, category, expected_size, kind, observed_at=None):
    """One product record -> one snapshot row plus its exceptions.

    `observed_at` is when THIS PAGE was actually retrieved. It rides on the
    row, because a rebuild from cache must not make an old observation look
    new: freshness downstream is judged from the observation, never from the
    run that assembled the file.
    """
    ex = []
    name = rec.get("name")
    sku = rec.get("sku")
    raw_size = rec.get("mattress_size")
    matched = None
    if kind == "mattress":
        size_id = size_id_for(raw_size)
        if size_id is None:
            # some mattress records omit `mattress_size`; the name still
            # carries it, and a name-derived size is recorded as such.
            size_id, matched = size_from_name(name)
    else:
        size_id, matched = size_from_name(name)
        raw_size = matched

    selling = to_minor(rec.get("final_price_without_tax"))
    regular = to_minor(rec.get("regular_price_without_tax"))
    ptype = product_type_of(name, kind)
    # The category may assert a type the NAME cannot carry. Recorded with its
    # provenance so a reviewer can weigh it exactly as `sizeSource` lets them
    # weigh a size: "name" is the product saying what it is, "category" is the
    # retailer's shelf saying it.
    ptype_source = "name" if ptype != "other" else None
    asserted = CATEGORY_PRODUCT_TYPE.get(category)
    if asserted and kind != "mattress":
        if ptype == "other":
            ptype, ptype_source = asserted, "category"
        elif ptype != asserted:
            ex.append(f"category-asserts-{asserted}-but-name-says-{ptype}")

    purl = rec.get("product_url")
    ukey = rec.get("url_key")
    if isinstance(purl, str) and purl.strip() and "/None" not in purl:
        evidence = {"type": "product-page", "url": purl.strip()}
    elif isinstance(ukey, str) and ukey.strip() and ukey.strip().lower() != "none":
        evidence = {"type": "product-page", "url": f"{BASE}/product/{ukey.strip()}"}
    else:
        evidence = {"type": "category-listing",
                    "url": f"{BASE}/catalog/{category}?display_mode=products"}
        ex.append("no-product-page-evidence-category-listing-only")

    if not isinstance(sku, str) or not sku.strip():
        ex.append("missing-sku")
    if selling is None:
        ex.append("no-exact-selling-price")
    if rec.get("display_price") is not True:
        ex.append("price-not-displayed")
    # `poa` is NOT "price on application": its observed values are '',
    # 'Low Stock' and 'Product Coming Soon' - a stock/status string. It is
    # deliberately NOT read: availability is not inferred from a listing, and
    # a stock state is not a price fact. `display_request_a_quote` is the
    # genuine quote-only signal.
    if rec.get("display_request_a_quote") is True:
        ex.append("quote-only-product")
    # `type_id` is ABSENT on many accessory records (verified 2026-09-20) and
    # its absence says nothing about the product. Only an explicit
    # `configurable` marks a variant PARENT, whose displayed price is a
    # "starting at" figure that changes with the page's size context - never
    # an exact variant price. Those must be resolved on the product page.
    if rec.get("type_id") == "configurable" or rec.get("has_options") is True:
        ex.append("configurable-parent-not-an-exact-variant")
    if size_id is None:
        # Only a product actually SOLD by mattress size is missing something.
        # A throw blanket, a pillow or a spray has no mattress size, and
        # flagging it would bury the real exceptions.
        if ptype in SIZE_REQUIRED:
            ex.append("no-resolvable-size")
    elif kind == "mattress" and expected_size and size_id != expected_size:
        ex.append(f"size-differs-from-category-{expected_size}")
    # "Set" only warns where a set would be MISTAKEN for the thing being
    # priced. For a mattress, "set" or "with foundation" means the figure is
    # not a mattress-only price - a real hazard. For a sheet set or a
    # comforter set the set IS the product, and the earlier blanket rule
    # wrongly flagged 59 legitimate accessories with a mattress-only warning.
    if kind == "mattress" and isinstance(name, str) and re.search(
            r"\bset\b|\bbundle\b|w/\s*found|with\s+foundation", name, re.I):
        ex.append("mattress-price-may-include-a-foundation-not-mattress-only")

    return {
        "kind": kind,
        # WHEN THIS PRICE WAS SEEN. Survives cache replay unchanged.
        "observedAt": observed_at,
        "family": (rec.get("collection_name") or rec.get("manufacturer")) if kind == "mattress"
                  else family_of(name, matched),
        "familyKey": family_key((rec.get("collection_name") or rec.get("manufacturer"))
                                if kind == "mattress" else family_of(name, matched)),
        "brand": rec.get("manufacturer"),
        "name": name,
        "size_raw": raw_size,
        "size_id": size_id,
        # Where the size came from, so a reviewer can weigh it: the record's
        # own `mattress_size` field, or parsed from the displayed name.
        "sizeSource": ("mattress_size" if (kind == "mattress" and size_id_for(rec.get("mattress_size")))
                       else ("name" if size_id else None)),
        "sku": sku,
        "entityId": rec.get("entity_id"),
        "modelNumber": rec.get("model_number"),
        # "name" = the product named its own type; "category" = the shelf did.
        "productTypeSource": ptype_source,
        # `final_price_without_tax` is the SELLING price; `regular_*` is the
        # crossed-out comparison. Both recorded; only the first is a price.
        "sellingAmountMinor": selling,
        "regularAmountMinor": regular,
        "currency": "USD",
        "scope": ("mattress-set" if (kind == "mattress" and any(
                      e.startswith("mattress-price-may-include") for e in ex))
                  else "mattress-only" if kind == "mattress"
                  else "accessory-set" if ptype in SET_IS_THE_PRODUCT
                  else "accessory-only"),
        "productType": ptype,
        "isMultiPieceSet": ptype in SET_IS_THE_PRODUCT,
        # EVIDENCE IS NEVER SYNTHESISED. A product URL is recorded only when
        # the record actually carries one (`product_url`, or a real non-empty
        # `url_key`). When it does not, the evidence is the CATEGORY LISTING
        # the record was read from, labelled as such - an earlier version of
        # this tool fabricated "/product/None" for 114 records and then
        # classified 74 of them clean, i.e. priced with a source link that
        # does not exist.
        "evidence": evidence,
        "sourceUrl": evidence["url"],
        # The retailer's own URL slug can name a DIFFERENT product than the
        # record does (observed: SKU 2031576 is "Chattam & Wells The Roma" but
        # its slug reads "restonic-angelina-extra-firm..."). The SKU suffix in
        # the slug still identifies the product, so this is a review aid, not
        # a rejection - but a reviewer clicking the link must not be surprised.
        "sourceUrlNote": slug_note(name, evidence),
        "foundInCategory": category,
        "exceptions": ex,
    }


def resolve_configurable(parent_row, kind, pause, log, cache_hours=0):
    """One configurable PARENT -> one row per purchasable child variant.

    Technique verified 2026-09-20: a parent's product page island carries the
    parent AND every child as full records in the same `productSlice.byId`.
    The parent's `attributes` entry whose `code == "size"` indexes children by
    option; each child holds its OWN absolute `final_price_without_tax`.

    THE RULE THAT MATTERS: the parent's own price is the CHEAPEST child's
    ("starting at"). Substituting it for a larger size understates that size
    by real money while looking plausible, so a child without a readable price
    is emitted WITHOUT a price and WITH an exception - never with the parent's.

    Returns (rows, problems). One HTTP request.
    """
    url = parent_row.get("evidence", {}).get("url")
    if not url or parent_row["evidence"].get("type") != "product-page":
        return [], [{"parentSku": parent_row.get("sku"), "problem": "no-product-page-to-drill"}]
    # A cached page is replayed WHOLE, with the instant it was actually
    # retrieved - never this run's clock. No network, so no pause either.
    hit = product_cache_read(url, cache_hours)
    cached = hit is not None
    if cached:
        by = hit["byId"]
        urls = hit.get("urls") or {}
        observed_at = hit.get("retrievedAt")
    else:
        status, text = fetch(url)
        if status != 200:
            return [], [{"parentSku": parent_row.get("sku"), "url": url,
                         "problem": f"http-{status}"}]
        observed_at = now_iso()
        data = island(text)
        if data is None:
            return [], [{"parentSku": parent_row.get("sku"), "url": url,
                         "problem": "no-next-data-island"}]
        try:
            ps = data["props"]["pageProps"]["initialState"]["productSlice"]
            by = ps["byId"]
            urls = ps.get("urls") or {}
        except Exception:  # noqa: BLE001
            return [], [{"parentSku": parent_row.get("sku"), "url": url,
                         "problem": "unexpected-island-shape"}]
        # Only here: 200, parsed, and the shape we expected. A refusal or a
        # broken page has already returned above without writing anything.
        product_cache_write(url, by, urls, observed_at)
    rev = {v: k for k, v in urls.items() if isinstance(v, str)}

    rows, problems = [], []
    # Every record carrying `attributes` on this page is a parent; harvesting
    # all of them turns one request into a whole colour family.
    parents = [(eid, r) for eid, r in by.items()
               if isinstance(r, dict) and isinstance(r.get("attributes"), dict) and r["attributes"]]
    if not parents:
        return [], [{"parentSku": parent_row.get("sku"), "url": url,
                     "problem": "no-parent-record-on-page"}]

    for eid, parent in parents:
        # The size dimension is found by what its OPTIONS SAY, not by the
        # attribute's code. Sheet sets use `code == "size"`, but mattress
        # parents do not, and requiring that code silently refused every
        # configurable mattress in the app's own assortment with
        # "no-size-attribute-on-parent". An attribute qualifies when EVERY one
        # of its option labels maps to a known mattress size, which cannot
        # collide with colour, piece-count or comfort attributes.
        size_attr_id, size_attr = None, None
        for aid, attr in parent["attributes"].items():
            if not isinstance(attr, dict):
                continue
            opts = attr.get("options") or []
            if not opts:
                continue
            labels = [o.get("label") for o in opts if isinstance(o, dict)]
            if not labels or any(not isinstance(x, str) for x in labels):
                continue
            if all(SIZE_IDS.get(x.strip().lower()) for x in labels):
                size_attr_id, size_attr = aid, attr
                if attr.get("code") == "size":
                    break   # an explicit size attribute wins outright
        # NOT EVERY CONFIGURABLE VARIES BY SIZE. The Bedgear protectors are
        # configurable by COLOUR: one Queen product page whose children are
        # the colours of that one size. Refusing those pages left every
        # protector with category-listing evidence only, which the preview
        # will not admit - so the app's Queen protector had a price nobody
        # could show. Drilling a non-size dimension is still worth doing: it
        # is how the exact purchasable simple product and its own product-page
        # URL are found.
        #
        # THE LINE THAT MATTERS: a non-size option label says NOTHING about
        # size, so nothing below may take a size from it. The child keeps the
        # size its own record carries, and the dimension is recorded so a
        # reviewer can see which axis was walked.
        dimension = "size"
        if size_attr is None:
            # Prefer an attribute the retailer itself calls `size` - one
            # unmappable option label (an odd spelling, a discontinued size)
            # disqualifies the strict test above but does not make the axis
            # something other than size. Only then fall back to another axis.
            usable = [(aid, attr) for aid, attr in parent["attributes"].items()
                      if isinstance(attr, dict) and (attr.get("options") or [])]
            usable.sort(key=lambda kv: 0 if kv[1].get("code") == "size" else 1)
            if usable:
                size_attr_id, size_attr = usable[0]
                dimension = size_attr.get("code") or "other"
        if size_attr is None:
            problems.append({"parentSku": parent.get("sku"), "parentEntityId": eid,
                             "url": url, "problem": "no-variant-attribute-on-parent"})
            continue
        options = size_attr.get("options") or []
        if not options:
            problems.append({"parentSku": parent.get("sku"), "parentEntityId": eid,
                             "url": url, "problem": "variant-attribute-has-no-options"})
            continue
        for opt in options:
            if not isinstance(opt, dict):
                continue
            for child_id in (opt.get("products") or []):
                child = by.get(str(child_id))
                # A hollow {} stub is ABSENT, not a product.
                if not isinstance(child, dict) or not child:
                    problems.append({"parentEntityId": eid, "childEntityId": child_id,
                                     "url": url, "problem": "child-entity-missing-from-island"})
                    continue
                # The observation is THIS PAGE's retrieval instant - the
                # cached one on a replay - so a rebuild never ages a price
                # forward. (Before the drill cache these rows carried no
                # observation at all.)
                row = extract_record(child, parent_row.get("foundInCategory", ""),
                                     None, kind, observed_at)
                label = opt.get("label")
                own = (child.get("attribute_labels") or {}).get(size_attr_id)
                if own is not None and label is not None and str(own) != str(label):
                    row["exceptions"].append("variant-option-label-disagrees-with-option")
                if dimension == "size":
                    # the child's size comes from the OPTION label, cross-checked
                    # against the child's own attribute_labels
                    sid = SIZE_IDS.get(str(label).strip().lower()) if isinstance(label, str) else None
                    if sid:
                        row["size_id"] = sid
                        row["size_raw"] = label
                        row["sizeSource"] = "configurable-size-option"
                        row["exceptions"] = [e for e in row["exceptions"]
                                             if e != "no-resolvable-size"]
                    elif "no-resolvable-size" not in row["exceptions"]:
                        row["exceptions"].append("no-resolvable-size")
                else:
                    # A colour (or any non-size) option tells us nothing about
                    # size: whatever extract_record read from the child's own
                    # record stands, including its absence.
                    row["optionDimension"] = dimension
                    row["optionLabel"] = label if isinstance(label, str) else None
                # a child is not a parent: drop the inherited parent flag
                row["exceptions"] = [e for e in row["exceptions"]
                                     if e != "configurable-parent-not-an-exact-variant"]
                if child.get("type_id") == "configurable":
                    row["exceptions"].append("nested-configurable-child-unresolved")
                slug = rev.get(str(child_id))
                if slug:
                    row["evidence"] = {"type": "product-page", "url": f"{BASE}/product/{slug}"}
                else:
                    row["evidence"] = {"type": "configurable-parent-page", "url": url}
                    row["exceptions"] = [e for e in row["exceptions"]
                                         if e != "no-product-page-evidence-category-listing-only"]
                row["sourceUrl"] = row["evidence"]["url"]
                row["parentEntityId"] = eid
                row["parentSku"] = parent.get("sku")
                row["optionAttributeId"] = size_attr_id
                row["optionValueId"] = opt.get("id")
                row["resolvedFrom"] = "product-page-attributes"
                rows.append(row)
    log(f"    {'replayed' if cached else 'drilled '} {url.rsplit('/', 1)[-1][:44]}: "
        f"{len(rows)} variants, {len(problems)} problems"
        + (f" (cached {observed_at})" if cached else ""))
    # Pacing is for the SITE. A replay made no request, so it waits for
    # nothing - which is what makes a cached rebuild cheap.
    if not cached:
        time.sleep(pause)
    return rows, problems


# ---------------------------------------------------------------------------
# RETRIEVAL CACHE. The site throttles bursts hard: a long run earns a 403 that
# takes minutes to clear, and re-fetching categories that already succeeded
# both wastes the budget and makes the next refusal more likely. Each
# category+page that succeeds is written to `demo/price-snapshot/.cache/` with
# its retrieval timestamp, and a later run REUSES it instead of re-fetching.
# Only missing or previously failed work goes back to the network.
CACHE_DIR = os.path.join(OUT_DIR, ".cache")


def cache_path(category, page):
    safe = re.sub(r"[^A-Za-z0-9_.-]+", "_", f"{category}-p{page}")
    return os.path.join(CACHE_DIR, safe + ".json")


def cache_read(category, page, max_age_hours):
    p = cache_path(category, page)
    if not os.path.exists(p):
        return None
    try:
        doc = json.load(io.open(p, encoding="utf-8"))
    except Exception:  # noqa: BLE001 - a corrupt cache entry is simply a miss
        return None
    stamp = doc.get("retrievedAt")
    try:
        age = (_dt.datetime.now(_dt.timezone.utc) - _dt.datetime.fromisoformat(stamp)).total_seconds()
    except Exception:  # noqa: BLE001
        return None
    if age > max_age_hours * 3600:
        return None
    return doc


def cache_write(category, page, rows, page_count, retrieved_at=None):
    os.makedirs(CACHE_DIR, exist_ok=True)
    doc = {"category": category, "page": page, "pageCount": page_count,
           "retrievedAt": retrieved_at or now_iso(), "records": rows}
    with open(cache_path(category, page), "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)


# ---------------------------------------------------------------------------
# PRODUCT-PAGE CACHE. The category cache above never covered the DRILL: every
# rebuild re-fetched all 72 configurable parents, which is what earns the 403s
# and is why two consecutive runs resolved DIFFERENT subsets - one got the
# protector's product page, the next got the base's, and neither got both.
#
# Caching each drilled page fixes that without combining anything by hand. A
# later run replays each page whole, from its own stored response, carrying
# its OWN retrieval instant - so records observed at different times coexist
# exactly as cached category records already do, each keeping its real source,
# date and identity. Nothing is merged across pages and no attribute is ever
# assembled from two sources.
#
# WHAT IS AND IS NOT CACHED. Only a COMPLETE, SUCCESSFUL response: HTTP 200,
# a parsed island, and the expected `productSlice` shape. A 403, a transport
# failure, an unparseable page or an unexpected shape writes NOTHING, so a
# refusal can never be replayed as though it were evidence.
#
# It cannot reach backwards: pages fetched before this cache existed were
# never saved, so the first run after this change still fetches them.
PRODUCT_CACHE_PREFIX = "product__"


def product_cache_path(url):
    """A stable key per product URL, in its own namespace.

    The digest makes it stable and collision-free for any URL; the slug keeps
    it readable. The `product__` prefix cannot collide with a category entry,
    which is always `<category>-p<n>.json`.
    """
    digest = hashlib.sha256((url or "").encode("utf-8")).hexdigest()[:16]
    slug = re.sub(r"[^A-Za-z0-9_.-]+", "_", (url or "").rsplit("/", 1)[-1])[:60]
    return os.path.join(CACHE_DIR, f"{PRODUCT_CACHE_PREFIX}{slug}__{digest}.json")


def product_cache_read(url, max_age_hours):
    """The cached page, or None. Never raises: a corrupt entry is a miss."""
    if not max_age_hours or max_age_hours <= 0:
        return None
    p = product_cache_path(url)
    if not os.path.exists(p):
        return None
    try:
        doc = json.load(io.open(p, encoding="utf-8"))
        age = (_dt.datetime.now(_dt.timezone.utc)
               - _dt.datetime.fromisoformat(doc["retrievedAt"])).total_seconds()
    except Exception:  # noqa: BLE001 - a corrupt cache entry is simply a miss
        return None
    if age > max_age_hours * 3600:
        return None
    if not isinstance(doc.get("byId"), dict):
        return None
    return doc


def product_cache_write(url, by, urls, retrieved_at):
    """Record one COMPLETE successful drill page. Callers must not call this
    for a non-200, an unparseable island or an unexpected shape."""
    os.makedirs(CACHE_DIR, exist_ok=True)
    doc = {"url": url, "retrievedAt": retrieved_at or now_iso(),
           "byId": by, "urls": urls}
    with open(product_cache_path(url), "w", encoding="utf-8", newline="\n") as f:
        json.dump(doc, f, indent=1, ensure_ascii=False)


def collect(category, expected_size, kind, max_pages, pause, log, cache_hours):
    rows, problems = [], []
    page = 1
    seen_pages = set()
    while page <= max_pages:
        # `page=N` is the working pagination parameter, verified 2026-09-20:
        # `p=2`, `curPage=2` and `offset=24` all silently return page 1's
        # records again, which would have captured half the catalog while
        # looking successful. `page=2` returns genuinely different entity_ids.
        url = f"{BASE}/catalog/{category}?display_mode=products" + (f"&page={page}" if page > 1 else "")
        hit = cache_read(category, page, cache_hours) if cache_hours > 0 else None
        if hit is not None:
            cached = hit.get("records")
            if cached is not None:
                # Re-extract so today's RULES apply, but carry the ORIGINAL
                # retrieval instant so today's CLOCK does not. Replaying an
                # unchanged cache must never extend a price's freshness.
                hit_rows = [extract_record(rec, category, expected_size, kind,
                                           hit.get("retrievedAt"))
                            for rec in cached]
            else:
                # legacy entry holding already-extracted rows
                hit_rows = hit.get("rows") or []
                for _r in hit_rows:
                    _r.setdefault("observedAt", hit.get("retrievedAt"))
            rows.extend(hit_rows)
            log(f"  {category} p{page}: {len(hit_rows)} records (cached {hit['retrievedAt']}"
                + ("" if cached is not None else ", legacy row-cache") + ")")
            count = hit.get("pageCount")
            seen_pages.add(page)
            if not isinstance(count, int) or page >= count:
                break
            page += 1
            continue
        status, text = fetch(url)
        if status != 200:
            problems.append({"category": category, "page": page, "url": url,
                             "problem": f"http-{status}", "detail": text[:200]})
            break
        data = island(text)
        if data is None:
            problems.append({"category": category, "page": page, "url": url,
                             "problem": "no-next-data-island"})
            break
        try:
            st = data["props"]["pageProps"]["initialState"]
            by = st["productSlice"]["byId"]
            cat = st.get("catalogSlice", {}) or {}
        except Exception:  # noqa: BLE001
            problems.append({"category": category, "page": page, "url": url,
                             "problem": "unexpected-island-shape"})
            break
        count = cat.get("pageCount")
        log(f"  {category} p{page}: {len(by)} records (pageCount={count})")
        if not by:
            break
        raw = list(by.values())
        fetched_at = now_iso()
        rows.extend(extract_record(rec, category, expected_size, kind, fetched_at)
                    for rec in raw)
        # Cache the RAW records, not the extracted rows: an extractor
        # correction must reapply to cached pages, or a replay silently
        # preserves the defect the correction fixed.
        cache_write(category, page, raw, count, fetched_at)
        seen_pages.add(page)
        if not isinstance(count, int) or page >= count:
            break
        page += 1
        time.sleep(pause)
    return rows, problems


def assortment_tokens():
    """Distinctive words from the app's APPROVED lineup, used to decide which
    configurable parents are worth a request. Reading the shipped catalog here
    is read-only and never modifies it."""
    toks = set()
    try:
        import csv as _csv
        with io.open(os.path.join(REPO, "data", "mattresses.csv"), encoding="utf-8") as f:
            for r in _csv.DictReader(f):
                for field in (r.get("brand"), r.get("subBrand"), r.get("name")):
                    for t in re.split(r"[^A-Za-z0-9]+", (field or "").lower()):
                        if len(t) >= 4:
                            toks.add(t)
        with io.open(os.path.join(REPO, "data", "accessories.json"), encoding="utf-8") as f:
            for a in json.load(f):
                for t in re.split(r"[^A-Za-z0-9]+", (a.get("name", {}).get("en") or "").lower()):
                    if len(t) >= 4:
                        toks.add(t)
    except Exception as e:  # noqa: BLE001 - a missing catalog must not invent a filter
        print(f"  (could not read the app catalog for targeting: {e!r})", flush=True)
        return set()
    return toks - {"mattress", "base", "pillow", "cool", "standard", "performance",
                   "memory", "foam", "power", "massage", "adjustable"}


def relevant_to_assortment(row, app_tokens):
    if not app_tokens:
        return False
    hay = " ".join(str(row.get(k) or "") for k in ("name", "family", "brand")).lower()
    words = {t for t in re.split(r"[^a-z0-9]+", hay) if len(t) >= 4}
    return bool(words & app_tokens)


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max-pages", type=int, default=6,
                    help="page ceiling per category (default 6)")
    ap.add_argument("--pause", type=float, default=8.0,
                    help="seconds between requests (default 8)")
    ap.add_argument("--only", default="", help="limit to one category slug (debugging)")
    ap.add_argument("--drill", default="assortment",
                    choices=("assortment", "all", "none"),
                    help="which configurable parents to resolve into variants: "
                         "those relevant to the app assortment (default), all, or none")
    ap.add_argument("--cache-hours", type=float, default=24.0,
                    help="reuse a cached category page younger than this many "
                         "hours (0 disables the cache and re-fetches everything)")
    ap.add_argument("--out", default=OUT_DIR)
    args = ap.parse_args(argv)

    def log(m):
        print(m, flush=True)

    started = now_iso()
    log("NON-SHIPPING price extraction. Nothing written here is verified or approved.")
    log(f"started {started}")

    rows, problems = [], []
    targets = [(c, s, "mattress") for c, s in MATTRESS_CATEGORIES]
    targets += [(c, None, "accessory") for c, _t in ACCESSORY_CATEGORIES]
    if args.only:
        targets = [t for t in targets if t[0] == args.only]

    for category, expected, kind in targets:
        log(f"{category} ({kind})")
        r, p = collect(category, expected, kind, args.max_pages, args.pause, log,
                       args.cache_hours)
        rows.extend(r)
        problems.extend(p)
        time.sleep(args.pause)

    # ---- configurable parents -> exact variants -------------------------
    # The app's APPROVED assortment comes first: a parent is drilled when it
    # plausibly serves that assortment, so catalog-wide expansion never
    # crowds out the products DreamFinder actually sells.
    drill_problems = []
    if args.drill != "none":
        app_tokens = assortment_tokens()
        parents = [r for r in rows
                   if "configurable-parent-not-an-exact-variant" in r["exceptions"]]
        if args.drill == "assortment":
            wanted = [r for r in parents if relevant_to_assortment(r, app_tokens)]
        else:
            wanted = parents
        log(f"configurable parents: {len(parents)} found, {len(wanted)} to drill "
            f"(--drill {args.drill})")
        seen_urls = set()
        for pr in wanted:
            u = pr.get("evidence", {}).get("url")
            if not u or u in seen_urls:
                continue
            seen_urls.add(u)
            child_rows, probs = resolve_configurable(pr, pr["kind"], args.pause, log,
                                                     args.cache_hours)
            rows.extend(child_rows)
            drill_problems.extend(probs)
            if child_rows:
                pr["exceptions"].append("resolved-into-variants")

    # de-duplicate on (sku, size_id): the same variant can appear in more than
    # one category. Identical rows collapse; a genuine disagreement is flagged.
    # Prefer the better-evidenced row for the same variant: a child resolved
    # from a product page beats the same sku seen only in a category listing,
    # so drilling can only improve provenance, never lose it.
    def _rank(r):
        if r.get("resolvedFrom"):
            return 2
        return 1 if r.get("evidence", {}).get("type") == "product-page" else 0

    by_key, conflicts = {}, []
    for row in rows:
        key = (row["sku"], row["size_id"])
        prior = by_key.get(key)
        if prior is None:
            by_key[key] = row
        elif _rank(row) > _rank(prior):
            if prior["sellingAmountMinor"] != row["sellingAmountMinor"]:
                conflicts.append({"sku": row["sku"], "size_id": row["size_id"],
                                  "a": prior["sellingAmountMinor"],
                                  "b": row["sellingAmountMinor"],
                                  "categories": [prior.get("foundInCategory"),
                                                 row.get("foundInCategory")]})
            by_key[key] = row
        elif prior["sellingAmountMinor"] != row["sellingAmountMinor"]:
            conflicts.append({"sku": row["sku"], "size_id": row["size_id"],
                              "a": prior["sellingAmountMinor"], "b": row["sellingAmountMinor"],
                              "categories": [prior["foundInCategory"], row["foundInCategory"]]})
    # Applies to rows that came from a LEGACY row-cache as well as fresh ones.
    for r in by_key.values():
        if r.get("sourceUrlNote") is None:
            r["sourceUrlNote"] = slug_note(r.get("name"), r.get("evidence") or {})
    variants = sorted(by_key.values(),
                      key=lambda r: (r["kind"], r["size_id"] or "zz", r["name"] or ""))

    clean = [v for v in variants if not v["exceptions"] and v["sellingAmountMinor"] is not None]
    snapshot = {
        "_meta": {
            "status": "UNVERIFIED-WEBSITE-EXTRACTION",
            "note": ("Website-sourced, pending owner verification. NOT approved pricing, "
                     "NOT a production input. `final_price_without_tax` is the selling "
                     "price; `regular_price_without_tax` is the crossed-out comparison "
                     "and is recorded separately. Size comes from each record's own "
                     "`mattress_size`, never from the category it was found in, and no "
                     "size is inferred from another size."),
            "source": BASE,
            "technique": "Next.js __NEXT_DATA__ island on size-specific catalog pages",
            # When this FILE was assembled. Says nothing about how old the
            # prices in it are.
            "generatedAt": now_iso(),
            # The oldest and newest OBSERVATION in the file. A rebuild from an
            # unchanged cache leaves both exactly where they were.
            "observedFrom": min([v["observedAt"] for v in variants
                                 if v.get("observedAt")] or [started]),
            "observedTo": max([v["observedAt"] for v in variants
                               if v.get("observedAt")] or [started]),
            "runStartedAt": started,
            "tool": "tools/fetch_lacks_prices.py",
            "counts": {"variants": len(variants), "clean": len(clean),
                       "withExceptions": len(variants) - len(clean),
                       "categoryProblems": len(problems), "priceConflicts": len(conflicts),
            "variantResolutionProblems": len(drill_problems)},
        },
        "variants": variants,
        "categoryProblems": problems,
        "variantResolutionProblems": drill_problems,
        "priceConflicts": conflicts,
    }

    os.makedirs(args.out, exist_ok=True)
    jpath = os.path.join(args.out, "snapshot.json")

    # A PARTIAL RUN MUST NEVER REPLACE A BETTER ONE. A refused category yields
    # fewer variants, not a truer picture, and silently overwriting would turn
    # a rate-limit into apparent catalog shrinkage. A run that captured fewer
    # variants than the snapshot already on disk is written beside it as
    # `snapshot.partial.json` and the good one is left alone.
    prior_n = None
    if os.path.exists(jpath):
        try:
            prior_n = len(json.load(io.open(jpath, encoding="utf-8")).get("variants") or [])
        except Exception:  # noqa: BLE001
            prior_n = None
    demoted = prior_n is not None and len(variants) < prior_n
    target = os.path.join(args.out, "snapshot.partial.json") if demoted else jpath
    with open(target, "w", encoding="utf-8", newline="\n") as f:
        json.dump(snapshot, f, indent=2, ensure_ascii=False)
        f.write("\n")
    if demoted:
        log("")
        log(f"  THIS RUN IS SMALLER than the snapshot on disk "
            f"({len(variants)} < {prior_n} variants) - almost certainly a refused "
            f"category, not a smaller catalog.")
        log(f"  The existing snapshot was KEPT. This run was written to "
            f"{os.path.relpath(target, REPO)} for inspection.")
        log("  Re-run when access recovers; cached pages make it cheap.")
    else:
        write_review(snapshot, os.path.join(args.out, "snapshot.md"))

    log("")
    log(f"variants {len(variants)} | clean {len(clean)} | "
        f"exceptions {len(variants) - len(clean)} | category problems {len(problems)} | "
        f"price conflicts {len(conflicts)}")
    log(f"wrote {os.path.relpath(target, REPO)}")
    return 0


def write_review(snap, path):
    """A snapshot a human can actually check against the site, without retyping."""
    m = snap["_meta"]
    L = ["# Website price snapshot - UNVERIFIED",
         "",
         f"- **Status:** {m['status']}",
         f"- **Source:** {m['source']} ({m['technique']})",
         f"- **Prices observed:** {m.get('observedFrom')} -> {m.get('observedTo')}",
         f"- **File generated:** {m.get('generatedAt')} "
         f"(generation does not refresh an observation)",
         f"- **Counts:** {m['counts']}",
         "",
         "Nothing in this file is approved pricing or a production input. "
         "`selling` is the site's `final_price_without_tax`; `regular` is the "
         "crossed-out comparison price and is never the selling price.",
         ""]
    for kind in ("mattress", "accessory"):
        group = [v for v in snap["variants"] if v["kind"] == kind]
        if not group:
            continue
        L += [f"## {kind} variants ({len(group)})", ""]
        L += ["| size | name | sku | selling | regular | source |",
              "|---|---|---|---|---|---|"]
        for v in group:
            sell = f"${v['sellingAmountMinor']/100:,.2f}" if v["sellingAmountMinor"] is not None else "**none**"
            reg = f"${v['regularAmountMinor']/100:,.2f}" if v["regularAmountMinor"] is not None else "-"
            flag = " ⚠️" if v["exceptions"] else ""
            L.append(f"| {v['size_id'] or v['size_raw'] or '-'} | {v['name']}{flag} | "
                     f"`{v['sku']}` | {sell} | {reg} | [page]({v['sourceUrl']}) |")
        L.append("")
    exc = [v for v in snap["variants"] if v["exceptions"]]
    L += [f"## Exceptions ({len(exc)}) - do not treat these as prices", ""]
    if exc:
        L += ["| name | sku | exceptions |", "|---|---|---|"]
        for v in exc:
            L.append(f"| {v['name']} | `{v['sku']}` | {', '.join(v['exceptions'])} |")
    else:
        L.append("None.")
    L.append("")
    if snap["categoryProblems"]:
        L += ["## Category problems", ""]
        for p in snap["categoryProblems"]:
            who = p.get("category") or p.get("parentSku") or p.get("url") or "?"
            L.append(f"- `{who}` page {p.get('page', '-')}: {p.get('problem')}")
        L.append("")
    if snap.get("variantResolutionProblems"):
        L += [f"## Variant-resolution problems ({len(snap['variantResolutionProblems'])})",
              "",
              "Configurable parents whose children could not be resolved into exact "
              "variants. No price is emitted for these - the parent's own "
              "\"starting at\" figure is never substituted.", ""]
        for p in snap["variantResolutionProblems"][:60]:
            who = p.get("parentSku") or p.get("parentEntityId") or "?"
            L.append(f"- `{who}`: {p.get('problem')}"
                     + (f" ([page]({p['url']}))" if p.get("url") else ""))
        L.append("")
    if snap["priceConflicts"]:
        L += ["## Price conflicts (same variant, two categories, two prices)", ""]
        for c in snap["priceConflicts"]:
            L.append(f"- `{c['sku']}` {c['size_id']}: {c['a']} vs {c['b']} in {c['categories']}")
        L.append("")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(L))


if __name__ == "__main__":
    sys.exit(main())
