#!/usr/bin/env node
// One-shot generator for closet shelf NC scenarios.
// Idempotent: overwrites existing files with canonical content.
// Covers all 28 scenarios from the design matrix.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.resolve(__dirname, '..', 'scenarios');

const QTS = ['QT2', 'QT3', 'QT4', 'QT5'];

const FINISH_BY_QT = {
  QT2: 'SYS_FF_STANDARD_ACRYLIC',
  QT3: 'SYS_FF_STANDARD_ACRYLIC',
  QT4: 'SYS_FF_MODIFIED_URETHANE',
  QT5: 'SYS_FF_PREMIUM',
};

// [substrate_state_engine, substrate_short, method, method_label, method_short, primer_module_or_null, primer_system_or_null]
const COMBOS = [
  ['SS_BARE',             'BARE',     'brush_roll',    'Brush/Roll',         'BR',      'MOD_PRIME_CLOSET_SHELF_WOOD_BRUSH',    'SYS_PRIMER_WOOD_ACRYLIC'],
  ['SS_BARE',             'BARE',     'spray',         'Spray',              'SPRAY',   'MOD_PRIME_CLOSET_SHELF_WOOD_BRUSH',    'SYS_PRIMER_WOOD_ACRYLIC'],
  ['SS_BARE',             'BARE',     'spray_rolloff', 'Spray + Roll-off',   'ROLLOFF', 'MOD_PRIME_CLOSET_SHELF_WOOD_BRUSH',    'SYS_PRIMER_WOOD_ACRYLIC'],
  ['SS_PRIMED_FACTORY',   'PRIMED',   'brush_roll',    'Brush/Roll',         'BR',      null,                                    null],
  ['SS_PRIMED_FACTORY',   'PRIMED',   'spray',         'Spray',              'SPRAY',   null,                                    null],
  ['SS_FACTORY_FINISH',   'MELAMINE', 'brush_roll',    'Brush/Roll',         'BR',      'MOD_PRIME_CLOSET_SHELF_BONDING_BRUSH', 'SYS_PRIMER_BONDING'],
  ['SS_FACTORY_FINISH',   'MELAMINE', 'spray',         'Spray',              'SPRAY',   'MOD_PRIME_CLOSET_SHELF_BONDING_BRUSH', 'SYS_PRIMER_BONDING'],
];

const APPLY_MODULE_BY_METHOD = {
  brush_roll:    'MOD_APPLY_CLOSET_SHELF_FINISH_BRUSH_ROLL',
  spray:         'MOD_APPLY_CLOSET_SHELF_FINISH_SPRAY',
  spray_rolloff: 'MOD_APPLY_CLOSET_SHELF_FINISH_SPRAY_ROLLOFF',
};

const SUBSTRATE_LABEL_BY_SHORT = {
  BARE: 'Bare Wood',
  PRIMED: 'Primed',
  MELAMINE: 'Melamine',
};

const SPRAY_METHODS = new Set(['spray', 'spray_rolloff']);

function buildScenario(qt, [state, stateShort, method, methodLabel, methodShort, primerMod, primerSys]) {
  const scenario_id = `SCN_CLOSET_SHELF_NC_${qt}_${stateShort}_${methodShort}`;
  const name = `Closet Shelf Paint — ${qt} ${SUBSTRATE_LABEL_BY_SHORT[stateShort]}, ${methodLabel}`;

  const applyMod = APPLY_MODULE_BY_METHOD[method];
  const modules = [
    'MOD_SETUP_CLOSET_SHELF_PAINT',
    'MOD_PREP_CLOSET_SHELF_PAINT',
    ...(primerMod ? [primerMod] : []),
    applyMod,
    'MOD_INTERSTAGE_CLOSET_SHELF',
    applyMod,
    'MOD_CLEANUP_CLOSET_SHELF_PAINT',
  ];

  const material_systems = [
    ...(primerSys ? [primerSys] : []),
    FINISH_BY_QT[qt],
  ];

  const protection_zones = SPRAY_METHODS.has(method)
    ? [
        { zone_id: 'floor_perimeter', level: 'full' },
        { zone_id: 'wall_adjacent', level: 'full' },
        { zone_id: 'fixtures', level: 'full' },
      ]
    : [{ zone_id: 'floor_perimeter', level: 'edge_only' }];

  // Omit prime_coats when there's no primer path (matches door frame pattern).
  const coat_counts = primerMod
    ? { prime_coats: 1, finish_coats: 2, interstage_cycles: 1 }
    : { finish_coats: 2, interstage_cycles: 1 };

  return {
    scenario_id,
    name,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: 'closet',
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

let written = 0;
for (const qt of QTS) {
  for (const combo of COMBOS) {
    const s = buildScenario(qt, combo);
    const filepath = path.join(scenariosDir, `${s.scenario_id}.json`);
    fs.writeFileSync(filepath, JSON.stringify(s, null, 2) + '\n');
    written++;
  }
}

console.log(`Wrote ${written} scenario files to ${scenariosDir}`);
