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

## Phase B½ — Send-nothing rehearsal in the repository (no deployment, no inbox)
Built 2026-09-09 (readiness gap G2). Before any test deployment exists, the
live-mode client path is rehearsed on one machine with nothing sent:

```
python tools/serve_delivery_preview.py --respond success --port 8000
```

serves the app with an **in-memory** `gasUrl` naming a stub endpoint on a
second loopback port; the stub records what the page POSTs and answers like
`Code.gs` (`--respond canspam_not_configured` is what the shipped `Code.gs`
answers today; `invalid_email`, `send_failed`, `echo`, `http_500`, `malformed`
and `--unreachable` drive each failure path). The recorded POSTs are readable
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
   - GAS execution log is shape-only (no raw PII).
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
