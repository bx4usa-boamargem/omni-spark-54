import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { toast } from 'sonner';

export interface Territory {
  id: string;
  blog_id: string;
  country: string;
  state: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Google Maps fields
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  radius_km: number;
  neighborhood_tags: string[];
  validated_at: string | null;
  official_name: string | null;
}

interface UseTerritories {
  territories: Territory[];
  loading: boolean;
  limit: number;
  used: number;
  canAdd: boolean;
  isUnlimited: boolean;
  plan: string;
  addTerritory: (country: string, state?: string, city?: string) => Promise<boolean>;
  removeTerritory: (id: string) => Promise<boolean>;
  toggleActive: (id: string, isActive: boolean) => Promise<boolean>;
  syncWithGoogle: (territoryId: string, placeId: string) => Promise<boolean>;
  updateRadius: (territoryId: string, radiusKm: number) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useTerritories(blogId: string | undefined): UseTerritories {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const { checkLimit } = usePlanLimits();
  const [limitInfo, setLimitInfo] = useState({
    limit: 1,
    used: 0,
    isUnlimited: false,
    plan: 'free',
  });

  const fetchTerritories = useCallback(async () => {
    if (!blogId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('*')
        .eq('blog_id', blogId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Map data with defaults for new fields
      const mappedTerritories = (data || []).map(t => ({
        ...t,
        radius_km: t.radius_km ?? 15,
        neighborhood_tags: t.neighborhood_tags ?? [],
      })) as Territory[];

      setTerritories(mappedTerritories);
    } catch (error) {
      console.error('Error fetching territories:', error);
    } finally {
      setLoading(false);
    }
  }, [blogId]);

  const checkTerritoryLimit = useCallback(async () => {
    const result = await checkLimit('territories' as any);
    setLimitInfo({
      limit: result.limit,
      used: result.used,
      isUnlimited: result.isUnlimited,
      plan: result.plan,
    });
  }, [checkLimit]);

  useEffect(() => {
    fetchTerritories();
    checkTerritoryLimit();
  }, [fetchTerritories, checkTerritoryLimit]);

  const addTerritory = async (country: string, state?: string, city?: string): Promise<boolean> => {
    if (!blogId) return false;

    // Check limits before adding
    const activeTerritories = territories.filter(t => t.is_active).length;
    if (!limitInfo.isUnlimited && activeTerritories >= limitInfo.limit) {
      toast.error('Limite de territórios atingido', {
        description: `Seu plano permite ${limitInfo.limit} território(s). Faça upgrade para adicionar mais.`,
      });
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('territories')
        .insert({
          blog_id: blogId,
          country,
          state: state || null,
          city: city || null,
          is_active: true,
          radius_km: 15,
          neighborhood_tags: [],
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este território já existe');
          return false;
        }
        throw error;
      }

      const newTerritory: Territory = {
        ...data,
        radius_km: data.radius_km ?? 15,
        neighborhood_tags: data.neighborhood_tags ?? [],
      };

      setTerritories(prev => [...prev, newTerritory]);
      toast.success('Território adicionado!');
      return true;
    } catch (error) {
      console.error('Error adding territory:', error);
      toast.error('Erro ao adicionar território');
      return false;
    }
  };

  const removeTerritory = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('territories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTerritories(prev => prev.filter(t => t.id !== id));
      toast.success('Território removido');
      return true;
    } catch (error) {
      console.error('Error removing territory:', error);
      toast.error('Erro ao remover território');
      return false;
    }
  };

  const toggleActive = async (id: string, isActive: boolean): Promise<boolean> => {
    // If activating, check limits
    if (isActive) {
      const activeTerritories = territories.filter(t => t.is_active && t.id !== id).length;
      if (!limitInfo.isUnlimited && activeTerritories >= limitInfo.limit) {
        toast.error('Limite de territórios atingido', {
          description: `Desative outro território primeiro ou faça upgrade do plano.`,
        });
        return false;
      }
    }

    try {
      const { error } = await supabase
        .from('territories')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setTerritories(prev =>
        prev.map(t => (t.id === id ? { ...t, is_active: isActive } : t))
      );
      toast.success(isActive ? 'Território ativado' : 'Território desativado');
      return true;
    } catch (error) {
      console.error('Error toggling territory:', error);
      toast.error('Erro ao atualizar território');
      return false;
    }
  };

  /**
   * Sincroniza território com Google Places API
   */
  const syncWithGoogle = async (territoryId: string, placeId: string): Promise<boolean> => {
    try {
      toast.loading('Sincronizando com Google Maps...', { id: 'sync-google' });

      const { data, error } = await supabase.functions.invoke('sync-google-place', {
        body: { territory_id: territoryId, place_id: placeId }
      });

      if (error) throw error;

      if (data?.success) {
        // Update local state with synced data
        setTerritories(prev =>
          prev.map(t =>
            t.id === territoryId
              ? {
                  ...t,
                  place_id: placeId,
                  lat: data.lat,
                  lng: data.lng,
                  official_name: data.official_name,
                  neighborhood_tags: data.neighborhood_tags || [],
                  validated_at: data.validated_at,
                }
              : t
          )
        );

        toast.success('Território validado pelo Google!', {
          id: 'sync-google',
          description: `${data.neighborhood_tags?.length || 0} bairros detectados`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Falha na sincronização');
      }
    } catch (error) {
      console.error('Error syncing with Google:', error);
      toast.error('Erro ao sincronizar com Google Maps', { id: 'sync-google' });
      return false;
    }
  };

  /**
   * Atualiza o raio de cobertura do território
   */
  const updateRadius = async (territoryId: string, radiusKm: number): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('territories')
        .update({ radius_km: radiusKm, updated_at: new Date().toISOString() })
        .eq('id', territoryId);

      if (error) throw error;

      setTerritories(prev =>
        prev.map(t => (t.id === territoryId ? { ...t, radius_km: radiusKm } : t))
      );
      toast.success(`Raio atualizado para ${radiusKm}km`);
      return true;
    } catch (error) {
      console.error('Error updating radius:', error);
      toast.error('Erro ao atualizar raio');
      return false;
    }
  };

  const activeTerritories = territories.filter(t => t.is_active).length;
  const canAdd = limitInfo.isUnlimited || activeTerritories < limitInfo.limit;

  return {
    territories,
    loading,
    limit: limitInfo.limit,
    used: activeTerritories,
    canAdd,
    isUnlimited: limitInfo.isUnlimited,
    plan: limitInfo.plan,
    addTerritory,
    removeTerritory,
    toggleActive,
    syncWithGoogle,
    updateRadius,
    refresh: fetchTerritories,
  };
}
