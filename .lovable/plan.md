
# Adicionar Link "Painel Admin" no Sidebar para Conta Master

## Problema

O `PremiumSidebar` recebe `isPlatformAdmin` mas nunca repassa para `AccountFooter`, `AccountHubPanel` ou `MobileDrawer`. O usuario `omniseenblog@gmail.com` (que tem role `platform_admin`) nao ve o link de acesso ao painel administrativo.

## Implementacao

### 1. PremiumSidebar.tsx
- Passar `isPlatformAdmin` para `AccountFooter` (linha 117)
- Passar `isPlatformAdmin` para `MobileDrawer` (linha 126)

### 2. AccountFooter.tsx
- Adicionar `isPlatformAdmin?: boolean` na interface
- Repassar para `AccountHubPanel`

### 3. MobileDrawer.tsx
- Adicionar `isPlatformAdmin?: boolean` na interface
- Repassar para `AccountHubPanel`

### 4. AccountHubPanel.tsx
- Adicionar `isPlatformAdmin?: boolean` na interface
- Importar icone `Shield` do lucide-react
- Quando `isPlatformAdmin === true`, renderizar item extra na secao "Sistema":
  - Icone: Shield com fundo vermelho/laranja
  - Titulo: "Painel Admin"
  - Subtitulo: "Gestao da plataforma"
  - Path: `/admin`
- Posicionar antes do item "Configuracoes" para destaque

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `PremiumSidebar.tsx` | Repassar `isPlatformAdmin` para AccountFooter e MobileDrawer |
| `AccountFooter.tsx` | Receber e repassar prop |
| `MobileDrawer.tsx` | Receber e repassar prop |
| `AccountHubPanel.tsx` | Renderizar item "Painel Admin" condicionalmente |

### O que NAO sera alterado
- Logica de verificacao de roles (ja funciona)
- Rotas do App.tsx
- Nenhum outro componente
