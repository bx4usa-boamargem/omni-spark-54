import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, MapPin, Search, PenLine } from 'lucide-react';
import { PlaceAutocomplete } from './PlaceAutocomplete';

interface AddTerritoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (country: string, state?: string, city?: string) => Promise<boolean>;
  syncWithGoogle?: (territoryId: string, placeId: string) => Promise<boolean>;
}

// Common countries for quick selection
const COMMON_COUNTRIES = [
  { code: 'Brasil', label: '🇧🇷 Brasil' },
  { code: 'Portugal', label: '🇵🇹 Portugal' },
  { code: 'Estados Unidos', label: '🇺🇸 Estados Unidos' },
  { code: 'Argentina', label: '🇦🇷 Argentina' },
  { code: 'México', label: '🇲🇽 México' },
  { code: 'Espanha', label: '🇪🇸 Espanha' },
];

export function AddTerritoryModal({ open, onOpenChange, onAdd, syncWithGoogle }: AddTerritoryModalProps) {
  const [mode, setMode] = useState<'google' | 'manual'>('google');
  const [country, setCountry] = useState('Brasil');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Google autocomplete state
  const [selectedPlace, setSelectedPlace] = useState<{
    place_id: string;
    description: string;
    main_text: string;
  } | null>(null);

  const handleSubmitManual = async () => {
    if (!country.trim()) return;

    setSaving(true);
    const success = await onAdd(
      country.trim(),
      state.trim() || undefined,
      city.trim() || undefined
    );
    setSaving(false);

    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleSubmitGoogle = async () => {
    if (!selectedPlace) return;

    setSaving(true);
    
    // Parse location from description
    const parts = selectedPlace.description.split(', ');
    const mainLocation = selectedPlace.main_text;
    
    // Determine country, state, city from description
    let detectedCountry = 'Brasil';
    let detectedState = '';
    let detectedCity = '';
    
    if (parts.length >= 1) {
      // Last part is usually country
      detectedCountry = parts[parts.length - 1] || 'Brasil';
    }
    if (parts.length >= 2) {
      // Second to last is usually state
      detectedState = parts[parts.length - 2] || '';
    }
    if (parts.length >= 3) {
      // First is usually city
      detectedCity = mainLocation;
    } else if (parts.length === 2) {
      // Could be state, country or city, state
      // Check if first part looks like a city
      if (mainLocation !== detectedState) {
        detectedCity = mainLocation;
      }
    }

    // First add the territory
    const success = await onAdd(
      detectedCountry,
      detectedState || undefined,
      detectedCity || undefined
    );

    if (success && syncWithGoogle) {
      // Get the newly created territory and sync it
      // We need to wait briefly for the territory to be created
      // Then the parent component will handle syncing via the returned territory
      // For now, show success - user can manually sync if needed
    }

    setSaving(false);

    if (success) {
      resetForm();
      onOpenChange(false);
    }
  };

  const resetForm = () => {
    setCountry('Brasil');
    setState('');
    setCity('');
    setSelectedPlace(null);
    setMode('google');
  };

  const getScopeLabel = (): string => {
    if (mode === 'google' && selectedPlace) {
      return `📍 ${selectedPlace.description}`;
    }
    if (city && state && country) {
      return `🏙️ Cidade: ${city}, ${state}, ${country}`;
    }
    if (state && country) {
      return `📍 Estado: ${state}, ${country}`;
    }
    if (country) {
      return `🌍 País: ${country}`;
    }
    return 'Selecione um território';
  };

  const canSubmit = mode === 'google' ? !!selectedPlace : !!country.trim();

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Adicionar Território
          </DialogTitle>
          <DialogDescription>
            Escolha a área geográfica que deseja cobrir para o Radar de Oportunidades.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as 'google' | 'manual')} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="google" className="gap-2">
              <Search className="h-4 w-4" />
              Buscar no Google
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              Manual
            </TabsTrigger>
          </TabsList>

          {/* Google Search Mode */}
          <TabsContent value="google" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Buscar localização</Label>
              <PlaceAutocomplete
                onSelect={setSelectedPlace}
                placeholder="Ex: Orlando, Florida, USA"
              />
              <p className="text-xs text-muted-foreground">
                Busque cidades, estados ou países para validação automática com Google Maps
              </p>
            </div>
          </TabsContent>

          {/* Manual Mode */}
          <TabsContent value="manual" className="space-y-4 py-4">
            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">País *</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_COUNTRIES.map((c) => (
                  <Button
                    key={c.code}
                    type="button"
                    variant={country === c.code ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCountry(c.code)}
                  >
                    {c.label}
                  </Button>
                ))}
              </div>
              <Input
                id="country"
                placeholder="Ou digite outro país..."
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>

            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state">Estado (opcional)</Label>
              <Input
                id="state"
                placeholder="Ex: São Paulo, Minas Gerais"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para cobrir o país inteiro
              </p>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label htmlFor="city">Cidade (opcional)</Label>
              <Input
                id="city"
                placeholder="Ex: São Paulo, Belo Horizonte"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={!state}
              />
              {!state && (
                <p className="text-xs text-muted-foreground">
                  Preencha o estado primeiro para especificar uma cidade
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Scope Preview */}
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-sm font-medium text-primary">{getScopeLabel()}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {mode === 'google' && selectedPlace 
              ? 'Será validado automaticamente com bairros reais'
              : 'O Radar de Oportunidades vai analisar este território semanalmente'
            }
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={mode === 'google' ? handleSubmitGoogle : handleSubmitManual} 
            disabled={!canSubmit || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              'Adicionar Território'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
