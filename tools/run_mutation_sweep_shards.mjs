// Run the mutation sweep as K parallel, INTERLEAVED shards (--shard i/K).
//
// Why: the single sweep re-runs each entry's observer suites one after
// another and took ~67 minutes in CI. The entries are independent and each
// shard copies its own sandbox, so shards can run side by side on the
// runner's cores. They are interleaved (shard i takes entries i, i+K, i+2K,
// ...), not contiguous: the first CI run of this runner used three equal
// contiguous ranges and took 63.6 minutes, because the slow rendered
// observers cluster at the end of the manifest (entries 1-268 took 2.4 min,
// 269-536 2.3 min, 537-802 63.6 min). Interleaving spreads them evenly.
//
// The sweep still decides every verdict. What this file guarantees is that
// sharding cannot quietly lose coverage:
//
//   * the manifest size is read from the sweep itself (`--list`), so an entry
//     added later can never fall outside every shard;
//   * shards 1..K of "i/K" partition 1..N by construction, and each shard's
//     summary must account for exactly its expected share;
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
// Shard i of k holds entries i, i+k, ...: floor((total - i) / k) + 1 of them.
const shares = Array.from({ length: k }, (_, j) => Math.floor((total - (j + 1)) / k) + 1);
if (shares.reduce((a, b) => a + b, 0) !== total) {
  console.log(`::error:: shard shares ${JSON.stringify(shares)} do not sum to ${total}`);
  process.exit(2);
}
console.log(`mutation sweep: ${total} entries interleaved across ${k} parallel shard(s): `
  + shares.map((n, j) => `${j + 1}/${k} (${n})`).join(", ") + "\n");

const started = Date.now();
const results = await Promise.all(shares.map((want, j) => new Promise((done) => {
  const tag = `${j + 1}/${k}`;
  const child = spawn(process.execPath, [sweep, "--shard", tag],
    { env: process.env, stdio: ["ignore", "pipe", "pipe"] });
  let out = "";
  child.stdout.on("data", (d) => { out += d; });
  child.stderr.on("data", (d) => { out += d; });
  child.on("close", (code, signal) => {
    const mins = ((Date.now() - started) / 60000).toFixed(1);
    console.log(`==== shard ${tag} (${want} entries) finished after ${mins} min, exit ${code}${signal ? " " + signal : ""} ====`);
    console.log(out.trimEnd() + "\n");
    done({ tag, want, code, signal, out });
  });
})));

let caught = 0, survived = 0, errored = 0, notApplied = 0;
const problems = [];
for (const r of results) {
  const m = r.out.match(/Mutation sweep: (\d+)\/(\d+) caught, (\d+) survived, (\d+) errored, (\d+) did not apply \(shard (\d+\/\d+): (\d+) of (\d+)\)/);
  if (!m) { problems.push(`shard ${r.tag} printed no summary (exit ${r.code})`); continue; }
  const [c, t, s, e, n] = m.slice(1, 6).map(Number);
  if (m[6] !== r.tag || t !== r.want || Number(m[7]) !== r.want || Number(m[8]) !== total) {
    problems.push(`shard ${r.tag} reported ${t} entries as shard ${m[6]} (${m[7]} of ${m[8]}); expected ${r.want} of ${total}`);
  }
  if (c + s + e + n !== t) problems.push(`shard ${r.tag}: counts do not add up (${c}+${s}+${e}+${n} != ${t})`);
  if (r.code !== 0) problems.push(`shard ${r.tag} exited ${r.code}${r.signal ? " (" + r.signal + ")" : ""}`);
  caught += c; survived += s; errored += e; notApplied += n;
}
const accounted = caught + survived + errored + notApplied;
if (accounted !== total) problems.push(`shards account for ${accounted} of ${total} entries`);

console.log(`Mutation sweep (${k} shards): ${caught}/${total} caught, ${survived} survived, `
  + `${errored} errored, ${notApplied} did not apply, ${total - accounted} unaccounted`);
problems.forEach((p) => console.log(`::error:: ${p}`));
process.exit(problems.length === 0 && caught === total ? 0 : 1);
