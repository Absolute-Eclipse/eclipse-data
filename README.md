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
| `data/cities.europe.json` | City index (GeoNames-derived). |
| `data/eclipse-2026.json` · `eclipse-2027.json` | Generated open data. |
| `explorer/index.html` | Standalone Explorer (the on-site tool also lives in the Shopify theme). |
| `widget/` | Embeddable widget — what other sites paste in (attribution backlink baked in). |

## Data flow

```
engine + elements ──> scripts/generate.js ──> data/*.json ──┬─> GitHub Pages  (open data + widget + embeds)
        ▲                                                    └─> Shopify theme (ae-eclipse-data section, on-site tool)
        └── scripts/validate.js  (HARD GATE: must pass before data is published)
```

One engine, two surfaces: the on-site tool and every external embed eat the **same** validated JSON.

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

🚧 Milestone 1 — **verified engine + validation gate**. Not yet published. See the
gap list and validation protocol in [`BUILD-NOTES.md`](BUILD-NOTES.md).
