#!/usr/bin/env node
// collapse-to-qt3-baseline.mjs
//
// Self-gating migration: collapses every scenario family to a single QT3
// baseline by stripping quality_tier from the keeper scenario and archiving
// the rest. Includes a parity gate that aborts if any family's QT3 match
// changes after the in-memory collapse.
//
// Usage (from repo root or tools/paintscope):
//   npx vite-node Claude/scripts/collapse-to-qt3-baseline.mjs           # dry-run (safe, no writes)
//   npx vite-node Claude/scripts/collapse-to-qt3-baseline.mjs -- --apply # applies changes
//
// Default = dry-run. Explicit --apply required to write.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findBestMatch } from '../tools/paintscope/src/engine/scenario-matcher.js';
import { groupByFamily, proposeKeeper, stripQualityTier, qtKind } from './lib/collapse-core.mjs';

// ---------------------------------------------------------------------------
// Path resolution — works from any cwd (repo root or tools/paintscope)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// __dirname = Claude/scripts → two levels up to get the repo root
const repoRoot = path.resolve(__dirname, '..', '..');
const claudeRoot = path.resolve(__dirname, '..');

const scenariosDir = path.join(claudeRoot, 'scenarios');
const modulesDir = path.join(claudeRoot, 'modules');
const modifiersDir = path.join(claudeRoot, 'modifiers');
const tasksDir = path.join(claudeRoot, 'tasks');
const archiveDir = path.join(scenariosDir, 'archive');

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
  for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!entry.name.startsWith('MOD_') || !entry.name.endsWith('.json')) continue;
    const mod = JSON.parse(fs.readFileSync(path.join(modulesDir, entry.name), 'utf8'));
    if (mod.module_id) modules[mod.module_id] = mod;
  }
  return modules;
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
// Snapshot helpers
// ---------------------------------------------------------------------------

const TIERS = ['QT2', 'QT3', 'QT4', 'QT5'];

/**
 * Build a ctx from a family's match constraints (the non-quality_tier ones).
 * For array matches we pick the first element as the concrete scalar value.
 * quality_tier is set to the given tier.
 */
function ctxForFamilyTier(familyScenarios, tier) {
  // Use the first scenario's non-qt matches as representative
  const rep = familyScenarios[0];
  const m = rep.matches || {};
  const ctx = {};
  for (const [k, v] of Object.entries(m)) {
    if (k === 'quality_tier') continue;
    ctx[k] = Array.isArray(v) ? v[0] : v;
  }
  ctx.quality_tier = tier;
  return ctx;
}

/**
 * Snapshot: for each family, for each tier, record { scenario_id, modulesSig }.
 * Returns Map<familyKey, Map<tier, {scenario_id, modulesSig}|null>>
 */
function snapshot(bundle, families) {
  const snap = new Map();
  for (const [fk, fam] of families) {
    const tierMap = new Map();
    for (const tier of TIERS) {
      const ctx = ctxForFamilyTier(fam, tier);
      const result = findBestMatch(bundle, ctx);
      const scn = result.scenario;
      if (!scn) {
        tierMap.set(tier, null);
      } else {
        tierMap.set(tier, {
          scenario_id: scn.scenario_id,
          modulesSig: JSON.stringify(scn.modules || []),
        });
      }
    }
    snap.set(fk, tierMap);
  }
  return snap;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('=== collapse-to-qt3-baseline ===');
console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (safe, no writes)' : 'APPLY'}`);
console.log();

// 1. Load source files
console.log('Loading scenarios...');
const scenarioRecords = loadScenarios();
console.log(`  ${scenarioRecords.length} scenario files`);

console.log('Loading modules...');
const modules = loadModules();
console.log(`  ${Object.keys(modules).length} modules`);

console.log('Loading modifiers...');
const modifiers = loadModifiers();
console.log(`  ${Object.keys(modifiers).length} modifiers`);

console.log('Loading tasks...');
const tasks = loadTasks();
console.log(`  ${Object.keys(tasks).length} tasks`);
console.log();

// 2. Build in-memory bundle with all source scenarios
const allScenarios = scenarioRecords.map(r => r.json);
const sourceBundle = { scenarios: allScenarios, modules, modifiers, tasks };

// 3. Group by family
const families = groupByFamily(allScenarios);
console.log(`Families: ${families.size}`);

// 4. BEFORE snapshot
console.log('Taking BEFORE snapshot (QT2..QT5 per family)...');
const beforeSnap = snapshot(sourceBundle, families);
console.log('  done');
console.log();

// 5. Plan: propose keeper per family
const proposals = new Map(); // familyKey -> { keeper, archive, reason, noQt3 }
for (const [fk, fam] of families) {
  proposals.set(fk, proposeKeeper(fam));
}

// Counts
let familyCount = families.size;
let strippedQT3scalar = 0;
let strippedArray = 0;
let archived = 0;
let collisionFamilies = 0;
const noQt3Families = [];

for (const [fk, prop] of proposals) {
  const kind = qtKind(prop.keeper);
  if (kind === 'scalar') strippedQT3scalar++;
  else if (kind === 'array') strippedArray++;
  // baselines need no stripping (already have no quality_tier)
  archived += prop.archive.length;
  if (prop.noQt3) noQt3Families.push(prop.keeper.scenario_id);

  // collision = family has >1 scenario that could serve as a baseline
  // (i.e. multiple baselines or multiple QT3 scalars → tie-broken by ID)
  const fam = families.get(fk);
  const baselineCount = fam.filter(s => qtKind(s) === 'baseline').length;
  const scalarQT3Count = fam.filter(s => qtKind(s) === 'scalar' && s.matches?.quality_tier === 'QT3').length;
  if (baselineCount > 1 || scalarQT3Count > 1) collisionFamilies++;
}

// 6. Build post-collapse scenario set
const postScenarios = [];
const keeperByFamilyKey = new Map();
for (const [fk, prop] of proposals) {
  const stripped = stripQualityTier(prop.keeper);
  postScenarios.push(stripped);
  keeperByFamilyKey.set(fk, stripped);
}
const postBundle = { scenarios: postScenarios, modules, modifiers, tasks };

// 7. AFTER snapshot
console.log('Taking AFTER snapshot (QT2..QT5 per family)...');
const afterSnap = snapshot(postBundle, families);
console.log('  done');
console.log();

// 8. GATE: compare QT3 (and QT2/QT4/QT5 for arrays)
console.log('Running parity gate...');
const qt3Mismatches = [];
const lossinessMismatches = [];

for (const [fk, fam] of families) {
  const before = beforeSnap.get(fk);
  const after = afterSnap.get(fk);
  const prop = proposals.get(fk);

  // QT3 is mandatory for all families
  const bQt3 = before.get('QT3');
  const aQt3 = after.get('QT3');
  const bQt3Str = JSON.stringify(bQt3);
  const aQt3Str = JSON.stringify(aQt3);
  if (bQt3Str !== aQt3Str) {
    qt3Mismatches.push({
      family: fk,
      before: bQt3,
      after: aQt3,
      keeper: prop.keeper.scenario_id,
      reason: prop.reason,
    });
  }

  // Bonus losslessness check for array-derived families (QT2/QT4/QT5)
  if (qtKind(prop.keeper) === 'array') {
    for (const tier of ['QT2', 'QT4', 'QT5']) {
      const bT = before.get(tier);
      const aT = after.get(tier);
      if (JSON.stringify(bT) !== JSON.stringify(aT)) {
        lossinessMismatches.push({ family: fk, tier, before: bT, after: aT });
      }
    }
  }
}

// 9. Report
console.log('=== REPORT ===');
console.log(`  Families:           ${familyCount}`);
console.log(`  Kept (QT3 scalar):  ${strippedQT3scalar}`);
console.log(`  Kept (array-QT3):   ${strippedArray}`);
console.log(`  Kept (baselines):   ${familyCount - strippedQT3scalar - strippedArray}`);
console.log(`  Archived:           ${archived}`);
console.log(`  Collisions:         ${collisionFamilies}`);
console.log(`  noQt3 families:     ${noQt3Families.length}`);
if (noQt3Families.length > 0) {
  console.log(`    IDs: ${noQt3Families.join(', ')}`);
}
console.log();
console.log(`  QT3 gate mismatches:       ${qt3Mismatches.length}`);
console.log(`  Lossiness mismatches (arr): ${lossinessMismatches.length}`);
console.log();

if (qt3Mismatches.length > 0) {
  console.error('=== GATE FAILURE: QT3 MISMATCHES ===');
  for (const m of qt3Mismatches) {
    console.error(`  Family: ${m.family}`);
    console.error(`    Keeper: ${m.keeper} (reason: ${m.reason})`);
    console.error(`    Before QT3: ${JSON.stringify(m.before)}`);
    console.error(`    After  QT3: ${JSON.stringify(m.after)}`);
  }
  console.error('\nAbort: gate failed. No writes performed.');
  process.exit(1);
}

if (lossinessMismatches.length > 0) {
  console.warn('=== WARNING: LOSSINESS MISMATCHES (non-blocking) ===');
  for (const m of lossinessMismatches) {
    console.warn(`  Family ${m.family} tier ${m.tier}: before=${JSON.stringify(m.before)} after=${JSON.stringify(m.after)}`);
  }
  console.warn();
}

console.log('Gate: PASSED (zero QT3 mismatches)');
console.log();

// Plan summary: files to rewrite and archive
console.log('=== PLAN ===');
const toRewrite = []; // { path, stripped }
const toArchive = []; // { path }

for (const [fk, prop] of proposals) {
  const keeperRec = scenarioRecords.find(r => r.json.scenario_id === prop.keeper.scenario_id);
  if (keeperRec && qtKind(prop.keeper) !== 'baseline') {
    toRewrite.push({ path: keeperRec.path, stripped: stripQualityTier(prop.keeper) });
  }
  for (const arc of prop.archive) {
    const arcRec = scenarioRecords.find(r => r.json.scenario_id === arc.scenario_id);
    if (arcRec) toArchive.push({ path: arcRec.path, id: arc.scenario_id });
  }
}

console.log(`Files to rewrite (quality_tier stripped): ${toRewrite.length}`);
if (toRewrite.length <= 20) {
  for (const r of toRewrite) console.log(`  REWRITE ${path.basename(r.path)}`);
} else {
  for (const r of toRewrite.slice(0, 5)) console.log(`  REWRITE ${path.basename(r.path)}`);
  console.log(`  ... and ${toRewrite.length - 5} more`);
}
console.log();
console.log(`Files to archive: ${toArchive.length}`);
if (toArchive.length <= 20) {
  for (const r of toArchive) console.log(`  ARCHIVE ${path.basename(r.path)}`);
} else {
  for (const r of toArchive.slice(0, 5)) console.log(`  ARCHIVE ${path.basename(r.path)}`);
  console.log(`  ... and ${toArchive.length - 5} more`);
}
console.log();

// 10. Apply (only with --apply and gate passed)
if (DRY_RUN) {
  console.log('Dry-run complete. Run with --apply to write changes.');
} else {
  console.log('Applying changes...');
  fs.mkdirSync(archiveDir, { recursive: true });

  let rewrote = 0;
  for (const r of toRewrite) {
    fs.writeFileSync(r.path, JSON.stringify(r.stripped, null, 2) + '\n', 'utf8');
    rewrote++;
  }
  console.log(`  Rewrote ${rewrote} files (quality_tier stripped)`);

  let moved = 0;
  for (const r of toArchive) {
    const dest = path.join(archiveDir, path.basename(r.path));
    fs.renameSync(r.path, dest);
    moved++;
  }
  console.log(`  Archived ${moved} files to ${archiveDir}`);
  console.log('Apply complete.');
}
