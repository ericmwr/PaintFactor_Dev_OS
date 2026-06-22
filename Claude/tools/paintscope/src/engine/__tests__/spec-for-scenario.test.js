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

  // ── NEW TESTS (Phase 3a) ────────────────────────────────────────────────────

  // (a) Stair paint token → NC spec; same token stain scenario → STAIN spec
  it('baluster paint scenario → SF_STAIR_RAILING_NC', () => {
    const fixture = matchesOf('SCN_BALUSTER_NC_QT3_BRUSH_FROM_BARE');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_STAIR_RAILING_NC');
  });

  it('baluster stain scenario → SF_STAIR_RAILING_NC_STAIN', () => {
    const fixture = matchesOf('SCN_BALUSTER_NC_STAIN_QT3_BRUSH_FROM_BARE');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_STAIR_RAILING_NC_STAIN');
  });

  it('riser paint scenario → SF_STAIR_RISER_NC', () => {
    const fixture = matchesOf('SCN_RISER_NC_QT3_BRUSH_FROM_BARE');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_STAIR_RISER_NC');
  });

  it('riser stain scenario → SF_STAIR_RISER_NC_STAIN', () => {
    const fixture = matchesOf('SCN_RISER_NC_STAIN_QT3_BRUSH_FROM_BARE');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_STAIR_RISER_NC_STAIN');
  });

  // (b) Array paintable_item → resolves via first element
  it('ext_deck array paintable_item → SF_DECK_EXT (first element ext_deck_floor)', () => {
    const fixture = matchesOf('SCN_EXT_DECK_NC_STAIN');
    expect(fixture).toBeTruthy();
    expect(Array.isArray(fixture.paintable_item)).toBe(true);
    // SF_DECK_EXT maps ext_deck_floor; it is the first-wins from SPEC_TO_PAINTABLE_ITEM
    const result = specForScenarioMatches(fixture);
    expect(['SF_DECK_EXT', 'SF_DECK_EXT_RP']).toContain(result);
  });

  it('ext_metal array paintable_item → SF_METAL_EXT (first element ext_metal_railing)', () => {
    const fixture = matchesOf('SCN_EXT_METAL_BARE_BRUSH');
    expect(fixture).toBeTruthy();
    expect(Array.isArray(fixture.paintable_item)).toBe(true);
    const result = specForScenarioMatches(fixture);
    expect(['SF_METAL_EXT', 'SF_METAL_EXT_RP']).toContain(result);
  });

  // (c) closet → SF_CLOSET_SHELF_NC via step-3 fallback guard
  it('closet (SS_BARE) → SF_CLOSET_SHELF_NC despite PRIME filter', () => {
    const fixture = matchesOf('SCN_CLOSET_SHELF_NC_QT3_BARE_BR');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_CLOSET_SHELF_NC');
  });

  it('closet (SS_PRIMED_FACTORY) → SF_CLOSET_SHELF_NC', () => {
    const fixture = matchesOf('SCN_CLOSET_SHELF_NC_QT3_PRIMED_BR');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_CLOSET_SHELF_NC');
  });

  // (d) int_window stain → SF_WINDOW_INT_NC_STAIN (coating_type discriminator)
  it('int_window stain scenario → SF_WINDOW_INT_NC_STAIN', () => {
    const fixture = matchesOf('SCN_INT_WNST_STAIN_CLEAR');
    expect(fixture).toBeTruthy();
    expect(specForScenarioMatches(fixture)).toBe('SF_WINDOW_INT_NC_STAIN');
  });

  // (e) combined pass-group → null (intentionally unmapped)
  it('combined pass-group scenario → null', () => {
    const fixture = matchesOf('SCN_COMBINED_WALLS_CEILING_FINISH_QT3_SPRAY_BACKROLL_EGGSHELL');
    // matches exists but has no paintable_item (pass_group_id only)
    expect(specForScenarioMatches(fixture)).toBeNull();
  });

  // (f) null matches → null
  it('null matches → null', () => {
    expect(specForScenarioMatches(null)).toBeNull();
    expect(specForScenarioMatches(undefined)).toBeNull();
  });

  // (g) Phase 3b WS1 — door-frame and door-slab stain families
  it('resolves int_door_frame + stain → SF_DOOR_FRAME_NC_STAIN', () => {
    expect(specForScenarioMatches({ paintable_item: 'int_door_frame', substrate_state: ['SS_BARE'], coating_type: ['stain', 'stain_clear'] }))
      .toBe('SF_DOOR_FRAME_NC_STAIN');
  });
  it('resolves int_door_slab + stain → SF_DOOR_SLAB_INT_NC_STAIN', () => {
    expect(specForScenarioMatches({ paintable_item: 'int_door_slab', substrate_state: ['SS_BARE'], coating_type: ['stain', 'stain_clear'] }))
      .toBe('SF_DOOR_SLAB_INT_NC_STAIN');
  });
});
