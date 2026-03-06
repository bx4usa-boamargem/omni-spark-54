#!/usr/bin/env node
/**
 * OMNISEEN — OPERATOR ACCESS PROVISIONING
 * Tenant: Bione Advocacia | CLU-BIONE-PREV-001
 * 
 * Este script:
 * 1. Cria o usuário operador no Supabase Auth
 * 2. Cria o perfil e role OWNER
 * 3. Vincula o usuário ao blog_id existente da Bione
 * 4. Autentica e retorna o access_token para login imediato
 * 
 * MODO DE USO:
 *   export SUPABASE_SERVICE_ROLE_KEY="sua-service-role-key"
 *   export OPERATOR_EMAIL="operador@bioneadvocacia.com.br"
 *   export OPERATOR_PASSWORD="SenhaForte2026!"
 *   node scripts/provision_operator_bione.js
 * 
 * Service Role Key disponível em:
 *   https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/settings/api
 */

const SUPABASE_URL = 'https://oxbrvyinmpbkllicaxqk.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94YnJ2eWlubXBia2xsaWNheHFrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MjYwMTMsImV4cCI6MjA4NzAwMjAxM30.ZLvQlsid_xhhMvRUB_kgsjBupl7WoTd8haPhdv8_Du0';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BLOG_ID = '44c4f7cd-05b0-4229-9828-2eb822d38bfd'; // Bione Advocacia
const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL || 'operador@bioneadvocacia.com.br';
const OPERATOR_PASS = process.env.OPERATOR_PASSWORD || 'BioneAdv2026!';
const DASHBOARD_URL = 'https://app.omniseen.app/client/dashboard';
const LOGIN_URL = 'https://app.omniseen.app/login';

if (!SERVICE_KEY) {
    console.error('\n❌ SUPABASE_SERVICE_ROLE_KEY não definida.');
    console.error('   Acesse: https://supabase.com/dashboard/project/oxbrvyinmpbkllicaxqk/settings/api');
    console.error('   export SUPABASE_SERVICE_ROLE_KEY="eyJ..."');
    process.exit(1);
}

const headers = (key = SERVICE_KEY) => ({
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
});

async function supabase(method, path, body = null, key = SERVICE_KEY) {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
        method,
        headers: headers(key),
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
}

async function rpc(fn, params) {
    return supabase('POST', `/rest/v1/rpc/${fn}`, params);
}

async function from(table, method, body, params = '') {
    return supabase(method, `/rest/v1/${table}${params}`, body);
}

async function main() {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  OMNISEEN — OPERATOR ACCESS PROVISIONING');
    console.log('  Tenant: Bione Advocacia | blog_id:', BLOG_ID);
    console.log('═══════════════════════════════════════════════════════════\n');

    // ─── STEP 1: Criar usuário no Supabase Auth ───────────────────────────────
    console.log('📧 [1/5] Criando usuário operador...');
    const { ok: userOk, data: userData } = await supabase('POST', '/auth/v1/admin/users', {
        email: OPERATOR_EMAIL,
        password: OPERATOR_PASS,
        email_confirm: true,               // confirmar e-mail automaticamente
        user_metadata: {
            full_name: 'Operador Bione Advocacia',
            blog_id: BLOG_ID,
            role: 'owner',
        }
    });

    if (!userOk && userData.code !== 'email_exists') {
        console.error('❌ Erro ao criar usuário:', JSON.stringify(userData, null, 2));
        process.exit(1);
    }

    const userId = userData.id || userData.user?.id;
    const alreadyExists = userData.code === 'email_exists' || !!userData.id;

    if (alreadyExists && !userId) {
        // Buscar o user_id pelo email se já existia
        const { data: existing } = await supabase('GET', `/auth/v1/admin/users?email=${encodeURIComponent(OPERATOR_EMAIL)}`);
        const existingUser = existing?.users?.[0];
        if (!existingUser) {
            console.error('❌ Não foi possível localizar o usuário existente.');
            process.exit(1);
        }
        console.log('   ℹ️  Usuário já existia:', existingUser.id);
    } else {
        console.log('   ✅ Usuário criado:', userId);
    }

    const finalUserId = userId || (await (async () => {
        const { data } = await supabase('GET', `/auth/v1/admin/users?email=${encodeURIComponent(OPERATOR_EMAIL)}`);
        return data?.users?.[0]?.id;
    })());

    if (!finalUserId) {
        console.error('❌ Não foi possível obter o user_id. Aborts.');
        process.exit(1);
    }

    // ─── STEP 2: Criar/atualizar profile ─────────────────────────────────────
    console.log('\n👤 [2/5] Configurando profile do operador...');
    await supabase('POST', '/rest/v1/profiles', {
        user_id: finalUserId,
        full_name: 'Operador Bione Advocacia',
        onboarding_completed: true,
    }, SERVICE_KEY);
    // upsert via patch se já existe
    await supabase('PATCH', `/rest/v1/profiles?user_id=eq.${finalUserId}`, {
        full_name: 'Operador Bione Advocacia',
        onboarding_completed: true,
    });
    console.log('   ✅ Profile configurado');

    // ─── STEP 3: Definir role OWNER ───────────────────────────────────────────
    console.log('\n🔐 [3/5] Atribuindo role owner...');
    await supabase('POST', '/rest/v1/user_roles', {
        user_id: finalUserId,
        role: 'user',
    });
    console.log('   ✅ Role user definido');

    // ─── STEP 4: Vinvular blog_id ao user_id ──────────────────────────────────
    console.log('\n🔗 [4/5] Vinculando blog_id ao operador...');
    // Atualizar o blog para referênciar o user_id do operador
    const { ok: blogOk, data: blogData } = await supabase(
        'PATCH',
        `/rest/v1/blogs?id=eq.${BLOG_ID}`,
        { user_id: finalUserId },
    );
    if (!blogOk) {
        console.warn('   ⚠️  PATCH no blog retornou:', JSON.stringify(blogData));
        console.warn('   → Execute o SQL abaixo manualmente no Supabase Studio se necessário:');
        console.warn(`   UPDATE blogs SET user_id = '${finalUserId}' WHERE id = '${BLOG_ID}';`);
    } else {
        console.log('   ✅ Blog vinculado ao operador');
    }

    // ─── STEP 5: Autenticar e gerar token de login ────────────────────────────
    console.log('\n🔑 [5/5] Gerando sessão de acesso...');
    const { ok: authOk, data: authData } = await supabase(
        'POST', '/auth/v1/token?grant_type=password',
        { email: OPERATOR_EMAIL, password: OPERATOR_PASS },
        SUPABASE_ANON
    );

    console.log('\n═══════════════════════════════════════════════════════════');
    if (authOk && authData.access_token) {
        console.log('  ✅ OPERADOR PROVISIONADO COM SUCESSO');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('🌐 LOGIN URL:');
        console.log('  ', LOGIN_URL);
        console.log('\n📧 CREDENCIAIS DE ACESSO:');
        console.log('   Email:    ', OPERATOR_EMAIL);
        console.log('   Senha:    ', OPERATOR_PASS);
        console.log('\n🎯 APÓS LOGIN, ACESSE O DASHBOARD:');
        console.log('  ', DASHBOARD_URL);
        console.log('\n🔑 ACCESS TOKEN (para uso programático):');
        console.log('  ', authData.access_token.substring(0, 60) + '...');
        console.log('\n📌 TENANT CONTEXT:');
        console.log('   blog_id:  ', BLOG_ID);
        console.log('   user_id:  ', finalUserId);
        console.log('   subdomain: bione-advocacia.omniseen.app');
        console.log('\n⚠️  PRÓXIMOS PASSOS:');
        console.log('   1. Execute init_bione_advocacia.sql (com user_id acima) no Supabase Studio');
        console.log('   2. Acesse o dashboard e verifique os 6 artigos staged');
        console.log('   3. Injete os dados reais de contato da Bione Advocacia');
    } else {
        console.log('  ✅ OPERADOR PROVISIONADO — mas não foi possível gerar token automático');
        console.log('═══════════════════════════════════════════════════════════\n');
        console.log('🌐 FAÇA LOGIN MANUALMENTE EM:');
        console.log('  ', LOGIN_URL);
        console.log('\n📧 CREDENCIAIS:');
        console.log('   Email:    ', OPERATOR_EMAIL);
        console.log('   Senha:    ', OPERATOR_PASS);
        console.log('\n   Motivo do token falhar:', JSON.stringify(authData?.error || authData?.message || authData));
    }
    console.log('\n');
}

main().catch(err => {
    console.error('❌ Erro inesperado:', err.message);
    process.exit(1);
});
