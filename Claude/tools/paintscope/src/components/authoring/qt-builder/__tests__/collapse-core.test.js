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

  it('pure tier-variants (differ only on quality_tier) share a familyKey', () => {
    // Same on every non-quality_tier match key → same family.
    expect(familyKey(scn('a', 'QT2'))).toBe(familyKey(scn('b', 'QT4')));
    expect(familyKey(scn('a', 'QT3'))).toBe(familyKey(scn('b', ['QT4', 'QT5'])));
  });

  it('scenarios differing only on surface get DIFFERENT familyKeys (wall vs ceiling)', () => {
    // Mirrors real SCN_DRYWALL_FINISH vs SCN_CEILING_FINISH: identical on every
    // match key except `surface`. They must NOT be merged.
    const wall = scn('S_WALL', 'QT3', { surface: 'wall' });
    const ceiling = scn('S_CEIL', 'QT3', { surface: 'ceiling' });
    expect(familyKey(wall)).not.toBe(familyKey(ceiling));
    // …and still differ even across tiers (so collapse can't merge them via QT3).
    const wallQt5 = scn('S_WALL5', 'QT5', { surface: 'wall' });
    expect(familyKey(wallQt5)).not.toBe(familyKey(ceiling));
  });

  it('scenarios differing only on protection_level get DIFFERENT familyKeys', () => {
    // Mirrors real SCN_CABINET_PROTECT_FULL vs _HEAVY vs _LIGHT: same
    // paintable_item + coating_type, distinct protection_level, no quality_tier.
    const full = { scenario_id: 'P_FULL', matches: { paintable_item: 'cabinet', coating_type: 'protect', protection_level: 'full' } };
    const heavy = { scenario_id: 'P_HEAVY', matches: { paintable_item: 'cabinet', coating_type: 'protect', protection_level: 'heavy' } };
    const light = { scenario_id: 'P_LIGHT', matches: { paintable_item: 'cabinet', coating_type: 'protect', protection_level: 'light' } };
    expect(familyKey(full)).not.toBe(familyKey(heavy));
    expect(familyKey(full)).not.toBe(familyKey(light));
    expect(familyKey(heavy)).not.toBe(familyKey(light));
  });

  it('considers ALL non-quality_tier match keys, order-independently', () => {
    // Extra discriminating keys beyond the original 4 (surface, sheen,
    // substrate_type, joint_complexity, condition_scale, window_substrate_material)
    // must split families; key insertion order must not matter.
    const a = { scenario_id: 'A', matches: { paintable_item: 'drywall', surface: 'wall', sheen: 'eggshell', application_method: 'roll', quality_tier: 'QT3' } };
    const b = { scenario_id: 'B', matches: { quality_tier: 'QT5', application_method: 'roll', sheen: 'eggshell', surface: 'wall', paintable_item: 'drywall' } };
    expect(familyKey(a)).toBe(familyKey(b)); // identical except quality_tier + order

    const cSatin = { scenario_id: 'C', matches: { paintable_item: 'drywall', surface: 'wall', sheen: 'satin', application_method: 'roll', quality_tier: 'QT3' } };
    expect(familyKey(a)).not.toBe(familyKey(cSatin)); // differ only on sheen
  });

  it('omits absent keys (no spurious nulls) so adding/removing a key changes the family', () => {
    // A scenario that simply lacks `surface` must not share a family with one
    // that constrains surface — absence is a distinct constraint shape.
    const noSurface = { scenario_id: 'N', matches: { paintable_item: 'drywall', application_method: 'roll', quality_tier: 'QT3' } };
    const wall = { scenario_id: 'W', matches: { paintable_item: 'drywall', application_method: 'roll', surface: 'wall', quality_tier: 'QT3' } };
    expect(familyKey(noSurface)).not.toBe(familyKey(wall));
  });
});

describe('groupByFamily with full match keys', () => {
  it('keeps wall/ceiling drywall tier-variants in SEPARATE families', () => {
    const scenarios = [
      scn('SCN_DRYWALL_FINISH_QT3_ROLL', 'QT3', { surface: 'wall' }),
      scn('SCN_DRYWALL_FINISH_QT5_ROLL', 'QT5', { surface: 'wall' }),
      scn('SCN_CEILING_FINISH_QT3_ROLL', 'QT3', { surface: 'ceiling' }),
      scn('SCN_CEILING_FINISH_QT5_ROLL', 'QT5', { surface: 'ceiling' }),
    ];
    const g = groupByFamily(scenarios);
    expect(g.size).toBe(2); // one wall family, one ceiling family — NOT merged into 1
    for (const fam of g.values()) {
      expect(fam.length).toBe(2); // each family is exactly its two tier-variants
    }
  });

  it('keeps each cabinet protection_level in its OWN family (10 distinct)', () => {
    const levels = ['full', 'heavy', 'light', 'standard', 'partial', 'encapsulate', 'edge', 'edge_full', 'edge_partial', 'edge_encapsulate'];
    const scenarios = levels.map(lv => ({
      scenario_id: `SCN_CABINET_PROTECT_${lv.toUpperCase()}`,
      matches: { paintable_item: 'cabinet', coating_type: 'protect', protection_level: lv },
    }));
    const g = groupByFamily(scenarios);
    expect(g.size).toBe(10); // none merged → none archived
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
