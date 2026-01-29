
# Corrigir Link do Gerador Avançado no Menu

## Problema Identificado

O menu lateral ("Hub de Conteúdo") aponta "Gerar Artigo" para `/client/create` (fluxo rápido) em vez de `/client/articles/generate` (gerador avançado com todos os controles do Article Engine).

## Solução Proposta

Atualizar o `ContentHubPanel.tsx` para ter **duas opções**:
1. **Gerar Artigo (Rápido)** → `/client/create`
2. **Gerar Artigo (Avançado)** → `/client/articles/generate`

OU substituir o link atual para ir diretamente ao gerador avançado.

---

## Arquivo a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/layout/PremiumSidebar/ContentHubPanel.tsx` | Atualizar path ou adicionar item |

---

## Opção A: Substituir Link (Mais Simples)

Modificar o item "Gerar Artigo" para apontar para o gerador avançado:

```typescript
// Linha 19-26 em ContentHubPanel.tsx
{
  id: 'generate',
  icon: Sparkles,
  iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  title: 'Gerar Artigo',
  subtitle: 'Interface avançada com controles do Article Engine',
  path: '/client/articles/generate', // ← MUDANÇA
  highlight: true,
},
```

---

## Opção B: Dois Itens (Mais Completo)

Adicionar dois itens separados no menu:

```typescript
const contentItems = [
  // ... radar
  {
    id: 'generate-quick',
    icon: Zap,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    title: 'Criar Artigo Rápido',
    subtitle: 'Geração simplificada em poucos cliques',
    path: '/client/create',
  },
  {
    id: 'generate-advanced',
    icon: Sparkles,
    iconBg: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    title: 'Gerar Artigo Avançado',
    subtitle: 'Controle total: nicho, template, E-E-A-T',
    path: '/client/articles/generate',
    highlight: true,
  },
  // ... articles, portal, landing-pages
];
```

---

## Recomendação

**Opção A** é mais simples e direta. Se o usuário quer acesso rápido, pode clicar em uma oportunidade no Radar.

O gerador avançado (`/client/articles/generate`) é a interface completa com:
- Seleção de nicho (13 opções)
- Modo Entry/Authority
- Template override
- Toggles: Web Research, E-E-A-T, ALT contextual
- Preview de estrutura antes de gerar

---

## Checklist

- [ ] Atualizar `path` do item "Gerar Artigo" de `/client/create` para `/client/articles/generate`
- [ ] Atualizar `subtitle` para refletir os recursos avançados
- [ ] Testar navegação pelo menu
- [ ] Verificar que formulário carrega com todos os campos
