/**
 * Hook para consumir configuração global de WhatsApp
 * 
 * Fornece acesso à configuração da conta-mãe e uma função
 * para construir links WhatsApp de forma síncrona.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { 
  GlobalCommConfig, 
  WhatsAppContext, 
  buildWhatsAppLinkSync,
  cleanPhoneNumber,
  interpolateMessage
} from '@/lib/whatsappBuilder';

interface UseGlobalWhatsAppReturn {
  config: GlobalCommConfig | null;
  loading: boolean;
  error: Error | null;
  buildLink: (context: WhatsAppContext) => string;
  previewMessage: (context: WhatsAppContext) => string;
}

const DEFAULT_CONFIG: GlobalCommConfig = {
  whatsapp_base_url: 'https://wa.me/{phone}?text={message}',
  message_template: 'Olá! Vi o artigo "{article_title}" no blog e gostaria de saber mais sobre {service} em {city}. Podem me ajudar?',
  placeholders: ['phone', 'service', 'city', 'article_title', 'company_name']
};

export function useGlobalWhatsApp(): UseGlobalWhatsAppReturn {
  const [config, setConfig] = useState<GlobalCommConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('global_comm_config')
          .select('whatsapp_base_url, message_template, placeholders')
          .eq('config_key', 'whatsapp_default')
          .eq('is_active', true)
          .single();
        
        if (fetchError) {
          console.warn('Failed to fetch global WhatsApp config:', fetchError);
          setConfig(DEFAULT_CONFIG);
        } else if (data) {
          setConfig({
            whatsapp_base_url: data.whatsapp_base_url,
            message_template: data.message_template,
            placeholders: data.placeholders as string[]
          });
        } else {
          setConfig(DEFAULT_CONFIG);
        }
      } catch (err) {
        console.error('Error in useGlobalWhatsApp:', err);
        setError(err as Error);
        setConfig(DEFAULT_CONFIG);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  /**
   * Constrói link WhatsApp usando a configuração global
   */
  const buildLink = useCallback((context: WhatsAppContext): string => {
    const effectiveConfig = config || DEFAULT_CONFIG;
    
    const cleanPhone = cleanPhoneNumber(context.phone);
    if (!cleanPhone || cleanPhone.length < 10) {
      return '#';
    }
    
    return buildWhatsAppLinkSync(context, effectiveConfig);
  }, [config]);

  /**
   * Gera preview da mensagem interpolada (sem link)
   */
  const previewMessage = useCallback((context: WhatsAppContext): string => {
    const effectiveConfig = config || DEFAULT_CONFIG;
    return interpolateMessage(effectiveConfig.message_template, context);
  }, [config]);

  return { 
    config, 
    loading, 
    error,
    buildLink,
    previewMessage
  };
}
