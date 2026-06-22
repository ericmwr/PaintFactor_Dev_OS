import { describe, it, expect } from 'vitest';
import bundle from '../../data/scenario-bundle.gen.js';
import { specForScenarioMatches } from '../spec-for-scenario.js';

const matchesOf = (id) => bundle.scenarios.find(s => s.scenario_id === id)?.matches;

describe('specForScenarioMatches', () => {
  it('maps a single-spec paintable_item (cabinet) to its family', () => {
    expect(specForScenarioMatches(matchesOf('SCN_CABINET_NC_QT3_BRUSH_FROM_BARE'))).toBe('SF_CABINET_NC_PAINT');
  });
  it('disambiguates drywall wall vs ceiling by matches.surface', () => {
    const wall = bundle.scenarios.find(s => /DRYWALL_WALL/.test(s.scenario_id) && (s.matches?.surface === 'wall'));
    const ceil = bundle.scenarios.find(s => /DRYWALL_CEILING/.test(s.scenario_id) && (s.matches?.surface === 'ceiling'));
    if (wall) expect(specForScenarioMatches(wall.matches)).toContain('WALL');
    if (ceil) expect(specForScenarioMatches(ceil.matches)).toContain('CEILING');
  });
  it('returns null for unknown / missing matches', () => {
    expect(specForScenarioMatches(null)).toBeNull();
    expect(specForScenarioMatches({ paintable_item: 'nonesuch_xyz' })).toBeNull();
  });

  // Pin the PRIME/FINISH split — these drive the core step-2/step-3 logic
  it('routes drywall wall SS_BARE to SF_DRYWALL_WALL_NC_PRIME (not FINISH)', () => {
    // SCN_DRYWALL_PRIME_QT3_ROLL: paintable_item='drywall', surface='wall', substrate_state=['SS_BARE']
    const fixture = bundle.scenarios.find(s => {
      const m = s.matches;
      if (!m || m.paintable_item !== 'drywall' || m.surface !== 'wall') return false;
      const states = Array.isArray(m.substrate_state) ? m.substrate_state : [m.substrate_state];
      return states.includes('SS_BARE');
    });
    if (!fixture) { console.warn('SKIP: no drywall-wall SS_BARE scenario in bundle'); return; }
    expect(specForScenarioMatches(fixture.matches)).toBe('SF_DRYWALL_WALL_NC_PRIME');
  });

  it('routes drywall ceiling SS_PRIMED_FIELD to SF_DRYWALL_CEILING_NC_FINISH (not PRIME)', () => {
    // SCN_CEILING_FINISH_QT3_ROLL: paintable_item='drywall', surface='ceiling', substrate_state=['SS_PRIMED','SS_PRIMED_FIELD']
    const fixture = bundle.scenarios.find(s => {
      const m = s.matches;
      if (!m || m.paintable_item !== 'drywall' || m.surface !== 'ceiling') return false;
      const states = Array.isArray(m.substrate_state) ? m.substrate_state : [m.substrate_state];
      return states.includes('SS_PRIMED_FIELD') || states.includes('SS_PRIMED');
    });
    if (!fixture) { console.warn('SKIP: no drywall-ceiling primed scenario in bundle'); return; }
    expect(specForScenarioMatches(fixture.matches)).toBe('SF_DRYWALL_CEILING_NC_FINISH');
  });

  it('routes cabinet repaint state to SF_CABINET_INT_RP (not NC_PAINT)', () => {
    // SCN_INT_CABINET_RP_FAILING: paintable_item='cabinet', substrate_state=['SS_FAILING_PAINT']
    const fixture = bundle.scenarios.find(s => {
      const m = s.matches;
      if (!m || m.paintable_item !== 'cabinet') return false;
      const states = Array.isArray(m.substrate_state) ? m.substrate_state : [m.substrate_state];
      return states.includes('SS_SOUND_PAINT') || states.includes('SS_FAILING_PAINT');
    });
    if (!fixture) { console.warn('SKIP: no cabinet repaint scenario in bundle'); return; }
    expect(specForScenarioMatches(fixture.matches)).toBe('SF_CABINET_INT_RP');
  });
});
