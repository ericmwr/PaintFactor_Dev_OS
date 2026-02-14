"""
PaintFactor Estimation Engine
=============================
Single-file, deterministic estimation pipeline.

Takes project inputs (PaintScope geometry + estimator configuration) and a SQLite
database path, returns fully resolved task lists with calculated labor hours and
material quantities.

Design principles:
  - Deterministic: same inputs -> same numbers, always.
  - Functional pipeline: each step is a pure function.
  - Database is the authority: no hard-coded rates, tasks, or modifiers.
  - Fail loud: missing data produces errors, not silent zeros.

Pipeline steps (per surface):
  1. Validate required PaintScope inputs are present
  2. Resolve spec variant matching config dimensions
  3. Resolve task list (modules + tasks, filtered by applies_when)
  4. Apply finish group rules (skip/include adjacency tasks, continuity modifiers)
  5. Calculate labor: hours = quantity / (base_rate / modifier_stack)
  6. Calculate materials: gallons = (SF * coats) / spread_rate
  7. Aggregate into surface estimate

Usage:
  python estimate.py                          # run bedroom smoke test
  python estimate.py --db path/to/db.db       # specify database path

Version: 0.1.0
"""

from __future__ import annotations

import json
import math
import os
import sqlite3
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


# ============================================================
# Section 1: Data Structures
# ============================================================

@dataclass(frozen=True)
class SurfaceInput:
    """One surface the estimator wants to paint."""
    spec_family_id: str
    room_id: str
    quantities: dict[str, float]      # PaintScope key -> measured value
    config: dict[str, str]            # dimension -> value (quality_tier, application_method, finish_sheen, etc.)
    finish_group: str = "FG_DEFAULT"  # opaque finish group ID for adjacency logic
    modifiers: dict[str, str] = field(default_factory=dict)  # modifier_category -> value_id


@dataclass(frozen=True)
class ProjectInput:
    """Everything the engine needs to produce an estimate."""
    surfaces: list[SurfaceInput]


@dataclass(frozen=True)
class ResolvedTask:
    """One task with all numbers calculated."""
    task_id: str
    task_name: str
    spec_family_id: str
    room_id: str
    phase: str
    uom: str
    paintscope_key: str | None
    quantity: float
    base_rate: float | None       # units/hr for rate-based tasks
    fixed_minutes: float | None   # minutes for fixed-time tasks
    modifier_stack: dict[str, float]
    total_modifier: float
    effective_rate: float | None  # base_rate / total_modifier
    hours: float


@dataclass(frozen=True)
class MaterialLine:
    """One material quantity line."""
    system_id: str
    system_name: str
    product_role: str
    coats: int
    spread_rate: float   # SF per gallon
    surface_sf: float
    gallons: float


@dataclass(frozen=True)
class SurfaceEstimate:
    """Complete estimate for one surface."""
    spec_family_id: str
    room_id: str
    config: dict[str, str]
    tasks: list[ResolvedTask]
    materials: list[MaterialLine]
    total_hours: float
    total_gallons: float
    hours_by_phase: dict[str, float]
    warnings: list[str]
    errors: list[str]


@dataclass(frozen=True)
class ProjectEstimate:
    """Top-level output."""
    surfaces: list[SurfaceEstimate]
    total_hours: float
    total_gallons: float
    hours_by_phase: dict[str, float]
    hours_by_room: dict[str, float]
    warnings: list[str]
    errors: list[str]


# ============================================================
# Section 2: Database Query Functions
# ============================================================

def _json_array_contains(json_str: str | None, value: str) -> bool:
    """Check if a JSON array string contains a value."""
    if json_str is None:
        return False
    try:
        arr = json.loads(json_str)
        return value in arr
    except (json.JSONDecodeError, TypeError):
        return False


def _applies_when_matches(applies_when_json: str | None, config: dict[str, str]) -> bool:
    """Check if an applies_when JSON object matches the given config.

    Rules:
      - NULL or empty applies_when -> matches everything (universal)
      - For each key in applies_when, the config must contain a matching value
      - applies_when values are arrays: config value must be IN the array
      - If a config dimension isn't mentioned in applies_when, it's unconstrained
    """
    if applies_when_json is None:
        return True
    try:
        aw = json.loads(applies_when_json)
    except (json.JSONDecodeError, TypeError):
        return True
    if not aw or not isinstance(aw, dict):
        return True

    for dimension, allowed_values in aw.items():
        if not isinstance(allowed_values, list):
            continue
        config_value = config.get(dimension)
        if config_value is None:
            # Config doesn't specify this dimension -- unconstrained
            continue
        if config_value not in allowed_values:
            return False
    return True


def get_required_inputs(conn: sqlite3.Connection, spec_family_id: str,
                        config: dict[str, str]) -> list[dict]:
    """Return required PaintScope keys for this spec + config."""
    rows = conn.execute(
        """SELECT input_name, paintscope_key, uom, is_required, required_when
           FROM spec_required_inputs
           WHERE spec_family_id = ?""",
        (spec_family_id,),
    ).fetchall()

    result = []
    for r in rows:
        required_when = r["required_when"]
        is_required = r["is_required"]
        # If required_when is set, check if it matches config
        if required_when:
            if not _applies_when_matches(required_when, config):
                continue  # This input is not required for this config
        if is_required == 0 and not required_when:
            continue  # Optional and no conditional -> skip
        result.append(dict(r))
    return result


def resolve_variant(conn: sqlite3.Connection, spec_family_id: str,
                    config: dict[str, str]) -> dict | None:
    """Find the variant matching the given config dimensions."""
    rows = conn.execute(
        """SELECT id, applies_when, coats_primer, coats_finish, round_id, protection_zones, notes
           FROM spec_variants
           WHERE spec_family_id = ?""",
        (spec_family_id,),
    ).fetchall()

    for r in rows:
        if _applies_when_matches(r["applies_when"], config):
            return dict(r)
    return None


def resolve_task_list(conn: sqlite3.Connection, spec_family_id: str,
                      config: dict[str, str]) -> list[dict]:
    """Return ordered task list filtered by quality_tier + application_method.

    Filtering logic (proven in Phase 1 SQL):
      - Module applies_when must match config (or be NULL)
      - Task appears_in_tiers must include the quality tier
      - Task applies_when must match config (or be NULL)
    """
    rows = conn.execute(
        """SELECT
               m.phase,
               m.id AS module_id,
               m.name AS module_name,
               m.applies_when AS module_applies_when,
               t.id AS task_id,
               t.name AS task_name,
               t.task_classification,
               t.applies_when AS task_applies_when,
               t.appears_in_tiers,
               t.adjacency_metadata,
               t.protection_metadata,
               m.sort_order AS module_sort,
               t.sort_order AS task_sort
           FROM sop_modules m
           JOIN sop_tasks t ON m.id = t.module_id AND m.spec_family_id = t.spec_family_id
           WHERE m.spec_family_id = ?
           ORDER BY m.sort_order, t.sort_order""",
        (spec_family_id,),
    ).fetchall()

    qt = config.get("quality_tier", "")
    result = []

    for r in rows:
        # Module-level filter
        if not _applies_when_matches(r["module_applies_when"], config):
            continue

        # Task must appear in this quality tier
        if r["appears_in_tiers"]:
            if not _json_array_contains(r["appears_in_tiers"], qt):
                continue

        # Task-level applies_when filter
        if not _applies_when_matches(r["task_applies_when"], config):
            continue

        result.append(dict(r))

    return result


def get_production_rate(conn: sqlite3.Connection, spec_family_id: str,
                        task_id: str, config: dict[str, str]) -> dict | None:
    """Return the production rate row for a task, filtered by config.

    Some tasks have multiple rate rows with different applies_when
    (e.g., smooth vs textured). We return the first match.
    """
    rows = conn.execute(
        """SELECT task_id, name, unit_of_measure, paintscope_key,
                  rate_per_hour, rate_range_low, rate_range_high,
                  rates_by_tier,
                  fixed_minutes, fixed_minutes_by_tier,
                  crew_size, applies_when
           FROM task_production_rates
           WHERE spec_family_id = ? AND task_id = ?""",
        (spec_family_id, task_id),
    ).fetchall()

    for r in rows:
        if _applies_when_matches(r["applies_when"], config):
            return dict(r)

    # No matching rate found
    return None


def get_modifier_value(conn: sqlite3.Connection, spec_family_id: str,
                       modifier_id: str) -> float | None:
    """Return the time_modifier value for a specific modifier."""
    row = conn.execute(
        """SELECT time_modifier FROM factor_modifiers
           WHERE spec_family_id = ? AND id = ?""",
        (spec_family_id, modifier_id),
    ).fetchone()
    if row and row["time_modifier"] is not None:
        return row["time_modifier"]
    return None


def get_all_modifiers_by_category(conn: sqlite3.Connection,
                                  spec_family_id: str) -> dict[str, list[dict]]:
    """Return all modifiers grouped by category."""
    rows = conn.execute(
        """SELECT id, modifier_category, name, time_modifier, value, condition
           FROM factor_modifiers
           WHERE spec_family_id = ?
           ORDER BY modifier_category, id""",
        (spec_family_id,),
    ).fetchall()

    result: dict[str, list[dict]] = {}
    for r in rows:
        cat = r["modifier_category"]
        if cat not in result:
            result[cat] = []
        result[cat].append(dict(r))
    return result


def get_material_system(conn: sqlite3.Connection, spec_family_id: str,
                        config: dict[str, str]) -> dict | None:
    """Resolve the material system for the given sheen + quality tier."""
    rows = conn.execute(
        """SELECT ms.id, ms.name, ms.applies_when, ms.allowed_sheens,
                  msp.product_role, msp.product_type, msp.coats_required, msp.sheen
           FROM material_systems ms
           LEFT JOIN material_system_products msp
             ON ms.id = msp.system_id AND ms.spec_family_id = msp.spec_family_id
           WHERE ms.spec_family_id = ?""",
        (spec_family_id,),
    ).fetchall()

    for r in rows:
        if _applies_when_matches(r["applies_when"], config):
            return dict(r)
    return None


def get_coverage_profile(conn: sqlite3.Connection, spec_family_id: str,
                         system_id: str, texture: str) -> dict | None:
    """Return coverage SF/gal for the given system + texture.

    The material_system column in coverage_profiles is a JSON array of system IDs.
    """
    rows = conn.execute(
        """SELECT id, material_system, product_role, surface_texture,
                  coverage_sf_per_gallon, coverage_range_low, coverage_range_high
           FROM material_coverage_profiles
           WHERE spec_family_id = ?""",
        (spec_family_id,),
    ).fetchall()

    for r in rows:
        # Check system match (material_system is a JSON array)
        ms_raw = r["material_system"]
        if ms_raw:
            try:
                systems = json.loads(ms_raw) if isinstance(ms_raw, str) else [ms_raw]
            except json.JSONDecodeError:
                systems = [ms_raw]
            if system_id not in systems:
                continue

        # Check texture match (can be a string or JSON array)
        tex_raw = r["surface_texture"]
        if tex_raw:
            try:
                textures = json.loads(tex_raw) if tex_raw.startswith("[") else [tex_raw]
            except (json.JSONDecodeError, AttributeError):
                textures = [tex_raw]
            if texture not in textures:
                continue

        return dict(r)
    return None


# ============================================================
# Section 3: Pipeline Functions
# ============================================================

# Modifier ID mapping: maps config values to modifier IDs in the database.
# The engine needs to translate e.g. "standard" height to "H1_STANDARD".
# This is a lightweight lookup -- the actual multiplier comes from the DB.
HEIGHT_MODIFIER_MAP = {
    "standard": "H1_STANDARD",
    "tall": "H2_TALL",
    "high": "H3_HIGH",
    "extreme": "H4_EXTREME",
}

TEXTURE_MODIFIER_MAP = {
    "smooth": "TEX_SMOOTH",
    "orange_peel": "TEX_ORANGE_PEEL",
    "knockdown": "TEX_KNOCKDOWN",
}

QT_MODIFIER_MAP = {
    "QT2": "QT2_MINIMAL",
    "QT3": "QT3_STANDARD",
    "QT4": "QT4_PREMIUM",
    "QT5": "QT5_SUPERIOR",
}

SHEEN_MODIFIER_MAP = {
    "flat": "SHEEN_FLAT_MATTE",
    "matte": "SHEEN_FLAT_MATTE",
    "eggshell": "SHEEN_EGGSHELL",
    "satin": "SHEEN_SATIN",
    "semi-gloss": "SHEEN_SEMI_GLOSS",
}

# Spray waste factor -- doctrine gap, hardcoded until resolved
# TODO: Move to database once doctrine decision is made (Gap 4/6)
SPRAY_LOSS_FACTOR = 0.05


def validate_inputs(conn: sqlite3.Connection,
                    surface: SurfaceInput) -> list[str]:
    """Check that all required PaintScope keys are present. Return error strings."""
    errors = []
    required = get_required_inputs(conn, surface.spec_family_id, surface.config)

    for req in required:
        ps_key = req["paintscope_key"]
        if ps_key not in surface.quantities:
            errors.append(
                f"Missing required PaintScope key: {ps_key} "
                f"(input: {req['input_name']}, spec: {surface.spec_family_id})"
            )
    return errors


def resolve_tasks(conn: sqlite3.Connection,
                  surface: SurfaceInput) -> tuple[list[dict], list[str]]:
    """Resolve spec variant -> task list.

    Returns (tasks, warnings).
    """
    warnings = []

    # Resolve variant
    variant = resolve_variant(conn, surface.spec_family_id, surface.config)
    if variant is None:
        warnings.append(
            f"No variant matched for {surface.spec_family_id} "
            f"with config {surface.config}"
        )

    # Resolve task list
    tasks = resolve_task_list(conn, surface.spec_family_id, surface.config)

    if not tasks:
        warnings.append(
            f"No tasks resolved for {surface.spec_family_id} "
            f"with config {surface.config}"
        )

    return tasks, warnings


def build_modifier_stack(conn: sqlite3.Connection,
                         surface: SurfaceInput) -> tuple[dict[str, float], list[str]]:
    """Build the modifier stack from surface config + modifiers.

    Returns (modifier_dict, warnings).

    Per Estimation_Modifiers_Doctrine.md:
      - All modifiers are TIME MULTIPLIERS
      - Modifier > 1.0 = more time (slower)
      - Stack multiplicatively: total = m1 * m2 * m3 * ...
    """
    stack: dict[str, float] = {}
    warnings: list[str] = []
    sf_id = surface.spec_family_id

    # Height modifier
    height_val = surface.modifiers.get("wall_height", "standard")
    height_id = HEIGHT_MODIFIER_MAP.get(height_val)
    if height_id:
        mod = get_modifier_value(conn, sf_id, height_id)
        if mod is not None:
            stack["height"] = mod
        else:
            warnings.append(f"Height modifier {height_id} not found in DB for {sf_id}")

    # Texture modifier
    texture_val = surface.modifiers.get("surface_texture",
                                        surface.config.get("surface_texture", "smooth"))
    texture_id = TEXTURE_MODIFIER_MAP.get(texture_val)
    if texture_id:
        mod = get_modifier_value(conn, sf_id, texture_id)
        if mod is not None:
            stack["texture"] = mod

    # Quality tier modifier
    qt_val = surface.config.get("quality_tier", "QT3")
    qt_id = QT_MODIFIER_MAP.get(qt_val)
    if qt_id:
        mod = get_modifier_value(conn, sf_id, qt_id)
        if mod is not None:
            stack["quality_tier"] = mod

    # Sheen modifier
    sheen_val = surface.config.get("finish_sheen", "eggshell")
    sheen_id = SHEEN_MODIFIER_MAP.get(sheen_val)
    if sheen_id:
        mod = get_modifier_value(conn, sf_id, sheen_id)
        if mod is not None:
            stack["sheen"] = mod

    # Check for dangerous stacking
    total = math.prod(stack.values()) if stack else 1.0
    if total > 4.0:
        warnings.append(
            f"Modifier stack = {total:.2f} exceeds 4.0 threshold "
            f"for {sf_id}: {stack}"
        )

    return stack, warnings


def _lookup_quantity(surface: SurfaceInput, paintscope_key: str | None,
                     uom: str) -> float | None:
    """Look up the quantity from PaintScope inputs for a given task."""
    if paintscope_key and paintscope_key in surface.quantities:
        return surface.quantities[paintscope_key]
    return None


def calculate_labor(conn: sqlite3.Connection, tasks: list[dict],
                    surface: SurfaceInput,
                    modifier_stack: dict[str, float]) -> tuple[list[ResolvedTask], list[str]]:
    """Calculate labor hours for each resolved task.

    For rate-based tasks:  hours = quantity / (base_rate / total_modifier)
    For fixed-time tasks:  hours = fixed_minutes / 60
    """
    resolved: list[ResolvedTask] = []
    errors: list[str] = []
    total_modifier = math.prod(modifier_stack.values()) if modifier_stack else 1.0

    for task in tasks:
        task_id = task["task_id"]

        # Get production rate
        rate_row = get_production_rate(
            conn, surface.spec_family_id, task_id, surface.config
        )

        if rate_row is None:
            errors.append(
                f"No production rate found for task {task_id} "
                f"in {surface.spec_family_id} with config {surface.config}"
            )
            continue

        uom = rate_row["unit_of_measure"]
        ps_key = rate_row["paintscope_key"]
        base_rate = rate_row["rate_per_hour"]
        fixed_min = rate_row["fixed_minutes"]

        # Calculate hours
        if fixed_min is not None:
            # Fixed-time task (e.g., clean tools = 25 min)
            hours = fixed_min / 60.0
            quantity = 1.0
            effective_rate = None
        elif base_rate is not None:
            # Rate-based task
            quantity = _lookup_quantity(surface, ps_key, uom)
            if quantity is None:
                errors.append(
                    f"Task {task_id} requires PaintScope key {ps_key} "
                    f"but it was not provided for {surface.spec_family_id}"
                )
                continue
            effective_rate = base_rate / total_modifier
            hours = quantity / effective_rate
        else:
            errors.append(
                f"Task {task_id} has neither rate_per_hour nor fixed_minutes"
            )
            continue

        resolved.append(ResolvedTask(
            task_id=task_id,
            task_name=task["task_name"],
            spec_family_id=surface.spec_family_id,
            room_id=surface.room_id,
            phase=task["phase"],
            uom=uom,
            paintscope_key=ps_key,
            quantity=quantity,
            base_rate=base_rate,
            fixed_minutes=fixed_min,
            modifier_stack=modifier_stack,
            total_modifier=total_modifier,
            effective_rate=effective_rate if base_rate else None,
            hours=hours,
        ))

    return resolved, errors


def calculate_materials(conn: sqlite3.Connection,
                        surface: SurfaceInput) -> tuple[list[MaterialLine], list[str]]:
    """Calculate material quantities (gallons of paint).

    Formula: gallons = (SF * coats) / spread_rate
    For spray methods, adds loss factor.
    """
    results: list[MaterialLine] = []
    warnings: list[str] = []

    # Resolve material system
    mat_system = get_material_system(
        conn, surface.spec_family_id, surface.config
    )
    if mat_system is None:
        warnings.append(
            f"No material system found for {surface.spec_family_id} "
            f"with config {surface.config}"
        )
        return results, warnings

    system_id = mat_system["id"]
    system_name = mat_system["name"]
    product_role = mat_system["product_role"] or "finish"
    coats = mat_system["coats_required"]

    if coats is None:
        warnings.append(
            f"coats_required is NULL for material system {system_id}. Defaulting to 2."
        )
        coats = 2

    # Get coverage profile
    texture = surface.config.get("surface_texture", "smooth")
    coverage = get_coverage_profile(
        conn, surface.spec_family_id, system_id, texture
    )
    if coverage is None:
        warnings.append(
            f"No coverage profile for {system_id} + {texture}. "
            f"Cannot calculate material quantity."
        )
        return results, warnings

    spread_rate = coverage["coverage_sf_per_gallon"]
    if not spread_rate or spread_rate <= 0:
        warnings.append(f"Invalid spread rate {spread_rate} for {system_id}")
        return results, warnings

    # Get surface area -- find the primary SF key
    surface_sf = None
    for key, val in surface.quantities.items():
        if "SURFACE_SF" in key and "WALL" in key:
            surface_sf = val
            break
        elif "SURFACE_SF" in key and "CEILING" in key:
            surface_sf = val
            break

    if surface_sf is None:
        # Fall back to any SF key
        for key, val in surface.quantities.items():
            if "SF" in key and "PROTECT" not in key and "META" not in key:
                surface_sf = val
                break

    if surface_sf is None:
        warnings.append(
            f"No surface SF quantity found for material calculation "
            f"in {surface.spec_family_id}"
        )
        return results, warnings

    # Calculate gallons
    gallons = (surface_sf * coats) / spread_rate

    # Apply spray loss factor
    method = surface.config.get("application_method", "roll")
    if method in ("spray", "spray_backroll"):
        gallons = gallons / (1.0 - SPRAY_LOSS_FACTOR)

    results.append(MaterialLine(
        system_id=system_id,
        system_name=system_name,
        product_role=product_role,
        coats=coats,
        spread_rate=spread_rate,
        surface_sf=surface_sf,
        gallons=gallons,
    ))

    return results, warnings


def estimate_surface(conn: sqlite3.Connection,
                     surface: SurfaceInput) -> SurfaceEstimate:
    """Run the full pipeline for one surface."""
    all_warnings: list[str] = []
    all_errors: list[str] = []

    # Step 1: Validate inputs
    input_errors = validate_inputs(conn, surface)
    all_errors.extend(input_errors)

    # Step 2-3: Resolve tasks
    tasks, task_warnings = resolve_tasks(conn, surface)
    all_warnings.extend(task_warnings)

    # Step 4: Build modifier stack
    modifier_stack, mod_warnings = build_modifier_stack(conn, surface)
    all_warnings.extend(mod_warnings)

    # Step 5: Calculate labor
    resolved_tasks, labor_errors = calculate_labor(
        conn, tasks, surface, modifier_stack
    )
    all_errors.extend(labor_errors)

    # Step 6: Calculate materials
    materials, mat_warnings = calculate_materials(conn, surface)
    all_warnings.extend(mat_warnings)

    # Aggregate
    total_hours = sum(t.hours for t in resolved_tasks)
    total_gallons = sum(m.gallons for m in materials)
    hours_by_phase: dict[str, float] = {}
    for t in resolved_tasks:
        hours_by_phase[t.phase] = hours_by_phase.get(t.phase, 0.0) + t.hours

    return SurfaceEstimate(
        spec_family_id=surface.spec_family_id,
        room_id=surface.room_id,
        config=surface.config,
        tasks=resolved_tasks,
        materials=materials,
        total_hours=total_hours,
        total_gallons=total_gallons,
        hours_by_phase=hours_by_phase,
        warnings=all_warnings,
        errors=all_errors,
    )


# ============================================================
# Section 4: Top-Level Entry Point
# ============================================================

def estimate_project(db_path: str, project: ProjectInput) -> ProjectEstimate:
    """Main entry point. Opens DB, estimates each surface, aggregates."""
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")

    all_surfaces: list[SurfaceEstimate] = []
    all_warnings: list[str] = []
    all_errors: list[str] = []

    for surface in project.surfaces:
        est = estimate_surface(conn, surface)
        all_surfaces.append(est)
        all_warnings.extend(est.warnings)
        all_errors.extend(est.errors)

    conn.close()

    # Aggregate across surfaces
    total_hours = sum(s.total_hours for s in all_surfaces)
    total_gallons = sum(s.total_gallons for s in all_surfaces)

    hours_by_phase: dict[str, float] = {}
    for s in all_surfaces:
        for phase, hrs in s.hours_by_phase.items():
            hours_by_phase[phase] = hours_by_phase.get(phase, 0.0) + hrs

    hours_by_room: dict[str, float] = {}
    for s in all_surfaces:
        hours_by_room[s.room_id] = hours_by_room.get(s.room_id, 0.0) + s.total_hours

    return ProjectEstimate(
        surfaces=all_surfaces,
        total_hours=total_hours,
        total_gallons=total_gallons,
        hours_by_phase=hours_by_phase,
        hours_by_room=hours_by_room,
        warnings=all_warnings,
        errors=all_errors,
    )


# ============================================================
# Smoke Test: Simple Bedroom
# ============================================================

def _smoke_test_bedroom(db_path: str) -> None:
    """Run the bedroom scenario we proved in Phase 1 SQL testing.

    Room: 12x14, 8ft walls, 1 standard door opening
    Config: QT3, spray, eggshell, smooth drywall, standard height
    Spec: SF_DRYWALL_WALL_NC_FINISH (finish coat only)

    Expected: ~19 tasks, ~6.16 hours, ~1.98 gallons (before spray loss)
    """
    print("=" * 70)
    print("SMOKE TEST: Simple Bedroom — SF_DRYWALL_WALL_NC_FINISH")
    print("  Room: 12x14, 8ft walls, 1 door opening")
    print("  Config: QT3, spray, eggshell, smooth, standard height")
    print("=" * 70)

    # PaintScope geometry for this bedroom
    #   Wall perimeter: 2*(12+14) = 52 LF
    #   Gross wall SF: 52 * 8 = 416 SF
    #   Door opening deduction: ~21 SF (3x7)
    #   Net wall SF: 416 - 21 = 395 SF
    #   Baseboard LF: ~52 LF (perimeter minus door opening ~3ft = 49, but use 52 for room total)
    #   Door casing LF: ~17 LF (3+7+7)
    #   Total trim edges: 52 + 17 = 69 LF
    #   Floor area: 12*14 = 168 SF

    surface = SurfaceInput(
        spec_family_id="SF_DRYWALL_WALL_NC_FINISH",
        room_id="bedroom_1",
        quantities={
            "PS_SURFACE_SF.WALL_FIELD": 395.0,
            "PS_EDGE_LF.TO_CEILING": 52.0,
            "PS_PROTECT_LF.TRIM_EDGES": 69.0,
            "PS_META.SF.FLOOR_VACUUM_AREA": 168.0,
            "PS_PROTECT_SF.FLOOR_EXPOSED": 168.0,
            "PS_META.EA.ROOMS_TOTAL": 1.0,
        },
        config={
            "quality_tier": "QT3",
            "application_method": "spray",
            "finish_sheen": "eggshell",
            "surface_texture": "smooth",
        },
        finish_group="FG_WALLS",
        modifiers={
            "wall_height": "standard",
            "surface_texture": "smooth",
        },
    )

    project = ProjectInput(surfaces=[surface])
    result = estimate_project(db_path, project)

    # Print results
    print()
    for se in result.surfaces:
        print(f"Spec: {se.spec_family_id}")
        print(f"Room: {se.room_id}")
        print(f"Config: {se.config}")
        print()

        # Task table
        print(f"{'Phase':<10} {'Task':<45} {'UOM':<8} {'Qty':>8} {'Rate':>8} {'Hours':>7}")
        print("-" * 90)
        for t in se.tasks:
            qty_str = f"{t.quantity:.0f}" if t.quantity != 1.0 or t.fixed_minutes else "-"
            rate_str = f"{t.base_rate:.0f}" if t.base_rate else f"{t.fixed_minutes:.0f}m"
            print(f"{t.phase:<10} {t.task_name:<45} {t.uom:<8} {qty_str:>8} {rate_str:>8} {t.hours:>7.3f}")

        print("-" * 90)
        print(f"{'TOTAL':>71} {se.total_hours:>7.3f} hrs")
        print()

        # Phase breakdown
        print("Hours by phase:")
        for phase, hrs in sorted(se.hours_by_phase.items(),
                                 key=lambda x: ["setup", "prep", "apply", "cleanup"].index(x[0])
                                 if x[0] in ["setup", "prep", "apply", "cleanup"] else 99):
            print(f"  {phase:<12} {hrs:.3f} hrs")
        print()

        # Modifier stack
        if se.tasks:
            t0 = se.tasks[0]
            print(f"Modifier stack: {t0.modifier_stack}")
            print(f"Total modifier: {t0.total_modifier:.4f}")
            print()

        # Materials
        if se.materials:
            print("Materials:")
            for m in se.materials:
                print(f"  {m.system_name}: {m.coats} coats x {m.surface_sf:.0f} SF "
                      f"/ {m.spread_rate:.0f} SF/gal = {m.gallons:.2f} gal")
            print()

        # Warnings/Errors
        if se.warnings:
            print(f"Warnings ({len(se.warnings)}):")
            for w in se.warnings:
                print(f"  [!] {w}")
            print()
        if se.errors:
            print(f"ERRORS ({len(se.errors)}):")
            for e in se.errors:
                print(f"  [X] {e}")
            print()

    print("=" * 70)
    print(f"PROJECT TOTAL: {result.total_hours:.3f} hours, {result.total_gallons:.2f} gallons")
    print("=" * 70)


if __name__ == "__main__":
    # Resolve database path
    if "--db" in sys.argv:
        idx = sys.argv.index("--db")
        db_path = sys.argv[idx + 1]
    else:
        # Default: relative to this script
        engine_dir = Path(__file__).parent
        db_path = str(engine_dir.parent / "database" / "paintfactor.db")

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}")
        sys.exit(1)

    _smoke_test_bedroom(db_path)
