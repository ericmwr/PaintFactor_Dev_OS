import { describe, it, expect } from 'vitest';
import { deriveVantage } from '../derive-vantage.js';

// Baseline (no quality_tier → serves all tiers) + a QT5 fork that: forks the
// apply module (MOD_APPLY → MOD_APPLY_QT5) with an extra task, repeats it (coats),
// and adds a whole finish module the baseline lacks.
function bundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_B',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: ['MOD_PREP', 'MOD_APPLY'] },
      { scenario_id: 'SCN_B_QT5',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' },
        modules: ['MOD_PREP', 'MOD_APPLY_QT5', 'MOD_APPLY_QT5', 'MOD_GLAZE'] },
    ],
    modules: {
      MOD_PREP:      { phase: 'prep',   name: 'Prep',      tasks: [{ task_ref: 'T_SAND' }] },
      MOD_APPLY:     { phase: 'apply',  name: 'Apply',     tasks: [{ task_ref: 'T_COAT' }] },
      MOD_APPLY_QT5: { phase: 'apply',  name: 'Apply QT5', tasks: [{ task_ref: 'T_COAT' }, { task_ref: 'T_EXTRA' }] },
      MOD_GLAZE:     { phase: 'finish', name: 'Glaze',     tasks: [{ task_ref: 'T_GLAZE' }] },
    },
    tasks: { T_SAND: { name: 'Sand' }, T_COAT: { name: 'Coat' }, T_EXTRA: { name: 'Extra' }, T_GLAZE: { name: 'Glaze coat' } },
  };
}
const sel = { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('deriveVantage', () => {
  const v = deriveVantage(bundle(), sel);
  const mod = (b) => v.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === b);

  it('resolves the scenario per tier and flags the fork', () => {
    expect(v.served).toEqual(['QT2', 'QT3', 'QT4', 'QT5']);
    expect(v.scenarioByTier).toEqual({ QT2: 'SCN_B', QT3: 'SCN_B', QT4: 'SCN_B', QT5: 'SCN_B_QT5' });
    expect(v.isForkByTier).toEqual({ QT2: false, QT3: false, QT4: false, QT5: true });
  });

  it('orders phase groups by PHASE_ORDER', () => {
    expect(v.phaseGroups.map(g => g.phase)).toEqual(['prep', 'apply', 'finish']);
  });

  it('classifies a shared module as shared on every tier', () => {
    const m = mod('MOD_PREP');
    expect(m.cells.QT3.state).toBe('shared');
    expect(m.cells.QT5.state).toBe('shared');
  });

  it('classifies a forked module: shared on baseline tiers, forked + coat count on the fork', () => {
    const m = mod('MOD_APPLY');
    expect(m.cells.QT3).toEqual({ moduleId: 'MOD_APPLY', count: 1, state: 'shared' });
    expect(m.cells.QT5).toEqual({ moduleId: 'MOD_APPLY_QT5', count: 2, state: 'forked' });
  });

  it('classifies a whole added module as added only on the fork, absent elsewhere', () => {
    const m = mod('MOD_GLAZE');
    expect(m.cells.QT3.state).toBe('absent');
    expect(m.cells.QT5).toEqual({ moduleId: 'MOD_GLAZE', count: 1, state: 'added' });
  });

  it('classifies tasks: shared task present everywhere, extra task added only on the fork', () => {
    const m = mod('MOD_APPLY');
    const coat = m.tasks.find(t => t.task_ref === 'T_COAT');
    const extra = m.tasks.find(t => t.task_ref === 'T_EXTRA');
    expect(coat.cells).toEqual({ QT2: 'present', QT3: 'present', QT4: 'present', QT5: 'present' });
    expect(extra.cells).toEqual({ QT2: 'absent', QT3: 'absent', QT4: 'absent', QT5: 'added' });
  });
});

// Edge cases: unserved (na) tiers, eager-family reference fallback, method gating
describe('deriveVantage edge cases', () => {
  it('marks unserved tiers as na (a single QT3-only scenario)', () => {
    const b = {
      scenarios: [{ scenario_id: 'SCN_3', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT3' }, modules: ['MOD_A'] }],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [{ task_ref: 'T' }] } },
      tasks: { T: { name: 'T' } },
    };
    const v = deriveVantage(b, sel);
    expect(v.served).toEqual(['QT3']);
    const m = v.phaseGroups[0].modules[0];
    expect(m.cells.QT2.state).toBe('na');
    expect(m.cells.QT4.state).toBe('na');
    expect(m.tasks[0].cells).toEqual({ QT2: 'na', QT3: 'present', QT4: 'na', QT5: 'na' });
  });

  it('uses the lowest served tier as reference when no baseline scenario exists (eager family)', () => {
    // QT3 and QT5 are both pinned (no quality_tier-less baseline). QT5 has an extra module.
    const b = {
      scenarios: [
        { scenario_id: 'SCN_3', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT3' }, modules: ['MOD_A'] },
        { scenario_id: 'SCN_5', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT5' }, modules: ['MOD_A', 'MOD_B'] },
      ],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [] }, MOD_B: { phase: 'finish', name: 'B', tasks: [] } },
      tasks: {},
    };
    const v = deriveVantage(b, sel);
    expect(v.isForkByTier).toEqual({ QT2: false, QT3: true, QT4: false, QT5: true });
    const mB = v.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_B');
    expect(mB.cells.QT5.state).toBe('added');  // absent in the QT3 reference
  });

  it('hides tasks gated to the other application_method', () => {
    const b = {
      scenarios: [{ scenario_id: 'SCN_B', matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' }, modules: ['MOD_A'] }],
      modules: { MOD_A: { phase: 'apply', name: 'A', tasks: [
        { task_ref: 'T_BRUSH', applies_when: { application_method: ['brush'] } },
        { task_ref: 'T_SPRAY', applies_when: { application_method: ['spray'] } },
      ] } },
      tasks: { T_BRUSH: { name: 'Brush' }, T_SPRAY: { name: 'Spray' } },
    };
    const v = deriveVantage(b, sel);  // sel.application_method = 'brush'
    const refs = v.phaseGroups[0].modules[0].tasks.map(t => t.task_ref);
    expect(refs).toEqual(['T_BRUSH']);
  });
});
