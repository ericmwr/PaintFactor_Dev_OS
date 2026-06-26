// Insert helpers for the scenario query mirror. Positional ? params only (node:sqlite
// swap-compatible); undefined is coalesced to null (better-sqlite3 rejects undefined).
const nv = (v) => (v === undefined ? null : v);
const b = (v) => (v === undefined || v === null ? null : (v ? 1 : 0));
const j = (v) => JSON.stringify(v);

export function insertModules(db, modules) {
  const mod = db.prepare(`INSERT INTO modules
    (module_id, name, phase, intent, doctrine, application_method, kind, extends_from,
     elig_qt, elig_height, elig_texture, elig_complexity, elig_condition, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const mt = db.prepare(`INSERT INTO module_tasks
    (module_id, ordinal, task_ref, is_inline, entry_json) VALUES (?,?,?,?,?)`);
  for (const m of Object.values(modules)) {
    const e = m.modifier_eligibility || {};
    mod.run(m.module_id, nv(m.name), nv(m.phase), nv(m.intent), nv(m.doctrine),
      nv(m.application_method), nv(m.kind), nv(m._extends),
      b(e.qt), b(e.height), b(e.texture), b(e.complexity), b(e.condition), j(m));
    const tasks = Array.isArray(m.tasks) ? m.tasks : [];
    tasks.forEach((entry, i) =>
      mt.run(m.module_id, i, nv(entry.task_ref), entry.task_ref ? 0 : 1, j(entry)));
  }
}

export function insertTasks(db, tasks) {
  const t = db.prepare(`INSERT INTO tasks
    (task_id, name, ps_key, uom, skill_level, rate_per_hour, module_count, scenario_count, raw_json)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  const td = db.prepare(`INSERT INTO task_dimensions (task_id, dimension, value) VALUES (?,?,?)`);
  for (const task of Object.values(tasks)) {
    const d = task._derived || {};
    t.run(task.task_id, nv(task.name), nv(task.ps_key), nv(task.uom), nv(task.skill_level),
      nv(task.rate_per_hour), nv(d.module_count), nv(d.scenario_count), j(task));
    const dims = { phase: d.phases, method: d.methods, substrate: d.substrates,
                   qt: d.qts, bucket: d.buckets, coating: d.coatings };
    for (const [dim, arr] of Object.entries(dims))
      for (const v of (arr || [])) td.run(task.task_id, dim, v);
  }
}

export function insertModifiers(db, modifiers) {
  const m = db.prepare(`INSERT INTO modifiers (modifier_id, family, name, kind, raw_json)
    VALUES (?,?,?,?,?)`);
  for (const mo of Object.values(modifiers)) {
    const family = mo.modifier_id.startsWith('TRADE_') ? 'TRADE' : 'FAC';
    m.run(mo.modifier_id, family, nv(mo.name), nv(mo.kind), j(mo));
  }
}

export function insertScenarios(db, scenarios) {
  const s = db.prepare(`INSERT INTO scenarios
    (scenario_id, name, domain, context, output_state, finish_coats, interstage_cycles, raw_json)
    VALUES (?,?,?,?,?,?,?,?)`);
  const sm = db.prepare(`INSERT INTO scenario_modules (scenario_id, ordinal, module_id) VALUES (?,?,?)`);
  const smatch = db.prepare(`INSERT INTO scenario_matches (scenario_id, dimension, value) VALUES (?,?,?)`);
  const spz = db.prepare(`INSERT INTO scenario_protection_zones (scenario_id, zone_id, level) VALUES (?,?,?)`);
  const sms = db.prepare(`INSERT INTO scenario_material_systems (scenario_id, ordinal, sys_id) VALUES (?,?,?)`);
  for (const scn of scenarios) {
    const cc = scn.coat_counts || {};
    s.run(scn.scenario_id, nv(scn.name), nv(scn.domain), nv(scn.context), nv(scn.output_state),
      nv(cc.finish_coats), nv(cc.interstage_cycles), j(scn));
    (scn.modules || []).forEach((mid, i) => sm.run(scn.scenario_id, i, mid));
    for (const [dim, val] of Object.entries(scn.matches || {})) {
      const vals = Array.isArray(val) ? val : [val];
      for (const v of vals) if (v != null) smatch.run(scn.scenario_id, dim, String(v));
    }
    (scn.protection_zones || []).forEach((z) => spz.run(scn.scenario_id, nv(z.zone_id), nv(z.level)));
    (scn.material_systems || []).forEach((sys, i) => sms.run(scn.scenario_id, i, sys));
  }
}

export function insertReference(db, data) {
  const arr = (x) => (Array.isArray(x) ? x : []);

  const matSys = db.prepare(`INSERT INTO material_systems (id, spec_family_id, name, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.MATERIAL_SYSTEMS)) matSys.run(r.id, nv(r.spec_family_id), nv(r.name), j(r));

  const cov = db.prepare(`INSERT OR REPLACE INTO material_coverage_profiles
    (id, spec_family_id, material_system, product_role, coverage_sf_per_gallon, raw_json) VALUES (?,?,?,?,?,?)`);
  for (const r of arr(data.MATERIAL_COVERAGE_PROFILES))
    cov.run(r.id, nv(r.spec_family_id), nv(r.material_system), nv(r.product_role), nv(r.coverage_sf_per_gallon), j(r));

  const msp = db.prepare(`INSERT INTO material_system_products
    (spec_family_id, system_id, product_role, product_type, coats_required, raw_json) VALUES (?,?,?,?,?,?)`);
  for (const r of arr(data.MATERIAL_SYSTEM_PRODUCTS))
    msp.run(nv(r.spec_family_id), nv(r.system_id), nv(r.product_role), nv(r.product_type), nv(r.coats_required), j(r));

  const qte = db.prepare(`INSERT INTO quality_tier_effects (spec_family_id, quality_tier, time_modifier, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.QUALITY_TIER_EFFECTS)) qte.run(nv(r.spec_family_id), nv(r.quality_tier), nv(r.time_modifier), j(r));

  const spz = db.prepare(`INSERT INTO spec_protection_zones (spec_family_id, zone_id, protection_level, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.SPEC_PROTECTION_ZONES)) spz.run(nv(r.spec_family_id), nv(r.zone_id), nv(r.protection_level), j(r));

  const sop = db.prepare(`INSERT OR REPLACE INTO sop_task_protection (id, spec_family_id, raw_json) VALUES (?,?,?)`);
  for (const r of arr(data.SOP_TASK_PROTECTION)) sop.run(r.id, nv(r.spec_family_id), j(r));

  const sfi = db.prepare(`INSERT OR REPLACE INTO spec_family_info (id, name, domain, raw_json) VALUES (?,?,?,?)`);
  for (const r of arr(data.SPEC_FAMILY_INFO)) sfi.run(r.id, nv(r.name), nv(r.domain), j(r));

  const cp = db.prepare(`INSERT OR REPLACE INTO catalog_products
    (product_id, brand, product_name, product_type, price_per_gallon, coverage_sf_per_gallon, raw_json) VALUES (?,?,?,?,?,?,?)`);
  for (const r of arr(data.CATALOG_PRODUCTS))
    cp.run(r.product_id, nv(r.brand), nv(r.product_name), nv(r.product_type), nv(r.price_per_gallon), nv(r.coverage_sf_per_gallon), j(r));

  const si = db.prepare(`INSERT OR REPLACE INTO system_index (key, value_json) VALUES (?,?)`);
  const sidx = data.SYSTEM_INDEX && typeof data.SYSTEM_INDEX === 'object' ? data.SYSTEM_INDEX : {};
  for (const [key, value] of Object.entries(sidx)) si.run(key, j(value));
}
