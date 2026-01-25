
# Plano de Execução: 5 Correções Críticas do Sistema CMS

## Objetivo
Implementar as 5 correções faltantes para eliminar estados fantasmas e garantir ciclo de vida confiável.

---

## Correção 1: Reset de Form ao Abrir Diálogo

**Arquivo:** `src/components/cms/CMSIntegrationCenterSheet.tsx`

**Mudança:** Adicionar `useEffect` após linha 138

```typescript
// ADICIONAR após as declarações de estado (linha ~138):
useEffect(() => {
  if (addDialogOpen) {
    setSelectedPlatform(null);
    setFormData({});
  }
}, [addDialogOpen]);
```

**Resultado:** Formulário sempre abre limpo, sem dados de tentativas anteriores.

---

## Correção 2: Campos WordPress.org Visíveis Primeiro

**Arquivo:** `src/components/cms/CMSIntegrationCenterSheet.tsx`

**Mudança:** Reordenar o conteúdo do `TabsContent` (linhas 589-660)

- ANTES: Alert com link → Campos
- DEPOIS: Campos destacados → Link secundário

```typescript
{!platform.oauthButton && (
  <div className="space-y-4">
    {/* CAMPOS PRIMEIRO - destacados em box */}
    <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
      {platform.fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <Label className="font-semibold">{field.label}</Label>
          <Input ... />
        </div>
      ))}
      <Button size="lg">Conectar {platform.name}</Button>
    </div>
    
    {/* Link de ajuda DEPOIS - discreto */}
    {platform.helpLink && (
      <div className="text-center">
        <a className="text-xs text-muted-foreground">
          Como obter credenciais...
        </a>
      </div>
    )}
  </div>
)}
```

**Resultado:** Usuário vê campos imediatamente ao selecionar WordPress.org.

---

## Correção 3: Explicação Antes do OAuth WordPress.com

**Arquivo:** `src/components/cms/CMSIntegrationCenterSheet.tsx`

**Mudança:** Adicionar Alert explicativo antes do botão OAuth

```typescript
{platform.oauthButton && (
  <div className="space-y-4">
    {/* NOVO: Explicação do fluxo */}
    <Alert className="bg-blue-50 border-blue-200">
      <AlertCircle className="h-4 w-4 text-blue-600" />
      <AlertDescription>
        <p className="font-medium">Autenticação WordPress.com</p>
        <ul className="text-xs mt-2 list-disc ml-4">
          <li>Você será redirecionado para WordPress.com</li>
          <li>Autorize o OmniSeen a publicar</li>
          <li>Após autorizar, a conexão será salva</li>
        </ul>
      </AlertDescription>
    </Alert>
    
    {/* Botão OAuth - ação consciente */}
    <Button onClick={handleWordPressComOAuth}>
      Conectar com WordPress.com
    </Button>
  </div>
)}
```

**Resultado:** OAuth só dispara quando usuário clica conscientemente após ler explicação.

---

## Correção 4: OAuth State Único

**Arquivo:** `supabase/functions/wordpress-com-oauth/index.ts`

**Mudança 1:** Função `getAuthorizationUrl()` (linha 33)

```typescript
// ANTES:
state: blogId,

// DEPOIS:
const uniqueState = `${blogId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
// ...
state: uniqueState,
```

**Mudança 2:** Handler de callback (linha ~152)

```typescript
// Extrair blogId do state único
const extractedBlogId = blogId?.split('_')[0] || blogId;
// Usar extractedBlogId no resto da lógica
```

**Resultado:** Cada tentativa de OAuth usa state único, prevenindo conflitos e CSRF.

---

## Correção 5: Refetch ao Fechar Central

**Arquivo:** `src/pages/client/ClientArticleEditor.tsx`

**Mudança:** Adicionar `useEffect` após linha 146

```typescript
// Forçar refetch quando a Central fecha
useEffect(() => {
  if (!showCMSCenter) {
    refetchIntegrations();
  }
}, [showCMSCenter, refetchIntegrations]);
```

**Resultado:** Editor sempre sincronizado com estado real após operações na Central.

---

## Resumo de Arquivos

| Arquivo | Correções |
|---------|-----------|
| `src/components/cms/CMSIntegrationCenterSheet.tsx` | #1, #2, #3 |
| `supabase/functions/wordpress-com-oauth/index.ts` | #4 |
| `src/pages/client/ClientArticleEditor.tsx` | #5 |

---

## Após Implementação

1. Deploy automático das edge functions
2. Testes dos 6 critérios de aceite
3. Entrega de evidências funcionais

---

## Critérios de Aceite (Binários)

| # | Critério | Correção |
|---|----------|----------|
| 1 | Adicionar abre limpo | #1 |
| 2 | WordPress.org campos visíveis | #2 |
| 3 | WordPress.com OAuth consciente | #3 |
| 4 | OAuth state único | #4 |
| 5 | Desconectar remove da publicação | Já existe |
| 6 | Central lista todas integrações | Já existe |

Ao aprovar, executarei todas as 5 correções e entregarei diffs reais + confirmação de deploy.
