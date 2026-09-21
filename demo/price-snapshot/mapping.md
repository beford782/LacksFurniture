# App assortment -> website variant mapping

**AUTOMATED-IDENTITY-MATCH-OVER-AN-UNVERIFIED-SNAPSHOT**

Identity evidence, owner verification and production activation are three separate things. A `preview-eligible` row carries enough identity evidence for the ISOLATED, clearly-labelled preview and is shown there as pending verification; it is not a verified mapping and it never feeds production, which the pricing contract gates independently.

> **SKU evidence:** The app catalog ships no SKU. The 2026-07-30 discovery file supplies a QUEEN SKU per product as a LEAD; where that exact SKU is still present in the current snapshot it is recorded as a direct identity link. Historical prices are never reused and no other size's SKU is ever inferred.

Prices observed 2026-09-20T23:27:23+00:00 -> 2026-09-20T23:29:07+00:00; this mapping generated 2026-09-21T01:01:04+00:00. Owner-verified rows loaded: 0.

| status | meaning |
|---|---|
| ✅ owner-verified | Blake confirmed this exact variant. |
| 🔎 preview-eligible | enough identity evidence for the ISOLATED preview, shown there as pending verification. Never production. |
| ⚠️ machine-ambiguous | more than one candidate survived; nothing chosen |
| ⛔ variant-conflict | two SKUs claim the same family and size |
| — unresolved | no candidate, or required evidence missing |

## Mattresses

### g1 — The Roma (Chattam & Wells / Roma, Firm)

⚠️ 5, 🔎 1

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 5 | | |  | website SKU 1747036 is claimed by 5 app products (g1:twin, g1:twin_xl, g1:full, g1:king, g1:cal_king); one SKU identifies one product-size, so none of them is resolved |
| twin_xl | ⚠️ 5 | | |  | website SKU 1747036 is claimed by 5 app products (g1:twin, g1:twin_xl, g1:full, g1:king, g1:cal_king); one SKU identifies one product-size, so none of them is resolved |
| full | ⚠️ 5 | | |  | website SKU 1747036 is claimed by 5 app products (g1:twin, g1:twin_xl, g1:full, g1:king, g1:cal_king); one SKU identifies one product-size, so none of them is resolved |
| queen | 🔎 | `2031576` | $5,499.00 | Chattam & Wells™ The Roma 16" Firm Euro-Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-angelina-extra-firm-queen-mattress-1606-202-mz874sa50-2031576) |
| king | ⚠️ 5 | | |  | website SKU 1747036 is claimed by 5 app products (g1:twin, g1:twin_xl, g1:full, g1:king, g1:cal_king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | ⚠️ 5 | | |  | website SKU 1747036 is claimed by 5 app products (g1:twin, g1:twin_xl, g1:full, g1:king, g1:cal_king); one SKU identifies one product-size, so none of them is resolved |

### g2 — The Saint Pierre (Chattam & Wells / Saint Pierre, Plush)

⚠️ 5, 🔎 1

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 5 | | |  | website SKU 1748187 is claimed by 5 app products (g2:twin, g2:twin_xl, g2:full, g2:king, g2:cal_king); one SKU identifies one product-size, so none of them is resolved |
| twin_xl | ⚠️ 5 | | |  | website SKU 1748187 is claimed by 5 app products (g2:twin, g2:twin_xl, g2:full, g2:king, g2:cal_king); one SKU identifies one product-size, so none of them is resolved |
| full | ⚠️ 5 | | |  | website SKU 1748187 is claimed by 5 app products (g2:twin, g2:twin_xl, g2:full, g2:king, g2:cal_king); one SKU identifies one product-size, so none of them is resolved |
| queen | 🔎 | `2031583` | $5,999.00 | Chattam & Wells™ The Saint Pierre 16.5" Plush Euro-Top Queen Mattress | [product-page](https://www.lacks.com/product/chattam-wells-the-saint-pierre-165-plush-euro-top-queen-mattress-1606-302-mz877sa50-2031583) |
| king | ⚠️ 5 | | |  | website SKU 1748187 is claimed by 5 app products (g2:twin, g2:twin_xl, g2:full, g2:king, g2:cal_king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | ⚠️ 5 | | |  | website SKU 1748187 is claimed by 5 app products (g2:twin, g2:twin_xl, g2:full, g2:king, g2:cal_king); one SKU identifies one product-size, so none of them is resolved |

### g3 — The Palermo (Chattam & Wells / Palermo, Firm)

⚠️ 5, 🔎 1

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Chattam & Wells™ Princess Palermo 14" ; Chattam & Wells™ Princess Palermo 14"  |  |
| twin_xl | ⚠️ 2 | | | Chattam & Wells™ Princess Palermo 14" ; Chattam & Wells™ Princess Palermo 14"  |  |
| full | ⚠️ 2 | | | Chattam & Wells™ Princess Palermo 14" ; Chattam & Wells™ Princess Palermo 14"  |  |
| queen | 🔎 | `2031248` | $4,999.00 | Restonic® Chattam & Wells The Palermo Firm Pillowtop Queen Mattress | [product-page](https://www.lacks.com/product/chattam-wells-the-palermo-14-firm-pillowtop-queen-mattress-1606-102-mz674sa50-2031248) |
| king | ⚠️ 2 | | | Chattam & Wells™ Princess Palermo 14" ; Chattam & Wells™ Princess Palermo 14"  |  |
| cal_king | ⚠️ 2 | | | Chattam & Wells™ Princess Palermo 14" ; Chattam & Wells™ Princess Palermo 14"  |  |

### g4 — Tempur-LuxeBreeze 2.0 Soft (Tempur-Pedic / LuxeBreeze, Soft)

⚠️ 3, — 3

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | — | | | | no-candidate |
| twin_xl | ⚠️ 3 | | |  | website SKU 1302546 is claimed by 3 app products (g4:twin_xl, g4:queen, g4:king); one SKU identifies one product-size, so none of them is resolved |
| full | — | | | | no-candidate |
| queen | ⚠️ 3 | | |  | website SKU 1302546 is claimed by 3 app products (g4:twin_xl, g4:queen, g4:king); one SKU identifies one product-size, so none of them is resolved |
| king | ⚠️ 3 | | |  | website SKU 1302546 is claimed by 3 app products (g4:twin_xl, g4:queen, g4:king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | — | | | | no-candidate |

### g5 — Tempur-ProBreeze 2.0 Medium Hybrid (Tempur-Pedic / ProBreeze, Medium)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `1434860` | $3,999.00 | Twin X/L Tempur-Pro-Breeze 2.0 Medium Mattress 10Yr Limited Warranty | [product-page](https://www.lacks.com/product/tempur-pedic-tempur-probreeze-12-tempur-material-medium-smooth-top-queen-mattress-102412c-1434860) |
| twin_xl | ⚠️ 3 | | |  | website SKU 1302592 is claimed by 3 app products (g5:twin_xl, g5:queen, g5:king); one SKU identifies one product-size, so none of them is resolved |
| full | — | | | | no-candidate |
| queen | ⚠️ 3 | | |  | website SKU 1302592 is claimed by 3 app products (g5:twin_xl, g5:queen, g5:king); one SKU identifies one product-size, so none of them is resolved |
| king | ⚠️ 3 | | |  | website SKU 1302592 is claimed by 3 app products (g5:twin_xl, g5:queen, g5:king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | — | | | | no-candidate |

### g6 — Reserve Mayfair Plush (Restonic / Reserve, Plush)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2046617` | $3,099.00 | Restonic® Reserve Mayfair 15" Hybrid Plush Euro Top Twin Mattress | [product-page](https://www.lacks.com/product/restonic-reserve-mayfair-15-hybrid-plush-euro-top-twin-mattress-1611-370-mu81533-2046617) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2046615` | $3,499.00 | Restonic® Reserve Mayfair 15" Hybrid Plush Euro Top Full Mattress | [product-page](https://www.lacks.com/product/restonic-reserve-mayfair-15-hybrid-plush-euro-top-full-mattress-1611-371-mu81546-2046615) |
| queen | 🔎 | `1992762` | $3,699.00 | Restonic® Reserve Mayfair 15" Hybrid Plush Euro Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-reserve-mayfair-15-hybrid-plush-euro-top-queen-mattress-1611-372-mu81550-1992762) |
| king | 🔎 | `2046616` | $4,299.00 | Restonic® Reserve Mayfair 15" Hybrid Plush Euro Top King Mattress | [product-page](https://www.lacks.com/product/restonic-reserve-mayfair-15-hybrid-plush-euro-top-king-mattress-1611-373-mu81566-2046616) |
| cal_king | — | | | | no-candidate |

### g7 — Reserve Mayfair Medium (Restonic / Reserve, Medium)

⚠️ 1, 🔎 3, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2057512` | $2,699.00 | Restonic® Royal Reserve 14" Hybrid Medium Firm Twin Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-medium-firm-twin-mattress-1611-140-mt51033-2057512) |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Reserve Mayfair 15" Hybrid M; Restonic® Royal Reserve 14" Hybrid Med |  |
| queen | 🔎 | `1992759` | $3,699.00 | Restonic® Reserve Mayfair 15" Hybrid Medium Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-reserve-mayfair-15-hybrid-medium-tight-top-queen-mattress-1611-352-mu71550-1992759) |
| king | 🔎 | `2057526` | $3,699.00 | Restonic® Royal Reserve 14" Hybrid Medium Firm King Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-medium-firm-king-mattress-1611-143-mt51066-2057526) |
| cal_king | — | | | | no-candidate |

### g8 — Royal Reserve Extra Firm (Restonic / Royal Reserve, Extra Firm)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2057478` | $2,699.00 | Restonic® Royal Reserve 14" Hybrid Extra Firm Twin Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-extra-firm-twin-mattress-1611-110-mt21033-2057478) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2057461` | $2,899.00 | Restonic® Royal Reserve 14" Hybrid Extra Firm Full Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-extra-firm-full-mattress-1611-111-mt21046-2057461) |
| queen | 🔎 | `1991959` | $3,099.00 | Restonic® Royal Reserve 14" Hybrid Extra Firm Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-extra-firm-queen-mattress-1611-112-mt21050-1991959) |
| king | 🔎 | `2057475` | $3,699.00 | Restonic® Royal Reserve 14" Hybrid Extra Firm King Mattress | [product-page](https://www.lacks.com/product/restonic-royal-reserve-14-hybrid-extra-firm-king-mattress-1611-113-mt21066-2057475) |
| cal_king | — | | | | no-candidate |

### g9 — Copper Cushion Firm (Spring Air / Copper, Cushion Firm)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2046434` | $2,199.00 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted Twin Mattress | [product-page](https://www.lacks.com/product/copper-by-springair-135-hybrid-euro-top-cushion-firm-quilted-twin-mattress-1602-860-mz972sa33-2046434) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2046428` | $2,799.00 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted Full Mattress | [product-page](https://www.lacks.com/product/copper-by-springair-135-hybrid-euro-top-cushion-firm-quilted-full-mattress-1602-861-mz972sa46-2046428) |
| queen | 🔎 | `2037053` | $2,999.00 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted Queen Mattress | [product-page](https://www.lacks.com/product/copper-by-springair-135-hybrid-euro-top-cushion-firm-quilted-queen-mattress-1602-862-mz972sa50-2037053) |
| king | 🔎 | `2046430` | $3,599.00 | Copper by SpringAir 13.5" Hybrid Euro-Top Cushion Firm Quilted King Mattress | [product-page](https://www.lacks.com/product/copper-by-springair-135-hybrid-euro-top-cushion-firm-quilted-king-mattress-1602-863-mz972sa66-2046430) |
| cal_king | — | | | | no-candidate |

### s1 — Platinum Paige Firm (Restonic / Platinum, Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| queen | 🔎 | `1991909` | $2,199.00 | Restonic® Platinum Paige 16" Hybrid Firm Box Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-paige-ii-16-hybrid-firm-box-top-queen-mattress-1601-732-ml99150-1991909) |
| king | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| cal_king | — | | | | no-candidate |

### s2 — Platinum Paige Extra Firm (Restonic / Platinum, Extra Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Restonic® Platinum Maria II 15.5" Hybr; Restonic® Platinum Paige II 16" Hybrid | no candidate met every evidence leg |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Platinum Maria II 15.5" Hybr; Restonic® Platinum Paige II 16" Hybrid | no candidate met every evidence leg |
| queen | 🔎 | `2029844` | $2,199.00 | Restonic® Platinum Paige II 16" Hybrid Extra Firm Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-paige-ii-16-hybrid-extra-firm-queen-mattress-1601-752-ml59150-2029844) |
| king | ⚠️ 2 | | | Restonic® Platinum Maria II 15.5" Hybr; Restonic® Platinum Paige II 16" Hybrid | no candidate met every evidence leg |
| cal_king | — | | | | no-candidate |

### s3 — Platinum Maria Plush (Restonic / Platinum, Plush)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| queen | 🔎 | `1990900` | $1,699.00 | Restonic® Platinum Maria 15.25" Hybrid Plush Box Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-maria-155-hybrid-plush-box-top-queen-mattress-1601-582-mi84750-1990900) |
| king | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| cal_king | — | | | | no-candidate |

### s4 — Platinum Maria Firm (Restonic / Platinum, Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 3 | | | Restonic Maria Hybrid BT Firm Twin Mat; Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 3 | | | Restonic Maria Hybrid BT Firm Full Mat; Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| queen | 🔎 | `1990893` | $1,699.00 | Restonic Maria Hybrid BT Firm Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-maria-ii-155-hybrid-bt-firm-queen-mattress-1601-542-mi94750-1990893) |
| king | ⚠️ 3 | | | Restonic Maria Hybrid BT Firm King Mat; Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| cal_king | — | | | | no-candidate |

### s5 — Platinum Summit Firm (Restonic / Platinum, Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| queen | 🔎 | `1990906` | $1,499.00 | Restonic® Platinum Summit 13.8" Hybrid Firm Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-firm-tight-top-queen-mattress-1601-622-mm28450-1990906) |
| king | ⚠️ 2 | | | Restonic® Platinum Paige 16" Hybrid Fi; Restonic® Platinum Summit 13.8" Hybrid |  |
| cal_king | — | | | | no-candidate |

### s6 — Platinum Summit Medium (Restonic / Platinum, Medium)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2046370` | $1,099.00 | Restonic® Platinum Summit 13.8" Hybrid Medium Tight Top Twin Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-medium-tight-top-twin-mattress-1601-640-mm29433-2046370) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2046373` | $1,369.00 | Restonic® Platinum Summit 13.8" Hybrid Medium Tight Top Full Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-medium-tight-top-full-mattress-1601-641-mm29446-2046373) |
| queen | 🔎 | `1990909` | $1,499.00 | Restonic® Platinum Summit 13.8" Hybrid Medium Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-medium-tight-top-queen-mattress-1601-642-mm29450-1990909) |
| king | 🔎 | `2046376` | $1,899.00 | Restonic® Platinum Summit 13.8" Hybrid Medium Tight Top King Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-medium-tight-top-king-mattress-1601-643-mm29466-2046376) |
| cal_king | — | | | | no-candidate |

### s7 — Platinum Summit Plush (Restonic / Platinum, Plush)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| queen | 🔎 | `1990916` | $1,499.00 | Restonic® Platinum Summit 13.8" Hybrid Plush Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-platinum-summit-138-hybrid-plush-tight-top-queen-mattress-1601-672-mm27450-1990916) |
| king | ⚠️ 2 | | | Restonic® Platinum Maria 15.5" Hybrid ; Restonic® Platinum Summit 13.8" Hybrid |  |
| cal_king | — | | | | no-candidate |

### s8 — Kendall Firm Euro Top (Restonic / ComfortCare, Firm)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2046234` | $899.00 | Restonic® ComfortCare® Kendall 15.5" Hybrid Firm Euro Top Twin Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-kendall-155-hybrid-firm-euro-top-twin-mattress-1601-450-mm91333-2046234) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2046237` | $1,099.00 | Restonic® ComfortCare® Kendall 15.5" Hybrid Firm Euro Top Full Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-kendall-155-hybrid-firm-euro-top-full-mattress-1601-451-mm91346-2046237) |
| queen | 🔎 | `1991904` | $1,299.00 | Restonic® ComfortCare® Kendall 15.5" Hybrid  Firm Euro Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-kendall-155-hybrid-firm-euro-top-queen-mattress-1601-452-mm91350-1991904) |
| king | 🔎 | `2046240` | $1,599.00 | Restonic® ComfortCare® Kendall 15.5" Hybrid Firm Euro Top King Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-kendall-155-hybrid-firm-euro-top-king-mattress-1601-453-mm91366-2046240) |
| cal_king | — | | | | no-candidate |

### s9 — Kendall Luxury Medium (Restonic / ComfortCare, Medium)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 1 | | | Restonic Kendall III Hybrid Luxury Med | no candidate met every evidence leg |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 1 | | | Restonic Kendall III Hybrid Luxury Med | no candidate met every evidence leg |
| queen | 🔎 | `1991879` | $1,299.00 | Restonic Kendal II Hybrid Luxury Medium Queen Mattress | [product-page](https://www.lacks.com/product/restonic-kendall-iii-hybrid-luxury-medium-queen-mattress-1601-432-mm71350-1991879) |
| king | ⚠️ 1 | | | Restonic Kendall III Hybrid Luxury Med | no candidate met every evidence leg |
| cal_king | — | | | | no-candidate |

### s10 — Kendall Extra Firm (Restonic / ComfortCare, Extra Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | |  | website SKU 2046160 is claimed by 2 app products (s10:twin, b6:twin); one SKU identifies one product-size, so none of them is resolved |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | |  | website SKU 2046164 is claimed by 2 app products (s10:full, b6:full); one SKU identifies one product-size, so none of them is resolved |
| queen | 🔎 | `1989356` | $1,299.00 | Restonic® ComfortCare® Kendall 14.5" Hybrid Extra Firm Tight Top Queen Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-kendall-155-hybrid-extra-firm-tight-top-queen-mattress-1601-412-1989356) |
| king | ⚠️ 2 | | |  | website SKU 2046166 is claimed by 2 app products (s10:king, b6:king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | — | | | | no-candidate |

### b1 — Giselle Plush (Restonic / Giselle, Plush)

⚠️ 1, — 5

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | — | | | | no-candidate |
| twin_xl | — | | | | no-candidate |
| full | — | | | | no-candidate |
| queen | ⚠️ 6 | | | Chattam & Wells™ The Saint Pierre 16.5; Elm Euro-Top Plush Queen Mattress; Restonic Angelina Plush Queen Mattress |  |
| king | — | | | | no-candidate |
| cal_king | — | | | | no-candidate |

### b2 — Giselle Firm (Restonic / Giselle, Firm)

🔎 4, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | 🔎 | `2043301` | $749.00 | Restonic® Giselle 12.5" Firm Twin Mattress | [product-page](https://www.lacks.com/product/restonic-giselle-125-firm-twin-mattress-1601-370-ml23933-2043301) |
| twin_xl | — | | | | no-candidate |
| full | 🔎 | `2046010` | $949.00 | Restonic® Giselle 12.5" Firm Full Mattress | [product-page](https://www.lacks.com/product/restonic-giselle-125-firm-full-mattress-1601-371-ml23946-2046010) |
| queen | 🔎 | `2031228` | $1,069.00 | Restonic® Giselle 12.5" Firm Queen Mattress | [product-page](https://www.lacks.com/product/restonic-giselle-125-firm-queen-mattress-1601-372-ml23950-2031228) |
| king | 🔎 | `2046012` | $1,349.00 | Restonic® Giselle 12.5" Firm King Mattress | [product-page](https://www.lacks.com/product/restonic-giselle-125-firm-king-mattress-1601-373-ml23966-2046012) |
| cal_king | — | | | | no-candidate |

### b3 — Genesis Euro Top (Genesis / Kingdom Mattress, Medium)

🔎 1, — 5

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | — | | | | no-candidate |
| twin_xl | — | | | | no-candidate |
| full | — | | | | no-candidate |
| queen | 🔎 | `2176812` | $995.00 | Genesis Euro Top Queen Mattress | [product-page](https://www.lacks.com/product/genesis-euro-top-queen-mattress-1623-502-2176812) |
| king | — | | | | no-candidate |
| cal_king | — | | | | no-candidate |

### b4 — Genesis Firm (Genesis / Kingdom Mattress, Firm)

🔎 1, — 5

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | — | | | | no-candidate |
| twin_xl | — | | | | no-candidate |
| full | — | | | | no-candidate |
| queen | 🔎 | `2176805` | $895.00 | Genesis Firm Queen Mattress | [product-page](https://www.lacks.com/product/genesis-firm-queen-mattress-1623-522-2176805) |
| king | — | | | | no-candidate |
| cal_king | — | | | | no-candidate |

### b5 — Angelina Plush (Restonic / ComfortCare, Plush)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 1 | | | Restonic® ComfortCare® Angelina II 13" | no candidate met every evidence leg |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 1 | | | Restonic® ComfortCare® Angelina II 13" | no candidate met every evidence leg |
| queen | 🔎 | `1991876` | $799.00 | Restonic Angelina Plush Queen Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-angelina-ii-13-plush-queen-mattress-1601-262-md47350-1991876) |
| king | ⚠️ 1 | | | Restonic® ComfortCare® Angelina II 13" | no candidate met every evidence leg |
| cal_king | — | | | | no-candidate |

### b6 — Angelina Extra Firm (Restonic / ComfortCare, Extra Firm)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 2 | | |  | website SKU 2046160 is claimed by 2 app products (s10:twin, b6:twin); one SKU identifies one product-size, so none of them is resolved |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 2 | | |  | website SKU 2046164 is claimed by 2 app products (s10:full, b6:full); one SKU identifies one product-size, so none of them is resolved |
| queen | 🔎 | `1991866` | $799.00 | Restonic® ComfortCare® Angelina 13" Hybrid Extra Firm Queen Mattress | [product-page](https://www.lacks.com/product/restonic-comfortcare-angelina-ii-13-hybrid-extra-firm-queen-mattress-1601-212-md27350-1991866) |
| king | ⚠️ 2 | | |  | website SKU 2046166 is claimed by 2 app products (s10:king, b6:king); one SKU identifies one product-size, so none of them is resolved |
| cal_king | — | | | | no-candidate |

### b7 — Gracie Medium (Restonic / Grace, Medium)

⚠️ 3, 🔎 1, — 2

| size | status | sku | selling | website name | evidence |
|---|---|---|---|---|---|
| twin | ⚠️ 1 | | | Restonic® Gracie II 11.5" Medium Twin  | no candidate met every evidence leg |
| twin_xl | — | | | | no-candidate |
| full | ⚠️ 1 | | | Restonic® Grace II 11.5" Medium Full M | no candidate met every evidence leg |
| queen | 🔎 | `2030258` | $569.00 | Restonic® Gracie II Medium Queen Mattress | [product-page](https://www.lacks.com/product/restonic-grace-ii-115-medium-queen-mattress-1601-132-mc45850-2030258) |
| king | ⚠️ 1 | | | Restonic® Grace II 11.5" Medium King M | no candidate met every evidence leg |
| cal_king | — | | | | no-candidate |

## Accessories

### base-bt2000 — BedTech BT2000 Adjustable Base (app price $899, expected type `base`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### base-bt3000 — BedTech BT3000 Massage Base (app price $1099, expected type `base`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### base-tempur-ergo — TEMPUR-Ergo 3.0 Power Base (app price $1599, expected type `base`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### foundation-princess — Chattam & Wells Standard Foundation (app price $499, expected type `base`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### pillow-flow — Bedgear Flow 2.0 Performance Pillow (app price $108, expected type `pillow`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### pillow-gel-memory — Gel Memory Foam Cool Pillow (app price $99, expected type `pillow`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token

### protector-dritec — Bedgear Dri-Tec Mattress Protector (app price $149, expected type `protector`)

⛔ **variant-conflict**

- ⛔ size `queen`: SKUs ['170991', '833804'] at [14995] — two variants claim one size; nothing chosen

| size | sku | selling | evidence |
|---|---|---|---|
| full | `170988` | $109.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |
| king | `170993` | $179.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |
| twin | `170984` | $99.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |
| twin_xl | `170986` | $104.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |

The app's single ungoverned `price: 149` corresponds to: _no size exactly_.

### protector-iprotect — Bedgear iProtect Mattress Protector (app price $89, expected type `protector`)

⛔ **variant-conflict**

- ⛔ size `queen`: SKUs ['170881', '833806'] at [8995] — two variants claim one size; nothing chosen

| size | sku | selling | evidence |
|---|---|---|---|
| full | `170871` | $69.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |
| king | `170890` | $99.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |
| twin_xl | `170868` | $69.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |

The app's single ungoverned `price: 89` corresponds to: _no size exactly_.

### protector-vertex — Bedgear Ver-Tex Cooling Protector (app price $249, expected type `protector`)

⛔ **variant-conflict**

- ⛔ size `queen`: SKUs ['1213416', '1266110'] at [24995] — two variants claim one size; nothing chosen

| size | sku | selling | evidence |
|---|---|---|---|
| full | `171011` | $229.95 | [product-page](https://www.lacks.com/product/bedgear-ver-tex-full-mattress-protector-bgm61awff-171011) |
| king | `1213418` | $299.95 | [category-listing](https://www.lacks.com/catalog/mattress-accessories?display_mode=products) |

The app's single ungoverned `price: 249` corresponds to: _no size exactly_.

### protector-tempur — TEMPUR-Protect Mattress Protector (app price $189, expected type `protector`)

— **unresolved** — no candidate of the expected product type with a matching brand and model token
