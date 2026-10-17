# Lacks lead-capture activation runbook (Apps Script + Sheet)

How to turn the **preview-mode** Save-your-Sleep-Brief flow into **live** lead
capture. The app is built for **single-field activation**: the only repo change
to go live is setting `STORE_CONFIG.gasUrl` in `data/store-config.json`.
Everything else in the UI already branches off that value.

> Preflight truth (current state): `gasUrl=""` ⇒ no POST, no email, nothing
> stored. `Code.gs` is committed but **not deployed**.

---

## Phase B — Google Sheet + Apps Script (outside the repo)
1. Create the **leads Google Sheet**. Add the header row per
   `docs/gas-rsa-field-addition.md` (9 columns; `RSA` last).
2. **Extensions → Apps Script** from that Sheet (container-bound, so
   `getActiveSpreadsheet()` resolves correctly).
3. Paste the repo's `Code.gs`.
4. Set `RESULT_EMAIL_BCC` (top of `Code.gs`) to the retailer's (Lacks') lead-intake inbox
   (or `''` to disable BCC). Default today is the shared `dreamfinderleads@gmail.com`.
5. **Deploy → New deployment → Web app**: *Execute as: Me*, *Who has access:
   Anyone*. Authorize the Gmail + Sheets scopes when prompted.
6. Copy the **`/exec` Web App URL**.

## What `Code.gs` does with each request (2026-10-15, one operable application)

**Response contract** (the kiosk classifies exactly these; `EMAIL_FAILURE_CODES`):

| Answer | Meaning |
|---|---|
| `{success:true}` | one Sheet row appended, one email sent |
| `{success:true, duplicate:true}` | this `sendId` already sent; **no row, no email** |
| `{success:false, error:'invalid_request'}` | body not a JSON object, or `sendId` missing/malformed |
| `{success:false, error:'invalid_email'}` | address fails the shape check |
| `{success:false, error:'canspam_not_configured'}` | the CAN-SPAM sentinels are still in place (shipped state) |
| `{success:false, error:'send_failed'}` | anything else, including a lock timeout; detail in the GAS log only |

**Send identity and duplicate suppression.** Every request must carry a
client-generated `sendId` matching `^[A-Za-z0-9_-]{22,40}$` (created with
`crypto.getRandomValues` when the take-home screen opens, reused for the
client's one automatic retry and for a visible retry of the same content).
After the address and CAN-SPAM checks, `doPost` takes the **script lock**
(`LockService.getScriptLock().waitLock(10000)`, released in `finally`) and
looks up `df-sent:<sendId>` in the **script cache**
(`CacheService.getScriptCache()`). A hit answers `duplicate` with nothing
written or sent. The key is written (TTL 21600 s, the CacheService maximum)
only **after** a successful send, so a failed or refused request stays
retryable. Limits to know: the cache is best-effort (Google may evict entries
early), so dedupe protects the retry window (seconds to hours), not forever;
a request whose Sheet row was appended but whose email then failed is not
recorded, so its retry can append a second row (never a second email for a
success). Neither LockService nor CacheService has an authorization section
in Google's reference (checked 2026-10-15), so **no OAuth scope beyond the
Gmail + Sheets scopes is requested** for them; confirm the consent screen at
deployment lists only those.

**The quote section ("Your quote" / "Tu cotización").** When the payload's
`quote` is a complete v:1 purchase summary (contract section 3) it renders in
both the HTML and the plain-text body, after the Sleep System: lines (name,
detail, quantity, list, discounts, net), list subtotal, discounts,
merchandise subtotal, exclusions, the payment block (pay in full / plan rows /
quote-only note), offer terms and provenance. Every value is the client's
formatted text, string-typed, length-capped and HTML-escaped (angle brackets
stripped in plain text); **the server does no arithmetic**, so the email
equals the screen. A malformed summary, more than 20 lines, more than 6 offer
terms or more than 6 discounts on a line drops the **whole** section (never a
partial quote). The quote never reaches the Sheet row; the GAS log records
only `quote=present|absent` and the line count. The shipped kiosk sends
`quote: null` (pricing is dark: `pricing.surfaces.email` is false).

## Inputs still required before any real send

Nothing below exists today, and none may be invented:

1. **The deployed `/exec` URL** in `data/store-config.json` `gasUrl` (blank
   today; setting it is the activation switch and needs Blake's explicit
   authorization).
2. **The three CAN-SPAM values** replacing the `RETAILER_APPROVAL_REQUIRED_*`
   sentinels in `Code.gs`: `UNSUBSCRIBE_URL` (a working, monitored
   unsubscribe destination), `POSTAL_ADDRESS` (Lacks' physical postal
   address), `PRIVACY_CONTACT` — supplied and approved by Lacks. Until then
   `doPost` answers `canspam_not_configured` and sends nothing.
3. **The BCC destination**: `RESULT_EMAIL_BCC` (today the shared
   `dreamfinderleads@gmail.com`; set Lacks' lead-intake inbox or `''`).
4. **The privacy copy**: real Privacy & Terms content for the in-app privacy
   overlay, `text.privacyPolicyContact`, and approved consent wording (EN/ES)
   in `store-config.json`.

Pricing, offers and payment figures in the email additionally require the
governed pricing activation (contract section 6); without it `quote` stays
null and the email carries no figures.

## Phase B½ — Send-nothing rehearsal in the repository (no deployment, no inbox)
Built 2026-09-09 (readiness gap G2). Before any test deployment exists, the
live-mode client path is rehearsed on one machine with nothing sent:

```
python tools/serve_delivery_preview.py --respond success --port 8000
```

serves the app with an **in-memory** `gasUrl` naming a stub endpoint on a
second loopback port; the stub records what the page POSTs and answers like
`Code.gs` (`--respond canspam_not_configured` is what the shipped `Code.gs`
answers today; `invalid_request`, `invalid_email`, `send_failed`, `echo`,
`http_500`, `malformed` and `--unreachable` drive each failure path, and
`flaky` fails the first POST of each `sendId` with HTTP 500 so the client's one
automatic retry is exercised). Like `Code.gs`, the stub answers
`invalid_request` for a missing or malformed `sendId` and
`{success:true, duplicate:true}` for a `sendId` it already accepted; each
recorded POST names its `outcome`. The recorded POSTs are readable
at the URL the banner prints; the console shows only their shape. Nothing is
deployed, sent or stored and the committed `gasUrl` stays blank.
`tests/delivery_harness_check.py` runs the whole rehearsal headless in CI:
shipped and live modes in EN and ES, the payload contract, every failure
path with its copy and closed-set diagnostic, and the recorded payload
replayed through the real `doPost`. Phase C's error-path and shape-only-log
items are therefore proved here first and re-verified against the real
deployment in Phase C; what Phase C alone can prove is the deployed `/exec`,
the Sheet row, the delivered email's rendering and the BCC copy.

## Phase C — Test deployment with a seed inbox (no live change)
1. Point a **local, uncommitted** `gasUrl` at the test `/exec`.
2. Submit the flow in **EN and ES** with a seed email you control. Verify:
   - Sheet row appends with correct columns (incl. `lang`, `rsa`, matches, accessories).
   - Customer email arrives — correct EN/ES subject (now "Sleep Brief & Savings
     Pass" / "Resumen de Sueño y Pase de Ahorro"), body renders in Gmail/Outlook/iOS,
     images load, Sleep Brief + matches + Payment Choice section present (no DREAM code for Lacks: the Savings Pass is disabled), no broken links.
   - BCC inbox receives a copy.
   - Error paths: invalid email → friendly message; GAS unreachable → network error.
   - GAS execution log is shape-only (no raw PII; quote presence and line count only).
   - Re-POST the same body (same `sendId`): answer `duplicate`, no second row, no second email.
   - If governed pricing is active for the test: the "Your quote" section's figures match the kiosk screen exactly, in Gmail/Outlook/iOS and in the plain-text part.
   - POST works cross-origin from `beford782.github.io`.
3. Iterate on `Code.gs` email copy/rendering here (this is where the email is
   first actually viewable). Consider reordering the email body to lead with the
   Sleep Brief section before the Savings Pass band.

## Phase D — Go live (with explicit approval)
1. Set `data/store-config.json` `gasUrl` to the **production** `/exec`.
2. Commit → back up feature branch → fast-forward `origin/main` (no force).
3. Live-verify one real seed submission end-to-end (Sheet + email + BCC) and the
   preview→live confirmation copy swap.

## Phase E — Production handoff
Document the live deployment (gasUrl, Sheet id, deployment id, BCC, scopes,
unsubscribe process); hand the retailer (Lacks) Sheet access; final live QA; update the session
handoff/memory.

---

## Blocking items before real PII collection (need Lacks-provided content)
- **Privacy/consent:** real Privacy & Terms content for the in-app
  `privacyOverlay`, a value for `text.privacyPolicyContact`, and confirmed
  consent wording (EN/ES).
- **CAN-SPAM for the sent email:** the email currently has **no functional
  unsubscribe** and **no physical mailing address**. Add both (or revise copy)
  before sending real commercial email. Lacks must supply and approve the postal
  address, the unsubscribe destination/process, and a privacy contact.
  `Code.gs` now HARD-BLOCKS all sending (`canspam_not_configured`) until the
  three `RETAILER_APPROVAL_REQUIRED_*` sentinels are replaced with approved
  values — do not invent them.
