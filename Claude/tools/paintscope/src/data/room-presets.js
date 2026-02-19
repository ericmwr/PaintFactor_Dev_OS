// ============================================================
// ROOM PRESETS (v0.3 — substrate-based)
// ============================================================
export const ROOM_PRESETS = {
  bedroom: {
    label:'Bedroom', length_ft:12, width_ft:12, height_ft:8,
    substrates: {
      walls:        { substrate_state:'bare_drywall', texture:null },
      ceiling:      { substrate_state:'bare_drywall', texture:null },
      baseboard:    { substrate_state:null },
      doors:        { items:[{count:1, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2}] },
      door_casing:  { substrate_state:null },
      windows:      { items:[{count:2, window_type:'double_hung', size_bucket:'M', substrate_state:'bare_wood'}] },
      window_casing:{ substrate_state:null },
    }
  },
  bathroom: {
    label:'Bathroom', length_ft:8, width_ft:10, height_ft:8,
    substrates: {
      walls:        { substrate_state:'bare_drywall', texture:null },
      ceiling:      { substrate_state:'bare_drywall', texture:null },
      baseboard:    { substrate_state:null },
      doors:        { items:[{count:1, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2}] },
      door_casing:  { substrate_state:null },
      windows:      { items:[{count:1, window_type:'double_hung', size_bucket:'S', substrate_state:'vinyl_clad'}] },
      window_casing:{ substrate_state:null },
    }
  },
  kitchen: {
    label:'Kitchen', length_ft:14, width_ft:16, height_ft:9,
    substrates: {
      walls:        { substrate_state:'bare_drywall', texture:null },
      ceiling:      { substrate_state:'bare_drywall', texture:null },
      baseboard:    { substrate_state:null },
      crown:        { substrate_state:null },
      doors:        { items:[{count:2, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2}] },
      door_casing:  { substrate_state:null },
      windows:      { items:[{count:3, window_type:'double_hung', size_bucket:'M', substrate_state:'bare_wood'}] },
      window_casing:{ substrate_state:null },
    }
  },
  living: {
    label:'Living Room', length_ft:16, width_ft:20, height_ft:9,
    substrates: {
      walls:        { substrate_state:'bare_drywall', texture:null },
      ceiling:      { substrate_state:'bare_drywall', texture:null },
      baseboard:    { substrate_state:null },
      crown:        { substrate_state:null },
      doors:        { items:[{count:1, door_type:'panel_6', substrate_state:'factory_primed', sides_per_door:2}] },
      door_casing:  { substrate_state:null },
      windows:      { items:[{count:4, window_type:'double_hung', size_bucket:'L', substrate_state:'bare_wood'}] },
      window_casing:{ substrate_state:null },
    }
  },
  hallway: {
    label:'Hallway', length_ft:4, width_ft:20, height_ft:8,
    substrates: {
      walls:        { substrate_state:'bare_drywall', texture:null },
      ceiling:      { substrate_state:'bare_drywall', texture:null },
      baseboard:    { substrate_state:null },
    }
  },
};
