import { deriveRoom } from './derive-room.js';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';

/**
 * Compute material estimates from coverage profiles.
 */
export function computeMaterialEstimates(state, db, roomLookups) {
  const estimates = [];
  const { project, rooms } = state;
  const SPRAY_LOSS_FACTOR = 0.05; // 5% material loss for spray application

  // Resolve project-level config
  const defaultQT = project.default_quality_tier || 'QT3';
  const defaultTexture = project.default_texture || 'smooth';
  const defaultMethod = project.default_application_method || 'brush';
  const isSpray = defaultMethod.includes('spray');

  // Aggregate quantities across all rooms by spec family
  // We need per-spec quantities to match coverage profiles to specs
  const totalQty = new Map();
  roomLookups.forEach((roomQty) => {
    roomQty.forEach((val, key) => {
      const existing = totalQty.get(key);
      if (existing) existing.value += val.value;
      else totalQty.set(key, { ...val });
    });
  });

  // Build a map: spec_family_id -> list of applicable material systems
  const systemsBySpec = {};
  (db.material_systems || []).forEach(ms => {
    if (!systemsBySpec[ms.spec_family_id]) systemsBySpec[ms.spec_family_id] = [];
    systemsBySpec[ms.spec_family_id].push(ms);
  });

  // Build a map: spec_family_id::system_id -> material_system_products
  const productsBySystem = {};
  (db.material_system_products || []).forEach(msp => {
    const key = msp.spec_family_id + '::' + msp.system_id;
    if (!productsBySystem[key]) productsBySystem[key] = [];
    productsBySystem[key].push(msp);
  });

  // For each spec family with coverage profiles, resolve materials
  const specFamilyIds = [...new Set(db.material_coverage_profiles.map(cp => cp.spec_family_id))];

  specFamilyIds.forEach(specId => {
    const specProfiles = db.material_coverage_profiles.filter(cp => cp.spec_family_id === specId);
    const specSystems = systemsBySpec[specId] || [];

    // Determine which PaintScope keys this spec uses (from spec_required_inputs)
    const specInputs = (db.spec_required_inputs || []).filter(i => i.spec_family_id === specId);
    const psKeys = specInputs.map(i => i.paintscope_key);

    // Check if this spec has matching quantities
    let specSF = 0;
    let matchedKey = null;
    psKeys.forEach(k => {
      const q = totalQty.get(k);
      if (q && q.value > 0) {
        specSF += q.value;
        matchedKey = k;
      }
    });

    if (specSF <= 0) return; // No quantities for this spec

    // Resolve material system for this spec based on quality tier
    // Default sheen: eggshell (most common for walls), flat for ceilings/priming
    let defaultSheen = 'eggshell';
    if (specId.includes('CEILING')) defaultSheen = 'flat';
    if (specId.includes('PRIME')) defaultSheen = 'flat';
    if (specId.includes('TRIM') || specId.includes('DOOR') || specId.includes('CABINET') || specId.includes('WINDOW')) defaultSheen = 'semi-gloss';

    // Find matching system by quality tier + sheen
    let matchedSystem = null;
    specSystems.forEach(ms => {
      if (ms.applies_when) {
        const aw = typeof ms.applies_when === 'string' ? JSON.parse(ms.applies_when) : ms.applies_when;
        const qtMatch = !aw.quality_tier || aw.quality_tier.includes(defaultQT);
        const sheenMatch = !aw.finish_sheen || aw.finish_sheen.includes(defaultSheen);
        if (qtMatch && sheenMatch && !matchedSystem) {
          matchedSystem = ms;
        }
      }
    });

    // Fallback: pick first system for this spec
    if (!matchedSystem && specSystems.length > 0) {
      matchedSystem = specSystems[0];
    }

    // Get coats from material_system_products
    let coats = 1; // default
    if (matchedSystem) {
      const products = productsBySystem[specId + '::' + matchedSystem.id] || [];
      if (products.length > 0) {
        // Use the first product's coats (finish role preferred)
        const finishProd = products.find(p => (p.product_role || '').includes('finish')) || products[0];
        if (finishProd.coats_required) coats = finishProd.coats_required;
      }
    }

    // Find coverage profile matching system + texture
    let matchedProfile = null;
    specProfiles.forEach(cp => {
      // Check if coverage profile belongs to our matched system
      let cpSystems = cp.material_system;
      if (typeof cpSystems === 'string') {
        try { cpSystems = JSON.parse(cpSystems); } catch(e) { cpSystems = [cpSystems]; }
      }
      if (!Array.isArray(cpSystems)) cpSystems = [cpSystems];

      const systemMatch = !matchedSystem || cpSystems.includes(matchedSystem.id);

      // Check texture match
      let textures = cp.surface_texture;
      if (typeof textures === 'string') {
        try { textures = JSON.parse(textures); } catch(e) { textures = [textures]; }
      }
      if (!Array.isArray(textures)) textures = [textures];
      const textureMatch = textures.includes(defaultTexture);

      if (systemMatch && textureMatch && !matchedProfile) {
        matchedProfile = cp;
      }
    });

    // Fallback: use first profile for this spec + matched system
    if (!matchedProfile) {
      matchedProfile = specProfiles.find(cp => {
        let cpSystems = cp.material_system;
        if (typeof cpSystems === 'string') {
          try { cpSystems = JSON.parse(cpSystems); } catch(e) { cpSystems = [cpSystems]; }
        }
        if (!Array.isArray(cpSystems)) cpSystems = [cpSystems];
        return !matchedSystem || cpSystems.includes(matchedSystem.id);
      }) || specProfiles[0];
    }

    if (!matchedProfile || !matchedProfile.coverage_sf_per_gallon) return;

    // Compute gallons: (SF * coats) / coverage_rate / (1 - spray_loss)
    const rawGallons = (specSF * coats) / matchedProfile.coverage_sf_per_gallon;
    const sprayMultiplier = isSpray ? (1 / (1 - SPRAY_LOSS_FACTOR)) : 1;
    const gallons = rawGallons * sprayMultiplier;

    estimates.push({
      specFamilyId: specId,
      systemName: matchedSystem ? matchedSystem.name : '(unknown)',
      productRole: matchedProfile.product_role || 'finish',
      surfaceTexture: defaultTexture,
      totalSF: Math.round(specSF),
      coverageRate: matchedProfile.coverage_sf_per_gallon,
      coats: coats,
      gallons: Math.round(gallons * 10) / 10,
      sprayLoss: isSpray ? SPRAY_LOSS_FACTOR : 0,
      psKey: matchedKey
    });
  });

  return estimates;
}
