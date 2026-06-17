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

    return { at: at, scanMax: scanMax, utHoursOfT: utHoursOfT, elements: el };
  }

  var api = { makeEngine: makeEngine };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.EclipseEngine = api;
})();
