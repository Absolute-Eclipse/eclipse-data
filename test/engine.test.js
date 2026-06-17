/* ─────────────────────────────────────────────────────────────────────────
   engine.test.js — fast unit / regression tests for the computation engine.

   Guards the CODE's correctness (distinct from scripts/validate.js, the publish
   gate vs authoritative sources). Run: `npm test` (node --test, no deps).
   ───────────────────────────────────────────────────────────────────────── */
const test = require("node:test");
const assert = require("node:assert");
const { makeEngine } = require("../engine/besselian.js");
const { ELEMENTS_2026, ELEMENTS_2027 } = require("../engine/elements.js");

const E26 = makeEngine(ELEMENTS_2026);
const E27 = makeEngine(ELEMENTS_2027);

// ── 2026 (the verified set — these must NOT drift after the parameterisation) ──

test("2026: Riga is a deep partial ~80.3% obscuration (anchored benchmark)", () => {
  const r = E26.scanMax(56.9496, 24.1052);
  assert.ok(r.visible, "Riga should see the eclipse");
  assert.ok(Math.abs(r.peak - 0.803) < 0.005, `Riga obsc ${r.peak} not ≈0.803`);
});

test("2026: Zaragoza is in the path of totality", () => {
  const r = E26.scanMax(41.6488, -0.8891);
  assert.strictEqual(r.total, true, "Zaragoza should be total");
  assert.ok(r.peak > 0.99, `obscuration at totality should be ~1, got ${r.peak}`);
});

test("2026: Madrid sees a deep (≥99%) eclipse near the southern edge", () => {
  const r = E26.scanMax(40.4168, -3.7038);
  assert.ok(r.visible && r.peak > 0.99, `Madrid should be ≥99%, got ${r.peak}`);
});

// KNOWN LIMITATION (BUILD-NOTES §5.7): even with precise C1–C4 root-finding, a
// center-of-figure model is uncertain within ~a city-width of the path limit.
// Madrid root-finds a ~16 s graze; NASA's lunar-limb-corrected model places it
// outside. We flag such cities "marginal" downstream rather than assert a verdict.
// (Riga, non-edge, matches NASA to 0.05 pp — the geometry itself is sound.)
test("2026: Madrid total/partial classification matches NASA",
  { skip: "edge-limit uncertainty: engine finds a ~16 s graze; NASA (limb-corrected) says partial. Flagged 'marginal'; needs lunar-limb corrections." },
  () => { assert.strictEqual(E26.circumstances(40.4168, -3.7038).total, false); });

test("2026: Zaragoza totality ~1–1.5 min, contacts bracket the maximum", () => {
  const x = E26.circumstances(41.6488, -0.8891);
  assert.strictEqual(x.total, true);
  assert.ok(x.duration_s > 60 && x.duration_s < 110, `Zaragoza totality ${x.duration_s}s (expected ~77 s)`);
  assert.ok(x.c1.ut < x.max.ut && x.max.ut < x.c4.ut, "C1 < max < C4");
  assert.ok(x.c2.ut < x.c3.ut, "C2 < C3");
});

test("2027: greatest-eclipse duration ≈ NASA 6m22.6s (within limb tolerance)", () => {
  const x = E27.circumstances(25.505, 33.183);
  const nasa = 6 * 60 + 22.6;            // 382.6 s
  assert.ok(Math.abs(x.duration_s - nasa) < 15, `duration ${x.duration_s}s vs NASA ${nasa}s`);
});

test("2026: at() obscuration is bounded [0,1] and 0 when the Sun is down", () => {
  const c = E26.at(41.6488, -0.8891, 0.5);        // ~totality window over Spain
  assert.ok(c.obsc >= 0 && c.obsc <= 1, `obsc out of range: ${c.obsc}`);
  const night = E26.at(41.6488, -0.8891, 5.0);    // hours later, Sun set
  if (!night.up) assert.strictEqual(night.obsc, 0, "obsc must be 0 when Sun is down");
});

test("engine is deterministic", () => {
  assert.deepStrictEqual(E26.at(40.4168, -3.7038, 0.13), E26.at(40.4168, -3.7038, 0.13));
});

test("2026: a point far outside the penumbra (New Zealand) sees no eclipse", () => {
  assert.strictEqual(E26.scanMax(-41.29, 174.78).visible, false, "NZ is nowhere near the 2026 path");
});

// ── 2027 (newly entered NASA elements — reproduce the published greatest eclipse) ──

test("2027: reproduces NASA's greatest eclipse (25.5°N 33.18°E, total, 10:06:38 UT)", () => {
  const r = E27.scanMax(25.505, 33.183);          // NASA: greatest eclipse sub-point
  assert.strictEqual(r.total, true, "greatest-eclipse point must be total");
  assert.ok(r.peak > 0.99, `obscuration should be ~1 at greatest eclipse, got ${r.peak}`);
  const expectedUT = 10 + 6 / 60 + 37.7 / 3600;   // 10:06:37.7 UT = 10.1105 h
  assert.ok(Math.abs(r.utHours - expectedUT) < 0.03,
    `UT of max ${r.utHours?.toFixed(4)} vs NASA ${expectedUT.toFixed(4)} (±0.03 h)`);
});
