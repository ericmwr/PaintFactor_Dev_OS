#!/usr/bin/env python3
"""Sync one spec's production.json and sop_modules.json to match the engine bundle.

Workflow:
    1. Read current db-bundle.js rates + sop_tasks for the target spec.
    2. Update production.json rate_per_hour / fixed_minutes to bundle values
       (preserving rate_range_low/high scaled proportionally).
    3. Add any bundle-only rate rows with a production.json-shape entry.
    4. Add any bundle-only sop_tasks to the matching module in sop_modules.json.

The script does NOT re-import or re-export the bundle — run those separately
so you control when the DB and bundle change. Typical sequence after running
this script:

    python3 database/scripts/import_spec.py specs/<DIR>/ --reimport
    python3 database/scripts/export_db_bundle.py > tools/paintscope/src/data/db-bundle.js
    python3 database/scripts/export_db_bundle.py > database/exports/db_bundle.js

Usage:
    python3 sync_spec_to_bundle.py <spec_family_id> <spec_dir_name>
    python3 sync_spec_to_bundle.py SF_DRYWALL_CEILING_NC_FINISH SF_DRYWALL_CEILING_NC_FINISH_v1
"""

import json
import re
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent  # Claude/
BUNDLE_PATH = REPO_ROOT / "tools" / "paintscope" / "src" / "data" / "db-bundle.js"
SPECS_DIR = REPO_ROOT / "specs"


def aw_key(aw):
    if not aw:
        return ""
    return json.dumps(
        {k: sorted(v) if isinstance(v, list) else v for k, v in sorted(aw.items())},
        sort_keys=True,
    )


def load_bundle():
    text = BUNDLE_PATH.read_text(encoding="utf-8")
    m = re.search(r"export\s+const\s+DB_BUNDLE\s*=\s*(\{.*\});?\s*$", text, re.DOTALL)
    if not m:
        raise SystemExit(f"Could not parse bundle at {BUNDLE_PATH}")
    return json.loads(m.group(1))


def sync(spec_id: str, spec_dir_name: str):
    spec_dir = SPECS_DIR / spec_dir_name
    if not spec_dir.exists():
        raise SystemExit(f"Spec dir not found: {spec_dir}")

    db = load_bundle()

    bundle_rates = [r for r in db["task_production_rates"] if r["spec_family_id"] == spec_id]
    bundle_by_key = {(r["task_id"], aw_key(r.get("applies_when"))): r for r in bundle_rates}
    bundle_task_by_id = {t["id"]: t for t in db["sop_tasks"] if t["spec_family_id"] == spec_id}

    # ---- production.json ----
    prod_path = spec_dir / "production.json"
    prod = json.loads(prod_path.read_text(encoding="utf-8"))
    prod_rates = prod["task_production_rates"]

    updated = 0
    for r in prod_rates:
        key = (r["task_id"], aw_key(r.get("applies_when")))
        br = bundle_by_key.get(key)
        if not br:
            continue
        old_rph = r.get("rate_per_hour")
        new_rph = br.get("rate_per_hour")
        new_fm = br.get("fixed_minutes")
        if old_rph != new_rph or r.get("fixed_minutes") != new_fm:
            if new_rph is not None:
                if old_rph and r.get("rate_range_low") and r.get("rate_range_high"):
                    factor = new_rph / old_rph
                    r["rate_range_low"] = int(round(r["rate_range_low"] * factor))
                    r["rate_range_high"] = int(round(r["rate_range_high"] * factor))
                r["rate_per_hour"] = new_rph
            if new_fm is not None:
                r["fixed_minutes"] = new_fm
            elif "fixed_minutes" in r and new_fm is None and new_rph is not None:
                # If bundle has rate but no fixed_minutes, clear fixed_minutes
                r["fixed_minutes"] = None
            updated += 1

    prod_keys = {(r["task_id"], aw_key(r.get("applies_when"))) for r in prod_rates}
    added_rates = 0
    bundle_only_task_ids: list[tuple[str, dict]] = []
    for br in bundle_rates:
        key = (br["task_id"], aw_key(br.get("applies_when")))
        if key in prod_keys:
            continue
        new_row = {
            "task_id": br["task_id"],
            "unit_of_measure": br.get("unit_of_measure"),
            "paintscope_key": br.get("paintscope_key"),
            "rate_per_hour": br.get("rate_per_hour"),
            "crew_size": br.get("crew_size", 1),
            "applies_when": br.get("applies_when") or {},
        }
        rph = br.get("rate_per_hour")
        if rph:
            new_row["rate_range_low"] = int(round(rph * 0.85))
            new_row["rate_range_high"] = int(round(rph * 1.17))
        if br.get("fixed_minutes") is not None:
            new_row["fixed_minutes"] = br["fixed_minutes"]
        prod_rates.append(new_row)
        added_rates += 1
        bundle_only_task_ids.append((br["task_id"], br))

    prod_path.write_text(json.dumps(prod, indent=2) + "\n", encoding="utf-8")
    print(f"production.json: updated {updated} rates, added {added_rates} rows")

    # ---- sop_modules.json ----
    # Add any bundle-only task to its owning module
    mods_path = spec_dir / "sop_modules.json"
    mods = json.loads(mods_path.read_text(encoding="utf-8"))

    added_task_entries = 0
    # Deduplicate by task_id (we may have multiple bundle-only rate rows for same task)
    seen_task_ids = set()
    for tid, _ in bundle_only_task_ids:
        if tid in seen_task_ids:
            continue
        seen_task_ids.add(tid)
        bt = bundle_task_by_id.get(tid)
        if not bt:
            print(f"  WARN: bundle-only rate task {tid} has no matching sop_tasks entry; skipping module add")
            continue
        target_module_id = bt.get("module_id")
        for mod in mods["sop_modules"]:
            if mod["module_id"] != target_module_id:
                continue
            if any(t.get("task_id") == tid for t in mod.get("tasks", [])):
                break
            entry = {
                "task_id": tid,
                "name": bt.get("name"),
                "task_classification": bt.get("task_classification", "binary"),
                "skill_level": bt.get("skill_level", "journeyman"),
                "appears_in_tiers": bt.get("appears_in_tiers", ["QT3", "QT4", "QT5"]),
                "sort_order": bt.get("sort_order", 0),
            }
            if bt.get("applies_when"):
                entry["applies_when"] = bt["applies_when"]
            mod.setdefault("tasks", []).append(entry)
            added_task_entries += 1
            break

    mods_path.write_text(json.dumps(mods, indent=2) + "\n", encoding="utf-8")
    print(f"sop_modules.json: added {added_task_entries} task entries")


def main():
    if len(sys.argv) != 3:
        print("Usage: sync_spec_to_bundle.py <spec_family_id> <spec_dir_name>", file=sys.stderr)
        sys.exit(2)
    sync(sys.argv[1], sys.argv[2])


if __name__ == "__main__":
    main()
