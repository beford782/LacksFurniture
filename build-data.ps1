# build-data.ps1 - Converts data/mattresses.csv to data/mattresses.json
# Run from repo root: .\build-data.ps1
# Uses $PSScriptRoot so it works regardless of the current working directory.

$csvPath = Join-Path $PSScriptRoot "data\mattresses.csv"
$jsonPath = Join-Path $PSScriptRoot "data\mattresses.json"
$esCsvPath = Join-Path $PSScriptRoot "data\mattresses-es.csv"

if (-not (Test-Path $csvPath)) {
    Write-Error "CSV not found at $csvPath"
    exit 1
}

$rows = Import-Csv -Path $csvPath

# Load Spanish translation CSV if it exists
$esLookup = @{}
if (Test-Path $esCsvPath) {
    $esRows = Import-Csv -Path $esCsvPath
    foreach ($esRow in $esRows) {
        $esLookup[$esRow.id.Trim()] = $esRow
    }
    Write-Host "Loaded $($esLookup.Count) Spanish translations from $esCsvPath"
} else {
    Write-Host "No Spanish CSV found at $esCsvPath - skipping Spanish fields"
}

# ---- THE FEATURE-TAG NORMALIZATION CONTRACT (A4.2 corrective pass) -----------
# One definition, executed by the build and by
# tests/feature_tag_normalization_check.py, which runs it against
# tests/fixtures/feature_tag_normalization_cases.json - the same table that
# drives tools/validation.py's normalize_feature_tag(). Two implementations
# exist (PowerShell builds, Python validates); the table is what stops them
# drifting, and the drift it was written for was real: the A4.2 reachability
# validator compared RAW CSV spellings to camelCase quiz keys, so a kebab-case
# source the generator normalizes correctly was reported unreachable.
#
# The contract:
#   * trim surrounding whitespace;
#   * a tag with no hyphen is already canonical and is preserved VERBATIM
#     (the CSV, generated from the workbook, is the authority on its own
#     spelling - this script may not invent case);
#   * a hyphenated tag lowercases its FIRST segment, then appends each
#     subsequent NON-EMPTY segment with its first character upper-cased and the
#     remainder untouched, so `pressure-relief` and `PRESSURE-Relief` both
#     normalize to `pressureRelief` while `pressure-RELIEF` stays
#     `pressureRELIEF` (the rest of a segment is never re-cased).
function Convert-FeatureTag {
    param([string]$Tag)
    $tag = if ($null -eq $Tag) { '' } else { $Tag.Trim() }
    $parts = $tag.Split('-')
    if ($parts.Length -eq 1) { return $tag }
    $camel = $parts[0].ToLower()
    for ($i = 1; $i -lt $parts.Length; $i++) {
        if ($parts[$i].Length -gt 0) {
            $camel += $parts[$i].Substring(0,1).ToUpper() + $parts[$i].Substring(1)
        }
    }
    return $camel
}

$result = @{ gold = @(); silver = @(); bronze = @() }

foreach ($row in $rows) {
    $tier = $row.tier.Trim().ToLower()
    if (-not $result.ContainsKey($tier)) {
        Write-Warning "Unknown tier '$tier' for mattress $($row.id) - skipping"
        continue
    }

    # Build features array from pipe-delimited features column (scoring tags)
    # Convert kebab-case to camelCase to match quiz score keys.
    #
    # A4.1 (roadmap 3.1, the scoring case-fold defect): this block used to run
    # $_.Trim().ToLower() FIRST and then restore capitals only after a hyphen.
    # A tag the CSV already authored in camelCase has no hyphen to restore
    # from, so `pressureRelief` and `motionIsolation` reached the engine as
    # `pressurerelief` / `motionisolation`. calculateScores() compares feature
    # keys to the quiz's scoring keys by exact array membership, so all ten
    # scoring rules that award those two keys - across six questions,
    # including the strongest partner-disturbance answer and hip pain - could
    # never fire. The catalog and the app were both correct; only this
    # normalizer disagreed with them.
    #
    # The rule now: a tag with no hyphen is already canonical and is preserved
    # VERBATIM (the CSV, generated from the workbook, is the authority on its
    # own spelling - this script may not invent case); a kebab-case tag is
    # still lowered and camelized exactly as before, so `pressure-relief` and
    # `PRESSURE-Relief` both normalize to `pressureRelief`. Any drift between
    # a catalog tag and a quiz key - in either direction - is caught by
    # tests/scoring_key_contract_check.mjs, which also pins this block.
    $features = @()
    if ($row.features -and $row.features.Trim()) {
        $features = $row.features.Split('|') | ForEach-Object { Convert-FeatureTag $_ }
    }

    # Phase 2.2 (slice 2.2b): optional per-size SKU map, `queen:SKU|king:SKU`.
    # Emitted ONLY when populated (exactly like topPickReason below), so the
    # shipped catalog — which carries none — stays byte-identical, and the
    # runtime gate treats an absent map and an empty map the same. The values
    # are governed final-gate data; the validator owns their grammar. A CSV
    # without the column (template heritage) parses as none.
    $skus = [ordered]@{}
    if ($row.PSObject.Properties['skus'] -and $row.skus -and $row.skus.Trim()) {
        foreach ($pair in $row.skus.Split('|')) {
            $p = $pair.Trim()
            if (-not $p) { continue }
            $idx = $p.IndexOf(':')
            if ($idx -lt 1 -or $idx -ge ($p.Length - 1)) { throw "mattress $($row.id): skus entry '$p' must be size:SKU" }
            $size = $p.Substring(0, $idx).Trim()
            $sku = $p.Substring($idx + 1).Trim()
            if (-not $size -or -not $sku) { throw "mattress $($row.id): skus entry '$p' must be size:SKU" }
            if ($skus.Contains($size)) { throw "mattress $($row.id): duplicate skus size '$size'" }
            $skus[$size] = $sku
        }
    }

    # Build tags array from pipe-delimited displayBadges (display chips).
    # @(...) so a SINGLE badge stays an ARRAY: a bare PS 5.1 pipeline unrolls
    # one item to a scalar, which serializes as a JSON string and breaks every
    # (m.tags || []).join() consumer. features is deliberately NOT wrapped in
    # this slice — it is a scoring input and its serialization is a separately
    # audited issue (owner ruling, 2026-08-12).
    $tags = @()
    if ($row.displayBadges -and $row.displayBadges.Trim()) {
        $tags = @($row.displayBadges.Split('|') | ForEach-Object { $_.Trim() })
    }

    # Build reasons object from reason_* columns
    $reasons = @{}
    $reasonKeys = @(
        @{ csv = "reason_cooling";          json = "cooling" },
        @{ csv = "reason_pressureRelief";   json = "pressureRelief" },
        @{ csv = "reason_motionIsolation";  json = "motionIsolation" },
        @{ csv = "reason_support";          json = "support" },
        @{ csv = "reason_plush";            json = "plush" },
        @{ csv = "reason_medium";           json = "medium" },
        @{ csv = "reason_firm";             json = "firm" },
        @{ csv = "reason_durability";       json = "durability" },
        @{ csv = "reason_default";          json = "default" }
    )
    foreach ($rk in $reasonKeys) {
        $val = $row.($rk.csv)
        if ($val -and $val.Trim()) {
            $reasons[$rk.json] = $val.Trim()
        }
    }

    # Parse firmness score
    $firmness = 5
    if ($row.firmnessScore -and $row.firmnessScore.Trim()) {
        $firmness = [int]$row.firmnessScore.Trim()
    }

    # Parse locally-made to boolean
    $locallyMade = $false
    if ($row.'locally-made' -and $row.'locally-made'.Trim().ToLower() -eq 'yes') {
        $locallyMade = $true
    }

    $subBrand = ""
    if ($row.subBrand -and $row.subBrand.Trim()) { $subBrand = $row.subBrand.Trim() }
    # pitchKey is internal-only — used by SUBBRAND_NOTES lookup cascade in the renderer
    # (pitchKey || subBrand). Customer display reads subBrand. Most rows leave this empty;
    # populated only when one subBrand banner needs to split into multiple sales pitches.
    $pitchKey = ""
    if ($row.pitchKey -and $row.pitchKey.Trim()) { $pitchKey = $row.pitchKey.Trim() }
    # archetype is customer/RSA-visible — renders as the chip tag "[tier] · [archetype]"
    # in the handoff redesign. See docs/5d-content-spec.md "Handoff Screen Redesign".
    $archetype = ""
    if ($row.archetype -and $row.archetype.Trim()) { $archetype = $row.archetype.Trim() }
    # displayPriority is a sequencing tiebreaker — lower = earlier. Manufacturer brands
    # default to 1, retailer-house brands to 2, so a tied score never elevates a house
    # pick above a manufacturer pick. Defaults to 1 if missing.
    $displayPriority = 1
    if ($row.displayPriority -and $row.displayPriority.Trim()) {
        $displayPriority = [int]$row.displayPriority.Trim()
    }
    $firmnessLbl = ""
    if ($row.firmnessLabel -and $row.firmnessLabel.Trim()) { $firmnessLbl = $row.firmnessLabel.Trim() }
    $highlight = ""
    if ($row.highlight -and $row.highlight.Trim()) { $highlight = $row.highlight.Trim() }
    $topPickEn = ""
    if ($row.topPickReason -and $row.topPickReason.Trim()) { $topPickEn = $row.topPickReason.Trim() }
    $differentiatorEn = @(
        @{
            title  = if ($row.differentiator1Title) { $row.differentiator1Title.Trim() } else { "" }
            detail = if ($row.differentiator1Detail) { $row.differentiator1Detail.Trim() } else { "" }
        },
        @{
            title  = if ($row.differentiator2Title) { $row.differentiator2Title.Trim() } else { "" }
            detail = if ($row.differentiator2Detail) { $row.differentiator2Detail.Trim() } else { "" }
        }
    )

    # Auto-resolve image URL from images/mattresses/ folder
    $imageUrl = ""
    $imgName = $row.name.Trim().ToLower()
    $imgDir = Join-Path $PSScriptRoot "images\mattresses"
    foreach ($ext in @("jpg", "png", "webp")) {
        if (Test-Path "$imgDir\$imgName.$ext") {
            $imageUrl = "images/mattresses/$imgName.$ext"
            break
        }
    }

    # Build Spanish fields if translation exists
    $tags_es = @()
    $highlight_es = ""
    $reasons_es = @{}
    $topPickEs = ""
    $differentiatorEs = @(
        @{ title = ""; detail = "" },
        @{ title = ""; detail = "" }
    )
    $mattressId = $row.id.Trim()
    if ($esLookup.ContainsKey($mattressId)) {
        $esRow = $esLookup[$mattressId]

        # Spanish display badges -> tags_es. @(...) for the same single-badge
        # array-shape guarantee as the EN tags above.
        if ($esRow.displayBadges -and $esRow.displayBadges.Trim()) {
            $tags_es = @($esRow.displayBadges.Split('|') | ForEach-Object { $_.Trim() })
        }

        # Spanish highlight
        if ($esRow.highlight -and $esRow.highlight.Trim()) {
            $highlight_es = $esRow.highlight.Trim()
        }

        # Spanish reasons
        foreach ($rk in $reasonKeys) {
            $esVal = $esRow.($rk.csv)
            if ($esVal -and $esVal.Trim()) {
                $reasons_es[$rk.json] = $esVal.Trim()
            }
        }

        # Spanish top-pick reason (single string, not an object of keys)
        if ($esRow.topPickReason -and $esRow.topPickReason.Trim()) {
            $topPickEs = $esRow.topPickReason.Trim()
        }

        $differentiatorEs = @(
            @{
                title  = if ($esRow.differentiator1Title) { $esRow.differentiator1Title.Trim() } else { "" }
                detail = if ($esRow.differentiator1Detail) { $esRow.differentiator1Detail.Trim() } else { "" }
            },
            @{
                title  = if ($esRow.differentiator2Title) { $esRow.differentiator2Title.Trim() } else { "" }
                detail = if ($esRow.differentiator2Detail) { $esRow.differentiator2Detail.Trim() } else { "" }
            }
        )
    }

    # Assemble bilingual {en, es} object. Only emit if at least one language is populated.
    $topPickReason = $null
    if ($topPickEn -or $topPickEs) {
        $topPickReason = [ordered]@{
            en = $topPickEn
            es = $topPickEs
        }
    }

    $differentiators = @()
    for ($i = 0; $i -lt 2; $i++) {
        $enTitle = $differentiatorEn[$i].title
        $enDetail = $differentiatorEn[$i].detail
        $esTitle = $differentiatorEs[$i].title
        $esDetail = $differentiatorEs[$i].detail
        if ($enTitle -or $enDetail -or $esTitle -or $esDetail) {
            $differentiators += ,([ordered]@{
                title = [ordered]@{ en = $enTitle; es = $esTitle }
                detail = [ordered]@{ en = $enDetail; es = $esDetail }
            })
        }
    }

    $mattress = [ordered]@{
        id              = $row.id.Trim()
        name            = $row.name.Trim()
        brand           = $row.brand.Trim()
        subBrand        = $subBrand
        pitchKey        = $pitchKey
        archetype       = $archetype
        displayPriority = $displayPriority
        firmness        = $firmness
        firmnessLabel   = $firmnessLbl
        locallyMade     = $locallyMade
        features        = $features
        tags            = $tags
        highlight       = $highlight
        tags_es         = $tags_es
        highlight_es    = $highlight_es
        imageUrl        = $imageUrl
        reasons         = $reasons
        reasons_es      = $reasons_es
        differentiators = $differentiators
    }
    if ($null -ne $topPickReason) {
        $mattress["topPickReason"] = $topPickReason
    }
    if ($skus.Count -gt 0) {
        $mattress["skus"] = $skus
    }

    $result[$tier] += $mattress
}

# Convert to JSON and write
$json = $result | ConvertTo-Json -Depth 6
[System.IO.File]::WriteAllText($jsonPath, $json, (New-Object System.Text.UTF8Encoding $false))

$counts = "gold: $($result.gold.Count), silver: $($result.silver.Count), bronze: $($result.bronze.Count)"
Write-Host "Built $jsonPath - $counts"
