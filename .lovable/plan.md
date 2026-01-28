
# Correção: Portal Público Exigindo Login Incorretamente

## Diagnóstico Completo

### Problema Confirmado
Ao acessar `https://trulynolen.app.omniseen.app/`, o sistema renderiza a **página de Login** ao invés do blog público.

### Causa Raiz Identificada
A página de login está sendo exibida porque o código em `AppRoutes` está entrando no branch de `PlatformRoutes` ao invés de `SubaccountRouteDecider`. Isso acontece porque:

1. A função `isSubaccountHost()` verifica se o hostname termina com `.app.omniseen.app`
2. Porém, o domínio `trulynolen.app.omniseen.app` pode estar configurado como **redirect** para `app.omniseen.app` no DNS/Cloudflare
3. Ou o Lovable Cloud está servindo o app via um hostname diferente que não corresponde ao padrão esperado

### Verificações Realizadas
| Componente | Status |
|------------|--------|
| Edge Function `content-api` | ✅ Funciona - resolve tenant corretamente |
| Tabela `tenant_domains` | ✅ Domínio cadastrado com status `active` |
| Função RPC `resolve_domain` | ✅ Retorna blog_id correto |
| Roteamento `App.tsx` | ❓ Não está entrando no branch correto |

---

## Análise do Código de Roteamento

### Fluxo Esperado (que deveria funcionar)
```
User acessa trulynolen.app.omniseen.app
  ↓
AppRoutes verifica isSubaccountHost()
  ↓ TRUE (hostname = "trulynolen.app.omniseen.app")
SubaccountRouteDecider
  ↓ pathname = "/" (não é platformPath)
BlogRoutes
  ↓
usePublicDomainResolution → content-api
  ↓
CustomDomainBlog com blogId
```

### Fluxo Atual (com defeito)
```
User acessa trulynolen.app.omniseen.app
  ↓ 
[Infraestrutura] Redirect ou serving do app.omniseen.app
  ↓
AppRoutes verifica isSubaccountHost()
  ↓ FALSE (hostname ≠ "*.app.omniseen.app")
PlatformRoutes
  ↓ pathname = "/"
Navigate to /login
  ↓
Login page
```

---

## Solução em Duas Frentes

### 1. Infraestrutura (Configuração do Lovable Cloud)

O domínio `trulynolen.app.omniseen.app` (e qualquer outro subdomínio de cliente) precisa estar:

- **Configurado como domínio customizado** no projeto Lovable Cloud
- **DNS apontando** para o IP do Lovable (A record para 185.158.133.1)
- **Modo "Active"** (não "Redirect")

### 2. Código (Fallback Robusto)

Mesmo que a infraestrutura esteja correta, vamos adicionar um **fallback mais robusto** no código para:

1. Verificar o hostname de forma mais abrangente
2. Detectar subdomínios mesmo quando há proxying
3. Logar informações de debug para troubleshooting

---

## Alterações no Código

### Arquivo: `src/utils/platformUrls.ts`

Melhorar a função `isSubaccountHost()` para ser mais resiliente:

```typescript
// ANTES
export const isSubaccountHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host.endsWith('.app.omniseen.app') && host !== 'app.omniseen.app';
};

// DEPOIS (com debug e fallback)
export const isSubaccountHost = (): boolean => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  
  // Log para debug em produção
  console.log('[platformUrls] isSubaccountHost check:', { 
    host, 
    endsWithSuffix: host.endsWith('.app.omniseen.app'),
    isNotMain: host !== 'app.omniseen.app'
  });
  
  // Padrão principal: subdomínio do app.omniseen.app
  if (host.endsWith('.app.omniseen.app') && host !== 'app.omniseen.app') {
    return true;
  }
  
  // Fallback: verificar se há meta tag injetada pelo proxy
  const tenantMeta = document.querySelector('meta[name="x-tenant-slug"]');
  if (tenantMeta?.getAttribute('content')) {
    console.log('[platformUrls] isSubaccountHost: found tenant meta tag');
    return true;
  }
  
  return false;
};
```

### Arquivo: `src/App.tsx`

Adicionar mais logging no `AppRoutes` para facilitar debug:

```typescript
const AppRoutes = () => {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'ssr';
  
  // Debug logging para troubleshooting de roteamento
  console.log('[AppRoutes] Host detection:', {
    hostname: host,
    isSubaccount: isSubaccountHost(),
    isCustomDomain: isCustomDomainHost(),
    isPlatform: isPlatformHost(),
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/'
  });

  if (isSubaccountHost()) {
    console.log('[AppRoutes] Subaccount host detected, using SubaccountRouteDecider');
    return <SubaccountRouteDecider />;
  }
  
  if (isCustomDomainHost()) {
    console.log('[AppRoutes] Custom domain host detected, using CustomDomainRouteDecider');
    return <CustomDomainRouteDecider />;
  }
  
  console.log('[AppRoutes] Platform/dev host, using PlatformRoutes');
  return <PlatformRoutes />;
};
```

---

## Ação Imediata Necessária

### Verificar Configuração de Domínios no Lovable Cloud

O usuário (ou administrador) precisa:

1. **Acessar o Lovable Cloud Dashboard** do projeto
2. **Verificar a seção "Domains"** (Domínios)
3. **Confirmar que `trulynolen.app.omniseen.app` está listado** como domínio ativo
4. Se não estiver, **adicionar como domínio customizado**

### Verificar DNS

O domínio `trulynolen.app.omniseen.app` deve ter:
- **A record** apontando para `185.158.133.1` (IP do Lovable)
- **Sem redirect** para outro domínio

---

## Ordem de Implementação

1. **Adicionar logging detalhado** em `isSubaccountHost()` e `AppRoutes`
2. **Publicar e testar** em produção
3. **Analisar os logs** no console do browser ao acessar `trulynolen.app.omniseen.app`
4. Se o hostname estiver correto mas ainda falhar:
   - Verificar se há cache/service worker interferindo
   - Verificar configuração de domínio no Lovable Cloud
5. Se o hostname estiver errado (mostrando outro domínio):
   - O problema é de infraestrutura/DNS
   - Corrigir configuração de domínio

---

## Testes de Validação

### Após correção, confirmar:

| Cenário | URL | Resultado Esperado |
|---------|-----|-------------------|
| Portal público | `https://trulynolen.app.omniseen.app/` | Blog público (sem login) |
| Artigo público | `https://trulynolen.app.omniseen.app/dedetizacao-profissional` | Artigo público (sem login) |
| Login do subdomínio | `https://trulynolen.app.omniseen.app/login` | Página de login |
| Dashboard | `https://trulynolen.app.omniseen.app/client/dashboard` | Redireciona para login se não logado |

---

## Arquivos a Modificar

1. `src/utils/platformUrls.ts` - Melhorar `isSubaccountHost()` com logging
2. `src/App.tsx` - Adicionar logging detalhado em `AppRoutes`

---

## Nota Importante

Se o logging mostrar que o `window.location.hostname` está retornando `app.omniseen.app` ou outro domínio (não `trulynolen.app.omniseen.app`), o problema é **100% de infraestrutura**:

- O DNS está configurado com redirect ao invés de proxy/CNAME
- Ou o Lovable Cloud está servindo o app de forma incorreta para esse domínio

Nesse caso, a solução é **configurar corretamente o domínio no Lovable Cloud e no DNS**.
