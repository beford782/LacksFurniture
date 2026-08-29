# Catalog reason evidence record — 2026-08-28 (item 1.3)

**What this is.** A docs-only preservation of the live-browser source
discovery and identity-binding evidence gathered for item 1.3's per-feature
reason content, so that the evidence is auditable from this repository
without chat memory or agent summaries. It records URLs, identifiers, access
times, concise factual bases, conflicts and governance state. **It authors no
reason content, changes no catalog data, renders nothing and lifts no gate.**

**Baseline.** `main` at `2eef0a8f8713b8fc3006fdcbef4d4fdc75c2341b`
(2026-08-28). No `data/`, `incoming/`, `index.html`, `tools/` or `tests/`
file changed for this record.

**Supersession.** This record supersedes the earlier external
source-discovery result of "14 found / 12 blocked" for the 26 catalog models.
Every one of the 12 "blocked" pages was found and rendered; the blocks were
tool-level (lacks.com returns HTTP 403 to non-browser fetches, and several
products are delisted from category browse and/or the search index while
remaining live by direct URL).

## 0. State — precise language, not a single READY/BLOCKED value

| Dimension | State | Meaning |
|---|---|---|
| Exact-page discovery | **COMPLETE, 26/26** | For every catalog model a current lacks.com product page rendered in a real browser session on 2026-08-28. |
| Exact identity binding | **COMPLETE, with qualifications** | Every page's URL-trailing id equals the repository `sku`; four models carry recorded qualifications (g4/g5 duplicate live catalog records; s9 on-page dual naming; b3 status/firmness) — see §3 and §6. |
| Authoring evidence | **PARTIAL BY AXIS** | Readiness is recorded per (model, axis) in §4; it is not uniform across models or axes. |
| Authoring authorization | **NOT GRANTED** | Item 1.3 reason authoring has not been opened by its approver (Blake). |
| Rendered-output gate (1.3) | **NOT LIFTED** | The Gated block under item 1.3 stands as written; the personalized reason surfaces remain omitted (PR #63). |
| Missing-page discovery block | **LIFTED by this evidence** | No page-level source request remains open for Lacks. This block was a working-state condition on the evidence campaign, never a roadmap Gated clause — lifting it moves no mark. Remaining requests are record/correction-level (§6, §11). |

Page existence is not the same as catalog discoverability, active offer
status, claim readiness, or approval. Each is recorded separately below.

## 1. Provenance and audit trail

- **When.** 2026-08-28, 19:56–20:16 CDT (America/Chicago, UTC−05:00) =
  2026-08-29 00:56–01:16 UTC (the first documented 403 attempt at 00:56:50Z;
  product-page navigations 00:59:53Z–01:13:30Z). Per-page timestamps in §3B are the UTC times at
  which the rendered-browser navigation was issued, taken from the session
  capture log; the tier reports also give approximate CDT times, which agree.
- **How.** Rendered pages in the owner's connected Chrome session
  (`claude-in-chrome`), plus in-page `fetch()` of the catalog REST API for
  corroboration-grade records (`/api/rest/categories/mattresses/products`,
  `/api/rest/search/{term}/products`, `/api/rest/products?filter[sku]`,
  `/api/rest/products/{entity_id}`). Direct `WebFetch`, PowerShell
  `Invoke-WebRequest` (with browser headers) and address-bar navigation to
  `/api/rest/*` all returned **HTTP 403** — documented before the browser
  session was used. Curl-class re-verification is therefore not possible; a
  browser session is required (the same limitation recorded in
  `docs/financing-verification-2026-07-30.md`).
- **Who.** Three read-only tier agents (gold / silver / bronze) and one
  register-reconciliation agent, under a single coordinator; every
  cross-agent conflict was adjudicated on evidence with the exact-target page
  preferred and residuals reported, never by vote. Two prior audit waves and
  one corrected wave (owner directive: live-source verification mandatory)
  preceded this record.
- **Capture log (outside this repository).** The owner's local Claude Code
  session store, project directory
  `C--Users-BlakeFord-Documents-GitHub-LacksFurniture`, session
  `01b48332-777e-4c1a-9af2-8caa2f4988ad`, sub-agent transcripts
  `agent-alive-gold-2e5f2907d8855a9d`, `agent-alive-silver-8455505587c5932e`,
  `agent-alive-bronze-0eab797e08c426ea`,
  `agent-aregister-reconcile-4f6e8c1fa4528403`. Those transcripts hold the
  rendered page text and API responses behind every row here.
- **Deliberately not captured.** No prices. No verbatim retailer marketing
  prose beyond the short identifying strings and factual fragments quoted in
  §4–§6. No screenshots.
- **Repository sources read.** `incoming/lacks_catalog_selection.json` (the
  `sku` field, 26 rows), `incoming/lacks_mattresses.json`,
  `data/mattresses.csv`, `data/mattresses-es.csv`, `data/mattresses.json`,
  `build-data.ps1`, `index.html`, `incoming/build_lacks_workbook.py`,
  `tools/workbook_schema.py`, `tools/convert_store_data.py`,
  `tools/validation.py`, `tests/lineage_check.py`,
  `tests/claim_retirement_check.mjs`, `tests/smoke_check.py`,
  `tests/results_presentation_check.mjs`, `tests/trust_integrity_check.mjs`.

## 2. Identifier model — four identifiers, recorded distinctly

The repository's seven-digit value is **not** a Magento entity id. Four
identifiers exist per product, and this record never conflates them:

| Identifier | Where it appears | Example (g1) |
|---|---|---|
| **Lacks URL / catalog-API SKU** — the repository `sku` in `incoming/lacks_catalog_selection.json` | Trailing segment of the product URL; the `sku` field of the catalog REST API. Never displayed on the page. | `2031576` |
| **Magento / API `entity_id`** | Catalog REST API only (`/api/rest/products/{entity_id}`). Never displayed, never in the URL. Recorded only where independently observed (gold and silver rows); **not observed for bronze**. | `2013879` |
| **Displayed retailer SKU** | The page's "SKU:" line — a short code, typically the first two segments of the model number. | `1606-202` |
| **Full / manufacturer Model #** | The page's "Model #:" line — the retailer SKU plus a manufacturer code suffix (absent on s10, b3, b4). | `1606-202-MZ874SA50` |

**Routing facts observed (binding rules for future lookups).**

- Product URLs are `https://www.lacks.com/product/{slug}-{model-number-lowercased}-{sku}`.
  The leading name words of the slug are ignored by the router, but the
  model-number tail is load-bearing: a wrong slug with the right id serves the
  id's product, while an arbitrary slug with only the trailing id returns 404.
- **Slug text can lie.** The live URL for the Roma (g1) carries the slug
  `restonic-angelina-extra-firm-queen-mattress-1606-202-mz874sa50-2031576`
  and renders the Chattam & Wells Roma. Identity is bound by rendered H1,
  Model # and trailing id, never by slug text.
- The live Model # suffixes embed the factory codes that the owner-workspace
  spec sheets use (s3 ↔ MI847, s5 ↔ MM284, g6 ↔ MU815, g7 ↔ MU715,
  g1 ↔ MZ874SA, g9 ↔ MZ972SA), which is what binds those sheets to current
  targets — and what surfaces the MZ972 collision in §6.

## 3. The 26-row identity register

### 3A. Identifiers (URL-trailing id = repository `sku` for all 26 — verified against `incoming/lacks_catalog_selection.json`)

| id | Repository name (tier) | Lacks URL / catalog-API SKU (repo `sku`) | Magento `entity_id` (observed) | Displayed SKU | Full Model # | Rendered H1 / title (identity string only) |
|---|---|---|---|---|---|---|
| g1 | The Roma (G) | 2031576 | 2013879 | 1606-202 | 1606-202-MZ874SA50 | Chattam & Wells™ The Roma 16" Firm Euro-Top Queen Mattress |
| g2 | The Saint Pierre (G) | 2031583 | 2013883 | 1606-302 | 1606-302-MZ877SA50 | Chattam & Wells™ The Saint Pierre 16.5" Plush Euro-Top Queen Mattress |
| g3 | The Palermo (G) | 2031248 | 2013551 | 1606-102 | 1606-102-MZ674SA50 | Restonic® Chattam & Wells The Palermo Firm Pillowtop Queen Mattress |
| g4 | Tempur-LuxeBreeze 2.0 Soft (G) | 1302546 *(repo)*; clean duplicate catalog record, sku 1273591 | 1337424 *(repo sku)*; 1316572 *(duplicate)* | 1667-882 *(on the duplicate's page)* | 10243251 *(Tempur's own number, both records)* | "Queen Tempur-Luxe Breeze 2.0 2.0 Soft Mattress 10Yr Limited Warranty" — rendered on both records (H1 captured on 1273591; page title captured on 1302546); the doubled "2.0 2.0" and the "Luxe Breeze" spacing are live page text, not capture artifacts (repository name: Tempur-LuxeBreeze 2.0 Soft) |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid (G) | 1302592 *(repo)*; clean duplicate catalog record, sku 1273358 | 1337427 *(repo sku)*; 1316580 *(duplicate)* | 1667-642 | 10242251 *(both records)* | "Queen Tempur-Pro-Breeze 2.0 Medium Hybrid Mattress 10Yr Limited Warranty" — rendered identically on both records; the "Pro-Breeze" hyphenation is live page text (repository name: Tempur-ProBreeze 2.0 Medium Hybrid) |
| g6 | Reserve Mayfair Plush (G) | 1992762 | 1979195 | 1611-372 | 1611-372-MU81550 | Restonic Reserve Mayfair 15" Hybrid Plush Euro Top Queen Mattress (Collection row: "Mayfair II") |
| g7 | Reserve Mayfair Medium (G) | 1992759 | 1979192 | 1611-352 | 1611-352-MU71550 | Restonic Reserve Mayfair 15" Hybrid Medium Tight Top Queen Mattress |
| g8 | Royal Reserve Extra Firm (G) | 1991959 | 1978654 | 1611-112 | 1611-112-MT21050 | Restonic® Royal Reserve 14" Hybrid Extra Firm Tight Top Queen Mattress |
| g9 | Copper Cushion Firm (G) | 2037053 | 2015450 | 1602-862 | 1602-862-MZ972SA50 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted Queen Mattress |
| s1 | Platinum Paige Firm (S) | 1991909 | 1978611 | 1601-732 | 1601-732-ML99150 | Restonic® Platinum Paige 16" Hybrid Firm Box Top Queen Mattress (body/slug: "Paige II") |
| s2 | Platinum Paige Extra Firm (S) | 2029844 | 2011767 | 1601-752 | 1601-752-ML59150 | Restonic® Platinum Paige II 16" Hybrid Extra Firm Queen Mattress |
| s3 | Platinum Maria Plush (S) | 1990900 | 1976073 | 1601-582 | 1601-582-MI84750 | Restonic® Platinum Maria 15.25" Hybrid Plush Box Top Queen Mattress |
| s4 | Platinum Maria Firm (S) | 1990893 | 1976069 | 1601-542 | 1601-542-MI94750 | Restonic Maria Hybrid BT Firm Queen Mattress (body: "Platinum Maria II") |
| s5 | Platinum Summit Firm (S) | 1990906 | 1976077 | 1601-622 | 1601-622-MM28450 | Restonic® Platinum Summit 13.8" Hybrid Firm Tight Top Queen Mattress |
| s6 | Platinum Summit Medium (S) | 1990909 | 1976079 | 1601-642 | 1601-642-MM29450 | Restonic® Platinum Summit 13.8" Hybrid Medium Tight Top Queen Mattress |
| s7 | Platinum Summit Plush (S) | 1990916 | 1976083 | 1601-672 | 1601-672-MM27450 | Restonic® Platinum Summit 13.8" Hybrid Plush Tight Top Queen Mattress |
| s8 | Kendall Firm Euro Top (S) | 1991904 | 1978607 | 1601-452 | 1601-452-MM91350 | Restonic® ComfortCare® Kendall 15.5" Hybrid Firm Euro Top Queen Mattress |
| s9 | Kendall Luxury Medium (S) | 1991879 | 1978587 | 1601-432 | 1601-432-MM71350 | H1 "Restonic Kendal II Hybrid Luxury Medium Queen Mattress"; body and slug "Kendall III" |
| s10 | Kendall Extra Firm (S) | 1989356 | 1974843 | 1601-412 | 1601-412 *(no manufacturer suffix)* | Restonic® ComfortCare® Kendall 14.5" Hybrid Extra Firm Tight Top Queen Mattress |
| b1 | Giselle Plush (B) | 2031219 | not observed | 1601-392 | 1601-392-ML26950 | Restonic® Giselle 12.5" Plush Queen Mattress |
| b2 | Giselle Firm (B) | 2031228 | not observed | 1601-372 | 1601-372-ML23950 | Restonic® Giselle 12.5" Firm Queen Mattress |
| b3 | Genesis Euro Top (B) | 2176812 | not observed | 1623-502 | 1623-502 *(= SKU; brand line "Kingdom Enterprises Inc.")* | Genesis Euro Top Queen Mattress |
| b4 | Genesis Firm (B) | 2176805 | not observed | 1623-522 | 1623-522 *(= SKU)* | Genesis Firm Queen Mattress |
| b5 | Angelina Plush (B) | 1991876 | not observed | 1601-262 | 1601-262-MD47350 | Restonic Angelina Plush Queen Mattress (At-A-Glance: "ComfortCare Angelina II 13" Plush") |
| b6 | Angelina Extra Firm (B) | 1991866 | not observed | 1601-212 | 1601-212-MD27350 | Restonic® ComfortCare® Angelina 13" Hybrid Extra Firm Queen Mattress (body/slug: "Angelina II") |
| b7 | Gracie Medium (B) | 2030258 | not observed | 1601-132 | 1601-132-MC45850 | Restonic® Gracie II Medium Queen Mattress |

### 3B. Direct current URL, access time, discoverability and offer status

All URLs are prefixed `https://www.lacks.com/product/`. Access time is the
UTC instant the rendered-browser navigation was issued (2026-08-29 UTC =
2026-08-28 evening CDT). "Found" means the page rendered with the model's
identity strings; "Offer status" is what the rendered page displayed and is
not an inventory verification.

| id | Direct URL (suffix after `/product/`) | Access (UTC) | Page found | Category / search discoverability | Offer / retail status shown |
|---|---|---|---|---|---|
| g1 | `restonic-angelina-extra-firm-queen-mattress-1606-202-mz874sa50-2031576` | 2026-08-29T01:03:10Z; re-swept 01:13:30Z | YES | In category (Roma K/Q listed) | IN STOCK |
| g2 | `chattam-wells-the-saint-pierre-165-plush-euro-top-queen-mattress-1606-302-mz877sa50-2031583` | 01:03:37Z; re-swept 01:13:30Z | YES | In category | IN STOCK |
| g3 | `chattam-wells-the-palermo-14-firm-pillowtop-queen-mattress-1606-102-mz674sa50-2031248` | 01:03:59Z | YES | **Absent from category browse AND from the search index** ("palermo" returns only the unrelated Princess Palermo family); reached by direct URL after an API sku-filter lookup | Page shows IN STOCK with an active add-to-cart; **active-offer status unconfirmed** |
| g4 | `queen-tempur-luxe-breeze-20-20-soft-mattress-10yr-limited-warranty-10243251-1273591` (clean duplicate); `tempur-pedic-tempur-luxebreeze-13-tempur-material-soft-smooth-top-split-king-mattress-includes-2-pieces-102432-c-1302546` (repo sku) | 1273591: 01:04:18Z, re-swept 01:12:40Z; 1302546: HTTP 403 at 01:05:18Z and 01:05:34Z, rendered 01:10:37Z | YES (both) | Category-absent; the clean duplicate is present in the search index, the repo-sku record was not observed there (see C-dup) | IN STOCK (1273591) |
| g5 | `queen-tempur-pro-breeze-20-medium-hybrid-mattress-10yr-limited-warranty-10242251-1273358` (clean duplicate); `tempur-pedic-tempur-probreeze-12-hybrid-medium-smooth-top-split-king-mattress-includes-2-pieces-102422-c-1302592` (repo sku) | 1273358: 01:06:03Z, re-swept 01:13:05Z; 1302592: 01:06:34Z | YES (both, identical content) | Category-absent; the clean duplicate is present in the search index, the repo-sku record was not observed there (see C-dup) | IN STOCK |
| g6 | `restonic-reserve-mayfair-15-hybrid-plush-euro-top-queen-mattress-1611-372-mu81550-1992762` | 01:07:14Z; re-checked 01:10:37Z | YES | Category-absent; present in search index | IN STOCK |
| g7 | `restonic-reserve-mayfair-15-hybrid-medium-tight-top-queen-mattress-1611-352-mu71550-1992759` | 01:08:08Z | YES | Category-absent; present in search index | IN STOCK |
| g8 | `restonic-royal-reserve-14-hybrid-extra-firm-queen-mattress-1611-112-mt21050-1991959` | 01:09:13Z | YES | Category-absent; present in search index. Sibling sizes renumbered to 2057xxx; the Queen kept 1991959 | IN STOCK |
| g9 | `copper-by-springair-135-hybrid-euro-top-cushion-firm-quilted-queen-mattress-1602-862-mz972sa50-2037053` | 01:09:47Z | YES | In category | IN STOCK |
| s1 | `restonic-platinum-paige-ii-16-hybrid-firm-box-top-queen-mattress-1601-732-ml99150-1991909` | 00:59:53Z | YES | Not individually recorded; url_key and entity_id taken from the catalog API, which returned the record | IN STOCK (page text in the capture log at 00:59:58Z; not in the tier report) |
| s2 | `restonic-platinum-paige-ii-16-hybrid-extra-firm-queen-mattress-1601-752-ml59150-2029844` | 01:00:28Z | YES | Not individually recorded (API record current) | IN STOCK (capture log at 01:00:45Z; not in the tier report) |
| s3 | `restonic-platinum-maria-155-hybrid-plush-box-top-queen-mattress-1601-582-mi84750-1990900` | 01:01:21Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s4 | `restonic-platinum-maria-ii-155-hybrid-bt-firm-queen-mattress-1601-542-mi94750-1990893` | 01:02:01Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s5 | `restonic-platinum-summit-138-hybrid-firm-tight-top-queen-mattress-1601-622-mm28450-1990906` | 01:02:37Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s6 | `restonic-platinum-summit-138-hybrid-medium-tight-top-queen-mattress-1601-642-mm29450-1990909` | 01:03:05Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s7 | `restonic-platinum-summit-138-hybrid-plush-tight-top-queen-mattress-1601-672-mm27450-1990916` | 01:03:35Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s8 | `restonic-comfortcare-kendall-155-hybrid-firm-euro-top-queen-mattress-1601-452-mm91350-1991904` | 01:04:04Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s9 | `restonic-kendall-iii-hybrid-luxury-medium-queen-mattress-1601-432-mm71350-1991879` | 01:04:38Z | YES | Not individually recorded (API record current) | Not individually recorded |
| s10 | `restonic-comfortcare-kendall-155-hybrid-extra-firm-tight-top-queen-mattress-1601-412-1989356` | 01:05:25Z | YES | Not individually recorded (API record current) | Not individually recorded |
| b1 | `restonic-giselle-125-plush-queen-mattress-1601-392-ml26950-2031219` | 01:04:32Z | YES | Present in the paged catalog grid (`/catalog/mattresses?display_mode=products`) | IN STOCK |
| b2 | `restonic-giselle-125-firm-queen-mattress-1601-372-ml23950-2031228` | 01:05:32Z | YES | Present in the paged catalog grid | IN STOCK |
| b3 | `genesis-euro-top-queen-mattress-1623-502-2176812` | 01:03:25Z | YES | **Absent from the paged catalog grid**; URL constructed from the sibling pattern and verified by rendered content and canonical link | **"Product Coming Soon"** — retail status unconfirmed |
| b4 | `genesis-firm-queen-mattress-1623-522-2176805` | 01:04:32Z; re-checked 01:07:23Z | YES | Present in the paged catalog grid | IN STOCK |
| b5 | `restonic-comfortcare-angelina-ii-13-plush-queen-mattress-1601-262-md47350-1991876` | 01:05:56Z | YES | Present in the paged catalog grid | IN STOCK |
| b6 | `restonic-comfortcare-angelina-ii-13-hybrid-extra-firm-queen-mattress-1601-212-md27350-1991866` | 01:06:19Z | YES | Present in the paged catalog grid | IN STOCK; page footnote "Mattress only, all other products sold separately" |
| b7 | `restonic-grace-ii-115-medium-queen-mattress-1601-132-mc45850-2030258` | 01:06:54Z | YES | Present in the paged catalog grid | IN STOCK |

**Qualification on category counts.** The three tier agents observed the
category surface differently and this record does not reconcile them: the
gold agent's category observation returned only 12 mattress items (Roma K/Q,
Saint Pierre K/Q, Copper CF K/Q + XF K + Plush K/Q, new "Elm" Euro-Top Plush
K/Q, Genesis ET King) with Tempur and all Restonic lines absent; the silver
agent's catalog-API pull returned 184 products; the bronze agent harvested
Restonic bronze URLs from the paged product grid (its report says pages 1–4;
its transcript shows page 5 navigated at 01:03:25Z as well). Per-row
discoverability above therefore records only what each row's own agent
observed. Category discoverability is not a claim-readiness input and no row's
identity depends on it.

**Catalog drift observed since the 2026-07-30 scrape (record only; no
repository change).** New "Elm" Euro-Top Plush K/Q (2324418 / 2324417); new
Restonic Platinum Maria II 15.5" Hybrid Extra Firm Queen (trailing id
2031627, Model 1601-512-MI54750, entity_id 2013972); Royal Reserve sibling
sizes renumbered to 2057xxx with a Medium Firm line added; the Queen XF (g8)
kept 1991959.

## 4. Per-model state — nine separated fields

Codes. **Axes** are the applicable per-feature reason slots (the model's
shipped `features` tags that have a `reason_*` column); `†` = dead-by-casing
at runtime (see §8). **Evidence readiness per axis:** `S` = a fact for that
axis is stated on the exact page in classification-clean form; `P` =
construction-presence basis only (no stated claim in the axis's own terms);
`F` = only filter-tainted phrasing is available (absolute, comparative,
medical, longevity or superlative wrappers); `N` = no exact-page basis; `C` =
the relevant fact is contradicted on the binding page. A durability `S`
denotes a stated warranty term only — longevity phrasing is excluded by the
standing claim classes. **Suite / governance clearance:** `RETIRED-SUITE` =
the model is in the retired set pinned by `tests/claim_retirement_check.mjs`
and `tests/smoke_check.py` (§10); `standing` = no model-specific suite
constraint beyond the standing gates in §0 and §11. Nothing in this table is
an authorization.

| id | Page found | Exact target bound | Discoverability | Offer / retail status | Axes | Evidence readiness per axis | Runtime reachability | Suite / governance clearance | Unresolved correction request |
|---|---|---|---|---|---|---|---|---|---|
| g1 | YES | YES (bound by H1 + Model # + id; slug text mangled) | In category | IN STOCK | support, firm, durability | support S · firm S · durability S | 3/3 reachable | standing | None for identity. Residual: manufacturer site (corroboration only) names it "Luxury Firm" and, in its own description, "Medium" — does not bind |
| g2 | YES | YES | In category | IN STOCK | plush, pressureRelief†, durability | plush S · pressureRelief P (word "pressure" absent from page) · durability S · height **C** (16.5" name/overview vs 16" spec row) | 2/3 (pressureRelief dead) | standing | Height contradiction on the binding page — no height fact until corrected. At-A-Glance carries "firm support" boilerplate on a plush model (template copy, low reliability) |
| g3 | YES | YES | Absent from category and search; direct URL only | IN STOCK shown; **offer-status confirmation open** | support, firm, durability | support S · firm S (height 14" agreed by overview and spec table) · durability S (10-yr non-prorated warranty) | 3/3 | standing | Confirm whether the delisted-but-live page is an active retail offer |
| g4 | YES (two live catalog records) | YES, **duplicate-record qualification**: repo sku 1302546 (split-king-mangled slug) and the clean record sku 1273591 carry the same Model # 10243251 | Category-absent | IN STOCK | cooling, plush, pressureRelief†, motionIsolation† | cooling S · plush S (spec "Plush", name "Soft") · pressureRelief P/S ("pressure-relieving material" stated inside a superlative sentence) · motionIsolation F | 2/4 | standing | Which live catalog record is canonical is a Lacks data question; comparative "up to 10° cooler" and absolutes excluded |
| g5 | YES (two live catalog records, identical) | YES, duplicate-record qualification: sku 1302592 (repo) and sku 1273358 | Category-absent | IN STOCK | cooling, support, medium, pressureRelief† | cooling S · support **P** (spec row "Hybrid" only; the word "coil" is absent from the page) · medium S · pressureRelief S/P | 3/4 | standing | None; note the support basis is spec-row-only |
| g6 | YES | YES (Collection row "Mayfair II" vs H1 "Mayfair", same page) | Category-absent; in search | IN STOCK | plush, pressureRelief†, durability | plush S · pressureRelief **P/F** (layer presence only — Talalay, Serene, Nano Coils; the in-axis statements are the comparative "30% more Pressure Relief" and the Serene line "Pressure Relief with the best airflow … no motion transfer", both filter-tainted) · durability S | 2/3 | **RETIRED-SUITE** (banned tokens include hand made, natural materials, lifetime, euro-top/euro top, texas, cooling incl. the key name) | Hand-made attestation divergence (§6); page-stated "hand made" does not clear the suite or the attestation question |
| g7 | YES | YES | Category-absent; in search | IN STOCK | support, medium, durability, pressureRelief† | support S (individually pocketed zoned coil system; Queen coil count 2,015; foam encasement) · medium S · durability S · pressureRelief **P/F** (same layer presence and the same two tainted in-axis statements as g6) | 3/4 | **RETIRED-SUITE** ("zoned coils", "maximum support", "lifetime" etc. banned in EN and ES) | The "25% more support" quantification form (§6 licensee item) |
| g8 | YES | YES | Category-absent; in search | IN STOCK | firm, support, durability | firm S · support S (Queen coil count 2,015; 1 Talalay layer — not the Mayfair 2) · durability S (15-yr non-prorated) | 3/3 | **RETIRED-SUITE** ("maximum support", "strong edges", "outlast", "lifetime" banned) | Hand-made attestation divergence (§6) |
| g9 | YES | YES (bound as "Cushion Firm" by H1/name/breadcrumb) | In category | IN STOCK | cooling, medium, support | cooling S on page **but suite-blocked** · medium **C** (firmness taxonomy: H1 "Cushion Firm", spec row "Firm", "MEDIUM" only as a layer name) · support S (8" 948-count 5-zone coil system; foam encasement) | 3/3 | **RETIRED-SUITE**; cooling axis structurally unauthorable (key-name trap + banned cooling/copper-infused/natuverex/patented) | MZ972 model-code collision (§6); "patented NatuVerex" stated on page vs prior zero-substantiation finding — governance call |
| s1 | YES | YES (bound by H1 "Platinum Paige"; body and slug say "Paige II") | Not individually recorded | IN STOCK (capture log; see §3B) | firm, support, durability | firm S · support S (884 coils; zoned individually pocketed coils; 3" HD foam encasement) — quantified "25% thicker" form open (§6) · durability S (15-yr non-prorated) | 3/3 | standing | Paige / Paige II naming residual on the binding page |
| s2 | YES | YES | Not individually recorded | IN STOCK (capture log; see §3B) | firm, support | firm S (Extra Firm) · support S (overview verbatim-identical to s1) | 2/2 | standing | Spec "Tight Top" vs shared box-top narrative — copy not variant-audited |
| s3 | YES | YES | Not individually recorded | Not individually recorded | plush, pressureRelief†, motionIsolation† | plush S · pressureRelief S (cool-gel memory foam "for pressure relief") · motionIsolation F (only an absolute "No-Motion" line) · height **C** (15.25" H1 vs 15.5" spec/body) | 1/3 | **RETIRED-SUITE** ("wrapped", "zoned coils", "cooling" incl. key name banned) | Height contradiction — no height fact |
| s4 | YES | YES (H1 "Maria", body "Platinum Maria II") | Not individually recorded | Not individually recorded | firm, support, durability | firm S · support S (884; 3" encasement) · durability S | 3/3 | standing | Naming variance reported, not adjudicated |
| s5 | YES | YES | Not individually recorded | Not individually recorded | firm, cooling, support, pressureRelief† | firm S · cooling S (phase-change cooling cover; 4 cooling layers; cool gel) · support S (884; individually pocketed coils; encasement without a 3" figure) · pressureRelief S | 3/4 | standing (cooling-class claims route to governance — §11) | On-page typos ("Ticker", "a fully layer") must not propagate |
| s6 | YES | YES | Not individually recorded | Not individually recorded | medium, cooling, pressureRelief†, support | medium S · cooling S · pressureRelief S · support S (overview verbatim-identical to s5) | 3/4 | standing | Repository "couples" copy has no page basis |
| s7 | YES | YES | Not individually recorded | Not individually recorded | plush, cooling, pressureRelief† | plush S · cooling S · pressureRelief S | 2/3 | standing | None |
| s8 | YES | YES (double space in H1) | Not individually recorded | Not individually recorded | firm, support | firm S (Firm / Euro Top) · support S (884; 3" encasement; center-third thicker coils) | 2/2 | standing | Repository "sewn-under cushion" and "hips level" copy have no page basis |
| s9 | YES | YES as a catalog record (sku / trailing id 1991879); **name conflicted on the page** (H1 "Kendal II"; body and slug "Kendall III") | Not individually recorded | Not individually recorded | medium, motionIsolation†, pressureRelief†, support | medium S · motionIsolation F (no "wrapped" on page; only the absolute "No-Motion" line) · pressureRelief S · support S | 2/4 | standing | Stale H1 — Lacks correction request; repository name follows body/slug. No warranty or Made-In rows on this page |
| s10 | YES | YES | Not individually recorded | Not individually recorded | firm, support, durability | firm S (Extra Firm) · support S · durability S · height **C** (14.5" H1 vs 15.5" spec/slug) | 3/3 | standing | Height contradiction — no height fact; Model # carries no manufacturer suffix |
| b1 | YES | YES (title, Model #, SKU, specs bind Giselle) | In paged grid | IN STOCK | plush, pressureRelief† | plush S · pressureRelief **N** (only the comparative line inside the Grace drift block) | 1/2 | standing | Giselle layer construction unsourced (Grace-family drift, §6) |
| b2 | YES | YES | In paged grid | IN STOCK | firm, support, durability | firm S · support S (center-third thicker coils "for support"; 884 pocketed coils) · durability S (15-yr non-prorated) | 3/3 | standing | Same Grace drift; "better support / no motion" and "proven durability" phrasing excluded |
| b3 | YES | YES with **status caveat** | Absent from the paged grid (bronze agent); absent from the gold agent's 12-item category list, which showed only a Genesis ET King | **"Product Coming Soon"** | medium, support, durability, pressureRelief† | medium **N** (no comfort level stated anywhere on the page) · support S (576 continuous coil system; foam encasement) · durability S (5-yr prorated — differs from the Restonic 15-yr) · pressureRelief S | 3/4 | standing | Retail-status confirmation AND a firmness record are both required before any use |
| b4 | YES | YES | In paged grid | IN STOCK | firm, support, durability | firm S · support S (576 continuous coil) · durability S (5-yr prorated) | 3/3 | standing | "Spine aligned", "years to come", sleeper-preference phrasing excluded |
| b5 | YES | YES (title "Angelina Plush"; At-A-Glance "ComfortCare Angelina II 13"") | In paged grid | IN STOCK | plush, pressureRelief† | plush S · pressureRelief S (hedged center-third zoning line) | 1/2 | standing | Repository "popular with side sleepers" has no page basis; Made-In-USA row renders with no value |
| b6 | YES | YES — the **mattress** record, sku / trailing id 1991866, distinguished from the separate Queen-set record (Model 1601-202GRF, corroboration only, no live set URL located) | In paged grid | IN STOCK ("Mattress only" footnote) | firm, support | firm S (Extra Firm; Tight Top) · support S (center-third thicker coils; 3" encasement; Hybrid) | 2/2 | standing | Layer stack byte-identical to b5 — per-layer construction weakly bound to the firmness variant |
| b7 | YES | YES (page "Gracie II"; repository "Gracie Medium") | In paged grid | IN STOCK | medium, support | medium S · support S (center-third thicker coils; 13-gauge coils with helical wires; 3" encasement; Queen coil count 420) | 2/2 | standing | "Marvelous Middle" trademark absent from the page; page states "Not power base adjustable" (relevant to the adjustable-base cross-sell; recorded, not acted on) |

**Reading the table.** A `YES` under "Page found" plus an `S` under an axis
is still not authoring readiness: the same row must also clear runtime
reachability (a `†` slot renders nowhere today), suite clearance, the
unresolved correction request, and the governance blockers in §11 — none of
which this record lifts.

## 5. Concise factual bases actually observed (identifiers and construction facts only)

Recorded so the `S`/`P` codes above can be audited; no marketing prose, no
prices.

- **Coil systems / counts stated on page:** g1 6,908 (4,000-count micro-coil
  layer + dual Quad coil); g2 8,294 (4,000 micro + 1,386 NanoCoil + dual Quad);
  g3 4,294 (1,386 NanoCoil + dual Quad) — the CSV badge is now
  page-substantiated; g6/g7/g8 Queen 2,015 (individually pocketed, zoned,
  Deluxe Edge Support encasement; g8 has one Talalay layer, the Mayfairs two);
  g9 8" 948-count 5-zone coil system with foam encasement; s1–s10 Queen 884
  (zoned individually pocketed; 3" HD foam encasement stated on Paige, Maria
  and Kendall pages, not on Summit pages); b1/b2 884 coils (stated in the
  generic Giselle bullets and again in the drift block; the "3-zone encased"
  descriptor is drift-block only — see §6); b3/b4 576 continuous coil system with
  foam encasement; b5/b6/b7 Queen 420 (13-gauge power-packed coils with helical
  wires).
- **Comfort level spec rows stated:** Firm g1, g3, s1, s4, s5, s8, b2, b4;
  Plush g2, g4 (name "Soft"), g6, s3, s7, b1, b5; Medium g5, g7, s6, s9, b7;
  Extra Firm g8, s2, s10, b6; "Cushion Firm" (name) with a "Firm" spec row on
  g9; **none stated on b3**.
- **Top / construction rows:** Euro Top g1, g2, g6, g9, s8, b3; Pillow Top g3;
  Box Top s1, s3, s4; Tight Top g7, g8, s2, s5, s6, s7, s9, s10, b6; Smooth
  Top g4, g5; Hybrid construction stated on g5–g9, s1–s10, b4 (body text),
  b5, b6.
- **Heights stated without contradiction:** g1 16", g3 14", g4 13", g5 12",
  g6/g7 15", g8 14", g9 13.5", s1/s2 16", s4 15.5", s5–s7 13.8", s8 15.5",
  s9 15.5", b1/b2 12.5", b5/b6 13", b7 11.5". **Contradicted on page:** g2,
  s3, s10 (§6).
- **Warranty terms stated:** 10-year non-prorated g1–g3; 10-year g4, g5
  (spec row "10 Year"; "Limited" appears only in the product name "10Yr
  Limited Warranty"); 10-year g9; 15-year g6, g7; 15-year non-prorated g8, s1–s4, s8, s10, b1, b2, b5,
  b6, b7 (b7 "limited"); 15-year limited non-prorated s5–s7; 5-year prorated
  b3, b4; **none stated on s9**.
- **Material / layer facts stated (presence only):** Graphite Talalay latex
  and natural wools (g1–g3); Pure Cool® Plus / Ventilated Advanced Relief™ /
  cool-to-the-touch washable cover (g4, g5); Tencel™ cover, New Zealand wool,
  Talalay, Nano Coils (g6–g8; phase-change foam on g6/g7 only — see the
  Reserve bullet below); NatuVerex™ copper cooling
  cover, copper quilted memory foam (g9); Talalay + phase-change memory foam
  stack (s1/s2); cool-gel memory foam layers (s3–s10); phase-change cooling
  cover (s5–s7); 4" adaptive foam (b3/b4).
- **Reserve layer facts, per model:** g6 and g7 — Tencel™ cover, New Zealand
  wool, phase-change PU foam, two HD PU foam layers with gel, stretch
  cotton, two Talalay layers, two Serene Specialty Foam layers, one Nano Coil
  layer; g8 — Tencel™ cover, New Zealand wool, **Quilt Flex HD foam (no
  phase-change layer)**, stretch cotton, **one** Talalay layer, one Nano Coil
  layer. Do not cross-infer between the Mayfairs and the Royal Reserve.
- **Origin rows stated:** "Made In USA" g4, g5, g6–g8 (g6/g7/g8 also
  "hand made" in At-A-Glance), s1–s8, s10, b1, b2, b6 (spec row in the
  capture log; not in the tier report), b7; "Engineered entirely in the USA"
  b3 and b4 (b4 from the capture log, "Engineered entirely in the USA, this
  hybrid mattress"); absent s9; row present with no value b5. Per the standing
  rule, none of these is a locally-made basis and origin is never a scoring
  input.

## 6. Conflict and correction register — preserved exactly

| Ref | Item | State |
|---|---|---|
| C-g3 | Direct page exists but is delisted from category browse and search | **Open.** Offer-status confirmation from Lacks remains required before g3 is treated as an active retail offer |
| C-g9-firm | Firmness taxonomy conflict: H1/name/breadcrumb "Cushion Firm" (repository label, score 6); General Specs row "Mattress Comfort Level: Firm"; "MEDIUM" appears only as the layer name "MEDIUM Comfort Foam" | **Open.** Identity binds as Cushion Firm; the applicable `medium` axis carries a `C`; no firmness-descriptor fact until resolved |
| C-g9-cool | Cooling-axis suite restriction: populating `reasons.cooling` / `reasons_es.cooling` on g9 puts the literal key "cooling" into both retired-model scans (§10), failing them regardless of wording; the value vocabulary (cooling, copper-infused, natuverex, patented) is banned too | **Open.** Structurally unauthorable pending a deliberate, separately authorized suite decision; this record does not propose one |
| C-s9 | Kendal / Kendall II / III naming: the binding page carries H1 "Kendal II" and body/slug "Kendall III"; Full/King/Twin siblings are "Kendall III" (MM713xx series); a dead older listing uses the MG795xx series under "Kendal II" | **Open.** Correction request to Lacks; the repository name follows body/slug and this is recorded as a choice with a residual, not a resolution |
| C-height | s10 (H1 14.5" vs spec 15.5" vs slug "155"); s3 (H1 15.25" vs spec/body 15.5"); g2 (name/overview 16.5" vs spec row 16") | **Open.** No height-based reason on s10, s3 or g2 until the pages are corrected |
| C-giselle | b1/b2 Giselle identity is bound (title, Model #, SKU, specs), but both pages' Product Overview carries a heading "Inside the Grace Plush/Firm:" over an identical layer stack (including "Hyper Soft Memory Foam" on the Firm variant); no Grace Plush/Firm exists on the current site and the live Gracie II lists a different stack | **Open.** Detailed layer construction is **non-binding** (cross-family drift). Source request: current Restonic Giselle 12.5 Plush ML26950 / Firm ML23950 (Queen) construction sheet. Only the generic bullets and spec rows bind (884 coils, 12.5", warranty, center-third coils, cold cover) |
| C-b3 | "Product Coming Soon"; absent from the paged catalog grid (bronze agent) and from the gold agent's category list; no comfort level stated anywhere on the page (repository says Medium); 5-year prorated warranty; brand line "Kingdom Enterprises Inc." | **Open.** Both a retail-status confirmation and a firmness record are required; b3 is the one model whose evidence is blocked rather than partial |
| C-b6 | The exact mattress target (sku / trailing id 1991866, "Mattress only" footnote) versus Queen-**set** listings (Model 1601-202GRF, Google-indexed snippet only; stale set URLs 404) | **Resolved as identity; standing instruction:** never bind b6 to a set record. Separate: the live record at trailing id 2031576 renders the Roma under an Angelina slug — never bind by slug text |
| C-MZ972 | g9's live Model # 1602-862-MZ972SA50 embeds the factory code MZ972, which the owner-workspace Block A record classified as the **17" historical** spec-sheet code, while the shipped product is the 13.5" Copper Cushion Firm | **Open.** Controlling-sheet rationale: the spec sheet pinned from the product's own PDP (owner workspace, SHA-256 beginning 0D4B3E19) remains controlling for g9 because it was captured from the exact target and hash-pinned; a code embedded in the live model number does not by itself reassign the sheet of record. Recorded as a licensee/source clarification request, not resolved here |
| C-licensee | Standing licensee / source clarification requests: (a) the "25%" quantification form — both forms are live and line-specific ("25% thicker coils" on Platinum/ComfortCare pages; "25% more support" on Reserve pages), so the owner-workspace §8.4 question stands and neither form is adopted; (b) the Angelina 342-FE zoning clarification; (c) the written scope of the hand-made attestation — the owner-workspace §14.3.1 attests g7 + g8, the register's O3 lists g6 + g7, only g7 overlaps, and the g6/g7/g8 pages themselves state "hand made" (page presence does not settle attestation); (d) the manufacturer's own Roma page is internally inconsistent on firmness ("Luxury Firm" title, "Medium" description) — corroboration only | **Open** |
| C-dup | g4 and g5 each have two live catalog records (repository sku 1302546 / 1302592 with split-king-mangled slugs; clean duplicates at sku 1273591 / 1273358, each with its own `entity_id`) sharing one Tempur Model # | **Recorded qualification.** Same product; identity binds; which record Lacks considers canonical is unrecorded. The clean duplicates appear in the search index ("tempur"); the repo-sku records were not observed there |
| C-names | Live revision markers absent from repository names: s2 "Paige II", s9 "Kendall III", b5 "Angelina II", b7 "Gracie II"; pages split between an H1 without a marker and body/slug/collection text with one: s1, s4 (body "II"), b6 (At-A-Glance and slug "Angelina II"), g6 (Collection row "Mayfair II"). The Tempur pages render the doubled version token "2.0 2.0" live (it is not a capture artifact) | **Recorded.** Cross-revision inference is a prohibited claim class; identity is bound by id, not by marker |

The Block A string-of-record referenced above exists only on branch
`claude/tier-de-claim-disposition` at `194b959` (present locally and on
`origin`; absent from `main`); the §8.4 / §14.x references are to the
owner-workspace claims-governance records, which are not in this repository.
**Verification boundary:** the 17" historical classification of MZ972, the
342-FE zoning item and the attestation-scope divergence rest on those
owner-workspace records; the 2026-08-28 transcripts verify only the live
model numbers (Queen 1602-862-MZ972SA50; King 1602-863-MZ972SA66) and the
page-stated "hand made" on g6/g7/g8.

## 7. Slot inventory and existing default text — verified from the shipped CSVs

Verified on `data/mattresses.csv` and `data/mattresses-es.csv` at `2eef0a8`
(re-run for this record; agrees with the register agent's byte-level recount
on `data/mattresses.json`).

- A slot is a (model, axis) pair where the model's `features` contains one of
  the eight tags that have a `reason_*` column (`cooling`, `pressureRelief`,
  `motionIsolation`, `support`, `plush`, `medium`, `firm`, `durability`).
  Tags without a column (`soft`, `hybrid`, `zoned`, `responsive`) create no
  slot.
- **Gold 30 · Silver 31 · Bronze 18 · Total 79 slots** = **158 paired EN+ES
  strings** under the validator's both-or-neither rule
  (`tools/validation.py`, the optional-component parity check).
- **63 currently reachable · 16 dead-by-casing** — the 13 `pressureRelief`
  slots (g2, g4, g5, g6, g7, s3, s5, s6, s7, s9, b1, b3, b5) and the 3
  `motionIsolation` slots (g4, s3, s9).
- **All 79 per-feature slots are empty in both languages.** Every
  `reason_cooling` … `reason_durability` cell is blank in both CSVs.
- **`reason_default`: 14 paired EN+ES defaults populated** (g1, g2, g3, g4,
  g5, s1, s2, s5, s9, b1, b2, b3, b4, b7); **12 missing** (g6, g7, g8, g9, s3,
  s4, s6, s7, s8, s10, b5, b6).
- **Disposition of the 14: all classified REVISE; zero approved to retain
  verbatim; zero withdrawn.** Every populated string carries at least one
  prohibited-class clause (longevity, absolute, comparative/superlative,
  medical/alignment, price/value, origin/heritage, sleeper-type, or an
  unsubstantiated quantity) and at least one construction-fact residue. b3 and
  b4 are thin-residue borderline cases where withdrawal may be preferable —
  the owner's call. b1's default asserts a body-zone outcome with no basis in
  b1's own record (the language exists only on b5); g2's default asserts coil
  construction absent from g2's own capture record. No replacement text is
  authored here.

## 8. Runtime findings — diagnostic only, nothing changed

Line numbers are at `2eef0a8` and will drift; the described behaviour is the
anchor.

- **Personalized reason surfaces remain omitted under PR #63** (merged
  2026-08-25 as `f87194a`): the drawer "Why it made your shortlist" / "Por qué
  llegó a tu lista" sentence and the Compare "Why it is here" / "Por qué está
  aquí" row are not rendered, pinned by `tests/results_presentation_check.mjs`
  and `tests/trust_integrity_check.mjs`.
- **`reasons` has exactly one reader, inside `calculateScores()`**
  (`index.html:14892` ff.): `const reason = m.reasons?.[feat];` at
  `index.html:14936`, guarded by `if (m.features?.includes(feat))` at
  `:14930`.
- **`matchReasons` is discarded at the sole call site:** `window.showResults`
  does `var calc = calculateScores(); var scores = calc.scores;` at
  `index.html:17127–17128` and never reads `calc.matchReasons`; no other
  `.matchReasons` reference exists.
- **`reasons_es` has no reader** anywhere in `index.html`.
- **`pressureRelief` and `motionIsolation` are unreachable** because
  `build-data.ps1:42` (`$tag = $_.Trim().ToLower()`) lowercases every feature
  tag and the kebab-to-camel step restores capitals only after a hyphen, so
  the shipped `features` carry `pressurerelief` / `motionisolation` while the
  quiz score keys are camelCase (`data/quiz.json:223`, `:356`) and the engine
  comparison is case-sensitive. The `reasons` map is built without
  lowercasing (`build-data.ps1:66–82`, reused for `reasons_es` at
  `:168–172`), so it is already keyed camelCase.
- **The 16 affected slots stay dormant** pending the separately authorized
  item 3.1 fix (🔒, Blake, "not a drive-by fix"). The governing worksheet rule
  sequences that fix **before drafting** those lines. This record neither
  fixes nor works around the defect.

## 9. Canonical authoring lineage — verified, with the unimplemented ES requirement recorded

```
incoming/lacks_mattresses.json
  → incoming/build_lacks_workbook.py
  → incoming/Lacks_Store_Data.xlsx
  → tools/convert_store_data.py
  → data/mattresses.csv + data/mattresses-es.csv
  → build-data.ps1
  → data/mattresses.json
```

- `tests/lineage_check.py` makes the chain executable: it rebuilds the
  workbook from the committed sources, compares it cell-semantically with the
  committed xlsx, converts it in temp space and canonically compares both
  mattress CSVs with the committed bundle, with a non-vacuity mutation. "A
  source change without a rebuild fails step 2/4; a workbook or bundle hand
  edit fails the same steps from the other side." Reason strings hand-authored
  only in `data/` therefore cannot pass; **authoring must enter at
  `incoming/lacks_mattresses.json` and flow down.**
- Stage handling of the eight per-feature reason columns: the workbook schema
  defines all eight EN columns and their eight "(ES)" twins
  (`tools/workbook_schema.py`); the canonical builder's `MATT_EN_COLS`
  includes them and `mattress_row` copies any matching key; the converter
  passes every column through generically; the validator's parity gate names
  all eight plus `reason_default`; `build-data.ps1` maps all nine EN columns
  and reuses the map for ES.
- **Gap, recorded and NOT modified:** `MATT_ES_KEYS` in
  `incoming/build_lacks_workbook.py:89–92` lists only `reason_default` among
  the reason fields (`displayBadges`, `highlight`, `reason_default`,
  `topPickReason`, `differentiator1Title`, `differentiator1Detail`,
  `differentiator2Title`, `differentiator2Detail`). The eight per-feature ES
  cells are therefore structurally always blank in the built workbook.
  **`MATT_ES_KEYS` must eventually include all eight per-feature reason keys**
  before any Spanish per-feature reason can flow through the lineage. That
  change is a separately authorized pipeline extension and is not part of
  this record.

## 10. Claim-retirement constraints — preserved; not weakened by this evidence

- **Retired set** (owner ruling 2026-08-12; PR #41): `g6`, `g7`, `s3`, `g8`,
  `g9`, pinned at `tests/claim_retirement_check.mjs:38` and
  `tests/smoke_check.py` (the `retired_ids` tuple).
- **Twin scans.** Both suites lowercase the JSON serialization of nine display
  fields — `tags`, `tags_es`, `archetype`, `highlight`, `highlight_es`,
  `topPickReason`, `differentiators`, **`reasons`, `reasons_es`** — and fail
  on any of the same 30 banned tokens (hand-made, hand made, hecho a mano,
  hecha a mano, texas, natural materials, materiales naturales, wrapped,
  envueltos, strong edges, bordes fuertes, lifetime, toda la vida, euro-top,
  euro top, craftspeople, artesanos, copper-infused, infusión de cobre,
  cooling, frescura, patented, patentada, natuverex, zoned coils, resortes
  zonificados, outlast, duran más, maximum support, máximo soporte). Both must
  pass independently.
- **Key-name trap.** Because the whole `reasons` object is serialized, JSON
  keys count as scanned text: populating `reasons.cooling` or
  `reasons_es.cooling` on any of the five fails both suites on the literal key
  "cooling" regardless of value. Only that key collides; e.g. `support` alone
  is not banned.
- **Tag pins.** The five keep exactly one name-derived display tag each
  (`["Plush"]`, `["Medium"]`, `["Plush Box Top"]`, `["Extra Firm"]`,
  `["Cushion Firm"]`), and EN/ES tag counts must match on every model.
- **Per model:** g6 — the withdrawn Mayfair vocabulary (hand made, natural
  materials, lifetime, euro-top, texas) is banned even though the exact page
  states several of those things; g7 — same exposure; authoring is not
  forbidden by the suite itself (it remains ungranted by governance), but
  every string enters the scans verbatim-lowercased and must ship paired
  EN+ES; g8 — "maximum support", "strong edges", "outlast" are
  banned, the most natural extra-firm/durability phrasings; g9 — the cooling
  slot is structurally unauthorable (above) and "patented"/"natuverex" are
  banned although stated on the page; s3 — "wrapped", "zoned coils" and
  "cooling" are banned, so a motion-isolation or plush reason cannot describe
  the coil or gel mechanism in those words in either language.
- **Exact-page presence of a claim does not authorize its return.** The
  suites exclude by classification, not by source absence. **Current evidence
  does not itself authorize removal or weakening of the retirement suites**;
  any per-model disposition is an owner ruling taken separately.
- Housekeeping noticed, not acted on: there is no reintroduction guard on
  `main` for the PR #22 bronze/silver withdrawals (both scans are scoped to
  the five retired ids); `tools/workbook_schema.py:252` still carries the
  stale "+25 scoring bonus when yes" note for `locally-made` (comment only);
  `index.html:8659` carries a CSS comment describing per-feature reason
  bullets "surfaced from m.reasons*" — a comment, not a reader, so the
  single-reader finding in §8 stands.

## 11. Remaining authoring and governance blockers

None of these is closed by this record. Each is stated as a condition, not
an intention.

1. **Item 1.3 authoring not opened** — approver Blake; the Gated block under
   1.3 stands; the rendered-output gate is not lifted.
2. **Native-Spanish claim-equivalence reviewer unnamed** — the validator's
   both-or-neither rule means EN-only content cannot validate; the reviewer is
   explicitly outside Invariant 12's consolidated pass; the pilot waiver was
   pilot-only.
3. **`MATT_ES_KEYS` pipeline extension** (§9) — separately authorized; not
   done.
4. **Item 3.1 case-fold fix** (🔒, Blake) — sequences before drafting any of
   the 16 dead slots.
5. **Per-model suite dispositions for g6, g7, g8, g9, s3** (§10) — owner
   rulings; the cooling key on g9 in particular.
6. **Page-correction and source requests to Lacks** (§6): g3 offer status;
   b3 retail status + firmness; s9 naming; s10/s3/g2 heights; Giselle
   construction sheet; the MZ972 collision; the licensee items (25% form,
   342-FE zoning, hand-made attestation scope).
7. **Legal-scope reconciliation** — the owner-workspace amendment (legal
   review only for financing and data capture) versus the roadmap's open legal
   reviewer and the claims-register cooling-set routing; no two-sided
   reconciling document exists; cooling-class claims are treated as routed
   until it does.
8. **The 15-decision owner matrix** from the claims-governance report is the
   ruling set authoring needs; it is not in this repository and is not
   re-derived here.
9. **Price-block items** (b4/b7 store-wide value claims in shipped defaults;
   the wider price-positioning surface) — out of scope for this record;
   pricing remains dark under Phase 2.1 and 2.2 is untouched.

## 12. First-authoring-tranche recommendation — no strings written

**Do not open with retired models.** g6, g7 and s3 carry the strongest
owner-approved facts, but authoring them first would bundle content authoring
with the suite/governance dispositions in §10 and §11(5). They are excluded
from the first tranche on that ground alone, not on evidence.

**Proposed initial nucleus (four slots):**

| Slot | Exact target | Basis class | Why it qualifies |
|---|---|---|---|
| `s5.reason_firm` | 1990906 / 1601-622-MM28450 | Spec row "Firm"; Tight Top | Non-retired; stated; no page conflict on firmness; no 3.1 dependency |
| `s1.reason_support` | 1991909 / 1601-732-ML99150 | Zoned individually pocketed coils, Queen 884, 3" HD foam encasement — **unquantified zoning basis only** | Non-retired; stated; the "25%" quantification stays out until §6 C-licensee(a) is ruled; naming residual does not touch the support fact |
| `b2.reason_firm` | 2031228 / 1601-372-ML23950 | Spec row "Firm" | Non-retired; stated; the Giselle drift concerns layer construction, not the firmness label |
| `b7.reason_medium` | 2030258 / 1601-132-MC45850 | Spec row "Medium" | Non-retired; stated; "Gracie II" naming is identity-level only |

**Additional candidates proposed for the owner's consideration** — each
non-retired, backed by an exact current target, outside the
pressureRelief/motionIsolation case-fold set, free of an unresolved page
conflict for the proposed fact, and non-medical, non-comparative,
non-price/value, non-longevity and independent of local/Texas origin. Each
rests on the page's own "Mattress Comfort Level" spec row, the cleanest
fact class observed:

- `s4.reason_firm` (Firm; the Maria / Maria II naming split is identity-level)
- `s2.reason_firm` (Extra Firm; the Tight-Top-vs-box-top copy contradiction
  concerns top type, not firmness)
- `s8.reason_firm` (Firm / Euro Top)
- `s6.reason_medium` (Medium)
- `s7.reason_plush` (Plush)
- `b4.reason_firm` (Firm; its shipped default's price/origin clauses are a
  separate disposition and do not taint the spec row)
- `b6.reason_firm` (Extra Firm; the set trap is resolved as identity)
- `b5.reason_plush` (Plush; the Angelina / Angelina II marker is identity-level)

Conditional, not proposed until their residuals are ruled: `g1.reason_firm`
(the binding page is consistent, but the manufacturer's corroboration page is
not); `s10.reason_firm` (firmness is consistent, the height row is not —
a firmness-only string would avoid it, but the page carries an open
correction request); `g3.reason_firm` (offer status open).

**Excluded from any first tranche:** every `†` slot (3.1-sequenced);
`g9.reason_cooling` (suite-unauthorable); all cooling-class slots on
non-retired models (s5/s6/s7 cooling) pending the routing question in §11(7);
all support slots whose only basis is the quantified "25%" form; b3 entirely;
all price/value angles.

**Production strings are not written in this record.** Any first dark
authoring tranche would require its own separate authorization block from
the owner, proposed only after this record has been reviewed and merged
(the owner's standing instruction); nothing begins on this record's account.

## 13. What this record does not do

- Authors no reason content in either language.
- Changes no catalog data, workbook, generated file, runtime code, test or
  pipeline script.
- Lifts no gate: item 1.3 remains ◐; its Gated and Proceeds block is
  unchanged; the rendered-output gate is not lifted; authoring authorization
  is not granted.
- Does not amend, remove or weaken the claim-retirement suites.
- Does not fix or work around the 3.1 case-fold defect.
- Touches nothing in Phase 2: pricing remains dark; 2.2 is untouched.
- Does not verify inventory, active-offer status or catalog placement beyond
  what the rendered page displayed at the recorded instant; pages change, and
  a later reader must re-open the URLs in a browser session to re-verify.
