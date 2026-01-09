import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, FileText, Image, BookOpen, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LibraryItem {
  id: string;
  type: "image" | "document";
  file_url: string;
  file_name: string;
  description: string | null;
  is_active: boolean;
}

interface LibraryTabProps {
  blogId: string;
  libraryItems: LibraryItem[];
  setLibraryItems: React.Dispatch<React.SetStateAction<LibraryItem[]>>;
  isLibraryEnabled: boolean;
  setIsLibraryEnabled: (enabled: boolean) => void;
  onUpdateBusinessProfile: (data: { is_library_enabled: boolean }) => void;
}

export function LibraryTab({
  blogId,
  libraryItems,
  setLibraryItems,
  isLibraryEnabled,
  setIsLibraryEnabled,
  onUpdateBusinessProfile,
}: LibraryTabProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "document") => {
    const file = e.target.files?.[0];
    if (!file || !blogId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${blogId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("user-library")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("user-library")
        .getPublicUrl(fileName);

      const { data: libraryData, error: insertError } = await supabase
        .from("user_library")
        .insert({
          blog_id: blogId,
          type,
          file_url: urlData.publicUrl,
          file_name: file.name,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setLibraryItems((prev) => [libraryData as LibraryItem, ...prev]);
      toast.success("Arquivo enviado com sucesso!");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
    }
  };

  const deleteLibraryItem = async (item: LibraryItem) => {
    try {
      await supabase.from("user_library").delete().eq("id", item.id);
      setLibraryItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success("Arquivo removido!");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Erro ao remover arquivo");
    }
  };

  const handleToggleLibrary = async (enabled: boolean) => {
    setIsLibraryEnabled(enabled);
    await onUpdateBusinessProfile({ is_library_enabled: enabled });
  };

  const imageItems = libraryItems.filter((item) => item.type === "image");
  const documentItems = libraryItems.filter((item) => item.type === "document");

  return (
    <div className="space-y-6">
      {/* Banner Info */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-sm">Centralize suas referências estratégicas</p>
              <p className="text-sm text-muted-foreground">
                Salve imagens, documentos e links de referência. A IA usará esses materiais como base de conhecimento para gerar conteúdos mais alinhados ao seu negócio.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toggle Library */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Minha Biblioteca</CardTitle>
                <CardDescription>
                  Ative para usar suas próprias imagens e documentos na geração de conteúdo
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="library-toggle" className="text-sm text-muted-foreground">
                {isLibraryEnabled ? "Ativado" : "Desativado"}
              </Label>
              <Switch
                id="library-toggle"
                checked={isLibraryEnabled}
                onCheckedChange={handleToggleLibrary}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Image Library */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Image className="h-5 w-5" />
            Sua biblioteca de imagens
          </CardTitle>
          <CardDescription>
            Imagens próprias que podem ser usadas nos artigos gerados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "image")}
              disabled={uploading}
            />
            <label htmlFor="image-upload" className="cursor-pointer">
              <Image className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Enviar Imagens</p>
              <p className="text-sm text-muted-foreground">PNG, JPG até 10MB</p>
            </label>
          </div>

          {imageItems.length > 0 ? (
            <div className="grid gap-2">
              {imageItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded overflow-hidden bg-muted">
                      <img src={item.file_url} alt={item.file_name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-medium truncate max-w-[200px]">{item.file_name}</span>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteLibraryItem(item)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma imagem na biblioteca.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Library */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seus documentos de referência
          </CardTitle>
          <CardDescription>
            PDFs, textos e documentos que servem como base de conhecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              id="doc-upload"
              accept=".pdf,.doc,.docx,.txt"
              className="hidden"
              onChange={(e) => handleFileUpload(e, "document")}
              disabled={uploading}
            />
            <label htmlFor="doc-upload" className="cursor-pointer">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <p className="font-medium">Enviar Documentos</p>
              <p className="text-sm text-muted-foreground">PDF, DOC, TXT até 10MB</p>
            </label>
          </div>

          {uploading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
              <span>Enviando arquivo...</span>
            </div>
          )}

          {documentItems.length > 0 ? (
            <div className="grid gap-2">
              {documentItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium truncate max-w-[200px]">{item.file_name}</span>
                    <Badge variant={item.is_active ? "default" : "secondary"}>
                      {item.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteLibraryItem(item)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum documento na biblioteca.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
