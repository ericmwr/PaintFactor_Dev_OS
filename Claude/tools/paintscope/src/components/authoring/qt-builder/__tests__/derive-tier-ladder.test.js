import { describe, it, expect } from 'vitest';
import { listSubstrates, listDimensions, listStainPhases, stainPhaseInfo } from '../derive-tier-ladder.js';

// One multi-tier scenario.
function multiTierBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_MULTI', domain: 'interior',
      matches: { paintable_item: 'widget', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_PREP_W', 'MOD_FIN_W'],
    }],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

// Separate per-tier scenario files for one substrate.
function perTierFilesBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB_QT3', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: ['MOD_BASE'] },
      { scenario_id: 'SCN_CAB_QT5', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: ['MOD_BASE', 'MOD_EXTRA'] },
    ],
    modules: {},
    tasks: {},
    modifiers: {},
  };
}

describe('listSubstrates / listDimensions', () => {
  it('lists distinct interior substrates', () => {
    expect(listSubstrates(multiTierBundle())).toEqual(['widget']);
  });
  it('lists distinct methods, states, coatings for a substrate', () => {
    const d = listDimensions(perTierFilesBundle(), 'cab');
    expect(d.methods).toEqual(['spray']);
    expect(d.states).toEqual(['SS_BARE']);
    expect(d.coatings).toEqual(['paint']);
  });
});

// Decomposed stain family fixture (door_casing shape): 3 phases, state chain,
// apply modules carry method-variant tasks gated on the stain/clear method key.
function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_PREP', 'MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_SEALER', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_STAINED'], coating_phase: 'sealer' },
        modules: ['MOD_APPLY_SEALER'],
        dynamic_coats: { MOD_APPLY_SEALER: { field: 'sealer_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_SEALER_BARE', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'sealer' },
        modules: ['MOD_APPLY_SEALER'],
        dynamic_coats: { MOD_APPLY_SEALER: { field: 'sealer_coats', interstage: 'MOD_IS' } } },
      { scenario_id: 'SCN_DC_CLEAR', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_STAINED', 'SS_SEALED'], coating_phase: 'clear' },
        modules: ['MOD_APPLY_CLEAR'],
        dynamic_coats: { MOD_APPLY_CLEAR: { field: 'clear_coats', interstage: 'MOD_IS' } } },
    ],
    modules: {
      MOD_PREP: { module_id: 'MOD_PREP', phase: 'prep', tasks: [{ task_ref: 'TSK_SAND' }] },
      MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', tasks: [
        { task_ref: 'TSK_STAIN_BRUSH', applies_when: { application_method_stain: ['brush'] } },
        { task_ref: 'TSK_STAIN_ROLL', applies_when: { application_method_stain: ['roll'] } },
        { task_ref: 'TSK_STAIN_SPRAY', applies_when: { application_method_stain: ['spray'] } },
      ] },
      MOD_APPLY_SEALER: { module_id: 'MOD_APPLY_SEALER', phase: 'finish', tasks: [
        { task_ref: 'TSK_SEALER_BRUSH', applies_when: { application_method_clear: ['brush'] } },
        { task_ref: 'TSK_SEALER_SPRAY', applies_when: { application_method_clear: ['spray'] } },
      ] },
      MOD_APPLY_CLEAR: { module_id: 'MOD_APPLY_CLEAR', phase: 'finish', tasks: [
        { task_ref: 'TSK_CLEAR_BRUSH', applies_when: { application_method_clear: ['brush'] } },
        { task_ref: 'TSK_CLEAR_SPRAY', applies_when: { application_method_clear: ['spray'] } },
      ] },
    },
    tasks: {}, modifiers: {},
  };
}

describe('listStainPhases / stainPhaseInfo', () => {
  it('lists phases in chain order, empty for paint items', () => {
    expect(listStainPhases(stainBundle(), 'int_dc')).toEqual(['stain', 'sealer', 'clear']);
    expect(listStainPhases(perTierFilesBundle(), 'cab')).toEqual([]);
  });
  it('derives stain phase: default state bare, methods brush/roll/spray', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'stain');
    expect(info.defaultState).toBe('SS_BARE');
    expect(info.methodKey).toBe('application_method_stain');
    expect(info.methods).toEqual(['brush', 'roll', 'spray']);
  });
  it('derives sealer phase: default state stained (not bare), clear method key', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'sealer');
    expect(info.defaultState).toBe('SS_STAINED');
    expect(info.methodKey).toBe('application_method_clear');
    expect(info.methods).toEqual(['brush', 'spray']);
  });
  it('derives clear phase: default state stained, clear method key', () => {
    const info = stainPhaseInfo(stainBundle(), 'int_dc', 'clear');
    expect(info.defaultState).toBe('SS_STAINED');
    expect(info.methods).toEqual(['brush', 'spray']);
  });
});
