import { Label } from "@/components/ui/label";
import { ThemeCard } from "../ui/ThemeCard";
import { Paintbrush } from "lucide-react";

interface DesignSectionProps {
  layoutTemplate: string;
  onLayoutChange: (value: string) => void;
}

const LAYOUT_OPTIONS = [
  { 
    id: 'minimal', 
    name: 'Minimalista', 
    description: 'Limpo e focado no conteúdo',
  },
  { 
    id: 'modern', 
    name: 'Moderno', 
    description: 'Visual contemporâneo',
  },
  { 
    id: 'corporate', 
    name: 'Profissional', 
    description: 'Formal e confiável',
  },
];

export function DesignSection({
  layoutTemplate,
  onLayoutChange,
}: DesignSectionProps) {
  return (
    <div className="space-y-6">
      {/* Theme Selection */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-gray-700">
          <Paintbrush className="h-4 w-4 text-gray-500" />
          Tema do Site
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LAYOUT_OPTIONS.map((option) => (
            <ThemeCard
              key={option.id}
              id={option.id}
              name={option.name}
              description={option.description}
              selected={layoutTemplate === option.id}
              onClick={() => onLayoutChange(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
