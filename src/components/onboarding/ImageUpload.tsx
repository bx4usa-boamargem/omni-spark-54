import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image } from "lucide-react";

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  hint?: string;
  aspectRatio?: string;
  userId: string;
  folder: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  accept = "image/png,image/jpeg,image/webp",
  hint,
  aspectRatio = "aspect-video",
  userId,
  folder,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${folder}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("blog-branding")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("blog-branding")
        .getPublicUrl(filePath);

      onChange(urlData.publicUrl);
      toast({
        title: "Upload concluído",
        description: `${label} carregada com sucesso.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível fazer o upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : value
            ? "border-border"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        } ${aspectRatio}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />

        {value ? (
          <div className="absolute inset-0 p-2">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-contain rounded"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 cursor-pointer"
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
            ) : (
              <>
                <div className="p-2 rounded-full bg-muted">
                  <Image className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-center px-4">
                  <p className="text-sm text-muted-foreground">
                    Arraste ou clique para upload
                  </p>
                  {hint && (
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {hint}
                    </p>
                  )}
                </div>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
