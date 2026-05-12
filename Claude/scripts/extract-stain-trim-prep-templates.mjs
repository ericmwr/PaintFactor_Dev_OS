#!/usr/bin/env node
// Phase 2A: refactor 17 stain trim prep modules to extend new templates.
// LF template covers 13 standard trim substrates; SF template covers
// wainscot / wood wall / wood ceiling; EA_SIDE template covers DSST
// (int_door_slab). Per-substrate overrides preserved as diffs from
// template defaults.
//
// Groups D/E/F (AEST / RRST / SRST / TRST / WINDOW / STAIR) are left
// alone — they use legacy per-substrate task IDs that haven't been
// universal-keeper-migrated yet. Separate scope.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');

const TEMPLATE_DEFAULTS = {
  qt: true,
  height: false,
  texture: false,
  complexity: true,
  condition: false,
};

const REFACTORS = {
  // LF substrates (13)
  MOD_PREP_BASEBOARD_STAIN:     'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_CHAIR_RAIL_STAIN:    'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_CROWN_STAIN:         'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_DOOR_CASING_STAIN:   'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_DOOR_FRAME_STAIN:    'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_PANEL_MOLD_STAIN:    'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_PICTURE_RAIL_STAIN:  'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_SHADOW_BOX_STAIN:    'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_SHOE_MOLD_STAIN:     'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_WINDOW_APRON_STAIN:  'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_WINDOW_CASING_STAIN: 'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_WINDOW_JAMB_STAIN:   'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  MOD_PREP_WINDOW_STOOL_STAIN:  'MOD_TEMPLATE_TRIM_PREP_STAIN_LF',
  // SF substrates (3)
  MOD_PREP_WAINSCOT_STAIN:      'MOD_TEMPLATE_TRIM_PREP_STAIN_SF',
  MOD_PREP_WOOD_WALL_STAIN:     'MOD_TEMPLATE_TRIM_PREP_STAIN_SF',
  MOD_PREP_WOOD_CEILING_STAIN:  'MOD_TEMPLATE_TRIM_PREP_STAIN_SF',
  // EA_SIDE substrates (1)
  MOD_PREP_DSST_STAIN:          'MOD_TEMPLATE_TRIM_PREP_STAIN_EA_SIDE',
};

async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

function extractEligibilityOverrides(modElig) {
  if (!modElig) return null;
  const overrides = {};
  let hasAny = false;
  // Diff vs template defaults
  for (const [k, v] of Object.entries(modElig)) {
    if (TEMPLATE_DEFAULTS[k] === undefined) {
      // Key not in template defaults — always include (e.g. overhead:true)
      overrides[k] = v;
      hasAny = true;
    } else if (TEMPLATE_DEFAULTS[k] !== v) {
      overrides[k] = v;
      hasAny = true;
    }
  }
  return hasAny ? overrides : null;
}

async function main() {
  let refactored = 0;
  for (const [moduleId, templateId] of Object.entries(REFACTORS)) {
    const filePath = path.join(MODULES_DIR, `${moduleId}.json`);
    const orig = await loadJson(filePath);
    const overrides = extractEligibilityOverrides(orig.modifier_eligibility);

    const extender = {
      module_id: moduleId,
      name: orig.name,
      extends: templateId,
    };
    if (overrides) extender.modifier_eligibility = overrides;

    await writeJson(filePath, extender);
    refactored++;
    const overrideStr = overrides ? JSON.stringify(overrides) : '(no overrides)';
    console.log(`  ✓ ${moduleId} → ${templateId} ${overrideStr}`);
  }
  console.log(`\nRefactored ${refactored} modules.`);
}

main().catch(e => { console.error(e); process.exit(1); });
