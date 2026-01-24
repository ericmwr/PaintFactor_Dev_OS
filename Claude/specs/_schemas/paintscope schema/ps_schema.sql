-- ============================================
-- PaintScope Core Schema (Draft v0.1)
-- ============================================
-- Principles:
-- 1) PaintScope is the ONLY source of geometry.
-- 2) Specs must consume quantity keys; no internal geometry computation.
-- 3) EdgeLF is first-class (ps_edges) and can be aggregated into PS_EDGE_LF.* keys.
-- 4) Assets are facts; protection quantities exist only when measured/derived with a method.

-- ------------------------
-- 0) Helper enums (as TEXT + CHECK for portability)
-- ------------------------

-- UOM types used across PaintScope (geometry + protection)
-- Use a CHECK constraint rather than CREATE TYPE for easier migrations.
-- Allowed: SF, LF, EA, EA_SIDE, FLAG
-- (FLAG used for meta keys if you store them in ps_quantities)
-- ------------------------

-- ------------------------
-- 1) Scope Runs (versioned snapshots of captured scope)
-- ------------------------
create table if not exists ps_scope_runs (
  scope_run_id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  created_at timestamptz not null default now(),
  created_by text null,
  status text not null default 'draft'
    check (status in ('draft','final','archived')),
  notes text null
);

create index if not exists idx_ps_scope_runs_project on ps_scope_runs(project_id);


-- ------------------------
-- 2) Rooms / Zones (containers)
-- ------------------------
create table if not exists ps_rooms (
  room_id uuid primary key default gen_random_uuid(),
  scope_run_id uuid not null references ps_scope_runs(scope_run_id) on delete cascade,

  -- Hierarchy / grouping
  area_label text null,          -- e.g., "Main Floor", "Basement", "Exterior: North Elevation"
  room_label text not null,      -- e.g., "Kitchen", "Bedroom 2", "Garage"

  -- Optional room dimensions (if you use rectangle method)
  length_ft numeric(10,2) null check (length_ft is null or length_ft >= 0),
  width_ft  numeric(10,2) null check (width_ft  is null or width_ft  >= 0),
  height_ft numeric(10,2) null check (height_ft is null or height_ft >= 0),

  -- Flags (facts, not decisions)
  is_interior boolean not null default true,
  is_new_construction boolean null,     -- can be set at project level too
  is_occupied boolean null,

  notes text null
);

create index if not exists idx_ps_rooms_scope_run on ps_rooms(scope_run_id);


-- ------------------------
-- 3) Surfaces (paintable geometry units)
-- ------------------------
create table if not exists ps_surfaces (
  surface_id uuid primary key default gen_random_uuid(),
  scope_run_id uuid not null references ps_scope_runs(scope_run_id) on delete cascade,
  room_id uuid not null references ps_rooms(room_id) on delete cascade,

  -- Stable classification for downstream mapping
  surface_type text not null,
  -- Examples: WALL_FIELD, CEILING_FIELD, TRIM_BASEBOARD, TRIM_CROWN,
  -- DOOR_SLAB_SIDE, DOOR_JAMB_SIDE, WINDOW_CASING, etc.

  -- Unit basis: the unit that downstream specs must use
  uom_basis text not null check (uom_basis in ('SF','LF','EA','EA_SIDE')),

  -- Quantity for this surface in its basis unit.
  -- If you prefer, you can omit this and store only in ps_quantities;
  -- but storing here is convenient for audit.
  qty_value numeric(12,3) not null default 0 check (qty_value >= 0),

  -- How qty_value was obtained
  measurement_method text not null default 'derived'
    check (measurement_method in ('manual','derived','inferred','unknown')),

  -- Optional dimensions for auditing (not used by specs directly)
  height_ft numeric(10,2) null check (height_ft is null or height_ft >= 0),
  length_ft numeric(10,2) null check (length_ft is null or length_ft >= 0),
  width_ft  numeric(10,2) null check (width_ft  is null or width_ft  >= 0),

  -- Attributes captured at scope time (facts only)
  attributes jsonb not null default '{}'::jsonb,

  -- Optional: link to a "thing" instance (e.g., a specific door)
  instance_ref text null,

  notes text null
);

create index if not exists idx_ps_surfaces_scope_run on ps_surfaces(scope_run_id);
create index if not exists idx_ps_surfaces_room on ps_surfaces(room_id);
create index if not exists idx_ps_surfaces_type on ps_surfaces(surface_type);


-- ------------------------
-- 4) Assets (non-paint or protectable objects)
-- ------------------------
create table if not exists ps_assets (
  asset_id uuid primary key default gen_random_uuid(),
  scope_run_id uuid not null references ps_scope_runs(scope_run_id) on delete cascade,
  room_id uuid not null references ps_rooms(room_id) on delete cascade,

  asset_category text not null,
  -- Examples: CABINET, BUILTIN, FLOOR, TILE, COUNTERTOP, GLASS, FIXTURE, APPLIANCE, HARDWARE

  asset_subtype text null,

  -- Protection measurement (only if measurable)
  protect_uom text null check (protect_uom in ('SF','LF','EA')),
  protect_qty numeric(12,3) null check (protect_qty is null or protect_qty >= 0),

  measurement_method text not null default 'unknown'
    check (measurement_method in ('manual','derived','inferred','unknown')),

  attributes jsonb not null default '{}'::jsonb,
  notes text null
);

create index if not exists idx_ps_assets_scope_run on ps_assets(scope_run_id);
create index if not exists idx_ps_assets_room on ps_assets(room_id);
create index if not exists idx_ps_assets_category on ps_assets(asset_category);


-- ------------------------
-- 5) Edges (EdgeLF + adjacency at boundaries)
-- ------------------------
create table if not exists ps_edges (
  edge_id uuid primary key default gen_random_uuid(),
  scope_run_id uuid not null references ps_scope_runs(scope_run_id) on delete cascade,
  room_id uuid not null references ps_rooms(room_id) on delete cascade,

  -- The paintable surface that "owns" this boundary edge
  subject_surface_id uuid not null references ps_surfaces(surface_id) on delete cascade,

  length_lf numeric(12,3) not null default 0 check (length_lf >= 0),

  -- Edge target category for stable aggregation (the core EdgeLF mapping)
  edge_target text not null
    check (edge_target in ('TO_CEILING','TO_TRIM','TO_ASSET','TO_SURFACE','OTHER')),

  -- What is on the other side of the edge (optional but powerful)
  object_kind text not null default 'unknown'
    check (object_kind in ('surface','asset','unknown')),

  object_surface_id uuid null references ps_surfaces(surface_id) on delete set null,
  object_asset_id uuid null references ps_assets(asset_id) on delete set null,

  -- Optional classified edge bucket (for asset-specific EdgeLF keys)
  -- Examples: TO_ASSET.CABINETS, TO_ASSET.TILE, TO_ASSET.FLOOR_HARD, TO_ASSET.GLASS_PANES
  edge_class text null,

  measurement_method text not null default 'derived'
    check (measurement_method in ('manual','derived','inferred','unknown')),

  confidence numeric(4,3) null check (confidence is null or (confidence >= 0 and confidence <= 1)),

  attributes jsonb not null default '{}'::jsonb,
  notes text null,

  -- Integrity rules: only one of object_surface_id / object_asset_id should be populated (or neither).
  constraint ck_ps_edges_object_ref
    check (
      (object_surface_id is null and object_asset_id is null)
      or (object_surface_id is not null and object_asset_id is null)
      or (object_surface_id is null and object_asset_id is not null)
    )
);

create index if not exists idx_ps_edges_scope_run on ps_edges(scope_run_id);
create index if not exists idx_ps_edges_room on ps_edges(room_id);
create index if not exists idx_ps_edges_subject on ps_edges(subject_surface_id);
create index if not exists idx_ps_edges_target on ps_edges(edge_target);
create index if not exists idx_ps_edges_class on ps_edges(edge_class);


-- ------------------------
-- 6) Quantities Cache (optional but recommended)
-- ------------------------
-- This is the "Quantity API" table. It stores stable quantity keys for fast lookup
-- and provides audit metadata.
create table if not exists ps_quantities (
  quantity_id uuid primary key default gen_random_uuid(),
  scope_run_id uuid not null references ps_scope_runs(scope_run_id) on delete cascade,

  quantity_key text not null,  -- e.g., PS_SURFACE_SF.WALL_FIELD, PS_EDGE_LF.TO_TRIM, PS_PROTECT_SF.ASSET.CABINETS_FACE
  uom text not null check (uom in ('SF','LF','EA','EA_SIDE','FLAG')),

  value numeric(14,3) null,      -- numeric quantities
  flag_value boolean null,       -- for meta flags
  text_value text null,          -- for rare non-numeric metadata (prefer not to use)

  source text not null default 'derived'
    check (source in ('manual','derived','inferred')),

  -- Trace can store references: contributing surface_ids / edge_ids / asset_ids
  trace jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),

  constraint uq_ps_quantities_key unique (scope_run_id, quantity_key),

  constraint ck_ps_quantities_value_oneof
    check (
      (value is not null and flag_value is null and text_value is null)
      or (value is null and flag_value is not null and text_value is null)
      or (value is null and flag_value is null and text_value is not null)
    )
);

create index if not exists idx_ps_quantities_scope_run on ps_quantities(scope_run_id);
create index if not exists idx_ps_quantities_key on ps_quantities(quantity_key);


-- ------------------------
-- 7) Convenience Views (optional)
-- ------------------------

-- Surface sums by type + UOM (useful for building PS_SURFACE_* keys)
create or replace view v_ps_surface_sums as
select
  scope_run_id,
  surface_type,
  uom_basis,
  sum(qty_value)::numeric(14,3) as total_qty
from ps_surfaces
group by scope_run_id, surface_type, uom_basis;

-- Edge sums by target/class (useful for building PS_EDGE_LF.* keys)
create or replace view v_ps_edge_sums as
select
  scope_run_id,
  edge_target,
  coalesce(edge_class, '') as edge_class,
  sum(length_lf)::numeric(14,3) as total_lf
from ps_edges
group by scope_run_id, edge_target, coalesce(edge_class, '');

