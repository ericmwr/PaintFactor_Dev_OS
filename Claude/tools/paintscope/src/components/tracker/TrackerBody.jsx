import { useState, useMemo } from 'react';
import { VIRTUAL_PARENTS } from '../../tracker/element-parents.js';
import ActivityRow from './ActivityRow.jsx';

const PHASE_ORDER = ['setup', 'prep', 'prime', 'apply', 'interstage', 'finish', 'cleanup'];
const PHASE_LABELS = {
  setup: 'SETUP', prep: 'PREP', prime: 'PRIME', apply: 'APPLY',
  interstage: 'INTERSTAGE', finish: 'FINISH', cleanup: 'CLEANUP',
};

const ELEMENT_PARENT_ORDER = [
  'trim', 'drywall_prep', 'drywall_prime', 'walls', 'ceilings',
  'doors', 'windows', 'cabinets', 'stairway', 'specialty',
];

/**
 * TrackerBody — Element-Phase pivot tree for the snapshot.
 *
 * Layout: project-level activities (Setup, Protection, Cleanup) anchor
 * the top + bottom; phase-grouped activities fill the middle. Each
 * activity renders as an <ActivityRow /> that handles its own drilldown
 * and Log-Time interaction.
 */
export default function TrackerBody({ snapshot, entries }) {
  const [expandAll, setExpandAll] = useState(false);
  const activities = snapshot?.activities || [];

  const { projectLevel, phaseGroups, presentPhases } = useMemo(() => {
    const pl = { before: [], middle: [], after: [] };
    const pg = {};
    const phases = new Set();

    for (const act of activities) {
      if (act.element_parent === 'project_setup') {
        pl.before.push(act);
      } else if (act.element_parent === 'project_protection') {
        pl.middle.push(act);
      } else if (act.element_parent === 'project_cleanup') {
        pl.after.push(act);
      } else {
        phases.add(act.phase);
        if (!pg[act.phase]) pg[act.phase] = {};
        if (!pg[act.phase][act.element_parent]) pg[act.phase][act.element_parent] = [];
        pg[act.phase][act.element_parent].push(act);
      }
    }

    const orderedPhases = PHASE_ORDER.filter(p => phases.has(p));
    return { projectLevel: pl, phaseGroups: pg, presentPhases: orderedPhases };
  }, [activities]);

  const entriesByActivity = useMemo(() => {
    const map = {};
    for (const e of entries) {
      if (!e.activity_id) continue;
      if (!map[e.activity_id]) map[e.activity_id] = [];
      map[e.activity_id].push(e);
    }
    return map;
  }, [entries]);

  if (activities.length === 0) {
    return (
      <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>
        The snapshot has no activities. The current estimate may be empty.
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setExpandAll(true)}
          style={btnStyle()}
        >Expand All</button>
        <button
          onClick={() => setExpandAll(false)}
          style={btnStyle()}
        >Collapse All</button>
      </div>

      {(projectLevel.before.length > 0 || projectLevel.middle.length > 0) && (
        <SectionHeader label="PROJECT-LEVEL" />
      )}
      {projectLevel.before.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}
      {projectLevel.middle.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}

      {presentPhases.map(phase => {
        const parentsInPhase = ELEMENT_PARENT_ORDER.filter(p => phaseGroups[phase] && phaseGroups[phase][p]);
        if (parentsInPhase.length === 0) return null;
        return (
          <div key={phase}>
            <SectionHeader label={PHASE_LABELS[phase] || phase.toUpperCase()} />
            {parentsInPhase.flatMap(parent => (
              phaseGroups[phase][parent].map(act => (
                <ActivityRow
                  key={act.activity_id}
                  activity={act}
                  entries={entriesByActivity[act.activity_id] || []}
                  forceExpanded={expandAll}
                />
              ))
            ))}
          </div>
        );
      })}

      {projectLevel.after.length > 0 && <SectionHeader label="PROJECT-LEVEL" />}
      {projectLevel.after.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
        />
      ))}
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize: 10, color: 'var(--text-muted)', letterSpacing: 0.5,
      marginTop: 16, marginBottom: 6, fontWeight: 600,
    }}>
      ═══ {label} ═══
    </div>
  );
}

function btnStyle() {
  return {
    fontSize: 11, padding: '3px 8px', background: 'transparent',
    border: '1px solid var(--border)', color: 'var(--text)',
    cursor: 'pointer', borderRadius: 3,
  };
}
