// Mutation manifest check - a manifest entry whose target has no pristine
// source is refused by name BEFORE any observer runs.
//
// The defect this pins (2026-09-25): the two mapper entries added in 9d99478
// named tools/map_app_to_website.py as their target, and no PRISTINE_BY_FILE
// key was added for it. The sweep ran for 59 minutes, reported 755 of 763
// caught, then died at entry 756 with a TypeError from `undefined.replace`,
// so the six compare-price entries behind it were never exercised and the
// sweep's own summary line was never printed. tests/mutation_sweep.mjs now
// validates the manifest against its pristine table before the baseline and
// exits 2 with the offending entries listed. This suite proves that:
//
//  A. the SHIPPED manifest validates (every target has a source), and the
//     mapper key is present with at least one entry naming it (non-vacuity);
//  B. a planted entry with no pristine source is refused, by number and by
//     target, with exit code 2, before the baseline line is ever printed and
//     before its observer executes (a marker observer proves the negative);
//  C. the marker observer really does run when the refusal is neutralised,
//     so B's "observer never executed" is a measurement, not silence;
//  D. deleting the mapper key from a copy of the shipped sweep reproduces the
//     original defect as a REFUSAL naming #756 and #757, not as a crash;
//  E. the manifest exit code (2) is distinct from the survivor exit code (1),
//     and --from refuses an index outside the manifest.
//
// Every sweep invocation here runs a COPY of tests/mutation_sweep.mjs from a
// temp directory, pointed at a temp copy of the tree through
// MUTATION_SWEEP_ROOT, so nothing is written inside the repository.
//
// Run: node tests/mutation_manifest_check.mjs

import { readFileSync, writeFileSync, mkdtempSync, cpSync, rmSync, existsSync, mkdirSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const sweepPath = join(root, "tests", "mutation_sweep.mjs");
const sweep = readFileSync(sweepPath, "utf8");

let passed = 0, failed = 0;
function check(cond, label, detail) {
  if (cond) { passed++; console.log(`  [ok] ${label}`); }
  else { failed++; console.log(`  [FAIL] ${label}${detail ? " - " + detail : ""}`); }
}
function section(title) { console.log(`\n-- ${title} --`); }
function replaceOnce(src, re, replacement, what) {
  const hits = src.match(new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g")) || [];
  if (hits.length !== 1) throw new Error(`${what}: expected exactly one match, found ${hits.length}`);
  return src.replace(re, replacement);
}

// A temp ROOT: the directories and files the sweep copies into its sandbox,
// plus one extra observer script (tests/probe_marker_observer.mjs) that writes
// a marker file named by MUTATION_MANIFEST_MARKER. Because the planted entry
// names that observer by a repo-relative path, nothing depends on the temp
// path being space-free.
const work = mkdtempSync(join(tmpdir(), "df-manifest-check-"));
process.on("exit", () => { try { rmSync(work, { recursive: true, force: true }); } catch {} });
const tempRoot = join(work, "root");
mkdirSync(tempRoot);
for (const d of ["tests", "data", "docs", "tools", "incoming", "demo", ".github", "onboarding", "images"]) {
  cpSync(join(root, d), join(tempRoot, d), { recursive: true });
}
for (const f of ["index.html", "Code.gs", "CLAUDE.md", "README.md", "build-data.ps1", "AGENTS.md", "manifest.json"]) {
  cpSync(join(root, f), join(tempRoot, f));
}
const markerObserver = "tests/probe_marker_observer.mjs";
writeFileSync(join(tempRoot, markerObserver),
  'import { writeFileSync } from "node:fs";\n' +
  'writeFileSync(process.env.MUTATION_MANIFEST_MARKER, "observer executed\\n");\n');

function writeSweepCopy(name, source) {
  const p = join(work, name);
  writeFileSync(p, source);
  return p;
}
function runSweep(file, args, extraEnv) {
  const t0 = Date.now();
  const r = spawnSync("node", [file, ...args], {
    cwd: work, encoding: "utf8", timeout: 240000,
    env: { ...process.env, MUTATION_SWEEP_ROOT: tempRoot, ...(extraEnv || {}) },
  });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || ""), ms: Date.now() - t0 };
}

// ---------------------------------------------------------------------------
section("A. the shipped manifest validates, and the mapper key is real");
const listed = runSweep(sweepPath, ["--list"]);
const countMatch = listed.out.match(/^(\d+) mutations; default suites:/m);
check(listed.status === 0 && countMatch, "--list prints the manifest count", listed.out.slice(-200));
const manifestCount = countMatch ? Number(countMatch[1]) : NaN;
const validated = runSweep(sweepPath, ["--validate-manifest"]);
check(validated.status === 0, "--validate-manifest exits 0 on the shipped tree", `status ${validated.status}: ${validated.out.slice(-300)}`);
check(validated.out.includes(`manifest: ${manifestCount} entries, every target has a pristine source`),
      `...and reports the same count as --list (${manifestCount})`, validated.out.slice(-300));
check(!/baseline \(unmutated\)/.test(validated.out), "...and runs no observer (no baseline line)");
const keyRe = /  "tools\/map_app_to_website\.py":\r?\n    readFileSync\(join\(sandbox, "tools", "map_app_to_website\.py"\), "utf8"\),\r?\n/;
check(keyRe.test(sweep), "PRISTINE_BY_FILE carries the tools/map_app_to_website.py key");
const mapperEntries = (sweep.match(/, "tools\/map_app_to_website\.py"\],/g) || []).length;
check(mapperEntries >= 2, `at least two manifest entries name that target (found ${mapperEntries})`);
check(/function manifestTargetsWithoutSource\(/.test(sweep)
      && sweep.indexOf("manifestTargetsWithoutSource(MUTATIONS, PRISTINE_BY_FILE)") < sweep.indexOf("const baseline = runSuites(ALL_OBSERVERS)"),
      "the validation is called before the baseline in source order");

// ---------------------------------------------------------------------------
section("B. a planted entry with no pristine source is refused before any observer runs");
const plantedEntry =
  '  ["probe: an entry whose target has no pristine source", "never-matched", "never-applied",\n' +
  `    ["${markerObserver}"], "tools/does_not_exist.py"],\n`;
const planted = replaceOnce(sweep, /^const MUTATIONS = \[\r?\n/m, (m) => m + plantedEntry, "manifest opener");
const plantedPath = writeSweepCopy("sweep_planted.mjs", planted);
const marker = join(work, "marker-B.txt");
const refused = runSweep(plantedPath, [], { MUTATION_MANIFEST_MARKER: marker });
check(refused.status === 2, "exit code is 2 (the manifest code, not the survivor code)", `status ${refused.status}: ${refused.out.slice(-400)}`);
check(refused.out.includes('[NO PRISTINE SOURCE] #1 "tools/does_not_exist.py" - probe: an entry whose target has no pristine source'),
      "the refusal names the entry by number, target and label", refused.out.slice(-400));
check(/::error:: 1 manifest entry names a target with no pristine source/.test(refused.out),
      "the error line counts the offending entries and says no observer was run");
check(!/baseline \(unmutated\)/.test(refused.out), "the baseline line is never printed");
check(!existsSync(marker), "the planted entry's observer never executed (marker absent)");
check(refused.ms < 60000, `the refusal is prompt (${refused.ms} ms), not an hour in`);

// ---------------------------------------------------------------------------
section("C. non-vacuity: with the refusal neutralised the marker observer DOES run");
const neutralised = replaceOnce(planted,
  /  process\.exit\(2\);(\r?\n)\}(\r?\n)if \(process\.argv\.includes\("--validate-manifest"\)\)/,
  "  /* refusal neutralised by mutation_manifest_check */$1}$2if (process.argv.includes(\"--validate-manifest\"))",
  "refusal exit");
check(neutralised !== planted, "the neutralising mutation applied to the planted copy");
const neutralPath = writeSweepCopy("sweep_neutralised.mjs", neutralised);
const markerC = join(work, "marker-C.txt");
const observed = await new Promise((resolveP) => {
  const child = spawn("node", [neutralPath], {
    cwd: work, stdio: "pipe",
    env: { ...process.env, MUTATION_SWEEP_ROOT: tempRoot, MUTATION_MANIFEST_MARKER: markerC },
  });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  const started = Date.now();
  const timer = setInterval(() => {
    if (existsSync(markerC) || Date.now() - started > 120000) {
      clearInterval(timer);
      child.kill();
      resolveP({ marker: existsSync(markerC), out, ms: Date.now() - started });
    }
  }, 250);
  child.on("exit", () => {
    clearInterval(timer);
    resolveP({ marker: existsSync(markerC), out, ms: Date.now() - started });
  });
});
check(observed.marker, `the marker observer executed once the refusal was gone (${observed.ms} ms)`, observed.out.slice(-400));
check(/\[NO PRISTINE SOURCE\] #1 "tools\/does_not_exist\.py"/.test(observed.out),
      "...the validation still ran and listed the entry; only its exit was removed (so B's absent marker measured the exit, not the listing)", observed.out.slice(-400));

// ---------------------------------------------------------------------------
section("D. the original defect, replayed: the mapper key deleted from a copy of the shipped sweep");
const keyless = replaceOnce(sweep, keyRe, "", "mapper key");
check(keyless !== sweep, "the key deletion applied");
const keylessPath = writeSweepCopy("sweep_keyless.mjs", keyless);
const replay = runSweep(keylessPath, ["--validate-manifest"]);
check(replay.status === 2, "the keyless sweep is REFUSED with exit 2, not a TypeError", `status ${replay.status}: ${replay.out.slice(-400)}`);
check(!/TypeError|Cannot read properties of undefined/.test(replay.out), "no stack trace: the defect is reported, not thrown");
check(/\[NO PRISTINE SOURCE\] #756 "tools\/map_app_to_website\.py" - mapper:/.test(replay.out)
      && /\[NO PRISTINE SOURCE\] #757 "tools\/map_app_to_website\.py" - mapper:/.test(replay.out),
      "both mapper entries are named, #756 and #757, with their target", replay.out.slice(-600));
check(/::error:: 2 manifest entries name a target with no pristine source/.test(replay.out), "the count line says two");
check(!/baseline \(unmutated\)/.test(replay.out), "no observer ran on the replay either");

// ---------------------------------------------------------------------------
section("E. exit codes stay distinct; --from is bounded");
check(/process\.exit\(survivors === 0 && notApplied === 0 \? 0 : 1\);/.test(sweep), "a survivor or a stale entry still exits 1");
check((sweep.match(/process\.exit\(2\);/g) || []).length >= 2, "manifest and --from refusals exit 2");
const badFrom = runSweep(sweepPath, ["--from", String(manifestCount + 1)]);
check(badFrom.status === 2 && badFrom.out.includes(`--from needs an integer between 1 and ${manifestCount}`),
      "--from past the manifest end is refused with exit 2", badFrom.out.slice(-200));
check(!/baseline \(unmutated\)/.test(badFrom.out), "...before any observer runs");

console.log(`\nMutation manifest check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
