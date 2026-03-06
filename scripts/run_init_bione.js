#!/usr/bin/env node
/**
 * OMNISEEN — Tenant Production Initialization Runner
 * Tenant: Bione Advocacia | CLU-BIONE-PREV-001
 * 
 * Executa o script SQL de inicialização via Supabase CLI.
 * Uso: node scripts/run_init_bione.js
 * 
 * Pré-requisito: supabase CLI instalado e linkado ao projeto
 * (supabase link --project-ref oxbrvyinmpbkllicaxqk)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SQL_FILE = path.join(__dirname, 'init_bione_advocacia.sql');
const PROJECT_REF = 'oxbrvyinmpbkllicaxqk';

// ─────────────────────────────────────────────
// ATENÇÃO: Substitua antes de executar
// ─────────────────────────────────────────────
const PLACEHOLDERS = {
    '<SUPABASE_USER_ID>': process.env.BIONE_USER_ID || 'SUBSTITUIR_USER_ID',
    '<PHONE>': process.env.BIONE_PHONE || '+55 98 XXXXX-XXXX',
    '<WEBSITE>': process.env.BIONE_WEBSITE || 'https://bioneadvocacia.com.br',
    '<EMAIL>': process.env.BIONE_EMAIL || 'contato@bioneadvocacia.com.br',
};
// ─────────────────────────────────────────────

console.log('\n═══════════════════════════════════════════════════════');
console.log('  OMNISEEN — TENANT INIT: Bione Advocacia');
console.log('  Cluster: CLU-BIONE-PREV-001');
console.log('═══════════════════════════════════════════════════════\n');

// Verificar se placeholders foram substituídos
const missingPlaceholders = Object.entries(PLACEHOLDERS)
    .filter(([_, v]) => v.includes('SUBSTITUIR') || v.includes('XXXXX'));

if (missingPlaceholders.length > 0) {
    console.warn('⚠️  ATENÇÃO: Placeholders não substituídos:');
    missingPlaceholders.forEach(([k, v]) => console.warn(`   ${k} = ${v}`));
    console.warn('\nDefina as variáveis de ambiente antes de executar:');
    console.warn('  export BIONE_USER_ID="uuid-do-usuario-admin"');
    console.warn('  export BIONE_PHONE="+55 98 99999-9999"');
    console.warn('  export BIONE_WEBSITE="https://bioneadvocacia.com.br"');
    console.warn('  export BIONE_EMAIL="contato@bioneadvocacia.com.br"');
    console.warn('\nContinuando com valores placeholder...\n');
}

// Ler e substituir placeholders no SQL
let sql = fs.readFileSync(SQL_FILE, 'utf8');
for (const [placeholder, value] of Object.entries(PLACEHOLDERS)) {
    sql = sql.replaceAll(placeholder, value);
}

// Escrever SQL temporário com valores substituídos
const tmpFile = path.join(__dirname, '_tmp_init_bione.sql');
fs.writeFileSync(tmpFile, sql);

try {
    console.log('📡 Conectando ao Supabase...');
    console.log(`   Project: ${PROJECT_REF}.supabase.co\n`);

    // Executar via supabase CLI
    const cmd = `supabase db execute --project-ref ${PROJECT_REF} < "${tmpFile}"`;

    console.log('🚀 Executando script de inicialização...\n');
    const output = execSync(cmd, {
        encoding: 'utf8',
        cwd: path.join(__dirname, '..'),
    });

    console.log(output || '');

    fs.unlinkSync(tmpFile);

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  ✅ TENANT INITIALIZED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════════════════');
    console.log('\n📋 IDs gerados:');
    console.log('  blog_id / tenant_id : 44c4f7cd-05b0-4229-9828-2eb822d38bfd');
    console.log('  cluster_id          : 941159f4-8ff8-4c70-b39f-8eec0b453c45');
    console.log('\n📄 Articles:');
    console.log('  PILLAR : 3d7b69eb-13d0-4ca7-93b3-a0db4f8d5679 → /aposentadoria-por-invalidez-em-sao-luis');
    console.log('  S01    : dbe957ec-5d3d-409a-b585-7cc0e2474139 → /auxilio-doenca-em-sao-luis');
    console.log('  S02    : 2256d1ee-2ed0-492c-a57a-c19ed911983e → /beneficio-negado-inss-sao-luis');
    console.log('  S03    : c50e0ed1-aa46-430e-8afe-130b74217f25 → /pericia-medica-inss-sao-luis');
    console.log('  S04    : 64a0ac9d-3030-4686-a4ad-dd19d61d9eef → /revisao-beneficio-previdenciario-sao-luis');
    console.log('  S05    : 0943fa2a-6396-4192-83ae-5eaa151bce78 → /advogado-previdenciario-sao-luis');
    console.log('\n🌐 Preview URL:');
    console.log('  https://bione-advocacia.omniseen.app');
    console.log('\n📌 Próximos passos:');
    console.log('  1. Preencher coluna "content" dos artigos com o markdown gerado');
    console.log('  2. Executar generate-image para os 4 artigos com contexto "hero"');
    console.log('  3. Configurar CMS integration (WordPress/site da Bione) se aplicável');
    console.log('  4. Publicar na ordem: PILLAR → S05 → S01+S02 → S03+S04\n');

} catch (err) {
    // Limpar arquivo temporário em caso de erro
    try { fs.unlinkSync(tmpFile); } catch { }

    console.error('\n❌ ERRO na inicialização do tenant:');
    console.error(err.message);
    console.error('\n💡 Alternativa: execute o SQL diretamente no Supabase Studio:');
    console.error(`   https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
    console.error(`   Arquivo: scripts/init_bione_advocacia.sql\n`);
    process.exit(1);
}
