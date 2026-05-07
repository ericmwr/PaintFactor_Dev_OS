// Programmatic estimate probe — runs runScenarioEstimate against a synthetic ctx
// for a wide set of substrates and reports which fire (totalHours > 0) vs which
// produce empty results. A row per substrate is printed. Usage:
//   node Claude/scripts/probe-coverage.mjs

import { runScenarioEstimate } from '../tools/paintscope/src/engine/run-estimate-scenario.js';
import scenarioBundle from '../tools/paintscope/src/data/scenario-bundle.gen.js';

// Probe matrix: each row is a substrate, with the ctx fields needed to match a
// scenario and the ps_keys that need a quantity.
// paintable_item naming follows what the scenarios actually expect (paint side
// uses bare; stain side uses int_).
const PROBES = [
  // --- Trim PAINT side (post-primer) ---
  { label: 'Crown PAINT QT4 brush', ctx: { paintable_item: 'crown', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_CROWN': 100 } },
  { label: 'Baseboard PAINT QT4 brush', ctx: { paintable_item: 'baseboard', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_BASEBOARD': 100 } },
  { label: 'Chair Rail PAINT QT4 brush', ctx: { paintable_item: 'chair_rail', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_CHAIR_RAIL': 100 } },
  { label: 'Shoe Mold PAINT QT4 brush', ctx: { paintable_item: 'shoe_mold', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_SHOE_MOLD': 100 } },
  { label: 'Picture Rail PAINT QT4 brush', ctx: { paintable_item: 'picture_rail', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_PICTURE_RAIL': 100 } },
  { label: 'Wainscot Cap PAINT QT4 brush', ctx: { paintable_item: 'wainscot_cap', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_WAINSCOT_CAP': 100 } },
  { label: 'Window Stool PAINT QT4 brush', ctx: { paintable_item: 'window_stool', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_WINDOW_STOOL': 100 } },
  { label: 'Window Apron PAINT QT4 brush', ctx: { paintable_item: 'window_apron', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_WINDOW_APRON': 100 } },
  { label: 'Shadow Box PAINT QT4 brush', ctx: { paintable_item: 'shadow_box', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_SHADOW_BOX': 100 } },
  { label: 'Panel Mold PAINT QT4 brush', ctx: { paintable_item: 'panel_mold', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_PANEL_MOLD': 100 } },
  { label: 'Door Frame PAINT QT4 brush', ctx: { paintable_item: 'door_frame', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.DOOR_FRAME': 100 } },
  { label: 'Window Jamb PAINT QT4 brush', ctx: { paintable_item: 'window_jamb', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.WINDOW_JAMB': 100 } },
  { label: 'Window Casing PAINT QT4 brush', ctx: { paintable_item: 'window_casing', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_CASING_WINDOW': 100 } },
  { label: 'Door Casing PAINT QT4 brush', ctx: { paintable_item: 'door_casing', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_PRIMED', sheen: 'satin', finish_coats: 2 }, qty: { 'PS_SURFACE_LF.TRIM_CASING_DOOR': 100 } },

  // --- Trim PRIME-from-bare side ---
  { label: 'Crown PRIME QT4 brush', ctx: { paintable_item: 'crown', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_BARE', sheen: 'satin', prime_coats: 1 }, qty: { 'PS_SURFACE_LF.TRIM_CROWN': 100 } },
  { label: 'Baseboard PRIME QT4 brush', ctx: { paintable_item: 'baseboard', quality_tier: 'QT4', application_method: 'brush', substrate_state: 'SS_BARE', sheen: 'satin', prime_coats: 1 }, qty: { 'PS_SURFACE_LF.TRIM_BASEBOARD': 100 } },

  // --- Trim STAIN side (legacy-ish int_ paintable_item, currently still used) ---
  { label: 'Crown STAIN+CLEAR QT4', ctx: { paintable_item: 'int_crown', quality_tier: 'QT4', application_method_stain: 'brush', application_method_clear: 'brush', substrate_state: 'SS_BARE', coating_type: 'stain_clear', stain_coats: 1, sealer_coats: 1, clear_coats: 1 }, qty: { 'PS_SURFACE_LF.TRIM_CROWN': 100 } },
  { label: 'Chair Rail STAIN+CLEAR QT4', ctx: { paintable_item: 'int_chair_rail', quality_tier: 'QT4', application_method_stain: 'brush', application_method_clear: 'brush', substrate_state: 'SS_BARE', coating_type: 'stain_clear', stain_coats: 1, sealer_coats: 1, clear_coats: 1 }, qty: { 'PS_SURFACE_LF.TRIM_CHAIR_RAIL': 100 } },

  // --- Drywall RP paint ---
  { label: 'Drywall Wall RP-failing QT4 brush_roll', ctx: { paintable_item: 'drywall_wall', quality_tier: 'QT4', application_method: 'brush_roll', substrate_state: 'SS_FAILING_PAINT', surface: 'wall', sheen: 'eggshell', finish_coats: 2 }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 200 } },

  // --- Standalone drywall PRIME (post wall/ceiling primer-task retirement: should fire FINISH tasks × TRADE_MATERIAL 1.25) ---
  { label: 'Wall PRIME QT3 spray_backroll',  ctx: { surface: 'wall',    paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 300, 'PS_PROTECT_SF.FLOOR_FULL': 300 } },
  { label: 'Wall PRIME QT3 roll',            ctx: { surface: 'wall',    paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'roll',           substrate_state: 'SS_BARE' }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 300, 'PS_CUTIN_LF.WALL_TO_CEILING': 60 } },
  { label: 'Wall PRIME QT3 spray (no backroll)', ctx: { surface: 'wall', paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'spray',          substrate_state: 'SS_BARE' }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 300 } },
  { label: 'Ceiling PRIME QT3 spray_backroll', ctx: { surface: 'ceiling', paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' }, qty: { 'PS_SURFACE_SF.CEILING_FIELD': 200 } },
  { label: 'Ceiling PRIME QT3 roll',           ctx: { surface: 'ceiling', paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'roll',           substrate_state: 'SS_BARE' }, qty: { 'PS_SURFACE_SF.CEILING_FIELD': 200 } },

  // --- Standalone drywall FINISH (control: TRADE_MATERIAL = 1.0 since these modules don't have material:true) ---
  { label: 'Wall FINISH QT3 spray_backroll', ctx: { surface: 'wall',    paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_PRIMED', sheen: 'eggshell', finish_coats: 2 }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 300 } },
  { label: 'Ceiling FINISH QT3 spray_backroll', ctx: { surface: 'ceiling', paintable_item: 'drywall', quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_PRIMED', sheen: 'flat', finish_coats: 2 }, qty: { 'PS_SURFACE_SF.CEILING_FIELD': 200 } },

  // --- Combined wall+ceiling drywall flow (the marquee NC pattern) ---
  { label: 'COMBINED PRIME QT3 spray_backroll',  ctx: { pass_group_id: 'walls_ceiling_prime_combined',  quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_BARE' },                          qty: { 'PS_SURFACE_SF.WALL_FIELD': 300, 'PS_SURFACE_SF.CEILING_FIELD': 200 } },
  { label: 'COMBINED FINISH QT3 spray_backroll', ctx: { pass_group_id: 'walls_ceiling_finish_combined', quality_tier: 'QT3', application_method: 'spray_backroll', substrate_state: 'SS_PRIMED', sheen: 'eggshell' },     qty: { 'PS_SURFACE_SF.WALL_FIELD': 300, 'PS_SURFACE_SF.CEILING_FIELD': 200 } },
  { label: 'COMBINED FINISH QT4 spray_backroll matte', ctx: { pass_group_id: 'walls_ceiling_finish_combined', quality_tier: 'QT4', application_method: 'spray_backroll', substrate_state: 'SS_PRIMED', sheen: 'matte' }, qty: { 'PS_SURFACE_SF.WALL_FIELD': 300, 'PS_SURFACE_SF.CEILING_FIELD': 200 } },
];

let okCount = 0;
let zeroCount = 0;
let noScenarioCount = 0;
const failures = [];

console.log('=== Coverage probe ===');
console.log('label'.padEnd(40), 'scenario'.padEnd(40), 'hours'.padEnd(8), 'tasks');
for (const probe of PROBES) {
  const roomQty = new Map();
  for (const [k, v] of Object.entries(probe.qty)) roomQty.set(k, { value: v });
  const result = runScenarioEstimate({ scenarioBundle, ctx: probe.ctx, roomQty });
  const status = !result.scenarioId ? 'NO_SCN' : result.totalHours > 0 ? 'OK' : 'ZERO';
  if (status === 'NO_SCN') { noScenarioCount++; failures.push({ label: probe.label, status, warnings: result.warnings.slice(0, 1) }); }
  else if (status === 'ZERO') { zeroCount++; failures.push({ label: probe.label, status, warnings: result.warnings.slice(0, 1) }); }
  else okCount++;
  console.log(
    probe.label.padEnd(40),
    (result.scenarioId || '(none)').padEnd(40),
    String(Math.round(result.totalHours * 100) / 100).padEnd(8),
    String(result.tasks.length) + ' tasks ' + (status === 'OK' ? '✓' : status === 'ZERO' ? '⚠ no hours' : '✗ no scenario'),
  );
}

console.log('');
console.log(`=== Summary: ${okCount} OK | ${zeroCount} ZERO hours | ${noScenarioCount} no scenario ===`);
if (failures.length > 0) {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  [${f.status}] ${f.label}`);
    for (const w of f.warnings || []) console.log(`    warn: ${w}`);
  }
  process.exit(1);
}
