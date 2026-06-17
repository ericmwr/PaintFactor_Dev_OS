// Monotonic ID counter shared by all state factories.
//
// Extracted from initial-state.js so that exterior-state.js (and any other
// factory module) can obtain genId WITHOUT importing initial-state.js. That
// import created an initial-state <-> exterior-state cycle: initial-state.js
// imports createExteriorState and calls it eagerly at module-eval time, while
// exterior-state.js imported genId back from initial-state.js. The cycle is
// latent in the bundled app (entry always loads initial-state first) but threw
// `ReferenceError: Cannot access '__vite_ssr_import_0__' before initialization`
// under Vitest's per-file SSR loader when the graph was entered from the
// exterior-state side. Keeping the counter in a dependency-free leaf module
// breaks the cycle.

let nextId = 1;

export function genId(prefix) { return `${prefix}_${nextId++}`; }

// Allow persistence layer to bump nextId past existing IDs
export function bumpNextId(n) { if (n >= nextId) nextId = n + 1; }

export function getNextId() { return nextId; }
