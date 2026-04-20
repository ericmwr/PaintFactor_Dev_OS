// Dev-only Vite plugin: exposes POST /__authoring/publish to write
// module / scenario / assembly JSON back to disk. Available only in
// dev mode — production builds skip this plugin entirely.
//
// Safety:
//   - Refuses writes outside Claude/modules, Claude/scenarios
//   - Validates id matches filename pattern
//   - Pretty-prints JSON
//   - Logs every write

import fs from 'node:fs/promises';
import path from 'node:path';

const WORKTREE_ROOT = path.resolve(process.cwd(), '../../../');
// From tools/paintscope up to the worktree root where Claude/ lives
const MODULES_DIR   = path.join(WORKTREE_ROOT, 'Claude', 'modules');
const SCENARIOS_DIR = path.join(WORKTREE_ROOT, 'Claude', 'scenarios');
const ASSEMBLIES_DIR = path.join(SCENARIOS_DIR, 'assemblies');
const MODIFIERS_DIR = path.join(WORKTREE_ROOT, 'Claude', 'modifiers');

const KIND_CONFIG = {
  module:   { dir: MODULES_DIR,    prefix: 'MOD_', idField: 'module_id'    },
  scenario: { dir: SCENARIOS_DIR,  prefix: 'SCN_', idField: 'scenario_id'  },
  assembly: { dir: ASSEMBLIES_DIR, prefix: 'ASM_', idField: 'assembly_id'  },
  modifier: { dir: MODIFIERS_DIR,  prefix: 'FAC_', idField: 'modifier_id'  },
};

function assertSafePath(dir, filename) {
  const full = path.resolve(dir, filename);
  if (!full.startsWith(dir + path.sep)) {
    throw new Error(`Refused write outside allowed directory: ${full}`);
  }
  return full;
}

async function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

export default function authoringPlugin() {
  return {
    name: 'paintscope-authoring',
    apply: 'serve',  // dev only
    configureServer(server) {
      server.middlewares.use('/__authoring/publish', async (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }
        try {
          const { kind, payload } = await readJson(req);
          const cfg = KIND_CONFIG[kind];
          if (!cfg) throw new Error(`Unknown kind: ${kind}`);
          if (!payload || typeof payload !== 'object') throw new Error('payload required');
          const id = payload[cfg.idField];
          if (!id || !id.startsWith(cfg.prefix)) {
            throw new Error(`${cfg.idField} must start with ${cfg.prefix}`);
          }
          await fs.mkdir(cfg.dir, { recursive: true });
          const filename = `${id}.json`;
          const full = assertSafePath(cfg.dir, filename);
          const serialized = JSON.stringify(payload, null, 2) + '\n';
          await fs.writeFile(full, serialized, 'utf8');
          console.log(`[authoring] wrote ${path.relative(WORKTREE_ROOT, full)} (${serialized.length} bytes)`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, path: path.relative(WORKTREE_ROOT, full), bytes: serialized.length }));
        } catch (err) {
          console.error('[authoring] publish error:', err);
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: err.message }));
        }
      });
      console.log('[authoring] publish endpoint mounted at POST /__authoring/publish (dev only)');
    },
  };
}
