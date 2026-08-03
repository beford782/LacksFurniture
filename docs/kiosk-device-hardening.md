# Kiosk device hardening — contact autofill and browser persistence

**Status: UNRESOLVED operational requirement.** The application-level work in
Gate 1B is complete and verified. The device-level work below is not, and it
cannot be done from the codebase. Until a mounted showroom tablet has been
configured and verified against this checklist, one customer's contact details
can still be offered to the next customer by the browser itself, regardless of
what `index.html` does.

## Why HTML is not enough

The Save-your-Sleep-Brief screen collects a first name, an email address and an
optional phone number. Those three inputs and their `<form>` now carry:

- `autocomplete="off"` on the form and on all three inputs
- no `given-name` / `email` / `tel` autofill tokens (removed in Gate 1B)
- `autocorrect="off"`, `spellcheck="false"`, and per-field `autocapitalize`
- `data-lpignore` / `data-1p-ignore` / `data-form-type="other"` password-manager
  opt-outs

That is the whole of what HTML can express, and it is **not** a guarantee:

- **iOS/Safari ignores `autocomplete="off"` for contact autofill.** Safari's
  AutoFill decides from field heuristics (input `type`, label text, placeholder
  shape) and the "Contacts" AutoFill setting, not from the author's opt-out. A
  field labelled "Email Address" with `type="email"` will still offer the device
  owner's card on many iOS versions.
- **Keyboard/QuickType suggestions are a separate mechanism** from form
  autofill and are unaffected by page markup.
- **Password managers and browser profiles** may re-offer previously submitted
  values from their own store.
- **bfcache and session restore** can repopulate a form on back/forward
  navigation independently of page script.

Do not report the application change as "autofill is disabled". Report it as
"the page no longer requests autofill"; the device policy below is what
actually disables it.

## Device checklist — must be completed and verified per mounted tablet

Verification target: the deployed preview URL on the actual mounted hardware,
in the actual kiosk browser, in both English and Spanish.

### iPad / iOS (Safari or Guided Access kiosk)

- [ ] Settings → Safari → AutoFill → **Use Contact Info: OFF**
- [ ] Settings → Safari → AutoFill → **Credit Cards: OFF**
- [ ] Settings → Passwords → Password Options → **AutoFill Passwords: OFF**
- [ ] Settings → General → Keyboard → **Predictive: OFF** (QuickType strip)
- [ ] No personal Apple ID / iCloud account signed in on the device
- [ ] Guided Access or an MDM kiosk/single-app profile enabled so the customer
      cannot reach Settings, other tabs, or history
- [ ] Settings → Safari → **Clear History and Website Data** as part of the
      opening routine

### Managed deployment (MDM — Jamf, Intune, Apple Configurator)

Two **separate** Restrictions-payload keys are needed. They cover different
mechanisms, and neither implies the other.

- [ ] Restrictions payload: `safariAllowAutoFill = false`
      — turns off **Safari AutoFill** in its entirety: passwords, contact
      information, and credit cards, and it stops Safari AutoFill drawing on
      the Keychain. This is the key that covers the name / email / phone
      fields on the Save-your-Sleep-Brief screen. Apple's summary of the
      effect: *"Safari doesn't keep track of what users enter in web forms."*
- [ ] Restrictions payload: `allowPasswordAutoFill = false`
      — separately suppresses the **system password-AutoFill prompt**,
      including prompts offered by third-party credential providers. Apple's
      wording: *"Users can't use AutoFill Passwords, and no prompt is shown to
      pick a saved password from iCloud Keychain or third-party password
      managers."*
- [ ] Web content filter limited to the kiosk origin
- [ ] Single-app mode pinned to the kiosk browser

**Supervision is required.** Apple lists both restrictions under *device
management restrictions for supervised devices*: Safari AutoFill requires
supervision from iOS 13 / iPadOS 13.1 onward, and Password AutoFill from
iOS 12 / iPadOS 13.1. An unsupervised device cannot be restricted this way at
all, which makes Automated Device Enrolment (or Apple Configurator) a
prerequisite for this deployment, not an optional extra.

**What is still left open.** `allowPasswordAutoFill = false` suppresses the
*system prompt* from third-party credential providers — it does not remove or
disable the password-manager app itself. Someone can still open that app
directly and copy a value out of it by hand. Blocking direct access to such
apps is a separate kiosk / device-policy responsibility (app removal, an
allowlist, or single-app mode), and it is not covered by either restriction
above.

Sources (Apple primary documentation):

- [Device management restrictions for iPhone and iPad](https://support.apple.com/guide/deployment/restrictions-for-iphone-and-ipad-dep0f7dd3d8/web)
  — the Safari AutoFill and Password AutoFill effect wording and supervision/OS matrix quoted above.
- [Device management restrictions for supervised Apple devices](https://support.apple.com/guide/deployment/restrictions-for-supervised-devices-dep6b5ae23e9/web)
  — confirms both sit in the supervised-only set.
- [Restrictions payload — Apple Developer Documentation](https://developer.apple.com/documentation/devicemanagement/restrictions)
  — the authoritative list of payload key names.

**Key-name caveat, stated honestly.** Apple's two support-guide pages give the
*behaviour* and the supervision/OS matrix but not the payload key strings; the
Developer Documentation page that carries the key strings renders its property
table via JavaScript and could not be read non-interactively during this
change. `safariAllowAutoFill` is the key this project now specifies (the
previous `allowSafariAutoFill` was wrong — that spelling appears in no Apple
source found). Confirm both key spellings against your MDM vendor's payload
reference before shipping a profile; the behavioural requirements above are
what matter and are quoted directly from Apple.

### Android / Chrome kiosk

- [ ] Chrome → Settings → **Autofill and passwords → off**
- [ ] Chrome → Settings → **Addresses and more → off**
- [ ] No Google account signed in to the browser profile
- [ ] Chrome device policy in kiosk / pinned-app mode

## Real-device verification — NOT YET PERFORMED

The following must be observed on the mounted hardware before this is
considered closed. None of it can be asserted by the automated suites, which
run in Node against a DOM shim.

- [ ] Enter a name, email and phone; trigger the session timeout to expiry;
      confirm all three fields are empty afterwards **and** that tapping into
      each field offers no suggestion from the previous entry
- [ ] Repeat via Restart → confirm
- [ ] Repeat from the validation-error state and from the saved-confirmation
      state
- [ ] Background the app for longer than the full policy window, reopen, and
      confirm the reconciliation shows the warning (not a silent wipe)
- [ ] Confirm the keyboard's predictive strip offers nothing from the previous
      customer

## Session timing policy — provisional

The timeout values shipped in Gate 1B are declared in one place,
`SESSION_POLICY` in `index.html`:

| Setting | Preview value | Meaning |
|---|---|---|
| `idleWarningMs` | 5 min | ordinary inactivity before the warning opens |
| `graceMs` | 5 min | warning visible before the wipe runs |
| `tickMs` | 1 s | meter refresh (visual only, `aria-hidden`) |
| `finalAnnounceMs` | 60 s | one late spoken reminder, then silence |

These are **provisional preview defaults, not research evidence**. They were
chosen against a single structural observation: the main thing a customer does
in a mattress showroom — lying on a mattress — produces no DOM event, so a
short inactivity timer deletes live sessions while the product is being used as
intended. They are not validated, not optimal, and not universal. Expect real
mounted-device mattress-trial testing to change them.

Timing can be shortened for local development only, through
`window.__dfSetSessionPolicy({ idleWarningMs, graceMs, tickMs, finalAnnounceMs })`.
That hook refuses to act unless `location.hostname` is `localhost`, `127.0.0.1`
or `[::1]`. It is deliberately **not** a URL parameter and **not** backed by any
form of browser storage, so no production kiosk URL and no persisted value can
shorten a customer's privacy timeout.

## What the kiosk never stores

The customer session is memory-only. The app writes nothing to `localStorage`,
`sessionStorage`, IndexedDB or cookies, and `gasUrl` is blank in this
deployment, so no contact value leaves the device. A wipe therefore has nothing
to erase beyond the DOM and in-memory state — which is exactly what makes the
browser's own persistence, covered above, the remaining exposure.
