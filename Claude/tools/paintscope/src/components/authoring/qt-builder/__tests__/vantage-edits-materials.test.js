import { describe, it, expect } from 'vitest';
import { planSetMaterial, planClearMaterial } from '../vantage-edits.js';

// Baseline serving all tiers (no quality_tier), carrying a primer + finish array.
// Pattern-classifiable ids: SYS_PRIMER_* → primer, SYS_FF_* → finish.
function bundle(finishSystem = 'SYS_FF_A') {
  return {
    scenarios: [
      { scenario_id: 'SCN_B',
        matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' },
        modules: ['MOD_PREP', 'MOD_APPLY'],
        material_systems: ['SYS_PRIMER_A', finishSystem] },
    ],
    modules: { MOD_PREP: { tasks: [] }, MOD_APPLY: { tasks: [] } },
    tasks: {},
  };
}
const sel = { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' };

describe('planSetMaterial', () => {
  it('QT3 edits the baseline IN PLACE (same scenario_id, replaced finish)', () => {
    const b = bundle();
    const plan = planSetMaterial(b, b, sel, 'QT3', 'finish', 'SYS_FF_B');
    expect(plan.scenario.scenario_id).toBe('SCN_B');                 // no fork
    expect(plan.scenario.matches.quality_tier).toBeUndefined();      // still a baseline
    expect(plan.scenario.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_B']);
  });

  it('QT4 forks a copied array and replaces the finish', () => {
    const b = bundle();
    const plan = planSetMaterial(b, b, sel, 'QT4', 'finish', 'SYS_FF_B');
    expect(plan.scenario.scenario_id).toBe('SCN_B_QT4');
    expect(plan.scenario.matches.quality_tier).toBe('QT4');
    expect(plan.scenario.material_systems).toEqual(['SYS_PRIMER_A', 'SYS_FF_B']);
  });

  it('QT4 set back to the baseline value auto-reclaims (deletes the fork)', () => {
    const b = bundle();
    const plan = planSetMaterial(b, b, sel, 'QT4', 'finish', 'SYS_FF_A'); // == baseline
    expect(plan).toEqual({ deleteScenarioId: 'SCN_B_QT4', deleteModuleIds: [] });
  });

  it('QT3 set back to the baseline value deletes the baseline draft', () => {
    // Overlaid bundle has a baseline draft diverging in finish; canonical has SYS_FF_A.
    const merged = bundle('SYS_FF_B');
    const canonical = bundle('SYS_FF_A');
    const plan = planSetMaterial(merged, canonical, sel, 'QT3', 'finish', 'SYS_FF_A');
    expect(plan).toEqual({ deleteScenarioId: 'SCN_B', deleteModuleIds: [] });
  });

  it('re-setting a role to its current value returns an unchanged-materials payload (no live ref)', () => {
    // merged === canonical === bundle(): finish is already SYS_FF_A.
    // ensureScenarioForMaterial (QT3 branch) now returns a copy, so the returned
    // object is never the live bundle reference. The result fully matches canonical,
    // so reclaimOrSave returns the delete payload (reclaims the no-op draft).
    const b = bundle(); // baseline finish = SYS_FF_A
    const plan = planSetMaterial(b, b, sel, 'QT3', 'finish', 'SYS_FF_A'); // already SYS_FF_A
    expect(plan).toEqual({ deleteScenarioId: 'SCN_B', deleteModuleIds: [] });
    // Confirm the returned object is not the live scenario from the bundle.
    expect(plan).not.toHaveProperty('scenario');
  });
});

describe('planClearMaterial', () => {
  it('QT4 clear restores the role to canonical and reclaims the fork', () => {
    // Overlaid bundle has a QT4 fork overriding finish; canonical is baseline-only.
    const merged = {
      scenarios: [
        bundle().scenarios[0],
        { scenario_id: 'SCN_B_QT4',
          matches: { paintable_item: 'x', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint', quality_tier: 'QT4' },
          modules: ['MOD_PREP', 'MOD_APPLY'],
          material_systems: ['SYS_PRIMER_A', 'SYS_FF_B'] },
      ],
      modules: bundle().modules, tasks: {},
    };
    const plan = planClearMaterial(merged, bundle(), sel, 'QT4', 'finish');
    expect(plan).toEqual({ deleteScenarioId: 'SCN_B_QT4', deleteModuleIds: [] });
  });

  it('no-op when the tier already matches canonical (nothing to clear)', () => {
    const b = bundle();
    expect(planClearMaterial(b, b, sel, 'QT4', 'finish')).toEqual({});
  });
});
