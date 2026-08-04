# Kiosk device hardening — contact autofill and browser persistence

**Status: BLOCKING for showroom use. Application/session paths verified; device
deployment not.** The application-level work in Gate 1B is complete and
verified. On the test iPad, Safari Contact AutoFill was identified as the
observed mechanism and suppressed, and every identified customer-facing
session-ending route was individually checked clean. What has **not** been done is
the device deployment: no supervised MDM payload has been applied or proven, and
several checklist controls remain unverified. That work cannot be done from the
codebase.

The gap is no longer theoretical. **On a real iPad, iOS offered an autofill
suggestion in the contact fields** on the deployed build, with every mitigation
`index.html` can express already in place — see *Observed on hardware* below.
That proves the markup is insufficient on this hardware. A follow-up found the
suggestion disappeared once **Use Contact Info** was turned off, identifying
Safari Contact AutoFill as the observed mechanism and proving that setting
effective for that suggestion on this iPad. Each identified customer-facing
session-ending route — Restart, timeout to expiry, validation error, saved
confirmation via Restart, saved confirmation via its dedicated **Start New
Customer** control, and background/wake — was then exercised individually, and
each left a fresh session with empty fields offering none of the prior values.

Those results verify the application/session boundary on this hardware. They do
**not** complete the device checklist, and they do not prove either supervised
Restrictions payload: the controls used were changed through the Settings UI,
and the device's supervision/enrolment state was never established. An unmanaged
autofill surface on a tablet handed between members of the public may expose
personal information, so:

> Application markup did not suppress Safari Contact AutoFill on this hardware.
> Turning off **Use Contact Info** suppressed the observed suggestion, but the
> kiosk must not be approved for showroom use until the remaining device-level
> restrictions are applied and verified.

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
"the page no longer requests autofill". On this iPad, turning off **Use Contact
Info** was verified to suppress the observed Safari Contact AutoFill
suggestion. That result does not verify the other controls or mechanisms in the
device policy below. The insufficiency of the markup is independently proven:
on 2026-08-03 iOS offered a suggestion despite every one of the attributes
above being present — see *Observed on hardware*.

## Device checklist — must be completed and verified per mounted tablet

Verification target: the deployed preview URL on the actual mounted hardware,
in the actual kiosk browser, in both English and Spanish.

**This checklist is per mounted showroom tablet and is deliberately still
unticked**, including *Use Contact Info: OFF* — which was turned off on the test
iPad during the 2026-08-03 runs recorded further down, and is how the mechanism
was identified.

> This checklist remains unticked because the hardware tests did not establish
> that the test iPad is the mounted showroom device or that every per-device
> deployment control was configured and verified. Tick these items individually
> on each deployed tablet after verification.

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

## Observed on hardware — Safari Contact AutoFill identified and suppressed

**Date:** 2026-08-03. **Observer:** Blake, by hand on an iPad in Safari.
**Build:** the deployed preview at `https://beford782.github.io/LacksFurniture/`,
serving merge commit `b373b98` (Gate 1B), byte-verified identical to `main`.

**Result: iOS offered an autofill suggestion in the contact fields.** The
content of the suggestion, and which iOS feature produced it, were not
recorded during the initial observation.

At the time of the observation the page already carried everything HTML can
express: `autocomplete="off"` on the form and on all three inputs, no
`given-name` / `email` / `tel` tokens, `autocorrect="off"`,
`spellcheck="false"`, and the `data-lpignore` / `data-1p-ignore` /
`data-form-type="other"` password-manager opt-outs. iOS offered a suggestion
anyway.

### Follow-up verification on the same iPad

Later on 2026-08-03, Blake performed the follow-up checks against the live site
serving `main`. **Provenance:** `index.html` is byte-identical at `b373b98`,
`6d0b816` and `d9cdd3a` — SHA-256 `f0613dd1…`, 745,071 bytes — because the only
changes between those commits were to this document. Every observation below
therefore exercised the same application build, whichever of those commits was
live at the time.

1. **Mechanism and control.** After Settings → Safari → AutoFill → **Use Contact
   Info** was turned off and the kiosk was reloaded, tapping the Name field no
   longer produced the observed suggestion. This identifies Safari Contact
   AutoFill as the source of the original observation and proves this setting
   effective for that suggestion on this iPad.
2. **Fresh-session carryover.** With **Use Contact Info** still off, Blake
   entered clearly fake name, email and phone values, ended the test session,
   began a fresh session, and tapped each contact field. None of the prior test
   values was offered. The particular session-ending route used for this initial
   check was not recorded — the routes below were then exercised individually.

### Session-ending routes — each exercised individually

Also on 2026-08-03, with **Use Contact Info** off, Blake ran each session-ending
route separately. The pattern in every case: enter clearly fake name, email and
phone values, end the session by that specific route, begin a fresh session,
then tap each contact field.

| Route | How the session was ended | Result on the fresh session |
|---|---|---|
| **Restart** | Restart selected and confirmed | fields empty; none of the prior values offered |
| **Timeout to expiry** | idle until the warning appeared, then **no action taken** through the grace period, so the automatic reset ran | fields empty; none of the prior values offered |
| **Validation error** | invalid email entered to trigger the validation state, then Restart confirmed | fields empty; **no stale validation error**; none of the prior values offered |
| **Saved confirmation → global Restart** | valid fake details carried through to the saved-confirmation screen, then the global Restart control used and confirmed | fields empty; none of the prior values offered |
| **Saved confirmation → Start New Customer** | valid fake details carried to the saved-confirmation screen, then its dedicated **Start New Customer** control tapped | fields empty; none of the prior values offered |
| **Background / wake** | Safari backgrounded for longer than the full policy window, then reopened | reopening showed the **warning**, not a silent erase; Restart then selected; the subsequent session was clean and offered no prior values |

The last two rows are deliberately separate results, because they are separate
code paths. The global Restart control and the email screen's "Start over" both
carry `js-start-over`, whose delegated handler calls `requestStartOver()` and
routes through the safety confirmation dialog. The saved-confirmation screen's
own **Start New Customer** button (`#emailConfirmStartOver`) instead calls
`window.startOver()` directly, reaching `resetSessionState()` with no dialog in
between. Verifying one says nothing about the other, so both were run.

The background/wake case is worth calling out separately: it confirms the
deadline reconciliation behaves as designed — a tablet that sleeps past both
deadlines still surfaces the warning rather than wiping silently, which is the
recoverable behaviour Gate 1B was built for.

**Predictive keyboard.** Settings → General → Keyboard → **Predictive** was off
during these runs, and the final fresh-session check offered none of the
distinctive prior values. That is the extent of the evidence: it was **not**
separately observed whether the QuickType strip was visually absent, so the
strip's own behaviour is recorded as unverified below.

### What this does and does not establish

**Established.** The HTML-level mitigations were insufficient on this hardware.
Every attribute the page can carry was present, and iOS still offered a
suggestion. Application markup alone does not suppress iOS autofill here.

**Established by the follow-up.** The observed mechanism was Safari Contact
AutoFill, and turning off **Use Contact Info** suppressed it on this iPad.

**Established by the per-route runs.** Every identified customer-facing
session-ending route — Restart, timeout to expiry, validation-error state,
saved confirmation via the global Restart control, saved confirmation via its
dedicated **Start New Customer** control, and background/wake — was exercised
individually on this iPad with **Use Contact Info** off, and in each case the
fresh session started with empty fields and offered none of the prior values.
Background/wake additionally showed the warning rather than a silent erase.

"Identified" is doing real work in that sentence: it means the routes known
and enumerated at the time of testing, not a proof of exhaustiveness. The
Start New Customer route was added precisely because review found it had been
missed. A further audit could surface another entry point.

**Not established — and important not to overstate.** This is verification of
the *application/session paths* on *this iPad*, under *one* device
configuration. It does not prove carryover is impossible under every condition:
a different iOS version, a device signed into a personal Apple ID, a restored
backup, a third-party keyboard or a password manager could each behave
differently, and none of those was tested.

Critically, **no supervised Restrictions payload was applied or proven during
these tests**, and **the device's supervision / enrolment state was not
established** — whether this iPad is supervised through Automated Device
Enrolment, Apple Configurator or an MDM is simply not known. The controls
exercised were changed through the **Settings UI**.

A Settings toggle does not prove either `safariAllowAutoFill` or
`allowPasswordAutoFill`. Those are enforced through a Restrictions payload; a
toggle can be changed by anyone who reaches Settings, which is what supervision
and single-app mode exist to prevent. Guided Access is likewise not a supervised
MDM profile. Both payload keys, supervision via ADE or Apple Configurator, the
clear-site-data routine and the remaining deployment controls stay unchecked —
and determining this device's supervision state is itself now an open item.

The operative conclusion, bounded to the evidence:

> Application markup did not suppress Safari Contact AutoFill on this hardware.
> Turning off **Use Contact Info** suppressed the observed suggestion, but the
> kiosk must not be approved for showroom use until the remaining device-level
> restrictions are applied and verified.

That is a hard prerequisite, and it does not depend on the carryover question
being settled. An unmanaged autofill surface on a device handed between members
of the public is an unacceptable privacy risk whether the value offered came
from a previous customer, the device owner, or the keyboard's prediction model.
The checklist below therefore stands as a gate on showroom use, not as a
recommendation.

**Closed for the application/session paths on this iPad.** Safari Contact
AutoFill was the responsible mechanism, **Use Contact Info: OFF** suppressed it,
and every identified customer-facing session-ending route was individually
verified to leave a clean fresh session.

**Still open for the device boundary — the gate remains BLOCKING.** No
supervised MDM payload was deployed or proven; neither `safariAllowAutoFill` nor
`allowPasswordAutoFill` has been enforced through a Restrictions profile.
Password AutoFill, the QuickType strip's own behaviour, credit-card AutoFill,
Apple ID state, kiosk/single-app enforcement and the clear-site-data routine
remain unverified. Showroom use stays blocked until those are completed.

## Real-device verification status

The application/session paths are answered on this iPad. The device-deployment
controls are not, and none of this can be asserted by the automated suites,
which run in Node against a DOM shim.

**Verified — application/session paths (2026-08-03, this iPad, Use Contact Info off):**

- [x] Turn off **Use Contact Info**, reload, and confirm the originally observed
      suggestion stops on the test iPad
- [x] Enter fake name, email and phone values; end the session; begin a fresh
      session; confirm none of the prior values is offered (initial check —
      session-ending route not recorded)
- [x] Repeat specifically via **session timeout to expiry** — warning appeared,
      no action taken through the grace period, automatic reset ran; fresh
      session had empty fields and offered none of the prior values
- [x] Repeat via **Restart** → confirmed; fresh session clean
- [x] Repeat from the **validation-error** state (invalid email, then Restart
      confirmed) — fresh session had empty fields, no stale validation error,
      and offered none of the prior values
- [x] Repeat from the **saved-confirmation** state via the global Restart
      control (valid fake details carried to the confirmation screen, then
      Restart confirmed) — fresh session clean
- [x] Repeat from the **saved-confirmation** state via its dedicated **Start
      New Customer** control (`#emailConfirmStartOver`, which calls
      `window.startOver()` directly, bypassing the safety dialog) — fresh
      session had empty fields and offered none of the prior values
- [x] Background the app for longer than the full policy window, reopen, and
      confirm the reconciliation shows the **warning** (not a silent wipe) —
      confirmed; Restart then gave a clean session

**Not verified — device deployment controls:**

- [ ] Deploy and prove the supervised Restrictions payload `safariAllowAutoFill
      = false` (a manual Settings toggle is **not** equivalent — see above)
- [ ] Deploy and prove the supervised Restrictions payload
      `allowPasswordAutoFill = false`
- [ ] Establish whether the test iPad is supervised at all. Its supervision /
      enrolment state was never determined, so no conclusion about payload
      enforceability can be drawn from these runs either way
- [ ] Supervise the mounted device via Automated Device Enrolment or Apple
      Configurator (prerequisite for both keys above)
- [ ] Confirm the keyboard's predictive strip is itself absent / offers nothing
      from the previous customer. Predictive was off during the runs above and
      no prior value was offered, but the strip was not separately observed
- [ ] Confirm no suggestion appears from Password AutoFill or another mechanism
      once the payloads are in place
- [ ] Credit Cards AutoFill off; no personal Apple ID / iCloud account signed in
- [ ] Kiosk / single-app enforcement (Guided Access is **not** a supervised MDM
      profile)
- [ ] **Clear History and Website Data** as part of the opening routine

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

## What the kiosk stores, and what it does not

**No customer data is persisted.** The customer session — quiz answers, saved
mattresses, reactions, Sleep System decisions, financing interest, and the
name / email / phone on the Save-your-Sleep-Brief screen — lives only in memory
for the length of one visit. None of it is written to `localStorage`,
`sessionStorage`, IndexedDB or cookies, and `gasUrl` is blank in this
deployment, so no contact value leaves the device at all. A session wipe
therefore has nothing to erase beyond the DOM and in-memory state.

**Two things are persisted, and neither is customer data.** The app does use
`localStorage`, for the salesperson selection this device remembers between
customers:

| Key | Contents | Why it survives a wipe |
|---|---|---|
| `dreamfinder.<store>.deviceRsa` | the salesperson currently selected on this tablet | it is a property of the *device*, not the customer; re-picking it for every customer would be the wrong behaviour |
| `dreamfinder.<store>.rsaList` | the roster of salespeople added on this tablet | same — staff roster, maintained per device |

Both are **staff/device state**, deliberately outside the session wipe, and are
left exactly as they are by this work. They do hold employee names, so they are
personal data in the ordinary sense even though they are not customer data:
treat the tablet's browser profile as containing staff names, and clear site
data when a device is reassigned or decommissioned.

The distinction matters for the sections above: clearing site data as part of
an opening routine also clears the salesperson selection, so staff will need to
re-pick it. That is a deliberate trade-off to note in the opening checklist,
not a defect.

What remains the real exposure is the browser's own contact/password
persistence, covered earlier — which the app cannot reach and device policy
must disable.
