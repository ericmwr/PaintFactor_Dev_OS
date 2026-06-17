// Dev-only Vite plugin: exposes POST /__authoring/publish to write
// module / scenario / assembly JSON back to disk, plus /__authoring/archive
// and /__authoring/restore to move files between Claude/{kind}/ and
// Claude/{kind}/archive/. Available only in dev mode — production builds
// skip this plugin entirely.
//
// The bundle generator (build-scenario-bundle.mjs) reads top-level files
// only and filters by prefix — so an archive/ subfolder is automatically
// excluded from the canonical bundle without any generator changes.
//
// Safety:
//   - Refuses writes outside Claude/{modules,scenarios,modifiers,tasks}
//   - Validates id matches filename pattern (prefix + .json)
//   - Archive refuses if target file already exists; restore refuses if
//     source missing — no clobber, no silent moves
//   - Pretty-prints JSON
//   - Logs every write/move

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const WORKTREE_ROOT = path.resolve(process.cwd(), '../../../');
// From tools/paintscope up to the worktree root where Claude/ lives
const MODULES_DIR   = path.join(WORKTREE_ROOT, 'Claude', 'modules');
const SCENARIOS_DIR = path.join(WORKTREE_ROOT, 'Claude', 'scenarios');
const ASSEMBLIES_DIR = path.join(SCENARIOS_DIR, 'assemblies');
const MODIFIERS_DIR = path.join(WORKTREE_ROOT, 'Claude', 'modifiers');
const TASKS_DIR = path.join(WORKTREE_ROOT, 'Claude', 'tasks');

const KIND_CONFIG = {
  module:   { dir: MODULES_DIR,    prefix: 'MOD_', idField: 'module_id'    },
  scenario: { dir: SCENARIOS_DIR,  prefix: 'SCN_', idField: 'scenario_id'  },
  assembly: { dir: ASSEMBLIES_DIR, prefix: 'ASM_', idField: 'assembly_id'  },
  modifier: { dir: MODIFIERS_DIR,  prefix: 'FAC_', idField: 'modifier_id'  },
  task:     { dir: TASKS_DIR,      prefix: 'TSK_', idField: 'task_id'      },
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

// Validate an archive/restore request body and resolve the source/target
// file paths for a file-move operation.
async function resolveMovePaths(body, direction /* 'archive' | 'restore' */) {
  const { kind, id } = body;
  const cfg = KIND_CONFIG[kind];
  if (!cfg) throw new Error(`Unknown kind: ${kind}`);
  if (!id || typeof id !== 'string' || !id.startsWith(cfg.prefix)) {
    throw new Error(`id must be a string starting with ${cfg.prefix}`);
  }
  const filename = `${id}.json`;
  const archiveDir = path.join(cfg.dir, 'archive');
  const livePath    = assertSafePath(cfg.dir,    filename);
  const archivePath = assertSafePath(archiveDir, filename);

  const from = direction === 'archive' ? livePath    : archivePath;
  const to   = direction === 'archive' ? archivePath : livePath;

  // Source must exist
  try { await fs.access(from); }
  catch { throw new Error(`Source file not found: ${path.relative(WORKTREE_ROOT, from)}`); }

  // Target must NOT exist (no clobber)
  let targetExists = false;
  try { await fs.access(to); targetExists = true; } catch {}
  if (targetExists) {
    throw new Error(`Target already exists, refusing clobber: ${path.relative(WORKTREE_ROOT, to)}`);
  }

  return { from, to, archiveDir };
}

async function handleMove(req, res, direction) {
  if (req.method !== 'POST') return false;
  try {
    const body = await readJson(req);
    const { from, to, archiveDir } = await resolveMovePaths(body, direction);
    if (direction === 'archive') {
      await fs.mkdir(archiveDir, { recursive: true });
    }
    await fs.rename(from, to);
    console.log(`[authoring] ${direction} ${path.relative(WORKTREE_ROOT, from)} -> ${path.relative(WORKTREE_ROOT, to)}`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      from: path.relative(WORKTREE_ROOT, from),
      to:   path.relative(WORKTREE_ROOT, to),
    }));
  } catch (err) {
    console.error(`[authoring] ${direction} error:`, err);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
  return true;
}

// Spawn the bundle generator script and stream its output back. The
// script reads Claude/{tasks,modules,scenarios,modifiers}/, validates
// references, and writes scenario-bundle.gen.js. Vite's file watcher
// picks up the .gen.js change and triggers HMR — the page re-imports
// the bundle without a full reload.
async function handleRegenBundle(req, res) {
  if (req.method !== 'POST') return false;
  const scriptPath = path.join(WORKTREE_ROOT, 'Claude', 'scripts', 'build-scenario-bundle.mjs');
  const startedAt = Date.now();
  try {
    // Use process.execPath (absolute path to the running node binary) +
    // arg array without shell — preserves spaces in WORKTREE_ROOT and
    // the script path on Windows. shell:true splits at spaces and breaks
    // when the worktree path contains a space (e.g. "Claude Code Uni").
    const proc = spawn(process.execPath, [scriptPath], { cwd: WORKTREE_ROOT });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });
    const exitCode = await new Promise((resolve, reject) => {
      proc.on('error', reject);
      proc.on('close', resolve);
    });
    const ms = Date.now() - startedAt;
    if (exitCode !== 0) {
      throw new Error(`Bundle gen exited ${exitCode}: ${(stderr || stdout).slice(0, 500)}`);
    }
    console.log(`[authoring] regen-bundle ok (${ms}ms)`);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, ms, stdout: stdout.slice(-800), stderr: stderr.slice(-400) }));
  } catch (err) {
    console.error('[authoring] regen-bundle error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
  return true;
}

// List archived entities for a kind. Returns [{id, name, mtimeMs}].
// Used by the Archive tab. Read-only — no filesystem mutation.
async function handleListArchive(req, res) {
  if (req.method !== 'GET') return false;
  try {
    const url = new URL(req.url, 'http://localhost');
    const kind = url.searchParams.get('kind');
    const cfg = KIND_CONFIG[kind];
    if (!cfg) throw new Error(`Unknown kind: ${kind}`);
    const archiveDir = path.join(cfg.dir, 'archive');
    let files = [];
    try { files = await fs.readdir(archiveDir); }
    catch (e) {
      if (e.code === 'ENOENT') files = [];
      else throw e;
    }
    const entries = [];
    for (const file of files) {
      if (!file.startsWith(cfg.prefix) || !file.endsWith('.json')) continue;
      const full = path.join(archiveDir, file);
      const stat = await fs.stat(full);
      let payload = null;
      try { payload = JSON.parse(await fs.readFile(full, 'utf8')); }
      catch {}
      entries.push({
        id: file.slice(0, -5), // strip .json
        name: payload?.name || null,
        phase: payload?.phase || null,
        mtimeMs: stat.mtimeMs,
      });
    }
    entries.sort((a, b) => b.mtimeMs - a.mtimeMs); // newest first
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, entries }));
  } catch (err) {
    console.error('[authoring] list-archive error:', err);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
  return true;
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

      server.middlewares.use('/__authoring/archive', async (req, res, next) => {
        const handled = await handleMove(req, res, 'archive');
        if (!handled) next();
      });

      server.middlewares.use('/__authoring/restore', async (req, res, next) => {
        const handled = await handleMove(req, res, 'restore');
        if (!handled) next();
      });

      server.middlewares.use('/__authoring/list-archive', async (req, res, next) => {
        const handled = await handleListArchive(req, res);
        if (!handled) next();
      });

      server.middlewares.use('/__authoring/regen-bundle', async (req, res, next) => {
        const handled = await handleRegenBundle(req, res);
        if (!handled) next();
      });

      console.log('[authoring] endpoints mounted: publish, archive, restore, list-archive, regen-bundle (dev only)');
    },
  };
}
