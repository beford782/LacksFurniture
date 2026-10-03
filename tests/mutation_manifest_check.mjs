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
//     and --from refuses an index outside the manifest;
//  F. --to is an inclusive upper bound: on a planted four-entry manifest with
//     marker observers, each --from/--to combination runs exactly its
//     entries, baselines exactly their observers, reports the selected count,
//     and every malformed or reversed range is refused before any observer;
//  G. tools/run_mutation_sweep_shards.mjs (CI's sweep step) runs interleaved
//     --shard i/K shards that cover every entry exactly once, sums their
//     summaries, and fails on a survivor or on a shard that runs fewer entries
//     than its share. (--shard i/K itself is executed in F.)
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
// Every entry that targets the mapper is named. The count is read from the
// shipped manifest itself (two at the 2026-09-25 repair; the PR #132 review
// repairs added a third), so a later mapper entry extends this check rather
// than breaking it.
const mapperEntryCount = (sweep.match(/,\s*"tools\/map_app_to_website\.py"\]/g) || []).length;
check(mapperEntryCount >= 3, `the shipped manifest carries at least three mapper entries (${mapperEntryCount})`);
check(/\[NO PRISTINE SOURCE\] #756 "tools\/map_app_to_website\.py" - mapper:/.test(replay.out)
      && /\[NO PRISTINE SOURCE\] #757 "tools\/map_app_to_website\.py" - mapper:/.test(replay.out),
      "the original two mapper entries are named, #756 and #757, with their target", replay.out.slice(-600));
check((replay.out.match(/\[NO PRISTINE SOURCE\] #\d+ "tools\/map_app_to_website\.py" - mapper:/g) || []).length === mapperEntryCount,
      `every mapper entry is named (${mapperEntryCount})`, replay.out.slice(-600));
check(new RegExp(`::error:: ${mapperEntryCount} manifest entries name a target with no pristine source`).test(replay.out),
      `the count line says ${mapperEntryCount}`);
check(!/baseline \(unmutated\)/.test(replay.out), "no observer ran on the replay either");

// ---------------------------------------------------------------------------
section("E. exit codes stay distinct; --from is bounded");
check(/process\.exit\(survivors === 0 && notApplied === 0 && erroredCount === 0 \? 0 : 1\);/.test(sweep), "a survivor, a stale entry or an errored (killed) observer still exits 1");
check((sweep.match(/process\.exit\(2\);/g) || []).length >= 2, "manifest and --from refusals exit 2");
const badFrom = runSweep(sweepPath, ["--from", String(manifestCount + 1)]);
check(badFrom.status === 2 && badFrom.out.includes(`--from needs an integer between 1 and ${manifestCount}`),
      "--from past the manifest end is refused with exit 2", badFrom.out.slice(-200));
check(!/baseline \(unmutated\)/.test(badFrom.out), "...before any observer runs");

// ---------------------------------------------------------------------------
// F. --to (2026-10-01): an inclusive upper bound, so disjoint --from/--to
// ranges can run as parallel shards. Proved by EXECUTION on a planted
// four-entry manifest whose entries each name their own marker observer: the
// observer appends "<n>:baseline" or "<n>:mutated" to a log, passes on the
// unmutated page and fails on the mutated one. The log is therefore a direct
// record of which entries ran, and of which observers the baseline covered.
section("F. --to selects an inclusive range; the baseline covers exactly the selected observers");
const PROBE_FIND = "<!DOCTYPE html>";
check(sweep.includes(": MUTATIONS.slice(fromIndex - 1, toIndex);"), "the selection is the inclusive slice from --from to --to");
for (let n = 1; n <= 4; n++) {
  writeFileSync(join(tempRoot, "tests", `probe_range_observer_${n}.mjs`),
    'import { readFileSync, appendFileSync } from "node:fs";\n' +
    `const mutated = readFileSync("index.html", "utf8").includes("<!-- range probe ${n} -->");\n` +
    `appendFileSync(process.env.MUTATION_RANGE_LOG, "${n}:" + (mutated ? "mutated" : "baseline") + "\\n");\n` +
    "process.exit(mutated ? 1 : 0);\n");
}
const rangeEntries = [1, 2, 3, 4].map((n) =>
  `  ["range probe ${n}", ${JSON.stringify(PROBE_FIND)}, ${JSON.stringify(PROBE_FIND + `<!-- range probe ${n} -->`)}, ["tests/probe_range_observer_${n}.mjs"]],\n`).join("");
const ranged = replaceOnce(sweep, /^const MUTATIONS = \[\r?\n[\s\S]*?\r?\n\];/m,
  "const MUTATIONS = [\n" + rangeEntries + "];", "whole manifest");
const rangedPath = writeSweepCopy("sweep_ranged.mjs", ranged);
function runRange(args) {
  const log = join(work, `range-${args.join("_").replace(/[^A-Za-z0-9_.-]/g, "_") || "all"}.log`);
  const r = runSweep(rangedPath, args, { MUTATION_RANGE_LOG: log });
  const lines = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  return { ...r, baseline: lines.filter((l) => l.endsWith(":baseline")).map((l) => l[0]).sort().join(""),
           mutated: lines.filter((l) => l.endsWith(":mutated")).map((l) => l[0]).sort().join("") };
}
for (const [args, want, header] of [
  [[], "1234", null],
  [["--to", "2"], "12", "running entries 1-2 of 4 (--from 1 --to 2)"],
  [["--from", "3"], "34", "running entries 3-4 of 4 (--from 3)"],
  [["--from", "2", "--to", "3"], "23", "running entries 2-3 of 4 (--from 2 --to 3)"],
  [["--from", "2", "--to", "2"], "2", "running entries 2-2 of 4 (--from 2 --to 2)"],
  [["--from", "1", "--to", "4"], "1234", null],
  [["--to", "4", "--from", "4"], "4", "running entries 4-4 of 4 (--from 4 --to 4)"],
]) {
  const r = runRange(args);
  const label = args.join(" ") || "(no range)";
  check(r.status === 0 && r.mutated === want, `[${label}] exactly entries ${want.split("").join(",")} are mutated and caught`,
        `status ${r.status} mutated=${r.mutated}: ${r.out.slice(-300)}`);
  check(r.baseline === want, `[${label}] the baseline runs exactly the selected entries' observers (${want.split("").join(",")}), no others`,
        `baseline=${r.baseline}`);
  const lo = want[0], hi = want[want.length - 1];
  check(r.out.includes(`Mutation sweep: ${want.length}/${want.length} caught, 0 survived, 0 errored, 0 did not apply`
        + (want.length < 4 ? ` (entries ${lo}-${hi} of 4)` : "")),
        `[${label}] the summary counts the selection (${want.length}) and names its range`, r.out.slice(-200));
  check(header === null ? !/running entries/.test(r.out) : r.out.includes(header),
        `[${label}] the range header is ${header === null ? "absent for the whole manifest" : "printed"}`, r.out.slice(0, 200));
}
// Two disjoint shards cover the manifest exactly once.
const shardA = runRange(["--from", "1", "--to", "2"]), shardB = runRange(["--from", "3", "--to", "4"]);
check((shardA.mutated + shardB.mutated).split("").sort().join("") === "1234",
      "two disjoint shards (1-2, 3-4) cover every entry exactly once", `${shardA.mutated}+${shardB.mutated}`);
for (const [args, why] of [
  [["--to", "0"], "below the first entry"],
  [["--to", "5"], "past the manifest end"],
  [["--from", "3", "--to", "2"], "reversed"],
  [["--to", "2.5"], "not an integer"],
  [["--to", "abc"], "not a number"],
  [["--to"], "missing its value"],
  [["--from", "2", "--to"], "missing its value after --from"],
]) {
  const r = runRange(args);
  check(r.status === 2 && /::error:: --to needs an integer between \d+ and 4/.test(r.out),
        `[${args.join(" ")}] a --to that is ${why} is refused with exit 2`, `status ${r.status}: ${r.out.slice(-200)}`);
  check(!/baseline \(unmutated\)/.test(r.out) && r.baseline === "" && r.mutated === "",
        `[${args.join(" ")}] ...before any observer runs`);
}
// Negative controls: an exclusive upper bound, and a baseline taken from the
// whole manifest instead of the selection, are each visible in the log.
{
  const offByOne = replaceOnce(ranged, /: MUTATIONS\.slice\(fromIndex - 1, toIndex\);/,
    ": MUTATIONS.slice(fromIndex - 1, toIndex - 1);", "inclusive slice");
  const log = join(work, "range-control-a.log");
  runSweep(writeSweepCopy("sweep_ranged_offbyone.mjs", offByOne), ["--from", "2", "--to", "3"], { MUTATION_RANGE_LOG: log });
  const ran = existsSync(log) ? readFileSync(log, "utf8") : "";
  check(/2:mutated/.test(ran) && !/3:mutated/.test(ran), "control: an exclusive --to (entry 3 never runs) is DETECTED by the log", ran.replace(/\n/g, " "));
  const wideBaseline = replaceOnce(ranged, /RUN\.flatMap\(\(m\) => m\[3\] \|\| DEFAULT_SUITES\)/,
    "MUTATIONS.flatMap((m) => m[3] || DEFAULT_SUITES)", "baseline observer set");
  const log2 = join(work, "range-control-b.log");
  runSweep(writeSweepCopy("sweep_ranged_widebase.mjs", wideBaseline), ["--from", "2", "--to", "3"], { MUTATION_RANGE_LOG: log2 });
  const ran2 = existsSync(log2) ? readFileSync(log2, "utf8") : "";
  check(/1:baseline/.test(ran2) && /4:baseline/.test(ran2), "control: a baseline that runs unselected observers is DETECTED by the log", ran2.replace(/\n/g, " "));
}
const realBadTo = runSweep(sweepPath, ["--to", String(manifestCount + 1)]);
check(realBadTo.status === 2 && realBadTo.out.includes(`--to needs an integer between 1 and ${manifestCount}`),
      "the shipped sweep refuses --to past its own manifest end", realBadTo.out.slice(-200));

// --shard i/K: every K-th entry from entry i (the interleaved shards CI runs).
for (const [spec, want] of [["1/1", "1234"], ["1/2", "13"], ["2/2", "24"], ["1/3", "14"], ["2/3", "2"], ["3/3", "3"], ["4/4", "4"]]) {
  const r = runRange(["--shard", spec]);
  check(r.status === 0 && r.mutated === want && r.baseline === want,
        `[--shard ${spec}] runs and baselines exactly entries ${want.split("").join(",")}`,
        `status ${r.status} mutated=${r.mutated} baseline=${r.baseline}: ${r.out.slice(-200)}`);
  check(r.out.includes(`Mutation sweep: ${want.length}/${want.length} caught, 0 survived, 0 errored, 0 did not apply (shard ${spec}: ${want.length} of 4)`),
        `[--shard ${spec}] the summary names the shard and its share`, r.out.slice(-200));
}
for (const [args, why] of [
  [["--shard", "0/2"], "i below 1"], [["--shard", "3/2"], "i above K"], [["--shard", "1/0"], "K of 0"],
  [["--shard", "1/5"], "K above the manifest size"], [["--shard", "x"], "not i/K"], [["--shard"], "missing its value"],
]) {
  const r = runRange(args);
  check(r.status === 2 && /::error:: --shard needs i\/K/.test(r.out) && r.baseline === "" && r.mutated === "",
        `[${args.join(" ")}] a --shard that is ${why} is refused with exit 2 before any observer`, r.out.slice(-200));
}
{
  const r = runRange(["--shard", "1/2", "--to", "3"]);
  check(r.status === 2 && r.out.includes("--shard cannot be combined with --from or --to") && r.mutated === "",
        "--shard combined with --to is refused with exit 2");
}

// ---------------------------------------------------------------------------
// G. tools/run_mutation_sweep_shards.mjs (2026-10-02): CI runs the sweep as
// parallel INTERLEAVED shards (--shard i/K). Executed against the same planted
// four-entry manifest, so the marker log shows exactly which entries ran, and
// how often.
section("G. the shard runner covers every entry exactly once and fails loudly");
const shardRunner = join(root, "tools", "run_mutation_sweep_shards.mjs");
function runShards(sweepFile, args, tag) {
  const log = join(work, `shards-${tag}.log`);
  const r = spawnSync("node", [shardRunner, ...args], {
    cwd: work, encoding: "utf8", timeout: 600000,
    env: { ...process.env, MUTATION_SWEEP_ROOT: tempRoot, MUTATION_SWEEP_SCRIPT: sweepFile, MUTATION_RANGE_LOG: log },
  });
  const lines = existsSync(log) ? readFileSync(log, "utf8").trim().split("\n").filter(Boolean) : [];
  return { status: r.status, out: (r.stdout || "") + (r.stderr || ""),
           mutated: lines.filter((l) => l.endsWith(":mutated")).map((l) => l[0]).sort().join("") };
}
for (const [k, plan] of [["1", "1/1 (4)"], ["2", "1/2 (2), 2/2 (2)"], ["3", "1/3 (2), 2/3 (1), 3/3 (1)"],
                         ["4", "1/4 (1), 2/4 (1), 3/4 (1), 4/4 (1)"], ["9", "1/4 (1), 2/4 (1), 3/4 (1), 4/4 (1)"]]) {
  const r = runShards(rangedPath, ["--shards", k], "k" + k);
  check(r.status === 0 && r.out.includes(`4 entries interleaved across ${plan.split(", ").length} parallel shard(s): ${plan}`),
        `[--shards ${k}] the plan partitions 1-4 (${plan})`, `status ${r.status}: ${r.out.slice(0, 200)}`);
  check(r.mutated === "1234", `[--shards ${k}] every entry was mutated exactly once`, `mutated=${r.mutated}`);
  check(/Mutation sweep \(\d+ shards\): 4\/4 caught, 0 survived, 0 errored, 0 did not apply, 0 unaccounted/.test(r.out),
        `[--shards ${k}] the combined summary accounts for all 4 entries`, r.out.slice(-200));
}
{
  // A survivor in one shard fails the whole run, and is counted.
  const survivorEntries = [1, 2, 3].map((n) =>
    `  ["range probe ${n}", ${JSON.stringify(PROBE_FIND)}, ${JSON.stringify(PROBE_FIND + `<!-- range probe ${n} -->`)}, ["tests/probe_range_observer_${n}.mjs"]],\n`).join("")
    + `  ["range probe that no observer sees", ${JSON.stringify(PROBE_FIND)}, ${JSON.stringify(PROBE_FIND + "<!-- range probe 9 -->")}, ["tests/probe_range_observer_1.mjs"]],\n`;
  const survivorSweep = writeSweepCopy("sweep_survivor.mjs", replaceOnce(sweep, /^const MUTATIONS = \[\r?\n[\s\S]*?\r?\n\];/m,
    "const MUTATIONS = [\n" + survivorEntries + "];", "whole manifest"));
  const r = runShards(survivorSweep, ["--shards", "2"], "survivor");
  check(r.status === 1 && /3\/4 caught, 1 survived, 0 errored/.test(r.out) && /::error:: shard 2\/2 exited 1/.test(r.out),
        "a survivor in one shard fails the run and is counted in the combined summary", r.out.slice(-300));
}
{
  // A shard that silently drops an entry from its share is refused.
  const lying = replaceOnce(ranged, /MUTATIONS\.filter\(\(_, idx\) => idx % shardK === shardI - 1\)/,
    "MUTATIONS.filter((_, idx) => idx > 0 && idx % shardK === shardI - 1)", "shard selection");
  const r = runShards(writeSweepCopy("sweep_shard_short.mjs", lying), ["--shards", "2"], "short");
  check(r.status === 1 && /::error:: shard 1\/2 reported 1 entries/.test(r.out) && /1 unaccounted/.test(r.out),
        "control: a shard that silently runs fewer entries than its share is DETECTED", r.out.slice(-300));
}
for (const bad of ["0", "17", "abc"]) {
  const r = runShards(rangedPath, ["--shards", bad], "bad" + bad);
  check(r.status === 2 && r.out.includes("--shards needs an integer between 1 and 16") && r.mutated === "",
        `[--shards ${bad}] refused with exit 2 before any shard runs`, r.out.slice(-200));
}

console.log(`\nMutation manifest check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
