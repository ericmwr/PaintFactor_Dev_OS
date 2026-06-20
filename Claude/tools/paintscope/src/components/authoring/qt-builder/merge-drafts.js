// Synchronous draft-overlay helpers for the QT Builder's live view. The async
// loadOverlayBundle (engine/overlay-loader.js) overlays drafts at estimate
// time; the builder needs the same merge synchronously over the hook's
// in-memory drafts so deriveVantage / vantage-edits see edits immediately.
// Drafts win on id; only 'draft' / 'local_override' are active. Relocated
// verbatim from the retired edit-tier-ladder.js (modules) and tier-coats.js
// (scenarios) when the vantage grid replaced the gating ladder.

const ACTIVE_DRAFT = new Set(['draft', 'local_override']);

export function mergeModuleDrafts(canonicalModules, drafts) {
  const out = { ...(canonicalModules || {}) };
  for (const d of drafts || []) {
    if (d && d.payload && ACTIVE_DRAFT.has(d.status)) out[d.id] = { ...d.payload, tasks: [...(d.payload.tasks || [])] };
  }
  return out;
}

export function mergeScenarioDrafts(canonicalScenarios, drafts) {
  const active = (drafts || []).filter(d => d && d.payload && ACTIVE_DRAFT.has(d.status));
  const draftIds = new Set(active.map(d => d.id));
  const out = [];
  for (const s of canonicalScenarios || []) {
    if (!draftIds.has(s.scenario_id)) out.push(s);
  }
  for (const d of active) out.push(d.payload);
  return out;
}
