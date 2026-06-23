#!/usr/bin/env node
/**
 * decompose-stain-family.mjs
 *
 * Data-driven generator: reads a bundled SCN_INT_<KEY>_STAIN_CLEAR.json and emits
 * the 5 decomposed scenario JSON files mirroring the door_casing pilot shape.
 *
 * Usage (run from repo root or Claude/ directory):
 *   node Claude/scripts/decompose-stain-family.mjs baseboard
 *   node Claude/scripts/decompose-stain-family.mjs baseboard crown chair_rail window_casing
 *
 * Output files written to Claude/scenarios/:
 *   SCN_INT_<KEY>_STAIN.json
 *   SCN_INT_<KEY>_SEALER.json
 *   SCN_INT_<KEY>_CLEAR.json
 *   SCN_INT_<KEY>_CLEAR_BARE.json
 *   SCN_INT_<KEY>_SEALER_BARE.json
 *
 * Idempotent: re-running overwrites existing output files with the same content.
 *
 * Skips (reports but does not emit) any family whose bundled scenario lacks a
 * sealer_coats entry in dynamic_coats — those require manual handling.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: this script lives at Claude/scripts/, repo root is two levels up
const repoRoot = path.resolve(__dirname, '..', '..');
const scenariosDir = path.join(repoRoot, 'Claude', 'scenarios');

// ─── Material system constants (real catalog-mapped systems) ─────────────────
const SYS_STAIN  = 'SYS_STAIN_OIL';
const SYS_SEALER = 'SYS_SEALER_OIL';
const SYS_CLEAR  = 'SYS_CLEAR_POLY_WB';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert a family key (e.g. "baseboard" or "window_casing") to the
 * SCREAMING_SNAKE prefix used in module/scenario IDs.
 *   "baseboard"     → "BASEBOARD"
 *   "window_casing" → "WINDOW_CASING"
 *   "chair_rail"    → "CHAIR_RAIL"
 */
function toPrefix(key) {
  return key.toUpperCase();
}

/**
 * Find the module id from a modules[] array that matches a predicate string.
 * Predicate is tested against the module id using String.includes().
 */
function findModule(modules, needle) {
  return modules.find(m => m.includes(needle)) ?? null;
}

/**
 * Find the PREP module: contains "PREP" and the family prefix, but not "FLOOR_PROTECT".
 * Requires exactly one match; throws if ambiguous, returns null if zero matches.
 * @param {string[]} modules - module id array from the bundled scenario
 * @param {string} prefix    - family prefix in SCREAMING_SNAKE (e.g. "SHOE_MOLD")
 */
function findPrepModule(modules, prefix) {
  const matches = modules.filter(m =>
    m.includes('PREP') &&
    !m.includes('FLOOR_PROTECT') &&
    m.includes(prefix)
  );
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `findPrepModule: ambiguous — ${matches.length} PREP modules match for family prefix "${prefix}": ${matches.join(', ')}`
    );
  }
  return matches[0];
}

/**
 * Find the CLEANUP module: contains "CLEANUP" and the family prefix.
 * Requires exactly one match; throws if ambiguous, returns null if zero matches.
 * @param {string[]} modules - module id array from the bundled scenario
 * @param {string} prefix    - family prefix in SCREAMING_SNAKE (e.g. "SHOE_MOLD")
 */
function findCleanupModule(modules, prefix) {
  const matches = modules.filter(m =>
    m.includes('CLEANUP') &&
    m.includes(prefix)
  );
  if (matches.length === 0) return null;
  if (matches.length > 1) {
    throw new Error(
      `findCleanupModule: ambiguous — ${matches.length} CLEANUP modules match for family prefix "${prefix}": ${matches.join(', ')}`
    );
  }
  return matches[0];
}

/**
 * Find an APPLY module by matching an apply field name from dynamic_coats.
 * The bundled scenario's dynamic_coats keys ARE the apply module ids.
 */
function findApplyModuleByField(dynamicCoats, fieldName) {
  for (const [modId, entry] of Object.entries(dynamicCoats)) {
    if (entry.field === fieldName) return modId;
  }
  return null;
}

// ─── Core emitter ────────────────────────────────────────────────────────────

/**
 * Process a single family key.
 * Returns { key, status: 'ok'|'skip', reason?, files? }
 */
function processFamily(key) {
  const upperKey = toPrefix(key);
  const bundledPath = path.join(scenariosDir, `SCN_INT_${upperKey}_STAIN_CLEAR.json`);

  // Read bundled file
  if (!fs.existsSync(bundledPath)) {
    return { key, status: 'skip', reason: `Bundled file not found: ${bundledPath}` };
  }

  let bundled;
  try {
    bundled = JSON.parse(fs.readFileSync(bundledPath, 'utf8'));
  } catch (err) {
    return { key, status: 'skip', reason: `Failed to parse bundled file: ${err.message}` };
  }

  // Extract fields from bundled scenario
  const paintableItem = bundled.matches?.paintable_item;
  if (!paintableItem) {
    return { key, status: 'skip', reason: 'Bundled scenario missing matches.paintable_item' };
  }

  const dynamicCoats = bundled.dynamic_coats || {};
  const modules = bundled.modules || [];

  // Validate sealer is present (required for clean decomposition)
  const applyStainMod   = findApplyModuleByField(dynamicCoats, 'stain_coats');
  const applySealerMod  = findApplyModuleByField(dynamicCoats, 'sealer_coats');
  const applyClearMod   = findApplyModuleByField(dynamicCoats, 'clear_coats');

  if (!applySealerMod) {
    return {
      key,
      status: 'skip',
      reason: `No sealer_coats entry in dynamic_coats — family requires manual handling (not a clean LF-trim family).`,
    };
  }
  if (!applyStainMod) {
    return { key, status: 'skip', reason: 'No stain_coats entry in dynamic_coats' };
  }
  if (!applyClearMod) {
    return { key, status: 'skip', reason: 'No clear_coats entry in dynamic_coats' };
  }

  // Identify interstage from any dynamic_coats entry (all share the same interstage)
  const interstage = dynamicCoats[applyStainMod]?.interstage
    || dynamicCoats[applySealerMod]?.interstage
    || dynamicCoats[applyClearMod]?.interstage;

  if (!interstage) {
    return { key, status: 'skip', reason: 'No interstage found in dynamic_coats entries' };
  }

  const prepMod    = findPrepModule(modules, upperKey);
  const cleanupMod = findCleanupModule(modules, upperKey);
  const floorCheck = 'MOD_INTERSTAGE_FLOOR_PROTECT_CHECK';

  if (!prepMod) {
    return { key, status: 'skip', reason: 'No PREP module found in bundled scenario modules[]' };
  }
  if (!cleanupMod) {
    return { key, status: 'skip', reason: 'No CLEANUP module found in bundled scenario modules[]' };
  }

  // ── Emit 5 decomposed scenario files ────────────────────────────────────────

  const prefix = `SCN_INT_${upperKey}`;
  const namePretty = key.replace(/_/g, ' ');

  /** SCN_INT_<KEY>_STAIN — SS_BARE → SS_STAINED */
  const stainScenario = {
    scenario_id: `${prefix}_STAIN`,
    name: `Int ${key} NC - Stain phase`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: paintableItem,
      substrate_state: ['SS_BARE'],
      coating_phase: 'stain',
    },
    modules: [prepMod, applyStainMod, floorCheck],
    dynamic_coats: {
      [applyStainMod]: { field: 'stain_coats', interstage },
    },
    coat_counts: { stain_coats: 1 },
    material_systems: [SYS_STAIN],
    modifiers: [],
    output_state: 'SS_STAINED',
  };

  /** SCN_INT_<KEY>_SEALER — SS_STAINED → SS_SEALED */
  const sealerScenario = {
    scenario_id: `${prefix}_SEALER`,
    name: `Int ${key} NC - Sealer phase`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: paintableItem,
      substrate_state: ['SS_STAINED'],
      coating_phase: 'sealer',
    },
    modules: [applySealerMod],
    dynamic_coats: {
      [applySealerMod]: { field: 'sealer_coats', interstage },
    },
    coat_counts: { sealer_coats: 1 },
    material_systems: [SYS_SEALER],
    modifiers: [],
    output_state: 'SS_SEALED',
  };

  /** SCN_INT_<KEY>_CLEAR — SS_STAINED or SS_SEALED → SS_STAINED_CLEAR */
  const clearScenario = {
    scenario_id: `${prefix}_CLEAR`,
    name: `Int ${key} NC - Clear phase`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: paintableItem,
      substrate_state: ['SS_STAINED', 'SS_SEALED'],
      coating_phase: 'clear',
    },
    modules: [applyClearMod, cleanupMod],
    dynamic_coats: {
      [applyClearMod]: { field: 'clear_coats', interstage },
    },
    coat_counts: { clear_coats: 1 },
    material_systems: [SYS_CLEAR],
    modifiers: [],
    output_state: 'SS_STAINED_CLEAR',
  };

  /** SCN_INT_<KEY>_CLEAR_BARE — SS_BARE + coating_phase:clear (natural finish, no stain) */
  const clearBareScenario = {
    scenario_id: `${prefix}_CLEAR_BARE`,
    name: `Int ${key} NC - Clear phase (bare wood, no stain)`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: paintableItem,
      substrate_state: ['SS_BARE'],
      coating_phase: 'clear',
    },
    modules: [prepMod, applyClearMod, floorCheck, cleanupMod],
    dynamic_coats: {
      [applyClearMod]: { field: 'clear_coats', interstage },
    },
    coat_counts: { clear_coats: 1 },
    material_systems: [SYS_CLEAR],
    modifiers: [],
    output_state: 'SS_STAINED_CLEAR',
  };

  /** SCN_INT_<KEY>_SEALER_BARE — SS_BARE + coating_phase:sealer (no-stain sealer application) */
  const sealerBareScenario = {
    scenario_id: `${prefix}_SEALER_BARE`,
    name: `Int ${key} NC - Sealer phase (bare wood, no stain)`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: paintableItem,
      substrate_state: ['SS_BARE'],
      coating_phase: 'sealer',
    },
    modules: [prepMod, applySealerMod, floorCheck],
    dynamic_coats: {
      [applySealerMod]: { field: 'sealer_coats', interstage },
    },
    coat_counts: { sealer_coats: 1 },
    material_systems: [SYS_SEALER],
    modifiers: [],
    output_state: 'SS_SEALED',
  };

  // Write all 5 files
  const emitted = [];
  for (const [suffix, obj] of [
    ['STAIN',       stainScenario],
    ['SEALER',      sealerScenario],
    ['CLEAR',       clearScenario],
    ['CLEAR_BARE',  clearBareScenario],
    ['SEALER_BARE', sealerBareScenario],
  ]) {
    const outPath = path.join(scenariosDir, `${prefix}_${suffix}.json`);
    fs.writeFileSync(outPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
    emitted.push(outPath);
  }

  return {
    key,
    status: 'ok',
    paintableItem,
    prepMod,
    applyStainMod,
    applySealerMod,
    applyClearMod,
    cleanupMod,
    interstage,
    files: emitted,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: node Claude/scripts/decompose-stain-family.mjs <key> [<key> ...]');
    console.error('  Example: node Claude/scripts/decompose-stain-family.mjs baseboard crown chair_rail window_casing');
    process.exit(1);
  }

  let anyError = false;
  for (const key of args) {
    console.log(`\n── Processing family: ${key}`);
    const result = processFamily(key);
    if (result.status === 'skip') {
      console.warn(`  SKIPPED: ${result.reason}`);
      anyError = true;
    } else {
      console.log(`  paintable_item: ${result.paintableItem}`);
      console.log(`  PREP:    ${result.prepMod}`);
      console.log(`  STAIN:   ${result.applyStainMod}`);
      console.log(`  SEALER:  ${result.applySealerMod}`);
      console.log(`  CLEAR:   ${result.applyClearMod}`);
      console.log(`  CLEANUP: ${result.cleanupMod}`);
      console.log(`  interstage: ${result.interstage}`);
      console.log(`  Emitted ${result.files.length} files:`);
      for (const f of result.files) {
        console.log(`    ${path.relative(process.cwd(), f)}`);
      }
    }
  }

  if (anyError) {
    process.exit(1);
  }
}

main();
