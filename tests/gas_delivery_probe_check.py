#!/usr/bin/env python3
"""Offline check of tools/gas_delivery_probe.py - NO network, nothing sent.

The probe is the owner-run controlled real-delivery test
(docs/gas-activation-runbook.md, "Controlled delivery test"). This check
proves, without touching the network:
  * its refusals: a non-Apps-Script or non-https URL, a recipient not
    repeated verbatim, a malformed address, and any non-dry run under CI;
  * its payload: exactly the kiosk's closed key set (read from the payload
    literal in index.html sendResults()), a well-formed sendId, every visible
    value marked as a test, a malformed sendId only on step 3;
  * its plan and report against an in-memory transport (no socket opened);
  * its three expectations against the REAL Code.gs doPost (node, the same
    whole-file load the email suites use): one send, a duplicate, an
    invalid_request - ONE MailApp call in all, the test quote rendered.

Run: python tests/gas_delivery_probe_check.py
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import gas_delivery_probe as probe  # noqa: E402

passed = failed = 0


def check(name, cond, detail=""):
    global passed, failed
    if cond:
        passed += 1
        print(f"  [ok]   {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}" + (f" -- {detail}" if detail else ""))
    return cond


GOOD_URL = "https://script.google.com/macros/s/AKfycbx_FIXTURE-deployment-id_0123/exec"
OWNER = "owner@example.com"


def run_main(argv, env_ci=None, post=None):
    lines = []
    saved = os.environ.get("CI")
    try:
        if env_ci is None:
            os.environ.pop("CI", None)
        else:
            os.environ["CI"] = env_ci

        def no_network(*a, **k):
            raise AssertionError("network used")
        code = probe.main(argv, post=post or no_network, out=lines.append)
    finally:
        if saved is None:
            os.environ.pop("CI", None)
        else:
            os.environ["CI"] = saved
    return code, "\n".join(lines)


base = ["--gas-url", GOOD_URL, "--to", OWNER, "--confirm-recipient", OWNER]

print("Refusals (exit 2, before any network use):")
for label, url in [("http://", GOOD_URL.replace("https://", "http://")),
                   ("another host", "https://example.com/macros/s/AKfycbx_FIXTURE-deployment-id_0123/exec"),
                   ("a look-alike host", "https://script.google.com.evil.test/macros/s/AKfycbx_FIXTURE-0123/exec"),
                   ("no /exec", GOOD_URL[:-5]),
                   ("the /dev test URL", GOOD_URL[:-4] + "dev"),
                   ("a query string", GOOD_URL + "?x=1")]:
    code, text = run_main(["--gas-url", url, "--to", OWNER, "--confirm-recipient", OWNER])
    check(f"--gas-url {label}: refused", code == 2 and "REFUSED: --gas-url" in text, text)
code, text = run_main(["--gas-url", GOOD_URL, "--to", OWNER, "--confirm-recipient", "other@example.com"])
check("a recipient not repeated verbatim: refused", code == 2 and "--confirm-recipient" in text, text)
code, text = run_main(["--gas-url", GOOD_URL, "--to", OWNER, "--confirm-recipient", OWNER.upper()])
check("a recipient repeated in different case: refused (verbatim means verbatim)", code == 2, text)
code, text = run_main(["--gas-url", GOOD_URL, "--to", "not-an-address", "--confirm-recipient", "not-an-address"])
check("a malformed address: refused", code == 2 and "--to must be an email" in text, text)
code, text = run_main(base, env_ci="true")
check("a real run under CI: refused", code == 2 and "refused under CI" in text, text)
code, text = run_main(base + ["--dry-run"], env_ci="true")
check("--dry-run under CI: allowed, and no network (the transport would raise)", code == 0 and "DRY RUN" in text, text[:200])

print("Payload:")
html = open(os.path.join(REPO, "index.html"), encoding="utf-8").read()
block = html[html.index("      const payload = {"):]
block = block[:block.index("\n      };\n")]
client_keys = set(re.findall(r"^        ([A-Za-z]+):", block, re.M))
check(f"the client payload literal was read ({len(client_keys)} keys)", len(client_keys) >= 25, str(sorted(client_keys)))
for lang in ("en", "es"):
    steps = probe.plan(OWNER, lang)
    body = steps[0][1]
    check(f"[{lang}] the probe payload has EXACTLY the client's key set",
          set(body) == client_keys, str(sorted(set(body) ^ client_keys)))
    check(f"[{lang}] lang, recipient and a well-formed 24-char sendId",
          body["lang"] == lang and body["email"] == OWNER and probe.SEND_ID_RE.match(body["sendId"])
          and len(body["sendId"]) == 24)
    check(f"[{lang}] steps 1 and 2 are the identical body (same sendId); step 3 differs ONLY by a malformed sendId",
          steps[1][1] == body and {k for k in body if steps[2][1][k] != body[k]} == {"sendId"}
          and not probe.SEND_ID_RE.match(steps[2][1]["sendId"]))
    check(f"[{lang}] expectations: success, duplicate, invalid_request",
          [s[2] for s in steps] == [probe.EXPECT_SENT, probe.EXPECT_DUPLICATE, probe.EXPECT_INVALID])
    check(f"[{lang}] every visible value is marked as a test (profile, match, quote line, provenance, rsa)",
          probe.TEST_MARK in body["sleepProfile"] and body["allMatches"][0]["name"].startswith("TEST")
          and body["quote"]["lines"][0]["name"].startswith(("TEST", "PRUEBA"))
          and body["quote"]["provenance"] == probe.TEST_MARK and body["rsa"] == "delivery-probe")
    check(f"[{lang}] no phone, no Savings Pass code, no financing", body["phone"] == "" and body["dreamCode"] == ""
          and body["financing"] is None)
check("two plans never share a sendId", probe.plan(OWNER, "en")[0][1]["sendId"] != probe.plan(OWNER, "en")[0][1]["sendId"])

print("Run against an in-memory transport:")


class FakeGas:
    def __init__(self, answers=None):
        self.bodies = []
        self.sent = set()
        self.answers = answers

    def __call__(self, url, body, timeout):
        self.bodies.append((url, body))
        if self.answers is not None:
            return 200, self.answers[len(self.bodies) - 1], "ok"
        sid = body.get("sendId")
        if not isinstance(sid, str) or not probe.SEND_ID_RE.match(sid):
            return 200, {"success": False, "error": "invalid_request"}, "ok"
        if sid in self.sent:
            return 200, {"success": True, "duplicate": True}, "ok"
        self.sent.add(sid)
        return 200, {"success": True}, "ok"


fake = FakeGas()
code, text = run_main(base, post=fake)
check("a deployment that dedupes: exit 0, three POSTs to the given URL, ONE accepted send",
      code == 0 and len(fake.bodies) == 3 and all(u == GOOD_URL for u, _ in fake.bodies) and len(fake.sent) == 1, text)
check("the report shows three PASS lines and the manual inbox/Sheet checklist",
      text.count("[PASS]") == 3 and "DreamFinder Sends" in text and "exactly ONE email" in text)
fake = FakeGas(answers=[{"success": True}, {"success": True}, {"success": False, "error": "invalid_request"}])
code, text = run_main(base, post=fake)
check("a deployment that sends the repeat again (no duplicate answer): exit 1, the step marked FAIL",
      code == 1 and "[FAIL] 2." in text, text)
code, text = run_main(base, post=lambda u, b, t: (None, None, "transport: URLError"))
check("an unreachable deployment: exit 1, the transport note reported", code == 1 and "transport: URLError" in text, text)

print("Against the real Code.gs doPost (node):")
REPLAY = r"""
import { readFileSync } from "node:fs";
const [repo, bodiesPath] = process.argv.slice(2);
const gs = readFileSync(repo + "/Code.gs", "utf8");
const bodies = JSON.parse(readFileSync(bodiesPath, "utf8"));
const rows = [], ledger = [], sent = [];
const tabFor = (n) => (n === "Leads" ? rows : ledger);
const sheet = (n) => ({ appendRow: (r) => tabFor(n).push(r.slice()), setFrozenRows: () => {}, hideSheet: () => {},
  getName: () => n, getLastRow: () => tabFor(n).length,
  getRange: (r, c, nr = 1, nc = 1) => ({
    getValues: () => tabFor(n).slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc)),
    setValues: (v) => v.forEach((vals, i) => vals.forEach((x, j) => { tabFor(n)[r - 1 + i][c - 1 + j] = x; })) }) });
let made = false;
const SpreadsheetApp = { flush: () => {}, getActiveSpreadsheet: () => ({
  getSheetByName: (n) => (n === "Leads" || (n === "DreamFinder Sends" && made) ? sheet(n) : null),
  insertSheet: (n) => { made = true; return sheet(n); } }) };
const MailApp = { getRemainingDailyQuota: () => 97, sendEmail: (to, subject, body, o) => sent.push({ to, subject, body, html: (o || {}).htmlBody || "" }) };
const props = { UNSUBSCRIBE_URL: "https://example.test/unsubscribe", POSTAL_ADDRESS: "1 Test St, Test TX 78501",
  PRIVACY_CONTACT: "privacy@example.test" };
const PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null) }) };
const cache = new Map();
const CacheService = { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, v) }) };
const LockService = { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) };
const Logger = { log: () => {} };
const ContentService = { MimeType: { JSON: "json" },
  createTextOutput: (s) => ({ setMimeType: () => ({ getContent: () => s }), getContent: () => s }) };
const api = new Function("Logger", "ContentService", "SpreadsheetApp", "MailApp", "LockService", "CacheService",
  "PropertiesService", gs + ";return { doPost: function(e) { return doPost(e); } };")(
  Logger, ContentService, SpreadsheetApp, MailApp, LockService, CacheService, PropertiesService);
const responses = bodies.map((b) => JSON.parse(api.doPost({ postData: { contents: JSON.stringify(b) } }).getContent()));
process.stdout.write(JSON.stringify({ responses, sent, rows: rows.length, ledger: ledger.slice(1).map((r) => [r[0], r[1]]) }));
"""
node = shutil.which("node") or shutil.which("node.exe")
if not check("node is available for the Code.gs replay", node is not None):
    pass
else:
    for lang, heading in (("en", "Your quote"), ("es", "Tu cotización")):
        steps = probe.plan(OWNER, lang)
        with tempfile.TemporaryDirectory() as tmp:
            mjs = os.path.join(tmp, "replay.mjs")
            bp = os.path.join(tmp, "bodies.json")
            open(mjs, "w", encoding="utf-8").write(REPLAY)
            json.dump([s[1] for s in steps], open(bp, "w", encoding="utf-8"))
            res = subprocess.run([node, mjs, REPO, bp], capture_output=True, text=True, encoding="utf-8")
        if not check(f"[{lang}] the replay ran", res.returncode == 0, res.stderr[-400:]):
            continue
        r = json.loads(res.stdout)
        check(f"[{lang}] the real doPost answers exactly the probe's three expectations",
              r["responses"] == [s[2] for s in steps], str(r["responses"]))
        check(f"[{lang}] ONE MailApp call in all, to the confirmed recipient; one Leads row; ledger 'complete'",
              len(r["sent"]) == 1 and r["sent"][0]["to"] == OWNER and r["rows"] == 1
              and r["ledger"] == [["id:" + steps[0][1]["sendId"], "complete"]], str(r["ledger"]))
        check(f"[{lang}] the test quote renders (the '{heading}' section and the TEST line, both parts)",
              all(heading in x and steps[0][1]["quote"]["lines"][0]["name"] in x
                  for x in (r["sent"][0]["html"], r["sent"][0]["body"])))

print(f"\nGas delivery probe check: {passed} passed, {failed} failed")
sys.exit(1 if failed else 0)
