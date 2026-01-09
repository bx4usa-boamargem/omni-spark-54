import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, ChevronRight } from "lucide-react";

interface EbookContentPreviewProps {
  title: string;
  content: string | null;
  author?: string;
  logoUrl?: string;
  lightColor: string;
  accentColor: string;
  coverImageUrl?: string | null;
  ctaTitle?: string;
  ctaBody?: string;
  ctaButtonText?: string;
}

interface ContentSection {
  type: 'title' | 'heading' | 'subheading' | 'paragraph' | 'highlight' | 'list-item';
  content: string;
}

function parseMarkdownToSections(content: string): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('# ')) {
      sections.push({ type: 'title', content: trimmed.slice(2) });
    } else if (trimmed.startsWith('## ')) {
      sections.push({ type: 'heading', content: trimmed.slice(3) });
    } else if (trimmed.startsWith('### ')) {
      sections.push({ type: 'subheading', content: trimmed.slice(4) });
    } else if (trimmed.startsWith('**DESTAQUE:**') || trimmed.startsWith('💡')) {
      const text = trimmed.replace(/^\*\*DESTAQUE:\*\*\s*/, '').replace(/^💡\s*/, '');
      sections.push({ type: 'highlight', content: text });
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      sections.push({ type: 'list-item', content: trimmed.slice(2) });
    } else {
      // Clean markdown formatting
      const cleaned = trimmed
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1');
      sections.push({ type: 'paragraph', content: cleaned });
    }
  }
  
  return sections;
}

export function EbookContentPreview({
  title,
  content,
  author,
  logoUrl,
  lightColor,
  accentColor,
  coverImageUrl,
  ctaTitle,
  ctaBody,
  ctaButtonText,
}: EbookContentPreviewProps) {
  const sections = useMemo(() => {
    if (!content) return [];
    return parseMarkdownToSections(content);
  }, [content]);

  const tableOfContents = useMemo(() => {
    return sections
      .filter(s => s.type === 'title' || s.type === 'heading')
      .map(s => s.content);
  }, [sections]);

  if (!content) {
    return (
      <div 
        className="rounded-lg p-8 text-center"
        style={{ backgroundColor: lightColor }}
      >
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          O conteúdo do eBook será exibido aqui após a geração.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mini page navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <PageThumbnail 
          type="cover" 
          title={title} 
          accentColor={accentColor} 
          coverImageUrl={coverImageUrl}
          active 
        />
        <PageThumbnail 
          type="toc" 
          title="Sumário" 
          accentColor={accentColor} 
        />
        <PageThumbnail 
          type="content" 
          title="Conteúdo" 
          accentColor={accentColor} 
        />
        {ctaTitle && (
          <PageThumbnail 
            type="cta" 
            title="CTA" 
            accentColor={accentColor} 
          />
        )}
      </div>

      {/* Main preview with multiple pages */}
      <ScrollArea className="h-[600px] rounded-lg border bg-muted/30">
        <div className="p-4 space-y-6">
          {/* Cover Page */}
          <div 
            className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {coverImageUrl && (
              <img
                src={coverImageUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-30"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="relative h-full flex flex-col justify-between p-6 text-white">
              <div className="flex justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-8 object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="text-center space-y-3">
                <h2 className="text-lg font-bold leading-tight">{title}</h2>
                {author && <p className="text-sm text-white/80">Por {author}</p>}
              </div>
              <div className="flex justify-center">
                <div className="w-12 h-0.5 rounded-full bg-white/30" />
              </div>
            </div>
          </div>

          {/* Table of Contents Page */}
          <div 
            className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg p-6"
            style={{ backgroundColor: lightColor }}
          >
            <h3 
              className="text-lg font-bold mb-4 pb-2 border-b-2"
              style={{ color: accentColor, borderColor: accentColor }}
            >
              Sumário
            </h3>
            <div className="space-y-2">
              {tableOfContents.map((item, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-2 text-sm text-foreground/80"
                >
                  <ChevronRight className="h-3 w-3" style={{ color: accentColor }} />
                  <span className="line-clamp-1">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Content Pages */}
          <div 
            className="relative rounded-lg overflow-hidden shadow-lg p-6"
            style={{ backgroundColor: lightColor }}
          >
            <div className="prose prose-sm max-w-none">
              {sections.map((section, index) => (
                <ContentBlock 
                  key={index} 
                  section={section} 
                  accentColor={accentColor} 
                />
              ))}
            </div>
          </div>

          {/* CTA Page */}
          {ctaTitle && (
            <div 
              className="relative aspect-[3/4] rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-center p-6 text-white text-center"
              style={{ backgroundColor: accentColor }}
            >
              <h3 className="text-xl font-bold mb-3">{ctaTitle}</h3>
              {ctaBody && (
                <p className="text-sm text-white/90 mb-4 max-w-[80%]">{ctaBody}</p>
              )}
              {ctaButtonText && (
                <button 
                  className="px-6 py-2 rounded-lg font-semibold text-sm"
                  style={{ backgroundColor: 'white', color: accentColor }}
                >
                  {ctaButtonText}
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function PageThumbnail({ 
  type, 
  title, 
  accentColor, 
  coverImageUrl,
  active 
}: { 
  type: 'cover' | 'toc' | 'content' | 'cta'; 
  title: string; 
  accentColor: string;
  coverImageUrl?: string | null;
  active?: boolean;
}) {
  const isCover = type === 'cover' || type === 'cta';
  
  return (
    <div 
      className={`
        flex-shrink-0 w-16 aspect-[3/4] rounded border-2 overflow-hidden
        flex items-center justify-center text-[8px] font-medium
        ${active ? 'ring-2 ring-primary ring-offset-2' : ''}
      `}
      style={{ 
        backgroundColor: isCover ? accentColor : '#f8fafc',
        color: isCover ? 'white' : '#666',
        borderColor: active ? accentColor : 'transparent',
      }}
    >
      {coverImageUrl && type === 'cover' ? (
        <div className="relative w-full h-full">
          <img src={coverImageUrl} alt="" className="w-full h-full object-cover opacity-50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-center px-1 line-clamp-2">{title}</span>
          </div>
        </div>
      ) : (
        <span className="text-center px-1 line-clamp-2">{title}</span>
      )}
    </div>
  );
}

function ContentBlock({ 
  section, 
  accentColor 
}: { 
  section: ContentSection; 
  accentColor: string; 
}) {
  switch (section.type) {
    case 'title':
      return (
        <h2 
          className="text-lg font-bold mt-6 mb-2 pb-1 border-b-2"
          style={{ color: accentColor, borderColor: accentColor }}
        >
          {section.content}
        </h2>
      );
    
    case 'heading':
      return (
        <h3 
          className="text-base font-bold mt-4 mb-2"
          style={{ color: accentColor }}
        >
          {section.content}
        </h3>
      );
    
    case 'subheading':
      return (
        <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground/80">
          {section.content}
        </h4>
      );
    
    case 'highlight':
      return (
        <div 
          className="my-3 p-3 rounded-r-lg border-l-4 text-sm"
          style={{ 
            backgroundColor: `${accentColor}15`, 
            borderColor: accentColor 
          }}
        >
          <span className="font-medium">💡 </span>
          {section.content}
        </div>
      );
    
    case 'list-item':
      return (
        <div className="flex items-start gap-2 my-1 text-sm text-foreground/80">
          <span 
            className="mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: accentColor }}
          />
          <span>{section.content}</span>
        </div>
      );
    
    case 'paragraph':
    default:
      return (
        <p className="text-sm text-foreground/80 my-2 leading-relaxed">
          {section.content}
        </p>
      );
  }
}
