// Audit script: identify exactly what SF_TRIM_NC_PAINT/PRIME retirement
// can safely delete vs. what's still referenced by other (kept) modules
// or scenarios.
//
// Strategy:
// 1. Identify the 8 orphan modules (SF_TRIM_NC_PAINT/PRIME-only).
// 2. For every TSK_TRIM_* task, check if it's referenced by ANY module
//    OUTSIDE the orphan set. If not referenced anywhere kept, it can be deleted.
// 3. Same for SCN_TRIM_* scenarios — they're the orphan scenario set.
// 4. Print: scenarios to delete / modules to delete / tasks to delete /
//    tasks to keep (with which modules reference them).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), '..', '..');
const claudeDir = path.join(root, 'Claude');
const modulesDir = path.join(claudeDir, 'modules');
const tasksDir = path.join(claudeDir, 'tasks');
const scenariosDir = path.join(claudeDir, 'scenarios');

// Orphan modules — SF_TRIM_NC_PAINT/PRIME-only per retirement doc
const ORPHAN_MODULES = new Set([
  'MOD_APPLY_TRIM_FINISH_BRUSH',
  'MOD_APPLY_TRIM_FINISH_SPRAY',
  'MOD_APPLY_TRIM_PRIME_BRUSH',
  'MOD_APPLY_TRIM_PRIME_SPRAY',
  'MOD_INTERSTAGE_TRIM',
  'MOD_PREP_TRIM_INITIAL',
  'MOD_PREP_TRIM_PAINT',
  'MOD_CLEANUP_TRIM_PAINT',
]);

// Scenarios with paintable_item = trim that activate SF_TRIM_NC_PAINT/PRIME
const orphanScenarios = fs.readdirSync(scenariosDir)
  .filter(f => /^SCN_TRIM_(PAINT|PRIME)_.*\.json$/.test(f))
  .map(f => f.replace(/\.json$/, ''));

// Walk every module file (json) and collect task_refs per module
const allModuleFiles = fs.readdirSync(modulesDir).filter(f => f.endsWith('.json'));
const moduleTaskRefs = {};      // moduleId -> Set<taskId>
for (const f of allModuleFiles) {
  const id = f.replace(/\.json$/, '');
  const json = JSON.parse(fs.readFileSync(path.join(modulesDir, f), 'utf-8'));
  const refs = new Set();
  for (const t of (json.tasks || [])) {
    if (t.task_ref) refs.add(t.task_ref);
  }
  moduleTaskRefs[id] = refs;
}

// Walk every scenario file and collect module_ids per scenario
const allScenarioFiles = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
const scenarioModuleRefs = {};  // scenarioId -> Set<moduleId>
for (const f of allScenarioFiles) {
  const id = f.replace(/\.json$/, '');
  const json = JSON.parse(fs.readFileSync(path.join(scenariosDir, f), 'utf-8'));
  const refs = new Set();
  // Scenarios reference modules in either `modules: ['MOD_X', ...]` or
  // `phases: { prep: { module: 'MOD_X' }, ... }` form. Walk both.
  if (Array.isArray(json.modules)) json.modules.forEach(m => refs.add(typeof m === 'string' ? m : m.module_ref));
  if (json.phases && typeof json.phases === 'object') {
    for (const phase of Object.values(json.phases)) {
      if (phase?.module) refs.add(phase.module);
      if (Array.isArray(phase?.modules)) phase.modules.forEach(m => refs.add(typeof m === 'string' ? m : m.module_ref));
    }
  }
  // Also scan deep — some scenarios use { module_ref: ... } anywhere
  const stringForm = JSON.stringify(json);
  const matches = stringForm.match(/MOD_[A-Z0-9_]+/g) || [];
  matches.forEach(m => refs.add(m));
  scenarioModuleRefs[id] = refs;
}

// Now: which modules are referenced by NON-orphan scenarios?
const moduleRefsByKept = {};  // moduleId -> Set<scenarioId>
for (const [scnId, modSet] of Object.entries(scenarioModuleRefs)) {
  if (orphanScenarios.includes(scnId)) continue;  // skip — these scenarios are also being deleted
  for (const m of modSet) {
    if (!moduleRefsByKept[m]) moduleRefsByKept[m] = new Set();
    moduleRefsByKept[m].add(scnId);
  }
}

// For each TSK_TRIM_* task, count how many KEPT modules reference it
const allTaskFiles = fs.readdirSync(tasksDir).filter(f => /^TSK_TRIM_.*\.json$/.test(f));
const trimTaskUsage = {};  // taskId -> Set<moduleId>
for (const f of allTaskFiles) {
  const taskId = f.replace(/\.json$/, '');
  const refs = new Set();
  for (const [modId, taskSet] of Object.entries(moduleTaskRefs)) {
    if (ORPHAN_MODULES.has(modId)) continue;  // skip orphan modules
    if (taskSet.has(taskId)) refs.add(modId);
  }
  trimTaskUsage[taskId] = refs;
}

const tasksToDelete = Object.entries(trimTaskUsage).filter(([, refs]) => refs.size === 0).map(([id]) => id);
const tasksToKeep = Object.entries(trimTaskUsage).filter(([, refs]) => refs.size > 0);

// Also check the kept "shared" modules from the retirement doc — confirm they ARE
// still referenced somewhere
const SHARED_MODULES_TO_CHECK = [
  'MOD_SETUP_TRIM_PAINT_PROTECT',
  'MOD_SETUP_TRIM_FLOOR_PROTECT',
  'MOD_CLEANUP_TRIM_PRIME',
  'MOD_PROTECT_TRIM_MASKING',
  'MOD_APPLY_CUTIN_TRIM',
  'MOD_SETUP_TRIM_FIXTURE_COVERS',
  'MOD_SETUP_TRIM_WALL_MASK',
];

// Output
console.log('=== SCENARIOS TO DELETE ===');
orphanScenarios.forEach(s => console.log(`  ${s}.json`));
console.log(`Total: ${orphanScenarios.length}`);

console.log('\n=== MODULES TO DELETE (orphan, SF_TRIM_NC_PAINT/PRIME-only) ===');
for (const m of ORPHAN_MODULES) console.log(`  ${m}.json`);
console.log(`Total: ${ORPHAN_MODULES.size}`);

console.log('\n=== SHARED MODULES — verify still referenced ===');
for (const m of SHARED_MODULES_TO_CHECK) {
  const refs = moduleRefsByKept[m];
  const status = refs && refs.size > 0 ? `KEEP (${refs.size} kept scenarios)` : 'UNUSED — DELETE';
  console.log(`  ${m}: ${status}`);
}

console.log('\n=== TSK_TRIM_* TASKS — TO DELETE (no kept module references) ===');
tasksToDelete.forEach(t => console.log(`  ${t}.json`));
console.log(`Total: ${tasksToDelete.length}`);

console.log('\n=== TSK_TRIM_* TASKS — TO KEEP (still referenced by kept modules) ===');
tasksToKeep.forEach(([t, refs]) => console.log(`  ${t} (${refs.size} modules: ${[...refs].slice(0, 3).join(', ')}${refs.size > 3 ? '…' : ''})`));
console.log(`Total: ${tasksToKeep.length}`);
