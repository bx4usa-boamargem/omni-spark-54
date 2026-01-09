import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface MetricDefinition {
  title: string;
  description: string;
  tips: string[];
}

export const METRIC_DEFINITIONS: Record<string, MetricDefinition> = {
  scroll_depth: {
    title: "Profundidade Média de Scroll",
    description:
      "A porcentagem média que os visitantes rolaram nas suas páginas. Por exemplo, 25% significa que, em média, os leitores veem apenas 1/4 do conteúdo antes de sair.",
    tips: [
      "Melhore a introdução para prender atenção",
      "Adicione imagens e elementos visuais",
      "Use subtítulos atrativos",
      "Quebre parágrafos longos",
    ],
  },
  retention: {
    title: "Retenção por Posição",
    description:
      "Porcentagem de visitantes que chegaram a cada ponto do artigo. 25% = primeiro quarto, 50% = metade, 75% = três quartos, 100% = final completo.",
    tips: [
      "Identifique onde há maior queda de leitores",
      "Melhore o conteúdo nas seções com mais abandono",
      "Adicione elementos de engajamento ao longo do texto",
    ],
  },
  visitors: {
    title: "Visitantes",
    description:
      "Total de pessoas únicas que acessaram seu blog no período selecionado.",
    tips: [
      "Aumente divulgação em redes sociais",
      "Invista em email marketing",
      "Otimize SEO para busca orgânica",
    ],
  },
  read_complete: {
    title: "Leitura Completa",
    description:
      "Porcentagem de visitantes que rolaram até o final do artigo (100% do scroll).",
    tips: [
      "Crie conteúdo mais envolvente",
      "Use parágrafos menores",
      "Adicione CTAs intermediários",
    ],
  },
  cta_clicks: {
    title: "Cliques em CTA",
    description:
      "Porcentagem de visitantes que clicaram no seu Call-to-Action (botão de ação).",
    tips: [
      "Torne o CTA mais visível",
      "Use texto persuasivo",
      "Posicione estrategicamente ao longo do artigo",
    ],
  },
  articles_published: {
    title: "Artigos Publicados",
    description: "Número total de artigos que estão publicados e visíveis para o público.",
    tips: [
      "Mantenha consistência na publicação",
      "Publique ao menos 1 artigo por semana",
      "Foque em qualidade sobre quantidade",
    ],
  },
  total_views: {
    title: "Visualizações",
    description: "Número total de vezes que seus artigos foram visualizados.",
    tips: [
      "Compartilhe nas redes sociais",
      "Otimize títulos para SEO",
      "Promova conteúdo em newsletters",
    ],
  },
  avg_time: {
    title: "Tempo Médio",
    description: "Tempo médio que os visitantes passam lendo seus artigos.",
    tips: [
      "Crie conteúdo mais profundo",
      "Adicione vídeos e elementos interativos",
      "Escreva de forma envolvente",
    ],
  },
  read_rate: {
    title: "Taxa de Leitura",
    description: "Porcentagem média de leitura dos artigos (scroll até 100%).",
    tips: [
      "Melhore a estrutura dos textos",
      "Use listas e bullet points",
      "Adicione sumários no início",
    ],
  },
  total_articles: {
    title: "Total de Artigos",
    description: "Número total de artigos criados no seu blog, incluindo rascunhos.",
    tips: [],
  },
  published: {
    title: "Publicados",
    description: "Artigos que já estão publicados e acessíveis ao público.",
    tips: [],
  },
  drafts: {
    title: "Rascunhos",
    description: "Artigos que ainda estão em fase de edição e não foram publicados.",
    tips: [
      "Revise rascunhos antigos periodicamente",
      "Defina prazos para finalização",
    ],
  },
};

interface MetricTooltipProps {
  metricKey: keyof typeof METRIC_DEFINITIONS;
  children?: ReactNode;
  showIcon?: boolean;
  iconClassName?: string;
}

export function MetricTooltip({
  metricKey,
  children,
  showIcon = true,
  iconClassName = "h-4 w-4 text-muted-foreground cursor-help",
}: MetricTooltipProps) {
  const metric = METRIC_DEFINITIONS[metricKey];

  if (!metric) return children || null;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5">
            {children}
            {showIcon && <HelpCircle className={iconClassName} />}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-xs p-4 space-y-3"
        >
          <div>
            <p className="font-semibold text-sm mb-1">📊 O que significa?</p>
            <p className="text-xs text-muted-foreground">{metric.description}</p>
          </div>
          {metric.tips.length > 0 && (
            <div>
              <p className="font-semibold text-sm mb-1">💡 Como melhorar?</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                {metric.tips.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
