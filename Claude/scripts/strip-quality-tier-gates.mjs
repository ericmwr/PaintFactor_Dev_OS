#!/usr/bin/env node
// strip-quality-tier-gates.mjs
//
// Self-gating migration: removes applies_when.quality_tier from module task
// entries while keeping QT3 estimates byte-identical.
//
//   INCLUDE_QT3 entries (quality_tier array contains 'QT3'):
//     Strip the quality_tier key. If applies_when becomes empty, delete it.
//     These tasks now fire at ALL tiers (QT3 behavior preserved).
//
//   EXCLUDE_QT3 entries (quality_tier array excludes 'QT3'):
//     Drop the task entry entirely.
//     These were QT2/QT4/QT5-only placeholders; QT3 never fired them.
//
// Gate: the script computes the QT3 fired-task set for every concrete QT3
// context before and after, and ABORTS (exit 1, no writes) if any set changes.
//
// Usage (from repo root or tools/paintscope):
//   npx vite-node ../../scripts/strip-quality-tier-gates.mjs           # dry-run (safe, no writes)
//   npx vite-node ../../scripts/strip-quality-tier-gates.mjs -- --apply # applies changes
//
// Default = dry-run. Explicit --apply required to write.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findBestMatch } from '../tools/paintscope/src/engine/scenario-matcher.js';
import { transformModule } from './lib/strip-qt-gates-core.mjs';

// ---------------------------------------------------------------------------
// Path resolution — works from any cwd (repo root or tools/paintscope)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname = Claude/scripts → parent is Claude root
const claudeRoot = path.resolve(__dirname, '..');

const scenariosDir = path.join(claudeRoot, 'scenarios');
const modulesDir = path.join(claudeRoot, 'modules');
const modifiersDir = path.join(claudeRoot, 'modifiers');
const tasksDir = path.join(claudeRoot, 'tasks');

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;

// ---------------------------------------------------------------------------
// Loaders (mirrors build-scenario-bundle.mjs — root-only, no subdirs)
// ---------------------------------------------------------------------------

function loadScenarios() {
  const records = [];
  const files = fs.readdirSync(scenariosDir)
    .filter(f => f.startsWith('SCN_') && f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(scenariosDir, file);
    const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    records.push({ file, path: filePath, json });
  }
  return records;
}

function loadModules() {
  const modules = {};
  const moduleFiles = {}; // module_id -> file path (for writing)
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!entry.name.startsWith('MOD_') || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(modulesDir, entry.name);
    const mod = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (mod.module_id) {
      modules[mod.module_id] = mod;
      moduleFiles[mod.module_id] = filePath;
    }
  }
  return { modules, moduleFiles };
}

function loadModifiers() {
  const modifiers = {};
  if (!fs.existsSync(modifiersDir)) return modifiers;
  for (const file of fs.readdirSync(modifiersDir)) {
    if (!(file.startsWith('FAC_') || file.startsWith('TRADE_')) || !file.endsWith('.json')) continue;
    const mod = JSON.parse(fs.readFileSync(path.join(modifiersDir, file), 'utf8'));
    if (mod.modifier_id) modifiers[mod.modifier_id] = mod;
  }
  return modifiers;
}

function loadTasks() {
  const tasks = {};
  if (!fs.existsSync(tasksDir)) return tasks;
  for (const file of fs.readdirSync(tasksDir)) {
    if (!file.startsWith('TSK_') || !file.endsWith('.json')) continue;
    const task = JSON.parse(fs.readFileSync(path.join(tasksDir, file), 'utf8'));
    if (task.task_id) tasks[task.task_id] = task;
  }
  return tasks;
}

// ---------------------------------------------------------------------------
// EOL-preserving serializer (from collapse-to-qt3-baseline.mjs)
// ---------------------------------------------------------------------------
function serializePreservingEol(originalPath, obj) {
  let original = '';
  try {
    original = fs.readFileSync(originalPath, 'utf8');
  } catch {
    // No original → default to LF + trailing nl.
  }
  const usesCrlf = original.includes('\r\n');
  const trailingNewline = original.length === 0 ? true : /\r?\n$/.test(original);

  let out = JSON.stringify(obj, null, 2); // JSON.stringify always emits \n
  if (trailingNewline) out += '\n';
  if (usesCrlf) out = out.replace(/\n/g, '\r\n');
  return out;
}

// ---------------------------------------------------------------------------
// Context universe (from collapse-to-qt3-baseline.mjs)
// ---------------------------------------------------------------------------

function expandScenarioContexts(scenario) {
  const m = scenario.matches || {};
  const keys = Object.keys(m).filter((k) => k !== 'quality_tier');
  let combos = [{}];
  for (const k of keys) {
    const v = m[k];
    const options = Array.isArray(v) ? v : [v];
    const next = [];
    for (const base of combos) {
      for (const opt of options) {
        next.push({ ...base, [k]: opt });
      }
    }
    combos = next;
  }
  return combos;
}

function buildQt3ContextUniverse(scenarios) {
  const seen = new Map();
  for (const scn of scenarios) {
    for (const partial of expandScenarioContexts(scn)) {
      const ctx = { ...partial, quality_tier: 'QT3' };
      const jsonKey = JSON.stringify(
        Object.keys(ctx).sort().reduce((o, k) => ((o[k] = ctx[k]), o), {})
      );
      if (!seen.has(jsonKey)) seen.set(jsonKey, ctx);
    }
  }
  return [...seen.values()];
}

// ---------------------------------------------------------------------------
// Faithful replica of evaluateAppliesWhen (run-estimate-scenario.js:515-544)
//
// Replication contract:
//   - AND across all keys in condition
//   - Only array-valued keys are enforced (scalar values skipped)
//   - values.includes(ctx[key]) membership check
//   - `coat` key: compares String(coatNumber) to values.map(String)
//   - `coat_lt_ctx` key: fires when coatNumber < Number(ctx[values[0]])
//   - quality_tier read as ctx.quality_tier (standard key lookup)
// ---------------------------------------------------------------------------

function evaluateAppliesWhen(condition, ctx, coatNumber) {
  if (!condition || typeof condition !== 'object' || Object.keys(condition).length === 0) {
    return true;
  }
  for (const [key, values] of Object.entries(condition)) {
    if (key === 'coat_lt_ctx') {
      const field = Array.isArray(values) ? values[0] : values;
      const max = Number(ctx[field]);
      if (!(Number.isFinite(max) && coatNumber < max)) return false;
      continue;
    }
    if (!Array.isArray(values)) continue;
    let ctxValue;
    if (key === 'coat') {
      ctxValue = coatNumber;
    } else {
      ctxValue = ctx[key];
    }
    if (key === 'coat') {
      if (!values.map(String).includes(String(ctxValue))) return false;
    } else {
      if (!values.includes(ctxValue)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fired-task set computation
//
// findBestMatch → walk scenario.modules (with dynamic_coats expansion) →
// per task entry, if evaluateAppliesWhen true → collect `module_id::task_ref`.
// Returns a sorted array (the fired set for this ctx).
//
// Note: for quality_tier gate comparison, coatNumber=1 is used throughout.
// Quality_tier gates are coat-independent (no `coat` key in those entries).
// Using coatNumber=1 consistently for both before/after ensures the relative
// comparison is sound — any genuine difference will surface as a set diff.
// ---------------------------------------------------------------------------

function firedTasksAtQt3(bundle, ctx) {
  const result = findBestMatch(bundle, ctx);
  const scenario = result.scenario;
  if (!scenario) return [];

  // Dynamic coats expansion (mirrors engine lines 786-816)
  const dynamicCoats = scenario.dynamic_coats || {};
  const entries = [];
  for (const moduleId of scenario.modules || []) {
    const config = dynamicCoats[moduleId];
    if (config) {
      let ctxField, interstageModule = null;
      if (typeof config === 'string') {
        ctxField = config;
      } else if (config && typeof config === 'object') {
        ctxField = config.field;
        interstageModule = config.interstage || null;
      }
      const n = Number(ctx[ctxField]);
      const reps = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
      for (let i = 0; i < reps; i++) entries.push({ moduleId, interstageModule });
    } else {
      entries.push({ moduleId, interstageModule: null });
    }
  }
  // Interleave interstage between consecutive entries (mirrors engine lines 809-816)
  const expandedModules = [];
  for (let i = 0; i < entries.length; i++) {
    expandedModules.push(entries[i].moduleId);
    const next = entries[i + 1];
    if (entries[i].interstageModule && next && next.interstageModule) {
      expandedModules.push(entries[i].interstageModule);
    }
  }

  const fired = [];
  const moduleInvocations = {};
  for (const moduleId of expandedModules) {
    const mod = bundle.modules[moduleId];
    if (!mod) continue;
    moduleInvocations[moduleId] = (moduleInvocations[moduleId] || 0) + 1;
    // Engine uses coatNumber from module phase; use 1 for relative comparison
    const coatNumber = 1;
    for (const taskEntry of mod.tasks || []) {
      // The entry's applies_when (if present) overrides/provides the condition
      // (after resolveTaskFromRef merges entry over canonical task, the entry's
      // applies_when wins). We check entry.applies_when directly since that is
      // what taskEntry carries and what resolveTaskFromRef preserves in the
      // override merge.
      const condition = taskEntry.applies_when;
      if (condition && !evaluateAppliesWhen(condition, ctx, coatNumber)) {
        continue;
      }
      const ref = taskEntry.task_ref || taskEntry.task_id || '?';
      fired.push(`${moduleId}::${ref}`);
    }
  }

  return fired.sort();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== strip-quality-tier-gates ===');
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (safe, no writes)' : 'APPLY'}`);
console.log();

// 1. Load source files
console.log('Loading scenarios...');
const scenarioRecords = loadScenarios();
console.log(`  ${scenarioRecords.length} scenario files`);

console.log('Loading modules...');
const { modules: beforeModules, moduleFiles } = loadModules();
console.log(`  ${Object.keys(beforeModules).length} modules`);

console.log('Loading modifiers...');
const modifiers = loadModifiers();
console.log(`  ${Object.keys(modifiers).length} modifiers`);

console.log('Loading tasks...');
const tasks = loadTasks();
console.log(`  ${Object.keys(tasks).length} tasks`);
console.log();

// 2. Build BEFORE bundle
const allScenarios = scenarioRecords.map(r => r.json);
const beforeBundle = { scenarios: allScenarios, modules: beforeModules, modifiers, tasks };

// 3. Build AFTER modules via transformModule
const transformResults = {}; // module_id -> { module, stripped, removed }
const afterModules = {};
let totalStripped = 0;
let totalRemoved = 0;
let modulesChanged = 0;

for (const [id, mod] of Object.entries(beforeModules)) {
  const result = transformModule(mod);
  transformResults[id] = result;
  afterModules[id] = result.module;
  if (result.stripped.length > 0 || result.removed.length > 0) {
    modulesChanged++;
    totalStripped += result.stripped.length;
    totalRemoved += result.removed.length;
  }
}

// 4. Build AFTER bundle
const afterBundle = { scenarios: allScenarios, modules: afterModules, modifiers, tasks };

// 5. Build QT3 context universe
console.log('Building QT3 context universe (cartesian over all scenario matches)...');
const qt3Universe = buildQt3ContextUniverse(allScenarios);
console.log(`  ${qt3Universe.length} distinct QT3 contexts`);

// 6. Compute BEFORE and AFTER fired sets for each QT3 context
console.log('Computing BEFORE fired-task sets...');
const beforeFired = qt3Universe.map(ctx => firedTasksAtQt3(beforeBundle, ctx));
console.log('Computing AFTER fired-task sets...');
const afterFired = qt3Universe.map(ctx => firedTasksAtQt3(afterBundle, ctx));

// 7. GATE: compare before vs after for every QT3 context
console.log('Running QT3 fired-set gate...');
const diffs = [];
for (let i = 0; i < qt3Universe.length; i++) {
  const bStr = JSON.stringify(beforeFired[i]);
  const aStr = JSON.stringify(afterFired[i]);
  if (bStr !== aStr) {
    const added = afterFired[i].filter(f => !beforeFired[i].includes(f));
    const removed = beforeFired[i].filter(f => !afterFired[i].includes(f));
    diffs.push({ ctx: qt3Universe[i], added, removed });
  }
}

// 8. Per-module report
console.log();
console.log('=== PER-MODULE REPORT ===');
const changedModuleIds = Object.entries(transformResults)
  .filter(([, r]) => r.stripped.length > 0 || r.removed.length > 0)
  .map(([id]) => id)
  .sort();

for (const id of changedModuleIds) {
  const r = transformResults[id];
  console.log(`${id}`);
  if (r.stripped.length > 0) {
    console.log(`  STRIPPED (${r.stripped.length}): ${r.stripped.join(', ')}`);
  }
  if (r.removed.length > 0) {
    console.log(`  REMOVED  (${r.removed.length}): ${r.removed.join(', ')}`);
  }
}

console.log();
console.log('=== TOTALS ===');
console.log(`  Modules changed:  ${modulesChanged}`);
console.log(`  Entries stripped: ${totalStripped}`);
console.log(`  Entries removed:  ${totalRemoved}`);

console.log();
console.log('=== QT3 FIRED-SET GATE ===');
console.log(`  Contexts swept:  ${qt3Universe.length}`);
console.log(`  QT3 fired-set diffs: ${diffs.length}`);

if (diffs.length > 0) {
  console.error();
  console.error('=== GATE FAILURE: QT3 FIRED-SET CHANGED ===');
  for (const d of diffs) {
    console.error(`  ctx: ${JSON.stringify(d.ctx)}`);
    if (d.added.length > 0) console.error(`    ADDED:   ${d.added.join(', ')}`);
    if (d.removed.length > 0) console.error(`    REMOVED: ${d.removed.join(', ')}`);
  }
  console.error(`\nAbort: ${diffs.length} QT3 context(s) would have a different fired-task set. No writes performed.`);
  process.exit(1);
}

console.log(`Gate: PASSED (0 QT3 fired-set diffs; ${qt3Universe.length} contexts swept)`);
console.log();

// 9. Apply (only with --apply and gate passed)
if (DRY_RUN) {
  console.log('Dry-run complete. Run with --apply to write changes.');
} else {
  console.log('Applying changes...');
  let written = 0;
  for (const id of changedModuleIds) {
    const filePath = moduleFiles[id];
    const outModule = afterModules[id];
    fs.writeFileSync(filePath, serializePreservingEol(filePath, outModule), 'utf8');
    written++;
  }
  console.log(`  Wrote ${written} module files.`);
  console.log('Apply complete.');
}
