import { describe, it, expect } from 'vitest';
import { tierId, scenarioTierPin, forkScenarioForTier } from '../tier-files.js';

describe('tierId', () => {
  it('appends _QT<n> to a baseline id', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_APPLY_ARCH_ELEMENT_FINISH', 'QT4')).toBe('MOD_APPLY_ARCH_ELEMENT_FINISH_QT4');
  });
  it('replaces an existing _QT token (mid-id or suffix), idempotent for same tier', () => {
    expect(tierId('SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE', 'QT4')).toBe('SCN_ARCH_ELEMENT_NC_BRUSH_FROM_BARE_QT4');
    expect(tierId('MOD_X_QT4', 'QT4')).toBe('MOD_X_QT4');
    expect(tierId('MOD_X_QT4', 'QT5')).toBe('MOD_X_QT5');
  });
});

describe('scenarioTierPin', () => {
  it('returns null for a baseline (no quality_tier)', () => {
    expect(scenarioTierPin({ matches: { paintable_item: 'x' } })).toBeNull();
    expect(scenarioTierPin({})).toBeNull();
  });
  it('returns the single pinned tier (string or 1-element array)', () => {
    expect(scenarioTierPin({ matches: { quality_tier: 'QT4' } })).toBe('QT4');
    expect(scenarioTierPin({ matches: { quality_tier: ['QT4'] } })).toBe('QT4');
  });
  it('returns null for a multi-tier match', () => {
    expect(scenarioTierPin({ matches: { quality_tier: ['QT3', 'QT4'] } })).toBeNull();
  });
});

describe('forkScenarioForTier', () => {
  it('clones a baseline into a tier-pinned fork without mutating the baseline', () => {
    const base = { scenario_id: 'SCN_B', name: 'B', matches: { paintable_item: 'x' }, modules: ['A', 'B'] };
    const { scenario, created } = forkScenarioForTier(base, 'QT4');
    expect(created).toBe(true);
    expect(scenario.scenario_id).toBe('SCN_B_QT4');
    expect(scenario.matches).toEqual({ paintable_item: 'x', quality_tier: 'QT4' });
    expect(scenario.modules).toEqual(['A', 'B']);
    expect(scenario.modules).not.toBe(base.modules);      // cloned array
    expect(base.matches.quality_tier).toBeUndefined();    // baseline untouched
  });
  it('is a no-op (same ref, created false) when already pinned to that tier', () => {
    const s = { scenario_id: 'SCN_B_QT4', matches: { quality_tier: 'QT4' }, modules: [] };
    const r = forkScenarioForTier(s, 'QT4');
    expect(r.created).toBe(false);
    expect(r.scenario).toBe(s);
  });
});
