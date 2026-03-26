// src/state/color-state.js
// Substrate-to-color-group mapping for inheritance cascade

export const SUBSTRATE_COLOR_GROUPS = {
  // Surfaces
  walls: 'walls',
  ceiling: 'ceiling',
  // Trim — all inherit from 'trim' group
  baseboard: 'trim',
  crown: 'trim',
  door_casing: 'trim',
  window_casing: 'trim',
  chair_rail: 'trim',
  shoe_mold: 'trim',
  wainscot_cap: 'trim',
  picture_rail: 'trim',
  window_stool: 'trim',
  window_apron: 'trim',
  shadow_box: 'trim',
  panel_mold: 'trim',
  // Doors & Windows
  doors: 'doors',
  door_frames: 'doors',
  windows: 'windows',
  window_jamb: 'windows',
  // Specialty
  wainscoting: 'specialty',
  wood_feature_wall: 'specialty',
  wood_ceiling: 'specialty',
  closet_shelving: 'specialty',
  beams: 'specialty',
  columns: 'specialty',
  mantels: 'specialty',
  builtins: 'specialty',
  stairway: 'specialty',
  // Exterior
  siding: 'siding',
  fascia: 'ext_trim',
  soffit: 'ext_trim',
  rake_trim: 'ext_trim',
  corner_trim: 'ext_trim',
  ext_doors: 'ext_doors',
  ext_windows: 'ext_windows',
};

export const COLOR_GROUP_LABELS = {
  walls: 'Walls',
  ceiling: 'Ceiling',
  trim: 'Trim',
  doors: 'Doors',
  windows: 'Windows',
  specialty: 'Specialty',
  siding: 'Siding',
  ext_trim: 'Ext. Trim',
  ext_doors: 'Ext. Doors',
  ext_windows: 'Ext. Windows',
};

export function getColorGroup(substrateId) {
  return SUBSTRATE_COLOR_GROUPS[substrateId] || null;
}

export const initialColorState = {
  defaults: {},
  substrate_overrides: {},
  room_overrides: {},
  elevation_overrides: {},
};
