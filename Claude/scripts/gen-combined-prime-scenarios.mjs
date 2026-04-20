#!/usr/bin/env node
// Generate combined wall+ceiling prime scenarios (one per QT, spray_backroll only).
// Combined scenarios match ctx.prime_mode === 'combined' and are picked in
// preference to the standalone scenarios in pre-trim NC workflows.
//
// Combined mode savings (vs standalone):
//  - Ceiling scenario: drops MOD_SETUP_CEIL_MASK_ADJACENT (no walls to mask)
//  - Ceiling scenario: uses MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED
//    which drops the post-spray wall-line cut-in task
//  - Wall scenario: no tasks change (spray_backroll already has no cut-in)
//    but match criterion ensures scenario fires in combined mode
//
// Idempotent — re-running overwrites the generated files.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCN_DIR = join(__dirname, '..', 'scenarios');

const QT_LEVELS = ['QT2', 'QT3', 'QT4', 'QT5'];

function wallScenario(qt) {
  return {
    scenario_id: `SCN_DRYWALL_PRIME_${qt}_SPRAY_BACKROLL_COMBINED`,
    name: `Drywall Wall Prime - ${qt}, Spray + Backroll (Combined Pass)`,
    domain: 'interior',
    context: 'NC',
    matches: {
      surface: 'wall',
      substrate_state: ['SS_BARE'],
      quality_tier: qt,
      application_method: 'spray_backroll',
      paintable_item: 'drywall',
      prime_mode: ['combined'],
    },
    modules: [
      'MOD_PREP_WALL_PRIME',
      'MOD_SETUP_FLOOR_PROTECT_FULL',
      'MOD_SETUP_FIXTURE_COVERS',
      'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL_COMBINED',
      'MOD_CLEANUP_WALL_PRIME',
    ],
    coat_counts: { finish_coats: 1, interstage_cycles: 0 },
    protection_zones: [
      { zone_id: 'floor_full', level: 'full_cover' },
      { zone_id: 'fixture_covers', level: 'full_cover' },
    ],
    material_systems: ['SYS_PRIMER_PVA_STUB'],
    output_state: 'SS_PRIMED_FIELD',
  };
}

function ceilingScenario(qt) {
  return {
    scenario_id: `SCN_CEILING_PRIME_${qt}_SPRAY_BACKROLL_COMBINED`,
    name: `Drywall Ceiling Prime - ${qt}, Spray + Backroll (Combined Pass)`,
    domain: 'interior',
    context: 'NC',
    matches: {
      surface: 'ceiling',
      substrate_state: ['SS_BARE'],
      quality_tier: qt,
      application_method: 'spray_backroll',
      paintable_item: 'drywall',
      prime_mode: ['combined'],
    },
    // NOTE: drops MOD_SETUP_CEIL_MASK_ADJACENT, swaps combined apply module
    modules: [
      'MOD_PREP_CEILING_PRIME',
      'MOD_SETUP_FLOOR_PROTECT_CEILING',
      'MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL_COMBINED',
      'MOD_CLEANUP_CEILING_PRIME',
    ],
    coat_counts: { finish_coats: 1, interstage_cycles: 0 },
    protection_zones: [
      { zone_id: 'floor_full', level: 'full_cover' },
    ],
    material_systems: ['SYS_PRIMER_PVA_STUB'],
    output_state: 'SS_PRIMED_FIELD',
  };
}

let wrote = 0;
for (const qt of QT_LEVELS) {
  const w = wallScenario(qt);
  writeFileSync(join(SCN_DIR, `${w.scenario_id}.json`), JSON.stringify(w, null, 2) + '\n', 'utf-8');
  console.log(`  ${w.scenario_id}`);
  wrote++;

  const c = ceilingScenario(qt);
  writeFileSync(join(SCN_DIR, `${c.scenario_id}.json`), JSON.stringify(c, null, 2) + '\n', 'utf-8');
  console.log(`  ${c.scenario_id}`);
  wrote++;
}

console.log(`\nWrote ${wrote} combined-prime scenarios.`);
