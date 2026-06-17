/* ─────────────────────────────────────────────────────────────────────────
   engine.test.js — fast unit / regression tests for the computation engine.

   These guard the CODE's internal correctness and stop regressions; they are
   distinct from scripts/validate.js, which is the PUBLISH GATE that checks
   output against authoritative external sources (NASA/Espenak). Both must hold.

   Run: `npm test`  (node --test, built in — no dependencies).
   ───────────────────────────────────────────────────────────────────────── */
const test = require("node:test");
const assert = require("node:assert");
const Eclipse = require("../engine/besselian.js");

test("Riga is a deep partial ~80.3% obscuration (anchored benchmark)", () => {
  const r = Eclipse.scanMax(56.9496, 24.1052);
  assert.ok(r.visible, "Riga should see the eclipse");
  assert.ok(Math.abs(r.peak - 0.803) < 0.005, `Riga obsc ${r.peak} not ≈0.803`);
});

test("Zaragoza is in the path of totality", () => {
  const r = Eclipse.scanMax(41.6488, -0.8891);
  assert.strictEqual(r.total, true, "Zaragoza should be total");
  assert.ok(r.peak > 0.99, `obscuration at totality should be ~1, got ${r.peak}`);
});

test("Madrid is a deep partial but NOT totality (path gate)", () => {
  const r = Eclipse.scanMax(40.4168, -3.7038);
  assert.strictEqual(r.total, false, "Madrid is just outside the path");
  assert.ok(r.peak > 0.99 && r.peak < 1.0, `Madrid should be deep-but-not-total, got ${r.peak}`);
});

test("at(): obscuration is bounded [0,1] and is 0 when the Sun is below the horizon", () => {
  const c = Eclipse.at(41.6488, -0.8891, Eclipse.tOfMinute(59)); // ~totality window
  assert.ok(c.obsc >= 0 && c.obsc <= 1, `obsc out of range: ${c.obsc}`);
  const night = Eclipse.at(41.6488, -0.8891, Eclipse.tOfMinute(600)); // hours later, Sun set
  if (!night.up) assert.strictEqual(night.obsc, 0, "obsc must be 0 when Sun is down");
});

test("engine is deterministic", () => {
  const a = Eclipse.at(40.4168, -3.7038, 0.13);
  const b = Eclipse.at(40.4168, -3.7038, 0.13);
  assert.deepStrictEqual(a, b);
});

test("a point far outside the penumbra (New Zealand) sees no eclipse", () => {
  const r = Eclipse.scanMax(-41.29, 174.78);
  assert.strictEqual(r.visible, false, "NZ is nowhere near the 2026 path");
});
