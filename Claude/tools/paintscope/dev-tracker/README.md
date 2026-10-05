# PaintScope Dev Tracker

A living per-category status doc so we don't re-analyze the same surface every session.

## Files
- [interior-nc.md](interior-nc.md) — Interior, new construction
- [interior-rp.md](interior-rp.md) — Interior, repaint
- [exterior-nc.md](exterior-nc.md) — Exterior, new construction
- [exterior-rp.md](exterior-rp.md) — Exterior, repaint

## Convention

**Before working in a category:** read its tracker first. The snapshot, coverage tables, known issues, and recent-changes log together replace a fresh codebase audit.

**While working in a category:** update the tracker in the same change. Treat the tracker as part of the diff, not a follow-up. Three things to keep current:
1. **Recent changes** — one bullet per session, dated, newest first. Terse: "Default ext app method spray_backbrush → spray_backroll (5 files)".
2. **Coverage** — only when actually changed (added a scenario, removed an enum value, wired a new substrate).
3. **Known issues** — add when discovered; check off when resolved.

**Don't** mirror everything in CLAUDE.md or memory. The tracker is the *current state* of a category; memory is for cross-cutting feedback and reference; CLAUDE.md is for repo-wide architecture. If a fact only matters to one category, it lives here.

**Don't** over-engineer. The point is to skip re-analysis, not to build a status dashboard. Bullets > prose. If you find yourself writing more than a couple paragraphs, it probably belongs in `Claude/devos/` as a one-off design doc instead.

## File schema

Each category file follows this layout:

```
# {Title} — Dev Tracker
**Last updated**: YYYY-MM-DD
**Status**: stable | active-dev | broken | gaps

## Snapshot
1–2 paragraphs. Where this category stands right now.

## Coverage
Tables of paintable_item × substrate_state × method support. Mark gaps clearly.

## Wired but degenerate
UI dropdowns or fields the engine silently zeros on. "Kill or fix" candidates.

## Known issues
- [ ] bug or gap, brief

## Open follow-ups
- [ ] tasks discussed but not yet started

## Recent changes (newest first)
### YYYY-MM-DD — One-line summary
- detail
- detail

## Key files
- code paths, scenario globs, module globs

## Notes for next session
Anything tactical the next session should know.
```

## Adding a new category

Create a new file with the schema above, link it from this README, and add a one-liner to project memory `MEMORY.md` if it represents a major surface.
