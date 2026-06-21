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
// Context universe + sweep helpers
// ---------------------------------------------------------------------------

const TIERS = ['QT2', 'QT3', 'QT4', 'QT5'];

/**
 * Expand a single scenario's `matches` into EVERY concrete context it defines.
 * Each array-valued match field is expanded to one ctx per element (cartesian
 * product across all such fields); scalar fields are passed through. We omit
 * quality_tier here — the caller pins the tier (QT3 for the gate).
 *
 * Example: { paintable_item:'drywall', surface:'wall',
 *            substrate_state:['SS_PRIMED','SS_PRIMED_FIELD'], application_method:'roll' }
 *   → [ {paintable_item,surface,substrate_state:'SS_PRIMED',application_method},
 *       {paintable_item,surface,substrate_state:'SS_PRIMED_FIELD',application_method} ]
 */
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

/**
 * Build the full QT3 context universe: the cartesian expansion of every source
 * scenario's matches, with quality_tier pinned to QT3, deduped by JSON. This is
 * every concrete QT3 estimate context the data can actually produce — the gate
 * verifies the collapse preserves the served result for each one.
 *
 * Returns Array<ctx> (each ctx is a plain object including quality_tier:'QT3').
 */
function buildQt3ContextUniverse(scenarios) {
  const seen = new Map(); // jsonKey -> ctx
  for (const scn of scenarios) {
    for (const partial of expandScenarioContexts(scn)) {
      const ctx = { ...partial, quality_tier: 'QT3' };
      // Stable JSON: sort keys so dedupe is order-independent.
      const jsonKey = JSON.stringify(
        Object.keys(ctx).sort().reduce((o, k) => ((o[k] = ctx[k]), o), {})
      );
      if (!seen.has(jsonKey)) seen.set(jsonKey, ctx);
    }
  }
  return [...seen.values()];
}

/**
 * Resolve a ctx against a bundle and reduce to the comparable fingerprint
 * { scenario_id, modulesSig } (or null when nothing matches).
 */
function resolveFingerprint(bundle, ctx) {
  const scn = findBestMatch(bundle, ctx).scenario;
  if (!scn) return null;
  return {
    scenario_id: scn.scenario_id,
    modulesSig: JSON.stringify(scn.modules || []),
  };
}

/**
 * Serialize `obj` as pretty JSON while preserving the ORIGINAL file's
 * line-ending style and trailing-newline presence. Existing scenario files are
 * CRLF with a trailing newline; a blanket LF write would churn every line in
 * the diff (and, per project memory, CRLF noise on this repo silently corrupts
 * stashed edits). We read the original bytes, detect CRLF vs LF and whether the
 * file ends in a newline, and emit output that matches.
 */
function serializePreservingEol(originalPath, obj) {
  let original = '';
  try {
    original = fs.readFileSync(originalPath, 'utf8');
  } catch {
    // No original (shouldn't happen for a rewrite) → default to LF + trailing nl.
  }
  const usesCrlf = original.includes('\r\n');
  // Trailing newline: present if original ends with \n (default true when no original).
  const trailingNewline = original.length === 0 ? true : /\r?\n$/.test(original);

  let out = JSON.stringify(obj, null, 2); // JSON.stringify always emits \n
  if (trailingNewline) out += '\n';
  if (usesCrlf) out = out.replace(/\n/g, '\r\n');
  return out;
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

// 4. Build the exhaustive QT3 context universe + BEFORE fingerprints.
//    The gate sweeps EVERY concrete QT3 context the data defines (cartesian
//    expansion of each scenario's matches), not one representative per family.
console.log('Building QT3 context universe (cartesian over all scenario matches)...');
const qt3Universe = buildQt3ContextUniverse(allScenarios);
console.log(`  ${qt3Universe.length} distinct QT3 contexts`);
console.log('Capturing BEFORE fingerprints for each QT3 context...');
const beforeByCtx = qt3Universe.map(ctx => resolveFingerprint(sourceBundle, ctx));
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

// 7. AFTER fingerprints — resolve the SAME context universe against the
//    post-collapse bundle.
console.log('Capturing AFTER fingerprints for each QT3 context...');
const afterByCtx = qt3Universe.map(ctx => resolveFingerprint(postBundle, ctx));
console.log('  done');
console.log();

// 8. GATE: exhaustive QT3 sweep. For every concrete QT3 context:
//   - before=null → after=served  : ALLOWED gap-fill (no real QT3 estimate to
//     preserve; the promoted baseline now answers it). Collected + reported.
//   - before=null → after=null     : no-op (still unserved).
//   - before=served → after equal  : preserved (good).
//   - before=served → after differs (changed scenario_id/modulesSig OR null):
//     HARD FAIL. A live QT3 estimate would change/disappear. Abort, no writes.
console.log('Running exhaustive QT3 parity gate...');
const qt3Mismatches = [];   // before served, after differs → blocking
const qt3GapFills = [];      // before null, after served → allowed
const sameFp = (a, b) => JSON.stringify(a) === JSON.stringify(b);

for (let i = 0; i < qt3Universe.length; i++) {
  const ctx = qt3Universe[i];
  const before = beforeByCtx[i];
  const after = afterByCtx[i];

  if (before === null) {
    if (after !== null) {
      qt3GapFills.push({ ctx, after });
    }
    continue; // null→null is a no-op
  }
  // before is served — it must be preserved EXACTLY.
  if (!sameFp(before, after)) {
    qt3Mismatches.push({ ctx, before, after });
  }
}

// INFORMATIONAL (non-blocking): how many QT2/QT4/QT5 contexts shift after the
// collapse. These tiers intentionally fold into the QT3 baseline, so drift here
// is expected; we only count it for visibility. The gate enforces QT3 only.
let nonQt3Shifts = 0;
for (const tier of ['QT2', 'QT4', 'QT5']) {
  for (const baseCtx of qt3Universe) {
    const ctx = { ...baseCtx, quality_tier: tier };
    const b = resolveFingerprint(sourceBundle, ctx);
    const a = resolveFingerprint(postBundle, ctx);
    if (!sameFp(b, a)) nonQt3Shifts++;
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
console.log(`  QT3 contexts swept:           ${qt3Universe.length}`);
console.log(`  QT3 served-context changes:   ${qt3Mismatches.length}  (BLOCKING)`);
console.log(`  QT3 gap-fills (was unserved): ${qt3GapFills.length}  (allowed)`);
console.log(`  QT2/QT4/QT5 shifts:           ${nonQt3Shifts}  (informational, non-blocking)`);
console.log();

if (qt3Mismatches.length > 0) {
  console.error('=== GATE FAILURE: SERVED QT3 CONTEXTS CHANGED ===');
  for (const m of qt3Mismatches) {
    console.error(`  ctx:    ${JSON.stringify(m.ctx)}`);
    console.error(`    before: ${JSON.stringify(m.before)}`);
    console.error(`    after:  ${JSON.stringify(m.after)}`);
  }
  console.error(`\nAbort: ${qt3Mismatches.length} served QT3 context(s) would change. No writes performed.`);
  process.exit(1);
}

if (qt3GapFills.length > 0) {
  console.log('=== QT3 GAP-FILLS (was unserved → now served; allowed) ===');
  for (const g of qt3GapFills) {
    console.log(`  ctx: ${JSON.stringify(g.ctx)}`);
    console.log(`    now served by: ${g.after.scenario_id}`);
  }
  console.log();
}

console.log(`Gate: PASSED (0 served-QT3 changes; ${qt3GapFills.length} gap-fill${qt3GapFills.length === 1 ? '' : 's'} allowed)`);
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
    // Preserve the original file's EOL style + trailing-newline (CRLF on this repo).
    fs.writeFileSync(r.path, serializePreservingEol(r.path, r.stripped), 'utf8');
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
