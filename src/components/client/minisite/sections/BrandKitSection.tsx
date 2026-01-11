import { Image as ImageIcon } from "lucide-react";
import { ColorPaletteDisplay } from "../ui/ColorPaletteDisplay";

interface BrandKitSectionProps {
  logoUrl: string;
  logoNegativeUrl: string;
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  companyName: string;
}

export function BrandKitSection({
  logoUrl,
  logoNegativeUrl,
  faviconUrl,
  primaryColor,
  secondaryColor,
  companyName,
}: BrandKitSectionProps) {
  return (
    <div className="p-6 rounded-xl bg-gray-50 border border-gray-200">
      <h3 className="font-semibold text-lg text-gray-900 mb-4">Brand Kit</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logos */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium">Logos</p>
          <div className="flex items-center gap-4">
            {/* Light logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo claro" className="w-full h-full object-contain p-2" />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {companyName?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500">Claro</span>
            </div>

            {/* Dark logo */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-900 flex items-center justify-center overflow-hidden">
                {logoNegativeUrl ? (
                  <img src={logoNegativeUrl} alt="Logo escuro" className="w-full h-full object-contain p-2" />
                ) : logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2 invert" />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-gray-900 font-bold text-xl"
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    {companyName?.charAt(0)?.toUpperCase() || 'B'}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500">Escuro</span>
            </div>

            {/* Favicon */}
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-8 h-8 object-contain" />
                ) : (
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <span className="text-xs text-gray-500">Favicon</span>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-4">
          <p className="text-sm text-gray-500 font-medium">Cores</p>
          <ColorPaletteDisplay 
            primaryColor={primaryColor} 
            secondaryColor={secondaryColor} 
          />
        </div>
      </div>
    </div>
  );
}
