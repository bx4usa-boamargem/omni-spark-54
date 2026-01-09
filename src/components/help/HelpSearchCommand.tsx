import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, FileText, ArrowRight } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { expandSearchTerms } from "@/lib/helpSynonyms";

interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  category: string;
  content: string;
  icon: string;
}

interface SearchResult extends HelpArticle {
  score: number;
  matchedSnippet: string;
  highlightedTitle: string;
}

interface HelpSearchCommandProps {
  articles: HelpArticle[];
}

const categoryLabels: Record<string, string> = {
  "getting-started": "Primeiros Passos",
  "content": "Conteúdo",
  "strategy": "Estratégia",
  "automation": "Automação",
  "analytics": "Analytics",
  "advanced": "Avançado",
};

const highlightMatch = (text: string, terms: string[]): string => {
  let result = text;
  terms.forEach(term => {
    if (term.length > 2) {
      const regex = new RegExp(`(${term})`, "gi");
      result = result.replace(regex, "**$1**");
    }
  });
  return result;
};

const extractSnippet = (content: string, terms: string[], maxLength: number = 80): string => {
  const lowerContent = content.toLowerCase();
  
  for (const term of terms) {
    if (term.length < 3) continue;
    const index = lowerContent.indexOf(term.toLowerCase());
    if (index !== -1) {
      const start = Math.max(0, index - 30);
      const end = Math.min(content.length, index + maxLength);
      let snippet = content.substring(start, end);
      
      if (start > 0) snippet = "..." + snippet;
      if (end < content.length) snippet = snippet + "...";
      
      return highlightMatch(snippet, terms);
    }
  }
  
  return content.substring(0, maxLength) + "...";
};

const smartSearch = (query: string, articles: HelpArticle[]): SearchResult[] => {
  if (!query.trim()) return [];
  
  const expandedTerms = expandSearchTerms(query);
  
  return articles
    .map(article => {
      let score = 0;
      const lowerTitle = article.title.toLowerCase();
      const lowerContent = article.content.toLowerCase();
      
      expandedTerms.forEach(term => {
        if (term.length < 2) return;
        
        // Título tem peso maior
        if (lowerTitle.includes(term)) {
          score += 15;
          if (lowerTitle.startsWith(term)) score += 5;
        }
        
        // Categoria
        if (article.category.toLowerCase().includes(term)) {
          score += 8;
        }
        
        // Conteúdo
        const contentMatches = (lowerContent.match(new RegExp(term, "g")) || []).length;
        score += Math.min(contentMatches * 2, 10);
      });
      
      const matchedSnippet = extractSnippet(article.content, expandedTerms);
      const highlightedTitle = highlightMatch(article.title, expandedTerms);
      
      return { 
        ...article, 
        score, 
        matchedSnippet,
        highlightedTitle
      };
    })
    .filter(a => a.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
};

export function HelpSearchCommand({ articles }: HelpSearchCommandProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Atalho de teclado Ctrl+K / Cmd+K para focar o input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Busca em tempo real
  useEffect(() => {
    const searchResults = smartSearch(query, articles);
    setResults(searchResults);
  }, [query, articles]);

  const handleSelect = useCallback((slug: string) => {
    setQuery("");
    navigate(`/help/${slug}`);
  }, [navigate]);

  const renderSnippet = (text: string) => {
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => 
      i % 2 === 1 ? (
        <span key={i} className="bg-primary/20 text-primary font-medium px-0.5 rounded">
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <Command shouldFilter={false} className="rounded-lg border shadow-md bg-background">
      <div className="flex items-center border-b px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={inputRef}
          placeholder="Pesquisar na Central de Ajuda..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
      
      {query.length > 0 && (
        <CommandList>
          {results.length === 0 ? (
            <div className="py-6 text-center text-sm">
              <FileText className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Tente termos como: dashboard, seo, automação, ebook
              </p>
            </div>
          ) : (
            <CommandGroup heading={`${results.length} resultado${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''}`}>
              {results.map((result) => (
                <CommandItem
                  key={result.id}
                  value={result.id}
                  onSelect={() => handleSelect(result.slug)}
                  className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium flex-1">
                      {renderSnippet(result.highlightedTitle)}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {categoryLabels[result.category] || result.category}
                    </Badge>
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 pl-6 w-full">
                    {renderSnippet(result.matchedSnippet)}
                  </p>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      )}
    </Command>
  );
}
