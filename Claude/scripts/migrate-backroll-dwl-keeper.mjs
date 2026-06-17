#!/usr/bin/env node
// Pilot migration: TSK_BACKROLL_WALL_FINISH + TSK_BACKROLL_CEILING_FINISH
// → TSK_BACKROLL_DWL (universal keeper), with module-level ps_key overrides
// and TRADE_OVERHEAD (overhead:true) on ceiling modules.
//
// The keeper TSK_BACKROLL_DWL carries no ps_key on the canonical task —
// each module provides PS_SURFACE_SF.WALL_FIELD or PS_SURFACE_SF.CEILING_FIELD
// via the task_ref shallow-merge (resolveTaskFromRef in run-estimate-scenario.js).
//
// After: archive the two retired tasks. Regen bundle, re-probe.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR   = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

const WALL_MODULES = [
  'MOD_APPLY_WALL_SPRAY_BACKROLL',
  'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
  'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL',
  'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED',
];
const CEILING_MODULES = [
  'MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL',
  'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
  'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL',
  'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED',
];

const OLD_WALL_TASK = 'TSK_BACKROLL_WALL_FINISH';
const OLD_CEIL_TASK = 'TSK_BACKROLL_CEILING_FINISH';
const KEEPER        = 'TSK_BACKROLL_DWL';
const WALL_PS_KEY    = 'PS_SURFACE_SF.WALL_FIELD';
const CEIL_PS_KEY    = 'PS_SURFACE_SF.CEILING_FIELD';

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

async function migrateModule(moduleId, oldTaskId, psKey, addOverheadEligibility) {
  const file = path.join(MODULES_DIR, `${moduleId}.json`);
  const mod = await loadJson(file);
  let changed = false;

  // Rewrite the task_ref entry, preserving applies_when / coat_number / etc.
  mod.tasks = (mod.tasks || []).map(t => {
    if (t?.task_ref !== oldTaskId) return t;
    changed = true;
    return { ...t, task_ref: KEEPER, ps_key: psKey };
  });

  if (addOverheadEligibility) {
    if (!mod.modifier_eligibility) mod.modifier_eligibility = {};
    if (mod.modifier_eligibility.overhead !== true) {
      mod.modifier_eligibility.overhead = true;
      changed = true;
    }
  }

  if (!changed) {
    console.log(`  ! ${moduleId} — no change (didn't find ${oldTaskId})`);
    return false;
  }
  await writeJson(file, mod);
  console.log(`  ✓ ${moduleId}`);
  return true;
}

async function archiveTask(taskId) {
  const src = path.join(TASKS_DIR, `${taskId}.json`);
  const dst = path.join(TASKS_ARCHIVE_DIR, `${taskId}.json`);
  if (!(await exists(src))) {
    console.log(`  ! ${taskId} — source not in canonical, skipping archive`);
    return false;
  }
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  if (await exists(dst)) {
    console.log(`  ! ${taskId} — overwriting stale archive`);
    await fs.unlink(dst);
  }
  await fs.rename(src, dst);
  console.log(`  ✓ archived ${taskId}`);
  return true;
}

async function main() {
  console.log('-- migrating wall modules --');
  let walls = 0;
  for (const m of WALL_MODULES) {
    if (await migrateModule(m, OLD_WALL_TASK, WALL_PS_KEY, false)) walls++;
  }
  console.log(`  ${walls}/${WALL_MODULES.length} wall modules rewritten`);

  console.log('-- migrating ceiling modules --');
  let ceilings = 0;
  for (const m of CEILING_MODULES) {
    if (await migrateModule(m, OLD_CEIL_TASK, CEIL_PS_KEY, true)) ceilings++;
  }
  console.log(`  ${ceilings}/${CEILING_MODULES.length} ceiling modules rewritten (+ overhead:true)`);

  console.log('-- archiving retired Gen-3 tasks --');
  await archiveTask(OLD_WALL_TASK);
  await archiveTask(OLD_CEIL_TASK);

  console.log('-- done. Next: regen bundle + re-probe --');
}

main().catch(e => { console.error(e); process.exit(1); });
