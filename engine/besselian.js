/* ─────────────────────────────────────────────────────────────────────────
   besselian.js — local circumstances of a solar eclipse from Besselian elements.

   makeEngine(elements) → an engine bound to one eclipse's elements:
     .at(lat, lonEast, t)  instantaneous {obsc, mag, alt, total, up} at
                           t = hours from t0 (TD).
     .scanMax(lat, lon)    peak eclipse while the Sun is up.
     .circumstances(lat,lon) OBSERVED local circumstances — contacts C1–C4,
                           totality duration, and the maximum *while the Sun is
                           above the horizon* (sunset-aware), with a sunsetCut flag.
     .utHoursOfT(t)        UT (decimal hours) of a given t  (UT = TD − ΔT).

   Geometry is the verified Espenak/Meeus formulation (unchanged). Two correctness
   guards added: (1) all scans stay within the elements' VALIDITY WINDOW
   (el.validHalfWindow hours around t0) — extrapolating the polynomials past it
   produces garbage; (2) maxima/contacts are clamped to when the Sun is actually up,
   so below-horizon events (sunset eclipses, e.g. Sicily) are never reported as seen.

   NOT YET DONE: atmospheric refraction + Sun semidiameter (horizon is geometric);
   lunar-limb corrections at the path limit (near-limit cities flagged 'marginal').

   Runs in Node (module.exports) and the browser (window.EclipseEngine).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  var RAD = Math.PI / 180, FLAT = 0.99664719;
  function poly(c, t) { var s = 0; for (var i = c.length - 1; i >= 0; i--) s = s * t + c[i]; return s; }
  function hoursOf(hhmmss) { var p = String(hhmmss).split(":"); return (+p[0]) + (+p[1] || 0) / 60 + (+p[2] || 0) / 3600; }
  function overlap(Rs, Rm, d) {
    if (d >= Rs + Rm) return 0;
    if (d <= Math.abs(Rm - Rs)) return Math.PI * Math.pow(Math.min(Rs, Rm), 2);
    var a1 = Rs * Rs * Math.acos((d * d + Rs * Rs - Rm * Rm) / (2 * d * Rs)), a2 = Rm * Rm * Math.acos((d * d + Rm * Rm - Rs * Rs) / (2 * d * Rm)),
        a3 = 0.5 * Math.sqrt(Math.max(0, (-d + Rs + Rm) * (d + Rs - Rm) * (d - Rs + Rm) * (d + Rs + Rm)));
    return a1 + a2 - a3;
  }

  function makeEngine(el) {
    if (!el || !Array.isArray(el.X)) throw new Error("makeEngine: missing/invalid elements (" + (el && el.date) + ")");
    var t0 = hoursOf(el.t0_TD), dtH = (el.deltaT_seconds || 0) / 3600, TANF1 = el.tanF1, TANF2 = el.tanF2;
    var WIN = el.validHalfWindow || 3;                       // hours either side of t0 the elements are valid

    function geom(lat, lon, t) {
      var x = poly(el.X, t), y = poly(el.Y, t), d = poly(el.D, t) * RAD, mu = poly(el.MU, t), l1 = poly(el.L1, t), l2 = poly(el.L2, t);
      var phi = lat * RAD, u = Math.atan(FLAT * Math.tan(phi)), rs = FLAT * Math.sin(u), rc = Math.cos(u);
      var H = (mu + lon) * RAD;                               // verified: H = mu + lon_east
      var xi = rc * Math.sin(H), eta = rs * Math.cos(d) - rc * Math.sin(d) * Math.cos(H), zeta = rs * Math.sin(d) + rc * Math.cos(d) * Math.cos(H);
      return { m: Math.hypot(x - xi, y - eta), l1p: l1 - zeta * TANF1, l2p: l2 - zeta * TANF2, zeta: zeta };
    }
    function at(lat, lon, t) {
      var g = geom(lat, lon, t), alt = Math.asin(Math.max(-1, Math.min(1, g.zeta))) / RAD;
      if (g.zeta <= 0) return { obsc: 0, mag: 0, alt: alt, total: false, up: false };
      var Rs = (g.l1p + g.l2p) / 2, Rm = (g.l1p - g.l2p) / 2, mag = (g.l1p - g.m) / (g.l1p + g.l2p);
      var obsc = mag > 0 ? Math.max(0, Math.min(1, overlap(Rs, Rm, g.m) / (Math.PI * Rs * Rs))) : 0;
      return { obsc: obsc, mag: mag, alt: alt, total: (g.l2p < 0 && g.m <= -g.l2p), up: true };
    }
    function utHoursOfT(t) { return t0 + t - dtH; }            // UT = TD − ΔT

    function scanMax(lat, lon) {
      var best = null, STEP = 0.5 / 60;
      for (var t = -WIN; t <= WIN; t += STEP) {               // within validity window only
        var c = at(lat, lon, t);
        if (c.up && (best === null || c.mag > best.mag)) best = { mag: c.mag, obsc: c.obsc, total: c.total, alt: c.alt, t: t };
      }
      if (!best || best.mag <= 0) return { visible: false, peak: 0, total: false, alt: -99, t: null, utHours: null };
      return { visible: true, peak: best.obsc, total: best.total, alt: best.alt, t: best.t, utHours: utHoursOfT(best.t) };
    }

    // Observed local circumstances. Contacts are roots of m = L1' (C1/C4) and
    // m = −L2' (C2/C3); the maximum and the totality window are clamped to when the
    // Sun is above the horizon (zeta > 0), so sunset eclipses report what's seen.
    function circumstances(lat, lon) {
      var STEP = 0.5 / 60, T0 = -WIN, T1 = WIN;
      var g1 = function (t) { var g = geom(lat, lon, t); return g.m - g.l1p; };
      var f2 = function (t) { var g = geom(lat, lon, t); return g.m + g.l2p; };
      var mOf = function (t) { return geom(lat, lon, t).m; };
      var zOf = function (t) { return geom(lat, lon, t).zeta; };
      var altAt = function (t) { return Math.asin(Math.max(-1, Math.min(1, zOf(t)))) / RAD; };
      var obscAt = function (t) { var g = geom(lat, lon, t); if (g.l1p + g.l2p === 0) return 0; var Rs = (g.l1p + g.l2p) / 2, Rm = (g.l1p - g.l2p) / 2, mag = (g.l1p - g.m) / (g.l1p + g.l2p); return mag > 0 ? Math.max(0, Math.min(1, overlap(Rs, Rm, g.m) / (Math.PI * Rs * Rs))) : 0; };
      var bisect = function (f, a, b) { var fa = f(a); for (var i = 0; i < 80; i++) { var md = (a + b) / 2, fm = f(md); if (fa * fm <= 0) b = md; else { a = md; fa = fm; } if (b - a < 1e-10) break; } return (a + b) / 2; };
      var ternMin = function (a, b) { for (var i = 0; i < 80; i++) { var m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (mOf(m1) < mOf(m2)) b = m2; else a = m1; if (b - a < 1e-10) break; } return (a + b) / 2; };

      var prevT = T0, pg1 = g1(T0), pf2 = f2(T0), pz = zOf(T0);
      var c1 = null, c4 = null, c2 = null, c3 = null, minM = Infinity, tGeo = null, sunset = null, sunrise = null, sawUpEclipse = false;
      for (var t = T0 + STEP; t <= T1 + 1e-9; t += STEP) {
        var g = geom(lat, lon, t), cg1 = g.m - g.l1p, cf2 = g.m + g.l2p, cz = g.zeta;
        if (g.m < minM) { minM = g.m; tGeo = t; }
        if (cz > 0 && cg1 < 0) sawUpEclipse = true;            // Sun up AND inside penumbra
        if (pg1 > 0 && cg1 <= 0 && c1 === null) c1 = bisect(g1, prevT, t);
        if (pg1 < 0 && cg1 >= 0) c4 = bisect(g1, prevT, t);
        if (pf2 > 0 && cf2 <= 0 && c2 === null) c2 = bisect(f2, prevT, t);
        if (pf2 < 0 && cf2 >= 0) c3 = bisect(f2, prevT, t);
        if (pz > 0 && cz <= 0) sunset = bisect(zOf, prevT, t);
        if (pz <= 0 && cz > 0) sunrise = bisect(zOf, prevT, t);
        prevT = t; pg1 = cg1; pf2 = cf2; pz = cz;
      }
      if (c1 === null || !sawUpEclipse) return { visible: false, eclipse: c1 !== null };

      tGeo = ternMin(tGeo - STEP, tGeo + STEP);

      // observable window = [C1,C4] clamped to Sun-up
      var obsStart = zOf(c1) > 0 ? c1 : ((sunrise != null && sunrise < c4) ? sunrise : null);
      var obsEnd = zOf(c4) > 0 ? c4 : ((sunset != null && sunset > c1) ? sunset : null);
      if (obsStart == null || obsEnd == null || obsStart >= obsEnd) return { visible: false, eclipse: true };

      var tObs = (tGeo >= obsStart && tGeo <= obsEnd) ? tGeo
               : (Math.abs(tGeo - obsStart) < Math.abs(tGeo - obsEnd) ? obsStart : obsEnd);
      var sunsetCut = tObs !== tGeo;

      var durObs = 0;
      if (c2 != null && c3 != null) { var s = Math.max(c2, obsStart), e = Math.min(c3, obsEnd); if (e > s) durObs = Math.round((e - s) * 3600); }

      var contact = function (tc) { return tc == null ? null : { ut: utHoursOfT(tc), alt: +Math.max(0, altAt(tc)).toFixed(2), up: zOf(tc) > 0 }; };
      var gObs = geom(lat, lon, tObs);
      return {
        visible: true, eclipse: true, total: durObs > 0, sunsetCut: sunsetCut,
        max: { ut: utHoursOfT(tObs), obsc: obscAt(tObs), mag: (gObs.l1p - gObs.m) / (gObs.l1p + gObs.l2p), alt: +Math.max(0, altAt(tObs)).toFixed(2), up: zOf(tObs) > 0 },
        c1: contact(c1), c2: contact(c2), c3: contact(c3), c4: contact(c4),
        duration_s: durObs
      };
    }

    return { at: at, scanMax: scanMax, circumstances: circumstances, utHoursOfT: utHoursOfT, elements: el };
  }

  var api = { makeEngine: makeEngine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EclipseEngine = api;
})();
