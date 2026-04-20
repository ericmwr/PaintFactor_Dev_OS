#!/usr/bin/env node
// Phase A height-eligibility cleanup (2026-04-18): remove modifier_eligibility.height
// from interior "trim package" modules (trim, door frames, windows, wainscot).
// These live physically at ground-to-7-ft regardless of room ceiling, so the
// room-level height band shouldn't scale their rates.
//
// Walls / ceilings / cut-in-to-ceiling / arch elements / stair railings keep
// height eligibility (top of wall IS at ceiling height, arch elements are
// overhead by definition, stairs have real access concerns).
//
// Phase B follow-up: add a per-window "second story" flag for gabled/vaulted
// rooms where specific windows need the height penalty back.
//
// Idempotent.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'modules');

const TARGETS = [
  // Trim (10)
  'MOD_APPLY_TRIM_FINISH_BRUSH', 'MOD_APPLY_TRIM_FINISH_SPRAY',
  'MOD_APPLY_TRIM_PRIME_BRUSH', 'MOD_APPLY_TRIM_PRIME_SPRAY',
  'MOD_APPLY_CUTIN_TRIM',
  'MOD_PREP_TRIM_INITIAL', 'MOD_PREP_TRIM_PAINT',
  'MOD_INTERSTAGE_TRIM',
  'MOD_PROTECT_TRIM_MASKING',
  'MOD_SETUP_TRIM_WALL_MASK',
  // Interior door frames (4)
  'MOD_APPLY_DOOR_FRAME_FINISH_BRUSH', 'MOD_APPLY_DOOR_FRAME_FINISH_SPRAY',
  'MOD_PREP_DOOR_FRAME_PAINT',
  'MOD_INTERSTAGE_DOOR_FRAME',
  // Interior windows (10)
  'MOD_APPLY_WINDOW_FINISH', 'MOD_PREP_WINDOW', 'MOD_WINDOW_PRIME',
  'MOD_SETUP_WINDOW', 'MOD_INTERSTAGE_WINDOW',
  'MOD_APPLY_WNRP_FINISH_RP', 'MOD_APPLY_WNRP_FINISH_RP_COAT2',
  'MOD_INTERSTAGE_WNRP_RP', 'MOD_PREP_WNRP_RP', 'MOD_PRIME_WNRP_RP',
  // Wainscot (4)
  'MOD_APPLY_WAINSCOT_FINISH', 'MOD_APPLY_WAINSCOT_PRIME',
  'MOD_PREP_WAINSCOT', 'MOD_INTERSTAGE_WAINSCOT',
];

let changed = 0;
let missing = [];
for (const id of TARGETS) {
  const path = join(MODULES_DIR, `${id}.json`);
  let text;
  try { text = readFileSync(path, 'utf-8'); }
  catch { missing.push(id); continue; }
  const mod = JSON.parse(text);
  if (!mod.modifier_eligibility || mod.modifier_eligibility.height !== true) {
    console.log(`  ${id}: already non-eligible (skip)`);
    continue;
  }
  mod.modifier_eligibility.height = false;
  writeFileSync(path, JSON.stringify(mod, null, 2) + '\n', 'utf-8');
  console.log(`  ${id}: height → false`);
  changed++;
}

console.log(`\nStripped height eligibility from ${changed} modules.`);
if (missing.length) {
  console.log(`\n⚠ ${missing.length} target module(s) not found in ${MODULES_DIR}:`);
  missing.forEach(m => console.log(`  - ${m}`));
}
