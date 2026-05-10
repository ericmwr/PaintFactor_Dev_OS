import { useMemo, useState } from 'react';
import { FIXTURE_MAP, FLOOR_TYPES } from '../../../data/fixture-catalog';
import { deriveProtectionDefaults } from '../../../engine/derive-protection-defaults.js';
import {
  MASK_LEVELS_FLOOR,
  MASK_LEVELS_WALL,
  MASK_LEVELS_CEILING,
  MASK_LEVEL_SHORT as LEVEL_LABEL_SHORT,
  getFixtureLevels,
  getFixtureDefault,
} from '../../../data/mask-levels';

export default function ProtectionTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const protection = room.protection || {};
  const fixtures = room.fixtures || {};

  // Run deriver to compute auto-suggested defaults from current scope/method/floor type.
  const derivedDefaults = useMemo(
    () => deriveProtectionDefaults(room, project),
    [room, project]
  );
  const cats = derivedDefaults._categories || {};

  const [focusedFixture, setFocusedFixture] = useState(null);

  const setProt = (field, value) =>
    dispatch({ type: 'SET_ROOM_PROTECTION_FIELD', payload: { roomId: rid, field, value } });

  const setFix = (fId, field, value) =>
    dispatch({ type: 'SET_FIXTURE', payload: { roomId: rid, fixtureId: fId, field, value } });

  const checkedFixtureIds = Object.keys(fixtures).filter(id => fixtures[id]);

  const floorTypeLabel = FLOOR_TYPES.find(f => f.id === room.floor_type)?.label || '— not set —';

  function MaskRow({ surface, label, qtyLabel, autoLevel, currentValue, options }) {
    const isAuto = !currentValue;
    const effective = currentValue || autoLevel;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{qtyLabel}</div>
        </div>
        <div>
          <span style={{
            fontSize: 11, padding: '2px 8px', borderRadius: 3,
            background: isAuto ? 'var(--bg-tertiary)' : 'var(--accent)',
            color: isAuto ? 'var(--text-secondary)' : '#fff',
            fontWeight: 600
          }}>
            {isAuto ? 'AUTO' : 'OVERRIDE'}
          </span>
        </div>
        <div>
          <select
            value={currentValue || ''}
            onChange={e => setProt(`${surface}_mask_level`, e.target.value)}
            style={{ width: '100%', fontSize: 12 }}
          >
            <option value="">Auto: {LEVEL_LABEL_SHORT[autoLevel] || autoLevel}</option>
            {options.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
          {LEVEL_LABEL_SHORT[effective] || effective}
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Floor protection + per-fixture levels are set on the Identity tab. Override walls/ceiling here for the rare scenarios that need them, plus advanced fixture detail (multi-item feature walls, notes).
      </div>

      {/* ── Floor type readout (set on Identity tab) ── */}
      <div className="panel-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div className="field-label">Floor Type</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{floorTypeLabel}</div>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Set on Identity tab
          </div>
        </div>
        {/* Auto-derived scope summary, mostly diagnostic */}
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          Active scope: {[
            cats.ceiling && `ceiling (${cats.methods?.ceiling || '—'})`,
            cats.walls && `walls (${cats.methods?.walls || '—'})`,
            (cats.fineFinish || []).length > 0 && `trim:${(cats.fineFinish || []).length} (${cats.methods?.fineFinish || '—'})`,
            cats.openings && `openings (${cats.methods?.openings || '—'})`,
          ].filter(Boolean).join(' + ') || 'nothing in scope'}
          {cats.fineFinishKind && cats.fineFinishKind !== 'none' && ` · trim-kind: ${cats.fineFinishKind}`}
        </div>
      </div>

      {/* ── Section 1: Mask Levels ── */}
      <div className="panel-section">
        <div className="section-title">Mask Levels</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px', gap: 8, alignItems: 'center', padding: '4px 0', borderBottom: '2px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>
          <div>Surface</div>
          <div>Source</div>
          <div>Override</div>
          <div>Effective</div>
        </div>
        {/* Floor — readout (set on Identity tab) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 1fr 110px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Floor</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {derived.ceilingSF || 0} SF · {derived.perimeter || 0} LF perimeter
            </div>
          </div>
          <div>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 3, background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
              IDENTITY
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Set on Identity tab
          </div>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            {LEVEL_LABEL_SHORT[protection.floor_mask_level || derivedDefaults.floor_mask_level] || derivedDefaults.floor_mask_level}
          </div>
        </div>
        <MaskRow
          surface="wall"
          label="Walls"
          qtyLabel={`${derived.wallGross || 0} SF gross · ${derived.perimeter || 0} LF perimeter`}
          autoLevel={derivedDefaults.wall_mask_level}
          currentValue={protection.wall_mask_level}
          options={MASK_LEVELS_WALL}
        />
        <MaskRow
          surface="ceiling"
          label="Ceiling"
          qtyLabel={`${derived.ceilingSF || 0} SF · ${derived.perimeter || 0} LF perimeter`}
          autoLevel={derivedDefaults.ceiling_mask_level}
          currentValue={protection.ceiling_mask_level}
          options={MASK_LEVELS_CEILING}
        />
      </div>

      {/* ── Section 2: Adjacent Items (fixtures) ── */}
      <div className="panel-section">
        <div className="section-title">Adjacent Items</div>
        {checkedFixtureIds.length === 0 ? (
          <div className="detail-panel-empty">No fixtures present. Check fixtures on the Identity tab to configure their protection.</div>
        ) : (
          <div className="master-detail-container">
            {/* Left: list of present fixtures */}
            <div className="master-list">
              {checkedFixtureIds.map(fId => {
                const cat = FIXTURE_MAP[fId];
                if (!cat) return null;
                const isFocused = focusedFixture === fId;
                const cfg = fixtures[fId] || {};
                return (
                  <div key={fId} className={'substrate-item' + (isFocused ? ' focused' : '')}
                    onClick={() => setFocusedFixture(fId)}>
                    <span style={{ fontWeight: 600 }}>{cat.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {cfg.protection || cat.defaultProtection}
                    </span>
                  </div>
                );
              })}
            </div>
            {/* Right: detail panel for focused fixture */}
            <div className="detail-panel">
              {focusedFixture && fixtures[focusedFixture] ? (
                <FixtureDetail fixtureId={focusedFixture} cfg={fixtures[focusedFixture]} setFix={setFix} room={room} dispatch={dispatch} onClose={() => setFocusedFixture(null)} />
              ) : (
                <div className="detail-panel-empty">Select a fixture to configure its protection level + dimensions.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Special Treatments ── */}
      <div className="panel-section">
        <div className="section-title">Special Treatments</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={protection.tapeline_edge === true}
              onChange={e => setProt('tapeline_edge', e.target.checked)}
            />
            <span>
              <b>Tape line on trim edge</b>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                Crisp finished edge after trim cures, before adjacent wall paint
              </span>
            </span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.5, cursor: 'not-allowed' }}>
            <input type="checkbox" disabled checked={false} />
            <span>
              <b>Containment mode</b>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 6 }}>
                Zip-wall enclosure (deferred — not yet wired)
              </span>
            </span>
          </label>
        </div>
      </div>

      {/* ── Section 4: Per-room heuristic overrides ── */}
      {/* Override the project-level outlets-per-room / HVAC-vents-per-room
          heuristics for THIS room only. Leave blank to use the project default. */}
      <div className="panel-section">
        <div className="section-title">Per-Room Heuristic Overrides</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>
          Override the project-level counts for this room only. Leave blank to use the project heuristic.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div className="field-label" title="Number of outlets/switches in this room. Overrides the project heuristic only for this room.">Outlets in this room</div>
            <input
              type="number" min="0" step="1"
              value={protection.outlets_count_override ?? ''}
              onChange={e => setProt('outlets_count_override', e.target.value === '' ? null : parseFloat(e.target.value))}
              placeholder={`project default: ${project?.protection_heuristics?.outlets_per_room ?? 4}`}
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>
          <div>
            <div className="field-label" title="Number of HVAC vents in this room. Overrides the project heuristic only for this room.">HVAC vents in this room</div>
            <input
              type="number" min="0" step="0.5"
              value={protection.hvac_vents_count_override ?? ''}
              onChange={e => setProt('hvac_vents_count_override', e.target.value === '' ? null : parseFloat(e.target.value))}
              placeholder={`project default: ${project?.protection_heuristics?.hvac_vents_per_room ?? 0.7}`}
              style={{ width: '100%', fontSize: 12 }}
            />
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// FIXTURE DETAIL PANEL — preserves the legacy per-fixture configs
// =============================================================================
// Same patterns as the original ProtectionTab: cabinets (LF + layout),
// feature_wall (multi-item with deduct_baseboard), builtin_shelving (W×H×count),
// shower/vanity/fireplace/stone_fireplace (W×H), generic.

function FixtureDetail({ fixtureId, cfg, setFix, room, dispatch, onClose }) {
  const cat = FIXTURE_MAP[fixtureId];
  if (!cat) return null;
  const rid = room.id;

  const Header = ({ title }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{title}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
    </div>
  );

  // Cabinets
  if (fixtureId === 'cabinets') {
    return (
      <div>
        <Header title="Cabinets" />
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Layout</div>
            <select value={cfg.layout || 'lower_upper'} onChange={e => setFix(fixtureId, 'layout', e.target.value)} style={{ width: '100%' }}>
              <option value="lower_only">Lower Only</option>
              <option value="lower_upper">Lower + Upper</option>
            </select>
          </div>
          <div>
            <div className="field-label">Protection Level</div>
            <select value={cfg.protection || getFixtureDefault('cabinets')} onChange={e => setFix(fixtureId, 'protection', e.target.value)} style={{ width: '100%' }}>
              {getFixtureLevels('cabinets').map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
          <div>
            <div className="field-label">Linear Feet</div>
            <input type="number" min="0" max="200" step="0.5" value={cfg.linear_ft || ''}
              onChange={e => setFix(fixtureId, 'linear_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          {cfg.layout === 'lower_upper' && (
            <div>
              <div className="field-label">Upper Height (ft)</div>
              <input type="number" min="1" max="6" step="0.5" value={cfg.upper_height_ft || ''}
                onChange={e => setFix(fixtureId, 'upper_height_ft', parseFloat(e.target.value) || 2.5)} placeholder="2.5" />
            </div>
          )}
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Notes</div>
          <input type="text" value={cfg.notes || ''} onChange={e => setFix(fixtureId, 'notes', e.target.value)} style={{ width: '100%' }} placeholder="e.g., L-shaped run, island separate" />
        </div>
      </div>
    );
  }

  // Feature wall — multi-item
  if (fixtureId === 'feature_wall') {
    const items = cfg.items || [];
    const totalSF = items.reduce((s, i) => s + Math.round((parseFloat(i.length_ft) || 0) * (parseFloat(i.height_ft) || 0)), 0);
    const setFW = (itemId, f, v) => dispatch({ type: 'SET_FEATURE_WALL', payload: { roomId: rid, itemId, field: f, value: v } });
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 13 }}>Feature Walls</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {totalSF > 0 && <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>{totalSF} SF total</span>}
            <button className="btn btn-sm btn-accent" onClick={() => dispatch({ type: 'ADD_FEATURE_WALL', payload: { roomId: rid } })}>+ Add</button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
          </div>
        </div>
        {items.map((item, idx) => (
          <div key={item.id} style={{ padding: '6px 8px', marginBottom: 6, background: 'var(--bg-tertiary)', borderRadius: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>Wall {idx + 1}</span>
              <button className="btn btn-sm btn-danger" onClick={() => dispatch({ type: 'REMOVE_FEATURE_WALL', payload: { roomId: rid, itemId: item.id } })}>&times;</button>
            </div>
            <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div>
                <div className="field-label">Length (ft)</div>
                <input type="number" min="0" step="0.5" value={item.length_ft || ''} onChange={e => setFW(item.id, 'length_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <div className="field-label">Height (ft)</div>
                <input type="number" min="0" step="0.5" value={item.height_ft || ''} onChange={e => setFW(item.id, 'height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
              </div>
              <div>
                <div className="field-label">Protection</div>
                <select value={item.protection || getFixtureDefault('feature_wall')} onChange={e => setFW(item.id, 'protection', e.target.value)} style={{ width: '100%' }}>
                  {getFixtureLevels('feature_wall').map(o => (
                    <option key={o.id} value={o.id}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" id={`fw-bb-${item.id}`} checked={!!item.deduct_baseboard}
                onChange={e => setFW(item.id, 'deduct_baseboard', e.target.checked)} />
              <label htmlFor={`fw-bb-${item.id}`} style={{ fontSize: 11 }}>Deduct baseboard</label>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Built-in shelving / dimensional fixtures (shower, vanity, fireplace, stone_fireplace, bathtub, toilet)
  if (['builtin_shelving', 'shower', 'vanity', 'fireplace', 'stone_fireplace', 'bathtub', 'toilet'].includes(fixtureId)) {
    const sf = Math.round((parseFloat(cfg.width_ft) || 0) * (parseFloat(cfg.height_ft) || 0) * (parseInt(cfg.count) || 1));
    return (
      <div>
        <Header title={cat.label} />
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <div>
            <div className="field-label">Count</div>
            <input type="number" min="1" max="20" value={cfg.count || ''} onChange={e => setFix(fixtureId, 'count', parseInt(e.target.value) || 1)} placeholder="1" />
          </div>
          <div>
            <div className="field-label">Width (ft)</div>
            <input type="number" min="0" step="0.5" value={cfg.width_ft || ''} onChange={e => setFix(fixtureId, 'width_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
          <div>
            <div className="field-label">Height (ft)</div>
            <input type="number" min="0" step="0.5" value={cfg.height_ft || ''} onChange={e => setFix(fixtureId, 'height_ft', parseFloat(e.target.value) || 0)} placeholder="0" />
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 6 }}>
          <div>
            <div className="field-label">Protection Level</div>
            <select value={cfg.protection || cat.defaultProtection || getFixtureDefault(fixtureId)} onChange={e => setFix(fixtureId, 'protection', e.target.value)} style={{ width: '100%' }}>
              {getFixtureLevels(fixtureId).map(o => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div style={{ alignSelf: 'end' }}>
            {sf > 0 && (
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--derived)' }}>{sf} SF</div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="field-label">Notes</div>
          <input type="text" value={cfg.notes || ''} onChange={e => setFix(fixtureId, 'notes', e.target.value)} style={{ width: '100%' }} />
        </div>
      </div>
    );
  }

  // Generic fixture
  return (
    <div>
      <Header title={cat.label} />
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <div className="field-label">Count</div>
          <input type="number" min="1" max="20" value={cfg.count || ''} onChange={e => setFix(fixtureId, 'count', parseInt(e.target.value) || 1)} placeholder="1" />
        </div>
        <div>
          <div className="field-label">Protection Level</div>
          <select value={cfg.protection || getFixtureDefault(fixtureId)} onChange={e => setFix(fixtureId, 'protection', e.target.value)} style={{ width: '100%' }}>
            {getFixtureLevels(fixtureId).map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        <div className="field-label">Size / Notes</div>
        <input type="text" value={cfg.size || ''} onChange={e => setFix(fixtureId, 'size', e.target.value)} style={{ width: '100%' }} />
      </div>
    </div>
  );
}
