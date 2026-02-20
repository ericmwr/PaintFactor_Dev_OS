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
  'SF_DRYWALL_WALL_NC_FINISH': 'Walls',
  'SF_DRYWALL_WALL_NC_PRIME': 'Walls (Prime)',
  'SF_DRYWALL_CEILING_NC_FINISH': 'Ceilings',
  'SF_DRYWALL_CEILING_NC_PRIME': 'Ceilings (Prime)',
  'SF_TRIM_NC_PAINT': 'Trim',
  'SF_TRIM_NC_PRIME': 'Trim (Prime)',
  'SF_DOOR_SLAB_INT_NC': 'Doors',
  'SF_DOOR_FRAME_NC_FINISH': 'Door Frames',
  'SF_WINDOW_INT_NC': 'Windows',
  'SF_CABINET_NC_PAINT': 'Cabinets',
  'SF_CLOSET_SHELF_NC': 'Closet Shelves',
  'SF_WOOD_CEILING_NC': 'Wood Ceilings',
  'SF_WOOD_WALL_NC': 'Wood Walls',
  'SF_WAINSCOT_PANEL_NC': 'Wainscoting',
  'SF_ARCH_ELEMENT_NC': 'Architectural Elements',
  'SF_BUILTIN_NC': 'Built-Ins',
  'SF_STAIR_RAILING_NC': 'Stair Railings',
  'SF_STAIR_RISER_NC': 'Stair Risers',
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
export const ARCH_ELEMENT_PS_GROUPS = { 'PS_SURFACE_LF.ARCH_BEAM':'Beams', 'PS_SURFACE_EA.ARCH_COLUMN':'Columns', 'PS_SURFACE_EA.ARCH_MANTEL':'Mantels' };

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
  'PS_SURFACE_LF.WAINSCOT_CAP': 'Wainscot Cap LF',
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
  'PS_SURFACE_EA.ARCH_COLUMN': 'Columns',
  'PS_SURFACE_EA.ARCH_MANTEL': 'Mantels',
  'PS_SURFACE_EA.BUILTIN': 'Built-ins',
  'PS_SURFACE_EA.STAIR_RISER': 'Stair Risers',
  'PS_SURFACE_EA.STAIR_RAILING': 'Stair Railings',
  // Surface sides keys
  'PS_SURFACE_EA_SIDE.DOOR_SLAB': 'Door Slab Sides',
  'PS_SURFACE_EA_SIDE.DOOR_FRAME': 'Door Frame Sides',
  'PS_SURFACE_EA_SIDE.WINDOW': 'Window Sides',
  // Edge keys
  'PS_EDGE_LF.TO_CEILING': 'Edge to Ceiling',
  'PS_EDGE_LF.TO_TRIM': 'Edge to Trim',
  'PS_EDGE_LF.TRIM_JOINTS': 'Trim Joints',
  'PS_EDGE_LF.CASING_JOINTS': 'Casing Joints',
  'PS_EDGE_LF.CROWN_JOINTS': 'Crown Joints',
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
  'PS_PROTECT_LF.TRIM_EDGES': 'Trim Edge Mask',
  'PS_PROTECT_LF.TRIM_CROWN': 'Crown Mask',
  'PS_PROTECT_EA.WALL_FIXTURE': 'Wall Fixtures',
  'PS_PROTECT_EA.CEILING_FIXTURE': 'Ceiling Fixtures',
  // Meta keys
  'PS_META.EA.ROOMS_TOTAL': 'Total Rooms',
  'PS_META.EA.CLOSETS_TOTAL': 'Total Closets',
  'PS_META.EA.ROOMS_VAULTED': 'Vaulted Rooms',
  'PS_META.SF.FLOOR_VACUUM_AREA': 'Floor Vacuum Area',
  'PS_META.TEXT.HEIGHT_BAND': 'Height Band',
  'PS_META.TEXT.QUALITY_TIER': 'Quality Tier',
};
