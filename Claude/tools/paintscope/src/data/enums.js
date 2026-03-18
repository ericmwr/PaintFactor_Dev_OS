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
  // Exterior-specific enums
  extApplicationMethods: [
    { value: 'spray_backbrush', label: 'Spray + Back-Brush' },
    { value: 'spray', label: 'Spray' },
    { value: 'brush', label: 'Brush' },
    { value: 'roll', label: 'Roll' },
    { value: 'brush_roll', label: 'Brush + Roll' },
  ],
  extQualityTiers: [
    { value: 'QT2', label: 'QT2 — Economy' },
    { value: 'QT3', label: 'QT3 — Standard' },
    { value: 'QT4', label: 'QT4 — Premium' },
    { value: 'QT5', label: 'QT5 — Superior' },
  ],
  extWindowTypes: [
    { value: 'double_hung', label: 'Double Hung' },
    { value: 'single_hung', label: 'Single Hung' },
    { value: 'casement', label: 'Casement' },
    { value: 'slider', label: 'Slider' },
    { value: 'fixed', label: 'Fixed' },
    { value: 'awning', label: 'Awning' },
  ],
  extWindowSizes: [
    { value: 'S', label: 'SM' },
    { value: 'M', label: 'STD' },
    { value: 'L', label: 'LG' },
  ],
  extDoorTypes: [
    { value: 'entry', label: 'Entry' },
    { value: 'panel', label: 'Panel' },
    { value: 'french', label: 'French' },
    { value: 'sidelite', label: 'Sidelite' },
    { value: 'storm', label: 'Storm' },
    { value: 'dutch', label: 'Dutch' },
  ],
  extDoorSubstrates: [
    { value: 'fiberglass', label: 'Fiberglass' },
    { value: 'wood', label: 'Wood' },
    { value: 'steel', label: 'Steel' },
    { value: 'aluminum', label: 'Aluminum' },
  ],
  extGarageSizes: [
    { value: 'single', label: 'Single (8-9 ft)' },
    { value: 'double', label: 'Double (16 ft)' },
    { value: 'triple', label: 'Triple (24 ft)' },
  ],
  extGaragePanelTypes: [
    { value: 'flush', label: 'Flush' },
    { value: 'raised_panel', label: 'Raised Panel' },
    { value: 'recessed_panel', label: 'Recessed Panel' },
    { value: 'carriage', label: 'Carriage' },
    { value: 'window_insert', label: 'Window Insert' },
  ],
  extMetalTypes: [
    { value: 'railing', label: 'Railing' },
    { value: 'downspout', label: 'Downspout' },
    { value: 'gutter', label: 'Gutter' },
    { value: 'flashing', label: 'Flashing' },
    { value: 'vent', label: 'Vent Cover' },
    { value: 'light_fixture', label: 'Light Fixture' },
    { value: 'mailbox', label: 'Mailbox' },
  ],
  extCoatingTypes: [
    { value: 'paint', label: 'Paint' },
    { value: 'stain', label: 'Stain (Solid)' },
    { value: 'stain_semi', label: 'Stain (Semi-Transparent)' },
    { value: 'clear_seal', label: 'Clear Sealer' },
  ],
  // ── Interior Stain/Clear Coat ──
  intCoatingTypes: [
    { value: 'paint', label: 'Paint' },
    { value: 'stain_clear', label: 'Stain + Clear Coat' },
    { value: 'stain_only', label: 'Stain Only (Penetrating)' },
    { value: 'clear_only', label: 'Clear Coat Only' },
  ],
  woodSpeciesGroup: [
    { value: 'softwood', label: 'Softwood (Pine, Poplar, Cedar)' },
    { value: 'hardwood', label: 'Hardwood (Oak, Maple, Cherry, Walnut)' },
  ],
  clearSheen: [
    { value: 'satin', label: 'Satin' },
    { value: 'semi-gloss', label: 'Semi-Gloss' },
    { value: 'gloss', label: 'Gloss' },
  ],
  stainApplicationMethods: [
    { value: 'brush', label: 'Brush + Wipe' },
    { value: 'roll', label: 'Roll + Wipe' },
    { value: 'spray', label: 'Spray + Wipe' },
  ],
  clearApplicationMethods: [
    { value: 'brush', label: 'Brush' },
    { value: 'spray', label: 'Spray' },
  ],
  stainCoatCounts: [
    { value: 1, label: '1 Coat' },
    { value: 2, label: '2 Coats' },
  ],
  sealerCoatCounts: [
    { value: 0, label: 'None' },
    { value: 1, label: '1 Coat' },
    { value: 2, label: '2 Coats' },
  ],
  clearCoatCounts: [
    { value: 1, label: '1 Coat' },
    { value: 2, label: '2 Coats' },
    { value: 3, label: '3 Coats' },
  ],
  extFenceStyles: [
    { value: 'board', label: 'Board/Privacy' },
    { value: 'picket', label: 'Picket' },
    { value: 'split_rail', label: 'Split Rail' },
    { value: 'lattice', label: 'Lattice' },
  ],
  extFoundationSubstrates: [
    { value: 'concrete', label: 'Concrete' },
    { value: 'block', label: 'Block/CMU' },
    { value: 'stone', label: 'Stone' },
    { value: 'parging', label: 'Parging' },
  ],
  extProfileComplexity: [
    { value: 'standard', label: 'Standard' },
    { value: 'detailed', label: 'Detailed' },
    { value: 'ornate', label: 'Ornate' },
    { value: 'crown', label: 'Crown' },
  ],
  extTextureProfiles: [
    { value: 'smooth', label: 'Smooth' },
    { value: 'cedarmill', label: 'Cedarmill' },
    { value: 'sand', label: 'Sand' },
    { value: 'lace', label: 'Spanish Lace' },
    { value: 'dash', label: 'Dash/Roughcast' },
  ],
  substrateStates: [
    { value:'bare_drywall',       label:'Bare Drywall',       applies_to:['walls','ceiling'] },
    { value:'field_primed',       label:'Field Primed',       applies_to:['walls','ceiling'] },
    { value:'factory_primed',     label:'Factory Primed',     applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold'] },
    { value:'previously_painted', label:'Previously Painted', applies_to:['walls','ceiling','doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold','wainscoting','wood_feature_wall','wood_ceiling','closet_shelving','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'bare_wood',          label:'Bare Wood',          applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscot_cap','picture_rail','window_stool','window_apron','shadow_box','panel_mold','wainscoting','wood_feature_wall','wood_ceiling','closet_shelving','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'stained',            label:'Stained',            applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscoting','wood_feature_wall','wood_ceiling','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'clear_coated',       label:'Clear Coated',       applies_to:['doors','door_casing','window_casing','door_frames','windows','window_jamb','baseboard','crown','chair_rail','shoe_mold','wainscoting','wood_feature_wall','wood_ceiling','beams','columns','mantels','builtins','stair_risers','stair_railing'] },
    { value:'vinyl_clad',         label:'Vinyl Clad',         applies_to:['windows'] },
  ]
};
