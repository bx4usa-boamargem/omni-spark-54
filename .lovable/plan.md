
# Plano: Suporte Nativo ao WordPress.com via OAuth

## Visão Geral

O WordPress.com (hospedado pela Automattic) **não suporta** a API REST padrão (`/wp-json/wp/v2`) com Application Passwords em planos gratuito e pessoal. Para publicar nesses sites, é obrigatório usar a **API pública do WordPress.com** (`public-api.wordpress.com`) com autenticação **OAuth 2.0**.

Este plano implementa o fluxo completo, similar a como o SEOwriting.ai, Zapier e Buffer fazem.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO DE CONEXÃO                                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  1. Usuário clica "Conectar com WordPress.com"                                  │
│     ↓                                                                           │
│  2. Edge Function gera URL OAuth                                                │
│     → https://public-api.wordpress.com/oauth2/authorize                        │
│     ↓                                                                           │
│  3. Usuário autoriza no WordPress.com                                           │
│     ↓                                                                           │
│  4. Callback recebe código de autorização                                       │
│     ↓                                                                           │
│  5. Troca código por access_token + refresh_token                               │
│     ↓                                                                           │
│  6. Tokens armazenados criptografados no banco                                  │
│     ↓                                                                           │
│  7. Publicação via: POST /sites/{site_id}/posts/new                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Necessárias

### 1. Migração de Banco de Dados

**Adicionar colunas para OAuth na tabela `cms_integrations`:**

```sql
-- Tipo de autenticação: 'api_key' (Application Passwords) ou 'oauth'
ALTER TABLE cms_integrations ADD COLUMN IF NOT EXISTS 
  auth_type TEXT DEFAULT 'api_key';

-- Token de acesso OAuth (criptografado)
ALTER TABLE cms_integrations ADD COLUMN IF NOT EXISTS 
  access_token_encrypted BYTEA;

-- Refresh token OAuth (criptografado)  
ALTER TABLE cms_integrations ADD COLUMN IF NOT EXISTS 
  refresh_token_encrypted BYTEA;

-- Expiração do token
ALTER TABLE cms_integrations ADD COLUMN IF NOT EXISTS 
  token_expires_at TIMESTAMPTZ;

-- ID numérico do site no WordPress.com
ALTER TABLE cms_integrations ADD COLUMN IF NOT EXISTS 
  wordpress_site_id TEXT;
```

**Atualizar view decrypted:**

```sql
CREATE OR REPLACE VIEW cms_integrations_decrypted AS
SELECT 
  id, blog_id, platform, site_url, auth_type, wordpress_site_id,
  COALESCE(decrypt_credential(api_key_encrypted, blog_id), api_key) AS api_key,
  COALESCE(decrypt_credential(api_secret_encrypted, blog_id), api_secret) AS api_secret,
  decrypt_credential(access_token_encrypted, blog_id) AS access_token,
  decrypt_credential(refresh_token_encrypted, blog_id) AS refresh_token,
  token_expires_at,
  username, is_active, auto_publish, last_sync_at, last_sync_status, 
  created_at, updated_at
FROM cms_integrations;
```

---

### 2. Nova Edge Function: `wordpress-com-oauth`

**Arquivo:** `supabase/functions/wordpress-com-oauth/index.ts`

Esta função gerencia todo o fluxo OAuth 2.0:

| Ação | Descrição |
|------|-----------|
| `authorize` | Gera URL de autorização OAuth para redirecionar usuário |
| `callback` | Recebe código de autorização e troca por tokens |
| `refresh` | Renova access_token quando expirado |
| `get-sites` | Lista sites do usuário autenticado |

**Fluxo de autorização:**

1. Frontend chama `{ action: "authorize", blogId }` 
2. Retorna URL para `public-api.wordpress.com/oauth2/authorize`
3. Usuário autoriza e é redirecionado para callback
4. Callback extrai código e chama `{ action: "callback", code, blogId }`
5. Função troca código por tokens via `POST /oauth2/token`
6. Tokens são criptografados e salvos na tabela

**Endpoints WordPress.com utilizados:**

- `POST /oauth2/token` - Troca código por tokens
- `GET /rest/v1.1/me/sites` - Lista sites do usuário
- `POST /rest/v1.1/sites/{id}/posts/new` - Criar post
- `POST /rest/v1.1/sites/{id}/posts/{postId}` - Atualizar post

---

### 3. Atualizar Edge Function: `publish-to-cms`

**Arquivo:** `supabase/functions/publish-to-cms/index.ts`

**Mudanças principais:**

#### 3.1 Detectar tipo de WordPress

```typescript
function isWordPressDotCom(siteUrl: string): boolean {
  const url = siteUrl.toLowerCase();
  return url.includes('.wordpress.com') || url.includes('wpcomstaging.com');
}
```

#### 3.2 Novas funções para WordPress.com API

```typescript
// Testar conexão WordPress.com
async function testWordPressComConnection(accessToken: string, siteId: string)

// Detectar blog WordPress.com
async function detectWordPressComBlog(accessToken: string, siteId: string)

// Criar post via API WordPress.com
async function createWordPressComPost(
  accessToken: string, 
  siteId: string, 
  article: ArticleData
)

// Atualizar post via API WordPress.com
async function updateWordPressComPost(
  accessToken: string, 
  siteId: string, 
  postId: string,
  article: ArticleData
)
```

#### 3.3 Validação robusta de resposta

```typescript
// Antes de declarar sucesso, verificar dados reais
if (response.ok) {
  const post = await response.json();
  if (post && post.ID && post.URL) {
    return { success: true, postId: String(post.ID), postUrl: post.URL };
  }
  console.error("WordPress.com returned OK but invalid data:", post);
  return { success: false, message: "WordPress não retornou dados válidos" };
}
```

#### 3.4 Refresh automático de token expirado

```typescript
// Se token expirado, tentar refresh antes de falhar
if (integration.token_expires_at && new Date(integration.token_expires_at) < new Date()) {
  const refreshed = await refreshWordPressComToken(integration);
  if (!refreshed.success) {
    return { success: false, code: 'TOKEN_EXPIRED', message: 'Reconecte sua conta WordPress.com' };
  }
}
```

---

### 4. Atualizar Componente: `CMSIntegrationsTab.tsx`

**Arquivo:** `src/components/blog-editor/CMSIntegrationsTab.tsx`

**Mudanças:**

#### 4.1 Separar WordPress.org e WordPress.com nas opções

```typescript
const PLATFORMS: PlatformConfig[] = [
  {
    id: "wordpress",
    name: "WordPress.org",
    description: "Para sites WordPress auto-hospedados",
    icon: "🔵",
    authType: "application-password",
    fields: [...] // Campos atuais (URL, usuário, senha de aplicativo)
  },
  {
    id: "wordpress-com",
    name: "WordPress.com",
    description: "Para sites hospedados no WordPress.com",
    icon: "🌐",
    authType: "oauth",
    oauthButton: true,
    helpText: "Conecte via OAuth com um clique"
  },
  // Wix continua igual...
];
```

#### 4.2 Botão OAuth para WordPress.com

```tsx
{platform.authType === 'oauth' && (
  <Button onClick={handleWordPressComOAuth} className="w-full gap-2">
    <ExternalLink className="h-4 w-4" />
    Conectar com WordPress.com
  </Button>
)}
```

#### 4.3 Detecção automática ao inserir URL

```typescript
const handleSiteUrlChange = (url: string) => {
  if (url.includes('.wordpress.com')) {
    setSelectedPlatform('wordpress-com');
    toast.info('WordPress.com detectado! Use OAuth para conectar.');
  }
};
```

#### 4.4 Página de callback OAuth

Criar componente para receber o código de autorização após redirecionamento do WordPress.com e completar a conexão.

---

### 5. Atualizar Hook: `useCMSIntegrations.ts`

**Arquivo:** `src/hooks/useCMSIntegrations.ts`

- Adicionar função `initiateWordPressComOAuth(blogId)` para iniciar fluxo OAuth
- Adicionar função `completeWordPressComOAuth(code, blogId)` para finalizar conexão
- Atualizar tipo `CMSIntegration` com novos campos OAuth

---

### 6. Secrets Necessários

**Novos secrets a configurar no projeto:**

| Nome | Descrição |
|------|-----------|
| `WORDPRESS_COM_CLIENT_ID` | Client ID da aplicação WordPress.com |
| `WORDPRESS_COM_CLIENT_SECRET` | Client Secret da aplicação |
| `WORDPRESS_COM_REDIRECT_URI` | URL de callback (ex: `https://omniseenapp.lovable.app/cms/wordpress-callback`) |

**Nota:** Será necessário criar uma aplicação no WordPress.com Developer Console.

---

## Fluxo do Usuário Final

### Cenário: Conectar WordPress.com

1. Usuário vai em "Integrações CMS"
2. Clica em "Adicionar"
3. Seleciona aba "WordPress.com"
4. Clica no botão "Conectar com WordPress.com"
5. É redirecionado para tela de autorização do WordPress.com
6. Autoriza o acesso
7. Retorna ao OmniSeen com conexão estabelecida
8. Pode publicar artigos diretamente

---

## Arquivos Afetados

| Arquivo | Tipo |
|---------|------|
| `supabase/functions/wordpress-com-oauth/index.ts` | Criar |
| `supabase/functions/publish-to-cms/index.ts` | Modificar |
| `src/components/blog-editor/CMSIntegrationsTab.tsx` | Modificar |
| `src/hooks/useCMSIntegrations.ts` | Modificar |
| `src/pages/cms/WordPressCallback.tsx` | Criar |
| `supabase/config.toml` | Modificar |
| Migração SQL | Criar |

---

## API WordPress.com vs WordPress.org

| Aspecto | WordPress.org | WordPress.com |
|---------|---------------|---------------|
| **Autenticação** | Basic Auth (Application Password) | OAuth 2.0 Bearer Token |
| **Endpoint base** | `{site}/wp-json/wp/v2/` | `public-api.wordpress.com/rest/v1.1/sites/{id}/` |
| **Criar post** | `POST .../posts` | `POST .../posts/new` |
| **ID do post** | `post.id` | `post.ID` (maiúsculo) |
| **URL do post** | `post.link` | `post.URL` (maiúsculo) |
| **Identificador** | URL do site | Site ID numérico |

---

## Pré-requisito: Criar Aplicação WordPress.com

Antes de implementar, você precisará criar uma aplicação no WordPress.com:

1. Acesse [WordPress.com Developer Console](https://developer.wordpress.com/apps/)
2. Clique em "Create New Application"
3. Preencha:
   - **Name**: OmniSeen
   - **Description**: Publicação automatizada de artigos
   - **Website URL**: https://omniseenapp.lovable.app
   - **Redirect URLs**: https://omniseenapp.lovable.app/cms/wordpress-callback
   - **Type**: Web
4. Obtenha o Client ID e Client Secret

---

## Ordem de Implementação

1. **Pré-requisito**: Criar aplicação WordPress.com e obter credenciais
2. **Secrets**: Configurar `WORDPRESS_COM_CLIENT_ID`, `WORDPRESS_COM_CLIENT_SECRET`, `WORDPRESS_COM_REDIRECT_URI`
3. **Migração SQL**: Adicionar colunas OAuth na tabela
4. **Edge Function OAuth**: Implementar `wordpress-com-oauth`
5. **Atualizar publish-to-cms**: Adicionar funções WordPress.com
6. **Componente Callback**: Criar página de callback OAuth
7. **UI**: Atualizar `CMSIntegrationsTab` com nova opção
8. **Hook**: Atualizar `useCMSIntegrations`
9. **Testes**: Validar fluxo completo
