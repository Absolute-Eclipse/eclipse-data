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
const cities = JSON.parse(fs.readFileSync(CITIES, "utf8"));
const records = cities.map(c => {
  const m = engine.scanMax(c.lat, c.lon);
  return {
    city: c.name, country: c.country, lat: c.lat, lon: c.lon, population: c.population,
    visible: m.visible,
    status: !m.visible ? "none" : m.total ? "totality" : m.peak >= 0.999 ? "near" : "partial",
    obscuration: m.visible ? +(m.peak * 100).toFixed(1) : 0,   // %
    sun_altitude: m.visible ? +m.alt.toFixed(1) : null,        // geometric (refraction TODO)
    max_ut: m.visible ? +m.utHours.toFixed(4) : null,          // UT decimal hours (local time via c.timezone — TODO)
    // TODO: c1/c2/c3/c4, duration, sun_azimuth, west_horizon_alt
  };
});

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  event: YEAR, generated: "(stamp at release)", license: "CC-BY-4.0",
  note: "Local circumstances from Besselian elements; see github.com/absolute-eclipse/eclipse-data/BUILD-NOTES.md",
  count: records.length, locations: records
}, null, 2));

const cols = ["city","country","lat","lon","status","obscuration","sun_altitude"];
const csv = [cols.join(",")].concat(records.map(r => cols.map(k => r[k]).join(","))).join("\n");
fs.writeFileSync(OUT_CSV, csv);

console.log(`✔ wrote ${records.length} locations → ${path.relative(process.cwd(), OUT_JSON)} (+ .csv)`);
console.log("  ⚠ scaffold output: obscuration/altitude only, geometric, ±30 s peak. Not for publication until §5 closed.");
