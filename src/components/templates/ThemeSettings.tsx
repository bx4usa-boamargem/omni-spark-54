import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sun, Moon, Laptop, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Blog {
  id: string;
  theme_mode?: string | null;
  dark_primary_color?: string | null;
  dark_secondary_color?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

interface ThemeSettingsProps {
  blogId: string;
  blog: Blog;
}

export const ThemeSettings = ({ blogId, blog }: ThemeSettingsProps) => {
  const [themeMode, setThemeMode] = useState(blog.theme_mode || 'auto');
  const [darkPrimaryColor, setDarkPrimaryColor] = useState(blog.dark_primary_color || '');
  const [darkSecondaryColor, setDarkSecondaryColor] = useState(blog.dark_secondary_color || '');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('blogs')
        .update({
          theme_mode: themeMode,
          dark_primary_color: darkPrimaryColor || null,
          dark_secondary_color: darkSecondaryColor || null,
        })
        .eq('id', blogId);
      
      if (error) throw error;
      
      toast.success('Configurações de tema salvas!');
    } catch (error) {
      console.error('Error saving theme settings:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">☀️🌙</span>
            Modo de Tema
          </CardTitle>
          <CardDescription>
            Escolha como o tema do seu blog será exibido para os visitantes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={themeMode} onValueChange={setThemeMode} className="grid gap-4">
            <div className="flex items-start space-x-4 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer">
              <RadioGroupItem value="light" id="light" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="light" className="flex items-center gap-2 cursor-pointer">
                  <Sun className="h-5 w-5 text-amber-500" />
                  <span className="font-medium">Claro</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Sempre usar tema claro, independente do horário
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer">
              <RadioGroupItem value="dark" id="dark" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="dark" className="flex items-center gap-2 cursor-pointer">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <span className="font-medium">Escuro</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Sempre usar tema escuro, independente do horário
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4 p-4 rounded-lg border hover:border-primary transition-colors cursor-pointer bg-primary/5">
              <RadioGroupItem value="auto" id="auto" className="mt-1" />
              <div className="flex-1">
                <Label htmlFor="auto" className="flex items-center gap-2 cursor-pointer">
                  <Laptop className="h-5 w-5 text-primary" />
                  <span className="font-medium">Automático</span>
                  <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">Recomendado</span>
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Transição automática baseada no horário do visitante
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sun className="h-3 w-3" /> 6h - 18h
                  </span>
                  <span className="flex items-center gap-1">
                    <Moon className="h-3 w-3" /> 18h - 6h
                  </span>
                </div>
              </div>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Cores para Modo Escuro</CardTitle>
          <CardDescription>
            Defina cores personalizadas para quando o tema escuro estiver ativo.
            Se não definidas, usaremos versões mais claras das cores originais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="darkPrimary">Cor Primária (Escuro)</Label>
              <div className="flex gap-2">
                <Input
                  id="darkPrimary"
                  type="color"
                  value={darkPrimaryColor || blog.primary_color || '#8b9cf6'}
                  onChange={(e) => setDarkPrimaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={darkPrimaryColor}
                  onChange={(e) => setDarkPrimaryColor(e.target.value)}
                  placeholder={blog.primary_color || '#8b9cf6'}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="darkSecondary">Cor Secundária (Escuro)</Label>
              <div className="flex gap-2">
                <Input
                  id="darkSecondary"
                  type="color"
                  value={darkSecondaryColor || blog.secondary_color || '#a78bfa'}
                  onChange={(e) => setDarkSecondaryColor(e.target.value)}
                  className="w-12 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={darkSecondaryColor}
                  onChange={(e) => setDarkSecondaryColor(e.target.value)}
                  placeholder={blog.secondary_color || '#a78bfa'}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Para modo escuro, use cores mais claras e vibrantes
            para garantir boa legibilidade e contraste.
          </div>
          
          {/* Preview */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-white border">
              <div className="text-xs text-gray-500 mb-2">Modo Claro</div>
              <div 
                className="h-8 rounded mb-2"
                style={{ backgroundColor: blog.primary_color || '#6366f1' }}
              />
              <div 
                className="h-4 rounded"
                style={{ backgroundColor: blog.secondary_color || '#8b5cf6' }}
              />
            </div>
            <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Modo Escuro</div>
              <div 
                className="h-8 rounded mb-2"
                style={{ backgroundColor: darkPrimaryColor || '#8b9cf6' }}
              />
              <div 
                className="h-4 rounded"
                style={{ backgroundColor: darkSecondaryColor || '#a78bfa' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};
