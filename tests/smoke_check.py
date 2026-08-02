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
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import financing_headline as fin_headline  # noqa: E402

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
    # Mexico is identified by its explicit presentation SCENARIO, never by plan
    # id or a boolean flag: a retailer may rename every plan id freely.
    mex = next((p for p in plans
                if p.get("presentationScenario") == "mexico-delivery"), None)
    check("mexico-delivery scenario plan present (identified semantically)", bool(mex))
    check("exactly one mexico-delivery scenario plan",
          sum(1 for p in plans if p.get("presentationScenario") == "mexico-delivery") == 1)
    check("retired separatePath flag is absent from every shipped plan",
          all("separatePath" not in p for p in plans))
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

    # Source-of-truth sync: the shipped financing envelope must equal the
    # canonical incoming source after EXACTLY the two transforms
    # build_lacks_workbook.py applies, and nothing else:
    #   1. publishedPaymentFactor is stripped (V1 ships no payment-math inputs);
    #   2. promotional headlines are GENERATED from apr/termMonths.
    # Both are reproduced here from the same code the builder runs, so this
    # stays a real deep equality — no field is deleted from both sides to make
    # it pass, and no subset comparison is substituted for it. Catches
    # stamp-then-forget-to-rebuild divergence: tools/reverify_financing.py
    # writes incoming/ only, so a stale data/store-config.json would
    # otherwise deploy silently.
    src_fin = json.loads(json.dumps(load_json("incoming/lacks_financing.json")["financing"]))
    for p in src_fin.get("plans", []):
        p.pop("publishedPaymentFactor", None)
    fin_headline.apply_to_financing(src_fin)
    check("shipped verifiedAt matches incoming source (rebuild after stamping)",
          fin.get("verifiedAt") == src_fin.get("verifiedAt"),
          f"shipped {fin.get('verifiedAt')!r} vs incoming {src_fin.get('verifiedAt')!r}")
    check("shipped financing envelope deep-equals incoming "
          "(factor-stripped + headlines generated)",
          fin == src_fin)

    # Generated promotional headlines. apr/termMonths are authoritative; the
    # customer-visible prose is derived from them by tools/financing_headline.py
    # at build time. Three distinct obligations, asserted separately so a
    # failure names which one broke.
    canon_plans = load_json("incoming/lacks_financing.json")["financing"]["plans"]
    promo_canon = [p for p in canon_plans
                   if fin_headline.is_promotional_presentation(p)]
    promo_ship = [p for p in plans if fin_headline.is_promotional_presentation(p)]
    check("2 promotional plans, identified semantically (kind + no scenario)",
          len(promo_canon) == 2 and len(promo_ship) == 2,
          f"canonical {len(promo_canon)}, shipped {len(promo_ship)}")
    check("canonical source authors NO promotional headline (build-input contract)",
          all("headline" not in p for p in promo_canon),
          str([p.get("id") for p in promo_canon if "headline" in p]))
    check("every shipped promotional headline equals the value generated from "
          "its own apr/termMonths",
          all(p.get("headline") == fin_headline.headline_for_plan(p)
              for p in promo_ship))
    # Byte-exact pin of the approved customer-visible output. Generation was a
    # provenance change, not a copy change: these two strings shipped before it
    # and must ship identically after.
    check("shipped promotional headlines are exactly the approved strings",
          [p.get("headline") for p in promo_ship] == [
              {"en": "9.99% APR for 72 months", "es": "9.99% APR por 72 meses"},
              {"en": "0% APR for 48 months", "es": "0% APR por 48 meses"}])
    # The other four headlines are deliberately AUTHORED orientation/scenario
    # language and must keep coming from the canonical source by hand.
    check("every non-promotional plan keeps an authored canonical headline",
          all("headline" in p for p in canon_plans
              if not fin_headline.is_promotional_presentation(p)))
    check("Mexico scenario headline stays authored, rate-free and unchanged "
          "(it carries apr/termMonths but is NOT generated)",
          (mex or {}).get("headline") == {
              "en": "Purchasing for delivery to Mexico?",
              "es": "¿Compras para entrega en México?"}
          and mex.get("apr") == 24 and mex.get("termMonths") == 24)

    # Operating state: exact rate/term claims are OFF until a named owner
    # accepts weekly re-verification + emergency takedown. false here is a
    # deliberate policy decision, not a symptom of stale evidence — the
    # verified facts above keep their full validation either way.
    check("canonical source carries exactPromotionsEnabled: false",
          src_fin.get("exactPromotionsEnabled") is False,
          repr(src_fin.get("exactPromotionsEnabled")))
    check("shipped config carries exactPromotionsEnabled: false",
          fin.get("exactPromotionsEnabled") is False,
          repr(fin.get("exactPromotionsEnabled")))
    check("policy field survives the pipeline as a real JSON boolean",
          isinstance(fin.get("exactPromotionsEnabled"), bool))
    check("runtime gate tests the policy with strict !== true",
          "f.exactPromotionsEnabled !== true" in html)
    check("exactly one runtime property read of the policy (no scattered copies)",
          html.count(".exactPromotionsEnabled") == 1)
    check("runtime never assigns or defaults the policy",
          not re.search(r"exactPromotionsEnabled\s*=[^=]", html))

    print("Quiz config invariants:")
    quiz = load_json("data/quiz.json")
    src_quiz = load_json("incoming/dreamfinder_quiz.json")["quiz"]
    questions = quiz.get("questions") or []
    check("12 quiz questions shipped", len(questions) == 12,
          f"got {len(questions)}")
    check("shipped quiz deep-equals incoming source (rebuild after editing)",
          quiz == src_quiz)
    pd = next((q for q in questions if q.get("id") == "partner_disturbance"), None)
    check("solo path intact: partner_disturbance skips on partner_sleep=solo",
          bool(pd) and pd.get("skipIf") == {"question": "partner_sleep",
                                            "answer": "solo"})
    check("no dynamicCopy leaked into shipped quiz (functions can't ship)",
          "dynamicCopy" not in json.dumps(quiz))
    # The app icon helper falls back to a default silently (s[name] || s.moon),
    # so a typo'd icon id in config would ship undetected without this.
    icons = {o.get("icon") for q in questions
             for o in (q.get("options") or []) if o.get("icon")}
    bad_icons = [i for i in sorted(icons)
                 if not re.search(r"\b" + re.escape(i) + r": '<svg", html)]
    check("every quiz option icon exists in the app icon map",
          not bad_icons, f"missing: {bad_icons}")
    check("QUESTIONS hydrated from data/quiz.json (no hardcoded literal)",
          "let QUESTIONS = [];" in html
          and "data/quiz.json" in html
          and "const QUESTIONS = [" not in html)
    check("quiz load failure fails hard (no-questions guard)",
          "quiz.json has no questions" in html)

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
    # The QR target is no longer a literal in the generator: it is read from
    # data/store-config.json financing.sourceUrl. The PAYLOAD of the committed
    # SVG is proven by tests/qr_payload_check.py, which decodes the image
    # itself; here we assert the config-driven contract and invoke the real
    # checker rather than re-implementing it.
    qr_gen = load_text("incoming/generate_financing_qr.py")
    check("QR generator carries no hardcoded financing target",
          "https://www.lacks.com/financing" not in qr_gen)
    check("QR generator reads financing.sourceUrl from the shipped config",
          'fin.get("sourceUrl")' in qr_gen and "store-config.json" in qr_gen)
    check("QR generator reuses the repository financing allowlist",
          "validation._is_allowed_source" in qr_gen)
    check("QR generator refuses the unverified Mexico application target",
          "mexicoApplicationUrl" in qr_gen and "_url_identity" in qr_gen)
    _qr = subprocess.run([sys.executable,
                          os.path.join(REPO, "incoming", "generate_financing_qr.py"),
                          "--check"], capture_output=True, text=True)
    check("committed QR encodes the shipped financing.sourceUrl (real --check)",
          _qr.returncode == 0, (_qr.stderr or _qr.stdout)[:120])
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
    check("financing sheet announces the stale swap (sr-only status region)",
          'id="financingSheetStatus" role="status"' in html)
    check("stale announcement is config-driven with staleNotice fallback",
          "FC('staleAnnouncement') || FC('staleNotice')" in html)
    check("no WG&R in index.html", not re.search(r"WG&R|WG&amp;R|wgrfurniture", html))
    check("no WG&R in Code.gs", not re.search(r"WG&R|WG&amp;R|wgrfurniture", gs))
    check("no hardcoded retailer name in index.html (white-label boundary)",
          "Lacks" not in html)
    check("publishedPaymentFactor stripped from shipped config",
          "publishedPaymentFactor" not in json.dumps(cfg))
    # The dead Mexico application URL is stored in config as documentation
    # (verified:false) and must stay structurally unreachable: no runtime code
    # reads the field or the URL, so no config edit alone can render it.
    check("dead Mexico application URL unreferenced by runtime code",
          "mexicoApplicationUrl" not in html and "mexican-credit-application" not in html)
    check("dead Mexico application URL absent from Code.gs",
          "mexicoApplicationUrl" not in gs and "mexican-credit-application" not in gs)
    check("financing links fail closed through the safe-link helper",
          "function setAllowedFinancingLink(" in html
          and "financingSourceAllowed(f.sourceUrl) ? f.sourceUrl : ''" in html)
    # Static financing anchors must ship INERT: no href attribute at all in
    # the initial DOM, so a config that never loads (or fails URL validation)
    # cannot leave a live or placeholder link. setAllowedFinancingLink()
    # installs a real href only after the URL passes. This inspects the actual
    # opening tags — an earlier version of this check only scanned JS
    # assignments and so passed while href="#" sat in the markup.
    for anchor_id in ("financingSheetLink", "hf2FinancingLink"):
        tag = re.search(r"<a\b[^>]*\bid=\"%s\"[^>]*>" % anchor_id, html)
        check(f"static anchor #{anchor_id} exists in the initial DOM", bool(tag))
        if tag:
            check(f"static anchor #{anchor_id} ships with NO href attribute",
                  not re.search(r"\bhref\s*=", tag.group(0)), tag.group(0)[:110])
            check(f"static anchor #{anchor_id} keeps target/rel hardening",
                  'target="_blank"' in tag.group(0)
                  and 'rel="noopener noreferrer"' in tag.group(0))
    # Separately: runtime code must never assign a '#' placeholder either.
    check("runtime code never assigns a '#' href to a financing anchor",
          not re.search(r"(financingSheetLink|hf2FinancingLink)[^\n]*\.href\s*=\s*[^\n]*'#'", html)
          and not re.search(r"\.href\s*=\s*[^;\n]*\|\|\s*'#'", html))
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
