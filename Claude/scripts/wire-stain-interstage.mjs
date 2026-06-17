#!/usr/bin/env node
// Wire stain interstage modules into 17 stain scenarios via the new
// dynamic_coats object format (engine extension this commit). Each apply
// module's repetition now interleaves the appropriate UOM-matching
// interstage module between coats.
//
// Skips Groups D/E/F (AEST/RRST/SRST/TRST/WNST/WINDOW/STAIR) — they use
// legacy per-substrate task IDs and have a different apply shape; their
// interstage will be a separate cleanup later.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCN_DIR = path.join(ROOT, 'scenarios');

const SCENARIO_INTERSTAGE = {
  // LF (Group A — 13)
  SCN_INT_BASEBOARD_STAIN_CLEAR:     'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_CHAIR_RAIL_STAIN_CLEAR:    'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_CROWN_STAIN_CLEAR:         'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_DOOR_CASING_STAIN_CLEAR:   'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_DOOR_FRAME_STAIN_CLEAR:    'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_PANEL_MOLD_STAIN_CLEAR:    'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_PICTURE_RAIL_STAIN_CLEAR:  'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_SHADOW_BOX_STAIN_CLEAR:    'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_SHOE_MOLD_STAIN_CLEAR:     'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_WINDOW_APRON_STAIN_CLEAR:  'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_WINDOW_CASING_STAIN_CLEAR: 'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_WINDOW_JAMB_STAIN_CLEAR:   'MOD_INTERSTAGE_TRIM_STAIN_LF',
  SCN_INT_WINDOW_STOOL_STAIN_CLEAR:  'MOD_INTERSTAGE_TRIM_STAIN_LF',
  // SF (Group B — 3)
  SCN_INT_WAINSCOT_STAIN_CLEAR:      'MOD_INTERSTAGE_TRIM_STAIN_SF',
  SCN_INT_WCST_STAIN_CLEAR:          'MOD_INTERSTAGE_TRIM_STAIN_SF',
  SCN_INT_WWST_STAIN_CLEAR:          'MOD_INTERSTAGE_TRIM_STAIN_SF',
  // EA_SIDE (Group C — 1)
  SCN_INT_DSST_STAIN_CLEAR:          'MOD_INTERSTAGE_TRIM_STAIN_EA_SIDE',
};

async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const [scenarioId, interstageModule] of Object.entries(SCENARIO_INTERSTAGE)) {
    const filePath = path.join(SCN_DIR, `${scenarioId}.json`);
    const scn = await loadJson(filePath);
    const dc = scn.dynamic_coats;
    if (!dc || typeof dc !== 'object') {
      console.log(`  ! ${scenarioId} — no dynamic_coats`);
      skipped++;
      continue;
    }
    const newDc = {};
    let changed = false;
    for (const [moduleId, value] of Object.entries(dc)) {
      if (typeof value === 'string') {
        newDc[moduleId] = { field: value, interstage: interstageModule };
        changed = true;
      } else {
        newDc[moduleId] = value;
      }
    }
    if (!changed) { skipped++; continue; }
    scn.dynamic_coats = newDc;
    await writeJson(filePath, scn);
    console.log(`  ✓ ${scenarioId} → interstage=${interstageModule}`);
    updated++;
  }
  console.log(`\nUpdated ${updated} scenarios. Skipped ${skipped}.`);
}

main().catch(e => { console.error(e); process.exit(1); });
