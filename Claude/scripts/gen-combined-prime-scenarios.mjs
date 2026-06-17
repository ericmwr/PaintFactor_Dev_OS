#!/usr/bin/env node
// DEPRECATED — kept as a historical reference.
//
// This script generated the per-substrate combined scenarios
// (SCN_DRYWALL_PRIME_*_COMBINED + SCN_CEILING_PRIME_*_COMBINED) that were
// active before the pass-group model. Those scenarios were archived to
// Claude/scenarios/_archive/ in the pass-groups implementation.
//
// Current combined prime scenarios live at:
//   Claude/scenarios/SCN_COMBINED_WALLS_CEILING_PRIME_QT{2,3,4,5}_SPRAY_BACKROLL.json
//
// They were authored once by hand (QT3 template) + a throwaway node script
// that cloned to QT2/QT4/QT5 — see git history for the exact invocation.
// Re-running THIS file does nothing useful; it exists to make the deprecation
// visible to anyone who tries.

console.error('This generator is deprecated. See file header for the current path.');
process.exit(1);
