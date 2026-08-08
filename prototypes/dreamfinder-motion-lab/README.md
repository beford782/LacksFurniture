# DreamFinder Motion Laboratory — "Hand and Cloth"

> **RESEARCH / PROTOTYPE ONLY — DO NOT MERGE.** This laboratory is not a Phase 1
> implementation, is not approved for production, and is never imported or executed
> by the production application. It exists so the owner can evaluate candidate
> motion directions before any production design spike is approved.

## What this is

An isolated, self-contained motion laboratory for evaluating a mattress-specific
animation language for DreamFinder's assisted-sales consultation. The salesperson
is the primary operator and narrator; every scene here is judged by whether it
makes that shared, glanceable conversation clearer — not by whether it decorates.

The motion language under test is **"Hand and Cloth"**: every movement derives from
physical mattress behavior (compression, rebound, textile tension, card placement,
material settling) at the scale of a salesperson's hand. No particles, no glows,
no orbiting dots, no cartoon bounce, no ambient loops.

Full rationale, agent findings, decision matrix, and the recommendation live in
`docs/dreamfinder-motion-investigation.md` at the repo root.

## How to run

Serve the **repo root** over HTTP (the lab references two production mattress
photographs read-only via relative paths; `file://` will not load them):

```
python -m http.server 8000
```

Then open:

```
http://localhost:8000/prototypes/dreamfinder-motion-lab/
```

Useful URL parameters:

| Parameter | Effect |
|---|---|
| `?selftest=1` | Runs the in-page smoke suite (loading, full-sequence completion, replay, rapid interruption, reduced-motion branch, console-error count) and renders a results table. Machine-readable result at `window.__MOTION_LAB_SELFTEST`. |
| `?reducedmotion=1` | Forces the reduced-motion branch regardless of OS setting, for testing. |
| `?fullmotion=1` | Forces the animated branch — headless Chrome defaults to `prefers-reduced-motion: reduce`, so harness runs there need this to exercise the animated pipeline. |
| `?es=1` | Starts with the Spanish label preview enabled (the lab is English-first; this exists to verify Spanish text expansion fits). |
| `?scene=arrival\|compare\|sharedbed` | Deep-links to one gallery scene and starts it on load — for owner review links and deterministic frame capture. |
| `&freeze=<ms>` | With `?scene=`, pauses and seeks every animation to that timestamp — a still of the scene at that exact moment, for screenshots. |

## Verification

Static + state-machine checks (Node, zero dependencies, writes nothing):

```
node prototypes/dreamfinder-motion-lab/tools/motion_lab_check.mjs
```

This suite is deliberately **not** wired into repository CI, following the
`prototypes/phase1-decision-package` precedent: prototype checks stay inside the
prototype's scope.

**What the automation establishes — precisely.** The checker provides a
*restricted product-language and quantity lint* (absence of enumerated
restricted patterns — it is not a proof of complete claims safety; copy review
stays human) and *allowlisted animated-property discipline* (a
performance-oriented allowlist — not a universal compositor guarantee;
clip-path, color changes and some SVG behavior may paint on iPad Safari). No
frame-rate or universal compositor claim is made anywhere: final performance
requires inspection on the actual showroom device.

## Asset provenance

| Prototype asset | Source | Status |
|---|---|---|
| `assets/giselle-plush-smooth.png` (920×433, 92,633 bytes, transparent) | `/Blake Dropbox/Customers/Lacks/Lacks Photography 2025/Mattress Only/Giselle Plush Smooth-01.png` (file_id `id:gLzry4ioE6AAAAAAAAApLg`, 16,131,294 bytes, 6000×4000 RGBA, modified 2026-02-23) | **Prototype-only derivative.** Brand-provided Lacks 2025 photography; exact model match for the `b1` Giselle Plush recommendation. Transformation: cropped to alpha bounding box +24 px, Lanczos-resized to 920 px, 255-color palette quantization, optimized PNG. Dropbox was read-only; nothing there was modified. Availability in Dropbox is **not** a final production-licensing determination — that clearance stays with the owner. |

## What this lab must never do

- No connection to production navigation, routes, or `index.html`.
- No mutation of anything under `data/`, `incoming/`, or `tools/`.
- No product **quantities** anywhere: no coil counts, no heights, no percentages,
  no degrees, no patent/ISO/EPA/antimicrobial/therapeutic language. The governing
  content rule is **materials and mechanism, never quantities** — see the claims
  section of the investigation doc.
- No revival of copy withdrawn by the Block A interim retirement (PR #22).
- Construction layer scenes render **schematic geometry** with a visible honesty
  chip. Materials named in "spec" mode come from manufacturer factory-build
  specifications whose retail mapping is STRONG but not SKU-confirmed; the chip
  says so on the surface itself, at rest, in both languages.
- No infinite ambient animation. Every animation is finite, interruptible, and
  explicitly replayable.

## Contents

```
index.html            Lab shell: guided demo path, scene gallery, experimental wing
motion-lab.css        Motion tokens + scene styles (frozen copies of production tokens)
scene-runner.js       Interruptible/replayable scene state machine (idle→running→done)
motion-lab.js         Scene implementations and wiring
selftest.js           In-page smoke harness (?selftest=1)
assets/               Prototype-only product imagery (provenance above)
tools/motion_lab_check.mjs   Node lint + state-machine checks (not in CI)
evidence/             Captured screenshots referenced by the investigation doc
```

Design tokens are **frozen copies** captured from `index.html` and
`data/store-config.json` at commit `c8e5a95`, so this prototype cannot drift when
production branding changes and never needs to read production data files.
