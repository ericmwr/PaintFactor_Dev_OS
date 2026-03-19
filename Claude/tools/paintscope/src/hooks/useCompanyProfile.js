import { useState, useEffect, useCallback } from 'react';
import { loadCompanyProfile, saveCompanyProfile } from '../data/company-db';

export function useCompanyProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadCompanyProfile().then(p => {
      if (!cancelled) { setProfile(p); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, []);

  const update = useCallback(async (updates) => {
    const merged = { ...profile, ...updates };
    const saved = await saveCompanyProfile(merged);
    setProfile(saved);
    return saved;
  }, [profile]);

  return { profile, loading, update };
}
