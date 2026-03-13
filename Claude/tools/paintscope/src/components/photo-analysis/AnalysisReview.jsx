// Review detected items with confidence badges, scope dropdowns,
// and inline editable fields so users can correct misidentifications.

import { useState } from 'react';
import ConfidenceBadge from './ConfidenceBadge';
import Select from '../shared/Select';
import { ENUMS } from '../../data/enums';
import { OPENING_TYPES } from '../../data/opening-types';
import { FLOOR_TYPES } from '../../data/fixture-catalog';

const SURFACE_LABELS = { walls: 'Walls', ceiling: 'Ceiling' };
const TRIM_LABELS = {
  baseboard: 'Baseboard', crown: 'Crown Molding', chair_rail: 'Chair Rail',
  wainscoting: 'Wainscoting', shoe_mold: 'Shoe Mold', wainscot_cap: 'Wainscot Cap',
  picture_rail: 'Picture Rail', window_stool: 'Window Stool', window_apron: 'Window Apron',
};
const SPECIALTY_LABELS = {
  beams: 'Beams', columns: 'Columns', mantels: 'Mantels',
  stair_risers: 'Stair Risers', stair_railing: 'Stair Railing',
};

// Substrate state options filtered by category
const SURFACE_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('walls'));
const TRIM_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('baseboard'));
const DOOR_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('doors'));
const WINDOW_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('windows'));
const SPECIALTY_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('beams'));

const FRAME_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('door_frames'));
const CASING_STATES = ENUMS.substrateStates.filter(s => s.applies_to.includes('door_casing'));
const OPENING_OPTIONS = Object.entries(OPENING_TYPES).map(([value, o]) => ({ value, label: o.label }));

// Scope options per category
const SCOPE_OPTIONS = {
  surfaces:  [{ value: 'paint', label: 'Paint' }, { value: 'skip', label: 'Skip' }],
  trim:      [{ value: 'paint', label: 'Paint' }, { value: 'protect', label: 'Protect' }, { value: 'skip', label: 'Skip' }],
  doors:     [{ value: 'paint', label: 'Paint' }, { value: 'protect', label: 'Protect' }, { value: 'skip', label: 'Skip' }],
  windows:   [{ value: 'paint', label: 'Paint' }, { value: 'protect', label: 'Protect' }, { value: 'skip', label: 'Skip' }],
  openings:  [{ value: 'include', label: 'Include' }, { value: 'skip', label: 'Skip' }],
  fixtures:  [{ value: 'protect', label: 'Protect' }, { value: 'skip', label: 'Skip' }],
  specialty: [{ value: 'paint', label: 'Paint' }, { value: 'protect', label: 'Protect' }, { value: 'skip', label: 'Skip' }],
};

function ScopeSelect({ value, options, onChange }) {
  const scopeClass = `scope-select scope-${value || 'skip'}`;
  return (
    <select
      className={scopeClass}
      value={value || 'skip'}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function CategorySection({ title, children }) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <div className="review-category">
      <h4 className="review-category-title">{title}</h4>
      <div className="review-category-items">{children}</div>
    </div>
  );
}

// --- Category-specific editable row components ---

function SurfaceRow({ id, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.surfaces} onChange={onScopeChange} />
      <span className="detection-label">{SURFACE_LABELS[id] || id}</span>
      <div className="detection-edit">
        <Select
          className="edit-select"
          options={SURFACE_STATES}
          value={data.substrate_state || ''}
          onChange={v => onUpdate('substrate_state', v)}
        />
        <Select
          className="edit-select"
          options={ENUMS.textures}
          value={data.texture || ''}
          onChange={v => onUpdate('texture', v)}
        />
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

function TrimRow({ id, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  const stateOptions = id === 'wainscoting'
    ? ENUMS.substrateStates.filter(s => s.applies_to.includes('wainscoting'))
    : TRIM_STATES;
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.trim} onChange={onScopeChange} />
      <span className="detection-label">{TRIM_LABELS[id] || id}</span>
      <div className="detection-edit">
        <Select
          className="edit-select"
          options={stateOptions}
          value={data.substrate_state || ''}
          onChange={v => onUpdate('substrate_state', v)}
        />
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

function DoorRow({ index, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.doors} onChange={onScopeChange} />
      <span className="detection-label">Door</span>
      <div className="detection-edit">
        <Select
          className="edit-select"
          options={ENUMS.doorTypes}
          value={data.door_type || ''}
          onChange={v => onUpdate('door_type', v)}
        />
        <Select
          className="edit-select"
          options={DOOR_STATES}
          value={data.substrate_state || ''}
          onChange={v => onUpdate('substrate_state', v)}
        />
        <label className="edit-number">
          <span className="edit-number-label">Qty</span>
          <input
            type="number"
            className="edit-input-number"
            min={1}
            value={data.count || 1}
            onChange={e => onUpdate('count', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </label>
        <label className="edit-number">
          <span className="edit-number-label">Sides</span>
          <input
            type="number"
            className="edit-input-number"
            min={1}
            max={2}
            value={data.sides_per_door || 2}
            onChange={e => onUpdate('sides_per_door', Math.min(2, Math.max(1, parseInt(e.target.value) || 2)))}
          />
        </label>
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

function WindowRow({ index, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.windows} onChange={onScopeChange} />
      <span className="detection-label">Window</span>
      <div className="detection-edit">
        <Select
          className="edit-select"
          options={ENUMS.windowTypes}
          value={data.window_type || ''}
          onChange={v => onUpdate('window_type', v)}
        />
        <Select
          className="edit-select edit-select-sm"
          options={ENUMS.windowSizes}
          value={data.size_bucket || 'M'}
          onChange={v => onUpdate('size_bucket', v)}
        />
        <Select
          className="edit-select"
          options={WINDOW_STATES}
          value={data.substrate_state || ''}
          onChange={v => onUpdate('substrate_state', v)}
        />
        <label className="edit-number">
          <span className="edit-number-label">Qty</span>
          <input
            type="number"
            className="edit-input-number"
            min={1}
            value={data.count || 1}
            onChange={e => onUpdate('count', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </label>
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

function OpeningRow({ index, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  const frame = data.door_frame || {};
  const casing = data.door_casing || {};
  return (
    <div className={`detection-group${isSkip ? ' detection-group-skip' : ''}`}>
      <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
        <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.openings} onChange={onScopeChange} />
        <span className="detection-label">Opening</span>
        <div className="detection-edit">
          <Select
            className="edit-select"
            options={OPENING_OPTIONS}
            value={data.opening_type || ''}
            onChange={v => onUpdate('opening_type', v)}
          />
          <label className="edit-number">
            <span className="edit-number-label">Qty</span>
            <input
              type="number"
              className="edit-input-number"
              min={1}
              value={data.count || 1}
              onChange={e => onUpdate('count', Math.max(1, parseInt(e.target.value) || 1))}
            />
          </label>
        </div>
        <ConfidenceBadge level={data.confidence} />
      </div>
      {data.scope === 'include' && (
        <div className="detection-sub-rows">
          <div className="detection-row detection-row-editable detection-row-sub">
            <ScopeSelect
              value={frame.scope || 'paint'}
              options={SCOPE_OPTIONS.trim}
              onChange={v => onUpdate('door_frame', { ...frame, scope: v })}
            />
            <span className="detection-label">Door Frame</span>
            <div className="detection-edit">
              <Select
                className="edit-select"
                options={FRAME_STATES}
                value={frame.substrate_state || 'factory_primed'}
                onChange={v => onUpdate('door_frame', { ...frame, substrate_state: v })}
              />
            </div>
          </div>
          <div className="detection-row detection-row-editable detection-row-sub">
            <ScopeSelect
              value={casing.scope || 'paint'}
              options={SCOPE_OPTIONS.trim}
              onChange={v => onUpdate('door_casing', { ...casing, scope: v })}
            />
            <span className="detection-label">Door Casing</span>
            <div className="detection-edit">
              <Select
                className="edit-select"
                options={CASING_STATES}
                value={casing.substrate_state || 'factory_primed'}
                onChange={v => onUpdate('door_casing', { ...casing, substrate_state: v })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FixtureRow({ index, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.fixtures} onChange={onScopeChange} />
      <span className="detection-label">{(data.fixture_id || '').replace(/_/g, ' ')}</span>
      <div className="detection-edit">
        <label className="edit-number">
          <span className="edit-number-label">Qty</span>
          <input
            type="number"
            className="edit-input-number"
            min={1}
            value={data.count || 1}
            onChange={e => onUpdate('count', Math.max(1, parseInt(e.target.value) || 1))}
          />
        </label>
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

function SpecialtyRow({ id, data, onScopeChange, onUpdate }) {
  const isSkip = data.scope === 'skip';
  return (
    <div className={`detection-row detection-row-editable${isSkip ? ' detection-row-skip' : ''}`}>
      <ScopeSelect value={data.scope} options={SCOPE_OPTIONS.specialty} onChange={onScopeChange} />
      <span className="detection-label">{SPECIALTY_LABELS[id] || id}</span>
      <div className="detection-edit">
        <Select
          className="edit-select"
          options={SPECIALTY_STATES}
          value={data.substrate_state || ''}
          onChange={v => onUpdate('substrate_state', v)}
        />
        {id !== 'stair_railing' && (
          <label className="edit-number">
            <span className="edit-number-label">Qty</span>
            <input
              type="number"
              className="edit-input-number"
              min={1}
              value={data.count || 1}
              onChange={e => onUpdate('count', Math.max(1, parseInt(e.target.value) || 1))}
            />
          </label>
        )}
      </div>
      <ConfidenceBadge level={data.confidence} />
    </div>
  );
}

// --- Main component ---

export default function AnalysisReview({ result, onResultChange }) {
  const update = (path, value) => {
    const next = JSON.parse(JSON.stringify(result));
    let obj = next;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
    obj[path[path.length - 1]] = value;
    onResultChange(next);
  };

  // Room overview
  const roomPatch = result.roomPatch || {};
  const hasRoom = roomPatch.label || roomPatch.length_ft || roomPatch.floor_type;

  return (
    <div className="analysis-review">
      {/* Room overview — editable */}
      {hasRoom && (
        <CategorySection title="Room">
          <div className="detection-row detection-row-editable">
            <span className="detection-label">Label</span>
            <div className="detection-edit">
              <input
                type="text"
                className="edit-input-text"
                value={roomPatch.label || ''}
                onChange={e => update(['roomPatch', 'label'], e.target.value)}
                placeholder="Room name"
              />
            </div>
          </div>
          <div className="detection-row detection-row-editable">
            <span className="detection-label">Dimensions</span>
            <div className="detection-edit">
              <label className="edit-number">
                <span className="edit-number-label">L</span>
                <input
                  type="number"
                  className="edit-input-number"
                  min={1}
                  value={roomPatch.length_ft || ''}
                  onChange={e => update(['roomPatch', 'length_ft'], Math.max(1, parseFloat(e.target.value) || 0))}
                />
              </label>
              <label className="edit-number">
                <span className="edit-number-label">W</span>
                <input
                  type="number"
                  className="edit-input-number"
                  min={1}
                  value={roomPatch.width_ft || ''}
                  onChange={e => update(['roomPatch', 'width_ft'], Math.max(1, parseFloat(e.target.value) || 0))}
                />
              </label>
              <label className="edit-number">
                <span className="edit-number-label">H</span>
                <input
                  type="number"
                  className="edit-input-number"
                  min={1}
                  value={roomPatch.height_ft || ''}
                  onChange={e => update(['roomPatch', 'height_ft'], Math.max(1, parseFloat(e.target.value) || 0))}
                />
              </label>
            </div>
          </div>
          <div className="detection-row detection-row-editable">
            <span className="detection-label">Floor</span>
            <div className="detection-edit">
              <Select
                className="edit-select"
                options={FLOOR_TYPES.map(f => ({ value: f.id, label: f.label }))}
                value={roomPatch.floor_type || ''}
                onChange={v => update(['roomPatch', 'floor_type'], v)}
              />
            </div>
          </div>
          <div className="detection-row detection-row-editable">
            <span className="detection-label">Complexity</span>
            <div className="detection-edit">
              <Select
                className="edit-select"
                options={ENUMS.complexity}
                value={roomPatch.complexity || ''}
                onChange={v => update(['roomPatch', 'complexity'], v)}
              />
            </div>
          </div>
          {result.overviewConfidence && <ConfidenceBadge level={result.overviewConfidence} />}
        </CategorySection>
      )}

      {/* Surfaces */}
      <CategorySection title="Surfaces">
        {result.surfaces && Object.entries(result.surfaces).map(([id, data]) => (
          <SurfaceRow
            key={id}
            id={id}
            data={data}
            onScopeChange={v => update(['surfaces', id, 'scope'], v)}
            onUpdate={(field, v) => update(['surfaces', id, field], v)}
          />
        ))}
      </CategorySection>

      {/* Trim */}
      <CategorySection title="Trim">
        {result.trim && Object.entries(result.trim).map(([id, data]) => (
          <TrimRow
            key={id}
            id={id}
            data={data}
            onScopeChange={v => update(['trim', id, 'scope'], v)}
            onUpdate={(field, v) => update(['trim', id, field], v)}
          />
        ))}
      </CategorySection>

      {/* Doors */}
      <CategorySection title="Doors">
        {result.doors && result.doors.map((d, i) => (
          <DoorRow
            key={i}
            index={i}
            data={d}
            onScopeChange={v => update(['doors', i, 'scope'], v)}
            onUpdate={(field, v) => update(['doors', i, field], v)}
          />
        ))}
      </CategorySection>

      {/* Windows */}
      <CategorySection title="Windows">
        {result.windows && result.windows.map((w, i) => (
          <WindowRow
            key={i}
            index={i}
            data={w}
            onScopeChange={v => update(['windows', i, 'scope'], v)}
            onUpdate={(field, v) => update(['windows', i, field], v)}
          />
        ))}
      </CategorySection>

      {/* Openings */}
      <CategorySection title="Openings">
        {result.openings && result.openings.map((o, i) => (
          <OpeningRow
            key={i}
            index={i}
            data={o}
            onScopeChange={v => update(['openings', i, 'scope'], v)}
            onUpdate={(field, v) => update(['openings', i, field], v)}
          />
        ))}
      </CategorySection>

      {/* Fixtures */}
      <CategorySection title="Fixtures (Protection)">
        {result.fixtures && result.fixtures.map((f, i) => (
          <FixtureRow
            key={i}
            index={i}
            data={f}
            onScopeChange={v => update(['fixtures', i, 'scope'], v)}
            onUpdate={(field, v) => update(['fixtures', i, field], v)}
          />
        ))}
      </CategorySection>

      {/* Specialty */}
      <CategorySection title="Specialty">
        {result.specialty && Object.entries(result.specialty).map(([id, data]) => (
          <SpecialtyRow
            key={id}
            id={id}
            data={data}
            onScopeChange={v => update(['specialty', id, 'scope'], v)}
            onUpdate={(field, v) => update(['specialty', id, field], v)}
          />
        ))}
      </CategorySection>

      {/* Notable features (info only) */}
      {result.notable_features && result.notable_features.length > 0 && (
        <CategorySection title="Notes">
          <div className="detection-notes">
            {result.notable_features.map((f, i) => <div key={i} className="detection-note">{f}</div>)}
          </div>
        </CategorySection>
      )}
    </div>
  );
}
