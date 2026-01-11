import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PremiumLogoCard } from "../ui/PremiumLogoCard";
import { PremiumColorCard } from "../ui/PremiumColorCard";
import { PremiumPaletteStrip } from "../ui/PremiumPaletteStrip";

interface PremiumBrandKitSectionProps {
  logoUrl: string;
  logoNegativeUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
  userId: string;
  onLogoUrlChange: (value: string) => void;
  onLogoNegativeUrlChange: (value: string) => void;
  onFaviconUrlChange: (value: string) => void;
  onPrimaryColorChange: (value: string) => void;
  onSecondaryColorChange: (value: string) => void;
  onEditPalette?: () => void;
}

export function PremiumBrandKitSection({
  logoUrl,
  logoNegativeUrl,
  faviconUrl,
  primaryColor,
  secondaryColor,
  companyName,
  userId,
  onLogoUrlChange,
  onLogoNegativeUrlChange,
  onFaviconUrlChange,
  onPrimaryColorChange,
  onSecondaryColorChange,
  onEditPalette,
}: PremiumBrandKitSectionProps) {
  return (
    <div className="p-8 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-10">
      {/* Section Header */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Brand Kit</h3>
        <p className="text-sm text-gray-500 mt-1">
          A identidade visual do seu mini-site
        </p>
      </div>

      {/* Logos Section */}
      <div className="space-y-5">
        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          Logos
        </h4>
        <div className="grid grid-cols-3 gap-6">
          <PremiumLogoCard
            type="light"
            imageUrl={logoUrl}
            companyName={companyName}
            userId={userId}
            onImageChange={onLogoUrlChange}
          />
          <PremiumLogoCard
            type="dark"
            imageUrl={logoNegativeUrl}
            companyName={companyName}
            userId={userId}
            onImageChange={onLogoNegativeUrlChange}
          />
          <PremiumLogoCard
            type="favicon"
            imageUrl={faviconUrl}
            companyName={companyName}
            userId={userId}
            onImageChange={onFaviconUrlChange}
          />
        </div>
      </div>

      {/* Colors Section */}
      <div className="space-y-5">
        <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
          Cores da Marca
        </h4>
        <div className="grid grid-cols-2 gap-8">
          <PremiumColorCard
            color={primaryColor}
            label="Primária"
            onChange={onPrimaryColorChange}
          />
          <PremiumColorCard
            color={secondaryColor}
            label="Secundária"
            onChange={onSecondaryColorChange}
          />
        </div>
      </div>

      {/* Generated Palette Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-700 uppercase tracking-wide">
            Paleta Gerada
          </h4>
          {onEditPalette && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditPalette}
              className="text-xs"
            >
              <Palette className="h-3.5 w-3.5 mr-1.5" />
              Editar Paleta
            </Button>
          )}
        </div>
        <PremiumPaletteStrip primaryColor={primaryColor} />
      </div>
    </div>
  );
}
