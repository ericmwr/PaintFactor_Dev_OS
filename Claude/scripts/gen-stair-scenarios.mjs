#!/usr/bin/env node
// One-shot generator for per-component stair scenarios.
// Writes 156 scenarios: 84 paint + 72 stain.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenariosDir = path.resolve(__dirname, '..', 'scenarios');

const QTS = ['QT3', 'QT4', 'QT5'];
const PAINT_COMPONENTS = ['stringer', 'riser', 'skirtboard', 'baluster', 'newel', 'open_rail', 'wall_rail'];
const STAIN_COMPONENTS = ['tread', 'riser', 'baluster', 'newel', 'open_rail', 'wall_rail'];
const PAINT_METHODS = [['spray', 'SPRAY'], ['brush', 'BRUSH']];
const STAIN_METHODS = [['brush', 'BRUSH'], ['wipe', 'WIPE']];
const PAINT_STATES = [['SS_BARE', 'BARE'], ['SS_PRIMED_FACTORY', 'PRIMED_FACTORY']];
const STAIN_STATES = [['SS_BARE', 'BARE'], ['SS_STAINED', 'STAINED']];

// Which spec each component belongs to (for shared module selection)
const PAINT_SPEC_FOR_COMPONENT = {
  stringer: 'SF_STAIR_RISER_NC',
  riser: 'SF_STAIR_RISER_NC',
  skirtboard: 'SF_STAIR_RISER_NC',
  baluster: 'SF_STAIR_RAILING_NC',
  newel: 'SF_STAIR_RAILING_NC',
  open_rail: 'SF_STAIR_RAILING_NC',
  wall_rail: 'SF_STAIR_RAILING_NC',
};

// Shared module sets per spec group
const RISER_PAINT_SHARED = ['MOD_SETUP_STAIR_RISER', 'MOD_PREP_STAIR_RISER', 'MOD_CLEANUP_STAIR_RISER'];
const RAILING_PAINT_SHARED = ['MOD_SETUP_STAIR_RAILING', 'MOD_PREP_STAIR_RAILING', 'MOD_CLEANUP_STAIR_RAILING'];
const STAIN_SHARED = ['MOD_SETUP_STAIR_STAIN', 'MOD_PREP_STAIR_STAIN', 'MOD_CLEANUP_STAIR_STAIN'];

function buildPaintScenario(comp, qt, [method, methodShort], [state, stateShort]) {
  const COMP = comp.toUpperCase();
  const specId = PAINT_SPEC_FOR_COMPONENT[comp];
  const shared = specId === 'SF_STAIR_RISER_NC' ? RISER_PAINT_SHARED : RAILING_PAINT_SHARED;
  const includePrime = state === 'SS_BARE';
  const modules = [
    shared[0],                              // setup
    shared[1],                              // prep
    ...(includePrime ? [`MOD_APPLY_${COMP}_PRIME`] : []),
    `MOD_APPLY_${COMP}_FINISH`,
    `MOD_INTERSTAGE_${COMP}`,
    `MOD_APPLY_${COMP}_FINISH`,
    shared[2],                              // cleanup
  ];
  const compLabel = comp.replace(/_/g, ' ');
  return {
    scenario_id: `SCN_${COMP}_NC_${qt}_${methodShort}_FROM_${stateShort}`,
    name: `${compLabel} NC — ${qt} ${methodShort} from ${stateShort.replace(/_/g, ' ')}`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: comp,
      substrate_state: [state],
      quality_tier: qt,
      application_method: method,
      coating_type: 'paint',
    },
    modules,
    coat_counts: includePrime ? { prime_coats: 1, finish_coats: 2, interstage_cycles: 1 } : { finish_coats: 2, interstage_cycles: 1 },
    protection_zones: [
      { zone_id: 'floor_perimeter', level: 'edge_only' },
      { zone_id: 'wall_adjacent', level: 'light' },
    ],
    material_systems: [
      ...(includePrime ? ['SYS_PRIMER_WOOD_ACRYLIC'] : []),
      qt === 'QT5' ? 'SYS_FF_PREMIUM' : qt === 'QT4' ? 'SYS_FF_MODIFIED_URETHANE' : 'SYS_FF_STANDARD_ACRYLIC',
    ],
    output_state: 'SS_PAINTED_SEMIGLOSS',
  };
}

function buildStainScenario(comp, qt, [method, methodShort], [state, stateShort]) {
  const COMP = comp.toUpperCase();
  const includeStain = state === 'SS_BARE';
  const modules = [
    STAIN_SHARED[0],                        // setup
    STAIN_SHARED[1],                        // prep
    ...(includeStain ? [`MOD_APPLY_${COMP}_STAIN`] : []),
    `MOD_APPLY_${COMP}_CLEAR`,
    `MOD_INTERSTAGE_${COMP}_STAIN`,
    `MOD_APPLY_${COMP}_CLEAR`,
    STAIN_SHARED[2],                        // cleanup
  ];
  const compLabel = comp.replace(/_/g, ' ');
  return {
    scenario_id: `SCN_${COMP}_NC_STAIN_${qt}_${methodShort}_FROM_${stateShort}`,
    name: `${compLabel} NC Stain — ${qt} ${methodShort} from ${stateShort.replace(/_/g, ' ')}`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: comp,
      substrate_state: [state],
      quality_tier: qt,
      application_method: method,
      coating_type: 'stain_clear',
    },
    modules,
    coat_counts: includeStain ? { stain_coats: 1, clear_coats: 2, interstage_cycles: 1 } : { clear_coats: 2, interstage_cycles: 1 },
    protection_zones: [
      { zone_id: 'riser_masks', level: 'full' },
      { zone_id: 'wall_adjacent', level: 'light' },
    ],
    material_systems: [
      ...(includeStain ? ['SYS_STAIN_PENETRATING'] : []),
      'SYS_CLEAR_POLYURETHANE',
    ],
    output_state: 'SS_STAINED',
  };
}

let written = 0;

for (const qt of QTS) {
  for (const comp of PAINT_COMPONENTS) {
    for (const m of PAINT_METHODS) {
      for (const s of PAINT_STATES) {
        const sc = buildPaintScenario(comp, qt, m, s);
        fs.writeFileSync(path.join(scenariosDir, `${sc.scenario_id}.json`), JSON.stringify(sc, null, 2) + '\n');
        written++;
      }
    }
  }
}

for (const qt of QTS) {
  for (const comp of STAIN_COMPONENTS) {
    for (const m of STAIN_METHODS) {
      for (const s of STAIN_STATES) {
        const sc = buildStainScenario(comp, qt, m, s);
        fs.writeFileSync(path.join(scenariosDir, `${sc.scenario_id}.json`), JSON.stringify(sc, null, 2) + '\n');
        written++;
      }
    }
  }
}

console.log(`Wrote ${written} stair scenarios to ${scenariosDir}`);
