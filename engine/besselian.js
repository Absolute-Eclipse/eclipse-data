/* ─────────────────────────────────────────────────────────────────────────
   besselian.js — local circumstances of a solar eclipse from Besselian elements.

   makeEngine(elements) → an engine bound to one eclipse's elements:
     .at(lat, lonEast, t)  instantaneous {obsc, mag, alt, total, up} at
                           t = hours from t0 (TD).
     .scanMax(lat, lon)    the point's peak eclipse over ±3.5 h around t0 →
                           {visible, peak(obsc), total, alt, t, utHours}.
     .utHoursOfT(t)        UT (decimal hours) of a given t  (UT = TD − ΔT).

   The GEOMETRY is unchanged from the verified original (Espenak/Meeus): observer
   on the WGS84-flattening ellipsoid, H = μ + lon_east, ξ/η/ζ, L1'/L2' corrected
   by ζ·tan f, magnitude (L1'−m)/(L1'+L2'), obscuration = circle-overlap area,
   totality when L2'<0 and m ≤ −L2'. Only the *element source* is now a parameter,
   so 2026 and 2027 share one validated code path. Re-validated after this change:
   2026 results unchanged (Riga 80.3%, Zaragoza total, …) — see test/ and BUILD-NOTES.

   NOT YET DONE (do not claim until closed): atmospheric refraction + Sun
   semidiameter at low altitude; Sun AZIMUTH; contact-time root-finding C1–C4
   (scanMax is a 0.5-min scan ⇒ ±30 s, NOT ±2 s).

   Runs in Node (module.exports) and the browser (window.EclipseEngine).
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  var RAD = Math.PI / 180, FLAT = 0.99664719;
  function poly(c, t) { var s = 0; for (var i = c.length - 1; i >= 0; i--) s = s * t + c[i]; return s; }
  function hoursOf(hhmmss) { var p = String(hhmmss).split(":"); return (+p[0]) + (+p[1] || 0) / 60 + (+p[2] || 0) / 3600; }

  function makeEngine(el) {
    if (!el || !Array.isArray(el.X)) throw new Error("makeEngine: missing/invalid elements (" + (el && el.date) + ")");
    var t0 = hoursOf(el.t0_TD), dtH = (el.deltaT_seconds || 0) / 3600;
    var TANF1 = el.tanF1, TANF2 = el.tanF2;

    function geom(lat, lon, t) {
      var x = poly(el.X, t), y = poly(el.Y, t), d = poly(el.D, t) * RAD, mu = poly(el.MU, t), l1 = poly(el.L1, t), l2 = poly(el.L2, t);
      var phi = lat * RAD, u = Math.atan(FLAT * Math.tan(phi)), rs = FLAT * Math.sin(u), rc = Math.cos(u);
      var H = (mu + lon) * RAD;                              // verified: H = mu + lon_east
      var xi = rc * Math.sin(H), eta = rs * Math.cos(d) - rc * Math.sin(d) * Math.cos(H), zeta = rs * Math.sin(d) + rc * Math.cos(d) * Math.cos(H);
      return { m: Math.hypot(x - xi, y - eta), l1p: l1 - zeta * TANF1, l2p: l2 - zeta * TANF2, zeta: zeta };
    }
    function overlap(Rs, Rm, d) {
      if (d >= Rs + Rm) return 0;
      if (d <= Math.abs(Rm - Rs)) return Math.PI * Math.pow(Math.min(Rs, Rm), 2);
      var a1 = Rs * Rs * Math.acos((d * d + Rs * Rs - Rm * Rm) / (2 * d * Rs)), a2 = Rm * Rm * Math.acos((d * d + Rm * Rm - Rs * Rs) / (2 * d * Rm)),
          a3 = 0.5 * Math.sqrt(Math.max(0, (-d + Rs + Rm) * (d + Rs - Rm) * (d - Rs + Rm) * (d + Rs + Rm)));
      return a1 + a2 - a3;
    }
    function at(lat, lon, t) {
      var g = geom(lat, lon, t), alt = Math.asin(Math.max(-1, Math.min(1, g.zeta))) / RAD;
      if (g.zeta <= 0) return { obsc: 0, mag: 0, alt: alt, total: false, up: false };
      var Rs = (g.l1p + g.l2p) / 2, Rm = (g.l1p - g.l2p) / 2, mag = (g.l1p - g.m) / (g.l1p + g.l2p);
      var obsc = mag > 0 ? Math.max(0, Math.min(1, overlap(Rs, Rm, g.m) / (Math.PI * Rs * Rs))) : 0;
      return { obsc: obsc, mag: mag, alt: alt, total: (g.l2p < 0 && g.m <= -g.l2p), up: true };
    }
    function utHoursOfT(t) { return t0 + t - dtH; }          // UT = TD − ΔT

    function scanMax(lat, lon) {
      var best = null, STEP = 0.5 / 60, T = 3.5;              // 0.5-min steps over ±3.5 h around t0
      for (var t = -T; t <= T; t += STEP) {
        var c = at(lat, lon, t);
        if (c.up && (best === null || c.mag > best.mag)) best = { mag: c.mag, obsc: c.obsc, total: c.total, alt: c.alt, t: t };
      }
      if (!best || best.mag <= 0) return { visible: false, peak: 0, total: false, alt: -99, t: null, utHours: null };
      return { visible: true, peak: best.obsc, total: best.total, alt: best.alt, t: best.t, utHours: utHoursOfT(best.t) };
    }

    // Precise local circumstances via root-finding (not a coarse scan):
    //   partial boundary  C1,C4 : m = L1'      (penumbra tangent)
    //   umbral boundary   C2,C3 : m = −L2'     (umbra tangent; only if total)
    //   maximum eclipse          : min m       (closest approach of the shadow axis)
    // Contacts are GEOMETRIC (NASA-table convention); each carries the Sun's
    // altitude + an `up` flag so a below-horizon contact (sunset eclipse) is visible.
    function circumstances(lat, lon) {
      var STEP = 0.5 / 60, T0 = -3.5, T1 = 3.5;
      var g1 = function (t) { var g = geom(lat, lon, t); return g.m - g.l1p; };
      var f2 = function (t) { var g = geom(lat, lon, t); return g.m + g.l2p; };
      var mOf = function (t) { return geom(lat, lon, t).m; };
      var altAt = function (t) { return Math.asin(Math.max(-1, Math.min(1, geom(lat, lon, t).zeta))) / RAD; };
      var upAt = function (t) { return geom(lat, lon, t).zeta > 0; };
      var bisect = function (f, a, b) { var fa = f(a); for (var i = 0; i < 80; i++) { var mid = (a + b) / 2, fm = f(mid); if (fa * fm <= 0) b = mid; else { a = mid; fa = fm; } if (b - a < 1e-10) break; } return (a + b) / 2; };

      var prevT = T0, pg1 = g1(T0), pf2 = f2(T0), minM = Infinity, tMax = null;
      var c1 = null, c4 = null, c2 = null, c3 = null;
      for (var t = T0 + STEP; t <= T1 + 1e-9; t += STEP) {
        var g = geom(lat, lon, t), cg1 = g.m - g.l1p, cf2 = g.m + g.l2p;
        if (g.m < minM) { minM = g.m; tMax = t; }
        if (pg1 > 0 && cg1 <= 0 && c1 === null) c1 = bisect(g1, prevT, t);
        if (pg1 < 0 && cg1 >= 0) c4 = bisect(g1, prevT, t);
        if (pf2 > 0 && cf2 <= 0 && c2 === null) c2 = bisect(f2, prevT, t);
        if (pf2 < 0 && cf2 >= 0) c3 = bisect(f2, prevT, t);
        prevT = t; pg1 = cg1; pf2 = cf2;
      }
      if (c1 === null) return { visible: false, eclipse: false };       // never within penumbra

      var a = tMax - STEP, b = tMax + STEP;                             // refine max (min m) by ternary search
      for (var i = 0; i < 80; i++) { var m1 = a + (b - a) / 3, m2 = b - (b - a) / 3; if (mOf(m1) < mOf(m2)) b = m2; else a = m1; if (b - a < 1e-10) break; }
      tMax = (a + b) / 2;
      var mx = at(lat, lon, tMax);
      var contact = function (tc) { return tc == null ? null : { ut: utHoursOfT(tc), alt: +altAt(tc).toFixed(2), up: upAt(tc) }; };
      return {
        visible: mx.up || upAt(c1) || (c4 != null && upAt(c4)),
        eclipse: true, total: mx.total,
        max: { ut: utHoursOfT(tMax), obsc: mx.obsc, mag: mx.mag, alt: +mx.alt.toFixed(2), up: mx.up },
        c1: contact(c1), c2: contact(c2), c3: contact(c3), c4: contact(c4),
        duration_s: (c2 != null && c3 != null) ? Math.round((c3 - c2) * 3600) : 0
      };
    }

    return { at: at, scanMax: scanMax, circumstances: circumstances, utHoursOfT: utHoursOfT, elements: el };
  }

  var api = { makeEngine: makeEngine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EclipseEngine = api;
})();
