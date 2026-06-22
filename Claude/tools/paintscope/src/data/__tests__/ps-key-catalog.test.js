import { describe, it, expect } from 'vitest';
import { parsePsKey, humanize } from '../ps-key-catalog.js';

describe('parsePsKey', () => {
  it('parses a standard surface key', () => {
    expect(parsePsKey('PS_SURFACE_LF.BASEBOARD')).toEqual({ scope: 'interior', domain: 'SURFACE', uom: 'LF', name: 'BASEBOARD' });
  });
  it('parses a compound EA_SIDE uom', () => {
    expect(parsePsKey('PS_SURFACE_EA_SIDE.DOOR_SLAB')).toEqual({ scope: 'interior', domain: 'SURFACE', uom: 'EA_SIDE', name: 'DOOR_SLAB' });
  });
  it('parses a meta key whose uom is after the first dot', () => {
    expect(parsePsKey('PS_META.EA.ROOMS_TOTAL')).toEqual({ scope: 'interior', domain: 'META', uom: 'EA', name: 'ROOMS_TOTAL' });
  });
  it('parses a non-geometry meta uom', () => {
    expect(parsePsKey('PS_META.TEXT.HEIGHT_BAND')).toEqual({ scope: 'interior', domain: 'META', uom: 'TEXT', name: 'HEIGHT_BAND' });
  });
  it('parses a fixed-uom protection key', () => {
    expect(parsePsKey('PS_PROTECT_FIXED.CONTAINMENT')).toEqual({ scope: 'interior', domain: 'PROTECT', uom: 'FIXED', name: 'CONTAINMENT' });
  });
  it('keeps a dotted name intact', () => {
    expect(parsePsKey('PS_PROTECT_EA.ASSET.HARDWARE')).toEqual({ scope: 'interior', domain: 'PROTECT', uom: 'EA', name: 'ASSET.HARDWARE' });
  });
  it('flags exterior scope and strips EXT_', () => {
    expect(parsePsKey('PS_EXT_SURFACE_SF.SIDING_FIELD')).toEqual({ scope: 'exterior', domain: 'SURFACE', uom: 'SF', name: 'SIDING_FIELD' });
  });
  it('parses an exterior meta enum', () => {
    expect(parsePsKey('PS_EXT_META.ENUM.ACCESS_TYPE')).toEqual({ scope: 'exterior', domain: 'META', uom: 'ENUM', name: 'ACCESS_TYPE' });
  });
  it('parses the exterior door oddball', () => {
    expect(parsePsKey('PS_EXT_DOOR_EA.TOTAL')).toEqual({ scope: 'exterior', domain: 'DOOR', uom: 'EA', name: 'TOTAL' });
  });
  it('treats a non-PS sentinel as special', () => {
    expect(parsePsKey('MANUAL_CAPTURE')).toEqual({ scope: 'special', domain: 'SPECIAL', uom: null, name: 'MANUAL_CAPTURE' });
  });
  it('handles empty input', () => {
    expect(parsePsKey('')).toEqual({ scope: 'special', domain: 'SPECIAL', uom: null, name: '' });
  });
});

describe('humanize', () => {
  it('turns a key name into a sentence-cased title', () => {
    expect(humanize('CABINET_DOOR')).toBe('Cabinet door');
  });
  it('collapses dots and underscores', () => {
    expect(humanize('ASSET.HARDWARE')).toBe('Asset hardware');
  });
  it('returns empty string for falsy input', () => {
    expect(humanize('')).toBe('');
  });
});
