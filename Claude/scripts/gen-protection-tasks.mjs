#!/usr/bin/env node
// Generator for room-level protection tasks + modules.
// All decoupled from paintable-item modules — these live in their own
// future room-protection scenario (built in a separate step).
//
// Source rates: Claude/devos/protection_rate_sheet.docx (filled by user 2026-04-24)
//
// Usage: node Claude/scripts/gen-protection-tasks.mjs
// Then:  node Claude/scripts/build-scenario-bundle.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '..', '..');
const TASKS_DIR = path.join(repoRoot, 'Claude', 'tasks');
const MODULES_DIR = path.join(repoRoot, 'Claude', 'modules');

function writeJSON(filepath, obj) {
  fs.writeFileSync(filepath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function task(taskId, name, psKey, uom, skill, rate, opts = {}) {
  const data = { task_id: taskId, name, ps_key: psKey, uom, skill_level: skill };
  if (uom === 'FIXED') data.fixed_minutes = rate;
  else data.rate_per_hour = rate;
  if (opts.heightModifier) data.height_modifier_applicable = true;
  return data;
}

// =============================================================================
// SURFACE PROTECTION (Floor / Wall / Ceiling × levels)
// =============================================================================
// Each surface×level pair yields an install + remove task. Gated in the module
// via applies_when on `<surface>_mask_level`. PS keys differ by UOM (LF for
// edge/partial perimeter, SF for full/encapsulate area).
//
// rate_per_hour values from the rate sheet. height_modifier_applicable=true
// where user marked "Height Modifier Applicable".

const surfaceTasks = [
  // FLOOR
  ['TSK_PROTECT_FLOOR_EDGE_INSTALL',        'Install Floor Edge Tape',         'PS_PROTECT_LF.FLOOR_EDGE',    'LF', 'intermediate', 200],
  ['TSK_PROTECT_FLOOR_EDGE_REMOVE',         'Remove Floor Edge Tape',          'PS_PROTECT_LF.FLOOR_EDGE',    'LF', 'intermediate', 500],
  ['TSK_PROTECT_FLOOR_SPOT_INSTALL',        'Install Floor Spot Mask (per opening)', 'PS_PROTECT_EA.OPENING_BASE_FLOOR', 'EA', 'general', 12],
  ['TSK_PROTECT_FLOOR_SPOT_REMOVE',         'Remove Floor Spot Mask (per opening)',  'PS_PROTECT_EA.OPENING_BASE_FLOOR', 'EA', 'general', 60],
  ['TSK_PROTECT_FLOOR_PARTIAL_INSTALL',     'Install Floor Partial Drop',      'PS_PROTECT_LF.FLOOR_PARTIAL', 'LF', 'general',      400],
  ['TSK_PROTECT_FLOOR_PARTIAL_REMOVE',      'Remove Floor Partial Drop',       'PS_PROTECT_LF.FLOOR_PARTIAL', 'LF', 'general',      700],
  ['TSK_PROTECT_FLOOR_FULL_INSTALL',        'Install Floor Full Drape',        'PS_PROTECT_SF.FLOOR_AREA',    'SF', 'general',      800],
  ['TSK_PROTECT_FLOOR_FULL_REMOVE',         'Remove Floor Full Drape',         'PS_PROTECT_SF.FLOOR_AREA',    'SF', 'general',      1000],
  ['TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL', 'Install Floor Encapsulation',     'PS_PROTECT_SF.FLOOR_AREA',    'SF', 'intermediate', 200],
  ['TSK_PROTECT_FLOOR_ENCAPSULATE_REMOVE',  'Remove Floor Encapsulation',      'PS_PROTECT_SF.FLOOR_AREA',    'SF', 'intermediate', 450],

  // WALL — full + encapsulate get height modifier
  ['TSK_PROTECT_WALL_EDGE_INSTALL',         'Install Wall Edge Tape',          'PS_PROTECT_LF.WALL_EDGE',     'LF', 'intermediate', 180],
  ['TSK_PROTECT_WALL_EDGE_REMOVE',          'Remove Wall Edge Tape',           'PS_PROTECT_LF.WALL_EDGE',     'LF', 'intermediate', 500],
  ['TSK_PROTECT_WALL_PARTIAL_INSTALL',      'Install Wall Partial Drape',      'PS_PROTECT_LF.WALL_PARTIAL',  'LF', 'intermediate', 180],
  ['TSK_PROTECT_WALL_PARTIAL_REMOVE',       'Remove Wall Partial Drape',       'PS_PROTECT_LF.WALL_PARTIAL',  'LF', 'intermediate', 500],
  ['TSK_PROTECT_WALL_FULL_INSTALL',         'Install Wall Full Drape',         'PS_PROTECT_SF.WALL_AREA',     'SF', 'general',      1200, { heightModifier: true }],
  ['TSK_PROTECT_WALL_FULL_REMOVE',          'Remove Wall Full Drape',          'PS_PROTECT_SF.WALL_AREA',     'SF', 'general',      2000, { heightModifier: true }],
  ['TSK_PROTECT_WALL_ENCAPSULATE_INSTALL',  'Install Wall Encapsulation',      'PS_PROTECT_SF.WALL_AREA',     'SF', 'general',      320,  { heightModifier: true }],
  ['TSK_PROTECT_WALL_ENCAPSULATE_REMOVE',   'Remove Wall Encapsulation',       'PS_PROTECT_SF.WALL_AREA',     'SF', 'general',      1500, { heightModifier: true }],

  // CEILING — all height modifier; "full" not applicable (gravity)
  ['TSK_PROTECT_CEILING_EDGE_INSTALL',         'Install Ceiling Edge Tape',     'PS_PROTECT_LF.CEILING_EDGE',    'LF', 'intermediate', 160, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_EDGE_REMOVE',          'Remove Ceiling Edge Tape',      'PS_PROTECT_LF.CEILING_EDGE',    'LF', 'intermediate', 450, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_SPOT_INSTALL',         'Install Ceiling Spot Mask (per opening)', 'PS_PROTECT_EA.OPENING_ABOVE_CEILING', 'EA', 'general', 60, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_SPOT_REMOVE',          'Remove Ceiling Spot Mask (per opening)',  'PS_PROTECT_EA.OPENING_ABOVE_CEILING', 'EA', 'general', 60, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_PARTIAL_INSTALL',      'Install Ceiling Partial Cover', 'PS_PROTECT_LF.CEILING_PARTIAL', 'LF', 'intermediate', 160, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_PARTIAL_REMOVE',       'Remove Ceiling Partial Cover',  'PS_PROTECT_LF.CEILING_PARTIAL', 'LF', 'intermediate', 450, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_ENCAPSULATE_INSTALL',  'Install Ceiling Encapsulation', 'PS_PROTECT_SF.CEILING_AREA',    'SF', 'general',      120, { heightModifier: true }],
  ['TSK_PROTECT_CEILING_ENCAPSULATE_REMOVE',   'Remove Ceiling Encapsulation',  'PS_PROTECT_SF.CEILING_AREA',    'SF', 'general',      1000, { heightModifier: true }],
];

// =============================================================================
// ADJACENT-SURFACE MASKS (per non-painted neighbor)
// =============================================================================
// Used when the item is present in the room but NOT in paint/stain scope.
// Default skill = general unless flagged otherwise.

const adjacentMaskTasks = [
  // [taskBase, label, psKey, uom, installRate, removeRate, opts]
  ['DOOR_SLAB',          'Door Slab Mask',          'PS_PROTECT_EA.DOOR_SLAB',           'EA', 10, 12],
  ['WINDOW_GLASS',       'Window Glass (Lights) Mask', 'PS_PROTECT_EA.WINDOW_GLASS_LIGHTS', 'EA', 24, 30],
  ['DOOR_FRAME',         'Door Frame Mask',         'PS_PROTECT_LF.DOOR_FRAME_ADJACENT', 'LF', 170, 1000],
  ['DOOR_CASING',        'Door Casing Mask',        'PS_PROTECT_LF.DOOR_CASING_ADJACENT','LF', 170, 1000],
  ['WINDOW_CASING',      'Window Casing Mask',      'PS_PROTECT_LF.WINDOW_CASING_ADJACENT','LF', 200, 200, { heightModifier: true }],
  ['WINDOW_JAMB',        'Window Jamb Mask',        'PS_PROTECT_LF.WINDOW_JAMB_ADJACENT','LF', 170, 1000],
  ['WINDOW_STOOL',       'Window Stool Mask',       'PS_PROTECT_LF.WINDOW_STOOL_ADJACENT','LF', 200, 1000],
  ['WINDOW_APRON',       'Window Apron Mask',       'PS_PROTECT_LF.WINDOW_APRON_ADJACENT','LF', 200, 1000],
  ['BUILTIN',            'Built-in Mask',           'PS_PROTECT_SF.BUILTIN',             'SF', 144, 600],
  ['CABINET',            'Cabinet Mask',            'PS_PROTECT_LF.CABINET',             'LF', 20,  120],
  ['COUNTERTOP',         'Countertop Mask',         'PS_PROTECT_LF.COUNTERTOP',          'LF', 120, 400],
  ['FIREPLACE_MANTEL',   'Fireplace Mantel Mask',   'PS_PROTECT_EA.FIREPLACE_MANTEL',    'EA', 15,  30],
  ['LIGHT_FIXTURE',      'Light Fixture Mask',      'PS_PROTECT_EA.LIGHT_FIXTURE',       'EA', 12,  24],
  ['CEILING_FAN',        'Ceiling Fan Mask',        'PS_PROTECT_EA.CEILING_FAN',         'EA', 6,   12],
  ['OUTLET_SWITCH',      'Outlet/Switch Mask',      'PS_PROTECT_EA.OUTLET_SWITCH',       'EA', 40,  40],
  ['HVAC_VENT',          'HVAC Vent Mask',          'PS_PROTECT_EA.HVAC_VENT',           'EA', 20,  30],
  // Window (Full) — wraps whole opening incl. frame/glass when window NOT in paint scope
  ['WINDOW_FULL_SMALL',  'Window Full Wrap (Small)','PS_PROTECT_EA.WINDOW_FULL_SMALL',   'EA', 8,   30],
  ['WINDOW_FULL_STD',    'Window Full Wrap (STD)',  'PS_PROTECT_EA.WINDOW_FULL_STD',     'EA', 7,   30],
  ['WINDOW_FULL_LG',     'Window Full Wrap (LG)',   'PS_PROTECT_EA.WINDOW_FULL_LG',      'EA', 6,   30],
  ['WINDOW_FULL_XL',     'Window Full Wrap (XL)',   'PS_PROTECT_EA.WINDOW_FULL_XL',      'EA', 5,   30],
];

// =============================================================================
// TAPE LINE / CONTAINMENT / CLEANUP (Table 3)
// =============================================================================

const utilityTasks = [
  ['TSK_TRIM_TAPELINE_INSTALL',  'Trim Tape Line Install',  'PS_PROTECT_LF.TRIM_TAPELINE', 'LF',        'general', 200],
  ['TSK_TRIM_TAPELINE_REMOVE',   'Trim Tape Line Remove',   'PS_PROTECT_LF.TRIM_TAPELINE', 'LF',        'general', 500],
  ['TSK_CONTAINMENT_SETUP',      'Containment Setup',       'PS_PROTECT_FIXED.CONTAINMENT','FIXED',     'general', 60],
  ['TSK_CONTAINMENT_TEARDOWN',   'Containment Teardown',    'PS_PROTECT_FIXED.CONTAINMENT','FIXED',     'general', 30],
  ['TSK_CONTAINMENT_DOOR_ZIPPER','Containment Door Zipper', 'PS_PROTECT_FIXED.CONTAINMENT_ZIPPER','FIXED','general', 3],
  ['TSK_PROTECT_DEBRIS_CLEANUP', 'Protection Debris Cleanup','PS_PROTECT_SF.FLOOR_AREA',   'SF',        'general', 800],
];

// =============================================================================
// EMIT TASKS
// =============================================================================

let taskCount = 0;
for (const [taskId, name, psKey, uom, skill, rate, opts = {}] of surfaceTasks) {
  writeJSON(path.join(TASKS_DIR, `${taskId}.json`), task(taskId, name, psKey, uom, skill, rate, opts));
  taskCount++;
}
for (const [base, label, psKey, uom, install, remove, opts = {}] of adjacentMaskTasks) {
  writeJSON(path.join(TASKS_DIR, `TSK_MASK_${base}_INSTALL.json`),
    task(`TSK_MASK_${base}_INSTALL`, `${label} — Install`, psKey, uom, 'general', install, opts));
  writeJSON(path.join(TASKS_DIR, `TSK_MASK_${base}_REMOVE.json`),
    task(`TSK_MASK_${base}_REMOVE`,  `${label} — Remove`,  psKey, uom, 'general', remove, opts));
  taskCount += 2;
}
for (const [taskId, name, psKey, uom, skill, rate] of utilityTasks) {
  writeJSON(path.join(TASKS_DIR, `${taskId}.json`), task(taskId, name, psKey, uom, skill, rate));
  taskCount++;
}

// =============================================================================
// MODULES
// =============================================================================
// 4 modules, each gated by ctx fields that the protection scenario will set.

// Mask-level enum gate sets.
//   Levels: none / edge / spot / partial / full / encapsulate / edge_partial / edge_full / edge_encapsulate
//
// SETUP semantics: Edge+ fires both edge install AND secondary install (two separate tasks).
// TEARDOWN semantics: Edge+ teardown is ONE motion (rip everything up together) — only the
//   secondary level's remove task fires; edge remove is rolled into its rate. So teardown
//   edge fires only for level='edge' standalone.
const FLOOR_EDGE_LEVELS_SETUP    = ['edge', 'edge_partial', 'edge_full', 'edge_encapsulate'];
const FLOOR_EDGE_LEVELS_TEARDOWN = ['edge'];
const FLOOR_PARTIAL_LEVELS = ['partial', 'edge_partial'];
const FLOOR_FULL_LEVELS    = ['full', 'edge_full'];
const FLOOR_ENCAP_LEVELS   = ['encapsulate', 'edge_encapsulate'];
const FLOOR_SPOT_LEVELS    = ['spot'];
const WALL_EDGE_LEVELS_SETUP    = ['edge', 'edge_partial', 'edge_full', 'edge_encapsulate'];
const WALL_EDGE_LEVELS_TEARDOWN = ['edge'];
const WALL_PARTIAL_LEVELS  = ['partial', 'edge_partial'];
const WALL_FULL_LEVELS     = ['full', 'edge_full'];
const WALL_ENCAP_LEVELS    = ['encapsulate', 'edge_encapsulate'];
const CEILING_EDGE_LEVELS_SETUP    = ['edge', 'edge_partial', 'edge_encapsulate'];   // no edge_full
const CEILING_EDGE_LEVELS_TEARDOWN = ['edge'];
const CEILING_PARTIAL_LEVELS = ['partial', 'edge_partial'];
const CEILING_ENCAP_LEVELS = ['encapsulate', 'edge_encapsulate'];
const CEILING_SPOT_LEVELS  = ['spot'];

// MOD_PROTECT_SETUP — setup phase, fires at start of room work
writeJSON(path.join(MODULES_DIR, 'MOD_PROTECT_SETUP.json'), {
  module_id: 'MOD_PROTECT_SETUP',
  name: 'Room Protection Setup',
  phase: 'setup',
  intent: 'Install all room-level protection based on per-surface mask_level (9-value enum: none/edge/spot/partial/full/encapsulate + 3 Edge+ compounds). Edge+ compounds fire BOTH the edge tape task AND the secondary level task.',
  tasks: [
    // Floor — Edge tape fires for edge OR any edge_X compound
    { task_ref: 'TSK_PROTECT_FLOOR_EDGE_INSTALL',         applies_when: { floor_mask_level: FLOOR_EDGE_LEVELS_SETUP } },
    { task_ref: 'TSK_PROTECT_FLOOR_SPOT_INSTALL',         applies_when: { floor_mask_level: FLOOR_SPOT_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_PARTIAL_INSTALL',      applies_when: { floor_mask_level: FLOOR_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_FULL_INSTALL',         applies_when: { floor_mask_level: FLOOR_FULL_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL',  applies_when: { floor_mask_level: FLOOR_ENCAP_LEVELS } },
    // Wall
    { task_ref: 'TSK_PROTECT_WALL_EDGE_INSTALL',          applies_when: { wall_mask_level: WALL_EDGE_LEVELS_SETUP } },
    { task_ref: 'TSK_PROTECT_WALL_PARTIAL_INSTALL',       applies_when: { wall_mask_level: WALL_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_WALL_FULL_INSTALL',          applies_when: { wall_mask_level: WALL_FULL_LEVELS } },
    { task_ref: 'TSK_PROTECT_WALL_ENCAPSULATE_INSTALL',   applies_when: { wall_mask_level: WALL_ENCAP_LEVELS } },
    // Ceiling — no full, but spot exists
    { task_ref: 'TSK_PROTECT_CEILING_EDGE_INSTALL',       applies_when: { ceiling_mask_level: CEILING_EDGE_LEVELS_SETUP } },
    { task_ref: 'TSK_PROTECT_CEILING_SPOT_INSTALL',       applies_when: { ceiling_mask_level: CEILING_SPOT_LEVELS } },
    { task_ref: 'TSK_PROTECT_CEILING_PARTIAL_INSTALL',    applies_when: { ceiling_mask_level: CEILING_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_CEILING_ENCAPSULATE_INSTALL',applies_when: { ceiling_mask_level: CEILING_ENCAP_LEVELS } },
    // Adjacent masks — fire when their PS key has a value (no applies_when needed
    // beyond that; quantity-lookups emits 0 for unmasked items so task skips).
    ...adjacentMaskTasks.map(([base]) => ({ task_ref: `TSK_MASK_${base}_INSTALL` })),
    // Containment
    { task_ref: 'TSK_CONTAINMENT_SETUP',       applies_when: { containment_mode: [true] } },
    { task_ref: 'TSK_CONTAINMENT_DOOR_ZIPPER', applies_when: { containment_door_zipper: [true] } },
  ],
  modifier_eligibility: { qt: false, height: true, texture: false, complexity: true, condition: false },
  doctrine: 'Room-level protection setup. Fires once per protection scenario activation. Surface tasks gate on per-surface mask_level (9-value enum). Edge+ compounds (edge_partial/edge_full/edge_encapsulate) fire BOTH the edge install task AND the secondary level install task. Adjacent mask tasks gate on PS key emission (zero quantity = skip). Containment tasks gate on containment_mode flag. Height modifier applies to wall/ceiling tasks per source rates.',
});

// MOD_TAPELINE_INSTALL — finish phase, fires AFTER trim cures, BEFORE wall paint
writeJSON(path.join(MODULES_DIR, 'MOD_TAPELINE_INSTALL.json'), {
  module_id: 'MOD_TAPELINE_INSTALL',
  name: 'Trim Tape Line Install',
  phase: 'finish',
  intent: 'Install crisp tape line along painted trim edges before adjacent wall paint goes on. Optional — gated on tapeline_edge flag.',
  tasks: [
    { task_ref: 'TSK_TRIM_TAPELINE_INSTALL', applies_when: { tapeline_edge: [true] } },
  ],
  modifier_eligibility: { qt: false, height: false, texture: false, complexity: false, condition: false },
  doctrine: 'Tape line is independent of masking. Creates a finished crisp edge between trim and wall after trim has cured. Gated by project- or substrate-level tapeline_edge toggle.',
});

// MOD_TAPELINE_REMOVE — finish phase, fires after wall paint dries
writeJSON(path.join(MODULES_DIR, 'MOD_TAPELINE_REMOVE.json'), {
  module_id: 'MOD_TAPELINE_REMOVE',
  name: 'Trim Tape Line Remove',
  phase: 'finish',
  intent: 'Pull tape line after adjacent wall paint dries.',
  tasks: [
    { task_ref: 'TSK_TRIM_TAPELINE_REMOVE', applies_when: { tapeline_edge: [true] } },
  ],
  modifier_eligibility: { qt: false, height: false, texture: false, complexity: false, condition: false },
  doctrine: 'Tape line removal — pull after wall paint dries. Same gate as install.',
});

// MOD_PROTECT_TEARDOWN — cleanup phase, fires at end of room work
writeJSON(path.join(MODULES_DIR, 'MOD_PROTECT_TEARDOWN.json'), {
  module_id: 'MOD_PROTECT_TEARDOWN',
  name: 'Room Protection Teardown',
  phase: 'cleanup',
  intent: 'Remove all room-level protection + containment + debris cleanup. Edge+ compound teardown is ONE motion — only the secondary level\u2019s remove task fires (edge tape pull rolls into its rate). Standalone level=edge still fires edge remove.',
  tasks: [
    // Floor — edge teardown fires only for level='edge'; Edge+ compound teardown is one motion (rolled into secondary remove)
    { task_ref: 'TSK_PROTECT_FLOOR_EDGE_REMOVE',         applies_when: { floor_mask_level: FLOOR_EDGE_LEVELS_TEARDOWN } },
    { task_ref: 'TSK_PROTECT_FLOOR_SPOT_REMOVE',         applies_when: { floor_mask_level: FLOOR_SPOT_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_PARTIAL_REMOVE',      applies_when: { floor_mask_level: FLOOR_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_FULL_REMOVE',         applies_when: { floor_mask_level: FLOOR_FULL_LEVELS } },
    { task_ref: 'TSK_PROTECT_FLOOR_ENCAPSULATE_REMOVE',  applies_when: { floor_mask_level: FLOOR_ENCAP_LEVELS } },
    // Wall
    { task_ref: 'TSK_PROTECT_WALL_EDGE_REMOVE',          applies_when: { wall_mask_level: WALL_EDGE_LEVELS_TEARDOWN } },
    { task_ref: 'TSK_PROTECT_WALL_PARTIAL_REMOVE',       applies_when: { wall_mask_level: WALL_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_WALL_FULL_REMOVE',          applies_when: { wall_mask_level: WALL_FULL_LEVELS } },
    { task_ref: 'TSK_PROTECT_WALL_ENCAPSULATE_REMOVE',   applies_when: { wall_mask_level: WALL_ENCAP_LEVELS } },
    // Ceiling — no full, but spot exists
    { task_ref: 'TSK_PROTECT_CEILING_EDGE_REMOVE',       applies_when: { ceiling_mask_level: CEILING_EDGE_LEVELS_TEARDOWN } },
    { task_ref: 'TSK_PROTECT_CEILING_SPOT_REMOVE',       applies_when: { ceiling_mask_level: CEILING_SPOT_LEVELS } },
    { task_ref: 'TSK_PROTECT_CEILING_PARTIAL_REMOVE',    applies_when: { ceiling_mask_level: CEILING_PARTIAL_LEVELS } },
    { task_ref: 'TSK_PROTECT_CEILING_ENCAPSULATE_REMOVE',applies_when: { ceiling_mask_level: CEILING_ENCAP_LEVELS } },
    // Adjacent mask removes
    ...adjacentMaskTasks.map(([base]) => ({ task_ref: `TSK_MASK_${base}_REMOVE` })),
    // Containment teardown
    { task_ref: 'TSK_CONTAINMENT_TEARDOWN', applies_when: { containment_mode: [true] } },
    // Debris cleanup
    { task_ref: 'TSK_PROTECT_DEBRIS_CLEANUP' },
  ],
  modifier_eligibility: { qt: false, height: true, texture: false, complexity: true, condition: false },
  doctrine: 'Room-level protection teardown. Edge+ compound teardown is one combined motion (rip everything up together) — only the secondary level\u2019s remove task fires; edge tape pull is included in the secondary remove rate. Standalone edge level still fires its own remove. Debris cleanup always fires post-teardown.',
});

console.log(`Wrote ${taskCount} tasks, 4 modules.`);
console.log(`  - ${surfaceTasks.length} surface protection tasks (4 floor + 4 wall + 4 wall + 6 ceiling install/remove)`);
console.log(`  - ${adjacentMaskTasks.length * 2} adjacent-surface mask tasks (${adjacentMaskTasks.length} items × install/remove)`);
console.log(`  - ${utilityTasks.length} utility tasks (tapeline, containment, cleanup)`);
console.log(`Modules: MOD_PROTECT_SETUP, MOD_TAPELINE_INSTALL, MOD_TAPELINE_REMOVE, MOD_PROTECT_TEARDOWN`);
