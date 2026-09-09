#!/usr/bin/env python3
"""Suite Python preflight: is THIS interpreter provisioned for the local CI mirror?

WHY THIS EXISTS (2026-09-06 review finding). tools/run_full_suite.ps1 used to
accept the first `python` on PATH and discover minutes later that it lacked a
package - or, worse, that the `playwright` package imported while no Chromium
had ever been installed for it, so the ONE rendered check failed after every
static suite had passed. This script is the runner's admission test: the runner
executes it against each candidate interpreter BEFORE any suite and accepts an
interpreter only when it exits 0.

WHAT IT PROVES, for the interpreter running it:
  * the Python is inside the VERIFIED RANGE, 3.12 (CI's interpreter,
    actions/setup-python) through 3.14 (the newest Python the pins were
    verified on, 2026-09-06). Older AND newer interpreters are refused before
    any suite: no pin is verified for Python 3.15+, so the range is closed at
    both ends and widening it is a deliberate change here, in
    tools/requirements-suite.txt and in the guides, in one commit;
  * every distribution tools/requirements-suite.txt resolves to for this Python
    (environment markers evaluated as pip evaluates `python_version`) is
    installed at exactly the pinned version and ACTUALLY IMPORTS: the module is
    imported here, not merely located (a module that is discoverable but
    raises on import - a broken install, a shadowing package - is a GAP);
  * Playwright's Chromium is installed for this interpreter. A headless browser
    is actually LAUNCHED and closed: the package resolving an executable path
    is not the same as the browser being present (a headless launch uses
    chromium_headless_shell, a separate download), so only a launch counts.

OUTPUT (stdout only; the runner reads it line by line):
  Python <version> at <interpreter>
  openpyxl <v> | Pillow <v> | qrcode <v> | playwright <v>
  Chromium <version> launched headless; Playwright chromium executable: <path>
  GAP <one line per missing or wrong thing>
  FIX "<interpreter>" -m pip install -r <requirements file>     (only the
  FIX "<interpreter>" -m playwright install chromium             commands needed)
Exit 0 = provisioned. 2 = gaps, each listed with its FIX. 3 = the probe itself
could not run (unreadable requirements file, a marker it does not evaluate).

Run: python tools/suite_python_preflight.py
     python tools/suite_python_preflight.py --requirements <file> [--no-browser]
     (--no-browser skips the Chromium launch; the test suite uses it to probe
     the requirements logic alone. The runner never passes it.)
"""

import argparse
import importlib
import importlib.metadata as md
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_REQUIREMENTS = os.path.join(HERE, "requirements-suite.txt")
# The verified range, inclusive at both ends (major.minor). The floor is CI's
# interpreter; the ceiling is the newest Python the pins in
# tools/requirements-suite.txt were verified on. tests/suite_preflight_check.py
# pins both values and the range statement in the guides, so neither end can
# move without that suite, the requirements markers and the guides moving too.
PYTHON_FLOOR = (3, 12)
PYTHON_CEILING = (3, 14)
# Distribution name -> import name where they differ.
IMPORT_NAMES = {"pillow": "PIL"}

_MARKER = re.compile(r"""\s*python_version\s*(<=|>=|==|!=|<|>)\s*["']([0-9]+(?:\.[0-9]+)*)["']\s*""")
_PIN = re.compile(r"([A-Za-z0-9][A-Za-z0-9._-]*)\s*==\s*([A-Za-z0-9.+!-]+)")
_OPS = {
    "<": lambda a, b: a < b,
    "<=": lambda a, b: a <= b,
    ">": lambda a, b: a > b,
    ">=": lambda a, b: a >= b,
    "==": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
}


def dotted(version):
    return ".".join(str(n) for n in version)


def python_range_gap(version_info):
    """None when major.minor lies inside [PYTHON_FLOOR, PYTHON_CEILING]; otherwise the gap text."""
    v = tuple(version_info[:2])
    shown = dotted(version_info[:3])
    lo, hi = dotted(PYTHON_FLOOR), dotted(PYTHON_CEILING)
    if v < PYTHON_FLOOR:
        return (f"Python {shown} is older than the verified range {lo}-{hi} ({lo} is CI's interpreter). "
                f"Use a Python {lo}-{hi} and pass it with -Python <path>.")
    if v > PYTHON_CEILING:
        return (f"Python {shown} is newer than the verified range {lo}-{hi}: no pin in "
                f"tools/requirements-suite.txt is verified for it. Use a Python {lo}-{hi} and pass it "
                f"with -Python <path>; to support {dotted(v)}, pin and verify its requirements in that "
                f"file and raise PYTHON_CEILING in tools/suite_python_preflight.py in the same change.")
    return None


def version_tuple(text):
    """'8.2.0' -> (8, 2); None when a segment is not numeric (compared as text then)."""
    parts = []
    for piece in text.strip().split("."):
        if not piece.isdigit():
            return None
        parts.append(int(piece))
    while len(parts) > 1 and parts[-1] == 0:
        parts.pop()
    return tuple(parts)


def same_version(installed, pinned):
    a, b = version_tuple(installed), version_tuple(pinned)
    if a is None or b is None:
        return installed.strip().lower() == pinned.strip().lower()
    return a == b


def marker_applies(marker, python_version):
    """Evaluate `python_version <op> "X.Y"` exactly; refuse anything else loudly."""
    m = _MARKER.fullmatch(marker)
    if not m:
        raise ValueError(f"unsupported environment marker {marker.strip()!r} "
                         "(this preflight evaluates python_version comparisons only)")
    return _OPS[m.group(1)](python_version, version_tuple(m.group(2)))


def read_pins(path, python_version, _seen=None):
    """Return [(distribution, pinned_version)] that apply to this Python, following -r."""
    seen = _seen if _seen is not None else set()
    path = os.path.abspath(path)
    if path in seen:
        raise ValueError(f"{path}: requirements files include each other")
    seen.add(path)
    pins = []
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.split("#", 1)[0].strip()
            if not line:
                continue
            if line.startswith("-r"):
                nested = line[2:].strip()
                pins.extend(read_pins(os.path.join(os.path.dirname(path), nested), python_version, seen))
                continue
            spec, _, marker = line.partition(";")
            if marker.strip() and not marker_applies(marker, python_version):
                continue
            m = _PIN.fullmatch(spec.strip())
            if not m:
                raise ValueError(f"{path}: not an exact `name==version` pin: {line!r}")
            pins.append((m.group(1), m.group(2)))
    return pins


def distribution_gap(dist, pinned, python_version):
    """None when `dist` is installed at `pinned` and imports; otherwise the gap text."""
    try:
        installed = md.version(dist)
    except md.PackageNotFoundError:
        return f"{dist} is not installed (pinned {dist}=={pinned})"
    if not same_version(installed, pinned):
        pv = ".".join(str(n) for n in python_version)
        return f"{dist} {installed} is installed; the suite pins {dist}=={pinned} for Python {pv}"
    module = IMPORT_NAMES.get(dist.lower(), dist)
    try:
        # Import for real. Locating the module (importlib.util.find_spec) only
        # proves discoverability; the suites need the import to succeed.
        importlib.import_module(module)
    except Exception as exc:  # ImportError, or whatever the module raised while importing
        return (f"{dist} {installed} is installed but `import {module}` raises "
                f"{exc.__class__.__name__}: {first_line(exc)}")
    return None


def first_line(exc):
    return (str(exc).splitlines() or [exc.__class__.__name__])[0].strip()


def browser_probe():
    """(report, gap): launch and close a headless Chromium through this interpreter's Playwright."""
    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:  # the package is absent or broken for this interpreter
        return None, f"playwright does not import ({exc.__class__.__name__}: {exc})"
    try:
        with sync_playwright() as p:
            executable = p.chromium.executable_path
            browser = p.chromium.launch(headless=True)
            try:
                version = browser.version
            finally:
                browser.close()
        return (f"Chromium {version} launched headless; Playwright chromium executable: {executable}", None)
    except Exception as exc:  # the browser is absent or cannot start
        return None, browser_gap_text(exc)


def browser_gap_text(exc):
    # Playwright's message continues with a box-drawing banner that a cp1252
    # console cannot encode; the first line carries the missing executable.
    return f"Playwright's Chromium is not installed for this interpreter ({first_line(exc)})"


def quote(path):
    return '"' + path + '"'


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--requirements", default=DEFAULT_REQUIREMENTS,
                    help="pinned requirements file (default: tools/requirements-suite.txt)")
    ap.add_argument("--no-browser", action="store_true",
                    help="skip the Chromium launch (requirements logic only; the runner never passes this)")
    args = ap.parse_args(argv)
    try:
        sys.stdout.reconfigure(errors="replace")
    except Exception:
        pass

    python_version = tuple(sys.version_info[:2])
    interpreter = sys.executable
    print(f"Python {sys.version.split()[0]} at {interpreter}")

    # Outside the verified range nothing else is worth probing: no pin applies
    # to that interpreter, so no pip or playwright command could repair it.
    range_gap = python_range_gap(sys.version_info)
    if range_gap:
        print(f"GAP {range_gap}")
        return 2

    gaps = []
    try:
        pins = read_pins(args.requirements, python_version)
    except (OSError, ValueError) as exc:
        print(f"PROBE-ERROR {exc}")
        return 3

    need_pip = False
    playwright_present = False
    versions = []
    for dist, pinned in pins:
        gap = distribution_gap(dist, pinned, python_version)
        if gap:
            gaps.append(gap)
            need_pip = True
        else:
            versions.append(f"{dist} {md.version(dist)}")
            if dist.lower() == "playwright":
                playwright_present = True
    print(" | ".join(versions) if versions else "(none of the pinned distributions is installed)")

    need_browser = False
    if args.no_browser:
        print("Chromium: launch skipped (--no-browser)")
    elif playwright_present:
        report, gap = browser_probe()
        if gap:
            gaps.append(gap)
            need_browser = True
        else:
            print(report)
    else:
        need_browser = True  # the browser must be installed after the package is

    for gap in gaps:
        print(f"GAP {gap}")
    if need_pip:
        print(f"FIX {quote(interpreter)} -m pip install -r {os.path.abspath(args.requirements)}")
    if need_browser:
        print(f"FIX {quote(interpreter)} -m playwright install chromium")
    if gaps:
        return 2
    print("Suite preflight OK: this interpreter is provisioned for the local CI mirror.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
