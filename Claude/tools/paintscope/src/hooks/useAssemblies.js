import { useState, useEffect, useCallback } from 'react';
import { listAssemblies, saveAssembly, deleteAssembly } from '../data/assembly-db';

export function useAssemblies() {
  const [assemblies, setAssemblies] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const all = await listAssemblies();
    setAssemblies(all);
  }, []);

  useEffect(() => {
    refresh().then(() => setLoading(false));
  }, [refresh]);

  const save = useCallback(async (assembly) => {
    const saved = await saveAssembly(assembly);
    await refresh();
    return saved;
  }, [refresh]);

  const remove = useCallback(async (id) => {
    await deleteAssembly(id);
    await refresh();
  }, [refresh]);

  return { assemblies, loading, save, remove, refresh };
}
