-- ==========================================================
-- SCRIPT DE SETUP: ADM MASTER OMNISEEN
-- ==========================================================
-- 1. Limpe o conteúdo do Editor SQL antes de colar este código.
-- 2. Execute para garantir acesso total via e-mail/senha.

DO $$
DECLARE
    target_email TEXT := 'omniseenblog@gmail.com';
    target_pass  TEXT := 'OmniMaster2024!#';
    user_uid     UUID;
BEGIN
    -- 1. Verificar se o usuário já existe
    SELECT id INTO user_uid FROM auth.users WHERE email = target_email;

    IF user_uid IS NULL THEN
        -- Criar novo usuário se não existir
        user_uid := gen_random_uuid();
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (
            user_uid,
            target_email,
            crypt(target_pass, gen_salt('bf')),
            now(),
            'authenticated',
            'authenticated',
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"Admin Master"}',
            now(),
            now()
        );
    ELSE
        -- Atualizar senha do usuário existente
        UPDATE auth.users 
        SET encrypted_password = crypt(target_pass, gen_salt('bf')),
            email_confirmed_at = now()
        WHERE id = user_uid;
    END IF;

    -- 2. Garantir Role de Platform Admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (user_uid, 'platform_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- 3. Garantir Perfil de Team Member
    INSERT INTO public.profiles (user_id, full_name, user_type)
    VALUES (user_uid, 'Admin Master', 'internal_team')
    ON CONFLICT (user_id) DO UPDATE SET 
        user_type = 'internal_team',
        full_name = 'Admin Master';

    RAISE NOTICE 'Usuário % configurado com sucesso. Senha: %', target_email, target_pass;
END $$;
