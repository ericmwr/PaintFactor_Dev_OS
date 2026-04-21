#!/usr/bin/env node
// Generate combined wall+ceiling finish scenarios: 4 QTs × 3 sheens = 12 files.
//
// Each scenario matches on pass_group_id: 'walls_ceiling_finish_combined' plus
// QT, sheen, application_method. The resolver only forms a finish group when
// walls + ceiling share system_id + product_id + sheen + color_code; the
// scenario's match filter narrows further by sheen + QT + method.
//
// Idempotent — re-running overwrites.

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCN_DIR = join(__dirname, '..', 'scenarios');

const QT_LEVELS = ['QT2', 'QT3', 'QT4', 'QT5'];
const SHEENS = ['EGGSHELL', 'SATIN', 'MATTE'];

function scenario(qt, sheen) {
  const sheenLower = sheen.toLowerCase();
  const hasInterstage = qt === 'QT4' || qt === 'QT5';
  // Module sequence:
  //   setup → prep → apply_ceil → apply_wall   (coat 1)
  //   (interstage if QT4/5)
  //   apply_ceil → apply_wall                  (coat 2)
  //   cleanup
  const modules = [
    'MOD_SETUP_COMBINED_WC_FINISH',
    'MOD_PREP_COMBINED_WC_FINISH',
    'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
    'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
  ];
  if (hasInterstage) modules.push('MOD_INTERSTAGE_COMBINED_WC_FINISH');
  modules.push(
    'MOD_APPLY_CEIL_FINISH_SPRAY_BACKROLL_COMBINED',
    'MOD_APPLY_WALL_FINISH_SPRAY_BACKROLL_COMBINED',
    'MOD_CLEANUP_COMBINED_WC_FINISH'
  );
  return {
    scenario_id: `SCN_COMBINED_WALLS_CEILING_FINISH_${qt}_SPRAY_BACKROLL_${sheen}`,
    name: `Combined Walls+Ceiling Finish (Spray+Backroll, ${qt}, ${sheen})`,
    domain: 'interior',
    context: 'NC',
    pass_type: 'finish',
    matches: {
      pass_group_id: 'walls_ceiling_finish_combined',
      quality_tier: [qt],
      application_method: 'spray_backroll',
      sheen: sheenLower,
    },
    modules,
    coat_counts: {
      prime_coats: 0,
      finish_coats: 2,
      interstage_cycles: hasInterstage ? 1 : 0,
    },
    material_systems: ['SYS_WALL_FINISH'],
    output_state: `SS_PAINTED_${sheen}`,
  };
}

let count = 0;
for (const qt of QT_LEVELS) {
  for (const sheen of SHEENS) {
    const scn = scenario(qt, sheen);
    writeFileSync(join(SCN_DIR, `${scn.scenario_id}.json`), JSON.stringify(scn, null, 2) + '\n');
    console.log('wrote', scn.scenario_id);
    count++;
  }
}
console.log(`\nGenerated ${count} combined finish scenarios.`);
