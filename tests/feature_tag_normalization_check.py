# A4.2 corrective pass — the feature-tag normalization contract, executed on BOTH sides.
#
# THE DEFECT THIS SUITE EXISTS FOR. A4.2 added a reachability gate: every quiz
# scoring key must be a catalog feature or a declared dormant key. It compared
# the RAW CSV spellings to the quiz's camelCase keys — but build-data.ps1
# deliberately normalizes kebab-case to camelCase, so a source vocabulary the
# GENERATOR accepts (`pressure-relief`, `motion-isolation`) was reported
# unreachable by the VALIDATOR. Two implementations of one contract, only one of
# them tested, is how that happened.
#
# WHAT THIS SUITE DOES. tests/fixtures/feature_tag_normalization_cases.json is
# the single case table. Every case is executed against:
#   * tools/validation.py normalize_feature_tag()  — the Python validator path;
#   * build-data.ps1 Convert-FeatureTag            — the PowerShell generator
#     path, extracted from the shipped script and run in a real PowerShell, so
#     it is the same bytes the build executes.
# Disagreement between them fails, whichever side is wrong. The table also
# carries the validator's contract cases, executed against the real
# validate_quiz() with the shipped quiz. The contract runs ONE WAY: an unknown
# quiz scoring key (no catalog match, no dormancy declaration) is rejected,
# while an extra catalog feature that no quiz rule references is allowed and
# ignored by scoring - it awards nothing, so it cannot mis-rank anything.
#
#   python tests/feature_tag_normalization_check.py

import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))
import validation  # noqa: E402

CASES_PATH = os.path.join(ROOT, "tests", "fixtures", "feature_tag_normalization_cases.json")
BUILD_PS1 = os.path.join(ROOT, "build-data.ps1")
QUIZ_PATH = os.path.join(ROOT, "data", "quiz.json")

passed = 0
failed = 0


def check(label, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok] {label}")
    else:
        failed += 1
        print(f"  [FAIL] {label}" + (f" - {detail}" if detail else ""))
    return cond


def section(name):
    print(f"\n-- {name} --")


CASES = json.load(io.open(CASES_PATH, encoding="utf-8"))
cases = CASES["cases"]

section("the case table")
check("the shared case table loads and is non-trivial", len(cases) >= 15, f"{len(cases)} cases")
inputs = [c["input"] for c in cases]
for required in ("pressureRelief", "pressure-relief", "PRESSURE-Relief",
                 "motionIsolation", "motion-isolation", "unknownTag"):
    check(f"the table covers {required!r}", required in inputs)
check("the table covers whitespace around a tag",
      any(c["input"] != c["input"].strip() for c in cases))
check("the table covers malformed / empty segments",
      any("--" in c["input"] or c["input"].endswith("-") or c["input"].startswith("-") for c in cases))
check("the table covers an empty and a whitespace-only tag",
      "" in inputs and any(c["input"].strip() == "" and c["input"] != "" for c in cases))

section("the Python validator path (tools/validation.py normalize_feature_tag)")
py_out = {}
for c in cases:
    got = validation.normalize_feature_tag(c["input"])
    py_out[c["input"]] = got
    check(f"{c['input']!r} -> {c['expected']!r}", got == c["expected"], f"got {got!r} ({c['note']})")
check("normalization is idempotent (no output contains a hyphen)",
      all("-" not in v for v in py_out.values()),
      ", ".join(f"{k!r}->{v!r}" for k, v in py_out.items() if "-" in v))
check("normalizing an already-normalized tag is a no-op",
      all(validation.normalize_feature_tag(v) == v for v in py_out.values()))
check("None is tolerated (defensive, same as an empty tag)",
      validation.normalize_feature_tag(None) == "")

section("the PowerShell generator path (build-data.ps1 Convert-FeatureTag)")
src = io.open(BUILD_PS1, encoding="utf-8").read().replace("\r\n", "\n")
start = src.find("function Convert-FeatureTag {")
check("Convert-FeatureTag is defined in build-data.ps1", start != -1)
end = src.find("\n}\n", start)
func_src = src[start:end + 3] if start != -1 and end != -1 else ""
check("the function body was extracted", func_src.strip().endswith("}"))
check("the shipped pipeline CALLS it (one implementation, not a copy)",
      "Convert-FeatureTag $_" in src)

ps_out = {}
if func_src:
    payload = json.dumps(inputs)
    script = (
        func_src
        + "\n$inputs = ConvertFrom-Json -InputObject @'\n" + payload + "\n'@\n"
        + "$out = @()\n"
        + "foreach ($i in $inputs) { $out += ,(Convert-FeatureTag $i) }\n"
        + "ConvertTo-Json -InputObject $out -Compress\n"
    )
    exe = "powershell.exe"
    proc = subprocess.run([exe, "-NoProfile", "-NonInteractive", "-Command", script],
                          capture_output=True, text=True)
    check("the extracted function executed in PowerShell", proc.returncode == 0,
          (proc.stderr or "")[:200])
    if proc.returncode == 0:
        try:
            values = json.loads(proc.stdout.strip() or "[]")
        except json.JSONDecodeError:
            values = None
            check("PowerShell returned parseable JSON", False, proc.stdout[:200])
        if values is not None:
            check("PowerShell returned one result per case", len(values) == len(inputs),
                  f"{len(values)} vs {len(inputs)}")
            for c, got in zip(cases, values):
                got = "" if got is None else got
                ps_out[c["input"]] = got
                check(f"PS {c['input']!r} -> {c['expected']!r}", got == c["expected"],
                      f"got {got!r}")

section("the two implementations agree")
if ps_out:
    disagreements = [f"{k!r}: py={py_out[k]!r} ps={ps_out[k]!r}"
                     for k in py_out if k in ps_out and py_out[k] != ps_out[k]]
    check("every case normalizes identically in Python and in PowerShell",
          not disagreements, "; ".join(disagreements[:4]))
else:
    check("the PowerShell path produced results to compare", False)

section("the validator's reachability contract (real validate_quiz, shipped quiz)")
quiz = json.load(io.open(QUIZ_PATH, encoding="utf-8"))
CONTRACT = CASES["validator_contract_cases"]
BASE = list(CONTRACT["unknown_tag"]["catalog_features"])

r = validation.validate_quiz(quiz, catalog_features=BASE)
check("an extra catalog tag no option awards is NOT an error (the contract runs quiz -> catalog)",
      r.ok, "; ".join(r.errors[:2]))

kebab = [t.replace("pressureRelief", "pressure-relief").replace("motionIsolation", "motion-isolation")
         for t in BASE]
r = validation.validate_quiz(quiz, catalog_features=kebab)
check("A KEBAB-CASE SOURCE VOCABULARY IS ACCEPTED — the generator and the validator "
      "now accept the same input (this is the defect this pass repaired)",
      r.ok, "; ".join(r.errors[:2]))

messy = ["  PRESSURE-Relief ", " motion-isolation", "cooling ", "  ", ""] + [
    t for t in BASE if t not in ("pressureRelief", "motionIsolation", "cooling")]
r = validation.validate_quiz(quiz, catalog_features=messy)
check("whitespace and mixed case in the source vocabulary are accepted too",
      r.ok, "; ".join(r.errors[:2]))

dropped = [t for t in BASE if t != CONTRACT["unreachable_quiz_key"]["drop_from_catalog"]]
r = validation.validate_quiz(quiz, catalog_features=dropped)
check("a genuinely unreachable quiz key is still an error",
      (not r.ok) and any("pressureRelief" in e for e in r.errors),
      "; ".join(r.errors[:2]))

added = BASE + [CONTRACT["dormant_becoming_reachable"]["add_to_catalog"]]
r = validation.validate_quiz(quiz, catalog_features=added)
check("a declared-dormant key the catalog starts carrying is still an error",
      (not r.ok) and any("memory" in e for e in r.errors),
      "; ".join(r.errors[:2]))

r = validation.validate_quiz(quiz, catalog_features=BASE + ["sparkle-factor"])
check("an unknown EXTRA tag normalizes and is ignored (it awards nothing, so it is not the quiz's problem)",
      r.ok, "; ".join(r.errors[:2]))

section("the shipped catalog still satisfies the contract")
mattresses = json.load(io.open(os.path.join(ROOT, "data", "mattresses.json"), encoding="utf-8"))
shipped = sorted({f for tier in ("gold", "silver", "bronze") for m in mattresses[tier]
                  for f in (m.get("features") or [])})
check("every shipped feature tag is already normalized (the generator's own output)",
      all(validation.normalize_feature_tag(t) == t for t in shipped),
      ", ".join(t for t in shipped if validation.normalize_feature_tag(t) != t))
r = validation.validate_quiz(quiz, catalog_features=shipped)
check("the shipped catalog + shipped quiz validate clean", r.ok, "; ".join(r.errors[:2]))

print(f"\nFeature tag normalization check: {passed} passed, {failed} failed")
sys.exit(0 if failed == 0 else 1)
