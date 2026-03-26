// Maps spec_family_id to primary substrate ID for application_method resolution
export const SPEC_SUBSTRATE_MAP = {
  // ── Interior ──
  'SF_DRYWALL_WALL_NC_PRIME':    'walls',
  'SF_DRYWALL_WALL_NC_FINISH':   'walls',
  'SF_DRYWALL_CEILING_NC_PRIME': 'ceiling',
  'SF_DRYWALL_CEILING_NC_FINISH':'ceiling',
  'SF_TRIM_NC_PRIME':            'baseboard',
  'SF_TRIM_NC_PAINT':            'baseboard',
  'SF_DOOR_SLAB_INT_NC':         'doors',
  'SF_DOOR_FRAME_NC_FINISH':     'door_frames',
  'SF_WINDOW_INT_NC':            'windows',
  'SF_WAINSCOT_PANEL_NC':        'wainscoting',
  'SF_WOOD_WALL_NC':             'wood_feature_wall',
  'SF_WOOD_CEILING_NC':          'wood_ceiling',
  'SF_CLOSET_SHELF_NC':          'closet_shelving',
  'SF_ARCH_ELEMENT_NC':          'beams',
  'SF_BUILTIN_NC':               'builtins',
  'SF_STAIR_RISER_NC':           'stairway',
  'SF_STAIR_RAILING_NC':         'stairway',
  'SF_CABINET_NC_PAINT':         'doors',
  // ── Interior Stain/Clear ──
  'SF_TRIM_NC_STAIN':            'baseboard',
  'SF_DOOR_SLAB_INT_NC_STAIN':   'doors',
  'SF_DOOR_FRAME_NC_STAIN':      'door_frames',
  'SF_WINDOW_INT_NC_STAIN':      'windows',
  'SF_STAIR_RISER_NC_STAIN':     'stairway',
  'SF_STAIR_RAILING_NC_STAIN':   'stairway',
  'SF_WOOD_WALL_NC_STAIN':       'wood_feature_wall',
  'SF_WOOD_CEILING_NC_STAIN':    'wood_ceiling',
  'SF_WAINSCOT_PANEL_NC_STAIN':  'wainscoting',
  'SF_ARCH_ELEMENT_NC_STAIN':    'beams',
  // ── Exterior NC — maps to elevation/standalone source ──
  'SF_WOOD_SIDING_EXT_NC_PAINT':    'ext_siding',
  'SF_SIDING_FIBERCEMENT_EXT_NC':   'ext_siding',
  'SF_SIDING_ENGINEERED_EXT_NC':    'ext_siding',
  'SF_STUCCO_EXT_NC':               'ext_siding',
  'SF_MASONRY_EXT_NC':              'ext_siding',
  'SF_TRIM_EXT_NC':                 'ext_trim',
  'SF_SOFFIT_EXT_NC':               'ext_soffit',
  'SF_WINDOW_EXT_NC':               'ext_window',
  'SF_DOOR_EXT_NC':                 'ext_door',
  'SF_GARAGE_DOOR_EXT_NC':          'ext_garage_door',
  'SF_CAULK_EXT':                   'ext_caulk',
  'SF_DECK_EXT':                    'ext_deck',
  'SF_FENCE_EXT':                   'ext_fence',
  'SF_FOUNDATION_EXT_NC':           'ext_foundation',
  'SF_PORCH_CEILING_EXT_NC':        'ext_porch_ceiling',
  'SF_PORCH_FLOOR_EXT_NC':          'ext_porch_floor',
  'SF_METAL_EXT':                   'ext_metal',
  // ── Exterior RP ──
  'SF_SIDING_WOOD_EXT_RP':          'ext_siding',
  'SF_SIDING_ALUMINUM_EXT_RP':      'ext_siding',
  'SF_SIDING_VINYL_EXT_RP':         'ext_siding',
  'SF_SIDING_FIBERCEMENT_EXT_RP':   'ext_siding',
  'SF_SIDING_ENGINEERED_EXT_RP':    'ext_siding',
  'SF_STUCCO_EXT_RP':               'ext_siding',
  'SF_MASONRY_EXT_RP':              'ext_siding',
  'SF_TRIM_EXT_RP':                 'ext_trim',
  'SF_SOFFIT_EXT_RP':               'ext_soffit',
  'SF_WINDOW_EXT_RP':               'ext_window',
  'SF_DOOR_EXT_RP':                 'ext_door',
  'SF_GARAGE_DOOR_EXT_RP':          'ext_garage_door',
  'SF_DECK_EXT_RP':                 'ext_deck',
  'SF_FENCE_EXT_RP':                'ext_fence',
  'SF_FOUNDATION_EXT_RP':           'ext_foundation',
  'SF_PORCH_CEILING_EXT_RP':        'ext_porch_ceiling',
  'SF_PORCH_FLOOR_EXT_RP':          'ext_porch_floor',
  'SF_METAL_EXT_RP':                'ext_metal',
};

// Maps UI substrate_state values to spec system enum values (SS_* codes)
export const UI_STATE_TO_SPEC_STATE = {
  'bare_drywall':       'SS_BARE',
  'field_primed':       'SS_PRIMED_FIELD',
  'factory_primed':     'SS_PRIMED_FACTORY',
  'previously_painted': 'SS_PAINTED',           // Generic prefix — matches any SS_PAINTED_*
  'previously_finished':'SS_PAINTED',           // Beam/specialty alias for previously_painted
  'bare_wood':          'SS_BARE',
  'stained':            'SS_STAINED',
  'clear_coated':       'SS_CLEAR_COATED',
  'stained_sealed':     'SS_STAINED',           // Beam alias — stained and sealed wood
  'drywall':            'SS_BARE',              // Beam alias — bare drywall-wrapped element
  'wood':               'SS_BARE',              // Legacy alias — kept for backwards compat with preset data
  'vinyl_clad':         null                    // Not paintable via current NC specs
};

// Valid input states per spec family (from spec_state_declarations table)
export const SPEC_VALID_INPUT_STATES = {
  'SF_DRYWALL_WALL_NC_PRIME':    ['SS_BARE'],
  'SF_DRYWALL_WALL_NC_FINISH':   ['SS_PRIMED','SS_PRIMED_FIELD'],
  'SF_DRYWALL_CEILING_NC_PRIME': ['SS_BARE'],
  'SF_DRYWALL_CEILING_NC_FINISH':['SS_PRIMED','SS_PRIMED_FIELD'],
  'SF_TRIM_NC_PRIME':            ['SS_PRIMED_FACTORY','SS_BARE','SS_PAINTED_SEMIGLOSS','SS_PAINTED_GLOSS','SS_PAINTED_ALKYD'],
  'SF_TRIM_NC_PAINT':            ['SS_PRIMED_FIELD','SS_PRIMED_FACTORY'],
  'SF_DOOR_SLAB_INT_NC':         ['SS_PRIMED_FACTORY','SS_BARE'],
  'SF_DOOR_FRAME_NC_FINISH':     ['SS_PRIMED_FACTORY','SS_BARE'],
  'SF_WINDOW_INT_NC':            ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_WAINSCOT_PANEL_NC':        ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_WOOD_WALL_NC':             ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_WOOD_CEILING_NC':          ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_CLOSET_SHELF_NC':          ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_ARCH_ELEMENT_NC':          ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_BUILTIN_NC':               ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_STAIR_RISER_NC':           ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_STAIR_RAILING_NC':         ['SS_BARE','SS_PRIMED_FACTORY','SS_POWDER_COATED'],
  'SF_CABINET_NC_PAINT':         ['SS_BARE','SS_PRIMED_FACTORY'],
  'SF_WOOD_GRAIN_FILL_NC':       ['SS_PRIMED_FIELD','SS_PRIMED_FACTORY'],
  // ── Interior Stain/Clear ──
  'SF_TRIM_NC_STAIN':            ['SS_BARE', 'SS_STAINED'],
  'SF_DOOR_SLAB_INT_NC_STAIN':   ['SS_BARE', 'SS_STAINED'],
  'SF_DOOR_FRAME_NC_STAIN':      ['SS_BARE', 'SS_STAINED'],
  'SF_WINDOW_INT_NC_STAIN':      ['SS_BARE', 'SS_STAINED'],
  'SF_STAIR_RISER_NC_STAIN':     ['SS_BARE', 'SS_STAINED'],
  'SF_STAIR_RAILING_NC_STAIN':   ['SS_BARE', 'SS_STAINED'],
  'SF_WOOD_WALL_NC_STAIN':       ['SS_BARE', 'SS_STAINED'],
  'SF_WOOD_CEILING_NC_STAIN':    ['SS_BARE', 'SS_STAINED'],
  'SF_WAINSCOT_PANEL_NC_STAIN':  ['SS_BARE', 'SS_STAINED'],
  'SF_ARCH_ELEMENT_NC_STAIN':    ['SS_BARE', 'SS_STAINED'],
};

// Exterior UI substrate_state → spec system enum values (SS_EXT_* codes)
export const EXT_UI_STATE_TO_SPEC_STATE = {
  'bare_wood':          'SS_EXT_BARE_WOOD',
  'factory_primed':     'SS_EXT_PRIMED_FACTORY',
  'field_primed':       'SS_EXT_PRIMED_FIELD',
  'factory_finished':   'SS_EXT_FACTORY_FINISHED',
  'bare_fibercement':   'SS_EXT_BARE_FIBERCEMENT',
  'sound_paint':        'SS_EXT_SOUND_PAINT',
  'chalking':           'SS_EXT_CHALKING',
  'failing_paint':      'SS_EXT_FAILING_PAINT',
  'peeling':            'SS_EXT_PEELING',
  'weathered':          'SS_EXT_WEATHERED',
  'stained_solid':      'SS_EXT_STAINED_SOLID',
  'stained_semi':       'SS_EXT_STAINED_SEMI',
  'painted_flat':       'SS_EXT_PAINTED_FLAT',
  'painted_satin':      'SS_EXT_PAINTED_SATIN',
  'painted_semigloss':  'SS_EXT_PAINTED_SEMIGLOSS',
};

// Output states for specs that produce intermediate states (for chain activation)
// Only separate prime specs need this — combined specs handle state internally
export const SPEC_OUTPUT_STATES = {
  'SF_DRYWALL_WALL_NC_PRIME':    'SS_PRIMED_FIELD',
  'SF_DRYWALL_CEILING_NC_PRIME': 'SS_PRIMED_FIELD',
  'SF_TRIM_NC_PRIME':            'SS_PRIMED_FIELD',
  'SF_WOOD_GRAIN_FILL_NC':       'SS_GRAIN_FILLED',
};

// Set of all exterior NC spec family IDs
export const EXTERIOR_NC_SPEC_IDS = new Set([
  'SF_WOOD_SIDING_EXT_NC_PAINT', 'SF_SIDING_FIBERCEMENT_EXT_NC', 'SF_SIDING_ENGINEERED_EXT_NC',
  'SF_STUCCO_EXT_NC', 'SF_MASONRY_EXT_NC',
  'SF_TRIM_EXT_NC',
  'SF_SOFFIT_EXT_NC',
  'SF_WINDOW_EXT_NC', 'SF_DOOR_EXT_NC',
  'SF_GARAGE_DOOR_EXT_NC',
  'SF_CAULK_EXT',
  'SF_DECK_EXT', 'SF_FENCE_EXT',
  'SF_FOUNDATION_EXT_NC',
  'SF_PORCH_CEILING_EXT_NC', 'SF_PORCH_FLOOR_EXT_NC',
  'SF_METAL_EXT',
]);

// Set of all exterior RP spec family IDs
export const EXTERIOR_RP_SPEC_IDS = new Set([
  'SF_SIDING_WOOD_EXT_RP', 'SF_SIDING_ALUMINUM_EXT_RP', 'SF_SIDING_VINYL_EXT_RP',
  'SF_SIDING_FIBERCEMENT_EXT_RP', 'SF_SIDING_ENGINEERED_EXT_RP',
  'SF_STUCCO_EXT_RP', 'SF_MASONRY_EXT_RP',
  'SF_TRIM_EXT_RP',
  'SF_SOFFIT_EXT_RP',
  'SF_WINDOW_EXT_RP', 'SF_DOOR_EXT_RP',
  'SF_GARAGE_DOOR_EXT_RP',
  'SF_DECK_EXT_RP', 'SF_FENCE_EXT_RP',
  'SF_FOUNDATION_EXT_RP',
  'SF_PORCH_CEILING_EXT_RP', 'SF_PORCH_FLOOR_EXT_RP',
  'SF_METAL_EXT_RP',
]);

// Union of NC + RP for backwards compatibility
export const EXTERIOR_SPEC_IDS = new Set([...EXTERIOR_NC_SPEC_IDS, ...EXTERIOR_RP_SPEC_IDS]);

// Get the active exterior spec set based on project type
export function getExteriorSpecIds(projectType) {
  return projectType === 'RP' ? EXTERIOR_RP_SPEC_IDS : EXTERIOR_NC_SPEC_IDS;
}

// Set of all interior stain/clear coat spec family IDs
export const STAIN_SPEC_FAMILIES = new Set([
  'SF_TRIM_NC_STAIN',
  'SF_DOOR_SLAB_INT_NC_STAIN',
  'SF_DOOR_FRAME_NC_STAIN',
  'SF_WINDOW_INT_NC_STAIN',
  'SF_STAIR_RISER_NC_STAIN',
  'SF_STAIR_RAILING_NC_STAIN',
  'SF_WOOD_WALL_NC_STAIN',
  'SF_WOOD_CEILING_NC_STAIN',
  'SF_WAINSCOT_PANEL_NC_STAIN',
  'SF_ARCH_ELEMENT_NC_STAIN',
]);

// Maps substrate IDs to their parent paint/finish spec for grain fill attribution.
// Grain fill hours computed under SF_WOOD_GRAIN_FILL_NC are redistributed into
// these parent specs so they appear as prep tasks under the parent line item.
export const GRAIN_FILL_PARENT_SPEC = {
  // Trim group — all roll into SF_TRIM_NC_PAINT
  'baseboard':       'SF_TRIM_NC_PAINT',
  'crown':           'SF_TRIM_NC_PAINT',
  'door_casing':     'SF_TRIM_NC_PAINT',
  'window_casing':   'SF_TRIM_NC_PAINT',
  'chair_rail':      'SF_TRIM_NC_PAINT',
  'shoe_mold':       'SF_TRIM_NC_PAINT',
  'wainscot_cap':    'SF_TRIM_NC_PAINT',
  'picture_rail':    'SF_TRIM_NC_PAINT',
  'window_stool':    'SF_TRIM_NC_PAINT',
  'window_apron':    'SF_TRIM_NC_PAINT',
  'shadow_box':      'SF_TRIM_NC_PAINT',
  'panel_mold':      'SF_TRIM_NC_PAINT',
  // Doors & Windows
  'doors':           'SF_DOOR_SLAB_INT_NC',
  'door_frames':     'SF_DOOR_FRAME_NC_FINISH',
  'windows':         'SF_WINDOW_INT_NC',
  'window_jamb':     'SF_WINDOW_INT_NC',
  // Specialty wood
  'wainscoting':     'SF_WAINSCOT_PANEL_NC',
  'wood_feature_wall':'SF_WOOD_WALL_NC',
  'wood_ceiling':    'SF_WOOD_CEILING_NC',
  'beams':           'SF_ARCH_ELEMENT_NC',
  'columns':         'SF_ARCH_ELEMENT_NC',
  'mantels':         'SF_ARCH_ELEMENT_NC',
  'builtins':        'SF_BUILTIN_NC',
  'stairway':        'SF_STAIR_RISER_NC',
};

export function resolveStainOutputState(specId, coatingType) {
  if (!STAIN_SPEC_FAMILIES.has(specId)) return SPEC_OUTPUT_STATES[specId] || null;
  if (coatingType === 'stain_only') return 'SS_STAINED';
  return 'SS_CLEAR_COATED';
}
