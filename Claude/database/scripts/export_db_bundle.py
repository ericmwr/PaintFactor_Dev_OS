#!/usr/bin/env python3
"""
export_db_bundle.py - Export PaintFactor DB tables as embeddable JS constant.

Reads from paintfactor.db and outputs a JS file containing:
  const DB_BUNDLE = { spec_families:[...], sop_modules:[...], ... _meta:{...} };

Usage:
  python export_db_bundle.py                    # prints to stdout
  python export_db_bundle.py > db_bundle.js     # write to file
  python export_db_bundle.py --embed            # outputs just the data (no const wrapper)
  python export_db_bundle.py --db path/to/db    # specify database path
"""

import sqlite3
import json
import sys
import os
from datetime import datetime

# Resolve DB path relative to this script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(SCRIPT_DIR, '..', 'paintfactor.db')

# Tables and columns to export (only what the estimation engine needs)
EXPORT_SPEC = {
    'spec_families': [
        'id', 'name', 'domain', 'version', 'status'
    ],
    'sop_modules': [
        'id', 'spec_family_id', 'name', 'phase', 'applies_when', 'sort_order'
    ],
    'sop_tasks': [
        'id', 'spec_family_id', 'module_id', 'name', 'task_classification',
        'skill_level', 'applies_when', 'appears_in_tiers', 'sort_order',
        'protection_metadata'
    ],
    'task_production_rates': [
        'spec_family_id', 'task_id', 'unit_of_measure',
        'paintscope_key', 'rate_per_hour', 'rates_by_tier',
        'fixed_minutes', 'fixed_minutes_by_tier', 'crew_size', 'applies_when'
    ],
    'factor_modifiers': [
        'id', 'spec_family_id', 'modifier_category', 'name',
        'modifier_type', 'time_modifier', 'value', 'condition'
    ],
    'quality_tier_effects': [
        'spec_family_id', 'quality_tier', 'time_modifier'
    ],
    'spec_required_inputs': [
        'spec_family_id', 'paintscope_key', 'uom', 'is_required'
    ],
    'material_systems': [
        'id', 'spec_family_id', 'name', 'applies_when', 'allowed_sheens'
    ],
    'material_system_products': [
        'spec_family_id', 'system_id', 'product_role', 'product_type',
        'sheen', 'coats_required'
    ],
    'material_coverage_profiles': [
        'id', 'spec_family_id', 'material_system', 'product_role', 'surface_texture',
        'coverage_sf_per_gallon', 'coverage_range_low', 'coverage_range_high'
    ],
    'spec_protection_zones': [
        'spec_family_id', 'zone_id', 'protection_level',
        'upgrades_to_zone', 'upgrades_to_level'
    ],
}

# JSON columns that should be parsed from strings to objects
JSON_COLUMNS = {
    'applies_when', 'appears_in_tiers', 'rates_by_tier',
    'fixed_minutes_by_tier', 'condition', 'allowed_sheens', 'material_system',
    'protection_metadata'
}


def strip_notes_from_rates_by_tier(val):
    """Remove verbose 'notes' keys from rates_by_tier JSON to save ~75KB."""
    if not isinstance(val, dict):
        return val
    cleaned = {}
    for tier, tier_data in val.items():
        if isinstance(tier_data, dict):
            cleaned[tier] = {k: v for k, v in tier_data.items() if k != 'notes'}
        else:
            cleaned[tier] = tier_data
    return cleaned


def export_table(cursor, table_name, columns):
    """Export a table as a list of dicts, parsing JSON columns."""
    col_list = ', '.join(columns)
    rows = cursor.execute(f'SELECT {col_list} FROM {table_name}').fetchall()

    result = []
    for row in rows:
        obj = {}
        for i, col in enumerate(columns):
            val = row[i]
            # Parse JSON string columns into actual objects
            if col in JSON_COLUMNS and val is not None:
                try:
                    val = json.loads(val)
                except (json.JSONDecodeError, TypeError):
                    pass  # Keep as string if not valid JSON
            # Strip notes from rates_by_tier to save space
            if col == 'rates_by_tier' and isinstance(val, dict):
                val = strip_notes_from_rates_by_tier(val)
            obj[col] = val
        # Strip null values to reduce size
        obj = {k: v for k, v in obj.items() if v is not None}
        result.append(obj)

    return result


def main():
    embed_mode = '--embed' in sys.argv
    db_path = DB_PATH

    # Allow --db override
    if '--db' in sys.argv:
        idx = sys.argv.index('--db')
        db_path = sys.argv[idx + 1]

    if not os.path.exists(db_path):
        print(f"ERROR: Database not found at {db_path}", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    bundle = {}
    total_rows = 0

    for table_name, columns in EXPORT_SPEC.items():
        data = export_table(cursor, table_name, columns)
        bundle[table_name] = data
        total_rows += len(data)
        print(f"  Exported {table_name}: {len(data)} rows", file=sys.stderr)

    conn.close()

    # Add metadata
    bundle['_meta'] = {
        'exported_at': datetime.now().isoformat(),
        'source_db': os.path.basename(db_path),
        'total_rows': total_rows,
        'tables': {k: len(v) for k, v in bundle.items() if k != '_meta'}
    }

    # Output
    json_str = json.dumps(bundle, indent=None, separators=(',', ':'))

    if embed_mode:
        print(json_str)
    else:
        print(f'// PaintFactor DB Bundle - Auto-generated {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        print(f'// Total: {total_rows} rows across {len(EXPORT_SPEC)} tables')
        print(f'// Source: {os.path.basename(db_path)}')
        print(f'const DB_BUNDLE = {json_str};')

    print(f"\nDone: {total_rows} rows exported.", file=sys.stderr)


if __name__ == '__main__':
    main()
