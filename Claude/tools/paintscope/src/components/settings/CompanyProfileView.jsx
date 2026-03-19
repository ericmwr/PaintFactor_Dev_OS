import { useState } from 'react';
import { useCompanyProfile } from '../../hooks/useCompanyProfile';
import CrewConfigEditor from './CrewConfigEditor';

export default function CompanyProfileView() {
  const { profile, loading, update } = useCompanyProfile();
  const [saveFlash, setSaveFlash] = useState(false);

  if (loading || !profile) return <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>;

  const set = (field, value) => {
    update({ [field]: value });
  };

  const setRate = (role, value) => {
    update({ labor_rates: { ...profile.labor_rates, [role]: parseFloat(value) || 0 } });
  };

  const setRule = (field, value) => {
    update({ business_rules: { ...profile.business_rules, [field]: parseFloat(value) || 0 } });
  };

  const handleSave = async () => {
    await update(profile);
    setSaveFlash(true);
    setTimeout(() => setSaveFlash(false), 1500);
  };

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, color: 'var(--accent)', margin: 0 }}>Company Settings</h2>
        <button className={`btn btn-accent ${saveFlash ? 'save-flash' : ''}`} onClick={handleSave} style={{ fontSize: 12 }}>
          {saveFlash ? '\u2713 Saved' : 'Save Settings'}
        </button>
      </div>

      <div className="setup-field" style={{ marginBottom: 16 }}>
        <label>Company Name</label>
        <input
          value={profile.company_name || ''}
          onChange={e => set('company_name', e.target.value)}
          placeholder="Your company name"
          style={{ fontSize: 14, padding: '6px 10px' }}
        />
      </div>

      {/* Labor Rates */}
      <div className="panel-section" style={{ background: 'rgba(130, 170, 255, 0.04)', border: '1px solid rgba(130, 170, 255, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Labor Rates ($/hr)</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          {['painter', 'lead', 'apprentice'].map(role => (
            <div className="setup-field" key={role}>
              <label>{role.charAt(0).toUpperCase() + role.slice(1)}</label>
              <input
                type="number"
                step="0.50"
                value={profile.labor_rates?.[role] || ''}
                onChange={e => setRate(role, e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Burden / Overhead / Margin */}
      <div className="panel-section" style={{ background: 'rgba(100, 210, 140, 0.04)', border: '1px solid rgba(100, 210, 140, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Burden / Overhead / Margin (%)</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          {[
            { key: 'labor_burden_pct', label: 'Labor Burden' },
            { key: 'overhead_rate_pct', label: 'Overhead' },
            { key: 'profit_margin_pct', label: 'Profit Margin' },
            { key: 'p4p_ratio_pct', label: 'P4P Ratio' },
          ].map(f => (
            <div className="setup-field" key={f.key}>
              <label>{f.label}</label>
              <input
                type="number"
                step="1"
                value={profile[f.key] ?? ''}
                onChange={e => set(f.key, parseFloat(e.target.value) || 0)}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Crew Configs */}
      <div className="panel-section" style={{ background: 'rgba(255, 190, 100, 0.04)', border: '1px solid rgba(255, 190, 100, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Crew Configurations</div>
        <CrewConfigEditor
          crews={profile.crew_configs || []}
          onChange={crews => set('crew_configs', crews)}
        />
      </div>

      {/* Business Rules */}
      <div className="panel-section" style={{ background: 'rgba(200, 150, 255, 0.04)', border: '1px solid rgba(200, 150, 255, 0.12)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 }}>
        <div className="section-title">Business Rules</div>
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          {[
            { key: 'min_job_charge', label: 'Min Job Charge ($)' },
            { key: 'travel_time_min', label: 'Travel Time (min)' },
            { key: 'overtime_multiplier', label: 'OT Multiplier' },
            { key: 'mobilization_charge', label: 'Mobilization ($)' },
          ].map(f => (
            <div className="setup-field" key={f.key}>
              <label>{f.label}</label>
              <input
                type="number"
                step="0.5"
                value={profile.business_rules?.[f.key] ?? ''}
                onChange={e => setRule(f.key, e.target.value)}
                style={{ fontSize: 13 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
