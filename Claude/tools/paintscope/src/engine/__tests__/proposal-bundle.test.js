import { describe, it, expect } from 'vitest';
import { assembleBundle } from '../proposal-bundle.js';

const mockProfile = {
  company_name: 'Ideal Painting Company'
};

const mockState = {
  project: {
    name: 'Smith Residence',
    address: '123 Main St',
    client_name: 'Sarah Miller',
    default_quality_tier: 'QT3',
    new_construction: true
  },
  rooms: [
    { label: 'Master Bedroom', area_group: 'UPSTAIRS' }
  ]
};

const mockPricing = {
  bidPrice: 10689.25,
  mobilization: 150,
  travelCost: 19.50
};

const mockMultiQT = {
  lineItems: [
    {
      id: 'line_0_walls',
      roomIndex: 0,
      room: 'Master Bedroom',
      areaGroup: 'UPSTAIRS',
      domain: 'interior',
      substrate: 'walls',
      included: true,
      qualityTier: 'QT3',
      description: '2 coats SW Cashmere eggshell, spray + backroll',
      price: 485
    }
  ],
  qtOptions: {
    line_0_walls: {
      availableTiers: ['QT3', 'QT4'],
      options: {
        QT3: { product: 'SW Cashmere', coats: 2, method: 'spray + backroll', description: '2 coats SW Cashmere eggshell, spray + backroll', price: 485 },
        QT4: { product: 'SW Emerald', coats: 2, method: 'spray + backroll', description: '2 coats SW Emerald eggshell, spray + backroll', price: 680 }
      }
    }
  }
};

describe('assembleBundle', () => {
  it('produces a valid bundle with all required sections', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);

    expect(bundle.meta.exportVersion).toBe('1.0.0');
    expect(bundle.meta.source).toBe('PaintScope');
    expect(bundle.company.name).toBe('Ideal Painting Company');
    expect(bundle.project.name).toBe('Smith Residence');
    expect(bundle.project.clientName).toBe('Sarah Miller');
    expect(bundle.project.defaultQT).toBe('QT3');
    expect(bundle.originalScope.bidPrice).toBe(10689.25);
    expect(bundle.originalScope.items).toHaveLength(1);
    expect(bundle.originalScope.items[0].id).toBe('line_0_walls');
    expect(bundle.qtOptions.line_0_walls.availableTiers).toEqual(['QT3', 'QT4']);
    expect(bundle.projectCharges.mobilization).toBe(150);
  });

  it('includes color assumptions with null values', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);
    expect(bundle.colorAssumptions.ceilings.colorName).toBeNull();
    expect(bundle.colorAssumptions.trim.colorCode).toBeNull();
  });

  it('strips internal fields from line items', () => {
    const bundle = assembleBundle(mockState, mockProfile, mockPricing, mockMultiQT);
    const item = bundle.originalScope.items[0];
    expect(item.specFamilyId).toBeUndefined();
    expect(item.id).toBe('line_0_walls');
    expect(item.substrate).toBe('walls');
  });
});
