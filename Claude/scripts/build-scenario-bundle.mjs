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
import { loadModules, resolveExtends, loadScenarios, loadModifiers, loadTasks, computeTaskDerived, TEMPLATE_KIND } from './lib/scenario-sources.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const outDir = path.join(repoRoot, 'Claude', 'tools', 'paintscope', 'src', 'data');
const outFile = path.join(outDir, 'scenario-bundle.gen.js');

/**
 * Post-resolution invariant: any module that came through extends resolution
 * (carries `_extends` provenance) must have non-empty tasks + phase. Plain
 * modules are exempt (some intentionally have empty tasks, e.g. setup stubs).
 */
function validateExtenderInvariants(modules) {
  const errors = [];
  for (const mod of Object.values(modules)) {
    if (!mod._extends) continue;
    if (!Array.isArray(mod.tasks) || mod.tasks.length === 0) {
      errors.push(`${mod.module_id}: extender resolved to empty tasks (template missing tasks?)`);
    }
    if (!mod.phase) {
      errors.push(`${mod.module_id}: extender resolved without phase`);
    }
  }
  if (errors.length > 0) {
    throw new Error(`Post-resolution invariant failed:\n  ${errors.join('\n  ')}`);
  }
}

/**
 * Scenarios may not reference template module IDs — they reference substrate
 * (resolved) modules. This catches author mistakes where someone wires a
 * scenario to a template by accident.
 */
function validateNoTemplateScenarioRefs(modules, scenarios) {
  const templateIds = new Set();
  for (const mod of Object.values(modules)) {
    if (mod.kind === TEMPLATE_KIND) templateIds.add(mod.module_id);
  }
  if (templateIds.size === 0) return;
  const violations = [];
  for (const scn of scenarios) {
    if (!Array.isArray(scn.modules)) continue;
    for (const mid of scn.modules) {
      if (templateIds.has(mid)) violations.push(`${scn.scenario_id} -> ${mid}`);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Scenarios cannot reference template modules:\n  ${violations.join('\n  ')}`);
  }
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
  console.log('Loading modules...');
  const rawModules = loadModules();
  console.log(`  ${Object.keys(rawModules).length} modules loaded`);

  console.log('Resolving module extends...');
  const modules = resolveExtends(rawModules);
  const templateCount = Object.values(modules).filter(m => m.kind === TEMPLATE_KIND).length;
  const extenderCount = Object.values(modules).filter(m => m._extends).length;
  console.log(`  ${templateCount} template(s), ${extenderCount} extender(s) resolved`);

  console.log('Loading scenarios...');
  const scenarios = loadScenarios();
  console.log(`  ${scenarios.length} scenarios loaded`);

  console.log('Loading modifiers...');
  const modifiers = loadModifiers();
  console.log(`  ${Object.keys(modifiers).length} modifiers loaded`);

  console.log('Loading tasks...');
  const tasks = loadTasks();
  console.log(`  ${Object.keys(tasks).length} tasks loaded`);

  console.log('Validating bundle integrity...');
  validate(modules, scenarios);
  validateTaskRefs(modules, tasks);
  validateExtenderInvariants(modules);
  validateNoTemplateScenarioRefs(modules, scenarios);
  console.log('  OK');

  console.log('Computing _derived classifications for tasks...');
  computeTaskDerived(modules, scenarios, tasks);
  const taskList = Object.values(tasks);
  const orphans = taskList.filter(t => t._derived?.module_count === 0).length;
  const noPhase = taskList.filter(t => t._derived?.phases.length === 0).length;
  const noSubstrate = taskList.filter(t => t._derived?.substrates.length === 0).length;
  console.log(`  ${taskList.length} tasks · ${orphans} orphan · ${noPhase} no-phase · ${noSubstrate} no-substrate`);

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
