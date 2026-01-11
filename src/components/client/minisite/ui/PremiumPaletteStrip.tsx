import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface PremiumPaletteStripProps {
  primaryColor: string;
}

interface ShadeInfo {
  level: string;
  color: string;
}

// Generate palette shades from primary color
function generateShades(baseColor: string): ShadeInfo[] {
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  const toHex = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");

  const lighten = (factor: number) => {
    const nr = r + (255 - r) * factor;
    const ng = g + (255 - g) * factor;
    const nb = b + (255 - b) * factor;
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`.toUpperCase();
  };

  const darken = (factor: number) => {
    const nr = r * factor;
    const ng = g * factor;
    const nb = b * factor;
    return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`.toUpperCase();
  };

  return [
    { level: "50", color: lighten(0.9) },
    { level: "100", color: lighten(0.8) },
    { level: "200", color: lighten(0.6) },
    { level: "300", color: lighten(0.4) },
    { level: "400", color: lighten(0.2) },
    { level: "500", color: baseColor.toUpperCase() },
    { level: "600", color: darken(0.85) },
    { level: "700", color: darken(0.7) },
    { level: "800", color: darken(0.55) },
    { level: "900", color: darken(0.4) },
  ];
}

export function PremiumPaletteStrip({ primaryColor }: PremiumPaletteStripProps) {
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);
  const shades = generateShades(primaryColor);

  const copyColor = (shade: ShadeInfo) => {
    navigator.clipboard.writeText(shade.color);
    setCopiedLevel(shade.level);
    toast.success(`Cor ${shade.color} copiada!`);
    setTimeout(() => setCopiedLevel(null), 2000);
  };

  return (
    <div className="space-y-3">
      {/* Color Strip - NO text on blocks */}
      <TooltipProvider>
        <div className="flex gap-2">
          {shades.map((shade) => (
            <Tooltip key={shade.level}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => copyColor(shade)}
                  className="flex-1 h-14 rounded-lg transition-all 
                           hover:scale-105 hover:shadow-md 
                           focus:outline-none focus:ring-2 focus:ring-primary/20
                           relative"
                  style={{ backgroundColor: shade.color }}
                  aria-label={`Copiar cor ${shade.level}: ${shade.color}`}
                >
                  {copiedLevel === shade.level && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white drop-shadow-md" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="font-mono text-xs">
                {shade.color}
                <span className="ml-2 text-gray-400">
                  <Copy className="inline h-3 w-3" />
                </span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>

      {/* Labels BELOW the strip */}
      <div className="flex gap-2">
        {shades.map((shade) => (
          <div key={shade.level} className="flex-1 text-center">
            <span className="text-xs text-gray-400 font-medium">{shade.level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
