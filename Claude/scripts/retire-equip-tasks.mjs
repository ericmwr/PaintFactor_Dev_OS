#!/usr/bin/env node
// One-shot retirement of all equipment setup + equipment cleanup tasks
// across the system. Per user direction 2026-05-12: "as of right now there
// is no good way to account for the repeated setup and cleanup of equipment.
// retire all equip and tool clean from system."
//
// Steps:
//   1. Find all TSK_*_EQUIPMENT_SETUP* and TSK_*_EQUIP_CLEAN tasks
//   2. Remove their task_refs from every module that references them
//   3. Move the task files to tasks/archive/
//
// Modules stay alive — they have other tasks (final inspect, touchup,
// hardware remove/reinstall, masking, etc.). Only the equipment-related
// task_refs are pruned.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR   = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');

const TASK_PATTERN = /^TSK_[A-Z_]+_(EQUIPMENT_SETUP|EQUIP_CLEAN)(_(BRUSH|SPRAY|ROLL))?$/;

async function listFiles(dir) {
  const ents = await fs.readdir(dir, { withFileTypes: true });
  return ents.filter(e => e.isFile() && e.name.endsWith('.json')).map(e => e.name);
}

async function loadJson(p) { return JSON.parse(await fs.readFile(p, 'utf8')); }
async function writeJson(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function exists(p) { try { await fs.access(p); return true; } catch { return false; } }

async function main() {
  // 1. Identify retired tasks (task_id matches pattern)
  const taskFiles = await listFiles(TASKS_DIR);
  const retired = new Set();
  for (const tf of taskFiles) {
    const id = tf.replace(/\.json$/, '');
    if (TASK_PATTERN.test(id)) retired.add(id);
  }
  console.log(`Identified ${retired.size} equipment setup/cleanup tasks for retirement`);

  // 2. Prune task_refs in every module
  const moduleFiles = await listFiles(MODULES_DIR);
  let modulesTouched = 0;
  let refsRemoved = 0;
  for (const mf of moduleFiles) {
    const filePath = path.join(MODULES_DIR, mf);
    const mod = await loadJson(filePath);
    if (!Array.isArray(mod.tasks)) continue;
    const before = mod.tasks.length;
    mod.tasks = mod.tasks.filter(t => !(t?.task_ref && retired.has(t.task_ref)));
    if (mod.tasks.length !== before) {
      refsRemoved += before - mod.tasks.length;
      modulesTouched++;
      await writeJson(filePath, mod);
    }
  }
  console.log(`Pruned ${refsRemoved} task_refs across ${modulesTouched} modules`);

  // 3. Move task files to archive
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  let archived = 0;
  for (const id of retired) {
    const src = path.join(TASKS_DIR, `${id}.json`);
    const dst = path.join(TASKS_ARCHIVE_DIR, `${id}.json`);
    if (!(await exists(src))) { console.log(`  ! ${id} — not in canonical`); continue; }
    if (await exists(dst)) { await fs.unlink(dst); }
    await fs.rename(src, dst);
    archived++;
  }
  console.log(`Archived ${archived} task files to tasks/archive/`);
}

main().catch(e => { console.error(e); process.exit(1); });
