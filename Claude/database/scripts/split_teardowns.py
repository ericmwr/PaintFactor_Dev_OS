"""Split bundled teardown tasks into individual floor/non-floor tasks."""
import sqlite3, json, sys

conn = sqlite3.connect('database/paintfactor.db')
c = conn.cursor()

# Each entry: (spec_id, old_task_id, module_id, floor_zones, splits)
# splits: list of (new_task_id, name, zones, uom, ps_key, rate, fixed_min, applies_when)
splits = [
    ('SF_TRIM_NC_STAIN', 'TSK_TRST_REMOVE_MASK', 'MOD_TRST_CLEANUP',
     ['floor_perimeter'], [
        ('TSK_TRST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
        ('TSK_TRST_REMOVE_FIXTURE_COVER', 'Remove Fixture Covers', ['fixture_covers'], 'EA', 'PS_PROTECT_EA.ASSET.FIXTURES', 20, None, '{}'),
    ]),
    ('SF_DOOR_SLAB_INT_NC_STAIN', 'TSK_DSST_REMOVE_MASK', 'MOD_DSST_CLEANUP',
     ['floor_full'], [
        ('TSK_DSST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
    ]),
    ('SF_DOOR_FRAME_NC_STAIN', 'TSK_DFST_REMOVE_MASK', 'MOD_DFST_CLEANUP',
     ['floor_adjacent'], [
        ('TSK_DFST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
    ]),
    ('SF_STAIR_RAILING_NC_STAIN', 'TSK_RLST_REMOVE_MASK', 'MOD_RLST_CLEANUP',
     ['floor_stair'], [
        ('TSK_RLST_REMOVE_WALL_MASK', 'Remove Stairwell Wall Masking', ['wall_stairwell'], 'FIXED', None, None, 10, '{}'),
    ]),
    ('SF_WINDOW_INT_NC_STAIN', 'TSK_WIST_REMOVE_MASK', 'MOD_WIST_CLEANUP',
     ['floor_below'], [
        ('TSK_WIST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent_window'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT_WINDOW', 200, None, '{}'),
        ('TSK_WIST_REMOVE_HARDWARE_MASK', 'Remove Hardware Masking', ['hardware_covers'], 'EA', 'PS_PROTECT_EA.ASSET.HARDWARE_GROUPS', 20, None, '{}'),
        ('TSK_WIST_REMOVE_SILL_PROTECT', 'Remove Sill Protection', ['sill_protection'], 'LF', 'PS_PROTECT_LF.SILL', 300, None, '{}'),
    ]),
    ('SF_STAIR_RISER_NC_STAIN', 'TSK_SRST_REMOVE_MASK', 'MOD_SRST_CLEANUP',
     ['landing_floor'], [
        ('TSK_SRST_REMOVE_TREAD_PROTECT', 'Remove Tread Protection', ['tread_protection'], 'EA', 'PS_SURFACE_EA.STAIR_TREAD', 20, None, '{}'),
        ('TSK_SRST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
    ]),
    ('SF_WOOD_WALL_NC_STAIN', 'TSK_WWST_REMOVE_MASK', 'MOD_WWST_CLEANUP',
     ['floor_full', 'floor_perimeter'], [
        ('TSK_WWST_REMOVE_CEILING_MASK', 'Remove Ceiling Edge Masking', ['ceiling_edge'], 'LF', 'PS_PROTECT_LF.CEILING_LINE', 200, None, '{}'),
        ('TSK_WWST_REMOVE_TRIM_MASK', 'Remove Adjacent Trim Masking', ['adjacent_trim_mask'], 'LF', 'PS_PROTECT_LF.TRIM_EDGES', 200, None, '{}'),
    ]),
    ('SF_WOOD_CEILING_NC_STAIN', 'TSK_WCST_REMOVE_MASK', 'MOD_WCST_CLEANUP',
     ['floor_full', 'floor_perimeter'], [
        ('TSK_WCST_REMOVE_WALL_MASK', 'Remove Wall Edge Masking', ['wall_edge'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
        ('TSK_WCST_REMOVE_FIXTURE_COVER', 'Remove Fixture Covers', ['fixture_covers'], 'EA', 'PS_PROTECT_EA.ASSET.FIXTURES', 20, None, '{}'),
    ]),
    ('SF_WAINSCOT_PANEL_NC_STAIN', 'TSK_WPST_REMOVE_MASK', 'MOD_WPST_CLEANUP',
     ['floor_perimeter'], [
        ('TSK_WPST_REMOVE_WALL_MASK', 'Remove Wall Above Masking', ['wall_above'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
    ]),
    ('SF_ARCH_ELEMENT_NC_STAIN', 'TSK_AEST_REMOVE_MASK', 'MOD_AEST_CLEANUP',
     ['floor_workzone', 'floor_perimeter'], [
        ('TSK_AEST_REMOVE_WALL_MASK', 'Remove Wall Masking', ['wall_adjacent'], 'LF', 'PS_PROTECT_LF.WALL_ADJACENT', 200, None, '{}'),
        ('TSK_AEST_REMOVE_FIREPLACE_MASK', 'Remove Fireplace Surround Masking', ['fireplace_surround'], 'FIXED', None, None, 15, '{}'),
    ]),
    ('SF_DOOR_EXT_RP', 'TSK_DRRP_TEARDOWN_PROTECTION', 'MOD_DRRP_CLEANUP',
     ['floor_workzone'], [
        ('TSK_DRRP_REMOVE_GLASS_MASK', 'Remove Glass Masking', ['glass_mask'], 'FIXED', None, None, 8, '{}'),
        ('TSK_DRRP_REMOVE_THRESHOLD', 'Remove Threshold Protection', ['ext_threshold_protect'], 'FIXED', None, None, 5, '{}'),
        ('TSK_DRRP_REMOVE_SIDING_MASK', 'Remove Adjacent Siding Masking', ['ext_siding_adjacent'], 'FIXED', None, None, 7, '{}'),
    ]),
]

total_inserted = 0
for spec_id, old_task_id, module_id, floor_zones, new_tasks in splits:
    # Update existing task to floor-only
    c.execute(
        'UPDATE sop_tasks SET name = ?, protection_metadata = ? WHERE spec_family_id = ? AND id = ?',
        ('Remove Floor Protection', json.dumps({'action': 'teardown', 'zones': floor_zones, 'method_dependent': False}), spec_id, old_task_id)
    )
    c.execute(
        'UPDATE task_production_rates SET name = ? WHERE spec_family_id = ? AND task_id = ?',
        ('Remove Floor Protection', spec_id, old_task_id)
    )

    for i, (new_id, name, zones, uom, ps_key, rate, fixed, aw) in enumerate(new_tasks):
        c.execute(
            'INSERT INTO sop_tasks (id, spec_family_id, module_id, name, task_classification, task_type, skill_level, sort_order, protection_metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            (new_id, spec_id, module_id, name, 'binary', 'cleanup', 'helper', 100 + i,
             json.dumps({'action': 'teardown', 'zones': zones, 'method_dependent': True}))
        )
        if rate is not None:
            c.execute(
                'INSERT INTO task_production_rates (spec_family_id, task_id, name, unit_of_measure, paintscope_key, rate_per_hour, crew_size, applies_when) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
                (spec_id, new_id, name, uom, ps_key, rate, aw)
            )
        else:
            c.execute(
                'INSERT INTO task_production_rates (spec_family_id, task_id, name, unit_of_measure, paintscope_key, fixed_minutes, crew_size, applies_when) VALUES (?, ?, ?, ?, ?, ?, 1, ?)',
                (spec_id, new_id, name, uom, ps_key, fixed, aw)
            )
        total_inserted += 1

    print(f'  {spec_id}: split {old_task_id} -> {len(new_tasks)} new tasks')

conn.commit()
print(f'\nDone: {len(splits)} specs updated, {total_inserted} new tasks inserted')
conn.close()
