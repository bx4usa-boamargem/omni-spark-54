import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2, X } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SEASONAL_TEMPLATES, isSeasonalAvailable, SeasonalTemplate } from './templateData';

interface Blog {
  id: string;
  seasonal_template?: string | null;
  seasonal_template_expires_at?: string | null;
}

interface SeasonalTemplateManagerProps {
  blogId: string;
  blog: Blog;
}

export const SeasonalTemplateManager = ({ blogId, blog }: SeasonalTemplateManagerProps) => {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    blog.seasonal_template_expires_at ? new Date(blog.seasonal_template_expires_at) : undefined
  );
  const [selectedSeasonal, setSelectedSeasonal] = useState<string | null>(null);
  
  const activeSeasonal = blog.seasonal_template;
  const expiresAt = blog.seasonal_template_expires_at;
  const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;
  
  const handleActivate = async (seasonal: SeasonalTemplate) => {
    if (!expirationDate) {
      toast.error('Selecione uma data de expiração');
      return;
    }
    
    setIsLoading(seasonal.id);
    try {
      const { error } = await supabase
        .from('blogs')
        .update({
          seasonal_template: seasonal.id,
          seasonal_template_expires_at: expirationDate.toISOString(),
        })
        .eq('id', blogId);
      
      if (error) throw error;
      
      toast.success(`Template "${seasonal.name}" ativado até ${format(expirationDate, "d 'de' MMMM", { locale: ptBR })}`);
      setSelectedSeasonal(null);
    } catch (error) {
      console.error('Error activating seasonal template:', error);
      toast.error('Erro ao ativar template sazonal');
    } finally {
      setIsLoading(null);
    }
  };
  
  const handleDeactivate = async () => {
    setIsLoading('deactivate');
    try {
      const { error } = await supabase
        .from('blogs')
        .update({
          seasonal_template: null,
          seasonal_template_expires_at: null,
        })
        .eq('id', blogId);
      
      if (error) throw error;
      
      toast.success('Template sazonal desativado');
    } catch (error) {
      console.error('Error deactivating seasonal template:', error);
      toast.error('Erro ao desativar template');
    } finally {
      setIsLoading(null);
    }
  };
  
  const getDefaultExpiration = (seasonal: SeasonalTemplate): Date => {
    const today = new Date();
    // Set default expiration based on seasonal type
    switch (seasonal.id) {
      case 'christmas':
        return new Date(today.getFullYear(), 11, 26); // Dec 26
      case 'black_friday':
        return addDays(today, 7); // 1 week
      case 'new_year':
        return new Date(today.getFullYear() + 1, 0, 7); // Jan 7
      default:
        return addDays(today, 14); // 2 weeks
    }
  };
  
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Active Seasonal Banner */}
      {activeSeasonal && !isExpired && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {SEASONAL_TEMPLATES.find(s => s.id === activeSeasonal)?.icon}
                </span>
                <div>
                  <h3 className="font-semibold">
                    {SEASONAL_TEMPLATES.find(s => s.id === activeSeasonal)?.name} Ativo
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Expira em {expiresAt ? format(new Date(expiresAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDeactivate}
                disabled={isLoading === 'deactivate'}
              >
                {isLoading === 'deactivate' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Desativar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🎄</span>
            Templates Sazonais
          </CardTitle>
          <CardDescription>
            Aplique um visual temático temporário ao seu blog para datas especiais
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {SEASONAL_TEMPLATES.map(seasonal => {
            const available = isSeasonalAvailable(seasonal);
            const isActive = activeSeasonal === seasonal.id && !isExpired;
            const isSelecting = selectedSeasonal === seasonal.id;
            
            return (
              <div 
                key={seasonal.id}
                className={`p-4 rounded-lg border transition-all ${
                  isActive 
                    ? 'border-primary bg-primary/5' 
                    : available 
                      ? 'border-border hover:border-primary/50' 
                      : 'border-border opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <span className="text-4xl">{seasonal.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{seasonal.name}</h3>
                        {available && <Badge className="bg-emerald-500">Disponível</Badge>}
                        {isActive && <Badge className="bg-primary">Ativo</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {seasonal.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {seasonal.effects.map(effect => (
                          <span 
                            key={effect}
                            className="text-xs bg-muted px-2 py-1 rounded"
                          >
                            {effect}
                          </span>
                        ))}
                      </div>
                      
                      {/* Color Preview */}
                      <div className="flex items-center gap-2 mt-3">
                        <span className="text-xs text-muted-foreground">Cores:</span>
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: seasonal.colorScheme.primary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: seasonal.colorScheme.secondary }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: seasonal.colorScheme.accent }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {!available && (
                      <Badge variant="outline">
                        Disponível em {new Date(2025, seasonal.availableMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </Badge>
                    )}
                    
                    {available && !isActive && !isSelecting && (
                      <Button 
                        size="sm"
                        onClick={() => {
                          setSelectedSeasonal(seasonal.id);
                          setExpirationDate(getDefaultExpiration(seasonal));
                        }}
                      >
                        Ativar
                      </Button>
                    )}
                    
                    {isSelecting && (
                      <div className="flex flex-col gap-2 items-end">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              <CalendarIcon className="h-4 w-4 mr-2" />
                              {expirationDate 
                                ? format(expirationDate, "d 'de' MMM", { locale: ptBR })
                                : 'Expira em'
                              }
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={expirationDate}
                              onSelect={setExpirationDate}
                              disabled={(date) => date < new Date()}
                              locale={ptBR}
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => setSelectedSeasonal(null)}
                          >
                            Cancelar
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleActivate(seasonal)}
                            disabled={isLoading === seasonal.id}
                          >
                            {isLoading === seasonal.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Confirmar'
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-sm text-muted-foreground">
              <strong>Dica:</strong> Templates sazonais são aplicados temporariamente sobre o template principal.
              Quando expiram, seu blog volta automaticamente ao layout normal.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
