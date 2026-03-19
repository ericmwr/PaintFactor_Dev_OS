export default function CrewConfigEditor({ crews, onChange }) {
  const addCrew = () => {
    onChange([...crews, { name: 'New Crew', lead: 1, painter: 1, apprentice: 0 }]);
  };

  const removeCrew = (index) => {
    onChange(crews.filter((_, i) => i !== index));
  };

  const updateCrew = (index, field, value) => {
    const updated = crews.map((c, i) => {
      if (i !== index) return c;
      return { ...c, [field]: field === 'name' ? value : (parseInt(value) || 0) };
    });
    onChange(updated);
  };

  return (
    <div>
      {crews.map((crew, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <input
            value={crew.name}
            onChange={e => updateCrew(i, 'name', e.target.value)}
            placeholder="Crew name"
            style={{ flex: 2, fontSize: 12, padding: '4px 8px' }}
          />
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Lead</label>
          <input type="number" min="0" value={crew.lead} onChange={e => updateCrew(i, 'lead', e.target.value)} style={{ width: 40, fontSize: 12, textAlign: 'center' }} />
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Painter</label>
          <input type="number" min="0" value={crew.painter} onChange={e => updateCrew(i, 'painter', e.target.value)} style={{ width: 40, fontSize: 12, textAlign: 'center' }} />
          <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>Appr</label>
          <input type="number" min="0" value={crew.apprentice} onChange={e => updateCrew(i, 'apprentice', e.target.value)} style={{ width: 40, fontSize: 12, textAlign: 'center' }} />
          <button
            className="btn btn-sm"
            onClick={() => removeCrew(i)}
            style={{ fontSize: 10, color: '#e74c3c', padding: '2px 6px' }}
          >X</button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={addCrew} style={{ fontSize: 11, marginTop: 4 }}>+ Add Crew</button>
    </div>
  );
}
