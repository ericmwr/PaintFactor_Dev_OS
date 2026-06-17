// Client-side archive / restore helpers. POST to the dev-only Vite
// endpoints that move JSON files between Claude/{kind}/ and
// Claude/{kind}/archive/. Bundle is regenerated separately (run the
// build-scenario-bundle.mjs script) to reflect the change in the active
// surface — this matches the existing publish workflow.

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const r = await res.json(); msg = r.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function archiveEntity(kind, id) {
  return postJson('/__authoring/archive', { kind, id });
}

export async function restoreEntity(kind, id) {
  return postJson('/__authoring/restore', { kind, id });
}

export async function listArchive(kind) {
  const url = `/__authoring/list-archive?kind=${encodeURIComponent(kind)}`;
  const res = await fetch(url);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const r = await res.json(); msg = r.error || msg; } catch {}
    throw new Error(msg);
  }
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'list-archive failed');
  return body.entries || [];
}

// Re-run the canonical bundle generator and pick up archives/restores
// that have happened since the last regen. Returns { ms, stdout, stderr }
// on success. After this resolves, Vite HMR re-imports the bundle into
// the running page within ~100ms.
export async function regenBundle() {
  const res = await fetch('/__authoring/regen-bundle', { method: 'POST' });
  let body;
  try { body = await res.json(); } catch { body = { ok: false, error: `HTTP ${res.status}` }; }
  if (!body.ok) throw new Error(body.error || 'regen failed');
  return body;
}
