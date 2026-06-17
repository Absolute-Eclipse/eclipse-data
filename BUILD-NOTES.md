# Build notes & methodology — Eclipse Data

This is the engineering log: how the data is computed, where every input comes
from, what we validated it against, and the decisions made along the way. It is
kept deliberately public — the transparency *is* the credibility. The methodology
article on absoluteeclipse.eu is drawn from this document.

**Guiding principle:** publish nothing we haven't verified, and show the residuals.

---

## 1. What we compute

For any observer (lat, lon) and time we derive the **local circumstances** of the
eclipse from its **Besselian elements**:

- **magnitude** `m_e = (L1' − m) / (L1' + L2')` — fraction of the Sun's *diameter* covered.
- **obscuration** — fraction of the Sun's *area* covered, via the area of overlap of
  two circles (Sun radius `Rs = (L1'+L2')/2`, Moon radius `Rm = (L1'−L2')/2`,
  separation `m`).
- **totality** — when `L2' < 0` and `m ≤ −L2'`.
- **Sun altitude** — from `ζ` (the observer's distance above the fundamental plane).
- **contact times** C1–C4 *(in progress — see §4)*.

The geometry (observer on the WGS84-flattening ellipsoid, hour angle
`H = μ + lon_east`, ξ/η/ζ, the L1'/L2' correction by `ζ·tan f`) is the standard
Espenak/Meeus formulation. References: Espenak & Meeus, *Five Millennium Canon of
Solar Eclipses*; the *Explanatory Supplement to the Astronomical Almanac*.

## 2. Sources (every input, with its provenance)

| Input | Source | Licence / note |
|---|---|---|
| Besselian elements, 2026-08-12 | F. Espenak (EclipseWise / NASA) — t0 = 18:00 TD | element table in `engine/elements.js` |
| Besselian elements, 2027-08-02 | **TO SOURCE** (Espenak) — *not yet entered* | gate: do not generate 2027 data until filled + validated |
| ΔT (2026) | 72.4 s (Espenak prediction) | a *prediction*; ~±1 s uncertainty → affects UT↔TD. Document, don't hide. |
| Cities | GeoNames `cities15000`, Europe filter | CC-BY-4.0; gives name/lat/lon/country/**timezone**/population |
| Local-time conversion | GeoNames timezone field + IANA tz | needed to turn UT contacts into correct local clock times |
| Elevation / horizon | Copernicus DEM GLO-30 (global, incl. Iceland); SRTM (≤60°N) / ASTER as fallback | open, attribution; **phase 2** |

## 3. The engine

- `engine/besselian.js` — a verified JS port of the original Python reference
  (`eclipse_compute.py`). Same geometry; runs in Node (`module.exports`) and the
  browser (`window.Eclipse`).
- **Hard-won correctness facts** (kept here so they are never re-broken):
  - observer hour angle `H = μ + lon_east` (east-positive longitudes).
  - magnitude uses `L2'` **negative** for a total eclipse (the `+`, not `−`, was the bug).
  - obscuration is the circle-overlap **area**, not a diameter ratio.
- **Spot-checks already passing** (to be folded into the formal suite, §4):
  Riga ≈ 0.839 mag / **80.3 % obscuration**; several northern-Spain cities total
  with plausible low Sun altitudes; NASA central-line point total near 20:30 with
  Sun ≈ 7°.

## 4. Verification protocol (the publish gate)

Data is generated **only** after `scripts/validate.js` passes. Benchmarks compare
engine output to authoritative sources (NASA SVS interactive map, Espenak/EclipseWise,
Xavier Jubier's interactive maps, timeanddate) for a fixed set of points:
central-line points, named cities, and **edge cases** (path limits; the Balearic
sunset finale where the Sun sets *during* totality).

**Tolerances (proposed — refine as we validate):**

| Quantity | Tolerance |
|---|---|
| Contact times C1–C4 | ± 2 s |
| Magnitude / obscuration | ± 0.2 % |
| Sun altitude | ± 0.1° |
| Path-limit position | ± 1 km |

If any benchmark exceeds tolerance, `validate.js` exits non-zero and **no data is published**.

## 5. Known gaps (the honest backlog — close before publishing)

1. **2027 Besselian elements** not yet entered.
2. **Atmospheric refraction + Sun semidiameter** not applied. `alt = asin(ζ)` is
   *geometric*. Critical for a sunset eclipse: at 2–7° altitude, refraction (~0.1–0.5°)
   and the Sun's ~0.27° radius change the reported altitude and whether the disk is
   still up. The engine's `up = ζ>0` test can report "set" while the disk is still
   visible (refraction + semidiameter ≈ +0.8° at the horizon). Either model it or
   state "geometric altitude" as a documented limitation.
3. **Contact times** are currently a 0.5-min scan (±30 s). To *earn* the ±2 s claim
   we must root-find C1–C4 (solve `m = L1'` and `m = −L2'`). **Until then the "±2 s
   vs NASA" claim is not made.**
4. **Sun azimuth** not output — needed for the horizon check (which direction must be clear).
5. **Formal validation suite + published residuals** — only ad-hoc checks exist so far.
6. **Horizon/DEM layer** — phase 2.

## 6. Presentation standard (how the data is shown)

Match the rigour of NASA/Espenak, layered so laypeople aren't forced to read it:

- Times in **UT *and* local**; ΔT stated.
- **Magnitude and obscuration kept distinct** (they are different things).
- Sun altitude labelled geometric vs refracted.
- Cite the element source, ΔT, ephemeris assumptions, and the DEM.
- Show the **residuals table** (§4) — the proof, in public.
- Friendly "will I see it?" answer on top; full technical circumstances + methodology beneath.

## 7. Decision log

- **2026-06-17** — Repo created under `github.com/absolute-eclipse`. Decisions:
  own Besselian engine (not scraping a third party) so the method is ours and citable;
  GeoNames `cities15000` for the European city index; Copernicus GLO-30 as the DEM
  (covers Iceland, unlike SRTM); **public** repo + **CC-BY** data (attribution = the
  backlink/authority mechanism); validation is a hard publish gate, residuals published.
- **2026-06-17** — Audited the engine against a NASA-grade bar. Verdict: geometry
  correct and spot-checked, but **not yet publication-verified** — see §5. Milestone 1
  is closing those gaps, not generating data.
- **2026-06-17** — Distribution model: per-year eclipse data and the minified
  engine are **build/release artifacts**, not committed. The release pipeline
  (`.github/workflows/release.yml`, on tag `v*`) runs tests + the validation gate
  (**blocking**), then generates the data and attaches `eclipse-YYYY.json/.csv` +
  `eclipse-engine.min.js` as **versioned GitHub Release assets** (immutable,
  citable by version, CC-BY). The repo holds sources only. A release therefore
  *cannot* be cut from unverified data — the gate and the publish step are one.
- **2026-06-17** — Tooling. Unit tests via Node's built-in runner (`node --test`,
  zero deps) in `test/` — 6 cases passing (Riga 80.3%, Zaragoza total, Madrid
  deep-but-not-total, NZ no-eclipse, determinism, bounds). Bundling via **esbuild**
  → `dist/eclipse-engine.min.js` (the engine published as a usable, citable open
  library). GitHub Actions CI runs unit tests (blocking) + the validation gate
  (informational until benchmarks are filled). Unit tests (code correctness) are
  kept distinct from `validate.js` (the external-source publish gate).
