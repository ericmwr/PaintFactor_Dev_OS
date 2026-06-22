import { describe, it, expect } from 'vitest';
import { resolveCoats } from '../material-estimates.js';

// Fix 1: own-family fixture now has TWO product rows — primer first, finish second.
// This proves resolveCoats selects by role, not by products[0].
const productsBySystem = {
  'SF_CABINET_NC_PAINT::SYS_FF_STANDARD_ACRYLIC': [
    { product_role: 'primer', coats_required: 1 },
    { product_role: 'finish', coats_required: 2 },
  ],
};
const productsBySystemId = { SYS_FF_STANDARD_ACRYLIC: [{ product_role: 'finish', coats_required: 2 }] };

describe('resolveCoats', () => {
  it('uses the own-family product row when present', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CABINET_NC_PAINT', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'own-family' });
  });

  it('selects finish row by role (not products[0] which is primer)', () => {
    // If role-matching were broken and products[0] were returned, coats would be 1 (primer row).
    // The correct result is coats:2 from the finish row — proving role selection is active.
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CABINET_NC_PAINT', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'own-family' });
  });

  it('selects primer row by role when role is primer', () => {
    // Symmetry check: asking for primer returns the primer row (coats:1), not finish (coats:2).
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CABINET_NC_PAINT', productsBySystem, productsBySystemId, 'primer'))
      .toEqual({ coats: 1, resolvedBy: 'own-family' });
  });

  it('falls back by id across families when the active family lacks a row (closet)', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CLOSET_SHELF_NC', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'cross-family' });
  });

  it('defaults to 1 coat when no row exists anywhere', () => {
    expect(resolveCoats('SYS_GHOST', 'SF_X', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 1, resolvedBy: 'default' });
  });

  // Fix 2: product row exists but has NO coats_required field → should default to 1.
  it('defaults to 1 coat when own-family product row exists but coats_required is missing', () => {
    const pbs = { 'SF_TEST::SYS_NO_COATS': [{ product_role: 'finish' }] };
    const pbsId = {};
    expect(resolveCoats('SYS_NO_COATS', 'SF_TEST', pbs, pbsId, 'finish'))
      .toEqual({ coats: 1, resolvedBy: 'own-family' });
  });

  it('defaults to 1 coat when cross-family product row exists but coats_required is missing', () => {
    const pbs = {};
    const pbsId = { SYS_NO_COATS_CROSS: [{ product_role: 'finish' }] };
    expect(resolveCoats('SYS_NO_COATS_CROSS', 'SF_OTHER', pbs, pbsId, 'finish'))
      .toEqual({ coats: 1, resolvedBy: 'cross-family' });
  });
});
