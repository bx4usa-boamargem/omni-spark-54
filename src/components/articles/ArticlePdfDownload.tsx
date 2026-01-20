import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BookOpen, Loader2, Download, Copy, Check, ExternalLink } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ArticlePdfDownloadProps {
  articleId: string;
  articleTitle: string;
  existingPdfUrl?: string | null;
  existingPdfGeneratedAt?: string | null;
  onPdfGenerated?: (url: string) => void;
  variant?: 'default' | 'compact' | 'icon';
  primaryColor?: string;
}

export function ArticlePdfDownload({
  articleId,
  articleTitle,
  existingPdfUrl,
  existingPdfGeneratedAt,
  onPdfGenerated,
  variant = 'default',
  primaryColor
}: ArticlePdfDownloadProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(existingPdfUrl || null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePdf = async () => {
    setIsGenerating(true);
    
    try {
      toast.info('Gerando e-Book PDF...', { duration: 3000 });

      const { data, error } = await supabase.functions.invoke('generate-article-pdf', {
        body: { article_id: articleId }
      });

      if (error) throw error;

      if (data?.success && data?.html) {
        // Convert HTML to PDF client-side using jsPDF + html2canvas
        await generatePdfFromHtml(data.html, articleTitle);
        
        if (data.pdf_url) {
          setPdfUrl(data.pdf_url);
          onPdfGenerated?.(data.pdf_url);
        }
        
        toast.success('e-Book PDF gerado com sucesso!');
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Erro ao gerar PDF', {
        description: error instanceof Error ? error.message : 'Tente novamente'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePdfFromHtml = async (html: string, title: string) => {
    // Dynamic import for jsPDF and html2canvas
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');

    // Create temporary container
    const container = document.createElement('div');
    container.innerHTML = html;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '794px'; // A4 width in pixels at 96 DPI
    container.style.background = 'white';
    document.body.appendChild(container);

    try {
      // Render to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123 // A4 height
      });

      // Create PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 0;
      const contentWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      // Add first page
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);

      // Add more pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, imgHeight);
        heightLeft -= (pageHeight - margin * 2);
      }

      // Download
      const filename = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
      
      pdf.save(`${filename}-ebook.pdf`);
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleCopyLink = async () => {
    if (!pdfUrl) return;
    
    try {
      await navigator.clipboard.writeText(pdfUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  };

  const handleOpenPdf = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  // Compact variant (for editor toolbar)
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  e-Book PDF
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Baixar artigo como e-Book PDF</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Icon-only variant
  if (variant === 'icon') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleGeneratePdf}
              disabled={isGenerating}
              className="h-8 w-8"
              style={{ color: primaryColor }}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Baixar como e-Book PDF</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Default variant (for public article page)
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleGeneratePdf}
        disabled={isGenerating}
        className="gap-2"
        style={{
          borderColor: primaryColor ? `${primaryColor}50` : undefined,
          color: primaryColor || undefined
        }}
      >
        {isGenerating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Gerando e-Book...
          </>
        ) : (
          <>
            <BookOpen className="h-4 w-4" />
            <Download className="h-3.5 w-3.5" />
            Baixar como e-Book
          </>
        )}
      </Button>

      {pdfUrl && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenPdf}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Abrir PDF
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copiado!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar link
              </>
            )}
          </Button>
        </>
      )}

      {existingPdfGeneratedAt && (
        <span className="text-xs text-muted-foreground ml-2">
          Gerado em {new Date(existingPdfGeneratedAt).toLocaleDateString('pt-BR')}
        </span>
      )}
    </div>
  );
}