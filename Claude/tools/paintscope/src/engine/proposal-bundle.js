const EXPORT_VERSION = '1.0.0';

/**
 * Assemble a proposal export bundle from computed data.
 */
export function assembleBundle(state, profile, pricing, multiQT) {
  const project = state.project || {};
  const hasExterior = state.exterior?.elevations?.length > 0;
  const hasInterior = (state.rooms?.length || 0) > 0;

  let domain = 'interior';
  if (hasInterior && hasExterior) domain = 'both';
  else if (hasExterior) domain = 'exterior';

  return {
    meta: {
      exportVersion: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      projectId: project.id || `proj_${Date.now()}`,
      source: 'PaintScope'
    },

    company: {
      name: profile.company_name || 'Ideal Painting Company',
      phone: '(989) 657-5446',
      website: 'idealpaintingcompany.com'
    },

    project: {
      name: project.name || '',
      address: project.address || '',
      clientName: project.client_name || '',
      defaultQT: project.default_quality_tier || 'QT3',
      domain,
      newConstruction: project.new_construction || false
    },

    originalScope: {
      bidPrice: pricing.bidPrice,
      items: multiQT.lineItems.map(item => ({
        id: item.id,
        roomIndex: item.roomIndex,
        room: item.room,
        areaGroup: item.areaGroup,
        domain: item.domain,
        substrate: item.substrate,
        included: item.included,
        qualityTier: item.qualityTier,
        description: item.description,
        price: item.price
      }))
    },

    qtOptions: multiQT.qtOptions,

    colorAssumptions: {
      ceilings: { colorName: null, colorCode: null, hex: null },
      doors: { colorName: null, colorCode: null, hex: null },
      trim: { colorName: null, colorCode: null, hex: null },
      builtins: { colorName: null, colorCode: null, hex: null },
      other: { colorName: null, colorCode: null, hex: null }
    },

    projectCharges: {
      mobilization: pricing.mobilization || 0,
      travelCost: pricing.travelCost || 0
    }
  };
}
