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

      console.log('useBlog: Usuário autenticado', {
        userId: user?.id,
        email: user?.email,
        error: userError ? userError.message : null
      });

      if (!user) {
        console.warn('useBlog: Sem usuário autenticado');
        setLoading(false);
        return;
      }

      // 1. Check if user is platform admin
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const adminRoles = ['admin', 'platform_admin'];
      const hasAdminRole = roles?.some(r => adminRoles.includes(r.role as string)) ?? false;
      if (hasAdminRole) {
        setIsPlatformAdmin(true);
      }

      // 2. Check if user owns a blog
      const { data: ownedBlog, error: blogError } = await supabase
        .from("blogs")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownedBlog) {
        setBlog(ownedBlog as Blog);
        setIsOwner(true);
        setRole("owner");
        console.log('useBlog: Blog carregado como owner', { blogId: ownedBlog.id });
        setLoading(false);
        return;
      }

      // 3. Check if user is a team member
      const { data: membership, error: memberError } = await supabase
        .from("team_members")
        .select(`
          blog_id,
          role,
          blogs (
            id,
            name,
            slug,
            description,
            logo_url,
            primary_color,
            secondary_color,
            onboarding_completed,
            user_id
          )
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (membership && membership.blogs) {
        const blogData = membership.blogs as unknown as Blog;
        setBlog(blogData);
        setRole(membership.role as TeamRole);
        setIsOwner(false);
        console.log('useBlog: Blog carregado como membro', {
          blogId: blogData.id,
          role: membership.role
        });
        setLoading(false);
        return;
      }

      // 4. If platform admin but no blog, get first available blog
      if (hasAdminRole) {
        const { data: anyBlog, error: anyBlogError } = await supabase
          .from("blogs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (anyBlog) {
          setBlog(anyBlog as Blog);
          setRole("owner");
          setIsOwner(false);
        }
      }

      console.log('useBlog: Fetch finalizado com sucesso');
      setLoading(false); // [SAFE MODE] Explicit success
    } catch (error) {
      console.error("useBlog: Erro na tentativa", retryCount + 1, error);

      if (retryCount < 2) {
        console.log(`useBlog: Tentando novamente em 2s...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchBlog(retryCount + 1);
      }
    } finally {
      // Only stop loading if we succeeded OR we've exhausted all retries
      if (retryCount >= 2) {
        setLoading(false);
      }
    }
  };

  // Wrapper to allow refetch without arguments in the result object
  const handleRefetch = () => fetchBlog(0);

  useEffect(() => {
    fetchBlog();
  }, []);

  return { blog, loading, isOwner, role, isPlatformAdmin, refetch: handleRefetch };
}
