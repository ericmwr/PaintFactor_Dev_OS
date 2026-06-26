// Single swap-point for the SQLite driver. Uses only the .exec/.prepare/.run/.get/.all
// surface that both better-sqlite3 and node:sqlite (DatabaseSync) share, so swapping
// drivers is a one-line change here.
import Database from 'better-sqlite3';

export function openDb(filename) {
  return new Database(filename);
}

// --- node:sqlite fallback (zero install; needs `node --experimental-sqlite`) ---
// import { DatabaseSync } from 'node:sqlite';
// export function openDb(filename) {
//   return new DatabaseSync(filename);
// }
