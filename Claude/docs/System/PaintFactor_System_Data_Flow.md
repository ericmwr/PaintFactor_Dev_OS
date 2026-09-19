# PaintFactor — System Data Flow (Target State)

> How a project moves through PaintFactor from first contact to rate calibration:
> what is captured at each stage, what is computed from it, and what is handed forward.
>
> **Status:** Target-state architecture. This describes the system as designed, not
> as currently built. Much of stages 6–8 is unimplemented. For the doctrine behind
> it, see `PaintFactor_OS.md`; for module-level vision, `devos/PaintFactor_Platform_Plan.md`.
>
> Created: 2026-09-19

---

## 1. The Spine

PaintFactor is not a pipeline — it is a loop. Eight stages, and the last one feeds
the third.

```
  ┌─────────────────────────────────────────────────────────────────┐
  │                                                                 │
  │   1. Lead Intake ──► 2. Scope Capture ──► 3. Bid                 │
  │      (website)          (PaintScope)        (engine)            │
  │                                               │                 │
  │                                               ▼                 │
  │   6. Schedule ◄──── 5. Colors & Catalog ◄── 4. Portal           │
  │      & Comms            (lock gates            (proposal,       │
  │       │                  purchasing)            QT, approval)   │
  │       ▼                                                         │
  │   7. Tracker ──────► 8. Analytics                               │
  │      (actuals)          (variance, margin)                      │
  │                              │                                  │
  └──────────────────────────────┘
         rate calibration returns to stage 3
```

Each stage owns a boundary. Nothing downstream recomputes what an upstream stage
already decided — it reads the handoff and adds its own layer. That constraint is
what makes the estimate auditable: every number traces to the stage that produced it.

| # | Stage | Captures | Computes | Hands forward |
|---|-------|----------|----------|---------------|
| 1 | Lead Intake | Contact, address, project type, self-reported scope, photos | Qualification, routing | Project shell + `profiles`/`projects` row |
| 2 | Scope Capture | Geometry, substrate/state/condition, openings, protection | Quantities (SF/LF/EA), derived protection | Scope tree |
| 3 | Bid | Rates, crew, burden, overhead, margin | Tasks → hours → labor + material → bid price | Proposal bundle |
| 4 | Portal | Inclusions, QT selections, approval, signature | Live re-price | Accepted scope |
| 5 | Colors & Catalog | Color picks, brand/sheen preference, overrides | Product resolution, gallons, tint schedule | Locked colors + purchase list |
| 6 | Schedule & Comms | Crew capacity, commitments, disruption events | Cascade recompute, notification tiering | Committed dates |
| 7 | Tracker | Hours by employee/room/task, % complete | Actual production rates | Actuals paired to estimates |
| 8 | Analytics | — | Variance, realized margin, rate confidence | Calibrated rates → stage 3 |

---

## 2. Stage 1 — Lead Intake

The client describes their own project before anyone visits. This stage is
deliberately low-friction: it exists to qualify and to schedule a walkthrough,
not to estimate.

**Captured:** name, contact, property address, interior/exterior/both, rough room
count or elevation count, surfaces of interest, timeline urgency, budget signal,
and — most valuable — client-uploaded photos.

**Computed:** a qualification pass (in service area, scope in range, timeline
realistic) and routing to either a booked walkthrough or a decline.

**Handed forward:** a `profiles` row and a `projects` row at status `consultation`.
The self-reported scope pre-fills the walkthrough so the estimator arrives with a
skeleton rather than a blank app. Client photos attach to the project and stay
attached — they become the before-condition record that stage 8 and any warranty
claim will want years later.

**Boundary note:** nothing the client self-reports is trusted as measurement. It
seeds the capture stage and is overwritten by it. A client saying "about 1,200
square feet" sets an expectation, never a quantity.

---

## 3. Stage 2 — Scope Capture (PaintScope)

The estimator walks the property and records **measurable facts**. No pricing
happens here, and no opinions are recorded — only what is physically true.

**Captured, per room (interior) or elevation (exterior):**

- Geometry — dimensions, perimeter, ceiling height, ceiling type
- Openings — doors and windows by type and count, which subtract from wall area
- Substrate — what the surface is made of (`drywall`, `plaster`, `wood`, `siding`)
- Substrate **state** — new construction vs. repaint, previously coated or not
- Substrate **condition** — excellent through poor, driving prep intensity
- Protection requirements — floors, fixtures, contents
- Quality tier intent — the default QT for the project, overridable per item

The distinction between substrate, state, and condition matters and is easy to
collapse by mistake. Each drives a different decision: substrate selects *which*
material system applies, state selects *whether* priming is required, condition
selects *how much prep* precedes it. Collapsing any two produces wrong task lists.

**Computed:** quantities in the correct unit for each surface — wall SF net of
openings, trim LF, doors EA — plus derived protection scope from room contents
and floor type.

**Handed forward:** the scope tree — a hierarchy of rooms/elevations → substrates
→ resolved specs → tasks, each carrying its quantity.

---

## 4. Stage 3 — Bid (Estimation Engine)

The engine converts the scope tree into money. This is the stage with the most
logic and the least judgment: given the same scope tree and the same rate tables,
it must produce the same number every time.

**Captured (from company profile, not the project):** labor rates by role, crew
configuration, labor burden, overhead rate, profit margin, mobilization charge,
minimum job charge, travel time.

**Computed, in order:**

1. **Spec resolution** — each substrate + state + condition resolves to a spec
   family, which expands into modules and tasks.
2. **Modifier stacking** — height bands, access difficulty, quality tier, and
   condition modifiers apply to base production rates.
3. **Hours** — quantity ÷ modified production rate, per task, summed per line item.
4. **Materials** — each task names a material system (`SYS_*`); the system resolves
   to a catalog product, which supplies coverage and price. Gallons round up to
   purchasable units.
5. **Line cost** — `hours × blended rate × (1 + burden) + material cost`.
6. **Bid price** — subtotal → overhead → margin → mobilization → minimum-job floor.

**Quality tiers are computed for every line, not just the chosen one.** The engine
produces a price at each QT the line supports, so the portal can offer upgrades
without a round trip to the estimator. This is what makes stage 4 interactive.

**Handed forward:** the proposal bundle — project metadata, the original scope as
priced line items, and the QT option matrix.

---

## 5. Stage 4 — Client Portal: Proposal & Agreement

The client receives not a PDF but a live document they can manipulate within
bounds the estimator set.

**Captured:** per-line inclusion toggles, quality tier selections at line / room /
project level, questions and comments, and finally approval with signature.

**Computed:** live re-pricing. A QT selection resolves through a fallback chain —
line-level choice wins, else the room-level choice, else the project default — and
the bundle's precomputed option matrix supplies the price. No engine call is
needed, because stage 3 already computed every reachable combination.

**Handed forward:** the accepted scope — a frozen set of included line items at
chosen tiers, with a signature and timestamp. This becomes the contract baseline
that stage 8 measures margin against.

**Boundary note:** the client can only choose among options the estimator priced.
They cannot add scope, change quantities, or invent tiers. Anything outside the
option matrix becomes a change order, which routes back through stage 3.

---

## 6. Stage 5 — Colors & Catalog

Two separate axes that meet at the product. The **material system** decides what
kind of coating a task requires; the **color** decides what goes in the can. A task
needs both before anything can be purchased.

### 6.1 Product resolution

Every task names a material system rather than a product — `SYS_WALL_EGGSHELL`,
not "ProMar 200 Eggshell." Products resolve from the system at estimate time
through a three-level cascade:

1. **Manual override** — a specific product pinned to this project
2. **System override** — a company-wide default for this system
3. **Scored selection** — brand preference and quality tier score the candidates

Tier matching uses a brand-line map: QT5 work pulls premium lines, QT2 pulls
economy, with adjacent-tier fallback when an exact match does not exist. The
resolved product supplies coverage (SF/gallon) and price, which is what makes
material cost computable at all.

### 6.2 Color selection

The client browses the Sherwin-Williams catalog in the portal and assigns colors at
whatever level they naturally think in — "all the trim," "this room's walls," "just
that one accent wall." Those assignments write into the same inheritance cascade the
estimator uses: project defaults → substrate group → room group → individual room →
specific surface. There is one color model, not a separate client-facing one.

Substrates map to color **groups** rather than carrying colors individually, so
choosing a trim color covers baseboard, casing, crown, shoe mold, and jambs in one
act — which is how people actually choose colors.

### 6.3 The Color Agreement Record

Colors are the one client input that becomes physically irreversible. The agreement
record exists to make the moment of commitment explicit and to price what happens
after it.

**States:** `draft` → `proposed` → **`locked`** → (`change_requested` → `locked v2` …)

- **draft** — the client is exploring. Nothing downstream computes.
- **proposed** — submitted for contractor review: hide problems, sheen conflicts,
  tint availability, deep-base requirements.
- **locked** — both parties' identities and timestamps recorded on one immutable
  version.

**What the lock gates:** the purchase list, the tint schedule, the color guide
document, and the touch-up reference. None of these can be generated against
unlocked colors — that is the entire purpose of the gate. It also prevents the
estimator's own late edits from silently changing what was agreed.

**Post-lock changes are bilateral and priced.** Either party opens a change request
naming scope, from-color, and to-color. The system computes impact rather than
merely recording assent:

- **Hide delta** — a dark color over light, or a large color-family jump, can require
  an additional coat. The engine re-runs that line and returns an hour delta.
- **Material delta** — different product line, deep-base surcharge, additional tint load.
- **Sunk cost** — if the purchase list is already marked ordered, the change carries
  restock or waste. This is why lock timing is a real business variable: the same
  color change costs nothing on Tuesday and $340 on Friday.

The other party approves, producing `locked v2` and an amended contract price. Every
version is retained rather than overwritten — that history is the warranty and
touch-up record three years later, when the question is "what exactly is on this
wall," and the answer needs to be authoritative.

**On the meaning of bilateral:** requiring both parties to agree technically lets the
contractor refuse. In practice the answer is almost always yes, and the mechanism's
real job is *pricing the change correctly*, not *permitting* it. Refusal is the rare
case — a color that will not cover, a product that cannot be tinted, a request that
arrives mid-coat.

**Handed forward:** locked colors, a purchase list by product and tint, and a color
guide document to the portal.

---

## 7. Stage 6 — Schedule & Client Communication

The scheduling layer is where PaintFactor stops being an estimating tool and becomes
an operations system. It is also the stage most exposed to the outside world:
weather, client decisions, and crew availability all perturb it.

### 7.1 The schedule primitive

Each accepted project carries: a committed start date, a duration derived from
estimated hours ÷ assigned crew capacity, one or more crew assignments, and a
**commitment tier** describing how firm the promise is.

Capacity is net of travel — a crew paid for 7 hours that spends one driving
produces 6 — because travel is billable time that comes out of the working day.
Large projects may run two crews at once, which makes them coupling points between
queues: a delay reaching a shared job propagates into every crew's queue that job
belongs to.

| Tier | Horizon | What was promised | Notification sensitivity |
|------|---------|-------------------|--------------------------|
| **Confirmed** | ~within 1 week | An exact date | Any movement ≥ 1 day → immediate |
| **Scheduled** | ~2–4 weeks | A week | Notify when the *week* changes |
| **Queued** | beyond | A month or season | Weekly digest, or large moves only |

The tier is not decoration. It encodes the honest truth that a date six weeks out is
an estimate, and it is the mechanism that keeps notification volume proportional to
how much the client actually cares.

### 7.2 Disruption is a cascade, not an event

The naive model treats a rain day as "job X is delayed." The real behavior is that
every disruption reshapes the downstream queue, and different disruptions reshape it
differently:

| Event | Effect on the queue |
|-------|---------------------|
| **Rain day** | Pushes *exterior* work only. Interior is unaffected — and the correct response may be swapping the crew onto an interior job, which moves a *different* client's date. |
| **Change order** | Adds hours to the in-progress job, pushing everything behind it. Connects directly to the color-change flow in stage 5. |
| **Cancellation** | *Frees* capacity, and can pull jobs **earlier**. A notification system that only reports delays wastes this. |
| **Material delay** | Pushes one job; others may absorb the gap without moving at all. |
| **Crew unavailability** | Reduces capacity, stretching durations rather than shifting starts. |

When any of these lands, the scheduler recomputes projected start dates across the
whole committed queue and produces a **movement set**: every project whose date
changed, and by how much.

### 7.3 From cascade to notification

The movement set passes through three filters before anyone hears anything:

1. **Tier filter** — a project only qualifies if the movement exceeds its tier's
   threshold. A two-day slip notifies a Confirmed client and is silently absorbed
   for a Queued one.
2. **Draft composition** — qualifying movements become pre-written client messages:
   what changed, the new date, why, and what if anything is needed from them.
3. **Contractor approval** — drafts land in a batch review screen. Approve all, edit
   individually, or drop. Nothing reaches a client unreviewed.

The tier filter running *before* the approval queue is what makes manual approval
sustainable. On a rain day you approve the two Confirmed clients, not all eleven on
the books. Per-message approval without tiering would become a daily chore and be
abandoned within a month.

**Weekly digest.** Queued-tier clients, and anyone with sub-threshold movement,
receive a Friday summary instead: where the project stands, current projected
window, and anything upcoming that needs a decision. One approval covers the whole
digest batch.

**Handed forward:** committed dates to the portal schedule view, and a crew-facing
day plan to the tracker.

---

## 8. Stage 7 — Tracker (Field Actuals)

The tracker exists for exactly one reason: to produce the *actual* half of every
estimated/actual pair. Its design follows from that.

**Captured:** hours logged by employee against a specific room and task, and a
completion percentage. Entries can be recorded at project level ("the whole job is
60% done") or room level ("the primary bedroom is 90% done"), because field reality
varies — some days a crew tracks precisely, some days they do not.

**Computed:** completion rolls up newest-entry-wins, with room-level detail preferred
over project-level when both exist. Activity completion is a weighted average across
rooms, weighted by *estimated* hours — so a large room at 50% counts for more than a
closet at 100%. Actual production rate per employee per task falls out of hours ÷
quantity completed.

**Handed forward:** time entries paired against the estimate snapshot. The snapshot
matters: it freezes what was estimated at the moment work began, so later change
orders do not retroactively rewrite the baseline and hide a variance.

**Boundary note:** the tracker never edits the estimate. It records what happened
alongside what was predicted. Reconciling the two is stage 8's job.

---

## 9. Stage 8 — Analytics & the Feedback Loop

Everything upstream exists to make this stage possible. A single job's variance is an
anecdote; the accumulated variance across many jobs is a calibrated rate table.

**Computed:**

- **Hour variance** — estimated vs. actual, decomposed to the task level so the
  answer is "baseboard prep ran long," not "the job ran long."
- **Realized margin** — contract revenue minus actual labor and material cost,
  against the margin the bid assumed.
- **Rate confidence** — for each production rate, how many observations exist and how
  tightly they cluster.
- **Crew performance** — actual rates by employee, feeding pay-for-performance.

**The return path.** Variance does not silently rewrite rates. A rate revision is
*proposed* when the evidence supports it — enough observations, consistent directional
bias, no obvious confound — and a human accepts or rejects it. One job running long
never moves a rate; it contributes an observation.

This is the discipline that makes the loop trustworthy. Auto-calibration on thin data
would let a single unusual job poison a rate used on every future bid. Rates are the
system's most valuable asset and they change deliberately.

**Handed forward:** revised production rates and material yield factors into stage 3,
where the next bid is measurably better than the last.

---

## 10. Worked Example — A Three-Room Repaint

One project traced end to end. Company defaults: painter $25, lead $35, apprentice
$18; Standard 2-Man crew (1 lead + 1 painter) → **$30.00/hr blended**; 30% burden →
**$39.00/hr loaded**; 15% overhead; 10% margin; $150 mobilization.

### Stage 1 — Intake

Client submits the website form: interior, three rooms, "walls, ceilings, and trim
look tired," timeline "next month or so," four phone photos. Qualified, walkthrough
booked. `projects` row created at status `consultation`.

### Stage 2 — Capture

Estimator measures:

| Room | Walls (net SF) | Ceiling (SF) | Baseboard (LF) | Doors | Windows |
|------|----------------|--------------|----------------|-------|---------|
| Living Room | 480 | 224 | 60 | 2 | 3 |
| Hallway | 348 | 80 | 48 | 4 | 0 |
| Primary Bedroom | 444 | 195 | 56 | 2 | 2 |
| **Total** | **1,272** | **499** | **164** | **8** | **5** |

Substrate `drywall`, state `repaint / previously coated`, condition `good`. Trim is
painted wood, condition `fair` — the baseboard has dings and old caulk lines. Project
default QT3.

### Stage 3 — Bid

Spec resolution and modifier stacking produce **34.5 hours** at QT3:

| Task group | Quantity | Rate | Hours |
|------------|----------|------|-------|
| Wall finish, 2 coats | 1,272 SF | 200 SF/hr | 6.4 |
| Ceiling finish, 1 coat | 499 SF | 250 SF/hr | 2.0 |
| Baseboard, 2 coats | 164 LF | 30 LF/hr | 5.5 |
| Doors | 8 EA | 0.9 hr/EA | 7.2 |
| Window casing | 5 EA | 0.8 hr/EA | 4.0 |
| Patch & prep | — | — | 5.9 |
| Protection setup/teardown | — | — | 3.5 |
| **Total** | | | **34.5** |

Materials resolve `SYS_WALL_EGGSHELL` → ProMar 200 at 350 SF/gal, $55/gal, plus
ceiling flat, trim enamel, and spot primer — 13 gallons and sundries, **$800**.

```
Labor        34.5 hr × $39.00      = $1,345.50
Materials                          =   $800.00
Subtotal                           = $2,145.50
Overhead 15%                       =   $321.83
Margin 10%                         =   $246.73
Mobilization                       =   $150.00
                                     ─────────
Bid                                  $2,864.06
```

The engine also prices every line at QT2 through QT5 and ships the option matrix in
the bundle.

### Stage 4 — Portal

The client reviews, keeps all three rooms, and upgrades the **primary bedroom to
QT4** — finer prep, better product. The portal reads the precomputed option matrix:
+2.7 hours ($105.30 labor) and +$66.00 material, marked up → **+$216.69**.

**Accepted contract: $3,080.75.** Signed.

### Stage 5 — Colors

Client browses the SW catalog and assigns at group level:

- Walls → **SW 7008 Alabaster**
- Trim group → **SW 7005 Pure White**, semi-gloss (covers baseboard, casing, jambs)
- Ceilings → flat ceiling white

Proposed, reviewed, **locked** — both parties, timestamped. Purchase list and tint
schedule generate; paint is ordered.

Two days later the client requests a **Living Room accent wall in SW 6258 Tricorn
Black**. Post-lock, so it prices:

```
Hide delta   dark over light → 3rd coat, 140 SF @ 200 SF/hr = 0.7 hr → $27.30
Material     1 gal deep base                                        = $68.00
Subtotal                                                            = $95.30
Marked up (×1.15 ×1.10)                                             = $120.55
```

Approved by both → `locked v2`. **Contract: $3,201.30.**

### Stage 6 — Schedule

Committed start Tuesday the 8th, Confirmed tier. Duration is 4 days: 37.9 hours
against a 2-person crew at 7.0 paid hours each, less 1.0 hour of round-trip travel
— 12.0 hr/day effective, not 14.0. On the 4th, the
preceding job takes a change order adding 14 hours. The cascade recomputes: this
project moves **Tuesday → Thursday**. Confirmed tier, movement of 2 days, over
threshold → draft composed, contractor approves in the batch screen, client notified
same day. Two Queued-tier clients also moved by one day; both fall below threshold
and are folded into Monday's digest instead.

### Stage 7 — Tracker

Crew logs against the snapshot. Estimated **37.9 hours** (34.5 + 2.7 QT4 + 0.7 accent
wall). Actual **41.0 hours**.

The variance is not spread evenly — it concentrates almost entirely in one place:

| Task group | Estimated | Actual | Δ |
|------------|-----------|--------|---|
| Baseboard, 2 coats | 5.5 | 7.9 | **+2.4** |
| Everything else | 32.4 | 33.1 | +0.7 |

### Stage 8 — Analytics

```
Revenue                                     $3,201.30

Planned    labor  37.9 hr × $39.00  = $1,478.10
           material ($800+$66+$68)  =   $934.00
                                      ─────────
           planned cost               $2,412.10   → gross $789.20  (24.7%)

Actual     labor  41.0 hr × $39.00  = $1,599.00
           material                 =   $845.00
                                      ─────────
           actual cost                $2,444.00   → gross $757.30  (23.7%)
```

**One point of margin, $31.90** — and the netting is the interesting part. Labor
overran by $120.90, but materials came in **$89.00 under** because estimated gallons
round up to purchasable units and the crew got more out of them. A job-level margin
report would show a mild miss and move on. Task-level decomposition shows a real
labor problem partly masked by a material windfall that will not recur reliably.

The labor overrun traces to baseboard: 164 LF in 7.9 hours is **20.8 LF/hr** against
the 30 LF/hr the rate table assumed. The likely cause is visible in the capture data —
trim condition was recorded `fair`, and the fair-condition modifier may be
under-weighted for baseboard specifically.

**The loop closes carefully.** This is one observation. It is recorded against
"baseboard repaint, fair condition," flagged as a directional signal, and changes
nothing yet. When that rate accumulates enough consistent observations, the system
proposes a revision — and a human decides. The next bid on a fair-condition baseboard
is better only because this job was measured.

---

## 11. Entity Ownership

Which stage owns each entity, and who reads it downstream. Owner writes; readers
consume without modifying.

| Entity | Owned by | Read by |
|--------|----------|---------|
| Client profile | 1 Intake | 4, 6 |
| Project record | 1 Intake | all |
| Geometry & quantities | 2 Capture | 3, 5, 7 |
| Substrate / state / condition | 2 Capture | 3, 8 |
| Scope tree | 2 Capture | 3, 4, 7 |
| Company profile (rates, margins) | Settings | 3 |
| Production rates | 8 Analytics → company profile | 3 |
| Line items & QT options | 3 Bid | 4, 8 |
| Proposal bundle | 3 Bid | 4 |
| Accepted scope | 4 Portal | 5, 6, 7, 8 |
| Material systems | Base database | 3, 5 |
| Product catalog | Base database | 3, 5 |
| Color agreement record | 5 Colors | 4, 6, 7, warranty |
| Purchase list | 5 Colors | 6, 8 |
| Schedule commitments | 6 Schedule | 4, 7 |
| Notifications | 6 Schedule | 4 |
| Estimate snapshot | 7 Tracker (frozen from 3) | 8 |
| Time entries | 7 Tracker | 8 |
| Variance & margin | 8 Analytics | 3 (as proposals) |

---

## 12. Open Questions

Items this document describes at concept level that need their own specification
before implementation.

1. **Schedule data model and notification delivery.** Specified in
   `docs/superpowers/specs/2026-09-19-schedule-notifications-design.md` — crews,
   queues, the cascade traversal, tier filtering, batch approval, and the Monday
   digest. Unbuilt; that document carries its own open questions.
2. **Job-site distance and travel.** Travel is billable and consumes crew capacity,
   so every duration depends on it. The schedule spec carries a manual
   `travel_hours_per_day` field; the geocoding and routing system that would
   populate it automatically — and enable stacking short jobs in one day — is
   back-burnered and unscoped.
3. **Change-order routing.** Stage 4 rejects out-of-matrix requests to stage 3, but
   the return path — re-estimate, re-approve, amend contract — is unspecified. The
   color change flow in stage 5 is one instance of a general mechanism.
4. **Rate calibration thresholds.** How many observations constitute confidence, how
   outliers are excluded, and what a proposed revision looks like when it reaches a
   human.
5. **Portal ↔ PaintScope sync.** `projects.paintfactor_project_id` is the join key,
   but PaintScope persists locally while the portal reads Supabase. The
   synchronization contract — direction, conflict resolution, timing — is undefined.
6. **Purchase list lifecycle.** The sunk-cost branch of a post-lock color change
   depends on knowing whether paint is ordered, received, or opened. That state has
   no owner yet.
