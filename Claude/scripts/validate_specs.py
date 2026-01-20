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
    if len(sys.argv) < 2:
        print("Usage: python scripts/validate_specs.py <specs_root_or_family_dir>", file=sys.stderr)
        return 1

    target = Path(sys.argv[1]).resolve()
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
