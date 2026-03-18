#!/usr/bin/env python3
"""
PaintFactor Spec Importer
Reads spec family artifact files and imports them into the PaintFactor SQLite database.
Aligned with SQLite Schema Contract v1.1.0 and create_tables.sql.

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


def safe_text(val):
    """Coerce any value to a SQLite-bindable type.
    Dicts and lists → JSON string. Everything else passes through."""
    if isinstance(val, (dict, list)):
        return json_str(val)
    return val


# Phase normalization: map non-canonical phase values to canonical ones
PHASE_ALIASES = {
    "protection": "setup",
    "protect": "setup",
}


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
    """Delete all normalized data for a spec family via CASCADE.
    Raw artifacts and import_log are preserved (no FK CASCADE)."""
    conn.execute("DELETE FROM spec_families WHERE id = ?", (sf_id,))
    print(f"  Deleted existing data for {sf_id}")


# ============================================================
# Import: Raw JSON storage
# ============================================================

def import_raw(conn, sf_id, version, artifacts, report):
    """Store raw JSON for all 5 artifacts in spec_artifacts_raw."""
    count = 0
    for filename, artifact_type in ARTIFACT_TYPE_MAP.items():
        raw_json = json.dumps(artifacts[filename], ensure_ascii=False, indent=2)
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

    sf = spec.get("spec_family") or spec.get("spec_metadata")
    if sf is None:
        sf = spec

    # --- spec_families ---
    conn.execute(
        """INSERT INTO spec_families
           (id, name, description, context, domain, version, status, review_required, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (sf.get("id") or sf.get("spec_family_id"), sf["name"], sf.get("description"), sf.get("context") or sf.get("context_prefix"),
         sf["domain"], sf["version"], sf.get("status", "draft"),
         to_int_bool(sf.get("review_required", True)), "SpecFactory"),
    )
    report.add_rows("spec_families", 1)

    # --- spec_configuration_dimensions ---
    dims = spec.get("configuration_dimensions") or spec.get("config_dimensions", [])
    for i, dim in enumerate(dims):
        dim_id = dim.get("dimension_id") or dim.get("dimension")
        conn.execute(
            """INSERT INTO spec_configuration_dimensions
               (spec_family_id, dimension_id, description, allowed_values, default_value,
                prohibited, notes, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, dim_id, dim.get("description"),
             json_str(dim.get("values", [])), dim.get("default"),
             json_str(dim.get("prohibited")),
             dim.get("notes"), i),
        )
    report.add_rows("spec_configuration_dimensions", len(dims))

    # --- spec_paintable_item_types ---
    items = spec.get("paintable_items", [])
    for item in items:
        cond_on = item.get("conditional_on") or item.get("condition")
        conn.execute(
            """INSERT INTO spec_paintable_item_types
               (id, spec_family_id, name, unit_of_measure, counting_rules,
                conditional, conditional_on, surface_ref, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (item["item_id"], sf_id, item["name"], item["unit_of_measure"],
             item.get("counting_rules"), to_int_bool(item.get("conditional")),
             json_str(cond_on) if isinstance(cond_on, (dict, list)) else cond_on,
             item.get("surface_ref"),
             item.get("notes")),
        )
    report.add_rows("spec_paintable_item_types", len(items))

    # --- spec_variants + spec_variant_item_inclusions ---
    variants = spec.get("variants", [])
    inclusion_count = 0
    for var in variants:
        # Coat count dual-pattern: flat keys (interior) or nested object (exterior)
        coats_primer = var.get("coats_primer")
        coats_finish = var.get("coats_finish")
        if coats_primer is None and "coats" in var and isinstance(var["coats"], dict):
            coats_primer = var["coats"].get("prime")
            coats_finish = var["coats"].get("finish")

        conn.execute(
            """INSERT INTO spec_variants
               (id, spec_family_id, applies_when, coats_primer, coats_finish,
                round_id, protection_zones, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (var["variant_id"], sf_id, json_str(var.get("applies_when")),
             coats_primer, coats_finish,
             var.get("round_id"), json_str(var.get("protection_zones")),
             var.get("notes")),
        )

        # Item inclusion tri-pattern: included_items (interior), active_items (exterior), excluded_items
        included = var.get("included_items") or var.get("active_items", [])
        for item_id in included:
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

    # --- spec_scope_boundaries ---
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

    # --- spec_required_inputs ---
    inputs = spec.get("required_paintscope_inputs", [])
    for inp in inputs:
        conn.execute(
            """INSERT INTO spec_required_inputs
               (spec_family_id, input_name, paintscope_key, uom, is_required,
                required_when, status, description)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, inp["input_name"], inp["paintscope_key"], inp["uom"],
             to_int_bool(inp.get("required")),
             json_str(inp.get("required_when")),
             inp.get("status"),
             inp.get("description")),
        )
    report.add_rows("spec_required_inputs", len(inputs))

    # --- spec_protection_zones ---
    zones = spec.get("protection_zones_required", [])
    for z in zones:
        condition = z.get("condition")
        if isinstance(condition, dict):
            condition = json_str(condition)

        # Protection zone field mapping: interior vs exterior key names
        upgrades_to_level = z.get("upgrades_to_level") or z.get("upgrade_level")
        upgrade_condition = z.get("upgrade_condition") or z.get("upgrade_when")
        if isinstance(upgrade_condition, dict):
            upgrade_condition = json_str(upgrade_condition)

        conn.execute(
            """INSERT INTO spec_protection_zones
               (spec_family_id, zone_id, condition, protection_level,
                upgrades_to_zone, upgrades_to_level, upgrade_condition, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, z["zone_id"], condition, z["protection_level"],
             z.get("upgrades_to_zone"), upgrades_to_level,
             safe_text(upgrade_condition), safe_text(z.get("notes"))),
        )
    report.add_rows("spec_protection_zones", len(zones))

    # --- spec_adjacency_declarations ---
    # Can be a single object or an array of objects
    adj_raw = spec.get("adjacency_declarations")
    if adj_raw:
        adj_list = adj_raw if isinstance(adj_raw, list) else [adj_raw]
        adj_count = 0
        for adj_obj in adj_list:
            primary = adj_obj.get("primary_surface", "")
            for a in adj_obj.get("adjacent_surfaces", []):
                conn.execute(
                    """INSERT INTO spec_adjacency_declarations
                       (spec_family_id, primary_surface, adjacent_surface_id, edge_type,
                        typical_relationship, continuity_rate_modifier, affected_tasks, notes)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (sf_id, primary, a["surface_id"], a["edge_type"],
                     a.get("typical_relationship"), a.get("continuity_rate_modifier"),
                     json_str(a.get("affected_tasks")), a.get("notes")),
                )
                adj_count += 1
        report.add_rows("spec_adjacency_declarations", adj_count)

    # --- spec_state_declarations ---
    # Dual-key: interior uses "state_declarations", exterior uses "substrate_state_rules"
    # Can be a single object or an array
    state_raw = spec.get("state_declarations") or spec.get("substrate_state_rules")
    if state_raw:
        # Handle alternate dict format: {input_states: [...], output_states: [...]}
        if isinstance(state_raw, dict) and "input_states" in state_raw:
            synth = {
                "primary_surface": "",
                "valid_input_states": [s.get("state_id") for s in state_raw.get("input_states", [])],
                "output_state": {
                    "state": json_str([s.get("state_id") for s in state_raw.get("output_states", [])]),
                }
            }
            state_list = [synth]
        else:
            state_list = state_raw if isinstance(state_raw, list) else [state_raw]
        for state in state_list:
            # Handle primary_surface vs primary_surfaces
            primary = state.get("primary_surface") or ""
            if not primary and "primary_surfaces" in state:
                ps = state["primary_surfaces"]
                primary = ps[0] if isinstance(ps, list) and ps else str(ps)

            # Output state can be simple string or complex object
            output_state_obj = state.get("output_state", {})
            if isinstance(output_state_obj, dict):
                out_state = output_state_obj.get("state")
                out_varies = output_state_obj.get("varies_by")
                out_map = json_str(output_state_obj.get("state_map"))
                out_notes = output_state_obj.get("notes")
            elif isinstance(output_state_obj, str):
                out_state = output_state_obj
                out_varies, out_map, out_notes = None, None, None
            else:
                out_state, out_varies, out_map, out_notes = None, None, None, None

            # Exterior primer_routing (per-substrate primer system routing)
            primer_routing = state.get("primer_routing")

            conn.execute(
                """INSERT INTO spec_state_declarations
                   (spec_family_id, primary_surface, valid_input_states,
                    output_state, output_state_varies_by, output_state_map,
                    primer_routing, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (sf_id, primary,
                 json_str(state.get("valid_input_states")),
                 out_state, out_varies, out_map,
                 json_str(primer_routing),
                 out_notes or state.get("notes")),
            )
        report.add_rows("spec_state_declarations", len(state_list))

    # --- spec_change_log ---
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

    # --- material_systems + material_system_products ---
    systems = materials.get("material_systems", [])
    product_count = 0
    for sys_obj in systems:
        sys_id = sys_obj.get("system_id") or sys_obj.get("id")

        # applies_when can also be derived from quality_tier at top level
        applies_when = sys_obj.get("applies_when")
        if not applies_when and "quality_tier" in sys_obj:
            qt = sys_obj["quality_tier"]
            applies_when = {"quality_tier": qt if isinstance(qt, list) else [qt]}

        conn.execute(
            """INSERT INTO material_systems
               (id, spec_family_id, name, description, applies_when, allowed_sheens,
                product_role, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sys_id, sf_id, sys_obj.get("name", ""), sys_obj.get("description"),
             json_str(applies_when),
             json_str(sys_obj.get("allowed_sheens")),
             sys_obj.get("product_role"),
             sys_obj.get("notes")),
        )

        # Tri-pattern product handling
        if "products" in sys_obj and isinstance(sys_obj["products"], list):
            # Drywall pattern: products[] array
            for prod in sys_obj["products"]:
                conn.execute(
                    """INSERT INTO material_system_products
                       (spec_family_id, system_id, product_role, product_type,
                        example_products, sheen, coats_required, notes)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                    (sf_id, sys_id, prod.get("product_role"), prod.get("product_type"),
                     json_str(prod.get("example_products")), prod.get("sheen"),
                     json_str(prod.get("coats_required")) if isinstance(prod.get("coats_required"), dict) else (prod.get("coats_required") or prod.get("default_coats")), prod.get("notes")),
                )
                product_count += 1
        elif any(sys_obj.get(k) and isinstance(sys_obj.get(k), dict) for k in ("primer", "finish", "sealer", "stain", "clear")):
            # Cabinet pattern: primer / finish as direct objects
            for role_key in ("primer", "finish", "sealer", "stain", "clear"):
                role_obj = sys_obj.get(role_key)
                if role_obj and isinstance(role_obj, dict):
                    cov_range = role_obj.get("coverage_range") or []
                    conn.execute(
                        """INSERT INTO material_system_products
                           (spec_family_id, system_id, product_role, product_type,
                            example_products, coats_required, coverage_sf_per_gallon,
                            coverage_range_low, coverage_range_high, notes)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (sf_id, sys_id, role_key, role_obj.get("type"),
                         json_str(role_obj.get("products")),
                         safe_text(role_obj.get("coats")),
                         role_obj.get("coverage_sf_per_gallon"),
                         cov_range[0] if len(cov_range) > 0 else None,
                         cov_range[1] if len(cov_range) > 1 else None,
                         safe_text(role_obj.get("notes"))),
                    )
                    product_count += 1
        elif sys_obj.get("product_role") and isinstance(sys_obj.get("product_role"), str):
            # Exterior flat pattern: system-level product_role, coverage, coats
            cov_range = sys_obj.get("coverage_range") or []
            conn.execute(
                """INSERT INTO material_system_products
                   (spec_family_id, system_id, product_role, product_type,
                    example_products, coats_required, coverage_sf_per_gallon,
                    coverage_range_low, coverage_range_high, notes)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (sf_id, sys_id, sys_obj.get("product_role"), sys_obj.get("product_type"),
                 json_str(sys_obj.get("example_products")),
                 sys_obj.get("coats"),
                 sys_obj.get("coverage_sf_per_gallon"),
                 cov_range[0] if len(cov_range) > 0 else None,
                 cov_range[1] if len(cov_range) > 1 else None,
                 sys_obj.get("notes")),
            )
            product_count += 1

    report.add_rows("material_systems", len(systems))
    report.add_rows("material_system_products", product_count)

    # --- material_coverage_profiles ---
    profiles = materials.get("coverage_profiles", [])
    for p in profiles:
        p_id = p.get("profile_id") or p.get("coverage_id") or p.get("id")

        # Exterior coverage patterns: coverage_by_state / coverage_by_system fold into coverage_by_item
        coverage_by_item = p.get("coverage_by_item")
        if not coverage_by_item:
            coverage_by_item = p.get("coverage_by_state") or p.get("coverage_by_system")

        conn.execute(
            """INSERT INTO material_coverage_profiles
               (id, spec_family_id, material_system, product_role, surface_texture,
                drywall_finish_level, coverage_model, coverage_sf_per_gallon,
                coverage_range_low, coverage_range_high, coverage_by_item,
                waste_factor, uom_basis, assumptions, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (p_id, sf_id, safe_text(p.get("material_system")), p.get("product_role"),
             json_str(p.get("surface_texture")) if isinstance(p.get("surface_texture"), list) else p.get("surface_texture"),
             json_str(p.get("drywall_finish_level")),
             p.get("coverage_model"),
             p.get("coverage_sf_per_gallon"),
             p.get("coverage_range_low"), p.get("coverage_range_high"),
             json_str(coverage_by_item),
             p.get("waste_factor"),
             p.get("uom_basis"),
             json_str(p.get("assumptions")) if isinstance(p.get("assumptions"), list) else p.get("assumptions"),
             json_str(p.get("notes")) if isinstance(p.get("notes"), list) else p.get("notes")),
        )
    report.add_rows("material_coverage_profiles", len(profiles))

    # --- material_consumables ---
    consumables = materials.get("consumables", [])
    for c in consumables:
        c_id = c.get("consumable_id") or c.get("id")
        if not c_id:
            continue  # Skip non-consumable entries (e.g., consumption models with model_id)
        conn.execute(
            """INSERT INTO material_consumables
               (id, spec_family_id, name, consumable_category, specification,
                unit, yield_per_unit, yield_uom, applies_when, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (c_id, sf_id, c.get("name", ""),
             c.get("category"),  # JSON uses "category", column is "consumable_category"
             c.get("specification"),
             c.get("unit"), c.get("yield_per_unit"), c.get("yield_uom"),
             json_str(c.get("applies_when")),
             c.get("notes")),
        )
    report.add_rows("material_consumables", len(consumables))


# ============================================================
# Import: sop_modules.json
# ============================================================

def import_sop_json(conn, sop, sf_id, report, spec=None):
    """Decompose sop_modules.json into normalized tables.
    spec parameter is optional — used to check for round_configurations in spec.json as fallback."""

    # --- sop_round_configurations ---
    # Check sop_modules.json first, fall back to spec.json
    round_configs = sop.get("round_configurations", [])
    if not round_configs and spec:
        round_configs = spec.get("round_configurations", [])
    for rc in round_configs:
        # round_id dual-key: "round_id" (standard) or "round_config_id" (caulk/some exterior)
        r_id = rc.get("round_id") or rc.get("round_config_id")
        conn.execute(
            """INSERT INTO sop_round_configurations
               (spec_family_id, round_id, name, description, applies_when,
                phase_sequence, total_coats, interstage_cycles, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, r_id, rc.get("name", ""),
             rc.get("description"),
             json_str(rc.get("applies_when")),
             json_str(rc.get("phase_sequence")),
             rc.get("total_coats"), rc.get("interstage_cycles"),
             rc.get("notes")),
        )
    report.add_rows("sop_round_configurations", len(round_configs))

    # --- sop_modules + sop_tasks ---
    modules = sop.get("sop_modules", [])
    task_count = 0
    for i, mod in enumerate(modules):
        conn.execute(
            """INSERT INTO sop_modules
               (id, spec_family_id, name, phase, description, applies_when,
                required_inputs, sequence_notes, sort_order)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (mod["module_id"], sf_id, mod["name"],
             PHASE_ALIASES.get(mod["phase"], mod["phase"]),
             mod.get("description"),
             json_str(mod.get("applies_when")),
             json_str(mod.get("required_inputs")),
             mod.get("sequence_notes"), i),
        )

        for j, task in enumerate(mod.get("tasks", [])):
            conn.execute(
                """INSERT INTO sop_tasks
                   (id, spec_family_id, module_id, name, task_classification,
                    task_type, skill_level, qt_behavior, description, tools_required,
                    applies_when, appears_in_tiers, quality_notes,
                    protection_metadata, adjacency_metadata,
                    substrate_state_rules, site_condition_rules,
                    notes, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (task["task_id"], sf_id, mod["module_id"], task["name"],
                 task.get("task_classification"), task.get("task_type"),
                 task.get("skill_level"), task.get("qt_behavior"),
                 task.get("description"),
                 json_str(task.get("tools_required")),
                 json_str(task.get("applies_when")),
                 json_str(task.get("appears_in_tiers")),
                 json_str(task.get("quality_notes")),
                 json_str(task.get("protection_metadata")),
                 json_str(task.get("adjacency_metadata")),
                 json_str(task.get("substrate_state_rules")),
                 json_str(task.get("site_condition_rules")),
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

    # --- task_production_rates ---
    # Three rate patterns: binary (rate_per_hour), qt_scaled (rates_by_tier), FIXED_TIME (fixed_minutes)
    # Collect valid task IDs to detect orphaned rates
    valid_task_ids = set(
        row[0] for row in conn.execute(
            "SELECT id FROM sop_tasks WHERE spec_family_id = ?", (sf_id,)
        ).fetchall()
    )

    rates = production.get("task_production_rates", [])
    skipped_rates = 0
    for r in rates:
        # Skip section header entries (e.g., {"_section": "=== MOD_FNRP_SETUP — 3 tasks ==="})
        if "_section" in r or "task_id" not in r:
            continue
        if r["task_id"] not in valid_task_ids:
            report.add_warning(f"Skipped orphaned rate for task {r['task_id']} (not in sop_tasks)")
            skipped_rates += 1
            continue
        conn.execute(
            """INSERT INTO task_production_rates
               (spec_family_id, task_id, name, unit_of_measure, required_input_key,
                paintscope_key, rate_per_hour, rate_range_low, rate_range_high,
                rates_by_tier, fixed_minutes, fixed_minutes_range_low,
                fixed_minutes_range_high, fixed_minutes_by_tier,
                crew_size, applies_when, defect_tolerance, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, r["task_id"], r.get("name"),
             r.get("unit_of_measure", ""),
             r.get("required_input_key") or r.get("input_name"),
             r.get("paintscope_key"),
             r.get("rate_per_hour"),
             r.get("rate_range_low"),
             r.get("rate_range_high"),
             json_str(r.get("rates_by_tier")),
             r.get("fixed_minutes") or r.get("fixed_time_minutes"),
             r.get("fixed_minutes_range_low") or r.get("fixed_time_range_low"),
             r.get("fixed_minutes_range_high") or r.get("fixed_time_range_high"),
             json_str(r.get("fixed_time_minutes_by_tier") or r.get("fixed_minutes_by_tier")),
             r.get("crew_size"),
             json_str(r.get("applies_when")),
             json_str(r.get("defect_tolerance")),
             r.get("notes") or r.get("rate_basis_notes")),
        )
    report.add_rows("task_production_rates", len(rates) - skipped_rates)

    # --- factor_modifiers + factor_task_applicability ---
    # Handle multiple source patterns:
    # 1. Drywall: height_effects[], texture_effects[], drywall_level_effects[]
    # 2. Cabinet: modifier_registry{} with named modifier objects
    # 3. Generic: factor_modifiers[] (unified array)

    modifier_count = 0
    applicability_count = 0
    seen_modifier_ids = set()

    def insert_modifier(mod_id, category, name=None, description=None,
                        modifier_type=None, time_mod=None, value=None,
                        value_min=None, value_max=None, condition=None,
                        values_map=None, notes=None, applies_to_tasks=None):
        """Insert a modifier row and optional task applicability rows."""
        nonlocal modifier_count, applicability_count
        if mod_id in seen_modifier_ids:
            return  # Skip duplicate modifier ID
        seen_modifier_ids.add(mod_id)
        conn.execute(
            """INSERT INTO factor_modifiers
               (id, spec_family_id, modifier_category, name, description,
                modifier_type, time_modifier, value, value_min, value_max,
                condition, values_map, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (mod_id, sf_id, category, name, description,
             modifier_type, time_mod, value, value_min, value_max,
             json_str(condition) if isinstance(condition, (dict, list)) else condition,
             json_str(values_map) if isinstance(values_map, dict) else values_map,
             notes),
        )
        modifier_count += 1
        if applies_to_tasks and isinstance(applies_to_tasks, list):
            for task_id in applies_to_tasks:
                conn.execute(
                    """INSERT INTO factor_task_applicability
                       (spec_family_id, factor_id, task_id) VALUES (?, ?, ?)""",
                    (sf_id, mod_id, task_id),
                )
                applicability_count += 1

    # Pattern 1: height_effects[]
    for h in production.get("height_effects", []):
        insert_modifier(
            mod_id=h.get("modifier_id", f"HEIGHT_{h.get('wall_height', 'UNKNOWN').upper()}"),
            category="height",
            name=h.get("wall_height"),
            description=h.get("height_range"),
            modifier_type="multiplier",
            time_mod=h.get("time_increase_modifier") or h.get("time_modifier"),
            notes=h.get("notes"),
        )

    # Pattern 2: texture_effects[]
    for t in production.get("texture_effects", []):
        tex = t.get("surface_texture", "unknown")
        insert_modifier(
            mod_id=t.get("modifier_id", f"TEXTURE_{tex.upper()}"),
            category="texture",
            name=tex,
            modifier_type="multiplier",
            time_mod=t.get("rate_modifier"),
            value=t.get("coverage_modifier"),
            notes=t.get("notes"),
        )

    # Pattern 3: drywall_level_effects[]
    for d in production.get("drywall_level_effects", []):
        dl = d.get("drywall_finish_level", "unknown")
        insert_modifier(
            mod_id=d.get("modifier_id", f"DL_{dl.upper()}"),
            category="drywall_level",
            name=dl,
            modifier_type="multiplier",
            time_mod=d.get("rate_modifier"),
            value=d.get("coverage_modifier"),
            notes=d.get("notes"),
        )

    # Pattern 4: modifier_registry{} (Cabinet-style named modifiers)
    registry = production.get("modifier_registry", {})
    for key, mod_obj in registry.items():
        if not isinstance(mod_obj, dict) or "modifier_id" not in mod_obj:
            continue  # Skip non-modifier entries (coat_count, etc.)

        mod_id = mod_obj["modifier_id"]
        # Derive category from the key name or modifier_id
        category = key.replace("_modifier", "").replace("_mod", "")

        # applies_to can be an array of task IDs, descriptive strings, or a plain string
        applies_to = mod_obj.get("applies_to", [])
        if isinstance(applies_to, list):
            # Filter to actual task IDs (TSK_ prefix); ignore descriptive strings
            task_list = [t for t in applies_to if isinstance(t, str) and t.startswith("TSK_")]
            task_list = task_list or None
        else:
            task_list = None

        insert_modifier(
            mod_id=mod_id,
            category=category,
            name=mod_obj.get("name") or key.replace("_", " ").title(),
            description=mod_obj.get("source"),
            modifier_type="multiplier",
            condition=mod_obj.get("values"),
            notes=mod_obj.get("application_rule"),
            applies_to_tasks=task_list,
        )

    # Pattern 5: factor_modifiers[] — two sub-patterns:
    #   5a: Nested groups with modifiers[] array (Drywall Wall Finish)
    #   5b: Flat individual modifiers with factor_id/modifier_id
    for fac in production.get("factor_modifiers", []):
        if "modifiers" in fac and isinstance(fac["modifiers"], list):
            # Pattern 5a: expand nested modifier group
            category = fac.get("modifier_category", "unknown")
            for sub in fac["modifiers"]:
                sub_id = sub.get("modifier_id") or sub.get("id")
                if not sub_id:
                    continue
                insert_modifier(
                    mod_id=sub_id,
                    category=category,
                    name=sub.get("name") or sub.get("wall_height_range") or sub.get("surface_texture"),
                    description=sub.get("description"),
                    modifier_type="multiplier",
                    time_mod=sub.get("time_multiplier") or sub.get("time_modifier"),
                    value=sub.get("value") or sub.get("coverage_modifier") or sub.get("rate_modifier"),
                    notes=sub.get("notes"),
                )
        else:
            # Pattern 5b: flat individual modifier
            fac_id = fac.get("factor_id") or fac.get("modifier_id") or fac.get("id")
            if not fac_id:
                continue
            category = fac.get("modifier_category") or fac.get("type", "unknown")

            # Exterior multi-value map: "values" dict → values_map column
            values_obj = fac.get("values")
            v_map = None
            time_mod = fac.get("time_modifier")
            if isinstance(values_obj, dict):
                v_map = values_obj
                # If values is a dict, time_modifier should be NULL (multiple values)
                if time_mod is None:
                    time_mod = None

            # applies_to dual-key: interior "applies_to_tasks" vs exterior "applies_to"
            task_list = fac.get("applies_to_tasks") or fac.get("applies_to")
            if isinstance(task_list, list):
                task_list = [t for t in task_list if isinstance(t, str) and t.startswith("TSK_")]
                task_list = task_list or None
            else:
                task_list = None

            insert_modifier(
                mod_id=fac_id,
                category=category,
                name=fac.get("name"),
                description=fac.get("description"),
                modifier_type=fac.get("modifier_type") or fac.get("mechanism"),
                time_mod=time_mod,
                value=fac.get("value"),
                value_min=fac.get("value_min"),
                value_max=fac.get("value_max"),
                condition=fac.get("condition"),
                values_map=v_map,
                notes=fac.get("notes"),
                applies_to_tasks=task_list,
            )

    report.add_rows("factor_modifiers", modifier_count)
    report.add_rows("factor_task_applicability", applicability_count)

    # --- quality_tier_effects ---
    effects = production.get("quality_tier_effects", [])
    if not isinstance(effects, list):
        effects = []  # Some specs use a descriptive dict instead of a list
    for eff in effects:
        conn.execute(
            """INSERT INTO quality_tier_effects
               (spec_family_id, quality_tier, modifier_id, time_modifier,
                description, mechanism, effect_details, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (sf_id, eff.get("quality_tier", ""),
             eff.get("modifier_id"),
             eff.get("time_modifier"),
             eff.get("description"),
             eff.get("mechanism"),
             json_str(eff.get("details") or eff.get("effects")),
             eff.get("notes")),
        )
    report.add_rows("quality_tier_effects", len(effects))


# ============================================================
# Import: qa_report.json
# ============================================================

def import_qa_json(conn, qa, sf_id, report):
    """Decompose qa_report.json into summary + full JSON blob."""

    # Status field: check overall_result first, fall back to review_status
    raw_status = qa.get("overall_result") or qa.get("review_status") or "fail"
    # Normalize case: "PASS" → "pass", "PASS_WITH_WARNINGS" → "pass_with_warnings"
    status = raw_status.lower()

    # Summary field: check recommendation, then notes, then summary
    summary = qa.get("recommendation") or qa.get("notes") or qa.get("summary")
    if isinstance(summary, (dict, list)):
        summary = json_str(summary)

    # Reviewed by: critic_agent or generated_by
    reviewed_by = qa.get("critic_agent") or qa.get("generated_by")

    # Review date: review_date or generated_at
    review_date = qa.get("review_date") or qa.get("generated_at")

    conn.execute(
        """INSERT INTO spec_qa_reports
           (spec_family_id, version, reviewed_by, review_date, status, summary, full_report)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (sf_id,
         qa.get("version") or qa.get("spec_version", ""),
         reviewed_by, review_date, status, summary,
         json_str(qa)),
    )
    report.add_rows("spec_qa_reports", 1)


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
    sf_obj = spec.get("spec_family") or spec.get("spec_metadata")
    if sf_obj is None:
        # Flat top-level structure fallback
        sf_obj = spec
    sf_id = sf_obj.get("id") or sf_obj.get("spec_family_id")
    version = sf_obj.get("version", "0.1.0")
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

        # Step 1: Raw JSON storage
        print("  Storing raw JSON...")
        import_raw(conn, sf_id, version, artifacts, report)

        # Step 2: Normalize spec.json
        print("  Importing spec.json...")
        import_spec_json(conn, spec, sf_id, report)

        # Step 3: Normalize materials.json
        print("  Importing materials.json...")
        import_materials_json(conn, artifacts["materials.json"], sf_id, report)

        # Step 4: Normalize sop_modules.json
        print("  Importing sop_modules.json...")
        import_sop_json(conn, artifacts["sop_modules.json"], sf_id, report, spec=spec)

        # Step 5: Normalize production.json
        print("  Importing production.json...")
        import_production_json(conn, artifacts["production.json"], sf_id, report)

        # Step 6: Normalize qa_report.json
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

        # Log the failure
        try:
            conn.execute("BEGIN TRANSACTION")
            conn.execute(
                """INSERT INTO import_log
                   (spec_family_id, version, import_status, errors, imported_at)
                   VALUES (?, ?, 'failed', ?, ?)""",
                (sf_id, version, json_str([str(e)]),
                 datetime.now(timezone.utc).isoformat()),
            )
            conn.execute("COMMIT")
        except Exception:
            pass

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
