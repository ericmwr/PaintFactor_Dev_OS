import { describe, it, expect } from 'vitest';
import { defaultFinishGroupForCoatingType, createSubstrateConfig } from '../../state/initial-state.js';

describe('defaultFinishGroupForCoatingType', () => {
  it('returns C for paint', () => {
    expect(defaultFinishGroupForCoatingType('paint')).toBe('C');
  });
  it('returns D for stain_clear, stain_only, clear_only', () => {
    expect(defaultFinishGroupForCoatingType('stain_clear')).toBe('D');
    expect(defaultFinishGroupForCoatingType('stain_only')).toBe('D');
    expect(defaultFinishGroupForCoatingType('clear_only')).toBe('D');
  });
  it('returns C for null or unknown', () => {
    expect(defaultFinishGroupForCoatingType(null)).toBe('C');
    expect(defaultFinishGroupForCoatingType(undefined)).toBe('C');
    expect(defaultFinishGroupForCoatingType('weird_value')).toBe('C');
  });
});

describe('createSubstrateConfig seeds finish_group', () => {
  it('paint items default to C (baseboard, coating_type=paint)', () => {
    const cfg = createSubstrateConfig('baseboard');
    expect(cfg.finish_group).toBe('C');
  });
  it('stain_clear items default to D', () => {
    const cfg = createSubstrateConfig('door_frames', { coating_type: 'stain_clear', substrate_state: 'bare_wood' });
    expect(cfg.finish_group).toBe('D');
  });
  it('walls and ceiling do NOT carry finish_group through createSubstrateConfig (driven externally)', () => {
    const walls = createSubstrateConfig('walls');
    const ceiling = createSubstrateConfig('ceiling');
    expect(walls.finish_group).toBeUndefined();
    expect(ceiling.finish_group).toBeUndefined();
  });
  it('explicit override in overrides wins over auto-seed', () => {
    const cfg = createSubstrateConfig('baseboard', { finish_group: 'E' });
    expect(cfg.finish_group).toBe('E');
  });
});
