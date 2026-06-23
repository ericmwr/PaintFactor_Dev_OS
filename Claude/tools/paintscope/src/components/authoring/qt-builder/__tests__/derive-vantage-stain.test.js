import { describe, it, expect } from 'vitest';
import { deriveVantage } from '../derive-vantage.js';

// Minimal decomposed stain bundle: one baseline stain scenario (no quality_tier).
function stainBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_DC_STAIN', domain: 'interior',
        matches: { paintable_item: 'int_dc', substrate_state: ['SS_BARE'], coating_phase: 'stain' },
        modules: ['MOD_APPLY_STAIN'],
        dynamic_coats: { MOD_APPLY_STAIN: { field: 'stain_coats', interstage: 'MOD_IS' } },
        coat_counts: { stain_coats: 2 } },
    ],
    modules: {
      MOD_APPLY_STAIN: { module_id: 'MOD_APPLY_STAIN', phase: 'apply', name: 'Stain', tasks: [
        { task_ref: 'TSK_STAIN_BRUSH', applies_when: { application_method_stain: ['brush'] } },
        { task_ref: 'TSK_STAIN_SPRAY', applies_when: { application_method_stain: ['spray'] } },
      ] },
    },
    tasks: { TSK_STAIN_BRUSH: { name: 'Brush' }, TSK_STAIN_SPRAY: { name: 'Spray' } },
    modifiers: {},
  };
}
const sel = { paintable_item: 'int_dc', substrate_state: 'SS_BARE', coating_phase: 'stain', application_method_stain: 'brush' };

describe('deriveVantage — stain', () => {
  it('resolves the decomposed stain scenario via coating_phase', () => {
    const vm = deriveVantage(stainBundle(), sel);
    expect(vm.served).toContain('QT3');
    expect(vm.phaseGroups.length).toBeGreaterThan(0);
  });
  it('reads coat count from coat_counts (scalar), exposes coatField', () => {
    const vm = deriveVantage(stainBundle(), sel);
    const applyRow = vm.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_APPLY_STAIN');
    expect(applyRow.cells.QT3.count).toBe(2);
    expect(applyRow.cells.QT3.coatField).toBe('stain_coats');
  });
  it('filters apply tasks by the selected stain method', () => {
    const vm = deriveVantage(stainBundle(), sel);
    const applyRow = vm.phaseGroups.flatMap(g => g.modules).find(m => m.baseModuleId === 'MOD_APPLY_STAIN');
    const taskRefs = applyRow.tasks.map(t => t.task_ref);
    expect(taskRefs).toContain('TSK_STAIN_BRUSH');
    expect(taskRefs).not.toContain('TSK_STAIN_SPRAY');
  });
});
