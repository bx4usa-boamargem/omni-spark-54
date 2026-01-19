/**
 * WhatsApp Link Builder - Backend Module
 * 
 * Versão para Edge Functions do sistema de herança da conta-mãe.
 * Utilizado em CTA de artigos, editorialContract, brand-sales-agent, etc.
 */

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface WhatsAppContext {
  phone: string;           // Obrigatório - número da subconta
  companyName?: string;    // Nome da empresa
  service?: string;        // Serviço principal
  city?: string;           // Cidade
  articleTitle?: string;   // Título do artigo (quando aplicável)
  // NOVOS CAMPOS TERRITORIAIS
  neighborhood?: string;       // Bairro específico
  territoryName?: string;      // Nome oficial do território validado
  leadSource?: string;         // Origem: 'map' | 'article' | 'neighborhood' | 'search'
}

export interface GlobalCommConfig {
  whatsapp_base_url: string;
  message_template: string;
  placeholders: string[];
}

// Cache simples para evitar múltiplas queries na mesma execução
let cachedConfig: GlobalCommConfig | null = null;

/**
 * Configuração padrão (fallback) - COM PLACEHOLDERS TERRITORIAIS
 */
const DEFAULT_CONFIG: GlobalCommConfig = {
  whatsapp_base_url: 'https://wa.me/{phone}?text={message}',
  message_template: 'Olá! Encontrei sua empresa ao buscar por {service} em {neighborhood}. Li o artigo "{article_title}" no blog da unidade {territory_name} e gostaria de falar com um especialista local.',
  placeholders: ['phone', 'service', 'city', 'article_title', 'company_name', 'neighborhood', 'territory_name', 'lead_source']
};

/**
 * Busca configuração global da conta-mãe
 */
export async function getGlobalWhatsAppConfig(
  supabase: SupabaseClient
): Promise<GlobalCommConfig> {
  // Retorna cache se disponível
  if (cachedConfig) {
    return cachedConfig;
  }
  
  try {
    const { data, error } = await supabase
      .from('global_comm_config')
      .select('whatsapp_base_url, message_template, placeholders')
      .eq('config_key', 'whatsapp_default')
      .eq('is_active', true)
      .single();
    
    if (error || !data) {
      console.warn('[WhatsAppBuilder] Failed to fetch global config, using defaults:', error);
      return DEFAULT_CONFIG;
    }
    
    cachedConfig = {
      whatsapp_base_url: data.whatsapp_base_url,
      message_template: data.message_template,
      placeholders: data.placeholders as string[]
    };
    
    return cachedConfig;
  } catch (err) {
    console.error('[WhatsAppBuilder] Error fetching global config:', err);
    return DEFAULT_CONFIG;
  }
}

/**
 * Limpa o número de telefone (apenas dígitos)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Interpola placeholders no template de mensagem
 * Suporta placeholders territoriais (neighborhood, territory_name, lead_source)
 */
export function interpolateMessage(template: string, context: WhatsAppContext): string {
  const cleanPhone = cleanPhoneNumber(context.phone);
  
  // Fallback inteligente: usa neighborhood -> city -> default
  const locationFallback = context.neighborhood || context.city || 'sua região';
  const territoryFallback = context.territoryName || context.city || 'nossa unidade';
  
  return template
    .replace(/{phone}/g, cleanPhone)
    .replace(/{company_name}/g, context.companyName || 'nossa empresa')
    .replace(/{service}/g, context.service || 'nossos serviços')
    .replace(/{city}/g, context.city || 'sua região')
    .replace(/{article_title}/g, context.articleTitle || 'o conteúdo')
    // NOVOS PLACEHOLDERS TERRITORIAIS
    .replace(/{neighborhood}/g, locationFallback)
    .replace(/{territory_name}/g, territoryFallback)
    .replace(/{lead_source}/g, context.leadSource || 'site');
}

/**
 * Constrói link WhatsApp padronizado
 * 
 * FUNÇÃO ÚNICA usada em todo o backend para gerar links WhatsApp.
 * Busca automaticamente a configuração da conta-mãe.
 */
export interface BuildWhatsAppOptions {
  messageOverride?: string; // Mensagem específica (override do template global)
}

export async function buildWhatsAppLink(
  supabase: SupabaseClient,
  context: WhatsAppContext
): Promise<string> {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return '#';
  }
  
  const config = await getGlobalWhatsAppConfig(supabase);
  return buildWhatsAppLinkSync(context, config);
}

/**
 * Versão síncrona quando a config já está disponível
 */
export function buildWhatsAppLinkSync(
  context: WhatsAppContext, 
  config: GlobalCommConfig,
  options?: BuildWhatsAppOptions
): string {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn('[WhatsApp Backend] Invalid phone number:', context.phone);
    return '#';
  }
  
  // Se tem override, usa ele; senão, interpola template global
  const message = options?.messageOverride 
    ? options.messageOverride
    : interpolateMessage(config.message_template, { ...context, phone: cleanPhone });
  
  const url = config.whatsapp_base_url
    .replace('{phone}', cleanPhone)
    .replace('{message}', encodeURIComponent(message));
  
  console.log('[WhatsApp Backend]', {
    phoneClean: cleanPhone,
    hasOverride: !!options?.messageOverride,
    hasNeighborhood: !!context.neighborhood,
    hasTerritory: !!context.territoryName,
    leadSource: context.leadSource,
    urlLength: url.length
  });
  
  return url;
}

/**
 * Gera apenas a URL do WhatsApp (sem mensagem)
 * Útil para links simples de contato
 */
export function buildSimpleWhatsAppLink(phone: string): string {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return '#';
  }
  return `https://wa.me/${cleanPhone}`;
}

/**
 * Invalida o cache (útil em testes)
 */
export function invalidateCache(): void {
  cachedConfig = null;
}
