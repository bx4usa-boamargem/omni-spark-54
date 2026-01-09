import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Sparkles, LayoutGrid, Calendar, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  TEMPLATES, 
  TEMPLATE_CATEGORIES, 
  TEMPLATE_NICHES, 
  SEASONAL_TEMPLATES,
  TemplateDefinition,
  TemplateCategory,
  TemplateNiche,
  isSeasonalAvailable,
  getTemplateById 
} from './templateData';
import { TemplateCard } from './TemplateCard';
import { TemplatePreviewModal } from './TemplatePreviewModal';
import { SeasonalTemplateManager } from './SeasonalTemplateManager';
import { TemplateAnalytics } from './TemplateAnalytics';
import { ThemeSettings } from './ThemeSettings';

interface Blog {
  id: string;
  name: string;
  description?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  author_name?: string | null;
  author_photo_url?: string | null;
  layout_template?: string | null;
  theme_mode?: string | null;
  dark_primary_color?: string | null;
  dark_secondary_color?: string | null;
  seasonal_template?: string | null;
  seasonal_template_expires_at?: string | null;
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

interface TemplateGalleryProps {
  blogId: string;
  blog: Blog;
  onTemplateChange?: (templateId: string) => void;
  showTabs?: boolean;
}

export const TemplateGallery = ({ blogId, blog, onTemplateChange, showTabs = true }: TemplateGalleryProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [selectedNiche, setSelectedNiche] = useState<TemplateNiche | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [articles, setArticles] = useState<Article[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState(blog.layout_template || 'modern');
  
  // Fetch articles for preview
  useEffect(() => {
    const fetchArticles = async () => {
      const { data } = await supabase
        .from('articles')
        .select('id, title, excerpt, featured_image_url, slug, reading_time, created_at')
        .eq('blog_id', blogId)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8);
      
      if (data) setArticles(data);
    };
    
    fetchArticles();
  }, [blogId]);
  
  const filteredTemplates = useMemo(() => {
    let templates = TEMPLATES;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => t.category === selectedCategory);
    }
    
    // Filter by niche
    if (selectedNiche) {
      templates = templates.filter(t => t.niche === selectedNiche);
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      templates = templates.filter(t => 
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return templates;
  }, [selectedCategory, selectedNiche, searchQuery]);
  
  const handleSelectTemplate = async () => {
    if (!selectedTemplate) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('blogs')
        .update({ layout_template: selectedTemplate.id })
        .eq('id', blogId);
      
      if (error) throw error;
      
      setCurrentTemplate(selectedTemplate.id);
      setPreviewOpen(false);
      toast.success(`Template "${selectedTemplate.name}" aplicado com sucesso!`);
      onTemplateChange?.(selectedTemplate.id);
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erro ao aplicar template');
    } finally {
      setIsLoading(false);
    }
  };
  
  const openPreview = (template: TemplateDefinition) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };
  
  const GalleryContent = () => (
    <div className="flex gap-6">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        {/* Categories */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Categorias
          </h3>
          <RadioGroup value={selectedCategory} onValueChange={(v) => {
            setSelectedCategory(v as TemplateCategory);
            setSelectedNiche(null);
          }}>
            {TEMPLATE_CATEGORIES.map(cat => (
              <div key={cat.id} className="flex items-center space-x-2">
                <RadioGroupItem value={cat.id} id={`cat-${cat.id}`} />
                <Label htmlFor={`cat-${cat.id}`} className="flex-1 cursor-pointer">
                  {cat.label}
                </Label>
                <span className="text-xs text-muted-foreground">({cat.count})</span>
              </div>
            ))}
          </RadioGroup>
        </div>
        
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Por Nicho
          </h3>
          <div className="space-y-2">
            {TEMPLATE_NICHES.map(niche => (
              <Button
                key={niche.id}
                variant={selectedNiche === niche.id ? 'default' : 'ghost'}
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                  setSelectedNiche(selectedNiche === niche.id ? null : niche.id as TemplateNiche);
                  setSelectedCategory('all');
                }}
              >
                <span className="mr-2">{niche.icon}</span>
                {niche.label}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Sazonais
          </h3>
          <div className="space-y-2">
            {SEASONAL_TEMPLATES.map(seasonal => {
              const available = isSeasonalAvailable(seasonal);
              return (
                <div 
                  key={seasonal.id}
                  className={`flex items-center gap-2 p-2 rounded-lg ${
                    available ? 'bg-primary/10' : 'opacity-50'
                  }`}
                >
                  <span>{seasonal.icon}</span>
                  <span className="text-sm">{seasonal.name}</span>
                  {available && (
                    <Badge variant="secondary" className="ml-auto text-xs">Disponível</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="border-t pt-4">
          <Button variant="outline" className="w-full" disabled>
            <Sparkles className="h-4 w-4 mr-2" />
            Construir com IA
            <Badge variant="secondary" className="ml-2 text-xs">Em breve</Badge>
          </Button>
        </div>
      </div>
      
      {/* Main Grid */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              {selectedNiche 
                ? TEMPLATE_NICHES.find(n => n.id === selectedNiche)?.label
                : TEMPLATE_CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Todos os Templates'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} templates disponíveis
            </p>
          </div>
          {currentTemplate && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Template atual:</span>
              <Badge variant="outline">{getTemplateById(currentTemplate)?.name || currentTemplate}</Badge>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={currentTemplate === template.id}
              primaryColor={blog.primary_color || '#6366f1'}
              onClick={() => openPreview(template)}
            />
          ))}
        </div>
        
        {filteredTemplates.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <LayoutGrid className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum template encontrado</p>
            <p className="text-sm">Tente ajustar os filtros</p>
          </div>
        )}
      </div>
      
      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          template={selectedTemplate}
          blog={blog}
          articles={articles}
          onSelect={handleSelectTemplate}
          isLoading={isLoading}
        />
      )}
    </div>
  );
  
  if (!showTabs) {
    return <GalleryContent />;
  }
  
  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Escolha o estilo do seu blog</h1>
        <p className="text-muted-foreground">
          Selecione um modelo que combina com sua marca. Você pode mudar a qualquer momento.
        </p>
      </div>
      
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="flex items-center gap-2">
            <span className="text-lg">🌓</span>
            <span className="hidden sm:inline">Tema</span>
          </TabsTrigger>
          <TabsTrigger value="seasonal" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Sazonais</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="mt-6">
          <GalleryContent />
        </TabsContent>
        
        <TabsContent value="theme" className="mt-6">
          <ThemeSettings blogId={blogId} blog={blog} />
        </TabsContent>
        
        <TabsContent value="seasonal" className="mt-6">
          <SeasonalTemplateManager blogId={blogId} blog={blog} />
        </TabsContent>
        
        <TabsContent value="analytics" className="mt-6">
          <TemplateAnalytics blogId={blogId} currentTemplate={currentTemplate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
