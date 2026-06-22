import { describe, it, expect } from 'vitest';
import { parsePsKey, humanize, buildPsKeyCatalog, groupPsKeyCatalog, AUTOFILL_UOMS } from '../ps-key-catalog.js';
import canonicalBundle from '../scenario-bundle.gen.js';

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

const LABELS = {
  'PS_SURFACE_LF.BASEBOARD': 'Baseboard LF',
  'PS_SURFACE_SF.WALL_FIELD': 'Wall Field SF',
  'PS_META.EA.ROOMS_TOTAL': 'Total Rooms',
};

describe('buildPsKeyCatalog', () => {
  it('includes catalogued keys with label, flag, and parsed category', () => {
    const cat = buildPsKeyCatalog({ tasks: {} }, LABELS);
    const bb = cat.find(e => e.key === 'PS_SURFACE_LF.BASEBOARD');
    expect(bb).toMatchObject({ label: 'Baseboard LF', displayTitle: 'Baseboard LF', catalogued: true, uom: 'LF', categoryLabel: 'Surface · LF' });
  });
  it('adds in-use keys absent from labels, flagged uncatalogued with a humanized title', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: 'PS_SURFACE_EA.CABINET_DOOR' } } }, LABELS);
    const cab = cat.find(e => e.key === 'PS_SURFACE_EA.CABINET_DOOR');
    expect(cab).toMatchObject({ catalogued: false, label: null, displayTitle: 'Cabinet door', uom: 'EA', categoryLabel: 'Surface · EA' });
  });
  it('dedups a key present in both labels and the bundle, keeping the catalogued entry', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: 'PS_SURFACE_LF.BASEBOARD' } } }, LABELS);
    const hits = cat.filter(e => e.key === 'PS_SURFACE_LF.BASEBOARD');
    expect(hits).toHaveLength(1);
    expect(hits[0].catalogued).toBe(true);
  });
  it('skips empty/missing ps_key on tasks', () => {
    const cat = buildPsKeyCatalog({ tasks: { T1: { ps_key: '' }, T2: {} } }, LABELS);
    expect(cat).toHaveLength(Object.keys(LABELS).length);
  });
  it('surfaces a real in-use-but-uncatalogued key from the live bundle', () => {
    const cat = buildPsKeyCatalog(canonicalBundle, {}); // empty labels -> every key uncatalogued
    const cab = cat.find(e => e.key === 'PS_SURFACE_EA.CABINET_DOOR');
    expect(cab).toBeDefined();
    expect(cab.catalogued).toBe(false);
  });
});

describe('groupPsKeyCatalog', () => {
  it('orders interior before exterior before special; splits geometry by uom; sorts entries by title', () => {
    const cat = buildPsKeyCatalog({
      tasks: {
        A: { ps_key: 'PS_EXT_SURFACE_SF.SIDING_FIELD' },
        B: { ps_key: 'MANUAL_CAPTURE' },
        C: { ps_key: 'PS_SURFACE_LF.CROWN' },
        D: { ps_key: 'PS_SURFACE_LF.BASEBOARD' },
        E: { ps_key: 'PS_SURFACE_SF.WALL_FIELD' },
      },
    }, {});
    const groups = groupPsKeyCatalog(cat);
    const labels = groups.map(g => g.categoryLabel);
    expect(labels[0]).toBe('Surface · SF');             // interior, SF before LF
    expect(labels[1]).toBe('Surface · LF');
    expect(labels).toContain('Exterior surface · SF');
    expect(labels[labels.length - 1]).toBe('Special');  // special last
    const lf = groups.find(g => g.categoryLabel === 'Surface · LF');
    expect(lf.entries.map(e => e.displayTitle)).toEqual(['Baseboard', 'Crown']); // alpha within category
  });
});

describe('AUTOFILL_UOMS', () => {
  it('contains geometry units and excludes non-geometry ones', () => {
    expect(AUTOFILL_UOMS.has('SF')).toBe(true);
    expect(AUTOFILL_UOMS.has('EA_SIDE')).toBe(true);
    expect(AUTOFILL_UOMS.has('TEXT')).toBe(false);
    expect(AUTOFILL_UOMS.has('FIXED')).toBe(false);
  });
});
