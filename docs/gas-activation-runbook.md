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
   (`docs/gas-rsa-field-addition.md`) and logs `ready`, the refusing
   property names, the leads tab and the remaining daily recipient quota.
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
| `{success:false, error:'invalid_request'}` | body not a JSON object, or `sendId` missing/malformed |
| `{success:false, error:'invalid_email'}` | address fails the shape check |
| `{success:false, error:'canspam_not_configured'}` | a required Script Property is unset, blank, malformed or a sentinel |
| `{success:false, error:'send_failed'}` | anything else (malformed optional property, lock timeout, mail failure); detail in the GAS log only |

**Duplicates.** Each request carries a client `sendId`
(`^[A-Za-z0-9_-]{22,40}$`, reused for the client's retry). Under the script
lock, a `sendId` recorded in the script cache (`df-sent:<sendId>`, 6 h, best
effort) answers `duplicate`. The record and the lead row are written only
**after** a successful send, so a failed send leaves nothing behind and its
retry yields one email and one row. A row write that fails after the send is
logged, not surfaced (a failure answer would invite a second email).

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
`send_failed`, `echo`, `http_500`, `malformed`, `flaky` and `--unreachable`
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
