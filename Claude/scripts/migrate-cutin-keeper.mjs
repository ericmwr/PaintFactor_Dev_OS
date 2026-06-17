#!/usr/bin/env node
// Migrate per-substrate + per-target cut-in tasks → TSK_CUTIN_WALL_LF keeper.
// Cut-in is wall-adjacent brush work; height handles ladder reach.
// NOT TRADE_OVERHEAD eligible.
//
// 11 tasks → 1 keeper. Each module's task_ref carries the substrate-specific
// ps_key via resolveTaskFromRef shallow-merge.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR   = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

const KEEPER = 'TSK_CUTIN_WALL_LF';

// Trim module: maps the 10 retired tasks to their ps_keys
const TRIM_MAPPING = [
  ['TSK_CUTIN_WALL_TO_BASEBOARD',     'PS_EDGE_LF.CUTIN_WALL_TO_BASEBOARD'],
  ['TSK_CUTIN_WALL_TO_CASING_DOOR',   'PS_EDGE_LF.CUTIN_WALL_TO_CASING_DOOR'],
  ['TSK_CUTIN_WALL_TO_CASING_WINDOW', 'PS_EDGE_LF.CUTIN_WALL_TO_CASING_WINDOW'],
  ['TSK_CUTIN_WALL_TO_CROWN',         'PS_EDGE_LF.CUTIN_WALL_TO_CROWN'],
  ['TSK_CUTIN_WALL_TO_CHAIR_RAIL',    'PS_EDGE_LF.CUTIN_WALL_TO_CHAIR_RAIL'],
  ['TSK_CUTIN_WALL_TO_PICTURE_RAIL',  'PS_EDGE_LF.CUTIN_WALL_TO_PICTURE_RAIL'],
  ['TSK_CUTIN_WALL_TO_WINDOW_STOOL',  'PS_EDGE_LF.CUTIN_WALL_TO_WINDOW_STOOL'],
  ['TSK_CUTIN_WALL_TO_WINDOW_APRON',  'PS_EDGE_LF.CUTIN_WALL_TO_WINDOW_APRON'],
  ['TSK_CUTIN_WALL_TO_PANEL_MOLD',    'PS_EDGE_LF.CUTIN_WALL_TO_PANEL_MOLD'],
  ['TSK_CUTIN_WALL_TO_SHADOW_BOX',    'PS_EDGE_LF.CUTIN_WALL_TO_SHADOW_BOX'],
];
const CEILING_OLD = 'TSK_CUTIN_WALL_TO_CEILING';
const CEILING_PS  = 'PS_EDGE_LF.TO_CEILING';

// Legacy lumped task that the Track A split obsoleted — no module refs but
// archive it anyway since it's been superseded.
const LEGACY_LUMPED = 'TSK_CUTIN_WALL_TO_TRIM';

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }
async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) { await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8'); }

async function archiveTask(taskId) {
  const src = path.join(TASKS_DIR, `${taskId}.json`);
  const dst = path.join(TASKS_ARCHIVE_DIR, `${taskId}.json`);
  if (!(await exists(src))) { console.log(`    ! ${taskId} — not in canonical`); return false; }
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  if (await exists(dst)) { console.log(`    ! ${taskId} — overwriting stale archive`); await fs.unlink(dst); }
  await fs.rename(src, dst);
  console.log(`    ✓ archived ${taskId}`);
  return true;
}

async function main() {
  // 1. Add coat_2_rate_multiplier to TSK_CUTIN_WALL_LF (universal cut-in coat-2 behavior)
  const keeperFile = path.join(TASKS_DIR, `${KEEPER}.json`);
  const keeper = await loadJson(keeperFile);
  if (keeper.coat_2_rate_multiplier !== 1.25) {
    keeper.coat_2_rate_multiplier = 1.25;
    await writeJson(keeperFile, keeper);
    console.log('✓ added coat_2_rate_multiplier: 1.25 to TSK_CUTIN_WALL_LF');
  }

  // 2. Rewrite MOD_APPLY_CUTIN_TRIM
  console.log('\n-- rewriting MOD_APPLY_CUTIN_TRIM (10 task_refs) --');
  const trimPath = path.join(MODULES_DIR, 'MOD_APPLY_CUTIN_TRIM.json');
  const trim = await loadJson(trimPath);
  const oldToPs = new Map(TRIM_MAPPING);
  trim.tasks = (trim.tasks || []).map(t => {
    if (!t?.task_ref) return t;
    const psKey = oldToPs.get(t.task_ref);
    if (!psKey) return t;  // unrelated task_ref, leave alone
    return { ...t, task_ref: KEEPER, ps_key: psKey };
  });
  await writeJson(trimPath, trim);
  console.log('  ✓ MOD_APPLY_CUTIN_TRIM');

  // 3. Rewrite MOD_APPLY_CUTIN_CEILING
  console.log('\n-- rewriting MOD_APPLY_CUTIN_CEILING (1 task_ref) --');
  const ceilPath = path.join(MODULES_DIR, 'MOD_APPLY_CUTIN_CEILING.json');
  const ceil = await loadJson(ceilPath);
  ceil.tasks = (ceil.tasks || []).map(t => {
    if (t?.task_ref !== CEILING_OLD) return t;
    return { ...t, task_ref: KEEPER, ps_key: CEILING_PS };
  });
  await writeJson(ceilPath, ceil);
  console.log('  ✓ MOD_APPLY_CUTIN_CEILING');

  // 4. Archive retired tasks
  console.log('\n-- archiving retired Gen-3 cut-in tasks --');
  for (const [tid] of TRIM_MAPPING) await archiveTask(tid);
  await archiveTask(CEILING_OLD);
  await archiveTask(LEGACY_LUMPED);

  console.log('\n-- done. Next: regen bundle + re-probe --');
}

main().catch(e => { console.error(e); process.exit(1); });
