#!/usr/bin/env node
// One-shot rename of door auxiliary task display names to match the
// trim/universal keeper convention `[Description] (UOM)`. Per user direction
// 2026-05-12: "use consistent display text for the tasks — different UOM but
// same task type should display consistently."
//
// Only the `name` field changes. Task IDs stay the same so module task_refs
// don't need updating. Apply-side coating keepers (TSK_DOOR_BRUSH / SPRAY)
// are NOT renamed — those are coating-neutral by design and pick up their
// material via displayTaskName suffix. Hardware tasks are NOT renamed —
// they're door-specific with no trim analog.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TASKS_DIR = path.join(ROOT, 'tasks');

const RENAMES = {
  TSK_DOOR_SAND_PREP:        'Sand Bare (EA_SIDE)',
  TSK_DOOR_FILL_FASTENERS:   'Fill Fasteners (EA_SIDE)',
  TSK_DOOR_SAND_FILL:        'Sand Fill (EA_SIDE)',
  TSK_DOOR_CLEAN_DUST:       'Dust Wipe (EA_SIDE)',
  TSK_DOOR_INSPECT:          'Inspect Side (EA_SIDE)',
  TSK_DOOR_INSPECT_COAT:     'Inspect Coating (EA_SIDE)',
  TSK_DOOR_LIGHT_SAND:       'Between Coat Sand (EA_SIDE)',
  TSK_DOOR_PATCH_REPAIR:     'Wood Putty / Fill Defects (EA_SIDE)',
  TSK_DOOR_CLEAN_INTERSTAGE: 'Clean Interstage Dust (EA_SIDE)',
  TSK_DOOR_FINAL_INSPECT:    'Final Inspect (EA_SIDE)',
  TSK_DOOR_TOUCHUP:          'Final Touchup (EA_SIDE)',
};

async function main() {
  for (const [taskId, newName] of Object.entries(RENAMES)) {
    const filePath = path.join(TASKS_DIR, `${taskId}.json`);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      const obj = JSON.parse(raw);
      const oldName = obj.name;
      if (oldName === newName) {
        console.log(`  = ${taskId} — already ${JSON.stringify(newName)}`);
        continue;
      }
      obj.name = newName;
      await fs.writeFile(filePath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
      console.log(`  ✓ ${taskId}: ${JSON.stringify(oldName)} → ${JSON.stringify(newName)}`);
    } catch (e) {
      console.log(`  ! ${taskId} — ${e.message}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
