import { describe, it, expect } from 'vitest';
import { listSubstrates, listDimensions, deriveTierLadder } from '../derive-tier-ladder.js';

// Pattern A — ONE multi-tier scenario (quality_tier array) with a QT5-only
// task gated by applies_when.quality_tier. No QT2 scenario.
function multiTierBundle() {
  return {
    scenarios: [{
      scenario_id: 'SCN_MULTI', domain: 'interior',
      matches: { paintable_item: 'widget', application_method: 'brush', substrate_state: ['SS_BARE'], quality_tier: ['QT3', 'QT4', 'QT5'], coating_type: 'paint' },
      modules: ['MOD_PREP_W', 'MOD_FIN_W'],
    }],
    modules: {
      MOD_PREP_W: { module_id: 'MOD_PREP_W', phase: 'prep', tasks: [
        { task_ref: 'TSK_CLEAN' },
        { task_ref: 'TSK_DETAIL_SAND', applies_when: { quality_tier: ['QT5'] } },
      ] },
      MOD_FIN_W: { module_id: 'MOD_FIN_W', phase: 'finish', tasks: [{ task_ref: 'TSK_COAT' }] },
    },
    tasks: {
      TSK_CLEAN: { task_id: 'TSK_CLEAN', name: 'Clean' },
      TSK_DETAIL_SAND: { task_id: 'TSK_DETAIL_SAND', name: 'Detail sand' },
      TSK_COAT: { task_id: 'TSK_COAT', name: 'Coat' },
    },
    modifiers: {},
  };
}

// Pattern B — SEPARATE per-tier scenario files (quality_tier scalar) with
// different module lists. Only QT3 and QT5 exist (QT2, QT4 unserved).
function perTierFilesBundle() {
  return {
    scenarios: [
      { scenario_id: 'SCN_CAB_QT3', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT3', coating_type: 'paint' }, modules: ['MOD_BASE'] },
      { scenario_id: 'SCN_CAB_QT5', domain: 'interior', matches: { paintable_item: 'cab', application_method: 'spray', substrate_state: ['SS_BARE'], quality_tier: 'QT5', coating_type: 'paint' }, modules: ['MOD_BASE', 'MOD_EXTRA'] },
    ],
    modules: {
      MOD_BASE: { module_id: 'MOD_BASE', phase: 'finish', tasks: [{ task_ref: 'TSK_SPRAY' }] },
      MOD_EXTRA: { module_id: 'MOD_EXTRA', phase: 'finish', tasks: [{ task_ref: 'TSK_TOUCHUP' }] },
    },
    tasks: {
      TSK_SPRAY: { task_id: 'TSK_SPRAY', name: 'Spray finish' },
      TSK_TOUCHUP: { task_id: 'TSK_TOUCHUP', name: 'Touch up' },
    },
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

describe('deriveTierLadder — multi-tier scenario (pattern A)', () => {
  const ladder = () => deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });

  it('serves QT3-5 but not QT2', () => {
    expect(ladder().served).toEqual(['QT3', 'QT4', 'QT5']);
    expect(ladder().baseline).toBe('QT3');
  });
  it('orders rows by phase then appearance', () => {
    expect(ladder().rows.map(r => r.task_id)).toEqual(['TSK_CLEAN', 'TSK_DETAIL_SAND', 'TSK_COAT']);
  });
  it('marks the QT5-only task added at QT5, skipped at QT3/QT4, na at QT2', () => {
    const sand = ladder().rows.find(r => r.task_id === 'TSK_DETAIL_SAND');
    expect(sand.cells).toEqual({ QT2: 'na', QT3: 'skip', QT4: 'skip', QT5: 'added' });
  });
  it('marks a baseline task fires across served tiers, na at QT2', () => {
    const clean = ladder().rows.find(r => r.task_id === 'TSK_CLEAN');
    expect(clean.cells).toEqual({ QT2: 'na', QT3: 'fires', QT4: 'fires', QT5: 'fires' });
  });
});

describe('deriveTierLadder — per-tier scenario files (pattern B)', () => {
  const ladder = () => deriveTierLadder(perTierFilesBundle(), { paintable_item: 'cab', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' });

  it('serves only the tiers that have a scenario file', () => {
    expect(ladder().served).toEqual(['QT3', 'QT5']);
  });
  it('shows the extra QT5-file task as added at QT5, skip at QT3, na where unserved', () => {
    const touch = ladder().rows.find(r => r.task_id === 'TSK_TOUCHUP');
    expect(touch.cells).toEqual({ QT2: 'na', QT3: 'skip', QT4: 'na', QT5: 'added' });
  });
  it('shows the shared task firing in both served tiers', () => {
    const spray = ladder().rows.find(r => r.task_id === 'TSK_SPRAY');
    expect(spray.cells).toEqual({ QT2: 'na', QT3: 'fires', QT4: 'na', QT5: 'fires' });
  });
});

describe('deriveTierLadder — moduleIds + groups (Phase 2b extensions)', () => {
  it('records the home module(s) of each task', () => {
    const l = deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.rows.find(r => r.task_id === 'TSK_CLEAN').moduleIds).toEqual(['MOD_PREP_W']);
    expect(l.rows.find(r => r.task_id === 'TSK_COAT').moduleIds).toEqual(['MOD_FIN_W']);
  });
  it('exposes phase-grouped rows in PHASE_ORDER', () => {
    const l = deriveTierLadder(multiTierBundle(), { paintable_item: 'widget', application_method: 'brush', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.groups.map(g => g.phase)).toEqual(['prep', 'finish']);
    expect(l.groups[0].rows.map(r => r.task_id)).toEqual(['TSK_CLEAN', 'TSK_DETAIL_SAND']);
    expect(l.groups[1].rows.map(r => r.task_id)).toEqual(['TSK_COAT']);
  });
  it('records the per-tier-file extra-module home', () => {
    const l = deriveTierLadder(perTierFilesBundle(), { paintable_item: 'cab', application_method: 'spray', substrate_state: 'SS_BARE', coating_type: 'paint' });
    expect(l.rows.find(r => r.task_id === 'TSK_TOUCHUP').moduleIds).toEqual(['MOD_EXTRA']);
    expect(l.rows.find(r => r.task_id === 'TSK_SPRAY').moduleIds).toEqual(['MOD_BASE']);
  });
});
