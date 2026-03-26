// ============================================================
// FIXTURE PROTECTION DATA TABLE (v1.0)
// Encodes Fixture_Protection_Scenarios.md as machine-readable
// lookup data for the estimation engine.
//
// Only bathroom fixtures have context-dependent scenarios.
// Kitchen/feature fixtures use defaultProtection from fixture-catalog.js.
// ============================================================

/**
 * Maps spec family ID → painting context category.
 * Used to determine which fixture protection scenario applies.
 */
export const SPEC_PAINTING_CONTEXT = {
  'SF_DRYWALL_CEILING_NC_PRIME':  'ceiling',
  'SF_DRYWALL_CEILING_NC_FINISH': 'ceiling',
  'SF_WOOD_CEILING_NC':           'ceiling',
  'SF_DRYWALL_WALL_NC_PRIME':     'walls',
  'SF_DRYWALL_WALL_NC_FINISH':    'walls',
  'SF_WOOD_WALL_NC':              'walls',
  'SF_WAINSCOT_PANEL_NC':         'walls',
  'SF_BUILTIN_NC':                'walls',
  'SF_CABINET_NC_PAINT':          'walls',
  'SF_ARCH_ELEMENT_NC':           'walls',
  'SF_TRIM_NC_PRIME':             'trim',
  'SF_TRIM_NC_PAINT':             'trim',
  'SF_DOOR_SLAB_INT_NC':          'trim',
  'SF_DOOR_FRAME_NC_FINISH':      'trim',
  'SF_WINDOW_INT_NC':             'trim',
  'SF_STAIR_RISER_NC':            'stairway',
  'SF_STAIR_RAILING_NC':          'stairway',
  'SF_CLOSET_SHELF_NC':           'trim',
};

/**
 * Fixture protection scenarios — doctrine matrices encoded as data.
 *
 * Structure: fixture → context → method_category → scenario
 *
 * mechanism='task' entries produce setup + teardown time entries.
 * mechanism='modifier' entries produce a production penalty entry.
 *
 * Rates are DRAFT — need field calibration.
 * Minutes are per fixture instance per room.
 */
export const FIXTURE_PROTECTION_SCENARIOS = {
  toilet: {
    ceiling: {
      spray: { level: 'item_mask', mechanism: 'task', setup_min: 5, teardown_min: 3 },
    },
    walls: {
      spray:      { level: 'full_cover', mechanism: 'task', setup_min: 8, teardown_min: 5 },
      brush_roll: { level: 'none', mechanism: 'modifier', added_min: 6 },
    },
    trim: {
      spray:      { level: 'full_cover', mechanism: 'task', setup_min: 8, teardown_min: 5 },
      brush_roll: { level: 'none', mechanism: 'modifier', added_min: 4 },
    },
  },

  shower: {
    ceiling: {
      spray: { level: 'full_cover', mechanism: 'task', setup_min: 15, teardown_min: 8 },
    },
    walls: {
      spray:      { level: 'full_cover', mechanism: 'task', setup_min: 15, teardown_min: 8 },
      brush_roll: { level: 'none', mechanism: 'modifier', added_min: 4 },
    },
    trim: {
      spray: { level: 'partial_cover', mechanism: 'task', setup_min: 8, teardown_min: 4 },
    },
  },

  bathtub: {
    ceiling: {
      spray: { level: 'full_cover', mechanism: 'task', setup_min: 12, teardown_min: 6 },
    },
    walls: {
      spray:      { level: 'full_cover', mechanism: 'task', setup_min: 12, teardown_min: 6 },
      brush_roll: { level: 'none', mechanism: 'modifier', added_min: 4 },
    },
    trim: {
      spray: { level: 'full_cover', mechanism: 'task', setup_min: 12, teardown_min: 6 },
    },
  },

  vanity: {
    walls: {
      spray:      { level: 'partial_cover', mechanism: 'task', setup_min: 8, teardown_min: 4 },
      brush_roll: { level: 'none', mechanism: 'modifier', added_min: 3 },
    },
    trim: {
      spray: { level: 'partial_cover', mechanism: 'task', setup_min: 8, teardown_min: 4 },
    },
  },
};

/**
 * Returns true if the application method is a spray variant.
 * spray, spray_backroll, spray_rolloff → true
 * brush, roll, brush_roll → false
 */
export function isSprayMethod(method) {
  return method != null && method.startsWith('spray');
}

/**
 * Resolve the fixture protection scenario for a given fixture, painting context, and method.
 * Returns the scenario object { level, mechanism, setup_min?, teardown_min?, added_min? }
 * or null if no context-dependent scenario exists for this combination.
 */
export function resolveFixtureScenario(fixtureId, paintingContext, applicationMethod) {
  const fixtureScenarios = FIXTURE_PROTECTION_SCENARIOS[fixtureId];
  if (!fixtureScenarios) return null;

  const contextScenarios = fixtureScenarios[paintingContext];
  if (!contextScenarios) return null;

  const methodCategory = isSprayMethod(applicationMethod) ? 'spray' : 'brush_roll';
  return contextScenarios[methodCategory] || null;
}
