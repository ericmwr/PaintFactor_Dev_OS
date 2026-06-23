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
  // Walk modules/ root + recurse only into `_*` subdirs (e.g. _test/ fixtures).
  // `archive/` and other non-underscore subdirs are skipped on purpose.
  function walk(dir, isRoot) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (isRoot && entry.name.startsWith('_')) walk(full, false);
        continue;
      }
      if (entry.isFile() && entry.name.startsWith('MOD_') && entry.name.endsWith('.json')) {
        const mod = JSON.parse(fs.readFileSync(full, 'utf8'));
        if (!mod.module_id) throw new Error(`Module ${entry.name} missing module_id`);
        if (modules[mod.module_id]) throw new Error(`Duplicate module_id ${mod.module_id} (${entry.name})`);
        modules[mod.module_id] = mod;
      }
    }
  }
  walk(modulesDir, true);
  return modules;
}

/**
 * Resolve `extends` references between modules. A module with `extends: "MOD_X"`
 * inherits MOD_X's payload, with the child's own keys layered on top per the
 * shallow-merge rules below. Templates (kind: "template") are kept in the bundle
 * for authoring but are not directly runnable.
 *
 * Merge rules:
 *   - tasks: child fully replaces parent if child defines a tasks array.
 *   - modifier_eligibility: per-key merge; child overrides individual flags.
 *   - all other top-level keys: child wins shallowly.
 *
 * Output:
 *   - extender modules have `extends` and `kind` stripped, `_extends` provenance added.
 *   - templates pass through unchanged (still flagged kind:"template").
 *
 * Errors:
 *   - extends references missing module
 *   - cycle in extends chain
 *   - depth > 5
 */
const TEMPLATE_KIND = 'template';
const EXTENDS_MAX_DEPTH = 5;

function resolveExtends(rawModules) {
  const resolved = {};

  function resolveOne(mod, depth, seen) {
    if (depth > EXTENDS_MAX_DEPTH) {
      throw new Error(`extends chain exceeds depth ${EXTENDS_MAX_DEPTH} starting at ${mod.module_id}`);
    }
    if (!mod.extends) {
      return structuredClone(mod);
    }
    if (seen.has(mod.module_id)) {
      const chain = [...seen, mod.module_id].join(' -> ');
      throw new Error(`Cycle detected in extends chain: ${chain}`);
    }
    seen.add(mod.module_id);

    const parent = rawModules[mod.extends];
    if (!parent) {
      throw new Error(`Module ${mod.module_id} extends ${mod.extends} which does not exist`);
    }

    const resolvedParent = resolveOne(parent, depth + 1, seen);
    const merged = structuredClone(resolvedParent);

    for (const [key, value] of Object.entries(mod)) {
      if (key === 'extends' || key === 'kind') continue;
      if (key === 'modifier_eligibility' && resolvedParent.modifier_eligibility) {
        merged[key] = { ...resolvedParent.modifier_eligibility, ...value };
      } else {
        merged[key] = structuredClone(value);
      }
    }

    delete merged.extends;
    delete merged.kind;
    merged._extends = mod.extends;
    return merged;
  }

  for (const mod of Object.values(rawModules)) {
    if (mod.kind === TEMPLATE_KIND) {
      resolved[mod.module_id] = structuredClone(mod);
    } else if (mod.extends) {
      resolved[mod.module_id] = resolveOne(mod, 0, new Set());
    } else {
      resolved[mod.module_id] = structuredClone(mod);
    }
  }
  return resolved;
}

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
  // Modifiers come in two prefix flavors: FAC_* (project-level: QT, height,
  // texture, etc.) and TRADE_* (trade-level: material, overhead). Both load
  // into the same registry; the engine treats them the same way mathematically
  // (only their UI presentation differs — TRADE_* fold into the rate, FAC_*
  // appear in the modifier column).
  const files = fs.readdirSync(modifiersDir).filter(f =>
    (f.startsWith('FAC_') || f.startsWith('TRADE_')) && f.endsWith('.json')
  );
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

/**
 * Walk the canonical reference graph and inject a `_derived` block onto every
 * canonical task. The block carries the union of every classification that
 * can be reached transitively from this task: phases via the modules that
 * use it, substrate / qt / context via the scenarios that use those modules.
 *
 * Shape per task:
 *   _derived: {
 *     phases:      string[],   // module phases that include this task
 *     methods:     string[],   // application_method on parent modules
 *     substrates:  string[],   // paintable_item on reachable scenarios
 *     qts:         string[],   // QT2..QT5
 *     buckets:     string[],   // nc_interior / nc_exterior / rp_interior / rp_exterior
 *     coatings:    string[],   // paint / stain / clear / prime
 *     module_count:    number, // # canonical modules referencing this task
 *     scenario_count:  number, // # canonical scenarios reachable through those modules
 *   }
 *
 * Read by TaskList chip filters and TaskEditor's classification panel — both
 * read the precomputed fields directly, so the runtime stays cheap.
 */
function computeTaskDerived(modules, scenarios, tasks) {
  const moduleMeta = new Map();
  const moduleByTask = new Map();
  for (const mod of Object.values(modules)) {
    if (mod.kind === TEMPLATE_KIND) continue;
    moduleMeta.set(mod.module_id, { phase: mod.phase || null });
    if (!Array.isArray(mod.tasks)) continue;
    for (const entry of mod.tasks) {
      if (!entry?.task_ref) continue;
      let cur = moduleByTask.get(entry.task_ref);
      if (!cur) { cur = new Set(); moduleByTask.set(entry.task_ref, cur); }
      cur.add(mod.module_id);
    }
  }

  const moduleClassification = new Map();
  for (const scn of scenarios) {
    const sb = scenarioBuckets(scn);
    const sQT = scenarioQTs(scn);
    const sub = scenarioSubstrate(scn);
    const coat = scenarioCoating(scn);
    const meth = scenarioMethod(scn);
    for (const mid of scn.modules || []) {
      if (typeof mid !== 'string') continue;
      let cls = moduleClassification.get(mid);
      if (!cls) {
        cls = { substrates: new Set(), qts: new Set(), buckets: new Set(), coatings: new Set(), methods: new Set(), scenario_ids: new Set() };
        moduleClassification.set(mid, cls);
      }
      if (sub) cls.substrates.add(sub);
      for (const q of sQT) cls.qts.add(q);
      for (const b of sb) cls.buckets.add(b);
      if (coat) cls.coatings.add(coat);
      if (meth) cls.methods.add(meth);
      cls.scenario_ids.add(scn.scenario_id);
    }
  }

  for (const task of Object.values(tasks)) {
    const usedBy = moduleByTask.get(task.task_id) || new Set();
    const phases = new Set();
    const methods = new Set();
    const substrates = new Set();
    const qts = new Set();
    const buckets = new Set();
    const coatings = new Set();
    const scenarioIds = new Set();
    for (const mid of usedBy) {
      const meta = moduleMeta.get(mid);
      if (meta?.phase) phases.add(meta.phase);
      const cls = moduleClassification.get(mid);
      if (cls) {
        for (const s of cls.substrates) substrates.add(s);
        for (const q of cls.qts) qts.add(q);
        for (const b of cls.buckets) buckets.add(b);
        for (const c of cls.coatings) coatings.add(c);
        for (const m of cls.methods) methods.add(m);
        for (const sid of cls.scenario_ids) scenarioIds.add(sid);
      }
    }
    task._derived = {
      phases: [...phases].sort(),
      methods: [...methods].sort(),
      substrates: [...substrates].sort(),
      qts: [...qts].sort(),
      buckets: [...buckets].sort(),
      coatings: [...coatings].sort(),
      module_count: usedBy.size,
      scenario_count: scenarioIds.size,
    };
  }
}

function scenarioMethod(scn) {
  const v = scn.matches?.application_method;
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}

function scenarioBuckets(scn) {
  const out = new Set();
  const domain = scn.domain;
  const context = scn.context;
  const interior = domain === 'interior' || domain === 'both';
  const exterior = domain === 'exterior' || domain === 'both';
  const nc = context === 'NC' || context === 'mixed';
  const rp = context === 'RP' || context === 'mixed';
  if (interior && nc) out.add('nc_interior');
  if (exterior && nc) out.add('nc_exterior');
  if (interior && rp) out.add('rp_interior');
  if (exterior && rp) out.add('rp_exterior');
  return out;
}

function scenarioQTs(scn) {
  const out = new Set();
  const v = scn.matches?.quality_tier;
  if (!v) return out;
  if (Array.isArray(v)) {
    for (const x of v) if (x) out.add(x);
  } else {
    out.add(v);
  }
  return out;
}

function scenarioSubstrate(scn) {
  const v = scn.matches?.paintable_item;
  if (!v) return null;
  return Array.isArray(v) ? v[0] : v;
}

function scenarioCoating(scn) {
  const explicit = scn.matches?.coating_type;
  if (explicit) return Array.isArray(explicit) ? explicit[0] : explicit;
  const id = (scn.scenario_id || '').toUpperCase();
  if (/_STAIN(?:_|$)/.test(id)) return 'stain';
  if (/_SEALER(?:_|$)/.test(id)) return 'sealer';
  if (/_CLEAR(?:_|$)/.test(id)) return 'clear';
  if (/_PRIME(?:_|$)/.test(id) || /PRIME_FROM/.test(id)) return 'prime';
  if (/_PAINT(?:_|$)/.test(id) || /_FINISH(?:_|$)/.test(id) || /_NC_/.test(id) || /_RP_/.test(id)) return 'paint';
  return null;
}

function main() {
  console.log('Loading modules from', modulesDir);
  const rawModules = loadModules();
  console.log(`  ${Object.keys(rawModules).length} modules loaded`);

  console.log('Resolving module extends...');
  const modules = resolveExtends(rawModules);
  const templateCount = Object.values(modules).filter(m => m.kind === TEMPLATE_KIND).length;
  const extenderCount = Object.values(modules).filter(m => m._extends).length;
  console.log(`  ${templateCount} template(s), ${extenderCount} extender(s) resolved`);

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
