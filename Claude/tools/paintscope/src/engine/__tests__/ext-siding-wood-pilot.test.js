import { describe, it, expect } from 'vitest';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { runScenarioEstimate } from '../run-estimate-scenario.js';

// Exterior Data Factory pilot (Step 2): ext_siding × wood_smooth × NC × QT3.
// Brief: Claude/devos/exterior-briefs/ext_siding.wood_smooth.NC.QT3.md (r2).
// The exterior adapter is not rewired yet (brief R1), so these tests drive the
// scenarios with a hand-built ctx carrying the taxonomy-v1 match keys.

const SF = 1000;
const roomQty = () => new Map([['PS_EXT_SIDING_SF.FIELD', { value: SF, uom: 'SF' }]]);

function run(overrides = {}) {
  const ctx = {
    paintable_item: 'ext_siding',
    material: 'wood_smooth',
    coating_type: 'paint',
    substrate_state: 'SS_BARE',
    substrate_condition: 'SC_NEW',
    application_method_prime: 'spray_backbrush',
    application_method: 'spray',
    quality_tier: 'QT3',
    complexity: 'STD',
    height_band: 'STD',
    texture: 'smooth',
    ...overrides,
  };
  return runScenarioEstimate({ scenarioBundle: canonicalBundle, ctx, roomQty: roomQty(), roomIndex: -100, roomLabel: 'Elevation A' });
}

const ids = (r) => r.tasks.map((t) => t.taskId.replace('TSK_EXT_SIDING_', ''));
const PREFIX = 'SCN_EXT_SIDING_WOOD_SMOOTH_NC_QT3_';

describe('ext_siding wood_smooth pilot — scenario selection', () => {
  it.each([
    ['SS_BARE', 'SC_NEW', 'FROM_BARE'],
    ['SS_BARE', 'SC_WEATHERED', 'FROM_BARE_WEATHERED'],
    ['SS_PRIMED_FACTORY', 'SC_NEW', 'FROM_PRIMED_FACTORY'],
    ['SS_PRIMED_FIELD', 'SC_NEW', 'FROM_PRIMED_FIELD'],
    ['SS_PRIMED_FACTORY', 'SC_WEATHERED', 'FROM_PRIMED_WEATHERED'],
    ['SS_PRIMED_FIELD', 'SC_WEATHERED', 'FROM_PRIMED_WEATHERED'],
  ])('%s / %s → %s', (state, cond, suffix) => {
    const r = run({ substrate_state: state, substrate_condition: cond });
    expect(r.scenarioId).toBe(PREFIX + suffix);
    expect(r.warnings).toEqual([]);
    expect(r.outputState).toBe('SS_PAINTED');
  });

  it.each(['brush', 'roll', 'spray', 'spray_backroll', 'spray_backbrush'])(
    'every finish method matches (%s)', (m) => {
      expect(run({ application_method: m }).scenarioId).toBe(PREFIX + 'FROM_BARE');
    });

  it('does not match other materials', () => {
    expect(run({ material: 'wood_rough' }).scenarioId).toBeNull();
  });
});

describe('ext_siding wood_smooth pilot — sequence and per-coat method', () => {
  it('bare/new: prime → fill/caulk → coat → check → coat, in phase order', () => {
    const r = run();
    expect(ids(r)).toEqual([
      'SETUP_SITE', 'PROTECT_GROUND', 'MASK_SPRAY',
      'INSPECT', 'DUST_OFF',
      'PRIME_SPRAY', 'BACKBRUSH',
      'FILL_HOLES', 'CAULK_JOINTS', 'SPOT_PRIME',
      'COAT_SPRAY',
      'COAT_INSPECT',
      'COAT_SPRAY',
      'DEMASK', 'FINAL_TOUCHUP',
      'CLEAN_SPRAY_RIG', 'SITE_CLEANUP',
    ]);
    // Eric's rate sheet sanity total: 18.65 crew-h per 1,000 SF.
    expect(r.totalHours).toBeCloseTo(18.65, 1);
  });

  it('prime and finish methods are independent', () => {
    const r = run({ application_method_prime: 'brush', application_method: 'roll' });
    const t = ids(r);
    expect(t).toContain('PRIME_BRUSH');
    expect(t).not.toContain('PRIME_SPRAY');
    expect(t.filter((x) => x === 'COAT_ROLL')).toHaveLength(2);
    expect(t).not.toContain('COAT_SPRAY');
    expect(t).not.toContain('BACKBRUSH');
    // No spray in the finish coats → no masking/demask/rig cleaning (brief R4: finish-method gate).
    expect(t).not.toContain('MASK_SPRAY');
    expect(t).not.toContain('CLEAN_SPRAY_RIG');
  });

  it('back-brush fires once per sprayed coat that asks for it', () => {
    const r = run({ application_method_prime: 'spray_backbrush', application_method: 'spray_backbrush' });
    expect(ids(r).filter((x) => x === 'BACKBRUSH')).toHaveLength(3);
  });

  it('factory primed: no prime coat, cut edges sealed', () => {
    const t = ids(run({ substrate_state: 'SS_PRIMED_FACTORY' }));
    expect(t).toContain('SPOT_PRIME_CUTS');
    expect(t.some((x) => x.startsWith('PRIME_'))).toBe(false);
  });

  it('field primed: no prime coat, no cut-edge task', () => {
    const t = ids(run({ substrate_state: 'SS_PRIMED_FIELD' }));
    expect(t).not.toContain('SPOT_PRIME_CUTS');
    expect(t.some((x) => x.startsWith('PRIME_'))).toBe(false);
  });

  it('weathered: wash + spot sand, never a full sand; primed weathered gets no re-prime', () => {
    const bare = ids(run({ substrate_condition: 'SC_WEATHERED' }));
    expect(bare).toEqual(expect.arrayContaining(['WASH_CLEAN', 'SPOT_SAND', 'PRIME_SPRAY']));
    expect(bare).not.toContain('DUST_OFF');
    const primed = ids(run({ substrate_state: 'SS_PRIMED_FIELD', substrate_condition: 'SC_WEATHERED' }));
    expect(primed).toEqual(expect.arrayContaining(['WASH_CLEAN', 'SPOT_SAND', 'SPOT_PRIME']));
    expect(primed.some((x) => x.startsWith('PRIME_'))).toBe(false);
  });
});
