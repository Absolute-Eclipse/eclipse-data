/* ─────────────────────────────────────────────────────────────────────────
   cities.js — build data/cities.europe.json from the GeoNames dump.

   Input (gitignored, fetch first):
     curl -sSL -o data/raw/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip
     unzip -o data/raw/cities15000.zip -d data/raw/

   Filters cities15000 (pop > 15,000) to the eclipse-visibility bounding box
   (Europe + Iceland + the N-Africa leg of the 2027 path) and keeps only the
   fields the pipeline needs. Output is a committed SOURCE input (CC-BY: GeoNames).

   GeoNames columns: 0 id · 1 name · 2 asciiname · 4 lat · 5 lon · 8 country ·
   14 population · 17 timezone (IANA, e.g. "Europe/Madrid" — drives local time).
   ───────────────────────────────────────────────────────────────────────── */
const fs = require("fs");
const path = require("path");

const RAW = path.join(__dirname, "..", "data", "raw", "cities15000.txt");
const OUT = path.join(__dirname, "..", "data", "cities.europe.json");
const BBOX = { latMin: 20, latMax: 72, lonMin: -30, lonMax: 45 };

if (!fs.existsSync(RAW)) {
  console.error("✖ Missing data/raw/cities15000.txt — download + unzip first:");
  console.error("    curl -sSL -o data/raw/cities15000.zip https://download.geonames.org/export/dump/cities15000.zip");
  console.error("    unzip -o data/raw/cities15000.zip -d data/raw/");
  process.exit(1);
}

const cities = [];
for (const line of fs.readFileSync(RAW, "utf8").split("\n")) {
  if (!line) continue;
  const f = line.split("\t");
  const lat = +f[4], lon = +f[5];
  if (lat < BBOX.latMin || lat > BBOX.latMax || lon < BBOX.lonMin || lon > BBOX.lonMax) continue;
  cities.push({ name: f[1], country: f[8], lat: +lat.toFixed(4), lon: +lon.toFixed(4), population: +f[14] || 0, timezone: f[17] });
}
cities.sort((a, b) => b.population - a.population);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(cities));
console.log(`✔ wrote ${cities.length} cities → ${path.relative(process.cwd(), OUT)} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
console.log(`  source: GeoNames cities15000 (CC-BY 4.0); bbox ${JSON.stringify(BBOX)}`);
