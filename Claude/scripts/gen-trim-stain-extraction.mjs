#!/usr/bin/env node
// Generator for per-substrate trim stain spec families.
//
// Clones the door_casing stain pattern (DCST) for each listed substrate:
//   - 18 tasks (SAND_BARE, FILL, TACK, CONDITIONER, WIPE_COND, STAIN_BRUSH/ROLL/SPRAY,
//     SAND_STAIN, SEALER_BRUSH/SPRAY, SAND_SEALER, CLEAR_BRUSH/SPRAY, SAND_CLEAR,
//     FINAL_INSPECT, TOUCHUP, EQUIP_CLEAN)
//   - 5 modules (MOD_PREP_{PFX}_STAIN, MOD_APPLY_{PFX}_STAIN, MOD_APPLY_{PFX}_SEALER,
//     MOD_APPLY_{PFX}_CLEAR_COAT, MOD_CLEANUP_{PFX}_STAIN)
//   - 1 scenario (SCN_INT_{PFX}_STAIN_CLEAR) with dynamic_coats wiring
//
// Usage: node Claude/scripts/gen-trim-stain-extraction.mjs
// Writes files under Claude/tasks, Claude/modules, Claude/scenarios.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const TASKS_DIR = path.join(repoRoot, 'Claude', 'tasks');
const MODULES_DIR = path.join(repoRoot, 'Claude', 'modules');
const SCENARIOS_DIR = path.join(repoRoot, 'Claude', 'scenarios');

// One row per substrate to extract. prefix is the unique TSK_/MOD_/SCN_ abbreviation.
// substrate is the internal substrate id (used in int_<substrate> paintable_item).
// label is a human-readable name used in task/module names + doctrine strings.
// psKey is the surface quantity key (already emitted by quantity-lookups.js).
const SUBSTRATES = [
  { prefix: 'DCST', substrate: 'door_casing',   label: 'Door Casing',   psKey: 'PS_SURFACE_LF.TRIM_CASING_DOOR' },
  { prefix: 'WDCS', substrate: 'window_casing', label: 'Window Casing', psKey: 'PS_SURFACE_LF.TRIM_CASING_WINDOW' },
  { prefix: 'BBST', substrate: 'baseboard',     label: 'Baseboard',     psKey: 'PS_SURFACE_LF.TRIM_BASEBOARD' },
  { prefix: 'CRST', substrate: 'crown',         label: 'Crown',         psKey: 'PS_SURFACE_LF.TRIM_CROWN' },
  { prefix: 'CHRS', substrate: 'chair_rail',    label: 'Chair Rail',    psKey: 'PS_SURFACE_LF.TRIM_CHAIR_RAIL' },
  { prefix: 'SMST', substrate: 'shoe_mold',     label: 'Shoe Mold',     psKey: 'PS_SURFACE_LF.TRIM_SHOE_MOLD' },
  { prefix: 'WSCP', substrate: 'wainscot_cap',  label: 'Wainscot Cap',  psKey: 'PS_SURFACE_LF.TRIM_WAINSCOT_CAP' },
  { prefix: 'PCRS', substrate: 'picture_rail',  label: 'Picture Rail',  psKey: 'PS_SURFACE_LF.TRIM_PICTURE_RAIL' },
  { prefix: 'WSST', substrate: 'window_stool',  label: 'Window Stool',  psKey: 'PS_SURFACE_LF.TRIM_WINDOW_STOOL' },
  { prefix: 'WAPS', substrate: 'window_apron',  label: 'Window Apron',  psKey: 'PS_SURFACE_LF.TRIM_WINDOW_APRON' },
  { prefix: 'SDBS', substrate: 'shadow_box',    label: 'Shadow Box',    psKey: 'PS_SURFACE_LF.TRIM_SHADOW_BOX' },
  { prefix: 'PMST', substrate: 'panel_mold',    label: 'Panel Mold',    psKey: 'PS_SURFACE_LF.TRIM_PANEL_MOLD' },
  // Door frame + window jamb: LF-derived from openings × fixed-LF-per-variant.
  // Rates mirror the trim baseline; tune later if frame/jamb profiles are
  // materially slower than casing-style trim.
  { prefix: 'DFST', substrate: 'door_frame',    label: 'Door Frame',    psKey: 'PS_SURFACE_LF.DOOR_FRAME' },
  { prefix: 'WJST', substrate: 'window_jamb',   label: 'Window Jamb',   psKey: 'PS_SURFACE_LF.WINDOW_JAMB' },
];

// Task templates — every substrate gets the same set with prefix substitution.
// Rates mirror the DCST baseline (which mirrored TRST).
const TASK_TEMPLATES = [
  { suffix: 'SAND_BARE',      name: 'Sand Bare Wood',                       skill: 'general',     rate: 50 },
  { suffix: 'FILL',           name: 'Fill Defects',                          skill: 'experienced', rate: 200, qtScaled: true },
  { suffix: 'TACK',           name: 'Tack Clean',                            skill: 'general',     rate: 600 },
  { suffix: 'CONDITIONER',    name: 'Wood Conditioner',                      skill: 'experienced', rate: 200 },
  { suffix: 'WIPE_COND',      name: 'Wipe Conditioner',                      skill: 'general',     rate: 300 },
  { suffix: 'STAIN_BRUSH',    name: 'Stain Brush+Wipe',                      skill: 'experienced', rate: 75 },
  { suffix: 'STAIN_ROLL',     name: 'Stain Roll+Wipe',                       skill: 'experienced', rate: 120 },
  { suffix: 'STAIN_SPRAY',    name: 'Stain Spray+Wipe',                      skill: 'experienced', rate: 200 },
  { suffix: 'SAND_STAIN',     name: 'Sand After Stain (Knock Down Raised Grain)', skill: 'general', rate: 150 },
  { suffix: 'SEALER_BRUSH',   name: 'Sealer Brush',                          skill: 'experienced', rate: 85 },
  { suffix: 'SEALER_SPRAY',   name: 'Sealer Spray',                          skill: 'experienced', rate: 150 },
  { suffix: 'SAND_SEALER',    name: 'Sand Between Sealer (220-320)',         skill: 'general',     rate: 120 },
  { suffix: 'CLEAR_BRUSH',    name: 'Clear Brush',                           skill: 'experienced', rate: 85 },
  { suffix: 'CLEAR_SPRAY',    name: 'Clear Spray',                           skill: 'experienced', rate: 150 },
  { suffix: 'SAND_CLEAR',     name: 'Sand Between Clear (320-400)',          skill: 'general',     rate: 140 },
  { suffix: 'FINAL_INSPECT',  name: 'Final Inspection',                      skill: 'experienced', rate: 500, qtScaled: true },
  { suffix: 'TOUCHUP',        name: 'Touch-Up',                              skill: 'experienced', rate: 300, qtScaled: true },
  { suffix: 'EQUIP_CLEAN',    name: 'Clean Equipment',                       skill: 'general',     fixedMinutes: 10 },
];

function writeJSON(filepath, obj) {
  fs.writeFileSync(filepath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function genTasks(prefix, psKey) {
  for (const t of TASK_TEMPLATES) {
    const taskId = `TSK_${prefix}_${t.suffix}`;
    const data = { task_id: taskId, name: t.name, ps_key: psKey };
    if (t.fixedMinutes) {
      data.uom = 'FIXED';
      data.skill_level = t.skill;
      data.fixed_minutes = t.fixedMinutes;
    } else {
      data.uom = 'LF';
      data.skill_level = t.skill;
      data.rate_per_hour = t.rate;
      if (t.qtScaled) data.qt_scaled = true;
    }
    writeJSON(path.join(TASKS_DIR, `${taskId}.json`), data);
  }
}

function genModules(prefix, label) {
  // PREP: sand_bare + fill + tack + (conditioner+wipe if softwood)
  writeJSON(path.join(MODULES_DIR, `MOD_PREP_${prefix}_STAIN.json`), {
    module_id: `MOD_PREP_${prefix}_STAIN`,
    name: `Stain Prep - ${label}`,
    phase: 'prep',
    intent: 'Bare wood prep: sand, fill, tack. Conditioner only on softwood.',
    tasks: [
      { task_ref: `TSK_${prefix}_SAND_BARE` },
      { task_ref: `TSK_${prefix}_FILL` },
      { task_ref: `TSK_${prefix}_TACK` },
      { task_ref: `TSK_${prefix}_CONDITIONER`, applies_when: { wood_species_group: ['softwood'] } },
      { task_ref: `TSK_${prefix}_WIPE_COND`,   applies_when: { wood_species_group: ['softwood'] } },
    ],
    modifier_eligibility: { qt: true, height: false, texture: false, complexity: true, condition: false },
    doctrine: `Stain prep for ${label.toLowerCase()}. Single sand-bare pass covers sanding and grain-raise. Conditioner + wipe on softwood only.`,
  });

  // APPLY_STAIN: stain (brush/roll/spray) + sand_stain (fires every coat)
  writeJSON(path.join(MODULES_DIR, `MOD_APPLY_${prefix}_STAIN.json`), {
    module_id: `MOD_APPLY_${prefix}_STAIN`,
    name: `Stain Application - ${label}`,
    phase: 'apply',
    intent: 'Stain coat by method + sand after each coat to knock down raised grain.',
    tasks: [
      { task_ref: `TSK_${prefix}_STAIN_BRUSH`, applies_when: { application_method_stain: ['brush'] } },
      { task_ref: `TSK_${prefix}_STAIN_ROLL`,  applies_when: { application_method_stain: ['roll'] } },
      { task_ref: `TSK_${prefix}_STAIN_SPRAY`, applies_when: { application_method_stain: ['spray'] } },
      { task_ref: `TSK_${prefix}_SAND_STAIN` },
    ],
    modifier_eligibility: { qt: false, height: false, texture: false, complexity: true, condition: false },
    doctrine: `Stain for ${label.toLowerCase()}. All methods include wipe step. Sand after each stain coat knocks down grain raised by the solvent/water carrier — fires on every coat so last stain is sanded before sealer goes over.`,
  });

  // APPLY_SEALER: sealer (brush/spray) + sand_sealer (fires every coat — sealer always gets sanded before clear)
  writeJSON(path.join(MODULES_DIR, `MOD_APPLY_${prefix}_SEALER.json`), {
    module_id: `MOD_APPLY_${prefix}_SEALER`,
    name: `Sealer Coat - ${label}`,
    phase: 'finish',
    intent: 'One sealer coat + sand. Repeats per ctx.sealer_coats via scenario.dynamic_coats.',
    tasks: [
      { task_ref: `TSK_${prefix}_SEALER_BRUSH`, applies_when: { application_method_clear: ['brush'] } },
      { task_ref: `TSK_${prefix}_SEALER_SPRAY`, applies_when: { application_method_clear: ['spray'] } },
      { task_ref: `TSK_${prefix}_SAND_SEALER` },
    ],
    modifier_eligibility: { qt: true, height: false, texture: false, complexity: true, condition: false },
    doctrine: 'One sealer + sand pair. Scenario controls how many times this runs via dynamic_coats -> ctx.sealer_coats.',
  });

  // APPLY_CLEAR_COAT: clear (brush/spray) + sand_clear (fires ONLY when coat_number < clear_coats — no sand on final)
  writeJSON(path.join(MODULES_DIR, `MOD_APPLY_${prefix}_CLEAR_COAT.json`), {
    module_id: `MOD_APPLY_${prefix}_CLEAR_COAT`,
    name: `Clear Coat - ${label}`,
    phase: 'finish',
    intent: 'One clear topcoat. Sand after coat only if another coat follows. Repeats per ctx.clear_coats.',
    tasks: [
      { task_ref: `TSK_${prefix}_CLEAR_BRUSH`, applies_when: { application_method_clear: ['brush'] } },
      { task_ref: `TSK_${prefix}_CLEAR_SPRAY`, applies_when: { application_method_clear: ['spray'] } },
      { task_ref: `TSK_${prefix}_SAND_CLEAR`,  applies_when: { coat_lt_ctx: 'clear_coats' } },
    ],
    modifier_eligibility: { qt: true, height: false, texture: false, complexity: true, condition: false },
    doctrine: 'One clear + sand pair. Sand fires only between coats (coat_lt_ctx), not on the final coat.',
  });

  // CLEANUP: final_inspect + touchup + equip_clean
  writeJSON(path.join(MODULES_DIR, `MOD_CLEANUP_${prefix}_STAIN.json`), {
    module_id: `MOD_CLEANUP_${prefix}_STAIN`,
    name: `Stain Cleanup - ${label}`,
    phase: 'cleanup',
    intent: 'Final inspect, touchup, equipment clean.',
    tasks: [
      { task_ref: `TSK_${prefix}_FINAL_INSPECT` },
      { task_ref: `TSK_${prefix}_TOUCHUP` },
      { task_ref: `TSK_${prefix}_EQUIP_CLEAN` },
    ],
    modifier_eligibility: { qt: true, height: false, texture: false, complexity: false, condition: false },
    doctrine: `Stain cleanup for ${label.toLowerCase()}. Equipment clean 10 min global.`,
  });
}

function genScenario(prefix, substrate, label) {
  writeJSON(path.join(SCENARIOS_DIR, `SCN_INT_${prefix}_STAIN_CLEAR.json`), {
    scenario_id: `SCN_INT_${prefix}_STAIN_CLEAR`,
    name: `Int ${substrate} NC - Stain+Clear`,
    domain: 'interior',
    context: 'NC',
    matches: {
      paintable_item: `int_${substrate}`,
      substrate_state: ['SS_BARE'],
      quality_tier: ['QT3', 'QT4', 'QT5'],
      coating_type: ['stain', 'stain_clear', 'stain_only', 'clear_only'],
    },
    modules: [
      `MOD_PREP_${prefix}_STAIN`,
      `MOD_APPLY_${prefix}_STAIN`,
      `MOD_APPLY_${prefix}_SEALER`,
      `MOD_APPLY_${prefix}_CLEAR_COAT`,
      `MOD_CLEANUP_${prefix}_STAIN`,
    ],
    dynamic_coats: {
      [`MOD_APPLY_${prefix}_STAIN`]: 'stain_coats',
      [`MOD_APPLY_${prefix}_SEALER`]: 'sealer_coats',
      [`MOD_APPLY_${prefix}_CLEAR_COAT`]: 'clear_coats',
    },
    material_systems: ['SYS_INT_STAIN', 'SYS_INT_SEALER', 'SYS_INT_CLEAR'],
    modifiers: [],
    output_state: 'SS_STAINED_CLEAR',
  });
}

let taskCount = 0, modCount = 0, scnCount = 0;
for (const sub of SUBSTRATES) {
  genTasks(sub.prefix, sub.psKey);
  genModules(sub.prefix, sub.label);
  genScenario(sub.prefix, sub.substrate, sub.label);
  taskCount += TASK_TEMPLATES.length;
  modCount += 5;
  scnCount += 1;
  console.log(`  ${sub.substrate.padEnd(16)} (${sub.prefix}) → int_${sub.substrate}`);
}
console.log(`\nWrote ${taskCount} tasks, ${modCount} modules, ${scnCount} scenarios across ${SUBSTRATES.length} substrates.`);
