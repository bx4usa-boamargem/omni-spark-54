import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Search, CheckCircle2 } from 'lucide-react';
import { useTenant } from "@/hooks/useTenant";

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface GooglePlaceSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  territoryId: string;
  currentLocation: string;
  onSelect: (placeId: string) => Promise<boolean>;
}

export function GooglePlaceSearchDialog({
  open,
  onOpenChange,
  territoryId,
  currentLocation,
  onSelect
}: GooglePlaceSearchDialogProps) {
  const { tenant } = useTenant();
  const [query, setQuery] = useState(currentLocation);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-google-place', {
        body: { query: searchQuery, tenant_id: tenant?.id }
      });

      if (fnError) throw fnError;

      if (data?.success && data.predictions) {
        setPredictions(data.predictions);
      } else {
        setError(data?.error || 'Erro ao buscar lugares');
        setPredictions([]);
      }
    } catch (err) {
      console.error('Error searching places:', err);
      setError('Erro ao conectar com Google Maps');
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchPlaces(query);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchPlaces]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery(currentLocation);
      setPredictions([]);
      setError(null);
      // Trigger initial search
      if (currentLocation.trim().length >= 2) {
        searchPlaces(currentLocation);
      }
    }
  }, [open, currentLocation, searchPlaces]);

  const handleSelect = async (prediction: PlacePrediction) => {
    setSelecting(prediction.place_id);
    try {
      const success = await onSelect(prediction.place_id);
      if (success) {
        onOpenChange(false);
      }
    } finally {
      setSelecting(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Sincronizar com Google Maps
          </DialogTitle>
          <DialogDescription>
            Busque e selecione a localização correta para validar seu território com dados reais do Google.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cidade, estado ou país..."
              className="pl-10"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Predictions List */}
          {predictions.length > 0 && (
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {predictions.map((prediction) => (
                  <Button
                    key={prediction.place_id}
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 hover:bg-primary/5"
                    onClick={() => handleSelect(prediction)}
                    disabled={selecting !== null}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="flex-shrink-0">
                        {selecting === prediction.place_id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                          <MapPin className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {prediction.main_text}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {prediction.secondary_text}
                        </p>
                      </div>
                      {selecting === prediction.place_id && (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          )}

          {/* Empty State */}
          {!loading && query.length >= 2 && predictions.length === 0 && !error && (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Nenhum resultado encontrado</p>
              <p className="text-sm">Tente outro termo de busca</p>
            </div>
          )}

          {/* Initial State */}
          {query.length < 2 && (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Digite pelo menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
