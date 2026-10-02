import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeScenarioEstimate } from './scenario-estimate.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

function load(rel) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
}
const interior = load('./__fixtures__/p2a-int.json');
// Exterior end-to-end guard + p2a-ext.json retired with the exterior-v0 data
// archive (2026-10-02, greenfield rebuild). Re-add once new exterior data lands.

describe('computeScenarioEstimate', () => {
  it('produces an interior estimate with positive hours and no exterior protection', () => {
    const r = computeScenarioEstimate(interior, canonicalBundle, null, []);
    expect(r.totalHours).toBeGreaterThan(0);
    expect(r.specResults.length).toBeGreaterThan(0);
    expect(Object.keys(r.exteriorProtection.elevationProtection)).toHaveLength(0);
    expect(Object.keys(r.exteriorProtection.standaloneProtection)).toHaveLength(0);
  });

  it('wires the exterior post-processors into scenario-estimate.js (guards the empty-exterior regression)', () => {
    const src = readFileSync(fileURLToPath(new URL('./scenario-estimate.js', import.meta.url)), 'utf8');
    expect(src).toMatch(/resolveExteriorProtection\(/);
    expect(src).toMatch(/computeExteriorMaterialEstimates\(/);
  });
});
