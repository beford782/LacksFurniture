#!/usr/bin/env python3
"""Map DreamFinder's approved assortment onto website-sourced purchasable variants.

  app product -> website family -> purchasable variant -> SKU -> price -> evidence

This tool NEVER changes the app's lineup. It reads `data/mattresses.csv` and
`data/accessories.json` (the approved assortment) and
`demo/price-snapshot/snapshot.json` (unverified website capture) and writes
only `demo/price-snapshot/mapping.{json,md}`.

WHAT A NAME MATCH IS, AND IS NOT
---------------------------------
Shared words are CANDIDATE DISCOVERY. They are not proof that two records are
the same product. Identity is asserted only from evidence that can distinguish
one purchasable variant from another:

  sku                 the strongest link. The app catalog carries none, but the
                      2026-07-30 discovery file supplies a QUEEN SKU per product;
                      where that exact SKU is still present in the current
                      snapshot it is a direct identity link (25 of 26 products
                      reproduce). It is never used for another size.
  brand               must agree
  model token         a distinctive word both sides carry
  firmness            must agree exactly; "Firm" never satisfies "Extra Firm"
  generation          II / III / 2.0 markers must agree - the website lineup
                      moves and the app lineup is approved; a silent match
                      across a generation boundary prices the wrong bed
  construction        hybrid / euro-top / tight-top / box-top, when both state it
  size                the variant's own size, never inferred from another size

THREE SEPARATE CONCEPTS, DELIBERATELY NOT COLLAPSED
----------------------------------------------------
  1. IDENTITY EVIDENCE   is this app product the same thing as this website
                         variant? Decided here, from evidence.
  2. OWNER VERIFICATION   has Blake checked the snapshot and this mapping?
                         Recorded in verified-mapping.json. Independent of (1).
  3. PRODUCTION ACTIVATION  may a real customer see this? Governed entirely by
                         the pricing contract, and off regardless of (1) or (2).

An automated match with sufficient identity evidence MAY feed the isolated,
clearly-labelled preview before owner verification - that is what the preview
is for. It may never feed production. Requiring owner verification for every
product before anything can be previewed would turn the whole catalog into a
manual mapping task, which is not the point.

STATUS NAMES
------------
  owner-verified     Blake confirmed this exact variant (concept 2)
  preview-eligible   identity evidence is sufficient for the isolated preview
                     (concept 1). Labelled pending verification wherever shown.
  machine-ambiguous  more than one candidate survives; nothing is chosen
  variant-conflict   two different SKUs claim the same family AND size
  unresolved         no candidate, or required evidence is missing

HISTORICAL DISCOVERY EVIDENCE
------------------------------
`incoming/lacks_catalog_selection.json` carries, per app product, the website
name and the Queen SKU observed on 2026-07-30. That is a LEAD, not a fact about
today: it is used to FIND the current variant and to corroborate identity, and
never as a price, never as proof a SKU is still sold, and never to infer any
other size. A lead SKU counts as evidence only when that exact SKU is present
in the CURRENT snapshot; otherwise it is recorded as a lead that did not
reproduce.
"""
import csv
import io
import json
import os
import re
import sys
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
OUT_DIR = os.path.join(REPO, "demo", "price-snapshot")
SNAP = os.path.join(OUT_DIR, "snapshot.json")
VERIFIED = os.path.join(OUT_DIR, "verified-mapping.json")

SIZES = ["twin", "twin_xl", "full", "queen", "king", "cal_king"]

FIRMNESS = [
    ("extra firm", "extra_firm"), ("cushion firm", "cushion_firm"),
    ("ultra plush", "plush"), ("luxury firm", "luxury_firm"),
    ("plush", "plush"), ("medium", "medium"), ("firm", "firm"), ("soft", "soft"),
]
CONSTRUCTION = [("hybrid", "hybrid"), ("euro top", "euro_top"), ("eurotop", "euro_top"),
                ("tight top", "tight_top"), ("box top", "box_top"),
                ("pillow top", "pillow_top"), ("wrapped coil", "wrapped_coil"),
                ("memory foam", "memory_foam"), ("latex", "latex")]
GEN = re.compile(r"\b(ii|iii|iv|2\.0|3\.0|4\.0)\b", re.I)
DIMS = re.compile(r"\b\d+(\.\d+)?\s*\"?\b")

BRAND_WORDS = {"bedgear", "tempur", "pedic", "tempurpedic", "restonic", "serta",
               "sealy", "beautyrest", "simmons", "stearns", "purple", "malouf",
               "chattam", "wells", "spring", "air", "genesis", "bedtech",
               "signature", "design", "ashley", "hallmart", "collectibles"}
NOISE_WORDS = BRAND_WORDS | {
    "the", "mattress", "collection", "kingdom", "and", "by", "with", "set",
    "performance", "standard", "cool", "power", "massage", "adjustable",
    "base", "foundation", "protector", "pillow", "sheet", "sheets", "topper",
    "comforter", "duvet", "ensemble", "blanket", "throw", "pc", "piece", "pieces",
} | {k for _, k in FIRMNESS} | {w for w, _ in FIRMNESS for w in w.split()} \
  | {w for w, _ in CONSTRUCTION for w in w.split()}

# App accessory id prefix -> the website productType it must be
APP_ACCESSORY_TYPE = {"base": "base", "foundation": "base", "pillow": "pillow",
                      "protector": "protector", "sheets": "sheets", "topper": "topper"}
# Types genuinely NOT sold by mattress size - absence of a size is correct,
# not a defect, and must not exclude the product.
SIZE_INDEPENDENT = {"pillow", "throw", "other"}


def norm(s):
    s = re.sub(r"[^a-z0-9. ]+", " ", (s or "").lower())
    return re.sub(r"\s{2,}", " ", s).strip()


def firmness_of(*texts):
    for t in texts:
        low = norm(t)
        for word, key in FIRMNESS:
            if re.search(r"\b" + word.replace(" ", r"\s+") + r"\b", low):
                return key
    return None


def construction_of(text):
    low = norm(text)
    return {key for word, key in CONSTRUCTION
            if re.search(r"\b" + word.replace(" ", r"\s+") + r"\b", low)}


def generation_of(text):
    return {m.group(0).lower() for m in GEN.finditer(DIMS.sub(" ", text or ""))}


def model_tokens(*parts):
    out = set()
    for p in parts:
        for tok in norm(DIMS.sub(" ", p or "")).split():
            if tok in NOISE_WORDS or len(tok) < 3 or tok.replace(".", "").isdigit():
                continue
            out.add(tok)
    return out


def brand_key(b):
    n = norm(b).replace("&", "and")
    return n.split()[0] if n else ""


SELECTION = os.path.join(REPO, "incoming", "lacks_catalog_selection.json")


def load_leads():
    """app id -> historical discovery lead. Never a price, never a fact."""
    leads = {}
    if not os.path.exists(SELECTION):
        return leads
    try:
        doc = json.load(io.open(SELECTION, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print(f"  (discovery leads unreadable: {e!r})")
        return leads
    for row in doc.get("mattresses") or []:
        if isinstance(row, dict) and isinstance(row.get("id"), str):
            leads[row["id"]] = {
                "siteName": row.get("siteName"),
                # the Queen SKU seen on 2026-07-30. A LEAD.
                "historicalQueenSku": row.get("sku"),
                "observedAt": (doc.get("_meta") or {}).get("retrievedAt")
                               or (doc.get("_meta") or {}).get("date") or "2026-07-30",
            }
    acc = {}
    for row in doc.get("accessories") or []:
        if isinstance(row, dict) and row.get("name"):
            acc[norm(row["name"])] = {"historicalSku": row.get("sku"),
                                      "historicalName": row.get("name")}
    leads["__accessories__"] = acc
    return leads


def load_verified():
    if not os.path.exists(VERIFIED):
        return {}
    try:
        return json.load(io.open(VERIFIED, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001 - a broken file must not fake verification
        print(f"  (verified-mapping.json unreadable, treating as empty: {e!r})")
        return {}


def score_mattress(app, v, lead=None):
    """Evidence for one app product vs one website variant. Returns (legs, hard_fail)."""
    legs = {}
    lead = lead or {}
    ab, vb = brand_key(app["brand"]), brand_key(v.get("brand"))
    legs["brand"] = ("match" if ab and vb and (ab.startswith(vb) or vb.startswith(ab))
                     else ("absent" if not (ab and vb) else "mismatch"))

    # The historical site name is a far better source of distinctive model
    # words than the app's short display name ("The Roma" vs "Chattam & Wells
    # The Roma 16\" Firm Euro-Top Queen Mattress"). It is a LEAD: it widens the
    # words we look for, and never by itself decides anything.
    app_models = model_tokens(app["name"], app["subBrand"], lead.get("siteName") or "")
    site_models = model_tokens(v.get("name"), v.get("family"))
    shared = sorted(app_models & site_models)
    legs["model"] = {"shared": shared,
                     "appOnly": sorted(app_models - site_models),
                     "siteOnly": sorted(site_models - app_models)}

    af = firmness_of(app["firmnessLabel"], app["name"])
    vf = firmness_of(v.get("name") or "")
    legs["firmness"] = ("absent" if not (af and vf) else
                        "match" if af == vf else "mismatch")

    ag, vg = generation_of(app["name"] + " " + app["subBrand"]), generation_of(v.get("name"))
    legs["generation"] = ("match" if ag == vg else
                          ("absent" if not ag and not vg else "differs"))
    legs["generationDetail"] = {"app": sorted(ag), "site": sorted(vg)}

    ac, vc = construction_of(app["name"]), construction_of(v.get("name") or "")
    legs["construction"] = ("absent" if not ac or not vc else
                            "match" if ac & vc else "mismatch")
    legs["constructionDetail"] = {"app": sorted(ac), "site": sorted(vc)}

    # SKU evidence. The app catalog carries no SKU, but the 2026-07-30
    # discovery file does - for QUEEN only. When that exact SKU is still
    # present in the CURRENT snapshot it corroborates identity for that one
    # variant. It is never assumed current, never used for another size, and
    # its historical PRICE is never touched.
    hsku = lead.get("historicalQueenSku")
    if hsku and v.get("sku") and str(v["sku"]) == str(hsku):
        legs["skuLink"] = "historical-queen-sku-present-in-current-snapshot"
    elif hsku:
        legs["skuLink"] = "app-catalog-has-no-sku; historical lead did not match this variant"
    else:
        legs["skuLink"] = "unavailable-no-sku-on-either-side"
    legs["size"] = v.get("size_id")

    hard = (legs["brand"] == "mismatch" or legs["firmness"] == "mismatch"
            or legs["construction"] == "mismatch" or not shared)
    return legs, hard


def tier_of(legs):
    """How much identity evidence this candidate actually carries.

    `sku` - the historical Queen SKU is still present on this exact variant.
            That is a direct identity link, and it stands even when the
            website has since renamed or re-generationed the product.
    `strong` - brand, a distinctive model word, firmness and generation all
            agree. Enough for the isolated preview.
    `weak` - something disagrees or is missing. Never preview-eligible.
    """
    if legs.get("skuLink", "").startswith("historical-queen-sku-present"):
        return "sku"
    if legs["brand"] != "match" or not legs["model"]["shared"]:
        return "weak"
    if legs["firmness"] != "match":
        return "weak"
    if legs["generation"] == "differs":
        return "weak"
    return "strong"


def build():
    if not os.path.exists(SNAP):
        print(f"missing {SNAP}; run tools/fetch_lacks_prices.py first")
        return 2
    snap = json.load(io.open(SNAP, encoding="utf-8"))
    variants = [v for v in snap["variants"] if v.get("sellingAmountMinor") is not None]
    verified = load_verified()
    leads = load_leads()
    acc_leads = leads.get("__accessories__") or {}
    rows = list(csv.DictReader(io.open(os.path.join(REPO, "data", "mattresses.csv"),
                                       encoding="utf-8")))
    acc = json.load(io.open(os.path.join(REPO, "data", "accessories.json"),
                            encoding="utf-8"))

    # ------------------------------------------------------------ mattresses
    mattresses = []
    for app in rows:
        per_size = {}
        for size in SIZES:
            vkey = f"{app['id']}:{size}"
            if vkey in verified:
                per_size[size] = dict(verified[vkey], status="owner-verified")
                continue
            lead = leads.get(app["id"]) or {}
            cands = []
            for v in variants:
                if v["kind"] != "mattress" or v.get("size_id") != size:
                    continue
                legs, hard = score_mattress(app, v, lead)
                # a direct SKU link survives a soft disagreement elsewhere -
                # the website renames products, and the SKU is the identity.
                if hard and not legs.get("skuLink", "").startswith("historical-queen-sku-present"):
                    continue
                cands.append({"sku": v["sku"], "name": v["name"],
                              "sellingAmountMinor": v["sellingAmountMinor"],
                              "regularAmountMinor": v.get("regularAmountMinor"),
                              "evidence": v.get("evidence"),
                              # WHEN this price was observed - carried through
                              # so the preview judges freshness on the
                              # observation, never on when a file was built.
                              "observedAt": v.get("observedAt"),
                              "scope": v.get("scope"),
                              "tier": tier_of(legs), "legs": legs})
            # A direct SKU link outranks a name-and-attribute match: if exactly
            # one candidate carries the historical SKU, it IS the product.
            by_sku = [c for c in cands if c["tier"] == "sku"]
            strong = [c for c in cands if c["tier"] == "strong"]
            best = by_sku if len(by_sku) == 1 else strong
            if not cands:
                per_size[size] = {"status": "unresolved", "reason": "no-candidate"}
            elif len(by_sku) > 1:
                per_size[size] = {"status": "variant-conflict",
                                  "reason": "more than one current variant carries the historical SKU",
                                  "candidates": by_sku[:6]}
            elif len(best) == 1:
                per_size[size] = dict(best[0], status="preview-eligible")
            elif len(best) > 1:
                per_size[size] = {"status": "machine-ambiguous",
                                  "candidateCount": len(best), "candidates": best[:6]}
            else:
                per_size[size] = {"status": "machine-ambiguous",
                                  "candidateCount": len(cands),
                                  "note": "no candidate met every evidence leg",
                                  "candidates": cands[:6]}
        lead = leads.get(app["id"]) or {}
        mattresses.append({
            "appId": app["id"], "appName": app["name"], "brand": app["brand"],
            "subBrand": app["subBrand"], "firmnessLabel": app["firmnessLabel"],
            "discoveryLead": {
                "siteName": lead.get("siteName"),
                "historicalQueenSku": lead.get("historicalQueenSku"),
                "observedAt": lead.get("observedAt"),
                "note": ("historical discovery evidence, NOT a current fact and "
                         "NEVER a price"),
                "reproducedInCurrentSnapshot": any(
                    d.get("sku") and lead.get("historicalQueenSku")
                    and str(d["sku"]) == str(lead["historicalQueenSku"])
                    for d in per_size.values()),
            } if lead else None,
            "sizes": per_size,
        })

    # ---- one website SKU may identify only ONE app product ----------------
    # If two app products both resolve to the same website variant, at least
    # one of them is wrong and nothing here can say which. Both are demoted:
    # an ambiguous identity must stay unresolved rather than price a bed we
    # cannot name. (Caught downstream first as a duplicate-SKU refusal from
    # validate_pricing - the contract and this tool agree that one SKU is one
    # product-size.)
    claims = defaultdict(list)
    for row in mattresses:
        for size, d in row["sizes"].items():
            if d.get("status") in ("preview-eligible", "owner-verified") and d.get("sku"):
                claims[d["sku"]].append((row, size))
    for sku, holders in claims.items():
        if len(holders) < 2:
            continue
        who = [f"{r['appId']}:{sz}" for r, sz in holders]
        for r, sz in holders:
            r["sizes"][sz] = {
                "status": "machine-ambiguous",
                "candidateCount": len(holders),
                "note": (f"website SKU {sku} is claimed by {len(holders)} app products "
                         f"({', '.join(who)}); one SKU identifies one product-size, so "
                         f"none of them is resolved"),
                "conflictingSku": sku,
                "claimedBy": who,
            }

    # ----------------------------------------------------------- accessories
    accessories = []
    for a in acc:
        aid = a["id"]
        want_type = APP_ACCESSORY_TYPE.get(aid.split("-", 1)[0])
        app_name = a["name"]["en"]
        app_models = model_tokens(app_name)
        app_brand = brand_key(app_name)
        entry = {"appId": aid, "appName": app_name, "legacyMajorPrice": a.get("price"),
                 "expectedType": want_type, "appModelTokens": sorted(app_models)}

        if aid in verified:
            entry.update(verified[aid]); entry["status"] = "owner-verified"
            accessories.append(entry); continue

        # candidate discovery, then TYPE and BRAND gates - never word overlap alone
        pool = defaultdict(list)
        for v in variants:
            if v["kind"] != "accessory":
                continue
            if want_type and v.get("productType") != want_type:
                continue
            vb = brand_key(v.get("name") or "")
            if app_brand and vb and app_brand != vb:
                continue
            shared = app_models & model_tokens(v.get("name"), v.get("family"))
            if not shared:
                continue
            pool[v.get("familyKey") or "(no-family)"].append((v, sorted(shared)))

        # historical accessory lead: the 2026-07-30 SKU, matched by name
        alead = None
        for key, val in acc_leads.items():
            if model_tokens(key) & app_models:
                alead = val
                break
        if alead:
            entry["discoveryLead"] = {"historicalSku": alead.get("historicalSku"),
                                      "historicalName": alead.get("historicalName"),
                                      "note": "historical lead, never a current price"}
            for v in variants:
                if v["kind"] == "accessory" and v.get("sku") \
                        and str(v["sku"]) == str(alead.get("historicalSku")):
                    entry["discoveryLead"]["reproducedInCurrentSnapshot"] = True
                    entry["discoveryLead"]["currentVariant"] = {
                        "sku": v["sku"], "name": v["name"], "size_id": v.get("size_id"),
                        "sellingAmountMinor": v["sellingAmountMinor"]}
                    break
            entry["discoveryLead"].setdefault("reproducedInCurrentSnapshot", False)

        if not pool:
            entry["status"] = "unresolved"
            entry["reason"] = ("no candidate of the expected product type with a "
                               "matching brand and model token")
            accessories.append(entry); continue

        ranked = sorted(pool.items(), key=lambda kv: (-max(len(s) for _, s in kv[1]), kv[0]))
        best_score = max(len(s) for _, s in ranked[0][1])
        tied = [k for k, vs in ranked if max(len(s) for _, s in vs) == best_score]
        if len(tied) > 1:
            entry["status"] = "machine-ambiguous"
            entry["candidateFamilies"] = tied[:5]
            accessories.append(entry); continue

        famkey, members = ranked[0]
        size_independent = want_type in SIZE_INDEPENDENT
        # group by size WITHOUT a dict comprehension: two SKUs claiming one
        # size is a conflict to report, never a silent overwrite.
        by_size = defaultdict(list)
        for v, shared in members:
            by_size[v.get("size_id")].append(v)
        conflicts, chosen = [], {}
        for size, vs in by_size.items():
            if len(vs) > 1:
                distinct = {v["sku"] for v in vs}
                if len(distinct) > 1:
                    conflicts.append({"size": size,
                                      "skus": sorted(distinct),
                                      "amounts": sorted({v["sellingAmountMinor"] for v in vs})})
                    continue
            v = vs[0]
            chosen[str(size)] = {"sku": v["sku"],
                                 "sellingAmountMinor": v["sellingAmountMinor"],
                                 "regularAmountMinor": v.get("regularAmountMinor"),
                                 "websiteName": v["name"], "evidence": v.get("evidence"),
                                 "observedAt": v.get("observedAt"),
                                 "productType": v.get("productType"),
                                 "sizeIndependent": v.get("size_id") is None}
        entry["familyKey"] = famkey
        entry["sizeIndependent"] = size_independent
        entry["variants"] = chosen
        if conflicts:
            entry["status"] = "variant-conflict"
            entry["conflicts"] = conflicts
        elif not chosen:
            entry["status"] = "unresolved"
            entry["reason"] = "every candidate collided on size"
        else:
            entry["status"] = "preview-eligible"
        legacy = a.get("price")
        if legacy is not None:
            entry["legacyPriceMatchesSizes"] = sorted(
                s for s, d in chosen.items()
                if d["sellingAmountMinor"] == int(round(legacy * 100)))
        accessories.append(entry)

    out = {
        "_meta": {
            "status": "AUTOMATED-IDENTITY-MATCH-OVER-AN-UNVERIFIED-SNAPSHOT",
            "note": ("Identity evidence, owner verification and production "
                     "activation are three separate things. A `preview-eligible` "
                     "row carries enough identity evidence for the ISOLATED, "
                     "clearly-labelled preview and is shown there as pending "
                     "verification; it is not a verified mapping and it never "
                     "feeds production, which the pricing contract gates "
                     "independently."),
            "skuEvidence": ("The app catalog ships no SKU. The 2026-07-30 discovery "
                            "file supplies a QUEEN SKU per product as a LEAD; where "
                            "that exact SKU is still present in the current snapshot "
                            "it is recorded as a direct identity link. Historical "
                            "prices are never reused and no other size's SKU is ever "
                            "inferred."),
            # Generation and observation are different facts and are kept apart.
            "mappingGeneratedAt": snap["_meta"].get("generatedAt"),
            "pricesObservedFrom": snap["_meta"].get("observedFrom"),
            "pricesObservedTo": snap["_meta"].get("observedTo"),
            "appMattresses": len(rows), "appAccessories": len(acc),
            "verifiedRowsLoaded": len(verified),
        },
        "mattresses": mattresses,
        "accessories": accessories,
    }
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "mapping.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    write_md(out, os.path.join(OUT_DIR, "mapping.md"))

    tally = defaultdict(int)
    for m in mattresses:
        for d in m["sizes"].values():
            tally[d["status"]] += 1
    print("mattress size-slots: " + " | ".join(f"{k} {v}" for k, v in sorted(tally.items()))
          + f" (of {len(mattresses) * len(SIZES)})")
    atally = defaultdict(int)
    for a in accessories:
        atally[a["status"]] += 1
    print("accessories: " + " | ".join(f"{k} {v}" for k, v in sorted(atally.items())))
    print("wrote demo/price-snapshot/mapping.json + mapping.md")
    return 0


def money(m):
    return f"${m/100:,.2f}" if isinstance(m, int) else "-"


ICON = {"owner-verified": "✅", "preview-eligible": "🔎", "machine-ambiguous": "⚠️",
        "variant-conflict": "⛔", "unresolved": "—"}


def write_md(out, path):
    m = out["_meta"]
    L = ["# App assortment -> website variant mapping", "",
         f"**{m['status']}**", "", m["note"], "",
         f"> **SKU evidence:** {m['skuEvidence']}", "",
         f"Prices observed {m.get('pricesObservedFrom')} -> {m.get('pricesObservedTo')}; "
         f"this mapping generated {m.get('mappingGeneratedAt')}. "
         f"Owner-verified rows loaded: {m['verifiedRowsLoaded']}.", "",
         "| status | meaning |", "|---|---|",
         "| ✅ owner-verified | Blake confirmed this exact variant. |",
         "| 🔎 preview-eligible | enough identity evidence for the ISOLATED preview, shown there as pending verification. Never production. |",
         "| ⚠️ machine-ambiguous | more than one candidate survived; nothing chosen |",
         "| ⛔ variant-conflict | two SKUs claim the same family and size |",
         "| — unresolved | no candidate, or required evidence missing |", "",
         "## Mattresses", ""]
    for mt in out["mattresses"]:
        counts = defaultdict(int)
        for d in mt["sizes"].values():
            counts[d["status"]] += 1
        summary = ", ".join(f"{ICON.get(k, k)} {v}" for k, v in sorted(counts.items()))
        L.append(f"### {mt['appId']} — {mt['appName']} ({mt['brand']} / {mt['subBrand']}, "
                 f"{mt['firmnessLabel']})")
        L.append("")
        L.append(summary)
        L.append("")
        L.append("| size | status | sku | selling | website name | evidence |")
        L.append("|---|---|---|---|---|---|")
        for size in SIZES:
            d = mt["sizes"][size]
            st = d["status"]
            ic = ICON.get(st, st)
            if st in ("owner-verified", "preview-eligible"):
                ev = d.get("evidence") or {}
                L.append(f"| {size} | {ic} | `{d.get('sku')}` | "
                         f"{money(d.get('sellingAmountMinor'))} | {d.get('name', '')} | "
                         f"[{ev.get('type','?')}]({ev.get('url','#')}) |")
            elif st == "machine-ambiguous":
                names = "; ".join(c["name"][:38] for c in d.get("candidates", [])[:3])
                L.append(f"| {size} | {ic} {d.get('candidateCount')} | | | {names} | "
                         f"{d.get('note','')} |")
            else:
                L.append(f"| {size} | {ic} | | | | {d.get('reason','')} |")
        L.append("")
    L += ["## Accessories", ""]
    for a in out["accessories"]:
        L.append(f"### {a['appId']} — {a['appName']} "
                 f"(app price ${a['legacyMajorPrice']}, expected type `{a.get('expectedType')}`)")
        L.append("")
        L.append(f"{ICON.get(a['status'], '')} **{a['status']}**"
                 + (f" — {a['reason']}" if a.get("reason") else ""))
        L.append("")
        if a["status"] == "variant-conflict":
            for c in a.get("conflicts", []):
                L.append(f"- ⛔ size `{c['size']}`: SKUs {c['skus']} at {c['amounts']} "
                         f"— two variants claim one size; nothing chosen")
            L.append("")
        if a.get("candidateFamilies"):
            L.append(f"Tied families: {a['candidateFamilies']}")
            L.append("")
        if a.get("variants"):
            L.append("| size | sku | selling | evidence |")
            L.append("|---|---|---|---|")
            for size, d in a["variants"].items():
                ev = d.get("evidence") or {}
                lbl = size if size != "None" else "(size-independent)"
                L.append(f"| {lbl} | `{d['sku']}` | {money(d['sellingAmountMinor'])} | "
                         f"[{ev.get('type','?')}]({ev.get('url','#')}) |")
            ms = a.get("legacyPriceMatchesSizes") or []
            L.append("")
            L.append(f"The app's single ungoverned `price: {a['legacyMajorPrice']}` corresponds to: "
                     + (", ".join(f"**{s}**" for s in ms) if ms else "_no size exactly_")
                     + ".")
            L.append("")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(L))


if __name__ == "__main__":
    sys.exit(build())
