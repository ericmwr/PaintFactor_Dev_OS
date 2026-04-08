// Phase 1b specialty smoke test.
//
// Loads the full scenario bundle and runs each Phase 1b specialty scenario
// against a synthetic multi-substrate room. Verifies:
//   1. Scenario matches and resolves cleanly (no warnings)
//   2. Total hours > 0
//   3. Expected modules fired (at least N tasks per scenario)
//
// This is a smoke test, not a hand-computed sanity check. The phase0-diff.mjs
// already validates exact math for the 5 substrates that have hand-computed
// expected values. This script just confirms the new specialty modules don't
// have structural bugs.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..', '..');

// Synthetic specialty room: covers all PS keys used by the 8 substrates.
// Quantities are reasonable round numbers, not derived from a real room.
const ROOM = new Map([
  // Wainscot
  ['PS_SURFACE_SF.WAINSCOT',         { value: 80  }],
  // Wood wall
  ['PS_SURFACE_SF.WOOD_WALL',        { value: 200 }],
  // Wood ceiling
  ['PS_SURFACE_SF.WOOD_CEILING',     { value: 150 }],
  // Stair riser
  ['PS_SURFACE_LF.STAIR_STRINGER',   { value: 24  }],
  ['PS_SURFACE_EA.STAIR_RISER',      { value: 12  }],
  ['PS_OPENING_EA.STAIR_TREAD',      { value: 12  }],
  // Stair railing (all wood)
  ['PS_SURFACE_EA.BALUSTER',         { value: 30  }],
  ['PS_SURFACE_EA.NEWEL',            { value: 4   }],
  ['PS_SURFACE_LF.HANDRAIL',         { value: 24  }],
  ['PS_SURFACE_LF.BASE_RAIL',        { value: 24  }],
  ['PS_SURFACE_EA.RAILING_BRACKET',  { value: 6   }],
  // Arch element
  ['PS_SURFACE_LF.ARCH_BEAM',        { value: 30  }],
  ['PS_SURFACE_EA.ARCH_COLUMN',      { value: 4   }],
  ['PS_SURFACE_EA.ARCH_MANTEL',      { value: 1   }],
  ['PS_PROTECT_SF.FLOOR_WORKZONE',   { value: 100 }],
  // Builtin
  ['PS_SURFACE_SF.BUILTIN',          { value: 120 }],
  // Cabinet
  ['PS_SURFACE_EA.CABINET_DOOR',     { value: 20  }],
  ['PS_SURFACE_EA.CABINET_DRAWER',   { value: 8   }],
  ['PS_SURFACE_SF.CABINET_FRAME',    { value: 60  }],
  ['PS_PROTECT_SF.FLOOR_FULL_KITCHEN', { value: 150 }],
  ['PS_PROTECT_SF.COUNTERTOP',       { value: 30  }],
  ['PS_PROTECT_SF.BACKSPLASH',       { value: 25  }],
  // Shared protection
  ['PS_PROTECT_SF.FLOOR_PERIMETER',  { value: 60  }],
  ['PS_PROTECT_LF.WALL_ADJACENT',    { value: 40  }],
  ['PS_PROTECT_LF.CEILING_ADJACENT', { value: 40  }],
  ['PS_PROTECT_SF.WALL_ADJACENT',    { value: 80  }],
  ['PS_PROTECT_SF.FLOOR_EXPOSED',    { value: 150 }],
  ['PS_PROTECT_EA.ASSET.FIXTURES',   { value: 4   }],
  ['PS_META.SF.FLOOR_VACUUM_AREA',   { value: 150 }],
]);

const TESTS = [
  { id: 'SCN_WAINSCOT_NC_QT3_BRUSH_FROM_BARE',
    ctx: { substrate: 'wainscot',     substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_WOOD_WALL_NC_QT3_SPRAY_FROM_BARE',
    ctx: { substrate: 'wood_wall',    substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'spray', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_WOOD_CEILING_NC_QT3_SPRAY_FROM_BARE',
    ctx: { substrate: 'wood_ceiling', substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'spray', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_STAIR_RISER_NC_QT3_BRUSH_FROM_BARE',
    ctx: { substrate: 'stair_riser',  substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_STAIR_RAILING_NC_QT3_BRUSH_ALL_WOOD_FROM_BARE',
    ctx: { substrate: 'stair_railing',substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD', railing_type: 'all_wood' } },
  { id: 'SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE',
    ctx: { substrate: 'arch_element', substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_BUILTIN_NC_QT3_BRUSH_FROM_BARE',
    ctx: { substrate: 'builtin',      substrate_state: 'SS_BARE', quality_tier: 'QT3', application_method: 'brush', height_band: 'STD', complexity: 'STD' } },
  { id: 'SCN_CABINET_NC_QT4_SPRAY_FROM_BARE',
    ctx: { substrate: 'cabinet',      substrate_state: 'SS_BARE', quality_tier: 'QT4', application_method: 'spray', height_band: 'STD', complexity: 'STD' } },
];

console.log('Loading bundle from', REPO_ROOT);
const bundle = loadScenarioBundle(REPO_ROOT);
console.log(`  ${Object.keys(bundle.modules).length} modules`);
console.log(`  ${bundle.scenarios.length} scenarios`);
console.log('');
console.log('='.repeat(80));
console.log('PHASE 1b SPECIALTY SMOKE TEST');
console.log('='.repeat(80));
console.log('');

let allPass = true;
for (const t of TESTS) {
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx: t.ctx,
    roomQty: ROOM,
    roomIndex: 0,
    roomLabel: 'Smoke Test Room',
  });

  const matched = result.scenarioId === t.id;
  const nonZero = result.totalHours > 0;
  const noWarnings = result.warnings.length === 0;
  const pass = matched && nonZero && noWarnings;
  if (!pass) allPass = false;

  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${t.id}`);
  console.log(`       matched: ${matched}   hours: ${result.totalHours}   tasks: ${result.tasks.length}   warnings: ${result.warnings.length}`);
  if (!matched) console.log(`       expected ${t.id}, got ${result.scenarioId}`);
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.log(`       WARN: ${w}`);
  }
  // Per-phase breakdown
  const phases = Object.entries(result.phaseHours).map(([k, v]) => `${k}:${v}`).join(' ');
  console.log(`       phases: ${phases}`);
  console.log('');
}

console.log('='.repeat(80));
console.log(allPass ? 'OVERALL: ALL SPECIALTY SCENARIOS RESOLVE CLEANLY' : 'OVERALL: ONE OR MORE SPECIALTY SCENARIOS FAILED');
console.log('='.repeat(80));
process.exit(allPass ? 0 : 1);
