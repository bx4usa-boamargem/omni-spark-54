import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, BookOpen, Check, Loader2, Mail, Phone, User } from "lucide-react";
import { toast } from "sonner";

interface Ebook {
  id: string;
  title: string;
  landing_page_description: string | null;
  cover_image_url: string | null;
  author: string | null;
  show_author: boolean | null;
  require_email: boolean | null;
  require_whatsapp: boolean | null;
  custom_thank_you_message: string | null;
  pdf_url: string | null;
  accent_color: string | null;
  light_color: string | null;
  logo_url: string | null;
  blog_id: string;
}

export default function PublicEbook() {
  const { slug } = useParams<{ slug: string }>();
  const [ebook, setEbook] = useState<Ebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    whatsapp: "",
  });

  useEffect(() => {
    fetchEbook();
    incrementViewCount();
  }, [slug]);

  const fetchEbook = async () => {
    if (!slug) return;

    const { data, error } = await supabase
      .from("ebooks")
      .select("*")
      .eq("slug", slug)
      .eq("is_public", true)
      .maybeSingle();

    if (error || !data) {
      console.error("Error fetching ebook:", error);
      setLoading(false);
      return;
    }

    setEbook(data);
    setLoading(false);
  };

  const incrementViewCount = async () => {
    if (!slug) return;
    
    await supabase
      .from("ebooks")
      .update({ view_count: supabase.rpc ? 1 : 1 })
      .eq("slug", slug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ebook) return;

    if (ebook.require_email && !formData.email) {
      toast.error("Por favor, informe seu e-mail");
      return;
    }

    if (ebook.require_whatsapp && !formData.whatsapp) {
      toast.error("Por favor, informe seu WhatsApp");
      return;
    }

    if (!formData.name) {
      toast.error("Por favor, informe seu nome");
      return;
    }

    setSubmitting(true);

    // Get UTM params from URL
    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get("utm_source");
    const utmMedium = urlParams.get("utm_medium");
    const utmCampaign = urlParams.get("utm_campaign");

    const { error } = await supabase.from("ebook_leads").insert({
      ebook_id: ebook.id,
      blog_id: ebook.blog_id,
      name: formData.name.trim(),
      email: formData.email.trim() || "not_provided@placeholder.com",
      whatsapp: formData.whatsapp.trim() || null,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      source: "landing_page",
    });

    if (error) {
      console.error("Error saving lead:", error);
      toast.error("Erro ao processar sua solicitação");
      setSubmitting(false);
      return;
    }

    // Update download count
    await supabase
      .from("ebooks")
      .update({ download_count: (ebook as any).download_count ? (ebook as any).download_count + 1 : 1 })
      .eq("id", ebook.id);

    setSubmitted(true);
    setSubmitting(false);
    toast.success("E-book liberado com sucesso!");
  };

  const handleDownload = () => {
    if (ebook?.pdf_url) {
      window.open(ebook.pdf_url, "_blank");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!ebook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <CardTitle>E-book não encontrado</CardTitle>
            <CardDescription>
              Este e-book não existe ou não está disponível publicamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const accentColor = ebook.accent_color || "#6366f1";
  const lightColor = ebook.light_color || "#f8fafc";

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: lightColor }}
    >
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Logo */}
          {ebook.logo_url && (
            <div className="flex justify-center mb-8">
              <img 
                src={ebook.logo_url} 
                alt="Logo" 
                className="h-12 object-contain"
              />
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Cover Image */}
            <div className="order-2 md:order-1">
              {ebook.cover_image_url ? (
                <div className="relative">
                  <img
                    src={ebook.cover_image_url}
                    alt={ebook.title}
                    className="w-full max-w-sm mx-auto rounded-lg shadow-2xl"
                  />
                  <div 
                    className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-20"
                    style={{ backgroundColor: accentColor }}
                  />
                </div>
              ) : (
                <div 
                  className="w-full max-w-sm mx-auto aspect-[3/4] rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                >
                  <BookOpen className="h-24 w-24 text-white opacity-50" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="order-1 md:order-2 space-y-6">
              <Badge 
                className="text-white"
                style={{ backgroundColor: accentColor }}
              >
                E-book Gratuito
              </Badge>

              <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                {ebook.title}
              </h1>

              {ebook.landing_page_description && (
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {ebook.landing_page_description}
                </p>
              )}

              {ebook.show_author && ebook.author && (
                <p className="text-sm text-muted-foreground">
                  Por <span className="font-medium text-foreground">{ebook.author}</span>
                </p>
              )}

              {/* Form or Thank You Message */}
              {submitted ? (
                <Card className="border-2" style={{ borderColor: accentColor }}>
                  <CardContent className="pt-6 text-center space-y-4">
                    <div 
                      className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Check className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold">
                      {ebook.custom_thank_you_message || "Obrigado! Seu e-book está pronto."}
                    </h3>
                    {ebook.pdf_url && (
                      <Button 
                        size="lg" 
                        onClick={handleDownload}
                        className="w-full text-white"
                        style={{ backgroundColor: accentColor }}
                      >
                        <Download className="mr-2 h-5 w-5" />
                        Baixar E-book
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Acesse o e-book gratuitamente</CardTitle>
                    <CardDescription>
                      Preencha os dados abaixo para liberar o download
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nome *
                        </Label>
                        <Input
                          id="name"
                          placeholder="Seu nome completo"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mail {ebook.require_email && "*"}
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required={ebook.require_email || false}
                        />
                      </div>

                      {(ebook.require_whatsapp || true) && (
                        <div className="space-y-2">
                          <Label htmlFor="whatsapp" className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            WhatsApp {ebook.require_whatsapp && "*"}
                          </Label>
                          <Input
                            id="whatsapp"
                            placeholder="(00) 00000-0000"
                            value={formData.whatsapp}
                            onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                            required={ebook.require_whatsapp || false}
                          />
                        </div>
                      )}

                      <Button 
                        type="submit" 
                        size="lg" 
                        className="w-full text-white"
                        style={{ backgroundColor: accentColor }}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-5 w-5" />
                            Quero o E-book
                          </>
                        )}
                      </Button>

                      <p className="text-xs text-center text-muted-foreground">
                        Seus dados estão seguros e não serão compartilhados.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
