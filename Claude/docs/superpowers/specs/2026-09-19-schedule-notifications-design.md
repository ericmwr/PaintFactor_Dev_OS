# Schedule & Client Notifications — Design

> Stage 6 of the PaintFactor data flow. Gives projects real dates, propagates
> disruption through the crew queues, and tells affected clients — without
> training them to ignore the messages.
>
> Companion: `docs/System/PaintFactor_System_Data_Flow.md` §7
>
> Created: 2026-09-19

---

## 1. Problem

Painting schedules are perturbed constantly — rain, change orders, cancellations,
material delays, a crew member out sick. Today the client learns about a slip when
someone remembers to call, which means late notice, uneven coverage, and the
clients least likely to complain being the ones least likely to be told.

The naive fix — "notify everyone when anything changes" — fails in the other
direction. A rainy week produces a stream of messages to people who have not
started, and within a month clients stop reading them. At that point the system is
worse than the phone call, because it looks like communication while functioning
as noise.

This design treats disruption as a **cascade through crew queues** and treats
notification as a **filtered output** of that cascade.

---

## 2. Current State

**Exists and is usable:**

- `projects` — has `client_id`, `status` enum, `paintfactor_project_id` join key
- `proposal_bundles` / `proposal_submissions` — the schema pattern to follow:
  jsonb payload, status CHECK constraint, RLS scoped through `projects.client_id`
- Tracker snapshot — `estimated_hours` per activity, the duration input
- `company_profile.business_rules` — `travel_time_min: 30`, `mobilization_charge: 150`
- Cal.com embed on the public booking page — **consultation only**, unrelated to
  project scheduling and not extended by this work

**Does not exist:**

- Any date field on a project
- An employee roster or crew identity
- A capacity or availability model
- Notification tables
- **Any send infrastructure** — no Resend, Twilio, or nodemailer in the tree

### 2.1 A naming hazard

`company_profile.crew_configs` already exists and looks like a crew model. It is
not one. It is a **costing abstraction** — "Standard 2-Man" means 1 lead + 1
painter blended to $30.00/hr, used by the estimator. It carries no identity, no
availability, and no constraint that a person can be in one place at a time.

Scheduling needs a genuinely different entity. This spec introduces `crews` as a
scheduling primitive and leaves `crew_configs` untouched in its costing role. Any
implementation that tries to serve both purposes from one record will eventually
book the same painter onto three jobs at once.

---

## 3. Core Concepts

### 3.1 Crew queues and their coupling points

Each crew holds an ordered queue of jobs. Most jobs belong to exactly one queue,
and for those, cascade is local: a delay in Crew A's queue slides Crew A's
remaining jobs and never touches Crew B.

**Large projects break that locality.** A job worked by two crews simultaneously
sits in both queues at once, which makes it a **coupling point**. When a delay
pushes a shared job in Crew A's queue, that same job moves in Crew B's queue too,
and Crew B's downstream jobs cascade from it.

So the schedule is not N independent lists — it is a directed graph where crew
queues are the edges and shared jobs are the joins. The cascade (§6) is a
traversal over that graph rather than a walk down a single list. In practice the
graph is shallow and sparse: most jobs have one crew, coupling is rare, and the
traversal usually degenerates into the simple linear walk.

Moving a job between crews, or adding a crew to a job mid-schedule, is a **manual**
action. The scheduler will not reassign work to optimize utilization — see §6.1
and §11.

### 3.2 Buffer as absorbing capacity

Each job carries `buffer_days` (default 1) appended to its end. The next job in
that crew's queue starts after the prior job's end plus its buffer.

The buffer is not cosmetic padding. It is the mechanism that **stops small delays
from propagating at all**. A one-day rain delay consumes the buffer and downstream
jobs do not move — no movement set, no notifications, nothing. Most disruption in
this business is one day, so most disruption should be invisible to clients.

Buffer is **consumed, not restored**. Once a delay eats the cushion ahead of a
job, that job proceeds with zero slack until the schedule is manually rebuilt.
The scheduler surfaces this: a queue running with exhausted buffers is fragile
and the contractor should see that before the next disruption lands.

A shared job (§3.1) holds **one** buffer, absorbed once, with the remainder
propagating into every queue it participates in. Both crews are freed at the same
later time, so the cushion cannot be spent twice.

### 3.3 Travel consumes the working day

Travel time is **billable and it comes out of the day**. A crew paid for 7 hours
that spends an hour driving to and from the site produces 6 hours of work. Any
capacity model that ignores this overstates throughput on every job.

So `crews.daily_hours` records **paid** hours, and capacity nets travel out:

```
effective_daily_hours = crew.daily_hours − job.travel_hours_per_day
```

For a 2-person crew at 7.0 paid hours on a site with 1.0 hour of round-trip
travel, capacity is `2 × 6.0 = 12.0` hr/day, not 14.0 — a 14% difference that
compounds through every duration and every downstream date.

**What is in scope here:** the field. `scheduled_jobs.travel_hours_per_day` is set
manually, defaulting to `business_rules.travel_time_min × 2` (30 min each way → 1.0
hour), and the capacity math consumes it correctly from day one.

**What is deferred:** the distance system that would populate it automatically —
site geocoding, distance from the shop, site-to-site legs when short jobs stack in
one day, and route ordering within a crew's week. That is a real subsystem and it
is back-burnered (§13), but the slot it fills exists now, so its arrival is a data
improvement rather than a schema migration.

**A reconciliation to flag:** `business_rules.travel_time_min` (a pricing input,
feeding billable hours and the mobilization charge) and
`scheduled_jobs.travel_hours_per_day` (a scheduling input, consuming capacity)
describe the same physical fact from two directions and will drift apart. When the
distance system lands it should feed both, and the duplication should collapse.
Until then they are maintained separately and can disagree.

### 3.4 Commitment tier is derived

Tier is computed from days-until-start, never stored:

| Tier | Days to start | What was promised | Notify threshold |
|------|---------------|-------------------|------------------|
| **Confirmed** | ≤ 7 | An exact date | Movement ≥ 1 day |
| **Scheduled** | 8–28 | A week | The ISO week changes |
| **Queued** | > 28 | A month | Digest only, or ≥ 5 days |

Deriving it means a project auto-promotes Queued → Scheduled → Confirmed as its
date approaches, with no maintenance and no stale tiers. It also encodes something
true: a date six weeks out is an estimate, and treating it as a promise is what
makes the eventual correction feel like a broken commitment.

---

## 4. Data Model

New tables. Follows the `proposal_bundles` conventions — uuid PKs, `timestamptz`
defaults, CHECK-constrained status text, RLS through `projects.client_id`.

### 4.1 `crews`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | "Crew A", "Exterior Crew" |
| `headcount` | int | Bodies available, for capacity math |
| `daily_hours` | numeric | **Paid** hours per person per day (default 7.0) |
| `domains` | text[] | `{interior}`, `{exterior}`, or both — gates weather sensitivity |
| `active` | boolean | Seasonal crews deactivate rather than delete |
| `created_at` | timestamptz | |

Capacity is `headcount × (daily_hours − job.travel_hours_per_day)` — see §3.3.

### 4.2 `crew_availability`

Exceptions only — the default is "available on weekdays."

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `crew_id` | uuid FK | |
| `date` | date | |
| `available` | boolean | false = holiday, PTO, planned downtime |
| `reason` | text | |

Seasonal crew-count changes are expressed as `crews.active` plus availability
rows, not a separate calendar model.

### 4.3 `scheduled_jobs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK → projects | |
| `planned_start` | date | |
| `planned_end` | date | Derived; stored for query simplicity |
| `duration_days` | int | Derived (§5), overridable |
| `buffer_days` | int | Default 1 |
| `travel_hours_per_day` | numeric | Round trip; default from `travel_time_min × 2` |
| `status` | text CHECK | `queued` / `committed` / `in_progress` / `complete` / `cancelled` |
| `original_start` | date | First committed date — for "how far has this drifted" |
| `created_at`, `updated_at` | timestamptz | |

**No `crew_id` column.** Crew assignment lives in the join table below, because a
job may be worked by more than one crew.

`commitment_tier` is also **not** a column — it is derived from
`planned_start - current_date` at read time.

### 4.4 `job_crew_assignments`

The join that makes multi-crew jobs possible, and the carrier of per-crew queue
order.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `job_id` | uuid FK → scheduled_jobs | |
| `crew_id` | uuid FK → crews | |
| `queue_position` | int | Order **within that crew's** queue |
| `hours_allocated` | numeric nullable | Split of estimated hours; null = proportional to capacity |
| `created_at` | timestamptz | |

Unique on `(job_id, crew_id)` and on `(crew_id, queue_position)`.

`hours_allocated` exists for the case where a split is uneven — one crew doing
interior while another does exterior on the same property, with different hour
totals. Left null, hours divide in proportion to each crew's effective capacity.

### 4.5 `schedule_events`

The disruption log. Append-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `event_type` | text CHECK | `rain_day` / `change_order` / `duration_revised` / `cancellation` / `material_delay` / `crew_unavailable` / `manual_adjustment` |
| `crew_id` | uuid FK nullable | Which queue originates the disruption; null for job-level events |
| `source_job_id` | uuid FK nullable | The job where the disruption originated |
| `delta_hours` | numeric nullable | For change orders and duration revisions |
| `delta_days` | numeric nullable | For weather, delays |
| `occurred_on` | date | |
| `note` | text | Contractor's own words; may be quoted into drafts |
| `created_by` | uuid FK → profiles | |
| `created_at` | timestamptz | |

### 4.6 `schedule_movements`

The cascade output. One row per job whose date changed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `event_id` | uuid FK → schedule_events | |
| `job_id` | uuid FK → scheduled_jobs | |
| `from_start`, `to_start` | date | |
| `delta_days` | int | Signed — negative means pulled earlier (only after acceptance, §6.2) |
| `tier_at_time` | text | Snapshot of derived tier when the cascade ran |
| `notify_decision` | text CHECK | `notify` / `below_threshold` / `digest` / `suppressed_noop` |
| `created_at` | timestamptz | |

Retaining below-threshold movements matters: it is the audit trail for "why wasn't
I told," and it feeds the digest.

### 4.7 `notifications`

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `project_id` | uuid FK | |
| `movement_id` | uuid FK nullable | Null for digests |
| `kind` | text CHECK | `movement` / `digest` |
| `channel` | text CHECK | `email` / `sms` / `portal` |
| `draft_body` | text | Pre-composed, contractor-editable |
| `status` | text CHECK | `draft` / `approved` / `sent` / `dropped` / `failed` |
| `approved_by` | uuid FK nullable | |
| `sent_at`, `created_at` | timestamptz | |

### 4.8 `notification_preferences`

Per client: preferred channel, SMS opt-in, digest opt-out. Defaults to email +
portal, digest on.

---

## 5. Duration Derivation

```
effective_capacity = Σ over assigned crews of
                       crew.headcount × (crew.daily_hours − job.travel_hours_per_day)

raw_days           = estimated_hours ÷ effective_capacity
duration_days      = max(ceil(raw_days), sequencing_floor_days)
```

`estimated_hours` comes from the accepted scope — the same snapshot the tracker
measures against, so schedule and variance share one source.

Travel subtracts per crew, because each crew assigned to a site makes that trip.
Two crews on one property both lose the drive.

**The sequencing floor exists because painting does not fully parallelize.** Two
coats with dry time between them cannot compress below two days regardless of how
many people are on site. A four-hour job still occupies a day. The floor is
derived from the scope's coat structure: a project requiring N sequential coat
passes has `sequencing_floor_days ≥ N`.

This matters more with multi-crew jobs, not less. Adding a second crew halves
`raw_days` but does nothing to the floor — throwing bodies at a three-coat job
does not make the paint dry faster. The floor is what stops the scheduler from
promising a two-day turnaround that physics will not honor.

This is a deliberately crude stand-in for real sequencing logic. The Sequencing
Engine concept (parked, see `devos/sequencing_engine_concept.md`) would replace it
with something that actually models dry times, cure windows, and trade order.

Duration is stored and **overridable**. The contractor's judgment about a specific
property beats the arithmetic, and the override survives recalculation.

### 5.1 Worked figure

The three-room repaint from the data-flow doc: 37.9 estimated hours, one 2-person
crew, 7.0 paid hours each, 1.0 hour round-trip travel.

```
effective_capacity = 2 × (7.0 − 1.0)  = 12.0 hr/day
raw_days           = 37.9 ÷ 12.0      = 3.16
duration_days      = ceil(3.16) = 4    (sequencing floor of 2 not binding)
```

Ignoring travel would have given `37.9 ÷ 14.0 = 2.7 → 3 days` — a full day short,
on a four-day job.

---

## 6. The Cascade Algorithm

Runs when a `schedule_events` row is inserted (§6.3 covers exactly when that
happens). Traverses the queue graph described in §3.1.

```
cascade(event):
  # pending[job] = the largest unapplied delay reaching that job
  pending   = { event.source_job: event.delta_days }
  movements = []

  while pending is not empty:
      job   = the pending job with the earliest planned_start   # topological order
      carry = pending.pop(job)
      if carry <= 0: continue

      if job is event.source_job:
          job.duration_days += carry          # the job itself grew
      else:
          old_start = job.planned_start
          job.planned_start += carry
          job.planned_end   += carry
          movements.append(movement(job, old_start, job.planned_start, carry))

      # the job's single buffer absorbs what it can, once
      absorbed        = min(carry, job.buffer_days)
      job.buffer_days -= absorbed
      remaining       = carry - absorbed
      if remaining == 0: continue

      # propagate into EVERY crew queue this job participates in
      for crew in crews_assigned_to(job):
          next_job = successor(job, crew)
          if next_job:
              pending[next_job] = max(pending.get(next_job, 0), remaining)

  return movements
```

Four properties worth noting:

- **Earliest-start processing order is what makes this correct.** A job is only
  processed once everything that could push it has already been processed, so a
  job reached from two crews is moved once, by the larger of the two delays — not
  twice, additively.
- **Buffer absorption is per-gap and cumulative.** A 3-day delay against three
  downstream jobs each holding a 1-day buffer dissipates by the third gap: the
  first job moves 3 days, the second 2, the third 1, the fourth not at all.
- **Coupling is where crews infect each other.** A single-crew chain never touches
  another queue. A shared job propagates into both, which is the only path by
  which Crew B's clients are affected by Crew A's rain.
- **Order within each queue is preserved absolutely.** Rigid slide. No reordering,
  no backfill, no automatic cross-crew reassignment.

### 6.1 Delays apply; pull-forwards only propose

The algorithm above handles **positive carry** — delays. Negative carry, where a
cancellation frees capacity, must not run through the same path, because
**a job cannot be pulled earlier without the client's consent.** They may have
arranged furniture, time off, a pet boarding, another trade working before you.
Arriving four days early unannounced is not good news; it is a different failure.

So negative carry runs in **proposal mode**:

```
cascade_pull_forward(event):
  queue     = jobs behind the freed slot, in order
  carry     = |event delta|
  proposals = []

  for job in queue:
      if carry == 0: break
      earlier = job.planned_start - carry
      proposals.append(proposal(job, job.planned_start, earlier, -carry))
      # buffer is NOT consumed — a pull-forward restores slack rather than
      # spending it, and nothing is applied until the client agrees

  return proposals          # nothing written to scheduled_jobs yet
```

Proposals surface in the admin screen as an opportunity, not a change. The
contractor offers the earlier date to the client; on acceptance the move applies
and the cascade re-runs for whatever remains. On decline, the gap stays open and
the crew's schedule keeps its hole — which the contractor may fill manually, or
simply absorb.

This asymmetry is the correct business logic and it falls out of one asymmetry in
the world: a delay is something you inform a client of, an early start is
something you ask them about.

### 6.2 Weather is domain-scoped

A `rain_day` event only applies to a crew whose `domains` include `exterior`. An
interior crew's queue is untouched by weather. This is why `crews.domains` exists
rather than treating all crews as fungible.

A multi-crew job spanning both domains is the interesting edge: rain stops the
exterior crew while the interior crew keeps working. The job's duration extends,
but only the exterior crew's downstream queue inherits the delay.

### 6.3 When the cascade fires

Not continuously. Three triggers, all discrete:

1. **A disruption event is recorded** — rain day, cancellation, material delay,
   crew unavailability. Contractor-entered.
2. **A change order is accepted**, adding hours to a job (§5 recomputes duration).
3. **The contractor declares a revised end date** on an in-progress job —
   a `duration_revised` event.

**The tracker does not drive the cascade.** A job reporting 60% complete on day
three of four is not automatically a delay — crews front-load, back-load, and
report unevenly, and a scheduler reacting to every progress ping would churn
dates and notifications on noise. The tracker *surfaces* projected overrun to the
contractor, who decides whether it is real and declares a new end date. Judgment
stays with the person who can see the job.

---

## 7. Movement Set → Notifications

Four stages between the cascade and a client's inbox.

### 7.1 Tier filter

Each movement is tested against its job's derived tier threshold (§3.4):

- **Confirmed**, |delta| ≥ 1 day → `notify`
- **Scheduled**, ISO week of `to_start` ≠ ISO week of `from_start` → `notify`
- **Queued**, |delta| ≥ 5 days → `notify`, else → `digest`
- Anything else → `below_threshold`

Every movement is recorded regardless of decision. The filter decides who is
*told*, not what is *known*.

### 7.2 Debounce and no-op suppression

Before drafting, movements coalesce **per project, per business day**:

- Multiple movements for one project on one day collapse to a **single net
  movement** from the earliest `from_start` to the latest `to_start`.
- If the net delta is zero — a project pushed two days by rain and pulled two days
  back by a cancellation — it is marked `suppressed_noop` and generates nothing.

Without this, a busy morning produces three messages to the same client describing
a date that moved twice and landed where it started. Multi-crew coupling makes
this more likely, not less: a shared job can be reached from two queues in one
cascade, and the client should hear about the outcome, not the mechanism.

### 7.3 Draft composition

Each surviving movement becomes a `notifications` row with a pre-written body:
what changed, the new date, the reason in plain language, and any action needed
from the client. The contractor's `schedule_events.note` is available to quote.

Drafts are text, not templates rendered at send time — so what the contractor
approves is exactly what the client receives.

### 7.4 Batch approval

Drafts land in an admin review screen, grouped by event. The contractor can
**approve all**, edit any individually, or drop. Nothing sends unreviewed.

**The tier filter running before this queue is what makes per-message approval
survivable.** On a rain day you approve the two Confirmed clients, not all eleven
on the books. Per-message approval without tiering becomes a daily chore and gets
abandoned by week three — at which point the notifications stop, silently, and
nobody notices until a client does.

The screen surfaces one non-obvious thing: jobs whose buffer is now exhausted
(§3.2), so the contractor sees the schedule's fragility at the moment they are
already looking at it.

---

## 8. Weekly Digest

**Monday, start of business.** One message per client with an active project,
covering: current status, projected start window (phrased to the commitment tier —
an exact date for Confirmed, "the week of" for Scheduled, a month for Queued), any
sub-threshold movement since the last digest, and anything awaiting their decision
— an unapproved color change, an unanswered question.

Monday rather than Friday because the digest is about the week ahead. A Friday
summary reports a week that has already happened, arrives as someone is leaving
for the weekend, and gives a client no useful window to act in. Monday morning
reaches them while the week is still shapeable, which is when "your start moved to
Thursday" is something they can actually do something about.

One approval covers the whole digest batch.

The digest is the reason sub-threshold movements are retained rather than
discarded. A client who drifted a day per week for four weeks has moved almost a
week, and the digest is where that becomes visible without four separate alarms.

---

## 9. Channels & Delivery

**Portal** is the always-on channel: every notification appears in the client's
portal timeline whether or not it is emailed. The portal is the record.

**Email** is the default push channel. No provider is currently installed — Resend
is the natural fit alongside Next.js on Netlify, and the send path should sit
behind a thin adapter so the provider is swappable.

**SMS** is opt-in and restricted to Confirmed-tier movement. Texting someone about
a date three weeks out is how you get opted out of.

Failed sends set `status = failed` and surface in the admin screen. A notification
that silently fails to deliver is worse than one never drafted, because the
contractor believes the client was told.

---

## 10. Portal Surface

The existing placeholder at `app/(portal)/portal/schedule/page.tsx` becomes:

- **Projected start**, phrased to the commitment tier — never a false-precision
  date on a job six weeks out
- **Phase timeline** across the job's duration
- **Change history** — every movement the client was notified about, with reasons,
  so the record is theirs and not just the contractor's
- **Notification preferences** — channel and digest control

Showing change history is a deliberate transparency choice. A client who can see
that their date moved twice for stated reasons trusts the third notice more than
one who receives updates with no context.

---

## 11. Worked Scenarios

**Rain day, exterior crew.** Tuesday washes out. Event: `rain_day`, +1 day, Crew B
(`domains = {exterior}`). Cascade walks Crew B's queue; the buffer after the
in-progress job absorbs the full day. **Zero movements, zero notifications.** Crew
A (interior) is untouched — no domain match. The only visible effect is that Crew
B's next gap now has no cushion, flagged in the admin view.

**Change order mid-job.** The in-progress job takes a color change adding 14 hours
— at 12.0 hr/day effective capacity, +2 days. The buffer behind it was already
consumed by last week's rain, so the full 2 days reach the next job, which moves
+2 and is Confirmed → notified. That job's own 1-day buffer absorbs one day,
leaving 1 day to reach the third job, which moves +1 — Scheduled tier, and the
move keeps it inside the same ISO week, so `below_threshold` and no message. The
fourth job's buffer eats the remainder. **One notification drafted, approved,
sent; two movements recorded silently.**

**Multi-crew job, coupled queues.** A large repaint runs with Crew A and Crew B
simultaneously. Crew A's *previous* job runs two days long. The cascade pushes the
shared job +2; because it sits in both queues, the remainder propagates into Crew
B's downstream jobs as well as Crew A's — so a client who has never been served by
Crew A gets moved by Crew A's overrun. This is the one path by which queues infect
each other, and it is why the client-facing message says "the project ahead of
yours ran long" without naming a crew: the crew is an implementation detail the
client has no model for.

**Cancellation.** A client cancels a 3-day job, opening a hole in Crew A's queue.
Event: `cancellation`, −3 days → **proposal mode** (§6.1). The three jobs behind it
each get a proposed earlier start, surfaced to the contractor as an opportunity.
Nothing is written and no client is notified automatically — the contractor offers
the earlier slot to the next client, who may accept (the move applies, the cascade
re-runs for the rest) or decline (the hole stays, and the contractor fills it,
moves a crew, or takes the day). This is the one place the system deliberately
stops and asks a human, because it is the one place where acting unilaterally
would create a problem rather than solve one.

**Crew swap (manual).** Rain kills exterior work Thursday. Rather than idle Crew B,
the contractor manually reassigns them to an interior job currently in Crew A's
queue — which may mean adding Crew B to that job rather than moving it, turning it
into a multi-crew job and shortening its duration. This is a `manual_adjustment`
event and re-runs the cascade on both queues: the interior job's duration shrinks
and its downstream neighbors get pull-forward *proposals*, while Crew B's exterior
queue slides normally.

No automatic scheduler would have found this move, because it trades utilization
against a client's convenience — a judgment call, not an optimization. Keeping the
human here is the point rather than a limitation.

---

## 12. Build Sequence

Each phase is independently useful; none requires the next to ship.

1. **Schema + crews.** Tables, RLS, crew CRUD, the `job_crew_assignments` join.
   No cascade yet — manual date entry only. Immediately replaces the placeholder
   schedule page.
2. **Duration derivation + queue view.** Pull `estimated_hours` from accepted
   scope, apply the travel allowance and sequencing floor, compute durations,
   render per-crew queues with buffers visible.
3. **Cascade engine.** Events, the traversal, movement sets. Movements are
   *displayed* to the contractor only — no client-facing output.
4. **Notification pipeline.** Tier filter, debounce, drafts, batch approval,
   portal-channel delivery only.
5. **Email delivery.** Provider adapter, send path, failure surfacing.
6. **Digest + preferences.** Monday batch, client-side controls.
7. **SMS.** Opt-in, Confirmed tier only.

Later, on its own track: **the distance system** (§13) — geocoding, shop-to-site
and site-to-site legs, route ordering. It populates `travel_hours_per_day`
automatically and should then also reconcile with the pricing-side travel input
(§3.3).

Phase 3 shipping without phase 4 is deliberate. The cascade will be wrong in ways
that are only discoverable against a real schedule — the multi-crew traversal
especially — and it should be wrong privately.

---

## 13. Out of Scope

- **The distance / routing system.** Geocoding, shop-to-site distance, site-to-site
  legs, route ordering within a crew's week. Back-burnered but vital: it is what
  turns `travel_hours_per_day` from a manual estimate into a real number, and it is
  a precondition for stacking multiple short jobs in one day. The field it fills
  exists now (§3.3) so its arrival needs no migration.
- **Automatic cross-crew optimization.** Rigid slide only; reassignment is manual.
- **Real sequencing logic.** The `sequencing_floor_days` stand-in holds until the
  Sequencing Engine is scoped.
- **Weather forecast integration.** Rain days are entered by the contractor, who
  decides at 6am. Forecast-driven *advance warning* is an appealing follow-on and
  explicitly not in this design.
- **Tracker-driven rescheduling.** Progress reporting informs the contractor; it
  does not move dates (§6.3).
- **Client-initiated rescheduling.** Clients see dates and may accept pull-forward
  offers; they do not move dates themselves.
- **Cal.com integration.** Consultation booking stays separate from project
  scheduling.
- **Crew-member-level assignment.** Crews are the scheduling unit. Which specific
  painter works which day is a tracker concern.

---

## 14. Open Questions

1. **Partial-day stacking.** Two short jobs in one day is only safe once
   site-to-site travel is real, so it waits on the distance system. Until then a
   job occupies at least a day. Worth confirming that is acceptable rather than
   costly — if short jobs are common, the distance system moves up the queue.
2. **Travel per crew, not per job.** `travel_hours_per_day` sits on the job,
   assuming one origin. If crews ever dispatch from different places — a lead
   taking a van home — travel becomes a property of the (job, crew) pair and
   belongs on `job_crew_assignments`. Cheap to move before phase 1.
3. **Uneven multi-crew splits.** `hours_allocated` defaults to proportional-to-
   capacity, which assumes both crews work the whole span. A crew joining for only
   the last two days of a job is not expressible. May need start/end offsets on the
   assignment rather than a flat hour split.
4. **Digest and mid-week disruption.** Monday's digest reports the week ahead; a
   Wednesday rain day still fires immediate notifications for Confirmed clients.
   Worth checking after phase 6 whether Queued clients want a second touch or
   whether one weekly message is right.
5. **Notification authorship.** Drafts are system-composed and contractor-editable
   (accepted as designed). A review after phase 4 decides whether templates need
   restructuring or whether drafts should start from contractor-authored snippets.

---

## 15. Decisions Recorded

Resolved during design, kept here so the reasoning is not relitigated.

| Decision | Choice | Why |
|----------|--------|-----|
| Crew count | 2–3 concurrent | Matches the business; makes queues a graph, not a list |
| Multi-crew jobs | Supported | Large projects run two crews; forces the join table in §4.4 |
| Slack policy | 1 buffer day between jobs | Absorbs most disruption before it cascades or notifies |
| Cascade style | Rigid slide, order preserved | Predictable and explainable to a client |
| Pull-forwards | Propose, never apply | Cannot move a client earlier without consent |
| Travel | Field now, distance system later | Capacity math correct from day one, no migration later |
| Duration drift | Contractor declares | Tracker progress is noisy; judgment stays with the person on site |
| Digest timing | Monday, start of business | The week ahead is actionable; the week behind is not |
| Notification approval | Contractor approves each, batched | Tier filter keeps the queue small enough to sustain |
