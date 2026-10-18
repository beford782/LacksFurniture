# Assortment coverage: catalog x size x website SKU (2026-10-16)

> **Website extraction, UNVERIFIED, captured 2026-10-03. These are NOT production prices.** Source: `demo/price-review/2026-10-03/mapping.json` (an automated identity match over an unverified snapshot of lacks.com, store context "Brownsville Galleria", no ZIP; `verifiedRowsLoaded: 0`). No row has been checked by a person, no row carries MAP/advertising clearance, and every amount is 13 days old today. Nothing here may be copied into `incoming/lacks_pricing.json` without a fresh recapture and a per-row human check (see `docs/one-application-2026-10-15.md`, "Captured website prices").

Rules used to build this table (generated from the mapping; no value was typed by hand):
- **matched** = the mapper's `preview-eligible` status. Only matched rows show a SKU and amounts. A machine match is an identity *lead*, not a verified mapping.
- **ambiguous** = `machine-ambiguous` (candidates exist, none met every evidence leg), or a matched row with a recorded open identity question. No SKU, no amount.
- **unresolved** = no candidate, a candidate from a different website family than the SKU-anchored size, or no captured variant for that size. No SKU, no amount.
- **Sale** = selling price below the struck-through regular price. No capture recorded a sale end date.
- **Source** = `own page` (the row's own product page), `parent page` (a configurable parent listing the variant), or `other page` (a product-page URL whose trailing SKU differs from the row's SKU).
- The catalog does not record which sizes each model is sold in; the mapper assumed all six for every mattress, so some `unresolved` rows may be sizes Lacks does not sell.

## Summary

- Mattress model x size pairs: **156** (26 models x 6 sizes). Matched **50**, ambiguous **39**, unresolved **67**.
- Matched mattress rows on sale: **44 of 50**. Matched rows not sourced from their own page: **5**.
- Models fully covered (all 6 sizes): **0**.
- Models with zero coverage: **1** (b1).
- Models matched at Queen only: **16** (g1, g2, g3, g7, s1, s2, s3, s4, s5, s7, s9, b3, b4, b5, b6, b7).
- Accessory rows: **50**; matched **37** (on sale 11, not own page 32); accessories with any match: 8 of 10.

### Matched sizes per mattress model

| id | model | matched | sizes matched | ambiguous | unresolved |
|---|---|---|---|---|---|
| g1 | The Roma | 1 | Queen | 5 | 0 |
| g2 | The Saint Pierre | 1 | Queen | 1 | 4 |
| g3 | The Palermo | 1 | Queen | 4 | 1 |
| g4 | Tempur-LuxeBreeze 2.0 Soft | 3 | Twin XL, Queen, King | 0 | 3 |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | 3 | Twin XL, Queen, King | 1 | 2 |
| g6 | Reserve Mayfair Plush | 4 | Twin, Full, Queen, King | 0 | 2 |
| g7 | Reserve Mayfair Medium | 1 | Queen | 1 | 4 |
| g8 | Royal Reserve Extra Firm | 4 | Twin, Full, Queen, King | 0 | 2 |
| g9 | Copper Cushion Firm | 4 | Twin, Full, Queen, King | 0 | 2 |
| s1 | Platinum Paige Firm | 1 | Queen | 3 | 2 |
| s2 | Platinum Paige Extra Firm | 1 | Queen | 3 | 2 |
| s3 | Platinum Maria Plush | 1 | Queen | 3 | 2 |
| s4 | Platinum Maria Firm | 1 | Queen | 3 | 2 |
| s5 | Platinum Summit Firm | 1 | Queen | 3 | 2 |
| s6 | Platinum Summit Medium | 4 | Twin, Full, Queen, King | 0 | 2 |
| s7 | Platinum Summit Plush | 1 | Queen | 3 | 2 |
| s8 | Kendall Firm Euro Top | 4 | Twin, Full, Queen, King | 0 | 2 |
| s9 | Kendall Luxury Medium | 1 | Queen | 3 | 2 |
| s10 | Kendall Extra Firm | 4 | Twin, Full, Queen, King | 0 | 2 |
| b1 | Giselle Plush | 0 | - | 0 | 6 |
| b2 | Giselle Firm | 4 | Twin, Full, Queen, King | 0 | 2 |
| b3 | Genesis Euro Top | 1 | Queen | 0 | 5 |
| b4 | Genesis Firm | 1 | Queen | 0 | 5 |
| b5 | Angelina Plush | 1 | Queen | 3 | 2 |
| b6 | Angelina Extra Firm | 1 | Queen | 0 | 5 |
| b7 | Gracie Medium | 1 | Queen | 3 | 2 |

### Matched sizes per accessory

| id | accessory | matched | sizes matched | not matched |
|---|---|---|---|---|
| base-bt2000 | BedTech BT2000 Adjustable Base | 5 | Twin, Twin XL, Full, Queen, King | Cal King |
| base-bt3000 | BedTech BT3000 Massage Base | 6 | Twin, Twin XL, Full, Queen, King, Cal King | - |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | 3 | Twin XL, Queen, King | Twin, Full, Cal King |
| foundation-princess | Chattam & Wells Standard Foundation | 6 | Twin, Twin XL, Full, Queen, King, Cal King | - |
| pillow-flow | Bedgear Flow 2.0 Performance Pillow | 0 | - | (all) |
| pillow-gel-memory | Gel Memory Foam Cool Pillow | 0 | - | size-independent |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | 5 | Twin, Twin XL, Full, Queen, King | Cal King |
| protector-iprotect | Bedgear iProtect Mattress Protector | 4 | Twin, Full, Queen, King | Twin XL, Cal King |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | 4 | Twin, Full, Queen, King | Twin XL, Cal King |
| protector-tempur | TEMPUR-Protect Mattress Protector | 4 | Twin, Full, Queen, King | Twin XL, Cal King |

## Mattresses (model x size)

| id | catalog name | size | status | website SKU | observed | regular | sale | observedAt (UTC) | source | notes / reason |
|---|---|---|---|---|---|---|---|---|---|---|
| g1 | The Roma | Twin | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Roma 15" Wrapped Coil ] |
| g1 | The Roma | Twin XL | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Roma 15" Wrapped Coil ] |
| g1 | The Roma | Full | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Roma 15" Wrapped Coil ] |
| g1 | The Roma | Queen | matched | 2031576 | $5,499.00 | $7,299.95 | yes | 2026-10-03T18:54:57 | own page | brand leg mismatch |
| g1 | The Roma | King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Roma 15" Wrapped Coil ] |
| g1 | The Roma | Cal King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Roma 15" Wrapped Coil ] |
| g2 | The Saint Pierre | Twin | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family saint pierre, anchor chattam wells) |
| g2 | The Saint Pierre | Twin XL | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family saint pierre, anchor chattam wells) |
| g2 | The Saint Pierre | Full | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family saint pierre, anchor chattam wells) |
| g2 | The Saint Pierre | Queen | matched | 2031583 | $5,999.00 | $7,899.95 | yes | 2026-10-03T18:54:57 | own page | brand leg mismatch |
| g2 | The Saint Pierre | King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Saint Pierre 16.5" Wra] |
| g2 | The Saint Pierre | Cal King | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family saint pierre, anchor chattam wells) |
| g3 | The Palermo | Twin | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family palermo, anchor chattam wells) |
| g3 | The Palermo | Twin XL | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Chattam & Wells™ Princess Palermo 14" Wrapped Co] |
| g3 | The Palermo | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Chattam & Wells™ Princess Palermo 14" Wrapped Co] |
| g3 | The Palermo | Queen | matched | 2031248 | $4,999.00 | $5,899.95 | yes | 2026-10-03T18:54:57 | own page | brand leg mismatch |
| g3 | The Palermo | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Palermo 14" Wrapped Co] |
| g3 | The Palermo | Cal King | ambiguous |  |  |  |  |  |  | 2 candidate(s), no candidate met every evidence leg [Chattam & Wells™ Princess Palermo 14" Wrapped Co] |
| g4 | Tempur-LuxeBreeze 2.0 Soft | Twin | unresolved |  |  |  |  |  |  | no-candidate |
| g4 | Tempur-LuxeBreeze 2.0 Soft | Twin XL | matched | 1273586 | $5,399.00 | $5,399.00 | no | 2026-10-03T18:57:38 | parent page |  |
| g4 | Tempur-LuxeBreeze 2.0 Soft | Full | unresolved |  |  |  |  |  |  | no-candidate |
| g4 | Tempur-LuxeBreeze 2.0 Soft | Queen | matched | 1273591 | $5,899.00 | $5,899.00 | no | 2026-10-03T18:57:38 | own page |  |
| g4 | Tempur-LuxeBreeze 2.0 Soft | King | matched | 1273594 | $6,599.00 | $6,599.00 | no | 2026-10-03T18:57:38 | parent page |  |
| g4 | Tempur-LuxeBreeze 2.0 Soft | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | Twin | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Twin X/L Tempur-Pro-Breeze 2.0 Medium Mattress 1] |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | Twin XL | matched | 1273348 | $3,999.00 | $3,999.00 | no | 2026-10-03T18:57:38 | parent page |  |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | Full | unresolved |  |  |  |  |  |  | no-candidate |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | Queen | matched | 1273358 | $4,499.00 | $4,499.00 | no | 2026-10-03T18:57:38 | parent page |  |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | King | matched | 1273371 | $5,199.00 | $5,199.00 | no | 2026-10-03T18:57:38 | parent page |  |
| g5 | Tempur-ProBreeze 2.0 Medium Hybrid | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| g6 | Reserve Mayfair Plush | Twin | matched | 2046617 | $3,099.00 | $4,199.95 | yes | 2026-10-03T18:54:22 | own page |  |
| g6 | Reserve Mayfair Plush | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| g6 | Reserve Mayfair Plush | Full | matched | 2046615 | $3,499.00 | $4,499.95 | yes | 2026-10-03T18:54:49 | own page |  |
| g6 | Reserve Mayfair Plush | Queen | matched | 1992762 | $3,699.00 | $4,899.95 | yes | 2026-10-03T18:55:06 | own page |  |
| g6 | Reserve Mayfair Plush | King | matched | 2046616 | $4,299.00 | $5,699.95 | yes | 2026-10-03T18:55:24 | own page |  |
| g6 | Reserve Mayfair Plush | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| g7 | Reserve Mayfair Medium | Twin | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family royal, anchor mayfair ii) |
| g7 | Reserve Mayfair Medium | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| g7 | Reserve Mayfair Medium | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Reserve Mayfair 15" Hybrid Medium Tigh; Restonic® Royal Reserve 14" Hybrid Medium Firm F] |
| g7 | Reserve Mayfair Medium | Queen | matched | 1992759 | $3,699.00 | $4,899.95 | yes | 2026-10-03T18:55:06 | own page |  |
| g7 | Reserve Mayfair Medium | King | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family royal, anchor mayfair ii) |
| g7 | Reserve Mayfair Medium | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| g8 | Royal Reserve Extra Firm | Twin | matched | 2057478 | $2,699.00 | $3,799.95 | yes | 2026-10-03T18:54:22 | own page |  |
| g8 | Royal Reserve Extra Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| g8 | Royal Reserve Extra Firm | Full | matched | 2057461 | $2,899.00 | $3,899.95 | yes | 2026-10-03T18:54:40 | own page |  |
| g8 | Royal Reserve Extra Firm | Queen | matched | 1991959 | $3,099.00 | $4,199.95 | yes | 2026-10-03T18:55:06 | own page |  |
| g8 | Royal Reserve Extra Firm | King | matched | 2057475 | $3,699.00 | $4,899.95 | yes | 2026-10-03T18:55:24 | own page |  |
| g8 | Royal Reserve Extra Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| g9 | Copper Cushion Firm | Twin | matched | 2046434 | $2,199.00 | $2,899.95 | yes | 2026-10-03T18:54:13 | own page |  |
| g9 | Copper Cushion Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| g9 | Copper Cushion Firm | Full | matched | 2046428 | $2,799.00 | $3,699.95 | yes | 2026-10-03T18:54:40 | own page |  |
| g9 | Copper Cushion Firm | Queen | matched | 2037053 | $2,999.00 | $3,999.95 | yes | 2026-10-03T18:54:57 | own page |  |
| g9 | Copper Cushion Firm | King | matched | 2046430 | $3,599.00 | $4,799.95 | yes | 2026-10-03T18:55:15 | own page |  |
| g9 | Copper Cushion Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s1 | Platinum Paige Firm | Twin | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s1 | Platinum Paige Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s1 | Platinum Paige Firm | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s1 | Platinum Paige Firm | Queen | matched | 1991909 | $2,199.00 | $2,899.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s1 | Platinum Paige Firm | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s1 | Platinum Paige Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s2 | Platinum Paige Extra Firm | Twin | ambiguous |  |  |  |  |  |  | 2 candidate(s), no candidate met every evidence leg [Restonic® Platinum Maria II 15.5" Hybrid Extra F; Restonic® Platinum Paige II 16" Hybrid Extra Fir] |
| s2 | Platinum Paige Extra Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s2 | Platinum Paige Extra Firm | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), no candidate met every evidence leg [Restonic® Platinum Maria II 15.5" Hybrid Extra F; Restonic® Platinum Paige II 16" Hybrid Extra Fir] |
| s2 | Platinum Paige Extra Firm | Queen | matched | 2029844 | $2,199.00 | $2,899.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s2 | Platinum Paige Extra Firm | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), no candidate met every evidence leg [Restonic® Platinum Maria II 15.5" Hybrid Extra F; Restonic® Platinum Paige II 16" Hybrid Extra Fir] |
| s2 | Platinum Paige Extra Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s3 | Platinum Maria Plush | Twin | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s3 | Platinum Maria Plush | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s3 | Platinum Maria Plush | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s3 | Platinum Maria Plush | Queen | matched | 1990900 | $1,699.00 | $2,199.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s3 | Platinum Maria Plush | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s3 | Platinum Maria Plush | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s4 | Platinum Maria Firm | Twin | ambiguous |  |  |  |  |  |  | 3 candidate(s), more than one candidate survived [Restonic Maria Hybrid BT Firm Twin Mattress; Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s4 | Platinum Maria Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s4 | Platinum Maria Firm | Full | ambiguous |  |  |  |  |  |  | 3 candidate(s), more than one candidate survived [Restonic Maria Hybrid BT Firm Full Mattress; Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s4 | Platinum Maria Firm | Queen | matched | 1990893 | $1,699.00 | $1,849.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s4 | Platinum Maria Firm | King | ambiguous |  |  |  |  |  |  | 3 candidate(s), more than one candidate survived [Restonic Maria Hybrid BT Firm King Mattress; Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s4 | Platinum Maria Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s5 | Platinum Summit Firm | Twin | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s5 | Platinum Summit Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s5 | Platinum Summit Firm | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s5 | Platinum Summit Firm | Queen | matched | 1990906 | $1,499.00 | $1,999.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s5 | Platinum Summit Firm | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Paige 16" Hybrid Firm Box Top; Restonic® Platinum Summit 13.8" Hybrid Firm Tigh] |
| s5 | Platinum Summit Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s6 | Platinum Summit Medium | Twin | matched | 2046370 | $1,099.00 | $1,449.95 | yes | 2026-10-03T18:54:13 | own page |  |
| s6 | Platinum Summit Medium | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s6 | Platinum Summit Medium | Full | matched | 2046373 | $1,369.00 | $1,699.95 | yes | 2026-10-03T18:54:40 | own page |  |
| s6 | Platinum Summit Medium | Queen | matched | 1990909 | $1,499.00 | $1,999.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s6 | Platinum Summit Medium | King | matched | 2046376 | $1,899.00 | $2,399.95 | yes | 2026-10-03T18:55:15 | own page |  |
| s6 | Platinum Summit Medium | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s7 | Platinum Summit Plush | Twin | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s7 | Platinum Summit Plush | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s7 | Platinum Summit Plush | Full | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s7 | Platinum Summit Plush | Queen | matched | 1990916 | $1,499.00 | $1,999.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s7 | Platinum Summit Plush | King | ambiguous |  |  |  |  |  |  | 2 candidate(s), more than one candidate survived [Restonic® Platinum Maria 15.5" Hybrid Plush Box ; Restonic® Platinum Summit 13.8" Hybrid Plush Tig] |
| s7 | Platinum Summit Plush | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s8 | Kendall Firm Euro Top | Twin | matched | 2046234 | $899.00 | $1,199.95 | yes | 2026-10-03T18:54:13 | own page |  |
| s8 | Kendall Firm Euro Top | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s8 | Kendall Firm Euro Top | Full | matched | 2046237 | $1,099.00 | $1,449.95 | yes | 2026-10-03T18:54:40 | own page |  |
| s8 | Kendall Firm Euro Top | Queen | matched | 1991904 | $1,299.00 | $1,699.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s8 | Kendall Firm Euro Top | King | matched | 2046240 | $1,599.00 | $2,199.95 | yes | 2026-10-03T18:55:15 | own page |  |
| s8 | Kendall Firm Euro Top | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s9 | Kendall Luxury Medium | Twin | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic Kendall III Hybrid Luxury Medium Twin M] |
| s9 | Kendall Luxury Medium | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s9 | Kendall Luxury Medium | Full | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic Kendall III Hybrid Luxury Medium Full M] |
| s9 | Kendall Luxury Medium | Queen | matched | 1991879 | $1,299.00 | $1,699.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s9 | Kendall Luxury Medium | King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic Kendall III Hybrid Luxury Medium King M] |
| s9 | Kendall Luxury Medium | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| s10 | Kendall Extra Firm | Twin | matched | 2046160 | $899.00 | $1,199.95 | yes | 2026-10-03T18:54:13 | own page |  |
| s10 | Kendall Extra Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| s10 | Kendall Extra Firm | Full | matched | 2046164 | $1,099.00 | $1,449.95 | yes | 2026-10-03T18:54:40 | own page |  |
| s10 | Kendall Extra Firm | Queen | matched | 1989356 | $1,299.00 | $1,699.95 | yes | 2026-10-03T18:54:57 | own page |  |
| s10 | Kendall Extra Firm | King | matched | 2046166 | $1,599.00 | $2,199.95 | yes | 2026-10-03T18:55:15 | own page |  |
| s10 | Kendall Extra Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | Twin | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | Full | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | Queen | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | King | unresolved |  |  |  |  |  |  | no-candidate |
| b1 | Giselle Plush | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b2 | Giselle Firm | Twin | matched | 2043301 | $749.00 | $999.95 | yes | 2026-10-03T18:54:13 | own page |  |
| b2 | Giselle Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b2 | Giselle Firm | Full | matched | 2046010 | $949.00 | $1,249.95 | yes | 2026-10-03T18:54:40 | own page |  |
| b2 | Giselle Firm | Queen | matched | 2031228 | $1,069.00 | $1,399.95 | yes | 2026-10-03T18:54:57 | own page |  |
| b2 | Giselle Firm | King | matched | 2046012 | $1,349.00 | $1,699.95 | yes | 2026-10-03T18:55:15 | own page |  |
| b2 | Giselle Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b3 | Genesis Euro Top | Twin | unresolved |  |  |  |  |  |  | no-candidate |
| b3 | Genesis Euro Top | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b3 | Genesis Euro Top | Full | unresolved |  |  |  |  |  |  | no-candidate |
| b3 | Genesis Euro Top | Queen | matched | 2176812 | $999.00 | $1,199.95 | yes | 2026-10-03T18:54:57 | own page | brand leg mismatch |
| b3 | Genesis Euro Top | King | unresolved |  |  |  |  |  |  | no-candidate |
| b3 | Genesis Euro Top | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b4 | Genesis Firm | Twin | unresolved |  |  |  |  |  |  | no-candidate |
| b4 | Genesis Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b4 | Genesis Firm | Full | unresolved |  |  |  |  |  |  | no-candidate |
| b4 | Genesis Firm | Queen | matched | 2176805 | $899.00 | $1,099.95 | yes | 2026-10-03T18:54:57 | own page | brand leg mismatch |
| b4 | Genesis Firm | King | unresolved |  |  |  |  |  |  | no-candidate |
| b4 | Genesis Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b5 | Angelina Plush | Twin | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® ComfortCare® Angelina II 13" Plush Twi] |
| b5 | Angelina Plush | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b5 | Angelina Plush | Full | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® ComfortCare® Angelina II 13" Plush Ful] |
| b5 | Angelina Plush | Queen | matched | 1991876 | $799.00 | $899.95 | yes | 2026-10-03T18:54:57 | own page |  |
| b5 | Angelina Plush | King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® ComfortCare® Angelina II 13" Plush Kin] |
| b5 | Angelina Plush | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b6 | Angelina Extra Firm | Twin | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family kendall, anchor angelina) |
| b6 | Angelina Extra Firm | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b6 | Angelina Extra Firm | Full | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family kendall, anchor angelina) |
| b6 | Angelina Extra Firm | Queen | matched | 1991866 | $799.00 | $1,049.95 | yes | 2026-10-03T18:54:57 | own page |  |
| b6 | Angelina Extra Firm | King | unresolved |  |  |  |  |  |  | different-website-family-than-the-sku-anchored-size (candidate family kendall, anchor angelina) |
| b6 | Angelina Extra Firm | Cal King | unresolved |  |  |  |  |  |  | no-candidate |
| b7 | Gracie Medium | Twin | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® Gracie II 11.5" Medium Twin Mattress] |
| b7 | Gracie Medium | Twin XL | unresolved |  |  |  |  |  |  | no-candidate |
| b7 | Gracie Medium | Full | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® Grace II 11.5" Medium Full Mattress] |
| b7 | Gracie Medium | Queen | matched | 2030258 | $569.00 | $799.95 | yes | 2026-10-03T18:54:57 | own page |  |
| b7 | Gracie Medium | King | ambiguous |  |  |  |  |  |  | 1 candidate(s), no candidate met every evidence leg [Restonic® Grace II 11.5" Medium King Mattress] |
| b7 | Gracie Medium | Cal King | unresolved |  |  |  |  |  |  | no-candidate |

## Accessories (accessory x size)

| id | catalog name | size | status | website SKU | observed | regular | sale | observedAt (UTC) | source | website name / reason |
|---|---|---|---|---|---|---|---|---|---|---|
| base-bt2000 | BedTech BT2000 Adjustable Base | Twin | matched | 283062 | $799.00 | $999.95 | yes | 2026-10-03T20:12:47 | parent page | Adjustable Base Head/Foot |
| base-bt2000 | BedTech BT2000 Adjustable Base | Twin XL | matched | 283064 | $799.00 | $999.95 | yes | 2026-10-03T20:12:47 | parent page | Bed Tech Bt2000 Adjustable Base Head/Foot |
| base-bt2000 | BedTech BT2000 Adjustable Base | Full | matched | 283082 | $899.00 | $1,099.95 | yes | 2026-10-03T20:12:47 | parent page | Adjustable Base Head/Foot |
| base-bt2000 | BedTech BT2000 Adjustable Base | Queen | matched | 283083 | $899.00 | $1,099.95 | yes | 2026-10-03T20:12:47 | own page | Bedtech Queen Adjustable Base With Head & Foot Motion |
| base-bt2000 | BedTech BT2000 Adjustable Base | King | matched | 283087 | $1,199.00 | $1,499.95 | yes | 2026-10-03T20:12:47 | parent page | Bedtech Bt2000 King Adjustable Base With Head/Foot Action |
| base-bt2000 | BedTech BT2000 Adjustable Base | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| base-bt3000 | BedTech BT3000 Massage Base | Twin | matched | 283107 | $999.00 | $1,299.95 | yes | 2026-10-03T20:12:49 | parent page | Adjustable Base With Massage |
| base-bt3000 | BedTech BT3000 Massage Base | Twin XL | matched | 283112 | $999.00 | $1,299.95 | yes | 2026-10-03T20:12:49 | parent page | Adjustable Base With Massage |
| base-bt3000 | BedTech BT3000 Massage Base | Full | matched | 283115 | $1,099.00 | $1,399.95 | yes | 2026-10-03T20:12:49 | parent page | Adjustable Base With Massage |
| base-bt3000 | BedTech BT3000 Massage Base | Queen | matched | 283117 | $1,099.00 | $1,399.95 | yes | 2026-10-03T20:12:49 | own page | Adjustable Base With Massage |
| base-bt3000 | BedTech BT3000 Massage Base | King | matched | 283119 | $1,899.00 | $2,499.95 | yes | 2026-10-03T20:12:49 | parent page | Bedtech BT 3000 Flex King Adjustable Base With Massage Actio |
| base-bt3000 | BedTech BT3000 Massage Base | Cal King | matched | 283120 | $1,899.00 | $2,499.95 | yes | 2026-10-03T20:12:49 | parent page | Bedtech BT 3000 Flex Cal King Adjustable Base With Massage A |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | Twin | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | Twin XL | matched | 1283066 | $1,599.00 | $1,599.00 | no | 2026-10-03T20:13:01 | parent page | Full Tempur-Egro 3.0 Power Base |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | Full | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | Queen | matched | 1283091 | $1,599.00 | $1,599.00 | no | 2026-10-03T20:13:01 | parent page | Queen Tempur-Egro 3.0 Power Base |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | King | matched | 1283102 | $2,299.00 | $2,299.00 | no | 2026-10-03T20:13:01 | parent page | KING Tempur-Egro 3.0 Power Base |
| base-tempur-ergo | TEMPUR-Ergo 3.0 Power Base | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| foundation-princess | Chattam & Wells Standard Foundation | Twin | matched | 1751735 | $399.99 | $399.99 | no | 2026-10-03T20:13:14 | parent page | Chattam & Wells™ Princess 9" Twin Standard Foundation |
| foundation-princess | Chattam & Wells Standard Foundation | Twin XL | matched | 1751736 | $399.99 | $399.99 | no | 2026-10-03T20:13:14 | parent page | Chattam & Wells™ Princess 9" Twin XL Standard Foundation |
| foundation-princess | Chattam & Wells Standard Foundation | Full | matched | 1751737 | $499.99 | $499.99 | no | 2026-10-03T20:13:14 | parent page | Chattam & Wells™ Princess 9" Full Standard Foundation |
| foundation-princess | Chattam & Wells Standard Foundation | Queen | matched | 1751739 | $499.99 | $499.99 | no | 2026-10-03T20:13:14 | own page | Chattam & Wells™ Princess 9" Queen Standard Foundation |
| foundation-princess | Chattam & Wells Standard Foundation | King | matched | 1753909 | $799.99 | $799.99 | no | 2026-10-03T20:13:14 | parent page | Chattam & Wells™ Princess 9" King Standard Foundation |
| foundation-princess | Chattam & Wells Standard Foundation | Cal King | matched | 1751740 | $799.99 | $799.99 | no | 2026-10-03T20:13:14 | parent page | Chattam & Wells™ Princess 9" California King Standard Founda |
| pillow-flow | Bedgear Flow 2.0 Performance Pillow | (all) | unresolved |  |  |  |  |  |  | no candidate of the expected product type with a matching brand and model token |
| pillow-gel-memory | Gel Memory Foam Cool Pillow | size-independent | ambiguous |  |  |  |  |  |  | identity question: SKU 1269280 is now listed as a 'Lavender' pillow; same product as the catalog's gel memory pillow is unconfirmed (cooling is a fit attribute) |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | Twin | matched | 170984 | $99.95 | $99.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Dri-Tec Twin Mattress Protector |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | Twin XL | matched | 170986 | $104.95 | $104.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Dri-Tec Twin Xl Mattress Protector |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | Full | matched | 170988 | $109.95 | $109.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Dri-Tec Full Mattress Protector |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | Queen | matched | 170991 | $149.95 | $149.95 | no | 2026-10-03T20:11:54 | own page | Bedgear Dri-Tec Queen Mattress Protector |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | King | matched | 170993 | $179.95 | $179.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Dri-Tec King Mattress Protector |
| protector-dritec | Bedgear Dri-Tec Mattress Protector | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-iprotect | Bedgear iProtect Mattress Protector | Twin | matched | 170848 | $59.95 | $59.95 | no | 2026-10-03T20:11:54 | parent page | Iprotect Twin Mattress Protector |
| protector-iprotect | Bedgear iProtect Mattress Protector | Twin XL | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-iprotect | Bedgear iProtect Mattress Protector | Full | matched | 170871 | $69.95 | $69.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Iprotect Full Mattress Protector |
| protector-iprotect | Bedgear iProtect Mattress Protector | Queen | matched | 170881 | $89.95 | $89.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Iprotect Queen Mattress Protector |
| protector-iprotect | Bedgear iProtect Mattress Protector | King | matched | 170890 | $99.95 | $99.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Iprotect King Mattress Protector |
| protector-iprotect | Bedgear iProtect Mattress Protector | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | Twin | matched | 1266071 | $219.95 | $219.95 | no | 2026-10-03T20:11:54 | parent page | Ver-Tex Twin Mattress Protector |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | Twin XL | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | Full | matched | 1266104 | $229.95 | $229.95 | no | 2026-10-03T20:11:54 | parent page | Ver-Tex Full Mattress Protector |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | Queen | matched | 1213416 | $249.95 | $249.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Ver-Tex Queen Mattress Protector |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | King | matched | 1213418 | $299.95 | $299.95 | no | 2026-10-03T20:11:54 | parent page | Bedgear Ver-Tex King Mattress Protector |
| protector-vertex | Bedgear Ver-Tex Cooling Protector | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-tempur | TEMPUR-Protect Mattress Protector | Twin | matched | 1212364 | $159.00 | $159.00 | no | 2026-10-03T20:12:15 | parent page | Twin Tempur-Protect Mattress Protector 10 Yr. Warranty |
| protector-tempur | TEMPUR-Protect Mattress Protector | Twin XL | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |
| protector-tempur | TEMPUR-Protect Mattress Protector | Full | matched | 1212370 | $189.00 | $189.00 | no | 2026-10-03T20:12:15 | parent page | Full Tempur-Protect Mattress Protector 10 Yr. Warranty |
| protector-tempur | TEMPUR-Protect Mattress Protector | Queen | matched | 1212374 | $189.00 | $189.00 | no | 2026-10-03T20:12:15 | own page | Queen Tempur-Protect Mattress Protector 10 Yr. Warranty |
| protector-tempur | TEMPUR-Protect Mattress Protector | King | matched | 1212380 | $209.00 | $209.00 | no | 2026-10-03T20:12:15 | parent page | King Tempur-Protect Mattress Protector 10 Yr. Warranty |
| protector-tempur | TEMPUR-Protect Mattress Protector | Cal King | unresolved |  |  |  |  |  |  | no variant for this size in the 2026-10-03 capture (catalog does not say whether it is sold in this size) |

## Known identity questions (need a human ruling before any SKU enters the catalog)

- Chattam & Wells non-Queen sizes collide with the website's "Princess" line (g1-g3 and others): ambiguous until Lacks confirms which line the catalog model is.
- g1 Queen's product-page URL carries a "restonic-angelina" slug for SKU 2031576 (stale slug or wrong page) and the brand leg reads `mismatch`: re-check on the page itself.
- `pillow-gel-memory` -> SKU 1269280 is now a "Lavender" pillow on the site: downgraded to ambiguous here.
- `base-tempur-ergo` matched only through the website's "Egro" spelling.
- `pillow-flow`: no candidate.
- iProtect Twin XL was captured 2026-09-21 but did not map on 2026-10-03.

Regenerate: the generator is a one-off over this capture and is kept outside the repo; rerun `tools/fetch_lacks_prices.py` + `tools/map_app_to_website.py` for a fresh mapping first.
