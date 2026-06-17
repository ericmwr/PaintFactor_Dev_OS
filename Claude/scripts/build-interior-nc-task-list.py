"""Bucket all interior NC tasks by family and write to JSON for docx generation."""
import json, glob
from collections import defaultdict


def is_repaint(tid):
    return any(p in tid for p in [
        '_RP_', 'RP_FINISH', 'RP_PAINT',
        'CBRP', 'DCRP', 'DWRP', 'DRRP', 'TMRP', 'STRP', 'SPRP',
        'CLRP', 'WNRP', 'BTRP', 'XSRP', 'WSRP',
        'EWRP', 'FCRP', 'FNRP', 'MSRP', 'SCRP', 'XPRP',
        'ALRP', 'VNRP', 'TRRP', 'DKRP', 'FERP',
    ])


# Exterior substrate prefixes that don't use the TSK_X_ convention
EXTERIOR_PREFIXES = {
    'STCO',   # stucco
    'GRDR',   # garage door
    'METL',   # metal (siding/railing)
    'FNDN',   # foundation
    'MSRY',   # masonry
    'FNCE',   # fence
    'DECK',   # deck
    'ENSD',   # engineered siding
    'FCSD',   # fiber cement siding
    'SDNG',   # siding (generic)
}


def is_exterior(tid):
    if tid.startswith('TSK_X'):
        return True
    parts = tid.split('_')
    return len(parts) > 1 and parts[1] in EXTERIOR_PREFIXES


UNIVERSAL_KEEPERS = {
    'TSK_CUTIN_WALL_LF', 'TSK_CUTIN_TAPE_LF',
    'TSK_STAIN_BRUSH_LF', 'TSK_STAIN_ROLL_LF', 'TSK_STAIN_SPRAY_LF',
    'TSK_BETWEEN_COAT_SAND_LF', 'TSK_BETWEEN_COAT_SAND_SF',
    'TSK_PRIME_BRUSH_LF', 'TSK_PRIME_SPRAY_LF',
    'TSK_PRIME_BRUSH_SF', 'TSK_PRIME_SPRAY_SF',
    'TSK_TRIM_BRUSH_LF', 'TSK_TRIM_SPRAY_LF', 'TSK_SPRAY_FINISH_SF',
    'TSK_STAIN_BRUSH_SF', 'TSK_STAIN_ROLL_SF', 'TSK_STAIN_SPRAY_SF',
    'TSK_DUST_WIPE_LF', 'TSK_DUST_WIPE_SF', 'TSK_VACUUM_WORK_AREA',
    'TSK_INSPECT_COATING_LF', 'TSK_FILL_FASTENERS_LF',
    'TSK_TOUCHUP_FILL_LF', 'TSK_SAND_BARE_LF', 'TSK_CAULK_JOINTS_LF',
    'TSK_SPACKLE_DEFECT_SF', 'TSK_SPACKLE_DEFECT_EA_SIDE',
    'TSK_SPACKLE_DEFECT_LF', 'TSK_SPOT_COAT_LF',
    'TSK_DUST_WIPE_INTERSTAGE_LF', 'TSK_TOUCHUP_CAULK_LF',
    'TSK_CLEAR_BRUSH_LF', 'TSK_CLEAR_SPRAY_LF',
    'TSK_SEALER_BRUSH_LF', 'TSK_SEALER_SPRAY_LF',
    'TSK_SAND_CLEAR_LF', 'TSK_SAND_SEALER_LF',
    'TSK_CLEAR_BRUSH_SF', 'TSK_CLEAR_SPRAY_SF',
    'TSK_SEALER_BRUSH_SF', 'TSK_SEALER_SPRAY_SF',
    'TSK_SAND_CLEAR_SF', 'TSK_SAND_SEALER_SF',
    'TSK_FINAL_TOUCHUP_LF', 'TSK_FINAL_INSPECT_LF',
}

# (label, predicate) — first match wins; check most-specific before general
BUCKETS = [
    ('Universal Keepers', lambda tid: tid in UNIVERSAL_KEEPERS),
    ('Trim STAIN - Baseboard',     lambda tid: tid.startswith('TSK_BBST_')),
    ('Trim STAIN - Chair Rail',    lambda tid: tid.startswith('TSK_CHRS_')),
    ('Trim STAIN - Crown',         lambda tid: tid.startswith('TSK_CRST_')),
    ('Trim STAIN - Door Casing',   lambda tid: tid.startswith('TSK_DCST_')),
    ('Trim STAIN - Door Frame',    lambda tid: tid.startswith('TSK_DFST_')),
    ('Trim STAIN - Panel Mold',    lambda tid: tid.startswith('TSK_PMST_')),
    ('Trim STAIN - Picture Rail',  lambda tid: tid.startswith('TSK_PCRS_')),
    ('Trim STAIN - Shadow Box',    lambda tid: tid.startswith('TSK_SDBS_')),
    ('Trim STAIN - Shoe Mold',     lambda tid: tid.startswith('TSK_SMST_')),
    ('Trim STAIN - Wainscot Cap',  lambda tid: tid.startswith('TSK_WSCP_')),
    ('Trim STAIN - Window Apron',  lambda tid: tid.startswith('TSK_WAPS_')),
    ('Trim STAIN - Window Casing', lambda tid: tid.startswith('TSK_WDCS_')),
    ('Trim STAIN - Window Jamb',   lambda tid: tid.startswith('TSK_WJST_')),
    ('Trim STAIN - Window Stool',  lambda tid: tid.startswith('TSK_WSST_')),
    ('Trim PAINT - Baseboard',     lambda tid: tid.startswith('TSK_BASEBOARD_')),
    ('Trim PAINT - Chair Rail',    lambda tid: tid.startswith('TSK_CHAIR_RAIL_')),
    ('Trim PAINT - Crown',         lambda tid: tid.startswith('TSK_CROWN_')),
    ('Trim PAINT - Door Casing',   lambda tid: tid.startswith('TSK_DOOR_CASING_')),
    ('Trim PAINT - Door Frame',    lambda tid: tid.startswith('TSK_DOOR_FRAME_')),
    ('Trim PAINT - Panel Mold',    lambda tid: tid.startswith('TSK_PANEL_MOLD_')),
    ('Trim PAINT - Picture Rail',  lambda tid: tid.startswith('TSK_PICTURE_RAIL_')),
    ('Trim PAINT - Shadow Box',    lambda tid: tid.startswith('TSK_SHADOW_BOX_')),
    ('Trim PAINT - Shoe Mold',     lambda tid: tid.startswith('TSK_SHOE_MOLD_')),
    ('Trim PAINT - Wainscot Cap',  lambda tid: tid.startswith('TSK_WAINSCOT_CAP_')),
    ('Trim PAINT - Window Apron',  lambda tid: tid.startswith('TSK_WINDOW_APRON_')),
    ('Trim PAINT - Window Casing', lambda tid: tid.startswith('TSK_WINDOW_CASING_')),
    ('Trim PAINT - Window Jamb',   lambda tid: tid.startswith('TSK_WINDOW_JAMB_')),
    ('Trim PAINT - Window Stool',  lambda tid: tid.startswith('TSK_WINDOW_STOOL_')),
    ('Trim - generic',             lambda tid: tid.startswith('TSK_TRIM_') or tid.startswith('TSK_TM_')),
    ('Cabinet (CABT)',             lambda tid: tid.startswith('TSK_CABT_') or tid.startswith('TSK_CB_')),
    ('Built-in (BLT)',             lambda tid: tid.startswith('TSK_BLT_') or tid.startswith('TSK_BT_') or tid.startswith('TSK_BUILTIN_') or tid.startswith('TSK_MASK_BUILTIN')),
    ('Closet Shelf (CLSH)',        lambda tid: tid.startswith('TSK_CLSH_') or tid.startswith('TSK_CL_') or tid.startswith('TSK_CLOSET_')),
    ('Stairway',                   lambda tid: any(tid.startswith('TSK_' + p + '_') for p in ['STRL', 'STRS', 'NEWEL', 'BALUSTER', 'TREAD', 'RISER', 'OPEN_RAIL', 'WALL_RAIL', 'SKIRTBOARD', 'STRINGER', 'SRST', 'RRST', 'TRST', 'STAIR'])),
    ('Door Slab Stain (DSST)',     lambda tid: tid.startswith('TSK_DSST_')),
    ('Door (DOOR)',                lambda tid: tid.startswith('TSK_DOOR_')),
    ('Window Stain (WNST)',        lambda tid: tid.startswith('TSK_WNST_')),
    ('Window (WIN)',               lambda tid: tid.startswith('TSK_WIN_') or tid.startswith('TSK_WINDOW_')),
    ('Wood Wall STAIN (WWST)',     lambda tid: tid.startswith('TSK_WWST_')),
    ('Wood Wall PAINT (WDWL/WW)',  lambda tid: tid.startswith('TSK_WDWL_') or tid.startswith('TSK_WW_')),
    ('Wood Ceiling STAIN (WCST)',  lambda tid: tid.startswith('TSK_WCST_')),
    ('Wood Ceiling PAINT (WDCL)',  lambda tid: tid.startswith('TSK_WDCL_') or tid.startswith('TSK_WC_')),
    ('Wainscot STAIN (WPST)',      lambda tid: tid.startswith('TSK_WPST_')),
    ('Wainscot PAINT (WNSC)',      lambda tid: tid.startswith('TSK_WNSC_') or tid.startswith('TSK_WAINSCOT_')),
    ('Arch Element STAIN (AEST)',  lambda tid: tid.startswith('TSK_AEST_')),
    ('Arch Element (ARCH)',        lambda tid: tid.startswith('TSK_ARCH_')),
    ('Drywall - Wall',             lambda tid: tid.startswith('TSK_DWALL_') or tid.startswith('TSK_DW_') or tid.startswith('TSK_WALL_')
                                                  or '_WALL_' in tid and not any(x in tid for x in ['WALL_RAIL','WALL_ADJACENT'])),
    ('Drywall - Ceiling',          lambda tid: tid.startswith('TSK_CEIL_') or tid.startswith('TSK_CEILING_') or tid.startswith('TSK_DC_') or tid.startswith('TSK_DCEIL_')
                                                  or '_CEILING_' in tid),
    ('Protection / Mask',          lambda tid: tid.startswith('TSK_MASK_') or tid.startswith('TSK_PROTECT_') or tid.startswith('TSK_REMOVE_') or tid.startswith('TSK_VANITY_') or tid.startswith('TSK_SPRAY_PROT_') or tid.startswith('TSK_FLOOR_') or tid.startswith('TSK_CONTAINMENT_')),
    ('Tape Line',                  lambda tid: 'TAPELINE' in tid),
    ('Project Overhead / Setup',   lambda tid: tid.startswith('TSK_SETUP_') or tid.startswith('TSK_OVERHEAD_') or tid.startswith('TSK_PROJECT_') or tid.startswith('TSK_TRAVEL_') or tid.startswith('TSK_MOBILIZ') or tid.startswith('TSK_DUMP_') or tid.startswith('TSK_DEMOB')),
    ('Caulk System',               lambda tid: tid.startswith('TSK_CAULK_')),
    ('Grain Filler System',        lambda tid: tid.startswith('TSK_GRAIN_')),
    ('RRP Lead Containment',       lambda tid: tid.startswith('TSK_RRP_')),
    ('Prep Helpers (HVAC/Outlet)', lambda tid: tid.startswith('TSK_PREP_HVAC_') or tid.startswith('TSK_PREP_OUTLET_') or tid.startswith('TSK_FIXTURE_COVERS_') or tid.startswith('TSK_VERIFY_')),
    ('Drywall Prep helpers',       lambda tid: tid.startswith('TSK_SPOT_PRIME_') or tid.startswith('TSK_SAND_SPACKLE_') or tid.startswith('TSK_VACUUM_INTERCOAT_') or tid.startswith('TSK_VACUUM_SAND_DUST_') or tid.startswith('TSK_VACUUM_SUBFLOOR_') or tid.startswith('TSK_INSPECT_PRIMED_') or tid.startswith('TSK_INSPECT_FLOOR_') or tid.startswith('TSK_FINAL_INSPECT_')),
    ('Wall/Ceiling Apply',         lambda tid: tid.startswith('TSK_BACKROLL_') or tid.startswith('TSK_ROLL_') or tid.startswith('TSK_SPRAY_')),
]


def bucket_for(tid):
    for name, predicate in BUCKETS:
        if predicate(tid):
            return name
    return 'Other / Misc'


tasks_by_bucket = defaultdict(list)
for f in sorted(glob.glob('Claude/tasks/TSK_*.json')):
    d = json.load(open(f))
    tid = d['task_id']
    if is_exterior(tid):
        continue
    if is_repaint(tid):
        continue
    bucket = bucket_for(tid)
    tasks_by_bucket[bucket].append({
        'task_id': tid,
        'name': d.get('name', '') or '',
        'uom': d.get('uom', '') or '',
        'rate': d.get('rate_per_hour'),
        'fixed_minutes': d.get('fixed_minutes'),
        'skill': d.get('skill_level', '') or '',
        'ps_key': d.get('ps_key', '') or '',
    })

total = sum(len(v) for v in tasks_by_bucket.values())
print('Total interior NC tasks bucketed:', total)
print('Buckets:', len(tasks_by_bucket))
for k in sorted(tasks_by_bucket.keys()):
    print('  ' + k.ljust(42) + ' (' + str(len(tasks_by_bucket[k])) + ' tasks)')

out = {k: sorted(tasks_by_bucket[k], key=lambda x: x['task_id']) for k in sorted(tasks_by_bucket.keys())}
with open('Claude/_interior_nc_tasks_for_docx.json', 'w') as f:
    json.dump(out, f, indent=2)
print('Wrote Claude/_interior_nc_tasks_for_docx.json')
