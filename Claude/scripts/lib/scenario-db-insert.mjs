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
