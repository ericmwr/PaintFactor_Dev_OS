#!/usr/bin/env node
// Coverage validator. Walks every (room × spec) combination producible from
// the existing PaintScope spec map, builds a synthetic ctx that should match
// SOMETHING in the scenario bundle, and reports gaps.
//
// Use this before Phase 6 calibration to find which (paintable_item × method ×
// state × QT) combinations have no scenario coverage. The fix is either to
// add a scenario or to change the paintable_item mapping in the adapter.
//
// Usage:  node Claude/scripts/validate-coverage.mjs [--verbose]

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { findBestMatch, findNearMisses } from '../tools/paintscope/src/engine/scenario-matcher.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const verbose = process.argv.includes('--verbose');

const bundle = loadScenarioBundle(repoRoot);
console.log(`Loaded: ${Object.keys(bundle.modules).length} modules, ${bundle.scenarios.length} scenarios\n`);

// ============================================================
// COVERAGE MATRIX
// ============================================================
// Each entry: a paintable_item we expect to have scenarios for, with the
// dimensions that should match. The validator probes the cartesian product.
//
// Source: Phase 2a/2b authoring intent. If a (paintable_item × dimension)
// combination has no matching scenario, that's a real coverage gap.
const COVERAGE_PROBES = [
  // Interior NC paint (Phase 0-1c — uses bare paintable_item names)
  { paintable_item: 'drywall', surface: 'wall', states: ['SS_BARE', 'SS_PRIMED'], qts: ['QT2','QT3','QT4','QT5'], methods: ['roll','spray','spray_backroll'] },
  { paintable_item: 'drywall', surface: 'ceiling', states: ['SS_BARE', 'SS_PRIMED'], qts: ['QT2','QT3','QT4','QT5'], methods: ['roll','spray','spray_backroll','spray_only'] },
  { paintable_item: 'int_trim', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], methods: ['brush','spray'], coating_type: ['paint'] },
  { paintable_item: 'int_door', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], methods: ['brush','spray'] },
  { paintable_item: 'int_window', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], methods: ['brush','spray'] },
  { paintable_item: 'cabinet', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'] },
  { paintable_item: 'closet', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'] },

  // Interior stain (Phase 2b — uses int_ prefixed names + coating_type)
  { paintable_item: 'int_trim', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], coating_types: ['stain_clear'] },
  { paintable_item: 'int_door_slab', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], coating_types: ['stain_clear'] },
  { paintable_item: 'int_door_frame', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], coating_types: ['stain_clear'] },
  { paintable_item: 'int_wood_wall', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], coating_types: ['stain_clear'] },
  { paintable_item: 'int_wood_ceiling', states: ['SS_BARE'], qts: ['QT3','QT4','QT5'], coating_types: ['stain_clear'] },

  // Interior RP (Phase 2b — uses int_ prefixed names)
  { paintable_item: 'int_drywall_wall', states: ['SS_SOUND_PAINT', 'SS_FAILING_PAINT'], qts: ['QT3','QT4'] },
  { paintable_item: 'int_drywall_ceiling', states: ['SS_SOUND_PAINT', 'SS_FAILING_PAINT'], qts: ['QT3','QT4'] },
  { paintable_item: 'int_door', states: ['SS_SOUND_PAINT', 'SS_FAILING_PAINT'], qts: ['QT3','QT4'] },

  // Exterior paint NC + RP
  { paintable_item: 'ext_eng_siding', states: ['SS_EXT_PRIMED_FACTORY','SS_EXT_BARE_WOOD'], qts: ['QT2','QT3','QT4'], methods: ['spray','spray_backroll','brush_roll'] },
  { paintable_item: 'ext_fc_siding', states: ['SS_EXT_PRIMED_FACTORY','SS_EXT_BARE_FIBERCEMENT'], qts: ['QT2','QT3','QT4'], methods: ['spray','brush_roll'] },
  { paintable_item: 'ext_soffit', states: ['SS_EXT_PRIMED_FACTORY'], qts: ['QT2','QT3','QT4'], methods: ['spray','spray_backroll','spray_backbrush','brush_roll'] },
  { paintable_item: 'ext_porch_ceiling', states: ['SS_EXT_PRIMED_FACTORY','SS_EXT_BARE_WOOD'], qts: ['QT2','QT3','QT4'], methods: ['spray','spray_backroll','spray_backbrush','brush_roll'] },
  { paintable_item: 'ext_porch_floor', states: ['SS_EXT_BARE_CONCRETE','SS_EXT_BARE_WOOD'], qts: ['QT2','QT3','QT4','QT5'] },
  { paintable_item: 'ext_foundation', states: ['SS_EXT_BARE_MASONRY'], qts: ['QT2','QT3'], methods: ['spray','roll','brush'], coating_types: ['acrylic','cementitious'] },
  { paintable_item: 'ext_masonry_wall', states: ['SS_EXT_BARE_MASONRY'], qts: ['QT2','QT3','QT4'], methods: ['spray_backroll','roll','brush'] },
  { paintable_item: 'ext_stucco_wall', states: ['SS_EXT_BARE_MASONRY'], qts: ['QT2','QT3','QT4'], methods: ['spray_backroll','roll','brush'] },
  { paintable_item: 'ext_metal_railing', states: ['SS_EXT_BARE_METAL','SS_EXT_SOUND_PAINT_METAL','SS_EXT_FAILING_PAINT_METAL'], qts: ['QT3','QT4','QT5'], methods: ['brush','spray','spray_backbrush'] },
  { paintable_item: 'ext_garage_door', states: ['SS_EXT_BARE_METAL','SS_EXT_SOUND_PAINT'], qts: ['QT3','QT4'], methods: ['brush','spray','spray_backbrush'] },

  // Standalone
  { paintable_item: 'ext_caulk_joint', joint_complexities: ['simple_bead','backer_rod'] },
  { paintable_item: 'ext_deck_floor', states: ['SS_EXT_BARE_WOOD','SS_EXT_SOUND_STAIN'], qts: ['QT3','QT4'] },
  { paintable_item: 'ext_fence', states: ['SS_EXT_BARE_WOOD','SS_EXT_SOUND_STAIN'], methods: ['spray','brush_roll'], coating_types: ['stain','paint'] },
];

function probeMatrix(probe) {
  const states = probe.states || [null];
  const qts = probe.qts || [null];
  const methods = probe.methods || [null];
  const coatingTypes = probe.coating_types || [null];
  const jointCs = probe.joint_complexities || [null];
  const cases = [];
  for (const state of states) {
    for (const qt of qts) {
      for (const method of methods) {
        for (const ct of coatingTypes) {
          for (const jc of jointCs) {
            const ctx = { paintable_item: probe.paintable_item };
            if (probe.surface) ctx.surface = probe.surface;
            if (state) ctx.substrate_state = state;
            if (qt) ctx.quality_tier = qt;
            if (method) ctx.application_method = method;
            if (ct) ctx.coating_type = ct;
            if (jc) ctx.joint_complexity = jc;
            cases.push(ctx);
          }
        }
      }
    }
  }
  return cases;
}

let totalCases = 0;
let matchedCases = 0;
let unmatched = [];
let ambiguous = [];

for (const probe of COVERAGE_PROBES) {
  const cases = probeMatrix(probe);
  for (const ctx of cases) {
    totalCases++;
    const result = findBestMatch(bundle, ctx);
    if (result.scenario) {
      matchedCases++;
      if (result.tied) {
        ambiguous.push({ ctx, scenario: result.scenario.scenario_id, warning: result.warnings[0] });
      }
    } else {
      const near = findNearMisses(bundle, ctx, 1);
      unmatched.push({ ctx, near: near.slice(0, 2) });
    }
  }
}

const pct = totalCases > 0 ? ((matchedCases / totalCases) * 100).toFixed(1) : '0';
console.log('='.repeat(80));
console.log('COVERAGE SUMMARY');
console.log('='.repeat(80));
console.log(`\n  Total ctx probes:   ${totalCases}`);
console.log(`  Matched scenarios:  ${matchedCases}  (${pct}%)`);
console.log(`  Unmatched:          ${unmatched.length}`);
console.log(`  Ambiguous (tied):   ${ambiguous.length}`);

if (unmatched.length) {
  console.log('\n' + '='.repeat(80));
  console.log(`UNMATCHED PROBES (${unmatched.length})`);
  console.log('='.repeat(80));
  // Group unmatched by paintable_item for readability
  const byItem = {};
  for (const u of unmatched) {
    const item = u.ctx.paintable_item || '(unknown)';
    if (!byItem[item]) byItem[item] = [];
    byItem[item].push(u);
  }
  for (const [item, list] of Object.entries(byItem).sort()) {
    console.log(`\n  ${item}  (${list.length} unmatched)`);
    if (verbose) {
      for (const u of list.slice(0, 5)) {
        const ctxStr = Object.entries(u.ctx)
          .filter(([k]) => k !== 'paintable_item')
          .map(([k,v]) => `${k}=${v}`)
          .join(' ');
        console.log(`    ${ctxStr}`);
        if (u.near[0]) {
          const miss = u.near[0].mismatches[0];
          if (miss) console.log(`      near-miss ${u.near[0].scenario.scenario_id}: ${miss.key} expected ${JSON.stringify(miss.expected)}, got ${JSON.stringify(miss.got)}`);
        }
      }
      if (list.length > 5) console.log(`    ... and ${list.length - 5} more`);
    }
  }
}

if (ambiguous.length && verbose) {
  console.log('\n' + '='.repeat(80));
  console.log(`AMBIGUOUS MATCHES (${ambiguous.length})`);
  console.log('='.repeat(80));
  for (const a of ambiguous.slice(0, 10)) {
    console.log(`\n  ${a.scenario}`);
    console.log(`    ${a.warning}`);
  }
  if (ambiguous.length > 10) console.log(`\n  ... and ${ambiguous.length - 10} more`);
}

console.log('\n' + '='.repeat(80));
const status = unmatched.length === 0 ? 'PASS' : 'FAIL';
console.log(`COVERAGE: ${status}  (${matchedCases}/${totalCases} = ${pct}%)`);
console.log('='.repeat(80));

process.exit(unmatched.length === 0 ? 0 : 1);
