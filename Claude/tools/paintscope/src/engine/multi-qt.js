import { QUALITY_TIER_EFFECTS } from '../data/scenario-rate-data.js';

/**
 * Build a deterministic line item ID.
 * @param {number} roomIndex
 * @param {string} substrate
 * @returns {string} e.g., "line_0_walls"
 */
export function buildLineItemId(roomIndex, substrate) {
  return `line_${roomIndex}_${substrate}`;
}

/**
 * Build a product-forward description string.
 * @param {{ coats: number, productName: string, sheen: string, method: string }} params
 * @returns {string} e.g., "2 coats SW Cashmere eggshell, spray + backroll"
 */
export function buildDescription({ coats, productName, sheen, method }) {
  const coatWord = coats === 1 ? 'coat' : 'coats';
  return `${coats} ${coatWord} ${productName} ${sheen}, ${method}`;
}

/**
 * Extract available quality tiers for a spec family.
 * Reads from the QUALITY_TIER_EFFECTS module by default (one row per spec × QT).
 * An explicit `rows` array can be injected for testing.
 *
 * @param {string} specFamilyId - e.g., 'SF_DRYWALL_WALL_NC_FINISH'
 * @param {Array} [rows=QUALITY_TIER_EFFECTS] - rows to filter (injectable for tests)
 * @returns {string[]} sorted unique tier values
 */
export function collectAvailableTiers(specFamilyId, rows = QUALITY_TIER_EFFECTS) {
  return rows.filter(r => r.spec_family_id === specFamilyId).map(r => r.quality_tier).sort();
}

/**
 * Map spec family IDs to substrate display keys.
 */
const SPEC_TO_SUBSTRATE = {
  SF_DRYWALL_WALL_NC_FINISH: 'walls',
  SF_DRYWALL_WALL_NC_PRIME: 'walls_prime',
  SF_DRYWALL_CEILING_NC_FINISH: 'ceiling',
  SF_DRYWALL_CEILING_NC_PRIME: 'ceiling_prime',
  SF_DOOR_SLAB_INT_NC: 'doors',
  SF_DOOR_FRAME_NC_FINISH: 'door_frames',
  SF_WINDOW_INT_NC: 'windows',
  SF_STAIR_RISER_NC: 'stair_risers',
  SF_STAIR_RAILING_NC: 'stair_railing',
  SF_WAINSCOT_PANEL_NC: 'wainscot',
  SF_WOOD_WALL_NC: 'wood_walls',
  SF_WOOD_CEILING_NC: 'wood_ceiling',
  SF_ARCH_ELEMENT_NC: 'arch_elements',
  SF_BUILTIN_NC: 'builtins',
  SF_CABINET_NC_PAINT: 'cabinets',
  SF_CLOSET_SHELF_NC: 'closet_shelves'
};

/**
 * Derive substrate key from spec family ID.
 */
export function specToSubstrate(specFamilyId) {
  if (SPEC_TO_SUBSTRATE[specFamilyId]) return SPEC_TO_SUBSTRATE[specFamilyId];
  return specFamilyId.replace(/^SF_/, '').toLowerCase();
}

/**
 * Run multi-QT computation for all line items.
 *
 * For each substrate in each room, re-runs the estimate at every available QT
 * and collects { product, coats, method, description, price } per tier.
 *
 * @param {Function} runEstimateFn - The runEstimate function
 * @param {object} state - App state
 * @param {object} db - Database bundle
 * @param {object} profile - Company profile
 * @param {object} baseEstimate - The estimate at the project's default QT
 * @returns {{ lineItems: Array, qtOptions: object }}
 */
export function computeMultiQT(runEstimateFn, state, db, profile, baseEstimate) {
  if (!baseEstimate?.pricing?.lineItems) return { lineItems: [], qtOptions: {} };

  const qtOptions = {};
  const lineItems = [];

  for (const baseLine of baseEstimate.pricing.lineItems) {
    const substrate = specToSubstrate(baseLine.specFamilyId);
    const lineId = buildLineItemId(baseLine.roomIndex, substrate);

    // Find the spec's available tiers from quality_tier_effects
    const availableTiers = collectAvailableTiers(baseLine.specFamilyId);

    const baseMethod = resolveMethod(state, baseLine.roomIndex);
    const options = {};

    for (const qt of availableTiers) {
      const qtState = cloneStateWithQT(state, baseLine.roomIndex, qt);
      const qtEstimate = runEstimateFn(qtState, db, undefined, profile);

      const qtLine = qtEstimate?.pricing?.lineItems?.find(
        l => l.specFamilyId === baseLine.specFamilyId && l.roomIndex === baseLine.roomIndex
      );
      const qtMat = qtEstimate?.materialEstimates?.find(m => m.specFamilyId === baseLine.specFamilyId);

      options[qt] = {
        product: qtMat?.productName || 'TBD',
        coats: qtMat?.coats || 1,
        method: baseMethod,
        description: buildDescription({
          coats: qtMat?.coats || 1,
          productName: qtMat?.productName || 'TBD',
          sheen: qtMat?.sheen || '',
          method: baseMethod
        }),
        price: qtLine?.lineCost || 0
      };
    }

    const currentQT = resolveRoomQT(state, baseLine.roomIndex);

    lineItems.push({
      id: lineId,
      roomIndex: baseLine.roomIndex,
      room: baseLine.room,
      areaGroup: resolveAreaGroup(state, baseLine.roomIndex),
      domain: baseLine.domain,
      substrate,
      specFamilyId: baseLine.specFamilyId,
      included: true,
      qualityTier: currentQT,
      description: options[currentQT]?.description || baseLine.specName,
      price: options[currentQT]?.price || baseLine.lineCost
    });

    qtOptions[lineId] = { availableTiers, options };
  }

  return { lineItems, qtOptions };
}

// --- Internal helpers ---

function cloneStateWithQT(state, roomIndex, qt) {
  const cloned = JSON.parse(JSON.stringify(state));
  if (cloned.rooms?.[roomIndex]) {
    cloned.rooms[roomIndex].quality_tier = qt;
  }
  return cloned;
}

function resolveRoomQT(state, roomIndex) {
  return state.rooms?.[roomIndex]?.quality_tier || state.project?.default_quality_tier || 'QT3';
}

function resolveAreaGroup(state, roomIndex) {
  return state.rooms?.[roomIndex]?.area_group || 'MAIN';
}

function resolveMethod(state, roomIndex) {
  const method = state.rooms?.[roomIndex]?.application_method || 'spray_backroll';
  return method.replace(/_/g, ' + ').replace('spray + backroll', 'spray + backroll');
}
