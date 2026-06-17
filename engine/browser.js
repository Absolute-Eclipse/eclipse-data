/* ─────────────────────────────────────────────────────────────────────────
   browser.js — self-contained browser/library entry.

   Bundles the engine (besselian.js) WITH the Besselian elements (elements.js) so
   a consumer can compute without sourcing elements separately:

     Eclipse.for('2026').circumstances(lat, lonEast)   // → contacts, duration, max
     Eclipse.for('2027').scanMax(lat, lonEast)
     Eclipse.makeEngine(customElements)

   esbuild bundles this → dist/eclipse-engine.min.js (global `Eclipse`).
   ───────────────────────────────────────────────────────────────────────── */
const { makeEngine } = require("./besselian.js");
const { ELEMENTS } = require("./elements.js");

module.exports = {
  makeEngine: makeEngine,
  ELEMENTS: ELEMENTS,
  events: Object.keys(ELEMENTS),
  for: function (year) {
    var el = ELEMENTS[String(year)];
    if (!el) throw new Error("Eclipse.for: unknown event " + year + " (have " + Object.keys(ELEMENTS).join(", ") + ")");
    return makeEngine(el);
  }
};
