#!/usr/bin/env python3
"""Suite preflight check: the mirror refuses an unprovisioned interpreter BEFORE any suite runs.

WHY THIS EXISTS (2026-09-06 review finding). A Python whose packages all import
but for which Playwright never installed Chromium used to be accepted by
tools/run_full_suite.ps1, and the ONE rendered check then failed after every
static suite had passed. The preflight (tools/suite_python_preflight.py) now
gates admission; this suite proves the gate is real, in both the explicit
`-Python` path and the auto-selected path, and that the refusal happens before
the runner reaches its check list.

WHAT IT PROVES:
  1. The preflight accepts THIS interpreter (exit 0) and reports the versions
     and the launched Chromium - the same admission the runner performs.
  2. "Modules import but browser absent": with PLAYWRIGHT_BROWSERS_PATH pointed
     at an EMPTY directory (every package still imports; no browser exists
     there) the preflight exits 2, names the browser gap, and prints the exact
     `"<this interpreter>" -m playwright install chromium` command.
  3. Requirements logic, against a throwaway file: a missing distribution and
     a wrong installed version are reported with the exact pip command; a pin
     whose marker does not apply is ignored; a marker the evaluator does not
     understand is a probe error (exit 3), never a silent OK.
  4. RUNNER, explicit -Python: `run_full_suite.ps1 -ListOnly -Python <this
     interpreter>` under the empty browsers path exits non-zero, relays that
     interpreter's exact remediation command, and never reaches the check list
     (no list header, no `==>` banner): the refusal precedes every suite.
  5. RUNNER, auto-selected: the same without -Python. No candidate on the
     machine can pass with the browsers path empty; the failure lists what was
     tried with each interpreter's own fix, and again nothing runs.
  6. RUNNER, provisioned: `-ListOnly -Python <this interpreter>` with the real
     browsers path exits 0 and names the accepted interpreter.
  7. THE VERIFIED RANGE CANNOT WIDEN SILENTLY. The preflight's floor and
     ceiling are pinned here (3.12 through 3.14); its range function refuses
     3.11 and 3.15/4.0 with the precise remedy and admits 3.12, 3.13, 3.14;
     the requirements markers resolve Pillow to exactly one pin on each
     supported minor and to NO pin on 3.15 (closed at 3.14, not open-ended);
     and every guide that states the range states these same two numbers.
     Moving either end therefore fails here until the suite, the markers and
     the guides move together.
  8. "Correctly versioned but does not import": a shadow `openpyxl` package
     whose __init__ raises is put first on PYTHONPATH, so the distribution
     metadata still reports the pinned version while the import fails. The
     preflight must exit 2 with a GAP naming the module and the exception
     (discoverability is not importability), and the runner's -ListOnly path
     must refuse that interpreter, in the -Python and the auto-selected path,
     before its check list - the shadow is a real ImportError and the
     PYTHONPATH reaches the preflight the runner spawns.
  9. The mutation-sweep find strings that target the preflight, the runner,
     the requirements file and README each match exactly once, so the sweep
     entries cannot go stale silently.

HOW. Subprocesses only: the preflight directly, and the runner through pwsh
or powershell (the Codex-bundled pwsh is accepted, as the runner accepts it).
`-ListOnly` is used for every runner invocation so a refusal that failed to
happen cannot start the eight-minute suite from inside a test. The empty
browsers directory and the throwaway requirements file live under the system
temp directory; no repository file is written.

Run: python tests/suite_preflight_check.py
"""

import importlib.util
import os
import re
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PREFLIGHT = os.path.join(REPO, "tools", "suite_python_preflight.py")
RUNNER = os.path.join(REPO, "tools", "run_full_suite.ps1")
INTERPRETER = sys.executable
PIP_FIX = f'FIX "{INTERPRETER}" -m pip install -r '
BROWSER_FIX = f'FIX "{INTERPRETER}" -m playwright install chromium'

passed = 0
failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f"\n         {detail}" if detail else ""))


def run(cmd, env=None, timeout=300):
    proc = subprocess.run(cmd, cwd=REPO, env=env, capture_output=True, text=True,
                          errors="replace", timeout=timeout)
    return proc.returncode, (proc.stdout or "") + (proc.stderr or "")


def excerpt(text, limit=1200):
    return text.strip()[-limit:]


def powershell():
    for name in ("pwsh", "powershell"):
        found = shutil.which(name)
        if found:
            return found
    home = os.environ.get("USERPROFILE") or os.path.expanduser("~")
    bundled = os.path.join(home, ".cache", "codex-runtimes", "codex-primary-runtime",
                           "dependencies", "native", "powershell", "pwsh.exe")
    return bundled if os.path.isfile(bundled) else None


def _norm(path):
    return os.path.normcase(os.path.normpath(path))


def mentions_interpreter(text):
    return _norm(INTERPRETER) in _norm(text)


def runner_cmd(ps, *extra):
    return [ps, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
            "-File", RUNNER, "-ListOnly", *extra]


def never_reached_the_suites(text):
    return ("DreamFinder local full suite" not in text) and ("==>" not in text)


with tempfile.TemporaryDirectory(prefix="df-preflight-") as scratch:
    empty_browsers = os.path.join(scratch, "no-browsers")
    os.makedirs(empty_browsers)
    browserless = dict(os.environ)
    browserless["PLAYWRIGHT_BROWSERS_PATH"] = empty_browsers

    # ---- 1. this interpreter is provisioned -----------------------------------
    code, out = run([INTERPRETER, PREFLIGHT])
    check("preflight accepts this interpreter (exit 0)", code == 0, excerpt(out))
    check("preflight reports the interpreter path", mentions_interpreter(out), excerpt(out))
    check("preflight reports every pinned distribution",
          all(name in out for name in ("openpyxl", "Pillow", "qrcode", "playwright")), excerpt(out))
    check("preflight reports a launched Chromium", "Chromium" in out and "launched headless" in out, excerpt(out))
    check("a provisioned interpreter gets no GAP and no FIX line",
          "\nGAP " not in out and "\nFIX " not in out, excerpt(out))

    # ---- 2. modules import but the browser is absent --------------------------
    code, out = run([INTERPRETER, PREFLIGHT], env=browserless)
    check("browser absent: preflight exits 2", code == 2, excerpt(out))
    check("browser absent: the packages still report their versions (the gap is not an import failure)",
          "playwright 1." in out and "openpyxl" in out, excerpt(out))
    check("browser absent: the gap names Playwright's Chromium",
          "GAP Playwright's Chromium is not installed" in out, excerpt(out))
    check("browser absent: the gap carries Playwright's own first line (missing executable)",
          "Executable doesn't exist" in out, excerpt(out))
    check("browser absent: the exact remediation command for THIS interpreter is printed",
          BROWSER_FIX in out, excerpt(out))
    check("browser absent: no pip command is suggested (nothing is missing from pip)",
          PIP_FIX not in out, excerpt(out))

    # ---- 3. requirements logic on a throwaway file ----------------------------
    fake = os.path.join(scratch, "requirements-fake.txt")
    with open(fake, "w", encoding="utf-8") as fh:
        fh.write("# throwaway\n"
                 "openpyxl==3.1.5\n"
                 "dreamfinder-no-such-distribution==1.0\n"
                 "Pillow==0.0.1; python_version >= \"3.0\"\n"
                 "dreamfinder-marker-skipped==1.0; python_version < \"3.0\"\n"
                 "-r requirements-fake-nested.txt\n")
    with open(os.path.join(scratch, "requirements-fake-nested.txt"), "w", encoding="utf-8") as fh:
        fh.write("qrcode==8.2\n")
    code, out = run([INTERPRETER, PREFLIGHT, "--requirements", fake, "--no-browser"])
    check("fake file: exits 2", code == 2, excerpt(out))
    check("fake file: a missing distribution is a GAP",
          "GAP dreamfinder-no-such-distribution is not installed (pinned dreamfinder-no-such-distribution==1.0)" in out,
          excerpt(out))
    check("fake file: a wrong installed version is a GAP naming both versions",
          re.search(r"GAP Pillow \S+ is installed; the suite pins Pillow==0\.0\.1 for Python 3\.\d+", out) is not None,
          excerpt(out))
    check("fake file: a pin whose marker does not apply is ignored",
          "dreamfinder-marker-skipped" not in out, excerpt(out))
    check("fake file: a nested -r file is followed (qrcode reported)", "qrcode 8.2" in out, excerpt(out))
    check("fake file: the exact pip command for THIS interpreter and THIS file is printed",
          PIP_FIX + os.path.abspath(fake) in out, excerpt(out))
    check("fake file: --no-browser is stated, not silently passed",
          "Chromium: launch skipped (--no-browser)" in out, excerpt(out))

    unsupported = os.path.join(scratch, "requirements-unsupported.txt")
    with open(unsupported, "w", encoding="utf-8") as fh:
        fh.write("openpyxl==3.1.5; sys_platform == \"win32\"\n")
    code, out = run([INTERPRETER, PREFLIGHT, "--requirements", unsupported, "--no-browser"])
    check("an unsupported marker is a probe error (exit 3), never a silent OK",
          code == 3 and "PROBE-ERROR unsupported environment marker" in out, excerpt(out))

    loose = os.path.join(scratch, "requirements-loose.txt")
    with open(loose, "w", encoding="utf-8") as fh:
        fh.write("openpyxl>=3\n")
    code, out = run([INTERPRETER, PREFLIGHT, "--requirements", loose, "--no-browser"])
    check("a non-exact pin is a probe error (exit 3): the mirror is pinned or it is nothing",
          code == 3 and "not an exact" in out, excerpt(out))

    # ---- 4-6. the runner ------------------------------------------------------
    ps = powershell()
    check("a PowerShell (pwsh, powershell, or the Codex-bundled pwsh) is available to drive the runner",
          ps is not None, "the runner cannot be exercised without one; CI proves pwsh, Windows ships powershell")
    if ps:
        code, out = run(runner_cmd(ps, "-Python", INTERPRETER), env=browserless)
        check("runner, explicit -Python, browser absent: exits non-zero", code != 0, excerpt(out))
        check("runner, explicit -Python, browser absent: says nothing was run and names the interpreter",
              "nothing was run" in out and mentions_interpreter(out), excerpt(out))
        check("runner, explicit -Python, browser absent: relays the browser gap",
              "GAP Playwright's Chromium is not installed" in out, excerpt(out))
        check("runner, explicit -Python, browser absent: relays the exact remediation command",
              BROWSER_FIX in out, excerpt(out))
        check("runner, explicit -Python, browser absent: refused before the check list (no header, no ==> banner)",
              never_reached_the_suites(out), excerpt(out))

        code, out = run(runner_cmd(ps), env=browserless)
        check("runner, auto-selected, browser absent: exits non-zero", code != 0, excerpt(out))
        check("runner, auto-selected, browser absent: reports that no interpreter is provisioned and lists what was tried",
              "No Python on this machine is provisioned" in out and "Tried:" in out, excerpt(out))
        check("runner, auto-selected, browser absent: every listed interpreter carries a FIX command",
              "-m playwright install chromium" in out, excerpt(out))
        check("runner, auto-selected, browser absent: refused before the check list",
              never_reached_the_suites(out), excerpt(out))

        code, out = run(runner_cmd(ps, "-Python", INTERPRETER))
        check("runner, provisioned: -ListOnly exits 0", code == 0, excerpt(out))
        check("runner, provisioned: names the accepted interpreter",
              "Python:" in out and mentions_interpreter(out), excerpt(out))
        check("runner, provisioned: lists this suite among its checks", "suite preflight" in out, excerpt(out))

    # ---- 8. correctly versioned, discoverable, but raises on import ------------
    shadow_root = os.path.join(scratch, "shadow-site")
    os.makedirs(os.path.join(shadow_root, "openpyxl"))
    with open(os.path.join(shadow_root, "openpyxl", "__init__.py"), "w", encoding="utf-8") as fh:
        fh.write("raise ImportError('shadowed openpyxl: this module must not import')\n")
    shadowed = dict(os.environ)
    shadowed["PYTHONPATH"] = shadow_root + (os.pathsep + os.environ["PYTHONPATH"] if os.environ.get("PYTHONPATH") else "")
    SHADOW_GAP = "GAP openpyxl 3.1.5 is installed but `import openpyxl` raises ImportError: shadowed openpyxl"

    code, out = run([INTERPRETER, "-c", "import importlib.metadata as md, importlib.util; "
                     "print(md.version('openpyxl'), importlib.util.find_spec('openpyxl') is not None)"], env=shadowed)
    check("shadow control: the metadata still reports 3.1.5 and find_spec still locates a module",
          code == 0 and out.split() == ["3.1.5", "True"], excerpt(out))

    code, out = run([INTERPRETER, PREFLIGHT, "--no-browser"], env=shadowed)
    check("shadowed openpyxl: preflight exits 2", code == 2, excerpt(out))
    check("shadowed openpyxl: the GAP names the module and the exception (import, not discovery)",
          SHADOW_GAP in out, excerpt(out))
    check("shadowed openpyxl: the pip command for THIS interpreter is printed", PIP_FIX in out, excerpt(out))
    check("shadowed openpyxl: the other pinned distributions still report (the gap is isolated)",
          "Pillow" in out and "qrcode 8.2" in out and "playwright 1." in out, excerpt(out))

    if ps:
        code, out = run(runner_cmd(ps, "-Python", INTERPRETER), env=shadowed)
        check("runner, explicit -Python, shadowed openpyxl: exits non-zero", code != 0, excerpt(out))
        check("runner, explicit -Python, shadowed openpyxl: relays the import GAP", SHADOW_GAP in out, excerpt(out))
        check("runner, explicit -Python, shadowed openpyxl: refused before the check list",
              never_reached_the_suites(out) and "nothing was run" in out, excerpt(out))
        code, out = run(runner_cmd(ps), env=shadowed)
        check("runner, auto-selected, shadowed openpyxl: exits non-zero and nothing runs",
              code != 0 and never_reached_the_suites(out), excerpt(out))
        check("runner, auto-selected, shadowed openpyxl: the import GAP appears under a tried interpreter",
              "Tried:" in out and SHADOW_GAP in out, excerpt(out))

# ---- 7. the verified range cannot widen silently ------------------------------
VERIFIED_FLOOR = (3, 12)
VERIFIED_CEILING = (3, 14)
RANGE_PHRASE = "3.12 through 3.14"

spec = importlib.util.spec_from_file_location("suite_python_preflight", PREFLIGHT)
preflight = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preflight)

check("the preflight's floor is 3.12 (CI's interpreter)", preflight.PYTHON_FLOOR == VERIFIED_FLOOR,
      f"PYTHON_FLOOR={preflight.PYTHON_FLOOR}")
check("the preflight's ceiling is 3.14 (the newest verified Python); raising it is a deliberate change here too",
      preflight.PYTHON_CEILING == VERIFIED_CEILING, f"PYTHON_CEILING={preflight.PYTHON_CEILING}")
for version in ((3, 12, 0), (3, 13, 7), (3, 14, 2)):
    check(f"Python {'.'.join(map(str, version))} is inside the verified range",
          preflight.python_range_gap(version) is None, str(preflight.python_range_gap(version)))
older = preflight.python_range_gap((3, 11, 9))
check("Python 3.11 is refused as older than the range, with the -Python remedy",
      older is not None and "older than the verified range 3.12-3.14" in older and "-Python <path>" in older, str(older))
for version in ((3, 15, 0), (4, 0, 0)):
    newer = preflight.python_range_gap(version)
    check(f"Python {'.'.join(map(str, version))} is refused as newer than the range, with the precise remedy",
          newer is not None
          and "newer than the verified range 3.12-3.14" in newer
          and "no pin in tools/requirements-suite.txt is verified for it" in newer
          and "-Python <path>" in newer
          and "raise PYTHON_CEILING in tools/suite_python_preflight.py" in newer,
          str(newer))

REQUIREMENTS = os.path.join(REPO, "tools", "requirements-suite.txt")
EXPECTED_PILLOW = {(3, 12): "11.0.0", (3, 13): "11.0.0", (3, 14): "12.1.1"}
for minor, expected in EXPECTED_PILLOW.items():
    pins = preflight.read_pins(REQUIREMENTS, minor)
    pillow = [v for d, v in pins if d.lower() == "pillow"]
    names = sorted(d.lower() for d, _ in pins)
    check(f"Python {'.'.join(map(str, minor))}: the markers resolve Pillow to exactly one pin, {expected}",
          pillow == [expected], f"pillow pins={pillow}")
    check(f"Python {'.'.join(map(str, minor))}: all four distributions are pinned exactly once",
          names == ["openpyxl", "pillow", "playwright", "qrcode"], f"pins={names}")
beyond = [v for d, v in preflight.read_pins(REQUIREMENTS, (3, 15)) if d.lower() == "pillow"]
check("Python 3.15: the markers resolve NO Pillow pin (the range is closed at 3.14, not open-ended)",
      beyond == [], f"pillow pins={beyond}")

for guide in ("AGENTS.md", "README.md", "CLAUDE.md", "tools/requirements-suite.txt"):
    with open(os.path.join(REPO, guide), encoding="utf-8") as fh:
        text = fh.read()
    check(f"{guide} states the verified range as '{RANGE_PHRASE}'", RANGE_PHRASE in text)
    check(f"{guide} does not present 3.15 as supported",
          re.search(r"3\.1[5-9]\s*(is|are)\s+supported", text) is None and "through 3.15" not in text)

# ---- 9. the sweep's find strings match exactly once ---------------------------
SWEEP_FINDS = [
    ("tools/suite_python_preflight.py", "        return None, browser_gap_text(exc)"),
    ("tools/suite_python_preflight.py", '        return f"{dist} is not installed (pinned {dist}=={pinned})"'),
    ("tools/suite_python_preflight.py", "        importlib.import_module(module)"),
    ("tools/suite_python_preflight.py", "    if v > PYTHON_CEILING:"),
    ("tools/run_full_suite.ps1", "    if ($code -eq 0) {\n        return @{ Ok = $true; Lines = $lines }\n    }"),
    ("tools/requirements-suite.txt", 'Pillow==12.1.1; python_version == "3.14"'),
    ("README.md", "It needs a Python 3.12 through 3.14"),
]
for target, find in SWEEP_FINDS:
    with open(os.path.join(REPO, target), encoding="utf-8") as fh:
        text = fh.read().replace("\r\n", "\n")
    n = text.count(find)
    check(f"{target}: sweep find string matches exactly once ({find.strip()[:44]!r}...)", n == 1, f"count={n}")

print(f"\nSuite preflight check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
