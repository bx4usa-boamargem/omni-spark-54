-- ============================================================
-- OMNISEEN — CRIAR OPERADOR MASTER (Bione Advocacia)
-- Execute no Supabase Studio > SQL Editor
-- https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/editor
-- ============================================================
-- ANTES DE EXECUTAR: Criar o usuário Auth em:
-- Authentication > Users > Add User
-- Email: operador@bioneadvocacia.com.br
-- Password: BioneAdv2026!
-- Auto Confirm Email: YES
-- Depois copie o UUID gerado aqui embaixo:

-- Substitua <<USER_UUID>> pelo UUID do usuário criado acima
DO $$ 
DECLARE
  v_user_id UUID := '<<USER_UUID>>';  -- UUID do usuário criado no Auth
  v_blog_id UUID := '44c4f7cd-05b0-4229-9828-2eb822d38bfd';
BEGIN

  -- 1. Garantir que o perfil exista
  INSERT INTO profiles (user_id, full_name, onboarding_completed)
  VALUES (v_user_id, 'Operador Bione Advocacia', true)
  ON CONFLICT (user_id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    onboarding_completed = true;

  -- 2. Garantir que o blog exista e seja vinculado
  UPDATE blogs 
  SET user_id = v_user_id
  WHERE id = v_blog_id;

  -- 3. Garantir que tenant_members (se tabela exista) vincule o operador
  INSERT INTO tenant_members (tenant_id, user_id, role, joined_at)
  VALUES (v_blog_id, v_user_id, 'owner', NOW())
  ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'owner';

  RAISE NOTICE 'Operador % vinculado ao blog %', v_user_id, v_blog_id;
END $$;

-- 4. Confirmar
SELECT u.id, u.email, b.id as blog_id, b.slug
FROM auth.users u
JOIN blogs b ON b.user_id = u.id
WHERE u.email = 'operador@bioneadvocacia.com.br';
