import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { Json } from "@/integrations/supabase/types";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  plan: string | null;
  status: string | null;
  account_type: string | null;
  billing_required: boolean | null;
  billing_email: string | null;
  stripe_customer_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  settings: Json | null;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: string;
  joined_at: string | null;
}

interface UseTenantResult {
  tenant: Tenant | null;
  tenants: Tenant[];
  membership: TenantMember | null;
  loading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

export function useTenant(): UseTenantResult {
  const { user } = useAuth();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [membership, setMembership] = useState<TenantMember | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTenant = async () => {
    if (!user) {
      setTenant(null);
      setTenants([]);
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      // Try to fetch tenant memberships for the user
      const { data: memberships, error: membershipError } = await supabase
        .from("tenant_members")
        .select("*")
        .eq("user_id", user.id);

      // If tenant_members query fails (e.g., RLS issues), fallback to blogs
      if (membershipError) {
        console.warn("tenant_members query failed, trying fallback via blogs:", membershipError);
        
        const { data: userBlogs, error: blogsError } = await supabase
          .from("blogs")
          .select("tenant_id, tenants(*)")
          .eq("user_id", user.id)
          .not("tenant_id", "is", null)
          .limit(1);

        if (blogsError || !userBlogs?.length) {
          console.error("Both tenant resolution methods failed");
          setTenant(null);
          setTenants([]);
          setMembership(null);
          setLoading(false);
          return;
        }

        // Use tenant from blog as fallback
        const blogTenant = userBlogs[0].tenants as unknown as Tenant;
        if (blogTenant) {
          setTenant(blogTenant);
          setTenants([blogTenant]);
          setMembership({
            id: "fallback",
            tenant_id: blogTenant.id,
            user_id: user.id,
            role: "owner",
            joined_at: null
          });
        }
        setLoading(false);
        return;
      }

      // No memberships found - try fallback via blogs
      if (!memberships || memberships.length === 0) {
        console.warn("No tenant memberships found, trying fallback via blogs");
        
        const { data: userBlogs, error: blogsError } = await supabase
          .from("blogs")
          .select("tenant_id, tenants(*)")
          .eq("user_id", user.id)
          .not("tenant_id", "is", null)
          .limit(1);

        if (!blogsError && userBlogs?.length) {
          const blogTenant = userBlogs[0].tenants as unknown as Tenant;
          if (blogTenant) {
            setTenant(blogTenant);
            setTenants([blogTenant]);
            setMembership({
              id: "fallback",
              tenant_id: blogTenant.id,
              user_id: user.id,
              role: "owner",
              joined_at: null
            });
            setLoading(false);
            return;
          }
        }

        setTenant(null);
        setTenants([]);
        setMembership(null);
        setLoading(false);
        return;
      }

      // Fetch all tenants the user belongs to
      const tenantIds = memberships.map(m => m.tenant_id);
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .in("id", tenantIds);

      if (tenantsError) {
        console.error("Error fetching tenants:", tenantsError);
        setLoading(false);
        return;
      }

      setTenants(tenantsData || []);

      // Find the primary tenant (where user is owner, or first one)
      const ownerMembership = memberships.find(m => m.role === "owner");
      const primaryMembership = ownerMembership || memberships[0];
      const primaryTenant = tenantsData?.find(t => t.id === primaryMembership.tenant_id);

      setTenant(primaryTenant || null);
      setMembership(primaryMembership);
    } catch (error) {
      console.error("Error in useTenant:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenant();
  }, [user?.id]);

  const isOwner = membership?.role === "owner";
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";

  return {
    tenant,
    tenants,
    membership,
    loading,
    isOwner,
    isAdmin,
    refetch: fetchTenant,
  };
}
