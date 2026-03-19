import { useState } from 'react';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'estimated', label: 'Estimated' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export default function ProjectMetadataForm({ project, onSave, onCancel }) {
  const [name, setName] = useState(project.name || '');
  const [clientName, setClientName] = useState(project.client_name || '');
  const [address, setAddress] = useState(project.address || '');
  const [status, setStatus] = useState(project.status || 'draft');

  const handleSave = () => {
    onSave({ name, client_name: clientName, address, status });
  };

  return (
    <div>
      <h3 style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>Project Details</h3>
      <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="setup-field">
          <label>Project Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Project name" />
        </div>
        <div className="setup-field">
          <label>Client Name</label>
          <input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Client name" />
        </div>
        <div className="setup-field">
          <label>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Job site address" />
        </div>
        <div className="setup-field">
          <label>Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-accent" onClick={handleSave} style={{ fontSize: 12 }}>Save</button>
        {onCancel && <button className="btn btn-sm" onClick={onCancel} style={{ fontSize: 12 }}>Cancel</button>}
      </div>
    </div>
  );
}
