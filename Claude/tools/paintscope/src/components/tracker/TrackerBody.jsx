import { useState, useMemo } from 'react';
import { VIRTUAL_PARENTS } from '../../tracker/element-parents.js';
import { buildPhaseRollups, buildProjectLevelRollups, sumPhaseLoggedHours, computePhaseCompletion } from '../../tracker/rollup.js';
import ActivityRow from './ActivityRow.jsx';
import PhaseLogForm from './PhaseLogForm.jsx';

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
export default function TrackerBody({ snapshot, entries, onEntrySaved }) {
  const [expandAll, setExpandAll] = useState(false);
  const [phaseLogFor, setPhaseLogFor] = useState(null); // phaseRollup
  const [collapsedPhases, setCollapsedPhases] = useState(() => new Set());
  const activities = snapshot?.activities || [];

  const togglePhase = (phaseKey) => {
    setCollapsedPhases(prev => {
      const next = new Set(prev);
      if (next.has(phaseKey)) next.delete(phaseKey);
      else next.add(phaseKey);
      return next;
    });
  };
  const isCollapsed = (phaseKey) => collapsedPhases.has(phaseKey);

  const phaseRollups = useMemo(() => buildPhaseRollups(snapshot), [snapshot]);
  const projectLevelRollups = useMemo(() => buildProjectLevelRollups(snapshot), [snapshot]);

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
          onClick={() => { setExpandAll(true); setCollapsedPhases(new Set()); }}
          style={btnStyle()}
        >Expand All</button>
        <button
          onClick={() => {
            setExpandAll(false);
            const all = new Set();
            if (projectLevelRollups.project_setup)      all.add('project_setup');
            if (projectLevelRollups.project_protection) all.add('project_protection');
            if (projectLevelRollups.project_cleanup)    all.add('project_cleanup');
            for (const p of presentPhases) all.add(p);
            setCollapsedPhases(all);
          }}
          style={btnStyle()}
        >Collapse All</button>
      </div>

      {projectLevel.before.length > 0 && projectLevelRollups.project_setup && (
        <PhaseHeader
          phase="project_setup"
          label="PROJECT SETUP"
          rollup={projectLevelRollups.project_setup}
          entries={entries}
          entriesByActivity={entriesByActivity}
          collapsed={isCollapsed('project_setup')}
          onToggle={() => togglePhase('project_setup')}
          onLog={() => setPhaseLogFor(projectLevelRollups.project_setup)}
        />
      )}
      {!isCollapsed('project_setup') && projectLevel.before.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
          onEntrySaved={onEntrySaved}
        />
      ))}
      {projectLevel.middle.length > 0 && projectLevelRollups.project_protection && (
        <PhaseHeader
          phase="project_protection"
          label="PROJECT PROTECTION"
          rollup={projectLevelRollups.project_protection}
          entries={entries}
          entriesByActivity={entriesByActivity}
          collapsed={isCollapsed('project_protection')}
          onToggle={() => togglePhase('project_protection')}
          onLog={() => setPhaseLogFor(projectLevelRollups.project_protection)}
        />
      )}
      {!isCollapsed('project_protection') && projectLevel.middle.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
          onEntrySaved={onEntrySaved}
        />
      ))}

      {presentPhases.map(phase => {
        const parentsInPhase = ELEMENT_PARENT_ORDER.filter(p => phaseGroups[phase] && phaseGroups[phase][p]);
        if (parentsInPhase.length === 0) return null;
        const phaseRollup = phaseRollups[phase];
        const collapsed = isCollapsed(phase);
        return (
          <div key={phase}>
            <PhaseHeader
              phase={phase}
              label={PHASE_LABELS[phase] || phase.toUpperCase()}
              rollup={phaseRollup}
              entries={entries}
              entriesByActivity={entriesByActivity}
              collapsed={collapsed}
              onToggle={() => togglePhase(phase)}
              onLog={() => setPhaseLogFor(phaseRollup)}
            />
            {!collapsed && parentsInPhase.flatMap(parent => (
              phaseGroups[phase][parent].map(act => (
                <ActivityRow
                  key={act.activity_id}
                  activity={act}
                  entries={entriesByActivity[act.activity_id] || []}
                  forceExpanded={expandAll}
                  onEntrySaved={onEntrySaved}
                />
              ))
            ))}
          </div>
        );
      })}

      {projectLevel.after.length > 0 && projectLevelRollups.project_cleanup && (
        <PhaseHeader
          phase="project_cleanup"
          label="PROJECT CLEANUP"
          rollup={projectLevelRollups.project_cleanup}
          entries={entries}
          entriesByActivity={entriesByActivity}
          collapsed={isCollapsed('project_cleanup')}
          onToggle={() => togglePhase('project_cleanup')}
          onLog={() => setPhaseLogFor(projectLevelRollups.project_cleanup)}
        />
      )}
      {!isCollapsed('project_cleanup') && projectLevel.after.map(act => (
        <ActivityRow
          key={act.activity_id}
          activity={act}
          entries={entriesByActivity[act.activity_id] || []}
          forceExpanded={expandAll}
          onEntrySaved={onEntrySaved}
        />
      ))}

      {phaseLogFor && (
        <PhaseLogForm
          phaseRollup={phaseLogFor}
          onClose={() => setPhaseLogFor(null)}
          onSaved={onEntrySaved}
        />
      )}
    </div>
  );
}

function PhaseHeader({ phase, label, rollup, entries, entriesByActivity, collapsed, onToggle, onLog }) {
  const logged = rollup ? sumPhaseLoggedHours(rollup, entries) : 0;
  const est = rollup?.estimated_hours || 0;
  const pct = rollup ? computePhaseCompletion(rollup, entriesByActivity) : 0;
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, marginBottom: 6,
        padding: '6px 8px', background: 'rgba(130, 170, 255, 0.06)',
        borderLeft: '2px solid var(--accent)', borderRadius: 3, fontSize: 12,
        cursor: onToggle ? 'pointer' : 'default',
        userSelect: 'none',
      }}
      aria-expanded={!collapsed}
      role={onToggle ? 'button' : undefined}
    >
      <span style={{ color: 'var(--accent)', width: 12, fontSize: 10 }}>{collapsed ? '▶' : '▼'}</span>
      <strong style={{ flex: 1, color: 'var(--accent)', fontSize: 11, letterSpacing: 0.5 }}>═══ {label} ═══</strong>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 80, textAlign: 'right' }}>
        {logged.toFixed(1)}h / {est.toFixed(1)}h
      </span>
      <span style={{ color: pctColor(pct), fontSize: 11, fontWeight: 600, minWidth: 40, textAlign: 'right' }}>
        {pct.toFixed(0)}%
      </span>
      {rollup && rollup.activities.length > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onLog?.(); }}
          style={{
            background: 'var(--accent, #82aaff)', color: 'var(--bg, #0f0f0f)',
            border: 'none', padding: '2px 8px', borderRadius: 3,
            fontSize: 10, fontWeight: 600, cursor: 'pointer',
          }}
        >+ Log Phase</button>
      )}
    </div>
  );
}

function pctColor(pct) {
  if (pct >= 100) return '#5d5';
  if (pct >= 50)  return '#82aaff';
  if (pct > 0)    return '#f1c40f';
  return 'var(--text-muted)';
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
