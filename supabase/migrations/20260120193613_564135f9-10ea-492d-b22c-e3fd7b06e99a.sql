-- =====================================================
-- REBUILD TOTAL: RLS POLICIES PARA NOVO ONBOARDING
-- =====================================================

-- 1. Garantir que users autenticados podem criar tenants
DROP POLICY IF EXISTS "Users can create tenants" ON public.tenants;
CREATE POLICY "Users can create tenants" ON public.tenants
  FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- 2. Garantir que users podem criar sua membership inicial
DROP POLICY IF EXISTS "Users can create own membership" ON public.tenant_members;
CREATE POLICY "Users can create own membership" ON public.tenant_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 3. Garantir que users podem criar blogs para seus tenants
DROP POLICY IF EXISTS "Tenant members can create blogs" ON public.blogs;
CREATE POLICY "Tenant members can create blogs" ON public.blogs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND (
      tenant_id IS NULL 
      OR tenant_id IN (SELECT public.get_user_tenant_ids())
    )
  );

-- 4. Garantir que users podem criar domínios para seus tenants
DROP POLICY IF EXISTS "Tenant members can create domains" ON public.tenant_domains;
CREATE POLICY "Tenant members can create domains" ON public.tenant_domains
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (SELECT public.get_user_tenant_ids())
  );

-- 5. Adicionar colunas em profiles se não existem
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- 6. Policy para users atualizarem seu próprio profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 7. Policy para users inserirem seu próprio profile (se não existe)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- 8. Policy para users verem seu próprio profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());