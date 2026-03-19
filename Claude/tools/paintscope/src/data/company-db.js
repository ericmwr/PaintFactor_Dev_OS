import { getDB } from './project-db';

const DEFAULT_PROFILE = {
  key: 'singleton',
  company_name: '',
  labor_rates: { painter: 25, lead: 35, apprentice: 18 },
  labor_burden_pct: 30,
  overhead_rate_pct: 15,
  profit_margin_pct: 10,
  p4p_ratio_pct: 0,
  crew_configs: [{ name: 'Standard 2-Man', lead: 1, painter: 1, apprentice: 0 }],
  business_rules: {
    min_job_charge: 500,
    travel_time_min: 30,
    overtime_multiplier: 1.5,
    mobilization_charge: 150,
  },
  updated_at: new Date().toISOString(),
};

export async function loadCompanyProfile() {
  const db = await getDB();
  const profile = await db.get('company_profile', 'singleton');
  return profile || { ...DEFAULT_PROFILE };
}

export async function saveCompanyProfile(profile) {
  const db = await getDB();
  profile.key = 'singleton';
  profile.updated_at = new Date().toISOString();
  await db.put('company_profile', profile);
  return profile;
}
