#!/usr/bin/env node
// Bucket B follow-up: split SF stain CLEAR modules (combined sealer+clear)
// into separate SEALER + CLEAR modules, add dynamic_coats interstage to
// the 3 SF stain scenarios. Mirrors the DSST split done in 5fc5186.
//
// Substrates affected: WAINSCOT, WOOD_CEILING, WOOD_WALL.
// Apply-side tasks: TSK_SEALER_BRUSH_SF / SPRAY_SF, TSK_CLEAR_BRUSH_SF /
// SPRAY_SF. Inline TSK_SAND_SEALER_SF / TSK_SAND_CLEAR_SF removed
// (interstage module owns between-coat sanding now).
//
// Also archives the 4 orphan SAND tasks (LF + SF for sealer + clear) that
// the apply templates / SF modules no longer reference.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const SCN_DIR = path.join(ROOT, 'scenarios');
const TASKS_DIR = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

const INTERSTAGE_SF = 'MOD_INTERSTAGE_TRIM_STAIN_SF';

const SUBSTRATES = [
  { sub: 'WAINSCOT',     name: 'int_wainscot',     eligibility: { qt: true, height: false, texture: false, complexity: false, condition: false } },
  { sub: 'WOOD_CEILING', name: 'int_wood_ceiling', eligibility: { qt: true, height: true,  texture: false, complexity: false, condition: false, overhead: true } },
  { sub: 'WOOD_WALL',    name: 'int_wood_wall',    eligibility: { qt: true, height: false, texture: false, complexity: false, condition: false } },
];

const SCENARIO_FOR_SUB = {
  WAINSCOT:     'SCN_INT_WAINSCOT_STAIN_CLEAR',
  WOOD_CEILING: 'SCN_INT_WCST_STAIN_CLEAR',
  WOOD_WALL:    'SCN_INT_WWST_STAIN_CLEAR',
};

const ORPHAN_TASKS_TO_ARCHIVE = [
  'TSK_SAND_SEALER_LF',
  'TSK_SAND_CLEAR_LF',
  'TSK_SAND_SEALER_SF',
  'TSK_SAND_CLEAR_SF',
];

async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

function makeSealerModule(sub, name, eligibility) {
  return {
    module_id: `MOD_APPLY_${sub}_SEALER`,
    name: `Sealer Coat - ${name}`,
    phase: 'finish',
    intent: `One sealer coat for ${name}. Repeats per ctx.sealer_coats via scenario.dynamic_coats; the SF interstage module (MOD_INTERSTAGE_TRIM_STAIN_SF) fires between coats and before clear.`,
    tasks: [
      { task_ref: 'TSK_SEALER_BRUSH_SF', applies_when: { application_method_clear: ['brush'] } },
      { task_ref: 'TSK_SEALER_SPRAY_SF', applies_when: { application_method_clear: ['spray'] } },
    ],
    modifier_eligibility: eligibility,
    doctrine: `Sealer for ${name}. Between-coat sand moved to MOD_INTERSTAGE_TRIM_STAIN_SF per the interstage architecture refactor (commit 313e802).`,
  };
}

function makeClearModule(sub, name, eligibility) {
  return {
    module_id: `MOD_APPLY_${sub}_CLEAR`,
    name: `Clear Coat - ${name}`,
    phase: 'finish',
    intent: `One clear topcoat for ${name}. Repeats per ctx.clear_coats via scenario.dynamic_coats; SF interstage fires between coats.`,
    tasks: [
      { task_ref: 'TSK_CLEAR_BRUSH_SF', applies_when: { application_method_clear: ['brush'] } },
      { task_ref: 'TSK_CLEAR_SPRAY_SF', applies_when: { application_method_clear: ['spray'] } },
    ],
    modifier_eligibility: eligibility,
    doctrine: `Clear for ${name}. Between-coat sand moved to MOD_INTERSTAGE_TRIM_STAIN_SF. Split from the previous combined sealer+clear module (mirror of the DSST split in 5fc5186) to support per-pass dynamic_coats.`,
  };
}

async function main() {
  // 1. Create new SEALER modules + rewrite CLEAR modules
  for (const { sub, name, eligibility } of SUBSTRATES) {
    const sealerPath = path.join(MODULES_DIR, `MOD_APPLY_${sub}_SEALER.json`);
    const clearPath = path.join(MODULES_DIR, `MOD_APPLY_${sub}_CLEAR.json`);
    await writeJson(sealerPath, makeSealerModule(sub, name, eligibility));
    await writeJson(clearPath, makeClearModule(sub, name, eligibility));
    console.log(`  ✓ ${sub}: SEALER created, CLEAR rewritten`);
  }

  // 2. Update scenarios: add SEALER to modules list, add dynamic_coats with interstage
  for (const [sub, scnId] of Object.entries(SCENARIO_FOR_SUB)) {
    const scnPath = path.join(SCN_DIR, `${scnId}.json`);
    const scn = await loadJson(scnPath);
    const stainId = `MOD_APPLY_${sub}_STAIN`;
    const sealerId = `MOD_APPLY_${sub}_SEALER`;
    const clearId = `MOD_APPLY_${sub}_CLEAR`;
    // Insert SEALER between STAIN and CLEAR in modules list
    const idx = scn.modules.indexOf(clearId);
    if (idx > 0 && scn.modules[idx - 1] === stainId) {
      scn.modules.splice(idx, 0, sealerId);
    } else if (!scn.modules.includes(sealerId)) {
      scn.modules.splice(idx, 0, sealerId);
    }
    // Add dynamic_coats with interstage for all three apply modules
    scn.dynamic_coats = {
      [stainId]:  { field: 'stain_coats',  interstage: INTERSTAGE_SF },
      [sealerId]: { field: 'sealer_coats', interstage: INTERSTAGE_SF },
      [clearId]:  { field: 'clear_coats',  interstage: INTERSTAGE_SF },
    };
    await writeJson(scnPath, scn);
    console.log(`  ✓ ${scnId}: SEALER inserted, dynamic_coats with interstage added`);
  }

  // 3. Archive orphan SAND tasks
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  for (const tid of ORPHAN_TASKS_TO_ARCHIVE) {
    const src = path.join(TASKS_DIR, `${tid}.json`);
    const dst = path.join(TASKS_ARCHIVE_DIR, `${tid}.json`);
    if (!(await exists(src))) { console.log(`    ! ${tid} — not in canonical`); continue; }
    if (await exists(dst)) await fs.unlink(dst);
    await fs.rename(src, dst);
    console.log(`  ✓ archived ${tid}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
