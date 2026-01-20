---
name: pf-rlm-controller
description: Use an RLM-style recursive workflow for large-context tasks by chunking files, delegating to sub-agents, compiling outputs, and running critic review before finalizing artifacts.
---

# PaintFactor RLM Controller (Recursive Workflow)

When the request touches large context (many files/specs/notes), do not attempt to load everything at once.

## 1 Work Plan
- Define objective and output artifacts
- Identify relevant folders/files
- Choose chunking strategy:
  - by file
  - by headings
  - by spec family folder

## 2 Externalize context
Create/update:
- `devos/memory/_workbench.md` (plan + pointers)
- `devos/memory/_compiled_output.md` (assembled results)

## 3 Recursive chunk loop
For each chunk:
- read only that chunk
- call the best sub-agent
- demand JSON-compatible structured output
- append to `_compiled_output.md`

## 4 Critic gate
Call `critic` over the compiled output.
If fail:
- loop only over broken parts.

## 5 Package artifacts
Write results to:
- `specs/<family_id>/...` for specs
- `devos/memory/...` for DevOS docs

Always include:
- version
- status (draft/review/approved/deprecated)
- changelog entry
