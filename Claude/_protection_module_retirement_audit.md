# Protection-module retirement audit

Generated: 2026-05-09T21:40:08.172Z

## Summary

- **36 modules** emit only protection tasks. Strong retirement candidates. Total scenario references: **416**.
- **105 modules** are mixed (some protection, some real cleanup work). Need splitting. Total scenario references: **729**.

## What the dedicated protection system emits today

Reference list — these are every task ID currently emitted by `SF_ROOM_PROTECTION` and `SF_FIXTURE_PROTECTION`. Compare to the per-module task lists below to confirm coverage before retiring.

- `TSK_CONTAINMENT_DOOR_ZIPPER` — Containment Door Zipper
- `TSK_CONTAINMENT_SETUP` — Containment Setup
- `TSK_CONTAINMENT_TEARDOWN` — Containment Teardown
- `TSK_MASK_APPLIANCES_INSTALL` — Appliances Mask — Install
- `TSK_MASK_APPLIANCES_REMOVE` — Appliances Mask — Remove
- `TSK_MASK_BATHTUB_INSTALL` — Bathtub Mask — Install
- `TSK_MASK_BATHTUB_REMOVE` — Bathtub Mask — Remove
- `TSK_MASK_BUILTIN_INSTALL` — Built-in Mask — Install
- `TSK_MASK_BUILTIN_REMOVE` — Built-in Mask — Remove
- `TSK_MASK_COUNTERTOP_INSTALL` — Countertop Mask — Install
- `TSK_MASK_COUNTERTOP_REMOVE` — Countertop Mask — Remove
- `TSK_MASK_DOOR_CASING_INSTALL` — Door Casing Mask — Install
- `TSK_MASK_DOOR_CASING_REMOVE` — Door Casing Mask — Remove
- `TSK_MASK_DOOR_FRAME_INSTALL` — Door Frame Mask — Install
- `TSK_MASK_DOOR_FRAME_REMOVE` — Door Frame Mask — Remove
- `TSK_MASK_DOOR_SLAB_INSTALL` — Door Slab Mask — Install
- `TSK_MASK_DOOR_SLAB_REMOVE` — Door Slab Mask — Remove
- `TSK_MASK_FEATURE_WALL_INSTALL` — Feature Wall Mask — Install
- `TSK_MASK_FEATURE_WALL_REMOVE` — Feature Wall Mask — Remove
- `TSK_MASK_FIREPLACE_INSTALL` — Fireplace Mask — Install
- `TSK_MASK_FIREPLACE_REMOVE` — Fireplace Mask — Remove
- `TSK_MASK_HVAC_VENT_INSTALL` — HVAC Vent Mask — Install
- `TSK_MASK_HVAC_VENT_REMOVE` — HVAC Vent Mask — Remove
- `TSK_MASK_OUTLET_SWITCH_INSTALL` — Outlet/Switch Mask — Install
- `TSK_MASK_OUTLET_SWITCH_REMOVE` — Outlet/Switch Mask — Remove
- `TSK_MASK_SHOWER_INSTALL` — Shower / Enclosure Mask — Install
- `TSK_MASK_SHOWER_REMOVE` — Shower / Enclosure Mask — Remove
- `TSK_MASK_TOILET_INSTALL` — Toilet Mask — Install
- `TSK_MASK_TOILET_REMOVE` — Toilet Mask — Remove
- `TSK_MASK_VANITY_INSTALL` — Vanity Mask — Install
- `TSK_MASK_VANITY_REMOVE` — Vanity Mask — Remove
- `TSK_MASK_WINDOW_APRON_INSTALL` — Window Apron Mask — Install
- `TSK_MASK_WINDOW_APRON_REMOVE` — Window Apron Mask — Remove
- `TSK_MASK_WINDOW_CASING_INSTALL` — Window Casing Mask — Install
- `TSK_MASK_WINDOW_CASING_REMOVE` — Window Casing Mask — Remove
- `TSK_MASK_WINDOW_FULL_LG_INSTALL` — Window Full Wrap (LG) — Install
- `TSK_MASK_WINDOW_FULL_LG_REMOVE` — Window Full Wrap (LG) — Remove
- `TSK_MASK_WINDOW_FULL_SMALL_INSTALL` — Window Full Wrap (Small) — Install
- `TSK_MASK_WINDOW_FULL_SMALL_REMOVE` — Window Full Wrap (Small) — Remove
- `TSK_MASK_WINDOW_FULL_STD_INSTALL` — Window Full Wrap (STD) — Install
- `TSK_MASK_WINDOW_FULL_STD_REMOVE` — Window Full Wrap (STD) — Remove
- `TSK_MASK_WINDOW_FULL_XL_INSTALL` — Window Full Wrap (XL) — Install
- `TSK_MASK_WINDOW_FULL_XL_REMOVE` — Window Full Wrap (XL) — Remove
- `TSK_MASK_WINDOW_GLASS_INSTALL` — Window Glass (Lites) Mask — Install
- `TSK_MASK_WINDOW_GLASS_REMOVE` — Window Glass (Lites) Mask — Remove
- `TSK_MASK_WINDOW_JAMB_INSTALL` — Window Jamb Mask — Install
- `TSK_MASK_WINDOW_JAMB_REMOVE` — Window Jamb Mask — Remove
- `TSK_MASK_WINDOW_STOOL_INSTALL` — Window Stool Mask — Install
- `TSK_MASK_WINDOW_STOOL_REMOVE` — Window Stool Mask — Remove
- `TSK_PREP_HVAC_VENT_REINSTALL` — Reinstall HVAC Vent Covers
- `TSK_PREP_HVAC_VENT_REMOVE` — Remove HVAC Vent Covers
- `TSK_PREP_OUTLET_COVER_REINSTALL` — Reinstall Outlet/Switch Covers
- `TSK_PREP_OUTLET_COVER_REMOVE` — Remove Outlet/Switch Covers
- `TSK_PROJECT_LIGHT_FAN_MANTEL_INSTALL` — Light Fixtures + Ceiling Fans + Mantels — Install (project allowance)
- `TSK_PROJECT_LIGHT_FAN_MANTEL_REMOVE` — Light Fixtures + Ceiling Fans + Mantels — Remove (project allowance)
- `TSK_PROTECT_CEILING_EDGE_INSTALL` — Install Ceiling Edge Tape
- `TSK_PROTECT_CEILING_EDGE_REMOVE` — Remove Ceiling Edge Tape
- `TSK_PROTECT_CEILING_ENCAPSULATE_INSTALL` — Install Ceiling Encapsulation
- `TSK_PROTECT_CEILING_ENCAPSULATE_REMOVE` — Remove Ceiling Encapsulation
- `TSK_PROTECT_CEILING_PARTIAL_INSTALL` — Install Ceiling Partial Cover
- `TSK_PROTECT_CEILING_PARTIAL_REMOVE` — Remove Ceiling Partial Cover
- `TSK_PROTECT_CEILING_SPOT_INSTALL` — Install Ceiling Spot Mask (per opening)
- `TSK_PROTECT_CEILING_SPOT_REMOVE` — Remove Ceiling Spot Mask (per opening)
- `TSK_PROTECT_DEBRIS_CLEANUP` — Protection Debris Cleanup
- `TSK_PROTECT_FLOOR_EDGE_INSTALL` — Install Floor Edge Tape
- `TSK_PROTECT_FLOOR_EDGE_REMOVE` — Remove Floor Edge Tape
- `TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL` — Install Floor Encapsulation
- `TSK_PROTECT_FLOOR_ENCAPSULATE_REMOVE` — Remove Floor Encapsulation
- `TSK_PROTECT_FLOOR_FULL_INSTALL` — Install Floor Full Drape
- `TSK_PROTECT_FLOOR_FULL_REMOVE` — Remove Floor Full Drape
- `TSK_PROTECT_FLOOR_PARTIAL_INSTALL` — Install Floor Partial Drop
- `TSK_PROTECT_FLOOR_PARTIAL_REMOVE` — Remove Floor Partial Drop
- `TSK_PROTECT_FLOOR_SPOT_INSTALL` — Install Floor Spot Mask (per opening)
- `TSK_PROTECT_FLOOR_SPOT_REMOVE` — Remove Floor Spot Mask (per opening)
- `TSK_PROTECT_WALL_EDGE_INSTALL` — Install Wall Edge Tape
- `TSK_PROTECT_WALL_EDGE_REMOVE` — Remove Wall Edge Tape
- `TSK_PROTECT_WALL_ENCAPSULATE_INSTALL` — Install Wall Encapsulation
- `TSK_PROTECT_WALL_ENCAPSULATE_REMOVE` — Remove Wall Encapsulation
- `TSK_PROTECT_WALL_FULL_INSTALL` — Install Wall Full Drape
- `TSK_PROTECT_WALL_FULL_REMOVE` — Remove Wall Full Drape
- `TSK_PROTECT_WALL_PARTIAL_INSTALL` — Install Wall Partial Drape
- `TSK_PROTECT_WALL_PARTIAL_REMOVE` — Remove Wall Partial Drape
- `TSK_TRIM_TAPELINE_INSTALL` — Trim Tape Line Install
- `TSK_TRIM_TAPELINE_REMOVE` — Trim Tape Line Remove
- `TSK_VANITY_SMALL_ENCAP_INSTALL` — Vanity Small-Encapsulate Install (5min/ea minimum)
- `TSK_VANITY_SMALL_ENCAP_REMOVE` — Vanity Small-Encapsulate Remove

## PURE PROTECTION — retire candidates

36 modules. For each, verify the dedicated protection system covers what this module emits, then retire.

### `MOD_CLEANUP_TRIM_PRIME` · 78 scenarios · phase=cleanup

**Tasks** (3):

- `TSK_TRIM_REMOVE_WALL_MASK` — Remove Trim Wall Masking _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system
- `TSK_TRIM_REMOVE_FIXTURE_COVERS` — Remove Trim Fixture Covers _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system
- `TSK_TRIM_REMOVE_FLOOR_PROTECTION` — Remove Trim Floor Protection ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 78):

- `SCN_BASEBOARD_PRIME_FROM_BARE_QT3_BRUSH`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT3_SPRAY`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT4_BRUSH`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT4_SPRAY`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT5_BRUSH`

### `MOD_SETUP_TRIM_FLOOR_PROTECT` · 78 scenarios · phase=setup

**Tasks** (1):

- `TSK_TRIM_FLOOR_PROTECT_SETUP` — Install Trim Perimeter Floor Protection ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 78):

- `SCN_BASEBOARD_PRIME_FROM_BARE_QT3_BRUSH`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT3_SPRAY`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT4_BRUSH`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT4_SPRAY`
- `SCN_BASEBOARD_PRIME_FROM_BARE_QT5_BRUSH`

### `MOD_SETUP_TRIM_PAINT_PROTECT` · 72 scenarios · phase=setup

**Tasks** (3):

- `TSK_TRIM_PAINT_FLOOR_PROTECT` — Install Trim Paint Floor Protection _applies_when_: `{"pass_group_id":[null]}` ✗ NOT in protection system
- `TSK_TRIM_PAINT_WALL_MASK` — Mask Wall Adjacent to Trim (Paint) _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}` ✗ NOT in protection system
- `TSK_TRIM_PAINT_FIXTURE_COVER` — Cover Trim Fixtures (Paint) _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 72):

- `SCN_BASEBOARD_PAINT_QT3_BRUSH`
- `SCN_BASEBOARD_PAINT_QT3_SPRAY`
- `SCN_BASEBOARD_PAINT_QT4_BRUSH`
- `SCN_BASEBOARD_PAINT_QT4_SPRAY`
- `SCN_BASEBOARD_PAINT_QT5_BRUSH`

### `MOD_CLEANUP_STAIR_RISER` · 36 scenarios · phase=cleanup

**Tasks** (3):

- `TSK_STRS_REMOVE_WALL_MASK` — Remove Stair Wall Mask ✗ NOT in protection system
- `TSK_STRS_REMOVE_FLOOR_PROTECT` — Remove Stair Floor Protection ✗ NOT in protection system
- `TSK_STRS_REMOVE_TREAD_PROTECT` — Remove Tread Protection ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 36):

- `SCN_RISER_NC_QT3_BRUSH_FROM_BARE`
- `SCN_RISER_NC_QT3_BRUSH_FROM_PRIMED_FACTORY`
- `SCN_RISER_NC_QT3_SPRAY_FROM_BARE`
- `SCN_RISER_NC_QT3_SPRAY_FROM_PRIMED_FACTORY`
- `SCN_RISER_NC_QT4_BRUSH_FROM_BARE`

### `MOD_SETUP_STAIR_RISER` · 36 scenarios · phase=setup

**Tasks** (3):

- `TSK_STRS_TREAD_PROTECT` — Protect Stair Treads ✗ NOT in protection system
- `TSK_STRS_FLOOR_PROTECT` — Stair Landing Floor Protection ✗ NOT in protection system
- `TSK_STRS_WALL_MASK` — Mask Stair Wall ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 36):

- `SCN_RISER_NC_QT3_BRUSH_FROM_BARE`
- `SCN_RISER_NC_QT3_BRUSH_FROM_PRIMED_FACTORY`
- `SCN_RISER_NC_QT3_SPRAY_FROM_BARE`
- `SCN_RISER_NC_QT3_SPRAY_FROM_PRIMED_FACTORY`
- `SCN_RISER_NC_QT4_BRUSH_FROM_BARE`

### `MOD_SETUP_CLOSET_SHELF_PAINT` · 28 scenarios · phase=setup

**Tasks** (3):

- `TSK_CLSH_FLOOR_PROTECT` — Install Closet Shelf Floor Protection ✗ NOT in protection system
- `TSK_CLSH_WALL_MASK` — Mask Wall Adjacent to Closet Shelf _applies_when_: `{"application_method":["spray","spray_rolloff"]}` ✗ NOT in protection system
- `TSK_CLSH_FIXTURE_COVER` — Cover Fixtures Near Closet Shelf _applies_when_: `{"application_method":["spray","spray_rolloff"]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 28):

- `SCN_CLOSET_SHELF_NC_QT2_BARE_BR`
- `SCN_CLOSET_SHELF_NC_QT2_BARE_ROLLOFF`
- `SCN_CLOSET_SHELF_NC_QT2_BARE_SPRAY`
- `SCN_CLOSET_SHELF_NC_QT2_MELAMINE_BR`
- `SCN_CLOSET_SHELF_NC_QT2_MELAMINE_SPRAY`

### `MOD_SETUP_COMBINED_WC_FINISH` · 12 scenarios · phase=setup

**Tasks** (13):

- `TSK_INSPECT_FLOOR_PROTECTION` — Inspect Floor Protection _applies_when_: `{"floor_type":["finished","partial"]}` ✗ NOT in protection system
- `TSK_MASK_TRIM_BASEBOARD` — Mask Baseboard Top Edge ✗ NOT in protection system
- `TSK_MASK_TRIM_DOOR_CASING` — Mask Door Casing Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_WINDOW_CASING` — Mask Window Casing Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_CROWN` — Mask Crown Bottom Edge ✗ NOT in protection system
- `TSK_MASK_TRIM_CHAIR_RAIL` — Mask Chair Rail Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_PICTURE_RAIL` — Mask Picture Rail Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_WINDOW_STOOL` — Mask Window Stool Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_WINDOW_APRON` — Mask Window Apron Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_PANEL_MOLD` — Mask Panel Mold Edges ✗ NOT in protection system
- `TSK_MASK_TRIM_SHADOW_BOX` — Mask Shadow Box Edges ✗ NOT in protection system
- `TSK_PROTECT_CEILING_FIXTURES` — Protect Ceiling Fixtures ✗ NOT in protection system
- `TSK_VERIFY_MASK_OPENINGS` — Verify Window Masking ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 12):

- `SCN_COMBINED_WALLS_CEILING_FINISH_QT2_SPRAY_BACKROLL_EGGSHELL`
- `SCN_COMBINED_WALLS_CEILING_FINISH_QT2_SPRAY_BACKROLL_MATTE`
- `SCN_COMBINED_WALLS_CEILING_FINISH_QT2_SPRAY_BACKROLL_SATIN`
- `SCN_COMBINED_WALLS_CEILING_FINISH_QT3_SPRAY_BACKROLL_EGGSHELL`
- `SCN_COMBINED_WALLS_CEILING_FINISH_QT3_SPRAY_BACKROLL_MATTE`

### `MOD_SETUP_ARCH_ELEMENT` · 8 scenarios · phase=setup

**Tasks** (4):

- `TSK_ARCH_FLOOR_WORKZONE` — Workzone Floor Protection ✗ NOT in protection system
- `TSK_ARCH_FLOOR_PERIM` — Perimeter Floor Protection ✗ NOT in protection system
- `TSK_ARCH_WALL_MASK` — Mask Adjacent Wall ✗ NOT in protection system
- `TSK_ARCH_FIXTURE_MASK` — Mask Arch Element Fixtures ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 8):

- `SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE`
- `SCN_ARCH_ELEMENT_NC_QT3_SPRAY_FROM_BARE`
- `SCN_ARCH_ELEMENT_NC_QT4_BRUSH_FROM_BARE`
- `SCN_ARCH_ELEMENT_NC_QT4_SPRAY_FROM_BARE`
- `SCN_ARCH_ELEMENT_NC_QT5_BRUSH_FROM_BARE`

### `MOD_SETUP_BUILTIN` · 6 scenarios · phase=setup

**Tasks** (3):

- `TSK_BLT_FLOOR_PROTECT` — Builtin Floor Protection ✗ NOT in protection system
- `TSK_BLT_WALL_MASK` — Mask Wall Adjacent Builtin ✗ NOT in protection system
- `TSK_BLT_FIXTURE_MASK` — Mask Builtin Fixtures ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 6):

- `SCN_BUILTIN_NC_QT3_BRUSH_FROM_BARE`
- `SCN_BUILTIN_NC_QT3_SPRAY_FROM_BARE`
- `SCN_BUILTIN_NC_QT4_BRUSH_FROM_BARE`
- `SCN_BUILTIN_NC_QT4_SPRAY_FROM_BARE`
- `SCN_BUILTIN_NC_QT5_BRUSH_FROM_BARE`

### `MOD_SETUP_CEIL_MASK_ADJACENT` · 6 scenarios · phase=setup

**Tasks** (1):

- `TSK_CEIL_MASK_ADJACENT` — Mask Wall Edge for Ceiling Spray ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 6):

- `SCN_CEILING_PRIME_QT2_SPRAY`
- `SCN_CEILING_PRIME_QT2_SPRAY_BACKROLL`
- `SCN_CEILING_PRIME_QT3_SPRAY`
- `SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL`
- `SCN_CEILING_PRIME_QT4_SPRAY_BACKROLL`

### `MOD_SETUP_DOOR_FRAME_PAINT_PROTECT` · 6 scenarios · phase=setup

**Tasks** (3):

- `TSK_DOOR_FRAME_PAINT_FLOOR_PROTECT` — Install Door Frame Floor Protection _applies_when_: `{"pass_group_id":[null]}` ✗ NOT in protection system
- `TSK_DOOR_FRAME_WALL_MASK` — Mask Wall Adjacent to Door Frame _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}` ✗ NOT in protection system
- `TSK_DOOR_FRAME_FIXTURE_COVER` — Cover Fixtures Near Door Frame _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 6):

- `SCN_DOOR_FRAME_NC_QT3_BRUSH`
- `SCN_DOOR_FRAME_NC_QT3_SPRAY`
- `SCN_DOOR_FRAME_NC_QT4_BRUSH`
- `SCN_DOOR_FRAME_NC_QT4_SPRAY`
- `SCN_DOOR_FRAME_NC_QT5_BRUSH`

### `MOD_SETUP_FLOOR_PROTECT_CEILING` · 6 scenarios · phase=setup

**Tasks** (1):

- `TSK_CEIL_FLOOR_PROTECT_SETUP` — Install Full Floor Cover (Ceiling Spray) ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 6):

- `SCN_CEILING_PRIME_QT2_SPRAY`
- `SCN_CEILING_PRIME_QT2_SPRAY_BACKROLL`
- `SCN_CEILING_PRIME_QT3_SPRAY`
- `SCN_CEILING_PRIME_QT3_SPRAY_BACKROLL`
- `SCN_CEILING_PRIME_QT4_SPRAY_BACKROLL`

### `MOD_SETUP_WINDOW` · 6 scenarios · phase=setup

**Tasks** (5):

- `TSK_WIN_FLOOR_PROTECT` — Window Floor Protection _applies_when_: `{"pass_group_id":[null]}` ✗ NOT in protection system
- `TSK_WIN_GLASS_MASK` — Mask Window Glass ✗ NOT in protection system
- `TSK_WIN_HARDWARE_PROTECT` — Protect Window Hardware ✗ NOT in protection system
- `TSK_WIN_WALL_MASK` — Mask Wall Adjacent to Window ✗ NOT in protection system
- `TSK_WIN_SILL_PROTECT` — Protect Window Sill (Spray) _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 6):

- `SCN_WINDOW_INT_NC_QT3_BRUSH_FROM_BARE_WOOD`
- `SCN_WINDOW_INT_NC_QT3_SPRAY_FROM_BARE_WOOD`
- `SCN_WINDOW_INT_NC_QT4_BRUSH_FROM_BARE_WOOD`
- `SCN_WINDOW_INT_NC_QT4_SPRAY_FROM_FACTORY_WOOD`
- `SCN_WINDOW_INT_NC_QT5_BRUSH_FROM_BARE_WOOD`

### `MOD_SETUP_FIXTURE_COVERS` · 5 scenarios · phase=setup

**Tasks** (1):

- `TSK_FIXTURE_COVERS_SETUP` — Install Wall Fixture Covers ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 5):

- `SCN_DRYWALL_PRIME_QT2_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT3_SPRAY`
- `SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT4_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT5_SPRAY_BACKROLL`

### `MOD_SETUP_FLOOR_PROTECT_FULL` · 5 scenarios · phase=setup

**Tasks** (1):

- `TSK_FLOOR_PROTECT_FULL_SETUP` — Install Full Floor Cover ✗ NOT in protection system

**Sample scenarios using this module** (showing 5 of 5):

- `SCN_DRYWALL_PRIME_QT2_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT3_SPRAY`
- `SCN_DRYWALL_PRIME_QT3_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT4_SPRAY_BACKROLL`
- `SCN_DRYWALL_PRIME_QT5_SPRAY_BACKROLL`

### `MOD_SETUP_FLOOR_PROTECT_PERIMETER` · 4 scenarios · phase=setup

**Tasks** (1):

- `TSK_FLOOR_PROTECT_PERIMETER_SETUP` — Install Perimeter Floor Cover ✗ NOT in protection system

**Sample scenarios using this module** (showing 4 of 4):

- `SCN_DRYWALL_PRIME_QT2_ROLL`
- `SCN_DRYWALL_PRIME_QT3_ROLL`
- `SCN_DRYWALL_PRIME_QT4_ROLL`
- `SCN_DRYWALL_PRIME_QT5_ROLL`

### `MOD_SETUP_WAINSCOT` · 4 scenarios · phase=setup

**Tasks** (2):

- `TSK_WNSC_FLOOR_PROTECT` — Wainscot Floor Protection ✗ NOT in protection system
- `TSK_WNSC_WALL_MASK` — Mask Wall Above Wainscot ✗ NOT in protection system

**Sample scenarios using this module** (showing 4 of 4):

- `SCN_WAINSCOT_NC_BRUSH_FROM_BARE`
- `SCN_WAINSCOT_NC_SPRAY_FROM_BARE`
- `SCN_WAINSCOT_PAINT_BRUSH`
- `SCN_WAINSCOT_PAINT_SPRAY`

### `MOD_SETUP_WOOD_CEILING` · 2 scenarios · phase=setup

**Tasks** (3):

- `TSK_WDCL_FLOOR_PROTECT` — Wood Ceiling Floor Protection ✗ NOT in protection system
- `TSK_WDCL_WALL_MASK` — Mask Walls Below Wood Ceiling ✗ NOT in protection system
- `TSK_WDCL_FIXTURE_MASK` — Mask Wood Ceiling Fixtures ✗ NOT in protection system

**Sample scenarios using this module** (showing 2 of 2):

- `SCN_WOOD_CEILING_NC_QT3_BRUSH_FROM_BARE`
- `SCN_WOOD_CEILING_NC_QT3_SPRAY_FROM_BARE`

### `MOD_SETUP_WOOD_WALL` · 2 scenarios · phase=setup

**Tasks** (2):

- `TSK_WDWL_FLOOR_PROTECT` — Wood Wall Floor Protection ✗ NOT in protection system
- `TSK_WDWL_CEILING_MASK` — Mask Ceiling Above Wood Wall ✗ NOT in protection system

**Sample scenarios using this module** (showing 2 of 2):

- `SCN_WOOD_WALL_NC_QT3_BRUSH_FROM_BARE`
- `SCN_WOOD_WALL_NC_QT3_SPRAY_FROM_BARE`

### `MOD_CLEANUP_FINISH_GROUP` · 1 scenarios · phase=cleanup

**Tasks** (2):

- `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection ✗ NOT in protection system
- `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_COMBINED_FINISH_GROUP_V1A`

### `MOD_PROTECT_CABINET_EDGE` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CABT_PROT_EDGE_SETUP` — Mask Cabinets — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_EDGE_TEARDOWN` — Remove Cabinet Edge Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_EDGE`

### `MOD_PROTECT_CABINET_EDGE_ENCAPSULATE` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CABT_PROT_EDGE_SETUP` — Mask Cabinets — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_ENCAP_SETUP` — Mask Cabinets — Encapsulate (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_ENCAP_TEARDOWN` — Remove Cabinet Encapsulate Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_EDGE_ENCAPSULATE`

### `MOD_PROTECT_CABINET_EDGE_FULL` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CABT_PROT_EDGE_SETUP` — Mask Cabinets — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_FULL_SETUP` — Mask Cabinets — Full drape (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_FULL_TEARDOWN` — Remove Cabinet Full Drape ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_EDGE_FULL`

### `MOD_PROTECT_CABINET_EDGE_PARTIAL` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CABT_PROT_EDGE_SETUP` — Mask Cabinets — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_PARTIAL_SETUP` — Mask Cabinets — Partial perimeter (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_PARTIAL_TEARDOWN` — Remove Cabinet Partial Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_EDGE_PARTIAL`

### `MOD_PROTECT_CABINET_ENCAPSULATE` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CABT_PROT_ENCAP_SETUP` — Mask Cabinets — Encapsulate (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_ENCAP_TEARDOWN` — Remove Cabinet Encapsulate Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_ENCAPSULATE`

### `MOD_PROTECT_CABINET_FULL` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CABT_PROT_FULL_SETUP` — Mask Cabinets — Full drape (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_FULL_TEARDOWN` — Remove Cabinet Full Drape ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_FULL`

### `MOD_PROTECT_CABINET_PARTIAL` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CABT_PROT_PARTIAL_SETUP` — Mask Cabinets — Partial perimeter (setup) ✗ NOT in protection system
- `TSK_CABT_PROT_PARTIAL_TEARDOWN` — Remove Cabinet Partial Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CABINET_PROTECT_PARTIAL`

### `MOD_PROTECT_CLOSET_SHELF_EDGE` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CLOSET_SHELF_PROT_EDGE_SETUP` — Mask Closet Shelf — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_EDGE_TEARDOWN` — Remove Closet Shelf Edge Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_EDGE`

### `MOD_PROTECT_CLOSET_SHELF_EDGE_ENCAPSULATE` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CLOSET_SHELF_PROT_EDGE_SETUP` — Mask Closet Shelf — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_ENCAP_SETUP` — Mask Closet Shelf — Encapsulate (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_ENCAP_TEARDOWN` — Remove Closet Shelf Encapsulate Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_EDGE_ENCAPSULATE`

### `MOD_PROTECT_CLOSET_SHELF_EDGE_FULL` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CLOSET_SHELF_PROT_EDGE_SETUP` — Mask Closet Shelf — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_FULL_SETUP` — Mask Closet Shelf — Full drape (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_FULL_TEARDOWN` — Remove Closet Shelf Full Drape ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_EDGE_FULL`

### `MOD_PROTECT_CLOSET_SHELF_EDGE_PARTIAL` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_CLOSET_SHELF_PROT_EDGE_SETUP` — Mask Closet Shelf — Edge tape only (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_PARTIAL_SETUP` — Mask Closet Shelf — Partial perimeter (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_PARTIAL_TEARDOWN` — Remove Closet Shelf Partial Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_EDGE_PARTIAL`

### `MOD_PROTECT_CLOSET_SHELF_ENCAPSULATE` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CLOSET_SHELF_PROT_ENCAP_SETUP` — Mask Closet Shelf — Encapsulate (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_ENCAP_TEARDOWN` — Remove Closet Shelf Encapsulate Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_ENCAPSULATE`

### `MOD_PROTECT_CLOSET_SHELF_FULL` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CLOSET_SHELF_PROT_FULL_SETUP` — Mask Closet Shelf — Full drape (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_FULL_TEARDOWN` — Remove Closet Shelf Full Drape ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_FULL`

### `MOD_PROTECT_CLOSET_SHELF_PARTIAL` · 1 scenarios · phase=setup

**Tasks** (2):

- `TSK_CLOSET_SHELF_PROT_PARTIAL_SETUP` — Mask Closet Shelf — Partial perimeter (setup) ✗ NOT in protection system
- `TSK_CLOSET_SHELF_PROT_PARTIAL_TEARDOWN` — Remove Closet Shelf Partial Mask ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_CLOSET_SHELF_PROTECT_PARTIAL`

### `MOD_SETUP_FINISH_GROUP` · 1 scenarios · phase=setup

**Tasks** (3):

- `TSK_TRIM_PAINT_FLOOR_PROTECT` — Install Trim Paint Floor Protection ✗ NOT in protection system
- `TSK_TRIM_PAINT_WALL_MASK` — Mask Wall Adjacent to Trim (Paint) _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system
- `TSK_TRIM_PAINT_FIXTURE_COVER` — Cover Trim Fixtures (Paint) _applies_when_: `{"application_method":["spray"]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 1 of 1):

- `SCN_COMBINED_FINISH_GROUP_V1A`

### `MOD_DOOR_GLASS_MASK` · 0 scenarios · phase=setup

**Tasks** (2):

- `TSK_DOOR_GLASS_MASK` — Mask Glass Pane _applies_when_: `{"door_type":["french"]}` ✗ NOT in protection system
- `TSK_DOOR_GLASS_UNMASK` — Unmask Glass Pane _applies_when_: `{"door_type":["french"]}` ✗ NOT in protection system

**Sample scenarios using this module** (showing 0 of 0):


## MIXED — split candidates

105 modules. For each, the protection-tagged tasks should be removed; the real-work tasks should stay.

### `MOD_CLEANUP_STAIR_RAILING` · 48 scenarios · phase=cleanup · 3/4 protection

- 🔨 KEEP    `TSK_STRL_BRACKET_REINSTALL` — Reinstall Handrail Brackets
- 🛡️  REMOVE `TSK_STRL_REMOVE_WALL_MASK` — Remove Railing Wall Mask
- 🛡️  REMOVE `TSK_STRL_REMOVE_FLOOR_PROTECT` — Remove Railing Floor Protection
- 🛡️  REMOVE `TSK_STRL_REMOVE_TREAD_PROTECT` — Remove Tread Protection (Railing)

### `MOD_SETUP_STAIR_RAILING` · 48 scenarios · phase=setup · 3/4 protection

- 🛡️  REMOVE `TSK_STRL_TREAD_VERIFY` — Verify Tread Protection
- 🛡️  REMOVE `TSK_STRL_FLOOR_PROTECT` — Stair Railing Floor Protection
- 🛡️  REMOVE `TSK_STRL_WALL_MASK` — Mask Wall Behind Railing
- 🔨 KEEP    `TSK_STRL_BRACKET_REMOVE` — Remove Handrail Brackets

### `MOD_CLEANUP_CLOSET_SHELF_PAINT` · 28 scenarios · phase=cleanup · 3/4 protection

- 🔨 KEEP    `TSK_CLSH_FINAL_INSPECT` — Final Inspect Closet Shelf
- 🛡️  REMOVE `TSK_CLSH_REMOVE_FLOOR_PROTECT` — Remove Closet Floor Protection
- 🛡️  REMOVE `TSK_CLSH_REMOVE_WALL_MASK` — Remove Closet Shelf Wall Masking _applies_when_: `{"application_method":["spray","spray_rolloff"]}`
- 🛡️  REMOVE `TSK_CLSH_REMOVE_FIXTURE_COVERS` — Remove Fixture Covers _applies_when_: `{"application_method":["spray","spray_rolloff"]}`

### `MOD_CLEANUP_CABINET` · 24 scenarios · phase=cleanup · 1/7 protection

- 🔨 KEEP    `TSK_CABT_DOOR_REINSTALL` — Reinstall Cabinet Doors
- 🔨 KEEP    `TSK_CABT_DRAWER_REINSTALL` — Reinstall Cabinet Drawers
- 🔨 KEEP    `TSK_CABT_HARDWARE_REINSTALL` — Reinstall Cabinet Hardware
- 🔨 KEEP    `TSK_CABT_FINAL_INSPECT_FRAME` — Final Inspect Cabinet Frame
- 🛡️  REMOVE `TSK_CABT_REMOVE_BACKSPLASH_MASK` — Remove Backsplash Mask
- 🔨 KEEP    `TSK_CABT_REMOVE_COUNTERTOP_COVER` — Remove Countertop Cover
- 🔨 KEEP    `TSK_CABT_REMOVE_FLOOR_FULL` — Remove Full Kitchen Floor Cover

### `MOD_SETUP_CABINET` · 24 scenarios · phase=setup · 1/6 protection

- 🔨 KEEP    `TSK_CABT_FLOOR_FULL` — Full Kitchen Floor Cover
- 🔨 KEEP    `TSK_CABT_COUNTERTOP_COVER` — Countertop Cover
- 🛡️  REMOVE `TSK_CABT_BACKSPLASH_MASK` — Mask Backsplash
- 🔨 KEEP    `TSK_CABT_HARDWARE_REMOVE` — Remove Cabinet Hardware
- 🔨 KEEP    `TSK_CABT_DOOR_REMOVE` — Remove Cabinet Doors
- 🔨 KEEP    `TSK_CABT_DRAWER_REMOVE` — Remove Cabinet Drawers

### `MOD_CLEANUP_EXT_PORCH_FLOOR_RP` · 13 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_XPFRP_FINAL_INSPECT` — Final Inspection and Touch-Up
- 🛡️  REMOVE `TSK_XPFRP_REMOVE_PROTECTION` — Remove Protection and Masking
- 🔨 KEEP    `TSK_XPFRP_FURNITURE_RETURN` — Furniture Return (After Cure)
- 🔨 KEEP    `TSK_XPFRP_CUSTOMER_COMM` — Customer Cure-Time Communication
- 🔨 KEEP    `TSK_XPFRP_CLEANUP` — Equipment Cleanup and Demobilization

### `MOD_PROTECT_EXT_PORCH_FLOOR_RP` · 13 scenarios · phase=setup · 5/9 protection

- 🛡️  REMOVE `TSK_XPFRP_WALL_BASE_PROTECT` — Wall Base Protection
- 🛡️  REMOVE `TSK_XPFRP_RAILING_BASE_PROTECT` — Railing Base Protection _applies_when_: `{"railing_present":true}`
- 🛡️  REMOVE `TSK_XPFRP_DOOR_THRESHOLD_MASK` — Door Threshold Masking
- 🛡️  REMOVE `TSK_XPFRP_LANDSCAPE_PROTECT` — Landscape Perimeter Protection _applies_when_: `{"landscape_adjacent":true}`
- 🛡️  REMOVE `TSK_XPFRP_HARDSCAPE_PROTECT` — Hardscape Edge Protection _applies_when_: `{"hardscape_adjacent":true}`
- 🔨 KEEP    `TSK_XPFRP_FURNITURE_CLEAR` — Furniture and Obstacle Clearing
- 🔨 KEEP    `TSK_XPFRP_MOBILIZE` — Mobilization and Equipment Staging
- 🔨 KEEP    `TSK_XPFRP_EQUIPMENT_SETUP_ROLL` — Roll Equipment Setup _applies_when_: `{"application_method":["roll","brush_roll"]}`
- 🔨 KEEP    `TSK_XPFRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`

### `MOD_CLEANUP_COMBINED_WC_FINISH` · 12 scenarios · phase=cleanup · 3/6 protection

- 🛡️  REMOVE `TSK_REMOVE_TRIM_MASKING` — Remove Trim Masking Tape
- 🛡️  REMOVE `TSK_REMOVE_FIXTURE_PROTECTION_WALL` — Remove Wall Fixture Protection _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🛡️  REMOVE `TSK_REMOVE_CEILING_PROTECTION` — Remove Ceiling Fixture Protection _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_VACUUM_SUBFLOOR_POST_CEILING` — Vacuum Floor After Ceiling Finish
- 🔨 KEEP    `TSK_FINAL_INSPECT_WALL` — Final Wall Inspection
- 🔨 KEEP    `TSK_FINAL_INSPECT_CEILING` — Final Inspect Ceiling Finish

### `MOD_CLEANUP_EXT_SIDING_RP` · 12 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_WSRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_WSRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_WSRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_WSRP_SITE_CLEANUP` — Site Cleanup & Demobilization
- 🔨 KEEP    `TSK_WSRP_FINAL_WALKTHROUGH` — Final Customer Walkthrough

### `MOD_PROTECT_EXT_SIDING_RP` · 12 scenarios · phase=setup · 6/8 protection

- 🛡️  REMOVE `TSK_WSRP_PROTECT_LANDSCAPE` — Landscape Edge Protection
- 🛡️  REMOVE `TSK_WSRP_PROTECT_LANDSCAPE_FULL` — Full Landscape Protection (Spray) _applies_when_: `{"application_method":["spray_backroll","spray_backbrush"]}`
- 🛡️  REMOVE `TSK_WSRP_PROTECT_HARDSCAPE` — Hardscape Protection
- 🛡️  REMOVE `TSK_WSRP_PROTECT_LIGHT_FIXTURE` — Light Fixture Masking
- 🛡️  REMOVE `TSK_WSRP_PROTECT_HVAC` — HVAC Unit Cover
- 🛡️  REMOVE `TSK_WSRP_PROTECT_VEHICLE` — Vehicle Protection (Spray) _applies_when_: `{"application_method":["spray_backroll","spray_backbrush"]}`
- 🔨 KEEP    `TSK_WSRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll","spray_backbrush"]}`
- 🔨 KEEP    `TSK_WSRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll","brush"]}`

### `MOD_CLEANUP_EXT_PORCH_FLOOR` · 11 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_XPRFL_FINAL_INSPECT` — Final Inspection and Anti-Slip Verification
- 🛡️  REMOVE `TSK_XPRFL_REMOVE_PROTECTION` — Remove Protection and Masking
- 🔨 KEEP    `TSK_XPRFL_REPLACE_FURNITURE` — Replace Furniture and Fixtures
- 🔨 KEEP    `TSK_XPRFL_CLEANUP` — Equipment Cleanup and Demobilization

### `MOD_PROTECT_EXT_PORCH_FLOOR` · 11 scenarios · phase=setup · 5/9 protection

- 🛡️  REMOVE `TSK_XPRFL_WALL_BASE_PROTECT` — Wall Base Protection
- 🛡️  REMOVE `TSK_XPRFL_RAILING_BASE_PROTECT` — Railing Base Protection _applies_when_: `{"railing_present":true}`
- 🛡️  REMOVE `TSK_XPRFL_DOOR_THRESHOLD_MASK` — Door Threshold Masking
- 🛡️  REMOVE `TSK_XPRFL_LANDSCAPE_PROTECT` — Landscape Perimeter Protection _applies_when_: `{"landscape_adjacent":true}`
- 🛡️  REMOVE `TSK_XPRFL_HARDSCAPE_PROTECT` — Hardscape Edge Protection _applies_when_: `{"hardscape_adjacent":true}`
- 🔨 KEEP    `TSK_XPRFL_FURNITURE_CLEAR` — Furniture and Obstacle Clearing
- 🔨 KEEP    `TSK_XPRFL_MOBILIZE` — Mobilization and Equipment Staging
- 🔨 KEEP    `TSK_XPRFL_EQUIPMENT_SETUP_ROLL` — Roll Equipment Setup _applies_when_: `{"application_method":["roll","brush_roll"]}`
- 🔨 KEEP    `TSK_XPRFL_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`

### `MOD_CLEANUP_CEILING_PRIME` · 10 scenarios · phase=cleanup · 2/3 protection

- 🛡️  REMOVE `TSK_CEIL_FLOOR_PROTECT_TEARDOWN` — Tear Down Floor Cover (Ceiling Spray) _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🛡️  REMOVE `TSK_CEIL_REMOVE_MASKING` — Remove Ceiling Wall-Edge Masking _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_CEIL_FINAL_INSPECT_PRIME` — Final Inspect Primed Ceiling

### `MOD_CLEANUP_CEILING_FINISH` · 9 scenarios · phase=cleanup · 1/3 protection

- 🔨 KEEP    `TSK_VACUUM_SUBFLOOR_POST_CEILING` — Vacuum Floor After Ceiling Finish
- 🛡️  REMOVE `TSK_REMOVE_CEILING_PROTECTION` — Remove Ceiling Fixture Protection _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_FINAL_INSPECT_CEILING` — Final Inspect Ceiling Finish

### `MOD_CLEANUP_DOOR` · 9 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_DOOR_FINAL_INSPECT` — Final Inspect Door
- 🔨 KEEP    `TSK_DOOR_HARDWARE_REINSTALL` — Reinstall Door Hardware (Spray) _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_DOOR_HARDWARE_UNMASK` — Unmask Door Hardware (Brush) _applies_when_: `{"application_method":["brush"]}`
- 🛡️  REMOVE `TSK_DOOR_FLOOR_PROTECT_TEARDOWN` — Tear Down Door Floor Protection

### `MOD_CLEANUP_EXT_METAL` · 9 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_METL_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_METL_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_METL_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_METL_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_WALL_FINISH` · 9 scenarios · phase=cleanup · 2/4 protection

- 🛡️  REMOVE `TSK_REMOVE_TRIM_MASKING` — Remove Trim Masking Tape
- 🔨 KEEP    `TSK_VACUUM_SUBFLOOR_POST_WALL` — Vacuum Floor
- 🛡️  REMOVE `TSK_REMOVE_FIXTURE_PROTECTION_WALL` — Remove Wall Fixture Protection _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_FINAL_INSPECT_WALL` — Final Wall Inspection

### `MOD_CLEANUP_WALL_PRIME` · 9 scenarios · phase=cleanup · 3/5 protection

- 🛡️  REMOVE `TSK_FLOOR_PROTECT_FULL_TEARDOWN` — Tear Down Full Floor Cover _applies_when_: `{"application_method":["spray_backroll"]}`
- 🛡️  REMOVE `TSK_FLOOR_PROTECT_PERIMETER_TEARDOWN` — Tear Down Perimeter Floor Cover _applies_when_: `{"application_method":["roll"]}`
- 🛡️  REMOVE `TSK_FIXTURE_COVERS_TEARDOWN_PRIME` — Remove Wall Fixture Covers _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_WALL_FINAL_INSPECT_PRIME` — Final Inspect Primed Wall
- 🔨 KEEP    `TSK_WALL_VACUUM_CLEANUP_PRIME` — Vacuum Floor After Prime

### `MOD_PROTECT_EXT_METAL` · 9 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_METL_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_METL_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_METL_SIDING_PROTECT` — Adjacent Siding Protection _applies_when_: `{"application_method":["spray","spray_backbrush"]}`
- 🛡️  REMOVE `TSK_METL_FIXTURE_MASK` — Fixture Masking
- 🔨 KEEP    `TSK_METL_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backbrush"]}`
- 🔨 KEEP    `TSK_METL_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_SETUP_DOOR` · 9 scenarios · phase=setup · 2/3 protection

- 🛡️  REMOVE `TSK_DOOR_FLOOR_PROTECT` — Door Floor Protection
- 🔨 KEEP    `TSK_DOOR_HARDWARE_REMOVE` — Remove Door Hardware (Spray) _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_DOOR_HARDWARE_MASK` — Mask Door Hardware (Brush) _applies_when_: `{"application_method":["brush"]}`

### `MOD_CLEANUP_ARCH_ELEMENT` · 8 scenarios · phase=cleanup · 2/4 protection

- 🛡️  REMOVE `TSK_ARCH_REMOVE_WALL_MASK` — Remove Arch Wall Mask
- 🛡️  REMOVE `TSK_ARCH_REMOVE_FIXTURE_MASK` — Remove Arch Fixture Mask
- 🔨 KEEP    `TSK_ARCH_REMOVE_FLOOR_WORKZONE` — Remove Workzone Floor
- 🔨 KEEP    `TSK_ARCH_REMOVE_FLOOR_PERIM` — Remove Perimeter Floor

### `MOD_CLEANUP_EXT_PORCH_CEILING` · 8 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_XPRCH_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_XPRCH_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_XPRCH_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_XPRCH_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_PORCH_CEILING_RP` · 8 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_XPCRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_XPCRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_XPCRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_XPCRP_SITE_CLEANUP` — Site Debris Cleanup
- 🔨 KEEP    `TSK_XPCRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_SOFFIT` · 8 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_XSFIT_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_XSFIT_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_XSFIT_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_XSFIT_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_SOFFIT_RP` · 8 scenarios · phase=cleanup · 2/6 protection

- 🔨 KEEP    `TSK_XSFRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_XSFRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_XSFRP_VENT_UNMASK` — Remove Vent Opening Masking _applies_when_: `{"soffit_vent_type":["vented"]}`
- 🛡️  REMOVE `TSK_XSFRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_XSFRP_SITE_CLEANUP` — Site Debris Cleanup
- 🔨 KEEP    `TSK_XSFRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_TRIM_RP` · 8 scenarios · phase=cleanup · 2/7 protection

- 🔨 KEEP    `TSK_TRRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_TRRP_TOUCHUP` — Touch-Up Defects
- 🔨 KEEP    `TSK_TRRP_TOUCHUP_TRANSITIONS` — Touch-Up Trim-to-Wall Transitions
- 🛡️  REMOVE `TSK_TRRP_TEARDOWN_PROTECTION` — Protection Material Removal
- 🛡️  REMOVE `TSK_TRRP_SCAFFOLD_TEARDOWN` — Scaffold / Lift Teardown
- 🔨 KEEP    `TSK_TRRP_WASTE_DISPOSAL` — Waste Disposal & Site Cleanup
- 🔨 KEEP    `TSK_TRRP_FINAL_WALKTHROUGH` — Final Customer Walkthrough

### `MOD_PROTECT_EXT_PORCH_CEILING` · 8 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_XPRCH_FLOOR_PROTECT` — Porch Floor Protection
- 🛡️  REMOVE `TSK_XPRCH_FURNITURE_PROTECT` — Porch Furniture Cover/Removal
- 🛡️  REMOVE `TSK_XPRCH_FIXTURE_MASK` — Porch Ceiling Fixture Masking
- 🛡️  REMOVE `TSK_XPRCH_FASCIA_MASK` — Fascia/Wall Junction Masking
- 🔨 KEEP    `TSK_XPRCH_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`
- 🔨 KEEP    `TSK_XPRCH_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll","spray_backbrush"]}`

### `MOD_PROTECT_EXT_PORCH_CEILING_RP` · 8 scenarios · phase=setup · 5/7 protection

- 🛡️  REMOVE `TSK_XPCRP_FLOOR_PROTECT` — Porch Floor Protection
- 🛡️  REMOVE `TSK_XPCRP_FURNITURE_PROTECT` — Porch Furniture Cover/Removal
- 🛡️  REMOVE `TSK_XPCRP_FIXTURE_MASK` — Porch Ceiling Fixture Masking
- 🛡️  REMOVE `TSK_XPCRP_FASCIA_MASK` — Fascia/Wall Junction Masking
- 🛡️  REMOVE `TSK_XPCRP_SIDING_MASK` — Adjacent Siding Masking (Spray Only) _applies_when_: `{"application_method":["spray","spray_backroll","spray_backbrush"]}`
- 🔨 KEEP    `TSK_XPCRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`
- 🔨 KEEP    `TSK_XPCRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll","spray_backbrush"]}`

### `MOD_PROTECT_EXT_SOFFIT` · 8 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_XSFIT_LANDSCAPE_PROTECT` — Landscape Ground Protection Below Soffit
- 🛡️  REMOVE `TSK_XSFIT_HARDSCAPE_PROTECT` — Hardscape Protection Below Soffit
- 🛡️  REMOVE `TSK_XSFIT_FIXTURE_MASK` — Soffit-Mounted Fixture Masking
- 🛡️  REMOVE `TSK_XSFIT_FASCIA_MASK` — Fascia Junction Masking _applies_when_: `{"fascia_finished":true}`
- 🔨 KEEP    `TSK_XSFIT_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`
- 🔨 KEEP    `TSK_XSFIT_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll","spray_backbrush"]}`

### `MOD_PROTECT_EXT_SOFFIT_RP` · 8 scenarios · phase=setup · 5/7 protection

- 🛡️  REMOVE `TSK_XSFRP_LANDSCAPE_PROTECT` — Landscape Ground Protection Below Soffit
- 🛡️  REMOVE `TSK_XSFRP_HARDSCAPE_PROTECT` — Hardscape Protection Below Soffit
- 🛡️  REMOVE `TSK_XSFRP_FIXTURE_MASK` — Soffit-Mounted Fixture Masking
- 🛡️  REMOVE `TSK_XSFRP_FASCIA_MASK` — Fascia Junction Masking
- 🛡️  REMOVE `TSK_XSFRP_VENT_MASK` — Mask Soffit Vent Openings _applies_when_: `{"soffit_vent_type":["vented"]}`
- 🔨 KEEP    `TSK_XSFRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`
- 🔨 KEEP    `TSK_XSFRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll","spray_backbrush"]}`

### `MOD_PROTECT_EXT_TRIM_RP` · 8 scenarios · phase=setup · 9/11 protection

- 🔨 KEEP    `TSK_TRRP_MOBILIZE` — Crew Mobilization & Staging
- 🔨 KEEP    `TSK_TRRP_SCAFFOLD_SETUP` — Scaffold / Lift / Ladder Setup
- 🛡️  REMOVE `TSK_TRRP_PROTECT_GROUND` — Ground & Landscape Protection
- 🛡️  REMOVE `TSK_TRRP_PROTECT_HARDSCAPE` — Hardscape / Walkway Protection
- 🛡️  REMOVE `TSK_TRRP_PROTECT_WINDOW_GLASS` — Window Glass Masking
- 🛡️  REMOVE `TSK_TRRP_PROTECT_DOOR` — Door Face / Glass Masking
- 🛡️  REMOVE `TSK_TRRP_PROTECT_WINDOW_FULL` — Full Window Mask (Not Painting)
- 🛡️  REMOVE `TSK_TRRP_PROTECT_DOOR_FULL` — Full Door Mask (Not Painting)
- 🛡️  REMOVE `TSK_TRRP_PROTECT_LIGHT_FIXTURE` — Light Fixture Masking
- 🛡️  REMOVE `TSK_TRRP_PROTECT_ROOFLINE` — Roofline Edge Protection
- 🛡️  REMOVE `TSK_TRRP_PROTECT_WALL_MASK` — Wall Mask (Spray Only) _applies_when_: `{"application_method":["spray"]}`

### `MOD_CLEANUP_EXT_GARAGE_DOOR` · 7 scenarios · phase=cleanup · 1/7 protection

- 🔨 KEEP    `TSK_GRDR_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_GRDR_FINAL_TOUCHUP` — Final Touch-Up
- 🔨 KEEP    `TSK_GRDR_ARTICULATION_TEST` — Articulation Test
- 🔨 KEEP    `TSK_GRDR_BALANCE_CHECK` — Balance Check (Safety Gate)
- 🔨 KEEP    `TSK_GRDR_BOTTOM_SEAL_REINSTALL` — Bottom Seal Reinstall
- 🛡️  REMOVE `TSK_GRDR_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_GRDR_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_WINDOW` · 7 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_WIN_FINAL_INSPECT` — Final Inspect Window
- 🔨 KEEP    `TSK_WIN_TOUCHUP` — Window Final Touchup
- 🔨 KEEP    `TSK_WIN_GLASS_SCRAPE` — Scrape Glass Bleed-Through
- 🔨 KEEP    `TSK_WIN_HARDWARE_REINSTALL` — Reinstall Window Hardware
- 🛡️  REMOVE `TSK_WIN_PROTECT_TEARDOWN` — Tear Down Window Protection _applies_when_: `{"pass_group_id":[null]}`

### `MOD_PROTECT_EXT_GARAGE_DOOR` · 7 scenarios · phase=setup · 5/8 protection

- 🛡️  REMOVE `TSK_GRDR_DRIVEWAY_PROTECT` — Driveway/Apron Protection
- 🛡️  REMOVE `TSK_GRDR_TRACK_HARDWARE_MASK` — Track/Hardware Masking
- 🛡️  REMOVE `TSK_GRDR_WINDOW_MASK` — Window Insert Masking _applies_when_: `{"has_windows":true}`
- 🛡️  REMOVE `TSK_GRDR_WEATHERSTRIP_PROTECT` — Weatherstrip Protection
- 🔨 KEEP    `TSK_GRDR_BOTTOM_SEAL_MANAGE` — Bottom Seal Management
- 🛡️  REMOVE `TSK_GRDR_SIDING_MASK` — Adjacent Siding Masking _applies_when_: `{"application_method":["spray","spray_backbrush"]}`
- 🔨 KEEP    `TSK_GRDR_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backbrush"]}`
- 🔨 KEEP    `TSK_GRDR_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_CLEANUP_BASEBOARD_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_BUILTIN` · 6 scenarios · phase=cleanup · 3/4 protection

- 🔨 KEEP    `TSK_BLT_FINAL_INSPECT` — Final Inspect Builtin
- 🛡️  REMOVE `TSK_BLT_REMOVE_WALL_MASK` — Remove Builtin Wall Mask
- 🛡️  REMOVE `TSK_BLT_REMOVE_FIXTURE_MASK` — Remove Builtin Fixture Mask
- 🛡️  REMOVE `TSK_BLT_REMOVE_FLOOR_PROTECT` — Remove Builtin Floor Protection

### `MOD_CLEANUP_CHAIR_RAIL_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_CROWN_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_DOOR_CASING_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_DOOR_FRAME_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_EXT_DOOR_RP` · 6 scenarios · phase=cleanup · 1/7 protection

- 🔨 KEEP    `TSK_DRRP_HARDWARE_REINSTALL` — Reinstall Door Hardware
- 🔨 KEEP    `TSK_DRRP_WEATHERSTRIP_REINSTALL` — Weatherstrip Reinstall
- 🔨 KEEP    `TSK_DRRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_DRRP_TOUCHUP` — Touch-Up Defects
- 🛡️  REMOVE `TSK_DRRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_DRRP_WASTE_DISPOSAL` — Waste Disposal & Site Cleanup
- 🔨 KEEP    `TSK_DRRP_FINAL_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_ENG_SIDING` · 6 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_ENSD_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_ENSD_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_ENSD_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_ENSD_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_ENG_SIDING_RP` · 6 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_EWRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_EWRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_EWRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_EWRP_SITE_CLEANUP` — Site Debris Cleanup
- 🔨 KEEP    `TSK_EWRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_FENCE` · 6 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_FNCE_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_FNCE_TOUCHUP` — Touch-Up
- 🔨 KEEP    `TSK_FNCE_GATE_HARDWARE_REINSTALL` — Gate Hardware Reinstall
- 🛡️  REMOVE `TSK_FNCE_PROTECT_TEARDOWN` — Protection Teardown

### `MOD_CLEANUP_EXT_MASONRY_RP` · 6 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_MSRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_MSRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_MSRP_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_MSRP_SITE_CLEANUP` — Site Cleanup
- 🔨 KEEP    `TSK_MSRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_SIDING` · 6 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_SDNG_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_SDNG_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_SDNG_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_SDNG_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_STUCCO_RP` · 6 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_SCRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_SCRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_SCRP_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_SCRP_SITE_CLEANUP` — Site Cleanup
- 🔨 KEEP    `TSK_SCRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_PANEL_MOLD_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_PICTURE_RAIL_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_SHADOW_BOX_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_SHOE_MOLD_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_WINDOW_APRON_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_WINDOW_CASING_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_WINDOW_JAMB_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_CLEANUP_WINDOW_STOOL_PAINT` · 6 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_LF` — Final Inspect (LF)
- 🔨 KEEP    `TSK_FINAL_TOUCHUP_LF` — Final Touchup (LF)
- 🛡️  REMOVE `TSK_TRIM_PAINT_PROTECT_TEARDOWN` — Tear Down Trim Paint Protection _applies_when_: `{"pass_group_id":[null]}`
- 🛡️  REMOVE `TSK_TRIM_PAINT_REMOVE_WALL_MASK` — Remove Trim Paint Wall Mask _applies_when_: `{"application_method":["spray"],"pass_group_id":[null]}`

### `MOD_PROTECT_EXT_DOOR_RP` · 6 scenarios · phase=setup · 4/8 protection

- 🔨 KEEP    `TSK_DRRP_MOBILIZE` — Crew Mobilization
- 🔨 KEEP    `TSK_DRRP_HARDWARE_REMOVE` — Remove All Door Hardware
- 🛡️  REMOVE `TSK_DRRP_WEATHERSTRIP_PROTECT` — Weatherstrip Protection
- 🛡️  REMOVE `TSK_DRRP_THRESHOLD_PROTECT` — Threshold Protection
- 🛡️  REMOVE `TSK_DRRP_GLASS_MASK` — Glass Lite Masking _applies_when_: `{"door_complexity":["panel","grand_entry"]}`
- 🛡️  REMOVE `TSK_DRRP_PROTECT_GROUND` — Ground/Walkway Protection
- 🔨 KEEP    `TSK_DRRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_DRRP_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_PROTECT_EXT_ENG_SIDING` · 6 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_ENSD_LANDSCAPE_PROTECT` — Landscape Protection Setup
- 🛡️  REMOVE `TSK_ENSD_HARDSCAPE_PROTECT` — Hardscape Protection Setup
- 🛡️  REMOVE `TSK_ENSD_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_ENSD_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_ENSD_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_ENG_SIDING_RP` · 6 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_EWRP_LANDSCAPE_PROTECT` — Landscape Perimeter Protection
- 🛡️  REMOVE `TSK_EWRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_EWRP_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_EWRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_EWRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_FENCE` · 6 scenarios · phase=setup · 4/7 protection

- 🛡️  REMOVE `TSK_FNCE_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_FNCE_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_FNCE_SIDING_PROTECT` — Siding Tie-In Protection
- 🛡️  REMOVE `TSK_FNCE_NEIGHBOR_NOTIFY` — Neighbor Property Protection/Notification
- 🔨 KEEP    `TSK_FNCE_GATE_HARDWARE_REMOVE` — Gate Hardware Removal
- 🔨 KEEP    `TSK_FNCE_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_FNCE_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll","roll"]}`

### `MOD_PROTECT_EXT_MASONRY_RP` · 6 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_MSRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_MSRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_MSRP_FIXTURE_MASK` — Fixture Masking
- 🔨 KEEP    `TSK_MSRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_MSRP_EQUIPMENT_SETUP_ROLL` — Roll/Brush Equipment Setup _applies_when_: `{"application_method":["roll","brush"]}`

### `MOD_PROTECT_EXT_SIDING` · 6 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_SDNG_LANDSCAPE_PROTECT` — Landscape Protection Setup
- 🛡️  REMOVE `TSK_SDNG_HARDSCAPE_PROTECT` — Hardscape Protection Setup
- 🛡️  REMOVE `TSK_SDNG_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_SDNG_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray","spray_backroll"]}`
- 🔨 KEEP    `TSK_SDNG_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_STUCCO_RP` · 6 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_SCRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_SCRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_SCRP_FIXTURE_MASK` — Fixture Masking (Stucco Tape)
- 🛡️  REMOVE `TSK_SCRP_HVAC_COVER` — HVAC Unit Protection
- 🔨 KEEP    `TSK_SCRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_SCRP_EQUIPMENT_SETUP_ROLL` — Roll/Brush Equipment Setup _applies_when_: `{"application_method":["roll","brush"]}`

### `MOD_CLEANUP_EXT_FOUNDATION` · 5 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_FNDN_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_FNDN_TOUCHUP` — Touch-Up
- 🛡️  REMOVE `TSK_FNDN_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_FNDN_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_PROTECT_EXT_FOUNDATION` · 5 scenarios · phase=setup · 2/4 protection

- 🛡️  REMOVE `TSK_FNDN_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_FNDN_HARDSCAPE_PROTECT` — Hardscape Protection
- 🔨 KEEP    `TSK_FNDN_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_FNDN_EQUIPMENT_SETUP_ROLL` — Roll/Brush Equipment Setup _applies_when_: `{"application_method":["roll","brush"]}`

### `MOD_CLEANUP_EXT_DOOR` · 4 scenarios · phase=cleanup · 2/7 protection

- 🔨 KEEP    `TSK_XDOR_HARDWARE_REINSTALL` — Hardware Reinstallation
- 🔨 KEEP    `TSK_XDOR_WEATHERSTRIP_REINSTALL` — Weatherstrip Reinstall & Check
- 🔨 KEEP    `TSK_XDOR_OPERATION_TEST` — Door Operation Test
- 🔨 KEEP    `TSK_XDOR_FINAL_INSPECT` — Final Door Inspection
- 🔨 KEEP    `TSK_XDOR_TOUCHUP` — Touch-Up Minor Defects
- 🛡️  REMOVE `TSK_XDOR_GLASS_UNMASK` — Glass Masking Removal _applies_when_: `{"door_complexity":["panel","grand_entry"]}`
- 🛡️  REMOVE `TSK_XDOR_PROTECT_TEARDOWN` — Protection Teardown

### `MOD_CLEANUP_EXT_FC_SIDING` · 4 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_FCSD_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_FCSD_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_FCSD_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_FCSD_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_FC_SIDING_RP` · 4 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_FCRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_FCRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_FCRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_FCRP_SITE_CLEANUP` — Site Debris Cleanup
- 🔨 KEEP    `TSK_FCRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_FOUNDATION_RP` · 4 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_FNRP_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_FNRP_TOUCHUP` — Touch-Up
- 🛡️  REMOVE `TSK_FNRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_FNRP_SITE_CLEANUP` — Site Debris Cleanup
- 🔨 KEEP    `TSK_FNRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_TRIM` · 4 scenarios · phase=cleanup · 2/5 protection

- 🔨 KEEP    `TSK_XTRM_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_XTRM_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_XTRM_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_XTRM_SITE_CLEANUP` — Site Debris Cleanup
- 🛡️  REMOVE `TSK_XTRM_SCAFFOLD_TEARDOWN` — Scaffold / Lift / Ladder Teardown

### `MOD_CLEANUP_EXT_WINDOW` · 4 scenarios · phase=cleanup · 2/7 protection

- 🔨 KEEP    `TSK_XWIN_FINAL_INSPECT` — Final Window Inspection
- 🔨 KEEP    `TSK_XWIN_TOUCHUP` — Touch-Up Defects
- 🔨 KEEP    `TSK_XWIN_GLASS_CLEANUP` — Glass Cleanup - Razor Scrape
- 🛡️  REMOVE `TSK_XWIN_MASK_REMOVE` — Glass Masking Removal
- 🔨 KEEP    `TSK_XWIN_HARDWARE_REINSTALL` — Hardware Reinstallation
- 🔨 KEEP    `TSK_XWIN_WEATHERSTRIP_REINSTALL` — Weatherstrip Reinstallation
- 🛡️  REMOVE `TSK_XWIN_PROTECT_TEARDOWN` — Protection Teardown

### `MOD_CLEANUP_EXT_WINDOW_RP` · 4 scenarios · phase=cleanup · 2/8 protection

- 🔨 KEEP    `TSK_XWRP_FINAL_INSPECT` — Final Window Inspection
- 🔨 KEEP    `TSK_XWRP_TOUCHUP` — Touch-Up Defects
- 🔨 KEEP    `TSK_XWRP_GLASS_CLEANUP` — Glass Scraping / Cleanup
- 🛡️  REMOVE `TSK_XWRP_MASK_REMOVE` — Glass Masking Removal
- 🔨 KEEP    `TSK_XWRP_HARDWARE_REINSTALL` — Hardware Reinstallation
- 🔨 KEEP    `TSK_XWRP_WEATHERSTRIP_REINSTALL` — Weatherstrip Reinstallation
- 🛡️  REMOVE `TSK_XWRP_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_XWRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_WAINSCOT` · 4 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_COATING_SF` — Final Inspect Coating (SF)
- 🛡️  REMOVE `TSK_WNSC_REMOVE_WALL_MASK` — Remove Wainscot Wall Mask
- 🛡️  REMOVE `TSK_WNSC_REMOVE_FLOOR_PROTECT` — Remove Wainscot Floor Protection
- 🔨 KEEP    `TSK_WNSC_VACUUM` — Vacuum Wainscot Area

### `MOD_PROTECT_EXT_DOOR` · 4 scenarios · phase=setup · 4/7 protection

- 🛡️  REMOVE `TSK_XDOR_WALKWAY_PROTECT` — Walkway/Porch Drop Cloth
- 🔨 KEEP    `TSK_XDOR_HARDWARE_REMOVE` — Door Hardware Removal
- 🛡️  REMOVE `TSK_XDOR_WEATHERSTRIP_PROTECT` — Weatherstrip Protection
- 🛡️  REMOVE `TSK_XDOR_THRESHOLD_PROTECT` — Threshold/Sill Protection
- 🛡️  REMOVE `TSK_XDOR_GLASS_MASK` — Glass Lite Masking _applies_when_: `{"door_complexity":["panel","grand_entry"]}`
- 🔨 KEEP    `TSK_XDOR_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XDOR_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_PROTECT_EXT_FC_SIDING` · 4 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_FCSD_LANDSCAPE_PROTECT` — Landscape Protection Setup
- 🛡️  REMOVE `TSK_FCSD_HARDSCAPE_PROTECT` — Hardscape Protection Setup
- 🛡️  REMOVE `TSK_FCSD_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_FCSD_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_FCSD_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_FC_SIDING_RP` · 4 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_FCRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_FCRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_FCRP_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_FCRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_FCRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_FOUNDATION_RP` · 4 scenarios · phase=setup · 2/4 protection

- 🛡️  REMOVE `TSK_FNRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_FNRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🔨 KEEP    `TSK_FNRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_FNRP_EQUIPMENT_SETUP_BRUSH` — Brush/Roll Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_TRIM` · 4 scenarios · phase=setup · 8/11 protection

- 🛡️  REMOVE `TSK_XTRM_LANDSCAPE_PROTECT` — Landscape Protection Setup
- 🛡️  REMOVE `TSK_XTRM_HARDSCAPE_PROTECT` — Hardscape Protection Setup
- 🛡️  REMOVE `TSK_XTRM_GLASS_MASK_WINDOW` — Mask Window Glass (Painting Frame)
- 🛡️  REMOVE `TSK_XTRM_GLASS_MASK_DOOR` — Mask Door Glass (Painting Frame)
- 🛡️  REMOVE `TSK_XTRM_FULL_WINDOW_MASK` — Full Window Mask (Not Painting)
- 🛡️  REMOVE `TSK_XTRM_FULL_DOOR_MASK` — Full Door Mask (Not Painting)
- 🛡️  REMOVE `TSK_XTRM_FIXTURE_MASK` — Mask Light Fixtures
- 🛡️  REMOVE `TSK_XTRM_WALL_MASK` — Mask Adjacent Wall Surface (Spray) _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XTRM_EQUIPMENT_SETUP_BRUSH` — Brush Equipment & Access Setup _applies_when_: `{"application_method":["brush"]}`
- 🔨 KEEP    `TSK_XTRM_EQUIPMENT_SETUP_SPRAY` — Spray Equipment & Access Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XTRM_SCAFFOLD_SETUP` — Scaffold / Lift / Ladder Setup

### `MOD_PROTECT_EXT_WINDOW` · 4 scenarios · phase=setup · 5/8 protection

- 🛡️  REMOVE `TSK_XWIN_GLASS_MASK` — Glass Masking (Tape + Film)
- 🔨 KEEP    `TSK_XWIN_HARDWARE_REMOVE` — Window Hardware Removal
- 🛡️  REMOVE `TSK_XWIN_WEATHERSTRIP_PROTECT` — Weatherstrip Protection
- 🛡️  REMOVE `TSK_XWIN_SILL_PROTECT` — Exterior Sill Protection
- 🛡️  REMOVE `TSK_XWIN_CASING_PROTECT` — Adjacent Casing Edge Protection
- 🛡️  REMOVE `TSK_XWIN_WALL_MASK_SPRAY` — Adjacent Wall Masking (Spray) _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XWIN_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XWIN_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_PROTECT_EXT_WINDOW_RP` · 4 scenarios · phase=setup · 6/9 protection

- 🛡️  REMOVE `TSK_XWRP_GLASS_MASK` — Glass Masking
- 🔨 KEEP    `TSK_XWRP_HARDWARE_REMOVE` — Window Hardware Removal
- 🛡️  REMOVE `TSK_XWRP_WEATHERSTRIP_PROTECT` — Weatherstrip Protection
- 🛡️  REMOVE `TSK_XWRP_SILL_PROTECT` — Sill Protection
- 🛡️  REMOVE `TSK_XWRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_XWRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_XWRP_WALL_MASK_SPRAY` — Wall Masking (Spray) _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XWRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_XWRP_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush"]}`

### `MOD_CLEANUP_EXT_DECK` · 3 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_DECK_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_DECK_TOUCHUP` — Touch-Up
- 🔨 KEEP    `TSK_DECK_FURNITURE_RETURN` — Furniture Return
- 🛡️  REMOVE `TSK_DECK_PROTECT_TEARDOWN` — Protection Teardown

### `MOD_CLEANUP_EXT_MASONRY` · 3 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_MSRY_FINAL_INSPECT` — Final Walkthrough Inspection
- 🔨 KEEP    `TSK_MSRY_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_MSRY_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_MSRY_SITE_CLEANUP` — Site Debris Cleanup

### `MOD_CLEANUP_EXT_STUCCO` · 3 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_STCO_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_STCO_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_STCO_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_STCO_SITE_CLEANUP` — Site Cleanup

### `MOD_PROTECT_EXT_DECK` · 3 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_DECK_SIDING_PROTECT` — Adjacent Siding Protection
- 🛡️  REMOVE `TSK_DECK_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_DECK_HARDSCAPE_PROTECT` — Hardscape Protection
- 🔨 KEEP    `TSK_DECK_FURNITURE_STAGE` — Furniture Staging/Clearing
- 🛡️  REMOVE `TSK_DECK_FIXTURE_MASK` — Fixture Masking
- 🔨 KEEP    `TSK_DECK_EQUIPMENT_SETUP` — Equipment Setup

### `MOD_PROTECT_EXT_MASONRY` · 3 scenarios · phase=setup · 3/5 protection

- 🛡️  REMOVE `TSK_MSRY_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_MSRY_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_MSRY_FIXTURE_MASK` — Fixture and Utility Masking
- 🔨 KEEP    `TSK_MSRY_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_MSRY_EQUIPMENT_SETUP_ROLL` — Roll/Brush Equipment Setup _applies_when_: `{"application_method":["roll","brush"]}`

### `MOD_PROTECT_EXT_STUCCO` · 3 scenarios · phase=setup · 4/6 protection

- 🛡️  REMOVE `TSK_STCO_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_STCO_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_STCO_FIXTURE_MASK` — Fixture Masking (Stucco Tape)
- 🛡️  REMOVE `TSK_STCO_HVAC_COVER` — HVAC Unit Protection
- 🔨 KEEP    `TSK_STCO_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray_backroll"]}`
- 🔨 KEEP    `TSK_STCO_EQUIPMENT_SETUP_ROLL` — Roll/Brush Equipment Setup _applies_when_: `{"application_method":["roll","brush"]}`

### `MOD_CLEANUP_CBRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_CBRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_CBRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_CBRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_CBRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_CLRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_CLRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_CLRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_CLRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_CLRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_DCRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_DCRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_DCRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_DCRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_DCRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_DRRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_DRRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_DRRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_DRRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_DRRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_DWRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_DWRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_DWRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_DWRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_DWRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_EXT_ALUMINUM_SIDING_RP` · 2 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_ALRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_ALRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_ALRP_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_ALRP_SITE_CLEANUP` — Site Cleanup
- 🔨 KEEP    `TSK_ALRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_EXT_VINYL_SIDING_RP` · 2 scenarios · phase=cleanup · 1/5 protection

- 🔨 KEEP    `TSK_VNRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_VNRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_VNRP_PROTECT_TEARDOWN` — Protection Teardown
- 🔨 KEEP    `TSK_VNRP_SITE_CLEANUP` — Site Cleanup
- 🔨 KEEP    `TSK_VNRP_CUSTOMER_WALKTHROUGH` — Customer Walkthrough

### `MOD_CLEANUP_SPRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_SPRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_SPRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_SPRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_SPRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_STRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_STRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_STRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_STRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_STRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_TMRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_TMRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_TMRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_TMRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_TMRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_WNRP_RP` · 2 scenarios · phase=cleanup · 1/4 protection

- 🔨 KEEP    `TSK_WNRP_FINAL_INSPECT` — Final Inspection
- 🔨 KEEP    `TSK_WNRP_FINAL_TOUCHUP` — Final Touch-Up
- 🛡️  REMOVE `TSK_WNRP_PROTECT_TEARDOWN` — Protection Material Removal
- 🔨 KEEP    `TSK_WNRP_SITE_CLEANUP` — Site Cleanup

### `MOD_CLEANUP_WOOD_CEILING` · 2 scenarios · phase=cleanup · 3/5 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_COATING_SF` — Final Inspect Coating (SF)
- 🛡️  REMOVE `TSK_WDCL_REMOVE_WALL_MASK` — Remove Wood Ceiling Wall Mask
- 🛡️  REMOVE `TSK_WDCL_REMOVE_FIXTURE_MASK` — Remove Wood Ceiling Fixture Mask
- 🛡️  REMOVE `TSK_WDCL_REMOVE_FLOOR_PROTECT` — Remove Wood Ceiling Floor Protection
- 🔨 KEEP    `TSK_WDCL_VACUUM` — Vacuum Wood Ceiling Area

### `MOD_CLEANUP_WOOD_WALL` · 2 scenarios · phase=cleanup · 2/4 protection

- 🔨 KEEP    `TSK_FINAL_INSPECT_COATING_SF` — Final Inspect Coating (SF)
- 🛡️  REMOVE `TSK_WDWL_REMOVE_CEIL_MASK` — Remove Wood Wall Ceiling Mask
- 🛡️  REMOVE `TSK_WDWL_REMOVE_FLOOR_PROTECT` — Remove Wood Wall Floor Protection
- 🔨 KEEP    `TSK_WDWL_VACUUM` — Vacuum Wood Wall Area

### `MOD_PROTECT_EXT_ALUMINUM_SIDING_RP` · 2 scenarios · phase=setup · 6/8 protection

- 🛡️  REMOVE `TSK_ALRP_LANDSCAPE_PROTECT` — Landscape Protection (Extended for Chalk Runoff)
- 🛡️  REMOVE `TSK_ALRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_ALRP_WINDOW_MASK` — Window Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_ALRP_DOOR_MASK` — Door Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_ALRP_TRIM_MASK` — Trim Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_ALRP_FIXTURE_MASK` — Fixture Masking
- 🔨 KEEP    `TSK_ALRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_ALRP_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_EXT_VINYL_SIDING_RP` · 2 scenarios · phase=setup · 6/8 protection

- 🛡️  REMOVE `TSK_VNRP_LANDSCAPE_PROTECT` — Landscape Protection
- 🛡️  REMOVE `TSK_VNRP_HARDSCAPE_PROTECT` — Hardscape Protection
- 🛡️  REMOVE `TSK_VNRP_WINDOW_MASK` — Window Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_VNRP_DOOR_MASK` — Door Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_VNRP_TRIM_MASK` — Trim Masking _applies_when_: `{"application_method":["spray"]}`
- 🛡️  REMOVE `TSK_VNRP_FIXTURE_MASK` — Fixture Masking
- 🔨 KEEP    `TSK_VNRP_EQUIPMENT_SETUP_SPRAY` — Spray Equipment Setup _applies_when_: `{"application_method":["spray"]}`
- 🔨 KEEP    `TSK_VNRP_EQUIPMENT_SETUP_BRUSH` — Brush Equipment Setup _applies_when_: `{"application_method":["brush_roll"]}`

### `MOD_PROTECT_CABINET_HEAVY` · 1 scenarios · phase=setup · 4/7 protection

- 🔨 KEEP    `TSK_CABT_PROT_HVY_FACE_COVER` — Cover Cabinet Faces (Heavy)
- 🔨 KEEP    `TSK_CABT_PROT_HVY_HARDWARE` — Cover Cabinet Hardware
- 🛡️  REMOVE `TSK_CABT_PROT_HVY_COUNTERTOP` — Mask Countertop Edges
- 🛡️  REMOVE `TSK_CABT_PROT_HVY_FLOOR` — Lay Kitchen Floor Protection
- 🛡️  REMOVE `TSK_CABT_PROT_HVY_BACKSPLASH` — Mask Backsplash
- 🔨 KEEP    `TSK_CABT_PROT_HVY_APPLIANCES` — Cover Kitchen Appliances
- 🛡️  REMOVE `TSK_CABT_PROT_HVY_TEARDOWN` — Remove Heavy Cabinet Protection

### `MOD_PROTECT_CABINET_LIGHT` · 1 scenarios · phase=setup · 1/2 protection

- 🔨 KEEP    `TSK_CABT_PROT_FACE_COVER` — Cover Cabinet Faces (Light)
- 🛡️  REMOVE `TSK_CABT_PROT_LIGHT_TEARDOWN` — Remove Cabinet Face Covers

### `MOD_PROTECT_CABINET_STANDARD` · 1 scenarios · phase=setup · 2/4 protection

- 🔨 KEEP    `TSK_CABT_PROT_STD_FACE_COVER` — Cover Cabinet Faces (Standard)
- 🔨 KEEP    `TSK_CABT_PROT_STD_HARDWARE` — Cover Cabinet Hardware
- 🛡️  REMOVE `TSK_CABT_PROT_STD_COUNTERTOP` — Mask Countertop Edges
- 🛡️  REMOVE `TSK_CABT_PROT_STD_TEARDOWN` — Remove Standard Cabinet Protection

### `MOD_PROTECT_SETUP` · 1 scenarios · phase=setup · 36/39 protection

- 🛡️  REMOVE `TSK_PROTECT_FLOOR_EDGE_INSTALL` — Install Floor Edge Tape _applies_when_: `{"floor_mask_level":["edge","edge_partial","edge_full","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_SPOT_INSTALL` — Install Floor Spot Mask (per opening) _applies_when_: `{"floor_mask_level":["spot"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_PARTIAL_INSTALL` — Install Floor Partial Drop _applies_when_: `{"floor_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_FULL_INSTALL` — Install Floor Full Drape _applies_when_: `{"floor_mask_level":["full","edge_full"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_ENCAPSULATE_INSTALL` — Install Floor Encapsulation _applies_when_: `{"floor_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_EDGE_INSTALL` — Install Wall Edge Tape _applies_when_: `{"wall_mask_level":["edge","edge_partial","edge_full","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_PARTIAL_INSTALL` — Install Wall Partial Drape _applies_when_: `{"wall_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_FULL_INSTALL` — Install Wall Full Drape _applies_when_: `{"wall_mask_level":["full","edge_full"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_ENCAPSULATE_INSTALL` — Install Wall Encapsulation _applies_when_: `{"wall_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_EDGE_INSTALL` — Install Ceiling Edge Tape _applies_when_: `{"ceiling_mask_level":["edge","edge_partial","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_SPOT_INSTALL` — Install Ceiling Spot Mask (per opening) _applies_when_: `{"ceiling_mask_level":["spot"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_PARTIAL_INSTALL` — Install Ceiling Partial Cover _applies_when_: `{"ceiling_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_ENCAPSULATE_INSTALL` — Install Ceiling Encapsulation _applies_when_: `{"ceiling_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_MASK_DOOR_SLAB_INSTALL` — Door Slab Mask — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_GLASS_INSTALL` — Window Glass (Lites) Mask — Install
- 🛡️  REMOVE `TSK_MASK_DOOR_FRAME_INSTALL` — Door Frame Mask — Install
- 🛡️  REMOVE `TSK_MASK_DOOR_CASING_INSTALL` — Door Casing Mask — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_CASING_INSTALL` — Window Casing Mask — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_JAMB_INSTALL` — Window Jamb Mask — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_STOOL_INSTALL` — Window Stool Mask — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_APRON_INSTALL` — Window Apron Mask — Install
- 🛡️  REMOVE `TSK_MASK_BUILTIN_INSTALL` — Built-in Mask — Install
- 🛡️  REMOVE `TSK_MASK_COUNTERTOP_INSTALL` — Countertop Mask — Install
- 🛡️  REMOVE `TSK_MASK_FEATURE_WALL_INSTALL` — Feature Wall Mask — Install
- 🛡️  REMOVE `TSK_MASK_FIREPLACE_INSTALL` — Fireplace Mask — Install
- 🛡️  REMOVE `TSK_MASK_VANITY_INSTALL` — Vanity Mask — Install
- 🛡️  REMOVE `TSK_MASK_SHOWER_INSTALL` — Shower / Enclosure Mask — Install
- 🛡️  REMOVE `TSK_MASK_BATHTUB_INSTALL` — Bathtub Mask — Install
- 🛡️  REMOVE `TSK_MASK_TOILET_INSTALL` — Toilet Mask — Install
- 🛡️  REMOVE `TSK_MASK_APPLIANCES_INSTALL` — Appliances Mask — Install
- 🛡️  REMOVE `TSK_MASK_OUTLET_SWITCH_INSTALL` — Outlet/Switch Mask — Install _applies_when_: `{"any_spray_in_room":[true]}`
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_SMALL_INSTALL` — Window Full Wrap (Small) — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_STD_INSTALL` — Window Full Wrap (STD) — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_LG_INSTALL` — Window Full Wrap (LG) — Install
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_XL_INSTALL` — Window Full Wrap (XL) — Install
- 🛡️  REMOVE `TSK_MASK_HVAC_VENT_INSTALL` — HVAC Vent Mask — Install _applies_when_: `{"hvac_action":["mask"]}`
- 🔨 KEEP    `TSK_VANITY_SMALL_ENCAP_INSTALL` — Vanity Small-Encapsulate Install (5min/ea minimum)
- 🔨 KEEP    `TSK_CONTAINMENT_SETUP` — Containment Setup _applies_when_: `{"containment_mode":[true]}`
- 🔨 KEEP    `TSK_CONTAINMENT_DOOR_ZIPPER` — Containment Door Zipper _applies_when_: `{"containment_door_zipper":[true]}`

### `MOD_PROTECT_TEARDOWN` · 1 scenarios · phase=cleanup · 38/39 protection

- 🛡️  REMOVE `TSK_PROTECT_FLOOR_EDGE_REMOVE` — Remove Floor Edge Tape _applies_when_: `{"floor_mask_level":["edge"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_SPOT_REMOVE` — Remove Floor Spot Mask (per opening) _applies_when_: `{"floor_mask_level":["spot"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_PARTIAL_REMOVE` — Remove Floor Partial Drop _applies_when_: `{"floor_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_FULL_REMOVE` — Remove Floor Full Drape _applies_when_: `{"floor_mask_level":["full","edge_full"]}`
- 🛡️  REMOVE `TSK_PROTECT_FLOOR_ENCAPSULATE_REMOVE` — Remove Floor Encapsulation _applies_when_: `{"floor_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_EDGE_REMOVE` — Remove Wall Edge Tape _applies_when_: `{"wall_mask_level":["edge"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_PARTIAL_REMOVE` — Remove Wall Partial Drape _applies_when_: `{"wall_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_FULL_REMOVE` — Remove Wall Full Drape _applies_when_: `{"wall_mask_level":["full","edge_full"]}`
- 🛡️  REMOVE `TSK_PROTECT_WALL_ENCAPSULATE_REMOVE` — Remove Wall Encapsulation _applies_when_: `{"wall_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_EDGE_REMOVE` — Remove Ceiling Edge Tape _applies_when_: `{"ceiling_mask_level":["edge"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_SPOT_REMOVE` — Remove Ceiling Spot Mask (per opening) _applies_when_: `{"ceiling_mask_level":["spot"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_PARTIAL_REMOVE` — Remove Ceiling Partial Cover _applies_when_: `{"ceiling_mask_level":["partial","edge_partial"]}`
- 🛡️  REMOVE `TSK_PROTECT_CEILING_ENCAPSULATE_REMOVE` — Remove Ceiling Encapsulation _applies_when_: `{"ceiling_mask_level":["encapsulate","edge_encapsulate"]}`
- 🛡️  REMOVE `TSK_MASK_DOOR_SLAB_REMOVE` — Door Slab Mask — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_GLASS_REMOVE` — Window Glass (Lites) Mask — Remove
- 🛡️  REMOVE `TSK_MASK_DOOR_FRAME_REMOVE` — Door Frame Mask — Remove
- 🛡️  REMOVE `TSK_MASK_DOOR_CASING_REMOVE` — Door Casing Mask — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_CASING_REMOVE` — Window Casing Mask — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_JAMB_REMOVE` — Window Jamb Mask — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_STOOL_REMOVE` — Window Stool Mask — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_APRON_REMOVE` — Window Apron Mask — Remove
- 🛡️  REMOVE `TSK_MASK_BUILTIN_REMOVE` — Built-in Mask — Remove
- 🛡️  REMOVE `TSK_MASK_COUNTERTOP_REMOVE` — Countertop Mask — Remove
- 🛡️  REMOVE `TSK_MASK_FEATURE_WALL_REMOVE` — Feature Wall Mask — Remove
- 🛡️  REMOVE `TSK_MASK_FIREPLACE_REMOVE` — Fireplace Mask — Remove
- 🛡️  REMOVE `TSK_MASK_VANITY_REMOVE` — Vanity Mask — Remove
- 🛡️  REMOVE `TSK_MASK_SHOWER_REMOVE` — Shower / Enclosure Mask — Remove
- 🛡️  REMOVE `TSK_MASK_BATHTUB_REMOVE` — Bathtub Mask — Remove
- 🛡️  REMOVE `TSK_MASK_TOILET_REMOVE` — Toilet Mask — Remove
- 🛡️  REMOVE `TSK_MASK_APPLIANCES_REMOVE` — Appliances Mask — Remove
- 🛡️  REMOVE `TSK_MASK_OUTLET_SWITCH_REMOVE` — Outlet/Switch Mask — Remove _applies_when_: `{"any_spray_in_room":[true]}`
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_SMALL_REMOVE` — Window Full Wrap (Small) — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_STD_REMOVE` — Window Full Wrap (STD) — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_LG_REMOVE` — Window Full Wrap (LG) — Remove
- 🛡️  REMOVE `TSK_MASK_WINDOW_FULL_XL_REMOVE` — Window Full Wrap (XL) — Remove
- 🛡️  REMOVE `TSK_MASK_HVAC_VENT_REMOVE` — HVAC Vent Mask — Remove _applies_when_: `{"hvac_action":["mask"]}`
- 🔨 KEEP    `TSK_VANITY_SMALL_ENCAP_REMOVE` — Vanity Small-Encapsulate Remove
- 🛡️  REMOVE `TSK_CONTAINMENT_TEARDOWN` — Containment Teardown _applies_when_: `{"containment_mode":[true]}`
- 🛡️  REMOVE `TSK_PROTECT_DEBRIS_CLEANUP` — Protection Debris Cleanup
