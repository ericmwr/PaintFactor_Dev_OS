// Parallel scenario-engine estimate hook. Runs the new module-based engine
// on the same project state the legacy engine consumes via useEstimate().
//
// Returns an estimate-compatible object with the SAME SHAPE as run-estimate.js:
//   { specResults, roomProtection, fixtureProtection, totalHours, totalCrewDays,
//     closetHoursByRoom, warnings, materialEstimates, activatedSpecs, totalSpecs,
//     pricing, perInputResults, gaps, bundleStats }
//
// The specResults normalization (Step 1) groups per-input results by
// (roomIndex, specId) into the specResults[] array that EstimateView and
// all downstream components consume. Steps 2-4 add protection, crew days,
// and closet hours on top.
//
// This hook never mutates state and never throws — it always returns either
// a result or null, so it's safe to render alongside the legacy estimate.

import { useMemo, useRef, useState, useEffect } from 'react';
import { useProject } from './useProject';
import { useCompanyProfile } from './useCompanyProfile';
import { useProducts } from './useProducts';
import { loadOverlayBundle } from '../engine/overlay-loader.js';
import { configureHeightThresholds } from '../engine/derive-room.js';
import { computeScenarioEstimate } from '../engine/scenario-estimate.js';
import canonicalBundle from '../data/scenario-bundle.gen.js';
import { recordFiredTasks } from '../data/ledger-db.js';

export function useEstimateScenario() {
  const { state } = useProject();
  const { profile } = useCompanyProfile();
  const { products } = useProducts();
  const lastLedgerHashRef = useRef(null);

  // Load draft overlays once, then re-run estimate. Until drafts resolve
  // we run against the canonical bundle — overlay merge is additive.
  const [bundle, setBundle] = useState(canonicalBundle);
  const [overlayStats, setOverlayStats] = useState({ modulesOverlaid: 0, scenariosOverlaid: 0, assembliesActive: 0 });

  useEffect(() => {
    let cancelled = false;
    loadOverlayBundle(canonicalBundle).then(merged => {
      if (cancelled) return;
      setBundle({ modules: merged.modules, scenarios: merged.scenarios, modifiers: merged.modifiers, tasks: merged.tasks });
      setOverlayStats(merged.overlayStats);
      // Push the merged FAC_HEIGHT thresholds into derive-room so ceiling-
      // height → band mapping reflects user-authored drafts, not just canonical.
      configureHeightThresholds({ modifiers: merged.modifiers });
    }).catch(err => {
      console.warn('[PaintScope] Overlay load failed, using canonical:', err);
    });
    return () => { cancelled = true; };
  }, []);

  const result = useMemo(
    () => computeScenarioEstimate(state, bundle, profile, products, overlayStats),
    [state, profile, bundle, overlayStats, products]
  );

  // Side-effect: record fired tasks into the IDB ledger for the
  // "elimination by absence" cleanup workflow. Walks perInputResults
  // (each pr already carries scenario_id; tasks within carry module_id
  // + ps_key). Dedups via a hash of the sorted task_id list so rapid
  // state changes during editing don't spam the ledger.
  useEffect(() => {
    if (!result || result.error) return;
    const fired = [];
    for (const pr of result.perInputResults || []) {
      for (const t of pr.tasks || []) {
        if (!t || !t.taskId) continue;
        fired.push({
          task_id: t.taskId,
          hours: t.hours,
          ps_key: t.psKey,
          scenario_id: pr.scenarioId || null,
          module_id: t.moduleId || null,
        });
      }
    }
    if (fired.length === 0) return;
    const hash = fired.map(f => f.task_id).sort().join('|');
    if (hash === lastLedgerHashRef.current) return;
    lastLedgerHashRef.current = hash;
    recordFiredTasks(fired, {
      source: 'organic',
      project_label: state?.project?.name || null,
    }).catch(err => console.warn('[ledger] write failed', err));
  }, [result, state?.project?.name]);

  return result;
}

