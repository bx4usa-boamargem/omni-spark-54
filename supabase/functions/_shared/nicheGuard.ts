/**
 * NICHE GUARD - Sistema de Governança Centralizada por Nicho
 * 
 * Este módulo é a ÚNICA fonte de verdade para:
 * 1. Bloqueio semântico (impede termos de marketing em nichos não-marketing)
 * 2. Estabilidade de score (score nunca cai sem ação do usuário)
 * 3. Auditoria de bloqueios (registra todas as tentativas barradas)
 * 
 * REGRA ABSOLUTA: Se nicho ≠ marketing, PROIBIDO inserir SEO/Google/Leads/Funil
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getNicheProfile, type NicheProfile } from "./nicheProfile.ts";

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface NicheGuardResult {
  allowed: boolean;
  blockedTerms: string[];
  sanitizedContent?: string;
  reason?: string;
  nicheProfile?: NicheProfile;
}

export interface ScoreChangeResult {
  allowed: boolean;
  reason: string;
  proposedScore: number;
  currentScore: number;
}

export type TriggeredBy = 'user' | 'system' | 'background';
export type ActionType = 'term_blocked' | 'score_blocked' | 'content_blocked' | 'image_blocked' | 'score_regression';

// ============================================================================
// TERMOS UNIVERSALMENTE PROIBIDOS PARA NICHOS NÃO-MARKETING
// ============================================================================

const UNIVERSAL_FORBIDDEN_TERMS = [
  // Marketing Digital
  'seo', 'search engine optimization', 'otimização para motores de busca',
  'marketing digital', 'digital marketing', 'marketing online',
  'agência digital', 'agência de marketing', 'agency',
  
  // Tráfego e Leads
  'tráfego pago', 'tráfego orgânico', 'paid traffic', 'organic traffic',
  'leads', 'lead generation', 'geração de leads', 'captação de leads',
  'conversão', 'taxa de conversão', 'conversion rate', 'cro',
  
  // Funil e Vendas Online
  'funil de vendas', 'sales funnel', 'funil de marketing',
  'inbound marketing', 'outbound marketing', 'growth hacking',
  'landing page', 'página de captura', 'squeeze page',
  
  // Google e Anúncios
  'google ads', 'facebook ads', 'instagram ads', 'meta ads',
  'primeira página do google', 'rankeamento', 'ranking google',
  'backlinks', 'link building', 'autoridade de domínio',
  
  // Branding Genérico
  'branding', 'posicionamento de marca', 'identidade visual',
  'presença digital', 'visibilidade online', 'autoridade digital',
  
  // Métricas de Marketing
  'roi', 'retorno sobre investimento', 'cac', 'custo de aquisição',
  'ltv', 'lifetime value', 'kpi', 'métricas de marketing',
  
  // ═══════════════════════════════════════════════════════════════════
  // TERMOS DA PLATAFORMA - SEMPRE PROIBIDOS EM TODOS OS NICHOS
  // REGRA-MÃE: "A Omniseen não compete. Quem compete é o cliente."
  // ═══════════════════════════════════════════════════════════════════
  'omniseen', 'plataforma omniseen', 'omniseen app',
  'saas', 'software como serviço', 'software as a service',
  'plataforma de conteúdo', 'gerador de conteúdo', 'content generator',
  'ia para blogs', 'ai for blogs', 'inteligência artificial para seo',
  'ferramenta de seo', 'seo tool', 'software de marketing',
  'automação de blog', 'blog automation', 'cms saas',
  'lovable', 'lovable app', 'plataforma lovable'
];

// Nichos que PODEM usar termos de marketing
const MARKETING_NICHES = [
  'marketing', 'agencia', 'agência', 'publicidade', 'propaganda',
  'tecnologia', 'software', 'saas', 'startup', 'tech',
  'seo', 'digital', 'consultoria digital', 'growth'
];

// ============================================================================
// FUNÇÕES PRINCIPAIS
// ============================================================================

/**
 * Verifica se o nicho é de marketing/tecnologia (pode usar termos de marketing)
 */
export function isMarketingNiche(nicheName: string | null | undefined): boolean {
  if (!nicheName) return false;
  const normalized = nicheName.toLowerCase().trim();
  return MARKETING_NICHES.some(term => normalized.includes(term));
}

/**
 * Encontra termos proibidos no conteúdo
 */
export function findForbiddenTerms(content: string, nicheProfile?: NicheProfile): string[] {
  const normalizedContent = content.toLowerCase();
  const foundTerms: string[] = [];
  
  // Verificar termos universais proibidos
  for (const term of UNIVERSAL_FORBIDDEN_TERMS) {
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    if (regex.test(normalizedContent)) {
      foundTerms.push(term);
    }
  }
  
  // Verificar termos proibidos específicos do perfil
  if (nicheProfile?.forbiddenEntities) {
    for (const term of nicheProfile.forbiddenEntities) {
      const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      if (regex.test(normalizedContent) && !foundTerms.includes(term.toLowerCase())) {
        foundTerms.push(term.toLowerCase());
      }
    }
  }
  
  return [...new Set(foundTerms)]; // Remove duplicatas
}

/**
 * Remove termos proibidos do conteúdo
 */
export function sanitizeContent(content: string, forbiddenTerms: string[]): string {
  let sanitized = content;
  
  for (const term of forbiddenTerms) {
    // Regex que captura o termo e pontuação adjacente
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b[,;]?\\s*`, 'gi');
    sanitized = sanitized.replace(regex, '');
  }
  
  // Limpar espaços duplos e normalizar
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  sanitized = sanitized.replace(/\s+([.,;:!?])/g, '$1');
  sanitized = sanitized.replace(/([.,;:!?])\s*([.,;:!?])/g, '$1');
  
  return sanitized;
}

/**
 * VALIDAÇÃO PRINCIPAL - Valida e sanitiza conteúdo antes de qualquer operação
 */
export async function validateAndSanitize(
  supabase: SupabaseClient,
  content: string,
  blogId: string,
  sourceFunction: string
): Promise<NicheGuardResult> {
  
  // 1. Carregar perfil do nicho
  const nicheProfile = await getNicheProfile(supabase, blogId);
  
  // 2. Se é nicho de marketing, permitir tudo
  if (isMarketingNiche(nicheProfile.name)) {
    console.log(`[NICHE-GUARD] Marketing niche detected: ${nicheProfile.name} - allowing all terms`);
    return {
      allowed: true,
      blockedTerms: [],
      nicheProfile
    };
  }
  
  // 3. Encontrar termos proibidos
  const forbiddenTerms = findForbiddenTerms(content, nicheProfile);
  
  if (forbiddenTerms.length === 0) {
    return {
      allowed: true,
      blockedTerms: [],
      nicheProfile
    };
  }
  
  // 4. Termos encontrados - sanitizar e retornar
  console.log(`[NICHE-GUARD] Blocked ${forbiddenTerms.length} terms in ${sourceFunction}: ${forbiddenTerms.join(', ')}`);
  
  const sanitizedContent = sanitizeContent(content, forbiddenTerms);
  
  return {
    allowed: false,
    blockedTerms: forbiddenTerms,
    sanitizedContent,
    reason: `Termos de marketing removidos para nicho "${nicheProfile.displayName}"`,
    nicheProfile
  };
}

/**
 * ESTABILIDADE DE SCORE - Verifica se o score pode ser alterado
 * 
 * REGRAS:
 * 1. Score NUNCA pode cair sem ação do usuário
 * 2. Sistema NÃO pode reduzir score automaticamente
 * 3. Apenas ações explícitas do usuário alteram score
 */
export async function canChangeScore(
  supabase: SupabaseClient,
  articleId: string,
  triggeredBy: TriggeredBy,
  proposedScore: number,
  currentScore: number
): Promise<ScoreChangeResult> {
  
  // Buscar configuração do artigo
  const { data: article } = await supabase
    .from('articles')
    .select('score_locked')
    .eq('id', articleId)
    .single();
  
  const isLocked = article?.score_locked ?? true; // Default: locked
  
  // REGRA 1: Se score_locked e não é ação do usuário, bloquear
  if (isLocked && triggeredBy !== 'user') {
    console.log(`[NICHE-GUARD] Score locked - blocking ${triggeredBy} change for article ${articleId}`);
    return {
      allowed: false,
      reason: 'score_locked_system_change',
      proposedScore,
      currentScore
    };
  }
  
  // REGRA 2: Score NUNCA pode cair sem ação explícita do usuário
  if (triggeredBy !== 'user' && proposedScore < currentScore) {
    console.log(`[NICHE-GUARD] Score cannot decrease automatically: ${currentScore} -> ${proposedScore}`);
    return {
      allowed: false,
      reason: 'score_cannot_decrease_automatically',
      proposedScore,
      currentScore
    };
  }
  
  // REGRA 3: Background jobs nunca alteram score
  if (triggeredBy === 'background') {
    console.log(`[NICHE-GUARD] Background jobs cannot change score`);
    return {
      allowed: false,
      reason: 'background_jobs_cannot_change_score',
      proposedScore,
      currentScore
    };
  }
  
  return {
    allowed: true,
    reason: triggeredBy === 'user' ? 'user_action' : 'system_increase_allowed',
    proposedScore,
    currentScore
  };
}

/**
 * Registra tentativa bloqueada no log de auditoria
 */
export async function logBlockedAttempt(
  supabase: SupabaseClient,
  articleId: string | null,
  blogId: string,
  actionType: ActionType,
  sourceFunction: string,
  details: {
    blockedTerms?: string[];
    blockedReason?: string;
    originalValue?: Record<string, unknown>;
    nicheProfileId?: string;
  }
): Promise<void> {
  try {
    await supabase.from('niche_guard_logs').insert({
      article_id: articleId,
      blog_id: blogId,
      action_type: actionType,
      source_function: sourceFunction,
      blocked_terms: details.blockedTerms || [],
      blocked_reason: details.blockedReason,
      original_value: details.originalValue,
      niche_profile_id: details.nicheProfileId
    });
    
    console.log(`[NICHE-GUARD] Logged ${actionType} from ${sourceFunction}`);
  } catch (error) {
    console.error(`[NICHE-GUARD] Failed to log blocked attempt:`, error);
  }
}

/**
 * Registra mudança de score no log de auditoria
 * V2.0: Tabela score_change_log para histórico completo
 */
export async function logScoreChange(
  supabase: SupabaseClient,
  articleId: string,
  oldScore: number,
  newScore: number,
  changeReason: string,
  triggeredBy: 'user' | 'system' | 'auto-fix' | 'boost' | 'recalculate',
  userId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    // Get current content version
    const { data: article } = await supabase
      .from('articles')
      .select('content_version')
      .eq('id', articleId)
      .single();

    await supabase.from('score_change_log').insert({
      article_id: articleId,
      old_score: oldScore,
      new_score: newScore,
      change_reason: changeReason,
      triggered_by: triggeredBy,
      content_version: article?.content_version || 1,
      user_id: userId || null,
      metadata: metadata || {}
    });

    console.log(`[NICHE-GUARD] Logged score change: ${oldScore} → ${newScore} (${changeReason})`);
  } catch (error) {
    console.error(`[NICHE-GUARD] Failed to log score change:`, error);
  }
}

/**
 * Atualiza o motivo da última mudança de score no artigo
 */
export async function updateLastScoreChangeReason(
  supabase: SupabaseClient,
  articleId: string,
  reason: string
): Promise<void> {
  try {
    await supabase
      .from('articles')
      .update({ last_score_change_reason: reason })
      .eq('id', articleId);
  } catch (error) {
    console.error(`[NICHE-GUARD] Failed to update last_score_change_reason:`, error);
  }
}

/**
 * Valida termos da SERP antes de cachear (remove termos de marketing para nichos não-marketing)
 */
export function filterSerpTermsForNiche(
  terms: string[],
  nicheProfile: NicheProfile
): { filtered: string[]; removed: string[] } {
  if (isMarketingNiche(nicheProfile.name)) {
    return { filtered: terms, removed: [] };
  }
  
  const removed: string[] = [];
  const filtered = terms.filter(term => {
    const normalized = term.toLowerCase();
    const isForbidden = UNIVERSAL_FORBIDDEN_TERMS.some(forbidden => 
      normalized.includes(forbidden) || forbidden.includes(normalized)
    );
    
    if (isForbidden) {
      removed.push(term);
      return false;
    }
    return true;
  });
  
  if (removed.length > 0) {
    console.log(`[NICHE-GUARD] Filtered ${removed.length} SERP terms for niche ${nicheProfile.name}: ${removed.join(', ')}`);
  }
  
  return { filtered, removed };
}

// ============================================================================
// REGRAS ANTI-FUTURISTA PARA IMAGENS
// ============================================================================

export const ANTI_FUTURISTIC_IMAGE_RULES = `
## ⛔ REGRAS ABSOLUTAS ANTI-FUTURISTA (INVIOLÁVEIS):

❌ PROIBIDO ABSOLUTAMENTE:
- Hologramas de qualquer tipo
- Telas flutuantes ou interfaces suspensas
- HUD futurista ou sci-fi
- Interfaces de realidade aumentada irreais
- Circuitos, chips ou tecnologia abstrata
- Gráficos 3D flutuantes
- Elementos de ficção científica
- Iluminação neon irreal
- Robôs ou androides
- Tecnologia que não existe no mundo real

✅ OBRIGATÓRIO:
- Fotografia 100% REALISTA e DOCUMENTAL
- Ambientes REAIS do dia-a-dia do negócio
- Equipamentos que EXISTEM no mercado
- Iluminação NATURAL ou artificial comum
- Pessoas em contextos AUTÊNTICOS do trabalho
- Objetos do COTIDIANO real da profissão
- Cenários que um cliente RECONHECERIA

ESTILO FINAL OBRIGATÓRIO:
photorealistic, documentary photography, real environment, real equipment,
natural lighting, authentic workplace, no sci-fi, no holograms, no futuristic UI,
no floating screens, no digital effects, no neon lighting
`.trim();

/**
 * Retorna instruções visuais específicas por nicho
 */
export function getNicheImageInstructions(nicheName: string): string {
  const nicheImageProfiles: Record<string, string> = {
    'controle_pragas': `
      Ambiente: Casas residenciais, quintais, jardins, áreas externas reais
      Equipamentos: Pulverizadores reais, EPI profissional, veículos de serviço
      Cenários: Inspeção técnica, proteção do lar, casas de família
      Cores: Verde natural, marrom terra, branco clean
      EVITAR: Escritórios, dashboards, tecnologia, rostos em close
    `,
    'advocacia': `
      Ambiente: Escritórios tradicionais de advocacia, bibliotecas jurídicas
      Objetos: Livros de direito, martelo de juiz, documentos, pastas
      Cenários: Reuniões formais, mesas de trabalho, salas de tribunal
      Cores: Azul escuro, dourado, bordô, cinza elegante
      EVITAR: Tecnologia, hologramas, interfaces digitais
    `,
    'saude': `
      Ambiente: Consultórios limpos, clínicas reais, salas de espera
      Equipamentos: Instrumentos médicos reais, estetoscópio, macas
      Cenários: Atendimento médico, recepção, exames de rotina
      Cores: Branco, azul claro, verde suave, menta
      EVITAR: Close de rostos, imagens perturbadoras, robôs
    `,
    'construcao': `
      Ambiente: Canteiros de obra reais, reformas, imóveis
      Equipamentos: Ferramentas manuais, capacetes, andaimes, betoneiras
      Cenários: Trabalhadores em ação, edificações, projetos físicos
      Cores: Laranja segurança, amarelo, cinza concreto
      EVITAR: Drones, robôs, arquitetura futurista
    `,
    'automotivo': `
      Ambiente: Oficinas mecânicas reais, garagens, postos de serviço
      Equipamentos: Ferramentas mecânicas, elevadores, peças de carro
      Cenários: Manutenção de veículos, diagnóstico, reparos
      Cores: Vermelho, preto, cinza metálico
      EVITAR: Carros autônomos, dashboards futuristas
    `,
    'pet': `
      Ambiente: Pet shops físicos, clínicas veterinárias, canis
      Animais: Cães e gatos reais em situações do dia-a-dia
      Cenários: Banho e tosa, consultas, produtos, passeios
      Cores: Azul claro, verde, laranja alegre
      EVITAR: Robôs pet, tecnologia, hologramas
    `,
    'beleza': `
      Ambiente: Salões de beleza reais, spas, clínicas estéticas
      Objetos: Espelhos, escovas, produtos de beleza, cadeiras de salão
      Cenários: Corte de cabelo, manicure, tratamentos faciais
      Cores: Rosa, dourado, nude, tons pastel
      EVITAR: Close de rostos, tecnologia
    `,
    'default': `
      Ambiente: Espaços de trabalho profissionais e autênticos
      Objetos: Materiais reais do dia-a-dia do negócio
      Cenários: Atividades cotidianas da profissão
      Cores: Paleta neutra e profissional
      EVITAR: Tecnologia futurista, sci-fi, hologramas
    `
  };
  
  const normalized = nicheName?.toLowerCase().replace(/[^a-z]/g, '_') || 'default';
  return nicheImageProfiles[normalized] || nicheImageProfiles['default'];
}
