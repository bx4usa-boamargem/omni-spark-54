import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Search, 
  Filter, 
  FileText, 
  Youtube, 
  Instagram, 
  Table, 
  FileType,
  MessageCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CreateContentGridProps {
  onSelect: (type: string) => void;
}

interface ContentSource {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badge?: string;
}

export function CreateContentGrid({ onSelect }: CreateContentGridProps) {
  const sources: ContentSource[] = [
    {
      id: "chat",
      icon: <MessageCircle className="h-6 w-6" />,
      iconBg: "bg-gradient-to-br from-primary/20 to-accent/20 text-primary",
      title: "Chat com IA",
      description: "Converse ou use o microfone 🎤 para criar seu artigo",
      badge: "Novo",
    },
    {
      id: "ai-suggestion",
      icon: <Sparkles className="h-6 w-6" />,
      iconBg: "bg-primary/10 text-primary",
      title: "Sugestão da IA",
      description: "Vamos sugerir uma pauta com base nos interesses do seu público",
    },
    {
      id: "keywords",
      icon: <Search className="h-6 w-6" />,
      iconBg: "bg-blue-500/10 text-blue-500",
      title: "Palavras-Chave",
      description: "Vamos nos basear nos 10 melhores artigos no Google para o tema",
    },
    {
      id: "funnel",
      icon: <Filter className="h-6 w-6" />,
      iconBg: "bg-purple-500/10 text-purple-500",
      title: "Funil de Vendas",
      description: "Escolha a persona e o nível de consciência que deseja atingir",
    },
    {
      id: "article",
      icon: <FileText className="h-6 w-6" />,
      iconBg: "bg-emerald-500/10 text-emerald-500",
      title: "Artigo ou Notícia",
      description: "Cole o texto ou o link de uma página com conteúdo em texto",
    },
    {
      id: "youtube",
      icon: <Youtube className="h-6 w-6" />,
      iconBg: "bg-red-500/10 text-red-500",
      title: "Vídeo do YouTube",
      description: "Cole o link de um vídeo comum ou de um shorts do YouTube",
    },
    {
      id: "instagram",
      icon: <Instagram className="h-6 w-6" />,
      iconBg: "bg-pink-500/10 text-pink-500",
      title: "Post do Instagram",
      description: "Cole o link de um post, carrossel ou reels do Instagram",
    },
    {
      id: "csv",
      icon: <Table className="h-6 w-6" />,
      iconBg: "bg-cyan-500/10 text-cyan-500",
      title: "Arquivo .csv",
      description: "Importe uma lista de pautas já definidas em uma planilha",
      badge: "Novo",
    },
    {
      id: "pdf",
      icon: <FileType className="h-6 w-6" />,
      iconBg: "bg-orange-500/10 text-orange-500",
      title: "Arquivo em PDF",
      description: "Extraia um ou mais conteúdos a partir de ebooks, PDFs, etc.",
      badge: "Novo",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Criar artigos a partir de:</h2>
        <p className="text-sm text-muted-foreground">
          Escolha uma fonte de conteúdo para começar a criação
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((source) => (
          <Card
            key={source.id}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
            onClick={() => onSelect(source.id)}
          >
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={cn("p-4 rounded-xl", source.iconBg)}>
                  {source.icon}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <h3 className="font-semibold group-hover:text-primary transition-colors">
                      {source.title}
                    </h3>
                    {source.badge && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {source.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {source.description}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
