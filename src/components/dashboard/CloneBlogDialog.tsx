import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Copy, Info } from "lucide-react";

interface Blog {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  logo_negative_url?: string | null;
  favicon_url?: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  dark_primary_color?: string | null;
  dark_secondary_color?: string | null;
  theme_mode?: string | null;
  layout_template?: string | null;
  author_name?: string | null;
  author_bio?: string | null;
  author_photo_url?: string | null;
  author_linkedin?: string | null;
  cta_type?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  banner_title?: string | null;
  banner_description?: string | null;
}

interface CloneBlogDialogProps {
  blog: Blog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CloneBlogDialog({
  blog,
  open,
  onOpenChange,
  onSuccess,
}: CloneBlogDialogProps) {
  const navigate = useNavigate();
  const [newName, setNewName] = useState(`${blog.name} (Cópia)`);
  const [copyPersonas, setCopyPersonas] = useState(true);
  const [copyPreferences, setCopyPreferences] = useState(true);
  const [copyAutomation, setCopyAutomation] = useState(true);
  const [cloning, setCloning] = useState(false);

  const generateUniqueSlug = async (baseSlug: string): Promise<string> => {
    let slug = `${baseSlug}-copia`;
    let counter = 1;

    while (true) {
      const { data } = await supabase
        .from("blogs")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!data) return slug;

      slug = `${baseSlug}-copia-${counter}`;
      counter++;
    }
  };

  const handleClone = async () => {
    if (!newName.trim()) {
      toast.error("Digite um nome para o novo blog");
      return;
    }

    setCloning(true);
    try {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Generate unique slug
      const uniqueSlug = await generateUniqueSlug(blog.slug);

      // Create new blog
      const { data: newBlog, error: blogError } = await supabase
        .from("blogs")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          slug: uniqueSlug,
          description: blog.description,
          logo_url: blog.logo_url,
          logo_negative_url: blog.logo_negative_url,
          favicon_url: blog.favicon_url,
          primary_color: blog.primary_color,
          secondary_color: blog.secondary_color,
          dark_primary_color: blog.dark_primary_color,
          dark_secondary_color: blog.dark_secondary_color,
          theme_mode: blog.theme_mode,
          layout_template: blog.layout_template,
          author_name: blog.author_name,
          author_bio: blog.author_bio,
          author_photo_url: blog.author_photo_url,
          author_linkedin: blog.author_linkedin,
          cta_type: blog.cta_type,
          cta_text: blog.cta_text,
          cta_url: blog.cta_url,
          banner_title: blog.banner_title,
          banner_description: blog.banner_description,
          onboarding_completed: false, // Send to onboarding for review
        })
        .select()
        .single();

      if (blogError) throw blogError;

      // Copy content preferences
      if (copyPreferences) {
        const { data: prefs } = await supabase
          .from("content_preferences")
          .select("*")
          .eq("blog_id", blog.id)
          .maybeSingle();

        if (prefs) {
          const { id, blog_id, created_at, updated_at, ...prefsData } = prefs;
          await supabase.from("content_preferences").insert({
            ...prefsData,
            blog_id: newBlog.id,
          });
        }
      }

      // Copy personas
      if (copyPersonas) {
        const { data: personas } = await supabase
          .from("personas")
          .select("*")
          .eq("blog_id", blog.id);

        if (personas && personas.length > 0) {
          await supabase.from("personas").insert(
            personas.map((p) => {
              const { id, blog_id, created_at, updated_at, ...personaData } = p;
              return {
                ...personaData,
                blog_id: newBlog.id,
              };
            })
          );
        }
      }

      // Copy automation settings
      if (copyAutomation) {
        const { data: automation } = await supabase
          .from("blog_automation")
          .select("*")
          .eq("blog_id", blog.id)
          .maybeSingle();

        if (automation) {
          const { id, blog_id, created_at, updated_at, ...automationData } = automation;
          await supabase.from("blog_automation").insert({
            ...automationData,
            blog_id: newBlog.id,
            is_active: false, // Disabled by default for safety
          });
        }
      }

      // Copy business profile
      const { data: businessProfile } = await supabase
        .from("business_profile")
        .select("*")
        .eq("blog_id", blog.id)
        .maybeSingle();

      if (businessProfile) {
        const { id, blog_id, created_at, updated_at, default_template_id, ...profileData } = businessProfile;
        await supabase.from("business_profile").insert({
          ...profileData,
          blog_id: newBlog.id,
        });
      }

      toast.success("Blog duplicado! Redirecionando para configuração...");
      onOpenChange(false);
      onSuccess?.();
      
      // Navigate to onboarding to review the new blog
      navigate("/onboarding");
    } catch (error) {
      console.error("Error cloning blog:", error);
      toast.error("Erro ao duplicar blog");
    } finally {
      setCloning(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!cloning) {
      if (newOpen) {
        setNewName(`${blog.name} (Cópia)`);
        setCopyPersonas(true);
        setCopyPreferences(true);
        setCopyAutomation(true);
      }
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            <DialogTitle>Duplicar blog</DialogTitle>
          </div>
          <DialogDescription>
            Crie uma cópia do blog com todas as configurações selecionadas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="new-name">Nome do novo blog</Label>
            <Input
              id="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome do blog"
              disabled={cloning}
            />
          </div>

          <div className="space-y-3">
            <Label>O que copiar:</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-personas"
                checked={copyPersonas}
                onCheckedChange={(checked) => setCopyPersonas(checked as boolean)}
                disabled={cloning}
              />
              <label
                htmlFor="copy-personas"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Personas
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-preferences"
                checked={copyPreferences}
                onCheckedChange={(checked) => setCopyPreferences(checked as boolean)}
                disabled={cloning}
              />
              <label
                htmlFor="copy-preferences"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Preferências de conteúdo
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copy-automation"
                checked={copyAutomation}
                onCheckedChange={(checked) => setCopyAutomation(checked as boolean)}
                disabled={cloning}
              />
              <label
                htmlFor="copy-automation"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Configurações de automação (desativada por padrão)
              </label>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <p>Artigos, histórico e analytics não serão copiados.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cloning}>
            Cancelar
          </Button>
          <Button onClick={handleClone} disabled={cloning || !newName.trim()}>
            {cloning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Duplicando...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Duplicar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
