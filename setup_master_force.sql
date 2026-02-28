-- SCRIPT SQL DEFINITIVO PARA ACESSO MASTER
-- Execute este script no SQL Editor do Supabase

-- 1. Garantir que o usuário exista no Auth (se possível via SQL)
-- Nota: Em muitos setups do Supabase, o SQL não pode criar usuários no Auth diretamente por segurança.
-- Este script foca em garantir as permissões e metadados se o usuário já existir.

DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Busca o ID do usuário pelo e-mail
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'omniseenblog@gmail.com';

    IF target_user_id IS NOT NULL THEN
        -- 2. Define o usuário como Platform Admin na tabela de roles
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'platform_admin')
        ON CONFLICT (user_id, role) DO NOTHING;

        -- 3. Garante que ele tenha um perfil completo
        INSERT INTO public.profiles (id, email, full_name, role)
        VALUES (target_user_id, 'omniseenblog@gmail.com', 'Omniseen Master Admin', 'platform_admin')
        ON CONFLICT (id) DO UPDATE 
        SET role = 'platform_admin', full_name = 'Omniseen Master Admin';

        RAISE NOTICE 'Usuário Master configurado com sucesso para o ID: %', target_user_id;
    ELSE
        RAISE NOTICE 'Usuário omniseenblog@gmail.com não encontrado. Crie-o manualmente no painel Authentication primeiro.';
    END IF;
END $$;
