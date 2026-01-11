import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Copy, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface ColorPalette {
  "50": string;
  "100": string;
  "200": string;
  "300": string;
  "400": string;
  "500": string;
  "600": string;
  "700": string;
  "800": string;
  "900": string;
}

interface ColorPaletteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPalette: ColorPalette | null;
  onSave: (palette: ColorPalette) => void;
}

const STANDARD_PALETTES: { name: string; colors: ColorPalette }[] = [
  {
    name: "Roxo",
    colors: {
      "50": "#F4F3FF",
      "100": "#EBE9FE",
      "200": "#D9D6FE",
      "300": "#BDB4FE",
      "400": "#9B8AFB",
      "500": "#7A5AF8",
      "600": "#6938EF",
      "700": "#5925DC",
      "800": "#4A1FB8",
      "900": "#3E1C96",
    },
  },
  {
    name: "Azul",
    colors: {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "200": "#BFDBFE",
      "300": "#93C5FD",
      "400": "#60A5FA",
      "500": "#3B82F6",
      "600": "#2563EB",
      "700": "#1D4ED8",
      "800": "#1E40AF",
      "900": "#1E3A8A",
    },
  },
  {
    name: "Verde",
    colors: {
      "50": "#ECFDF5",
      "100": "#D1FAE5",
      "200": "#A7F3D0",
      "300": "#6EE7B7",
      "400": "#34D399",
      "500": "#10B981",
      "600": "#059669",
      "700": "#047857",
      "800": "#065F46",
      "900": "#064E3B",
    },
  },
  {
    name: "Laranja",
    colors: {
      "50": "#FFF7ED",
      "100": "#FFEDD5",
      "200": "#FED7AA",
      "300": "#FDBA74",
      "400": "#FB923C",
      "500": "#F97316",
      "600": "#EA580C",
      "700": "#C2410C",
      "800": "#9A3412",
      "900": "#7C2D12",
    },
  },
  {
    name: "Rosa",
    colors: {
      "50": "#FDF2F8",
      "100": "#FCE7F3",
      "200": "#FBCFE8",
      "300": "#F9A8D4",
      "400": "#F472B6",
      "500": "#EC4899",
      "600": "#DB2777",
      "700": "#BE185D",
      "800": "#9D174D",
      "900": "#831843",
    },
  },
  {
    name: "Cinza",
    colors: {
      "50": "#F8FAFC",
      "100": "#F1F5F9",
      "200": "#E2E8F0",
      "300": "#CBD5E1",
      "400": "#94A3B8",
      "500": "#64748B",
      "600": "#475569",
      "700": "#334155",
      "800": "#1E293B",
      "900": "#0F172A",
    },
  },
  {
    name: "Índigo",
    colors: {
      "50": "#EEF2FF",
      "100": "#E0E7FF",
      "200": "#C7D2FE",
      "300": "#A5B4FC",
      "400": "#818CF8",
      "500": "#6366F1",
      "600": "#4F46E5",
      "700": "#4338CA",
      "800": "#3730A3",
      "900": "#312E81",
    },
  },
  {
    name: "Vermelho",
    colors: {
      "50": "#FEF2F2",
      "100": "#FEE2E2",
      "200": "#FECACA",
      "300": "#FCA5A5",
      "400": "#F87171",
      "500": "#EF4444",
      "600": "#DC2626",
      "700": "#B91C1C",
      "800": "#991B1B",
      "900": "#7F1D1D",
    },
  },
];

const COLOR_LEVELS = ["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"] as const;

// Function to generate color palette from base color
function generatePaletteFromBase(baseColor: string): ColorPalette {
  const hex = baseColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const generateShade = (factor: number): string => {
    const nr = Math.round(r + (255 - r) * factor);
    const ng = Math.round(g + (255 - g) * factor);
    const nb = Math.round(b + (255 - b) * factor);
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`.toUpperCase();
  };

  const generateTint = (factor: number): string => {
    const nr = Math.round(r * factor);
    const ng = Math.round(g * factor);
    const nb = Math.round(b * factor);
    return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`.toUpperCase();
  };

  return {
    "50": generateShade(0.9),
    "100": generateShade(0.8),
    "200": generateShade(0.6),
    "300": generateShade(0.4),
    "400": generateShade(0.2),
    "500": baseColor.toUpperCase(),
    "600": generateTint(0.85),
    "700": generateTint(0.7),
    "800": generateTint(0.55),
    "900": generateTint(0.4),
  };
}

const DEFAULT_PALETTE = STANDARD_PALETTES[0].colors;

// Premium Swatch Component - No text overlay
function PremiumSwatch({ 
  color, 
  level,
  showCopyOnHover = false 
}: { 
  color: string; 
  level: string;
  showCopyOnHover?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyColor = () => {
    navigator.clipboard.writeText(color);
    setCopied(true);
    toast.success(`${color} copiado!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={copyColor}
        className="w-full h-12 rounded-lg transition-all hover:scale-105 hover:shadow-md 
                   focus:outline-none focus:ring-2 focus:ring-primary/20 relative group"
        style={{ backgroundColor: color }}
        aria-label={`Copiar cor ${level}`}
      >
        {copied && (
          <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-md" />
        )}
        {showCopyOnHover && !copied && (
          <Copy className="absolute inset-0 m-auto h-3.5 w-3.5 text-white/80 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
        )}
      </button>
    </div>
  );
}

export function ColorPaletteModal({
  open,
  onOpenChange,
  currentPalette,
  onSave,
}: ColorPaletteModalProps) {
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(
    currentPalette || DEFAULT_PALETTE
  );
  const [baseColor, setBaseColor] = useState("#7A5AF8");

  const handleSelectStandardPalette = (palette: ColorPalette) => {
    setSelectedPalette(palette);
  };

  const handleColorChange = (level: keyof ColorPalette, color: string) => {
    setSelectedPalette((prev) => ({
      ...prev,
      [level]: color.toUpperCase(),
    }));
  };

  const handleGenerateFromBase = () => {
    const newPalette = generatePaletteFromBase(baseColor);
    setSelectedPalette(newPalette);
  };

  const handleSave = () => {
    onSave(selectedPalette);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary" />
            Paleta de Cores
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="standard" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="standard" className="text-sm">
              Paletas Padrão
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-sm">
              Personalizada
            </TabsTrigger>
          </TabsList>

          {/* STANDARD PALETTES - Wide cards with name BELOW */}
          <TabsContent value="standard" className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Selecione uma paleta pré-definida para seu blog
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STANDARD_PALETTES.map((palette) => {
                const isSelected = JSON.stringify(selectedPalette) === JSON.stringify(palette.colors);
                return (
                  <button
                    key={palette.name}
                    onClick={() => handleSelectStandardPalette(palette.colors)}
                    className={cn(
                      "relative p-4 rounded-xl border-2 transition-all text-left",
                      isSelected
                        ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                        : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                    {/* Color Strip - NO text inside */}
                    <div className="flex h-10 rounded-lg overflow-hidden mb-3">
                      {COLOR_LEVELS.map((level) => (
                        <div
                          key={level}
                          className="flex-1"
                          style={{ backgroundColor: palette.colors[level] }}
                        />
                      ))}
                    </div>
                    {/* Name BELOW */}
                    <span className="text-sm font-medium text-gray-900">
                      {palette.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </TabsContent>

          {/* CUSTOM PALETTE */}
          <TabsContent value="custom" className="space-y-8">
            {/* Generate from base color */}
            <div className="p-5 bg-gray-50 rounded-xl space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-gray-900">
                  Gerar a partir da cor base
                </span>
              </div>
              <div className="flex gap-3">
                <div className="flex gap-2 flex-1">
                  <div
                    className="w-14 h-11 rounded-lg border border-gray-200 overflow-hidden"
                    style={{ backgroundColor: baseColor }}
                  >
                    <Input
                      type="color"
                      value={baseColor}
                      onChange={(e) => setBaseColor(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    type="text"
                    value={baseColor}
                    onChange={(e) => setBaseColor(e.target.value)}
                    placeholder="#7A5AF8"
                    className="flex-1 uppercase font-mono"
                  />
                </div>
                <Button onClick={handleGenerateFromBase} variant="secondary">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Paleta
                </Button>
              </div>
            </div>

            {/* Manual color editing - Large swatches with HEX below */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-900">
                Editar cores manualmente
              </Label>
              <div className="grid grid-cols-5 gap-4">
                {COLOR_LEVELS.map((level) => (
                  <div key={level} className="space-y-2">
                    {/* Large Swatch - No text */}
                    <div
                      className="w-full h-16 rounded-xl border border-gray-200 overflow-hidden relative group cursor-pointer"
                      style={{ backgroundColor: selectedPalette[level] }}
                    >
                      <Input
                        type="color"
                        value={selectedPalette[level]}
                        onChange={(e) => handleColorChange(level, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                    {/* Info BELOW */}
                    <div className="text-center">
                      <p className="text-xs font-medium text-gray-400">{level}</p>
                      <Input
                        type="text"
                        value={selectedPalette[level]}
                        onChange={(e) => handleColorChange(level, e.target.value)}
                        className="mt-1 text-xs uppercase font-mono text-center h-8 px-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview - NO text overlay, labels BELOW */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-900">
                Pré-visualização
              </Label>
              <div className="space-y-2">
                {/* Color Strip */}
                <div className="flex gap-2">
                  {COLOR_LEVELS.map((level) => (
                    <PremiumSwatch
                      key={level}
                      color={selectedPalette[level]}
                      level={level}
                      showCopyOnHover
                    />
                  ))}
                </div>
                {/* Labels BELOW */}
                <div className="flex gap-2">
                  {COLOR_LEVELS.map((level) => (
                    <div key={level} className="flex-1 text-center">
                      <span className="text-xs text-gray-400 font-medium">
                        {level}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 pt-6 border-t mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Paleta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
