/**
 * WhatsApp Link Builder - Sistema de Herança da Conta-Mãe
 * 
 * Este módulo centraliza a geração de links WhatsApp em toda a plataforma.
 * A configuração é herdada automaticamente da conta-mãe (OmniSeen).
 * Subcontas apenas fornecem o número de telefone.
 */

import { supabase } from "@/integrations/supabase/client";

export interface WhatsAppContext {
  phone: string;           // Obrigatório - número da subconta
  companyName?: string;    // Nome da empresa
  service?: string;        // Serviço principal
  city?: string;           // Cidade
  articleTitle?: string;   // Título do artigo (quando aplicável)
}

export interface GlobalCommConfig {
  whatsapp_base_url: string;
  message_template: string;
  placeholders: string[];
}

// Cache da configuração global
let cachedConfig: GlobalCommConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca configuração global da conta-mãe (com cache)
 */
export async function getGlobalWhatsAppConfig(): Promise<GlobalCommConfig> {
  const now = Date.now();
  
  // Retorna cache se ainda válido
  if (cachedConfig && (now - cacheTimestamp) < CACHE_DURATION) {
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
      console.warn('Failed to fetch global WhatsApp config, using defaults:', error);
      return getDefaultConfig();
    }
    
    cachedConfig = {
      whatsapp_base_url: data.whatsapp_base_url,
      message_template: data.message_template,
      placeholders: data.placeholders as string[]
    };
    cacheTimestamp = now;
    
    return cachedConfig;
  } catch (err) {
    console.error('Error fetching global WhatsApp config:', err);
    return getDefaultConfig();
  }
}

/**
 * Configuração padrão (fallback)
 */
function getDefaultConfig(): GlobalCommConfig {
  return {
    whatsapp_base_url: 'https://wa.me/{phone}?text={message}',
    message_template: 'Olá! Vi o artigo "{article_title}" no blog e gostaria de saber mais sobre {service} em {city}. Podem me ajudar?',
    placeholders: ['phone', 'service', 'city', 'article_title', 'company_name']
  };
}

/**
 * Limpa o número de telefone (apenas dígitos)
 */
export function cleanPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Interpola placeholders no template de mensagem
 */
export function interpolateMessage(template: string, context: WhatsAppContext): string {
  const cleanPhone = cleanPhoneNumber(context.phone);
  
  return template
    .replace(/{phone}/g, cleanPhone)
    .replace(/{company_name}/g, context.companyName || 'nossa empresa')
    .replace(/{service}/g, context.service || 'nossos serviços')
    .replace(/{city}/g, context.city || 'sua região')
    .replace(/{article_title}/g, context.articleTitle || 'o conteúdo');
}

/**
 * Constrói link WhatsApp padronizado (ASYNC)
 * 
 * Esta é a FUNÇÃO ÚNICA usada em toda a plataforma para gerar links WhatsApp.
 * Busca automaticamente a configuração da conta-mãe.
 * 
 * @example
 * const link = await buildWhatsAppLink({
 *   phone: '5511999999999',
 *   companyName: 'Empresa ABC',
 *   service: 'controle de pragas',
 *   city: 'São Paulo',
 *   articleTitle: 'Como eliminar baratas'
 * });
 */
export async function buildWhatsAppLink(context: WhatsAppContext): Promise<string> {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return '#';
  }
  
  const config = await getGlobalWhatsAppConfig();
  return buildWhatsAppLinkSync(context, config);
}

/**
 * Constrói link WhatsApp padronizado (SYNC)
 * 
 * Versão síncrona para componentes que já possuem a config carregada.
 * Deve ser usada em conjunto com useGlobalWhatsApp hook.
 */
export function buildWhatsAppLinkSync(
  context: WhatsAppContext, 
  config: GlobalCommConfig
): string {
  const cleanPhone = cleanPhoneNumber(context.phone);
  if (!cleanPhone || cleanPhone.length < 10) {
    return '#';
  }
  
  const message = interpolateMessage(config.message_template, { ...context, phone: cleanPhone });
  
  return config.whatsapp_base_url
    .replace('{phone}', cleanPhone)
    .replace('{message}', encodeURIComponent(message));
}

/**
 * Invalida o cache para forçar nova busca
 */
export function invalidateWhatsAppConfigCache(): void {
  cachedConfig = null;
  cacheTimestamp = 0;
}
