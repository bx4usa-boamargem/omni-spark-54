import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Smartphone, Tablet, Monitor, Sun, Moon, Check, Loader2 } from 'lucide-react';
import { TemplateDefinition } from './templateData';
import { TemplateLivePreview } from './TemplateLivePreview';

interface Blog {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  author_name?: string | null;
  author_photo_url?: string | null;
}

interface Article {
  id: string;
  title: string;
  excerpt?: string | null;
  featured_image_url?: string | null;
  slug: string;
  reading_time?: number | null;
  created_at: string;
}

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplateDefinition;
  blog: Blog;
  articles: Article[];
  onSelect: () => void;
  isLoading?: boolean;
}

type ViewportSize = 'mobile' | 'tablet' | 'desktop';

export const TemplatePreviewModal = ({
  open,
  onOpenChange,
  template,
  blog,
  articles,
  onSelect,
  isLoading = false,
}: TemplatePreviewModalProps) => {
  const [viewport, setViewport] = useState<ViewportSize>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('light');
  
  const viewportWidths: Record<ViewportSize, string> = {
    mobile: 'max-w-[375px]',
    tablet: 'max-w-[768px]',
    desktop: 'max-w-full',
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                Preview: {template.name}
              </DialogTitle>
              {template.isPopular && (
                <Badge className="bg-amber-500 text-white">Popular</Badge>
              )}
              {template.isNew && (
                <Badge className="bg-emerald-500 text-white">Novo</Badge>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{template.description}</p>
        </DialogHeader>
        
        {/* Controls */}
        <div className="flex items-center justify-between py-3 border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Viewport Toggle */}
            <ToggleGroup type="single" value={viewport} onValueChange={(v) => v && setViewport(v as ViewportSize)}>
              <ToggleGroupItem value="mobile" aria-label="Mobile">
                <Smartphone className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="tablet" aria-label="Tablet">
                <Tablet className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="desktop" aria-label="Desktop">
                <Monitor className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            
            {/* Theme Toggle */}
            <ToggleGroup type="single" value={previewTheme} onValueChange={(v) => v && setPreviewTheme(v as 'light' | 'dark')}>
              <ToggleGroupItem value="light" aria-label="Tema claro">
                <Sun className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="dark" aria-label="Tema escuro">
                <Moon className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          
          <Button onClick={onSelect} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Aplicando...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Usar este modelo
              </>
            )}
          </Button>
        </div>
        
        {/* Preview Area */}
        <div className="flex-1 overflow-auto bg-muted/50 rounded-lg p-4">
          <div className={`mx-auto transition-all duration-300 ${viewportWidths[viewport]}`}>
            <div className={`rounded-lg overflow-hidden shadow-xl ${previewTheme === 'dark' ? 'dark' : ''}`}>
              <TemplateLivePreview
                template={template}
                blog={blog}
                articles={articles}
                isDark={previewTheme === 'dark'}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
