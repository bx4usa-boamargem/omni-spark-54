import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface OnboardingStep {
  targetId: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    targetId: "keyword-search-input",
    title: "1. Comece aqui",
    description: "Digite uma palavra-chave que você quer ranquear. Pode ser um tema do seu nicho ou uma pergunta que seus clientes fazem frequentemente.",
    position: "bottom",
  },
  {
    targetId: "keyword-analyze-btn",
    title: "2. Analise com IA",
    description: "Clique para a IA analisar dificuldade, volume de busca estimado e sugerir variações da palavra-chave.",
    position: "bottom",
  },
  {
    targetId: "keyword-difficulty-card",
    title: "3. Entenda a Dificuldade",
    description: "Quanto menor o número, mais fácil de ranquear. Abaixo de 30% = fácil para blogs novos. Acima de 60% = muito competitivo.",
    position: "bottom",
  },
  {
    targetId: "keyword-volume-card",
    title: "4. Volume de Busca",
    description: "Quantas pessoas buscam isso por mês no Google. O ideal é encontrar palavras com volume razoável (1K+) e dificuldade baixa.",
    position: "bottom",
  },
  {
    targetId: "keyword-related",
    title: "5. Expanda suas Opções",
    description: "Clique em qualquer palavra relacionada para analisá-la. Long-tail keywords (frases mais longas) geralmente são mais fáceis de ranquear.",
    position: "top",
  },
  {
    targetId: "keyword-titles",
    title: "6. Crie Conteúdo",
    description: "A IA sugere títulos otimizados para SEO. Clique em qualquer um para criar um artigo diretamente com esse tema!",
    position: "top",
  },
];

interface KeywordOnboardingGuideProps {
  onComplete: () => void;
}

export function KeywordOnboardingGuide({ onComplete }: KeywordOnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const step = ONBOARDING_STEPS[currentStep];

  useEffect(() => {
    const updatePosition = () => {
      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setTargetRect(null);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [step.targetId]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("keyword-onboarding-completed", "true");
    onComplete();
  };

  const getPopoverStyle = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 1001,
      };
    }

    const padding = 16;
    const popoverWidth = 320;
    const popoverHeight = 180;

    let top = 0;
    let left = 0;

    switch (step.position) {
      case "bottom":
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case "top":
        top = targetRect.top - popoverHeight - padding;
        left = targetRect.left + targetRect.width / 2 - popoverWidth / 2;
        break;
      case "left":
        top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
        left = targetRect.left - popoverWidth - padding;
        break;
      case "right":
        top = targetRect.top + targetRect.height / 2 - popoverHeight / 2;
        left = targetRect.right + padding;
        break;
    }

    // Keep within viewport
    left = Math.max(16, Math.min(left, window.innerWidth - popoverWidth - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - popoverHeight - 16));

    return {
      position: "fixed",
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
      zIndex: 1001,
    };
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/60 z-[1000]"
        onClick={handleComplete}
      />

      {/* Spotlight */}
      {targetRect && (
        <div
          className="fixed border-4 border-primary rounded-lg z-[1000] pointer-events-none animate-pulse"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}

      {/* Popover */}
      <Card
        ref={popoverRef}
        className="p-4 shadow-xl border-primary/20"
        style={getPopoverStyle()}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-primary">{step.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1 -mr-1"
              onClick={handleComplete}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {step.description}
          </p>

          <div className="flex items-center justify-between pt-2">
            {/* Progress indicator */}
            <div className="flex gap-1">
              {ONBOARDING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-4 rounded-full transition-colors ${
                    i === currentStep
                      ? "bg-primary"
                      : i < currentStep
                      ? "bg-primary/40"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>

            {/* Navigation */}
            <div className="flex gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" onClick={handleNext}>
                {currentStep === ONBOARDING_STEPS.length - 1 ? (
                  "Concluir"
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </>
  );
}
