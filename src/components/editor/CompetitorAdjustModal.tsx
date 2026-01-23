import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  Plus,
  X,
  Loader2,
  ExternalLink,
  Globe,
  Filter,
  RefreshCw,
  Building2,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Competitor {
  url: string;
  title: string;
  position: number;
  isSelected?: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  wordCount?: number;
  h2Count?: number;
}

// ═══════════════════════════════════════════════════════════════════
// GOVERNANÇA DE SUBCONTA LOCAL
// REGRA-MÃE: "A Omniseen não compete. Quem compete é o cliente."
// ═══════════════════════════════════════════════════════════════════

interface CompetitorAdjustModalProps {
  open: boolean;
  onClose: () => void;
  competitors: Competitor[];
  onSave: (selectedUrls: string[], customUrls: string[]) => Promise<void>;
  keyword: string;
  territory?: string | null;
  isLoading?: boolean;
  // V3.1: Contexto da subconta local (entidade raiz)
  businessName?: string;
  niche?: string;
  // V3.2: Keyword efetiva após correção
  effectiveKeyword?: string;
}

// Blocked domain patterns (client-side validation)
const BLOCKED_DOMAINS = [
  // Diretórios
  'yelp.com', 'yellowpages.com', 'tripadvisor.com', 'foursquare.com',
  'guiamais.com.br', 'apontador.com.br', 'hagah.com.br', 'kekanto.com.br',
  // Marketplaces
  'mercadolivre.com.br', 'amazon.com', 'olx.com.br', 'getninjas.com.br',
  // Redes sociais
  'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com',
  // Genéricos
  'wikipedia.org', 'gov.br', 'reclameaqui.com.br',
  // PLATAFORMA OMNISEEN (NUNCA SÃO CONCORRENTES)
  'omniseen.app', 'omniseen.com', 'lovable.app', 'lovable.dev'
];

function isBlockedUrl(url: string): { blocked: boolean; reason?: string } {
  const urlLower = url.toLowerCase();
  
  // Verificar domínios da plataforma primeiro
  if (urlLower.includes('omniseen') || urlLower.includes('lovable')) {
    return { blocked: true, reason: 'URL da plataforma (não é concorrente do cliente)' };
  }
  
  for (const domain of BLOCKED_DOMAINS) {
    if (urlLower.includes(domain)) {
      return { blocked: true, reason: `Diretório/Agregador: ${domain}` };
    }
  }
  return { blocked: false };
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

export function CompetitorAdjustModal({
  open,
  onClose,
  competitors,
  onSave,
  keyword,
  territory,
  isLoading = false,
  businessName,
  niche,
  effectiveKeyword
}: CompetitorAdjustModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customUrl, setCustomUrl] = useState('');
  const [customUrls, setCustomUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Initialize selection from competitors
  useEffect(() => {
    if (open && competitors.length > 0) {
      const initialSelected = new Set(
        competitors
          .filter(c => !c.isBlocked && c.isSelected !== false)
          .map(c => c.url)
      );
      setSelected(initialSelected);
    }
  }, [open, competitors]);

  // Process competitors with block detection
  const processedCompetitors = competitors.map(comp => {
    const blockCheck = isBlockedUrl(comp.url);
    return {
      ...comp,
      isBlocked: comp.isBlocked || blockCheck.blocked,
      blockReason: comp.blockReason || blockCheck.reason
    };
  });

  const realCompetitors = processedCompetitors.filter(c => !c.isBlocked);
  const blockedCompetitors = processedCompetitors.filter(c => c.isBlocked);

  const handleToggle = (url: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelected(newSelected);
  };

  const handleAddCustomUrl = () => {
    setUrlError(null);
    
    if (!customUrl.trim()) return;
    
    // Validate URL
    try {
      const url = new URL(customUrl.startsWith('http') ? customUrl : `https://${customUrl}`);
      const normalizedUrl = url.href;
      
      // Check if already exists
      if (customUrls.includes(normalizedUrl) || competitors.some(c => c.url === normalizedUrl)) {
        setUrlError('URL já adicionada');
        return;
      }
      
      // Check if blocked
      const blockCheck = isBlockedUrl(normalizedUrl);
      if (blockCheck.blocked) {
        setUrlError(`URL bloqueada: ${blockCheck.reason}`);
        return;
      }
      
      setCustomUrls([...customUrls, normalizedUrl]);
      setCustomUrl('');
    } catch {
      setUrlError('URL inválida');
    }
  };

  const handleRemoveCustomUrl = (url: string) => {
    setCustomUrls(customUrls.filter(u => u !== url));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selected), customUrls);
    } finally {
      setSaving(false);
    }
  };

  const totalSelected = selected.size + customUrls.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Ajustar Concorrentes
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Refine os concorrentes usados para calcular seu Content Score.
              </p>
              
              {/* V3.1: ENTIDADE RAIZ - Contexto da subconta local */}
              <div className="bg-muted/50 p-3 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="h-4 w-4 text-primary" />
                  Analisando concorrência de:
                </div>
                <div className="mt-1 text-base font-semibold text-foreground">
                  {businessName || 'Sua Empresa'}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  {niche && <span>{niche}</span>}
                  {niche && territory && <span>•</span>}
                  {territory && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {territory}
                    </span>
                  )}
                </div>
              </div>
              
              {/* V3.2: Mostrar keyword efetiva e se foi corrigida */}
              <div className="space-y-1">
                <span className="block text-xs text-primary font-medium">
                  Busca SERP: "{effectiveKeyword || keyword}"
                </span>
                {effectiveKeyword && effectiveKeyword !== keyword && (
                  <span className="block text-xs text-amber-600 font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Keyword corrigida (original: "{keyword}")
                  </span>
                )}
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-2">
            {/* Stats */}
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="gap-1">
                <Globe className="h-3 w-3" />
                {realCompetitors.length} concorrentes reais
              </Badge>
              {blockedCompetitors.length > 0 && (
                <Badge variant="secondary" className="gap-1 text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {blockedCompetitors.length} filtrados
                </Badge>
              )}
              <Badge 
                variant={totalSelected >= 3 ? "default" : "destructive"} 
                className="ml-auto"
              >
                {totalSelected} selecionados
              </Badge>
            </div>

            {/* Real Competitors */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Concorrentes Detectados
              </Label>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : realCompetitors.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Nenhum concorrente real encontrado. Adicione manualmente abaixo.
                </div>
              ) : (
                <div className="space-y-2">
                  {realCompetitors.map((comp) => (
                    <div
                      key={comp.url}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                        selected.has(comp.url)
                          ? "border-primary/50 bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={selected.has(comp.url)}
                        onCheckedChange={() => handleToggle(comp.url)}
                        id={`comp-${comp.position}`}
                      />
                      <div className="flex-1 min-w-0">
                        <label 
                          htmlFor={`comp-${comp.position}`}
                          className="text-sm font-medium truncate block cursor-pointer"
                        >
                          {comp.title || getDomainFromUrl(comp.url)}
                        </label>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                          <span>{getDomainFromUrl(comp.url)}</span>
                          {comp.wordCount && (
                            <span className="text-primary">• {comp.wordCount} palavras</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          #{comp.position}
                        </Badge>
                        <a
                          href={comp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blocked Competitors (collapsed) */}
            {blockedCompetitors.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {blockedCompetitors.length} diretórios/agregadores filtrados
                </summary>
                <div className="mt-2 space-y-1 pl-6">
                  {blockedCompetitors.map((comp) => (
                    <div
                      key={comp.url}
                      className="flex items-center gap-2 text-xs text-muted-foreground py-1"
                    >
                      <X className="h-3 w-3 text-destructive" />
                      <span className="truncate">{getDomainFromUrl(comp.url)}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <AlertCircle className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>{comp.blockReason}</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Custom URLs */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                Adicionar Concorrente Manual
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setUrlError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomUrl()}
                    placeholder="https://concorrente.com/pagina"
                    className={cn(urlError && "border-destructive")}
                  />
                  {urlError && (
                    <p className="text-xs text-destructive mt-1">{urlError}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleAddCustomUrl}
                  disabled={!customUrl.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {customUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customUrls.map((url) => (
                    <Badge
                      key={url}
                      variant="secondary"
                      className="gap-1 py-1 px-2"
                    >
                      <Globe className="h-3 w-3" />
                      {getDomainFromUrl(url)}
                      <button
                        onClick={() => handleRemoveCustomUrl(url)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Adicione URLs de concorrentes reais que não foram detectados automaticamente.
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || totalSelected < 1}
            className="gap-2"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {saving ? 'Reprocessando...' : `Reprocessar com ${totalSelected} concorrentes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
