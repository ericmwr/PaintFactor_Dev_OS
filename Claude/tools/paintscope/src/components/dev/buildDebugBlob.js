// Pure serializer for a per-room debug blob. Takes the room slice of state,
// the adapter inputs for that room, and the engine output filtered to that
// room — produces a self-contained JSON payload the user can paste into a
// bug report or Claude chat.
//
// Pure function: no DOM, no IndexedDB, no network. Safe to import from
// Node (e.g., a replay script in Claude/scripts/) for automated repro.

export function buildDebugBlob({ room, projectDefaults, adapterInputs, engineOutput }) {
  // adapterInputs may include a Map (roomQty) — serialize to a plain object
  // so the blob is JSON-stringifiable.
  const sanitizedInputs = (adapterInputs || []).map(input => ({
    specId: input.specId,
    roomIndex: input.roomIndex,
    roomLabel: input.roomLabel,
    ctx: { ...input.ctx },
    roomQty: mapToObj(input.roomQty),
    roomItems: input.roomItems || null,
  }));

  return {
    captured_at: new Date().toISOString(),
    schema_version: 1,
    room: room ? structuredClone(room) : null,
    project_defaults: projectDefaults ? structuredClone(projectDefaults) : null,
    adapter_inputs: sanitizedInputs,
    engine_output: engineOutput ? {
      perInputResults: engineOutput.perInputResults || [],
      gaps: engineOutput.gaps || [],
      warnings: engineOutput.warnings || [],
      bundleStats: engineOutput.bundleStats || null,
      totalHours: engineOutput.totalHours ?? 0,
      phaseHours: engineOutput.phaseHours || {},
    } : null,
  };
}

function mapToObj(m) {
  if (!m) return {};
  if (m instanceof Map) {
    const out = {};
    for (const [k, v] of m.entries()) out[k] = v;
    return out;
  }
  return m;
}
