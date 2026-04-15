import { useState, useMemo } from 'react';
import { CLOSET_SHELVING_TYPES } from '../../../state/initial-state';
import { deriveCloset } from '../../../engine/derive-room';
import {
  SHELVING_PROTECTION_DEFAULTS,
  PROTECTION_LEVELS,
  PROTECTION_LEVEL_LABELS,
  PROTECTION_LEVEL_MULTIPLIERS,
  resolveProtectionLevel,
} from '../../../data/closet-shelving-protection';

const INHERITABLE_SUBSTRATES = [
  { id: 'walls', label: 'Walls', stateField: 'substrate_state' },
  { id: 'ceiling', label: 'Ceiling', stateField: 'substrate_state' },
  { id: 'baseboard', label: 'Baseboard', stateField: 'substrate_state' },
];

const STATE_LABELS = {
  bare_drywall: 'Bare Drywall',
  bare_wood: 'Bare Wood',
  factory_primed: 'Factory Primed',
  field_primed: 'Field Primed',
  previously_painted: 'Previously Painted',
  stained: 'Stained',
};

export default function ClosetsTab({ room, derived, dispatch, project }) {
  const rid = room.id;
  const subs = room.substrates || {};
  const closets = room.closets || [];
  const [focusedId, setFocusedId] = useState(null);
  const focused = closets.find(c => c.id === focusedId);

  // Derive geometry for focused closet
  const closetDerived = useMemo(() => {
    if (!focused) return null;
    return deriveCloset(focused, room);
  }, [focused, room]);

  // Resolve effective substrate state for a closet (override or parent)
  function resolveState(closet, subId) {
    const override = closet.substrate_overrides?.[subId]?.substrate_state;
    if (override) return { value: override, source: 'override' };
    const parentConfig = subs[subId];
    const parentState = parentConfig?.substrate_state || 'bare_drywall';
    return { value: parentState, source: 'inherited' };
  }

  const setCl = (closetId, field, value) =>
    dispatch({ type: 'SET_CLOSET', payload: { roomId: rid, closetId, field, value } });

  return (
    <>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
        Add closets attached to this room. Closets inherit the room's height and substrate config.
      </div>

      <div className="master-detail-container">
        {/* LEFT: Closet list */}
        <div className="master-list">
          <button
            className="btn btn-accent"
            style={{ width: '100%', marginBottom: 8, fontSize: 12 }}
            onClick={() => {
              dispatch({ type: 'ADD_CLOSET', payload: { roomId: rid } });
              // Focus will happen on next render when closets updates
              setTimeout(() => {
                const updated = document.querySelector('[data-closet-new]');
                if (updated) updated.click();
              }, 50);
            }}
          >
            + Add Closet
          </button>

          {closets.length === 0 && (
            <div className="detail-panel-empty" style={{ padding: 16 }}>No closets</div>
          )}

          {closets.map(c => {
            const isFocused = focusedId === c.id;
            const dims = (parseFloat(c.length_ft) || 0) > 0 && (parseFloat(c.width_ft) || 0) > 0
              ? `${c.length_ft}×${c.width_ft}`
              : 'no dims';
            return (
              <div
                key={c.id}
                className={'substrate-item' + (isFocused ? ' focused' : '')}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', cursor: 'pointer' }}
                onClick={() => setFocusedId(c.id)}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-primary)' }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dims}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'REMOVE_CLOSET', payload: { roomId: rid, closetId: c.id } });
                    if (focusedId === c.id) setFocusedId(null);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14, padding: '2px 6px' }}
                  title="Remove closet"
                >
                  &times;
                </button>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Focused closet detail */}
        <div className="detail-panel">
          {!focused && (
            <div className="detail-panel-empty">
              {closets.length > 0 ? 'Select a closet to configure' : 'Add a closet to get started'}
            </div>
          )}

          {focused && closetDerived && (() => {
            const cd = closetDerived;
            return (
              <>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{focused.label}</span>
                  <button onClick={() => setFocusedId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>&times;</button>
                </div>

                {/* Label */}
                <div style={{ marginBottom: 8 }}>
                  <div className="field-label">Label</div>
                  <input
                    type="text"
                    value={focused.label}
                    onChange={e => setCl(focused.id, 'label', e.target.value)}
                    style={{ width: '100%' }}
                    placeholder="e.g., Walk-In Closet"
                  />
                </div>

                {/* Dimensions */}
                <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginBottom: 8 }}>
                  <div>
                    <div className="field-label">Length (ft)</div>
                    <input
                      type="number" min="0" max="50" step="0.5"
                      value={focused.length_ft || ''}
                      onChange={e => setCl(focused.id, 'length_ft', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="field-label">Width (ft)</div>
                    <input
                      type="number" min="0" max="50" step="0.5"
                      value={focused.width_ft || ''}
                      onChange={e => setCl(focused.id, 'width_ft', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="field-label">Height (ft)</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input type="number" value={cd.H || ''} disabled style={{ width: 60 }} />
                      <span className="auto-tag" title="Inherited from room">inherited</span>
                    </div>
                  </div>
                </div>

                {/* Derived stats */}
                {(cd.L > 0 && cd.W > 0) && (
                  <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, flexWrap: 'wrap' }}>
                    <span>{cd.perimeter} LF perim</span>
                    <span>{cd.wall_field_sf} SF walls</span>
                    <span>{cd.ceiling_field_sf} SF ceiling</span>
                    <span>{cd.baseboard_lf} LF baseboard</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>(-21 SF doorway deduct)</span>
                  </div>
                )}

                {/* Shelving */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, marginBottom: 8 }}>
                  <div className="field-label" style={{ marginBottom: 4 }}>Shelving / Built-In</div>
                  <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <select
                        value={focused.shelving_type}
                        onChange={e => {
                          const newType = e.target.value;
                          setCl(focused.id, 'shelving_type', newType);
                          // Reset toggle + override when going back to 'none'
                          if (newType === 'none') {
                            setCl(focused.id, 'paint_shelving', true);
                            setCl(focused.id, 'protection_level', null);
                          }
                        }}
                        style={{ width: '100%' }}
                      >
                        {CLOSET_SHELVING_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    {focused.shelving_type !== 'none' && (
                      <div>
                        <div className="field-label">Shelving LF</div>
                        <input
                          type="number" min="0" max="200" step="1"
                          value={focused.shelving_lf || ''}
                          onChange={e => setCl(focused.id, 'shelving_lf', parseFloat(e.target.value) || 0)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  {/* Paint / Don't paint toggle (only when type !== 'none') */}
                  {focused.shelving_type !== 'none' && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`paint_shelving_${focused.id}`}
                          checked={focused.paint_shelving !== false}
                          onChange={() => setCl(focused.id, 'paint_shelving', true)}
                        />
                        Paint shelving
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name={`paint_shelving_${focused.id}`}
                          checked={focused.paint_shelving === false}
                          onChange={() => setCl(focused.id, 'paint_shelving', false)}
                        />
                        Don't paint (mask + protect)
                      </label>
                    </div>
                  )}

                  {/* Protection level dropdown + derived mask time (only when not painting) */}
                  {focused.shelving_type !== 'none' && focused.paint_shelving === false && (() => {
                    const def = SHELVING_PROTECTION_DEFAULTS[focused.shelving_type];
                    const effectiveLevel = resolveProtectionLevel(focused);
                    const isOverridden = !!focused.protection_level;
                    const lf = parseFloat(focused.shelving_lf) || 0;
                    const levelMult = PROTECTION_LEVEL_MULTIPLIERS[effectiveLevel] ?? 1.0;
                    const setupHrs    = def ? lf * def.setup_min_per_lf    * levelMult / 60 : 0;
                    const teardownHrs = def ? lf * def.teardown_min_per_lf * levelMult / 60 : 0;
                    const totalMaskHrs = Math.round((setupHrs + teardownHrs) * 100) / 100;
                    return (
                      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
                        <div>
                          <div className="field-label">Protection level</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <select
                              value={effectiveLevel || ''}
                              onChange={e => {
                                const v = e.target.value;
                                const defaultForType = def?.defaultLevel || null;
                                // If user picks the type's default, clear the override
                                setCl(focused.id, 'protection_level', v === defaultForType ? null : v);
                              }}
                              style={{ width: '100%' }}
                            >
                              {PROTECTION_LEVELS.map(lvl => (
                                <option key={lvl} value={lvl}>{PROTECTION_LEVEL_LABELS[lvl]}</option>
                              ))}
                            </select>
                            {isOverridden ? (
                              <span
                                className="override-toggle manual"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setCl(focused.id, 'protection_level', null)}
                                title="Reset to type default"
                              >
                                override
                              </span>
                            ) : (
                              <span className="auto-tag">default</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="field-label">Est. mask time</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '4px 0' }}>
                            ~{totalMaskHrs} hrs
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Inherited Substrates */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                  <div className="field-label" style={{ marginBottom: 4 }}>Inherited Substrates</div>
                  {INHERITABLE_SUBSTRATES.map(sub => {
                    const parentEnabled = !!subs[sub.id];
                    if (!parentEnabled) {
                      return (
                        <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', opacity: 0.4 }}>
                          <span style={{ fontSize: 12, minWidth: 70 }}>{sub.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>not enabled on room</span>
                        </div>
                      );
                    }
                    const resolved = resolveState(focused, sub.id);
                    const isOverridden = resolved.source === 'override';
                    return (
                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <span style={{ fontSize: 12, minWidth: 70, fontWeight: 500 }}>{sub.label}</span>
                        {isOverridden ? (
                          <>
                            <select
                              value={resolved.value}
                              onChange={e => dispatch({
                                type: 'SET_CLOSET_SUBSTRATE',
                                payload: { roomId: rid, closetId: focused.id, substrateId: sub.id, field: 'substrate_state', value: e.target.value }
                              })}
                              style={{ fontSize: 12 }}
                            >
                              {Object.entries(STATE_LABELS).map(([v, l]) => (
                                <option key={v} value={v}>{l}</option>
                              ))}
                            </select>
                            <span className="override-toggle manual" style={{ cursor: 'pointer' }}
                              onClick={() => dispatch({
                                type: 'RESET_CLOSET_SUBSTRATE',
                                payload: { roomId: rid, closetId: focused.id, substrateId: sub.id }
                              })}
                              title="Reset to inherit from room"
                            >
                              override
                            </span>
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              {STATE_LABELS[resolved.value] || resolved.value}
                            </span>
                            <span className="auto-tag">inherited</span>
                            <button
                              onClick={() => dispatch({
                                type: 'SET_CLOSET_SUBSTRATE',
                                payload: { roomId: rid, closetId: focused.id, substrateId: sub.id, field: 'substrate_state', value: resolved.value }
                              })}
                              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 11, padding: 0 }}
                              title="Override for this closet"
                            >
                              edit
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </>
  );
}
