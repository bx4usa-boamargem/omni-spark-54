import { useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PremiumLogoCardProps {
  type: "light" | "dark" | "favicon";
  imageUrl: string;
  companyName: string;
  userId: string;
  onImageChange: (url: string) => void;
}

const CARD_CONFIG = {
  light: {
    label: "Logo Clara",
    description: "Fundo claro",
    background: "bg-white",
    placeholder: "bg-gray-100",
  },
  dark: {
    label: "Logo Escura",
    description: "Fundo escuro",
    background: "bg-gray-900",
    placeholder: "bg-gray-800",
  },
  favicon: {
    label: "Favicon",
    description: "Ícone do site",
    background: "bg-gray-100",
    placeholder: "bg-gray-200",
  },
};

export function PremiumLogoCard({
  type,
  imageUrl,
  companyName,
  userId,
  onImageChange,
}: PremiumLogoCardProps) {
  const [isUploading, setIsUploading] = useState(false);
  const config = CARD_CONFIG[type];

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from("blog-assets")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("blog-assets")
        .getPublicUrl(fileName);

      onImageChange(urlData.publicUrl);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao enviar imagem");
    } finally {
      setIsUploading(false);
    }
  };

  const isFavicon = type === "favicon";
  const imageSize = isFavicon ? "w-12 h-12" : "w-full h-full";
  const imagePadding = isFavicon ? "" : "p-4";

  return (
    <div className="flex flex-col">
      {/* Card Container */}
      <div
        className={`
          relative w-full aspect-square rounded-xl border border-gray-200 
          ${config.background} overflow-hidden
          flex items-center justify-center
          transition-all hover:shadow-md
        `}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={config.label}
            className={`${imageSize} ${imagePadding} object-contain`}
          />
        ) : (
          <div
            className={`
              ${isFavicon ? "w-16 h-16" : "w-20 h-20"} 
              ${config.placeholder} rounded-xl
              flex items-center justify-center
            `}
          >
            {isFavicon ? (
              <ImageIcon className="w-6 h-6 text-gray-400" />
            ) : (
              <span
                className="text-2xl font-bold"
                style={{
                  color: type === "dark" ? "#ffffff" : "#1f2937",
                }}
              >
                {companyName?.charAt(0)?.toUpperCase() || "B"}
              </span>
            )}
          </div>
        )}

        {/* Upload Button - Discrete Corner */}
        <label
          className={`
            absolute bottom-2 right-2 
            p-2 rounded-lg cursor-pointer
            ${type === "dark" ? "bg-white/10 hover:bg-white/20" : "bg-gray-100 hover:bg-gray-200"}
            transition-colors
          `}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="hidden"
            disabled={isUploading}
          />
          <Upload
            className={`w-4 h-4 ${type === "dark" ? "text-white" : "text-gray-500"}`}
          />
        </label>
      </div>

      {/* Label Below */}
      <div className="mt-3 text-center">
        <p className="text-sm font-medium text-gray-900">{config.label}</p>
        <p className="text-xs text-gray-500">{config.description}</p>
      </div>
    </div>
  );
}
