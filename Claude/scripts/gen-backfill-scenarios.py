"""
Phase 1c.5 — Scenario backfill sweep.

Generates additional scenarios that fill gaps in the QT × method × state
coverage for substrates that have only representative scenarios after
Phase 1b. The patterns are locked from earlier substrates so this is
mechanical authoring via codegen.

After this script runs:
  - Ceilings: + QT2 prime/finish variants, QT4 prime, QT5 finish
  - Trim:     + QT4/QT5 paint variants
  - Doors:    + QT4 brush, QT5 spray, factory brush variants
  - Windows:  + QT4/QT5 brush variants
  - Specialty: + second method variant per substrate

Run: python Claude/scripts/gen-backfill-scenarios.py
"""

import json
import os

OUT = "Claude/scenarios"


def write(d):
    p = os.path.join(OUT, d["scenario_id"] + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2)
        f.write("\n")


count = [0]


def emit(scn):
    write(scn)
    count[0] += 1


# ============================================================================
# CEILING BACKFILL — fill QT2/4/5 gaps in prime + finish
# ============================================================================
def ceiling_prime(qt, method, modules):
    return {
        "scenario_id": f"SCN_CEILING_PRIME_{qt}_{method.upper().replace('_','_')}",
        "name": f"Drywall Ceiling Prime - {qt}, {method}",
        "domain": "interior", "context": "NC",
        "matches": {
            "substrate": "drywall", "surface": "ceiling",
            "substrate_state": ["SS_BARE"],
            "quality_tier": qt, "application_method": method,
        },
        "modules": modules,
        "coat_counts": {"finish_coats": 1, "interstage_cycles": 0},
        "protection_zones": (
            [{"zone_id": "floor_full", "level": "full_cover"},
             {"zone_id": "wall_edge",  "level": "edge_only"}]
            if "spray" in method else []
        ),
        "material_systems": ["SYS_PRIMER_PVA_STUB"],
        "output_state": "SS_PRIMED_FIELD",
    }


def ceiling_finish(qt, method, modules, finish_coats=2, interstage_cycles=0):
    return {
        "scenario_id": f"SCN_CEILING_FINISH_{qt}_{method.upper().replace('_','_')}",
        "name": f"Drywall Ceiling Finish - {qt}, {method}",
        "domain": "interior", "context": "NC",
        "matches": {
            "substrate": "drywall", "surface": "ceiling",
            "substrate_state": ["SS_PRIMED", "SS_PRIMED_FIELD"],
            "quality_tier": qt, "application_method": method,
        },
        "modules": modules,
        "coat_counts": {"finish_coats": finish_coats, "interstage_cycles": interstage_cycles},
        "protection_zones": (
            [{"zone_id": "ceiling_fixtures", "level": "full_cover"},
             {"zone_id": "window_openings",  "level": "edge_only"}]
            if "spray" in method else []
        ),
        "material_systems": ["SYS_CEIL_FINISH_FLAT_STUB"],
        "output_state": "SS_PAINTED_FLAT",
    }


# QT2 prime — single coat, no interstage
emit(ceiling_prime("QT2", "roll", [
    "MOD_PREP_CEILING_PRIME", "MOD_APPLY_CEIL_PRIME_ROLL", "MOD_CLEANUP_CEILING_PRIME",
]))
emit(ceiling_prime("QT2", "spray_backroll", [
    "MOD_PREP_CEILING_PRIME", "MOD_SETUP_FLOOR_PROTECT_CEILING", "MOD_SETUP_CEIL_MASK_ADJACENT",
    "MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL", "MOD_CLEANUP_CEILING_PRIME",
]))
emit(ceiling_prime("QT2", "spray", [
    "MOD_PREP_CEILING_PRIME", "MOD_SETUP_FLOOR_PROTECT_CEILING", "MOD_SETUP_CEIL_MASK_ADJACENT",
    "MOD_APPLY_CEIL_PRIME_SPRAY_ONLY", "MOD_CLEANUP_CEILING_PRIME",
]))
# QT4 prime — same module list as QT3, QT modifier handles the slowdown
emit(ceiling_prime("QT4", "roll", [
    "MOD_PREP_CEILING_PRIME", "MOD_APPLY_CEIL_PRIME_ROLL", "MOD_CLEANUP_CEILING_PRIME",
]))
emit(ceiling_prime("QT4", "spray_backroll", [
    "MOD_PREP_CEILING_PRIME", "MOD_SETUP_FLOOR_PROTECT_CEILING", "MOD_SETUP_CEIL_MASK_ADJACENT",
    "MOD_APPLY_CEIL_PRIME_SPRAY_BACKROLL", "MOD_CLEANUP_CEILING_PRIME",
]))

# QT2 finish — single coat
emit(ceiling_finish("QT2", "roll", [
    "MOD_APPLY_CEILING_FINISH_ROLL", "MOD_CLEANUP_CEILING_FINISH",
], finish_coats=1, interstage_cycles=0))
emit(ceiling_finish("QT2", "spray", [
    "MOD_PROTECT_CEILING_FINISH",
    "MOD_APPLY_CEILING_FINISH_SPRAY_ONLY", "MOD_CLEANUP_CEILING_FINISH",
], finish_coats=1, interstage_cycles=0))

# QT4 finish — roll variant (we already have spray_backroll)
emit(ceiling_finish("QT4", "roll", [
    "MOD_PREP_INSPECT_REPAIR_CEILING", "MOD_PREP_LIGHT_SAND_CEILING_FULL",
    "MOD_APPLY_CEILING_FINISH_ROLL", "MOD_INTERSTAGE_SAND_CEILING",
    "MOD_APPLY_CEILING_FINISH_ROLL", "MOD_CLEANUP_CEILING_FINISH",
], finish_coats=2, interstage_cycles=1))

# QT5 finish — both variants
emit(ceiling_finish("QT5", "roll", [
    "MOD_PREP_INSPECT_REPAIR_CEILING", "MOD_PREP_LIGHT_SAND_CEILING_FULL",
    "MOD_APPLY_CEILING_FINISH_ROLL", "MOD_INTERSTAGE_SAND_CEILING",
    "MOD_APPLY_CEILING_FINISH_ROLL", "MOD_CLEANUP_CEILING_FINISH",
], finish_coats=2, interstage_cycles=1))
emit(ceiling_finish("QT5", "spray_backroll", [
    "MOD_PROTECT_CEILING_FINISH",
    "MOD_PREP_INSPECT_REPAIR_CEILING", "MOD_PREP_LIGHT_SAND_CEILING_FULL",
    "MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL", "MOD_INTERSTAGE_SAND_CEILING",
    "MOD_APPLY_CEILING_FINISH_SPRAY_BACKROLL", "MOD_CLEANUP_CEILING_FINISH",
], finish_coats=2, interstage_cycles=1))


# ============================================================================
# TRIM PAINT BACKFILL — QT4 brush, QT5 brush + spray
# ============================================================================
def trim_paint(qt, method):
    setup = ["MOD_SETUP_TRIM_PAINT_PROTECT"]
    apply_mod = "MOD_APPLY_TRIM_FINISH_BRUSH" if method == "brush" else "MOD_APPLY_TRIM_FINISH_SPRAY"
    return {
        "scenario_id": f"SCN_TRIM_PAINT_{qt}_{method.upper()}",
        "name": f"Trim Paint - {qt}, {method}",
        "domain": "interior", "context": "NC",
        "matches": {
            "substrate": "trim",
            "substrate_state": ["SS_PRIMED_FIELD", "SS_PRIMED_FACTORY"],
            "quality_tier": qt, "application_method": method,
        },
        "modules": setup + [
            "MOD_PREP_TRIM_PAINT", apply_mod, "MOD_INTERSTAGE_TRIM",
            apply_mod, "MOD_CLEANUP_TRIM_PAINT",
        ],
        "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
        "protection_zones": [{"zone_id": "floor_perimeter", "level": "edge_only"}],
        "material_systems": ["SYS_TRIM_FINISH_SEMIGLOSS_STUB"],
        "output_state": "SS_PAINTED_SEMIGLOSS",
    }


emit(trim_paint("QT4", "brush"))
emit(trim_paint("QT5", "brush"))
emit(trim_paint("QT5", "spray"))


# ============================================================================
# DOOR BACKFILL — QT4 brush, QT5 spray, factory brush
# ============================================================================
def door_scenario(qt, method, state, condition, door_type):
    label = state.replace("SS_", "")
    return {
        "scenario_id": f"SCN_DOOR_SLAB_NC_{qt}_{method.upper()}_FROM_{label}",
        "name": f"Door Slab NC - {qt}, {method}, {label}",
        "domain": "interior", "context": "NC",
        "matches": {
            "substrate": "door_slab",
            "substrate_state": [state],
            "substrate_condition": [condition],
            "quality_tier": qt, "application_method": method,
            "door_type": door_type,
        },
        "modules": [
            "MOD_SETUP_DOOR", "MOD_PREP_DOOR", "MOD_DOOR_PRIME",
            "MOD_APPLY_DOOR_FINISH", "MOD_INTERSTAGE_DOOR",
            "MOD_APPLY_DOOR_FINISH", "MOD_CLEANUP_DOOR",
        ],
        "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
        "protection_zones": [
            {"zone_id": "door_floor", "level": "edge_only"},
            *([{"zone_id": "spray_surround", "level": "full_cover"}] if method == "spray" else []),
        ],
        "material_systems": ["SYS_DOOR_PRIMER_OIL_STUB", "SYS_DOOR_FINISH_SEMIGLOSS_STUB"],
        "output_state": "SS_PAINTED_SEMIGLOSS",
    }


emit(door_scenario("QT4", "brush", "SS_BARE", "bare_wood", "panel_4"))
emit(door_scenario("QT5", "spray", "SS_BARE", "bare_wood", "panel_4"))
emit(door_scenario("QT3", "brush", "SS_PRIMED_FACTORY", "factory_primed", "panel_4"))
emit(door_scenario("QT4", "brush", "SS_PRIMED_FACTORY", "factory_primed", "panel_4"))


# ============================================================================
# WINDOW BACKFILL — QT4 brush, QT5 brush
# ============================================================================
def window_scenario(qt, method, state):
    label = state.replace("SS_", "")
    return {
        "scenario_id": f"SCN_WINDOW_INT_NC_{qt}_{method.upper()}_FROM_{label}_WOOD",
        "name": f"Window NC - {qt}, {method}, {label} wood",
        "domain": "interior", "context": "NC",
        "matches": {
            "substrate": "window",
            "substrate_state": [state],
            "quality_tier": qt, "application_method": method,
            "window_substrate_material": "wood",
        },
        "modules": [
            "MOD_SETUP_WINDOW", "MOD_PREP_WINDOW", "MOD_WINDOW_PRIME",
            "MOD_APPLY_WINDOW_FINISH", "MOD_INTERSTAGE_WINDOW",
            "MOD_APPLY_WINDOW_FINISH", "MOD_CLEANUP_WINDOW",
        ],
        "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
        "protection_zones": [
            {"zone_id": "window_floor", "level": "edge_only"},
            {"zone_id": "glass_panes",  "level": "full_cover"},
            {"zone_id": "hardware",     "level": "full_cover"},
            {"zone_id": "wall_adjacent","level": "edge_only"},
            *([{"zone_id": "sill", "level": "edge_only"}] if method == "spray" else []),
        ],
        "material_systems": ["SYS_WIN_PRIMER_OIL_STUB", "SYS_WIN_FINISH_SEMIGLOSS_STUB"],
        "output_state": "SS_PAINTED_SEMIGLOSS",
    }


emit(window_scenario("QT4", "brush", "SS_BARE"))
emit(window_scenario("QT5", "brush", "SS_BARE"))
emit(window_scenario("QT5", "spray", "SS_BARE"))


# ============================================================================
# SPECIALTY BACKFILL — second method variant per substrate
# ============================================================================

# Wainscot QT3 spray
emit({
    "scenario_id": "SCN_WAINSCOT_NC_QT3_SPRAY_FROM_BARE",
    "name": "Wainscot NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wainscot",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_WAINSCOT", "MOD_PREP_WAINSCOT", "MOD_APPLY_WAINSCOT_PRIME",
        "MOD_APPLY_WAINSCOT_FINISH", "MOD_INTERSTAGE_WAINSCOT", "MOD_APPLY_WAINSCOT_FINISH",
        "MOD_CLEANUP_WAINSCOT",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "wall_above", "level": "edge_only"},
    ],
    "material_systems": ["SYS_WAINSCOT_PRIMER_STUB", "SYS_WAINSCOT_FINISH_STUB"],
    "output_state": "SS_PAINTED_SATIN",
})

# Wood wall QT3 brush
emit({
    "scenario_id": "SCN_WOOD_WALL_NC_QT3_BRUSH_FROM_BARE",
    "name": "Wood Wall NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wood_wall",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "brush",
    },
    "modules": [
        "MOD_SETUP_WOOD_WALL", "MOD_PREP_WOOD_WALL", "MOD_APPLY_WOOD_WALL_PRIME",
        "MOD_APPLY_WOOD_WALL_FINISH", "MOD_INTERSTAGE_WOOD_WALL", "MOD_APPLY_WOOD_WALL_FINISH",
        "MOD_CLEANUP_WOOD_WALL",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "ceiling_line", "level": "edge_only"},
    ],
    "material_systems": ["SYS_WOOD_WALL_PRIMER_STUB", "SYS_WOOD_WALL_FINISH_STUB"],
    "output_state": "SS_PAINTED_SATIN",
})

# Wood ceiling QT3 brush
emit({
    "scenario_id": "SCN_WOOD_CEILING_NC_QT3_BRUSH_FROM_BARE",
    "name": "Wood Ceiling NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wood_ceiling",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "brush",
    },
    "modules": [
        "MOD_SETUP_WOOD_CEILING", "MOD_PREP_WOOD_CEILING", "MOD_APPLY_WOOD_CEILING_PRIME",
        "MOD_APPLY_WOOD_CEILING_FINISH", "MOD_INTERSTAGE_WOOD_CEILING", "MOD_APPLY_WOOD_CEILING_FINISH",
        "MOD_CLEANUP_WOOD_CEILING",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_full", "level": "full_cover"},
        {"zone_id": "wall_below", "level": "full_cover"},
        {"zone_id": "ceiling_fixtures", "level": "full_cover"},
    ],
    "material_systems": ["SYS_WOOD_CEILING_PRIMER_STUB", "SYS_WOOD_CEILING_FINISH_STUB"],
    "output_state": "SS_PAINTED_SATIN",
})

# Stair riser QT3 spray
emit({
    "scenario_id": "SCN_STAIR_RISER_NC_QT3_SPRAY_FROM_BARE",
    "name": "Stair Riser NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "stair_riser",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_STAIR_RISER", "MOD_PREP_STAIR_RISER", "MOD_APPLY_STAIR_RISER_PRIME",
        "MOD_APPLY_STAIR_RISER_FINISH", "MOD_APPLY_STAIR_RISER_FINISH", "MOD_CLEANUP_STAIR_RISER",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 0},
    "protection_zones": [
        {"zone_id": "treads", "level": "full_cover"},
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "stair_wall", "level": "edge_only"},
    ],
    "material_systems": ["SYS_STAIR_PRIMER_STUB", "SYS_STAIR_FINISH_STUB"],
    "output_state": "SS_PAINTED_SEMIGLOSS",
})

# Stair railing QT3 spray, all wood
emit({
    "scenario_id": "SCN_STAIR_RAILING_NC_QT3_SPRAY_ALL_WOOD_FROM_BARE",
    "name": "Stair Railing All-Wood NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "stair_railing",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
        "railing_type": "all_wood",
    },
    "modules": [
        "MOD_SETUP_STAIR_RAILING", "MOD_PREP_STAIR_RAILING", "MOD_APPLY_STAIR_RAILING_PRIME",
        "MOD_APPLY_STAIR_RAILING_FINISH", "MOD_APPLY_STAIR_RAILING_FINISH", "MOD_CLEANUP_STAIR_RAILING",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 0},
    "protection_zones": [
        {"zone_id": "treads", "level": "full_cover"},
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "wall_adjacent", "level": "edge_only"},
    ],
    "material_systems": ["SYS_RAILING_PRIMER_STUB", "SYS_RAILING_FINISH_STUB"],
    "output_state": "SS_PAINTED_SEMIGLOSS",
})

# Arch element QT3 spray
emit({
    "scenario_id": "SCN_ARCH_ELEMENT_NC_QT3_SPRAY_FROM_BARE",
    "name": "Arch Element NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "arch_element",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_ARCH_ELEMENT", "MOD_PREP_ARCH_ELEMENT", "MOD_APPLY_ARCH_ELEMENT_PRIME",
        "MOD_APPLY_ARCH_ELEMENT_FINISH", "MOD_APPLY_ARCH_ELEMENT_FINISH", "MOD_CLEANUP_ARCH_ELEMENT",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 0},
    "protection_zones": [
        {"zone_id": "floor_workzone", "level": "full_cover"},
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "wall_adjacent", "level": "edge_only"},
        {"zone_id": "fixtures", "level": "full_cover"},
    ],
    "material_systems": ["SYS_ARCH_PRIMER_STUB", "SYS_ARCH_FINISH_STUB"],
    "output_state": "SS_PAINTED_SATIN",
})

# Builtin QT3 spray
emit({
    "scenario_id": "SCN_BUILTIN_NC_QT3_SPRAY_FROM_BARE",
    "name": "Builtin NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "builtin",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_BUILTIN", "MOD_PREP_BUILTIN", "MOD_APPLY_BUILTIN_PRIME",
        "MOD_APPLY_BUILTIN_FINISH", "MOD_INTERSTAGE_BUILTIN", "MOD_APPLY_BUILTIN_FINISH",
        "MOD_CLEANUP_BUILTIN",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_perimeter", "level": "edge_only"},
        {"zone_id": "wall_adjacent", "level": "edge_only"},
        {"zone_id": "fixtures", "level": "full_cover"},
    ],
    "material_systems": ["SYS_BUILTIN_PRIMER_STUB", "SYS_BUILTIN_FINISH_STUB"],
    "output_state": "SS_PAINTED_SATIN",
})

# Cabinet QT3 spray
emit({
    "scenario_id": "SCN_CABINET_NC_QT3_SPRAY_FROM_BARE",
    "name": "Cabinet NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "cabinet",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_CABINET", "MOD_PREP_CABINET", "MOD_APPLY_CABINET_PRIME",
        "MOD_APPLY_CABINET_FINISH", "MOD_INTERSTAGE_CABINET", "MOD_APPLY_CABINET_FINISH",
        "MOD_CLEANUP_CABINET",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_full_kitchen", "level": "full_cover"},
        {"zone_id": "countertop", "level": "full_cover"},
        {"zone_id": "backsplash", "level": "full_cover"},
    ],
    "material_systems": ["SYS_CABINET_BONDING_PRIMER_STUB", "SYS_CABINET_FINISH_SEMIGLOSS_STUB"],
    "output_state": "SS_PAINTED_SEMIGLOSS",
})

# Cabinet QT5 spray (premium tier)
emit({
    "scenario_id": "SCN_CABINET_NC_QT5_SPRAY_FROM_BARE",
    "name": "Cabinet NC - QT5 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "cabinet",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT5", "application_method": "spray",
    },
    "modules": [
        "MOD_SETUP_CABINET", "MOD_PREP_CABINET", "MOD_APPLY_CABINET_PRIME",
        "MOD_APPLY_CABINET_FINISH", "MOD_INTERSTAGE_CABINET", "MOD_APPLY_CABINET_FINISH",
        "MOD_CLEANUP_CABINET",
    ],
    "coat_counts": {"finish_coats": 2, "interstage_cycles": 1},
    "protection_zones": [
        {"zone_id": "floor_full_kitchen", "level": "full_cover"},
        {"zone_id": "countertop", "level": "full_cover"},
        {"zone_id": "backsplash", "level": "full_cover"},
    ],
    "material_systems": ["SYS_CABINET_BONDING_PRIMER_STUB", "SYS_CABINET_FINISH_SEMIGLOSS_STUB"],
    "output_state": "SS_PAINTED_SEMIGLOSS",
})

print(f"Generated {count[0]} new scenarios")
