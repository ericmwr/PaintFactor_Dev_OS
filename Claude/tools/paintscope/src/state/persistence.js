import { migrateV02toV03, migrateInline } from './migrations';

const STORAGE_KEY = 'paintscope_state';

/**
 * Load state from localStorage with all migrations applied.
 * Used as the initializer function for useReducer.
 */
export function loadFromStorage(init) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      let parsed = JSON.parse(saved);
      if (parsed.project && parsed.rooms) {
        parsed = migrateV02toV03(parsed);
        parsed = migrateInline(parsed);
        return { ...parsed, ui: parsed.ui || init.ui };
      }
    }
  } catch(e) { console.error('[PaintScope] Load error:', e); }
  return init;
}

/**
 * Save state to localStorage.
 */
export function saveToStorage(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch(e) { console.error('[PaintScope] Save error:', e); }
}

/**
 * Clear all saved state.
 */
export function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
}
