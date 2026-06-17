/* ─────────────────────────────────────────────────────────────────────────
   validate.js — THE PUBLISH GATE.

   Compares engine output to authoritative sources (NASA SVS, Espenak/EclipseWise,
   Xavier Jubier, timeanddate) for a fixed set of benchmark points. Prints a
   residuals table. Exits NON-ZERO if any benchmark is missing or out of tolerance,
   so `npm run generate` refuses to produce data from an unverified engine.

   STATUS: scaffold. Benchmark EXPECTED values must be filled from the authoritative
   sources (do not invent them). One real spot-check (Riga obscuration) is seeded
   from prior verification; the rest are marked TODO and will FAIL the gate until
   entered — which is the point.
   ───────────────────────────────────────────────────────────────────────── */
const Eclipse = require("../engine/besselian.js");

const TOL = { contact_s: 2, obsc_pct: 0.2, alt_deg: 0.1 };

// Each benchmark: a point + the authoritative expected values (with their source).
// `expected.obsc` is a fraction (0–1). `null` = NOT YET ENTERED → fails the gate.
const BENCHMARKS = [
  {
    name: "Riga, LV (deep partial)",
    lat: 56.9496, lon: 24.1052,
    expected: { obsc: 0.803, alt: null, source: "prior cross-check — re-confirm vs NASA SVS / timeanddate" }
  },
  {
    name: "Zaragoza, ES (totality, central belt)",
    lat: 41.6488, lon: -0.8891,
    expected: { obsc: null, c2_utc: null, c3_utc: null, alt: null, source: "TODO: NASA SVS / Espenak" }
  },
  {
    name: "Palma de Mallorca, ES (sunset finale — edge/refraction case)",
    lat: 39.5696, lon: 2.6502,
    expected: { obsc: null, c2_utc: null, alt: null, source: "TODO: NASA SVS / Espenak" }
  },
  {
    name: "Reykjavík, IS (northern path; >60°N — DEM/refraction note)",
    lat: 64.1466, lon: -21.9426,
    expected: { obsc: null, alt: null, source: "TODO: NASA SVS / Espenak" }
  }
  // + path-limit edge points (just-in / just-out) to be added.
];

function pct(x) { return (x * 100).toFixed(2) + "%"; }

let failures = 0;
const rows = [];
for (const b of BENCHMARKS) {
  const got = Eclipse.scanMax(b.lat, b.lon);        // NOTE: obsc only ±30 s peak today; contacts pending
  const exp = b.expected;
  let status, detail;

  if (exp.obsc == null) {
    status = "MISSING"; failures++;
    detail = "expected value not entered — " + exp.source;
  } else {
    const dObsc = Math.abs(got.peak - exp.obsc) * 100;
    const ok = dObsc <= TOL.obsc_pct;
    if (!ok) failures++;
    status = ok ? "PASS" : "FAIL";
    detail = `obsc got ${pct(got.peak)} vs exp ${pct(exp.obsc)}  (Δ ${dObsc.toFixed(2)} pp, tol ${TOL.obsc_pct})`;
  }
  rows.push({ benchmark: b.name, status, detail });
}

console.log("\nEclipse engine validation — residuals\n" + "=".repeat(72));
for (const r of rows) console.log(`[${r.status.padEnd(7)}] ${r.benchmark}\n          ${r.detail}`);
console.log("=".repeat(72));
console.log(`tolerances: contacts ±${TOL.contact_s}s · obscuration ±${TOL.obsc_pct}pp · altitude ±${TOL.alt_deg}°`);

if (failures > 0) {
  console.error(`\n✖ ${failures} benchmark(s) unverified/out of tolerance — DATA WILL NOT BE PUBLISHED.`);
  console.error("  Fill expected values from NASA SVS / Espenak and close the §5 gaps in BUILD-NOTES.md.\n");
  process.exit(1);
}
console.log("\n✔ all benchmarks within tolerance — engine cleared for data generation.\n");
