// Run the mutation sweep as N parallel, contiguous --from/--to shards.
//
// Why: the single sweep re-runs each entry's observer suites one after
// another and took ~67 minutes in CI (2026-10-02). The entries are
// independent and each shard copies its own sandbox, so ranges can run side
// by side on the runner's cores. This runner adds no new judgement; the
// sweep itself still decides caught / survived / errored / did not apply.
// What this file guarantees is that sharding cannot quietly lose coverage:
//
//   * the manifest size is read from the sweep itself (`--list`), so an entry
//     added later can never fall outside every shard;
//   * the shards are contiguous and disjoint and together cover 1..N exactly;
//   * every shard must print its summary, and the summary must account for
//     exactly that shard's entries ("T/T ... (entries a-b of N)");
//   * the combined result fails on any survivor, errored or not-applied
//     entry, any non-zero shard exit, or any missing/mismatched summary.
//
// Usage: node tools/run_mutation_sweep_shards.mjs [--shards K]   (default 3)
// MUTATION_SWEEP_SCRIPT overrides the sweep path (tests use a planted copy);
// MUTATION_SWEEP_ROOT is passed through to the sweep unchanged.
// Writes nothing; exit 0 = every entry caught.

import { spawn, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const sweep = process.env.MUTATION_SWEEP_SCRIPT
  ? resolve(process.env.MUTATION_SWEEP_SCRIPT)
  : join(repo, "tests", "mutation_sweep.mjs");

const kArg = process.argv.indexOf("--shards");
const requested = kArg === -1 ? 3 : Number(process.argv[kArg + 1]);
if (!Number.isInteger(requested) || requested < 1 || requested > 16) {
  console.log("::error:: --shards needs an integer between 1 and 16");
  process.exit(2);
}

const listed = spawnSync(process.execPath, [sweep, "--list"], { encoding: "utf8", env: process.env });
const countMatch = (listed.stdout || "").match(/^(\d+) mutations; default suites:/m);
if (listed.status !== 0 || !countMatch) {
  console.log("::error:: could not read the manifest size from the sweep's --list");
  console.log((listed.stdout || "") + (listed.stderr || ""));
  process.exit(2);
}
const total = Number(countMatch[1]);
const k = Math.min(requested, total);
const size = Math.ceil(total / k);
const ranges = [];
for (let lo = 1; lo <= total; lo += size) ranges.push([lo, Math.min(total, lo + size - 1)]);
// Coverage is asserted, not assumed.
const covered = ranges.reduce((n, [lo, hi], i) =>
  (i === 0 ? lo === 1 : lo === ranges[i - 1][1] + 1) ? n + (hi - lo + 1) : NaN, 0);
if (covered !== total || ranges[ranges.length - 1][1] !== total) {
  console.log(`::error:: shard ranges do not cover 1-${total} exactly: ${JSON.stringify(ranges)}`);
  process.exit(2);
}
console.log(`mutation sweep: ${total} entries in ${ranges.length} parallel shard(s): `
  + ranges.map(([a, b]) => `${a}-${b}`).join(", ") + "\n");

const started = Date.now();
const results = await Promise.all(ranges.map(([lo, hi], i) => new Promise((done) => {
  const child = spawn(process.execPath, [sweep, "--from", String(lo), "--to", String(hi)],
    { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  child.on("close", (code, signal) => {
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`==== shard ${i + 1}/${ranges.length} (entries ${lo}-${hi}) finished after ${mins} min, exit ${code}${signal ? " " + signal : ""} ====`);
    console.log(out.trimEnd() + "\n");
    done({ lo, hi, code, signal, out });
  });
})));

let caught = 0, survived = 0, errored = 0, notApplied = 0;
const problems = [];
for (const r of results) {
  const want = r.hi - r.lo + 1;
  const m = r.out.match(/Mutation sweep: (\d+)\/(\d+) caught, (\d+) survived, (\d+) errored, (\d+) did not apply(?: \(entries (\d+)-(\d+) of (\d+)\))?/);
  if (!m) { problems.push(`shard ${r.lo}-${r.hi} printed no summary (exit ${r.code})`); continue; }
  const [c, t, s, e, n] = m.slice(1, 6).map(Number);
  const named = m[6] !== undefined ? [Number(m[6]), Number(m[7]), Number(m[8])] : [1, total, total];
  if (t !== want || named[0] !== r.lo || named[1] !== r.hi || named[2] !== total) {
    problems.push(`shard ${r.lo}-${r.hi} reported ${t} entries for range ${named[0]}-${named[1]} of ${named[2]}`);
  }
  if (c + s + e + n !== t) problems.push(`shard ${r.lo}-${r.hi}: counts do not add up (${c}+${s}+${e}+${n} != ${t})`);
  if (r.code !== 0) problems.push(`shard ${r.lo}-${r.hi} exited ${r.code}${r.signal ? " (" + r.signal + ")" : ""}`);
  caught += c; survived += s; errored += e; notApplied += n;
}
const accounted = caught + survived + errored + notApplied;
if (accounted !== total) problems.push(`shards account for ${accounted} of ${total} entries`);

console.log(`Mutation sweep (${ranges.length} shards): ${caught}/${total} caught, ${survived} survived, `
  + `${errored} errored, ${notApplied} did not apply, ${total - accounted} unaccounted`);
problems.forEach((p) => console.log(`::error:: ${p}`));
process.exit(problems.length === 0 && caught === total ? 0 : 1);
