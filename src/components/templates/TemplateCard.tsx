import { Badge } from '@/components/ui/badge';
import { Star, Sparkles } from 'lucide-react';
import { TemplateDefinition } from './templateData';

interface TemplateCardProps {
  template: TemplateDefinition;
  isSelected?: boolean;
  primaryColor?: string;
  onClick: () => void;
}

export const TemplateCard = ({ template, isSelected, primaryColor = '#6366f1', onClick }: TemplateCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer rounded-xl border-2 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
        isSelected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-border hover:border-primary/50'
      }`}
    >
      {/* Preview Thumbnail */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <TemplateThumbnail template={template} primaryColor={primaryColor} />
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {template.isPopular && (
            <Badge className="bg-amber-500 text-white text-xs flex items-center gap-1">
              <Star className="h-3 w-3" />
              Popular
            </Badge>
          )}
          {template.isNew && (
            <Badge className="bg-emerald-500 text-white text-xs flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Novo
            </Badge>
          )}
        </div>
        
        {/* Selected Overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
          {template.name}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {template.description}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Mini preview component for each template
const TemplateThumbnail = ({ template, primaryColor }: { template: TemplateDefinition; primaryColor: string }) => {
  const styles = {
    primary: primaryColor,
    muted: 'hsl(var(--muted))',
    card: 'hsl(var(--card))',
    foreground: 'hsl(var(--foreground))',
  };
  
  return (
    <div className="w-full h-full bg-background p-2 scale-100">
      {/* Mini Header */}
      <div className="h-4 bg-card border-b flex items-center px-2 rounded-t">
        <div 
          className="w-3 h-3 rounded" 
          style={{ backgroundColor: styles.primary }}
        />
        <div className="flex-1" />
        <div className="flex gap-1">
          <div className="w-6 h-2 bg-muted rounded" />
          <div className="w-6 h-2 bg-muted rounded" />
        </div>
      </div>
      
      {/* Mini Hero based on template style */}
      <div 
        className={`mt-1 rounded flex items-center justify-center ${
          template.heroStyle === 'minimal' ? 'h-8 bg-background' :
          template.heroStyle === 'split' ? 'h-12 bg-gradient-to-r' :
          template.heroStyle === 'ticker' ? 'h-6 bg-muted' :
          'h-10 bg-gradient-to-br'
        }`}
        style={{
          background: template.heroStyle === 'minimal' 
            ? undefined 
            : `linear-gradient(135deg, ${styles.primary}20, ${styles.primary}05)`
        }}
      >
        {template.heroStyle === 'split' ? (
          <div className="flex w-full h-full">
            <div className="flex-1 flex flex-col justify-center p-1">
              <div className="w-10 h-1.5 bg-foreground/20 rounded mb-1" />
              <div className="w-8 h-1 bg-foreground/10 rounded" />
            </div>
            <div className="w-1/3 bg-muted rounded-r" />
          </div>
        ) : template.heroStyle === 'ticker' ? (
          <div className="flex gap-2 px-2 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-12 h-2 bg-foreground/10 rounded flex-shrink-0" />
            ))}
          </div>
        ) : template.heroStyle === 'featured' ? (
          <div className="flex w-full h-full gap-1 p-1">
            <div className="w-2/3 bg-muted rounded" />
            <div className="flex-1 flex flex-col gap-1">
              <div className="flex-1 bg-muted rounded" />
              <div className="flex-1 bg-muted rounded" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-12 h-1.5 bg-foreground/20 rounded mb-1" />
            <div className="w-8 h-1 bg-foreground/10 rounded" />
          </div>
        )}
      </div>
      
      {/* Mini Grid */}
      <div 
        className={`mt-1 gap-1 ${
          template.gridStyle === 'list' ? 'flex flex-col' : 'grid'
        }`}
        style={{
          gridTemplateColumns: template.gridStyle === 'list' 
            ? undefined 
            : `repeat(${Math.min(template.gridColumns, 3)}, 1fr)`
        }}
      >
        {Array.from({ length: template.gridStyle === 'list' ? 3 : 6 }).map((_, i) => (
          <div 
            key={i} 
            className={`bg-muted rounded ${
              template.gridStyle === 'list' 
                ? 'h-3 flex items-center px-1' 
                : template.gridStyle === 'masonry'
                  ? i % 2 === 0 ? 'h-8' : 'h-6'
                  : 'h-6'
            } ${template.cardStyle === 'colorful' ? 'border-l-2' : ''}`}
            style={{
              borderLeftColor: template.cardStyle === 'colorful' ? styles.primary : undefined
            }}
          >
            {template.gridStyle === 'list' && (
              <div className="w-full h-1 bg-foreground/10 rounded" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
