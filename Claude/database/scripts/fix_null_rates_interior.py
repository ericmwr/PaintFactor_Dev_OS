"""Fix null rate_per_hour for interior paint specs by extracting QT3 base rate
from production.json qt_rates blocks. Also sets paintscope_key where missing."""
import sqlite3, json, os, glob

DB_PATH = 'database/paintfactor.db'
SPECS_DIR = 'specs'

conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

# Find all interior paint tasks with null rates
c.execute('''SELECT r.spec_family_id, r.task_id, r.unit_of_measure, r.paintscope_key
    FROM task_production_rates r
    WHERE r.rate_per_hour IS NULL AND r.fixed_minutes IS NULL
    AND r.rates_by_tier IS NULL AND r.fixed_minutes_by_tier IS NULL
    AND r.spec_family_id NOT LIKE '%_STAIN%'
    AND r.spec_family_id NOT LIKE '%_EXT_%'
    ORDER BY r.spec_family_id, r.task_id''')
null_tasks = c.fetchall()
print(f'Found {len(null_tasks)} null-rate interior paint tasks\n')

# Group by spec
by_spec = {}
for spec, tid, uom, psk in null_tasks:
    if spec not in by_spec:
        by_spec[spec] = []
    by_spec[spec].append((tid, uom, psk))

fixed = 0
still_broken = 0

for spec_id, tasks in by_spec.items():
    # Find the production.json for this spec
    pattern = os.path.join(SPECS_DIR, f'{spec_id}_v1', 'production.json')
    matches = glob.glob(pattern)
    if not matches:
        print(f'  WARNING: No production.json found for {spec_id}')
        still_broken += len(tasks)
        continue

    with open(matches[0], 'r', encoding='utf-8') as f:
        prod = json.load(f)

    # Build lookup: task_id -> rate data from production.json
    rate_lookup = {}
    for entry in prod.get('task_production_rates', []):
        rate_lookup[entry.get('task_id')] = entry

    # Also get the primary PS key for this spec (from trim_surface_input_group or similar)
    input_group = prod.get('trim_surface_input_group', {}).get('inputs', [])

    print(f'{spec_id}: {len(tasks)} tasks to fix')

    for tid, uom, current_psk in tasks:
        entry = rate_lookup.get(tid)
        if not entry:
            print(f'  SKIP {tid}: not in production.json')
            still_broken += 1
            continue

        # Extract base rate from qt_rates (QT3) or flat rate
        base_rate = None
        qt_rates = entry.get('qt_rates')
        if qt_rates and 'QT3' in qt_rates:
            qt3 = qt_rates['QT3']
            # Find any rate_* key
            for k, v in qt3.items():
                if k.startswith('rate_') and isinstance(v, (int, float)):
                    base_rate = v
                    break
        if base_rate is None:
            base_rate = entry.get('rate_per_hour')

        if base_rate is None:
            print(f'  SKIP {tid}: no rate found in production.json')
            still_broken += 1
            continue

        # Determine paintscope_key
        psk = current_psk or entry.get('paintscope_key')
        if not psk:
            # Try to infer from input_group reference
            ig = entry.get('input_group')
            if ig and ig in prod:
                group_inputs = prod[ig].get('inputs', [])
                if group_inputs:
                    # Use the first input's PS key as representative
                    psk = group_inputs[0].get('paintscope_key')
            # Fallback: check required_input_key
            if not psk:
                rik = entry.get('required_input_key')
                if rik:
                    # Map common input keys to PS keys
                    INPUT_TO_PS = {
                        'IN_LF_BASEBOARD': 'PS_SURFACE_LF.TRIM_TOTAL',
                        'IN_SF_WAINSCOT': 'PS_SURFACE_SF.WAINSCOTING',
                        'IN_SF_WOOD_WALL': 'PS_SURFACE_SF.WOOD_WALL',
                        'IN_SF_WOOD_CEILING': 'PS_SURFACE_SF.WOOD_CEILING',
                    }
                    psk = INPUT_TO_PS.get(rik)

        # Apply fix
        updates = []
        if base_rate:
            updates.append(f'rate_per_hour = {base_rate}')
        if psk and not current_psk:
            updates.append(f'paintscope_key = {psk}')

        c.execute('UPDATE task_production_rates SET rate_per_hour = ?, paintscope_key = COALESCE(paintscope_key, ?) WHERE spec_family_id = ? AND task_id = ?',
            (base_rate, psk, spec_id, tid))
        print(f'  FIXED {tid}: rate={base_rate} ps={psk}')
        fixed += 1

conn.commit()
print(f'\nDone: {fixed} fixed, {still_broken} still need attention')
conn.close()
