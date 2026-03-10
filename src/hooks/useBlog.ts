import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TeamRole } from "./useTeam";

interface Blog {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  logo_negative_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  onboarding_completed: boolean | null;
  user_id: string;
  custom_domain: string | null;
  domain_verified: boolean | null;
  domain_verification_token: string | null;
  platform_subdomain: string | null;
  cta_type: string | null;
  cta_text: string | null;
  cta_url: string | null;
  banner_title: string | null;
  banner_description: string | null;
  banner_enabled: boolean | null;
  banner_image_url: string | null;
  banner_mobile_image_url: string | null;
  banner_link_url: string | null;
  script_head: string | null;
  script_body: string | null;
  script_footer: string | null;
  tracking_config: Record<string, unknown> | null;
  color_palette: Record<string, string> | null;
  brand_description: string | null;
  footer_text: string | null;
  show_powered_by: boolean | null;
}

interface UseBlogResult {
  blog: Blog | null;
  loading: boolean;
  isOwner: boolean;
  role: TeamRole | null;
  isPlatformAdmin: boolean;
  refetch: () => Promise<void>;
}

// [SAFE MODE] Resilient blog fetch with retries

export function useBlog(): UseBlogResult {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [role, setRole] = useState<TeamRole | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  const fetchBlog = async (retryCount = 0) => {
    console.log(`useBlog: Iniciando fetch (tentativa ${retryCount + 1}/3)`);
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('useBlog: user.id =', user?.id, '| error =', userError?.message);

      if (!user) {
        console.warn('useBlog: Sem usuário autenticado');
        return;
      }

      // 1. Tenta buscar blog pelo user_id (dono direto)
      const { data: ownedBlog, error: blogError } = await supabase
        .from("blogs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      console.log('useBlog: ownedBlog =', ownedBlog, '| blogError =', blogError?.message);

      if (ownedBlog) {
        setBlog(ownedBlog as Blog);
        setIsOwner(true);
        setRole("owner");
        return;
      }

      // 2. Tenta buscar por blog_members (subcontas)
      const { data: membership, error: memberError } = await supabase
        .from("blog_members")
        .select(`blog_id, role, blogs(*)`)
        .eq("user_id", user.id)
        .maybeSingle();

      console.log('useBlog: membership =', membership, '| memberError =', memberError?.message);

      if (membership?.blogs) {
        const blogData = membership.blogs as unknown as Blog;
        setBlog(blogData);
        setRole(membership.role as TeamRole);
        setIsOwner(false);
        return;
      }

      // 3. Fallback: tabela blog_members ainda não aplicada no banco —
      //    busca por tenant_members (tabela legada)
      if (memberError?.message?.includes("blog_members")) {
        console.warn('useBlog: tabela blog_members não encontrada, tentando tenant_members');
        const { data: tenantMembership, error: tenantError } = await supabase
          .from("tenant_members")
          .select(`tenant_id, role, tenants:tenant_id(*)`)
          .eq("user_id", user.id)
          .maybeSingle();

        console.log('useBlog: tenantMembership =', tenantMembership, '| tenantError =', tenantError?.message);

        if (tenantMembership?.tenants) {
          // tenta buscar o blog associado a esse tenant
          const tenantData = tenantMembership.tenants as unknown as { slug?: string };
          if (tenantData?.slug) {
            const { data: blogBySlug } = await supabase
              .from("blogs")
              .select("*")
              .eq("slug", tenantData.slug)
              .maybeSingle();

            if (blogBySlug) {
              setBlog(blogBySlug as Blog);
              setRole(tenantMembership.role as TeamRole);
              setIsOwner(false);
              return;
            }
          }
        }
      }

      console.warn('useBlog: Nenhum blog encontrado para user_id =', user.id);

    } catch (error) {
      console.error("useBlog: Erro na tentativa", retryCount + 1, error);
      if (retryCount < 2) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchBlog(retryCount + 1);
      }
    } finally {
      setLoading(false);
    }
  };

  // Wrapper to allow refetch without arguments in the result object
  const handleRefetch = () => fetchBlog(0);

  useEffect(() => {
    fetchBlog();
  }, []);

  return { blog, loading, isOwner, role, isPlatformAdmin, refetch: handleRefetch };
}
