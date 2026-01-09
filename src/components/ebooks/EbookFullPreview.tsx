import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Monitor, Tablet, Smartphone, X } from "lucide-react";

interface ContentImage {
  url: string;
  context: string;
  after_chapter?: number;
}

interface EbookFullPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  author: string;
  content: string | null;
  coverImageUrl: string | null;
  accentColor: string;
  lightColor: string;
  ctaTitle?: string;
  ctaBody?: string;
  ctaButtonText?: string;
  contentImages?: ContentImage[];
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface Page {
  type: 'cover' | 'content' | 'cta';
  content: string;
  image?: string;
}

export function EbookFullPreview({
  open,
  onOpenChange,
  title,
  author,
  content,
  coverImageUrl,
  accentColor,
  lightColor,
  ctaTitle,
  ctaBody,
  ctaButtonText,
  contentImages = [],
}: EbookFullPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [device, setDevice] = useState<DeviceType>('desktop');

  const pages = useMemo<Page[]>(() => {
    const result: Page[] = [];
    
    // Cover page
    result.push({
      type: 'cover',
      content: title,
      image: coverImageUrl || undefined,
    });
    
    // Content pages - split by chapters (## headings)
    if (content) {
      const chapters = content.split(/\n(?=## )/).filter(c => c.trim());
      
      chapters.forEach((chapter, index) => {
        const chapterImage = contentImages.find(img => img.after_chapter === index + 1);
        result.push({
          type: 'content',
          content: chapter,
          image: chapterImage?.url,
        });
      });
    }
    
    // CTA page
    if (ctaTitle) {
      result.push({
        type: 'cta',
        content: ctaTitle,
      });
    }
    
    return result;
  }, [title, content, coverImageUrl, ctaTitle, contentImages]);

  const totalPages = pages.length;

  const goToPage = (page: number) => {
    if (page >= 0 && page < totalPages) {
      setCurrentPage(page);
    }
  };

  const deviceWidths: Record<DeviceType, string> = {
    desktop: 'max-w-4xl',
    tablet: 'max-w-lg',
    mobile: 'max-w-sm',
  };

  const renderPage = (page: Page) => {
    switch (page.type) {
      case 'cover':
        return (
          <div 
            className="aspect-[3/4] rounded-lg flex flex-col items-center justify-center p-8 text-center relative overflow-hidden"
            style={{ backgroundColor: accentColor }}
          >
            {page.image && (
              <div className="absolute inset-0 opacity-20">
                <img src={page.image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="relative z-10 space-y-4">
              <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {page.content}
              </h1>
              {author && (
                <p className="text-white/80 text-sm">Por {author}</p>
              )}
            </div>
          </div>
        );
        
      case 'content':
        return (
          <div 
            className="aspect-[3/4] rounded-lg p-6 overflow-auto"
            style={{ backgroundColor: lightColor }}
          >
            <div className="prose prose-sm max-w-none">
              {page.content.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (!trimmed) return <br key={i} />;
                
                if (trimmed.startsWith('## ')) {
                  return (
                    <h2 key={i} className="text-lg font-bold mt-4 mb-2" style={{ color: accentColor }}>
                      {trimmed.slice(3)}
                    </h2>
                  );
                }
                if (trimmed.startsWith('### ')) {
                  return (
                    <h3 key={i} className="text-base font-semibold mt-3 mb-2 text-foreground">
                      {trimmed.slice(4)}
                    </h3>
                  );
                }
                if (trimmed.startsWith('💡 ')) {
                  return (
                    <div key={i} className="bg-purple-100 dark:bg-purple-900/30 border-l-4 border-purple-500 p-3 rounded-r my-2">
                      <span className="font-bold text-purple-700 dark:text-purple-400 text-xs">💡 Verdade Dura</span>
                      <p className="text-purple-900 dark:text-purple-200 text-sm mt-1">{trimmed.slice(3)}</p>
                    </div>
                  );
                }
                if (trimmed.startsWith('⚠️ ')) {
                  return (
                    <div key={i} className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 p-3 rounded-r my-2">
                      <span className="font-bold text-red-700 dark:text-red-400 text-xs">⚠️ Atenção</span>
                      <p className="text-red-900 dark:text-red-200 text-sm mt-1">{trimmed.slice(3)}</p>
                    </div>
                  );
                }
                if (trimmed.startsWith('📌 ')) {
                  return (
                    <div key={i} className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 p-3 rounded-r my-2">
                      <span className="font-bold text-blue-700 dark:text-blue-400 text-xs">📌 Dica</span>
                      <p className="text-blue-900 dark:text-blue-200 text-sm mt-1">{trimmed.slice(3)}</p>
                    </div>
                  );
                }
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <li key={i} className="text-sm text-muted-foreground ml-4">
                      {trimmed.slice(2)}
                    </li>
                  );
                }
                
                return <p key={i} className="text-sm text-muted-foreground my-2">{trimmed}</p>;
              })}
            </div>
            {page.image && (
              <div className="mt-4 rounded-lg overflow-hidden">
                <img src={page.image} alt="" className="w-full h-auto" />
              </div>
            )}
          </div>
        );
        
      case 'cta':
        return (
          <div 
            className="aspect-[3/4] rounded-lg flex flex-col items-center justify-center p-8 text-center"
            style={{ backgroundColor: accentColor }}
          >
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
              {ctaTitle}
            </h2>
            {ctaBody && (
              <p className="text-white/90 text-sm mb-6 max-w-[80%]">
                {ctaBody}
              </p>
            )}
            {ctaButtonText && (
              <Button variant="secondary" className="bg-white text-foreground hover:bg-white/90">
                {ctaButtonText}
              </Button>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              Visualizar eBook Completo
              <Badge variant="secondary">{currentPage + 1} / {totalPages}</Badge>
            </DialogTitle>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={device === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setDevice('desktop')}
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={device === 'tablet' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setDevice('tablet')}
                >
                  <Tablet className="h-4 w-4" />
                </Button>
                <Button
                  variant={device === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setDevice('mobile')}
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-muted/50 p-8">
          <div className={`w-full ${deviceWidths[device]} transition-all duration-300`}>
            {pages[currentPage] && renderPage(pages[currentPage])}
          </div>
        </div>
        
        <div className="p-4 border-t flex items-center justify-center gap-4 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>
          
          <div className="flex items-center gap-1">
            {pages.map((_, index) => (
              <button
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentPage ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
                onClick={() => goToPage(index)}
              />
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages - 1}
          >
            Próxima
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
