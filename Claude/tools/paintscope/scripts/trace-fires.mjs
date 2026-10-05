// Trace what fires through the estimate for a given (paintable_item, substrate_state, application_method, …) tuple.
//
// Walks Claude/scenarios/SCN_*.json → matched scenarios → Claude/modules/MOD_*.json → tasks (evaluated against the ctx)
// and emits the firing chain as markdown, mermaid, or json. Companion to audit-exterior-states.mjs.
//
// Usage:
//   node Claude/tools/paintscope/scripts/trace-fires.mjs \
//     --paintable-item siding \
//     --substrate-state SS_EXT_BARE_WOOD \
//     --method spray_backroll \
//     --project-type NC
//
// Other flags:
//   --coating-type paint|stain|stain_clear|protect|...   (defaults: paint)
//   --format md|mermaid|json                              (defaults: md)
//   --show-suppressed                                     (show tasks that DIDN'T fire too, marked ✗)
//   --extra key=value,key=value                           (extra ctx keys for applies_when matching, e.g. pre_1978=true,joint_complexity=simple)
//   --scenarios-dir <path>                                (override default Claude/scenarios)
//   --modules-dir <path>                                  (override default Claude/modules)
//   --tasks-dir <path>                                    (override default Claude/tasks)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const repoRoot   = path.resolve(__dirname, '../../../..');

const DEFAULTS = {
  scenariosDir: path.join(repoRoot, 'Claude/scenarios'),
  modulesDir:   path.join(repoRoot, 'Claude/modules'),
  tasksDir:     path.join(repoRoot, 'Claude/tasks'),
};

// ── arg parsing ──
function parseArgs(argv) {
  const out = { format: 'md', coatingType: 'paint', extra: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const eat = () => argv[++i];
    if (a === '--paintable-item')      out.paintableItem  = eat();
    else if (a === '--substrate-state') out.substrateState = eat();
    else if (a === '--method')          out.method         = eat();
    else if (a === '--project-type')    out.projectType    = eat();
    else if (a === '--coating-type')    out.coatingType    = eat();
    else if (a === '--format')          out.format         = eat();
    else if (a === '--show-suppressed') out.showSuppressed = true;
    else if (a === '--scenarios-dir')   out.scenariosDir   = eat();
    else if (a === '--modules-dir')     out.modulesDir     = eat();
    else if (a === '--tasks-dir')       out.tasksDir       = eat();
    else if (a === '--extra') {
      const pairs = eat().split(',');
      for (const p of pairs) {
        const [k, v] = p.split('=');
        if (k) out.extra[k] = v ?? 'true';
      }
    } else if (a === '-h' || a === '--help') { printUsage(); process.exit(0); }
    else if (a) {
      console.error('Unknown arg:', a);
      printUsage();
      process.exit(2);
    }
  }
  if (!out.paintableItem) { console.error('Missing --paintable-item'); printUsage(); process.exit(2); }
  return out;
}

function printUsage() {
  console.error(`Usage:
  trace-fires.mjs --paintable-item <pi> [--substrate-state <ss>] [--method <m>] [--project-type NC|RP]
                  [--coating-type paint|stain|...] [--format md|mermaid|json]
                  [--show-suppressed] [--extra k=v,k=v]
                  [--scenarios-dir <path>] [--modules-dir <path>] [--tasks-dir <path>]

Examples:
  trace-fires.mjs --paintable-item siding --substrate-state SS_EXT_BARE_WOOD --method spray_backroll --project-type NC
  trace-fires.mjs --paintable-item siding --substrate-state SS_EXT_PAINTED_SATIN --method spray_backroll --format mermaid
  trace-fires.mjs --paintable-item ext_fc_siding --method spray_backroll --format json
`);
}

// ── scenario matching ──
// Scenarios use matches.{paintable_item, substrate_state[], application_method, coating_type}.
// Values can be string or array. Arrays mean "any of these matches".
function asArray(v) { return v == null ? [] : Array.isArray(v) ? v : [v]; }
function arrayMatches(allowed, value) {
  if (!allowed || allowed.length === 0) return true;   // unconstrained → matches
  if (value == null) return false;                     // ctx missing → no match
  return allowed.includes(value);
}

function scenarioMatches(scn, ctx) {
  const m = scn.matches || {};
  // Substrate-level inputs only match scenarios that explicitly target a paintable_item.
  // Pass-group scenarios (matches.pass_group_id present) target a different ctx shape
  // and should be skipped here even if their other fields incidentally match.
  if (m.pass_group_id) return false;
  if (!m.paintable_item) return false;
  if (!arrayMatches(asArray(m.paintable_item), ctx.paintable_item)) return false;
  if (m.substrate_state && !arrayMatches(asArray(m.substrate_state), ctx.substrate_state)) return false;
  if (m.application_method && !arrayMatches(asArray(m.application_method), ctx.application_method)) return false;
  if (m.coating_type && !arrayMatches(asArray(m.coating_type), ctx.coating_type)) return false;
  if (scn.context && ctx.project_type && scn.context !== ctx.project_type) return false;
  return true;
}

// applies_when on a task — each key constrains a ctx field; values are an array of allowed values.
// Returns {fires: boolean, reasons: string[]} so we can surface why a task didn't fire.
function evaluateAppliesWhen(appliesWhen, ctx) {
  if (!appliesWhen) return { fires: true, reasons: [] };
  const reasons = [];
  let fires = true;
  for (const [key, allowed] of Object.entries(appliesWhen)) {
    const got = ctx[key];
    const allowedArr = asArray(allowed).map(String);
    const gotStr = got == null ? null : String(got);
    if (gotStr == null || !allowedArr.includes(gotStr)) {
      fires = false;
      reasons.push(`${key} ∈ [${allowedArr.join(', ')}] but got ${gotStr ?? '<null>'}`);
    }
  }
  return { fires, reasons };
}

// ── load files lazily ──
function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadAllScenarios(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.startsWith('SCN_') && f.endsWith('.json'))
    .map(f => {
      try { return { file: f, data: loadJson(path.join(dir, f)) }; }
      catch { return null; }
    })
    .filter(Boolean);
}

function loadModule(dir, modId) {
  const fp = path.join(dir, `${modId}.json`);
  if (!fs.existsSync(fp)) return null;
  return loadJson(fp);
}

function loadTask(dir, taskId) {
  const fp = path.join(dir, `${taskId}.json`);
  if (!fs.existsSync(fp)) return null;
  return loadJson(fp);
}

// ── build trace tree ──
function buildTrace(ctx, opts) {
  const scenariosDir = opts.scenariosDir || DEFAULTS.scenariosDir;
  const modulesDir   = opts.modulesDir   || DEFAULTS.modulesDir;
  const tasksDir     = opts.tasksDir     || DEFAULTS.tasksDir;

  const scenarios = loadAllScenarios(scenariosDir);
  const matched = scenarios.filter(s => scenarioMatches(s.data, ctx));

  const result = {
    input: ctx,
    matchedCount: matched.length,
    scenarios: matched.map(({ file, data }) => {
      // Module slots (sequential — same module may appear twice for multi-coat)
      const moduleSlots = (data.modules || []).map((modId, idx) => {
        const mod = loadModule(modulesDir, modId);
        if (!mod) return { slot: idx + 1, moduleId: modId, missing: true };
        const tasks = (mod.tasks || []).map(t => {
          const taskId = t.task_ref;
          const task = loadTask(tasksDir, taskId);
          const evalResult = evaluateAppliesWhen(t.applies_when, ctx);
          return {
            taskId,
            fires: evalResult.fires,
            suppressionReasons: evalResult.fires ? null : evalResult.reasons,
            appliesWhen: t.applies_when || null,
            psKey: task?.ps_key,
            uom: task?.uom,
            ratePerHour: task?.rate_per_hour,
            name: task?.name,
            missingTaskFile: !task,
          };
        });
        return {
          slot: idx + 1,
          moduleId: modId,
          phase: mod.phase,
          name: mod.name,
          intent: mod.intent,
          modifierEligibility: mod.modifier_eligibility || {},
          tasks,
        };
      });
      return {
        file,
        scenarioId: data.scenario_id,
        name: data.name,
        context: data.context,
        domain: data.domain,
        matches: data.matches,
        coatCounts: data.coat_counts,
        materialSystems: data.material_systems,
        protectionZones: data.protection_zones,
        outputState: data.output_state,
        moduleSlots,
      };
    }),
  };
  return result;
}

// ── formatters ──
function fmtMarkdown(trace, showSuppressed) {
  const lines = [];
  const ctx = trace.input;
  lines.push(`# Trace: ${ctx.paintable_item} × ${ctx.substrate_state ?? '(any state)'} × ${ctx.application_method ?? '(any method)'}${ctx.project_type ? ` (${ctx.project_type})` : ''}`);
  lines.push('');
  lines.push(`**Input ctx**: \`${JSON.stringify(ctx)}\``);
  lines.push('');
  lines.push(`**Matched scenarios**: ${trace.matchedCount}${trace.matchedCount === 0 ? ' ⚠ no scenarios fire — this combination produces zero billable work' : ''}`);
  lines.push('');
  for (const scn of trace.scenarios) {
    lines.push(`## ${scn.scenarioId}`);
    lines.push(`*${scn.name}* — ${scn.context ?? ''} ${scn.domain ?? ''}`);
    lines.push('');
    if (scn.coatCounts) lines.push(`- **coat_counts**: prime ${scn.coatCounts.prime_coats ?? 0}, finish ${scn.coatCounts.finish_coats ?? 0}, interstage ${scn.coatCounts.interstage_cycles ?? 0}`);
    if (scn.materialSystems?.length) lines.push(`- **material_systems**: ${scn.materialSystems.join(', ')}`);
    if (scn.protectionZones?.length) lines.push(`- **protection_zones**: ${scn.protectionZones.map(z => `${z.zone_id} (${z.level})`).join(', ')}`);
    if (scn.outputState) lines.push(`- **output_state**: ${scn.outputState}`);
    lines.push('');
    lines.push(`### Modules (${scn.moduleSlots.length} slots)`);
    lines.push('');
    for (const slot of scn.moduleSlots) {
      if (slot.missing) { lines.push(`${slot.slot}. **${slot.moduleId}** ⚠ MODULE FILE NOT FOUND`); continue; }
      const elig = Object.entries(slot.modifierEligibility).filter(([_,v])=>v).map(([k])=>k).join(', ') || 'none';
      lines.push(`${slot.slot}. **${slot.moduleId}** \`[${slot.phase}]\``);
      if (slot.name) lines.push(`   - *${slot.name}*`);
      lines.push(`   - modifier_eligibility: ${elig}`);
      if (slot.tasks.length === 0) lines.push(`   - (no tasks; behavior inherited from scenario fields like protection_zones)`);
      const firing = slot.tasks.filter(t => t.fires);
      const suppressed = slot.tasks.filter(t => !t.fires);
      if (firing.length) {
        lines.push('   - **Tasks that fire:**');
        for (const t of firing) {
          const gate = t.appliesWhen ? ` (gate: ${Object.entries(t.appliesWhen).map(([k,v])=>`${k} ∈ [${asArray(v).join(', ')}]`).join('; ')})` : '';
          const ps = t.psKey ? `  \`${t.psKey}\`` : '';
          const rate = t.ratePerHour ? ` @ ${t.ratePerHour}/hr` : '';
          lines.push(`     - ✓ ${t.taskId}${ps}${rate}${gate}${t.missingTaskFile ? ' ⚠ task file missing' : ''}`);
        }
      }
      if (showSuppressed && suppressed.length) {
        lines.push('   - **Tasks suppressed by applies_when:**');
        for (const t of suppressed) {
          lines.push(`     - ✗ ${t.taskId} — ${t.suppressionReasons.join('; ')}`);
        }
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

function fmtMermaid(trace) {
  const lines = ['```mermaid', 'graph LR'];
  const ctx = trace.input;
  const inputNode = `INPUT["${ctx.paintable_item}<br/>${ctx.substrate_state ?? '*'}<br/>${ctx.application_method ?? '*'}"]`;
  lines.push(`  ${inputNode}`);
  let scnIdx = 0;
  for (const scn of trace.scenarios) {
    scnIdx++;
    const scnNode = `SCN${scnIdx}["${scn.scenarioId}"]`;
    lines.push(`  INPUT --> ${scnNode}`);
    for (const slot of scn.moduleSlots) {
      if (slot.missing) continue;
      const modNode = `M${scnIdx}_${slot.slot}["${slot.moduleId}<br/>(${slot.phase})"]`;
      lines.push(`  ${scnNode} --> ${modNode}`);
      const firing = slot.tasks.filter(t => t.fires);
      for (let ti = 0; ti < firing.length; ti++) {
        const t = firing[ti];
        const tNode = `T${scnIdx}_${slot.slot}_${ti}["${t.taskId}"]`;
        lines.push(`  ${modNode} --> ${tNode}`);
      }
    }
  }
  lines.push('```');
  return lines.join('\n');
}

// ── main ──
const args = parseArgs(process.argv.slice(2));
const ctx = {
  paintable_item:     args.paintableItem,
  substrate_state:    args.substrateState ?? null,
  application_method: args.method ?? null,
  project_type:       args.projectType ?? null,
  coating_type:       args.coatingType,
  ...args.extra,
};

const trace = buildTrace(ctx, args);

if (args.format === 'json') {
  console.log(JSON.stringify(trace, null, 2));
} else if (args.format === 'mermaid') {
  console.log(fmtMermaid(trace));
} else {
  console.log(fmtMarkdown(trace, args.showSuppressed));
}
