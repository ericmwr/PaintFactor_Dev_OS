// OpenAPI 3.0 schema for Gemini's responseSchema parameter.
// Enum values must match PaintScope's controlled enums exactly.

// Schema for the room overview pass
export const ROOM_OVERVIEW_SCHEMA = {
  type: 'OBJECT',
  properties: {
    room_type: {
      type: 'STRING',
      enum: ['bedroom', 'bathroom', 'kitchen', 'living_room', 'dining_room', 'hallway', 'foyer', 'laundry', 'office', 'closet', 'garage', 'basement', 'bonus_room', 'other'],
    },
    suggested_label: { type: 'STRING' },
    estimated_length_ft: { type: 'NUMBER' },
    estimated_width_ft: { type: 'NUMBER' },
    ceiling_height_ft: { type: 'NUMBER' },
    ceiling_type: {
      type: 'STRING',
      enum: ['flat', 'vaulted', 'cathedral', 'tray', 'coffered', 'beam_exposed'],
    },
    floor_type: {
      type: 'STRING',
      enum: ['hardwood', 'tile', 'carpet', 'lvp', 'concrete', 'subfloor', 'unknown'],
    },
    complexity: {
      type: 'STRING',
      enum: ['OPEN', 'STD', 'MOD', 'COMPLEX', 'VCOMPLEX'],
    },
    notable_features: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
    confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
  },
  required: ['room_type', 'suggested_label', 'confidence'],
};

// Schema for the detailed surface analysis pass
export const SURFACE_ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    surfaces: {
      type: 'OBJECT',
      properties: {
        walls: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['bare_drywall', 'field_primed', 'factory_primed', 'previously_painted'] },
            texture: { type: 'STRING', enum: ['smooth', 'orange_peel', 'knockdown', 'heavy_texture', 'skip_trowel'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        ceiling: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['bare_drywall', 'field_primed', 'factory_primed', 'previously_painted'] },
            texture: { type: 'STRING', enum: ['smooth', 'orange_peel', 'knockdown', 'heavy_texture', 'skip_trowel'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
      },
    },
    trim: {
      type: 'OBJECT',
      properties: {
        baseboard: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['factory_primed', 'bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        crown_molding: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['factory_primed', 'bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        chair_rail: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['factory_primed', 'bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        wainscoting: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained'] },
            estimated_sf: { type: 'NUMBER' },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
      },
    },
    doors: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          door_type: { type: 'STRING', enum: ['flush', 'panel_4', 'panel_6', 'french', 'bifold', 'louvered', 'sliding_glass'] },
          count: { type: 'NUMBER' },
          substrate_state: { type: 'STRING', enum: ['factory_primed', 'bare_wood', 'previously_painted', 'stained'] },
          sides_per_door: { type: 'NUMBER' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        },
        required: ['door_type', 'count', 'confidence'],
      },
    },
    windows: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          window_type: { type: 'STRING', enum: ['single_hung', 'double_hung', 'casement', 'fixed', 'slider'] },
          count: { type: 'NUMBER' },
          size_bucket: { type: 'STRING', enum: ['S', 'M', 'L', 'O'] },
          substrate_state: { type: 'STRING', enum: ['bare_wood', 'factory_primed', 'previously_painted', 'stained', 'vinyl_clad'] },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        },
        required: ['window_type', 'count', 'confidence'],
      },
    },
    openings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          opening_type: { type: 'STRING', enum: ['single', 'double', 'wide'] },
          count: { type: 'NUMBER' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        },
        required: ['opening_type', 'count', 'confidence'],
      },
    },
    fixtures: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          fixture_id: {
            type: 'STRING',
            enum: ['cabinets', 'countertops', 'appliances', 'backsplash', 'bathtub', 'shower', 'toilet', 'vanity', 'fireplace', 'stone_fireplace', 'builtin_shelving', 'light_fixtures'],
          },
          count: { type: 'NUMBER' },
          notes: { type: 'STRING' },
          confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
        },
        required: ['fixture_id', 'confidence'],
      },
    },
    specialty: {
      type: 'OBJECT',
      properties: {
        beams: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            count: { type: 'NUMBER' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        columns: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            count: { type: 'NUMBER' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained', 'factory_primed'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        mantels: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            count: { type: 'NUMBER' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        stair_risers: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            count: { type: 'NUMBER' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
        stair_railing: {
          type: 'OBJECT',
          properties: {
            detected: { type: 'BOOLEAN' },
            substrate_state: { type: 'STRING', enum: ['bare_wood', 'previously_painted', 'stained'] },
            confidence: { type: 'STRING', enum: ['high', 'medium', 'low'] },
          },
          required: ['detected', 'confidence'],
        },
      },
    },
  },
};
