#!/usr/bin/env python3
"""Lacks deployment smoke check — high-value static/runtime invariants.

Validates the committed bundle + source against the Lacks Payment Choice
contract. This complements (never replaces) browser testing: it checks what
grep/JSON inspection can prove, and nothing it cannot.

Run: python tests/smoke_check.py     (exit 0 = all pass)
"""
import io
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    status = "ok" if cond else "FAIL"
    if cond:
        passed += 1
    else:
        failed += 1
    print(f"  [{status}] {name}" + (f" — {detail}" if detail and not cond else ""))


def load_json(rel):
    with io.open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return json.load(f)


def load_text(rel):
    with io.open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return f.read()


def main():
    cfg = load_json("data/store-config.json")
    fin = cfg.get("financing") or {}
    html = load_text("index.html")
    gs = load_text("Code.gs")

    print("Config invariants:")
    check("financing block present and enabled", fin.get("enabled") is True)
    check("financing experience is payment-choice", fin.get("experience") == "payment-choice")
    check("savings pass disabled (discount.mode)", (cfg.get("discount") or {}).get("mode") == "disabled")
    check("savingsPassPolicy is specialist_confirm", fin.get("savingsPassPolicy") == "specialist_confirm")
    check("gasUrl is blank (no live sends)", not (cfg.get("gasUrl") or "").strip())
    plans = fin.get("plans") or []
    check("6 financing plans", len(plans) == 6, f"got {len(plans)}")
    check("V1: paymentCalculationEnabled false on every plan",
          all(p.get("paymentCalculationEnabled") is not True for p in plans))
    check("every plan bilingual headline",
          all((p.get("headline") or {}).get("en") and (p.get("headline") or {}).get("es") for p in plans))
    exact = [p for p in plans if any(p.get(k) is not None for k in ("apr", "termMonths", "minimumPurchase"))]
    check("every exact-terms plan has adjacent detail + disclosure EN/ES",
          all(all((p.get(f) or {}).get(lang) for f in ("detail", "disclosure") for lang in ("en", "es"))
              for p in exact))
    check("lease-to-own / credit-builder carry no credit terms",
          all(not any(p.get(k) is not None for k in ("apr", "termMonths", "minimumPurchase"))
              for p in plans if p.get("kind") in ("lease-to-own", "credit-builder")))
    mex = next((p for p in plans if p.get("id") == "mexico-in-house"), None)
    check("mexico plan present, marked separatePath", bool(mex) and mex.get("separatePath") is True)
    check("mexico dead application URL not used as plan/link sourceUrl",
          all("mexican-credit-application" not in str(p.get("sourceUrl") or "") for p in plans)
          and "mexican-credit-application" not in str(fin.get("mexicoInfoUrl") or ""))
    check("welcome outcome list promises Payment Choices, not Savings Pass",
          "Payment Choices" in ((cfg.get("voice") or {}).get("outcomeItems") or "")
          and "Savings Pass" not in ((cfg.get("voice") or {}).get("outcomeItems") or ""))
    check("ES outcome list updated too",
          "Opciones de Pago" in ((cfg.get("voice_es") or {}).get("outcomeItems") or ""))
    hosts = fin.get("allowedSourceHosts") or []
    check("financing source-host allowlist is narrow",
          hosts and all(h.endswith(("lacks.com", "synchrony.com", "mysynchrony.com")) for h in hosts))
    check("no 'no money down' claim anywhere in financing copy",
          "no money down" not in json.dumps(fin).lower())
    banned = ["everyone approved", "guaranteed approval", "regardless of credit", "no credit needed"]
    check("no banned approval-implication phrases in financing copy",
          not any(b in json.dumps(fin).lower() for b in banned))

    print("Catalog invariants:")
    mj = load_json("data/mattresses.json")
    tiers = {t: len(mj.get(t) or []) for t in ("gold", "silver", "bronze")}
    check("9/10/7 tier split intact", tiers == {"gold": 9, "silver": 10, "bronze": 7}, str(tiers))
    names = json.dumps(mj).lower()
    check("no Sealy / Stearns & Foster", "sealy" not in names and "stearns" not in names)
    acc = load_json("data/accessories.json")
    check("10 accessories with >=1 adjustable",
          len(acc) == 10 and any(a.get("subType") == "adjustable" for a in acc))

    print("Asset invariants:")
    check("financing QR committed", os.path.isfile(os.path.join(REPO, "images", "qr-financing.svg")))
    qr_gen = load_text("incoming/generate_financing_qr.py")
    check("QR targets Lacks' official financing page",
          'TARGET = "https://www.lacks.com/financing"' in qr_gen)
    missing_imgs = []
    for tier in ("gold", "silver", "bronze"):
        for m in mj.get(tier) or []:
            rel = (m.get("imageUrl") or "").split("?")[0]
            if rel and not os.path.isfile(os.path.join(REPO, rel.replace("/", os.sep))):
                missing_imgs.append(rel)
    check("all mattress images exist on disk", not missing_imgs, str(missing_imgs[:3]))

    print("Source invariants:")
    check("index.html references qr-financing.svg", "qr-financing.svg" in html)
    check("financing sheet is an aria-modal dialog",
          'id="financingSheet" role="dialog" aria-modal="true"' in html)
    check("no product-level payment math in index.html",
          not re.search(r"(price\s*/\s*(48|72))|from \$\d+/month|as low as", html, re.I))
    check("stale financing fails closed (warn + hide)", "exact terms hidden" in html)
    check("no WG&R in index.html", not re.search(r"WG&R|WG&amp;R|wgrfurniture", html))
    check("no WG&R in Code.gs", not re.search(r"WG&R|WG&amp;R|wgrfurniture", gs))
    check("no hardcoded retailer name in index.html (white-label boundary)",
          "Lacks" not in html)
    check("publishedPaymentFactor stripped from shipped config",
          "publishedPaymentFactor" not in json.dumps(cfg))
    check("hidden attribute always wins in CSS ([hidden] reset present)",
          "[hidden] { display: none !important; }" in html)

    print("Initial-DOM invariants (pre-config state — the state a slow or")
    print("failed store-config request leaves on screen):")
    # The static welcome markup IS the pre-config DOM; these checks would have
    # caught the retired-promotion flash defect.
    m_outcome = re.search(r'id="landingOutcomeItems">([^<]*)<', html)
    check("static outcome list is promotion-neutral",
          bool(m_outcome) and "Savings Pass" not in m_outcome.group(1)
          and "Payment Choice" not in m_outcome.group(1),
          m_outcome.group(1) if m_outcome else "id not found")
    check("promotion tease hidden by default in static HTML",
          'class="landing-discount-tease" hidden' in html)
    m_label = re.search(r'id="landingDiscountLabel">([^<]*)<', html)
    m_hint = re.search(r'id="landingDiscountHint">([^<]*)<', html)
    check("static tease label and hint are empty",
          bool(m_label) and not m_label.group(1).strip()
          and bool(m_hint) and not m_hint.group(1).strip())
    check("dreamCodeBox hidden by default in static HTML",
          'id="dreamCodeBox" hidden' in html)
    check("JS outcome fallback is promotion-neutral",
          "Sleep System Picks · Savings Pass'" not in html
          and "Pase de ahorro'" not in html)
    check("no Savings Pass promise in static email subhead",
          'id="emailSubhead">Keep your mattress matches and Sleep System picks together' in html)
    check("runtime future-verifiedAt rejection present (clock-skew gate)",
          "FINANCING_CLOCK_SKEW_MS" in html and "is in the future" in html)
    check("Code.gs hard-blocks send until CAN-SPAM approved",
          "RETAILER_APPROVAL_REQUIRED" in gs and "canspam_not_configured" in gs)
    check("Code.gs invents no retailer contact values",
          "unsubscribe@" not in gs and "privacy@" not in gs and "PO Box" not in gs)
    check("financing analytics events wired",
          all(e in html for e in ["finance_module_impression", "finance_details_open",
                                  "official_financing_link_click", "financing_followup_requested",
                                  "financing_interest_changed", "mexico_financing_details_open"]))
    check("no PII in financing analytics payload builder",
          "finEventBase" in html and not re.search(r"finEventBase[^}]*email", html))
    ah = load_text("data/allowed-hosts.js")
    check("allowed-hosts still includes beford782.github.io", "beford782.github.io" in ah)

    print(f"\nSmoke check: {passed} passed, {failed} failed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
