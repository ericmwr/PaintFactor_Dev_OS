#!/usr/bin/env node
// Bucket A migration: 3 cleanup keepers per user direction 2026-05-12.
//
// 1. TSK_SPACKLE_DEFECT_SF (SF @ 1000) replaces:
//    - TSK_SPACKLE_WALL_DEFECTS   (PS_SURFACE_SF.WALL_FIELD)
//    - TSK_SPACKLE_CEILING_DEFECTS (PS_SURFACE_SF.CEILING_FIELD)
//    - TSK_SAND_SPACKLE_WALL      (REMOVED — folded into keeper per doctrine)
//    - TSK_SAND_SPACKLE_CEILING   (REMOVED)
//
// 2. TSK_SPOT_PRIME_SF (SF @ 1500) replaces:
//    - TSK_SPOT_PRIME_WALL    (PS_SURFACE_SF.WALL_FIELD)
//    - TSK_SPOT_PRIME_CEILING (PS_SURFACE_SF.CEILING_FIELD)
//
// 3. TSK_VACUUM_WORK_AREA (SF @ 600) replaces 9 per-context vacuum tasks
//    (preserves each task's ps_key — floor/wall/ceiling SF). Modifier-by-
//    flooring-type deferred. Note: vacuum work is one universal "clean up
//    the dust" — context distinction (intercoat / post-sand / pre-prime /
//    subfloor) is lost per the simplification doctrine.
//
// For modules whose post-migration task set includes a CEILING-context
// task (ps_key contains "CEILING"), add modifier_eligibility.overhead:true
// so TRADE_OVERHEAD (1.25× time) fires on ceiling work via per-task
// surface_orientation derivation. Wall-only modules left alone.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR   = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

// task_id -> { keeper, psKey (carried into task_ref), remove? }
const MIGRATIONS = {
  // Spackle
  TSK_SPACKLE_WALL_DEFECTS:    { keeper: 'TSK_SPACKLE_DEFECT_SF', psKey: 'PS_SURFACE_SF.WALL_FIELD' },
  TSK_SPACKLE_CEILING_DEFECTS: { keeper: 'TSK_SPACKLE_DEFECT_SF', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
  TSK_SAND_SPACKLE_WALL:       { remove: true },
  TSK_SAND_SPACKLE_CEILING:    { remove: true },
  // Spot prime
  TSK_SPOT_PRIME_WALL:    { keeper: 'TSK_SPOT_PRIME_SF', psKey: 'PS_SURFACE_SF.WALL_FIELD' },
  TSK_SPOT_PRIME_CEILING: { keeper: 'TSK_SPOT_PRIME_SF', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
  // Vacuum (preserve each task's existing ps_key)
  TSK_VACUUM_INTERCOAT_DUST_WALL:    { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.WALL_FIELD' },
  TSK_VACUUM_INTERCOAT_DUST_CEILING: { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
  TSK_VACUUM_SAND_DUST_WALL_FULL:    { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.WALL_FIELD' },
  TSK_VACUUM_SAND_DUST_CEILING_FULL: { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
  TSK_VACUUM_REPAIR_DUST_CEILING:    { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
  TSK_VACUUM_SUBFLOOR_POST_WALL:     { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_META.SF.FLOOR_VACUUM_AREA' },
  TSK_VACUUM_SUBFLOOR_POST_CEILING:  { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_PROTECT_SF.FLOOR_EXPOSED' },
  TSK_WALL_VACUUM_CLEANUP_PRIME:     { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_META.SF.FLOOR_VACUUM_AREA' },
  TSK_CEIL_VACUUM_DUST_PREPRIME:     { keeper: 'TSK_VACUUM_WORK_AREA', psKey: 'PS_SURFACE_SF.CEILING_FIELD' },
};

async function listFiles(dir) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  return ents.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name);
}
async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }
async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function main() {
  // 1. Rewrite modules
  const moduleFiles = await listFiles(MODULES_DIR);
  let modulesTouched = 0;
  let refsReplaced = 0;
  let refsRemoved = 0;
  let overheadAdded = 0;

  for (const mf of moduleFiles) {
    const filePath = path.join(MODULES_DIR, mf);
    const mod = await loadJson(filePath);
    if (!Array.isArray(mod.tasks)) continue;

    let changed = false;
    const newTasks = [];
    for (const t of mod.tasks) {
      const m = MIGRATIONS[t?.task_ref];
      if (!m) { newTasks.push(t); continue; }
      if (m.remove) {
        refsRemoved++;
        changed = true;
        continue; // drop entirely
      }
      const newEntry = { ...t, task_ref: m.keeper, ps_key: m.psKey };
      newTasks.push(newEntry);
      refsReplaced++;
      changed = true;
    }
    if (!changed) continue;

    mod.tasks = newTasks;

    // Add overhead:true if any remaining task has a CEILING ps_key
    const hasCeiling = newTasks.some(t => typeof t?.ps_key === 'string' && /CEILING/i.test(t.ps_key));
    if (hasCeiling) {
      if (!mod.modifier_eligibility) mod.modifier_eligibility = {};
      if (mod.modifier_eligibility.overhead !== true) {
        mod.modifier_eligibility.overhead = true;
        overheadAdded++;
      }
    }

    await writeJson(filePath, mod);
    modulesTouched++;
  }
  console.log(`  ✓ ${modulesTouched} modules: ${refsReplaced} refs replaced, ${refsRemoved} removed, ${overheadAdded} gained overhead:true`);

  // 2. Archive replaced + removed task files
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  let archived = 0;
  for (const tid of Object.keys(MIGRATIONS)) {
    const src = path.join(TASKS_DIR, `${tid}.json`);
    const dst = path.join(TASKS_ARCHIVE_DIR, `${tid}.json`);
    if (!(await exists(src))) { console.log(`    ! ${tid} — not in canonical`); continue; }
    if (await exists(dst)) await fs.unlink(dst);
    await fs.rename(src, dst);
    archived++;
  }
  console.log(`  ✓ archived ${archived} task files`);
}

main().catch(e => { console.error(e); process.exit(1); });
