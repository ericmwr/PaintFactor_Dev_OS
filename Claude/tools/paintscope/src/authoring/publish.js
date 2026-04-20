// Client-side publish helper. POSTs a draft's payload to the dev-only
// Vite endpoint, which writes it to Claude/modules/*.json or
// Claude/scenarios/*.json for git commit.
//
// On success, flip the draft's status to 'published' in IndexedDB so
// the overlay no longer masks the canonical JSON.

import {
  saveModuleDraft,
  saveScenarioDraft,
  saveAssemblyDraft,
  saveModifierDraft,
} from '../data/authoring-db.js';

const ENDPOINT = '/__authoring/publish';

async function post(kind, payload) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, payload }),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const body = await res.json(); msg = body.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function publishModule(draft) {
  const result = await post('module', draft.payload || draft);
  await saveModuleDraft({ ...draft, status: 'published' });
  return result;
}

export async function publishScenario(draft) {
  const result = await post('scenario', draft.payload || draft);
  await saveScenarioDraft({ ...draft, status: 'published' });
  return result;
}

export async function publishAssembly(draft) {
  const result = await post('assembly', draft.payload || draft);
  await saveAssemblyDraft({ ...draft, status: 'published' });
  return result;
}

export async function publishModifier(draft) {
  const result = await post('modifier', draft.payload || draft);
  await saveModifierDraft({ ...draft, status: 'published' });
  return result;
}

export async function publishDraft(kind, draft) {
  switch (kind) {
    case 'module':   return publishModule(draft);
    case 'scenario': return publishScenario(draft);
    case 'assembly': return publishAssembly(draft);
    case 'modifier': return publishModifier(draft);
    default: throw new Error(`Unknown kind: ${kind}`);
  }
}
