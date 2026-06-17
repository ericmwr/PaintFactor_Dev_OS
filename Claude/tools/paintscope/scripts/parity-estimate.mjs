// parity-estimate.mjs — headless full estimate via the production orchestrator.
// Calls src/engine/scenario-estimate.js computeScenarioEstimate against the
// canonical bundle (no IDB overlays), for before/after parity checks.
// Usage: npx vite-node scripts/parity-estimate.mjs -- <state.json> [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
import { computeScenarioEstimate } from '../src/engine/scenario-estimate.js';
import canonicalBundle from '../src/data/scenario-bundle.gen.js';

const statePath = process.argv[2];
const outPath = process.argv[3];
if (!statePath) { console.error('Usage: node scripts/parity-estimate.mjs <state.json> [out.json]'); process.exit(1); }

const state = JSON.parse(readFileSync(statePath, 'utf8'));
const r = computeScenarioEstimate(state, canonicalBundle, null, []);

const perSpec = (r.specResults || [])
  .map(sr => ({ specId: sr.specId, domain: sr.domain, totalHours: sr.totalHours }))
  .sort((a, b) => (a.specId + a.domain).localeCompare(b.specId + b.domain));
const out = {
  grandTotalHours: r.totalHours,
  activatedSpecs: r.activatedSpecs,
  gapCount: (r.gaps || []).length,
  warningCount: (r.warnings || []).length,
  perSpec,
};
const json = JSON.stringify(out, null, 2);
if (outPath) writeFileSync(outPath, json);
console.log(`grandTotalHours=${r.totalHours}  activatedSpecs=${r.activatedSpecs}  gaps=${(r.gaps||[]).length}  warnings=${(r.warnings||[]).length}`);
console.log(json);
