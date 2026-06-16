import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { computeScenarioEstimate } from './scenario-estimate.js';
import { DB_BUNDLE } from '../data/db-bundle.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';

function load(rel) {
  return JSON.parse(readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8'));
}
const interior = load('./__fixtures__/p2a-int.json');
const exterior = load('./__fixtures__/p2a-ext.json');

describe('computeScenarioEstimate', () => {
  it('produces an interior estimate with positive hours and no exterior protection', () => {
    const r = computeScenarioEstimate(interior, DB_BUNDLE, canonicalBundle, null, []);
    expect(r.totalHours).toBeGreaterThan(0);
    expect(r.specResults.length).toBeGreaterThan(0);
    expect(Object.keys(r.exteriorProtection.elevationProtection)).toHaveLength(0);
    expect(Object.keys(r.exteriorProtection.standaloneProtection)).toHaveLength(0);
  });

  it('runs an exterior project end-to-end and surfaces exterior specs (P2a regression guard)', () => {
    const r = computeScenarioEstimate(exterior, DB_BUNDLE, canonicalBundle, null, []);
    // With current coverage, exterior protection/materials are EMPTY (only the
    // deck scenario exists). So assert the exterior path RUNS, surfaces >=1
    // exterior spec, and that exteriorProtection is the correctly-shaped object.
    expect(r.specResults.some(sr => sr.domain === 'exterior')).toBe(true);
    expect(r.exteriorProtection).toHaveProperty('elevationProtection');
    expect(r.exteriorProtection).toHaveProperty('standaloneProtection');
    expect(r.materialEstimates).toBeInstanceOf(Array);
  });

  it('wires the exterior post-processors into scenario-estimate.js (guards the empty-exterior regression)', () => {
    const src = readFileSync(fileURLToPath(new URL('./scenario-estimate.js', import.meta.url)), 'utf8');
    expect(src).toMatch(/resolveExteriorProtection\(/);
    expect(src).toMatch(/computeExteriorMaterialEstimates\(/);
  });
});
