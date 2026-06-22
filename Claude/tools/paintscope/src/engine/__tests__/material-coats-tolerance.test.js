import { describe, it, expect } from 'vitest';
import { resolveCoats } from '../material-estimates.js';

const productsBySystem = { 'SF_CABINET_NC_PAINT::SYS_FF_STANDARD_ACRYLIC': [{ product_role: 'finish', coats_required: 2 }] };
const productsBySystemId = { SYS_FF_STANDARD_ACRYLIC: [{ product_role: 'finish', coats_required: 2 }] };

describe('resolveCoats', () => {
  it('uses the own-family product row when present', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CABINET_NC_PAINT', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'own-family' });
  });
  it('falls back by id across families when the active family lacks a row (closet)', () => {
    expect(resolveCoats('SYS_FF_STANDARD_ACRYLIC', 'SF_CLOSET_SHELF_NC', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 2, resolvedBy: 'cross-family' });
  });
  it('defaults to 1 coat when no row exists anywhere', () => {
    expect(resolveCoats('SYS_GHOST', 'SF_X', productsBySystem, productsBySystemId, 'finish'))
      .toEqual({ coats: 1, resolvedBy: 'default' });
  });
});
