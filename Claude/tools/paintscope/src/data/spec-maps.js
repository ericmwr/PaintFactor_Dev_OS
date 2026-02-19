// Maps spec_family_id to primary substrate ID for application_method resolution
export const SPEC_SUBSTRATE_MAP = {
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
  'SF_STAIR_RISER_NC':           'stair_risers',
  'SF_STAIR_RAILING_NC':         'stair_railing',
  'SF_CABINET_NC_PAINT':         'doors',
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
};

// Output states for specs that produce intermediate states (for chain activation)
// Only separate prime specs need this — combined specs handle state internally
export const SPEC_OUTPUT_STATES = {
  'SF_DRYWALL_WALL_NC_PRIME':    'SS_PRIMED_FIELD',
  'SF_DRYWALL_CEILING_NC_PRIME': 'SS_PRIMED_FIELD',
  'SF_TRIM_NC_PRIME':            'SS_PRIMED_FIELD',
};
