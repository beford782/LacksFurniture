#!/usr/bin/env python3
"""DreamFinder onboarding validation (V1) - structure + Store Info / store-config.

Hard validation so a bad workbook cannot silently produce a broken DreamFinder
deployment. V1 covers the highest-value gates:

  * workbook structure: required tabs, required headers, duplicate headers,
    Store Info exactly one data row, schema-required cells non-empty.
  * store-config values: storeName, slug-safe storeKey, languages, hex colors,
    HTTPS publicAssetRoot with trailing slash, allowedHosts hygiene, discount
    digits, manifest.start_url, gasUrl placeholder policy.

Deep per-row mattress/accessory/SalesNotes checks, image-existence checks, and
post-emit output validation are LATER phases (V2/V3) - not implemented here.

"Required" is derived from `tools/workbook_schema.py` `required` flags (the curated
source of truth), NOT a broad wishlist - fields like price / quizTags / pitchKey /
subBrand / topPickReason are legitimately blank in real data and are not required.

Dependency-light: stdlib + workbook_schema only. No openpyxl, no app imports. It
validates already-parsed structures (the converter's read rows + assembled config),
so it is unit-testable with plain dicts. ASCII console output. Run `--self-test`.
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

# Shared schema lives alongside this file in tools/.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import workbook_schema as schema  # noqa: E402


SUPPORTED_LANGUAGES = (["en"], ["en", "es"])
CODE_DIGITS_MIN, CODE_DIGITS_MAX = 3, 10
_HEX_RE = re.compile(r"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


# -- Report -------------------------------------------------------------------

@dataclass
class ValidationReport:
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors

    def __bool__(self) -> bool:
        return self.ok

    def merge(self, other: "ValidationReport") -> "ValidationReport":
        self.errors.extend(other.errors)
        self.warnings.extend(other.warnings)
        return self

    def blocking(self, warnings_as_errors: bool = False) -> bool:
        """True if the converter should abort: any error, or (under
        --warnings-as-errors) any warning."""
        return bool(self.errors) or (warnings_as_errors and bool(self.warnings))

    def summary(self) -> str:
        if not self.errors and not self.warnings:
            return "[validate] OK - no issues."
        lines = []
        if self.errors:
            lines.append(f"[validate] {len(self.errors)} error(s):")
            lines += [f"  ERROR: {e}" for e in self.errors]
        if self.warnings:
            lines.append(f"[validate] {len(self.warnings)} warning(s):")
            lines += [f"  WARN:  {w}" for w in self.warnings]
        return "\n".join(lines)


# -- Helpers ------------------------------------------------------------------

def _blank(v) -> bool:
    return v is None or str(v).strip() == ""


def _is_hex(v) -> bool:
    return isinstance(v, str) and bool(_HEX_RE.match(v.strip()))


def _is_slug(v) -> bool:
    return isinstance(v, str) and bool(_SLUG_RE.match(v.strip()))


def _host_from_url(url: str) -> str:
    """Extract the host from an https URL (no scheme, no path). '' if unparseable."""
    s = str(url).strip()
    if "://" in s:
        s = s.split("://", 1)[1]
    return s.split("/", 1)[0]


def _s(v) -> str:
    return "" if v is None else str(v).strip()


# Live accessory categories (the real enum the app/template use - NOT a generic
# lowercase list). matchScores are non-negative integers (Bel uses values up to
# 10 for the featured "default" weight, so there is no 0-5 upper bound).
ACCESSORY_CATEGORIES = {"Foundations & Support", "Pillows", "Protectors"}
# G1: the Accessories "Image File Name" cell must be the FULL relative path the live
# app renders verbatim (index.html uses accessories.json `image` as-is). A bare
# filename (or a non-jpg / extra-path value) builds clean but 404s on the deployed
# host - the live image is always normalized to <prefix><file>.jpg (TFM migration lesson).
ACCESSORY_IMAGE_PREFIX = "images/accessories/"
SOURCE_IMAGE_EXTS = (".jpg", ".jpeg", ".png", ".webp")
MATTRESS_TIERS = {"gold", "silver", "bronze"}
SALESNOTE_TYPES = {"subBrand", "brand"}
SALESNOTE_FORMATS = {"full", "coaching"}


def _source_stems(src_dir: str):
    """Lowercased stems of supported images in src_dir, or None if dir missing."""
    if not os.path.isdir(src_dir):
        return None
    stems = set()
    for fn in os.listdir(src_dir):
        stem, ext = os.path.splitext(fn)
        if ext.lower() in SOURCE_IMAGE_EXTS:
            stems.add(stem.lower())
    return stems


def _source_names(src_dir: str):
    """Lowercased full filenames of supported images in src_dir, or None if the
    dir is missing. Brand logos are matched by exact filename (not stem) because
    the workbook's Logo File Name is copied verbatim into store-config, so the
    source extension must match what ships (e.g. a transparent .png logo)."""
    if not os.path.isdir(src_dir):
        return None
    names = set()
    for fn in os.listdir(src_dir):
        if os.path.splitext(fn)[1].lower() in SOURCE_IMAGE_EXTS:
            names.add(fn.lower())
    return names


def _png_dimensions(path: str):
    """Return (width, height) of a PNG by reading its IHDR header, or None if the
    file is not a valid PNG. Stdlib only - keeps validation.py Pillow-free so it
    runs in --validate-only without the imaging dependency."""
    try:
        with open(path, "rb") as f:
            header = f.read(24)
    except OSError:
        return None
    if len(header) < 24 or header[:8] != b"\x89PNG\r\n\x1a\n" or header[12:16] != b"IHDR":
        return None
    return int.from_bytes(header[16:20], "big"), int.from_bytes(header[20:24], "big")


def _brands_from(raw_tabs) -> set:
    if "Brands" not in raw_tabs:
        return set()
    _, rows = raw_tabs["Brands"]
    return {_s(r.get("Brand Name")) for r in rows if _s(r.get("Brand Name"))}


# -- Structure validation (raw tabs) ------------------------------------------
# raw_tabs maps PRESENT tab name -> (headers: list[str], rows: list[dict]).
# A required tab absent from raw_tabs is reported as missing.

def validate_structure(raw_tabs: Dict[str, Tuple[List[str], List[dict]]]) -> ValidationReport:
    r = ValidationReport()
    for tab in schema.get_tab_names():
        if tab not in raw_tabs:
            r.add_error(f"missing required tab: {tab!r}")
            continue
        headers, rows = raw_tabs[tab]

        # duplicate headers
        seen = set()
        for h in headers:
            if h in seen:
                r.add_error(f"{tab}: duplicate header {h!r}")
            seen.add(h)

        # required headers present
        required = schema.required_columns(tab)
        for col in required:
            if col.name not in headers:
                r.add_error(f"{tab}: missing required header {col.name!r}")

        # Store Info: exactly one data row
        if tab == "Store Info" and len(rows) != 1:
            r.add_error(f"Store Info: expected exactly 1 data row, found {len(rows)}")

        # schema-required cells non-empty (only for headers that are present)
        for col in required:
            if col.name not in headers:
                continue
            for i, row in enumerate(rows, start=1):
                if _blank(row.get(col.name)):
                    r.add_error(f"{tab} row {i}: required {col.name!r} is empty")
    return r


# -- Store-config value validation (assembled config dict) --------------------

def validate_store_config(config: dict, manifest: Optional[dict] = None, *,
                          require_gas_url: bool = False) -> ValidationReport:
    r = ValidationReport()

    if _blank(config.get("storeName")):
        r.add_error("storeName is empty")

    sk = config.get("storeKey")
    if _blank(sk):
        r.add_error("storeKey is empty")
    elif not _is_slug(sk):
        r.add_error(f"storeKey {sk!r} is not slug-safe (lowercase letters/digits/hyphens)")

    langs = config.get("languages")
    if langs not in SUPPORTED_LANGUAGES:
        r.add_error(f"languages must be ['en'] or ['en','es'], got {langs!r}")

    colors = config.get("colors") or {}
    if not _is_hex(colors.get("storePrimary")):
        r.add_error(f"colors.storePrimary missing or not a #hex color: {colors.get('storePrimary')!r}")
    for k in ("storePrimaryLight", "accent"):
        v = colors.get(k)
        if not _blank(v) and not _is_hex(v):
            r.add_error(f"colors.{k} is not a valid #hex color: {v!r}")

    par = config.get("publicAssetRoot")
    if _blank(par):
        r.add_error("publicAssetRoot is empty")
    else:
        par = str(par).strip()
        if not par.startswith("https://"):
            r.add_error(f"publicAssetRoot must be an HTTPS URL: {par!r}")
        if not par.endswith("/"):
            r.add_error(f"publicAssetRoot must end with a trailing slash: {par!r}")

    ah = config.get("allowedHosts")
    if not isinstance(ah, list) or not ah:
        r.add_error("allowedHosts is empty (the M1 domain lock requires at least the Pages host)")
    else:
        for h in ah:
            hs = str(h)
            if "://" in hs:
                r.add_error(f"allowedHosts entry {hs!r} must not include a protocol")
            if "/" in hs:
                r.add_error(f"allowedHosts entry {hs!r} must not include a path/slash")
            if hs in ("localhost", "127.0.0.1"):
                r.add_error(f"allowedHosts must not include {hs!r} (localhost/127.0.0.1 are a built-in fallback)")
        host = _host_from_url(par) if not _blank(par) else ""
        if host and host not in ah:
            r.add_warning(f"allowedHosts {ah} does not include the publicAssetRoot host {host!r} - "
                          f"the live site will blank on that host")

    disc = config.get("discount") or {}
    cd = disc.get("codeDigits")
    if isinstance(cd, bool) or not isinstance(cd, int) or not (CODE_DIGITS_MIN <= cd <= CODE_DIGITS_MAX):
        r.add_error(f"discount.codeDigits must be an integer {CODE_DIGITS_MIN}-{CODE_DIGITS_MAX}, got {cd!r}")

    gas = str(config.get("gasUrl") or "").strip()
    is_placeholder = _blank(gas) or "example" in gas.lower() or gas.upper() in ("TODO", "PLACEHOLDER")
    if is_placeholder:
        msg = "gasUrl is blank/placeholder (set it after the Google Apps Script deploy)"
        if require_gas_url:
            r.add_error(msg)
        else:
            # Blank-until-GAS-deploy is the documented pre-launch state (demo /
            # preview deployments run with gasUrl intentionally blank), so this
            # is operator information, not an escalatable defect — otherwise
            # --warnings-as-errors gates (the golden test) could never pass on
            # a demo-mode repo. Enforcement lives behind --require-gas-url.
            print(f"[validate] note: {msg}")

    if manifest is not None and _blank(manifest.get("start_url")):
        r.add_error("manifest.start_url is empty")

    return r


# -- Promotions validation (scenario-aware, retailer-neutral) ------------------

# Accepted evidence-status values for promotion items (provenance ladder).
# Retailer-neutral: "retailer-*" statuses assert the offer was seen on the
# active retailer's own site; "lender-current-page" asserts a lender/partner
# source (e.g. Synchrony). Legacy "wgr-*" names remain accepted as deprecated
# aliases so historical WGR-era configs keep validating.
PROMO_EVIDENCE_STATUSES = {
    "retailer-current-page",
    "retailer-product-page",
    "retailer-full-page-archive",
    "retailer-indexed-historical",
    "operator-reported-retailer-indexed-historical",
    "lender-current-page",
    "prior-research-observation",
}
LEGACY_EVIDENCE_ALIASES = {
    "wgr-current-page": "retailer-current-page",
    "wgr-product-page": "retailer-product-page",
    "wgr-full-page-archive": "retailer-full-page-archive",
    "wgr-indexed-historical": "retailer-indexed-historical",
    "operator-reported-wgr-indexed-historical":
        "operator-reported-retailer-indexed-historical",
}
# Statuses that assert an offer was seen on an official source -> a non-empty
# sourceUrl must resolve to an explicitly configured allowed host (or a
# web.archive.org capture whose embedded target is an allowed host). The
# allowlist comes from tools/source_hosts.json — never a hardcoded retailer.
SOURCE_BACKED_STATUSES = {
    "retailer-current-page", "retailer-product-page", "retailer-full-page-archive",
    "retailer-indexed-historical", "operator-reported-retailer-indexed-historical",
    "lender-current-page",
}

# Default allowlist config location (repo-relative): explicit per-retailer
# source hosts. Shape: {"promotionSourceHosts": [...], "financingSourceHosts": [...]}
SOURCE_HOSTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "source_hosts.json")


def load_source_hosts(path: str = None) -> dict:
    """Load the explicit source-host allowlist config. Returns {} when the file
    is absent — validators then fail closed (source-backed claims error)."""
    p = path or SOURCE_HOSTS_FILE
    try:
        with open(p, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def _archive_embedded_host(url: str) -> str:
    """For a web.archive.org capture URL, return the embedded target host (''
    when not an archive URL / unparseable)."""
    m = re.search(r"web\.archive\.org/web/[^/]+/(https?://\S+)", str(url))
    return _host_from_url(m.group(1)) if m else ""


def _split_safe_https(url: str):
    """urlsplit the URL and return the parse ONLY when it is a safe absolute
    https URL: scheme exactly https, hostname present, no username/password,
    port absent or exactly 443. Returns None otherwise — including relative,
    protocol-relative, http, javascript:/data:, credentialed, odd-port, and
    malformed URLs."""
    from urllib.parse import urlsplit
    try:
        parts = urlsplit(str(url).strip())
    except ValueError:
        return None
    if parts.scheme != "https" or not parts.hostname:
        return None
    if parts.username is not None or parts.password is not None:
        return None
    try:
        port = parts.port
    except ValueError:
        return None
    if port not in (None, 443):
        return None
    return parts


_PCT_RE = re.compile(r"%([0-9A-Fa-f]{2})")


def _normalize_percent(s: str) -> str:
    """RFC 3986 §6.2.2.1/§6.2.2.2 syntax-based normalization: percent-encoded
    UNRESERVED characters (ALPHA / DIGIT / '-' '.' '_' '~') are equivalent to
    their decoded form, and the hex digits of whatever stays encoded are
    case-normalized. RESERVED separators (%2F, %3F, %23, ...) are deliberately
    left encoded — decoding those would merge genuinely different paths."""
    def sub(m):
        ch = chr(int(m.group(1), 16))
        if ch.isascii() and (ch.isalnum() or ch in "-._~"):
            return ch
        return "%" + m.group(1).upper()
    return _PCT_RE.sub(sub, s)


def _remove_dot_segments(path: str) -> str:
    """RFC 3986 §5.2.4 dot-segment removal, matching how browsers resolve a
    path before navigating. '..' pops the previous segment and clamps at the
    root (it can never escape above it); '.' is dropped. Empty segments are
    preserved ('//a' stays distinct from '/a'), matching WHATWG."""
    if not path:
        return ""
    lead = "/" if path.startswith("/") else ""
    segs = path.split("/")
    if lead:
        segs = segs[1:]
    out = []
    for seg in segs:
        if seg == ".":
            continue
        if seg == "..":
            if out:
                out.pop()
            continue
        out.append(seg)
    return lead + "/".join(out)


def _url_identity(url: str) -> str:
    """Normalized URL identity for anti-conflation comparisons — deliberately
    aligned with how a BROWSER resolves a URL before navigating, because the
    threat is a config edit that reuses a known-unverified target in a
    syntactically different but navigationally identical form.

    Normalizes: lowercased scheme and hostname; default port dropped;
    backslashes treated as path separators (WHATWG does this for special
    schemes); percent-encoded unreserved characters decoded (so %2e reads as
    a dot and participates in dot-segment removal, exactly as browsers treat
    it); dot segments removed; insignificant trailing slashes dropped. Query
    and fragment are ignored — that is this policy's choice, since neither
    changes which document the dead path serves.

    Deliberately PRESERVED as significant: path case (paths are
    case-sensitive per RFC 3986), reserved percent-encodings such as %2F, and
    empty segments. Returns '' on malformed input so callers fail closed."""
    from urllib.parse import urlsplit
    try:
        # urlsplit already strips ASCII tab/newline/CR like the URL spec does.
        parts = urlsplit(str(url).strip())
    except ValueError:
        return ""
    if not parts.scheme or not parts.hostname:
        return ""
    try:
        port = parts.port
    except ValueError:
        return ""
    scheme = parts.scheme.lower()
    default = {"https": 443, "http": 80}.get(scheme)
    portpart = "" if port in (None, default) else f":{port}"
    path = (parts.path or "").replace("\\", "/")
    path = _remove_dot_segments(_normalize_percent(path))
    while path.endswith("/"):
        path = path[:-1]
    return f"{scheme}://{parts.hostname.lower()}{portpart}{path}"


def _is_allowed_source(url: str, allowed_hosts) -> bool:
    """True when url is a safe absolute https URL (no credentials, default
    port — see _split_safe_https) whose host is one of the explicitly allowed
    hosts (exact match or a dot-boundary subdomain), or a safe https
    web.archive.org capture whose embedded target host is allowed. Empty
    allowlist allows nothing (fail closed)."""
    hosts = [h.lower().strip() for h in (allowed_hosts or []) if h and str(h).strip()]
    if not hosts:
        return False
    parts = _split_safe_https(url)
    if parts is None:
        return False
    host = parts.hostname.lower()
    if host == "web.archive.org" or host.endswith(".web.archive.org"):
        host = _archive_embedded_host(url).lower()
        if not host:
            return False
    return any(host == h or host.endswith("." + h) for h in hosts)


def _valid_ends_at(s: str) -> bool:
    """A promotion `endsAt` must be an ISO-8601 datetime carrying an explicit
    timezone offset, so it is an absolute instant the client can compare without
    depending on the tablet's local timezone (e.g. 2026-06-16T23:59:59-05:00).
    A bare date or an offset-less timestamp is rejected."""
    from datetime import datetime
    try:
        d = datetime.fromisoformat(s)
    except (ValueError, TypeError):
        return False
    return d.tzinfo is not None


def validate_promotions(config: dict, *, mattress_ids=None, accessory_ids=None,
                        accessory_categories=None,
                        allowed_source_hosts=None) -> ValidationReport:
    """Validate the optional promotions block (scenario-aware or flat back-compat).

    Pure: takes the assembled config dict plus the known mattress/accessory id and
    accessory-category sets, plus the explicit source-host allowlist for
    source-backed evidence statuses. No-op when there is no promotions block."""
    r = ValidationReport()
    promos = config.get("promotions")
    if not promos:
        return r
    mids = set(mattress_ids or [])
    aids = set(accessory_ids or [])
    acats = set(c for c in (accessory_categories or []) if c)
    hosts = list(allowed_source_hosts or [])

    scenarios = promos.get("scenarios")
    if scenarios is None:
        _validate_promo_scenario(r, "(flat)", promos, True, mids, aids, acats, hosts)
        return r
    if not isinstance(scenarios, dict):
        r.add_error("promotions.scenarios must be an object")
        return r
    active = promos.get("activeScenario")
    if active and active not in scenarios:
        r.add_error(f"promotions.activeScenario {active!r} is not a defined scenario "
                    f"{sorted(scenarios)}")
    for sid, sc in scenarios.items():
        if not isinstance(sc, dict):
            r.add_error(f"promotions.scenarios[{sid!r}] must be an object")
            continue
        _validate_promo_scenario(r, sid, sc, sid == active, mids, aids, acats, hosts)
    return r


def _validate_promo_scenario(r, sid, sc, is_active, mids, aids, acats, hosts):
    kind = sc.get("kind")
    items = sc.get("items") or []
    storewide = sc.get("storewide") or []

    # duplicate promotion ids within a scenario (items + storewide share an id space)
    seen = set()
    for it in list(items) + list(storewide):
        iid = it.get("id")
        if iid in seen:
            r.add_error(f"promotions[{sid}]: duplicate promotion id {iid!r}")
        else:
            seen.add(iid)

    # historical-demo guardrails
    if kind == "historical-demo":
        if sc.get("disableEmailSubmission") is not True:
            r.add_error(f"promotions[{sid}]: historical-demo scenario must set "
                        f"disableEmailSubmission=true")
        if is_active:
            disc = sc.get("disclosure") or {}
            if not (_s(disc.get("en")) and _s(disc.get("es"))):
                r.add_error(f"promotions[{sid}]: active historical-demo scenario must "
                            f"have a disclosure in EN and ES")

    for it in items:
        _validate_promo_item(r, sid, it, mids, aids, acats, hosts)
    for it in storewide:
        _validate_promo_item(r, sid, it, mids, aids, acats, hosts)


def _validate_promo_item(r, sid, it, mids, aids, acats, hosts):
    iid = it.get("id", "?")
    tag = f"promotions[{sid}].{iid}"

    # eligibility references resolve to real catalog entries
    for mid in (it.get("eligibleMattressIds") or []):
        if mids and mid not in mids:
            r.add_error(f"{tag}: eligibleMattressIds {mid!r} not in mattresses")
    for aid in (it.get("eligibleAccessoryIds") or []):
        if aids and aid not in aids:
            r.add_error(f"{tag}: eligibleAccessoryIds {aid!r} not in accessories")
    for cat in (it.get("eligibleAccessoryCategories") or []):
        if acats and cat not in acats:
            r.add_error(f"{tag}: eligibleAccessoryCategories {cat!r} not a known accessory category")

    # customer-visible bilingual copy: badge + headline must carry EN and ES
    for field in ("badge", "headline"):
        obj = it.get(field)
        if not isinstance(obj, dict) or not _s(obj.get("en")) or not _s(obj.get("es")):
            r.add_error(f"{tag}: {field} missing EN or ES")
    # detail/disclosure: if one language is present the other must be too
    for field in ("detail", "disclosure"):
        obj = it.get(field)
        if isinstance(obj, dict) and (bool(_s(obj.get("en"))) != bool(_s(obj.get("es")))):
            r.add_error(f"{tag}: {field} has one language but not the other")

    # evidence status enum + source rules (legacy wgr-* names normalize to the
    # retailer-neutral statuses; source-backed statuses require an explicitly
    # allowlisted host — fail closed when no allowlist is configured)
    ev = it.get("evidenceStatus")
    if ev in LEGACY_EVIDENCE_ALIASES:
        ev = LEGACY_EVIDENCE_ALIASES[ev]
    if ev is not None and ev not in PROMO_EVIDENCE_STATUSES:
        r.add_error(f"{tag}: evidenceStatus {it.get('evidenceStatus')!r} not in "
                    f"{sorted(PROMO_EVIDENCE_STATUSES)} (or a legacy wgr-* alias)")
    src = _s(it.get("sourceUrl"))
    if ev in SOURCE_BACKED_STATUSES and src:
        if not hosts:
            r.add_error(f"{tag}: evidenceStatus {ev!r} carries a sourceUrl but no "
                        f"source-host allowlist is configured (tools/source_hosts.json)")
        elif not _is_allowed_source(src, hosts):
            r.add_error(f"{tag}: sourceUrl {src!r} host is not in the configured "
                        f"source-host allowlist (required for evidenceStatus {ev!r})")
    if ev == "retailer-full-page-archive" and src and not _is_allowed_source(src, hosts):
        r.add_error(f"{tag}: retailer-full-page-archive sourceUrl must be a "
                    f"web.archive.org capture of an allowlisted host")
    if ev == "prior-research-observation" and not _s(it.get("evidenceProvenance")):
        r.add_error(f"{tag}: evidenceStatus prior-research-observation requires evidenceProvenance")

    # time-limited offers: endsAt must be an absolute ISO-8601 instant (with a
    # timezone offset) so the client can hide expired offers without depending
    # on the tablet's local timezone.
    ends = _s(it.get("endsAt"))
    if ends and not _valid_ends_at(ends):
        r.add_error(f"{tag}: endsAt {ends!r} must be an ISO-8601 datetime with a "
                    f"timezone offset (e.g. 2026-06-16T23:59:59-05:00)")

    # the reconstructed 20% storewide event must not target individual products
    # unless explicitly marked eligible
    if it.get("type") == "reconstructed-storewide" or "storewide-20" in str(iid):
        targets_products = bool(it.get("eligibleMattressIds") or it.get("eligibleAccessoryIds")
                                or it.get("eligibleAccessoryCategories"))
        if targets_products and it.get("eligibleForStorewide20") is not True:
            r.add_error(f"{tag}: 20% storewide event applied to individual products "
                        f"without eligibleForStorewide20=true")


# -- Financing validation (Lacks Payment Choice) -------------------------------

FINANCING_PLAN_KINDS = {
    "open-end-promotional-credit",   # e.g. Synchrony HOME card promos (Reg Z open-end)
    "closed-end-installment",        # e.g. Lacks In-House / Mexico contracts
    "lease-to-own",                  # not credit — never describe as financing terms
    "credit-builder",                # Build My Credit — availability only
    "informational",
}
SAVINGS_PASS_POLICIES = {"alternative", "stackable", "specialist_confirm"}


def _valid_iso_instant(s: str) -> bool:
    """ISO-8601 datetime with explicit timezone offset (absolute instant)."""
    from datetime import datetime
    try:
        d = datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return False
    return d.tzinfo is not None


# verifiedAt is an OBSERVATION timestamp, so a materially future instant can
# only be a typo (e.g. year 2062) or clock error — and a future date would
# otherwise defeat the max-age freshness rule for decades (age goes negative).
# A small skew tolerance covers legitimate clock drift between the verifying
# machine and this one. Mirrors FINANCING_CLOCK_SKEW_MS in index.html.
FINANCING_CLOCK_SKEW_SECONDS = 5 * 60  # 5 minutes, deliberate


def _materially_future(s: str) -> bool:
    """True when s parses to a timezone-aware instant more than the allowed
    clock skew ahead of now. Comparison is instant-based, never string-based."""
    from datetime import datetime, timezone, timedelta
    try:
        d = datetime.fromisoformat(str(s))
    except (ValueError, TypeError):
        return False  # unparseable is reported by _valid_iso_instant instead
    if d.tzinfo is None:
        return False
    return d > datetime.now(timezone.utc) + timedelta(seconds=FINANCING_CLOCK_SKEW_SECONDS)


def _bilingual_ok(obj) -> bool:
    return isinstance(obj, dict) and bool(_s(obj.get("en"))) and bool(_s(obj.get("es")))


def validate_financing(config: dict, *, allowed_source_hosts=None) -> ValidationReport:
    """Validate the optional financing block (V1 'payment choice' rules).

    Fail-closed posture: exact credit claims (APR / term / minimum) must be
    verified, timestamped, freshness-bounded, disclosure-carrying, and sourced
    from an explicitly allowlisted host. Payment calculation must be disabled
    in V1. No-op when there is no financing block."""
    r = ValidationReport()
    fin = config.get("financing")
    if fin is None:
        return r
    if not isinstance(fin, dict):
        r.add_error("financing must be an object")
        return r
    hosts = list(allowed_source_hosts or [])
    enabled = fin.get("enabled") is True

    if enabled:
        for key in ("verifiedAt", "maxAgeDays", "sourceUrl"):
            if _blank(fin.get(key)):
                r.add_error(f"financing.{key} is required when financing is enabled")
        if fin.get("verifiedAt") and not _valid_iso_instant(fin["verifiedAt"]):
            r.add_error(f"financing.verifiedAt {fin['verifiedAt']!r} must be ISO-8601 "
                        f"with a timezone offset")
        if fin.get("verifiedAt") and _materially_future(fin["verifiedAt"]):
            r.add_error(f"financing.verifiedAt {fin['verifiedAt']!r} is materially in "
                        f"the future (beyond {FINANCING_CLOCK_SKEW_SECONDS}s clock skew) — "
                        f"verification is an observation and cannot postdate now")
        mad = fin.get("maxAgeDays")
        if mad is not None and (not isinstance(mad, int) or not 1 <= mad <= 60):
            r.add_error("financing.maxAgeDays must be an integer between 1 and 60")
        if fin.get("sourceUrl") and not _is_allowed_source(fin["sourceUrl"], hosts):
            r.add_error(f"financing.sourceUrl {fin['sourceUrl']!r} must be a safe https "
                        f"URL on an allowlisted host (no credentials, default port) — "
                        f"see tools/source_hosts.json financingSourceHosts")
        copy = fin.get("copy") or {}
        for key in ("eyebrow", "headline"):
            if not _bilingual_ok(copy.get(key)):
                r.add_error(f"financing.copy.{key} missing EN or ES")
        if copy.get("emailBody") and not copy.get("emailBodyAvailable"):
            r.add_warning(
                "financing.copy.emailBody present without emailBodyAvailable — "
                "the email packet row will use 'explored' wording even for "
                "customers who never opened Payment Choice content (COPY-15); "
                "add the neutral availability variant")
        policy = fin.get("savingsPassPolicy")
        if policy not in SAVINGS_PASS_POLICIES:
            r.add_error(f"financing.savingsPassPolicy {policy!r} must be one of "
                        f"{sorted(SAVINGS_PASS_POLICIES)}")
        # Operational authorization for EXACT rate/term claims. Required and
        # explicitly boolean when financing is enabled: the retailer must
        # state the operating decision rather than leave it inferred, and the
        # client gate is strict === true, so a string "true" or a 1 here would
        # silently hide exact terms while reading as enabled to a human.
        # false is valid and is the expected initial state — it means "no
        # owner has accepted the re-verification obligation yet", NOT that the
        # verified facts are stale (those keep their full validation below).
        if "exactPromotionsEnabled" not in fin:
            r.add_error(
                "financing.exactPromotionsEnabled is required when financing is "
                "enabled — state the operating decision explicitly (false until a "
                "named owner accepts weekly re-verification and emergency takedown)")
        elif not isinstance(fin.get("exactPromotionsEnabled"), bool):
            r.add_error(
                f"financing.exactPromotionsEnabled "
                f"{fin.get('exactPromotionsEnabled')!r} must be a JSON boolean "
                f"(true/false), not a string or number — the client gate is a "
                f"strict identity test and anything else fails closed")
        discount_mode = _s((config.get("discount") or {}).get("mode"))
        if discount_mode and discount_mode != "disabled" and policy != "stackable":
            r.add_error(
                f"financing is enabled while discount.mode={discount_mode!r}; either "
                f"set discount.mode='disabled' or declare an explicit stackable policy")
        # Operational staleness warning — ONLY when exact promotions are
        # explicitly operationally enabled (field lands in Commit E). An
        # intentionally disabled/absent policy must not nag about a
        # historical stamp aging out; malformed/future stamps keep their
        # existing errors above regardless of enablement.
        if (fin.get("exactPromotionsEnabled") is True
                and fin.get("verifiedAt") and _valid_iso_instant(fin["verifiedAt"])
                and not _materially_future(fin["verifiedAt"])
                and isinstance(mad, int) and 1 <= mad <= 60):
            from datetime import datetime, timezone, timedelta
            _ts = datetime.fromisoformat(fin["verifiedAt"])
            if datetime.now(timezone.utc) - _ts > timedelta(days=mad):
                r.add_warning(
                    f"financing.verifiedAt {fin['verifiedAt']!r} is older than "
                    f"maxAgeDays={mad} while exactPromotionsEnabled is true — the "
                    f"client will render the generic staleNotice; re-verify the "
                    f"source or disable exact promotions")

    # When financing is DISABLED the policy field is not required (a
    # backward-compatible disabled block need not carry it), but a present
    # value must still be a real boolean so it cannot rot into a string that
    # would read as authorization to a human reviewer.
    if not enabled and "exactPromotionsEnabled" in fin \
            and not isinstance(fin.get("exactPromotionsEnabled"), bool):
        r.add_error(f"financing.exactPromotionsEnabled "
                    f"{fin.get('exactPromotionsEnabled')!r} must be a JSON boolean")

    # Customer-reachable / future-risk URL fields: validated whenever present
    # (enabled or not) — every URL that could reach a customer must be a safe
    # https URL on an allowlisted host.
    for _key in ("applicationUrl", "mexicoInfoUrl"):
        _val = fin.get(_key)
        if _val is not None and not _blank(_val) and not _is_allowed_source(_val, hosts):
            r.add_error(f"financing.{_key} {_val!r} must be a safe https URL on an "
                        f"allowlisted host (no credentials, default port)")

    mxa = fin.get("mexicoApplicationUrl")
    if mxa is not None:
        if not isinstance(mxa, dict):
            r.add_error("financing.mexicoApplicationUrl must be an object")
        else:
            _mxu = mxa.get("url")
            if _mxu is not None and not _blank(_mxu) and not _is_allowed_source(_mxu, hosts):
                r.add_error(f"financing.mexicoApplicationUrl.url {_mxu!r} must be a safe "
                            f"https URL on an allowlisted host")
            _ver = mxa.get("verified")
            if _ver is not None and not isinstance(_ver, bool):
                r.add_error("financing.mexicoApplicationUrl.verified must be a boolean")
            # Anti-conflation: an unverified application URL must not be
            # reused as any customer-facing or evidence URL. An allowlisted
            # host does not make a dead URL available — verified:false means
            # exactly that. Identity is normalized (case, default port,
            # trailing slash, query/fragment) so variants of the dead path
            # still collide, while different paths on the same host do not.
            if mxa.get("verified") is not True and not _blank(mxa.get("url")):
                _dead = _url_identity(mxa.get("url"))
                if _dead:
                    _reuse = [("financing.sourceUrl", fin.get("sourceUrl")),
                              ("financing.applicationUrl", fin.get("applicationUrl")),
                              ("financing.mexicoInfoUrl", fin.get("mexicoInfoUrl"))]
                    for _i, _plan in enumerate(fin.get("plans") or []):
                        if isinstance(_plan, dict):
                            _reuse.append(
                                (f"financing.plans[{_plan.get('id', _i)!r}].sourceUrl",
                                 _plan.get("sourceUrl")))
                    for _label, _val in _reuse:
                        if _val is not None and _url_identity(_val) == _dead:
                            r.add_error(
                                f"{_label} reuses the unverified mexicoApplicationUrl "
                                f"target {mxa.get('url')!r} — that URL is not verified "
                                f"available and must never become customer-visible")

    # allowedSourceHosts inside the block (used by the client freshness gate)
    # must not widen the build-time allowlist.
    declared = fin.get("allowedSourceHosts")
    if declared is not None:
        if not isinstance(declared, list):
            r.add_error("financing.allowedSourceHosts must be a list")
        else:
            for h in declared:
                hs = _s(h).lower()
                if hosts and hs not in [x.lower() for x in hosts]:
                    r.add_error(f"financing.allowedSourceHosts entry {h!r} is not in "
                                f"tools/source_hosts.json financingSourceHosts")

    plans = fin.get("plans")
    if enabled and not (isinstance(plans, list) and plans):
        r.add_error("financing.plans must be a non-empty list when enabled")
    for i, plan in enumerate(plans or []):
        tag = f"financing.plans[{plan.get('id', i)!r}]"
        if not isinstance(plan, dict):
            r.add_error(f"{tag}: must be an object")
            continue
        if _blank(plan.get("id")):
            r.add_error(f"{tag}: id is required")
        kind = plan.get("kind")
        if kind not in FINANCING_PLAN_KINDS:
            r.add_error(f"{tag}: kind {kind!r} not in {sorted(FINANCING_PLAN_KINDS)}")
        # V1 hard invariant: no payment calculation anywhere.
        if plan.get("paymentCalculationEnabled"):
            r.add_error(f"{tag}: paymentCalculationEnabled must be false in V1 — "
                        f"product-level payment math is not approved")
        if not _bilingual_ok(plan.get("headline")):
            r.add_error(f"{tag}: headline missing EN or ES")
        for field_name in ("detail", "disclosure"):
            obj = plan.get(field_name)
            if isinstance(obj, dict) and (bool(_s(obj.get("en"))) != bool(_s(obj.get("es")))):
                r.add_error(f"{tag}: {field_name} has one language but not the other")
        # EVERY present plan sourceUrl is an evidence/freshness input — the
        # client feeds it to financingSourceAllowed() — so all of them must
        # be safe allowlisted https URLs, not only exact-term plans'.
        _src_any = plan.get("sourceUrl")
        if _src_any is not None and not _blank(_src_any) \
                and not _is_allowed_source(_src_any, hosts):
            r.add_error(f"{tag}: sourceUrl {_src_any!r} must be a safe https URL on "
                        f"an allowlisted host (no credentials, default port)")
        # Exact credit claims: APR/term/minimum require verification, source,
        # adjacent conditions (detail) and a disclosure — all bilingual.
        exact = any(plan.get(k) is not None
                    for k in ("apr", "termMonths", "minimumPurchase"))
        if exact:
            if plan.get("verified") is not True:
                r.add_error(f"{tag}: exact terms present but verified is not true")
            if not _valid_iso_instant(plan.get("verifiedAt", "")):
                r.add_error(f"{tag}: exact terms require a valid verifiedAt "
                            f"(ISO-8601 with offset)")
            elif _materially_future(plan.get("verifiedAt", "")):
                r.add_error(f"{tag}: verifiedAt {plan.get('verifiedAt')!r} is materially "
                            f"in the future (beyond {FINANCING_CLOCK_SKEW_SECONDS}s clock "
                            f"skew) — exact terms cannot be verified at a future instant")
            src = _s(plan.get("sourceUrl"))
            if not src:
                r.add_error(f"{tag}: exact terms require sourceUrl")
            # (host/scheme safety of a present sourceUrl is enforced for
            # every plan by the general check above)
            if not _bilingual_ok(plan.get("detail")):
                r.add_error(f"{tag}: exact terms require adjacent conditions "
                            f"(detail) in EN and ES")
            if not _bilingual_ok(plan.get("disclosure")):
                r.add_error(f"{tag}: exact terms require a disclosure in EN and ES")
        apr = plan.get("apr")
        if apr is not None and (not isinstance(apr, (int, float)) or apr < 0 or apr > 100):
            r.add_error(f"{tag}: apr {apr!r} out of range")
        tm = plan.get("termMonths")
        if tm is not None and (not isinstance(tm, int) or not 1 <= tm <= 120):
            r.add_error(f"{tag}: termMonths {tm!r} out of range")
        mp = plan.get("minimumPurchase")
        if mp is not None and (not isinstance(mp, (int, float)) or mp < 0):
            r.add_error(f"{tag}: minimumPurchase {mp!r} out of range")
        ppf = plan.get("publishedPaymentFactor")
        if ppf is not None and (not isinstance(ppf, (int, float)) or not 0 < ppf < 1):
            r.add_error(f"{tag}: publishedPaymentFactor {ppf!r} must be a fraction "
                        f"between 0 and 1")
        # lease-to-own / credit-builder must never carry credit terms
        if kind in ("lease-to-own", "credit-builder") and exact:
            r.add_error(f"{tag}: {kind} plans must not state APR/term/minimum — "
                        f"availability only, details confirmed in store")
    return r


# -- Quiz definition (data/quiz.json payload) ---------------------------------
# The quiz structure is an app-level contract: ~15 code sites consume question
# and option ids by name (profile assignment, Sleep Brief, adjustable-base
# hero, results narratives, handoff labels, email packet), and option `scores`
# keys must land in the mattress feature-tag vocabulary to affect ranking. So
# V1 pins ids, types, order, and option ids exactly — retailers vary COPY
# (question/helpText/category/label/sublabel/copyVariants text), never
# structure. Loosening any part of this contract requires an app-code review
# of the id consumers first.

# (id, type, option ids in display order). None = slider (no options).
QUIZ_CANONICAL = (
    ("sleep_quality", "single", ("poor", "fair", "okay", "well")),
    ("trigger", "single", ("pain", "worn_out", "moving", "upgrade", "browsing")),
    ("mattress_size", "single",
     ("twin", "twin_xl", "full", "queen", "king", "cal_king")),
    ("partner_sleep", "single", ("solo", "partner", "family")),
    ("partner_disturbance", "single",
     ("yes_often", "sometimes", "rarely", "not_applicable")),
    ("sleep_position", "single", ("side", "back", "stomach", "combo", "no_idea")),
    ("body_type", "single", ("petite", "average", "athletic", "plus", "different")),
    ("temperature", "single", ("hot", "comfortable", "cold", "opposite")),
    ("firmness", "slider", None),
    ("current_mattress_age", "single",
     ("under_2", "three_seven", "eight_fifteen", "fifteen_plus", "not_sure")),
    ("sleep_issues", "multiple",
     ("back_pain", "hip_pain", "hot", "tossing", "stiff", "sagging",
      "too_soft", "none")),
    ("health_conditions", "multiple",
     ("nerve_pain", "allergies", "snoring", "reflux", "extra_support",
      "getting_older", "none")),
)

# Feature tags the scoring engine may award points for. Must stay a superset
# of every option's scores keys; matches the app's quizTags vocabulary. An
# unknown tag is an error (a typo'd tag silently awards nothing).
QUIZ_SCORE_TAGS = frozenset((
    "adjustable", "comfort", "cooling", "durability", "durable", "firm",
    "hybrid", "hypoallergenic", "medium", "memory", "motionIsolation",
    "plush", "pressureRelief", "quality", "responsive", "soft", "support",
    "zoned",
))

# The scoring engine caps per-mattress-per-feature accumulation at 5
# (FEATURE_CAP in index.html); a single-option award beyond the cap is
# unreachable and therefore a config mistake.
QUIZ_FEATURE_CAP = 5

_QUIZ_QUESTION_KEYS = frozenset((
    "id", "category", "question", "helpText", "type", "options", "skipIf",
    "copyVariants", "min", "max", "defaultValue", "labels",
))
_QUIZ_OPTION_KEYS = frozenset(
    ("id", "label", "icon", "sublabel", "scores", "hideIf"))


def _quiz_condition_ok(r, tag, cond, earlier_options):
    """Validate a {question, answer} condition against EARLIER questions only
    (forward references could never fire: answers arrive in question order)."""
    if not isinstance(cond, dict) or set(cond) != {"question", "answer"}:
        r.add_error(f"{tag} must be an object {{question, answer}}")
        return
    qid = cond.get("question")
    if qid not in earlier_options:
        r.add_error(f"{tag} references {qid!r}, which is not an earlier question")
        return
    if cond.get("answer") not in earlier_options[qid]:
        r.add_error(f"{tag} answer {cond.get('answer')!r} is not an option of "
                    f"{qid!r}")


def validate_quiz(quiz) -> ValidationReport:
    """Validate the quiz payload (structure contract + copy + scores).

    No-op when quiz is None (workbooks without a Quiz payload)."""
    r = ValidationReport()
    if quiz is None:
        return r
    if not isinstance(quiz, dict) or not isinstance(quiz.get("questions"), list):
        r.add_error("quiz must be an object with a questions list")
        return r
    questions = quiz["questions"]

    got = [(q.get("id"), q.get("type")) for q in questions
           if isinstance(q, dict)]
    want = [(qid, qtype) for qid, qtype, _ in QUIZ_CANONICAL]
    if got != want:
        r.add_error(f"quiz questions must match the canonical id/type sequence "
                    f"exactly (structure is an app contract); got {got}, "
                    f"expected {want}")
        return r  # id-keyed checks below assume the canonical sequence

    earlier_options = {}  # question id -> set of option ids, filled in order
    for (qid, qtype, opt_ids), q in zip(QUIZ_CANONICAL, questions):
        tag = f"quiz.{qid}"
        unknown = set(q) - _QUIZ_QUESTION_KEYS
        if unknown:
            r.add_error(f"{tag}: unknown keys {sorted(unknown)}")
        for key in ("category", "question", "helpText"):
            if not _bilingual_ok(q.get(key)):
                r.add_error(f"{tag}: {key} missing EN or ES")
        if q.get("skipIf") is not None:
            _quiz_condition_ok(r, f"{tag}.skipIf", q["skipIf"], earlier_options)

        if qtype == "slider":
            mn, mx, dv = q.get("min"), q.get("max"), q.get("defaultValue")
            if not all(isinstance(v, int) for v in (mn, mx, dv)) \
                    or not mn < mx or not mn <= dv <= mx:
                r.add_error(f"{tag}: slider needs integer min < max with "
                            f"defaultValue in range (got min={mn!r}, max={mx!r}, "
                            f"defaultValue={dv!r})")
            labels = q.get("labels")
            if not (isinstance(labels, list) and len(labels) == 3
                    and all(_bilingual_ok(x) for x in labels)):
                r.add_error(f"{tag}: slider needs exactly 3 bilingual labels")
            earlier_options[qid] = set()
            continue

        opts = q.get("options")
        got_opts = tuple(o.get("id") for o in (opts or [])
                         if isinstance(o, dict))
        if got_opts != opt_ids:
            r.add_error(f"{tag}: option ids must be exactly {list(opt_ids)} in "
                        f"order (structure is an app contract); got "
                        f"{list(got_opts)}")
            earlier_options[qid] = set(opt_ids)
            continue
        for o in opts:
            otag = f"{tag}.{o.get('id')}"
            unknown = set(o) - _QUIZ_OPTION_KEYS
            if unknown:
                r.add_error(f"{otag}: unknown keys {sorted(unknown)}")
            if not _bilingual_ok(o.get("label")):
                r.add_error(f"{otag}: label missing EN or ES")
            if o.get("sublabel") is not None and not _bilingual_ok(o["sublabel"]):
                r.add_error(f"{otag}: sublabel missing EN or ES")
            if _blank(o.get("icon")):
                r.add_error(f"{otag}: icon is required")
            scores = o.get("scores")
            if not isinstance(scores, dict):
                r.add_error(f"{otag}: scores must be an object (may be empty)")
            else:
                for feat, pts in scores.items():
                    if feat not in QUIZ_SCORE_TAGS:
                        r.add_error(f"{otag}: unknown score tag {feat!r} — a "
                                    f"typo'd tag silently awards nothing")
                    if not isinstance(pts, int) or not 1 <= pts <= QUIZ_FEATURE_CAP:
                        r.add_error(f"{otag}: score {feat}={pts!r} must be an "
                                    f"integer in 1..{QUIZ_FEATURE_CAP}")
            if o.get("hideIf") is not None:
                _quiz_condition_ok(r, f"{otag}.hideIf", o["hideIf"],
                                   earlier_options)

        for i, cv in enumerate(q.get("copyVariants") or []):
            ctag = f"{tag}.copyVariants[{i}]"
            if not isinstance(cv, dict) or "when" not in cv:
                r.add_error(f"{ctag}: must be an object with a 'when' condition")
                continue
            when = cv["when"]
            if not isinstance(when, dict) or set(when) != {"question", "answerIn"}:
                r.add_error(f"{ctag}.when must be {{question, answerIn}}")
            else:
                wq = when.get("question")
                if wq not in earlier_options:
                    r.add_error(f"{ctag}.when references {wq!r}, which is not an "
                                f"earlier question")
                elif not (isinstance(when.get("answerIn"), list)
                          and when["answerIn"]
                          and set(when["answerIn"]) <= earlier_options[wq]):
                    r.add_error(f"{ctag}.when.answerIn must be a non-empty "
                                f"subset of {wq!r}'s option ids")
            for key in set(cv) - {"when"}:
                if key not in ("question", "helpText"):
                    r.add_error(f"{ctag}: unknown key {key!r}")
                elif not _bilingual_ok(cv[key]):
                    r.add_error(f"{ctag}: {key} missing EN or ES")

        earlier_options[qid] = set(opt_ids)
    return r


# -- V2: catalog validation (raw tabs) ----------------------------------------

def validate_mattresses(raw_tabs, *, source_images=None, skip_images=False,
                        languages=None) -> ValidationReport:
    r = ValidationReport()
    if "Mattresses" not in raw_tabs:
        return r  # missing tab already reported by validate_structure
    headers, rows = raw_tabs["Mattresses"]
    brands = _brands_from(raw_tabs)
    es_cols = [h for h in headers if h.endswith(" (ES)")]
    check_images = bool(source_images) and not skip_images
    src_stems = None
    if check_images:
        d = os.path.join(source_images, "mattresses")
        src_stems = _source_stems(d)
        if src_stems is None:
            r.add_error(f"Mattresses: source image folder not found: {d}")

    seen_ids = {}
    seen_names = {}
    for i, row in enumerate(rows, start=1):
        mid, name, brand = _s(row.get("id")), _s(row.get("name")), _s(row.get("brand"))
        tier, fs = _s(row.get("tier")), _s(row.get("firmnessScore"))
        tag = mid or name or f"row {i}"

        if tier and tier not in MATTRESS_TIERS:
            r.add_error(f"Mattresses {tag}: tier {tier!r} not gold/silver/bronze")
        if mid:
            if mid in seen_ids:
                r.add_error(f"Mattresses: duplicate id {mid!r} (rows {seen_ids[mid]} & {i})")
            else:
                seen_ids[mid] = i
            if not _is_slug(mid):
                r.add_error(f"Mattresses {tag}: id {mid!r} is not slug-safe")
        if brand and brands and brand not in brands:
            r.add_error(f"Mattresses {tag}: brand {brand!r} is not in the Brands tab {sorted(brands)}")
        if fs:
            try:
                n = int(float(fs)) if isinstance(fs, str) else int(fs)
                if not (1 <= n <= 10):
                    r.add_error(f"Mattresses {tag}: firmnessScore {fs!r} not in 1-10")
            except (ValueError, TypeError):
                r.add_error(f"Mattresses {tag}: firmnessScore {fs!r} is not an integer")
        if name:
            key = name.lower()
            if key in seen_names:
                r.add_error(f"Mattresses: duplicate name {name!r} -> image filename "
                            f"collision (rows {seen_names[key]} & {i})")
            else:
                seen_names[key] = i
            if check_images and src_stems is not None and key not in src_stems:
                r.add_error(f"Mattresses {tag}: no source image for "
                            f"{key}.[jpg|jpeg|png|webp] in {os.path.join(source_images, 'mattresses')}")
        # ES policy (warnings only)
        if languages and "es" in languages and es_cols:
            if all(_blank(row.get(h)) for h in es_cols):
                r.add_warning(f"Mattresses {tag}: no Spanish (ES) copy (languages includes 'es')")
        elif languages and "es" not in languages and es_cols:
            if any(not _blank(row.get(h)) for h in es_cols):
                r.add_warning(f"Mattresses {tag}: Spanish (ES) copy present but languages excludes 'es'")
    return r


def validate_accessories(raw_tabs, *, source_images=None, skip_images=False,
                         languages=None) -> ValidationReport:
    r = ValidationReport()
    if "Accessories" not in raw_tabs:
        return r
    headers, rows = raw_tabs["Accessories"]
    score_headers = [h for h in headers if h.startswith("Score:")]
    check_images = bool(source_images) and not skip_images
    src_stems = None
    if check_images:
        d = os.path.join(source_images, "accessories")
        src_stems = _source_stems(d)
        if src_stems is None:
            r.add_error(f"Accessories: source image folder not found: {d}")

    seen_ids = {}
    seen_basenames = {}
    es_pairs = (("Name", "Name (ES)"), ("Category", "Category (ES)"),
                ("Description", "Description (ES)"))
    for i, row in enumerate(rows, start=1):
        aid, cat, img = _s(row.get("ID")), _s(row.get("Category")), _s(row.get("Image File Name"))
        tag = aid or _s(row.get("Name")) or f"row {i}"

        if aid:
            if aid in seen_ids:
                r.add_error(f"Accessories: duplicate id {aid!r} (rows {seen_ids[aid]} & {i})")
            else:
                seen_ids[aid] = i
            if not _is_slug(aid):
                r.add_error(f"Accessories {tag}: id {aid!r} is not slug-safe")
        if cat and cat not in ACCESSORY_CATEGORIES:
            r.add_error(f"Accessories {tag}: category {cat!r} not in {sorted(ACCESSORY_CATEGORIES)}")
        price = row.get("Price")
        if not _blank(price):
            try:
                float(str(price))
            except ValueError:
                r.add_error(f"Accessories {tag}: price {price!r} is not numeric")
        if _blank(img):
            r.add_error(f"Accessories {tag}: Image File Name is empty")
        else:
            img_s = str(img).strip()
            # G1: the cell must be the full relative path images/accessories/<file>.jpg.
            # index.html renders accessories.json `image` verbatim, so a bare filename,
            # a non-jpg extension, or an extra sub-path builds clean but 404s on the
            # live host. The normalized live file is always <prefix><basename>.jpg.
            rest = (img_s[len(ACCESSORY_IMAGE_PREFIX):]
                    if img_s.startswith(ACCESSORY_IMAGE_PREFIX) else None)
            if rest is None or not rest or "/" in rest or not rest.lower().endswith(".jpg"):
                r.add_error(f"Accessories {tag}: Image File Name {img!r} must be a full "
                            f"relative path of the form '{ACCESSORY_IMAGE_PREFIX}<file>.jpg' "
                            f"- a bare filename builds clean but 404s live (index.html "
                            f"renders it verbatim)")
            base = os.path.splitext(os.path.basename(img_s))[0].lower()
            if base in seen_basenames:
                r.add_warning(f"Accessories: duplicate image basename {base!r} "
                              f"(rows {seen_basenames[base]} & {i})")
            else:
                seen_basenames[base] = i
            if check_images and src_stems is not None and base not in src_stems:
                r.add_error(f"Accessories {tag}: no source image for "
                            f"{base}.[jpg|jpeg|png|webp] in {os.path.join(source_images, 'accessories')}")
        for h in score_headers:
            v = row.get(h)
            if _blank(v):
                continue
            try:
                n = int(str(v).strip()) if isinstance(v, str) else int(v)
                if n < 0:
                    r.add_error(f"Accessories {tag}: {h} {v!r} is negative")
            except (ValueError, TypeError):
                r.add_error(f"Accessories {tag}: {h} {v!r} is not an integer")
        # ES policy (warnings only)
        if languages and "es" in languages:
            for en_h, es_h in es_pairs:
                if not _blank(row.get(en_h)) and _blank(row.get(es_h)):
                    r.add_warning(f"Accessories {tag}: {es_h} missing (languages includes 'es')")
        elif languages and "es" not in languages:
            for _, es_h in es_pairs:
                if not _blank(row.get(es_h)):
                    r.add_warning(f"Accessories {tag}: {es_h} present but languages excludes 'es'")
    return r


def validate_brands(raw_tabs, *, source_images=None, skip_images=False) -> ValidationReport:
    """V2: Brands tab. When a brand sets a Logo File Name and --source-images is
    provided, require a matching source logo in <source-images>/brands/ (matched by
    exact filename, case-insensitive - brand logos are copied verbatim, preserving
    format/transparency). A blank Logo File Name is allowed: the app then shows the
    brand name only."""
    r = ValidationReport()
    if "Brands" not in raw_tabs:
        return r  # missing tab already reported by validate_structure
    _, rows = raw_tabs["Brands"]
    check_images = bool(source_images) and not skip_images
    src_names = None
    if check_images:
        d = os.path.join(source_images, "brands")
        src_names = _source_names(d)
        if src_names is None:
            r.add_error(f"Brands: source logo folder not found: {d}")

    seen = {}
    for i, row in enumerate(rows, start=1):
        name = _s(row.get("Brand Name"))
        logo = _s(row.get("Logo File Name"))
        tag = name or f"row {i}"
        if not logo:
            continue  # optional - app renders the brand name without a logo
        key = logo.lower()
        if key in seen:
            r.add_warning(f"Brands: duplicate Logo File Name {logo!r} "
                          f"(rows {seen[key]} & {i})")
        else:
            seen[key] = i
        if check_images and src_names is not None and key not in src_names:
            r.add_error(f"Brands {tag}: no source logo {logo!r} in "
                        f"{os.path.join(source_images, 'brands')}")
    return r


def validate_app_icon(raw_tabs, *, source_images=None, skip_images=False) -> ValidationReport:
    """V2: optional PWA app icon (Store Info "App Icon File"). Blank = no icons
    (allowed - the converter emits no manifest.icons). When set, the file must be a
    .png; and when --source-images is provided it must exist at <source-images>/
    logos/<file> and be a square PNG >= 512px (read via stdlib PNG header, no
    Pillow). Errors block the build before any icons are generated."""
    r = ValidationReport()
    if "Store Info" not in raw_tabs:
        return r
    _, rows = raw_tabs["Store Info"]
    if not rows:
        return r
    icon = _s(rows[0].get("App Icon File"))
    if not icon:
        return r  # optional - no PWA icons for this store
    # M2: icons are generated only when --source-images is provided AND image
    # normalization is not skipped. If the workbook requests an app icon but the run
    # cannot generate it, block: writing the bundle anyway would emit manifest.json
    # WITHOUT its icons array, silently stripping a deployed PWA icon set.
    if not source_images or skip_images:
        r.add_error(f"Store Info: App Icon File {icon!r} is set but PWA icons cannot "
                    f"be generated - re-run with --source-images and without "
                    f"--skip-image-normalization (otherwise manifest.json is written "
                    f"without its icons).")
    if not icon.lower().endswith(".png"):
        r.add_error(f"Store Info: App Icon File {icon!r} must be a .png")
    if bool(source_images) and not skip_images:
        src = os.path.join(source_images, "logos", icon)
        if not os.path.isfile(src):
            r.add_error(f"Store Info: App Icon File {icon!r} not found in "
                        f"{os.path.join(source_images, 'logos')}")
        else:
            dims = _png_dimensions(src)
            if dims is None:
                r.add_error(f"Store Info: App Icon File {icon!r} is not a readable PNG")
            else:
                w, h = dims
                if w != h:
                    r.add_error(f"Store Info: App Icon File {icon!r} must be square "
                                f"(got {w}x{h})")
                elif w < 512:
                    r.add_error(f"Store Info: App Icon File {icon!r} must be >= 512px "
                                f"(got {w}x{h})")
    return r


def validate_sales_notes(raw_tabs, *, languages=None) -> ValidationReport:
    r = ValidationReport()
    if "SalesNotes" not in raw_tabs:
        return r
    _, rows = raw_tabs["SalesNotes"]
    brands = _brands_from(raw_tabs)
    for i, row in enumerate(rows, start=1):
        typ, key = _s(row.get("Type")), _s(row.get("Key"))
        tag = key or f"row {i}"
        if typ and typ not in SALESNOTE_TYPES:
            r.add_error(f"SalesNotes {tag}: Type {typ!r} not subBrand/brand")
        elif typ == "subBrand":
            fmt = _s(row.get("Format"))
            if fmt not in SALESNOTE_FORMATS:
                r.add_error(f"SalesNotes {tag}: Format {fmt!r} must be full/coaching")
            elif fmt == "full":
                for f in ("Lead", "Demo", "Close"):
                    if _blank(row.get(f)):
                        r.add_error(f"SalesNotes {tag} (full): {f} is required")
            elif fmt == "coaching":
                if _blank(row.get("RSA Note")):
                    r.add_error(f"SalesNotes {tag} (coaching): RSA Note is required")
        elif typ == "brand":
            if _blank(row.get("Story")):
                r.add_error(f"SalesNotes {tag} (brand): Story is required")
            if key and brands and key not in brands:
                r.add_warning(f"SalesNotes brand note {key!r} is not a known brand {sorted(brands)}")
        # subBrand-key cross-ref intentionally NOT validated (real data has
        # pitchKey-mapped / aspirational keys that are not literal mattress
        # subBrands). ES sales-notes intentionally NOT validated (optional,
        # generated-later block).
    return r


# -- V3: post-emit output validation ------------------------------------------

def _parse_allowed_hosts_js(path: str):
    text = open(path, encoding="utf-8").read()
    m = re.search(r"__DF_ALLOWED_HOSTS\s*=\s*(\[.*?\])\s*;", text, re.DOTALL)
    if not m:
        raise ValueError("no __DF_ALLOWED_HOSTS assignment found")
    return json.loads(m.group(1))


def _csv_header(path: str):
    with open(path, encoding="utf-8-sig", newline="") as f:
        return next(csv.reader(f), [])


def validate_generated_outputs(output_dir: str, *, build_json: bool = True,
                               languages=None) -> ValidationReport:
    """Validate the bundle the converter just wrote. `build_json` should reflect
    whether build-data.ps1 actually ran (and thus mattresses.json should exist)."""
    r = ValidationReport()
    data = os.path.join(output_dir, "data")

    def load_json(path, label):
        if not os.path.exists(path):
            r.add_error(f"{label}: missing ({path})")
            return None
        try:
            with open(path, encoding="utf-8") as f:
                return json.load(f)
        except (ValueError, OSError) as e:
            r.add_error(f"{label}: invalid JSON ({e})")
            return None

    config = load_json(os.path.join(data, "store-config.json"), "store-config.json")

    # allowed-hosts.js array must equal store-config.allowedHosts
    ah_path = os.path.join(data, "allowed-hosts.js")
    if not os.path.exists(ah_path):
        r.add_error(f"allowed-hosts.js: missing ({ah_path})")
    else:
        try:
            arr = _parse_allowed_hosts_js(ah_path)
        except (ValueError, OSError) as e:
            r.add_error(f"allowed-hosts.js: parse failure ({e})")
        else:
            if config is not None and arr != config.get("allowedHosts"):
                r.add_error(f"allowed-hosts.js array {arr} != store-config.allowedHosts "
                            f"{config.get('allowedHosts')}")

    # mattresses.csv header == live EN contract
    en_path = os.path.join(data, "mattresses.csv")
    if not os.path.exists(en_path):
        r.add_error(f"mattresses.csv: missing ({en_path})")
    else:
        exp = schema.get_column_headers("Mattresses", lang="")
        if _csv_header(en_path) != exp:
            r.add_error("mattresses.csv: header does not match the live schema contract")

    # mattresses-es.csv: validate header if present (the converter omits it when
    # there is no Spanish copy, so absence is not an error).
    es_path = os.path.join(data, "mattresses-es.csv")
    if os.path.exists(es_path):
        if _csv_header(es_path) != list(schema.MATTRESSES_ES_CSV_COLUMNS):
            r.add_error("mattresses-es.csv: header does not match the ES schema contract")
    elif languages and "es" in languages:
        r.add_warning("mattresses-es.csv absent (languages includes 'es'; ok if no "
                      "Spanish mattress copy was provided)")

    # accessories.json: top-level array, each item has id/name/category/image
    acc = load_json(os.path.join(data, "accessories.json"), "accessories.json")
    if acc is not None:
        if not isinstance(acc, list):
            r.add_error("accessories.json: top-level is not a JSON array")
        else:
            for i, a in enumerate(acc):
                if not isinstance(a, dict):
                    r.add_error(f"accessories.json[{i}]: not an object")
                    continue
                for k in ("id", "name", "category", "image"):
                    if k not in a:
                        r.add_error(f"accessories.json[{i}]: missing {k!r}")
                if _blank(a.get("image")):
                    r.add_error(f"accessories.json[{i}] ({a.get('id')}): image is empty")

    # manifest.json: required keys
    man = load_json(os.path.join(output_dir, "manifest.json"), "manifest.json")
    if man is not None:
        for k in ("name", "short_name", "description", "start_url",
                  "display", "orientation", "background_color", "theme_color"):
            if k not in man:
                r.add_error(f"manifest.json: missing key {k!r}")
        # When the manifest declares icons, each referenced file must exist at the
        # output root (icon src is relative to the manifest URL).
        if isinstance(man.get("icons"), list) and man["icons"]:
            for ic in man["icons"]:
                src = ic.get("src") if isinstance(ic, dict) else None
                if src and not os.path.exists(os.path.join(output_dir, src)):
                    r.add_error(f"manifest.json: icon {src!r} not found on disk")
            # M3: icon generation always emits apple-touch-icon.png alongside the
            # manifest icons (index.html references it via <link rel=apple-touch-icon>),
            # but it is not listed in manifest.icons, so verify it explicitly here.
            if not os.path.exists(os.path.join(output_dir, "apple-touch-icon.png")):
                r.add_error("manifest.json declares icons but apple-touch-icon.png is "
                            "missing at the output root (index.html references it)")

    # brand logos referenced by store-config must exist on disk. Only checked when
    # the brands image folder was emitted (mirrors the mattress-image guard below):
    # a no-image build has nothing to verify.
    if config is not None and os.path.isdir(os.path.join(output_dir, "images", "brands")):
        for b in (config.get("brands") or []):
            logo = b.get("logo")
            if logo and not os.path.exists(os.path.join(output_dir, logo)):
                r.add_error(f"store-config brand {b.get('name')!r}: logo file "
                            f"{logo!r} not found on disk")

    # mattresses.json: structural sanity (only when build-json actually produced it)
    if build_json:
        mj = load_json(os.path.join(data, "mattresses.json"), "mattresses.json")
        if mj is not None:
            images_dir = os.path.join(output_dir, "images", "mattresses")
            check_imgs = os.path.isdir(images_dir)
            for tier in ("gold", "silver", "bronze"):
                if tier not in mj:
                    r.add_error(f"mattresses.json: missing tier {tier!r}")
                elif not isinstance(mj[tier], list):
                    r.add_error(f"mattresses.json: tier {tier!r} is not a list")
                else:
                    for m in mj[tier]:
                        for k in ("id", "name", "imageUrl"):
                            if k not in m:
                                r.add_error(f"mattresses.json {tier} item missing {k!r}")
                        if _blank(m.get("imageUrl")):
                            r.add_error(f"mattresses.json ({m.get('id')}): imageUrl is empty")
                        elif check_imgs and not os.path.exists(os.path.join(output_dir, m.get("imageUrl"))):
                            r.add_warning(f"mattresses.json ({m.get('id')}): imageUrl "
                                          f"{m.get('imageUrl')!r} not found on disk")
    return r


# -- Entrypoint ---------------------------------------------------------------

def validate_bundle_inputs(raw_tabs, store_config, manifest=None, *,
                           source_images=None, skip_images=False,
                           require_gas_url: bool = False) -> ValidationReport:
    """Full input validation: workbook structure (V1), store-config values (V1),
    and catalog checks for mattresses/accessories/SalesNotes (V2), plus source-image
    existence when `source_images` is provided and not skipped. Caller passes the
    converter's parsed tabs and the assembled config/manifest."""
    langs = store_config.get("languages")
    r = ValidationReport()
    r.merge(validate_structure(raw_tabs))
    r.merge(validate_store_config(store_config, manifest, require_gas_url=require_gas_url))
    r.merge(validate_mattresses(raw_tabs, source_images=source_images,
                                skip_images=skip_images, languages=langs))
    r.merge(validate_accessories(raw_tabs, source_images=source_images,
                                 skip_images=skip_images, languages=langs))
    r.merge(validate_brands(raw_tabs, source_images=source_images,
                            skip_images=skip_images))
    r.merge(validate_app_icon(raw_tabs, source_images=source_images,
                              skip_images=skip_images))
    r.merge(validate_sales_notes(raw_tabs, languages=langs))
    return r


# -- Self-test (no pytest; stdlib only) ---------------------------------------

def _good_tabs():
    """A fully-valid raw_tabs (structure + catalog) for every schema tab - passes
    with zero errors and zero warnings under _good_config (languages en+es)."""
    tabs = {}
    for tab in schema.get_tab_names():
        headers = schema.get_column_headers(tab)
        req = [c.name for c in schema.required_columns(tab)]
        row = {h: ("x" if h in req else "") for h in headers}
        tabs[tab] = (headers, [row])
    tabs["Brands"][1][0].update({"Brand Name": "Acme"})
    tabs["Mattresses"][1][0].update({
        "tier": "gold", "id": "m1", "name": "Athena", "brand": "Acme",
        "firmnessScore": "5", "features": "hybrid", "reason_default": "Great bed",
        "highlight (ES)": "es-copy",
    })
    tabs["Accessories"][1][0].update({
        "ID": "a1", "Name": "Pillow", "Name (ES)": "Almohada",
        "Category": "Pillows", "Category (ES)": "Almohadas", "Price": 100,
        "Description": "Soft", "Description (ES)": "Suave",
        "Image File Name": "images/accessories/a1.jpg", "Match Tags": "all",
    })
    tabs["SalesNotes"][1][0].update({
        "Type": "brand", "Key": "Acme", "Story": "Family-owned since 1900",
    })
    return tabs


def _good_config():
    return {
        "storeName": "Acme Mattress",
        "storeKey": "acme",
        "languages": ["en", "es"],
        "logo": {"main": "acme", "sub": "mattress"},
        "colors": {"storePrimary": "#123abc", "storePrimaryLight": "#2244cc",
                   "storePrimaryGlow": "rgba(1,2,3,0.15)", "accent": "#b8935d"},
        "gasUrl": "https://script.google.com/macros/s/AKxyz/exec",
        "publicAssetRoot": "https://acme.github.io/DreamFinder/",
        "allowedHosts": ["acme.github.io"],
        "discount": {"codePrefix": "DREAM", "codeDigits": 3},
    }


def _good_manifest():
    return {"name": "DreamFinder - Acme", "start_url": "/DreamFinder/"}


def _self_test() -> int:
    passed = failed = 0

    def check(name, cond):
        nonlocal passed, failed
        if cond:
            passed += 1
            print(f"  [ok]   {name}")
        else:
            failed += 1
            print(f"  [FAIL] {name}")

    # minimal valid sample passes
    r = validate_bundle_inputs(_good_tabs(), _good_config(), _good_manifest())
    check("valid sample passes", r.ok and not r.warnings)

    # missing required tab
    t = _good_tabs(); del t["SalesNotes"]
    check("missing required tab -> error",
          any("missing required tab" in e for e in validate_structure(t).errors))

    # duplicate header
    t = _good_tabs()
    h, rows = t["Brands"]; t["Brands"] = (h + [h[0]], rows)
    check("duplicate header -> error",
          any("duplicate header" in e for e in validate_structure(t).errors))

    # Store Info multiple rows
    t = _good_tabs(); h, rows = t["Store Info"]; t["Store Info"] = (h, rows + [dict(rows[0])])
    check("Store Info multiple rows -> error",
          any("expected exactly 1 data row" in e for e in validate_structure(t).errors))

    # missing schema-required value
    t = _good_tabs(); h, rows = t["Mattresses"]; rows[0]["reason_default"] = ""
    check("missing required cell -> error",
          any("reason_default" in e for e in validate_structure(t).errors))

    # invalid hex color
    c = _good_config(); c["colors"]["storePrimary"] = "8B1A1A"
    check("invalid hex color -> error",
          any("storePrimary" in e for e in validate_store_config(c).errors))

    # missing allowedHosts
    c = _good_config(); c["allowedHosts"] = []
    check("missing allowedHosts -> error",
          any("allowedHosts is empty" in e for e in validate_store_config(c).errors))

    # allowedHosts with protocol
    c = _good_config(); c["allowedHosts"] = ["https://acme.github.io"]
    check("allowedHosts with protocol -> error",
          any("must not include a protocol" in e for e in validate_store_config(c).errors))

    # allowedHosts with localhost
    c = _good_config(); c["allowedHosts"] = ["acme.github.io", "localhost"]
    check("allowedHosts with localhost -> error",
          any("localhost" in e for e in validate_store_config(c).errors))

    # publicAssetRoot missing trailing slash
    c = _good_config(); c["publicAssetRoot"] = "https://acme.github.io/DreamFinder"
    check("publicAssetRoot no trailing slash -> error",
          any("trailing slash" in e for e in validate_store_config(c).errors))

    # blank gasUrl -> informational note only by default (documented pre-launch
    # state; must not block --warnings-as-errors gates), error under require_gas_url
    c = _good_config(); c["gasUrl"] = ""
    r = validate_store_config(c)
    check("blank gasUrl -> no error/warning by default",
          r.ok and not any("gasUrl" in w for w in r.warnings))
    r = validate_store_config(c, require_gas_url=True)
    check("blank gasUrl -> error under require_gas_url",
          not r.ok and any("gasUrl" in e for e in r.errors))

    # --require-gas-url promotes gasUrl to error
    c = _good_config(); c["gasUrl"] = ""
    r = validate_store_config(c, require_gas_url=True)
    check("require_gas_url promotes gasUrl to error",
          any("gasUrl" in e for e in r.errors))

    # warnings_as_errors promotes allowedHosts-missing-Pages-host warning to blocking
    c = _good_config(); c["allowedHosts"] = ["someoneelse.github.io"]
    r = validate_store_config(c)
    check("allowedHosts missing Pages host -> warning",
          r.ok and any("does not include the publicAssetRoot host" in w for w in r.warnings))
    check("warnings_as_errors makes that warning blocking",
          r.blocking(warnings_as_errors=True) and not r.blocking(warnings_as_errors=False))

    # discount.codeDigits out of range
    c = _good_config(); c["discount"]["codeDigits"] = 2
    check("codeDigits out of range -> error",
          any("codeDigits" in e for e in validate_store_config(c).errors))

    # manifest.start_url empty
    m = dict(_good_manifest()); m["start_url"] = ""
    check("manifest.start_url empty -> error",
          any("manifest.start_url" in e for e in validate_store_config(_good_config(), m).errors))

    # ---- V2: catalog ----
    langs = ["en", "es"]

    # duplicate mattress id
    t = _good_tabs(); h, rows = t["Mattresses"]; t["Mattresses"] = (h, [rows[0], dict(rows[0])])
    check("duplicate mattress id -> error",
          any("duplicate id" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid tier
    t = _good_tabs(); t["Mattresses"][1][0]["tier"] = "platinum"
    check("invalid tier -> error",
          any("tier 'platinum'" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid mattress id slug
    t = _good_tabs(); t["Mattresses"][1][0]["id"] = "M 1"
    check("invalid mattress id slug -> error",
          any("not slug-safe" in e for e in validate_mattresses(t, languages=langs).errors))

    # firmness out of range
    t = _good_tabs(); t["Mattresses"][1][0]["firmnessScore"] = "11"
    check("firmness out of range -> error",
          any("firmnessScore" in e for e in validate_mattresses(t, languages=langs).errors))

    # brand not in Brands tab
    t = _good_tabs(); t["Mattresses"][1][0]["brand"] = "Nope"
    check("brand not in Brands tab -> error",
          any("not in the Brands tab" in e for e in validate_mattresses(t, languages=langs).errors))

    # duplicate lower(name) image collision
    t = _good_tabs(); h, rows = t["Mattresses"]
    r2 = dict(rows[0]); r2["id"] = "m2"; r2["name"] = "athena"
    t["Mattresses"] = (h, [rows[0], r2])
    check("duplicate lower(name) collision -> error",
          any("image filename collision" in e for e in validate_mattresses(t, languages=langs).errors))

    # invalid accessory score (negative)
    t = _good_tabs(); t["Accessories"][1][0]["Score: Cooling"] = "-1"
    check("negative accessory score -> error",
          any("Score: Cooling" in e for e in validate_accessories(t, languages=langs).errors))

    # accessory score 10 is allowed (Bel uses high 'default' weights)
    t = _good_tabs(); t["Accessories"][1][0]["Score: Default"] = 10
    check("accessory score 10 allowed (not 0-5 capped)",
          validate_accessories(t, languages=langs).ok)

    # duplicate accessory id
    t = _good_tabs(); h, rows = t["Accessories"]; t["Accessories"] = (h, [rows[0], dict(rows[0])])
    check("duplicate accessory id -> error",
          any("duplicate id" in e for e in validate_accessories(t, languages=langs).errors))

    # invalid accessory category
    t = _good_tabs(); t["Accessories"][1][0]["Category"] = "widgets"
    check("invalid accessory category -> error",
          any("category 'widgets'" in e for e in validate_accessories(t, languages=langs).errors))

    # accessory image basename != id is accepted when the cell is a full
    # images/accessories/<file>.jpg path
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/copper-ice.jpg"
    check("accessory full path, basename != id accepted",
          validate_accessories(t, languages=langs).ok)

    # G1: bare accessory image filename (no images/accessories/ prefix) -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "copper-ice.jpg"
    check("G1 bare accessory image path -> error",
          any("must be a full" in e and "images/accessories/" in e
              for e in validate_accessories(t, languages=langs).errors))

    # G1: full path but non-jpg extension -> error (live file is normalized to .jpg)
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/copper-ice.png"
    check("G1 accessory full path, wrong extension -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # G1: wrong directory prefix -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/mattresses/copper-ice.jpg"
    check("G1 accessory wrong directory prefix -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # G1: extra sub-path under images/accessories/ -> error
    t = _good_tabs(); t["Accessories"][1][0]["Image File Name"] = "images/accessories/sub/copper-ice.jpg"
    check("G1 accessory extra sub-path -> error",
          any("must be a full" in e for e in validate_accessories(t, languages=langs).errors))

    # invalid salesNote Type
    t = _good_tabs(); t["SalesNotes"][1][0] = {"Type": "vendor", "Key": "X"}
    check("invalid salesNote Type -> error",
          any("Type 'vendor'" in e for e in validate_sales_notes(t).errors))

    # subBrand full missing Lead/Demo/Close
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "subBrand", "Key": "Copper", "Format": "full",
                             "Lead": "", "Demo": "d", "Close": "c"}
    check("salesNote full missing Lead -> error",
          any("Lead is required" in e for e in validate_sales_notes(t).errors))

    # subBrand coaching missing RSA Note
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "subBrand", "Key": "Charcoal", "Format": "coaching",
                             "RSA Note": ""}
    check("salesNote coaching missing RSA Note -> error",
          any("RSA Note is required" in e for e in validate_sales_notes(t).errors))

    # brand salesNote missing Story
    t = _good_tabs()
    t["SalesNotes"][1][0] = {"Type": "brand", "Key": "Acme", "Story": ""}
    check("brand salesNote missing Story -> error",
          any("Story is required" in e for e in validate_sales_notes(t).errors))

    # missing mattress source image when source-images provided
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        os.makedirs(os.path.join(d, "mattresses"))
        os.makedirs(os.path.join(d, "accessories"))
        t = _good_tabs()  # name "Athena" -> needs athena.* in d/mattresses (absent)
        check("missing mattress source image -> error",
              any("no source image" in e and "Mattresses" in e
                  for e in validate_mattresses(t, source_images=d, languages=langs).errors))
        check("missing accessory source image -> error",
              any("no source image" in e and "Accessories" in e
                  for e in validate_accessories(t, source_images=d, languages=langs).errors))

        # Brands: logo source existence (brands/ subdir of --source-images)
        os.makedirs(os.path.join(d, "brands"))
        tb = _good_tabs(); tb["Brands"][1][0]["Logo File Name"] = "acme.png"
        check("missing brand source logo -> error",
              any("no source logo" in e and "Brands" in e
                  for e in validate_brands(tb, source_images=d).errors))
        open(os.path.join(d, "brands", "acme.png"), "w").close()
        check("present brand source logo -> ok",
              validate_brands(tb, source_images=d).ok)
        check("blank brand logo -> ok (no source needed)",
              validate_brands(_good_tabs(), source_images=d).ok)
        check("brands source folder missing -> error",
              any("source logo folder not found" in e
                  for e in validate_brands(tb, source_images=os.path.join(d, "nope")).errors))

        # App icon (Store Info "App Icon File") - optional PWA icon source in logos/
        os.makedirs(os.path.join(d, "logos"))

        def _png(w, h):
            return (b"\x89PNG\r\n\x1a\n" + (13).to_bytes(4, "big") + b"IHDR"
                    + w.to_bytes(4, "big") + h.to_bytes(4, "big") + b"\x08\x06\x00\x00\x00")

        def _put_icon(w, h, name="app-icon.png"):
            with open(os.path.join(d, "logos", name), "wb") as f:
                f.write(_png(w, h))

        ti = _good_tabs(); ti["Store Info"][1][0]["App Icon File"] = "app-icon.png"
        check("app icon: blank -> ok (no source needed)",
              validate_app_icon(_good_tabs(), source_images=d).ok)
        check("app icon: missing source -> error",
              any("not found" in e and "App Icon File" in e
                  for e in validate_app_icon(ti, source_images=d).errors))
        _put_icon(512, 512)
        check("app icon: square >=512 png -> ok", validate_app_icon(ti, source_images=d).ok)
        _put_icon(400, 400)
        check("app icon: under 512px -> error",
              any(">= 512px" in e for e in validate_app_icon(ti, source_images=d).errors))
        _put_icon(512, 256)
        check("app icon: non-square -> error",
              any("must be square" in e for e in validate_app_icon(ti, source_images=d).errors))
        tj = _good_tabs(); tj["Store Info"][1][0]["App Icon File"] = "icon.jpg"
        check("app icon: non-png -> error",
              any("must be a .png" in e for e in validate_app_icon(tj).errors))
        # M2: App Icon File set but the run cannot generate icons -> blocking error.
        check("app icon: set but no --source-images -> error",
              any("cannot be generated" in e for e in validate_app_icon(ti).errors))
        check("app icon: set with --skip-image-normalization -> error",
              any("cannot be generated" in e
                  for e in validate_app_icon(ti, source_images=d, skip_images=True).errors))
        # ...and a valid run (source images, not skipped) does NOT trip the M2 gate.
        _put_icon(512, 512)
        check("app icon: source provided, not skipped -> no M2 error",
              not any("cannot be generated" in e
                      for e in validate_app_icon(ti, source_images=d).errors))

    # ES missing copy warns when languages includes es
    t = _good_tabs()
    for hh in [c for c in t["Mattresses"][0] if c.endswith(" (ES)")]:
        t["Mattresses"][1][0][hh] = ""
    rr = validate_mattresses(t, languages=langs)
    check("ES missing mattress copy -> warning (not error)",
          rr.ok and any("no Spanish (ES) copy" in w for w in rr.warnings))

    # ---- V3: post-emit output validation ----
    import tempfile

    def _write(path, text):
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(text)

    def _write_good_output(d, *, with_es=True, with_mj=False):
        data = os.path.join(d, "data")
        os.makedirs(data, exist_ok=True)
        _write(os.path.join(data, "store-config.json"),
               json.dumps({"storeName": "Acme", "allowedHosts": ["acme.github.io"]}))
        _write(os.path.join(data, "allowed-hosts.js"),
               'window.__DF_ALLOWED_HOSTS = ["acme.github.io"];\n')
        with open(os.path.join(data, "mattresses.csv"), "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(schema.get_column_headers("Mattresses", lang=""))
        if with_es:
            with open(os.path.join(data, "mattresses-es.csv"), "w", encoding="utf-8", newline="") as f:
                csv.writer(f).writerow(list(schema.MATTRESSES_ES_CSV_COLUMNS))
        _write(os.path.join(data, "accessories.json"), json.dumps(
            [{"id": "a1", "name": {"en": "P"}, "category": {"en": "Pillows"},
              "image": "images/accessories/a1.jpg"}]))
        _write(os.path.join(d, "manifest.json"), json.dumps(
            {"name": "n", "short_name": "s", "description": "d", "start_url": "/x/",
             "display": "standalone", "orientation": "landscape",
             "background_color": "#000", "theme_color": "#000"}))
        if with_mj:
            _write(os.path.join(data, "mattresses.json"), json.dumps(
                {"gold": [{"id": "g1", "name": "A", "imageUrl": "images/mattresses/a.jpg"}],
                 "silver": [], "bronze": []}))
        return d

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        check("post-emit valid output passes (build_json=False)",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        os.remove(os.path.join(d, "data", "store-config.json"))
        check("post-emit missing store-config -> error",
              any("store-config.json: missing" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "store-config.json"), "{not valid json")
        check("post-emit invalid JSON -> error",
              any("invalid JSON" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "allowed-hosts.js"),
               'window.__DF_ALLOWED_HOSTS = ["other.github.io"];\n')
        check("post-emit allowed-hosts mismatch -> error",
              any("allowed-hosts.js array" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "allowed-hosts.js"), "// no assignment here\n")
        check("post-emit allowed-hosts parse failure -> error",
              any("parse failure" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        with open(os.path.join(d, "data", "mattresses.csv"), "w", encoding="utf-8", newline="") as f:
            csv.writer(f).writerow(["wrong", "header"])
        check("post-emit mattresses.csv header mismatch -> error",
              any("mattresses.csv: header" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        man = json.load(open(os.path.join(d, "manifest.json"), encoding="utf-8"))
        del man["theme_color"]
        _write(os.path.join(d, "manifest.json"), json.dumps(man))
        check("post-emit manifest missing key -> error",
              any("manifest.json: missing key" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d, with_mj=False)
        check("post-emit mattresses.json missing when build_json=True -> error",
              any("mattresses.json: missing" in e
                  for e in validate_generated_outputs(d, build_json=True).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d, with_mj=False)
        check("post-emit mattresses.json not required when build_json=False",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        _write(os.path.join(d, "data", "accessories.json"), json.dumps({"not": "array"}))
        check("post-emit accessories.json wrong shape -> error",
              any("top-level is not a JSON array" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        cfgp = os.path.join(d, "data", "store-config.json")
        cfg = json.load(open(cfgp, encoding="utf-8"))
        cfg["brands"] = [{"name": "Acme", "logo": "images/brands/acme.jpg"}]
        _write(cfgp, json.dumps(cfg))
        bdir = os.path.join(d, "images", "brands"); os.makedirs(bdir, exist_ok=True)
        _write(os.path.join(bdir, "acme.jpg"), "x")
        check("post-emit brand logo present -> ok",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)
        os.remove(os.path.join(bdir, "acme.jpg"))
        check("post-emit brand logo missing -> error",
              any("not found on disk" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    with tempfile.TemporaryDirectory() as d:
        _write_good_output(d)
        man = json.load(open(os.path.join(d, "manifest.json"), encoding="utf-8"))
        man["icons"] = [{"src": "icon-192.png", "sizes": "192x192", "type": "image/png"},
                        {"src": "icon-512.png", "sizes": "512x512", "type": "image/png"}]
        _write(os.path.join(d, "manifest.json"), json.dumps(man))
        _write(os.path.join(d, "icon-192.png"), "x")
        _write(os.path.join(d, "icon-512.png"), "x")
        _write(os.path.join(d, "apple-touch-icon.png"), "x")
        check("post-emit manifest icons present -> ok",
              validate_generated_outputs(d, build_json=False, languages=["en", "es"]).ok)
        # M3: apple-touch-icon.png must exist when the manifest declares icons.
        os.remove(os.path.join(d, "apple-touch-icon.png"))
        check("post-emit apple-touch-icon missing -> error",
              any("apple-touch-icon.png" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))
        _write(os.path.join(d, "apple-touch-icon.png"), "x")  # restore
        os.remove(os.path.join(d, "icon-512.png"))
        check("post-emit manifest icon missing -> error",
              any("icon 'icon-512.png' not found" in e
                  for e in validate_generated_outputs(d, build_json=False).errors))

    # ---- promotions (scenario-aware) validation ----
    MIDS = {"g7", "s1", "s2", "g1"}

    def _pc(promos):
        return {"promotions": promos}

    good_promo = {
        "activeScenario": "demo",
        "scenarios": {"demo": {
            "kind": "historical-demo", "disableEmailSubmission": True,
            "disclosure": {"en": "Historical demo", "es": "Demo historica"},
            "items": [{"id": "p1", "eligibleMattressIds": ["g7"],
                       "badge": {"en": "B", "es": "B"}, "headline": {"en": "H", "es": "H"},
                       "evidenceStatus": "prior-research-observation",
                       "evidenceProvenance": "seen prior",
                       "sourceUrl": "https://www.wgrfurniture.com/x"}],
            "storewide": [{"id": "s20", "type": "reconstructed-storewide",
                           "badge": {"en": "E", "es": "E"}, "headline": {"en": "H", "es": "H"},
                           "evidenceStatus": "prior-research-observation", "evidenceProvenance": "x"}]}},
    }
    check("promotions valid scenario -> ok",
          validate_promotions(_pc(good_promo), mattress_ids=MIDS).ok)

    def _mut(**path_set):
        return json.loads(json.dumps(good_promo))

    dup = _mut(); dup["scenarios"]["demo"]["storewide"][0]["id"] = "p1"
    check("promotions duplicate id -> error",
          any("duplicate promotion id" in e for e in validate_promotions(_pc(dup), mattress_ids=MIDS).errors))

    badm = _mut(); badm["scenarios"]["demo"]["items"][0]["eligibleMattressIds"] = ["zzz"]
    check("promotions invalid mattress id -> error",
          any("not in mattresses" in e for e in validate_promotions(_pc(badm), mattress_ids=MIDS).errors))

    badacc = _mut(); badacc["scenarios"]["demo"]["items"][0]["eligibleAccessoryIds"] = ["nope"]
    check("promotions invalid accessory id -> error",
          any("not in accessories" in e
              for e in validate_promotions(_pc(badacc), mattress_ids=MIDS, accessory_ids={"base-x"}).errors))

    mes = _mut(); mes["scenarios"]["demo"]["items"][0]["headline"] = {"en": "H", "es": ""}
    check("promotions missing ES headline -> error",
          any("headline missing EN or ES" in e for e in validate_promotions(_pc(mes), mattress_ids=MIDS).errors))

    ua = _mut(); ua["activeScenario"] = "nope"
    check("promotions unknown activeScenario -> error",
          any("activeScenario" in e for e in validate_promotions(_pc(ua), mattress_ids=MIDS).errors))

    bev = _mut(); bev["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "bogus"
    check("promotions bad evidenceStatus -> error",
          any("evidenceStatus" in e for e in validate_promotions(_pc(bev), mattress_ids=MIDS).errors))

    _HOSTS = ["wgrfurniture.com", "www.wgrfurniture.com"]

    nws = _mut()
    nws["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "wgr-product-page"
    nws["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://purple.com/x"
    check("promotions non-allowlisted source -> error",
          any("allowlist" in e for e in validate_promotions(
              _pc(nws), mattress_ids=MIDS, allowed_source_hosts=_HOSTS).errors))
    check("promotions source-backed status without allowlist -> error (fail closed)",
          any("allowlist" in e for e in validate_promotions(
              _pc(nws), mattress_ids=MIDS).errors))
    ok_src = _mut()
    ok_src["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "retailer-product-page"
    ok_src["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://www.wgrfurniture.com/x"
    check("promotions allowlisted source (neutral status) -> ok",
          validate_promotions(_pc(ok_src), mattress_ids=MIDS,
                              allowed_source_hosts=_HOSTS).ok)

    arc = _mut()
    arc["scenarios"]["demo"]["items"][0]["evidenceStatus"] = "wgr-full-page-archive"
    arc["scenarios"]["demo"]["items"][0]["sourceUrl"] = "https://web.archive.org/web/20260525/https://www.wgrfurniture.com/x"
    check("promotions archive of allowlisted host (legacy alias) -> ok",
          validate_promotions(_pc(arc), mattress_ids=MIDS,
                              allowed_source_hosts=_HOSTS).ok)

    nde = _mut(); nde["scenarios"]["demo"]["disableEmailSubmission"] = False
    check("promotions historical-demo without disableEmailSubmission -> error",
          any("disableEmailSubmission" in e for e in validate_promotions(_pc(nde), mattress_ids=MIDS).errors))

    ndd = _mut(); ndd["scenarios"]["demo"]["disclosure"] = {"en": "x", "es": ""}
    check("promotions active demo missing ES disclosure -> error",
          any("disclosure in EN and ES" in e for e in validate_promotions(_pc(ndd), mattress_ids=MIDS).errors))

    t20 = _mut(); t20["scenarios"]["demo"]["storewide"][0]["eligibleMattressIds"] = ["g7"]
    check("promotions 20% on product without eligibility -> error",
          any("eligibleForStorewide20" in e for e in validate_promotions(_pc(t20), mattress_ids=MIDS).errors))

    npp = _mut(); del npp["scenarios"]["demo"]["items"][0]["evidenceProvenance"]
    check("promotions prior-research-observation without provenance -> error",
          any("requires evidenceProvenance" in e for e in validate_promotions(_pc(npp), mattress_ids=MIDS).errors))

    eok = _mut(); eok["scenarios"]["demo"]["items"][0]["endsAt"] = "2026-06-16T23:59:59-05:00"
    check("promotions valid endsAt (ISO + offset) -> ok",
          not any("endsAt" in e for e in validate_promotions(_pc(eok), mattress_ids=MIDS).errors))

    enoff = _mut(); enoff["scenarios"]["demo"]["items"][0]["endsAt"] = "2026-06-16T23:59:59"
    check("promotions endsAt without timezone offset -> error",
          any("endsAt" in e for e in validate_promotions(_pc(enoff), mattress_ids=MIDS).errors))

    ebad = _mut(); ebad["scenarios"]["demo"]["items"][0]["endsAt"] = "soon"
    check("promotions malformed endsAt -> error",
          any("endsAt" in e for e in validate_promotions(_pc(ebad), mattress_ids=MIDS).errors))

    # ---- financing (Lacks Payment Choice) ------------------------------------
    _FHOSTS = ["lacks.com", "www.lacks.com", "synchrony.com"]

    def _fc(fin):
        return {"financing": fin, "discount": {"mode": "disabled"}}

    good_fin = {
        "enabled": True, "experience": "payment-choice",
        "verifiedAt": "2026-07-30T10:53:32-05:00", "maxAgeDays": 7,
        "sourceUrl": "https://www.lacks.com/financing",
        "savingsPassPolicy": "specialist_confirm",
        "exactPromotionsEnabled": False,
        "copy": {"eyebrow": {"en": "E", "es": "E"}, "headline": {"en": "H", "es": "H"}},
        "plans": [{
            "id": "syn-9-99-72", "kind": "open-end-promotional-credit",
            "verified": True, "verifiedAt": "2026-07-30T10:53:32-05:00",
            "sourceUrl": "https://www.lacks.com/financing",
            "apr": 9.99, "termMonths": 72, "minimumPurchase": 500,
            "paymentCalculationEnabled": False,
            "headline": {"en": "H", "es": "H"},
            "detail": {"en": "D", "es": "D"},
            "disclosure": {"en": "X", "es": "X"},
        }],
    }

    def _fmut():
        return json.loads(json.dumps(good_fin))

    check("financing absent -> ok (no-op)",
          validate_financing({}, allowed_source_hosts=_FHOSTS).ok)
    check("financing valid -> ok",
          validate_financing(_fc(good_fin), allowed_source_hosts=_FHOSTS).ok)

    fen = _fmut(); del fen["verifiedAt"]
    check("financing enabled without verifiedAt -> error",
          any("verifiedAt" in e for e in
              validate_financing(_fc(fen), allowed_source_hosts=_FHOSTS).errors))

    fbad = _fmut(); fbad["verifiedAt"] = "2026-07-30"  # no offset
    check("financing verifiedAt without offset -> error",
          any("verifiedAt" in e for e in
              validate_financing(_fc(fbad), allowed_source_hosts=_FHOSTS).errors))

    fhost = _fmut(); fhost["plans"][0]["sourceUrl"] = "https://evil.example.com/x"
    check("financing plan non-allowlisted source -> error",
          any("allowlist" in e for e in
              validate_financing(_fc(fhost), allowed_source_hosts=_FHOSTS).errors))

    fes = _fmut(); fes["plans"][0]["disclosure"] = {"en": "X", "es": ""}
    check("financing exact terms missing ES disclosure -> error",
          any("disclosure" in e for e in
              validate_financing(_fc(fes), allowed_source_hosts=_FHOSTS).errors))

    fmail = _fmut(); fmail["copy"]["emailBody"] = {"en": "B", "es": "B"}
    check("financing emailBody without emailBodyAvailable -> warning (COPY-15)",
          any("emailBodyAvailable" in w for w in
              validate_financing(_fc(fmail), allowed_source_hosts=_FHOSTS).warnings))
    fmail["copy"]["emailBodyAvailable"] = {"en": "N", "es": "N"}
    check("financing emailBody with emailBodyAvailable -> no warning",
          not any("emailBodyAvailable" in w for w in
              validate_financing(_fc(fmail), allowed_source_hosts=_FHOSTS).warnings))

    fdet = _fmut(); del fdet["plans"][0]["detail"]
    check("financing exact terms without adjacent conditions -> error",
          any("adjacent conditions" in e for e in
              validate_financing(_fc(fdet), allowed_source_hosts=_FHOSTS).errors))

    fcalc = _fmut(); fcalc["plans"][0]["paymentCalculationEnabled"] = True
    check("financing paymentCalculationEnabled=true -> error (V1 invariant)",
          any("paymentCalculationEnabled" in e for e in
              validate_financing(_fc(fcalc), allowed_source_hosts=_FHOSTS).errors))

    flto = _fmut()
    flto["plans"].append({"id": "lto", "kind": "lease-to-own", "apr": 99,
                          "headline": {"en": "H", "es": "H"}})
    check("financing lease-to-own with credit terms -> error",
          any("lease-to-own" in e for e in
              validate_financing(_fc(flto), allowed_source_hosts=_FHOSTS).errors))

    fwid = _fmut(); fwid["allowedSourceHosts"] = ["lacks.com", "sketchy.example"]
    check("financing allowedSourceHosts widening -> error",
          any("allowedSourceHosts" in e for e in
              validate_financing(_fc(fwid), allowed_source_hosts=_FHOSTS).errors))

    fstack = _fc(_fmut()); fstack["discount"]["mode"] = "illustrative"
    check("financing enabled + discount not disabled + no stackable policy -> error",
          any("discount.mode" in e for e in
              validate_financing(fstack, allowed_source_hosts=_FHOSTS).errors))

    fpol = _fmut(); fpol["savingsPassPolicy"] = "whatever"
    check("financing bad savingsPassPolicy -> error",
          any("savingsPassPolicy" in e for e in
              validate_financing(_fc(fpol), allowed_source_hosts=_FHOSTS).errors))

    fnoplans = _fmut(); fnoplans["plans"] = []
    check("financing enabled with no plans -> error",
          any("plans" in e for e in
              validate_financing(_fc(fnoplans), allowed_source_hosts=_FHOSTS).errors))

    fdis = _fmut(); fdis["enabled"] = False; del fdis["verifiedAt"]
    check("financing disabled -> light checks only, ok",
          validate_financing(_fc(fdis), allowed_source_hosts=_FHOSTS).ok)

    # future-verifiedAt rejection (observation timestamps cannot postdate now;
    # timestamps computed dynamically so the cases stay valid forever)
    from datetime import datetime, timezone, timedelta

    def _iso(delta_seconds):
        return (datetime.now(timezone.utc) + timedelta(seconds=delta_seconds)) \
            .isoformat(timespec="seconds")

    ffut = _fmut(); ffut["verifiedAt"] = _iso(3600)  # 1h in the future
    check("financing future top-level verifiedAt -> error",
          any("materially in" in e and "future" in e for e in
              validate_financing(_fc(ffut), allowed_source_hosts=_FHOSTS).errors))

    ffar = _fmut(); ffar["verifiedAt"] = "2062-07-30T10:00:00-05:00"  # typo year
    check("financing far-future (typo year) top-level verifiedAt -> error",
          any("future" in e for e in
              validate_financing(_fc(ffar), allowed_source_hosts=_FHOSTS).errors))

    fplanfut = _fmut()
    fplanfut["verifiedAt"] = _iso(-60)          # top-level fine (1 min ago)
    fplanfut["maxAgeDays"] = 7
    fplanfut["plans"][0]["verifiedAt"] = _iso(3600)  # plan 1h in the future
    check("financing future plan verifiedAt -> error",
          any("plans" in e and "future" in e for e in
              validate_financing(_fc(fplanfut), allowed_source_hosts=_FHOSTS).errors))

    fskew = _fmut()
    fskew["verifiedAt"] = _iso(120)             # +2 min: inside 5-min skew
    fskew["plans"][0]["verifiedAt"] = _iso(120)
    check("financing verifiedAt within clock skew -> ok",
          validate_financing(_fc(fskew), allowed_source_hosts=_FHOSTS).ok)

    # ---- URL safety: scheme / credentials / port / host (Commit D) -----------
    _DEAD_MX = "https://www.lacks.com/mexican-credit-application"

    def _url_err(field, url):
        m = _fmut()
        m[field] = url
        return any(f"financing.{field}" in e and "allowlisted host" in e for e in
                   validate_financing(_fc(m), allowed_source_hosts=_FHOSTS).errors)

    check("financing mexicoInfoUrl non-allowlisted host -> error",
          _url_err("mexicoInfoUrl", "https://evil.example.com/faq"))
    check("financing applicationUrl non-allowlisted host -> error",
          _url_err("applicationUrl", "https://evil.example.com/apply"))
    check("financing mexicoInfoUrl allowlisted https -> ok",
          validate_financing(_fc(dict(_fmut(), mexicoInfoUrl="https://www.lacks.com/faq")),
                             allowed_source_hosts=_FHOSTS).ok)

    fnonexact = _fmut()
    fnonexact["plans"].append({"id": "lto", "kind": "lease-to-own",
                               "sourceUrl": "https://evil.example.com/lto",
                               "headline": {"en": "H", "es": "H"}})
    check("financing NON-exact plan sourceUrl non-allowlisted -> error",
          any("lto" in e and "allowlisted host" in e for e in
              validate_financing(_fc(fnonexact), allowed_source_hosts=_FHOSTS).errors))

    for _label, _bad in (
            ("http scheme", "http://www.lacks.com/financing"),
            ("protocol-relative", "//www.lacks.com/financing"),
            ("relative path", "/financing"),
            ("javascript:", "javascript:alert(1)"),
            ("data:", "data:text/html,hi"),
            ("embedded credentials", "https://user@www.lacks.com/financing"),
            ("credentials with password", "https://u:p@www.lacks.com/financing"),
            ("non-default port", "https://www.lacks.com:8443/financing"),
            ("lookalike suffix host", "https://www.lacks.com.evil.example/financing"),
            ("lookalike prefix host", "https://wwwlacks.com/financing"),
            ("malformed", "https://"),
    ):
        check(f"financing sourceUrl {_label} -> error", _url_err("sourceUrl", _bad))

    check("financing sourceUrl explicit default port 443 -> ok",
          validate_financing(_fc(dict(_fmut(), sourceUrl="https://www.lacks.com:443/financing")),
                             allowed_source_hosts=_FHOSTS).ok)
    check("_is_allowed_source: https archive capture of allowlisted host -> True",
          _is_allowed_source("https://web.archive.org/web/20260525/https://www.lacks.com/x",
                             _FHOSTS))
    check("_is_allowed_source: http archive capture -> False (scheme)",
          not _is_allowed_source("http://web.archive.org/web/20260525/https://www.lacks.com/x",
                                 _FHOSTS))
    check("_is_allowed_source: archive of NON-allowlisted target -> False",
          not _is_allowed_source("https://web.archive.org/web/20260525/https://evil.example.com/x",
                                 _FHOSTS))

    # ---- mexicoApplicationUrl shape + anti-conflation (Commit D) -------------
    fmxobj = _fmut(); fmxobj["mexicoApplicationUrl"] = "https://www.lacks.com/x"
    check("financing mexicoApplicationUrl non-object -> error",
          any("must be an object" in e for e in
              validate_financing(_fc(fmxobj), allowed_source_hosts=_FHOSTS).errors))

    fmxver = _fmut()
    fmxver["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": "false"}
    check("financing mexicoApplicationUrl non-boolean verified -> error",
          any("verified must be a boolean" in e for e in
              validate_financing(_fc(fmxver), allowed_source_hosts=_FHOSTS).errors))

    fmxok = _fmut()
    fmxok["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
    check("financing unverified mexicoApplicationUrl stored but unused -> ok "
          "(allowlisted host does not imply availability)",
          validate_financing(_fc(fmxok), allowed_source_hosts=_FHOSTS).ok)

    # Variants a BROWSER normalizes onto the dead target must all collide.
    # Truth table verified against real Chrome and Node (same URL spec).
    _BS = chr(92)
    for _label, _variant in (
            ("exact", _DEAD_MX),
            ("trailing slash", _DEAD_MX + "/"),
            ("double trailing slash", _DEAD_MX + "//"),
            ("query string", _DEAD_MX + "?lang=es"),
            ("fragment", _DEAD_MX + "#form"),
            ("host case", "https://WWW.LACKS.COM/mexican-credit-application"),
            ("explicit default port", "https://www.lacks.com:443/mexican-credit-application"),
            ("dot-dot segment", "https://www.lacks.com/x/../mexican-credit-application"),
            ("single-dot segment", "https://www.lacks.com/./mexican-credit-application"),
            ("nested dot-dot", "https://www.lacks.com/a/b/../../mexican-credit-application"),
            ("dot-dot past root", "https://www.lacks.com/../mexican-credit-application"),
            ("percent-encoded dot-dot", "https://www.lacks.com/x/%2e%2e/mexican-credit-application"),
            ("percent-encoded dot-dot upper", "https://www.lacks.com/x/%2E%2E/mexican-credit-application"),
            ("trailing dot segment", _DEAD_MX + "/."),
            ("backslash separators",
             "https://www.lacks.com/x" + _BS + ".." + _BS + "mexican-credit-application"),
            ("embedded tab", "https://www.lacks.com/mexican-credit-app\tlication"),
            ("percent-encoded unreserved", "https://www.lacks.com/%6dexican-credit-application"),
    ):
        fconf = _fmut()
        fconf["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
        fconf["mexicoInfoUrl"] = _variant
        check(f"financing anti-conflation: dead URL reused as mexicoInfoUrl "
              f"({_label}) -> error",
              any("reuses the unverified mexicoApplicationUrl" in e for e in
                  validate_financing(_fc(fconf), allowed_source_hosts=_FHOSTS).errors))

    fplanconf = _fmut()
    fplanconf["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
    fplanconf["plans"][0]["sourceUrl"] = _DEAD_MX
    check("financing anti-conflation: dead URL reused as a plan sourceUrl -> error",
          any("reuses the unverified mexicoApplicationUrl" in e for e in
              validate_financing(_fc(fplanconf), allowed_source_hosts=_FHOSTS).errors))

    # Genuinely different paths must NEVER collide (no over-normalization).
    for _label, _distinct in (
            ("plain sibling path", "https://www.lacks.com/faq"),
            ("dead name nested under another path",
             "https://www.lacks.com/x/mexican-credit-application"),
            ("dot-dot resolving to a different path",
             "https://www.lacks.com/a/b/../mexican-credit-application"),
            ("path case differs", "https://www.lacks.com/Mexican-Credit-Application"),
            ("reserved %2F stays encoded (not a separator)",
             "https://www.lacks.com/x%2F..%2Fmexican-credit-application"),
            ("empty path segment", "https://www.lacks.com//mexican-credit-application"),
    ):
        fnocollide = _fmut()
        fnocollide["mexicoApplicationUrl"] = {"url": _DEAD_MX, "verified": False}
        fnocollide["mexicoInfoUrl"] = _distinct
        check(f"financing anti-conflation: NO false collision ({_label})",
              validate_financing(_fc(fnocollide), allowed_source_hosts=_FHOSTS).ok)

    # Malformed stored/candidate URLs must fail closed without crashing.
    for _label, _bad_pair in (
            ("malformed stored URL", {"url": "not a url", "verified": False}),
            ("empty stored URL", {"url": "", "verified": False}),
            ("stored URL missing", {"verified": False}),
    ):
        fmalconf = _fmut()
        fmalconf["mexicoApplicationUrl"] = _bad_pair
        _rep = validate_financing(_fc(fmalconf), allowed_source_hosts=_FHOSTS)
        check(f"financing anti-conflation: {_label} does not crash validation",
              isinstance(_rep.errors, list))

    check("_url_identity: malformed inputs return '' (fail closed)",
          all(_url_identity(_x) == "" for _x in
              ("", "not a url", "https://", "///", None, 42, "javascript:alert(1)")))

    fverified = _fmut()
    fverified["mexicoApplicationUrl"] = {"url": "https://www.lacks.com/faq", "verified": True}
    fverified["mexicoInfoUrl"] = "https://www.lacks.com/faq"
    check("financing anti-conflation applies only while verified is not true",
          validate_financing(_fc(fverified), allowed_source_hosts=_FHOSTS).ok)

    fnosrc = _fmut(); del fnosrc["plans"][0]["sourceUrl"]
    check("financing exact terms still require sourceUrl",
          any("exact terms require sourceUrl" in e for e in
              validate_financing(_fc(fnosrc), allowed_source_hosts=_FHOSTS).errors))

    # ---- staleness warning gated on operational enablement (Commit D) --------
    # Deterministic past stamp — never becomes date-sensitive.
    _OLD = "2020-01-01T00:00:00-05:00"
    fstale_on = _fmut()
    fstale_on["verifiedAt"] = _OLD
    fstale_on["plans"][0]["verifiedAt"] = _OLD
    fstale_on["exactPromotionsEnabled"] = True
    check("financing expired verifiedAt + exactPromotionsEnabled true -> warning",
          any("older than maxAgeDays" in w for w in
              validate_financing(_fc(fstale_on), allowed_source_hosts=_FHOSTS).warnings))

    for _label, _policy in (("absent", "__DEL__"), ("false", False),
                            ("malformed string", "true")):
        fstale_off = _fmut()
        fstale_off["verifiedAt"] = _OLD
        fstale_off["plans"][0]["verifiedAt"] = _OLD
        if _policy == "__DEL__":
            del fstale_off["exactPromotionsEnabled"]
        else:
            fstale_off["exactPromotionsEnabled"] = _policy
        _rep_off = validate_financing(_fc(fstale_off), allowed_source_hosts=_FHOSTS)
        check(f"financing expired verifiedAt + exactPromotions {_label} -> NO warning",
              not any("older than maxAgeDays" in w for w in _rep_off.warnings))
        if _policy != False:  # noqa: E712 — absent/malformed are also schema errors
            check(f"financing exactPromotions {_label} -> schema error",
                  any("exactPromotionsEnabled" in e for e in _rep_off.errors))

    # ---- exactPromotionsEnabled field-shape matrix (Commit E) ---------------
    check("financing exactPromotionsEnabled false (shipped initial state) -> ok",
          validate_financing(_fc(_fmut()), allowed_source_hosts=_FHOSTS).ok)

    ftrue = _fmut(); ftrue["exactPromotionsEnabled"] = True
    ftrue["verifiedAt"] = _iso(-60); ftrue["plans"][0]["verifiedAt"] = _iso(-60)
    check("financing exactPromotionsEnabled true + fresh evidence -> ok",
          validate_financing(_fc(ftrue), allowed_source_hosts=_FHOSTS).ok)

    fmissing = _fmut(); del fmissing["exactPromotionsEnabled"]
    check("financing exactPromotionsEnabled missing while enabled -> error",
          any("exactPromotionsEnabled is required" in e for e in
              validate_financing(_fc(fmissing), allowed_source_hosts=_FHOSTS).errors))

    for _label, _bad in (("null", None), ("string 'true'", "true"),
                         ("string 'false'", "false"), ("int 1", 1), ("int 0", 0),
                         ("float", 1.0), ("empty string", ""),
                         ("object", {"enabled": True}), ("array", [True])):
        fshape = _fmut(); fshape["exactPromotionsEnabled"] = _bad
        check(f"financing exactPromotionsEnabled {_label} -> error",
              any("exactPromotionsEnabled" in e for e in
                  validate_financing(_fc(fshape), allowed_source_hosts=_FHOSTS).errors))

    fdis_ok = _fmut(); fdis_ok["enabled"] = False
    del fdis_ok["verifiedAt"]; del fdis_ok["exactPromotionsEnabled"]
    check("financing disabled without the policy field -> ok (not required)",
          validate_financing(_fc(fdis_ok), allowed_source_hosts=_FHOSTS).ok)

    fdis_bad = _fmut(); fdis_bad["enabled"] = False
    del fdis_bad["verifiedAt"]; fdis_bad["exactPromotionsEnabled"] = "true"
    check("financing disabled with a non-boolean policy field -> error",
          any("exactPromotionsEnabled" in e for e in
              validate_financing(_fc(fdis_bad), allowed_source_hosts=_FHOSTS).errors))

    # Exact plan data keeps its full validation while the switch is false —
    # the source must not be allowed to rot structurally just because
    # presentation is disabled.
    for _label, _mutate, _expect in (
            ("unverified exact plan", lambda d: d["plans"][0].__setitem__("verified", False), "verified"),
            ("missing plan disclosure", lambda d: d["plans"][0].pop("disclosure"), "disclosure"),
            ("non-allowlisted plan source",
             lambda d: d["plans"][0].__setitem__("sourceUrl", "https://evil.example.com/x"), "allowlisted"),
            ("payment calculation enabled",
             lambda d: d["plans"][0].__setitem__("paymentCalculationEnabled", True), "paymentCalculationEnabled"),
            ("future plan stamp",
             lambda d: d["plans"][0].__setitem__("verifiedAt", _iso(3600)), "future"),
    ):
        frot = _fmut()          # exactPromotionsEnabled is False here
        _mutate(frot)
        check(f"financing exact-plan validation still applies while policy is false "
              f"({_label})",
              any(_expect in e for e in
                  validate_financing(_fc(frot), allowed_source_hosts=_FHOSTS).errors))

    ffut_on = _fmut()
    ffut_on["verifiedAt"] = _iso(3600)
    ffut_on["exactPromotionsEnabled"] = True
    check("financing future verifiedAt still errors regardless of enablement",
          any("future" in e for e in
              validate_financing(_fc(ffut_on), allowed_source_hosts=_FHOSTS).errors))

    fmal_on = _fmut()
    fmal_on["verifiedAt"] = "not-a-timestamp"
    fmal_on["exactPromotionsEnabled"] = True
    check("financing malformed verifiedAt still errors regardless of enablement",
          any("ISO-8601" in e for e in
              validate_financing(_fc(fmal_on), allowed_source_hosts=_FHOSTS).errors))

    # ---- quiz definition (structure contract) --------------------------------
    def _bl(s):
        return {"en": s, "es": s + " (es)"}

    def _gq():
        """Canonical-shaped quiz that passes with zero errors/warnings."""
        questions = []
        for qid, qtype, opt_ids in QUIZ_CANONICAL:
            q = {"id": qid, "category": _bl("Cat"), "question": _bl("Q?"),
                 "helpText": _bl("Help"), "type": qtype}
            if qtype == "slider":
                q.update({"min": 1, "max": 10, "defaultValue": 5,
                          "labels": [_bl("Soft"), _bl("Medium"), _bl("Firm")]})
            else:
                q["options"] = [
                    {"id": oid, "label": _bl(oid), "icon": "check",
                     "sublabel": _bl("sub"), "scores": {}}
                    for oid in opt_ids]
            questions.append(q)
        return {"questions": questions}

    def _q(quiz, qid):
        return next(x for x in quiz["questions"] if x["id"] == qid)

    check("quiz absent -> ok (no-op)", validate_quiz(None).ok)
    check("quiz canonical shape -> ok", validate_quiz(_gq()).ok)
    check("quiz non-object -> error", not validate_quiz(["x"]).ok)

    qdel = _gq(); qdel["questions"].pop(0)
    check("quiz missing question -> canonical-sequence error",
          any("canonical id/type sequence" in e for e in
              validate_quiz(qdel).errors))

    qswap = _gq()
    qswap["questions"][0], qswap["questions"][1] = \
        qswap["questions"][1], qswap["questions"][0]
    check("quiz reordered questions -> canonical-sequence error",
          any("canonical id/type sequence" in e for e in
              validate_quiz(qswap).errors))

    qopt = _gq(); _q(qopt, "trigger")["options"][0]["id"] = "renamed"
    check("quiz renamed option id -> error",
          any("option ids must be exactly" in e for e in
              validate_quiz(qopt).errors))

    qtag = _gq(); _q(qtag, "sleep_position")["options"][0]["scores"] = {"plushh": 2}
    check("quiz unknown score tag -> error (typo protection)",
          any("unknown score tag" in e for e in validate_quiz(qtag).errors))

    qpts = _gq(); _q(qpts, "sleep_position")["options"][0]["scores"] = {"plush": 9}
    check("quiz score beyond FEATURE_CAP -> error",
          any("1..5" in e for e in validate_quiz(qpts).errors))

    qes = _gq(); _q(qes, "trigger")["options"][0]["label"] = {"en": "only-EN"}
    check("quiz option label missing ES -> error",
          any("label missing EN or ES" in e for e in validate_quiz(qes).errors))

    qskip = _gq()
    _q(qskip, "partner_disturbance")["skipIf"] = \
        {"question": "partner_sleep", "answer": "solo"}
    check("quiz valid skipIf (earlier question) -> ok", validate_quiz(qskip).ok)

    qfwd = _gq()
    _q(qfwd, "partner_sleep")["skipIf"] = \
        {"question": "sleep_position", "answer": "side"}
    check("quiz skipIf forward reference -> error",
          any("not an earlier question" in e for e in validate_quiz(qfwd).errors))

    qhide = _gq()
    _q(qhide, "temperature")["options"][3]["hideIf"] = \
        {"question": "partner_sleep", "answer": "nope"}
    check("quiz hideIf unknown answer -> error",
          any("is not an option of" in e for e in validate_quiz(qhide).errors))

    qcv = _gq()
    _q(qcv, "body_type")["copyVariants"] = [{
        "when": {"question": "partner_sleep", "answerIn": ["partner", "family"]},
        "question": _bl("Alt?"), "helpText": _bl("Alt help")}]
    check("quiz valid copyVariants -> ok", validate_quiz(qcv).ok)

    qcvbad = _gq()
    _q(qcvbad, "body_type")["copyVariants"] = [{
        "when": {"question": "partner_sleep", "answerIn": ["nope"]},
        "question": _bl("Alt?")}]
    check("quiz copyVariants bad answerIn -> error",
          any("answerIn" in e for e in validate_quiz(qcvbad).errors))

    qkey = _gq(); _q(qkey, "body_type")["dynamicCopy"] = "leftover"
    check("quiz unknown question key (e.g. dynamicCopy) -> error",
          any("unknown keys" in e for e in validate_quiz(qkey).errors))

    qsl = _gq(); _q(qsl, "firmness")["defaultValue"] = 42
    check("quiz slider defaultValue out of range -> error",
          any("slider needs integer" in e for e in validate_quiz(qsl).errors))

    print(f"\nSelf-test: {passed} passed, {failed} failed")
    return 0 if failed == 0 else 1


def main(argv=None) -> int:
    import argparse
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--self-test", action="store_true",
                        help="Run built-in validation checks and exit.")
    args = parser.parse_args(argv)
    if args.self_test:
        print("validation.py self-test:")
        return _self_test()
    parser.print_help()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
