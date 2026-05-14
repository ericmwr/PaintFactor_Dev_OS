// Phase ordering for work order and estimate views
export const PHASE_ORDER = ['setup','prep','prime','apply','interstage','finish','cleanup'];

export const PHASE_COLORS = {
  setup:      'rgba(130,170,255,0.10)',
  prep:       'rgba(255,190,100,0.12)',
  prime:      'rgba(180,140,255,0.10)',
  apply:      'rgba(100,210,140,0.12)',
  interstage: 'rgba(255,160,180,0.10)',
  finish:     'rgba(80,200,220,0.12)',
  cleanup:    'rgba(160,160,160,0.10)'
};

// Friendly display names for spec families — paintable item names
export const SPEC_DISPLAY_NAMES = {
  // ── Interior ──
  'SF_DRYWALL_WALL_NC_FINISH': 'Walls',
  'SF_DRYWALL_WALL_NC_PRIME': 'Walls (Prime)',
  'SF_DRYWALL_CEILING_NC_FINISH': 'Ceilings',
  'SF_DRYWALL_CEILING_NC_PRIME': 'Ceilings (Prime)',
  'SF_DOOR_SLAB_INT_NC': 'Doors',
  'SF_DOOR_FRAME_NC_FINISH': 'Door Frames',
  'SF_WINDOW_INT_NC': 'Windows',
  'SF_CABINET_NC_PAINT': 'Cabinets',
  'SF_CLOSET_SHELF_NC': 'Closet Shelves',
  'SF_ROOM_PROTECTION': 'Room Protection',
  'SF_WOOD_CEILING_NC': 'Wood Ceilings',
  'SF_WOOD_WALL_NC': 'Wood Walls',
  'SF_WAINSCOT_PANEL_NC': 'Wainscoting',
  'SF_ARCH_ELEMENT_NC': 'Architectural Elements',
  'SF_BUILTIN_NC': 'Built-Ins',
  'SF_STAIR_RAILING_NC': 'Stair Railings',
  'SF_STAIR_RISER_NC': 'Stair Risers',
  'SF_WOOD_GRAIN_FILL_NC': 'Grain Fill',
  // Interior Stain/Clear
  'SF_DOOR_FRAME_NC_STAIN':      'Door Frame — Stain/Clear',
  'SF_WINDOW_INT_NC_STAIN':      'Window — Stain/Clear',
  'SF_STAIR_RISER_NC_STAIN':     'Stair Riser — Stain/Clear',
  'SF_STAIR_RAILING_NC_STAIN':   'Stair Railing — Stain/Clear',
  'SF_WOOD_WALL_NC_STAIN':       'Wood Wall — Stain/Clear',
  'SF_WOOD_CEILING_NC_STAIN':    'Wood Ceiling — Stain/Clear',
  'SF_WAINSCOT_PANEL_NC_STAIN':  'Wainscot — Stain/Clear',
  'SF_ARCH_ELEMENT_NC_STAIN':    'Arch Element — Stain/Clear',
  // ── Exterior ──
  'SF_WOOD_SIDING_EXT_NC_PAINT': 'Wood Siding',
  'SF_SIDING_FIBERCEMENT_EXT_NC': 'Fiber Cement Siding',
  'SF_SIDING_ENGINEERED_EXT_NC': 'Engineered Wood Siding',
  'SF_SIDING_VINYL_EXT_RP': 'Vinyl Siding (Repaint)',
  'SF_SIDING_ALUMINUM_EXT_RP': 'Aluminum Siding (Repaint)',
  'SF_SIDING_WOOD_EXT_RP': 'Wood Siding (Repaint)',
  'SF_STUCCO_EXT_NC': 'Stucco/EIFS',
  'SF_MASONRY_EXT_NC': 'Masonry/Brick',
  'SF_TRIM_EXT_NC': 'Exterior Trim',
  'SF_TRIM_EXT_RP': 'Exterior Trim (Repaint)',
  'SF_SOFFIT_EXT_NC': 'Soffits',
  'SF_WINDOW_EXT_NC': 'Exterior Windows',
  'SF_DOOR_EXT_NC': 'Exterior Doors',
  'SF_DOOR_EXT_RP': 'Exterior Doors (Repaint)',
  'SF_GARAGE_DOOR_EXT_NC': 'Garage Doors',
  'SF_CAULK_EXT': 'Exterior Caulking',
  'SF_DECK_EXT': 'Deck',
  'SF_FENCE_EXT': 'Fence',
  'SF_FOUNDATION_EXT_NC': 'Foundation',
  'SF_PORCH_CEILING_EXT_NC': 'Porch Ceiling',
  'SF_PORCH_FLOOR_EXT_NC': 'Porch Floor',
  'SF_METAL_EXT': 'Metal Surfaces',
};

export function specDisplayName(specId) {
  return SPEC_DISPLAY_NAMES[specId] || specId.replace(/^SF_/,'').replace(/_/g,' ');
}

// Floor protection level hierarchy - higher rank = more protection
export const FLOOR_PROTECTION_HIERARCHY = {
  'edge_only': 1, 'partial_cover': 2, 'full_cover': 3, 'heavy_cover': 4
};

export const FLOOR_ZONE_IDS = new Set([
  'floor_full','floor_perimeter','floor_workzone',
  'floor_full_kitchen','floor_full_8ft_radius','floor_door_swing'
]);

// Preferred donor specs for floor protection rates (canonical full-room tasks)
export const FLOOR_PROTECTION_DONOR_PRIORITY = [
  'SF_DRYWALL_WALL_NC_PRIME', 'SF_DRYWALL_CEILING_NC_PRIME',
  'SF_DRYWALL_WALL_NC_FINISH', 'SF_DRYWALL_CEILING_NC_FINISH'
];

// Arch element grouping for per-item display names
export const ARCH_ELEMENT_PS_GROUPS = { 'PS_SURFACE_LF.ARCH_BEAM':'Beams', 'PS_SURFACE_LF.ARCH_COLUMN':'Columns', 'PS_SURFACE_SF.ARCH_MANTEL':'Mantels' };

// Quantity key human-readable labels (for Summary view)
export const QUANTITY_KEY_LABELS = {
  // Surface area keys
  'PS_SURFACE_SF.WALL': 'Wall SF',
  'PS_SURFACE_SF.WALL_FIELD': 'Wall Field SF',
  'PS_SURFACE_SF.WALL_GROSS': 'Wall Gross SF',
  'PS_SURFACE_SF.WALL_NET': 'Wall Net SF',
  'PS_SURFACE_SF.CEILING': 'Ceiling SF',
  'PS_SURFACE_SF.CEILING_FIELD': 'Ceiling Field SF',
  'PS_SURFACE_SF.WAINSCOT': 'Wainscot SF',
  'PS_SURFACE_SF.WOOD_WALL': 'Wood Wall SF',
  'PS_SURFACE_SF.WOOD_CEILING': 'Wood Ceiling SF',
  // Surface linear keys
  'PS_SURFACE_LF.BASEBOARD': 'Baseboard LF',
  'PS_SURFACE_LF.CROWN': 'Crown LF',
  'PS_SURFACE_LF.DOOR_CASING': 'Door Casing LF',
  'PS_SURFACE_LF.WINDOW_CASING': 'Window Casing LF',
  'PS_SURFACE_LF.CHAIR_RAIL': 'Chair Rail LF',
  'PS_SURFACE_LF.SHOE_MOLD': 'Shoe Mold LF',
  'PS_SURFACE_LF.PICTURE_RAIL': 'Picture Rail LF',
  'PS_SURFACE_LF.WINDOW_STOOL': 'Window Stool LF',
  'PS_SURFACE_LF.WINDOW_APRON': 'Window Apron LF',
  'PS_SURFACE_LF.SHADOW_BOX': 'Shadow Box LF',
  'PS_SURFACE_LF.PANEL_MOLD': 'Panel Mold LF',
  'PS_SURFACE_LF.CLOSET_SHELF': 'Closet Shelf LF',
  'PS_SURFACE_LF.ARCH_BEAM': 'Beams',
  'PS_SURFACE_LF.TRIM_BASEBOARD': 'Trim Baseboard LF',
  'PS_SURFACE_LF.TRIM_TOTAL': 'Total Trim LF',
  // Surface count keys
  'PS_SURFACE_EA.DOOR_SLAB': 'Door Slabs',
  'PS_SURFACE_EA.DOOR_FRAME': 'Door Frames',
  'PS_SURFACE_EA.WINDOW': 'Windows',
  'PS_SURFACE_EA.WINDOW_JAMB': 'Window Jambs',
  'PS_SURFACE_LF.ARCH_COLUMN': 'Columns',
  'PS_SURFACE_SF.ARCH_MANTEL': 'Mantels',
  'PS_SURFACE_EA.BUILTIN': 'Built-ins',
  'PS_OPENING_EA.BUILTIN_SHELF.S': 'Built-in Openings (S)',
  'PS_OPENING_EA.BUILTIN_SHELF.M': 'Built-in Openings (M)',
  'PS_OPENING_EA.BUILTIN_SHELF.L': 'Built-in Openings (L)',
  'PS_OPENING_EA.BUILTIN_SHELF.XL': 'Built-in Openings (XL)',
  'PS_SURFACE_EA.STAIR_RISER': 'Stair Risers',
  'PS_SURFACE_EA.STAIR_TREAD': 'Stair Treads',
  'PS_SURFACE_EA.STAIR_BALUSTER': 'Balusters',
  'PS_SURFACE_EA.STAIR_NEWEL': 'Newel Posts',
  'PS_SURFACE_LF.STAIR_OPEN_RAIL': 'Open Handrail',
  'PS_SURFACE_LF.STAIR_WALL_RAIL': 'Wall Rail',
  'PS_SURFACE_LF.STAIR_SKIRTBOARD': 'Skirtboard',
  // Surface sides keys
  'PS_SURFACE_EA_SIDE.DOOR_SLAB': 'Door Slab Sides',
  'PS_SURFACE_EA_SIDE.DOOR_FRAME': 'Door Frame Sides',
  'PS_SURFACE_EA_SIDE.WINDOW': 'Window Sides',
  // Edge keys
  'PS_EDGE_LF.TO_CEILING': 'Edge to Ceiling',
  'PS_EDGE_LF.TO_TRIM': 'Edge to Trim',
  'PS_EDGE_LF.TRIM_JOINTS': 'Trim Joints (All)',
  'PS_EDGE_LF.CASING_JOINTS': 'Casing Joints',
  'PS_EDGE_LF.CROWN_JOINTS': 'Crown Joints',
  // Per-substrate trim joint caulk LF
  'PS_EDGE_LF.TRIM_JOINTS_BASEBOARD': 'Baseboard Joints',
  'PS_EDGE_LF.TRIM_JOINTS_CROWN': 'Crown Joints',
  'PS_EDGE_LF.TRIM_JOINTS_CASING_DOOR': 'Door Casing Joints',
  'PS_EDGE_LF.TRIM_JOINTS_CASING_WINDOW': 'Window Casing Joints',
  'PS_EDGE_LF.TRIM_JOINTS_CHAIR_RAIL': 'Chair Rail Joints',
  'PS_EDGE_LF.TRIM_JOINTS_SHOE_MOLD': 'Shoe Mold Joints',
  'PS_EDGE_LF.TRIM_JOINTS_PICTURE_RAIL': 'Picture Rail Joints',
  'PS_EDGE_LF.TRIM_JOINTS_WINDOW_STOOL': 'Window Stool Joints',
  'PS_EDGE_LF.TRIM_JOINTS_WINDOW_APRON': 'Window Apron Joints',
  'PS_EDGE_LF.TRIM_JOINTS_SHADOW_BOX': 'Shadow Box Joints',
  'PS_EDGE_LF.TRIM_JOINTS_PANEL_MOLD': 'Panel Mold Joints',
  'PS_EDGE_LF.TRIM_JOINTS_DOOR_FRAME': 'Door Frame Joints',
  'PS_EDGE_LF.TRIM_JOINTS_WINDOW_JAMB': 'Window Jamb Joints',
  // Per-substrate wall-to-trim cut-in LF (wall painter brushes the wall edge against trim)
  'PS_EDGE_LF.CUTIN_WALL_TO_BASEBOARD': 'Cut-In Wall to Baseboard',
  'PS_EDGE_LF.CUTIN_WALL_TO_CROWN': 'Cut-In Wall to Crown',
  'PS_EDGE_LF.CUTIN_WALL_TO_CASING_DOOR': 'Cut-In Wall to Door Casing',
  'PS_EDGE_LF.CUTIN_WALL_TO_CASING_WINDOW': 'Cut-In Wall to Window Casing',
  'PS_EDGE_LF.CUTIN_WALL_TO_CHAIR_RAIL': 'Cut-In Wall to Chair Rail',
  'PS_EDGE_LF.CUTIN_WALL_TO_PICTURE_RAIL': 'Cut-In Wall to Picture Rail',
  'PS_EDGE_LF.CUTIN_WALL_TO_WINDOW_STOOL': 'Cut-In Wall to Window Stool',
  'PS_EDGE_LF.CUTIN_WALL_TO_WINDOW_APRON': 'Cut-In Wall to Window Apron',
  'PS_EDGE_LF.CUTIN_WALL_TO_SHADOW_BOX': 'Cut-In Wall to Shadow Box',
  'PS_EDGE_LF.CUTIN_WALL_TO_PANEL_MOLD': 'Cut-In Wall to Panel Mold',
  // Opening keys
  'PS_OPENING_EA.DOOR_STD': 'Standard Doors',
  'PS_OPENING_EA.DOOR_LG': 'Large Doors',
  'PS_OPENING_EA.WINDOW_STD': 'Standard Windows',
  'PS_OPENING_EA.WINDOW_LG': 'Large Windows',
  'PS_OPENING_EA.ARCHWAY': 'Archways',
  // Protection keys
  'PS_PROTECT_SF.FLOOR_EXPOSED': 'Floor Protection (Full)',
  'PS_PROTECT_SF.FLOOR_WORKZONE': 'Floor Protection (Work Zone)',
  'PS_PROTECT_SF.FLOOR_PERIMETER': 'Floor Protection (Perimeter)',
  'PS_PROTECT_LF.CEILING_LINE': 'Ceiling Line Mask',
  'PS_PROTECT_LF.TRIM_BASEBOARD': 'Baseboard Mask',
  'PS_PROTECT_LF.TRIM_EDGES': 'Trim Edge Mask (All)',
  'PS_PROTECT_LF.TRIM_CROWN': 'Crown Mask',
  'PS_PROTECT_LF.TRIM_CASING_DOOR': 'Door Casing Mask',
  'PS_PROTECT_LF.TRIM_CASING_WINDOW': 'Window Casing Mask',
  'PS_PROTECT_LF.TRIM_CHAIR_RAIL': 'Chair Rail Mask',
  'PS_PROTECT_LF.TRIM_PICTURE_RAIL': 'Picture Rail Mask',
  'PS_PROTECT_LF.TRIM_WINDOW_STOOL': 'Window Stool Mask',
  'PS_PROTECT_LF.TRIM_WINDOW_APRON': 'Window Apron Mask',
  'PS_PROTECT_LF.TRIM_PANEL_MOLD': 'Panel Mold Mask',
  'PS_PROTECT_LF.TRIM_SHADOW_BOX': 'Shadow Box Mask',
  'PS_PROTECT_EA.WALL_FIXTURE': 'Wall Fixtures',
  'PS_PROTECT_EA.CEILING_FIXTURE': 'Ceiling Fixtures',
  // Meta keys
  'PS_META.EA.ROOMS_TOTAL': 'Total Rooms',
  'PS_META.EA.CLOSETS_TOTAL': 'Total Closets',
  'PS_META.EA.ROOMS_VAULTED': 'Vaulted Rooms',
  'PS_META.SF.FLOOR_VACUUM_AREA': 'Floor Vacuum Area',
  'PS_META.TEXT.HEIGHT_BAND': 'Height Band',
  'PS_META.TEXT.QUALITY_TIER': 'Quality Tier',

  // ── Exterior Surface Keys ──
  'PS_EXT_SURFACE_SF.SIDING_FIELD': 'Siding Field SF',
  'PS_EXT_SURFACE_SF.SIDING_BOARD_BATTEN': 'Board & Batten SF',
  'PS_EXT_SURFACE_SF.STUCCO_FIELD': 'Stucco Field SF',
  'PS_EXT_SURFACE_SF.MASONRY_WALL': 'Masonry Wall SF',
  'PS_EXT_SURFACE_SF.FOUNDATION_WALL': 'Foundation Wall SF',
  'PS_EXT_SURFACE_SF.SOFFIT_FIELD': 'Soffit SF',
  'PS_EXT_SURFACE_SF.PORCH_CEILING': 'Porch Ceiling SF',
  'PS_EXT_SURFACE_SF.PORCH_FLOOR': 'Porch Floor SF',
  'PS_EXT_SURFACE_SF.DECK_FIELD': 'Deck SF',
  'PS_EXT_SURFACE_SF.FENCE_FIELD': 'Fence SF',

  // ── Exterior Edge (Trim) Keys ──
  'PS_EXT_EDGE_LF.FASCIA': 'Fascia LF',
  'PS_EXT_EDGE_LF.TRIM_RAKE': 'Rake Trim LF',
  'PS_EXT_EDGE_LF.TRIM_FRIEZE': 'Frieze Board LF',
  'PS_EXT_EDGE_LF.TRIM_CORNER': 'Corner Trim LF',
  'PS_EXT_EDGE_LF.TRIM_BAND': 'Band Board LF',
  'PS_EXT_EDGE_LF.TRIM_WINDOW_CASING': 'Ext Window Casing LF',
  'PS_EXT_EDGE_LF.TRIM_DOOR_CASING': 'Ext Door Casing LF',
  'PS_EXT_EDGE_LF.SILL': 'Window Sill LF',
  'PS_EXT_EDGE_LF.DECK_RAILING': 'Deck Railing LF',

  // ── Exterior Opening Keys ──
  'PS_EXT_OPENING_EA.DOOR_EXT': 'Exterior Doors',
  'PS_EXT_OPENING_EA.DOOR_GARAGE': 'Garage Doors',
  'PS_EXT_OPENING_EA.WINDOW_S': 'Ext Windows (S)',
  'PS_EXT_OPENING_EA.WINDOW_M': 'Ext Windows (M)',
  'PS_EXT_OPENING_EA.WINDOW_L': 'Ext Windows (L)',

  // ── Exterior Protection Keys ──
  'PS_EXT_PROTECT_SF.LANDSCAPE_ADJACENT': 'Landscape Protection SF',
  'PS_EXT_PROTECT_SF.LANDSCAPE_FULL': 'Landscape Full Tarp SF',
  'PS_EXT_PROTECT_SF.HARDSCAPE_PATIO': 'Patio Protection SF',
  'PS_EXT_PROTECT_SF.HARDSCAPE_WALK': 'Walkway Protection SF',
  'PS_EXT_PROTECT_SF.DRIVEWAY': 'Driveway Protection SF',
  'PS_EXT_PROTECT_EA.GLASS_WINDOW': 'Window Glass Mask',
  'PS_EXT_PROTECT_EA.GLASS_DOOR': 'Door Glass Mask',
  'PS_EXT_PROTECT_EA.DOOR_HARDWARE': 'Door Hardware Mask',
  'PS_EXT_PROTECT_EA.LIGHT_FIXTURE': 'Light Fixture Cover',
  'PS_EXT_PROTECT_EA.HVAC_UNIT': 'HVAC Unit Cover',
  'PS_EXT_PROTECT_EA.UTILITY_PANEL': 'Utility Panel Cover',

  // ── Exterior Caulk Keys ──
  'PS_EXT_SURFACE_LF.CAULK_JOINTS': 'Caulk Joints LF',

  // ── Exterior Meta Keys ──
  'PS_EXT_META.EA.ELEVATIONS_TOTAL': 'Total Elevations',
  'PS_EXT_META.ENUM.ACCESS_TYPE': 'Access Type',
  'PS_EXT_META.ENUM.WIND_CONDITION': 'Wind Condition',
  'PS_EXT_META.ENUM.SUN_EXPOSURE': 'Sun Exposure',
  'PS_EXT_META.FLAG.NEW_CONSTRUCTION': 'New Construction',
};
