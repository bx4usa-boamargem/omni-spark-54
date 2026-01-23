import { ProcessStep } from "../types/landingPageTypes";

interface ProcessStepsBlockProps {
  steps: ProcessStep[];
  primaryColor?: string;
  onEdit?: (index: number, field: keyof ProcessStep, value: string | number) => void;
  isEditing?: boolean;
}

export function ProcessStepsBlock({ 
  steps,
  primaryColor,
  onEdit,
  isEditing = false 
}: ProcessStepsBlockProps) {
  return (
    <section className="py-16 px-4 bg-muted/30">
      <div className="container max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Como Funciona
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nosso processo simples e eficiente para atender você
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line (desktop) */}
          <div 
            className="hidden md:block absolute top-12 left-0 right-0 h-1 rounded-full"
            style={{ backgroundColor: `${primaryColor || 'hsl(var(--primary))'}20` }}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step Number */}
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center mb-6 text-white text-3xl font-bold shadow-lg relative z-10"
                  style={{ backgroundColor: primaryColor || 'hsl(var(--primary))' }}
                >
                  {step.step || index + 1}
                </div>

                {/* Title */}
                {isEditing ? (
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => onEdit?.(index, 'title', e.target.value)}
                    className="text-xl font-semibold text-foreground mb-3 bg-transparent border-b-2 border-muted w-full text-center focus:outline-none focus:border-primary"
                  />
                ) : (
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                )}

                {/* Description */}
                {isEditing ? (
                  <textarea
                    value={step.description}
                    onChange={(e) => onEdit?.(index, 'description', e.target.value)}
                    className="text-muted-foreground bg-transparent border border-muted rounded p-2 w-full resize-none text-center focus:outline-none focus:border-primary"
                    rows={3}
                  />
                ) : (
                  <p className="text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
