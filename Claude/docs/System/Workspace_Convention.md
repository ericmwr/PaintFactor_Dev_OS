# Workspace Convention

**Status:** ACTIVE
**Version:** 1.0.0
**Last Updated:** 2026-02-19

---

## Purpose

This document defines where AI sessions should work, how worktrees are managed, and how to locate the most current version of any file.

---

## Git Repository Structure

```
C:\Eric_AI_Playground\Claude Code Uni\          ← Git repo root (feature/datafactory-setup)
└── Claude\                                      ← Main working tree
    ├── agents\
    ├── docs\
    ├── engine\
    ├── specs\
    ├── database\
    └── .claude\
        └── worktrees\
            └── clever-swartz\                   ← PRIMARY AI WORKSPACE (claude/clever-swartz)
                └── Claude\                      ← Mirror of main working tree structure
```

---

## Primary AI Workspace

**Location:** `C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\clever-swartz\Claude\`

**Branch:** `claude/clever-swartz`

All AI sessions should read from and write to the `clever-swartz` worktree. This is the single persistent workspace that tracks active development work before it is merged back to `feature/datafactory-setup`.

**Why a worktree and not the main tree?**
Claude Code creates named worktrees per session by default. Rather than accumulating many short-lived worktrees, `clever-swartz` is kept as the single persistent AI session workspace.

---

## Branch Hierarchy

```
main                           ← Stable merged history (behind feature branch)
  └── feature/datafactory-setup ← Main development branch (main working tree)
        └── claude/clever-swartz ← Active AI workspace (clever-swartz worktree)
```

**Commit flow:** Work in `clever-swartz` → commit to `claude/clever-swartz` → periodically merge into `feature/datafactory-setup` → eventually merge to `main`.

---

## Rules for AI Sessions

1. **Always check which worktree you are in** before reading or writing files. Paths like `C:\...\Claude\docs\` and `C:\...\clever-swartz\Claude\docs\` look similar but are different.

2. **Write new files to clever-swartz**, not to the main working tree (`C:\Eric_AI_Playground\Claude Code Uni\Claude\Claude\`), unless specifically directed otherwise.

3. **Commit new files** at the end of the session. Untracked files in a worktree are lost if the worktree is removed.

4. **Do not create new worktrees** unless there is a specific isolated branch reason. Claude Code may auto-create them — these should be cleaned up after each session.

---

## Finding the Most Current Version of a File

The `clever-swartz` worktree branch (`0a8b890` as of 2026-02-19) is **ahead of** `feature/datafactory-setup` (`bdb2c0f`). The most recently committed work is always in `clever-swartz`.

To find the current version of any file:
1. Check `clever-swartz` worktree first
2. Fall back to main working tree if not found there

---

## Worktree Cleanup History

| Worktree | Branch | Reason Removed | Date |
|---|---|---|---|
| jolly-khorana | claude/jolly-khorana | Identical to feature/datafactory-setup, no unique work | 2026-02-19 |
| vigorous-mcclintock | claude/vigorous-mcclintock | Identical to feature/datafactory-setup, no unique work | 2026-02-19 |
| gallant-mcnulty | claude/gallant-mcnulty | Stale (prunable), older work already absorbed | 2026-02-19 |
| elastic-galileo | claude/elastic-galileo | Already merged into main (commit d7efddb) | 2026-02-19 |
| happy-kirch | claude/happy-kirch | Identical to feature/datafactory-setup, no unique work | 2026-02-19 |

---

## Stale Filesystem Directories (Manual Deletion Pending)

The following directories still exist on disk but are no longer registered as git worktrees and have no unique content. They can be safely deleted when no longer locked by Windows:

- `C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\elastic-galileo\`
- `C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\happy-kirch\`

To delete when ready (run from any terminal with no other Claude sessions open):
```
rmdir /S /Q "C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\elastic-galileo"
rmdir /S /Q "C:\Eric_AI_Playground\Claude Code Uni\Claude\.claude\worktrees\happy-kirch"
```

---

## Change Log

| Version | Date | Summary |
|---|---|---|
| 1.0.0 | 2026-02-19 | Initial document — worktree consolidation from 6 to 1 active worktree |
