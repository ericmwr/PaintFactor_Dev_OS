#!/usr/bin/env node
// Scenario engine test harness.
//
// Runs the scenario-based estimator on either:
//   A) a synthesized project state defined in a fixture JSON file, OR
//   B) a saved PaintScope state snapshot exported from the UI
//
// Emits per-task, per-phase results and (when a legacy snapshot is provided)
// a side-by-side comparison with the legacy engine's output.
//
// Usage:
//   node Claude/scripts/scenario-harness.mjs <fixture.json>
//   node Claude/scripts/scenario-harness.mjs <fixture.json> --baseline <legacy-output.json>
//
// Fixture JSON shape:
//   {
//     "state": { "project": {...}, "rooms": [...] },   // full PaintScope state
//     "label": "Optional test case label"
//   }
//
// Baseline JSON shape (produced by the legacy engine's `runEstimate()`):
//   { specResults: [...], totalHours: N, phaseHours: {...} }

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadScenarioBundle } from '../tools/paintscope/src/engine/scenario-loader.js';
import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';
import { buildScenarioInputs } from '../tools/paintscope/src/engine/context-adapter.js';
import { findBestMatch, findNearMisses } from '../tools/paintscope/src/engine/scenario-matcher.js';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');

// ============================================================
// CLI ARG PARSING
// ============================================================
const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`Usage:
  node Claude/scripts/scenario-harness.mjs <fixture.json>
  node Claude/scripts/scenario-harness.mjs <fixture.json> --baseline <legacy.json>
  node Claude/scripts/scenario-harness.mjs --synth <scenario-case>

Options:
  --baseline <file>   Compare scenario output against a legacy-engine output snapshot
  --synth <case>      Run one of the built-in synthetic test cases (drywall|eng_siding|soffit|masonry|foundation|stucco|metal)
  --verbose           Print every task result (default: phase-level summary only)
  --gaps              Report paintable_items with no matching scenario

Example:
  node Claude/scripts/scenario-harness.mjs --synth drywall --verbose
`);
  process.exit(0);
}

const fixtureArg = args[0];
const baselineIdx = args.indexOf('--baseline');
const baselinePath = baselineIdx !== -1 ? args[baselineIdx + 1] : null;
const verbose = args.includes('--verbose');
const reportGaps = args.includes('--gaps');
const synthCase = args.indexOf('--synth') !== -1 ? args[args.indexOf('--synth') + 1] : null;

// ============================================================
// LOAD BUNDLE
// ============================================================
console.log('Loading scenario bundle...');
const bundle = loadScenarioBundle(repoRoot);
console.log(`  ${Object.keys(bundle.modules).length} modules, ${bundle.scenarios.length} scenarios\n`);

// ============================================================
// SYNTHETIC TEST CASES
// ============================================================
// Built-in test fixtures covering each major spec family. These are ctx+roomQty
// pairs that exercise the engine without requiring a full PaintScope state.
const SYNTH_CASES = {
  drywall: {
    label: 'Interior drywall wall finish — QT3 spray+backroll',
    ctx: {
      paintable_item: 'drywall',
      surface: 'wall',
      substrate_state: 'SS_PRIMED',
      quality_tier: 'QT3',
      application_method: 'spray_backroll',
      surface_texture: 'orange_peel',
      height_band: 'STD',
      complexity: 'STD',
    },
    roomQty: new Map([
      ['PS_SURFACE_SF.WALL_FIELD', { value: 600 }],
      ['PS_SURFACE_EA.WINDOWS', { value: 4 }],
      ['PS_SURFACE_EA.DOORS', { value: 2 }],
    ]),
  },
  eng_siding: {
    label: 'Exterior engineered wood siding — spray, QT3, bare',
    ctx: {
      paintable_item: 'ext_eng_siding',
      substrate_state: 'SS_EXT_PRIMED_FACTORY',
      quality_tier: 'QT3',
      application_method: 'spray',
      access_type: 'ladder',
      siding_profile: 'lap',
      surface_texture: 'smooth',
    },
    roomQty: exteriorRoomQty(),
  },
  soffit: {
    label: 'Exterior soffit — spray+backbrush, open face, QT3',
    ctx: {
      paintable_item: 'ext_soffit',
      substrate_state: 'SS_EXT_PRIMED_FACTORY',
      quality_tier: 'QT3',
      application_method: 'spray_backbrush',
      access_type: 'ladder',
      substrate_material: 'wood',
      soffit_face_type: 'open_face',
    },
    roomQty: exteriorRoomQty(),
  },
  masonry: {
    label: 'Exterior masonry wall — spray+backroll, CMU, elastomeric',
    ctx: {
      paintable_item: 'ext_masonry_wall',
      substrate_state: 'SS_EXT_BARE_MASONRY',
      quality_tier: 'QT4',
      application_method: 'spray_backroll',
      access_type: 'scaffold',
      substrate_type: 'CMU',
      coating_system: 'elastomeric',
    },
    roomQty: exteriorRoomQty(),
  },
  foundation: {
    label: 'Exterior foundation — roll, acrylic, CMU',
    ctx: {
      paintable_item: 'ext_foundation',
      substrate_state: 'SS_EXT_BARE_MASONRY',
      quality_tier: 'QT3',
      application_method: 'roll',
      coating_type: 'acrylic',
      foundation_type: 'CMU',
    },
    roomQty: exteriorRoomQty(),
  },
  stucco: {
    label: 'Exterior stucco — spray+backroll, dash texture (2.0x)',
    ctx: {
      paintable_item: 'ext_stucco_wall',
      substrate_state: 'SS_EXT_BARE_MASONRY',
      quality_tier: 'QT3',
      application_method: 'spray_backroll',
      access_type: 'ladder',
      substrate_type: 'traditional_stucco',
      texture_profile: 'dash',
    },
    roomQty: exteriorRoomQty(),
  },
  metal: {
    label: 'Exterior metal railing — brush, ornate profile (2.5x)',
    ctx: {
      paintable_item: 'ext_metal_railing',
      substrate_state: 'SS_EXT_BARE_METAL',
      quality_tier: 'QT3',
      application_method: 'brush',
      access_type: 'ground',
      metal_profile_complexity: 'ornate',
    },
    roomQty: exteriorRoomQty(),
  },
  fence: {
    label: 'Exterior fence — spray stain, picket style',
    ctx: {
      paintable_item: 'ext_fence',
      substrate_state: 'SS_EXT_BARE_WOOD',
      application_method: 'spray',
      coating_type: 'stain',
      fence_style: 'picket',
    },
    roomQty: exteriorRoomQty(),
  },
};

function exteriorRoomQty() {
  return new Map([
    ['PS_EXT_SURFACE_SF.SIDING_FIELD', { value: 1000 }],
    ['PS_EXT_SURFACE_SF.MASONRY_WALL', { value: 1000 }],
    ['PS_EXT_SURFACE_SF.STUCCO_FIELD', { value: 1000 }],
    ['PS_EXT_SURFACE_SF.SOFFIT_FIELD', { value: 500 }],
    ['PS_EXT_SURFACE_SF.FOUNDATION_WALL', { value: 200 }],
    ['PS_EXT_SURFACE_LF.METAL', { value: 100 }],
    ['PS_EXT_SURFACE_SF.FENCE_FIELD', { value: 800 }],
    ['PS_EXT_SURFACE_EA.FENCE_GATE', { value: 1 }],
    ['PS_EXT_PROTECT_SF.LANDSCAPE', { value: 300 }],
    ['PS_EXT_PROTECT_SF.HARDSCAPE', { value: 150 }],
    ['PS_EXT_PROTECT_EA.FIXTURES', { value: 4 }],
    ['PS_EXT_PROTECT_EA.LIGHT_FIXTURE', { value: 4 }],
    ['PS_EXT_PROTECT_EA.WINDOWS', { value: 6 }],
    ['PS_EXT_PROTECT_EA.DOORS', { value: 2 }],
    ['PS_EXT_PROTECT_LF.TRIM', { value: 200 }],
    ['PS_EXT_SURFACE_EA.ORNAMENTAL', { value: 0 }],
  ]);
}

// ============================================================
// RENDER HELPERS
// ============================================================
function renderPhaseBar(phaseHours, totalHours) {
  const phases = ['setup', 'prep', 'prime', 'apply', 'finish', 'interstage', 'cleanup'];
  const rows = [];
  for (const p of phases) {
    if (phaseHours[p] != null && phaseHours[p] > 0) {
      const pct = totalHours > 0 ? Math.round((phaseHours[p] / totalHours) * 100) : 0;
      rows.push(`    ${p.padEnd(12)} ${phaseHours[p].toFixed(2).padStart(7)} hrs  ${'#'.repeat(Math.min(40, pct))} ${pct}%`);
    }
  }
  return rows.join('\n');
}

function renderTasks(tasks, limit = 50) {
  const rows = ['    ' + 'task_id'.padEnd(40) + 'phase'.padEnd(12) + 'qty'.padStart(8) + '  ' + 'rate'.padStart(8) + '  ' + 'hrs'.padStart(8)];
  rows.push('    ' + '-'.repeat(82));
  for (const t of tasks.slice(0, limit)) {
    const rate = typeof t.baseRate === 'number' ? t.baseRate.toFixed(1) : String(t.baseRate || '');
    rows.push(
      '    ' +
      (t.taskId || '').padEnd(40) +
      (t.phase || '').padEnd(12) +
      String(t.quantity || 0).padStart(8) + '  ' +
      rate.padStart(8) + '  ' +
      t.hours.toFixed(3).padStart(8)
    );
  }
  if (tasks.length > limit) rows.push(`    ... and ${tasks.length - limit} more tasks`);
  return rows.join('\n');
}

// ============================================================
// RUN ONE CASE
// ============================================================
function runCase(label, ctx, roomQty) {
  console.log('='.repeat(80));
  console.log(label);
  console.log('='.repeat(80));

  // Find match first (diagnostic)
  const matchResult = findBestMatch(bundle, ctx);
  if (!matchResult.scenario) {
    console.log('\n  ❌ NO SCENARIO MATCHED\n');
    console.log('  Context:');
    for (const [k, v] of Object.entries(ctx)) {
      console.log(`    ${k.padEnd(24)} = ${v}`);
    }
    const near = findNearMisses(bundle, ctx, 2);
    if (near.length) {
      console.log(`\n  ${near.length} near-misses within threshold 2:`);
      for (const n of near.slice(0, 3)) {
        console.log(`    ${n.scenario.scenario_id}  (score ${n.score})`);
        for (const miss of n.mismatches.slice(0, 3)) {
          console.log(`      ${miss.key}: expected ${JSON.stringify(miss.expected)}, got ${JSON.stringify(miss.got)}`);
        }
        if (n.missing.length) console.log(`      missing ctx keys: ${n.missing.join(', ')}`);
      }
    }
    return null;
  }

  console.log(`\n  ✓ Matched scenario: ${matchResult.scenario.scenario_id}  (specificity ${matchResult.allMatches[0].specificity})`);
  if (matchResult.tied) console.log(`  ⚠ ${matchResult.warnings.join(' ')}`);

  const result = runScenarioEstimate({
    scenarioBundle: bundle,
    ctx,
    roomQty,
    roomIndex: 0,
    roomLabel: label,
  });

  console.log(`\n  Total hours: ${result.totalHours}  (${result.tasks.length} tasks)`);
  console.log('\n  Phase breakdown:');
  console.log(renderPhaseBar(result.phaseHours, result.totalHours));

  if (verbose) {
    console.log('\n  Tasks:');
    console.log(renderTasks(result.tasks));
  }

  if (result.warnings.length) {
    console.log('\n  Warnings:');
    for (const w of result.warnings) console.log(`    - ${w}`);
  }

  return result;
}

// ============================================================
// BASELINE COMPARISON
// ============================================================
function compareToBaseline(scenarioResult, baseline, label) {
  console.log('\n' + '='.repeat(80));
  console.log(`BASELINE COMPARISON: ${label}`);
  console.log('='.repeat(80));

  const legacyTotal = baseline.totalHours ?? 0;
  const scenarioTotal = scenarioResult.totalHours ?? 0;
  const delta = scenarioTotal - legacyTotal;
  const pct = legacyTotal > 0 ? ((delta / legacyTotal) * 100).toFixed(1) : 'n/a';

  console.log(`\n  Legacy total:   ${legacyTotal.toFixed(2)} hrs`);
  console.log(`  Scenario total: ${scenarioTotal.toFixed(2)} hrs`);
  console.log(`  Delta:          ${delta >= 0 ? '+' : ''}${delta.toFixed(2)} hrs  (${pct}%)`);

  const legacyPhases = baseline.phaseHours || {};
  const scenarioPhases = scenarioResult.phaseHours || {};
  const allPhases = new Set([...Object.keys(legacyPhases), ...Object.keys(scenarioPhases)]);

  console.log('\n  Phase comparison:');
  console.log('    ' + 'phase'.padEnd(14) + 'legacy'.padStart(10) + '  ' + 'scenario'.padStart(10) + '  ' + 'delta'.padStart(10) + '  ' + 'pct'.padStart(8));
  console.log('    ' + '-'.repeat(60));
  for (const p of allPhases) {
    const lv = legacyPhases[p] ?? 0;
    const sv = scenarioPhases[p] ?? 0;
    const d = sv - lv;
    const pp = lv > 0 ? `${((d / lv) * 100).toFixed(1)}%` : (sv > 0 ? 'new' : '—');
    const flag = Math.abs(d) > 0.1 ? '  ⚠' : '';
    console.log(`    ${p.padEnd(14)}${lv.toFixed(2).padStart(10)}  ${sv.toFixed(2).padStart(10)}  ${(d >= 0 ? '+' : '') + d.toFixed(2).padStart(10)}  ${pp.padStart(8)}${flag}`);
  }

  const within5pct = Math.abs(delta / (legacyTotal || 1)) <= 0.05;
  console.log(`\n  Within ±5%: ${within5pct ? '✓ PASS' : '✗ FAIL'}`);
}

// ============================================================
// GAP REPORT
// ============================================================
function reportGapReport() {
  console.log('\n' + '='.repeat(80));
  console.log('SCENARIO COVERAGE REPORT');
  console.log('='.repeat(80));

  const byItem = {};
  for (const scn of bundle.scenarios) {
    const item = scn.matches?.paintable_item;
    const items = Array.isArray(item) ? item : [item || '(no paintable_item)'];
    for (const i of items) {
      if (!byItem[i]) byItem[i] = [];
      byItem[i].push(scn.scenario_id);
    }
  }

  const rows = Object.entries(byItem).sort();
  console.log(`\n  ${rows.length} distinct paintable_items covered by scenarios:\n`);
  for (const [item, scns] of rows) {
    console.log(`    ${item.padEnd(30)} ${scns.length} scenarios`);
  }
}

// ============================================================
// MAIN
// ============================================================
if (synthCase) {
  const c = SYNTH_CASES[synthCase];
  if (!c) {
    console.error(`Unknown synth case: ${synthCase}`);
    console.error(`Available: ${Object.keys(SYNTH_CASES).join(', ')}`);
    process.exit(1);
  }
  const result = runCase(c.label, c.ctx, c.roomQty);
  if (baselinePath && result) {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    compareToBaseline(result, baseline, c.label);
  }
} else if (fixtureArg === '--gaps' || reportGaps) {
  reportGapReport();
} else if (fixtureArg && fs.existsSync(fixtureArg)) {
  // Load fixture JSON
  const fixture = JSON.parse(fs.readFileSync(fixtureArg, 'utf8'));
  const label = fixture.label || path.basename(fixtureArg, '.json');

  if (fixture.state) {
    // Full state snapshot — use adapter
    console.log(`Running full state snapshot: ${label}`);
    const { roomInputs, warnings } = buildScenarioInputs(fixture.state, fixture.db || null);
    console.log(`  Adapter produced ${roomInputs.length} (room × spec) inputs`);
    if (warnings.length) {
      console.log('\n  Adapter warnings:');
      for (const w of warnings) console.log(`    - ${w}`);
    }

    let grandTotal = 0;
    const allWarnings = [];
    for (const input of roomInputs) {
      const caseLabel = `[${input.roomLabel}] ${input.specId}`;
      const result = runCase(caseLabel, input.ctx, input.roomQty);
      if (result) {
        grandTotal += result.totalHours;
        allWarnings.push(...result.warnings);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log(`GRAND TOTAL: ${grandTotal.toFixed(2)} hrs across ${roomInputs.length} (room × spec) combinations`);
    console.log('='.repeat(80));

    if (baselinePath) {
      const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
      compareToBaseline({ totalHours: grandTotal, phaseHours: {} }, baseline, label);
    }
  } else if (fixture.ctx) {
    // Single ctx+roomQty test case
    const roomQty = new Map(Object.entries(fixture.roomQty || {}).map(([k, v]) => [k, { value: v }]));
    runCase(label, fixture.ctx, roomQty);
  } else {
    console.error('Fixture must have either `state` or `ctx` field');
    process.exit(1);
  }
} else {
  console.error('Specify a fixture JSON file or use --synth <case>');
  process.exit(1);
}

if (reportGaps) reportGapReport();
