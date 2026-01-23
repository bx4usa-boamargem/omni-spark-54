import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LandingPageData, LandingPage, GenerateLandingPageRequest } from "../types/landingPageTypes";

interface UseLandingPagesReturn {
  pages: LandingPage[];
  loading: boolean;
  generating: boolean;
  saving: boolean;
  fetchPages: (blogId: string) => Promise<void>;
  generatePage: (request: GenerateLandingPageRequest) => Promise<LandingPageData | null>;
  savePage: (page: Partial<LandingPage> & { blog_id: string }) => Promise<LandingPage | null>;
  updatePage: (id: string, updates: Partial<LandingPage>) => Promise<boolean>;
  deletePage: (id: string) => Promise<boolean>;
  publishPage: (id: string) => Promise<boolean>;
  unpublishPage: (id: string) => Promise<boolean>;
}

export function useLandingPages(): UseLandingPagesReturn {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPages = useCallback(async (blogId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("blog_id", blogId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Cast the data to LandingPage type
      setPages((data || []) as unknown as LandingPage[]);
    } catch (error) {
      console.error("[useLandingPages] Fetch error:", error);
      toast.error("Erro ao carregar landing pages");
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePage = useCallback(async (request: GenerateLandingPageRequest): Promise<LandingPageData | null> => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-landing-page", {
        body: request
      });

      if (error) throw error;

      if (data?.success && data?.page_data) {
        toast.success("Landing page gerada com sucesso!");
        return data.page_data as LandingPageData;
      } else {
        throw new Error(data?.error || "Falha ao gerar landing page");
      }
    } catch (error: any) {
      console.error("[useLandingPages] Generate error:", error);
      
      if (error.message?.includes("Rate limit")) {
        toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      } else if (error.message?.includes("Payment required")) {
        toast.error("Créditos insuficientes. Adicione créditos para continuar.");
      } else {
        toast.error("Erro ao gerar landing page");
      }
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const savePage = useCallback(async (page: Partial<LandingPage> & { blog_id: string }): Promise<LandingPage | null> => {
    setSaving(true);
    try {
      // Generate slug from title if not provided
      const slug = page.slug || page.title?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || `page-${Date.now()}`;

      const insertData = {
        blog_id: page.blog_id,
        title: page.title || "Nova Landing Page",
        slug,
        page_data: page.page_data || {},
        status: page.status || "draft",
        seo_title: page.seo_title,
        seo_description: page.seo_description,
        template_type: page.template_type || "service_page",
        generation_source: page.generation_source || "ai"
      };

      const { data, error } = await supabase
        .from("landing_pages")
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success("Landing page salva!");
      await fetchPages(page.blog_id);
      return data as unknown as LandingPage;
    } catch (error: any) {
      console.error("[useLandingPages] Save error:", error);
      
      if (error.code === "23505") {
        toast.error("Já existe uma página com esse slug. Escolha outro nome.");
      } else {
        toast.error("Erro ao salvar landing page");
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [fetchPages]);

  const updatePage = useCallback(async (id: string, updates: Partial<LandingPage>): Promise<boolean> => {
    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      };
      
      // Copy allowed fields
      if (updates.title) updateData.title = updates.title;
      if (updates.slug) updateData.slug = updates.slug;
      if (updates.page_data) updateData.page_data = updates.page_data as unknown;
      if (updates.seo_title) updateData.seo_title = updates.seo_title;
      if (updates.seo_description) updateData.seo_description = updates.seo_description;
      if (updates.status) updateData.status = updates.status;

      const { error } = await supabase
        .from("landing_pages")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast.success("Alterações salvas!");
      return true;
    } catch (error) {
      console.error("[useLandingPages] Update error:", error);
      toast.error("Erro ao atualizar landing page");
      return false;
    } finally {
      setSaving(false);
    }
  }, []);

  const deletePage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("landing_pages")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setPages(prev => prev.filter(p => p.id !== id));
      toast.success("Landing page excluída");
      return true;
    } catch (error) {
      console.error("[useLandingPages] Delete error:", error);
      toast.error("Erro ao excluir landing page");
      return false;
    }
  }, []);

  const publishPage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          status: "published",
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      setPages(prev => prev.map(p => 
        p.id === id 
          ? { ...p, status: "published" as const, published_at: new Date().toISOString() }
          : p
      ));
      toast.success("Landing page publicada!");
      return true;
    } catch (error) {
      console.error("[useLandingPages] Publish error:", error);
      toast.error("Erro ao publicar landing page");
      return false;
    }
  }, []);

  const unpublishPage = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from("landing_pages")
        .update({
          status: "draft",
          updated_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;

      setPages(prev => prev.map(p => 
        p.id === id 
          ? { ...p, status: "draft" as const }
          : p
      ));
      toast.success("Landing page despublicada");
      return true;
    } catch (error) {
      console.error("[useLandingPages] Unpublish error:", error);
      toast.error("Erro ao despublicar landing page");
      return false;
    }
  }, []);

  return {
    pages,
    loading,
    generating,
    saving,
    fetchPages,
    generatePage,
    savePage,
    updatePage,
    deletePage,
    publishPage,
    unpublishPage
  };
}
