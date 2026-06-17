"""Generate JSON batches for Notion create-pages calls. 655 tasks in batches of 100."""
import json

UNIVERSAL_KEEPERS = {
    'TSK_CUTIN_WALL_LF','TSK_CUTIN_TAPE_LF',
    'TSK_STAIN_BRUSH_LF','TSK_STAIN_ROLL_LF','TSK_STAIN_SPRAY_LF',
    'TSK_BETWEEN_COAT_SAND_LF','TSK_BETWEEN_COAT_SAND_SF',
    'TSK_PRIME_BRUSH_LF','TSK_PRIME_SPRAY_LF',
    'TSK_PRIME_BRUSH_SF','TSK_PRIME_SPRAY_SF',
    'TSK_TRIM_BRUSH_LF','TSK_TRIM_SPRAY_LF','TSK_SPRAY_FINISH_SF',
    'TSK_STAIN_BRUSH_SF','TSK_STAIN_ROLL_SF','TSK_STAIN_SPRAY_SF',
    'TSK_DUST_WIPE_LF','TSK_DUST_WIPE_SF','TSK_VACUUM_WORK_AREA',
    'TSK_INSPECT_COATING_LF','TSK_FILL_FASTENERS_LF',
    'TSK_TOUCHUP_FILL_LF','TSK_SAND_BARE_LF','TSK_CAULK_JOINTS_LF',
    'TSK_SPACKLE_DEFECT_SF','TSK_SPACKLE_DEFECT_EA_SIDE',
    'TSK_SPACKLE_DEFECT_LF','TSK_SPOT_COAT_LF',
    'TSK_DUST_WIPE_INTERSTAGE_LF','TSK_TOUCHUP_CAULK_LF',
    'TSK_CLEAR_BRUSH_LF','TSK_CLEAR_SPRAY_LF',
    'TSK_SEALER_BRUSH_LF','TSK_SEALER_SPRAY_LF',
    'TSK_SAND_CLEAR_LF','TSK_SAND_SEALER_LF',
    'TSK_CLEAR_BRUSH_SF','TSK_CLEAR_SPRAY_SF',
    'TSK_SEALER_BRUSH_SF','TSK_SEALER_SPRAY_SF',
    'TSK_SAND_CLEAR_SF','TSK_SAND_SEALER_SF',
    'TSK_FINAL_TOUCHUP_LF','TSK_FINAL_INSPECT_LF',
    'TSK_INSPECT_COATING_SF','TSK_FINAL_INSPECT_COATING_SF',
    'TSK_SPOT_PRIME_SF','TSK_INSPECT_REPAIR_FLOOR_COVERING_SF',
    'TSK_INSPECT_EA','TSK_DOOR_DUST_WIPE','TSK_DOOR_BRUSH','TSK_DOOR_SPRAY','TSK_DOOR_SAND',
    'TSK_ROLL_DWL','TSK_BACKROLL_DWL','TSK_BACKROLL_SPRAY_DWL','TSK_SPRAY_DWL',
    'TSK_CONDITIONER_LF','TSK_WOOD_PUTTY_LF',
}


def main():
    data = json.load(open('Claude/_interior_nc_tasks_for_docx.json'))
    pages = []
    for family, tasks in data.items():
        for t in tasks:
            tid = t['task_id']
            rate = t.get('rate')
            if rate is None and t.get('fixed_minutes') is not None:
                rate = None  # leave blank for FIXED tasks
            status = 'Universal Keeper' if tid in UNIVERSAL_KEEPERS else 'Active'
            uom = t.get('uom') or ''
            if uom not in {'LF','SF','EA','EA_SIDE','EA_ROOM','FIXED','EA_SIDE_PER_DOOR'}:
                uom = 'FIXED' if not uom else uom

            page = {
                'properties': {
                    'Task ID': tid,
                    'Name': t.get('name', ''),
                    'UOM': uom,
                    'Skill': t.get('skill', ''),
                    'Family': family,
                    'PS Key': t.get('ps_key', ''),
                    'Status': status,
                }
            }
            if rate is not None:
                page['properties']['Rate'] = rate
            pages.append(page)

    # Sort by family, then task_id, for cleaner display
    pages.sort(key=lambda p: (p['properties'].get('Family',''), p['properties'].get('Task ID','')))

    print(f'Total pages to create: {len(pages)}')
    # Write in batches of 100
    BATCH_SIZE = 100
    batches = [pages[i:i+BATCH_SIZE] for i in range(0, len(pages), BATCH_SIZE)]
    for i, batch in enumerate(batches):
        out = f'Claude/_notion_batch_{i+1}.json'
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(batch, f, indent=2, ensure_ascii=False)
        print(f'  batch {i+1}: {len(batch)} pages -> {out}')


if __name__ == '__main__':
    main()
