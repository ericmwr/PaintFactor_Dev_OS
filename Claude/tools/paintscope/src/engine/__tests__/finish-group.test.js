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
