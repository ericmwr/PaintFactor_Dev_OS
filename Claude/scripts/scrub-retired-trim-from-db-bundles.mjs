#!/usr/bin/env node
// Scrub retired SF_TRIM_NC_PAINT / _PRIME / _STAIN rows from the db-bundle files.
//
// These spec families were hard-retired in 8232ef7 (PAINT/PRIME) and 0417405
// (STAIN), but their rows still live in db-bundle.js (consumed by the spec
// editor + spec data hook). Removing them gets the editor cleaned up and
// shrinks the bundle by ~250–550 rows.
//
// The previous task-archival commits handled the live engine path; this
// commit handles the spec-editor / spec-data hook data layer.

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const RETIRED = new Set(["SF_TRIM_NC_PAINT", "SF_TRIM_NC_PRIME", "SF_TRIM_NC_STAIN"]);

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
  return rows.filter((r) => !RETIRED.has(r[key]));
}

for (const spec of FILES) {
  const p = path.join(ROOT, spec.rel);
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
