import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FileText, FolderOpen, Copyright } from "lucide-react";

interface FooterSectionProps {
  brandDescription: string;
  showCategoriesFooter: boolean;
  footerText: string;
  onBrandDescriptionChange: (value: string) => void;
  onShowCategoriesFooterChange: (value: boolean) => void;
  onFooterTextChange: (value: string) => void;
}

export function FooterSection({
  brandDescription,
  showCategoriesFooter,
  footerText,
  onBrandDescriptionChange,
  onShowCategoriesFooterChange,
  onFooterTextChange,
}: FooterSectionProps) {
  return (
    <div className="space-y-6">
      {/* Brand Description */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <FileText className="h-4 w-4 text-gray-500" />
          Texto Institucional
        </Label>
        <Textarea
          placeholder="Ex: Há mais de 10 anos oferecendo os melhores serviços de limpeza na região..."
          value={brandDescription}
          onChange={(e) => onBrandDescriptionChange(e.target.value)}
          rows={3}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
        />
        <p className="text-xs text-gray-500">
          Este texto aparece no rodapé do site, ao lado do logo.
        </p>
      </div>

      {/* Show Categories Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-gray-500" />
          <div>
            <p className="font-medium text-gray-900">Categorias no Rodapé</p>
            <p className="text-sm text-gray-500">
              Exibir lista de categorias do blog
            </p>
          </div>
        </div>
        <Switch
          checked={showCategoriesFooter}
          onCheckedChange={onShowCategoriesFooterChange}
        />
      </div>

      {/* Footer Text */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-gray-700">
          <Copyright className="h-4 w-4 text-gray-500" />
          Texto de Copyright (opcional)
        </Label>
        <Textarea
          placeholder="Ex: Todos os direitos reservados."
          value={footerText}
          onChange={(e) => onFooterTextChange(e.target.value)}
          rows={2}
          className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-400"
        />
      </div>
    </div>
  );
}
