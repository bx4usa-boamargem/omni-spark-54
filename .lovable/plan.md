
# Plano: Unificar Experiência Visual de "Meus Artigos" com "Super Páginas"

## Análise Comparativa

### Estado Atual

| Aspecto | Super Páginas | Meus Artigos |
|---------|---------------|--------------|
| Layout | Grid de cards (1-4 colunas) | Lista/tabela com checkboxes |
| Thumbnail | Imagem hero ou placeholder colorido | Sem thumbnail (apenas alerta "Sem imagem") |
| Ações | Botões Abrir/Editar + Menu dropdown | Menu dropdown apenas |
| Filtros | Tabs estilizados (Todas/Pub/Rasc/Arq) + Busca | Tabs com badges de contagem + Busca |
| Hover | Scale 105% na imagem, shadow-lg | Background muted/30 |
| Cards | Rounded, border, shadow-sm | Listagem dividida por border |
| Estado Vazio | Card com CTA para criar | Lista vazia com CTA |

### Objetivo

Transformar `ClientArticles.tsx` para usar o mesmo padrão visual de `ClientLandingPages.tsx`:
- Grid responsivo de cards (1-4 colunas)
- Card com thumbnail (imagem ou placeholder com inicial)
- Badge de status colorido
- Data de criação/publicação
- Ações rápidas visíveis (Abrir/Editar) + menu dropdown (Duplicar/Arquivar/Excluir)

---

## Arquitetura da Solução

### 1. Criar Componente ArticleCard

Novo componente `ArticleCard.tsx` seguindo o mesmo padrão de `LandingPageCard.tsx`:

```typescript
interface ArticleCardProps {
  article: Article;
  publicBaseUrl: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onView: () => void;
}
```

**Estrutura visual do card:**
```text
┌─────────────────────────────────────┐
│  ┌───────────────────────────────┐  │
│  │   THUMBNAIL / PLACEHOLDER     │  │  ← aspect-video
│  │   (imagem ou inicial)         │  │
│  │                    [BADGE     │  │  ← Badge de origem (Radar/Funil/Auto)
│  │                     ORIGEM]   │  │
│  └───────────────────────────────┘  │
│                                     │
│  Título do Artigo (line-clamp-2)    │
│  Categoria • Origem                 │  ← Metadados secundários
│                                     │
│  [Badge Status]     12 Jan 2026     │  ← Status + data
│  ─────────────────────────────────  │
│  [Abrir]  [Editar]           [...] │  ← Ações
└─────────────────────────────────────┘
```

### 2. Criar Hook useArticleFilters

Similar ao `useLandingPageFilters`, para gerenciar estado dos filtros de forma isolada:

```typescript
export function useArticleFilters(articles: Article[]) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArticles = useMemo(() => {
    // Lógica de filtragem
  }, [articles, statusFilter, searchQuery]);

  const statusCounts = useMemo(() => {
    // Contagem por status
  }, [articles]);

  return {
    statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    filteredArticles,
    statusCounts
  };
}
```

### 3. Criar Componente ArticleFilters

Similar ao `LandingPageFilters.tsx`:

```typescript
export function ArticleFilters({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  statusCounts,
}: ArticleFiltersProps)
```

Diferença: inclui contagem (badges) em cada tab, como já existe na versão atual.

### 4. Refatorar ClientArticles.tsx

Substituir a listagem em tabela por grid de cards:

```tsx
{/* Grid de Cards */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {filteredArticles.map((article) => (
    <ArticleCard
      key={article.id}
      article={article}
      publicBaseUrl={publicBaseUrl}
      onEdit={() => handleEdit(article.id)}
      onDuplicate={() => handleDuplicate(article.id)}
      onArchive={() => handleArchive(article.id)}
      onRestore={() => handleRestore(article.id)}
      onDelete={() => handleDeleteClick(article.id)}
      onView={() => handleView(article)}
    />
  ))}
</div>
```

---

## Detalhes de Implementação

### Placeholder de Thumbnail

Para artigos sem imagem, usar placeholder colorido baseado no status de origem:

```typescript
const originColors: Record<string, { bg: string; text: string }> = {
  radar: { bg: "bg-purple-500", text: "text-white" },      // Via Radar
  funnel: { bg: "bg-orange-500", text: "text-white" },     // Via Funil
  automation: { bg: "bg-blue-500", text: "text-white" },   // Via Automação
  manual: { bg: "bg-slate-500", text: "text-white" },      // Manual
};
```

Se o artigo tem `featured_image_url`, mostrar a imagem.
Se não, mostrar placeholder com a inicial do título.

### Badge de Origem no Thumbnail

Similar às Super Páginas que mostram "SEO Score", mostrar badge de origem no canto superior direito:
- Radar (roxo)
- Funil (laranja)
- Auto (azul)

### Remoção de Funcionalidades de Lista

| Funcionalidade | Decisão |
|----------------|---------|
| Checkboxes para seleção múltipla | Remover (não existe em Super Páginas) |
| Bulk actions (arquivar/excluir em massa) | Remover |
| Paginação | Manter se >12 artigos ou usar scroll infinito |
| Detecção de duplicados | Manter como alerta no topo |

### Manutenção de Funcionalidades

- Manter o modal de resolução de duplicados
- Manter os diálogos de confirmação de exclusão
- Manter a funcionalidade de duplicar artigo (nova ação)

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/components/client/articles/ArticleCard.tsx` | Criar | Card de artigo seguindo padrão LandingPageCard |
| `src/components/client/articles/ArticleFilters.tsx` | Criar | Filtros com contagem (similar a LandingPageFilters) |
| `src/pages/client/ClientArticles.tsx` | Modificar | Refatorar para usar grid de cards |

---

## Estrutura do ArticleCard

```tsx
export function ArticleCard({
  article,
  publicBaseUrl,
  onEdit,
  onDuplicate,
  onArchive,
  onRestore,
  onDelete,
  onView,
}: ArticleCardProps) {
  // Determinar thumbnail
  const heroImage = article.featured_image_url;
  const originType = getOriginType(article); // radar | funnel | automation | manual
  const colors = originColors[originType];
  
  return (
    <Card className="group overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-muted">
        {heroImage ? (
          <img src={heroImage} ... />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center", colors.bg)}>
            <span className="text-6xl font-bold opacity-30">{article.title.charAt(0)}</span>
          </div>
        )}
        
        {/* Origin Badge */}
        {originType !== 'manual' && (
          <div className="absolute top-2 right-2">
            <Badge>...</Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-base line-clamp-2">{article.title}</h3>
        
        <div className="flex items-center justify-between">
          {getStatusBadge(article.status)}
          <span className="text-xs text-muted-foreground">
            {format(date, "d MMM yyyy", { locale: ptBR })}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {article.status === "published" && (
            <Button variant="outline" size="sm" onClick={onView}>
              <Globe /> Abrir
            </Button>
          )}
          <Button variant="..." size="sm" onClick={onEdit}>
            <Pencil /> Editar
          </Button>
          <DropdownMenu>
            {/* Duplicar, Arquivar/Restaurar, Excluir */}
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Fluxo Visual Comparativo

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      ANTES (ClientArticles)                        │
├─────────────────────────────────────────────────────────────────────┤
│  [x] Título                              Status      Data    [...]  │
│  ─────────────────────────────────────────────────────────────────  │
│  [ ] Artigo sobre pragas                 Publicado   12 Jan   [...]  │
│  [ ] Como dedetizar...                   Rascunho    10 Jan   [...]  │
│  [ ] Controle de pragas em...            Arquivado   08 Jan   [...]  │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      DEPOIS (Grid de Cards)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  [Imagem]   │  │  [Inicial]  │  │  [Imagem]   │  │  [Inicial]  │ │
│  │             │  │     D       │  │             │  │     C       │ │
│  │ Artigo...   │  │ Dedetiza... │  │ Pragas...   │  │ Controle... │ │
│  │ Publicado   │  │ Rascunho    │  │ Publicado   │  │ Arquivado   │ │
│  │[Abrir][Ed.] │  │   [Editar]  │  │[Abrir][Ed.] │  │   [Editar]  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Considerações Adicionais

### Paginação vs Scroll Infinito

Para manter consistência com Super Páginas (que não tem paginação visível), a opção é:
1. Mostrar todos os artigos se forem poucos (<20)
2. Implementar lazy loading ou "Carregar mais" se forem muitos

### Funcionalidade de Duplicar Artigo

Será necessário implementar a função `handleDuplicate` em `ClientArticles.tsx`:

```typescript
const handleDuplicate = async (id: string) => {
  const article = articles.find(a => a.id === id);
  if (!article || !blog?.id) return;
  
  const { data, error } = await supabase
    .from('articles')
    .insert({
      blog_id: blog.id,
      title: `${article.title} (cópia)`,
      slug: `${article.slug}-copia-${Date.now()}`,
      status: 'draft',
      // ... copiar outros campos relevantes
    })
    .select()
    .single();
    
  if (!error) {
    toast.success("Artigo duplicado!");
    fetchArticles();
  }
};
```

---

## Resultado Esperado

Após a implementação:

1. Interface **visualmente unificada** entre Artigos e Super Páginas
2. **Grid responsivo** de cards (1 coluna mobile → 4 colunas desktop)
3. **Thumbnails** com imagem ou placeholder colorido
4. **Badges de origem** visíveis (Radar/Funil/Auto)
5. **Ações rápidas** acessíveis (Abrir/Editar no card + menu dropdown)
6. **Filtros** mantidos com contagem por status
7. **Experiência profissional** consistente em todo o produto
