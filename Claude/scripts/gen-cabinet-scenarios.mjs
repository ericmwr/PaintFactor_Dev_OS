#!/usr/bin/env node
// One-shot generator for cabinet NC paint + protection scenarios.
// Idempotent: overwrites existing files.
// Covers: 24 NC paint (4 states × 2 methods × 3 QT) + 3 protection levels.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.resolve(__dirname, '..', 'scenarios');

const QTS = ['QT3', 'QT4', 'QT5'];

const FINISH_BY_QT = {
  QT3: 'SYS_FF_STANDARD_ACRYLIC',
  QT4: 'SYS_FF_MODIFIED_URETHANE',
  QT5: 'SYS_FF_PREMIUM',
};

// [state_engine, state_short, primer_module_template, primer_system]
// primer_module_template: use {METHOD} placeholder for BRUSH/SPRAY substitution
const STATES = [
  ['SS_BARE',           'BARE',           'MOD_APPLY_CABINET_PRIME',                 'SYS_PRIMER_WOOD_ACRYLIC'],
  ['SS_PRIMED_FACTORY', 'PRIMED_FACTORY', null,                                       null],
  ['SS_FACTORY_FINISH', 'FACTORY_FINISH', 'MOD_PRIME_CABINET_BONDING_{METHOD}',      'SYS_PRIMER_BONDING'],
  ['SS_STAINED',        'STAINED',        'MOD_PRIME_CABINET_STAIN_BLOCKING_{METHOD}','SYS_PRIMER_MDF_SHELLAC'],
];

const METHODS = [
  ['spray', 'SPRAY'],
  ['brush', 'BRUSH'],
];

function buildPaintScenario(qt, [state, stateShort, primerModTemplate, primerSys], [method, methodShort]) {
  const scenario_id = `SCN_CABINET_NC_${qt}_${methodShort}_FROM_${stateShort}`;
  const name = `Cabinet Paint — ${qt} ${stateShort.replace(/_/g, ' ')}, ${methodShort}`;

  // Resolve primer module — substitute METHOD in template
  let primerMod = primerModTemplate;
  if (primerMod && primerMod.includes('{METHOD}')) {
    primerMod = primerMod.replace('{METHOD}', methodShort);
  }
  // BARE uses existing MOD_APPLY_CABINET_PRIME (not method-specific)

  const modules = [
    'MOD_SETUP_CABINET',
    'MOD_PREP_CABINET',
    ...(primerMod ? [primerMod] : []),
    'MOD_APPLY_CABINET_FINISH',
    'MOD_INTERSTAGE_CABINET',
    'MOD_APPLY_CABINET_FINISH',
    'MOD_CLEANUP_CABINET',
  ];

  const material_systems = [
    ...(primerSys ? [primerSys] : []),
    FINISH_BY_QT[qt],
  ];

  const coat_counts = primerMod
    ? { prime_coats: 1, finish_coats: 2, interstage_cycles: 1 }
    : { finish_coats: 2, interstage_cycles: 1 };

  const protection_zones = method === 'spray'
    ? [
        { zone_id: 'floor_full_kitchen', level: 'full' },
        { zone_id: 'floor_perimeter', level: 'full' },
        { zone_id: 'countertop_covers', level: 'full' },
        { zone_id: 'backsplash_mask', level: 'full' },
        { zone_id: 'wall_adjacent_cabinet', level: 'full' },
        { zone_id: 'fixture_covers', level: 'full' },
        { zone_id: 'appliance_covers', level: 'full' },
        { zone_id: 'cabinet_hardware', level: 'full' },
        { zone_id: 'plumbing_electrical', level: 'full' },
      ]
    : [
        { zone_id: 'floor_perimeter', level: 'edge_only' },
        { zone_id: 'wall_adjacent_cabinet', level: 'light' },
        { zone_id: 'cabinet_hardware', level: 'full' },
      ];

  return {
    scenario_id,
    name,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: 'cabinet',
      substrate_state: [state],
      quality_tier: qt,
      application_method: method,
      coating_type: 'paint',
    },
    modules,
    coat_counts,
    protection_zones,
    material_systems,
    output_state: 'SS_PAINTED_SEMIGLOSS',
  };
}

function buildProtectScenario(level, moduleName) {
  return {
    scenario_id: `SCN_CABINET_PROTECT_${level.toUpperCase()}`,
    name: `Cabinet Protect — ${level.charAt(0).toUpperCase() + level.slice(1)}`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: 'cabinet',
      coating_type: 'protect',
      protection_level: level,
    },
    modules: [moduleName],
    coat_counts: {},
    protection_zones: [],
    material_systems: [],
    output_state: null,
  };
}

let written = 0;

// Generate 24 paint scenarios
for (const qt of QTS) {
  for (const stateDef of STATES) {
    for (const methodDef of METHODS) {
      const s = buildPaintScenario(qt, stateDef, methodDef);
      const filepath = path.join(scenariosDir, `${s.scenario_id}.json`);
      fs.writeFileSync(filepath, JSON.stringify(s, null, 2) + '\n');
      written++;
    }
  }
}

// Generate 3 protection scenarios
const PROTECT_LEVELS = [
  ['light', 'MOD_PROTECT_CABINET_LIGHT'],
  ['standard', 'MOD_PROTECT_CABINET_STANDARD'],
  ['heavy', 'MOD_PROTECT_CABINET_HEAVY'],
];

for (const [level, mod] of PROTECT_LEVELS) {
  const s = buildProtectScenario(level, mod);
  const filepath = path.join(scenariosDir, `${s.scenario_id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(s, null, 2) + '\n');
  written++;
}

console.log(`Wrote ${written} scenario files to ${scenariosDir}`);
