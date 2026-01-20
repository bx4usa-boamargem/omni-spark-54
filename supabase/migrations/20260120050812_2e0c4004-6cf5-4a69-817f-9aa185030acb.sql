-- PART 1 — Fix tenant_members RLS recursion by using SECURITY DEFINER helper functions

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.tenant_members ENABLE ROW LEVEL SECURITY;

-- Helper: is member of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
  );
$$;

-- Helper: is admin/owner of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_members
    WHERE tenant_id = p_tenant_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- Helper: list tenant ids for current user
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid();
$$;

-- Drop known problematic/old policies (if present)
DROP POLICY IF EXISTS "Tenant members can view fellow members" ON public.tenant_members;
DROP POLICY IF EXISTS "Tenant admins can manage members" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can view own memberships" ON public.tenant_members;
DROP POLICY IF EXISTS "Users can view tenant members" ON public.tenant_members;

-- Recreate policies (non-recursive)
CREATE POLICY "Users can view own memberships"
  ON public.tenant_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can view tenant members"
  ON public.tenant_members
  FOR SELECT
  USING (tenant_id IN (SELECT public.get_user_tenant_ids()));

CREATE POLICY "Tenant admins can manage members"
  ON public.tenant_members
  FOR ALL
  USING (public.is_tenant_admin(tenant_id))
  WITH CHECK (public.is_tenant_admin(tenant_id));
