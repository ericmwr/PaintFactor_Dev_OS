#!/usr/bin/env node
// Scrub SF_EXT_* spec rows from the db-bundle files.
//
// As part of the exterior → scenario engine cutover (plan
// docs/superpowers/plans/2026-05-21-exterior-scenario-cutover.md), the
// legacy exterior estimation code was removed in Tasks 3+5. The
// corresponding SF_EXT_* rows still live in db-bundle.js (consumed by
// the spec editor + spec data hook). Scenario engine now owns exterior
// estimation end-to-end, so the legacy spec rows are dead weight.
//
// Removing them shrinks the React-app bundle and cleans the spec editor.
//
// NOTE: this scrub touches db-bundle.js JSON tables only. The exterior
// coverage / elevation / opening-schedule constants
// (EXT_COVERAGE_DEFAULTS, EXT_ELEVATION_RATES, EXT_OPENING_SCHEDULES)
// live inline in src/engine/material-estimates.js — they are NOT in
// the db-bundle JSON, so this scrub does not affect them.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SF_EXT_IDS = new Set([
  // NC
  "SF_WOOD_SIDING_EXT_NC_PAINT",
  "SF_SIDING_FIBERCEMENT_EXT_NC",
  "SF_SIDING_ENGINEERED_EXT_NC",
  "SF_STUCCO_EXT_NC",
  "SF_MASONRY_EXT_NC",
  "SF_TRIM_EXT_NC",
  "SF_SOFFIT_EXT_NC",
  "SF_WINDOW_EXT_NC",
  "SF_DOOR_EXT_NC",
  "SF_GARAGE_DOOR_EXT_NC",
  "SF_CAULK_EXT",
  "SF_DECK_EXT",
  "SF_FENCE_EXT",
  "SF_FOUNDATION_EXT_NC",
  "SF_PORCH_CEILING_EXT_NC",
  "SF_PORCH_FLOOR_EXT_NC",
  "SF_METAL_EXT",
  // RP
  "SF_SIDING_WOOD_EXT_RP",
  "SF_SIDING_ALUMINUM_EXT_RP",
  "SF_SIDING_VINYL_EXT_RP",
  "SF_SIDING_FIBERCEMENT_EXT_RP",
  "SF_SIDING_ENGINEERED_EXT_RP",
  "SF_STUCCO_EXT_RP",
  "SF_MASONRY_EXT_RP",
  "SF_TRIM_EXT_RP",
  "SF_SOFFIT_EXT_RP",
  "SF_WINDOW_EXT_RP",
  "SF_DOOR_EXT_RP",
  "SF_GARAGE_DOOR_EXT_RP",
  "SF_DECK_EXT_RP",
  "SF_FENCE_EXT_RP",
  "SF_FOUNDATION_EXT_RP",
  "SF_PORCH_CEILING_EXT_RP",
  "SF_PORCH_FLOOR_EXT_RP",
  "SF_METAL_EXT_RP",
]);

const FILES = [
  {
    rel: "Claude/tools/paintscope/src/data/db-bundle.js",
    prefix: "export const DB_BUNDLE = ",
    suffix: ";\n",
  },
  {
    rel: "Claude/database/exports/db_bundle.js",
    prefix: null,
    suffix: ";\n",
  },
];

function filterTable(rows, key) {
  return rows.filter((r) => !SF_EXT_IDS.has(r[key]));
}

for (const spec of FILES) {
  const p = path.join(ROOT, spec.rel);
  if (!fs.existsSync(p)) {
    console.log(`\n${spec.rel}: not present — skipping`);
    continue;
  }
  const content = fs.readFileSync(p, "utf8");

  let preamble, jsonText;
  if (spec.prefix) {
    if (!content.startsWith(spec.prefix)) throw new Error(`${spec.rel}: missing prefix`);
    preamble = spec.prefix;
    jsonText = content.slice(spec.prefix.length).replace(/;\s*$/, "");
  } else {
    // Exports file: comment header + `const DB_BUNDLE = ...;` on line 4
    const idx = content.indexOf("const DB_BUNDLE = ");
    if (idx < 0) throw new Error(`${spec.rel}: missing 'const DB_BUNDLE ='`);
    preamble = content.slice(0, idx) + "const DB_BUNDLE = ";
    jsonText = content.slice(idx + "const DB_BUNDLE = ".length).replace(/;\s*$/, "");
  }

  const data = JSON.parse(jsonText);
  const before = {};
  const after = {};

  for (const [tableName, rows] of Object.entries(data)) {
    if (!Array.isArray(rows)) continue;
    const idField = tableName === "spec_families" ? "id" : "spec_family_id";
    before[tableName] = rows.length;
    data[tableName] = filterTable(rows, idField);
    after[tableName] = data[tableName].length;
  }

  // Update _meta.tables row counts if present
  if (data._meta?.tables) {
    for (const k of Object.keys(data._meta.tables)) {
      if (after[k] !== undefined) data._meta.tables[k] = after[k];
    }
    if (typeof data._meta.total_rows === "number") {
      data._meta.total_rows = Object.values(after).reduce((a, b) => a + b, 0);
    }
  }

  const out = preamble + JSON.stringify(data) + spec.suffix;
  fs.writeFileSync(p, out);

  let totalRemoved = 0;
  console.log(`\n${spec.rel}:`);
  for (const k of Object.keys(before)) {
    const removed = before[k] - after[k];
    if (removed) console.log(`  ${k.padEnd(28)} ${before[k].toString().padStart(5)} → ${after[k].toString().padStart(5)}  (-${removed})`);
    totalRemoved += removed;
  }
  console.log(`  TOTAL ROWS REMOVED: ${totalRemoved}`);
}

console.log("\nDone.");
