#!/usr/bin/env node
// Retire interior knot-prime tasks (KNOT_COUNT sweep).
//
// Completes the retirement started 2026-05-05: the two interior knot-prime
// tasks (TSK_TRIM_SPOT_PRIME_KNOTS / _SPRAY) are still referenced from 13
// trim prime modules but their ps_key (PS_META.EA.KNOT_COUNT) has no
// emission source, so they contribute 0 hours. This strips them from the
// modules and scrubs the stranded SQLite rows from the db-bundle files.
//
// Out of scope (handled separately): git mv of the 2 task files to archive,
// edit of phase0-diff.mjs to drop the dead expectation.
//
// IMPORTANT: do NOT touch PS_EXT_META_EA.KNOT_COUNT (exterior, still live).

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const PRIME_MODULES = [
  "MOD_APPLY_BASEBOARD_PRIME",
  "MOD_APPLY_CHAIR_RAIL_PRIME",
  "MOD_APPLY_CROWN_PRIME",
  "MOD_APPLY_DOOR_CASING_PRIME",
  "MOD_APPLY_DOOR_FRAME_PRIME",
  "MOD_APPLY_PANEL_MOLD_PRIME",
  "MOD_APPLY_PICTURE_RAIL_PRIME",
  "MOD_APPLY_SHADOW_BOX_PRIME",
  "MOD_APPLY_SHOE_MOLD_PRIME",
  "MOD_APPLY_WINDOW_APRON_PRIME",
  "MOD_APPLY_WINDOW_CASING_PRIME",
  "MOD_APPLY_WINDOW_JAMB_PRIME",
  "MOD_APPLY_WINDOW_STOOL_PRIME",
];

const KNOT_TASK_IDS = new Set([
  "TSK_TRIM_SPOT_PRIME_KNOTS",
  "TSK_TRIM_SPOT_PRIME_KNOTS_SPRAY",
]);

const OLD_INTENT = "Spot prime knots then apply primer (method-gated brush/spray).";
const NEW_INTENT = "Apply primer (method-gated brush/spray).";

let moduleEdits = 0;
for (const m of PRIME_MODULES) {
  const p = path.join(ROOT, "Claude", "modules", `${m}.json`);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const before = j.tasks.length;
  j.tasks = j.tasks.filter((t) => !KNOT_TASK_IDS.has(t.task_ref));
  const stripped = before - j.tasks.length;
  if (stripped !== 2) throw new Error(`${m}: expected to strip 2 knot tasks, stripped ${stripped}`);
  if (j.intent === OLD_INTENT) j.intent = NEW_INTENT;
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  moduleEdits++;
}
console.log(`Stripped knot task_refs from ${moduleEdits} prime modules.`);

const BUNDLE_FILES = [
  "Claude/tools/paintscope/src/data/db-bundle.js",
  "Claude/database/exports/db_bundle.js",
];

for (const rel of BUNDLE_FILES) {
  const p = path.join(ROOT, rel);
  const content = fs.readFileSync(p, "utf8");
  // Match a single SF_TRIM_NC_PRIME row referencing the knot-prime task,
  // including the leading `,` so the surrounding JSON array stays valid.
  const rowRe = /,\{"spec_family_id":"SF_TRIM_NC_PRIME","task_id":"TSK_TRIM_SPOT_PRIME_KNOTS","unit_of_measure":"EA","paintscope_key":"PS_META\.EA\.KNOT_COUNT","rate_per_hour":40(?:\.0)?,"crew_size":1,"applies_when":\{"quality_tier":\["QT3","QT4","QT5"\],"substrate_condition":\["bare_solid_wood","bare_fjp"\]\}\}/g;
  const matches = content.match(rowRe) || [];
  if (matches.length !== 1) throw new Error(`${rel}: expected 1 KNOT_COUNT row, found ${matches.length}`);
  fs.writeFileSync(p, content.replace(rowRe, ""));
  console.log(`Scrubbed KNOT_COUNT row from ${rel}`);
}

console.log("Done.");
