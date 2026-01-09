import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette, Check } from "lucide-react";
import { ColorPaletteModal, ColorPalette } from "./ColorPaletteModal";
import { ImageUpload } from "@/components/onboarding/ImageUpload";
import { BLOG_THEMES, BlogTheme } from "@/components/dashboard/ThemeSelector";
import { cn } from "@/lib/utils";

interface DesignTabProps {
  primaryColor: string;
  secondaryColor: string;
  colorPalette: ColorPalette | null;
  logoUrl: string;
  logoNegativeUrl: string;
  faviconUrl: string;
  userId: string;
  blogId: string;
  onPrimaryColorChange: (value: string) => void;
  onSecondaryColorChange: (value: string) => void;
  onColorPaletteChange: (palette: ColorPalette) => void;
  onLogoUrlChange: (value: string) => void;
  onLogoNegativeUrlChange: (value: string) => void;
  onFaviconUrlChange: (value: string) => void;
}

export function DesignTab({
  primaryColor,
  secondaryColor,
  colorPalette,
  logoUrl,
  logoNegativeUrl,
  faviconUrl,
  userId,
  blogId,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onColorPaletteChange,
  onLogoUrlChange,
  onLogoNegativeUrlChange,
  onFaviconUrlChange,
}: DesignTabProps) {
  const [paletteModalOpen, setPaletteModalOpen] = useState(false);

  const isThemeSelected = (theme: BlogTheme) =>
    theme.primaryColor.toLowerCase() === primaryColor?.toLowerCase() &&
    theme.secondaryColor.toLowerCase() === secondaryColor?.toLowerCase();

  const handleThemeSelect = (theme: BlogTheme) => {
    onPrimaryColorChange(theme.primaryColor);
    onSecondaryColorChange(theme.secondaryColor);
  };

  return (
    <div className="space-y-8">
      {/* Theme Selector Section */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-1">Temas do Blog</h3>
          <p className="text-sm text-muted-foreground">
            Escolha um tema pronto ou personalize as cores abaixo
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {BLOG_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => handleThemeSelect(theme)}
              className={cn(
                "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                isThemeSelected(theme)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <div className="flex gap-1">
                <div
                  className="h-8 w-8 rounded-full shadow-sm"
                  style={{ backgroundColor: theme.primaryColor }}
                />
                <div
                  className="h-8 w-8 rounded-full shadow-sm -ml-3"
                  style={{ backgroundColor: theme.secondaryColor }}
                />
              </div>
              <span className="text-xs font-medium">{theme.name}</span>
              {isThemeSelected(theme) && (
                <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Color Section */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-1">Cores Customizadas</h3>
          <p className="text-sm text-muted-foreground">
            Ou personalize as cores manualmente
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Cor primária</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={primaryColor || "#7A5AF8"}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={primaryColor || "#7A5AF8"}
                onChange={(e) => onPrimaryColorChange(e.target.value)}
                placeholder="#7A5AF8"
                className="flex-1 uppercase font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cor secundária</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={secondaryColor || "#4338CA"}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                className="w-12 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={secondaryColor || "#4338CA"}
                onChange={(e) => onSecondaryColorChange(e.target.value)}
                placeholder="#4338CA"
                className="flex-1 uppercase font-mono"
              />
            </div>
          </div>
        </div>

        {/* Palette Button */}
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setPaletteModalOpen(true)}
        >
          <Palette className="h-4 w-4" />
          Editar Paleta de Cores Avançada
        </Button>

        {/* Palette Preview */}
        {colorPalette && Object.keys(colorPalette).length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Paleta atual</Label>
            <div className="flex h-8 rounded-lg overflow-hidden shadow-sm">
              {["50", "100", "200", "300", "400", "500", "600", "700", "800", "900"].map((level) => (
                <div
                  key={level}
                  className="flex-1"
                  style={{ backgroundColor: colorPalette[level as keyof ColorPalette] || "#ccc" }}
                  title={`${level}: ${colorPalette[level as keyof ColorPalette]}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logo Section */}
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-1">Logos e Ícones</h3>
          <p className="text-sm text-muted-foreground">
            Adicione sua marca ao blog
          </p>
        </div>

        <div className="grid gap-6">
          {/* Main Logo */}
          <ImageUpload
            label="Logo principal"
            value={logoUrl}
            onChange={onLogoUrlChange}
            userId={userId}
            folder={`logo-${blogId}`}
            hint="Para fundos claros. PNG transparente recomendado"
            aspectRatio="aspect-[3/1]"
          />

          {/* Negative Logo */}
          <ImageUpload
            label="Logo negativa"
            value={logoNegativeUrl}
            onChange={onLogoNegativeUrlChange}
            userId={userId}
            folder={`logo-negative-${blogId}`}
            hint="Para fundos escuros. Opcional"
            aspectRatio="aspect-[3/1]"
          />

          {/* Favicon */}
          <ImageUpload
            label="Favicon"
            value={faviconUrl}
            onChange={onFaviconUrlChange}
            userId={userId}
            folder={`favicon-${blogId}`}
            hint="Ícone da aba do navegador. Recomendado: 32x32px"
            aspectRatio="aspect-square"
          />
        </div>
      </div>

      <ColorPaletteModal
        open={paletteModalOpen}
        onOpenChange={setPaletteModalOpen}
        currentPalette={colorPalette}
        onSave={onColorPaletteChange}
      />
    </div>
  );
}
