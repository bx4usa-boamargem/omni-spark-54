import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlacePrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  types: string[];
}

interface PlaceAutocompleteProps {
  onSelect: (place: { place_id: string; description: string; main_text: string }) => void;
  placeholder?: string;
  className?: string;
}

export function PlaceAutocomplete({
  onSelect,
  placeholder = "Buscar localização no Google...",
  className
}: PlaceAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlacePrediction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced search
  const searchPlaces = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setPredictions([]);
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-google-place', {
        body: { query: searchQuery }
      });

      if (fnError) throw fnError;

      if (data?.success && data.predictions) {
        setPredictions(data.predictions);
      } else {
        setPredictions([]);
      }
    } catch (err) {
      console.error('Error searching places:', err);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce effect
  useEffect(() => {
    if (selectedPlace) return; // Don't search if already selected
    
    const timer = setTimeout(() => {
      if (query.trim().length >= 2) {
        searchPlaces(query);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchPlaces, selectedPlace]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (prediction: PlacePrediction) => {
    setSelectedPlace(prediction);
    setQuery(prediction.description);
    setShowDropdown(false);
    setPredictions([]);
    onSelect({
      place_id: prediction.place_id,
      description: prediction.description,
      main_text: prediction.main_text
    });
  };

  const handleClear = () => {
    setQuery('');
    setSelectedPlace(null);
    setPredictions([]);
    setShowDropdown(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selectedPlace) setSelectedPlace(null);
          }}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10",
            selectedPlace && "border-green-500 bg-green-500/5"
          )}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {selectedPlace && !loading && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-[240px] overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
              onClick={() => handleSelect(prediction)}
            >
              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">
                  {prediction.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.secondary_text}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected indicator */}
      {selectedPlace && (
        <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Localização selecionada - será validada ao adicionar
        </p>
      )}
    </div>
  );
}
