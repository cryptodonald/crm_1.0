-- Migration: Add body_scans table for 3D scan storage
-- Created: 2026-02-16

-- Create body_scans table
create table if not exists public.body_scans (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.leads(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Anny phenotype parameters (from fitting)
  phenotypes jsonb not null,
  
  -- Storage URL for fitted GLB mesh
  glb_url text,
  
  -- Fitting accuracy (RMS error in mm)
  error_mm float,
  
  -- Source type: 'manual' (height/weight input) or '3d_scan' (uploaded scan)
  scan_type text not null check (scan_type in ('manual', '3d_scan')),
  
  -- Optional metadata
  metadata jsonb default '{}'::jsonb
);

-- Add index for quick lookup by cliente
create index if not exists idx_body_scans_cliente_id on public.body_scans(cliente_id);

-- Add index for filtering by scan_type
create index if not exists idx_body_scans_scan_type on public.body_scans(scan_type);

-- Enable RLS
alter table public.body_scans enable row level security;

-- RLS Policies: only authenticated users can access
create policy "Users can view body_scans"
  on public.body_scans for select
  using (auth.role() = 'authenticated');

create policy "Users can insert body_scans"
  on public.body_scans for insert
  with check (auth.role() = 'authenticated');

create policy "Users can update body_scans"
  on public.body_scans for update
  using (auth.role() = 'authenticated');

create policy "Users can delete body_scans"
  on public.body_scans for delete
  using (auth.role() = 'authenticated');

-- Add optional reference to body_scans in leads table (for quick access to latest scan)
alter table public.leads 
  add column if not exists latest_body_scan_id uuid references public.body_scans(id) on delete set null;

-- Create updated_at trigger
create or replace function public.handle_body_scans_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_body_scans_updated_at
  before update on public.body_scans
  for each row
  execute function public.handle_body_scans_updated_at();

-- Comments for documentation
comment on table public.body_scans is '3D body scan data and Anny phenotype parameters for leads';
comment on column public.body_scans.phenotypes is 'Anny phenotype parameters: gender, age, height, weight, muscle, proportions';
comment on column public.body_scans.glb_url is 'Supabase Storage URL to fitted GLB mesh file';
comment on column public.body_scans.error_mm is 'RMS fitting error in millimeters (lower is better)';
comment on column public.body_scans.scan_type is 'Data source: manual (height/weight input) or 3d_scan (uploaded 3D scan)';
