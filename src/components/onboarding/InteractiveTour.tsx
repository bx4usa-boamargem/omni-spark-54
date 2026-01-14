import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TourStep {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface InteractiveTourProps {
  steps: TourStep[];
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTour({ steps, isOpen, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !steps[currentStep]) return;
    
    const target = document.querySelector(steps[currentStep].target);
    if (target) {
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [currentStep, isOpen, steps]);

  useEffect(() => {
    updateTargetPosition();
    
    // Update on scroll and resize
    window.addEventListener('scroll', updateTargetPosition, true);
    window.addEventListener('resize', updateTargetPosition);
    
    return () => {
      window.removeEventListener('scroll', updateTargetPosition, true);
      window.removeEventListener('resize', updateTargetPosition);
    };
  }, [updateTargetPosition]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onSkip();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const position = step?.position || 'bottom';

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = 16;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    switch (position) {
      case 'top':
        return {
          top: targetRect.top - tooltipHeight - padding,
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: Math.max(padding, Math.min(
            targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
            window.innerWidth - tooltipWidth - padding
          )),
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.left - tooltipWidth - padding,
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
          left: targetRect.right + padding,
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left,
        };
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000]">
      {/* Backdrop with cutout */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-300"
        onClick={handleSkip}
      />
      
      {/* Spotlight on target element */}
      {targetRect && (
        <div
          className="absolute transition-all duration-300 pointer-events-none"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            borderRadius: '12px',
            border: '2px solid hsl(var(--primary))',
          }}
        />
      )}

      {/* Tooltip card */}
      <Card 
        className="absolute w-[320px] p-4 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-10"
        style={getTooltipStyle()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{step?.title}</h3>
              <p className="text-xs text-muted-foreground">
                Passo {currentStep + 1} de {steps.length}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 -mr-2 -mt-1"
            onClick={handleSkip}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground mb-4">
          {step?.content}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentStep 
                  ? "bg-primary w-4" 
                  : index < currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Pular tour
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrev}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? (
                'Concluir'
              ) : (
                <>
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    </div>,
    document.body
  );
}

// Default tour steps for the dashboard
export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="hero-section"]',
    title: 'Seu Painel Principal',
    content: 'Aqui você vê um resumo do desempenho do seu blog, status da automação e acessa ações rápidas.',
    position: 'bottom',
  },
  {
    target: '[data-tour="radar-menu"]',
    title: 'Radar de Oportunidades',
    content: 'Descubra temas com alta demanda no seu nicho e região. A IA analisa buscas reais para encontrar oportunidades.',
    position: 'right',
  },
  {
    target: '[data-tour="articles-menu"]',
    title: 'Seus Artigos',
    content: 'Gerencie todos os seus artigos: rascunhos, publicados e agendados. Edite, publique ou exclua com facilidade.',
    position: 'right',
  },
  {
    target: '[data-tour="automation-menu"]',
    title: 'Automação',
    content: 'Configure o piloto automático para criar e publicar artigos sem esforço manual.',
    position: 'right',
  },
  {
    target: '[data-tour="company-menu"]',
    title: 'Minha Empresa',
    content: 'Configure o perfil do seu negócio, territórios de atuação e economia para cálculos de ROI.',
    position: 'right',
  },
  {
    target: '[data-tour="create-button"]',
    title: 'Criar Artigo',
    content: 'Clique aqui para criar um novo artigo com inteligência artificial. É rápido e fácil!',
    position: 'bottom',
  },
];
