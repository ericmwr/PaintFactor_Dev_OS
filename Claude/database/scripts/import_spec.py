#!/usr/bin/env python3
"""
PaintFactor Spec Importer
Reads spec family artifact files and imports them into the PaintFactor SQLite database.

Usage:
    python import_spec.py <spec_family_path> [--db <database_path>] [--reimport]

Examples:
    python import_spec.py specs/SF_DRYWALL_WALL_NC_PRIME_v1/
    python import_spec.py specs/SF_TRIM_NC_PAINT_v1/ --db database/paintfactor.db
    python import_spec.py specs/SF_CLOSET_SHELF_NC_v1/ --reimport
"""

import argparse
import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


# ============================================================
# Configuration
# ============================================================

REQUIRED_ARTIFACTS = ["spec.json", "materials.json", "sop_modules.json", "production.json", "qa_report.json"]
ARTIFACT_TYPE_MAP = {
    "spec.json": "spec",
    "materials.json": "materials",
    "sop_modules.json": "sop_modules",
    "production.json": "production",
    "qa_report.json": "qa_report",
}
DEFAULT_DB_PATH = "database/paintfactor.db"


# ============================================================
# Helpers
# ============================================================

def load_json(path):
    """Load and parse a JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def json_str(obj):
    """Convert a Python object to a compact JSON string for TEXT storage."""
    if obj is None:
        return None
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def to_int_bool(val):
    """Convert Python bool or truthy value to SQLite integer (0/1)."""
    if val is None:
        return None
    return 1 if val else 0


def safe_get(obj, *keys, default=None):
    """Safely traverse nested dicts/lists."""
    current = obj
    for key in keys:
        if isinstance(current, dict):
            current = current.get(key, default)
        elif isinstance(current, list) and isinstance(key, int) and key < len(current):
            current = current[key]
        else:
            return default
        if current is None:
            return default
    return current


# ============================================================
# Import Report
# ============================================================

class ImportReport:
    def __init__(self, spec_family_id, version):
        self.spec_family_id = spec_family_id
        self.version = version
        self.start_time = time.time()
        self.rows = {}
        self.warnings = []
        self.status = "success"
        self.error = None

    def add_rows(self, table, count):
        self.rows[table] = self.rows.get(table, 0) + count

    def add_warning(self, msg):
        self.warnings.append(msg)

    def fail(self, error_msg):
        self.status = "failed"
        self.error = error_msg

    def to_dict(self):
        return {
            "spec_family_id": self.spec_family_id,
            "version": self.version,
            "imported_at": datetime.now(timezone.utc).isoformat(),
            "status": self.status,
            "rows_inserted": self.rows,
            "total_rows": sum(self.rows.values()),
            "warnings": self.warnings,
            "error": self.error,
            "duration_seconds": round(time.time() - self.start_time, 3),
        }

    def save(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        path = os.path.join(output_dir, "import_report.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        return path


# ============================================================
# Delete existing data for re-import
# ============================================================

def delete_spec_family(conn, sf_id):
    """Delete all normalized data for a spec family. Raw artifacts preserved."""
    # With ON DELETE CASCADE, deleting from spec_families cascades to all children.
    # But we also need to clean up qa_issues (linked to qa_reports, not directly to spec_families).
    # CASCADE handles this since qa_issues FK → qa_reports FK → spec_families.
    conn.execute("DELETE FROM spec_families WHERE id = ?", (sf_id,))
    # import_log and spec_artifacts_raw intentionally NOT deleted (audit trail)
    print(f"  Deleted existing data for {sf_id}")


# ============================================================
# Import: Raw JSON storage
# ============================================================

def import_raw(conn, sf_id, version, artifacts, report):
    """Store raw JSON for all artifacts."""
    count = 0
    for filename, artifact_type in ARTIFACT_TYPE_MAP.items():
        raw_json = json.dumps(artifacts[filename], ensure_ascii=False, indent=2)
        # Get status from the artifact if available
        status = None
        data = artifacts[filename]
        if isinstance(data, dict):
            status = safe_get(data, "spec_family", "status") or safe_get(data, "status")

        conn.execute(
            """INSERT OR REPLACE INTO spec_artifacts_raw
               (spec_family_id, artifact_type, version, status, json_content)
               VALUES (?, ?, ?, ?, ?)""",
            (sf_id, artifact_type, version, status, raw_json),
        )
        count += 1
    report.add_rows("spec_artifacts_raw", count)


# ============================================================
# Import: spec.json
# ============================================================

def import_spec_json(conn, spec, sf_id, report):
    """Decompose spec.json into normalized tables."""

    sf = spec["spec_family"]

    # spec_families
    conn.execute(
        """INSERT INTO spec_families (id, name, description, domain, version, status, review_required, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (sf["id"], sf["name"], sf.get("description"), sf["domain"],
         sf["version"], sf["status"], to_int_bool(sf.get("review_required", True)), "SpecFactory"),
    )
    report.add_rows("spec_families", 1)

    # configuration_dimensions
    dims = spec.get("configuration_dimensions", [])
    for i, dim in enumerate(dims):
        conn.execute(
            """INSERT INTO spec_configuration_dimensions
               (spec_family_id, dimension_id, description, allowed_values, default_value, notes, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, dim["dimension_id"], dim.get("description"),
             json_str(dim.get("values", [])), dim.get("default"),
             dim.get("notes"), i),
        )
    report.add_rows("spec_configuration_dimensions", len(dims))

    # paintable_items
    items = spec.get("paintable_items", [])
    for item in items:
        conn.execute(
            """INSERT INTO spec_paintable_item_types
               (id, spec_family_id, name, unit_of_measure, counting_rules, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (item["item_id"], sf_id, item["name"], item["unit_of_measure"],
             item.get("counting_rules"), item.get("notes")),
        )
    report.add_rows("spec_paintable_item_types", len(items))

    # variants + variant_item_inclusions
    variants = spec.get("variants", [])
    inclusion_count = 0
    for var in variants:
        conn.execute(
            """INSERT INTO spec_variants (id, spec_family_id, applies_when, notes)
               VALUES (?, ?, ?, ?)""",
            (var["variant_id"], sf_id, json_str(var.get("applies_when")), var.get("notes")),
        )
        for item_id in var.get("included_items", []):
            conn.execute(
                """INSERT INTO spec_variant_item_inclusions
                   (spec_family_id, variant_id, item_id, is_included) VALUES (?, ?, ?, 1)""",
                (sf_id, var["variant_id"], item_id),
            )
            inclusion_count += 1
        for item_id in var.get("excluded_items", []):
            conn.execute(
                """INSERT INTO spec_variant_item_inclusions
                   (spec_family_id, variant_id, item_id, is_included) VALUES (?, ?, ?, 0)""",
                (sf_id, var["variant_id"], item_id),
            )
            inclusion_count += 1
    report.add_rows("spec_variants", len(variants))
    report.add_rows("spec_variant_item_inclusions", inclusion_count)

    # scope_boundaries
    scope = spec.get("scope_boundaries", {})
    boundary_count = 0
    for inc in scope.get("includes", []):
        desc = inc if isinstance(inc, str) else inc.get("item", str(inc))
        conn.execute(
            """INSERT INTO spec_scope_boundaries (spec_family_id, boundary_type, description)
               VALUES (?, 'include', ?)""",
            (sf_id, desc),
        )
        boundary_count += 1
    for exc in scope.get("excludes", []):
        if isinstance(exc, str):
            desc, route = exc, None
        elif isinstance(exc, dict):
            desc = exc.get("item", str(exc))
            route = exc.get("route_to")
        else:
            desc, route = str(exc), None
        conn.execute(
            """INSERT INTO spec_scope_boundaries (spec_family_id, boundary_type, description, route_to)
               VALUES (?, 'exclude', ?, ?)""",
            (sf_id, desc, route),
        )
        boundary_count += 1
    report.add_rows("spec_scope_boundaries", boundary_count)

    # required_paintscope_inputs
    inputs = spec.get("required_paintscope_inputs", [])
    for inp in inputs:
        conn.execute(
            """INSERT INTO spec_required_inputs
               (spec_family_id, input_name, paintscope_key, uom, is_required, required_when, description)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, inp["input_name"], inp["paintscope_key"], inp["uom"],
             to_int_bool(inp.get("required")),
             json_str(inp.get("required_when")),
             inp.get("description")),
        )
    report.add_rows("spec_required_inputs", len(inputs))

    # protection_zones_required
    zones = spec.get("protection_zones_required", [])
    for z in zones:
        condition = z.get("condition")
        if isinstance(condition, dict):
            condition = json_str(condition)
        conn.execute(
            """INSERT INTO spec_protection_zones
               (spec_family_id, zone_id, condition, protection_level,
                upgrades_to_zone, upgrades_to_level, upgrade_condition, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, z["zone_id"], condition, z["protection_level"],
             z.get("upgrades_to_zone"), z.get("upgrades_to_level"),
             z.get("upgrade_condition"), z.get("notes")),
        )
    report.add_rows("spec_protection_zones", len(zones))

    # adjacency_declarations
    adj = spec.get("adjacency_declarations", {})
    primary = adj.get("primary_surface", "")
    adj_surfaces = adj.get("adjacent_surfaces", [])
    for a in adj_surfaces:
        conn.execute(
            """INSERT INTO spec_adjacency_declarations
               (spec_family_id, primary_surface, adjacent_surface_id, edge_type,
                typical_relationship, continuity_rate_modifier, affected_tasks, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, primary, a["surface_id"], a["edge_type"],
             a.get("typical_relationship"), a.get("continuity_rate_modifier"),
             json_str(a.get("affected_tasks")), a.get("notes")),
        )
    report.add_rows("spec_adjacency_declarations", len(adj_surfaces))

    # state_declarations
    state = spec.get("state_declarations", {})
    if state:
        conn.execute(
            """INSERT INTO spec_state_declarations
               (spec_family_id, primary_surface, valid_input_states,
                output_state, output_state_varies_by, output_state_map, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, state.get("primary_surface", ""),
             json_str(state.get("valid_input_states")),
             state.get("output_state"),
             state.get("output_state_varies_by"),
             json_str(state.get("output_state_map")),
             state.get("notes")),
        )
        report.add_rows("spec_state_declarations", 1)

    # change_log
    changes = spec.get("change_log", [])
    for ch in changes:
        conn.execute(
            """INSERT INTO spec_change_log
               (spec_family_id, version, date, author, changes)
               VALUES (?, ?, ?, ?, ?)""",
            (sf_id, ch.get("version", ""), ch.get("date", ""),
             ch.get("author", "unknown"), ch.get("changes") or ch.get("summary", "")),
        )
    report.add_rows("spec_change_log", len(changes))


# ============================================================
# Import: materials.json
# ============================================================

def import_materials_json(conn, materials, sf_id, report):
    """Decompose materials.json into normalized tables."""

    # material_systems
    systems = materials.get("material_systems", [])
    for sys in systems:
        sys_id = sys.get("system_id") or sys.get("id")
        conn.execute(
            """INSERT INTO material_systems
               (id, spec_family_id, name, applies_when, coat_sequence,
                compatible_substrates, cleanup_class, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sys_id, sf_id, sys.get("name", ""),
             json_str(sys.get("applies_when") or sys.get("quality_tier")),
             json_str(sys.get("coat_sequence")),
             json_str(sys.get("compatible_substrates")),
             sys.get("cleanup_class"),
             json_str(sys.get("notes")) if isinstance(sys.get("notes"), dict) else sys.get("notes")),
        )
    report.add_rows("material_systems", len(systems))

    # coverage_profiles
    profiles = materials.get("coverage_profiles", [])
    for p in profiles:
        p_id = p.get("coverage_id") or p.get("id")
        conn.execute(
            """INSERT INTO material_coverage_profiles
               (id, spec_family_id, product_role, spread_rate_sf_per_gal, loss_factor_pct, profile_notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (p_id, sf_id, p.get("product_role"),
             p.get("spread_rate_sf_per_gallon"), p.get("loss_factor_percent"),
             p.get("notes")),
        )
    report.add_rows("material_coverage_profiles", len(profiles))

    # consumables
    consumables = materials.get("consumables", [])
    for c in consumables:
        c_id = c.get("consumable_id") or c.get("id")
        conn.execute(
            """INSERT INTO material_consumables
               (id, spec_family_id, name, consumable_category, recommended_class,
                unit, usage_rate, quality_sensitivity, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (c_id, sf_id, c.get("name", ""),
             c.get("consumable_category"), c.get("recommended_class"),
             c.get("unit"), c.get("usage_rate"),
             c.get("quality_sensitivity"), c.get("notes")),
        )
    report.add_rows("material_consumables", len(consumables))

    # compatibility_rules
    rules = materials.get("compatibility_rules", [])
    for r in rules:
        conn.execute(
            """INSERT INTO material_compatibility_rules
               (spec_family_id, rule, risk, mitigation)
               VALUES (?, ?, ?, ?)""",
            (sf_id, r.get("rule", ""), r.get("risk"), r.get("mitigation")),
        )
    report.add_rows("material_compatibility_rules", len(rules))


# ============================================================
# Import: sop_modules.json
# ============================================================

def import_sop_json(conn, sop, sf_id, report):
    """Decompose sop_modules.json into normalized tables."""

    modules = sop.get("sop_modules", [])
    task_count = 0
    for i, mod in enumerate(modules):
        conn.execute(
            """INSERT INTO sop_modules
               (id, spec_family_id, name, phase, description, applies_when,
                required_inputs, run_rule, run_count_formula, sequence_notes, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (mod["module_id"], sf_id, mod["name"], mod["phase"],
             mod.get("description"),
             json_str(mod.get("applies_when")),
             json_str(mod.get("required_inputs")),
             mod.get("run_rule"), mod.get("run_count_formula"),
             mod.get("sequence_notes"), i),
        )

        # Tasks within this module
        tasks = mod.get("tasks", [])
        for j, task in enumerate(tasks):
            conn.execute(
                """INSERT INTO sop_tasks
                   (id, spec_family_id, module_id, name, task_classification,
                    task_type, skill_level, description, tools_required,
                    applies_when, appears_in_tiers, quality_notes,
                    protection_metadata, adjacency_metadata, notes, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (task["task_id"], sf_id, mod["module_id"], task["name"],
                 task.get("task_classification"), task.get("task_type"),
                 task.get("skill_level"), task.get("description"),
                 json_str(task.get("tools_required")),
                 json_str(task.get("applies_when")),
                 json_str(task.get("appears_in_tiers")),
                 json_str(task.get("quality_notes")),
                 json_str(task.get("protection_metadata")),
                 json_str(task.get("adjacency_metadata")),
                 task.get("notes"), j),
            )
            task_count += 1

    report.add_rows("sop_modules", len(modules))
    report.add_rows("sop_tasks", task_count)


# ============================================================
# Import: production.json
# ============================================================

def import_production_json(conn, production, sf_id, report):
    """Decompose production.json into normalized tables."""

    # task_production_rates
    rates = production.get("task_production_rates", [])
    for r in rates:
        # rates_by_tier can be structured various ways — store as JSON
        rates_data = r.get("rates_by_tier") or r.get("rates") or r.get("tiers")
        conn.execute(
            """INSERT INTO task_production_rates
               (spec_family_id, task_id, unit_of_measure, required_input_key,
                paintscope_key, rates_by_tier, crew_size, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, r["task_id"], r.get("unit_of_measure", ""),
             r.get("required_input_key") or r.get("input_name"),
             r.get("paintscope_key"),
             json_str(rates_data),
             r.get("crew_size"),
             r.get("notes")),
        )
    report.add_rows("task_production_rates", len(rates))

    # factor_modifiers + factor_task_applicability
    factors = production.get("factor_modifiers", [])
    applicability_count = 0
    for fac in factors:
        fac_id = fac.get("factor_id") or fac.get("id")
        conn.execute(
            """INSERT INTO factor_modifiers
               (id, spec_family_id, name, description, modifier_type,
                value, value_min, value_max, condition, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (fac_id, sf_id, fac.get("name"), fac.get("description"),
             fac.get("modifier_type"), fac.get("value"),
             fac.get("value_min"), fac.get("value_max"),
             json_str(fac.get("condition")), fac.get("notes")),
        )
        for task_id in fac.get("applies_to_tasks", []):
            conn.execute(
                """INSERT INTO factor_task_applicability
                   (spec_family_id, factor_id, task_id) VALUES (?, ?, ?)""",
                (sf_id, fac_id, task_id),
            )
            applicability_count += 1
    report.add_rows("factor_modifiers", len(factors))
    report.add_rows("factor_task_applicability", applicability_count)

    # quality_tier_effects
    effects = production.get("quality_tier_effects", [])
    for eff in effects:
        conn.execute(
            """INSERT INTO quality_tier_effects
               (spec_family_id, quality_tier, description, mechanism, effect_details, notes)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (sf_id, eff.get("quality_tier", ""),
             eff.get("description"), eff.get("mechanism"),
             json_str(eff.get("details") or eff.get("effects")),
             eff.get("notes")),
        )
    report.add_rows("quality_tier_effects", len(effects))


# ============================================================
# Import: qa_report.json
# ============================================================

def import_qa_json(conn, qa, sf_id, report):
    """Decompose qa_report.json into normalized tables."""

    meta = qa.get("qa_report_metadata", {})
    conn.execute(
        """INSERT INTO spec_qa_reports
           (spec_family_id, version, reviewed_by, review_date, status, summary, gate_results)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (sf_id, meta.get("spec_version", ""),
         meta.get("critic_agent"), meta.get("review_date"),
         qa.get("status", "fail"),
         qa.get("summary"),
         json_str(qa.get("gate_results"))),
    )
    qa_report_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    report.add_rows("spec_qa_reports", 1)

    # Issues (if present)
    issues = qa.get("issues", [])
    for iss in issues:
        conn.execute(
            """INSERT INTO spec_qa_issues
               (qa_report_id, issue_id, severity, category, description,
                suggested_fix, recommended_agent)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (qa_report_id, iss.get("issue_id"), iss.get("severity", "minor"),
             iss.get("category") or iss.get("area"),
             iss.get("description", ""),
             iss.get("suggested_fix"), iss.get("recommended_agent")),
        )
    report.add_rows("spec_qa_issues", len(issues))


# ============================================================
# Main import function
# ============================================================

def import_spec_family(spec_path, db_path, reimport=False):
    """Import a spec family into the database."""

    spec_path = Path(spec_path).resolve()
    print(f"Importing from: {spec_path}")

    # --- Validate prerequisites ---
    missing = []
    for filename in REQUIRED_ARTIFACTS:
        if not (spec_path / filename).exists():
            missing.append(filename)
    if missing:
        print(f"ERROR: Missing artifact files: {', '.join(missing)}")
        return False

    # --- Load all artifacts ---
    artifacts = {}
    for filename in REQUIRED_ARTIFACTS:
        try:
            artifacts[filename] = load_json(spec_path / filename)
        except json.JSONDecodeError as e:
            print(f"ERROR: Failed to parse {filename}: {e}")
            return False

    spec = artifacts["spec.json"]
    sf_id = spec["spec_family"]["id"]
    version = spec["spec_family"]["version"]
    print(f"  Spec Family: {sf_id} v{version}")

    report = ImportReport(sf_id, version)

    # --- Connect to database ---
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")

    try:
        # Check if already imported
        existing = conn.execute(
            "SELECT id FROM spec_families WHERE id = ?", (sf_id,)
        ).fetchone()

        if existing and not reimport:
            print(f"  WARNING: {sf_id} already exists in database. Use --reimport to replace.")
            report.fail(f"{sf_id} already exists. Use --reimport to replace.")
            return False

        conn.execute("BEGIN TRANSACTION")

        # Delete existing data if re-importing
        if existing and reimport:
            delete_spec_family(conn, sf_id)

        # Phase 1: Raw JSON storage
        print("  Storing raw JSON...")
        import_raw(conn, sf_id, version, artifacts, report)

        # Phase 2: Normalize spec.json
        print("  Importing spec.json...")
        import_spec_json(conn, spec, sf_id, report)

        # Phase 3: Normalize materials.json
        print("  Importing materials.json...")
        import_materials_json(conn, artifacts["materials.json"], sf_id, report)

        # Phase 4: Normalize sop_modules.json
        print("  Importing sop_modules.json...")
        import_sop_json(conn, artifacts["sop_modules.json"], sf_id, report)

        # Phase 5: Normalize production.json
        print("  Importing production.json...")
        import_production_json(conn, artifacts["production.json"], sf_id, report)

        # Phase 6: Normalize qa_report.json
        print("  Importing qa_report.json...")
        import_qa_json(conn, artifacts["qa_report.json"], sf_id, report)

        # Log the import
        conn.execute(
            """INSERT INTO import_log
               (spec_family_id, version, import_status, rows_inserted, imported_at)
               VALUES (?, ?, 'success', ?, ?)""",
            (sf_id, version, json_str(report.rows),
             datetime.now(timezone.utc).isoformat()),
        )

        conn.execute("COMMIT")
        print(f"\n  SUCCESS: {report.to_dict()['total_rows']} rows inserted across {len(report.rows)} tables")

    except Exception as e:
        conn.execute("ROLLBACK")
        report.fail(str(e))
        print(f"\n  FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        conn.close()

    # Save import report
    report_dir = os.path.join(os.path.dirname(db_path), "imports", sf_id)
    report_path = report.save(report_dir)
    print(f"  Report saved: {report_path}")

    if report.warnings:
        print(f"  Warnings: {len(report.warnings)}")
        for w in report.warnings:
            print(f"    - {w}")

    return report.status == "success"


# ============================================================
# CLI
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="PaintFactor Spec Importer")
    parser.add_argument("spec_path", help="Path to spec family directory (e.g., specs/SF_TRIM_NC_PAINT_v1/)")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help=f"Database path (default: {DEFAULT_DB_PATH})")
    parser.add_argument("--reimport", action="store_true", help="Delete and re-import if already exists")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"ERROR: Database not found at {args.db}")
        print("Run create_tables.sql first to initialize the database.")
        sys.exit(1)

    success = import_spec_family(args.spec_path, args.db, reimport=args.reimport)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
