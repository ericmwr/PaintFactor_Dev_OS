import { describe, it, expect } from 'vitest';
import { buildRoleBySystemId, classifySystemRole, systemMatches, resolveSpecSystems } from '../material-system-roles.js';

const PRODUCTS = [
  { system_id: 'SYS_PRIMER_BARE', product_role: 'primer' },
  { system_id: 'SYS_FF_QT3', product_role: 'finish' },
  { system_id: 'SYS_FF_QT4', product_role: 'finish' },
];
const ROLE = buildRoleBySystemId(PRODUCTS);

// paint family: one state-keyed primer + two QT-keyed finishes
const paint = () => ([
  { id: 'SYS_PRIMER_BARE', applies_when: { substrate: 'softwood', substrate_state: 'SS_BARE' } },
  { id: 'SYS_FF_QT3', applies_when: { quality_tier: ['QT3'] } },
  { id: 'SYS_FF_QT4', applies_when: { quality_tier: ['QT4'] } },
]);
// QT-keyed primer family (a PRIME spec): all primer role, ordered QT4 then QT3
const qtPrimer = () => ([
  { id: 'SYS_P_QT4', applies_when: { quality_tier: ['QT4'] } },
  { id: 'SYS_P_QT3', applies_when: { quality_tier: ['QT3'] } },
]);
const qtPrimerRole = { SYS_P_QT4: 'primer', SYS_P_QT3: 'primer' };

describe('buildRoleBySystemId', () => {
  it('maps system_id to product_role', () => {
    expect(buildRoleBySystemId(PRODUCTS)).toEqual({ SYS_PRIMER_BARE: 'primer', SYS_FF_QT3: 'finish', SYS_FF_QT4: 'finish' });
  });
});

describe('classifySystemRole', () => {
  it('prefers product_role', () => { expect(classifySystemRole('SYS_FF_QT3', ROLE)).toBe('finish'); });
  it('falls back to id pattern then baseRole', () => {
    expect(classifySystemRole('SYS_FOO_PRIMER_X', {})).toBe('primer');
    expect(classifySystemRole('SYS_X_SEALER', {})).toBe('sealer');
    expect(classifySystemRole('SYS_X_CLEAR', {})).toBe('clear');
    expect(classifySystemRole('SYS_UNKNOWN', {}, 'stain')).toBe('stain');
    expect(classifySystemRole('SYS_UNKNOWN', {})).toBe('finish');
  });
});

describe('systemMatches', () => {
  const ctx = { defaultQT: 'QT3', defaultSheen: 'satin', specStates: ['SS_BARE'] };
  it('passes when declared constraints match', () => {
    expect(systemMatches({ applies_when: { quality_tier: ['QT3'] } }, ctx)).toBe(true);
    expect(systemMatches({ applies_when: { substrate_state: 'SS_BARE' } }, ctx)).toBe(true);
    expect(systemMatches({ applies_when: {} }, ctx)).toBe(true);
  });
  it('fails on a declared mismatch', () => {
    expect(systemMatches({ applies_when: { quality_tier: ['QT5'] } }, ctx)).toBe(false);
    expect(systemMatches({ applies_when: { substrate_state: 'SS_PRIMED' } }, ctx)).toBe(false);
  });
  it('does not disqualify on state when specStates is empty', () => {
    expect(systemMatches({ applies_when: { substrate_state: 'SS_BARE' } }, { defaultQT: 'QT3', defaultSheen: 'satin', specStates: [] })).toBe(true);
  });
});

describe('resolveSpecSystems', () => {
  const base = { roleBySystemId: ROLE, isStain: false, defaultQT: 'QT3', defaultSheen: 'satin', specStates: ['SS_BARE'] };
  it('emits primer (state-matched) + finish (QT-matched), primer first', () => {
    const out = resolveSpecSystems({ ...base, specSystems: paint() });
    expect(out.map(o => [o.role, o.system.id])).toEqual([['primer', 'SYS_PRIMER_BARE'], ['finish', 'SYS_FF_QT3']]);
  });
  it('selects a QT-keyed primer by tier, order-independent (not candidates[0])', () => {
    const out = resolveSpecSystems({ ...base, roleBySystemId: qtPrimerRole, specSystems: qtPrimer() });
    expect(out).toEqual([{ role: 'primer', system: { id: 'SYS_P_QT3', applies_when: { quality_tier: ['QT3'] } } }]);
  });
  it('honors a same-role override and ignores an off-family override', () => {
    const pinned = resolveSpecSystems({ ...base, specSystems: paint(), specOverride: { finish: 'SYS_FF_QT4' } });
    expect(pinned.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT4');
    const ignored = resolveSpecSystems({ ...base, specSystems: paint(), specOverride: { finish: 'SYS_NOT_IN_FAMILY' } });
    expect(ignored.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT3'); // falls back to default
  });
  it('falls back to first candidate when nothing matches', () => {
    const out = resolveSpecSystems({ ...base, defaultQT: 'QT5', specSystems: paint() });
    expect(out.find(o => o.role === 'finish').system.id).toBe('SYS_FF_QT3'); // no QT5 finish → first finish
  });
  it('resolves stain roles first-per-role and honors override', () => {
    const stainSystems = [
      { id: 'SYS_STAIN_A', applies_when: {} }, { id: 'SYS_STAIN_B', applies_when: {} },
      { id: 'SYS_SEALER', applies_when: {} }, { id: 'SYS_CLEAR', applies_when: {} },
    ];
    const roleMap = { SYS_STAIN_A: 'stain', SYS_STAIN_B: 'stain', SYS_SEALER: 'sealer', SYS_CLEAR: 'clear' };
    const out = resolveSpecSystems({ specSystems: stainSystems, roleBySystemId: roleMap, isStain: true, defaultQT: 'QT3', defaultSheen: 'satin', specStates: [], specOverride: { stain: 'SYS_STAIN_B' } });
    expect(out.map(o => [o.role, o.system.id])).toEqual([['stain', 'SYS_STAIN_B'], ['sealer', 'SYS_SEALER'], ['clear', 'SYS_CLEAR']]);
  });
  it('emits finish-only for a family with no primer systems', () => {
    const out = resolveSpecSystems({ ...base, specSystems: [{ id: 'SYS_FF_QT3', applies_when: { quality_tier: ['QT3'] } }] });
    expect(out.map(o => o.role)).toEqual(['finish']);
  });
});
