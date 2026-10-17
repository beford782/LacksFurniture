# Lacks lead-capture activation runbook (Apps Script + Sheet)

How to turn the **preview-mode** Save-your-Sleep-Brief flow into **live**
email delivery and lead capture. The repository is deployment-ready: `Code.gs`
and `appsscript.json` deploy **unchanged**, and every deployment value lives in
the Apps Script project's **Script Properties**, never in the repo.

> Current state: `gasUrl` is blank, so the kiosk makes no request, sends no
> email and stores nothing. `Code.gs` is committed but **not deployed**. Every
> step below that creates a Google project, consents to scopes, sends a test
> email, sets `gasUrl` or merges needs Blake's explicit authorization in the
> task at hand.

## Decisions to make first (Blake)

1. **Sending account.** The script runs as the account that deploys it
   (`executeAs: USER_DEPLOYING`). That mailbox is the email's From address,
   and its quota is the ceiling. MailApp quota counts every **recipient**,
   BCC included: a consumer Gmail account allows about **100 recipients/day**
   (about 50 leads with a BCC), and Google Workspace about **1,500/day**.
   Check the live figure with `checkDeployment()` (below). For showroom
   volume, use a Workspace account the retailer controls.
2. **Retailer-approved values** (Lacks supplies, nobody invents): physical
   postal address, a working and monitored unsubscribe destination (`https://`),
   a privacy contact address, and the approved EN/ES privacy copy for
   `store-config` (`text.privacyBody`, `text.privacyPolicyContact`, consent
   wording).
3. **Lead copy (BCC)** destination, if any, and an optional reply-to address.

## Script Properties (Project Settings → Script Properties)

| Property | Required | Value |
|---|---|---|
| `UNSUBSCRIBE_URL` | yes | `https://` unsubscribe page (honored within 10 business days, live ≥30 days) |
| `POSTAL_ADDRESS` | yes | the retailer's physical postal address (≤300 chars) |
| `PRIVACY_CONTACT` | yes | privacy / data-request email address |
| `RESULT_EMAIL_BCC` | no | lead-intake copy address; blank or unset = no BCC |
| `REPLY_TO` | no | reply-to address; blank = the sending account |
| `LEADS_SHEET_NAME` | no | leads tab name; blank = `Leads` |

A required value that is unset, blank, malformed or still contains
`RETAILER_APPROVAL_REQUIRED` makes `doPost` refuse every request with
`canspam_not_configured` and send nothing (the log names the property, never
its value). A set-but-malformed optional value refuses with `send_failed`
(log: `deployment_config_invalid`).

## Scopes (`appsscript.json`)

Exactly two, so the consent screen is reviewable:
`https://www.googleapis.com/auth/script.send_mail` (MailApp) and
`https://www.googleapis.com/auth/spreadsheets.currentonly` (the bound leads
Sheet). LockService, CacheService and PropertiesService need none. The
consent screen must list only these two; anything else means the deployed
files are not the repo's. Web app: execute as the deploying user, access
"Anyone" (anonymous), which the kiosk's plain POST requires.
(`appsscript.json` sits at the repo root, so GitHub Pages also serves it
publicly; it holds no secret.)

## Phase B — Create and deploy (outside the repo)

**Path 1: clasp (scriptable).** Once per machine:
`npm i -g @google/clasp`, `clasp login` (browser OAuth as the sending
account), and enable the Apps Script API at
<https://script.google.com/home/usersettings>. Then, from the repo root:

```
clasp create --type sheets --title "Lacks DreamFinder Leads" --rootDir .
git status            # if clasp rewrote appsscript.json: git checkout -- appsscript.json
clasp push            # .claspignore pushes only Code.gs + appsscript.json
clasp deploy --description "DreamFinder <commit>"
```

`clasp create` makes the Sheet, binds a script to it and writes `.clasp.json`
(the script ID; git-ignored with `.clasprc.json`, never committed).

**Path 2: script editor (manual).** Create the Sheet as the sending account →
Extensions → Apps Script → paste `Code.gs` → Project Settings → tick "Show
appsscript.json" and paste the repo's manifest → Deploy → New deployment →
Web app (Execute as: Me; Who has access: Anyone).

**Both paths, then:**
1. Set the Script Properties above.
2. Run `checkDeployment` from the editor (Run menu). Its first run prompts
   the owner's consent for the two scopes. It sends nothing and writes no
   lead; it creates the leads tab with its 10-column header
   (`docs/gas-rsa-field-addition.md`) and the hidden send ledger tab
   `DreamFinder Sends`, and logs `ready`, the refusing property names, both
   tabs and the remaining daily recipient quota.
   Continue only when `ready` is true.
3. Copy the deployment's **`/exec` URL** and its deployment ID.

**Updating the code later:** keep the same `/exec` URL by deploying a **new
version of the same deployment**: editor: Deploy → Manage deployments →
pencil → Version: New version; clasp: `clasp push` then
`clasp deploy -i <deploymentId> --description "..."`. A plain
`clasp deploy` or "New deployment" creates a **different** URL that the kiosk
does not use.

## Response contract

| Answer | Meaning |
|---|---|
| `{success:true}` | email sent, then one Sheet row appended |
| `{success:true, duplicate:true}` | this `sendId` already sent; **no row, no email** |
| `{success:false, error:'delivery_unconfirmed'}` | an attempt of this `sendId` may already have gone out (MailApp threw, or an earlier execution stopped after its pre-send marker); it is **never resent**. The kiosk shows "This email may already have been sent. Please check your inbox and spam folder..." |
| `{success:false, error:'invalid_request'}` | body not a JSON object, or `sendId` missing/malformed |
| `{success:false, error:'invalid_email'}` | address fails the shape check |
| `{success:false, error:'canspam_not_configured'}` | a required Script Property is unset, blank, malformed or a sentinel |
| `{success:false, error:'send_failed'}` | nothing was sent: malformed optional property, lock timeout, ledger/Sheet unreadable, daily quota exhausted, any error before the send; the same `sendId` stays retryable; detail in the GAS log only |

**Duplicates: at most one email per `sendId`.** Each request carries a
client `sendId` (`^[A-Za-z0-9_-]{22,40}$`). The kiosk keeps one id per
recipient address and figures: its automatic retry, the visible "Try again",
a language switch, a re-opened take-home screen and an edited name or phone
all reuse it; only a different address or different figures (or the
new-customer wipe) makes a new one. Under the script lock, `Code.gs` checks
the script cache (`df-sent:<sendId>`, 6 h, best effort), then the durable
ledger, the hidden `DreamFinder Sends` tab (one row per id: `id:<sendId>`,
state, time, kept lead). The ledger row is written and flushed in state
`sending` **before** MailApp runs, so whatever happens after the send (lost
response, a throw, the execution limit) a retry can never mail twice:

| Ledger state | Meaning | A retry of that `sendId` gets |
|---|---|---|
| `sending` | marker written; the execution stopped before recording an outcome | `delivery_unconfirmed` |
| `unconfirmed` | MailApp threw (Google may have accepted it); no plain-text resend | `delivery_unconfirmed` |
| `sent` | delivered; the lead row not yet written | `duplicate` |
| `row_pending` | delivered; the lead-row append failed, the lead kept in column D | `duplicate` |
| `complete` | delivered and the lead row written; the kept copy cleared | `duplicate` |

Only an HTML **build** failure (before any delivery) falls back to a
plain-text-only email. Pre-send failures (lock, ledger, quota, marker) write
no marker and answer `send_failed`.

**Recovery (operator, editor only).** Run `recoverPendingLeads` from the
editor: it appends every kept lead in `sent`/`row_pending` to the leads tab,
marks it `complete` and clears the copy; it sends nothing and logs counts
only. It also counts `sending`/`unconfirmed` rows: for each, check the inbox
or BCC copy for that customer before anyone re-sends by hand (a new send from
the kiosk needs a different address or figures, or a new customer session).
The ledger grows by one row per send; archive old rows by hand if it ever
gets large (the lookup reads column A).

**The quote section** ("Your quote" / "Tu cotización") renders verbatim from
the client's purchase summary when it is complete (all-or-nothing, no server
arithmetic) and never reaches the row. The shipped kiosk sends `quote: null`
until governed pricing is activated.

## Phase B½ — Send-nothing rehearsal (repository, no deployment)

```
python tools/serve_delivery_preview.py --respond success --port 8000
```

Serves the app with an in-memory `gasUrl` pointing at a loopback stub that
answers like `Code.gs` (`--respond canspam_not_configured` is what an
unconfigured deployment answers; `invalid_request`, `invalid_email`,
`send_failed`, `delivery_unconfirmed`, `echo`, `http_500`, `malformed`,
`flaky`, `lost_response` (sent, then the answer lost) and `--unreachable`
drive each path). Nothing is deployed, sent or stored.
`tests/delivery_harness_check.py` runs it headless in CI and replays the
recorded payload through the real `doPost`.

## Phase C — Controlled-recipient test (no customer, no repo change)

1. Point a **local, uncommitted** `gasUrl` at the `/exec` (for example by
   serving a scratch copy); never commit it.
2. Submit the flow in **EN and ES** to **Blake's own address only**, never a
   customer's. Set `RESULT_EMAIL_BCC` to an owner-controlled address or leave
   it blank for this test. Verify:
   - subject **"Your Sleep Brief from Lacks Furniture"** / **"Tu Resumen de
     Sueño de Lacks Furniture"** (Lacks issues no Savings Pass code, so the
     Savings Pass subject never appears);
   - the body renders in Gmail, Outlook and iOS Mail, images load, the
     footer shows the postal address, unsubscribe link and privacy contact;
   - one row in the leads tab with all 10 columns (incl. `Lang`, `RSA`,
     `Send ID`), and the BCC copy if configured;
   - re-POSTing the same body answers `duplicate` with no second row or email;
   - invalid email shows the friendly message; the GAS log is shape-only.
3. Run `checkDeployment()` again and note the remaining quota.

## Controlled delivery test (owner address only; needs Blake's authorization)

Run once the deployment exists, Script Properties are set and
`checkDeployment()` reports `ready: true`. It sends exactly **one** real
email, to the address typed twice, and needs no kiosk or `gasUrl` change.
It never runs in CI (the probe refuses under `CI` unless `--dry-run`); its
offline check is `python tests/gas_delivery_probe_check.py`.

```
# 1. Inspect the three request bodies; no network:
python tools/gas_delivery_probe.py --gas-url https://script.google.com/macros/s/<deploymentId>/exec \
    --to <your own address> --confirm-recipient <your own address> --dry-run
# 2. Send (EN), then repeat with --lang es for the Spanish email:
python tools/gas_delivery_probe.py --gas-url https://script.google.com/macros/s/<deploymentId>/exec \
    --to <your own address> --confirm-recipient <your own address>
```

The probe POSTs a synthetic payload with the kiosk's exact key set (every
visible value marked `CONTROLLED DELIVERY TEST`, a $1.00 test quote), then
the same body again, then a malformed `sendId`, and expects
`{success:true}`, `{success:true, duplicate:true}` and
`{success:false, error:'invalid_request'}`. Exit 0 = all three as expected.
Then check by hand:

- **Inbox:** exactly **one** email per run (plus one BCC copy if
  `RESULT_EMAIL_BCC` is set); subject "Your Sleep Brief from Lacks Furniture" /
  "Tu Resumen de Sueño de Lacks Furniture"; the "Your quote" / "Tu
  cotización" section with the TEST line; the footer's postal address,
  unsubscribe link and privacy contact. Check spam too.
- **Sheet, Leads tab:** one new row, name "DreamFinder Delivery Test", RSA
  `delivery-probe`, `Send ID` = the id the probe printed.
- **Sheet, hidden `DreamFinder Sends` tab** (View → Hidden sheets): one row
  `id:<that id>` in state `complete` with column D empty.
- **Executions log:** shape-only lines (no address, no figure), one
  `duplicate ... (cache)` line for step 2 and one `invalid_request` for step 3.
- Delete the test rows afterwards if wanted (leave the header rows).

Anything else (two emails, a `FAIL` line, a ledger row stuck in `sending`)
stops activation; keep the probe output and the execution log for review.

## Phase D — Go live (explicit owner authorization, PR only)

1. On a feature branch: set `"GAS URL"` in `incoming/build_lacks_workbook.py`
   to the production `/exec`, rebuild the workbook and run
   `tools/convert_store_data.py` (never hand-edit `data/store-config.json`;
   `tests/lineage_check.py` fails on it).
2. In the **same** authorized PR, lift the CI lock "Shipped operating state
   unchanged" (`gasUrl is blank`) in `.github/workflows/ci.yml`, and land the
   approved live privacy copy (`tools/validation.py` rejects preview wording
   once `gasUrl` is non-blank).
3. Open the PR; merge only when Blake asks, after the required check passes.
   Never push to `main`. A merge deploys Pages; it is not by itself
   authorization for showroom use.
4. After Pages deploys, verify one owner-address submission end to end
   (Sheet row, email, BCC) and the preview → live copy swap.

## Phase E — Handoff

Record (outside the repo): sending account, Sheet URL, script ID, deployment
ID and `/exec`, Script Property values, BCC, unsubscribe process owner and
quota. Give Lacks access to the Sheet.
