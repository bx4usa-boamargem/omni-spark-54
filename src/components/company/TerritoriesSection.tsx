import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTerritories, Territory } from '@/hooks/useTerritories';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  MapPin, 
  Plus, 
  Loader2, 
  Globe2, 
  Trash2, 
  Crown,
  Building2,
  Map,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Navigation
} from 'lucide-react';
import { AddTerritoryModal } from './AddTerritoryModal';

interface TerritoriesSectionProps {
  blogId: string;
}

export function TerritoriesSection({ blogId }: TerritoriesSectionProps) {
  const navigate = useNavigate();
  const { 
    territories, 
    loading, 
    limit, 
    used, 
    canAdd, 
    isUnlimited, 
    plan,
    addTerritory, 
    removeTerritory, 
    toggleActive,
    syncWithGoogle,
    updateRadius
  } = useTerritories(blogId);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const getLocationLabel = (territory: Territory): string => {
    // Prefer official_name if validated
    if (territory.official_name) {
      return territory.official_name;
    }
    if (territory.city && territory.state) {
      return `${territory.city}, ${territory.state}`;
    }
    if (territory.state) {
      return `${territory.state}, ${territory.country}`;
    }
    return territory.country;
  };

  const getScopeIcon = (territory: Territory) => {
    if (territory.city) return <Building2 className="h-4 w-4" />;
    if (territory.state) return <Map className="h-4 w-4" />;
    return <Globe2 className="h-4 w-4" />;
  };

  const getScopeBadge = (territory: Territory): string => {
    if (territory.city) return 'Cidade';
    if (territory.state) return 'Estado';
    return 'País';
  };

  const handleSyncWithGoogle = async (territory: Territory) => {
    // For now, we'll use a simple Google Places search based on location
    // In production, you'd use Google Places Autocomplete in the modal
    const searchQuery = territory.city 
      ? `${territory.city}, ${territory.state || ''}, ${territory.country}`
      : territory.state 
        ? `${territory.state}, ${territory.country}`
        : territory.country;
    
    setSyncingId(territory.id);
    
    try {
      // Use Google Places Text Search to find place_id
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(searchQuery)}&inputtype=textquery&fields=place_id&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}`
      );
      
      // Note: This requires CORS setup or a proxy. For now, we'll show a manual input option
      // In production, use the Google Places JavaScript API directly
      
      // Fallback: Show toast with instructions
      const { toast } = await import('sonner');
      toast.info('Sincronização manual necessária', {
        description: 'Use o Google Maps para encontrar o Place ID do território.',
      });
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncingId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const usagePercent = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Territórios
              </CardTitle>
              <CardDescription className="mt-1">
                Defina as regiões que você quer dominar organicamente
              </CardDescription>
            </div>
            
            {/* Usage Badge */}
            <div className="text-right">
              {isUnlimited ? (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" />
                  Ilimitado
                </Badge>
              ) : (
                <Badge variant={used >= limit ? 'destructive' : 'secondary'}>
                  {used} / {limit} territórios
                </Badge>
              )}
            </div>
          </div>

          {/* Progress bar for limited plans */}
          {!isUnlimited && (
            <div className="mt-4 space-y-1">
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Usando {used} de {limit} territórios do plano {plan?.toUpperCase()}
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Territory List */}
          {territories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum território definido</p>
              <p className="text-sm">Adicione territórios para o Radar analisar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {territories.map((territory) => (
                <div
                  key={territory.id}
                  className={`flex flex-col gap-3 p-4 rounded-lg border ${
                    territory.is_active 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/50 border-border opacity-60'
                  }`}
                >
                  {/* Main Row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        territory.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {getScopeIcon(territory)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{getLocationLabel(territory)}</p>
                          {/* Validation Status */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                {territory.validated_at ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-amber-500" />
                                )}
                              </TooltipTrigger>
                              <TooltipContent>
                                {territory.validated_at 
                                  ? `Validado pelo Google em ${new Date(territory.validated_at).toLocaleDateString('pt-BR')}`
                                  : 'Não validado pelo Google Maps'
                                }
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {getScopeBadge(territory)}
                          </Badge>
                          {territory.radius_km && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Navigation className="h-3 w-3" />
                              {territory.radius_km}km
                            </Badge>
                          )}
                          {territory.lat && territory.lng && (
                            <span className="text-xs text-muted-foreground">
                              📍 {territory.lat.toFixed(4)}, {territory.lng.toFixed(4)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Sync with Google Button */}
                      {!territory.validated_at && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSyncWithGoogle(territory)}
                          disabled={syncingId === territory.id}
                        >
                          {syncingId === territory.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      {/* Active Toggle */}
                      <Switch
                        checked={territory.is_active}
                        onCheckedChange={(checked) => toggleActive(territory.id, checked)}
                      />

                      {/* Delete Button */}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover território?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O território "{getLocationLabel(territory)}" será removido. 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeTerritory(territory.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* Neighborhoods Row (if validated) */}
                  {territory.neighborhood_tags && territory.neighborhood_tags.length > 0 && (
                    <div className="pl-12">
                      <p className="text-xs text-muted-foreground mb-1.5">Bairros cobertos:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {territory.neighborhood_tags.slice(0, 8).map((tag, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs font-normal">
                            {tag}
                          </Badge>
                        ))}
                        {territory.neighborhood_tags.length > 8 && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            +{territory.neighborhood_tags.length - 8} mais
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add Territory Button or Upgrade CTA */}
          {canAdd ? (
            <Button 
              onClick={() => setShowAddModal(true)}
              className="w-full gap-2"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Adicionar Território
            </Button>
          ) : (
            <div className="p-4 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Crown className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Limite de territórios atingido</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Seu plano permite {limit} território(s). Faça upgrade para expandir sua presença.
                  </p>
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => navigate('/pricing')}
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Ver Planos
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Info Card */}
          <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-border">
            <p className="text-sm text-muted-foreground">
              <strong>💡 Como funciona:</strong> O Radar de Oportunidades analisa cada território 
              ativo semanalmente, identificando temas relevantes e tendências locais para gerar 
              artigos personalizados. Territórios validados pelo Google incluem bairros reais 
              que serão mencionados nos artigos para máxima autoridade local.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Territory Modal */}
      <AddTerritoryModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onAdd={addTerritory}
      />
    </>
  );
}
