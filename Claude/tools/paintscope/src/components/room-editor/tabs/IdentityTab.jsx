import { useMemo, useState } from 'react';
import Select from '../../shared/Select';
import { ENUMS } from '../../../data/enums';
import { useModifierEnum } from '../../../hooks/useModifierEnum';
import { ROOM_TYPES, ROOM_TYPE_SUGGESTED_FIXTURES } from '../../../data/room-types';
import { PAINTING_SCOPE_PRESETS } from '../../../data/painting-scope-presets';
import { FIXTURE_CATALOG, FIXTURE_MAP, FLOOR_TYPES } from '../../../data/fixture-catalog';
import { MASK_LEVELS_FLOOR, MASK_LEVEL_SHORT } from '../../../data/mask-levels';
import { deriveProtectionDefaults } from '../../../engine/derive-protection-defaults.js';

export default function IdentityTab({ room, derived, dispatch, project, roomCategories }) {
  const textureOptions = useModifierEnum('FAC_TEXTURE');
  const complexityOptions = useModifierEnum('FAC_COMPLEXITY');
  const rid = room.id;
  const setRoom = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v } });
  const setRoomNullable = (f, v) => dispatch({ type: 'SET_ROOM', payload: { roomId: rid, field: f, value: v || null } });
  const setScopePreset = (presetId) => dispatch({ type: 'SET_PAINTING_SCOPE_PRESET', payload: { roomId: rid, presetId } });

  const derivedDefaults = useMemo(
    () => deriveProtectionDefaults(room, project),
    [room, project]
  );
  const floorAutoLevel = derivedDefaults.floor_mask_level;
  const floorOverride = room.protection?.floor_mask_level || '';
  const setProtField = (field, value) =>
    dispatch({ type: 'SET_ROOM_PROTECTION_FIELD', payload: { roomId: rid, field, value } });

  // Outlier indicator — fires when room's preset differs from project default
  const projectDefaultPreset = project.default_painting_scope_preset || null;
  const isOutlier = projectDefaultPreset && room.painting_scope_preset && room.painting_scope_preset !== projectDefaultPreset;

  // Suggested vs Other fixture split
  const suggestedIds = ROOM_TYPE_SUGGESTED_FIXTURES[room.room_type] || [];
  const suggestedSet = new Set(suggestedIds);
  const suggestedFixtures = FIXTURE_CATALOG.filter(f => suggestedSet.has(f.id));
  const otherFixtures = FIXTURE_CATALOG.filter(f => !suggestedSet.has(f.id));
  const [otherExpanded, setOtherExpanded] = useState(false);

  return (
    <div>
      {/* ── Room Identity ── */}
      <div className="panel-section" data-section="identity">
        <div className="section-title">Room Identity</div>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 2fr' }}>
          <div>
            <div className="field-label">Room Label</div>
            <input value={room.label} onChange={e => setRoom('label', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Master Bedroom" />
          </div>
          <div>
            <div className="field-label">Area Group</div>
            <select value={room.area_group || ''} onChange={e => setRoom('area_group', e.target.value)} style={{ width: '100%' }}>
              <option value="">None</option>
              {(roomCategories || []).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '2fr 2fr', marginTop: 8 }}>
          <div>
            <div className="field-label">Room Type</div>
            <select value={room.room_type || ''} onChange={e => setRoom('room_type', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Select —</option>
              {ROOM_TYPES.map(rt => <option key={rt.id} value={rt.id}>{rt.label}</option>)}
            </select>
          </div>
          <div>
            <div className="field-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Painting Scope Preset</span>
              {isOutlier && (
                <span style={{ fontSize: 10, padding: '1px 6px', background: 'var(--warning)', color: '#fff', borderRadius: 3, fontWeight: 600 }}
                  title={`Project default: ${projectDefaultPreset}`}>
                  OUTLIER
                </span>
              )}
            </div>
            <select value={room.painting_scope_preset || 'custom'} onChange={e => setScopePreset(e.target.value)} style={{ width: '100%' }}>
              {PAINTING_SCOPE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Picking a preset bulk-toggles substrates. "Custom" leaves substrates as-is.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div className="field-label">Room Notes</div>
          <textarea
            value={room.notes || ''}
            onChange={e => setRoom('notes', e.target.value)}
            placeholder="e.g. Crown moulding, accent wall"
            style={{ width: '100%', minHeight: 48, resize: 'vertical' }}
          />
        </div>
      </div>

      {/* ── Dimensions ── */}
      <div className="panel-section" data-section="dimensions">
        <div className="section-title">Dimensions</div>
        <div className="form-row">
          <div>
            <div className="field-label">Length (ft)</div>
            <input type="number" value={room.length_ft || ''} onChange={e => setRoom('length_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Width (ft)</div>
            <input type="number" value={room.width_ft || ''} onChange={e => setRoom('width_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 16, marginTop: 16 }}>&times;</span>
          <div>
            <div className="field-label">Height (ft)</div>
            <input type="number" value={room.height_ft || ''} onChange={e => setRoom('height_ft', parseFloat(e.target.value) || 0)} min="0" step="0.5" placeholder="0" />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          <span>Perimeter: <b style={{ color: 'var(--text-primary)' }}>{derived.perimeter} LF</b></span>
          <span>Floor/Ceiling: <b style={{ color: 'var(--text-primary)' }}>{derived.ceilingSF} SF</b></span>
          <span>Wall Gross: <b style={{ color: 'var(--text-primary)' }}>{derived.wallGross} SF</b></span>
          <span>Opening Deduct: <b style={{ color: 'var(--warning)' }}>{derived.openingDeduction} SF</b></span>
        </div>
      </div>

      {/* ── Room Contents (identification only) ── */}
      <div className="panel-section" data-section="contents">
        <div className="section-title">Room Contents <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>identification only — protection levels on Protection tab</span></div>

        {/* Floor Type + Mask Level */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16, alignItems: 'start', marginBottom: 8 }}>
          <div>
            <div className="field-label">Floor Type</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {FLOOR_TYPES.map(ft => (
                <label key={ft.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                  <input type="radio" name={`floor-type-${rid}`} value={ft.id}
                    checked={room.floor_type === ft.id}
                    onChange={() => setRoom('floor_type', ft.id)} />
                  <span style={{ color: room.floor_type === ft.id ? 'var(--text-primary)' : 'var(--text-muted)' }}>{ft.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="field-label">Floor Protection</div>
            <select
              value={floorOverride}
              onChange={e => setProtField('floor_mask_level', e.target.value || null)}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="">Auto: {MASK_LEVEL_SHORT[floorAutoLevel] || floorAutoLevel}</option>
              {MASK_LEVELS_FLOOR.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
              Walls + ceiling overrides on Protection tab.
            </div>
          </div>
        </div>

        {/* Fixtures Present — Suggested + Other */}
        <div style={{ marginTop: 12 }}>
          <div className="field-label">Fixtures Present</div>
          {room.room_type && suggestedFixtures.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                Suggested for {ROOM_TYPES.find(r => r.id === room.room_type)?.label || room.room_type}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>
                {suggestedFixtures.map(fix => {
                  const checked = !!(room.fixtures && room.fixtures[fix.id]);
                  return (
                    <label key={fix.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => dispatch({ type: 'TOGGLE_FIXTURE', payload: { roomId: rid, fixtureId: fix.id } })} />
                      <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fix.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 4 }}
              onClick={() => setOtherExpanded(!otherExpanded)}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {room.room_type && suggestedFixtures.length > 0 ? 'Other' : 'All Fixtures'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{otherExpanded ? '▾' : '▸'}</span>
            </div>
            {otherExpanded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>
                {otherFixtures.map(fix => {
                  const checked = !!(room.fixtures && room.fixtures[fix.id]);
                  return (
                    <label key={fix.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                      <input type="checkbox" checked={checked}
                        onChange={() => dispatch({ type: 'TOGGLE_FIXTURE', payload: { roomId: rid, fixtureId: fix.id } })} />
                      <span style={{ color: checked ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fix.label}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
            Per-fixture configuration (dimensions, protection level) lives on the Protection tab.
          </div>
        </div>
      </div>

      {/* ── Room-Level Overrides ── */}
      <div className="panel-section" data-section="overrides">
        <div className="section-title">Room-Level Overrides</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <div className="field-label">Complexity <span style={{ color: 'var(--text-muted)' }}>({project.default_complexity})</span></div>
            <Select options={complexityOptions} value={room.complexity} onChange={v => setRoomNullable('complexity', v)} placeholder="Project Default" />
          </div>
          <div>
            <div className="field-label">Height Band</div>
            <div style={{ padding: '6px 0', fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
              {derived.heightBand} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>&mdash; auto from {derived.effectiveHeight} ft{derived.effectiveHeight > derived.H ? ' (peak)' : ''}</span>
            </div>
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
          <div>
            <div className="field-label">Quality Tier</div>
            <Select
              options={ENUMS.qualityTiers}
              value={room.quality_tier}
              onChange={v => setRoomNullable('quality_tier', v)}
              placeholder={`Project Default (${project.default_quality_tier || 'QT3'})`}
            />
          </div>
          <div>
            <div className="field-label">Application Method</div>
            <Select
              options={ENUMS.applicationMethods}
              value={room.application_method}
              onChange={v => setRoomNullable('application_method', v)}
              placeholder="Project Default"
            />
          </div>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 4 }}>
          <div>
            <div className="field-label">Texture</div>
            <Select
              options={textureOptions}
              value={room.texture}
              onChange={v => setRoomNullable('texture', v)}
              placeholder="Project Default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
