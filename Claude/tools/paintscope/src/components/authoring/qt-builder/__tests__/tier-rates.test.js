import { describe, it, expect } from 'vitest';
import { mergeTaskDrafts, rateEditable, effectiveTierRates, setTierRate } from '../tier-rates.js';

// FAC_QT fallback factors: QT2 0.80, QT3 1.00, QT4 1.30, QT5 1.50.
const bundle = { modifiers: {} };
const flat = () => ({ task_id: 'TSK_A', name: 'A', uom: 'SF', rate_per_hour: 600 });

describe('mergeTaskDrafts', () => {
  it('overlays active drafts by id, skips published', () => {
    const canon = { TSK_A: { task_id: 'TSK_A', rate_per_hour: 600 } };
    const drafts = [
      { id: 'TSK_A', status: 'draft', payload: { task_id: 'TSK_A', rate_per_hour: 600, rates_by_tier: { QT3: 600 } } },
      { id: 'TSK_B', status: 'published', payload: { task_id: 'TSK_B' } },
    ];
    const out = mergeTaskDrafts(canon, drafts);
    expect(out.TSK_A.rates_by_tier).toEqual({ QT3: 600 });
    expect(out.TSK_B).toBeUndefined();
  });
});

describe('rateEditable', () => {
  it('editable for scalar rate_per_hour', () => { expect(rateEditable(flat()).editable).toBe(true); });
  it('editable for existing rates_by_tier', () => { expect(rateEditable({ rates_by_tier: { QT4: 600 } }).editable).toBe(true); });
  it('not editable for rates[] / rates_by_coat / fixed_minutes', () => {
    expect(rateEditable({ rates: [{ rate_per_hour: 1 }] }).editable).toBe(false);
    expect(rateEditable({ rates_by_coat: { 1: 1 } }).editable).toBe(false);
    expect(rateEditable({ fixed_minutes: 30 }).editable).toBe(false);
  });
});

describe('effectiveTierRates', () => {
  it('seeds each firing tier with baseRate / FAC_QT[tier]', () => {
    const r = effectiveTierRates(flat(), ['QT3', 'QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT3: 600, QT4: 462, QT5: 400 }); // 600/1, 600/1.3≈462, 600/1.5=400
  });
  it('prefers an existing rates_by_tier entry over the seed', () => {
    const t = { rate_per_hour: 600, rates_by_tier: { QT5: 420 } };
    const r = effectiveTierRates(t, ['QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT4: 462, QT5: 420 });
  });
  it('carries the nearest authored tier forward when no base exists (missing-tier fallback)', () => {
    const t = { rates_by_tier: { QT4: 600 } };
    const r = effectiveTierRates(t, ['QT4', 'QT5'], bundle);
    expect(r.byTier).toEqual({ QT4: 600, QT5: 600 });
  });
});

describe('setTierRate', () => {
  it('writes a full firing map and disables FAC_QT for the task', () => {
    const out = setTierRate(flat(), 'QT5', 380, ['QT3', 'QT4', 'QT5'], bundle);
    expect(out.rates_by_tier).toEqual({ QT3: 600, QT4: 462, QT5: 380 });
    expect(out.modifier_eligibility).toEqual({ qt: false });
  });
  it('preserves other eligibility keys (shallow merge)', () => {
    const t = { ...flat(), modifier_eligibility: { height: true, texture: true } };
    const out = setTierRate(t, 'QT4', 500, ['QT3', 'QT4'], bundle);
    expect(out.modifier_eligibility).toEqual({ height: true, texture: true, qt: false });
  });
  it('does not mutate the input and no-ops on bad value', () => {
    const t = flat();
    expect(setTierRate(t, 'QT3', 0, ['QT3'], bundle)).toBe(t);
    setTierRate(t, 'QT3', 500, ['QT3'], bundle);
    expect(t.rates_by_tier).toBeUndefined();
  });
});
