#!/usr/bin/env node
// Phase 2 batch: migrate the remaining 3 drywall apply keepers
// (TSK_ROLL_DWL, TSK_SPRAY_DWL, TSK_BACKROLL_SPRAY_DWL). The 4th —
// TSK_BACKROLL_DWL — was the pilot in 5246211.
//
// Same pattern: wall modules get task_ref + ps_key swap (baseline);
// ceiling modules also get modifier_eligibility.overhead: true so
// TRADE_OVERHEAD (1.25× time) applies. Retired Gen-3 tasks move to
// Claude/tasks/archive/.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR   = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

const WALL_PS_KEY = 'PS_SURFACE_SF.WALL_FIELD';
const CEIL_PS_KEY = 'PS_SURFACE_SF.CEILING_FIELD';

const MIGRATIONS = [
  {
    keeper: 'TSK_ROLL_DWL',
    oldWall: 'TSK_ROLL_WALL_FINISH',
    oldCeil: 'TSK_ROLL_CEILING_FINISH',
    wallModules:    ['MOD_APPLY_WALL_PRIME_ROLL', 'MOD_APPLY_WALL_ROLL'],
    ceilingModules: ['MOD_APPLY_CEILING_FINISH_ROLL', 'MOD_APPLY_CEIL_PRIME_ROLL'],
  },
  {
    keeper: 'TSK_SPRAY_DWL',
    oldWall: 'TSK_SPRAY_WALL_FINISH_ONLY',
    oldCeil: 'TSK_SPRAY_CEILING_FINISH_ONLY',
    wallModules:    ['MOD_APPLY_WALL_PRIME_SPRAY_ONLY', 'MOD_APPLY_WALL_SPRAY_ONLY'],
    ceilingModules: ['MOD_APPLY_CEILING_FINISH_SPRAY_ONLY', 'MOD_APPLY_CEIL_PRIME_SPRAY_ONLY'],
  },
  {
    keeper: 'TSK_BACKROLL_SPRAY_DWL',
    oldWall: 'TSK_SPRAY_WALL_FINISH',
    oldCeil: 'TSK_SPRAY_CEILING_FINISH',
    wallModules: [
      'MOD_APPLY_WALL_SPRAY_BACKROLL',
      'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL',
      'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED',
    ],
    ceilingModules: [
      'MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL',
      'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
      'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL',
      'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED',
    ],
  },
];

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

async function migrateModule(moduleId, oldTaskId, keeper, psKey, addOverhead) {
  const file = path.join(MODULES_DIR, `${moduleId}.json`);
  const mod = await loadJson(file);
  let changed = false;
  mod.tasks = (mod.tasks || []).map(t => {
    if (t?.task_ref !== oldTaskId) return t;
    changed = true;
    return { ...t, task_ref: keeper, ps_key: psKey };
  });
  if (addOverhead) {
    if (!mod.modifier_eligibility) mod.modifier_eligibility = {};
    if (mod.modifier_eligibility.overhead !== true) {
      mod.modifier_eligibility.overhead = true;
      changed = true;
    }
  }
  if (!changed) return false;
  await writeJson(file, mod);
  return true;
}

async function archiveTask(taskId) {
  const src = path.join(TASKS_DIR, `${taskId}.json`);
  const dst = path.join(TASKS_ARCHIVE_DIR, `${taskId}.json`);
  if (!(await exists(src))) {
    console.log(`    ! ${taskId} — already not in canonical`);
    return false;
  }
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  if (await exists(dst)) {
    console.log(`    ! ${taskId} — overwriting stale archive`);
    await fs.unlink(dst);
  }
  await fs.rename(src, dst);
  console.log(`    ✓ archived ${taskId}`);
  return true;
}

async function main() {
  for (const m of MIGRATIONS) {
    console.log(`\n== ${m.keeper}: ${m.oldWall} + ${m.oldCeil} → ${m.keeper} ==`);
    let walls = 0, ceilings = 0;
    for (const mid of m.wallModules) {
      const ok = await migrateModule(mid, m.oldWall, m.keeper, WALL_PS_KEY, false);
      console.log(`  ${ok ? '✓' : '!'} wall ${mid}`);
      if (ok) walls++;
    }
    for (const mid of m.ceilingModules) {
      const ok = await migrateModule(mid, m.oldCeil, m.keeper, CEIL_PS_KEY, true);
      console.log(`  ${ok ? '✓' : '!'} ceiling ${mid} (+ overhead:true)`);
      if (ok) ceilings++;
    }
    console.log(`  → ${walls} wall + ${ceilings} ceiling modules rewritten`);
    console.log(`  -- archiving retired Gen-3 tasks --`);
    await archiveTask(m.oldWall);
    await archiveTask(m.oldCeil);
  }
  console.log('\n-- done. Next: regen bundle + re-probe --');
}

main().catch(e => { console.error(e); process.exit(1); });
