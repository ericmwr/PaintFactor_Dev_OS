# Schedule & Client Notifications — Implementation Plan (Phases 1–3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give PaintFactor projects real dates — crews, queues, travel-aware durations, and a cascade engine that computes who moved when a job slips — with movements visible to the contractor only. No client-facing output in these phases.

**Architecture:** All scheduling logic lives in the Next.js website alongside Supabase, because that is where the data and the portal already are. The engine is a set of **pure TypeScript modules** in `lib/schedule/` with zero Supabase imports, mirroring the existing `lib/proposal-helpers.ts` pattern — fully unit-testable without a database. Supabase access is isolated in one `queries.ts` module. Admin UI is client components under `app/admin/schedule/`.

**Tech Stack:** Next.js 16.2.1, React 19.2.4, TypeScript 5 (strict), Supabase (`@supabase/supabase-js` 2.100.1, `@supabase/ssr` 0.9.0), Tailwind 4. Vitest 3.2.4 is added by Task 1 — the website currently has **no test infrastructure**.

**Spec:** `docs/superpowers/specs/2026-09-19-schedule-notifications-design.md`

## Global Constraints

- All work happens in `ideal-painting-website/`. Paths in this plan are relative to that directory unless stated otherwise.
- **There is no local Supabase CLI** — no `supabase/config.toml` exists. Migrations are `.sql` files applied by hand through the Supabase dashboard SQL editor. Migration tasks are verified by running a verification query, not by `supabase db reset`.
- Migration files are numbered sequentially: `supabase/migrations/NNN_name.sql`. The last is `002_proposal_tables.sql`, so the next is `003_`.
- Follow the `002_proposal_tables.sql` conventions exactly: `uuid PRIMARY KEY DEFAULT gen_random_uuid()`, `timestamptz NOT NULL DEFAULT now()`, status as `text NOT NULL CHECK (... IN (...))` — **not** Postgres enums, RLS enabled on every table with client-read and admin-manage policies.
- Client RLS policies scope through `projects.client_id = auth.uid()`. Admin policies use `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')`.
- TypeScript is `strict: true`. No `any`. Path alias `@/*` maps to `./*`.
- Dates are ISO `YYYY-MM-DD` strings throughout, never `Date` objects in stored shapes. All date arithmetic uses UTC to avoid DST drift.
- `crews.daily_hours` is **paid** hours. Capacity always nets travel out. Never compute capacity as `headcount × daily_hours`.
- Pure modules in `lib/schedule/` must not import from `@/lib/supabase/*`. Only `queries.ts` touches the database.
- Phases 1–3 produce **no client-facing notifications**. Movements are computed and displayed to the contractor only.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `supabase/migrations/003_schedule_tables.sql` | All six schedule tables, indexes, RLS |
| `lib/schedule/types.ts` | Shared type definitions — no logic |
| `lib/schedule/dates.ts` | UTC-safe ISO date arithmetic |
| `lib/schedule/capacity.ts` | Travel-aware capacity and duration derivation |
| `lib/schedule/tiers.ts` | Derived commitment tier |
| `lib/schedule/queue-graph.ts` | Builds the successor map across crew queues |
| `lib/schedule/cascade.ts` | Delay traversal and pull-forward proposals |
| `lib/schedule/queries.ts` | The only module that touches Supabase |
| `app/admin/schedule/page.tsx` | Crew management + queue view + cascade view |
| `lib/schedule/__tests__/*.test.ts` | Unit tests, one file per pure module |

Pure modules are split by responsibility rather than bundled, because the cascade traversal is the part most likely to need re-reading and re-testing in isolation.

---

# Phase 1 — Schema & Crews

### Task 1: Test infrastructure + date utilities

Vitest is installed here because this is the first task that needs it. `dates.ts` is built alongside it so the setup is proven by a real test rather than a smoke test.

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/schedule/dates.ts`
- Test: `lib/schedule/__tests__/dates.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `addDays(iso: string, n: number): string`, `daysBetween(fromIso: string, toIso: string): number`, `isoWeekKey(iso: string): string`

- [ ] **Step 1: Install vitest**

```bash
npm install --save-dev vitest@^3.2.4
```

- [ ] **Step 2: Add test scripts to `package.json`**

Add to the `"scripts"` block, after `"lint": "eslint"`:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: Create `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, './') },
  },
  test: {
    environment: 'node',
    include: ['lib/**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Write the failing test**

Create `lib/schedule/__tests__/dates.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { addDays, daysBetween, isoWeekKey } from '../dates';

describe('addDays', () => {
  it('adds days within a month', () => {
    expect(addDays('2026-09-08', 2)).toBe('2026-09-10');
  });

  it('rolls over a month boundary', () => {
    expect(addDays('2026-09-29', 4)).toBe('2026-10-03');
  });

  it('subtracts with a negative offset', () => {
    expect(addDays('2026-10-03', -4)).toBe('2026-09-29');
  });

  it('handles a leap day', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is a no-op for zero', () => {
    expect(addDays('2026-09-08', 0)).toBe('2026-09-08');
  });
});

describe('daysBetween', () => {
  it('counts forward', () => {
    expect(daysBetween('2026-09-08', '2026-09-15')).toBe(7);
  });

  it('returns negative when the target is earlier', () => {
    expect(daysBetween('2026-09-15', '2026-09-08')).toBe(-7);
  });

  it('returns zero for the same day', () => {
    expect(daysBetween('2026-09-08', '2026-09-08')).toBe(0);
  });

  it('crosses a DST boundary without drifting', () => {
    // US DST ends 2026-11-01; a naive local-time implementation returns 7.04 -> 7 or 8
    expect(daysBetween('2026-10-28', '2026-11-04')).toBe(7);
  });
});

describe('isoWeekKey', () => {
  it('returns a YYYY-Www key', () => {
    expect(isoWeekKey('2026-09-08')).toBe('2026-W37');
  });

  it('gives the same key for two days in one ISO week', () => {
    expect(isoWeekKey('2026-09-07')).toBe(isoWeekKey('2026-09-11'));
  });

  it('gives different keys across a week boundary', () => {
    expect(isoWeekKey('2026-09-13')).not.toBe(isoWeekKey('2026-09-14'));
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../dates"`.

- [ ] **Step 6: Implement `lib/schedule/dates.ts`**

```typescript
/**
 * UTC-safe arithmetic over ISO `YYYY-MM-DD` date strings.
 *
 * Everything goes through Date.UTC deliberately: local-time Date math
 * silently drifts by an hour across DST boundaries, which is enough to
 * turn a 7-day span into 6 or 8 once rounded.
 */

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

const DAY_MS = 86_400_000;

export function addDays(iso: string, n: number): string {
  return fromUTC(toUTC(iso) + n * DAY_MS);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((toUTC(toIso) - toUTC(fromIso)) / DAY_MS);
}

/**
 * ISO-8601 week key, e.g. '2026-W37'. Used by the tier filter to decide
 * whether a Scheduled-tier job has moved into a different week.
 */
export function isoWeekKey(iso: string): string {
  const ms = toUTC(iso);
  const d = new Date(ms);
  // ISO weeks run Monday(1)..Sunday(7); shift to the Thursday of this week,
  // which always falls in the owning ISO year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const year = d.getUTCFullYear();
  const jan1 = Date.UTC(year, 0, 1);
  const week = Math.ceil(((d.getTime() - jan1) / DAY_MS + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 12 tests.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/schedule/dates.ts lib/schedule/__tests__/dates.test.ts
git commit -m "feat(schedule): add vitest and UTC-safe date utilities

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Schedule schema migration

**Files:**
- Create: `supabase/migrations/003_schedule_tables.sql`

**Interfaces:**
- Consumes: existing `projects`, `profiles` tables
- Produces: tables `crews`, `crew_availability`, `scheduled_jobs`, `job_crew_assignments`, `schedule_events`, `schedule_movements`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/003_schedule_tables.sql`:

```sql
-- 003_schedule_tables.sql
-- Crews, job scheduling, disruption events, and cascade movements.
-- Notifications tables land in a later phase.

-- Crews are a SCHEDULING primitive. They are deliberately NOT the same thing
-- as company_profile.crew_configs, which is a costing abstraction with no
-- identity and no constraint that a person be in one place at a time.
CREATE TABLE crews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  headcount int NOT NULL CHECK (headcount > 0),
  -- PAID hours per person per day. Capacity nets travel out of this.
  daily_hours numeric NOT NULL DEFAULT 7.0 CHECK (daily_hours > 0),
  domains text[] NOT NULL DEFAULT '{interior,exterior}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Exceptions only; the default is "available on weekdays".
CREATE TABLE crew_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  date date NOT NULL,
  available boolean NOT NULL DEFAULT false,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_id, date)
);

CREATE TABLE scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  planned_start date NOT NULL,
  planned_end date NOT NULL,
  duration_days int NOT NULL CHECK (duration_days > 0),
  buffer_days int NOT NULL DEFAULT 1 CHECK (buffer_days >= 0),
  -- Round-trip travel, consumed from each assigned crew's working day.
  -- Manually set until the distance system exists.
  travel_hours_per_day numeric NOT NULL DEFAULT 1.0 CHECK (travel_hours_per_day >= 0),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','committed','in_progress','complete','cancelled')),
  original_start date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- A job may be worked by more than one crew, so crew assignment is a join
-- rather than a column. queue_position is per-crew.
CREATE TABLE job_crew_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  crew_id uuid NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  queue_position int NOT NULL,
  -- NULL = split hours proportionally to each crew's effective capacity.
  hours_allocated numeric,
  -- Day offsets into the job for a crew that joins late or leaves early.
  -- NULL/NULL = the crew works the full span.
  starts_on_day int,
  ends_on_day int,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, crew_id),
  UNIQUE (crew_id, queue_position) DEFERRABLE INITIALLY DEFERRED
);

CREATE TABLE schedule_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL
    CHECK (event_type IN ('rain_day','change_order','duration_revised',
                          'cancellation','material_delay','crew_unavailable',
                          'manual_adjustment')),
  crew_id uuid REFERENCES crews(id) ON DELETE SET NULL,
  source_job_id uuid REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  delta_hours numeric,
  delta_days numeric,
  occurred_on date NOT NULL DEFAULT current_date,
  note text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE schedule_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES schedule_events(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  from_start date NOT NULL,
  to_start date NOT NULL,
  delta_days int NOT NULL,
  tier_at_time text NOT NULL
    CHECK (tier_at_time IN ('confirmed','scheduled','queued')),
  notify_decision text NOT NULL DEFAULT 'below_threshold'
    CHECK (notify_decision IN ('notify','below_threshold','digest','suppressed_noop')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_scheduled_jobs_project ON scheduled_jobs(project_id);
CREATE INDEX idx_scheduled_jobs_start ON scheduled_jobs(planned_start);
CREATE INDEX idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX idx_assignments_crew ON job_crew_assignments(crew_id, queue_position);
CREATE INDEX idx_assignments_job ON job_crew_assignments(job_id);
CREATE INDEX idx_events_job ON schedule_events(source_job_id);
CREATE INDEX idx_movements_event ON schedule_movements(event_id);
CREATE INDEX idx_movements_job ON schedule_movements(job_id);

-- RLS
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_crew_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_movements ENABLE ROW LEVEL SECURITY;

-- Crews and availability are internal: admins only, no client access.
CREATE POLICY "Admins manage crews"
  ON crews FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage crew availability"
  ON crew_availability FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Clients may read their own job's dates.
CREATE POLICY "Clients view own scheduled jobs"
  ON scheduled_jobs FOR SELECT
  USING (project_id IN (SELECT id FROM projects WHERE client_id = auth.uid()));

CREATE POLICY "Admins manage scheduled jobs"
  ON scheduled_jobs FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Crew assignment is internal. A client learns their date, not who is coming.
CREATE POLICY "Admins manage job crew assignments"
  ON job_crew_assignments FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins manage schedule events"
  ON schedule_events FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Clients may read movements on their own project — this is the change
-- history the portal shows in a later phase.
CREATE POLICY "Clients view own movements"
  ON schedule_movements FOR SELECT
  USING (job_id IN (
    SELECT sj.id FROM scheduled_jobs sj
    JOIN projects p ON sj.project_id = p.id
    WHERE p.client_id = auth.uid()
  ));

CREATE POLICY "Admins manage schedule movements"
  ON schedule_movements FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

- [ ] **Step 2: Apply the migration**

Open the Supabase dashboard → SQL Editor → New query. Paste the entire contents of `supabase/migrations/003_schedule_tables.sql` and run it.

Expected: `Success. No rows returned.`

- [ ] **Step 3: Verify the schema landed**

Run this in the same SQL editor:

```sql
SELECT table_name, count(*) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('crews','crew_availability','scheduled_jobs',
                     'job_crew_assignments','schedule_events','schedule_movements')
GROUP BY table_name
ORDER BY table_name;
```

Expected: 6 rows —
`crew_availability` 6, `crews` 7, `job_crew_assignments` 8, `schedule_events` 10, `schedule_movements` 9, `scheduled_jobs` 11.

- [ ] **Step 4: Verify RLS is on every table**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('crews','crew_availability','scheduled_jobs',
                    'job_crew_assignments','schedule_events','schedule_movements');
```

Expected: 6 rows, `rowsecurity = true` for all.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/003_schedule_tables.sql
git commit -m "feat(schedule): add crews, jobs, events, and movements schema

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Shared types + crew queries

**Files:**
- Create: `lib/schedule/types.ts`
- Create: `lib/schedule/queries.ts`
- Test: `lib/schedule/__tests__/types.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: types `CommitmentTier`, `CrewDomain`, `Crew`, `JobStatus`, `ScheduledJob`, `JobCrewAssignment`, `ScheduleEventType`, `ScheduleEvent`, `Movement`, `PullForwardProposal`; the `JOB_STATUSES` / `SCHEDULE_EVENT_TYPES` constant arrays; and query functions `fetchCrews`, `createCrew`, `updateCrew`

- [ ] **Step 1: Write the failing test**

The types file also exports runtime constant arrays that the DB CHECK constraints mirror; drift between them is a real bug class, so they get a test.

Create `lib/schedule/__tests__/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { JOB_STATUSES, SCHEDULE_EVENT_TYPES, COMMITMENT_TIERS } from '../types';

describe('constant arrays mirror the DB CHECK constraints', () => {
  it('lists every job status from 003_schedule_tables.sql', () => {
    expect([...JOB_STATUSES]).toEqual([
      'queued', 'committed', 'in_progress', 'complete', 'cancelled',
    ]);
  });

  it('lists every schedule event type', () => {
    expect([...SCHEDULE_EVENT_TYPES]).toEqual([
      'rain_day', 'change_order', 'duration_revised',
      'cancellation', 'material_delay', 'crew_unavailable', 'manual_adjustment',
    ]);
  });

  it('lists every commitment tier', () => {
    expect([...COMMITMENT_TIERS]).toEqual(['confirmed', 'scheduled', 'queued']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../types"`.

- [ ] **Step 3: Implement `lib/schedule/types.ts`**

```typescript
export const COMMITMENT_TIERS = ['confirmed', 'scheduled', 'queued'] as const;
export type CommitmentTier = (typeof COMMITMENT_TIERS)[number];

export const CREW_DOMAINS = ['interior', 'exterior'] as const;
export type CrewDomain = (typeof CREW_DOMAINS)[number];

export const JOB_STATUSES = [
  'queued', 'committed', 'in_progress', 'complete', 'cancelled',
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const SCHEDULE_EVENT_TYPES = [
  'rain_day', 'change_order', 'duration_revised',
  'cancellation', 'material_delay', 'crew_unavailable', 'manual_adjustment',
] as const;
export type ScheduleEventType = (typeof SCHEDULE_EVENT_TYPES)[number];

export const NOTIFY_DECISIONS = [
  'notify', 'below_threshold', 'digest', 'suppressed_noop',
] as const;
export type NotifyDecision = (typeof NOTIFY_DECISIONS)[number];

/** A scheduling crew. NOT company_profile.crew_configs, which is a costing blend. */
export type Crew = {
  id: string;
  name: string;
  headcount: number;
  /** PAID hours per person per day. Capacity nets travel out of this. */
  daily_hours: number;
  domains: CrewDomain[];
  active: boolean;
};

export type ScheduledJob = {
  id: string;
  project_id: string;
  /** ISO YYYY-MM-DD */
  planned_start: string;
  planned_end: string;
  duration_days: number;
  buffer_days: number;
  /** Round-trip hours, consumed from each assigned crew's working day. */
  travel_hours_per_day: number;
  status: JobStatus;
  original_start: string | null;
};

export type JobCrewAssignment = {
  id: string;
  job_id: string;
  crew_id: string;
  /** Order within THAT crew's queue. */
  queue_position: number;
  /** null = split proportionally to each crew's effective capacity. */
  hours_allocated: number | null;
  /** Day offsets for a crew that joins late or leaves early; null = full span. */
  starts_on_day: number | null;
  ends_on_day: number | null;
};

export type ScheduleEvent = {
  id: string;
  event_type: ScheduleEventType;
  crew_id: string | null;
  source_job_id: string | null;
  delta_hours: number | null;
  delta_days: number | null;
  occurred_on: string;
  note: string | null;
};

/** One job whose date changed as a result of a cascade. */
export type Movement = {
  job_id: string;
  from_start: string;
  to_start: string;
  delta_days: number;
  tier_at_time: CommitmentTier;
};

/** An offered earlier start. Never applied without client consent. */
export type PullForwardProposal = {
  job_id: string;
  current_start: string;
  proposed_start: string;
  /** Always negative. */
  delta_days: number;
};
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 15 tests total (12 from Task 1, 3 new).

- [ ] **Step 5: Implement `lib/schedule/queries.ts`**

This is the only module permitted to import Supabase.

```typescript
import { createClient } from '@/lib/supabase/client';
import type { Crew, CrewDomain } from './types';

export async function fetchCrews(includeInactive = false): Promise<Crew[]> {
  const supabase = createClient();
  let query = supabase
    .from('crews')
    .select('id, name, headcount, daily_hours, domains, active')
    .order('name');
  if (!includeInactive) query = query.eq('active', true);

  const { data, error } = await query;
  if (error) throw new Error(`fetchCrews failed: ${error.message}`);
  return (data ?? []) as Crew[];
}

export async function createCrew(input: {
  name: string;
  headcount: number;
  daily_hours: number;
  domains: CrewDomain[];
}): Promise<Crew> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('crews')
    .insert(input)
    .select('id, name, headcount, daily_hours, domains, active')
    .single();
  if (error) throw new Error(`createCrew failed: ${error.message}`);
  return data as Crew;
}

export async function updateCrew(
  id: string,
  patch: Partial<Omit<Crew, 'id'>>,
): Promise<Crew> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('crews')
    .update(patch)
    .eq('id', id)
    .select('id, name, headcount, daily_hours, domains, active')
    .single();
  if (error) throw new Error(`updateCrew failed: ${error.message}`);
  return data as Crew;
}
```

- [ ] **Step 6: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add lib/schedule/types.ts lib/schedule/queries.ts lib/schedule/__tests__/types.test.ts
git commit -m "feat(schedule): add shared types and crew queries

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Admin crew management UI

**Files:**
- Create: `app/admin/schedule/page.tsx`

**Interfaces:**
- Consumes: `fetchCrews`, `createCrew`, `updateCrew` from `lib/schedule/queries`; `Crew`, `CrewDomain`, `CREW_DOMAINS` from `lib/schedule/types`
- Produces: the `/admin/schedule` route, extended by Tasks 7 and 11

This task is verified in the browser rather than by unit test — it is a client component whose behavior is the rendering.

- [ ] **Step 1: Create the page**

Follow the `app/admin/proposals/page.tsx` pattern: `"use client"`, hooks, `createClient` indirectly via the query module.

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchCrews, createCrew, updateCrew } from "@/lib/schedule/queries";
import { CREW_DOMAINS, type Crew, type CrewDomain } from "@/lib/schedule/types";

export default function AdminSchedulePage() {
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [headcount, setHeadcount] = useState(2);
  const [dailyHours, setDailyHours] = useState(7);
  const [domains, setDomains] = useState<CrewDomain[]>(["interior", "exterior"]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCrews(await fetchCrews(true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createCrew({ name, headcount, daily_hours: dailyHours, domains });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleActive(crew: Crew) {
    try {
      await updateCrew(crew.id, { active: !crew.active });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function toggleDomain(d: CrewDomain) {
    setDomains((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Schedule — Crews</h1>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <form onSubmit={handleCreate} className="mb-8 grid gap-3 sm:grid-cols-5 items-end">
        <label className="flex flex-col text-sm sm:col-span-2">
          Name
          <input
            className="border rounded px-2 py-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label className="flex flex-col text-sm">
          Headcount
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1"
            value={headcount}
            onChange={(e) => setHeadcount(Number(e.target.value))}
          />
        </label>
        <label className="flex flex-col text-sm">
          Paid hrs/day
          <input
            type="number"
            min={1}
            step={0.5}
            className="border rounded px-2 py-1"
            value={dailyHours}
            onChange={(e) => setDailyHours(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Add crew
        </button>
        <div className="sm:col-span-5 flex gap-4 text-sm">
          {CREW_DOMAINS.map((d) => (
            <label key={d} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={domains.includes(d)}
                onChange={() => toggleDomain(d)}
              />
              {d}
            </label>
          ))}
        </div>
      </form>

      {loading ? (
        <p className="text-sm">Loading…</p>
      ) : crews.length === 0 ? (
        <p className="text-sm">No crews yet.</p>
      ) : (
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2">Name</th>
              <th>Headcount</th>
              <th>Paid hrs/day</th>
              <th>Domains</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {crews.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="py-2">{c.name}</td>
                <td>{c.headcount}</td>
                <td>{c.daily_hours}</td>
                <td>{c.domains.join(", ")}</td>
                <td>{c.active ? "yes" : "no"}</td>
                <td>
                  <button className="underline" onClick={() => void toggleActive(c)}>
                    {c.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in the browser**

Start the dev server (use the Browser pane's `preview_start`, not a bare shell command) and open `/admin/schedule` signed in as an admin.

Create a crew named "Crew A", headcount 2, 7 paid hrs/day, both domains. Confirm it appears in the table. Reload the page and confirm it persists. Click Deactivate and confirm the Active column flips to "no".

If the table stays empty after creating, the RLS admin policy is rejecting the insert — verify the signed-in profile has `role = 'admin'`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/schedule/page.tsx
git commit -m "feat(schedule): add admin crew management page

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — Duration Derivation & Queue View

### Task 5: Travel-aware capacity and duration

**Files:**
- Create: `lib/schedule/capacity.ts`
- Test: `lib/schedule/__tests__/capacity.test.ts`

**Interfaces:**
- Consumes: `Crew` from `lib/schedule/types`
- Produces: `effectiveCapacity(crews: Crew[], travelHoursPerDay: number): number`, `deriveDurationDays(estimatedHours: number, capacityHoursPerDay: number, sequencingFloorDays: number): number`

- [ ] **Step 1: Write the failing test**

Create `lib/schedule/__tests__/capacity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { effectiveCapacity, deriveDurationDays } from '../capacity';
import type { Crew } from '../types';

function crew(overrides: Partial<Crew> = {}): Crew {
  return {
    id: 'c1',
    name: 'Crew A',
    headcount: 2,
    daily_hours: 7,
    domains: ['interior', 'exterior'],
    active: true,
    ...overrides,
  };
}

describe('effectiveCapacity', () => {
  it('nets travel out of paid hours', () => {
    // 2 people x (7.0 paid - 1.0 travel) = 12.0, NOT 14.0
    expect(effectiveCapacity([crew()], 1.0)).toBe(12);
  });

  it('equals headcount x paid hours when travel is zero', () => {
    expect(effectiveCapacity([crew()], 0)).toBe(14);
  });

  it('sums across multiple crews, charging travel to each', () => {
    const a = crew({ id: 'a', headcount: 2 });
    const b = crew({ id: 'b', headcount: 3 });
    // 2*(7-1) + 3*(7-1) = 12 + 18 = 30
    expect(effectiveCapacity([a, b], 1.0)).toBe(30);
  });

  it('floors a crew at zero when travel exceeds the paid day', () => {
    expect(effectiveCapacity([crew({ daily_hours: 4 })], 6)).toBe(0);
  });

  it('returns zero for no crews', () => {
    expect(effectiveCapacity([], 1.0)).toBe(0);
  });
});

describe('deriveDurationDays', () => {
  it('matches the spec worked figure: 37.9h at 12.0/day is 4 days', () => {
    expect(deriveDurationDays(37.9, 12.0, 2)).toBe(4);
  });

  it('would have been 3 days had travel been ignored — the bug this prevents', () => {
    expect(deriveDurationDays(37.9, 14.0, 2)).toBe(3);
  });

  it('rounds partial days up', () => {
    expect(deriveDurationDays(13, 12, 1)).toBe(2);
  });

  it('returns an exact quotient without inflating it', () => {
    expect(deriveDurationDays(24, 12, 1)).toBe(2);
  });

  it('applies the sequencing floor when hours are low', () => {
    // 4 hours of work still cannot beat three sequential coat passes
    expect(deriveDurationDays(4, 12, 3)).toBe(3);
  });

  it('adding a second crew does not beat the sequencing floor', () => {
    expect(deriveDurationDays(37.9, 24.0, 3)).toBe(3);
  });

  it('throws when capacity is zero rather than returning Infinity', () => {
    expect(() => deriveDurationDays(37.9, 0, 1)).toThrow(/capacity/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../capacity"`.

- [ ] **Step 3: Implement `lib/schedule/capacity.ts`**

```typescript
import type { Crew } from './types';

/**
 * Productive hours per day across the assigned crews.
 *
 * Travel is billable time that comes OUT of the working day, so it is
 * subtracted from each crew's paid hours. Every crew assigned to a site
 * makes that trip, so travel is charged per crew, not once per job.
 */
export function effectiveCapacity(crews: Crew[], travelHoursPerDay: number): number {
  return crews.reduce((sum, c) => {
    const productive = Math.max(0, c.daily_hours - travelHoursPerDay);
    return sum + c.headcount * productive;
  }, 0);
}

/**
 * Calendar days a job occupies.
 *
 * The sequencing floor exists because painting does not fully parallelize:
 * coats need dry time between them, so N sequential coat passes cannot be
 * compressed below N days no matter how many people are on site.
 */
export function deriveDurationDays(
  estimatedHours: number,
  capacityHoursPerDay: number,
  sequencingFloorDays: number,
): number {
  if (capacityHoursPerDay <= 0) {
    throw new Error(
      'deriveDurationDays: effective capacity must be positive (check crew assignment and travel hours)',
    );
  }
  const rawDays = estimatedHours / capacityHoursPerDay;
  return Math.max(Math.ceil(rawDays), sequencingFloorDays);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 27 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule/capacity.ts lib/schedule/__tests__/capacity.test.ts
git commit -m "feat(schedule): travel-aware capacity and duration derivation

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Commitment tier derivation

**Files:**
- Create: `lib/schedule/tiers.ts`
- Test: `lib/schedule/__tests__/tiers.test.ts`

**Interfaces:**
- Consumes: `daysBetween` from `lib/schedule/dates`; `CommitmentTier` from `lib/schedule/types`
- Produces: `deriveTier(plannedStart: string, today: string): CommitmentTier`

- [ ] **Step 1: Write the failing test**

Create `lib/schedule/__tests__/tiers.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { deriveTier } from '../tiers';

const TODAY = '2026-09-19';

describe('deriveTier', () => {
  it('is confirmed on the start day itself', () => {
    expect(deriveTier('2026-09-19', TODAY)).toBe('confirmed');
  });

  it('is confirmed at exactly 7 days out', () => {
    expect(deriveTier('2026-09-26', TODAY)).toBe('confirmed');
  });

  it('is scheduled at 8 days out', () => {
    expect(deriveTier('2026-09-27', TODAY)).toBe('scheduled');
  });

  it('is scheduled at exactly 28 days out', () => {
    expect(deriveTier('2026-10-17', TODAY)).toBe('scheduled');
  });

  it('is queued at 29 days out', () => {
    expect(deriveTier('2026-10-18', TODAY)).toBe('queued');
  });

  it('treats an in-progress job whose start has passed as confirmed', () => {
    expect(deriveTier('2026-09-15', TODAY)).toBe('confirmed');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../tiers"`.

- [ ] **Step 3: Implement `lib/schedule/tiers.ts`**

```typescript
import { daysBetween } from './dates';
import type { CommitmentTier } from './types';

/**
 * Commitment tier is DERIVED, never stored, so a project auto-promotes
 * Queued -> Scheduled -> Confirmed as its date approaches with no
 * maintenance and no stale tiers.
 *
 * A start date already in the past means the job is running: treat it as
 * confirmed, the most sensitive tier.
 */
export function deriveTier(plannedStart: string, today: string): CommitmentTier {
  const days = daysBetween(today, plannedStart);
  if (days <= 7) return 'confirmed';
  if (days <= 28) return 'scheduled';
  return 'queued';
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 33 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule/tiers.ts lib/schedule/__tests__/tiers.test.ts
git commit -m "feat(schedule): derive commitment tier from days-to-start

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Queue graph + admin queue view

**Files:**
- Create: `lib/schedule/queue-graph.ts`
- Test: `lib/schedule/__tests__/queue-graph.test.ts`
- Modify: `lib/schedule/queries.ts` (append job/assignment fetchers)
- Modify: `app/admin/schedule/page.tsx` (append a queue section)

**Interfaces:**
- Consumes: `JobCrewAssignment` from `lib/schedule/types`
- Produces: `buildSuccessorMap(assignments: JobCrewAssignment[]): Map<string, string[]>`; queries `fetchScheduledJobs(): Promise<ScheduledJob[]>`, `fetchAssignments(): Promise<JobCrewAssignment[]>`

- [ ] **Step 1: Write the failing test**

Create `lib/schedule/__tests__/queue-graph.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSuccessorMap } from '../queue-graph';
import type { JobCrewAssignment } from '../types';

function assign(
  job_id: string,
  crew_id: string,
  queue_position: number,
): JobCrewAssignment {
  return {
    id: `${crew_id}-${queue_position}`,
    job_id,
    crew_id,
    queue_position,
    hours_allocated: null,
    starts_on_day: null,
    ends_on_day: null,
  };
}

describe('buildSuccessorMap', () => {
  it('links each job to the next one in the same crew queue', () => {
    const map = buildSuccessorMap([
      assign('j1', 'A', 1),
      assign('j2', 'A', 2),
      assign('j3', 'A', 3),
    ]);
    expect(map.get('j1')).toEqual(['j2']);
    expect(map.get('j2')).toEqual(['j3']);
    expect(map.get('j3')).toBeUndefined();
  });

  it('keeps separate crews in separate chains', () => {
    const map = buildSuccessorMap([
      assign('j1', 'A', 1),
      assign('j2', 'A', 2),
      assign('k1', 'B', 1),
      assign('k2', 'B', 2),
    ]);
    expect(map.get('j1')).toEqual(['j2']);
    expect(map.get('k1')).toEqual(['k2']);
  });

  it('gives a shared job successors in BOTH crew queues', () => {
    // j2 is worked by crew A and crew B simultaneously — a coupling point
    const map = buildSuccessorMap([
      assign('j1', 'A', 1),
      assign('j2', 'A', 2),
      assign('j3', 'A', 3),
      assign('j2', 'B', 1),
      assign('k9', 'B', 2),
    ]);
    expect(map.get('j2')?.sort()).toEqual(['j3', 'k9']);
  });

  it('sorts by queue_position rather than input order', () => {
    const map = buildSuccessorMap([
      assign('j3', 'A', 3),
      assign('j1', 'A', 1),
      assign('j2', 'A', 2),
    ]);
    expect(map.get('j1')).toEqual(['j2']);
  });

  it('returns an empty map for no assignments', () => {
    expect(buildSuccessorMap([]).size).toBe(0);
  });

  it('does not duplicate a successor reachable twice', () => {
    const map = buildSuccessorMap([
      assign('j1', 'A', 1),
      assign('j2', 'A', 2),
      assign('j1', 'B', 1),
      assign('j2', 'B', 2),
    ]);
    expect(map.get('j1')).toEqual(['j2']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../queue-graph"`.

- [ ] **Step 3: Implement `lib/schedule/queue-graph.ts`**

```typescript
import type { JobCrewAssignment } from './types';

/**
 * Build the successor map over all crew queues.
 *
 * Most jobs belong to exactly one crew queue, so most entries have a single
 * successor and the graph behaves like N independent lists. A job worked by
 * two crews at once is a COUPLING POINT: it has a successor in each queue,
 * and a delay reaching it propagates into both. That is the only path by
 * which one crew's overrun moves another crew's clients.
 */
export function buildSuccessorMap(
  assignments: JobCrewAssignment[],
): Map<string, string[]> {
  const byCrew = new Map<string, JobCrewAssignment[]>();
  for (const a of assignments) {
    const list = byCrew.get(a.crew_id);
    if (list) list.push(a);
    else byCrew.set(a.crew_id, [a]);
  }

  const successors = new Map<string, string[]>();
  for (const list of byCrew.values()) {
    list.sort((x, y) => x.queue_position - y.queue_position);
    for (let i = 0; i < list.length - 1; i++) {
      const from = list[i].job_id;
      const to = list[i + 1].job_id;
      const existing = successors.get(from);
      if (existing) {
        if (!existing.includes(to)) existing.push(to);
      } else {
        successors.set(from, [to]);
      }
    }
  }
  return successors;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 39 tests total.

- [ ] **Step 5: Append job fetchers to `lib/schedule/queries.ts`**

Add these imports to the existing import line and append the functions:

```typescript
import type { Crew, CrewDomain, ScheduledJob, JobCrewAssignment } from './types';
```

```typescript
export async function fetchScheduledJobs(): Promise<ScheduledJob[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('scheduled_jobs')
    .select(
      'id, project_id, planned_start, planned_end, duration_days, buffer_days, travel_hours_per_day, status, original_start',
    )
    .in('status', ['queued', 'committed', 'in_progress'])
    .order('planned_start');
  if (error) throw new Error(`fetchScheduledJobs failed: ${error.message}`);
  return (data ?? []) as ScheduledJob[];
}

export async function fetchAssignments(): Promise<JobCrewAssignment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_crew_assignments')
    .select('id, job_id, crew_id, queue_position, hours_allocated, starts_on_day, ends_on_day')
    .order('queue_position');
  if (error) throw new Error(`fetchAssignments failed: ${error.message}`);
  return (data ?? []) as JobCrewAssignment[];
}
```

- [ ] **Step 6: Add a queue section to `app/admin/schedule/page.tsx`**

Add these imports below the existing ones:

```tsx
import { fetchScheduledJobs, fetchAssignments } from "@/lib/schedule/queries";
import { deriveTier } from "@/lib/schedule/tiers";
import type { ScheduledJob, JobCrewAssignment } from "@/lib/schedule/types";
```

Add state below the existing `crews` state:

```tsx
  const [jobs, setJobs] = useState<ScheduledJob[]>([]);
  const [assignments, setAssignments] = useState<JobCrewAssignment[]>([]);
  const today = new Date().toISOString().slice(0, 10);
```

Inside `load()`, replace the single `setCrews(...)` line with:

```tsx
      const [c, j, a] = await Promise.all([
        fetchCrews(true),
        fetchScheduledJobs(),
        fetchAssignments(),
      ]);
      setCrews(c);
      setJobs(j);
      setAssignments(a);
```

Add this section immediately before the closing `</div>` of the returned JSX:

```tsx
      <h2 className="text-xl font-bold mt-12 mb-4">Queues</h2>
      {crews.filter((c) => c.active).map((crew) => {
        const rows = assignments
          .filter((a) => a.crew_id === crew.id)
          .sort((x, y) => x.queue_position - y.queue_position)
          .map((a) => ({ a, job: jobs.find((j) => j.id === a.job_id) }))
          .filter((r): r is { a: JobCrewAssignment; job: ScheduledJob } => !!r.job);

        return (
          <div key={crew.id} className="mb-8">
            <h3 className="font-semibold mb-2">{crew.name}</h3>
            {rows.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing queued.</p>
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2">#</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Days</th>
                    <th>Buffer</th>
                    <th>Tier</th>
                    <th>Crews</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ a, job }) => {
                    const crewCount = assignments.filter(
                      (x) => x.job_id === job.id,
                    ).length;
                    return (
                      <tr key={a.id} className="border-b">
                        <td className="py-2">{a.queue_position}</td>
                        <td>{job.planned_start}</td>
                        <td>{job.planned_end}</td>
                        <td>{job.duration_days}</td>
                        <td className={job.buffer_days === 0 ? "text-red-600 font-semibold" : ""}>
                          {job.buffer_days}
                        </td>
                        <td>{deriveTier(job.planned_start, today)}</td>
                        <td>{crewCount > 1 ? `${crewCount} (shared)` : "1"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
```

A zero buffer renders red because an exhausted cushion is what makes the next disruption cascade instead of being absorbed, and the contractor should see that.

- [ ] **Step 7: Verify it compiles and renders**

```bash
npx tsc --noEmit
```

Expected: no errors.

Then insert two test jobs via the Supabase SQL editor, substituting a real `project_id` and the crew id created in Task 4:

```sql
INSERT INTO scheduled_jobs (project_id, planned_start, planned_end, duration_days, buffer_days, travel_hours_per_day, status)
VALUES
  ('<real-project-uuid>', '2026-09-22', '2026-09-25', 4, 1, 1.0, 'committed'),
  ('<real-project-uuid>', '2026-09-28', '2026-09-30', 3, 1, 1.0, 'queued');

INSERT INTO job_crew_assignments (job_id, crew_id, queue_position)
SELECT id, '<real-crew-uuid>', row_number() OVER (ORDER BY planned_start)
FROM scheduled_jobs ORDER BY planned_start;
```

Reload `/admin/schedule` and confirm the Queues section lists both jobs in order with their tiers.

- [ ] **Step 8: Commit**

```bash
git add lib/schedule/queue-graph.ts lib/schedule/__tests__/queue-graph.test.ts lib/schedule/queries.ts app/admin/schedule/page.tsx
git commit -m "feat(schedule): queue graph and admin queue view

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — Cascade Engine

### Task 8: Cascade traversal for delays

The heart of the system. Pure function, no I/O.

**Files:**
- Create: `lib/schedule/cascade.ts`
- Test: `lib/schedule/__tests__/cascade.test.ts`

**Interfaces:**
- Consumes: `addDays` from `lib/schedule/dates`; `deriveTier` from `lib/schedule/tiers`; `ScheduledJob`, `Movement` from `lib/schedule/types`
- Produces: `cascadeDelay(input: CascadeInput): CascadeResult` where
  `CascadeInput = { sourceJobId: string; carryDays: number; jobs: Map<string, ScheduledJob>; successors: Map<string, string[]>; today: string }`
  and `CascadeResult = { movements: Movement[]; jobs: Map<string, ScheduledJob> }`

- [ ] **Step 1: Write the failing test**

Create `lib/schedule/__tests__/cascade.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { cascadeDelay } from '../cascade';
import type { ScheduledJob } from '../types';

const TODAY = '2026-09-19';

function job(
  id: string,
  planned_start: string,
  duration_days: number,
  buffer_days: number,
): ScheduledJob {
  return {
    id,
    project_id: `p-${id}`,
    planned_start,
    planned_end: planned_start,
    duration_days,
    buffer_days,
    travel_hours_per_day: 1,
    status: 'committed',
    original_start: planned_start,
  };
}

function jobMap(...js: ScheduledJob[]): Map<string, ScheduledJob> {
  return new Map(js.map((j) => [j.id, j]));
}

describe('cascadeDelay', () => {
  it('absorbs a delay entirely into the first buffer, moving nobody', () => {
    const jobs = jobMap(
      job('j1', '2026-09-21', 3, 1),
      job('j2', '2026-09-25', 2, 1),
    );
    const successors = new Map([['j1', ['j2']]]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 1, jobs, successors, today: TODAY,
    });
    expect(result.movements).toEqual([]);
    expect(result.jobs.get('j2')!.planned_start).toBe('2026-09-25');
    expect(result.jobs.get('j1')!.buffer_days).toBe(0);
    expect(result.jobs.get('j1')!.duration_days).toBe(4);
  });

  it('propagates past an exhausted buffer and dissipates down the chain', () => {
    // j1 buffer already spent; 3-day delay loses one day per downstream gap
    const jobs = jobMap(
      job('j1', '2026-09-21', 3, 0),
      job('j2', '2026-09-25', 2, 1),
      job('j3', '2026-09-29', 2, 1),
      job('j4', '2026-10-02', 2, 1),
      job('j5', '2026-10-06', 2, 1),
    );
    const successors = new Map([
      ['j1', ['j2']], ['j2', ['j3']], ['j3', ['j4']], ['j4', ['j5']],
    ]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 3, jobs, successors, today: TODAY,
    });
    const byId = Object.fromEntries(result.movements.map((m) => [m.job_id, m.delta_days]));
    expect(byId).toEqual({ j2: 3, j3: 2, j4: 1 });
    expect(result.jobs.get('j5')!.planned_start).toBe('2026-10-06');
  });

  it('never records a movement for the source job itself', () => {
    const jobs = jobMap(job('j1', '2026-09-21', 3, 0), job('j2', '2026-09-25', 2, 0));
    const successors = new Map([['j1', ['j2']]]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 2, jobs, successors, today: TODAY,
    });
    expect(result.movements.map((m) => m.job_id)).toEqual(['j2']);
    expect(result.jobs.get('j1')!.planned_start).toBe('2026-09-21');
  });

  it('propagates into every crew queue a shared job belongs to', () => {
    // j2 is shared: successors in crew A (j3) and crew B (k9)
    const jobs = jobMap(
      job('j1', '2026-09-21', 3, 0),
      job('j2', '2026-09-25', 2, 0),
      job('j3', '2026-09-29', 2, 1),
      job('k9', '2026-09-30', 2, 1),
    );
    const successors = new Map([['j1', ['j2']], ['j2', ['j3', 'k9']]]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 2, jobs, successors, today: TODAY,
    });
    const moved = result.movements.map((m) => m.job_id).sort();
    expect(moved).toEqual(['j2', 'j3', 'k9']);
    expect(result.jobs.get('k9')!.planned_start).toBe('2026-10-02');
  });

  it('moves a converging job once, by the LARGER delay, not the sum', () => {
    // Diamond: j1 feeds both 'a' and 'b'; both feed 'shared'.
    // 'a' has no buffer so passes 3 along; 'b' absorbs 2 and passes 1.
    // 'shared' must move by max(3, 1) = 3 — not 4, and not twice.
    const jobs = jobMap(
      job('j1', '2026-09-21', 2, 0),
      job('a', '2026-09-23', 2, 0),
      job('b', '2026-09-24', 2, 2),
      job('shared', '2026-09-28', 2, 0),
    );
    const successors = new Map([
      ['j1', ['a', 'b']],
      ['a', ['shared']],
      ['b', ['shared']],
    ]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 3, jobs, successors, today: TODAY,
    });
    const sharedMoves = result.movements.filter((m) => m.job_id === 'shared');
    expect(sharedMoves).toHaveLength(1);
    expect(sharedMoves[0].delta_days).toBe(3);
    expect(result.jobs.get('shared')!.planned_start).toBe('2026-10-01');
    // and the two intermediates moved by the full 3 each
    expect(result.jobs.get('a')!.planned_start).toBe('2026-09-26');
    expect(result.jobs.get('b')!.planned_start).toBe('2026-09-27');
  });

  it('stamps the tier from the pre-move date', () => {
    const jobs = jobMap(job('j1', '2026-09-21', 2, 0), job('j2', '2026-09-24', 2, 0));
    const successors = new Map([['j1', ['j2']]]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 1, jobs, successors, today: TODAY,
    });
    expect(result.movements[0].tier_at_time).toBe('confirmed');
  });

  it('does not mutate the input job map', () => {
    const jobs = jobMap(job('j1', '2026-09-21', 3, 0), job('j2', '2026-09-25', 2, 0));
    const successors = new Map([['j1', ['j2']]]);
    cascadeDelay({ sourceJobId: 'j1', carryDays: 2, jobs, successors, today: TODAY });
    expect(jobs.get('j2')!.planned_start).toBe('2026-09-25');
    expect(jobs.get('j1')!.duration_days).toBe(3);
  });

  it('is a no-op for a zero delay', () => {
    const jobs = jobMap(job('j1', '2026-09-21', 3, 1), job('j2', '2026-09-25', 2, 1));
    const successors = new Map([['j1', ['j2']]]);
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 0, jobs, successors, today: TODAY,
    });
    expect(result.movements).toEqual([]);
    expect(result.jobs.get('j1')!.duration_days).toBe(3);
  });

  it('handles a source job with no successors', () => {
    const jobs = jobMap(job('j1', '2026-09-21', 3, 0));
    const result = cascadeDelay({
      sourceJobId: 'j1', carryDays: 2, jobs, successors: new Map(), today: TODAY,
    });
    expect(result.movements).toEqual([]);
    expect(result.jobs.get('j1')!.duration_days).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Failed to resolve import "../cascade"`.

- [ ] **Step 3: Implement `lib/schedule/cascade.ts`**

```typescript
import { addDays } from './dates';
import { deriveTier } from './tiers';
import type { Movement, PullForwardProposal, ScheduledJob } from './types';

export type CascadeInput = {
  sourceJobId: string;
  /** Positive days of delay. */
  carryDays: number;
  jobs: Map<string, ScheduledJob>;
  /** From buildSuccessorMap(). */
  successors: Map<string, string[]>;
  /** ISO date used to stamp tier_at_time. */
  today: string;
};

export type CascadeResult = {
  movements: Movement[];
  /** A new map; the input is never mutated. */
  jobs: Map<string, ScheduledJob>;
};

/**
 * Propagate a delay through the queue graph.
 *
 * Jobs are processed in earliest-planned_start order, which is what makes
 * the traversal correct: queue order implies date order, so a job is only
 * processed once every predecessor that could push it already has. A job
 * reachable from two crew queues is therefore moved ONCE, by the larger of
 * the two delays, rather than twice additively.
 *
 * Each job's single buffer absorbs what it can, once. A shared job cannot
 * spend its cushion twice, because both crews are freed at the same later
 * time.
 */
export function cascadeDelay(input: CascadeInput): CascadeResult {
  const { sourceJobId, carryDays, successors, today } = input;

  // Copy so the caller's map is untouched.
  const jobs = new Map<string, ScheduledJob>();
  for (const [id, j] of input.jobs) jobs.set(id, { ...j });

  const movements: Movement[] = [];
  const pending = new Map<string, number>([[sourceJobId, carryDays]]);

  while (pending.size > 0) {
    // Earliest planned_start first. ISO date strings sort lexicographically.
    let jobId = '';
    let earliest = '';
    for (const id of pending.keys()) {
      const start = jobs.get(id)?.planned_start;
      if (start === undefined) continue;
      if (earliest === '' || start < earliest) {
        earliest = start;
        jobId = id;
      }
    }
    if (jobId === '') break; // every pending id was unknown

    const carry = pending.get(jobId)!;
    pending.delete(jobId);
    if (carry <= 0) continue;

    const job = jobs.get(jobId)!;

    if (jobId === sourceJobId) {
      // The source does not move; it grows.
      job.duration_days += carry;
      job.planned_end = addDays(job.planned_end, carry);
    } else {
      const fromStart = job.planned_start;
      job.planned_start = addDays(job.planned_start, carry);
      job.planned_end = addDays(job.planned_end, carry);
      movements.push({
        job_id: jobId,
        from_start: fromStart,
        to_start: job.planned_start,
        delta_days: carry,
        tier_at_time: deriveTier(fromStart, today),
      });
    }

    const absorbed = Math.min(carry, job.buffer_days);
    job.buffer_days -= absorbed;
    const remaining = carry - absorbed;
    if (remaining === 0) continue;

    for (const nextId of successors.get(jobId) ?? []) {
      pending.set(nextId, Math.max(pending.get(nextId) ?? 0, remaining));
    }
  }

  return { movements, jobs };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 48 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule/cascade.ts lib/schedule/__tests__/cascade.test.ts
git commit -m "feat(schedule): cascade traversal for delays across crew queues

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Pull-forward proposals

A cancellation must never silently move a client earlier — they may have arranged furniture, time off, or another trade. Freed capacity produces *offers*, not changes.

**Files:**
- Modify: `lib/schedule/cascade.ts` (append)
- Modify: `lib/schedule/__tests__/cascade.test.ts` (append)

**Interfaces:**
- Consumes: `addDays` from `lib/schedule/dates`; `ScheduledJob`, `PullForwardProposal` from `lib/schedule/types`
- Produces: `proposePullForward(input: PullForwardInput): PullForwardProposal[]` where
  `PullForwardInput = { freedJobId: string; freedDays: number; jobs: Map<string, ScheduledJob>; successors: Map<string, string[]> }`

- [ ] **Step 1: Write the failing test**

Append to `lib/schedule/__tests__/cascade.test.ts` — add `proposePullForward` to the existing import from `'../cascade'`, then add:

```typescript
describe('proposePullForward', () => {
  it('offers every downstream job an earlier start', () => {
    const jobs = jobMap(
      job('cancelled', '2026-09-21', 3, 1),
      job('j2', '2026-09-25', 2, 1),
      job('j3', '2026-09-29', 2, 1),
    );
    const successors = new Map([['cancelled', ['j2']], ['j2', ['j3']]]);
    const proposals = proposePullForward({
      freedJobId: 'cancelled', freedDays: 3, jobs, successors,
    });
    expect(proposals).toEqual([
      { job_id: 'j2', current_start: '2026-09-25', proposed_start: '2026-09-22', delta_days: -3 },
      { job_id: 'j3', current_start: '2026-09-29', proposed_start: '2026-09-26', delta_days: -3 },
    ]);
  });

  it('applies nothing — the job map is untouched', () => {
    const jobs = jobMap(job('cancelled', '2026-09-21', 3, 1), job('j2', '2026-09-25', 2, 1));
    const successors = new Map([['cancelled', ['j2']]]);
    proposePullForward({ freedJobId: 'cancelled', freedDays: 3, jobs, successors });
    expect(jobs.get('j2')!.planned_start).toBe('2026-09-25');
  });

  it('does not consume buffer — a pull-forward restores slack', () => {
    const jobs = jobMap(job('cancelled', '2026-09-21', 3, 1), job('j2', '2026-09-25', 2, 1));
    const successors = new Map([['cancelled', ['j2']]]);
    proposePullForward({ freedJobId: 'cancelled', freedDays: 3, jobs, successors });
    expect(jobs.get('j2')!.buffer_days).toBe(1);
  });

  it('reaches jobs in every coupled queue', () => {
    const jobs = jobMap(
      job('cancelled', '2026-09-21', 3, 1),
      job('j2', '2026-09-25', 2, 1),
      job('k9', '2026-09-26', 2, 1),
    );
    const successors = new Map([['cancelled', ['j2', 'k9']]]);
    const proposals = proposePullForward({
      freedJobId: 'cancelled', freedDays: 2, jobs, successors,
    });
    expect(proposals.map((p) => p.job_id).sort()).toEqual(['j2', 'k9']);
  });

  it('visits a converging job only once', () => {
    const jobs = jobMap(
      job('cancelled', '2026-09-21', 3, 1),
      job('j2', '2026-09-25', 2, 1),
      job('k9', '2026-09-26', 2, 1),
      job('shared', '2026-09-30', 2, 1),
    );
    const successors = new Map([
      ['cancelled', ['j2', 'k9']], ['j2', ['shared']], ['k9', ['shared']],
    ]);
    const proposals = proposePullForward({
      freedJobId: 'cancelled', freedDays: 2, jobs, successors,
    });
    expect(proposals.filter((p) => p.job_id === 'shared')).toHaveLength(1);
  });

  it('returns nothing when no jobs follow', () => {
    const jobs = jobMap(job('cancelled', '2026-09-21', 3, 1));
    const proposals = proposePullForward({
      freedJobId: 'cancelled', freedDays: 3, jobs, successors: new Map(),
    });
    expect(proposals).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test
```

Expected: FAIL — `proposePullForward is not a function` / no exported member.

- [ ] **Step 3: Append the implementation to `lib/schedule/cascade.ts`**

```typescript
export type PullForwardInput = {
  freedJobId: string;
  /** Positive magnitude of the freed days. */
  freedDays: number;
  jobs: Map<string, ScheduledJob>;
  successors: Map<string, string[]>;
};

/**
 * Compute earlier starts that freed capacity makes possible, WITHOUT
 * applying them.
 *
 * A job cannot be pulled earlier without the client's consent — they may
 * have arranged furniture, time off, a pet boarding, or another trade
 * working before you. Arriving early unannounced is not good news; it is a
 * different failure. So this returns offers the contractor makes by hand,
 * and neither the job map nor any buffer is touched.
 */
export function proposePullForward(input: PullForwardInput): PullForwardProposal[] {
  const { freedJobId, freedDays, jobs, successors } = input;
  if (freedDays <= 0) return [];

  const proposals: PullForwardProposal[] = [];
  const seen = new Set<string>([freedJobId]);
  let frontier = successors.get(freedJobId) ?? [];

  while (frontier.length > 0) {
    const next: string[] = [];
    for (const id of frontier) {
      if (seen.has(id)) continue;
      seen.add(id);
      const job = jobs.get(id);
      if (!job) continue;
      proposals.push({
        job_id: id,
        current_start: job.planned_start,
        proposed_start: addDays(job.planned_start, -freedDays),
        delta_days: -freedDays,
      });
      next.push(...(successors.get(id) ?? []));
    }
    frontier = next;
  }

  return proposals;
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npm test
```

Expected: PASS — 54 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/schedule/cascade.ts lib/schedule/__tests__/cascade.test.ts
git commit -m "feat(schedule): pull-forward proposals for freed capacity

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Event recording and cascade persistence

Wires the pure engine to the database. Records the event, runs the cascade, persists moved jobs and their movements.

**Files:**
- Modify: `lib/schedule/queries.ts` (append)

**Interfaces:**
- Consumes: `buildSuccessorMap`, `cascadeDelay`, `fetchScheduledJobs`, `fetchAssignments`
- Produces: `recordDelayEvent(input): Promise<{ eventId: string; movements: Movement[] }>` where
  `input = { eventType: ScheduleEventType; sourceJobId: string; carryDays: number; crewId?: string | null; note?: string | null }`

- [ ] **Step 1: Append to `lib/schedule/queries.ts`**

Extend the type import line and add the engine imports at the top of the file:

```typescript
import type {
  Crew, CrewDomain, ScheduledJob, JobCrewAssignment,
  Movement, ScheduleEventType,
} from './types';
import { buildSuccessorMap } from './queue-graph';
import { cascadeDelay } from './cascade';
```

Then append:

```typescript
/**
 * Record a disruption, run the cascade, and persist the result.
 *
 * Phases 1-3 stop here: movements are stored and shown to the contractor.
 * No client-facing notification is drafted or sent.
 */
export async function recordDelayEvent(input: {
  eventType: ScheduleEventType;
  sourceJobId: string;
  carryDays: number;
  crewId?: string | null;
  note?: string | null;
}): Promise<{ eventId: string; movements: Movement[] }> {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [jobList, assignments] = await Promise.all([
    fetchScheduledJobs(),
    fetchAssignments(),
  ]);

  const jobs = new Map(jobList.map((j) => [j.id, j]));
  const successors = buildSuccessorMap(assignments);

  const { movements, jobs: updated } = cascadeDelay({
    sourceJobId: input.sourceJobId,
    carryDays: input.carryDays,
    jobs,
    successors,
    today,
  });

  const { data: eventRow, error: eventError } = await supabase
    .from('schedule_events')
    .insert({
      event_type: input.eventType,
      crew_id: input.crewId ?? null,
      source_job_id: input.sourceJobId,
      delta_days: input.carryDays,
      occurred_on: today,
      note: input.note ?? null,
    })
    .select('id')
    .single();
  if (eventError) throw new Error(`recordDelayEvent failed: ${eventError.message}`);
  const eventId = eventRow.id as string;

  // Persist every job the cascade touched — the source (whose duration grew)
  // plus each mover.
  const touchedIds = new Set<string>([input.sourceJobId, ...movements.map((m) => m.job_id)]);
  for (const id of touchedIds) {
    const j = updated.get(id);
    if (!j) continue;
    const { error } = await supabase
      .from('scheduled_jobs')
      .update({
        planned_start: j.planned_start,
        planned_end: j.planned_end,
        duration_days: j.duration_days,
        buffer_days: j.buffer_days,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(`recordDelayEvent job update failed: ${error.message}`);
  }

  if (movements.length > 0) {
    const { error } = await supabase.from('schedule_movements').insert(
      movements.map((m) => ({
        event_id: eventId,
        job_id: m.job_id,
        from_start: m.from_start,
        to_start: m.to_start,
        delta_days: m.delta_days,
        tier_at_time: m.tier_at_time,
        // Tier filtering arrives in Phase 4; until then nothing is notifiable.
        notify_decision: 'below_threshold',
      })),
    );
    if (error) throw new Error(`recordDelayEvent movement insert failed: ${error.message}`);
  }

  return { eventId, movements };
}

export async function fetchMovementsForEvent(eventId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_movements')
    .select('id, job_id, from_start, to_start, delta_days, tier_at_time, notify_decision')
    .eq('event_id', eventId)
    .order('to_start');
  if (error) throw new Error(`fetchMovementsForEvent failed: ${error.message}`);
  return data ?? [];
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the whole suite still passes**

```bash
npm test
```

Expected: PASS — 54 tests.

- [ ] **Step 4: Commit**

```bash
git add lib/schedule/queries.ts
git commit -m "feat(schedule): record disruption events and persist cascade results

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: Admin disruption entry + movement display

Closes Phase 3: the contractor can record a delay and see exactly who moved — with no client output, so the arithmetic can be wrong privately.

**Files:**
- Modify: `app/admin/schedule/page.tsx` (append a disruption section)

**Interfaces:**
- Consumes: `recordDelayEvent` from `lib/schedule/queries`; `SCHEDULE_EVENT_TYPES`, `Movement` from `lib/schedule/types`
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Extend the page**

Add to the imports:

```tsx
import { recordDelayEvent } from "@/lib/schedule/queries";
import { SCHEDULE_EVENT_TYPES, type ScheduleEventType, type Movement } from "@/lib/schedule/types";
```

Add state:

```tsx
  const [eventType, setEventType] = useState<ScheduleEventType>("rain_day");
  const [sourceJobId, setSourceJobId] = useState("");
  const [carryDays, setCarryDays] = useState(1);
  const [note, setNote] = useState("");
  const [lastMovements, setLastMovements] = useState<Movement[] | null>(null);
```

Add the handler:

```tsx
  async function handleRecordEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceJobId) return;
    try {
      const { movements } = await recordDelayEvent({
        eventType,
        sourceJobId,
        carryDays,
        note: note || null,
      });
      setLastMovements(movements);
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
```

Add this section before the closing `</div>`:

```tsx
      <h2 className="text-xl font-bold mt-12 mb-4">Record a disruption</h2>
      <form onSubmit={handleRecordEvent} className="grid gap-3 sm:grid-cols-5 items-end mb-6">
        <label className="flex flex-col text-sm">
          Type
          <select
            className="border rounded px-2 py-1"
            value={eventType}
            onChange={(e) => setEventType(e.target.value as ScheduleEventType)}
          >
            {SCHEDULE_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm sm:col-span-2">
          Job
          <select
            className="border rounded px-2 py-1"
            value={sourceJobId}
            onChange={(e) => setSourceJobId(e.target.value)}
            required
          >
            <option value="">Select a job…</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.planned_start} — {j.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          Delay (days)
          <input
            type="number"
            min={1}
            className="border rounded px-2 py-1"
            value={carryDays}
            onChange={(e) => setCarryDays(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="border rounded px-3 py-1 bg-black text-white">
          Run cascade
        </button>
        <label className="flex flex-col text-sm sm:col-span-5">
          Note
          <input
            className="border rounded px-2 py-1"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Rained out — siding still wet"
          />
        </label>
      </form>

      {lastMovements && (
        <div className="mb-8">
          <h3 className="font-semibold mb-2">
            Cascade result — {lastMovements.length} job(s) moved
          </h3>
          {lastMovements.length === 0 ? (
            <p className="text-sm text-gray-600">
              Absorbed by buffer. Nobody downstream moved.
            </p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2">Job</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Δ days</th>
                  <th>Tier at time</th>
                </tr>
              </thead>
              <tbody>
                {lastMovements.map((m) => (
                  <tr key={m.job_id} className="border-b">
                    <td className="py-2">{m.job_id.slice(0, 8)}</td>
                    <td>{m.from_start}</td>
                    <td>{m.to_start}</td>
                    <td>+{m.delta_days}</td>
                    <td>{m.tier_at_time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-xs text-gray-500 mt-2">
            Phase 3: movements are recorded and shown here only. No client is notified.
          </p>
        </div>
      )}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify the buffer-absorption path in the browser**

With the two test jobs from Task 7 (each `buffer_days = 1`), record a `rain_day` of **1 day** against the first job.

Expected: "Absorbed by buffer. Nobody downstream moved." The Queues table should now show the first job's buffer as **0, in red**, and its duration incremented by 1.

- [ ] **Step 4: Verify the propagation path in the browser**

Record a second `rain_day` of **2 days** against the same first job — its buffer is now exhausted.

Expected: the second job moves +2, listed with its tier. Re-check the Queues table: the second job's `planned_start` has advanced by 2 days and its own buffer has dropped to 0.

- [ ] **Step 5: Verify persistence**

In the Supabase SQL editor:

```sql
SELECT e.event_type, e.delta_days, m.from_start, m.to_start, m.delta_days AS moved, m.tier_at_time
FROM schedule_events e
LEFT JOIN schedule_movements m ON m.event_id = e.id
ORDER BY e.created_at;
```

Expected: two event rows. The first has no movement row (absorbed); the second has one movement row with `moved = 2`.

- [ ] **Step 6: Commit**

```bash
git add app/admin/schedule/page.tsx
git commit -m "feat(schedule): admin disruption entry and movement display

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## What Phases 1–3 Deliberately Do Not Do

Stated so a reviewer does not read these as gaps:

- **No client-facing output.** No tier filter, no debounce, no drafts, no approval queue, no email. That is Phase 4+. Movements are persisted with `notify_decision = 'below_threshold'` as a placeholder value.
- **No automatic duration derivation from accepted scope.** `deriveDurationDays` exists and is tested, but wiring it to the proposal bundle's `estimatedHours` needs the PaintScope↔Supabase sync contract, which the spec lists as an open question. Durations are entered manually for now.
- **No cancellation UI.** `proposePullForward` is built and tested; the admin flow for offering earlier slots is Phase 4 work.
- **No weather domain scoping in the UI.** `crews.domains` is stored and displayed; filtering rain events to exterior crews happens when disruption entry gets crew-aware in Phase 4.
- **No `crew_availability` usage.** The table exists so the schema is stable; honoring holidays and PTO in date arithmetic is later work.

---

## Plan Self-Review

**Spec coverage.** §3.1 crew queues → Tasks 3, 7. §3.2 buffer → Task 8. §3.3 travel → Tasks 2, 5. §3.4 tiers → Task 6. §4 data model → Task 2 (all six tables, including the `starts_on_day`/`ends_on_day` columns resolving open question 3). §5 duration → Task 5. §6 cascade → Task 8. §6.1 pull-forwards → Task 9. §6.3 cascade triggers → Task 10 (`duration_revised` is in the event enum; the tracker deliberately does not drive it). §12 build sequence phases 1–3 → this plan in full. §7–§11 (notifications, digest, channels, portal) → Phase 4+, out of scope, listed above.

**Type consistency.** `Crew`, `ScheduledJob`, `JobCrewAssignment`, `Movement`, `PullForwardProposal`, `CommitmentTier`, `ScheduleEventType` are defined once in Task 3 and imported unchanged thereafter. `buildSuccessorMap` returns `Map<string, string[]>`, which is exactly the `successors` parameter type in both `CascadeInput` and `PullForwardInput`. `deriveTier(plannedStart, today)` has the same signature at its definition (Task 6) and both call sites (Tasks 7, 8).

**Known ordering constraint.** Task 5's tests import `Crew` from `../types`, so Task 3 must land before Task 5. Task 8 imports `deriveTier`, so Task 6 must land before Task 8. Otherwise tasks are order-independent within their phase.
