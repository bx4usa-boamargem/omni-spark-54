import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
export interface SmartLink {
  id: string;
  article_id: string;
  blog_id: string;
  slug: string;
  title: string;
  description: string | null;
  image_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SmartLinkStats {
  smart_link_id: string;
  total_visits: number;
  total_likes: number;
}

export interface CreateSmartLinkInput {
  article_id: string;
  blog_id: string;
  title: string;
  description?: string;
  image_url?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * Hook para gerenciar Smart Links rastreados de artigos.
 * Permite criar, listar, atualizar, deletar e obter estatísticas.
 */
export function useSmartLinks(blogId?: string) {
  const { toast } = useToast();
  const [links, setLinks] = useState<SmartLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Gera um slug curto único (~8 chars)
  // Gera um slug curto único (~8 chars) sem dependências externas
  const generateSlug = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map((b) => b.toString(36).padStart(2, '0'))
      .join('')
      .slice(0, 8);

  /**
   * Lista todos os smart links de um blog (ou artigo)
   */
  const fetchLinks = useCallback(async (articleId?: string) => {
    if (!blogId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('article_smart_links')
        .select('*')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: false });

      if (articleId) {
        query = query.eq('article_id', articleId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLinks((data as SmartLink[]) || []);
    } catch (e: any) {
      toast({
        title: 'Erro ao carregar links',
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [blogId, toast]);

  /**
   * Cria um novo Smart Link rastreado para um artigo
   */
  const createLink = useCallback(async (input: CreateSmartLinkInput): Promise<SmartLink | null> => {
    setCreating(true);
    try {
      const slug = generateSlug();
      const { data, error } = await supabase
        .from('article_smart_links')
        .insert({
          ...input,
          slug,
          description: input.description || null,
          image_url: input.image_url || null,
          utm_source: input.utm_source || null,
          utm_medium: input.utm_medium || null,
          utm_campaign: input.utm_campaign || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      const newLink = data as SmartLink;
      setLinks((prev) => [newLink, ...prev]);

      toast({
        title: 'Smart Link criado!',
        description: `Compartilhe em: /a/${slug}`,
      });

      return newLink;
    } catch (e: any) {
      toast({
        title: 'Erro ao criar link',
        description: e.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setCreating(false);
    }
  }, [toast]);

  /**
   * Ativa/desativa um Smart Link
   */
  const toggleActive = useCallback(async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('article_smart_links')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      setLinks((prev) =>
        prev.map((l) => (l.id === id ? { ...l, is_active: isActive } : l))
      );
    } catch (e: any) {
      toast({
        title: 'Erro ao atualizar link',
        description: e.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Remove permanentemente um Smart Link
   */
  const deleteLink = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('article_smart_links')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setLinks((prev) => prev.filter((l) => l.id !== id));
      toast({ title: 'Link removido com sucesso.' });
    } catch (e: any) {
      toast({
        title: 'Erro ao remover link',
        description: e.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  /**
   * Obtém estatísticas de um smart link específico
   */
  const getStats = useCallback(async (smartLinkId: string): Promise<SmartLinkStats | null> => {
    try {
      const { data, error } = await supabase.rpc('get_link_stats', {
        p_smart_link_id: smartLinkId,
      });
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return {
        smart_link_id: smartLinkId,
        total_visits: Number(row.total_visits) || 0,
        total_likes: Number(row.total_likes) || 0,
      };
    } catch (e: any) {
      console.error('getStats error:', e);
      return null;
    }
  }, []);

  /**
   * Constrói a URL pública de um smart link
   */
  const getLinkUrl = (slug: string): string => {
    const base = window.location.origin;
    return `${base}/a/${slug}`;
  };

  return {
    links,
    loading,
    creating,
    fetchLinks,
    createLink,
    toggleActive,
    deleteLink,
    getStats,
    getLinkUrl,
  };
}
