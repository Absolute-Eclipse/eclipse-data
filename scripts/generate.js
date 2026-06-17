/* ─────────────────────────────────────────────────────────────────────────
   generate.js — engine × city index → data/eclipse-YYYY.json (+ .csv).

   Run via `npm run generate`, which runs `validate.js` FIRST — data is never
   produced from an unverified engine.

   STATUS: scaffold. Needs (see ../BUILD-NOTES.md §5):
     • data/cities.europe.json — GeoNames cities15000, Europe filter
       (fields: name, country, lat, lon, population, timezone)
     • contact-time root-finding (C1–C4) + duration; refraction; Sun azimuth
     • 2027 elements before generating eclipse-2027.json
     • per-city western-horizon altitude once scripts/horizon.js exists (phase 2)
   ───────────────────────────────────────────────────────────────────────── */
const fs = require("fs");
const path = require("path");
const { makeEngine } = require("../engine/besselian.js");
const { ELEMENTS } = require("../engine/elements.js");

const YEAR = process.argv[2] || "2026";
const CITIES = path.join(__dirname, "..", "data", "cities.europe.json");
const OUT_JSON = path.join(__dirname, "..", "data", `eclipse-${YEAR}.json`);
const OUT_CSV = path.join(__dirname, "..", "data", `eclipse-${YEAR}.csv`);

if (YEAR !== "2026") {
  console.error(`✖ ${YEAR} elements not entered/validated yet — refusing to generate. See BUILD-NOTES §5.`);
  process.exit(1);
}
if (!fs.existsSync(CITIES)) {
  console.error(`✖ ${path.relative(process.cwd(), CITIES)} missing.`);
  console.error("  Build it first: download GeoNames cities15000, filter to Europe, map to {name,country,lat,lon,population,timezone}.");
  process.exit(1);
}

const engine = makeEngine(ELEMENTS[YEAR]);
// Near the path limit a center-of-figure Besselian model is uncertain by ~a city
// width (lunar-limb / refraction not modelled). Flag those "marginal" rather than
// publish a wrong total/partial verdict. See BUILD-NOTES §5.7.
const EDGE_TOTAL_S = 30;     // total but shorter than this ⇒ grazing ⇒ marginal
const EDGE_PARTIAL = 99.5;   // partial but ≥ this % ⇒ near the limit ⇒ marginal
const cities = JSON.parse(fs.readFileSync(CITIES, "utf8"));
const records = cities.map(c => {
  const x = engine.circumstances(c.lat, c.lon);
  if (!x.eclipse || !x.visible) {
    return { city: c.name, country: c.country, lat: c.lat, lon: c.lon, population: c.population, visible: false, status: "none" };
  }
  const obsc = +(x.max.obsc * 100).toFixed(2);
  let status;
  if (x.total) status = x.duration_s < EDGE_TOTAL_S ? "marginal" : "totality";
  else status = obsc >= EDGE_PARTIAL ? "marginal" : obsc >= 90 ? "deep-partial" : "partial";
  return {
    city: c.name, country: c.country, lat: c.lat, lon: c.lon, population: c.population,
    visible: true, status, total: x.total,
    obscuration: obsc,
    totality_s: x.duration_s,
    sun_altitude: x.max.alt,                 // geometric (refraction TODO)
    max_ut: +x.max.ut.toFixed(4),            // UT decimal hours (local via c.timezone — TODO)
    c1_ut: x.c1 ? +x.c1.ut.toFixed(4) : null,
    c2_ut: x.c2 ? +x.c2.ut.toFixed(4) : null,
    c3_ut: x.c3 ? +x.c3.ut.toFixed(4) : null,
    c4_ut: x.c4 ? +x.c4.ut.toFixed(4) : null,
    // TODO: local times (c.timezone); sun_azimuth; west_horizon_alt; lunar-limb edge refinement
  };
});

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  event: YEAR, generated: "(stamp at release)", license: "CC-BY-4.0",
  note: "Local circumstances from Besselian elements; see github.com/absolute-eclipse/eclipse-data/BUILD-NOTES.md",
  count: records.length, locations: records
}, null, 2));

const cols = ["city","country","lat","lon","status","obscuration","totality_s","sun_altitude","max_ut"];
const csv = [cols.join(",")].concat(records.map(r => cols.map(k => r[k]).join(","))).join("\n");
fs.writeFileSync(OUT_CSV, csv);

console.log(`✔ wrote ${records.length} locations → ${path.relative(process.cwd(), OUT_JSON)} (+ .csv)`);
console.log("  ✓ gate-cleared (validated vs NASA greatest eclipse + Riga). Known limits: geometric");
console.log("    altitude (no refraction), center-of-figure (path-limit edges flagged 'marginal'). See BUILD-NOTES §5.");
