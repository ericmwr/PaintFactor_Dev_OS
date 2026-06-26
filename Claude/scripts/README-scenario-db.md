# Scenario Query Database

A local, queryable SQLite mirror of the scenario engine's data, generated from the
JSON source of truth (`Claude/modules`, `Claude/scenarios`, `Claude/tasks`,
`Claude/modifiers`) plus the rate/material data and product catalog.

It is a **disposable, gitignored build artifact** — the JSON stays the source of truth.
It does **not** ship to Netlify and does not affect the app or its deploy.

## Build / rebuild

```bash
npm install --prefix Claude/scripts        # one-time (installs better-sqlite3)
node Claude/scripts/build-scenario-db.mjs  # writes Claude/database/scenario.db
```

> Driver fallback: if `better-sqlite3` won't install on your Node, switch
> `Claude/scripts/lib/db-open.mjs` to the `node:sqlite` version (commented in that file)
> and run `node --experimental-sqlite Claude/scripts/build-scenario-db.mjs`.

## Query

Open `Claude/database/scenario.db` in DB Browser for SQLite, the `sqlite3` CLI, Datasette,
or a VS Code SQLite extension. Built-in views: `v_orphan_tasks`, `v_scenario_coverage`,
`v_missing_material_systems`. Every entity table also has a `raw_json` column with the
full source object (query nested fields via SQLite `json_extract`).

## Tests

```bash
node --test Claude/scripts/lib/        # unit tests (schema + inserts + loaders)
node --test Claude/scripts/scenario-db-smoke.test.mjs   # end-to-end against real data
```
