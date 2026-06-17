import { useState, useMemo, useEffect } from 'react';
import { useProject } from '../../hooks/useProject';
import { useEstimateScenario } from '../../hooks/useEstimateScenario';
import { deriveRoom } from '../../engine/derive-room';
import { exportProject } from '../../engine/export-project';
import { PHASE_ORDER, PHASE_COLORS, specDisplayName, QUANTITY_KEY_LABELS } from '../../data/constants';
import { FLOOR_TYPES, FLOOR_PROTECTION_LABEL } from '../../data/fixture-catalog';
import { maskLabel } from '../../data/mask-levels';
import { SUBSTRATE_MAP } from '../../data/substrate-catalog';
import { useSpecData } from '../../hooks/useSpecData';
import { COMPLEXITY_OPT_OUT_SPECS } from '../../data/constants';
import { computeMultiQT } from '../../engine/multi-qt.js';
import { assembleBundle } from '../../engine/proposal-bundle.js';
import { computeScenarioEstimate } from '../../engine/scenario-estimate.js';
import canonicalBundle from '../../data/scenario-bundle.gen.js';
import { useCompanyProfile } from '../../hooks/useCompanyProfile.js';
import ScenarioEnginePanel from './ScenarioEnginePanel.jsx';
import EstimateDiagnostic from './EstimateDiagnostic.jsx';
import RateCell from './RateCell.jsx';
import RateOverridePruneBanner from './RateOverridePruneBanner.jsx';

/** Format decimal hours as Xh Ym */
function fmtHrs(h) {
  if (!h || h <= 0) return '0m';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
}

// Height-band display labels for grouping band-stratified tasks. Window
// casing/jamb/stool/apron may have tasks at multiple bands in the same room
// when windows mix ground + clerestory + transom.
const HEIGHT_BAND_LABELS = {
  STD:      'Ground Level',
  STEP:     'Step Ladder (9–13 ft)',
  EXT:      'Extension Ladder (13–18 ft)',
  SCAFFOLD: 'Scaffold (18–25 ft)',
  LIFT:     'Lift (25+ ft)',
};
const HEIGHT_BAND_ORDER = ['STD', 'STEP', 'EXT', 'SCAFFOLD', 'LIFT'];

// Window-related spec base IDs — used to scope the "Second Story Window" prefix
// on non-STD band rows. Mirrors WINDOW_BAND_SPEC_KEYS in context-adapter.js.
const WINDOW_BAND_SPEC_BASES = new Set([
  'SF_WINDOW_CASING_NC_PAINT', 'SF_WINDOW_CASING_NC_PRIME',
  'SF_WINDOW_JAMB_NC_FINISH',  'SF_WINDOW_JAMB_NC_PRIME',
  'SF_WINDOW_STOOL_NC_PAINT',  'SF_WINDOW_STOOL_NC_PRIME',
  'SF_WINDOW_APRON_NC_PAINT',  'SF_WINDOW_APRON_NC_PRIME',
]);

// Ceiling/wall spec ID pattern — used to scope the Cathedral/Vaulted Ceiling
// suffix on the spec row header + task lines. Matches drywall + wood variants.
const CEILING_WALL_SPEC_REGEX = /(_WALL|_CEILING)/;

// Solid colors for the stacked phase bars (visible on dark backgrounds)
const PHASE_BAR_COLORS = {
  setup:      '#3a5a8a',
  prep:       '#4a6a3a',
  prime:      '#6a5a8a',
  apply:      '#5a4a6a',
  interstage: '#6a5a3a',
  finish:     '#3a6a5a',
  cleanup:    '#5a3a4a',
};

/** Stacked horizontal phase bar */
const PhaseBar = ({ phaseHours, total, height = 24 }) => {
  if (!total || total <= 0) return null;
  return (
    <div style={{ display: 'flex', borderRadius: 4, overflow: 'hidden', height, width: '100%' }}>
      {PHASE_ORDER.filter(p => phaseHours[p] > 0).map(p => {
        const pct = (phaseHours[p] / total) * 100;
        return (
          <div
            key={p}
            title={`${p}: ${phaseHours[p].toFixed(2)}h (${pct.toFixed(1)}%)`}
            style={{
              width: `${pct}%`, minWidth: 50,
              background: PHASE_BAR_COLORS[p] || 'var(--bg-tertiary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, color: '#fff', fontWeight: 600,
              padding: '0 4px', overflow: 'hidden', whiteSpace: 'nowrap',
            }}>
            {`${p} ${phaseHours[p].toFixed(1)}h`}
          </div>
        );
      })}
    </div>
  );
};

const CAT_LABELS = {
  'PS_SURFACE_SF': 'Surface Area (SF)',
  'PS_SURFACE_LF': 'Surface Linear (LF)',
  'PS_SURFACE_EA': 'Surface Count (EA)',
  'PS_SURFACE_EA_SIDE': 'Surface Sides (EA_SIDE)',
  'PS_EDGE_LF': 'Edges (LF)',
  'PS_OPENING_EA': 'Openings (EA)',
  'PS_META': 'Meta / Routing',
  'PS_PROTECT_SF': 'Protection Area (SF)',
  'PS_PROTECT_LF': 'Protection Linear (LF)',
  'PS_PROTECT_EA': 'Protection Count (EA)',
};

export default function EstimateView() {
  const { state, dispatch, projectId } = useProject();
  const estimate = useEstimateScenario();
  const { specData } = useSpecData();

  const { profile } = useCompanyProfile();
  // Persist expansion state across full HMR reloads (Phase B publish triggers
  // a bundle regen that Fast-Refresh-invalidates useProject.jsx → full reload).
  // sessionStorage keeps the room/item open between reloads but clears on new
  // tab / browser restart so the default-collapsed behavior still applies to
  // fresh sessions.
  const [expandedRooms, setExpandedRooms] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('paintscope_estimate_expandedRooms') || '{}'); }
    catch { return {}; }
  });
  const [expandedItems, setExpandedItems] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('paintscope_estimate_expandedItems') || '{}'); }
    catch { return {}; }
  });
  useEffect(() => {
    try { sessionStorage.setItem('paintscope_estimate_expandedRooms', JSON.stringify(expandedRooms)); } catch {}
  }, [expandedRooms]);
  useEffect(() => {
    try { sessionStorage.setItem('paintscope_estimate_expandedItems', JSON.stringify(expandedItems)); } catch {}
  }, [expandedItems]);
  const [showSummary, setShowSummary] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Summary data (merged from ProjectSummary)
  const exported = useMemo(() => exportProject(state), [state]);
  const winningFloorKey = useMemo(() => {
    const hasFullCover = state.rooms.some(r => {
      const subs = r.substrates || {};
      return subs.walls || subs.ceilings;
    });
    if (hasFullCover) return 'PS_PROTECT_SF.FLOOR_EXPOSED';
    const hasWorkzone = state.rooms.some(r => {
      const subs = r.substrates || {};
      return subs.doors?.painting || subs.windows?.painting || subs.door_frames || subs.window_jamb;
    });
    if (hasWorkzone) return 'PS_PROTECT_SF.FLOOR_WORKZONE';
    return 'PS_PROTECT_SF.FLOOR_PERIMETER';
  }, [state.rooms]);
  const qtyByCategory = useMemo(() => {
    const suppressed = new Set(['PS_PROTECT_SF.FLOOR_EXPOSED', 'PS_PROTECT_SF.FLOOR_WORKZONE', 'PS_PROTECT_SF.FLOOR_PERIMETER']);
    suppressed.delete(winningFloorKey);
    const cats = {};
    exported.ps_quantities.forEach(q => {
      if (suppressed.has(q.quantity_key)) return;
      const prefix = q.quantity_key.split('.')[0];
      if (!cats[prefix]) cats[prefix] = [];
      cats[prefix].push(q);
    });
    return cats;
  }, [exported, winningFloorKey]);

  // Task name suffix: adds coat count, floor protection material, and ceiling-
  // type label. Cathedral/Vaulted suffix surfaces on ceiling/wall tasks always,
  // and on window tasks only when the task is band-stratified to a non-STD band
  // (i.e. clerestory/transom \u2014 second-story windows that share the gable wall).
  const taskNameSuffix = (t, baseSpecId = null) => {
    const parts = [];
    if (t.coatMultiplier > 1) parts.push(`${t.coatMultiplier} coats`);
    if (t.floorType && t.taskName && t.taskName.toLowerCase().includes('floor prot') && FLOOR_PROTECTION_LABEL[t.floorType]) {
      parts.push(`${FLOOR_PROTECTION_LABEL[t.floorType]} \u2014 ${(FLOOR_TYPES.find(f=>f.id===t.floorType)||{}).label||t.floorType}`);
    }
    if (t.cathedralCeiling || t.vaultedCeiling) {
      const isCeilOrWall = baseSpecId && CEILING_WALL_SPEC_REGEX.test(baseSpecId);
      const isWindow = baseSpecId && WINDOW_BAND_SPEC_BASES.has(baseSpecId);
      if (isCeilOrWall || (isWindow && t.band && t.band !== 'STD')) {
        parts.push(t.cathedralCeiling ? 'Cathedral Ceiling' : 'Vaulted Ceiling');
      }
    }
    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  };

  const handleExportEstimate = () => {
    if (!estimate) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      project: {
        name: state.project?.name || null,
        client: state.project?.client_name || null,
        defaultQualityTier: state.project?.default_quality_tier || null,
        roomCount: (state.rooms || []).length,
      },
      totals: {
        totalHours: estimate.totalHours,
        totalCrewDays: estimate.totalCrewDays,
        activatedSpecs: estimate.activatedSpecs,
        totalSpecs: estimate.totalSpecs,
      },
      specResults: estimate.specResults,
      roomProtection: estimate.roomProtection,
      fixtureProtection: estimate.fixtureProtection,
      closetShelfProtection: estimate.closetShelfProtection,
      exteriorProtection: estimate.exteriorProtection,
      warnings: estimate.warnings,
      pricing: estimate.pricing,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = (state.project?.name || 'project').replace(/\s+/g, '_');
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `estimate_${slug}_${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateProposal = async () => {
    if (!estimate || !profile) return;
    setGeneratingProposal(true);
    try {
      const scenarioRunner = (qtState, db, _ignored, prof) =>
        computeScenarioEstimate(qtState, db, canonicalBundle, prof, []);
      const multiQT = computeMultiQT(scenarioRunner, state, specData, profile, estimate);
      const bundle = assembleBundle(state, profile, estimate.pricing, multiQT);

      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal_${(state.project?.name || 'project').replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingProposal(false);
    }
  };

  // Project-wide protection rollup — aggregates every task from every
  // per-input result whose scenario is a protection scenario, summing
  // quantities + hours by (taskId + phase). Matches:
  //   SCN_ROOM_PROTECTION_NC
  //   SCN_CABINET_PROTECT_*
  //   SCN_CLOSET_SHELF_PROTECT_*
  // Renders as a sibling card to the room cards (see "Project Protection"
  // section in the JSX below). Placed BEFORE the early-return guards to
  // keep hooks-order stable across renders.
  const projectProtection = useMemo(() => {
    const inputs = (estimate?.perInputResults || []).filter(pr => pr?.scenarioId && /PROTECT/.test(pr.scenarioId));
    if (inputs.length === 0) return null;
    const taskMap = new Map();      // key: taskId+phase → aggregated row
    const phaseHours = {};
    let totalHours = 0;
    for (const pr of inputs) {
      for (const t of pr.tasks || []) {
        const key = (t.taskId || t.taskName || 'unknown') + '::' + (t.phase || 'apply');
        const existing = taskMap.get(key);
        const roomLabel = t.roomLabel || pr.roomLabel || null;
        if (existing) {
          existing.quantity += (parseFloat(t.quantity) || 0);
          existing.hours += (parseFloat(t.hours) || 0);
          existing.roomCount += 1;
          if (roomLabel) existing.roomLabels.add(roomLabel);
        } else {
          const labels = new Set();
          if (roomLabel) labels.add(roomLabel);
          taskMap.set(key, {
            taskId: t.taskId,
            taskName: t.taskName,
            phase: t.phase || 'apply',
            psKey: t.psKey || t.ps_key,
            uom: t.uom,
            baseRate: t.baseRate,
            quantity: parseFloat(t.quantity) || 0,
            hours: parseFloat(t.hours) || 0,
            roomCount: 1,
            roomLabels: labels,
            isFixed: !!t.isFixed,
            coatMultiplier: t.coatMultiplier,
          });
        }
        const ph = t.phase || 'apply';
        phaseHours[ph] = (phaseHours[ph] || 0) + (parseFloat(t.hours) || 0);
        totalHours += (parseFloat(t.hours) || 0);
      }
    }
    return {
      tasks: [...taskMap.values()].map(t => ({ ...t, roomLabels: [...t.roomLabels].sort() })),
      phaseHours,
      totalHours: Math.round(totalHours * 100) / 100,
      inputCount: inputs.length,
    };
  }, [estimate?.perInputResults]);

  // Warn-band element — reused across error, empty-spec, and main views so
  // dropped rate overrides surface no matter which branch renders.
  const pruneReportBanner = (
    <RateOverridePruneBanner
      report={state._lastRateOverridePruneReport}
      onDismiss={() => dispatch({ type: 'CLEAR_PRUNE_REPORT' })}
    />
  );

  if (!estimate) return <>{pruneReportBanner}<div className="no-data-msg">Error running estimate. Check console for details.</div></>;
  if (estimate.specResults.length === 0) return (
    <>
      {pruneReportBanner}
      <div className="no-data-msg">
        <div style={{fontSize:18,marginBottom:8}}>No Specs Activated</div>
        <div>Add rooms with geometry (wall SF, doors, trim, etc.) to activate specs.</div>
        <div style={{marginTop:8,fontSize:12}}>The engine checks {specData.spec_families.length} spec families against your project's PaintScope quantity keys.</div>
      </div>
    </>
  );

  const toggleRoom = (id) => setExpandedRooms(p => ({...p, [id]: p[id] === true ? false : true}));
  const toggleItem = (id) => setExpandedItems(p => ({...p, [id]: !p[id]}));

  const projCtx = {
    quality_tier: state.project.default_quality_tier,
    complexity: state.project.default_complexity,
    texture: 'smooth'
  };

  // Build room-grouped structure: room -> spec (paintable item) -> tasks
  const allTasks = estimate.specResults.flatMap(s =>
    s.tasks.map(t => ({...t, specId: s.specId, specName: s.specName, itemGroup: s.itemGroup || null}))
  );

  const roomMap = {};
  allTasks.forEach(t => {
    const ri = t.roomIndex;
    const specKey = t.itemGroup ? `${t.specId}::${t.itemGroup}` : t.specId;
    if (!roomMap[ri]) roomMap[ri] = { label: t.roomLabel, specs: {}, totalHours: 0, phaseHours: {} };
    if (!roomMap[ri].specs[specKey]) roomMap[ri].specs[specKey] = { specName: t.specName, tasks: [], totalHours: 0, phaseHours: {} };
    roomMap[ri].specs[specKey].tasks.push(t);
    roomMap[ri].specs[specKey].totalHours += t.hours;
    const p = t.phase || 'apply';
    roomMap[ri].specs[specKey].phaseHours[p] = (roomMap[ri].specs[specKey].phaseHours[p] || 0) + t.hours;
    roomMap[ri].totalHours += t.hours;
    roomMap[ri].phaseHours[p] = (roomMap[ri].phaseHours[p] || 0) + t.hours;
  });

  // Add room protection hours to room totals and phase totals
  if (estimate.roomProtection) {
    Object.entries(estimate.roomProtection).forEach(([ri, rp]) => {
      if (roomMap[ri]) {
        roomMap[ri].totalHours += rp.totalHours;
        rp.tasks.forEach(t => {
          const p = t.phase || 'setup';
          roomMap[ri].phaseHours[p] = (roomMap[ri].phaseHours[p] || 0) + t.hours;
        });
      }
    });
  }

  // Add fixture protection hours to room totals and phase totals
  if (estimate.fixtureProtection) {
    Object.entries(estimate.fixtureProtection).forEach(([ri, fp]) => {
      if (roomMap[ri]) {
        roomMap[ri].totalHours += fp.totalHours;
        fp.tasks.forEach(t => {
          const p = t.phase || 'setup';
          roomMap[ri].phaseHours[p] = (roomMap[ri].phaseHours[p] || 0) + t.hours;
        });
      }
    });
  }

  const roomEntries = Object.entries(roomMap).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));

  // Project-wide phase hours
  const projectPhaseHours = {};
  roomEntries.forEach(([, roomData]) => {
    Object.entries(roomData.phaseHours).forEach(([p, h]) => {
      projectPhaseHours[p] = (projectPhaseHours[p] || 0) + h;
    });
  });
  const projectTotalHours = parseFloat(estimate.totalHours) || 0;

  // projectProtection useMemo moved to before the early-return guards at
  // line ~196 to keep hooks-order stable across renders.
  const projectProtectionPct = projectTotalHours > 0 && projectProtection
    ? Math.round((projectProtection.totalHours / projectTotalHours) * 100)
    : 0;

  // Consolidated material estimates: group by productId + surfaceTexture
  const consolidatedMaterials = useMemo(() => {
    if (!estimate.materialEstimates || estimate.materialEstimates.length === 0) return [];
    const groups = {};
    estimate.materialEstimates.forEach(m => {
      const key = `${m.productId || m.systemName || m.specFamilyId}||${m.productRole || ''}||${m.surfaceTexture || ''}`;
      if (!groups[key]) {
        groups[key] = {
          systemName: m.systemName || m.specFamilyId,
          productName: m.productName || m.systemName || m.specFamilyId,
          brand: m.brand || null,
          resolvedBy: m.resolvedBy || null,
          surfaceTexture: m.surfaceTexture || '',
          gallons: 0,
          totalSF: 0,
          totalCost: 0,
          coats: m.coats || 1,
          coverageRate: m.coverageRate,
          sprayLoss: m.sprayLoss,
          pricePerGallon: m.pricePerGallon || null,
        };
      }
      groups[key].gallons += m.gallons;
      groups[key].totalSF += m.totalSF;
      if (m.totalCost) groups[key].totalCost += m.totalCost;
    });
    return Object.values(groups);
  }, [estimate.materialEstimates]);

  // Group materials by product type
  const materialsByType = useMemo(() => {
    const byType = {};
    consolidatedMaterials.forEach(m => {
      const type = m.systemName.includes('Primer') || m.systemName.includes('primer')
        ? 'Primers' : m.systemName.includes('Stain') ? 'Stains' : 'Finish';
      if (!byType[type]) byType[type] = [];
      byType[type].push(m);
    });
    return byType;
  }, [consolidatedMaterials]);

  return (
    <div>
      {/* ── Dashboard Header Card ── */}
      <div className="estimate-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <h2>Estimate{state.project.name ? ` \u2014 ${state.project.name}` : ''}</h2>
          {estimate?.gaps?.length > 0 && (
            <span style={{fontSize:10,color:'var(--warning)'}}>{estimate.gaps.length} gap{estimate.gaps.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <div className="estimate-totals">
          <div><span className="big-num">{fmtHrs(estimate.totalHours)}</span></div>
          <div><span className="big-num">{estimate.totalCrewDays}</span><span className="unit">crew days</span><span style={{fontSize:11,color:'var(--text-muted)',marginLeft:4}}>(@ 8hr, 2 crew)</span></div>
          <div style={{color:'var(--text-secondary)',alignSelf:'center'}}>{estimate.activatedSpecs}/{estimate.totalSpecs} specs | {state.rooms.length} rooms</div>
          {estimate.pricing && (
            <div style={{marginLeft:'auto',textAlign:'right'}}>
              <div style={{fontSize:11,color:'var(--text-muted)'}}>Bid Price</div>
              <div style={{fontSize:24,fontWeight:700,color:'var(--success)',fontFamily:'var(--font-mono)'}}>
                ${estimate.pricing.bidPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:8,marginLeft: estimate.pricing ? 0 : 'auto'}}>
            <button
              className="btn"
              onClick={handleExportEstimate}
              title="Download full estimate JSON (tasks, hours, phases, protection) for diagnostic diffing"
            >
              Export Estimate JSON
            </button>
            <button
              className={`btn${estimate.pricing ? ' btn-accent' : ''}`}
              onClick={handleGenerateProposal}
              disabled={generatingProposal || !estimate.pricing}
              style={{opacity: (!estimate.pricing) ? 0.5 : 1}}
            >
              {generatingProposal ? 'Generating\u2026' : 'Generate Proposal'}
            </button>
          </div>
        </div>

        {/* Project-wide stacked phase bar */}
        <div style={{marginTop:12}}>
          <PhaseBar phaseHours={projectPhaseHours} total={projectTotalHours} height={24} />
        </div>
      </div>

      {/* Scenario engine comparison panel (Beta — toggle to enable) */}
      <ScenarioEnginePanel legacyEstimate={estimate} />

      {/* Modifier chips */}
      <div className="modifier-summary">
        <div className="mod-chip"><span className="mod-label">QT:</span><span className="mod-val">{projCtx.quality_tier}</span></div>
        <div className="mod-chip"><span className="mod-label">Texture:</span><span className="mod-val">{projCtx.texture}</span></div>
        <div className="mod-chip"><span className="mod-label">Complexity:</span><span className="mod-val">{projCtx.complexity}</span></div>
      </div>

      {/* Tab bar: Summary vs Diagnostic */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 12 }}>
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'diagnostic', label: 'Diagnostic' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: activeTab === tab.id ? 'var(--bg-secondary, var(--bg-tertiary))' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 600 : 400,
              borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'diagnostic' && <EstimateDiagnostic />}

      {activeTab === 'summary' && (<>

      {/* ── Project Summary (collapsible) ── */}
      <details open={showSummary} onToggle={e => setShowSummary(e.target.open)} style={{marginBottom:12}}>
        <summary style={{cursor:'pointer',fontSize:12,fontWeight:600,color:'var(--text-secondary)',padding:'6px 0',userSelect:'none'}}>
          Project Summary ({exported.ps_quantities.length} quantity keys | {state.rooms.length} rooms | {exported._meta.total_wall_sf} SF wall | {exported._meta.total_ceiling_sf} SF ceiling)
        </summary>

        {/* Room breakdown table */}
        <div className="panel-section" style={{marginTop:8}}>
          <div style={{overflowX:'auto'}}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{minWidth:120}}>Room</th>
                  <th>Area Group</th>
                  <th style={{width:80,textAlign:'center'}}>Dims</th>
                  <th style={{width:70,textAlign:'right'}}>Wall SF</th>
                  <th style={{width:70,textAlign:'right'}}>Ceil SF</th>
                  <th style={{width:60,textAlign:'center'}}>Opens</th>
                  <th style={{width:60,textAlign:'center'}}>Wins</th>
                  <th style={{maxWidth:200}}>Substrates</th>
                  <th>QT</th>
                </tr>
              </thead>
              <tbody>
                {state.rooms.map((room, idx) => {
                  const d = deriveRoom(room);
                  const activeSubKeys = Object.keys(room.substrates||{}).filter(k => {
                    const ap = k==='doors'||k==='windows'||k==='door_casing'||k==='window_casing';
                    return ap ? room.substrates[k]?.painting : true;
                  });
                  return (
                    <tr key={room.id} style={idx % 2 === 1 ? {background:'var(--bg-panel)'} : undefined}>
                      <td style={{fontWeight:500,minWidth:120}}>{room.label}</td>
                      <td style={{color:'var(--text-muted)'}}>{room.area_group||'\u2014'}</td>
                      <td style={{fontFamily:'var(--font-mono)',width:80,textAlign:'center'}}>{d.L}{'\u00d7'}{d.W}{'\u00d7'}{d.H}</td>
                      <td style={{fontFamily:'var(--font-mono)',color:'var(--accent)',width:70,textAlign:'right'}}>{d.wall_field_sf}</td>
                      <td style={{fontFamily:'var(--font-mono)',color:'var(--accent)',width:70,textAlign:'right'}}>{d.ceiling_field_sf}</td>
                      <td style={{fontFamily:'var(--font-mono)',width:60,textAlign:'center'}}>{d.totalOpenings}</td>
                      <td style={{fontFamily:'var(--font-mono)',width:60,textAlign:'center'}}>{d.totalWindows}</td>
                      <td style={{fontSize:11,color:'var(--text-secondary)',maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeSubKeys.length > 0 ? activeSubKeys.map(s => SUBSTRATE_MAP[s]?.label || s).join(', ') : '\u2014'}</td>
                      <td>{state.project.default_quality_tier} <span style={{fontSize:10,color:'var(--text-muted)'}}>({d.heightBand})</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quantity keys by category */}
        <div className="summary-grid" style={{marginTop:8}}>
          {Object.entries(qtyByCategory).map(([cat, items]) => (
            <div key={cat} className="summary-card">
              <div className="summary-card-title">{CAT_LABELS[cat] || cat}</div>
              {items.map(q => (
                <div key={q.quantity_key} className="summary-row">
                  <span style={{fontFamily:'var(--font-mono)',fontSize:11}}>{QUANTITY_KEY_LABELS[q.quantity_key] || q.quantity_key}</span>
                  <span className="summary-value">{q.value !== null ? q.value : q.text_value} {q.uom}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </details>

      {/* Warnings */}
      {estimate.warnings.length > 0 && (
        <details className="warn-panel">
          <summary>{estimate.warnings.length} warning{estimate.warnings.length>1?'s':''}</summary>
          <ul>{estimate.warnings.map((w,i) => <li key={i}>{w}</li>)}</ul>
        </details>
      )}

      {/* Info messages for complexity opt-out specs — dedup by specName so a
          spec firing in N rooms shows one line, not N. */}
      {(() => {
        const uniqueOptOutNames = [...new Set(
          (estimate.specResults || [])
            .filter(sr => COMPLEXITY_OPT_OUT_SPECS.has(sr.specId))
            .map(sr => sr.specName || sr.specId)
        )];
        const complexityInfos = uniqueOptOutNames.map(name =>
          `Complexity modifier not applicable to ${name} — door/frame type and QT cover variation`
        );
        if (complexityInfos.length === 0) return null;
        return (
          <details className="warn-panel" style={{ borderColor: 'var(--text-muted)' }}>
            <summary style={{ color: 'var(--text-secondary)' }}>
              {complexityInfos.length} info
            </summary>
            <ul>
              {complexityInfos.map((msg, i) => (
                <li key={i} style={{ color: 'var(--text-secondary)' }}>{msg}</li>
              ))}
            </ul>
          </details>
        );
      })()}

      {/* ── Warn-band: dropped rate overrides (defined above the early returns) ── */}
      {pruneReportBanner}

      {/* ── Expand / Collapse All ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button className="btn btn-sm" onClick={() => {
          const rooms = {};
          const items = {};
          roomEntries.forEach(([ri, rd]) => {
            rooms[ri] = true;
            Object.keys(rd.specs).forEach(sk => { items[`${ri}::${sk}`] = true; });
            items[`${ri}::__ROOM_PROTECTION__`] = true;
            items[`${ri}::__FIXTURE_PROTECTION__`] = true;
          });
          setExpandedRooms(rooms);
          setExpandedItems(items);
        }}>Expand All</button>
        <button className="btn btn-sm" onClick={() => {
          const rooms = {};
          roomEntries.forEach(([ri]) => { rooms[ri] = false; });
          setExpandedRooms(rooms);
          setExpandedItems({});
        }}>Collapse All</button>
      </div>

      {/* ── Project Protection card (sibling to room cards) ──
          Aggregates all protection-scenario tasks (room protection +
          cabinet protect + closet shelf protect) across the whole project.
          Quantities and hours summed across rooms. Renders only when at
          least one protection scenario fires. */}
      {projectProtection && (() => {
        const ppKey = '__PROJECT_PROTECTION__';
        const isPpOpen = expandedRooms[ppKey] === true;
        return (
          <div className="spec-section" style={{marginBottom:12, borderLeft:'3px solid #e6a817'}}>
            <div className="spec-header" onClick={() => toggleRoom(ppKey)}>
              <span className={`chevron${isPpOpen ? ' open' : ''}`}>{'▶'}</span>
              <span className="spec-name" style={{marginLeft:8, color:'#e6a817'}}>
                Project Protection
                <span className="wo-room-dims">
                  {projectProtection.tasks.length} task{projectProtection.tasks.length === 1 ? '' : 's'} aggregated across {projectProtection.inputCount} room/spec instance{projectProtection.inputCount === 1 ? '' : 's'}
                  {projectTotalHours > 0 && ` · ${projectProtectionPct}% of project`}
                </span>
              </span>
              <span style={{flex:'0 0 auto', marginRight:12}}>
                <PhaseBar phaseHours={projectProtection.phaseHours} total={projectProtection.totalHours} height={14} />
              </span>
              <span className="spec-hours">{fmtHrs(projectProtection.totalHours)}</span>
            </div>
            {isPpOpen && (
              <div style={{padding:'0 16px 12px'}}>
                <div className="task-detail">
                  <table className="task-table">
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Phase</th>
                        <th>PS Key</th>
                        <th>UOM</th>
                        <th style={{textAlign:'right'}}>Qty (project)</th>
                        <th style={{textAlign:'right'}}>Rate</th>
                        <th style={{textAlign:'right'}}>Rooms</th>
                        <th style={{textAlign:'right'}}>Hours</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projectProtection.tasks
                        .sort((a, b) => (b.hours || 0) - (a.hours || 0))
                        .map((t, i) => (
                          <tr key={i} style={{background: PHASE_COLORS[t.phase] || 'transparent'}}>
                            <td className="task-name-col" title={t.roomLabels?.length ? `${t.taskName} — ${t.roomLabels.join(', ')}` : t.taskName}>
                              {t.taskName}{taskNameSuffix(t)}
                              {t.roomLabels?.length > 0 && (
                                <span style={{color:'var(--text-muted)', fontWeight:400, marginLeft:6}}>— {t.roomLabels.join(', ')}</span>
                              )}
                            </td>
                            <td style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</td>
                            <td style={{fontSize:10,color:'var(--derived)'}}>{t.psKey || '—'}</td>
                            <td style={{fontSize:11}}>{t.uom || '—'}</td>
                            <td style={{textAlign:'right'}}>{t.isFixed ? '—' : Math.round((t.quantity || 0) * 100) / 100}</td>
                            <RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} projectId={projectId} projectName={state.project.name || 'Untitled Project'} />
                            <td style={{textAlign:'right',fontSize:10,color:'var(--text-muted)'}}>{t.roomCount}</td>
                            <td style={{textAlign:'right',color:'var(--accent)',fontWeight:600}}>{fmtHrs(t.hours)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Room Cards ── */}
      {roomEntries.map(([ri, roomData]) => {
        const room = state.rooms[parseInt(ri)];
        const d = room ? deriveRoom(room) : null;
        const isRoomOpen = expandedRooms[ri] === true;
        // Pin SF_ROOM_PROTECTION to position #1 — scenario engine emits it as a regular spec that otherwise sorts by hours and buries mid-list.
        const isRoomProtectionSpec = (sk) => {
          const base = sk.includes('::') ? sk.split('::')[0] : sk;
          return base === 'SF_ROOM_PROTECTION';
        };
        const specEntries = Object.entries(roomData.specs).sort((a, b) => {
          const aProt = isRoomProtectionSpec(a[0]);
          const bProt = isRoomProtectionSpec(b[0]);
          if (aProt && !bProt) return -1;
          if (!aProt && bProt) return 1;
          return b[1].totalHours - a[1].totalHours;
        });

        return (
          <div key={ri} className="spec-section" style={{marginBottom:12}}>
            {/* Room header */}
            <div className="spec-header" onClick={() => toggleRoom(ri)}>
              <span className={`chevron${isRoomOpen ? ' open' : ''}`}>{'\u25B6'}</span>
              <span className="spec-name" style={{marginLeft:8}}>
                {roomData.label}
                {d && <span className="wo-room-dims">{d.L}x{d.W}x{d.H} | {d.wall_field_sf} SF wall | {d.ceiling_field_sf} SF ceil</span>}
              </span>
              <span style={{flex:'0 0 auto', marginRight:12}}>
                <PhaseBar phaseHours={roomData.phaseHours} total={roomData.totalHours} height={14} />
              </span>
              <span className="spec-hours">{fmtHrs(roomData.totalHours)}</span>
            </div>
            {/* Closet contribution */}
            {(() => {
              const closetHrs = estimate.closetHoursByRoom?.[ri];
              const closetCount = (room?.closets || []).length;
              if (!closetCount || !closetHrs) return null;
              const closetSF = (room.closets || []).reduce((s, c) => {
                const cL = parseFloat(c.length_ft) || 0, cW = parseFloat(c.width_ft) || 0, cH = parseFloat(room.height_ft) || 0;
                const perim = 2 * (cL + cW);
                return s + Math.max(0, Math.round(perim * cH - 21));
              }, 0);
              const closetCeilSF = (room.closets || []).reduce((s, c) => s + Math.round((parseFloat(c.length_ft) || 0) * (parseFloat(c.width_ft) || 0)), 0);
              const closetBaseLF = (room.closets || []).reduce((s, c) => s + Math.max(0, Math.round(2 * ((parseFloat(c.length_ft) || 0) + (parseFloat(c.width_ft) || 0)) - 3)), 0);
              return (
                <div style={{ padding: '4px 8px 4px 28px', fontSize: 11, color: 'var(--text-muted)', background: 'rgba(130,170,255,0.03)' }}>
                  {closetCount} closet{closetCount > 1 ? 's' : ''}: +{closetSF} SF wall, +{closetCeilSF} SF ceil, +{closetBaseLF} LF baseboard
                  <span style={{ marginLeft: 12, color: 'var(--accent)' }}>{fmtHrs(closetHrs)}</span>
                </div>
              );
            })()}

            {/* Expanded room content */}
            {isRoomOpen && (
              <div style={{padding:'0 16px 12px'}}>
                {/* Room Protection */}
                {estimate.roomProtection && estimate.roomProtection[ri] && (() => {
                  const rp = estimate.roomProtection[ri];
                  const rpKey = ri + '::__ROOM_PROTECTION__';
                  const isRpOpen = expandedItems[rpKey];
                  const levelLabel = maskLabel(rp.protectionLevel, { short: true });
                  return (
                    <div className="spec-section" style={{marginBottom:8}}>
                      <div className="spec-header" onClick={() => toggleItem(rpKey)}>
                        <span className={`chevron${isRpOpen ? ' open' : ''}`}>{'\u25B6'}</span>
                        <span className="spec-name" style={{marginLeft:8,color:'#e6a817'}}>Room Protection</span>
                        <span style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize',marginLeft:8}}>{levelLabel}</span>
                        <span className="spec-hours">{fmtHrs(rp.totalHours)}</span>
                      </div>
                      {isRpOpen && (
                        <div className="task-detail">
                          <table className="task-table">
                            <thead><tr><th>Task</th><th>Phase</th><th>Source Spec</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Hours</th></tr></thead>
                            <tbody>
                              {rp.tasks.map((t, i) => (
                                <tr key={i} style={{background: PHASE_COLORS[t.phase] || 'transparent'}}>
                                  <td className="task-name-col">{t.taskName}{taskNameSuffix(t)}</td>
                                  <td style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</td>
                                  <td style={{fontSize:10,color:'var(--derived)'}}>{specDisplayName(t.donorSpecId)}</td>
                                  <td style={{textAlign:'right'}}>{t.isFixed ? '\u2014' : t.quantity}</td>
                                  <RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} projectId={projectId} projectName={state.project.name || 'Untitled Project'} />
                                  <td style={{textAlign:'right',color:'var(--accent)',fontWeight:600}}>
                                    {fmtHrs(t.hours)}
                                    {t.coatMultiplier > 1 && <span style={{fontSize:9,color:'var(--text-muted)',marginLeft:3}}>{'\u00d7'}{t.coatMultiplier}</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Fixture Protection */}
                {estimate.fixtureProtection && estimate.fixtureProtection[ri] && (() => {
                  const fp = estimate.fixtureProtection[ri];
                  const fpKey = ri + '::__FIXTURE_PROTECTION__';
                  const isFpOpen = expandedItems[fpKey];
                  return (
                    <div className="spec-section" style={{marginBottom:8}}>
                      <div className="spec-header" onClick={() => toggleItem(fpKey)}>
                        <span className={`chevron${isFpOpen ? ' open' : ''}`}>{'\u25B6'}</span>
                        <span className="spec-name" style={{marginLeft:8,color:'#b87333'}}>Fixture Protection</span>
                        <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>{fp.tasks.length} entries</span>
                        <span className="spec-hours">{fmtHrs(fp.totalHours)}</span>
                      </div>
                      {isFpOpen && (
                        <div className="task-detail">
                          <table className="task-table">
                            <thead><tr><th>Task</th><th>Phase</th><th>PS Key</th><th>UOM</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Mod</th><th style={{textAlign:'right'}}>Hours</th></tr></thead>
                            <tbody>
                              {fp.tasks.map((t, i) => (
                                <tr key={i} style={{background: PHASE_COLORS[t.phase] || 'transparent'}}>
                                  <td className="task-name-col" title={t.taskName}>{t.taskName}</td>
                                  <td style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</td>
                                  <td style={{fontSize:10,color:'var(--derived)'}}>{t.fixtureId === 'feature_wall' ? 'PS_PROTECT_SF.FIXTURE_FEATURE_WALL' : `PS_PROTECT_EA.FIXTURE_${t.fixtureId?.toUpperCase()}`}</td>
                                  <td style={{fontSize:11}}>{t.uom || 'EA'}</td>
                                  <td style={{textAlign:'right'}}>{t.quantity || '\u2014'}</td>
                                  <RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} projectId={projectId} projectName={state.project.name || 'Untitled Project'} />
                                  <td style={{textAlign:'right',color:'var(--text-secondary)'}}>1.00x</td>
                                  <td style={{textAlign:'right',color:'var(--accent)',fontWeight:600}}>{fmtHrs(t.hours)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Spec rows */}
                {specEntries.map(([specId, specData]) => {
                  const itemKey = `${ri}::${specId}`;
                  const isItemOpen = expandedItems[itemKey];
                  const baseSpecId = specId.includes('::') ? specId.split('::')[0] : specId;
                  const rawDisplayName = specId.includes('::') ? specData.specName : (specDisplayName(baseSpecId) || specData.specName);
                  // Stain-family specs use a static "— Stain/Clear" label. When the
                  // active coating is stain_only or clear_only, swap the suffix to
                  // match what's actually being applied.
                  const specCoatingType = specData.tasks?.find(t => t.coatingType)?.coatingType || null;
                  const displayName = (baseSpecId.endsWith('_STAIN') && specCoatingType === 'stain_only')
                    ? rawDisplayName.replace('— Stain/Clear', '— Stain Only')
                    : (baseSpecId.endsWith('_STAIN') && specCoatingType === 'clear_only')
                      ? rawDisplayName.replace('— Stain/Clear', '— Clear Only')
                      : rawDisplayName;
                  // Cathedral/Vaulted suffix on the spec header \u2014 only for ceiling/wall
                  // specs. Window specs differentiate ground vs clerestory at the
                  // band-row level instead (see "Second Story Window" prefix).
                  const ceilingTypeHeaderSuffix = room && CEILING_WALL_SPEC_REGEX.test(baseSpecId)
                    ? (room.cathedral_ceiling ? ' (Cathedral Ceiling)' : room.vaulted_ceiling ? ' (Vaulted Ceiling)' : '')
                    : '';

                  return (
                    <div key={specId} className="spec-section" style={{marginBottom:8}}>
                      <div className="spec-header" onClick={() => toggleItem(itemKey)}>
                        <span className={`chevron${isItemOpen ? ' open' : ''}`}>{'\u25B6'}</span>
                        <span className="spec-name" style={{marginLeft:8}} title={specId.split('::')[0]}>{displayName}{ceilingTypeHeaderSuffix}</span>
                        <div className="phase-bar" style={{flex:'0 0 auto',padding:0,gap:3,marginRight:8}}>
                          {PHASE_ORDER.filter(p => specData.phaseHours[p]).map(p => (
                            <div key={p} className="phase-chip">
                              <span className="phase-label">{p}</span>
                              <span className="phase-hrs">{fmtHrs(specData.phaseHours[p])}</span>
                            </div>
                          ))}
                        </div>
                        <span className="spec-hours">{fmtHrs(specData.totalHours)}</span>
                      </div>
                      {isItemOpen && (() => {
                        // Group tasks by height_band for band-stratified specs
                        // (window casing/jamb/stool/apron when room mixes heights).
                        // Single-band specs render flat as before.
                        const taskRow = (t, i) => (
                          <tr key={i} style={{background: PHASE_COLORS[t.phase] || 'transparent'}}>
                            <td className="task-name-col" title={t.taskName}>{t.taskName}{taskNameSuffix(t, baseSpecId)}</td>
                            <td style={{fontSize:11,color:'var(--text-muted)',textTransform:'capitalize'}}>{t.phase}</td>
                            <td style={{fontSize:10,color:'var(--derived)'}}>{t.psKey}</td>
                            <td style={{fontSize:11}}>{t.uom}</td>
                            <td style={{textAlign:'right'}}>{t.isFixed ? '\u2014' : t.quantity}</td>
                            <RateCell taskId={t.taskId} baseRate={t.baseRate} isFixed={t.isFixed} override={state.project.rate_overrides?.[t.taskId]} dispatch={dispatch} projectId={projectId} projectName={state.project.name || 'Untitled Project'} />
                            <td style={{textAlign:'right',color:t.modStack.total>1.5?'var(--warning)':'var(--text-secondary)'}}
                                title={[
                                  t.modStack.qt !== 1 && `QT:${t.modStack.qt}`,
                                  t.modStack.height !== 1 && `Ht:${t.modStack.height}`,
                                  t.modStack.complexityApplicable === false ? 'Cmplx: n/a' :
                                    (t.modStack.complexity !== 1 && `Cmplx:${t.modStack.complexity}${t.modStack.complexityApplied ? '' : ' (phase exempt)'}`),
                                  t.modStack.sizeMod && t.modStack.sizeMod !== 1 && `Size:${t.modStack.sizeMod}`,
                                  t.modStack.typeMod && t.modStack.typeMod !== 1 && `Type:${t.modStack.typeMod}`,
                                  t.conditionScale && `Cond:${t.conditionScale}`
                                ].filter(Boolean).join(' \u00d7 ') || 'No modifiers'}>
                              {t.modStack.total.toFixed(2)}x
                              {t.conditionScale && t.conditionScale !== 'GOOD' && (
                                <span style={{fontSize:9,marginLeft:3,padding:'1px 3px',borderRadius:2,
                                  background:t.conditionScale==='POOR'?'rgba(231,76,60,0.2)':'rgba(241,196,15,0.2)',
                                  color:t.conditionScale==='POOR'?'#e74c3c':'#f1c40f'
                                }}>{t.conditionScale}</span>
                              )}
                            </td>
                            <td style={{textAlign:'right',color:'var(--accent)',fontWeight:600}}
                                title={t.coatMultiplier > 1 ? `${fmtHrs(t.hours / t.coatMultiplier)} \u00d7 ${t.coatMultiplier} coats` : ''}>
                              {fmtHrs(t.hours)}
                              {t.coatMultiplier > 1 && <span style={{fontSize:9,color:'var(--text-muted)',marginLeft:3}}>{'\u00d7'}{t.coatMultiplier}</span>}
                            </td>
                          </tr>
                        );

                        const tableHead = (
                          <thead><tr><th>Task</th><th>Phase</th><th>PS Key</th><th>UOM</th><th style={{textAlign:'right'}}>Qty</th><th style={{textAlign:'right'}}>Rate</th><th style={{textAlign:'right'}}>Mod</th><th style={{textAlign:'right'}}>Hours</th></tr></thead>
                        );

                        // Bucket tasks by band (preserving original order within each)
                        const bandGroups = new Map();
                        for (const t of specData.tasks) {
                          const b = t.band || 'STD';
                          if (!bandGroups.has(b)) bandGroups.set(b, []);
                          bandGroups.get(b).push(t);
                        }
                        const presentBands = HEIGHT_BAND_ORDER.filter(b => bandGroups.has(b));

                        // Single-band path \u2014 preserve current flat layout
                        if (presentBands.length <= 1) {
                          return (
                            <div className="task-detail">
                              <table className="task-table">
                                {tableHead}
                                <tbody>{specData.tasks.map((t, i) => taskRow(t, i))}</tbody>
                              </table>
                            </div>
                          );
                        }

                        // Multi-band path \u2014 collapsible sub-section per band
                        return (
                          <div className="task-detail">
                            {presentBands.map(band => {
                              const bandTasks = bandGroups.get(band);
                              const bandHours = bandTasks.reduce((s, t) => s + (t.hours || 0), 0);
                              const bandKey = `${itemKey}::band:${band}`;
                              const isBandOpen = expandedItems[bandKey] === true; // default collapsed
                              const bandBaseLabel = HEIGHT_BAND_LABELS[band] || band;
                              const isWindowSpec = WINDOW_BAND_SPEC_BASES.has(baseSpecId);
                              const label = (isWindowSpec && band !== 'STD')
                                ? `Second Story Window - ${bandBaseLabel}`
                                : bandBaseLabel;
                              return (
                                <div key={band} style={{marginTop:4}}>
                                  <div
                                    onClick={() => toggleItem(bandKey)}
                                    style={{
                                      display:'flex', alignItems:'center', gap:6,
                                      padding:'4px 8px', cursor:'pointer',
                                      background:'var(--surface-2, rgba(255,255,255,0.03))',
                                      borderLeft:'2px solid var(--accent)',
                                      fontSize:11, fontWeight:500,
                                    }}
                                  >
                                    <span className={`chevron${isBandOpen ? ' open' : ''}`}>{'\u25b6'}</span>
                                    <span style={{color:'var(--text-secondary)'}}>{label}</span>
                                    <span style={{fontSize:10, color:'var(--text-muted)', marginLeft:4}}>({band})</span>
                                    <span style={{flex:1}} />
                                    <span style={{fontSize:10, color:'var(--text-muted)'}}>{bandTasks.length} task{bandTasks.length===1?'':'s'}</span>
                                    <span style={{color:'var(--accent)', fontWeight:600}}>{fmtHrs(bandHours)}</span>
                                  </div>
                                  {isBandOpen && (
                                    <table className="task-table">
                                      {tableHead}
                                      <tbody>{bandTasks.map((t, i) => taskRow(t, i))}</tbody>
                                    </table>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* ── Material Summary ── */}
      {consolidatedMaterials.length > 0 && (
        <div className="material-section">
          <h3>Material Estimates</h3>
          {Object.entries(materialsByType).map(([type, mats]) => (
            <div key={type} style={{marginBottom:12}}>
              <div style={{fontSize:11,fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:4}}>{type}</div>
              {mats.map((m, i) => (
                <div key={i} className="mat-row" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',padding:'4px 0'}}>
                  <div style={{flex:1}}>
                    <span className="mat-name" style={{fontWeight:600}}>{m.productName}</span>
                    {m.brand && <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:6}}>({m.brand})</span>}
                    <div style={{fontSize:11,color:'var(--text-muted)'}}>
                      {m.gallons} gal ({m.totalSF} SF {'\u00d7'} {m.coats} coat{m.coats>1?'s':''} @ {m.coverageRate} SF/gal{m.sprayLoss ? ' +5% spray' : ''})
                    </div>
                  </div>
                  {m.totalCost > 0 && (
                    <span style={{fontWeight:600,color:'var(--accent)',whiteSpace:'nowrap',marginLeft:12}}>
                      ${m.totalCost.toFixed(2)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
          {(() => {
            const totalMaterialCost = consolidatedMaterials.reduce((s, m) => s + (m.totalCost || 0), 0);
            return totalMaterialCost > 0 ? (
              <div style={{borderTop:'1px solid var(--border)',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',fontWeight:700}}>
                <span>Total Material Cost</span>
                <span style={{color:'var(--accent)'}}>${totalMaterialCost.toFixed(2)}</span>
              </div>
            ) : null;
          })()}
        </div>
      )}

      </>)}
    </div>
  );
}
