-- OmniSeen — API Integrations (per-tenant API keys)
-- Goal: store provider API keys per tenant with RLS and no frontend SELECT of api_key.

create table if not exists public.api_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  provider text not null,
  api_key text not null,
  extra_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce one key per provider per tenant
create unique index if not exists api_integrations_tenant_provider_key
  on public.api_integrations (tenant_id, provider);

alter table public.api_integrations enable row level security;

-- Auto-touch updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_updated_at on public.api_integrations;
create trigger trg_touch_updated_at
before update on public.api_integrations
for each row execute function public.touch_updated_at();

-- Privileges: block table access by default, then allow upsert + safe select columns.
revoke all on public.api_integrations from anon, authenticated;
grant insert, update on public.api_integrations to authenticated;
grant select (id, tenant_id, provider, extra_config, created_at, updated_at) on public.api_integrations to authenticated;
grant all on public.api_integrations to service_role;

-- RLS Policies (tenant-scoped)
drop policy if exists "Tenant members can read api integrations (no api_key)" on public.api_integrations;
drop policy if exists "Tenant members can insert api integrations" on public.api_integrations;
drop policy if exists "Tenant members can update api integrations" on public.api_integrations;

create policy "Tenant members can read api integrations (no api_key)"
  on public.api_integrations
  for select
  to authenticated
  using (public.is_tenant_member(tenant_id));

create policy "Tenant members can insert api integrations"
  on public.api_integrations
  for insert
  to authenticated
  with check (public.is_tenant_member(tenant_id));

create policy "Tenant members can update api integrations"
  on public.api_integrations
  for update
  to authenticated
  using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

