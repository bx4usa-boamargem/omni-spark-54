/**
 * aiosClient.ts — OmniSeen V4
 *
 * SDK de cliente para os squads AIOS integrados ao OmniSeen.
 * Referencia os squads criados em /aios-oficial/squads/omniseen-*
 *
 * Squads disponiveis:
 *  - omniseen-conteudo        - Geracao, revisao e publicacao de artigos
 *  - omniseen-presenca-digital - SEO local, GMB, analise de SERP
 *  - omniseen-comercial        - SDR, funis, landing pages, relatorios
 */

import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type AIOSSquad =
  | 'omniseen-conteudo'
  | 'omniseen-presenca-digital'
  | 'omniseen-comercial';

export type AIOSAgent =
  // omniseen-conteudo
  | 'conteudo-chief'
  | 'article-architect'
  | 'content-writer'
  | 'seo-optimizer'
  | 'content-publisher'
  | 'serp-researcher'
  // omniseen-presenca-digital
  | 'presenca-chief'
  | 'local-seo-agent'
  | 'gmb-agent'
  | 'serp-analyst'
  // omniseen-comercial
  | 'comercial-chief'
  | 'sdr-agent'
  | 'funnel-agent'
  | 'analytics-agent';

export type AIOSTask =
  // conteudo
  | 'create-article'
  | 'optimize-seo'
  | 'publish-article'
  // presenca-digital
  | 'local-seo-audit'
  | 'analyze-competitors'
  | 'keyword-research'
  | 'gmb-health-check'
  // comercial
  | 'run-sdr-conversation'
  | 'create-funnel'
  | 'generate-landing-page'
  | 'weekly-report';

export interface AIOSRunOptions {
  squad: AIOSSquad;
  task: AIOSTask;
  /** ID do blog ou contexto alvo (opcional) */
  blog_id?: string;
  /** Parâmetros adicionais passados ao task */
  params?: Record<string, unknown>;
  /** Agente de entrada (opcional, usa o chief por padrão) */
  entryAgent?: AIOSAgent;
}

export interface AIOSRunResult {
  success: boolean;
  squad: AIOSSquad;
  task: AIOSTask;
  /** ID do job/run gerado (se edge function suportar) */
  run_id?: string;
  /** Retorno da edge function executada */
  data?: unknown;
  error?: string;
}

// ─── Mapa Squad → Edge Functions principais ──────────────────────────────────

/**
 * Mapeia cada squad para as edge functions correspondentes.
 * Usado apenas para referência/documentação — o roteamento real
 * é feito por cada agente AIOS no arquivo de definição.
 */
export const SQUAD_EDGE_FUNCTIONS: Record<AIOSSquad, string[]> = {
  'omniseen-conteudo': [
    'article-plan',
    'write-section',
    'build-article-outline',
    'batch-seo-suggestions',
    'analyze-serp',
    'fix-seo-with-ai',
    'publish-article',
    'auto-publish-ready-articles',
    'publish-to-cms',
    'generate-social-content',
  ],
  'omniseen-presenca-digital': [
    'local-seo-intel',
    'analyze-landing-page-seo',
    'google-native-healthcheck',
    'search-google-place',
    'sync-google-place',
    'check-domain-dns',
    'analyze-serp',
    'analyze-competitors',
    'keyword-analysis',
  ],
  'omniseen-comercial': [
    'chat-sdr',
    'brand-sales-agent',
    'generate-persona-suggestions',
    'funnel-autopilot',
    'generate-funnel-articles',
    'generate-landing-page',
    'performance-analyzer',
    'track-analytics',
    'send-weekly-report',
  ],
};

// ─── Mapa Task → Edge Function de entrada ────────────────────────────────────

const TASK_FUNCTION_MAP: Record<AIOSTask, string> = {
  'create-article':         'article-plan',
  'optimize-seo':           'batch-seo-suggestions',
  'publish-article':        'publish-article',
  'local-seo-audit':        'local-seo-intel',
  'analyze-competitors':    'analyze-competitors',
  'keyword-research':       'keyword-analysis',
  'gmb-health-check':       'google-native-healthcheck',
  'run-sdr-conversation':   'chat-sdr',
  'create-funnel':          'funnel-autopilot',
  'generate-landing-page':  'generate-landing-page',
  'weekly-report':          'send-weekly-report',
};

// ─── Funções de conveniência ──────────────────────────────────────────────────

/**
 * Executa uma task AIOS chamando a edge function correspondente.
 *
 * @example
 * const result = await runAIOSTask({
 *   squad: 'omniseen-conteudo',
 *   task: 'create-article',
 *   blog_id: 'uuid-do-blog',
 *   params: { topic: 'marketing digital', keywords: ['SEO', 'conteúdo'] },
 * });
 */
export async function runAIOSTask(options: AIOSRunOptions): Promise<AIOSRunResult> {
  const { squad, task, blog_id, params = {} } = options;

  const fnName = TASK_FUNCTION_MAP[task];
  if (!fnName) {
    return {
      success: false,
      squad,
      task,
      error: `Task "${task}" não mapeada para nenhuma edge function.`,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke(fnName, {
      body: {
        blog_id,
        aios_squad: squad,
        aios_task: task,
        ...params,
      },
    });

    if (error) {
      return { success: false, squad, task, error: error.message };
    }

    return {
      success: true,
      squad,
      task,
      run_id: (data as Record<string, unknown>)?.run_id as string | undefined,
      data,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, squad, task, error: message };
  }
}

/**
 * Retorna a lista de edge functions mapeadas a um squad.
 */
export function getSquadFunctions(squad: AIOSSquad): string[] {
  return SQUAD_EDGE_FUNCTIONS[squad] ?? [];
}

/**
 * Retorna a edge function de entrada para uma task.
 */
export function getTaskFunction(task: AIOSTask): string | undefined {
  return TASK_FUNCTION_MAP[task];
}

/**
 * Verifica se um squad está disponível (edge functions existem no projeto).
 * Útil para feature flags baseadas em squad.
 */
export function isSquadAvailable(squad: AIOSSquad): boolean {
  return squad in SQUAD_EDGE_FUNCTIONS;
}

// ─── Constantes de escopo dos squads ─────────────────────────────────────────

export const SQUADS_METADATA = {
  'omniseen-conteudo': {
    label: 'Motor de Conteúdo',
    description: 'Geração, revisão e publicação de artigos com IA',
    icon: '✍️',
    agents: ['conteudo-chief', 'article-architect', 'content-writer', 'seo-optimizer', 'content-publisher', 'serp-researcher'],
    tasks: ['create-article', 'optimize-seo', 'publish-article'],
  },
  'omniseen-presenca-digital': {
    label: 'Presença Digital',
    description: 'SEO local, Google Business Profile e análise de SERP',
    icon: '🌐',
    agents: ['presenca-chief', 'local-seo-agent', 'gmb-agent', 'serp-analyst'],
    tasks: ['local-seo-audit', 'analyze-competitors', 'keyword-research', 'gmb-health-check'],
  },
  'omniseen-comercial': {
    label: 'Motor Comercial',
    description: 'SDR, funis de venda, landing pages e relatórios',
    icon: '📈',
    agents: ['comercial-chief', 'sdr-agent', 'funnel-agent', 'analytics-agent'],
    tasks: ['run-sdr-conversation', 'create-funnel', 'generate-landing-page', 'weekly-report'],
  },
} as const satisfies Record<AIOSSquad, {
  label: string;
  description: string;
  icon: string;
  agents: AIOSAgent[];
  tasks: AIOSTask[];
}>;
