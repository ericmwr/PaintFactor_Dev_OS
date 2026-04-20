#!/usr/bin/env node
// Migrate tasks with rates[]/surface_texture variants to a single
// rate_per_hour baseline + texture: true eligibility. FAC_TEXTURE then does
// the smooth/textured multiplication automatically.
//
// Baseline = the smooth coat 1 rate. If smooth has a coat-differentiated rate,
// encode coat_2_rate_multiplier = smooth_coat2 / smooth_coat1.
//
// Doctrine text stripped of the hardcoded rate values since FAC_TEXTURE owns
// the split now — left a short pointer so authors know where to tune.

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODULES_DIR = join(__dirname, '..', 'modules');

const TARGETS = [
  'MOD_APPLY_CEILING_FINISH_ROLL',
  'MOD_APPLY_CEIL_PRIME_ROLL',
  'MOD_APPLY_WALL_PRIME_ROLL',
  'MOD_APPLY_WALL_PRIME_SPRAY_BACKROLL',
  'MOD_APPLY_WALL_ROLL',
];

for (const modId of TARGETS) {
  const path = join(MODULES_DIR, `${modId}.json`);
  const mod = JSON.parse(readFileSync(path, 'utf-8'));

  let touchedTask = false;
  for (const t of mod.tasks) {
    if (!Array.isArray(t.rates)) continue;
    // Only migrate texture-variant tasks (leave QT/method variants for another pass)
    const dims = new Set();
    for (const v of t.rates) {
      if (v.applies_when) Object.keys(v.applies_when).forEach(k => dims.add(k));
    }
    if (!dims.has('surface_texture')) continue;

    // Find smooth rates — default to first smooth variant we see
    const smoothVariants = t.rates.filter(v => {
      const aw = v.applies_when || {};
      return !aw.surface_texture || aw.surface_texture.includes('smooth');
    });
    if (smoothVariants.length === 0) {
      console.log(`  ⚠ ${modId}/${t.task_id}: no smooth variant, skipping`);
      continue;
    }

    // Coat splits?
    const coatSplit = smoothVariants.some(v => v.applies_when && v.applies_when.coat);
    let baseline, coat2Mult = null;
    if (coatSplit) {
      const c1 = smoothVariants.find(v => v.applies_when.coat && v.applies_when.coat.includes(1));
      const c2 = smoothVariants.find(v => v.applies_when.coat && v.applies_when.coat.includes(2));
      baseline = c1 ? c1.rate_per_hour : smoothVariants[0].rate_per_hour;
      if (c2 && c2.rate_per_hour !== baseline) {
        coat2Mult = +(c2.rate_per_hour / baseline).toFixed(3);
      }
    } else {
      baseline = smoothVariants[0].rate_per_hour;
    }

    // Apply changes
    delete t.rates;
    t.rate_per_hour = baseline;
    if (coat2Mult != null) t.coat_2_rate_multiplier = coat2Mult;

    console.log(`  ${modId}/${t.task_id}: rate_per_hour=${baseline}${coat2Mult != null ? ', coat_2_rate_multiplier=' + coat2Mult : ''}`);
    touchedTask = true;
  }

  // Flip texture eligibility true if any task in the module was migrated
  if (touchedTask && mod.modifier_eligibility) {
    mod.modifier_eligibility.texture = true;
    console.log(`    eligibility.texture → true`);
  }

  if (touchedTask) {
    writeFileSync(path, JSON.stringify(mod, null, 2) + '\n', 'utf-8');
  }
}
console.log('\nDone. Doctrine text may need manual cleanup — the hardcoded rate pairs are no longer accurate.');
