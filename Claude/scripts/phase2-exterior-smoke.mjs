#!/usr/bin/env node
// Phase 2 smoke test: verify exterior scenarios resolve cleanly and that
// dynamic modifiers (FAC_EXT_ACCESS, FAC_MSRY_SUBSTRATE_TYPE, etc.) are
// applied correctly.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

const bundle = loadScenarioBundle(repoRoot);
console.log(`Loaded bundle: ${Object.keys(bundle.modules).length} modules, ${bundle.scenarios.length} scenarios\n`);

function runCase(label, ctx, roomQty) {
  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx,
    roomQty,
    roomIndex: 0,
    roomLabel: 'Test Room',
  });

  const status = result.scenarioId ? 'PASS' : 'FAIL';
  console.log(`${status}  ${label}`);
  console.log(`       scenario: ${result.scenarioId || '(none matched)'}`);
  console.log(`       hours: ${result.totalHours}  tasks: ${result.tasks.length}`);
  if (result.tasks.length > 0) {
    const phases = Object.entries(result.phaseHours).map(([k, v]) => `${k}:${v}`).join(' ');
    console.log(`       phases: ${phases}`);
  }
  if (result.warnings.length) {
    for (const w of result.warnings) console.log(`       WARN: ${w}`);
  }
  console.log();
  return result;
}

// Helper: synthesize a roomQty Map with common PS keys at plausible quantities
function makeRoomQty(overrides = {}) {
  const defaults = {
    'PS_EXT_SURFACE_SF.SIDING_FIELD': 1000,
    'PS_EXT_SURFACE_SF.MASONRY_WALL': 1000,
    'PS_EXT_SURFACE_SF.STUCCO_FIELD': 1000,
    'PS_EXT_SURFACE_SF.SOFFIT_FIELD': 500,
    'PS_EXT_SURFACE_SF.FOUNDATION_WALL': 200,
    'PS_EXT_SURFACE_LF.METAL': 100,
    'PS_EXT_PROTECT_SF.LANDSCAPE': 300,
    'PS_EXT_PROTECT_SF.HARDSCAPE': 150,
    'PS_EXT_PROTECT_EA.FIXTURES': 4,
    'PS_EXT_PROTECT_EA.LIGHT_FIXTURE': 4,
    'PS_EXT_PROTECT_EA.WINDOWS': 6,
    'PS_EXT_PROTECT_EA.DOORS': 2,
    'PS_EXT_PROTECT_LF.TRIM': 200,
    'PS_EXT_SURFACE_SF.FENCE_FIELD': 800,
    'PS_EXT_SURFACE_EA.FENCE_GATE': 1,
    'PS_EXT_PROTECT_SF.DRIVEWAY': 400,
    'PS_EXT_OPENING_EA.DOOR_GARAGE': 1,
  };
  const roomQty = new Map();
  for (const [k, v] of Object.entries({ ...defaults, ...overrides })) {
    roomQty.set(k, { value: v });
  }
  return roomQty;
}

console.log('========== PHASE 2 EXTERIOR SMOKE ==========\n');

// Case 1: Engineered wood siding NC, spray from bare
const r1 = runCase(
  'Eng wood siding NC — spray from bare/factory-primed',
  {
    paintable_item: 'ext_eng_siding',
    substrate_state: 'SS_EXT_PRIMED_FACTORY',
    quality_tier: 'QT3',
    application_method: 'spray',
    access_type: 'ladder',
    siding_profile: 'lap',
    surface_texture: 'smooth',
  },
  makeRoomQty(),
);

// Case 2: Same scenario but with T1-11 profile — should be slower via FAC_ENSD_SIDING_PROFILE (1.80x)
const r2 = runCase(
  'Eng wood siding NC — spray, T1-11 profile (1.80x modifier)',
  {
    paintable_item: 'ext_eng_siding',
    substrate_state: 'SS_EXT_PRIMED_FACTORY',
    quality_tier: 'QT3',
    application_method: 'spray',
    access_type: 'ladder',
    siding_profile: 't1_11',
    surface_texture: 'smooth',
  },
  makeRoomQty(),
);

// Case 3: Masonry NC — brick, acrylic, spray_backroll
runCase(
  'Masonry NC — spray+backroll, brick, acrylic',
  {
    paintable_item: 'ext_masonry_wall',
    substrate_state: 'SS_EXT_BARE_MASONRY',
    quality_tier: 'QT3',
    application_method: 'spray_backroll',
    access_type: 'ground',
    substrate_type: 'brick',
    coating_system: 'acrylic',
  },
  makeRoomQty(),
);

// Case 4: Soffit NC — spray_backbrush, closed face
runCase(
  'Soffit NC — spray+backbrush, closed face',
  {
    paintable_item: 'ext_soffit',
    substrate_state: 'SS_EXT_PRIMED_FACTORY',
    quality_tier: 'QT3',
    application_method: 'spray_backbrush',
    access_type: 'ladder',
    substrate_material: 'wood',
    soffit_face_type: 'closed_face',
  },
  makeRoomQty(),
);

// Case 5: Same soffit with open_face — should be 2.0x slower
runCase(
  'Soffit NC — spray+backbrush, OPEN face (2.0x modifier)',
  {
    paintable_item: 'ext_soffit',
    substrate_state: 'SS_EXT_PRIMED_FACTORY',
    quality_tier: 'QT3',
    application_method: 'spray_backbrush',
    access_type: 'ladder',
    substrate_material: 'wood',
    soffit_face_type: 'open_face',
  },
  makeRoomQty(),
);

// Case 6: Foundation NC — spray, acrylic, poured concrete
runCase(
  'Foundation NC — spray, acrylic, poured',
  {
    paintable_item: 'ext_foundation',
    substrate_state: 'SS_EXT_BARE_MASONRY',
    quality_tier: 'QT3',
    application_method: 'spray',
    coating_type: 'acrylic',
    foundation_type: 'poured',
  },
  makeRoomQty(),
);

// Case 7: Stucco — traditional, spray_backroll, lace texture (1.5x)
runCase(
  'Stucco NC — spray+backroll, lace texture (1.50x)',
  {
    paintable_item: 'ext_stucco_wall',
    substrate_state: 'SS_EXT_BARE_MASONRY',
    quality_tier: 'QT3',
    application_method: 'spray_backroll',
    access_type: 'ladder',
    substrate_type: 'traditional_stucco',
    texture_profile: 'lace',
  },
  makeRoomQty(),
);

// Summary
console.log('========== MODIFIER STACK SANITY ==========');
if (r1.scenarioId && r2.scenarioId) {
  const delta = r2.totalHours / r1.totalHours;
  console.log(`\nEng wood siding lap vs t1_11 ratio: ${delta.toFixed(3)}  (expected ~1.80x slower on siding tasks)`);
  if (delta > 1.2 && delta < 2.0) {
    console.log('MODIFIER APPLIED: PASS');
  } else {
    console.log(`MODIFIER APPLIED: SUSPECT (delta outside expected range)`);
  }
}

console.log('\n========== DONE ==========');
