#!/usr/bin/env python3
"""
PaintFactor DB Validator
Post-import integrity checker for the PaintFactor SQLite database.

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
            d["affected_rows"] = self.affected_rows[:20]  # Limit output
        return d


class ValidationReport:
    def __init__(self, spec_family_id=None):
        self.spec_family_id = spec_family_id or "ALL"
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
        has_any_fail = any(c.status == "fail" for c in self.checks)
        has_warning = any(c.status == "warning" for c in self.checks)

        if has_critical_fail:
            return "fail"
        if has_major_fail or has_warning:
            return "pass_with_warnings"
        return "pass"

    def to_dict(self):
        return {
            "spec_family_id": self.spec_family_id,
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
                    icon = "❌" if c.status == "fail" else "⚠️"
                    print(f"  {icon} [{c.severity.upper()}] {c.check_id}: {c.details}")
                    if c.affected_rows:
                        for row in c.affected_rows[:5]:
                            print(f"      → {row}")
                        if len(c.affected_rows) > 5:
                            print(f"      ... and {len(c.affected_rows) - 5} more")
        print(f"{'='*60}")


# ============================================================
# Check helpers
# ============================================================

def query_values(conn, sql, params=()):
    """Execute query and return list of single values."""
    return [r[0] for r in conn.execute(sql, params).fetchall()]


def check_fk(conn, report, check_id, child_table, child_col, parent_table, parent_col, sf_filter=None):
    """Check FK integrity between two tables."""
    if sf_filter:
        sql = f"""SELECT DISTINCT c.{child_col} FROM {child_table} c
                  LEFT JOIN {parent_table} p ON c.{child_col} = p.{parent_col}
                  WHERE c.spec_family_id = ? AND p.{parent_col} IS NULL AND c.{child_col} IS NOT NULL"""
        orphans = query_values(conn, sql, (sf_filter,))
    else:
        sql = f"""SELECT DISTINCT c.{child_col} FROM {child_table} c
                  LEFT JOIN {parent_table} p ON c.{child_col} = p.{parent_col}
                  WHERE p.{parent_col} IS NULL AND c.{child_col} IS NOT NULL"""
        orphans = query_values(conn, sql)

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
    count = conn.execute(f"SELECT count(*) FROM {table} WHERE spec_family_id = ?", (sf_id,)).fetchone()[0]
    if count < min_count:
        report.add(ValidationResult(
            check_id, "completeness", severity, "fail" if severity == "critical" else "warning",
            f"{label}: expected ≥{min_count}, found {count}",
        ))
    else:
        report.add(ValidationResult(
            check_id, "completeness", severity, "pass",
            f"{label}: {count} rows",
        ))


def check_enum(conn, report, check_id, table, column, valid_values, sf_filter=None):
    """Check that column values are within valid set."""
    if sf_filter:
        sql = f"SELECT DISTINCT {column} FROM {table} WHERE spec_family_id = ? AND {column} IS NOT NULL"
        values = query_values(conn, sql, (sf_filter,))
    else:
        sql = f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL"
        values = query_values(conn, sql)

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


def check_id_pattern(conn, report, check_id, table, column, pattern, sf_filter=None):
    """Check that IDs match expected regex pattern."""
    if sf_filter:
        sql = f"SELECT DISTINCT {column} FROM {table} WHERE spec_family_id = ? AND {column} IS NOT NULL"
        values = query_values(conn, sql, (sf_filter,))
    else:
        sql = f"SELECT DISTINCT {column} FROM {table} WHERE {column} IS NOT NULL"
        values = query_values(conn, sql)

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

    # --- Category 1: FK Integrity ---
    check_fk(conn, report, "FK-001", "spec_configuration_dimensions", "spec_family_id", "spec_families", "id", sf_id)
    check_fk(conn, report, "FK-002", "spec_paintable_item_types", "spec_family_id", "spec_families", "id", sf_id)
    check_fk(conn, report, "FK-003", "spec_variants", "spec_family_id", "spec_families", "id", sf_id)
    check_fk(conn, report, "FK-006", "sop_modules", "spec_family_id", "spec_families", "id", sf_id)

    # Cross-table composite FK checks
    # XF-001: task_production_rates.task_id exists in sop_tasks
    orphan_tasks = query_values(conn,
        """SELECT DISTINCT r.task_id FROM task_production_rates r
           LEFT JOIN sop_tasks t ON r.task_id = t.id AND r.spec_family_id = t.spec_family_id
           WHERE r.spec_family_id = ? AND t.id IS NULL""", (sf_id,))
    if orphan_tasks:
        report.add(ValidationResult("XF-001", "cross_file_threading", "critical", "fail",
            f"task_production_rates references {len(orphan_tasks)} task_ids not in sop_tasks", orphan_tasks))
    else:
        report.add(ValidationResult("XF-001", "cross_file_threading", "critical", "pass",
            "All production rate task_ids exist in sop_tasks"))

    # XF-002: factor_task_applicability.task_id exists in sop_tasks
    orphan_fac_tasks = query_values(conn,
        """SELECT DISTINCT a.task_id FROM factor_task_applicability a
           LEFT JOIN sop_tasks t ON a.task_id = t.id AND a.spec_family_id = t.spec_family_id
           WHERE a.spec_family_id = ? AND t.id IS NULL""", (sf_id,))
    if orphan_fac_tasks:
        report.add(ValidationResult("XF-002", "cross_file_threading", "critical", "fail",
            f"factor_task_applicability references {len(orphan_fac_tasks)} task_ids not in sop_tasks", orphan_fac_tasks))
    else:
        report.add(ValidationResult("XF-002", "cross_file_threading", "critical", "pass",
            "All factor applicability task_ids exist in sop_tasks"))

    # XF-003: sop_tasks.module_id exists in sop_modules
    orphan_mods = query_values(conn,
        """SELECT DISTINCT t.module_id FROM sop_tasks t
           LEFT JOIN sop_modules m ON t.module_id = m.id AND t.spec_family_id = m.spec_family_id
           WHERE t.spec_family_id = ? AND m.id IS NULL""", (sf_id,))
    if orphan_mods:
        report.add(ValidationResult("XF-003", "cross_file_threading", "critical", "fail",
            f"sop_tasks references {len(orphan_mods)} module_ids not in sop_modules", orphan_mods))
    else:
        report.add(ValidationResult("XF-003", "cross_file_threading", "critical", "pass",
            "All task module_ids exist in sop_modules"))

    # --- Category 3: Completeness ---
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

    # CMP-004: Every variant has ≥1 included item
    variants_without_items = query_values(conn,
        """SELECT v.id FROM spec_variants v
           LEFT JOIN spec_variant_item_inclusions i ON v.id = i.variant_id AND v.spec_family_id = i.spec_family_id AND i.is_included = 1
           WHERE v.spec_family_id = ?
           GROUP BY v.id HAVING count(i.id) = 0""", (sf_id,))
    if variants_without_items:
        report.add(ValidationResult("CMP-004", "completeness", "major", "warning",
            f"{len(variants_without_items)} variants have no included items", variants_without_items))
    else:
        report.add(ValidationResult("CMP-004", "completeness", "major", "pass",
            "All variants have ≥1 included item"))

    # CMP-008: Every task has ≥1 production rate
    tasks_without_rates = query_values(conn,
        """SELECT t.id FROM sop_tasks t
           LEFT JOIN task_production_rates r ON t.id = r.task_id AND t.spec_family_id = r.spec_family_id
           WHERE t.spec_family_id = ?
           GROUP BY t.id HAVING count(r.id) = 0""", (sf_id,))
    if tasks_without_rates:
        report.add(ValidationResult("CMP-008", "completeness", "major", "warning",
            f"{len(tasks_without_rates)} tasks have no production rate", tasks_without_rates))
    else:
        report.add(ValidationResult("CMP-008", "completeness", "major", "pass",
            "All tasks have ≥1 production rate"))

    # CMP-009: All 5 artifact types in raw storage
    raw_types = query_values(conn,
        "SELECT DISTINCT artifact_type FROM spec_artifacts_raw WHERE spec_family_id = ?", (sf_id,))
    expected = {"spec", "materials", "sop_modules", "production", "qa_report"}
    missing_types = expected - set(raw_types)
    if missing_types:
        report.add(ValidationResult("CMP-009", "completeness", "critical", "fail",
            f"Missing raw artifacts: {missing_types}", list(missing_types)))
    else:
        report.add(ValidationResult("CMP-009", "completeness", "critical", "pass",
            "All 5 artifact types present in raw storage"))

    # --- Category 4: Enum Validation ---
    check_enum(conn, report, "ENM-001", "spec_families", "domain",
               ["interior", "exterior", "specialty"], sf_id)
    check_enum(conn, report, "ENM-002", "spec_families", "status",
               ["draft", "review_required", "approved", "active", "deprecated"], sf_id)
    check_enum(conn, report, "ENM-003", "sop_modules", "phase",
               ["setup", "prep", "prime", "apply", "interstage", "finish", "cleanup"], sf_id)
    check_enum(conn, report, "ENM-004", "sop_tasks", "task_classification",
               ["binary", "qt_conditional", "qt_scaled"], sf_id)
    check_enum(conn, report, "ENM-006", "spec_qa_reports", "status",
               ["pass", "pass_with_warnings", "fail"], sf_id)

    # --- Category 5: ID Pattern Validation ---
    check_id_pattern(conn, report, "IDP-001", "spec_families", "id", r"^SF_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-002", "sop_modules", "id", r"^MOD_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-003", "sop_tasks", "id", r"^TSK_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-004", "material_systems", "id", r"^SYS_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-005", "material_consumables", "id", r"^CON_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-007", "spec_paintable_item_types", "id", r"^ITM_[A-Z0-9_]+$", sf_id)
    check_id_pattern(conn, report, "IDP-008", "spec_variants", "id", r"^VAR_[A-Z0-9_]+$", sf_id)

    # --- Category 6: Duplicate Detection ---
    # DUP-001: No duplicate task IDs within family
    dup_tasks = query_values(conn,
        """SELECT id FROM sop_tasks WHERE spec_family_id = ?
           GROUP BY id HAVING count(*) > 1""", (sf_id,))
    if dup_tasks:
        report.add(ValidationResult("DUP-001", "duplicates", "critical", "fail",
            f"Duplicate task IDs: {dup_tasks}", dup_tasks))
    else:
        report.add(ValidationResult("DUP-001", "duplicates", "critical", "pass",
            "No duplicate task IDs within spec family"))

    # --- Category 7: Raw Integrity ---
    # RAW-001: All raw JSON is parseable
    raw_rows = conn.execute(
        "SELECT artifact_type, json_content FROM spec_artifacts_raw WHERE spec_family_id = ?", (sf_id,)
    ).fetchall()
    bad_json = []
    for art_type, content in raw_rows:
        try:
            json.loads(content)
        except json.JSONDecodeError:
            bad_json.append(art_type)
    if bad_json:
        report.add(ValidationResult("RAW-001", "raw_integrity", "major", "fail",
            f"Unparseable raw JSON: {bad_json}", bad_json))
    else:
        report.add(ValidationResult("RAW-001", "raw_integrity", "major", "pass",
            "All raw JSON is parseable"))


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
        exists = conn.execute("SELECT id FROM spec_families WHERE id = ?", (args.spec_family_id,)).fetchone()
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

        sys.exit(0 if all_pass else 1)

    conn.close()
    sys.exit(0 if report.status != "fail" else 1)


if __name__ == "__main__":
    main()
