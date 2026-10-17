# GAS leads Sheet — column contract & the `rsa` field

`Code.gs` `doPost()` appends one row per delivered lead to the leads tab of
the Spreadsheet the script is **container-bound to**
(`SpreadsheetApp.getActiveSpreadsheet()`). The tab is found **by name**
(Script Property `LEADS_SHEET_NAME`, default `Leads`), never "whichever tab is
active"; if it does not exist, the first request (or `checkDeployment()`)
creates it with the header row below and freezes that row.

The row is appended **only after the email is sent**, so a failed send writes
nothing and the client's retry of the same `sendId` produces exactly one row.
A Sheet write that fails after a successful send is logged, not surfaced (the
customer must not be mailed twice); the BCC copy, when configured, still
carries the lead.

## Column order (must match the Sheet header row exactly)

`appendRow` writes these 10 values, in this order (see `Code.gs`
`LEADS_HEADER`):

| # | Column header | Source / value |
|---|---|---|
| 1 | Timestamp     | `new Date()` (script timezone, America/Chicago) |
| 2 | Name          | `name` (`_safeText`, ≤200) |
| 3 | Email         | `email` (validated) |
| 4 | Phone         | `phone` (`_safeText`, ≤40) |
| 5 | Dream Code    | `dreamCode` (Savings Pass code; always blank for Lacks) |
| 6 | Lang          | `en` \| `es` |
| 7 | Matches       | top-6 joined: `"Name (94%)"`, or `"Name (additional comparison option)"` for sub-threshold backfills |
| 8 | Accessories   | up-to-20 accessory names, comma-joined, `" xN"` for a quantity above one |
| 9 | RSA           | salesperson id from `localStorage 'dreamfinder.<storeKey>.deviceRsa'` (may be empty) |
| 10 | Send ID      | the request's client-generated `sendId` (reconciles a row with its email and with any retry) |

## Why new fields are appended at the END (append, don't insert)

`rsa` (column 9) and `Send ID` (column 10) were added **as the right-most
columns** on purpose. Inserting mid-row would re-index every column after it
and silently misalign all prior data and any downstream consumers (filters,
reports, exports). Appending at the end keeps existing columns stable.

**Sheet operator action for a tab created before 2026-10-16:** add a
`Send ID` header in column 10 (right of `RSA`). A tab the script creates
itself already carries it.

## Notes
- Logging is shape-only (`Logger.log` records `name_len`, `email=set/unset`,
  counts, `lang` — never raw PII, never a Script Property value). The
  **Sheet** intentionally stores raw name/email/phone (that is the lead).
- The quote and the consultation strings never reach the row.
- This contract is consumed only when `STORE_CONFIG.gasUrl` is set (live mode).
  While `gasUrl` is blank the kiosk never POSTs and no row is written.
