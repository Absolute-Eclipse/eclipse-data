/* ─────────────────────────────────────────────────────────────────────────
   validate.js — THE PUBLISH GATE.

   Compares engine output to authoritative sources (NASA SVS, Espenak/EclipseWise,
   Xavier Jubier, timeanddate) for benchmark points. Prints a residuals table.
   Exits NON-ZERO if any benchmark is missing or out of tolerance, so
   `npm run generate` refuses to produce data from an unverified engine.

   Each benchmark carries an `expected` object with the authoritative values
   (with a `source`). A benchmark with only `source` and no values = NOT YET
   ENTERED → fails the gate (by design).
   ───────────────────────────────────────────────────────────────────────── */
const { makeEngine } = require("../engine/besselian.js");
const { ELEMENTS } = require("../engine/elements.js");

const TOL = { obsc_pp: 0.2, alt_deg: 0.1, ut_h: 0.03 }; // ut_h ~1.8 min; tightens once C1–C4 are root-found

const BENCHMARKS = [
  { event: "2026", name: "Riga, LV (deep partial)", lat: 56.9496, lon: 24.1052,
    expected: { obsc: 0.803, source: "prior cross-check — reconfirm vs NASA SVS / timeanddate" } },
  { event: "2026", name: "Zaragoza, ES (totality, central belt)", lat: 41.6488, lon: -0.8891,
    expected: { source: "TODO: NASA SVS / Espenak" } },
  { event: "2026", name: "Palma de Mallorca, ES (sunset finale — edge/refraction)", lat: 39.5696, lon: 2.6502,
    expected: { source: "TODO: NASA SVS / Espenak" } },
  { event: "2026", name: "Reykjavík, IS (northern path; >60°N)", lat: 64.1466, lon: -21.9426,
    expected: { source: "TODO: NASA SVS / Espenak" } },
  { event: "2027", name: "Greatest eclipse (NASA sub-point)", lat: 25.505, lon: 33.183,
    expected: { total: true, obsc: 1.0, utHours: 10 + 6 / 60 + 37.7 / 3600,
      source: "NASA GSFC SE2027Aug02 — greatest eclipse 10:06:37.7 UT, 25°30.3'N 033°11.0'E" } }
];

const engines = {};
const engineFor = (ev) => (engines[ev] || (engines[ev] = makeEngine(ELEMENTS[ev])));
const pct = (x) => (x * 100).toFixed(2) + "%";

let failures = 0;
const rows = [];
for (const b of BENCHMARKS) {
  const exp = b.expected;
  const hasValues = ["obsc", "total", "utHours"].some((k) => exp[k] != null);
  if (!hasValues) { failures++; rows.push({ status: "MISSING", name: `[${b.event}] ${b.name}`, detail: "expected value not entered — " + exp.source }); continue; }

  const got = engineFor(b.event).scanMax(b.lat, b.lon);
  const parts = [], fails = [];
  if (exp.total != null) { const ok = got.total === exp.total; (ok ? parts : fails).push(`total ${got.total}=${exp.total}`); }
  if (exp.obsc != null) { const d = Math.abs(got.peak - exp.obsc) * 100; (d <= TOL.obsc_pp ? parts : fails).push(`obsc ${pct(got.peak)} vs ${pct(exp.obsc)} (Δ${d.toFixed(2)}pp)`); }
  if (exp.utHours != null) { const d = Math.abs((got.utHours ?? 1e9) - exp.utHours); (d <= TOL.ut_h ? parts : fails).push(`UT ${got.utHours?.toFixed(4)} vs ${exp.utHours.toFixed(4)} (Δ${(d * 60).toFixed(1)}min)`); }

  if (fails.length) { failures++; rows.push({ status: "FAIL", name: `[${b.event}] ${b.name}`, detail: fails.concat(parts).join("  ·  ") }); }
  else rows.push({ status: "PASS", name: `[${b.event}] ${b.name}`, detail: parts.join("  ·  ") });
}

console.log("\nEclipse engine validation — residuals\n" + "=".repeat(76));
for (const r of rows) console.log(`[${r.status.padEnd(7)}] ${r.name}\n          ${r.detail}`);
console.log("=".repeat(76));
console.log(`tolerances: obscuration ±${TOL.obsc_pp}pp · altitude ±${TOL.alt_deg}° · UT ±${(TOL.ut_h * 60).toFixed(0)}min (coarse until C1–C4)`);

if (failures > 0) {
  console.error(`\n✖ ${failures} benchmark(s) unverified/out of tolerance — DATA WILL NOT BE PUBLISHED.`);
  console.error("  Fill expected values from NASA SVS / Espenak and close the §5 gaps in BUILD-NOTES.md.\n");
  process.exit(1);
}
console.log("\n✔ all benchmarks within tolerance — engine cleared for data generation.\n");
