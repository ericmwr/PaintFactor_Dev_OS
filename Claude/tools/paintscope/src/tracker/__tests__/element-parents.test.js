import { describe, it, expect } from 'vitest';
import {
  getElementParent,
  applyPhaseMergeRule,
  SUBSTRATE_TO_ELEMENT_PARENT,
  ELEMENT_PARENT_LABELS,
} from '../element-parents.js';

describe('getElementParent', () => {
  it('maps walls → walls', () => {
    expect(getElementParent('walls')).toBe('walls');
  });

  it('maps ceiling → ceilings', () => {
    expect(getElementParent('ceiling')).toBe('ceilings');
  });

  it('maps trim substrates → trim', () => {
    expect(getElementParent('baseboard')).toBe('trim');
    expect(getElementParent('crown')).toBe('trim');
    expect(getElementParent('door_casing')).toBe('trim');
    expect(getElementParent('window_casing')).toBe('trim');
    expect(getElementParent('window_jamb')).toBe('trim');
  });

  it('maps doors/windows/cabinets/stairway each to their own parent', () => {
    expect(getElementParent('doors')).toBe('doors');
    expect(getElementParent('windows')).toBe('windows');
    expect(getElementParent('cabinets')).toBe('cabinets');
    expect(getElementParent('stairway')).toBe('stairway');
  });

  it('maps specialty substrates → specialty', () => {
    expect(getElementParent('wainscoting')).toBe('specialty');
    expect(getElementParent('beams')).toBe('specialty');
    expect(getElementParent('columns')).toBe('specialty');
    expect(getElementParent('mantels')).toBe('specialty');
    expect(getElementParent('builtins')).toBe('specialty');
    expect(getElementParent('closet_shelving')).toBe('specialty');
  });

  it('returns null for unknown substrate', () => {
    expect(getElementParent('mystery_substrate')).toBeNull();
  });
});

describe('applyPhaseMergeRule', () => {
  it('merges walls + ceilings into drywall_prep for prep phase', () => {
    expect(applyPhaseMergeRule('walls', 'prep')).toBe('drywall_prep');
    expect(applyPhaseMergeRule('ceilings', 'prep')).toBe('drywall_prep');
  });

  it('merges walls + ceilings into drywall_prime for prime phase', () => {
    expect(applyPhaseMergeRule('walls', 'prime')).toBe('drywall_prime');
    expect(applyPhaseMergeRule('ceilings', 'prime')).toBe('drywall_prime');
  });

  it('does NOT merge walls + ceilings for finish phase', () => {
    expect(applyPhaseMergeRule('walls', 'finish')).toBe('walls');
    expect(applyPhaseMergeRule('ceilings', 'finish')).toBe('ceilings');
  });

  it('returns the parent unchanged for non-merged combinations', () => {
    expect(applyPhaseMergeRule('trim', 'prep')).toBe('trim');
    expect(applyPhaseMergeRule('doors', 'finish')).toBe('doors');
  });
});

describe('ELEMENT_PARENT_LABELS', () => {
  it('has display labels for every known parent', () => {
    const parents = new Set(Object.values(SUBSTRATE_TO_ELEMENT_PARENT));
    parents.add('drywall_prep');
    parents.add('drywall_prime');
    for (const p of ['project_setup', 'project_protection', 'project_cleanup']) {
      parents.add(p);
    }
    for (const p of parents) {
      expect(ELEMENT_PARENT_LABELS[p], `missing label for ${p}`).toBeTruthy();
    }
  });
});
