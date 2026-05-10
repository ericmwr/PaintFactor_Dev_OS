#!/usr/bin/env node
// Walk the MIXED section of the protection retirement audit. For each
// module entry, extract the 🛡️ REMOVE task_refs and strip them from
// the module JSON. Real-work tasks (🔨 KEEP) stay.
//
// After running: regen bundle + run probe-protection-tasks to verify.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AUDIT_FILE = path.join(ROOT, '_protection_module_retirement_audit.md');
const MODULES_DIR = path.join(ROOT, 'modules');
const TASKS_DIR = path.join(ROOT, 'tasks');
const TASKS_ARCHIVE_DIR = path.join(TASKS_DIR, 'archive');
const SCENARIOS_DIR = path.join(ROOT, 'scenarios');

async function exists(p) {
  try { await fs.access(p); return true; } catch { return false; }
}

// Parse the audit MD's MIXED section into per-module remove lists.
// Format per module:
//   ### `MOD_X` · N scenarios · phase=X · Y/Z protection
//   - 🛡️  REMOVE `TSK_A` — ...
//   - 🔨 KEEP    `TSK_B` — ...
async function parseAudit() {
  const raw = await fs.readFile(AUDIT_FILE, 'utf8');
  const lines = raw.split(/\r?\n/);
  const mixedStart = lines.findIndex(l => l.startsWith('## MIXED'));
  if (mixedStart < 0) throw new Error('MIXED section not found in audit');
  const out = [];
  let current = null;
  for (let i = mixedStart + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('## ')) break; // next top-level section
    const headMatch = line.match(/^### `(MOD_[A-Z0-9_]+)`/);
    if (headMatch) {
      if (current) out.push(current);
      current = { moduleId: headMatch[1], remove: [], keep: [] };
      continue;
    }
    if (!current) continue;
    const removeMatch = line.match(/REMOVE\s+`(TSK_[A-Z0-9_]+)`/);
    if (removeMatch) { current.remove.push(removeMatch[1]); continue; }
    const keepMatch = line.match(/KEEP\s+`(TSK_[A-Z0-9_]+)`/);
    if (keepMatch) { current.keep.push(keepMatch[1]); continue; }
  }
  if (current) out.push(current);
  return out;
}

async function loadJson(p) {
  return JSON.parse(await fs.readFile(p, 'utf8'));
}

async function writeJson(p, obj) {
  await fs.writeFile(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

async function buildSafeModuleSet() {
  // Modules referenced by any "protection scenario" — these are the
  // NEW system (MOD_PROTECT_SETUP, MOD_PROTECT_CABINET_FULL, etc.)
  // and must NOT have their tasks stripped. Their tasks ARE the work.
  const scenarioFiles = (await fs.readdir(SCENARIOS_DIR)).filter(f => f.endsWith('.json'));
  const safe = new Set();
  for (const f of scenarioFiles) {
    const sc = await loadJson(path.join(SCENARIOS_DIR, f));
    const isProtectionScenario =
      sc.matches?.coating_type === 'protect' ||
      sc.matches?.paintable_item === 'room_protection';
    if (!isProtectionScenario) continue;
    for (const m of (sc.modules || [])) safe.add(m);
  }
  return safe;
}

async function main() {
  const entries = await parseAudit();
  console.log(`mixed-module entries: ${entries.length}`);
  const safeModules = await buildSafeModuleSet();
  console.log(`new-system modules (skipped): ${safeModules.size}`);
  let modulesEdited = 0;
  let taskEntriesRemoved = 0;
  const allRemovedTaskIds = new Set();
  const moduleNotFound = [];
  const noopModules = [];
  const skippedSafe = [];

  for (const { moduleId, remove } of entries) {
    if (remove.length === 0) {
      noopModules.push(moduleId);
      continue;
    }
    if (safeModules.has(moduleId)) {
      skippedSafe.push(moduleId);
      continue;
    }
    const modPath = path.join(MODULES_DIR, `${moduleId}.json`);
    if (!(await exists(modPath))) {
      moduleNotFound.push(moduleId);
      continue;
    }
    const mod = await loadJson(modPath);
    const removeSet = new Set(remove);
    const before = (mod.tasks || []).length;
    const filtered = (mod.tasks || []).filter(t => !removeSet.has(t?.task_ref));
    const removed = before - filtered.length;
    if (removed === 0) continue; // nothing to strip
    mod.tasks = filtered;
    await writeJson(modPath, mod);
    modulesEdited++;
    taskEntriesRemoved += removed;
    for (const t of remove) allRemovedTaskIds.add(t);
  }
  if (skippedSafe.length) {
    console.log(`skipped ${skippedSafe.length} new-system modules:`);
    for (const id of skippedSafe.slice(0, 8)) console.log(`    ${id}`);
    if (skippedSafe.length > 8) console.log(`    ... +${skippedSafe.length - 8} more`);
  }

  console.log(`modules edited: ${modulesEdited}`);
  console.log(`task entries removed: ${taskEntriesRemoved}`);
  console.log(`distinct task IDs touched: ${allRemovedTaskIds.size}`);
  if (moduleNotFound.length) {
    console.log(`! modules not found in canonical (already archived?): ${moduleNotFound.length}`);
    for (const id of moduleNotFound) console.log(`    ${id}`);
  }

  // Now find tasks that are no longer referenced by ANY remaining canonical
  // module — those are orphans and can be archived.
  const moduleFiles = (await fs.readdir(MODULES_DIR)).filter(f => f.endsWith('.json'));
  const referencedTaskIds = new Set();
  for (const f of moduleFiles) {
    const mod = await loadJson(path.join(MODULES_DIR, f));
    for (const t of (mod.tasks || [])) {
      if (t?.task_ref) referencedTaskIds.add(t.task_ref);
    }
  }
  // Also include task_refs from archived modules so we don't archive a task
  // that an archived module still references (in case of restore).
  // Skipping that conservatism here — pre-production, git is the safety net.

  const orphans = [...allRemovedTaskIds].filter(t => !referencedTaskIds.has(t));
  console.log(`\norphan tasks (no remaining module references): ${orphans.length}`);

  // Archive orphan task JSONs
  await fs.mkdir(TASKS_ARCHIVE_DIR, { recursive: true });
  let tasksArchived = 0;
  let tasksMissing = 0;
  let tasksOverwriteArchive = 0;
  for (const tid of orphans) {
    const src = path.join(TASKS_DIR, `${tid}.json`);
    const dst = path.join(TASKS_ARCHIVE_DIR, `${tid}.json`);
    if (!(await exists(src))) {
      tasksMissing++;
      continue;
    }
    if (await exists(dst)) {
      tasksOverwriteArchive++;
      await fs.unlink(dst);
    }
    await fs.rename(src, dst);
    tasksArchived++;
  }
  console.log(`tasks archived: ${tasksArchived}, missing: ${tasksMissing}, overwrites: ${tasksOverwriteArchive}`);

  // Sanity: scan scenarios for refs to any module/task we may have missed.
  // (Scenarios reference modules, modules reference tasks. Removing tasks
  // from modules doesn't break scenario refs — scenarios still reference
  // the modules. We only strip tasks within modules here.)
}

main().catch(e => { console.error(e); process.exit(1); });
