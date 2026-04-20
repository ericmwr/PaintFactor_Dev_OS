#!/usr/bin/env node
// Codegen: bundle all MOD_*.json + SCN_*.json into a single JS module
// the browser can import. Mirrors the shape produced by scenario-loader.js.
//
// Usage:
//   node Claude/scripts/build-scenario-bundle.mjs
//
// Output: Claude/tools/paintscope/src/data/scenario-bundle.gen.js

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const modulesDir = path.join(repoRoot, 'Claude', 'modules');
const scenariosDir = path.join(repoRoot, 'Claude', 'scenarios');
const modifiersDir = path.join(repoRoot, 'Claude', 'modifiers');
const tasksDir = path.join(repoRoot, 'Claude', 'tasks');
const outDir = path.join(repoRoot, 'Claude', 'tools', 'paintscope', 'src', 'data');
const outFile = path.join(outDir, 'scenario-bundle.gen.js');

function loadModules() {
  const modules = {};
  const files = fs.readdirSync(modulesDir).filter(f => f.startsWith('MOD_') && f.endsWith('.json'));
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(modulesDir, file), 'utf8'));
    if (!mod.module_id) throw new Error(`Module ${file} missing module_id`);
    if (modules[mod.module_id]) throw new Error(`Duplicate module_id ${mod.module_id} (${file})`);
    modules[mod.module_id] = mod;
  }
  return modules;
}

function loadScenarios() {
  const scenarios = [];
  const files = fs.readdirSync(scenariosDir).filter(f => f.startsWith('SCN_') && f.endsWith('.json'));
  for (const file of files) {
    const scn = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
    if (!scn.scenario_id) throw new Error(`Scenario ${file} missing scenario_id`);
    scenarios.push(scn);
  }
  return scenarios;
}

function loadModifiers() {
  const modifiers = {};
  if (!fs.existsSync(modifiersDir)) return modifiers;
  const files = fs.readdirSync(modifiersDir).filter(f => f.startsWith('FAC_') && f.endsWith('.json'));
  for (const file of files) {
    const mod = JSON.parse(fs.readFileSync(path.join(modifiersDir, file), 'utf8'));
    if (!mod.modifier_id) throw new Error(`Modifier ${file} missing modifier_id`);
    if (modifiers[mod.modifier_id]) throw new Error(`Duplicate modifier_id ${mod.modifier_id} (${file})`);
    modifiers[mod.modifier_id] = mod;
  }
  return modifiers;
}

function loadTasks() {
  const tasks = {};
  if (!fs.existsSync(tasksDir)) return tasks;
  const files = fs.readdirSync(tasksDir).filter(f => f.startsWith('TSK_') && f.endsWith('.json'));
  for (const file of files) {
    const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf8'));
    if (!task.task_id) throw new Error(`Task ${file} missing task_id`);
    if (tasks[task.task_id]) throw new Error(`Duplicate task_id ${task.task_id} (${file})`);
    tasks[task.task_id] = task;
  }
  return tasks;
}

/**
 * Surface drift risk: if a task_id appears both in the library AND inline in any
 * module, warn so authors can opportunistically migrate the inline copy. The
 * build still succeeds — inline and library are independent consumers of the
 * same ID, not a conflict.
 */
function warnInlineVsLibraryCollisions(modules, tasks) {
  const libraryIds = new Set(Object.keys(tasks));
  if (libraryIds.size === 0) return;
  const collisions = new Map(); // task_id -> [module_id, module_id, ...]
  for (const mod of Object.values(modules)) {
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      // Only inline entries (no task_ref) with a matching task_id are collisions
      if (!entry || entry.task_ref) continue;
      if (entry.task_id && libraryIds.has(entry.task_id)) {
        if (!collisions.has(entry.task_id)) collisions.set(entry.task_id, []);
        collisions.get(entry.task_id).push(mod.module_id);
      }
    }
  }
  if (collisions.size === 0) return;
  console.warn(`\n  WARNING: ${collisions.size} task_id(s) exist in library AND inline in modules.`);
  console.warn('  Opportunistic migration candidates (swap inline -> task_ref):');
  for (const [taskId, modIds] of collisions) {
    console.warn(`    ${taskId} — inline in: ${modIds.join(', ')}`);
  }
}

function validateTaskRefs(modules, tasks) {
  const unresolved = [];
  for (const mod of Object.values(modules)) {
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (entry && entry.task_ref && !tasks[entry.task_ref]) {
        unresolved.push(`${mod.module_id} -> ${entry.task_ref}`);
      }
    }
  }
  if (unresolved.length > 0) {
    throw new Error(`Unresolved task_ref references:\n  ${unresolved.join('\n  ')}`);
  }
}

function validate(modules, scenarios) {
  const unresolved = [];
  for (const scn of scenarios) {
    if (!Array.isArray(scn.modules)) {
      throw new Error(`Scenario ${scn.scenario_id} missing modules array`);
    }
    for (const mid of scn.modules) {
      if (!modules[mid]) unresolved.push(`${scn.scenario_id} -> ${mid}`);
    }
  }
  if (unresolved.length > 0) {
    throw new Error(`Unresolved module references:\n  ${unresolved.join('\n  ')}`);
  }
}

function main() {
  console.log('Loading modules from', modulesDir);
  const modules = loadModules();
  console.log(`  ${Object.keys(modules).length} modules loaded`);

  console.log('Loading scenarios from', scenariosDir);
  const scenarios = loadScenarios();
  console.log(`  ${scenarios.length} scenarios loaded`);

  console.log('Loading modifiers from', modifiersDir);
  const modifiers = loadModifiers();
  console.log(`  ${Object.keys(modifiers).length} modifiers loaded`);

  console.log('Loading tasks from', tasksDir);
  const tasks = loadTasks();
  console.log(`  ${Object.keys(tasks).length} tasks loaded`);

  console.log('Validating bundle integrity...');
  validate(modules, scenarios);
  validateTaskRefs(modules, tasks);
  console.log('  OK');

  warnInlineVsLibraryCollisions(modules, tasks);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const header = `// AUTO-GENERATED by Claude/scripts/build-scenario-bundle.mjs
// DO NOT EDIT MANUALLY. Run the build script to regenerate.
// Source: Claude/modules/MOD_*.json + Claude/scenarios/SCN_*.json + Claude/modifiers/FAC_*.json + Claude/tasks/TSK_*.json
// Generated: ${new Date().toISOString()}
// Modules: ${Object.keys(modules).length}
// Scenarios: ${scenarios.length}
// Modifiers: ${Object.keys(modifiers).length}
// Tasks: ${Object.keys(tasks).length}

`;

  const body = `export const modules = ${JSON.stringify(modules, null, 2)};\n\n` +
               `export const scenarios = ${JSON.stringify(scenarios, null, 2)};\n\n` +
               `export const modifiers = ${JSON.stringify(modifiers, null, 2)};\n\n` +
               `export const tasks = ${JSON.stringify(tasks, null, 2)};\n\n` +
               `export const scenarioBundle = { modules, scenarios, modifiers, tasks };\n\n` +
               `export default scenarioBundle;\n`;

  fs.writeFileSync(outFile, header + body, 'utf8');
  const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
  console.log(`Wrote ${outFile} (${sizeKb} KB)`);
}

main();
