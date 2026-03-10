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
  tenant_id?: string | null;
}

interface UseBlogResult {
  blog: Blog | null;
  loading: boolean;
  isOwner: boolean;
  role: TeamRole | null;
  isPlatformAdmin: boolean;
  refetch: () => Promise<void>;
}

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

      // 2. Tenta buscar por blog_members (subcontas / time)
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

      // 3. Fallback via tenant_members → resolve tenant → busca blog
      // Cobre o caso em que blogs.user_id não bate com o auth user
      console.warn('useBlog: Nenhum resultado direto. Tentando fallback via tenant_members...');

      const { data: tenantMembership, error: tenantError } = await supabase
        .from("tenant_members")
        .select(`tenant_id, role`)
        .eq("user_id", user.id)
        .maybeSingle();

      console.log('useBlog: tenantMembership =', tenantMembership, '| tenantError =', tenantError?.message);

      if (tenantMembership?.tenant_id) {
        const tenantId = tenantMembership.tenant_id;
        const memberRole = tenantMembership.role as TeamRole;
        const isOwnerRole = memberRole === 'owner';

        // 3a. Busca blog com tenant_id explícito (campo na tabela blogs)
        const { data: blogByTenantId } = await supabase
          .from("blogs")
          .select("*")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (blogByTenantId) {
          console.log('useBlog: blog encontrado via tenant_id direto');
          setBlog(blogByTenantId as Blog);
          setRole(memberRole);
          setIsOwner(isOwnerRole);
          return;
        }

        // 3b. Busca slug do tenant → busca blog por slug
        const { data: tenantData } = await supabase
          .from("tenants")
          .select("slug, owner_user_id")
          .eq("id", tenantId)
          .maybeSingle();

        console.log('useBlog: tenantData =', tenantData);

        if (tenantData?.slug) {
          const { data: blogBySlug } = await supabase
            .from("blogs")
            .select("*")
            .eq("slug", tenantData.slug)
            .maybeSingle();

          if (blogBySlug) {
            console.log('useBlog: blog encontrado via tenant slug');
            setBlog(blogBySlug as Blog);
            setRole(memberRole);
            setIsOwner(isOwnerRole);
            return;
          }
        }

        // 3c. Último recurso: pega o primeiro blog disponível na plataforma para este tenant
        // (usado quando o blog foi criado com outro user_id e não tem tenant_id preenchido)
        // Só tenta se owner_user_id do tenant bate com algum user que tem blog
        if (tenantData?.owner_user_id) {
          const { data: blogByOwner } = await supabase
            .from("blogs")
            .select("*")
            .eq("user_id", tenantData.owner_user_id)
            .maybeSingle();

          if (blogByOwner) {
            console.log('useBlog: blog encontrado via tenant.owner_user_id');
            setBlog(blogByOwner as Blog);
            setRole(memberRole);
            setIsOwner(isOwnerRole);
            return;
          }
        }
      }

      // Nenhum blog encontrado — log claro para debug no Supabase
      console.error(
        'useBlog: NENHUM BLOG ENCONTRADO para user_id =', user.id,
        '\nVerifique: SELECT id, user_id, tenant_id, slug FROM blogs LIMIT 5;'
      );

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

  const handleRefetch = () => fetchBlog(0);

  useEffect(() => {
    fetchBlog();
  }, []);

  return { blog, loading, isOwner, role, isPlatformAdmin, refetch: handleRefetch };
}
