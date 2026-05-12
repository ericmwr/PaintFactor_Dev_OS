#!/usr/bin/env node
// Inject MOD_INTERSTAGE_FLOOR_PROTECT_CHECK into every interior painting/staining
// scenario's modules list (positioned just before CLEANUP if present, else
// appended). The module gates internally on floor_mask_level so it auto-disables
// for scenarios without floor protection — no per-scenario opt-out needed.
//
// Scope: all SCN_*.json EXCEPT:
//   - SCN_EXT_* (exterior, different protection model)
//   - SCN_ROOM_PROTECTION_NC (the protection scenario itself — installs the
//     floor protection, doesn't need mid-stream repair on itself)

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const SCN_DIR = path.join(ROOT, "Claude", "scenarios");
const MODULE_ID = "MOD_INTERSTAGE_FLOOR_PROTECT_CHECK";

const SKIP_FILES = new Set(["SCN_ROOM_PROTECTION_NC.json"]);

function shouldProcess(filename) {
  if (!filename.startsWith("SCN_")) return false;
  if (!filename.endsWith(".json")) return false;
  if (filename.startsWith("SCN_EXT_")) return false;
  if (SKIP_FILES.has(filename)) return false;
  return true;
}

function findInsertionIndex(modules) {
  // Insert just before the first CLEANUP module. If none, append.
  for (let i = 0; i < modules.length; i++) {
    if (typeof modules[i] === "string" && modules[i].startsWith("MOD_CLEANUP")) return i;
  }
  return modules.length;
}

let processed = 0;
let alreadyHad = 0;
let injected = 0;
for (const f of fs.readdirSync(SCN_DIR).sort()) {
  if (!shouldProcess(f)) continue;
  processed++;
  const p = path.join(SCN_DIR, f);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  if (!Array.isArray(j.modules)) continue;
  if (j.modules.includes(MODULE_ID)) {
    alreadyHad++;
    continue;
  }
  const idx = findInsertionIndex(j.modules);
  j.modules.splice(idx, 0, MODULE_ID);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
  injected++;
}

console.log(`Processed: ${processed} interior scenarios`);
console.log(`Already had module: ${alreadyHad}`);
console.log(`Injected: ${injected}`);
