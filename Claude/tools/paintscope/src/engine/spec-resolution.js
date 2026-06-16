// SHIM — spec-system retirement P1 (2026-06-16).
// The real resolver functions now live in the scenario-owned module
// engine/scenario-resolution.js. This shim is retained only for legacy
// run-estimate.js until P2 retires it. Deleted in Phase 6.
export * from './scenario-resolution.js';
