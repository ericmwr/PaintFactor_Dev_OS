// ============================================================
// ENUMS (from seed_enums.sql)
// ============================================================
export const ENUMS = {
  qualityTiers: [
    { value:'QT2', label:'QT2 — Economy' },
    { value:'QT3', label:'QT3 — Standard' },
    { value:'QT4', label:'QT4 — Premium' },
    { value:'QT5', label:'QT5 — Superior' }
  ],
  applicationMethods: [
    { value:'brush', label:'Brush' },
    { value:'brush_roll', label:'Brush + Roll' },
    { value:'roll', label:'Roll' },
    { value:'spray', label:'Spray' },
    { value:'spray_backroll', label:'Spray + Backroll' },
    { value:'spray_rolloff', label:'Spray + Rolloff' }
  ],
  textures: [
    { value:'smooth', label:'Smooth' },
    { value:'orange_peel', label:'Orange Peel' },
    { value:'knockdown', label:'Knockdown' },
    { value:'heavy_texture', label:'Heavy Texture' },
    { value:'skip_trowel', label:'Skip Trowel' }
  ],
  heightBands: [
    { value:'STD', label:'Standard (≤9 ft)' },
    { value:'STEP', label:'Step/Ext Ladder (10-12 ft)' },
    { value:'EXT', label:'Scaffold (13-17 ft)' },
    { value:'SCAFFOLD', label:'Full Scaffold (18-24 ft)' },
    { value:'LIFT', label:'Mech Lift (25+ ft)' }
  ],
  complexity: [
    { value:'OPEN', label:'Open' },
    { value:'STD', label:'Standard' },
    { value:'MOD', label:'Moderate' },
    { value:'COMPLEX', label:'Complex' },
    { value:'VCOMPLEX', label:'Very Complex' }
  ],
  doorTypes: [
    { value:'flush', label:'Flush/Slab' },
    { value:'panel_4', label:'4-Panel' },
    { value:'panel_6', label:'6-Panel' },
    { value:'french', label:'French' },
    { value:'bifold', label:'Bifold' },
    { value:'louvered', label:'Louvered' },
    { value:'sliding_glass', label:'Sliding Glass' }
  ],
  windowTypes: [
    { value:'single_hung', label:'Single Hung' },
    { value:'double_hung', label:'Double Hung' },
    { value:'casement', label:'Casement' },
    { value:'fixed', label:'Fixed' },
    { value:'slider', label:'Slider' }
  ],
  windowSizes: [
    { value:'S', label:'SM — 8 LF perim' },
    { value:'M', label:'STD — 12 LF perim' },
    { value:'L', label:'LG — 17 LF perim' },
    { value:'O', label:'XL — Measured' }
  ],
  substrateDoor: [
    { value:'factory_primed', label:'Factory Primed' },
    { value:'bare_wood', label:'Bare Wood' }
  ],
  substrateWindow: [
    { value:'wood', label:'Wood' },
    { value:'vinyl_clad', label:'Vinyl Clad' }
  ],
  substrateStates: [
    { value:'bare_drywall',       label:'Bare Drywall',       applies_to:['walls','ceiling'] },
    { value:'field_primed',       label:'Field Primed',       applies_to:['walls','ceiling'] },
    { value:'factory_primed',     label:'Factory Primed',     applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold'] },
    { value:'previously_painted', label:'Previously Painted', applies_to:['walls','ceiling','doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold','wainscoting','wood_feature_wall','wood_ceiling','closet_shelving','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'bare_wood',          label:'Bare Wood',          applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold','wainscoting','wood_feature_wall','wood_ceiling','closet_shelving','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'stained',            label:'Stained',            applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscoting','wood_feature_wall','wood_ceiling','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'vinyl_clad',         label:'Vinyl Clad',         applies_to:['windows'] },
  ]
};
