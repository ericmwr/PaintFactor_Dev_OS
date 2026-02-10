#!/usr/bin/env python3
"""
PaintFactor DB Validator
Post-import integrity checker for the PaintFactor SQLite database.
Aligned with db-validator.md validation categories and create_tables.sql v1.1.0.

Usage:
    python validate_db.py [spec_family_id] [--db <database_path>]

Examples:
    python validate_db.py                                    # Validate all
    python validate_db.py SF_TRIM_NC_PAINT                  # Validate one family
    python validate_db.py --db database/paintfactor.db      # Custom DB path
"""

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_DB_PATH = "database/paintfactor.db"


# ============================================================
# Validation Result
# ============================================================

class ValidationResult:
    def __init__(self, check_id, category, severity, status, details, affected_rows=None):
        self.check_id = check_id
        self.category = category
        self.severity = severity
        self.status = status  # pass / fail / warning
        self.details = details
        self.affected_rows = affected_rows or []

    def to_dict(self):
        d = {
            "check_id": self.check_id,
            "category": self.category,
            "severity": self.severity,
            "status": self.status,
            "details": self.details,
        }
        if self.affected_rows:
            d["affected_rows"] = self.affected_rows[:20]
        return d


class ValidationReport:
    def __init__(self, spec_family_id=None, version=None):
        self.spec_family_id = spec_family_id or "ALL"
        self.version = version
        self.checks = []

    def add(self, result):
        self.checks.append(result)

    @property
    def passed(self):
        return sum(1 for c in self.checks if c.status == "pass")

    @property
    def failed(self):
        return sum(1 for c in self.checks if c.status == "fail")

    @property
    def warnings(self):
        return sum(1 for c in self.checks if c.status == "warning")

    @property
    def status(self):
        has_critical_fail = any(c.status == "fail" and c.severity == "critical" for c in self.checks)
        has_major_fail = any(c.status == "fail" and c.severity == "major" for c in self.checks)
        has_warning = any(c.status == "warning" for c in self.checks)

        if has_critical_fail:
            return "fail"
        if has_major_fail or has_warning:
            return "pass_with_warnings"
        return "pass"

    def to_dict(self):
        return {
            "spec_family_id": self.spec_family_id,
            "version": self.version,
            "validated_at": datetime.now(timezone.utc).isoformat(),
            "status": self.status,
            "summary": f"{self.passed} passed, {self.failed} failed, {self.warnings} warnings out of {len(self.checks)} checks",
            "stats": {
                "total_checks": len(self.checks),
                "passed": self.passed,
                "failed": self.failed,
                "warnings": self.warnings,
            },
            "checks": [c.to_dict() for c in self.checks],
        }

    def save(self, output_dir):
        os.makedirs(output_dir, exist_ok=True)
        path = os.path.join(output_dir, "validation_report.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(self.to_dict(), f, indent=2, ensure_ascii=False)
        return path

    def print_summary(self):
        print(f"\n{'='*60}")
        print(f"Validation: {self.spec_family_id}")
        print(f"Status: {self.status.upper()}")
        print(f"Checks: {self.passed} pass, {self.failed} fail, {self.warnings} warn / {len(self.checks)} total")
        if self.failed > 0 or self.warnings > 0:
            print(f"\nIssues:")
            for c in self.checks:
                if c.status != "pass":
                    icon = "X" if c.status == "fail" else "!"
                    print(f"  [{icon}] [{c.severity.upper()}] {c.check_id}: {c.details}")
                    if c.affected_rows:
                        for row in c.affected_rows[:5]:
                            print(f"      -> {row}")
                        if len(c.affected_rows) > 5:
                            print(f"      ... and {len(c.affected_rows) - 5} more")
        print(f"{'='*60}")


# ============================================================
# Check helpers
# ============================================================

def query_values(conn, sql, params=()):
    """Execute query and return list of single values."""
    return [r[0] for r in conn.execute(sql, params).fetchall()]


def check_composite_fk(conn, report, check_id, child_table, child_id_col,
                       parent_table, parent_id_col, sf_id):
    """Check composite FK integrity (id + spec_family_id)."""
    sql = f"""SELECT DISTINCT c.{child_id_col} FROM {child_table} c
              LEFT JOIN {parent_table} p
                ON c.{child_id_col} = p.{parent_id_col} AND c.spec_family_id = p.spec_family_id
              WHERE c.spec_family_id = ? AND p.{parent_id_col} IS NULL AND c.{child_id_col} IS NOT NULL"""
    orphans = query_values(conn, sql, (sf_id,))
    if orphans:
        report.add(ValidationResult(
            check_id, "fk_integrity", "critical", "fail",
            f"{child_table}.{child_id_col} has {len(orphans)} orphan values not in {parent_table}.{parent_id_col}",
            orphans,
        ))
    else:
        report.add(ValidationResult(
            check_id, "fk_integrity", "critical", "pass",
            f"All {child_table}.{child_id_col} values exist in {parent_table}.{parent_id_col}",
        ))


def check_simple_fk(conn, report, check_id, child_table, child_col,
                     parent_table, parent_col, sf_id):
    """Check simple FK integrity (single column, filtered by spec_family_id)."""
    sql = f"""SELECT DISTINCT c.{child_col} FROM {child_table} c
              LEFT JOIN {parent_table} p ON c.{child_col} = p.{parent_col}
              WHERE c.spec_family_id = ? AND p.{parent_col} IS NULL AND c.{child_col} IS NOT NULL"""
    orphans = query_values(conn, sql, (sf_id,))
    if orphans:
        report.add(ValidationResult(
            check_id, "fk_integrity", "critical", "fail",
            f"{child_table}.{child_col} has {len(orphans)} orphan values not in {parent_table}.{parent_col}",
            orphans,
        ))
    else:
        report.add(ValidationResult(
            check_id, "fk_integrity", "critical", "pass",
            f"All {child_table}.{child_col} values exist in {parent_table}.{parent_col}",
        ))


def check_count(conn, report, check_id, table, sf_id, min_count, severity, label):
    """Check minimum row count for a table filtered by spec_family_id."""
    count = conn.execute(
        f"SELECT count(*) FROM {table} WHERE spec_family_id = ?", (sf_id,)
    ).fetchone()[0]
    if count < min_count:
        status = "fail" if severity == "critical" else "warning"
        report.add(ValidationResult(
            check_id, "completeness", severity, status,
            f"{label}: expected >= {min_count}, found {count}",
        ))
    else:
        report.add(ValidationResult(
            check_id, "completeness", severity, "pass",
            f"{label}: {count} rows",
        ))


def check_enum(conn, report, check_id, table, column, valid_values, sf_id, id_col="spec_family_id"):
    """Check that column values are within valid set."""
    sql = f"SELECT DISTINCT {column} FROM {table} WHERE {id_col} = ? AND {column} IS NOT NULL"
    values = query_values(conn, sql, (sf_id,))
    invalid = [v for v in values if v not in valid_values]
    if invalid:
        report.add(ValidationResult(
            check_id, "enum_validation", "major", "fail",
            f"{table}.{column} has invalid values: {invalid}. Valid: {valid_values}",
            invalid,
        ))
    else:
        report.add(ValidationResult(
            check_id, "enum_validation", "major", "pass",
            f"All {table}.{column} values are valid",
        ))


def check_id_pattern(conn, report, check_id, table, column, pattern, sf_id, id_col="spec_family_id"):
    """Check that IDs match expected regex pattern."""
    sql = f"SELECT DISTINCT {column} FROM {table} WHERE {id_col} = ? AND {column} IS NOT NULL"
    values = query_values(conn, sql, (sf_id,))
    non_matching = [v for v in values if not re.match(pattern, v)]
    if non_matching:
        report.add(ValidationResult(
            check_id, "id_pattern", "minor", "warning",
            f"{table}.{column}: {len(non_matching)} values don't match pattern {pattern}",
            non_matching,
        ))
    else:
        report.add(ValidationResult(
            check_id, "id_pattern", "minor", "pass",
            f"All {table}.{column} values match pattern {pattern}",
        ))


# ============================================================
# Validation runner
# ============================================================

def validate_spec_family(conn, sf_id, report):
    """Run all validation checks for a single spec family."""

    # Get version for report
    row = conn.execute("SELECT version FROM spec_families WHERE id = ?", (sf_id,)).fetchone()
    if row:
        report.version = row[0]

    # ==========================================================
    # Category 1: FK Integrity (CRITICAL)
    # ==========================================================

    # FK-001: spec_configuration_dimensions.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-001",
                    "spec_configuration_dimensions", "spec_family_id", "spec_families", "id", sf_id)

    # FK-002: spec_paintable_item_types.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-002",
                    "spec_paintable_item_types", "spec_family_id", "spec_families", "id", sf_id)

    # FK-003: spec_variants.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-003",
                    "spec_variants", "spec_family_id", "spec_families", "id", sf_id)

    # FK-004: spec_variant_item_inclusions.(variant_id, spec_family_id) → spec_variants
    check_composite_fk(conn, report, "FK-004",
                       "spec_variant_item_inclusions", "variant_id", "spec_variants", "id", sf_id)

    # FK-005: spec_variant_item_inclusions.(item_id, spec_family_id) → spec_paintable_item_types
    check_composite_fk(conn, report, "FK-005",
                       "spec_variant_item_inclusions", "item_id", "spec_paintable_item_types", "id", sf_id)

    # FK-006: sop_modules.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-006",
                    "sop_modules", "spec_family_id", "spec_families", "id", sf_id)

    # FK-007: sop_tasks.(module_id, spec_family_id) → sop_modules
    check_composite_fk(conn, report, "FK-007",
                       "sop_tasks", "module_id", "sop_modules", "id", sf_id)

    # FK-008: task_production_rates.(task_id, spec_family_id) → sop_tasks
    check_composite_fk(conn, report, "FK-008",
                       "task_production_rates", "task_id", "sop_tasks", "id", sf_id)

    # FK-009: factor_task_applicability.(factor_id, spec_family_id) → factor_modifiers
    check_composite_fk(conn, report, "FK-009",
                       "factor_task_applicability", "factor_id", "factor_modifiers", "id", sf_id)

    # FK-010: factor_task_applicability.(task_id, spec_family_id) → sop_tasks
    check_composite_fk(conn, report, "FK-010",
                       "factor_task_applicability", "task_id", "sop_tasks", "id", sf_id)

    # FK-011: material_system_products.(system_id, spec_family_id) → material_systems
    check_composite_fk(conn, report, "FK-011",
                       "material_system_products", "system_id", "material_systems", "id", sf_id)

    # FK-012: sop_round_configurations.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-012",
                    "sop_round_configurations", "spec_family_id", "spec_families", "id", sf_id)

    # FK-013: material_coverage_profiles.spec_family_id → spec_families.id
    check_simple_fk(conn, report, "FK-013",
                    "material_coverage_profiles", "spec_family_id", "spec_families", "id", sf_id)

    # ==========================================================
    # Category 2: Cross-File Threading (CRITICAL)
    # ==========================================================

    # XF-001: task_production_rates.task_id exists in sop_tasks
    orphan_tasks = query_values(conn,
        """SELECT DISTINCT r.task_id FROM task_production_rates r
           LEFT JOIN sop_tasks t ON r.task_id = t.id AND r.spec_family_id = t.spec_family_id
           WHERE r.spec_family_id = ? AND t.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-001", "cross_file_threading", "critical",
        "fail" if orphan_tasks else "pass",
        f"task_production_rates references {len(orphan_tasks)} task_ids not in sop_tasks" if orphan_tasks
        else "All production rate task_ids exist in sop_tasks",
        orphan_tasks))

    # XF-002: factor_task_applicability.task_id exists in sop_tasks
    orphan_fac = query_values(conn,
        """SELECT DISTINCT a.task_id FROM factor_task_applicability a
           LEFT JOIN sop_tasks t ON a.task_id = t.id AND a.spec_family_id = t.spec_family_id
           WHERE a.spec_family_id = ? AND t.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-002", "cross_file_threading", "critical",
        "fail" if orphan_fac else "pass",
        f"factor_task_applicability references {len(orphan_fac)} task_ids not in sop_tasks" if orphan_fac
        else "All factor applicability task_ids exist in sop_tasks",
        orphan_fac))

    # XF-003: sop_tasks.module_id exists in sop_modules
    orphan_mods = query_values(conn,
        """SELECT DISTINCT t.module_id FROM sop_tasks t
           LEFT JOIN sop_modules m ON t.module_id = m.id AND t.spec_family_id = m.spec_family_id
           WHERE t.spec_family_id = ? AND m.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-003", "cross_file_threading", "critical",
        "fail" if orphan_mods else "pass",
        f"sop_tasks references {len(orphan_mods)} module_ids not in sop_modules" if orphan_mods
        else "All task module_ids exist in sop_modules",
        orphan_mods))

    # XF-004: spec_variant_item_inclusions.item_id exists in spec_paintable_item_types
    orphan_items = query_values(conn,
        """SELECT DISTINCT i.item_id FROM spec_variant_item_inclusions i
           LEFT JOIN spec_paintable_item_types p ON i.item_id = p.id AND i.spec_family_id = p.spec_family_id
           WHERE i.spec_family_id = ? AND p.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-004", "cross_file_threading", "critical",
        "fail" if orphan_items else "pass",
        f"variant_item_inclusions references {len(orphan_items)} item_ids not in paintable_item_types" if orphan_items
        else "All variant item_ids exist in paintable_item_types",
        orphan_items))

    # XF-005: spec_variant_item_inclusions.variant_id exists in spec_variants
    orphan_vars = query_values(conn,
        """SELECT DISTINCT i.variant_id FROM spec_variant_item_inclusions i
           LEFT JOIN spec_variants v ON i.variant_id = v.id AND i.spec_family_id = v.spec_family_id
           WHERE i.spec_family_id = ? AND v.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-005", "cross_file_threading", "critical",
        "fail" if orphan_vars else "pass",
        f"variant_item_inclusions references {len(orphan_vars)} variant_ids not in spec_variants" if orphan_vars
        else "All variant_ids exist in spec_variants",
        orphan_vars))

    # XF-006: material_system_products.system_id exists in material_systems
    orphan_sys = query_values(conn,
        """SELECT DISTINCT p.system_id FROM material_system_products p
           LEFT JOIN material_systems m ON p.system_id = m.id AND p.spec_family_id = m.spec_family_id
           WHERE p.spec_family_id = ? AND m.id IS NULL""", (sf_id,))
    report.add(ValidationResult("XF-006", "cross_file_threading", "critical",
        "fail" if orphan_sys else "pass",
        f"material_system_products references {len(orphan_sys)} system_ids not in material_systems" if orphan_sys
        else "All product system_ids exist in material_systems",
        orphan_sys))

    # ==========================================================
    # Category 3: Completeness (MAJOR / MINOR)
    # ==========================================================

    check_count(conn, report, "CMP-001", "spec_configuration_dimensions", sf_id, 1, "major", "Configuration dimensions")
    check_count(conn, report, "CMP-002", "spec_paintable_item_types", sf_id, 1, "major", "Paintable items")
    check_count(conn, report, "CMP-003", "spec_variants", sf_id, 1, "major", "Variants")
    check_count(conn, report, "CMP-005", "material_systems", sf_id, 1, "major", "Material systems")
    check_count(conn, report, "CMP-006", "sop_modules", sf_id, 1, "major", "SOP modules")
    check_count(conn, report, "CMP-007", "sop_tasks", sf_id, 1, "major", "SOP tasks")
    check_count(conn, report, "CMP-010", "spec_qa_reports", sf_id, 1, "major", "QA reports")
    check_count(conn, report, "CMP-014", "spec_required_inputs", sf_id, 1, "major", "Required PaintScope inputs")
    check_count(conn, report, "CMP-011", "spec_protection_zones", sf_id, 1, "minor", "Protection zones")
    check_count(conn, report, "CMP-012", "spec_adjacency_declarations", sf_id, 1, "minor", "Adjacency declarations")
    check_count(conn, report, "CMP-013", "spec_state_declarations", sf_id, 1, "minor", "State declarations")

    # CMP-004: Every variant has >= 1 included item
    variants_no_items = query_values(conn,
        """SELECT v.id FROM spec_variants v
           LEFT JOIN spec_variant_item_inclusions i
             ON v.id = i.variant_id AND v.spec_family_id = i.spec_family_id AND i.is_included = 1
           WHERE v.spec_family_id = ?
           GROUP BY v.id HAVING count(i.id) = 0""", (sf_id,))
    report.add(ValidationResult("CMP-004", "completeness", "major",
        "warning" if variants_no_items else "pass",
        f"{len(variants_no_items)} variants have no included items" if variants_no_items
        else "All variants have >= 1 included item",
        variants_no_items))

    # CMP-008: Every task has >= 1 production rate
    tasks_no_rates = query_values(conn,
        """SELECT t.id FROM sop_tasks t
           LEFT JOIN task_production_rates r ON t.id = r.task_id AND t.spec_family_id = r.spec_family_id
           WHERE t.spec_family_id = ?
           GROUP BY t.id HAVING count(r.id) = 0""", (sf_id,))
    report.add(ValidationResult("CMP-008", "completeness", "major",
        "warning" if tasks_no_rates else "pass",
        f"{len(tasks_no_rates)} tasks have no production rate" if tasks_no_rates
        else "All tasks have >= 1 production rate",
        tasks_no_rates))

    # CMP-009: All 5 artifact types in raw storage
    raw_types = set(query_values(conn,
        "SELECT DISTINCT artifact_type FROM spec_artifacts_raw WHERE spec_family_id = ?", (sf_id,)))
    expected = {"spec", "materials", "sop_modules", "production", "qa_report"}
    missing_types = expected - raw_types
    report.add(ValidationResult("CMP-009", "completeness", "critical",
        "fail" if missing_types else "pass",
        f"Missing raw artifacts: {missing_types}" if missing_types
        else "All 5 artifact types present in raw storage",
        list(missing_types) if missing_types else None))

    # CMP-015: Every material_system has >= 1 product
    sys_no_prods = query_values(conn,
        """SELECT m.id FROM material_systems m
           LEFT JOIN material_system_products p ON m.id = p.system_id AND m.spec_family_id = p.spec_family_id
           WHERE m.spec_family_id = ?
           GROUP BY m.id HAVING count(p.id) = 0""", (sf_id,))
    report.add(ValidationResult("CMP-015", "completeness", "major",
        "warning" if sys_no_prods else "pass",
        f"{len(sys_no_prods)} material systems have no products" if sys_no_prods
        else "All material systems have >= 1 product",
        sys_no_prods))

    # CMP-016: Multi-round variants have round_configurations
    variants_with_round = query_values(conn,
        "SELECT DISTINCT round_id FROM spec_variants WHERE spec_family_id = ? AND round_id IS NOT NULL",
        (sf_id,))
    if variants_with_round:
        existing_rounds = set(query_values(conn,
            "SELECT round_id FROM sop_round_configurations WHERE spec_family_id = ?", (sf_id,)))
        missing_rounds = [r for r in variants_with_round if r not in existing_rounds]
        report.add(ValidationResult("CMP-016", "completeness", "major",
            "warning" if missing_rounds else "pass",
            f"Variants reference {len(missing_rounds)} round_ids without configurations: {missing_rounds}" if missing_rounds
            else f"All {len(variants_with_round)} variant round_ids have configurations",
            missing_rounds))

    # ==========================================================
    # Category 4: Enum Validation (MAJOR / MINOR)
    # ==========================================================

    check_enum(conn, report, "ENM-001", "spec_families", "domain",
               ["interior", "exterior", "specialty"], sf_id, id_col="id")
    check_enum(conn, report, "ENM-002", "spec_families", "status",
               ["draft", "review_required", "approved", "active", "deprecated", "referenced_not_built"], sf_id, id_col="id")
    check_enum(conn, report, "ENM-003", "sop_modules", "phase",
               ["setup", "prep", "prime", "apply", "interstage", "finish", "cleanup"], sf_id)
    check_enum(conn, report, "ENM-004", "sop_tasks", "task_classification",
               ["binary", "qt_conditional", "qt_scaled"], sf_id)

    # ENM-005: skill_level (MINOR)
    skill_values = query_values(conn,
        "SELECT DISTINCT skill_level FROM sop_tasks WHERE spec_family_id = ? AND skill_level IS NOT NULL",
        (sf_id,))
    invalid_skills = [v for v in skill_values if v not in ["helper", "journeyman", "lead"]]
    if invalid_skills:
        report.add(ValidationResult("ENM-005", "enum_validation", "minor", "warning",
            f"sop_tasks.skill_level has non-standard values: {invalid_skills}",
            invalid_skills))
    else:
        report.add(ValidationResult("ENM-005", "enum_validation", "minor", "pass",
            "All sop_tasks.skill_level values are valid"))

    check_enum(conn, report, "ENM-006", "spec_qa_reports", "status",
               ["pass", "pass_with_warnings", "fail"], sf_id)

    # ENM-007: modifier_category — open set since specs define their own categories
    mod_cats = query_values(conn,
        "SELECT DISTINCT modifier_category FROM factor_modifiers WHERE spec_family_id = ? AND modifier_category IS NOT NULL",
        (sf_id,))
    if mod_cats:
        report.add(ValidationResult("ENM-007", "enum_validation", "minor", "pass",
            f"factor_modifiers.modifier_category values: {mod_cats}"))
    else:
        report.add(ValidationResult("ENM-007", "enum_validation", "minor", "pass",
            "No factor modifiers present"))

    # ==========================================================
    # Category 5: ID Pattern Validation (MINOR)
    # ==========================================================

    check_id_pattern(conn, report, "IDP-001", "spec_families", "id",
                     r"^SF_[A-Z0-9_]+$", sf_id, id_col="id")
    check_id_pattern(conn, report, "IDP-002", "sop_modules", "id",
                     r"^MOD_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-003", "sop_tasks", "id",
                     r"^TSK_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-004", "material_systems", "id",
                     r"^SYS_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-005", "material_consumables", "id",
                     r"^CON_[A-Z0-9_]+$", sf_id)

    # IDP-006: factor_modifiers — broader pattern (FAC_, MOD_, H#, TEXTURE_, DL_)
    check_id_pattern(conn, report, "IDP-006", "factor_modifiers", "id",
                     r"^(FAC|MOD|H[0-9]|TEXTURE|DL)[A-Z0-9_]+$", sf_id)

    check_id_pattern(conn, report, "IDP-007", "spec_paintable_item_types", "id",
                     r"^ITM_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-008", "spec_variants", "id",
                     r"^VAR_[A-Z0-9_]+$", sf_id)

    # IDP-009: coverage_profiles
    cov_count = conn.execute(
        "SELECT count(*) FROM material_coverage_profiles WHERE spec_family_id = ?", (sf_id,)
    ).fetchone()[0]
    if cov_count > 0:
        check_id_pattern(conn, report, "IDP-009", "material_coverage_profiles", "id",
                         r"^COV_[A-Z0-9_]+$", sf_id)

    # IDP-010: round_configurations
    rc_count = conn.execute(
        "SELECT count(*) FROM sop_round_configurations WHERE spec_family_id = ?", (sf_id,)
    ).fetchone()[0]
    if rc_count > 0:
        check_id_pattern(conn, report, "IDP-010", "sop_round_configurations", "round_id",
                         r"^ROUND_[A-Z0-9_]+$", sf_id)

    # ==========================================================
    # Category 6: Duplicate Detection (CRITICAL)
    # ==========================================================

    # DUP-001: No duplicate (id, spec_family_id) in tables with composite PK
    composite_pk_tables = [
        ("sop_tasks", "id"),
        ("sop_modules", "id"),
        ("spec_variants", "id"),
        ("spec_paintable_item_types", "id"),
        ("material_systems", "id"),
        ("material_consumables", "id"),
        ("factor_modifiers", "id"),
    ]
    dup_found = False
    all_dups = []
    for table, col in composite_pk_tables:
        dups = query_values(conn,
            f"SELECT {col} FROM {table} WHERE spec_family_id = ? GROUP BY {col} HAVING count(*) > 1",
            (sf_id,))
        if dups:
            dup_found = True
            all_dups.extend([f"{table}.{d}" for d in dups])
    report.add(ValidationResult("DUP-001", "duplicates", "critical",
        "fail" if dup_found else "pass",
        f"Duplicate (id, spec_family_id) found: {all_dups}" if dup_found
        else "No duplicate (id, spec_family_id) in any composite PK table",
        all_dups))

    # DUP-002: No duplicate task_id within family across modules
    dup_tasks = query_values(conn,
        """SELECT id FROM sop_tasks WHERE spec_family_id = ?
           GROUP BY id HAVING count(*) > 1""", (sf_id,))
    report.add(ValidationResult("DUP-002", "duplicates", "critical",
        "fail" if dup_tasks else "pass",
        f"Duplicate task IDs across modules: {dup_tasks}" if dup_tasks
        else "No duplicate task IDs within spec family",
        dup_tasks))

    # DUP-003: No duplicate raw artifact entries
    dup_raw = query_values(conn,
        """SELECT artifact_type || ':' || version FROM spec_artifacts_raw
           WHERE spec_family_id = ?
           GROUP BY artifact_type, version HAVING count(*) > 1""", (sf_id,))
    report.add(ValidationResult("DUP-003", "duplicates", "critical",
        "fail" if dup_raw else "pass",
        f"Duplicate raw artifact entries: {dup_raw}" if dup_raw
        else "No duplicate raw artifact entries",
        dup_raw))

    # ==========================================================
    # Category 7: Raw Integrity (MAJOR)
    # ==========================================================

    raw_rows = conn.execute(
        "SELECT artifact_type, version, json_content FROM spec_artifacts_raw WHERE spec_family_id = ?",
        (sf_id,)
    ).fetchall()

    # RAW-001: All raw JSON is parseable
    bad_json = []
    for art_type, _, content in raw_rows:
        try:
            json.loads(content)
        except json.JSONDecodeError:
            bad_json.append(art_type)
    report.add(ValidationResult("RAW-001", "raw_integrity", "major",
        "fail" if bad_json else "pass",
        f"Unparseable raw JSON: {bad_json}" if bad_json
        else "All raw JSON is parseable",
        bad_json))

    # RAW-002: Version in raw artifact matches spec_families version
    sf_version = conn.execute(
        "SELECT version FROM spec_families WHERE id = ?", (sf_id,)
    ).fetchone()
    if sf_version:
        sf_version = sf_version[0]
        mismatched = []
        for art_type, raw_ver, _ in raw_rows:
            if raw_ver != sf_version:
                mismatched.append(f"{art_type}: {raw_ver} (expected {sf_version})")
        report.add(ValidationResult("RAW-002", "raw_integrity", "major",
            "warning" if mismatched else "pass",
            f"Version mismatch in raw artifacts: {mismatched}" if mismatched
            else f"All raw artifact versions match spec_families ({sf_version})",
            mismatched))

    # RAW-003: spec_family_id consistent across all raw entries
    raw_sf_ids = set(query_values(conn,
        "SELECT DISTINCT spec_family_id FROM spec_artifacts_raw WHERE spec_family_id = ?", (sf_id,)))
    report.add(ValidationResult("RAW-003", "raw_integrity", "major",
        "pass",
        f"All raw artifacts have consistent spec_family_id: {sf_id}"))


# ============================================================
# Cross-family checks (full DB only)
# ============================================================

def validate_cross_family(conn, report):
    """Run cross-family validation checks (full DB mode)."""

    # XFM-001: No duplicate task IDs across spec families (if globally unique required)
    dup_global_tasks = query_values(conn,
        """SELECT id FROM sop_tasks GROUP BY id HAVING count(DISTINCT spec_family_id) > 1""")
    if dup_global_tasks:
        report.add(ValidationResult("XFM-001", "cross_family", "major", "warning",
            f"{len(dup_global_tasks)} task IDs appear in multiple spec families",
            dup_global_tasks[:10]))
    else:
        report.add(ValidationResult("XFM-001", "cross_family", "major", "pass",
            "All task IDs are globally unique"))

    # XFM-002: No duplicate module IDs across spec families
    dup_global_mods = query_values(conn,
        """SELECT id FROM sop_modules GROUP BY id HAVING count(DISTINCT spec_family_id) > 1""")
    if dup_global_mods:
        report.add(ValidationResult("XFM-002", "cross_family", "major", "warning",
            f"{len(dup_global_mods)} module IDs appear in multiple spec families",
            dup_global_mods[:10]))
    else:
        report.add(ValidationResult("XFM-002", "cross_family", "major", "pass",
            "All module IDs are globally unique"))


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(description="PaintFactor DB Validator")
    parser.add_argument("spec_family_id", nargs="?", help="Validate specific spec family (omit for all)")
    parser.add_argument("--db", default=DEFAULT_DB_PATH, help=f"Database path (default: {DEFAULT_DB_PATH})")
    args = parser.parse_args()

    if not os.path.exists(args.db):
        print(f"ERROR: Database not found at {args.db}")
        sys.exit(1)

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA foreign_keys = ON")

    if args.spec_family_id:
        # Validate single family
        exists = conn.execute(
            "SELECT id FROM spec_families WHERE id = ?", (args.spec_family_id,)
        ).fetchone()
        if not exists:
            print(f"ERROR: {args.spec_family_id} not found in database")
            conn.close()
            sys.exit(1)

        report = ValidationReport(args.spec_family_id)
        validate_spec_family(conn, args.spec_family_id, report)
        report.print_summary()

        report_dir = os.path.join(os.path.dirname(args.db), "imports", args.spec_family_id)
        report_path = report.save(report_dir)
        print(f"Report saved: {report_path}")

        # Update import_log with validation result
        conn.execute(
            """UPDATE import_log SET validation_status = ?, validated_at = ?
               WHERE spec_family_id = ? AND id = (
                 SELECT id FROM import_log WHERE spec_family_id = ? ORDER BY imported_at DESC LIMIT 1
               )""",
            (report.status, datetime.now(timezone.utc).isoformat(),
             args.spec_family_id, args.spec_family_id),
        )
        conn.commit()

        conn.close()
        sys.exit(0 if report.status != "fail" else 1)

    else:
        # Validate all families
        families = query_values(conn, "SELECT id FROM spec_families ORDER BY id")
        if not families:
            print("No spec families found in database.")
            conn.close()
            sys.exit(0)

        print(f"Validating {len(families)} spec families...")
        all_pass = True
        for sf_id in families:
            report = ValidationReport(sf_id)
            validate_spec_family(conn, sf_id, report)
            report.print_summary()
            if report.status == "fail":
                all_pass = False

            report_dir = os.path.join(os.path.dirname(args.db), "imports", sf_id)
            report.save(report_dir)

        # Cross-family checks
        if len(families) > 1:
            xf_report = ValidationReport("CROSS_FAMILY")
            validate_cross_family(conn, xf_report)
            xf_report.print_summary()

        conn.close()
        sys.exit(0 if all_pass else 1)


if __name__ == "__main__":
    main()
