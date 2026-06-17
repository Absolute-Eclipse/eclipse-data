/* ─────────────────────────────────────────────────────────────────────────
   elements.js — Besselian elements per eclipse, with sources.

   Each element is a polynomial in t (hours from t0, TD). The fundamental-plane
   coordinates X, Y; shadow-axis declination D and ephemeris hour angle MU; the
   penumbral/umbral radii L1, L2; and the cone half-angles tan f1, tan f2.

   ⚠ The verified engine (besselian.js) currently has the 2026 set BAKED IN.
   These exported tables are (a) the documented source of truth and (b) what the
   engine will consume once it's parameterised — a milestone-1 task that MUST be
   re-validated against benchmarks afterwards (see ../BUILD-NOTES.md §5).
   ───────────────────────────────────────────────────────────────────────── */

const ELEMENTS_2026 = {
  date: "2026-08-12",
  t0_TD: "18:00:00",          // epoch of the elements (Terrestrial Dynamical Time)
  deltaT_seconds: 72.4,       // Espenak prediction; ~±1 s uncertainty (a prediction, not measured)
  source: "F. Espenak (EclipseWise / NASA)",
  X:  [0.47551, 0.51892, -0.00008, -0.00001],
  Y:  [0.77118, -0.23017, -0.00012, 0.0],
  D:  [14.7967, -0.0121, 0.0],
  L1: [0.53797, 0.00009, -0.00001],
  L2: [-0.00814, 0.00009, -0.00001],
  MU: [88.7478, 15.0031, 0.0],
  tanF1: 0.0046141,
  tanF2: 0.0045911,
  verified: true             // geometry spot-checked; see BUILD-NOTES §3
};

// ── 2027-08-02 — TO SOURCE. Do NOT generate 2027 data until these are entered
//    from Espenak AND pass scripts/validate.js. Placeholder kept null on purpose
//    so any accidental use fails loudly rather than emitting wrong numbers.
const ELEMENTS_2027 = {
  date: "2027-08-02",
  t0_TD: null,
  deltaT_seconds: null,       // Espenak prediction for 2027 (~70 s) — confirm
  source: "F. Espenak (EclipseWise / NASA) — NOT YET ENTERED",
  X: null, Y: null, D: null, L1: null, L2: null, MU: null, tanF1: null, tanF2: null,
  verified: false
};

const ELEMENTS = { "2026": ELEMENTS_2026, "2027": ELEMENTS_2027 };

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ELEMENTS, ELEMENTS_2026, ELEMENTS_2027 };
}
