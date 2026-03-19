import { getDB } from './project-db';

export async function listAssemblies() {
  const db = await getDB();
  return db.getAll('assemblies');
}

export async function loadAssembly(id) {
  const db = await getDB();
  return db.get('assemblies', id);
}

export async function saveAssembly(assembly) {
  const db = await getDB();
  if (!assembly.id) {
    assembly.id = `asm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    assembly.created_at = new Date().toISOString();
  }
  assembly.updated_at = new Date().toISOString();
  await db.put('assemblies', assembly);
  return assembly;
}

export async function deleteAssembly(id) {
  const db = await getDB();
  await db.delete('assemblies', id);
}
