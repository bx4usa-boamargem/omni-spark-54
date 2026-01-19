/**
 * WhatsApp Link Builder - Sistema Centralizado
 * 
 * Este módulo gerencia a construção de links WhatsApp com herança
 * da configuração global da conta-mãe.
 * Suporta campos territoriais (neighborhood, territoryName, leadSource).
 * 
 * REGRA DE OURO: Nenhum link WhatsApp deve ser construído manualmente.
 * Use SEMPRE as funções exportadas deste módulo.
 */

import { supabase } from "@/integrations/supabase/client";

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

// Cache global para evitar múltiplas requests
let globalConfigCache: GlobalCommConfig | null = null;
let configFetchPromise: Promise<GlobalCommConfig> | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

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
 * Com cache para evitar múltiplas requests
 */
export async function getGlobalWhatsAppConfig(): Promise<GlobalCommConfig> {
  const now = Date.now();
  
  // Retorna cache se disponível e válido
  if (globalConfigCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return globalConfigCache;
  }
  
  // Evita múltiplas requests simultâneas
  if (configFetchPromise) {
    return configFetchPromise;
  }
  
  configFetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('global_comm_config')
        .select('whatsapp_base_url, message_template, placeholders')
        .eq('config_key', 'whatsapp_default')
        .eq('is_active', true)
        .single();
      
      if (error || !data) {
        console.warn('[WhatsApp] Failed to fetch global config, using defaults:', error);
        return DEFAULT_CONFIG;
      }
      
      globalConfigCache = {
        whatsapp_base_url: data.whatsapp_base_url,
        message_template: data.message_template,
        placeholders: data.placeholders as string[]
      };
      cacheTimestamp = Date.now();
      
      return globalConfigCache;
    } catch (err) {
      console.error('[WhatsApp] Error fetching global config:', err);
      return DEFAULT_CONFIG;
    } finally {
      configFetchPromise = null;
    }
  })();
  
  return configFetchPromise;
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
 * Constrói link WhatsApp com configuração global
 * Função assíncrona principal
 */
export async function buildWhatsAppLink(context: WhatsAppContext): Promise<string> {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return '#';
  }
  
  const config = await getGlobalWhatsAppConfig();
  return buildWhatsAppLinkSync(context, config);
}

export interface BuildWhatsAppOptions {
  messageOverride?: string; // Mensagem específica (override do template global)
}

/**
 * Versão síncrona quando a config já está disponível
 * Usada pelo hook useGlobalWhatsApp e pelos builders de backend
 */
export function buildWhatsAppLinkSync(
  context: WhatsAppContext, 
  config: GlobalCommConfig,
  options?: BuildWhatsAppOptions
): string {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    console.warn('[WhatsApp] Invalid phone number:', context.phone);
    return '#';
  }
  
  // Se tem override, usa ele; senão, interpola template global
  const message = options?.messageOverride 
    ? options.messageOverride
    : interpolateMessage(config.message_template, { ...context, phone: cleanPhone });
  
  const url = config.whatsapp_base_url
    .replace('{phone}', cleanPhone)
    .replace('{message}', encodeURIComponent(message));
  
  // Health check log
  console.log('[WhatsApp] Link generated:', {
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
 * Abre WhatsApp de forma resiliente
 * Trata popup blockers e navega diretamente se necessário
 */
export function openWhatsApp(url: string): void {
  if (!url || url === '#') {
    console.warn('[WhatsApp] Invalid URL, cannot open');
    return;
  }
  
  // Tenta abrir em nova aba
  const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
  
  // Se bloqueado por popup blocker, navega diretamente
  if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
    window.location.href = url;
  }
}

/**
 * Invalida o cache de configuração
 * Útil quando a configuração global é atualizada
 */
export function invalidateWhatsAppConfigCache(): void {
  globalConfigCache = null;
  configFetchPromise = null;
  cacheTimestamp = 0;
}
