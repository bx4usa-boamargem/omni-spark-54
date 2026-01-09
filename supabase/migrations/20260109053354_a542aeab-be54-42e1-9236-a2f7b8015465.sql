-- Criar função SECURITY DEFINER para verificar membros de equipe
CREATE OR REPLACE FUNCTION public.is_team_member_of_blog(
  p_user_id uuid,
  p_blog_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = p_user_id
      AND blog_id = p_blog_id
      AND status = 'accepted'
  );
$$;

-- Drop da política existente
DROP POLICY IF EXISTS "Owner or admin can manage strategy" ON client_strategy;

-- Nova política usando a função helper
CREATE POLICY "Owner or admin can manage strategy"
ON client_strategy
FOR ALL
TO authenticated
USING (
  -- Dono do blog
  blog_id IN (
    SELECT id FROM blogs WHERE user_id = auth.uid()
  )
  OR
  -- Membro da equipe (via função SECURITY DEFINER)
  public.is_team_member_of_blog(auth.uid(), blog_id)
  OR
  -- Admin ou Platform Admin
  public.has_role(auth.uid(), 'admin')
  OR
  public.has_role(auth.uid(), 'platform_admin')
)
WITH CHECK (
  blog_id IN (
    SELECT id FROM blogs WHERE user_id = auth.uid()
  )
  OR
  public.is_team_member_of_blog(auth.uid(), blog_id)
  OR
  public.has_role(auth.uid(), 'admin')
  OR
  public.has_role(auth.uid(), 'platform_admin')
);