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

// ── 2027-08-02 — transcribed from NASA GSFC (SE2027Aug02Tbeselm), cross-checked
//    against the SEdata extraction. STILL UNVERIFIED through our engine: the
//    engine must be parameterised to accept an element set, then reproduce NASA's
//    published greatest-eclipse circumstances (below) before verified → true.
//    Until then generate.js refuses to emit 2027 data.
const ELEMENTS_2027 = {
  date: "2027-08-02",
  t0_TD: "10:00:00",          // reference time (TDT)
  deltaT_seconds: 71.7,       // NASA/Espenak
  source: "NASA GSFC / F. Espenak — SE2027Aug02Tbeselm (transcribed + cross-checked)",
  X:  [-0.019645, 0.5447105, -0.0000444, -0.0000091],
  Y:  [0.160063, -0.2111569, -0.0001217, 0.0000037],
  D:  [17.76247, -0.010181, -0.000004],
  L1: [0.530596, 0.0000138, -0.0000128],
  L2: [-0.015464, 0.0000137, -0.0000128],
  MU: [328.42249, 15.002093, 0.0],
  tanF1: 0.0046064,
  tanF2: 0.0045834,
  verified: false,            // greatest eclipse REPRODUCED (below); still false pending
                              // duration (contacts) + edge checks before publication.
  // NASA benchmark — REPRODUCED 2026-06-17 (total, obsc 100%, UT within 0.7 min):
  //   greatest eclipse 10:06:37.7 UT at 25°30.3'N, 033°11.0'E;
  //   central duration 6m22.6s; path width 257.7 km; Saros 136.
};

const ELEMENTS = { "2026": ELEMENTS_2026, "2027": ELEMENTS_2027 };

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ELEMENTS, ELEMENTS_2026, ELEMENTS_2027 };
}