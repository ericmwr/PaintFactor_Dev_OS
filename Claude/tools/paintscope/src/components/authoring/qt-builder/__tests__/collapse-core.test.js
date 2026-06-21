import { describe, it, expect } from 'vitest';
import { familyKey, qtKind, groupByFamily, proposeKeeper, stripQualityTier } from '../../../../../../../scripts/lib/collapse-core.mjs';

const scn = (id, qt, extra = {}) => ({
  scenario_id: id,
  matches: { paintable_item: 'x', application_method: 'brush', substrate_state: ['SS_BARE'], coating_type: 'paint', ...(qt === undefined ? {} : { quality_tier: qt }), ...extra },
  modules: extra.modules || ['MOD_A'],
});

describe('qtKind', () => {
  it('classifies omitted / scalar / array', () => {
    expect(qtKind(scn('a'))).toBe('baseline');
    expect(qtKind(scn('a', 'QT3'))).toBe('scalar');
    expect(qtKind(scn('a', ['QT3', 'QT4', 'QT5']))).toBe('array');
    expect(qtKind(scn('a', ['QT3']))).toBe('scalar'); // single-element array = scalar-equivalent
  });
});

describe('familyKey', () => {
  it('ignores quality_tier and normalizes arrays', () => {
    expect(familyKey(scn('a', 'QT3'))).toBe(familyKey(scn('b', 'QT5')));
    expect(familyKey(scn('a', ['QT3', 'QT4']))).toBe(familyKey(scn('b')));
  });
});

describe('proposeKeeper', () => {
  it('prefers the QT3 scalar, archives the rest', () => {
    const fam = [scn('S_QT4', 'QT4'), scn('S_QT3', 'QT3'), scn('S_QT5', 'QT5')];
    const r = proposeKeeper(fam);
    expect(r.keeper.scenario_id).toBe('S_QT3');
    expect(r.archive.map(s => s.scenario_id).sort()).toEqual(['S_QT4', 'S_QT5']);
    expect(r.noQt3).toBe(false);
  });
  it('falls back to an array that includes QT3', () => {
    const r = proposeKeeper([scn('S_ARR', ['QT3', 'QT4', 'QT5'])]);
    expect(r.keeper.scenario_id).toBe('S_ARR');
    expect(r.noQt3).toBe(false);
  });
  it('prefers scalar QT3 over an array that also includes QT3', () => {
    const r = proposeKeeper([scn('S_ARR', ['QT3', 'QT4', 'QT5']), scn('S_QT3', 'QT3')]);
    expect(r.keeper.scenario_id).toBe('S_QT3');
  });
  it('uses an existing baseline when no QT3 matcher exists', () => {
    const r = proposeKeeper([scn('S_BASE'), scn('S_QT4', 'QT4')]);
    expect(r.keeper.scenario_id).toBe('S_BASE');
    expect(r.noQt3).toBe(false);
  });
  it('flags noQt3 and promotes the lowest tier when no QT3 anywhere', () => {
    const r = proposeKeeper([scn('S_QT4', 'QT4'), scn('S_QT5', 'QT5')]);
    expect(r.keeper.scenario_id).toBe('S_QT4');
    expect(r.noQt3).toBe(true);
  });
});

describe('stripQualityTier', () => {
  it('removes quality_tier without mutating input or other matches', () => {
    const s = scn('a', 'QT3');
    const out = stripQualityTier(s);
    expect('quality_tier' in out.matches).toBe(false);
    expect(out.matches.paintable_item).toBe('x');
    expect(s.matches.quality_tier).toBe('QT3'); // input untouched
  });
});
