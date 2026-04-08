"""
Phase 1b specialty surface generator.

Authors modules + scenarios for 8 specialty interior substrates in one pass:
  wainscot, wood wall, wood ceiling, stair riser, stair railing, arch element,
  builtin, cabinet. Patterns are locked from earlier substrates; this script
  emits the parallel files for the long tail.

All rates derived from the corresponding source production.json files.
Per-tier rates use rates_by_tier; per-coat rates use rates_by_coat;
substrate-condition gates use applies_when.

Run: python Claude/scripts/gen-specialty-modules.py
"""

import json
import os

OUT_MOD = "Claude/modules"
OUT_SCN = "Claude/scenarios"


def write_mod(d):
    p = os.path.join(OUT_MOD, d["module_id"] + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2)
        f.write("\n")


def write_scn(d):
    p = os.path.join(OUT_SCN, d["scenario_id"] + ".json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2)
        f.write("\n")


def task(tid, name, ps, uom, rate=None, rates_by_tier=None, rates_by_coat=None,
         fixed_minutes=None, applies_when=None, skill="general"):
    t = {"task_id": tid, "name": name, "uom": uom, "skill_level": skill}
    if ps:
        t["ps_key"] = ps
    if rate is not None:
        t["rate_per_hour"] = rate
    if rates_by_tier:
        t["rates_by_tier"] = rates_by_tier
    if rates_by_coat:
        t["rates_by_coat"] = rates_by_coat
    if fixed_minutes is not None:
        t["fixed_minutes"] = fixed_minutes
    if applies_when:
        t["applies_when"] = applies_when
    return t


ME_FULL = {"qt": True, "height": True, "texture": False, "complexity": True}
ME_FLAT = {"qt": False, "height": False, "texture": False, "complexity": False}

generated_modules = []
generated_scenarios = []


def emit_module(d):
    write_mod(d)
    generated_modules.append(d["module_id"])


def emit_scenario(d):
    write_scn(d)
    generated_scenarios.append(d["scenario_id"])


# ============================================================================
# 1. WAINSCOT
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_WAINSCOT",
    "name": "Set Up Wainscot Work Area",
    "phase": "setup",
    "intent": "Floor protection along wall base, mask the wall above the wainscot top rail.",
    "tasks": [
        task("TSK_WNSC_FLOOR_PROTECT", "Wainscot Floor Protection", "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_WNSC_WALL_MASK", "Mask Wall Above Wainscot", "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=120),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Wainscot wall masking goes ABOVE the top rail because the upper wall is finished separately.",
})

emit_module({
    "module_id": "MOD_PREP_WAINSCOT",
    "name": "Wainscot Prep",
    "phase": "prep",
    "intent": "Sand prep, fill fasteners, sand fill, caulk panel joints, caulk perimeter, seal MDF edges (if MDF).",
    "tasks": [
        task("TSK_WNSC_SAND_PREP", "Sand Wainscot", "PS_SURFACE_SF.WAINSCOT", "SF", rate=150),
        task("TSK_WNSC_FILL_FASTENERS", "Fill Fasteners", "PS_SURFACE_SF.WAINSCOT", "SF",
             rates_by_tier={"QT3": 120, "QT4": 100, "QT5": 80}, skill="experienced"),
        task("TSK_WNSC_SAND_FILL", "Sand Wainscot Fill", "PS_SURFACE_SF.WAINSCOT", "SF",
             rates_by_tier={"QT3": 150, "QT4": 120, "QT5": 80}),
        task("TSK_WNSC_CAULK_JOINTS", "Caulk Wainscot Joints", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=50, skill="experienced"),
        task("TSK_WNSC_CAULK_WALL", "Caulk Wainscot Perimeter", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=120, skill="experienced"),
        task("TSK_WNSC_SEAL_MDF", "Seal Wainscot MDF Edges", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=60, applies_when={"substrate_condition": ["mdf"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "MDF edge sealing only fires for MDF substrate. Caulking joints (50 SF/hr) is the slowest prep step.",
})

emit_module({
    "module_id": "MOD_APPLY_WAINSCOT_PRIME",
    "name": "Prime Wainscot",
    "phase": "prime",
    "intent": "Brush prime if bare; skip if factory primed.",
    "tasks": [
        task("TSK_WNSC_PRIME_FACES", "Prime Wainscot Faces", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=120, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_WNSC_SAND_PRIMER", "Sand Cured Wainscot Primer", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=150, applies_when={"substrate_state": ["SS_BARE"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Single primer pass at 120 SF/hr. Skipped entirely for factory primed.",
})

emit_module({
    "module_id": "MOD_APPLY_WAINSCOT_FINISH",
    "name": "Apply Wainscot Finish",
    "phase": "finish",
    "intent": "One coat per invocation. Spray or brush gated by method.",
    "tasks": [
        task("TSK_WNSC_SPRAY_FINISH", "Spray Wainscot Finish", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=175, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_WNSC_BRUSH_FINISH", "Brush Wainscot Finish", "PS_SURFACE_SF.WAINSCOT", "SF",
             rate=70, applies_when={"application_method": ["brush"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Spray (175) is 2.5x faster than brush (70).",
})

emit_module({
    "module_id": "MOD_INTERSTAGE_WAINSCOT",
    "name": "Wainscot Interstage",
    "phase": "interstage",
    "intent": "Inspect, sand between, tack clean.",
    "tasks": [
        task("TSK_WNSC_INSPECT_COAT", "Inspect Wainscot Coat", "PS_SURFACE_SF.WAINSCOT", "SF",
             rates_by_tier={"QT3": 400, "QT4": 200, "QT5": 100}, skill="experienced"),
        task("TSK_WNSC_SAND_BETWEEN", "Sand Wainscot Between Coats", "PS_SURFACE_SF.WAINSCOT", "SF",
             rates_by_tier={"QT3": 200, "QT4": 120, "QT5": 80}),
        task("TSK_WNSC_TACK_CLEAN", "Tack Clean Wainscot", "PS_SURFACE_SF.WAINSCOT", "SF", rate=200),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Always fires for satin/semi-gloss finish that reveals defects.",
})

emit_module({
    "module_id": "MOD_CLEANUP_WAINSCOT",
    "name": "Cleanup After Wainscot",
    "phase": "cleanup",
    "intent": "Final inspect, remove masks, vacuum, clean tools.",
    "tasks": [
        task("TSK_WNSC_FINAL_INSPECT", "Final Inspect Wainscot", "PS_SURFACE_SF.WAINSCOT", "SF",
             rates_by_tier={"QT3": 500, "QT4": 250, "QT5": 120}, skill="experienced"),
        task("TSK_WNSC_REMOVE_WALL_MASK", "Remove Wainscot Wall Mask", "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=200),
        task("TSK_WNSC_REMOVE_FLOOR_PROTECT", "Remove Wainscot Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_WNSC_VACUUM", "Vacuum Wainscot Area", "PS_META.SF.FLOOR_VACUUM_AREA", "SF", rate=300),
        task("TSK_WNSC_TOOL_CLEANUP", "Clean Wainscot Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Standard cleanup pattern.",
})

emit_scenario({
    "scenario_id": "SCN_WAINSCOT_NC_QT3_BRUSH_FROM_BARE",
    "name": "Wainscot NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wainscot",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "brush",
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


# ============================================================================
# 2. WOOD WALL (mirrors wainscot, different PS keys)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_WOOD_WALL",
    "name": "Set Up Wood Wall Work Area",
    "phase": "setup",
    "intent": "Floor protection at wall base, mask ceiling line.",
    "tasks": [
        task("TSK_WDWL_FLOOR_PROTECT", "Wood Wall Floor Protection", "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_WDWL_CEILING_MASK", "Mask Ceiling Above Wood Wall", "PS_PROTECT_LF.CEILING_ADJACENT", "LF", rate=120),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Wood wall covers full wall height; mask the ceiling line above.",
})

emit_module({
    "module_id": "MOD_PREP_WOOD_WALL",
    "name": "Wood Wall Prep",
    "phase": "prep",
    "intent": "Sand, fill, caulk, seal MDF edges.",
    "tasks": [
        task("TSK_WDWL_SAND_PREP", "Sand Wood Wall", "PS_SURFACE_SF.WOOD_WALL", "SF", rate=150),
        task("TSK_WDWL_FILL", "Fill Wood Wall Fasteners", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rates_by_tier={"QT3": 120, "QT4": 100, "QT5": 80}, skill="experienced"),
        task("TSK_WDWL_SAND_FILL", "Sand Wood Wall Fill", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rates_by_tier={"QT3": 150, "QT4": 120, "QT5": 80}),
        task("TSK_WDWL_CAULK_JOINTS", "Caulk Wood Wall Joints", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=48, skill="experienced"),
        task("TSK_WDWL_CAULK_PERIMETER", "Caulk Wood Wall Perimeter", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=120, skill="experienced"),
        task("TSK_WDWL_SEAL_MDF", "Seal Wood Wall MDF Edges", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=60, applies_when={"substrate_condition": ["mdf"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Joint caulking is the slowest step; pattern matches wainscot but with wood-wall PS keys.",
})

emit_module({
    "module_id": "MOD_APPLY_WOOD_WALL_PRIME",
    "name": "Prime Wood Wall",
    "phase": "prime",
    "intent": "Prime if bare; skip if factory primed.",
    "tasks": [
        task("TSK_WDWL_PRIME", "Prime Wood Wall Faces", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=120, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_WDWL_SAND_PRIMER", "Sand Cured Wood Wall Primer", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=150, applies_when={"substrate_state": ["SS_BARE"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Same prime pattern as wainscot.",
})

emit_module({
    "module_id": "MOD_APPLY_WOOD_WALL_FINISH",
    "name": "Apply Wood Wall Finish",
    "phase": "finish",
    "intent": "One coat per invocation. Spray or brush.",
    "tasks": [
        task("TSK_WDWL_SPRAY_FINISH", "Spray Wood Wall Finish", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=175, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_WDWL_BRUSH_FINISH", "Brush Wood Wall Finish", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rate=70, applies_when={"application_method": ["brush"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Spray rate 2.5x brush rate; identical to wainscot.",
})

emit_module({
    "module_id": "MOD_INTERSTAGE_WOOD_WALL",
    "name": "Wood Wall Interstage",
    "phase": "interstage",
    "intent": "Inspect, sand between, tack clean.",
    "tasks": [
        task("TSK_WDWL_INSPECT_COAT", "Inspect Wood Wall Coat", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rates_by_tier={"QT3": 400, "QT4": 200, "QT5": 100}, skill="experienced"),
        task("TSK_WDWL_SAND_BETWEEN", "Sand Wood Wall Between Coats", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rates_by_tier={"QT3": 200, "QT4": 120, "QT5": 80}),
        task("TSK_WDWL_TACK_CLEAN", "Tack Clean Wood Wall", "PS_SURFACE_SF.WOOD_WALL", "SF", rate=200),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Always fires for sheen finish.",
})

emit_module({
    "module_id": "MOD_CLEANUP_WOOD_WALL",
    "name": "Cleanup After Wood Wall",
    "phase": "cleanup",
    "intent": "Final inspect, remove masks, vacuum, clean tools.",
    "tasks": [
        task("TSK_WDWL_FINAL_INSPECT", "Final Inspect Wood Wall", "PS_SURFACE_SF.WOOD_WALL", "SF",
             rates_by_tier={"QT3": 500, "QT4": 250, "QT5": 120}, skill="experienced"),
        task("TSK_WDWL_REMOVE_CEIL_MASK", "Remove Wood Wall Ceiling Mask",
             "PS_PROTECT_LF.CEILING_ADJACENT", "LF", rate=200),
        task("TSK_WDWL_REMOVE_FLOOR_PROTECT", "Remove Wood Wall Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_WDWL_VACUUM", "Vacuum Wood Wall Area", "PS_META.SF.FLOOR_VACUUM_AREA", "SF", rate=300),
        task("TSK_WDWL_TOOL_CLEANUP", "Clean Wood Wall Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Standard cleanup pattern.",
})

emit_scenario({
    "scenario_id": "SCN_WOOD_WALL_NC_QT3_SPRAY_FROM_BARE",
    "name": "Wood Wall NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wood_wall",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "spray",
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


# ============================================================================
# 3. WOOD CEILING (mirrors with overhead penalty already in modifier)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_WOOD_CEILING",
    "name": "Set Up Wood Ceiling Work Area",
    "phase": "setup",
    "intent": "Full floor protection, wall mask, fixture mask.",
    "tasks": [
        task("TSK_WDCL_FLOOR_PROTECT", "Wood Ceiling Floor Protection", "PS_PROTECT_SF.FLOOR_EXPOSED", "SF", rate=200),
        task("TSK_WDCL_WALL_MASK", "Mask Walls Below Wood Ceiling", "PS_PROTECT_SF.WALL_ADJACENT", "SF", rate=100),
        task("TSK_WDCL_FIXTURE_MASK", "Mask Wood Ceiling Fixtures", "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=10),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Full coverage protection because ceiling work has overhead drip and overspray risk.",
})

emit_module({
    "module_id": "MOD_PREP_WOOD_CEILING",
    "name": "Wood Ceiling Prep",
    "phase": "prep",
    "intent": "Sand, fill, caulk, seal MDF.",
    "tasks": [
        task("TSK_WDCL_SAND_PREP", "Sand Wood Ceiling", "PS_SURFACE_SF.WOOD_CEILING", "SF", rate=110),
        task("TSK_WDCL_FILL", "Fill Wood Ceiling Fasteners", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rates_by_tier={"QT3": 90, "QT4": 75, "QT5": 60}, skill="experienced"),
        task("TSK_WDCL_SAND_FILL", "Sand Wood Ceiling Fill", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rates_by_tier={"QT3": 110, "QT4": 90, "QT5": 60}),
        task("TSK_WDCL_CAULK_JOINTS", "Caulk Wood Ceiling Joints", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=32, skill="experienced"),
        task("TSK_WDCL_CAULK_PERIMETER", "Caulk Wood Ceiling Perimeter", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=90, skill="experienced"),
        task("TSK_WDCL_SEAL_MDF", "Seal Wood Ceiling MDF", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=45, applies_when={"substrate_condition": ["mdf"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "All prep rates ~25% slower than wood wall because of overhead positioning.",
})

emit_module({
    "module_id": "MOD_APPLY_WOOD_CEILING_PRIME",
    "name": "Prime Wood Ceiling",
    "phase": "prime",
    "intent": "Prime if bare.",
    "tasks": [
        task("TSK_WDCL_PRIME", "Prime Wood Ceiling Faces", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=90, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_WDCL_SAND_PRIMER", "Sand Cured Wood Ceiling Primer", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=110, applies_when={"substrate_state": ["SS_BARE"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Slower than wall prime due to overhead.",
})

emit_module({
    "module_id": "MOD_APPLY_WOOD_CEILING_FINISH",
    "name": "Apply Wood Ceiling Finish",
    "phase": "finish",
    "intent": "One coat per invocation.",
    "tasks": [
        task("TSK_WDCL_SPRAY_FINISH", "Spray Wood Ceiling Finish", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=130, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_WDCL_BRUSH_FINISH", "Brush Wood Ceiling Finish", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rate=50, applies_when={"application_method": ["brush"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Slower than wood wall finish due to overhead.",
})

emit_module({
    "module_id": "MOD_INTERSTAGE_WOOD_CEILING",
    "name": "Wood Ceiling Interstage",
    "phase": "interstage",
    "intent": "Inspect, sand, tack clean.",
    "tasks": [
        task("TSK_WDCL_INSPECT_COAT", "Inspect Wood Ceiling Coat", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rates_by_tier={"QT3": 300, "QT4": 150, "QT5": 75}, skill="experienced"),
        task("TSK_WDCL_SAND_BETWEEN", "Sand Wood Ceiling Between Coats", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rates_by_tier={"QT3": 150, "QT4": 90, "QT5": 60}),
        task("TSK_WDCL_TACK_CLEAN", "Tack Clean Wood Ceiling", "PS_SURFACE_SF.WOOD_CEILING", "SF", rate=150),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "All rates slower than wood wall interstage due to overhead.",
})

emit_module({
    "module_id": "MOD_CLEANUP_WOOD_CEILING",
    "name": "Cleanup After Wood Ceiling",
    "phase": "cleanup",
    "intent": "Final inspect, remove masks, vacuum.",
    "tasks": [
        task("TSK_WDCL_FINAL_INSPECT", "Final Inspect Wood Ceiling", "PS_SURFACE_SF.WOOD_CEILING", "SF",
             rates_by_tier={"QT3": 375, "QT4": 190, "QT5": 90}, skill="experienced"),
        task("TSK_WDCL_REMOVE_WALL_MASK", "Remove Wood Ceiling Wall Mask",
             "PS_PROTECT_SF.WALL_ADJACENT", "SF", rate=150),
        task("TSK_WDCL_REMOVE_FIXTURE_MASK", "Remove Wood Ceiling Fixture Mask",
             "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=15),
        task("TSK_WDCL_REMOVE_FLOOR_PROTECT", "Remove Wood Ceiling Floor Protection",
             "PS_PROTECT_SF.FLOOR_EXPOSED", "SF", rate=300),
        task("TSK_WDCL_VACUUM", "Vacuum Wood Ceiling Area", "PS_META.SF.FLOOR_VACUUM_AREA", "SF", rate=300),
        task("TSK_WDCL_TOOL_CLEANUP", "Clean Wood Ceiling Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Cleanup pattern matches wood wall plus fixture removal.",
})

emit_scenario({
    "scenario_id": "SCN_WOOD_CEILING_NC_QT3_SPRAY_FROM_BARE",
    "name": "Wood Ceiling NC - QT3 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "wood_ceiling",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "spray",
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


# ============================================================================
# 4. STAIR RISER (per-EA risers + per-LF stringer)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_STAIR_RISER",
    "name": "Set Up Stair Riser Work Area",
    "phase": "setup",
    "intent": "Tread protection, floor protection at landing, wall mask.",
    "tasks": [
        task("TSK_STRS_TREAD_PROTECT", "Protect Stair Treads", "PS_OPENING_EA.STAIR_TREAD", "EA", rate=25),
        task("TSK_STRS_FLOOR_PROTECT", "Stair Landing Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_STRS_WALL_MASK", "Mask Stair Wall", "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=120),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Tread protection is per-tread because each tread is a separate horizontal asset that needs cover.",
})

emit_module({
    "module_id": "MOD_PREP_STAIR_RISER",
    "name": "Stair Riser Prep",
    "phase": "prep",
    "intent": "Sand stringers (LF) + risers (EA), fill, caulk.",
    "tasks": [
        task("TSK_STRS_SAND_STRINGER", "Sand Stair Stringer", "PS_SURFACE_LF.STAIR_STRINGER", "LF", rate=60),
        task("TSK_STRS_SAND_RISER", "Sand Stair Riser", "PS_SURFACE_EA.STAIR_RISER", "EA", rate=20),
        task("TSK_STRS_FILL", "Fill Stair Riser Fasteners", "PS_SURFACE_EA.STAIR_RISER", "EA",
             rates_by_tier={"QT3": 30, "QT4": 25, "QT5": 20}, skill="experienced"),
        task("TSK_STRS_SAND_FILL", "Sand Stair Riser Fill", "PS_SURFACE_EA.STAIR_RISER", "EA",
             rates_by_tier={"QT3": 40, "QT4": 35, "QT5": 25}),
        task("TSK_STRS_CAULK_STRINGER_WALL", "Caulk Stringer-to-Wall",
             "PS_SURFACE_LF.STAIR_STRINGER", "LF", rate=60, skill="experienced"),
        task("TSK_STRS_CAULK_RISER_STRINGER", "Caulk Riser-to-Stringer",
             "PS_SURFACE_EA.STAIR_RISER", "EA", rate=15, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Mixed unit prep: stringer is per-LF, riser is per-EA. Both need their own sand+fill+caulk passes.",
})

emit_module({
    "module_id": "MOD_APPLY_STAIR_RISER_PRIME",
    "name": "Prime Stair Riser",
    "phase": "prime",
    "intent": "Prime stringer (LF) and riser (EA) if bare.",
    "tasks": [
        task("TSK_STRS_PRIME_STRINGER", "Prime Stringer", "PS_SURFACE_LF.STAIR_STRINGER", "LF",
             rate=80, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_STRS_PRIME_RISER", "Prime Riser", "PS_SURFACE_EA.STAIR_RISER", "EA",
             rate=15, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Both gate by SS_BARE.",
})

emit_module({
    "module_id": "MOD_APPLY_STAIR_RISER_FINISH",
    "name": "Apply Stair Riser Finish",
    "phase": "finish",
    "intent": "Brush or spray, stringer + riser.",
    "tasks": [
        task("TSK_STRS_BRUSH_FINISH_STRINGER", "Brush Finish Stringer",
             "PS_SURFACE_LF.STAIR_STRINGER", "LF", rate=85,
             applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRS_BRUSH_FINISH_RISER", "Brush Finish Riser",
             "PS_SURFACE_EA.STAIR_RISER", "EA", rate=15,
             applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRS_SPRAY_FINISH_STRINGER", "Spray Finish Stringer",
             "PS_SURFACE_LF.STAIR_STRINGER", "LF", rate=350,
             applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_STRS_SPRAY_FINISH_RISER", "Spray Finish Riser",
             "PS_SURFACE_EA.STAIR_RISER", "EA", rate=60,
             applies_when={"application_method": ["spray"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Spray is ~4x faster than brush for both stringer and riser. Spray requires the stair to be closed off because overspray on treads is a problem.",
})

emit_module({
    "module_id": "MOD_CLEANUP_STAIR_RISER",
    "name": "Cleanup After Stair Riser",
    "phase": "cleanup",
    "intent": "Remove tread protection, floor cloth, wall mask, clean tools.",
    "tasks": [
        task("TSK_STRS_REMOVE_WALL_MASK", "Remove Stair Wall Mask", "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=200),
        task("TSK_STRS_REMOVE_FLOOR_PROTECT", "Remove Stair Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_STRS_REMOVE_TREAD_PROTECT", "Remove Tread Protection",
             "PS_OPENING_EA.STAIR_TREAD", "EA", rate=40),
        task("TSK_STRS_TOOL_CLEANUP", "Clean Stair Riser Tools", None, "FIXED", fixed_minutes=15),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Tread unwrap is the unique step here.",
})

emit_scenario({
    "scenario_id": "SCN_STAIR_RISER_NC_QT3_BRUSH_FROM_BARE",
    "name": "Stair Riser NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "stair_riser",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "brush",
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


# ============================================================================
# 5. STAIR RAILING (balusters EA + newels EA + handrail LF + base rail LF)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_STAIR_RAILING",
    "name": "Set Up Stair Railing Work Area",
    "phase": "setup",
    "intent": "Verify tread protection, floor protection, wall mask, remove brackets if needed.",
    "tasks": [
        task("TSK_STRL_TREAD_VERIFY", "Verify Tread Protection",
             "PS_OPENING_EA.STAIR_TREAD", "EA", rate=40),
        task("TSK_STRL_FLOOR_PROTECT", "Stair Railing Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_STRL_WALL_MASK", "Mask Wall Behind Railing",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=120),
        task("TSK_STRL_BRACKET_REMOVE", "Remove Handrail Brackets",
             "PS_SURFACE_EA.RAILING_BRACKET", "EA", rate=12),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Brackets removed for cleaner finish at handrail-to-wall junction.",
})

emit_module({
    "module_id": "MOD_PREP_STAIR_RAILING",
    "name": "Stair Railing Prep",
    "phase": "prep",
    "intent": "Solvent clean iron, scuff sand iron (iron_and_wood only), sand wood components, fill, caulk newels.",
    "tasks": [
        task("TSK_STRL_SOLVENT_CLEAN_IRON", "Solvent Clean Iron Balusters",
             "PS_SURFACE_EA.BALUSTER", "EA", rate=60,
             applies_when={"railing_type": ["iron_and_wood"]}, skill="experienced"),
        task("TSK_STRL_SCUFF_SAND_IRON", "Scuff Sand Iron",
             "PS_SURFACE_EA.BALUSTER", "EA", rate=30,
             applies_when={"railing_type": ["iron_and_wood"]}),
        task("TSK_STRL_SAND_BALUSTER", "Sand Wood Balusters",
             "PS_SURFACE_EA.BALUSTER", "EA", rate=20,
             applies_when={"railing_type": ["all_wood"]}),
        task("TSK_STRL_SAND_NEWEL", "Sand Newel Posts",
             "PS_SURFACE_EA.NEWEL", "EA", rate=4),
        task("TSK_STRL_SAND_HANDRAIL", "Sand Handrail",
             "PS_SURFACE_LF.HANDRAIL", "LF", rate=60),
        task("TSK_STRL_SAND_BASE_RAIL", "Sand Base Rail",
             "PS_SURFACE_LF.BASE_RAIL", "LF", rate=70),
        task("TSK_STRL_FILL_SAND", "Fill Railing Defects",
             "PS_SURFACE_EA.BALUSTER", "EA",
             rates_by_tier={"QT3": 25, "QT4": 20, "QT5": 15}, skill="experienced"),
        task("TSK_STRL_CAULK_NEWEL", "Caulk Newel Joints",
             "PS_SURFACE_EA.NEWEL", "EA", rate=8, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Iron prep (solvent clean + scuff sand) only fires for iron_and_wood railings. Wood sand fires for all_wood.",
})

emit_module({
    "module_id": "MOD_APPLY_STAIR_RAILING_PRIME",
    "name": "Prime Stair Railing",
    "phase": "prime",
    "intent": "Prime balusters, newels, handrail, base rail.",
    "tasks": [
        task("TSK_STRL_PRIME_BALUSTER", "Prime Baluster", "PS_SURFACE_EA.BALUSTER", "EA",
             rate=15, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_STRL_PRIME_NEWEL", "Prime Newel", "PS_SURFACE_EA.NEWEL", "EA",
             rate=4, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_STRL_PRIME_HANDRAIL", "Prime Handrail", "PS_SURFACE_LF.HANDRAIL", "LF",
             rate=65, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_STRL_PRIME_BASE_RAIL", "Prime Base Rail", "PS_SURFACE_LF.BASE_RAIL", "LF",
             rate=70, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Per-component priming: baluster (slow), newel (very slow per piece but few pieces), rails (fast LF).",
})

emit_module({
    "module_id": "MOD_APPLY_STAIR_RAILING_FINISH",
    "name": "Apply Stair Railing Finish",
    "phase": "finish",
    "intent": "Per-component finish, brush or spray.",
    "tasks": [
        task("TSK_STRL_BRUSH_BALUSTER", "Brush Finish Baluster", "PS_SURFACE_EA.BALUSTER", "EA",
             rate=15, applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRL_BRUSH_NEWEL", "Brush Finish Newel", "PS_SURFACE_EA.NEWEL", "EA",
             rate=4, applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRL_BRUSH_HANDRAIL", "Brush Finish Handrail", "PS_SURFACE_LF.HANDRAIL", "LF",
             rate=65, applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRL_BRUSH_BASE_RAIL", "Brush Finish Base Rail", "PS_SURFACE_LF.BASE_RAIL", "LF",
             rate=70, applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_STRL_SPRAY_BALUSTER", "Spray Finish Baluster", "PS_SURFACE_EA.BALUSTER", "EA",
             rate=40, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_STRL_SPRAY_NEWEL", "Spray Finish Newel", "PS_SURFACE_EA.NEWEL", "EA",
             rate=12, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_STRL_SPRAY_HANDRAIL", "Spray Finish Handrail", "PS_SURFACE_LF.HANDRAIL", "LF",
             rate=200, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_STRL_SPRAY_BASE_RAIL", "Spray Finish Base Rail", "PS_SURFACE_LF.BASE_RAIL", "LF",
             rate=220, applies_when={"application_method": ["spray"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Spray ~3x brush. Handrail gets tested by hand-feel after final coat to confirm no nibs.",
})

emit_module({
    "module_id": "MOD_CLEANUP_STAIR_RAILING",
    "name": "Cleanup After Stair Railing",
    "phase": "cleanup",
    "intent": "Reinstall brackets, remove protection, clean tools.",
    "tasks": [
        task("TSK_STRL_BRACKET_REINSTALL", "Reinstall Handrail Brackets",
             "PS_SURFACE_EA.RAILING_BRACKET", "EA", rate=10, skill="experienced"),
        task("TSK_STRL_REMOVE_WALL_MASK", "Remove Railing Wall Mask",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=200),
        task("TSK_STRL_REMOVE_FLOOR_PROTECT", "Remove Railing Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_STRL_REMOVE_TREAD_PROTECT", "Remove Tread Protection (Railing)",
             "PS_OPENING_EA.STAIR_TREAD", "EA", rate=40),
        task("TSK_STRL_TOOL_CLEANUP", "Clean Railing Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Bracket reinstall is symmetric with bracket removal in setup.",
})

emit_scenario({
    "scenario_id": "SCN_STAIR_RAILING_NC_QT3_BRUSH_ALL_WOOD_FROM_BARE",
    "name": "Stair Railing All-Wood NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "stair_railing",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "brush",
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


# ============================================================================
# 6. ARCH ELEMENT (beams LF + columns EA + mantels EA)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_ARCH_ELEMENT",
    "name": "Set Up Arch Element Work Area",
    "phase": "setup",
    "intent": "Workzone floor protection, perimeter floor, wall mask, fixture mask.",
    "tasks": [
        task("TSK_ARCH_FLOOR_WORKZONE", "Workzone Floor Protection",
             "PS_PROTECT_SF.FLOOR_WORKZONE", "SF", rate=200),
        task("TSK_ARCH_FLOOR_PERIM", "Perimeter Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_ARCH_WALL_MASK", "Mask Adjacent Wall",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=80),
        task("TSK_ARCH_FIXTURE_MASK", "Mask Arch Element Fixtures",
             "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=10),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Workzone covers area directly under the element being painted; perimeter is the broader floor edge.",
})

emit_module({
    "module_id": "MOD_PREP_ARCH_ELEMENT",
    "name": "Arch Element Prep",
    "phase": "prep",
    "intent": "Sand, fill, caulk, seal MDF for beams + columns + mantels (mixed units).",
    "tasks": [
        task("TSK_ARCH_DUST_CLEAN_BEAM", "Dust Clean Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=400),
        task("TSK_ARCH_SAND_BEAM", "Sand Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=120),
        task("TSK_ARCH_SAND_COLUMN", "Sand Column",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=4),
        task("TSK_ARCH_SAND_MANTEL", "Sand Mantel",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=2),
        task("TSK_ARCH_FILL_BEAM", "Fill Beam Defects",
             "PS_SURFACE_LF.ARCH_BEAM", "LF",
             rates_by_tier={"QT3": 100, "QT4": 75, "QT5": 50}, skill="experienced"),
        task("TSK_ARCH_FILL_COLUMN", "Fill Column Defects",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA",
             rates_by_tier={"QT3": 8, "QT4": 6, "QT5": 4}, skill="experienced"),
        task("TSK_ARCH_FILL_MANTEL", "Fill Mantel Defects",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA",
             rates_by_tier={"QT3": 5, "QT4": 3.5, "QT5": 2.5}, skill="experienced"),
        task("TSK_ARCH_CAULK_BEAM", "Caulk Beam Joints",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=60, skill="experienced"),
        task("TSK_ARCH_CAULK_COLUMN", "Caulk Column Joints",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=4, skill="experienced"),
        task("TSK_ARCH_CAULK_MANTEL", "Caulk Mantel Joints",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=3, skill="experienced"),
        task("TSK_ARCH_SEAL_MDF", "Seal Beam MDF Edges",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=200,
             applies_when={"substrate_condition": ["mdf"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Three sub-element types share one prep module; tasks are independent per element type.",
})

emit_module({
    "module_id": "MOD_APPLY_ARCH_ELEMENT_PRIME",
    "name": "Prime Arch Element",
    "phase": "prime",
    "intent": "Brush or spray prime beams, columns, mantels if bare.",
    "tasks": [
        task("TSK_ARCH_BRUSH_PRIME_BEAM", "Brush Prime Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=120,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_PRIME_BEAM", "Spray Prime Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=225,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["spray"]}, skill="experienced"),
        task("TSK_ARCH_BRUSH_PRIME_COLUMN", "Brush Prime Column",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=3,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_PRIME_COLUMN", "Spray Prime Column",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=6,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["spray"]}, skill="experienced"),
        task("TSK_ARCH_BRUSH_PRIME_MANTEL", "Brush Prime Mantel",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=2,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_PRIME_MANTEL", "Spray Prime Mantel",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=3,
             applies_when={"substrate_state": ["SS_BARE"], "application_method": ["spray"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Spray ~2x brush across all three element types. All gate by SS_BARE.",
})

emit_module({
    "module_id": "MOD_APPLY_ARCH_ELEMENT_FINISH",
    "name": "Apply Arch Element Finish",
    "phase": "finish",
    "intent": "Finish beams + columns + mantels, brush or spray.",
    "tasks": [
        task("TSK_ARCH_BRUSH_BEAM", "Brush Finish Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=90,
             applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_BEAM", "Spray Finish Beam",
             "PS_SURFACE_LF.ARCH_BEAM", "LF", rate=225,
             applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_ARCH_BRUSH_COLUMN", "Brush Finish Column",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=2.5,
             applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_COLUMN", "Spray Finish Column",
             "PS_SURFACE_EA.ARCH_COLUMN", "EA", rate=5,
             applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_ARCH_BRUSH_MANTEL", "Brush Finish Mantel",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=1.5,
             applies_when={"application_method": ["brush"]}, skill="experienced"),
        task("TSK_ARCH_SPRAY_MANTEL", "Spray Finish Mantel",
             "PS_SURFACE_EA.ARCH_MANTEL", "EA", rate=2.5,
             applies_when={"application_method": ["spray"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Same per-element-type pattern as prime.",
})

emit_module({
    "module_id": "MOD_CLEANUP_ARCH_ELEMENT",
    "name": "Cleanup After Arch Element",
    "phase": "cleanup",
    "intent": "Remove protection, vacuum, clean tools.",
    "tasks": [
        task("TSK_ARCH_REMOVE_WALL_MASK", "Remove Arch Wall Mask",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=200),
        task("TSK_ARCH_REMOVE_FIXTURE_MASK", "Remove Arch Fixture Mask",
             "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=15),
        task("TSK_ARCH_REMOVE_FLOOR_WORKZONE", "Remove Workzone Floor",
             "PS_PROTECT_SF.FLOOR_WORKZONE", "SF", rate=300),
        task("TSK_ARCH_REMOVE_FLOOR_PERIM", "Remove Perimeter Floor",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_ARCH_TOOL_CLEANUP", "Clean Arch Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Standard cleanup with both workzone and perimeter floor removal.",
})

emit_scenario({
    "scenario_id": "SCN_ARCH_ELEMENT_NC_QT3_BRUSH_FROM_BARE",
    "name": "Arch Element NC - QT3 Brush from Bare (beams + columns + mantels)",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "arch_element",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "brush",
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


# ============================================================================
# 7. BUILTIN (similar to wood wall but with shelving + interior cubbies)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_BUILTIN",
    "name": "Set Up Builtin Work Area",
    "phase": "setup",
    "intent": "Floor protection in front of builtin, mask wall and adjacent surfaces.",
    "tasks": [
        task("TSK_BLT_FLOOR_PROTECT", "Builtin Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=200),
        task("TSK_BLT_WALL_MASK", "Mask Wall Adjacent Builtin",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=120),
        task("TSK_BLT_FIXTURE_MASK", "Mask Builtin Fixtures",
             "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=10),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Builtins often have outlets, light fixtures, or hardware mounted on or adjacent to them.",
})

emit_module({
    "module_id": "MOD_PREP_BUILTIN",
    "name": "Builtin Prep",
    "phase": "prep",
    "intent": "Sand, fill, caulk, seal MDF.",
    "tasks": [
        task("TSK_BLT_SAND_PREP", "Sand Builtin Surface",
             "PS_SURFACE_SF.BUILTIN", "SF", rate=120),
        task("TSK_BLT_FILL", "Fill Builtin Defects", "PS_SURFACE_SF.BUILTIN", "SF",
             rates_by_tier={"QT3": 100, "QT4": 80, "QT5": 60}, skill="experienced"),
        task("TSK_BLT_SAND_FILL", "Sand Builtin Fill", "PS_SURFACE_SF.BUILTIN", "SF",
             rates_by_tier={"QT3": 130, "QT4": 100, "QT5": 70}),
        task("TSK_BLT_CAULK_JOINTS", "Caulk Builtin Joints",
             "PS_SURFACE_SF.BUILTIN", "SF", rate=45, skill="experienced"),
        task("TSK_BLT_SEAL_MDF", "Seal Builtin MDF", "PS_SURFACE_SF.BUILTIN", "SF",
             rate=55, applies_when={"substrate_condition": ["mdf"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Builtins frequently have MDF panels and shelf edges that need sealing.",
})

emit_module({
    "module_id": "MOD_APPLY_BUILTIN_PRIME",
    "name": "Prime Builtin",
    "phase": "prime",
    "intent": "Prime if bare.",
    "tasks": [
        task("TSK_BLT_PRIME", "Prime Builtin", "PS_SURFACE_SF.BUILTIN", "SF",
             rate=100, applies_when={"substrate_state": ["SS_BARE"]}, skill="experienced"),
        task("TSK_BLT_SAND_PRIMER", "Sand Cured Builtin Primer", "PS_SURFACE_SF.BUILTIN", "SF",
             rate=130, applies_when={"substrate_state": ["SS_BARE"]}),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Slower than wainscot prime because builtins have interior cubbies that take longer to coat.",
})

emit_module({
    "module_id": "MOD_APPLY_BUILTIN_FINISH",
    "name": "Apply Builtin Finish",
    "phase": "finish",
    "intent": "One coat per invocation.",
    "tasks": [
        task("TSK_BLT_SPRAY_FINISH", "Spray Builtin Finish", "PS_SURFACE_SF.BUILTIN", "SF",
             rate=150, applies_when={"application_method": ["spray"]}, skill="experienced"),
        task("TSK_BLT_BRUSH_FINISH", "Brush Builtin Finish", "PS_SURFACE_SF.BUILTIN", "SF",
             rate=60, applies_when={"application_method": ["brush"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Slower than wainscot finish; builtin interior cubbies are awkward to spray.",
})

emit_module({
    "module_id": "MOD_INTERSTAGE_BUILTIN",
    "name": "Builtin Interstage",
    "phase": "interstage",
    "intent": "Inspect, sand between, tack clean.",
    "tasks": [
        task("TSK_BLT_INSPECT_COAT", "Inspect Builtin Coat", "PS_SURFACE_SF.BUILTIN", "SF",
             rates_by_tier={"QT3": 350, "QT4": 175, "QT5": 90}, skill="experienced"),
        task("TSK_BLT_SAND_BETWEEN", "Sand Builtin Between Coats", "PS_SURFACE_SF.BUILTIN", "SF",
             rates_by_tier={"QT3": 175, "QT4": 100, "QT5": 70}),
        task("TSK_BLT_TACK_CLEAN", "Tack Clean Builtin", "PS_SURFACE_SF.BUILTIN", "SF", rate=180),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Always fires for builtin satin/semi-gloss finish.",
})

emit_module({
    "module_id": "MOD_CLEANUP_BUILTIN",
    "name": "Cleanup After Builtin",
    "phase": "cleanup",
    "intent": "Final inspect, remove masks, vacuum, clean tools.",
    "tasks": [
        task("TSK_BLT_FINAL_INSPECT", "Final Inspect Builtin", "PS_SURFACE_SF.BUILTIN", "SF",
             rates_by_tier={"QT3": 450, "QT4": 225, "QT5": 110}, skill="experienced"),
        task("TSK_BLT_REMOVE_WALL_MASK", "Remove Builtin Wall Mask",
             "PS_PROTECT_LF.WALL_ADJACENT", "LF", rate=200),
        task("TSK_BLT_REMOVE_FIXTURE_MASK", "Remove Builtin Fixture Mask",
             "PS_PROTECT_EA.ASSET.FIXTURES", "EA", rate=15),
        task("TSK_BLT_REMOVE_FLOOR_PROTECT", "Remove Builtin Floor Protection",
             "PS_PROTECT_SF.FLOOR_PERIMETER", "SF", rate=300),
        task("TSK_BLT_TOOL_CLEANUP", "Clean Builtin Tools", None, "FIXED", fixed_minutes=20),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Standard cleanup pattern.",
})

emit_scenario({
    "scenario_id": "SCN_BUILTIN_NC_QT3_BRUSH_FROM_BARE",
    "name": "Builtin NC - QT3 Brush from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "builtin",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT3",
        "application_method": "brush",
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


# ============================================================================
# 8. CABINET (heavy: doors EA + drawers EA + frame SF + interior SF)
# ============================================================================
emit_module({
    "module_id": "MOD_SETUP_CABINET",
    "name": "Set Up Cabinet Work Area",
    "phase": "setup",
    "intent": "Full kitchen floor cover, countertop cover, backsplash mask, fixture removal/cover, hardware removal.",
    "tasks": [
        task("TSK_CABT_FLOOR_FULL", "Full Kitchen Floor Cover",
             "PS_PROTECT_SF.FLOOR_FULL_KITCHEN", "SF", rate=300),
        task("TSK_CABT_COUNTERTOP_COVER", "Countertop Cover",
             "PS_PROTECT_SF.COUNTERTOP", "SF", rate=200),
        task("TSK_CABT_BACKSPLASH_MASK", "Mask Backsplash",
             "PS_PROTECT_SF.BACKSPLASH", "SF", rate=100),
        task("TSK_CABT_HARDWARE_REMOVE", "Remove Cabinet Hardware",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=15, skill="experienced"),
        task("TSK_CABT_DOOR_REMOVE", "Remove Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=10, skill="experienced"),
        task("TSK_CABT_DRAWER_REMOVE", "Remove Cabinet Drawers",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=15, skill="experienced"),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Cabinet setup is the heaviest of any interior substrate. Full kitchen requires floor + countertop + backsplash protection plus removal of every door and drawer.",
})

emit_module({
    "module_id": "MOD_PREP_CABINET",
    "name": "Cabinet Prep",
    "phase": "prep",
    "intent": "Clean degrease, sand, fill, caulk for doors + drawers + frame + interiors.",
    "tasks": [
        task("TSK_CABT_DEGREASE_DOORS", "Degrease Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=20),
        task("TSK_CABT_DEGREASE_FRAME", "Degrease Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=120),
        task("TSK_CABT_SAND_DOORS", "Sand Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=8),
        task("TSK_CABT_SAND_DRAWERS", "Sand Cabinet Drawers",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=12),
        task("TSK_CABT_SAND_FRAME", "Sand Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=80),
        task("TSK_CABT_FILL_DOORS", "Fill Cabinet Door Defects",
             "PS_SURFACE_EA.CABINET_DOOR", "EA",
             rates_by_tier={"QT3": 15, "QT4": 12, "QT5": 8}, skill="experienced"),
        task("TSK_CABT_CAULK_FRAME", "Caulk Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=60, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Degrease is mandatory for cabinets to remove cooking grease that prevents primer adhesion.",
})

emit_module({
    "module_id": "MOD_APPLY_CABINET_PRIME",
    "name": "Prime Cabinet",
    "phase": "prime",
    "intent": "Spray prime doors + drawers + frame; bonding primer for factory finish.",
    "tasks": [
        task("TSK_CABT_SPRAY_PRIME_DOORS", "Spray Prime Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=15,
             applies_when={"substrate_state": ["SS_BARE", "SS_PRIMED_FACTORY"]}, skill="experienced"),
        task("TSK_CABT_SPRAY_PRIME_DRAWERS", "Spray Prime Cabinet Drawers",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=20,
             applies_when={"substrate_state": ["SS_BARE", "SS_PRIMED_FACTORY"]}, skill="experienced"),
        task("TSK_CABT_SPRAY_PRIME_FRAME", "Spray Prime Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=100,
             applies_when={"substrate_state": ["SS_BARE", "SS_PRIMED_FACTORY"]}, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Cabinet prime always fires (even for factory primed) because cabinets need a bonding primer that adheres to whatever surface state exists.",
})

emit_module({
    "module_id": "MOD_APPLY_CABINET_FINISH",
    "name": "Apply Cabinet Finish",
    "phase": "finish",
    "intent": "Spray finish doors + drawers + frame.",
    "tasks": [
        task("TSK_CABT_SPRAY_DOORS", "Spray Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=12, skill="experienced"),
        task("TSK_CABT_SPRAY_DRAWERS", "Spray Cabinet Drawers",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=18, skill="experienced"),
        task("TSK_CABT_SPRAY_FRAME", "Spray Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=85, skill="experienced"),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Cabinets are spray-only in production work; brush would take 5x as long and produce visible brush marks.",
})

emit_module({
    "module_id": "MOD_INTERSTAGE_CABINET",
    "name": "Cabinet Interstage",
    "phase": "interstage",
    "intent": "Sand between coats and tack clean.",
    "tasks": [
        task("TSK_CABT_SAND_BETWEEN_DOORS", "Sand Doors Between Coats",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=10),
        task("TSK_CABT_SAND_BETWEEN_DRAWERS", "Sand Drawers Between Coats",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=15),
        task("TSK_CABT_SAND_BETWEEN_FRAME", "Sand Frame Between Coats",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=100),
        task("TSK_CABT_TACK_CLEAN", "Tack Clean Cabinet",
             "PS_SURFACE_SF.CABINET_FRAME", "SF", rate=200),
    ],
    "modifier_eligibility": ME_FULL,
    "doctrine": "Cabinets always sand between coats because cabinet finish is the most-touched surface in a kitchen.",
})

emit_module({
    "module_id": "MOD_CLEANUP_CABINET",
    "name": "Cleanup After Cabinet",
    "phase": "cleanup",
    "intent": "Reinstall doors/drawers/hardware, remove protection, final inspect.",
    "tasks": [
        task("TSK_CABT_DOOR_REINSTALL", "Reinstall Cabinet Doors",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=8, skill="experienced"),
        task("TSK_CABT_DRAWER_REINSTALL", "Reinstall Cabinet Drawers",
             "PS_SURFACE_EA.CABINET_DRAWER", "EA", rate=12, skill="experienced"),
        task("TSK_CABT_HARDWARE_REINSTALL", "Reinstall Cabinet Hardware",
             "PS_SURFACE_EA.CABINET_DOOR", "EA", rate=12, skill="experienced"),
        task("TSK_CABT_FINAL_INSPECT_FRAME", "Final Inspect Cabinet Frame",
             "PS_SURFACE_SF.CABINET_FRAME", "SF",
             rates_by_tier={"QT3": 200, "QT4": 100, "QT5": 60}, skill="experienced"),
        task("TSK_CABT_REMOVE_BACKSPLASH_MASK", "Remove Backsplash Mask",
             "PS_PROTECT_SF.BACKSPLASH", "SF", rate=200),
        task("TSK_CABT_REMOVE_COUNTERTOP_COVER", "Remove Countertop Cover",
             "PS_PROTECT_SF.COUNTERTOP", "SF", rate=400),
        task("TSK_CABT_REMOVE_FLOOR_FULL", "Remove Full Kitchen Floor Cover",
             "PS_PROTECT_SF.FLOOR_FULL_KITCHEN", "SF", rate=500),
        task("TSK_CABT_TOOL_CLEANUP", "Clean Cabinet Tools", None, "FIXED", fixed_minutes=30),
    ],
    "modifier_eligibility": ME_FLAT,
    "doctrine": "Reinstall is the symmetric counterpart to setup. Final inspect on frame only because doors/drawers have already been finish-inspected during application.",
})

emit_scenario({
    "scenario_id": "SCN_CABINET_NC_QT4_SPRAY_FROM_BARE",
    "name": "Cabinet NC - QT4 Spray from Bare",
    "domain": "interior", "context": "NC",
    "matches": {
        "substrate": "cabinet",
        "substrate_state": ["SS_BARE"],
        "quality_tier": "QT4",
        "application_method": "spray",
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


# ============================================================================
# REPORT
# ============================================================================
print(f"Generated {len(generated_modules)} modules and {len(generated_scenarios)} scenarios")
print("\nModules:")
for m in generated_modules:
    print(f"  {m}")
print("\nScenarios:")
for s in generated_scenarios:
    print(f"  {s}")
