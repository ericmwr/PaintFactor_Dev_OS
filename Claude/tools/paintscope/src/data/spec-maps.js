// SHIM — spec-system retirement P1 (2026-06-16).
// The real constants now live in the scenario-owned module data/scenario-maps.js.
// This shim is retained only so not-yet-migrated consumers (legacy run-estimate.js /
// modifier-stack.js, and P3 readers material-estimates.js / scope-tree.js /
// build-snapshot.js / EstimateDiagnostic.jsx) keep resolving unchanged.
// Deleted in Phase 6 of the retirement once those consumers are migrated.
export * from './scenario-maps.js';
