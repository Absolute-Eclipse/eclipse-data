# Eclipse Data

Open, **verified** local-circumstances data for the total solar eclipses of
**12 August 2026** and **2 August 2027** over Europe — computed from Besselian
elements, validated against NASA/Espenak, and published with its residuals.

> Principle: **we do not ship unverified data.** Every figure is computed from
> first principles, checked against authoritative sources, and the validation
> residuals are published alongside it (see [`BUILD-NOTES.md`](BUILD-NOTES.md)).

## What's here

| Path | What it is |
|---|---|
| `engine/besselian.js` | The computation engine — `Eclipse.at(lat, lonEast, t)` → instantaneous circumstances. Runs in Node and the browser. |
| `engine/elements.js` | Besselian elements + ΔT per eclipse, with sources. |
| `engine/validate.js` *(planned)* | Engine self-checks. |
| `scripts/generate.js` | Engine × city list → `data/eclipse-YYYY.json` (+ CSV). |
| `scripts/validate.js` | Benchmarks the engine vs NASA/Espenak; prints residuals; **non-zero exit if out of tolerance** (the publish gate). |
| `scripts/horizon.js` *(phase 2)* | Western-horizon profile per point from a DEM. |
| `data/cities.europe.json` | City index (GeoNames-derived) — committed source input. |
| `data/eclipse-2026.json` · `eclipse-2027.json` | Per-year data — **release artifacts** (built by the pipeline, attached to a GitHub Release; not committed). |
| `explorer/index.html` | Standalone Explorer (the on-site tool also lives in the Shopify theme). |
| `widget/` | Embeddable widget — what other sites paste in (attribution backlink baked in). |

## Data flow

```
engine + elements ─► validate (GATE) ─► generate ─► per-year data + min engine
                                                          │  (only on a release tag)
                       tag v* ─► release pipeline ─► GitHub Release assets   (versioned, citable, CC-BY)
                                                          ├─► GitHub Pages: explorer + embeddable widget
                                                          └─► Shopify theme: ae-eclipse-data (pins a release)
```

The repo holds **sources only**. Per-year data (`eclipse-YYYY.json/.csv`) and the
minified engine are **build/release artifacts** — produced by the pipeline and
attached to a [GitHub Release](https://github.com/Absolute-Eclipse/eclipse-data/releases)
*only after the validation gate passes*. The on-site tool and every external embed
then eat the **same** versioned, validated data.

## Licences

- **Code** — MIT (see `LICENSE`).
- **Data** — CC-BY-4.0 (see `DATA-LICENSE.md`). Attribution is required, which is
  deliberate: every embed and citation links back.

## Attribution we owe

- City data © [GeoNames](https://www.geonames.org/) (CC-BY-4.0)
- Elevation: Copernicus DEM / NASA SRTM / ASTER GDEM (per `BUILD-NOTES.md`)
- Besselian elements after F. Espenak (EclipseWise / NASA)

## Develop

```
npm test            # engine unit tests (Node built-in runner, no deps)
npm run validate    # the publish gate — benchmarks vs NASA/Espenak (residuals)
npm run dist        # bundle + minify the engine → dist/eclipse-engine.min.js (esbuild)
npm run generate    # validate, then build the data (needs data/cities.europe.json)
```

`test` guards code correctness; `validate` guards the *data* against authoritative
sources. Both run in CI (`.github/workflows/ci.yml`).

## Status

✅ Milestone 1 — engine **validated against NASA** (2026 + 2027 greatest eclipse to
~1–5 s; Riga partial to 0.05 pp), the gate is **green**, and the pipeline produces
verified 2026 data (9,438 cities). Documented limits (refraction, lunar-limb) are
mitigated — near-limit cities are flagged `marginal`. Ready for the first release.
See the gap list + validation protocol in [`BUILD-NOTES.md`](BUILD-NOTES.md).
