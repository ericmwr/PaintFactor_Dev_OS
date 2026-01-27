#!/usr/bin/env python3
"""
validate_specs.py

Validates PaintFactor Spec artifacts under /specs using:
1) JSON Schema validation (specs/_schemas/*.schema.json)
2) Cross-file referential integrity checks across:
   - spec.json
   - research.json (optional)
   - materials.json
   - sop_modules.json
   - production.json
   - qa_report.json (optional)

Usage:
    python scripts/validate_specs.py specs
    python scripts/validate_specs.py specs/SF_DOORS_INT_REPAINT

Exit codes:
    0 = all valid
    1 = validation errors found
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    import jsonschema
except ImportError:
    print("ERROR: Missing dependency 'jsonschema'. Install with: pip install jsonschema", file=sys.stderr)
    sys.exit(1)


ARTIFACT_FILES = [
    "spec.json",
    "materials.json",
    "sop_modules.json",
    "production.json",
    # Optional but supported:
    "research.json",
    "qa_report.json",
]

SCHEMA_MAP = {
    "spec.json": "spec.schema.json",
    "materials.json": "materials.schema.json",
    "sop_modules.json": "sop_modules.schema.json",
    "production.json": "production.schema.json",
    "research.json": "research.schema.json",
    "qa_report.json": "qa_report.schema.json",
}

# =============================================================================
# Protection Zones & Finish Continuity Vocabulary
# =============================================================================

VALID_PROTECTION_ACTIONS = ["setup", "teardown", "maintain"]

VALID_ZONES = [
    "floor_full", "floor_perimeter", "floor_workzone",
    "wall_adjacent", "ceiling_line", "trim_edges", "baseboard_top",
    "door_hardware", "window_glass", "cabinet_interior", "cabinet_hardware",
    "fixture_covers", "countertop", "appliances"
]

VALID_SURFACES = [
    # Wall surfaces
    "wall_field", "wall_accent", "wall_panel",
    # Ceiling surfaces
    "ceiling_field", "ceiling_detail",
    # Trim surfaces - linear
    "trim_baseboard", "trim_casing_door", "trim_casing_window", "trim_crown",
    "trim_chair_rail", "trim_wainscot_rail", "trim_shadow_box", "trim_panel_mold",
    # Door system surfaces
    "door_casing", "door_frame", "door_leaf_face", "door_leaf_edge", "door_stop",
    # Window system surfaces
    "window_casing", "window_jamb", "window_sash", "window_stool", "window_apron",
    # Cabinet surfaces
    "cabinet_face_frame", "cabinet_door", "cabinet_drawer", "cabinet_box_interior", "cabinet_end_panel",
    # Built-in surfaces
    "builtin_carcass", "builtin_face", "builtin_shelf", "builtin_trim",
    # Millwork surfaces
    "wainscot_panel", "wainscot_rail", "wainscot_stile", "wainscot_cap",
    "beam_wrap", "column_wrap", "mantel"
]

VALID_CONDITIONS = ["different_finish", "same_finish", "always"]
VALID_SKIP_REQUIRED = ["same_finish_group", "different_finish_group"]
VALID_RATE_CATEGORIES = ["edge_masking", "cut_in", "spray_edge", "inspection"]
VALID_APP_METHODS = ["brush_roll", "spray", "any"]
VALID_EDGE_TYPES = ["linear", "complex"]
VALID_RELATIONSHIPS = ["same_finish", "different_finish", "varies"]


@dataclass
class Issue:
    level: str  # "ERROR" | "WARN"
    path: str
    message: str


def load_json(path: Path) -> Dict[str, Any]:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        raise ValueError(f"Failed to parse JSON at {path}: {e}")


def find_spec_family_dirs(root: Path) -> List[Path]:
    """
    Find spec family directories (contain spec.json).
    If root itself contains spec.json, treat it as a single family folder.
    """
    if (root / "spec.json").exists():
        return [root]

    dirs = []
    for p in root.rglob("spec.json"):
        dirs.append(p.parent)
    # De-dup and stable sort
    return sorted(set(dirs))


def load_schemas(schema_dir: Path) -> Dict[str, Dict[str, Any]]:
    schemas: Dict[str, Dict[str, Any]] = {}
    for filename in set(SCHEMA_MAP.values()):
        schema_path = schema_dir / filename
        if not schema_path.exists():
            raise FileNotFoundError(f"Missing schema file: {schema_path}")
        schemas[filename] = load_json(schema_path)
    return schemas


def validate_against_schema(
    data: Dict[str, Any],
    schema: Dict[str, Any],
    file_path: Path,
) -> List[Issue]:
    issues: List[Issue] = []
    validator = jsonschema.Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(data), key=lambda e: e.path):
        loc = "/".join([str(x) for x in err.path]) if err.path else "(root)"
        issues.append(
            Issue(
                level="ERROR",
                path=f"{file_path}::{loc}",
                message=err.message,
            )
        )
    return issues


def get_spec_family_id(artifact_name: str, data: Dict[str, Any]) -> Optional[str]:
    if artifact_name == "spec.json":
        return data.get("spec_family", {}).get("id")
    return data.get("spec_family_id")


# =============================================================================
# Protection & Continuity Metadata Validation
# =============================================================================

def validate_protection_metadata(
    task: Dict[str, Any],
    file_path: str,
    issues: List["Issue"],
) -> None:
    """Validate protection_metadata on a task."""
    task_id = task.get("task_id", "unknown")
    task_type = task.get("task_type", "")

    # Check if this is a protection task
    if task_type == "protect":
        pm = task.get("protection_metadata")
        if not pm:
            issues.append(Issue(
                "WARN",
                file_path,
                f"PZ_MISSING_METADATA: Protection task '{task_id}' missing protection_metadata"
            ))
            return

        # Validate action
        action = pm.get("action")
        if not action:
            issues.append(Issue(
                "ERROR",
                file_path,
                f"PZ_MISSING_ACTION: Task '{task_id}' protection_metadata missing 'action'"
            ))
        elif action not in VALID_PROTECTION_ACTIONS:
            issues.append(Issue(
                "ERROR",
                file_path,
                f"PZ_INVALID_ACTION: Task '{task_id}' has invalid action '{action}' (must be one of: {VALID_PROTECTION_ACTIONS})"
            ))

        # Validate zones
        zones = pm.get("zones")
        if not zones:
            issues.append(Issue(
                "ERROR",
                file_path,
                f"PZ_MISSING_ZONES: Task '{task_id}' protection_metadata missing or empty 'zones'"
            ))
        elif isinstance(zones, list):
            for zone in zones:
                if zone not in VALID_ZONES:
                    issues.append(Issue(
                        "WARN",
                        file_path,
                        f"PZ_UNKNOWN_ZONE: Task '{task_id}' has unknown zone '{zone}' (not in Protection_Zones_Reference)"
                    ))


def validate_adjacency_metadata(
    task: Dict[str, Any],
    file_path: str,
    issues: List["Issue"],
) -> None:
    """Validate adjacency_metadata on a task."""
    task_id = task.get("task_id", "unknown")
    am = task.get("adjacency_metadata")

    if not am:
        return  # Optional unless edge task detection triggers

    # Validate adjacent_surface (required)
    adjacent_surface = am.get("adjacent_surface")
    if not adjacent_surface:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_MISSING_SURFACE: Task '{task_id}' adjacency_metadata missing 'adjacent_surface'"
        ))
    elif adjacent_surface not in VALID_SURFACES:
        issues.append(Issue(
            "WARN",
            file_path,
            f"FC_UNKNOWN_SURFACE: Task '{task_id}' has unknown surface '{adjacent_surface}' (not in Surface_Vocabulary_Reference)"
        ))

    # Validate condition enum
    condition = am.get("condition")
    if condition and condition not in VALID_CONDITIONS:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_INVALID_CONDITION: Task '{task_id}' has invalid condition '{condition}' (must be one of: {VALID_CONDITIONS})"
        ))

    # Validate skip_when / required_when
    skip_when = am.get("skip_when")
    required_when = am.get("required_when")

    if skip_when and skip_when not in VALID_SKIP_REQUIRED:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_INVALID_SKIP_WHEN: Task '{task_id}' has invalid skip_when '{skip_when}'"
        ))

    if required_when and required_when not in VALID_SKIP_REQUIRED:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_INVALID_REQUIRED_WHEN: Task '{task_id}' has invalid required_when '{required_when}'"
        ))

    if skip_when and required_when:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_SKIP_AND_REQUIRED: Task '{task_id}' has both skip_when and required_when (mutually exclusive)"
        ))

    # Validate rate_modifier_category
    rate_cat = am.get("rate_modifier_category")
    if rate_cat and rate_cat not in VALID_RATE_CATEGORIES:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_INVALID_RATE_CATEGORY: Task '{task_id}' has invalid rate_modifier_category '{rate_cat}'"
        ))

    # Validate application_method
    app_method = am.get("application_method")
    if app_method and app_method not in VALID_APP_METHODS:
        issues.append(Issue(
            "ERROR",
            file_path,
            f"FC_INVALID_APP_METHOD: Task '{task_id}' has invalid application_method '{app_method}'"
        ))

    # Blend task checks
    task_name = task.get("name", "").lower()
    if "blend" in task_name:
        if not app_method:
            issues.append(Issue(
                "WARN",
                file_path,
                f"FC_BLEND_NO_METHOD: Task '{task_id}' appears to be a blend task but missing application_method: brush_roll"
            ))
        elif app_method == "spray":
            issues.append(Issue(
                "ERROR",
                file_path,
                f"FC_BLEND_WRONG_METHOD: Task '{task_id}' is a blend task but has application_method: spray (must be brush_roll)"
            ))


def validate_adjacency_declarations(
    spec: Dict[str, Any],
    file_path: str,
    issues: List["Issue"],
) -> None:
    """Validate adjacency_declarations on a spec."""
    ad = spec.get("adjacency_declarations")

    if not ad:
        return  # Optional

    # Validate primary_surface
    primary = ad.get("primary_surface")
    if not primary:
        issues.append(Issue(
            "ERROR",
            file_path,
            "FC_DECL_NO_PRIMARY: adjacency_declarations missing 'primary_surface'"
        ))
    elif primary not in VALID_SURFACES:
        issues.append(Issue(
            "WARN",
            file_path,
            f"FC_DECL_UNKNOWN_SURFACE: Unknown primary_surface '{primary}' (not in Surface_Vocabulary_Reference)"
        ))

    # Validate adjacent_surfaces
    adjacent = ad.get("adjacent_surfaces")
    if not adjacent:
        issues.append(Issue(
            "ERROR",
            file_path,
            "FC_DECL_NO_ADJACENT: adjacency_declarations has empty or missing 'adjacent_surfaces'"
        ))
    elif isinstance(adjacent, list):
        for adj in adjacent:
            surface_id = adj.get("surface_id")
            if surface_id and surface_id not in VALID_SURFACES:
                issues.append(Issue(
                    "WARN",
                    file_path,
                    f"FC_DECL_UNKNOWN_SURFACE: Unknown adjacent surface '{surface_id}'"
                ))

            edge_type = adj.get("edge_type")
            if not edge_type:
                issues.append(Issue(
                    "ERROR",
                    file_path,
                    f"FC_DECL_MISSING_EDGE_TYPE: Adjacent surface '{surface_id}' missing 'edge_type'"
                ))
            elif edge_type not in VALID_EDGE_TYPES:
                issues.append(Issue(
                    "ERROR",
                    file_path,
                    f"FC_DECL_INVALID_EDGE_TYPE: Invalid edge_type '{edge_type}' for surface '{surface_id}' (must be one of: {VALID_EDGE_TYPES})"
                ))

            relationship = adj.get("typical_relationship")
            if relationship and relationship not in VALID_RELATIONSHIPS:
                issues.append(Issue(
                    "ERROR",
                    file_path,
                    f"FC_DECL_INVALID_RELATIONSHIP: Invalid typical_relationship '{relationship}'"
                ))

            modifier = adj.get("continuity_rate_modifier")
            if modifier is not None:
                if not isinstance(modifier, (int, float)) or modifier < 1.0 or modifier > 2.0:
                    issues.append(Issue(
                        "WARN",
                        file_path,
                        f"FC_DECL_MODIFIER_RANGE: continuity_rate_modifier {modifier} outside expected range 1.0-2.0"
                    ))


def validate_protection_zone_pairing(
    tasks: List[Dict[str, Any]],
    file_path: str,
    issues: List["Issue"],
) -> None:
    """Check that protection setup zones have matching teardown zones."""
    setup_zones: set = set()
    teardown_zones: set = set()

    for task in tasks:
        pm = task.get("protection_metadata")
        if not pm:
            continue

        action = pm.get("action")
        zones = pm.get("zones", [])

        if action == "setup":
            setup_zones.update(zones)
        elif action == "teardown":
            teardown_zones.update(zones)

    # Check for mismatches
    setup_only = setup_zones - teardown_zones
    teardown_only = teardown_zones - setup_zones

    for zone in setup_only:
        issues.append(Issue(
            "WARN",
            file_path,
            f"PZ_SETUP_NO_TEARDOWN: Zone '{zone}' has setup but no matching teardown"
        ))

    for zone in teardown_only:
        issues.append(Issue(
            "WARN",
            file_path,
            f"PZ_TEARDOWN_NO_SETUP: Zone '{zone}' has teardown but no matching setup"
        ))


def cross_file_checks(
    family_dir: Path,
    artifacts: Dict[str, Dict[str, Any]],
) -> List[Issue]:
    issues: List[Issue] = []

    # --- Presence checks (required files) ---
    required = ["spec.json", "materials.json", "sop_modules.json", "production.json"]
    for fname in required:
        if fname not in artifacts:
            issues.append(Issue("ERROR", str(family_dir), f"Missing required artifact: {fname}"))
            # If missing, downstream checks will fail anyway.

    if "spec.json" not in artifacts:
        return issues  # can't do much more

    spec_id = artifacts["spec.json"].get("spec_family", {}).get("id")
    if not spec_id:
        issues.append(Issue("ERROR", str(family_dir / "spec.json"), "spec_family.id missing"))
        return issues

    # --- Spec family ID consistency ---
    for fname, data in artifacts.items():
        if fname == "spec.json":
            continue
        sid = data.get("spec_family_id")
        if sid is None:
            # research.json and qa_report.json are optional; if present must have it
            issues.append(Issue("ERROR", str(family_dir / fname), "spec_family_id missing"))
        elif sid != spec_id:
            issues.append(
                Issue(
                    "ERROR",
                    str(family_dir / fname),
                    f"spec_family_id '{sid}' does not match spec.json spec_family.id '{spec_id}'",
                )
            )

    # --- ID set building ---
    # SOP: modules + tasks
    module_ids: set[str] = set()
    task_ids: set[str] = set()

    if "sop_modules.json" in artifacts:
        sop = artifacts["sop_modules.json"]
        for m in sop.get("sop_modules", []):
            mid = m.get("module_id")
            if mid:
                module_ids.add(mid)
            # Collect tasks from within each module
            for t in m.get("tasks", []):
                tid = t.get("task_id")
                if tid:
                    if tid in task_ids:
                        issues.append(Issue("ERROR", str(family_dir / "sop_modules.json"), f"Duplicate task_id: {tid}"))
                    task_ids.add(tid)
        # Also check for legacy top-level tasks array (for backwards compatibility)
        for t in sop.get("tasks", []):
            tid = t.get("task_id")
            mid = t.get("module_id")
            if tid:
                if tid in task_ids:
                    issues.append(Issue("ERROR", str(family_dir / "sop_modules.json"), f"Duplicate task_id: {tid}"))
                task_ids.add(tid)
            if mid and mid not in module_ids:
                issues.append(
                    Issue(
                        "ERROR",
                        str(family_dir / "sop_modules.json"),
                        f"Task references missing module_id '{mid}' (define in sop_modules[]).",
                    )
                )

        # Validate module_task_map alignment (if present)
        for entry in sop.get("module_task_map", []):
            mid = entry.get("module_id")
            if mid and mid not in module_ids:
                issues.append(
                    Issue("ERROR", str(family_dir / "sop_modules.json"), f"module_task_map references unknown module_id {mid}")
                )
            for tid in entry.get("task_ids", []):
                if tid not in task_ids:
                    issues.append(
                        Issue("ERROR", str(family_dir / "sop_modules.json"), f"module_task_map references unknown task_id {tid}")
                    )

        # --- Protection & Continuity Metadata Validation ---
        # Collect all tasks from modules for metadata validation
        all_tasks: List[Dict[str, Any]] = []
        for m in sop.get("sop_modules", []):
            for task in m.get("tasks", []):
                all_tasks.append(task)

        sop_file_path = str(family_dir / "sop_modules.json")

        # Validate protection_metadata and adjacency_metadata on each task
        for task in all_tasks:
            validate_protection_metadata(task, sop_file_path, issues)
            validate_adjacency_metadata(task, sop_file_path, issues)

        # Check protection zone pairing (setup/teardown consistency)
        validate_protection_zone_pairing(all_tasks, sop_file_path, issues)

    # --- Adjacency Declarations Validation (spec.json) ---
    if "spec.json" in artifacts:
        validate_adjacency_declarations(
            artifacts["spec.json"],
            str(family_dir / "spec.json"),
            issues
        )

    # Materials: system ids
    system_ids: set[str] = set()
    if "materials.json" in artifacts:
        mats = artifacts["materials.json"]
        for s in mats.get("material_systems", []):
            sid = s.get("system_id")
            if sid:
                system_ids.add(sid)

        # coverage_profiles system_id exists
        for cp in mats.get("coverage_profiles", []):
            sid = cp.get("system_id")
            if sid and sid not in system_ids:
                issues.append(
                    Issue(
                        "ERROR",
                        str(family_dir / "materials.json"),
                        f"coverage_profiles references unknown system_id '{sid}'",
                    )
                )

    # Spec: item ids and variant references
    item_ids: set[str] = set()
    spec = artifacts["spec.json"]
    for itm in spec.get("paintable_items", []):
        iid = itm.get("item_id")
        if iid:
            if iid in item_ids:
                issues.append(Issue("ERROR", str(family_dir / "spec.json"), f"Duplicate item_id: {iid}"))
            item_ids.add(iid)

    for v in spec.get("variants", []):
        for iid in v.get("included_items", []):
            if iid not in item_ids:
                issues.append(
                    Issue("ERROR", str(family_dir / "spec.json"), f"Variant references unknown included item_id '{iid}'")
                )
        for iid in v.get("excluded_items", []):
            if iid not in item_ids:
                issues.append(
                    Issue("ERROR", str(family_dir / "spec.json"), f"Variant references unknown excluded item_id '{iid}'")
                )

    # Production: task references exist
    if "production.json" in artifacts:
        prod = artifacts["production.json"]
        for tr in prod.get("task_production_rates", []):
            tid = tr.get("task_id")
            if tid and tid not in task_ids:
                issues.append(
                    Issue(
                        "ERROR",
                        str(family_dir / "production.json"),
                        f"task_production_rates references unknown task_id '{tid}' (must exist in sop_modules.json tasks[])",
                    )
                )

        for fac in prod.get("factor_modifiers", []):
            # Skip if fac is not a dict (handles malformed data)
            if not isinstance(fac, dict):
                continue
            for tid in fac.get("applies_to_tasks", []):
                if tid not in task_ids:
                    issues.append(
                        Issue(
                            "ERROR",
                            str(family_dir / "production.json"),
                            f"factor_modifiers applies_to_tasks references unknown task_id '{tid}'",
                        )
                    )

    # Optional consistency checks
    # Warn if QA report is fail but spec status is approved
    if "qa_report.json" in artifacts:
        qa = artifacts["qa_report.json"]
        qa_status = qa.get("status")
        spec_status = spec.get("spec_family", {}).get("status")
        if qa_status == "fail" and spec_status == "approved":
            issues.append(
                Issue(
                    "WARN",
                    str(family_dir / "qa_report.json"),
                    "QA status is 'fail' but spec.json status is 'approved'. Consider downgrading status or resolving issues.",
                )
            )

    return issues


def validate_family_dir(family_dir: Path, schemas: Dict[str, Dict[str, Any]]) -> List[Issue]:
    issues: List[Issue] = []
    artifacts: Dict[str, Dict[str, Any]] = {}

    # Load present artifacts
    for fname in ARTIFACT_FILES:
        fpath = family_dir / fname
        if fpath.exists():
            try:
                artifacts[fname] = load_json(fpath)
            except Exception as e:
                issues.append(Issue("ERROR", str(fpath), str(e)))

    # Schema validation for each present artifact with known schema
    for fname, data in artifacts.items():
        schema_name = SCHEMA_MAP.get(fname)
        if not schema_name:
            continue
        schema = schemas[schema_name]
        issues.extend(validate_against_schema(data, schema, family_dir / fname))

    # Cross-file checks
    issues.extend(cross_file_checks(family_dir, artifacts))

    return issues


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(
        description="Validate PaintFactor spec artifacts against JSON schemas"
    )
    parser.add_argument(
        "path",
        help="Path to specs root directory or a specific spec family directory"
    )
    parser.add_argument(
        "--skip-templates",
        action="store_true",
        help="Skip validation of _templates directory (templates use placeholder values)"
    )

    args = parser.parse_args()

    target = Path(args.path).resolve()
    if not target.exists():
        print(f"ERROR: Path does not exist: {target}", file=sys.stderr)
        return 1

    # Schema directory expected at: <repo>/specs/_schemas/
    # If user points directly to specs or a family, infer repo root.
    # Common cases:
    # - target = .../specs
    # - target = .../specs/SF_...
    # - target = repo root (rare)
    if target.name == "_schemas":
        schema_dir = target
    else:
        # Try resolve schema dir relative to provided target
        if target.name == "specs":
            schema_dir = target / "_schemas"
            family_root = target
        elif (target / "spec.json").exists():
            # family folder
            family_root = target
            schema_dir = target.parent / "_schemas"  # .../specs/_schemas
        else:
            # fallback: if they passed repo root, look for specs/_schemas
            family_root = target / "specs"
            schema_dir = target / "specs" / "_schemas"

    if not schema_dir.exists():
        print(f"ERROR: Could not find schema directory at: {schema_dir}", file=sys.stderr)
        return 1

    try:
        schemas = load_schemas(schema_dir)
    except Exception as e:
        print(f"ERROR loading schemas: {e}", file=sys.stderr)
        return 1

    # Determine family dirs
    if (target / "spec.json").exists():
        family_dirs = [target]
    else:
        family_dirs = find_spec_family_dirs(family_root if 'family_root' in locals() else target)

    # Filter out templates if --skip-templates flag is set
    if args.skip_templates:
        family_dirs = [d for d in family_dirs if "_templates" not in d.name]

    if not family_dirs:
        print(f"No spec families found under: {target}", file=sys.stderr)
        return 1

    all_issues: List[Issue] = []
    for fam in family_dirs:
        fam_issues = validate_family_dir(fam, schemas)
        all_issues.extend(fam_issues)

    errors = [i for i in all_issues if i.level == "ERROR"]
    warns = [i for i in all_issues if i.level == "WARN"]

    # Print report
    print("=" * 80)
    print("PaintFactor Spec Validation Report")
    print("=" * 80)
    print(f"Families checked: {len(family_dirs)}")
    if args.skip_templates:
        print("(Templates skipped)")
    print(f"Errors: {len(errors)} | Warnings: {len(warns)}")
    print("-" * 80)

    for issue in all_issues:
        prefix = "[X]" if issue.level == "ERROR" else "[!]"
        print(f"{prefix} [{issue.level}] {issue.path}")
        print(f"    {issue.message}")

    print("-" * 80)
    if errors:
        print("RESULT: FAIL (fix errors)")
        return 1

    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
