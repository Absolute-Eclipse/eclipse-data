/* ─────────────────────────────────────────────────────────────────────────
   validate.js — THE PUBLISH GATE.

   Compares engine output (precise circumstances) to authoritative sources for
   benchmark points. Prints residuals. Exits NON-ZERO if any REQUIRED benchmark is
   out of tolerance, so `npm run generate` refuses to produce data from an
   unverified engine.

   Benchmark kinds:
     • required  — has `expected` values from an authoritative source → PASS/FAIL.
     • pending   — `pending:true`, value not yet sourced → printed as PENDING,
                   does NOT block (transparent: shows what's still to validate).

   Current required set: NASA greatest-eclipse circumstances for BOTH eclipses
   (central totality, duration, time) + a far-partial obscuration cross-check
   (Riga). The geometry is identical everywhere, so these pin the elements + engine;
   the path-LIMIT edge is handled separately (marginal flag — BUILD-NOTES §5.7).
   ───────────────────────────────────────────────────────────────────────── */
const { makeEngine } = require("../engine/besselian.js");
const { ELEMENTS } = require("../engine/elements.js");

const TOL = { obsc_pp: 0.2, ut_h: 0.03, dur_s: 8 }; // dur_s loose: lunar-limb not modelled yet

const BENCHMARKS = [
  { event: "2026", name: "Riga, LV (deep partial, far from path)", lat: 56.9496, lon: 24.1052,
    expected: { obsc: 0.803, source: "cross-check vs NASA SVS / timeanddate" } },
  { event: "2026", name: "Greatest eclipse (NASA sub-point, N Atlantic)", lat: 65.2, lon: -25.2,
    expected: { total: true, obsc: 1.0, durationS: 138, utHours: 17 + 45 / 60 + 51 / 3600,
      source: "NASA GSFC SE2026Aug12 — 17:45:51 UT, 65.2°N 25.2°W, 02m18s" } },
  { event: "2027", name: "Greatest eclipse (NASA sub-point)", lat: 25.505, lon: 33.183,
    expected: { total: true, obsc: 1.0, durationS: 6 * 60 + 22.6, utHours: 10 + 6 / 60 + 37.7 / 3600,
      source: "NASA GSFC SE2027Aug02 — 10:06:37.7 UT, 25°30.3'N 033°11.0'E, 06m22.6s" } },
  // PENDING — authoritative per-city circumstances still to source (timeanddate blocked).
  { event: "2026", name: "Zaragoza, ES (mid-path city)", lat: 41.6488, lon: -0.8891, pending: true },
  { event: "2026", name: "Palma de Mallorca, ES (sunset finale)", lat: 39.5696, lon: 2.6502, pending: true },
  { event: "2026", name: "Reykjavík, IS (northern path; >60°N)", lat: 64.1466, lon: -21.9426, pending: true }
];

const engines = {};
const engineFor = (ev) => (engines[ev] || (engines[ev] = makeEngine(ELEMENTS[ev])));
const pct = (x) => (x * 100).toFixed(2) + "%";

let failures = 0, pending = 0;
const rows = [];
for (const b of BENCHMARKS) {
  if (b.pending) { pending++; rows.push({ status: "PENDING", name: `[${b.event}] ${b.name}`, detail: "authoritative value not yet sourced" }); continue; }
  const exp = b.expected, x = engineFor(b.event).circumstances(b.lat, b.lon);
  const ok = [], bad = [];
  if (exp.total != null) { (x.total === exp.total ? ok : bad).push(`total ${x.total}=${exp.total}`); }
  if (exp.obsc != null) { const d = Math.abs(x.max.obsc - exp.obsc) * 100; (d <= TOL.obsc_pp ? ok : bad).push(`obsc ${pct(x.max.obsc)} vs ${pct(exp.obsc)} (Δ${d.toFixed(2)}pp)`); }
  if (exp.durationS != null) { const d = Math.abs(x.duration_s - exp.durationS); (d <= TOL.dur_s ? ok : bad).push(`dur ${x.duration_s}s vs ${exp.durationS}s (Δ${d.toFixed(1)}s)`); }
  if (exp.utHours != null) { const d = Math.abs(x.max.ut - exp.utHours); (d <= TOL.ut_h ? ok : bad).push(`UT ${x.max.ut.toFixed(4)} vs ${exp.utHours.toFixed(4)} (Δ${(d * 60).toFixed(1)}min)`); }
  if (bad.length) { failures++; rows.push({ status: "FAIL", name: `[${b.event}] ${b.name}`, detail: bad.concat(ok).join("  ·  ") }); }
  else rows.push({ status: "PASS", name: `[${b.event}] ${b.name}`, detail: ok.join("  ·  ") });
}

console.log("\nEclipse engine validation — residuals\n" + "=".repeat(78));
for (const r of rows) console.log(`[${r.status.padEnd(7)}] ${r.name}\n          ${r.detail}`);
console.log("=".repeat(78));
console.log(`tolerances: obscuration ±${TOL.obsc_pp}pp · duration ±${TOL.dur_s}s (no limb yet) · UT ±${(TOL.ut_h * 60).toFixed(0)}min`);

if (failures > 0) {
  console.error(`\n✖ ${failures} required benchmark(s) out of tolerance — DATA WILL NOT BE PUBLISHED.\n`);
  process.exit(1);
}
console.log(`\n✔ all required benchmarks within tolerance — engine cleared for data generation.` +
  (pending ? `  (${pending} per-city benchmark(s) pending — informational.)` : "") + "\n");
