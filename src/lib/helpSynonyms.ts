// Mapeamento de sinônimos para busca inteligente no Centro de Ajuda
export const helpSynonyms: Record<string, string[]> = {
  // Onboarding
  "onboarding": ["começar", "criar blog", "primeiro acesso", "configuração inicial", "setup"],
  "criar blog": ["onboarding", "novo blog", "começar", "primeiro blog"],
  "logo": ["marca", "branding", "imagem", "identidade"],
  "favicon": ["ícone", "aba", "navegador"],
  
  // Dashboard
  "dashboard": ["painel", "início", "home", "principal", "overview"],
  "painel": ["dashboard", "início", "home", "principal"],
  "estatísticas": ["stats", "números", "métricas", "dados"],
  
  // Engajamento e Analytics
  "engajamento": ["engagement", "interação", "métricas", "analytics"],
  "analytics": ["análise", "métricas", "dados", "estatísticas", "desempenho"],
  "scroll": ["rolagem", "profundidade", "leitura"],
  "retenção": ["retention", "permanência", "tempo"],
  "visitantes": ["visitors", "usuários", "leitores", "tráfego"],
  "cta": ["call-to-action", "botão", "conversão", "clique"],
  
  // SEO
  "seo": ["otimização", "google", "rankeamento", "busca", "pesquisa"],
  "cluster": ["agrupamento", "pilar", "satélite", "estratégia", "topic cluster"],
  "keyword": ["palavra-chave", "termo", "busca"],
  "palavra-chave": ["keyword", "termo", "busca", "pesquisa"],
  
  // Conteúdo
  "artigo": ["post", "conteúdo", "blog", "texto", "publicação"],
  "post": ["artigo", "conteúdo", "publicação"],
  "rascunho": ["draft", "não publicado", "edição"],
  "publicar": ["publish", "postar", "lançar"],
  
  // Automação
  "automação": ["automático", "programar", "agendar", "fila", "automation"],
  "agendar": ["schedule", "programar", "calendário"],
  "calendário": ["calendar", "agenda", "programação", "schedule"],
  "fila": ["queue", "lista", "pendente"],
  
  // E-book
  "ebook": ["livro", "pdf", "download", "material", "e-book"],
  "lead": ["contato", "email", "captação", "formulário"],
  
  // Estratégia
  "estratégia": ["strategy", "planejamento", "plano"],
  "persona": ["público", "audiência", "cliente", "avatar"],
  "concorrente": ["competitor", "competidor", "rival"],
  
  // Geral
  "configurar": ["setup", "ajustar", "definir", "settings"],
  "configurações": ["settings", "preferências", "ajustes"],
  "ajuda": ["help", "suporte", "dúvida", "tutorial"],
  "começar": ["start", "iniciar", "primeiros passos", "getting started", "onboarding"],
};

export const expandSearchTerms = (query: string): string[] => {
  const normalizedQuery = query.toLowerCase().trim();
  const terms = new Set<string>([normalizedQuery]);
  
  // Adiciona sinônimos encontrados
  Object.entries(helpSynonyms).forEach(([key, values]) => {
    if (key === normalizedQuery || values.some(v => v === normalizedQuery)) {
      terms.add(key);
      values.forEach(v => terms.add(v));
    }
    
    // Busca parcial
    if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
      terms.add(key);
      values.forEach(v => terms.add(v));
    }
    
    values.forEach(value => {
      if (value.includes(normalizedQuery) || normalizedQuery.includes(value)) {
        terms.add(key);
        values.forEach(v => terms.add(v));
      }
    });
  });
  
  return Array.from(terms);
};
