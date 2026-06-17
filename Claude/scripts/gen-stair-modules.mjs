#!/usr/bin/env node
// One-shot generator for per-component stair modules.
// Writes: 3 shared stain modules + 21 paint apply modules + 18 stain apply modules = 42 new modules.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modulesDir = path.resolve(__dirname, '..', 'modules');

// Per-component rates (baseline at QT3, brush). Calibrated from existing MOD_APPLY_STAIR_*.
const PAINT_RATES = {
  stringer:   { ps: 'PS_SURFACE_LF.STAIR_STRINGER',  uom: 'LF', prime_brush: 60,  prime_spray: 180, finish_brush: 50,  finish_spray: 150 },
  riser:      { ps: 'PS_SURFACE_EA.STAIR_RISER',     uom: 'EA', prime_brush: 40,  prime_spray: 120, finish_brush: 35,  finish_spray: 100 },
  skirtboard: { ps: 'PS_SURFACE_LF.STAIR_SKIRTBOARD',uom: 'LF', prime_brush: 55,  prime_spray: 165, finish_brush: 45,  finish_spray: 135 },
  baluster:   { ps: 'PS_SURFACE_EA.STAIR_BALUSTER',  uom: 'EA', prime_brush: 10,  prime_spray: 30,  finish_brush: 8,   finish_spray: 24 },
  newel:      { ps: 'PS_SURFACE_EA.STAIR_NEWEL',     uom: 'EA', prime_brush: 4,   prime_spray: 12,  finish_brush: 3,   finish_spray: 9 },
  open_rail:  { ps: 'PS_SURFACE_LF.STAIR_OPEN_RAIL', uom: 'LF', prime_brush: 50,  prime_spray: 150, finish_brush: 40,  finish_spray: 120 },
  wall_rail:  { ps: 'PS_SURFACE_LF.STAIR_WALL_RAIL', uom: 'LF', prime_brush: 55,  prime_spray: 165, finish_brush: 45,  finish_spray: 135 },
};

const STAIN_RATES = {
  tread:      { ps: 'PS_SURFACE_EA.STAIR_TREAD',     uom: 'EA', stain_brush: 15, stain_wipe: 12, clear_brush: 12, clear_wipe: 18 },
  riser:      { ps: 'PS_SURFACE_EA.STAIR_RISER',     uom: 'EA', stain_brush: 35, stain_wipe: 28, clear_brush: 30, clear_wipe: 45 },
  baluster:   { ps: 'PS_SURFACE_EA.STAIR_BALUSTER',  uom: 'EA', stain_brush: 8,  stain_wipe: 6,  clear_brush: 7,  clear_wipe: 10 },
  newel:      { ps: 'PS_SURFACE_EA.STAIR_NEWEL',     uom: 'EA', stain_brush: 3,  stain_wipe: 2.5,clear_brush: 2.5,clear_wipe: 4 },
  open_rail:  { ps: 'PS_SURFACE_LF.STAIR_OPEN_RAIL', uom: 'LF', stain_brush: 40, stain_wipe: 32, clear_brush: 35, clear_wipe: 50 },
  wall_rail:  { ps: 'PS_SURFACE_LF.STAIR_WALL_RAIL', uom: 'LF', stain_brush: 45, stain_wipe: 36, clear_brush: 40, clear_wipe: 55 },
};

function write(moduleId, mod) {
  const filepath = path.join(modulesDir, `${moduleId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(mod, null, 2) + '\n');
}

let count = 0;

// --- 3 shared stain modules (paint shared already exist: SETUP/PREP/CLEANUP_STAIR_RISER + _RAILING) ---
const stainShared = [
  {
    module_id: 'MOD_SETUP_STAIR_STAIN', name: 'Setup Stair Stain', phase: 'setup',
    intent: 'Set up for stair stain work: cover adjacent walls + risers, lay drop cloths.',
    tasks: [{ task_id: 'TSK_STAIR_STAIN_SETUP', name: 'Setup Stair for Stain', ps_key: 'PS_META.EA.ROOMS_TOTAL', uom: 'EA', skill_level: 'general', rate_per_hour: 2 }],
    modifier_eligibility: { qt: false, height: false, texture: false, complexity: true },
    doctrine: 'Fixed setup time per stairway.',
  },
  {
    module_id: 'MOD_PREP_STAIR_STAIN', name: 'Prep Stair Stain', phase: 'prep',
    intent: 'Sand treads/risers/components as required for stain adhesion.',
    tasks: [{ task_id: 'TSK_STAIR_STAIN_PREP', name: 'Sand Stair Components for Stain', ps_key: 'PS_META.EA.ROOMS_TOTAL', uom: 'EA', skill_level: 'experienced', rate_per_hour: 1.2 }],
    modifier_eligibility: { qt: true, height: false, texture: false, complexity: true },
    doctrine: 'Sanding time scales with component count.',
  },
  {
    module_id: 'MOD_CLEANUP_STAIR_STAIN', name: 'Cleanup Stair Stain', phase: 'cleanup',
    intent: 'Remove drop cloths and protection; clean up rags (oily-rag safe disposal for spontaneous combustion risk).',
    tasks: [{ task_id: 'TSK_STAIR_STAIN_CLEANUP', name: 'Cleanup Stair Stain', ps_key: 'PS_META.EA.ROOMS_TOTAL', uom: 'EA', skill_level: 'general', rate_per_hour: 3 }],
    modifier_eligibility: { qt: false, height: false, texture: false, complexity: false },
    doctrine: 'Includes oily-rag safe disposal.',
  },
];
for (const m of stainShared) { write(m.module_id, m); count++; }

// --- 21 paint apply modules (7 components × 3 phases: PRIME, FINISH, INTERSTAGE) ---
for (const [comp, rates] of Object.entries(PAINT_RATES)) {
  const COMP = comp.toUpperCase();
  const compLabel = comp.replace(/_/g, ' ');
  // PRIME module
  write(`MOD_APPLY_${COMP}_PRIME`, {
    module_id: `MOD_APPLY_${COMP}_PRIME`, name: `Prime Stair ${compLabel}`, phase: 'prime',
    intent: `Prime stair ${compLabel}. Fires only when substrate_state is SS_BARE.`,
    tasks: [
      { task_id: `TSK_${COMP}_PRIME_BRUSH`, name: `Brush Prime ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.prime_brush, applies_when: { application_method: ['brush'] } },
      { task_id: `TSK_${COMP}_PRIME_SPRAY`, name: `Spray Prime ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.prime_spray, applies_when: { application_method: ['spray'] } },
    ],
    modifier_eligibility: { qt: true, height: true, texture: false, complexity: true },
    applies_when: { substrate_state: ['SS_BARE'] },
    doctrine: `Primer for ${comp} — fires on bare wood only.`,
  });
  count++;
  // FINISH module
  write(`MOD_APPLY_${COMP}_FINISH`, {
    module_id: `MOD_APPLY_${COMP}_FINISH`, name: `Finish Stair ${compLabel}`, phase: 'apply',
    intent: `Apply finish coat to stair ${compLabel}.`,
    tasks: [
      { task_id: `TSK_${COMP}_FINISH_BRUSH`, name: `Brush Finish ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.finish_brush, applies_when: { application_method: ['brush'] } },
      { task_id: `TSK_${COMP}_FINISH_SPRAY`, name: `Spray Finish ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.finish_spray, applies_when: { application_method: ['spray'] } },
    ],
    modifier_eligibility: { qt: true, height: true, texture: false, complexity: true },
    doctrine: `Finish coat for ${comp}. Called once per coat (scenarios list it N times for N coats).`,
  });
  count++;
  // INTERSTAGE module
  write(`MOD_INTERSTAGE_${COMP}`, {
    module_id: `MOD_INTERSTAGE_${COMP}`, name: `Interstage Stair ${compLabel}`, phase: 'interstage',
    intent: `Cure / light sand / dust between finish coats on stair ${compLabel}.`,
    tasks: [
      { task_id: `TSK_${COMP}_INTERSTAGE`, name: `Interstage ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'general', rate_per_hour: rates.finish_brush * 3 },
    ],
    modifier_eligibility: { qt: false, height: false, texture: false, complexity: false },
    doctrine: `Interstage is ~1/3 of finish brush time (light scuff + dust).`,
  });
  count++;
}

// --- 18 stain apply modules (6 components × 3 phases: STAIN, CLEAR, INTERSTAGE_STAIN) ---
for (const [comp, rates] of Object.entries(STAIN_RATES)) {
  const COMP = comp.toUpperCase();
  const compLabel = comp.replace(/_/g, ' ');
  // STAIN module (brush + wipe tasks)
  write(`MOD_APPLY_${COMP}_STAIN`, {
    module_id: `MOD_APPLY_${COMP}_STAIN`, name: `Stain Stair ${compLabel}`, phase: 'prime',
    intent: `Apply stain to stair ${compLabel}. Fires only on SS_BARE.`,
    tasks: [
      { task_id: `TSK_${COMP}_STAIN_BRUSH`, name: `Brush Stain ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.stain_brush, applies_when: { application_method: ['brush'] } },
      { task_id: `TSK_${COMP}_STAIN_WIPE`,  name: `Wipe Stain ${compLabel}`,  ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.stain_wipe,  applies_when: { application_method: ['wipe'] } },
    ],
    modifier_eligibility: { qt: true, height: true, texture: false, complexity: true },
    applies_when: { substrate_state: ['SS_BARE'] },
    doctrine: `Stain applied by brush or wipe. Brush faster but leaves more lap marks; wipe for hand-rubbed look.`,
  });
  count++;
  // CLEAR module
  write(`MOD_APPLY_${COMP}_CLEAR`, {
    module_id: `MOD_APPLY_${COMP}_CLEAR`, name: `Clear Stair ${compLabel}`, phase: 'apply',
    intent: `Apply clear topcoat to stair ${compLabel}.`,
    tasks: [
      { task_id: `TSK_${COMP}_CLEAR_BRUSH`, name: `Brush Clear ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.clear_brush, applies_when: { application_method: ['brush'] } },
      { task_id: `TSK_${COMP}_CLEAR_WIPE`,  name: `Wipe Clear ${compLabel}`,  ps_key: rates.ps, uom: rates.uom, skill_level: 'experienced', rate_per_hour: rates.clear_wipe,  applies_when: { application_method: ['wipe'] } },
    ],
    modifier_eligibility: { qt: true, height: true, texture: false, complexity: true },
    doctrine: `Clear topcoat — polyurethane or similar. Called once per coat.`,
  });
  count++;
  // INTERSTAGE module for stain (between clear coats)
  write(`MOD_INTERSTAGE_${COMP}_STAIN`, {
    module_id: `MOD_INTERSTAGE_${COMP}_STAIN`, name: `Interstage Stair ${compLabel} Stain`, phase: 'interstage',
    intent: `Cure / light sand between clear coats on stair ${compLabel}.`,
    tasks: [
      { task_id: `TSK_${COMP}_INTERSTAGE_STAIN`, name: `Interstage Stain ${compLabel}`, ps_key: rates.ps, uom: rates.uom, skill_level: 'general', rate_per_hour: rates.clear_brush * 3 },
    ],
    modifier_eligibility: { qt: false, height: false, texture: false, complexity: false },
    doctrine: `Light scuff between clear coats. ~1/3 of clear brush time.`,
  });
  count++;
}

console.log(`Wrote ${count} stair modules to ${modulesDir}`);
