import { deriveRoom } from './derive-room.js';
import { SUBSTRATE_MAP, SUBSTRATE_APPLICATION_METHODS } from '../data/substrate-catalog.js';
import { SPEC_SUBSTRATE_MAP } from '../data/scenario-maps.js';
import { isSpecStateCompatible } from './scenario-compatibility.js';
import {
  MATERIAL_SYSTEMS,
  MATERIAL_COVERAGE_PROFILES,
  MATERIAL_SYSTEM_PRODUCTS,
} from '../data/scenario-rate-data.js';
import { resolveProduct } from './product-resolver.js';
import { buildRoleBySystemId, classifySystemRole } from './material-system-roles.js';
import { resolveSystem, resolveCoats as resolveOverrideCoats } from './material-overrides.js';

// Stain roles use the scenario's per-phase coat count (threaded via scenarioMaterials);
// paint roles (primer/finish) keep the existing resolveCoats path.
const STAIN_GALLON_ROLES = new Set(['stain', 'sealer', 'clear']);
const ROLE_TO_COAT_FIELD = { stain: 'stain_coats', sealer: 'sealer_coats', clear: 'clear_coats' };

// Resolve coats for a system, tolerant of array systems that lack a product row
// under the active spec family (e.g. closet references SYS_FF_STANDARD_ACRYLIC,
// whose products live under the cabinet/arch families). own-family → cross-family
// by id → default 1. `resolvedBy` is for the parity report.
export function resolveCoats(systemId, specId, productsBySystem, productsBySystemId, role) {
  let products = productsBySystem[specId + '::' + systemId];
  let resolvedBy = 'own-family';
  if (!products || products.length === 0) {
    products = productsBySystemId[systemId];
    resolvedBy = (products && products.length) ? 'cross-family' : 'default';
  }
  let coats = 1;
  if (products && products.length > 0) {
    const prod = products.find(p => (p.product_role || '').includes(role)) || products[0];
    if (prod.coats_required) coats = prod.coats_required;
  }
  return { coats, resolvedBy };
}

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
export function computeMaterialEstimates(state, roomLookups, specResults = [], scenarioMaterials = {}) {
  const estimates = [];
  const { project, rooms } = state;
  const SPRAY_LOSS_FACTOR = 0.05; // 5% material loss for spray application

  // Only produce material estimates for specs the hours engine actually activated
  const activatedSpecs = new Set(specResults.map(sr => sr.specId));

  // Resolve project-level config
  const defaultQT = project.default_quality_tier || 'QT3';
  const defaultTexture = 'smooth';
  // Project-wide default method for spray-loss math. The Setup application-method
  // dropdown was removed, but the prior effective default here was spray_backroll
  // (project.default_application_method defaulted to it), and walls/ceiling default
  // to spray_backroll in the catalog. Keep spray_backroll so the SPRAY_LOSS_FACTOR
  // overspray allowance still applies by default — NOT 'brush' (that silently
  // dropped ~5% material).
  const defaultMethod = 'spray_backroll';
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
  // P3: `finishGroup` partitions quantities. When set, only sums contributions from
  // rooms whose primary substrate for this spec carries the matching finish_group.
  // When null/undefined, sums all rooms (backward-compat).
  function buildSpecScopedQty(specId, finishGroup) {
    const scoped = new Map();
    rooms.forEach((room, ri) => {
      if (!isSpecStateCompatible(specId, room)) return;
      const primarySub = SPEC_SUBSTRATE_MAP[specId];
      const subConfig = primarySub ? (room.substrates || {})[primarySub] : null;
      if (subConfig && subConfig.painting === false) return;
      // P3 partition: only count rooms whose substrate's finish_group matches.
      // If finishGroup is null/undefined, accept everything (legacy behavior).
      if (finishGroup !== undefined && finishGroup !== null) {
        const rowFg = subConfig?.finish_group ?? null;
        if (rowFg !== finishGroup) return;
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
  MATERIAL_SYSTEMS.forEach(ms => {
    if (!systemsBySpec[ms.spec_family_id]) systemsBySpec[ms.spec_family_id] = [];
    systemsBySpec[ms.spec_family_id].push(ms);
  });

  // Build a map: spec_family_id::system_id -> material_system_products
  const productsBySystem = {};
  MATERIAL_SYSTEM_PRODUCTS.forEach(msp => {
    const key = msp.spec_family_id + '::' + msp.system_id;
    if (!productsBySystem[key]) productsBySystem[key] = [];
    productsBySystem[key].push(msp);
  });

  // system_id -> material_system_products across ALL families (coats tolerance).
  const productsBySystemId = {};
  MATERIAL_SYSTEM_PRODUCTS.forEach(msp => {
    (productsBySystemId[msp.system_id] = productsBySystemId[msp.system_id] || []).push(msp);
  });

  // system_id -> product_role, so material selection is role-aware (primer vs finish).
  const roleBySystemId = buildRoleBySystemId(MATERIAL_SYSTEM_PRODUCTS);

  // specId → flattened scenario tasks (carries psKey) for PS-key derivation.
  const tasksBySpec = {};
  (specResults || []).forEach(sr => {
    if (!tasksBySpec[sr.specId]) tasksBySpec[sr.specId] = [];
    if (sr.tasks) tasksBySpec[sr.specId].push(...sr.tasks);
  });

  // P3: iterate per (specId, finishGroup) pair — scenarioMaterials is keyed
  // `${specId}|${finishGroup ?? '__none__'}` after the scenario-estimate rekey.
  // Specs that are ONLY in MATERIAL_COVERAGE_PROFILES (no scenarioMaterials entry)
  // will produce no lines; coverage-profile-only specs without a system array
  // can't produce gallon estimates anyway (empty matchedSystems → early return).
  Object.entries(scenarioMaterials || {}).forEach(([key, sysEntry]) => {
    // P3: derive specId + finishGroup from sysEntry (new format) or key (old compat format).
    // Backward-compat: material-array-selection.test.js + stain-material-coats.test.js
    // pass plain-specId keys (`SF_X`) with values lacking `specId`/`finishGroup`. The
    // shim below recovers those fields from the key. Migrate those test fixtures to the
    // new `${specId}|${fg}` key + `{specId, finishGroup, ...}` value shape to retire the shim.
    const specId = sysEntry.specId ?? key.split('|')[0];
    const finishGroup = 'finishGroup' in sysEntry
      ? sysEntry.finishGroup
      : (key.includes('|') ? (key.split('|')[1] === '__none__' ? null : key.split('|')[1]) : null);

    // Skip specs that weren't activated by the hours engine
    if (activatedSpecs.size > 0 && !activatedSpecs.has(specId)) return;

    const specProfiles = MATERIAL_COVERAGE_PROFILES.filter(cp => cp.spec_family_id === specId);
    const specSystems = systemsBySpec[specId] || [];

    // Determine which PaintScope keys this spec uses — derived from the spec's
    // fired scenario tasks (which carry psKey), replacing the dropped
    // db.spec_required_inputs lookup. Mirrors the exterior path. Only SURFACE
    // keys drive material coverage (edge/protection/meta/opening keys drive hours).
    const surfaceKeys = [...new Set(
      (tasksBySpec[specId] || [])
        .map(t => t.psKey)
        .filter(k => k && k.startsWith('PS_SURFACE_'))
    )];

    // Build spec-scoped quantity total: only rooms whose substrate state is compatible
    // with this spec (and matching finishGroup) contribute.
    const scopedQty = buildSpecScopedQty(specId, finishGroup);

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

    // System selection comes from the governing scenario's material_systems array
    // (Phase 3), grouped by role — NOT the catalog matcher. Absent/empty → no lines.
    // Broadened regex: decomposed _STAIN / _SEALER / _CLEAR specIds must also use baseRole 'stain'.
    const isStainSpec = /_(STAIN|SEALER|CLEAR)$/.test(specId) || specId.includes('STAIN');
    const systemIds = (sysEntry && sysEntry.systems) || [];
    const seenRoles = new Set();
    const matchedSystems = [];
    for (const sysId of systemIds) {
      const role = classifySystemRole(sysId, roleBySystemId, isStainSpec ? 'stain' : 'finish');
      if (seenRoles.has(role)) continue;                       // one system per role (representative)
      seenRoles.add(role);
      const system = (systemsBySpec[specId] || []).find(s => s.id === sysId) || { id: sysId, name: sysId };
      matchedSystems.push({ system, role });
    }
    if (matchedSystems.length === 0) return; // empty array → no materials for this spec

    // Emit one estimate per matched system
    matchedSystems.forEach(({ system: matchedSystem, role }) => {
      // P3: project-level override applies first (replaces matchedSystem id when set).
      const overrideSystemId = resolveSystem(role, finishGroup, project.material_overrides, matchedSystem ? matchedSystem.id : null);
      if (matchedSystem && overrideSystemId && overrideSystemId !== matchedSystem.id) {
        matchedSystem = MATERIAL_SYSTEMS.find(s => s.id === overrideSystemId) || { id: overrideSystemId, name: overrideSystemId };
      } else if (!matchedSystem && overrideSystemId) {
        matchedSystem = MATERIAL_SYSTEMS.find(s => s.id === overrideSystemId) || { id: overrideSystemId, name: overrideSystemId };
      }

      // Get base coats: stain/sealer/clear roles track scenarioMaterials.coats;
      // paint roles keep the existing resolveCoats(prod) path.
      let baseCoats;
      if (STAIN_GALLON_ROLES.has(role)) {
        baseCoats = sysEntry?.coats?.[ROLE_TO_COAT_FIELD[role]] ?? 1;
      } else {
        baseCoats = matchedSystem
          ? resolveCoats(matchedSystem.id, specId, productsBySystem, productsBySystemId, role).coats
          : 1;
      }
      // P3: layer the override on top (works uniformly for stain + paint roles).
      let coats = resolveOverrideCoats(role, finishGroup, project.material_overrides, baseCoats);

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
        finishGroup: finishGroup ?? null,
        system: matchedSystem ? { id: matchedSystem.id, name: matchedSystem.name } : null,
        systemId: matchedSystem ? matchedSystem.id : null,
        systemName: matchedSystem ? matchedSystem.name : '(unknown)',
        ...productInfo,
        productRole: role,
        surfaceTexture: defaultTexture,
        totalSF: Math.round(specSF),
        surfaceSF: Math.round(specSF),
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
 * @param {Map} elevLookups — from buildElevationQuantityLookups
 * @param {Map} standaloneLookups — from buildStandaloneQuantityLookups
 * @param {Array} extSpecResults — exterior spec results from runEstimate (for activation check)
 * @returns {Array} material estimate entries (same shape as interior estimates)
 */
export function computeExteriorMaterialEstimates(state, elevLookups, standaloneLookups, extSpecResults) {
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
