"""Remove MDF edge sealing tasks and materials from all interior specs.
Field practice uses standard primer + spackle/caulk for MDF edges,
making the separate shellac edge seal step unnecessary."""
import sqlite3

conn = sqlite3.connect('database/paintfactor.db')
c = conn.cursor()

# Interior MDF edge seal tasks to remove
task_ids = [
    ('SF_ARCH_ELEMENT_NC', 'TSK_ARCH_SEAL_MDF_EDGES'),
    ('SF_BUILTIN_NC', 'TSK_BLTN_SEAL_MDF_EDGES'),
    ('SF_CABINET_NC_PAINT', 'TSK_CABT_EDGE_SEAL'),
    ('SF_CLOSET_SHELF_NC', 'TSK_EDGE_SEAL'),
    ('SF_DOOR_SLAB_INT_NC', 'TSK_DOOR_MDF_EDGE_SEAL'),
    ('SF_STAIR_RISER_NC', 'TSK_STRS_SEAL_MDF_EDGES'),
    ('SF_TRIM_NC_PRIME', 'TSK_MDF_EDGE_SEAL'),
    ('SF_WAINSCOT_PANEL_NC', 'TSK_WNSC_SEAL_MDF_EDGES'),
    ('SF_WOOD_CEILING_NC', 'TSK_WDCL_SEAL_MDF_EDGES'),
    ('SF_WOOD_WALL_NC', 'TSK_WDWL_SEAL_MDF_EDGES'),
]

for spec, task in task_ids:
    c.execute('DELETE FROM sop_tasks WHERE spec_family_id = ? AND id = ?', (spec, task))
    c.execute('DELETE FROM task_production_rates WHERE spec_family_id = ? AND task_id = ?', (spec, task))
    print(f'  Removed task {task} from {spec}')

# Remove MDF shellac material systems (all interior specs)
for sys_id in ['SYS_PRIMER_MDF_SHELLAC', 'SYS_PRIMER_MDF_LATEX', 'SYS_MDF_EDGE_SEAL', 'SYS_MDF_FACE_PRIME']:
    c.execute('DELETE FROM material_systems WHERE id = ?', (sys_id,))
    n1 = c.rowcount
    c.execute('DELETE FROM material_system_products WHERE system_id = ?', (sys_id,))
    n2 = c.rowcount
    if n1 > 0 or n2 > 0:
        print(f'  Removed {sys_id}: {n1} systems, {n2} products')

conn.commit()

# Verify
c.execute("SELECT COUNT(*) FROM sop_tasks WHERE id LIKE '%MDF%' OR id LIKE '%EDGE_SEAL%' OR id LIKE '%SEAL_MDF%'")
tasks = c.fetchone()[0]
c.execute("SELECT COUNT(*) FROM material_systems WHERE id LIKE '%MDF%'")
systems = c.fetchone()[0]
print(f'\nRemaining: {tasks} tasks (1 expected - exterior), {systems} MDF systems (0 expected)')

conn.close()
