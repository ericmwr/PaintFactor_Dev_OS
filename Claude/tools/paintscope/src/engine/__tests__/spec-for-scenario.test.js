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
});
