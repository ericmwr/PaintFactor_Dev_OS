import { deriveRoom } from './derive-room.js';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import { SPEC_SUBSTRATE_MAP } from '../data/spec-maps.js';
import { isSpecStateCompatible } from './spec-compatibility.js';
import { resolveProduct } from './product-resolver.js';

/**
 * Default exterior coverage profiles (flat model).
 * Keyed by spec family ID → { primer, finish } each with { sfPerGal, coats }.
 * Derived from research: substrate-specific primer rates, profile-adjusted finish rates.
 * Will be replaced by DB-driven profiles when exterior materials are imported.
 */
const EXT_COVERAGE_DEFAULTS = {
  // ── Siding specs ──
  SF_WOOD_SIDING_EXT_NC_PAINT:    { primer: { sfPerGal: 300, coats: 1 }, finish: { sfPerGal: 350, coats: 2 } },
  SF_SIDING_ENGINEERED_EXT_NC:    { primer: { sfPerGal: 350, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  SF_SIDING_FIBERCEMENT_EXT_NC:   { primer: { sfPerGal: 350, coats: 1 }, finish: { sfPerGal: 350, coats: 2 } },
  SF_SIDING_VINYL_EXT_RP:         { primer: null,                        finish: { sfPerGal: 400, coats: 2 } },
  SF_SIDING_ALUMINUM_EXT_RP:      { primer: { sfPerGal: 350, coats: 1 }, finish: { sfPerGal: 400, coats: 2 } },
  SF_SIDING_WOOD_EXT_RP:          { primer: { sfPerGal: 275, coats: 1 }, finish: { sfPerGal: 325, coats: 2 } },
  // ── Trim / Soffit ──
  SF_TRIM_EXT_NC:                  { primer: { sfPerGal: 400, coats: 1 }, finish: { sfPerGal: 400, coats: 2 } },
  SF_TRIM_EXT_RP:                  { primer: { sfPerGal: 350, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  SF_SOFFIT_EXT_NC:                { primer: { sfPerGal: 375, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  // ── Masonry / Stucco / Foundation ──
  SF_STUCCO_EXT_NC:                { primer: { sfPerGal: 200, coats: 1 }, finish: { sfPerGal: 200, coats: 2 } },
  SF_MASONRY_EXT_NC:               { primer: { sfPerGal: 200, coats: 1 }, finish: { sfPerGal: 250, coats: 2 } },
  SF_FOUNDATION_EXT_NC:            { primer: { sfPerGal: 250, coats: 1 }, finish: { sfPerGal: 300, coats: 2 } },
  // ── Doors / Windows / Garage ──
  SF_DOOR_EXT_NC:                  { primer: { sfPerGal: 400, coats: 1 }, finish: { sfPerGal: 400, coats: 2 } },
  SF_DOOR_EXT_RP:                  { primer: { sfPerGal: 350, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  SF_WINDOW_EXT_NC:                { primer: { sfPerGal: 400, coats: 1 }, finish: { sfPerGal: 400, coats: 2 } },
  SF_GARAGE_DOOR_EXT_NC:           { primer: { sfPerGal: 375, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  // ── Deck / Fence (stain — no primer typically) ──
  SF_DECK_EXT:                     { primer: null,                        finish: { sfPerGal: 250, coats: 2 } },
  SF_FENCE_EXT:                    { primer: null,                        finish: { sfPerGal: 275, coats: 2 } },
  // ── Porch / Metal ──
  SF_PORCH_CEILING_EXT_NC:         { primer: { sfPerGal: 375, coats: 1 }, finish: { sfPerGal: 375, coats: 2 } },
  SF_PORCH_FLOOR_EXT_NC:           { primer: { sfPerGal: 300, coats: 1 }, finish: { sfPerGal: 300, coats: 2 } },
  SF_METAL_EXT:                    { primer: { sfPerGal: 400, coats: 1 }, finish: { sfPerGal: 400, coats: 2 } },
  // ── Caulking (tube-based, not gallon — handled as consumable, skip material estimate) ──
  SF_CAULK_EXT:                    null,
};

/**
 * Spray loss factors by application method.
 */
const SPRAY_LOSS_BY_METHOD = {
  spray:            0.12,  // pure airless — 10-15% loss
  spray_backbrush:  0.06,  // spray + back-roll recovers overspray
  brush:            0.02,
  roll:             0.03,
  brush_roll:       0.03,
};

/**
 * Compute material estimates from coverage profiles.
 */
export function computeMaterialEstimates(state, db, roomLookups, specResults = []) {
  const estimates = [];
  const { project, rooms } = state;
  const SPRAY_LOSS_FACTOR = 0.05; // 5% material loss for spray application

  // Only produce material estimates for specs the hours engine actually activated
  const activatedSpecs = new Set(specResults.map(sr => sr.specId));

  // Resolve project-level config
  const defaultQT = project.default_quality_tier || 'QT3';
  const defaultTexture = 'smooth';
  const defaultMethod = 'brush';
  const isSpray = defaultMethod.includes('spray');

  // Product resolver context
  const resolverCtx = {
    quality_tier: defaultQT,
    brand_preference: project.default_brand || null,
  };
  const overrides = project.material_overrides || { system: {}, manual: {} };

  // Build per-spec quantity totals, filtering rooms by substrate-state compatibility
  // and the substrate's painting flag — mirrors run-estimate.js per-room activation.
  // This prevents (e.g.) wall primer from being calculated against rooms whose walls
  // are field_primed when only one room is bare_drywall.
  function buildSpecScopedQty(specId) {
    const scoped = new Map();
    rooms.forEach((room, ri) => {
      // Substrate state compatibility (e.g. trim prime spec only counts bare_wood rooms)
      if (!isSpecStateCompatible(specId, room)) return;
      // Painting toggle guard for substrates that have one (doors, windows, casings)
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      if (primarySub) {
        const subConfig = (room.substrates || {})[primarySub];
        if (subConfig && subConfig.painting === false) return;
      }
      const roomLookup = roomLookups.get(ri);
      const roomQty = roomLookup?.qty || roomLookup;
      if (!roomQty) return;
      roomQty.forEach((val, key) => {
        const existing = scoped.get(key);
        if (existing) existing.value += val.value;
        else scoped.set(key, { ...val });
      });
    });
    return scoped;
  }

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
    // Skip specs that weren't activated by the hours engine
    if (activatedSpecs.size > 0 && !activatedSpecs.has(specId)) return;

    const specProfiles = db.material_coverage_profiles.filter(cp => cp.spec_family_id === specId);
    const specSystems = systemsBySpec[specId] || [];

    // Determine which PaintScope keys this spec uses (from spec_required_inputs)
    const specInputs = (db.spec_required_inputs || []).filter(i => i.spec_family_id === specId);
    const psKeys = specInputs.map(i => i.paintscope_key);

    // For material calculation, only sum SURFACE keys (the actual paintable area).
    // Exclude edge, protection, meta, and opening keys — those drive task hours, not material coverage.
    const surfaceKeys = psKeys.filter(k => k && k.startsWith('PS_SURFACE_'));

    // Build spec-scoped quantity total: only rooms whose substrate state is compatible
    // with this spec contribute. Fixes primer over-calculation across all rooms.
    const scopedQty = buildSpecScopedQty(specId);

    // Check if this spec has matching quantities
    let specSF = 0;
    let matchedKey = null;
    surfaceKeys.forEach(k => {
      const q = scopedQty.get(k);
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

    // Determine which systems to resolve for this spec.
    // Stain/clear specs need multiple systems (stain + sealer + clear coat).
    // Paint specs need one system matched by QT + sheen.
    const isStainSpec = specId.includes('STAIN');
    let matchedSystems = [];

    if (isStainSpec) {
      // Stain specs: match ALL systems whose coating_type applies
      // For stain_clear projects: stain + sealer + clear coat
      // For stain_only: just stain
      // For clear_only: sealer + clear coat
      // Pick first system per role (stain, sealer, clear)
      const seenRoles = new Set();
      specSystems.forEach(ms => {
        const aw = typeof ms.applies_when === 'string' ? JSON.parse(ms.applies_when) : (ms.applies_when || {});
        // Determine role from system ID
        let role = 'stain';
        if (ms.id.includes('SEALER')) role = 'sealer';
        else if (ms.id.includes('CLEAR') || ms.id.includes('POLY') || ms.id.includes('LACQUER')) role = 'clear';
        if (!seenRoles.has(role)) {
          seenRoles.add(role);
          matchedSystems.push({ system: ms, role });
        }
      });
    } else {
      // Paint/prime specs: match one system by QT + sheen
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
      if (!matchedSystem && specSystems.length > 0) {
        matchedSystem = specSystems[0];
      }
      if (matchedSystem) {
        matchedSystems.push({ system: matchedSystem, role: 'finish' });
      }
    }

    // Emit one estimate per matched system
    matchedSystems.forEach(({ system: matchedSystem, role }) => {
      // Get coats from material_system_products
      let coats = 1;
      if (matchedSystem) {
        const products = productsBySystem[specId + '::' + matchedSystem.id] || [];
        if (products.length > 0) {
          const finishProd = products.find(p => (p.product_role || '').includes('finish')) || products[0];
          if (finishProd.coats_required) coats = finishProd.coats_required;
        }
      }

      // Find coverage profile matching system + texture
      let matchedProfile = null;
      specProfiles.forEach(cp => {
        let cpSystems = cp.material_system;
        if (typeof cpSystems === 'string') {
          try { cpSystems = JSON.parse(cpSystems); } catch(e) { cpSystems = [cpSystems]; }
        }
        if (!Array.isArray(cpSystems)) cpSystems = [cpSystems];
        const systemMatch = !matchedSystem || cpSystems.includes(matchedSystem.id);

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

      // Try to resolve a real catalog product (primary path)
      let coverageRate = null;
      let productInfo = {
        productId: null,
        productName: matchedSystem ? matchedSystem.name : '(unknown)',
        brand: null,
        resolvedBy: 'db_fallback',
        pricePerGallon: null,
      };

      if (matchedSystem) {
        const resolved = resolveProduct(matchedSystem.id, resolverCtx, overrides);
        if (resolved && resolved.coverage_sf_per_gallon) {
          coverageRate = resolved.coverage_sf_per_gallon;
          productInfo = {
            productId: resolved.product_id,
            productName: resolved.product_name,
            brand: resolved.brand,
            resolvedBy: resolved.resolved_by,
            pricePerGallon: resolved.price_per_gallon || null,
          };
        }
      }

      // Fallback: use DB coverage profile
      if (!coverageRate && matchedProfile && matchedProfile.coverage_sf_per_gallon) {
        coverageRate = matchedProfile.coverage_sf_per_gallon;
      }

      if (!coverageRate) return; // No coverage data — skip

      // Compute gallons
      const rawGallons = (specSF * coats) / coverageRate;
      const sprayMultiplier = isSpray ? (1 / (1 - SPRAY_LOSS_FACTOR)) : 1;
      const gallons = rawGallons * sprayMultiplier;

      estimates.push({
        specFamilyId: specId,
        systemId: matchedSystem ? matchedSystem.id : null,
        systemName: matchedSystem ? matchedSystem.name : '(unknown)',
        ...productInfo,
        productRole: role,
        surfaceTexture: defaultTexture,
        totalSF: Math.round(specSF),
        coverageRate: coverageRate,
        coats: coats,
        gallonsRaw: Math.round(gallons * 10) / 10,
        gallons: Math.ceil(gallons),
        totalCost: productInfo.pricePerGallon
          ? Math.round(Math.ceil(gallons) * productInfo.pricePerGallon * 100) / 100 : null,
        sprayLoss: isSpray ? SPRAY_LOSS_FACTOR : 0,
        psKey: matchedKey
      });
    });
  });

  return estimates;
}

/**
 * Compute exterior material estimates using flat default coverage profiles.
 * Processes elevation lookups + standalone lookups from the exterior engine.
 *
 * @param {Object} state — full app state
 * @param {Object} db — DB_BUNDLE
 * @param {Map} elevLookups — from buildElevationQuantityLookups
 * @param {Map} standaloneLookups — from buildStandaloneQuantityLookups
 * @param {Array} extSpecResults — exterior spec results from runEstimate (for activation check)
 * @returns {Array} material estimate entries (same shape as interior estimates)
 */
export function computeExteriorMaterialEstimates(state, db, elevLookups, standaloneLookups, extSpecResults) {
  const estimates = [];
  const exterior = state.exterior;
  if (!exterior) return estimates;

  const extDefaults = exterior.defaults || {};
  const extMethod = extDefaults.application_method || 'spray_backbrush';
  const sprayLoss = SPRAY_LOSS_BY_METHOD[extMethod] || 0.06;

  // Aggregate exterior quantities across all elevations + standalone items by PS key
  const totalExtQty = new Map();
  const addToTotal = (qty) => {
    qty.forEach((val, key) => {
      const existing = totalExtQty.get(key);
      if (existing) existing.value += val.value;
      else totalExtQty.set(key, { ...val });
    });
  };
  if (elevLookups) elevLookups.forEach(addToTotal);
  if (standaloneLookups) standaloneLookups.forEach(addToTotal);

  // For each activated exterior spec with default coverage profiles
  for (const sr of extSpecResults) {
    const specId = sr.specId;
    const coverageDefaults = EXT_COVERAGE_DEFAULTS[specId];
    if (!coverageDefaults) continue; // e.g., caulking — no material estimate

    // Derive distinct surface/edge PS keys from the spec's fired tasks.
    // This replaces the legacy db.spec_required_inputs lookup (stripped of
    // exterior rows in the SF_EXT_* db-bundle scrub) — scenario tasks already
    // carry psKey, so we get the same PS-key set without the db dependency.
    const psKeys = [...new Set(
      (sr.tasks || [])
        .map(t => t.psKey)
        .filter(k => k && (k.startsWith('PS_EXT_SURFACE_') || k.startsWith('PS_EXT_EDGE_')))
    )];

    let specQuantity = 0;
    let matchedKey = null;
    let matchedUom = 'SF';
    psKeys.forEach(k => {
      const q = totalExtQty.get(k);
      if (q && q.value > 0) {
        // Only count surface SF and edge LF keys for material estimation
        // Skip protection, meta, and opening count keys
        if (k.startsWith('PS_EXT_SURFACE_') || k.startsWith('PS_EXT_EDGE_')) {
          specQuantity += q.value;
          matchedKey = k;
          matchedUom = q.uom;
        }
      }
    });

    if (specQuantity <= 0) continue;

    // For LF-based specs (trim), convert to effective SF for material calc
    // LF items are typically ≤12" wide → 1 LF ≈ 1 SF for material purposes
    const effectiveSF = specQuantity; // LF→SF 1:1 per PCA P10 linear foot rule

    const sprayMultiplier = 1 / (1 - sprayLoss);

    // Emit primer estimate (if spec has primer)
    if (coverageDefaults.primer) {
      const rawGal = (effectiveSF * coverageDefaults.primer.coats) / coverageDefaults.primer.sfPerGal;
      const gallons = rawGal * sprayMultiplier;
      estimates.push({
        specFamilyId: specId,
        systemName: 'Exterior Primer (default)',
        productRole: 'primer',
        surfaceTexture: 'smooth',
        totalSF: Math.round(effectiveSF),
        coverageRate: coverageDefaults.primer.sfPerGal,
        coats: coverageDefaults.primer.coats,
        gallons: Math.round(gallons * 10) / 10,
        sprayLoss: sprayLoss,
        psKey: matchedKey,
        domain: 'exterior',
      });
    }

    // Emit finish estimate
    if (coverageDefaults.finish) {
      const rawGal = (effectiveSF * coverageDefaults.finish.coats) / coverageDefaults.finish.sfPerGal;
      const gallons = rawGal * sprayMultiplier;
      estimates.push({
        specFamilyId: specId,
        systemName: 'Exterior Finish (default)',
        productRole: 'finish',
        surfaceTexture: 'smooth',
        totalSF: Math.round(effectiveSF),
        coverageRate: coverageDefaults.finish.sfPerGal,
        coats: coverageDefaults.finish.coats,
        gallons: Math.round(gallons * 10) / 10,
        sprayLoss: sprayLoss,
        psKey: matchedKey,
        domain: 'exterior',
      });
    }
  }

  return estimates;
}
